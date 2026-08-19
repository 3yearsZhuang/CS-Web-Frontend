'use client';

/**
 * @file ProfileTab — 资料与头像（Tab 01）
 *
 * 从 `app/profile/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与 API 调用由父页面通过 `useProfile` 注入（GENERAL 2.2 展示/容器分离）。
 */

import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '@/components/avatar';
import { TechTagSelector } from '@/components/tech-tag-selector';
import { Button, ArkDivider } from '@/components';
import { AVATAR_PRESETS } from '@/shared/config';
import { useTranslations } from 'next-intl';
import { EASE, INPUT_CLASS } from '@/shared/utils/ui-constants';
import { USER_LIMITS as LIMITS } from '@/modules/users/types';
import { formatDate } from '@/shared/utils/utils';
import type { useProfile } from '@/modules/users/ui/hooks/use-profile';

/** ProfileTab 接收父页面注入的 useProfile 返回值 */
export type ProfileTabProps = ReturnType<typeof useProfile>;

export function ProfileTab(props: ProfileTabProps) {
  const t = useTranslations('profile');
  const {
    user,
    form,
    setForm,
    savingProfile,
    profileMessage,
    setProfileMessage,
    avatarSaving,
    avatarMessage,
    fileInputRef,
    presetsExpanded,
    setPresetsExpanded,
    handleProfileSubmit,
    handlePresetSelect,
    handleAvatarUpload,
  } = props;

  if (!user) return null;

  return (
    <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
      {/* ---- 左：头像选择区（即时生效） ---- */}
      <div className="col-span-12 md:col-span-5 p-6 sm:p-8 md:py-10 md:border-r md:border-[var(--border)] space-y-10">
        {/* 当前头像 */}
        <div>
          <div className="meta-mono mb-4 flex items-center justify-between text-[var(--muted-foreground)]">
            <span>{t('current')}</span>
            <ArkDivider>Avatar</ArkDivider>
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
                      user.avatarType === 'preset' && user.avatarUrl === preset.url;
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
                if (!user) return;
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
  );
}
