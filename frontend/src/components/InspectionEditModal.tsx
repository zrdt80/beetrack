import { useState } from "react";
import { updateInspection } from "@/api/inspections";
import { utcIsoToLocalInput, localInputToUtcIso } from "@/lib/datetime";
import type { Inspection, InspectionCreate } from "@/api/inspections";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import DiseaseSelector from "./DiseaseSelector";

export default function InspectionEditModal({
    inspection,
    onSuccess,
}: {
    inspection: Inspection;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<InspectionCreate>({
        date: inspection.date,
        disease_detected: inspection.disease_detected ?? "",
        notes: inspection.notes ?? "",
        temperature: inspection.temperature ?? "",
        hive_id: inspection.hive_id,
    });
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: name === "date" ? localInputToUtcIso(value) : value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        const selected = new Date(form.date);
        if (selected.getTime() > Date.now()) {
            setValidationError("Date cannot be in the future.");
            return;
        }
        try {
            await updateInspection(inspection.id, form);
            setOpen(false);
            onSuccess();
        } catch {
            setError("Update failed.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">Edit</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle className="text-xl font-bold mb-4">
                    Edit Inspection
                </DialogTitle>
                <DialogDescription className="mb-4">
                    Update the details of the inspection.
                </DialogDescription>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="date"
                        type="datetime-local"
                        value={utcIsoToLocalInput(form.date)}
                        max={utcIsoToLocalInput(new Date().toISOString())}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="temperature"
                        type="number"
                        placeholder="Temperature (°C)"
                        value={form.temperature}
                        onChange={handleChange}
                    />
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Disease Detected
                        </label>
                        <DiseaseSelector
                            value={form.disease_detected}
                            onChange={(value) =>
                                handleChange({
                                    target: {
                                        name: "disease_detected",
                                        value,
                                    },
                                } as React.ChangeEvent<HTMLInputElement>)
                            }
                            placeholder="Select or type disease..."
                        />
                    </div>
                    <Input
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Notes"
                    />
                    {validationError && (
                        <p className="text-red-500 text-sm">
                            {validationError}
                        </p>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit">Save</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
