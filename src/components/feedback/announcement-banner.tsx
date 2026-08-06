'use client'
/**
 * @file 公告横幅组件
 */

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

type AnnouncementLevel = 'info' | 'warning' | 'success' | 'error';

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  level: AnnouncementLevel;
  isDismissible: boolean;
}

const STORAGE_KEY = 'dismissed_announcements';

function getDismissedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedSet(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

const levelConfig: Record<AnnouncementLevel, {
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

/** 全站公告横幅 — 在 Navbar 下方展示当前生效的公告 */
export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [hasAny, setHasAny] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) return;
      const data = await res.json();
      const list: Announcement[] = data.announcements || [];

      const dismissed = getDismissedSet();
      const filtered = list.filter((a) => !dismissed.has(a.id));

      setAnnouncements(filtered);
      setHasAny(filtered.length > 0);

      const initVisible: Record<string, boolean> = {};
      filtered.forEach((a) => {
        initVisible[a.id] = true;
      });
      setVisible(initVisible);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const dismiss = (id: string) => {
    setVisible((prev) => ({ ...prev, [id]: false }));
    const dismissed = getDismissedSet();
    dismissed.add(id);
    saveDismissedSet(dismissed);

    // 检查是否所有公告都已关闭
    setAnnouncements((prev) => {
      const remaining = prev.filter((a) => a.id !== id || a.isDismissible);
      setHasAny(remaining.length > 0);
      return prev;
    });
  };

  if (!hasAny) return null;

  const activeAnnouncements = announcements.filter((a) => visible[a.id] !== false);

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 w-full space-y-1 px-4 pb-1">
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
                aria-label="关闭公告"
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