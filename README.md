# LUMINA STUDIO

แพลตฟอร์ม Light Art & Projection Mapping: **Mapping Studio** (สร้างผลงาน) + **Mapping Marketplace** (ซื้อขายไฟล์สำเร็จรูป)

## เริ่มต้น

```bash
npm install
cp .env.example .env.local   # Phase 2 เป็นต้นไป
npm run dev                  # http://localhost:3000/studio
```

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npm test` | unit test (Vitest) |
| `npm run typecheck` | TypeScript |

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
src/app/market|library|creator/   หน้าโครง (Phase 2–4)
src/lib/i18n/th.ts       ข้อความ UI ภาษาไทยทั้งหมด
```

## รูปแบบไฟล์โปรเจกต์

`{ "app": "LUMINA STUDIO", "version": 2, "project": { name, dur, surfaces[] } }`
— เข้ากันได้กับไฟล์ที่ส่งออกจากต้นแบบ, ตรวจด้วย schema ก่อนนำเข้าทุกครั้ง
ภาพ/วิดีโอที่ใช้ในเลเยอร์สื่อไม่ถูกบันทึกไปกับไฟล์ (จะย้ายไป Supabase Storage ใน Phase 2)
