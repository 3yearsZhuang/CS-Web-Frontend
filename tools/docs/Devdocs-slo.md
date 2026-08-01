# SLO 与错误预算

> 文档类型：reference + how-to（SLO 管理流程）| 受众：站点 owner / oncall / 发布决策者
> Source of truth：SLO 唯一权威位置；roadmap R 表与 runbook 引用本文档 | 最后验证：2026-07-31 | cadence：每月 1 日 review budget 消耗 / 每季度 review SLO 阈值 | Stale 信号：连续 2 月未记录 / 可用性低于目标 / 季度 review 未执行
> 变更触发：性能可用性偏离 SLO / 用户量增长触发容量重评估 / 重大架构变更（如 PG 迁移）

---

## 一、SLO 定义（0.9.1 最小集）

> SLO = Service Level Objective。SLI（指标）→ SLO（目标）→ Error Budget（允许失败的预算）。
> 0.9.1 采用用户视角的 SLO：可用性 + 关键路径延迟 + 错误率，不追求全覆盖。

### 1. SLI / SLO 矩阵

| SLI | 定义 | SLO 目标 | 测量窗口 | Error Budget |
|-----|------|---------|---------|-------------|
| 可用性 | `/api/health` 返回 200 的比例 | 99.0% / 月 | 30 天滚动 | 432 分钟/月（≈ 7.2 小时） |
| API 错误率 | 5xx 响应 / 总响应（核心端点） | < 1% / 月 | 30 天滚动 | 1% 允许 5xx |
| API P95 延迟 | 核心端点 P95 响应时间 | < 500ms | 5 分钟滚动 | 连续 3 个 5 分钟窗口超阈值 = 预算消耗 |
| 考试提交可用性 | `/api/exam/submit` 成功率 | 99.9% / 考试期 | 单次考试窗口 | 0 次失败（关键业务） |

### 2. 核心端点清单（SLO 覆盖范围）

```
GET  /api/health                  — 可用性探活
POST /api/auth/login              — 认证关键路径
GET  /api/community/forum/topics  — 论坛列表（读高频）
POST /api/exam/submit             — 考试提交（业务关键，单独 SLO）
GET  /api/events                  — 活动列表
GET  /api/notifications           — 通知（轮询高频）
```

非核心端点（管理后台、低频管理操作）不纳入 SLO，但仍受监控。

### 3. 测量方法

| SLI | 数据源 | 采集方式 |
|-----|-------|---------|
| 可用性 | `/api/health` | Caddy healthcheck + 外部探针（待接入，见 P2 跟进） |
| API 错误率 | pino NDJSON 日志 | 日志聚合统计 `level=error` + HTTP `status>=500` |
| API P95 延迟 | pino `requestId` + `responseTime` 字段 | 日志聚合按端点分组计算 P95 |
| 考试提交 | pino 业务日志 | 按考试 ID 聚合 `exam.submit` 事件成功率 |

降级方案：外部探针未接入前，可用性 SLI 降级为"应用层 `/api/health` 日志统计"，不构成真实端到端可用性。该降级在 R18 显式登记为风险接受，外部探针接入后消除。

---

## 二、Error Budget 消耗规则

### 1. 预算消耗场景与响应动作

| 消耗速度 | 触发条件 | 响应动作 |
|---------|---------|---------|
| 正常 | 月消耗 < 50% 预算 | 无动作，继续迭代 |
| 预警 | 月消耗 50%–80% | oncall 在月度 review 中标记，分析根因 |
| 警戒 | 月消耗 80%–100% | 暂停非紧急功能迭代，优先修复可靠性问题 |
| 超支 | 月消耗 > 100% | 冻结所有非可靠性相关发布，直至下月预算重置 |
| 考试期紧急 | 考试提交成功率 < 99.9% | 立即介入，按 [runbook 考试失败场景](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-runbook.md) 处置 |

### 2. 预算冻结与解冻

- 冻结条件：月可用性预算超支（> 7.2 小时宕机）或考试期 SLO 违约
- 冻结范围：所有非 hotfix 发布暂停；hotfix 须经 oncall 批准
- 解冻条件：下一测量窗口开始 + 根因分析文档完成（写入 [Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) ADR）

---

## 三、SLO 评审流程

### 1. 月度 Review（每月 1 日）

```
1. 采集上月 SLI 数据（pino 日志聚合 + /api/health 日志）
2. 计算可用性 / 错误率 / P95 是否达成 SLO
3. 计算 error budget 消耗比例
4. 若超支 → 触发根因分析 + 写入 roadmap ADR
5. 更新本文档「四、Error Budget 历史」表格
6. 若连续 2 月超支 → 评估是否下调 SLO 目标（需 owner 批准）
```

### 2. 季度 Review（每季度末）

```
1. 评估 SLO 阈值是否符合实际用户体验
2. 评估核心端点清单是否需调整
3. 评估是否新增 SLI（如磁盘空间、Litestream 备份延迟）
4. 评估 EX-1 单实例风险接受是否仍合理（用户量、写 QPS）
```

### 3. 年度 Review（每年 12 月）

- 评估是否升级可用性目标（99.0% → 99.5%）
- 评估是否需多实例化（L3 多区域灾备触发）

---

## 四、Error Budget 历史记录

> 每月 review 后追加一行。首次发布前为空，发布后开始记录。

| 月份 | 可用性 | 5xx 错误率 | P95 延迟 | Budget 消耗 | 状态 | 备注 |
|------|--------|----------|---------|------------|------|------|
| 2026-08 | — | — | — | — | 待发布 | 0.9.1 发布后首个完整月 |

---

## 五、相关文档与 ADR

- [Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) — ADR-018（0.9.1 SLO 定义与单实例风险接受）、R18（SLO 未接入外部探针前的降级风险）
- [Devdocs-runbook.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-runbook.md) — SLO 违约时的运维处置流程
- [Devdocs-deployment-guide.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-deployment-guide.md) — 部署与回滚（影响可用性）
