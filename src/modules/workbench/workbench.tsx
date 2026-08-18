/**
 * @file 工作台主体 — 由 widget-registry 纯配置驱动渲染（§2.3 配置即内容数据）。
 * - 布局设置：widget 显隐开关（localStorage 持久化，§2.6 声明→配置→注册）
 * - 顶部提供「导出 JSON / 导入恢复 / 清空」数据备份入口
 * - LLM 用量与学习助手对话已合并为单张卡片（widgets/llm-widget），无独立视图切换
 */
'use client';

import { useTranslations } from 'next-intl';
import { Download, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { GhostTitle } from '@/components';
import { useLocalStorage } from './hooks/use-local-storage';
import { WIDGETS } from './widget-registry';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

const BACKUP_PREFIX = 'wb_';
const BACKUP_KEYS = ['wb_tasks', 'wb_notes', 'wb_pomodoro_settings', 'wb_pomodoro_state'];
const PREFS_KEY = 'wb_widget_prefs';

interface WidgetPrefs {
  hidden: string[];
}

/** 收集所有工作台 localStorage 数据 → 备份对象 */
function collectBackup(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw != null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  return { app: 'fztbu-workbench', version: 1, exportedAt: new Date().toISOString(), data };
}

function restoreBackup(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const root = obj as { data?: Record<string, unknown> };
  const data = root.data;
  if (!data || typeof data !== 'object') return false;
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith(BACKUP_PREFIX)) continue;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 单项失败不阻断整体恢复
    }
  }
  return true;
}

export function Workbench() {
  const t = useTranslations('workbench');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showLayout, setShowLayout] = useState(false);
  const [tasksCount] = useLocalStorage<unknown[]>('wb_tasks', []);
  const [notesCount] = useLocalStorage<unknown[]>('wb_notes', []);
  const [prefs, setPrefs] = useLocalStorage<WidgetPrefs>(PREFS_KEY, { hidden: [] });

  const totalRecords = useMemo(
    () => (Array.isArray(tasksCount) ? tasksCount.length : 0) + (Array.isArray(notesCount) ? notesCount.length : 0),
    [tasksCount, notesCount],
  );

  /** 数据积累提示（≥30 条建议导出备份） */
  useEffect(() => {
    if (totalRecords >= 30) {
      const timer = setTimeout(() => setNotice('backup-hint'), 800);
      return () => clearTimeout(timer);
    }
  }, [totalRecords]);

  const exportBackup = useCallback(() => {
    const payload = collectBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const onImportFile = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        if (restoreBackup(obj)) {
          window.location.reload();
        } else {
          setNotice('invalid');
        }
      } catch {
        setNotice('invalid');
      }
    };
    reader.readAsText(file);
  }, []);

  const clearAllData = useCallback(() => {
    if (!window.confirm(t('confirmClearTasks'))) return;
    for (const key of BACKUP_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.location.reload();
  }, [t]);

  /** 按槽位分组 + 显隐过滤（registry 纯驱动）：full 顶部全宽 / primary 左主列 / main+side 右栏 */
  const { full, primary, right } = useMemo(() => {
    const hidden = new Set(prefs.hidden);
    const pick = (slots: Array<'full' | 'primary' | 'main' | 'side'>) =>
      WIDGETS.filter((w) => slots.includes(w.slot) && !hidden.has(w.id)).map((w) => ({
        id: w.id,
        component: w.component,
      }));
    return {
      full: pick(['full']),
      primary: pick(['primary']),
      right: pick(['main', 'side']),
    };
  }, [prefs.hidden]);

  const toggleWidget = useCallback(
    (id: string) => {
      setPrefs((prev) => {
        const hidden = prev.hidden.includes(id)
          ? prev.hidden.filter((h) => h !== id)
          : [...prev.hidden, id];
        return { hidden };
      });
    },
    [setPrefs],
  );

  return (
    <section data-section-nav="01|工作台" className="px-4 sm:px-6 md:px-8 py-10 sm:py-14 border-t border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <GhostTitle as="h2" className="display-serif text-[clamp(24px,4vw,44px)] text-[var(--foreground)]">
                {t('wbTitle')}
              </GhostTitle>
              <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[12px] mt-1">
                {t('wbSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={exportBackup}>
                <Download className="w-4 h-4" />
                导出备份
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <RefreshCw className="w-4 h-4" />
                导入恢复
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
              />
              <Button size="sm" variant="danger" onClick={clearAllData}>
                <Trash2 className="w-4 h-4" />
                清空
              </Button>
            </div>
          </div>

          {notice && (
            <p className="text-[12px] text-[var(--muted-foreground)] bg-[var(--border)]/30 rounded px-3 py-2">
              {notice === 'backup-hint'
                ? `数据已积累 ${totalRecords} 条，建议定期导出备份`
                : '备份文件格式无效，无法恢复'}
            </p>
          )}

          {full.map(({ id, component: C }) => (
            <VisibilityGate key={id} componentKey={id}>
              <C />
            </VisibilityGate>
          ))}

          {/* 布局设置 */}
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setShowLayout((v) => !v)}>
              <Settings2 className="w-4 h-4" />
              布局设置
            </Button>
          </div>

          {showLayout && (
            <div className="card-minimal p-4 flex flex-wrap gap-x-6 gap-y-2">
              {WIDGETS.filter((w) => w.id !== 'greeting').map((w) => {
                const checked = !prefs.hidden.includes(w.id);
                return (
                  <label
                    key={w.id}
                    className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWidget(w.id)}
                      className="accent-[var(--primary)]"
                    />
                    <span className="meta-mono text-[11px] uppercase tracking-wider">{w.id}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
              {primary.map(({ id, component: C }) => (
                <VisibilityGate key={id} componentKey={id}>
                  <C />
                </VisibilityGate>
              ))}
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4 min-w-0">
              {right.map(({ id, component: C }) => (
                <VisibilityGate key={id} componentKey={id}>
                  <C />
                </VisibilityGate>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
