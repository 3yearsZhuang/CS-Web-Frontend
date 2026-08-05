/**
 * @file 开发文档查看器 — 列表 + 内容查看，admin 只读 / root 可编辑
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MarkdownRenderer } from '@/modules/community/ui/forum-markdown-renderer';
import { formatDate } from './tool-types';

interface DevDoc {
  slug: string;
  title: string;
  size: number;
  modified: string;
}

interface DevDocDetail {
  slug: string;
  content: string;
  modified: string;
  readOnly: boolean;
}

/** 开发文档查看器（左侧列表 + 右侧内容） */
export function DevDocsViewer({ isRoot }: { isRoot: boolean }) {
  const [docs, setDocs] = useState<DevDoc[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<DevDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev-docs');
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || '加载失败');
        return;
      }
      const data = await res.json();
      setDocs(data);
      if (data.length > 0 && !selectedSlug) {
        setSelectedSlug(data[0].slug);
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [selectedSlug]);

  const fetchDetail = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dev-docs/${slug}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || '加载失败');
        return;
      }
      const data = await res.json();
      setDetail(data);
      setEditContent(data.content);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    if (selectedSlug) {
      fetchDetail(selectedSlug);
      setEditing(false);
      setPreviewMode(false);
    }
  }, [selectedSlug, fetchDetail]);

  const handleSave = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dev-docs/${selectedSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || '保存失败');
        return;
      }
      setDetail((prev) => prev ? { ...prev, content: editContent, modified: new Date().toISOString() } : null);
      setEditing(false);
      setError(null);
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col md:flex-row gap-0 border border-[var(--border)]">
      {/* ===== 左侧：文档列表 ===== */}
      <div className="md:w-[280px] lg:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)]">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="meta-mono text-[10px] text-[var(--primary)] uppercase">
            文档列表
          </span>
          <button
            type="button"
            onClick={fetchDocs}
            disabled={loading}
            className="meta-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] disabled:opacity-30"
          >
            {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-420px)]">
          {docs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="meta-mono text-[10px] text-[var(--muted-foreground)]/50 uppercase">
                {loading ? '加载中...' : '无文档'}
              </span>
            </div>
          ) : (
            docs.map((doc) => {
              const isSelected = selectedSlug === doc.slug;
              return (
                <button
                  key={doc.slug}
                  onClick={() => setSelectedSlug(doc.slug)}
                  className={`w-full flex flex-col gap-1 px-4 py-3 text-left transition-colors border-b border-[var(--border)] ${
                    isSelected
                      ? 'bg-[var(--primary)]/[0.05] border-l-[3px] border-l-[var(--primary)] pl-[13px]'
                      : 'hover:bg-[var(--primary)]/[0.02] border-l-[3px] border-l-transparent pl-[13px]'
                  }`}
                >
                  <span className="text-[13px] text-[var(--foreground)] truncate">
                    {doc.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="meta-mono text-[9px] text-[var(--muted-foreground)]">
                      {formatSize(doc.size)}
                    </span>
                    <span className="meta-mono text-[9px] text-[var(--muted-foreground)]">
                      {formatDate(doc.modified)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ===== 右侧：文档内容 ===== */}
      <div className="flex-1 min-w-0">
        {error && (
          <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] m-4">
            [ Error ] {error}
          </div>
        )}

        {!selectedSlug && !loading && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 选择文档 / Select a doc ]</div>
            <p className="text-[14px] text-[var(--muted-foreground)]">从左侧列表选择一份文档查看。</p>
          </div>
        )}

        {selectedSlug && detail && !editing && (
          <div className="flex flex-col h-full">
            {/* 文档头 */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-[var(--foreground)]">{detail.slug}.md</span>
                <span className="meta-mono text-[9px] text-[var(--muted-foreground)]">
                  {formatDate(detail.modified)}
                </span>
                {!isRoot && (
                  <span className="meta-mono text-[9px] px-1.5 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                    READ ONLY
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* 预览/源码切换 */}
                <div className="flex border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className={`meta-mono text-[10px] px-2.5 py-1 transition-colors ${
                      !previewMode
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    源码
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`meta-mono text-[10px] px-2.5 py-1 transition-colors border-l border-[var(--border)] ${
                      previewMode
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    预览
                  </button>
                </div>
                {isRoot && (
                  <button
                    type="button"
                    onClick={() => { setEditContent(detail.content); setEditing(true); }}
                    className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                  >
                    编辑
                  </button>
                )}
              </div>
            </div>

            {/* 文档内容 */}
            <div className="flex-1 overflow-auto p-4">
              {previewMode ? (
                <MarkdownRenderer content={detail.content} />
              ) : (
                <pre className="text-[13px] font-mono text-[var(--foreground)] whitespace-pre-wrap break-words leading-[1.7]">
                  {detail.content}
                </pre>
              )}
            </div>
          </div>
        )}

        {selectedSlug && editing && (
          <div className="flex flex-col h-full">
            {/* 编辑器头 */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-[14px] text-[var(--foreground)]">{detail?.slug}.md</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setEditContent(detail?.content || ''); }}
                  disabled={saving}
                  className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存 →'}
                </button>
              </div>
            </div>

            {/* 编辑器 */}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full p-4 bg-transparent border-0 text-[13px] font-mono text-[var(--foreground)] resize-none focus:outline-none leading-[1.7] min-h-[400px]"
              placeholder="输入文档内容..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
