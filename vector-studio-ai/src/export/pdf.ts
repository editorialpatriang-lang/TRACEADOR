/**
 * Generador de PDF mínimo y válido con rutas vectoriales.
 * También se usa como base del formato Adobe Illustrator (.ai), que es PDF.
 */
import { ColorLayer } from "@/types";
import { parsePath, PathCommand } from "@/utils/parsePath";

interface PdfColor {
  r: number;
  g: number;
  b: number;
}

function hexToPdfColor(hex: string): PdfColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Convierte comandos SVG a operadores PDF, volteando el eje Y. */
function toPdfBody(commands: PathCommand[], height: number): string {
  const parts: string[] = [];
  for (const c of commands) {
    for (let i = 0; i < c.args.length; i += 2) {
      const x = c.args[i];
      const y = height - c.args[i + 1];
      c.args[i] = x;
      c.args[i + 1] = y;
    }
    if (c.op === "M") parts.push(`${fmt(c.args[0])} ${fmt(c.args[1])} m`);
    else if (c.op === "L") parts.push(`${fmt(c.args[0])} ${fmt(c.args[1])} l`);
    else if (c.op === "C") parts.push(`${fmt(c.args[0])} ${fmt(c.args[1])} ${fmt(c.args[2])} ${fmt(c.args[3])} ${fmt(c.args[4])} ${fmt(c.args[5])} c`);
  }
  parts.push("h f");
  return parts.join("\n");
}

/**
 * Genera un documento PDF en Uint8Array.
 */
export function generatePdf(layers: ColorLayer[], width: number, height: number): Uint8Array {
  const blocks: string[] = [];
  blocks.push("%PDF-1.4");
  blocks.push("%\u00e2\u00e3\u00cf\u00d3");

  const content = layers
    .map((layer) => {
      const c = hexToPdfColor(layer.hex);
      const body = toPdfBody(parsePath(layer.path), height);
      return `${fmt(c.r)} ${fmt(c.g)} ${fmt(c.b)} rg\n${body}`;
    })
    .join("\n");

  const objects: string[] = [];
  let offset = 0;
  const offsets: number[] = [];

  const pushObj = (body: string) => {
    offsets.push(offset);
    const s = `${objects.length + 1} 0 obj\n${body}\nendobj\n`;
    blocks.push(s);
    offset += s.length;
  };

  pushObj(`<< /Type /Catalog /Pages 2 0 R >>`);
  pushObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  pushObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(width)} ${fmt(height)}] ` +
      `/Contents 4 0 R /Resources << /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] >> >>`
  );
  pushObj(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xrefOffset = blocks.join("\n").length + 1;
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdf = blocks.join("\n") + "\n" + xref;
  return new TextEncoder().encode(pdf);
}
