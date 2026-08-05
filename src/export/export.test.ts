import { describe, it, expect } from "vitest";
import { parsePath, commandsToPolyline } from "@/utils/parsePath";
import { exportEps, exportDxf } from "@/export/vectorExport";
import { generatePdf } from "@/export/pdf";
import { ColorLayer } from "@/types";

const layer: ColorLayer = {
  hex: "#FF0000",
  path: "M 0 0 L 10 0 L 10 10 L 0 10 Z",
  coverage: 1,
  curveCount: 1,
};

describe("parsePath", () => {
  it("parsea M/L/Z", () => {
    const cmds = parsePath("M 0 0 L 10 0 L 10 10 Z");
    expect(cmds[0].op).toBe("M");
    // 2 L explícitos + 1 cierre Z que vuelve al inicio = 3 L
    expect(cmds.filter((c) => c.op === "L").length).toBe(3);
  });

  it("aproxima curvas a polilínea", () => {
    const cmds = parsePath("M 0 0 C 0 10 10 10 10 0 Z");
    const polys = commandsToPolyline(cmds, 8);
    expect(polys.length).toBeGreaterThanOrEqual(1);
    expect(polys[0].length).toBeGreaterThan(4);
  });
});

describe("export", () => {
  it("genera EPS con cabecera PostScript y curvas", () => {
    const curveLayer: ColorLayer = { ...layer, path: "M 0 0 C 0 10 10 10 10 0 Z" };
    const eps = exportEps([curveLayer], 10, 10);
    expect(eps.startsWith("%!PS-Adobe-3.0 EPSF-3.0")).toBe(true);
    expect(eps).toContain("setrgbcolor");
    expect(eps).toContain("moveto");
    expect(eps).toContain("curveto");
  });

  it("genera DXF con entities", () => {
    const dxf = exportDxf([layer], 10, 10);
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("POLYLINE");
    expect(dxf).toContain("EOF");
  });

  it("genera un PDF válido con cabecera y EOF", () => {
    const pdf = generatePdf([layer], 10, 10);
    const str = new TextDecoder().decode(pdf);
    expect(str.startsWith("%PDF-1.4")).toBe(true);
    expect(str).toContain("%%EOF");
    expect(str).toContain("/Type /Catalog");
  });
});
