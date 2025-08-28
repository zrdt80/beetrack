export type Area = { x: number; y: number; width: number; height: number };

function createImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.crossOrigin = "anonymous";
        img.src = src;
    });
}

export async function getCroppedImageBlob(
    imageSrc: string,
    cropArea: Area,
    outputType: "image/webp" | "image/jpeg" | "image/png" = "image/webp",
    quality: number = 0.9
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const size = Math.min(cropArea.width, cropArea.height);
    canvas.width = size;
    canvas.height = size;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(image, cropArea.x, cropArea.y, size, size, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob)
                    return reject(new Error("Failed to create image blob"));
                resolve(blob);
            },
            outputType,
            quality
        );
    });
}
