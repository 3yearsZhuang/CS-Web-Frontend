/**
 * @file 组件注册表种子数据
 *
 * 从 modules/tools 提取到 shared 层，消除 migrations → modules 的跨层依赖。
 */

/** 单条种子定义 */
export interface ComponentSeed {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  status: 'legacy' | 'migrating' | 'done';
  sortOrder: number;
  useCases: string[];
  antiPatterns: string[];
}

/** 全部种子组件（54 个，按模块分组） */
export const COMPONENT_SEEDS: ComponentSeed[] = [
  /* ============ shared/ui（5 个） ============ */
  {
    id: 'cmp-button', name: 'Button', slug: 'button',
    category: 'ui-primitives', status: 'done', sortOrder: 1,
    description: '统一按钮控件，封装 primary/outline/danger 三套样式，内置 loading 态与焦点环',
    useCases: ['表单提交', '操作确认', '导航跳转'],
    antiPatterns: ['用作纯文本链接（应使用 Link）', '在 Modal 遮罩上放置过多按钮'],
  },
  {
    id: 'cmp-input', name: 'Input', slug: 'input',
    category: 'ui-primitives', status: 'done', sortOrder: 2,
    description: '统一输入框/文本域组件，支持 label + error 提示，可切换 textarea/select',
    useCases: ['文本输入', '搜索框', '表单字段'],
    antiPatterns: ['用于长文本编辑（应使用 Markdown 编辑器）', '用于只读展示（应使用纯文本）'],
  },
  {
    id: 'cmp-loading', name: 'Loading', slug: 'loading',
    category: 'feedback', status: 'done', sortOrder: 3,
    description: '统一加载模块，含 LoadingOverlay / SectionLoading / Skeleton / Loading 多种指示器',
    useCases: ['数据请求等待', '页面首次加载', '局部内容骨架屏'],
    antiPatterns: ['全页 Loading 遮罩挡住交互（应使用局部 Skeleton）', '长时间无超时处理'],
  },
  {
    id: 'cmp-spinner', name: 'Spinner', slug: 'spinner',
    category: 'feedback', status: 'done', sortOrder: 4,
    description: '加载旋转指示器，统一尺寸 w-3 h-3，支持 primary/inverted 颜色变体',
    useCases: ['按钮内 loading 图标', '行内加载提示'],
    antiPatterns: ['替代全页 Loading（应使用 LoadingOverlay）', '在大面积空白处单独使用'],
  },
  {
    id: 'cmp-confirm-dialog', name: 'ConfirmDialog', slug: 'confirm-dialog',
    category: 'overlays', status: 'done', sortOrder: 5,
    description: '统一二次确认模块，声明式 + 命令式双模式，focus trap + 三种危险级别',
    useCases: ['删除确认', '不可逆操作警告', '高危操作二次确认'],
    antiPatterns: ['用于信息展示（应使用 ModalShell）', '用于表单输入'],
  },

  /* ============ components/（17 个，排除 ThemeProvider） ============ */
  {
    id: 'cmp-navbar', name: 'Navbar', slug: 'navbar',
    category: 'layout', status: 'done', sortOrder: 6,
    description: '全局导航，左 logo + 中导航链接 + 右主题切换与用户菜单',
    useCases: ['全站主导航', '品牌标识展示'],
    antiPatterns: ['在子页面重复放置 Navbar', '导航项超过 7 个'],
  },
  {
    id: 'cmp-footer', name: 'Footer', slug: 'footer',
    category: 'layout', status: 'done', sortOrder: 7,
    description: '全局页脚，左 Logo + 版权，右导航链接，极简发丝线分隔',
    useCases: ['页脚版权信息', '辅助导航链接'],
    antiPatterns: ['放置核心业务功能', '内容过多导致高度过大'],
  },
  {
    id: 'cmp-toast', name: 'Toast', slug: 'toast',
    category: 'feedback', status: 'done', sortOrder: 8,
    description: 'Toast 通知系统，基于 Context，支持 success/error 两种类型',
    useCases: ['操作成功提示', '错误反馈', '非阻塞通知'],
    antiPatterns: ['用于关键错误（应使用 Dialog）', '同时弹出超过 3 条 Toast'],
  },
  {
    id: 'cmp-avatar', name: 'Avatar', slug: 'avatar',
    category: 'ui-primitives', status: 'done', sortOrder: 9,
    description: '头像组件，直角方形，支持上传/预设/initial 三种模式',
    useCases: ['用户头像展示', '评论列表头像', '个人主页头像'],
    antiPatterns: ['圆形场景使用（组件为方形设计）', '未提供 fallback 时显示空白'],
  },
  {
    id: 'cmp-user-menu', name: 'UserMenu', slug: 'user-menu',
    category: 'overlays', status: 'done', sortOrder: 10,
    description: '用户菜单，未登录显示登录按钮，已登录显示头像下拉菜单',
    useCases: ['导航栏用户入口', '快捷操作菜单'],
    antiPatterns: ['在非导航位置使用', '菜单项过多'],
  },
  {
    id: 'cmp-floating-capsule-sidebar', name: 'FloatingCapsuleSidebar', slug: 'floating-capsule-sidebar',
    category: 'layout', status: 'migrating', sortOrder: 11,
    description: '悬浮折叠胶囊侧边栏，固定左侧，hover 展开标签',
    useCases: ['页面内 Tab 切换', '分类过滤导航'],
    antiPatterns: ['用于主导航（应使用 Navbar）', 'Tab 数量超过 7 个时拥挤'],
  },
  {
    id: 'cmp-theme-toggle', name: 'ThemeToggle', slug: 'theme-toggle',
    category: 'ui-primitives', status: 'done', sortOrder: 12,
    description: '主题切换按钮，极简文字 toggle，点击切换并持久化到 localStorage',
    useCases: ['深色/浅色主题切换'],
    antiPatterns: ['在内容区放置（应在导航栏）', '多个 ThemeToggle 同时出现'],
  },
  {
    id: 'cmp-page-transition', name: 'PageTransition', slug: 'page-transition',
    category: 'feedback', status: 'migrating', sortOrder: 13,
    description: '路由级页面切换动画，莫比乌斯环进度遮罩，区分首屏与 SPA 切换',
    useCases: ['路由切换过渡', '首屏加载动画'],
    antiPatterns: ['过渡时间过长影响体验', '在低端设备上启用复杂动画'],
  },
  {
    id: 'cmp-collapsing-hero', name: 'CollapsingHero', slug: 'collapsing-hero',
    category: 'layout', status: 'legacy', sortOrder: 14,
    description: '可折叠 Hero 区，滚动时收缩标题并提供胶囊导航',
    useCases: ['页面顶部 Hero 区', '可折叠标题区'],
    antiPatterns: ['用于内容区（应使用普通 section）', '同一页面多处重复使用'],
  },
  {
    id: 'cmp-page-header-bg', name: 'PageHeaderBackground', slug: 'page-header-background',
    category: 'layout', status: 'legacy', sortOrder: 15,
    description: '页面背景图层，预留图片位 + 装饰栅格 + 渐变遮罩',
    useCases: ['页面顶部背景装饰'],
    antiPatterns: ['在内容区使用', '图片过大影响性能'],
  },
  {
    id: 'cmp-scroll-indicator', name: 'ScrollIndicator', slug: 'scroll-indicator',
    category: 'feedback', status: 'done', sortOrder: 16,
    description: '滚动指示器，检测容器左右可滚动状态，显示边缘阴影提示',
    useCases: ['水平滚动区域提示', '表格/卡片溢出提示'],
    antiPatterns: ['在不可滚动区域使用', '阴影过重干扰阅读'],
  },
  {
    id: 'cmp-notification-bell', name: 'NotificationBell', slug: 'notification-bell',
    category: 'overlays', status: 'done', sortOrder: 17,
    description: '通知铃铛，铃铛图标 + 未读角标 + 下拉面板展示最近通知',
    useCases: ['导航栏通知入口', '未读消息提醒'],
    antiPatterns: ['在非导航位置使用', '角标数字不限制长度'],
  },
  {
    id: 'cmp-motion-primitives', name: 'MotionPrimitives', slug: 'motion-primitives',
    category: 'ui-primitives', status: 'done', sortOrder: 18,
    description: '通用动画原语，含 StaggerContainer / RevealItem / RevealTitle',
    useCases: ['列表逐项入场动画', '标题揭示动画', '内容区渐进展示'],
    antiPatterns: ['在低端设备上使用复杂动画', '动画时长超过 1s'],
  },
  {
    id: 'cmp-announcement-banner', name: 'AnnouncementBanner', slug: 'announcement-banner',
    category: 'feedback', status: 'done', sortOrder: 19,
    description: '公告横幅，支持 info/warning/success/error 四级，可关闭并记忆',
    useCases: ['全站公告', '维护通知', '重要消息提醒'],
    antiPatterns: ['同时显示多条横幅', '不可关闭的横幅'],
  },
  {
    id: 'cmp-mobius-ring', name: 'MobiusRing', slug: 'mobius-ring',
    category: 'feedback', status: 'migrating', sortOrder: 20,
    description: '粒子莫比乌斯环，Canvas 2D 静止显示 + 鼠标排斥物理回弹',
    useCases: ['页面加载动画', '首屏视觉装饰'],
    antiPatterns: ['在移动端启用（性能开销大）', '在内容密集页面使用'],
  },
  {
    id: 'cmp-section-nav', name: 'SectionNav', slug: 'section-nav',
    category: 'layout', status: 'done', sortOrder: 21,
    description: '页面侧边章节快速跳转导航，自动扫描 [data-section-nav] 元素',
    useCases: ['长文档章节导航', '多 section 页面快速跳转'],
    antiPatterns: ['章节少于 3 个时使用', '在移动端占用过多空间'],
  },
  {
    id: 'cmp-tech-tag-selector', name: 'TechTagSelector', slug: 'tech-tag-selector',
    category: 'ui-primitives', status: 'done', sortOrder: 22,
    description: '技术标签选择器，展开/折叠选择，受控组件',
    useCases: ['活动标签选择', '帖子标签筛选'],
    antiPatterns: ['标签数量超过 20 个', '用于单选场景'],
  },

  /* ============ admin/ui（9 个，排除 types.ts） ============ */
  {
    id: 'cmp-modal-shell', name: 'ModalShell', slug: 'modal-shell',
    category: 'overlays', status: 'migrating', sortOrder: 23,
    description: '模态框外壳，内置 focus trap + Escape 关闭 + 遮罩点击（admin/ui/shared.tsx）',
    useCases: ['表单创建/编辑', '详情查看', '确认对话框'],
    antiPatterns: ['用于全屏页面（应使用独立路由）', '嵌套使用 Modal'],
  },
  {
    id: 'cmp-admin-users-panel', name: 'AdminUsersPanel', slug: 'admin-users-panel',
    category: 'layout', status: 'done', sortOrder: 24,
    description: '管理员用户管理面板，用户列表 + 密码重置申请',
    useCases: ['用户列表管理', '密码重置', '用户状态切换'],
    antiPatterns: ['非管理员可访问', '批量操作无二次确认'],
  },
  {
    id: 'cmp-admin-roles-panel', name: 'AdminRolesPanel', slug: 'admin-roles-panel',
    category: 'layout', status: 'done', sortOrder: 25,
    description: '管理员角色权限管理面板，角色列表 + 权限矩阵',
    useCases: ['角色权限分配', '新增自定义角色'],
    antiPatterns: ['非 root 角色可访问', '删除正在使用的角色'],
  },
  {
    id: 'cmp-admin-events-panel', name: 'AdminEventsPanel', slug: 'admin-events-panel',
    category: 'layout', status: 'migrating', sortOrder: 26,
    description: '管理员活动管理面板，工具栏 + 年份手风琴 + 多模态框',
    useCases: ['活动 CRUD', '活动审核', '活动设置'],
    antiPatterns: ['非管理员可访问', '日期选择无验证'],
  },
  {
    id: 'cmp-admin-logs-panel', name: 'AdminLogsPanel', slug: 'admin-logs-panel',
    category: 'layout', status: 'done', sortOrder: 27,
    description: '管理员审计日志面板，筛选 + 批量删除，表格/卡片双视图',
    useCases: ['审计日志查询', '日志批量清理'],
    antiPatterns: ['非 root 角色可访问', '日志保留无上限'],
  },
  {
    id: 'cmp-admin-notifications-panel', name: 'AdminNotificationsPanel', slug: 'admin-notifications-panel',
    category: 'layout', status: 'done', sortOrder: 28,
    description: '管理员通知管理面板，群发表单 + 群发历史',
    useCases: ['全站通知群发', '通知历史查看'],
    antiPatterns: ['频繁群发通知', '通知内容无审核'],
  },
  {
    id: 'cmp-admin-messages-panel', name: 'AdminMessagesPanel', slug: 'admin-messages-panel',
    category: 'layout', status: 'migrating', sortOrder: 29,
    description: '统一消息管理面板，合并通知与公告，子 Tab 切换',
    useCases: ['消息统一管理', '通知与公告切换'],
    antiPatterns: ['Tab 过多导致混乱', '消息无分页'],
  },
  {
    id: 'cmp-admin-join-panel', name: 'AdminJoinPanel', slug: 'admin-join-panel',
    category: 'layout', status: 'done', sortOrder: 30,
    description: '管理员入社申请审核面板，状态筛选 + 审批模态框',
    useCases: ['入社申请审核', '申请状态筛选'],
    antiPatterns: ['非管理员可访问', '审批无备注'],
  },
  {
    id: 'cmp-admin-announcements-panel', name: 'AdminAnnouncementsPanel', slug: 'admin-announcements-panel',
    category: 'layout', status: 'migrating', sortOrder: 31,
    description: '管理员公告管理面板，公告 CRUD + 级别/优先级/角色配置',
    useCases: ['公告发布', '公告级别设置', '定向角色推送'],
    antiPatterns: ['公告无过期时间', '高优先级滥用'],
  },

  /* ============ events/ui（3 个） ============ */
  {
    id: 'cmp-year-accordion-timeline', name: 'YearAccordionTimeline', slug: 'year-accordion-timeline',
    category: 'layout', status: 'done', sortOrder: 32,
    description: '年份手风琴时间轴，按年份分组活动展示，垂直铁路线',
    useCases: ['活动按年归档', '时间轴展示'],
    antiPatterns: ['年份过多无折叠', '空年份仍显示'],
  },
  {
    id: 'cmp-event-filter-bar', name: 'EventFilterBar', slug: 'event-filter-bar',
    category: 'ui-primitives', status: 'done', sortOrder: 33,
    description: '活动筛选栏，搜索 + 状态 + 标签，受控组件',
    useCases: ['活动列表筛选', '搜索 + 标签组合过滤'],
    antiPatterns: ['筛选条件过多', '无清除筛选按钮'],
  },
  {
    id: 'cmp-event-card', name: 'EventCard', slug: 'event-card',
    category: 'layout', status: 'done', sortOrder: 34,
    description: '活动卡片，时间轴节点，左右交替排列 + 状态标记 + 标签云',
    useCases: ['活动列表展示', '时间轴节点卡片'],
    antiPatterns: ['卡片信息过多', '非时间轴场景使用'],
  },

  /* ============ forum/ui（13 个） ============ */
  {
    id: 'cmp-topic-item', name: 'ForumTopicItem', slug: 'topic-item',
    category: 'layout', status: 'done', sortOrder: 35,
    description: '主题列表项，横向 12 栏栅格，版块页与首页共用',
    useCases: ['主题列表展示', '版块页/首页帖子项'],
    antiPatterns: ['在详情页使用', '信息列缺失'],
  },
  {
    id: 'cmp-reply-item', name: 'ForumReplyItem', slug: 'reply-item',
    category: 'layout', status: 'done', sortOrder: 36,
    description: '回复项，主回复 + 楼中楼折叠',
    useCases: ['帖子回复展示', '楼中楼回复'],
    antiPatterns: ['嵌套层级过深', '回复无头像'],
  },
  {
    id: 'cmp-topic-replies', name: 'TopicReplies', slug: 'topic-replies',
    category: 'layout', status: 'done', sortOrder: 37,
    description: '主题回复列表，主回复列表 + 分页 + 楼中楼',
    useCases: ['帖子回复列表', '分页回复展示'],
    antiPatterns: ['无分页加载全部', '楼中楼默认展开'],
  },
  {
    id: 'cmp-topic-sidebar', name: 'TopicSidebar', slug: 'topic-sidebar',
    category: 'layout', status: 'migrating', sortOrder: 38,
    description: '帖子详情右侧栏，楼主信息 + 相关推荐 + 版块导航',
    useCases: ['帖子详情侧栏', '相关内容推荐'],
    antiPatterns: ['侧栏内容过多', '移动端不隐藏侧栏'],
  },
  {
    id: 'cmp-topic-reply-editor', name: 'TopicReplyEditor', slug: 'topic-reply-editor',
    category: 'ui-primitives', status: 'done', sortOrder: 39,
    description: '主题回复编辑器，Markdown 编辑器 + 发布/清空按钮',
    useCases: ['帖子回复编辑', '快速回复'],
    antiPatterns: ['编辑器无字数限制', '无防误关确认'],
  },
  {
    id: 'cmp-topic-edit-form', name: 'TopicEditForm', slug: 'topic-edit-form',
    category: 'ui-primitives', status: 'done', sortOrder: 40,
    description: '主题编辑表单，标题 + Markdown 编辑器 + 保存/取消',
    useCases: ['发帖编辑', '帖子编辑'],
    antiPatterns: ['无草稿保存', '标题无长度校验'],
  },
  {
    id: 'cmp-forum-actions', name: 'ForumActions', slug: 'forum-actions',
    category: 'ui-primitives', status: 'done', sortOrder: 41,
    description: '论坛操作栏，点赞/收藏/编辑/删除/回复按钮，单一职责',
    useCases: ['帖子操作按钮组', '回复操作按钮'],
    antiPatterns: ['操作按钮过多', '无权限隐藏按钮'],
  },
  {
    id: 'cmp-reply-sort-bar', name: 'ReplySortBar', slug: 'reply-sort-bar',
    category: 'ui-primitives', status: 'done', sortOrder: 42,
    description: '回复排序选择器，最新/最早/最热，受控组件',
    useCases: ['回复列表排序'],
    antiPatterns: ['排序选项过多', '无默认排序'],
  },
  {
    id: 'cmp-markdown-editor', name: 'MarkdownEditor', slug: 'markdown-editor',
    category: 'ui-primitives', status: 'migrating', sortOrder: 43,
    description: 'Markdown 编辑器完整版，工具栏 + 图片上传',
    useCases: ['帖子正文编辑', '公告编辑', '长文本输入'],
    antiPatterns: ['用于简短回复（应使用 TopicReplyEditor）', '无字数限制'],
  },
  {
    id: 'cmp-markdown-editor-base', name: 'MarkdownEditorBase', slug: 'markdown-editor-base',
    category: 'ui-primitives', status: 'legacy', sortOrder: 44,
    description: 'Markdown 编辑器基础版，纯编辑/预览切换，无工具栏',
    useCases: ['简单 Markdown 编辑', '预览切换'],
    antiPatterns: ['需要工具栏的场景（应使用 MarkdownEditor）', '需要图片上传的场景'],
  },
  {
    id: 'cmp-markdown-renderer', name: 'MarkdownRenderer', slug: 'markdown-renderer',
    category: 'ui-primitives', status: 'done', sortOrder: 45,
    description: 'Markdown 渲染器，rehype-sanitize 白名单 + 代码高亮',
    useCases: ['帖子内容渲染', '公告渲染', 'Markdown 展示'],
    antiPatterns: ['渲染未信任内容（无 sanitize）', '代码高亮语言缺失'],
  },
  {
    id: 'cmp-admin-forum-panel', name: 'AdminForumPanel', slug: 'admin-forum-panel',
    category: 'layout', status: 'migrating', sortOrder: 46,
    description: '管理员论坛面板，版块管理 + 主题审核',
    useCases: ['版块 CRUD', '主题审核', '论坛管理'],
    antiPatterns: ['非管理员可访问', '版块删除无级联检查'],
  },
  {
    id: 'cmp-profile-forum-tab', name: 'ProfileForumTab', slug: 'profile-forum-tab',
    category: 'layout', status: 'done', sortOrder: 47,
    description: '个人主页论坛 Tab，我的主题/回复/收藏三段切换',
    useCases: ['用户主页帖子展示', '用户内容归档'],
    antiPatterns: ['Tab 内容无分页', '空状态无提示'],
  },

  /* ============ community/ui（4 个） ============ */
  {
    id: 'cmp-community-sidebar-nav', name: 'CommunitySidebarNav', slug: 'community-sidebar-nav',
    category: 'layout', status: 'done', sortOrder: 48,
    description: '社区左侧栏，版块导航 + 快速入口',
    useCases: ['社区版块导航', '快速入口链接'],
    antiPatterns: ['导航项过多', '移动端不折叠'],
  },
  {
    id: 'cmp-featured-topic-strip', name: 'FeaturedTopicStrip', slug: 'featured-topic-strip',
    category: 'layout', status: 'done', sortOrder: 49,
    description: '精选/置顶横滑卡片区，社区首页 Feed 顶部',
    useCases: ['精选帖子展示', '置顶内容横滑'],
    antiPatterns: ['卡片过多', '无置顶内容时显示空区域'],
  },
  {
    id: 'cmp-community-sidebar-trending', name: 'CommunitySidebarTrending', slug: 'community-sidebar-trending',
    category: 'layout', status: 'migrating', sortOrder: 50,
    description: '社区右侧栏，热榜 + 活跃用户 + 统计仪表盘',
    useCases: ['热帖排行', '活跃用户展示', '社区统计'],
    antiPatterns: ['数据无实时更新', '榜单过长'],
  },
  {
    id: 'cmp-feed-item-card', name: 'FeedItemCard', slug: 'feed-item-card',
    category: 'layout', status: 'done', sortOrder: 51,
    description: '聚合 Feed 统一卡片，判别联合渲染 topic/post/member 三种布局',
    useCases: ['社区 Feed 流', '聚合内容展示'],
    antiPatterns: ['类型判断缺失', '卡片样式不一致'],
  },

  /* ============ auth/ui（1 个） ============ */
  {
    id: 'cmp-two-factor-settings', name: 'TwoFactorSettings', slug: 'two-factor-settings',
    category: 'ui-primitives', status: 'done', sortOrder: 52,
    description: '双因素认证设置组件，启用/验证/禁用/备用码管理',
    useCases: ['2FA 启用流程', '备用码管理', '安全设置'],
    antiPatterns: ['备用码明文展示', '无验证步骤直接启用'],
  },

  /* ============ tools/ui（1 个，排除 component-registry 自身） ============ */
  {
    id: 'cmp-admin-tools-panel', name: 'AdminToolsPanel', slug: 'admin-tools-panel',
    category: 'layout', status: 'done', sortOrder: 53,
    description: '管理员工具集面板，资源审核 + 考试管理两个子视图',
    useCases: ['工具资源审核', '考试管理'],
    antiPatterns: ['非管理员可访问', '子视图无权限隔离'],
  },
  {
    id: 'cmp-admin-events-settings', name: 'AdminEventsSettings', slug: 'admin-events-settings',
    category: 'layout', status: 'legacy', sortOrder: 54,
    description: '活动模块设置，内联可折叠设置面板，嵌入 admin-events-panel',
    useCases: ['活动报名设置', '活动参数配置'],
    antiPatterns: ['独立使用（应嵌入 AdminEventsPanel）', '设置项无默认值'],
  },
];
