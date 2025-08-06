import api from "./axios";

export interface Log {
    id: number;
    timestamp: string;
    event: string;
}

export const getLogs = async (): Promise<Log[]> => {
    const res = await api.get<Log[]>("/logs/");
    return res.data;
};

export const deleteLog = async (logId: number): Promise<void> => {
    await api.delete(`/logs/${logId}`);
};

export const clearLogs = async (): Promise<void> => {
    await api.delete("/logs/clear");
};
