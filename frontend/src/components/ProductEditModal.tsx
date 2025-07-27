import { useState } from "react";
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProduct(product.id, {
                ...form,
                price: Number(form.price),
                stock: Number(form.stock),
            });
            onSuccess();
            setOpen(false);
        } catch {
            setError("Update failed.");
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
                        value={form.unit_price.toFixed(2)}
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
