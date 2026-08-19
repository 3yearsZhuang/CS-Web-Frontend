/**
 * @file 资源审核子面板 — 从 admin-tools-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X, ExternalLink, BookOpen } from 'lucide-react';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { Pagination } from '@/components';
import {
  formatDate,
  RESOURCE_PAGE_SIZE,
  type PendingResource,
} from './tool-types';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 资源审核子面板 — 待审核资源列表 + 通过/拒绝 */
export function ResourceReviewPanel() {
  const t = useTranslations('toolsAdmin');
  const tc = useTranslations('common');
  const [resources, setResources] = useState<PendingResource[]>([]);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [resourcePage, setResourcePage] = useState(1);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const fetchResources = useCallback(async (pg: number) => {
    setResourceLoading(true);
    setResourceError(null);
    try {
      const r = await apiRequest<{ resources?: PendingResource[]; total?: number }>(`/api/admin/tools/resource?page=${pg}&pageSize=${RESOURCE_PAGE_SIZE}`);
      if (r.ok) {
        const json = r.data ?? {};
        setResources(json.resources ?? []);
        setResourceTotal(json.total ?? 0);
      } else {
        setResourceError(r.error ?? t('loadFailed'));
      }
    } catch {
      setResourceError(t('networkError'));
    } finally {
      setResourceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources(resourcePage);
  }, [resourcePage, fetchResources]);

  const handleReview = async (resourceId: string, status: 'published' | 'hidden') => {
    const r = await apiRequest(`/api/admin/tools/resource?id=${resourceId}`, {
      method: 'PATCH',
      body: {
        status,
        note: reviewNote[resourceId]?.trim() || undefined,
      },
    });

    if (r.ok) {
      setResources((prev) => prev.filter((it) => it.id !== resourceId));
      setResourceTotal((prev) => prev - 1);
    } else {
      alert(r.error ?? t('actionFailed'));
    }
  };

  const resourcePages = Math.ceil(resourceTotal / RESOURCE_PAGE_SIZE) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('resourcePending', { count: resourceTotal })}</span>
        <button
          type="button"
          onClick={() => fetchResources(resourcePage)}
          disabled={resourceLoading}
          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
        >
          {resourceLoading ? tc('loading') : tc('refresh')}
        </button>
      </div>

      {resourceError && (
        <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
          [ Error ] {resourceError}
        </div>
      )}

      {resourceLoading && resources.length === 0 && (
        <div className="py-20 text-center meta-mono text-[var(--muted-foreground)]">加载中...</div>
      )}

      {!resourceLoading && !resourceError && resources.length === 0 && (
        <div className="py-20 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无待审核 / No Pending ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">所有资源已审核完毕。</p>
        </div>
      )}

      {resources.length > 0 && (
        <div className="space-y-3">
          {resources.map((r) => {
            const tags: string[] = r.tech_tags ? JSON.parse(r.tech_tags) : [];
            return (
              <div key={r.id} className="border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase">
                        {r.resource_type}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-0.5">{r.title}</h3>
                    {r.description && (
                      <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2">{r.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> {r.url.slice(0, 60)}...
                      </a>
                      {r.file_url && (
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[var(--primary)] hover:underline"
                        >
                          {t('attachment')}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {tags.map((tag, i) => (
                        <span key={`${tag}-${i}`} className="meta-mono text-[10px] px-1.5 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                          {TECH_TAGS.find((t) => t.key === tag)?.label ?? tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                      {r.author_display_name || r.submitted_by.slice(0, 8)}
                    </span>
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{formatDate(r.created_at)}</span>
                  </div>
                </div>

                {/* 审核操作 */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                  <input
                    type="text"
                    value={reviewNote[r.id] || ''}
                    onChange={(e) => setReviewNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder={t('reviewNotePlaceholder')}
                    maxLength={500}
                    className={`${INPUT_CLASS} flex-1 px-3 py-1.5 text-[12px]`}
                  />
                  <button
                    type="button"
                    onClick={() => handleReview(r.id, 'published')}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> {t('approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(r.id, 'hidden')}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> {t('reject')}
                  </button>
                </div>
              </div>
            );
          })}

          {resourcePages > 1 && (
            <Pagination
              page={resourcePage}
              totalPages={resourcePages}
              onPageChange={setResourcePage}
              variant="all"
            />
          )}
        </div>
      )}
    </div>
  );
}
