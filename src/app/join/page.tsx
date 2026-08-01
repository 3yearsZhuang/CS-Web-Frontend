/**
 * @file 入社申请页（/join）— 公开表单无需登录，客户端 + 服务端双重校验
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { TechTagSelector } from '@/components/tech-tag-selector';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useState } from 'react';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

const TECH_TAG_OPTIONS = [
  '前端', '后端', 'AI', '安全', '设计', '移动端', '运维', '数据科学', '嵌入式', '游戏开发',
];

export default function JoinPage() {
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

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

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.applicantName.trim()) e.applicantName = '姓名不能为空';
    if (!form.studentId.trim()) e.studentId = '学号不能为空';
    if (!form.major.trim()) e.major = '专业不能为空';
    if (!form.reason.trim()) e.reason = '申请理由不能为空';
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
        setMessage({ type: 'error', text: data.error || '提交失败，请稍后再试' });
        return;
      }

      setMessage({ type: 'success', text: '申请已提交，管理员审核后会通过你提供的联系方式通知你。' });
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
      setMessage({ type: 'error', text: '网络错误，请稍后再试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
            加入
            <span className="text-[var(--primary)]">我们</span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Join
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
              填写下方表单提交申请，管理员审核通过后
              <span className="serif-italic text-[var(--foreground)">与你联系</span>
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
                申请
                <span className="text-[var(--primary)]">表单</span>
                <span className="text-[var(--muted-foreground)]"> / Application</span>
              </h2>
            </div>
          </div>

          <div className="max-w-2xl">
            {message?.type === 'success' ? (
              <div className="p-6 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04]">
                <div className="meta-mono text-[var(--primary)] mb-2">[ 已提交 / Submitted ]</div>
                <p className="text-[14px] text-[var(--foreground)] leading-relaxed">{message.text}</p>
                <Link
                  href="/"
                  className="mt-4 inline-block meta-mono text-[var(--primary)] underline-grow"
                >
                  ← 返回首页
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 姓名 */}
                <div>
                  <label htmlFor="applicantName" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 01 ] 姓名 *
                  </label>
                  <input
                    id="applicantName"
                    type="text"
                    value={form.applicantName}
                    onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                    maxLength={20}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder="你的真实姓名"
                  />
                  {errors.applicantName && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.applicantName}</div>
                  )}
                </div>

                {/* 学号 */}
                <div>
                  <label htmlFor="studentId" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 02 ] 学号 *
                  </label>
                  <input
                    id="studentId"
                    type="text"
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                    maxLength={20}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder="你的学号"
                  />
                  {errors.studentId && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.studentId}</div>
                  )}
                </div>

                {/* 专业 */}
                <div>
                  <label htmlFor="major" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 03 ] 专业 *
                  </label>
                  <input
                    id="major"
                    type="text"
                    value={form.major}
                    onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                    maxLength={40}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                    placeholder="你的专业"
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
                    <span>[ 04 ] 申请理由 *</span>
                    <span>{form.reason.length}/500</span>
                  </label>
                  <textarea
                    id="reason"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value.slice(0, 500) }))}
                    maxLength={500}
                    rows={4}
                    className={`${INPUT_CLASS} px-4 py-3 text-[14px] resize-none`}
                    placeholder="为什么想加入协会？对什么技术方向感兴趣？"
                  />
                  {errors.reason && (
                    <div className="meta-mono text-[var(--destructive)] mt-1">{errors.reason}</div>
                  )}
                </div>

                {/* 联系方式 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactQq" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                      [ 05 ] QQ
                    </label>
                    <input
                      id="contactQq"
                      type="text"
                      value={form.contactQq}
                      onChange={(e) => setForm((f) => ({ ...f, contactQq: e.target.value }))}
                      maxLength={20}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder="选填"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactPhone" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                      [ 06 ] 手机号
                    </label>
                    <input
                      id="contactPhone"
                      type="text"
                      value={form.contactPhone}
                      onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                      maxLength={20}
                      className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                      placeholder="选填"
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
                  {submitting ? '提交中...' : '提交申请 →'}
                </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}