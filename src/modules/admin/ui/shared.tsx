/**
 * @file 管理员面板共享 UI — ModalShell（已提升为全局原语 components/primitives/modal-shell，此处 re-export 兼容）+ Field 通用组件
 */

'use client';

import { type ReactNode } from 'react';
import { ModalShell } from '@/components/primitives/modal-shell';

export { ModalShell };

/* ============= 表单字段容器 ============= */

/** 表单字段容器，统一 label + 字数统计 + 内容布局 */
export function Field({
  label,
  count,
  children,
}: {
  label: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]">
        <span>[ {label} ]</span>
        {count && <span>{count}</span>}
      </label>
      {children}
    </div>
  );
}
