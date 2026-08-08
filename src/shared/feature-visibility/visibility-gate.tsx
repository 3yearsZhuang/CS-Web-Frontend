'use client';

/**
 * @file 组件可见性门控 — <VisibilityGate componentKey="...">
 *
 * 包裹任意前端组件/区块：对当前用户不可见时渲染 fallback（默认 null）。
 * 未知 componentKey 一律可见（fail-open），避免误隐藏整站。
 *
 * 用法：
 *   <VisibilityGate componentKey="wb-pomodoro">
 *     <PomodoroPlayer />
 *   </VisibilityGate>
 *
 * 页面级包裹亦可（页面均为 client component，hook 客户端运行，无额外 SSR 成本）：
 *   export default function AboutPage() {
 *     return <VisibilityGate componentKey="about"><main>...</main></VisibilityGate>;
 *   }
 */

import type { ReactNode } from 'react';
import { useComponentVisible } from '@/shared/hooks/use-feature-visibility';

export interface VisibilityGateProps {
  /** 组件 key（须与 registry / 后端 DEFAULT_MODULES 一致） */
  componentKey: string;
  children: ReactNode;
  /** 不可见时的占位（默认 null） */
  fallback?: ReactNode;
}

export function VisibilityGate({ componentKey, children, fallback = null }: VisibilityGateProps) {
  const visible = useComponentVisible(componentKey);
  if (!visible) return <>{fallback}</>;
  return <>{children}</>;
}
