"use client";
/**
 * Visor: paneles Original (izq.) y Vector (der.) con zoom/pan sincronizados
 * desde el store, comparador deslizante y overlay de nodos.
 */
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { svgFromLayers } from "@/utils/layers";
import { imageToDataUrl } from "@/services/imageLoader";
import { ZoomControls, NodesOverlay } from "./ViewerWidgets";

export default function Viewer() {
  const image = useStudioStore((s) => s.image);
  const result = useStudioStore((s) => s.result);
  const hidden = useStudioStore((s) => s.hidden);
  const zoom = useStudioStore((s) => s.zoom);
  const setZoom = useStudioStore((s) => s.setZoom);
  const pan = useStudioStore((s) => s.pan);
  const setPan = useStudioStore((s) => s.setPan);
  const showNodes = useStudioStore((s) => s.showNodes);
  const compareMode = useStudioStore((s) => s.compareMode);
  const setCompareMode = useStudioStore((s) => s.setCompareMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [compare, setCompare] = useState(50);
  const [drag, setDrag] = useState<{ x: number; y: number; px: number; py: number } | null>(null);

  const originalUrl = useMemo(() => (image ? imageToDataUrl(image.rgba, image.width, image.height) : ""), [image]);
  const svgMarkup = useMemo(
    () => (result ? svgFromLayers(result.layers, result.width, result.height, hidden) : ""),
    [result, hidden]
  );

  useEffect(() => {
    if (!result || !containerRef.current) return;
    const pad = 56;
    const s = Math.min(
      (containerRef.current.clientWidth / 2 - pad) / result.width,
      (containerRef.current.clientHeight - pad) / result.height,
      1
    );
    setZoom(s || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom(zoom * (e.deltaY > 0 ? 0.9 : 1.1));
    },
    [zoom, setZoom]
  );

  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    setPan({ x: drag.px + (e.clientX - drag.x), y: drag.py + (e.clientY - drag.y) });
  };
  const up = () => setDrag(null);

  if (!image || !result) return null;

  const transform = `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`;
  const paneStyle = { width: result.width * zoom, height: result.height * zoom };

  return (
    <div
      className="relative h-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
      onWheel={handleWheel}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      style={{ touchAction: "none", cursor: drag ? "grabbing" : "grab" }}
    >
      <div ref={containerRef} className="absolute inset-0">
        {compareMode ? (
          <>
            <div className="absolute left-1/2 top-1/2" style={{ transform }}>
              <div className="relative" style={paneStyle}>
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
                  <img src={originalUrl} width={result.width} height={result.height} className="select-none" draggable={false} alt="Original" />
                </div>
                <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${compare}%)` }} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={compare}
              onChange={(e) => setCompare(Number(e.target.value))}
              className="absolute bottom-8 left-1/2 w-64 -translate-x-1/2 cursor-ew-resize"
            />
          </>
        ) : (
          <>
            <div className="absolute inset-y-0 left-0 w-1/2">
              <Label text="Original" />
              <div className="checkerboard h-full w-full overflow-hidden">
                <Wrapper transform={transform}>
                  <img src={originalUrl} style={paneStyle} className="max-w-none select-none" draggable={false} alt="Original" />
                </Wrapper>
              </div>
            </div>
            <div className="absolute inset-y-0 left-1/2 w-1/2 border-l border-[hsl(var(--border))]">
              <Label text="Vector" />
              <div className="h-full w-full overflow-hidden bg-[hsl(var(--surface))]">
                <Wrapper transform={transform}>
                  <div style={paneStyle} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
                  {showNodes && <NodesOverlay zoom={zoom} />}
                </Wrapper>
              </div>
            </div>
          </>
        )}
        <ZoomControls />
      </div>

      <button
        onClick={() => setCompareMode(!compareMode)}
        className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg bg-surface-raised/95 px-3 py-1.5 text-xs font-medium text-[hsl(var(--text))] shadow-soft hover:bg-surface-hover"
      >
        Comparar Original / Vector
      </button>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-surface-raised/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
      {text}
    </span>
  );
}

function Wrapper({ transform, children }: { transform: string; children: React.ReactNode }) {
  return (
    <div className="absolute left-1/2 top-1/2" style={{ transform }}>
      {children}
    </div>
  );
}
