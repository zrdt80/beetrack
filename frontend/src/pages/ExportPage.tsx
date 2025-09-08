import {
    exportOrdersCSV,
    exportOrdersPDF,
    exportInspectionsPDF,
    exportOrdersFiltered,
    exportInspectionsFiltered,
    exportHivesFiltered,
    exportApiariesFiltered,
    type OrderExportFilter,
    type InspectionExportFilter,
    type HiveExportFilter,
    type ApiaryExportFilter,
} from "@/api/export";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
    Loader2,
    FileDown,
    FileText,
    Package,
    ClipboardList,
    Filter,
    Building,
} from "lucide-react";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getApiaries } from "@/api/apiaries";

interface ApiaryOption {
    id: number;
    name: string;
    location?: string;
}

export default function ExportPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [apiaries, setApiaries] = useState<ApiaryOption[]>([]);

    const [selectedApiaryId, setSelectedApiaryId] = useState<number | null>(
        null
    );
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
    const [dataType, setDataType] = useState<
        "orders" | "inspections" | "hives" | "apiaries"
    >("orders");

    const [hiveStatuses, setHiveStatuses] = useState<string[]>([]);
    const [lastInspectionDays, setLastInspectionDays] = useState<number | "">(
        ""
    );

    useDocumentTitle("Export Data");

    useEffect(() => {
        setStartDate("");
        setEndDate("");
        setSelectedApiaryId(null);
        setHiveStatuses([]);
        setLastInspectionDays("");
    }, [dataType]);

    useEffect(() => {
        const loadApiaries = async () => {
            try {
                const response = await getApiaries(1, 100);
                setApiaries(
                    response.items.map((a) => ({
                        id: a.id,
                        name: a.name,
                        location: a.location || undefined,
                    }))
                );
            } catch (error) {
                console.error("Failed to load apiaries:", error);
                toast.error("Failed to load apiaries");
            }
        };
        loadApiaries();
    }, []);

    const download = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFilteredExport = async () => {
        const loadingKey = `${dataType}-${exportFormat}`;
        setLoading(loadingKey);

        try {
            let blob: Blob;
            let filename: string;

            const userTimezone =
                Intl.DateTimeFormat().resolvedOptions().timeZone;

            const dateFilters =
                dataType === "orders" || dataType === "inspections"
                    ? {
                          start_date: startDate || undefined,
                          end_date: endDate || undefined,
                      }
                    : {};

            switch (dataType) {
                case "orders": {
                    const orderFilters: OrderExportFilter = {
                        format: exportFormat,
                        timezone: userTimezone,
                        ...dateFilters,
                    };
                    blob = await exportOrdersFiltered(orderFilters);
                    filename = `orders_filtered.${exportFormat}`;
                    break;
                }

                case "inspections": {
                    const inspectionFilters: InspectionExportFilter = {
                        apiary_ids: selectedApiaryId
                            ? [selectedApiaryId]
                            : undefined,
                        format: exportFormat,
                        timezone: userTimezone,
                        ...dateFilters,
                    };
                    blob = await exportInspectionsFiltered(inspectionFilters);
                    filename = `inspections_filtered.${exportFormat}`;
                    break;
                }

                case "hives": {
                    const hiveFilters: HiveExportFilter = {
                        apiary_ids: selectedApiaryId
                            ? [selectedApiaryId]
                            : undefined,
                        format: exportFormat,
                        timezone: userTimezone,
                        status_filter:
                            hiveStatuses.length > 0 ? hiveStatuses : undefined,
                        last_inspection_days:
                            lastInspectionDays !== ""
                                ? Number(lastInspectionDays)
                                : undefined,
                    };
                    blob = await exportHivesFiltered(hiveFilters);
                    filename = `hives_filtered.${exportFormat}`;
                    break;
                }

                case "apiaries": {
                    const apiaryFilters: ApiaryExportFilter = {
                        format: exportFormat,
                        include_member_count: true,
                        include_hive_count: true,
                        timezone: userTimezone,
                    };
                    blob = await exportApiariesFiltered(apiaryFilters);
                    filename = `apiaries_filtered.${exportFormat}`;
                    break;
                }

                default:
                    throw new Error("Invalid data type");
            }

            download(blob, filename);
            toast.success(
                `${
                    dataType.charAt(0).toUpperCase() + dataType.slice(1)
                } export completed`
            );
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Export failed. Please try again.");
        } finally {
            setLoading(null);
        }
    };

    const handleExportOrdersCSV = async () => {
        setLoading("orders-csv-legacy");
        try {
            const blob = await exportOrdersCSV();
            download(blob, "orders.csv");
            toast.success("Orders CSV ready");
        } catch {
            toast.error("Failed to generate CSV");
        } finally {
            setLoading(null);
        }
    };

    const handleExportOrdersPDF = async () => {
        setLoading("orders-pdf-legacy");
        try {
            const blob = await exportOrdersPDF();
            download(blob, "orders.pdf");
            toast.success("Orders PDF ready");
        } catch {
            toast.error("Failed to generate PDF");
        } finally {
            setLoading(null);
        }
    };

    const handleExportInspectionsPDF = async () => {
        setLoading("inspections-pdf-legacy");
        try {
            const blob = await exportInspectionsPDF();
            download(blob, "inspections.pdf");
            toast.success("Inspections PDF ready");
        } catch {
            toast.error("Failed to generate PDF");
        } finally {
            setLoading(null);
        }
    };

    const isAdmin = user?.role === "admin";

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">📊 Export Data</h1>
                <p className="text-muted-foreground">
                    {isAdmin
                        ? "Download business data with advanced filtering options"
                        : "Export data from your assigned apiaries with custom filters"}
                </p>
            </div>

            <Card className="mb-8 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Filter className="w-6 h-6 text-blue-600" />
                        Filtered Export
                    </CardTitle>
                    <CardDescription>
                        Choose data type, apply filters, and export in your
                        preferred format
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Data Type
                            </label>
                            <Select
                                value={dataType}
                                onValueChange={(
                                    value:
                                        | "orders"
                                        | "inspections"
                                        | "hives"
                                        | "apiaries"
                                ) => setDataType(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select data type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="orders">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Orders
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="inspections">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="w-4 h-4" />
                                            Inspections
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="hives">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            Hives
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="apiaries">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            Apiaries
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Export Format
                            </label>
                            <Select
                                value={exportFormat}
                                onValueChange={(value: "csv" | "pdf") =>
                                    setExportFormat(value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            CSV (Spreadsheet)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pdf">
                                        <div className="flex items-center gap-2">
                                            <FileDown className="w-4 h-4" />
                                            PDF (Report)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {(dataType === "orders" || dataType === "inspections") && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Start Date
                                </label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        setStartDate(e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    End Date
                                </label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {dataType !== "orders" && (
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Apiary (optional)
                            </label>
                            <Select
                                value={selectedApiaryId?.toString() || "all"}
                                onValueChange={(value) =>
                                    setSelectedApiaryId(
                                        value === "all" ? null : parseInt(value)
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an apiary (leave empty for all)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All accessible apiaries
                                    </SelectItem>
                                    {apiaries.map((apiary) => (
                                        <SelectItem
                                            key={apiary.id}
                                            value={apiary.id.toString()}
                                        >
                                            {apiary.name}{" "}
                                            {apiary.location &&
                                                `(${apiary.location})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {dataType === "hives" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Hive Status Filter
                                </label>
                                <div className="flex gap-4 flex-wrap">
                                    {["active", "inactive", "maintenance"].map(
                                        (status) => (
                                            <label
                                                key={status}
                                                className="flex items-center space-x-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={hiveStatuses.includes(
                                                        status
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setHiveStatuses([
                                                                ...hiveStatuses,
                                                                status,
                                                            ]);
                                                        } else {
                                                            setHiveStatuses(
                                                                hiveStatuses.filter(
                                                                    (s) =>
                                                                        s !==
                                                                        status
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    className="rounded border-gray-300"
                                                />
                                                <span className="text-sm capitalize">
                                                    {status}
                                                </span>
                                            </label>
                                        )
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Not inspected for (days)
                                    <span className="text-xs text-muted-foreground block">
                                        Show hives not inspected for more than X
                                        days
                                    </span>
                                </label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 30"
                                    value={lastInspectionDays}
                                    onChange={(e) =>
                                        setLastInspectionDays(
                                            e.target.value === ""
                                                ? ""
                                                : Number(e.target.value)
                                        )
                                    }
                                    className="max-w-xs"
                                />
                            </div>
                        </div>
                    )}

                    {dataType === "orders" && !isAdmin && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <div className="text-blue-600">ℹ️</div>
                                <div className="text-sm text-blue-800">
                                    <strong>Worker Access:</strong> You can only
                                    export your own orders. Date and format
                                    filters will be applied to your personal
                                    order history.
                                </div>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleFilteredExport}
                        disabled={loading !== null}
                        className="w-full flex items-center gap-2"
                        size="lg"
                    >
                        {loading?.includes(dataType) ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                            <FileDown className="w-4 h-4" />
                        )}
                        Export {dataType === "orders" && !isAdmin ? "My " : ""}
                        {dataType.charAt(0).toUpperCase() +
                            dataType.slice(1)}{" "}
                        as {exportFormat.toUpperCase()}
                    </Button>
                </CardContent>
            </Card>

            {isAdmin && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-orange-600" />
                                Legacy Orders Export
                            </CardTitle>
                            <CardDescription>
                                Quick export of all orders (admin-only, no
                                filtering)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <Button
                                    onClick={handleExportOrdersCSV}
                                    disabled={loading !== null}
                                    className="w-full flex items-center gap-2"
                                    variant="outline"
                                >
                                    {loading === "orders-csv-legacy" ? (
                                        <Loader2 className="animate-spin w-4 h-4" />
                                    ) : (
                                        <FileText className="w-4 h-4" />
                                    )}
                                    Export as CSV
                                </Button>

                                <Button
                                    onClick={handleExportOrdersPDF}
                                    disabled={loading !== null}
                                    className="w-full flex items-center gap-2"
                                >
                                    {loading === "orders-pdf-legacy" ? (
                                        <Loader2 className="animate-spin w-4 h-4" />
                                    ) : (
                                        <FileDown className="w-4 h-4" />
                                    )}
                                    Export as PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <ClipboardList className="w-6 h-6 text-green-600" />
                                Legacy Inspections Export
                            </CardTitle>
                            <CardDescription>
                                Quick export of all inspections (admin-only, no
                                filtering)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleExportInspectionsPDF}
                                disabled={loading !== null}
                                className="w-full flex items-center gap-2"
                            >
                                {loading === "inspections-pdf-legacy" ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <FileDown className="w-4 h-4" />
                                )}
                                Export as PDF
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="mt-8 border-blue-200 bg-blue-50/50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-0.5">💡</div>
                        <div>
                            <h3 className="font-semibold text-blue-900 mb-2">
                                Export Tips
                            </h3>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>
                                    • <strong>CSV files</strong> are perfect for
                                    Excel, Google Sheets, or data analysis
                                </li>
                                <li>
                                    • <strong>PDF reports</strong> include
                                    professional formatting with charts and
                                    statistics
                                </li>
                                <li>
                                    • <strong>Date filtering:</strong> Available
                                    for Orders (order date) and Inspections
                                    (inspection date)
                                </li>
                                <li>
                                    • <strong>Hives filtering:</strong> By
                                    status and inspection recency for
                                    operational insights
                                </li>
                                <li>
                                    • <strong>Timezone:</strong> All dates and
                                    times are shown in your local timezone (
                                    {
                                        Intl.DateTimeFormat().resolvedOptions()
                                            .timeZone
                                    }
                                    )
                                </li>
                                <li>
                                    • Files are generated in real-time with your
                                    latest data
                                </li>
                                <li>
                                    •{" "}
                                    {isAdmin
                                        ? "Use filtered exports for targeted data or legacy exports for complete datasets"
                                        : "You can export data from apiaries you have access to"}
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
