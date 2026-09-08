// cordis Fiber 内部状态数值（与 0.1.1 dsh-settings 的 isUnloading 同款判定）。
const FIBER_DISPOSED = 4;
const FIBER_UNLOADING = 5;
function isUnloading(ctx) {
    const state = ctx.fiber?.state;
    return state === FIBER_DISPOSED || state === FIBER_UNLOADING;
}
/**
 * 安装插件设置分区（兼容 dsh 0.1.1 与 0.1.2）。
 * ns 直接传字符串：旧 settingsNamespace 只是「校验 /^[a-z][a-z0-9-]*$/ 并原样
 * 返回」，两版 register 内部都做同一校验，故无需保留该包装。
 * 无 settings service（ctx.inject 不存在）时为 no-op——测试/无 settings 的
 * 宿主路径不受影响，保持向后兼容。
 */
export function installSettingsSection(ctx, ns, schema, entry, hooks) {
    const inject = ctx.inject;
    if (typeof inject !== "function")
        return;
    inject(["settings"], (sctx) => {
        const provider = sctx.settings;
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
            if (isUnloading(ctx))
                return;
            hooks.setSource(() => entry);
            hooks.onChange();
        });
        hooks.onChange();
        scope.watch(() => {
            if (isUnloading(ctx))
                return;
            hooks.onChange();
        });
    });
}
//# sourceMappingURL=settings-compat.js.map