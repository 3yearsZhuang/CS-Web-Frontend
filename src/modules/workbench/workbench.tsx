/**
 * @file 工作台主体 — OS级交互工作区 (Bionic Workspace)
 * - 移除了表单配置式面板与 Dnd-kit 降级排序。
 * - 引入 react-grid-layout 2D 网格碰撞算法。
 * - 支持全局抖动编辑模式、缩放手柄与底部 Dock 资源库。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Responsive, useContainerWidth, type Layout, type LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { Button } from '@/components/primitives/button';
import { SectionMarker, Title } from '@/components';
import { useLocalStorage } from './hooks/use-local-storage';
import { WIDGETS, type WorkbenchWidget } from './widget-registry';
import { WIDGET_SIZE_SPECS, GRID_COLS, type WidgetSizeKey } from './types';
import GreetingBar from './widgets/greeting-bar';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';


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
  order: string[]; // 遗留字段，用于向下兼容
  sizes: Record<string, WidgetSizeKey>; // 遗留字段，用于向下兼容
  layouts?: Layout; // RGL 布局数据（v2：Layout = readonly LayoutItem[]）
}

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
  const { width, containerRef, mounted } = useContainerWidth();
  
  // OS 级编辑模式
  const [isEditMode, setIsEditMode] = useState(false);

  const [tasksCount] = useLocalStorage<unknown[]>('wb_tasks', []);
  const [notesCount] = useLocalStorage<unknown[]>('wb_notes', []);
  const [prefsRaw, setPrefs] = useLocalStorage<WidgetPrefs>(PREFS_KEY, { hidden: [], order: [], sizes: {} });

  const rawPrefs: Partial<WidgetPrefs> = (prefsRaw ?? {}) as Partial<WidgetPrefs>;
  const prefs: WidgetPrefs = {
    hidden: Array.isArray(rawPrefs.hidden) ? rawPrefs.hidden : [],
    order: Array.isArray(rawPrefs.order) ? rawPrefs.order : [],
    sizes: rawPrefs.sizes && typeof rawPrefs.sizes === 'object' && !Array.isArray(rawPrefs.sizes) ? rawPrefs.sizes : {},
    layouts: Array.isArray(rawPrefs.layouts) ? rawPrefs.layouts : undefined,
  };

  const totalRecords = useMemo(
    () => (Array.isArray(tasksCount) ? tasksCount.length : 0) + (Array.isArray(notesCount) ? notesCount.length : 0),
    [tasksCount, notesCount],
  );

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

  // 构建默认 Layout 或恢复已保存的 Layout
  const layouts = useMemo(() => {
    if (prefs.layouts && prefs.layouts.length > 0) {
      return prefs.layouts;
    }
    
    // 从旧版 fallback 或 defaultSize 生成
    let currentY = 0;
    let currentX = 0;
    const newLayouts: LayoutItem[] = [];
    
    const byId = new Map(WIDGETS.map((w) => [w.id, w]));
    const orderList = prefs.order.length > 0 ? prefs.order : WIDGETS.map(w => w.id);
    
    for (const id of orderList) {
      const w = byId.get(id);
      if (!w) continue;
      const sizeKey = prefs.sizes[id] ?? w.defaultSize;
      const spec = WIDGET_SIZE_SPECS[sizeKey] || WIDGET_SIZE_SPECS['1x1'];
      
      // 简单排列，防碰撞由 RGL 自己接管
      if (currentX + spec.w > GRID_COLS) {
        currentX = 0;
        currentY += 2;
      }
      
      newLayouts.push({
        i: w.id,
        x: currentX,
        y: currentY,
        w: spec.w,
        h: spec.h,
        minW: 1,
        maxW: 6,
        minH: 1,
      });
      
      currentX += spec.w;
    }
    return newLayouts;
  }, [prefs.layouts, prefs.order, prefs.sizes]);

  // RGL v2 回调签名：(currentLayout: Layout, layouts: Partial<Record<BreakPoint, Layout>>) => void
  const onLayoutChange = useCallback((currentLayout: Layout) => {
    setPrefs(prev => ({ ...prev, layouts: currentLayout }));
  }, [setPrefs]);

  const removeWidget = useCallback((id: string) => {
    setPrefs(prev => ({ ...prev, hidden: [...prev.hidden, id] }));
  }, [setPrefs]);

  const addWidget = useCallback((id: string) => {
    setPrefs(prev => ({ ...prev, hidden: prev.hidden.filter(h => h !== id) }));
  }, [setPrefs]);

  const activeWidgets = useMemo(() => WIDGETS.filter(w => !prefs.hidden.includes(w.id)), [prefs.hidden]);
  const inactiveWidgets = useMemo(() => WIDGETS.filter(w => prefs.hidden.includes(w.id)), [prefs.hidden]);

  return (
    <section data-section-nav="01|工作台" className="px-4 sm:px-6 md:px-8 py-10 sm:py-14 border-t border-[var(--border)] pixel-page relative min-h-[80vh]">
      <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px] relative z-10">
        <div className="flex flex-col gap-4">
          <SectionMarker>[ 01 ] 工作台 / WORKBENCH</SectionMarker>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <Title level={2} className="display-serif text-[clamp(24px,4vw,44px)]">
                {t('wbTitle')}
              </Title>
              <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[12px] mt-1">
                {t('wbSubtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                type="button" 
                className={isEditMode ? "btn-pixel-primary-sm" : "btn-pixel-outline-sm"} 
                onClick={() => setIsEditMode(v => !v)}
              >
                {isEditMode ? '完成配置' : '配置桌面空间'}
              </button>
              <button type="button" className="btn-pixel-outline-sm" onClick={exportBackup}>
                导出备份
              </button>
              <button type="button" className="btn-pixel-outline-sm" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json,.json';
                input.onchange = (e) => onImportFile((e.target as HTMLInputElement).files?.[0] ?? null);
                input.click();
              }}>
                导入恢复
              </button>
              <button type="button" className="btn-pixel-danger-sm" onClick={clearAllData}>
                清空
              </button>
            </div>
          </div>

          {notice && (
            <p className="text-[12px] text-[var(--muted-foreground)] bg-[var(--border)]/30 rounded px-3 py-2">
              {notice === 'backup-hint'
                ? `数据已积累 ${totalRecords} 条，建议定期导出备份`
                : '备份文件格式无效，无法恢复'}
            </p>
          )}

          {/* RGL 网格引擎 */}
          <div ref={containerRef} className={`transition-all duration-300 ${isEditMode ? 'p-4 bg-[var(--foreground)]/5 rounded-lg border-2 border-dashed border-[var(--primary)]/30' : ''}`}>
               {mounted && (
               <Responsive width={width}
                 className="layout"
                 layouts={{ lg: layouts, md: layouts, sm: layouts, xs: layouts, xxs: layouts }}
                 breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                 cols={{ lg: 6, md: 6, sm: 4, xs: 2, xxs: 1 }}
                 rowHeight={120}
                 dragConfig={{ enabled: isEditMode, handle: '.drag-handle' }}
                 resizeConfig={{ enabled: isEditMode }}
                 onLayoutChange={onLayoutChange}
                 margin={[16, 16]}
               >
                 {activeWidgets.map((w) => {
                   const { id, component: C } = w;
                   return (
                     <div 
                       key={id} 
                       className={`relative group bg-[var(--background)] ${isEditMode ? 'ring-2 ring-[var(--primary)] shadow-2xl cursor-grab active:cursor-grabbing animate-wiggle' : ''}`}
                     >
                       {/* 拖拽手柄层：仅在编辑模式展示 */}
                       {isEditMode && (
                         <div className="drag-handle absolute inset-0 z-20" />
                       )}
                       
                       {/* 移除按钮 */}
                       {isEditMode && (
                         <button 
                           onClick={() => removeWidget(id)}
                           className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[var(--destructive)] text-white flex items-center justify-center z-30 shadow-lg hover:scale-110 transition-transform"
                         >
                           <X className="w-3.5 h-3.5" />
                         </button>
                       )}
                       
                       <div className="w-full h-full relative z-10 pointer-events-auto">
                         <VisibilityGate componentKey={id}>
                           {w.id === 'greeting' ? (
                             <GreetingBar />
                           ) : (
                             <C />
                           )}
                         </VisibilityGate>
                       </div>
                     </div>
                   );
                 })}
               </Responsive>
               )}
            </div>
        </div>
      </div>

      {/* Widget Dock 底部资源库 */}
      {mounted && (
        <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-[var(--background)] border border-[var(--primary)] border-b-0 rounded-t-xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[100] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex gap-4 overflow-x-auto ${isEditMode ? 'translate-y-0' : 'translate-y-[120%]'}`}>
          <div className="absolute -top-[14px] left-6 font-pixel text-[10px] text-[var(--primary)] bg-[var(--background)] px-2 py-0.5 border border-[var(--primary)] uppercase">
            Widget Gallery · 点击添加到桌面
          </div>
          {inactiveWidgets.length === 0 ? (
            <div className="w-full text-center text-[var(--muted-foreground)] text-[12px] py-4 meta-mono">
              ALL WIDGETS ARE ON DESKTOP
            </div>
          ) : (
            inactiveWidgets.map(w => (
              <button 
                key={w.id} 
                onClick={() => addWidget(w.id)}
                className="shrink-0 w-32 h-24 border border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] flex flex-col items-center justify-center gap-2 bg-[var(--foreground)]/5 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="meta-mono text-[10px]">{t(w.titleKey)}</span>
              </button>
            ))
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-0.5deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(0.5deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-wiggle {
          animation: wiggle 2s infinite ease-in-out;
        }
        /* RGL overrides for cleaner look in bionic mode */
        .react-grid-item.react-grid-placeholder {
          background: var(--primary) !important;
          opacity: 0.1 !important;
          border-radius: 4px;
        }
        .react-resizable-handle {
          z-index: 50 !important;
          background-image: none !important;
          width: 20px !important;
          height: 20px !important;
          bottom: -4px !important;
          right: -4px !important;
        }
        .react-resizable-handle::after {
          content: "";
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          border-right: 2px solid var(--primary);
          border-bottom: 2px solid var(--primary);
        }
      `}</style>
    </section>
  );
}
