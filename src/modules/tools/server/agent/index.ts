/**
 * @file Agent 服务层统一导出
 */

import {
  type WeaknessTag,
  type RecommendedResource,
  type AuxilioAnalysis,
} from '../../types';
import { getToolsRepository } from '@/shared/db/repositories';

const WEAKNESS_THRESHOLD = 0.6;
const MAX_RECOMMENDATIONS = 10;

interface ResourceRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: string;
  tech_tags: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
}

async function calculateWeaknesses(userId: string): Promise<WeaknessTag[]> {
  const repo = getToolsRepository();

  const rows = await repo.getExamAttemptAnalysis(userId);

  if (rows.length === 0) return [];

  const tagStats = new Map<string, { total: number; correct: number }>();

  for (const row of rows) {
    let tags: string[] = [];
    try {
      if (row.exam_tags) tags = JSON.parse(row.exam_tags) as string[];
    } catch {
      /* ignore */
    }
    for (const tag of tags) {
      const existing = tagStats.get(tag) || { total: 0, correct: 0 };
      existing.total++;
      if (row.is_correct === 1) existing.correct++;
      tagStats.set(tag, existing);
    }
  }

  const weaknesses: WeaknessTag[] = [];
  for (const [tag, stats] of tagStats) {
    const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    if (accuracy < WEAKNESS_THRESHOLD) {
      weaknesses.push({ tag, total: stats.total, correct: stats.correct, accuracy });
    }
  }

  weaknesses.sort((a, b) => a.accuracy - b.accuracy);

  return weaknesses;
}

async function recommendResources(weaknessTags: string[]): Promise<RecommendedResource[]> {
  if (weaknessTags.length === 0) return [];

  const repo = getToolsRepository();
  const rows = await repo.listPublishedResources();

  const results: RecommendedResource[] = [];

  for (const row of rows) {
    let resourceTags: string[] = [];
    try {
      if (row.tech_tags) resourceTags = JSON.parse(row.tech_tags) as string[];
    } catch {
      /* ignore */
    }

    for (const wt of weaknessTags) {
      if (resourceTags.some((rt) => rt.toLowerCase() === wt.toLowerCase())) {
        results.push({
          id: row.id,
          title: row.title,
          url: row.url,
          description: row.description,
          resourceType: row.resource_type,
          techTags: resourceTags,
          matchedTag: wt,
        });
        break;
      }
    }

    if (results.length >= MAX_RECOMMENDATIONS) break;
  }

  return results;
}

/** 分析用户学习画像并推荐资源 */
export async function analyzeLearningProfile(userId: string): Promise<AuxilioAnalysis> {
  const repo = getToolsRepository();

  const statsRow = await repo.getExamAttemptStats(userId);

  const weaknesses = await calculateWeaknesses(userId);
  const recommendations = await recommendResources(weaknesses.map((w) => w.tag));

  const total = statsRow.total || 0;
  const correct = statsRow.correct || 0;
  const accuracy = total > 0 ? correct / total : 0;

  let summary: string;
  if (total === 0) {
    summary = '你还没有参加过考试。完成考试后，Auxilio 将为你分析薄弱点并推荐学习资源。';
  } else if (weaknesses.length === 0) {
    summary = '表现不错！所有技术方向正确率都在 60% 以上。继续保持！';
  } else {
    summary = `在 ${weaknesses.length} 个方向有待加强：${weaknesses.map((w) => `${w.tag}（${Math.round(w.accuracy * 100)}%）`).join('、')}。`;
  }

  return {
    summary,
    totalQuestions: total,
    totalCorrect: correct,
    overallAccuracy: accuracy,
    weaknesses,
    recommendations,
  };
}