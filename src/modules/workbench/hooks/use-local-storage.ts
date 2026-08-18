/**
 * @file localStorage 持久化 state hook（工作台数据统一前缀 wb_）
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type PlainObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is PlainObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 读取存储值时，若「默认值」与「解析值」均为非数组普通对象，
 * 则浅合并（存储值优先、缺失字段回退默认）。
 * 这样 object 类型偏好演进 schema 后，旧 localStorage 缺失的字段
 * 不会再触发 `xxx is not iterable` / `cannot read ... of undefined` 类崩溃。
 * 数组 / 原始值 / 类型不一致时不合并，原样返回存储值，避免改变既有行为。
 */
function mergeDefaultsWithStored<T>(initial: T, stored: unknown): T {
  if (isPlainObject(initial) && isPlainObject(stored)) {
    return { ...(initial as PlainObject), ...(stored as PlainObject) } as T;
  }
  return stored as T;
}

export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const getInitial = () => (typeof initial === 'function' ? (initial as () => T)() : initial);

  // SSR 与客户端首帧一律用 initial，保证两端 HTML 结构一致（根除 hydration 不匹配）。
  // 存储值仅在挂载后读取，绝不在首次渲染期间访问 window.localStorage。
  const [value, setValue] = useState<T>(getInitial);

  // 挂载后从 localStorage 载入（并浅合并默认值）；同时监听跨标签页 storage 事件做同步。
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (!cancelled) setValue((prev) => mergeDefaultsWithStored(prev, parsed));
      }
    } catch {
      // 解析失败忽略
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      const incoming = e.newValue;
      if (incoming == null) {
        setValue(getInitial());
        return;
      }
      try {
        setValue((prev) => mergeDefaultsWithStored(prev, JSON.parse(incoming)));
      } catch {
        // 解析失败忽略
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
    // 仅在挂载时载入一次；key 变化才重新载入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 超限静默（如大音频不存这里）
    }
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(getInitial());
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return [value, setValue, reset] as const;
}
