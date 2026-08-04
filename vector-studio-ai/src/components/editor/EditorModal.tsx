"use client";
/**
 * Editor de nodos basado en Fabric.js. Muestra cada capa de color como un Path
 * de Fabric, permite ocultar/seleccionar capas, cambiar color, y arrastrar
 * puntos de control Bézier para editar la geometría.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Path as FabricPath, Circle as FabricCircle } from "fabric";
import { PencilRuler } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import { Section } from "../ui";

type Seg = {
  circle: FabricCircle;
  segIndex: number;
  coordIdx: number; // índice dentro del segmento para x
};

// Referencias compartidas por los helpers de edición (ámbito de módulo).
const fabricCanvas: { current: Canvas | null } = { current: null };
const pathHandles: Seg[] = [];

export default function EditorModal() {
  const result = useStudioStore((s) => s.result);
  const hidden = useStudioStore((s) => s.hidden);
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const init = useCallback(() => {
    if (!result || !canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current, { backgroundColor: "#ffffff", selection: true });
    canvas.setDimensions({ width: result.width, height: result.height });
    fabricCanvas.current = canvas;
    pathHandles.length = 0;

    result.layers.forEach((layer) => {
      const p = new FabricPath(layer.path, {
        fill: layer.hex,
        objectCaching: false,
        selectable: true,
      });
      canvas.add(p);
      p.visible = !hidden.has(layer.hex);
    });

    canvas.requestRenderAll();
    canvas.on("selection:created", (e) => showHandles(canvas, e.selected[0] as FabricPath));
    canvas.on("selection:cleared", () => clearHandles(canvas));

    return () => {
      canvas.dispose();
      fabricCanvas.current = null;
      pathHandles.length = 0;
    };
  }, [result, hidden]);

  useEffect(() => {
    if (open) return init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result, hidden]);

  return (
    <Section
      title="Editor de nodos"
      action={
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-xs text-[hsl(var(--text))] hover:bg-[hsl(var(--border))]">
          <PencilRuler size={14} /> {open ? "Cerrar" : "Editar"}
        </button>
      }
    >
      {!open ? (
        <p className="text-sm text-[hsl(var(--text-muted))]">Edita nodos y curvas Bézier sobre un lienzo Fabric.js.</p>
      ) : result ? (
        <div className="relative">
          <div className="max-h-96 overflow-auto rounded-lg border border-[hsl(var(--border))]">
            <canvas ref={canvasRef} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[hsl(var(--text-muted))]">
            <span className="rounded bg-surface-hover px-1.5 py-0.5">● Selecciona una capa</span>
            <span className="rounded bg-surface-hover px-1.5 py-0.5">● Arrastra los puntos para editar</span>
          </div>
          <button
            onClick={() => {}} // regenera capas desde el store (placeholder)
            className="mt-2 w-full rounded-lg bg-surface-hover py-1.5 text-xs text-[hsl(var(--text))] hover:bg-[hsl(var(--border))]"
          >
            Re-sincronizar capas
          </button>
        </div>
      ) : (
        <p className="text-sm text-[hsl(var(--text-muted))]">Sube una imagen para editar sus nodos.</p>
      )}
    </Section>
  );
}

/** Muestra manitas arrastrables sobre los puntos de la capa seleccionada. */
function showHandles(canvas: Canvas, path: FabricPath) {
  clearHandles(canvas);
  if (!path || !path.path) return;
  const segs = path.path as Array<Array<string | number>>;
  const delta = { x: path.left ?? 0, y: path.top ?? 0 };

  segs.forEach((seg, si) => {
    const op = String(seg[0]).toUpperCase();
    if (op === "M" || op === "L") {
      if (seg.length >= 3) addHandle(canvas, Number(seg[1]) + delta.x, Number(seg[2]) + delta.y, path, si, 1);
    } else if (op === "C") {
      if (seg.length >= 7) {
        addHandle(canvas, Number(seg[1]) + delta.x, Number(seg[2]) + delta.y, path, si, 1);
        addHandle(canvas, Number(seg[3]) + delta.x, Number(seg[4]) + delta.y, path, si, 3);
        addHandle(canvas, Number(seg[5]) + delta.x, Number(seg[6]) + delta.y, path, si, 5);
      }
    }
  });
}

function addHandle(canvas: Canvas, x: number, y: number, path: FabricPath, segIndex: number, coordIdx: number) {
  const circle = new FabricCircle({ left: x, top: y, radius: 3, fill: "#e11d48", originX: "center", originY: "center", hasBorders: false, hasControls: false, lockRotation: true });
  const seg: Seg = { circle, segIndex, coordIdx };
  circle.on("moving", () => updatePathFromHandle(path, seg));
  pathHandles.push(seg);
  canvas.add(circle);
}

function updatePathFromHandle(path: FabricPath, seg: Seg) {
  const segs = path.path as Array<Array<string | number>>;
  const s = segs[seg.segIndex];
  if (!s) return;
  const delta = { x: path.left ?? 0, y: path.top ?? 0 };
  s[seg.coordIdx] = seg.circle.left - delta.x;
  s[seg.coordIdx + 1] = seg.circle.top - delta.y;
  const canvas = fabricCanvas.current;
  if (canvas) {
    path.set("path", segs);
    canvas.requestRenderAll();
  }
}

function clearHandles(canvas: Canvas) {
  for (const h of pathHandles) canvas.remove(h.circle);
  pathHandles.length = 0;
}
