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
        // dsh 0.1.7+：settings 服务只剩「按 profile 条目 id 读配置文档」的 SettingsForms
        // （describe/update/replace/mutate，见 dsh-settings 的 index.d.ts），register 与
        // installSection 一并移除。此时本插件的配置面=自己的 JSON 文件 + 自建路由，
        // 客户端界面读它（plugins.bundle.config 配置区），故这里是 no-op——照旧调用
        // provider.register 会抛 TypeError（旧契约的静默失败）。
        if (typeof provider?.register !== "function")
            return;
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