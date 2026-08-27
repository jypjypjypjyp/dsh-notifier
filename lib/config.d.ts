import type { QuietHoursConfig } from "./quiet-hours.js";
/** 通知配置（内存单一事实源，与落盘 JSON 同构）。 */
export interface NotifyConfig {
    notifyAsk: boolean;
    notifyQuestion: boolean;
    notifyTaskDone: boolean;
    /** 子代理完成通知（独立于主任务完成，默认关）。 */
    notifySubagentDone: boolean;
    notifyTaskError: boolean;
    notifyTurnEnd: boolean;
    systemNotify: boolean;
    browserNotify: boolean;
    notifyWhenVisible: boolean;
    /** 系统通知是否带提示音（false = silent，静默弹出）。 */
    notifySound: boolean;
    quietHours: QuietHoursConfig;
    errorMergeWindowMs: number;
    /** 审批等待超时二次提醒（分钟；0 = 关闭）。 */
    askRemindMin: number;
    /** 完成风暴聚合窗口（毫秒；0 = 关闭聚合，每条完成即时通知）。 */
    doneMergeWindowMs: number;
    /** 通知历史按天自动清理（0 = 不按时间清理，仅行数上限滚动）。 */
    historyMaxAgeDays: number;
}
/** 布尔配置键联合（normalizeConfig 白名单与客户端渲染依赖它）。 */
type BooleanKeys = {
    [K in keyof NotifyConfig]: NotifyConfig[K] extends boolean ? K : never;
}[keyof NotifyConfig];
/** apply 接收的配置（enabled / 路径覆盖）。 */
export interface NotifierApplyConfig {
    enabled?: boolean;
    configFile?: string;
    toastScript?: string;
    historyFile?: string;
}
/** 默认配置。 */
export declare const DEFAULT_CONFIG: NotifyConfig;
/** 布尔配置键（单一事实源：normalizeConfig 白名单与客户端渲染依赖它）。 */
export declare const CONFIG_KEYS: readonly BooleanKeys[];
/** 配置存储路径。 */
export declare function configFile(): string;
/** 通知历史文件路径（jsonl 追加；与配置同目录）。 */
export declare function historyFile(): string;
/** toast 脚本路径（本插件 lib 下）。 */
export declare function toastScriptPath(): string;
/** 合并配置（未知键丢弃，默认值兜底；深拷贝防默认值被污染）。 */
export declare function normalizeConfig(input: unknown): NotifyConfig;
export {};
