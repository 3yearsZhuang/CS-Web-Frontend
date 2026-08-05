/**
 * @file 中文语言包 — 统一 UI 文案（i18n key 定义，GENERAL 3.2）
 *
 * 骨架期落地：集中 key 定义与中文文案，为多语言扩展打底。
 * 说明：项目当前 UI 大量内联「中文 / English」双语标签，全量迁移至本语言包
 * 属后续迭代；本文件先行建立骨架与 key 命名约定。
 */
import type { AppMessages } from '../types';

export const zhCN: AppMessages = {
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
  },
  auth: {
    email: '邮箱',
    password: '密码',
    loginTitle: '登录',
    register: '注册',
    forgotPassword: '忘记密码',
    twoFactor: '双因素认证',
  },
  community: {
    topics: '主题',
    replies: '回复',
    categories: '版块',
    newTopic: '发布主题',
    noTopics: '暂无主题',
    searchPlaceholder: '搜索帖子...',
  },
  events: {
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束',
    register: '报名',
    registrations: '报名列表',
  },
  admin: {
    dashboard: '数据看板',
    users: '用户管理',
    roles: '角色管理',
    events: '活动管理',
    announcements: '公告管理',
    logs: '审计日志',
    messages: '消息管理',
  },
};
