import { describe, expect, it } from "vitest";
import type { Vec2 } from "../project/types";
import {
  IDENTITY,
  applyH,
  invertH,
  multiplyH,
  quadToQuad,
  squareToQuad,
  type Quad,
} from "./homography";

const close = (a: Vec2, b: Vec2, d = 9) => {
  expect(a[0]).toBeCloseTo(b[0], d);
  expect(a[1]).toBeCloseTo(b[1], d);
};

const UNIT: Vec2[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

const QUADS: Record<string, Quad> = {
  "ผนังซ้ายในตัวอย่าง": [[0.2, 0.2], [0.42, 0.24], [0.42, 0.9], [0.2, 0.92]],
  "perspective แรง": [[0.1, 0.1], [0.9, 0.3], [0.7, 0.8], [0.2, 0.95]],
  "หมุน + ย่อ": [[0.5, 0.1], [0.9, 0.5], [0.5, 0.9], [0.1, 0.5]],
};

describe("squareToQuad", () => {
  it("จัตุรัสหน่วย → identity", () => {
    const h = squareToQuad(UNIT as unknown as Quad)!;
    h.forEach((x, i) => expect(x).toBeCloseTo(IDENTITY[i], 12));
  });

  for (const [name, q] of Object.entries(QUADS)) {
    it(`มุมทั้ง 4 ตรงกับจุดที่กำหนด (${name})`, () => {
      const h = squareToQuad(q)!;
      expect(h).not.toBeNull();
      UNIT.forEach((uv, k) => close(applyH(h, uv), q[k]));
    });

    it(`invertH(applyH(p)) ≈ p (${name})`, () => {
      const h = squareToQuad(q)!;
      const inv = invertH(h)!;
      for (const uv of [[0.5, 0.5], [0.1, 0.7], [0.93, 0.02]] as Vec2[]) {
        close(applyH(inv, applyH(h, uv)), uv);
      }
    });
  }

  it("สี่เหลี่ยมด้านขนานใช้ affine (แถวล่าง = 0 0 1)", () => {
    const q: Quad = [[0.1, 0.2], [0.6, 0.3], [0.7, 0.8], [0.2, 0.7]];
    const h = squareToQuad(q)!;
    expect([h[6], h[7], h[8]]).toEqual([0, 0, 1]);
    close(applyH(h, [0.5, 0.5]), [0.4, 0.5]);
  });

  it("เส้นตรงยังคงเป็นเส้นตรง (คุณสมบัติ projective)", () => {
    const h = squareToQuad(QUADS["perspective แรง"])!;
    const a = applyH(h, [0, 0.3]);
    const b = applyH(h, [0.5, 0.3]);
    const c = applyH(h, [1, 0.3]);
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    expect(Math.abs(cross)).toBeLessThan(1e-12);
  });

  it("จุดเรียงเป็นเส้นตรงหรือซ้อนกัน → null", () => {
    expect(squareToQuad([[0, 0], [0.5, 0], [1, 0], [0.25, 0]])).toBeNull();
    expect(squareToQuad([[0.3, 0.3], [0.3, 0.3], [0.3, 0.3], [0.3, 0.3]])).toBeNull();
  });
});

describe("invertH / multiplyH / quadToQuad", () => {
  it("H · H⁻¹ = I", () => {
    const h = squareToQuad(QUADS["perspective แรง"])!;
    const r = multiplyH(h, invertH(h)!);
    r.forEach((x, i) => expect(x).toBeCloseTo(IDENTITY[i], 9));
  });

  it("เมทริกซ์ singular → null", () => {
    expect(invertH([1, 2, 3, 2, 4, 6, 0, 0, 1])).toBeNull();
  });

  it("quadToQuad ส่งมุมต่อมุม", () => {
    const src = QUADS["หมุน + ย่อ"];
    const dst = QUADS["perspective แรง"];
    const h = quadToQuad(src, dst)!;
    src.forEach((p, k) => close(applyH(h, p), dst[k]));
  });
});
