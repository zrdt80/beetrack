import { useEffect, useState, useRef } from "react";
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

    useEffect(() => {
        if (user?.role === "user") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const refreshHives = (p: number = page) => {
        getHives(p, size).then((res: HivePage) => {
            setHives(res.items);
            setPage(res.meta.page);
            setPages(res.meta.pages || 1);
        });
    };

    useEffect(() => {
        if (isWritingUrl.current) {
            isWritingUrl.current = false;
            return;
        }
        isSyncingFromUrl.current = true;
        const params = new URLSearchParams(location.search);
        const qPage = parseInt(params.get("page") || "1", 10);
        const validPage = Math.max(1, qPage);

        if (page !== validPage) setPage(validPage);
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
        const newSearch = `?${params.toString()}`;
        if (
            newSearch !== locationSearchRef.current &&
            newSearch !== lastWrittenSearchRef.current
        ) {
            isWritingUrl.current = true;
            lastWrittenSearchRef.current = newSearch;
            navigate({ search: newSearch }, { replace: true });
        }
    }, [page, navigate]);

    useEffect(() => {
        locationSearchRef.current = location.search;
    }, [location.search]);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getHives(page, size);
                setHives(res.items);
                setPage(res.meta.page);
                setPages(res.meta.pages || 1);
            } catch {
                setError("Failed to load hives.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [page, size]);

    const columns: DataTableColumn<Hive>[] = [
        {
            key: "name",
            header: "Name",
            sortable: true,
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
            <div className="mb-4">
                <h1 className="text-2xl font-bold">🐝 Hives</h1>
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
