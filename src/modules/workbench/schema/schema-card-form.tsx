/**
 * @file Schema 卡表单（受控）— Schema 管理卡内嵌，随管理卡一起渲染。
 * 面向普通成员：标题 / 类型 / 数据源（local key 或 api url）三要素即可建卡，
 * 无需手写 JSON。list 类型可选逗号分隔字段 key。
 * 表单状态由父级（SchemaWidgetRenderer）持有，以实现「调选项 → 实时预览」。
 */
'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { sizeOptionsFor, type SchemaFormDraft, type SchemaWidgetType } from './widget-schema';

const TYPE_OPTIONS: SchemaWidgetType[] = ['count', 'list', 'progress', 'countdown', 'note', 'link'];

export interface SchemaCardFormProps {
  draft: SchemaFormDraft;
  /** 更新表单草稿（实时预览据此渲染） */
  onChange: (patch: Partial<SchemaFormDraft>) => void;
  /** 保存当前草稿为一张 schema 卡 */
  onSave: () => void;
  /** 表单校验错误（父级算出传入） */
  errors: string[];
  /** 保存成功标记 */
  saved: boolean;
}

/** 受控表单：只暴露核心三要素，复杂选项（corner/sizeOptions/options）走 JSON 高级路径 */
export function SchemaCardForm({ draft, onChange, onSave, errors, saved }: SchemaCardFormProps) {
  const t = useTranslations('workbench');

  const sizeHint = useMemo(() => sizeOptionsFor(draft.type).join(' / '), [draft.type]);

  return (
    <div className="flex flex-col gap-3">
      <span className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {t('schemaFormTitle')}
      </span>

      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={draft.title}
          placeholder={t('schemaFormTitlePlaceholder')}
          className="w-full"
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('schemaFormTypeLabel')}
            className={`${INPUT_CLASS} w-auto text-[13px]`}
            value={draft.type}
            onChange={(e) => onChange({ type: e.target.value as SchemaWidgetType })}
          >
            {TYPE_OPTIONS.map((tpe) => (
              <option key={tpe} value={tpe}>
                {t(`schemaType_${tpe}`)}
              </option>
            ))}
          </select>
          <select
            aria-label={t('schemaFormDataLabel')}
            className={`${INPUT_CLASS} w-auto text-[13px]`}
            value={draft.dataKind}
            onChange={(e) => onChange({ dataKind: e.target.value as 'local' | 'api' })}
          >
            <option value="local">{t('schemaFormDataLocal')}</option>
            <option value="api">{t('schemaFormDataApi')}</option>
          </select>
          {draft.dataKind === 'local' ? (
            <Input
              type="text"
              value={draft.dataKey}
              placeholder={t('schemaFormKeyPlaceholder')}
              className="w-[180px]"
              onChange={(e) => onChange({ dataKey: e.target.value })}
            />
          ) : (
            <Input
              type="text"
              value={draft.apiUrl}
              placeholder={t('schemaFormUrlPlaceholder')}
              className="w-[240px]"
              onChange={(e) => onChange({ apiUrl: e.target.value })}
            />
          )}
        </div>
        {draft.type === 'list' && (
          <Input
            type="text"
            value={draft.fieldsText}
            placeholder={t('schemaFormFieldsPlaceholder')}
            className="w-full"
            onChange={(e) => onChange({ fieldsText: e.target.value })}
          />
        )}
        <p className="text-[11px] text-[var(--muted-foreground)]">
          {t('schemaFormSizeHint')} {sizeHint}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="pixel" onClick={onSave}>
          {t('schemaFormAdd')}
        </Button>
        {saved && <span className="text-[12px] text-emerald-600">{t('schemaFormAdded')}</span>}
        {errors.length > 0 && (
          <span className="text-[12px] text-[var(--destructive)]">{errors.join('；')}</span>
        )}
      </div>
    </div>
  );
}
