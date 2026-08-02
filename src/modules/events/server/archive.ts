/**
 * @file 活动归档服务（ADR-009：委托 EventsRepository）
 *
 * 自动将过期的活动归档为 ended 状态。具体 SQL 实现见 events.repo.ts 的 archivePastEvents。
 */
export { autoArchivePastEvents } from './crud';
