/**
 * dsh-notifier — 宿主端辅助函数（自包含，无上游仓库依赖）。
 *
 * - writeJson：统一带 referrer-policy 头（防 referrer 泄露）；
 * - readBody：兼容 Node 事件流（data/end）与 async-iterator 桩（测试用）两种形态，
 *   limit 由调用方显式传入；
 * - isLoopbackRequest：所有 /api 路由（含写路由）的 loopback 围栏（DNS 重绑定 + 跨站防御）。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
/**
 * 写 JSON 响应（统一带 referrer-policy 头，防 referrer 泄露）。
 */
export declare function writeJson(res: ServerResponse, status: number, payload: unknown): void;
/**
 * 把任意抛出的值转成可读错误消息。
 */
export declare function errorMessage(error: unknown): string;
/**
 * 读请求 body（JSON，限长防滥用）。
 * 兼容 Node 事件流（data/end）与 async-iterator 桩（测试用）两种形态。
 * @param limit 字节上限（显式传入，默认 256KB）。
 */
export declare function readBody(req: IncomingMessage, limit?: number): Promise<object>;
/**
 * Loopback 围栏：请求必须来自回环地址 + 回环 Host + 非跨站，否则拒绝。
 * 全部 /api 路由（含写路由）强制调用（DNS 重绑定 + 跨站防御）。
 */
export declare function isLoopbackRequest(request: IncomingMessage): boolean;
