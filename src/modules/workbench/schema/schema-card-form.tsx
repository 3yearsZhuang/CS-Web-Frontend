/**
 * @file Schema 卡简易表单 — 布局设置面板内嵌「添加 Schema 卡」。
 * 面向普通成员：标题 / 类型 / 数据源（local key 或 api url）三要素即可建卡，
 * 无需手写 JSON。list 类型可选逗号分隔字段 key；提交经校验器，错误就地展示。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useSchemaWidgets } from './use-schema-widgets';
import { sizeOptionsFor, type SchemaWidgetType } from './widget-schema';

const TYPE_OPTIONS: SchemaWidgetType[] = ['count', 'list', 'progress', 'countdown', 'note', 'link'];

/** 简易表单：只暴露核心三要素，复杂选项（corner/sizeOptions/options）走 JSON 高级路径 */
export function SchemaCardForm() {
  const t = useTranslations('workbench');
  const { configs, add, remove } = useSchemaWidgets();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<SchemaWidgetType>('count');
  const [dataKind, setDataKind] = useState<'local' | 'api'>('local');
  const [dataKey, setDataKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [fieldsText, setFieldsText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [added, setAdded] = useState(false);

  const reset = useCallback(() => {
    setTitle('');
    setDataKey('');
    setApiUrl('');
    setFieldsText('');
    setErrors([]);
    setAdded(false);
  }, []);

  const submit = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrors([t('schemaFormTitleRequired')]);
      return;
    }
    const config = {
      id: trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `card-${Date.now()}`,
      title: trimmedTitle,
      type,
      data:
        dataKind === 'local'
          ? { kind: 'local', key: dataKey.trim().startsWith('wb_') ? dataKey.trim() : `wb_${dataKey.trim() || 'data'}` }
          : { kind: 'api', url: apiUrl.trim() },
      ...(type === 'list' && fieldsText.trim()
        ? { fields: fieldsText.split(',').map((s) => s.trim()).filter(Boolean).map((key) => ({ key })) }
        : {}),
    };
    const res = add(config);
    if (!res.ok) {
      setErrors(res.errors ?? ['配置无效']);
      setAdded(false);
      return;
    }
    setErrors([]);
    setAdded(true);
    reset();
  }, [title, type, dataKind, dataKey, apiUrl, fieldsText, add, reset, t]);

  const sizeHint = useMemo(() => {
    const opts = sizeOptionsFor(type);
    return opts.join(' / ');
  }, [type]);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 mt-1">
      <span className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {t('schemaFormTitle')}
      </span>

      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={title}
          placeholder={t('schemaFormTitlePlaceholder')}
          className="w-full"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('schemaFormTypeLabel')}
            className={`${INPUT_CLASS} w-auto text-[13px]`}
            value={type}
            onChange={(e) => setType(e.target.value as SchemaWidgetType)}
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
            value={dataKind}
            onChange={(e) => setDataKind(e.target.value as 'local' | 'api')}
          >
            <option value="local">{t('schemaFormDataLocal')}</option>
            <option value="api">{t('schemaFormDataApi')}</option>
          </select>
          {dataKind === 'local' ? (
            <Input
              type="text"
              value={dataKey}
              placeholder={t('schemaFormKeyPlaceholder')}
              className="w-[180px]"
              onChange={(e) => setDataKey(e.target.value)}
            />
          ) : (
            <Input
              type="text"
              value={apiUrl}
              placeholder={t('schemaFormUrlPlaceholder')}
              className="w-[240px]"
              onChange={(e) => setApiUrl(e.target.value)}
            />
          )}
        </div>
        {type === 'list' && (
          <Input
            type="text"
            value={fieldsText}
            placeholder={t('schemaFormFieldsPlaceholder')}
            className="w-full"
            onChange={(e) => setFieldsText(e.target.value)}
          />
        )}
        <p className="text-[11px] text-[var(--muted-foreground)]">
          {t('schemaFormSizeHint')} {sizeHint}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="pixel" onClick={submit}>
          {t('schemaFormAdd')}
        </Button>
        {added && <span className="text-[12px] text-emerald-600">{t('schemaFormAdded')}</span>}
        {errors.length > 0 && (
          <span className="text-[12px] text-[var(--destructive)]">{errors.join('；')}</span>
        )}
      </div>

      {configs.length > 0 && (
        <ul className="flex flex-col gap-1">
          {configs.map((cfg) => (
            <li key={cfg.id} className="flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
              <span className="meta-mono text-[11px]">{cfg.id}</span>
              <span className="truncate flex-1">{cfg.title}</span>
              <button
                type="button"
                aria-label="delete schema card"
                className="shrink-0 p-1 rounded hover:bg-[var(--border)]"
                onClick={() => remove(cfg.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
