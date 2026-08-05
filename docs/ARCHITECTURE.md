# Arquitectura

## Visión general

```
┌──────────────────────────────────────────────────────────────┐
│                        Cliente (Next.js)                     │
│  ┌──────────┐   ┌───────────────┐   ┌──────────────────────┐ │
│  │  DropZone │──▶│ imageLoader   │──▶│  Zustand (store)    │ │
│  └──────────┘   └───────────────┘   └──────────┬───────────┘ │
│                                                │             │
│   vectorizeService ──▶ Web Workers (tracer)    │             │
│        │                                        ▼             │
│        │                                   pipeline.ts        │
│   Viewer (SVG) · Editor (Fabric) · Options · Layers · Export  │
└──────────────┬────────────────────────────────────────────────┘
               │ (mismo pipeline)
               ▼
        Next.js Route Handlers (/api/*)
```

El **pipeline** (`processing/pipeline.ts`) es una función **pura** sin dependencias de DOM,
por lo que corre idéntica en tres contextos:

1. **Web Worker** (cliente, recomendado): no bloquea la UI, buffer RGBA transferido por
   `transferable`.
2. **Síncrono** (fallback si no hay `Worker`).
3. **Servidor** (Route Handlers `/api/trace`, `/api/analyze`, `/api/preprocess`).

## Flujo del pipeline

```
RGBA ─▶ Analizar (colores/ruido/contraste/transparencia/fondo/tipo)
     ─▶ Preprocesar (ruido ✔ / eliminar fondo ✔ / contraste)
     ─▶ Cuantizar (median-cut → paleta N colores)
     ─▶ Por color: máscara binaria ─▶ Potrace ─▶ Bézier ─▶ capa
     ─▶ Ordenar capas por cobertura ─▶ ensamblar SVG ─▶ optimizar → TraceResult
```

## Componentes del motor

### `processing/potrace/`
- `geometry.ts` — vectores, productos cruzados/dot, matemática de ajuste.
- `bitmap.ts` — representación de luminancia, umbral **Otsu** y RGBA→luminancia.
- `potrace.ts` — el algoritmo: descomposición de contornos (`findpath`/`xorPath`),
  aproximación poligonal (`calcLon`/`bestPolygon`), ajuste de vértices por mínimos
  cuadrados, suavizado y **optimización de curva** (`optiCurve`), y renderizado a `d=`.

### `processing/quantization/medianCut.ts`
Divide de forma iterativa las cajas de color por el eje de mayor rango hasta alcanzar la
paleta objetivo, luego promedia y ordena por frecuencia.

### `processing/analysis/`
- `analyze.ts` — métricas muestreadas (rápidas en imágenes grandes).
- `classify.ts` — heurísticas → `ImageKind` + confianza.

### `processing/pipeline.ts`
Orquesta todo y traduce `VectorOptions` → parámetros Potrace.

## Estado (`store/useStudioStore.ts`)

Zustand centraliza imagen, opciones, resultado, visor (zoom/pan/ocultas), tema y acciones.
`setOptions` programa la re-vectorización con **debounce** (vista previa instantánea sin
saturar los workers).

## Aislamiento de responsabilidades

| Carpeta | Responsabilidad | Sin acceso a |
|---------|-----------------|--------------|
| `processing/**` | Algoritmos puros | DOM, React |
| `utils/**` | Helpers puros | DOM (salvo `svg/export`) |
| `services/**` | Carga de imagen y workers | UI |
| `components/**` | Presentación y eventos | Lógica de negocio |
| `store/**` | Estado y acciones | Render |
| `export/**` | Serialización a formatos | React |
