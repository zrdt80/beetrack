import { useEffect, useState } from "react";
import { updateProduct } from "@/api/products";
import type { Product, ProductCreate } from "@/api/products";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProductEditModal({
    product,
    onSuccess,
}: {
    product: Product;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<ProductCreate>({
        name: product.name,
        description: product.description || "",
        unit_price: product.unit_price,
        stock_quantity: product.stock_quantity,
    });
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setError(null);
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const nextVal =
            type === "number" ? (value === "" ? 0 : Number(value)) : value;
        setForm({ ...form, [name]: nextVal } as ProductCreate);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProduct(product.id, {
                ...form,
                unit_price: Number(form.unit_price),
                stock_quantity: Number(form.stock_quantity),
            });
            onSuccess();
            setOpen(false);
        } catch (err) {
            const axErr = err as {
                response?: { data?: { detail?: unknown } };
                message?: unknown;
            };
            const detail = axErr?.response?.data?.detail;
            const message =
                (typeof detail === "string" && detail) ||
                (typeof axErr?.message === "string" && axErr.message) ||
                "Update failed.";
            setError(message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">Edit</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle className="text-xl font-bold mb-4">
                    Edit Product
                </DialogTitle>
                <DialogDescription>
                    Update the product details below and click "Save" to apply
                    changes.
                </DialogDescription>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                    />
                    <Input
                        name="unit_price"
                        type="number"
                        value={
                            typeof form.unit_price === "number"
                                ? form.unit_price
                                : form.unit_price
                        }
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="stock_quantity"
                        type="number"
                        value={form.stock_quantity}
                        onChange={handleChange}
                        required
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit">Save</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
