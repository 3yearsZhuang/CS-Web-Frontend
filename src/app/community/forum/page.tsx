/**
 * @file 论坛版块聚合首页（/forum）— 版块卡片网格 + 全局热帖横滑 + 搜索栏
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { ScrollIndicator } from '@/components/effects/scroll-indicator';
import { Button, SectionLoading } from '@/components';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import type { CommunityCategory, CommunityPost } from '@/modules/community/types';

interface CategoryWithPreview extends CommunityCategory {
  latestTopics: CommunityPost[];
}

interface ForumOverview {
  categories: CategoryWithPreview[];
  hotTopics: CommunityPost[];
}

export default function ForumPage() {
  const router = useRouter();
  const { collapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = { collapsed, capsuleVisible, onRevealComplete, onTitleClick };

  const [data, setData] = useState<ForumOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/community/forum/overview', { cache: 'no-store' });
        if (!res.ok) throw new Error('加载失败');
        const json = (await res.json()) as ForumOverview;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const statCount = data
    ? data.categories.reduce((sum, c) => sum + (c.topicCount ?? 0), 0)
    : 0;

  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      <CollapsingHero
        index="00"
        label="Forum"
        hero={hero}
        pageKey="forum"
      >
        <RevealTitle>
          <h1
            className={`display-serif transition-all hero-reveal cursor-pointer ${
              collapsed
                ? 'text-[clamp(22px,4vw,36px)]'
                : 'text-[clamp(36px,7vw,88px)]'
            } text-[var(--foreground)] leading-[1.05] sm:leading-[0.95]`}
            onClick={collapsed ? onTitleClick : undefined}
          >
            论坛
            <span className="text-[var(--primary)]"> 版块</span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`transition-all hero-reveal ${
              collapsed
                ? 'max-h-0 opacity-0 mt-0'
                : 'max-h-24 opacity-100 mt-6 sm:mt-12'
            }`}
          >
            <p className="text-[var(--muted-foreground)] text-[14px] sm:text-[16px] max-w-2xl leading-relaxed">
              浏览技术版块，参与讨论，分享知识。共 {statCount} 个主题等你探索。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <StaggerContainer>
            {error && (
              <div className="mb-8 p-4 border-l-2 border-[var(--destructive)] text-[var(--destructive)] meta-mono">
                {error}
              </div>
            )}

            {/* 搜索 + 发帖 CTA */}
            {data && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="搜索论坛主题..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const q = (e.target as HTMLInputElement).value.trim();
                          if (q) router.push(`/community?q=${encodeURIComponent(q)}&tab=topic`);
                        }
                      }}
                      className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>
                  <Link href="/community/forum/new" className="shrink-0">
                    <Button>发布新帖 →</Button>
                  </Link>
                  {/* 统一入口：帖子聚合页 */}
                  <Link href="/community/posts" className="shrink-0">
                    <Button variant="outline">全部帖子</Button>
                  </Link>
                </div>

                {/* 全局热帖 */}
                {data.hotTopics.length > 0 && (
                  <div className="mb-16">
                    <div className="flex items-baseline gap-3 mb-6">
                      <div className="section-marker">[ Hot ]</div>
                      <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] leading-[1.05]">
                        热门主题
                      </h2>
                    </div>
                    <ScrollIndicator className="pb-2" gap="gap-4">
                      {data.hotTopics.map((topic) => (
                        <Link
                          key={topic.id}
                          href={`/community/forum/${topic.category?.slug ?? 'general'}/${topic.id}`}
                          className="shrink-0 w-[300px] sm:w-[360px] group focus-amber"
                        >
                          <article className="border border-[var(--border)] p-5 h-full card-minimal hover:border-[var(--primary)] transition-colors">
                            <div className="meta-mono text-[11px] text-[var(--primary)] mb-2">
                              {topic.category?.name ?? '未分类'}
                            </div>
                            <h3 className="display-serif text-[18px] text-[var(--foreground)] leading-[1.3] mb-3 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                              {topic.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-auto">
                              <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] truncate">
                                {topic.author?.displayName ?? '匿名'}
                              </span>
                              <div className="flex items-center gap-3 ml-auto">
                                <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                                  {topic.replyCount} Reply
                                </span>
                                <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                                  {topic.likeCount} Like
                                </span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </ScrollIndicator>
                  </div>
                )}

                {/* 版块卡片网格 */}
                <div>
                  <div className="flex items-baseline gap-3 mb-8">
                    <div className="section-marker">[ Boards ]</div>
                    <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] leading-[1.05]">
                      全部版块
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {data.categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/community/posts?kind=topic&category=${cat.slug}`}
                        className="group focus-amber"
                      >
                        <article className="border border-[var(--border)] p-6 sm:p-8 card-minimal hover:border-[var(--primary)] transition-colors h-full flex flex-col">
                          <div className="flex items-baseline gap-2 mb-4">
                            <h3 className="display-serif text-[24px] sm:text-[28px] text-[var(--foreground)] leading-[1.1] group-hover:text-[var(--primary)] transition-colors">
                              {cat.name}
                            </h3>
                            <span className="meta-mono text-[12px] text-[var(--muted-foreground)] shrink-0">
                              {cat.topicCount ?? 0} 主题
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.6] mb-5 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                          {cat.latestTopics.length > 0 && (
                            <div className="mt-auto pt-4 border-t border-[var(--border)]">
                              <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-2">
                                最新讨论
                              </div>
                              <div className="space-y-1.5">
                                {cat.latestTopics.slice(0, 2).map((t) => (
                                  <div
                                    key={t.id}
                                    className="text-[13px] text-[var(--muted-foreground)] line-clamp-1"
                                  >
                                    {t.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </StaggerContainer>
        </div>
      </section>
    </main>
  );
}