/**
 * @file 个人主页 — 资料 / 安全 / 活动，左侧 tab 导航 + 右侧内容区
 */
'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '@/shared/config';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { FloatingCapsuleSidebar, type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { Avatar } from '@/components/avatar';
import { TwoFactorSettings } from '@/modules/auth/ui/two-factor-settings';
import { ProfileForumTab } from '@/modules/community/ui/forum-profile-tab';
import { TechTagSelector } from '@/components/tech-tag-selector';
import { AVATAR_PRESETS } from '@/shared/config';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import type { User, ActivityParticipation } from '@/modules/user/types';
import { USER_LIMITS as LIMITS, isValidHttpUrl as isValidUrl } from '@/modules/user/types';
import { formatDate } from '@/shared/utils/utils';
import { INPUT_CLASS, EASE } from '@/shared/utils/ui-constants';

/** 资料编辑表单状态 */
interface ProfileForm {
  displayName: string;
  bio: string;
  githubUrl: string;
  websiteUrl: string;
  techTags: string[];
}

/** 修改密码表单状态 */
interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type ProfileTab = 'profile' | 'security' | 'activity' | 'forum' | 'join';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('profile');

  // Tab 切换（资料 / 安全 / 活动）
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  // 悬浮胶囊侧边栏 Tab 配置
  const profileTabs: CapsuleTab[] = [
    { key: 'profile', num: '01', label: t('tabProfile') },
    { key: 'security', num: '02', label: t('tabSecurity') },
    { key: 'activity', num: '03', label: t('tabActivity') },
    { key: 'forum', num: '04', label: t('tabForum') },
    { key: 'join', num: '05', label: t('tabJoin') },
  ];

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  // GitHub 自动绑定提示
  const [githubBound, setGithubBound] = useState(false);

  // 数据状态
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
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 头像状态（即时生效）
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetsExpanded, setPresetsExpanded] = useState(false);

  // 修改密码表单状态
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  /** 初次加载：获取个人资料 */
  useEffect(() => {
    // 支持 ?tab=join 等 URL 参数直接切换 Tab
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'security', 'activity', 'forum', 'join'].includes(tabParam)) {
      setActiveTab(tabParam as ProfileTab);
    }

    // 检测 GitHub 自动绑定提示
    if (searchParams.get('github_bound') === '1') {
      setGithubBound(true);
      // 清除 URL 参数，避免刷新后重复显示
      router.replace('/profile');
    }

    let cancelled = false;
    fetch('/api/profile')
      .then(async (res) => {
        if (res.status === 401) {
          // 未登录 — 跳转登录页
          router.replace('/login');
          return null;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || t('loadFailed'));
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
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
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : t('loadFailed'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams 仅用于初始检测，router 稳定
  }, [router]);

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
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName || null,
          bio: form.bio || null,
          githubUrl: form.githubUrl || null,
          websiteUrl: form.websiteUrl || null,
          techTags: form.techTags,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        user?: User;
        error?: string;
      } | null;
      if (!res.ok || !data?.user) {
        setProfileMessage({
          type: 'error',
          text: data?.error || t('profileSaveFailed'),
        });
        return;
      }
      setUser(data.user);
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
        const res = await fetch('/api/profile/avatar/preset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presetId }),
        });
        const data = (await res.json().catch(() => null)) as {
          user?: User;
          error?: string;
        } | null;
        if (!res.ok || !data?.user) {
          setAvatarMessage({
            type: 'error',
            text: data?.error || t('avatarSetFailed'),
          });
          return;
        }
        setUser(data.user);
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
      const res = await fetch('/api/profile/avatar/upload', {
        method: 'POST',
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as {
        user?: User;
        error?: string;
      } | null;
      if (!res.ok || !data?.user) {
        setAvatarMessage({
          type: 'error',
          text: data?.error || t('avatarUploadFailed'),
        });
        return;
      }
      setUser(data.user);
      setAvatarMessage({ type: 'success', text: t('avatarUploaded') });
    } catch {
      setAvatarMessage({ type: 'error', text: t('networkError') });
    } finally {
      setAvatarSaving(false);
      e.target.value = '';
    }
  };

  /** 提交修改密码 */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // 客户端校验
    if (!passwordForm.currentPassword) {
      setPasswordMessage({ type: 'error', text: t('enterCurrentPassword') });
      return;
    }
    if (passwordForm.newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordMessage({ type: 'error', text: t('newPasswordTooShort', { min: PASSWORD_MIN_LENGTH }) });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('newPasswordMismatch') });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        // 400 — 密码不符合要求；401 — 当前密码错误
        if (res.status === 401) {
          setPasswordMessage({
            type: 'error',
            text: data?.error || t('currentPasswordWrong'),
          });
        } else if (res.status === 400) {
          setPasswordMessage({
            type: 'error',
            text: data?.error || t('passwordInvalid'),
          });
        } else {
          setPasswordMessage({
            type: 'error',
            text: data?.error || t('passwordChangeFailed'),
          });
        }
        return;
      }

      // 成功 — 清空表单 + 提示
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordMessage({ type: 'success', text: t('passwordChanged') });
    } catch {
      setPasswordMessage({ type: 'error', text: t('networkError') });
    } finally {
      setSavingPassword(false);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  // 加载错误状态
  if (loadError || !user) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{t('errorTitle')}</div>
          <p className="text-[14px] text-[var(--muted-foreground)] mb-8">
            {loadError || t('loadFailed')}
          </p>
          <Link
            href="/"
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('backHome')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      {/* ============ [01] Hero — 身份信息（1s 后自动收缩悬浮） ============ */}
      <CollapsingHero
        index="00"
        label={t('identityLabel')}
        hero={hero}
        pageKey="profile"
        minHeight="60vh"
        sidebarBottom={<span aria-hidden="true" />}
      >
        <div className={`flex flex-col sm:flex-row sm:items-center ${hero.collapsed ? 'gap-3 sm:gap-4' : 'gap-6 sm:gap-10'}`}>
          <RevealItem duration={0.9}>
            <div
              className={`transition-all hero-reveal ${
                hero.collapsed ? 'scale-[0.5] origin-left' : 'scale-100'
              }`}
            >
              <Avatar
                email={user.email}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                avatarType={user.avatarType}
                size={128}
              />
            </div>
          </RevealItem>
          <div className="flex-1 min-w-0">
            <RevealTitle>
              <h1
                className={`display-serif text-[var(--foreground)] break-words transition-all hero-reveal ${
                  hero.collapsed
                    ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                    : 'text-[clamp(32px,6vw,72px)] leading-[1.05] sm:leading-[0.95]'
                }`}
                onClick={hero.collapsed ? hero.onTitleClick : undefined}
              >
                {user.displayName || (
                  <>
                    {t('unnamed')}
                    <span className="text-[var(--muted-foreground)]"> {t('unnamedUser')}</span>
                  </>
                )}
                <span
                  className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                    hero.collapsed
                      ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                      : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
                  }`}
                >
                  {t('identityEn')}
                </span>
              </h1>
            </RevealTitle>
            <div
              className={`overflow-hidden transition-all hero-reveal ${
                hero.collapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[100px] opacity-100 mt-3'
              }`}
            >
              <RevealItem>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 meta-mono text-[12px] text-[var(--muted-foreground)]">
                  <span className="break-all">{user.email}</span>
                  <span className="hidden sm:inline">/</span>
                  <span>{t('joined', { date: formatDate(user.createdAt) })}</span>
                </div>
              </RevealItem>
            </div>
            {user.bio && (
              <div
                className={`overflow-hidden transition-all hero-reveal ${
                  hero.collapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[200px] opacity-100 mt-6'
                }`}
              >
                <RevealItem>
                  <p className="max-w-2xl text-[14px] sm:text-[15px] text-[var(--muted-foreground)] leading-[1.85]">
                    {user.bio}
                  </p>
                </RevealItem>
              </div>
            )}
          </div>
        </div>
      </CollapsingHero>

      {/* ============ [01] Tab 区域 — 资料 / 安全 / 活动 ============ */}
      <section data-section-nav="01|资料" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <StaggerContainer>
            {/* 标题 + 悬浮胶囊侧边栏 */}
            <div className="grid grid-cols-12 gap-0 items-end mb-10 sm:mb-16">
              <div className="col-span-12">
                <RevealTitle>
                  <h1 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] leading-[1.05] sm:leading-[0.95]">
                    {activeTab === 'profile'
                      ? t('profileTitle')
                      : activeTab === 'security'
                        ? t('securityTitle')
                        : activeTab === 'activity'
                          ? t('activityTitle')
                          : activeTab === 'forum'
                            ? t('forumTitle')
                            : t('joinTitle')}
                    <span className="text-[var(--muted-foreground)]">
                      {' '}
                      /{' '}
                      {activeTab === 'profile'
                        ? t('profileEn')
                        : activeTab === 'security'
                          ? t('securityEn')
                          : activeTab === 'activity'
                            ? t('activityEn')
                            : activeTab === 'forum'
                              ? t('forumEn')
                              : t('joinEn')}
                    </span>
                  </h1>
                </RevealTitle>
                <RevealItem>
                  <div className="mt-4 meta-mono text-[12px] text-[var(--muted-foreground)]">
                    <span className="ark-divider">{t('userPanel')}</span>
                  </div>
                </RevealItem>
              </div>
            </div>
          </StaggerContainer>

          {/* 悬浮胶囊侧边栏（桌面端） + 移动端 Tab 条 */}
          <FloatingCapsuleSidebar
            visible={capsuleVisible}
            tabs={profileTabs}
            activeKey={activeTab}
            onTabChange={(key) => setActiveTab(key as ProfileTab)}
          />

          {/* GitHub 自动绑定提示 */}
          {githubBound && (
            <div className="mb-6 p-4 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.06] flex items-start gap-3">
              <span className="meta-mono text-[var(--primary)] text-[12px] shrink-0">[ BOUND ]</span>
              <div className="flex-1">
                <p className="text-[13px] text-[var(--foreground)] leading-relaxed">
                  {t('githubBoundTitle')}
                </p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1">
                  {t('githubBoundDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGithubBound(false)}
                className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* ============ Tab 01 — 资料与头像 ============ */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
              {/* ---- 左：头像选择区（即时生效） ---- */}
              <div className="col-span-12 md:col-span-5 p-6 sm:p-8 md:py-10 md:border-r md:border-[var(--border)] space-y-10">
                {/* 当前头像 */}
                <div>
                  <div className="meta-mono mb-4 flex items-center justify-between text-[var(--muted-foreground)]">
                    <span>{t('current')}</span>
                    <span className="ark-divider">Avatar</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <Avatar
                      email={user.email}
                      displayName={user.displayName}
                      avatarUrl={user.avatarUrl}
                      avatarType={user.avatarType}
                      size={96}
                    />
                    <div className="meta-mono text-[12px] text-[var(--muted-foreground)]">
                      <div>
                        {t('type')}{' '}
                        <span className="text-[var(--foreground)]">{user.avatarType}</span>
                      </div>
                      <div className="mt-1">
                        {t('updated', { date: formatDate(user.updatedAt) })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 预设头像选择 — 折叠式展开 */}
                <div>
                  <button
                    type="button"
                    onClick={() => setPresetsExpanded((v) => !v)}
                    className="w-full flex items-center justify-between group focus-amber"
                  >
                    <div className="meta-mono text-[var(--muted-foreground)] flex items-center gap-3">
                      <span>{t('presets')}</span>
                      <span className="text-[11px] text-[var(--muted-foreground)]/60">
                        {t('options', { count: AVATAR_PRESETS.length })}
                      </span>
                      {!presetsExpanded &&
                        (() => {
                          const active = AVATAR_PRESETS.find(
                            (p) => user.avatarType === 'preset' && user.avatarUrl === p.url,
                          );
                          return active ? (
                            <span className="text-[var(--primary)]">{active.label}</span>
                          ) : (
                            <span className="text-[var(--muted-foreground)]/40">—</span>
                          );
                        })()}
                    </div>
                    <span
                      className={`meta-mono text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-all duration-300 ${
                        presetsExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {presetsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-3 pt-4">
                          {AVATAR_PRESETS.map((preset) => {
                            const selected =
                              user.avatarType === 'preset' &&
                              user.avatarUrl === preset.url;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                disabled={avatarSaving}
                                onClick={() => handlePresetSelect(preset.id)}
                                className={`group relative aspect-square p-3 border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                  selected
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/[0.06]'
                                    : 'border-[var(--border)] hover:border-[var(--primary)]/60'
                                }`}
                                title={preset.label}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- 预设头像为 SVG，next/image 需 dangerouslyAllowSVG */}
                                <img
                                  src={preset.url}
                                  alt={preset.label}
                                  className="w-full h-full object-contain"
                                />
                                <div className="absolute bottom-1 left-2 meta-mono text-[9px] text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                                  {preset.label}
                                </div>
                                {selected && (
                                  <div className="absolute top-1 right-1 meta-mono text-[9px] text-[var(--primary)]">
                                    ●
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 上传自定义头像 */}
                <div>
                  <div className="meta-mono mb-4 text-[var(--muted-foreground)]">
                    {t('upload')}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button
                      variant="outline"
                      disabled={avatarSaving}
                      loading={avatarSaving}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarSaving ? t('uploading') : t('chooseFile')}
                    </Button>
                    <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                      {t('fileHint')}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  {avatarMessage && (
                    <div
                      className={`mt-4 p-3 border-l-2 text-[12px] font-mono leading-relaxed ${
                        avatarMessage.type === 'success'
                          ? 'border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[var(--primary)]'
                          : 'border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[var(--destructive)]'
                      }`}
                    >
                      {avatarMessage.text}
                    </div>
                  )}
                </div>
              </div>

              {/* ---- 右：资料表单（需点击保存） ---- */}
              <div className="col-span-12 md:col-span-7 p-6 sm:p-8 md:py-10">
                <form onSubmit={handleProfileSubmit} className="space-y-8">
                  {/* Display Name */}
                  <div>
                    <label
                      htmlFor="displayName"
                      className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]"
                    >
                      <span>[ 01 ] {t('displayName')}</span>
                      <span>
                        {form.displayName.length}/{LIMITS.DISPLAY_NAME_MAX}
                      </span>
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={form.displayName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, displayName: e.target.value }))
                      }
                      maxLength={LIMITS.DISPLAY_NAME_MAX}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder={t('displayNamePlaceholder')}
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label
                      htmlFor="bio"
                      className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]"
                    >
                      <span>[ 02 ] {t('bio')}</span>
                      <span>
                        {form.bio.length}/{LIMITS.BIO_MAX}
                      </span>
                    </label>
                    <textarea
                      id="bio"
                      value={form.bio}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bio: e.target.value.slice(0, LIMITS.BIO_MAX) }))
                      }
                      maxLength={LIMITS.BIO_MAX}
                      rows={4}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px] resize-none`}
                      placeholder={t('bioPlaceholder')}
                    />
                  </div>

                  {/* GitHub URL */}
                  <div>
                    <label
                      htmlFor="githubUrl"
                      className="meta-mono mb-2 block text-[var(--muted-foreground)]"
                    >
                      [ 03 ] {t('github')}
                    </label>
                    <input
                      id="githubUrl"
                      type="url"
                      value={form.githubUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, githubUrl: e.target.value }))
                      }
                      maxLength={LIMITS.URL_MAX}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder="https://github.com/your-name"
                    />
                  </div>

                  {/* Website URL */}
                  <div>
                    <label
                      htmlFor="websiteUrl"
                      className="meta-mono mb-2 block text-[var(--muted-foreground)]"
                    >
                      [ 04 ] {t('website')}
                    </label>
                    <input
                      id="websiteUrl"
                      type="url"
                      value={form.websiteUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, websiteUrl: e.target.value }))
                      }
                      maxLength={LIMITS.URL_MAX}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder="https://your-site.com"
                    />
                  </div>

                  {/* Tech Tags */}
                  <TechTagSelector
                    selected={form.techTags}
                    onChange={(tags) => setForm((f) => ({ ...f, techTags: tags }))}
                    disabled={savingProfile}
                  />

                  {/* 消息 + 保存按钮 */}
                  {profileMessage && (
                    <div
                      className={`p-3 border-l-2 text-[12px] font-mono leading-relaxed ${
                        profileMessage.type === 'success'
                          ? 'border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[var(--primary)]'
                          : 'border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[var(--destructive)]'
                      }`}
                    >
                      {profileMessage.text}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      loading={savingProfile}
                    >
                      {savingProfile ? t('saving') : t('saveChanges')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          displayName: user.displayName ?? '',
                          bio: user.bio ?? '',
                          githubUrl: user.githubUrl ?? '',
                          websiteUrl: user.websiteUrl ?? '',
                          techTags: user.techTags ?? [],
                        });
                        setProfileMessage(null);
                      }}
                      className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                    >
                      {t('reset')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============ Tab 02 — 账号安全 ============ */}
          {activeTab === 'security' && (
            <>
            <form
              onSubmit={handlePasswordSubmit}
              className="grid grid-cols-12 gap-0 border-t border-[var(--border)]"
            >
              <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8 md:py-10 space-y-8">
                {/* 当前密码 */}
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="meta-mono mb-2 block text-[var(--muted-foreground)]"
                  >
                    [ 01 ] {t('currentPassword')}
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder={t('currentPasswordPlaceholder')}
                    autoComplete="current-password"
                  />
                </div>

                {/* 新密码 */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]"
                  >
                    <span>[ 02 ] {t('newPassword')}</span>
                    <span>≥ {PASSWORD_MIN_LENGTH}</span>
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder={t('newPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                </div>

                {/* 确认新密码 */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="meta-mono mb-2 block text-[var(--muted-foreground)]"
                  >
                    [ 03 ] {t('confirmNewPassword')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder={t('confirmNewPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                </div>

                {/* 消息 */}
                {passwordMessage && (
                  <div
                    className={`p-3 border-l-2 text-[12px] font-mono leading-relaxed ${
                      passwordMessage.type === 'success'
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[var(--primary)]'
                        : 'border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[var(--destructive)]'
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                {/* 提交按钮 */}
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={savingPassword}
                    loading={savingPassword}
                  >
                    {savingPassword ? t('updating') : t('updatePassword')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setPasswordMessage(null);
                    }}
                    className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                  >
                    {t('reset')}
                  </button>
                </div>
              </div>
            </form>

            {/* 双因素认证 */}
            <TwoFactorSettings />

            {/* 活跃会话管理 */}
            <SessionManager />
            </>
          )}

          {/* ============ Tab 03 — 活动记录 ============ */}
          {activeTab === 'activity' && (
            <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
              <div className="col-span-12 md:col-span-8 md:col-start-3">
                {activities.length === 0 ? (
                  // 空状态
                  <div className="p-8 sm:p-12 text-center">
                    <div className="meta-mono text-[var(--muted-foreground)] mb-4">
                      {t('noRecord')}
                    </div>
                    <p className="text-[14px] text-[var(--muted-foreground)]">
                      {t('noActivity')}
                    </p>
                    <Link
                      href="/events"
                      className="mt-6 inline-block meta-mono text-[var(--primary)] underline-grow"
                    >
                      {t('browseEvents')}
                    </Link>
                  </div>
                ) : (
                  // 活动列表
                  <ul>
                    {activities.map((act, idx) => (
                      <li
                        key={act.id}
                        className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 ${
                          idx < activities.length - 1
                            ? 'border-b border-[var(--border)]'
                            : ''
                        }`}
                      >
                        <span className="meta-mono text-[var(--primary)] text-[12px] shrink-0">
                          {formatDate(act.activityDate)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] sm:text-[16px] text-[var(--foreground)]">
                            {act.activityTitle}
                          </div>
                          {act.role && (
                            <div className="mt-1 meta-mono text-[11px] text-[var(--muted-foreground)]">
                              {t('role', { role: act.role })}
                            </div>
                          )}
                        </div>
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)] shrink-0">
                          0{idx + 1}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ============ Tab 04 — 论坛活动（我的主题 / 回复 / 收藏） ============ */}
          {activeTab === 'forum' && user && <ProfileForumTab userId={user.id} />}

          {/* ============ Tab 05 — 入社申请（我的申请列表） ============ */}
          {activeTab === 'join' && <ProfileJoinTab />}
        </div>
      </section>
    </main>
  );
}

/** 会话管理器组件 — 展示活跃会话列表 + 远程登出 */
function SessionManager() {
  const t = useTranslations('profile');
  const [sessions, setSessions] = useState<Array<{
    id: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sessions')
      .then(async (res) => {
        if (!res.ok) throw new Error(t('loadFailed'));
        const data = await res.json();
        if (cancelled) return;
        setSessions(data.sessions || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [t]);

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error(t('deleteFailed'));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // 静默失败
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--muted-foreground)]">{t('loadingSessions')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--destructive)]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
      <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8 md:py-10 space-y-6">
        <div className="meta-mono text-[var(--muted-foreground)] flex items-center justify-between">
          <span>{t('sessionsLabel')}</span>
          <span>{t('active', { count: sessions.length })}</span>
        </div>

        {sessions.length === 0 ? (
          <div className="meta-mono text-[var(--muted-foreground)]">{t('noSessions')}</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 border border-[var(--border)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">
                    {s.userAgent || t('unknownDevice')}
                  </div>
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    IP: {s.ip || '—'} · {t('created', { date: s.createdAt })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors shrink-0 ml-4"
                >
                  {deletingId === s.id ? '...' : t('logout')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 入社申请 Tab — 展示当前用户的入社申请列表 + 状态 */
function ProfileJoinTab() {
  const t = useTranslations('profile');
  const [applications, setApplications] = useState<Array<{
    id: string;
    applicantName: string;
    studentId: string;
    major: string;
    techTags: string[];
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewNote: string | null;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/join/mine')
      .then(async (res) => {
        if (!res.ok) throw new Error(t('loadFailed'));
        const data = await res.json();
        if (cancelled) return;
        setApplications(data.applications || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [t]);

  const statusLabel = (s: string) =>
    s === 'pending' ? t('statusPending') : s === 'approved' ? t('statusApproved') : t('statusRejected');
  const statusClass = (s: string) =>
    s === 'pending' ? 'border-amber-500/40 text-amber-500'
    : s === 'approved' ? 'border-emerald-500/40 text-emerald-500'
    : 'border-red-400/40 text-red-400';

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--muted-foreground)]">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--destructive)]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
      <div className="col-span-12 md:col-span-8 md:col-start-3">
        {applications.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">
              {t('noApplication')}
            </div>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-6">
              {t('noApplicationDesc')}
            </p>
            <Link
              href="/join"
              className="meta-mono text-[var(--primary)] underline-grow"
            >
              {t('fillApplication')}
            </Link>
          </div>
        ) : (
          <ul>
            {applications.map((app, idx) => (
              <li
                key={app.id}
                className={`p-6 sm:p-8 ${idx < applications.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="meta-mono text-[var(--primary)] text-[12px]">
                    {formatDate(app.createdAt)}
                  </span>
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${statusClass(app.status)}`}>
                    {statusLabel(app.status)}
                  </span>
                </div>
                <div className="text-[15px] text-[var(--foreground)] mb-2">
                  {app.applicantName} · {t('studentId', { id: app.studentId })} · {app.major}
                </div>
                {app.techTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {app.techTags.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {app.reviewNote && (
                  <div className="mt-3 p-3 border-l-2 border-[var(--border)] bg-[var(--muted)]/[0.04]">
                    <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                      {t('reviewNote')}
                    </div>
                    <p className="text-[12px] text-[var(--foreground)]">{app.reviewNote}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}
