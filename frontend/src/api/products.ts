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

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface ProductPage {
    meta: PageMeta;
    items: Product[];
}

export const getProducts = async (
    page: number = 1,
    size: number = 20
): Promise<ProductPage> => {
    const res = await api.get<ProductPage>(
        `/products/?page=${page}&size=${size}`
    );
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
