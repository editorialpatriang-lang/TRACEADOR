"use client";
/**
 * Menú de exportación: descarga en SVG, PNG, WEBP, PDF, EPS, AI y DXF.
 */
import { useState } from "react";
import { Download, ChevronDown, Check, Loader2 } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import { EXPORT_FORMATS, exportVector } from "@/export/vectorExport";
import { ExportFormat } from "@/types";

export default function ExportMenu() {
  const result = useStudioStore((s) => s.result);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const doExport = async (format: ExportFormat) => {
    if (!result) return;
    setBusy(format);
    try {
      const base = `vector-studio-${result.width}x${result.height}`;
      await exportVector(result, format, base);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!result}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-sm font-medium text-[hsl(var(--accent-fg))] shadow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download size={16} /> Exportar <ChevronDown size={14} />
      </button>

      {open && result && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-[hsl(var(--border))] bg-surface-raised p-1.5 shadow-glow">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
            Formato de exportación
          </p>
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => void doExport(f.value)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-[hsl(var(--text))] hover:bg-surface-hover"
            >
              <span>{f.label}</span>
              {busy === f.value ? (
                <Loader2 size={14} className="animate-spin text-[hsl(var(--accent))]" />
              ) : (
                <Check size={14} className="text-[hsl(var(--text-muted))]" />
              )}
            </button>
          ))}
          <p className="mt-1 border-t border-[hsl(var(--border))] px-2 pt-1.5 text-[10px] text-[hsl(var(--text-muted))]">
            PNG y WEBP se rasterizan desde el vector.
          </p>
        </div>
      )}
    </div>
  );
}
