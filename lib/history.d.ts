/** 通知历史滚动上限（行数；超出后从尾部截断重写）。 */
export declare const HISTORY_LIMIT = 200;
/** 单条历史记录（与通知文案同源，不含工具参数等敏感信息）。 */
export interface HistoryEntry {
    ts: number;
    kind: string;
    title: string;
    message: string;
    suppressed?: string;
}
/** 通知历史存储：append 落盘 / read 供 GET / clear 清空。 */
export interface HistoryStore {
    /** 追加一条记录（内部写队列串行化，防并发「读-改-写」互相覆盖丢记录）。 */
    append(entry: HistoryEntry): void;
    /** 最近记录（尾部最多 HISTORY_LIMIT 条；maxAgeDays>0 时先按天过滤）。 */
    read(): Promise<Array<Record<string, unknown>>>;
    /** 清空全部记录，返回被清空条数。 */
    clear(): Promise<number>;
}
/**
 * 创建通知历史存储。
 * @param options.file 历史 jsonl 路径（apply 按 config.historyFile 覆盖后传入）。
 * @param options.maxAgeDays 按天保留期的实时读取器（PUT /config 后立即生效，
 *   故取 getter 而非快照值）。
 * @param options.warn 日志出口（ctx.logger.warn）。
 */
export declare function createHistoryStore(options: {
    file: string;
    maxAgeDays: () => number;
    warn: (message: string) => void;
}): HistoryStore;
