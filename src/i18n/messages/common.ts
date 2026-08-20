/**
 * @file i18n 消息模块 — common（自动拆分自 types.ts / languages/*.ts）
 * 包含该业务模块下的所有 namespace：类型 + 中英文语言包。
 */

export interface CommonMessages {
  common: {
    loading: string;
    refresh: string;
    retry: string;
    save: string;
    cancel: string;
    delete: string;
    confirm: string;
    close: string;
    search: string;
    empty: string;
    error: string;
    back: string;
    submit: string;
    more: string;
    processing: string;
    loadingDefault: string;
    irreversible: string;
    language: string;
    switchLanguage: string;
    avatarAlt: string;
    warningHint: string;
    infoHint: string;
  },
  fallback: {
    errorTitle: string;
    globalErrorTitle: string;
    errorDesc: string;
    globalErrorDesc: string;
    errorId: string;
  },
  nav: {
    home: string;
    community: string;
    events: string;
    tools: string;
    about: string;
    join: string;
    profile: string;
    admin: string;
    login: string;
    logout: string;
    brand: string;
    toggleMenu: string;
    logoAlt: string;
    aboutEn: string;
    eventsEn: string;
    communityEn: string;
    toolsEn: string;
    homeEn: string;
    searchAria: string;
    searchPlaceholder: string;
    searchPlaceholderModule: string;
    searchLoading: string;
    searchNoResults: string;
    searchHint: string;
    searchGroupAll: string;
    searchGroupEvents: string;
    searchGroupCommunity: string;
    searchGroupTools: string;
    searchGroupAnnouncements: string;
    searchGroupUsers: string;
    searchViewAll: string;
    searchPageTitle: string;
    searchPageTotal: string;
  },
  footer: {
    aboutJoin: string;
    madeWith: string;
  },
  theme: {
    toLight: string;
    toDark: string;
  },
  techTag: {
    sectionLabel: string;
    hint: string;
  },
  follow: {
    following: string;
    follow: string;
    pending: string;
  },
  report: {
    reasons: {
      spam: string;
      porn: string;
      abuse: string;
      fakeInfo: string;
      infringement: string;
      other: string;
    };
    errorSelectReason: string;
    errorSubmitFailed: string;
    buttonTitle: string;
    buttonLabel: string;
    dialogTitle: string;
    successMessage: string;
    detailPlaceholder: string;
    cancel: string;
    submitting: string;
    submit: string;
  },
  communityCommon: {
    backToCommunity: string;
    community: string;
    anonymous: string;
    viewsLabel: string;
    likesLabel: string;
    repliesLabel: string;
    allSections: string;
    replyListTitle: string;
    yourReplyTitle: string;
    loadNestedFailed: string;
    loading: string;
    collapseNested: string;
    expandNested: string;
    retry: string;
    loadMoreNested: string;
    sortNewest: string;
    sortOldest: string;
    sortHottest: string;
    pleaseLogin: string;
    loginNow: string;
    replyToNested: string;
    cancel: string;
    replyPlaceholder: string;
    postReply: string;
    clear: string;
    saveFailed: string;
    noRepliesYet: string;
    sidebarAllSections: string;
    linkCommunityHome: string;
    linkCommunity: string;
    linkMembers: string;
    trendingTodayTopics: string;
    trendingActiveUsers: string;
    trendingOnlineUsers: string;
    trendingUnnamedUser: string;
    featuredHeadingPrefix: string;
    socialHotDiscussion: string;
    socialManyParticipants: string;
    socialHasReply: string;
    socialExpectParticipation: string;
    socialLikeCount: string;
    socialPopularView: string;
    socialParticipantCount: string;
    socialReplyCount: string;
    socialLastReply: string;
    postListEmptyText: string;
    postListLoadFailed: string;
    postListBrowseAll: string;
    feedViewContentAria: string;
    feedAnonymous: string;
    feedViewMemberAria: string;
    feedUnnamedMember: string;
    feedJoinedAt: string;
    editorBold: string;
    editorItalic: string;
    editorStrikethrough: string;
    editorHeading: string;
    editorLink: string;
    editorInlineCode: string;
    editorCodeBlock: string;
    editorQuote: string;
    editorList: string;
    editorOrderedList: string;
    editorPlaceholder: string;
    editorUploadFailed: string;
    editorUploadImage: string;
    editorUploading: string;
    editorNoPreviewContent: string;
    contentActions: string;
    like: string;
    unlike: string;
    favorite: string;
    unfavorite: string;
    pleaseLoginTitle: string;
    confirmDeleteTitle: string;
    confirmDeleteMessage: string;
    confirmDeleteLabel: string;
    viewTopic: string;
  },
  feedback: {
    errorTitle: string;
    globalErrorTitle: string;
    errorDesc: string;
    globalErrorDesc: string;
    errorId: string;
    closeAnnouncement: string;
  }
}

export const zhCN: CommonMessages = {
  common: {
    loading: '加载中',
    refresh: '刷新',
    retry: '重试',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    confirm: '确认',
    close: '关闭',
    search: '搜索',
    empty: '暂无数据',
    error: '加载失败',
    back: '返回',
    submit: '提交',
    more: '更多',
    processing: '处理中...',
    loadingDefault: '加载中...',
    irreversible: '此操作不可撤销，请谨慎操作。',
    language: '语言',
    switchLanguage: '切换语言',
    avatarAlt: '头像',
    warningHint: '此操作可能影响系统状态，请确认后再继续。',
    infoHint: '请确认以上信息后再继续操作。',
  },
  fallback: {
    errorTitle: '页面出错了',
    globalErrorTitle: '出错了',
    errorDesc: '此页面遇到了一个错误。错误已自动上报，请尝试重试。',
    globalErrorDesc: '页面遇到了一个意外错误。错误已自动上报，请尝试重新加载。',
    errorId: 'Error ID',
  },
  nav: {
    home: '首页',
    community: '社区',
    events: '活动',
    tools: '工具',
    about: '关于',
    join: '加入',
    profile: '个人中心',
    admin: '管理后台',
    login: '登录',
    logout: '退出登录',
    brand: '计算机协会',
    toggleMenu: '切换菜单',
    logoAlt: '计算机协会 Logo',
    aboutEn: 'About',
    eventsEn: 'Events',
    communityEn: 'Community',
    toolsEn: 'Tools',
    homeEn: 'Home',
    searchAria: '全站搜索',
    searchPlaceholder: '搜索全站…',
    searchPlaceholderModule: '搜索{scope}…',
    searchLoading: '搜索中…',
    searchNoResults: '未找到相关内容',
    searchHint: '输入 2 个以上字符开始搜索',
    searchGroupAll: '全站',
    searchGroupEvents: '活动',
    searchGroupCommunity: '社区帖子',
    searchGroupTools: '学习资源',
    searchGroupAnnouncements: '公告',
    searchGroupUsers: '成员',
    searchViewAll: '查看全部结果 →',
    searchPageTitle: '搜索结果',
    searchPageTotal: '共 {count} 条结果',
  },
  footer: {
    aboutJoin: '关于我们 & 加入',
    madeWith: 'Made with passion by Computer Association',
  },
  theme: {
    toLight: '切换到浅色模式',
    toDark: '切换到深色模式',
  },
  techTag: {
    sectionLabel: '技术方向',
    hint: '选择你最感兴趣的技术方向（最多 {max} 个），用于个性化推荐。',
  },
  follow: {
    following: '已关注',
    follow: '+ 关注',
    pending: '...',
  },
  report: {
    reasons: {
      spam: '垃圾广告 / Spam',
      porn: '色情低俗',
      abuse: '辱骂攻击',
      fakeInfo: '虚假信息',
      infringement: '侵权 / 抄袭',
      other: '其他',
    },
    errorSelectReason: '请选择举报理由',
    errorSubmitFailed: '举报提交失败',
    buttonTitle: '举报',
    buttonLabel: '举报',
    dialogTitle: '[ 举报内容 ]',
    successMessage: '举报已提交，感谢反馈。',
    detailPlaceholder: '补充说明（可选，最多 1000 字）',
    cancel: '取消',
    submitting: '提交中...',
    submit: '提交举报',
  },
  communityCommon: {
    backToCommunity: '← 返回',
    community: '社区',
    anonymous: '匿名',
    viewsLabel: '阅读',
    likesLabel: '点赞',
    repliesLabel: '回复',
    allSections: '← 所有版块',
    replyListTitle: '回复',
    yourReplyTitle: '你的回复',
    loadNestedFailed: '加载楼中楼失败',
    loading: '加载中...',
    collapseNested: '收起楼中楼 ({count})',
    expandNested: '展开楼中楼 ({count})',
    retry: '重试',
    loadMoreNested: '加载更多 {count} 条',
    sortNewest: '最新',
    sortOldest: '最早',
    sortHottest: '最热',
    pleaseLogin: '登录后才能参与讨论',
    loginNow: '立即登录 →',
    replyToNested: '回复楼中楼',
    cancel: '取消',
    replyPlaceholder: '在此输入你的回复...（支持 Markdown）',
    postReply: '发布回复',
    clear: '清空',
    saveFailed: '保存失败',
    noRepliesYet: '暂无回复，来发表第一条吧',
    sidebarAllSections: '全部版块',
    linkCommunityHome: '→ 社区首页',
    linkCommunity: '→ 社区',
    linkMembers: '→ 成员列表',
    trendingTodayTopics: '今日发帖',
    trendingActiveUsers: '活跃用户',
    trendingOnlineUsers: '在线用户',
    trendingUnnamedUser: '未命名用户',
    featuredHeadingPrefix: '精选与置顶 — ',
    socialHotDiscussion: '讨论热烈',
    socialManyParticipants: '多人参与讨论',
    socialHasReply: '已有回复',
    socialExpectParticipation: '期待你的参与',
    socialLikeCount: '{count} 人点赞',
    socialPopularView: '热门浏览',
    socialParticipantCount: '{count} 人参与讨论',
    socialReplyCount: '{count} 条回复',
    socialLastReply: '最近回复 {time}',
    postListEmptyText: '暂无内容',
    postListLoadFailed: '加载失败',
    postListBrowseAll: '浏览全部内容 →',
    feedViewContentAria: '查看内容 {title}',
    feedAnonymous: '匿名',
    feedViewMemberAria: '查看成员 {name}',
    feedUnnamedMember: '未命名用户',
    feedJoinedAt: '加入于 {date}',
    editorBold: '加粗',
    editorItalic: '斜体',
    editorStrikethrough: '删除线',
    editorHeading: '标题',
    editorLink: '链接',
    editorInlineCode: '行内代码',
    editorCodeBlock: '代码块',
    editorQuote: '引用',
    editorList: '列表',
    editorOrderedList: '有序列表',
    editorPlaceholder: '在此输入 Markdown 内容...',
    editorUploadFailed: '上传失败',
    editorUploadImage: '上传图片',
    editorUploading: '···',
    editorNoPreviewContent: '暂无内容可预览',
    contentActions: '社区内容操作',
    like: '点赞',
    unlike: '取消点赞',
    favorite: '收藏',
    unfavorite: '取消收藏',
    pleaseLoginTitle: '请先登录',
    confirmDeleteTitle: '删除',
    confirmDeleteMessage: '确认删除？此操作不可恢复。',
    confirmDeleteLabel: '确认删除',
    viewTopic: '查看主题',
  },
  feedback: {
    errorTitle: '页面出错了',
    globalErrorTitle: '出错了',
    errorDesc: '此页面遇到了一个错误。错误已自动上报，请尝试重试。',
    globalErrorDesc: '页面遇到了一个意外错误。错误已自动上报，请尝试重新加载。',
    errorId: 'Error ID',
    closeAnnouncement: '关闭公告',
  }
};

export const en: CommonMessages = {
  common: {
    loading: 'Loading',
    refresh: 'Refresh',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search',
    empty: 'No data',
    error: 'Load failed',
    back: 'Back',
    submit: 'Submit',
    more: 'More',
    processing: 'Processing...',
    loadingDefault: 'Loading...',
    irreversible: 'This action is irreversible. Please proceed with caution.',
    language: 'Language',
    switchLanguage: 'Switch language',
    avatarAlt: 'Avatar',
    warningHint: 'This action may affect the system state. Please confirm before continuing.',
    infoHint: 'Please confirm the above information before continuing.',
  },
  fallback: {
    errorTitle: 'Page error',
    globalErrorTitle: 'Unexpected error',
    errorDesc: 'An error occurred on this page. It has been reported automatically. Please try again.',
    globalErrorDesc: 'An unexpected error occurred. It has been reported. Please reload the page.',
    errorId: 'Error ID',
  },
  nav: {
    home: 'Home',
    community: 'Community',
    events: 'Events',
    tools: 'Tools',
    about: 'About',
    join: 'Join',
    profile: 'Profile',
    admin: 'Admin',
    login: 'Login',
    logout: 'Logout',
    brand: 'Computer Association',
    toggleMenu: 'Toggle menu',
    logoAlt: 'Computer Association Logo',
    aboutEn: 'About',
    eventsEn: 'Events',
    communityEn: 'Community',
    toolsEn: 'Tools',
    homeEn: 'Home',
    searchAria: 'Site-wide search',
    searchPlaceholder: 'Search the site…',
    searchPlaceholderModule: 'Search {scope}…',
    searchLoading: 'Searching…',
    searchNoResults: 'No matching results',
    searchHint: 'Type at least 2 characters to search',
    searchGroupAll: 'All',
    searchGroupEvents: 'Events',
    searchGroupCommunity: 'Community Posts',
    searchGroupTools: 'Resources',
    searchGroupAnnouncements: 'Announcements',
    searchGroupUsers: 'Members',
    searchViewAll: 'View all results →',
    searchPageTitle: 'Search Results',
    searchPageTotal: '{count} results in total',
  },
  footer: {
    aboutJoin: 'About us & Join',
    madeWith: 'Made with passion by Computer Association',
  },
  theme: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
  },
  techTag: {
    sectionLabel: 'Tech Tags',
    hint: 'Select the tech directions you are most interested in (up to {max}), used for personalized recommendations.',
  },
  follow: {
    following: 'Following',
    follow: '+ Follow',
    pending: '...',
  },
  report: {
    reasons: {
      spam: 'Spam / 广告',
      porn: 'Pornographic',
      abuse: 'Abuse / Harassment',
      fakeInfo: 'False Information',
      infringement: 'Infringement / Plagiarism',
      other: 'Other',
    },
    errorSelectReason: 'Please select a reason',
    errorSubmitFailed: 'Failed to submit report',
    buttonTitle: 'Report',
    buttonLabel: 'Report',
    dialogTitle: '[ Report Content ]',
    successMessage: 'Report submitted. Thank you for your feedback.',
    detailPlaceholder: 'Additional details (optional, up to 1000 chars)',
    cancel: 'Cancel',
    submitting: 'Submitting...',
    submit: 'Submit Report',
  },
  communityCommon: {
    backToCommunity: '← Back',
    community: 'Community',
    anonymous: 'Anonymous',
    viewsLabel: 'Views',
    likesLabel: 'Likes',
    repliesLabel: 'Replies',
    allSections: '← All Sections',
    replyListTitle: 'Replies',
    yourReplyTitle: 'Your Reply',
    loadNestedFailed: 'Failed to load nested replies',
    loading: 'Loading...',
    collapseNested: 'Collapse nested replies ({count})',
    expandNested: 'Expand nested replies ({count})',
    retry: 'Retry',
    loadMoreNested: 'Load {count} more',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortHottest: 'Hottest',
    pleaseLogin: 'Please sign in to join the discussion',
    loginNow: 'Sign in now →',
    replyToNested: 'Reply to nested',
    cancel: 'Cancel',
    replyPlaceholder: 'Type your reply here... (Markdown supported)',
    postReply: 'Post Reply',
    clear: 'Clear',
    saveFailed: 'Save failed',
    noRepliesYet: 'No replies yet. Be the first to comment!',
    sidebarAllSections: 'All Sections',
    linkCommunityHome: '→ Community Home',
    linkCommunity: '→ Community',
    linkMembers: '→ Members',
    trendingTodayTopics: 'Today’s Posts',
    trendingActiveUsers: 'Active Users',
    trendingOnlineUsers: 'Online Users',
    trendingUnnamedUser: 'Unnamed User',
    featuredHeadingPrefix: 'Featured & Pinned — ',
    socialHotDiscussion: 'Hot discussion',
    socialManyParticipants: 'Many participants',
    socialHasReply: 'Has replies',
    socialExpectParticipation: 'Looking forward to your participation',
    socialLikeCount: '{count} likes',
    socialPopularView: 'Popular views',
    socialParticipantCount: '{count} participants',
    socialReplyCount: '{count} replies',
    socialLastReply: 'Last reply {time}',
    postListEmptyText: 'No content yet',
    postListLoadFailed: 'Failed to load',
    postListBrowseAll: 'Browse all content →',
    feedViewContentAria: 'View content {title}',
    feedAnonymous: 'Anonymous',
    feedUnnamedMember: 'Unnamed User',
    feedViewMemberAria: 'View member {name}',
    feedJoinedAt: 'Joined {date}',
    editorBold: 'Bold',
    editorItalic: 'Italic',
    editorStrikethrough: 'Strikethrough',
    editorHeading: 'Heading',
    editorLink: 'Link',
    editorInlineCode: 'Inline Code',
    editorCodeBlock: 'Code Block',
    editorQuote: 'Quote',
    editorList: 'List',
    editorOrderedList: 'Ordered List',
    editorPlaceholder: 'Type Markdown content here...',
    editorUploadFailed: 'Upload failed',
    editorUploadImage: 'Upload Image',
    editorUploading: '···',
    editorNoPreviewContent: 'Nothing to preview',
    contentActions: 'Community content actions',
    like: 'Like',
    unlike: 'Unlike',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    pleaseLoginTitle: 'Please sign in first',
    confirmDeleteTitle: 'Delete',
    confirmDeleteMessage: 'Confirm delete? This action cannot be undone.',
    confirmDeleteLabel: 'Confirm Delete',
    viewTopic: 'View Topic',
  },
  feedback: {
    errorTitle: 'Page error',
    globalErrorTitle: 'Unexpected error',
    errorDesc: 'An error occurred on this page. It has been reported automatically. Please try again.',
    globalErrorDesc: 'An unexpected error occurred. It has been reported. Please reload the page.',
    errorId: 'Error ID',
    closeAnnouncement: 'Close announcement',
  }
};
