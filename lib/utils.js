/**
 * 写 JSON 响应（统一带 referrer-policy 头，防 referrer 泄露）。
 */
export function writeJson(res, status, payload) {
    res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "referrer-policy": "no-referrer",
    });
    res.end(JSON.stringify(payload));
}
/**
 * 把任意抛出的值转成可读错误消息。
 */
export function errorMessage(error) {
    try {
        if (error instanceof Error)
            return error.message;
        return String(error);
    }
    catch {
        return "[unrenderable thrown value]";
    }
}
/**
 * 读请求 body（JSON，限长防滥用）。
 * 兼容 Node 事件流（data/end）与 async-iterator 桩（测试用）两种形态。
 * @param limit 字节上限（显式传入，默认 256KB）。
 */
export function readBody(req, limit = 256 * 1024) {
    // async-iterator 形态（部分测试桩）：逐块读取，限长检查。
    if (typeof req[Symbol.asyncIterator] === "function" && typeof req.on !== "function") {
        return (async () => {
            const chunks = [];
            let size = 0;
            for await (const chunk of req) {
                size += chunk.length;
                if (size > limit)
                    throw new Error("body too large");
                chunks.push(chunk);
            }
            return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8"));
        })();
    }
    // Node 事件流形态。
    return new Promise((resolvePromise, reject) => {
        const chunks = [];
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
                resolvePromise(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8")));
            }
            catch (error) {
                const e = error;
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
export function isLoopbackRequest(request) {
    const address = request.socket?.remoteAddress;
    if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1")
        return false;
    const host = request.headers.host;
    if (typeof host !== "string")
        return false;
    let hostUrl;
    try {
        hostUrl = new URL(`http://${host}`);
    }
    catch {
        return false;
    }
    if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]")
        return false;
    if (request.headers["sec-fetch-site"] === "cross-site")
        return false;
    const origin = request.headers.origin;
    if (origin === undefined)
        return true;
    try {
        return new URL(origin).host === hostUrl.host;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=utils.js.map