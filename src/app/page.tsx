"use client";
/**
 * Página principal de Vector Studio AI.
 * Layout: cabecera + panel izquierdo (opciones/capas) + centro (visor) +
 * panel derecho (resultados/editor).
 */
import Header from "@/components/Header";
import DropZone from "@/components/DropZone";
import Viewer from "@/components/Viewer";
import OptionsPanel from "@/components/panels/OptionsPanel";
import LayerPanel from "@/components/panels/LayerPanel";
import ResultsPanel from "@/components/panels/ResultsPanel";
import EditorModal from "@/components/editor/EditorModal";
import { useStudioStore } from "@/store/useStudioStore";

export default function Home() {
  const image = useStudioStore((s) => s.image);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex min-h-0 flex-1 gap-3 p-3">
        {/* Panel izquierdo */}
        <aside className="hidden w-72 shrink-0 space-y-3 overflow-y-auto pr-1 lg:block">
          <OptionsPanel />
          <LayerPanel />
        </aside>

        {/* Centro */}
        <section className="min-w-0 flex-1 rounded-2xl bg-surface-raised p-3 shadow-soft">
          {image ? <Viewer /> : <DropZone />}
        </section>

        {/* Panel derecho */}
        <aside className="hidden w-72 shrink-0 space-y-3 overflow-y-auto pl-1 md:block">
          <ResultsPanel />
          <EditorModal />
        </aside>
      </main>

      {/* Barra inferior en móvil */}
      <div className="grid-cols-1 gap-3 border-t border-[hsl(var(--border))] p-3 lg:hidden">
        <OptionsPanel />
      </div>
    </div>
  );
}
