"use client";
/**
 * Panel de opciones de vectorización: modo, sliders y switches.
 * Cada cambio dispara la vista previa con debounce.
 */
import { useStudioStore } from "@/store/useStudioStore";
import { VectorMode } from "@/types";
import { Section, Slider, Switch, Segmented, Button } from "../ui";

const MODES: Array<{ value: VectorMode; label: string }> = [
  { value: "auto", label: "Automático" },
  { value: "logo", label: "Logo" },
  { value: "illustration", label: "Ilustración" },
  { value: "photography", label: "Fotografía" },
  { value: "text", label: "Texto" },
];

export default function OptionsPanel() {
  const options = useStudioStore((s) => s.options);
  const setOptions = useStudioStore((s) => s.setOptions);
  const resetOptions = useStudioStore((s) => s.resetOptions);

  const set = (patch: Parameters<typeof setOptions>[0]) => setOptions(patch);

  return (
    <Section
      title="Opciones de vectorización"
      action={
        <button onClick={resetOptions} className="text-xs font-medium text-[hsl(var(--accent))] hover:underline">
          Restablecer
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm text-[hsl(var(--text-muted))]">Modo</p>
          <Segmented options={MODES} value={options.mode} onChange={(mode) => set({ mode })} />
        </div>

        <Slider label="Cantidad de colores" value={options.colorCount} min={2} max={64} onChange={(v) => set({ colorCount: v })} />
        <Slider label="Suavizado" value={options.smoothing} min={0} max={100} onChange={(v) => set({ smoothing: v })} />
        <Slider label="Detalle" value={options.detail} min={0} max={100} onChange={(v) => set({ detail: v })} />
        <Slider label="Simplificación" value={options.simplification} min={0} max={100} onChange={(v) => set({ simplification: v })} />
        <Slider label="Máx. curvas (0 = sin límite)" value={options.maxCurves} min={0} max={20000} step={100} onChange={(v) => set({ maxCurves: v })} />
        <Slider label="Precisión" value={options.precision} min={0} max={100} onChange={(v) => set({ precision: v })} />
        <Slider label="Detección de esquinas" value={Math.round(options.cornerDetection * 100)} min={0} max={100} onChange={(v) => set({ cornerDetection: v / 100 })} />
        <Slider label="Radio mínimo (px)" value={options.minRadius} min={0} max={50} onChange={(v) => set({ minRadius: v })} />
        <Slider label="Eliminación de ruido" value={options.denoise} min={0} max={100} onChange={(v) => set({ denoise: v })} />

        <div className="h-px bg-[hsl(var(--border))]" />

        <div className="grid gap-0.5">
          <Switch label="Transparencia" checked={options.transparent} onChange={(v) => set({ transparent: v })} />
          <Switch label="Eliminar fondo" checked={options.removeBackground} onChange={(v) => set({ removeBackground: v })} />
          <Switch label="Agrupar colores similares" checked={options.groupSimilar} onChange={(v) => set({ groupSimilar: v })} />
          <Switch label="Ignorar colores pequeños" checked={options.ignoreSmallColors} onChange={(v) => set({ ignoreSmallColors: v })} />
          <Switch label="Detectar agujeros internos" checked={options.detectHoles} onChange={(v) => set({ detectHoles: v })} />
          <Switch label="Suavizar curvas" checked={options.smoothCurves} onChange={(v) => set({ smoothCurves: v })} />
          <Switch label="Optimizar SVG" checked={options.optimizeSvg} onChange={(v) => set({ optimizeSvg: v })} />
        </div>
      </div>
    </Section>
  );
}
