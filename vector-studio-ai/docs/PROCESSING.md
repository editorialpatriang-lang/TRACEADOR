# Procesado de imagen (documentación técnica)

## 1. Análisis automático

Muestreo con paso adaptativo (`SAMPLE_STEP`). Métricas:

- **Colores únicos** — conteo cuantizado a 5 bits por canal.
- **Histograma** — frecuencias relativas (top 24) para fondo/dominantes.
- **Ruido** — varianza local de alta frecuencia (adyacencias).
- **Contraste** — desviación estándar de luminancia normalizada.
- **Transparencia / alfa** — fracción de píxeles semitransparentes.
- **Fondo** — color dominante del histograma.
- **Tipo** — clasificación por heurísticas (`classify.ts`).

## 2. Preprocesado (`preprocess.ts`)

| Etapa | Función | Notas |
|-------|---------|-------|
| Ruido | `medianFilter` | Solo se aplica con `denoise > 50` para no erosionar bordes |
| Fondo | `removeColor` / `removeBackgroundFromEdges` | Promedia bordes para detectar el color de fondo |
| Contraste | `adjustContrast` | Ajuste delta sobre 128 |
| Artefactos JPG | `reduceJpegArtifacts` | Blur + mezcla |

## 3. Cuantización (`median-cut`)

- Se recogen solo píxeles **opacos** (los transparentes se excluyen del relleno).
- Median-cut itera dividiendo la caja de mayor rango por su eje más largo en la mediana.
- Cada píxel se asigna al color de paleta **más cercano** (distancia euclidiana RGB).
- `groupSimilar` funde capas con ΔE < 30; `ignoreSmallColors` descarta cobertura muy baja.

## 4. Trazado Potrace por color

Para cada color `k` de la paleta:

```
máscara[p] = (alphaIndex[p] === k) ? 0 : 255      // negro = forma
traceLuminance(máscara, w, h, params)            // Potrace
```

- Las máscaras por color **particionan** la imagen (sin solapamientos ni huecos), evitando
  costuras por doble relleno.
- Los agujeros internos se representan como contornos cerrados adicionales combinados con
  `fill-rule="evenodd"`.

### Mapeo de opciones → Potrace

| Opción (UI) | Parámetro Potrace |
|-------------|-------------------|
| `minRadius` + `denoise` | `turdSize` (suprime motas) |
| `cornerDetection` | `alphaMax` (umbral de esquina) |
| `simplification` | `optTolerance` |
| `smoothCurves` | `optCurve` |

## 5. Ensamblado y optimización

- Orden de capas por cobertura (mayor primero).
- `optimizeSvg` = minificador ligero dentro del worker; **SVGO completo** vía `/api/optimize`
  en el servidor (multipass, precisión 2).

## 6. Exportación

| Formato | Implementación |
|---------|----------------|
| SVG | `result.svg` directo |
| PNG / WEBP | Rasterización del SVG en canvas (escala ×4) |
| PDF | Escritor PDF propio con rutas Bézier (`export/pdf.ts`) |
| EPS | PostScript (`moveto/curveto/setrgbcolor/fill`) |
| AI | PDF con cabecera EPS heredada (Illustrator lo abre) |
| DXF | `POLYLINE` con polilíneas muestreadas de las Béziers |

## Nodos y edición (Fabric.js)

Cada capa se convierte en `fabric.Path`. Al seleccionar, se dibujan círculos en los
puntos y en las manecillas (coordenadas `C`); arrastrarlos actualiza `path.path` y
re-renderiza. Ocultar/color/eliminar/fusionar operan sobre `result.layers` y reconstruyen
el SVG (`utils/layers.ts`).
