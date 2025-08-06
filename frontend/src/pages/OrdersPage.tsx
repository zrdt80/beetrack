import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    getOrders,
    getAllOrders,
    createOrder,
    deleteOrder,
} from "@/api/orders";
import type { Order, OrderItem } from "@/api/orders";
import { getProducts } from "@/api/products";
import type { Product } from "@/api/products";
import { formatDateTime } from "@/lib/datetime";
import TimezoneDisplay from "@/components/TimezoneDisplay";
import { Button } from "@/components/ui/button";
import OrderEditModal from "@/components/OrderEditModal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "date" | "status" | "id";
type SortOrder = "asc" | "desc";

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selected, setSelected] = useState<OrderItem[]>([]);
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [statusFilter, setStatusFilter] = useState<string>("");

    const load = async () => {
        const [o, p] = await Promise.all([
            user?.role === "admin" ? getAllOrders() : getOrders(),
            getProducts(),
        ]);
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

    const handleDelete = async (id: number) => {
        if (confirm("Delete this order?")) {
            await deleteOrder(id);
            load();
        }
    };

    const sortedOrders = [...orders]
        .filter(
            (o) =>
                ["all", ""].includes(statusFilter) || o.status === statusFilter
        )
        .sort((a, b) => {
            let cmp = 0;
            if (sortKey === "date") {
                cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            } else if (sortKey === "id") {
                cmp = a.id - b.id;
            } else if (sortKey === "status") {
                cmp = a.status.localeCompare(b.status);
            }
            return sortOrder === "asc" ? cmp : -cmp;
        });

    const statuses = Array.from(new Set(orders.map((o) => o.status)));

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">🛒 Orders</h1>

            <div className="mb-8 rounded-xl border bg-card p-8 shadow-md">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-primary">New Order</span>
                </h2>
                <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                    <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium text-muted-foreground">
                            Add Product
                        </label>
                        <Select
                            onValueChange={(val) =>
                                handleAddProduct(Number(val))
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a product..." />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {selected.length > 0 && (
                    <div className="rounded-lg border bg-muted/40 p-4 mb-4">
                        <h3 className="font-semibold mb-3 text-muted-foreground text-base">
                            Order Items
                        </h3>
                        <div className="divide-y">
                            {selected.map((s) => {
                                const prod = products.find(
                                    (p) => p.id === s.product_id
                                );
                                return (
                                    <div
                                        key={s.product_id}
                                        className="flex items-center justify-between py-2 gap-4"
                                    >
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="font-medium">
                                                {prod?.name ??
                                                    "Unknown Product"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    setSelected((prev) =>
                                                        prev.map((item) =>
                                                            item.product_id ===
                                                                s.product_id &&
                                                            item.quantity > 1
                                                                ? {
                                                                      ...item,
                                                                      quantity:
                                                                          item.quantity -
                                                                          1,
                                                                  }
                                                                : item
                                                        )
                                                    )
                                                }
                                                disabled={s.quantity <= 1}
                                                aria-label="Decrease quantity"
                                            >
                                                <span className="text-lg">
                                                    -
                                                </span>
                                            </Button>
                                            <span className="font-semibold w-8 text-center">
                                                {s.quantity}
                                            </span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    setSelected((prev) =>
                                                        prev.map((item) =>
                                                            item.product_id ===
                                                            s.product_id
                                                                ? {
                                                                      ...item,
                                                                      quantity:
                                                                          item.quantity +
                                                                          1,
                                                                  }
                                                                : item
                                                        )
                                                    )
                                                }
                                                aria-label="Increase quantity"
                                            >
                                                <span className="text-lg">
                                                    +
                                                </span>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() =>
                                                    setSelected((prev) =>
                                                        prev.filter(
                                                            (item) =>
                                                                item.product_id !==
                                                                s.product_id
                                                        )
                                                    )
                                                }
                                                aria-label="Remove product"
                                            >
                                                <span className="text-lg">
                                                    ×
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Button
                            onClick={handleSubmit}
                            className="w-full mt-6"
                            disabled={selected.length === 0}
                        >
                            Place Order
                        </Button>
                    </div>
                )}
                {selected.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-6">
                        Select products to start a new order.
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 mb-2">
                <span>Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Table className="border rounded-lg overflow-hidden shadow-sm">
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead
                            className="cursor-pointer select-none border-b"
                            onClick={() => handleSort("id")}
                        >
                            ID{" "}
                            {sortKey === "id" &&
                                (sortOrder === "asc" ? (
                                    <ArrowUp className="inline w-4 h-4" />
                                ) : (
                                    <ArrowDown className="inline w-4 h-4" />
                                ))}
                        </TableHead>
                        {user?.role === "admin" && (
                            <TableHead className="border-b">Customer</TableHead>
                        )}
                        <TableHead
                            className="cursor-pointer select-none border-b"
                            onClick={() => handleSort("date")}
                        >
                            <div className="flex items-center gap-2">
                                Date
                                <TimezoneDisplay showIcon={false} />
                                {sortKey === "date" &&
                                    (sortOrder === "asc" ? (
                                        <ArrowUp className="inline w-4 h-4" />
                                    ) : (
                                        <ArrowDown className="inline w-4 h-4" />
                                    ))}
                            </div>
                        </TableHead>
                        <TableHead
                            className="cursor-pointer select-none border-b"
                            onClick={() => handleSort("status")}
                        >
                            Status{" "}
                            {sortKey === "status" &&
                                (sortOrder === "asc" ? (
                                    <ArrowUp className="inline w-4 h-4" />
                                ) : (
                                    <ArrowDown className="inline w-4 h-4" />
                                ))}
                        </TableHead>
                        <TableHead className="border-b">Items</TableHead>
                        {user?.role === "admin" && (
                            <TableHead className="border-b">Actions</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedOrders.map((o, idx) => (
                        <TableRow
                            key={o.id}
                            className={`transition-colors ${
                                idx % 2 === 0 ? "bg-muted/80" : "bg-muted/50"
                            } hover:bg-muted`}
                            style={{ borderBottom: "1px solid #e5e7eb" }}
                        >
                            <TableCell className="border-r">{o.id}</TableCell>
                            {user?.role === "admin" && (
                                <TableCell className="border-r">
                                    <Link
                                        to={`/dashboard/user/${o.user_id}`}
                                        className="underline font-semibold"
                                    >
                                        {o.user_id || "N/A"}
                                    </Link>
                                </TableCell>
                            )}
                            <TableCell className="border-r">
                                {formatDateTime(o.date, "datetime")}
                            </TableCell>
                            <TableCell className="border-r">
                                {o.status}
                            </TableCell>
                            <TableCell className="border-r">
                                <ul className="text-sm">
                                    {o.items.map((item, i) => (
                                        <li key={i}>
                                            {productMap[item.product_id]} x{" "}
                                            {item.quantity}
                                        </li>
                                    ))}
                                </ul>
                            </TableCell>
                            {user?.role === "admin" && (
                                <TableCell className="gap-2 flex items-center">
                                    <OrderEditModal
                                        order={o}
                                        onSuccess={load}
                                    />
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDelete(o.id)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
