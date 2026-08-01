/**
 * @file 页首背景图配置 — 为各页面 [ 00 ] Hero 区定制背景图
 *
 * 修改下方 HEADER_IMAGES 即可替换页面页首图片；未配置的页面使用默认装饰背景。
 */

export interface HeaderImageConfig {
  /** 图片地址（本地 /public 路径或外链 URL） */
  src: string;
  /** 无障碍描述（留空则使用页面标题） */
  alt?: string;
  /** background-position 值 */
  position?: string;
  /** 背景图透明度 0~1（默认 0.25） */
  opacity?: number;
}

/** 页首背景图配置表 — 修改此处即可定制任意页面的页首图片 */
export const HEADER_IMAGES: Record<string, HeaderImageConfig> = {
  // 首页 — 默认使用莫比乌斯环粒子背景，如需替换取消注释
  // home: {
  //   src: '/headers/home.jpg',
  //   alt: '首页',
  //   opacity: 0.3,
  // },

  // 关于页
  // 如需添加背景图，将图片放入 /public/headers/ 后取消注释
  // about: {
  //   src: '/headers/about.jpg',
  //   alt: '关于我们',
  //   position: 'center',
  //   opacity: 0.22,
  // },

  // 招新页
  // join: {
  //   src: '/headers/join.jpg',
  //   alt: '加入我们',
  //   position: 'center',
  //   opacity: 0.22,
  // },

  // 活动页
  // events: {
  //   src: '/headers/events.jpg',
  //   alt: '活动',
  //   position: 'center',
  //   opacity: 0.22,
  // },

  // 通知中心
  // notifications: {
  //   src: '/headers/notifications.jpg',
  //   alt: '通知中心',
  //   position: 'center',
  //   opacity: 0.18,
  // },

  // 个人中心
  // profile: {
  //   src: '/headers/profile.jpg',
  //   alt: '个人中心',
  //   position: 'center',
  //   opacity: 0.18,
  // },
};

/** 获取指定页面的页首背景图配置（未配置返回 null，渲染默认装饰背景） */
export function getHeaderImage(pageKey: string): HeaderImageConfig | null {
  return HEADER_IMAGES[pageKey] ?? null;
}
