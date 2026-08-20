/**
 * @file 搜索结果页（/search?q=&scope=）— 全站聚合结果完整视图
 * 顶栏搜索下拉底部「查看全部结果」跳转至此；scope 默认 all。
 */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Title, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { NavMessageKey } from '@/i18n/types';
import type { SearchResponse, SearchScope } from '@/modules/search/types';
import { SearchResults } from '@/modules/search/ui/search-results';

/** 结果页每类展示条数（后端上限 10） */
const RESULT_PAGE_LIMIT = 10;

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="relative pt-16 min-h-screen flex items-center justify-center">
          <SectionLoading label="Loading..." />
        </main>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const t = useTranslations('nav');
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = (searchParams.get('q') || '').trim();
  const scope = (searchParams.get('scope') || 'all') as SearchScope;

  const [input, setInput] = useState(q);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL 变化（浏览器前进后退）时同步输入框
  useEffect(() => {
    setInput(q);
  }, [q]);

  // 请求结果
  useEffect(() => {
    if (!q) {
      setResponse(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ q, scope, limit: String(RESULT_PAGE_LIMIT) });
    apiRequest<SearchResponse>(`/api/search?${params.toString()}`)
      .then((r) => {
        setLoading(false);
        if (r.ok && r.data) {
          setResponse(r.data);
        } else {
          setError(r.error ?? 'search failed');
        }
      })
      .catch(() => {
        setLoading(false);
        setError('search failed');
      });
  }, [q, scope]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}&scope=${scope}`);
  }

  const totalCount = response
    ? Object.values(response.results).reduce((n, g) => n + (g?.total ?? 0), 0)
    : 0;

  return (
    <main className="relative pt-16">
      {/* ============ 页头 ============ */}
      <section className="px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 pb-8 border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto">
          <div className="meta-mono text-[var(--muted-foreground)] mb-3">
            [ 00 ] — {t('searchAria')}
          </div>
          <Title
            level={1}
            echo={t('searchPageTitle')}
            subtitle="Search"
          >
            {t('searchPageTitle')}
          </Title>

          {/* 搜索输入框（提交更新 URL 参数） */}
          <form onSubmit={submit} className="mt-8 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={80}
                placeholder={
                  scope === 'all'
                    ? t('searchPlaceholder')
                    : t('searchPlaceholderModule', {
                        scope: t(
                          `searchGroup${scope.charAt(0).toUpperCase()}${scope.slice(1)}` as NavMessageKey,
                        ),
                      })
                }
                aria-label={t('searchAria')}
                className={`${INPUT_CLASS} w-full px-4 py-3 text-[14px] pr-20`}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 meta-mono text-[11px] text-[var(--primary)] px-2 py-1 hover:text-[var(--foreground)] transition-colors focus-amber"
              >
                →
              </button>
            </div>
          </form>

          <p className="mt-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
            {q && t('searchPageTotal', { count: totalCount })}
          </p>
        </div>
      </section>

      {/* ============ 结果区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-10 sm:py-14">
        <div className="max-w-[1600px] mx-auto md:pl-[72px] lg:pl-[88px]">
          {loading ? (
            <div className="py-16 flex justify-center">
              <SectionLoading label="Loading..." />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <div className="meta-mono text-[var(--destructive)]">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 meta-mono text-[var(--primary)] underline-grow"
              >
                {t('searchAria')}
              </button>
            </div>
          ) : !q ? (
            <div className="py-16 text-center">
              <div className="meta-mono text-[var(--muted-foreground)]">
                {t('searchHint')}
              </div>
            </div>
          ) : response ? (
            <SearchResults response={response} />
          ) : null}
        </div>
      </section>
    </main>
  );
}
