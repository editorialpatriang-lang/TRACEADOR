/**
 * Optimización SVG con SVGO completa, SOLO para el servidor.
 * No se importa en el bundle de cliente ni del worker.
 */
import { optimize } from "svgo";

/** Optimiza un SVG con SVGO (multipass). */
export function optimizeSvgServer(svg: string): string {
  const res = optimize(svg, {
    multipass: true,
    plugins: [
      { name: "preset-default" },
      { name: "removeViewBox", active: false },
      { name: "convertPathData", params: { floatPrecision: 2 } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as unknown as any[],
  });
  return res.data;
}
