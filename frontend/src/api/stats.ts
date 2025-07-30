import api from "./axios";

export interface MonthlySales {
    year: number;
    month: number;
    orders: number;
    total_sales: number;
}

export interface MonthlyInspections {
    year: number;
    month: number;
    inspections: number;
}

export interface TopProduct {
    product: string;
    sold: number;
}

export const getMonthlySales = async (
    year: number,
    month: number
): Promise<MonthlySales[]> => {
    const res = await api.get("/stats/monthly-sales", {
        params: { year, month },
    });
    return res.data;
};

export const getMonthlyInspections = async (
    year: number,
    month: number
): Promise<MonthlyInspections[]> => {
    const res = await api.get("/stats/monthly-inspections", {
        params: { year, month },
    });
    return res.data;
};

export const getTopProducts = async (
    limit: number = 5
): Promise<TopProduct[]> => {
    const res = await api.get("/stats/top-products", {
        params: { limit },
    });
    return res.data;
};
