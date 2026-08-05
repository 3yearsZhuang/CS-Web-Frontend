'use client';

/**
 * @file BoardTab — 任务板（Tab 01）：列表 + 分类筛选 + 管理员创建/审核
 *
 * 从 `app/tools/task/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `useTasks` 返回值提供（GENERAL 2.2）。
 */

import { Plus, Zap, CheckCircle, XCircle } from 'lucide-react';
import { Button, SectionLoading } from '@/components';
import type { useTasks } from './use-tasks';
import { CATEGORY_LABELS, INPUT_CLASS } from './task-shared';

export function BoardTab(props: ReturnType<typeof useTasks>) {
  const {
    tasksLoading,
    tasksError,
    tasks,
    filteredTasks,
    categories,
    categoryFilter,
    setCategoryFilter,
    isAdmin,
    showCreateForm,
    setShowCreateForm,
    newTask,
    setNewTask,
    creating,
    handleCreate,
    pendingClaims,
    reviewingId,
    handleReview,
    expandedId,
    setExpandedId,
    user,
    claimingId,
    handleClaim,
    handlePublish,
  } = props;

  return (
    <div>
      <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
        任务<span className="text-[var(--primary)]">板</span>
      </h2>

      {/* 分类筛选 */}
      {categories.length > 0 && (
        <div className="border-t border-[var(--border)] py-6 mb-8">
          <div className="meta-mono mb-2">Category</div>
          <div className="flex gap-0 overflow-x-auto flex-wrap">
            <button
              onClick={() => setCategoryFilter('')}
              className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                !categoryFilter
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                  : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
              }`}
            >
              全部 ({tasks.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                  cat === categoryFilter
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                    : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 管理员：创建按钮 + 待审核 */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
          >
            <Plus className="w-3 h-3" />
            {showCreateForm ? '取消' : '创建任务'}
          </button>
          {pendingClaims.length > 0 && (
            <span className="meta-mono text-[11px] text-[var(--primary)]">
              待审核: {pendingClaims.length}
            </span>
          )}
        </div>
      )}

      {/* 创建表单 */}
      {showCreateForm && isAdmin && (
        <form onSubmit={handleCreate} className="border border-[var(--border)] p-6 sm:p-8 mb-8 space-y-4">
          <div>
            <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 01 ] 任务标题</label>
            <input
              value={newTask.title}
              onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="例如：更新社团 Wiki 页面"
              required
            />
          </div>
          <div>
            <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 02 ] 任务描述</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))}
              className={INPUT_CLASS}
              rows={3}
              placeholder="详细描述任务内容和要求..."
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 03 ] 分类</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask((f) => ({ ...f, category: e.target.value }))}
                className={INPUT_CLASS}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 04 ] 积分奖励</label>
              <input
                type="number"
                value={newTask.points}
                onChange={(e) => setNewTask((f) => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                className={INPUT_CLASS}
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 05 ] 认领上限</label>
              <input
                type="number"
                value={newTask.maxClaimants}
                onChange={(e) => setNewTask((f) => ({ ...f, maxClaimants: parseInt(e.target.value) || 1 }))}
                className={INPUT_CLASS}
                min={1}
                max={50}
              />
            </div>
          </div>
          <div>
            <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 06 ] 标签（逗号分隔）</label>
            <input
              value={newTask.tags}
              onChange={(e) => setNewTask((f) => ({ ...f, tags: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="React, TypeScript, 文档"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={creating}>
              {creating ? '创建中...' : '创建任务'}
            </Button>
          </div>
        </form>
      )}

      {/* 待审核认领 */}
      {isAdmin && pendingClaims.length > 0 && (
        <div className="border border-[var(--border)] p-6 mb-8">
          <div className="meta-mono mb-4">[ Pending Reviews ]</div>
          {pendingClaims.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
              <div>
                <span className="text-[13px] text-[var(--foreground)]">{c.displayName || c.userId}</span>
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-3">{c.createdAt}</span>
                {c.claimNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{c.claimNote}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(c.id, true)}
                  disabled={reviewingId === c.id}
                  className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors"
                >
                  ✓ 通过
                </button>
                <button
                  onClick={() => handleReview(c.id, false)}
                  disabled={reviewingId === c.id}
                  className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                >
                  ✗ 拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 任务列表 */}
      {tasksLoading ? (
        <SectionLoading label="Loading..." />
      ) : tasksError ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{tasksError}</div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ No Quest ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">暂无可认领的任务。</p>
        </div>
      ) : (
        <div className="space-y-0 border-t border-[var(--border)]">
          {filteredTasks.map((task, idx) => (
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
                    <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                      {CATEGORY_LABELS[task.category] || task.category}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--muted-foreground)] mt-2 line-clamp-2">
                    {task.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="flex items-center gap-1 meta-mono text-[11px] text-[var(--primary)]">
                    <Zap className="w-3 h-3" />
                    {task.points} 分
                  </span>
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {task.claimCount}/{task.maxClaimants}
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
                    {task.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {task.tags.map((tag, i) => (
                          <span key={`${tag}-${i}`} className="tag-badge">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
                      {user && task.status === 'published' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleClaim(task.id); }}
                          disabled={claimingId === task.id || task.claimCount >= task.maxClaimants}
                          className="text-[11px] px-4 py-2"
                        >
                          {task.claimCount >= task.maxClaimants ? '已满' : claimingId === task.id ? '认领中...' : '认领任务'}
                        </Button>
                      )}
                      {isAdmin && task.status === 'draft' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePublish(task.id); }}
                          className="px-3 py-1.5 text-[11px] font-mono border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
                        >
                          发布
                        </button>
                      )}
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                        {task.status === 'draft' ? '草稿' : task.publishedAt ? `发布于 ${task.publishedAt}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
