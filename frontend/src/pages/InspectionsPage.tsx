import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getInspections,
    createInspection,
    deleteInspection,
    type InspectionPage,
    type Inspection,
    type InspectionCreate,
} from "@/api/inspections";
import { getHive } from "@/api/hives";
import type { Hive } from "@/api/hives";
import { useAuth } from "@/context/AuthContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
    formatDateTime,
    nowLocalDateTimeInput,
    localInputToUtcIso,
    utcIsoToLocalInput,
} from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InspectionEditModal from "@/components/InspectionEditModal";
import TimezoneDisplay from "@/components/TimezoneDisplay";
import DiseaseSelector from "@/components/DiseaseSelector";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { toast } from "sonner";

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
        date: localInputToUtcIso(nowLocalDateTimeInput()),
        notes: "",
        temperature: 35,
        disease_detected: "",
        hive_id: hiveId,
    });
    const [page, setPage] = useState(1);
    const [size] = useState(20);
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useDocumentTitle(hive ? `Inspections: ${hive.name}` : "Inspections");

    const loadPage = useCallback(
        async (targetPage: number = 1, reset: boolean = false) => {
            if (reset) {
                setPage(1);
                setHasNext(false);
                setInspections([]);
            }
            if (targetPage === 1) setLoading(true);
            else setLoadingMore(true);
            try {
                const target = await getHive(hiveId);
                if (target) setHive(target);
                const inspRes: InspectionPage = await getInspections(
                    hiveId,
                    targetPage,
                    size
                );
                setHasNext(inspRes.meta.has_next);
                setInspections((prev) =>
                    targetPage === 1
                        ? inspRes.items
                        : [...prev, ...inspRes.items]
                );
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [hiveId, size]
    );

    useEffect(() => {
        loadPage(1, true);
    }, [hiveId, loadPage]);

    useEffect(() => {
        if (!hasNext) return;
        if (!sentinelRef.current) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && hasNext && !loadingMore) {
                    const next = page + 1;
                    setPage(next);
                    getInspections(hiveId, next, size).then((inspRes) => {
                        setHasNext(inspRes.meta.has_next);
                        setInspections((prev) => [...prev, ...inspRes.items]);
                    });
                }
            },
            { threshold: 1.0 }
        );
        observerRef.current.observe(sentinelRef.current);
        return () => observerRef.current?.disconnect();
    }, [page, hasNext, loadingMore, hiveId, size]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]:
                name === "temperature"
                    ? Number(value)
                    : name === "date"
                    ? localInputToUtcIso(value)
                    : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        const selected = new Date(form.date);
        if (selected.getTime() > Date.now()) {
            setFormError("Inspection date cannot be in the future.");
            return;
        }
        const createPromise = createInspection({ ...form, hive_id: hiveId });
        toast.promise(createPromise, {
            loading: "Creating inspection...",
            success: "Inspection created",
            error: "Failed to create inspection",
        });
        const created = await createPromise;
        setInspections((prev) => [created, ...prev]);
        loadPage(1, true);
        setForm({
            date: localInputToUtcIso(nowLocalDateTimeInput()),
            temperature: 0,
            disease_detected: "",
            notes: "",
            hive_id: hiveId,
        });
    };

    const handleDelete = async (id: number) => {
        if (confirm("Delete this inspection?")) {
            setInspections((prev) => prev.filter((i) => i.id !== id));
            await toast.promise(deleteInspection(id), {
                loading: "Deleting inspection...",
                success: "Inspection deleted",
                error: "Failed to delete inspection",
            });
            loadPage(1, true);
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
                                  onSuccess={() => {
                                      toast.success("Inspection updated");
                                      loadPage(page);
                                  }}
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
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-primary">New Inspection</span>
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="text-gray-500">Local timezone:</span>
                        <TimezoneDisplay />
                    </div>
                </div>
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
                            value={utcIsoToLocalInput(form.date)}
                            max={utcIsoToLocalInput(new Date().toISOString())}
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
                    {formError && (
                        <div className="text-red-500 text-sm mt-2 w-full md:w-auto">
                            {formError}
                        </div>
                    )}
                </form>
            </div>

            <DataTable
                data={inspections}
                columns={columns}
                emptyMessage={
                    loading
                        ? "Loading inspections..."
                        : "No inspections found for this hive."
                }
                className="mb-4"
            />
            <div
                ref={sentinelRef}
                className="text-center text-sm text-gray-500 py-2"
            >
                {loadingMore && hasNext && "Loading more..."}
                {!loadingMore && hasNext && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const next = page + 1;
                            setPage(next);
                            getInspections(hiveId, next, size).then(
                                (inspRes) => {
                                    setHasNext(inspRes.meta.has_next);
                                    setInspections((prev) => [
                                        ...prev,
                                        ...inspRes.items,
                                    ]);
                                }
                            );
                        }}
                    >
                        Load More
                    </Button>
                )}
                {!hasNext && inspections.length > 0 && "End of results"}
            </div>
        </div>
    );
}
