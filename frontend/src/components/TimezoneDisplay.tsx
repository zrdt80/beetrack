import { Clock } from "lucide-react";
import { getUserTimezone } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";

interface TimezoneDisplayProps {
    className?: string;
    showIcon?: boolean;
}

export default function TimezoneDisplay({
    className = "",
    showIcon = true,
}: TimezoneDisplayProps) {
    const timezone = getUserTimezone();

    return (
        <Badge
            variant="outline"
            className={`text-xs text-gray-600 bg-gray-50 ${className}`}
        >
            {showIcon && <Clock className="w-3 h-3 mr-1" />}
            {timezone}
        </Badge>
    );
}
