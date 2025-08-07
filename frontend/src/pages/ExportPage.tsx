import {
    exportOrdersCSV,
    exportOrdersPDF,
    exportInspectionsPDF,
} from "@/api/export";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { useState } from "react";
import {
    Loader2,
    FileDown,
    FileText,
    Package,
    ClipboardList,
} from "lucide-react";

export default function ExportPage() {
    const [loading, setLoading] = useState<
        "orders-csv" | "orders-pdf" | "inspections-pdf" | null
    >(null);

    const download = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportOrdersCSV = async () => {
        setLoading("orders-csv");
        try {
            const blob = await exportOrdersCSV();
            download(blob, "orders.csv");
        } catch (err) {
            alert("Failed to download orders CSV.");
        } finally {
            setLoading(null);
        }
    };

    const handleExportOrdersPDF = async () => {
        setLoading("orders-pdf");
        try {
            const blob = await exportOrdersPDF();
            download(blob, "orders.pdf");
        } catch (err) {
            alert("Failed to download orders PDF.");
        } finally {
            setLoading(null);
        }
    };

    const handleExportInspectionsPDF = async () => {
        setLoading("inspections-pdf");
        try {
            const blob = await exportInspectionsPDF();
            download(blob, "inspections.pdf");
        } catch (err) {
            alert("Failed to download inspections PDF.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">📊 Export Data</h1>
                <p className="text-muted-foreground">
                    Download your business data in various formats for reporting
                    and analysis
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Orders Export Card */}
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-orange-600" />
                            Orders Export
                        </CardTitle>
                        <CardDescription>
                            Export your order data including customer
                            information, products, and sales totals
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
                                {loading === "orders-csv" ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <FileText className="w-4 h-4" />
                                )}
                                Export as CSV
                                <span className="ml-auto text-xs text-muted-foreground">
                                    Spreadsheet format
                                </span>
                            </Button>

                            <Button
                                onClick={handleExportOrdersPDF}
                                disabled={loading !== null}
                                className="w-full flex items-center gap-2"
                            >
                                {loading === "orders-pdf" ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <FileDown className="w-4 h-4" />
                                )}
                                Export as PDF
                                <span className="ml-auto text-xs text-white/80">
                                    Professional report
                                </span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Inspections Export Card */}
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <ClipboardList className="w-6 h-6 text-green-600" />
                            Inspections Export
                        </CardTitle>
                        <CardDescription>
                            Export hive inspection data with health reports,
                            temperatures, and disease tracking
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <Button
                                onClick={handleExportInspectionsPDF}
                                disabled={loading !== null}
                                className="w-full flex items-center gap-2"
                            >
                                {loading === "inspections-pdf" ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <FileDown className="w-4 h-4" />
                                )}
                                Export as PDF
                                <span className="ml-auto text-xs text-white/80">
                                    Detailed report
                                </span>
                            </Button>

                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm text-muted-foreground">
                                    📋 Includes statistics, health summaries,
                                    and detailed inspection records
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tips Section */}
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
                                    • Files are generated in real-time with your
                                    latest data
                                </li>
                                <li>
                                    • All exports are admin-only for security
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
