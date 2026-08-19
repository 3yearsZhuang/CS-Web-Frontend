'use client'
/**
 * @file 公告横幅组件（纯 UI 壳）
 *
 * 数据与 dismiss 持久化均由调用方经 props 注入（GENERAL 2.2 展示/容器分离）：
 * - announcements: 当前生效公告列表（业务层容器负责拉取与过滤）
 * - onDismiss: 关闭回调（持久化由调用方负责，如 saveDismissed）
 * 组件仅保留「本次会话可见性（visible）」UI 状态。
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

export type AnnouncementBannerLevel = 'info' | 'warning' | 'success' | 'error';

export interface AnnouncementBannerItem {
  id: string;
  title: string;
  content: string | null;
  level: AnnouncementBannerLevel;
  isDismissible: boolean;
}

interface AnnouncementBannerProps {
  announcements: AnnouncementBannerItem[];
  onDismiss: (id: string) => void;
}

const levelConfig: Record<AnnouncementBannerLevel, {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
}> = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-500 dark:text-red-400',
  },
};

/** 全站公告横幅 — 在 Navbar 下方展示当前生效的公告（数据由容器注入） */
export function AnnouncementBanner({ announcements, onDismiss }: AnnouncementBannerProps) {
  const t = useTranslations('feedback');
  // 本次会话可见性：缺省视为可见；dismiss 仅隐藏本会话（持久化由 onDismiss 负责）
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const dismiss = (id: string) => {
    setVisible((prev) => ({ ...prev, [id]: false }));
    onDismiss(id);
  };

  const activeAnnouncements = announcements.filter((a) => visible[a.id] !== false);

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-[var(--z-banner)] w-full space-y-1 px-4 pb-1">
      {activeAnnouncements.map((a) => {
        const config = levelConfig[a.level] || levelConfig.info;
        const Icon = config.icon;
        return (
          <div
            key={a.id}
            className={`relative flex items-start gap-3 border px-4 py-2.5 text-sm ${config.bg} ${config.border} ${config.text}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${config.iconColor}`} size={16} />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{a.title}</span>
              {a.content && (
                <span className="ml-2 opacity-80">{a.content}</span>
              )}
            </div>
            {a.isDismissible && (
              <button
                onClick={() => dismiss(a.id)}
                className="ml-2 flex-shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label={t('closeAnnouncement')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
