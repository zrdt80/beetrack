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

export default function RBACChangesTable() {
    const [items, setItems] = useState<RBACChangeItem[]>([]);
    const [page, setPage] = useState(1);
    const [size] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = async (p = page) => {
        try {
            setLoading(true);
            const res = await getRBACChanges({ page: p, size });
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
        load(1);
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
                                                {new Date(
                                                    it.timestamp
                                                ).toLocaleString()}
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
                                onChange={(p) => load(p)}
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
