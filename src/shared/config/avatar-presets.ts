/**
 * @file 头像预设配置 — 6 个内置预设头像（preset-<id>.svg）
 */

export interface AvatarPreset {
  id: number;
  label: string;
  /** 公开访问路径（Next.js 静态文件服务） */
  url: string;
}

/** 预设头像列表 */
export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: 1, label: 'Radar', url: '/avatars/presets/preset-1.svg' },
  { id: 2, label: 'Hex', url: '/avatars/presets/preset-2.svg' },
  { id: 3, label: 'Slash', url: '/avatars/presets/preset-3.svg' },
  { id: 4, label: 'Crystal', url: '/avatars/presets/preset-4.svg' },
  { id: 5, label: 'Circuit', url: '/avatars/presets/preset-5.svg' },
  { id: 6, label: 'Target', url: '/avatars/presets/preset-6.svg' },
] as const;

/** 根据 ID 获取预设头像 */
export function getPresetById(id: number): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id);
}

/** 预设 ID 是否有效 */
export function isValidPresetId(id: number): boolean {
  return id >= 1 && id <= AVATAR_PRESETS.length;
}
