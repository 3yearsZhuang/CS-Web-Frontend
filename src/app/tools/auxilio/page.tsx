/**
 * @file 全量 Agent 页（/tools/auxilio）— 完整学习助手能力（对话 + 预设 + 回放 + 用量）。
 * 工作台小组件为 lite 纯轻聊（modules/workbench/widgets/llm-widget.tsx）。
 */
import type { Metadata } from 'next';
import AgentPage from '@/modules/auxilio/ui/agent-page';

export const metadata: Metadata = {
  title: '学习助手 Agent',
  description: 'Fztbu 计算机协会学习助手全量 Agent：完整对话、工具调用、Agent 预设与轨迹回放。',
};

export default function AuxilioPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <AgentPage />
    </div>
  );
}
