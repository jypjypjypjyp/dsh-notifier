/**
 * dsh-notifier — 通知历史存储（jsonl）。
 *
 * 滚动上限（HISTORY_LIMIT）、按天自动清理、tmp+rename 原子写与写队列
 * 串行化都在此一处收敛；append 为 fire-and-forget（不阻塞通知主流程，
 * 失败仅记 warn），read/clear 服务 /history 路由。
 */
import { readFile, writeFile, rename } from "node:fs/promises";
import { errorMessage } from "./utils.js";
/** 通知历史滚动上限（行数；超出后从尾部截断重写）。 */
export const HISTORY_LIMIT = 200;
/**
 * 创建通知历史存储。
 * @param options.file 历史 jsonl 路径（apply 按 config.historyFile 覆盖后传入）。
 * @param options.maxAgeDays 按天保留期的实时读取器（PUT /config 后立即生效，
 *   故取 getter 而非快照值）。
 * @param options.warn 日志出口（ctx.logger.warn）。
 */
export function createHistoryStore(options) {
    const { file, maxAgeDays, warn } = options;
    /**
     * 通知历史落盘（jsonl 追加，滚动上限 HISTORY_LIMIT，tmp+rename 原子写）。
     * fire-and-forget：不阻塞通知主流程；失败仅记 warn。
     * 写队列串行化：多个事件并发触发时防止「读-改-写」竞态互相覆盖丢记录。
     */
    let writeChain = Promise.resolve();
    function append(entry) {
        writeChain = writeChain.then(async () => {
            try {
                let lines = [];
                try {
                    const text = await readFile(file, "utf8");
                    lines = text.split("\n").filter(Boolean);
                }
                catch {
                    // 文件不存在：从空列表开始
                }
                lines.push(JSON.stringify(entry));
                // 按天自动清理（historyMaxAgeDays>0）：写入时剔除超过保留期的旧记录
                const keepDays = maxAgeDays();
                if (keepDays > 0) {
                    const cutoff = entry.ts - keepDays * 86400000;
                    lines = lines.filter((line) => {
                        try {
                            const obj = JSON.parse(line);
                            return typeof obj.ts === "number" && obj.ts >= cutoff;
                        }
                        catch {
                            return true; // 坏行保守保留
                        }
                    });
                }
                if (lines.length > HISTORY_LIMIT * 2)
                    lines = lines.slice(-HISTORY_LIMIT);
                const tmp = `${file}.${process.pid}.${Date.now().toString(36)}.tmp`;
                await writeFile(tmp, lines.join("\n") + "\n", "utf8");
                await rename(tmp, file);
            }
            catch (error) {
                warn(`dsh-notifier: 历史记录写入失败: ${errorMessage(error)}`);
            }
        });
    }
    async function read() {
        const records = [];
        try {
            const text = await readFile(file, "utf8");
            const all = text.split("\n").filter(Boolean).slice(-HISTORY_LIMIT * 2);
            const keepDays = maxAgeDays();
            const cutoff = keepDays > 0 ? Date.now() - keepDays * 86400000 : 0;
            for (const line of all) {
                try {
                    const obj = JSON.parse(line);
                    if (cutoff > 0 && typeof obj.ts === "number" && obj.ts < cutoff)
                        continue; // 超期过滤
                    records.push(obj);
                }
                catch {
                    // 损坏行跳过
                }
            }
            // 保守：只返回最近 HISTORY_LIMIT 条（写时已按行数与按天截断，此处兜底）
            records.splice(0, Math.max(0, records.length - HISTORY_LIMIT));
        }
        catch {
            // 无历史文件：返回空列表
        }
        return records;
    }
    async function clear() {
        // 清空通知历史（写空文件原子化；返回被清空条数）
        let removed = 0;
        try {
            const text = await readFile(file, "utf8");
            removed = text.split("\n").filter(Boolean).length;
        }
        catch {
            removed = 0;
        }
        try {
            const tmp = `${file}.${process.pid}.${Date.now().toString(36)}.clear.tmp`;
            await writeFile(tmp, "", "utf8");
            await rename(tmp, file);
        }
        catch (error) {
            warn(`dsh-notifier: 清空历史失败: ${errorMessage(error)}`);
        }
        return removed;
    }
    return { append, read, clear };
}
//# sourceMappingURL=history.js.map