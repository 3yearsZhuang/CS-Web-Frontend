/**
 * @file /lab 路由布局 — Rhine 终端作用域元数据（FrontDoc-UID §17）
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '实验室 · ARCHIVE TERMINAL',
  description: 'Rhine 终端体验场：终端开场、档案柜索引与 3D 档案阵列（Rhine Lab 设计集成预研落地）。',
};

export default function LabLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
