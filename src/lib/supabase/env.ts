/** ค่าจาก .env.local — เป็นค่าสาธารณะที่ใช้ฝั่งเบราว์เซอร์ได้ (ไม่ใช่ service role key) */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** ยังไม่ได้ตั้งค่า Supabase: แอปทำงานแบบผู้เยี่ยมชมอย่างเดียว */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** เปิดฟอร์มอีเมล/รหัสผ่านสำหรับทดสอบระหว่างพัฒนา (ห้ามเปิดบน production) */
export const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";
