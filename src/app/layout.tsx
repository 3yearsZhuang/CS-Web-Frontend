/**
 * @file 根布局 — 全局 HTML 结构 + SEO metadata + ThemeProvider + Navbar + Footer
 * 防闪烁：SSR 硬编码 <html className="dark">，深色用户零闪烁（不用内联脚本，避免 nonce 水合错误）
 * 安全：proxy.ts 每请求生成 CSP nonce，经 x-nonce 头传入并注入内联 script
 */
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { SWRProvider } from '@/components/swr-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { PageTransition } from '@/components/effects/page-transition';
import { AnnouncementBanner } from '@/components/feedback/announcement-banner';
import { ConfirmProvider } from '@/components/primitives/confirm-dialog';
import './globals.css';

/** 全局 SEO 元数据 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo');
  return {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:2333',
  ),
  manifest: '/manifest.json',
  title: {
    default: t('title'),
    template: t('titleTemplate'),
  },
  description: t('description'),
  keywords: [
    '计算机协会',
    '编程社团',
    '大学社团',
    '算法竞赛',
    '人工智能',
    '开源社区',
    '技术交流',
  ],
  authors: [{ name: t('author') }],
  // 浏览器标签页图标 — 使用 logo.png（用户要求）
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png', sizes: 'any' }],
    apple: [{ url: '/logo.png', sizes: '180x180' }],
    shortcut: ['/logo.png'],
  },
  openGraph: {
    title: t('ogTitle'),
    description: t('ogDescription'),
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: '/logo.png', width: 1254, height: 1254, alt: t('ogAlt') }],
  },
  twitter: {
    card: 'summary_large_image',
    title: t('twitterTitle'),
    description: t('twitterDescription'),
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: t('appleTitle'),
  },
  };
}

/**
 * Service Worker 注册 + 缓存清理脚本
 *
 * 生产环境：注册 sw.js，启用离线缓存和 PWA 支持。
 * 开发环境：
 *   1. 主动注销所有旧 SW（防止历史遗留 SW 缓存旧 HTML → chunk hash 失效）
 *   2. 注入 meta no-cache 标签（双保险，防止浏览器缓存 HTML）
 *
 * 仅在支持 serviceWorker 的浏览器中执行，静默失败不影响主流程。
 */
const swRegisterScript = `
(function() {
  var isDev = ${JSON.stringify(process.env.NODE_ENV)} !== 'production';

  // 开发环境：注销所有 Service Worker（清除历史遗留的 SW 缓存）
  if (isDev && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      regs.forEach(function(reg) { reg.unregister(); });
    });
  }

  // 开发环境：注入 meta no-cache 标签（双保险，某些浏览器对 HTTP 头处理不一致）
  if (isDev) {
    var meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(meta);
  }

  // 生产环境：注册 Service Worker
  if (!isDev && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
  }
})();
`;

/**
 * 根布局组件
 *
 * 结构：html > head[script] > body > [Inspector(仅开发)] > ThemeProvider > Navbar + children + Footer
 *
 * async：F2 需通过 next/headers 读取 proxy.ts 注入的 CSP nonce，
 * headers() 返回 Promise，须 await（Next.js 15+ 异步约定）。
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // F2：读取 proxy.ts 注入的 per-request CSP nonce
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        {/*
         * SWR 全局配置：提供默认 fetcher（HTTP 200 返回 JSON，否则返回 null），
         * 关闭焦点/重连重验证以避免不必要的请求；缓存与去重由 SWR 自动管理。
         */}
        <SWRProvider>
        {/*
          防闪烁：SSR 默认深色，首帧由下方内联脚本按 next-themes 存储值校正主题类，
          避免浅色用户在 hydrate 前闪现深色。脚本使用服务端 nonce，符合 CSP。

          suppressHydrationWarning：浏览器 CSP 在校验后会把 DOM 中 <script> 的
          nonce 属性移除（DOM 中 nonce=""），但 React 服务端 HTML 带 nonce="值"，
          导致水合时属性不匹配。该脚本属一次性内联副作用，无需 React 协调其属性，
          故抑制该元素的水合告警（与 <html suppressHydrationWarning> 同理）。
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var d=s==='dark'||(!s&&true);var h=document.documentElement;h.classList.toggle('dark',d);}catch(e){}}())`,
          }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: swRegisterScript }}
        />
        {/* 扫描线纹理叠加 — 极淡水平扫描线，增添工业终端质感 */}
        <div className="ark-scanline" aria-hidden="true" />
        <NextIntlClientProvider>
          <ThemeProvider nonce={nonce}>
            <ConfirmProvider>
              <Navbar />
              <AnnouncementBanner />
              <PageTransition>{children}</PageTransition>
              <Footer />
            </ConfirmProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
