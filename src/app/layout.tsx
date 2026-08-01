/**
 * @file 根布局 — 全局 HTML 结构 + SEO metadata + ThemeProvider + Navbar + Footer
 * 防闪烁：SSR 硬编码 <html className="dark">，深色用户零闪烁（不用内联脚本，避免 nonce 水合错误）
 * 安全：proxy.ts 每请求生成 CSP nonce，经 x-nonce 头传入并注入内联 script
 */
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { PageTransition } from '@/components/effects/page-transition';
import { AnnouncementBanner } from '@/components/feedback/announcement-banner';
import { ConfirmProvider } from '@/components/primitives/confirm-dialog';
import './globals.css';

/** 全局 SEO 元数据 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:2333',
  ),
  manifest: '/manifest.json',
  title: {
    default: '计算机协会 | 探索技术的无限可能',
    template: '%s | 计算机协会',
  },
  description:
    '大学计算机协会官方主页 - 汇聚热爱技术的学生，探索编程、算法、人工智能与开源世界的无限可能。',
  keywords: [
    '计算机协会',
    '编程社团',
    '大学社团',
    '算法竞赛',
    '人工智能',
    '开源社区',
    '技术交流',
  ],
  authors: [{ name: '计算机协会' }],
  // 浏览器标签页图标 — 使用 logo.png（用户要求）
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png', sizes: 'any' }],
    apple: [{ url: '/logo.png', sizes: '180x180' }],
    shortcut: ['/logo.png'],
  },
  openGraph: {
    title: '计算机协会 | 探索技术的无限可能',
    description: '汇聚热爱技术的学生，探索编程与开源世界的无限可能。',
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: '/logo.png', width: 1254, height: 1254, alt: '计算机协会 Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '计算机协会 | 探索技术的无限可能',
    description: '汇聚热爱技术的学生，探索编程与开源世界的无限可能。',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '计算机协会',
  },
};

/**
 * Service Worker 注册脚本
 *
 * 在页面加载后注册 sw.js，启用离线缓存和 PWA 支持。
 * 仅在支持 serviceWorker 的浏览器中执行，静默失败不影响主流程。
 */
const swRegisterScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function() {});
  });
}
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
    <html lang="zh_CN" data-scroll-behavior="smooth" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {/*
          防闪烁策略：不使用内联脚本，依赖 <html className="dark"> SSR 硬编码。
          深色用户（默认）首帧即深色，next-themes hydrate 后维持深色，零闪烁。
          浅色用户首帧为 SSR 的深色，next-themes hydrate 后切浅色（约一帧）。
          原生 <script nonce> 方案因 headers() 客户端返回空导致 nonce 水合不匹配，已移除。
        */}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: swRegisterScript }}
        />
        {/* 扫描线纹理叠加 — 极淡水平扫描线，增添工业终端质感 */}
        <div className="ark-scanline" aria-hidden="true" />
        <ThemeProvider>
          <ConfirmProvider>
            <Navbar />
            <AnnouncementBanner />
            <PageTransition>{children}</PageTransition>
            <Footer />
          </ConfirmProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
