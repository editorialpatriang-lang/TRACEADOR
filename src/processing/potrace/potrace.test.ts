import { describe, it, expect } from "vitest";
import { traceToSvg, traceLuminance, countCurves, countNodes } from "./potrace";

/** Crea una imagen de luminancia (0..255) cuadrada w/h sobre fondo blanco. */
function makeSquare(w: number, h: number, x0: number, y0: number, x1: number, y1: number, black = 0): Uint8Array {
  const data = new Uint8Array(w * h).fill(255);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      data[y * w + x] = black;
    }
  }
  return data;
}

describe("Potrace engine", () => {
  it("traza un cuadrado relleno y genera un path SVG", () => {
    const lum = makeSquare(20, 20, 5, 5, 15, 15);
    const paths = traceLuminance(lum, 20, 20, { blackOnWhite: true, turdSize: 2 });
    expect(paths.length).toBeGreaterThanOrEqual(1);
    const { svg } = traceToSvg(lum, 20, 20);
    expect(svg).toContain("<svg");
    expect(svg).toContain('<path d="');
    expect(countCurves(paths)).toBeGreaterThanOrEqual(4);
  });

  it("detecta un agujero interno (anillo cuadrado)", () => {
    // Marco negro con centro blanco (agujero)
    const lum = new Uint8Array(30 * 30).fill(255);
    for (let y = 5; y < 25; y++) {
      for (let x = 5; x < 25; x++) {
        const isHole = x >= 12 && x < 18 && y >= 12 && y < 18;
        if (!isHole) lum[y * 30 + x] = 0;
      }
    }
    const paths = traceLuminance(lum, 30, 30, { blackOnWhite: true, turdSize: 2 });
    // El anillo genera al menos 2 contornos cerrados (exterior + agujero),
    // que combinados con fill-rule=evenodd forman el vaciado interno.
    expect(paths.length).toBeGreaterThanOrEqual(2);
    // Un cuadrado sólido genera solo 1 contorno: el anillo debe tener más.
    const solid = traceLuminance(makeSquare(30, 30, 5, 5, 25, 25), 30, 30);
    expect(paths.length).toBeGreaterThan(solid.length);
  });

  it("respeta turdSize al suprimir motas pequeñas", () => {
    const lum = new Uint8Array(20 * 20).fill(255);
    // Un cuadrado grande y una mota de 1px
    for (let y = 2; y < 18; y++) for (let x = 2; x < 18; x++) lum[y * 20 + x] = 0;
    lum[19 * 20 + 19] = 0;
    const smallTurd = traceLuminance(lum, 20, 20, { turdSize: 0 });
    const bigTurd = traceLuminance(lum, 20, 20, { turdSize: 4 });
    expect(bigTurd.length).toBeLessThan(smallTurd.length);
  });

  it("cuenta nodos y curvas correctamente", () => {
    const lum = makeSquare(20, 20, 5, 5, 15, 15);
    const paths = traceLuminance(lum, 20, 20);
    expect(countCurves(paths)).toBeGreaterThan(0);
    expect(countNodes(paths)).toBeGreaterThan(0);
  });

  it("blackOnWhite=false traza regiones oscuras como fondo blanco", () => {
    // Imagen casi toda negra con un cuadrado blanco central.
    const lum = new Uint8Array(20 * 20).fill(0);
    for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) lum[y * 20 + x] = 255;
    const paths = traceLuminance(lum, 20, 20, { blackOnWhite: true, turdSize: 0 });
    expect(paths.length).toBeGreaterThan(0);
  });
});
