/**
 * @file 管理员头像配置 — 莫比乌斯环点击彩蛋
 */

export interface AdminAvatar {
  id: string;
  name: string;
  grade: string;
  position: string;
  /** QQ 号 — 用于获取 QQ 头像 */
  qq: string;
  /** 自定义头像 URL（可选，优先于 QQ 头像） */
  avatarUrl?: string;
}

/**
 * 通过 QQ 号获取头像 URL（size: 40 / 100 / 140 / 640）
 */
export function getQqAvatarUrl(qq: string, size: 40 | 100 | 140 | 640 = 100): string {
  return `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=${size}`;
}

/** 获取管理员头像 URL — 优先使用自定义 URL，否则使用 QQ 头像 */
export function getAdminAvatarUrl(admin: AdminAvatar, size: 40 | 100 | 140 | 640 = 140): string {
  return admin.avatarUrl || getQqAvatarUrl(admin.qq, size);
}

/** 管理员头像数据列表 */
export const ADMIN_AVATARS: AdminAvatar[] = [
  {
    id: 'zwy',
    name: '庄文渊',
    grade: '2024级',
    position: '会长',
    qq: '2022979779',
  },

  {
    id: 'lsw',
    name: '林思维',
    grade: '2023级',
    position: '核心会员',
    qq: '3134454078',
  },

  {
    id: 'lzy',
    name: '连梓阳',
    grade: '2023级',
    position: '核心会员',
    qq: '929643670',
  },

  {
    id: 'yyy',
    name: '余延鳐',
    grade: '2024级',
    position: '核心会员',
    qq: '1298055690',
  },
];
