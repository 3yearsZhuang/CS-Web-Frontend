'use client';

/**
 * @file SubmitResourceModal — 提交资源弹窗（资源站子组件）
 *
 * 从 `app/tools/resource/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `ResourcesState` 提供（GENERAL 2.2）。
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import { EASE } from '@/shared/utils/ui-constants';
import type { ResourcesState, TFn, ResourceType } from './use-resources';
import { resourceTypeLabel } from './use-resources';

export function SubmitResourceModal(props: ResourcesState) {
  const t = useTranslations('toolsResource');
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
                {t('submit')}
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
                <p className="display-serif text-[18px] text-emerald-500 mb-2">{t('successTitle')}</p>
                <p className="text-[13px] text-[var(--muted-foreground)] mb-4">{t('successDesc')}</p>
                <button
                  onClick={closeSubmit}
                  className="meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">{t('fldTitle')}</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    maxLength={200}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)]"
                    placeholder={t('phTitle')}
                  />
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">{t('fldUrl')}</label>
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
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">{t('fldDesc')}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    maxLength={5000}
                    rows={3}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none resize-none placeholder:text-[var(--muted-foreground)]"
                    placeholder={t('phDesc')}
                  />
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">{t('fldType')}</label>
                  <select
                    value={form.resourceType}
                    onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value as ResourceType }))}
                    className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    {(['article', 'video', 'course', 'tool', 'book', 'other'] as const).map((key) => (
                      <option key={key} value={key}>{resourceTypeLabel(t, key)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">{t('fldAttach')}</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip"
                  />
                  {form.fileUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-emerald-500 meta-mono flex-1 truncate">{t('uploaded')}</span>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, fileUrl: '' }))}
                        className="text-[11px] px-2 py-1 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                      >
                        {t('remove')}
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
                      {uploading ? t('uploading') : t('uploadBtn')}
                    </button>
                  )}
                </div>

                <div>
                  <label className="block meta-mono text-[11px] text-[var(--muted-foreground)] mb-1.5">{t('fldTechTags')}</label>
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
                  {submitLoading ? t('submitting') : t('submitReview')}
                </button>

                <p className="meta-mono text-[10px] text-[var(--muted-foreground)] text-center">
                  {t('pendingHint')}
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
