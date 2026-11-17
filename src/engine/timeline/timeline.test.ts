import { describe, expect, it } from "vitest";
import {
  advanceTime,
  clampDuration,
  formatTime,
  isActive,
  layerEnd,
  layerFade,
  normalizeSpan,
} from "./timeline";

describe("timeline", () => {
  it("tout = null หมายถึงจบพร้อมโปรเจกต์", () => {
    expect(layerEnd({ tin: 0, tout: null }, 10)).toBe(10);
    expect(layerEnd({ tin: 0, tout: 7 }, 10)).toBe(7);
  });

  it("isActive รวมขอบทั้งสองด้าน", () => {
    const s = { tin: 3, tout: 9 };
    expect(isActive(s, 2.99, 10)).toBe(false);
    expect(isActive(s, 3, 10)).toBe(true);
    expect(isActive(s, 9, 10)).toBe(true);
    expect(isActive(s, 9.01, 10)).toBe(false);
  });

  it("เฟดเข้า/ออก 0.5 วิ", () => {
    const s = { tin: 3, tout: 9 };
    expect(layerFade(s, 3, 10)).toBe(0);
    expect(layerFade(s, 3.25, 10)).toBeCloseTo(0.5);
    expect(layerFade(s, 5, 10)).toBe(1);
    expect(layerFade(s, 8.75, 10)).toBeCloseTo(0.5);
    expect(layerFade(s, 9.5, 10)).toBe(0);
    expect(layerFade(s, 5, 10, 0)).toBe(1);
  });

  it("advanceTime วนลูปและจำกัด dt", () => {
    expect(advanceTime(1, 0.016, 10)).toBeCloseTo(1.016);
    expect(advanceTime(9.95, 0.1, 10)).toBeCloseTo(0.05);
    expect(advanceTime(1, 5, 10)).toBeCloseTo(1.1);
    expect(advanceTime(1, -1, 10)).toBe(1);
  });

  it("clampDuration อยู่ใน 2..120", () => {
    expect(clampDuration(1)).toBe(2);
    expect(clampDuration(500)).toBe(120);
    expect(clampDuration(NaN)).toBe(10);
    expect(clampDuration(30)).toBe(30);
  });

  it("normalizeSpan", () => {
    expect(normalizeSpan(-2, null)).toEqual({ tin: 0, tout: null });
    expect(normalizeSpan(4, 4.1)).toEqual({ tin: 4, tout: 4.5 });
    expect(normalizeSpan(1, 8)).toEqual({ tin: 1, tout: 8 });
  });

  it("formatTime", () => {
    expect(formatTime(0)).toBe("00:00.0");
    expect(formatTime(9.96)).toBe("00:10.0");
    expect(formatTime(75.25)).toBe("01:15.3");
  });
});
