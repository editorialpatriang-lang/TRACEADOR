"use client";
/**
 * Zona de arrastrar y soltar. Carga el archivo, lo decodifica a RGBA y lanza
 * la vectorización automática.
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, ImageIcon, FileWarning } from "lucide-react";
import { loadImageFile } from "@/services/imageLoader";
import { useStudioStore } from "@/store/useStudioStore";

const ACCEPTED = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".svg"];

export default function DropZone() {
  const setImage = useStudioStore((s) => s.setImage);
  const vectorize = useStudioStore((s) => s.vectorize);
  const status = useStudioStore((s) => s.status);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const loaded = await loadImageFile(file);
        setImage(loaded);
        // Reproducir la preview con la imagen cargada
        await vectorize();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo procesar el archivo");
      }
    },
    [setImage, vectorize]
  );

  return (
    <div className="flex h-full flex-col">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
          drag
            ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.05)]"
            : "border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={drag ? "drag" : "idle"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]">
              <UploadCloud size={30} />
            </div>
            <h2 className="max-w-md text-xl font-semibold text-[hsl(var(--text))] sm:text-2xl">
              {drag ? "¡Suéltala aquí!" : "Arrastra una imagen para vectorizarla"}
            </h2>
            <p className="max-w-md text-sm text-[hsl(var(--text-muted))]">
              PNG · JPG · WEBP · BMP · TIFF. Convierte logotipos, ilustraciones,
              stickers y dibujos en SVG editables de alta calidad.
            </p>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface-hover px-4 py-2 text-sm font-medium text-[hsl(var(--text))]">
              <ImageIcon size={16} /> Elegir archivo
            </span>
            {status === "processing" && (
              <div className="mt-2 flex items-center gap-2 text-sm text-[hsl(var(--text-muted))]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--accent))] border-t-transparent" />
                Procesando…
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
          >
            <FileWarning size={16} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
        <span>Formatos: {ACCEPTED.filter((f) => f !== ".svg").join(" ")}</span>
        <span>El análisis se ejecuta 100% en tu navegador</span>
      </div>
    </div>
  );
}
