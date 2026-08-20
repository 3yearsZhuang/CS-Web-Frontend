/**
 * @file useTransientMessage — 瞬态提示条状态（重复实现治理波次 C1b：#27）。
 * 收敛 admin-announcements-panel 与 admin-events-settings 各自手写的
 * 「message state + show() + setTimeout 3s 自动清除」样板。
 * 仅收敛状态逻辑；渲染样式差异（主题色/绿色硬编码等）由调用方各自保留。
 */
'use client';

import { useCallback, useRef, useState } from 'react';

const AUTO_CLEAR_MS = 3000;

export function useTransientMessage(): [string | null, (msg: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), AUTO_CLEAR_MS);
  }, []);

  return [message, show];
}
