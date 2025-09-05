import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getProducts, createProduct, deleteProduct } from "@/api/products";
import type { Product, ProductPage } from "@/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import ProductEditModal from "@/components/ProductEditModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import PaginationControls from "@/components/PaginationControls";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";

export default function ProductsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [page, setPage] = useState(1);
    const [size] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const confirm = useConfirm();

    const isSyncingFromUrl = useRef(false);
    const isWritingUrl = useRef(false);
    const locationSearchRef = useRef(location.search);
    const lastWrittenSearchRef = useRef<string | null>(null);

    useDocumentTitle("Products");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        unit_price: "",
        stock_quantity: "",
    });
    const [open, setOpen] = useState(false);

    const load = useCallback(
        async (p: number) => {
            setLoading(true);
            try {
                const res: ProductPage = await getProducts(p, size);
                setProducts(res.items);
                setPage(res.meta.page);
                setTotalPages(res.meta.pages || 1);
            } finally {
                setLoading(false);
            }
        },
        [size]
    );

    useEffect(() => {
        if (isWritingUrl.current) {
            isWritingUrl.current = false;
            return;
        }
        isSyncingFromUrl.current = true;
        const params = new URLSearchParams(location.search);
        const qPage = parseInt(params.get("page") || "1", 10);
        const validPage = Math.max(1, qPage);

        if (page !== validPage) setPage(validPage);
        queueMicrotask(() => {
            isSyncingFromUrl.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        if (isSyncingFromUrl.current) {
            return;
        }
        const params = new URLSearchParams();
        params.set("page", String(page));
        const newSearch = `?${params.toString()}`;
        if (
            newSearch !== locationSearchRef.current &&
            newSearch !== lastWrittenSearchRef.current
        ) {
            isWritingUrl.current = true;
            lastWrittenSearchRef.current = newSearch;
            navigate({ search: newSearch }, { replace: true });
        }
    }, [page, navigate]);

    useEffect(() => {
        locationSearchRef.current = location.search;
    }, [location.search]);

    useEffect(() => {
        load(page);
    }, [page, load]);

    const handleSubmit = async () => {
        await toast.promise(
            createProduct({
                name: formData.name,
                description: formData.description || undefined,
                unit_price: parseFloat(formData.unit_price),
                stock_quantity: parseInt(formData.stock_quantity),
            }),
            {
                loading: "Creating product...",
                success: "Product created",
                error: "Failed to create product",
            }
        );
        setFormData({
            name: "",
            description: "",
            unit_price: "",
            stock_quantity: "",
        });
        setOpen(false);
        load(page);
    };

    const handleDelete = async (id: number) => {
        const ok = await confirm({
            title: "Delete product?",
            description:
                "Are you sure you want to delete this product? This cannot be undone.",
            confirmText: "Delete",
            destructive: true,
        });
        if (ok) {
            try {
                await toast.promise(deleteProduct(id), {
                    loading: "Deleting product...",
                    success: "Product deleted",
                    error: (err: unknown) => {
                        if (
                            err &&
                            typeof err === "object" &&
                            "response" in err
                        ) {
                            const response = (
                                err as {
                                    response?: { data?: { detail?: string } };
                                }
                            ).response;
                            return (
                                response?.data?.detail ||
                                "Failed to delete product"
                            );
                        }
                        if (err instanceof Error) {
                            return err.message;
                        }
                        return "Failed to delete product";
                    },
                });
            } catch {
                // Error handled by toast
            } finally {
                await new Promise((resolve) => setTimeout(resolve, 100));
                await load(page);
            }
        }
    };

    const columns: DataTableColumn<Product>[] = [
        {
            key: "name",
            header: "Name",
            sortable: true,
        },
        {
            key: "description",
            header: "Description",
            render: (product) => product.description || "-",
        },
        {
            key: "unit_price",
            header: "Price",
            render: (product) => `${Number(product.unit_price).toFixed(2)} USD`,
            className: "text-right",
        },
        {
            key: "stock_quantity",
            header: "Stock",
            render: (product) => `${product.stock_quantity} pcs.`,
            className: "text-right",
        },
        ...(user?.role === "admin"
            ? [
                  {
                      key: "actions" as keyof Product,
                      header: "Actions",
                      render: (product: Product) => (
                          <div className="flex gap-2">
                              <ProductEditModal
                                  product={product}
                                  onSuccess={() => {
                                      toast.success("Product updated");
                                      load(page);
                                  }}
                              />
                              <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(product.id)}
                              >
                                  Delete
                              </Button>
                          </div>
                      ),
                      className: "w-48",
                  },
              ]
            : []),
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Products</h1>
                {user?.role === "admin" && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Add Product</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSubmit();
                                }}
                                className="space-y-4"
                            >
                                <Input
                                    placeholder="Product name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                />
                                <Input
                                    placeholder="Description (optional)"
                                    value={formData.description}
                                    onChange={(
                                        e: React.ChangeEvent<HTMLInputElement>
                                    ) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Unit price (USD)"
                                    value={formData.unit_price}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            unit_price: e.target.value,
                                        })
                                    }
                                    required
                                />
                                <Input
                                    type="number"
                                    placeholder="Stock quantity"
                                    value={formData.stock_quantity}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            stock_quantity: e.target.value,
                                        })
                                    }
                                    required
                                />
                                <DialogFooter>
                                    <Button type="submit">Add Product</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <DataTable
                data={products}
                columns={columns}
                emptyMessage={loading ? "Loading..." : "No products found."}
                className="mb-4"
            />
            <PaginationControls
                className="mt-2"
                page={page}
                pages={totalPages}
                onChange={(p) => {
                    if (p !== page) setPage(p);
                }}
            />
        </div>
    );
}
