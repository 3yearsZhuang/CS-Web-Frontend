/**
 * @file 全量 Agent 页（/tools/auxilio）— 完整学习助手能力：
 * full 对话（会话列表 + 工具调用可视化）+ Agent 预设切换 + Trajectory 回放；
 * 「用量与设置」跳转独立详情页 /tools/auxilio/settings。
 */
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BarChart3, Bot, History, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import AssistantChat from './assistant-chat';
import TrajectoryPanel from './trajectory-panel';

const PRESET_OPTIONS = [
  { id: 'general', labelKey: 'presetGeneral' },
  { id: 'exam_sprint', labelKey: 'presetExamSprint' },
  { id: 'resource_finder', labelKey: 'presetResourceFinder' },
  { id: 'web_research', labelKey: 'presetWebResearch' },
] as const;

export default function AgentPage() {
  const t = useTranslations('workbench');
  const [presetId, setPresetId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [showReplay, setShowReplay] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* 顶栏：标题 + 预设切换 + 回放 + 用量（跳转独立设置页） */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div className="flex items-center gap-2 mr-auto">
          <Bot className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-[16px] font-medium">{t('agentTitle')}</h1>
        </div>

        <label className="flex items-center gap-1.5 text-[13px]">
          <span className="text-[var(--muted-foreground)]">{t('presetLabel')}</span>
          <select
            value={presetId ?? ''}
            onChange={(e) => setPresetId(e.target.value || null)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[13px]"
          >
            <option value="">{t('presetAuto')}</option>
            {PRESET_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <Button
          size="sm"
          variant={showReplay ? 'pixel' : 'pixel-outline'}
          disabled={activeConv == null}
          onClick={() => setShowReplay((v) => !v)}
        >
          {showReplay ? <RotateCcw className="w-4 h-4" /> : <History className="w-4 h-4" />}
          {t('replay')}
        </Button>
        <Link
          href="/tools/auxilio/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] text-[12px] font-medium hover:bg-[var(--border)]/40"
        >
          <BarChart3 className="w-4 h-4" />
          {t('llmUsageEntry')}
        </Link>
      </div>

      {/* 主区：全量对话 */}
      <AssistantChat
        mode="full"
        presetId={presetId}
        onActiveConversation={(id) => {
          setActiveConv(id);
          if (id == null) setShowReplay(false);
        }}
      />

      {/* Trajectory 回放面板 */}
      {showReplay && (
        <TrajectoryPanel conversationId={activeConv} onClose={() => setShowReplay(false)} />
      )}
    </div>
  );
}
