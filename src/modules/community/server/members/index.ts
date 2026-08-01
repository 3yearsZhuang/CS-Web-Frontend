/**
 * @file 成员名录服务层 — 公开查询，仅返回活跃用户，敏感信息脱敏
 */
import { getDb } from '@/shared/db';
import type { MemberItem } from '../../types';

export type { MemberItem };

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  role: string;
  is_active: number;
  created_at: string;
}

function toMemberItem(row: UserRow): MemberItem {
  let techTags: string[] = [];
  try {
    if (row.tech_tags) techTags = JSON.parse(row.tech_tags) as string[];
  } catch {
    // 忽略解析失败
  }

  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    avatarType: row.avatar_type,
    githubUrl: row.github_url,
    websiteUrl: row.website_url,
    techTags,
    role: row.role,
    joinedAt: row.created_at,
  };
}

/** 获取所有活跃成员列表 */
export function listMembers(tag?: string): MemberItem[] {
  const db = getDb();

  if (tag && tag.trim()) {
    const rows = db
      .prepare(
        `SELECT * FROM users WHERE is_active = 1 AND tech_tags LIKE ? ORDER BY display_name COLLATE NOCASE ASC`,
      )
      .all(`%"${tag.trim()}"%`) as UserRow[];
    return rows.map(toMemberItem);
  }

  const rows = db
    .prepare(
      `SELECT * FROM users WHERE is_active = 1 ORDER BY display_name COLLATE NOCASE ASC`,
    )
    .all() as UserRow[];
  return rows.map(toMemberItem);
}

/** 获取所有唯一技术标签（用于筛选器） */
export function listAllTechTags(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT tech_tags FROM users WHERE is_active = 1 AND tech_tags IS NOT NULL AND tech_tags != '[]'`,
    )
    .all() as Array<{ tech_tags: string }>;

  const tagSet = new Set<string>();
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tech_tags) as string[];
      for (const t of tags) tagSet.add(t);
    } catch {
      // 忽略解析失败
    }
  }
  return Array.from(tagSet).sort();
}
