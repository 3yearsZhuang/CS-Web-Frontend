/**
 * @file Schema 配置驱动卡 — 类型 + 校验器（设计见 docs/workbench-schema-widget-design.md）。
 * 仅覆盖简单卡（count/list/progress/countdown/note/link）；
 * 复杂卡（SSE 流式 / 状态机 / 音频 / 加密 / 复杂图形）走手写组件，不进本 schema。
 */
'use client';

import type { WidgetSizeKey } from '../types';

export type SchemaWidgetType = 'count' | 'list' | 'progress' | 'countdown' | 'note' | 'link';

export interface SchemaField {
  key: string;
  /** 显示名，缺省用 key */
  label?: string;
  kind?: 'text' | 'date' | 'number' | 'status';
  /** list 行点击目标 href 模板，支持 {key} 插值，如 /tools/exam/{id} */
  href?: string;
}

export type SchemaData =
  | { kind: 'local'; key: string; default?: unknown }
  | { kind: 'api'; url: string; path?: string }
  | { kind: 'static'; value: unknown[] };

export interface SchemaWidgetConfig {
  /** 唯一 id（kebab-case） */
  id: string;
  /** 显示标题（成员自拟，暂不进 i18n） */
  title: string;
  /** 角标 2-3 字符，缺省取 type 缩写 */
  corner?: string;
  type: SchemaWidgetType;
  /** 缺省 1x2 */
  size?: WidgetSizeKey;
  sizeOptions?: WidgetSizeKey[];
  data: SchemaData;
  /** list 用 */
  fields?: SchemaField[];
  options?: {
    /** progress 目标值 */
    target?: number;
    /** countdown 目标日期字段名 */
    dateKey?: string;
    /** 计数/进度强调色 */
    accent?: 'primary' | 'destructive' | 'emerald';
  };
}

/** 各类型默认角标 */
const TYPE_CORNER: Record<SchemaWidgetType, string> = {
  count: 'CNT',
  list: 'LST',
  progress: 'PRG',
  countdown: 'CDN',
  note: 'NTE',
  link: 'LNK',
};

/** 各类型默认尺寸选项 */
const TYPE_SIZE_OPTIONS: Record<SchemaWidgetType, WidgetSizeKey[]> = {
  count: ['1x1', '1x2', '2x1', '2x2'],
  list: ['1x1', '1x2', '2x1', '2x2', '2x3'],
  progress: ['1x1', '1x2', '2x1', '2x2'],
  countdown: ['1x1', '1x2', '2x1', '2x2'],
  note: ['1x1', '1x2', '2x1', '2x2'],
  link: ['1x1', '1x2', '2x1', '2x2'],
};

const TYPES: SchemaWidgetType[] = ['count', 'list', 'progress', 'countdown', 'note', 'link'];
const SIZE_KEYS: WidgetSizeKey[] = ['1x1', '1x2', '2x1', '2x2', '1x3', '2x3', '3x2', 'full'];

/** api 数据源白名单前缀（不新增后端路由，规避契约门禁） */
const API_PREFIXES = ['/api/workbench/', '/api/tools/'];

export function cornerFor(type: SchemaWidgetType, corner?: string): string {
  return (corner || TYPE_CORNER[type]).slice(0, 3);
}

export function sizeOptionsFor(type: SchemaWidgetType, opts?: WidgetSizeKey[]): WidgetSizeKey[] {
  return opts && opts.length > 0 ? opts : TYPE_SIZE_OPTIONS[type];
}

/** 校验单个配置，返回错误消息数组（空 = 合法） */
export function validateSchemaConfig(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return ['配置必须是对象'];
  const c = input as Record<string, unknown>;

  if (typeof c.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(c.id)) {
    errors.push('id 必须是小写 kebab-case（如 courses-left）');
  }
  if (typeof c.title !== 'string' || !c.title.trim()) errors.push('title 不能为空');
  if (typeof c.type !== 'string' || !TYPES.includes(c.type as SchemaWidgetType)) {
    errors.push('type 必须是 count / list / progress / countdown / note / link 之一');
  }
  if (c.size != null && !SIZE_KEYS.includes(c.size as WidgetSizeKey)) errors.push('size 不合法');

  const data = c.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    errors.push('data 不能为空');
  } else if (data.kind === 'local') {
    if (typeof data.key !== 'string' || !data.key.startsWith('wb_')) {
      errors.push('local 数据源 key 必须以 wb_ 前缀');
    }
  } else if (data.kind === 'api') {
    if (typeof data.url !== 'string' || !data.url.trim()) {
      errors.push('api 数据源 url 必须为字符串');
    } else if (!API_PREFIXES.some((p) => (data.url as string).startsWith(p))) {
      errors.push(`api url 仅允许前缀：${API_PREFIXES.join(' / ')}`);
    } else if ((data.url as string).includes('${')) {
      errors.push('api url 不允许模板注入');
    }
  } else if (data.kind === 'static') {
    if (!Array.isArray(data.value)) errors.push('static 数据源 value 必须为数组');
  } else {
    errors.push('data.kind 必须是 local / api / static 之一');
  }

  if (c.type === 'list' && !Array.isArray(c.fields)) errors.push('list 类型必须声明 fields');
  return errors;
}

/** 校验并窄化为合法配置；非法返回 null（错误详情见 validateSchemaConfig） */
export function parseSchemaConfig(input: unknown): SchemaWidgetConfig | null {
  return validateSchemaConfig(input).length === 0 ? (input as SchemaWidgetConfig) : null;
}
