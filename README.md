# LUMINA STUDIO

แพลตฟอร์ม Light Art & Projection Mapping: **Mapping Studio** (สร้างผลงาน) + **Mapping Marketplace** (ซื้อขายไฟล์สำเร็จรูป)

## เริ่มต้น

```bash
npm install
cp .env.example .env.local   # ใส่ค่า Supabase (ดู docs/setup-supabase.md)
npm run dev                  # http://localhost:3000/studio
```

ไม่ตั้งค่า Supabase ก็ใช้ Studio ได้ (โหมดผู้เยี่ยมชม เก็บงานในเบราว์เซอร์)

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npm test` | unit test (Vitest) |
| `npm run typecheck` | TypeScript |
| `npm run test:db` | ทดสอบ migration + RLS บน PostgreSQL ในเครื่อง |

## โครงสร้าง

```
prototype/index.html     ต้นแบบ v2 (สเปกพฤติกรรม/หน้าตา — ห้ามแก้)
src/engine/              Mapping Engine (TypeScript ล้วน ไม่ผูกกับ React)
  geometry/              homography (corner pin), mesh warp, hit-test
  renderer/              WebGL renderer, media registry, thumbnails
  shaders/               GLSL (เอฟเฟกต์ 7 แบบ + สื่อ + ภาพทดสอบ)
  timeline/ audio/       ช่วงเวลา/เฟด, ระดับเสียง Audio Reactive
  history/ project/      undo/redo, schema ไฟล์โปรเจกต์ (zod)
  export/                PNG / WebM / JSON
src/app/studio/          Mapping Studio (Zustand store + คอมโพเนนต์)
src/app/library/         My Projects (คลาวด์)
src/app/login/, auth/    เข้าสู่ระบบด้วย Google (Supabase Auth)
src/app/market/          Marketplace, ตะกร้า, ชำระเงิน, สถานะคำสั่งซื้อ
src/app/creator/         หน้าโครง (Phase 4)
src/lib/market/          API สินค้า/ตะกร้า/License, Omise.js, ดาวน์โหลด
supabase/functions/      Edge Functions: checkout, order-sync, payment-webhook, download
supabase/seed/           สินค้าตั้งต้น (สร้างจาก scripts/gen-seed-sql.mjs)
public/market/previews/  วิดีโอ/ภาพตัวอย่างสินค้า (scripts/render-previews)
src/lib/supabase/        client ฝั่งเบราว์เซอร์/ server, ชนิดข้อมูล DB
src/lib/cloud/           บันทึกโปรเจกต์, อัปโหลดสื่อ, คิว autosave
src/lib/auth/            สถานะล็อกอิน
src/proxy.ts             ต่ออายุ session (Next 16 proxy)
src/lib/i18n/th.ts       ข้อความ UI ภาษาไทยทั้งหมด
supabase/migrations/     SQL schema + RLS + Storage policies
supabase/tests/          ทดสอบ RLS
docs/setup-supabase.md   คู่มือตั้งค่า Supabase + Google OAuth
docs/setup-payments.md   คู่มือตั้งค่า Marketplace + Omise + Edge Functions
```

## การบันทึกงาน

| โหมด | เก็บที่ | สื่อภาพ/วิดีโอ |
|---|---|---|
| ผู้เยี่ยมชม | localStorage ของเบราว์เซอร์ | อยู่ในเครื่องเท่านั้น (หายเมื่อรีโหลด) |
| เข้าสู่ระบบ | ตาราง `projects` (autosave 2 วินาทีหลังแก้ไข, `/studio?p=<id>`) | อัปโหลดขึ้น bucket `media` (≤ 50 MB/ไฟล์) |

บันทึกแบบ optimistic concurrency ด้วยคอลัมน์ `version`: ถ้าโปรเจกต์ถูกบันทึกจากแท็บอื่นก่อน
จะไม่เขียนทับ แต่ถามให้เลือก "บันทึกเป็นสำเนา" หรือ "โหลดเวอร์ชันล่าสุด"

## รูปแบบไฟล์โปรเจกต์

`{ "app": "LUMINA STUDIO", "version": 2, "project": { name, dur, surfaces[] } }`
— เข้ากันได้กับไฟล์ที่ส่งออกจากต้นแบบ, ตรวจด้วย schema ก่อนนำเข้าทุกครั้ง
`surface.media` เก็บ id ของสื่อบนคลาวด์ (uuid ใน `media_assets`) ส่วนสื่อในเครื่องจะถูกล้างเมื่อบันทึกเป็นไฟล์

## Marketplace

ซื้อ → `checkout` (Edge Function) คิดราคาจากฐานข้อมูล สร้าง order และ charge ของ Omise
(PromptPay QR / บัตรผ่าน Omise.js + 3-D Secure) → `payment-webhook` / `order-sync` ยืนยันกับ Omise
→ `mark_order_paid` ออก License → `download` สร้างลิงก์ที่หมดอายุใน 10 นาที (จำกัด 20 ครั้ง/วัน)
