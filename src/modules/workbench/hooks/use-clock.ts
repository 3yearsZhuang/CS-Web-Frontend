/**
 * @file 当前时间 + 本次会话在线时长（时钟模块）
 */
'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'wb_session_started_at';

function getSessionStart(): number {
  if (typeof window === 'undefined') return Date.now();
  const cached = window.sessionStorage.getItem(SESSION_KEY);
  if (cached) {
    const ts = Number(cached);
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  const now = Date.now();
  window.sessionStorage.setItem(SESSION_KEY, String(now));
  return now;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function useClock(intervalMs = 1000) {
  // 初始用固定占位（避免 SSR/CSR 时间戳不一致导致 hydration mismatch），挂载后再启动真实时钟
  const [now, setNow] = useState(() => 0);
  const [sessionStart] = useState(() => getSessionStart());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    setMounted(true);
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const safeNow = now || Date.now();
  return {
    now: new Date(safeNow),
    timestamp: safeNow,
    // 未挂载前不展示会话时长（SSR/CSR 一致）
    sessionDuration: mounted ? formatDuration(safeNow - sessionStart) : '',
    sessionStart,
    mounted,
  };
}

/** 按时段返回问候语 key（greetingMorning/Afternoon/Evening） */
export function greetingKey(hour: number): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  if (hour < 6) return 'greetingEvening';
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

/** YYYY-MM-DD（本地时区） */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatClock(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDateZh(d: Date): string {
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
}
