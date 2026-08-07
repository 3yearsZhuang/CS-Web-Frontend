/**
 * @file 共享 UI 常量 — 输入框样式、表单限制、z-index 层级、动效参数
 */

/**
 * z-index 层级常量 — 全站唯一权威来源，禁止在 JSX 中直接写 z-50 等
 */
export const Z = {
  /** 页面主要内容区域 */
  base: 10,
  /** 粘性页头 hero-acrylic / section-nav / capsule-sidebar */
  sticky: 30,
  /** 公告横幅 / 子页面导航 */
  banner: 40,
  /** 顶部导航栏 / 下拉菜单 / Modal */
  header: 50,
  /** Toast 消息容器 */
  toast: 60,
  /** 页面过渡遮罩 */
  transition: 70,
  /** 全屏装饰层 (ark-scanline / noise-overlay) */
  overlay: 9998,
} as const;

/** 统一的输入框样式 — 工业终端风格，可拼接额外 padding/font-size 类名覆盖默认值 */
export const INPUT_CLASS =
  'w-full bg-transparent border border-[var(--border)] text-[var(--foreground)] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors';

/** 常用表单字段长度限制（与后端保持一致） */
export const FORM_LIMITS = {
  /** 标题最大长度（通知标题 / 社区标题） */
  TITLE_MAX: 120,
  /** 标题最小长度（社区发帖） */
  TITLE_MIN: 4,
  /** 通知内容最大长度 */
  NOTIFICATION_CONTENT_MAX: 500,
  /** Markdown 内容最大长度（活动详情） */
  EVENT_MARKDOWN_MAX: 10000,
  /** Markdown 内容最大长度（社区主题 / 回复） */
  COMMUNITY_MARKDOWN_MAX: 20000,
  /** Markdown 内容最小长度（社区发帖） */
  COMMUNITY_MARKDOWN_MIN: 10,
  /** 活动描述最大长度 */
  EVENT_DESC_MAX: 500,
  /** 月份字符串最大长度 */
  MONTH_MAX: 8,
  /** 日期字符串最大长度 */
  DATE_MAX: 32,
  /** 年份字符串最大长度 */
  YEAR_MAX: 8,
  /** 标签最大数量 */
  TAGS_MAX: 10,
  /** 单个标签最大长度 */
  TAG_MAX: 40,
} as const;

/** 项目级缓动曲线 — Motion / Framer Motion 统一使用（Expo Ease Out 风格，比原生 easeOut 更平滑） */
export const EASE = [0.16, 1, 0.3, 1] as const;
