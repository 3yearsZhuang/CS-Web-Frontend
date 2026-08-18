/**
 * @file Auxilio v1 卡片 — 对话优先（类 DeepSeek 网页版）。
 * 默认全宽对话主区（左会话列表 + 右对话，约 60vh）；头部「用量与设置」统一入口按钮，
 * 点击展开用量统计 + 模型接入设置面板（非分页结构，随时收起回到对话）。
 * 取代旧 /tools/auxilio 分析页与独立对话视图；可见性由 wb-llm-usage 控制。
 */
'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, Bot, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { DnaCard } from '@/components';
import AssistantChat from './assistant-chat';
import LlmUsageStats from './llm-usage-stats';

export default function LlmWidget() {
  const t = useTranslations('workbench');
  const [showPanel, setShowPanel] = useState(false);

  return (
    <DnaCard corner="AUX" className="p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5" />
          Auxilio v1
        </h3>
        <Button size="sm" variant="pixel-outline" onClick={() => setShowPanel((v) => !v)}>
          {showPanel ? <X className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
          {t('llmUsageEntry')}
        </Button>
      </div>
      {showPanel ? <LlmUsageStats embedded /> : <AssistantChat embedded />}
    </DnaCard>
  );
}
