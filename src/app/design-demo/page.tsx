/**
 * @file 前端统一设计 Demo — 统一设计的活文档与验收基准（FrontDoc-05 Design Unification）
 *
 * 五个视图对应统一架构的三层 + 现状：
 *   01 总览  T-Hub 版式范式（问候 Hero / 指标条 / DnaCard / Feed / 侧栏）
 *   02 动态  T-List 版式范式（统一内容行信息流）
 *   03 令牌  Layer 0 可视化（颜色双主题 / 字号阶梯 / z-index·时长·缓动·圆角·阴影）
 *   04 组件  Layer 1 全覆盖（primitives 实景，全部可交互）
 *   05 审计  全站一致性现状与治理清单（数据来自设计漂移审计）
 *
 * 纯静态数据、零后端依赖；本页自身全量遵守 FrontDoc-UID §11/§12。
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
import { useTheme } from 'next-themes';
import {
  ArkDivider,
  Badge,
  Button,
  DnaCard,
  EmptyState,
  FilterBar,
  InlineTabs,
  Input,
  ModalShell,
  Pagination,
  SectionMarker,
  SkeletonCard,
  SkeletonLine,
  Spinner,
  Title,
} from '@/components';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { RollingNumber } from '@/components/primitives/rolling-number';

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

/** 视图编号配置 — 验收时按编号逐项核对 */
const VIEWS = [
  { key: 'overview', label: '总览' },
  { key: 'activity', label: '动态' },
  { key: 'tokens', label: '令牌' },
  { key: 'components', label: '组件' },
  { key: 'audit', label: '审计' },
] as const;

type DemoView = (typeof VIEWS)[number]['key'];

export default function DesignDemoPage() {
  const [view, setView] = useState<DemoView>('overview');

  return (
    <main className="pixel-page min-h-screen bg-[var(--background)] pt-16">
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 md:px-8 md:py-10">
          <div className="grid grid-cols-12 gap-y-8 md:gap-x-8">
            <div className="col-span-12 md:col-span-8 xl:col-span-9">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="section-marker">[ 00 ] — Design Unification</span>
                <Badge variant="primary">Acceptance Demo</Badge>
              </div>
              <h1 className="display-serif max-w-4xl text-[clamp(38px,6vw,82px)] leading-[0.98] text-[var(--foreground)]">
                下午好，继续把
                <span className="text-[var(--primary)]">想法</span>
                <br className="hidden sm:block" />
                变成可以运行的作品。
              </h1>
            </div>

            <div className="col-span-12 flex flex-col justify-end border-t border-[var(--border)] pt-5 md:col-span-4 md:border-l md:border-t-0 md:pl-8 md:pt-0 xl:col-span-3">
              <div className="meta-mono mb-3 text-[var(--primary)]">{'// How to review'}</div>
              <p className="mb-6 text-sm leading-7 text-[var(--muted-foreground)]">
                本页是「前端设计统一方案」的验收基准：01/02 为页面版式范式，03 为设计令牌，04 为组件原语实景，05 为全站一致性审计。
              </p>
              <Link href="#workspace" className="btn-pixel w-full justify-between focus-ring">
                开始逐项验收 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center overflow-x-auto">
            {VIEWS.map((item, index) => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={'min-h-12 shrink-0 border-b px-4 text-left font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-ring sm:px-6 ' + (active
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]')}
                >
                  0{index + 1} / {item.label}
                </button>
              );
            })}
          </div>
          <div className="meta-mono hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 bg-[var(--chart-3)]" /> 系统正常
          </div>
        </div>
      </div>

      <section id="workspace" className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
        {view === 'overview' && <Overview />}
        {view === 'activity' && <ActivityView />}
        {view === 'tokens' && <TokensView />}
        {view === 'components' && <ComponentsView />}
        {view === 'audit' && <AuditView />}
      </section>
    </main>
  );
}

/* ================================ 01 总览（T-Hub 版式范式） ================================ */

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

/* ================================ 02 动态（T-List 版式范式） ================================ */

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
                className={'flex min-h-11 w-full items-center justify-between border-b border-[var(--border)] text-left text-sm focus-ring ' + (index === 0
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]')}
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
            className="group grid min-h-[118px] w-full grid-cols-12 items-center gap-y-4 border-b border-[var(--border)] py-5 text-left transition-colors hover:bg-[var(--hover-overlay)] focus-ring sm:gap-x-5 sm:py-6"
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
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chart-3)]" />
                ) : (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                )}
                <p className={'text-sm leading-5 ' + (item.done ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]')}>{item.title}</p>
              </div>
              <span className="meta-mono pl-6">{item.tag}</span>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="meta-mono mt-7 flex min-h-11 w-full items-center justify-between border-t border-[var(--border)] pt-4 text-[var(--foreground)] hover:text-[var(--primary)] focus-ring">
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
      <Link href="/community" className="meta-mono mt-5 flex min-h-11 items-center justify-between text-[var(--foreground)] hover:text-[var(--primary)] focus-ring">
        进入社区 <ArrowRight className="h-4 w-4" />
      </Link>
    </DnaCard>
  );
}

/* ================================ 03 令牌（Layer 0 可视化） ================================ */

/** 核心颜色 token —— 数值与 globals.css / FrontDoc-UID §1.1 保持一致 */
const COLOR_TOKENS = [
  { name: '--primary', light: '#1e40af 深蓝', dark: '#d4a574 琥珀金', usage: '强调色：链接 / active / 章节标记 / focus 描边' },
  { name: '--background', light: '#fdf5f7 浅粉', dark: '#000000 纯黑', usage: '页面底色' },
  { name: '--foreground', light: '#1e1233 深黑紫', dark: '#f5f5f4 暖白', usage: '正文文字' },
  { name: '--muted-foreground', light: '#6b5572 紫灰', dark: '#8a8a85 中灰', usage: '次级文字 / 元数据' },
  { name: '--border', light: 'rgba(30,18,51,.08)', dark: 'rgba(255,255,255,.06)', usage: '1px 发丝线' },
  { name: '--card', light: '#ffffff', dark: '#0a0a0a', usage: '卡片背景' },
] as const;

const TYPE_SCALE = [
  { cls: 'display-serif text-[clamp(36px,9vw,120px)]', label: 'Hero 主标题（展开）', sample: '协会' },
  { cls: 'display-serif text-[clamp(28px,5vw,56px)]', label: '章节大标题', sample: '章节标题' },
  { cls: 'display-serif text-[clamp(18px,2.5vw,24px)]', label: '卡片 / 子标题', sample: '卡片标题' },
  { cls: 'text-[15px] leading-7', label: '正文 15px', sample: '正文使用 Manrope + Noto Sans SC，保持长文可读性。' },
  { cls: 'meta-mono', label: '元数据 meta-mono', sample: '[ 01 ] — SECTION / 2026.10.13' },
  { cls: 'font-mono text-[11px] uppercase tracking-[0.12em]', label: '像素元数据（.pixel-page 内）', sample: 'PIXEL META / 编号 01' },
] as const;

const MOTION_TOKENS = [
  { token: '--duration-fast', value: '200ms', usage: 'hover 过渡、微交互' },
  { token: '--duration-base', value: '300ms', usage: '标准过渡' },
  { token: '--duration-cinematic', value: '800ms', usage: 'Hero 折叠 / 焦点拉近' },
  { token: '--duration-epic', value: '1400ms', usage: '首页莫比乌斯环入场' },
  { token: '--ease-ark', value: 'cubic-bezier(0.16, 1, 0.3, 1)', usage: '全站统一缓动（慢出无弹跳）' },
] as const;

const Z_TOKENS = [
  ['--z-base', '10', '页面主要内容'],
  ['--z-sticky', '30', '粘性 hero-acrylic / section-nav / 悬浮胶囊'],
  ['--z-banner', '40', '公告横幅'],
  ['--z-header', '50', '顶部导航 / 下拉 / Modal'],
  ['--z-toast', '60', 'Toast'],
  ['--z-transition', '70', '页面过渡遮罩'],
  ['--z-overlay', '9998', '扫描线 / 噪点'],
] as const;

const SHAPE_TOKENS = [
  ['--radius', '0.25rem', '仅：输入框 / 行内代码 / 长文图片'],
  ['--radius-capsule', '28px', '悬浮胶囊容器'],
  ['--radius-capsule-item', '22px', '胶囊内 Tab 项'],
  ['rounded-full', '—', '仅：头像 / 状态点 / spinner / 徽章'],
  ['--shadow-popover', '0 4px 24px rgba(0,0,0,.04)', '下拉浮层 / hero-acrylic'],
  ['--shadow-modal', '0 8px 40px rgba(0,0,0,.08)', 'Modal / 抽屉'],
] as const;

function TokensView() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <SectionMarker className="mb-3">[ 03 ] — Design tokens</SectionMarker>
          <Title level={2} subtitle="Layer 0 / globals.css SSOT">设计令牌</Title>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
            全站颜色、字体、层级、时长、圆角与阴影的唯一来源。统一原则 P1/P2：颜色只走 CSS 变量，圆角与阴影只走白名单 token。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
          切换到{isDark ? '浅色' : '深色'}预览
        </Button>
      </div>

      <section aria-label="颜色令牌">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 01 Color — 6 核心 token（当前主题实时渲染）'}</h3>
        <div className="grid grid-cols-1 border-l border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_TOKENS.map((t) => (
            <div key={t.name} className="border-b border-r border-[var(--border)] p-5">
              <div className="mb-4 h-16 border border-[var(--border)]" style={{ background: 'var(' + t.name + ')' }} />
              <div className="mb-1 font-mono text-[13px] text-[var(--foreground)]">{t.name}</div>
              <div className="meta-mono mb-2">{t.light} / {t.dark}</div>
              <p className="text-xs text-[var(--muted-foreground)]">{t.usage}</p>
            </div>
          ))}
        </div>
        <p className="meta-mono mt-3 text-[var(--muted-foreground)]">
          + 语义 token：--destructive（危险）/ --chart-1..5（图表与状态色）/ --hover-overlay（悬停叠加）/ --grid-line（装饰网格）
        </p>
      </section>

      <section aria-label="字体阶梯">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 02 Type — 三字体栈 + clamp 阶梯'}</h3>
        <div className="border-t border-[var(--border)]">
          {TYPE_SCALE.map((t) => (
            <div key={t.label} className="grid grid-cols-12 items-baseline gap-4 border-b border-[var(--border)] py-5">
              <div className="col-span-12 md:col-span-3">
                <div className="meta-mono text-[var(--primary)]">{t.label}</div>
                <div className="meta-mono mt-1 break-all">{t.cls.split(' ')[0]}</div>
              </div>
              <div className={'col-span-12 text-[var(--foreground)] md:col-span-9 ' + t.cls}>{t.sample}</div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="动效令牌">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 03 Motion — 统一缓动（hover 右侧色块体验）'}</h3>
        <div className="border-t border-[var(--border)]">
          {MOTION_TOKENS.map((t) => (
            <div key={t.token} className="group grid grid-cols-12 items-center gap-4 border-b border-[var(--border)] py-4">
              <div className="col-span-6 font-mono text-[12px] text-[var(--foreground)] md:col-span-3">{t.token}</div>
              <div className="meta-mono col-span-6 md:col-span-3">{t.value}</div>
              <div className="col-span-9 text-xs text-[var(--muted-foreground)] md:col-span-4">{t.usage}</div>
              <div className="col-span-3 hidden md:col-span-2 md:block">
                <div className="h-1.5 w-6 bg-[var(--primary)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-ark)] group-hover:translate-x-10" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-label="层级令牌">
          <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 04 z-index — JSX 必须引用 var(--z-*)'}</h3>
          <div className="border-t border-[var(--border)]">
            {Z_TOKENS.map(([token, value, usage]) => (
              <div key={token} className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border)] py-3 text-sm">
                <span className="font-mono text-[12px] text-[var(--foreground)]">{token} <span className="meta-mono">= {value}</span></span>
                <span className="text-xs text-[var(--muted-foreground)]">{usage}</span>
              </div>
            ))}
          </div>
        </section>
        <section aria-label="圆角与阴影白名单">
          <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 05 Radius / Shadow — 白名单以外禁止使用'}</h3>
          <div className="border-t border-[var(--border)]">
            {SHAPE_TOKENS.map(([token, value, usage]) => (
              <div key={token} className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border)] py-3 text-sm">
                <span className="font-mono text-[12px] text-[var(--foreground)]">{token} <span className="meta-mono">{value}</span></span>
                <span className="text-xs text-[var(--muted-foreground)]">{usage}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ================================ 04 组件（Layer 1 原语实景） ================================ */

const BUTTON_VARIANTS = [
  ['primary', '主按钮 Primary'],
  ['outline', '描边 Outline'],
  ['primary-outline', '主色描边'],
  ['danger', '危险 Danger'],
  ['outline-danger', '描边危险'],
  ['ghost', '幽灵 Ghost'],
  ['amber', '状态 Amber'],
  ['pixel', '像素 Pixel'],
  ['pixel-outline', '像素描边'],
  ['pixel-danger', '像素危险'],
] as const;

function ComponentsView() {
  const [tab, setTab] = useState('latest');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(3);
  const [modalOpen, setModalOpen] = useState(false);
  const [counter, setCounter] = useState(42);
  const { confirm } = useConfirm();

  return (
    <div className="space-y-14">
      <div className="border-b border-[var(--border)] pb-6">
        <SectionMarker className="mb-3">[ 04 ] — Component primitives</SectionMarker>
        <Title level={2} subtitle="Layer 1 / components/primitives">组件原语</Title>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
          统一原则 P3：控件只用共享契约（btn-* / badge* / tab-* / Pagination / ModalShell），禁止手写漂移。以下全部组件可真实交互。
        </p>
      </div>

      <section aria-label="按钮">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 01 Button — 10 变体 × 3 尺寸（§5.2 选型矩阵）'}</h3>
        <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          {BUTTON_VARIANTS.map(([variant, label]) => (
            <div key={variant} className="flex min-h-[96px] flex-col items-start justify-center gap-2 bg-[var(--background)] p-4">
              <Button variant={variant} size="sm">{label}</Button>
              <span className="meta-mono">variant=&quot;{variant}&quot;</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md">中号 md</Button>
          <Button variant="primary" size="sm">小号 sm</Button>
          <Button variant="primary" size="xs">紧凑 xs</Button>
          <Button variant="primary" size="sm" active>active 态</Button>
          <Button variant="primary" size="sm" loading>loading 态</Button>
          <Button variant="outline" size="sm" disabled>disabled 态</Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-label="徽章">
          <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 02 Badge — 直角等宽 5 变体'}</h3>
          <div className="flex flex-wrap items-center gap-3 border border-[var(--border)] p-5">
            <Badge variant="muted">muted</Badge>
            <Badge variant="primary">primary</Badge>
            <Badge variant="success">success</Badge>
            <Badge variant="amber">amber</Badge>
            <Badge variant="danger">danger</Badge>
          </div>
        </section>

        <section aria-label="输入框">
          <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 03 Input — INPUT_CLASS 唯一权威'}</h3>
          <div className="space-y-3 border border-[var(--border)] p-5">
            <Input placeholder="标准输入框（focus 时边框转 primary）" />
            <Input placeholder="禁用态" disabled />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-label="Tab 与筛选">
          <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 04 Tab 两套形态 — InlineTabs 下划线 / FilterBar 胶囊描边'}</h3>
          <div className="space-y-6 border border-[var(--border)] p-5">
            <InlineTabs
              label="Sort"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'latest', label: '最新' },
                { value: 'hot', label: '最热' },
                { value: 'essence', label: '精华' },
              ]}
            />
            <FilterBar
              label="Status"
              showNumber
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: '全部', num: '00' },
                { value: 'open', label: '报名中', num: '01' },
                { value: 'done', label: '已结束', num: '02' },
              ]}
            />
          </div>
        </section>

        <section aria-label="分页与数字">
          <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 05 Pagination / RollingNumber'}</h3>
          <div className="border border-[var(--border)] px-5">
            <Pagination page={page} totalPages={9} onPageChange={setPage} variant="ellipsis" />
          </div>
          <div className="mt-4 flex items-center justify-between border border-[var(--border)] p-5">
            <div>
              <div className="meta-mono mb-1">RollingNumber — 数字滚动原语</div>
              <RollingNumber value={counter} className="display-serif text-5xl text-[var(--foreground)]" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setCounter((c) => c + 7)}>+7 试试</Button>
          </div>
        </section>
      </div>

      <section aria-label="浮层">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 06 浮层 — ModalShell / ConfirmDialog（focus trap + Esc + 滚动锁定）'}</h3>
        <div className="flex flex-wrap gap-3 border border-[var(--border)] p-5">
          <Button variant="primary-outline" size="sm" onClick={() => setModalOpen(true)}>打开 ModalShell</Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => {
              void confirm({ title: '// CONFIRM', message: '这是一个破坏性操作的确认示例，确认后才会执行。', confirmLabel: '确认删除', variant: 'danger' });
            }}
          >
            触发 ConfirmDialog
          </Button>
        </div>
        {modalOpen && (
          <ModalShell title="// MODAL-SHELL" onClose={() => setModalOpen(false)}>
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              统一模态外壳：标题栏等宽元数据、1px 发丝线、--shadow-modal 阴影 token。支持 focus trap、Escape 关闭、点击遮罩关闭与滚动锁定。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>取消</Button>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>确认</Button>
            </div>
          </ModalShell>
        )}
      </section>

      <section aria-label="四态">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 07 四态 — Spinner / Skeleton / EmptyState'}</h3>
        <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
          <div className="flex flex-col items-center gap-4 bg-[var(--background)] p-8">
            <Spinner />
            <span className="meta-mono">Spinner — 加载</span>
          </div>
          <div className="bg-[var(--background)] p-8">
            <SkeletonLine className="mb-3" />
            <SkeletonCard />
            <div className="meta-mono mt-4 text-center">Skeleton — 骨架屏</div>
          </div>
          <div className="bg-[var(--background)]">
            <EmptyState label="// EMPTY" message="暂无内容" hint="空状态必须有教育性引导文案与建议动作。" className="py-8" />
          </div>
        </div>
      </section>

      <section aria-label="标题与装饰">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 08 Title / SectionMarker / ArkDivider / DnaCard'}</h3>
        <div className="space-y-8 border border-[var(--border)] p-6 sm:p-8">
          <Title level={2} subtitle="Level 2">统一标题组件</Title>
          <Title level={3} subtitle="Level 3">卡片级标题</Title>
          <div>
            <ArkDivider>Editorial Tech Minimalism</ArkDivider>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <DnaCard corner={1}>
              <div className="meta-mono mb-3 text-[var(--primary)]">§15 像素融合层</div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                DNA 卡：硬阴影 + hover translate(-3px,-3px) + steps() 跳变，是 §11 的白名单例外，仅限像素融合类使用。
              </p>
            </DnaCard>
            <DnaCard corner={2}>
              <div className="meta-mono mb-3 text-[var(--primary)]">受控方言</div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                像素层只注入元数据与交互（标签 / 编号 / 按钮 / 卡片皮肤），不动衬线标题与正文栈。
              </p>
            </DnaCard>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================================ 05 审计（全站一致性现状与治理清单） ================================ */

/** 审计数据：2026-10-13 治理后复验（范围 src/app + src/modules，排除 rhine/lab 豁免域） */
const AUDIT_STATS = [
  { category: '硬编码 hex 颜色', hits: '4→0', files: '2', wave: 'U-1 ✅', note: '--phase-* token 化（globals.css 注册双主题档位）' },
  { category: '白名单外圆角', hits: '~16→0', files: '~10', wave: 'U-2 ✅', note: 'auxilio / assistant-chat / workbench / agent widgets 全部直角化' },
  { category: '违规阴影 / 发光', hits: '6→0', files: '3', wave: 'U-2 ✅', note: 'workbench → --shadow-modal；下拉 → --shadow-popover；发光环 → ring' },
  { category: 'hover 浮起 / 弹跳', hits: '3→0', files: '2', wave: 'U-2 ✅', note: 'wiggle ease-in-out 移除；hover:scale 移除' },
  { category: '手写按钮 / 筛选漂移', hits: '9 处', files: '6', wave: 'U-3 ✅', note: 'join-panel 硬编码按钮 / board-tab 手写描边 / registry-shell chip → 契约组件' },
  { category: '原生 input/textarea/select', hits: '~70→0', files: '36', wave: 'U-3 ✅', note: '全站清零（豁免域外）；Input 契约补 rows prop' },
] as const;

const PAGE_RATINGS: { page: string; rating: 'ok' | 'warn' | 'bad' | 'exempt'; note: string }[] = [
  { page: '/', rating: 'ok', note: '单屏沉浸 Hero + 莫比乌斯环 + 章节标记，装饰渐变属技法豁免' },
  { page: '/about', rating: 'ok', note: '标准 CollapsingHero + 12 栏；5 处原生 input 待收敛' },
  { page: '/events', rating: 'ok', note: '标准折叠 Hero；个别 glow-ring 属组件层问题' },
  { page: '/tools', rating: 'ok', note: 'CollapsingHero + pixel-page + 1600px 全合规' },
  { page: '/profile', rating: 'ok', note: '标准折叠 Hero + pixel-page' },
  { page: '/login', rating: 'ok', note: '居中卡片 + clamp 衬线标题，单卡片简化合理' },
  { page: '/community', rating: 'ok', note: 'U-4 已对齐：1600px 页宽 + Hub 栅格间距；排序迁移 InlineTabs' },
  { page: '/admin', rating: 'ok', note: 'U-3 已迁移：modals/list/join-panel 控件全部走 Button/Input 契约' },
  { page: '/tools/auxilio', rating: 'ok', note: 'U-2 已清零：rounded-md/lg ×5、下拉 shadow-lg → token' },
  { page: '/tools (workbench)', rating: 'ok', note: 'U-2 已清零 + RGL v2 迁移收尾（tsc 全绿）；编辑态走 --shadow-modal + ring' },
  { page: '/lab', rating: 'exempt', note: '§17 Rhine 作用域豁免，不计入' },
];

const TOP_FIXES = [
  ['workbench.tsx 编辑模式视觉', 'shadow-2xl/shadow-lg/ad-hoc 阴影 + rounded-t-xl + hover:scale-110 → --shadow-modal / 直角 / ring 描边', 'U-2 ✅'],
  ['pomodoro/constants.ts:31-33', '3 个硬编码 hex → --phase-* token（globals.css 注册）', 'U-1 ✅'],
  ['assistant-chat.tsx', '气泡/输入框 rounded-lg + 下拉 shadow-lg → 直角 + --shadow-popover', 'U-2 ✅'],
  ['admin 模块原生控件批量化', 'user-list/user-modals/event-modals/join-panel → Button/Input 原语', 'U-3 ✅'],
  ['auxilio/page.tsx', '5 处 rounded-md/lg + 原生控件 → 契约组件', 'U-2 ✅'],
  ['events 发光环 ×2', 'shadow-[0_0_0_*] + scale-125 → ring-2 ring-[var(--primary)]', 'U-2 ✅'],
  ['community/page.tsx', 'max-w-[1320px] → 1600px、gap-8 → Hub 栅格；排序 → InlineTabs', 'U-4 ✅'],
  ['schema-widget-renderer.tsx:136', 'var() 回退 hex 移除', 'U-1 ✅'],
  ['workbench wiggle 动画', 'ease-in-out keyframes 移除；缓动统一 var(--ease-ark)', 'U-2 ✅'],
  ['原生 input 集中区', 'categories-manager / event-modals / about → Input 原语（input 全站清零）', 'U-3 ✅'],
] as const;

const RATING_STYLE = {
  ok: { variant: 'success' as const, label: '符合' },
  warn: { variant: 'amber' as const, label: '轻微偏离' },
  bad: { variant: 'danger' as const, label: '重度偏离' },
  exempt: { variant: 'muted' as const, label: '豁免域' },
};

function AuditView() {
  return (
    <div className="space-y-14">
      <div className="border-b border-[var(--border)] pb-6">
        <SectionMarker className="mb-3">[ 05 ] — Consistency audit</SectionMarker>
        <Title level={2} subtitle="2026.10.13 全量审计">一致性现状</Title>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
          治理波次 U-1 → U-5 已全部落地：硬编码颜色 / 白名单外圆角 / 违规阴影 / hover 浮起 / 原生表单控件均清零（豁免域外），check:design 门禁已接入 CI 防新漂移。11 个主要页面中 10 个合规，/lab 为 §17 豁免域。
        </p>
      </div>

      <section aria-label="违规统计">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 01 违规统计总表'}</h3>
        <div className="grid grid-cols-1 border-l border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {AUDIT_STATS.map((s) => (
            <div key={s.category} className="border-b border-r border-[var(--border)] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--foreground)]">{s.category}</span>
                <Badge variant="muted">{s.wave}</Badge>
              </div>
              <div className="display-serif mb-1 text-4xl text-[var(--foreground)]">{s.hits}</div>
              <div className="meta-mono mb-2">命中 / 涉及 {s.files} 文件</div>
              <p className="text-xs text-[var(--muted-foreground)]">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="meta-mono mt-3 text-[var(--muted-foreground)]">
          注：globals.css 的 99 处 hex 为 token 定义本身；.btn-pixel/.dna-card 硬阴影为 §15 白名单例外，均合法不计。
        </p>
      </section>

      <section aria-label="页面评级">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 02 页面风格一致性评级'}</h3>
        <div className="border-t border-[var(--border)]">
          {PAGE_RATINGS.map((p) => {
            const style = RATING_STYLE[p.rating];
            return (
              <div key={p.page} className="grid grid-cols-12 items-center gap-y-2 border-b border-[var(--border)] py-4 sm:gap-x-5">
                <div className="col-span-6 sm:col-span-2">
                  <span className="font-mono text-[12px] text-[var(--foreground)]">{p.page}</span>
                </div>
                <div className="col-span-6 text-right sm:col-span-2 sm:text-left">
                  <Badge variant={style.variant}>{style.label}</Badge>
                </div>
                <div className="col-span-12 text-xs leading-5 text-[var(--muted-foreground)] sm:col-span-8">{p.note}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="治理清单">
        <h3 className="meta-mono mb-5 text-[var(--primary)]">{'// 03 Top 10 优先治理清单（按波次执行）'}</h3>
        <div className="border-t border-[var(--border)]">
          {TOP_FIXES.map(([title, fix, wave], index) => (
            <div key={title} className="group grid grid-cols-12 items-start gap-y-2 border-b border-[var(--border)] py-4 sm:gap-x-5">
              <div className="col-span-2 sm:col-span-1">
                <span className="meta-mono text-[var(--primary)]">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="col-span-10 sm:col-span-3">
                <span className="text-sm font-medium text-[var(--foreground)]">{title}</span>
              </div>
              <div className="col-span-10 col-start-3 text-xs leading-5 text-[var(--muted-foreground)] sm:col-span-7 sm:col-start-auto">{fix}</div>
              <div className="col-span-2 col-start-11 text-right sm:col-span-1 sm:col-start-auto">
                <Badge variant="muted">{wave}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-[var(--border)] p-5">
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            治理波次 U-1 → U-5 全部完成，详见 <span className="font-mono text-[12px] text-[var(--foreground)]">tools/docs/FrontDoc-05-DesignUnify.md</span>。验证链：tsc 0 error、lint:build 0 error、vitest 380 全绿、check:design 0 违规。
          </p>
          <Link href="/design-demo" className="ark-link meta-mono text-[var(--foreground)]">
            回到 01 重新验收
          </Link>
        </div>
      </section>
    </div>
  );
}
