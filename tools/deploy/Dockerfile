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

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# 仅安装生产依赖（排除 devDependencies）
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# 从 builder 复制构建产物
COPY --from=builder /app/.build ./.build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# 复制启动脚本（仅负责启动 Node 应用，数据持久化由后端 PostgreSQL 承载）
COPY tools/deploy/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# 创建数据与备份目录（data/: 用户上传文件；backups/: 预留归档目录）
RUN mkdir -p data backups

EXPOSE 2333

ENTRYPOINT ["/app/docker-entrypoint.sh"]
