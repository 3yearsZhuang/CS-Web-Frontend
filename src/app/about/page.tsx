/**
 * @file 关于页面 — 含「加入 / Join」区块（已合并原 /join 全量内容：加入流程 DNA 行卡 + 报名表填写）
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, DnaCard, SectionMarker, Title } from '@/components';
import Link from 'next/link';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';
import { TechTagSelector } from '@/components/tech-tag-selector';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';
import { apiRequest } from '@/shared/hooks/use-api-request';

type AboutTab = 'belief' | 'directions' | 'process';

interface BeliefItem { num: string; titleKey: string; descKey: string; tag: string; }
interface DirectionItem { num: string; nameKey: string; nameEn: string; tag: string; descKey: string; stack: string[]; }
interface RequirementItem { num: string; titleKey: string; descKey: string; tag: string; }

const BELIEFS: BeliefItem[] = [
  { num: '01', titleKey: 'belief1Title', descKey: 'belief1Desc', tag: 'Project-First' },
  { num: '02', titleKey: 'belief2Title', descKey: 'belief2Desc', tag: 'Inclusive' },
  { num: '03', titleKey: 'belief3Title', descKey: 'belief3Desc', tag: 'Outcome-Driven' },
];

const DIRECTIONS: DirectionItem[] = [
  { num: '01', nameKey: 'dir1Name', nameEn: 'Web Development', tag: 'Frontend & Backend', descKey: 'dir1Desc', stack: ['React / Next.js', 'Vue / Nuxt', 'Node.js / Bun', 'PostgreSQL / Supabase'] },
  { num: '02', nameKey: 'dir2Name', nameEn: 'Competitive Programming', tag: 'ACM / ICPC', descKey: 'dir2Desc', stack: ['C++ / Rust', 'Dynamic Programming', 'Graph / Number Theory', 'Codeforces / AtCoder'] },
  { num: '03', nameKey: 'dir3Name', nameEn: 'AI & Machine Learning', tag: 'ML / Deep Learning', descKey: 'dir3Desc', stack: ['PyTorch / JAX', 'Transformers', 'Computer Vision', 'NLP / RAG'] },
  { num: '04', nameKey: 'dir4Name', nameEn: 'Systems & Security', tag: 'OS / Security', descKey: 'dir4Desc', stack: ['Linux Kernel', 'Rust / C', 'Pwn / Reverse', 'CTF / Pentest'] },
  { num: '05', nameKey: 'dir5Name', nameEn: 'Open Source', tag: 'Community', descKey: 'dir5Desc', stack: ['Git / GitHub', 'Code Review', 'License / Governance', 'CNCF / Apache'] },
  { num: '06', nameKey: 'dir6Name', nameEn: 'Creative Coding', tag: 'Generative Art', descKey: 'dir6Desc', stack: ['p5.js / Three.js', 'WebGL / Shader', 'Unity / Godot', 'Generative Art'] },
];

const REQUIREMENTS: RequirementItem[] = [
  { num: '01', titleKey: 'req1Title', descKey: 'req1Desc', tag: 'Passion' },
  { num: '02', titleKey: 'req2Title', descKey: 'req2Desc', tag: 'Self-Driven' },
  { num: '03', titleKey: 'req3Title', descKey: 'req3Desc', tag: 'Collaborative' },
  { num: '04', titleKey: 'req4Title', descKey: 'req4Desc', tag: 'Inclusive' },
];

// 加入流程（来自原 /join，落地为列表选项 B · DNA 行卡）
const JOIN_STEPS = [
  { num: '01', titleKey: 'step1Title', duration: '5 min', descKey: 'step1Desc' },
  { num: '02', titleKey: 'step2Title', duration: '15 min', descKey: 'step2Desc' },
  { num: '03', titleKey: 'step3Title', duration: '20 min', descKey: 'step3Desc' },
  { num: '04', titleKey: 'step4Title', duration: '1 day', descKey: 'step4Desc' },
] as const;

import type { JoinApplication } from '@/modules/join/types';

type ExistingApplication = Pick<
  JoinApplication,
  'id' | 'applicantName' | 'status' | 'reviewNote' | 'createdAt'
>;

export default function AboutPage() {
  const router = useRouter();
  const t = useTranslations('about');
  const tJoin = useTranslations('join');
  const [activeTab, setActiveTab] = useState<AboutTab>('belief');

  const aboutTabs: CapsuleTab[] = [
    { key: 'belief', num: '01', label: t('tabBelief') },
    { key: 'directions', num: '02', label: t('tabDirections') },
    { key: 'process', num: '03', label: t('tabProcess') },
  ];

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  // ─────────────────────────────────────────────────────────────
  // 报名表逻辑（合并自原 /join）
  // ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<{ applications?: ExistingApplication[] }>('/api/join/mine'),
      apiRequest<{ user: { displayName?: string; techTags?: string[] } }>('/api/profile'),
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
  }, [router]);

  const pendingApp = existingApps.find((a) => a.status === 'pending');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.applicantName.trim()) e.applicantName = tJoin('nameRequired');
    if (!form.studentId.trim()) e.studentId = tJoin('studentIdRequired');
    if (!form.major.trim()) e.major = tJoin('majorRequired');
    if (!form.reason.trim()) e.reason = tJoin('reasonRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const r = await apiRequest('/api/join', {
        method: 'POST',
        body: {
          applicantName: form.applicantName.trim(),
          studentId: form.studentId.trim(),
          major: form.major.trim(),
          techTags: form.techTags,
          reason: form.reason.trim(),
          contactQq: form.contactQq.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
        },
      });

      if (!r.ok) {
        setMessage({ type: 'error', text: r.error ?? tJoin('submitFailed') });
        return;
      }

      const data = r.data as { application?: ExistingApplication } | null;
      setMessage({
        type: 'success',
        text: loggedIn ? tJoin('submitSuccessLoggedIn') : tJoin('submitSuccessGuest'),
      });
      // 将新申请加入已有列表
      if (data?.application) {
        setExistingApps((prev) => [data.application!, ...prev]);
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
      setMessage({ type: 'error', text: tJoin('networkError') });
    } finally {
      setSubmitting(false);
    }
  };

  // 认证检查完成前的加载态
  if (!authChecked) {
    return (
      <main className="about-page relative pt-16 min-h-screen flex items-center justify-center">
        <div className="meta-mono text-[var(--muted-foreground)]">{tJoin('loading')}</div>
      </main>
    );
  }

  return (
    <VisibilityGate componentKey="about">
      <main className="about-page relative pt-16">
      {/* ============ Hero ============ */}
      <CollapsingHero
        index="00"
        label="About"
        hero={hero}
        pageKey="about"
        minHeight="70vh"
        capsule={{
          tabs: aboutTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as AboutTab),
        }}
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('heroTitle1')}${t('heroTitle2')}${t('heroTitle3')}`}
            subtitle={t('heroTitleEn')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle1')}
            <span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            {t('heroTitle3')}
          </Title>
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
              } animate-fade-up`}
            >
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">{t('heroDesc2')}</span>
              {t('heroDesc3')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Tab 区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            {activeTab === 'belief' && (
              <div>
                <Title level={2} className="mb-10 sm:mb-16"
                  echo={`${t('beliefTitle1')}${t('beliefTitle2')}${t('beliefTitle3')}`}>
                  {t('beliefTitle1')}<span className="text-[var(--primary)]">{t('beliefTitle2')}</span>{t('beliefTitle3')}
                </Title>
                {/* 全屏左右布局：左信念 / 右期望（lg 起对半分栏，右栏发丝竖线分隔） */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                  {/* 左栏：信念 */}
                  <div>
                    <div className="grid grid-cols-12 gap-0 mb-8 sm:mb-10">
                      <div className="col-span-12 md:col-span-2">
                        <SectionMarker>[ 01 ]</SectionMarker>
                      </div>
                      <div className="col-span-12 md:col-span-10">
                        <Title level={2} className="text-[clamp(22px,3.4vw,38px)] leading-[1.12]"
                          echo={t('beliefHeading')}>
                          {t('beliefHeading')}
                        </Title>
                      </div>
                    </div>
                    {/* 列表选项 A · 索引铁路：左像素编号 + 发丝铁路线 + 衬线标题 + 像素元数据行 */}
                    <ul className="idx-rail border-t border-[var(--border)]">
                      {BELIEFS.map((b) => (
                        <li key={b.num}>
                          <span className="idx">{'// '}{b.num}</span>
                          <div className="min-w-0">
                            <h3 className="idx-ttl">{t(b.titleKey as Parameters<typeof t>[0])}</h3>
                            <p className="mt-2 text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                              {t(b.descKey as Parameters<typeof t>[0])}
                            </p>
                            <div className="idx-mt"><span className="k">{b.tag}</span></div>
                          </div>
                          <span className="idx-arw" aria-hidden="true">→</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* 右栏：期望（lg 起加发丝竖线 + 左内边距分隔） */}
                  <div className="lg:pl-16 lg:border-l lg:border-[var(--border)]">
                    <div className="grid grid-cols-12 gap-0 mb-8 sm:mb-10">
                      <div className="col-span-12 md:col-span-2">
                        <SectionMarker>[ 02 ]</SectionMarker>
                      </div>
                      <div className="col-span-12 md:col-span-10">
                        <Title level={2} className="text-[clamp(22px,3.4vw,38px)] leading-[1.12]"
                          echo={t('expectationHeading')}>
                          {t('expectationHeading')}
                        </Title>
                      </div>
                    </div>
                    {/* 列表选项 A · 索引铁路：左像素编号 + 发丝铁路线 + 衬线标题 + 像素元数据行 */}
                    <ul className="idx-rail border-t border-[var(--border)]">
                      {REQUIREMENTS.map((req) => (
                        <li key={req.num}>
                          <span className="idx">{'// '}{req.num}</span>
                          <div className="min-w-0">
                            <h3 className="idx-ttl">{t(req.titleKey as Parameters<typeof t>[0])}</h3>
                            <p className="mt-2 text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                              {t(req.descKey as Parameters<typeof t>[0])}
                            </p>
                            <div className="idx-mt"><span className="k">{req.tag}</span></div>
                          </div>
                          <span className="idx-arw" aria-hidden="true">→</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

              {activeTab === 'directions' && (
                <div>
                  <Title level={2} className="mb-10 sm:mb-16"
                    echo={<>{t('directionsTitle1')}<br /><span>{t('directionsTitle2')}</span>{t('directionsTitle3')}</>}>
                    {t('directionsTitle1')}
                    <br />
                    <span className="text-[var(--primary)]">{t('directionsTitle2')}</span>{t('directionsTitle3')}
                  </Title>
                  <RevealItem>
                    <p className="mb-8 sm:mb-12 max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
                      {t('directionsDesc1')}
                      <span className="serif-italic text-[var(--foreground)]"> {t('directionsDesc2')}</span>
                    </p>
                  </RevealItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {DIRECTIONS.map((d) => (
                      <DnaCard
                        key={d.num}
                        corner={d.num}
                        className="group flex flex-col"
                      >
                        <h3 className="display-serif text-[17px] sm:text-[18px] text-[var(--foreground)] leading-[1.45] mb-3">
                          {t(d.nameKey as Parameters<typeof t>[0])}
                        </h3>
                        <div className="dna-meta">
                          <span className="dna-tag">{d.tag}</span>
                          <span className="dna-dim">{d.nameEn}</span>
                        </div>
                        <p className="text-[12px] sm:text-[13px] text-[var(--muted-foreground)] leading-[1.9] flex-1">
                          {t(d.descKey as Parameters<typeof t>[0])}
                        </p>
                        {d.stack.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {d.stack.map((s, i) => (
                              <span key={`${s}-${i}`} className="tag-badge text-[11px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </DnaCard>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'process' && (
                <div>
                  <Title level={2} className="mb-10 sm:mb-16"
                    echo={`${t('processTitle1')}${t('processTitle2')}。`}>
                    {t('processTitle1')}<span className="text-[var(--primary)]">{t('processTitle2')}</span>。
                  </Title>
                  {/* 子区块：加入流程（步骤）+ 报名表 — 合并原 /join 全量内容；全屏左右布局 */}
                  {/* 全屏左右布局：左步骤 / 右表单 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    {/* 左：加入流程（步骤） */}
                    <div className="lg:col-span-5">
                      {/* 加入流程 — 列表选项 B · DNA 行卡（来自 /join） */}
                      <div className="grid grid-cols-12 gap-0 mb-10 sm:mb-16">
                    <div className="col-span-12 md:col-span-2">
                      <SectionMarker>[ 02 ]</SectionMarker>
                    </div>
                    <div className="col-span-12 md:col-span-10">
                      <Title level={2} className="text-[clamp(24px,4vw,44px)] leading-[1.1]"
                        echo={`${t('processTitle1')}${t('processTitle2')}${t('processTitle3')}`}>
                        {t('processTitle1')}
                        <span className="text-[var(--primary)]">{t('processTitle2')}</span>
                        <span className="text-[var(--muted-foreground)]">{t('processTitle3')}</span>
                      </Title>
                      <p className="mt-4 max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
                        {t('processDesc')}
                      </p>
                    </div>
                  </div>
                  <ul className="lst-dna max-w-3xl">
                    {JOIN_STEPS.map((step, idx) => (
                      <li key={step.num}>
                        <span className="dna-corner" aria-hidden="true">{step.num}</span>
                        <div className="min-w-0">
                          <h3 className="dna-ttl">{t(step.titleKey as Parameters<typeof t>[0])}</h3>
                          <p className="mt-2 text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                            {t(step.descKey as Parameters<typeof t>[0])}
                          </p>
                          <div className="dna-mt">
                            <span className="k">{t('step', { current: idx + 1, total: JOIN_STEPS.length })}</span>
                            <span>{step.duration}</span>
                          </div>
                        </div>
                        <span className="dna-arw" aria-hidden="true">→</span>
                      </li>
                    ))}
                      </ul>
                    </div>
                    {/* 右：报名表 */}
                    <div className="lg:col-span-7">
                      {/* 报名表 — 来自 /join（含填写逻辑） */}
                      <div className="grid grid-cols-12 gap-0 mb-10 sm:mb-16">
                    <div className="col-span-12 md:col-span-2">
                      <SectionMarker>[ 01 ]</SectionMarker>
                    </div>
                    <div className="col-span-12 md:col-span-10">
                      <Title level={2} className="text-[clamp(24px,4vw,44px)] leading-[1.1]"
                        echo={`${tJoin('sectionTitle1')}${tJoin('sectionTitle2')}${tJoin('sectionTitleEn')}`}>
                        {tJoin('sectionTitle1')}
                        <span className="text-[var(--primary)]">{tJoin('sectionTitle2')}</span>
                        <span className="text-[var(--muted-foreground)]">{tJoin('sectionTitleEn')}</span>
                      </Title>
                    </div>
                  </div>

                  <div className="max-w-2xl">
                    {/* 已有待审核申请 — 显示状态卡片 */}
                    {pendingApp && message?.type !== 'success' ? (
                      <div className="p-6 border-l-2 border-amber-500/60 bg-amber-500/[0.04]">
                        <div className="meta-mono text-amber-500 mb-2">{tJoin('underReview')}</div>
                        <p className="text-[14px] text-[var(--foreground)] leading-relaxed mb-4">
                          {tJoin('pendingDesc', { date: formatDate(pendingApp.createdAt) })}
                        </p>
                        <Link
                          href="/profile?tab=join"
                          className="meta-mono text-[var(--primary)] underline-grow"
                        >
                          {tJoin('viewInProfile')}
                        </Link>
                      </div>
                    ) : message?.type === 'success' ? (
                      <div className="p-6 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04]">
                        <div className="meta-mono text-[var(--primary)] mb-2">{tJoin('submitted')}</div>
                        <p className="text-[14px] text-[var(--foreground)] leading-relaxed">{message.text}</p>
                        {loggedIn ? (
                          <Link
                            href="/profile?tab=join"
                            className="mt-4 inline-block meta-mono text-[var(--primary)] underline-grow"
                          >
                            {tJoin('viewStatusInProfile')}
                          </Link>
                        ) : (
                          <Link
                            href="/register"
                            className="mt-4 inline-block meta-mono text-[var(--primary)] underline-grow"
                          >
                            {tJoin('register')}
                          </Link>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-8">
                        {/* 姓名 */}
                        <div>
                          <label htmlFor="applicantName" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                            [ 01 ] {tJoin('name')} *
                          </label>
                          <input
                            id="applicantName"
                            type="text"
                            value={form.applicantName}
                            onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                            maxLength={20}
                            className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                            placeholder={tJoin('namePlaceholder')}
                          />
                          {errors.applicantName && (
                            <div className="meta-mono text-[var(--destructive)] mt-1">{errors.applicantName}</div>
                          )}
                        </div>

                        {/* 学号 */}
                        <div>
                          <label htmlFor="studentId" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                            [ 02 ] {tJoin('studentId')} *
                          </label>
                          <input
                            id="studentId"
                            type="text"
                            value={form.studentId}
                            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                            maxLength={20}
                            className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                            placeholder={tJoin('studentIdPlaceholder')}
                          />
                          {errors.studentId && (
                            <div className="meta-mono text-[var(--destructive)] mt-1">{errors.studentId}</div>
                          )}
                        </div>

                        {/* 专业 */}
                        <div>
                          <label htmlFor="major" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                            [ 03 ] {tJoin('major')} *
                          </label>
                          <input
                            id="major"
                            type="text"
                            value={form.major}
                            onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                            maxLength={40}
                            className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                            placeholder={tJoin('majorPlaceholder')}
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
                            <span>[ 04 ] {tJoin('reason')} *</span>
                            <span>{form.reason.length}/500</span>
                          </label>
                          <textarea
                            id="reason"
                            value={form.reason}
                            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value.slice(0, 500) }))}
                            maxLength={500}
                            rows={4}
                            className={`${INPUT_CLASS} px-4 py-3 text-[14px] resize-none`}
                            placeholder={tJoin('reasonPlaceholder')}
                          />
                          {errors.reason && (
                            <div className="meta-mono text-[var(--destructive)] mt-1">{errors.reason}</div>
                          )}
                        </div>

                        {/* 联系方式 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="contactQq" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                              [ 05 ] {tJoin('qq')}
                            </label>
                            <input
                              id="contactQq"
                              type="text"
                              value={form.contactQq}
                              onChange={(e) => setForm((f) => ({ ...f, contactQq: e.target.value }))}
                              maxLength={20}
                              className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                              placeholder={tJoin('optional')}
                            />
                          </div>
                          <div>
                            <label htmlFor="contactPhone" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                              [ 06 ] {tJoin('phone')}
                            </label>
                            <input
                              id="contactPhone"
                              type="text"
                              value={form.contactPhone}
                              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                              maxLength={20}
                              className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                              placeholder={tJoin('optional')}
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
                            variant="pixel"
                            disabled={submitting}
                          >
                            {submitting ? tJoin('submitting') : tJoin('submit')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                  </div>
                  </div>
                </div>
              )}

            </div>
        </div>
      </section>
    </main>
    </VisibilityGate>
  );
}
