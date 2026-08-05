/**
 * Carga de imágenes: convierte un File (PNG/JPG/WEBP/BMP/TIFF) en un buffer
 * RGBA con dimensiones, para alimentar el pipeline de vectorización.
 */
export interface LoadedImage {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  name: string;
  mime: string;
}

const MAX_DIMENSION = 2048; // límite para un rendimiento razonable

function decodeViaImageBitmap(file: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return Promise.reject(new Error("createImageBitmap no disponible"));
}

/** Lee un archivo y devuelve RGBA + dimensiones. */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeViaImageBitmap(file);
  } catch {
    // Fallback: <img> + canvas
    bitmap = await loadViaImageElement(file);
  }

  let { width, height } = bitmap;
  // Reducir si excede el límite para mantener el rendimiento
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = new OffscreenCanvas(w, h);
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, w, h);
  const imageData = g.getImageData(0, 0, w, h);

  if ("close" in bitmap) bitmap.close();
  return {
    rgba: imageData.data,
    width: w,
    height: h,
    name: file.name,
    mime: file.type || "image/png",
  };
}

/** Fallback mediante elemento <img> cuando no hay createImageBitmap. */
function loadViaImageElement(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const g = canvas.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const bmp = (canvas as unknown as { transferToImageBitmap(): ImageBitmap }).transferToImageBitmap();
      URL.revokeObjectURL(url);
      resolve(bmp);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo decodificar la imagen"));
    };
    img.src = url;
  });
}

/** Formatea bytes a una unidad legible. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Genera un data URL (PNG) a partir de un buffer RGBA para visualizar el original. */
export function imageToDataUrl(rgba: Uint8ClampedArray, width: number, height: number): string {
  if (typeof document === "undefined" || !("document" in globalThis)) return "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    // Protección: si el buffer fue transferido/desvinculado, devolvemos blanco.
    if (rgba.byteLength === 0) return "";
    const imgData = new ImageData(rgba as unknown as Uint8ClampedArray<ArrayBuffer>, width, height);
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}
