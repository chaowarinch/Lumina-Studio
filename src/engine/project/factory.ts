import { paramsFor } from "../effects";
import { rectPins } from "../geometry/surface";
import type { EffectParams, Project, Surface, Vec2 } from "./types";

export function uid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 10);
  return Math.random().toString(36).slice(2, 12);
}

export function createSurface(
  name: string,
  fx: number,
  rect: readonly [number, number, number, number],
  params: Partial<EffectParams> = {},
  extra: Partial<Surface> = {},
): Surface {
  return {
    id: uid(),
    name,
    fx,
    p: paramsFor(fx, params),
    blend: "add",
    mode: "pin",
    n: 1,
    pts: rectPins(rect),
    mask: [],
    maskInv: false,
    media: null,
    tin: 0,
    tout: null,
    vis: true,
    ...extra,
  };
}

/** สำเนาเลเยอร์ เลื่อนตำแหน่งเล็กน้อยให้เห็นว่าเป็นอีกชั้น */
export function duplicateSurface(s: Surface, suffix: string, offset = 0.03): Surface {
  const c: Surface = structuredClone(s);
  c.id = uid();
  c.name = s.name + suffix;
  c.pts = c.pts.map(([x, y]) => [x + offset, y + offset]);
  c.mask = c.mask.map(([x, y]) => [x + offset, y + offset]);
  return c;
}

/** มาสก์รูปซุ้มโค้งครึ่งวงกลม (สัดส่วน 16:9) */
export function archMask(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = (rx * 16) / 9;
  const m: Vec2[] = [
    [x0, y1],
    [x0, y0 + ry],
  ];
  for (let i = 1; i < 16; i++) {
    const a = Math.PI - (i * Math.PI) / 16;
    m.push([cx + Math.cos(a) * rx, y0 + ry - Math.sin(a) * ry]);
  }
  m.push([x1, y0 + ry], [x1, y1]);
  return m;
}

/** โปรเจกต์ตัวอย่างหน้าอาคาร (ตรงกับต้นแบบ) */
export function sampleProject(): Project {
  const full = [0, 0, 1, 1] as const;
  return {
    name: "Facade Show – ตัวอย่าง",
    dur: 10,
    ref: "sample",
    surfaces: [
      createSurface("ผนังซ้าย", 2, full, { scale: 1.2 }, { pts: [[0.2, 0.2], [0.42, 0.24], [0.2, 0.92], [0.42, 0.9]] }),
      createSurface("ผนังขวา", 4, full, { scale: 0.9 }, { pts: [[0.58, 0.24], [0.8, 0.2], [0.58, 0.9], [0.8, 0.92]], tin: 1 }),
      createSurface("ซุ้มประตู", 3, [0.44, 0.42, 0.56, 0.9], { scale: 0.8 }, { mask: archMask(0.445, 0.43, 0.555, 0.9) }),
      createSurface("หน้าจั่ว", 1, [0.42, 0.12, 0.58, 0.38], { intensity: 1.3 }, { mask: [[0.5, 0.13], [0.578, 0.375], [0.422, 0.375]] }),
      createSurface("ประกายด้านหน้า", 6, [0.18, 0.1, 0.82, 0.95], { opacity: 0.7, scale: 1.4 }, { tin: 3, tout: 9 }),
    ],
  };
}
