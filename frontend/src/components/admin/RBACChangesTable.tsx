import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    getRBACChanges,
    exportRBACChangesCSV,
    type RBACChangeItem,
} from "@/api/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import PaginationControls from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    formatDateTime,
    localInputToUtcIso,
    utcIsoToLocalInput,
} from "@/lib/datetime";
import { toast } from "sonner";

export default function RBACChangesTable() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState<RBACChangeItem[]>([]);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [eventFilter, setEventFilter] = useState<string>("all");
    const [since, setSince] = useState<string>("");
    const [until, setUntil] = useState<string>("");
    const [actorId, setActorId] = useState<string>("");
    const [userId, setUserId] = useState<string>("");
    const [exportScope, setExportScope] = useState<"all" | "page">("all");

    const load = async (opts?: {
        page?: number;
        size?: number;
        eventFilter?: string;
        since?: string;
        until?: string;
        actorId?: string;
        userId?: string;
    }) => {
        try {
            setLoading(true);
            const effectivePage = opts?.page ?? page;
            const effectiveSize = opts?.size ?? size;
            const effectiveEvent = opts?.eventFilter ?? eventFilter;
            const effectiveSinceLocal = opts?.since ?? since;
            const effectiveUntilLocal = opts?.until ?? until;
            const effectiveActorId = opts?.actorId ?? actorId;
            const effectiveUserId = opts?.userId ?? userId;

            const params: {
                page: number;
                size: number;
                event?: string;
                since?: string;
                until?: string;
                actor_id?: number;
                user_id?: number;
            } = { page: effectivePage, size: effectiveSize };

            if (effectiveEvent && effectiveEvent !== "all")
                params.event = effectiveEvent;

            const sinceIso = effectiveSinceLocal
                ? localInputToUtcIso(effectiveSinceLocal)
                : undefined;
            const untilIso = effectiveUntilLocal
                ? localInputToUtcIso(effectiveUntilLocal)
                : undefined;
            if (sinceIso) params.since = sinceIso;
            if (untilIso) params.until = untilIso;
            const actorNum = effectiveActorId
                ? parseInt(effectiveActorId)
                : NaN;
            const userNum = effectiveUserId ? parseInt(effectiveUserId) : NaN;
            if (Number.isFinite(actorNum)) params.actor_id = actorNum;
            if (Number.isFinite(userNum)) params.user_id = userNum;
            const res = await getRBACChanges(params);
            setItems(res.items);
            setTotal(res.total);
            setPage(res.page);
        } catch (e) {
            console.error("Failed to load RBAC changes", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const eventQ = searchParams.get("event") ?? "all";
        const sizeQ = parseInt(searchParams.get("size") || "20");
        const pageQ = parseInt(searchParams.get("page") || "1");
        const sinceIso = searchParams.get("since");
        const untilIso = searchParams.get("until");
        const actorQ = searchParams.get("actor_id");
        const userQ = searchParams.get("user_id");

        const initEvent = eventQ || "all";
        const initSize = Number.isFinite(sizeQ) && sizeQ > 0 ? sizeQ : 20;
        const initPage = Number.isFinite(pageQ) && pageQ > 0 ? pageQ : 1;
        const initSince = sinceIso ? utcIsoToLocalInput(sinceIso) : "";
        const initUntil = untilIso ? utcIsoToLocalInput(untilIso) : "";
        const initActor = actorQ && /^[0-9]+$/.test(actorQ) ? actorQ : "";
        const initUser = userQ && /^[0-9]+$/.test(userQ) ? userQ : "";

        setEventFilter(initEvent);
        setSince(initSince);
        setUntil(initUntil);
        setSize(initSize);
        setActorId(initActor);
        setUserId(initUser);
        load({
            page: initPage,
            size: initSize,
            eventFilter: initEvent,
            since: initSince,
            until: initUntil,
            actorId: initActor,
            userId: initUser,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pages = Math.max(1, Math.ceil(total / size));

    const handleExport = async () => {
        try {
            setExporting(true);
            const params: {
                event?: string;
                since?: string;
                until?: string;
                actor_id?: number;
                user_id?: number;
                page?: number;
                size?: number;
            } = {};
            if (eventFilter && eventFilter !== "all")
                params.event = eventFilter;
            if (since) params.since = localInputToUtcIso(since);
            if (until) params.until = localInputToUtcIso(until);
            if (actorId) params.actor_id = parseInt(actorId);
            if (userId) params.user_id = parseInt(userId);
            if (exportScope === "page") {
                params.page = page;
                params.size = size;
            }

            const blob = await exportRBACChangesCSV(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `rbac_changes_${date}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(
                exportScope === "page"
                    ? "Exported current page as CSV"
                    : "Exported all filtered results as CSV"
            );
        } catch (e) {
            console.error("Failed to export RBAC changes", e);
            toast.error("Failed to export RBAC changes");
        } finally {
            setExporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    RBAC Changes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-600">Event</label>
                        <Select
                            value={eventFilter}
                            onValueChange={setEventFilter}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="All events" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="RBAC_ROLE_CREATED">
                                    Role Created
                                </SelectItem>
                                <SelectItem value="RBAC_ROLE_UPDATED">
                                    Role Updated
                                </SelectItem>
                                <SelectItem value="RBAC_ROLE_DELETED">
                                    Role Deleted
                                </SelectItem>
                                <SelectItem value="RBAC_ROLE_ASSIGNED">
                                    Role Assigned
                                </SelectItem>
                                <SelectItem value="RBAC_ROLE_REMOVED">
                                    Role Removed
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-600">
                            Actor ID
                        </label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 12"
                            value={actorId}
                            onChange={(e) =>
                                setActorId(
                                    e.target.value.replace(/[^0-9]/g, "")
                                )
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-600">User ID</label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 34"
                            value={userId}
                            onChange={(e) =>
                                setUserId(e.target.value.replace(/[^0-9]/g, ""))
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-600">Since</label>
                        <Input
                            type="datetime-local"
                            value={since}
                            onChange={(e) => setSince(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-600">Until</label>
                        <Input
                            type="datetime-local"
                            value={until}
                            onChange={(e) => setUntil(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-600">
                            Page size
                        </label>
                        <Select
                            value={String(size)}
                            onValueChange={(v) => setSize(parseInt(v))}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-4 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const params: Record<string, string> = {};
                                if (eventFilter && eventFilter !== "all")
                                    params.event = eventFilter;
                                if (since)
                                    params.since = localInputToUtcIso(since);
                                if (until)
                                    params.until = localInputToUtcIso(until);
                                if (size !== 20) params.size = String(size);
                                if (actorId) params.actor_id = actorId;
                                if (userId) params.user_id = userId;
                                params.page = "1";
                                setSearchParams(params, { replace: true });
                                load({ page: 1 });
                            }}
                        >
                            Apply
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                                setEventFilter("all");
                                setSince("");
                                setUntil("");
                                setSize(20);
                                setActorId("");
                                setUserId("");
                                setSearchParams({}, { replace: true });
                                load({
                                    page: 1,
                                    size: 20,
                                    eventFilter: "all",
                                    since: "",
                                    until: "",
                                    actorId: "",
                                    userId: "",
                                });
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            disabled={exporting}
                            onClick={handleExport}
                        >
                            {exporting ? "Exporting..." : "Export CSV"}
                        </Button>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">
                                Scope
                            </label>
                            <Select
                                value={exportScope}
                                onValueChange={(v) =>
                                    setExportScope(v as "all" | "page")
                                }
                            >
                                <SelectTrigger className="h-9 w-[160px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Export all filtered
                                    </SelectItem>
                                    <SelectItem value="page">
                                        Export current page
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="text-right">
                                            Timestamp
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((it) => (
                                        <TableRow key={it.id}>
                                            <TableCell className="font-medium">
                                                {it.username}
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {it.action}
                                            </TableCell>
                                            <TableCell>{it.details}</TableCell>
                                            <TableCell className="text-right text-gray-600">
                                                {formatDateTime(
                                                    it.timestamp,
                                                    "datetime"
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-center text-sm text-gray-500"
                                            >
                                                No RBAC changes found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
                            <PaginationControls
                                page={page}
                                pages={pages}
                                onChange={(p) => {
                                    const params: Record<string, string> = {};
                                    if (eventFilter && eventFilter !== "all")
                                        params.event = eventFilter;
                                    if (since)
                                        params.since =
                                            localInputToUtcIso(since);
                                    if (until)
                                        params.until =
                                            localInputToUtcIso(until);
                                    if (size !== 20) params.size = String(size);
                                    if (actorId) params.actor_id = actorId;
                                    if (userId) params.user_id = userId;
                                    params.page = String(p);
                                    setSearchParams(params, { replace: true });
                                    load({ page: p });
                                }}
                            />
                            <div className="text-xs text-gray-600 sm:ml-2 whitespace-nowrap self-start sm:self-auto">
                                {total.toLocaleString()} total
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
