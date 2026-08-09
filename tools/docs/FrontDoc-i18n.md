# FZTBUCS-i18n-国际化迁移状态与指南

> 文档定位：前端国际化（i18n）迁移的当前状态、标准迁移流程、剩余待办清单（status + runbook）
> 受众：前端维护者 / 后续执行迁移的开发者
> Source of truth：`src/i18n/` 语言包 + 各组件 `useTranslations` 使用情况；本文与代码同步更新
> 关联：next-intl 官方文档（App Router，无 i18n 路由模式）；架构见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；UI 规范见 [FrontDoc-UID.md](FrontDoc-UID.md)；编码规范见 [FrontDoc-Conv.md §9](FrontDoc-Conv.md#9-i18n-约定)
> 最后更新：2026-08-05（统一 FrontDoc 命名）
> 更新人：3yearsZ
> 变更触发：新增/修改语言包 key、迁移组件文案、调整语言切换机制
> Stale 信号：某组件仍含硬编码中文但未登记在"剩余清单"，或语言包 key 与组件引用不一致

---

## 一、背景与架构决策

### 1.1 目标
把全站硬编码中文（含「中文 / English」双语标签）迁移到统一的国际化模块，支持中文/英文切换。

### 1.2 技术选型：next-intl（无 i18n 路由模式）
- 采用 **next-intl@4.x**，使用 **"无 i18n 路由"（without i18n routing）模式**：**URL 不带 locale 前缀**（`/community` 而非 `/zh-CN/community`），避免改动所有路由/重定向。
- locale 从 **cookie `locale`** 解析（优先级：cookie > Accept-Language > 默认 `zh-CN`），详见 `src/i18n/request.ts`。
- **语言切换器** `src/components/layout/language-switcher.tsx`：写 `locale` cookie 后 `window.location.reload()` 触发服务端重渲染，已接入 Navbar。
- 语言包结构为 **namespace 化的 TS 对象**（`src/i18n/languages/zh-CN.ts` / `en.ts`），与 next-intl 的 `useTranslations(namespace)` 兼容。

### 1.3 为什么不用路径前缀
项目用自定义 server（`src/server.ts` + `src/proxy.ts`，CSP nonce）且全站 URL 稳定；路径前缀方案会破坏所有链接/重定向/SEO，风险过高。

---

## 二、基础设施（已完成）

| 文件 | 作用 |
|---|---|
| `src/i18n/request.ts` | `getRequestConfig`：cookie/浏览器语言解析 + 加载语言包 |
| `src/i18n/types.ts` | `AppMessages` 结构类型 + `MessageKey`/`NavMessageKey` 等 |
| `src/i18n/languages/zh-CN.ts` | 中文语言包 |
| `src/i18n/languages/en.ts` | 英文语言包 |
| `src/app/layout.tsx` | `NextIntlClientProvider` 包裹全站 |
| `next.config.ts` | `createNextIntlPlugin('./src/i18n/request.ts')` |
| `src/components/layout/language-switcher.tsx` | 语言切换器（Navbar 中） |

---

## 三、已完成迁移（累计）

> ℹ️ 已完成迁移记录已迁移至 `docs/项目演变历史.md`。

---

## 四、标准迁移流程（后续执行者参考）

每迁移一个文件，按以下 4 步：

1. **`src/i18n/types.ts`**：在 `AppMessages` 新增或扩展 namespace，定义所有 key（`string`）。
2. **`src/i18n/languages/zh-CN.ts` 与 `en.ts`**：补全该 namespace 的中英文 key。**两个语言包 key 必须与 types 完全一致**，否则 next-intl 报 `MISSING_MESSAGE`。
3. **组件**：`useTranslations(namespace)`（客户端）或 `getTranslations(namespace)`（服务端），逐处替换硬编码中文。
   - 模块级常量数组（如 `TOOLS`、`BELIEFS`）：改为存 key（`titleKey`/`descKey`），组件内 `t(key)` 翻译。
   - 组件内部函数（如 `tabTitle`、`statusLabel`）：改为返回 key，组件内 `t()` 解析。
4. **验证**：`pnpm ts-check`（tsc）通过；`curl` 带 `Cookie: locale=en` / `locale=zh-CN` 验证文案切换；确认无 `MISSING_MESSAGE`。

### 注意事项
- **语言包 key 冲突**：若 types/language 中已有同 namespace（如 `auth`、`community`、`admin` 旧骨架），需**合并**而非重复定义（否则 `Duplicate identifier`）。
- **改 next.config.ts 后必须重启 dev server**（`lsof -ti :2333 | xargs kill` + `nohup pnpm dev`），热重载对 next-intl 配置不生效。
- **新增语言包 key 后**若报 `MISSING_MESSAGE`，需重启 dev server 清除 next-intl 服务端缓存。
- **JS 语法**：避免混用 `??` 与 `||` 不括号（SyntaxError，Next 编译失败返回 500 HTML）。
- **多语言切换**依赖 cookie `locale`；语言切换器写 cookie 后 reload。

---

## 五、剩余待迁移清单（后续迭代）

> ℹ️ 剩余待迁移清单（后续迭代）已迁移至 `docs/项目待办事项.md`。

---

## 六、已知环境问题（与 i18n 无关，仅记录）

- **`preload is not defined`**：`layout.tsx` 中 `react-dom` 的 `preconnect` 在 Next16 + 自定义 server + next-intl 的 dev 期非致命错误，不影响页面渲染。
- **`mail.ts` 浏览器端报错**：`src/shared/utils/mail.ts` 的 `import 'server-only'` 被客户端组件（`verification-code.ts`）间接导入，浏览器端报错。属既有问题。
- **测试文件**：`tools/tests/mask.test.ts` 曾引用已私有的 `maskName/maskStudentId/maskString`，已修复（移除对应导入与测试块）。

---

## 七、下一步建议

> ℹ️ 下一步建议已迁移至 `docs/项目待办事项.md`。
