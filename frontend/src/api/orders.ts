import api from "./axios";

export interface OrderItem {
    product_id: number;
    quantity: number;
}

export interface Order {
    id: number;
    user_id: number;
    date: string;
    status: string;
    total_price: number;
    items: [
        {
            product_id: number;
            quantity: string;
            price_each: number;
        }
    ];
}

export interface OrderCreate {
    items: OrderItem[];
}

export interface OrderUpdate {
    status: string;
}

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface OrderPage {
    meta: PageMeta;
    items: Order[];
}

export const getOrders = async (
    page: number = 1,
    size: number = 20,
    sort_key: "id" | "date" | "status" = "date",
    sort_order: "asc" | "desc" = "desc",
    status_filter?: string | null,
    statuses?: string[] | null,
    product_search?: string | null
): Promise<OrderPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort_key,
        sort_order,
    });
    if (status_filter && status_filter !== "all") {
        params.append("status_filter", status_filter);
    }
    if (statuses && statuses.length) {
        params.append("statuses", statuses.join(","));
    }
    if (product_search) {
        params.append("product_search", product_search);
    }
    const res = await api.get<OrderPage>(`/orders/?${params.toString()}`);
    return res.data;
};

export const getAllOrders = async (
    page: number = 1,
    size: number = 20,
    sort_key: "id" | "date" | "status" = "date",
    sort_order: "asc" | "desc" = "desc",
    status_filter?: string | null,
    statuses?: string[] | null,
    product_search?: string | null
): Promise<OrderPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort_key,
        sort_order,
    });
    if (status_filter && status_filter !== "all") {
        params.append("status_filter", status_filter);
    }
    if (statuses && statuses.length) {
        params.append("statuses", statuses.join(","));
    }
    if (product_search) {
        params.append("product_search", product_search);
    }
    const res = await api.get<OrderPage>(`/orders/all?${params.toString()}`);
    return res.data;
};

export const createOrder = async (data: OrderCreate): Promise<Order> => {
    const res = await api.post<Order>("/orders/", data);
    return res.data;
};

export const updateOrder = async (
    id: number,
    data: OrderUpdate
): Promise<Order> => {
    const res = await api.put<Order>(`/orders/${id}/`, data);
    return res.data;
};

export const deleteOrder = async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`);
};
