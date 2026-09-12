'use client';

/**
 * @file ArchiveIndex — Rhine 档案柜共享 UI（FrontDoc-UID §17 作用域内复用）
 *
 * /lab/archive（演示编目）与 /tools/resource?view=archive（真实资源）共用本组件，
 * 差异全部由 `groups` 数据与 `labels` 注入，组件本身不含业务依赖。
 *
 * 交互：←→ 切类（含选择记忆）、↑↓ 循环翻阅、Enter 详情、/ 检索、S 收藏、Esc 返回；
 * 侧栏编号 460ms 滚动（reduced-motion 退化为静态文本）；
 * 快切标题闪动塌条（连续切换 <240ms 触发，静止 300ms 恢复）。
 *
 * 可访问性：覆盖层 role="dialog" aria-modal；打开时焦点移至主控件；
 * prefers-reduced-motion 下由 CSS 统一压制动画（见 globals.css §17）。
 *
 * 作用域约束：本组件仅可在 §17 白名单路由内使用（/lab、/tools/resource?view=archive）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  metaOf,
  recordsOf,
  summaryOf,
  type ArchiveEntry,
  type ArchiveGroup,
  type ArchiveLabels,
} from './archive-model';

/** 快切判定阈值（ms） */
const FLICK_GAP = 240;
/** 快切静止恢复时长（ms） */
const FLICK_QUIET = 300;

type Overlay = 'detail' | 'search' | 'favs' | null;

export interface ArchiveIndexProps {
  /** 分类编目（空分类会被过滤；全空时显示空态） */
  groups: ArchiveGroup[];
  /** 收藏持久化键（localStorage） */
  favsKey?: string;
  /** 文案覆盖（业务页可注入 i18n） */
  labels?: Partial<ArchiveLabels>;
  /** 顶栏附加节点（业务页可注入入口，如"提交资源"） */
  headerExtra?: React.ReactNode;
}

export function ArchiveIndex({
  groups,
  favsKey = 'fztbu-rhine-archive-favs',
  labels: labelOverrides,
  headerExtra,
}: ArchiveIndexProps) {
  const labels: ArchiveLabels = { ...DEFAULT_LABELS, ...labelOverrides };

  /** 过滤空分类后的实际类别 */
  const visible = useMemo(() => groups.filter((g) => g.items.length > 0), [groups]);

  const [cat, setCat] = useState(0);
  const [idx, setIdx] = useState(0);
  const [memory, setMemory] = useState<number[]>([]);
  const [favs, setFavs] = useState<Record<string, true>>({});
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [flick, setFlick] = useState(false);
  const [reduced, setReduced] = useState(false);

  const listRef = useRef<HTMLElement>(null);
  const lastSwitchRef = useRef(0);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = visible[cat];
  const current: ArchiveEntry | undefined = group?.items[idx];
  const favCount = Object.keys(favs).length;

  /* 收藏水合 */
  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(favsKey) || '{}'));
    } catch {
      /* 存储不可用按空收藏处理 */
    }
  }, [favsKey]);

  /* 减少动态效果偏好 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  /* 数据集变化时重置选择 */
  useEffect(() => {
    setCat(0);
    setIdx(0);
    setMemory(visible.map(() => 0));
  }, [visible]);

  useEffect(() => () => {
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
  }, []);

  const markSwitch = useCallback((viaKey: boolean) => {
    const now = Date.now();
    if (viaKey && !reduced && now - lastSwitchRef.current < FLICK_GAP) {
      setFlick(true);
      if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
      quietTimerRef.current = setTimeout(() => setFlick(false), FLICK_QUIET);
    }
    lastSwitchRef.current = now;
  }, [reduced]);

  const select = useCallback((next: number, viaKey = false) => {
    if (!group) return;
    const len = group.items.length;
    const n = ((next % len) + len) % len;
    setIdx(n);
    setMemory((m) => m.map((v, i) => (i === cat ? n : v)));
    markSwitch(viaKey);
  }, [cat, group, markSwitch]);

  const switchCat = useCallback((next: number) => {
    if (!visible.length) return;
    const n = ((next % visible.length) + visible.length) % visible.length;
    setCat(n);
    setIdx(memory[n] ?? 0);
    markSwitch(true);
    listRef.current?.scrollTo?.({ top: 0 });
  }, [visible.length, memory, markSwitch]);

  useEffect(() => {
    listRef.current?.querySelector('.rhine-arow.sel')?.scrollIntoView?.({ block: 'nearest' });
  }, [cat, idx]);

  const toggleFav = useCallback(() => {
    if (!current) return;
    const id = current.id;
    setFavs((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      try {
        localStorage.setItem(favsKey, JSON.stringify(next));
      } catch {
        /* 存储失败仅影响持久化 */
      }
      return next;
    });
  }, [current, favsKey]);

  const gotoItem = useCallback((it: ArchiveEntry) => {
    const gi = visible.findIndex((g) => g.items.includes(it));
    if (gi < 0) return;
    const ii = visible[gi].items.indexOf(it);
    setOverlay(null);
    setCat(gi);
    setIdx(ii);
    setMemory((m) => m.map((v, i) => (i === gi ? ii : v)));
    setOverlay('detail');
  }, [visible]);

  /* 检索 */
  const [query, setQuery] = useState('');
  const [searchSel, setSearchSel] = useState(0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all = visible.flatMap((g) => g.items);
    return all
      .filter((it) =>
        `${it.id} ${it.title} ${it.en ?? ''} ${it.owner ?? ''} ${(it.tags ?? []).join(' ')}`
          .toLowerCase()
          .includes(q))
      .slice(0, 30);
  }, [query, visible]);
  useEffect(() => setSearchSel(0), [results.length]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const detailBackRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (overlay === 'search') searchInputRef.current?.focus();
    if (overlay === 'detail') detailBackRef.current?.focus();
  }, [overlay]);

  const exportTxt = useCallback(() => {
    if (!current) return;
    const txt = `FZTBU·CS ARCHIVE EXPORT\n======================\n\n${metaOf(current)}\n\nSUMMARY\n-------\n${summaryOf(current)}\n\nRECORDS\n-------\n${recordsOf(current).map((r) => `[${r[0]}] ${r[1]}`).join('\n')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = `${current.id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [current]);

  /* 键盘导航 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (overlay === 'search') {
        if (e.key === 'Escape') setOverlay(null);
        else if (e.key === 'Enter') {
          const r = results[searchSel];
          if (r) gotoItem(r);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (results.length) {
            setSearchSel((s) => (s + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
          }
        }
        return;
      }
      if (e.key === 'Escape') { setOverlay(null); return; }
      if (overlay) return;
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setQuery('');
        setOverlay('search');
      } else if (e.key === 'ArrowLeft') switchCat(cat - 1);
      else if (e.key === 'ArrowRight') switchCat(cat + 1);
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(idx - 1, true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); select(idx + 1, true); }
      else if (e.key === 'Enter' && !typing) setOverlay('detail');
      else if ((e.key === 's' || e.key === 'S') && !typing) toggleFav();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlay, cat, idx, results, searchSel, switchCat, select, toggleFav, gotoItem]);

  /* 全空数据 */
  if (!visible.length || !group || !current) {
    return (
      <div
        className="rhine-scope flex flex-1 items-center justify-center"
        style={{ background: 'var(--rhine-paper)', color: 'var(--rhine-ink-dim)', fontFamily: 'var(--rhine-mono)' }}
      >
        <span className="text-[11px] tracking-[0.2em]">{labels.empty}</span>
      </div>
    );
  }

  return (
    <div
      className="rhine-scope flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--rhine-paper)', color: 'var(--rhine-ink)', fontFamily: 'var(--rhine-sans)' }}
    >
      <header
        className="flex min-h-[52px] items-center gap-5 border-b px-5"
        style={{ borderColor: 'var(--rhine-hairline)' }}
      >
        <span className="text-[12px] font-semibold tracking-[0.28em]" style={{ fontFamily: 'var(--rhine-mono)' }}>
          FZTBU·CS <em className="not-italic" style={{ color: 'var(--rhine-amber)' }}>ARCHIVE</em>
        </span>
        <span className="hidden text-[10px] tracking-[0.18em] sm:inline" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          {labels.headerCrumb}
        </span>
        <span className="flex-1" />
        <button type="button" className="rhine-topbtn" onClick={() => { setQuery(''); setOverlay('search'); }}>
          {labels.search} <b>/</b>
        </button>
        <button type="button" className="rhine-topbtn" onClick={() => setOverlay('favs')}>
          {labels.saved} <b>{favCount}</b>
        </button>
        {headerExtra}
        {labels.backHref && (
          <a href={labels.backHref} className="rhine-topbtn">← {labels.backLabel}</a>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[208px_1fr_300px]">
        <nav aria-label={labels.categoryLabel} className="hidden overflow-y-auto border-r py-4 md:block" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <div className="px-5 pb-3 text-[10px] tracking-[0.3em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            {labels.catRailTitle}
          </div>
          {visible.map((g, i) => (
            <button
              key={g.key}
              type="button"
              className={`rhine-cat${i === cat ? ' active' : ''}`}
              onClick={() => switchCat(i)}
            >
              <span className="no">[ {String(i + 1).padStart(2, '0')} ]</span>
              <span className="name">{g.name}</span>
              <span className="en">{g.en}</span>
            </button>
          ))}
        </nav>

        <section aria-label={labels.listLabel} ref={listRef} className="relative overflow-y-auto">
          <div
            className="sticky top-0 z-[1] flex items-baseline gap-3.5 border-b px-6 pb-3.5 pt-[18px]"
            style={{ background: 'var(--rhine-paper)', borderColor: 'var(--rhine-hairline)' }}
          >
            <span className="text-[20px] font-semibold">{group.name}</span>
            <span className="text-[10px] tracking-[0.24em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              {group.en}
            </span>
            <span className="ml-auto text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              TOTAL {String(group.items.length).padStart(2, '0')}
            </span>
          </div>
          {group.items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              className={`rhine-arow${i === idx ? ' sel' : ''}${favs[it.id] ? ' faved' : ''}`}
              onClick={() => select(i)}
              onDoubleClick={() => setOverlay('detail')}
            >
              <span className="rid">{it.id}</span>
              <span>
                <span className={`rtitle${flick && i === idx ? ' rhine-flick' : ''}`}>{it.title}</span>
                <span className="rmeta">
                  {[it.en, it.owner, it.date].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="rfav">● {labels.saved}</span>
            </button>
          ))}
        </section>

        <aside aria-label={labels.asideLabel} className="hidden overflow-y-auto border-l p-5 md:block" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <div className="text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            {labels.currentLabel}
          </div>
          <div className="mb-1 mt-2.5 flex items-baseline gap-2">
            <span className="text-[22px] font-light" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              {group.key}-
            </span>
            <span className="text-[28px] font-semibold" style={{ fontFamily: 'var(--rhine-mono)' }}>
              <RollingNumber value={String(idx + 1).padStart(3, '0')} reduced={reduced} />
            </span>
          </div>
          <div className="mb-3.5 mt-2.5 min-h-[2.6em] text-[15px] font-semibold leading-[1.5]">{current.title}</div>
          <SideKv k={labels.owner} v={current.owner ?? '—'} />
          <SideKv k={labels.date} v={current.date ?? '—'} />
          <SideKv k={labels.status} v={labels.statusOpen} />
          <button
            type="button"
            className="mt-[18px] w-full border py-3 text-center text-[11px] tracking-[0.34em] transition-colors hover:bg-[var(--rhine-ink)] hover:text-[var(--rhine-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rhine-amber)]"
            style={{ fontFamily: 'var(--rhine-mono)', borderColor: 'var(--rhine-ink)' }}
            onClick={() => setOverlay('detail')}
          >
            {labels.access} →
          </button>
        </aside>
      </div>

      <footer
        className="hidden min-h-[40px] items-center gap-5 overflow-x-auto border-t px-5 sm:flex"
        style={{ borderColor: 'var(--rhine-hairline)' }}
      >
        {([['←→', labels.hintCat], ['↑↓', labels.hintPage], ['ENTER', labels.hintOpen], ['/', labels.search], ['S', labels.saved], ['ESC', labels.hintBack]] as const).map(([k, v]) => (
          <span key={k} className="whitespace-nowrap text-[9px] tracking-[0.16em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            <b style={{ color: 'var(--rhine-ink)' }}>{k}</b> {v}
          </span>
        ))}
      </footer>

      <DetailOverlay
        key={current.id}
        item={current}
        open={overlay === 'detail'}
        faved={!!favs[current.id]}
        labels={labels}
        backRef={detailBackRef}
        onClose={() => setOverlay(null)}
        onToggleFav={toggleFav}
        onExport={exportTxt}
      />
      <SearchOverlay
        open={overlay === 'search'}
        query={query}
        results={results}
        sel={searchSel}
        labels={labels}
        inputRef={searchInputRef}
        onQuery={setQuery}
        onSel={setSearchSel}
        onPick={gotoItem}
        onClose={() => setOverlay(null)}
      />
      <FavsOverlay
        open={overlay === 'favs'}
        favs={favs}
        items={visible.flatMap((g) => g.items)}
        labels={labels}
        onPick={gotoItem}
        onClose={() => setOverlay(null)}
      />
    </div>
  );
}

/** 默认文案（中文；业务页可用 labels 注入 i18n） */
export const DEFAULT_LABELS: ArchiveLabels = {
  headerCrumb: 'ARCHIVE INDEX // 档案柜',
  categoryLabel: '档案分类',
  catRailTitle: 'CATEGORY',
  listLabel: '档案列表',
  currentLabel: 'CURRENT ARCHIVE',
  asideLabel: '当前档案',
  search: '检索',
  searchInputLabel: '检索档案',
  searchDialogLabel: '档案检索',
  saved: 'SAVED',
  owner: 'OWNER',
  date: 'DATE',
  status: 'STATUS',
  statusOpen: '可访问 / OPEN',
  access: 'ACCESS FILE',
  empty: 'NO ARCHIVES // 暂无档案',
  placeholder: '编号 / 标题 / 英文 / 标签…',
  hintCat: '切列',
  hintPage: '翻阅',
  hintOpen: '读取',
  hintBack: '返回',
  backHref: undefined,
  backLabel: 'BACK',
  tabSummary: '概述 SUMMARY',
  tabRecords: '记录 RECORDS',
  tabMeta: '元数据 META',
  actionSave: 'SAVE ARCHIVE',
  actionSaved: 'SAVED ●',
  actionExport: 'EXPORT .TXT',
  actionOpenLink: '打开原链 OPEN LINK',
  actionBack: '← BACK / ESC',
  detailCrumb: 'ARCHIVE DETAIL // 档案详情',
  modelCaption: 'DOCUMENT MODEL · 2D PLACEHOLDER',
  favEmpty: 'NO SAVED ARCHIVES · 按 S 收藏当前档案',
  searchHint: 'ARCHIVE INDEX · ↑↓ 选择 · ENTER 读取 · ESC 关闭',
  noMatch: 'NO MATCH // 无匹配档案',
};

/** 侧栏键值行 */
function SideKv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-t py-2 text-[11px]" style={{ borderColor: 'var(--rhine-hairline)' }}>
      <span className="text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

/** 编号滚动（reduced 退化为静态文本） */
function RollingNumber({ value, reduced }: { value: string; reduced: boolean }) {
  if (reduced) return <span>{value}</span>;
  return (
    <span className="rhine-roll">
      <span className="sr-only">{value}</span>
      {value.split('').map((d, i) => (
        <span key={i} className="rhine-roll-dig" aria-hidden="true">
          <span className="rhine-roll-col" style={{ transform: `translateY(-${Number(d)}em)` }}>
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/** 详情覆盖层 */
function DetailOverlay({
  item,
  open,
  faved,
  labels,
  backRef,
  onClose,
  onToggleFav,
  onExport,
}: {
  item: ArchiveEntry;
  open: boolean;
  faved: boolean;
  labels: ArchiveLabels;
  backRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onToggleFav: () => void;
  onExport: () => void;
}) {
  const [tab, setTab] = useState<'p1' | 'p2' | 'p3'>('p1');
  return (
    <div className={`rhine-ov${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label={`档案详情 ${item.id}`} aria-hidden={!open}>
      <div className="rhine-ov-head">
        <button ref={backRef} type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>
          {labels.actionBack}
        </button>
        <span className="text-[10px] tracking-[0.18em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          {labels.detailCrumb}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(280px,42%)_1fr]">
        <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <div className="rhine-abox" aria-hidden="true">
            <div className="cover" />
            <div className="strip" />
            <div className="scanln" />
            <div className="plate">{item.id}</div>
          </div>
          <div className="absolute bottom-3.5 left-[18px] text-[9px] tracking-[0.24em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            {labels.modelCaption}
          </div>
        </div>
        <div className="overflow-y-auto px-[30px] pb-10 pt-[26px]">
          <div className="text-[12px] font-semibold tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-amber)' }}>
            ARCHIVE {item.id}
          </div>
          <h1 className="mb-1 mt-2.5 text-[clamp(22px,3vw,34px)] font-semibold">{item.title}</h1>
          {item.en && (
            <div className="text-[11px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              {item.en}
            </div>
          )}
          <div className="mb-4 mt-[18px] flex flex-wrap gap-x-[26px] gap-y-2 border-y py-3" style={{ borderColor: 'var(--rhine-hairline)' }}>
            <DetailMeta k={labels.owner} v={item.owner ?? '—'} />
            <DetailMeta k={labels.date} v={item.date ?? '—'} />
            <DetailMeta k="TAGS" v={(item.tags ?? []).join(', ') || '—'} />
          </div>
          <div className="mb-4 flex border-b" style={{ borderColor: 'var(--rhine-hairline)' }} role="tablist">
            {([['p1', labels.tabSummary], ['p2', labels.tabRecords], ['p3', labels.tabMeta]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`rhine-dtab${tab === key ? ' active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'p1' && <p className="text-[13.5px] leading-[2] text-[#33302c]">{summaryOf(item)}</p>}
          {tab === 'p2' && (
            <div>
              {recordsOf(item).map(([t, line]) => (
                <div key={t} className="flex gap-3.5 border-b border-dashed py-2 text-[12px]" style={{ borderColor: 'var(--rhine-hairline)' }}>
                  <span className="whitespace-nowrap pt-0.5 text-[10px]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>{t}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'p3' && (
            <pre className="whitespace-pre-wrap text-[11px] leading-[2.2]" style={{ fontFamily: 'var(--rhine-mono)' }}>{metaOf(item)}</pre>
          )}
          <div className="mt-[26px] flex flex-wrap gap-3">
            <button type="button" className={`rhine-actbtn${faved ? ' saved' : ''}`} onClick={onToggleFav}>
              {faved ? labels.actionSaved : labels.actionSave}
            </button>
            <button type="button" className="rhine-actbtn ghost" onClick={onExport}>
              {labels.actionExport}
            </button>
            {item.href && (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rhine-actbtn ghost"
                tabIndex={open ? 0 : -1}
              >
                {labels.actionOpenLink}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailMeta({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-[11px]">
      <span className="mb-[3px] block text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

/** 检索覆盖层 */
function SearchOverlay({
  open,
  query,
  results,
  sel,
  labels,
  inputRef,
  onQuery,
  onSel,
  onPick,
  onClose,
}: {
  open: boolean;
  query: string;
  results: ArchiveEntry[];
  sel: number;
  labels: ArchiveLabels;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onSel: (i: number) => void;
  onPick: (it: ArchiveEntry) => void;
  onClose: () => void;
}) {
  return (
    <div className={`rhine-ov${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label={labels.searchDialogLabel} aria-hidden={!open}>
      <div className="mx-auto mt-[12vh] w-[min(680px,92vw)]">
        <div className="flex items-center gap-3 border-b-[1.5px] pb-2.5" style={{ borderColor: 'var(--rhine-ink)' }}>
          <span className="text-[18px]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-amber)' }}>/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={labels.placeholder}
            aria-label={labels.searchInputLabel}
            tabIndex={open ? 0 : -1}
            className="flex-1 bg-transparent text-[18px] tracking-[0.06em] outline-none placeholder:text-[var(--rhine-ink-dim)]"
            style={{ fontFamily: 'var(--rhine-mono)' }}
          />
        </div>
        <div className="mt-2 text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          {labels.searchHint}
        </div>
        <div className="mt-[18px] max-h-[56vh] overflow-y-auto">
          {results.map((it, i) => (
            <button
              key={it.id}
              type="button"
              className={`rhine-sr${i === sel ? ' sel' : ''}`}
              onClick={() => onPick(it)}
              onMouseEnter={() => onSel(i)}
              tabIndex={open ? 0 : -1}
            >
              <span className="sid">{it.id}</span>
              <span className="st">{it.title}</span>
              <span className="sc">{it.date ?? ''}</span>
            </button>
          ))}
          {query.trim() && results.length === 0 && (
            <div className="px-1.5 py-5 text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              {labels.noMatch}
            </div>
          )}
        </div>
        <div className="mt-6">
          <button type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>{labels.actionBack}</button>
        </div>
      </div>
    </div>
  );
}

/** 收藏覆盖层 */
function FavsOverlay({
  open,
  favs,
  items,
  labels,
  onPick,
  onClose,
}: {
  open: boolean;
  favs: Record<string, true>;
  items: ArchiveEntry[];
  labels: ArchiveLabels;
  onPick: (it: ArchiveEntry) => void;
  onClose: () => void;
}) {
  const picked = items.filter((it) => favs[it.id]);
  return (
    <div className={`rhine-ov${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label={labels.saved} aria-hidden={!open}>
      <div className="rhine-ov-head">
        <button type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>{labels.actionBack}</button>
        <span className="text-[10px] tracking-[0.18em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          {labels.saved}
        </span>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5 overflow-y-auto p-6">
        {picked.map((it) => (
          <button key={it.id} type="button" className="rhine-favcard" onClick={() => onPick(it)} tabIndex={open ? 0 : -1}>
            <div className="fid">{it.id} / {it.date ?? '—'}</div>
            <div className="ft">{it.title}</div>
          </button>
        ))}
        {picked.length === 0 && (
          <div className="col-span-full py-[60px] text-center text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            {labels.favEmpty}
          </div>
        )}
      </div>
    </div>
  );
}
