/**
 * @file /lab/archive — ArchiveIndex 档案柜（C2-1 · FrontDoc-UID §17）
 */
import type { Metadata } from 'next';
import { ArchiveIndex } from './archive-index';

export const metadata: Metadata = {
  title: '档案柜 · ARCHIVE INDEX',
  description: 'Rhine 档案柜：五类档案的分类索引、检索、收藏与阅读（Rhine Lab 设计集成 C2）。',
};

export default function LabArchivePage() {
  return <ArchiveIndex />;
}
