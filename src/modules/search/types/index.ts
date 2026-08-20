/**
 * @file 全站搜索模块类型（与后端 /api/v1/search 契约对应）
 */

/** 搜索范围：all = 全站聚合；其余为单模块范围 */
export type SearchScope =
  | 'all'
  | 'events'
  | 'community'
  | 'tools'
  | 'announcements'
  | 'users';

/** 统一搜索结果项（后端 SearchResultItem） */
export interface SearchResultItem {
  type: 'event' | 'post' | 'resource' | 'announcement' | 'user' | string;
  id: number;
  title: string;
  subtitle?: string;
  url: string;
}

/** 单个范围的搜索结果组（后端 SearchGroup） */
export interface SearchGroup {
  items: SearchResultItem[];
  total: number;
}

/** 全站搜索聚合响应（后端 SearchResponse） */
export interface SearchResponse {
  query: string;
  scope: string;
  results: Partial<Record<SearchScope, SearchGroup>>;
}
