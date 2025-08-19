import { Clock, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountSummary {
    pending: number;
    approved: number;
    rejected: number;
    canceled?: number;
}

interface Props {
    summary: CountSummary | null;
    loading?: boolean;
    className?: string;
}

const baseCard =
    "relative overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm p-4 transition-all hover:shadow-md";
const metricNumber = "text-2xl font-semibold tracking-tight";
const label = "mt-1 text-xs font-medium text-gray-500 uppercase tracking-wide";

function LoadingBar() {
    return <div className="h-6 w-12 animate-pulse rounded bg-gray-200" />;
}

export function RoleRequestSummaryCards({
    summary,
    loading,
    className,
}: Props) {
    const total =
        (summary?.pending ?? 0) +
        (summary?.approved ?? 0) +
        (summary?.rejected ?? 0) +
        (summary?.canceled ?? 0);
    return (
        <div
            className={cn(
                "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
                className
            )}
        >
            <div className={cn(baseCard)}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className={label}>Pending</div>
                        <div className={cn(metricNumber, "text-amber-600")}>
                            {loading ? <LoadingBar /> : summary?.pending ?? 0}
                        </div>
                    </div>
                    <Clock className="w-5 h-5 text-amber-500" />
                </div>
            </div>
            <div className={cn(baseCard)}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className={label}>Approved</div>
                        <div className={cn(metricNumber, "text-emerald-600")}>
                            {loading ? <LoadingBar /> : summary?.approved ?? 0}
                        </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
            </div>
            <div className={cn(baseCard)}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className={label}>Rejected</div>
                        <div className={cn(metricNumber, "text-red-600")}>
                            {loading ? <LoadingBar /> : summary?.rejected ?? 0}
                        </div>
                    </div>
                    <XCircle className="w-5 h-5 text-red-500" />
                </div>
            </div>
            <div className={cn(baseCard)}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className={label}>Total</div>
                        <div className={metricNumber}>
                            {loading ? <LoadingBar /> : total}
                        </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </div>
            </div>
        </div>
    );
}
