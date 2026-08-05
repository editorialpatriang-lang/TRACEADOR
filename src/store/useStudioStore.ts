/**
 * Store global de Zustand: estado de la app (imagen, opciones, resultado,
 * visor, tema) y acciones, incluida la vectorización con workers.
 */
import { create } from "zustand";
import { VectorOptions, DEFAULT_VECTOR_OPTIONS, TraceResult, TraceProgress, ImageAnalysis } from "@/types";
import { LoadedImage } from "@/services/imageLoader";
import { runVectorization, disposeWorkers } from "@/services/vectorizeService";
import { recolorLayer, removeLayer, mergeLayers } from "@/utils/layers";

export type Status = "idle" | "processing" | "done" | "error";
export type Theme = "dark" | "light";
export type Tool = "select" | "pan" | "zoom" | "edit";

interface StudioState {
  image: LoadedImage | null;
  status: Status;
  progress: TraceProgress | null;
  error: string | null;
  options: VectorOptions;
  result: TraceResult | null;
  analysis: ImageAnalysis | null;
  theme: Theme;
  tool: Tool;
  zoom: number;
  pan: { x: number; y: number };
  hidden: Set<string>;
  showNodes: boolean;
  showControlPoints: boolean;
  compareMode: boolean;

  setImage: (img: LoadedImage) => void;
  setOptions: (patch: Partial<VectorOptions>) => void;
  resetOptions: () => void;
  vectorize: () => Promise<void>;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  toggleLayer: (hex: string) => void;
  showAllLayers: () => void;
  hideAllLayers: () => void;
  recolor: (index: number, hex: string) => void;
  remove: (index: number) => void;
  merge: (keep: number, drop: number) => void;
  setShowNodes: (v: boolean) => void;
  setShowControlPoints: (v: boolean) => void;
  setCompareMode: (v: boolean) => void;
  clear: () => void;
  resetView: () => void;
}

let vectorizeToken = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Programa una vectorización con debounce (evita saturar workers en sliders). */
function scheduleVectorize(get: () => StudioState, delay = 250): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void get().vectorize();
  }, delay);
}

export const useStudioStore = create<StudioState>((set, get) => ({
  image: null,
  status: "idle",
  progress: null,
  error: null,
  options: { ...DEFAULT_VECTOR_OPTIONS },
  result: null,
  analysis: null,
  theme: "dark",
  tool: "select",
  zoom: 1,
  pan: { x: 0, y: 0 },
  hidden: new Set<string>(),
  showNodes: false,
  showControlPoints: false,
  compareMode: false,

  setImage: (img) => set({ image: img, status: "idle", result: null, analysis: null, progress: null, error: null, hidden: new Set() }),

  setOptions: (patch) => {
    set({ options: { ...get().options, ...patch } });
    // Vista previa instantánea con debounce
    scheduleVectorize(get);
  },

  resetOptions: () => {
    set({ options: { ...DEFAULT_VECTOR_OPTIONS } });
    scheduleVectorize(get);
  },

  vectorize: async () => {
    const { image, options } = get();
    if (!image) return;
    const token = ++vectorizeToken;
    set({ status: "processing", error: null });
    try {
      const result = await runVectorization(
        image.rgba,
        image.width,
        image.height,
        options,
        (p) => {
          if (get().status === "processing") set({ progress: p });
        }
      );
      if (token !== vectorizeToken) return; // una petición más nueva ganó
      set({ result, analysis: result.analysis, status: "done", progress: null });
    } catch (e) {
      if (token !== vectorizeToken) return;
      set({ status: "error", error: e instanceof Error ? e.message : String(e), progress: null });
    }
  },

  setTheme: (t) => set({ theme: t }),
  toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
  setTool: (t) => set({ tool: t }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(8, z)) }),
  setPan: (p) => set({ pan: p }),
  toggleLayer: (hex) => {
    const hidden = new Set(get().hidden);
    if (hidden.has(hex)) hidden.delete(hex);
    else hidden.add(hex);
    set({ hidden });
  },
  showAllLayers: () => set({ hidden: new Set() }),
  hideAllLayers: () => {
    const result = get().result;
    if (!result) return;
    set({ hidden: new Set(result.layers.map((l) => l.hex)) });
  },
  recolor: (index, hex) => {
    const result = get().result;
    if (!result) return;
    set({ result: recolorLayer(result, index, hex) });
  },
  remove: (index) => {
    const result = get().result;
    if (!result) return;
    set({ result: removeLayer(result, index) });
  },
  merge: (keep, drop) => {
    const result = get().result;
    if (!result) return;
    set({ result: mergeLayers(result, keep, drop) });
  },
  setShowNodes: (v) => set({ showNodes: v }),
  setShowControlPoints: (v) => set({ showControlPoints: v }),
  setCompareMode: (v) => set({ compareMode: v }),
  clear: () => {
    disposeWorkers();
    set({ image: null, result: null, analysis: null, status: "idle", progress: null, error: null, hidden: new Set() });
  },
  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
}));
