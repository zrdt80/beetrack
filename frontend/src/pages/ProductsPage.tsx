import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getProducts, createProduct, deleteProduct } from "@/api/products";
import type { Product } from "@/api/products";
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

export default function ProductsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        unit_price: "",
        stock_quantity: "",
    });
    const [open, setOpen] = useState(false);

    const load = async () => {
        const p = await getProducts();
        setProducts(p);
    };

    useEffect(() => {
        load();
    }, []);

    const handleSubmit = async () => {
        await createProduct({
            name: formData.name,
            description: formData.description || undefined,
            unit_price: parseFloat(formData.unit_price),
            stock_quantity: parseInt(formData.stock_quantity),
        });
        setFormData({
            name: "",
            description: "",
            unit_price: "",
            stock_quantity: "",
        });
        setOpen(false);
        load();
    };

    const handleDelete = async (id: number) => {
        if (confirm("Delete this product?")) {
            await deleteProduct(id);
            load();
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
            render: (product) => `${Number(product.unit_price).toFixed(2)} zł`,
            className: "text-right",
        },
        {
            key: "stock_quantity",
            header: "Stock",
            render: (product) => `${product.stock_quantity} szt.`,
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
                                  onSuccess={load}
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
                                    placeholder="Unit price (zł)"
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
                emptyMessage="No products found."
                className="mb-4"
            />
        </div>
    );
}
