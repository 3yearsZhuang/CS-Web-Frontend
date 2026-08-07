/**
 * @file i18n 消息模块 — community（自动拆分自 types.ts / languages/*.ts）
 * 包含该业务模块下的所有 namespace：类型 + 中英文语言包。
 */

export interface CommunityMessages {
  community: {
    topics: string;
    replies: string;
    categories: string;
    newTopic: string;
    noTopics: string;
    searchPlaceholder: string;
    tabAll: string;
    tabFollowing: string;
    tabMember: string;
    tabAdmin: string;
    searchResults: string;
    communityFeed: string;
    searchCount: string;
    statsLine: string;
    feedDefaultDesc: string;
    searchPlaceholderFull: string;
    clearSearch: string;
    searching: string;
    search: string;
    publish: string;
    chars: string;
    hotTags: string;
    selectedTag: string;
    loginRequired: string;
    followingRequiresLogin: string;
    memberRequiresLogin: string;
    followingLoginDesc: string;
    memberLoginDesc: string;
    login: string;
    retry: string;
    noMatch: string;
    noContent: string;
    clearFilter: string;
    heroTitle1: string;
    heroTitle2: string;
    heroTitle3: string;
    heroTitleEn: string;
    heroDesc1: string;
    heroDesc2: string;
  },
  communityAdmin: {
    tabCategories: string;
    tabTopics: string;
    tabUsers: string;
    tabAnnouncements: string;
    tabDashboard: string;
    tabReports: string;
    loadFailed: string;
    actionFailed: string;
    hidePrompt: string;
    hardDeleteTitle: string;
    hardDeleteMessage: string;
    confirmDelete: string;
    searchLabel: string;
    searchPlaceholder: string;
    statusLabel: string;
    categoryLabel: string;
    allOption: string;
    sortLabel: string;
    loading: string;
    countPrefix: string;
    countSuffix: string;
    noTopics: string;
    colTitleAuthor: string;
    colStatus: string;
    colStats: string;
    colCreated: string;
    colActions: string;
    anonymous: string;
    statusMobile: string;
    unpinTitle: string;
    pinTitle: string;
    unpinBtn: string;
    pinBtn: string;
    unfeatTitle: string;
    featTitle: string;
    unfeatBtn: string;
    featBtn: string;
    hideBtn: string;
    restoreBtn: string;
    deleteBtn: string;
    slugNameRequired: string;
    createFailed: string;
    saveFailed: string;
    deleteTitle: string;
    deleteMessage: string;
    deleteFailed: string;
    createSection: string;
    slugLabelRequired: string;
    nameLabelRequired: string;
    namePlaceholder: string;
    iconLabel: string;
    sortOrderLabel: string;
    descriptionLabel: string;
    descPlaceholder: string;
    creatingBtn: string;
    createBtn: string;
    noCategories: string;
    colSort: string;
    colSlug: string;
    colName: string;
    colDesc: string;
    colTopics: string;
    colPosts: string;
    slugLabel: string;
    nameLabel: string;
    sortMobile: string;
    slugMobile: string;
    topicsMobile: string;
    postsMobile: string;
    savingBtn: string;
    saveBtn: string;
    cancelBtn: string;
    editBtn: string;
  },
  communityProfile: {
    loadFailed: string;
    loading: string;
    noTopics: string;
    noReplies: string;
    noFavorites: string;
    countPrefix: string;
    countUnit: string;
    unitTopics: string;
    unitReplies: string;
    unitFavorites: string;
    newTopicLink: string;
    browseCategories: string;
    noRepliesDesc: string;
    noContentDesc: string;
    browseCommunity: string;
    topicDeleted: string;
    nestedReply: string;
    noTopicsDesc: string;
    noFavoritesDesc: string;
    browseForum: string;
  },
  communityNew: {
    loginRequiredTitle1: string;
    loginRequiredTitle2: string;
    loginRequiredDesc: string;
    loginNow: string;
    heroTitle1: string;
    heroTitle2: string;
    heroDesc: string;
    hintsLabel: string;
    hintsTitle1: string;
    hintsTitle2: string;
    hint01Title: string;
    hint01Desc: string;
    hint02Title: string;
    hint02Desc: string;
    hint03Title: string;
    hint03Desc: string;
    hint04Title: string;
    hint04Desc: string;
    formLabel: string;
    noCategories: string;
    titlePlaceholder: string;
    contentPlaceholder: string;
    posting: string;
    submit: string;
    clearTitle: string;
    clearMessage: string;
    clearConfirm: string;
    clearBtn: string;
    cancelBtn: string;
  },
  communityDrafts: {
    heroTitle: string;
    heroDesc: string;
    loginRequiredDesc: string;
    loginLink: string;
    backToAll: string;
    writeNew: string;
    emptyText: string;
  },
  communitySeries: {
    heroDesc: string;
    backToAll: string;
    emptyText: string;
  },
  communityTags: {
    heroDesc: string;
    backToAll: string;
    emptyText: string;
  },
  communityDetail: {
    loading: string;
    backToCommunity: string;
  },
  reportsManager: {
    statusPending: string;
    statusResolved: string;
    statusDismissed: string;
    statusAll: string;
    resolveTitle: string;
    dismissTitle: string;
    confirm: string;
    targetTopic: string;
    targetReply: string;
    reporter: string;
    reason: string;
    viewContent: string;
    resolveBtn: string;
    dismissBtn: string;
    statusResolvedLabel: string;
    statusDismissedLabel: string;
  }
}

export const zhCN: CommunityMessages = {
  community: {
    topics: '主题',
    replies: '回复',
    categories: '版块',
    newTopic: '发布主题',
    noTopics: '暂无主题',
    searchPlaceholder: '搜索帖子...',
    tabAll: '全部 / All',
    tabFollowing: '关注流 / Following',
    tabMember: '成员 / Members',
    tabAdmin: '管理 / Admin',
    searchResults: '搜索结果',
    communityFeed: '社区动态',
    searchCount: '// 找到 {count} 条结果',
    statsLine: '// {topics} 主题 · {posts} 文章 · {members} 成员',
    feedDefaultDesc: '// 聚合论坛、博客、成员的最新动态',
    searchPlaceholderFull: '搜索主题 / 文章 / 成员...',
    clearSearch: '清空搜索',
    searching: 'Searching...',
    search: 'Search →',
    publish: '发布内容 →',
    chars: 'chars',
    hotTags: '// 热门标签 — ',
    selectedTag: '// 已选标签:',
    loginRequired: '// LOGIN REQUIRED',
    followingRequiresLogin: '关注流仅对登录用户开放',
    memberRequiresLogin: '成员列表仅对登录用户开放',
    followingLoginDesc: '登录后查看你关注的人的最新动态',
    memberLoginDesc: '登录后查看社区成员的技术标签与活跃动态',
    login: '登录 / Login →',
    retry: '重试',
    noMatch: '// 没有找到匹配的内容',
    noContent: '// 社区暂无内容',
    clearFilter: '清空筛选 ←',
    heroTitle1: '汇聚',
    heroTitle2: '技术',
    heroTitle3: '的每一份声音。',
    heroTitleEn: '/ Community',
    heroDesc1: '论坛主题、博客文章、社区成员，一站浏览。',
    heroDesc2: '让每个声音被听见，每篇文章被阅读，每位成员被看见',
  },
  communityAdmin: {
    tabCategories: '[ 版块管理 / Categories ]',
    tabTopics: '[ 主题审核 / Topics ]',
    tabUsers: '[ 用户管理 / Users ]',
    tabAnnouncements: '[ 公告管理 / Announcements ]',
    tabDashboard: '[ 数据看板 / Dashboard ]',
    tabReports: '[ 举报处理 / Reports ]',
    loadFailed: '加载失败',
    actionFailed: '操作失败',
    hidePrompt: '隐藏主题「{title}」\n请输入隐藏原因（可选）：',
    hardDeleteTitle: '硬删除主题',
    hardDeleteMessage: '硬删除主题「{title}」？\n该操作不可恢复，将级联删除所有回复、点赞、收藏。',
    confirmDelete: '确认删除',
    searchLabel: '搜索 / Search',
    searchPlaceholder: '搜索标题或正文...',
    statusLabel: '状态 / Status',
    categoryLabel: '分类 / Category',
    allOption: '全部 / All',
    sortLabel: '排序 / Sort',
    loading: '// 加载中...',
    countPrefix: '// 共 ',
    countSuffix: ' 条主题',
    noTopics: '// 暂无主题',
    colTitleAuthor: '标题 / 作者 / Title / Author',
    colStatus: '状态 / Status',
    colStats: '统计 / Stats',
    colCreated: '创建 / Created',
    colActions: '操作 / Actions',
    anonymous: '匿名',
    statusMobile: '状态:',
    unpinTitle: '取消置顶',
    pinTitle: '置顶',
    unpinBtn: '取消置顶 / Unpin',
    pinBtn: '置顶 / Pin',
    unfeatTitle: '取消加精',
    featTitle: '加精',
    unfeatBtn: '取消加精 / Unfeat',
    featBtn: '加精 / Feat',
    hideBtn: '隐藏 / Hide',
    restoreBtn: '恢复 / Restore',
    deleteBtn: '删除 / Del',
    slugNameRequired: 'slug 与 name 必填',
    createFailed: '创建失败',
    saveFailed: '保存失败',
    deleteTitle: '删除版块',
    deleteMessage: '确定要删除版块「{name}」吗？\n该操作将级联删除其下所有主题与回复，且不可恢复。',
    deleteFailed: '删除失败',
    createSection: '新建版块',
    slugLabelRequired: '标识 / Slug *',
    nameLabelRequired: '名称 / Name *',
    namePlaceholder: 'Web 开发',
    iconLabel: '图标 / Icon',
    sortOrderLabel: '排序 / Sort Order',
    descriptionLabel: '描述 / Description',
    descPlaceholder: '版块描述...',
    creatingBtn: '创建中 / Creating...',
    createBtn: '创建 / Create →',
    noCategories: '// 暂无版块',
    colSort: '排序 / Sort',
    colSlug: '标识 / Slug',
    colName: '名称 / Name',
    colDesc: '描述 / Description',
    colTopics: '主题 / Topics',
    colPosts: '帖子 / Posts',
    slugLabel: '标识 / Slug',
    nameLabel: '名称 / Name',
    sortMobile: '排序:',
    slugMobile: '标识:',
    topicsMobile: '主题:',
    postsMobile: '帖子:',
    savingBtn: '保存中 / Saving...',
    saveBtn: '保存 / Save',
    cancelBtn: '取消 / Cancel',
    editBtn: '编辑 / Edit',
  },
  communityProfile: {
    loadFailed: '加载失败',
    loading: '// 加载中...',
    noTopics: '暂无发布的主题',
    noReplies: '暂无发布的回复',
    noFavorites: '暂无收藏的主题',
    countPrefix: '// 共 ',
    countUnit: '条',
    unitTopics: '主题',
    unitReplies: '回复',
    unitFavorites: '收藏',
    newTopicLink: '发新主题 →',
    browseCategories: '浏览版块 →',
    noRepliesDesc: '你还没有发布过回复。',
    noContentDesc: '暂无内容。',
    browseCommunity: '浏览社区 →',
    topicDeleted: '（主题已删除）',
    nestedReply: '楼中楼',
    noTopicsDesc: '你还没有发布过主题。',
    noFavoritesDesc: '你还没有收藏过主题。',
    browseForum: '浏览论坛 →',
  },
  communityNew: {
    loginRequiredTitle1: '请先 ',
    loginRequiredTitle2: '登录',
    loginRequiredDesc: '// 发布内容需要登录账户，加入社区讨论',
    loginNow: '立即登录 →',
    heroTitle1: '发布 ',
    heroTitle2: '内容',
    heroDesc: '选择版块，写下你的问题、思考或作品。支持 Markdown 与图片上传。',
    hintsLabel: '提示 / Hints',
    hintsTitle1: '发布 ',
    hintsTitle2: '提示',
    hint01Title: '// 01 标题',
    hint01Desc: '简明描述问题或主题，避免「求助」「跪求」等无信息量词汇。',
    hint02Title: '// 02 正文',
    hint02Desc: '提供必要的背景、代码、报错信息。代码请用 ``` 包裹。',
    hint03Title: '// 03 图片',
    hint03Desc: '支持上传 ≤5MB 的 JPEG/PNG/WebP/GIF，单帖 ≤5 张。',
    hint04Title: '// 04 审核',
    hint04Desc: '事后审核：发布即发布，管理员有权隐藏违规内容。',
    formLabel: '表单 / Form',
    noCategories: '无可用版块',
    titlePlaceholder: '简明扼要地描述主题...',
    contentPlaceholder: '在此输入正文...（支持 Markdown 语法，可上传图片）',
    posting: '发布中...',
    submit: '发布内容 →',
    clearTitle: '清空内容',
    clearMessage: '确定要清空所有内容吗？',
    clearConfirm: '确认清空',
    clearBtn: '清空',
    cancelBtn: '取消',
  },
  communityDrafts: {
    heroTitle: '草稿箱',
    heroDesc: '你的未发布文章，仅自己可见。',
    loginRequiredDesc: '// 草稿箱需要登录',
    loginLink: '去登录 →',
    backToAll: '← 返回全部内容',
    writeNew: '写新文章 →',
    emptyText: '// 暂无草稿',
  },
  communitySeries: {
    heroDesc: '系列合集，按发布顺序阅读。',
    backToAll: '← 返回全部内容',
    emptyText: '// 该系列下暂无文章',
  },
  communityTags: {
    heroDesc: '标签「{tag}」下的全部文章。',
    backToAll: '← 返回全部内容',
    emptyText: '// 该标签下暂无文章',
  },
  communityDetail: {
    loading: 'Loading...',
    backToCommunity: '← 返回社区',
  },
  reportsManager: {
    statusPending: '待处理',
    statusResolved: '已处理',
    statusDismissed: '已驳回',
    statusAll: '全部',
    resolveTitle: '标记已处理',
    dismissTitle: '驳回举报',
    confirm: '确认',
    targetTopic: '主题',
    targetReply: '回复',
    reporter: '举报人',
    reason: '理由',
    viewContent: '查看内容 →',
    resolveBtn: '已处理',
    dismissBtn: '驳回',
    statusResolvedLabel: '已处理',
    statusDismissedLabel: '已驳回',
  }
};

export const en: CommunityMessages = {
  community: {
    topics: 'Topics',
    replies: 'Replies',
    categories: 'Categories',
    newTopic: 'New topic',
    noTopics: 'No topics',
    searchPlaceholder: 'Search posts...',
    tabAll: 'All / 全部',
    tabFollowing: 'Following / 关注流',
    tabMember: 'Members / 成员',
    tabAdmin: 'Admin / 管理',
    searchResults: 'Search results',
    communityFeed: 'Community Feed',
    searchCount: '// {count} results found',
    statsLine: '// {topics} topics · {posts} posts · {members} members',
    feedDefaultDesc: '// Aggregate the latest from forum, blog, and members',
    searchPlaceholderFull: 'Search topics / posts / members...',
    clearSearch: 'Clear search',
    searching: 'Searching...',
    search: 'Search →',
    publish: 'Post →',
    chars: 'chars',
    hotTags: '// Hot tags — ',
    selectedTag: '// Selected tag:',
    loginRequired: '// LOGIN REQUIRED',
    followingRequiresLogin: 'Following feed is available to logged-in users only',
    memberRequiresLogin: 'Member list is available to logged-in users only',
    followingLoginDesc: 'Sign in to see the latest updates from people you follow',
    memberLoginDesc: 'Sign in to browse members and their tech tags and activity',
    login: 'Sign in / Login →',
    retry: 'Retry',
    noMatch: '// No matching content found',
    noContent: '// The community has no content yet',
    clearFilter: 'Clear filters ←',
    heroTitle1: 'Every voice',
    heroTitle2: 'in tech',
    heroTitle3: ', gathered here.',
    heroTitleEn: '/ Community',
    heroDesc1: 'Forum topics, blog posts, and community members — all in one place.',
    heroDesc2: 'Let every voice be heard, every post be read, every member be seen',
  },
  communityAdmin: {
    tabCategories: '[ Categories / 版块管理 ]',
    tabTopics: '[ Topics / 主题审核 ]',
    tabUsers: '[ Users / 用户管理 ]',
    tabAnnouncements: '[ Announcements / 公告管理 ]',
    tabDashboard: '[ Dashboard / 数据看板 ]',
    tabReports: '[ Reports / 举报处理 ]',
    loadFailed: 'Load failed',
    actionFailed: 'Operation failed',
    hidePrompt: 'Hide topic "{title}"\nEnter hide reason (optional):',
    hardDeleteTitle: 'Hard delete topic',
    hardDeleteMessage: 'Hard delete topic "{title}"?\nThis action is irreversible and will cascade-delete all replies, likes, and favorites.',
    confirmDelete: 'Confirm delete',
    searchLabel: 'Search / 搜索',
    searchPlaceholder: 'Search title or content...',
    statusLabel: 'Status / 状态',
    categoryLabel: 'Category / 分类',
    allOption: 'All / 全部',
    sortLabel: 'Sort / 排序',
    loading: '// Loading...',
    countPrefix: '// ',
    countSuffix: ' topics',
    noTopics: '// No topics',
    colTitleAuthor: 'Title / Author / 标题 / 作者',
    colStatus: 'Status / 状态',
    colStats: 'Stats / 统计',
    colCreated: 'Created / 创建',
    colActions: 'Actions / 操作',
    anonymous: 'Anonymous',
    statusMobile: 'Status:',
    unpinTitle: 'Unpin',
    pinTitle: 'Pin',
    unpinBtn: 'Unpin / 取消置顶',
    pinBtn: 'Pin / 置顶',
    unfeatTitle: 'Unfeature',
    featTitle: 'Feature',
    unfeatBtn: 'Unfeat / 取消加精',
    featBtn: 'Feat / 加精',
    hideBtn: 'Hide / 隐藏',
    restoreBtn: 'Restore / 恢复',
    deleteBtn: 'Del / 删除',
    slugNameRequired: 'slug and name are required',
    createFailed: 'Failed to create',
    saveFailed: 'Failed to save',
    deleteTitle: 'Delete category',
    deleteMessage: 'Delete category "{name}"?\nThis will cascade-delete all topics and replies under it, and cannot be undone.',
    deleteFailed: 'Failed to delete',
    createSection: 'New category',
    slugLabelRequired: 'Slug / 标识 *',
    nameLabelRequired: 'Name / 名称 *',
    namePlaceholder: 'Web Development',
    iconLabel: 'Icon / 图标',
    sortOrderLabel: 'Sort Order / 排序',
    descriptionLabel: 'Description / 描述',
    descPlaceholder: 'Category description...',
    creatingBtn: 'Creating... / 创建中',
    createBtn: 'Create / 创建 →',
    noCategories: '// No categories',
    colSort: 'Sort / 排序',
    colSlug: 'Slug / 标识',
    colName: 'Name / 名称',
    colDesc: 'Description / 描述',
    colTopics: 'Topics / 主题',
    colPosts: 'Posts / 帖子',
    slugLabel: 'Slug / 标识',
    nameLabel: 'Name / 名称',
    sortMobile: 'Sort:',
    slugMobile: 'Slug:',
    topicsMobile: 'Topics:',
    postsMobile: 'Posts:',
    savingBtn: 'Saving... / 保存中',
    saveBtn: 'Save / 保存',
    cancelBtn: 'Cancel / 取消',
    editBtn: 'Edit / 编辑',
  },
  communityProfile: {
    loadFailed: 'Load failed',
    loading: '// Loading...',
    noTopics: '// No topics published yet',
    noReplies: '// No replies published yet',
    noFavorites: '// No favorited topics yet',
    countPrefix: '// ',
    countUnit: '',
    unitTopics: 'topics',
    unitReplies: 'replies',
    unitFavorites: 'favorites',
    newTopicLink: 'New topic →',
    browseCategories: 'Browse categories →',
    noRepliesDesc: 'You have not posted any replies yet.',
    noContentDesc: 'No content yet.',
    browseCommunity: 'Browse community →',
    topicDeleted: '(Topic deleted)',
    nestedReply: 'Nested reply',
    noTopicsDesc: 'You have not posted any topics yet.',
    noFavoritesDesc: 'You have not favorited any topics yet.',
    browseForum: 'Browse forum →',
  },
  communityNew: {
    loginRequiredTitle1: 'Please ',
    loginRequiredTitle2: 'sign in',
    loginRequiredDesc: '// Publishing requires an account. Join the community discussion.',
    loginNow: 'Sign in now →',
    heroTitle1: 'Publish ',
    heroTitle2: 'content',
    heroDesc: 'Pick a category and write your question, thoughts, or work. Markdown and image uploads supported.',
    hintsLabel: 'Hints / 提示',
    hintsTitle1: 'Posting ',
    hintsTitle2: 'tips',
    hint01Title: '// 01 Title',
    hint01Desc: 'Describe the problem or topic concisely; avoid low-info words like "help" or "begging".',
    hint02Title: '// 02 Body',
    hint02Desc: 'Provide necessary context, code, and error messages. Wrap code in ```.',
    hint03Title: '// 03 Images',
    hint03Desc: 'Upload ≤5MB JPEG/PNG/WebP/GIF, up to 5 images per post.',
    hint04Title: '// 04 Review',
    hint04Desc: 'Post-moderation: posts go live immediately; admins may hide violations.',
    formLabel: 'Form / 表单',
    noCategories: 'No categories available',
    titlePlaceholder: 'Describe the topic concisely...',
    contentPlaceholder: 'Enter body here... (Markdown supported, images uploadable)',
    posting: 'Posting...',
    submit: 'Publish →',
    clearTitle: 'Clear content',
    clearMessage: 'Clear all content?',
    clearConfirm: 'Confirm clear',
    clearBtn: 'Clear',
    cancelBtn: 'Cancel',
  },
  communityDrafts: {
    heroTitle: 'Drafts',
    heroDesc: 'Your unpublished articles, visible only to you.',
    loginRequiredDesc: '// Drafts require sign-in',
    loginLink: 'Sign in →',
    backToAll: '← Back to all',
    writeNew: 'Write new →',
    emptyText: '// No drafts yet',
  },
  communitySeries: {
    heroDesc: 'Series collection, read in publish order.',
    backToAll: '← Back to all',
    emptyText: '// No articles in this series yet',
  },
  communityTags: {
    heroDesc: 'All articles tagged "{tag}".',
    backToAll: '← Back to all',
    emptyText: '// No articles with this tag yet',
  },
  communityDetail: {
    loading: 'Loading...',
    backToCommunity: '← Back to Community',
  },
  reportsManager: {
    statusPending: 'Pending',
    statusResolved: 'Resolved',
    statusDismissed: 'Dismissed',
    statusAll: 'All',
    resolveTitle: 'Mark as Resolved',
    dismissTitle: 'Dismiss Report',
    confirm: 'Confirm',
    targetTopic: 'Topic',
    targetReply: 'Reply',
    reporter: 'Reporter',
    reason: 'Reason',
    viewContent: 'View content →',
    resolveBtn: 'Resolved',
    dismissBtn: 'Dismiss',
    statusResolvedLabel: 'Resolved',
    statusDismissedLabel: 'Dismissed',
  }
};
