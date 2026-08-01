#!/usr/bin/env bash
# Litestream 恢复演练脚本
#
# 在隔离环境验证 Litestream 备份可恢复，不影响生产数据。

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
PROD_DB="${PROD_DB:-./data/app.db}"
RESTORE_DB="${RESTORE_DB:-./data/app-restored-drill.db}"
LOG_FILE="${LOG_FILE:-./restore-drill.log}"
LITESTREAM_BIN="${LITESTREAM_BIN:-litestream}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

if ! command -v "$LITESTREAM_BIN" &> /dev/null; then
  error "litestream 未安装。安装：sudo ./tools/scripts/setup-litestream.sh 或 brew install litestream"
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  error "备份目录不存在: $BACKUP_DIR"
  exit 2
fi

if [ ! -f "$PROD_DB" ]; then
  warn "生产数据库不存在: $PROD_DB（可能是首次部署，跳过演练）"
  exit 0
fi

rm -f "$RESTORE_DB"

log "========== Litestream 恢复演练开始 =========="
log "备份目录: $BACKUP_DIR"
log "生产数据库: $PROD_DB"
log "恢复目标: $RESTORE_DB"

# 记录生产数据库当前状态（用于对比）
PROD_USERS=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "N/A")
PROD_SESSIONS=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM sessions;" 2>/dev/null || echo "N/A")
PROD_EVENTS=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "N/A")
PROD_TOPICS=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM topics;" 2>/dev/null || echo "N/A")

log "生产数据库当前状态：users=$PROD_USERS sessions=$PROD_SESSIONS events=$PROD_EVENTS topics=$PROD_TOPICS"

START_TIME=$(date +%s)
log "开始 restore..."

if ! $LITESTREAM_BIN restore -o "$RESTORE_DB" "$PROD_DB"; then
  error "litestream restore 失败"
  exit 3
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
log "restore 完成，耗时: ${DURATION}s"

log "开始数据完整性校验..."

RESTORED_USERS=$(sqlite3 "$RESTORE_DB" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
RESTORED_SESSIONS=$(sqlite3 "$RESTORE_DB" "SELECT COUNT(*) FROM sessions;" 2>/dev/null || echo "0")
RESTORED_EVENTS=$(sqlite3 "$RESTORE_DB" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "0")
RESTORED_TOPICS=$(sqlite3 "$RESTORE_DB" "SELECT COUNT(*) FROM topics;" 2>/dev/null || echo "0")

log "恢复数据库状态：users=$RESTORED_USERS sessions=$RESTORED_SESSIONS events=$RESTORED_EVENTS topics=$RESTORED_TOPICS"

# 校验：恢复的行数应 >= 0 且关键表存在
VALIDATION_PASS=true

if [ "$RESTORED_USERS" = "0" ]; then
  error "users 表为空或不存在"
  VALIDATION_PASS=false
fi

for table in users sessions events topics; do
  if ! sqlite3 "$RESTORE_DB" ".tables" 2>/dev/null | grep -q "$table"; then
    error "表 $table 不存在于恢复的数据库中"
    VALIDATION_PASS=false
  fi
done

INTEGRITY=$(sqlite3 "$RESTORE_DB" "PRAGMA integrity_check;" 2>/dev/null || echo "error")
if [ "$INTEGRITY" != "ok" ]; then
  error "数据库完整性检查失败: $INTEGRITY"
  VALIDATION_PASS=false
fi

if [ "$VALIDATION_PASS" = false ]; then
  error "数据完整性校验失败"
  exit 4
fi

success "数据完整性校验通过"
success "恢复演练成功！耗时: ${DURATION}s"

log "========== 演练结果汇总 =========="
log "恢复耗时: ${DURATION}s"
log "数据完整性: PRAGMA integrity_check = ok"
log "users: $RESTORED_USERS（生产: $PROD_USERS）"
log "sessions: $RESTORED_SESSIONS（生产: $PROD_SESSIONS）"
log "events: $RESTORED_EVENTS（生产: $PROD_EVENTS）"
log "topics: $RESTORED_TOPICS（生产: $PROD_TOPICS）"
log "==================================="

# 清理演练文件（保留 log）
rm -f "$RESTORE_DB"
log "已清理演练恢复文件: $RESTORE_DB"

log "========== Litestream 恢复演练结束 =========="
