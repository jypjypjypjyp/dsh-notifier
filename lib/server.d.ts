import type { ServerResponse } from "node:http";
import type { WebRoute } from "@deepseek-ai/dsh-host-webserver";
import type { NotifyConfig } from "./config.js";
import type { HistoryStore } from "./history.js";
/** 与客户端共享的路由常量（smoke 断言两端一致）。 */
export declare const ROUTES: {
    config: string;
    events: string;
    health: string;
    test: string;
    history: string;
};
/** SSE 推送枢纽：连接表、滚动缓冲广播、心跳。 */
export interface SseHub {
    /** 已连接响应集合（events 路由注册、close 时移除）。 */
    connections: Set<ServerResponse>;
    /** 广播一帧：附加递增 seq、入滚动缓冲、推给所有连接。 */
    broadcast(payload: Record<string, unknown>): void;
    /** 断线补拉：滚动缓冲中 seq 更大的帧（独立于 /history 截断）。 */
    framesSince(since: number): Array<Record<string, unknown> & {
        seq: number;
    }>;
    /** 当前连接数（/health 展示）。 */
    size(): number;
    /** 停止心跳定时器。 */
    dispose(): void;
}
/** 创建 SSE 枢纽并启动心跳。 */
export declare function createSseHub(): SseHub;
/** 系统通知通道：节流 + 子进程生命周期兜底。 */
export interface SystemNotifier {
    /** 发一条系统原生 toast（fire-and-forget；全部失败静默）。 */
    notify(title: string, message: string): void;
}
/**
 * 创建系统通知通道。
 * @param options.getSoundEnabled 提示音开关的实时读取器（PUT /config 后立即生效）。
 * @param options.toastScript toast.ps1 路径。
 * @param options.warn 日志出口（ctx.logger.warn）。
 */
export declare function createSystemNotifier(options: {
    getSoundEnabled: () => boolean;
    toastScript: string;
    warn: (message: string) => void;
}): SystemNotifier;
/** buildRoutes 的依赖注入面（全部由 index.ts 装配层提供）。 */
export interface RouteDeps {
    /** 当前配置读取器（GET / health / test / 免打扰判断共用实时值）。 */
    getConfig: () => NotifyConfig;
    /** PUT /config：归一化并落盘后返回生效配置。 */
    putConfig: (raw: unknown) => Promise<NotifyConfig>;
    /** 日志出口。 */
    logger: {
        warn: (message: string) => void;
        info: (message: string) => void;
    };
    /** SSE 推送枢纽。 */
    sse: SseHub;
    /** 系统通知通道。 */
    system: SystemNotifier;
    /** 通知历史存储。 */
    history: HistoryStore;
}
/**
 * 构造五条路由（loopback 围栏 + 方法白名单是每条路由的必项）。
 * @returns WebRoute 数组（调用方逐条 register，收集 disposer）。
 */
export declare function buildRoutes(deps: RouteDeps): WebRoute[];
