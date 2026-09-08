import type { Context } from "@deepseek-ai/cordis";
/** 与旧 @deepseek-ai/dsh-settings installSettingsSection 的 hooks 形状一致。 */
export interface SettingsSectionHooks {
    setSource: (get: () => any) => void;
    onChange: () => void;
    validate?: (value: any) => any;
}
/**
 * 安装插件设置分区（兼容 dsh 0.1.1 与 0.1.2）。
 * ns 直接传字符串：旧 settingsNamespace 只是「校验 /^[a-z][a-z0-9-]*$/ 并原样
 * 返回」，两版 register 内部都做同一校验，故无需保留该包装。
 * 无 settings service（ctx.inject 不存在）时为 no-op——测试/无 settings 的
 * 宿主路径不受影响，保持向后兼容。
 */
export declare function installSettingsSection(ctx: Context, ns: string, schema: any, entry: unknown, hooks: SettingsSectionHooks): void;
