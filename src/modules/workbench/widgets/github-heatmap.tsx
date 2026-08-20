/**
 * @file GitHub 贡献热力图 — 53×7 CSS Grid 方格 + 总提交/连续天数徽章。
 * 数据来自后端缓存（6h），支持用户名绑定（localStorage）与手动刷新。
 * 色阶用 Tailwind green 语义色板（与项目 emerald 用法一致，主题自适应）。
 */
'use client';

import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { WorkbenchCard } from '../workbench-card';
import { useLocalStorage } from '../hooks/use-local-storage';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface HeatmapDay {
  date: string;
  count: number;
}

interface HeatmapData {
  ok: boolean;
  need_username?: boolean;
  platform?: string;
  username?: string;
  year?: number;
  data?: HeatmapDay[];
  total?: number;
  streak?: number;
  fetched_at?: string | null;
  stale?: boolean;
}

/** 贡献量 → Tailwind 色阶类（level 0 为浅底，越高越深） */
const LEVEL_COLORS = ['bg-muted/40', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'];

function levelOf(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

/** 从某年 1 月 1 日往前找到最近的周日作为网格起点，返回 53 周日期序列 */
function buildYearGrid(year: number): string[] {
  const start = new Date(year, 0, 1);
  const dayOfWeek = start.getDay(); // 0=周日
  start.setDate(start.getDate() - dayOfWeek);
  const cells: string[] = [];
  for (let i = 0; i < 53 * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    cells.push(`${y}-${m}-${day}`);
  }
  return cells;
}

export default function GithubHeatmap() {
  const t = useTranslations('workbench');
  const [username, setUsername] = useLocalStorage<string>('wb_github_username', '');
  const [input, setInput] = useState(username);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  // 年份初始取一次（SSR/CSR 通常一致）；挂载后再次校准，规避跨年边界 SSR/CSR 不一致
  const [year, setYear] = useState(() => new Date().getFullYear());
  const cells = useMemo(() => buildYearGrid(year), [year]);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const load = useCallback(
    async (force = false) => {
      const user = (username || '').trim();
      if (!user) {
        setData({ ok: false, need_username: true });
        setUnreachable(false);
        return;
      }
      setLoading(true);
      try {
        const r = await apiRequest<HeatmapData>(
          `/api/workbench/contributions/github?username=${encodeURIComponent(user)}&year=${year}${
            force ? '&refresh=1' : ''
          }`,
          { cache: 'no-store' },
        );
        if (r.status === 401) {
          setNotLoggedIn(true);
          return;
        }
        // 后端返回 ok:false + error:github_unreachable → 明确「不可达」错误态
        if (!r.ok && r.status < 500 && (r.data as { error?: string } | null)?.error === 'github_unreachable') {
          setUnreachable(true);
          setData(null);
          return;
        }
        setUnreachable(false);
        setData(r.data);
      } catch {
        setUnreachable(true);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [username, year],
  );

  useEffect(() => {
    if (username.trim()) void load(false);
  }, [username, load]);

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of data?.data ?? []) map.set(day.date, day.count);
    return map;
  }, [data]);

  const bind = () => {
    setUsername(input.trim());
  };

  const maxCount = useMemo(() => {
    let max = 0;
    for (const day of data?.data ?? []) if (day.count > max) max = day.count;
    return max;
  }, [data]);

  return (
    <WorkbenchCard
      corner="GIT"
      title={t('heatmapTitle', { year })}
      actions={
        <>
          {data?.stale && (
            <span className="text-[11px] text-amber-600 border border-amber-500/40 rounded-full px-2 py-0.5">
              stale
            </span>
          )}
          {data?.fetched_at && (
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {new Date(data.fetched_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            size="sm"
            variant="pixel-outline"
            aria-label="refresh"
            disabled={loading || notLoggedIn}
            onClick={() => void load(true)}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </>
      }
      error={
        notLoggedIn ? (
          <p className="text-[13px] text-[var(--muted-foreground)]">{t('loginRequired')}</p>
        ) : unreachable ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-[13px] text-[var(--muted-foreground)]">{t('heatmapUnreachable')}</p>
            <Button size="sm" variant="pixel-outline" disabled={loading} onClick={() => void load(true)}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('heatmapRetry')}
            </Button>
          </div>
        ) : undefined
      }
      empty={!notLoggedIn && !data?.need_username && !data ? t('heatmapNoData') : false}
    >
      {data?.need_username ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={input}
            placeholder={t('heatmapUsernamePlaceholder')}
            className="flex-1 min-w-0"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') bind();
            }}
          />
          <Button size="sm" variant="pixel" onClick={bind}>
            {t('heatmapBind')}
          </Button>
        </div>
      ) : data ? (
        <>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="display-serif text-[clamp(26px,3vw,36px)] leading-none tabular-nums text-[var(--foreground)]">
                {data.total ?? 0}
              </span>
              <span className="text-[12px] text-[var(--muted-foreground)]">{t('heatmapContributions')}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="display-serif text-[clamp(20px,2.5vw,28px)] leading-none tabular-nums text-[var(--foreground)]">
                {data.streak ?? 0}
              </span>
              <span className="text-[12px] text-[var(--muted-foreground)]">{t('heatmapStreak')}</span>
            </div>
            <span className="text-[12px] text-[var(--muted-foreground)]">@{data.username}</span>
          </div>

          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div
              className="grid gap-[2px] min-w-0"
              style={{
                gridTemplateColumns: 'repeat(53, 1fr)',
                gridTemplateRows: 'repeat(7, 8px)',
                gridAutoFlow: 'column',
              }}
            >
              {cells.map((date, i) => {
                const count = countByDate.get(date) ?? 0;
                const level = levelOf(count);
                return (
                  <div
                    key={i}
                    title={`${date}: ${count}`}
                    className={`rounded-[2px] ${LEVEL_COLORS[level]}`}
                    style={level === 0 ? { outline: '1px solid var(--border)' } : undefined}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
            <span>{t('heatmapLess')}</span>
            <div className="flex gap-1">
              {LEVEL_COLORS.map((c) => (
                <span key={c} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
              ))}
            </div>
            <span>{t('heatmapMore')} · {t('heatmapMax')} {maxCount}</span>
          </div>
        </>
      ) : null}
    </WorkbenchCard>
  );
}
