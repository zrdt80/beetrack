import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    getApiaries,
    createApiary,
    type Apiary,
    type ApiaryPage,
    type ApiaryCreate,
} from "@/api/apiaries";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import PaginationControls from "@/components/PaginationControls";

export default function ApiariesPage() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [items, setItems] = useState<Apiary[]>([]);
    const [page, setPage] = useState(1);
    const [size] = useState(12);
    const [q, setQ] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<ApiaryCreate>({
        name: "",
        location: "",
        description: "",
    });

    const isSyncingFromUrl = useRef(false);
    const isWritingUrl = useRef(false);
    const locationSearchRef = useRef(location.search);
    const lastWrittenSearchRef = useRef<string | null>(null);

    const load = useCallback(
        (p = page, query = q) => {
            if (!user) return;
            setLoading(true);
            getApiaries(p, size, query)
                .then((res: ApiaryPage) => {
                    setItems(res.items);
                    setTotalPages(res.meta.pages);
                    setError(null);
                })
                .catch(() => {
                    setError("Failed to load apiaries.");
                    toast.error("Failed to load apiaries");
                })
                .finally(() => setLoading(false));
        },
        [user, page, q, size]
    );

    useEffect(() => {
        if (isWritingUrl.current) {
            isWritingUrl.current = false;
            return;
        }
        isSyncingFromUrl.current = true;
        const params = new URLSearchParams(location.search);
        const qPage = parseInt(params.get("page") || "1", 10);
        const qQuery = params.get("q") || "";
        const validPage = Math.max(1, qPage);

        if (page !== validPage) setPage(validPage);
        if (q !== qQuery) setQ(qQuery);
        queueMicrotask(() => {
            isSyncingFromUrl.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        if (isSyncingFromUrl.current) {
            return;
        }
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (q.trim()) {
            params.set("q", q.trim());
        }
        const newSearch = params.toString() ? `?${params.toString()}` : "";
        if (
            newSearch !== locationSearchRef.current &&
            newSearch !== lastWrittenSearchRef.current
        ) {
            isWritingUrl.current = true;
            lastWrittenSearchRef.current = newSearch;
            navigate({ search: newSearch }, { replace: true });
        }
    }, [page, q, navigate]);

    useEffect(() => {
        locationSearchRef.current = location.search;
    }, [location.search]);

    useEffect(() => {
        load(page, q);
    }, [page, q, load]);

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        load(1, q);
    };

    const onCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setCreating(true);
        const payload: ApiaryCreate = {
            name: form.name.trim(),
            location: form.location?.trim() || undefined,
            description: form.description?.trim() || undefined,
        };
        try {
            const p = createApiary(payload);
            toast.promise(p, {
                loading: "Creating apiary...",
                success: "Apiary created",
                error: (err: unknown) =>
                    err instanceof Error ? err.message : "Failed to create",
            });
            await p;
            setForm({ name: "", location: "", description: "" });
            setPage(1);
            load(1, q);
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <p>Loading apiaries...</p>;
    if (error) return <p className="text-red-600">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold m-0">Apiaries</h1>
                    <form onSubmit={onSearch} className="flex gap-2">
                        <input
                            className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                            placeholder="Search name or location"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <button className="px-3 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white">
                            Search
                        </button>
                    </form>
                </div>

                <form onSubmit={onCreate} className="flex flex-wrap gap-2">
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="Apiary name"
                        value={form.name}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        required
                    />
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="Location (optional)"
                        value={form.location ?? ""}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, location: e.target.value }))
                        }
                    />
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="Description (optional)"
                        value={form.description ?? ""}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                description: e.target.value,
                            }))
                        }
                    />
                    <button
                        type="submit"
                        disabled={creating}
                        className="px-3 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                    >
                        {creating ? "Creating..." : "Create Apiary"}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((a) => (
                    <Link
                        to={`/dashboard/apiaries/${a.id}`}
                        key={a.id}
                        className="rounded-xl border bg-white shadow-sm p-4 hover:shadow-md transition"
                    >
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-sm text-gray-600">
                            {a.location}
                        </div>
                        <div className="text-xs text-gray-500">
                            Owner #{a.owner_id}
                        </div>
                    </Link>
                ))}
            </div>

            <div className="flex items-center justify-center gap-2">
                <PaginationControls
                    page={page}
                    pages={totalPages}
                    onChange={(p) => {
                        if (p !== page) setPage(p);
                    }}
                />
            </div>
        </div>
    );
}
