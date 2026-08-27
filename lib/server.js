/**
 * dsh-notifier — 服务器侧逻辑：SSE 推送、系统通知通道、HTTP 路由。
 *
 * 全部可变状态经工厂函数收口（createSseHub / createSystemNotifier），
 * 路由经 buildRoutes(deps) 纯组装——deps 由 index.ts 装配层注入，
 * 本模块自身不持有跨请求状态以外的生命周期职责。
 */
import { spawn, execFile } from "node:child_process";
import { isLoopbackRequest, writeJson, readBody, errorMessage } from "./utils.js";
import { buildSystemCommand } from "./message.js";
/** 与客户端共享的路由常量（smoke 断言两端一致）。 */
export const ROUTES = {
    config: "/api/dsh-notifier/config",
    events: "/api/dsh-notifier/events",
    health: "/api/dsh-notifier/health",
    test: "/api/dsh-notifier/test",
    history: "/api/dsh-notifier/history",
};
/** SSE 帧。 */
function sseData(payload) {
    return `data: ${JSON.stringify(payload)}\n\n`;
}
/** 创建 SSE 枢纽并启动心跳。 */
export function createSseHub() {
    const connections = new Set();
    /** SSE 已派发帧的滚动缓冲（断线回补用；上限 RECENT_LIMIT，独立于 /history 的
     *  200 条截断，避免补拉时尾部事件被截掉）。 */
    const RECENT_LIMIT = 600;
    let notifySeq = 0;
    const recentFrames = [];
    function broadcast(payload) {
        const frame = Object.assign({}, payload, { seq: ++notifySeq });
        recentFrames.push(frame);
        if (recentFrames.length > RECENT_LIMIT)
            recentFrames.shift();
        const text = sseData(frame);
        for (const res of connections) {
            try {
                res.write(text);
            }
            catch {
                // 连接已断，等待 close 清理
            }
        }
    }
    function framesSince(since) {
        return recentFrames.filter((frame) => frame.seq > since);
    }
    /**
     * SSE 心跳：每 30s 发一条 data 型 ping 帧。必须用 data 而非注释帧——注释帧
     * 既不触发客户端 onmessage 也不触发 onerror，半开连接（断网/合盖/NAT 静默
     * 掐断）时客户端零事件，无法自愈；data 帧让客户端的 watchdog 能检测失活。
     */
    const HEARTBEAT_MS = 30000;
    const heartbeatTimer = setInterval(() => {
        const frame = sseData({ type: "ping" });
        for (const res of connections) {
            try {
                res.write(frame);
            }
            catch {
                // 等待 close 清理
            }
        }
    }, HEARTBEAT_MS);
    // unref：心跳不阻止进程退出（服务端有主循环；测试/无连接时不会被句柄吊死）
    heartbeatTimer.unref();
    return {
        connections,
        broadcast,
        framesSince,
        size: () => connections.size,
        dispose: () => clearInterval(heartbeatTimer),
    };
}
/**
 * 创建系统通知通道。
 * @param options.getSoundEnabled 提示音开关的实时读取器（PUT /config 后立即生效）。
 * @param options.toastScript toast.ps1 路径。
 * @param options.warn 日志出口（ctx.logger.warn）。
 */
export function createSystemNotifier(options) {
    const { getSoundEnabled, toastScript, warn } = options;
    /** 系统通知节流间隔：防连发（生产密集事件/连点测试按钮）造成 spawn 风暴。 */
    const SYSTEM_NOTIFY_THROTTLE_MS = 1000;
    let lastSystemNotifyAt = 0;
    /** notify-send 可用性探测（仅 Linux 需要；macOS 走 osascript，darwin 分支
     *  不依赖此探测，故不在 macOS 上无谓尝试缺失的 notify-send）。异步，只探一次。 */
    let notifySendAvailable = undefined;
    if (process.platform === "linux") {
        execFile("notify-send", ["--version"], { timeout: 3000 }, (error) => {
            notifySendAvailable = error === null;
        });
    }
    return {
        /**
         * 系统原生 toast（fire-and-forget + 30s 超时杀进程；全部失败静默）。
         * 命令构造走 message.ts 纯函数 buildSystemCommand（smoke 断言参数形态）：
         * Windows：PowerShell WinRT toast；macOS：osascript display notification；
         * 其他：notify-send（可用才调用）。
         */
        notify(title, message) {
            // 1s 节流：桌面通知连发只保留第一个，避免子进程风暴
            const now = Date.now();
            if (now - lastSystemNotifyAt < SYSTEM_NOTIFY_THROTTLE_MS)
                return;
            lastSystemNotifyAt = now;
            // 截断按码点而非 UTF-16 code unit：防 emoji 等代理对在边界被腰斩成
            // 孤立代理（经 JSON/base64 后变成 U+FFFD 替换符显示）。
            const truncateCodePoints = (s, max) => {
                const chars = Array.from(s);
                return chars.length > max ? chars.slice(0, max).join("") : s;
            };
            const safeTitle = truncateCodePoints(String(title), 64);
            const safeMessage = truncateCodePoints(String(message), 256);
            let child;
            let bin = "";
            try {
                const argv = buildSystemCommand(process.platform, safeTitle, safeMessage, {
                    silent: getSoundEnabled() === false,
                    notifySendAvailable,
                    toastScript,
                });
                if (argv === null)
                    return; // 通道不可用（如 Linux 探测到 notify-send 缺失）：静默跳过
                bin = argv[0];
                // 关键：原生二进制缺失/不可执行（ENOENT 等）必须被下方 error 事件接住，
                // 绝不能冒泡成 unhandled 'error' 把宿主进程打挂——历史版本在 macOS 上因
                // 直接 spawn powershell 失败且未挂 error 监听而崩溃。
                child = spawn(bin, argv.slice(1), process.platform === "win32" ? { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] } : { stdio: "ignore" });
            }
            catch (error) {
                warn(`dsh-notifier: 系统通知启动失败: ${errorMessage(error)}`);
                return;
            }
            if (!child)
                return; // 极端情况下 spawn 返回空（理论上不会），直接放弃，不碰 child
            // Windows 分支限长收集 stderr：PS 的诊断（param 绑定失败、WinRT 异常等）
            // 原先随 stdio ignore 全部丢弃，排查只能盲猜；只留尾部片段进日志。
            let stderrTail = "";
            if (process.platform === "win32" && child.stderr) {
                child.stderr.on("data", (chunk) => {
                    if (stderrTail.length < 512)
                        stderrTail += chunk.toString("utf8");
                });
            }
            const killer = setTimeout(() => {
                try {
                    child.kill();
                }
                catch {
                    // 忽略
                }
            }, 30000);
            // 任何退出码都先清杀手定时器；非 0 且非被信号杀死（null）才记日志，
            // 避免把「我们主动 30s 超时杀掉子进程」也当成异常刷屏。
            child.on("exit", (code) => {
                clearTimeout(killer);
                if (code !== 0 && code !== null) {
                    const tail = stderrTail.trim();
                    warn(`dsh-notifier: 系统通知退出码异常（exit ${code}）${tail ? `：${tail.slice(-300)}` : ""}`);
                }
            });
            // 通道失败（二进制不在 PATH / 无桌面会话等）：非 Windows 记一次后置为不可用，
            // 后续通知走 null 分支静默跳过；Windows 不置位（powershell 偶发失败不代表
            // WinRT toast 通道整体失效）。无论如何只记日志、不抛、不崩。
            child.on("error", (error) => {
                clearTimeout(killer);
                if (process.platform !== "win32")
                    notifySendAvailable = false;
                warn(`dsh-notifier: 系统通知不可用（${bin}）: ${errorMessage(error)}`);
            });
        },
    };
}
/**
 * 构造五条路由（loopback 围栏 + 方法白名单是每条路由的必项）。
 * @returns WebRoute 数组（调用方逐条 register，收集 disposer）。
 */
export function buildRoutes(deps) {
    const { getConfig, putConfig, logger, sse, system, history } = deps;
    const configRoute = {
        kind: "exact",
        path: ROUTES.config,
        handler: async (req, res) => {
            if (!isLoopbackRequest(req))
                return writeJson(res, 403, { error: "forbidden: loopback-only" });
            if (req.method === "GET") {
                writeJson(res, 200, getConfig());
                return;
            }
            if (req.method === "PUT") {
                let body;
                try {
                    body = await readBody(req, 16 * 1024);
                }
                catch (error) {
                    const message = errorMessage(error);
                    if (message.includes("invalid JSON body")) {
                        // 非法 JSON：连接尚存，返回可读 400，避免请求「无响应挂起」
                        writeJson(res, 400, { error: `invalid JSON body: ${message}` });
                        return;
                    }
                    // 超限路径：readBody 已 reject 并 destroy 连接（防超大 body 占内存），
                    // socket 已断开无法再写响应——记录日志即可（utils.js 语义）
                    logger.warn(`dsh-notifier: 配置请求体读取失败: ${message}`);
                    return;
                }
                const updated = await putConfig(body);
                writeJson(res, 200, updated);
                return;
            }
            writeJson(res, 405, { error: `method not allowed: ${req.method}` });
        },
    };
    const eventsRoute = {
        kind: "exact",
        path: ROUTES.events,
        handler: (req, res) => {
            if (!isLoopbackRequest(req)) {
                writeJson(res, 403, { error: "forbidden: loopback-only" });
                return;
            }
            if (req.method !== "GET") {
                writeJson(res, 405, { error: `method not allowed: ${req.method}` });
                return;
            }
            // ?since=<seq>：断线补拉——先回放滚动缓冲中 seq 更大的帧，再进入实时；
            // 补拉独立于 /history（200 条截断），不丢尾部事件。
            let since = 0;
            try {
                const raw = new URL(req.url ?? "/", "http://127.0.0.1").searchParams.get("since");
                const parsed = raw === null ? 0 : Number(raw);
                since = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
            }
            catch {
                since = 0;
            }
            res.writeHead(200, {
                "content-type": "text/event-stream",
                "cache-control": "no-cache",
                connection: "keep-alive",
            });
            res.write(": connected\n\n");
            if (since > 0) {
                for (const frame of sse.framesSince(since)) {
                    try {
                        res.write(sseData(frame));
                    }
                    catch {
                        break; // 连接已断
                    }
                }
            }
            sse.connections.add(res);
            res.on("close", () => {
                sse.connections.delete(res);
            });
        },
    };
    /** 健康检查：插件是否加载、配置摘要、SSE 连接数。 */
    const healthRoute = {
        kind: "exact",
        path: ROUTES.health,
        handler: (req, res) => {
            if (!isLoopbackRequest(req))
                return writeJson(res, 403, { error: "forbidden: loopback-only" });
            if (req.method !== "GET")
                return writeJson(res, 405, { error: `method not allowed: ${req.method}` });
            const current = getConfig();
            writeJson(res, 200, {
                ok: true,
                plugin: "dsh-notifier",
                config: {
                    notifyAsk: current.notifyAsk,
                    notifyQuestion: current.notifyQuestion,
                    notifyTaskDone: current.notifyTaskDone,
                    notifySubagentDone: current.notifySubagentDone,
                    notifyTaskError: current.notifyTaskError,
                    systemNotify: current.systemNotify,
                    browserNotify: current.browserNotify,
                    notifyWhenVisible: current.notifyWhenVisible,
                    notifySound: current.notifySound,
                    quietHours: current.quietHours,
                },
                sseConnections: sse.size(),
            });
        },
    };
    /**
     * 测试通知：POST 触发一条测试通知（绕过免打扰，测试意图是验证通道本身）。
     * 系统通知 + SSE 广播同时走一遍；浏览器端按 notifyWhenVisible/可见性策略
     * 决定是否弹条（客户端对 kind=test 无特殊分支）。
     */
    const testRoute = {
        kind: "exact",
        path: ROUTES.test,
        handler: (req, res) => {
            if (!isLoopbackRequest(req))
                return writeJson(res, 403, { error: "forbidden: loopback-only" });
            if (req.method !== "POST")
                return writeJson(res, 405, { error: `method not allowed: ${req.method}` });
            const title = "DSH：测试通知";
            const message = "通知链路工作正常（此通知来自测试按钮）";
            const payload = { type: "notify", kind: "test", title, message, ts: Date.now() };
            if (getConfig().systemNotify)
                system.notify(title, message);
            if (getConfig().browserNotify)
                sse.broadcast(payload);
            logger.info("dsh-notifier: test 测试通知已发送");
            history.append({ ts: payload.ts, kind: "test", title, message });
            writeJson(res, 200, { ok: true, sseConnections: sse.size() });
        },
    };
    /** 通知历史：GET 返回最近记录（jsonl 尾部最多 HISTORY_LIMIT 条）。 */
    const historyRoute = {
        kind: "exact",
        path: ROUTES.history,
        handler: async (req, res) => {
            if (!isLoopbackRequest(req))
                return writeJson(res, 403, { error: "forbidden: loopback-only" });
            if (req.method === "GET") {
                const records = await history.read();
                writeJson(res, 200, { ok: true, records });
                return;
            }
            if (req.method === "DELETE") {
                const removed = await history.clear();
                writeJson(res, 200, { ok: true, removed });
                return;
            }
            writeJson(res, 405, { error: `method not allowed: ${req.method}` });
        },
    };
    return [configRoute, eventsRoute, healthRoute, testRoute, historyRoute];
}
//# sourceMappingURL=server.js.map