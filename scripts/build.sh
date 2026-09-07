#!/bin/bash
# dsh-notifier 独立构建（自包含）：junction-link DSH 类型层（import type）+ tsc host + esbuild client。
# 不依赖上游 monorepo 的 scripts/、tsconfig.base、shared/（本仓库自带全部构建脚本）。
# 类型层 @deepseek-ai/* 从 DSH core install 实测版本 junction-link（与运行时一致，
# 避免公共 npm 版本漂移）；tsc/esbuild/@types/node 为本仓库 devDependencies。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── 1) 清空 lib/（纯构建产物）──
rm -rf lib
mkdir -p lib

# ── 2) DSH core install 探测：env → npx 缓存 → 全局 npm → profile ──
DSH_CORE="${DSH_CORE:-}"
if [ -z "$DSH_CORE" ] || [ ! -d "$DSH_CORE/@deepseek-ai/dsh-agent" ]; then
  DSH_CORE=""
  for npx in "$HOME"/.npm/_npx/*/node_modules; do
    if [ -d "$npx/@deepseek-ai/dsh-agent" ]; then DSH_CORE="$npx"; break; fi
  done
fi
if [ -z "$DSH_CORE" ]; then
  GLOBAL_ROOT="$(npm root -g 2>/dev/null || true)"
  if [ -n "$GLOBAL_ROOT" ] && [ -d "$GLOBAL_ROOT/@deepseek-ai/dsh-agent" ]; then DSH_CORE="$GLOBAL_ROOT"; fi
  # 全局 dsh CLI 包的嵌套 node_modules（fnm/npm 全局安装形态：deps 在
  # <global>/@deepseek-ai/dsh/node_modules 下，与 injector build.sh 同款探测）
  if [ -z "$DSH_CORE" ] && [ -n "$GLOBAL_ROOT" ] && [ -d "$GLOBAL_ROOT/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent" ]; then
    DSH_CORE="$GLOBAL_ROOT/@deepseek-ai/dsh/node_modules"
  fi
fi
if [ -z "$DSH_CORE" ]; then
  PROF="$HOME/.dsh/profiles/web/node_modules"
  if [ -d "$PROF/@deepseek-ai/dsh-agent" ]; then DSH_CORE="$PROF"; fi
fi
if [ -z "$DSH_CORE" ]; then
  echo "build: 找不到 DSH core install（含 @deepseek-ai/dsh-agent），设置 DSH_CORE 或先安装 dsh" >&2
  exit 1
fi
echo "=== DSH core types: $DSH_CORE ==="

# ── 3) junction-link @deepseek-ai 类型层（scoped，来自 DSH core install）──
link_pkg() {
  local link="node_modules/@deepseek-ai/$1" target="$DSH_CORE/@deepseek-ai/$1"
  node -e "
    const fs = require('fs'); const path = require('path');
    const link = path.resolve(process.argv[1]); const target = path.resolve(process.argv[2]);
    if (!fs.existsSync(target)) process.exit(0);
    fs.rmSync(link, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  " "$link" "$target"
}
mkdir -p node_modules/@deepseek-ai
for pkg in cordis cosmokit schemastery dsh-settings dsh-agent dsh-host-webserver dsh-session dsh-session-title dsh-user-approval dsh-tools dsh-scope dsh-llm dsh-client-runtime; do
  link_pkg "$pkg"
done

# ── 4) tsc：优先本仓库 node_modules/.bin，回退 profile ──
TSC=""
for t in "$ROOT/node_modules/.bin/tsc" "$HOME/.dsh/profiles/web/node_modules/.bin/tsc"; do
  if [ -x "$t" ] || [ -f "$t.cmd" ]; then TSC="$t"; break; fi
done
if [ -z "$TSC" ]; then echo "build: tsc not found（请先 pnpm install）" >&2; exit 1; fi
echo "=== tsc: $TSC ==="

# ── 5) host 编译（排除 src/client，客户端由 build-client 单独产出）──
"$TSC" -p tsconfig.json

# ── 6) client：esbuild 契约外壳 + 资源（toast.ps1 → lib/，UTF-8 BOM）──
if [ -x "$ROOT/node_modules/.bin/esbuild" ] || [ -f "$ROOT/node_modules/esbuild/bin/esbuild" ]; then
  node scripts/build-client.mjs
else
  echo "build: esbuild missing（请先 pnpm install -D esbuild）" >&2
  exit 1
fi

echo "=== build OK ==="
