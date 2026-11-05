/**
 * @file 契约类型辅助的编译期断言（不产生运行时代码，仅由 tsc 校验）
 *
 * 目的：确认 `bff-route.ts` 暴露的类型工具能从 `backend-api.d.ts`（由
 * openapi.baseline.json 生成）中正确提取 operation 名与响应体。
 * 若后端契约重命名/删除某个 operation，**本文件会先于业务代码编译失败**，
 * 起到「契约变更 → 编译期报警」的哨兵作用。
 *
 * 注意：本文件不导出任何运行时值，仅参与类型检查。
 */

import type { BackendResponse, OperationName, ResponseOf } from '@/shared/bff-route';

// ---- 正向：已知契约路径+方法能解析出 operation 名 ----
type AnnouncementsGet = OperationName<'/api/v1/announcements', 'get'>;
const _announcementsGet: AnnouncementsGet = 'list_active_announcements_api_v1_announcements_get';
void _announcementsGet;

// ---- 正向：能提取 2xx 响应体（announcements GET 返回数组） ----
type AnnouncementsBody = BackendResponse<AnnouncementsGet>;
declare const _announcementsBody: AnnouncementsBody;
const _asArray: Array<unknown> = _announcementsBody as Array<unknown>;
void _asArray;

// ---- 便捷别名等价 ----
type ViaAlias = ResponseOf<'/api/v1/announcements', 'get'>;
const _aliasCheck: ViaAlias = _announcementsBody;
void _aliasCheck;

// ---- 负向：契约中不存在的方法 → 解析为 never ----
type NoDelete = OperationName<'/api/v1/announcements', 'delete'>;
const _noDelete: [NoDelete] extends [never] ? true : false = true;
void _noDelete;
