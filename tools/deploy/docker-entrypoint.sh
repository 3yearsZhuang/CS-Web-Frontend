#!/bin/bash
# ============ Docker Entrypoint ============
# 启动时先恢复数据库（如果 data/ 为空但有备份），然后同时运行：
#   1. Litestream replicate — 实时流式备份（后台守护进程）
#   2. Node.js 应用服务器 — 主进程
#
# 如果 Litestream 不可用（裸机部署），仅启动 Node.js 应用。
# ==========================================

set -e

DB_PATH="${SQLITE_DB_PATH:-/app/data/app.db}"
DATA_DIR="$(dirname "$DB_PATH")"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
LITESTREAM_CONFIG="${LITESTREAM_CONFIG:-/etc/litestream.yml}"

echo "[entrypoint] DB path: $DB_PATH"
echo "[entrypoint] Backup dir: $BACKUP_DIR"

# 确保数据目录和备份目录存在
mkdir -p "$DATA_DIR" "$BACKUP_DIR"

# ---------- Litestream 恢复（如果数据库不存在但有备份） ----------
if [ -f /usr/local/bin/litestream ]; then
  if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] 数据库文件不存在，尝试从备份恢复..."
    if litestream restore -config "$LITESTREAM_CONFIG" -if-db-not-exists -o "$DB_PATH" "$DB_PATH"; then
      echo "[entrypoint] 数据库已从备份恢复。"
    else
      echo "[entrypoint] 无可用备份，将创建新数据库。"
    fi
  fi

  # ---------- 启动 Litestream 守护进程 ----------
  echo "[entrypoint] 启动 Litestream 流式备份..."
  litestream replicate -config "$LITESTREAM_CONFIG" &
  LITESTREAM_PID=$!
  echo "[entrypoint] Litestream PID: $LITESTREAM_PID"

  # 确保 Litestream 退出时不会留下僵尸进程
  trap "echo '[entrypoint] 停止 Litestream...'; kill $LITESTREAM_PID 2>/dev/null; exit 0" TERM INT
else
  echo "[entrypoint] Litestream 未安装，跳过流式备份。"
fi

# ---------- 启动 Node.js 应用 ----------
echo "[entrypoint] 启动应用服务器..."
exec node dist/server.js