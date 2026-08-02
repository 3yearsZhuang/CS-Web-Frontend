/**
 * @file 积分服务
 */

import crypto from 'node:crypto';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
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
export async function getUserPointsBalance(userId: string): Promise<number> {
  const repo = getToolsRepository();
  return repo.getPointsBalanceAfter(userId);
}

/** 增加积分 */
export async function addPoints(
  userId: string,
  amount: number,
  sourceType: string,
  sourceId: string | null,
  reason: string,
): Promise<PointsTransaction> {
  if (amount <= 0) throw new AppError('积分数量必须大于 0', 'VALIDATION_ERROR');

  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const currentBalance = await repo.getPointsBalanceAfter(userId);
  const newBalance = currentBalance + amount;
  const id = crypto.randomUUID();

  await engine.transaction(async (tx) => {
    await repo.insertPointTransaction(tx, id, userId, amount, reason, sourceType, sourceId, newBalance);
  });

  const row = await repo.getPointTransactions(userId, { limit: 1, offset: 0 });
  return toTransaction(row[0] as PointsTransactionRow);
}

/** 扣除积分 */
export async function deductPoints(
  userId: string,
  amount: number,
  sourceType: string,
  sourceId: string | null,
  reason: string,
): Promise<PointsTransaction> {
  if (amount <= 0) throw new AppError('扣除数量必须大于 0', 'VALIDATION_ERROR');

  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const currentBalance = await repo.getPointsBalanceAfter(userId);

  if (currentBalance < amount) {
    throw new AppError(`积分不足（当前 ${currentBalance}，需要 ${amount}）`, 'INSUFFICIENT_POINTS');
  }

  const newBalance = currentBalance - amount;
  const id = crypto.randomUUID();

  await engine.transaction(async (tx) => {
    await repo.insertPointTransaction(tx, id, userId, -amount, reason, sourceType, sourceId, newBalance);
  });

  const row = await repo.getPointTransactions(userId, { limit: 1, offset: 0 });
  return toTransaction(row[0] as PointsTransactionRow);
}

/** 获取用户积分档案 */
export async function getUserPointsProfile(userId: string): Promise<{
  balance: number;
  level: number;
  levelTitle: string;
  transactions: PointsTransaction[];
}> {
  const repo = getToolsRepository();
  const balance = await repo.getPointsBalanceAfter(userId);
  const { level, title } = calculateLevel(balance);

  const rows = await repo.getPointTransactions(userId, { limit: 50, offset: 0 });

  return {
    balance,
    level,
    levelTitle: title,
    transactions: rows.map((r) => toTransaction(r as PointsTransactionRow)),
  };
}

export async function getLeaderboard(topN = 20): Promise<Array<{
  userId: string;
  displayName: string | null;
  balance: number;
  level: number;
  levelTitle: string;
}>> {
  const repo = getToolsRepository();
  const rows = await repo.listLeaderboard(topN);

  return rows.map((r) => {
    const { level, title } = calculateLevel(r.balance);
    return {
      userId: r.user_id,
      displayName: r.display_name,
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