/**
 * @file 成员名录服务层（已迁移至 Repository 抽象层，ADR-009）
 * 公开查询，仅返回活跃用户，敏感信息脱敏。
 */
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
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
export async function listMembers(tag?: string): Promise<MemberItem[]> {
  const repo = getCommunityRepository();
  // 复用 users 摘要查询（community repo 提供 findUsersByDisplayNames 仅按 display_name），
  // 成员列表需全量扫描 users，新增一个专用方法。
  const rows = await repo.listActiveMembers();
  const mapped = rows.map(toMemberItem);
  if (tag && tag.trim()) {
    const t = `"${tag.trim()}"`;
    return mapped.filter((m) => m.techTags.some((x) => x.includes(tag.trim())) || JSON.stringify(m.techTags).includes(t));
  }
  return mapped;
}

/** 获取所有唯一技术标签（用于筛选器） */
export async function listAllTechTags(): Promise<string[]> {
  const repo = getCommunityRepository();
  const rows = await repo.listActiveMemberTechTags();
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
