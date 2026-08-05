/**
 * Pipeline de vectorización completo.
 * Orquesta: análisis -> preprocesado -> cuantización -> trazado Potrace por
 * color -> capas -> optimización SVG -> métricas. Función pura (sin DOM) para
 * correr en worker y en Node.
 */
import { VectorOptions, DEFAULT_VECTOR_OPTIONS, TraceResult, ImageAnalysis, TraceProgress } from "@/types";
import { RGB, rgbDistance } from "@/utils/color";
import { medianCut } from "./quantization/medianCut";
import { traceLuminance, renderPaths, countCurves, countNodes, TraceParams, TracedPath } from "./potrace/potrace";
import { medianFilter, removeColor } from "./preprocess/preprocess";
import { analyzeImage } from "./analysis/analyze";
import { optimizeSvg } from "@/utils/svg";

type ProgressFn = (p: TraceProgress) => void;

/** Traza los píxeles de un índice de paleta como una forma negra aislada. */
function traceMask(alphaIndex: Uint8Array, colorIndex: number, w: number, h: number, params: TraceParams): TracedPath[] {
  const lum = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) lum[p] = alphaIndex[p] === colorIndex ? 0 : 255;
  return traceLuminance(lum, w, h, params);
}

/** Detecta el color de fondo dominante promediando los bordes de la imagen. */
function detectBorderBackground(rgba: Uint8ClampedArray, w: number, h: number): RGB {
  const sum = { r: 0, g: 0, b: 0 };
  let n = 0;
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (rgba[i + 3] < 128) return;
    sum.r += rgba[i];
    sum.g += rgba[i + 1];
    sum.b += rgba[i + 2];
    n++;
  };
  for (let x = 0; x < w; x += 2) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    push(0, y);
    push(w - 1, y);
  }
  return n === 0 ? { r: 255, g: 255, b: 255 } : { r: sum.r / n, g: sum.g / n, b: sum.b / n };
}

/** Traduce opciones de UI a parámetros Potrace. */
function toTraceParams(options: VectorOptions): TraceParams {
  const turdSize = Math.max(options.minRadius, Math.round(options.denoise / 20));
  const alphaMax = 0.5 + options.cornerDetection * 1.5;
  const optTolerance = 0.05 + (options.simplification / 100) * 1.5;
  return {
    turnPolicy: "minority",
    turdSize,
    alphaMax,
    optCurve: options.smoothCurves,
    optTolerance,
    threshold: -1,
    blackOnWhite: true,
    color: "auto",
    background: "transparent",
    width: null,
    height: null,
  };
}

function toHex(c: RGB): string {
  return `#${((c.r << 16) | (c.g << 8) | c.b).toString(16).padStart(6, "0")}`.toUpperCase();
}

/** Fracción de píxeles de un índice de color (sobre los píxeles opacos). */
function coverageOf(alphaIndex: Uint8Array, k: number, w: number, h: number, opaqueCount: number): number {
  if (opaqueCount === 0) return 0;
  let n = 0;
  for (let p = 0; p < w * h; p++) if (alphaIndex[p] === k) n++;
  return n / opaqueCount;
}

/**
 * Vectoriza una imagen RGBA (w x h) y devuelve el resultado completo.
 * Primera mitad: análisis, preprocesado y cuantización.
 */
export function vectorize(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: Partial<VectorOptions> = {},
  onProgress?: ProgressFn
): TraceResult {
  const opts: VectorOptions = { ...DEFAULT_VECTOR_OPTIONS, ...options };
  const id = `vec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emit = (stage: TraceProgress["stage"], percent: number, message: string) =>
    onProgress?.({ id, stage, percent, message });
  const t0 = performance.now();

  emit("analysis", 5, "Analizando imagen…");
  const analysis: ImageAnalysis = analyzeImage(rgba, width, height);

  emit("preprocess", 20, "Preprocesando…");
  let work: Uint8ClampedArray = new Uint8ClampedArray(rgba);
  // El blur de mediana erosiona bordes finos; solo se aplica con ruido alto.
  // Las motas pequeñas se suprimen vía turdSize en el trazado.
  if (opts.denoise > 50) {
    work = medianFilter(work, width, height, Math.max(1, Math.round((opts.denoise - 50) / 30)));
  }
  if (opts.removeBackground) {
    const bg = detectBorderBackground(work, width, height);
    work = removeColor(work, bg, Math.max(24, 64 - opts.minRadius), true);
  }

  emit("quantize", 40, "Cuantizando colores…");
  const opaqueCount = work.filter((_, i) => i % 4 === 3 && work[i] >= 128).length;
  const rgbIn = new Uint8ClampedArray(opaqueCount * 3);
  const alphaIndex = new Uint8Array(width * height); // 255 = transparente
  let oi = 0;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (work[i + 3] >= 128) {
      rgbIn[oi] = work[i];
      rgbIn[oi + 1] = work[i + 1];
      rgbIn[oi + 2] = work[i + 2];
      oi += 3;
    } else {
      alphaIndex[p] = 255;
    }
  }

  const colorCount = opts.mode === "photography" ? Math.max(opts.colorCount, 32) : opts.colorCount;
  const palette: RGB[] = opaqueCount > 0 ? medianCut(rgbIn, Math.max(2, colorCount)) : [];

  for (let p = 0; p < width * height; p++) {
    if (alphaIndex[p] === 255) continue;
    const i = p * 4;
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const dr = work[i] - palette[k].r;
      const dg = work[i + 1] - palette[k].g;
      const db = work[i + 2] - palette[k].b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    alphaIndex[p] = best;
  }

  emit("trace", 60, "Trazando contornos…");
  const params = toTraceParams(opts);
  const layers: TraceResult["layers"] = [];
  const seen = new Map<number, number>();
  let totalNodes = 0;
  let totalCurves = 0;

  for (let k = 0; k < palette.length; k++) {
    if (opts.groupSimilar) {
      let mergedInto = -1;
      for (const [existing, layerIdx] of seen) {
        if (rgbDistance(palette[existing], palette[k]) < 30) {
          mergedInto = layerIdx;
          break;
        }
      }
      if (mergedInto >= 0) {
        seen.set(k, mergedInto);
        continue;
      }
    }

    const paths = traceMask(alphaIndex, k, width, height, params);
    const coverage = coverageOf(alphaIndex, k, width, height, opaqueCount);
    if (opts.ignoreSmallColors && coverage < 0.002) continue;

    const curves = countCurves(paths);
    layers.push({
      hex: toHex(palette[k]),
      path: renderPaths(paths),
      coverage,
      curveCount: curves,
    });
    totalCurves += curves;
    totalNodes += countNodes(paths);
    seen.set(k, layers.length - 1);
  }

  layers.sort((a, b) => b.coverage - a.coverage);

  emit("optimize", 85, "Ensamblando SVG…");
  const body = layers.map((l) => `\t<path d="${l.path}" fill="${l.hex}" fill-rule="evenodd"/>`).join("\n");
  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">\n${body}\n</svg>`;
  if (opts.optimizeSvg) svg = optimizeSvg(svg);

  emit("done", 100, "Listo");
  const elapsedMs = Math.round(performance.now() - t0);
  const complexity: TraceResult["metrics"]["complexity"] =
    totalCurves <= 500 ? "baja" : totalCurves <= 2500 ? "media" : "alta";

  return {
    id,
    width,
    height,
    svg,
    layers,
    metrics: {
      colorCount: layers.length,
      curveCount: totalCurves,
      nodeCount: totalNodes,
      svgBytes: new TextEncoder().encode(svg).length,
      elapsedMs,
      complexity,
    },
    analysis,
  };
}

