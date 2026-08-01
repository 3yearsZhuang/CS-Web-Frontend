/**
 * @file 技术方向标签定义 — 用户资料/学习资源/考试题目分类共用
 *
 * 前端与服务端共享同一份常量，无需后端配置。
 */

export interface TechTag {
  /** 英文 key，用于存储和 URL */
  key: string;
  label: string;
  description: string;
}

/** 所有技术方向标签 */
export const TECH_TAGS: TechTag[] = [
  { key: 'web', label: 'Web 开发', description: '前端、后端、全栈、API 设计' },
  { key: 'ai', label: 'AI / 机器学习', description: 'LLM、深度学习、数据科学' },
  { key: 'system', label: '系统编程', description: '操作系统、编译器、嵌入式' },
  { key: 'game', label: '游戏开发', description: 'Unity、Unreal、独立游戏' },
  { key: 'security', label: '网络安全', description: 'CTF、渗透测试、密码学' },
  { key: 'mobile', label: '移动开发', description: 'iOS、Android、跨平台' },
  { key: 'data', label: '数据 / 数据库', description: 'SQL、NoSQL、大数据、ETL' },
  { key: 'devops', label: 'DevOps / 云原生', description: 'Docker、K8s、CI/CD、IaC' },
  { key: 'graphics', label: '图形学 / 可视化', description: 'WebGL、Three.js、Shader' },
  { key: 'hardware', label: '硬件 / IoT', description: 'Arduino、PCB、嵌入式系统' },
  { key: 'algorithm', label: '算法 / 竞赛', description: 'LeetCode、ICPC、数学建模' },
  { key: 'design', label: 'UI / 设计', description: 'Figma、设计系统、用户体验' },
];

/** 用户封存的技术标签列表上限 */
export const TECH_TAGS_MAX = 6;

/** 校验技术标签列表是否合法 */
export function validateTechTags(input: unknown): { ok: true; tags: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: '技术标签格式不正确' };
  }
  const validKeys = new Set(TECH_TAGS.map((t) => t.key));
  const tags: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      return { ok: false, error: '技术标签格式不正确' };
    }
    if (!validKeys.has(item)) {
      return { ok: false, error: `无效的技术标签: ${item}` };
    }
    if (tags.includes(item)) {
      return { ok: false, error: `重复的技术标签: ${item}` };
    }
    tags.push(item);
  }
  if (tags.length > TECH_TAGS_MAX) {
    return { ok: false, error: `最多选择 ${TECH_TAGS_MAX} 个技术标签` };
  }
  return { ok: true, tags };
}
