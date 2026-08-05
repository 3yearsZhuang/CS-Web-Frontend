/**
 * @file 资源审核子面板 — 从 admin-tools-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, ExternalLink, BookOpen } from 'lucide-react';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import {
  formatDate,
  RESOURCE_PAGE_SIZE,
  type PendingResource,
} from './tool-types';

/** 资源审核子面板 — 待审核资源列表 + 通过/拒绝 */
export function ResourceReviewPanel() {
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
      const res = await fetch(`/api/admin/tools/resource?page=${pg}&pageSize=${RESOURCE_PAGE_SIZE}`);
      if (res.ok) {
        const json = await res.json();
        setResources(json.resources);
        setResourceTotal(json.total);
      } else {
        const json = await res.json();
        setResourceError(json.error || '加载失败');
      }
    } catch {
      setResourceError('网络错误');
    } finally {
      setResourceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources(resourcePage);
  }, [resourcePage, fetchResources]);

  const handleReview = async (resourceId: string, status: 'published' | 'hidden') => {
    const res = await fetch(`/api/admin/tools/resource?id=${resourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        note: reviewNote[resourceId]?.trim() || undefined,
      }),
    });

    if (res.ok) {
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      setResourceTotal((prev) => prev - 1);
    } else {
      const json = await res.json();
      alert(json.error || '操作失败');
    }
  };

  const resourcePages = Math.ceil(resourceTotal / RESOURCE_PAGE_SIZE) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">待审核 {resourceTotal} 条</span>
        <button
          type="button"
          onClick={() => fetchResources(resourcePage)}
          disabled={resourceLoading}
          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
        >
          {resourceLoading ? 'Loading' : 'Refresh'}
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
                          附件
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
                    placeholder="审核备注（可选）"
                    maxLength={500}
                    className="flex-1 bg-transparent border border-[var(--border)] px-3 py-1.5 text-[12px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleReview(r.id, 'published')}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> 通过
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(r.id, 'hidden')}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> 拒绝
                  </button>
                </div>
              </div>
            );
          })}

          {resourcePages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: resourcePages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setResourcePage(p)}
                  className={`text-[11px] font-mono px-3 py-1.5 border transition-colors ${
                    p === resourcePage
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
