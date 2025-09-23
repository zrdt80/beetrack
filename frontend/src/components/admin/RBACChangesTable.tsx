import { useEffect, useState } from "react";
import { getRBACChanges, type RBACChangeItem } from "@/api/rbac";
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
import { formatDateTime, localInputToUtcIso } from "@/lib/datetime";

export default function RBACChangesTable() {
    const [items, setItems] = useState<RBACChangeItem[]>([]);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [eventFilter, setEventFilter] = useState<string>("all");
    const [since, setSince] = useState<string>("");
    const [until, setUntil] = useState<string>("");

    const load = async (opts?: {
        page?: number;
        size?: number;
        eventFilter?: string;
        since?: string;
        until?: string;
    }) => {
        try {
            setLoading(true);
            const effectivePage = opts?.page ?? page;
            const effectiveSize = opts?.size ?? size;
            const effectiveEvent = opts?.eventFilter ?? eventFilter;
            const effectiveSinceLocal = opts?.since ?? since;
            const effectiveUntilLocal = opts?.until ?? until;

            const params: {
                page: number;
                size: number;
                event?: string;
                since?: string;
                until?: string;
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
        load({ page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pages = Math.max(1, Math.ceil(total / size));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    RBAC Changes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
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
                            onClick={() => load({ page: 1 })}
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
                                load({
                                    page: 1,
                                    size: 20,
                                    eventFilter: "all",
                                    since: "",
                                    until: "",
                                });
                            }}
                        >
                            Reset
                        </Button>
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
                                onChange={(p) => load({ page: p })}
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
