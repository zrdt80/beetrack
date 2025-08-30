import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiaries, type Apiary, type ApiaryPage } from "@/api/apiaries";
import { useAuth } from "@/context/AuthContext";

export default function ApiariesPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<Apiary[]>([]);
    const [page, setPage] = useState(1);
    const [size] = useState(12);
    const [q, setQ] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = (p = page, query = q) => {
        if (!user) return;
        setLoading(true);
        getApiaries(p, size, query)
            .then((res: ApiaryPage) => {
                setItems(res.items);
                setTotalPages(res.meta.pages);
                setError(null);
            })
            .catch(() => setError("Failed to load apiaries."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load(1, q);
    }, [user]);

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        load(1, q);
    };

    if (loading) return <p>Loading apiaries...</p>;
    if (error) return <p className="text-red-600">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6">
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
                <button
                    className="px-3 py-1 rounded-md bg-muted hover:bg-accent border disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => {
                        const np = page - 1;
                        setPage(np);
                        load(np, q);
                    }}
                >
                    Prev
                </button>
                <span className="text-sm text-gray-600">
                    Page {page} / {totalPages}
                </span>
                <button
                    className="px-3 py-1 rounded-md bg-muted hover:bg-accent border disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => {
                        const np = page + 1;
                        setPage(np);
                        load(np, q);
                    }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
