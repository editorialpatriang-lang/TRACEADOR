/**
 * Preprocesado de imagen previo al trazado: reducción de ruido,
 * eliminación de fondo, corrección de contraste y artefactos JPG.
 * Todas las funciones operan sobre buffers RGBA y son puras (sin DOM).
 */
import { RGB, rgbDistance } from "@/utils/color";

/** Ajusta contraste (factor >1 sube) y brillo (offset -255..255). */
export function medianFilter(rgba: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const win: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        win.length = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const yy = Math.max(0, Math.min(h - 1, y + dy));
            const xx = Math.max(0, Math.min(w - 1, x + dx));
            win.push(rgba[(yy * w + xx) * 4 + c]);
          }
        }
        win.sort((a, b) => a - b);
        out[o + c] = win[Math.floor(win.length / 2)];
      }
      out[o + 3] = rgba[o + 3];
    }
  }
  return out;
}

/** Ajusta contraste (factor >1 sube) y brillo (offset -255..255). */
export function adjustContrast(rgba: Uint8ClampedArray, contrast: number, brightness = 0): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const c = contrast / 255 + 1; // contraste en [0..2] normalizado
  for (let i = 0; i < rgba.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const v = (rgba[i + k] - 128) * c + 128 + brightness;
      out[i + k] = Math.max(0, Math.min(255, Math.round(v)));
    }
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

/** Elimina un color de fondo específico (por distancia euclidiana RGB). */
export function removeColor(
  rgba: Uint8ClampedArray,
  bg: RGB,
  tolerance = 48,
  antiAlias = true
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const c: RGB = { r: rgba[i], g: rgba[i + 1], b: rgba[i + 2] };
    const d = rgbDistance(c, bg);
    if (d <= tolerance) {
      // Suavizar el alfa según la distancia (antialiasing parcial)
      out[i] = rgba[i];
      out[i + 1] = rgba[i + 1];
      out[i + 2] = rgba[i + 2];
      out[i + 3] = antiAlias ? Math.min(255, Math.round((d / tolerance) * 255)) : 0;
    } else {
      out[i] = rgba[i];
      out[i + 1] = rgba[i + 1];
      out[i + 2] = rgba[i + 2];
      out[i + 3] = rgba[i + 3];
    }
  }
  return out;
}
