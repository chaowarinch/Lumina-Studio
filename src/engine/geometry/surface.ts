import type { Vec2, WarpMode, WarpShape } from "../project/types";
import { applyH, squareToQuad } from "./homography";

export type WarpFn = (u: number, v: number) => Vec2;

/** จำนวนช่องย่อยต่อด้านของ mesh ที่ใช้เรนเดอร์ */
export const MESH_SUBDIV = 24;
export const MESH_MIN = 2;
export const MESH_MAX = 6;
/** ทุก vertex มี 4 float: x, y, u, v */
export const FLOATS_PER_VERTEX = 4;

export function ptIndex(n: number, i: number, j: number): number {
  return j * (n + 1) + i;
}

function bilinearCell(p: Vec2, q: Vec2, r: Vec2, t: Vec2, a: number, b: number): Vec2 {
  return [
    (1 - a) * (1 - b) * p[0] + a * (1 - b) * q[0] + (1 - a) * b * r[0] + a * b * t[0],
    (1 - a) * (1 - b) * p[1] + a * (1 - b) * q[1] + (1 - a) * b * r[1] + a * b * t[1],
  ];
}

/** ฟังก์ชันแปลงพิกัด UV (0..1) ของพื้นที่ → พิกัดเวที */
export function warpFn(s: WarpShape): WarpFn {
  const { n, pts } = s;
  const P = (i: number, j: number) => pts[ptIndex(n, i, j)];

  if (s.mode === "pin") {
    const p00 = P(0, 0), p10 = P(1, 0), p11 = P(1, 1), p01 = P(0, 1);
    const h = squareToQuad([p00, p10, p11, p01]);
    // สี่เหลี่ยมเสื่อม: ใช้ bilinear แทนเพื่อไม่ให้ได้ค่า Infinity/NaN
    if (!h) return (u, v) => bilinearCell(p00, p10, p01, p11, u, v);
    return (u, v) => applyH(h, [u, v]);
  }

  return (u, v) => {
    const fu = u * n;
    const fv = v * n;
    const i = Math.max(0, Math.min(n - 1, Math.floor(fu)));
    const j = Math.max(0, Math.min(n - 1, Math.floor(fv)));
    return bilinearCell(P(i, j), P(i + 1, j), P(i, j + 1), P(i + 1, j + 1), fu - i, fv - j);
  };
}

/** สลับโหมด pin/mesh โดยสุ่มตัวอย่างจากรูปทรงปัจจุบัน (รูปไม่เปลี่ยน) */
export function setWarpMode(s: WarpShape, mode: WarpMode, n: number): WarpShape {
  const f = warpFn(s);
  const size = mode === "pin" ? 1 : Math.max(MESH_MIN, Math.min(MESH_MAX, Math.round(n)));
  const pts: Vec2[] = [];
  for (let j = 0; j <= size; j++) for (let i = 0; i <= size; i++) pts.push(f(i / size, j / size));
  return { mode, n: size, pts };
}

/** สร้างจุด pin จากสี่เหลี่ยมผืนผ้า [x0,y0,x1,y1] */
export function rectPins([x0, y0, x1, y1]: readonly [number, number, number, number]): Vec2[] {
  return [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ];
}

/** เส้นขอบของพื้นที่ (ทวนเข็มรอบ u,v) จำนวน 4k จุด */
export function outline(s: WarpShape, k = 24): Vec2[] {
  const f = warpFn(s);
  const o: Vec2[] = [];
  for (let i = 0; i < k; i++) o.push(f(i / k, 0));
  for (let i = 0; i < k; i++) o.push(f(1, i / k));
  for (let i = k; i > 0; i--) o.push(f(i / k, 1));
  for (let i = k; i > 0; i--) o.push(f(0, i / k));
  return o;
}

/** even-odd point in polygon */
export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = poly[i];
    const [x, y] = poly[j];
    if (b > p[1] !== y > p[1] && p[0] < ((x - a) * (p[1] - b)) / (y - b) + a) c = !c;
  }
  return c;
}

export function bounds(points: readonly Vec2[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

/** รีเซ็ตเป็นสี่เหลี่ยมผืนผ้าที่ครอบรูปทรงเดิม (Corner Pin) */
export function resetToRect(s: WarpShape): WarpShape {
  return { mode: "pin", n: 1, pts: rectPins(bounds(outline(s, 4))) };
}

export function translatePoints(points: readonly Vec2[], dx: number, dy: number): Vec2[] {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

/**
 * สร้าง triangle list สำหรับ WebGL: N×N ช่อง × 2 สามเหลี่ยม × 3 vertex × (x,y,u,v)
 */
export function buildMesh(s: WarpShape, N = MESH_SUBDIV): Float32Array {
  const f = warpFn(s);
  const g: Vec2[] = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) g.push(f(i / N, j / N));
  const out = new Float32Array(N * N * 6 * FLOATS_PER_VERTEX);
  let k = 0;
  const V = (i: number, j: number) => {
    const p = g[j * (N + 1) + i];
    out[k++] = p[0];
    out[k++] = p[1];
    out[k++] = i / N;
    out[k++] = j / N;
  };
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      V(i, j); V(i + 1, j); V(i, j + 1);
      V(i + 1, j); V(i + 1, j + 1); V(i, j + 1);
    }
  return out;
}
