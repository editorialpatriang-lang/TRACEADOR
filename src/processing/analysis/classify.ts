/**
 * Clasificación automática del tipo de imagen por heurísticas derivadas del
 * análisis (logo, ilustración, dibujo, fotografía, sticker, texto).
 * Devuelve el tipo más probable y una confianza 0..1.
 */
import { ImageKind } from "@/types";
import { hexToRgb } from "@/utils/color";

function isMonochrome(dominantColors: string[]): boolean {
  return (
    dominantColors.length > 0 &&
    dominantColors.every((hex) => {
      const rgb = hexToRgb(hex);
      return Math.abs(rgb.r - rgb.g) < 24 && Math.abs(rgb.g - rgb.b) < 24;
    })
  );
}

export function classifyImage(
  colorCount: number,
  noise: number,
  contrast: number,
  transparency: number,
  hasAlpha: boolean,
  dominantColors: string[]
): { kind: ImageKind; confidence: number } {
  const flat = dominantColors.length;
  const mono = isMonochrome(dominantColors);

  // Sticker: transparencia + pocos colores + buen contraste
  if (hasAlpha && transparency > 0.05 && flat <= 8 && contrast > 0.35 && noise < 0.4) {
    return { kind: "sticker", confidence: 0.82 };
  }

  // Logo: muy pocos colores y alto contraste
  if (flat <= 4 && contrast > 0.5 && noise < 0.35) {
    return { kind: "logo", confidence: 0.86 };
  }

  // Dibujo: monocromo de alto contraste
  if (mono && contrast > 0.4 && colorCount < 4000) {
    return { kind: "drawing", confidence: 0.75 };
  }

  // Texto: pocos colores, alto contraste, bajo ruido
  if (flat <= 6 && contrast > 0.4 && noise < 0.3) {
    return { kind: "text", confidence: 0.7 };
  }

  // Fotografía: muchos colores y ruido alto (gradientes/ruido)
  if (colorCount > 4000 && noise > 0.35) {
    return { kind: "photography", confidence: 0.75 };
  }

  // Ilustración: rango medio de colores
  if (flat <= 64 && colorCount > 8 && noise < 0.5) {
    return { kind: "illustration", confidence: 0.6 };
  }

  return { kind: "unknown", confidence: 0.4 };
}

/** Etiqueta legible para la UI. */
export const KIND_LABELS: Record<ImageKind, string> = {
  logo: "Logo",
  illustration: "Ilustración",
  drawing: "Dibujo",
  photography: "Fotografía",
  sticker: "Sticker",
  text: "Texto",
  unknown: "Desconocido",
};
