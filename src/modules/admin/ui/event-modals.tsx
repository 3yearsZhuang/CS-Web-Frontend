/**
 * @file 管理员活动 — 模态框集合（创建/编辑、报名列表、删除确认）
 * 从 admin-events-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components';
import { MarkdownEditorBase } from '@/modules/community/ui/forum-markdown-editor-base';
import { MarkdownRenderer } from '@/modules/community/ui/forum-markdown-renderer';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import type { EventForm, EventItem, RegistrationRecord } from '@/modules/admin/ui/types';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';
import { splitTags, type EventModal } from './events-panel-utils';

interface EventModalsProps {
  modal: EventModal;
  eventForm: EventForm | null;
  setEventForm: React.Dispatch<React.SetStateAction<EventForm | null>>;
  eventSaving: boolean;
  eventError: string | null;
  eventDeleteSaving: boolean;
  eventFormTab: 'edit' | 'preview';
  setEventFormTab: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>;
  registrations: RegistrationRecord[];
  registrationsLoading: boolean;
  regManageSaving: string | null;
  onFormSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
  onExportCsv: (event: EventItem, records: RegistrationRecord[]) => void;
  onManageRegistration: (
    eventId: string,
    registrationId: string,
    status: 'cancelled' | 'waitlisted' | 'registered',
  ) => void;
}

/** 活动创建/编辑/报名/删除模态框集合 */
export function EventModals({
  modal,
  eventForm,
  setEventForm,
  eventSaving,
  eventError,
  eventDeleteSaving,
  eventFormTab,
  setEventFormTab,
  registrations,
  registrationsLoading,
  regManageSaving,
  onFormSubmit,
  onDelete,
  onClose,
  onExportCsv,
  onManageRegistration,
}: EventModalsProps) {
  // 内部保留一个本地 form 引用（modal 内编辑时使用）
  const [localForm, setLocalForm] = useState<EventForm | null>(null);

  const form = eventForm ?? localForm;
  const setForm = (updater: React.SetStateAction<EventForm | null>) => {
    if (eventForm !== null) setEventForm(updater);
    else setLocalForm(updater);
  };

  return (
    <>
      {/* ============ 模态框：报名列表 ============ */}
      {modal.type === 'eventRegistrations' && (
        <ModalShell title={`[ 报名列表 / Registrations · ${modal.event.title} ]`} onClose={onClose}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="meta-mono text-[12px] text-[var(--muted-foreground)]">
                {registrationsLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${registrations.length} 人已报名`
                )}
              </div>
              {registrations.length > 0 && (
                <Button size="sm" type="button" onClick={() => onExportCsv(modal.event, registrations)}>
                  CSV 导出 / Export
                </Button>
              )}
            </div>

            {registrationsLoading && registrations.length === 0 ? (
              <div className="py-12 flex items-center justify-center">
                <span className="meta-mono text-[var(--muted-foreground)]">加载报名数据中...</span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="py-12 text-center border border-[var(--border)]">
                <p className="meta-mono text-[var(--muted-foreground)]">暂无报名记录</p>
              </div>
            ) : (
              <div className="border border-[var(--border)] overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/[0.3]">
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">#</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">姓名 / Name</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">邮箱 / Email</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">状态 / Status</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">报名时间</th>
                      {modal.event.registrationFields && modal.event.registrationFields.length > 0 &&
                        modal.event.registrationFields.map((f) => (
                          <th key={f.key} className="text-left meta-mono py-3 px-4 text-[11px]">{f.label}</th>
                        ))
                      }
                      <th className="text-right meta-mono py-3 px-4 text-[11px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((r, idx) => (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-0 card-minimal">
                        <td className="py-3 px-4 meta-mono text-[var(--muted-foreground)]">{idx + 1}</td>
                        <td className="py-3 px-4 text-[14px] text-[var(--foreground)] font-mono">{r.displayName || '—'}</td>
                        <td className="py-3 px-4 meta-mono text-[var(--muted-foreground)]">{r.email || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                            r.status === 'registered'
                              ? 'border-[var(--primary)]/30 text-[var(--primary)]'
                              : r.status === 'cancelled'
                                ? 'border-[var(--destructive)]/30 text-[var(--destructive)]'
                                : 'border-[var(--border)] text-[var(--muted-foreground)]'
                          }`}>
                            {r.status === 'registered' ? '已报名' : r.status === 'cancelled' ? '已取消' : '候补'}
                          </span>
                        </td>
                        <td className="py-3 px-4 meta-mono text-[var(--muted-foreground)]">{formatDate(r.registeredAt)}</td>
                        {modal.event.registrationFields && modal.event.registrationFields.length > 0 &&
                          modal.event.registrationFields.map((f) => (
                            <td key={f.key} className="py-3 px-4 meta-mono text-[var(--muted-foreground)] text-[12px]">
                              {r.formData?.[f.key] || '—'}
                            </td>
                          ))
                        }
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {r.status !== 'cancelled' && (
                              <button
                                type="button"
                                disabled={regManageSaving === r.id}
                                onClick={() => onManageRegistration(modal.event.id, r.id, 'cancelled')}
                                className="meta-mono text-[10px] text-[var(--destructive)] hover:text-[var(--destructive)]/70 underline-grow focus-amber"
                              >
                                {regManageSaving === r.id ? '...' : '取消'}
                              </button>
                            )}
                            {r.status !== 'registered' && r.status !== 'waitlisted' && (
                              <button
                                type="button"
                                disabled={regManageSaving === r.id}
                                onClick={() => onManageRegistration(modal.event.id, r.id, 'registered')}
                                className="meta-mono text-[10px] text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow focus-amber"
                              >
                                {regManageSaving === r.id ? '...' : '恢复'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* ============ 模态框：创建 / 编辑活动（桌面端双列布局） ============ */}
      {(modal.type === 'eventCreate' || modal.type === 'eventEdit') && form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-[var(--shadow-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)] shrink-0">
              <div className="meta-mono text-[var(--primary)]">
                {modal.type === 'eventCreate' ? '[ Create Event ]' : '[ Edit Event ]'}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[14px] leading-none"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <div className="px-5 sm:px-6 py-6 overflow-y-auto flex-1">
              <form onSubmit={onFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  {/* 标题 — 跨两列 */}
                  <div className="md:col-span-2">
                    <Field label="标题 / Title" count={`${form.title.length}/120`}>
                      <input
                        type="text"
                        value={form.title}
                        maxLength={120}
                        onChange={(e) => setForm((f) => ({ ...f!, title: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="例如：秋季招新"
                        autoFocus
                      />
                    </Field>
                  </div>

                  {/* 描述 — 跨两列 */}
                  <div className="md:col-span-2">
                    <Field label="描述 / Description" count={`${form.description.length}/500`}>
                      <textarea
                        value={form.description}
                        maxLength={500}
                        rows={3}
                        onChange={(e) => setForm((f) => ({ ...f!, description: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                        placeholder="一句话介绍活动内容"
                      />
                    </Field>
                  </div>

                  {/* 月份 / 日期 */}
                  <>
                    <Field label="月份 / Month" count={`${form.month.length}/8`}>
                      <input
                        type="text"
                        value={form.month}
                        maxLength={8}
                        onChange={(e) => setForm((f) => ({ ...f!, month: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="Sep"
                      />
                    </Field>
                    <Field label="日期 / Date" count={`${form.date.length}/32`}>
                      <input
                        type="text"
                        value={form.date}
                        maxLength={32}
                        onChange={(e) => setForm((f) => ({ ...f!, date: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="2026.09.15"
                      />
                    </Field>
                  </>

                  {/* 年份 */}
                  <div className="md:col-span-2">
                    <Field label="年份 / Year" count={`${form.year.length}/8`}>
                      <input
                        type="text"
                        value={form.year}
                        maxLength={8}
                        onChange={(e) => setForm((f) => ({ ...f!, year: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="2025"
                      />
                    </Field>
                  </div>

                  {/* 状态 */}
                  <div className="md:col-span-2">
                    <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 状态 / Status ]</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { v: '', label: '未设置' },
                          { v: 'upcoming', label: '即将开始' },
                          { v: 'ongoing', label: '进行中' },
                          { v: 'ended', label: '已结束' },
                        ] as { v: EventForm['status']; label: string }[]
                      ).map((s) => (
                        <button
                          key={s.v || 'none'}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f!, status: s.v }))}
                          className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                            form.status === s.v
                              ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 主题（逗号分隔） */}
                  <Field label="主题 / Topics" count={`${splitTags(form.topicsStr).length}/10`}>
                    <input
                      type="text"
                      value={form.topicsStr}
                      onChange={(e) => setForm((f) => ({ ...f!, topicsStr: e.target.value }))}
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="Recruiting, Open House"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">逗号分隔，单主题≤40字符</p>
                  </Field>

                  {/* 标签（逗号分隔） */}
                  <Field label="标签 / Tags" count={`${splitTags(form.tagsStr).length}/10`}>
                    <input
                      type="text"
                      value={form.tagsStr}
                      onChange={(e) => setForm((f) => ({ ...f!, tagsStr: e.target.value }))}
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="Hackathon, 24h"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">逗号分隔，单标签≤40字符</p>
                  </Field>

                  {/* 置顶 */}
                  <div>
                    <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 置顶 / Pinned ]</div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => (f ? { ...f, isPinned: !f.isPinned } : f))}
                      className={`focus-amber px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border transition-colors w-full ${
                        form.isPinned
                          ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                      }`}
                    >
                      {form.isPinned ? '📌 已置顶' : '置顶 / Pin'}
                    </button>
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">置顶活动将始终排在最前</p>
                  </div>

                  {/* 活动容量 */}
                  <Field label="容量 / Capacity">
                    <input
                      type="number"
                      value={form.capacity}
                      min={0}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f!,
                          capacity: Number.isNaN(e.target.valueAsNumber)
                            ? 0
                            : Math.max(0, e.target.valueAsNumber),
                        }))
                      }
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="0 = 不限"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">0 表示不限名额</p>
                  </Field>

                  {/* 活动详情 Markdown — 跨两列 */}
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-0 mb-2">
                      <button
                        type="button"
                        onClick={() => setEventFormTab('edit')}
                        className={`focus-amber px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                          eventFormTab === 'edit'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        编辑 / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventFormTab('preview')}
                        className={`focus-amber px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors -ml-px ${
                          eventFormTab === 'preview'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        预览 / Preview
                      </button>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-auto">
                        {form.contentMarkdown.length}/10000
                      </span>
                    </div>
                    {eventFormTab === 'edit' ? (
                      <MarkdownEditorBase
                        value={form.contentMarkdown}
                        onChange={(v) => setForm((f) => ({ ...f!, contentMarkdown: v }))}
                        placeholder={'可选 — 活动详情 Markdown，渲染在活动详情页 Details 区\n\n## 示例\n- 时间地点\n- 议程安排\n- 注意事项'}
                        rows={6}
                      />
                    ) : (
                      <div className="border border-[var(--border)] p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
                        {form.contentMarkdown.trim() ? (
                          <MarkdownRenderer content={form.contentMarkdown} />
                        ) : (
                          <p className="meta-mono text-[var(--muted-foreground)] text-center py-8">
                            暂无内容 — 切换到「编辑」Tab 写入 Markdown
                          </p>
                        )}
                      </div>
                    )}
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      支持 Markdown 语法，最多 10000 字符；不填则不显示 Details 区
                    </p>
                  </div>
                </div>

                {eventError && (
                  <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                    {eventError}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <Button type="submit" disabled={eventSaving} loading={eventSaving}>
                    {eventSaving
                      ? '保存中 / Saving...'
                      : modal.type === 'eventCreate'
                        ? '创建活动 / Create Event →'
                        : '保存更改 / Save Changes →'}
                  </Button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ 模态框：删除活动确认 ============ */}
      <ConfirmDialog
        open={modal.type === 'eventDelete'}
        title="删除活动"
        message="确认删除该活动？此操作不可撤销。"
        variant="danger"
        confirmLabel={eventDeleteSaving ? '删除中...' : '确认删除'}
        loading={eventDeleteSaving}
        onConfirm={onDelete}
        onCancel={onClose}
      >
        {modal.type === 'eventDelete' && (
          <>
            <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
              <div className="text-[13px] font-mono text-[var(--foreground)] break-all">{modal.event.title}</div>
              {modal.event.description && (
                <div className="meta-mono text-[var(--muted-foreground)] break-all mt-1">{modal.event.description}</div>
              )}
            </div>
            {eventError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {eventError}
              </div>
            )}
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
