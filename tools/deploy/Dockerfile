# ============ Stage 1: Builder ============
FROM node:20-slim AS builder

# 中国境内 Debian 镜像源（可通过 --build-arg 覆盖）
ARG APT_MIRROR=https://mirrors.aliyun.com/debian
ARG APT_SECURITY_MIRROR=https://mirrors.aliyun.com/debian-security
RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i \
        -e "s#https\?://deb.debian.org/debian-security#${APT_SECURITY_MIRROR}#g" \
        -e "s#https\?://deb.debian.org/debian#${APT_MIRROR}#g" \
        /etc/apt/sources.list.d/debian.sources; \
    fi

# better-sqlite3 预编译包不可用时需要编译，安装构建工具
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# 先复制依赖描述文件，利用 Docker 层缓存加速重复构建
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# 复制源码（精确 COPY，仅构建所需；不携带 tools/docs/、各类文档等无关文件，
# 实现构建内容隔离。context 仍为仓库根，因 Next.js 应用根即仓库根。）
COPY package.json pnpm-lock.yaml .npmrc tsconfig.json next.config.ts postcss.config.mjs ./
COPY src ./src
COPY public ./public

# 构建 Next.js 生产版本
RUN pnpm next build

# 删除 Turbopack/Next 增量编译缓存（可再生；避免镜像层膨胀到数 GB）
RUN rm -rf .build/cache

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
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && \
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
