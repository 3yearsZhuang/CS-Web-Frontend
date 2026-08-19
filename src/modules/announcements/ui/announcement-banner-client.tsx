'use client';
/**
 * @file 公告横幅数据容器 — 根布局使用的客户端包装
 *
 * 职责：拉取公告（useAnnouncements）与持久化 dismiss（saveDismissed），
 * 以 props 注入纯 UI 组件 AnnouncementBanner（公共层 components/ 不依赖业务层；
 * 数据获取收敛于业务域容器，GENERAL 2.2 展示/容器分离）。
 */

import { AnnouncementBanner } from '@/components/feedback/announcement-banner';
import { saveDismissed, useAnnouncements } from './hooks/use-announcements';

export function AnnouncementBannerClient() {
  const { announcements } = useAnnouncements();
  return (
    <AnnouncementBanner
      announcements={announcements}
      onDismiss={(id) => saveDismissed(id)}
    />
  );
}
