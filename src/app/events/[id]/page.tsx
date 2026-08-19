/**
 * @file 活动详情页（/events/[id]）— 信息分层展开 + 报名/取消报名
 */
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, SectionLoading, SectionMarker, Title } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { isPastDate } from '@/shared/utils/event-date';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MarkdownRenderer } from '@/modules/community/ui/community-markdown-renderer';
import { EventStatusBadge } from '@/modules/events/ui/event-status-badge';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 容量为 0 表示不限名额（数据库无 NULL 容量，以 0 代表不限制） */
const UNLIMITED_CAPACITY = 0;

/** 复选框勾选在 formData 中以字符串 'true' 存储（表单字段统一为字符串） */
const CHECKBOX_CHECKED_VALUE = 'true';

interface RegistrationField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

interface EventDetail {
  id: string;
  month: string | null;
  date: string | null;
  title: string;
  description: string | null;
  status: 'upcoming' | 'ongoing' | 'ended' | null;
  year: string | null;
  topics: string[];
  tags: string[];
  capacity: number;
  contentMarkdown: string | null;
  registrationFields: RegistrationField[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('events');
  const eventId = params.id;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Hero 折叠状态（滚动时收缩为顶部悬浮条）
  const { collapsed: heroCollapsed, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible: false,
    onRevealComplete,
    onTitleClick,
  };

  const fetchEvent = useCallback(async () => {
    const r = await apiRequest<{ event: EventDetail; registeredCount: number }>(`/api/events/${eventId}`);
    if (!r.ok) {
      if (r.status === 404) throw new Error('活动不存在');
      throw new Error(r.error ?? '加载失败');
    }
    const data = r.data;
    return { event: data!.event, registeredCount: data!.registeredCount };
  }, [eventId]);

  const fetchRegistration = useCallback(async () => {
    const r = await apiRequest<{ registration: { status?: string } | null }>(
      `/api/events/${eventId}/registration`,
    );
    if (!r.ok) {
      throw new Error(r.error ?? t('regStateFailed'));
    }
    // BFF 将后端 404（无报名记录）归一为 registration: null；
    // status === 'cancelled' 视为未报名（可重新报名）
    const reg = r.data?.registration ?? null;
    return {
      registered: reg?.status === 'registered',
      isLoggedIn: true,
    };
  }, [eventId, t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchEvent(), fetchRegistration().catch(() => null)])
      .then(([eventData, regData]) => {
        if (cancelled) return;
        setEvent(eventData.event);
        setRegisteredCount(eventData.registeredCount);
        if (regData) {
          setRegistered(regData.registered);
          setIsLoggedIn(regData.isLoggedIn);
        } else {
          setIsLoggedIn(false);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || '加载失败，请稍后再试');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchEvent, fetchRegistration]);

  const isFull = event ? event.capacity !== UNLIMITED_CAPACITY && registeredCount >= event.capacity : false;
  const isEnded = event?.status === 'ended';
  /** 报名是否已截止：状态已结束，或活动日期已过（同日/未排期不算过期，与后端归档语义一致）。
   *  已报名用户仍可取消报名（后端取消接口不做结束校验）。 */
  const isExpired = isEnded || isPastDate(event?.date ?? null);

  const handleRegister = useCallback(async () => {
    if (!event) return;
    if (isExpired) return; // 过期活动不予报名（UI 已置灰，此处兜底）

    const fields = event.registrationFields || [];
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && (!formData[field.key] || !formData[field.key].trim())) {
        errors[field.key] = `${field.label} 为必填项`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setActionLoading(true);
    setActionError(null);

    try {
      const r = await apiRequest(`/api/events/${eventId}/register`, {
        method: 'POST',
        body: { formData },
      });

      if (!r.ok) {
        // 后端对已结束活动返回 409 EVENT_ENDED：同步本地状态为 ended，报名入口立即置灰
        if (r.status === 409 && r.code === 'EVENT_ENDED') {
          setEvent((prev) => (prev ? { ...prev, status: 'ended' } : prev));
        }
        throw new Error(r.error ?? t('registerFailed'));
      }

      setRegistered(true);
      setRegisteredCount((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('registerFailed'));
    } finally {
      setActionLoading(false);
    }
  }, [eventId, event, formData, isExpired, t]);

  const handleCancel = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const r = await apiRequest(`/api/events/${eventId}/register`, {
        method: 'DELETE',
      });

      if (!r.ok) {
        throw new Error(r.error ?? t('cancelFailed'));
      }

      setRegistered(false);
      setRegisteredCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('cancelFailed'));
    } finally {
      setActionLoading(false);
    }
  }, [eventId, t]);

  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center pixel-page">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center pixel-page">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error || t('notFound')}</div>
          <Link
            href="/events"
            className="meta-mono text-[var(--primary)] underline-grow inline-block"
          >
            ← {t('backToList')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16 pixel-page">
      <CollapsingHero
        index="01"
        label="Event"
        hero={hero}
        maxWidth="1200px"
        sidebarBottom={
          <Link
            href="/events"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            ← {t('back')}
          </Link>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(32px,7vw,72px)] leading-[1.05]"
            echo={`${event.title} / Event`}
            subtitle="/ Event"
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {event.title}
          </Title>
        </RevealTitle>
        <div
          className={`overflow-hidden transition-all hero-reveal ${
            hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
          }`}
        >
          <RevealItem>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 meta-mono text-[var(--muted-foreground)]">
              {event.date && <span>{event.date}</span>}
              <EventStatusBadge status={event.status} />
              {event.createdBy && <span>发布人：{event.createdBy}</span>}
            </div>
          </RevealItem>
        </div>
      </CollapsingHero>

      <article className="px-4 sm:px-6 md:px-8 py-12 sm:py-16">
        <div className="max-w-[1200px] mx-auto">
            {/* 分隔线 */}
            <RevealItem>
              <div className="h-px bg-[var(--border)] mb-12 sm:mb-16" />
            </RevealItem>

            {/* 活动信息栏（3 列 grid） */}
            <RevealItem>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-12 sm:mb-16 border border-[var(--border)]">
                <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-[var(--border)]">
                  <div className="meta-mono mb-3">Date</div>
                  <div className="display-serif text-xl text-[var(--foreground)]">
                    {event.date || event.month || event.year || '—'}
                  </div>
                </div>
                <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-[var(--border)]">
                  <div className="meta-mono mb-3">Registration</div>
                  <div className="display-serif text-xl text-[var(--foreground)]">
                    {registeredCount}
                    <span className="text-[var(--muted-foreground)] text-base">
                      {' / '}
                      {event.capacity === UNLIMITED_CAPACITY ? '不限' : event.capacity}
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="meta-mono mb-3">Status</div>
                  <div className="display-serif text-xl">
                    <EventStatusBadge status={event.status} withDot={false} className="!px-3 !py-1.5 !text-xs" />
                  </div>
                </div>
              </section>
            </RevealItem>

            {/* 活动简介 */}
            {event.description && (
              <RevealItem>
                <section className="mb-12 sm:mb-16">
                  <SectionMarker className="mb-4">Overview</SectionMarker>
                  <p className="display-serif text-[clamp(20px,3vw,28px)] text-[var(--foreground)] leading-[1.6] max-w-3xl">
                    {event.description}
                  </p>
                </section>
              </RevealItem>
            )}

            {/* 标签和主题 */}
            {(event.tags.length > 0 || event.topics.length > 0) && (
              <RevealItem>
                <section className="mb-12 sm:mb-16 flex flex-wrap gap-3">
                  {[...new Set([...event.topics, ...event.tags])].map((t, i) => (
                    <span key={`${t}-${i}`} className="tag-badge">
                      {t}
                    </span>
                  ))}
                </section>
              </RevealItem>
            )}

            {/* 活动详情内容 */}
            <RevealItem>
              <section className="mb-12 sm:mb-16">
                <SectionMarker className="mb-6">Details</SectionMarker>
                {event.contentMarkdown ? (
                  <div className="prose-ark max-w-none">
                    <MarkdownRenderer content={event.contentMarkdown} />
                  </div>
                ) : (
                  <div className="meta-mono text-[var(--muted-foreground)] py-8">
                    {t('detailEmpty')}
                  </div>
                )}
              </section>
            </RevealItem>

            {/* 报名区（过期活动保留区块并置灰按钮，提示报名已结束） */}
            <RevealItem>
              <section className="border-t border-[var(--border)] pt-12 sm:pt-16">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                  <div>
                    <div className="display-serif text-2xl text-[var(--foreground)] mb-2">
                      {t('participateTitle')}
                    </div>
                    <div className="meta-mono text-[var(--muted-foreground)]">
                      {registered
                        ? t('registeredMsg')
                        : isExpired
                          ? t('eventExpired')
                          : isFull
                            ? t('fullMsg')
                            : t('clickToRegister')}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:min-w-[320px]">
                    {!isExpired && !registered && event.registrationFields && event.registrationFields.length > 0 && (
                      <div className="space-y-4 p-5 border border-[var(--border)]">
                        <div className="meta-mono text-[var(--muted-foreground)]">{t('regInfo')}</div>
                        {event.registrationFields.map((field) => (
                          <div key={field.key}>
                            {field.type === 'textarea' ? (
                              <textarea
                                value={formData[field.key] || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                placeholder={field.required ? `${field.label} *` : field.label}
                                rows={3}
                                className={`${INPUT_CLASS} px-3 py-2 text-[14px]`}
                              />
                            ) : field.type === 'select' ? (
                              <select
                                value={formData[field.key] || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                className={`${INPUT_CLASS} px-3 py-2 text-[14px]`}
                              >
                                <option value="" disabled>
                                  {field.required ? `${field.label} *` : field.label}
                                </option>
                                {(field.options || []).map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                checked={formData[field.key] === CHECKBOX_CHECKED_VALUE}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.checked ? CHECKBOX_CHECKED_VALUE : '',
                                  }))
                                }
                                  className="w-4 h-4 border border-[var(--border)] bg-transparent accent-[var(--primary)] focus-amber"
                                />
                                <span className="text-[14px] font-mono text-[var(--muted-foreground)]">
                                  {field.label}
                                  {field.required && ' *'}
                                </span>
                              </label>
                            ) : (
                              <input
                                type="text"
                                value={formData[field.key] || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                placeholder={field.required ? `${field.label} *` : field.label}
                                className={`${INPUT_CLASS} px-3 py-2 text-[14px]`}
                              />
                            )}
                            {formErrors[field.key] && (
                              <div className="meta-mono text-[var(--destructive)] mt-1">{formErrors[field.key]}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {actionError && (
                      <div className="meta-mono text-[var(--destructive)] text-right">
                        {actionError}
                      </div>
                    )}

                    {registered ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="outline" disabled className="opacity-30 cursor-not-allowed pointer-events-none">
                          <span>{t('registered')}</span>
                          <span>✓</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          disabled={actionLoading}
                          className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]"
                        >
                          {actionLoading ? t('processing') : t('cancelReg')}
                        </Button>
                      </div>
                    ) : isExpired ? (
                      <Button variant="outline" disabled className="opacity-30 cursor-not-allowed pointer-events-none">
                        <span>{t('eventExpired')}</span>
                      </Button>
                    ) : isLoggedIn === false ? (
                      <Button variant="pixel" onClick={() => router.push('/login')}>
                        <span>{t('loginToRegister')}</span>
                        <span>→</span>
                      </Button>
                    ) : isFull ? (
                      <Button variant="outline" disabled className="opacity-30 cursor-not-allowed pointer-events-none">
                        <span>{t('full')}</span>
                      </Button>
                    ) : (
                      <Button
                        variant="pixel"
                        onClick={handleRegister}
                        disabled={actionLoading}
                      >
                        <span>{actionLoading ? t('processing') : t('registerNow')}</span>
                        <span>→</span>
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            </RevealItem>
        </div>
      </article>

    </main>
  );
}
