'use client'
/**
 * @file 关于页面
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button } from '@/components';
import Link from 'next/link';

type AboutTab = 'belief' | 'directions' | 'process';

const BELIEFS = [
  {
    num: '01',
    title: '技术驱动 — 在实践中学习',
    desc: '我们不满足于纸上谈兵。从第一周开始，成员就会接触真实项目：Web 应用、算法竞赛、AI 模型训练、系统工具开发。每个项目都有明确的产出目标，学习在解决问题中发生，而不是在听完理论之后。',
    tag: 'Project-First',
  },
  {
    num: '02',
    title: '开放社区 — 技术属于每个人',
    desc: '不论你的专业、年级、性别或技术基础，只要你对技术怀有热情，这里就有你的位置。我们崇尚分享而非藏私、协作而非竞争、共同成长而非零和博弈。社区的边界由好奇心划定，而非背景。',
    tag: 'Inclusive',
  },
  {
    num: '03',
    title: '成果导向 — 让作品说话',
    desc: '成员在 ACM/ICPC 亚洲区域赛、蓝桥杯、CCF-CSP、各类黑客松中屡获佳绩；多个学生项目在校内外产生实际影响力，部分项目已开源并被社区采用。我们用作品证明自己。',
    tag: 'Outcome-Driven',
  },
];

const DIRECTIONS = [
  {
    num: '01',
    name: 'Web 开发',
    nameEn: 'Web Development',
    tag: 'Frontend & Backend',
    desc: '从静态页面到全栈应用，掌握现代 Web 开发完整链路：设计、构建、部署、运维。',
    stack: ['React / Next.js', 'Vue / Nuxt', 'Node.js / Bun', 'PostgreSQL / Supabase'],
  },
  {
    num: '02',
    name: '算法竞赛',
    nameEn: 'Competitive Programming',
    tag: 'ACM / ICPC',
    desc: '系统训练数据结构与算法，参与 ICPC、CCPC、蓝桥杯等高水平竞赛。',
    stack: ['C++ / Rust', '动态规划', '图论 / 数论', 'Codeforces / AtCoder'],
  },
  {
    num: '03',
    name: '人工智能',
    nameEn: 'AI & Machine Learning',
    tag: 'ML / Deep Learning',
    desc: '从经典机器学习到大模型微调，覆盖理论、工程与应用全栈。',
    stack: ['PyTorch / JAX', 'Transformers', '计算机视觉', 'NLP / RAG'],
  },
  {
    num: '04',
    name: '系统与安全',
    nameEn: 'Systems & Security',
    tag: 'OS / Security',
    desc: '深入操作系统内核，学习网络安全攻防，参与 CTF 竞赛。',
    stack: ['Linux 内核', 'Rust / C', 'Pwn / Reverse', 'CTF / 渗透测试'],
  },
  {
    num: '05',
    name: '开源贡献',
    nameEn: 'Open Source',
    tag: 'Community',
    desc: '学习开源协作流程，向知名项目提交 PR，建立个人技术影响力。',
    stack: ['Git / GitHub', '代码审查', 'License / 治理', 'CNCF / Apache'],
  },
  {
    num: '06',
    name: '创意编程',
    nameEn: 'Creative Coding',
    tag: 'Generative Art',
    desc: '用代码创造艺术：游戏开发、交互设计、生成艺术、WebGL 可视化。',
    stack: ['p5.js / Three.js', 'WebGL / Shader', 'Unity / Godot', '生成艺术'],
  },
];

const REQUIREMENTS = [
  {
    num: '01',
    title: '对技术的真诚热情',
    desc: '不需要你已经是高手，但需要你真的喜欢写代码、研究原理、解决问题。',
    tag: 'Passion',
  },
  {
    num: '02',
    title: '主动学习与持续投入',
    desc: '协会不是培训班，我们期待你主动提出问题、寻找答案，并长期投入。',
    tag: 'Self-Driven',
  },
  {
    num: '03',
    title: '协作精神与开放心态',
    desc: '愿意与他人分享、合作、互相 review 代码，接受不同观点的碰撞。',
    tag: 'Collaborative',
  },
  {
    num: '04',
    title: '不限专业年级',
    desc: '无论你是计算机、电子、机械、设计、文科或理科，都欢迎加入。',
    tag: 'Inclusive',
  },
];

const STEPS = [
  {
    num: '01',
    title: '注册账号',
    duration: '5 min',
    desc: '在协会官网注册一个账号，验证邮箱后即可登录。',
    details: ['Email 验证', '设置密码', '完善基本信息'],
  },
  {
    num: '02',
    title: '填写报名表',
    duration: '15 min',
    desc: '填写简单的报名表，包括你的兴趣方向、技术背景与想加入的理由。',
    details: ['兴趣方向选择', '技术背景自评', '个人陈述'],
  },
  {
    num: '03',
    title: '线上交流',
    duration: '20 min',
    desc: '与各组负责人进行简短的线上交流，互相了解，看是否契合。',
    details: ['Zoom / 腾讯会议', '20 分钟一对一', '无技术考核'],
  },
  {
    num: '04',
    title: '正式加入',
    duration: '1 day',
    desc: '通过后即可加入协会，参与各组活动、项目与周会。',
    details: ['加入协会实验室', '认识组内伙伴'],
  },
];

export default function AboutPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AboutTab>('belief');

  const aboutTabs: CapsuleTab[] = [
    { key: 'belief', num: '01', label: '关于 / About' },
    { key: 'directions', num: '02', label: '方向 / Directions' },
    { key: 'process', num: '03', label: '加入 / Join' },
  ];

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  return (
    <main className="relative pt-16">
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
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            一群
            <span className="text-[var(--primary)]">热爱</span>
            技术的人，
            <span
              className={`transition-all hero-reveal ${
                hero.collapsed
                  ? 'inline opacity-100 ml-1'
                  : 'block max-h-[1.5em] opacity-100'
              } overflow-hidden`}
            >
              聚在一起。
            </span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / About &amp; Join
            </span>
          </h1>
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
              计算机协会成立于 2017 年，是校园中最纯粹的技术社区。我们相信，
              <span className="serif-italic text-[var(--foreground)]">代码不只是工具</span>
              ，更是表达创意、解决问题、连接未来的语言。
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
                <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                  我们期待<span className="text-[var(--primary)]">同频</span>的你！
                </h2>
                {/* 子区块 1：信念 */}
                <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 uppercase tracking-widest">
                  — 信念 / Belief
                </h3>
                <div className="border-t border-[var(--border)]">
                  {BELIEFS.map((b) => (
                    <article
                      key={b.num}
                      className="grid grid-cols-12 gap-2 sm:gap-4 py-6 sm:py-8 border-b border-[var(--border)] card-minimal"
                    >
                      <div className="col-span-2 md:col-span-1">
                        <span className="meta-mono text-[var(--primary)]">{b.num}</span>
                      </div>
                      <div className="col-span-10 md:col-span-4">
                        <h3 className="text-[16px] sm:text-[18px] text-[var(--foreground)] tracking-tight">
                          {b.title}
                        </h3>
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                          {b.desc}
                        </p>
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <span className="meta-mono text-[var(--muted-foreground)]">{b.tag}</span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* 子区块 2：期望 */}
                <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 mt-16 sm:mt-20 uppercase tracking-widest">
                  — 期望 / Expectation
                </h3>
                <div className="border-t border-[var(--border)]">
                  {REQUIREMENTS.map((req) => (
                    <article
                      key={req.num}
                      className="grid grid-cols-12 gap-2 sm:gap-4 py-6 sm:py-8 border-b border-[var(--border)] card-minimal"
                    >
                      <div className="col-span-2 md:col-span-1">
                        <span className="meta-mono text-[var(--primary)]">{req.num}</span>
                      </div>
                      <div className="col-span-10 md:col-span-4">
                        <h3 className="text-[16px] sm:text-[18px] text-[var(--foreground)] tracking-tight">
                          {req.title}
                        </h3>
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                          {req.desc}
                        </p>
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <span className="meta-mono text-[var(--muted-foreground)]">{req.tag}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

              {activeTab === 'directions' && (
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                    六大方向，
                    <br />
                    <span className="text-[var(--primary)]">覆盖</span>主流技术领域。
                  </h2>
                  <RevealItem>
                    <p className="mb-8 sm:mb-12 max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
                      从 Web 到 AI，从算法到系统，每个方向都有专人带领、固定周会、
                      真实项目。成员可以
                      <span className="serif-italic text-[var(--foreground)]"> 同时参与多个方向</span>
                      ，探索自己的兴趣边界。
                    </p>
                  </RevealItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {DIRECTIONS.map((d) => (
                      <article
                        key={d.num}
                        className="group card-minimal border border-[var(--border)] p-5 sm:p-6 hover:border-[var(--primary)]/40 transition-colors flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="display-serif text-[clamp(28px,4vw,44px)] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-none">
                            {d.num}
                          </div>
                          <div className="meta-mono text-[var(--muted-foreground)] text-[11px] sm:text-[12px]">
                            {d.nameEn}
                          </div>
                        </div>
                        <h3 className="display-serif text-[clamp(18px,2vw,22px)] text-[var(--foreground)] mb-2">
                          {d.name}
                        </h3>
                        <div className="meta-mono text-[var(--primary)] text-[11px] sm:text-[12px] mb-3">
                          {d.tag}
                        </div>
                        <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.7] flex-1">
                          {d.desc}
                        </p>
                        {d.stack.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {d.stack.map((s) => (
                              <span key={s} className="tag-badge text-[11px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'process' && (
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                    如何<span className="text-[var(--primary)]">加入</span>。
                  </h2>
                  {/* 子区块 1：流程 */}
                  <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 uppercase tracking-widest">
                    — 流程 / Process
                  </h3>
                  <div className="border-t border-[var(--border)]">
                    {STEPS.map((step, idx) => (
                      <article
                        key={step.num}
                        className="group grid grid-cols-12 gap-4 py-8 sm:py-12 border-b border-[var(--border)] card-minimal"
                      >
                        <div className="col-span-12 md:col-span-3">
                          <div className="display-serif text-[clamp(40px,7vw,80px)] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-none mb-2">
                            {step.num}
                          </div>
                          <div className="meta-mono text-[var(--muted-foreground)]">
                            Step {idx + 1} / {STEPS.length}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-2 md:border-l md:border-r md:border-[var(--border)] md:pl-6 pb-4 md:pb-0 border-b md:border-b-0 border-[var(--border)]">
                          <div className="meta-mono mb-2">Duration</div>
                          <div className="text-[13px] font-mono text-[var(--primary)]">
                            {step.duration}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <h3 className="display-serif text-[clamp(22px,3vw,28px)] text-[var(--foreground)] mb-3">
                            {step.title}
                          </h3>
                          <p className="text-[14px] text-[var(--muted-foreground)] leading-[1.7] max-w-xl">
                            {step.desc}
                          </p>
                          {step.details.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {step.details.map((d) => (
                                <span key={d} className="tag-badge">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="hidden md:block md:col-span-1 text-right">
                          <span className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 inline-block transition-all">
                            →
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                  {/* 子区块 2：加入 */}
                  <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 mt-16 sm:mt-20 uppercase tracking-widest">
                    — 加入 / Join
                  </h3>
                  <div className="border-t border-[var(--border)] pt-10 sm:pt-16">
                    <p className="text-[14px] sm:text-[15px] text-[var(--muted-foreground)] leading-[1.8] max-w-xl mb-8">
                      报名通道全年开放。填写报名表，
                      我们会在 3 个工作日内联系你。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={() => router.push('/join')}>
                        <span>填写报名表</span>
                        <span>→</span>
                      </Button>
                      <Button variant="outline" onClick={() => router.push('/login')}>
                        <span>登录</span>
                        <span>→</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
        </div>
      </section>
    </main>
  );
}
