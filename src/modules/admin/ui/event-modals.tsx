/**
 * @file 管理员活动 — 模态框集合（创建/编辑、报名列表、删除确认）
 * 从 admin-events-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Spinner, Button } from '@/components';
import { MarkdownEditorBase } from '@/modules/community/ui/community-markdown-editor-base';
import { MarkdownRenderer } from '@/modules/community/ui/community-markdown-renderer';
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
  const t = useTranslations('adminEvents');
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
        <ModalShell title={t('registrationsTitle', { title: modal.event.title })} onClose={onClose}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="meta-mono text-[12px] text-[var(--muted-foreground)]">
                {registrationsLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner />
                    Loading...
                  </span>
                ) : (
                  t('registrationsCount', { count: registrations.length })
                )}
              </div>
              {registrations.length > 0 && (
                <Button size="sm" type="button" onClick={() => onExportCsv(modal.event, registrations)}>
                  {t('csvExport')}
                </Button>
              )}
            </div>

            {registrationsLoading && registrations.length === 0 ? (
              <div className="py-12 flex items-center justify-center">
                <span className="meta-mono text-[var(--muted-foreground)]">{t('loadingRegistrations')}</span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="py-12 text-center border border-[var(--border)]">
                <p className="meta-mono text-[var(--muted-foreground)]">{t('noRegistrations')}</p>
              </div>
            ) : (
              <div className="border border-[var(--border)] overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/[0.3]">
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">#</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">{t('colName')}</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">{t('colEmail')}</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">{t('colStatus')}</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">{t('colRegisteredAt')}</th>
                      {modal.event.registrationFields && modal.event.registrationFields.length > 0 &&
                        modal.event.registrationFields.map((f) => (
                          <th key={f.key} className="text-left meta-mono py-3 px-4 text-[11px]">{f.label}</th>
                        ))
                      }
                      <th className="text-right meta-mono py-3 px-4 text-[11px]">{t('colActions')}</th>
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
                            {r.status === 'registered' ? t('statusRegistered') : r.status === 'cancelled' ? t('statusCancelled') : t('statusWaitlisted')}
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
                                {regManageSaving === r.id ? '...' : t('cancelRegistration')}
                              </button>
                            )}
                            {r.status !== 'registered' && r.status !== 'waitlisted' && (
                              <button
                                type="button"
                                disabled={regManageSaving === r.id}
                                onClick={() => onManageRegistration(modal.event.id, r.id, 'registered')}
                                className="meta-mono text-[10px] text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow focus-amber"
                              >
                                {regManageSaving === r.id ? '...' : t('restoreRegistration')}
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
        <ModalShell
          title={modal.type === 'eventCreate' ? '[ Create Event ]' : '[ Edit Event ]'}
          onClose={onClose}
          size="lg"
          scrollable
        >
              <form onSubmit={onFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  {/* 标题 — 跨两列 */}
                  <div className="md:col-span-2">
                    <Field label={t('fieldTitle')} count={`${form.title.length}/120`}>
                      <input
                        type="text"
                        value={form.title}
                        maxLength={120}
                        onChange={(e) => setForm((f) => ({ ...f!, title: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder={t('titlePlaceholder')}
                        autoFocus
                      />
                    </Field>
                  </div>

                  {/* 描述 — 跨两列 */}
                  <div className="md:col-span-2">
                    <Field label={t('fieldDescription')} count={`${form.description.length}/500`}>
                      <textarea
                        value={form.description}
                        maxLength={500}
                        rows={3}
                        onChange={(e) => setForm((f) => ({ ...f!, description: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                        placeholder={t('descPlaceholder')}
                      />
                    </Field>
                  </div>

                  {/* 月份 / 日期 */}
                  <>
                    <Field label={t('fieldMonth')} count={`${form.month.length}/8`}>
                      <input
                        type="text"
                        value={form.month}
                        maxLength={8}
                        onChange={(e) => setForm((f) => ({ ...f!, month: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="Sep"
                      />
                    </Field>
                    <Field label={t('fieldDate')} count={`${form.date.length}/32`}>
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
                    <Field label={t('fieldYear')} count={`${form.year.length}/8`}>
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
                    <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('fieldStatus')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { v: '', label: t('statusUnset') },
                          { v: 'upcoming', label: t('statusUpcoming') },
                          { v: 'ongoing', label: t('statusOngoing') },
                          { v: 'ended', label: t('statusEnded') },
                        ] as { v: EventForm['status']; label: string }[]
                      ).map((s) => (
                        <button
                          key={s.v || 'none'}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f!, status: s.v }))}
                          className={`tab-chip focus-ring ${form.status === s.v ? 'tab-chip-active' : ''}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 主题（逗号分隔） */}
                  <Field label={t('fieldTopics')} count={`${splitTags(form.topicsStr).length}/10`}>
                    <input
                      type="text"
                      value={form.topicsStr}
                      onChange={(e) => setForm((f) => ({ ...f!, topicsStr: e.target.value }))}
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="Recruiting, Open House"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">{t('topicsHint')}</p>
                  </Field>

                  {/* 标签（逗号分隔） */}
                  <Field label={t('fieldTags')} count={`${splitTags(form.tagsStr).length}/10`}>
                    <input
                      type="text"
                      value={form.tagsStr}
                      onChange={(e) => setForm((f) => ({ ...f!, tagsStr: e.target.value }))}
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="Hackathon, 24h"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">{t('tagsHint')}</p>
                  </Field>

                  {/* 置顶 */}
                  <div>
                    <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('fieldPinned')}</div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => (f ? { ...f, isPinned: !f.isPinned } : f))}
                      className={`tab-chip focus-ring w-full ${form.isPinned ? 'tab-chip-active' : ''}`}
                    >
                      {form.isPinned ? t('pinnedOn') : t('pinnedOff')}
                    </button>
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">{t('pinnedHint')}</p>
                  </div>

                  {/* 活动容量 */}
                  <Field label={t('fieldCapacity')}>
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
                      placeholder={t('capacityPlaceholder')}
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">{t('capacityHint')}</p>
                  </Field>

                  {/* 活动详情 Markdown — 跨两列 */}
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-0 mb-2">
                      <button
                        type="button"
                        onClick={() => setEventFormTab('edit')}
                        className={`tab-chip focus-ring ${eventFormTab === 'edit' ? 'tab-chip-active' : ''}`}
                      >
                        {t('tabEdit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventFormTab('preview')}
                        className={`tab-chip focus-ring -ml-px ${eventFormTab === 'preview' ? 'tab-chip-active' : ''}`}
                      >
                        {t('tabPreview')}
                      </button>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-auto">
                        {form.contentMarkdown.length}/10000
                      </span>
                    </div>
                    {eventFormTab === 'edit' ? (
                      <MarkdownEditorBase
                        value={form.contentMarkdown}
                        onChange={(v) => setForm((f) => ({ ...f!, contentMarkdown: v }))}
                        placeholder={t('contentPlaceholder')}
                        rows={6}
                      />
                    ) : (
                      <div className="border border-[var(--border)] p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
                        {form.contentMarkdown.trim() ? (
                          <MarkdownRenderer content={form.contentMarkdown} />
                        ) : (
                          <p className="meta-mono text-[var(--muted-foreground)] text-center py-8">
                            {t('noContent')}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      {t('contentHint')}
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
                      ? t('saving')
                      : modal.type === 'eventCreate'
                        ? t('createEventBtn')
                        : t('saveChangesBtn')}
                  </Button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
        </ModalShell>
      )}

      {/* ============ 模态框：删除活动确认 ============ */}
      <ConfirmDialog
        open={modal.type === 'eventDelete'}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        variant="danger"
        confirmLabel={eventDeleteSaving ? t('deleting') : t('confirmDelete')}
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
