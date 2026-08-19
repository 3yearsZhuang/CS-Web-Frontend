/**
 * @file 学习助手对话 UI（类网页 LLM）— SSE 流式打字机 + react-markdown 渲染
 * + Skills 工具调用状态卡 + 历史会话管理。未配置模型时后端自动降级为规则模式。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Bot, Plus, Send, Wrench } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { MarkdownRenderer } from '@/modules/community/ui/community-markdown-renderer';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ToolCallEvent {
  name: string;
  status: 'running' | 'done' | 'error';
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallEvent[];
}

interface ConversationMeta {
  id: number;
  title: string;
  updatedAt?: string | null;
}

const MAX_HISTORY = 20;

interface AssistantChatProps {
  /** 嵌入合并卡片（llm-widget）时去掉左右栏 card-minimal 外壳，仅保留内容与交互 */
  embedded?: boolean;
  /** lite = 纯轻聊（仅提问+回复：无会话列表/无工具卡/无历史加载）；full = 完整 agent 能力 */
  mode?: 'lite' | 'full';
  /** 显式 Agent 预设（full 模式；如 exam_sprint / web_research，缺省后端启发式匹配） */
  presetId?: string | null;
  /** 当前打开会话变化回调（full 模式，供 Trajectory 回放定位） */
  onActiveConversation?: (id: number | null) => void;
}

export default function AssistantChat({
  embedded = false,
  mode = 'full',
  presetId = null,
  onActiveConversation,
}: AssistantChatProps) {
  const t = useTranslations('workbench');
  const lite = mode === 'lite';
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    const r = await apiRequest<{ conversations: ConversationMeta[] }>('/api/tools/auxilio/conversations', { cache: 'no-store' });
    if (r.status === 401) {
      setNotLoggedIn(true);
      return;
    }
    if (!r.ok) return;
    setConversations(r.data?.conversations ?? []);
  }, []);

  useEffect(() => {
    if (lite) return; // lite 模式不做历史会话管理
    void loadConversations();
  }, [loadConversations, lite]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const openConversation = useCallback(async (id: number) => {
    setLoadingHistory(true);
    try {
      const r = await apiRequest<{
        messages: { role: string; content: string | null; toolCalls?: { name: string }[] }[];
      }>(`/api/tools/auxilio/conversations/${id}/messages`, { cache: 'no-store' });
      if (!r.ok) return;
      const json = r.data;
      setConversationId(id);
      setMessages(
        (json?.messages ?? []).map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content ?? '',
          toolCalls: (m.toolCalls ?? []).map((tc, i) => ({
            name: tc.name,
            status: 'done' as const,
            key: `${i}`,
          })),
        })),
      );
      onActiveConversation?.(id);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    onActiveConversation?.(null);
  }, [onActiveConversation]);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming) return;

    const history: ChatMsg[] = [
      ...messages,
      { role: 'user' as const, content },
    ].slice(-MAX_HISTORY);
    setMessages(history);
    setInput('');
    setStreaming(true);

    // 追加空的 assistant 消息占位（流式填充）
    setMessages((prev) => [...prev, { role: 'assistant', content: '', toolCalls: [] }]);
    const currentIndex = history.length; // 新 assistant 消息下标

    const appendDelta = (text: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const target = next[currentIndex];
        if (target && target.role === 'assistant') {
          next[currentIndex] = { ...target, content: target.content + text };
        }
        return next;
      });
    };
    const pushTool = (name: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const target = next[currentIndex];
        if (target && target.role === 'assistant') {
          next[currentIndex] = {
            ...target,
            toolCalls: [...(target.toolCalls ?? []), { name, status: 'running' as const }],
          };
        }
        return next;
      });
    };
    const finishTool = (name: string, ok: boolean) => {
      setMessages((prev) => {
        const next = [...prev];
        const target = next[currentIndex];
        if (target && target.role === 'assistant') {
          next[currentIndex] = {
            ...target,
            toolCalls: (target.toolCalls ?? []).map((tc) =>
              tc.name === name ? { ...tc, status: ok ? ('done' as const) : ('error' as const) } : tc,
            ),
          };
        }
        return next;
      });
    };

    try {
      const res = await fetch('/api/tools/auxilio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: lite ? null : conversationId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          ...(presetId ? { preset_id: presetId } : {}),
        }),
      });
      if (res.status === 401) {
        setNotLoggedIn(true);
        return;
      }
      if (!res.ok || !res.body) {
        appendDelta('\n\n' + t('requestFailed'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          if (!block.startsWith('data:')) continue;
          const payload = block.slice(5).trim();
          if (!payload) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(payload);
          } catch {
            continue;
          }
          const type = ev.type;
          if (type === 'delta' && typeof ev.text === 'string') appendDelta(ev.text);
          else if (type === 'tool_call' && typeof ev.name === 'string') pushTool(ev.name);
          else if (type === 'tool_result' && typeof ev.name === 'string')
            finishTool(ev.name, ev.ok !== false);
          else if (type === 'error') appendDelta(`\n\n⚠ ${String(ev.message ?? '模型服务异常')}`);
          else if (type === 'done') {
            if (!lite) void loadConversations();
          }
        }
      }
      // 流结束：若 assistant 无内容（纯工具轮）补占位
      setMessages((prev) => {
        const next = [...prev];
        const target = next[currentIndex];
        if (target && target.role === 'assistant' && !target.content && !(target.toolCalls?.length)) {
          next[currentIndex] = { ...target, content: '…' };
        }
        return next;
      });
    } catch (err) {
      appendDelta(`\n\n${t('networkError', { msg: err instanceof Error ? err.message : 'unknown' })}`);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, conversationId, loadConversations, presetId]);

  if (notLoggedIn) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">{t('loginRequired')}</p>
      </div>
    );
  }

  return (
    <div
      className={
        lite
          ? 'flex flex-col gap-4'
          : 'grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start'
      }
    >
      {/* 会话列表（仅 full 模式） */}
      {!lite && (
        <div
          className={
            embedded
              ? 'flex flex-col gap-2 max-h-[60vh] overflow-y-auto lg:border-r lg:border-[var(--border)] lg:pr-3'
              : 'card-minimal p-3 flex flex-col gap-2 lg:sticky lg:top-20 max-h-[520px] overflow-y-auto'
          }
        >
          <Button size="sm" variant="pixel-outline" className="justify-center" onClick={newConversation}>
            <Plus className="w-4 h-4" /> {t('newChat')}
          </Button>
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`text-left px-3 py-2 rounded text-[13px] truncate border border-[var(--border)] hover:bg-[var(--border)]/40 ${
                conversationId === c.id ? 'bg-[var(--border)]/50' : ''
              }`}
              onClick={() => void openConversation(c.id)}
            >
              {c.title || '新会话'}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-[12px] text-[var(--muted-foreground)] px-2 py-3">{t('noConversations')}</p>
          )}
        </div>
      )}

      {/* 对话区 */}
      <div
        className={
          lite
            ? 'flex flex-col min-h-[280px] max-h-[50vh]'
            : embedded
              ? 'flex flex-col min-h-[480px] max-h-[60vh]'
              : 'card-minimal flex flex-col min-h-[520px] max-h-[72vh]'
        }
      >
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-12">
              <Bot className="w-8 h-8 text-[var(--muted-foreground)]" />
              <p className="text-[15px] text-[var(--foreground)]">学习助手</p>
              <p className="text-[13px] text-[var(--muted-foreground)] max-w-[360px]">
                {t('chatIntro')}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-lg text-[14px] leading-[1.7] ${
                  msg.role === 'user'
                    ? 'bg-[var(--foreground)] text-[var(--background)]'
                    : 'bg-[var(--border)]/30 text-[var(--foreground)]'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose-invert [&_p]:m-0 [&_pre]:bg-[var(--background)] [&_pre]:p-2 [&_pre]:rounded [&_code]:text-[12px]">
                    <MarkdownRenderer content={msg.content || (streaming && i === messages.length - 1 ? '…' : '')} />
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
              {!lite && msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-col gap-1">
                  {msg.toolCalls.map((tc, j) => (
                    <div
                      key={`${tc.name}-${j}`}
                      className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] px-2 py-1 rounded border border-[var(--border)]"
                    >
                      <Wrench className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{tc.name}</span>
                      <span
                        className={
                          tc.status === 'running'
                            ? 'text-amber-500 animate-pulse'
                            : tc.status === 'error'
                              ? 'text-[var(--destructive)]'
                              : 'text-emerald-500'
                        }
                      >
                        {tc.status === 'running' ? '…' : tc.status === 'error' ? '✕' : '✓'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loadingHistory && <p className="text-[12px] text-[var(--muted-foreground)]">{t('loading')}</p>}
        </div>

        <div className="border-t border-[var(--border)] p-3 sm:p-4 flex gap-2">
          <textarea
            rows={1}
            value={input}
            placeholder="{t('chatPlaceholder')}"
            className={`${INPUT_CLASS} flex-1 min-w-0 resize-none rounded-lg`}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button
            size="sm"
            variant="pixel"
            aria-label="send"
            className="shrink-0"
            disabled={streaming || !input.trim()}
            onClick={() => void send()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
