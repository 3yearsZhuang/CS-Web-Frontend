/**
 * @file 学习助手「用量与设置」独立详情页（/tools/auxilio/settings）
 * 承载 LLM 用量统计 + 模型接入设置（用户级 API Key / 功能开关）。工作台小组件与全量 Agent 页均跳转至此。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LlmUsageStats from '@/modules/workbench/widgets/llm-usage-stats';

export const metadata: Metadata = {
  title: '学习助手 · 用量与设置',
  description: '学习助手 LLM 用量统计与模型接入设置（API Key、联网搜索、轨迹记录开关）。',
};

export default function AuxilioSettingsPage() {
  return (
    <div className="max-w-[760px] mx-auto px-4 py-6 flex flex-col gap-4">
      <Link
        href="/tools/auxilio"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>返回学习助手 Agent</span>
      </Link>
      <LlmUsageStats />
    </div>
  );
}
