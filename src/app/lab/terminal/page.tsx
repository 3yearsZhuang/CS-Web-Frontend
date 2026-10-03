/**
 * @file /lab/terminal — 3D 档案阵列终端（方案 B · FrontDoc-UID §17 白名单作用域）
 */
import type { Metadata } from 'next';
import { ArchiveTerminal } from '@/components/rhine/archive-terminal';

export const metadata: Metadata = {
  title: '三维终端 · 3D ARCHIVE TERMINAL',
  description: 'Rhine 三维档案阵列：透射材质、镜头编排与档案抽取（Rhine Lab 设计集成 方案 B）。',
};

export default function LabTerminalPage() {
  return <ArchiveTerminal />;
}
