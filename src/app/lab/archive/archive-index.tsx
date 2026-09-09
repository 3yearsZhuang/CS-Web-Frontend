'use client';

/**
 * @file ArchiveIndex — Rhine 档案柜（/lab/archive · C2-1 · FrontDoc-UID §17）
 *
 * 2D 档案柜完整交互：五类 × 八份档案、类别轨 / 列表 / 侧栏速览三栏，
 * 详情 / 检索 / 收藏三覆盖层。键盘：←→ 切类（含选择记忆）、↑↓ 翻阅（循环）、
 * Enter 读取、/ 检索、S 收藏、Esc 返回；快切标题闪动塌条、侧栏编号 460ms 滚动。
 * 数据为演示编目（archive-data.ts），C2-2 评估替换为真实资源站数据。
 *
 * 可访问性：覆盖层 role="dialog" aria-modal；打开时焦点移至主控件；
 * prefers-reduced-motion 关闭编号滚动 / 标题快切 / 扫描线动画（CSS 层统一压制）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ALL_ARCHIVES,
  ARCHIVE_CATS,
  metaOf,
  recordsOf,
  summaryOf,
  type ArchiveItem,
} from './archive-data';

/** 收藏持久化键（localStorage） */
const FAVS_KEY = 'fztbu-lab-archive-favs';
/** 快切判定阈值（ms）— 连续切换间隔小于该值触发标题闪动 */
const FLICK_GAP = 240;
/** 快切静止恢复时长（ms） */
const FLICK_QUIET = 300;

type Overlay = 'detail' | 'search' | 'favs' | null;

export function ArchiveIndex() {
  const [cat, setCat] = useState(0);
  const [idx, setIdx] = useState(0);
  const [memory, setMemory] = useState<number[]>(() => ARCHIVE_CATS.map(() => 0));
  const [favs, setFavs] = useState<Record<string, true>>({});
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [flick, setFlick] = useState(false);
  const [reduced, setReduced] = useState(false);

  const listRef = useRef<HTMLElement>(null);
  const lastSwitchRef = useRef(0);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = ARCHIVE_CATS[cat].items[idx];
  const favCount = Object.keys(favs).length;

  /* 收藏水合（localStorage） */
  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(FAVS_KEY) || '{}'));
    } catch {
      /* 存储不可用或数据损坏时按空收藏处理 */
    }
  }, []);

  /* 减少动态效果偏好 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  /* 卸载时清理快切计时器 */
  useEffect(() => () => {
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
  }, []);

  /* 快切标题闪动：间隔 <FLICK_GAP 触发，静止 FLICK_QUIET 后恢复 */
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
    const len = ARCHIVE_CATS[cat].items.length;
    const n = ((next % len) + len) % len;
    setIdx(n);
    setMemory((m) => m.map((v, i) => (i === cat ? n : v)));
    markSwitch(viaKey);
  }, [cat, markSwitch]);

  const switchCat = useCallback((next: number) => {
    const n = ((next % ARCHIVE_CATS.length) + ARCHIVE_CATS.length) % ARCHIVE_CATS.length;
    setCat(n);
    setIdx(memory[n]);
    markSwitch(true);
    listRef.current?.scrollTo?.({ top: 0 });
  }, [memory, markSwitch]);

  /* 选中行保持可见 */
  useEffect(() => {
    listRef.current?.querySelector('.rhine-arow.sel')?.scrollIntoView?.({ block: 'nearest' });
  }, [cat, idx]);

  const toggleFav = useCallback(() => {
    const id = ARCHIVE_CATS[cat].items[idx].id;
    setFavs((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      try {
        localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      } catch {
        /* 存储失败仅影响持久化 */
      }
      return next;
    });
  }, [cat, idx]);

  const gotoItem = useCallback((it: ArchiveItem) => {
    setOverlay(null);
    setCat(it.cat);
    setIdx(it.idx);
    setMemory((m) => m.map((v, i) => (i === it.cat ? it.idx : v)));
    setOverlay('detail');
  }, []);

  /* 检索 */
  const [query, setQuery] = useState('');
  const [searchSel, setSearchSel] = useState(0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ARCHIVES
      .filter((it) =>
        `${it.id} ${it.title} ${it.en} ${it.owner} ${ARCHIVE_CATS[it.cat].name} ${ARCHIVE_CATS[it.cat].en}`
          .toLowerCase()
          .includes(q))
      .slice(0, 12);
  }, [query]);
  useEffect(() => setSearchSel(0), [results.length]);

  /* 覆盖层打开时焦点管理 */
  const searchInputRef = useRef<HTMLInputElement>(null);
  const detailBackRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (overlay === 'search') searchInputRef.current?.focus();
    if (overlay === 'detail') detailBackRef.current?.focus();
  }, [overlay]);

  /* 导出当前档案文本 */
  const exportTxt = useCallback(() => {
    const it = ARCHIVE_CATS[cat].items[idx];
    const txt = `FZTBU·CS ARCHIVE EXPORT\n======================\n\n${metaOf(it)}\n\nSUMMARY\n-------\n${summaryOf(it)}\n\nRECORDS\n-------\n${recordsOf(it).map((r) => `[${r[0]}] ${r[1]}`).join('\n')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = `${it.id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [cat, idx]);

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

  return (
    <main
      className="rhine-scope flex h-screen flex-col pt-16"
      style={{
        background: 'var(--rhine-paper)',
        color: 'var(--rhine-ink)',
        fontFamily: 'var(--rhine-sans)',
      }}
    >
      {/* 内部顶栏 */}
      <header
        className="flex min-h-[52px] items-center gap-5 border-b px-5"
        style={{ borderColor: 'var(--rhine-hairline)' }}
      >
        <span className="text-[12px] font-semibold tracking-[0.28em]" style={{ fontFamily: 'var(--rhine-mono)' }}>
          FZTBU·CS <em className="not-italic" style={{ color: 'var(--rhine-amber)' }}>ARCHIVE</em>
        </span>
        <span className="hidden text-[10px] tracking-[0.18em] sm:inline" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          ARCHIVE INDEX // 档案柜
        </span>
        <span className="flex-1" />
        <button type="button" className="rhine-topbtn" onClick={() => { setQuery(''); setOverlay('search'); }}>
          检索 <b>/</b>
        </button>
        <button type="button" className="rhine-topbtn" onClick={() => setOverlay('favs')}>
          SAVED <b>{favCount}</b>
        </button>
        <Link href="/lab" className="rhine-topbtn">← LAB</Link>
      </header>

      {/* 三栏 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[208px_1fr_300px]">
        {/* 类别轨 */}
        <nav aria-label="档案分类" className="hidden overflow-y-auto border-r py-4 md:block" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <div className="px-5 pb-3 text-[10px] tracking-[0.3em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            CATEGORY //
          </div>
          {ARCHIVE_CATS.map((c, i) => (
            <button
              key={c.key}
              type="button"
              className={`rhine-cat${i === cat ? ' active' : ''}`}
              onClick={() => switchCat(i)}
            >
              <span className="no">[ 0{i + 1} ]</span>
              <span className="name">{c.name}</span>
              <span className="en">{c.en}</span>
            </button>
          ))}
        </nav>

        {/* 档案列表 */}
        <section aria-label="档案列表" ref={listRef} className="relative overflow-y-auto">
          <div
            className="sticky top-0 z-[1] flex items-baseline gap-3.5 border-b px-6 pb-3.5 pt-[18px]"
            style={{ background: 'var(--rhine-paper)', borderColor: 'var(--rhine-hairline)' }}
          >
            <span className="text-[20px] font-semibold">{ARCHIVE_CATS[cat].name}</span>
            <span className="text-[10px] tracking-[0.24em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              {ARCHIVE_CATS[cat].en}
            </span>
            <span className="ml-auto text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              TOTAL {String(ARCHIVE_CATS[cat].items.length).padStart(2, '0')}
            </span>
          </div>
          {ARCHIVE_CATS[cat].items.map((it, i) => (
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
                <span className="rmeta">{it.en} · {it.owner} · {it.date}</span>
              </span>
              <span className="rfav">● SAVED</span>
            </button>
          ))}
        </section>

        {/* 侧栏速览 */}
        <aside aria-label="当前档案" className="hidden overflow-y-auto border-l p-5 md:block" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <div className="text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            CURRENT ARCHIVE
          </div>
          <div className="mb-1 mt-2.5 flex items-baseline gap-2">
            <span className="text-[22px] font-light" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              {ARCHIVE_CATS[cat].key}-
            </span>
            <span className="text-[28px] font-semibold" style={{ fontFamily: 'var(--rhine-mono)' }}>
              <RollingNumber value={String(idx + 1).padStart(3, '0')} reduced={reduced} />
            </span>
          </div>
          <div className="mb-3.5 mt-2.5 min-h-[2.6em] text-[15px] font-semibold leading-[1.5]">{current.title}</div>
          <SideKv k="OWNER" v={current.owner} />
          <SideKv k="DATE" v={current.date} />
          <SideKv k="STATUS" v="可访问 / OPEN" />
          <button
            type="button"
            className="mt-[18px] w-full border py-3 text-center text-[11px] tracking-[0.34em] transition-colors hover:bg-[var(--rhine-ink)] hover:text-[var(--rhine-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rhine-amber)]"
            style={{ fontFamily: 'var(--rhine-mono)', borderColor: 'var(--rhine-ink)' }}
            onClick={() => setOverlay('detail')}
          >
            ACCESS FILE →
          </button>
        </aside>
      </div>

      {/* 底部快捷键提示 */}
      <footer
        className="hidden min-h-[40px] items-center gap-5 overflow-x-auto border-t px-5 sm:flex"
        style={{ borderColor: 'var(--rhine-hairline)' }}
      >
        {[['←→', '切列'], ['↑↓', '翻阅'], ['ENTER', '读取'], ['/', '检索'], ['S', '收藏'], ['ESC', '返回']].map(([k, v]) => (
          <span key={k} className="whitespace-nowrap text-[9px] tracking-[0.16em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            <b style={{ color: 'var(--rhine-ink)' }}>{k}</b> {v}
          </span>
        ))}
      </footer>

      {/* 覆盖层 */}
      <DetailOverlay
        key={current.id}
        item={current}
        open={overlay === 'detail'}
        faved={!!favs[current.id]}
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
        inputRef={searchInputRef}
        onQuery={setQuery}
        onSel={setSearchSel}
        onPick={gotoItem}
        onClose={() => setOverlay(null)}
      />
      <FavsOverlay
        open={overlay === 'favs'}
        favs={favs}
        onPick={gotoItem}
        onClose={() => setOverlay(null)}
      />
    </main>
  );
}

/** 侧栏键值行 */
function SideKv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-t py-2 text-[11px]" style={{ borderColor: 'var(--rhine-hairline)' }}>
      <span className="text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

/** 编号滚动（460ms，reduced 时退化为静态文本） */
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
  backRef,
  onClose,
  onToggleFav,
  onExport,
}: {
  item: ArchiveItem;
  open: boolean;
  faved: boolean;
  backRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onToggleFav: () => void;
  onExport: () => void;
}) {
  const [tab, setTab] = useState<'p1' | 'p2' | 'p3'>('p1');
  const cat = ARCHIVE_CATS[item.cat];
  return (
    <div className={`rhine-ov${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label={`档案详情 ${item.id}`} aria-hidden={!open}>
      <div className="rhine-ov-head">
        <button ref={backRef} type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>
          ← BACK / ESC
        </button>
        <span className="text-[10px] tracking-[0.18em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          ARCHIVE DETAIL // 档案详情
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(280px,42%)_1fr]">
        {/* 左：档案盒 2D 视觉（3D 由方案 B 提供） */}
        <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <div className="rhine-abox" aria-hidden="true">
            <div className="cover" />
            <div className="strip" />
            <div className="scanln" />
            <div className="plate">{item.id}</div>
          </div>
          <div className="absolute bottom-3.5 left-[18px] text-[9px] tracking-[0.24em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            DOCUMENT MODEL · 2D PLACEHOLDER（3D 见方案 B）
          </div>
        </div>
        {/* 右：文本 */}
        <div className="overflow-y-auto px-[30px] pb-10 pt-[26px]">
          <div className="text-[12px] font-semibold tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-amber)' }}>
            ARCHIVE {item.id}
          </div>
          <h1 className="mb-1 mt-2.5 text-[clamp(22px,3vw,34px)] font-semibold">{item.title}</h1>
          <div className="text-[11px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            {item.en}
          </div>
          <div className="mb-4 mt-[18px] flex flex-wrap gap-x-[26px] gap-y-2 border-y py-3" style={{ borderColor: 'var(--rhine-hairline)' }}>
            <DetailMeta k="CATEGORY" v={`${cat.name} / ${cat.en}`} />
            <DetailMeta k="OWNER" v={item.owner} />
            <DetailMeta k="DATE" v={item.date} />
            <DetailMeta k="LEVEL" v="公开 / L1" />
          </div>
          <div className="mb-4 flex border-b" style={{ borderColor: 'var(--rhine-hairline)' }} role="tablist">
            {([['p1', '概述 SUMMARY'], ['p2', '记录 RECORDS'], ['p3', '元数据 META']] as const).map(([key, label]) => (
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
          <div className="mt-[26px] flex gap-3">
            <button type="button" className={`rhine-actbtn${faved ? ' saved' : ''}`} onClick={onToggleFav}>
              {faved ? 'SAVED ●' : 'SAVE ARCHIVE'}
            </button>
            <button type="button" className="rhine-actbtn ghost" onClick={onExport}>
              EXPORT .TXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 详情元数据项 */
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
  inputRef,
  onQuery,
  onSel,
  onPick,
  onClose,
}: {
  open: boolean;
  query: string;
  results: ArchiveItem[];
  sel: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onSel: (i: number) => void;
  onPick: (it: ArchiveItem) => void;
  onClose: () => void;
}) {
  return (
    <div className={`rhine-ov${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label="档案检索" aria-hidden={!open}>
      <div className="mx-auto mt-[12vh] w-[min(680px,92vw)]">
        <div className="flex items-center gap-3 border-b-[1.5px] pb-2.5" style={{ borderColor: 'var(--rhine-ink)' }}>
          <span className="text-[18px]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-amber)' }}>/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="编号 / 标题 / 英文 / 负责人…"
            aria-label="检索档案"
            tabIndex={open ? 0 : -1}
            className="flex-1 bg-transparent text-[18px] tracking-[0.06em] outline-none placeholder:text-[var(--rhine-ink-dim)]"
            style={{ fontFamily: 'var(--rhine-mono)' }}
          />
        </div>
        <div className="mt-2 text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          ARCHIVE INDEX · ↑↓ 选择 · ENTER 读取 · ESC 关闭
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
              <span className="sc">{ARCHIVE_CATS[it.cat].en}</span>
            </button>
          ))}
          {query.trim() && results.length === 0 && (
            <div className="px-1.5 py-5 text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
              NO MATCH // 无匹配档案
            </div>
          )}
        </div>
        <div className="mt-6">
          <button type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>← BACK / ESC</button>
        </div>
      </div>
    </div>
  );
}

/** 收藏覆盖层 */
function FavsOverlay({
  open,
  favs,
  onPick,
  onClose,
}: {
  open: boolean;
  favs: Record<string, true>;
  onPick: (it: ArchiveItem) => void;
  onClose: () => void;
}) {
  const items = ALL_ARCHIVES.filter((it) => favs[it.id]);
  return (
    <div className={`rhine-ov${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label="已收藏档案" aria-hidden={!open}>
      <div className="rhine-ov-head">
        <button type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>← BACK / ESC</button>
        <span className="text-[10px] tracking-[0.18em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          SAVED ARCHIVES // 已收藏
        </span>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5 overflow-y-auto p-6">
        {items.map((it) => (
          <button key={it.id} type="button" className="rhine-favcard" onClick={() => onPick(it)} tabIndex={open ? 0 : -1}>
            <div className="fid">{it.id} / {ARCHIVE_CATS[it.cat].en}</div>
            <div className="ft">{it.title}</div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-[60px] text-center text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            NO SAVED ARCHIVES · 按 S 收藏当前档案
          </div>
        )}
      </div>
    </div>
  );
}
