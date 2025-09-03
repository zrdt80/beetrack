import api from "./axios";

export interface Hive {
    id: number;
    name: string;
    status: string;
    apiary_id?: number;
    last_inspection_date?: string;
}

export interface HiveCreate {
    name: string;
    apiary_id?: number;
    status?: string;
}

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface HivePage {
    meta: PageMeta;
    items: Hive[];
}

export const getHives = async (
    page: number = 1,
    size: number = 20
): Promise<HivePage> => {
    const res = await api.get<HivePage>(`/hives/?page=${page}&size=${size}`);
    return res.data;
};

export const getHive = async (id: number): Promise<Hive> => {
    const res = await api.get<Hive>(`/hives/${id}`);
    return res.data;
};

export const createHive = async (data: HiveCreate): Promise<Hive> => {
    const res = await api.post<Hive>("/hives/", data);
    return res.data;
};

export const updateHive = async (
    id: number,
    data: HiveCreate
): Promise<Hive> => {
    const res = await api.put<Hive>(`/hives/${id}`, data);
    return res.data;
};

export const deleteHive = async (id: number): Promise<void> => {
    await api.delete(`/hives/${id}`);
};
