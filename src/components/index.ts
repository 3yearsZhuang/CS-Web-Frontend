/**
 * @file UI 组件统一导出 — 按子目录聚合通用 UI 原子、布局、特效与反馈组件
 */

// ---- primitives：通用 UI 原子（无业务语义） ----
export { Button } from './primitives/button';
export type { ButtonProps } from './primitives/button';
export { Input } from './primitives/input';
export type { InputProps } from './primitives/input';
export {
  Loading,
  LoadingOverlay,
  SectionLoading,
  SkeletonLine,
  SkeletonCard,
  SkeletonBlock,
} from './primitives/loading';
export type {
  LoadingProps,
  LoadingOverlayProps,
  SectionLoadingProps,
  SkeletonLineProps,
  SkeletonCardProps,
  SkeletonBlockProps,
} from './primitives/loading';
export { Spinner } from './primitives/spinner';
export type { SpinnerProps } from './primitives/spinner';
export { ConfirmDialog, ConfirmProvider, useConfirm } from './primitives/confirm-dialog';
export type { ConfirmDialogProps, ConfirmOptions, ConfirmVariant } from './primitives/confirm-dialog';

// ---- layout：全局布局结构 ----
export { Navbar } from './layout/navbar';
export { Footer } from './layout/footer';
export { FloatingCapsuleSidebar } from './layout/floating-capsule-sidebar';
export type { CapsuleTab } from './layout/floating-capsule-sidebar';
export { PageHeaderBackground } from './layout/page-header-background';
export { CollapsingHero } from './layout/collapsing-hero';
export type { HeroState, CollapsingHeroProps } from './layout/collapsing-hero';

// ---- effects：视觉特效与动画 ----
export { MobiusRing } from './effects/mobius-ring';
export { PageTransition } from './effects/page-transition';
export { ScrollIndicator } from './effects/scroll-indicator';
export {
  HERO_TIMING,
  StaggerContainer,
  RevealItem,
  RevealTitle,
} from './effects/motion-primitives';

// ---- feedback：反馈类组件 ----
export { ToastProvider, useToast } from './feedback/toast';
export type { Toast } from './feedback/toast';
export { LoadingFallback, ErrorFallback, GlobalErrorFallback } from './feedback/fallback';
export { AnnouncementBanner } from './feedback/announcement-banner';

// ---- 根级通用组件 ----
export { Avatar } from './avatar';
export type { AvatarProps } from './avatar';
export { UserMenu } from './user-menu';
export { NotificationBell } from './notification-bell';
export { TechTagSelector } from './tech-tag-selector';
export { ThemeProvider } from './theme-provider';
export { ThemeToggle } from './theme-toggle';
