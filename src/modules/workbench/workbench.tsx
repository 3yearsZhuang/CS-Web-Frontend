/**
 * @file 工作台主体 — 由 widget-registry 纯配置驱动渲染（§2.3 配置即内容数据）。
 * - 布局设置：widget 显隐开关（localStorage 持久化，§2.6 声明→配置→注册）
 * - 顶部提供「导出 JSON / 导入恢复 / 清空」数据备份入口
 * - LLM 用量与学习助手对话已合并为单张卡片（widgets/llm-widget），无独立视图切换
 */
'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Download, GripVertical, RefreshCw, RotateCcw, Settings2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import { WIDGET_SIZE_SPECS, GRID_COLS, type WidgetSizeKey } from './types';
import GreetingBar from './widgets/greeting-bar';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

/** 每卡尺寸规格选项的有序展示顺序（布局面板按钮按此排列） */
const SIZE_ORDER: WidgetSizeKey[] = [
  '1x1',
  '1x2',
  '2x1',
  '2x2',
  '1x3',
  '2x3',
  '3x2',
  'full',
];

const BACKUP_PREFIX = 'wb_';
const BACKUP_KEYS = [
  'wb_tasks',
  'wb_notes',
  'wb_pomodoro_settings',
  'wb_pomodoro_state',
  'wb_github_username',
  'wb_widget_prefs',
  'wb_schema_widgets',
];
const PREFS_KEY = 'wb_widget_prefs';

interface WidgetPrefs {
  hidden: string[];
  /** 用户自定义排序（覆盖 registry 声明序）；缺失的 id 按 registry 顺序补在末尾 */
  order: string[];
  /** 每卡尺寸规格 key（栅格 {w,h}）；缺省取 registry.defaultSize */
  sizes: Record<string, WidgetSizeKey>;
}

/** 取 widget 默认尺寸 key（无自定义时） */
function defaultSizeFor(w: WorkbenchWidget): WidgetSizeKey {
  return w.defaultSize;
}

/** 解析某 widget 当前生效的尺寸规格 key（用于高亮按钮 / 渲染）。
 *  若偏好值非法（如旧版本 sm/md/lg 残留）则回退默认，保证旧 localStorage 数据可平滑迁移。 */
function sizeKeyFor(w: WorkbenchWidget, prefs: WidgetPrefs): WidgetSizeKey {
  const v = prefs.sizes[w.id];
  if (v && v in WIDGET_SIZE_SPECS) return v;
  return defaultSizeFor(w);
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
  const [notice, setNotice] = useState<string | null>(null);
  const [showLayout, setShowLayout] = useState(false);
  // dnd-kit 的 useSortable 会生成自增 aria-describedby，SSR/CSR 必不一致导致全局 hydration 失败。
  // 故网格在挂载后才启用 dnd；SSR 与首屏渲染静态等价的网格（无拖拽属性）。
  // dnd-kit 的 useSortable 会生成自增 aria-describedby，SSR/CSR 必不一致导致全局 hydration 失败。
  // 故网格在挂载后才启用 dnd；SSR 与首屏渲染静态等价的网格（无拖拽属性）。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  /** 排序模式：进入后所有卡渲染为统一尺寸缩略卡，拖拽稳定（同尺寸 → 无畸变） */
  const [isSorting, setIsSorting] = useState(false);
  const [tasksCount] = useLocalStorage<unknown[]>('wb_tasks', []);
  const [notesCount] = useLocalStorage<unknown[]>('wb_notes', []);
  const [prefsRaw, setPrefs] = useLocalStorage<WidgetPrefs>(PREFS_KEY, { hidden: [], order: [], sizes: {} });

  // 正方单元：用 ResizeObserver 测量网格容器实际列宽 → 单元边长 = 列宽，
  // 使 1×1 永远正方形、1×2 为两横连正方形，任意屏宽严格成立（原则2）。
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState(120);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const GAP = 12; // gap-3
    const measure = () => {
      const w = el.clientWidth;
      const cs = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length || GRID_COLS;
      const side = (w - GAP * (cs - 1)) / cs;
      setCell(Math.max(72, Math.round(side)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // 退出排序模式（isSorting 变回 false）时 gridRef 重新挂载，需重新测量
  }, [mounted, isSorting]);
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

  /** 当前被拖拽的 widget id（驱动 DragOverlay 浮层） */
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveWidgetId(String(event.active.id));
  }, []);

  /** 拖拽结束：arrayMove 更新 order（同尺寸网格下，rectSorting 让位稳定、无畸变） */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveWidgetId(null);
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

  const handleDragCancel = useCallback(() => {
    setActiveWidgetId(null);
  }, []);

  /** 布局面板顺序调整：把某卡在有序列表中上移/下移一步（稳定通道，精确可控） */
  const moveWidget = useCallback(
    (id: string, dir: -1 | 1) => {
      setPrefs((prev) => {
        const ids = orderedWidgets.map((w) => w.id);
        const idx = ids.indexOf(id);
        const to = idx + dir;
        if (idx < 0 || to < 0 || to >= ids.length) return prev;
        const next = [...ids];
        const [moved] = next.splice(idx, 1);
        next.splice(to, 0, moved);
        return { ...prev, order: next };
      });
    },
    [orderedWidgets, setPrefs],
  );

  /** 切换某卡尺寸：在当前 sizeOptions 内循环（搭积木的"换块"） */
  const cycleSize = useCallback(
    (id: string) => {
      setPrefs((prev) => {
        const w = WIDGETS.find((x) => x.id === id);
        if (!w) return prev;
        const opts = w.sizeOptions;
        const current = prev.sizes[id] ?? w.defaultSize;
        const idx = opts.indexOf(current);
        const next = opts[(idx + 1) % opts.length];
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
          </div>

          {notice && (
            <p className="text-[12px] text-[var(--muted-foreground)] bg-[var(--border)]/30 rounded px-3 py-2">
              {notice === 'backup-hint'
                ? `数据已积累 ${totalRecords} 条，建议定期导出备份`
                : '备份文件格式无效，无法恢复'}
            </p>
          )}

          {/* 布局设置面板：由问候卡片内的「布局设置」按钮触发（showLayout 状态） */}
          {showLayout && (
            <DnaCard corner="CFG" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t('dragHint')}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={isSorting ? 'pixel' : 'pixel-outline'}
                    onClick={() => setIsSorting((v) => !v)}
                  >
                    {isSorting ? t('sortingExit') : t('sortingEnter')}
                  </Button>
                  <Button size="sm" variant="pixel-outline" onClick={resetLayout}>
                    <RotateCcw className="w-4 h-4" />
                    {t('resetLayout')}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {WIDGETS.map((w) => {
                  const checked = !prefs.hidden.includes(w.id);
                  const size = sizeKeyFor(w, prefs);
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
                        {w.sizeOptions.map((s) => (
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

              {/* 顺序调整：等尺寸行列表，精确上移/下移（稳定通道，替代易畸变的网格拖拽） */}
              <div className="border-t border-[var(--border)] pt-3 mt-1 flex flex-col gap-1.5">
                <span className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t('orderHint')}
                </span>
                <ul className="flex flex-col gap-1">
                  {orderedWidgets.map((w, i) => (
                    <li key={w.id} className="flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                      <span className="meta-mono text-[10px] w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="truncate flex-1">{t(w.titleKey)}</span>
                      <button
                        type="button"
                        aria-label="move up"
                        disabled={i === 0}
                        className="shrink-0 p-1 rounded hover:bg-[var(--border)] disabled:opacity-30"
                        onClick={() => moveWidget(w.id, -1)}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="move down"
                        disabled={i === orderedWidgets.length - 1}
                        className="shrink-0 p-1 rounded hover:bg-[var(--border)] disabled:opacity-30"
                        onClick={() => moveWidget(w.id, 1)}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </DnaCard>
          )}

          {/* 排序模式：所有卡渲染为统一尺寸缩略卡（同尺寸 → rectSorting 让位稳定、零畸变）。
              退出后按新顺序恢复变尺寸积木网格。 */}
          {isSorting ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={orderedWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {orderedWidgets.map((w) => (
                    <SortThumbnail key={w.id} id={w.id} titleKey={w.titleKey} />
                  ))}
                </div>
              </SortableContext>

              {/* 拖拽浮层：统一尺寸缩略卡跟手 */}
              <DragOverlay dropAnimation={null}>
                {activeWidgetId ? (
                  <ThumbnailGhost titleKey={WIDGETS.find((w) => w.id === activeWidgetId)?.titleKey ?? ''} />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div
              ref={gridRef}
              style={{ gridAutoRows: 'var(--wb-cell)', ['--wb-cell' as string]: `${cell}px` }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 [grid-auto-flow:dense] overflow-hidden"
            >
              {orderedWidgets.map((w) => {
                const { id, component: C } = w;
                const sizeKey = sizeKeyFor(w, prefs);
                const spec = WIDGET_SIZE_SPECS[sizeKey];
                return (
                  <div
                    key={id}
                    style={{ gridColumn: `span ${spec.w} / span ${spec.w}`, gridRow: `span ${spec.h} / span ${spec.h}` }}
                    className="relative group min-w-0 min-h-0 flex flex-col overflow-hidden"
                  >
                    <div className="min-h-0 flex-1 flex flex-col">
                      <VisibilityGate componentKey={id}>
                        {w.id === 'greeting' ? (
                          <GreetingBar
                            onExport={exportBackup}
                            onImport={(f) => onImportFile(f)}
                            onClear={clearAllData}
                            onOpenLayout={() => setShowLayout((v) => !v)}
                          />
                        ) : (
                          <C />
                        )}
                      </VisibilityGate>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** 排序模式缩略卡：统一尺寸（aspect-square），同尺寸下 rectSorting 让位稳定、零畸变 */
function SortThumbnail({ id, titleKey }: { id: string; titleKey: string }) {
  const t = useTranslations('workbench');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <DnaCard corner={id.slice(0, 3).toUpperCase()} className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <GripVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
        <span className="meta-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] leading-tight">
          {t(titleKey)}
        </span>
      </DnaCard>
    </div>
  );
}

/** 排序模式拖拽浮层：与缩略卡同尺寸的占位卡 */
function ThumbnailGhost({ titleKey }: { titleKey: string }) {
  const t = useTranslations('workbench');
  return (
    <div className="aspect-square pointer-events-none">
      <DnaCard className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <GripVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
        <span className="meta-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] leading-tight">
          {t(titleKey)}
        </span>
      </DnaCard>
    </div>
  );
}
