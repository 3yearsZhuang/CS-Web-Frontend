'use client';

/**
 * @file useCompose — 发布内容页共享状态与逻辑 Hook
 *
 * 从 `app/community/new/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。表单渲染拆分到 `ComposeForm`。
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { CommunityCategory } from '@/modules/community/types';

/** 后端长度限制（与 server/community.ts LIMITS 保持一致） */
const LIMITS = {
  TITLE_MIN: 4,
  TITLE_MAX: 120,
  CONTENT_MIN: 10,
  CONTENT_MAX: 20000,
} as const;

interface CurrentUserResponse {
  user: { id: string; role: 'user' | 'admin' };
}

interface CategoriesResponse {
  items: CommunityCategory[];
}

interface CreateTopicResponse {
  ok: true;
  topic: { id: string; categoryId: string; category?: { slug: string; name: string } | null };
}

export function useCompose() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('category') ?? '';

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
    categoryId?: string;
  }>({});

  /** 加载当前用户 + 版块列表 */
  const loadInitial = useCallback(async () => {
    setLoadingCats(true);
    try {
      const [meResult, catResult] = await Promise.all([
        apiRequest<CurrentUserResponse>('/api/auth/me'),
        apiRequest<CategoriesResponse>('/api/community/categories'),
      ]);

      if (meResult.ok) {
        setIsLoggedIn(Boolean(meResult.data?.user?.id));
      } else {
        setIsLoggedIn(false);
      }
      setAuthChecked(true);

      if (catResult.ok) {
        const cats = catResult.data?.items ?? [];
        setCategories(cats);
        if (initialCategory) {
          const matched = cats.find((c) => c.slug === initialCategory);
          if (matched) setCategoryId(matched.id);
        }
        if (!categoryId && cats.length > 0) {
          setCategoryId(cats[0].id);
        }
      }
    } catch {
      setFormError('加载失败，请刷新重试');
    } finally {
      setLoadingCats(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  /** 表单校验 */
  const validate = useCallback((): boolean => {
    const errs: typeof fieldErrors = {};

    if (!categoryId) errs.categoryId = '请选择一个版块';

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < LIMITS.TITLE_MIN) {
      errs.title = `标题至少 ${LIMITS.TITLE_MIN} 个字符`;
    } else if (trimmedTitle.length > LIMITS.TITLE_MAX) {
      errs.title = `标题不能超过 ${LIMITS.TITLE_MAX} 个字符`;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < LIMITS.CONTENT_MIN) {
      errs.content = `正文至少 ${LIMITS.CONTENT_MIN} 个字符`;
    } else if (trimmedContent.length > LIMITS.CONTENT_MAX) {
      errs.content = `正文不能超过 ${LIMITS.CONTENT_MAX} 个字符`;
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [categoryId, title, content]);

  /** 提交新内容 */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!validate()) return;

      setSubmitting(true);
      try {
        const result = await apiRequest<CreateTopicResponse>('/api/community/topics', {
          method: 'POST',
          body: {
            categoryId,
            title: title.trim(),
            contentMarkdown: content,
          },
        });

        if (!result.ok) {
          setFormError(result.error ?? '发布失败');
          return;
        }

        const ok = result.data;
        if (ok) {
          router.push(`/community/${ok.topic.id}`);
        }
      } catch {
        setFormError('网络错误，请重试');
      } finally {
        setSubmitting(false);
      }
    },
    [validate, categoryId, title, content, router],
  );

  /** 清空表单 */
  const clearForm = useCallback(() => {
    setTitle('');
    setContent('');
    setFieldErrors({});
    setFormError(null);
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return {
    router,
    categories,
    loadingCats,
    authChecked,
    isLoggedIn,
    categoryId,
    setCategoryId,
    title,
    setTitle,
    content,
    setContent,
    submitting,
    formError,
    setFormError,
    fieldErrors,
    setFieldErrors,
    selectedCategory,
    LIMITS,
    validate,
    handleSubmit,
    clearForm,
  };
}

export type ComposeState = ReturnType<typeof useCompose>;
