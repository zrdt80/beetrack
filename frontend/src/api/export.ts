import api from "./axios";

export const exportOrdersCSV = async (): Promise<Blob> => {
    const res = await api.get<Blob>("/export/orders/csv", {
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
