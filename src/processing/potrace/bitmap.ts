import { Point } from "./geometry";

/**
 * Representación binaria/de luminancia de un bitmap usada por el motor Potrace.
 * Port fiel del tipo Bitmap de la implementación de referencia.
 *
 * `data` es un Uint8Array plano de w*h con valores 0..255 (luminancia).
 * `getValueAt` devuelve `undefined` para índices fuera de rango o fraccionarios,
 * replicando exactamente el comportamiento de la implementación de referencia
 * (fuera de los límites se trata como blanco/falso).
 */
export class Bitmap {
  width: number;
  height: number;
  size: number;
  data: Uint8Array;

  constructor(w: number, h: number, data?: Uint8Array) {
    this.width = w;
    this.height = h;
    this.size = w * h;
    this.data = data ?? new Uint8Array(w * h);
  }

  /** Devuelve el valor en (x, y); -1 para fuera de rango (como la referencia). */
  pointToIndex(pointOrX: Point | number, y?: number): number {
    let _x: number;
    let _y: number;
    if (pointOrX instanceof Point) {
      _x = pointOrX.x;
      _y = pointOrX.y as number;
    } else {
      _x = pointOrX;
      _y = y as number;
    }
    if (_x < 0 || _x >= this.width || _y < 0 || _y >= this.height) return -1;
    return this.width * _y + _x;
  }

  indexToPoint(index: number): Point {
    if (index >= 0 && index <= this.size) {
      const y = Math.floor(index / this.width);
      return new Point(index - y * this.width, y);
    }
    return new Point(-1, -1);
  }

  /** Valor en (x,y). Fraccionario o fuera de rango => undefined (tratado como blanco). */
  getValueAt(x: number, y: number): number | undefined {
    const index = typeof x === "number" && typeof y !== "undefined" ? this.pointToIndex(x, y) : (x as number);
    return this.data[index];
  }

  /** Copia con un iterador opcional por píxel (valor, índice). */
  copy(iterator?: (value: number, index: number) => number): Bitmap {
    const bm = new Bitmap(this.width, this.height);
    for (let i = 0; i < this.size; i++) {
      bm.data[i] = iterator ? iterator(this.data[i], i) : this.data[i];
    }
    return bm;
  }
}

/** Convierte RGBA (0..255) a una matriz de luminancia, con fondo blanco bajo transparencia. */
export function rgbaToLuminance(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let p = 0, i = 0; i < rgba.length; p++, i += 4) {
    const opacity = rgba[i + 3] / 255;
    const r = 255 + (rgba[i + 0] - 255) * opacity;
    const g = 255 + (rgba[i + 1] - 255) * opacity;
    const b = 255 + (rgba[i + 2] - 255) * opacity;
    out[p] = Math.round(0.2126 * r + 0.7153 * g + 0.0721 * b);
  }
  return out;
}

/**
 * Umbral automático de Otsu sobre el histograma de luminancia (0..255).
 * Devuelve el umbral que minimiza la varianza intra-clase.
 */
export function otsuThreshold(luminance: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < luminance.length; i++) hist[luminance[i]]++;

  const total = luminance.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}
