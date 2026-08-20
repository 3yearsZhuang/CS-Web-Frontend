/**
 * @file Auxilio v1 卡片 — 纯轻聊（lite）。
 * 仅保留提问与回复（SSE 流式）；「用量与设置」跳转独立详情页 /tools/auxilio/settings。
 * 取代旧 /tools/auxilio 分析页与独立对话视图；可见性由 wb-llm-usage 控制。
 */
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BarChart3, Bot } from 'lucide-react';
import { WorkbenchCard } from '../workbench-card';
import AssistantChat from '@/modules/auxilio/ui/assistant-chat';

export default function LlmWidget() {
  const t = useTranslations('workbench');

  return (
    <WorkbenchCard
      corner="AUX"
      title={
        <>
          <Bot className="w-3.5 h-3.5" />
          Auxilio v1
        </>
      }
      actions={
        <Link
          href="/tools/auxilio/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] text-[12px] font-medium hover:bg-[var(--border)]/40"
        >
          <BarChart3 className="w-4 h-4" />
          {t('llmUsageEntry')}
        </Link>
      }
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AssistantChat embedded mode="lite" />
      </div>
    </WorkbenchCard>
  );
}
