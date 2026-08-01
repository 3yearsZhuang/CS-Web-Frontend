/**
 * @file 工具集模块 — 共享类型
 */

// ============= 考试系统 =============

/** 考试状态 */
export type ExamStatus = 'draft' | 'published' | 'ended';
/** 题目类型 */
export type QuestionType = 'single_choice' | 'coding';

/** 考试对象 */
export interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  techTags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 考试题目 */
export interface ExamQuestion {
  id: string;
  examId: string;
  type: QuestionType;
  title: string;
  contentMarkdown: string | null;
  score: number;
  sortOrder: number;
  createdAt: string;
  options?: ExamOption[];
}

/** 题目选项 */
export interface ExamOption {
  id: string;
  questionId: string;
  label: string;
  content: string;
  isCorrect: boolean;
  sortOrder: number;
}

/** 作答记录 */
export interface ExamAttempt {
  id: string;
  userId: string;
  examId: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  submittedAt: string;
}

/** 考试排行榜条目 */
export interface ExamRanking {
  userId: string;
  displayName: string | null;
  email: string;
  totalScore: number;
  totalQuestions: number;
  correctCount: number;
  submittedAt: string | null;
}

/** 创建考试的输入参数 */
export interface ExamInput {
  title: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number;
  techTags?: string[];
}

/** 创建题目的输入参数 */
export interface QuestionInput {
  type: QuestionType;
  title: string;
  contentMarkdown?: string | null;
  score?: number;
  sortOrder?: number;
  options?: OptionInput[];
}

/** 题目选项输入参数 */
export interface OptionInput {
  label: string;
  content: string;
  isCorrect?: boolean;
  sortOrder?: number;
}

/** 作答提交输入 */
export interface AnswerInput {
  questionId: string;
  answer: string;
}

/** 考试数据库行类型 */
export interface ExamRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  tech_tags: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 题目数据库行类型 */
export interface QuestionRow {
  id: string;
  exam_id: string;
  type: string;
  title: string;
  content_markdown: string | null;
  score: number;
  sort_order: number;
  created_at: string;
}

/** 选项数据库行类型 */
export interface OptionRow {
  id: string;
  question_id: string;
  label: string;
  content: string;
  is_correct: number;
  sort_order: number;
}

/** 作答数据库行类型 */
export interface AttemptRow {
  id: string;
  user_id: string;
  exam_id: string;
  question_id: string;
  answer: string | null;
  is_correct: number | null;
  score: number | null;
  submitted_at: string;
}

// ============= 协会任务系统 =============

/** 任务状态 */
export type TaskStatus = 'draft' | 'published' | 'closed';
/** 任务分类 */
export type TaskCategory = 'general' | 'documentation' | 'event' | 'maintenance' | 'mentoring' | 'other';
/** 认领状态 */
export type ClaimStatus = 'claimed' | 'completed' | 'cancelled';

/** 创建/更新任务的输入参数 */
export interface TaskInput {
  title: string;
  description: string;
  contentMarkdown?: string;
  category?: TaskCategory;
  tags?: string[];
  points?: number;
  maxClaimants?: number;
}

/** 任务对象 */
export interface Task {
  id: string;
  title: string;
  description: string;
  contentMarkdown: string | null;
  category: TaskCategory;
  tags: string[];
  points: number;
  maxClaimants: number;
  status: TaskStatus;
  createdBy: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimCount: number;
}

/** 任务认领记录 */
export interface TaskClaim {
  id: string;
  taskId: string;
  userId: string;
  status: ClaimStatus;
  claimNote: string | null;
  completedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  displayName?: string;
}

/** 任务列表筛选选项 */
export interface TaskListOptions {
  status?: TaskStatus;
  category?: TaskCategory;
  page?: number;
  pageSize?: number;
}

// ============= 学习资源站 =============

/** 资源类型 */
export type ResourceType = 'article' | 'video' | 'course' | 'tool' | 'book' | 'other';
/** 资源状态 */
export type ResourceStatus = 'draft' | 'published' | 'hidden';

/** 资源数据库行类型 */
export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: ResourceType;
  tech_tags: string | null;
  file_url: string | null;
  status: ResourceStatus;
  submitted_by: string;
  reviewed_by: string | null;
  review_note: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

/** 资源详情（含作者信息） */
export interface ResourceWithAuthor extends Resource {
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_tech_tags: string | null;
  reviewer_display_name: string | null;
}

/** 创建资源的输入参数 */
export interface CreateResourceInput {
  title: string;
  url: string;
  description?: string;
  resourceType?: ResourceType;
  techTags?: string[];
  fileUrl?: string;
}

/** 更新资源的输入参数 */
export interface UpdateResourceInput {
  title?: string;
  url?: string;
  description?: string;
  resourceType?: ResourceType;
  techTags?: string[];
}

/** 审核资源的输入参数 */
export interface ReviewResourceInput {
  status: 'published' | 'hidden';
  note?: string;
}

/** 资源列表查询参数 */
export interface ResourceQueryInput {
  resourceType?: string;
  techTag?: string;
  status?: ResourceStatus;
  sort?: 'latest' | 'popular';
  page: number;
  pageSize: number;
}

/** 资源列表返回结果 */
export interface ResourceListResult {
  resources: ResourceWithAuthor[];
  total: number;
  page: number;
  totalPages: number;
  techTagCounts: Record<string, number>;
}

// ============= Auxilio Agent =============

/** 薄弱标签分析结果 */
export interface WeaknessTag {
  tag: string;
  total: number;
  correct: number;
  accuracy: number;
}

/** 推荐资源 */
export interface RecommendedResource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resourceType: string;
  techTags: string[];
  matchedTag: string;
}

/** 学习画像分析结果 */
export interface AuxilioAnalysis {
  summary: string;
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracy: number;
  weaknesses: WeaknessTag[];
  recommendations: RecommendedResource[];
}

// ============= 积分系统 =============

/** 积分交易记录 */
export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  sourceType: string;
  sourceId: string | null;
  balanceAfter: number;
  createdAt: string;
}

/** 积分等级阈值配置 */
export const LEVEL_THRESHOLDS: Array<{ level: number; title: string; minPoints: number }> = [
  { level: 1, title: '新人学徒', minPoints: 0 },
  { level: 2, title: '初级成员', minPoints: 50 },
  { level: 3, title: '活跃成员', minPoints: 150 },
  { level: 4, title: '资深成员', minPoints: 400 },
  { level: 5, title: '核心骨干', minPoints: 1000 },
  { level: 6, title: '技术专家', minPoints: 2500 },
  { level: 7, title: '协会元老', minPoints: 5000 },
];

// ============= 组件注册表（组件可视化管理平台） =============

/** 迁移状态 */
export type MigrationStatus = 'legacy' | 'migrating' | 'done';
/** 变体尺寸 */
export type VariantSize = 'sm' | 'md' | 'lg';
/** 变体颜色 */
export type VariantColor = 'primary' | 'muted' | 'danger';
/** 变体状态 */
export type VariantState = 'default' | 'hover' | 'disabled';

/** 组件变体配置 */
export interface ComponentVariant {
  id: string;
  itemId: string;
  size: VariantSize;
  color: VariantColor;
  state: VariantState;
  isEnabled: boolean;
}

/** 组件使用规范（适用场景 + 反模式） */
export interface ComponentGuide {
  useCases: string[];
  antiPatterns: string[];
}

/** 组件条目（含变体与使用规范） */
export interface ComponentItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  migrationStatus: MigrationStatus;
  sortOrder: number;
  variants: ComponentVariant[];
  guide: ComponentGuide;
  createdAt: string;
  updatedAt: string;
}

/** 创建组件的输入参数 */
export interface ComponentItemInput {
  name: string;
  slug: string;
  category: string;
  description: string;
  migrationStatus?: MigrationStatus;
}

/** 更新使用规范的输入参数 */
export interface ComponentGuideInput {
  useCases: string[];
  antiPatterns: string[];
}

/** 组件注册表条目数据库行类型 */
export interface ComponentItemRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  migration_status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 组件变体数据库行类型 */
export interface ComponentVariantRow {
  id: string;
  item_id: string;
  size: string;
  color: string;
  state: string;
  is_enabled: number;
}

/** 使用规范数据库行类型 */
export interface ComponentGuideRow {
  id: string;
  item_id: string;
  use_cases: string;
  anti_patterns: string;
  updated_at: string;
}

/** 变体全量可选集合（size × color × state 笛卡尔积） */
export const ALL_VARIANT_SIZES: VariantSize[] = ['sm', 'md', 'lg'];
/** 变体全量颜色集合 */
export const ALL_VARIANT_COLORS: VariantColor[] = ['primary', 'muted', 'danger'];
/** 变体全量状态集合 */
export const ALL_VARIANT_STATES: VariantState[] = ['default', 'hover', 'disabled'];