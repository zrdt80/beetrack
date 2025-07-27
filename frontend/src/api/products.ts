import api from "./axios";

export interface Product {
    id: number;
    name: string;
    description?: string;
    price: number;
    stock: number;
    created_at: string;
}

export interface ProductCreate {
    name: string;
    description?: string;
    price: number;
    stock: number;
}

export const getProducts = async (): Promise<Product[]> => {
    const res = await api.get("/products/");
    return res.data;
};

export const createProduct = async (data: ProductCreate): Promise<Product> => {
    const res = await api.post("/products/", data);
    return res.data;
};

export const updateProduct = async (
    id: number,
    data: ProductCreate
): Promise<Product> => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
};
