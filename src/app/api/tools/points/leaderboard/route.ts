/**
 * @file 积分排行榜 API — GET /api/tools/points/leaderboard
 */
import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/modules/tools/server';

export const runtime = 'nodejs';

export async function GET() {
  const board = getLeaderboard(20);
  return NextResponse.json({ leaderboard: board });
}
