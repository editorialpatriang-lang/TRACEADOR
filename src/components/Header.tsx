"use client";
/**
 * Cabecera de la aplicación: marca, acciones y toggle de tema.
 */
import { Moon, Sun, X } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import ExportMenu from "./toolbar/ExportMenu";
import LogoEdipa from "./LogoEdipa";

export default function Header() {
  const theme = useStudioStore((s) => s.theme);
  const toggleTheme = useStudioStore((s) => s.toggleTheme);
  const image = useStudioStore((s) => s.image);
  const clear = useStudioStore((s) => s.clear);
  const showNodes = useStudioStore((s) => s.showNodes);
  const setShowNodes = useStudioStore((s) => s.setShowNodes);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-surface-raised px-4">
      <div className="flex items-center gap-2">
        <LogoEdipa className="h-8 w-auto text-[#322e64] dark:text-white" />
        <div className="leading-tight">
          <h1 className="text-sm font-bold text-[hsl(var(--text))]">Vector Studio AI</h1>
          <p className="text-[10px] text-[hsl(var(--text-muted))]">Raster → Vector editable</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {image && (
          <label className="hidden items-center gap-1.5 rounded-lg bg-surface-hover px-2.5 py-1.5 text-xs text-[hsl(var(--text))] sm:flex">
            <input
              type="checkbox"
              checked={showNodes}
              onChange={(e) => setShowNodes(e.target.checked)}
              className="accent-[hsl(var(--accent))]"
            />
            Mostrar nodos
          </label>
        )}
        <ExportMenu />
        {image && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-hover px-2.5 py-2 text-sm text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))]"
            title="Nueva imagen"
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-[hsl(var(--text))] hover:bg-[hsl(var(--border))]"
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
