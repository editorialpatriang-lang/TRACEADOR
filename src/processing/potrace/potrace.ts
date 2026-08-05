/**
 * Motor de trazado Potrace en TypeScript.
 * Port fiel del algoritmo Potrace (Peter Selinger), basado en el port JS de referencia.
 * Convierte una imagen binaria en curvas de Bézier cúbicas editables.
 * Ver: https://potrace.sourceforge.net/
 */
import {
  Point, Sum, Quad, Opti, mod, sign, xprod, cyclic, dorth_infty,
  ddenom, dpara, cprod, iprod, iprod1, ddist, interval, quadform, tangent, bezier,
} from "./geometry";
import { Bitmap, otsuThreshold } from "./bitmap";

export type TurnPolicy = "black" | "white" | "left" | "right" | "minority" | "majority";

export interface TraceParams {
  turnPolicy: TurnPolicy;
  turdSize: number;
  alphaMax: number;
  optCurve: boolean;
  optTolerance: number;
  threshold: number;
  blackOnWhite: boolean;
  color: string;
  background: string;
  width: number | null;
  height: number | null;
}

export const DEFAULT_TRACE_PARAMS: TraceParams = {
  turnPolicy: "minority",
  turdSize: 2,
  alphaMax: 1,
  optCurve: true,
  optTolerance: 0.2,
  threshold: -1,
  blackOnWhite: true,
  color: "black",
  background: "transparent",
  width: null,
  height: null,
};

/** Curva Bézier que describe un trazado cerrado. */
export class Curve {
  n: number;
  tag: string[];
  c: Point[];
  vertex: Point[];
  alpha: number[];
  alpha0: number[];
  beta: number[];
  constructor(n: number) {
    this.n = n;
    this.tag = new Array<string>(n);
    this.c = new Array<Point>(n * 3);
    this.vertex = new Array<Point>(n);
    this.alpha = new Array<number>(n);
    this.alpha0 = new Array<number>(n);
    this.beta = new Array<number>(n);
  }
}

/** Un trazado extraído del bitmap (contorno exterior o agujero). */
export interface TracedPath {
  area: number;
  len: number;
  sign: string;
  curve: Curve;
  pt: Point[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  m: number;
  po: number[];
  x0: number;
  y0: number;
  sums: Sum[];
  lon: number[];
}

function newPath(): TracedPath {
  return {
    area: 0, len: 0, sign: "", curve: {} as Curve, pt: [],
    minX: 100000, minY: 100000, maxX: -1, maxY: -1,
    m: 0, po: [], x0: 0, y0: 0, sums: [], lon: [],
  };
}

/* ============================================================
 * PASO 1: descomposición en trazados (bm -> pathlist)
 * ============================================================ */

/** Voto de mayoría local usado por la política de giro. */
function majority(bm: Bitmap, x: number, y: number): number {
  let i: number, a: number, ct: number;
  for (i = 2; i < 5; i++) {
    ct = 0;
    for (a = -i + 1; a <= i - 1; a++) {
      ct += bm.getValueAt(x + a, y + i - 1) ? 1 : -1;
      ct += bm.getValueAt(x + i - 1, y + a) ? 1 : -1;
      ct += bm.getValueAt(x + a, y - i) ? 1 : -1;
      ct += bm.getValueAt(x - i, y + a) ? 1 : -1;
    }
    if (ct > 0) return 1;
    if (ct < 0) return 0;
  }
  return 0;
}

/** Sigue el contorno de una componente conexa devolviendo sus píxeles. */
function findPath(bm: Bitmap, point: Point, params: TraceParams): TracedPath {
  const path = newPath();
  let x = point.x;
  let y = point.y;
  let dirx = 0;
  let diry = 1;
  let tmp: number;
  path.sign = bm.getValueAt(point.x, point.y) ? "+" : "-";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    path.pt.push(new Point(x, y));
    if (x > path.maxX) path.maxX = x;
    if (x < path.minX) path.minX = x;
    if (y > path.maxY) path.maxY = y;
    if (y < path.minY) path.minY = y;
    path.len++;
    x += dirx;
    y += diry;
    path.area -= x * diry;
    if (x === point.x && y === point.y) break;

    const l = bm.getValueAt(x + (dirx + diry - 1) / 2, y + (diry - dirx - 1) / 2);
    const r = bm.getValueAt(x + (dirx - diry - 1) / 2, y + (diry + dirx - 1) / 2);

    if (r && !l) {
      const turn =
        params.turnPolicy === "right" ||
        (params.turnPolicy === "black" && path.sign === "+") ||
        (params.turnPolicy === "white" && path.sign === "-") ||
        (params.turnPolicy === "majority" && majority(bm, x, y) === 1) ||
        (params.turnPolicy === "minority" && majority(bm, x, y) === 0);
      if (turn) {
        tmp = dirx; dirx = -diry; diry = tmp;
      } else {
        tmp = dirx; dirx = diry; diry = -tmp;
      }
    } else if (r) {
      tmp = dirx; dirx = -diry; diry = tmp;
    } else if (!l) {
      tmp = dirx; dirx = diry; diry = -tmp;
    }
  }
  return path;
}

/** Marca como visitado el interior del trazado (operación XOR por filas). */
function xorPath(bm: Bitmap, path: TracedPath): void {
  let y1 = path.pt[0].y;
  const len = path.len;
  let x: number, y: number, maxX: number, minY: number, j: number, indx: number;
  for (let i = 1; i < len; i++) {
    x = path.pt[i].x;
    y = path.pt[i].y;
    if (y !== y1) {
      minY = y1 < y ? y1 : y;
      maxX = path.maxX;
      for (j = x; j < maxX; j++) {
        indx = bm.pointToIndex(j, minY) as number;
        bm.data[indx] = bm.data[indx] ? 0 : 1;
      }
      y1 = y;
    }
  }
}

/** Encuentra todos los trazados (exteriores + agujeros) respetando turdSize. */
function bmToPathlist(bm: Bitmap, params: TraceParams): TracedPath[] {
  let threshold = params.threshold;
  if (threshold === -1) threshold = otsuThreshold(bm.data) || 128;

  const blackMap = bm.copy((lum) => {
    const pastTheThreshold = params.blackOnWhite ? lum > threshold : lum < threshold;
    return pastTheThreshold ? 0 : 1;
  });

  function findNext(point: Point): Point | false {
    let i = blackMap.pointToIndex(point) as number;
    while (i < blackMap.size && blackMap.data[i] !== 1) i++;
    return i < blackMap.size ? blackMap.indexToPoint(i) : false;
  }

  const pathlist: TracedPath[] = [];
  let currentPoint: Point | false = new Point(0, 0);
  // eslint-disable-next-line no-cond-assign
  while ((currentPoint = findNext(currentPoint))) {
    const path = findPath(blackMap, currentPoint, params);
    xorPath(blackMap, path);
    if (path.area > params.turdSize) pathlist.push(path);
  }
  return pathlist;
}

/* ============================================================
 * PASO 2: aproximación poligonal de cada trazado
 * ============================================================ */

/** Sumas acumuladas (moments) de los puntos del trazado. */
function calcSums(path: TracedPath): void {
  let i: number, x: number, y: number;
  path.x0 = path.pt[0].x;
  path.y0 = path.pt[0].y;
  path.sums = [];
  const s = path.sums;
  s.push(new Sum(0, 0, 0, 0, 0));
  for (i = 0; i < path.len; i++) {
    x = path.pt[i].x - path.x0;
    y = path.pt[i].y - path.y0;
    s.push(new Sum(s[i].x + x, s[i].y + y, s[i].xy + x * y, s[i].x2 + x * x, s[i].y2 + y * y));
  }
}

/** Calcula las longitudes de vía "lon" (restricciones de convexidad por vértice). */
function calcLon(path: TracedPath): void {
  const n = path.len;
  const pt = path.pt;
  let dir: number;
  const pivk = new Array<number>(n);
  const nc = new Array<number>(n);
  const ct = new Array<number>(4);
  path.lon = new Array<number>(n);

  const constraint = [new Point(), new Point()];
  let cur = new Point();
  let off = new Point();
  const dk = new Point();
  let foundk = 0;
  let i: number, j: number, k1: number, a: number, b: number, c: number, d: number, k = 0;

  for (i = n - 1; i >= 0; i--) {
    if (pt[i].x !== pt[k].x && pt[i].y !== pt[k].y) k = i + 1;
    nc[i] = k;
  }

  for (i = n - 1; i >= 0; i--) {
    ct[0] = ct[1] = ct[2] = ct[3] = 0;
    dir = (3 + 3 * (pt[mod(i + 1, n)].x - pt[i].x) + (pt[mod(i + 1, n)].y - pt[i].y)) / 2;
    ct[dir]++;
    constraint[0].x = 0; constraint[0].y = 0;
    constraint[1].x = 0; constraint[1].y = 0;
    k = nc[i];
    k1 = i;
    while (1) {
      foundk = 0;
      dir = (3 + 3 * sign(pt[k].x - pt[k1].x) + sign(pt[k].y - pt[k1].y)) / 2;
      ct[dir]++;
      if (ct[0] && ct[1] && ct[2] && ct[3]) {
        pivk[i] = k1;
        foundk = 1;
        break;
      }
      cur.x = pt[k].x - pt[i].x;
      cur.y = pt[k].y - pt[i].y;
      if (xprod(constraint[0], cur) < 0 || xprod(constraint[1], cur) > 0) break;
      if (!(Math.abs(cur.x) <= 1 && Math.abs(cur.y) <= 1)) {
        off.x = cur.x + ((cur.y >= 0 && (cur.y > 0 || cur.x < 0)) ? 1 : -1);
        off.y = cur.y + ((cur.x <= 0 && (cur.x < 0 || cur.y < 0)) ? 1 : -1);
        if (xprod(constraint[0], off) >= 0) {
          constraint[0].x = off.x;
          constraint[0].y = off.y;
        }
        off.x = cur.x + ((cur.y <= 0 && (cur.y < 0 || cur.x < 0)) ? 1 : -1);
        off.y = cur.y + ((cur.x >= 0 && (cur.x > 0 || cur.y < 0)) ? 1 : -1);
        if (xprod(constraint[1], off) <= 0) {
          constraint[1].x = off.x;
          constraint[1].y = off.y;
        }
      }
      k1 = k;
      k = nc[k1];
      if (!cyclic(k, i, k1)) break;
    }
    if (foundk === 0) {
      dk.x = sign(pt[k].x - pt[k1].x);
      dk.y = sign(pt[k].y - pt[k1].y);
      cur.x = pt[k1].x - pt[i].x;
      cur.y = pt[k1].y - pt[i].y;
      a = xprod(constraint[0], cur);
      b = xprod(constraint[0], dk);
      c = xprod(constraint[1], cur);
      d = xprod(constraint[1], dk);
      j = 10000000;
      if (b < 0) j = Math.floor(a / -b);
      if (d > 0) j = Math.min(j, Math.floor(-c / d));
      pivk[i] = mod(k1 + j, n);
    }
  }

  j = pivk[n - 1];
  path.lon[n - 1] = j;
  for (i = n - 2; i >= 0; i--) {
    if (cyclic(i + 1, pivk[i], j)) j = pivk[i];
    path.lon[i] = j;
  }
  for (i = n - 1; cyclic(mod(i + 1, n), j, path.lon[i]); i--) {
    path.lon[i] = j;
  }
}

/** Penalización de un segmento i..j del polígono (error de mínimos cuadrados). */
function penalty3(path: TracedPath, i: number, j: number): number {
  const n = path.len;
  const pt = path.pt;
  const sums = path.sums;
  let x: number, y: number, xy: number, x2: number, y2: number;
  let k: number, a: number, b: number, c: number, s: number;
  let px: number, py: number, ex: number, ey: number;
  let r = 0;
  if (j >= n) {
    j -= n;
    r = 1;
  }
  if (r === 0) {
    x = sums[j + 1].x - sums[i].x;
    y = sums[j + 1].y - sums[i].y;
    x2 = sums[j + 1].x2 - sums[i].x2;
    xy = sums[j + 1].xy - sums[i].xy;
    y2 = sums[j + 1].y2 - sums[i].y2;
    k = j + 1 - i;
  } else {
    x = sums[j + 1].x - sums[i].x + sums[n].x;
    y = sums[j + 1].y - sums[i].y + sums[n].y;
    x2 = sums[j + 1].x2 - sums[i].x2 + sums[n].x2;
    xy = sums[j + 1].xy - sums[i].xy + sums[n].xy;
    y2 = sums[j + 1].y2 - sums[i].y2 + sums[n].y2;
    k = j + 1 - i + n;
  }
  px = (pt[i].x + pt[j].x) / 2 - pt[0].x;
  py = (pt[i].y + pt[j].y) / 2 - pt[0].y;
  ey = pt[j].x - pt[i].x;
  ex = -(pt[j].y - pt[i].y);
  a = (x2 - 2 * x * px) / k + px * px;
  b = (xy - x * py - y * px) / k + px * py;
  c = (y2 - 2 * y * py) / k + py * py;
  s = ex * ex * a + 2 * ex * ey * b + ey * ey * c;
  return Math.sqrt(s);
}

/** Calcula el polígono óptimo (menor penalización) del trazado. */
function bestPolygon(path: TracedPath): void {
  let i: number, j: number, m: number, k: number;
  const n = path.len;
  const pen = new Array<number>(n + 1);
  const prev = new Array<number>(n + 1);
  const clip0 = new Array<number>(n);
  const clip1 = new Array<number>(n + 1);
  const seg0 = new Array<number>(n + 1);
  const seg1 = new Array<number>(n + 1);
  let thispen: number, best: number, c: number;

  for (i = 0; i < n; i++) {
    c = mod(path.lon[mod(i - 1, n)] - 1, n);
    if (c === i) c = mod(i + 1, n);
    clip0[i] = c < i ? n : c;
  }

  j = 1;
  for (i = 0; i < n; i++) {
    while (j <= clip0[i]) {
      clip1[j] = i;
      j++;
    }
  }

  i = 0;
  for (j = 0; i < n; j++) {
    seg0[j] = i;
    i = clip0[i];
  }
  seg0[j] = n;
  m = j;

  i = n;
  for (j = m; j > 0; j--) {
    seg1[j] = i;
    i = clip1[i];
  }
  seg1[0] = 0;

  pen[0] = 0;
  for (j = 1; j <= m; j++) {
    for (i = seg1[j]; i <= seg0[j]; i++) {
      best = -1;
      for (k = seg0[j - 1]; k >= clip1[i]; k--) {
        thispen = penalty3(path, k, i) + pen[k];
        if (best < 0 || thispen < best) {
          prev[i] = k;
          best = thispen;
        }
      }
      pen[i] = best;
    }
  }
  path.m = m;
  path.po = new Array<number>(m);
  for (i = n, j = m - 1; i > 0; j--) {
    i = prev[i];
    path.po[j] = i;
  }
}

/* ============================================================
 * PASO 3: ajuste de vértices + suavizado + optimización de curva
 * ============================================================ */

/** Pendiente y centroide de un segmento [i..j] del trazado. */
function pointslope(path: TracedPath, i: number, j: number, ctr: Point, dir: Point): void {
  const n = path.len;
  const sums = path.sums;
  let x: number, y: number, x2: number, xy: number, y2: number;
  let k: number, a: number, b: number, c: number, lambda2: number, l: number;
  let r = 0;
  while (j >= n) {
    j -= n;
    r += 1;
  }
  while (i >= n) {
    i -= n;
    r -= 1;
  }
  while (j < 0) {
    j += n;
    r -= 1;
  }
  while (i < 0) {
    i += n;
    r += 1;
  }

  x = sums[j + 1].x - sums[i].x + r * sums[n].x;
  y = sums[j + 1].y - sums[i].y + r * sums[n].y;
  x2 = sums[j + 1].x2 - sums[i].x2 + r * sums[n].x2;
  xy = sums[j + 1].xy - sums[i].xy + r * sums[n].xy;
  y2 = sums[j + 1].y2 - sums[i].y2 + r * sums[n].y2;
  k = j + 1 - i + r * n;

  ctr.x = x / k;
  ctr.y = y / k;

  a = (x2 - (x * x) / k) / k;
  b = (xy - (x * y) / k) / k;
  c = (y2 - (y * y) / k) / k;
  lambda2 = (a + c + Math.sqrt((a - c) * (a - c) + 4 * b * b)) / 2;

  a -= lambda2;
  c -= lambda2;

  if (Math.abs(a) >= Math.abs(c)) {
    l = Math.sqrt(a * a + b * b);
    if (l !== 0) {
      dir.x = -b / l;
      dir.y = a / l;
    }
  } else {
    l = Math.sqrt(c * c + b * b);
    if (l !== 0) {
      dir.x = -c / l;
      dir.y = b / l;
    }
  }
  if (l === 0) dir.x = dir.y = 0;
}

/** Ajusta los vértices del polígono a la posición de mínimos cuadrados óptima. */
function adjustVertices(path: TracedPath): void {
  const m = path.m;
  const po = path.po;
  const n = path.len;
  const pt = path.pt;
  const x0 = path.x0;
  const y0 = path.y0;
  const ctr = new Array<Point>(m);
  const dir = new Array<Point>(m);
  const q = new Array<Quad>(m);
  const v = new Array<number>(3);
  let d: number, i: number, j: number, k: number, l: number;
  const s = new Point();

  path.curve = new Curve(m);

  for (i = 0; i < m; i++) {
    j = po[mod(i + 1, m)];
    j = mod(j - po[i], n) + po[i];
    ctr[i] = new Point();
    dir[i] = new Point();
    pointslope(path, po[i], j, ctr[i], dir[i]);
  }

  for (i = 0; i < m; i++) {
    q[i] = new Quad();
    d = dir[i].x * dir[i].x + dir[i].y * dir[i].y;
    if (d === 0.0) {
      for (j = 0; j < 3; j++) for (k = 0; k < 3; k++) q[i].data[j * 3 + k] = 0;
    } else {
      v[0] = dir[i].y;
      v[1] = -dir[i].x;
      v[2] = -v[1] * ctr[i].y - v[0] * ctr[i].x;
      for (l = 0; l < 3; l++) for (k = 0; k < 3; k++) q[i].data[l * 3 + k] = (v[l] * v[k]) / d;
    }
  }

  let Q: Quad, w: Point, dx: number, dy: number, det: number, min: number, cand: number, xmin: number, ymin: number, z: number;
  for (i = 0; i < m; i++) {
    Q = new Quad();
    w = new Point();
    s.x = pt[po[i]].x - x0;
    s.y = pt[po[i]].y - y0;
    j = mod(i - 1, m);
    for (l = 0; l < 3; l++) for (k = 0; k < 3; k++) Q.data[l * 3 + k] = q[j].at(l, k) + q[i].at(l, k);

    while (1) {
      det = Q.at(0, 0) * Q.at(1, 1) - Q.at(0, 1) * Q.at(1, 0);
      if (det !== 0.0) {
        w.x = (-Q.at(0, 2) * Q.at(1, 1) + Q.at(1, 2) * Q.at(0, 1)) / det;
        w.y = (Q.at(0, 2) * Q.at(1, 0) - Q.at(1, 2) * Q.at(0, 0)) / det;
        break;
      }
      if (Q.at(0, 0) > Q.at(1, 1)) {
        v[0] = -Q.at(0, 1);
        v[1] = Q.at(0, 0);
      } else if (Q.at(1, 1)) {
        v[0] = -Q.at(1, 1);
        v[1] = Q.at(1, 0);
      } else {
        v[0] = 1;
        v[1] = 0;
      }
      d = v[0] * v[0] + v[1] * v[1];
      v[2] = -v[1] * s.y - v[0] * s.x;
      for (l = 0; l < 3; l++) for (k = 0; k < 3; k++) Q.data[l * 3 + k] += (v[l] * v[k]) / d;
    }

    dx = Math.abs(w.x - s.x);
    dy = Math.abs(w.y - s.y);
    if (dx <= 0.5 && dy <= 0.5) {
      path.curve.vertex[i] = new Point(w.x + x0, w.y + y0);
      continue;
    }

    min = quadform(Q, s);
    xmin = s.x;
    ymin = s.y;

    if (Q.at(0, 0) !== 0.0) {
      for (z = 0; z < 2; z++) {
        w.y = s.y - 0.5 + z;
        w.x = -(Q.at(0, 1) * w.y + Q.at(0, 2)) / Q.at(0, 0);
        dx = Math.abs(w.x - s.x);
        cand = quadform(Q, w);
        if (dx <= 0.5 && cand < min) {
          min = cand;
          xmin = w.x;
          ymin = w.y;
        }
      }
    }
    if (Q.at(1, 1) !== 0.0) {
      for (z = 0; z < 2; z++) {
        w.x = s.x - 0.5 + z;
        w.y = -(Q.at(1, 0) * w.x + Q.at(1, 2)) / Q.at(1, 1);
        dy = Math.abs(w.y - s.y);
        cand = quadform(Q, w);
        if (dy <= 0.5 && cand < min) {
          min = cand;
          xmin = w.x;
          ymin = w.y;
        }
      }
    }
    for (l = 0; l < 2; l++) {
      for (k = 0; k < 2; k++) {
        w.x = s.x - 0.5 + l;
        w.y = s.y - 0.5 + k;
        cand = quadform(Q, w);
        if (cand < min) {
          min = cand;
          xmin = w.x;
          ymin = w.y;
        }
      }
    }
    path.curve.vertex[i] = new Point(xmin + x0, ymin + y0);
  }
}

/** Invierte el orden de vértices de la curva (para agujeros). */
function reverse(path: TracedPath): void {
  const curve = path.curve;
  const m = curve.n;
  const v = curve.vertex;
  let i: number, j: number, tmp: Point;
  for (i = 0, j = m - 1; i < j; i++, j--) {
    tmp = v[i];
    v[i] = v[j];
    v[j] = tmp;
  }
}

/** Suaviza la curva fijando puntos de control Bézier a partir de los vértices. */
function smooth(path: TracedPath, alphaMax: number): void {
  const m = path.curve.n;
  const curve = path.curve;
  let i: number, j: number, k: number, dd: number, denom: number, alpha: number;
  let p2: Point, p3: Point, p4: Point;

  for (i = 0; i < m; i++) {
    j = mod(i + 1, m);
    k = mod(i + 2, m);
    p4 = interval(1 / 2.0, curve.vertex[k], curve.vertex[j]);
    denom = ddenom(curve.vertex[i], curve.vertex[k]);
    if (denom !== 0.0) {
      dd = dpara(curve.vertex[i], curve.vertex[j], curve.vertex[k]) / denom;
      dd = Math.abs(dd);
      alpha = dd > 1 ? 1 - 1.0 / dd : 0;
      alpha = alpha / 0.75;
    } else {
      alpha = 4 / 3.0;
    }
    curve.alpha0[j] = alpha;
    if (alpha >= alphaMax) {
      curve.tag[j] = "CORNER";
      curve.c[3 * j + 1] = curve.vertex[j];
      curve.c[3 * j + 2] = p4;
    } else {
      if (alpha < 0.55) alpha = 0.55;
      else if (alpha > 1) alpha = 1;
      p2 = interval(0.5 + 0.5 * alpha, curve.vertex[i], curve.vertex[j]);
      p3 = interval(0.5 + 0.5 * alpha, curve.vertex[k], curve.vertex[j]);
      curve.tag[j] = "CURVE";
      curve.c[3 * j + 0] = p2;
      curve.c[3 * j + 1] = p3;
      curve.c[3 * j + 2] = p4;
    }
    curve.alpha[j] = alpha;
    curve.beta[j] = 0.5;
  }
}

/** Penalización de un segmento de curva optimizado (opti_penalty de Potrace). */
function optiPenalty(
  path: TracedPath,
  i: number,
  j: number,
  res: Opti,
  opttolerance: number,
  convc: number[],
  areac: number[]
): number {
  const m = path.curve.n;
  const curve = path.curve;
  const vertex = curve.vertex;
  let k: number, k1: number, k2: number, conv: number, i1: number;
  let area: number, alpha: number, d: number, d1: number, d2: number;
  let p0: Point, p1: Point, p2: Point, p3: Point, pt: Point;
  let A: number, R: number, A1: number, A2: number, A3: number, A4: number;
  let s: number, t: number;

  if (i === j) return 1;

  k = i;
  i1 = mod(i + 1, m);
  k1 = mod(k + 1, m);
  conv = convc[k1];
  if (conv === 0) return 1;
  d = ddist(vertex[i], vertex[i1]);
  for (k = k1; k !== j; k = k1) {
    k1 = mod(k + 1, m);
    k2 = mod(k + 2, m);
    if (convc[k1] !== conv) return 1;
    if (sign(cprod(vertex[i], vertex[i1], vertex[k1], vertex[k2])) !== conv) return 1;
    if (iprod1(vertex[i], vertex[i1], vertex[k1], vertex[k2]) < d * ddist(vertex[k1], vertex[k2]) * -0.999847695156) return 1;
  }

  p0 = curve.c[mod(i, m) * 3 + 2].copy();
  p1 = vertex[mod(i + 1, m)].copy();
  p2 = vertex[mod(j, m)].copy();
  p3 = curve.c[mod(j, m) * 3 + 2].copy();

  area = areac[j] - areac[i];
  area -= dpara(vertex[0], curve.c[i * 3 + 2], curve.c[j * 3 + 2]) / 2;
  if (i >= j) area += areac[m];

  A1 = dpara(p0, p1, p2);
  A2 = dpara(p0, p1, p3);
  A3 = dpara(p0, p2, p3);
  A4 = A1 + A3 - A2;
  if (A2 === A1) return 1;

  t = A3 / (A3 - A4);
  s = A2 / (A2 - A1);
  A = (A2 * t) / 2.0;
  if (A === 0.0) return 1;

  R = area / A;
  alpha = 2 - Math.sqrt(4 - R / 0.3);

  res.c[0] = interval(t * alpha, p0, p1);
  res.c[1] = interval(s * alpha, p3, p2);
  res.alpha = alpha;
  res.t = t;
  res.s = s;

  p1 = res.c[0].copy();
  p2 = res.c[1].copy();
  res.pen = 0;

  for (k = mod(i + 1, m); k !== j; k = k1) {
    k1 = mod(k + 1, m);
    t = tangent(p0, p1, p2, p3, vertex[k], vertex[k1]);
    if (t < -0.5) return 1;
    pt = bezier(t, p0, p1, p2, p3);
    d = ddist(vertex[k], vertex[k1]);
    if (d === 0.0) return 1;
    d1 = dpara(vertex[k], vertex[k1], pt) / d;
    if (Math.abs(d1) > opttolerance) return 1;
    if (iprod(vertex[k], vertex[k1], pt) < 0 || iprod(vertex[k1], vertex[k], pt) < 0) return 1;
    res.pen += d1 * d1;
  }
  for (k = i; k !== j; k = k1) {
    k1 = mod(k + 1, m);
    t = tangent(p0, p1, p2, p3, curve.c[k * 3 + 2], curve.c[k1 * 3 + 2]);
    if (t < -0.5) return 1;
    pt = bezier(t, p0, p1, p2, p3);
    d = ddist(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2]);
    if (d === 0.0) return 1;
    d1 = dpara(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2], pt) / d;
    d2 = dpara(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2], vertex[k1]) / d;
    d2 *= 0.75 * curve.alpha[k1];
    if (d2 < 0) {
      d1 = -d1;
      d2 = -d2;
    }
    if (d1 < d2 - opttolerance) return 1;
    if (d1 < d2) res.pen += (d1 - d2) * (d1 - d2);
  }
  return 0;
}

/** Optimiza la curva reduciendo segmentos manteniendo la tolerancia. */
function optiCurve(path: TracedPath, optTolerance: number): void {
  const curve = path.curve;
  const m = curve.n;
  const vert = curve.vertex;
  const pt = new Array<number>(m + 1);
  const pen = new Array<number>(m + 1);
  const len = new Array<number>(m + 1);
  const opt = new Array<Opti>(m + 1);
  let om: number, i: number, j: number, r: number;
  let o = new Opti();
  let p0: Point;
  let i1: number, area: number, alpha: number;
  const s = new Array<number>(m);
  const t = new Array<number>(m);
  const convc = new Array<number>(m);
  const areac = new Array<number>(m + 1);

  for (i = 0; i < m; i++) {
    if (curve.tag[i] === "CURVE") {
      convc[i] = sign(dpara(vert[mod(i - 1, m)], vert[i], vert[mod(i + 1, m)]));
    } else {
      convc[i] = 0;
    }
  }

  area = 0.0;
  areac[0] = 0.0;
  p0 = curve.vertex[0];
  for (i = 0; i < m; i++) {
    i1 = mod(i + 1, m);
    if (curve.tag[i1] === "CURVE") {
      alpha = curve.alpha[i1];
      area += (0.3 * alpha * (4 - alpha) * dpara(curve.c[i * 3 + 2], vert[i1], curve.c[i1 * 3 + 2])) / 2;
      area += dpara(p0, curve.c[i * 3 + 2], curve.c[i1 * 3 + 2]) / 2;
    }
    areac[i + 1] = area;
  }

  pt[0] = -1;
  pen[0] = 0;
  len[0] = 0;

  for (j = 1; j <= m; j++) {
    pt[j] = j - 1;
    pen[j] = pen[j - 1];
    len[j] = len[j - 1] + 1;
    for (i = j - 2; i >= 0; i--) {
      r = optiPenalty(path, i, mod(j, m), o, optTolerance, convc, areac);
      if (r) break;
      if (len[j] > len[i] + 1 || (len[j] === len[i] + 1 && pen[j] > pen[i] + o.pen)) {
        pt[j] = i;
        pen[j] = pen[i] + o.pen;
        len[j] = len[i] + 1;
        opt[j] = o;
        o = new Opti();
      }
    }
  }
  om = len[m];
  const ocurve = new Curve(om);
  const ss = new Array<number>(om);
  const tt = new Array<number>(om);

  j = m;
  for (i = om - 1; i >= 0; i--) {
    if (pt[j] === j - 1) {
      ocurve.tag[i] = curve.tag[mod(j, m)];
      ocurve.c[i * 3 + 0] = curve.c[mod(j, m) * 3 + 0];
      ocurve.c[i * 3 + 1] = curve.c[mod(j, m) * 3 + 1];
      ocurve.c[i * 3 + 2] = curve.c[mod(j, m) * 3 + 2];
      ocurve.vertex[i] = curve.vertex[mod(j, m)];
      ocurve.alpha[i] = curve.alpha[mod(j, m)];
      ocurve.alpha0[i] = curve.alpha0[mod(j, m)];
      ocurve.beta[i] = curve.beta[mod(j, m)];
      ss[i] = tt[i] = 1.0;
    } else {
      ocurve.tag[i] = "CURVE";
      ocurve.c[i * 3 + 0] = opt[j].c[0];
      ocurve.c[i * 3 + 1] = opt[j].c[1];
      ocurve.c[i * 3 + 2] = curve.c[mod(j, m) * 3 + 2];
      ocurve.vertex[i] = interval(opt[j].s, curve.c[mod(j, m) * 3 + 2], vert[mod(j, m)]);
      ocurve.alpha[i] = opt[j].alpha;
      ocurve.alpha0[i] = opt[j].alpha;
      ss[i] = opt[j].s;
      tt[i] = opt[j].t;
    }
    j = pt[j];
  }
  for (i = 0; i < om; i++) {
    i1 = mod(i + 1, om);
    ocurve.beta[i] = ss[i] / (ss[i] + tt[i1]);
  }
  path.curve = ocurve;
}

/* ============================================================
 * ORQUESTADOR + RENDERIZADO
 * ============================================================ */

/** Procesa los trazados: polígono -> vértices -> curvas -> optimización. */
function processPath(path: TracedPath, params: TraceParams): void {
  calcSums(path);
  calcLon(path);
  bestPolygon(path);
  adjustVertices(path);
  if (path.sign === "-") reverse(path);
  smooth(path, params.alphaMax);
  if (params.optCurve) optiCurve(path, params.optTolerance);
}

/**
 * Traza una imagen de luminancia (0..255) y devuelve los trazados procesados,
 * cada uno con su curva Bézier de cierre lista para renderizar.
 */
export function traceLuminance(
  luminance: Uint8Array,
  width: number,
  height: number,
  params: Partial<TraceParams> = {}
): TracedPath[] {
  const p: TraceParams = { ...DEFAULT_TRACE_PARAMS, ...params };
  const bm = new Bitmap(width, height, luminance);
  const paths = bmToPathlist(bm, p);
  for (const path of paths) processPath(path, p);
  return paths;
}

/** Formatea un número con 3 decimales, sin ceros de cola (como la referencia). */
function fixed(n: number): string {
  return n.toFixed(3).replace(/\.?0+$/, "");
}

/** Convierte una curva a instrucciones de path SVG (d="..."). */
export function renderCurve(curve: Curve, scale = { x: 1, y: 1 }): string {
  const startingPoint = curve.c[(curve.n - 1) * 3 + 2];
  const parts = [`M ${fixed(startingPoint.x * scale.x)} ${fixed(startingPoint.y * scale.y)}`];

  for (let i = 0; i < curve.n; i++) {
    const i3 = i * 3;
    const p0 = curve.c[i3];
    const p1 = curve.c[i3 + 1];
    const p2 = curve.c[i3 + 2];
    if (curve.tag[i] === "CURVE") {
      parts.push(
        `C ${fixed(p0.x * scale.x)} ${fixed(p0.y * scale.y)}, ` +
          `${fixed(p1.x * scale.x)} ${fixed(p1.y * scale.y)}, ` +
          `${fixed(p2.x * scale.x)} ${fixed(p2.y * scale.y)}`
      );
    } else if (curve.tag[i] === "CORNER") {
      parts.push(`L ${fixed(p1.x * scale.x)} ${fixed(p1.y * scale.y)} ${fixed(p2.x * scale.x)} ${fixed(p2.y * scale.y)}`);
    }
  }
  return parts.join(" ");
}

/** Genera el atributo de path combinado de todos los trazados de una imagen. */
export function renderPaths(paths: TracedPath[], scale = { x: 1, y: 1 }): string {
  return paths.map((p) => renderCurve(p.curve, scale)).join(" ");
}

/** Número total de segmentos (curvas + esquinas) entre todos los trazados. */
export function countCurves(paths: TracedPath[]): number {
  let n = 0;
  for (const p of paths) n += p.curve.n;
  return n;
}

/** Cuenta puntos de control Bézier (excluye vértices de esquina duplicados). */
export function countNodes(paths: TracedPath[]): number {
  let n = 0;
  for (const p of paths) {
    for (let i = 0; i < p.curve.n; i++) {
      if (p.curve.tag[i] === "CURVE") n += 2;
      else n += 1;
    }
  }
  return n;
}

/**
 * Traza y devuelve el SVG completo, listo para incrustar o exportar.
 * `luminance` debe ser un Uint8Array de w*h en escala de grises.
 */
export function traceToSvg(
  luminance: Uint8Array,
  width: number,
  height: number,
  params: Partial<TraceParams> = {}
): { svg: string; paths: TracedPath[] } {
  const p: TraceParams = { ...DEFAULT_TRACE_PARAMS, ...params };
  const paths = traceLuminance(luminance, width, height, params);
  const outWidth = p.width ?? width;
  const outHeight = p.height ?? height;
  const scale = {
    x: p.width ? p.width / width : 1,
    y: p.height ? p.height / height : 1,
  };
  const fill = p.color === "auto" ? (p.blackOnWhite ? "black" : "white") : p.color;
  const bg =
    p.background && p.background !== "transparent"
      ? `\t<rect x="0" y="0" width="100%" height="100%" fill="${p.background}" />\n`
      : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outWidth}" height="${outHeight}" ` +
    `viewBox="0 0 ${outWidth} ${outHeight}" version="1.1">\n${bg}` +
    `\t<path d="${renderPaths(paths, scale)}" stroke="none" fill="${fill}" fill-rule="evenodd"/>\n</svg>`;
  return { svg, paths };
}








