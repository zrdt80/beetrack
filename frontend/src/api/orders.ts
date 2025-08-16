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
    size: number = 20
): Promise<OrderPage> => {
    const res = await api.get<OrderPage>(`/orders/?page=${page}&size=${size}`);
    return res.data;
};

export const getAllOrders = async (
    page: number = 1,
    size: number = 20
): Promise<OrderPage> => {
    const res = await api.get<OrderPage>(
        `/orders/all?page=${page}&size=${size}`
    );
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
