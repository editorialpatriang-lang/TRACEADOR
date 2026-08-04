/**
 * Servicio de vectorización en el cliente.
 * Mantiene una pequeña pool de Web Workers y enruta las peticiones por turnos.
 * Si Web Worker no está disponible (SSR o entornos restringidos), ejecuta el
 * pipeline de forma síncrona como respaldo.
 */
import { VectorOptions, TraceResult, TraceProgress } from "@/types";
import { vectorize as vectorizeSync } from "@/processing/pipeline";

export type WorkerLike = {
  postMessage(message: TraceRequestW, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<WorkerResponseW>) => void) | null;
  terminate(): void;
};

import type { WorkerRequest, WorkerResponse } from "@/workers/tracer.worker";

export type TraceRequestW = Omit<WorkerRequest, "rgba"> & { rgba: Uint8ClampedArray };
export type WorkerResponseW = Omit<WorkerResponse, "result"> & { result?: TraceResult | undefined };

interface BusyJob {
  id: string;
  resolve: (r: TraceResult) => void;
  reject: (e: Error) => void;
  onProgress?: (p: TraceProgress) => void;
}

const POOL_SIZE = 2;
let pool: WorkerLike[] = [];
let nextWorker = 0;
const busyMap = new Map<string, BusyJob>();

function supportsWorker(): boolean {
  return typeof Worker !== "undefined";
}

function spawnWorker(): WorkerLike {
  const w = new Worker(new URL("../workers/tracer.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
  w.onmessage = (e) => {
    const data = e.data as WorkerResponseW;
    const job = busyMap.get(data.id);
    if (!job) return;
    if (!data.ok) {
      busyMap.delete(data.id);
      job.reject(new Error(data.error || "Error de vectorización"));
      return;
    }
    // Respuestas de progreso vs. resultado final
    if (!data.ok) return;
    if ("progress" in data && !data.result && data.progress) {
      job.onProgress?.(data.progress);
      return;
    }
    if (data.result) {
      busyMap.delete(data.id);
      job.resolve(data.result);
    }
  };
  return w;
}

/** Ejecuta la vectorización vía worker (o síncrona como respaldo). */
export function runVectorization(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: VectorOptions,
  onProgress?: (p: TraceProgress) => void
): Promise<TraceResult> {
  if (!supportsWorker()) {
    return Promise.resolve(vectorizeSync(rgba, width, height, options, onProgress));
  }

  if (pool.length < POOL_SIZE) pool.push(spawnWorker());
  const worker = pool[nextWorker % pool.length];
  nextWorker++;

  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise<TraceResult>((resolve, reject) => {
    busyMap.set(id, { id, resolve, reject, onProgress });
    // Enviamos una COPIA del buffer como transferible: transferir el original
    // desvincularía (detach) el ArrayBuffer del hilo principal, quebrado la
    // previsualización del original (Viewer usa image.rgba).
    const payload = rgba.slice();
    const request: TraceRequestW = {
      id,
      rgba: payload,
      width,
      height,
      options,
      palette: [],
    };
    worker.postMessage(request, [payload.buffer]);
  });
}

/** Termina todos los workers (útil en hot-reload / unmount). */
export function disposeWorkers(): void {
  for (const w of pool) w.terminate();
  pool = [];
  busyMap.clear();
}
