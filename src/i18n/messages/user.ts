/**
 * @file i18n 消息模块 — user（自动拆分自 types.ts / languages/*.ts）
 * 包含该业务模块下的所有 namespace：类型 + 中英文语言包。
 */

export interface UserMessages {
  auth: {
    email: string;
    password: string;
    loginTitle: string;
    register: string;
    forgotPassword: string;
    twoFactor: string;
    welcomeBack: string;
    createAccount: string;
    twoFactorTitle: string;
    twoFactorSubtitle: string;
    loginSubtitle: string;
    registerSubtitle: string;
    emailLabel: string;
    passwordLabel: string;
    confirmLabel: string;
    verifyCodeLabel: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    confirmPlaceholder: string;
    codePlaceholder: string;
    show: string;
    hide: string;
    sendCode: string;
    codeSent: string;
    invalidEmail: string;
    emailRequired: string;
    emailInvalid: string;
    passwordTooShort: string;
    passwordMismatch: string;
    codeRequired: string;
    enter2FACode: string;
    passwordStrengthWeak: string;
    passwordStrengthFair: string;
    passwordStrengthMedium: string;
    passwordStrengthStrong: string;
    verifying: string;
    verify: string;
    processing: string;
    signIn: string;
    createAccountBtn: string;
    or: string;
    githubLogin: string;
    noAccount: string;
    haveAccount: string;
    resetRequest: string;
    forgotDesc: string;
    forgotSuccessTitle: string;
    forgotSuccessDesc: string;
    backToLogin: string;
    backToHome: string;
    networkError: string;
    sendCodeFailed: string;
    submitFailed: string;
    credentialsInvalid: string;
    requestFailed: string;
    oauthStateError: string;
    oauthFailed: string;
    oauthUnknown: string;
    accountDisabled: string;
    githubEmailConflict: string;
    sendCodeFailedRetry: string;
    submitRequest: string;
  },
  profile: {
    tabProfile: string;
    tabActivity: string;
    tabCommunity: string;
    tabJoin: string;
    identityLabel: string;
    identityEn: string;
    unnamed: string;
    unnamedUser: string;
    joined: string;
    errorTitle: string;
    backHome: string;
    profileTitle: string;
    securityTitle: string;
    activityTitle: string;
    communityTitle: string;
    joinTitle: string;
    profileEn: string;
    activityEn: string;
    communityEn: string;
    joinEn: string;
    userPanel: string;
    githubBoundTitle: string;
    githubBoundDesc: string;
    current: string;
    type: string;
    updated: string;
    presets: string;
    options: string;
    upload: string;
    uploading: string;
    chooseFile: string;
    fileHint: string;
    displayName: string;
    displayNamePlaceholder: string;
    bio: string;
    bioPlaceholder: string;
    github: string;
    website: string;
    techTags: string;
    saving: string;
    saveChanges: string;
    reset: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmNewPassword: string;
    confirmNewPasswordPlaceholder: string;
    updating: string;
    updatePassword: string;
    noRecord: string;
    noActivity: string;
    browseEvents: string;
    role: string;
    noSessions: string;
    unknownDevice: string;
    logout: string;
    logoutAll: string;
    logoutAllTitle: string;
    logoutAllConfirm: string;
    logoutAllConfirmLabel: string;
    logoutAllFailed: string;
    cancel: string;
    loadingSessions: string;
    loading: string;
    noApplication: string;
    noApplicationDesc: string;
    fillApplication: string;
    studentId: string;
    reviewNote: string;
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    profileSaved: string;
    profileSaveFailed: string;
    networkError: string;
    displayNameTooLong: string;
    bioTooLong: string;
    invalidGithub: string;
    invalidWebsite: string;
    avatarUpdated: string;
    avatarSetFailed: string;
    invalidImageType: string;
    fileTooLarge: string;
    avatarUploaded: string;
    avatarUploadFailed: string;
    enterCurrentPassword: string;
    newPasswordTooShort: string;
    newPasswordMismatch: string;
    currentPasswordWrong: string;
    passwordInvalid: string;
    passwordChangeFailed: string;
    passwordChanged: string;
    loadFailed: string;
    sessionsLabel: string;
    active: string;
    created: string;
    deleteFailed: string;
  },
  about: {
    tabBelief: string;
    tabDirections: string;
    tabProcess: string;
    heroTitle1: string;
    heroTitle2: string;
    heroTitle3: string;
    heroTitleEn: string;
    heroDesc1: string;
    heroDesc2: string;
    heroDesc3: string;
    beliefTitle1: string;
    beliefTitle2: string;
    beliefTitle3: string;
    beliefSection: string;
    expectationSection: string;
    directionsTitle1: string;
    directionsTitle2: string;
    directionsTitle3: string;
    directionsDesc1: string;
    directionsDesc2: string;
    processTitle1: string;
    processTitle2: string;
    processSection: string;
    joinSection: string;
    processDesc: string;
    fillForm: string;
    login: string;
    duration: string;
    step: string;
    belief1Title: string;
    belief1Desc: string;
    belief2Title: string;
    belief2Desc: string;
    belief3Title: string;
    belief3Desc: string;
    req1Title: string;
    req1Desc: string;
    req2Title: string;
    req2Desc: string;
    req3Title: string;
    req3Desc: string;
    req4Title: string;
    req4Desc: string;
    dir1Name: string;
    dir1Desc: string;
    dir2Name: string;
    dir2Desc: string;
    dir3Name: string;
    dir3Desc: string;
    dir4Name: string;
    dir4Desc: string;
    dir5Name: string;
    dir5Desc: string;
    dir6Name: string;
    dir6Desc: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
  },
  join: {
    heroTitle1: string;
    heroTitle2: string;
    heroTitleEn: string;
    heroDesc1: string;
    heroDesc2: string;
    sectionTitle1: string;
    sectionTitle2: string;
    sectionTitleEn: string;
    underReview: string;
    pendingDesc: string;
    viewInProfile: string;
    submitted: string;
    viewStatusInProfile: string;
    register: string;
    name: string;
    namePlaceholder: string;
    studentId: string;
    studentIdPlaceholder: string;
    major: string;
    majorPlaceholder: string;
    techTags: string;
    reason: string;
    reasonPlaceholder: string;
    qq: string;
    phone: string;
    optional: string;
    submitting: string;
    submit: string;
    nameRequired: string;
    studentIdRequired: string;
    majorRequired: string;
    reasonRequired: string;
    submitFailed: string;
    submitSuccessLoggedIn: string;
    submitSuccessGuest: string;
    networkError: string;
    loading: string;
  },
  userMenu: {
    more: string;
    switch: string;
    logout: string;
    admin: string;
    login: string;
    create: string;
    loginToView: string;
    switchTitle: string;
    logoutTitle: string;
    switchMessage: string;
    logoutMessage: string;
    switchConfirm: string;
    logoutConfirm: string;
    menuAria: string;
  },
  notifications: {
    ariaLabel: string;
    unread: string;
    loading: string;
    empty: string;
    viewAll: string;
    markAllRead: string;
    retry: string;
    centerTitle: string;
    centerTitleEn: string;
    unreadCount: string;
    allReadDone: string;
    header: string;
    total: string;
    filterAll: string;
    filterUnread: string;
    filterMention: string;
    filterSystem: string;
    typeSystem: string;
    typeInteraction: string;
    typeMention: string;
    typeFollow: string;
  },
  userPublic: {
    roleRoot: string;
    roleAdmin: string;
    roleMember: string;
    joined: string;
    profileTitle: string;
    techDir: string;
    links: string;
    noTags: string;
    github: string;
    website: string;
    noGithub: string;
    noWebsite: string;
    communityActivity: string;
    statTopic: string;
    statReply: string;
    examTitle: string;
    examTaken: string;
    examPassed: string;
    examRate: string;
    noExams: string;
    recentTopics: string;
    defaultCat: string;
    replies: string;
    likes: string;
    noTopics: string;
    notFound: string;
    loadFailed: string;
    backHome: string;
    techWeb: string;
    techAi: string;
    techSystem: string;
    techGame: string;
    techSecurity: string;
    techMobile: string;
    techData: string;
    techDevops: string;
    techGraphics: string;
    techHardware: string;
    techAlgorithm: string;
    techDesign: string;
  },
  seo: {
    title: string;
    titleTemplate: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    twitterTitle: string;
    twitterDescription: string;
    author: string;
    appleTitle: string;
    ogAlt: string;
  },
  home: {
    tagline: string;
    titleExplore: string;
    titleTech: string;
    titleRest: string;
    introBefore: string;
    introHighlight: string;
    joinNow: string;
    learnMore: string;
    recruiting: string;
    est: string;
    codeTagline: string;
    unnamed: string;
  }
}

export const zhCN: UserMessages = {
  auth: {
    email: '邮箱',
    password: '密码',
    loginTitle: '登录',
    twoFactor: '双因素认证',
    welcomeBack: '欢迎回来。',
    createAccount: '创建新账号。',
    twoFactorTitle: '两步验证',
    twoFactorSubtitle: '请输入身份验证器中的 6 位验证码',
    loginSubtitle: '登录你的账号继续探索',
    registerSubtitle: '只需邮箱与密码，30 秒完成注册',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmLabel: 'Confirm',
    verifyCodeLabel: 'Verify Code',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '至少 8 位，含大小写+数字+符号',
    confirmPlaceholder: '再次输入密码',
    codePlaceholder: '000000',
    show: 'SHOW',
    hide: 'HIDE',
    sendCode: 'Send Code',
    codeSent: '验证码已发送至该邮箱（开发环境请查看服务器控制台）',
    invalidEmail: '邮箱格式不正确',
    emailRequired: '请先填写正确的邮箱地址',
    emailInvalid: '请填写正确的邮箱地址',
    passwordTooShort: '密码长度至少为 {min} 位',
    passwordMismatch: '两次输入的密码不一致',
    codeRequired: '请输入验证码',
    enter2FACode: '请输入 6 位验证码',
    passwordStrengthWeak: '弱',
    passwordStrengthFair: '一般',
    passwordStrengthMedium: '中等',
    passwordStrengthStrong: '强',
    verifying: 'Verifying...',
    verify: 'Verify →',
    processing: 'Processing...',
    signIn: 'Sign In →',
    createAccountBtn: 'Create Account →',
    or: '— OR —',
    githubLogin: '使用 GitHub 登录',
    noAccount: 'No account?',
    haveAccount: 'Have account?',
    register: 'Register →',
    forgotPassword: 'Forgot Password?',
    resetRequest: '[ Reset Request ]',
    forgotDesc: '输入您的注册邮箱，提交密码重置申请。管理员审批后，密码将重置为默认密码。',
    forgotSuccessTitle: '您的密码重置申请已提交，请等待管理员审批。',
    forgotSuccessDesc: '管理员批准后，您的密码将被重置为默认密码，届时可使用默认密码登录后修改。',
    backToLogin: '← Back to Login',
    backToHome: '← Back to Home',
    networkError: '网络错误，请检查网络后重试',
    sendCodeFailed: '验证码发送失败',
    submitFailed: '申请提交失败',
    credentialsInvalid: '邮箱或密码错误',
    requestFailed: '请求失败，请稍后再试',
    oauthStateError: '授权状态验证失败，请重试',
    oauthFailed: 'GitHub 登录失败，请稍后重试',
    oauthUnknown: '登录失败，请稍后重试',
    accountDisabled: '该账号已被禁用，请联系管理员',
    githubEmailConflict: '该邮箱已注册，请用密码登录后在个人设置中绑定 GitHub',
    sendCodeFailedRetry: '验证码发送失败，请稍后再试',
    submitRequest: 'Submit Request →',
  },
  profile: {
    tabProfile: '资料与安全 / Account',
    tabActivity: '活动 / Activity',
    tabCommunity: '社区 / Community',
    tabJoin: '入社申请 / Join',
    identityLabel: '身份信息',
    identityEn: '/ Identity',
    unnamed: '未命名',
    unnamedUser: '用户',
    joined: 'Joined {date}',
    errorTitle: '[ 错误 / Error ]',
    backHome: '← Back to Home',
    profileTitle: '资料与安全',
    securityTitle: '账号安全',
    activityTitle: '活动记录',
    communityTitle: '社区活动',
    joinTitle: '入社申请',
    profileEn: 'Account',
    activityEn: 'Activity',
    communityEn: 'Community',
    joinEn: 'Join',
    userPanel: 'USER PANEL',
    githubBoundTitle: 'GitHub 账号已自动绑定到你的现有账号（邮箱匹配）。',
    githubBoundDesc: '以后可使用 GitHub 登录或邮箱密码登录此账号。',
    current: '[ Current ]',
    type: 'Type:',
    updated: 'Updated: {date}',
    presets: '[ Presets ]',
    options: '{count} options',
    upload: '[ Upload ]',
    uploading: 'Uploading...',
    chooseFile: 'Choose File →',
    fileHint: 'JPEG / PNG / WebP / GIF · ≤ 2MB',
    displayName: 'Display Name',
    displayNamePlaceholder: '如何称呼你？',
    bio: 'Bio',
    bioPlaceholder: '一句话介绍自己',
    github: 'GitHub',
    website: 'Website',
    techTags: '技术标签',
    saving: 'Saving...',
    saveChanges: 'Save Changes →',
    reset: 'Reset',
    currentPassword: 'Current Password',
    currentPasswordPlaceholder: '输入当前密码',
    newPassword: 'New Password',
    newPasswordPlaceholder: '至少 8 位，含大小写+数字+符号',
    confirmNewPassword: 'Confirm New Password',
    confirmNewPasswordPlaceholder: '再次输入新密码',
    updating: 'Updating...',
    updatePassword: 'Update Password →',
    noRecord: '[ No Record ]',
    noActivity: '暂无活动参与记录。',
    browseEvents: '浏览活动 →',
    role: 'Role: {role}',
    noSessions: '没有活跃会话',
    unknownDevice: '未知设备',
    logout: '登出',
    logoutAll: '登出全部设备',
    logoutAllTitle: '登出全部设备',
    logoutAllConfirm: '此操作将注销你所有设备上的登录状态（包括当前设备），需要重新登录。确定继续吗？',
    logoutAllConfirmLabel: '确认登出全部',
    logoutAllFailed: '登出全部设备失败，请稍后再试',
    cancel: '取消',
    loadingSessions: 'Loading sessions...',
    loading: 'Loading...',
    noApplication: '[ No Application ]',
    noApplicationDesc: '你还没有提交过入社申请。',
    fillApplication: '去填写申请表 →',
    studentId: '学号 {id}',
    reviewNote: '[ 审批备注 / Review Note ]',
    statusPending: '待审',
    statusApproved: '已通过',
    statusRejected: '已拒绝',
    profileSaved: '资料已保存',
    profileSaveFailed: '保存失败，请稍后再试',
    networkError: '网络错误，请稍后再试',
    displayNameTooLong: '显示名不能超过 {max} 个字符',
    bioTooLong: '个人简介不能超过 {max} 个字符',
    invalidGithub: 'GitHub 链接格式不正确',
    invalidWebsite: '个人网站链接格式不正确',
    avatarUpdated: '头像已更新',
    avatarSetFailed: '设置失败',
    invalidImageType: '仅支持 JPEG / PNG / WebP / GIF 格式',
    fileTooLarge: '文件大小不能超过 2MB',
    avatarUploaded: '头像已上传',
    avatarUploadFailed: '上传失败',
    enterCurrentPassword: '请输入当前密码',
    newPasswordTooShort: '新密码至少 {min} 位',
    newPasswordMismatch: '两次输入的新密码不一致',
    currentPasswordWrong: '当前密码错误',
    passwordInvalid: '密码不符合要求',
    passwordChangeFailed: '修改失败，请稍后再试',
    passwordChanged: '密码已修改',
    loadFailed: '加载失败',
    sessionsLabel: '[ Sessions ]',
    active: '{count} active',
    created: 'Created: {date}',
    deleteFailed: '操作失败',
  },
  about: {
    tabBelief: '关于 / About',
    tabDirections: '方向 / Directions',
    tabProcess: '加入 / Join',
    heroTitle1: '一群',
    heroTitle2: '热爱',
    heroTitle3: '技术的人，聚在一起。',
    heroTitleEn: '/ About & Join',
    heroDesc1: '计算机协会成立于 2017 年，是校园中最纯粹的技术社区。我们相信，',
    heroDesc2: '代码不只是工具',
    heroDesc3: '，更是表达创意、解决问题、连接未来的语言。',
    beliefTitle1: '我们期待',
    beliefTitle2: '同频',
    beliefTitle3: '的你！',
    beliefSection: '— 信念 / Belief',
    expectationSection: '— 期望 / Expectation',
    directionsTitle1: '六大方向，',
    directionsTitle2: '覆盖',
    directionsTitle3: '主流技术领域。',
    directionsDesc1: '从 Web 到 AI，从算法到系统，每个方向都有专人带领、固定周会、真实项目。成员可以',
    directionsDesc2: '同时参与多个方向。',
    processTitle1: '如何',
    processTitle2: '加入',
    processSection: '— 流程 / Process',
    joinSection: '— 加入 / Join',
    processDesc: '报名通道全年开放。填写报名表，我们会在 3 个工作日内联系你。',
    fillForm: '填写报名表',
    login: '登录',
    duration: 'Duration',
    step: 'Step {current} / {total}',
    belief1Title: '技术驱动 — 在实践中学习',
    belief1Desc: '我们不满足于纸上谈兵。从第一周开始，成员就会接触真实项目：Web 应用、算法竞赛、AI 模型训练、系统工具开发。每个项目都有明确的产出目标，学习在解决问题中发生，而不是在听完理论之后。',
    belief2Title: '开放社区 — 技术属于每个人',
    belief2Desc: '不论你的专业、年级、性别或技术基础，只要你对技术怀有热情，这里就有你的位置。我们崇尚分享而非藏私、协作而非竞争、共同成长而非零和博弈。',
    belief3Title: '成果导向 — 让作品说话',
    belief3Desc: '成员在 ACM/ICPC 亚洲区域赛、蓝桥杯、CCF-CSP、各类黑客松中屡获佳绩；多个学生项目在校内外产生实际影响力，部分项目已开源并被社区采用。',
    req1Title: '对技术的真诚热情',
    req1Desc: '不需要你已经是高手，但需要你真的喜欢写代码、研究原理、解决问题。',
    req2Title: '主动学习与持续投入',
    req2Desc: '协会不是培训班，我们期待你主动提出问题、寻找答案，并长期投入。',
    req3Title: '协作精神与开放心态',
    req3Desc: '愿意与他人分享、合作、互相 review 代码，接受不同观点的碰撞。',
    req4Title: '不限专业年级',
    req4Desc: '无论你是计算机、电子、机械、设计、文科或理科，都欢迎加入。',
    dir1Name: 'Web 开发',
    dir1Desc: '从静态页面到全栈应用，掌握现代 Web 开发完整链路：设计、构建、部署、运维。',
    dir2Name: '算法竞赛',
    dir2Desc: '系统训练数据结构与算法，参与 ICPC、CCPC、蓝桥杯等高水平竞赛。',
    dir3Name: '人工智能',
    dir3Desc: '从经典机器学习到大模型微调，覆盖理论、工程与应用全栈。',
    dir4Name: '系统与安全',
    dir4Desc: '深入操作系统内核，学习网络安全攻防，参与 CTF 竞赛。',
    dir5Name: '开源贡献',
    dir5Desc: '学习开源协作流程，向知名项目提交 PR，建立个人技术影响力。',
    dir6Name: '创意编程',
    dir6Desc: '用代码创造艺术：游戏开发、交互设计、生成艺术、WebGL 可视化。',
    step1Title: '注册账号',
    step1Desc: '在协会官网注册一个账号，验证邮箱后即可登录。',
    step2Title: '填写报名表',
    step2Desc: '填写简单的报名表，包括你的兴趣方向、技术背景与想加入的理由。',
    step3Title: '线上交流',
    step3Desc: '与各组负责人进行简短的线上交流，互相了解，看是否契合。',
    step4Title: '正式加入',
    step4Desc: '通过后即可加入协会，参与各组活动、项目与周会。',
  },
  join: {
    heroTitle1: '加入',
    heroTitle2: '我们',
    heroTitleEn: '/ Join',
    heroDesc1: '填写下方表单提交申请，管理员审核通过后',
    heroDesc2: '与你联系',
    sectionTitle1: '申请',
    sectionTitle2: '表单',
    sectionTitleEn: '/ Application',
    underReview: '[ 审核中 / Under Review ]',
    pendingDesc: '你已有一个待审核的入社申请（提交于 {date}），请耐心等待管理员审核。',
    viewInProfile: '在个人中心查看 →',
    submitted: '[ 已提交 / Submitted ]',
    viewStatusInProfile: '在个人中心查看申请状态 →',
    register: '注册账号 →',
    name: '姓名',
    namePlaceholder: '你的真实姓名',
    studentId: '学号',
    studentIdPlaceholder: '你的学号',
    major: '专业',
    majorPlaceholder: '你的专业',
    techTags: '技术方向',
    reason: '申请理由',
    reasonPlaceholder: '为什么想加入协会？对什么技术方向感兴趣？',
    qq: 'QQ',
    phone: '手机号',
    optional: '选填',
    submitting: '提交中...',
    submit: '提交申请 →',
    nameRequired: '姓名不能为空',
    studentIdRequired: '学号不能为空',
    majorRequired: '专业不能为空',
    reasonRequired: '申请理由不能为空',
    submitFailed: '提交失败，请稍后再试',
    submitSuccessLoggedIn: '申请已提交，管理员审核后会通过站内通知告知你结果。',
    submitSuccessGuest: '申请已提交，管理员会通过你留下的联系方式与你沟通结果。建议注册账号以便后续跟踪申请状态。',
    networkError: '网络错误，请稍后再试',
    loading: 'Loading...',
  },
  userMenu: {
    more: '更多',
    switch: '切换',
    logout: '退出',
    admin: '管理',
    login: '登录',
    create: '创作中心',
    loginToView: '登录以查看通知',
    switchTitle: '切换账号',
    logoutTitle: '退出登录',
    switchMessage: '切换后将登出当前账号并返回登录页。',
    logoutMessage: '退出后将登出当前账号并返回首页。',
    switchConfirm: '确认切换',
    logoutConfirm: '确认退出',
    menuAria: '用户菜单',
  },
  notifications: {
    ariaLabel: '通知',
    unread: '{count} 未读',
    loading: '加载中...',
    empty: '暂无通知',
    viewAll: '查看全部 →',
    markAllRead: '全部已读',
    retry: '重试',
    centerTitle: '通知中心',
    centerTitleEn: '/ Notifications',
    unreadCount: '你有 {count} 条未读通知',
    allReadDone: '所有通知均已阅读',
    header: '通知',
    total: '共 {total} 条通知',
    filterAll: '全部',
    filterUnread: '未读',
    filterMention: '提及',
    filterSystem: '系统',
    typeSystem: '系统',
    typeInteraction: '互动',
    typeMention: '提及',
    typeFollow: '关注',
  },
  userPublic: {
    roleRoot: '超级管理员',
    roleAdmin: '管理员',
    roleMember: '成员',
    joined: '加入于 {date}',
    profileTitle: '技术档案',
    techDir: '技术方向',
    links: '链接',
    noTags: '暂无技术标签',
    github: 'GitHub',
    website: 'Website',
    noGithub: '未设置 GitHub',
    noWebsite: '未设置个人网站',
    communityActivity: '社区活跃度',
    statTopic: '主题',
    statReply: '回复',
    examTitle: '考试统计',
    examTaken: '参加考试',
    examPassed: '通过考试',
    examRate: '通过率',
    noExams: '暂无考试记录',
    recentTopics: '最近主题',
    defaultCat: '综合讨论',
    replies: '回复',
    likes: '赞',
    noTopics: '暂无主题',
    notFound: '用户不存在',
    loadFailed: '加载失败',
    backHome: '返回首页',
    techWeb: 'Web 开发',
    techAi: 'AI / ML',
    techSystem: '系统编程',
    techGame: '游戏开发',
    techSecurity: '网络安全',
    techMobile: '移动开发',
    techData: '数据 / 数据库',
    techDevops: 'DevOps / 云原生',
    techGraphics: '图形学 / 可视化',
    techHardware: '硬件 / IoT',
    techAlgorithm: '算法 / 竞赛',
    techDesign: 'UI / 设计',
  },
  seo: {
    title: '计算机协会 | 探索技术的无限可能',
    titleTemplate: '%s | 计算机协会',
    description: '大学计算机协会官方主页 - 汇聚热爱技术的学生，探索编程、算法、人工智能与开源世界的无限可能。',
    ogTitle: '计算机协会 | 探索技术的无限可能',
    ogDescription: '汇聚热爱技术的学生，探索编程与开源世界的无限可能。',
    twitterTitle: '计算机协会 | 探索技术的无限可能',
    twitterDescription: '汇聚热爱技术的学生，探索编程与开源世界的无限可能。',
    author: '计算机协会',
    appleTitle: '计算机协会',
    ogAlt: '计算机协会 Logo',
  },
  home: {
    tagline: 'A Community of Code, Curiosity & Craft',
    titleExplore: '探索',
    titleTech: '技术',
    titleRest: '的无限可能',
    introBefore: '我们是校园中最纯粹的技术社区。在这里，代码不只是工具，',
    introHighlight: '而是表达创意、解决问题、连接未来的语言。',
    joinNow: '立即加入',
    learnMore: '了解更多',
    recruiting: 'Recruiting',
    est: 'Computer Association / Est. 2017',
    codeTagline: '2026 / Autumn',
    unnamed: '未命名',
  }
};

export const en: UserMessages = {
  auth: {
    email: 'Email',
    password: 'Password',
    loginTitle: 'Sign in',
    twoFactor: 'Two-Factor Auth',
    welcomeBack: 'Welcome back.',
    createAccount: 'Create your account.',
    twoFactorTitle: 'Two-Factor Verification',
    twoFactorSubtitle: 'Enter the 6-digit code from your authenticator app',
    loginSubtitle: 'Sign in to your account to continue',
    registerSubtitle: 'Just an email and password — sign up in 30 seconds',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmLabel: 'Confirm',
    verifyCodeLabel: 'Verify Code',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: 'At least 8 chars, with uppercase + digit + symbol',
    confirmPlaceholder: 'Re-enter password',
    codePlaceholder: '000000',
    show: 'SHOW',
    hide: 'HIDE',
    sendCode: 'Send Code',
    codeSent: 'Code sent to your email (dev: check the server console)',
    invalidEmail: 'Invalid email format',
    emailRequired: 'Please enter a valid email first',
    emailInvalid: 'Please enter a valid email address',
    passwordTooShort: 'Password must be at least {min} characters',
    passwordMismatch: 'The two passwords do not match',
    codeRequired: 'Please enter the verification code',
    enter2FACode: 'Please enter the 6-digit code',
    passwordStrengthWeak: 'Weak',
    passwordStrengthFair: 'Fair',
    passwordStrengthMedium: 'Medium',
    passwordStrengthStrong: 'Strong',
    verifying: 'Verifying...',
    verify: 'Verify →',
    processing: 'Processing...',
    signIn: 'Sign In →',
    createAccountBtn: 'Create Account →',
    or: '— OR —',
    githubLogin: 'Continue with GitHub',
    noAccount: 'No account?',
    haveAccount: 'Have account?',
    register: 'Register →',
    forgotPassword: 'Forgot Password?',
    resetRequest: '[ Reset Request ]',
    forgotDesc: 'Enter your registered email to submit a password reset request. Once approved by an admin, your password will be reset to the default.',
    forgotSuccessTitle: 'Your password reset request has been submitted. Please wait for admin approval.',
    forgotSuccessDesc: 'After approval, your password will be reset to the default. You can then sign in and change it.',
    backToLogin: '← Back to Login',
    backToHome: '← Back to Home',
    networkError: 'Network error, please check your connection and try again',
    sendCodeFailed: 'Failed to send code',
    submitFailed: 'Failed to submit request',
    credentialsInvalid: 'Incorrect email or password',
    requestFailed: 'Request failed, please try again later',
    oauthStateError: 'Authorization state verification failed, please retry',
    oauthFailed: 'GitHub login failed, please try again later',
    oauthUnknown: 'Login failed, please try again later',
    accountDisabled: 'This account has been disabled. Please contact an administrator.',
    githubEmailConflict: 'This email is already registered. Please sign in with your password and link GitHub in settings.',
    sendCodeFailedRetry: 'Failed to send the code, please try again later',
    submitRequest: 'Submit Request →',
  },
  profile: {
    tabProfile: 'Account / 资料与安全',
    tabActivity: 'Activity / 活动',
    tabCommunity: 'Community / 社区',
    tabJoin: 'Join / 入社申请',
    identityLabel: 'Identity',
    identityEn: '/ Identity',
    unnamed: 'Unnamed',
    unnamedUser: 'user',
    joined: 'Joined {date}',
    errorTitle: '[ Error / 错误 ]',
    backHome: '← Back to Home',
    profileTitle: 'Account',
    securityTitle: 'Account Security',
    activityTitle: 'Activity',
    communityTitle: 'Community',
    joinTitle: 'Join Request',
    profileEn: 'Account',
    activityEn: 'Activity',
    communityEn: 'Community',
    joinEn: 'Join',
    userPanel: 'USER PANEL',
    githubBoundTitle: 'Your GitHub account has been automatically linked to your existing account (email matched).',
    githubBoundDesc: 'You can now sign in with GitHub or email/password.',
    current: '[ Current ]',
    type: 'Type:',
    updated: 'Updated: {date}',
    presets: '[ Presets ]',
    options: '{count} options',
    upload: '[ Upload ]',
    uploading: 'Uploading...',
    chooseFile: 'Choose File →',
    fileHint: 'JPEG / PNG / WebP / GIF · ≤ 2MB',
    displayName: 'Display Name',
    displayNamePlaceholder: 'What should we call you?',
    bio: 'Bio',
    bioPlaceholder: 'Introduce yourself in one line',
    github: 'GitHub',
    website: 'Website',
    techTags: 'Tech Tags',
    saving: 'Saving...',
    saveChanges: 'Save Changes →',
    reset: 'Reset',
    currentPassword: 'Current Password',
    currentPasswordPlaceholder: 'Enter current password',
    newPassword: 'New Password',
    newPasswordPlaceholder: 'At least 8 chars, with uppercase + digit + symbol',
    confirmNewPassword: 'Confirm New Password',
    confirmNewPasswordPlaceholder: 'Re-enter new password',
    updating: 'Updating...',
    updatePassword: 'Update Password →',
    noRecord: '[ No Record ]',
    noActivity: 'No activity participation records yet.',
    browseEvents: 'Browse events →',
    role: 'Role: {role}',
    noSessions: 'No active sessions',
    unknownDevice: 'Unknown device',
    logout: 'Log out',
    logoutAll: 'Log out all devices',
    logoutAllTitle: 'Log out all devices',
    logoutAllConfirm: 'This will sign you out on all devices (including the current one). You will need to sign in again. Continue?',
    logoutAllConfirmLabel: 'Log out all',
    logoutAllFailed: 'Failed to log out all devices, please try again later',
    cancel: 'Cancel',
    loadingSessions: 'Loading sessions...',
    loading: 'Loading...',
    noApplication: '[ No Application ]',
    noApplicationDesc: 'You have not submitted a membership application yet.',
    fillApplication: 'Fill out the application →',
    studentId: 'Student ID {id}',
    reviewNote: '[ Review Note / 审批备注 ]',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    profileSaved: 'Profile saved',
    profileSaveFailed: 'Failed to save, please try again later',
    networkError: 'Network error, please try again later',
    displayNameTooLong: 'Display name cannot exceed {max} characters',
    bioTooLong: 'Bio cannot exceed {max} characters',
    invalidGithub: 'Invalid GitHub URL',
    invalidWebsite: 'Invalid website URL',
    avatarUpdated: 'Avatar updated',
    avatarSetFailed: 'Failed to set',
    invalidImageType: 'Only JPEG / PNG / WebP / GIF formats are supported',
    fileTooLarge: 'File size cannot exceed 2MB',
    avatarUploaded: 'Avatar uploaded',
    avatarUploadFailed: 'Upload failed',
    enterCurrentPassword: 'Please enter your current password',
    newPasswordTooShort: 'New password must be at least {min} characters',
    newPasswordMismatch: 'The two new passwords do not match',
    currentPasswordWrong: 'Current password is incorrect',
    passwordInvalid: 'Password does not meet requirements',
    passwordChangeFailed: 'Failed to change, please try again later',
    passwordChanged: 'Password changed',
    loadFailed: 'Failed to load',
    sessionsLabel: '[ Sessions ]',
    active: '{count} active',
    created: 'Created: {date}',
    deleteFailed: 'Operation failed',
  },
  about: {
    tabBelief: 'About / 关于',
    tabDirections: 'Directions / 方向',
    tabProcess: 'Join / 加入',
    heroTitle1: 'A group of people',
    heroTitle2: 'who love',
    heroTitle3: 'technology, together.',
    heroTitleEn: '/ About & Join',
    heroDesc1: 'Founded in 2017, the Computer Association is the purest tech community on campus. We believe',
    heroDesc2: 'code is not just a tool',
    heroDesc3: ', it is the language of creativity, problem-solving, and the future.',
    beliefTitle1: 'We look forward to',
    beliefTitle2: 'meeting',
    beliefTitle3: 'people like you!',
    beliefSection: '— Beliefs',
    expectationSection: '— Expectations',
    directionsTitle1: 'Six directions,',
    directionsTitle2: 'covering',
    directionsTitle3: 'all mainstream tech.',
    directionsDesc1: 'From Web to AI, from algorithms to systems, each direction has dedicated leads, weekly meetings, and real projects. Members can',
    directionsDesc2: 'join multiple directions',
    processTitle1: 'How to',
    processTitle2: 'join',
    processSection: '— Process',
    joinSection: '— Join',
    processDesc: 'Applications are open all year. Fill out the form and we will contact you within 3 business days.',
    fillForm: 'Fill out the form',
    login: 'Sign in',
    duration: 'Duration',
    step: 'Step {current} / {total}',
    belief1Title: 'Tech-Driven — Learn by doing',
    belief1Desc: 'We do not settle for theory. From week one, members work on real projects: web apps, algorithm contests, AI model training, and system tooling. Every project has clear goals; learning happens while solving problems.',
    belief2Title: 'Open Community — Tech belongs to everyone',
    belief2Desc: 'Whatever your major, year, gender, or background, if you love tech there is a place for you. We value sharing over hoarding, collaboration over competition, and mutual growth over zero-sum.',
    belief3Title: 'Outcome-Driven — Let work speak',
    belief3Desc: 'Members have excelled in ACM/ICPC Asia Regionals, Blue Bridge Cup, CCF-CSP, and various hackathons; several student projects have real impact and are open-sourced.',
    req1Title: 'Genuine passion for tech',
    req1Desc: 'You do not need to be an expert, but you need to genuinely enjoy coding, exploring principles, and solving problems.',
    req2Title: 'Self-driven learning',
    req2Desc: 'We are not a training class. We expect you to ask questions, seek answers, and stay committed long-term.',
    req3Title: 'Collaboration & open mindset',
    req3Desc: 'Willing to share, collaborate, review code, and embrace diverse viewpoints.',
    req4Title: 'No major/year limits',
    req4Desc: 'Whether you are CS, EE, ME, design, liberal arts, or science, you are welcome.',
    dir1Name: 'Web Development',
    dir1Desc: 'From static pages to full-stack apps, mastering the complete modern web development pipeline.',
    dir2Name: 'Competitive Programming',
    dir2Desc: 'Systematic training in data structures and algorithms, competing in ICPC, CCPC, and Blue Bridge Cup.',
    dir3Name: 'AI & Machine Learning',
    dir3Desc: 'From classic ML to large-model fine-tuning, covering theory, engineering, and applications.',
    dir4Name: 'Systems & Security',
    dir4Desc: 'Deep-dive into OS internals, learn offensive/defensive security, and join CTF competitions.',
    dir5Name: 'Open Source',
    dir5Desc: 'Learn open-source collaboration, submit PRs to well-known projects, and build your tech influence.',
    dir6Name: 'Creative Coding',
    dir6Desc: 'Create art with code: game dev, interaction design, generative art, and WebGL visualization.',
    step1Title: 'Register an account',
    step1Desc: 'Register an account on the site and verify your email to sign in.',
    step2Title: 'Fill out the application',
    step2Desc: 'Complete a simple form with your interests, background, and reasons for joining.',
    step3Title: 'Online chat',
    step3Desc: 'Have a short online conversation with team leads to see if you are a fit.',
    step4Title: 'Officially join',
    step4Desc: 'Once approved, join the association and participate in group activities, projects, and weekly meetings.',
  },
  join: {
    heroTitle1: 'Join',
    heroTitle2: 'us',
    heroTitleEn: '/ Join',
    heroDesc1: 'Submit the form below and an admin will review it, then',
    heroDesc2: 'contact you',
    sectionTitle1: 'Application',
    sectionTitle2: 'Form',
    sectionTitleEn: '/ Application',
    underReview: '[ Under Review / 审核中 ]',
    pendingDesc: 'You already have a pending application (submitted on {date}). Please wait for admin review.',
    viewInProfile: 'View in profile →',
    submitted: '[ Submitted / 已提交 ]',
    viewStatusInProfile: 'View status in profile →',
    register: 'Create an account →',
    name: 'Name',
    namePlaceholder: 'Your real name',
    studentId: 'Student ID',
    studentIdPlaceholder: 'Your student ID',
    major: 'Major',
    majorPlaceholder: 'Your major',
    techTags: 'Tech Directions',
    reason: 'Reason',
    reasonPlaceholder: 'Why do you want to join? What tech direction interests you?',
    qq: 'QQ',
    phone: 'Phone',
    optional: 'Optional',
    submitting: 'Submitting...',
    submit: 'Submit Application →',
    nameRequired: 'Name is required',
    studentIdRequired: 'Student ID is required',
    majorRequired: 'Major is required',
    reasonRequired: 'Reason is required',
    submitFailed: 'Submission failed, please try again later',
    submitSuccessLoggedIn: 'Your application has been submitted. An admin will notify you via in-site notification after review.',
    submitSuccessGuest: 'Your application has been submitted. An admin will contact you via the details you left. We suggest creating an account to track the status.',
    networkError: 'Network error, please try again later',
    loading: 'Loading...',
  },
  userMenu: {
    more: 'More',
    switch: 'Switch',
    logout: 'Logout',
    admin: 'Admin',
    login: 'Sign in',
    create: 'Create',
    loginToView: 'Sign in to view notifications',
    switchTitle: 'Switch account',
    logoutTitle: 'Sign out',
    switchMessage: 'You will be signed out and redirected to the login page.',
    logoutMessage: 'You will be signed out and redirected to the home page.',
    switchConfirm: 'Confirm switch',
    logoutConfirm: 'Confirm sign out',
    menuAria: 'User menu',
  },
  notifications: {
    ariaLabel: 'Notifications',
    unread: '{count} unread',
    loading: 'Loading...',
    empty: 'No notifications',
    viewAll: 'View all →',
    markAllRead: 'Mark all read',
    retry: 'Retry',
    centerTitle: 'Notification Center',
    centerTitleEn: '/ Notifications',
    unreadCount: 'You have {count} unread notification(s)',
    allReadDone: 'All notifications read',
    header: 'Notifications',
    total: 'Total {total} notifications',
    filterAll: 'All',
    filterUnread: 'Unread',
    filterMention: 'Mentions',
    filterSystem: 'System',
    typeSystem: 'System',
    typeInteraction: 'Interaction',
    typeMention: 'Mention',
    typeFollow: 'Follow',
  },
  userPublic: {
    roleRoot: 'Super Admin',
    roleAdmin: 'Admin',
    roleMember: 'Member',
    joined: 'Joined {date}',
    profileTitle: 'Tech Profile',
    techDir: 'Tech Directions',
    links: 'Links',
    noTags: 'No tech tags',
    github: 'GitHub',
    website: 'Website',
    noGithub: 'GitHub not set',
    noWebsite: 'Website not set',
    communityActivity: 'Community Activity',
    statTopic: 'Topics',
    statReply: 'Replies',
    examTitle: 'Exam Stats',
    examTaken: 'Exams taken',
    examPassed: 'Exams passed',
    examRate: 'Pass rate',
    noExams: 'No exam records',
    recentTopics: 'Recent Topics',
    defaultCat: 'General',
    replies: 'replies',
    likes: 'likes',
    noTopics: 'No topics',
    notFound: 'User not found',
    loadFailed: 'Failed to load',
    backHome: 'Back Home',
    techWeb: 'Web Dev',
    techAi: 'AI / ML',
    techSystem: 'Systems',
    techGame: 'Game Dev',
    techSecurity: 'Security',
    techMobile: 'Mobile',
    techData: 'Data / DB',
    techDevops: 'DevOps / Cloud',
    techGraphics: 'Graphics / Viz',
    techHardware: 'Hardware / IoT',
    techAlgorithm: 'Algo / Contest',
    techDesign: 'UI / Design',
  },
  seo: {
    title: 'CS Association | Explore the Infinite Possibilities of Technology',
    titleTemplate: '%s | CS Association',
    description: 'Official homepage of the university Computer Science Association — uniting tech-loving students to explore programming, algorithms, AI and the open-source world.',
    ogTitle: 'CS Association | Explore the Infinite Possibilities of Technology',
    ogDescription: 'Uniting tech-loving students to explore programming and the open-source world.',
    twitterTitle: 'CS Association | Explore the Infinite Possibilities of Technology',
    twitterDescription: 'Uniting tech-loving students to explore programming and the open-source world.',
    author: 'CS Association',
    appleTitle: 'CS Association',
    ogAlt: 'CS Association Logo',
  },
  home: {
    tagline: 'A Community of Code, Curiosity & Craft',
    titleExplore: 'Explore',
    titleTech: 'Technology',
    titleRest: 'Without Limits',
    introBefore: 'We are the purest tech community on campus. Here, code is not just a tool,',
    introHighlight: 'it is the language of creativity, problem-solving, and the future.',
    joinNow: 'Join Now',
    learnMore: 'Learn More',
    recruiting: 'Recruiting',
    est: 'Computer Association / Est. 2017',
    codeTagline: '2026 / Autumn',
    unnamed: 'Unnamed',
  }
};
