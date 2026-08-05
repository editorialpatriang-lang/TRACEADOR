"use client";
/**
 * Panel de resultados: métricas de la vectorización y tipo de imagen detectado.
 */
import { useStudioStore } from "@/store/useStudioStore";
import { Section } from "../ui";
import { formatBytes } from "@/services/imageLoader";
import { KIND_LABELS } from "@/processing/analysis/classify";
import { ImageKind } from "@/types";

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[hsl(var(--text-muted))]">{label}</span>
      <span className={`font-mono text-sm ${accent ? "font-semibold text-[hsl(var(--accent))]" : "text-[hsl(var(--text))]"}`}>{value}</span>
    </div>
  );
}

export default function ResultsPanel() {
  const result = useStudioStore((s) => s.result);
  const status = useStudioStore((s) => s.status);
  const analysis = useStudioStore((s) => s.analysis);

  if (!result) {
    return (
      <Section title="Resultados">
        <p className="text-sm text-[hsl(var(--text-muted))]">Sube una imagen para ver las métricas.</p>
      </Section>
    );
  }

  const kind = (analysis?.kind ?? "unknown") as ImageKind;
  const complexityColor =
    result.metrics.complexity === "baja" ? "text-emerald-500" : result.metrics.complexity === "media" ? "text-amber-500" : "text-red-500";

  return (
    <Section title="Resultados">
      <div className="divide-y divide-[hsl(var(--border))]">
        <Row label="Colores" value={String(result.metrics.colorCount)} accent />
        <Row label="Curvas Bézier" value={String(result.metrics.curveCount)} />
        <Row label="Nodos" value={String(result.metrics.nodeCount)} />
        <Row label="Peso del SVG" value={formatBytes(result.metrics.svgBytes)} />
        <Row label="Tiempo" value={`${(result.metrics.elapsedMs / 1000).toFixed(2)} s`} />
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-[hsl(var(--text-muted))]">Complejidad</span>
          <span className={`text-sm font-semibold ${complexityColor}`}>{result.metrics.complexity}</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-[hsl(var(--text-muted))]">Tipo detectado</span>
          <span className="text-sm font-medium text-[hsl(var(--text))]">{KIND_LABELS[kind]}</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-[hsl(var(--text-muted))]">Resolución</span>
          <span className="font-mono text-sm text-[hsl(var(--text))]">
            {result.width} × {result.height}
          </span>
        </div>
      </div>
      {status === "processing" && (
        <div className="mt-2 text-xs text-[hsl(var(--text-muted))]">
          <div className="relative mb-1 h-1 overflow-hidden rounded-full bg-surface-hover">
            <div className="progress-indeterminate absolute inset-y-0 w-2/5 rounded-full bg-[hsl(var(--accent))]" />
          </div>
          Recalculando… (vista previa instantánea)
        </div>
      )}
    </Section>
  );
}
