/**
 * @file 入社申请 API — POST /api/join（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAllowedOrigin } from '@/shared/security/security';
import { normalizeError, proxyBackend, setAuthCookies, toJoinApplication } from '@/shared/backend-client';

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
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const result = submitSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const { studentId, applicantName, major, techTags, reason, contactQq, contactPhone } = result.data;

  const proxy = await proxyBackend(req, {
    path: '/join',
    method: 'POST',
    jsonBody: {
      student_id: studentId,
      applicant_name: applicantName,
      major,
      tech_tags: techTags,
      reason,
      contact_qq: contactQq,
      contact_phone: contactPhone,
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '提交失败');
    return NextResponse.json(err, { status: proxy.status });
  }
  const res = NextResponse.json({ application: toJoinApplication(proxy.body) }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
