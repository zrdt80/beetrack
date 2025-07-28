import { exportOrdersCSV, exportInspectionsPDF } from "@/api/export";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { useState } from "react";
import { Loader2, FileDown, FileText } from "lucide-react";

export default function ExportPage() {
    const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);

    const download = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportCSV = async () => {
        setLoading("csv");
        try {
            const blob = await exportOrdersCSV();
            download(blob, "orders.csv");
        } catch (err) {
            alert("Failed to download CSV.");
        } finally {
            setLoading(null);
        }
    };

    const handleExportPDF = async () => {
        setLoading("pdf");
        try {
            const blob = await exportInspectionsPDF();
            download(blob, "inspections.pdf");
        } catch (err) {
            alert("Failed to download PDF.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileDown className="w-6 h-6 text-primary" />
                        Export Data
                    </CardTitle>
                    <CardDescription>
                        Download your orders and inspections in CSV or PDF
                        format.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={handleExportCSV}
                            disabled={loading !== null}
                            className="flex items-center gap-2"
                            variant="outline"
                        >
                            {loading === "csv" ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                            Export Orders (CSV)
                        </Button>
                        <Button
                            onClick={handleExportPDF}
                            disabled={loading !== null}
                            className="flex items-center gap-2"
                        >
                            {loading === "pdf" ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                                <FileDown className="w-4 h-4" />
                            )}
                            Export Inspections (PDF)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
