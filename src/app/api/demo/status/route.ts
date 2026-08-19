/**
 * @file 演示模式状态 API — GET /api/demo/status
 *
 * 供前端演示横幅/开关查询当前演示状态：
 *   - source: 'manual'（手动 cookie 开启）/ 'auto'（后端不可达自动降级）/ null（正常态）
 *   - unreachableRemainingMs: 自动降级剩余 TTL（非自动态为 null），UI 可据此显示"后端恢复中"
 */
import { NextResponse } from 'next/server';
import { demoSource, unreachableRemainingMs } from '@/shared/demo/demo-mode';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const source = demoSource(req);
  return NextResponse.json({
    demo: source !== null,
    source,
    unreachableRemainingMs: source === 'auto' ? unreachableRemainingMs() : null,
  });
}
