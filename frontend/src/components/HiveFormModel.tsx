import { useState } from "react";
import { createHive } from "@/api/hives";
import type { HiveCreate } from "@/api/hives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function HiveFormModal({
    onSuccess,
}: {
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<HiveCreate>({
        name: "",
        location: "",
        status: "active",
    });
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await createHive(form);
            onSuccess();
            setForm({ name: "", location: "", status: "active" });
            setOpen(false);
        } catch (err) {
            setError("Failed to create hive.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>➕ Add Hive</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle className="text-xl font-bold">
                    Add New Hive
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mb-4">
                    Fill out the details below to create a new hive.
                </DialogDescription>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="name"
                        placeholder="Name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="location"
                        placeholder="Location"
                        value={form.location}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="status"
                        placeholder="Status"
                        value={form.status}
                        onChange={handleChange}
                    />

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit">Create Hive</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
