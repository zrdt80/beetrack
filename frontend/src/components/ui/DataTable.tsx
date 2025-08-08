import type { ReactNode } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown } from "lucide-react";

export interface DataTableColumn<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    render?: (item: T, index: number) => ReactNode;
    className?: string;
    headerClassName?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    sortKey?: string;
    sortOrder?: "asc" | "desc";
    onSort?: (key: string) => void;
    className?: string;
    emptyMessage?: string;
    alternatingRows?: boolean;
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    sortKey,
    sortOrder,
    onSort,
    className = "",
    emptyMessage = "No data available",
    alternatingRows = true,
}: DataTableProps<T>) {
    const handleHeaderClick = (column: DataTableColumn<T>) => {
        if (column.sortable && onSort) {
            onSort(column.key as string);
        }
    };

    const renderCell = (item: T, column: DataTableColumn<T>, index: number) => {
        if (column.render) {
            return column.render(item, index);
        }

        const value = item[column.key as keyof T];
        return value?.toString() || "-";
    };

    if (data.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/20">
                {emptyMessage}
            </div>
        );
    }

    return (
        <Table
            className={`border rounded-lg overflow-hidden shadow-sm ${className}`}
        >
            <TableHeader className="bg-muted">
                <TableRow>
                    {columns.map((column, index) => (
                        <TableHead
                            key={index}
                            className={`
                                border-b
                                ${
                                    column.sortable && onSort
                                        ? "cursor-pointer select-none hover:bg-muted/80"
                                        : ""
                                }
                                ${column.headerClassName || ""}
                            `}
                            onClick={() => handleHeaderClick(column)}
                        >
                            <div className="flex items-center gap-2">
                                {column.header}
                                {column.sortable &&
                                    sortKey === column.key &&
                                    (sortOrder === "asc" ? (
                                        <ArrowUp className="w-4 h-4" />
                                    ) : (
                                        <ArrowDown className="w-4 h-4" />
                                    ))}
                            </div>
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item, index) => (
                    <TableRow
                        key={index}
                        className={`
                            transition-colors hover:bg-muted/60
                            ${
                                alternatingRows
                                    ? index % 2 === 0
                                        ? "bg-muted/40"
                                        : "bg-muted/20"
                                    : "bg-background"
                            }
                        `}
                    >
                        {columns.map((column, colIndex) => (
                            <TableCell
                                key={colIndex}
                                className={`
                                    border-r last:border-r-0
                                    ${column.className || ""}
                                `}
                            >
                                {renderCell(item, column, index)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
