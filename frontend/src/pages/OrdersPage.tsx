import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrders, createOrder, cancelOrder } from "@/api/orders";
import type { Order, OrderItem } from "@/api/orders";
import { getProducts } from "@/api/products";
import type { Product } from "@/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selected, setSelected] = useState<OrderItem[]>([]);

    const load = async () => {
        const [o, p] = await Promise.all([getOrders(), getProducts()]);
        setOrders(o);
        setProducts(p);
    };

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    useEffect(() => {
        load();
    }, []);

    const handleAddProduct = (id: number) => {
        const found = selected.find((item) => item.product_id === id);
        if (found) {
            setSelected(
                selected.map((item) =>
                    item.product_id === id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
        } else {
            setSelected([...selected, { product_id: id, quantity: 1 }]);
        }
    };

    const handleSubmit = async () => {
        if (!selected.length) return;
        await createOrder({ items: selected });
        setSelected([]);
        load();
    };

    const handleCancel = async (id: number) => {
        if (confirm("Cancel this order?")) {
            await cancelOrder(id);
            load();
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">🛒 Orders</h1>

            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Create New Order</h2>
                <div className="flex gap-4 flex-wrap mb-2">
                    {products.map((p) => (
                        <Button
                            key={p.id}
                            onClick={() => handleAddProduct(p.id)}
                        >
                            {productMap[p.id]}
                        </Button>
                    ))}
                </div>
                {selected.length > 0 && (
                    <>
                        <ul className="mb-2 text-sm text-gray-600">
                            {selected.map((s) => {
                                const prod = products.find(
                                    (p) => p.product_id === s.product_id
                                );
                                return (
                                    <li key={s.product_id}>
                                        {prod?.product_id} – {s.quantity}
                                    </li>
                                );
                            })}
                        </ul>
                        <Button onClick={handleSubmit}>Submit Order</Button>
                    </>
                )}
            </div>

            <table className="w-full bg-white border rounded shadow-sm">
                <thead className="bg-gray-100 text-left">
                    <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Items</th>
                        {user?.role === "admin" && (
                            <th className="p-2">Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {orders.map((o) => (
                        <tr key={o.id} className="border-t">
                            <td className="p-2">{o.id}</td>
                            <td className="p-2">
                                {new Date(o.date).toLocaleString()}
                            </td>
                            <td className="p-2">{o.status}</td>
                            <td className="p-2">
                                <ul className="text-sm">
                                    {o.items.map((item, i) => (
                                        <li key={i}>
                                            {productMap[item.product_id]} x{" "}
                                            {item.quantity}
                                        </li>
                                    ))}
                                </ul>
                            </td>
                            {user?.role === "admin" && (
                                <td className="p-2">
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleCancel(o.id)}
                                    >
                                        Cancel
                                    </Button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
