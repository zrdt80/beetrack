import { CheckCircle2, Hourglass, XCircle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatusMeta {
    label: string;
    color: string;
    Icon: LucideIcon;
}

const MAP: Record<string, StatusMeta> = {
    pending: {
        label: "Pending",
        color: "bg-amber-100 text-amber-800 border-amber-200",
        Icon: Hourglass,
    },
    approved: {
        label: "Approved",
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        Icon: CheckCircle2,
    },
    rejected: {
        label: "Rejected",
        color: "bg-red-100 text-red-800 border-red-200",
        Icon: XCircle,
    },
    canceled: {
        label: "Canceled",
        color: "bg-gray-200 text-gray-700 border-gray-300",
        Icon: Ban,
    },
};

export function RoleRequestStatusBadge({
    status,
    className,
}: {
    status: string;
    className?: string;
}) {
    const meta = MAP[status] || {
        label: status,
        color: "bg-slate-100 text-slate-700 border-slate-200",
        Icon: Hourglass,
    };
    const { label, color, Icon } = meta;
    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 px-2 py-0.5 font-medium capitalize",
                color,
                className
            )}
        >
            <Icon className="w-3 h-3" /> {label}
        </Badge>
    );
}
