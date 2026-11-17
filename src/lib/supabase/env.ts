/** ค่าจาก .env.local — เป็นค่าสาธารณะที่ใช้ฝั่งเบราว์เซอร์ได้ (ไม่ใช่ service role key) */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** ค่าตัวอย่างจาก .env.example ที่ยังไม่ได้แก้ (เช่น https://xxxxxxxxxxxx.supabase.co) */
const isPlaceholder = (v: string) => /x{6,}/i.test(v);

/** ยังไม่ได้ตั้งค่า Supabase (หรือยังเป็นค่าตัวอย่าง): แอปทำงานแบบผู้เยี่ยมชมอย่างเดียว */
export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_PUBLISHABLE_KEY),
);

/** เปิดฟอร์มอีเมล/รหัสผ่านสำหรับทดสอบระหว่างพัฒนา (ห้ามเปิดบน production) */
export const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";
