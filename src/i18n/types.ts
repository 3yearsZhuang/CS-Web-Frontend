/**
 * @file i18n 消息结构类型 — 统一 key 定义（GENERAL 3.2）
 */

export type Language = 'zh-CN' | 'en';

export interface AppMessages {
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
  };
  fallback: {
    errorTitle: string;
    globalErrorTitle: string;
    errorDesc: string;
    globalErrorDesc: string;
    errorId: string;
  };
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
  };
  auth: {
    email: string;
    password: string;
    loginTitle: string;
    register: string;
    forgotPassword: string;
    twoFactor: string;
  };
  community: {
    topics: string;
    replies: string;
    categories: string;
    newTopic: string;
    noTopics: string;
    searchPlaceholder: string;
  };
  events: {
    upcoming: string;
    ongoing: string;
    ended: string;
    register: string;
    registrations: string;
  };
  admin: {
    dashboard: string;
    users: string;
    roles: string;
    events: string;
    announcements: string;
    logs: string;
    messages: string;
  };
}

/** key 类型：如 `common.loading` */
export type MessageKey = {
  [K in keyof AppMessages]: AppMessages[K] extends Record<string, unknown>
    ? `${K}.${Extract<keyof AppMessages[K], string>}`
    : never;
}[keyof AppMessages];
