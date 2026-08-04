import { NextResponse } from "next/server";
import {
  medianFilter,
  removeColor,
  adjustContrast,
} from "@/processing/preprocess/preprocess";
import { RGB } from "@/utils/color";

export const runtime = "nodejs";

interface PreprocessBody {
  rgba: number[];
  width: number;
  height: number;
  denoise?: number;
  removeBg?: boolean;
  bgColor?: RGB;
  contrast?: number;
}

/**
 * POST /api/preprocess — aplica preprocesado (ruido, fondo, contraste) y
 * devuelve el buffer RGBA resultante. Ejemplo de backend de procesamiento.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PreprocessBody;
    if (!Array.isArray(body.rgba) || !body.width || !body.height) {
      return NextResponse.json({ error: "Se requieren rgba, width y height" }, { status: 400 });
    }
    let work: Uint8ClampedArray<ArrayBufferLike> = new Uint8ClampedArray(body.rgba) as Uint8ClampedArray<ArrayBufferLike>;
    if (body.denoise && body.denoise > 0) {
      work = medianFilter(work, body.width, body.height, Math.max(1, Math.round(body.denoise / 40))) as Uint8ClampedArray<ArrayBufferLike>;
    }
    if (body.removeBg && body.bgColor) {
      work = removeColor(work, body.bgColor, 48, true) as Uint8ClampedArray<ArrayBufferLike>;
    }
    if (body.contrast) {
      work = adjustContrast(work, body.contrast) as Uint8ClampedArray<ArrayBufferLike>;
    }
    return NextResponse.json({ rgba: Array.from(work) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}

