import api from "./axios";

export const exportOrdersCSV = async (): Promise<Blob> => {
    const res = await api.get("/export/orders/csv", {
        responseType: "blob",
    });
    return res.data;
};

export const exportInspectionsPDF = async (): Promise<Blob> => {
    const res = await api.get("/export/inspections/pdf", {
        responseType: "blob",
    });
    return res.data;
};
