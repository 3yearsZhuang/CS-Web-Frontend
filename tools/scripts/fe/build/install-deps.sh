#!/bin/bash
# @file tools/scripts/fe/build/install-deps.sh — 依赖安装脚本
#
# 通过 pnpm install 安装依赖（frozen-lockfile + prefer-offline），用于 CI/CD 流水线前。

set -e

echo "▶ Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --ignore-scripts
echo "✓ Prepare completed!"
