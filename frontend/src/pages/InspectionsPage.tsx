import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    getInspections,
    createInspection,
    deleteInspection,
} from "@/api/inspections";
import type { InspectionCreate } from "@/api/inspections";
import { getHives } from "@/api/hives";
import type { Hive } from "@/api/hives";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InspectionEditModal from "@/components/InspectionEditModal";

export default function InspectionsPage() {
    const { id } = useParams();
    const hiveId = Number(id);
    const { user } = useAuth();

    const [hive, setHive] = useState<Hive | null>(null);
    const [inspections, setInspections] = useState([]);
    const [form, setForm] = useState<InspectionCreate>({
        date: new Date().toISOString(),
        notes: "",
        temperature: 35,
        disease_detected: "",
        hive_id: hiveId,
    });

    const load = async () => {
        const hives = await getHives();
        const target = hives.find((h) => h.id === hiveId);
        if (target) setHive(target);
        const insp = await getInspections(hiveId);
        setInspections(insp);
    };

    useEffect(() => {
        load();
    }, [hiveId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === "temperature" ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createInspection({ ...form, hive_id: hiveId });
        load();
        setForm({
            date: new Date().toISOString(),
            temperature: 0,
            disease_detected: "",
            notes: "",
            hive_id: hiveId,
        });
    };

    const handleDelete = async (id: number) => {
        if (confirm("Delete this inspection?")) {
            await deleteInspection(id);
            load();
        }
    };

    if (!hive) return <p>Loading hive data...</p>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">
                🧪 Inspections for {hive.name}
            </h1>
            <p className="mb-4 text-gray-600">
                Location: {hive.location} | Status: {hive.status}
            </p>

            <form
                onSubmit={handleSubmit}
                className="mb-6 flex flex-wrap gap-4 items-end"
            >
                <Input
                    name="date"
                    type="datetime-local"
                    value={form.date.slice(0, 16)}
                    onChange={handleChange}
                />
                <Input
                    name="temperature"
                    type="number"
                    placeholder="Temperature (°C)"
                    value={form.temperature}
                    onChange={handleChange}
                />
                <Input
                    name="disease_detected"
                    placeholder="Disease"
                    value={form.disease_detected}
                    onChange={handleChange}
                />
                <Input
                    name="notes"
                    placeholder="Notes"
                    value={form.notes}
                    onChange={handleChange}
                />
                <Button type="submit">Add Inspection</Button>
            </form>

            <table className="w-full border bg-white rounded shadow-sm">
                <thead className="bg-gray-100">
                    <tr className="text-left">
                        <th className="p-2">Date</th>
                        <th className="p-2">Temperature (°C)</th>
                        <th className="p-2">Disease detected</th>
                        <th className="p-2">Notes</th>
                        {user?.role === "admin" && (
                            <th className="p-2">Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {inspections.map((insp) => (
                        <tr key={insp.id} className="border-t">
                            <td className="p-2">
                                {new Date(insp.date).toLocaleDateString()}
                            </td>
                            <td className="p-2">{insp.temperature}</td>
                            <td className="p-2">{insp.disease_detected}</td>
                            <td className="p-2">{insp.notes}</td>
                            {user?.role === "admin" && (
                                <td className="p-2">
                                    <div className="flex gap-2">
                                        <InspectionEditModal
                                            inspection={insp}
                                            onSuccess={load}
                                        />
                                        <Button
                                            variant="destructive"
                                            onClick={() =>
                                                handleDelete(insp.id)
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
