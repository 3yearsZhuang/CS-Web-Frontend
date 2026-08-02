/**
 * @file 学习资源站（/tools/resource）— 类型过滤 + 技术标签 + 卡片网格，登录用户可提交新资源
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Plus, BookOpen, Video, GraduationCap, Wrench, BookMarked, Package, X, Upload } from 'lucide-react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useAuth } from '@/shared/hooks/use-auth';
import { TECH_TAGS, type TechTag } from '@/shared/utils/tech-tags';
import { EASE } from '@/shared/utils/ui-constants';
import { Button, SectionLoading } from '@/components';
import { motion, AnimatePresence } from 'motion/react';

type ResourceType = 'all' | 'article' | 'video' | 'course' | 'tool' | 'book' | 'other';

const TYPE_LABELS: Record<ResourceType, string> = {
  all: '全部',
  article: '文章',
  video: '视频',
  course: '课程',
  tool: '工具',
  book: '书籍',
  other: '其他',
};

const TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  all: <BookOpen className="w-4 h-4" />,
  article: <BookOpen className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  course: <GraduationCap className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  book: <BookMarked className="w-4 h-4" />,
  other: <Package className="w-4 h-4" />,
};

interface ResourceItem {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: string;
  tech_tags: string | null;
  status: string;
  submitted_by: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_tech_tags: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
}

interface ResourceListData {
  resources: ResourceItem[];
  total: number;
  page: number;
  totalPages: number;
  techTagCounts: Record<string, number>;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'Z');
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export default function ResourcePage() {
  const { isLoggedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ResourceListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<ResourceType>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [page, setPage] = useState(1);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    url: '',
    description: '',
    resourceType: 'article' as ResourceType,
    techTags: [] as string[],
    fileUrl: '' as string,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeType !== 'all') params.set('resourceType', activeType);
      if (activeTag) params.set('techTag', activeTag);
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const res = await fetch(`/api/tools/resource?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeType, activeTag, sort, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchParams.get('submit') === '1' && isLoggedIn) {
      setShowSubmit(true);
    }
  }, [searchParams, isLoggedIn]);

  const closeSubmit = () => {
    setShowSubmit(false);
    setSubmitError(null);
    setSubmitSuccess(false);
    setForm({ title: '', url: '', description: '', resourceType: 'article', techTags: [], fileUrl: '' });
    router.replace('/tools/resource', { scroll: false });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/tools/resource/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setForm((f) => ({ ...f, fileUrl: json.url }));
      } else {
        const json = await res.json();
        setSubmitError(json.error || '文件上传失败');
      }
    } catch {
      setSubmitError('文件上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/tools/resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          url: form.url,
          description: form.description || undefined,
          resourceType: form.resourceType,
          techTags: form.techTags.length ? form.techTags : undefined,
          fileUrl: form.fileUrl || undefined,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setForm({ title: '', url: '', description: '', resourceType: 'article', techTags: [], fileUrl: '' });
        fetchData();
      } else {
        const json = await res.json();
        setSubmitError(json.error || '提交失败');
      }
    } catch {
      setSubmitError('网络错误，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  const typeTabs: CapsuleTab[] = useMemo(
    () => Object.entries(TYPE_LABELS).map(([key, label]) => ({
      key,
      num: key === 'all' ? '00' : String(Object.keys(TYPE_LABELS).indexOf(key)).padStart(2, '0'),
      label: `${label}${key !== 'all' ? ` / ${key.charAt(0).toUpperCase() + key.slice(1)}` : ''}`,
    })),
    [],
  );

  const techTagTabs: { key: string; label: string; count: number }[] = useMemo(() => {
    const counts = data?.techTagCounts ?? {};
    return [{ key: '__all__', label: '全部', count: data?.total ?? 0 }, ...TECH_TAGS.map((t: TechTag) => ({
      key: t.key,
      label: t.label,
      count: counts[t.key] ?? 0,
    }))];
  }, [data]);

  const pages = data?.totalPages ?? 1;

  const activeTypeLabel = TYPE_LABELS[activeType];

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="学习资源站"
        hero={hero}
        pageKey="resource"
        minHeight="50vh"
        capsule={{
          tabs: typeTabs,
          activeKey: activeType,
          onTabChange: (key: string) => {
            setActiveType(key as ResourceType);
            setPage(1);
          },
        }}
        sidebarBottom={
          <Link
            href="/tools"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            ← 返回
          </Link>
        }
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            学习资源站
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Resource Hub
            </span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed
                ? 'max-h-[14px] opacity-30 mt-1'
                : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              发现优质技术资源
              <span className="serif-italic text-[var(--foreground)]">
                。社区共建知识库，每个人都是贡献者
              </span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 资源列表 ============ */}
      <section data-section-nav="01|资源列表" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-4">
              {activeType === 'all' ? '全部资源' : activeTypeLabel}
              <span className="ark-divider ml-2">
                {activeType === 'all' ? 'All Resources' : TYPE_LABELS[activeType]}
              </span>
            </h2>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
              {loading
                ? '// 加载中...'
                : `// ${data?.total ?? 0} 条资源 · 按${sort === 'latest' ? '最新' : '热门'}排序`}
            </p>

            {/* 工具栏：技术标签 + 排序 + 提交 */}
            <div className="flex items-center gap-4 mb-8 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {techTagTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTag(tab.key === '__all__' ? null : tab.key);
                      setPage(1);
                    }}
                    className={`whitespace-nowrap px-4 py-2 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      (tab.key === '__all__' && !activeTag) || tab.key === activeTag
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                        : 'bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-1.5 opacity-60 tabular-nums">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* 排序按钮组 */}
              <div className="flex gap-0">
                <button
                  onClick={() => { setSort('latest'); setPage(1); }}
                  className={`whitespace-nowrap px-4 py-2 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                    sort === 'latest'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  最新
                </button>
                <button
                  onClick={() => { setSort('popular'); setPage(1); }}
                  className={`whitespace-nowrap px-4 py-2 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                    sort === 'popular'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  热门
                </button>
              </div>

              {isLoggedIn && (
                <Button
                  size="sm"
                  onClick={() => router.push('/tools/resource?submit=1', { scroll: false })}
                  className="whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  提交资源
                </Button>
              )}
            </div>

            {/* 资源列表 */}
            {loading ? (
              <SectionLoading label="Loading..." />
            ) : !data || data.resources.length === 0 ? (
              <div className="py-16 text-center">
                <div className="meta-mono text-[var(--muted-foreground)] mb-6">
                  {'// 暂无资源，成为第一个贡献者吧'}
                </div>
                {isLoggedIn && (
                  <button
                    onClick={() => router.push('/tools/resource?submit=1', { scroll: false })}
                    className="meta-mono text-[var(--primary)] underline-grow"
                  >
                    提交资源 →
                  </button>
                )}
              </div>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.03 } },
                  }}
                >
                  {data.resources.map((resource) => {
                    const typeLabel = TYPE_LABELS[resource.resource_type as ResourceType] ?? resource.resource_type;
                    const typeIcon = TYPE_ICONS[resource.resource_type as ResourceType] ?? TYPE_ICONS.other;
                    const tags: string[] = resource.tech_tags ? JSON.parse(resource.tech_tags) : [];

                    return (
                      <motion.a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.5, ease: EASE },
                          },
                        }}
                        className="block p-6 border border-[var(--border)] card-minimal hover:bg-[var(--primary)]/[0.03] group transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[var(--primary)]">{typeIcon}</span>
                              <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                                {typeLabel}
                              </span>
                            </div>

                            <h3 className="display-serif text-[18px] sm:text-[20px] text-[var(--foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                              {resource.title}
                            </h3>

                            {resource.description && (
                              <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.6] mt-2 line-clamp-2">
                                {resource.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={`${tag}-${i}`}
                                  className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]"
                                >
                                  {TECH_TAGS.find((t) => t.key === tag)?.label ?? tag}
                                </span>
                              ))}
                              {tags.length > 3 && (
                                <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                                  +{tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>

                          <ExternalLink className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
                          {resource.author_display_name && (
                            <span>{resource.author_display_name}</span>
                          )}
                          <span>{formatDate(resource.created_at)}</span>
                          <span>{resource.view_count} 次浏览</span>
                        </div>
                      </motion.a>
                    );
                  })}
                </motion.div>

                {/* 分页 */}
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-8 mt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30"
                    >
                      ←
                    </button>
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`font-mono text-[12px] px-3 py-1.5 border transition-colors ${
                          p === page
                            ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]'
                        }`}
                      >
                        {String(p).padStart(2, '0')}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                      className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* 提交资源弹窗 */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSubmit}
          >
            <motion.div
              className="bg-[var(--background)] border border-[var(--border)] w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                <h2 className="display-serif text-[20px] text-[var(--foreground)]">
                  提交资源
                  <span className="ark-divider ml-2">Submit</span>
                </h2>
                <button onClick={closeSubmit} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="p-6 text-center">
                  <p className="display-serif text-[18px] text-emerald-500 mb-2">提交成功！</p>
                  <p className="text-[13px] text-[var(--muted-foreground)] mb-4">资源已提交，等待管理员审核后公开</p>
                  <button
                    onClick={closeSubmit}
                    className="meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">标题 *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      required
                      maxLength={200}
                      className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)]"
                      placeholder="资源标题"
                    />
                  </div>

                  <div>
                    <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">链接 *</label>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      required
                      maxLength={2000}
                      className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)]"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">描述</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      maxLength={5000}
                      rows={3}
                      className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none resize-none placeholder:text-[var(--muted-foreground)]"
                      placeholder="简短描述这个资源..."
                    />
                  </div>

                  <div>
                    <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">资源类型</label>
                    <select
                      value={form.resourceType}
                      onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value as ResourceType }))}
                      className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      {Object.entries(TYPE_LABELS)
                        .filter(([k]) => k !== 'all')
                        .map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">附件（可选）</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip"
                    />
                    {form.fileUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-emerald-500 meta-mono flex-1 truncate">已上传 ✓</span>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, fileUrl: '' }))}
                          className="text-[11px] px-2 py-1 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                        >
                          移除
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 text-[12px] px-3 py-2 border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? '上传中...' : '上传文件（≤10MB, jpg/png/pdf/zip）'}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">技术标签</label>
                    <div className="flex flex-wrap gap-2">
                      {TECH_TAGS.map((tag) => (
                        <button
                          key={tag.key}
                          type="button"
                          onClick={() => setForm((f) => ({
                            ...f,
                            techTags: f.techTags.includes(tag.key)
                              ? f.techTags.filter((t) => t !== tag.key)
                              : [...f.techTags, tag.key],
                          }))}
                          className={`text-[11px] px-2 py-1 border transition-colors ${
                            form.techTags.includes(tag.key)
                              ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40'
                          }`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-[13px] text-red-400">{submitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full meta-mono text-[12px] py-3 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors disabled:opacity-50"
                  >
                    {submitLoading ? '提交中...' : '提交审核'}
                  </button>

                  <p className="meta-mono text-[10px] text-[var(--muted-foreground)] text-center">
                    提交后需管理员审核，审核通过后会公开显示
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
