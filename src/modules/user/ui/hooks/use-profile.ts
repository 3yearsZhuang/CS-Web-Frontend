'use client';

/**
 * @file useProfile — 个人资料加载、资料编辑保存、头像预设/上传逻辑 Hook
 *
 * 从 `app/profile/page.tsx` 的 ProfileContent 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。组件只保留渲染，状态与 API 调用集中于此。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AVATAR_PRESETS, PASSWORD_MIN_LENGTH } from '@/shared/config';
import type { User, ActivityParticipation } from '@/modules/user/types';
import { USER_LIMITS as LIMITS, isValidHttpUrl as isValidUrl } from '@/modules/user/types';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 资料编辑表单状态 */
export interface ProfileForm {
  displayName: string;
  bio: string;
  githubUrl: string;
  websiteUrl: string;
  techTags: string[];
}

/** 表单提交结果消息 */
export interface ProfileMessage {
  type: 'success' | 'error';
  text: string;
}

/** /api/profile 返回结构 */
interface ProfileResponse {
  user: User;
  activities: ActivityParticipation[];
}

export function useProfile() {
  const t = useTranslations('profile');

  // 数据状态（跨 tab 共享：资料 / 安全 / 活动 均依赖 user）
  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 资料表单状态
  const [form, setForm] = useState<ProfileForm>({
    displayName: '',
    bio: '',
    githubUrl: '',
    websiteUrl: '',
    techTags: [],
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<ProfileMessage | null>(null);

  // 头像状态（即时生效）
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<ProfileMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetsExpanded, setPresetsExpanded] = useState(false);

  /** 初次加载：获取个人资料 */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await apiRequest<ProfileResponse>('/api/profile');
      if (cancelled) return;
      if (r.status === 401) {
        setLoading(false);
        return;
      }
      if (!r.ok) {
        setLoadError(r.error ?? t('loadFailed'));
        setLoading(false);
        return;
      }
      const data = r.data;
      if (!data) {
        setLoading(false);
        return;
      }
      const u = data.user as User;
      const acts = (data.activities || []) as ActivityParticipation[];
      setUser(u);
      setActivities(acts);
      setForm({
        displayName: u.displayName ?? '',
        bio: u.bio ?? '',
        githubUrl: u.githubUrl ?? '',
        websiteUrl: u.websiteUrl ?? '',
        techTags: u.techTags ?? [],
      });
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时加载一次
  }, []);

  /** 提交资料更新 */
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    // 客户端校验
    if (form.displayName.length > LIMITS.DISPLAY_NAME_MAX) {
      setProfileMessage({
        type: 'error',
        text: t('displayNameTooLong', { max: LIMITS.DISPLAY_NAME_MAX }),
      });
      return;
    }
    if (form.bio.length > LIMITS.BIO_MAX) {
      setProfileMessage({
        type: 'error',
        text: t('bioTooLong', { max: LIMITS.BIO_MAX }),
      });
      return;
    }
    if (form.githubUrl && !isValidUrl(form.githubUrl)) {
      setProfileMessage({ type: 'error', text: t('invalidGithub') });
      return;
    }
    if (form.websiteUrl && !isValidUrl(form.websiteUrl)) {
      setProfileMessage({ type: 'error', text: t('invalidWebsite') });
      return;
    }

    setSavingProfile(true);
    try {
      const r = await apiRequest<{ user?: User }>('/api/profile', {
        method: 'PUT',
        body: {
          displayName: form.displayName || null,
          bio: form.bio || null,
          githubUrl: form.githubUrl || null,
          websiteUrl: form.websiteUrl || null,
          techTags: form.techTags,
        },
      });
      if (!r.ok || !r.data?.user) {
        setProfileMessage({
          type: 'error',
          text: r.error || t('profileSaveFailed'),
        });
        return;
      }
      setUser(r.data.user);
      setProfileMessage({ type: 'success', text: t('profileSaved') });
    } catch {
      setProfileMessage({ type: 'error', text: t('networkError') });
    } finally {
      setSavingProfile(false);
    }
  };

  /** 选择预设头像（即时生效，无需保存按钮） */
  const handlePresetSelect = useCallback(
    async (presetId: number) => {
      if (!user || avatarSaving) return;
      // 已选中该预设 — 无操作
      if (user.avatarType === 'preset') {
        const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
        if (preset && user.avatarUrl === preset.url) return;
      }

      setAvatarSaving(true);
      setAvatarMessage(null);
      try {
        const r = await apiRequest<{ user?: User }>('/api/profile/avatar/preset', {
          method: 'POST',
          body: { presetId },
        });
        if (!r.ok || !r.data?.user) {
          setAvatarMessage({
            type: 'error',
            text: r.error || t('avatarSetFailed'),
          });
          return;
        }
        setUser(r.data.user);
        setAvatarMessage({ type: 'success', text: t('avatarUpdated') });
      } catch {
        setAvatarMessage({ type: 'error', text: t('networkError') });
      } finally {
        setAvatarSaving(false);
      }
    },
    [user, avatarSaving, t],
  );

  /** 处理头像上传（即时生效，无需保存按钮） */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 客户端校验
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMime.includes(file.type)) {
      setAvatarMessage({ type: 'error', text: t('invalidImageType') });
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({ type: 'error', text: t('fileTooLarge') });
      e.target.value = '';
      return;
    }

    setAvatarSaving(true);
    setAvatarMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await apiRequest<{ user?: User }>('/api/profile/avatar/upload', {
        method: 'POST',
        body: fd,
      });
      if (!r.ok || !r.data?.user) {
        setAvatarMessage({
          type: 'error',
          text: r.error || t('avatarUploadFailed'),
        });
        return;
      }
      setUser(r.data.user);
      setAvatarMessage({ type: 'success', text: t('avatarUploaded') });
    } catch {
      setAvatarMessage({ type: 'error', text: t('networkError') });
    } finally {
      setAvatarSaving(false);
      e.target.value = '';
    }
  };

  return {
    // 状态
    user,
    setUser,
    activities,
    loading,
    loadError,
    form,
    setForm,
    savingProfile,
    profileMessage,
    setProfileMessage,
    avatarSaving,
    avatarMessage,
    setAvatarMessage,
    fileInputRef,
    presetsExpanded,
    setPresetsExpanded,
    // 操作
    handleProfileSubmit,
    handlePresetSelect,
    handleAvatarUpload,
  };
}
