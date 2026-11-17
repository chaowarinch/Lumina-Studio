/** จำนวน bin ความถี่ต่ำที่ใช้วัดระดับเสียง (FFT 256 → 128 bin) */
export const LEVEL_BINS = 16;
export const FFT_SIZE = 256;

/**
 * ระดับเสียงแบบ smoothing (0..1) จากข้อมูล getByteFrequencyData
 * level' = level·0.6 + avg(bins)/255·0.4
 */
export function computeLevel(bins: ArrayLike<number>, prev: number, count = LEVEL_BINS): number {
  const n = Math.min(count, bins.length);
  if (n === 0) return decayLevel(prev);
  let s = 0;
  for (let i = 0; i < n; i++) s += bins[i];
  return prev * 0.6 + (s / n / 255) * 0.4;
}

/** ค่อย ๆ ลดลงเมื่อไม่มีเสียง */
export function decayLevel(prev: number): number {
  return prev * 0.9;
}

/** ตัวคูณความสว่างจากเสียง: intensity·(1 + level·audio·2) */
export function audioGain(intensity: number, level: number, audioAmount: number): number {
  return intensity * (1 + level * audioAmount * 2);
}
