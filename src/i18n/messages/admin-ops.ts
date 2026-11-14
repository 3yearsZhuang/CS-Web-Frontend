/**
 * @file 管理端「组织 / 财务」面板文案（独立命名空间 adminOps）
 */

export interface AdminOpsMessages {
  adminOps: {
    finTab: string;
    orgTab: string;
    refresh: string;
    loading: string;
    noData: string;
    permissionDenied: string;
    treasury: string;
    peakTotal: string;
    userTotal: string;
    escrow: string;
    issued: string;
    action: string;
    issue: string;
    burn: string;
    allocate: string;
    transfer: string;
    returnToTreasury: string;
    fromPeak: string;
    toPeak: string;
    peak: string;
    amount: string;
    reason: string;
    submit: string;
    submitting: string;
    success: string;
    failed: string;
    peaks: string;
    peakName: string;
    peakCode: string;
    members: string;
    balance: string;
    status: string;
    active: string;
    archived: string;
    archive: string;
    createPeak: string;
    peakDesc: string;
    create: string;
    transactions: string;
    txType: string;
    txReason: string;
    txActor: string;
    txTime: string;
    txAmount: string;
    search: string;
    all: string;
    move: string;
    remove: string;
    addMember: string;
    userId: string;
    studentId: string;
    add: string;
    confirmRemove: string;
    confirmArchive: string;
    invalidAmount: string;
    reasonRequired: string;
  };
}

export const zhCN: AdminOpsMessages = {
  adminOps: {
    finTab: '财务 / Finance',
    orgTab: '组织 / Organization',
    refresh: '刷新',
    loading: '加载中…',
    noData: '暂无数据',
    permissionDenied: '需要全范围财务权限',
    treasury: '总库',
    peakTotal: '峰合计',
    userTotal: '个人合计',
    escrow: '任务托管',
    issued: '发行余额',
    action: '资金操作',
    issue: '发行',
    burn: '回收',
    allocate: '总库 → 峰',
    transfer: '峰 → 峰',
    returnToTreasury: '峰 → 总库',
    fromPeak: '源峰',
    toPeak: '目标峰',
    peak: '峰',
    amount: '金额',
    reason: '原因',
    submit: '提交',
    submitting: '提交中…',
    success: '操作成功',
    failed: '操作失败',
    peaks: '峰资金',
    peakName: '峰名称',
    peakCode: '标识',
    members: '成员',
    balance: '余额',
    status: '状态',
    active: '在用',
    archived: '已归档',
    archive: '归档',
    createPeak: '新建峰',
    peakDesc: '峰描述',
    create: '创建',
    transactions: '最近流水',
    txType: '类型',
    txReason: '原因',
    txActor: '操作人',
    txTime: '时间',
    txAmount: '金额',
    search: '搜索成员',
    all: '全部',
    move: '调整峰',
    remove: '移出',
    addMember: '加入成员',
    userId: '用户 ID',
    studentId: '学号',
    add: '加入',
    confirmRemove: '确定结束该成员的成员关系？账号与历史记录保留。',
    confirmArchive: '确定归档该峰？仍有成员或余额时会被拒绝。',
    invalidAmount: '金额必须为正整数',
    reasonRequired: '请填写原因',
  },
};

export const en: AdminOpsMessages = {
  adminOps: {
    finTab: 'Finance / 财务',
    orgTab: 'Organization / 组织',
    refresh: 'Refresh',
    loading: 'Loading…',
    noData: 'No data',
    permissionDenied: 'Full-scope finance permission required',
    treasury: 'Treasury',
    peakTotal: 'Peaks',
    userTotal: 'Members',
    escrow: 'Escrow',
    issued: 'Issuance',
    action: 'Fund action',
    issue: 'Issue',
    burn: 'Burn',
    allocate: 'Treasury → Peak',
    transfer: 'Peak → Peak',
    returnToTreasury: 'Peak → Treasury',
    fromPeak: 'From peak',
    toPeak: 'To peak',
    peak: 'Peak',
    amount: 'Amount',
    reason: 'Reason',
    submit: 'Submit',
    submitting: 'Submitting…',
    success: 'Done',
    failed: 'Failed',
    peaks: 'Peak funds',
    peakName: 'Peak',
    peakCode: 'Code',
    members: 'Members',
    balance: 'Balance',
    status: 'Status',
    active: 'Active',
    archived: 'Archived',
    archive: 'Archive',
    createPeak: 'New peak',
    peakDesc: 'Description',
    create: 'Create',
    transactions: 'Recent transactions',
    txType: 'Type',
    txReason: 'Reason',
    txActor: 'Actor',
    txTime: 'Time',
    txAmount: 'Amount',
    search: 'Search members',
    all: 'All',
    move: 'Move',
    remove: 'Remove',
    addMember: 'Add member',
    userId: 'User ID',
    studentId: 'Student ID',
    add: 'Add',
    confirmRemove: 'End this membership? The account and history are kept.',
    confirmArchive: 'Archive this peak? Peaks with members or balance will be rejected.',
    invalidAmount: 'Amount must be a positive integer',
    reasonRequired: 'Reason is required',
  },
};
