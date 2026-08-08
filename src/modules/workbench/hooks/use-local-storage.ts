/**
 * @file localStorage 持久化 state hook（工作台数据统一前缀 wb_）
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof initial === 'function' ? (initial as () => T)() : initial;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      // 解析失败回退初始值
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

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
    setValue(typeof initial === 'function' ? (initial as () => T)() : initial);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key, initial]);

  return [value, setValue, reset] as const;
}
