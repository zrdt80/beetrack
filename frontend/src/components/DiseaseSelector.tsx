import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DiseaseSelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    compact?: boolean;
    showTips?: boolean;
}

type SeverityLevel = "none" | "low" | "medium" | "high" | "critical";

interface DiseaseInfo {
    id: string;
    name: string;
    emoji: string;
    severity: SeverityLevel;
}

const COMMON_DISEASES: DiseaseInfo[] = [
    { id: "none", name: "Healthy", emoji: "✅", severity: "none" },
    { id: "varroa", name: "Varroa Mite", emoji: "🕷️", severity: "high" },
    { id: "nosema", name: "Nosema", emoji: "🦠", severity: "medium" },
    {
        id: "american foulbrood",
        name: "American Foulbrood",
        emoji: "☠️",
        severity: "critical",
    },
    {
        id: "european foulbrood",
        name: "European Foulbrood",
        emoji: "🦠",
        severity: "high",
    },
    { id: "chalkbrood", name: "Chalkbrood", emoji: "🤍", severity: "low" },
    { id: "sacbrood", name: "Sacbrood", emoji: "💧", severity: "medium" },
    {
        id: "black queen cell virus",
        name: "Black Queen Cell Virus",
        emoji: "⚫",
        severity: "high",
    },
    {
        id: "deformed wing virus",
        name: "Deformed Wing Virus",
        emoji: "🦋",
        severity: "medium",
    },
    {
        id: "small hive beetle",
        name: "Small Hive Beetle",
        emoji: "🪲",
        severity: "medium",
    },
    { id: "wax moth", name: "Wax Moth", emoji: "🐛", severity: "low" },
];

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
    none: "bg-green-100 text-green-800 border-green-200",
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    high: "bg-red-100 text-red-800 border-red-200",
    critical: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function DiseaseSelector({
    value,
    onChange,
    placeholder = "Select or type disease...",
    compact = false,
    showTips = true,
}: DiseaseSelectorProps) {
    const [customMode, setCustomMode] = useState(false);
    const [customValue, setCustomValue] = useState("");

    useEffect(() => {
        const isCommonDisease = COMMON_DISEASES.some(
            (disease) => disease.id === value.toLowerCase()
        );
        if (!isCommonDisease && value && value.toLowerCase() !== "none") {
            setCustomMode(true);
            setCustomValue(value);
        }
    }, [value]);

    const handleSelectChange = (selectedValue: string) => {
        if (selectedValue === "custom") {
            setCustomMode(true);
            setCustomValue(value);
        } else {
            setCustomMode(false);
            onChange(selectedValue);
        }
    };

    const handleCustomSubmit = () => {
        onChange(customValue);
        setCustomMode(false);
    };

    const handleCustomCancel = () => {
        setCustomMode(false);
        setCustomValue("");
        const isCommonDisease = COMMON_DISEASES.some(
            (disease) => disease.id === value.toLowerCase()
        );
        if (!isCommonDisease) {
            onChange("none");
        }
    };

    const getCurrentDisease = () => {
        return COMMON_DISEASES.find(
            (disease) => disease.id === value.toLowerCase()
        );
    };

    const currentDisease = getCurrentDisease();

    if (customMode) {
        return (
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Enter disease name..."
                        className="flex-1"
                    />
                    <Button
                        type="button"
                        onClick={handleCustomSubmit}
                        variant="outline"
                        size="sm"
                    >
                        ✓
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCustomCancel}
                        variant="outline"
                        size="sm"
                    >
                        ✕
                    </Button>
                </div>
                {showTips && (
                    <p className="text-xs text-muted-foreground">
                        💡 Tip: Choose from common diseases above or enter a
                        custom disease name
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Select value={value || "none"} onValueChange={handleSelectChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder}>
                        {currentDisease && (
                            <div className="flex items-center gap-2">
                                <span>{currentDisease.emoji}</span>
                                <span>{currentDisease.name}</span>
                                <Badge
                                    className={cn(
                                        "text-xs",
                                        SEVERITY_COLORS[currentDisease.severity]
                                    )}
                                >
                                    {currentDisease.severity}
                                </Badge>
                            </div>
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {COMMON_DISEASES.map((disease) => (
                        <SelectItem key={disease.id} value={disease.id}>
                            <div className="flex items-center gap-2 w-full">
                                <span>{disease.emoji}</span>
                                <span className="flex-1">{disease.name}</span>
                                <Badge
                                    className={cn(
                                        "text-xs ml-2",
                                        SEVERITY_COLORS[disease.severity]
                                    )}
                                >
                                    {disease.severity}
                                </Badge>
                            </div>
                        </SelectItem>
                    ))}
                    <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                            <span>✏️</span>
                            <span>Custom disease...</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>

            {!compact && currentDisease && currentDisease.id !== "none" && (
                <div className="p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{currentDisease.emoji}</span>
                        <span className="font-medium">
                            {currentDisease.name}
                        </span>
                        <Badge
                            className={cn(
                                "text-xs",
                                SEVERITY_COLORS[currentDisease.severity]
                            )}
                        >
                            {currentDisease.severity} risk
                        </Badge>
                    </div>
                </div>
            )}

            {showTips && (
                <p className="text-xs text-muted-foreground">
                    💡 Select from common bee diseases or choose "Custom
                    disease" to enter your own
                </p>
            )}
        </div>
    );
}
