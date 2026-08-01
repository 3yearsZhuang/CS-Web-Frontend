/**
 * @file 活动详情页（/events/[id]）— 信息分层展开 + 报名/取消报名
 */
'use client';

import Link from 'next/link';
import { Button, SectionLoading } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MarkdownRenderer } from '@/modules/community/ui/forum-markdown-renderer';

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
    const res = await fetch(`/api/events/${eventId}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('活动不存在');
      throw new Error('加载失败');
    }
    const data = await res.json();
    return { event: data.event as EventDetail, registeredCount: data.registeredCount as number };
  }, [eventId]);

  const fetchRegistration = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/registration`);
    if (res.status === 401) {
      return { registered: false, isLoggedIn: false };
    }
    if (!res.ok) {
      throw new Error('加载报名状态失败');
    }
    const data = await res.json();
    return {
      registered: data.registered as boolean,
      isLoggedIn: true,
    };
  }, [eventId]);

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

  const handleRegister = useCallback(async () => {
    if (!event) return;

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
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '报名失败');
      }

      setRegistered(true);
      setRegisteredCount((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '报名失败，请稍后再试');
    } finally {
      setActionLoading(false);
    }
  }, [eventId, event, formData]);

  const handleCancel = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '取消报名失败');
      }

      setRegistered(false);
      setRegisteredCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '取消失败，请稍后再试');
    } finally {
      setActionLoading(false);
    }
  }, [eventId]);

  const isFull = event ? event.capacity > 0 && registeredCount >= event.capacity : false;
  const isEnded = event?.status === 'ended';

  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error || '活动不存在'}</div>
          <Link
            href="/events"
            className="meta-mono text-[var(--primary)] underline-grow inline-block"
          >
            ← 返回活动列表
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16">
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
            ← 返回
          </Link>
        }
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(32px,7vw,72px)] leading-[1.05]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {event.title}
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Event
            </span>
          </h1>
        </RevealTitle>
        <div
          className={`overflow-hidden transition-all hero-reveal ${
            hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
          }`}
        >
          <RevealItem>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 meta-mono text-[var(--muted-foreground)]">
              {event.date && <span>{event.date}</span>}
              {event.status && (
                <span
                  className={
                    event.status === 'upcoming' || event.status === 'ongoing'
                      ? 'text-[var(--primary)]'
                      : ''
                  }
                >
                  {event.status === 'upcoming' && '○ Upcoming'}
                  {event.status === 'ongoing' && '● Ongoing'}
                  {event.status === 'ended' && '— Ended'}
                </span>
              )}
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
                      {event.capacity === 0 ? '不限' : event.capacity}
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="meta-mono mb-3">Status</div>
                  <div
                    className={`display-serif text-xl ${
                      event.status === 'upcoming' || event.status === 'ongoing'
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--foreground)]'
                    }`}
                  >
                    {event.status === 'upcoming' && '即将开始'}
                    {event.status === 'ongoing' && '进行中'}
                    {event.status === 'ended' && '已结束'}
                    {!event.status && '—'}
                  </div>
                </div>
              </section>
            </RevealItem>

            {/* 活动简介 */}
            {event.description && (
              <RevealItem>
                <section className="mb-12 sm:mb-16">
                  <div className="section-marker mb-4">Overview</div>
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
                  {event.topics.map((t) => (
                    <span key={t} className="tag-badge">
                      {t}
                    </span>
                  ))}
                  {event.tags.map((t) => (
                    <span key={t} className="tag-badge">
                      {t}
                    </span>
                  ))}
                </section>
              </RevealItem>
            )}

            {/* 活动详情内容 */}
            <RevealItem>
              <section className="mb-12 sm:mb-16">
                <div className="section-marker mb-6">Details</div>
                {event.contentMarkdown ? (
                  <div className="prose-ark max-w-none">
                    <MarkdownRenderer content={event.contentMarkdown} />
                  </div>
                ) : (
                  <div className="meta-mono text-[var(--muted-foreground)] py-8">
                    活动详情待补充
                  </div>
                )}
              </section>
            </RevealItem>

            {/* 报名区 */}
            {!isEnded && (
              <RevealItem>
                <section className="border-t border-[var(--border)] pt-12 sm:pt-16">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                    <div>
                      <div className="display-serif text-2xl text-[var(--foreground)] mb-2">
                        参与活动
                      </div>
                      <div className="meta-mono text-[var(--muted-foreground)]">
                        {isFull
                          ? '活动名额已满'
                          : registered
                            ? '你已成功报名本次活动'
                            : '点击按钮报名参与'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:min-w-[320px]">
                      {!registered && event.registrationFields && event.registrationFields.length > 0 && (
                        <div className="space-y-4 p-5 border border-[var(--border)]">
                          <div className="meta-mono text-[var(--muted-foreground)]">报名信息</div>
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
                                  className="w-full px-3 py-2 border border-[var(--border)] bg-transparent text-[14px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  value={formData[field.key] || ''}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-[var(--border)] bg-transparent text-[14px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
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
                                    checked={formData[field.key] === 'true'}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        [field.key]: e.target.checked ? 'true' : '',
                                      }))
                                    }
                                    className="w-4 h-4 border border-[var(--border)] bg-transparent accent-[var(--primary)]"
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
                                  className="w-full px-3 py-2 border border-[var(--border)] bg-transparent text-[14px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
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

                      {isLoggedIn === false ? (
                        <Button onClick={() => router.push('/login')}>
                          <span>登录后报名</span>
                          <span>→</span>
                        </Button>
                      ) : registered ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button variant="outline" disabled className="opacity-30 cursor-not-allowed pointer-events-none">
                            <span>已报名</span>
                            <span>✓</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]"
                          >
                            {actionLoading ? '处理中...' : '取消报名'}
                          </Button>
                        </div>
                      ) : isFull ? (
                        <Button variant="outline" disabled className="opacity-30 cursor-not-allowed pointer-events-none">
                          <span>报名已满</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={handleRegister}
                          disabled={actionLoading}
                        >
                          <span>{actionLoading ? '处理中...' : '立即报名'}</span>
                          <span>→</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </section>
              </RevealItem>
            )}
        </div>
      </article>

      <style jsx global>{`
        .prose-ark h1,
        .prose-ark h2,
        .prose-ark h3,
        .prose-ark h4,
        .prose-ark h5,
        .prose-ark h6 {
          font-family: var(--font-serif);
          font-weight: 350;
          color: var(--foreground);
          margin-top: 2em;
          margin-bottom: 0.8em;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .prose-ark h1 {
          font-size: clamp(24px, 4vw, 36px);
          margin-top: 0;
        }
        .prose-ark h2 {
          font-size: clamp(20px, 3vw, 28px);
          position: relative;
          padding-left: 1rem;
        }
        .prose-ark h2::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.4em;
          bottom: 0.4em;
          width: 2px;
          background: var(--primary);
        }
        .prose-ark h3 {
          font-size: clamp(18px, 2.5vw, 22px);
        }
        .prose-ark p {
          color: var(--foreground);
          line-height: 1.8;
          margin: 1em 0;
          font-size: 15px;
        }
        .prose-ark a {
          color: var(--primary);
          position: relative;
          transition: color 0.3s ease;
        }
        .prose-ark a::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -2px;
          height: 1px;
          background: var(--primary);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.5s var(--ease-ark);
        }
        .prose-ark a:hover::after {
          transform: scaleX(1);
          transform-origin: left;
        }
        .prose-ark strong {
          font-weight: 600;
          color: var(--foreground);
        }
        .prose-ark em {
          font-family: var(--font-serif);
          font-style: italic;
        }
        .prose-ark ul,
        .prose-ark ol {
          margin: 1em 0;
          padding-left: 1.5em;
          color: var(--foreground);
        }
        .prose-ark li {
          margin: 0.5em 0;
          line-height: 1.7;
        }
        .prose-ark ul li::marker {
          color: var(--primary);
        }
        .prose-ark ol li::marker {
          font-family: var(--font-mono);
          color: var(--primary);
        }
        .prose-ark blockquote {
          margin: 1.5em 0;
          padding: 1em 1.5em;
          border-left: 2px solid var(--primary);
          background: var(--muted);
          color: var(--foreground);
          font-family: var(--font-serif);
          font-style: italic;
        }
        .prose-ark code {
          font-family: var(--font-mono);
          font-size: 0.85em;
          background: var(--muted);
          padding: 0.2em 0.4em;
          color: var(--primary);
        }
        .prose-ark pre {
          margin: 1.5em 0;
          padding: 1.5em;
          background: var(--muted);
          border: 1px solid var(--border);
          overflow-x: auto;
        }
        .prose-ark pre code {
          background: transparent;
          padding: 0;
          color: var(--foreground);
          font-size: 13px;
          line-height: 1.6;
        }
        .prose-ark table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          font-size: 14px;
        }
        .prose-ark th,
        .prose-ark td {
          border: 1px solid var(--border);
          padding: 0.75em 1em;
          text-align: left;
        }
        .prose-ark th {
          background: var(--muted);
          font-family: var(--font-mono);
          font-weight: 500;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .prose-ark hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2em 0;
        }
        .prose-ark img {
          max-width: 100%;
          height: auto;
          margin: 1.5em 0;
        }
      `}</style>
    </main>
  );
}
