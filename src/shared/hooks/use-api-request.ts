'use client';

/**
 * @file useApiRequest — 客户端共享数据获取原语（C-19 收敛收尾）
 *
 * 统一前端 BFF 调用的「错误处理 + 加载态 + JSON 解析」样板，消除 40+ 模块各自裸 fetch 的
 * 不一致（错误归一、Content-Type、状态判定）。与后端 `backend-client.ts`（`server-only`）互补：
 * 本文件为**客户端**原语，不依赖 HttpOnly Cookie 注入等 BFF 服务端能力。
 *
 * 提供：
 *  - `apiRequest<T>(path, init?)`：一次调用的 thin wrapper，返回结构化 { ok, status, data, error }
 *  - `useApiRequest<T>(path, options?)`：React hook 版，带 data/error/loading 态与可选立即拉取
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ApiRequestResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export interface ApiRequestInit {
  method?: string;
  /** 对象会被 JSON.stringify 并自动加 Content-Type: application/json */
  body?: unknown;
  headers?: Record<string, string>;
  /** 透传 fetch cache 策略（如 'no-store'），默认不设置 */
  cache?: RequestCache;
}

/** 从响应体提取可读错误信息（对齐后端 camelCase ErrorResponse.message） */
function extractError(body: unknown, fallback: string): string {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  return typeof b.message === 'string' ? b.message : fallback;
}

/**
 * 薄封装一次 fetch：自动 JSON 解析、统一错误提取、网络异常兜底。
 * 不抛异常——调用方据 result.ok / result.error 处理。
 */
export async function apiRequest<T = unknown>(
  path: string,
  init?: ApiRequestInit,
): Promise<ApiRequestResult<T>> {
  const opts: RequestInit = {
    method: init?.method ?? 'GET',
    headers:
      init?.body !== undefined
        ? { 'Content-Type': 'application/json', ...(init.headers ?? {}) }
        : init?.headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: init?.cache,
  };
  try {
    const res = await fetch(path, opts);
    const text = await res.text();
    const data = (text ? (JSON.parse(text) as T) : null) as T | null;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: extractError(data, `请求失败 (${res.status})`),
      };
    }
    return { ok: true, status: res.status, data, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: '网络错误' };
  }
}

export interface UseApiRequestState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface UseApiRequestOptions extends ApiRequestInit {
  /** 挂载时立即拉取（默认 false） */
  immediate?: boolean;
}

/**
 * React hook 版：带 data/error/loading 态，run() 可手动触发或覆盖参数。
 * 适用于「拉一个资源并渲染」的简单场景；复杂乐观更新仍用 apiRequest 自行编排。
 */
export function useApiRequest<T = unknown>(path: string | null, options?: UseApiRequestOptions) {
  const [state, setState] = useState<UseApiRequestState<T>>({
    data: null,
    error: null,
    loading: false,
  });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (override?: ApiRequestInit): Promise<ApiRequestResult<T>> => {
      if (!path) {
        return { ok: false, status: 0, data: null, error: 'no-path' } as ApiRequestResult<T>;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      const result = await apiRequest<T>(path, {
        method: options?.method,
        body: options?.body,
        headers: options?.headers,
        cache: options?.cache,
        ...override,
      });
      if (mounted.current) {
        setState({ data: result.data, error: result.error, loading: false });
      }
      return result;
    },
    [path, options?.method, options?.body, options?.headers, options?.cache],
  );

  useEffect(() => {
    if (options?.immediate && path) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { ...state, run };
}
