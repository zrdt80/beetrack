import { useEffect, useMemo, useState, useCallback } from "react";
import {
    listRoleRequests,
    decideRoleRequest,
    getRejectionTemplates,
    getDailyStats,
    getAdminSummary,
} from "@/api/roleRequests";
import type {
    RoleRequest,
    RoleRequestFilters,
    RoleRequestDailyEntry,
} from "@/api/roleRequests";
import { RoleRequestStatusBadge } from "@/components/roleRequests/StatusBadge";
import { RoleRequestSummaryCards } from "@/components/roleRequests/SummaryCards";
import { AdminFiltersBar } from "@/components/roleRequests/FiltersBar";
import { RoleRequestDecisionSheet } from "@/components/roleRequests/DecisionSheet";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";

function extractError(e: unknown): string {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
        const maybeResp = e as { response?: { data?: { detail?: string } } };
        if (maybeResp.response?.data?.detail)
            return maybeResp.response.data.detail;
        if (e instanceof Error) return e.message;
    }
    return "Unknown error";
}

export default function RoleRequestsAdminPage() {
    const [page, setPage] = useState(1);
    const [size] = useState(25);
    const [multiStatuses, setMultiStatuses] = useState<string[]>([]);
    const [username, setUsername] = useState("");
    const [order, setOrder] = useState("created_desc");
    const [decided, setDecided] = useState<boolean | undefined>(undefined);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [data, setData] = useState<RoleRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<RoleRequest | null>(null);
    const [summary, setSummary] = useState<{
        pending: number;
        approved: number;
        rejected: number;
        canceled: number;
        total: number;
    } | null>(null);
    const [daily, setDaily] = useState<RoleRequestDailyEntry[]>([]);
    const [decisionLoading, setDecisionLoading] = useState(false);

    const filters: RoleRequestFilters = useMemo(
        () => ({
            statuses: multiStatuses.length ? multiStatuses : undefined,
            username: username || undefined,
            order:
                order === "created_desc"
                    ? "-created_at"
                    : order === "created_asc"
                    ? "created_at"
                    : order === "decided_desc"
                    ? "-decided_at"
                    : order === "decided_asc"
                    ? "decided_at"
                    : undefined,
            decided,
            created_from: fromDate ? fromDate + "T00:00:00Z" : undefined,
            created_to: toDate ? toDate + "T23:59:59Z" : undefined,
        }),
        [multiStatuses, username, order, decided, fromDate, toDate]
    );

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [{ items }, , s, d] = await Promise.all([
                listRoleRequests(page, size, filters),
                getRejectionTemplates(),
                getAdminSummary(),
                getDailyStats(14),
            ]);
            setData(items);
            setSummary(
                s as {
                    pending: number;
                    approved: number;
                    rejected: number;
                    canceled: number;
                    total: number;
                }
            );
            setDaily(d);
        } catch (e) {
            setError(extractError(e));
        } finally {
            setLoading(false);
        }
    }, [page, size, filters]);

    useEffect(() => {
        load();
    }, [load]);

    const activeCount = [
        multiStatuses.length,
        username ? 1 : 0,
        decided !== undefined ? 1 : 0,
        fromDate ? 1 : 0,
        toDate ? 1 : 0,
        order !== "created_desc" ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const resetFilters = () => {
        setMultiStatuses([]);
        setUsername("");
        setDecided(undefined);
        setFromDate("");
        setToDate("");
        setOrder("created_desc");
        setPage(1);
    };

    const approve = async (comment?: string) => {
        if (!selected) return;
        setDecisionLoading(true);
        try {
            await decideRoleRequest(selected.id, {
                approve: true,
                admin_comment: comment,
            });
            await load();
        } catch (e) {
            setError(extractError(e));
        } finally {
            setDecisionLoading(false);
            setSelected(null);
        }
    };
    const reject = async (comment: string) => {
        if (!selected) return;
        setDecisionLoading(true);
        try {
            await decideRoleRequest(selected.id, {
                approve: false,
                admin_comment: comment,
            });
            await load();
        } catch (e) {
            setError(extractError(e));
        } finally {
            setDecisionLoading(false);
            setSelected(null);
        }
    };

    const columns: DataTableColumn<RoleRequest>[] = [
        {
            key: "id",
            header: "ID",
            render: (r) => <span className="font-mono text-xs">#{r.id}</span>,
            sortable: true,
            headerClassName: "w-16",
        },
        { key: "user_id", header: "User", sortable: true },
        { key: "from_role", header: "From", className: "text-xs" },
        { key: "to_role", header: "To", className: "text-xs" },
        {
            key: "status",
            header: "Status",
            render: (r) => <RoleRequestStatusBadge status={r.status} />,
        },
        {
            key: "reason",
            header: "Reason",
            render: (r) => (
                <span title={r.reason} className="truncate block max-w-[200px]">
                    {r.reason}
                </span>
            ),
            className: "max-w-[200px]",
        },
        {
            key: "admin_comment",
            header: "Admin Comment",
            render: (r) => (
                <span
                    title={r.admin_comment || undefined}
                    className="truncate block max-w-[200px]"
                >
                    {r.admin_comment || "—"}
                </span>
            ),
            className: "max-w-[200px]",
        },
        {
            key: "created_at",
            header: "Created",
            render: (r) => new Date(r.created_at).toLocaleString(),
            className: "text-xs whitespace-nowrap",
        },
        {
            key: "decided_at",
            header: "Decided",
            render: (r) =>
                r.decided_at ? new Date(r.decided_at).toLocaleString() : "—",
            className: "text-xs whitespace-nowrap",
        },
        {
            key: "actions",
            header: "Action",
            render: (r) =>
                r.status === "pending" ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(r)}
                        className="h-7 px-2 text-xs"
                    >
                        Review
                    </Button>
                ) : null,
        },
    ];

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h1 className="text-xl font-semibold tracking-tight">
                    Role Requests – Admin
                </h1>
            </div>
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                    {error}
                </div>
            )}
            <RoleRequestSummaryCards summary={summary} loading={loading} />

            <AdminFiltersBar
                filters={{
                    statuses: multiStatuses,
                    username,
                    from_date: fromDate,
                    to_date: toDate,
                    decided,
                    order,
                }}
                onChange={(u) => {
                    if ("statuses" in u && u.statuses !== undefined)
                        setMultiStatuses(u.statuses);
                    if ("username" in u) setUsername(u.username || "");
                    if ("from_date" in u) setFromDate(u.from_date || "");
                    if ("to_date" in u) setToDate(u.to_date || "");
                    if ("decided" in u) setDecided(u.decided);
                    if ("order" in u && u.order) setOrder(u.order);
                    setPage(1);
                }}
                onReset={resetFilters}
                activeCount={activeCount}
            />

            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <DataTable
                        data={data}
                        columns={columns}
                        emptyMessage={
                            loading ? "Loading..." : "No requests found."
                        }
                        className="mb-0"
                        alternatingRows
                    />
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center text-xs">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <span className="text-gray-600">Page {page}</span>
                    <button
                        disabled={data.length < size}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
                <Button
                    onClick={() => load()}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                >
                    Refresh
                </Button>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                    <h2 className="font-medium">Recent Activity (14 days)</h2>
                    <div className="overflow-x-auto">
                        <table className="text-xs min-w-max">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-2 py-1 text-left">
                                        Date
                                    </th>
                                    <th className="px-2 py-1 text-left">
                                        Pending
                                    </th>
                                    <th className="px-2 py-1 text-left">
                                        Approved
                                    </th>
                                    <th className="px-2 py-1 text-left">
                                        Rejected
                                    </th>
                                    <th className="px-2 py-1 text-left">
                                        Canceled
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {daily.map((d) => (
                                    <tr
                                        key={d.date}
                                        className="border-b last:border-0"
                                    >
                                        <td className="px-2 py-1 font-mono">
                                            {d.date}
                                        </td>
                                        <td className="px-2 py-1">
                                            {d.pending}
                                        </td>
                                        <td className="px-2 py-1">
                                            {d.approved}
                                        </td>
                                        <td className="px-2 py-1">
                                            {d.rejected}
                                        </td>
                                        <td className="px-2 py-1">
                                            {d.canceled}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <RoleRequestDecisionSheet
                open={!!selected}
                onOpenChange={(v) => {
                    if (!v) setSelected(null);
                }}
                requestId={selected?.id}
                status={selected?.status}
                username={selected?.user_id?.toString()}
                rationale={selected?.reason}
                onApprove={approve}
                onReject={reject}
                loading={decisionLoading}
            />
        </div>
    );
}
