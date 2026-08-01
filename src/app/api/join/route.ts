/**
 * @file 入社申请 API 路由 — POST /api/join
 *
 * POST: 提交入社申请（公开，无需登录）
 */
import { NextResponse } from 'next/server';
import { submitJoinApplication } from '@/modules/join/server';
import { parseJsonBody, getClientIp, jsonError } from '@/shared/security/security';
import { z } from 'zod';

export const runtime = 'nodejs';

const submitSchema = z.object({
  applicantName: z.string().min(1, '姓名不能为空').max(20),
  studentId: z.string().min(1, '学号不能为空').max(20),
  major: z.string().min(1, '专业不能为空').max(40),
  techTags: z.array(z.string().max(20)).max(10).optional(),
  reason: z.string().min(1, '申请理由不能为空').max(500),
  contactQq: z.string().max(20).optional(),
  contactPhone: z.string().max(20).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = submitSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  try {
    const application = submitJoinApplication(result.data);
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return jsonError('提交失败，请稍后再试', 500);
  }
}