import { useCallback, useEffect, useRef, useState } from "react";
import {
    getLogs,
    clearLogs,
    getLogStats,
    type LogCursorPage,
    type Log,
    type LogStats,
} from "@/api/logs";
import { formatDateTime } from "@/lib/datetime";
import TimezoneDisplay from "@/components/TimezoneDisplay";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    Search,
    Trash2,
    FileText,
    Calendar,
    Filter,
} from "lucide-react";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";

type LogLevel = "all" | "success" | "error" | "info" | "warning";

const getLogIcon = (event: string) => {
    const eventLower = event.toLowerCase();
    if (eventLower.includes("failed") || eventLower.includes("error")) {
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (
        eventLower.includes("successful") ||
        eventLower.includes("created") ||
        eventLower.includes("updated")
    ) {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (eventLower.includes("warning") || eventLower.includes("skipped")) {
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    return <Info className="w-4 h-4 text-blue-500" />;
};

const formatTimestamp = (timestamp: string) => {
    return formatDateTime(timestamp, "full");
};

export default function LogsPage() {
    const confirm = useConfirm();
    const [logs, setLogs] = useState<Log[] | null>(null);
    const [cursor, setCursor] = useState<number | undefined>(undefined);
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
    const [dateFilter, setDateFilter] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const observerRef = useRef<IntersectionObserver | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const h = setTimeout(() => setDebouncedQ(search.trim()), 400);
        return () => clearTimeout(h);
    }, [search]);

    useDocumentTitle("System Logs");

    const loadLogs = useCallback(
        async (after?: number, append: boolean = false) => {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            try {
                const data: LogCursorPage = await getLogs(50, after, {
                    q: debouncedQ || undefined,
                    level: levelFilter,
                });
                setHasNext(data.meta.has_next);
                setCursor(data.meta.next_cursor);
                setLogs((prev) =>
                    append && prev ? [...prev, ...data.items] : data.items
                );
                if (!append) {
                    try {
                        const s = await getLogStats();
                        setStats(s);
                    } catch (e) {
                        console.error("Failed to load log stats", e);
                        toast.error("Failed to load log stats");
                    }
                }
            } catch (error) {
                console.error("Failed to load logs:", error);
                toast.error("Failed to load logs");
            } finally {
                if (append) {
                    setLoadingMore(false);
                } else {
                    setLoading(false);
                }
            }
        },
        [debouncedQ, levelFilter]
    );

    useEffect(() => {
        setCursor(undefined);
        loadLogs();
    }, [loadLogs]);

    const handleClearLogs = async () => {
        const ok = await confirm({
            title: "Clear all logs?",
            description:
                "Are you sure you want to clear all logs? This action cannot be undone.",
            confirmText: "Clear",
            destructive: true,
        });
        if (!ok) return;

        try {
            await toast.promise(clearLogs(), {
                loading: "Clearing logs...",
                success: "Logs cleared",
                error: "Failed to clear logs",
            });
            await loadLogs();
        } catch (error) {
            console.error("Failed to clear logs:", error);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const filteredLogs = logs
        ? logs.filter(
              (log) => !dateFilter || log.timestamp.includes(dateFilter)
          )
        : [];

    useEffect(() => {
        if (!sentinelRef.current) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (
                    first.isIntersecting &&
                    hasNext &&
                    !loadingMore &&
                    !loading
                ) {
                    loadLogs(cursor, true);
                }
            },
            {
                root: scrollContainerRef.current,
                rootMargin: "0px",
                threshold: 1.0,
            }
        );
        observerRef.current.observe(sentinelRef.current);
        return () => {
            observerRef.current?.disconnect();
        };
    }, [
        cursor,
        hasNext,
        loadingMore,
        loading,
        debouncedQ,
        levelFilter,
        loadLogs,
    ]);

    const logCounts = stats || {
        total: 0,
        success: 0,
        error: 0,
        warning: 0,
        info: 0,
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        System Logs
                        <TimezoneDisplay className="ml-auto" />
                    </CardTitle>
                    <CardDescription>
                        View and manage system activity logs (times shown in
                        your local timezone)
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-700">
                                {logCounts.total}
                            </div>
                            <div className="text-sm text-gray-500">
                                Total Logs
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {logCounts.success}
                            </div>
                            <div className="text-sm text-gray-500">Success</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {logCounts.error}
                            </div>
                            <div className="text-sm text-gray-500">Errors</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                                {logCounts.warning}
                            </div>
                            <div className="text-sm text-gray-500">
                                Warnings
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {logCounts.info}
                            </div>
                            <div className="text-sm text-gray-500">Info</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col md:flex-row gap-4 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search logs..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select
                                value={levelFilter}
                                onValueChange={(value) =>
                                    setLevelFilter(value as LogLevel)
                                }
                            >
                                <SelectTrigger className="w-48">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filter by level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Levels
                                    </SelectItem>
                                    <SelectItem value="success">
                                        Success
                                    </SelectItem>
                                    <SelectItem value="error">
                                        Errors
                                    </SelectItem>
                                    <SelectItem value="warning">
                                        Warnings
                                    </SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) =>
                                        setDateFilter(e.target.value)
                                    }
                                    className="pl-10 w-48"
                                />
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={handleClearLogs}
                            className="flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All Logs
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>
                            Activity Logs ({filteredLogs.length}
                            {hasNext ? "+" : ""})
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadLogs()}
                        >
                            Refresh
                        </Button>
                    </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                    <div
                        ref={scrollContainerRef}
                        className="max-h-[70vh] overflow-auto"
                    >
                        {loading && !logs ? (
                            <div className="space-y-2 p-6">
                                {[...Array(10)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : filteredLogs.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">
                                            Level
                                        </TableHead>
                                        <TableHead className="w-48">
                                            Timestamp
                                        </TableHead>
                                        <TableHead>Event</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {getLogIcon(log.event)}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {formatTimestamp(log.timestamp)}
                                            </TableCell>
                                            <TableCell className="max-w-0">
                                                <div
                                                    className="truncate"
                                                    title={log.event}
                                                >
                                                    {log.event}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={3}>
                                            <div
                                                ref={sentinelRef}
                                                className="flex justify-center py-2 text-sm text-gray-500"
                                            >
                                                {loadingMore &&
                                                    hasNext &&
                                                    "Loading more..."}
                                                {!hasNext && "End of results"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                {logs === null
                                    ? "Loading logs..."
                                    : "No logs found matching your criteria."}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
