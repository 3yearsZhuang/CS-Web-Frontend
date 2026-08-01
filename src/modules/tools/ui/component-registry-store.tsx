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
import type {
  ComponentItem,
  ComponentItemInput,
  ComponentGuide,
  MigrationStatus,
} from '../types';

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
  | { type: 'SET_MIGRATION_STATUS'; itemId: string; status: MigrationStatus }
  | { type: 'UPDATE_GUIDE'; itemId: string; guide: ComponentGuide }
  | { type: 'CREATE_COMPONENT'; item: ComponentItem }
  | { type: 'DELETE_COMPONENT'; itemId: string };

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
    case 'SET_MIGRATION_STATUS':
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
    default:
      return state;
  }
}

// ============= Context =============

interface StoreContextValue {
  state: State;
  loadComponents: () => Promise<void>;
  toggleVariant: (itemId: string, variantId: string, enabled: boolean) => Promise<void>;
  setMigrationStatus: (itemId: string, status: MigrationStatus) => Promise<void>;
  updateGuide: (itemId: string, guide: ComponentGuide) => Promise<void>;
  createComponent: (input: ComponentItemInput) => Promise<boolean>;
  deleteComponent: (itemId: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ============= Provider =============

/** 组件注册表 Store Provider（useReducer + Context） */
export function ComponentRegistryStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadComponents = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const res = await fetch('/api/tools/component-registry', { cache: 'no-store' });
      if (!res.ok) throw new Error('加载失败');
      const data = (await res.json()) as { components: ComponentItem[] };
      dispatch({ type: 'LOAD_SUCCESS', components: data.components });
    } catch (err) {
      dispatch({
        type: 'LOAD_ERROR',
        error: err instanceof Error ? err.message : '未知错误',
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
        const res = await fetch(`/api/tools/component-registry/${itemId}/variants/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, enabled }),
        });
        if (!res.ok) throw new Error('切换变体失败');
      } catch {
        // 回滚：重新加载
        loadComponents();
      }
    },
    [loadComponents],
  );

  const setMigrationStatus = useCallback(
    async (itemId: string, status: MigrationStatus) => {
      // 乐观更新
      dispatch({ type: 'SET_MIGRATION_STATUS', itemId, status });
      try {
        const res = await fetch(`/api/tools/component-registry/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ migrationStatus: status }),
        });
        if (!res.ok) throw new Error('更新状态失败');
      } catch {
        // 回滚
        loadComponents();
      }
    },
    [loadComponents],
  );

  const updateGuide = useCallback(
    async (itemId: string, guide: ComponentGuide) => {
      // 乐观更新
      dispatch({ type: 'UPDATE_GUIDE', itemId, guide });
      try {
        const res = await fetch(`/api/tools/component-registry/${itemId}/guide`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guide),
        });
        if (!res.ok) throw new Error('更新规范失败');
      } catch {
        loadComponents();
      }
    },
    [loadComponents],
  );

  const createComponent = useCallback(
    async (input: ComponentItemInput): Promise<boolean> => {
      try {
        const res = await fetch('/api/tools/component-registry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? '创建失败');
        }
        const data = (await res.json()) as { item: ComponentItem };
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
      // 乐观更新
      dispatch({ type: 'DELETE_COMPONENT', itemId });
      try {
        const res = await fetch(`/api/tools/component-registry/${itemId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('删除失败');
        return true;
      } catch {
        loadComponents();
        return false;
      }
    },
    [loadComponents],
  );

  return (
    <StoreContext.Provider
      value={{
        state,
        loadComponents,
        toggleVariant,
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
