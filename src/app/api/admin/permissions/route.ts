/**
 * @file 权限点 API — GET /api/admin/permissions（BFF 薄转发）
 *
 * 后端返回扁平数组 [{ id, name, resource, action, description }]；
 * 角色权限矩阵需要按资源分组，且 key 与角色记录保持同一前端表示（resource.action）。
 * 这里直接以「后端权限目录」为唯一事实源分组，前端不再维护静态权限清单。
 */
import { NextResponse } from 'next/server';
import {
  backendNameToFrontendKey,
  proxyBackend,
  setAuthCookies,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

/** 资源标识 → 中文模块名（仅影响展示，未列出的资源回退为原始标识） */
const RESOURCE_LABELS: Record<string, string> = {
  user: '用户管理',
  role: '角色权限',
  permission: '权限点',
  system: '系统监控',
  exception: '异常处理',
  password_reset: '密码重置审批',
  announcement: '公告管理',
  notification: '通知管理',
  join: '入社审批',
  event: '活动管理',
  community: '社区管理',
  exam: '考试管理',
  resource: '资源站管理',
  task: '任务管理',
  team: '团队管理',
  wallet: '钱包',
  finance: '财务管理',
  member: '成员管理',
  peak: '峰管理',
  audit: '审计日志',
};

interface PermissionPointOut {
  key: string;
  label: string;
  description: string;
}

interface PermissionModuleOut {
  key: string;
  label: string;
  permissions: PermissionPointOut[];
}

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/admin/permissions' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ modules: [] }, { status: proxy.status });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }

  const rows = Array.isArray(proxy.body) ? (proxy.body as Array<Record<string, unknown>>) : [];
  const grouped = new Map<string, PermissionModuleOut>();

  for (const row of rows) {
    const name = String(row.name ?? '');
    if (!name) continue;
    const resource = String(row.resource ?? name.split(':')[0] ?? 'other');
    const description = typeof row.description === 'string' ? row.description : '';
    const group = grouped.get(resource) ?? {
      key: resource,
      label: RESOURCE_LABELS[resource] ?? resource,
      permissions: [],
    };
    group.permissions.push({
      key: backendNameToFrontendKey(name),
      label: description || name,
      description: name,
    });
    grouped.set(resource, group);
  }

  const res = NextResponse.json({ modules: Array.from(grouped.values()) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
