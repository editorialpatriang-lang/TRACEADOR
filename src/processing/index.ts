/**
 * Punto de entrada del módulo de procesamiento. Expone el pipeline y utilidades.
 */
export { vectorize } from "./pipeline";
export { traceLuminance, renderPaths, countCurves, countNodes } from "./potrace/potrace";
export type { TraceParams, TracedPath } from "./potrace/potrace";
export { medianCut, applyPalette } from "./quantization/medianCut";
export { analyzeImage } from "./analysis/analyze";
export { medianFilter, removeColor } from "./preprocess/preprocess";
