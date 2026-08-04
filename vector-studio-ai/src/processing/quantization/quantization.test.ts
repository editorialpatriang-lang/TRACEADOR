import { describe, it, expect } from "vitest";
import { medianCut, applyPalette } from "./medianCut";
import { analyzeImage } from "../analysis/analyze";
import { boxBlur, removeColor, adjustContrast } from "../preprocess/preprocess";
import { rgbToHex } from "@/utils/color";

/** Crea un buffer RGBA plano a partir de una función por píxel. */
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

/** Convierte RGBA a un buffer RGB plano (3 canales) para medainCut/applyPalette. */
function toRgb(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray((rgba.length / 4) * 3);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 3) {
    out[o] = rgba[i];
    out[o + 1] = rgba[i + 1];
    out[o + 2] = rgba[i + 2];
  }
  return out;
}

describe("medianCut", () => {
  it("reduce a la paleta objetivo y cuantiza", () => {
    // Imagen con 3 colores puros
    const img = makeRgba(3, 3, (x) => {
      if (x === 0) return [255, 0, 0, 255];
      if (x === 1) return [0, 255, 0, 255];
      return [0, 0, 255, 255];
    });
    const rgb = toRgb(img);
    const palette = medianCut(rgb, 8);
    const hexes = palette.map((c) => rgbToHex(c.r, c.g, c.b));
    expect(hexes).toContain("#FF0000");
    expect(hexes).toContain("#00FF00");
    expect(hexes).toContain("#0000FF");
    const { quantized } = applyPalette(rgb, palette);
    expect(quantized.length).toBe(rgb.length);
  });
});

describe("analyzeImage", () => {
  it("detecta formato sencillo y calcula métricas", () => {
    const img = makeRgba(20, 20, (x, y) => {
      const border = x === 0 || y === 0 || x === 19 || y === 19;
      return border ? [0, 0, 0, 255] : [255, 255, 255, 255];
    });
    const a = analyzeImage(img, 20, 20);
    expect(a.width).toBe(20);
    expect(a.height).toBe(20);
    expect(a.colorCount).toBeGreaterThanOrEqual(2);
    expect(a.contrast).toBeGreaterThan(0.3);
  });

  it("detecta transparencia", () => {
    const img = makeRgba(10, 10, () => [255, 0, 0, 0]);
    const a = analyzeImage(img, 10, 10);
    expect(a.transparency).toBeGreaterThan(0.9);
    expect(a.hasAlpha).toBe(true);
  });
});

describe("preprocess", () => {
  it("boxBlur no cambia tamaño", () => {
    const img = makeRgba(8, 8, () => [10, 20, 30, 255]);
    const out = boxBlur(img, 8, 8, 1);
    expect(out.length).toBe(img.length);
  });

  it("removeColor transparenta el color objetivo", () => {
    const img = makeRgba(4, 4, () => [255, 255, 255, 255]);
    const out = removeColor(img, { r: 255, g: 255, b: 255 }, 10, false);
    expect(out[3]).toBe(0);
  });

  it("adjustContrast modifica valores", () => {
    const img = makeRgba(4, 4, () => [100, 100, 100, 255]);
    const out = adjustContrast(img, 60, 0);
    expect(out[0]).not.toBe(100);
  });
});
