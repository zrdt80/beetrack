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
    items: {
        product: {
            product_id: number;
            quantity: string;
            price_each: number;
        };
    }[];
}

export interface OrderCreate {
    items: OrderItem[];
}

export const getOrders = async (): Promise<Order[]> => {
    const res = await api.get("/orders/");
    return res.data;
};

export const createOrder = async (data: OrderCreate): Promise<Order> => {
    const res = await api.post("/orders/", data);
    return res.data;
};

export const cancelOrder = async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`);
};
