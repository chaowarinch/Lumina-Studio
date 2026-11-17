import { createSurface } from "../project/factory";
import type { EffectParams } from "../project/types";
import { LruCache } from "../util/lru";
import { createRenderer, type Renderer } from "./renderer";

/** สร้างภาพย่อเอฟเฟกต์ (480×270 JPEG) ด้วย renderer แยกต่างหาก พร้อมแคช LRU */
export class ThumbnailRenderer {
  private renderer: Renderer | null;
  private cache = new LruCache<string, string>(96);

  constructor(width = 480, height = 270) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    this.renderer = createRenderer(c);
  }

  get(fx: number, p: EffectParams, t = 3.2): string {
    if (!this.renderer) return "";
    const key = `${fx}|${p.intensity}|${p.speed}|${p.hue}|${p.scale}|${p.opacity}|${p.feather}|${t}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const s = { ...createSurface("thumb", fx, [0, 0, 1, 1]), p };
    this.renderer.draw([s], t, { noFade: true });
    const url = this.renderer.canvas.toDataURL("image/jpeg", 0.85);
    this.cache.set(key, url);
    return url;
  }
}
