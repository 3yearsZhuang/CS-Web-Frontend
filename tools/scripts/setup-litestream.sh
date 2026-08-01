#!/bin/bash
# @file tools/scripts/setup-litestream.sh — Litestream 安装脚本（裸机部署）
#
# 检测架构下载安装 Litestream，部署配置到 /etc/litestream.yml 并创建 systemd 服务。

set -e

LITESTREAM_VERSION="0.3.13"
ARCH=$(uname -m)
OS=$(uname -s)

case "$ARCH" in
  x86_64)  LITESTREAM_ARCH="amd64" ;;
  aarch64) LITESTREAM_ARCH="arm64" ;;
  *)
    echo "✗ 不支持的架构: $ARCH"
    exit 1
    ;;
esac

echo "▶ 检测到架构: $LITESTREAM_ARCH"
echo "▶ Litestream 版本: v${LITESTREAM_VERSION}"

TARBALL="litestream-v${LITESTREAM_VERSION}-linux-${LITESTREAM_ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/${TARBALL}"

echo "▶ 下载 Litestream..."
curl -sSL "$DOWNLOAD_URL" -o "/tmp/${TARBALL}"

echo "▶ 解压并安装..."
tar -xzf "/tmp/${TARBALL}" -C /tmp
mv /tmp/litestream /usr/local/bin/litestream
chmod +x /usr/local/bin/litestream
rm "/tmp/${TARBALL}"

echo "▶ Litestream 已安装: $(litestream version)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

mkdir -p "$PROJECT_ROOT/tools/deploy"
mkdir -p "$PROJECT_ROOT/backups"

if [ ! -f "$PROJECT_ROOT/tools/deploy/litestream.yml" ]; then
  echo "✗ 未找到 tools/deploy/litestream.yml，请先创建配置文件。"
  exit 1
fi

cp "$PROJECT_ROOT/tools/deploy/litestream.yml" /etc/litestream.yml

cat > /etc/systemd/system/litestream.service << SERVICE
[Unit]
Description=Litestream — SQLite 流式备份
Documentation=https://litestream.io
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/litestream replicate -config /etc/litestream.yml
ExecStop=/bin/kill -TERM \$MAINPID
Restart=always
RestartSec=5

# 安全加固
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$PROJECT_ROOT/data $PROJECT_ROOT/backups
ReadOnlyPaths=$PROJECT_ROOT/tools/deploy/litestream.yml

[Install]
WantedBy=multi-user.target
SERVICE

echo "▶ systemd 服务已创建: /etc/systemd/system/litestream.service"

systemctl daemon-reload
systemctl enable litestream
systemctl start litestream

echo ""
echo "============================================"
echo "  Litestream 安装完成！"
echo ""
echo "  常用命令："
echo "    systemctl status litestream   # 查看状态"
echo "    journalctl -u litestream -f   # 查看日志"
echo "    systemctl restart litestream  # 重启服务"
echo ""
echo "  恢复数据库："
echo "    litestream restore -o data/app-restored.db data/app.db"
echo "============================================"
