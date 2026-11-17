import { describe, expect, it } from "vitest";
import type { Vec2, WarpShape } from "../project/types";
import {
  FLOATS_PER_VERTEX,
  MESH_SUBDIV,
  bounds,
  buildMesh,
  outline,
  pointInPolygon,
  rectPins,
  resetToRect,
  setWarpMode,
  warpFn,
} from "./surface";

const close = (a: Vec2, b: Vec2, d = 9) => {
  expect(a[0]).toBeCloseTo(b[0], d);
  expect(a[1]).toBeCloseTo(b[1], d);
};

const unitPin: WarpShape = { mode: "pin", n: 1, pts: rectPins([0, 0, 1, 1]) };
const wall: WarpShape = { mode: "pin", n: 1, pts: [[0.2, 0.2], [0.42, 0.24], [0.2, 0.92], [0.42, 0.9]] };

describe("warpFn – corner pin", () => {
  it("จุด pts เรียง row-major: (0,0),(1,0),(0,1),(1,1)", () => {
    const f = warpFn(wall);
    close(f(0, 0), wall.pts[0]);
    close(f(1, 0), wall.pts[1]);
    close(f(0, 1), wall.pts[2]);
    close(f(1, 1), wall.pts[3]);
  });

  it("สี่เหลี่ยมเสื่อมไม่คืนค่า NaN (ใช้ bilinear แทน)", () => {
    const f = warpFn({ mode: "pin", n: 1, pts: [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]] });
    const p = f(0.3, 0.6);
    expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true);
    close(p, [0.5, 0.5]);
  });
});

describe("warpFn – mesh warp", () => {
  it("กริดเริ่มต้นจาก identity ยังเป็น identity", () => {
    for (const n of [2, 3, 6]) {
      const m = setWarpMode(unitPin, "mesh", n);
      expect(m.pts).toHaveLength((n + 1) ** 2);
      const f = warpFn(m);
      for (const uv of [[0, 0], [0.37, 0.81], [1, 1], [0.5, 0]] as Vec2[]) close(f(...uv), uv);
    }
  });

  it("ผ่านจุดควบคุมทุกจุดของกริด", () => {
    const m = setWarpMode(wall, "mesh", 3);
    m.pts[5] = [0.33, 0.47]; // ดัดจุดกลาง (i=1, j=1)
    const f = warpFn(m);
    for (let j = 0; j <= 3; j++) for (let i = 0; i <= 3; i++) close(f(i / 3, j / 3), m.pts[j * 4 + i]);
  });

  it("ดัดจุดภายในไม่กระทบขอบ", () => {
    const m = setWarpMode(unitPin, "mesh", 2);
    m.pts[4] = [0.7, 0.2];
    const f = warpFn(m);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      close(f(t, 0), [t, 0]);
      close(f(0, t), [0, t]);
      close(f(1, t), [1, t]);
      close(f(t, 1), [t, 1]);
    }
  });

  it("u,v นอกช่วง 0..1 ไม่ทำให้ index หลุด", () => {
    const f = warpFn(setWarpMode(unitPin, "mesh", 3));
    expect(Number.isFinite(f(1.2, -0.1)[0])).toBe(true);
  });
});

describe("setWarpMode", () => {
  it("pin → mesh รูปทรงไม่เปลี่ยน (มุมตรงเดิม)", () => {
    const m = setWarpMode(wall, "mesh", 4);
    expect(m).toMatchObject({ mode: "mesh", n: 4 });
    const n1 = 5;
    close(m.pts[0], wall.pts[0]);
    close(m.pts[n1 - 1], wall.pts[1]);
    close(m.pts[n1 * 4], wall.pts[2]);
    close(m.pts[n1 * n1 - 1], wall.pts[3]);
  });

  it("pin → mesh → pin ได้มุมเดิม", () => {
    const back = setWarpMode(setWarpMode(wall, "mesh", 3), "pin", 1);
    expect(back.n).toBe(1);
    back.pts.forEach((p, i) => close(p, wall.pts[i]));
  });

  it("บีบความละเอียด mesh ให้อยู่ใน 2..6", () => {
    expect(setWarpMode(unitPin, "mesh", 1).n).toBe(2);
    expect(setWarpMode(unitPin, "mesh", 9).n).toBe(6);
  });
});

describe("outline / pointInPolygon / bounds", () => {
  it("outline มี 4k จุดและอยู่บนขอบ", () => {
    const o = outline(unitPin, 8);
    expect(o).toHaveLength(32);
    for (const [x, y] of o) expect(Math.min(x, 1 - x, y, 1 - y)).toBeCloseTo(0, 9);
  });

  it("pointInPolygon รองรับรูปเว้า", () => {
    const L: Vec2[] = [[0, 0], [1, 0], [1, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]];
    expect(pointInPolygon([0.2, 0.2], L)).toBe(true);
    expect(pointInPolygon([0.2, 0.8], L)).toBe(true);
    expect(pointInPolygon([0.8, 0.8], L)).toBe(false);
    expect(pointInPolygon([1.5, 0.2], L)).toBe(false);
  });

  it("hit-test พื้นที่ที่ถูกดัดด้วย outline", () => {
    const o = outline(wall, 8);
    expect(pointInPolygon([0.3, 0.5], o)).toBe(true);
    expect(pointInPolygon([0.6, 0.5], o)).toBe(false);
  });

  it("resetToRect ครอบรูปเดิม", () => {
    const r = resetToRect(wall);
    expect(r.mode).toBe("pin");
    const [x0, y0, x1, y1] = bounds(r.pts);
    expect([x0, y0, x1, y1].map((v) => +v.toFixed(6))).toEqual([0.2, 0.2, 0.42, 0.92]);
  });
});

describe("buildMesh", () => {
  it("ขนาด buffer = N·N·6 vertex × 4 float", () => {
    expect(buildMesh(wall)).toHaveLength(MESH_SUBDIV * MESH_SUBDIV * 6 * FLOATS_PER_VERTEX);
    expect(buildMesh(wall, 2)).toHaveLength(2 * 2 * 6 * 4);
  });

  it("vertex แรกและ UV สอดคล้องกับ warpFn", () => {
    const mesh = buildMesh(wall, 4);
    const f = warpFn(wall);
    for (let k = 0; k < mesh.length; k += 4) {
      const p = f(mesh[k + 2], mesh[k + 3]);
      expect(mesh[k]).toBeCloseTo(p[0], 5);
      expect(mesh[k + 1]).toBeCloseTo(p[1], 5);
    }
  });

  it("UV ครอบคลุม 0..1 ครบ", () => {
    const mesh = buildMesh(unitPin, 3);
    const us = new Set<number>();
    for (let k = 2; k < mesh.length; k += 4) us.add(+mesh[k].toFixed(4));
    expect([...us].sort()).toEqual([0, 0.3333, 0.6667, 1]);
  });
});
