/**
 * @file 活动归档服务
 */

import type { Database as DB } from 'better-sqlite3';

/**
 * 自动将过期的活动归档为 ended 状态
 *
 * 日期格式兼容：events.date 为自由格式字符串（admin 表单 placeholder 为 YYYY.MM.DD），
 * 可能含 `.` / `-` / `/` 分隔符。归档比较前用 SQL REPLACE 统一为 `-` 分隔，
 * 再与 YYYY-MM-DD（截取前 10 字符）做字典序比较。
 *
 * 历史 P0 修复：原先直接与 ISO 时间戳 `YYYY-MM-DDThh:mm:ssZ` 比较，
 * 因 `.`(0x2E) > `-`(0x2D)，同年已过日期永远不会被判定为过期，归档静默失效。
 */
export function autoArchivePastEvents(db: DB): number {
  const nowDate = new Date().toISOString().slice(0, 10);
  const result = db
    .prepare(
      `UPDATE events SET status = 'ended', updated_at = datetime('now')
       WHERE status != 'ended' AND date IS NOT NULL AND date != ''
         AND substr(REPLACE(REPLACE(date, '.', '-'), '/', '-'), 1, 10) < ?`,
    )
    .run(nowDate);
  return result.changes;
}