import { useEffect, useState } from "react";
import {
    getProducts,
    createProduct,
    deleteProduct,
    updateProduct,
} from "@/api/products";
import type { Product, ProductCreate } from "@/types/product";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductEditModal from "@/components/ProductEditModal";

export default function ProductsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [form, setForm] = useState<ProductCreate>({
        name: "",
        unit_price: 0,
        stock_quantity: 0,
        description: "",
    });

    const load = async () => {
        const data = await getProducts();
        setProducts(data);
    };

    useEffect(() => {
        load();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createProduct({
            ...form,
            price: Number(form.price),
            stock: Number(form.stock),
        });
        setForm({ name: "", description: "", price: 0, stock: 0 });
        load();
    };

    const handleDelete = async (id: number) => {
        if (confirm("Delete this product?")) {
            await deleteProduct(id);
            load();
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">📦 Products</h1>

            {user?.role === "admin" && (
                <form
                    onSubmit={handleSubmit}
                    className="flex gap-4 flex-wrap mb-6 items-end"
                >
                    <Input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Name"
                        required
                    />
                    <Input
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Description"
                    />
                    <Input
                        name="unit_price"
                        type="number"
                        value={form.unit_price}
                        onChange={handleChange}
                        placeholder="Price"
                    />
                    <Input
                        name="stock_quantity"
                        type="number"
                        value={form.stock_quantity}
                        onChange={handleChange}
                        placeholder="Stock"
                    />
                    <Button type="submit">Add Product</Button>
                </form>
            )}

            <table className="w-full bg-white rounded shadow border">
                <thead className="bg-gray-100 text-left">
                    <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Stock</th>
                        {user?.role === "admin" && (
                            <th className="p-2">Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => (
                        <tr key={p.id} className="border-t">
                            <td className="p-2">{p.name}</td>
                            <td className="p-2">{p.description || "-"}</td>
                            <td className="p-2">
                                {p.unit_price.toFixed(2)} zł
                            </td>
                            <td className="p-2">{p.stock_quantity} szt.</td>
                            {user?.role === "admin" && (
                                <td className="p-2">
                                    <div className="flex gap-2">
                                        <ProductEditModal
                                            product={p}
                                            onSuccess={load}
                                        />
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDelete(p.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
