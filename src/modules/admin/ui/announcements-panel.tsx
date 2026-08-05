/**
 * @file 公告管理子面板 — 从 admin-messages-panel 拆出（GENERAL 2.4 按关注点拆分）
 *
 * 自包含公告的增删改查与表单渲染，父面板通过子 Tab 切换控制显隐。
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Eye, EyeOff, Save, Trash2, Loader2 } from 'lucide-react';
import { RevealItem } from '@/components/effects/motion-primitives';
import { SectionLoading } from '@/components';
import { useConfirm } from '@/components/primitives/confirm-dialog';

type AnnouncementLevel = 'info' | 'warning' | 'success' | 'error';

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  level: AnnouncementLevel;
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  expiresAt: string | null;
  targetRoles: string[] | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementForm {
  title: string;
  content: string;
  level: AnnouncementLevel;
  isDismissible: boolean;
  priority: number;
  expiresAt: string;
  targetRoles: string[];
}

const emptyForm: AnnouncementForm = {
  title: '',
  content: '',
  level: 'info',
  isDismissible: true,
  priority: 0,
  expiresAt: '',
  targetRoles: [],
};

const levelOptions: { value: AnnouncementLevel; label: string }[] = [
  { value: 'info', label: '信息' },
  { value: 'warning', label: '警告' },
  { value: 'success', label: '成功' },
  { value: 'error', label: '重要' },
];

/** 公告管理子面板 — 列表 + 新建/编辑表单 + 启用/删除 */
export function AnnouncementsPanel() {
  const { confirm } = useConfirm();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState<string | null>(null);
  const [annSuccess, setAnnSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnLoading(true);
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '获取公告列表失败');
      }
      const data = await res.json();
      setAnnouncements(data.items || []);
      setAnnError(null);
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setAnnLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const annShowSuccess = (msg: string) => {
    setAnnSuccess(msg);
    setTimeout(() => setAnnSuccess(null), 3000);
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content || '',
      level: a.level,
      isDismissible: a.isDismissible,
      priority: a.priority,
      expiresAt: a.expiresAt || '',
      targetRoles: a.targetRoles || [],
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleAnnSubmit = async () => {
    if (!form.title.trim()) {
      setAnnError('标题不能为空');
      return;
    }
    setSubmitting(true);
    setAnnError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        content: form.content.trim() || undefined,
        level: form.level,
        isDismissible: form.isDismissible,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
        targetRoles: form.targetRoles.length > 0 ? form.targetRoles : null,
      };
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/admin/announcements/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失败');
      annShowSuccess(editingId ? '公告已更新' : '公告已创建');
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '操作失败');
      }
      fetchAnnouncements();
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = async (a: Announcement) => {
    const confirmed = await confirm({
      title: '删除公告',
      message: `确定删除公告「${a.title}」？此操作不可撤销。`,
      variant: 'danger',
      confirmLabel: '确认删除',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '删除失败');
      }
      annShowSuccess('公告已删除');
      fetchAnnouncements();
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const levelBadge = (level: AnnouncementLevel) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, string> = {
      info: '信息', warning: '警告', success: '成功', error: '重要',
    };
    return (
      <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${colors[level] || colors.info}`}>
        {labels[level] || level}
      </span>
    );
  };

  return (
    <>
      {/* 操作栏 */}
      <RevealItem>
        <div className="py-5 flex items-center justify-between">
          <div className="meta-mono text-[var(--muted-foreground)]">[ {announcements.length} 条公告 ]</div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors"
          >
            <Plus size={14} />
            新建公告
          </button>
        </div>
      </RevealItem>

      {/* 提示信息 */}
      {annSuccess && (
        <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono text-[var(--muted-foreground)]">
          {annSuccess}
        </div>
      )}
      {annError && (
        <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
          {annError}
          <button onClick={() => setAnnError(null)} className="ml-2 underline">关闭</button>
        </div>
      )}

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="mt-4 p-4 border border-[var(--border)] bg-[var(--foreground)]/2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-mono tracking-wider text-[var(--muted-foreground)]">
              {editingId ? '编辑公告' : '新建公告'}
            </h3>
            <button onClick={resetForm} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">标题 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                className="w-full px-3 py-2 text-[12px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--foreground)]/30"
                placeholder="公告标题"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">内容</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                maxLength={5000}
                rows={3}
                className="w-full px-3 py-2 text-[12px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--foreground)]/30 resize-none"
                placeholder="可选，公告详细内容"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">级别</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as AnnouncementLevel })}
                  className="w-full px-2 py-2 text-[11px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                >
                  {levelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">优先级</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-full px-2 py-2 text-[11px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">过期时间</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt ? form.expiresAt.slice(0, 16) : ''}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-2 py-2 text-[11px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <label className="flex items-center gap-2 text-[11px] font-mono text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDismissible}
                    onChange={(e) => setForm({ ...form, isDismissible: e.target.checked })}
                    className="rounded"
                  />
                  可关闭
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-3 py-1.5 text-[11px] font-mono border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                取消
              </button>
              <button
                onClick={handleAnnSubmit}
                disabled={submitting || !form.title.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-[var(--foreground)] text-[var(--background)] hover:opacity-80 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? '保存修改' : '创建公告'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 公告列表 */}
      {annLoading ? (
        <SectionLoading label="加载中..." />
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center text-[12px] font-mono text-[var(--muted-foreground)]">
          暂无公告，点击「新建公告」创建第一条。
        </div>
      ) : (
        <div className="mt-4 border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--foreground)]/3">
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">标题</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">级别</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">状态</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">优先级</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">过期</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">创建</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/3 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-[12px] font-mono text-[var(--foreground)] truncate max-w-[300px]">{a.title}</div>
                      {a.content && (
                        <div className="text-[10px] font-mono text-[var(--muted-foreground)] truncate max-w-[300px] mt-0.5">
                          {a.content.slice(0, 80)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{levelBadge(a.level)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-mono ${a.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
                        {a.isActive ? '生效中' : '已关闭'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--muted-foreground)]">{a.priority}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--muted-foreground)]">
                      {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--muted-foreground)]">
                      {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(a)}
                          className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title="编辑"
                        >
                          <Save size={13} />
                        </button>
                        <button
                          onClick={() => toggleActive(a)}
                          className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title={a.isActive ? '关闭' : '激活'}
                        >
                          {a.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
