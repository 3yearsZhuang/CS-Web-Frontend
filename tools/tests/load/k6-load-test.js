/**
 * k6 负载测试脚本 — 0.9.1 预发布容量验证
 *
 * 对应 Devdocs-slo.md「核心端点 P95 < 500ms」SLO。
 *
 * 使用：
 *   # 安装 k6（macOS）
 *   brew install k6
 *
 *   # 运行（默认对本地 dev server 压测）
 *   k6 run tools/tests/load/k6-load-test.js
 *
 *   # 对生产环境压测（谨慎！仅低并发）
 *   BASE_URL=https://your-domain.com k6 run --vus 10 --duration 30s tools/tests/load/k6-load-test.js
 *
 *   # 自定义参数
 *   k6 run --vus 50 --duration 2m --env BASE_URL=http://localhost:2333 tools/tests/load/k6-load-test.js
 *
 * SLO 验收标准（参见 Devdocs-slo.md）：
 *   - http_req_failed < 0.01（< 1% 5xx 错误率）
 *   - http_req_duration{p(95)} < 500（P95 < 500ms）
 *   - 考试提交端点 http_req_failed == 0（0 失败）
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const healthDuration = new Trend('health_duration');
const loginDuration = new Trend('login_duration');
const forumDuration = new Trend('forum_duration');
const eventsDuration = new Trend('events_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:2333';

// 测试账号（由 globalSetup 或 seed 创建）
const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'LoadTest123!',
};

export const options = {
  scenarios: {
    // 场景 1：健康检查 + 公开端点（读密集）
    public_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // 预热
        { duration: '2m', target: 50 },   // 峰值
        { duration: '30s', target: 0 },   // 降温
      ],
      exec: 'publicRead',
    },
    // 场景 2：认证后端点（写路径，低并发）
    authenticated: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'authenticated',
      startTime: '30s', // 延后启动，避免与场景 1 抢资源
    },
  },
  thresholds: {
    // SLO 阈值（参见 Devdocs-slo.md）
    http_req_failed: ['rate<0.01'],           // < 1% 错误率
    'http_req_duration{p(95)}': ['<500'],     // P95 < 500ms
    errors: ['rate<0.05'],                    // 业务错误率 < 5%
    health_duration: ['p(95)<100'],           // 健康检查 P95 < 100ms
    login_duration: ['p(95)<1000'],           // 登录 P95 < 1s（scrypt 计算）
    forum_duration: ['p(95)<500'],
    events_duration: ['p(95)<500'],
  },
};

// 复用 session cookie
let sessionCookie = null;

export function setup() {
  // 预登录获取 session（仅一次）
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(TEST_USER),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (loginRes.status === 200) {
    sessionCookie = loginRes.cookies;
    console.log(`[setup] 预登录成功，session 已获取`);
  } else {
    console.warn(`[setup] 预登录失败（${loginRes.status}），认证场景将跳过`);
  }
  return { sessionCookie };
}

// 场景 1：公开端点读压测
export function publicRead() {
  group('健康检查', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    healthDuration.add(res.timings.duration);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'has database check': (r) => r.json('checks.database') === 'ok',
    });
    errorRate.add(!ok);
  });

  group('论坛主题列表', () => {
    const res = http.get(`${BASE_URL}/api/community/forum/topics?page=1&pageSize=20`);
    forumDuration.add(res.timings.duration);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  group('活动列表', () => {
    const res = http.get(`${BASE_URL}/api/events?page=1`);
    eventsDuration.add(res.timings.duration);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(1); // 模拟用户阅读间隔
}

// 场景 2：认证后端点压测
export function authenticated(data) {
  if (!data.sessionCookie) {
    console.warn('[authenticated] 无 session，跳过');
    return;
  }

  const cookieStr = Object.entries(data.sessionCookie)
    .map(([k, v]) => `${k}=${v.value}`)
    .join('; ');

  group('当前用户信息', () => {
    const res = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookieStr },
    });
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  group('通知列表', () => {
    const res = http.get(`${BASE_URL}/api/notifications?page=1`, {
      headers: { Cookie: cookieStr },
    });
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(2); // 认证路径更长间隔
}

// 结果摘要
export function handleSummary(data) {
  const summary = {
    p95_duration: data.metrics.http_req_duration.values['p(95)'],
    failed_rate: data.metrics.http_req_failed.values.rate,
    total_requests: data.metrics.http_reqs.values.count,
  };

  console.log('\n========== 负载测试结果 ==========');
  console.log(`总请求数: ${summary.total_requests}`);
  console.log(`P95 延迟: ${summary.p95_duration}ms (SLO < 500ms)`);
  console.log(`失败率: ${(summary.failed_rate * 100).toFixed(2)}% (SLO < 1%)`);
  console.log('==================================\n');

  // SLO 通过性判断
  const sloPass = summary.p95_duration < 500 && summary.failed_rate < 0.01;
  console.log(sloPass ? '✅ SLO 达标' : '❌ SLO 未达标，需分析根因');

  return {};
}
