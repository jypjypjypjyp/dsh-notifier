import type { Context } from "@deepseek-ai/cordis";
import type { NotifierApplyConfig } from "./config.js";
/** 稳定的 cordis 插件名。 */
export declare const name = "notifier";
/** 需要的服务：webServer（路由）。 */
export declare const inject: string[];
export { QUIET_ALLOW_KINDS, isInQuietHours, parseHHMM } from "./quiet-hours.js";
export type { QuietHoursConfig } from "./quiet-hours.js";
export { CONFIG_KEYS, DEFAULT_CONFIG, configFile, historyFile, normalizeConfig, toastScriptPath } from "./config.js";
export type { NotifierApplyConfig, NotifyConfig } from "./config.js";
export { HISTORY_LIMIT } from "./history.js";
export { buildSystemCommand, formatDuration, isSubagentOf, lastTurnEndOf, prettyToolName, sanitizeErrorText, sessionTitleOf, } from "./message.js";
export type { NotifyDetail } from "./message.js";
export { ROUTES } from "./server.js";
export { isLoopbackRequest } from "./utils.js";
export { writeJson, readBody, errorMessage } from "./utils.js";
/**
 * 挂载 dsh-notifier。
 * @param ctx 宿主插件上下文。
 * @param config 配置（enabled / configFile 覆盖 / toastScript 覆盖）。
 */
export declare function apply(ctx: Context, config?: NotifierApplyConfig): Promise<void>;
