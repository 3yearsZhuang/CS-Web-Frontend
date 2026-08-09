'use client';

/**
 * @file 功能组件可见性 Hook
 *
 * 基于 SWR 拉取 /api/feature-visibility（公开读取），供 navbar / user-menu /
 * VisibilityGate / 管理面板共享同一份缓存。配置未加载或加载失败时回退到默认规则
 * （fail-open），保证整站组件不因配置缺失而消失——真实权限闸门仍在 BFF/后端路由层。
 *
 * 默认规则与组件清单来自 ./feature-visibility/registry（单一事实来源），
 * 与后端 FeatureVisibilityService.DEFAULT_MODULES 对应。
 */

import useSWR from 'swr';
import { useAuth } from '@/shared/hooks/use-auth';
import { DEFAULT_VISIBILITY, type VisibilityRule } from '@/shared/feature-visibility/registry';

/** 三态可见性规则（类型定义见 registry，此处再导出以兼容既有引用） */
export type { VisibilityRule };

/** 单组件可见性（与后端 camelCase 响应一致） */
export interface ModuleVisibility {
  moduleKey: string;
  guest: boolean;
  member: boolean;
  admin: boolean;
}

/** 全部受管组件配置 */
export interface FeatureVisibilityConfig {
  modules: ModuleVisibility[];
}

/** 用户类别（决定读哪一态） */
export type UserClass = 'guest' | 'member' | 'admin';

/**
 * 默认可见性（由 registry 派生）。
 * 配置未加载 / 网络异常 / 未知组件时回退到此，保证可用性。
 */
export { DEFAULT_VISIBILITY };

/**
 * 拉取全部组件可见性规则。多组件共享同一 SWR key，自动请求去重。
 */
export function useFeatureVisibility() {
  const { data, isLoading, error, mutate } = useSWR<FeatureVisibilityConfig>(
    '/api/feature-visibility',
    {
      revalidateOnFocus: false,
      revalidateIfStale: true,
    },
  );

  const rules: Record<string, VisibilityRule> = {};
  for (const m of data?.modules ?? []) {
    rules[m.moduleKey] = { guest: m.guest, member: m.member, admin: m.admin };
  }

  return { rules, isLoading, error, mutate };
}

/** 由登录态 + 角色推导用户类别 */
export function deriveUserClass(isLoggedIn: boolean, role?: string): UserClass {
  if (!isLoggedIn) return 'guest';
  return role === 'admin' || role === 'root' ? 'admin' : 'member';
}

/**
 * 判断指定组件对当前用户是否可见。
 * 内部组合 useAuth + useFeatureVisibility；配置缺失时回退默认规则（fail-open）。
 * 未知组件 key 一律可见（fail-open），避免误隐藏。
 */
export function useComponentVisible(componentKey: string): boolean {
  const { user, isLoggedIn } = useAuth();
  const { rules } = useFeatureVisibility();
  const rule = rules[componentKey] ?? DEFAULT_VISIBILITY[componentKey];
  if (!rule) return true; // 未知组件：fail-open
  const userClass = deriveUserClass(isLoggedIn, user?.role);
  return rule[userClass];
}

/**
 * 兼容别名：模块级可见性（= 组件级可见性）。
 * @deprecated 新代码请使用 useComponentVisible。
 */
export function useModuleVisible(moduleKey: string): boolean {
  return useComponentVisible(moduleKey);
}
