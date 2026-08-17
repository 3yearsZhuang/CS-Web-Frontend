/**
 * @file 前端组件可见性注册表 — 全站受管组件的单一事实来源
 *
 * 与后端 FeatureVisibilityService.DEFAULT_MODULES 一一对应（key / 默认三态）。
 * 管理面板、VisibilityGate、默认回退值均从此处派生，避免散落硬编码。
 *
 * 分组（group）：
 *  - page        顶层页面路由
 *  - chrome      框架/布局组件（导航、页脚、主题等）
 *  - workbench   工作台 widget
 *  - tools       /tools 页工具子功能卡片
 *  - community    /community 页社区子功能区块
 *
 * 命名约定：页面用裸名（about/events/...）；框架组件前缀 chrome-；
 * 工作台 widget 前缀 wb-；工具子功能前缀 tools-；社区子功能前缀 community-。
 *
 * 标签（label / labelEn / description / descriptionEn）直接内联，避免向巨型
 * i18n 文件注入 ~37×2 条专有名词；面板 UI 文案仍走 i18n。
 */

export type ComponentGroup = 'page' | 'chrome' | 'workbench' | 'tools' | 'community';

/** 三态可见性规则（与后端 VisibilityRule 对应） */
export interface VisibilityRule {
  guest: boolean;
  member: boolean;
  admin: boolean;
}

export interface ComponentMeta {
  /** 稳定标识（与后端 DEFAULT_MODULES 的 key 一致） */
  key: string;
  group: ComponentGroup;
  /** 展示名（中文） */
  label: string;
  /** 展示名（英文） */
  labelEn: string;
  /** 说明（中文） */
  description: string;
  /** 说明（英文） */
  descriptionEn: string;
  /** 默认三态可见性（fail-open：缺失即按此回退） */
  default: VisibilityRule;
}

export interface GroupMeta {
  id: ComponentGroup;
  label: string;
  labelEn: string;
}

export const COMPONENT_GROUPS: GroupMeta[] = [
  { id: 'page', label: '页面', labelEn: 'Pages' },
  { id: 'chrome', label: '框架组件', labelEn: 'Layout / Chrome' },
  { id: 'workbench', label: '工作台组件', labelEn: 'Workbench Widgets' },
  { id: 'tools', label: '工具子功能', labelEn: 'Tool Features' },
  { id: 'community', label: '社区子功能', labelEn: 'Community Features' },
];

export const COMPONENT_REGISTRY: ComponentMeta[] = [
  // ===================== 页面路由 =====================
  {
    key: 'home',
    group: 'page',
    label: '首页',
    labelEn: 'Home',
    description: '站点落地页（Hero 与彩蛋）',
    descriptionEn: 'Landing page hero & easter egg',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'about',
    group: 'page',
    label: '关于我们',
    labelEn: 'About',
    description: '社团介绍页',
    descriptionEn: 'Club introduction page',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'events',
    group: 'page',
    label: '活动',
    labelEn: 'Events',
    description: '活动列表与日历',
    descriptionEn: 'Events list & calendar',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'tools',
    group: 'page',
    label: '工具',
    labelEn: 'Tools',
    description: '工具集与工作台（需登录）',
    descriptionEn: 'Tools & workbench (login required)',
    default: { guest: false, member: true, admin: true },
  },
  {
    key: 'community',
    group: 'page',
    label: '社区',
    labelEn: 'Community',
    description: '社区聚合页',
    descriptionEn: 'Community hub page',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'profile',
    group: 'page',
    label: '个人资料',
    labelEn: 'Profile',
    description: '个人主页（需登录）',
    descriptionEn: 'Personal profile (login required)',
    default: { guest: false, member: true, admin: true },
  },
  {
    key: 'notifications',
    group: 'page',
    label: '通知中心',
    labelEn: 'Notifications',
    description: '通知列表（需登录）',
    descriptionEn: 'Notifications list (login required)',
    default: { guest: false, member: true, admin: true },
  },
  {
    key: 'join',
    group: 'page',
    label: '加入我们',
    labelEn: 'Join',
    description: '入社申请页',
    descriptionEn: 'Join / application page',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'admin',
    group: 'page',
    label: '管理后台',
    labelEn: 'Admin',
    description: '管理员控制台（仅管理员）',
    descriptionEn: 'Admin console (admins only)',
    default: { guest: false, member: false, admin: true },
  },

  // ===================== 框架组件 =====================
  {
    key: 'chrome-navbar',
    group: 'chrome',
    label: '导航栏',
    labelEn: 'Navbar',
    description: '顶部全局导航',
    descriptionEn: 'Global top navigation',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'chrome-announcement-banner',
    group: 'chrome',
    label: '公告横幅',
    labelEn: 'Announcement Banner',
    description: '全局公告条',
    descriptionEn: 'Site-wide announcement bar',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'chrome-footer',
    group: 'chrome',
    label: '页脚',
    labelEn: 'Footer',
    description: '全站页脚',
    descriptionEn: 'Site footer',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'chrome-theme-toggle',
    group: 'chrome',
    label: '主题切换',
    labelEn: 'Theme Toggle',
    description: '深色 / 浅色切换',
    descriptionEn: 'Dark / light toggle',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'chrome-user-menu',
    group: 'chrome',
    label: '用户菜单',
    labelEn: 'User Menu',
    description: '头像菜单（含登录入口）',
    descriptionEn: 'Avatar menu (incl. login)',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'chrome-language-switcher',
    group: 'chrome',
    label: '语言切换',
    labelEn: 'Language Switcher',
    description: '中英文切换',
    descriptionEn: 'Language switcher',
    default: { guest: true, member: true, admin: true },
  },

  // ===================== 工作台 widget =====================
  {
    key: 'wb-greeting',
    group: 'workbench',
    label: '问候栏',
    labelEn: 'Greeting',
    description: '工作台问候条',
    descriptionEn: 'Workbench greeting bar',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'wb-today-tasks',
    group: 'workbench',
    label: '今日任务',
    labelEn: 'Today Tasks',
    description: '待办清单',
    descriptionEn: 'Todo list',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'wb-github-heatmap',
    group: 'workbench',
    label: 'GitHub 热力图',
    labelEn: 'GitHub Heatmap',
    description: '贡献日历',
    descriptionEn: 'Contribution calendar',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'wb-llm-usage',
    group: 'workbench',
    label: 'Auxilio v1',
    labelEn: 'Auxilio v1',
    description: '学习助手对话 + LLM 用量与设置（合并卡片）',
    descriptionEn: 'Assistant chat + LLM usage & settings (merged card)',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'wb-quick-notes',
    group: 'workbench',
    label: '速记',
    labelEn: 'Quick Notes',
    description: '便签',
    descriptionEn: 'Sticky notes',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'wb-pomodoro',
    group: 'workbench',
    label: '番茄钟',
    labelEn: 'Pomodoro',
    description: '专注计时器',
    descriptionEn: 'Focus timer',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'wb-exam-countdown',
    group: 'workbench',
    label: '考试倒计时',
    labelEn: 'Exam Countdown',
    description: '考试倒计时',
    descriptionEn: 'Exam countdown',
    default: { guest: true, member: true, admin: true },
  },

  // ===================== 工具子功能 =====================
  {
    key: 'tools-exam',
    group: 'tools',
    label: '考试管理',
    labelEn: 'Exam',
    description: '考试题库管理',
    descriptionEn: 'Exam bank',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'tools-resource',
    group: 'tools',
    label: '资源中心',
    labelEn: 'Resources',
    description: '学习资源',
    descriptionEn: 'Learning resources',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'tools-task',
    group: 'tools',
    label: '任务管理',
    labelEn: 'Tasks',
    description: '任务板',
    descriptionEn: 'Task board',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'tools-dev-center',
    group: 'tools',
    label: '开发者中心',
    labelEn: 'Dev Center',
    description: '组件库与文档',
    descriptionEn: 'Component library & docs',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'tools-admin-panel',
    group: 'tools',
    label: '工具管理',
    labelEn: 'Tools Admin',
    description: '工具管理面板（仅管理员）',
    descriptionEn: 'Tools admin (admins only)',
    default: { guest: false, member: false, admin: true },
  },

  // ===================== 社区子功能 =====================
  {
    key: 'community-feed',
    group: 'community',
    label: '帖子流',
    labelEn: 'Feed',
    description: '社区主信息流',
    descriptionEn: 'Main feed',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'community-sidebar-nav',
    group: 'community',
    label: '版块导航',
    labelEn: 'Sidebar Nav',
    description: '左侧版块导航',
    descriptionEn: 'Left category nav',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'community-sidebar-trending',
    group: 'community',
    label: '热榜',
    labelEn: 'Trending',
    description: '右侧热榜与活跃用户',
    descriptionEn: 'Right trending & active users',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'community-featured',
    group: 'community',
    label: '精选话题',
    labelEn: 'Featured',
    description: '精选 / 置顶横滑区',
    descriptionEn: 'Featured strip',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'community-search',
    group: 'community',
    label: '搜索',
    labelEn: 'Search',
    description: '搜索与标签筛选',
    descriptionEn: 'Search & tag filter',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'community-tags',
    group: 'community',
    label: '标签筛选',
    labelEn: 'Tags',
    description: '热门标签',
    descriptionEn: 'Hot tags',
    default: { guest: true, member: true, admin: true },
  },
  {
    key: 'community-mine',
    group: 'community',
    label: '我的',
    labelEn: 'My Topics',
    description: '我的主题 / 回复 / 收藏（需登录）',
    descriptionEn: 'My topics (login required)',
    default: { guest: false, member: true, admin: true },
  },
  {
    key: 'community-admin',
    group: 'community',
    label: '社区管理',
    labelEn: 'Community Admin',
    description: '社区管理面板（仅管理员）',
    descriptionEn: 'Community admin (admins only)',
    default: { guest: false, member: false, admin: true },
  },
];

/** 默认可见性（由注册表派生，供 hook 回退 / 管理面板草稿初始化） */
export const DEFAULT_VISIBILITY: Record<string, VisibilityRule> = Object.fromEntries(
  COMPONENT_REGISTRY.map((c) => [c.key, c.default]),
);

/** 全部已知组件 key（供后端校验 / 面板遍历） */
export const KNOWN_COMPONENT_KEYS: string[] = COMPONENT_REGISTRY.map((c) => c.key);

/** 按 key 取组件元信息 */
export function getComponentMeta(key: string): ComponentMeta | undefined {
  return COMPONENT_REGISTRY.find((c) => c.key === key);
}
