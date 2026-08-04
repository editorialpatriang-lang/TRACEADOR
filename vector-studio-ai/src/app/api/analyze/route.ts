import { NextResponse } from "next/server";
import { analyzeImage } from "@/processing/analysis/analyze";
import { ImageAnalysis } from "@/types";

export const runtime = "nodejs";

interface AnalyzeBody {
  rgba: number[];
  width: number;
  height: number;
}

/** POST /api/analyze — devuelve el análisis de imagen (colores, ruido, tipo). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    if (!Array.isArray(body.rgba) || !body.width || !body.height) {
      return NextResponse.json({ error: "Se requieren rgba, width y height" }, { status: 400 });
    }
    const rgba = new Uint8ClampedArray(body.rgba);
    const analysis: ImageAnalysis = analyzeImage(rgba, body.width, body.height);
    return NextResponse.json({ analysis });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
