import type { Vec2 } from "../project/types";

/** เมทริกซ์ 3×3 แบบ row-major: [a b c; d e f; g h i] */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

/** สี่เหลี่ยมเรียงตามรอบรูป: (0,0) → (1,0) → (1,1) → (0,1) */
export type Quad = readonly [Vec2, Vec2, Vec2, Vec2];

const EPS = 1e-9;

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * Homography จากจัตุรัสหน่วยไปยังสี่เหลี่ยม `q` (Heckbert, 1989)
 * คืนค่า null ถ้าสี่เหลี่ยมเสื่อม (เช่น จุดเรียงเป็นเส้นตรง) จนหาเมทริกซ์ไม่ได้
 */
export function squareToQuad(q: Quad): Mat3 | null {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;

  if (Math.abs(sx) < EPS && Math.abs(sy) < EPS) {
    // ขนานกัน → affine
    const m: Mat3 = [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0, 1];
    return Math.abs(det(m)) < EPS ? null : m;
  }

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < EPS) return null;

  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  const m: Mat3 = [
    x1 - x0 + g * x1,
    x3 - x0 + h * x3,
    x0,
    y1 - y0 + g * y1,
    y3 - y0 + h * y3,
    y0,
    g,
    h,
    1,
  ];
  return Math.abs(det(m)) < EPS ? null : m;
}

export function applyH(m: Mat3, [u, v]: Vec2): Vec2 {
  const w = m[6] * u + m[7] * v + m[8];
  return [(m[0] * u + m[1] * v + m[2]) / w, (m[3] * u + m[4] * v + m[5]) / w];
}

export function det(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

export function invertH(m: Mat3): Mat3 | null {
  const d = det(m);
  if (Math.abs(d) < EPS) return null;
  const [a, b, c, e, f, g, h, i, j] = m;
  const inv = [
    f * j - g * i,
    c * i - b * j,
    b * g - c * f,
    g * h - e * j,
    a * j - c * h,
    c * e - a * g,
    e * i - f * h,
    b * h - a * i,
    a * f - b * e,
  ].map((x) => x / d);
  return inv as unknown as Mat3;
}

export function multiplyH(a: Mat3, b: Mat3): Mat3 {
  const r: number[] = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      r.push(a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col]);
  return r as unknown as Mat3;
}

/** Homography ที่ส่งสี่เหลี่ยม `src` ไปยัง `dst` (มุมต่อมุม) */
export function quadToQuad(src: Quad, dst: Quad): Mat3 | null {
  const a = squareToQuad(src);
  const b = squareToQuad(dst);
  if (!a || !b) return null;
  const ai = invertH(a);
  return ai ? multiplyH(b, ai) : null;
}
