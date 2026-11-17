import { describe, expect, it } from "vitest";
import { audioGain, computeLevel, decayLevel } from "./level";

describe("audio level", () => {
  it("เงียบ → ค่าลดลงตาม smoothing", () => {
    expect(computeLevel(new Uint8Array(128), 1)).toBeCloseTo(0.6);
  });

  it("ดังสุดคงที่ → ลู่เข้า 1", () => {
    const full = new Uint8Array(128).fill(255);
    let l = 0;
    for (let i = 0; i < 50; i++) l = computeLevel(full, l);
    expect(l).toBeCloseTo(1, 6);
  });

  it("ใช้เฉพาะ 16 bin แรก", () => {
    const b = new Uint8Array(128);
    b.fill(255, 16);
    expect(computeLevel(b, 0)).toBe(0);
  });

  it("decay และ gain", () => {
    expect(decayLevel(0.5)).toBeCloseTo(0.45);
    expect(computeLevel([], 0.5)).toBeCloseTo(0.45);
    expect(audioGain(1, 0.5, 1)).toBe(2);
    expect(audioGain(1.3, 1, 0)).toBe(1.3);
  });
});
