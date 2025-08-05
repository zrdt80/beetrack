import api from "./axios";

export interface Product {
    id: number;
    name: string;
    description?: string;
    unit_price: number;
    stock_quantity: number;
    created_at: string;
}

export interface ProductCreate {
    name: string;
    description?: string;
    unit_price: number;
    stock_quantity: number;
}

export const getProducts = async (): Promise<Product[]> => {
    const res = await api.get<Product[]>("/products/");
    return res.data;
};

export const createProduct = async (data: ProductCreate): Promise<Product> => {
    const res = await api.post<Product>("/products/", data);
    return res.data;
};

export const updateProduct = async (
    id: number,
    data: ProductCreate
): Promise<Product> => {
    const res = await api.put<Product>(`/products/${id}`, data);
    return res.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
};
