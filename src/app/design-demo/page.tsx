/**
 * @file 前端统一设计 Demo — 以静态数据验证 Hub 页面模板、组件语义与响应式布局
 */
'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Command,
  MessageSquareText,
  Sparkles,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, DnaCard } from '@/components';

const METRICS = [
  { label: '今日待办', value: '03', detail: '1 项即将到期' },
  { label: '本周活动', value: '02', detail: '下一场 / 周六 14:00' },
  { label: '社区动态', value: '18', detail: '4 条与你相关' },
] as const;

const QUICK_ACTIONS = [
  {
    title: '学习工作台',
    en: 'Study Workspace',
    description: '继续今日任务、番茄钟与复习计划。',
    icon: Command,
    href: '/tools',
    badge: '常用',
  },
  {
    title: '资源中心',
    en: 'Resource Library',
    description: '课程资料、技术分享与成员推荐。',
    icon: BookOpen,
    href: '/tools/resource',
    badge: '126',
  },
  {
    title: '开发中心',
    en: 'Dev Center',
    description: '查看项目、接口与协作中的任务。',
    icon: Code2,
    href: '/tools/dev-center',
    badge: 'Beta',
  },
] as const;

const FEED = [
  {
    type: '活动',
    title: '开源项目协作夜：从 Issue 到 Pull Request',
    meta: '08.22 / 19:00 / 实验楼 404',
    status: '报名中',
  },
  {
    type: '社区',
    title: '如何为协会项目设计一套可维护的前端主题？',
    meta: '设计与前端 / 12 条回复 / 2 小时前',
    status: '讨论中',
  },
  {
    type: '通知',
    title: '2026 秋季项目组方向确认与成员登记',
    meta: '截止 08.25 / 面向全体成员',
    status: '待确认',
  },
] as const;

const SCHEDULE = [
  { time: '09:30', title: '完成算法训练', tag: 'TASK', done: true },
  { time: '14:00', title: '设计评审 · 前端统一方案', tag: 'MEET', done: false },
  { time: '19:00', title: '项目组周会', tag: 'TEAM', done: false },
] as const;

type DemoView = 'overview' | 'activity';

export default function DesignDemoPage() {
  const [view, setView] = useState<DemoView>('overview');

  return (
    <main className="pixel-page min-h-screen bg-[var(--background)] pt-16">
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 md:px-8 md:py-10">
          <div className="grid grid-cols-12 gap-y-8 md:gap-x-8">
            <div className="col-span-12 md:col-span-8 xl:col-span-9">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="section-marker">[ 00 ] — Member Hub</span>
                <Badge variant="primary">Design Demo</Badge>
              </div>
              <h1 className="display-serif max-w-4xl text-[clamp(38px,6vw,82px)] leading-[0.98] text-[var(--foreground)]">
                下午好，继续把
                <span className="text-[var(--primary)]">想法</span>
                <br className="hidden sm:block" />
                变成可以运行的作品。
              </h1>
            </div>

            <div className="col-span-12 flex flex-col justify-end border-t border-[var(--border)] pt-5 md:col-span-4 md:border-l md:border-t-0 md:pl-8 md:pt-0 xl:col-span-3">
              <div className="meta-mono mb-3 text-[var(--primary)]">{'// Next action'}</div>
              <p className="mb-6 text-sm leading-7 text-[var(--muted-foreground)]">
                你有一项设计评审将在 2 小时后开始。先整理 Demo 的页面结构与评审问题。
              </p>
              <Link href="#workspace" className="btn-pixel w-full justify-between focus-ring">
                打开今日工作台 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center">
            {(['overview', 'activity'] as const).map((item, index) => {
              const active = view === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={`min-h-12 border-b px-4 text-left font-mono text-[11px] uppercase tracking-[0.12em] transition-colors sm:px-6 ${
                    active
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  0{index + 1} / {item === 'overview' ? '总览' : '动态'}
                </button>
              );
            })}
          </div>
          <div className="meta-mono hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 bg-emerald-500" /> 系统正常
          </div>
        </div>
      </div>

      <section id="workspace" className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
        {view === 'overview' ? <Overview /> : <ActivityView />}
      </section>
    </main>
  );
}

function Overview() {
  return (
    <div className="grid grid-cols-12 gap-6 lg:gap-8">
      <div className="col-span-12 space-y-12 lg:col-span-8 xl:col-span-9">
        <section aria-labelledby="status-title">
          <div className="mb-5 flex items-end justify-between border-b border-[var(--border)] pb-4">
            <div>
              <div className="section-marker mb-2">[ 01 ] — Status</div>
              <h2 id="status-title" className="display-serif text-3xl text-[var(--foreground)] sm:text-4xl">
                今日概览
              </h2>
            </div>
            <span className="meta-mono hidden sm:block">2026.08.20 / Thursday</span>
          </div>
          <div className="grid grid-cols-1 border-l border-t border-[var(--border)] sm:grid-cols-3">
            {METRICS.map((metric) => (
              <div key={metric.label} className="border-b border-r border-[var(--border)] p-5 sm:p-6">
                <div className="meta-mono mb-5">{metric.label}</div>
                <div className="display-serif mb-2 text-5xl text-[var(--foreground)]">{metric.value}</div>
                <p className="text-xs text-[var(--muted-foreground)]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="quick-title">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="section-marker mb-2">[ 02 ] — Quick access</div>
              <h2 id="quick-title" className="display-serif text-3xl text-[var(--foreground)] sm:text-4xl">
                快速开始
              </h2>
            </div>
            <Link href="/tools" className="ark-link meta-mono hidden text-[var(--foreground)] sm:inline-block">
              查看全部工具
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {QUICK_ACTIONS.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className="group block h-full focus-ring">
                  <DnaCard corner={index + 1} className="h-full min-h-[220px]">
                    <div className="flex h-full flex-col">
                      <div className="mb-10 flex items-center justify-between pr-8">
                        <Icon className="h-5 w-5 text-[var(--primary)]" />
                        <Badge variant={index === 0 ? 'primary' : 'muted'}>{action.badge}</Badge>
                      </div>
                      <h3 className="display-serif mb-1 text-2xl text-[var(--foreground)]">{action.title}</h3>
                      <div className="meta-mono mb-4">{action.en}</div>
                      <p className="mb-6 text-sm leading-6 text-[var(--muted-foreground)]">{action.description}</p>
                      <span className="meta-mono mt-auto flex items-center gap-2 text-[var(--foreground)] group-hover:text-[var(--primary)]">
                        进入模块 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </DnaCard>
                </Link>
              );
            })}
          </div>
        </section>

        <FeedSection />
      </div>

      <aside className="col-span-12 space-y-6 lg:col-span-4 xl:col-span-3">
        <TodayPanel />
        <CommunityPanel />
      </aside>
    </div>
  );
}

function ActivityView() {
  return (
    <div className="grid grid-cols-12 gap-6 lg:gap-8">
      <div className="col-span-12 lg:col-span-9">
        <div className="mb-8 max-w-3xl">
          <div className="section-marker mb-3">[ 02 ] — Activity stream</div>
          <h2 className="display-serif text-[clamp(32px,5vw,56px)] text-[var(--foreground)]">协会动态</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
            动态页采用统一内容行，而非让每条内容都成为强调卡片；类型、标题、时间与状态在相同位置出现。
          </p>
        </div>
        <FeedSection showHeader={false} />
      </div>
      <aside className="col-span-12 lg:col-span-3">
        <DnaCard corner="// FILTER">
          <div className="meta-mono mb-5 text-[var(--primary)]">内容范围</div>
          <div className="space-y-1">
            {['全部动态', '活动', '社区讨论', '通知'].map((item, index) => (
              <button
                key={item}
                type="button"
                className={`flex min-h-11 w-full items-center justify-between border-b border-[var(--border)] text-left text-sm ${
                  index === 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {item} <span className="meta-mono">0{index + 1}</span>
              </button>
            ))}
          </div>
        </DnaCard>
      </aside>
    </div>
  );
}

function FeedSection({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section aria-labelledby="feed-title">
      {showHeader && (
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="section-marker mb-2">[ 03 ] — Updates</div>
            <h2 id="feed-title" className="display-serif text-3xl text-[var(--foreground)] sm:text-4xl">最新动态</h2>
          </div>
          <Button variant="outline" size="sm">全部已读</Button>
        </div>
      )}
      <div className="border-t border-[var(--border)]">
        {FEED.map((item, index) => (
          <button
            key={item.title}
            type="button"
            className="group grid min-h-[118px] w-full grid-cols-12 items-center gap-y-4 border-b border-[var(--border)] py-5 text-left transition-colors hover:bg-[var(--hover-overlay)] sm:gap-x-5 sm:py-6"
          >
            <div className="col-span-3 sm:col-span-2">
              <span className="meta-mono text-[var(--primary)]">0{index + 1} / {item.type}</span>
            </div>
            <div className="col-span-9 sm:col-span-7">
              <h3 className="mb-2 text-[15px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] sm:text-base">{item.title}</h3>
              <p className="text-xs text-[var(--muted-foreground)]">{item.meta}</p>
            </div>
            <div className="col-span-9 col-start-4 flex items-center justify-between sm:col-span-3 sm:col-start-auto">
              <Badge variant={index === 0 ? 'success' : index === 1 ? 'primary' : 'amber'}>{item.status}</Badge>
              <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function TodayPanel() {
  return (
    <section className="border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <div className="meta-mono mb-1 text-[var(--primary)]">{'// Today'}</div>
          <h2 className="display-serif text-2xl text-[var(--foreground)]">日程</h2>
        </div>
        <CalendarDays className="h-5 w-5 text-[var(--muted-foreground)]" />
      </div>
      <div className="space-y-5">
        {SCHEDULE.map((item) => (
          <div key={item.time} className="grid grid-cols-[48px_1fr] gap-3">
            <span className="meta-mono pt-0.5 text-[var(--foreground)]">{item.time}</span>
            <div className="border-l border-[var(--border)] pl-4">
              <div className="mb-1 flex items-start gap-2">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                )}
                <p className={`text-sm leading-5 ${item.done ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}`}>{item.title}</p>
              </div>
              <span className="meta-mono pl-6">{item.tag}</span>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="meta-mono mt-7 flex min-h-11 w-full items-center justify-between border-t border-[var(--border)] pt-4 text-[var(--foreground)] hover:text-[var(--primary)]">
        管理日程 <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function CommunityPanel() {
  return (
    <DnaCard corner="// LIVE">
      <div className="mb-6 flex items-center justify-between">
        <Sparkles className="h-5 w-5 text-[var(--primary)]" />
        <Badge variant="success">Online 42</Badge>
      </div>
      <h2 className="display-serif mb-2 text-2xl text-[var(--foreground)]">社区正在发生</h2>
      <p className="mb-6 text-sm leading-6 text-[var(--muted-foreground)]">前端组正在讨论组件边界，算法组刚发布了本周训练题。</p>
      <div className="grid grid-cols-2 gap-3 border-y border-[var(--border)] py-4">
        <div>
          <Users className="mb-2 h-4 w-4 text-[var(--primary)]" />
          <div className="meta-mono">12 位成员活跃</div>
        </div>
        <div>
          <MessageSquareText className="mb-2 h-4 w-4 text-[var(--primary)]" />
          <div className="meta-mono">08 条新回复</div>
        </div>
      </div>
      <Link href="/community" className="meta-mono mt-5 flex min-h-11 items-center justify-between text-[var(--foreground)] hover:text-[var(--primary)]">
        进入社区 <ArrowRight className="h-4 w-4" />
      </Link>
    </DnaCard>
  );
}
