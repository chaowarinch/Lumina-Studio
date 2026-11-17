import type { EffectParams } from "./project/types";

export const FX_MEDIA = 0;
/** โหมดภาพทดสอบ (ใช้เฉพาะตอนเรนเดอร์ ไม่ใช่เอฟเฟกต์ของเลเยอร์) */
export const FX_TEST_PATTERN = 8;

export interface EffectDef {
  /** ชื่อแสดงผล (ตามต้นแบบ) */
  label: string;
  defaults: Partial<EffectParams>;
}

export const EFFECTS: readonly EffectDef[] = [
  { label: "สื่อ (ภาพ/วิดีโอ)", defaults: { hue: 0 } },
  { label: "Neon", defaults: { hue: 0.92 } },
  { label: "Spectrum", defaults: { hue: 0 } },
  { label: "Energy Pulse", defaults: { hue: 0.55 } },
  { label: "Digital Grid", defaults: { hue: 0.5 } },
  { label: "Golden Aura", defaults: { hue: 0.09 } },
  { label: "Particle Field", defaults: { hue: 0.6 } },
  { label: "Geometric Prism", defaults: { hue: 0.75 } },
];

export const DEFAULT_PARAMS: Readonly<EffectParams> = {
  intensity: 1,
  speed: 1,
  hue: 0.5,
  scale: 1,
  opacity: 1,
  feather: 0,
  audio: 0,
};

export interface ParamRange {
  key: keyof EffectParams;
  min: number;
  max: number;
  step: number;
}

export const PARAM_RANGES: readonly ParamRange[] = [
  { key: "intensity", min: 0, max: 2, step: 0.01 },
  { key: "speed", min: 0, max: 4, step: 0.01 },
  { key: "hue", min: 0, max: 1, step: 0.005 },
  { key: "scale", min: 0.2, max: 4, step: 0.01 },
  { key: "opacity", min: 0, max: 1, step: 0.01 },
  { key: "feather", min: 0, max: 0.3, step: 0.005 },
  { key: "audio", min: 0, max: 1, step: 0.01 },
];

export function paramsFor(fx: number, overrides: Partial<EffectParams> = {}): EffectParams {
  return { ...DEFAULT_PARAMS, ...(EFFECTS[fx]?.defaults ?? {}), ...overrides };
}
