/**
 * dsh-notifier — 免打扰时段判定。
 *
 * 纯函数模块（零依赖）：配置形状、紧急例外白名单、"HH:MM" 解析与
 * 免打扰命中判定。config.ts 的 normalizeConfig 依赖 parseHHMM 做
 * 时/分范围校验，故本模块必须保持无内部依赖（避免环形引用）。
 */
/** 免打扰时段配置。 */
export interface QuietHoursConfig {
    enabled: boolean;
    start: string;
    end: string;
    /** 免打扰期间仍放行的通知 kind（紧急例外，如审批/提问——卡着的任务需要叫醒）。 */
    allowKinds?: string[];
}
/** 免打扰紧急例外可选 kind（面板展示与此白名单一致）。 */
export declare const QUIET_ALLOW_KINDS: readonly ["ask", "question", "error"];
/** "HH:MM" → 分钟数（校验 0-23 时 / 0-59 分）。 */
export declare function parseHHMM(text: string): number;
/** 是否处于免打扰时段（支持跨午夜：start > end）。 */
export declare function isInQuietHours(now: Date, quietHours: QuietHoursConfig | undefined): boolean;
