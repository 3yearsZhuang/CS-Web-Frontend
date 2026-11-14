'use client';

/**
 * @file BoardTab — 任务板（Tab 01）：难度筛选 + 管理员建单/审核 + 任务列表
 *
 * 任务数据唯一事实源为旧项目（经官网后端 BFF 代理）：单接取人模型，
 * 字段为 难度 / 悬赏灵石 / 截止时间 / 接取人；状态对外为官网英文 code（附旧项目中文原值回落）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `useTasks` 返回值提供（GENERAL 2.2）。
 */

import { Plus, Zap, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState, Button, SectionLoading, Title } from '@/components';
import type { useTasks } from './hooks/use-tasks';
import {
  DIFFICULTY_KEYS,
  TASK_INPUT_CLASS,
  difficultyLabel,
  difficultyOptions,
  statusBadge,
} from './task-shared';

export function BoardTab(props: ReturnType<typeof useTasks>) {
  const t = useTranslations('toolsTask');
  const {
    tasksLoading,
    tasksError,
    tasks,
    filteredTasks,
    difficultyFilter,
    setDifficultyFilter,
    isAdmin,
    showCreateForm,
    setShowCreateForm,
    newTask,
    setNewTask,
    creating,
    handleCreate,
    pendingTasks,
    reviewingId,
    handleApprove,
    handleReject,
    expandedId,
    setExpandedId,
    user,
    claimingId,
    handleClaim,
  } = props;

  return (
    <div>
      <Title level={2} className="mb-10 sm:mb-16">
        {t('boardTitle')}
      </Title>

      {/* 难度筛选 */}
      <div className="border-t border-[var(--border)] py-6 mb-8">
        <div className="meta-mono mb-2">Difficulty</div>
        <div className="flex gap-0 overflow-x-auto flex-wrap">
          <button
            onClick={() => setDifficultyFilter('')}
            className={`tab-chip focus-ring whitespace-nowrap ${!difficultyFilter ? 'tab-chip-active' : ''}`}
          >
            {t('diffAll')} ({tasks.length})
          </button>
          {DIFFICULTY_KEYS.map((d) => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d === difficultyFilter ? '' : d)}
              className={`tab-chip focus-ring whitespace-nowrap ${d === difficultyFilter ? 'tab-chip-active' : ''}`}
            >
              {difficultyLabel(t, d)}
            </button>
          ))}
        </div>
      </div>

      {/* 管理员：建单按钮 + 待审核计数 */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
          >
            <Plus className="w-3 h-3" />
            {showCreateForm ? t('createCancel') : t('createTask')}
          </button>
          {pendingTasks.length > 0 && (
            <span className="meta-mono text-[11px] text-[var(--primary)]">
              {t('pendingBadge')} {pendingTasks.length}
            </span>
          )}
        </div>
      )}

      {/* 建单表单：旧项目落库后进入「审核中」 */}
      {showCreateForm && isAdmin && (
        <form onSubmit={handleCreate} className="border border-[var(--border)] p-6 sm:p-8 mb-8 space-y-4">
          <div>
            <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 01 ] {t('fldTitle')}</label>
            <input
              value={newTask.title}
              onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
              className={TASK_INPUT_CLASS}
              placeholder={t('titlePlaceholder')}
              required
            />
          </div>
          <div>
            <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 02 ] {t('fldDesc')}</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))}
              className={TASK_INPUT_CLASS}
              rows={3}
              placeholder={t('descPlaceholder')}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 03 ] {t('fldDifficulty')}</label>
              <select
                value={newTask.difficulty}
                onChange={(e) => setNewTask((f) => ({ ...f, difficulty: e.target.value }))}
                className={TASK_INPUT_CLASS}
              >
                {difficultyOptions(t).map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 04 ] {t('fldReward')}</label>
              <input
                type="number"
                value={newTask.reward}
                onChange={(e) => setNewTask((f) => ({ ...f, reward: parseInt(e.target.value) || 0 }))}
                className={TASK_INPUT_CLASS}
                min={0}
              />
            </div>
            <div>
              <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 05 ] {t('fldDeadline')}</label>
              <input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) => setNewTask((f) => ({ ...f, deadline: e.target.value }))}
                className={TASK_INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 06 ] {t('fldTechRequirements')}</label>
            <input
              value={newTask.techRequirements}
              onChange={(e) => setNewTask((f) => ({ ...f, techRequirements: e.target.value }))}
              className={TASK_INPUT_CLASS}
              placeholder={t('techReqPlaceholder')}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={creating}>
              {creating ? t('creating') : t('createTask')}
            </Button>
          </div>
        </form>
      )}

      {/* 管理员待审核任务（旧项目「审核中」） */}
      {isAdmin && pendingTasks.length > 0 && (
        <div className="border border-[var(--border)] p-6 mb-8">
          <div className="meta-mono mb-4">{t('pendingReviewTitle')}</div>
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 py-3 border-b border-[var(--border)] last:border-0"
            >
              <div className="min-w-0">
                <span className="text-[13px] text-[var(--foreground)]">{task.title}</span>
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-3">
                  {difficultyLabel(t, task.difficulty)}
                </span>
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-3">{task.createdAt}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleApprove(task.id)}
                  disabled={reviewingId === task.id}
                  className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors"
                >
                  {t('reviewPass')}
                </button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleReject(task.id)}
                  disabled={reviewingId === task.id}
                >
                  {t('reviewReject')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 任务列表 */}
      {tasksLoading ? (
        <SectionLoading label="Loading..." />
      ) : tasksError ? (
        <EmptyState message={tasksError} tone="error" className="py-12" />
      ) : filteredTasks.length === 0 ? (
        <EmptyState label={`[ ${t('emptyTasks')} ]`} message={t('emptyTasksText')} className="py-12" />
      ) : (
        <div className="space-y-0 border-t border-[var(--border)]">
          {filteredTasks.map((task) => {
            const badge = statusBadge(task.status, t, task.statusLabel);
            return (
              <div
                key={task.id}
                className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--primary)]/[0.02] ${
                  expandedId === task.id ? 'bg-[var(--primary)]/[0.03]' : ''
                }`}
              >
                <button
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  className="w-full text-left p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[14px] sm:text-[15px] text-[var(--foreground)] font-medium truncate">
                        {task.title}
                      </span>
                      <span className={`inline-flex items-center gap-1 meta-mono text-[10px] px-2 py-0.5 border ${badge.cls}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      {task.difficulty && (
                        <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                          {difficultyLabel(t, task.difficulty)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-2 line-clamp-2">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="flex items-center gap-1 meta-mono text-[11px] text-[var(--primary)]">
                      <Zap className="w-3 h-3" />
                      {task.reward} {t('rewardUnit')}
                    </span>
                    <span className={`meta-mono text-[10px] transition-transform duration-300 ${expandedId === task.id ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </button>

                {expandedId === task.id && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[var(--border)] pt-4">
                    <div className="space-y-4">
                      <p className="text-[13px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>

                      {task.techRequirements.length > 0 && (
                        <div>
                          <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-2">
                            {t('techReqLabel')}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {task.techRequirements.map((req, i) => (
                              <span key={`${req}-${i}`} className="tag-badge">{req}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 meta-mono text-[11px] text-[var(--muted-foreground)]">
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t('deadlineLabel')} {task.deadline}
                          </span>
                        )}
                        <span>
                          {t('completerLabel')} {task.completer?.name || t('noCompleter')}
                        </span>
                      </div>

                      {task.submissionDescription && (
                        <div className="border-t border-[var(--border)] pt-3">
                          <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                            {t('submissionLabel')}
                          </div>
                          <p className="text-[13px] text-[var(--foreground)] whitespace-pre-wrap">
                            {task.submissionDescription}
                          </p>
                          {task.attachmentUrl && (
                            <a
                              href={task.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="meta-mono text-[11px] text-[var(--primary)] underline-grow"
                            >
                              {t('attachmentLabel')}
                            </a>
                          )}
                        </div>
                      )}

                      {task.rejectReason && (
                        <div className="border-t border-[var(--border)] pt-3">
                          <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                            {t('rejectReasonLabel')}
                          </div>
                          <p className="text-[13px] text-[var(--destructive)] whitespace-pre-wrap">
                            {task.rejectReason}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
                        {user && task.status === 'published' && !task.completer && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleClaim(task.id); }}
                            disabled={claimingId === task.id}
                          >
                            {claimingId === task.id ? t('claiming') : t('claimTask')}
                          </Button>
                        )}
                        {task.status === 'published' && task.completer && (
                          <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                            {t('claimTaken')}
                          </span>
                        )}
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{task.createdAt}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}