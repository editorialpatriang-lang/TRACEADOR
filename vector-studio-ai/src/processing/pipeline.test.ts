import { describe, it, expect } from "vitest";
import { vectorize } from "./pipeline";
import { DEFAULT_VECTOR_OPTIONS } from "@/types";

function makeRgba(w: number, h: number, fn: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b, a] = fn(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

describe("pipeline.vectorize", () => {
  it("produce un SVG con capas de color separadas", () => {
    // Cuadrado rojo sobre fondo blanco
    const img = makeRgba(24, 24, (x, y) => {
      const inSquare = x >= 8 && x < 16 && y >= 8 && y < 16;
      return inSquare ? [220, 20, 20, 255] : [255, 255, 255, 255];
    });
    const result = vectorize(img, 24, 24, { ...DEFAULT_VECTOR_OPTIONS, colorCount: 4, removeBackground: false });
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("<path");
    expect(result.layers.length).toBeGreaterThan(0);
    // Debe existir una capa claramente roja (canal R dominante sobre G/B)
    const redLayer = result.layers.find((l) => {
      const r = parseInt(l.hex.slice(1, 3), 16);
      const g = parseInt(l.hex.slice(3, 5), 16);
      const b = parseInt(l.hex.slice(5, 7), 16);
      return r > 180 && g < 120 && b < 120;
    });
    expect(redLayer).toBeDefined();
    expect(result.metrics.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(["baja", "media", "alta"]).toContain(result.metrics.complexity);
    expect(result.analysis.width).toBe(24);
  });

  it("respeta la eliminación de fondo", () => {
    const img = makeRgba(16, 16, (x, y) => {
      const inSquare = x >= 4 && x < 12 && y >= 4 && y < 12;
      return inSquare ? [10, 120, 200, 255] : [255, 255, 255, 255];
    });
    const result = vectorize(img, 16, 16, { ...DEFAULT_VECTOR_OPTIONS, colorCount: 3, removeBackground: true });
    // El fondo blanco no debería ser una capa dominante
    const whiteLayer = result.layers.find((l) => l.hex === "#FFFFFF");
    expect(whiteLayer).toBeUndefined();
  });

  it("agrupa colores similares", () => {
    const img = makeRgba(20, 20, () => [250, 252, 255, 255]);
    const grouped = vectorize(img, 20, 20, { colorCount: 8, groupSimilar: true, removeBackground: false });
    const nongrouped = vectorize(img, 20, 20, { colorCount: 8, groupSimilar: false, removeBackground: false });
    expect(grouped.layers.length).toBeLessThanOrEqual(nongrouped.layers.length);
  });
});
