#!/bin/bash
# ============ Docker Entrypoint ============
# 启动 Node.js 应用服务器（主进程）。
# 数据持久化由后端 PostgreSQL 承载，前端不再以本地 SQLite 为主存储，
# 因此移除原 Litestream（SQLite 专用流式备份）逻辑。
# ==========================================

set -e

# ---------- 启动 Node.js 应用 ----------
echo "[entrypoint] 启动应用服务器..."
exec node dist/server.js