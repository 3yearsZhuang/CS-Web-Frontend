'use client';

/**
 * @file DemoBanner — 演示模式全局标识（明确警示，避免演示数据被误认为真实）
 *
 * 挂载时查询 GET /api/demo/status 判定演示状态，双标识：
 *   1. 顶部横幅（Navbar 之下，参照 AnnouncementBanner 的 fixed top-16 定位模式）：
 *      主色图标 + DEMO 标签 + 来源说明 + 退出/重试按钮
 *   2. 右下角常驻悬浮徽标（不参与布局、不与导航栏冲突，任何页面一眼可见）
 *
 * 来源：
 *   - manual：手动开启（?demo=1 或登录页入口）→ 显示"退出演示"
 *   - auto：后端未连接自动降级 → 显示"重试连接"（清 cookie 刷新，后端恢复即回真实模式）
 * 非演示态渲染 null，零开销。
 */
import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { DEMO_COOKIE } from '@/shared/constants/demo';

type DemoStatus = {
  demo: boolean;
  source: 'manual' | 'auto' | null;
  unreachableRemainingMs: number | null;
};

export function DemoBanner() {
  const [status, setStatus] = useState<DemoStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/demo/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DemoStatus | null) => {
        if (!cancelled && data) setStatus(data);
      })
      .catch(() => {
        /* 状态接口不可达时静默，不阻塞页面 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.demo) return null;

  const isAuto = status.source === 'auto';
  const label = isAuto ? '后端未连接 · 自动降级演示' : '手动演示模式';
  const hint = isAuto
    ? '页面展示内置示例数据，后端恢复后将自动回到真实模式。'
    : '当前展示为内置示例数据，操作不会写入系统。';
  const badgeText = isAuto ? '降级演示' : '演示模式';

  function exitDemo() {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <>
      {/* 顶部横幅：Navbar（h-16）之下，参照 AnnouncementBanner 定位，不与导航栏重叠 */}
      <div
        role="status"
        className="fixed inset-x-0 top-16 z-[var(--z-banner)] flex items-center gap-3 border-b-2 border-[var(--primary)] bg-[var(--card)] px-4 py-2 text-[13px]"
      >
        <FlaskConical className="h-4 w-4 shrink-0 text-[var(--primary)]" size={16} />
        <span className="meta-mono shrink-0 font-semibold tracking-wider text-[var(--primary)]">
          DEMO
        </span>
        <span className="shrink-0 font-medium text-[var(--foreground)]">{label}</span>
        <span className="hidden truncate text-[var(--muted-foreground)] sm:inline">{hint}</span>
        <button
          type="button"
          onClick={exitDemo}
          className="ml-auto shrink-0 rounded border border-[var(--primary)] px-2 py-0.5 text-[12px] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
        >
          {isAuto ? '重试连接' : '退出演示'}
        </button>
      </div>

      {/* 右下角常驻悬浮徽标：不参与布局，任何页面一眼可见 */}
      <div
        role="status"
        className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--card)] px-3 py-2 shadow-lg"
      >
        <FlaskConical className="h-4 w-4 shrink-0 text-[var(--primary)]" size={16} />
        <span className="meta-mono text-[12px] font-semibold tracking-wider text-[var(--primary)]">
          DEMO · {badgeText}
        </span>
        <button
          type="button"
          onClick={exitDemo}
          className="meta-mono text-[11px] text-[var(--muted-foreground)] underline-grow hover:text-[var(--primary)]"
        >
          {isAuto ? '重试' : '退出'}
        </button>
      </div>
    </>
  );
}
