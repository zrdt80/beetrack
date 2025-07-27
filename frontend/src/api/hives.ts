import api from "./axios";

export interface Hive {
    id: number;
    name: string;
    location: string;
    status: string;
    last_inspection_date?: string;
}

export interface HiveCreate {
    name: string;
    location: string;
    status?: string;
}

export const getHives = async (): Promise<Hive[]> => {
    const res = await api.get("/hives/");
    return res.data;
};

export const createHive = async (data: HiveCreate): Promise<Hive> => {
    const res = await api.post("/hives/", data);
    return res.data;
};

export const updateHive = async (
    id: number,
    data: HiveCreate
): Promise<Hive> => {
    const res = await api.put(`/hives/${id}`, data);
    return res.data;
};

export const deleteHive = async (id: number): Promise<void> => {
    await api.delete(`/hives/${id}`);
};
