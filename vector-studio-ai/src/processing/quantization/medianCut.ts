/**
 * Cuantización de color mediante el algoritmo Median Cut.
 *
 * Reduce una imagen RGBA a una paleta de N colores representativos y produce
 * una imagen cuantizada. Se usa antes del trazado Potrace para lograr capas de
 * color nítidas y separadas (clave para logotipos e ilustraciones).
 */
import { RGB, rgbToHex } from "@/utils/color";

interface ColorBox {
  pixels: number[];
  min: [number, number, number];
  max: [number, number, number];
}

/** Encuentra el canal con mayor rango y su centro. */
function largestChannel(box: ColorBox): { channel: number; center: number; range: number } {
  const ranges = [
    box.max[0] - box.min[0],
    box.max[1] - box.min[1],
    box.max[2] - box.min[2],
  ];
  let channel = 0;
  for (let i = 1; i < 3; i++) if (ranges[i] > ranges[channel]) channel = i;
  return { channel, center: (box.min[channel] + box.max[channel]) / 2, range: ranges[channel] };
}

function makeBox(pixels: number[], data: Uint8ClampedArray | Uint8Array): ColorBox {
  const min: [number, number, number] = [255, 255, 255];
  const max: [number, number, number] = [0, 0, 0];
  for (const p of pixels) {
    const i = p * 3;
    for (let c = 0; c < 3; c++) {
      if (data[i + c] < min[c]) min[c] = data[i + c];
      if (data[i + c] > max[c]) max[c] = data[i + c];
    }
  }
  return { pixels, min, max };
}

/** Promedio de color de una caja. */
function boxAverage(box: ColorBox, data: Uint8ClampedArray | Uint8Array): RGB {
  let r = 0, g = 0, b = 0;
  const n = box.pixels.length || 1;
  for (const p of box.pixels) {
    const i = p * 3;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/**
 * Aplica median cut sobre un buffer RGB plano (sin alfa) de `n` píxeles.
 * @param data RGB plano (longitud = n*3)
 * @param colorCount número objetivo de colores de la paleta
 * @returns paleta de colores RGB ordenada por frecuencia (mayor a menor)
 */
export function medianCut(data: Uint8ClampedArray | Uint8Array, colorCount: number): RGB[] {
  const total = data.length / 3;
  // Índices de píxeles presentes
  const indices: number[] = new Array(total);
  for (let i = 0; i < total; i++) indices[i] = i;

  let boxes: ColorBox[] = [makeBox(indices, data)];

  while (boxes.length < colorCount) {
    // Elegir la caja con mayor rango a dividir
    let best = -1;
    let bestRange = -1;
    let bestChannel = 0;
    let bestCenter = 0;
    for (let b = 0; b < boxes.length; b++) {
      const { channel, center, range } = largestChannel(boxes[b]);
      if (boxes[b].pixels.length > 1 && range > bestRange) {
        best = b;
        bestRange = range;
        bestChannel = channel;
        bestCenter = center;
      }
    }
    if (best === -1) break; // no hay más cajas divisibles

    const box = boxes[best];
    const ch = box.pixels.slice().sort((a, b) => {
      const ia = a * 3 + bestChannel;
      const ib = b * 3 + bestChannel;
      return data[ia] - data[ib];
    });
    const median = Math.floor(ch.length / 2);
    const left = ch.slice(0, median);
    const right = ch.slice(median);
    boxes.splice(best, 1);
    boxes.push(makeBox(left, data), makeBox(right, data));
  }

  // Calcular promedio y frecuencia
  const freqs = boxes
    .map((box) => ({ color: boxAverage(box, data), count: box.pixels.length }))
    .sort((a, b) => b.count - a.count);

  return freqs.map((f) => f.color);
}

/**
 * Asigna cada píxel de un buffer RGB al color de paleta más cercano.
 * Devuelve un buffer RGB cuantizado y el índice de paleta por píxel.
 */
export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: RGB[]): {
  quantized: Uint8ClampedArray;
  indices: Uint8Array;
} {
  const total = data.length / 3;
  const quantized = new Uint8ClampedArray(data.length);
  const indices = new Uint8Array(total);
  const cache = new Map<number, number>();
  for (let p = 0; p < total; p++) {
    const i = p * 3;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let best = cache.get(key);
    if (best === undefined) {
      let minDist = Infinity;
      best = 0;
      for (let k = 0; k < palette.length; k++) {
        const dr = data[i] - palette[k].r;
        const dg = data[i + 1] - palette[k].g;
        const db = data[i + 2] - palette[k].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          best = k;
        }
      }
      cache.set(key, best);
    }
    indices[p] = best;
    quantized[i] = palette[best].r;
    quantized[i + 1] = palette[best].g;
    quantized[i + 2] = palette[best].b;
  }
  return { quantized, indices };
}

/** Paleta a array de hex (para capas y exportación). */
export function paletteToStrings(palette: RGB[]): string[] {
  return palette.map((c) => rgbToHex(c.r, c.g, c.b));
}
