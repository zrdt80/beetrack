import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface RoleRequestFiltersUIProps<F> {
    filters: F;
    onChange: (update: Partial<F>) => void;
    onReset: () => void;
    activeCount: number;
    className?: string;
}

interface AdminFilters {
    statuses?: string[];
    username?: string;
    from_date?: string;
    to_date?: string;
    decided?: boolean;
    order?: string;
}

type DecidedOption = boolean | undefined;

export function AdminFiltersBar({
    filters,
    onChange,
    onReset,
    activeCount,
    className,
}: RoleRequestFiltersUIProps<AdminFilters>) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (activeCount === 0) setOpen(false);
    }, [activeCount]);
    const setDecided = (v: DecidedOption) => onChange({ decided: v });
    const setOrder = (v: string) => onChange({ order: v });
    return (
        <div
            className={cn(
                "border rounded-md p-3 bg-white shadow-xs",
                className
            )}
        >
            <div className="flex flex-wrap gap-2 items-center">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen((o) => !o)}
                    className="flex items-center gap-1"
                >
                    <Filter className="w-4 h-4" />
                    {open ? "Hide Filters" : "Filters"}
                    {activeCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                            {activeCount}
                        </Badge>
                    )}
                </Button>
                {activeCount > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onReset}
                        className="text-xs"
                    >
                        Reset
                    </Button>
                )}
                <div className="ml-auto text-xs text-slate-500">
                    Ordering: {filters.order || "created_desc"}
                </div>
            </div>
            {open && (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Username
                        </label>
                        <Input
                            value={filters.username || ""}
                            onChange={(e) =>
                                onChange({
                                    username: e.target.value || undefined,
                                })
                            }
                            placeholder="Search user"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Statuses
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {[
                                "pending",
                                "approved",
                                "rejected",
                                "canceled",
                            ].map((s) => {
                                const active = filters.statuses?.includes(s);
                                return (
                                    <Button
                                        variant={active ? "default" : "outline"}
                                        size="sm"
                                        key={s}
                                        type="button"
                                        onClick={() => {
                                            const cur = new Set(
                                                filters.statuses || []
                                            );
                                            if (active) cur.delete(s);
                                            else cur.add(s);
                                            const arr = [...cur];
                                            onChange({
                                                statuses: arr.length
                                                    ? arr
                                                    : undefined,
                                            });
                                        }}
                                        className={cn(
                                            "h-7 px-2 py-0 text-xs capitalize",
                                            active
                                                ? "bg-amber-600 hover:bg-amber-600 text-white"
                                                : ""
                                        )}
                                    >
                                        {s}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" /> Date Range
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={filters.from_date || ""}
                                onChange={(e) =>
                                    onChange({
                                        from_date: e.target.value || undefined,
                                    })
                                }
                                className="h-8 text-xs"
                            />
                            <Input
                                type="date"
                                value={filters.to_date || ""}
                                onChange={(e) =>
                                    onChange({
                                        to_date: e.target.value || undefined,
                                    })
                                }
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Decision State
                        </label>
                        <div className="flex gap-1 flex-wrap">
                            {[
                                [undefined, "All"],
                                [false, "Undecided"],
                                [true, "Decided"],
                            ].map(([v, label]) => {
                                const active =
                                    filters.decided === v ||
                                    (v === undefined &&
                                        filters.decided === undefined);
                                return (
                                    <Button
                                        size="sm"
                                        variant={active ? "default" : "outline"}
                                        key={String(v)}
                                        onClick={() =>
                                            setDecided(v as DecidedOption)
                                        }
                                        className={cn(
                                            "h-7 px-2 py-0 text-xs",
                                            active
                                                ? "bg-amber-600 hover:bg-amber-600 text-white"
                                                : ""
                                        )}
                                    >
                                        {label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Ordering
                        </label>
                        <select
                            value={filters.order || "created_desc"}
                            onChange={(e) => setOrder(e.target.value)}
                            className="h-8 text-xs w-full rounded-md border border-input bg-transparent px-2 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="created_desc">Newest first</option>
                            <option value="created_asc">Oldest first</option>
                            <option value="decided_desc">
                                Latest decisions
                            </option>
                            <option value="decided_asc">
                                Oldest decisions
                            </option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
