import { AlertCircle, Clock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: "todo" | "not-implemented" | "static" | "placeholder";
    className?: string;
    showIcon?: boolean;
}

const statusConfig = {
    todo: {
        label: "To Do",
        icon: Clock,
        variant: "secondary" as const,
        color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    },
    "not-implemented": {
        label: "Not Implemented",
        icon: Wrench,
        variant: "outline" as const,
        color: "text-orange-600 bg-orange-50 border-orange-200",
    },
    static: {
        label: "Static Data",
        icon: AlertCircle,
        variant: "outline" as const,
        color: "text-gray-600 bg-gray-50 border-gray-200",
    },
    placeholder: {
        label: "Placeholder",
        icon: AlertCircle,
        variant: "secondary" as const,
        color: "text-blue-600 bg-blue-50 border-blue-200",
    },
};

export default function StatusBadge({
    status,
    className = "",
    showIcon = true,
}: StatusBadgeProps) {
    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
        <Badge
            variant="outline"
            className={`text-xs ${config.color} ${className}`}
        >
            {showIcon && <IconComponent className="w-3 h-3 mr-1" />}
            {config.label}
        </Badge>
    );
}
