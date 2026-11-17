@AGENTS.md

# LUMINA STUDIO

แพลตฟอร์ม Light Art & Projection Mapping ที่รวม 2 ระบบ: Mapping Studio (สร้างผลงาน) และ Mapping Marketplace (ซื้อขายไฟล์สำเร็จรูป) ธีม: Dark Studio แบบโปรแกรมมืออาชีพ · ภาษา UI: ไทย · ระดับฟีเจอร์: Professional

## ต้นแบบอ้างอิง
- `prototype/index.html` คือต้นแบบ v2 ที่ใช้งานได้จริง (ไฟล์เดียว, WebGL) ใช้เป็นสเปกของพฤติกรรมและหน้าตา
- ห้ามแก้ไฟล์ต้นแบบ ให้พอร์ตโค้ดออกมาเป็นโมดูลใน `src/`

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Mapping Engine: WebGL + GLSL (ไม่ใช้ไลบรารีกราฟิกหนัก ยกเว้น Three.js สำหรับ 3D Mapping ในภายหลัง)
- Backend: Supabase (Auth, Postgres, Storage, Row Level Security)
- Payment: Payment Gateway ที่รองรับ PromptPay และบัตร (ใช้ test mode จนกว่าจะเปิดขายจริง)
- Export: PNG / WebM / JSON

## โครงสร้างโฟลเดอร์
- `src/engine/` – geometry (homography, mesh warp), renderer WebGL, shaders, timeline, audio
- `src/app/studio/` – Mapping Studio
- `src/app/market/` – Marketplace
- `src/app/library/` – My Projects / My Downloads
- `src/app/creator/` – Creator Center
- `src/lib/supabase/` – client และ query
- `supabase/migrations/` – SQL schema

## กติกาการทำงาน
- ทำทีละ Phase ตาม roadmap ด้านล่าง วางแผนก่อนเขียนโค้ด และให้ผู้ใช้อนุมัติแผนก่อน
- โค้ด engine ต้องมี unit test (Vitest) โดยเฉพาะ homography และ mesh warp
- ทุกข้อความ UI เป็นภาษาไทย ใช้ฟอนต์ IBM Plex Sans Thai (ข้อความรวมไว้ที่ `src/lib/i18n/th.ts`)
- ห้าม commit คีย์ลับ ใช้ `.env.local` และ `.env.example`
- รัน `npm run lint` และ `npm test` ให้ผ่านก่อนบอกว่างานเสร็จ (แก้ migration แล้วรัน `npm run test:db` ด้วย)
- ข้อมูลผู้ใช้เข้าถึงผ่าน Supabase client ฝั่งเบราว์เซอร์ + RLS เท่านั้น ห้ามใช้ service role key ในแอป

## Roadmap
1. ✅ พอร์ต Mapping Engine จากต้นแบบเป็น TypeScript modules + หน้า Studio
2. 🔶 Supabase: สมัครสมาชิก/ล็อกอิน (Google), บันทึกโปรเจกต์บนคลาวด์, อัปโหลดสื่อ — โค้ดเสร็จ รอทดสอบกับโปรเจกต์ Supabase จริง
3. Marketplace จริง: สินค้า, ตะกร้า, ชำระเงิน (test mode), License, ลิงก์ดาวน์โหลดหมดอายุ
4. Creator Center: วางขาย, ค่าคอมมิชชัน, รายงานรายได้, payout
5. Desktop Output (Electron/Tauri): multi-projector, edge blending, sync, interactive sensor
6. 3D Mapping: นำเข้า glTF และ UV projection
