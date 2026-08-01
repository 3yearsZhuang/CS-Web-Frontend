# 部署指南

> 最后更新：2026-07-29

---

## 生产环境准备

### 环境要求

- Node.js 20+
- pnpm 9+
- 反向代理（Nginx / Caddy / Cloudflare Tunnel）
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)（仅内网穿透需要）

### 环境变量

生产环境必须正确配置以下变量（复制 `.env.example` 为 `.env`）：

```bash
# === 必填 ===
AUTH_SESSION_SECRET=<32字节以上随机字符串>
NEXT_PUBLIC_SITE_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# === 邮件服务 ===
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM="FZTBU CS <noreply@example.com>"

# === 安全 ===
TRUST_PROXY=true              # 反向代理部署时必设为 true
PASSWORD_RESET_DEFAULT=FZTBU_CS  # 建议修改为更复杂的默认密码
```

### Session 密钥生成

```bash
# 生成 64 字节随机密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 部署方式

### 方式一：Docker + Caddy（推荐）

```bash
cd tools/deploy
cp .env.example .env          # 编辑 .env 填写生产环境变量
docker compose up -d
```

架构说明：
- Caddy 容器：自动申请和管理 HTTPS 证书，反向代理到应用容器
- 应用容器：运行 `pnpm start`
- 数据卷：`data/` 目录挂载以持久化 SQLite 数据库

首次部署后创建管理员：

```bash
docker compose exec app node tools/scripts/create-user.mjs --role root
docker compose exec app node tools/scripts/create-user.mjs --role admin
```

### 方式二：直接运行

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

配合 Nginx / Caddy / Cloudflare Tunnel 等反向代理使用。

### 方式三：内网穿透（开发调试 / 临时公网访问）

使用 Cloudflare Tunnel 一键将本地服务暴露到公网，无需公网 IP 或端口转发。

```bash
# 1. 先启动本地服务器
pnpm dev

# 2. 另开终端，启动内网穿透
pnpm tunnel
```

脚本会自动完成以下操作：

1. 检测并安装 cloudflared（如未安装则通过 Homebrew 自动安装）
2. 清理已有的旧 tunnel 进程
3. 启动 Cloudflare Tunnel 并提取 `*.trycloudflare.com` 公网地址
4. 自动更新 `.env` 中的 `ALLOWED_ORIGINS` 和 `NEXT_PUBLIC_SITE_URL`

命令行选项：

```bash
pnpm tunnel --port 3000      # 指定本地端口（默认 2333）
pnpm tunnel --no-update-env  # 不更新 .env 文件
```

> 注意：`NEXT_PUBLIC_*` 变量在 Next.js 构建时嵌入，修改 `.env` 后需要重启 `pnpm dev` 才能生效。

### 方式四：静态导出 + 独立后端（不推荐）

项目使用 App Router + API Routes，不支持 `next export` 静态导出。

---

## 反向代理配置

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:2333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```caddy
your-domain.com {
    reverse_proxy 127.0.0.1:2333
}
```

Caddy 会自动处理 HTTPS 证书。

---

## 安全注意事项

### 必须修改的默认值

1. `AUTH_SESSION_SECRET` - 必须使用随机生成的强密钥，绝对不能使用默认值
2. `PASSWORD_RESET_DEFAULT` - 建议修改为更复杂的默认密码
3. `ALLOWED_ORIGINS` - 必须设置为实际的生产域名
4. `NEXT_PUBLIC_SITE_URL` - 必须设置为实际的 HTTPS URL

### 反向代理安全

- 必须设置 `TRUST_PROXY=true`，否则速率限制将无法正确获取客户端 IP
- 确保反向代理设置了正确的 `X-Forwarded-For` 和 `X-Forwarded-Proto` 头
- 生产环境建议在反向代理层配置额外的速率限制

### 数据库备份（Litestream 流式备份）

本项目使用 Litestream 实现 SQLite 实时流式备份。Litestream 监控 WAL 文件变更，将增量数据实时复制到备份目标，支持 Point-in-Time Recovery (PITR)，数据丢失窗口通常 < 1 秒。

#### Docker 部署（自动启用）

Docker Compose 部署已内置 Litestream，容器启动时自动运行。

备份文件存储在 `backups/` 目录（通过 bind mount 持久化）：

```
backups/
├── generations/    # 快照代
└── wal/            # WAL 增量
```

#### 裸机部署（手动安装）

```bash
sudo ./tools/scripts/setup-litestream.sh
```

安装后通过 systemd 管理：

```bash
systemctl status litestream    # 查看状态
journalctl -u litestream -f    # 查看日志
```

#### 恢复数据库

```bash
# 从本地备份恢复
litestream restore -o data/app-restored.db data/app.db

# 恢复后替换原数据库（先停止应用）
cp data/app-restored.db data/app.db
```

#### S3 远程备份（可选）

编辑 `tools/deploy/litestream.yml`，取消注释 S3 配置块并填写凭证。Docker 部署时将 AWS 凭证通过环境变量传入：

```bash
LITESTREAM_ACCESS_KEY_ID=AKIA... docker compose up -d
```

### 日志与监控

- 应用日志输出到 stdout/stderr，可通过 Docker 或 systemd 收集
- 建议配置日志轮转，避免日志文件过大
- 管理员操作审计日志存储在数据库 `admin_actions` 表中

### HTTPS

- 生产环境必须启用 HTTPS
- Docker + Caddy 方案自动处理证书
- 直接运行时需在反向代理层配置 SSL 证书

---

## 维护操作

### 创建管理员

```bash
# 创建超级管理员（root）
pnpm create-user --role root

# 创建普通管理员（admin）
pnpm create-user --role admin
```

管理员账户只能通过 CLI 创建，不暴露 HTTP 接口。

### 更新部署

```bash
git pull
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Docker 部署：

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

### 数据库迁移

数据库 schema 在应用启动时自动初始化（幂等），新增表或列通过 `db.ts` 中的增量迁移自动处理，无需手动执行 SQL。

---

## 故障排查

### 端口冲突

默认端口 2333，如果被占用：

```bash
# 查看端口占用
lsof -i :2333

# 修改端口（通过环境变量或启动参数）
PORT=5200 pnpm start
```

### 数据库锁定

SQLite 在并发写入时可能出现锁定。better-sqlite3 默认使用 WAL 模式，支持并发读但写入串行。如果频繁出现锁定：
- 检查是否有多个进程同时访问数据库
- 考虑升级到 PostgreSQL（需要修改 db.ts）

### Session 失效

如果用户频繁掉线：
- 检查 `AUTH_SESSION_SECRET` 是否在生产环境变更
- 检查反向代理是否正确传递 Cookie
- 确认 `NEXT_PUBLIC_SITE_URL` 配置正确