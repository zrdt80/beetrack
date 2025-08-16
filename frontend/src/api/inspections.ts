import api from "./axios";

export interface Inspection {
    id: number;
    hive_id: number;
    date: string;
    disease_detected: string;
    temperature: number;
    notes?: string;
}

export interface InspectionCreate {
    hive_id: number;
    date: string;
    notes: string;
    temperature: number;
    disease_detected: string;
}

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface InspectionPage {
    meta: PageMeta;
    items: Inspection[];
}

export const getInspections = async (
    hiveId: number,
    page: number = 1,
    size: number = 20
): Promise<InspectionPage> => {
    const res = await api.get<InspectionPage>(
        `/inspections/hive/${hiveId}?page=${page}&size=${size}`
    );
    return res.data;
};

export const createInspection = async (data: InspectionCreate) => {
    const res = await api.post<Inspection>(`/inspections`, data);
    return res.data;
};

export const updateInspection = async (
    inspectionId: number,
    data: InspectionCreate
) => {
    const res = await api.put<Inspection>(`/inspections/${inspectionId}`, data);
    return res.data;
};

export const deleteInspection = async (id: number) => {
    await api.delete(`/inspections/${id}`);
};
