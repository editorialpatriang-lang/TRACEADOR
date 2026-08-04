/**
 * Preprocesado de imagen previo al trazado: reducción de ruido,
 * eliminación de fondo, corrección de contraste y artefactos JPG.
 * Todas las funciones operan sobre buffers RGBA y son puras (sin DOM).
 */
import { RGB, rgbDistance, isNearWhite } from "@/utils/color";

/** Filtro de caja (blur rápido, O(w*h*k)) aplicado a RGB(A). */
export function boxBlur(rgba: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const size = 2 * radius + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const yy = Math.max(0, Math.min(h - 1, y + dy));
          const xx = Math.max(0, Math.min(w - 1, x + dx));
          const i = (yy * w + xx) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          a += rgba[i + 3];
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r / (size * size);
      out[o + 1] = g / (size * size);
      out[o + 2] = b / (size * size);
      out[o + 3] = a / (size * size);
    }
  }
  return out;
}

/** Filtro de mediana (elimina motas y ruido sal y pimienta). */
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

/**
 * Elimina el fondo conectado a los bordes rellenando desde fuera (flood fill),
 * convirtiendo a transparente los píxeles similares al fondo de borde.
 */
export function removeBackgroundFromEdges(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance = 48
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    stack.push(idx);
  };
  // Bordes
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop() as number;
    const x = idx % w;
    const y = Math.floor(idx / w);
    const i = idx * 4;
    if (out[i + 3] === 0) continue; // ya transparente
    const c: RGB = { r: out[i], g: out[i + 1], b: out[i + 2] };
    // Si es similar al borde ya marcado (o muy blanco), transparentarlo
    if (isNearWhite(c.r, c.g, c.b, tolerance * 2) || c === undefined) {
      out[i + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
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

/**
 * Elimina pequeños artefactos JPG aplicando un blur leve y dectección de ruido
 * de alta frecuencia. Escribe en un copia.
 */
export function reduceJpegArtifacts(rgba: Uint8ClampedArray, w: number, h: number, strength = 1): Uint8ClampedArray {
  if (strength <= 0) return new Uint8ClampedArray(rgba);
  const blurred = boxBlur(rgba, w, h, Math.max(1, Math.round(strength)));
  // Mezcla con el original para no perder nitidez
  const out = new Uint8ClampedArray(rgba.length);
  const t = 0.5;
  for (let i = 0; i < rgba.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      out[i + k] = Math.round(blurred[i + k] * t + rgba[i + k] * (1 - t));
    }
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

/** Nombres de etapas de preprocesado (para la UI). */
export const PREPROCESS_STAGES = [
  "análisis",
  "reducción de ruido",
  "eliminación de fondo",
  "contraste",
  "cuantización",
  "trazado",
  "optimización",
] as const;
