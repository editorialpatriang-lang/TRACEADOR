# Etapas de desarrollo (guía de debugging)

El proyecto se construyó por etapas independientes y verificables. Si aparece un bug,
debuggea primero la etapa correspondiente; cada una tiene su `*.test.ts`.

| # | Etapa | Artefactos | Cómo verificar |
|---|-------|-----------|----------------|
| 1 | Scaffold (Next15+TS+Tailwind+deps) | `package.json`, configs, `npm install` | `npm run dev` arranca |
| 2 | **Motor Potrace** (núcleo) | `processing/potrace/*` | `npx vitest run src/processing/potrace` |
| 3 | Color + cuantización + preprocesado | `utils/color`, `quantization/*`, `preprocess/*` | `npx vitest run src/processing/quantization` |
| 4 | Pipeline end-to-end | `processing/pipeline.ts` | `npx vitest run src/processing/pipeline` |
| 5 | Workers + servicios | `workers/*`, `services/*` | Probar en navegador (devtools) |
| 6 | Visor (SVG + zoom/pan + comparador) | `components/Viewer*` | Interacción manual |
| 7 | Panel de opciones (vista previa) | `panels/OptionsPanel` | Mover sliders → re-trazado |
| 8 | Exportación (todos los formatos) | `export/*` | `npx vitest run src/export` |
| 9 | UI (layout, capas, resultados, editor Fabric) | `components/*` | Interacción manual |
| 10 | Backend API + SVGO servidor | `app/api/*` | `curl -X POST /api/optimize` |
| 11 | Infraestructura y docs | `Dockerfile`, `docker-compose`, `README`, `docs/*` | `docker compose up --build` |

## Comandos de diagnóstico

```bash
# Suite completa
npm test

# Solo el motor Potrace (la pieza más delicada)
npx vitest run src/processing/potrace/potrace.test.ts

# Chequeo de tipos estricto
npm run typecheck

# Build de producción (detecta problemas de bundling: worker, Fabric, svgo)
npm run build
```

## Puntos de integración de IA (opcional)

Para activar Real-ESRGAN / SAM / eliminación de fondo con ONNX:

1. Coloca los pesos en `models/` (ver `.env.example`).
2. Usa `AI_RUNTIME=onnxruntime-node` + `onnxruntime-node` instalado.
3. Enchúfalos en `processing/pipeline.ts` (etapas "escalado IA" y "segmentación")
   conservando el respaldo `pure`.

> El motor actual funciona **sin** esos pesos (100% JS puro). Los puntos de integración
> están preparados para no tocar el resto de la arquitectura.
