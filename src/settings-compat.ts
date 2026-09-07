// settings-compat — 跨 dsh 0.1.1 / 0.1.2 的「插件设置分区」安装兼容层。
//
// 背景：dsh 0.1.2-rc.1 把 @deepseek-ai/dsh-settings 的模块级 helper
// `installSettingsSection` / `settingsNamespace` 移除了（静态 named import 会
// SyntaxError，插件加载即炸），等价逻辑并入 provider 方法 `installSection`；
// 而 provider 的 `register(ns, schema, { base, validate })` → `{ get, watch }`
// 契约两版一致。因此本文件禁止对 @deepseek-ai/dsh-settings 做任何静态
// named import（0.1.2 下加载即炸），统一经 ctx.inject(['settings']) 取
// provider 做特性检测。
//
// - dsh 0.1.2+：provider.installSection(owner, ns, schema, entry, hooks)
// - dsh 0.1.1  ：复刻旧 installSettingsSection 的接线（register + setSource/watch）
import type { Context } from "@deepseek-ai/cordis";

/** 与旧 @deepseek-ai/dsh-settings installSettingsSection 的 hooks 形状一致。 */
export interface SettingsSectionHooks {
  setSource: (get: () => any) => void;
  onChange: () => void;
  validate?: (value: any) => any;
}

// cordis Fiber 内部状态数值（与 0.1.1 dsh-settings 的 isUnloading 同款判定）。
const FIBER_DISPOSED = 4;
const FIBER_UNLOADING = 5;

function isUnloading(ctx: Context): boolean {
  const state = (ctx as { fiber?: { state?: number } }).fiber?.state;
  return state === FIBER_DISPOSED || state === FIBER_UNLOADING;
}

/**
 * 安装插件设置分区（兼容 dsh 0.1.1 与 0.1.2）。
 * ns 直接传字符串：旧 settingsNamespace 只是「校验 /^[a-z][a-z0-9-]*$/ 并原样
 * 返回」，两版 register 内部都做同一校验，故无需保留该包装。
 * 无 settings service（ctx.inject 不存在）时为 no-op——测试/无 settings 的
 * 宿主路径不受影响，保持向后兼容。
 */
export function installSettingsSection(
  ctx: Context,
  ns: string,
  schema: any,
  entry: unknown,
  hooks: SettingsSectionHooks,
): void {
  const inject = (ctx as {
    inject?: (names: string[], cb: (sctx: any) => void) => void;
  }).inject;
  if (typeof inject !== "function") return;
  inject(["settings"], (sctx: any) => {
    const provider: any = sctx.settings;
    if (typeof provider?.installSection === "function") {
      // dsh 0.1.2+：helper 并入 provider 方法（内部 register+watch 接线等价）。
      provider.installSection(ctx, ns, schema, entry, hooks);
      return;
    }
    // dsh 0.1.1：复刻旧 installSettingsSection 接线。
    const scope = provider.register(ns, schema, {
      base: entry,
      ...(hooks.validate === undefined ? {} : { validate: hooks.validate }),
    });
    hooks.setSource(() => scope.get());
    sctx.effect(() => () => {
      if (isUnloading(ctx)) return;
      hooks.setSource(() => entry);
      hooks.onChange();
    });
    hooks.onChange();
    scope.watch(() => {
      if (isUnloading(ctx)) return;
      hooks.onChange();
    });
  });
}
