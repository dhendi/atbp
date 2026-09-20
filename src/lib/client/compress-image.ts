const MAX_DIMENSION = 1920;
const QUALITY = 0.82;

/**
 * Downscales and re-encodes an image client-side before upload. Raw phone-camera
 * photos routinely run 8-12MB at 4000px+ — far larger than anything the UI ever
 * displays — so this shrinks both what gets stored and, more importantly, what
 * gets re-downloaded on every single product view. Animated GIFs pass through
 * untouched: canvas only captures a single frame, so compressing one would
 * silently kill the animation.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], newName, { type: "image/webp" });
  } catch {
    // Decode failed (corrupt file, unsupported variant, etc.) — upload the
    // original rather than blocking the seller's listing.
    return file;
  }
}
