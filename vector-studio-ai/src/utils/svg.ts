/**
 * Utilidades SVG: minificado y optimización ligera.
 * La integración con SVGO completa vive en el servidor (src/export/svgoServer.ts)
 * para no inflar el bundle del cliente ni del Web Worker.
 */

/** Minificador ligero: colapsa espacio y elimina decimales redundantes. */
export function minifySvg(svg: string): string {
  return svg
    .replace(/\n\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\.0+(\s|,|")/g, "$1")
    .replace(/ ([<>])/g, "$1")
    .trim();
}

/** Variante síncrona usada dentro del worker y del pipeline. */
export function optimizeSvg(svg: string): string {
  return minifySvg(svg);
}

/** Envuelve un path en un documento SVG autónomo. */
export function wrapPathTag(d: string, width: number, height: number, fill = "#000"): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}"><path d="${d}" fill="${fill}"/></svg>`
  );
}

