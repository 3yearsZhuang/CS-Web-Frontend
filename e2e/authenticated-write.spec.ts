import { test, expect } from '@playwright/test';

/**
 * 登录后写链路 E2E：F 登录并建队 → LF 登录后读取同一后端数据。
 *
 * 登录走各站同源 BFF（Cookie 会话），page.request 与浏览器上下文共享 Cookie，
 * 因此同时验证了 BFF 登录、Cookie 回写与鉴权链路。
 *
 * 需要先用 provision_e2e_user.py 准备固定账号，并通过环境变量传入：
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_USER_NAME
 * 未配置时整组跳过（公开契约烟测仍由 cross-site-contract.spec.ts 覆盖）。
 */
const F_BASE = process.env.E2E_F_BASE ?? 'http://127.0.0.1:2333';
const LF_BASE = process.env.E2E_LF_BASE ?? 'http://127.0.0.1:3000';

const USER_EMAIL = process.env.E2E_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? '';
const USER_NAME = process.env.E2E_USER_NAME ?? 'e2e_runner';

interface TeamListBody {
  items?: Array<{ name?: string }>;
}

function hasTeam(body: TeamListBody, name: string): boolean {
  return (body.items ?? []).some((item) => item.name === name);
}

test.describe('登录后写链路', () => {
  test.skip(
    !USER_EMAIL || !USER_PASSWORD,
    '未配置 E2E_USER_EMAIL / E2E_USER_PASSWORD（先运行 provision_e2e_user.py）',
  );

  test('F 创建队伍后 LF 可读取同一后端数据', async ({ page }) => {
    const teamName = `e2e-${Date.now()}`;

    // 1) 官网登录（同源 BFF → FastAPI，HttpOnly Cookie）
    const fLogin = await page.request.post(`${F_BASE}/api/auth/login`, {
      data: { email: USER_EMAIL, password: USER_PASSWORD },
    });
    expect(fLogin.ok(), await fLogin.text()).toBeTruthy();
    const fMe = await page.request.get(`${F_BASE}/api/auth/me`);
    expect(fMe.ok()).toBeTruthy();
    expect((await fMe.json()).user).toBeTruthy();

    // 2) 官网写：创建队伍（Cookie 身份经 BFF → FastAPI）
    const created = await page.request.post(`${F_BASE}/api/teams`, {
      data: { name: teamName },
    });
    expect(created.ok(), await created.text()).toBeTruthy();

    const fList = await page.request.get(`${F_BASE}/api/teams?limit=100`);
    expect(fList.ok()).toBeTruthy();
    expect(hasTeam(await fList.json(), teamName)).toBe(true);

    // 3) 旧端登录（用户名 + 密码）
    const lfLogin = await page.request.post(`${LF_BASE}/api/auth/login`, {
      data: { username: USER_NAME, password: USER_PASSWORD },
    });
    expect(lfLogin.ok(), await lfLogin.text()).toBeTruthy();

    // 4) 旧端读：钱包摘要可用
    const wallet = await page.request.get(`${LF_BASE}/api/wallet/me`);
    expect(wallet.status()).toBe(200);
    const summary = (await wallet.json()) as { balance?: string };
    expect(Number(summary.balance ?? 0)).toBeGreaterThan(0);

    // 5) 旧端读：能看到官网刚创建的队伍（同一后端事实源）
    const lfList = await page.request.get(`${LF_BASE}/api/teams?limit=100`);
    expect(lfList.ok()).toBeTruthy();
    expect(hasTeam(await lfList.json(), teamName)).toBe(true);
  });
});
