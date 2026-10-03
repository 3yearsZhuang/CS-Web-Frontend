/**
 * @file ArchiveIndex 数据模型 — Rhine 档案柜共享类型与文本派生（FrontDoc-UID §17）
 *
 * 与业务数据解耦：业务页（如 /tools/resource）负责把领域对象映射为 ArchiveEntry，
 * 本文件只提供展示层共用的类型与文本派生（概述/记录/元数据），无业务依赖。
 */

/** 档案条目（展示层模型） */
export interface ArchiveEntry {
  /** 编号（如 A-001 / R-012），同组内唯一 */
  id: string;
  title: string;
  /** 英文副标（可选） */
  en?: string;
  /** 编目/负责人（可选） */
  owner?: string;
  /** 标签（可选） */
  tags?: string[];
  /** 日期（可选，建议 YYYY-MM-DD） */
  date?: string;
  /** 概述正文（可选，缺省时由派生函数生成兜底文案） */
  summary?: string;
  /** 编目记录 [时间, 事件]（可选） */
  records?: ReadonlyArray<readonly [string, string]>;
  /** 元数据文本（可选） */
  meta?: string;
  /** 外链（真实资源站的 url；存在时详情页显示"打开原链"） */
  href?: string;
}

/** 档案分类 */
export interface ArchiveGroup {
  /** 编号前缀，如 'A'（侧栏显示为 `A-001` 的前缀） */
  key: string;
  name: string;
  en: string;
  items: ArchiveEntry[];
}

/** 文案集合（可用 i18n 覆盖） */
export interface ArchiveLabels {
  headerCrumb: string;
  categoryLabel: string;
  /** 类别轨可见标题（如 CATEGORY） */
  catRailTitle: string;
  listLabel: string;
  currentLabel: string;
  /** 侧栏无障碍名称（可见标题为 currentLabel） */
  asideLabel: string;
  search: string;
  /** 检索输入框无障碍名称 */
  searchInputLabel: string;
  /** 检索覆盖层无障碍名称 */
  searchDialogLabel: string;
  saved: string;
  owner: string;
  date: string;
  status: string;
  statusOpen: string;
  access: string;
  empty: string;
  placeholder: string;
  hintCat: string;
  hintPage: string;
  hintOpen: string;
  hintBack: string;
  backHref?: string;
  backLabel: string;
  tabSummary: string;
  tabRecords: string;
  tabMeta: string;
  actionSave: string;
  actionSaved: string;
  actionExport: string;
  actionOpenLink: string;
  actionBack: string;
  detailCrumb: string;
  modelCaption: string;
  favEmpty: string;
  searchHint: string;
  noMatch: string;
}

/** 概述（缺省兜底） */
export function summaryOf(it: ArchiveEntry): string {
  if (it.summary) return it.summary;
  return `档案 ${it.id}「${it.title}」暂无概述。` +
    (it.owner ? `编目：${it.owner}。` : '') +
    (it.tags?.length ? `标签：${it.tags.join(' / ')}。` : '');
}

/** 编目记录（缺省兜底为单条占位） */
export function recordsOf(it: ArchiveEntry): ReadonlyArray<readonly [string, string]> {
  if (it.records?.length) return it.records;
  return [[it.date ?? '—', '档案已编目，当前状态：可访问。']];
}

/** 元数据文本（导出与 META 页共用） */
export function metaOf(it: ArchiveEntry): string {
  if (it.meta) return it.meta;
  return [
    `ARCHIVE_ID  = ${it.id}`,
    `TITLE       = ${it.title}`,
    `OWNER       = ${it.owner ?? '—'}`,
    `DATE        = ${it.date ?? '—'}`,
    `TAGS        = ${(it.tags ?? []).join(', ')}`,
    `LINK        = ${it.href ?? '—'}`,
    'ENCODING    = UTF-8',
    'ACCESS      = PUBLIC / L1',
  ].join('\n');
}
