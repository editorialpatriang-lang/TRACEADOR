/**
 * Análisis de imagen: extracción de métricas (color, ruido, contraste,
 * transparencia, fondo) sobre un buffer RGBA. Opera muestreando para ser rápido.
 */
import { ImageAnalysis } from "@/types";
import { hexToRgb, rgbToHex, rgbDistance, luminance, colorName, isNearWhite } from "@/utils/color";
import { classifyImage } from "./classify";

const SAMPLE_STEP = 3;

/** Estima el número de colores únicos presentes (muestreo cuantizado). */
function estimateColorCount(rgba: Uint8ClampedArray, w: number, h: number, step: number): number {
  const seen = new Set<number>();
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      const key = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
      seen.add(key);
    }
  }
  return seen.size;
}

/** Construye el histograma muestreado con frecuencia relativa (top 24). */
function colorHistogram(rgba: Uint8ClampedArray, w: number, h: number, step: number) {
  const counts = new Map<number, number>();
  let total = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      const key = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total++;
    }
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  return {
    total,
    list: entries.map(([key, count]) => {
      const r = (key >> 10) << 3;
      const g = ((key >> 5) & 31) << 3;
      const b = (key & 31) << 3;
      const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
      return { hex, ratio: count / total };
    }),
  };
}

/** Estimación de ruido: varianza local de alta frecuencia (0..1). */
function estimateNoise(rgba: Uint8ClampedArray, w: number, h: number, step: number): number {
  let sum = 0;
  let n = 0;
  for (let y = 0; y + 2 < h; y += step) {
    for (let x = 0; x + 2 < w; x += step) {
      const i = (y * w + x) * 4;
      const c = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
      const right = luminance(rgba[i + 4], rgba[i + 5], rgba[i + 6]);
      const down = luminance(rgba[i + w * 4], rgba[i + w * 4 + 1], rgba[i + w * 4 + 2]);
      sum += Math.abs(c - right) + Math.abs(c - down);
      n += 2;
    }
  }
  const avg = n ? sum / n : 0;
  return Math.min(1, avg / 60);
}

/** Contraste: desviación estándar de luminancia normalizada (0..1). */
function estimateContrast(rgba: Uint8ClampedArray, w: number, h: number, step: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const l = luminance(rgba[i], rgba[i + 1], rgba[i + 2]) / 255;
      sum += l;
      sumSq += l * l;
      n++;
    }
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return Math.min(1, Math.sqrt(Math.max(0, variance)));
}

/** Detecta transparencia y existencia de canal alfa. */
function estimateTransparency(rgba: Uint8ClampedArray, w: number, h: number, step: number) {
  let transparent = 0;
  let total = 0;
  let hasAlpha = false;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 255) hasAlpha = true;
      if (rgba[i + 3] < 128) transparent++;
      total++;
    }
  }
  return { transparency: transparent / total, hasAlpha };
}

/** Detecta el color de fondo dominante. */
function detectBackground(hist: { list: { hex: string }[] }) {
  const top = hist.list[0];
  if (top && top.hex) return { type: "solid" as const, color: top.hex };
  return { type: "textured" as const, color: undefined };
}

/** Convierte un buffer RGBA a luminancia (0..255). */
export function luminanceBuffer(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) out[p] = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
  return out;
}

/** Distancia de color media entre píxeles adyacentes (0..441). */
export function averageEdgeContrast(rgba: Uint8ClampedArray, w: number, h: number): number {
  let sum = 0;
  let n = 0;
  for (let y = 1; y < h; y += 2) {
    for (let x = 1; x < w; x += 2) {
      const i = (y * w + x) * 4;
      const up = ((y - 1) * w + x) * 4;
      sum += rgbDistance(
        { r: rgba[i], g: rgba[i + 1], b: rgba[i + 2] },
        { r: rgba[up], g: rgba[up + 1], b: rgba[up + 2] }
      );
      n++;
    }
  }
  return n ? sum / n : 0;
}

/**
 * Analiza un buffer RGBA y devuelve el análisis completo de la imagen.
 */
export function analyzeImage(rgba: Uint8ClampedArray, w: number, h: number): ImageAnalysis {
  const step = Math.max(1, Math.min(SAMPLE_STEP, Math.floor(Math.min(w, h) / 64)));

  const hist = colorHistogram(rgba, w, h, step);
  const unique = estimateColorCount(rgba, w, h, step);
  const noise = estimateNoise(rgba, w, h, step);
  const contrast = estimateContrast(rgba, w, h, step);
  const { transparency, hasAlpha } = estimateTransparency(rgba, w, h, step);
  const bg = detectBackground(hist);

  const dominantColors = hist.list
    .slice(0, 8)
    .map((c) => c.hex.toUpperCase())
    .filter((hex) => {
      const rgb = hexToRgb(hex);
      return !isNearWhite(rgb.r, rgb.g, rgb.b, 30);
    });

  const { kind, confidence } = classifyImage(unique, noise, contrast, transparency, hasAlpha, dominantColors);

  return {
    width: w,
    height: h,
    colorCount: unique,
    colorHistogram: hist.list,
    noise,
    contrast,
    transparency,
    hasAlpha,
    background: bg,
    kind,
    kindConfidence: confidence,
    dominantColors,
  };
}


