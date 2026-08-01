/**
 * @file 活动模块设置 — 内联可折叠设置面板（嵌入 admin-events-panel，支持批量保存）
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components';
import { RevealItem } from '@/components/effects/motion-primitives';
import { INPUT_CLASS, EASE } from '@/shared/utils/ui-constants';

interface EventSettings {
  title_max: number;
  desc_max: number;
  month_max: number;
  date_max: number;
  year_max: number;
  tag_max: number;
  tags_max: number;
  content_max: number;
  default_capacity: number;
  max_capacity: number;
  default_page_size: number;
  max_page_size: number;
}

interface SettingField {
  key: keyof EventSettings;
  label: string;
  desc: string;
}

const FIELDS: SettingField[] = [
  { key: 'title_max', label: '标题最大长度', desc: '活动标题字符上限' },
  { key: 'desc_max', label: '描述最大长度', desc: '活动简介字符上限' },
  { key: 'month_max', label: '月份最大长度', desc: '月份字段字符上限' },
  { key: 'date_max', label: '日期最大长度', desc: '日期字段字符上限' },
  { key: 'year_max', label: '年份最大长度', desc: '年份字段字符上限' },
  { key: 'tag_max', label: '标签最大长度', desc: '单个标签字符上限' },
  { key: 'tags_max', label: '标签最大数量', desc: '每活动标签数上限' },
  { key: 'content_max', label: '内容最大长度', desc: 'Markdown 详情字符上限' },
  { key: 'default_capacity', label: '默认容量', desc: '新建活动默认容量 (0=不限)' },
  { key: 'max_capacity', label: '最大容量', desc: '单活动最大容量限制' },
  { key: 'default_page_size', label: '默认每页数量', desc: '活动列表默认每页条数' },
  { key: 'max_page_size', label: '最大每页数量', desc: '活动列表每页最大条数' },
];

/** 活动模块设置面板 Props */
export interface AdminEventsSettingsProps {
  /** 设置面板展开/关闭控制 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/** 活动模块设置面板 — 内联可折叠，支持逐项设置活动字段长度/容量/分页等参数 */
export function AdminEventsSettings({ open, onClose }: AdminEventsSettingsProps) {
  const router = useRouter();

  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editValues, setEditValues] = useState<Partial<EventSettings>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/events/settings', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || '加载失败');
      }
      const data = (await res.json()) as { settings: EventSettings };
      setSettings(data.settings);
      setEditValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (open) fetchSettings();
  }, [open, fetchSettings]);

  const handleFieldChange = (key: keyof EventSettings, value: string) => {
    const num = parseInt(value, 10);
    if (value === '' || Number.isNaN(num) || num < 0) {
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setEditValues((prev) => ({ ...prev, [key]: num }));
  };

  const getDisplayValue = (key: keyof EventSettings): number => {
    if (key in editValues && editValues[key] !== undefined) {
      return editValues[key] as number;
    }
    return settings?.[key] ?? 0;
  };

  const isDirty = (key: keyof EventSettings): boolean => {
    if (!settings) return false;
    const current = editValues[key];
    if (current === undefined) return false;
    return current !== settings[key];
  };

  const handleSaveField = async (key: keyof EventSettings) => {
    const value = editValues[key];
    if (value === undefined) return;

    setSaving(key);
    setError(null);
    try {
      const res = await fetch('/api/admin/events/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const data = (await res.json().catch(() => null)) as
        | { settings: EventSettings; error?: string }
        | null;
      if (!res.ok || !data?.settings) {
        throw new Error(data?.error || '保存失败');
      }
      setSettings(data.settings);
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showSuccess('已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const handleResetField = async (key: keyof EventSettings) => {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/settings?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => null)) as
        | { settings: EventSettings; error?: string }
        | null;
      if (!res.ok || !data?.settings) {
        throw new Error(data?.error || '重置失败');
      }
      setSettings(data.settings);
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showSuccess('已重置为默认值');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    const payload: Record<string, number> = {};
    for (const key of Object.keys(editValues) as (keyof EventSettings)[]) {
      const val = editValues[key];
      if (val !== undefined) payload[key] = val;
    }
    if (Object.keys(payload).length === 0) return;

    setSaving('__all__');
    setError(null);
    try {
      const res = await fetch('/api/admin/events/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { settings: EventSettings; error?: string }
        | null;
      if (!res.ok || !data?.settings) {
        throw new Error(data?.error || '保存失败');
      }
      setSettings(data.settings);
      setEditValues({});
      showSuccess('全部设置已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const dirtyCount = Object.keys(editValues).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="border-t border-[var(--border)]">
            <RevealItem>
              <div className="py-5 sm:py-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="section-marker">[ 99 ]</div>
                    <h3 className="display-serif text-[clamp(18px,2.5vw,24px)] text-[var(--foreground)] leading-[1.1]">
                      活动设置
                      <span className="display-serif italic text-[var(--muted-foreground)] ml-2 text-[clamp(12px,1.4vw,16px)]">
                        / Event Settings
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {dirtyCount > 0 && (
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleSaveAll}
                        disabled={saving === '__all__'}
                        loading={saving === '__all__'}
                      >
                        {saving === '__all__' ? 'Saving...' : `保存全部 (${dirtyCount}) →`}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[14px] leading-none"
                      aria-label="关闭设置"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {loading && (
                  <div className="py-12 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                      <span className="meta-mono text-[var(--muted-foreground)]">加载设置中...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
                    {error}
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="focus-amber ml-3 underline"
                    >
                      关闭
                    </button>
                  </div>
                )}

                {success && (
                  <div className="p-3 border-l-2 border-green-500 bg-green-500/[0.04] text-[12px] font-mono text-green-600 dark:text-green-400 mb-4">
                    {success}
                  </div>
                )}

                {!loading && settings && (
                  <div className="space-y-3">
                    {FIELDS.map((field) => {
                      const current = getDisplayValue(field.key);
                      const dirty = isDirty(field.key);
                      const fieldSaving = saving === field.key;

                      return (
                        <div
                          key={field.key}
                          className={`border ${
                            dirty ? 'border-[var(--primary)]/40 bg-[var(--primary)]/[0.02]' : 'border-[var(--border)]'
                          } p-3 sm:p-4`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            <div className="sm:col-span-4">
                              <div className="meta-mono text-[var(--muted-foreground)] text-[11px]">
                                {field.label}
                              </div>
                              <div className="text-[10px] font-mono text-[var(--muted-foreground)]/60 mt-0.5">
                                {field.desc}
                              </div>
                            </div>
                            <div className="sm:col-span-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={getDisplayValue(field.key)}
                                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                  className={`${INPUT_CLASS} px-3 py-1.5 text-[13px] w-24`}
                                  disabled={fieldSaving}
                                />
                                {dirty && (
                                  <span className="meta-mono text-[10px] text-[var(--primary)] shrink-0">
                                    Modified
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="sm:col-span-5 flex items-center gap-2">
                              {dirty && (
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={() => handleSaveField(field.key)}
                                  disabled={fieldSaving}
                                  loading={fieldSaving}
                                >
                                  Save
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResetField(field.key)}
                                disabled={fieldSaving}
                                className="focus-amber meta-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </RevealItem>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
