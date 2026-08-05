/**
 * Web Worker de trazado.
 * Recibe una solicitud de vectorización, ejecuta el pipeline de forma
 * síncrona y devuelve el resultado. El buffer RGBA se transfiere (move) para
 * evitar copias.
 */
/// <reference lib="webworker" />
import { vectorize } from "@/processing/pipeline";
import { TraceRequest, TraceResult, TraceProgress } from "@/types";

export interface WorkerRequest extends TraceRequest {}
export interface WorkerResponse {
  id: string;
  ok: boolean;
  result?: TraceResult;
  error?: string;
  progress?: TraceProgress;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  try {
    // Publicar aviso inicial para que la UI muestre estado
    ctx.postMessage({ id: req.id, ok: true, progress: { stage: "analysis", percent: 2, message: "Iniciando…" } });

    const start = performance.now();
    const result = vectorize(
      new Uint8ClampedArray(req.rgba),
      req.width,
      req.height,
      req.options,
      (p) => {
        const response: WorkerResponse = { id: req.id, ok: true, result: undefined, progress: p };
        ctx.postMessage(response);
      }
    );
    void start;

    const res: WorkerResponse = { id: req.id, ok: true, result };
    ctx.postMessage(res);
  } catch (err) {
    const res: WorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(res);
  }
};
