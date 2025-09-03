import { useEffect, useState } from "react";
import { createHive } from "@/api/hives";
import type { HiveCreate } from "@/api/hives";
import { getApiaries } from "@/api/apiaries";
import type { Apiary, ApiaryPage } from "@/api/apiaries";
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
    const [form, setForm] = useState<{
        name: string;
        apiary_id: number | "";
        status: string;
    }>({ name: "", apiary_id: "", status: "active" });
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [apiaries, setApiaries] = useState<Apiary[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const res: ApiaryPage = await getApiaries(1, 100);
                setApiaries(res.items);
            } catch {
                // ignore
            }
        };
        if (open) load();
    }, [open]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const payload: HiveCreate = {
                name: form.name,
                apiary_id:
                    typeof form.apiary_id === "string"
                        ? Number(form.apiary_id)
                        : form.apiary_id,
                status: form.status || "active",
            };
            await createHive(payload);
            onSuccess();
            setForm({ name: "", apiary_id: "", status: "active" });
            setOpen(false);
        } catch {
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
                    <select
                        name="apiary_id"
                        className="border border-gray-300 rounded-md bg-white p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                        value={form.apiary_id}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select apiary…</option>
                        {apiaries.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                                {a.location ? ` — ${a.location}` : ""}
                            </option>
                        ))}
                    </select>
                    <select
                        name="status"
                        className="border border-gray-300 rounded-md bg-white p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                        value={form.status}
                        onChange={handleChange}
                    >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                    </select>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit">Create Hive</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
