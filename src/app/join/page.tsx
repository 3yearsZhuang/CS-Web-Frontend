/**
 * @file 入社申请页（/join）— 需登录，客户端 + 服务端双重校验
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { TechTagSelector } from '@/components/tech-tag-selector';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useState, useEffect } from 'react';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

const TECH_TAG_OPTIONS = [
  '前端', '后端', 'AI', '安全', '设计', '移动端', '运维', '数据科学', '嵌入式', '游戏开发',
];

interface ExistingApplication {
  id: string;
  applicantName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  createdAt: string;
}

export default function JoinPage() {
  const router = useRouter();
  const t = useTranslations('join');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  // 认证 + 数据状态
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [existingApps, setExistingApps] = useState<ExistingApplication[]>([]);

  const [form, setForm] = useState({
    applicantName: '',
    studentId: '',
    major: '',
    techTags: [] as string[],
    reason: '',
    contactQq: '',
    contactPhone: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** 初次加载：检查登录状态（可选）+ 获取已有申请 + 预填用户信息 */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/join/mine').then(async (r) => ({ ok: r.ok, status: r.status, data: r.ok ? await r.json() : null })),
      fetch('/api/profile').then(async (r) => ({ ok: r.ok, data: r.ok ? await r.json() : null })),
    ]).then(([mineRes, profileRes]) => {
      if (cancelled) return;
      // 未登录（401）不再跳转登录页，游客可直接填写表单
      if (mineRes.ok) {
        setLoggedIn(true);
        if (mineRes.data?.applications) {
          setExistingApps(mineRes.data.applications);
        }
      }
      // 预填用户信息（仅登录用户）
      if (profileRes.data?.user) {
        const u = profileRes.data.user;
        setForm((f) => ({
          ...f,
          applicantName: u.displayName || '',
          techTags: u.techTags || [],
        }));
      }
      setAuthChecked(true);
    }).catch(() => {
      if (cancelled) return;
      setAuthChecked(true);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始化加载
  }, [router]);

  const pendingApp = existingApps.find((a) => a.status === 'pending');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.applicantName.trim()) e.applicantName = t('nameRequired');
    if (!form.studentId.trim()) e.studentId = t('studentIdRequired');
    if (!form.major.trim()) e.major = t('majorRequired');
    if (!form.reason.trim()) e.reason = t('reasonRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName: form.applicantName.trim(),
          studentId: form.studentId.trim(),
          major: form.major.trim(),
          techTags: form.techTags,
          reason: form.reason.trim(),
          contactQq: form.contactQq.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || t('submitFailed') });
        return;
      }

      setMessage({
        type: 'success',
        text: loggedIn ? t('submitSuccessLoggedIn') : t('submitSuccessGuest'),
      });
      // 将新申请加入已有列表
      if (data.application) {
        setExistingApps((prev) => [data.application, ...prev]);
      }
      setForm({
        applicantName: '',
        studentId: '',
        major: '',
        techTags: [],
        reason: '',
        contactQq: '',
        contactPhone: '',
      });
    } catch {
      setMessage({ type: 'error', text: t('networkError') });
    } finally {
      setSubmitting(false);
    }
  };

  // 未完成认证检查时的加载状态
  if (!authChecked) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="meta-mono text-[var(--muted-foreground)]">{t('loading')}</div>
      </main>
    );
  }

  return (
    <VisibilityGate componentKey="join">
      <main className="relative pt-16">
      {/* ============ Hero ============ */}
      <CollapsingHero
        index="00"
        label="Join"
        hero={hero}
        pageKey="join"
        minHeight="45vh"
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,7vw,88px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle1')}
            <span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              {t('heroTitleEn')}
            </span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-6 sm:mt-10'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">{t('heroDesc2')}</span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ 申请表单 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="grid grid-cols-12 gap-0 mb-10 sm:mb-16">
            <div className="col-span-12 md:col-span-2">
              <div className="section-marker">[ 01 ]</div>
            </div>
            <div className="col-span-12 md:col-span-10">
              <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] leading-[1.05]">
                {t('sectionTitle1')}
                <span className="text-[var(--primary)]">{t('sectionTitle2')}</span>
                <span className="text-[var(--muted-foreground)]">{t('sectionTitleEn')}</span>
              </h2>
            </div>
          </div>

          <div className="max-w-2xl">
            {/* 已有待审核申请 — 显示状态卡片 */}
            {pendingApp && message?.type !== 'success' ? (
              <div className="p-6 border-l-2 border-amber-500/60 bg-amber-500/[0.04]">
                <div className="meta-mono text-amber-500 mb-2">{t('underReview')}</div>
                <p className="text-[14px] text-[var(--foreground)] leading-relaxed mb-4">
                  {t('pendingDesc', { date: formatDate(pendingApp.createdAt) })}
                </p>
                <Link
                  href="/profile?tab=join"
                  className="meta-mono text-[var(--primary)] underline-grow"
                >
                  {t('viewInProfile')}
                </Link>
              </div>
            ) : message?.type === 'success' ? (
              <div className="p-6 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04]">
                <div className="meta-mono text-[var(--primary)] mb-2">{t('submitted')}</div>
                <p className="text-[14px] text-[var(--foreground)] leading-relaxed">{message.text}</p>
                {loggedIn ? (
                  <Link
                    href="/profile?tab=join"
                    className="mt-4 inline-block meta-mono text-[var(--primary)] underline-grow"
                  >
                    {t('viewStatusInProfile')}
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className="mt-4 inline-block meta-mono text-[var(--primary)] underline-grow"
                  >
                    {t('register')}
                  </Link>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 姓名 */}
                <div>
                  <label htmlFor="applicantName" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 01 ] {t('name')} *
                  </label>
                  <input
                    id="applicantName"
                    type="text"
                    value={form.applicantName}
                    onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                    maxLength={20}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder={t('namePlaceholder')}
                  />
                  {errors.applicantName && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.applicantName}</div>
                  )}
                </div>

                {/* 学号 */}
                <div>
                  <label htmlFor="studentId" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 02 ] {t('studentId')} *
                  </label>
                  <input
                    id="studentId"
                    type="text"
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                    maxLength={20}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder={t('studentIdPlaceholder')}
                  />
                  {errors.studentId && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.studentId}</div>
                  )}
                </div>

                {/* 专业 */}
                <div>
                  <label htmlFor="major" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 03 ] {t('major')} *
                  </label>
                  <input
                    id="major"
                    type="text"
                    value={form.major}
                    onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                    maxLength={40}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder={t('majorPlaceholder')}
                  />
                  {errors.major && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.major}</div>
                  )}
                </div>

                {/* 技术方向 */}
                <TechTagSelector
                  selected={form.techTags}
                  onChange={(tags) => setForm((f) => ({ ...f, techTags: tags }))}
                  disabled={submitting}
                />

                {/* 申请理由 */}
                <div>
                  <label htmlFor="reason" className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]">
                    <span>[ 04 ] {t('reason')} *</span>
                    <span>{form.reason.length}/500</span>
                  </label>
                  <textarea
                    id="reason"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value.slice(0, 500) }))}
                    maxLength={500}
                    rows={4}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px] resize-none`}
                    placeholder={t('reasonPlaceholder')}
                  />
                  {errors.reason && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.reason}</div>
                  )}
                </div>

                {/* 联系方式 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactQq" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                      [ 05 ] {t('qq')}
                    </label>
                    <input
                      id="contactQq"
                      type="text"
                      value={form.contactQq}
                      onChange={(e) => setForm((f) => ({ ...f, contactQq: e.target.value }))}
                      maxLength={20}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder={t('optional')}
                    />
                  </div>
                  <div>
                    <label htmlFor="contactPhone" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                      [ 06 ] {t('phone')}
                    </label>
                    <input
                      id="contactPhone"
                      type="text"
                      value={form.contactPhone}
                      onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                      maxLength={20}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder={t('optional')}
                    />
                  </div>
                </div>

                {/* 消息 + 提交按钮 */}
                {message?.type === 'error' && (
                  <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[var(--destructive)] text-[12px] font-mono leading-relaxed">
                    {message.text}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? t('submitting') : t('submit')}
                </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
    </VisibilityGate>
  );
}