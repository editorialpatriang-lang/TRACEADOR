import { NextResponse } from "next/server";
import { optimizeSvgServer } from "@/export/svgoServer";

export const runtime = "nodejs";

interface OptimizeBody {
  svg: string;
}

/** POST /api/optimize — optimiza un documento SVG con SVGO en el servidor. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OptimizeBody;
    if (typeof body.svg !== "string" || !body.svg.includes("<svg")) {
      return NextResponse.json({ error: "Se requiere un SVG válido" }, { status: 400 });
    }
    const svg = optimizeSvgServer(body.svg);
    return NextResponse.json({ svg });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
