import api from "./axios";

export interface Log {
    id: number;
    timestamp: string;
    event: string;
}

export interface LogCursorMeta {
    limit: number;
    has_next: boolean;
    next_cursor?: number;
}

export interface LogCursorPage {
    meta: LogCursorMeta;
    items: Log[];
}

export interface LogStats {
    total: number;
    success: number;
    error: number;
    warning: number;
    info: number;
}

export const getLogs = async (
    limit: number = 50,
    afterId?: number,
    opts?: { q?: string; level?: string }
): Promise<LogCursorPage> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (afterId) params.append("after_id", String(afterId));
    if (opts?.q) params.append("q", opts.q);
    if (opts?.level && opts.level !== "all") params.append("level", opts.level);
    const res = await api.get<LogCursorPage>(`/logs/?${params.toString()}`);
    return res.data;
};

export const deleteLog = async (logId: number): Promise<void> => {
    await api.delete(`/logs/${logId}`);
};

export const clearLogs = async (): Promise<void> => {
    await api.delete("/logs/clear");
};

export const getLogStats = async (): Promise<LogStats> => {
    const res = await api.get<LogStats>("/logs/stats");
    return res.data;
};
