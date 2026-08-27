// @ts-nocheck
'use strict'

/**
 * build-client — 客户端契约外壳生成（本地化，自包含）。
 *
 * 架构：源码（src/client/index.ts）写「干净模块」（导出 apply/inject，不含任何
 * loader 痕迹），契约外壳（IIFE + window.__ModuleLoader__.load 注册 + exports 装配）
 * 由本脚本经 esbuild 生成——IIFE/load/Symbol.toStringTag 模板只存在于本文件一处。
 *
 * 与 dsh 浏览器端契约一致（非自拟）：boot manifest 的 row.id = 完整 npm 包名；
 * arrive(row) 拉取 /plugins/<包名>/client.js 后校验 factories.has(包名)。
 * 生产产物 load id 必须是「字符串字面量」且 === package.json name（内建契约校验）。
 *
 * 用法：node scripts/build-client.mjs
 */
import { build } from 'esbuild'
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgJson = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'))
const pkgName = pkgJson.name

const src = join(PKG_DIR, 'src', 'client', 'index.ts')
const outfile = join(PKG_DIR, 'lib', 'client.js')

/** 契约外壳模板：零依赖干净模块 → 浏览器端 IIFE 产物（纯 JS，构建期生成不经 tsc）。 */
function renderWrapper(entryRel) {
  return `// 契约外壳（scripts/build-client.mjs 生成），浏览器端全局由 dsh web 运行时提供。
import * as impl from ${JSON.stringify('./' + entryRel)}
window.__ModuleLoader__.load({
  id: __DSH_PLUGIN_ID__,
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    exports.apply = impl.apply
    exports.inject = impl.inject
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    return module.exports
  },
})
`
}

/** 提取源码顶层 bare import（非相对/绝对 → 宿主注入 external；scoped 包取前两段）。 */
function bareImports(ts) {
  const out = new Set()
  for (const mm of ts.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
    const spec = mm[1]
    if (spec.startsWith('.') || spec.startsWith('/')) continue
    out.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])
  }
  return [...out]
}

/** 契约外壳模板（externals 路径）：干净模块（cjs，React 等 external 经 factory require 注入）
 *  内联进 factory 函数体——factory 参数名 `require` 遮蔽外部，external 的 `require("react")`
 *  即解析到注入值。 */
function renderFactoryContract(packageName, cleanCjs) {
  const indented = cleanCjs.split('\n').map((l) => (l.length ? '    ' + l : '')).join('\n')
  return `"use strict";
// 契约外壳（scripts/build-client.mjs 生成）：external 依赖（React 等）经 factory 注入的 require 解析
window.__ModuleLoader__.load({
  id: ${JSON.stringify(packageName)},
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
${indented}
    Object.defineProperty(module.exports, Symbol.toStringTag, { value: 'Module' })
    return module.exports
  }
})
`
}

/**
 * 构建客户端产物（lib/client.js）。零依赖干净模块走 wrapper 路径；
 * 含 bare import（如 React——宿主注入 external）走 externals/factory 路径。
 */
async function buildClient() {
  const sourceText = readFileSync(src, 'utf8')
  // 形态检测：干净模块（无 loader 痕迹）→ wrapper；否则 legacy。
  const codeOnly = sourceText.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  const mode = /__ModuleLoader__\.load/.test(codeOnly) ? 'legacy' : 'wrapper'

  const define = { __DSH_PLUGIN_ID__: JSON.stringify(pkgName) }
  const base = {
    bundle: true,
    target: 'es2020',
    charset: 'utf8',
    banner: { js: '"use strict";' },
    define,
    write: false,
    logLevel: 'warning',
    // .css → import 得到字符串字面量：客户端 CSS 放独立 .css 文件，
    // 构建期 text-loader 原样内联进 client.js（产物自包含单文件、零运行时依赖、无独立请求）。
    loader: { '.css': 'text' },
  }

  let code
  if (mode === 'legacy') {
    const r = await build({ ...base, format: 'iife', entryPoints: [src] })
    code = r.outputFiles[0].text
  } else if (mode === 'wrapper' && bareImports(sourceText).length > 0) {
    // externals 路径：bare import（React 等）→ 宿主注入 external，经 factory require 解析。
    const externals = bareImports(sourceText)
    const r = await build({ ...base, format: 'cjs', platform: 'browser', external: externals, entryPoints: [src] })
    code = renderFactoryContract(pkgName, r.outputFiles[0].text)
    console.log(`[build-client] externals 路径（external: ${externals.join(', ')}）`)
  } else {
    // 零依赖干净模块：iife + stdin wrapper
    const r = await build({
      ...base,
      format: 'iife',
      stdin: { contents: renderWrapper(basename(src)), resolveDir: dirname(src), sourcefile: 'client-wrapper.ts' },
    })
    code = r.outputFiles[0].text
  }

  // 内建契约校验（硬依赖）：产物 load id 必须是字符串字面量且 === 包名。
  // exports.apply/inject 装配必须存在——define 被遮蔽/占位符拼错时构建即失败。
  const m = code.match(/__ModuleLoader__\.load\(\s*\{\s*id:\s*"([^"]+)"/)
  if (!m || m[1] !== pkgName) {
    throw new Error(`客户端契约校验失败：load id 必须等于包名 ${pkgName}（实际: ${m ? m[1] : '缺失'}）`)
  }
  const exportsOk = /exports\.apply\s*=/.test(code) || /apply:/.test(code)
  if (!exportsOk) {
    throw new Error(`客户端契约校验失败：产物缺少 exports.apply/exports.inject 装配`)
  }
  writeFileSync(outfile, code)
  console.log(`[build-client] ${mode} 模式，load id=${pkgName} → lib/client.js`)
}

/** 确保 .ps1 产物带 UTF-8 BOM；已带则原样返回 false，缺失/不完整则补写并返回 true。 */
function ensureUtf8Bom(filePath) {
  const buf = readFileSync(filePath)
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return false
  const text = buf.toString('utf8').replace(/^\uFEFF/, '')
  writeFileSync(filePath, '\uFEFF' + text, 'utf8')
  return true
}

/**
 * 复制 src/ 下非代码资源（toast.ps1 等）→ lib/（运行时从 lib 同目录定位）。
 * .ps1 资源强制 UTF-8 BOM（Windows PowerShell 5.1 对无 BOM 文件按 ANSI 码页解码，
 * 非 ASCII 注释即解析失败）。
 */
function copyClientResources() {
  const srcDir = join(PKG_DIR, 'src')
  const libDir = join(PKG_DIR, 'lib')
  if (!existsSync(srcDir)) return []
  const copied = []
  for (const ent of readdirSync(srcDir, { withFileTypes: true })) {
    const f = ent.name
    if (!ent.isFile()) continue
    // .css 走客户端 text-loader 构建期内联，不再作为独立资源复制
    if (!/\.(ts|tsx|js|mjs|cjs|css)$/.test(f) && !f.startsWith('.') && existsSync(join(srcDir, f))) {
      cpSync(join(srcDir, f), join(libDir, f))
      if (f.endsWith('.ps1')) ensureUtf8Bom(join(libDir, f))
      console.log(`[build-client] 资源 ${f} → lib/`)
      copied.push(f)
    }
  }
  return copied
}

if (!existsSync(src)) {
  console.error(`[build-client] 客户端源码入口缺失: ${src}`)
  process.exit(1)
}
await buildClient()
copyClientResources()
console.log('[build-client] done')
