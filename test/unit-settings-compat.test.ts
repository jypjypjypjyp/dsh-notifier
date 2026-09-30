// @ts-nocheck
/**
 * dsh-notifier — 单元：设置分区安装兼容层（settings-compat）。
 *
 * 背景（真实回归）：dsh 0.1.7 的 settings 服务换成 SettingsForms，
 * `installSection` 与 `register` 一并消失。旧实现无条件 `provider.register(...)`，
 * 于是新版上抛 TypeError——静默失败（配置面失灵，且设置界面消失）。
 * 本文件按三代表现各自钉住：
 * - 0.1.7+（只有 describe/update/mutate）→ no-op，不抛错、不碰 hooks；
 * - 0.1.2+（有 installSection）→ 转发 provider.installSection(ctx, ns, schema, entry, hooks)；
 * - 0.1.1（有 register）→ 复刻旧接线：setSource(scope.get) + onChange + watch 回流。
 */
import { assert } from "./helpers.ts";
import { installSettingsSection } from "../lib/settings-compat.js";

/** 造一个只有 ctx.inject 的宿主 ctx（inject 同步回调，便于断言）。 */
function makeCtx(injectImpl) {
  return { inject: injectImpl };
}

/** 断言用 schema/entry（本层不解释其内容，只做转发核对）。 */
const schema = { kind: "schema" };
const entry = { notifyAsk: true };

// ── 1. dsh 0.1.7+：设置服务无注册面 → no-op（不抛错）──────────────
{
  const provider = { describe: () => [], update: async () => {}, mutate: async () => {} };
  let injectedNames = null;
  const ctx = makeCtx((names, cb) => {
    injectedNames = names;
    cb({ settings: provider, effect: () => () => {} });
  });
  const calls = [];
  installSettingsSection(ctx, "notifier", schema, entry, {
    setSource: () => calls.push("setSource"),
    onChange: () => calls.push("onChange"),
  });
  assert.deepEqual(injectedNames, ["settings"], "经 ctx.inject(['settings']) 取服务");
  assert.deepEqual(calls, [], "新版无注册面：no-op，不触发 setSource/onChange");
}

// ── 2. dsh 0.1.2+：provider.installSection 转发 ────────────────
{
  const seen = [];
  const provider = {
    installSection(...args) { seen.push(args); },
  };
  const ctx = makeCtx((names, cb) => cb({ settings: provider }));
  const hooks = { setSource: () => {}, onChange: () => {} };
  installSettingsSection(ctx, "notifier", schema, entry, hooks);
  assert.equal(seen.length, 1, "installSection 恰好调用一次");
  assert.equal(seen[0][0], ctx, "第 1 参 = 插件 ctx（owner）");
  assert.equal(seen[0][1], "notifier", "第 2 参 = 命名空间");
  assert.equal(seen[0][2], schema, "第 3 参 = schema");
  assert.equal(seen[0][3], entry, "第 4 参 = 组合层 entry");
  assert.equal(seen[0][4], hooks, "第 5 参 = hooks");
}

// ── 3. dsh 0.1.1：register + setSource/watch 旧接线 ────────────
{
  const effectDisposers = [];
  const watchListeners = [];
  const provider = {
    register(ns, s, options) {
      assert.equal(ns, "notifier", "register 收到命名空间");
      assert.equal(s, schema, "register 收到 schema");
      assert.equal(options.base, entry, "base = 组合层 entry");
      return { get: () => ({ notifyAsk: false }), watch: (fn) => watchListeners.push(fn) };
    },
  };
  const ctx = makeCtx((names, cb) => cb({
    settings: provider,
    effect: (fn) => { const d = fn(); if (typeof d === "function") effectDisposers.push(d); return () => {}; },
  }));
  let source = null;
  let changes = 0;
  installSettingsSection(ctx, "notifier", schema, entry, {
    setSource: (get) => { source = get; },
    onChange: () => { changes += 1; },
  });
  assert.equal(typeof source, "function", "setSource 收到取值 thunk");
  assert.deepEqual(source(), { notifyAsk: false }, "thunk 读到 settings scope 的 live 值");
  assert.equal(changes, 1, "安装时 onChange 一次");
  assert.equal(watchListeners.length, 1, "scope.watch 已订阅");
  watchListeners[0]();
  assert.equal(changes, 2, "watch 回调触发 onChange");
  // 卸载：source 回落 entry
  assert.equal(effectDisposers.length, 1, "注册了卸载效果");
  effectDisposers[0]();
  assert.deepEqual(source(), entry, "卸载后 source 回落组合层 entry");
}

console.log("unit-settings-compat: OK");
