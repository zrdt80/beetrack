import api from "./axios";

export interface ExportFilterBase {
    apiary_ids?: number[];
    start_date?: string;
    end_date?: string;
    format: "csv" | "pdf";
    timezone?: string;
}

export interface OrderExportFilter {
    start_date?: string;
    end_date?: string;
    format: "csv" | "pdf";
    timezone?: string;
    user_ids?: number[];
    status_filter?: string[];
}

export interface InspectionExportFilter extends ExportFilterBase {
    hive_ids?: number[];
    temperature_min?: number;
    temperature_max?: number;
    disease_filter?: string[];
}

export interface HiveExportFilter {
    apiary_ids?: number[];
    format: "csv" | "pdf";
    timezone?: string;
    status_filter?: string[];
    last_inspection_days?: number;
}

export interface ApiaryExportFilter {
    format: "csv" | "pdf";
    timezone?: string;
    owner_ids?: number[];
    include_member_count?: boolean;
    include_hive_count?: boolean;
}

export const exportOrdersCSV = async (): Promise<Blob> => {
    const res = await api.get<Blob>("/export/orders/csv", {
        responseType: "blob",
    });
    return res.data;
};

export const exportOrdersPDF = async (): Promise<Blob> => {
    const res = await api.get<Blob>("/export/orders/pdf", {
        responseType: "blob",
    });
    return res.data;
};

export const exportInspectionsPDF = async (): Promise<Blob> => {
    const res = await api.get<Blob>("/export/inspections/pdf", {
        responseType: "blob",
    });
    return res.data;
};

export const exportOrdersFiltered = async (
    filters: OrderExportFilter
): Promise<Blob> => {
    const res = await api.post<Blob>("/export/filtered/orders", filters, {
        responseType: "blob",
    });
    return res.data;
};

export const exportInspectionsFiltered = async (
    filters: InspectionExportFilter
): Promise<Blob> => {
    const res = await api.post<Blob>("/export/filtered/inspections", filters, {
        responseType: "blob",
    });
    return res.data;
};

export const exportHivesFiltered = async (
    filters: HiveExportFilter
): Promise<Blob> => {
    const res = await api.post<Blob>("/export/filtered/hives", filters, {
        responseType: "blob",
    });
    return res.data;
};

export const exportApiariesFiltered = async (
    filters: ApiaryExportFilter
): Promise<Blob> => {
    const res = await api.post<Blob>("/export/filtered/apiaries", filters, {
        responseType: "blob",
    });
    return res.data;
};
