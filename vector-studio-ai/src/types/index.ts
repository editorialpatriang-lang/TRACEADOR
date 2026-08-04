/**
 * Tipos centrales del dominio de Vector Studio AI.
 * Un único archivo de tipos compartido por frontend, workers y backend.
 */

/** Tipo de imagen detectado automáticamente. */
export type ImageKind =
  | "logo"
  | "illustration"
  | "drawing"
  | "photography"
  | "sticker"
  | "text"
  | "unknown";

/** Modos de vectorización seleccionables por el usuario. */
export type VectorMode =
  | "auto"
  | "logo"
  | "illustration"
  | "photography"
  | "text";

/** Modos de exportación soportados. */
export type ExportFormat =
  | "svg"
  | "png"
  | "webp"
  | "pdf"
  | "eps"
  | "ai"
  | "dxf";

/** Resultado del análisis automático de la imagen de entrada. */
export interface ImageAnalysis {
  width: number;
  height: number;
  /** Número único de colores detectado (antes de cuantización). */
  colorCount: number;
  /** Mapa de colores con su frecuencia relativa. */
  colorHistogram: Array<{ hex: string; ratio: number }>;
  /** Nivel aproximado de ruido 0..1. */
  noise: number;
  /** Contraste 0..1 (más alto = más contraste). */
  contrast: number;
  /** Fracción de píxeles transparentes 0..1. */
  transparency: number;
  /** True si la imagen tiene canal alfa con transparencia. */
  hasAlpha: boolean;
  /** Detección heurística de fondo sólido dominante. */
  background: { type: "solid" | "gradient" | "textured" | "none"; color?: string };
  /** Tipo de imagen inferido. */
  kind: ImageKind;
  /** Confianza de la clasificación 0..1. */
  kindConfidence: number;
  /** Colores dominantes (sin incluir el más parecido a fondo blanco). */
  dominantColors: string[];
}

/** Configuración completa de vectorización expuesta en el panel. */
export interface VectorOptions {
  mode: VectorMode;
  /** Número de colores objetivo tras cuantización. */
  colorCount: number;
  /** Suavizado de curvas 0..100. */
  smoothing: number;
  /** Nivel de detalle a conservar 0..100. */
  detail: number;
  /** Simplificación global 0..100. */
  simplification: number;
  /** Límite de curvas (0 = sin límite). */
  maxCurves: number;
  /** Precisión del trazado (turdsize equivalente) 0..100. */
  precision: number;
  /** Detección de esquinas 0..1 (alfa). */
  cornerDetection: number;
  /** Radio mínimo de detalle a ignorar (píxeles). */
  minRadius: number;
  /** Eliminación de ruido 0..100. */
  denoise: number;
  /** Conservar transparencia original. */
  transparent: boolean;
  /** Eliminar el fondo dominante. */
  removeBackground: boolean;
  /** Agrupar colores similares por distancia ΔE. */
  groupSimilar: boolean;
  /** Ignorar regiones de color con poca cobertura. */
  ignoreSmallColors: boolean;
  /** Detectar agujeros internos. */
  detectHoles: boolean;
  /** Suavizar curvas Bézier (optcurve). */
  smoothCurves: boolean;
  /** Optimizar el SVG final con SVGO. */
  optimizeSvg: boolean;
}

/** Opciones por defecto, coherentes con el panel. */
export const DEFAULT_VECTOR_OPTIONS: VectorOptions = {
  mode: "auto",
  colorCount: 24,
  smoothing: 50,
  detail: 70,
  simplification: 40,
  maxCurves: 0,
  precision: 70,
  cornerDetection: 1,
  minRadius: 0,
  denoise: 40,
  transparent: false,
  removeBackground: true,
  groupSimilar: true,
  ignoreSmallColors: false,
  detectHoles: true,
  smoothCurves: true,
  optimizeSvg: true,
};

/** Paquete que el worker recibe para trazar una imagen. */
export interface TraceRequest {
  id: string;
  /** Datos de imagen RGBA normalizados (0..255), canalete por filas. */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  options: VectorOptions;
  /** Paleta objetivo (hex). Si se recibe, se usa en vez de cuantizar. */
  palette?: string[];
}

/** Una capa de color resultante (un Path SVG por región). */
export interface ColorLayer {
  hex: string;
  /** Atributo path del SVG (todos los trazados de ese color juntos). */
  path: string;
  /** Ratio de cobertura de píxeles 0..1. */
  coverage: number;
  /** Número de trazados Bézier que componen la capa. */
  curveCount: number;
}

/** Resultado completo de la vectorización. */
export interface TraceResult {
  id: string;
  width: number;
  height: number;
  /** SVG final (incluye <svg> raíz). */
  svg: string;
  /** Capas de color ordenadas por cobertura. */
  layers: ColorLayer[];
  /** Métricas del proceso. */
  metrics: {
    colorCount: number;
    curveCount: number;
    nodeCount: number;
    svgBytes: number;
    elapsedMs: number;
    complexity: "baja" | "media" | "alta";
  };
  analysis: ImageAnalysis;
}

/** Estado de progreso publicado por el worker. */
export interface TraceProgress {
  id: string;
  stage: "analysis" | "preprocess" | "quantize" | "trace" | "optimize" | "done";
  percent: number;
  message: string;
}
