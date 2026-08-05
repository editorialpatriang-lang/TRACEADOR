/**
 * Parser de rutas SVG (subconjunto M/C/L y variantes en minúscula).
 * Convierte un atributo "d" en una lista de comandos normalizados a operadores
 * absolutos, útil para exportar a PDF/EPS/DXF.
 */

export interface PathCommand {
  op: "M" | "L" | "C";
  args: number[];
}

const NUM_RE = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

/** Tokeniza una cadena "d" en tokens numéricos y de comando. */
export function tokenizePath(d: string): string[] {
  const tokens: string[] = [];
  const re = /[MmLlCcZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) tokens.push(m[0]);
  return tokens;
}

/** Parsea "d" a comandos absolutos M/L/C. Otras letras se ignoran. */
export function parsePath(d: string): PathCommand[] {
  const tokens = tokenizePath(d);
  const commands: PathCommand[] = [];
  let cursor = 0;
  let cur: { x: number; y: number } = { x: 0, y: 0 };
  let start: { x: number; y: number } = { x: 0, y: 0 };

  while (cursor < tokens.length) {
    const tok = tokens[cursor];
    if (/[a-zA-Z]/.test(tok)) {
      cursor++;
      const op = tok.toUpperCase();
      const rel = tok === tok.toLowerCase();
      if (op === "M") {
        const args = readNumbers(tokens, cursor, 2);
        cursor += 2;
        let x = args[0] + (rel ? cur.x : 0);
        let y = args[1] + (rel ? cur.y : 0);
        commands.push({ op: "M", args: [x, y] });
        start = { x, y };
        cur = { x, y };
        // M seguido de pares extra => linetos implícitos
        while (cursor < tokens.length && !/[a-zA-Z]/.test(tokens[cursor])) {
          const a2 = readNumbers(tokens, cursor, 2);
          cursor += 2;
          x = a2[0] + (rel ? cur.x : 0);
          y = a2[1] + (rel ? cur.y : 0);
          commands.push({ op: "L", args: [x, y] });
          cur = { x, y };
        }
      } else if (op === "L") {
        while (cursor < tokens.length && !/[a-zA-Z]/.test(tokens[cursor])) {
          const a2 = readNumbers(tokens, cursor, 2);
          cursor += 2;
          const x = a2[0] + (rel ? cur.x : 0);
          const y = a2[1] + (rel ? cur.y : 0);
          commands.push({ op: "L", args: [x, y] });
          cur = { x, y };
        }
      } else if (op === "C") {
        while (cursor < tokens.length && !/[a-zA-Z]/.test(tokens[cursor])) {
          const a2 = readNumbers(tokens, cursor, 6);
          cursor += 6;
          commands.push({
            op: "C",
            args: [
              a2[0] + (rel ? cur.x : 0), a2[1] + (rel ? cur.y : 0),
              a2[2] + (rel ? cur.x : 0), a2[3] + (rel ? cur.y : 0),
              a2[4] + (rel ? cur.x : 0), a2[5] + (rel ? cur.y : 0),
            ],
          });
          cur = { x: commands[commands.length - 1].args[4], y: commands[commands.length - 1].args[5] };
        }
      } else if (op === "Z") {
        commands.push({ op: "L", args: [start.x, start.y] });
        cur = { ...start };
      }
    } else {
      // Número suelto sin comando: ignorar para evitar bucles
      cursor++;
    }
  }
  return commands;
}

function readNumbers(tokens: string[], from: number, count: number): number[] {
  const out: number[] = [];
  let i = from;
  while (out.length < count && i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
    out.push(parseFloat(tokens[i]));
    i++;
  }
  return out;
}

/** Convierte comandos a polilínea aproximada (muestreo de Béziers). */
export function commandsToPolyline(commands: PathCommand[], samplesPerCurve = 8): Array<Array<{ x: number; y: number }>> {
  const polys: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> | null = null;
  let pt: { x: number; y: number } = { x: 0, y: 0 };

  for (const c of commands) {
    if (c.op === "M") {
      if (current && current.length) polys.push(current);
      current = [{ x: c.args[0], y: c.args[1] }];
      pt = { x: c.args[0], y: c.args[1] };
    } else if (c.op === "L") {
      current?.push({ x: c.args[0], y: c.args[1] });
      pt = { x: c.args[0], y: c.args[1] };
    } else if (c.op === "C") {
      const [x1, y1, x2, y2, x3, y3] = c.args;
      for (let s = 1; s <= samplesPerCurve; s++) {
        const t = s / samplesPerCurve;
        const u = 1 - t;
        const x = u * u * u * pt.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
        const y = u * u * u * pt.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
        current?.push({ x, y });
      }
      pt = { x: x3, y: y3 };
    }
  }
  if (current && current.length) polys.push(current);
  return polys;
}
