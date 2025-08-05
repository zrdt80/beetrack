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

export const getInspections = async (hiveId: number): Promise<Inspection[]> => {
    const res = await api.get<Inspection[]>(`/inspections/hive/${hiveId}`);
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
