/** พิกัดแบบ normalize ของเวที: (0,0) = มุมซ้ายบน, (1,1) = มุมขวาล่าง */
export type Vec2 = [number, number];

export type BlendMode = "add" | "normal";
export type WarpMode = "pin" | "mesh";

export interface EffectParams {
  intensity: number;
  speed: number;
  hue: number;
  scale: number;
  opacity: number;
  feather: number;
  audio: number;
}

/** ข้อมูลรูปทรงการฉายของพื้นที่ (ใช้ใน geometry โดยไม่ต้องรู้เรื่องเอฟเฟกต์) */
export interface WarpShape {
  mode: WarpMode;
  /** จำนวนช่องต่อด้าน: pin = 1, mesh = 2..6 */
  n: number;
  /** จุดควบคุม (n+1)² จุด เรียงแบบ row-major: index = j*(n+1)+i */
  pts: Vec2[];
}

export interface Surface extends WarpShape {
  id: string;
  name: string;
  /** index ของเอฟเฟกต์ใน EFFECTS (0 = สื่อภาพ/วิดีโอ) */
  fx: number;
  p: EffectParams;
  blend: BlendMode;
  /** มาสก์โพลิกอนในพิกัดเวที (≥3 จุดจึงมีผล) */
  mask: Vec2[];
  /** true = ตัดด้านในออก, false = แสดงเฉพาะด้านใน */
  maskInv: boolean;
  /** id ของสื่อใน MediaRegistry (ไม่ถูกบันทึกข้ามเซสชัน) */
  media: string | null;
  /** เวลาเริ่ม (วินาที) */
  tin: number;
  /** เวลาจบ (วินาที) หรือ null = จบพร้อมโปรเจกต์ */
  tout: number | null;
  vis: boolean;
}

export interface Project {
  name: string;
  /** ความยาวรวม (วินาที) */
  dur: number;
  surfaces: Surface[];
  ref?: string;
}
