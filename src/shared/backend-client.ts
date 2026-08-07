/**
 * @file BFF → FastAPI 后端代理客户端（前后端分离迁移）
 *
 * 职责（OQ-3：JWT 由 BFF HttpOnly Cookie 托管）：
 *   - 从 HttpOnly Cookie 读取 JWT 对（access / refresh），转发时注入 Authorization 头
 *   - 收到 401 时静默调用后端 /auth/refresh 轮换令牌并重试一次（OQ-7）
 *   - 把后端 snake_case 响应翻译为前端既有契约（camelCase 等）
 *
 * 后端地址：BACKEND_URL（默认 http://localhost:9000）
 */

import 'server-only';

import { NextResponse } from 'next/server';
import { getCookieValue } from '@/shared/security/security';
import type { SafeUser, UserRole } from '@/shared/types';

/** 后端基地址 */
export const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:9000').replace(/\/+$/, '');
const API_PREFIX = '/api/v1';

/** JWT Cookie 名称（HttpOnly；生产用 __Host- 前缀强制 Secure+Path=/） */
const HOST_PREFIX = process.env.NODE_ENV === 'production' ? '__Host-' : '';
export const ACCESS_COOKIE = `${HOST_PREFIX}fztbu_access`;
export const REFRESH_COOKIE = `${HOST_PREFIX}fztbu_refresh`;

const ACCESS_MAX_AGE = 15 * 60; // 与后端 ACCESS_TOKEN_EXPIRE_MINUTES 对齐
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

/** 后端统一错误响应体（ErrorResponse，camelCase 传输契约） */
export interface BackendErrorBody {
  success?: boolean;
  errorCode?: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  tracebackId?: string;
}

/** 后端 TokenPair（camelCase 传输契约） */
export interface BackendTokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
}

/** 后端 UserOut（camelCase 传输契约，与后端 Pydantic alias 对齐） */
export interface BackendUser {
  id: number;
  username: string;
  email: string;
  fullName?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  avatarType?: string;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  techTags?: string[];
  isActive?: boolean;
  isSuperuser?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 代理结果：body + 需要应用到响应的 cookie 操作 */
export interface ProxyResult {
  status: number;
  body: unknown;
  /** 401 且刷新失败：需要清除 Cookie（登出态） */
  clearAuth: boolean;
  /** 轮换后的新 JWT 对（仅当本轮发生 401 静默刷新时存在，需写回 Cookie） */
  authPair?: BackendTokenPair;
}

/** 把后端角色列表解析为前端主角色（root > admin > 细粒度 > user） */
export function resolvePrimaryRole(roles?: string[]): UserRole {
  if (!roles || roles.length === 0) return 'user';
  const order: UserRole[] = ['root', 'admin', 'content_moderator', 'exam_admin', 'task_publisher'];
  for (const candidate of order) {
    if (roles.includes(candidate)) return candidate;
  }
  return 'user';
}

/** 后端 UserOut → 前端 SafeUser（is_superuser 视为 root；否则由 roles 解析） */
export function toSafeUserFromBackend(user: BackendUser, roles?: string[]): SafeUser {
  // SQLite→PG 迁移后超级用户被映射为 admin 角色 + is_superuser=true（不再有独立 root 角色）。
  // is_superuser 在后端 RBAC 中拥有全部权限（rbac.py 旁路），语义等价 root，
  // 因此优先于显式角色列表解析为 root，保证 root 专属 UI/端点对超级用户可见。
  const role = user.isSuperuser
    ? 'root'
    : resolvePrimaryRole(roles);
  return {
    id: String(user.id),
    email: user.email,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    avatarType: user.avatarType ?? 'initial',
    githubUrl: user.githubUrl ?? null,
    websiteUrl: user.websiteUrl ?? null,
    techTags: Array.isArray(user.techTags) ? user.techTags : [],
    role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt ?? '',
    updatedAt: user.updatedAt ?? '',
  };
}

/** 从响应读取 JWT 对（无则 null） */
function readPair(req: Request): { access: string | null; refresh: string | null } {
  return {
    access: getCookieValue(req, ACCESS_COOKIE),
    refresh: getCookieValue(req, REFRESH_COOKIE),
  };
}

/** 请求后端并把错误体规范化为 {error, code?} */
async function requestJson(path: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BACKEND_URL}${API_PREFIX}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { ...(init.headers as Record<string, string> | undefined) },
  });
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

/** 用 refresh token 换新对；失败返回 null */
async function refreshPair(refreshToken: string): Promise<BackendTokenPair | null> {
  const { status, body } = await requestJson('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken }),
  });
  if (status !== 200 || !body || typeof body !== 'object' || !('accessToken' in body)) {
    return null;
  }
  return body as BackendTokenPair;
}

/** 登录/注册成功后用 JWT 对直取用户信息（含角色） */
export async function fetchMeWithPair(
  pair: BackendTokenPair,
): Promise<{ user: SafeUser; roles: string[] } | null> {
  const { status, body } = await requestJson('/auth/me', {
    headers: { Authorization: `Bearer ${pair.accessToken}` },
  });
  if (status !== 200 || !body || typeof body !== 'object') return null;
  const b = body as { user?: BackendUser; roles?: string[] };
  if (!b.user) return null;
  return { user: toSafeUserFromBackend(b.user, b.roles), roles: b.roles ?? [] };
}

/**
 * 取角色列表：优先用刚轮换出的新 pair（避免旧 token 已被轮换导致再次 401），
 * 否则走常规代理（内部处理 401 刷新）。
 */
export async function fetchRolesForRequest(
  req: Request,
  authPair?: BackendTokenPair,
): Promise<string[]> {
  if (authPair) {
    const me = await fetchMeWithPair(authPair);
    return me?.roles ?? [];
  }
  const me = await proxyBackend(req, { path: '/auth/me' });
  if (me.status !== 200 || !me.body || typeof me.body !== 'object') return [];
  return (me.body as { roles?: string[] }).roles ?? [];
}

/** 取当前用户 id（未登录返回 null；可选登录场景用） */
export async function fetchCurrentUserId(req: Request): Promise<string | null> {
  const me = await proxyBackend(req, { path: '/auth/me' });
  if (me.status !== 200 || !me.body || typeof me.body !== 'object') return null;
  const user = (me.body as { user?: BackendUser }).user;
  return user ? String(user.id) : null;
}

/**
 * 代理请求到后端：注入 Authorization → 401 时刷新一次并重试 → 返回结果与 cookie 操作。
 *
 * @param opts.skipAuth  认证端点（登录/注册/验证码/OAuth）为 true：不注入 Authorization
 * @param accessOverride 刷新后重试时注入的新 access token
 */
export async function proxyBackend(
  req: Request,
  opts: {
    path: string;
    method?: string;
    jsonBody?: unknown;
    formData?: FormData;
    skipAuth?: boolean;
    headers?: Record<string, string>;
  },
  retried = false,
  accessOverride?: string,
): Promise<ProxyResult> {
  const { access, refresh } = readPair(req);

  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (!opts.skipAuth && (accessOverride ?? access)) {
    headers.Authorization = `Bearer ${accessOverride ?? access}`;
  }
  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.jsonBody !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.jsonBody);
  }

  const first = await requestJson(opts.path, {
    method: opts.method || 'GET',
    headers,
    body,
  });

  if (first.status === 401 && !opts.skipAuth && refresh && !retried) {
    const pair = await refreshPair(refresh);
    if (pair) {
      const retriedResult = await proxyBackend(req, opts, true, pair.accessToken);
      return { ...retriedResult, authPair: pair };
    }
    return { status: first.status, body: first.body, clearAuth: true };
  }

  return { status: first.status, body: first.body, clearAuth: false };
}

/** 写回 JWT 对（登录成功 / 刷新轮换后调用） */
export function setAuthCookies(res: NextResponse, pair: BackendTokenPair): void {
  res.cookies.set(ACCESS_COOKIE, pair.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  res.cookies.set(REFRESH_COOKIE, pair.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

/** 清除 JWT 对（登出 / 刷新失败） */
export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** 把后端错误体规范化为前端 {error, code?} 形状 */
export function normalizeError(body: unknown, fallback = '请求失败'): { error: string; code?: string } {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  return {
    error: typeof b.message === 'string' ? b.message : fallback,
    code: typeof b.errorCode === 'string' ? b.errorCode : undefined,
  };
}

// ---------------------------------------------------------------- 翻译助手

export function toAnnouncement(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    title: r.title,
    content: r.content ?? null,
    level: r.level ?? 'info',
    isActive: r.is_active !== false,
    isDismissible: r.is_dismissible !== false,
    priority: r.priority ?? 0,
    expiresAt: r.expires_at ?? null,
    targetRoles: r.target_roles ?? null,
    createdBy: r.created_by != null ? String(r.created_by) : '',
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };
}

export interface AnnouncementOutLike {
  id: number;
  title: string;
  content?: string | null;
  level?: string;
  is_active?: boolean;
  is_dismissible?: boolean;
  priority?: number;
  expires_at?: string | null;
  target_roles?: string[] | null;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export function toNotification(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: r.type,
    title: r.title,
    content: r.content ?? null,
    isRead: r.is_read === true,
    senderId: r.sender_id != null ? String(r.sender_id) : null,
    createdAt: r.created_at ?? '',
  };
}

export interface NotificationOutLike {
  id: number;
  user_id: number;
  type: string;
  title: string;
  content?: string | null;
  is_read?: boolean;
  sender_id?: number | null;
  created_at?: string;
}

export function toJoinApplication(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    applicantName: r.applicant_name,
    studentId: r.student_id,
    major: r.major,
    techTags: Array.isArray(r.tech_tags) ? r.tech_tags : [],
    reason: r.reason,
    contactQq: r.contact_qq ?? null,
    contactPhone: r.contact_phone ?? null,
    userId: r.user_id != null ? String(r.user_id) : null,
    status: r.status ?? 'pending',
    reviewedBy: r.reviewed_by != null ? String(r.reviewed_by) : null,
    reviewNote: r.review_note ?? null,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };
}

export interface JoinApplicationOutLike {
  id: number;
  applicant_name: string;
  student_id: string;
  major: string;
  tech_tags?: string[];
  reason: string;
  contact_qq?: string | null;
  contact_phone?: string | null;
  user_id?: number | null;
  status?: string;
  reviewed_by?: number | null;
  review_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** 管理员用户列表：后端分页结构 → 前端契约（pageSize/totalPages + SafeUser + roles） */
export function toAdminUserList(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  const users = (Array.isArray(r.users) ? r.users : []) as Array<
    BackendUser & { roles?: string[] }
  >;
  return {
    users: users.map((u) => toSafeUserFromBackend(u, u.roles)),
    total: Number(r.total ?? 0),
    page: Number(r.page ?? 1),
    pageSize: Number(r.pageSize ?? 50),
    totalPages: Number(r.totalPages ?? 1),
  };
}

/**
 * 前端权限 key（module.resource.action）→ 后端权限名（resource:action）。
 * 例：community.topic.hide → community_topic:hide
 */
export function frontendKeyToBackendName(key: string): string {
  const parts = key.split('.');
  if (parts.length < 2) return key;
  const action = parts.pop()!;
  return `${parts.join('_')}:${action}`;
}

/** 后端权限名（resource:action）→ 前端权限 key（module.resource.action）。 */
export function backendNameToFrontendKey(name: string): string {
  const idx = name.lastIndexOf(':');
  if (idx === -1) return name;
  return `${name.slice(0, idx).replace(/_/g, '.')}.${name.slice(idx + 1)}`;
}

export interface AdminRoleLike {
  id: number;
  name: string;
  display_name?: string | null;
  description?: string | null;
  is_system?: boolean;
  is_protected?: boolean;
  sort_order?: number;
  permissions?: string[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** 后端 AdminRoleOut → 前端 RoleRecord（权限名映射回前端 key，仅保留已知权限点） */
export function toAdminRole(b: unknown, knownKeys: Set<string> = new Set()): Record<string, unknown> { const r = b as Record<string, unknown>;
  const permissions = ((r.permissions ?? []) as unknown[])
    .map(backendNameToFrontendKey as (name: unknown) => string)
    .filter((k: string) => knownKeys.has(k));
  return {
    key: r.name,
    displayName: r.display_name || r.name,
    description: r.description ?? '',
    isSystem: r.is_system === true,
    isProtected: r.is_protected === true || r.is_system === true,
    sortOrder: r.sort_order ?? 0,
    permissions,
    userCount: r.user_count ?? 0,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };
}

export interface AuditLogLike {
  id: number;
  actor_id?: number | null;
  actor_username?: string | null;
  action: string;
  resource_type?: string;
  resource_id?: string | null;
  detail?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

/** 后端 AuditLogItem → 前端 AdminAction */
export function toAdminAction(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  // 后端审计 detail 里可能携带被操作资源的身份信息（email/username/名称），
  // 用于前端展示"被操作的用户/资源"；无则回落到 resource_id / resource_type。
  let detailObj: Record<string, unknown> | null = null;
  if (r.detail && typeof r.detail === 'object') {
    detailObj = r.detail as Record<string, unknown>;
  }
  const targetEmail =
    (detailObj && (detailObj.email as string | undefined)) ??
    (detailObj && (detailObj.target_email as string | undefined)) ??
    null;
  const targetName =
    (detailObj && (detailObj.username as string | undefined)) ??
    (detailObj && (detailObj.display_name as string | undefined)) ??
    (detailObj && (detailObj.name as string | undefined)) ??
    null;
  return {
    id: String(r.id),
    adminId: r.actor_id != null ? String(r.actor_id) : null,
    adminEmail: r.actor_username ?? null,
    adminDisplayName: r.actor_username ?? null,
    action: r.action,
    resourceType: r.resource_type ?? null,
    resourceId: r.resource_id != null ? String(r.resource_id) : null,
    targetUserId: r.resource_type === 'user' && r.resource_id ? String(r.resource_id) : null,
    targetEmail: targetEmail ?? null,
    targetDisplayName: targetName ?? null,
    details: r.detail ? JSON.stringify(r.detail) : null,
    ip: r.ip_address ?? null,
    userAgent: r.user_agent ?? null,
    createdAt: r.created_at ?? '',
  };
}

export interface EventOutLike {
  id: number;
  month?: string | null;
  date?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  year?: string | null;
  topics?: string[];
  tags?: string[];
  is_pinned?: boolean;
  capacity?: number;
  content_markdown?: string | null;
  registration_fields?: Array<Record<string, unknown>>;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  registered_count?: number | null;
}

/** 后端 EventOut → 前端 EventItem */
export function toEventItem(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  const status = typeof r.status === 'string' ? r.status : '';
  return {
    id: String(r.id),
    month: r.month ?? null,
    date: r.date ?? null,
    title: r.title,
    description: r.description ?? null,
    status: ['upcoming', 'ongoing', 'ended'].includes(status) ? status : null,
    year: r.year ?? null,
    topics: Array.isArray(r.topics) ? r.topics : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    isPinned: r.is_pinned === true,
    capacity: r.capacity ?? 0,
    contentMarkdown: r.content_markdown ?? null,
    registrationFields: Array.isArray(r.registration_fields) ? r.registration_fields : [],
    createdBy: r.created_by != null ? String(r.created_by) : null,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
    ...(r.registered_count != null ? { registeredCount: r.registered_count } : {}),
  };
}

export interface EventRegistrationOutLike {
  id: number;
  user_id: number;
  event_id: number;
  status: string;
  form_data?: Record<string, string> | null;
  registered_at?: string;
  cancelled_at?: string | null;
}

/** 后端 EventRegistrationOut → 前端 EventRegistration */
export function toEventRegistration(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  const status = typeof r.status === 'string' ? r.status : '';
  return {
    id: String(r.id),
    userId: String(r.user_id),
    eventId: String(r.event_id),
    status: ['registered', 'cancelled', 'waitlisted'].includes(status) ? status : 'registered',
    formData: r.form_data ?? null,
    registeredAt: r.registered_at ?? '',
    cancelledAt: r.cancelled_at ?? null,
  };
}

/** 后端 EventCheckinOut → 前端 EventCheckin */
export function toEventCheckin(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    eventId: String(r.event_id),
    registrationId: r.registration_id != null ? String(r.registration_id) : null,
    userId: r.user_id != null ? String(r.user_id) : null,
    checkinCode: r.checkin_code,
    checkedInAt: r.checked_in_at ?? null,
    checkedInBy: r.checked_in_by != null ? String(r.checked_in_by) : null,
    createdAt: r.created_at ?? '',
  };
}

/** 后端 CategoryOut → 前端 CommunityCategory */
export function toCommunityCategory(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    slug: r.slug,
    name: r.name,
    description: r.description ?? null,
    icon: r.icon ?? null,
    sortOrder: Number(r.sort_order ?? 0),
    topicCount: Number(r.post_count ?? 0),
    postCount: Number(r.post_count ?? 0),
    createdBy: r.created_by != null ? String(r.created_by) : null,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };
}

/** 后端 CommunityPost（统一 topic|post）→ 前端帖子对象 */
export function toCommunityPost(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    kind: r.kind ?? 'topic',
    categoryId: r.category_id != null ? String(r.category_id) : null,
    authorId: String(r.author_id),
    title: r.title,
    contentMarkdown: r.content_markdown,
    status: ['hidden', 'deleted', 'draft', 'archived'].includes(String(r.status))
      ? r.status
      : 'published',
    isPinned: r.is_pinned === true,
    isFeatured: r.is_featured === true,
    replyCount: Number(r.reply_count ?? 0),
    favoriteCount: Number(r.favorite_count ?? 0),
    lastReplyAt: r.last_reply_at ?? null,
    lastReplyId: r.last_reply_id != null ? String(r.last_reply_id) : null,
    hiddenBy: r.hidden_by != null ? String(r.hidden_by) : null,
    hiddenAt: r.hidden_at ?? null,
    hiddenReason: r.hidden_reason ?? null,
    slug: r.slug ?? null,
    excerpt: r.excerpt ?? null,
    coverImage: r.cover_image ?? null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    seriesId: r.series_id != null ? String(r.series_id) : null,
    seriesOrder: r.series_order ?? 0,
    publishedAt: r.published_at ?? null,
    viewCount: Number(r.view_count ?? 0),
    likeCount: Number(r.like_count ?? 0),
    author: r.author ?? null,
    category: r.category ?? null,
    isLikedByMe: r.is_liked_by_me === true,
    isFavoritedByMe: r.is_favorited_by_me === true,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };
}

/** 后端 CommunityComment → 前端评论对象 */
export function toCommunityComment(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    postId: String(r.post_id),
    authorId: String(r.author_id),
    parentCommentId: r.parent_comment_id != null ? String(r.parent_comment_id) : null,
    contentMarkdown: r.content_markdown,
    status: ['hidden', 'deleted'].includes(String(r.status)) ? r.status : 'published',
    likeCount: Number(r.like_count ?? 0),
    replyCount: Number(r.reply_count ?? 0),
    hiddenBy: r.hidden_by != null ? String(r.hidden_by) : null,
    hiddenAt: r.hidden_at ?? null,
    hiddenReason: r.hidden_reason ?? null,
    author: r.author ?? null,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };
}

/** 后端 MemberOut → 前端 MemberItem */
export function toMember(b: unknown): Record<string, unknown> { const r = b as Record<string, unknown>;
  return {
    id: String(r.id),
    displayName: r.display_name ?? null,
    bio: r.bio ?? null,
    avatarUrl: r.avatar_url ?? null,
    avatarType: r.avatar_type ?? 'initial',
    githubUrl: r.github_url ?? null,
    websiteUrl: r.website_url ?? null,
    techTags: Array.isArray(r.tech_tags) ? r.tech_tags : [],
    role: r.role ?? 'user',
    joinedAt: r.joined_at ?? '',
  };
}
