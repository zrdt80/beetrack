import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getHives, deleteHive, type HivePage } from "@/api/hives";
import type { Hive } from "@/api/hives";
import { formatDateTime } from "@/lib/datetime";
import HiveEditModal from "../components/HiveEditModal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import PaginationControls from "@/components/PaginationControls";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";

export default function HivesPage() {
    const [hives, setHives] = useState<Hive[]>([]);
    const [page, setPage] = useState(1);
    const [size] = useState(20);
    const [q, setQ] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const confirm = useConfirm();

    const isSyncingFromUrl = useRef(false);
    const isWritingUrl = useRef(false);
    const locationSearchRef = useRef(location.search);
    const lastWrittenSearchRef = useRef<string | null>(null);

    useDocumentTitle("Hives");

    const load = useCallback(
        (p = page, query = q) => {
            setLoading(true);
            getHives(p, size, query)
                .then((res: HivePage) => {
                    setHives(res.items);
                    setPage(res.meta.page);
                    setPages(res.meta.pages || 1);
                    setError(null);
                })
                .catch(() => {
                    setError("Failed to load hives.");
                })
                .finally(() => setLoading(false));
        },
        [page, q, size]
    );

    useEffect(() => {
        if (user?.role === "user") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

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
        setSearchTerm(qQuery);
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
        setQ(searchTerm);
        load(1, searchTerm);
    };

    const refreshHives = (p: number = page) => {
        load(p, q);
    };

    const columns: DataTableColumn<Hive>[] = [
        {
            key: "name",
            header: "Name",
            sortable: true,
        },
        {
            key: "apiary_name",
            header: "Apiary",
            render: (hive) =>
                hive.apiary_name ? (
                    <Link
                        className="text-blue-600 underline hover:text-blue-800"
                        to={`/dashboard/apiaries/${hive.apiary_id}`}
                    >
                        {hive.apiary_name}
                    </Link>
                ) : (
                    <span className="text-gray-500">N/A</span>
                ),
        },
        {
            key: "status",
            header: "Status",
            sortable: true,
        },
        {
            key: "last_inspection_date",
            header: "Last Inspection",
            render: (hive) => (
                <Link
                    className="text-blue-600 underline hover:text-blue-800"
                    to={`/dashboard/hives/${hive.id}`}
                >
                    {hive.last_inspection_date
                        ? formatDateTime(hive.last_inspection_date, "date")
                        : "N/A"}
                </Link>
            ),
        },
        ...(user?.role === "admin"
            ? [
                  {
                      key: "actions" as keyof Hive,
                      header: "Actions",
                      render: (hive: Hive) => (
                          <div className="flex gap-2">
                              <HiveEditModal
                                  hive={hive}
                                  onSuccess={() => {
                                      toast.success("Hive updated");
                                      refreshHives();
                                  }}
                              />
                              <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                      const ok = await confirm({
                                          title: "Delete hive?",
                                          description: `Are you sure you want to delete ${hive.name}? This cannot be undone.`,
                                          confirmText: "Delete",
                                          destructive: true,
                                      });
                                      if (ok) {
                                          await toast.promise(
                                              deleteHive(hive.id),
                                              {
                                                  loading: "Deleting hive...",
                                                  success: "Hive deleted",
                                                  error: "Failed to delete hive",
                                              }
                                          );
                                          refreshHives();
                                      }
                                  }}
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

    if (loading) return <p>Loading hives...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-2xl font-bold m-0">🐝 Hives</h1>
                <form onSubmit={onSearch} className="flex gap-2">
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="Search by name or apiary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="px-3 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white">
                        Search
                    </button>
                </form>
            </div>

            <DataTable
                data={hives}
                columns={columns}
                emptyMessage="No hives found."
                className="mb-4"
            />
            <PaginationControls
                className="mt-2"
                page={page}
                pages={pages}
                onChange={(p) => {
                    if (p !== page) setPage(p);
                }}
            />
        </div>
    );
}
