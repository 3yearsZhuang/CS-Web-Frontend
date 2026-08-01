/**
 * @file 积分服务
 */

import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import {
  type PointsTransaction,
  LEVEL_THRESHOLDS,
} from '../types';

export type { PointsTransaction };

interface PointsTransactionRow {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  balance_after: number;
  created_at: string;
}

function toTransaction(row: PointsTransactionRow): PointsTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    reason: row.reason,
    sourceType: row.source_type,
    sourceId: row.source_id,
    balanceAfter: row.balance_after,
    createdAt: row.created_at,
  };
}

export { LEVEL_THRESHOLDS };

/** 获取用户积分余额 */
export function getUserPointsBalance(userId: string): number {
  const db = getDb();
  const lastTx = db.prepare(
    'SELECT balance_after FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
  ).get(userId) as { balance_after: number } | undefined;

  return lastTx?.balance_after ?? 0;
}

/** 增加积分 */
export function addPoints(
  userId: string,
  amount: number,
  sourceType: string,
  sourceId: string | null,
  reason: string,
): PointsTransaction {
  if (amount <= 0) throw new AppError('积分数量必须大于 0', 'VALIDATION_ERROR');

  const db = getDb();
  const currentBalance = getUserPointsBalance(userId);
  const newBalance = currentBalance + amount;
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO points_transactions (id, user_id, amount, reason, source_type, source_id, balance_after)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, amount, reason, sourceType, sourceId, newBalance);

  const row = db.prepare('SELECT * FROM points_transactions WHERE id = ?').get(id) as PointsTransactionRow;
  return toTransaction(row);
}

/** 扣除积分 */
export function deductPoints(
  userId: string,
  amount: number,
  sourceType: string,
  sourceId: string | null,
  reason: string,
): PointsTransaction {
  if (amount <= 0) throw new AppError('扣除数量必须大于 0', 'VALIDATION_ERROR');

  const db = getDb();
  const currentBalance = getUserPointsBalance(userId);

  if (currentBalance < amount) {
    throw new AppError(`积分不足（当前 ${currentBalance}，需要 ${amount}）`, 'INSUFFICIENT_POINTS');
  }

  const newBalance = currentBalance - amount;
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO points_transactions (id, user_id, amount, reason, source_type, source_id, balance_after)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, -amount, reason, sourceType, sourceId, newBalance);

  const row = db.prepare('SELECT * FROM points_transactions WHERE id = ?').get(id) as PointsTransactionRow;
  return toTransaction(row);
}

/** 获取用户积分档案 */
export function getUserPointsProfile(userId: string): {
  balance: number;
  level: number;
  levelTitle: string;
  transactions: PointsTransaction[];
} {
  const balance = getUserPointsBalance(userId);
  const { level, title } = calculateLevel(balance);

  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
  ).all(userId) as PointsTransactionRow[];

  return {
    balance,
    level,
    levelTitle: title,
    transactions: rows.map(toTransaction),
  };
}

export function getLeaderboard(topN = 20): Array<{
  userId: string;
  displayName: string | null;
  balance: number;
  level: number;
  levelTitle: string;
}> {
  const db = getDb();

  const rows = db.prepare(
    `SELECT user_id, MAX(balance_after) AS balance
     FROM points_transactions
     GROUP BY user_id
     ORDER BY balance DESC
     LIMIT ?`,
  ).all(topN) as Array<{ user_id: string; balance: number }>;

  return rows.map((r) => {
    const { level, title } = calculateLevel(r.balance);
    const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(r.user_id) as { display_name: string | null } | undefined;
    return {
      userId: r.user_id,
      displayName: user?.display_name ?? null,
      balance: r.balance,
      level,
      levelTitle: title,
    };
  });
}

/** 根据积分计算等级 */
export function calculateLevel(points: number): { level: number; title: string } {
  let result = LEVEL_THRESHOLDS[0];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (points >= threshold.minPoints) {
      result = threshold;
    }
  }
  return { level: result.level, title: result.title };
}