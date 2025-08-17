import { useEffect, useState, Suspense, lazy, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    getOrders,
    getAllOrders,
    createOrder,
    deleteOrder,
    type OrderPage,
    type Order,
    type OrderItem,
} from "@/api/orders";
import { getProducts, type ProductPage, type Product } from "@/api/products";
import { formatDateTime } from "@/lib/datetime";
import TimezoneDisplay from "@/components/TimezoneDisplay";
import { Button } from "@/components/ui/button";
const OrderEditModal = lazy(() => import("@/components/OrderEditModal"));
import useDocumentTitle from "@/hooks/useDocumentTitle";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type SortKey = "date" | "status" | "id";
type SortOrder = "asc" | "desc";

export default function OrdersPage() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [orderPage, setOrderPage] = useState(1);
    const [orderPages, setOrderPages] = useState(1);
    const [selected, setSelected] = useState<OrderItem[]>([]);
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [productSearch, setProductSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [orderError, setOrderError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useDocumentTitle("Orders");

    const load = async (
        oPage: number = orderPage,
        sKey: SortKey = sortKey,
        sOrder: SortOrder = sortOrder,
        status: string = statusFilter,
        statuses: string[] = selectedStatuses,
        search: string = debouncedSearch
    ) => {
        setLoading(true);
        try {
            const [oRes, pRes] = await Promise.all([
                (user?.role === "admin"
                    ? getAllOrders(
                          oPage,
                          20,
                          sKey,
                          sOrder,
                          status,
                          statuses,
                          search
                      )
                    : getOrders(
                          oPage,
                          20,
                          sKey,
                          sOrder,
                          status,
                          statuses,
                          search
                      )) as Promise<OrderPage>,
                getProducts(1, 100) as Promise<ProductPage>,
            ]);
            setOrders(oRes.items);
            setOrderPage(oRes.meta.page);
            setOrderPages(oRes.meta.pages || 1);
            setProducts(pRes.items);
        } finally {
            setLoading(false);
        }
    };

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qPage = parseInt(params.get("page") || "1", 10);
        const qSortKey = (params.get("sort_key") as SortKey) || "date";
        const qSortOrder = (params.get("sort_order") as SortOrder) || "desc";
        const qStatus = params.get("status") || "all";
        setOrderPage(qPage);
        setSortKey(
            ["date", "id", "status"].includes(qSortKey) ? qSortKey : "date"
        );
        setSortOrder(qSortOrder === "asc" ? "asc" : "desc");
        setStatusFilter(qStatus);
        load(qPage, qSortKey, qSortOrder, qStatus);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        params.set("page", String(orderPage));
        params.set("sort_key", sortKey);
        params.set("sort_order", sortOrder);
        params.set("status", statusFilter);
        const newSearch = `?${params.toString()}`;
        if (newSearch !== location.search) {
            navigate({ search: newSearch }, { replace: true });
        }
    }, [
        orderPage,
        sortKey,
        sortOrder,
        statusFilter,
        navigate,
        location.search,
    ]);

    const handleAddProduct = (id: number) => {
        const found = selected.find((item) => item.product_id === id);
        const product = products.find((p) => p.id === id);
        if (found) {
            if (product && found.quantity >= product.stock_quantity) {
                setOrderError(
                    `Cannot add more than available stock for ${product.name}.`
                );
                return;
            }
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
        setOrderError(null);
    };

    const handleSubmit = async () => {
        if (!selected.length) return;
        setOrderError(null);
        try {
            await createOrder({ items: selected });
            setSelected([]);
            load();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            if (typeof detail === "string") {
                setOrderError(detail);
            } else {
                setOrderError(
                    "Failed to place order. Please review quantities and try again."
                );
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Delete this order?")) {
            await deleteOrder(id);
            load();
        }
    };

    const filteredOrders = orders;

    const statuses = useMemo(
        () => Array.from(new Set(orders.map((o) => o.status))).sort(),
        [orders]
    );

    useEffect(() => {
        const handle = setTimeout(
            () => setDebouncedSearch(productSearch.trim()),
            400
        );
        return () => clearTimeout(handle);
    }, [productSearch]);

    useEffect(() => {
        if (debouncedSearch !== undefined) {
            load(
                1,
                sortKey,
                sortOrder,
                statusFilter,
                selectedStatuses,
                debouncedSearch
            );
            setOrderPage(1);
        }
    }, [debouncedSearch]);

    const handleSort = (key: SortKey) => {
        let nextOrder: SortOrder = "asc";
        if (sortKey === key) {
            nextOrder = sortOrder === "asc" ? "desc" : "asc";
        }
        setSortKey(key);
        setSortOrder(nextOrder);
        load(
            1,
            key,
            nextOrder,
            statusFilter,
            selectedStatuses,
            debouncedSearch
        );
        setOrderPage(1);
    };

    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
        setOrderPage(1);
        load(1, sortKey, sortOrder, val, selectedStatuses, debouncedSearch);
    };

    const toggleStatus = (status: string) => {
        setSelectedStatuses((prev) => {
            const exists = prev.includes(status);
            const next = exists
                ? prev.filter((s) => s !== status)
                : [...prev, status];
            load(1, sortKey, sortOrder, statusFilter, next, debouncedSearch);
            setOrderPage(1);
            return next;
        });
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
                                            {prod && (
                                                <span className="text-xs text-muted-foreground">
                                                    Stock: {prod.stock_quantity}
                                                </span>
                                            )}
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
                                                disabled={
                                                    !!products.find(
                                                        (p) =>
                                                            p.id ===
                                                                s.product_id &&
                                                            s.quantity >=
                                                                p.stock_quantity
                                                    )
                                                }
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
                        {orderError && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertTitle>Order Error</AlertTitle>
                                <AlertDescription>
                                    {orderError}
                                </AlertDescription>
                            </Alert>
                        )}
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

            <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Select
                            value={statusFilter}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className="w-32 h-8 text-xs">
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
                    <div className="flex items-center gap-2 flex-wrap">
                        {statuses.map((s) => {
                            const active = selectedStatuses.includes(s);
                            return (
                                <Button
                                    key={s}
                                    size="sm"
                                    variant={active ? "default" : "outline"}
                                    className="h-7 px-3 text-xs"
                                    onClick={() => toggleStatus(s)}
                                >
                                    {s}
                                </Button>
                            );
                        })}
                    </div>
                    <div className="ml-auto flex items-center">
                        <div className="relative">
                            <label
                                htmlFor="order-product-search"
                                className="sr-only"
                            >
                                Search product in orders
                            </label>
                            <input
                                id="order-product-search"
                                type="text"
                                placeholder="Search products in orders..."
                                value={productSearch}
                                onChange={(e) =>
                                    setProductSearch(e.target.value)
                                }
                                className="h-8 w-60 md:w-72 rounded-md border bg-background/60 backdrop-blur-sm pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition"
                            />
                            <svg
                                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            {productSearch && (
                                <button
                                    type="button"
                                    onClick={() => setProductSearch("")}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded hover:bg-muted text-muted-foreground flex items-center justify-center text-xs"
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {selectedStatuses.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                        Multi-status filter active:{" "}
                        {selectedStatuses.join(", ")}
                    </div>
                )}
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
                    {loading && (
                        <TableRow>
                            <TableCell
                                colSpan={user?.role === "admin" ? 6 : 5}
                                className="text-center py-6"
                            >
                                Loading orders...
                            </TableCell>
                        </TableRow>
                    )}
                    {!loading && filteredOrders.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={user?.role === "admin" ? 6 : 5}
                                className="text-center py-6 text-muted-foreground"
                            >
                                No orders found.
                            </TableCell>
                        </TableRow>
                    )}
                    {!loading &&
                        filteredOrders.map((o, idx) => (
                            <TableRow
                                key={o.id}
                                className={`transition-colors ${
                                    idx % 2 === 0
                                        ? "bg-muted/80"
                                        : "bg-muted/50"
                                } hover:bg-muted`}
                                style={{ borderBottom: "1px solid #e5e7eb" }}
                            >
                                <TableCell className="border-r">
                                    {o.id}
                                </TableCell>
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
                                        <Suspense
                                            fallback={<span>Loading...</span>}
                                        >
                                            <OrderEditModal
                                                order={o}
                                                onSuccess={() =>
                                                    load(
                                                        orderPage,
                                                        sortKey,
                                                        sortOrder,
                                                        statusFilter
                                                    )
                                                }
                                            />
                                        </Suspense>
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
            <div className="flex items-center gap-4 mt-4">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={orderPage <= 1}
                    onClick={() => orderPage > 1 && load(orderPage - 1)}
                >
                    Prev
                </Button>
                <span className="text-sm">
                    Page {orderPage} / {orderPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={orderPage >= orderPages}
                    onClick={() =>
                        orderPage < orderPages && load(orderPage + 1)
                    }
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
