import { useState } from "react";
import { updateHive } from "@/api/hives";
import type { Hive, HiveCreate } from "@/api/hives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function HiveEditModal({
    hive,
    onSuccess,
}: {
    hive: Hive;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<HiveCreate>({
        name: hive.name,
        location: hive.location,
        status: hive.status,
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
            await updateHive(hive.id, form);
            onSuccess();
            setOpen(false);
        } catch (err) {
            setError("Failed to update hive.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">Edit</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle className="text-xl font-bold mb-4">
                    Edit Hive
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mb-4">
                    Update the details of the hive below.
                </DialogDescription>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit">Save Changes</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
