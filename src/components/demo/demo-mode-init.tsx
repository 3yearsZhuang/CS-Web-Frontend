'use client';

/**
 * @file DemoModeInit — URL 参数演示开关（无 UI，挂载即执行）
 *
 * 处理 `?demo=1`（进入）/ `?demo=0`（退出）：
 * 浏览器写入 fztbu_demo cookie（BFF 服务端 route 据此判定演示模式），
 * 随后用 history.replaceState 清除 URL 参数，避免刷新后残留与分享链接误带开关。
 */
import { useEffect } from 'react';
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE, DEMO_URL_PARAM } from '@/shared/constants/demo';

function writeDemoCookie(value: '1' | '0'): void {
  if (value === '0') {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } else {
    document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${DEMO_COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

export function DemoModeInit() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(DEMO_URL_PARAM);
    if (value !== '1' && value !== '0') return;
    writeDemoCookie(value);
    // 清除 URL 参数：避免刷新重复触发，且分享出去的链接不带演示开关
    const url = new URL(window.location.href);
    url.searchParams.delete(DEMO_URL_PARAM);
    window.history.replaceState(null, '', url.toString());
  }, []);

  return null;
}
