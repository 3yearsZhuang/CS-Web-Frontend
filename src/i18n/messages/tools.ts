/**
 * @file i18n 消息模块 — tools（自动拆分自 types.ts / languages/*.ts）
 * 包含该业务模块下的所有 namespace：类型 + 中英文语言包。
 */

export interface ToolsMessages {
  tools: {
    tabAvailable: string;
    tabDeveloping: string;
    tabAdmin: string;
    heroTitle: string;
    heroTitleEn: string;
    heroDesc1: string;
    heroDesc2: string;
    sectionTitleAvailable: string;
    sectionTitleDeveloping: string;
    sectionDescAvailable: string;
    sectionDescDeveloping: string;
    enter: string;
    statusAvailable: string;
    statusDeveloping: string;
    communityTitle: string;
    communityEn: string;
    communityDesc: string;
    examTitle: string;
    examEn: string;
    examDesc: string;
    resourceTitle: string;
    resourceEn: string;
    resourceDesc: string;
    taskTitle: string;
    taskEn: string;
    taskDesc: string;
    devCenterTitle: string;
    devCenterEn: string;
    devCenterDesc: string;
    chatTitle: string;
    chatEn: string;
    chatDesc: string;
  },
  toolsTask: {
    tabBoard: string;
    tabMyClaims: string;
    tabPoints: string;
    heroLabel: string;
    heroTitle1: string;
    heroTitle2: string;
    heroDesc1: string;
    heroDesc2: string;
    back: string;
    pointsSystem: string;
    notLoggedIn: string;
    loginToViewPoints: string;
    loginToViewClaims: string;
    noClaims: string;
    pointsUnit: string;
    levelL1: string;
    levelL2: string;
    levelL3: string;
    levelL4: string;
    levelL5: string;
    levelL6: string;
    levelL7: string;
    boardTitle: string;
    filterAll: string;
    createTask: string;
    createCancel: string;
    pendingBadge: string;
    formTitle: string;
    formDesc: string;
    formCategory: string;
    formPoints: string;
    formMaxClaimants: string;
    formTags: string;
    fldTitle: string;
    fldDesc: string;
    fldCategory: string;
    fldPoints: string;
    fldMaxClaimants: string;
    fldTags: string;
    titlePlaceholder: string;
    descPlaceholder: string;
    tagsPlaceholder: string;
    creating: string;
    reviewPass: string;
    reviewReject: string;
    emptyTasks: string;
    emptyTasksText: string;
    claimFull: string;
    claiming: string;
    claimTask: string;
    publish: string;
    draft: string;
    publishedAt: string;
    catGeneral: string;
    catDocumentation: string;
    catEvent: string;
    catMaintenance: string;
    catMentoring: string;
    catOther: string;
    statusClaimed: string;
    statusCompleted: string;
    statusCancelled: string;
    taskHash: string;
    reviewNote: string;
    cancel: string;
    loadFailed: string;
    actionFailed: string;
    createFailed: string;
  },
  toolsDevCenter: {
    heroLabel: string;
    heroTitle: string;
    heroDesc1: string;
    heroDesc2: string;
    tabDocs: string;
    tabRegistry: string;
    rootBadge: string;
  },
  toolsResource: {
    heroLabel: string;
    pageTitle: string;
    pageTitleEn: string;
    desc1: string;
    desc2: string;
    back: string;
    allResources: string;
    allResourcesEn: string;
    sortCount: string;
    sortLatest: string;
    sortPopular: string;
    submit: string;
    empty: string;
    submitHere: string;
    successTitle: string;
    successDesc: string;
    close: string;
    fldTitle: string;
    phTitle: string;
    fldUrl: string;
    fldDesc: string;
    phDesc: string;
    fldType: string;
    fldAttach: string;
    uploaded: string;
    remove: string;
    uploadBtn: string;
    uploading: string;
    fldTechTags: string;
    submitting: string;
    submitReview: string;
    pendingHint: string;
    resTypeAll: string;
    resTypeArticle: string;
    resTypeVideo: string;
    resTypeCourse: string;
    resTypeTool: string;
    resTypeBook: string;
    resTypeOther: string;
    uploadFailed: string;
    networkError: string;
    submitFailed: string;
    allLabel: string;
    viewsCount: string;
  },
  toolsExam: {
    heroTitle: string;
    heroTitleEn: string;
    heroDesc1: string;
    heroDesc2: string;
    back: string;
    backToList: string;
    backToTools: string;
    tabOngoing: string;
    tabUpcoming: string;
    tabEnded: string;
    tabOngoingEn: string;
    tabUpcomingEn: string;
    tabEndedEn: string;
    listOngoing: string;
    listUpcoming: string;
    listEnded: string;
    listOngoingEn: string;
    listUpcomingEn: string;
    listEndedEn: string;
    countOngoing: string;
    countUpcoming: string;
    countEnded: string;
    emptyOngoing: string;
    emptyUpcoming: string;
    emptyEnded: string;
    retry: string;
    enterExam: string;
    durUnlimited: string;
    durMin: string;
    durHm: string;
    durH: string;
    badgeOngoing: string;
    badgeUpcoming: string;
    badgeEnded: string;
    closeList: string;
    questionNav: string;
    resultLine: string;
    notFound: string;
    listTitle: string;
    qNumber: string;
    typeSingle: string;
    typeMultiple: string;
    typeJudge: string;
    typeCoding: string;
    codePlaceholder: string;
    scoreLabel: string;
    pendingReview: string;
    submitted: string;
    submitAnswer: string;
    submitLogin: string;
    prev: string;
    next: string;
    submit: string;
    submitting: string;
    timeUp: string;
    correct: string;
    wrong: string;
    scoreUnit: string;
    loading: string;
  },
  toolsAdmin: {
    tabResources: string;
    tabExams: string;
    tabTasks: string;
    loadFailed: string;
    networkError: string;
    loading: string;
    approve: string;
    reject: string;
    examTitleEmpty: string;
    examTimeRequired: string;
    examDurationRange: string;
    examCreateFailed: string;
    examCreated: string;
    examNetworkRetry: string;
    examCount: string;
    newExam: string;
    noExams: string;
    noExamsDesc: string;
    colExam: string;
    colStatus: string;
    colTime: string;
    colDuration: string;
    colCreated: string;
    statusPublished: string;
    statusDraft: string;
    statusEnded: string;
    statusClosed: string;
    durationUnlimited: string;
    examModalTitle: string;
    fieldTitle: string;
    fieldDesc: string;
    examDescPlaceholder: string;
    fieldStartTime: string;
    fieldEndTime: string;
    fieldDuration: string;
    fieldTechTags: string;
    examTitlePlaceholder: string;
    cancel: string;
    creating: string;
    createExamBtn: string;
    resourcePending: string;
    noPending: string;
    noPendingDesc: string;
    attachment: string;
    reviewNotePlaceholder: string;
    actionFailed: string;
    taskPublishFailed: string;
    taskCloseConfirm: string;
    taskCloseFailed: string;
    taskDeletePrompt: string;
    taskDeleteFailed: string;
    pendingClaims: string;
    taskCount: string;
    noTasks: string;
    noTasksDesc: string;
    colTask: string;
    colCategory: string;
    colPoints: string;
    colClaims: string;
    colAction: string;
    pointsUnit: string;
    taskClaimCount: string;
    publish: string;
    close: string;
    delete: string;
    docList: string;
    noDoc: string;
    saveFailed: string;
    selectDoc: string;
    selectDocDesc: string;
    source: string;
    preview: string;
    edit: string;
    saving: string;
    saveBtn: string;
    docContentPlaceholder: string;
    categoryUiPrimitives: string;
    categoryFeedback: string;
    categoryOverlays: string;
    categoryLayout: string;
    registryName: string;
    registryHeroStats: string;
    registryHeroTagline: string;
    loadingComponents: string;
    categoryLabel: string;
    statusLabel: string;
    all: string;
    reset: string;
    componentList: string;
    noMatch: string;
    selectComponent: string;
    selectComponentDesc: string;
    retreat: string;
    advance: string;
    variantPreview: string;
    editAllVariants: string;
    usageGuide: string;
    useCases: string;
    antiPatterns: string;
    noRecord: string;
    editVariants: string;
    enabledSuffix: string;
    closeBtn: string;
    confirmAction: string;
    confirmPrompt: string;
    confirm: string;
    storeLoadFailed: string;
    storeUnknownError: string;
    storeToggleFailed: string;
    storeUpdateStatusFailed: string;
    storePresetFailed: string;
    storeUpdateGuideFailed: string;
    storeCreateFailed: string;
    storeDeleteFailed: string;
    visibilityLabel: string;
    visibilityOpen: string;
    visibilityClosed: string;
    statusDoneAutoOpen: string;
    slugInvalidHint: string;
  },
  workbench: {
    wbTitle: string;
    wbSubtitle: string;
    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    onlineLabel: string;
    todayTasks: string;
    overdue: string;
    dueToday: string;
    noTasks: string;
    addTask: string;
    taskPlaceholder: string;
    clearDone: string;
    clearAll: string;
    confirmClearTasks: string;
    pomodoro: string;
    focusPhase: string;
    shortBreakPhase: string;
    longBreakPhase: string;
    roundN: string;
    startFocus: string;
    pause: string;
    resume: string;
    reset: string;
    soundLabel: string;
    soundRain: string;
    soundWaves: string;
    soundFire: string;
    soundWhite: string;
    silence: string;
    uploadMusic: string;
    myMusic: string;
    nextPhaseIn: string;
    examCountdown: string;
    daysLater: string;
    hoursLater: string;
    minutesLater: string;
    ended: string;
    noExam: string;
    quickNotes: string;
    notePlaceholder: string;
    allTools: string;
    toolsHint: string;
    heatmapTitle: string;
    githubHeatmap: string;
    heatmapNoData: string;
    heatmapBind: string;
    heatmapContributions: string;
    heatmapStreak: string;
    heatmapLess: string;
    heatmapMore: string;
    heatmapMax: string;
    heatmapStale: string;
    heatmapUsernamePlaceholder: string;
    apiUsageTitle: string;
    apiToday: string;
    apiErrors: string;
    apiLatency: string;
    apiNoData: string;
    loginRequired: string;
    newChat: string;
    noConversations: string;
    loading: string;
    chatPlaceholder: string;
    chatIntro: string;
    requestFailed: string;
    networkError: string;
    llmUsageTitle: string;
    llmTodayCalls: string;
    llmTodayTokens: string;
    llmLatencyMs: string;
    llmTotal: string;
    llmModels: string;
    llmSettings: string;
    llmProvider: string;
    llmApiKey: string;
    llmBaseUrl: string;
    llmModel: string;
    llmSave: string;
    llmSaved: string;
    llmMaskedHint: string;
    llmNoData: string;
    llmUsageEntry: string;
    resetLayout: string;
    confirmResetLayout: string;
    dragHint: string;
    schemaWidget: string;
    schemaEmpty: string;
    schemaEmptyHint: string;
    schemaFormTitle: string;
    schemaFormTitlePlaceholder: string;
    schemaFormTitleRequired: string;
    schemaFormTypeLabel: string;
    schemaFormDataLabel: string;
    schemaFormDataLocal: string;
    schemaFormDataApi: string;
    schemaFormKeyPlaceholder: string;
    schemaFormUrlPlaceholder: string;
    schemaFormFieldsPlaceholder: string;
    schemaFormSizeHint: string;
    schemaFormAdd: string;
    schemaFormAdded: string;
    schemaType_count: string;
    schemaType_list: string;
    schemaType_progress: string;
    schemaType_countdown: string;
    schemaType_note: string;
    schemaType_link: string;
  }
}

export const zhCN: ToolsMessages = {
  tools: {
    tabAvailable: '可用',
    tabDeveloping: '开发中',
    tabAdmin: '管理 / Admin',
    heroTitle: '工具集',
    heroTitleEn: '/ Tools',
    heroDesc1: '考试评测 · 资源分享 · 任务协作',
    heroDesc2: '。每一个工具，都让社团更近一步',
    sectionTitleAvailable: '可用工具',
    sectionTitleDeveloping: '开发中',
    sectionDescAvailable: '// 当前可用的工具，点击卡片进入',
    sectionDescDeveloping: '// 正在规划与开发中，敬请期待',
    enter: '进入 →',
    statusAvailable: '可用',
    statusDeveloping: '开发中',
    communityTitle: '社区',
    communityEn: 'Community',
    communityDesc: '社团交流、问答与内容分享',
    examTitle: '内网考试',
    examEn: 'Exam System',
    examDesc: '选择题在线评测，自动判分与排名。支持算法周赛和项目组考核。',
    resourceTitle: '学习资源站',
    resourceEn: 'Resource Hub',
    resourceDesc: '按技术领域分类浏览，用户提交资源链接，管理员审核后公开。',
    taskTitle: '任务发布板',
    taskEn: 'Quest Board',
    taskDesc: '管理员发布任务，成员领取并完成，获得积分与徽章奖励。',
    devCenterTitle: '开发者中心',
    devCenterEn: 'Dev Center',
    devCenterDesc: '开发文档浏览与编辑，组件注册表盘点与迁移进度看板。管理员可访问。',
    chatTitle: '聊天交流',
    chatEn: 'Chat',
    chatDesc: '站内实时消息，支持群组和一对一。待用户量增长后启动。',
  },
  toolsTask: {
    tabBoard: '任务板',
    tabMyClaims: '我的认领',
    tabPoints: '积分',
    heroLabel: 'TASK BOARD',
    heroTitle1: '任务',
    heroTitle2: '发布板',
    heroDesc1: '协会任务板 —— 类似冒险者公会。',
    heroDesc2: '领取任务、完成挑战、获得积分奖励。',
    back: '返回',
    pointsSystem: '积分系统',
    notLoggedIn: '未登录',
    loginToViewPoints: '请先登录查看积分。',
    loginToViewClaims: '请先登录查看认领记录。',
    noClaims: '你还没有认领过任务。',
    pointsUnit: '分',
    levelL1: '新人学徒',
    levelL2: '初级成员',
    levelL3: '活跃成员',
    levelL4: '资深成员',
    levelL5: '核心骨干',
    levelL6: '技术专家',
    levelL7: '协会元老',
    boardTitle: '任务板',
    filterAll: '全部',
    createTask: '创建任务',
    createCancel: '取消 / Cancel',
    pendingBadge: '待审核:',
    formTitle: '创建任务',
    formDesc: '填写任务信息，提交后由管理员审核。',
    formCategory: '分类',
    formPoints: '积分',
    formMaxClaimants: '最大认领人数',
    formTags: '标签',
    fldTitle: '任务标题',
    fldDesc: '任务描述',
    fldCategory: '分类',
    fldPoints: '积分奖励',
    fldMaxClaimants: '认领上限',
    fldTags: '标签（逗号分隔）',
    titlePlaceholder: '任务标题...',
    descPlaceholder: '任务描述...',
    tagsPlaceholder: '用逗号分隔，如：文档, 紧急',
    creating: '创建中...',
    reviewPass: '✓ 通过',
    reviewReject: '✗ 拒绝',
    emptyTasks: '[No Quest]',
    emptyTasksText: '暂无可认领的任务。',
    claimFull: '已满',
    claiming: '认领中...',
    claimTask: '认领任务',
    publish: '发布',
    draft: '草稿',
    publishedAt: '发布于 {date}',
    catGeneral: '通用',
    catDocumentation: '文档',
    catEvent: '活动',
    catMaintenance: '维护',
    catMentoring: '带新',
    catOther: '其他',
    statusClaimed: '已认领',
    statusCompleted: '已完成',
    statusCancelled: '已取消',
    taskHash: '任务 #',
    reviewNote: '审核备注:',
    cancel: '取消',
    loadFailed: '加载失败',
    actionFailed: '操作失败',
    createFailed: '创建失败',
  },
  toolsDevCenter: {
    heroLabel: '开发者中心',
    heroTitle: '开发者中心',
    heroDesc1: '开发文档 · 组件注册表',
    heroDesc2: '。项目文档与组件管理的统一入口',
    tabDocs: '开发文档 / Docs',
    tabRegistry: '组件注册表 / Registry',
    rootBadge: 'ROOT',
  },
  toolsResource: {
    heroLabel: 'RESOURCE',
    pageTitle: '学习资源站',
    pageTitleEn: 'Resource Hub',
    desc1: '发现优质技术资源',
    desc2: '。社区共建知识库，每个人都是贡献者',
    back: '返回',
    allResources: '全部资源',
    allResourcesEn: 'All Resources',
    sortCount: '// {count} 条资源 · 按{sort}排序',
    sortLatest: '最新',
    sortPopular: '热门',
    submit: '提交资源',
    empty: '暂无资源。',
    submitHere: '提交资源 →',
    successTitle: '提交成功！',
    successDesc: '资源已提交，管理员审核通过后将展示在资源中心。',
    close: '关闭',
    fldTitle: '标题 *',
    phTitle: '资源标题',
    fldUrl: '链接 *',
    fldDesc: '描述',
    phDesc: '简短描述这个资源……',
    fldType: '资源类型',
    fldAttach: '附件（可选）',
    uploaded: '已上传 ✓',
    remove: '移除',
    uploadBtn: '上传文件……',
    uploading: '上传中……',
    fldTechTags: '技术标签',
    submitting: '提交中……',
    submitReview: '提交审核',
    pendingHint: '提交后需管理员审核，请耐心等待。',
    resTypeAll: '全部',
    resTypeArticle: '文章',
    resTypeVideo: '视频',
    resTypeCourse: '课程',
    resTypeTool: '工具',
    resTypeBook: '书籍',
    resTypeOther: '其他',
    uploadFailed: '上传失败',
    networkError: '网络错误',
    submitFailed: '提交失败',
    allLabel: '全部',
    viewsCount: '{count} 次浏览',
  },
  toolsExam: {
    heroTitle: '考试',
    heroTitleEn: '/ Exam',
    heroDesc1: '在线选择题评测，',
    heroDesc2: '自动判分与排名',
    back: '返回',
    backToList: '返回考试列表',
    backToTools: '返回工具',
    tabOngoing: '进行中',
    tabUpcoming: '即将开始',
    tabEnded: '已结束',
    tabOngoingEn: 'Ongoing',
    tabUpcomingEn: 'Upcoming',
    tabEndedEn: 'Ended',
    listOngoing: '进行中',
    listUpcoming: '即将开始',
    listEnded: '已结束',
    listOngoingEn: 'Ongoing',
    listUpcomingEn: 'Upcoming',
    listEndedEn: 'Ended',
    countOngoing: '// 当前可参与的考试 — {count} 场',
    countUpcoming: '// 即将开启的考试 — {count} 场',
    countEnded: '// 已归档的考试 — {count} 场',
    emptyOngoing: '暂无进行中的考试。',
    emptyUpcoming: '暂无即将开始的考试。',
    emptyEnded: '暂无已结束的考试。',
    retry: '重试',
    enterExam: '进入考试 →',
    durUnlimited: '不限时',
    durMin: '{min} 分钟',
    durHm: '{h}h {m}m',
    durH: '{h}h',
    badgeOngoing: '进行中',
    badgeUpcoming: '即将开始',
    badgeEnded: '已结束',
    closeList: '关闭题目列表',
    questionNav: '题目 {current}/{total}',
    resultLine: '{correct}/{total} 正确 · {score}/{max} 分',
    notFound: '考试不存在或已下架。',
    listTitle: '题目列表',
    qNumber: '题目 {num}',
    typeSingle: '单选',
    typeMultiple: '多选',
    typeJudge: '判断',
    typeCoding: '编程题',
    codePlaceholder: '在此输入你的代码...',
    scoreLabel: '得分',
    pendingReview: '待批改',
    submitted: '已提交',
    submitAnswer: '提交答案',
    submitLogin: '登录后提交',
    prev: '上一题',
    next: '下一题',
    submit: '提交试卷',
    submitting: '提交中...',
    timeUp: '时间到，自动提交',
    correct: '正确',
    wrong: '错误',
    scoreUnit: '分',
    loading: '加载中...',
  },
  toolsAdmin: {
    tabResources: '[ 资源审核 / Review ]',
    tabExams: '[ 考试管理 / Exams ]',
    tabTasks: '[ 任务管理 / Tasks ]',
    loadFailed: '加载失败',
    networkError: '网络错误',
    loading: '加载中...',
    approve: '通过',
    reject: '拒绝',
    examTitleEmpty: '标题不能为空',
    examTimeRequired: '开始时间和结束时间不能为空',
    examDurationRange: '考试时长需在 1-1440 分钟之间',
    examCreateFailed: '创建失败',
    examCreated: '考试已创建（草稿状态）',
    examNetworkRetry: '网络错误，请稍后再试',
    examCount: '共 {count} 场考试',
    newExam: '+ 新建考试',
    noExams: '[ 暂无考试 / No Exams ]',
    noExamsDesc: '尚未创建任何考试。',
    colExam: '考试 / Exam',
    colStatus: '状态 / Status',
    colTime: '时间 / Time',
    colDuration: '时长 / Duration',
    colCreated: '创建 / Created',
    statusPublished: '已发布',
    statusDraft: '草稿',
    statusEnded: '已结束',
    statusClosed: '已关闭',
    durationUnlimited: '不限',
    examModalTitle: '新建考试 / New Exam',
    fieldTitle: '标题',
    fieldDesc: '描述',
    examDescPlaceholder: '考试简介（选填）',
    fieldStartTime: '开始时间',
    fieldEndTime: '结束时间',
    fieldDuration: '时长（分钟）',
    fieldTechTags: '技术标签',
    examTitlePlaceholder: '例如：2026 春季算法周赛',
    cancel: '取消',
    creating: '创建中...',
    createExamBtn: '创建考试 →',
    resourcePending: '待审核 {count} 条',
    noPending: '[ 暂无待审核 / No Pending ]',
    noPendingDesc: '所有资源已审核完毕。',
    attachment: '附件',
    reviewNotePlaceholder: '审核备注（可选）',
    actionFailed: '操作失败',
    taskPublishFailed: '发布失败',
    taskCloseConfirm: '确认关闭该任务？关闭后用户将无法认领。',
    taskCloseFailed: '关闭失败',
    taskDeletePrompt: '删除任务需输入登录密码以确认：',
    taskDeleteFailed: '删除失败',
    pendingClaims: '待审核认领 {count} 条',
    taskCount: '共 {count} 个任务',
    noTasks: '[ 暂无任务 / No Tasks ]',
    noTasksDesc: '尚未创建任何任务。',
    colTask: '任务 / Task',
    colCategory: '分类 / Category',
    colPoints: '积分 / Points',
    colClaims: '认领 / Claims',
    colAction: '操作 / Action',
    pointsUnit: '{count} 分',
    taskClaimCount: '认领 {count}/{max}',
    publish: '发布',
    close: '关闭',
    delete: '删除',
    docList: '文档列表',
    noDoc: '无文档',
    saveFailed: '保存失败',
    selectDoc: '[ 选择文档 / Select a doc ]',
    selectDocDesc: '从左侧列表选择一份文档查看。',
    source: '源码',
    preview: '预览',
    edit: '编辑',
    saving: '保存中...',
    saveBtn: '保存 →',
    docContentPlaceholder: '输入文档内容...',
    categoryUiPrimitives: '基础控件',
    categoryFeedback: '反馈组件',
    categoryOverlays: '弹窗组件',
    categoryLayout: '布局组件',
    registryName: '组件注册表',
    registryHeroStats: '{total} 个组件 · {done} 已完成 · {progress}%',
    registryHeroTagline: '。盘点、预览、追踪重构进度',
    loadingComponents: '加载组件数据...',
    categoryLabel: '分类',
    statusLabel: '状态',
    all: '全部',
    reset: '重置',
    componentList: '组件列表',
    noMatch: '无匹配组件',
    selectComponent: '选择一个组件',
    selectComponentDesc: '从左侧列表选择组件，查看变体预览与使用规范',
    retreat: '← 回退',
    advance: '推进 →',
    variantPreview: '变体预览 / Variant Preview · Default State',
    editAllVariants: '编辑全部变体（27 格） / Edit All Variants',
    usageGuide: '使用规范 / Usage Guide',
    useCases: '适用场景',
    antiPatterns: '反模式',
    noRecord: '尚无记录',
    editVariants: '编辑变体 / Edit Variants',
    enabledSuffix: '已启用',
    closeBtn: '关闭 / Close',
    confirmAction: '[ 确认操作 ]',
    confirmPrompt: '确定要执行此操作吗？',
    confirm: '确认',
    storeLoadFailed: '加载失败',
    storeUnknownError: '未知错误',
    storeToggleFailed: '切换变体失败',
    storeUpdateStatusFailed: '更新状态失败',
    storePresetFailed: '应用变体预设失败',
    storeUpdateGuideFailed: '更新规范失败',
    storeCreateFailed: '创建失败',
    storeDeleteFailed: '删除失败',
    visibilityLabel: '可见性',
    visibilityOpen: '已开放（对所有角色可见）',
    visibilityClosed: '未开放',
    statusDoneAutoOpen: '迁移完成 → 已自动开放可见性',
    slugInvalidHint: 'slug 必须是已知的可见性模块 key',
  },
  workbench: {
    wbTitle: '工作台',
    wbSubtitle: '你的个人学习工作中心',
    greetingMorning: '早上好',
    greetingAfternoon: '下午好',
    greetingEvening: '晚上好',
    onlineLabel: '本次在线',
    todayTasks: '今日任务',
    overdue: '已逾期',
    dueToday: '今天到期',
    noTasks: '暂无待办，享受此刻',
    addTask: '添加',
    taskPlaceholder: '今天要做什么…',
    clearDone: '清除已完成',
    clearAll: '清空全部',
    confirmClearTasks: '确定清空全部待办吗？此操作不可恢复。',
    pomodoro: '番茄钟',
    focusPhase: '专注',
    shortBreakPhase: '短休',
    longBreakPhase: '长休',
    roundN: '第 {n} 轮',
    startFocus: '开始专注',
    pause: '暂停',
    resume: '继续',
    reset: '重置',
    soundLabel: '阶段音',
    soundRain: '雨声',
    soundWaves: '海浪',
    soundFire: '篝火',
    soundWhite: '白噪音',
    silence: '静音',
    uploadMusic: '上传音乐',
    myMusic: '我的音乐',
    nextPhaseIn: '下一阶段',
    examCountdown: '考试倒计时',
    daysLater: '{n} 天后',
    hoursLater: '{n} 小时后',
    minutesLater: '{n} 分钟后',
    ended: '已结束',
    noExam: '暂无考试安排',
    quickNotes: '快捷便签',
    notePlaceholder: '随手记点什么…',
    allTools: '全部工具',
    toolsHint: '原有工具入口，收编于此',
    heatmapTitle: 'GitHub · {year}',
    githubHeatmap: 'GitHub 热力图',
    heatmapNoData: '暂无数据，先绑定 GitHub 用户名试试',
    heatmapBind: '绑定',
    heatmapContributions: 'contributions',
    heatmapStreak: 'streak',
    heatmapLess: 'less',
    heatmapMore: 'more',
    heatmapMax: 'max',
    heatmapStale: 'stale',
    heatmapUsernamePlaceholder: 'GitHub 用户名',
    apiUsageTitle: 'API 调用 · 近 {days} 天',
    apiToday: '今日',
    apiErrors: '错误',
    apiLatency: '延迟',
    apiNoData: '暂无数据，先调用几个接口试试',
    loginRequired: '请先登录后使用',
    newChat: '新对话',
    noConversations: '暂无历史会话',
    loading: '加载中…',
    chatPlaceholder: '输入问题，Enter 发送',
    chatIntro: '问我学习问题、查看薄弱点、查考试倒计时、找资源、看 API 统计……我会调用工具获取你的真实数据。',
    requestFailed: '（请求失败，请稍后重试）',
    networkError: '（网络异常：{msg}）',
    llmUsageTitle: 'LLM 用量 · 近 {days} 天',
    llmTodayCalls: '今日调用',
    llmTodayTokens: '今日 Tokens',
    llmLatencyMs: '延迟',
    llmTotal: '总计',
    llmModels: '模型分布',
    llmSettings: 'LLM 设置',
    llmProvider: '服务商',
    llmApiKey: 'API Key',
    llmBaseUrl: 'Base URL（可选）',
    llmModel: '模型',
    llmSave: '保存',
    llmSaved: '已保存',
    llmMaskedHint: '当前 Key：{masked}',
    llmNoData: '暂无用量数据，先和学习助手聊几句',
    llmUsageEntry: '用量与设置',
    resetLayout: '重置布局',
    confirmResetLayout: '确定恢复默认布局吗？将清除所有排序与尺寸自定义。',
    dragHint: '拖拽卡片可排序 · 点击规格键改积木大小（如 1×1 / 2×2 / 2×3）',
    schemaWidget: 'Schema 卡',
    schemaEmpty: '暂无数据',
    schemaEmptyHint: '暂无 Schema 卡，可在布局设置中添加',
    schemaFormTitle: '添加 Schema 卡',
    schemaFormTitlePlaceholder: '卡片标题，如：剩余课程',
    schemaFormTitleRequired: '标题不能为空',
    schemaFormTypeLabel: '类型',
    schemaFormDataLabel: '数据源',
    schemaFormDataLocal: '本地数据',
    schemaFormDataApi: '接口数据',
    schemaFormKeyPlaceholder: '存储 key（自动补 wb_）',
    schemaFormUrlPlaceholder: '/api/tools/...',
    schemaFormFieldsPlaceholder: '字段 key，逗号分隔（如 title,due,status）',
    schemaFormSizeHint: '可选尺寸：',
    schemaFormAdd: '添加',
    schemaFormAdded: '已添加',
    schemaType_count: '计数',
    schemaType_list: '列表',
    schemaType_progress: '进度',
    schemaType_countdown: '倒计时',
    schemaType_note: '便签',
    schemaType_link: '链接',
  }
};

export const en: ToolsMessages = {
  tools: {
    tabAvailable: 'Available',
    tabDeveloping: 'In Development',
    tabAdmin: 'Admin / 管理',
    heroTitle: 'Toolset',
    heroTitleEn: '/ Tools',
    heroDesc1: 'Exams · Resources · Tasks',
    heroDesc2: '. Every tool brings the community one step closer',
    sectionTitleAvailable: 'Available Tools',
    sectionTitleDeveloping: 'In Development',
    sectionDescAvailable: '// Tools available now — click a card to open',
    sectionDescDeveloping: '// In planning and development, stay tuned',
    enter: 'Enter →',
    statusAvailable: 'Available',
    statusDeveloping: 'In Development',
    communityTitle: 'Community',
    communityEn: 'Community',
    communityDesc: 'Discussion, Q&A and community sharing',
    examTitle: 'Exam System',
    examEn: 'Exam System',
    examDesc: 'Online multiple-choice assessment with auto-grading and leaderboards. For algorithm contests and project-team assessments.',
    resourceTitle: 'Resource Hub',
    resourceEn: 'Resource Hub',
    resourceDesc: 'Browse by tech domain. Users submit resource links, admins review and publish.',
    taskTitle: 'Quest Board',
    taskEn: 'Quest Board',
    taskDesc: 'Admins publish tasks; members claim and complete them for points and badges.',
    devCenterTitle: 'Dev Center',
    devCenterEn: 'Dev Center',
    devCenterDesc: 'Browse and edit dev docs, component registry inventory, and migration dashboard. Admin access.',
    chatTitle: 'Chat',
    chatEn: 'Chat',
    chatDesc: 'Real-time in-site messaging with groups and 1:1. Launch planned as the user base grows.',
  },
  toolsTask: {
    tabBoard: 'Task Board',
    tabMyClaims: 'My Claims',
    tabPoints: 'Points',
    heroLabel: 'TASK BOARD',
    heroTitle1: 'Task',
    heroTitle2: 'Board',
    heroDesc1: 'Association task board — like an adventurer guild.',
    heroDesc2: 'Claim tasks, complete challenges, earn reward points.',
    back: 'Back',
    pointsSystem: 'Points System',
    notLoggedIn: 'Not logged in',
    loginToViewPoints: 'Please sign in to view your points.',
    loginToViewClaims: 'Please sign in to view your claimed tasks.',
    noClaims: 'You have not claimed any tasks yet.',
    pointsUnit: 'pts',
    levelL1: 'Novice Apprentice',
    levelL2: 'Junior Member',
    levelL3: 'Active Member',
    levelL4: 'Senior Member',
    levelL5: 'Core Backbone',
    levelL6: 'Tech Expert',
    levelL7: 'Association Elder',
    boardTitle: 'Task Board',
    filterAll: 'All',
    createTask: 'Create Task',
    createCancel: 'Cancel / Create',
    pendingBadge: 'Pending review:',
    formTitle: 'Create Task',
    formDesc: 'Fill in the task details; submit for admin review.',
    formCategory: 'Category',
    formPoints: 'Points',
    formMaxClaimants: 'Max claimants',
    formTags: 'Tags',
    fldTitle: 'Task Title',
    fldDesc: 'Task Description',
    fldCategory: 'Category',
    fldPoints: 'Point Reward',
    fldMaxClaimants: 'Max Claimants',
    fldTags: 'Tags (comma-separated)',
    titlePlaceholder: 'Task title...',
    descPlaceholder: 'Task description...',
    tagsPlaceholder: 'Comma-separated, e.g. docs, urgent',
    creating: 'Creating...',
    reviewPass: '✓ Pass',
    reviewReject: '✗ Reject',
    emptyTasks: '[No Quest]',
    emptyTasksText: 'No claimable tasks right now.',
    claimFull: 'Full',
    claiming: 'Claiming...',
    claimTask: 'Claim Task',
    publish: 'Publish',
    draft: 'Draft',
    publishedAt: 'Published {date}',
    catGeneral: 'General',
    catDocumentation: 'Docs',
    catEvent: 'Event',
    catMaintenance: 'Maintenance',
    catMentoring: 'Mentoring',
    catOther: 'Other',
    statusClaimed: 'Claimed',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    taskHash: 'Task #',
    reviewNote: 'Review note:',
    cancel: 'Cancel',
    loadFailed: 'Failed to load',
    actionFailed: 'Action failed',
    createFailed: 'Failed to create',
  },
  toolsDevCenter: {
    heroLabel: 'Dev Center',
    heroTitle: 'Dev Center',
    heroDesc1: 'Dev Docs · Component Registry',
    heroDesc2: '. Unified entry for project docs and component management',
    tabDocs: 'Dev Docs / 文档',
    tabRegistry: 'Component Registry / 注册表',
    rootBadge: 'ROOT',
  },
  toolsResource: {
    heroLabel: 'RESOURCE',
    pageTitle: 'Resource Hub',
    pageTitleEn: 'Resource Hub',
    desc1: 'Discover quality tech resources',
    desc2: '. A community-built knowledge base — everyone is a contributor',
    back: 'Back',
    allResources: 'All Resources',
    allResourcesEn: 'All Resources',
    sortCount: '// {count} resources · sorted by {sort}',
    sortLatest: 'Latest',
    sortPopular: 'Popular',
    submit: 'Submit Resource',
    empty: 'No resources yet.',
    submitHere: 'Submit a resource →',
    successTitle: 'Submitted!',
    successDesc: 'Your resource was submitted and will appear once approved by an admin.',
    close: 'Close',
    fldTitle: 'Title *',
    phTitle: 'Resource title',
    fldUrl: 'URL *',
    fldDesc: 'Description',
    phDesc: 'Briefly describe this resource……',
    fldType: 'Resource type',
    fldAttach: 'Attachment (optional)',
    uploaded: 'Uploaded ✓',
    remove: 'Remove',
    uploadBtn: 'Upload file……',
    uploading: 'Uploading……',
    fldTechTags: 'Tech Tags',
    submitting: 'Submitting……',
    submitReview: 'Submit for review',
    pendingHint: 'Submitted resources require admin review. Please wait.',
    resTypeAll: 'All',
    resTypeArticle: 'Article',
    resTypeVideo: 'Video',
    resTypeCourse: 'Course',
    resTypeTool: 'Tool',
    resTypeBook: 'Book',
    resTypeOther: 'Other',
    uploadFailed: 'Upload failed',
    networkError: 'Network error',
    submitFailed: 'Submit failed',
    allLabel: 'All',
    viewsCount: '{count} views',
  },
  toolsExam: {
    heroTitle: 'Exam',
    heroTitleEn: '/ Exam',
    heroDesc1: 'Online multiple-choice assessment,',
    heroDesc2: 'auto-grading with leaderboard',
    back: 'Back',
    backToList: 'Back to Exams',
    backToTools: 'Back to Tools',
    tabOngoing: 'Ongoing',
    tabUpcoming: 'Upcoming',
    tabEnded: 'Ended',
    tabOngoingEn: 'Ongoing',
    tabUpcomingEn: 'Upcoming',
    tabEndedEn: 'Ended',
    listOngoing: 'Ongoing',
    listUpcoming: 'Upcoming',
    listEnded: 'Ended',
    listOngoingEn: 'Ongoing',
    listUpcomingEn: 'Upcoming',
    listEndedEn: 'Ended',
    countOngoing: '// Exams open now — {count}',
    countUpcoming: '// Upcoming exams — {count}',
    countEnded: '// Archived exams — {count}',
    emptyOngoing: 'No ongoing exams.',
    emptyUpcoming: 'No upcoming exams.',
    emptyEnded: 'No ended exams.',
    retry: 'Retry',
    enterExam: 'Enter Exam →',
    durUnlimited: 'No limit',
    durMin: '{min} min',
    durHm: '{h}h {m}m',
    durH: '{h}h',
    badgeOngoing: 'Ongoing',
    badgeUpcoming: 'Upcoming',
    badgeEnded: 'Ended',
    closeList: 'Close question list',
    questionNav: 'Question {current}/{total}',
    resultLine: '{correct}/{total} correct · {score}/{max} pts',
    notFound: 'Exam not found or removed.',
    listTitle: 'Question List',
    qNumber: 'Question {num}',
    typeSingle: 'Single',
    typeMultiple: 'Multiple',
    typeJudge: 'Judge',
    typeCoding: 'Coding',
    codePlaceholder: 'Type your code here...',
    scoreLabel: 'Score',
    pendingReview: 'Pending review',
    submitted: 'Submitted',
    submitAnswer: 'Submit Answer',
    submitLogin: 'Sign in to submit',
    prev: 'Prev',
    next: 'Next',
    submit: 'Submit',
    submitting: 'Submitting...',
    timeUp: 'Time up — auto-submitted',
    correct: 'Correct',
    wrong: 'Wrong',
    scoreUnit: 'pts',
    loading: 'Loading...',
  },
  toolsAdmin: {
    tabResources: '[ 资源审核 / Review ]',
    tabExams: '[ 考试管理 / Exams ]',
    tabTasks: '[ 任务管理 / Tasks ]',
    loadFailed: 'Load failed',
    networkError: 'Network error',
    loading: 'Loading...',
    approve: 'Approve',
    reject: 'Reject',
    examTitleEmpty: 'Title cannot be empty',
    examTimeRequired: 'Start and end time are required',
    examDurationRange: 'Duration must be between 1-1440 minutes',
    examCreateFailed: 'Create failed',
    examCreated: 'Exam created (draft)',
    examNetworkRetry: 'Network error, please try again later',
    examCount: '{count} exams',
    newExam: '+ New Exam',
    noExams: '[ 暂无考试 / No Exams ]',
    noExamsDesc: 'No exams created yet.',
    colExam: '考试 / Exam',
    colStatus: '状态 / Status',
    colTime: '时间 / Time',
    colDuration: '时长 / Duration',
    colCreated: '创建 / Created',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    statusEnded: 'Ended',
    statusClosed: 'Closed',
    durationUnlimited: 'Unlimited',
    examModalTitle: '新建考试 / New Exam',
    fieldTitle: 'Title',
    fieldDesc: 'Description',
    examDescPlaceholder: 'Exam description (optional)',
    fieldStartTime: 'Start time',
    fieldEndTime: 'End time',
    fieldDuration: 'Duration (minutes)',
    fieldTechTags: 'Tech tags',
    examTitlePlaceholder: 'e.g. 2026 Spring Algorithm Contest',
    cancel: 'Cancel',
    creating: 'Creating...',
    createExamBtn: 'Create exam →',
    resourcePending: '{count} pending',
    noPending: '[ 暂无待审核 / No Pending ]',
    noPendingDesc: 'All resources reviewed.',
    attachment: 'Attachment',
    reviewNotePlaceholder: 'Review note (optional)',
    actionFailed: 'Action failed',
    taskPublishFailed: 'Publish failed',
    taskCloseConfirm: 'Confirm close this task? Users will no longer be able to claim it.',
    taskCloseFailed: 'Close failed',
    taskDeletePrompt: 'Enter login password to confirm task deletion:',
    taskDeleteFailed: 'Delete failed',
    pendingClaims: '{count} pending claims',
    taskCount: '{count} tasks',
    noTasks: '[ 暂无任务 / No Tasks ]',
    noTasksDesc: 'No tasks created yet.',
    colTask: '任务 / Task',
    colCategory: '分类 / Category',
    colPoints: '积分 / Points',
    colClaims: '认领 / Claims',
    colAction: '操作 / Action',
    pointsUnit: '{count} pts',
    taskClaimCount: 'Claims {count}/{max}',
    publish: 'Publish',
    close: 'Close',
    delete: 'Delete',
    docList: 'Documents',
    noDoc: 'No documents',
    saveFailed: 'Save failed',
    selectDoc: '[ 选择文档 / Select a doc ]',
    selectDocDesc: 'Select a document from the left list.',
    source: 'Source',
    preview: 'Preview',
    edit: 'Edit',
    saving: 'Saving...',
    saveBtn: 'Save →',
    docContentPlaceholder: 'Enter document content...',
    categoryUiPrimitives: 'UI Primitives',
    categoryFeedback: 'Feedback',
    categoryOverlays: 'Overlays',
    categoryLayout: 'Layout',
    registryName: 'Component Registry',
    registryHeroStats: '{total} components · {done} done · {progress}%',
    registryHeroTagline: '· inventory, preview, track refactor progress',
    loadingComponents: 'Loading components...',
    categoryLabel: 'Category',
    statusLabel: 'Status',
    all: 'All',
    reset: 'Reset',
    componentList: 'Components',
    noMatch: 'No matching components',
    selectComponent: 'Select a component',
    selectComponentDesc: 'Select a component from the left to view variant previews and usage guide',
    retreat: '← Retreat',
    advance: 'Advance →',
    variantPreview: '变体预览 / Variant Preview · Default State',
    editAllVariants: '编辑全部变体（27 格） / Edit All Variants',
    usageGuide: '使用规范 / Usage Guide',
    useCases: 'Use cases',
    antiPatterns: 'Anti-patterns',
    noRecord: 'No records yet',
    editVariants: '编辑变体 / Edit Variants',
    enabledSuffix: 'enabled',
    closeBtn: '关闭 / Close',
    confirmAction: '[ Confirm ]',
    confirmPrompt: 'Are you sure you want to perform this action?',
    confirm: 'Confirm',
    storeLoadFailed: 'Load failed',
    storeUnknownError: 'Unknown error',
    storeToggleFailed: 'Toggle variant failed',
    storeUpdateStatusFailed: 'Update status failed',
    storePresetFailed: 'Apply variant preset failed',
    storeUpdateGuideFailed: 'Update guide failed',
    storeCreateFailed: 'Create failed',
    storeDeleteFailed: 'Delete failed',
    visibilityLabel: 'Visibility',
    visibilityOpen: 'Opened (visible to all roles)',
    visibilityClosed: 'Not opened',
    statusDoneAutoOpen: 'Migration done → visibility auto-opened',
    slugInvalidHint: 'slug must be a known visibility module key',
  },
  workbench: {
    wbTitle: 'Workbench',
    wbSubtitle: 'Your personal learning hub',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    onlineLabel: 'Session time',
    todayTasks: 'Today',
    overdue: 'Overdue',
    dueToday: 'Due today',
    noTasks: 'All clear, enjoy the moment',
    addTask: 'Add',
    taskPlaceholder: 'What needs to be done…',
    clearDone: 'Clear done',
    clearAll: 'Clear all',
    confirmClearTasks: 'Clear all tasks? This cannot be undone.',
    pomodoro: 'Pomodoro',
    focusPhase: 'Focus',
    shortBreakPhase: 'Short break',
    longBreakPhase: 'Long break',
    roundN: 'Round {n}',
    startFocus: 'Start focus',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    soundLabel: 'Phase sound',
    soundRain: 'Rain',
    soundWaves: 'Waves',
    soundFire: 'Fireplace',
    soundWhite: 'White noise',
    silence: 'Silence',
    uploadMusic: 'Upload music',
    myMusic: 'My music',
    nextPhaseIn: 'Next phase',
    examCountdown: 'Exam countdown',
    daysLater: '{n} days',
    hoursLater: '{n} hours',
    minutesLater: '{n} min',
    ended: 'Ended',
    noExam: 'No exams scheduled',
    quickNotes: 'Quick notes',
    notePlaceholder: 'Jot something down…',
    allTools: 'All tools',
    toolsHint: 'Legacy tool entries, kept here',
    heatmapTitle: 'GitHub · {year}',
    githubHeatmap: 'GitHub heatmap',
    heatmapNoData: 'No data yet — bind a GitHub username first',
    heatmapBind: 'Bind',
    heatmapContributions: 'contributions',
    heatmapStreak: 'streak',
    heatmapLess: 'less',
    heatmapMore: 'more',
    heatmapMax: 'max',
    heatmapStale: 'stale',
    heatmapUsernamePlaceholder: 'GitHub username',
    apiUsageTitle: 'API calls · last {days} days',
    apiToday: 'Today',
    apiErrors: 'Errors',
    apiLatency: 'Latency',
    apiNoData: 'No data yet — try a few endpoints',
    loginRequired: 'Please sign in first',
    newChat: 'New chat',
    noConversations: 'No conversations yet',
    loading: 'Loading…',
    chatPlaceholder: 'Type a message, Enter to send',
    chatIntro: 'Ask me about learning, weak spots, exams, resources…',
    requestFailed: '(Request failed, please retry)',
    networkError: '(Network error: {msg})',
    llmUsageTitle: 'LLM usage · last {days} days',
    llmTodayCalls: 'Calls today',
    llmTodayTokens: 'Tokens today',
    llmLatencyMs: 'Latency',
    llmTotal: 'Total',
    llmModels: 'Models',
    llmSettings: 'LLM Settings',
    llmProvider: 'Provider',
    llmApiKey: 'API Key',
    llmBaseUrl: 'Base URL (optional)',
    llmModel: 'Model',
    llmSave: 'Save',
    llmSaved: 'Saved',
    llmMaskedHint: 'Current key: {masked}',
    llmNoData: 'No usage yet — chat with the assistant first',
    llmUsageEntry: 'Usage & Settings',
    resetLayout: 'Reset layout',
    confirmResetLayout: 'Reset to default layout? This clears all order and size customizations.',
    dragHint: 'Drag cards to reorder · click a size key to resize (e.g. 1×1 / 2×2 / 2×3)',
    schemaWidget: 'Schema cards',
    schemaEmpty: 'No data',
    schemaEmptyHint: 'No schema cards yet — add one in layout settings',
    schemaFormTitle: 'Add schema card',
    schemaFormTitlePlaceholder: 'Card title, e.g. Courses left',
    schemaFormTitleRequired: 'Title is required',
    schemaFormTypeLabel: 'Type',
    schemaFormDataLabel: 'Data source',
    schemaFormDataLocal: 'Local data',
    schemaFormDataApi: 'API data',
    schemaFormKeyPlaceholder: 'Storage key (auto wb_ prefix)',
    schemaFormUrlPlaceholder: '/api/tools/...',
    schemaFormFieldsPlaceholder: 'Field keys, comma-separated (e.g. title,due,status)',
    schemaFormSizeHint: 'Sizes:',
    schemaFormAdd: 'Add',
    schemaFormAdded: 'Added',
    schemaType_count: 'Count',
    schemaType_list: 'List',
    schemaType_progress: 'Progress',
    schemaType_countdown: 'Countdown',
    schemaType_note: 'Note',
    schemaType_link: 'Link',
  }
};
