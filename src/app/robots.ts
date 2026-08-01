/**
 * @file SEO robots.txt 生成
 *
 * 允许所有爬虫抓取页面路由，禁止访问 API、Next.js 内部路径与静态资源。
 */
import { MetadataRoute } from 'next';

/** 生成 robots.txt 规则 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/static/'],
    },
  };
}
