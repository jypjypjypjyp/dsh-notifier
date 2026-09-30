// @ts-nocheck
/**
 * dsh-notifier — e2e：客户端契约与两端路由一致性。
 *
 * 覆盖：assertClientSourceContract / assertClientProductContract（共享
 * smoke-lib，与 contract-check 同源）；lib/client.js 中出现的路由字面量
 * 与宿主 ROUTES 常量双向一致。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assert } from "./helpers.ts";
import { assertClientProductContract, assertClientSourceContract } from "./smoke-lib.ts";
import { ROUTES } from "../lib/index.js";

const pkgDir = fileURLToPath(new URL("..", import.meta.url));

{
  const client = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  // 客户端契约（共享 smoke-lib：源形态 + 执行契约，与 contract-check 同源）
  assertClientSourceContract(pkgDir);
  assertClientProductContract(pkgDir);
  const literals = [...client.matchAll(/\/api\/dsh-notifier\/[a-z-]+/g)].map((m) => m[0]);
  const expected = Object.values(ROUTES);
  for (const literal of literals) assert.ok(expected.includes(literal), `client 出现未知路由: ${literal}`);
  for (const route of expected) assert.ok(literals.includes(route), `client 缺少路由: ${route}`);
}

// 设置界面的挂载契约（真实回归：dsh 0.1.7 删掉了 settings.plugin.item 插槽，
// 且把宿主 UI 包的图标改了名——旧卡片既挂不上插槽、取到 undefined 图标还会整卡崩）。
// 新宿主挂插件页的 plugins.bundle.config（key 必须是包名），旧宿主保留原折叠卡。
{
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const client = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.ok(client.includes(JSON.stringify(pkg.name)), "客户端产物含包名字面量（插件页配置区的插槽 key）");
  assert.ok(/PAGE_SLOT\s*=\s*"plugins\.bundle\.config"/.test(client), "注册插件页配置区插槽 plugins.bundle.config");
  assert.ok(
    /register\(\{\s*name:\s*PAGE_SLOT,\s*key:\s*PKG_NAME\s*\}/.test(client),
    "plugins.bundle.config 的注册 key 必须是包名（ui-plugin-manager 按 <包名>#<行 id> 与包名分发）",
  );
  assert.ok(/LEGACY_SLOT\s*=\s*"settings\.plugin\.item"/.test(client), "保留旧宿主设置卡插槽 settings.plugin.item");
  assert.ok(
    /register\(\{\s*name:\s*LEGACY_SLOT,\s*key:\s*"notifier"\s*\}/.test(client),
    "settings.plugin.item 的注册 key 必须是 notifier",
  );
  // 不依赖宿主 UI 包：其组件/图标名跨 dsh 版本有增删，取到的是静默 undefined，
  // React 渲染时整卡消失（0.1.7 上逐个数出来的教训）。
  assert.ok(!/dsh-client-ui-primitives/.test(client), "设置界面不得依赖宿主 UI 包（图标/组件名跨版本漂移会静默崩卡）");
}

// lib/toast.ps1 发布物完整性：必须带 UTF-8 BOM 且与源文件逐字节一致。
// pwsh 7 在 CI 上解析通过抓不住 5.1 的 ANSI 码页问题，字节级断言是唯一机器兜底；
// 构建期 copyClientResources 已强制补写，此处防回归（编辑器去 BOM / 复制链变更）。
{
  const stripBom = (buf) => (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.subarray(3) : buf);
  const libBuf = readFileSync(new URL("../lib/toast.ps1", import.meta.url));
  assert.ok(libBuf[0] === 0xef && libBuf[1] === 0xbb && libBuf[2] === 0xbf, "lib/toast.ps1 必须带 UTF-8 BOM（PS 5.1 按 ANSI 解码无 BOM 文件）");
  const srcBuf = readFileSync(new URL("../src/toast.ps1", import.meta.url));
  assert.deepEqual(stripBom(libBuf), stripBom(srcBuf), "lib/toast.ps1 剥离 BOM 后应与 src 源文件逐字节一致");
}
