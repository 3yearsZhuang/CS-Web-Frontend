/**
 * @file /lab/archive 演示数据与类型（C2-1 落地；C2-2 将替换为真实资源站数据接线）
 *
 * 数据结构对齐契约层资源语义（分类 / 条目 / 元数据），
 * 文案为演示编目内容，不冒充实站正式资源。
 */

/** 档案条目 */
export interface ArchiveItem {
  /** 所属分类下标 */
  cat: number;
  /** 分类内下标 */
  idx: number;
  /** 编号，如 A-001 */
  id: string;
  title: string;
  /** 英文副标 */
  en: string;
  /** 编目负责方 */
  owner: string;
  tags: string[];
  date: string;
}

/** 档案分类 */
export interface ArchiveCategory {
  /** 编号前缀，如 'A' */
  key: string;
  name: string;
  en: string;
  items: ArchiveItem[];
}

type RawItem = readonly [title: string, en: string, owner: string, tags: readonly string[]];

const RAW: ReadonlyArray<readonly [key: string, name: string, en: string, items: readonly RawItem[]]> = [
  ['A', '文章', 'ARTICLES', [
    ['线段树从入门到进阶', 'Segment Tree Advanced', '教研组', ['数据结构', '进阶']],
    ['React 19 服务端组件实战', 'RSC in Practice', '前端组', ['React', '架构']],
    ['如何读一份开源代码', 'Reading Open Source', '教研组', ['方法论']],
    ['动态规划的状态设计', 'DP State Design', '竞赛组', ['DP', '竞赛']],
    ['TypeScript 类型体操入门', 'TS Type Gymnastics', '前端组', ['TypeScript']],
    ['从 CORS 到 BFF 网关', 'From CORS to BFF', '后端组', ['网络', 'BFF']],
    ['操作系统内存管理笔记', 'OS Memory Notes', '教研组', ['OS', '笔记']],
    ['写给新人的 Git 工作流', 'Git Workflow 101', '教研组', ['Git', '新人']],
  ]],
  ['V', '视频', 'VIDEOS', [
    ['2026 暑期算法营·第 1 讲', 'Summer Algo EP01', '竞赛组', ['录播', '算法']],
    ['CSS 布局大师课', 'CSS Layout Master', '前端组', ['CSS']],
    ['一次讲透 HTTPS 握手', 'TLS Handshake', '后端组', ['网络']],
    ['递归思维训练（上）', 'Recursion I', '教研组', ['基础']],
    ['递归思维训练（下）', 'Recursion II', '教研组', ['基础']],
    ['数据库索引为什么快', 'Why Index Fast', '后端组', ['数据库']],
    ['Linux 命令行 survival', 'Linux Survival', '教研组', ['Linux']],
    ['期中复习串讲·数学', 'Midterm Review', '教研组', ['复习']],
  ]],
  ['T', '工具', 'TOOLS', [
    ['在线判题 Sandbox', 'OJ Sandbox', '平台组', ['评测']],
    ['代码对比 Diff 器', 'Diff Viewer', '平台组', ['效率']],
    ['正则表达式试验场', 'Regex Playground', '平台组', ['效率']],
    ['Cron 表达式生成器', 'Cron Builder', '平台组', ['运维']],
    ['Markdown 速查表', 'Markdown Cheatsheet', '平台组', ['文档']],
    ['调色板对比度检查', 'Contrast Checker', '设计组', ['无障碍']],
    ['JSON 结构化检视器', 'JSON Inspector', '平台组', ['效率']],
    ['算法复杂度速查', 'BigO Cheatsheet', '竞赛组', ['速查']],
  ]],
  ['E', '活动', 'EVENTS', [
    ['九月新生破冰赛', 'Freshman Contest', '竞赛组', ['比赛', '09-20']],
    ['周五夜读·SICP', 'Friday SICP', '教研组', ['读书会']],
    ['秋季项目路演', 'Autumn Demo Day', '平台组', ['路演']],
    ['国庆集训营报名', 'National Day Camp', '竞赛组', ['集训']],
    ['开源之夏宣讲会', 'OSPP Talk', '教研组', ['宣讲']],
    ['月度 Code Review 会', 'Monthly CR', '前端组', ['评审']],
    ['黑客松·48 小时', 'Hackathon 48h', '平台组', ['黑客松']],
    ['毕业学长分享夜', 'Alumni Night', '教研组', ['分享']],
  ]],
  ['S', '特别策划', 'SPECIAL', [
    ['CS 学习路线图 2026', 'Roadmap 2026', '教研组', ['路线']],
    ['档案柜：本站资源总索引', 'Archive Index', '平台组', ['索引']],
    ['暑期成果展·作品集', 'Summer Gallery', '设计组', ['作品']],
    ['内部知识库建设日志', 'KB Devlog', '平台组', ['日志']],
    ['新手三十天打卡计划', '30-Day Plan', '教研组', ['打卡']],
    ['术语表：从 API 到 WASM', 'Glossary A-W', '教研组', ['术语']],
    ['年度技术雷达', 'Tech Radar', '平台组', ['雷达']],
    ['社区共建白皮书', 'Whitepaper', '教研组', ['社区']],
  ]],
];

/** 五类 × 八份档案（编号 <key>-001..008） */
export const ARCHIVE_CATS: ArchiveCategory[] = RAW.map(([key, name, en, items], ci) => ({
  key,
  name,
  en,
  items: items.map(([title, ien, owner, tags], i) => ({
    cat: ci,
    idx: i,
    id: `${key}-${String(i + 1).padStart(3, '0')}`,
    title,
    en: ien,
    owner,
    tags: [...tags],
    date: `2026-${String(9 - (i % 3)).padStart(2, '0')}-${String(3 + i * 3).padStart(2, '0')}`,
  })),
}));

/** 全量平铺（检索用） */
export const ALL_ARCHIVES: ArchiveItem[] = ARCHIVE_CATS.flatMap((c) => c.items);

/** 概述文案（编目体） */
export function summaryOf(it: ArchiveItem): string {
  return `本档案收录「${it.title}」（${it.en}）的完整内容，由${it.owner}编目维护。` +
    `档案按莱茵终端规范抽取关键段落、配套练习与延伸阅读，归入「${ARCHIVE_CATS[it.cat].name}」类目，` +
    `编号 ${it.id}，面向全体成员开放。标签：${it.tags.join(' / ')}。`;
}

/** 编目记录（[时间, 事件]） */
export function recordsOf(it: ArchiveItem): Array<readonly [string, string]> {
  return [
    ['2026-08-30 10:24', `${it.owner}提交初版编目，等待审校。`],
    ['2026-09-02 15:41', `审校通过，归档至「${ARCHIVE_CATS[it.cat].name}」类目。`],
    ['2026-09-06 09:12', '补充延伸阅读与配套练习，版本 v1.1。'],
    [`${it.date} 20:05`, '最近一次内容修订完成，状态：可访问。'],
  ];
}

/** 元数据文本（详情 META 页 + 导出用） */
export function metaOf(it: ArchiveItem): string {
  const c = ARCHIVE_CATS[it.cat];
  return [
    `ARCHIVE_ID  = ${it.id}`,
    `CATEGORY    = [${String(it.cat + 1).padStart(2, '0')}] ${c.name} / ${c.en}`,
    `OWNER       = ${it.owner}`,
    `DATE        = ${it.date}`,
    `TAGS        = ${it.tags.join(', ')}`,
    'ENCODING    = UTF-8',
    'ACCESS      = PUBLIC / L1',
    'SOURCE      = FZTBU·CS ARCHIVE TERMINAL',
  ].join('\n');
}
