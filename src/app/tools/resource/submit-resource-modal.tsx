'use client';

/**
 * @file SubmitResourceModal — 提交资源弹窗（资源站子组件）
 *
 * 从 `app/tools/resource/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `ResourcesState` 提供（GENERAL 2.2）。
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Upload } from 'lucide-react';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import { EASE } from '@/shared/utils/ui-constants';
import type { ResourcesState } from './use-resources';
import { TYPE_LABELS } from './use-resources';

export function SubmitResourceModal(props: ResourcesState) {
  const {
    showSubmit,
    submitSuccess,
    submitError,
    submitLoading,
    uploading,
    form,
    setForm,
    fileInputRef,
    handleFileUpload,
    handleSubmit,
    closeSubmit,
  } = props;

  return (
    <AnimatePresence>
      {showSubmit && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSubmit}
        >
          <motion.div
            className="bg-[var(--background)] border border-[var(--border)] w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="display-serif text-[20px] text-[var(--foreground)]">
                提交资源
                <span className="ark-divider ml-2">Submit</span>
              </h2>
              <button
                onClick={closeSubmit}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-6 text-center">
                <p className="display-serif text-[18px] text-emerald-500 mb-2">提交成功！</p>
                <p className="text-[13px] text-[var(--muted-foreground)] mb-4">资源已提交，等待管理员审核后公开</p>
                <button
                  onClick={closeSubmit}
                  className="meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                >
                  关闭
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">标题 *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    maxLength={200}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)]"
                    placeholder="资源标题"
                  />
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">链接 *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    required
                    maxLength={2000}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)]"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">描述</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    maxLength={5000}
                    rows={3}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none resize-none placeholder:text-[var(--muted-foreground)]"
                    placeholder="简短描述这个资源..."
                  />
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">资源类型</label>
                  <select
                    value={form.resourceType}
                    onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value as keyof typeof TYPE_LABELS }))}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    {Object.entries(TYPE_LABELS)
                      .filter(([k]) => k !== 'all')
                      .map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">附件（可选）</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip"
                  />
                  {form.fileUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-emerald-500 meta-mono flex-1 truncate">已上传 ✓</span>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, fileUrl: '' }))}
                        className="text-[11px] px-2 py-1 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 text-[12px] px-3 py-2 border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? '上传中...' : '上传文件（≤10MB, jpg/png/pdf/zip）'}
                    </button>
                  )}
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">技术标签</label>
                  <div className="flex flex-wrap gap-2">
                    {TECH_TAGS.map((tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            techTags: f.techTags.includes(tag.key)
                              ? f.techTags.filter((t) => t !== tag.key)
                              : [...f.techTags, tag.key],
                          }))
                        }
                        className={`text-[11px] px-2 py-1 border transition-colors ${
                          form.techTags.includes(tag.key)
                            ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {submitError && <p className="text-[13px] text-red-400">{submitError}</p>}

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full meta-mono text-[12px] py-3 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors disabled:opacity-50"
                >
                  {submitLoading ? '提交中...' : '提交审核'}
                </button>

                <p className="meta-mono text-[10px] text-[var(--muted-foreground)] text-center">
                  提交后需管理员审核，审核通过后会公开显示
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
