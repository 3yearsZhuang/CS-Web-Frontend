/**
 * @file 用户考试详情 API — GET /api/tools/exam/:id
 *
 * GET: 获取考试详情（含题目，不暴露选择题正确答案）
 *
 * 登录后可查看，考试结束后可查看题目。
 */
import { NextResponse } from 'next/server';
import { getExamById, listQuestionsByExam, type ExamQuestion } from '@/modules/tools/server';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const log = createRequestLogger(req);
  try {
    const exam = getExamById(id);
    if (!exam) {
      return NextResponse.json({ error: '考试不存在' }, { status: 404 });
    }

    if (exam.status === 'draft') {
      return NextResponse.json({ error: '考试未发布' }, { status: 404 });
    }

    const questions = listQuestionsByExam(id);

    const sanitizedQuestions: ExamQuestion[] = questions.map((q) => {
      if (exam.status === 'ended') {
        return q;
      }
      return {
        ...q,
        options: q.options?.map((opt) => ({
          ...opt,
          isCorrect: false,
        })),
      };
    });

    return NextResponse.json({ exam, questions: sanitizedQuestions });
  } catch (err) {
    log.error({ err }, '获取考试详情失败');
    return NextResponse.json({ error: '获取考试详情失败' }, { status: 500 });
  }
}