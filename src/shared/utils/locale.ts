/**
 * 语言偏好持久化工具。
 * 将 locale 写入 cookie 供服务端 getRequestConfig 读取，并触发整页刷新以重新渲染。
 */

const LOCALE_COOKIE_MAX_AGE = 31536000; // 1 年（秒）

/** 写入语言偏好 cookie，随后由调用方决定是否刷新页面。 */
export function setLocaleCookie(next: string): void {
  document.cookie = `locale=${encodeURIComponent(next)}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
