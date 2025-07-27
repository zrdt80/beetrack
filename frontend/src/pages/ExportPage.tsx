import { exportOrdersCSV, exportInspectionsPDF } from "@/api/export";
import { Button } from "@/components/ui/button";

export default function ExportPage() {
    const download = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportCSV = async () => {
        try {
            const blob = await exportOrdersCSV();
            download(blob, "orders.csv");
        } catch (err) {
            alert("Failed to download CSV.");
        }
    };

    const handleExportPDF = async () => {
        try {
            const blob = await exportInspectionsPDF();
            download(blob, "inspections.pdf");
        } catch (err) {
            alert("Failed to download PDF.");
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">📁 Export Data</h1>
            <div className="space-y-4">
                <Button onClick={handleExportCSV}>
                    📤 Export Orders (CSV)
                </Button>
                <Button onClick={handleExportPDF}>
                    📤 Export Inspections (PDF)
                </Button>
            </div>
        </div>
    );
}
