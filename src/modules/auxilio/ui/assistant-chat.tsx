/**
 * @file 学习助手对话 UI（类网页 LLM）— SSE 流式打字机 + react-markdown 渲染
 * + Skills 工具调用状态卡 + 历史会话管理。未配置模型时后端自动降级为规则模式。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Archive, Bot, CornerUpLeft, GitBranch, MoreHorizontal, Pencil, Plus, Send, Trash2, Wrench } from 'lucide-react';
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
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallEvent[];
}

interface ConversationMeta {
  id: number;
  title: string;
  parentConversationId?: number | null;
  rootConversationId?: number | null;
  forkedFromMessageId?: number | null;
  archivedAt?: string | null;
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
  const [showArchived, setShowArchived] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async (includeArchived = showArchived) => {
    const query = includeArchived ? '?include_archived=true' : '';
    const r = await apiRequest<{ conversations: ConversationMeta[] }>(`/api/tools/auxilio/conversations${query}`, { cache: 'no-store' });
    if (r.status === 401) {
      setNotLoggedIn(true);
      return;
    }
    if (!r.ok) return;
    setConversations(r.data?.conversations ?? []);
  }, [showArchived]);

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
        messages: { id?: number; role: string; content: string | null; toolCalls?: { name: string }[] }[];
      }>(`/api/tools/auxilio/conversations/${id}/messages`, { cache: 'no-store' });
      if (!r.ok) return;
      const json = r.data;
      setConversationId(id);
      setMessages(
        (json?.messages ?? []).map((m) => ({
          id: m.id,
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

  const forkFromMessage = useCallback(async (messageId: number) => {
    if (!conversationId || streaming) return;
    const result = await apiRequest<{ conversation?: ConversationMeta }>(
      `/api/tools/auxilio/conversations/${conversationId}/fork`,
      { method: 'POST', body: { from_message_id: messageId } },
    );
    const branch = result.data?.conversation;
    if (!result.ok || !branch) return;
    await loadConversations();
    await openConversation(branch.id);
  }, [conversationId, loadConversations, openConversation, streaming]);

  const renameConversation = useCallback(async (conversation: ConversationMeta) => {
    const title = window.prompt('重命名会话', conversation.title || '新会话');
    if (title === null || !title.trim()) return;
    const result = await apiRequest(`/api/tools/auxilio/conversations/${conversation.id}`, {
      method: 'PATCH',
      body: { title: title.trim() },
    });
    if (result.ok) await loadConversations();
  }, [loadConversations]);

  const archiveConversation = useCallback(async (conversation: ConversationMeta) => {
    const archived = !conversation.archivedAt;
    const result = await apiRequest(`/api/tools/auxilio/conversations/${conversation.id}/archive`, {
      method: 'POST',
      body: { archived },
    });
    if (!result.ok) return;
    if (conversation.id === conversationId && archived) newConversation();
    await loadConversations();
  }, [conversationId, loadConversations, newConversation]);

  const deleteConversation = useCallback(async (conversation: ConversationMeta, cascade = false) => {
    if (!cascade && !window.confirm('删除此会话？有子分支时会要求再次确认级联删除。')) return;
    const suffix = cascade ? '?cascade=true' : '';
    const result = await apiRequest(`/api/tools/auxilio/conversations/${conversation.id}${suffix}`, { method: 'DELETE' });
    if (result.status === 409 && !cascade) {
      if (window.confirm('此会话有活跃子分支。是否级联删除整个分支树？')) {
        await deleteConversation(conversation, true);
      }
      return;
    }
    if (!result.ok) return;
    if (conversation.id === conversationId) newConversation();
    await loadConversations();
  }, [conversationId, loadConversations, newConversation]);

  const activeConversationArchived = Boolean(
    conversationId && conversations.find((conversation) => conversation.id === conversationId)?.archivedAt,
  );

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming || activeConversationArchived) return;

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
      let resolvedConversationId = conversationId;
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
          else if (type === 'conversation' && typeof ev.conversationId === 'number' && !lite) {
            resolvedConversationId = ev.conversationId;
            setConversationId(ev.conversationId);
            onActiveConversation?.(ev.conversationId);
          } else if (type === 'error') appendDelta(`\n\n⚠ ${String(ev.message ?? '模型服务异常')}`);
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
      // 流关闭意味着后端 finally 已完成消息持久化；此时重载可取得稳定 message id，
      // 为“从任意消息分支”提供可靠身份，同时校准最终工具状态与标题。
      if (!lite && resolvedConversationId) {
        await openConversation(resolvedConversationId);
      }
    } catch (err) {
      appendDelta(`\n\n${t('networkError', { msg: err instanceof Error ? err.message : 'unknown' })}`);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, activeConversationArchived, messages, conversationId, loadConversations, onActiveConversation, openConversation, presetId, lite]);

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
          <div className="flex gap-1">
            <Button size="sm" variant="pixel-outline" className="justify-center flex-1" onClick={newConversation}>
              <Plus className="w-4 h-4" /> {t('newChat')}
            </Button>
            <Button
              size="sm"
              variant="pixel-outline"
              aria-label={showArchived ? '隐藏已归档会话' : '显示已归档会话'}
              title={showArchived ? '隐藏已归档会话' : '显示已归档会话'}
              onClick={() => setShowArchived((value) => !value)}
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
          {conversations.map((c) => (
            <div key={c.id} className="flex items-stretch gap-1">
              <button
                type="button"
                className={`min-w-0 flex-1 flex items-center gap-1.5 text-left px-3 py-2 rounded text-[13px] border border-[var(--border)] hover:bg-[var(--border)]/40 ${
                  conversationId === c.id ? 'bg-[var(--border)]/50' : ''
                }`}
                title={c.parentConversationId ? `分支会话 · 来源 #${c.parentConversationId}` : undefined}
                onClick={() => void openConversation(c.id)}
              >
                {c.parentConversationId && <GitBranch className="w-3 h-3 shrink-0 text-[var(--primary)]" />}
                {c.archivedAt && <Archive className="w-3 h-3 shrink-0 text-[var(--muted-foreground)]" />}
                <span className="truncate">{c.title || '新会话'}</span>
              </button>
              <details className="relative">
                <summary
                  className="h-full min-w-9 list-none cursor-pointer inline-flex items-center justify-center rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                  title="会话操作"
                  aria-label="会话操作"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-36 rounded border border-[var(--border)] bg-[var(--background)] p-1 shadow-lg">
                  {c.parentConversationId && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--border)]/40"
                      onClick={() => void openConversation(c.parentConversationId!)}
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" /> 来源会话
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--border)]/40"
                    onClick={() => void renameConversation(c)}
                  >
                    <Pencil className="w-3.5 h-3.5" /> 重命名
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--border)]/40"
                    onClick={() => void archiveConversation(c)}
                  >
                    <Archive className="w-3.5 h-3.5" /> {c.archivedAt ? '取消归档' : '归档'}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-[var(--destructive)] hover:bg-[var(--border)]/40"
                    onClick={() => void deleteConversation(c)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                  </button>
                </div>
              </details>
            </div>
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
              key={msg.id ?? `pending-${i}`}
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
              {!lite && !streaming && msg.id && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                  title="从此消息分支到新聊天"
                  aria-label="从此消息分支到新聊天"
                  onClick={() => void forkFromMessage(msg.id!)}
                >
                  <GitBranch className="w-3 h-3" />
                  分支
                </button>
              )}
            </div>
          ))}
          {loadingHistory && <p className="text-[12px] text-[var(--muted-foreground)]">{t('loading')}</p>}
        </div>

        <div className="border-t border-[var(--border)] p-3 sm:p-4 flex gap-2">
          <textarea
            rows={1}
            value={input}
            placeholder={activeConversationArchived ? '已归档会话为只读' : t('chatPlaceholder')}
            className={`${INPUT_CLASS} flex-1 min-w-0 resize-none rounded-lg`}
            disabled={streaming || activeConversationArchived}
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
            disabled={streaming || activeConversationArchived || !input.trim()}
            onClick={() => void send()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
