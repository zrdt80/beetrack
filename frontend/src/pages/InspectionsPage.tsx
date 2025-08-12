import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getInspections,
    createInspection,
    deleteInspection,
} from "@/api/inspections";
import type { Inspection, InspectionCreate } from "@/api/inspections";
import { getHives } from "@/api/hives";
import type { Hive } from "@/api/hives";
import { useAuth } from "@/context/AuthContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { formatDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InspectionEditModal from "@/components/InspectionEditModal";
import DiseaseSelector from "@/components/DiseaseSelector";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

export default function InspectionsPage() {
    const { id } = useParams();
    const hiveId = Number(id);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === "user") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const [hive, setHive] = useState<Hive | null>(null);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [form, setForm] = useState<InspectionCreate>({
        date: new Date().toISOString(),
        notes: "",
        temperature: 35,
        disease_detected: "",
        hive_id: hiveId,
    });

    useDocumentTitle(hive ? `Inspections: ${hive.name}` : "Inspections");

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

    const columns: DataTableColumn<Inspection>[] = [
        {
            key: "date",
            header: "Date",
            sortable: true,
            render: (inspection) => formatDateTime(inspection.date, "datetime"),
        },
        {
            key: "temperature",
            header: "Temperature (°C)",
            sortable: true,
        },
        {
            key: "disease_detected",
            header: "Disease Detected",
            render: (inspection) => inspection.disease_detected || "None",
        },
        {
            key: "notes",
            header: "Notes",
            render: (inspection) => inspection.notes || "-",
        },
        ...(user?.role === "admin"
            ? [
                  {
                      key: "actions" as keyof Inspection,
                      header: "Actions",
                      render: (inspection: Inspection) => (
                          <div className="flex gap-2">
                              <InspectionEditModal
                                  inspection={inspection}
                                  onSuccess={load}
                              />
                              <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(inspection.id)}
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

    if (!hive) return <p>Loading hive data...</p>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">
                🧪 Inspections for {hive.name}
            </h1>
            <p className="mb-4 text-gray-600">
                Location: {hive.location} | Status: {hive.status}
            </p>

            <div className="mb-8 rounded-xl border bg-card p-8 shadow-md">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-primary">New Inspection</span>
                </h2>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col md:flex-row gap-4 items-end mb-2"
                >
                    <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium text-muted-foreground">
                            Date & Time
                        </label>
                        <Input
                            name="date"
                            type="datetime-local"
                            value={form.date.slice(0, 16)}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium text-muted-foreground">
                            Temperature (°C)
                        </label>
                        <Input
                            name="temperature"
                            type="number"
                            placeholder="Temperature"
                            value={form.temperature}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium text-muted-foreground">
                            Disease Detected
                        </label>
                        <DiseaseSelector
                            value={form.disease_detected}
                            onChange={(value) =>
                                handleChange({
                                    target: {
                                        name: "disease_detected",
                                        value,
                                    },
                                } as React.ChangeEvent<HTMLInputElement>)
                            }
                            placeholder="Select or type disease..."
                            compact={true}
                            showTips={false}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium text-muted-foreground">
                            Notes
                        </label>
                        <Input
                            name="notes"
                            placeholder="Notes"
                            value={form.notes}
                            onChange={handleChange}
                        />
                    </div>
                    <Button type="submit" className="h-12 mt-6 md:mt-0">
                        Add Inspection
                    </Button>
                </form>
            </div>

            <DataTable
                data={inspections}
                columns={columns}
                emptyMessage="No inspections found for this hive."
                className="mb-4"
            />
        </div>
    );
}
