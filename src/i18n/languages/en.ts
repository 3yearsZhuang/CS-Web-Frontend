/**
 * @file 英文语言包 — 统一 UI 文案（i18n key 定义，GENERAL 3.2）
 *
 * 与 zh-CN 对齐的 key 结构，供 `t()` 按语言取词。
 */
import type { AppMessages } from '../types';

export const en: AppMessages = {
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
  },
  auth: {
    email: 'Email',
    password: 'Password',
    loginTitle: 'Sign in',
    register: 'Register',
    forgotPassword: 'Forgot password',
    twoFactor: 'Two-Factor Auth',
  },
  community: {
    topics: 'Topics',
    replies: 'Replies',
    categories: 'Categories',
    newTopic: 'New topic',
    noTopics: 'No topics',
    searchPlaceholder: 'Search posts...',
  },
  events: {
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    ended: 'Ended',
    register: 'Register',
    registrations: 'Registrations',
  },
  admin: {
    dashboard: 'Dashboard',
    users: 'Users',
    roles: 'Roles',
    events: 'Events',
    announcements: 'Announcements',
    logs: 'Audit logs',
    messages: 'Messages',
  },
};
