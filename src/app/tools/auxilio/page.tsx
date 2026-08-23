/**
 * @file 全量 Agent 页（/tools/auxilio）— 完整学习助手能力。
 * 遵循工具区页面规范（折叠 Hero + pixel-page + section 布局，参照 /tools/exam）：
 * full 对话（会话列表 + 工具调用可视化）+ Agent 预设切换 + Trajectory 回放；
 * 「用量与设置」跳转独立详情页 /tools/auxilio/settings。
 */
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BarChart3, BookOpen, Check, Clock3, History, ListChecks, Pause, Play, Plus, RotateCcw, Target, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BackLink } from '@/components';
import { Title, ArkDivider } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button } from '@/components/primitives/button';
import AssistantChat from '@/modules/auxilio/ui/assistant-chat';
import TrajectoryPanel from '@/modules/auxilio/ui/trajectory-panel';
import { apiRequest } from '@/shared/hooks/use-api-request';

const PRESET_OPTIONS = [
  { id: 'general', labelKey: 'presetGeneral' },
  { id: 'exam_sprint', labelKey: 'presetExamSprint' },
  { id: 'resource_finder', labelKey: 'presetResourceFinder' },
  { id: 'web_research', labelKey: 'presetWebResearch' },
] as const;

export default function AuxilioPage() {
  const t = useTranslations('workbench');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick };
  const [presetId, setPresetId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [planItems, setPlanItems] = useState<Array<{
    id: number;
    title: string;
    rationale?: string | null;
    estimatedMinutes: number;
    status: string;
    locked: boolean;
  }>>([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalBudget, setGoalBudget] = useState('300');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goals, setGoals] = useState<Array<{
    id: number;
    title: string;
    targetDate?: string | null;
    weeklyBudgetMinutes: number;
    status: string;
  }>>([]);
  const [mistakes, setMistakes] = useState<Array<{
    id: number;
    question?: { title?: string; contentMarkdown?: string };
    knowledgeTags: string[];
    mistakeCount: number;
    reviewStreak: number;
    status: string;
    reviewDueAt?: string | null;
  }>>([]);

  const loadMistakes = useCallback(async () => {
    const result = await apiRequest<{ mistakes?: typeof mistakes }>('/api/tools/auxilio/mistakes?due_only=true', {
      cache: 'no-store',
    });
    if (result.ok) setMistakes(result.data?.mistakes ?? []);
  }, []);

  useEffect(() => {
    if (showMistakes) void loadMistakes();
  }, [loadMistakes, showMistakes]);

  const loadGoals = useCallback(async () => {
    const result = await apiRequest<{ goals?: typeof goals }>('/api/tools/auxilio/goals', {
      cache: 'no-store',
    });
    if (result.ok) setGoals(result.data?.goals ?? []);
  }, []);

  useEffect(() => {
    if (showGoals) void loadGoals();
  }, [loadGoals, showGoals]);

  const createGoal = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goalTitle.trim()) return;
    const result = await apiRequest('/api/tools/auxilio/goals', {
      method: 'POST',
      body: {
        title: goalTitle.trim(),
        weekly_budget_minutes: Number(goalBudget),
        target_date: goalTargetDate ? new Date(goalTargetDate).toISOString() : null,
      },
    });
    if (!result.ok) return;
    setGoalTitle('');
    setGoalTargetDate('');
    await loadGoals();
  }, [goalBudget, goalTargetDate, goalTitle, loadGoals]);

  const setGoalStatus = useCallback(async (goalId: number, status: 'active' | 'paused' | 'completed') => {
    const result = await apiRequest(`/api/tools/auxilio/goals/${goalId}`, {
      method: 'PATCH',
      body: { status },
    });
    if (result.ok) await loadGoals();
  }, [loadGoals]);

  const removeGoal = useCallback(async (goalId: number) => {
    const result = await apiRequest(`/api/tools/auxilio/goals/${goalId}`, { method: 'DELETE' });
    if (result.ok) await loadGoals();
  }, [loadGoals]);

  const loadPlan = useCallback(async () => {
    const result = await apiRequest<{ items?: typeof planItems }>('/api/tools/auxilio/plan?generate=true', {
      cache: 'no-store',
    });
    if (result.ok) setPlanItems(result.data?.items ?? []);
  }, []);

  useEffect(() => {
    if (showPlan) void loadPlan();
  }, [loadPlan, showPlan]);

  const updatePlanItem = useCallback(async (id: number, body: Record<string, unknown>) => {
    const result = await apiRequest(`/api/tools/auxilio/plan/${id}`, { method: 'PATCH', body });
    if (result.ok) await loadPlan();
  }, [loadPlan]);

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('agentTitle')}
        hero={hero}
        pageKey="auxilio"
        minHeight="50vh"
        sidebarBottom={
          <BackLink href="/tools">{t('agentBackTools')}</BackLink>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('agentTitle')} ${t('agentEn')}`}
            subtitle={t('agentEn')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('agentTitle')}
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
            <p className="max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal text-[15px] sm:text-[16px]">
              {t('chatIntro')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 对话 ============ */}
      <section data-section-nav="01|对话" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <Title
            level={2}
            className="text-[clamp(28px,5vw,56px)] mb-4"
            echo={`${t('agentChatSection')} ${t('agentEn')}`}
          >
            {t('agentChatSection')}
            <ArkDivider className="ml-2">{t('agentEn')}</ArkDivider>
          </Title>
          <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
            {t('presetLabel')} · {t('replay')} · {t('llmUsageEntry')}
          </p>

          {/* 控件行：预设切换 + 轨迹回放 + 用量与设置（独立设置页） */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <label className="flex items-center gap-1.5 text-[13px]">
              <span className="text-[var(--muted-foreground)]">{t('presetLabel')}</span>
              <select
                value={presetId ?? ''}
                onChange={(e) => setPresetId(e.target.value || null)}
                className="bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[13px]"
              >
                <option value="">{t('presetAuto')}</option>
                {PRESET_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <Button
              size="sm"
              variant={showReplay ? 'pixel' : 'pixel-outline'}
              disabled={activeConv == null}
              onClick={() => setShowReplay((v) => !v)}
            >
              {showReplay ? <RotateCcw className="w-4 h-4" /> : <History className="w-4 h-4" />}
              {t('replay')}
            </Button>

            <Button
              size="sm"
              variant={showPlan ? 'pixel' : 'pixel-outline'}
              onClick={() => setShowPlan((v) => !v)}
            >
              <ListChecks className="w-4 h-4" /> 今日计划
            </Button>

            <Button
              size="sm"
              variant={showGoals ? 'pixel' : 'pixel-outline'}
              onClick={() => setShowGoals((v) => !v)}
            >
              <Target className="w-4 h-4" /> 学习目标
            </Button>

            <Button
              size="sm"
              variant={showMistakes ? 'pixel' : 'pixel-outline'}
              onClick={() => setShowMistakes((v) => !v)}
            >
              <BookOpen className="w-4 h-4" /> 错题本
            </Button>

            <Link
              href="/tools/auxilio/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] text-[12px] font-medium hover:bg-[var(--border)]/40"
            >
              <BarChart3 className="w-4 h-4" />
              {t('llmUsageEntry')}
            </Link>
          </div>

          {showPlan && (
            <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-medium">今日学习计划</h3>
                  <p className="text-[12px] text-[var(--muted-foreground)]">按目标预算、到期错题和薄弱知识点生成，已完成或锁定项不会被自动覆盖。</p>
                </div>
                <span className="text-[12px] text-[var(--muted-foreground)]">{planItems.reduce((total, item) => total + item.estimatedMinutes, 0)} 分钟</span>
              </div>
              {planItems.length === 0 ? (
                <p className="text-[13px] text-[var(--muted-foreground)]">暂无计划。请先创建一个 active 学习目标。</p>
              ) : (
                <div className="grid gap-2">
                  {planItems.map((item) => (
                    <div key={item.id} className="rounded border border-[var(--border)] p-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium">{item.title}</p>
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{item.estimatedMinutes} 分钟 · {item.status}{item.locked ? ' · 已锁定' : ''}</p>
                          {item.rationale && <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">{item.rationale}</p>}
                        </div>
                        {item.status === 'completed' ? (
                          <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <div className="flex shrink-0 gap-1.5">
                            <Button size="sm" variant="pixel" onClick={() => void updatePlanItem(item.id, { status: 'completed' })}>完成</Button>
                            <Button size="sm" variant="pixel-outline" onClick={() => void updatePlanItem(item.id, { locked: !item.locked })}>{item.locked ? '解锁' : '锁定'}</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showGoals && (
            <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-medium">学习目标</h3>
                  <p className="text-[12px] text-[var(--muted-foreground)]">明确截止时间和每周预算，后续计划会以此为上限。</p>
                </div>
                <span className="text-[12px] text-[var(--muted-foreground)]">{goals.length} 个目标</span>
              </div>
              <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_190px_auto]" onSubmit={createGoal}>
                <input
                  value={goalTitle}
                  onChange={(event) => setGoalTitle(event.target.value)}
                  placeholder="目标名称"
                  aria-label="目标名称"
                  className="min-w-0 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px]"
                />
                <label className="flex items-center gap-1 rounded border border-[var(--border)] px-2 text-[12px]">
                  <Clock3 className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <input
                    type="number"
                    min={15}
                    max={10080}
                    step={15}
                    value={goalBudget}
                    onChange={(event) => setGoalBudget(event.target.value)}
                    aria-label="每周分钟预算"
                    className="w-full bg-transparent py-2 outline-none"
                  />
                  <span className="shrink-0 text-[var(--muted-foreground)]">分/周</span>
                </label>
                <input
                  type="datetime-local"
                  value={goalTargetDate}
                  onChange={(event) => setGoalTargetDate(event.target.value)}
                  aria-label="目标截止时间"
                  className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px]"
                />
                <Button type="submit" size="sm" variant="pixel" disabled={!goalTitle.trim()}>
                  <Plus className="w-4 h-4" /> 添加
                </Button>
              </form>
              {goals.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {goals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2 rounded border border-[var(--border)] px-3 py-2">
                      <Target className="w-4 h-4 shrink-0 text-[var(--primary)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{goal.title}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {goal.weeklyBudgetMinutes} 分钟/周 · {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : '无截止日期'} · {goal.status}
                        </p>
                      </div>
                      {goal.status === 'active' ? (
                        <button type="button" className="rounded border border-[var(--border)] p-1.5 hover:text-[var(--primary)]" title="暂停目标" aria-label="暂停目标" onClick={() => void setGoalStatus(goal.id, 'paused')}>
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      ) : goal.status === 'paused' ? (
                        <button type="button" className="rounded border border-[var(--border)] p-1.5 hover:text-[var(--primary)]" title="恢复目标" aria-label="恢复目标" onClick={() => void setGoalStatus(goal.id, 'active')}>
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      {goal.status !== 'completed' && (
                        <button type="button" className="rounded border border-[var(--border)] p-1.5 hover:text-emerald-500" title="完成目标" aria-label="完成目标" onClick={() => void setGoalStatus(goal.id, 'completed')}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" className="rounded border border-[var(--border)] p-1.5 hover:text-[var(--destructive)]" title="删除目标" aria-label="删除目标" onClick={() => void removeGoal(goal.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <AssistantChat
            mode="full"
            presetId={presetId}
            onActiveConversation={(id) => {
              setActiveConv(id);
              if (id == null) setShowReplay(false);
            }}
          />

          {showMistakes && (
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-medium">待复习错题</h3>
                  <p className="text-[12px] text-[var(--muted-foreground)]">来自最近答题的自动快照，可在复习后标记为已掌握。</p>
                </div>
                <span className="text-[12px] text-[var(--muted-foreground)]">{mistakes.length} 题</span>
              </div>
              {mistakes.length === 0 ? (
                <p className="text-[13px] text-[var(--muted-foreground)]">暂无到期错题，继续保持。</p>
              ) : (
                <div className="grid gap-2">
                  {mistakes.map((mistake) => (
                    <div key={mistake.id} className="rounded border border-[var(--border)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium">{mistake.question?.title || '未命名题目'}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {mistake.knowledgeTags.map((tag) => (
                              <span key={tag} className="rounded bg-[var(--border)]/40 px-1.5 py-0.5 text-[11px]">{tag}</span>
                            ))}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">错误 {mistake.mistakeCount} 次 · 连续掌握 {mistake.reviewStreak} 次 · {mistake.status}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {([
                          ['again', '再来一次'],
                          ['hard', '困难'],
                          ['good', '记住了'],
                          ['easy', '很简单'],
                        ] as const).map(([feedback, label]) => (
                          <Button
                            key={feedback}
                            size="sm"
                            variant={feedback === 'good' ? 'pixel' : 'pixel-outline'}
                            onClick={async () => {
                              const result = await apiRequest(`/api/tools/auxilio/mistakes/${mistake.id}/review`, {
                                method: 'POST',
                                body: { feedback },
                              });
                              if (result.ok) await loadMistakes();
                            }}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showReplay && (
            <div className="mt-6">
              <TrajectoryPanel conversationId={activeConv} onClose={() => setShowReplay(false)} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
