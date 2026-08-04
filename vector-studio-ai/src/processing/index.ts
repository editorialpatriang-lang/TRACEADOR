/**
 * Punto de entrada del módulo de procesamiento. Expone el pipeline y utilidades.
 */
export { vectorize } from "./pipeline";
export { traceLuminance, traceToSvg, renderPaths, countCurves, countNodes } from "./potrace/potrace";
export type { TraceParams, TracedPath } from "./potrace/potrace";
export { medianCut, applyPalette, paletteToStrings } from "./quantization/medianCut";
export { analyzeImage } from "./analysis/analyze";
export { medianFilter, boxBlur, removeColor, removeBackgroundFromEdges, adjustContrast, reduceJpegArtifacts } from "./preprocess/preprocess";
