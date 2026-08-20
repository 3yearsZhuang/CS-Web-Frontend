/**
 * @file Auxilio v1 卡片 — 纯轻聊（lite）。
 * 仅保留提问与回复（SSE 流式），无用量/设置入口（用量与设置仅在全量页 /tools/auxilio 内）。
 * 取代旧 /tools/auxilio 分析页与独立对话视图；可见性由 wb-llm-usage 控制。
 */
'use client';

import { Bot } from 'lucide-react';
import { WorkbenchCard } from '../workbench-card';
import AssistantChat from '@/modules/auxilio/ui/assistant-chat';

export default function LlmWidget() {
  return (
    <WorkbenchCard
      corner="AUX"
      title={
        <>
          <Bot className="w-3.5 h-3.5" />
          Auxilio v1
        </>
      }
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AssistantChat embedded mode="lite" />
      </div>
    </WorkbenchCard>
  );
}

