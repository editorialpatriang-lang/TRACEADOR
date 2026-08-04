import { NextResponse } from "next/server";
import { vectorize } from "@/processing/pipeline";
import { VectorOptions, DEFAULT_VECTOR_OPTIONS, TraceResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TraceBody {
  rgba: number[];
  width: number;
  height: number;
  options?: Partial<VectorOptions>;
}

/**
 * POST /api/trace
 * Recibe un buffer RGBA (array plano), dimensiones y opciones; devuelve el
 * resultado de la vectorización ejecutada en el servidor (mismo pipeline).
 * Para imágenes grandes se recomienda el trazado en el cliente (Web Worker).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TraceBody;
    if (!Array.isArray(body.rgba) || !body.width || !body.height) {
      return NextResponse.json({ error: "Se requieren rgba, width y height" }, { status: 400 });
    }
    const rgba = new Uint8ClampedArray(body.rgba);
    if (rgba.length !== body.width * body.height * 4) {
      return NextResponse.json({ error: "rgba no coincide con width*height*4" }, { status: 400 });
    }
    const result: TraceResult = vectorize(rgba, body.width, body.height, {
      ...DEFAULT_VECTOR_OPTIONS,
      ...(body.options ?? {}),
    });
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
