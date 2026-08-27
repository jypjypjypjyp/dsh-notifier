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
export function writeJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
  });
  res.end(JSON.stringify(payload));
}

/**
 * 把任意抛出的值转成可读错误消息。
 */
export function errorMessage(error: unknown): string {
  try {
    if (error instanceof Error) return error.message;
    return String(error);
  } catch {
    return "[unrenderable thrown value]";
  }
}

/**
 * 读请求 body（JSON，限长防滥用）。
 * 兼容 Node 事件流（data/end）与 async-iterator 桩（测试用）两种形态。
 * @param limit 字节上限（显式传入，默认 256KB）。
 */
export function readBody(req: IncomingMessage, limit = 256 * 1024): Promise<object> {
  // async-iterator 形态（部分测试桩）：逐块读取，限长检查。
  if (typeof (req as unknown as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function" && typeof req.on !== "function") {
    return (async () => {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) throw new Error("body too large");
        chunks.push(chunk as Buffer);
      }
      return chunks.length === 0 ? {} : (JSON.parse(Buffer.concat(chunks).toString("utf8")) as object);
    })();
  }
  // Node 事件流形态。
  return new Promise<object>((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolvePromise(chunks.length === 0 ? {} : (JSON.parse(Buffer.concat(chunks).toString("utf8")) as object));
      } catch (error) {
        const e = error as Error;
        reject(new Error(`invalid JSON body: ${e.message}`));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Loopback 围栏：请求必须来自回环地址 + 回环 Host + 非跨站，否则拒绝。
 * 全部 /api 路由（含写路由）强制调用（DNS 重绑定 + 跨站防御）。
 */
export function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket?.remoteAddress;
  if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
  const host = request.headers.host;
  if (typeof host !== "string") return false;
  let hostUrl: URL;
  try {
    hostUrl = new URL(`http://${host}`);
  } catch {
    return false;
  }
  if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}
