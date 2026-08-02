/**
 * @file Repository 层聚合 barrel — 业务层访问数据库的统一入口（ADR-009）
 *
 * 业务层通过 getXxxRepository() 获取实例，Repository 内部无状态，事务通过 engine.transaction() 显式声明。
 * getRepositories() 工厂聚合所有 Repository 单例，供需要多 Repository 在同一事务协作的场景使用。
 */
// 显式聚合各 Repository 的公开 API。
// 不使用 `export *` 以避免 UserRow / AdminActionRow 等原始行类型在多模块间重名导致的 TS2308 歧义
// （这些行类型是各 Repository 的实现细节，业务层通过 getXRepository() 获取实例与类型化接口）。
export {
  createAuditRepository,
  _setAuditRepositoryForTest,
  getAuditRepository,
  type InsertAuditParams,
  type ListAuditParams,
  type AuditRepository,
} from './audit.repo';

export {
  createAuthRepository,
  _setAuthRepositoryForTest,
  getAuthRepository,
  type SessionRow,
  type LoginHistoryRow,
  type TwoFactorRow,
  type AuthRepository,
} from './auth.repo';

export {
  createUserRepository,
  _setUserRepositoryForTest,
  getUserRepository,
  type ActivityParticipationRow,
  type PublicUserRow,
  type UserPasswordRow,
  type UserAvatarRow,
  type RepoUserStats,
  type UserRepository,
} from './user.repo';

export {
  createCommunityRepository,
  getCommunityRepository,
  _setCommunityRepositoryForTest,
  type CommunityCategoryRow,
  type CommunityPostRow,
  type CommunityCommentRow,
  type UserSummaryRow,
  type AuthorSummary,
  type CategorySummary,
  type CommunityRepository,
} from './community.repo';

export {
  createEventsRepository,
  getEventsRepository,
  _setEventsRepositoryForTest,
  type EventRow,
  type EventRegistrationRow,
  type EventCheckinRow,
  type EventStatRaw,
  type EventsRepository,
} from './events.repo';

export {
  getToolsRepository,
  type PointsTransactionRow,
  type ExamRow,
  type ExamQuestionRow,
  type ExamQuestionOptionRow,
  type ExamAttemptRow,
  type ResourceRow,
  type ResourceWithAuthorRow,
  type ResourceReviewRow,
  type ComponentItemRow,
  type ComponentVariantRow,
  type ComponentGuideRow,
  type TaskRow,
  type TaskClaimRow,
  type ToolsRepository,
  type DbEngine,
  type QueryRow,
  type QueryParams,
} from './tools.repo';

export {
  getNotificationRepository,
  type NotificationRow,
  type NotificationRepository,
} from './notification.repo';

export {
  getAdminRepository,
  type RoleRow,
  type RolePermissionRow,
  type AdminActionWithAdmin,
  type AdminRepository,
} from './admin.repo';

export {
  getJoinRepository,
  type JoinApplicationRow,
  type JoinRepository,
} from './join.repo';

export {
  getAnnouncementRepository,
  type AnnouncementRow,
  type AnnouncementRepository,
} from './announcement.repo';
// 其余模块 Repository 随迁移推进在此注册

import { getAuditRepository, type AuditRepository } from './audit.repo';
import { getAuthRepository, type AuthRepository } from './auth.repo';
import { getUserRepository, type UserRepository } from './user.repo';
import { getCommunityRepository, type CommunityRepository } from './community.repo';
import { getEventsRepository, type EventsRepository } from './events.repo';
import { getToolsRepository, type ToolsRepository } from './tools.repo';

/** 聚合所有已迁移 Repository 实例的容器 */
export interface Repositories {
  audit: AuditRepository;
  auth: AuthRepository;
  user: UserRepository;
  community: CommunityRepository;
  events: EventsRepository;
  tools: ToolsRepository;
  // 其余模块随迁移补充
}

/**
 * 获取全部 Repository 单例（按需在各自模块内扩展）。
 * 多 Repository 需在同一个事务中协作时，调用方通过 getDbEngine().transaction(tx => ...)
 * 并把 tx 传入各 repo 方法（repo 方法签名以可选 engine 参数收尾）。
 */
export async function getRepositories(): Promise<Repositories> {
  const [audit, auth, user] = await Promise.all([
    getAuditRepository(),
    getAuthRepository(),
    getUserRepository(),
  ]);
  return {
    audit,
    auth,
    user,
    community: getCommunityRepository(),
    events: getEventsRepository(),
    tools: getToolsRepository(),
  };
}
