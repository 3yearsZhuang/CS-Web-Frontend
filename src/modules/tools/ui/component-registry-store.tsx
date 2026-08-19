/**
 * @file 组件注册表 — 单一数据源 Store（useReducer + Context，乐观更新失败回滚）
 */

'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import type {
  ComponentItem,
  ComponentItemInput,
  ComponentGuide,
  ComponentVariant,
  MigrationStatus,
  VariantPresetKey,
} from '../types';
import { apiRequest } from '@/shared/hooks/use-api-request';

// ============= State & Action =============

interface State {
  components: ComponentItem[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; components: ComponentItem[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'TOGGLE_VARIANT'; itemId: string; variantId: string; enabled: boolean }
  | { type: 'ROLLBACK_VARIANT'; itemId: string; variantId: string; enabled: boolean }
  | { type: 'SET_MIGRATION_STATUS'; itemId: string; status: MigrationStatus; visibilityOpen?: boolean }
  | { type: 'ROLLBACK_MIGRATION_STATUS'; itemId: string; status: MigrationStatus }
  | { type: 'UPDATE_GUIDE'; itemId: string; guide: ComponentGuide }
  | { type: 'ROLLBACK_GUIDE'; itemId: string; guide: ComponentGuide }
  | { type: 'CREATE_COMPONENT'; item: ComponentItem }
  | { type: 'DELETE_COMPONENT'; itemId: string }
  | { type: 'ROLLBACK_DELETE'; item: ComponentItem };

const initialState: State = {
  components: [],
  loading: true,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { components: action.components, loading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'TOGGLE_VARIANT':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId
            ? {
                ...c,
                variants: c.variants.map((v) =>
                  v.id === action.variantId ? { ...v, isEnabled: action.enabled } : v,
                ),
              }
            : c,
        ),
      };
    case 'ROLLBACK_VARIANT':
      // toggle 失败时，把该变体恢复为操作前的 enabled 值（精准回滚，避免整体重拉整表）。
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId
            ? {
                ...c,
                variants: c.variants.map((v) =>
                  v.id === action.variantId ? { ...v, isEnabled: action.enabled } : v,
                ),
              }
            : c,
        ),
      };
    case 'SYNC_VARIANTS':
      // toggle 成功后，用后端返回的最新变体列表精准覆盖该 item（保持最终一致）。
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId ? { ...c, variants: action.variants } : c,
        ),
      };
    case 'SET_MIGRATION_STATUS':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId
            ? {
                ...c,
                migrationStatus: action.status,
                // #7 可见性闭环：仅当本次迁移触发了自动开放时刷新可见性状态。
                visibilityOpen:
                  action.visibilityOpen ?? c.visibilityOpen,
              }
            : c,
        ),
      };
    case 'ROLLBACK_MIGRATION_STATUS':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId ? { ...c, migrationStatus: action.status } : c,
        ),
      };
    case 'UPDATE_GUIDE':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId ? { ...c, guide: action.guide } : c,
        ),
      };
    case 'ROLLBACK_GUIDE':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.itemId ? { ...c, guide: action.guide } : c,
        ),
      };
    case 'CREATE_COMPONENT':
      return {
        ...state,
        components: [...state.components, action.item],
      };
    case 'DELETE_COMPONENT':
      return {
        ...state,
        components: state.components.filter((c) => c.id !== action.itemId),
      };
    case 'ROLLBACK_DELETE':
      return {
        ...state,
        components: [...state.components, action.item],
      };
    default:
      return state;
  }
}

// ============= Context =============

interface StoreContextValue {
  state: State;
  loadComponents: () => Promise<void>;
  toggleVariant: (itemId: string, variantId: string, enabled: boolean) => Promise<void>;
  applyVariantPreset: (itemId: string, preset: VariantPresetKey) => Promise<boolean>;
  setMigrationStatus: (itemId: string, status: MigrationStatus) => Promise<void>;
  updateGuide: (itemId: string, guide: ComponentGuide) => Promise<void>;
  createComponent: (input: ComponentItemInput) => Promise<boolean>;
  deleteComponent: (itemId: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ============= Provider =============

/** 组件注册表 Store Provider（useReducer + Context） */
export function ComponentRegistryStoreProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('toolsAdmin');
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadComponents = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const r = await apiRequest<{ components: ComponentItem[] }>('/api/tools/component-registry', { cache: 'no-store' });
      if (!r.ok) throw new Error(t('storeLoadFailed'));
      const data = r.data as { components: ComponentItem[] };
      dispatch({ type: 'LOAD_SUCCESS', components: data.components });
    } catch (err) {
      dispatch({
        type: 'LOAD_ERROR',
        error: err instanceof Error ? err.message : t('storeUnknownError'),
      });
    }
  }, []);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const toggleVariant = useCallback(
    async (itemId: string, variantId: string, enabled: boolean) => {
      // 乐观更新
      dispatch({ type: 'TOGGLE_VARIANT', itemId, variantId, enabled });
      try {
        const r = await apiRequest<ComponentVariant[]>(`/api/tools/component-registry/${itemId}/variants`, {
          method: 'PATCH',
          body: { variantId, enabled },
        });
        if (!r.ok) throw new Error(t('storeToggleFailed'));
        // 成功：用后端返回的最新变体列表精准同步该 item（保持最终一致）。
        const data = r.data as ComponentVariant[];
        dispatch({ type: 'SYNC_VARIANTS', itemId, variants: data });
      } catch {
        // 失败：仅回滚该变体到乐观更新前的值，避免整表重拉闪烁。
        dispatch({ type: 'ROLLBACK_VARIANT', itemId, variantId, enabled: !enabled });
      }
    },
    [],
  );

  const applyVariantPreset = useCallback(
    async (itemId: string, preset: VariantPresetKey): Promise<boolean> => {
      // 预设为批量翻转：乐观层无可靠目标态，直接请求后端，成功用返回列表精准同步。
      try {
        const r = await apiRequest<ComponentVariant[]>(`/api/tools/component-registry/${itemId}/variants/preset`, {
          method: 'POST',
          body: { preset },
        });
        if (!r.ok) throw new Error(t('storePresetFailed'));
        // 成功：用后端返回的最新变体列表精准覆盖该 item（与 SYNC_VARIANTS 一致）。
        const data = r.data as ComponentVariant[];
        dispatch({ type: 'SYNC_VARIANTS', itemId, variants: data });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const setMigrationStatus = useCallback(
    async (itemId: string, status: MigrationStatus) => {
      const prev = state.components.find((c) => c.id === itemId)?.migrationStatus;
      const prevVisibility = state.components.find((c) => c.id === itemId)?.visibilityOpen;
      // 乐观更新
      dispatch({ type: 'SET_MIGRATION_STATUS', itemId, status });
      try {
        const r = await apiRequest<{ visibilityOpened: boolean }>(`/api/tools/component-registry/${itemId}`, {
          method: 'PATCH',
          body: { migrationStatus: status },
        });
        if (!r.ok) throw new Error(t('storeUpdateStatusFailed'));
        // #7 可见性闭环：用后端返回的 visibilityOpened 精准刷新可见性联动状态。
        const data = r.data as { visibilityOpened: boolean };
        dispatch({
          type: 'SET_MIGRATION_STATUS',
          itemId,
          status,
          visibilityOpen: data.visibilityOpened ? true : prevVisibility,
        });
      } catch {
        // 精准回滚到操作前状态
        if (prev) dispatch({ type: 'ROLLBACK_MIGRATION_STATUS', itemId, status: prev });
      }
    },
    [state.components],
  );

  const updateGuide = useCallback(
    async (itemId: string, guide: ComponentGuide) => {
      const prev = state.components.find((c) => c.id === itemId)?.guide;
      // 乐观更新
      dispatch({ type: 'UPDATE_GUIDE', itemId, guide });
      try {
        const r = await apiRequest(`/api/tools/component-registry/${itemId}/guide`, {
          method: 'PUT',
          body: guide,
        });
        if (!r.ok) throw new Error(t('storeUpdateGuideFailed'));
      } catch {
        // 精准回滚到操作前指南
        if (prev) dispatch({ type: 'ROLLBACK_GUIDE', itemId, guide: prev });
      }
    },
    [state.components],
  );

  const createComponent = useCallback(
    async (input: ComponentItemInput): Promise<boolean> => {
      try {
        const r = await apiRequest<{ item: ComponentItem }>('/api/tools/component-registry', {
          method: 'POST',
          body: input,
        });
        if (!r.ok) {
          throw new Error(r.error ?? t('storeCreateFailed'));
        }
        const data = r.data as { item: ComponentItem };
        dispatch({ type: 'CREATE_COMPONENT', item: data.item });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const deleteComponent = useCallback(
    async (itemId: string): Promise<boolean> => {
      const prev = state.components.find((c) => c.id === itemId);
      // 乐观更新
      dispatch({ type: 'DELETE_COMPONENT', itemId });
      try {
        const r = await apiRequest(`/api/tools/component-registry/${itemId}`, {
          method: 'DELETE',
        });
        if (!r.ok) throw new Error(t('storeDeleteFailed'));
        return true;
      } catch {
        // 精准恢复被删除的条目
        if (prev) dispatch({ type: 'ROLLBACK_DELETE', item: prev });
        return false;
      }
    },
    [state.components],
  );

  return (
    <StoreContext.Provider
      value={{
        state,
        loadComponents,
        toggleVariant,
        applyVariantPreset,
        setMigrationStatus,
        updateGuide,
        createComponent,
        deleteComponent,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// ============= Hook =============

/** 获取组件注册表 Store 上下文 */
export function useComponentRegistryStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error(
      'useComponentRegistryStore 必须在 ComponentRegistryStoreProvider 内使用',
    );
  }
  return ctx;
}
