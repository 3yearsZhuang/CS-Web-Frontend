/**
 * @file 健康检查端点 — GET /api/health，供容器编排探活，公开存活检查不返回敏感信息
 */
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '@/shared/db';

export const runtime = 'nodejs';

const APP_VERSION = '0.9.1';

interface DiskInfo {
  available: number;
  free: number;
}

function getDiskInfo(): DiskInfo | null {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const targetDir = fs.existsSync(dataDir) ? dataDir : process.cwd();
    const stats = fs.statfsSync(targetDir);
    return {
      available: stats.bavail * stats.bsize,
      free: stats.bfree * stats.bsize,
    };
  } catch {
    return null;
  }
}

function checkDatabase(): 'ok' | string {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    return 'ok';
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const dbStatus = checkDatabase();
  const diskInfo = getDiskInfo();

  const dbOk = dbStatus === 'ok';
  const status = dbOk ? 'ok' : 'degraded';
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      version: APP_VERSION,
      runtime: 'nodejs',
      checks: {
        database: dbStatus,
        disk: diskInfo,
      },
    },
    { status: httpStatus },
  );
}
