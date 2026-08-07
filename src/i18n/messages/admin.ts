/**
 * @file i18n 消息模块 — admin（自动拆分自 types.ts / languages/*.ts）
 * 包含该业务模块下的所有 namespace：类型 + 中英文语言包。
 */

export interface AdminMessages {
  admin: {
    dashboard: string;
    users: string;
    roles: string;
    events: string;
    announcements: string;
    logs: string;
    messages: string;
    tabRoles: string;
    tabUsers: string;
    tabMessages: string;
    tabJoin: string;
    tabLogs: string;
    tabTitleRoles: string;
    tabTitleUsers: string;
    tabTitleMessages: string;
    tabTitleJoin: string;
    tabTitleLogs: string;
    adminEn: string;
    verifying: string;
    accessDenied: string;
    noAccess: string;
    backHome: string;
    currentAdmin: string;
    rolesTab: string;
  },
  adminUsers: {
    editUser: string;
    resetPassword: string;
    resetToDefault: string;
    deleteUser: string;
    disableUser: string;
    enableUser: string;
    approveReset: string;
    rejectRequest: string;
    targetUser: string;
    targetRequest: string;
    displayName: string;
    bio: string;
    github: string;
    website: string;
    role: string;
    status: string;
    enable: string;
    disable: string;
    saving: string;
    saveChanges: string;
    cancel: string;
    resetting: string;
    resetPasswordBtn: string;
    passwordMin: string;
    resetSessionNote: string;
    resetDefaultConfirm: string;
    resetDefaultDesc: string;
    confirmReset: string;
    deleting: string;
    confirmDelete: string;
    unnamed: string;
    confirmDisable: string;
    confirmEnable: string;
    disableConsequences: string;
    disableC1: string;
    disableC2: string;
    disableC3: string;
    disableC4: string;
    enableNotes: string;
    enableN1: string;
    enableN2: string;
    enableN3: string;
    approveNoteLabel: string;
    approveNotePlaceholder: string;
    processing: string;
    confirmApprove: string;
    rejectNoteLabel: string;
    rejectNotePlaceholder: string;
    confirmReject: string;
    deleteTitle: string;
    deleteMessage: string;
    confirm: string;
    howToAddress: string;
    introOneLine: string;
    newPassword: string;
    defaultPassword: string;
  },
  adminEvents: {
    loadFailed: string;
    operationFailed: string;
    titleEmpty: string;
    titleTooLong: string;
    descTooLong: string;
    monthTooLong: string;
    dateTooLong: string;
    yearTooLong: string;
    topicsTooMany: string;
    tagsTooMany: string;
    tagTooLong: string;
    saveFailed: string;
    eventCreated: string;
    eventUpdated: string;
    networkError: string;
    deleteFailed: string;
    eventDeleted: string;
    panelLabel: string;
    panelDesc: string;
    retry: string;
    loadingEvents: string;
    noEvents: string;
    noEventsDesc: string;
    registrationsTitle: string;
    registrationsCount: string;
    loadingRegistrations: string;
    noRegistrations: string;
    csvExport: string;
    colName: string;
    colEmail: string;
    colStatus: string;
    colRegisteredAt: string;
    colActions: string;
    statusRegistered: string;
    statusCancelled: string;
    statusWaitlisted: string;
    cancelRegistration: string;
    restoreRegistration: string;
    close: string;
    fieldTitle: string;
    titlePlaceholder: string;
    fieldDescription: string;
    descPlaceholder: string;
    fieldMonth: string;
    fieldDate: string;
    fieldYear: string;
    fieldStatus: string;
    statusUnset: string;
    statusUpcoming: string;
    statusOngoing: string;
    statusEnded: string;
    fieldTopics: string;
    topicsHint: string;
    fieldTags: string;
    tagsHint: string;
    fieldPinned: string;
    pinnedOn: string;
    pinnedOff: string;
    pinnedHint: string;
    fieldCapacity: string;
    capacityPlaceholder: string;
    capacityHint: string;
    tabEdit: string;
    tabPreview: string;
    contentPlaceholder: string;
    noContent: string;
    contentHint: string;
    saving: string;
    createEventBtn: string;
    saveChangesBtn: string;
    cancel: string;
    deleteTitle: string;
    deleteMessage: string;
    deleting: string;
    confirmDelete: string;
    actionRegistrations: string;
    actionEdit: string;
    actionDelete: string;
    cardStatus: string;
    cardUpdated: string;
    cardRegs: string;
    eventsCount: string;
    settingTitleMax: string;
    settingTitleMaxDesc: string;
    settingDescMax: string;
    settingDescMaxDesc: string;
    settingMonthMax: string;
    settingMonthMaxDesc: string;
    settingDateMax: string;
    settingDateMaxDesc: string;
    settingYearMax: string;
    settingYearMaxDesc: string;
    settingTagMax: string;
    settingTagMaxDesc: string;
    settingTagsMax: string;
    settingTagsMaxDesc: string;
    settingContentMax: string;
    settingContentMaxDesc: string;
    settingDefaultCapacity: string;
    settingDefaultCapacityDesc: string;
    settingMaxCapacity: string;
    settingMaxCapacityDesc: string;
    settingDefaultPageSize: string;
    settingDefaultPageSizeDesc: string;
    settingMaxPageSize: string;
    settingMaxPageSizeDesc: string;
    saved: string;
    resetFailed: string;
    resetToDefault: string;
    allSaved: string;
    settingsTitle: string;
    saveAll: string;
    closeSettings: string;
    loadingSettings: string;
  },
  adminRoles: {
    loadFailed: string;
    saveFailed: string;
    permissionsUpdated: string;
    keyAndNameRequired: string;
    createFailed: string;
    roleCreated: string;
    updateFailed: string;
    roleUpdated: string;
    deleteFailed: string;
    roleDeleted: string;
    loadingRoles: string;
    loadErrorTitle: string;
    retry: string;
    sectionLabel: string;
    panelDesc: string;
    createRoleBtn: string;
    rolesList: string;
    permissionsCount: string;
    usersCount: string;
    selectRoleHint: string;
    fieldKey: string;
    keyPlaceholder: string;
    keyHint: string;
    fieldDisplayName: string;
    displayNamePlaceholder: string;
    fieldDescription: string;
    initialPermissions: string;
    cancel: string;
    creating: string;
    createRole: string;
    createRoleTitle: string;
    editRoleTitle: string;
    saving: string;
    save: string;
    deleteRoleTitle: string;
    deleteRoleMessage: string;
    deleting: string;
    confirmDelete: string;
    deleteWarningUsers: string;
    noDescription: string;
    usersUsing: string;
    edit: string;
    delete: string;
    unsavedChanges: string;
    permissionsSynced: string;
    reset: string;
    saveChanges: string;
    rootReadOnly: string;
    userReadOnly: string;
    userNoPermissions: string;
  },
  adminNotifications: {
    subTabBroadcast: string;
    subTabAnnouncements: string;
    subTabHistory: string;
    panelLabel: string;
    panelDescBefore: string;
    panelDescHighlight: string;
    panelDescAfter: string;
    panelDescAfterShort: string;
    fieldTitle: string;
    fieldContent: string;
    contentPlaceholder: string;
    contentPlaceholderShort: string;
    broadcastBtn: string;
    clearBtn: string;
    refreshHistoryBtn: string;
    refreshBtn: string;
    refreshing: string;
    sending: string;
    sendingShort: string;
    recordsCount: string;
    noHistory: string;
    recipientsCount: string;
    titleEmpty: string;
    titleTooLong: string;
    contentTooLong: string;
    sendFailed: string;
    sendFailedShort: string;
    sendSuccess: string;
    networkError: string;
    networkErrorShort: string;
  },
  adminJoin: {
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    loadFailed: string;
    reviewFailed: string;
    approveSuccess: string;
    rejectSuccess: string;
    networkError: string;
    loadingLabel: string;
    noApplications: string;
    noApplicationsPending: string;
    noApplicationsApproved: string;
    noApplicationsRejected: string;
    studentIdLabel: string;
    majorLabel: string;
    submittedLabel: string;
    linkedUser: string;
    reasonSectionLabel: string;
    techTagsSectionLabel: string;
    contactSectionLabel: string;
    reviewNoteSectionLabel: string;
    applicantSectionLabel: string;
    approveBtn: string;
    rejectBtn: string;
    approveTitle: string;
    rejectTitle: string;
    applicantInfo: string;
    reviewNoteOptional: string;
    approveNotePlaceholder: string;
    rejectNotePlaceholder: string;
    cancel: string;
    processing: string;
    confirmApprove: string;
    confirmReject: string;
    statusFilterLabel: string;
    resetPending: string;
    resetApproved: string;
    resetRejected: string;
    resetAll: string;
    retry: string;
    loadingResetsLabel: string;
    noResets: string;
    noResetsDesc: string;
    mobileStatusLabel: string;
    mobileCreatedLabel: string;
    mobileResolvedLabel: string;
    mobileNoteLabel: string;
    approveAndResetBtn: string;
    reject: string;
  },
  adminLogs: {
    loadFailed: string;
    deleteFailed: string;
    logDeleted: string;
    networkError: string;
    invalidDays: string;
    batchDeleteFailed: string;
    batchDeleted: string;
    actionFilterLabel: string;
    batchDeleteBtn: string;
    loadingLogsLabel: string;
    noLogs: string;
    noLogsDesc: string;
    colTime: string;
    colDescription: string;
    colAdmin: string;
    colActions: string;
    deleteBtn: string;
    deleteTitle: string;
    deleteMessage: string;
    deleting: string;
    confirmDelete: string;
    batchDeleteTitle: string;
    batchDeleteDesc: string;
    keepDaysLabel: string;
    batchDeleteWarning: string;
    deletingLabel: string;
    confirmBatchDelete: string;
    cancel: string;
  },
  announcementsAdmin: {
    loadFailed: string;
    unknownError: string;
    titleRequired: string;
    actionFailed: string;
    updated: string;
    created: string;
    deleteTitle: string;
    deleteMessage: string;
    confirmDelete: string;
    deleteFailed: string;
    deleted: string;
    levelInfo: string;
    levelWarning: string;
    levelSuccess: string;
    levelError: string;
    countLabel: string;
    newBtn: string;
    close: string;
    editTitle: string;
    createTitle: string;
    fieldTitle: string;
    titlePlaceholder: string;
    fieldContent: string;
    contentPlaceholder: string;
    fieldLevel: string;
    fieldPriority: string;
    fieldExpires: string;
    dismissible: string;
    cancel: string;
    saveChanges: string;
    createBtn: string;
    loading: string;
    empty: string;
    colTitle: string;
    colLevel: string;
    colStatus: string;
    colPriority: string;
    colExpires: string;
    colCreated: string;
    colAction: string;
    statusActive: string;
    statusInactive: string;
    editTooltip: string;
    disableTooltip: string;
    enableTooltip: string;
    deleteTooltip: string;
    noAnnouncements: string;
    creating: string;
    titleEmpty: string;
    createFailed: string;
    disable: string;
    enable: string;
    countPrefix: string;
  },
  authSettings: {
    loadFailed: string;
    retry: string;
    title: string;
    adminRequired: string;
    adminRequiredDesc: string;
    close: string;
    cancel: string;
    disabledTitle: string;
    disabledDesc: string;
    enableBtn: string;
    scanQrDesc: string;
    copySecretTitle: string;
    backupCodesHint: string;
    backupCodesWarn: string;
    confirmEnable: string;
    enabledTitle: string;
    enabledDesc: string;
    regeneratedWarn: string;
    regenerateBackupCodes: string;
    disable2fa: string;
    disableDesc: string;
    regenerateDesc: string;
    confirmDisable: string;
    confirmRegenerate: string;
    loadStatusFailed: string;
    initFailed: string;
    codeRequired: string;
    verifyFailed: string;
    enableSuccess: string;
    disableFailed: string;
    disableSuccess: string;
    regenerateFailed: string;
    regenerateSuccess: string;
    copyFailed: string;
  },
  userList: {
    search: string;
    searchPlaceholder: string;
    role: string;
    status: string;
    all: string;
    admin: string;
    user: string;
    active: string;
    inactive: string;
    loading: string;
    refresh: string;
    retry: string;
    noRecord: string;
    noUsers: string;
    colUser: string;
    colRole: string;
    colStatus: string;
    colCreated: string;
    colActions: string;
    unnamed: string;
    root: string;
    disabled: string;
    notOperable: string;
    edit: string;
    resetPassword: string;
    delete: string;
    enable: string;
    disable: string;
    cantEditSelf: string;
    cantDeleteSelf: string;
    cantDisableSelf: string;
    editRootOnly: string;
    resetRootOnly: string;
    deleteRootOnly: string;
    resetDefault: string;
    resetToDefaultTitle: string;
    activeLabel: string;
    disabledLabel: string;
    totalPages: string;
    prevPage: string;
    nextPage: string;
    loadingUsers: string;
    muteTitle: string;
    muteMessage: string;
    muteConfirm: string;
    mute: string;
    countPrefix: string;
    countSuffix: string;
  },
  dashboard: {
    overview: string;
    loadFailed: string;
    statTotalUsers: string;
    statTopics: string;
    statReplies: string;
    statPosts: string;
    statCategories: string;
    statAnnouncements: string;
  }
}

export const zhCN: AdminMessages = {
  admin: {
    dashboard: '数据看板',
    users: '用户管理',
    roles: '角色管理',
    events: '活动管理',
    announcements: '公告管理',
    logs: '审计日志',
    messages: '消息管理',
    tabRoles: '角色权限 / Roles',
    tabUsers: '用户 / Users',
    tabMessages: '消息 / Messages',
    tabJoin: '入社申请 / Join',
    tabLogs: '日志 / Logs',
    tabTitleRoles: '角色权限',
    tabTitleUsers: '用户管理',
    tabTitleMessages: '消息管理',
    tabTitleJoin: '入社申请',
    tabTitleLogs: '日志管理',
    adminEn: '/ Admin',
    verifying: '验证中 / Verifying...',
    accessDenied: '[ 拒绝访问 / Access Denied ]',
    noAccess: '你没有访问该页面的权限。仅管理员可查看用户管理终端。',
    backHome: '← Back to Home',
    currentAdmin: '当前管理员 {email}',
    rolesTab: '角色权限 / Roles',
  },
  adminUsers: {
    editUser: '[ 编辑用户 / Edit User ]',
    resetPassword: '[ 重置密码 / Reset Password ]',
    resetToDefault: '[ 重置为默认密码 / Reset to Default ]',
    deleteUser: '删除用户',
    disableUser: '禁用用户',
    enableUser: '启用用户',
    approveReset: '[ 批准并重置 / Approve & Reset ]',
    rejectRequest: '[ 拒绝申请 / Reject Request ]',
    targetUser: '目标用户：{email}',
    targetRequest: '目标申请：{email}',
    displayName: 'Display Name',
    bio: 'Bio',
    github: 'GitHub',
    website: '网站 / Website',
    role: '[ 角色 / Role ]',
    status: '[ 状态 / Status ]',
    enable: '启用',
    disable: '禁用',
    saving: '保存中 / Saving...',
    saveChanges: '保存更改 / Save Changes →',
    cancel: '取消',
    resetting: 'Resetting...',
    resetPasswordBtn: 'Reset Password →',
    passwordMin: '至少 {min} 位',
    resetSessionNote: '重置后该用户的所有登录会话将立即失效，需使用新密码重新登录。',
    resetDefaultConfirm: '确认将该用户密码重置为默认密码？',
    resetDefaultDesc: '重置后密码将变为 {password}，该用户的所有登录会话将立即失效，需使用默认密码重新登录。',
    confirmReset: '确认重置 / Confirm →',
    deleting: '删除中...',
    confirmDelete: '确认删除',
    unnamed: '未命名',
    confirmDisable: '确认禁用',
    confirmEnable: '确认启用',
    disableConsequences: '禁用后果 / Consequences：',
    disableC1: '该用户将无法登录系统',
    disableC2: '该用户将无法创建新帖或发表回复',
    disableC3: '该用户已发布的内容仍保留，不会删除',
    disableC4: '该用户的活动报名将保持有效',
    enableNotes: '启用说明 / Notes：',
    enableN1: '该用户将恢复登录权限',
    enableN2: '该用户将恢复发帖和回复权限',
    enableN3: '已发布的内容不会受影响',
    approveNoteLabel: '管理员备注（可选）/ Admin Note',
    approveNotePlaceholder: '管理员备注（可选）',
    processing: 'Processing...',
    confirmApprove: 'Confirm Approve →',
    rejectNoteLabel: '拒绝备注（可选）/ Reject Note',
    rejectNotePlaceholder: '拒绝备注（可选）',
    confirmReject: 'Confirm Reject →',
    deleteTitle: '删除用户',
    deleteMessage: '确认删除该用户？此操作不可撤销。',
    confirm: '确认删除',
    howToAddress: '如何称呼？',
    introOneLine: '一句话介绍',
    newPassword: '新密码 / New Password',
    defaultPassword: 'FZTBU_CS',
  },
  adminEvents: {
    loadFailed: '加载失败',
    operationFailed: '操作失败',
    titleEmpty: '标题不能为空',
    titleTooLong: '标题不能超过 120 字符',
    descTooLong: '描述不能超过 500 字符',
    monthTooLong: '月份不能超过 8 字符',
    dateTooLong: '日期不能超过 32 字符',
    yearTooLong: '年份不能超过 8 字符',
    topicsTooMany: '主题数量不能超过 10',
    tagsTooMany: '标签数量不能超过 10',
    tagTooLong: '单个主题 / 标签不能超过 40 字符',
    saveFailed: '保存失败，请稍后再试',
    eventCreated: '已创建活动「{title}」',
    eventUpdated: '已更新活动「{title}」',
    networkError: '网络错误，请稍后再试',
    deleteFailed: '删除失败，请稍后再试',
    eventDeleted: '已删除活动「{title}」',
    panelLabel: '[ 活动管理 / Events ]',
    panelDesc: '按年份分组管理活动 · 已结束的计划将自动归档',
    retry: '重试',
    loadingEvents: '加载活动中 / Loading...',
    noEvents: '[ 暂无活动 / No Event ]',
    noEventsDesc: '还没有任何活动，点击下方按钮创建第一条。',
    registrationsTitle: '[ 报名列表 / Registrations · {title} ]',
    registrationsCount: '{count} 人已报名',
    loadingRegistrations: '加载报名数据中...',
    noRegistrations: '暂无报名记录',
    csvExport: 'CSV 导出 / Export',
    colName: '姓名 / Name',
    colEmail: '邮箱 / Email',
    colStatus: '状态 / Status',
    colRegisteredAt: '报名时间',
    colActions: '操作',
    statusRegistered: '已报名',
    statusCancelled: '已取消',
    statusWaitlisted: '候补',
    cancelRegistration: '取消',
    restoreRegistration: '恢复',
    close: '关闭',
    fieldTitle: '标题 / Title',
    titlePlaceholder: '例如：秋季招新',
    fieldDescription: '描述 / Description',
    descPlaceholder: '一句话介绍活动内容',
    fieldMonth: '月份 / Month',
    fieldDate: '日期 / Date',
    fieldYear: '年份 / Year',
    fieldStatus: '[ 状态 / Status ]',
    statusUnset: '未设置',
    statusUpcoming: '即将开始',
    statusOngoing: '进行中',
    statusEnded: '已结束',
    fieldTopics: '主题 / Topics',
    topicsHint: '逗号分隔，单主题≤40字符',
    fieldTags: '标签 / Tags',
    tagsHint: '逗号分隔，单标签≤40字符',
    fieldPinned: '[ 置顶 / Pinned ]',
    pinnedOn: '📌 已置顶',
    pinnedOff: '置顶 / Pin',
    pinnedHint: '置顶活动将始终排在最前',
    fieldCapacity: '容量 / Capacity',
    capacityPlaceholder: '0 = 不限',
    capacityHint: '0 表示不限名额',
    tabEdit: '编辑 / Edit',
    tabPreview: '预览 / Preview',
    contentPlaceholder: '可选 — 活动详情 Markdown，渲染在活动详情页 Details 区\n\n## 示例\n- 时间地点\n- 议程安排\n- 注意事项',
    noContent: '暂无内容 — 切换到「编辑」Tab 写入 Markdown',
    contentHint: '支持 Markdown 语法，最多 10000 字符；不填则不显示 Details 区',
    saving: '保存中 / Saving...',
    createEventBtn: '创建活动 / Create Event →',
    saveChangesBtn: '保存更改 / Save Changes →',
    cancel: '取消',
    deleteTitle: '删除活动',
    deleteMessage: '确认删除该活动？此操作不可撤销。',
    deleting: '删除中...',
    confirmDelete: '确认删除',
    actionRegistrations: '报名',
    actionEdit: '编辑',
    actionDelete: '删除',
    cardStatus: '状态 / Status',
    cardUpdated: '更新 / Updated',
    cardRegs: '报名 / Regs',
    eventsCount: '{count} 活动',
    settingTitleMax: '标题最大长度',
    settingTitleMaxDesc: '活动标题字符上限',
    settingDescMax: '描述最大长度',
    settingDescMaxDesc: '活动简介字符上限',
    settingMonthMax: '月份最大长度',
    settingMonthMaxDesc: '月份字段字符上限',
    settingDateMax: '日期最大长度',
    settingDateMaxDesc: '日期字段字符上限',
    settingYearMax: '年份最大长度',
    settingYearMaxDesc: '年份字段字符上限',
    settingTagMax: '标签最大长度',
    settingTagMaxDesc: '单个标签字符上限',
    settingTagsMax: '标签最大数量',
    settingTagsMaxDesc: '每活动标签数上限',
    settingContentMax: '内容最大长度',
    settingContentMaxDesc: 'Markdown 详情字符上限',
    settingDefaultCapacity: '默认容量',
    settingDefaultCapacityDesc: '新建活动默认容量 (0=不限)',
    settingMaxCapacity: '最大容量',
    settingMaxCapacityDesc: '单活动最大容量限制',
    settingDefaultPageSize: '默认每页数量',
    settingDefaultPageSizeDesc: '活动列表默认每页条数',
    settingMaxPageSize: '最大每页数量',
    settingMaxPageSizeDesc: '活动列表每页最大条数',
    saved: '已保存',
    resetFailed: '重置失败',
    resetToDefault: '已重置为默认值',
    allSaved: '全部设置已保存',
    settingsTitle: '活动设置',
    saveAll: '保存全部 ({count}) →',
    closeSettings: '关闭设置',
    loadingSettings: '加载设置中...',
  },
  adminRoles: {
    loadFailed: '加载失败',
    saveFailed: '保存失败',
    permissionsUpdated: '权限已更新',
    keyAndNameRequired: '角色 key 与名称必填',
    createFailed: '创建失败',
    roleCreated: '角色 {name} 已创建',
    updateFailed: '更新失败',
    roleUpdated: '角色已更新',
    deleteFailed: '删除失败',
    roleDeleted: '角色已删除',
    loadingRoles: '加载角色数据 / Loading roles...',
    loadErrorTitle: '[ 加载失败 / Load Error ]',
    retry: '重试 / Retry',
    sectionLabel: '[ 00 / Roles & Permissions ]',
    panelDesc: '管理系统所有角色的权限组合。内置角色（root/admin/user 等）的权限规则不可修改，但可创建自定义角色并精确分配权限点，为后续扩展提供基础。',
    createRoleBtn: '+ 创建角色 / New Role',
    rolesList: '角色列表 ({count})',
    permissionsCount: '{count} 项权限',
    usersCount: '{count} 用户',
    selectRoleHint: '选择左侧角色查看权限配置 / Select a role',
    fieldKey: '角色 key',
    keyPlaceholder: '如 content_editor / exam_reviewer',
    keyHint: '小写字母开头，仅含 a-z / 0-9 / _，长度 2-32。创建后不可修改。',
    fieldDisplayName: '角色名称',
    displayNamePlaceholder: '如 内容编辑 / 考试审核员',
    fieldDescription: '角色描述',
    initialPermissions: '[ 初始权限 / Initial Permissions ]（{count} 项已选）',
    cancel: '取消',
    creating: '创建中...',
    createRole: '创建角色',
    createRoleTitle: '创建自定义角色',
    editRoleTitle: '编辑角色 / {key}',
    saving: '保存中...',
    save: '保存',
    deleteRoleTitle: '删除角色',
    deleteRoleMessage: '即将删除角色 {name} ({key})。此操作不可恢复。',
    deleting: '删除中...',
    confirmDelete: '确认删除',
    deleteWarningUsers: '警告：该角色仍被 {count} 个用户使用，无法删除。',
    noDescription: '（无描述）',
    usersUsing: '{count} 个用户使用',
    edit: '编辑',
    delete: '删除',
    unsavedChanges: '● 有未保存的修改',
    permissionsSynced: '权限已同步',
    reset: '撤销',
    saveChanges: '保存修改',
    rootReadOnly: '● 超级管理员拥有所有权限（含 root 专属），不可修改',
    userReadOnly: '● 普通用户无管理权限，不可修改',
    userNoPermissions: '普通用户角色无任何管理权限',
  },
  adminNotifications: {
    subTabBroadcast: '群发通知',
    subTabAnnouncements: '公告管理',
    subTabHistory: '广播历史',
    panelLabel: '[ 群发 / Broadcast ]',
    panelDescBefore: '群发通知会即时推送给所有',
    panelDescHighlight: ' 活跃用户 ',
    panelDescAfter: '（未禁用）。新活动发布时也会自动生成一条活动通知，无需手动触发。',
    panelDescAfterShort: '（未禁用）。',
    fieldTitle: '[ 标题 / Title ]',
    fieldContent: '[ 正文 / Content ]',
    contentPlaceholder: '通知正文（可选，最多 500 字符，支持纯文本）',
    contentPlaceholderShort: '通知正文（可选，最多 500 字符）',
    broadcastBtn: '群发 / Broadcast →',
    clearBtn: '清空',
    refreshHistoryBtn: '刷新历史 / Refresh',
    refreshBtn: '刷新',
    refreshing: '刷新中...',
    sending: '发送中 / Sending...',
    sendingShort: '发送中...',
    recordsCount: '{count} 条记录',
    noHistory: '暂无群发记录',
    recipientsCount: '{count} 收件人',
    titleEmpty: '标题不能为空',
    titleTooLong: '标题不能超过 120 字符',
    contentTooLong: '内容不能超过 500 字符',
    sendFailed: '发送失败，请稍后再试',
    sendFailedShort: '发送失败',
    sendSuccess: '已群发通知给 {count} 位用户',
    networkError: '网络错误，请稍后再试',
    networkErrorShort: '网络错误',
  },
  adminJoin: {
    statusPending: '待审',
    statusApproved: '已通过',
    statusRejected: '已拒绝',
    loadFailed: '加载失败',
    reviewFailed: '审批失败，请稍后再试',
    approveSuccess: '已通过申请',
    rejectSuccess: '已拒绝申请',
    networkError: '网络错误，请稍后再试',
    loadingLabel: '加载中 / Loading...',
    noApplications: '[ 暂无申请 / No Applications ]',
    noApplicationsPending: '当前没有待审核的入社申请。',
    noApplicationsApproved: '尚未通过任何申请。',
    noApplicationsRejected: '尚未拒绝任何申请。',
    studentIdLabel: '学号 / {id}',
    majorLabel: '专业 / {major}',
    submittedLabel: '提交 / {date}',
    linkedUser: '已关联用户',
    reasonSectionLabel: '[ 申请理由 / Reason ]',
    techTagsSectionLabel: '[ 技术方向 / Tech Tags ]',
    contactSectionLabel: '[ 联系方式 / Contact ]',
    reviewNoteSectionLabel: '[ 审批备注 / Review Note ]',
    applicantSectionLabel: '[ 申请人 / Applicant ]',
    approveBtn: '✓ 通过',
    rejectBtn: '✕ 拒绝',
    approveTitle: '通过申请 / Approve',
    rejectTitle: '拒绝申请 / Reject',
    applicantInfo: '学号 {studentId} · 专业 {major}',
    reviewNoteOptional: '审批备注（可选）',
    approveNotePlaceholder: '例如：欢迎加入，请联系 XXX 安排后续',
    rejectNotePlaceholder: '例如：当前方向名额已满，建议下学期再申请',
    cancel: '取消',
    processing: '处理中...',
    confirmApprove: '确认通过 →',
    confirmReject: '确认拒绝 →',
    statusFilterLabel: '[ 状态筛选 / Status Filter ]',
    resetPending: '待处理',
    resetApproved: '已批准',
    resetRejected: '已拒绝',
    resetAll: '全部',
    retry: '重试',
    loadingResetsLabel: '加载申请中 / Loading...',
    noResets: '[ 暂无申请 / No Request ]',
    noResetsDesc: '没有符合条件的密码重置申请。',
    mobileStatusLabel: '状态 / Status',
    mobileCreatedLabel: '创建 / Created',
    mobileResolvedLabel: '处理 / Resolved',
    mobileNoteLabel: '备注 / Note',
    approveAndResetBtn: '批准并重置',
    reject: '拒绝',
  },
  adminLogs: {
    loadFailed: '加载失败',
    deleteFailed: '删除失败，请稍后再试',
    logDeleted: '已删除日志',
    networkError: '网络错误，请稍后再试',
    invalidDays: '请输入有效的天数',
    batchDeleteFailed: '批量删除失败，请稍后再试',
    batchDeleted: '已批量删除 {count} 条日志',
    actionFilterLabel: '[ 操作类型筛选 / Action Filter ]',
    batchDeleteBtn: '批量删除',
    loadingLogsLabel: '加载日志中 / Loading...',
    noLogs: '[ 暂无日志 / No Logs ]',
    noLogsDesc: '没有符合条件的审计日志记录。',
    colTime: '时间 / Time',
    colDescription: '操作描述 / Description',
    colAdmin: '操作者 / Admin',
    colActions: '操作',
    deleteBtn: '删除',
    deleteTitle: '删除日志',
    deleteMessage: '确认删除该条审计日志？此操作不可撤销。',
    deleting: '删除中...',
    confirmDelete: '确认删除',
    batchDeleteTitle: '[ 批量删除日志 / Batch Delete ]',
    batchDeleteDesc: '删除早于指定天数的审计日志。',
    keepDaysLabel: '保留最近 N 天的日志 / Keep logs within N days',
    batchDeleteWarning: '此操作将删除 {days} 天前的所有审计日志，且不可撤销。批量删除本身也会记录一条审计日志。',
    deletingLabel: '删除中 / Deleting...',
    confirmBatchDelete: '确认批量删除 / Confirm →',
    cancel: '取消',
  },
  announcementsAdmin: {
    loadFailed: '获取公告列表失败',
    unknownError: '未知错误',
    titleRequired: '标题不能为空',
    actionFailed: '操作失败',
    updated: '公告已更新',
    created: '公告已创建',
    deleteTitle: '删除公告',
    deleteMessage: '确定删除公告「{title}」？此操作不可撤销。',
    confirmDelete: '确认删除',
    deleteFailed: '删除失败',
    deleted: '公告已删除',
    levelInfo: '信息',
    levelWarning: '警告',
    levelSuccess: '成功',
    levelError: '重要',
    countLabel: '[ {count} 条公告 ]',
    newBtn: '新建公告',
    close: '关闭',
    editTitle: '编辑公告',
    createTitle: '新建公告',
    fieldTitle: '标题 *',
    titlePlaceholder: '公告标题',
    fieldContent: '内容',
    contentPlaceholder: '可选，公告详细内容',
    fieldLevel: '级别',
    fieldPriority: '优先级',
    fieldExpires: '过期时间',
    dismissible: '可关闭',
    cancel: '取消',
    saveChanges: '保存修改',
    createBtn: '创建公告',
    loading: '加载中...',
    empty: '暂无公告，点击「新建公告」创建第一条。',
    colTitle: '标题',
    colLevel: '级别',
    colStatus: '状态',
    colPriority: '优先级',
    colExpires: '过期',
    colCreated: '创建',
    colAction: '操作',
    statusActive: '生效中',
    statusInactive: '已关闭',
    editTooltip: '编辑',
    disableTooltip: '关闭',
    enableTooltip: '激活',
    deleteTooltip: '删除',
    noAnnouncements: '暂无公告',
    creating: '创建中...',
    titleEmpty: '标题不能为空',
    createFailed: '创建失败',
    disable: '停用',
    enable: '启用',
    countPrefix: '共 ',
  },
  authSettings: {
    loadFailed: '加载失败',
    retry: '重试',
    title: '双因素认证',
    adminRequired: '管理员账号需要启用 2FA',
    adminRequiredDesc: '你的账号角色要求启用双因素认证后才能继续使用全部功能。',
    close: '关闭',
    cancel: '取消',
    disabledTitle: '双因素认证未启用',
    disabledDesc: '启用后，登录时除密码外还需输入由认证 App（如 Google Authenticator、1Password）生成的 6 位验证码，显著提升账号安全性。',
    enableBtn: '启用双因素认证 →',
    scanQrDesc: '使用认证 App 扫描二维码，或手动输入下方密钥。',
    copySecretTitle: '复制密钥',
    backupCodesHint: '一次性使用',
    backupCodesWarn: '⚠ 请立即保存以下备用码。丢失认证设备时可用其完成登录，每个仅可使用一次。',
    confirmEnable: '确认启用 →',
    enabledTitle: '2FA 已启用',
    enabledDesc: '登录时需要输入由认证 App 生成的 6 位验证码。',
    regeneratedWarn: '⚠ 旧备用码已失效。请立即保存以下新备用码。',
    regenerateBackupCodes: '重新生成备用码',
    disable2fa: '禁用 2FA',
    disableDesc: '禁用后账号将仅由密码保护。请输入当前认证 App 生成的 6 位验证码以确认。',
    regenerateDesc: '请输入当前认证 App 生成的 6 位验证码，验证后将生成一组新的备用码（旧码立即失效）。',
    confirmDisable: '确认禁用',
    confirmRegenerate: '确认重新生成 →',
    loadStatusFailed: '加载 2FA 状态失败',
    initFailed: '初始化 2FA 失败',
    codeRequired: '请输入 6 位数字验证码',
    verifyFailed: '验证失败',
    enableSuccess: '双因素认证已启用',
    disableFailed: '禁用失败',
    disableSuccess: '2FA 已禁用',
    regenerateFailed: '重新生成失败',
    regenerateSuccess: '备用码已重新生成',
    copyFailed: '复制失败，请手动选择文本复制',
  },
  userList: {
    search: '[ 搜索 / Search ]',
    searchPlaceholder: '搜索 email 或显示名...',
    role: '[ 角色 / Role ]',
    status: '[ 状态 / Status ]',
    all: '全部',
    admin: '管理员',
    user: '用户',
    active: '启用',
    inactive: '禁用',
    loading: 'Loading',
    refresh: 'Refresh',
    retry: '重试',
    noRecord: '[ 暂无记录 / No Record ]',
    noUsers: '没有符合条件的用户。',
    colUser: '用户 / User',
    colRole: '角色 / Role',
    colStatus: '状态 / Status',
    colCreated: '创建 / Created',
    colActions: '操作 / Actions',
    unnamed: '未命名',
    root: '● Root',
    disabled: '● Disabled',
    notOperable: '— 不可操作 —',
    edit: '编辑',
    resetPassword: '重置密码',
    delete: '删除',
    enable: '启用',
    disable: '禁用',
    cantEditSelf: '不能编辑自己',
    cantDeleteSelf: '不能删除自己',
    cantDisableSelf: '不能禁用自己',
    editRootOnly: '编辑（仅超级管理员）',
    resetRootOnly: '自定义重置密码（仅超级管理员）',
    deleteRootOnly: '硬删除（仅超级管理员）',
    resetDefault: '重置为默认密码 FZTBU_CS',
    resetToDefaultTitle: '重置密码',
    activeLabel: '● Active',
    disabledLabel: '● Disabled',
    totalPages: '共 {total} 条 · 第 {page} / {pages} 页',
    prevPage: '← 上一页',
    nextPage: '下一页 →',
    loadingUsers: '加载用户中 / Loading...',
    muteTitle: '禁言用户',
    muteMessage: '确认禁言「{name}」吗？\n禁言后该用户将无法发帖和回复。',
    muteConfirm: '确认禁言',
    mute: '禁言',
    countPrefix: '共 ',
    countSuffix: ' 位用户',
  },
  dashboard: {
    overview: '社区运营数据概览',
    loadFailed: '加载失败',
    statTotalUsers: '总用户',
    statTopics: '讨论主题',
    statReplies: '回复/评论',
    statPosts: '文章内容',
    statCategories: '版块',
    statAnnouncements: '公告',
  }
};

export const en: AdminMessages = {
  admin: {
    dashboard: 'Dashboard',
    users: 'Users',
    roles: 'Roles',
    events: 'Events',
    announcements: 'Announcements',
    logs: 'Audit logs',
    messages: 'Messages',
    tabRoles: 'Roles / 角色权限',
    tabUsers: 'Users / 用户',
    tabMessages: 'Messages / 消息',
    tabJoin: 'Join / 入社申请',
    tabLogs: 'Logs / 日志',
    tabTitleRoles: 'Roles & Permissions',
    tabTitleUsers: 'User Management',
    tabTitleMessages: 'Message Management',
    tabTitleJoin: 'Join Requests',
    tabTitleLogs: 'Log Management',
    adminEn: '/ Admin',
    verifying: 'Verifying / 验证中...',
    accessDenied: '[ Access Denied / 拒绝访问 ]',
    noAccess: 'You do not have permission to access this page. Only administrators can view the user management console.',
    backHome: '← Back to Home',
    currentAdmin: 'Current admin {email}',
    rolesTab: 'Roles / 角色权限',
  },
  adminUsers: {
    editUser: '[ Edit User / 编辑用户 ]',
    resetPassword: '[ Reset Password / 重置密码 ]',
    resetToDefault: '[ Reset to Default / 重置为默认密码 ]',
    deleteUser: 'Delete User',
    disableUser: 'Disable User',
    enableUser: 'Enable User',
    approveReset: '[ Approve & Reset / 批准并重置 ]',
    rejectRequest: '[ Reject Request / 拒绝申请 ]',
    targetUser: 'Target user: {email}',
    targetRequest: 'Target request: {email}',
    displayName: 'Display Name',
    bio: 'Bio',
    github: 'GitHub',
    website: 'Website / 网站',
    role: '[ Role / 角色 ]',
    status: '[ Status / 状态 ]',
    enable: 'Enable',
    disable: 'Disable',
    saving: 'Saving...',
    saveChanges: 'Save Changes →',
    cancel: 'Cancel',
    resetting: 'Resetting...',
    resetPasswordBtn: 'Reset Password →',
    passwordMin: 'At least {min} chars',
    resetSessionNote: 'All sessions for this user will be revoked immediately; they must sign in again with the new password.',
    resetDefaultConfirm: 'Reset this user\'s password to the default?',
    resetDefaultDesc: 'The password will become {password}, and all sessions will be revoked immediately.',
    confirmReset: 'Confirm Reset →',
    deleting: 'Deleting...',
    confirmDelete: 'Confirm Delete',
    unnamed: 'Unnamed',
    confirmDisable: 'Confirm Disable',
    confirmEnable: 'Confirm Enable',
    disableConsequences: 'Consequences / 禁用后果：',
    disableC1: 'The user will not be able to sign in',
    disableC2: 'The user cannot create posts or reply',
    disableC3: 'Existing published content is retained, not deleted',
    disableC4: 'Event registrations remain valid',
    enableNotes: 'Notes / 启用说明：',
    enableN1: 'The user regains sign-in access',
    enableN2: 'The user regains posting and replying',
    enableN3: 'Existing content is unaffected',
    approveNoteLabel: 'Admin note (optional) / 管理员备注',
    approveNotePlaceholder: 'Admin note (optional)',
    processing: 'Processing...',
    confirmApprove: 'Confirm Approve →',
    rejectNoteLabel: 'Reject note (optional) / 拒绝备注',
    rejectNotePlaceholder: 'Reject note (optional)',
    confirmReject: 'Confirm Reject →',
    deleteTitle: 'Delete User',
    deleteMessage: 'Delete this user? This action cannot be undone.',
    confirm: 'Confirm Delete',
    howToAddress: 'How should we address you?',
    introOneLine: 'One-line intro',
    newPassword: 'New Password / 新密码',
    defaultPassword: 'FZTBU_CS',
  },
  adminEvents: {
    loadFailed: 'Load failed',
    operationFailed: 'Operation failed',
    titleEmpty: 'Title cannot be empty',
    titleTooLong: 'Title cannot exceed 120 characters',
    descTooLong: 'Description cannot exceed 500 characters',
    monthTooLong: 'Month cannot exceed 8 characters',
    dateTooLong: 'Date cannot exceed 32 characters',
    yearTooLong: 'Year cannot exceed 8 characters',
    topicsTooMany: 'Number of topics cannot exceed 10',
    tagsTooMany: 'Number of tags cannot exceed 10',
    tagTooLong: 'A single topic / tag cannot exceed 40 characters',
    saveFailed: 'Failed to save, please try again later',
    eventCreated: 'Event "{title}" created',
    eventUpdated: 'Event "{title}" updated',
    networkError: 'Network error, please try again later',
    deleteFailed: 'Failed to delete, please try again later',
    eventDeleted: 'Event "{title}" deleted',
    panelLabel: '[ 活动管理 / Events ]',
    panelDesc: 'Manage events grouped by year · ended events are archived automatically',
    retry: 'Retry',
    loadingEvents: '加载活动中 / Loading...',
    noEvents: '[ 暂无活动 / No Event ]',
    noEventsDesc: 'No events yet. Click the button below to create the first one.',
    registrationsTitle: '[ 报名列表 / Registrations · {title} ]',
    registrationsCount: '{count} registered',
    loadingRegistrations: 'Loading registrations...',
    noRegistrations: 'No registration records',
    csvExport: 'CSV 导出 / Export',
    colName: '姓名 / Name',
    colEmail: '邮箱 / Email',
    colStatus: '状态 / Status',
    colRegisteredAt: 'Registered At',
    colActions: 'Actions',
    statusRegistered: 'Registered',
    statusCancelled: 'Cancelled',
    statusWaitlisted: 'Waitlisted',
    cancelRegistration: 'Cancel',
    restoreRegistration: 'Restore',
    close: 'Close',
    fieldTitle: '标题 / Title',
    titlePlaceholder: 'e.g. Autumn Recruitment',
    fieldDescription: '描述 / Description',
    descPlaceholder: 'One-line description of the event',
    fieldMonth: '月份 / Month',
    fieldDate: '日期 / Date',
    fieldYear: '年份 / Year',
    fieldStatus: '[ 状态 / Status ]',
    statusUnset: 'Not set',
    statusUpcoming: 'Upcoming',
    statusOngoing: 'Ongoing',
    statusEnded: 'Ended',
    fieldTopics: '主题 / Topics',
    topicsHint: 'Comma-separated, max 40 chars per topic',
    fieldTags: '标签 / Tags',
    tagsHint: 'Comma-separated, max 40 chars per tag',
    fieldPinned: '[ 置顶 / Pinned ]',
    pinnedOn: '📌 Pinned',
    pinnedOff: 'Pin',
    pinnedHint: 'Pinned events always appear first',
    fieldCapacity: '容量 / Capacity',
    capacityPlaceholder: '0 = unlimited',
    capacityHint: '0 means unlimited capacity',
    tabEdit: '编辑 / Edit',
    tabPreview: '预览 / Preview',
    contentPlaceholder: 'Optional — Event details Markdown, rendered in the Details section of the event page\n\n## Example\n- Time & venue\n- Agenda\n- Notes',
    noContent: 'No content — switch to the "Edit" tab to write Markdown',
    contentHint: 'Supports Markdown syntax, up to 10000 characters; leave empty to hide the Details section',
    saving: '保存中 / Saving...',
    createEventBtn: '创建活动 / Create Event →',
    saveChangesBtn: '保存更改 / Save Changes →',
    cancel: 'Cancel',
    deleteTitle: 'Delete Event',
    deleteMessage: 'Delete this event? This action cannot be undone.',
    deleting: 'Deleting...',
    confirmDelete: 'Confirm Delete',
    actionRegistrations: 'Registrations',
    actionEdit: 'Edit',
    actionDelete: 'Delete',
    cardStatus: '状态 / Status',
    cardUpdated: '更新 / Updated',
    cardRegs: '报名 / Regs',
    eventsCount: '{count} events',
    settingTitleMax: 'Title max length',
    settingTitleMaxDesc: 'Character limit for event title',
    settingDescMax: 'Description max length',
    settingDescMaxDesc: 'Character limit for event description',
    settingMonthMax: 'Month max length',
    settingMonthMaxDesc: 'Character limit for month field',
    settingDateMax: 'Date max length',
    settingDateMaxDesc: 'Character limit for date field',
    settingYearMax: 'Year max length',
    settingYearMaxDesc: 'Character limit for year field',
    settingTagMax: 'Tag max length',
    settingTagMaxDesc: 'Character limit per single tag',
    settingTagsMax: 'Tags max count',
    settingTagsMaxDesc: 'Max number of tags per event',
    settingContentMax: 'Content max length',
    settingContentMaxDesc: 'Character limit for Markdown details',
    settingDefaultCapacity: 'Default capacity',
    settingDefaultCapacityDesc: 'Default capacity for new events (0=unlimited)',
    settingMaxCapacity: 'Max capacity',
    settingMaxCapacityDesc: 'Max capacity limit per event',
    settingDefaultPageSize: 'Default page size',
    settingDefaultPageSizeDesc: 'Default items per page for event list',
    settingMaxPageSize: 'Max page size',
    settingMaxPageSizeDesc: 'Max items per page for event list',
    saved: 'Saved',
    resetFailed: 'Failed to reset',
    resetToDefault: 'Reset to default',
    allSaved: 'All settings saved',
    settingsTitle: 'Event Settings',
    saveAll: 'Save All ({count}) →',
    closeSettings: 'Close settings',
    loadingSettings: 'Loading settings...',
  },
  adminRoles: {
    loadFailed: 'Failed to load',
    saveFailed: 'Failed to save',
    permissionsUpdated: 'Permissions updated',
    keyAndNameRequired: 'Role key and name are required',
    createFailed: 'Failed to create',
    roleCreated: 'Role {name} created',
    updateFailed: 'Failed to update',
    roleUpdated: 'Role updated',
    deleteFailed: 'Failed to delete',
    roleDeleted: 'Role deleted',
    loadingRoles: '加载角色数据 / Loading roles...',
    loadErrorTitle: '[ 加载失败 / Load Error ]',
    retry: '重试 / Retry',
    sectionLabel: '[ 00 / Roles & Permissions ]',
    panelDesc: 'Manage permission combinations for all roles in the system. Built-in roles (root/admin/user, etc.) have fixed permission rules that cannot be modified, but you can create custom roles and precisely assign permission points to provide a foundation for future expansion.',
    createRoleBtn: '+ 创建角色 / New Role',
    rolesList: 'Role list ({count})',
    permissionsCount: '{count} permissions',
    usersCount: '{count} users',
    selectRoleHint: '选择左侧角色查看权限配置 / Select a role',
    fieldKey: 'Role key',
    keyPlaceholder: 'e.g. content_editor / exam_reviewer',
    keyHint: 'Must start with a lowercase letter, contain only a-z / 0-9 / _, and be 2-32 characters long. Cannot be changed after creation.',
    fieldDisplayName: 'Role name',
    displayNamePlaceholder: 'e.g. Content Editor / Exam Reviewer',
    fieldDescription: 'Role description',
    initialPermissions: '[ 初始权限 / Initial Permissions ]（{count} 项已选）',
    cancel: 'Cancel',
    creating: 'Creating...',
    createRole: 'Create role',
    createRoleTitle: 'Create custom role',
    editRoleTitle: 'Edit role / {key}',
    saving: 'Saving...',
    save: 'Save',
    deleteRoleTitle: 'Delete role',
    deleteRoleMessage: 'You are about to delete role {name} ({key}). This action cannot be undone.',
    deleting: 'Deleting...',
    confirmDelete: 'Confirm delete',
    deleteWarningUsers: 'Warning: This role is still used by {count} users and cannot be deleted.',
    noDescription: '(No description)',
    usersUsing: 'Used by {count} users',
    edit: 'Edit',
    delete: 'Delete',
    unsavedChanges: '● Unsaved changes',
    permissionsSynced: 'Permissions synced',
    reset: 'Undo',
    saveChanges: 'Save changes',
    rootReadOnly: '● Super admin has all permissions (including root-only), cannot be modified',
    userReadOnly: '● Regular users have no admin permissions, cannot be modified',
    userNoPermissions: 'The regular user role has no admin permissions',
  },
  adminNotifications: {
    subTabBroadcast: 'Broadcast',
    subTabAnnouncements: 'Announcements',
    subTabHistory: 'History',
    panelLabel: '[ 群发 / Broadcast ]',
    panelDescBefore: 'Broadcast notifications are pushed instantly to all',
    panelDescHighlight: ' Active users ',
    panelDescAfter: '(not disabled). A notification is also auto-generated when a new event is published — no manual trigger needed.',
    panelDescAfterShort: '(not disabled).',
    fieldTitle: '[ 标题 / Title ]',
    fieldContent: '[ 正文 / Content ]',
    contentPlaceholder: 'Notification body (optional, up to 500 chars, plain text supported)',
    contentPlaceholderShort: 'Notification body (optional, up to 500 chars)',
    broadcastBtn: '群发 / Broadcast →',
    clearBtn: 'Clear',
    refreshHistoryBtn: '刷新历史 / Refresh',
    refreshBtn: 'Refresh',
    refreshing: 'Refreshing...',
    sending: '发送中 / Sending...',
    sendingShort: 'Sending...',
    recordsCount: '{count} records',
    noHistory: 'No broadcast records',
    recipientsCount: '{count} recipients',
    titleEmpty: 'Title cannot be empty',
    titleTooLong: 'Title cannot exceed 120 characters',
    contentTooLong: 'Content cannot exceed 500 characters',
    sendFailed: 'Failed to send, please try again later',
    sendFailedShort: 'Failed to send',
    sendSuccess: 'Broadcast sent to {count} users',
    networkError: 'Network error, please try again later',
    networkErrorShort: 'Network error',
  },
  adminJoin: {
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    loadFailed: 'Failed to load',
    reviewFailed: 'Failed to review, please try again later',
    approveSuccess: 'Application approved',
    rejectSuccess: 'Application rejected',
    networkError: 'Network error, please try again later',
    loadingLabel: '加载中 / Loading...',
    noApplications: '[ 暂无申请 / No Applications ]',
    noApplicationsPending: 'No pending membership applications.',
    noApplicationsApproved: 'No applications have been approved yet.',
    noApplicationsRejected: 'No applications have been rejected yet.',
    studentIdLabel: 'Student ID / {id}',
    majorLabel: 'Major / {major}',
    submittedLabel: 'Submitted / {date}',
    linkedUser: 'Linked user',
    reasonSectionLabel: '[ 申请理由 / Reason ]',
    techTagsSectionLabel: '[ 技术方向 / Tech Tags ]',
    contactSectionLabel: '[ 联系方式 / Contact ]',
    reviewNoteSectionLabel: '[ 审批备注 / Review Note ]',
    applicantSectionLabel: '[ 申请人 / Applicant ]',
    approveBtn: '✓ Approve',
    rejectBtn: '✕ Reject',
    approveTitle: '通过申请 / Approve',
    rejectTitle: '拒绝申请 / Reject',
    applicantInfo: 'Student ID {studentId} · Major {major}',
    reviewNoteOptional: 'Review note (optional)',
    approveNotePlaceholder: 'e.g. Welcome aboard, please contact XXX for next steps',
    rejectNotePlaceholder: 'e.g. This direction is full, please apply next semester',
    cancel: 'Cancel',
    processing: 'Processing...',
    confirmApprove: 'Confirm Approve →',
    confirmReject: 'Confirm Reject →',
    statusFilterLabel: '[ 状态筛选 / Status Filter ]',
    resetPending: 'Pending',
    resetApproved: 'Approved',
    resetRejected: 'Rejected',
    resetAll: 'All',
    retry: 'Retry',
    loadingResetsLabel: '加载申请中 / Loading...',
    noResets: '[ 暂无申请 / No Request ]',
    noResetsDesc: 'No password reset requests match the filter.',
    mobileStatusLabel: '状态 / Status',
    mobileCreatedLabel: '创建 / Created',
    mobileResolvedLabel: '处理 / Resolved',
    mobileNoteLabel: '备注 / Note',
    approveAndResetBtn: 'Approve & Reset',
    reject: 'Reject',
  },
  adminLogs: {
    loadFailed: 'Failed to load',
    deleteFailed: 'Failed to delete, please try again later',
    logDeleted: 'Log deleted',
    networkError: 'Network error, please try again later',
    invalidDays: 'Please enter a valid number of days',
    batchDeleteFailed: 'Failed to batch delete, please try again later',
    batchDeleted: 'Batch deleted {count} logs',
    actionFilterLabel: '[ 操作类型筛选 / Action Filter ]',
    batchDeleteBtn: 'Batch Delete',
    loadingLogsLabel: '加载日志中 / Loading...',
    noLogs: '[ 暂无日志 / No Logs ]',
    noLogsDesc: 'No audit logs match the filter.',
    colTime: '时间 / Time',
    colDescription: '操作描述 / Description',
    colAdmin: '操作者 / Admin',
    colActions: 'Actions',
    deleteBtn: 'Delete',
    deleteTitle: 'Delete Log',
    deleteMessage: 'Delete this audit log? This action cannot be undone.',
    deleting: 'Deleting...',
    confirmDelete: 'Confirm Delete',
    batchDeleteTitle: '[ 批量删除日志 / Batch Delete ]',
    batchDeleteDesc: 'Delete audit logs older than the specified number of days.',
    keepDaysLabel: '保留最近 N 天的日志 / Keep logs within N days',
    batchDeleteWarning: 'This will delete all audit logs older than {days} days, and cannot be undone. The batch deletion itself will also be recorded as an audit log.',
    deletingLabel: '删除中 / Deleting...',
    confirmBatchDelete: '确认批量删除 / Confirm →',
    cancel: 'Cancel',
  },
  announcementsAdmin: {
    loadFailed: 'Failed to load announcements',
    unknownError: 'Unknown error',
    titleRequired: 'Title cannot be empty',
    actionFailed: 'Action failed',
    updated: 'Announcement updated',
    created: 'Announcement created',
    deleteTitle: 'Delete announcement',
    deleteMessage: 'Delete announcement "{title}"? This cannot be undone.',
    confirmDelete: 'Confirm delete',
    deleteFailed: 'Delete failed',
    deleted: 'Announcement deleted',
    levelInfo: 'Info',
    levelWarning: 'Warning',
    levelSuccess: 'Success',
    levelError: 'Critical',
    countLabel: '[ {count} announcements ]',
    newBtn: 'New announcement',
    close: 'Close',
    editTitle: 'Edit announcement',
    createTitle: 'New announcement',
    fieldTitle: 'Title *',
    titlePlaceholder: 'Announcement title',
    fieldContent: 'Content',
    contentPlaceholder: 'Optional, announcement details',
    fieldLevel: 'Level',
    fieldPriority: 'Priority',
    fieldExpires: 'Expires at',
    dismissible: 'Dismissible',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    createBtn: 'Create announcement',
    loading: 'Loading...',
    empty: 'No announcements yet. Click "New announcement" to create one.',
    colTitle: 'Title',
    colLevel: 'Level',
    colStatus: 'Status',
    colPriority: 'Priority',
    colExpires: 'Expires',
    colCreated: 'Created',
    colAction: 'Action',
    statusActive: 'Active',
    statusInactive: 'Closed',
    editTooltip: 'Edit',
    disableTooltip: 'Disable',
    enableTooltip: 'Activate',
    deleteTooltip: 'Delete',
    noAnnouncements: 'No announcements',
    creating: 'Creating...',
    titleEmpty: 'Title cannot be empty',
    createFailed: 'Failed to create',
    disable: 'Disable',
    enable: 'Enable',
    countPrefix: 'Total ',
  },
  authSettings: {
    loadFailed: 'Load failed',
    retry: 'Retry',
    title: 'Two-Factor Authentication',
    adminRequired: 'Admin accounts require 2FA',
    adminRequiredDesc: 'Your account role requires two-factor authentication to access all features.',
    close: 'Close',
    cancel: 'Cancel',
    disabledTitle: 'Two-factor authentication is not enabled',
    disabledDesc: 'Once enabled, sign-in requires a 6-digit code from an authenticator app (e.g. Google Authenticator, 1Password) in addition to your password, significantly improving account security.',
    enableBtn: 'Enable 2FA →',
    scanQrDesc: 'Scan the QR code with your authenticator app, or enter the secret below manually.',
    copySecretTitle: 'Copy secret',
    backupCodesHint: 'one-time use',
    backupCodesWarn: '⚠ Save these backup codes now. Use them to sign in if you lose your authenticator device. Each can be used only once.',
    confirmEnable: 'Confirm enable →',
    enabledTitle: '2FA is enabled',
    enabledDesc: 'Sign-in requires a 6-digit code from your authenticator app.',
    regeneratedWarn: '⚠ Old backup codes are invalid. Save these new codes now.',
    regenerateBackupCodes: 'Regenerate backup codes',
    disable2fa: 'Disable 2FA',
    disableDesc: 'After disabling, your account is protected by password only. Enter the 6-digit code from your authenticator app to confirm.',
    regenerateDesc: 'Enter the 6-digit code from your authenticator app. After verification, a new set of backup codes will be generated (old codes become invalid immediately).',
    confirmDisable: 'Confirm disable',
    confirmRegenerate: 'Confirm regenerate →',
    loadStatusFailed: 'Failed to load 2FA status',
    initFailed: 'Failed to initialize 2FA',
    codeRequired: 'Please enter a 6-digit code',
    verifyFailed: 'Verification failed',
    enableSuccess: 'Two-factor authentication enabled',
    disableFailed: 'Disable failed',
    disableSuccess: '2FA disabled',
    regenerateFailed: 'Regenerate failed',
    regenerateSuccess: 'Backup codes regenerated',
    copyFailed: 'Copy failed, please select the text manually',
  },
  userList: {
    search: '[ Search / 搜索 ]',
    searchPlaceholder: 'Search email or display name...',
    role: '[ Role / 角色 ]',
    status: '[ Status / 状态 ]',
    all: 'All',
    admin: 'Admin',
    user: 'User',
    active: 'Active',
    inactive: 'Inactive',
    loading: 'Loading',
    refresh: 'Refresh',
    retry: 'Retry',
    noRecord: '[ No Record / 暂无记录 ]',
    noUsers: 'No users match the filter.',
    colUser: 'User / 用户',
    colRole: 'Role / 角色',
    colStatus: 'Status / 状态',
    colCreated: 'Created / 创建',
    colActions: 'Actions / 操作',
    unnamed: 'Unnamed',
    root: '● Root',
    disabled: '● Disabled',
    notOperable: '— Not operable —',
    edit: 'Edit',
    resetPassword: 'Reset Password',
    delete: 'Delete',
    enable: 'Enable',
    disable: 'Disable',
    cantEditSelf: 'Cannot edit yourself',
    cantDeleteSelf: 'Cannot delete yourself',
    cantDisableSelf: 'Cannot disable yourself',
    editRootOnly: 'Edit (super admin only)',
    resetRootOnly: 'Custom reset password (super admin only)',
    deleteRootOnly: 'Hard delete (super admin only)',
    resetDefault: 'Reset to default password FZTBU_CS',
    resetToDefaultTitle: 'Reset Password',
    activeLabel: '● Active',
    disabledLabel: '● Disabled',
    totalPages: '{total} total · page {page} / {pages}',
    prevPage: '← Prev',
    nextPage: 'Next →',
    loadingUsers: 'Loading users / 加载中...',
    muteTitle: 'Mute user',
    muteMessage: 'Mute "{name}"?\nAfter muting, this user will not be able to post or reply.',
    muteConfirm: 'Confirm mute',
    mute: 'Mute',
    countPrefix: 'Total ',
    countSuffix: ' users',
  },
  dashboard: {
    overview: 'Community Operations Overview',
    loadFailed: 'Failed to load',
    statTotalUsers: 'Total Users',
    statTopics: 'Topics',
    statReplies: 'Replies/Comments',
    statPosts: 'Blog Posts',
    statCategories: 'Sections',
    statAnnouncements: 'Announcements',
  }
};
