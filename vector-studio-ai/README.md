# Vector Studio AI

> Convierte imágenes raster (PNG, JPG, WEBP, BMP, TIFF) en vectores SVG editables de alta calidad, directamente en tu navegador.

![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript estricto](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Potrace 100% TS](https://img.shields.io/badge/Potrace-100%25_TS-8A2BE2)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-19%20passing-2ea44f)

Vector Studio AI es una aplicación web profesional que transforma imágenes raster en
**vectores limpios y editables**, pensada para **logotipos, ilustraciones, stickers, DTF,
serigrafía, corte láser, CNC e impresión**.

No es un simple *trace*: el sistema aplica **cuantización perceptual de color**, **análisis
automático de la imagen** y **trazado por capas con curvas Bézier optimizadas**, con un
resultado comparable a servicios comerciales como *Vectorizer.ai* o *Novage*.

---

## Tabla de contenidos

- [Características](#características)
- [Inicio rápido](#inicio-rápido)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API](#api)
- [Variables de entorno](#variables-de-entorno)
- [Docker](#docker)
- [Uso](#uso)
- [Decisiones de arquitectura](#decisiones-de-arquitectura)
- [Roadmap](#roadmap)
- [Calidad](#calidad)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## Características

### Vectorización inteligente

- **Motor Potrace real en TypeScript** — port fiel del algoritmo de Peter Selinger, con
  ajuste de curvas por mínimos cuadrados, detección de esquinas y optimización de segmentos.
- **Cuantización de color por *median cut*** → capas de color perfectamente separadas, sin
  costuras ni dobles rellenos.
- **Análisis automático** de la imagen: colores, ruido, contraste, transparencia y fondo.
- **Clasificación de tipo**: Logo · Ilustración · Dibujo · Fotografía · Sticker · Texto.
- **Preprocesado**: reducción de ruido, eliminación de fondo, corrección de contraste y
  reducción de artefactos JPG.

### Experiencia profesional

- **Vista previa instantánea** al modificar cualquier parámetro (con debounce).
- **Visor Original / Vector** con zoom y pan sincronizados y comparador deslizante.
- **Overlay de nodos Bézier** y **editor de nodos con Fabric.js** (puntos y manecillas
  arrastrables sobre cada capa).
- **Panel de capas**: ocultar, cambiar color, eliminar y fusionar.
- **Exportación** a SVG · PNG · WEBP · PDF · EPS · AI · DXF.
- Procesamiento en **Web Workers** (no bloquea la UI), **dark/light mode** y diseño
  responsive inspirado en Figma / Canva / Illustrator.

---

## Inicio rápido

```bash
# Requisitos: Node.js >= 18.18 (recomendado 20+)
git clone https://github.com/<tu-usuario>/vector-studio-ai.git
cd vector-studio-ai

npm install

# Variables de entorno (opcional)
cp .env.example .env.local

# Desarrollo  ->  http://localhost:3000
npm run dev
npm run dev:turbo        # con Turbopack

# Producción
npm run build
npm start

# Calidad
npm run typecheck
npm test                 # 19 tests (vitest)
```

---

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| Frontend | Next.js 15, React 19, TypeScript (estricto), Tailwind CSS, Framer Motion, Fabric.js, React Query, Zustand |
| Procesado | Motor Potrace propio (TS), cuantización median-cut, análisis de imagen |
| Optimización | SVGO (servidor) + minificador ligero (cliente/worker) |
| Backend | Next.js Route Handlers (API) |
| Tests | Vitest |

---

## Estructura del proyecto

```
src/
├── app/                    # Página principal + API routes
│   └── api/                # trace · analyze · preprocess · optimize
├── components/
│   ├── panels/             # Opciones, Capas, Resultados
│   ├── editor/             # Editor de nodos (Fabric.js)
│   └── toolbar/            # Exportación
├── hooks/
├── services/               # Carga de imágenes + pool de Web Workers
├── store/                  # Estado global (Zustand)
├── utils/                  # color, svg, parsePath, layers
├── workers/                # tracer.worker.ts
├── processing/
│   ├── potrace/            # Motor Potrace (geometry, bitmap, algoritmo)
│   ├── quantization/       # median-cut
│   ├── preprocess/         # ruido, fondo, contraste
│   ├── analysis/           # análisis + clasificación
│   └── pipeline.ts         # orquestador (puro, sin DOM)
├── export/                 # PDF, EPS, DXF, AI, PNG/WEBP, SVGO
└── types/                  # tipos compartidos del dominio
```

El **pipeline** (`processing/pipeline.ts`) es una función **pura sin dependencias de DOM**,
por lo que corre idéntica en tres contextos: **Web Worker**, fallback síncrono en el
navegador y **servidor** (Route Handlers). Cada archivo tiene una única responsabilidad.

> Mas detalle en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y
> [`docs/PROCESSING.md`](docs/PROCESSING.md). Guía de debugging por etapas en
> [`docs/ETAPAS.md`](docs/ETAPAS.md).

---

## API

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/trace` | POST | Vectoriza un buffer RGBA (JSON) y devuelve el `TraceResult` |
| `/api/analyze` | POST | Analiza la imagen (colores, ruido, tipo…) |
| `/api/preprocess` | POST | Aplica preprocesado (ruido, fondo, contraste) |
| `/api/optimize` | POST | Optimiza un SVG con **SVGO** en el servidor |

> En el navegador la vectorización corre en un **Web Worker** (mejor rendimiento y sin
> sobrecargar el servidor). Las rutas API exponen el mismo pipeline en el backend.

---

## Variables de entorno

| Variable | Descripción | Defecto |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_NAME` | Nombre mostrado en la app | `Vector Studio AI` |
| `API_MAX_BODY_MB` | Límite de subida en API (MB) | `50` |
| `AI_RUNTIME` | `pure` (motor JS) u `onnxruntime-node` (experimental) | `pure` |
| `REALESRGAN_MODEL_PATH` / `SAM_MODEL_PATH` / `BGR_MODEL_PATH` | Pesos ONNX opcionales | *(vacío)* |

---

## Docker

```bash
docker compose up --build
# -> http://localhost:3000
```

El `Dockerfile` usa el output **standalone** de Next.js para una imagen mínima.

---

## Uso

1. **Arrastra una imagen** (PNG, JPG, WEBP, BMP, TIFF) o haz clic en *"Elegir archivo"*.
2. El sistema **analiza** la imagen y la **vectoriza automáticamente** en pocos segundos.
3. Ajusta **cantidad de colores, suavizado, simplificación, precisión…** con vista previa en vivo.
4. En el **visor** compara original vs. vector (deslizador) y revisa los **nodos Bézier**.
5. Usa el **panel de capas** para refinar colores y formas.
6. **Exporta** en el formato que necesites para tu flujo de trabajo.

---

## Decisiones de arquitectura

- **Motor de trazado propio (Potrace en TypeScript)** en lugar de depender de binarios
  nativos (`potrace`/`opencv`) — portabilidad total a navegador y Docker.
- **SVGO en el servidor** + minificador ligero en cliente/worker para no inflar el bundle
  (página cliente: ~138 kB).
- Los modelos de IA pesados (**Real-ESRGAN, SAM, eliminación de fondo**) requieren pesos ONNX
  de cientos de MB. Se deja el **cableado listo** (`.env`, `AI_RUNTIME`, rutas, punto de
  enchufe en el pipeline), con el motor `pure` 100% funcional como defecto. Puedes añadir
  los pesos y un runtime ONNX sin tocar el núcleo.

---

## Roadmap

- [x] Motor Potrace en TypeScript (validado con tests)
- [x] Cuantización median-cut + capas de color separadas
- [x] Análisis automático + clasificación de tipo de imagen
- [x] Visor con zoom/pan sincronizados y comparador deslizante
- [x] Editor de nodos con Fabric.js
- [x] Exportación SVG/PNG/WEBP/PDF/EPS/AI/DXF
- [x] Docker + docker-compose
- [ ] Integración ONNX (Real-ESRGAN, SAM) con pesos descargables
- [ ] Edición avanzada de nodos (añadir/eliminar, subdividir curvas)
- [ ] Modo batch / API de procesamiento masivo
- [ ] Atajos de teclado y historial de deshacer

---

## Calidad

- TypeScript **estricto** (`strict: true`).
- **19 tests** con Vitest: motor Potrace, cuantización, pipeline end-to-end y exportadores.
- Build de producción validado (`npm run build`).

---

## Contribuir

1. Haz un fork del repositorio.
2. Crea una rama: `git checkout -b feature/mi-mejora`.
3. Haz tus cambios siguiendo las convenciones (un archivo, una responsabilidad).
4. Verifica: `npm run typecheck && npm test`.
5. Envía un Pull Request describiendo el cambio.

---

## Licencia

Distribuido bajo licencia **MIT** para el código de la aplicación.

> El motor Potrace está basado en el algoritmo de Peter Selinger (GPL) a través de un port
> JavaScript (MIT) de referencia. Revisa las fuentes originales para confirmar la licencia
> aplicable a tu uso del algoritmo de trazado.

---

*Hecho para diseñadores, impresores y creadores.*

