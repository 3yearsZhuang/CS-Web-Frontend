/**
 * @file demo — 演示模式共享常量（服务端 demo-mode 与客户端组件同源引用，避免字符串漂移）
 */

/** 演示模式 Cookie 名称（浏览器写入，BFF 服务端 route 读取；值 '1' 开启） */
export const DEMO_COOKIE = 'fztbu_demo';

/** URL 参数名：?demo=1 进入 / ?demo=0 退出（浏览器端处理，见 DemoModeInit） */
export const DEMO_URL_PARAM = 'demo';

/** 手动开启后 Cookie 有效期（秒）：1 年，足够一次演示会话 */
export const DEMO_COOKIE_MAX_AGE = 31_536_000;
