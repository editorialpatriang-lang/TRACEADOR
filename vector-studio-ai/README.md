# 🧪 Vector Studio AI

> **Convierte imágenes raster en vectores SVG editables de alta calidad — directo en tu navegador.**

Vector Studio AI es una aplicación web profesional que transforma **PNG, JPG, WEBP, BMP y TIFF**
en **vectores limpios y editables**, pensada para **logotipos, ilustraciones, stickers, DTF,
serigrafía, corte láser, CNC e impresión**.

No es un simple *trace*: el sistema hace **cuantización perceptual de color**, **análisis
automático de la imagen** y **trazado por capas con curvas Bézier optimizadas**, con un
resultado comparable a servicios comerciales como *Vectorizer.ai* o *Novage*.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript estricto" />
  <img src="https://img.shields.io/badge/Potrace-100%25%20TS-8A2BE2" alt="Motor Potrace en TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/19%20tests-passing-2ea44f" alt="19 tests" />
</p>

---

## 📑 Tabla de contenidos

- [✨ Características](#-características)
- [🚀 Inicio rápido](#-inicio-rápido)
- [🧱 Stack tecnológico](#-stack-tecnológico)
- [📁 Estructura del proyecto](#-estructura-del-proyecto)
- [🔌 API](#-api)
- [⚙️ Variables de entorno](#️-variables-de-entorno)
- [🐳 Docker](#-docker)
- [🖥️ Cómo usar](#️-cómo-usar)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contribuir](#-contribuir)
- [📄 Licencia](#-licencia)

---

## ✨ Características

### 🧠 Vectorización inteligente
- **Motor Potrace real en TypeScript** — port fiel del algoritmo de Peter Selinger con ajuste
  de curvas por **mínimos cuadrados**, detección de esquinas y **optimización de segmentos**.
- **Cuantización de color por *median cut*** → capas de color perfectamente separadas, sin
  costuras ni dobles rellenos.
- **Análisis automático** de la imagen: colores, ruido, contraste, transparencia y fondo.
- **Clasificación de tipo**: Logo · Ilustración · Dibujo · Fotografía · Sticker · Texto.
- **Preprocesado**: reducción de ruido, eliminación de fondo, corrección de contraste y
  reducción de artefactos JPG.

### 🎛️ Experiencia profesional
- **Vista previa instantánea** al mover cualquier parámetro (con debounce).
- **Visor Original / Vector** con **zoom y pan sincronizados** y **comparador deslizante**.
- **Overlay de nodos Bézier** y **editor de nodos con Fabric.js** (puntos y manecillas
  arrastrables sobre cada capa).
- **Panel de capas**: ocultar, cambiar color, eliminar y **fusionar**.
- **Exportación** a **SVG · PNG · WEBP · PDF · EPS · AI · DXF**.
- Procesamiento en **Web Workers** (no bloquea la UI), **dark/light mode** y diseño
  responsive inspirado en Figma / Canva / Illustrator.

---

## 🚀 Inicio rápido

```bash
# Requisitos: Node.js ≥ 18.18 (recomendado 20+)
git clone https://github.com/<tu-usuario>/vector-studio-ai.git
cd vector-studio-ai

npm install

# Variables de entorno (opcional)
cp .env.example .env.local

# Desarrollo  →  http://localhost:3000
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

## 🧱 Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Next.js 15 · React 19 · TypeScript (estricto) · Tailwind CSS · Framer Motion · Fabric.js · React Query · Zustand |
| **Procesado** | Motor Potrace propio (TS) · Cuantización median-cut · Análisis de imagen |
| **Optimización** | SVGO (servidor) + minificador ligero (cliente/worker) |
| **Backend** | Next.js Route Handlers (API) |
| **Tests** | Vitest |
