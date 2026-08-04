/**
 * Matemática vectorial y geometría usada por el motor Potrace.
 * Port fiel del algoritmo Potrace (Peter Selinger), adaptado a TypeScript.
 * Conjunto reducido de tipos de punto y utilidades 2D con productor cruzado/dot.
 */

export interface PointLike {
  x: number;
  y: number;
}

export class Point {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  copy(): Point {
    return new Point(this.x, this.y);
  }
}

/** Sumas acumuladas de un polígono (usadas en aproximación de segmentos). */
export class Sum {
  x: number;
  y: number;
  xy: number;
  x2: number;
  y2: number;
  constructor(x: number, y: number, xy: number, x2: number, y2: number) {
    this.x = x;
    this.y = y;
    this.xy = xy;
    this.x2 = x2;
    this.y2 = y2;
  }
}

/** Matriz 3x3 simétrica (ajuste de mínimos cuadrados de vértices). */
export class Quad {
  data: [number, number, number, number, number, number, number, number, number];
  constructor() {
    this.data = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  at(x: number, y: number): number {
    return this.data[x * 3 + y];
  }
}

/** Resultado intermedio de un segmento óptimo de curva. */
export class Opti {
  pen: number;
  c: [Point, Point];
  t: number;
  s: number;
  alpha: number;
  constructor() {
    this.pen = 0;
    this.c = [new Point(), new Point()];
    this.t = 0;
    this.s = 0;
    this.alpha = 0;
  }
}

/** Módulo que devuelve siempre un valor en [0, n-1]. */
export function mod(a: number, n: number): number {
  return a >= n ? a % n : a >= 0 ? a : n - 1 - ((-1 - a) % n);
}

export function sign(i: number): number {
  return i > 0 ? 1 : i < 0 ? -1 : 0;
}

/** Producto vectorial (cross) de dos puntos. */
export function xprod(p1: PointLike, p2: PointLike): number {
  return p1.x * p2.y - p1.y * p2.x;
}

/** Comprueba si c está en orden cíclico entre a y b (índices de polígono). */
export function cyclic(a: number, b: number, c: number): boolean {
  if (a <= c) {
    return a <= b && b < c;
  }
  return a <= b || b < c;
}

/** Distancia director de un segmento a "infinito" (normal ortogonal normalizada). */
export function dorth_infty(p0: PointLike, p2: PointLike): Point {
  const r = new Point();
  r.y = sign(p2.x - p0.x);
  r.x = -sign(p2.y - p0.y);
  return r;
}

export function ddenom(p0: PointLike, p2: PointLike): number {
  const r = dorth_infty(p0, p2);
  return r.y * (p2.x - p0.x) - r.x * (p2.y - p0.y);
}

/** Área (2x) del triángulo p0,p1,p2. */
export function dpara(p0: PointLike, p1: PointLike, p2: PointLike): number {
  const x1 = p1.x - p0.x;
  const y1 = p1.y - p0.y;
  const x2 = p2.x - p0.x;
  const y2 = p2.y - p0.y;
  return x1 * y2 - x2 * y1;
}

/** Producto cruzado de los vectores p0->p1 y p2->p3. */
export function cprod(p0: PointLike, p1: PointLike, p2: PointLike, p3: PointLike): number {
  const x1 = p1.x - p0.x;
  const y1 = p1.y - p0.y;
  const x2 = p3.x - p2.x;
  const y2 = p3.y - p2.y;
  return x1 * y2 - x2 * y1;
}

/** Producto punto de los vectores p0->p1 y p2->p3. */
export function iprod(p0: PointLike, p1: PointLike, p2: PointLike): number {
  const x1 = p1.x - p0.x;
  const y1 = p1.y - p0.y;
  const x2 = p2.x - p0.x;
  const y2 = p2.y - p0.y;
  return x1 * x2 + y1 * y2;
}

/** Producto punto de p0->p1 con p2->p3. */
export function iprod1(p0: PointLike, p1: PointLike, p2: PointLike, p3: PointLike): number {
  const x1 = p1.x - p0.x;
  const y1 = p1.y - p0.y;
  const x2 = p3.x - p2.x;
  const y2 = p3.y - p2.y;
  return x1 * x2 + y1 * y2;
}

export function ddist(p: PointLike, q: PointLike): number {
  return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
}

/** Punto en la recta a+(lambda)*(b-a). */
export function interval(lambda: number, a: PointLike, b: PointLike): Point {
  return new Point(a.x + lambda * (b.x - a.x), a.y + lambda * (b.y - a.y));
}

/** Forma cuadrática Q(w) con w homogéneo [x, y, 1]. */
export function quadform(Q: Quad, w: PointLike): number {
  const v = [w.x, w.y, 1];
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += v[i] * Q.at(i, j) * v[j];
    }
  }
  return sum;
}

/** Parámetro t (0..1) de la curva Bézier p0..p3 donde la tangente cruza q0->q1. */
export function tangent(
  p0: PointLike,
  p1: PointLike,
  p2: PointLike,
  p3: PointLike,
  q0: PointLike,
  q1: PointLike
): number {
  const A = cprod(p0, p1, q0, q1);
  const B = cprod(p1, p2, q0, q1);
  const C = cprod(p2, p3, q0, q1);
  const a = A - 2 * B + C;
  const b = -2 * A + 2 * B;
  const c = A;
  const d = b * b - 4 * a * c;

  if (a === 0 || d < 0) return -1.0;
  const s = Math.sqrt(d);
  const r1 = (-b + s) / (2 * a);
  const r2 = (-b - s) / (2 * a);
  if (r1 >= 0 && r1 <= 1) return r1;
  if (r2 >= 0 && r2 <= 1) return r2;
  return -1.0;
}

/** Punto en la curva cúbica de Bézier p0..p3 en t. */
export function bezier(t: number, p0: PointLike, p1: PointLike, p2: PointLike, p3: PointLike): Point {
  const s = 1 - t;
  return new Point(
    s * s * s * p0.x + 3 * (s * s * t) * p1.x + 3 * (t * t * s) * p2.x + t * t * t * p3.x,
    s * s * s * p0.y + 3 * (s * s * t) * p1.y + 3 * (t * t * s) * p2.y + t * t * t * p3.y
  );
}
