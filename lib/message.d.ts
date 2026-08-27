/**
 * dsh-notifier — 通知消息构造（纯函数域）。
 *
 * 文案单表（NOTIFY_KINDS）、通知详情形状、耗时格式化、工具名美化、
 * 会话标题/turn 终态读取、错误文本脱敏与系统通知命令构造。
 * 全部无状态：smoke 可直接断言输出形态；安全语义（脱敏有序表）
 * 的顺序硬约束见 SANITIZE_RULES 注释。
 */
import type { Agent } from "@deepseek-ai/dsh-agent";
import type { TurnEndReason } from "@deepseek-ai/dsh-session/types";
/** turn/end reason.kind 的官方联合（TurnEndReasonMap；插件可经 declare module 扩展，
 * 运行时出现未知 kind 由调用方保守静默——见 agent/status 完成判定白名单）。 */
type TurnEndKind = TurnEndReason extends {
    kind: infer K;
} ? K : never;
/** 通知详情（不含工具参数等敏感信息）。 */
export interface NotifyDetail {
    tool?: string;
    taskTitle?: string;
    reason?: string;
    question?: string;
    durationMs?: number;
    turn?: number;
    step?: number;
    message?: string;
    mergedCount?: number;
    /** 审批超时提醒：已等待分钟数（NOTIFY_KINDS.ask 渲染）。 */
    remindMinutes?: number;
    /** 错误合并窗口内被吞掉的错误摘要（最近 2 条）。 */
    mergedErrors?: string[];
    ts?: number;
}
/** 毫秒 → 人类可读耗时（如 "45 秒" / "2 分 15 秒" / "1 小时 2 分 5 秒"）。 */
export declare function formatDuration(ms: number): string;
/**
 * 错误文本脱敏：按 SANITIZE_RULES 有序表掩蔽常见敏感特征（用户路径、私钥、
 * 连接串凭据、各类令牌、密钥赋值、邮箱），再截断。
 * 用于 agent/error 与审批理由/提问文本进入通知与历史前的处理，把「文本可能
 * 内嵌命令回显/路径/凭据片段」的外泄面收敛到可读的摘要。
 * @returns 脱敏并截断（默认 300 字符）后的错误文本。
 */
export declare function sanitizeErrorText(text: unknown, maxLen?: number): string;
/**
 * 构造系统通知命令参数（纯函数，smoke 可直接断言参数形态）。
 * - win32：spawn powershell -File toast.ps1 -Payload <base64>。标题/正文/silent
 *   打包为 base64(UTF-8 JSON) 单 token 传递——PS 5.1 的 -File 模式
 *   对 `-Name=Value` 等号形式不做命名参数绑定，空格形式的裸 dash token 又会被
 *   误认成下一个参数名；base64 字母表 [A-Za-z0-9+/=] 永不出现在 token 首、无空格
 *   无引号，彻底脱离命令行 tokenizer 的歧义面，依旧零 shell 拼接面。
 * - darwin：osascript display notification（转义 \ 与 "，换行替换为空格防
 *   脚本语法；silent=false 时带系统提示音 "Glass"）
 * - 其余：notify-send（notifySendAvailable === false 时返回 null=通道不可用）
 * @returns spawn 参数数组（首元素为可执行文件），或 null（不可用）。
 */
export declare function buildSystemCommand(platform: string, title: string, message: string, options: {
    silent: boolean;
    notifySendAvailable?: boolean;
    toastScript: string;
}): string[] | null;
/**
 * 工具名美化（业界惯例：可读的动作描述优先）：
 * - 常见工具映射表 → 中文名（如 pwsh → "PowerShell 命令"）
 * - `mcp__server__raw` → `MCP 服务器 "server" 的工具 "raw"`
 * - 其余原样
 */
export declare function prettyToolName(name: unknown): string;
/**
 * 提取会话标题（用户可读的任务名，替代内部 session id）。
 * 数据源：agent.session.events 中最后一个 session/title 事件（dsh-session-title
 * 官方插件维护，与 GUI 会话列表同源）。无标题（新会话/未生成）返回 undefined。
 * 标题源自会话内容、可携带敏感片段（凭据/路径/邮箱等），返回前经
 * sanitizeErrorText 脱敏再截断 40 字符（先打码后截断：避免长敏感串被腰斩成
 * 不满足规则阈值的残段漏网）；本函数是全部 taskTitle 的唯一来源，在此单点
 * 接入即覆盖 NOTIFY_KINDS 全部模板拼接与历史落盘。正常标题
 * 不含敏感特征、脱敏后原样透传，可读性不受影响。
 * @param agent Agent 对象（事件 payload.agent）。
 * @returns 脱敏并截断 40 字符的标题。
 */
export declare function sessionTitleOf(agent: Agent | undefined): string | undefined;
/**
 * 取 agent 会话日志中最新一条 turn/end（倒序扫描；session.events 是混合
 * 日志，turn/end 后可能尾随 session/title、inbox、user/message 等，不能
 * 取 events 末尾——照 sessionTitleOf 同款倒序）。
 * 用于中断抑制：running→idle 时若本轮未闭合新的 turn/end（如 abort 早于
 * turn/start 落盘，dsh-agent-loop turn() 首行 throwIfAborted 在 try 外），
 * 读到的 turn/end 是上一次运行的，不可作为本轮结束依据。
 * @param agent Agent 对象（事件 payload.agent）。
 * @returns {turn, kind}（kind 为 turn/end reason.kind，如 completed /
 *   aborted / error / max-tokens）；无 turn/end 或读取失败返回 undefined。
 */
export declare function lastTurnEndOf(agent: Agent | undefined): {
    turn: number;
    kind: TurnEndKind;
} | undefined;
/**
 * 运行时归属查询面：对齐宿主 ctx.agents（AgentRegistry）判定所需
 * 的最小结构子集——get 查活体父 agent 存在性、isOwnedBy 断言「该子 agent 确由
 * 该父 agent 的作用域创建」。仅 import type 官方 Agent，不引入运行时依赖。
 */
export interface SubagentOwnership {
    get(id: string): Agent | undefined;
    isOwnedBy(id: string, owner: Agent): boolean;
}
/**
 * agent 是否为子代理：双信号判定（origin 命中即子代理；未命中才查运行时归属；
 * 两信号皆否一律走主任务分支——恰为两信号，无第三信号）。
 *
 * 三类会话 header 形态差异（DSH SessionHeader，均经官方类型层核验）：
 * - spawn 型子代理：origin === 'subagent'（SessionHeader 校验强制唯一合法值，
 *   packages/core/session/src/index.ts:125：origin 非 undefined 就必须是
 *   'subagent'），通常带 parentSession + delegationDepth=父+1。信号一即命中。
 * - fork 型委派子代理：parentSession + seedLength > 0、**无 origin**、
 *   delegationDepth = 0（Session.fork() session/src/index.ts:1091 与 apiproxy
 *   lineage 场景写 parentSession 但不带 origin）。信号一不命中，须查信号二。
 * - headless CLI 会话：header 仅 { cwd }（无 origin 无 parentSession），两信号
 *   皆否 → 主任务分支；其分类保持现状不在 notifier 变更面内。
 *
 * 为何需要信号二（运行时归属）：fork 型委派与用户 fork 主线在持久化 header 上
 * **不可区分**（两者都只落 parentSession + seedLength、无 origin）——单看 header
 * 要么漏报 fork 委派（现状 bug：委派 worker 完成被误报主任务 kind=done），要么
 * 把用户 fork 主线误静默。唯一可靠区分点是**运行时归属**：
 * ctx.agents.get(parentSession) 非 undefined 且 isOwnedBy(该 agent id, 父 agent)
 * === true 时，该 fork 会话确由父 agent 作用域创建（委派 worker）；归属不成立
 * （父 id 不在 live registry / isOwnedBy false / agents 服务不可用）则视为用户
 * fork 主线，保守走主任务分支——宁可多报一条 done，不静默用户自己的任务。
 *
 * 已知保守边界（冷 resume）：实例重启后脱离父作用域续跑的 fork worker 不在
 * live registry，归属不成立 → 退报 done。与宿主 apiproxy 冷路径 fence 行为一致
 * （attached/inspect 检查点 agent 参数为 void 0 时仅 origin 生效），属已确认的
 * 接受边界（源码级确认），不做持久化推断补齐。
 *
 * 运行时同型变体（P2-1）：父 agent 先亡/被清理（如委派方提前结束、
 * registry 逐出）时 `get(parent)` 同样返回 undefined，归属不成立 → 同样退报
 * done。与冷 resume 共享同一保守语义的方向性代价：宁可多报一条主任务 kind=done，
 * 不静默任何真实完成；两变体均不做持久化推断补齐。
 *
 * @param agent Agent 对象（事件 payload.agent）。
 * @param ownership 运行时归属查询面（ctx.agents）。缺省（undefined，如测试
 *   fake ctx 未装配 agents 服务）时跳过信号二：仅 origin 判定，行为与本修复
 *   前一致。
 */
export declare function isSubagentOf(agent: Agent | undefined, ownership?: SubagentOwnership): boolean;
/**
 * 通知文案单表（kind → {title, message}），收敛 TITLES 与 switch 双映射。
 * 设计遵循业界通知惯例：标题即结论、正文结论先行、用用户可读的任务名与
 * 动作描述（不暴露内部 session id）、末尾给行动建议；时间由系统通知呈现，
 * 正文不重复时间戳。
 */
export declare const NOTIFY_KINDS: Record<string, {
    title: string;
    message: (detail: NotifyDetail) => string;
}>;
export {};
