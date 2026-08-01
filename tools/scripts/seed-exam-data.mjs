#!/usr/bin/env node
/**
 * @file tools/scripts/seed-exam-data.mjs — 生成测试用考试和资源数据
 *
 * 生成一场测试考试（5 选择题 + 1 编程题）与若干测试资源；可选 --clear 清空旧测试数据。
 */

import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function loadDb() {
  const Database = (await import('better-sqlite3')).default;
  const dbPath = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'data', 'app.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function getFirstAdminId(db) {
  const row = db.prepare(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY created_at ASC LIMIT 1",
  ).get();
  if (!row) {
    console.error('❌ 错误：没有找到管理员账号，请先运行 pnpm create-user --role admin');
    process.exit(1);
  }
  return row.id;
}

function getFirstUserId(db) {
  const row = db.prepare(
    "SELECT id FROM users WHERE role = 'user' AND is_active = 1 ORDER BY created_at ASC LIMIT 1",
  ).get();
  if (!row) {
    console.error('❌ 错误：没有找到普通用户账号');
    process.exit(1);
  }
  return row.id;
}

async function main() {
  const args = process.argv.slice(2);
  const clearFirst = args.includes('--clear');

  console.log('[SeedTools] 正在连接数据库...');
  const db = await loadDb();

  try {
    const adminId = getFirstAdminId(db);
    const userId = getFirstUserId(db);

    if (clearFirst) {
      console.log('[SeedTools] 清空旧的测试数据...');
      db.exec(`
        DELETE FROM exam_question_options WHERE question_id IN (SELECT id FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE created_by = ?));
        DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE created_by = ?);
        DELETE FROM exam_attempts WHERE exam_id IN (SELECT id FROM exams WHERE created_by = ?);
        DELETE FROM exams WHERE created_by = ?;
        DELETE FROM resources WHERE submitted_by = ?;
      `);
      db.run(adminId, adminId, adminId, adminId, adminId);
    }

    console.log('[SeedTools] 生成测试考试...');

    const examId = crypto.randomUUID();
    const now = new Date();
    const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 天前
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();   // 7 天后

    db.prepare(`
      INSERT INTO exams (id, title, description, status, start_time, end_time, duration_minutes, tech_tags, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      examId,
      'C 语言基础能力测试',
      '本考试涵盖 C 语言的基础语法、指针操作、内存管理等核心知识点。共 6 道题，满分 100 分。',
      'published',
      startTime,
      endTime,
      60,
      JSON.stringify(['c_cpp', 'algorithm']),
      adminId,
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );

    console.log(`  考试: ${examId}`);

    // 选择题 1
    const q1Id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      q1Id, examId, 'single_choice',
      '以下哪个是 C 语言的关键字？',
      '请从下列选项中选择 C 语言的标准关键字。',
      5, 1,
    );
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q1Id, 'A', 'printf', 0, 1);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q1Id, 'B', 'static', 1, 2);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q1Id, 'C', 'println', 0, 3);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q1Id, 'D', 'cout', 0, 4);

    // 选择题 2
    const q2 = crypto.randomUUID();
    db.prepare(`
      INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      q2, examId, 'single_choice',
      'sizeof(char) 的值是多少？',
      '在标准 C 语言中，`sizeof(char)` 的值始终为 1。',
      5, 2,
    );
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q2, 'A', '1', 1, 1);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q2, 'B', '取决于编译器', 0, 2);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q2, 'C', '4', 0, 3);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q2, 'D', '8', 0, 4);

    // 选择题 3
    const q3 = crypto.randomUUID();
    db.prepare(`
      INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      q3, examId, 'single_choice',
      '以下关于指针的说法，哪个是正确的？',
      '请选择关于 C 语言指针的正确描述。',
      5, 3,
    );
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q3, 'A', '指针是一种数据类型，存储变量的地址', 1, 1);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q3, 'B', '指针的大小固定为 4 字节', 0, 2);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q3, 'C', '指针只能指向基本类型', 0, 3);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q3, 'D', '以上都不对', 0, 4);

    // 选择题 4
    const q4 = crypto.randomUUID();
    db.prepare(`
      INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      q4, examId, 'single_choice',
      '以下哪个操作可能导致内存泄漏？',
      '在 C 语言中，忘记释放动态分配的内存会导致内存泄漏。',
      5, 4,
    );
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q4, 'A', '忘记调用 free()', 1, 1);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q4, 'B', '声明过多的局部变量', 0, 2);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q4, 'C', '使用静态变量', 0, 3);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q4, 'D', '使用 register 关键字', 0, 4);

    // 选择题 5
    const q5 = crypto.randomUUID();
    db.prepare(`
      INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      q5, examId, 'single_choice',
      '下面代码的输出是什么？\n\n```c\nint a = 5;\nint *p = &a;\n*p = 10;\nprintf("%d", a);\n```',
      '这段代码将输出 10。',
      5, 5,
    );
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q5, 'A', '5', 0, 1);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q5, 'B', '10', 1, 2);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q5, 'C', '编译错误', 0, 3);
    db.prepare(`INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), q5, 'D', '未定义行为', 0, 4);

    // 编程题
    const q6 = crypto.randomUUID();
    db.prepare(`
      INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      q6, examId, 'coding',
      '反转字符串',
      '编写一个函数，接收一个字符串作为参数，返回反转后的字符串。\n\n```c\n// 示例输入：\n// "hello"\n// 示例输出：\n// "olleh"\n```\n\n要求：\n- 不能使用标准库中的 strrev 函数\n- 原地反转或返回新字符串均可',
      80, 6,
    );

    console.log('  ✓ 考试数据已生成（6 道题）');

    console.log('[SeedTools] 生成测试资源...');

    const resources = [
      {
        title: 'C 语言程序设计（第 4 版）— 谭浩强',
        url: 'https://book.douban.com/subject/1139336/',
        description: '经典 C 语言入门教材，涵盖基础语法、指针、结构体、文件操作等核心内容，适合零基础学习者。',
        resourceType: 'book',
        techTags: ['c_cpp'],
      },
      {
        title: 'The C Programming Language (K&R)',
        url: 'https://book.douban.com/subject/1236999/',
        description: 'C 语言之父 Brian Kernighan 和 Dennis Ritchie 合著的经典之作，被誉为 C 语言的圣经。',
        resourceType: 'book',
        techTags: ['c_cpp'],
      },
      {
        title: 'CS50: Introduction to Computer Science',
        url: 'https://cs50.harvard.edu/x/',
        description: '哈佛大学的计算机科学导论课程，从 Scratch 到 C 再到 Python，是编程入门的绝佳资源。',
        resourceType: 'course',
        techTags: ['algorithm', 'python'],
      },
      {
        title: '数据结构和算法可视化',
        url: 'https://visualgo.net/zh',
        description: '通过动画直观展示各种数据结构和算法的执行过程，帮助理解抽象的算法概念。',
        resourceType: 'tool',
        techTags: ['algorithm'],
      },
      {
        title: 'LeetCode 刷题指南',
        url: 'https://leetcode.cn/',
        description: '全球知名的算法题库平台，支持多种编程语言，是准备技术面试的必备工具。',
        resourceType: 'article',
        techTags: ['algorithm', 'python', 'java', 'c_cpp'],
      },
    ];

    const resourceIds = [];
    for (const r of resources) {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO resources (id, title, url, description, resource_type, tech_tags, status, submitted_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
      `).run(
        id,
        r.title,
        r.url,
        r.description,
        r.resourceType,
        JSON.stringify(r.techTags),
        userId,
        new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
        new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      );
      resourceIds.push(id);
    }

    // 再生成一条待审核的资源
    const pendingId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO resources (id, title, url, description, resource_type, tech_tags, status, submitted_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      pendingId,
      'Python 爬虫入门教程',
      'https://docs.python.org/zh-cn/3/tutorial/',
      'Python 官方入门教程，涵盖基础语法、标准库、面向对象编程等，适合有编程基础的开发者。',
      'article',
      JSON.stringify(['python']),
      userId,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    console.log(`  ✓ 资源数据已生成（5 条已发布 + 1 条待审核）`);

    console.log('\n[SeedTools] ✅ 完成！');
    console.log(`  考试: ${examId}`);
    console.log(`  资源: ${resourceIds.join(', ')}`);
    console.log(`  待审核: ${pendingId}`);
    console.log('\n现在可以访问 http://localhost:2333/tools/exam 和 http://localhost:2333/tools/resource 查看');

  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('[SeedTools] 失败:', err);
  process.exit(1);
});
