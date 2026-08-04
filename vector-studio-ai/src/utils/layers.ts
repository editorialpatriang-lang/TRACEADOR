/**
 * Utilidades sobre capas de color: reconstrucción de SVG, métricas y edición
 * (cambiar color, eliminar, fusionar).
 */
import { ColorLayer, TraceResult } from "@/types";

/** Construye el documento SVG a partir de capas y ocultas. */
export function svgFromLayers(layers: ColorLayer[], width: number, height: number, hidden: Set<string>): string {
  const body = layers
    .filter((l) => !hidden.has(l.hex))
    .map((l) => `<path d="${l.path}" fill="${l.hex}" fill-rule="evenodd"/>`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">${body}</svg>`
  );
}

export interface LayerMetrics {
  colorCount: number;
  curveCount: number;
  nodeCount: number;
  svgBytes: number;
}

/** Recalcula métricas a partir de capas visibles. */
export function computeLayerMetrics(layers: ColorLayer[], svg: string): LayerMetrics {
  let curves = 0;
  for (const l of layers) curves += l.curveCount;
  const nodes = layers.reduce((acc, l) => acc + countPathNodes(l.path), 0);
  return {
    colorCount: layers.length,
    curveCount: curves,
    nodeCount: nodes,
    svgBytes: new TextEncoder().encode(svg).length,
  };
}

/** Cuenta puntos de control Bézier (C=2, L=0 o 1) aproximados en un path. */
function countPathNodes(d: string): number {
  const c = (d.match(/C/gi) || []).length;
  const l = (d.match(/L/gi) || []).length;
  return c * 2 + l;
}

/** Reconstruye el resultado completo tras ediciones de capas. */
export function rebuildResult(result: TraceResult, hidden = new Set<string>()): TraceResult {
  const svg = svgFromLayers(result.layers, result.width, result.height, hidden);
  const metrics = {
    colorCount: result.layers.length,
    curveCount: result.layers.reduce((a, l) => a + l.curveCount, 0),
    nodeCount: result.layers.reduce((a, l) => a + countPathNodes(l.path), 0),
    svgBytes: new TextEncoder().encode(svg).length,
    elapsedMs: result.metrics.elapsedMs,
    complexity: result.metrics.complexity,
  };
  return { ...result, svg, metrics };
}

/** Cambia el color hex de una capa (por índice). */
export function recolorLayer(result: TraceResult, index: number, hex: string): TraceResult {
  const layers = result.layers.map((l, i) => (i === index ? { ...l, hex } : l));
  return rebuildResult({ ...result, layers });
}

/** Elimina una capa (por índice). */
export function removeLayer(result: TraceResult, index: number): TraceResult {
  const layers = result.layers.filter((_, i) => i !== index);
  return rebuildResult({ ...result, layers });
}

/** Fusiona dos capas: conserva la dominante y agrega el path de la otra. */
export function mergeLayers(result: TraceResult, keepIndex: number, dropIndex: number): TraceResult {
  if (keepIndex === dropIndex) return result;
  const layers = result.layers.slice();
  layers[keepIndex] = { ...layers[keepIndex], path: `${layers[keepIndex].path} ${layers[dropIndex].path}` };
  layers.splice(dropIndex, 1);
  return rebuildResult({ ...result, layers });
}
