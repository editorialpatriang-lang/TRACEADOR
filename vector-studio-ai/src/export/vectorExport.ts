/**
 * Exportación a múltiples formatos vectoriales (SVG/EPS/DXF) y raster.
 * PDF y AI se apoyan en generatePdf.
 */
import { ColorLayer, ExportFormat, TraceResult } from "@/types";
import { parsePath, commandsToPolyline } from "@/utils/parsePath";
import { generatePdf } from "./pdf";

/** Convierte hex (#RRGGBB) a "r g b" de 0..1. */
function hexRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return `${Math.round(r * 1000) / 1000} ${Math.round(g * 1000) / 1000} ${Math.round(b * 1000) / 1000}`;
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

/* ----------------------------- SVG ----------------------------- */
export function exportSvg(result: TraceResult): Blob {
  return new Blob([result.svg], { type: "image/svg+xml" });
}

/* --------------------------- EPS ------------------------------- */
export function exportEps(layers: ColorLayer[], width: number, height: number): string {
  const parts: string[] = [];
  parts.push("%!PS-Adobe-3.0 EPSF-3.0");
  parts.push(`%%BoundingBox: 0 0 ${fmt(width)} ${fmt(height)}`);
  parts.push("%%Creator: Vector Studio AI");
  parts.push("%%EndComments");
  for (const layer of layers) {
    const commands = parsePath(layer.path);
    parts.push(`${hexRgb(layer.hex)} setrgbcolor`);
    parts.push(epsPath(commands));
    parts.push("fill");
  }
  parts.push("%%EOF");
  return parts.join("\n");
}

function epsPath(commands: ReturnType<typeof parsePath>): string {
  const parts: string[] = ["newpath"];
  for (const c of commands) {
    if (c.op === "M") parts.push(`${fmt(c.args[0])} ${fmt(c.args[1])} moveto`);
    else if (c.op === "L") parts.push(`${fmt(c.args[0])} ${fmt(c.args[1])} lineto`);
    else if (c.op === "C")
      parts.push(`${fmt(c.args[0])} ${fmt(c.args[1])} ${fmt(c.args[2])} ${fmt(c.args[3])} ${fmt(c.args[4])} ${fmt(c.args[5])} curveto`);
  }
  parts.push("closepath");
  return parts.join(" ");
}

/* --------------------------- DXF ------------------------------- */
export function exportDxf(layers: ColorLayer[], width: number, height: number): string {
  const lines: string[] = [];
  lines.push("0", "SECTION", "2", "HEADER", "0", "ENDSEC");
  lines.push("0", "SECTION", "2", "ENTITIES");
  for (const layer of layers) {
    const polys = commandsToPolyline(parsePath(layer.path), 10);
    for (const poly of polys) {
      lines.push("0", "POLYLINE", "8", "0", "66", "1", "70", "1");
      for (const p of poly) {
        lines.push("0", "VERTEX", "8", "0", "70", "32", "10", fmt(p.x), "20", fmt(height - p.y));
      }
      lines.push("0", "SEQEND");
    }
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

/* --------------------------- AI -------------------------------- */
export function exportAi(layers: ColorLayer[], width: number, height: number): Uint8Array {
  const pdf = generatePdf(layers, width, height);
  const header = new TextEncoder().encode(
    `%!PS-Adobe-3.0\n%%Creator: Vector Studio AI\n%%BoundingBox: 0 0 ${fmt(width)} ${fmt(height)}\n` +
      `%%HiResBoundingBox: 0 0 ${fmt(width)} ${fmt(height)}\n%%DocumentData: Clean7Bit\n%%LanguageLevel: 2\n`
  );
  const joined = new Uint8Array(header.length + pdf.length);
  joined.set(header, 0);
  joined.set(pdf, header.length);
  return joined;
}

/* ---------------------- PNG / WEBP raster ---------------------- */
let overlay: HTMLImageElement | null = null;

async function svgToBlob(result: TraceResult, type: "image/png" | "image/webp", scale = 4): Promise<Blob> {
  const url = URL.createObjectURL(exportSvg(result));
  try {
    if (!overlay) overlay = new Image();
    const img = overlay;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("No se pudo rasterizar el SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(result.width * scale));
    canvas.height = Math.max(1, Math.round(result.height * scale));
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type));
    if (!blob) throw new Error("Falló la codificación de la imagen");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Descarga un blob con el nombre dado. */
export function downloadBlob(blob: Blob | Uint8Array, filename: string, mime = "application/octet-stream"): void {
  const data = blob instanceof Blob ? blob : new Blob([blob as BlobPart], { type: mime });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Enrutador principal de exportación. */
export async function exportVector(
  result: TraceResult,
  format: ExportFormat,
  baseName = "vector-studio"
): Promise<void> {
  const { width, height, layers } = result;
  switch (format) {
    case "svg":
      downloadBlob(exportSvg(result), `${baseName}.svg`, "image/svg+xml");
      break;
    case "png":
      downloadBlob(await svgToBlob(result, "image/png"), `${baseName}.png`, "image/png");
      break;
    case "webp":
      downloadBlob(await svgToBlob(result, "image/webp"), `${baseName}.webp`, "image/webp");
      break;
    case "pdf":
      downloadBlob(generatePdf(layers, width, height), `${baseName}.pdf`, "application/pdf");
      break;
    case "eps":
      downloadBlob(new Blob([exportEps(layers, width, height)], { type: "application/postscript" }), `${baseName}.eps`);
      break;
    case "ai":
      downloadBlob(exportAi(layers, width, height), `${baseName}.ai`, "application/pdf");
      break;
    case "dxf":
      downloadBlob(new Blob([exportDxf(layers, width, height)], { type: "application/dxf" }), `${baseName}.dxf`);
      break;
  }
}

export const EXPORT_FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: "svg", label: "SVG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WEBP" },
  { value: "pdf", label: "PDF" },
  { value: "eps", label: "EPS" },
  { value: "ai", label: "AI" },
  { value: "dxf", label: "DXF" },
];

