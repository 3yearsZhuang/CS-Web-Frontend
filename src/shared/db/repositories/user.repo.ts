/**
 * @file UserRepository — 用户资料相关表数据访问层（ADR-009）
 *
 * 覆盖 users / activity_participations。sessions 操作复用 AuthRepository。
 * SQL 使用 ? 占位符；方法签名统一以可选 engine 参数收尾。
 */
import 'server-only';
import { getDbEngine, type DbEngine, type QueryRow } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string | null;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  role: string;
  is_active: number;
  points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityParticipationRow {
  id: string;
  activity_title: string;
  activity_date: string;
  role: string | null;
  created_at: string;
}

export interface PublicUserRow {
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string | null;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  role: string;
  created_at: string;
}

export interface UserPasswordRow {
  password_hash: string;
}

export interface UserAvatarRow {
  avatar_url: string | null;
  avatar_type: string | null;
}

export interface RepoUserStats {
  topicCount: number;
  replyCount: number;
  examCount: number;
  examPassedCount: number;
}

export interface UserRepository {
  findById(id: string): Promise<UserRow | null>;
  findByGithubId(githubId: string, eng?: DbEngine): Promise<UserRow | null>;
  findByEmail(email: string, eng?: DbEngine): Promise<UserRow | null>;
  insertOAuthUser(
    tx: DbEngine,
    id: string,
    email: string,
    passwordHash: string,
    githubId: string,
    displayName: string,
    avatarUrl: string,
    githubUrl: string,
  ): Promise<void>;
  unlinkGitHub(id: string, eng?: DbEngine): Promise<void>;
  findByIdForPublic(id: string): Promise<PublicUserRow | null>;
  findPasswordHashById(id: string): Promise<UserPasswordRow | null>;
  findAvatarById(id: string): Promise<UserAvatarRow | null>;
  listActivityParticipations(userId: string): Promise<ActivityParticipationRow[]>;
  updateProfileFields(id: string, sets: string[], values: unknown[]): Promise<UserRow | null>;
  setPresetAvatar(id: string, presetUrl: string): Promise<UserRow | null>;
  setUploadedAvatar(id: string, avatarUrl: string): Promise<UserRow | null>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  getPublicStats(userId: string): Promise<RepoUserStats>;
}

export function createUserRepository(engine: DbEngine): UserRepository {
  return {
    async findById(id: string, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    },

    async findByGithubId(githubId, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE github_id = ?', [githubId]);
    },

    async findByEmail(email, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    },

    async insertOAuthUser(tx, id, email, passwordHash, githubId, displayName, avatarUrl, githubUrl): Promise<void> {
      await tx.execute(
        'INSERT INTO users (id, email, password_hash, github_id, display_name, avatar_url, github_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, email, passwordHash, githubId, displayName, avatarUrl, githubUrl],
      );
    },

    async unlinkGitHub(id, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute("UPDATE users SET github_id = NULL, updated_at = datetime('now') WHERE id = ?", [id]);
    },

    async findByIdForPublic(id: string, eng?: DbEngine): Promise<PublicUserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<PublicUserRow>(
        `SELECT id, email, display_name, bio, avatar_url, avatar_type, github_url, website_url, tech_tags, role, created_at
         FROM users WHERE id = ? AND is_active = 1`,
        [id],
      );
    },

    async findPasswordHashById(id: string, eng?: DbEngine): Promise<UserPasswordRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserPasswordRow>('SELECT password_hash FROM users WHERE id = ?', [id]);
    },

    async findAvatarById(id: string, eng?: DbEngine): Promise<UserAvatarRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserAvatarRow>('SELECT avatar_url, avatar_type FROM users WHERE id = ?', [id]);
    },

    async listActivityParticipations(userId: string, eng?: DbEngine): Promise<ActivityParticipationRow[]> {
      const e = await resolveEngine(eng ?? engine);
      return e.query<ActivityParticipationRow>(
        'SELECT id, activity_title, activity_date, role, created_at FROM activity_participations WHERE user_id = ? ORDER BY activity_date DESC',
        [userId],
      );
    },

    async updateProfileFields(id: string, sets: string[], values: unknown[], eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      sets.push("updated_at = datetime('now')");
      values.push(id);
      await e.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values as (string | number | null)[]);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    },

    async setPresetAvatar(id: string, presetUrl: string, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute(
        "UPDATE users SET avatar_url = ?, avatar_type = 'preset', updated_at = datetime('now') WHERE id = ?",
        [presetUrl, id],
      );
      return e.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    },

    async setUploadedAvatar(id: string, avatarUrl: string, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute(
        "UPDATE users SET avatar_url = ?, avatar_type = 'uploaded', updated_at = datetime('now') WHERE id = ?",
        [avatarUrl, id],
      );
      return e.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    },

    async updatePasswordHash(id: string, passwordHash: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [
        passwordHash,
        id,
      ]);
    },

    async getPublicStats(userId: string, eng?: DbEngine): Promise<RepoUserStats> {
      const e = await resolveEngine(eng ?? engine);
      const topicCount = (
        await e.queryOne<{ cnt: number }>(
          "SELECT COUNT(*) as cnt FROM community_posts WHERE author_id = ? AND kind = 'topic' AND status = 'published'",
          [userId],
        )
      )?.cnt ?? 0;
      const replyCount = (
        await e.queryOne<{ cnt: number }>(
          "SELECT COUNT(*) as cnt FROM community_comments WHERE author_id = ? AND status = 'published'",
          [userId],
        )
      )?.cnt ?? 0;
      const examCount = (
        await e.queryOne<{ cnt: number }>(
          `SELECT COUNT(DISTINCT ea.exam_id) as cnt
           FROM exam_attempts ea
           JOIN exams e ON ea.exam_id = e.id
           WHERE ea.user_id = ? AND e.status = 'ended'`,
          [userId],
        )
      )?.cnt ?? 0;
      const examPassedCount = (
        await e.queryOne<{ cnt: number }>(
          `SELECT COUNT(DISTINCT ea.exam_id) as cnt
           FROM exam_attempts ea
           JOIN exams e ON ea.exam_id = e.id
           WHERE ea.user_id = ? AND e.status = 'ended'
           GROUP BY ea.exam_id
           HAVING SUM(ea.score) >= (
             SELECT SUM(eq.score) FROM exam_questions eq WHERE eq.exam_id = ea.exam_id
           ) * 0.6`,
          [userId],
        )
      )?.cnt ?? 0;
      return { topicCount, replyCount, examCount, examPassedCount };
    },
  };
}

let userRepo: UserRepository | null = null;

export async function getUserRepository(): Promise<UserRepository> {
  if (userRepo) return userRepo;
  const engine = await getDbEngine();
  userRepo = createUserRepository(engine);
  return userRepo;
}

/** 测试专用：注入 mock repository */
export function _setUserRepositoryForTest(repo: UserRepository | null): void {
  userRepo = repo;
}
