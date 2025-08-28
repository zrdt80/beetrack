import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { getCroppedImageBlob } from "@/lib/image";

export type AvatarCropperProps = {
    file: File;
    onCancel: () => void;
    onCropped: (blob: Blob) => void;
};

export default function AvatarCropper({
    file,
    onCancel,
    onCropped,
}: AvatarCropperProps) {
    const [zoom, setZoom] = useState(1);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null
    );
    const [processing, setProcessing] = useState(false);

    const url = useMemo(() => URL.createObjectURL(file), [file]);

    const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImageBlob(
                url,
                croppedAreaPixels,
                "image/webp",
                0.9
            );
            onCropped(blob);
        } finally {
            setProcessing(false);
        }
    }, [croppedAreaPixels, onCropped, url]);

    return (
        <div className="space-y-4">
            <div className="relative h-64 w-full bg-black/5 rounded-md overflow-hidden">
                <Cropper
                    image={url}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape="round"
                    showGrid={false}
                />
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground min-w-10">
                    Zoom
                </span>
                <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(v) => setZoom(v[0])}
                    className="flex-1"
                />
            </div>
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={processing}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={processing}
                >
                    {processing ? "Processing…" : "Use Avatar"}
                </Button>
            </div>
        </div>
    );
}
