#!/bin/bash
# @file tools/scripts/build/subset-pixel-font.sh — 像素字体（Fusion Pixel）子集化再生成
#
# 背景：像素字体原始全字符版本 656KB，是首屏最大的单个资源（限速下约 3s）。
# 它只用于装饰性文本（标题虚影、章节编号、像素按钮、元数据层），因此按「站内实际用到的
# 字符集」子集化：从 src/ 全量源码（i18n 文案 / demo 数据 / 组件字面量）提取字符，
# 子集后约 40KB（16 倍缩减）。
#
# 何时需要重跑：新增/修改界面文案后（尤其是含生僻字的新词），否则该字会回退到等宽字体栈
# （--font-pixel 的 fallback: ui-monospace/Menlo/…），表现为字形与像素风格不一致。
#
# 依赖：fonttools + brotli（woff2 读写）
#   uv pip install fonttools brotli        # 或 python3 -m pip install --user fonttools brotli
#
# 用法：bash tools/scripts/build/subset-pixel-font.sh
set -euo pipefail

cd "$(dirname "$0")/../../.."   # 仓库根（CS-Web-Frontend/）
FONT="src/app/fonts/fusion-pixel-zh_hans.woff2"
CHARS="$(mktemp -t pixel-chars.XXXXXX)"
OUT="$(mktemp -t pixel-subset.XXXXXX)"

echo "▶ 从 src/ 提取用到的字符集…"
node -e '
const fs=require("fs"),path=require("path");
const set=new Set();
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory()){if(!/node_modules|\.build|\.next/.test(p))walk(p);}
 else if(/\.(ts|tsx|json|css|mjs)$/.test(e.name)){for(const ch of fs.readFileSync(p,"utf8"))set.add(ch);}}})("src");
// 兜底：ASCII 可打印 + 常用中英标点/符号（动态数据里常见的分隔符）
for(let c=0x20;c<0x7f;c++)set.add(String.fromCharCode(c));
for(const ch of "　、。〃〈〉《》「」『』【】〔〕〖〗！？，．：；‘’“”…—～·×÷≤≥≠±°※→←↑↓∈∑√∞")set.add(ch);
fs.writeFileSync(process.argv[1],[...set].join(""));
' "$CHARS"

echo "▶ 子集化：$FONT"
python3 -m fontTools.subset "$FONT" \
  --text-file="$CHARS" \
  --flavor=woff2 \
  --layout-features='*' \
  --output-file="$OUT"

before=$(wc -c < "$FONT")
after=$(wc -c < "$OUT")
cp "$OUT" "$FONT"
rm -f "$CHARS" "$OUT"

echo "✓ 完成：$before → $after bytes（$(echo "scale=1; $before/$after" | bc)x）"
echo "  提示：若页面出现「字形风格不一致」的汉字，说明该字未纳入子集，重跑本脚本即可。"
