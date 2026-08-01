# ============ Stage 1: Builder ============
FROM node:20-slim AS builder

# better-sqlite3 预编译包不可用时需要编译，安装构建工具
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# 先复制依赖描述文件，利用 Docker 层缓存加速重复构建
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建 Next.js 生产版本
RUN pnpm next build

# 打包自定义服务器（CJS 格式，目标 node20）
RUN pnpm tsup src/server.ts \
  --format cjs \
  --platform node \
  --target node20 \
  --outDir dist \
  --no-splitting \
  --no-minify

# ============ Stage 2: Runner ============
FROM node:20-slim AS runner

# 安装 Litestream（SQLite 流式备份工具）
# 版本锁定确保可复现构建
ARG LITESTREAM_VERSION=0.3.13
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -sSL https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-v${LITESTREAM_VERSION}-linux-amd64.deb \
      -o /tmp/litestream.deb && \
    dpkg -i /tmp/litestream.deb && \
    rm /tmp/litestream.deb && \
    apt-get remove -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# 仅安装生产依赖（排除 devDependencies）
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# 从 builder 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# 复制 Litestream 配置与 entrypoint
COPY tools/deploy/litestream.yml /etc/litestream.yml
COPY tools/deploy/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# 创建数据与备份目录
# - data/: SQLite 数据库 + 用户上传文件
# - backups/: Litestream 本地备份目标
RUN mkdir -p data backups

EXPOSE 2333

ENTRYPOINT ["/app/docker-entrypoint.sh"]
