import { useState } from "react";
import { updateOrder } from "@/api/orders";
import type { Order, OrderUpdate } from "@/api/orders";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function OrderEditModal({
    order,
    onSuccess,
}: {
    order: Order;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<Pick<OrderUpdate, "status">>({
        status: order.status,
    });
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateOrder(order.id, { status: form.status });
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
                    Edit Order Status
                </DialogTitle>
                <DialogDescription>
                    Update the order status below and click "Save" to apply
                    changes.
                </DialogDescription>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        value={form.status}
                        onValueChange={(value) =>
                            setForm({ status: value as OrderUpdate["status"] })
                        }
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">
                                Processing
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit">Save</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
