/**
 * @file Schema 卡配置集合 hook — 存 localStorage（wb_schema_widgets），读写均过校验器。
 */
'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/use-local-storage';
import { parseSchemaConfig, validateSchemaConfig, type SchemaWidgetConfig } from './widget-schema';

export interface AddResult {
  ok: boolean;
  errors?: string[];
}

export function useSchemaWidgets() {
  const [raw, setRaw] = useLocalStorage<unknown[]>('wb_schema_widgets', []);

  const configs = useMemo<SchemaWidgetConfig[]>(() => {
    if (!Array.isArray(raw)) return [];
    const out: SchemaWidgetConfig[] = [];
    for (const item of raw) {
      const parsed = parseSchemaConfig(item);
      if (parsed) out.push(parsed);
    }
    return out;
  }, [raw]);

  const add = useCallback(
    (input: unknown): AddResult => {
      const errors = validateSchemaConfig(input);
      if (errors.length > 0) return { ok: false, errors };
      const parsed = parseSchemaConfig(input);
      if (!parsed) return { ok: false, errors: ['配置无法解析'] };
      setRaw((prev) => [...(Array.isArray(prev) ? prev : []), parsed]);
      return { ok: true };
    },
    [setRaw],
  );

  const remove = useCallback(
    (id: string) => {
      setRaw((prev) =>
        (Array.isArray(prev) ? prev : []).filter((c) => (c as { id?: string })?.id !== id),
      );
    },
    [setRaw],
  );

  return { configs, add, remove };
}
