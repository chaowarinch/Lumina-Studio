import type { Surface } from "../project/types";

/** ระยะเฟดเข้า/ออกของแต่ละเลเยอร์ (วินาที) */
export const FADE_SECONDS = 0.5;
export const MIN_DURATION = 2;
export const MAX_DURATION = 120;
/** ช่วงเลเยอร์สั้นที่สุด (วินาที) */
export const MIN_LAYER_SPAN = 0.5;

type Timed = Pick<Surface, "tin" | "tout">;

export function layerEnd(s: Timed, dur: number): number {
  return s.tout ?? dur;
}

export function isActive(s: Timed, t: number, dur: number): boolean {
  return t >= s.tin && t <= layerEnd(s, dur);
}

/** ค่าความทึบจากการเฟด 0..1 */
export function layerFade(s: Timed, t: number, dur: number, fade = FADE_SECONDS): number {
  if (!isActive(s, t, dur)) return 0;
  if (fade <= 0) return 1;
  const v = Math.min((t - s.tin) / fade, (layerEnd(s, dur) - t) / fade);
  return Math.max(0, Math.min(1, v));
}

/** เดินเวลาไปข้างหน้าแบบวนลูป; dt ถูกจำกัดไว้ที่ 0.1 วิ กันกระตุกเมื่อแท็บถูกพัก */
export function advanceTime(t: number, dt: number, dur: number): number {
  const next = t + Math.min(0.1, Math.max(0, dt));
  return next >= dur ? next % dur : next;
}

export function clampDuration(d: number): number {
  if (!Number.isFinite(d) || d <= 0) return 10;
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, d));
}

/** ตั้งค่าเวลาเริ่ม/จบให้ถูกต้อง: tin ≥ 0, tout ≥ tin + MIN_LAYER_SPAN */
export function normalizeSpan(tin: number, tout: number | null): { tin: number; tout: number | null } {
  const a = Math.max(0, Number.isFinite(tin) ? tin : 0);
  if (tout === null || !Number.isFinite(tout)) return { tin: a, tout: null };
  return { tin: a, tout: Math.max(a + MIN_LAYER_SPAN, tout) };
}

/** รูปแบบ mm:ss.s */
export function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const x = s - m * 60;
  return `${String(m).padStart(2, "0")}:${x.toFixed(1).padStart(4, "0")}`;
}
