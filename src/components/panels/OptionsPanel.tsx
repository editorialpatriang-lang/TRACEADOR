"use client";
/**
 * Panel de opciones de vectorización.
 * Modo simple (lo que se usa el 90% de las veces): colores, detalle y quitar
 * fondo. El resto vive plegado en "Avanzado" para no abrumar, pero cada
 * control de ahí tiene efecto real en el motor.
 */
import { useState } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { VectorMode } from "@/types";
import { Section, Slider, Switch, Segmented } from "../ui";

const MODES: Array<{ value: VectorMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "logo", label: "Logo" },
  { value: "illustration", label: "Ilustración" },
  { value: "photography", label: "Foto" },
  { value: "text", label: "Texto" },
];

export default function OptionsPanel() {
  const options = useStudioStore((s) => s.options);
  const setOptions = useStudioStore((s) => s.setOptions);
  const resetOptions = useStudioStore((s) => s.resetOptions);
  const [advanced, setAdvanced] = useState(false);

  const set = (patch: Parameters<typeof setOptions>[0]) => setOptions(patch);

  return (
    <Section
      title="Vectorizar"
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
          <p className="mt-1.5 text-xs text-[hsl(var(--text-muted))]">
            {options.mode === "auto"
              ? "Detecta el tipo de imagen y ajusta solo."
              : "Aplica un perfil pensado para ese tipo de imagen."}
          </p>
        </div>

        <Slider
          label="Colores"
          value={options.colorCount}
          min={2}
          max={32}
          onChange={(v) => set({ colorCount: v })}
          hint="Menos colores = vector más limpio y liviano"
        />
        <Slider
          label="Detalle"
          value={options.detail}
          min={0}
          max={100}
          onChange={(v) => set({ detail: v })}
          hint="Alto conserva trazos finos; bajo elimina motas y simplifica"
        />
        <Switch label="Quitar fondo" checked={options.removeBackground} onChange={(v) => set({ removeBackground: v })} />

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
        >
          Avanzado
          <span>{advanced ? "−" : "+"}</span>
        </button>

        {advanced && (
          <div className="space-y-4">
            <Slider label="Suavizado" value={options.smoothing} min={0} max={100} onChange={(v) => set({ smoothing: v })} />
            <Slider label="Simplificación" value={options.simplification} min={0} max={100} onChange={(v) => set({ simplification: v })} />
            <Slider label="Precisión" value={options.precision} min={0} max={100} onChange={(v) => set({ precision: v })} />
            <Slider
              label="Detección de esquinas"
              value={Math.round(options.cornerDetection * 100)}
              min={0}
              max={100}
              onChange={(v) => set({ cornerDetection: v / 100 })}
            />
            <Slider label="Radio mínimo (px)" value={options.minRadius} min={0} max={50} onChange={(v) => set({ minRadius: v })} />
            <Slider label="Eliminación de ruido" value={options.denoise} min={0} max={100} onChange={(v) => set({ denoise: v })} />
            <Slider
              label="Máx. curvas (0 = sin límite)"
              value={options.maxCurves}
              min={0}
              max={20000}
              step={100}
              onChange={(v) => set({ maxCurves: v })}
            />

            <div className="h-px bg-[hsl(var(--border))]" />

            <div className="grid gap-0.5">
              <Switch label="Borde suave al quitar fondo" checked={options.transparent} onChange={(v) => set({ transparent: v })} />
              <Switch label="Agrupar colores similares" checked={options.groupSimilar} onChange={(v) => set({ groupSimilar: v })} />
              <Switch label="Ignorar colores pequeños" checked={options.ignoreSmallColors} onChange={(v) => set({ ignoreSmallColors: v })} />
              <Switch label="Detectar agujeros internos" checked={options.detectHoles} onChange={(v) => set({ detectHoles: v })} />
              <Switch label="Suavizar curvas" checked={options.smoothCurves} onChange={(v) => set({ smoothCurves: v })} />
              <Switch label="Optimizar SVG" checked={options.optimizeSvg} onChange={(v) => set({ optimizeSvg: v })} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
// force rebuild 1790101100
