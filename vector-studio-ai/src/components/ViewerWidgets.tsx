"use client";
/**
 * Widgets auxiliares del visor: controles de zoom y overlay de nodos Bézier.
 */
import { useStudioStore } from "@/store/useStudioStore";
import { parsePath } from "@/utils/parsePath";

export function ZoomControls() {
  const zoom = useStudioStore((s) => s.zoom);
  const setZoom = useStudioStore((s) => s.setZoom);
  const resetView = useStudioStore((s) => s.resetView);
  return (
    <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg bg-surface-raised/95 p-1 shadow-soft">
      <button onClick={() => setZoom(zoom * 0.8)} className="rounded px-2 py-0.5 text-sm hover:bg-surface-hover" aria-label="Reducir">
        −
      </button>
      <span className="min-w-12 text-center font-mono text-xs text-[hsl(var(--text-muted))]">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={() => setZoom(zoom * 1.25)} className="rounded px-2 py-0.5 text-sm hover:bg-surface-hover" aria-label="Ampliar">
        +
      </button>
      <button onClick={resetView} className="rounded px-2 py-0.5 text-sm hover:bg-surface-hover" title="Ajustar">
        ⤢
      </button>
    </div>
  );
}

/** Genera los círculos de puntos/curvas de todos los trazados visibles. */
export function nodeCircles(layers: { path: string }[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const layer of layers) {
    for (const cmd of parsePath(layer.path)) {
      if (cmd.op === "C") {
        out.push(<circle key={key++} cx={cmd.args[4]} cy={cmd.args[5]} r={2} fill="#e11d48" />);
        out.push(<circle key={key++} cx={cmd.args[0]} cy={cmd.args[1]} r={1.4} fill="#10b981" />);
        out.push(<circle key={key++} cx={cmd.args[2]} cy={cmd.args[3]} r={1.4} fill="#10b981" />);
      } else if (cmd.op === "L") {
        out.push(<circle key={key++} cx={cmd.args[0]} cy={cmd.args[1]} r={2} fill="#e11d48" />);
      }
    }
  }
  return out;
}

export function NodesOverlay({ zoom }: { zoom: number }) {
  const result = useStudioStore((s) => s.result);
  if (!result) return null;
  return (
    <svg
      width={result.width}
      height={result.height}
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{ transform: `translate(-50%, -50%) scale(${zoom})` }}
    >
      {nodeCircles(result.layers)}
    </svg>
  );
}
