"use client";
/**
 * Panel de capas: ocultar, cambiar color, eliminar y fusionar capas de color.
 */
import { useState } from "react";
import { Eye, EyeOff, Trash2, Merge } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import { Section } from "../ui";

export default function LayerPanel() {
  const result = useStudioStore((s) => s.result);
  const hidden = useStudioStore((s) => s.hidden);
  const toggleLayer = useStudioStore((s) => s.toggleLayer);
  const showAllLayers = useStudioStore((s) => s.showAllLayers);
  const hideAllLayers = useStudioStore((s) => s.hideAllLayers);
  const recolor = useStudioStore((s) => s.recolor);
  const remove = useStudioStore((s) => s.remove);
  const merge = useStudioStore((s) => s.merge);
  const [mergeFrom, setMergeFrom] = useState<number | null>(null);

  if (!result) {
    return (
      <Section title="Capas">
        <p className="text-sm text-[hsl(var(--text-muted))]">Las capas de color aparecerán aquí.</p>
      </Section>
    );
  }

  return (
    <Section
      title={`Capas (${result.layers.length})`}
      action={
        <div className="flex gap-1">
          <button onClick={showAllLayers} className="text-xs text-[hsl(var(--accent))] hover:underline">Mostrar</button>
          <button onClick={hideAllLayers} className="text-xs text-[hsl(var(--text-muted))] hover:underline">Ocultar</button>
        </div>
      }
    >
      <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {result.layers.map((layer, i) => {
          const isHidden = hidden.has(layer.hex);
          return (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${isHidden ? "opacity-50" : ""} hover:bg-surface-hover`}
            >
              <button
                onClick={() => toggleLayer(layer.hex)}
                className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                title={isHidden ? "Mostrar" : "Ocultar"}
              >
                {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <input
                type="color"
                value={layer.hex}
                onChange={(e) => recolor(i, e.target.value.toUpperCase())}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Cambiar color"
              />
              <span className="flex-1 truncate font-mono text-xs text-[hsl(var(--text))]">{layer.hex}</span>
              <span className="font-mono text-[10px] text-[hsl(var(--text-muted))]">{Math.round(layer.coverage * 100)}%</span>
              <button
                onClick={() => (mergeFrom === null ? setMergeFrom(i) : (merge(mergeFrom, i), setMergeFrom(null)))}
                className={`text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] ${mergeFrom === i ? "text-[hsl(var(--accent))]" : ""}`}
                title={mergeFrom === null ? "Fusionar con…" : `Fusionar capa ${i + 1} aquí`}
              >
                <Merge size={14} />
              </button>
              <button
                onClick={() => remove(i)}
                className="text-[hsl(var(--text-muted))] hover:text-red-500"
                title="Eliminar capa"
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
      {mergeFrom !== null && (
        <p className="mt-2 text-xs text-[hsl(var(--accent))]">
          Selecciona la capa destino para fusionar (o pulsa el icono de nuevo para cancelar).
        </p>
      )}
    </Section>
  );
}
