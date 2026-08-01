/**
 * @file 用户答题提交 API — POST /api/tools/exam/:id/submit
 *
 * POST: 提交答案（选择题自动判分，编程题标记待批改）
 *
 * 安全控制：
 *   - 必须登录
 *   - Origin 白名单
 *   - JSON Content-Type
 *   - 速率限制
 */
import { NextResponse } from 'next/server';
import { submitAnswer, type AnswerInput } from '@/modules/tools/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  getClientIp,
  jsonError,
  errorResponse,
  forumReplyLimiter,
} from '@/shared/security/security';
import { submitAnswerSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `exam-submit:${ip}`;
  if (!forumReplyLimiter.check(rateKey)) {
    const retryAfter = forumReplyLimiter.retryAfterSeconds(rateKey);
    return jsonError('提交过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const { id } = await params;
  const parsed = await parseJsonBody<{ answers: AnswerInput[] }>(req);
  if (!parsed.ok) return parsed.response;

  const { answers } = parsed.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: '请提供答案' }, { status: 400 });
  }

  const results: Array<{ questionId: string; isCorrect: boolean | null; score: number | null }> = [];

  for (const item of answers) {
    const result = submitAnswerSchema.safeParse(item);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || '答案格式不正确' },
        { status: 400 },
      );
    }
    try {
      const attempt = submitAnswer(session.user.id, id, result.data.questionId, result.data.answer);
      results.push({
        questionId: result.data.questionId,
        isCorrect: attempt.isCorrect,
        score: attempt.score,
      });
    } catch (err) {
      return errorResponse(err);
    }
  }

  return NextResponse.json({ ok: true, results });
}