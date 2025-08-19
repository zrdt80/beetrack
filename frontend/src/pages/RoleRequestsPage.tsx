import { useEffect, useState } from "react";
import {
    createRoleRequest,
    listMyRoleRequests,
    getMyRoleRequestSummary,
    getMyRoleRequestNotifications,
} from "@/api/roleRequests";
import type {
    RoleRequestNotification,
    RoleRequestSummary,
    RoleRequest,
} from "@/api/roleRequests";
import { useAuth } from "@/context/AuthContext";
import { RoleRequestStatusBadge } from "@/components/roleRequests/StatusBadge";
import { RoleRequestSummaryCards } from "@/components/roleRequests/SummaryCards";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";

export default function RoleRequestsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<RoleRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [summary, setSummary] = useState<RoleRequestSummary | null>(null);
    const [creating, setCreating] = useState(false);
    const [notifications, setNotifications] = useState<
        RoleRequestNotification[]
    >([]);
    const [notifError, setNotifError] = useState<string | null>(null);

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

    const load = async () => {
        try {
            setLoading(true);
            const [reqs, sum] = await Promise.all([
                listMyRoleRequests(),
                getMyRoleRequestSummary(),
            ]);
            setItems(reqs);
            setSummary(sum);
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : String(e));
            setError(msg);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);

    const onCreate = async () => {
        try {
            setCreating(true);
            await createRoleRequest({ to_role: "worker", reason });
            setReason("");
            await load();
        } catch (e) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : String(e));
            setError(msg);
        } finally {
            setCreating(false);
        }
    };

    const latest = items[0];

    const userColumns: DataTableColumn<RoleRequest>[] = [
        {
            key: "id",
            header: "ID",
            render: (r) => <span className="font-mono text-xs">#{r.id}</span>,
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
    ];

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
                    />
                </CardContent>
            </Card>
        </div>
    );
}
