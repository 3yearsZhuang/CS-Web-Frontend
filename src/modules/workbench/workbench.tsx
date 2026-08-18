/**
 * @file 工作台主体 — 由 widget-registry 纯配置驱动渲染（§2.3 配置即内容数据）。
 * - 布局设置：widget 显隐开关（localStorage 持久化，§2.6 声明→配置→注册）
 * - 顶部提供「导出 JSON / 导入恢复 / 清空」数据备份入口
 * - LLM 用量与学习助手对话已合并为单张卡片（widgets/llm-widget），无独立视图切换
 */
'use client';

import { useTranslations } from 'next-intl';
import { Download, GripVertical, RefreshCw, RotateCcw, Settings2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/primitives/button';
import { DnaCard, GhostTitle, SectionMarker, Title } from '@/components';
import { useLocalStorage } from './hooks/use-local-storage';
import { WIDGETS, type WorkbenchWidget } from './widget-registry';
import type { WidgetSizeSpan } from './types';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

const SIZE_SPAN: Record<'sm' | 'md' | 'lg', WidgetSizeSpan> = { sm: 4, md: 8, lg: 12 };
const SIZE_ORDER: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

const BACKUP_PREFIX = 'wb_';
const BACKUP_KEYS = ['wb_tasks', 'wb_notes', 'wb_pomodoro_settings', 'wb_pomodoro_state'];
const PREFS_KEY = 'wb_widget_prefs';

interface WidgetPrefs {
  hidden: string[];
  /** 用户自定义排序（覆盖 registry 声明序）；缺失的 id 按 registry 顺序补在末尾 */
  order: string[];
  /** 每卡尺寸档：col-span 4 / 8 / 12，缺省取 registry.defaultSpan */
  sizes: Record<string, 'sm' | 'md' | 'lg'>;
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
  const [prefsRaw, setPrefs] = useLocalStorage<WidgetPrefs>(PREFS_KEY, { hidden: [], order: [], sizes: {} });
  // 双层防御旧 schema：useLocalStorage 现已对 object 类型做默认浅合并（缺字段回退默认），
  // 但若旧 localStorage 把 order/sizes 存成了非预期类型（如 order 写成字符串），merge 仍不会纠正类型，
  // 故此处再对字段做类型收窄，确保 `prefs.order is not iterable` 在任何畸形数据下都不复现。
  const rawPrefs: Partial<WidgetPrefs> = (prefsRaw ?? {}) as Partial<WidgetPrefs>;
  const prefs: WidgetPrefs = {
    hidden: Array.isArray(rawPrefs.hidden) ? rawPrefs.hidden : [],
    order: Array.isArray(rawPrefs.order) ? rawPrefs.order : [],
    sizes:
      rawPrefs.sizes && typeof rawPrefs.sizes === 'object' && !Array.isArray(rawPrefs.sizes)
        ? rawPrefs.sizes
        : {},
  };

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

  /** 解析最终渲染列表：order 优先，缺失 id 按 registry 声明序补末尾，再过滤 hidden */
  const orderedWidgets = useMemo<WorkbenchWidget[]>(() => {
    const hidden = new Set(prefs.hidden);
    const byId = new Map(WIDGETS.map((w) => [w.id, w]));
    const seen = new Set<string>();
    const ordered: WorkbenchWidget[] = [];
    for (const id of prefs.order) {
      const w = byId.get(id);
      if (w && !seen.has(id)) {
        seen.add(id);
        ordered.push(w);
      }
    }
    for (const w of WIDGETS) {
      if (!seen.has(w.id)) ordered.push(w);
    }
    return ordered.filter((w) => !hidden.has(w.id));
  }, [prefs.order, prefs.hidden]);

  const toggleWidget = useCallback(
    (id: string) => {
      setPrefs((prev) => {
        const hidden = prev.hidden.includes(id)
          ? prev.hidden.filter((h) => h !== id)
          : [...prev.hidden, id];
        return { ...prev, hidden };
      });
    },
    [setPrefs],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setPrefs((prev) => {
        const ids = orderedWidgets.map((w) => w.id);
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from < 0 || to < 0) return prev;
        return { ...prev, order: arrayMove(ids, from, to) };
      });
    },
    [orderedWidgets, setPrefs],
  );

  const cycleSize = useCallback(
    (id: string) => {
      setPrefs((prev) => {
        const current = prev.sizes[id] ?? 'md';
        const next = SIZE_ORDER[(SIZE_ORDER.indexOf(current) + 1) % SIZE_ORDER.length];
        return { ...prev, sizes: { ...prev.sizes, [id]: next } };
      });
    },
    [setPrefs],
  );

  const resetLayout = useCallback(() => {
    if (!window.confirm(t('confirmResetLayout'))) return;
    setPrefs({ hidden: [], order: [], sizes: {} });
  }, [t, setPrefs]);

  return (
    <section data-section-nav="01|工作台" className="px-4 sm:px-6 md:px-8 py-10 sm:py-14 border-t border-[var(--border)] pixel-page">
      <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
        <div className="flex flex-col gap-4">
          <SectionMarker>[ 01 ] 工作台 / WORKBENCH</SectionMarker>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Title level={2} className="text-[clamp(24px,4vw,44px)]">
                {t('wbTitle')}
              </Title>
              <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[12px] mt-1">
                {t('wbSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="pixel-outline" onClick={exportBackup}>
                <Download className="w-4 h-4" />
                导出备份
              </Button>
              <Button size="sm" variant="pixel-outline" onClick={() => fileRef.current?.click()}>
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
              <Button size="sm" variant="pixel-danger" onClick={clearAllData}>
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

          {/* 布局设置：显隐 + 尺寸三档 + 重置 */}
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button size="sm" variant="pixel-outline" onClick={() => setShowLayout((v) => !v)}>
              <Settings2 className="w-4 h-4" />
              布局设置
            </Button>
          </div>

          {showLayout && (
            <DnaCard corner="CFG" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t('dragHint')}
                </span>
                <Button size="sm" variant="pixel-outline" onClick={resetLayout}>
                  <RotateCcw className="w-4 h-4" />
                  {t('resetLayout')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {WIDGETS.filter((w) => w.id !== 'greeting').map((w) => {
                  const checked = !prefs.hidden.includes(w.id);
                  const size = prefs.sizes[w.id] ?? 'md';
                  return (
                    <div key={w.id} className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWidget(w.id)}
                          className="accent-[var(--primary)]"
                        />
                        <span className="meta-mono text-[11px] uppercase tracking-wider">{w.id}</span>
                      </label>
                      <div className="flex overflow-hidden rounded border border-[var(--border)]">
                        {SIZE_ORDER.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setPrefs((prev) => ({ ...prev, sizes: { ...prev.sizes, [w.id]: s } }))
                            }
                            className={`px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
                              size === s ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--border)]/40'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DnaCard>
          )}

          {/* 主网格：单容器 12 栅格 + auto-flow dense，每卡按 size→col-span，dnd-kit 可拖拽排序 */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start auto-rows-min">
                {orderedWidgets.map(({ id, component: C, defaultSpan }) => {
                  const size = prefs.sizes[id] ?? 'md';
                  const span = SIZE_SPAN[size] ?? defaultSpan;
                  return (
                    <SortableWidget key={id} id={id} span={span}>
                      <VisibilityGate componentKey={id}>
                        <C />
                      </VisibilityGate>
                    </SortableWidget>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </section>
  );
}

/** 尺寸档 → 宽高比（仅 lg 起生效，窄屏回落内容自适应），保证同档卡片等长宽；
 *  greeting 为顶部横条（唯一 12 档），豁免等比以避免被压成扁条，改用自适应高度 */
const SPAN_ASPECT: Record<WidgetSizeSpan, string> = {
  4: 'lg:aspect-[4/3]',
  8: 'lg:aspect-[16/9]',
  12: 'lg:aspect-[21/9]',
};

/** 可拖拽排序的网格项：包裹 widget，提供拖拽手柄、col-span 与固定宽高比 */
function SortableWidget({
  id,
  span,
  children,
}: {
  id: string;
  span: WidgetSizeSpan;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${span} / span ${span}`,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  const aspectClass = id === 'greeting' ? 'lg:min-h-[120px]' : SPAN_ASPECT[span];
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group min-w-0 flex flex-col ${aspectClass}`}
    >
      <button
        type="button"
        aria-label="拖拽排序"
        className="absolute top-2 right-2 z-10 p-1 rounded bg-[var(--background)]/80 border border-[var(--border)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
      </button>
      <div className="min-h-0 flex-1 flex flex-col">{children}</div>
    </div>
  );
}
