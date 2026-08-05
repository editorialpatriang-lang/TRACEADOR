/**
 * Utilidades de color: conversión entre espacios, distancia perceptual
 * y operaciones de histograma. Independientes del DOM, aptas para workers.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** Luminancia perceptual (0..255). */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7153 * g + 0.0721 * b;
}

/** Distancia euclidiana en RGB (0..441). */
export function rgbDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Distancia de color perceptual (ΔE, CIE76 simplificado en RGB normalizado).
 * ~12 puntos suelen distinguir colores claramente.
 */
export function deltaE(a: RGB, b: RGB): number {
  const dr = (a.r - b.r) / 255;
  const dg = (a.g - b.g) / 255;
  const db = (a.b - b.b) / 255;
  return Math.sqrt(dr * dr * 0.5 + dg * dg + db * db * 0.4);
}

/** Cercanía de un color al blanco (0 = exacto, mayor = más lejano). */
export function isNearWhite(r: number, g: number, b: number, tol = 40): boolean {
  return rgbDistance({ r, g, b }, { r: 255, g: 255, b: 255 }) < tol;
}

/** ¿Qué tan "gris" es el color (baja saturación)? 0..1. */
export function grayscaleAmount(r: number, g: number, b: number): number {
  return 1 - Math.max(r, g, b) + Math.min(r, g, b) / 510; // aproximación rápida
}

/** Nombre genérico del color (para UI y clasificación). */
export function colorName(rgb: RGB): string {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (l < 0.12) return "negro";
  if (l > 0.88) return "blanco";
  if (s < 0.12) return l < 0.5 ? "gris oscuro" : "gris claro";
  if (h < 15 || h >= 345) return "rojo";
  if (h < 45) return "naranja";
  if (h < 70) return "amarillo";
  if (h < 160) return "verde";
  if (h < 200) return "cian";
  if (h < 255) return "azul";
  if (h < 290) return "violeta";
  return "magenta";
}

/** Serializa un array de colores hex a su forma compacta (para métricas). */
export function paletteToHex(palette: RGB[]): string[] {
  return palette.map((c) => rgbToHex(c.r, c.g, c.b));
}
