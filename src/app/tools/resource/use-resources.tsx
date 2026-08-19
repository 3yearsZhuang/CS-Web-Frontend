'use client';

/**
 * @file useResources — 学习资源站共享状态与逻辑 Hook
 *
 * 从 `app/tools/resource/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。各渲染子组件复用本 Hook 返回值。
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookOpen, Video, GraduationCap, Wrench, BookMarked, Package } from 'lucide-react';
import { useAuth } from '@/shared/hooks/use-auth';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { TECH_TAGS, type TechTag } from '@/shared/utils/tech-tags';

export type ResourceType = 'all' | 'article' | 'video' | 'course' | 'tool' | 'book' | 'other';

export type TFn = (key: string, values?: Record<string, string | number | Date>) => string;

export function resourceTypeLabel(t: TFn, k: string): string {
  const map: Record<string, string> = {
    all: t('resTypeAll'),
    article: t('resTypeArticle'),
    video: t('resTypeVideo'),
    course: t('resTypeCourse'),
    tool: t('resTypeTool'),
    book: t('resTypeBook'),
    other: t('resTypeOther'),
  };
  return map[k] ?? k;
}

export const TYPE_ICONS: Record<Exclude<ResourceType, 'all'>, React.ReactNode> = {
  article: <BookOpen className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  course: <GraduationCap className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  book: <BookMarked className="w-4 h-4" />,
  other: <Package className="w-4 h-4" />,
};

/** 资源类型 → 展示标签 */
export function typeLabelOf(t: TFn, type: string): string {
  return resourceTypeLabel(t, type);
}

/** 资源类型 → 展示图标 */
export function typeIconOf(t: string): React.ReactNode {
  return TYPE_ICONS[t as Exclude<ResourceType, 'all'>] ?? TYPE_ICONS.other;
}

export interface ResourceItem {
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

export interface ResourceListData {
  resources: ResourceItem[];
  total: number;
  page: number;
  totalPages: number;
  techTagCounts: Record<string, number>;
}

export function useResources() {
  const { isLoggedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('toolsResource');

  const [data, setData] = useState<ResourceListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<ResourceType>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [page, setPage] = useState(1);

  // 提交弹窗
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeType !== 'all') params.set('resourceType', activeType);
      if (activeTag) params.set('techTag', activeTag);
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const r = await apiRequest<ResourceListData>(`/api/tools/resource?${params.toString()}`);
      if (r.ok) {
        setData(r.data);
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

  const closeSubmit = useCallback(() => {
    setShowSubmit(false);
    setSubmitError(null);
    setSubmitSuccess(false);
    setForm({ title: '', url: '', description: '', resourceType: 'article', techTags: [], fileUrl: '' });
    router.replace('/tools/resource', { scroll: false });
  }, [router]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const r = await apiRequest<{ url: string }>('/api/tools/resource/upload', {
        method: 'POST',
        body: formData,
      });

      if (r.ok) {
        setForm((f) => ({ ...f, fileUrl: r.data?.url ?? '' }));
      } else {
        setSubmitError(r.error ?? t('uploadFailed'));
      }
    } catch {
      setSubmitError(t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitLoading(true);
      setSubmitError(null);

      try {
        const r = await apiRequest('/api/tools/resource', {
          method: 'POST',
          body: {
            title: form.title,
            url: form.url,
            description: form.description || undefined,
            resourceType: form.resourceType,
            techTags: form.techTags.length ? form.techTags : undefined,
            fileUrl: form.fileUrl || undefined,
          },
        });

        if (r.ok) {
          setSubmitSuccess(true);
          setForm({ title: '', url: '', description: '', resourceType: 'article', techTags: [], fileUrl: '' });
          fetchData();
        } else {
          setSubmitError(r.error ?? t('submitFailed'));
        }
      } catch {
        setSubmitError(t('networkError'));
      } finally {
        setSubmitLoading(false);
      }
    },
    [form, fetchData],
  );

  const typeTabs = useMemo(
    () =>
      (['all', 'article', 'video', 'course', 'tool', 'book', 'other'] as const).map((key, idx) => ({
        key,
        num: key === 'all' ? '00' : String(idx).padStart(2, '0'),
        label: `${resourceTypeLabel(t, key)}${key !== 'all' ? ` / ${key.charAt(0).toUpperCase() + key.slice(1)}` : ''}`,
      })),
    [t],
  );

  const techTagTabs = useMemo(() => {
    const counts = data?.techTagCounts ?? {};
    return [
      { key: '__all__', label: t('allLabel'), count: data?.total ?? 0 },
      ...TECH_TAGS.map((t: TechTag) => ({
        key: t.key,
        label: t.label,
        count: counts[t.key] ?? 0,
      })),
    ];
  }, [data]);

  const pages = data?.totalPages ?? 1;
  const activeTypeLabel = resourceTypeLabel(t, activeType);

  const setType = useCallback((key: string) => {
    setActiveType(key as ResourceType);
    setPage(1);
  }, []);
  const setTag = useCallback((key: string) => {
    setActiveTag(key === '__all__' ? null : key);
    setPage(1);
  }, []);
  const setSortAndReset = useCallback((s: 'latest' | 'popular') => {
    setSort(s);
    setPage(1);
  }, []);

  const openSubmit = useCallback(() => {
    router.push('/tools/resource?submit=1', { scroll: false });
  }, [router]);

  return {
    isLoggedIn,
    data,
    loading,
    activeType,
    activeTypeLabel,
    activeTag,
    sort,
    page,
    pages,
    typeTabs,
    techTagTabs,
    showSubmit,
    submitLoading,
    submitError,
    submitSuccess,
    form,
    setForm,
    uploading,
    fileInputRef,
    setType,
    setTag,
    setSortAndReset,
    setPage,
    openSubmit,
    closeSubmit,
    handleFileUpload,
    handleSubmit,
  };
}

export type ResourcesState = ReturnType<typeof useResources>;
