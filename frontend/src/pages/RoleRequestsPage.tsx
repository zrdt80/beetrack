import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    createRoleRequest,
    listMyRoleRequestsPage,
    getMyRoleRequestSummary,
    getMyRoleRequestNotifications,
} from "@/api/roleRequests";
import type {
    RoleRequestNotification,
    RoleRequestSummary,
    RoleRequest,
} from "@/api/roleRequests";
import { useAuth } from "@/contexts/AuthContext";
import { RoleRequestStatusBadge } from "@/components/roleRequests/StatusBadge";
import { RoleRequestSummaryCards } from "@/components/roleRequests/SummaryCards";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/PaginationControls";
import { formatDateTime } from "@/lib/datetime";
import { toast } from "sonner";

type SortOrder =
    | "created_desc"
    | "created_asc"
    | "decided_desc"
    | "decided_asc";

export default function RoleRequestsPage() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [items, setItems] = useState<RoleRequest[]>([]);
    const [summary, setSummary] = useState<RoleRequestSummary | null>(null);
    const [notifications, setNotifications] = useState<
        RoleRequestNotification[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifError, setNotifError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const [reason, setReason] = useState("");

    const [page, setPage] = useState(1);
    const [size] = useState(20);
    const [pages, setPages] = useState(1);
    const [order, setOrder] = useState<SortOrder>("created_desc");

    const isSyncingFromUrl = useRef(false);
    const isWritingUrl = useRef(false);
    const locationSearchRef = useRef(location.search);
    const lastWrittenSearchRef = useRef<string | null>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const poll = async () => {
            try {
                const rows = await getMyRoleRequestNotifications(1440);
                setNotifications(rows);
                setNotifError(null);
            } catch (e: unknown) {
                const msg =
                    (e as { response?: { data?: { detail?: string } } })
                        ?.response?.data?.detail ||
                    (e instanceof Error ? e.message : String(e));
                setNotifError(msg);
            } finally {
                timer = setTimeout(poll, 45000);
            }
        };
        poll();
        return () => timer && clearTimeout(timer);
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const apiOrder =
                order === "created_desc"
                    ? "-created_at"
                    : order === "created_asc"
                    ? "created_at"
                    : order === "decided_desc"
                    ? "-decided_at"
                    : "decided_at";
            const [pageData, sum] = await Promise.all([
                listMyRoleRequestsPage(page, size, apiOrder),
                getMyRoleRequestSummary(),
            ]);
            setItems(pageData.items);
            setPages(pageData.meta.pages || 1);
            setSummary(sum);
            setError(null);
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : String(e));
            setError(msg);
            toast.error(`Failed to load requests: ${msg}`);
        } finally {
            setLoading(false);
        }
    }, [order, page, size]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (isWritingUrl.current) {
            isWritingUrl.current = false;
            return;
        }
        isSyncingFromUrl.current = true;
        const params = new URLSearchParams(location.search);
        const qPage = parseInt(params.get("page") || "1", 10);
        const qOrder = (params.get("order") || "created_desc") as SortOrder;
        const validPage = Math.max(1, qPage);
        const validOrder: SortOrder = (
            [
                "created_desc",
                "created_asc",
                "decided_desc",
                "decided_asc",
            ].includes(qOrder)
                ? qOrder
                : "created_desc"
        ) as SortOrder;

        if (page !== validPage) setPage(validPage);
        if (order !== validOrder) setOrder(validOrder);
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
        params.set("order", order);
        const newSearch = `?${params.toString()}`;
        if (
            newSearch !== locationSearchRef.current &&
            newSearch !== lastWrittenSearchRef.current
        ) {
            isWritingUrl.current = true;
            lastWrittenSearchRef.current = newSearch;
            navigate({ search: newSearch }, { replace: true });
        }
    }, [page, order, navigate]);

    useEffect(() => {
        locationSearchRef.current = location.search;
    }, [location.search]);

    const onCreate = async () => {
        try {
            setCreating(true);
            await toast.promise(
                createRoleRequest({ to_role: "worker", reason }),
                {
                    loading: "Submitting request...",
                    success: "Role request submitted",
                    error: (e) => {
                        const msg =
                            (
                                e as {
                                    response?: { data?: { detail?: string } };
                                }
                            )?.response?.data?.detail ||
                            (e instanceof Error
                                ? e.message
                                : "Failed to create request");
                        setError(msg);
                        return msg;
                    },
                }
            );
            setReason("");
            setPage(1);
            await load();
        } finally {
            setCreating(false);
        }
    };

    const latest = items[0];

    const userColumns: DataTableColumn<RoleRequest>[] = [
        {
            key: "id",
            header: "ID",
            render: (r) => <span className="text-xs">{r.id}</span>,
            sortable: true,
            headerClassName: "w-16",
        },
        { key: "from_role", header: "From", className: "text-xs" },
        { key: "to_role", header: "To", className: "text-xs" },
        {
            key: "status",
            header: "Status",
            render: (r) => <RoleRequestStatusBadge status={r.status} />,
        },
        {
            key: "created_at",
            header: "Created",
            render: (r) => formatDateTime(r.created_at, "datetime"),
            className: "text-xs whitespace-nowrap",
            sortable: true,
        },
        {
            key: "decided_at",
            header: "Decided",
            render: (r) =>
                r.decided_at ? formatDateTime(r.decided_at, "datetime") : "—",
            className: "text-xs whitespace-nowrap",
            sortable: true,
        },
    ];

    const sortKey = order.startsWith("created")
        ? "created_at"
        : order.startsWith("decided")
        ? "decided_at"
        : undefined;
    const sortOrder = order.endsWith("_asc") ? "asc" : "desc";
    const onSort = (key: string) => {
        if (key === "created_at") {
            setOrder((prev) =>
                prev === "created_desc" ? "created_asc" : "created_desc"
            );
        } else if (key === "decided_at") {
            setOrder((prev) =>
                prev === "decided_desc" ? "decided_asc" : "decided_desc"
            );
        }
    };

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h1 className="text-xl font-semibold tracking-tight">
                    Role Requests
                </h1>
                {notifications.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {notifications.length} update
                        {notifications.length > 1 ? "s" : ""}
                    </span>
                )}
            </div>
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                    {error}
                </div>
            )}
            {notifError && (
                <div className="text-xs text-orange-600">
                    Notification issue: {notifError}
                </div>
            )}

            <RoleRequestSummaryCards
                summary={
                    summary
                        ? {
                              pending: summary.pending,
                              approved: items.filter(
                                  (i) => i.status === "approved"
                              ).length,
                              rejected: items.filter(
                                  (i) => i.status === "rejected"
                              ).length,
                              canceled: items.filter(
                                  (i) => i.status === "canceled"
                              ).length,
                          }
                        : null
                }
                loading={loading}
            />

            {user?.role === "user" && (
                <Card className="shadow-sm">
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <h2 className="text-sm font-medium">
                                Request Worker Role
                            </h2>
                            <p className="text-xs text-slate-500">
                                Explain briefly why you need elevated
                                permissions. Provide concrete recent actions.
                            </p>
                        </div>
                        <Textarea
                            value={reason}
                            onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>
                            ) => setReason(e.target.value)}
                            placeholder="E.g. Handling 20+ inspections weekly and supporting logistics."
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                disabled={creating || !reason.trim()}
                                onClick={onCreate}
                                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm disabled:opacity-50 transition-colors"
                            >
                                Submit Request
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setReason("")}
                                disabled={!reason}
                                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 text-xs transition-colors"
                            >
                                Clear
                            </Button>
                        </div>
                        {latest && latest.status === "pending" && (
                            <p className="text-xs text-slate-500">
                                A pending request already exists (#{latest.id}).
                                You can submit a new one after it's decided.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <DataTable
                        data={items}
                        columns={userColumns}
                        emptyMessage={
                            loading ? "Loading..." : "No requests found."
                        }
                        alternatingRows
                        sortKey={sortKey}
                        sortOrder={sortOrder as "asc" | "desc" | undefined}
                        onSort={onSort}
                    />
                </CardContent>
            </Card>

            <PaginationControls
                className="mt-2"
                page={page}
                pages={pages}
                onChange={setPage}
            />
        </div>
    );
}
