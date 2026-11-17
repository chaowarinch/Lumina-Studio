# ตั้งค่า Supabase + Google Login (Phase 2)

ใช้เวลาประมาณ 15 นาที ทำครั้งเดียว

## 1. สร้างโปรเจกต์ Supabase

1. เข้า https://supabase.com/dashboard แล้วกด **New project**
2. ตั้งชื่อ เช่น `lumina-studio` · ตั้งรหัสผ่านฐานข้อมูล (เก็บไว้เอง ไม่ต้องส่งให้ใคร)
3. **Region: Southeast Asia (Singapore)** ใกล้ผู้ใช้ไทยที่สุด
4. รอจนโปรเจกต์พร้อม (~2 นาที)

## 2. รัน SQL migration

1. เมนูซ้าย **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/migrations/20261117000001_phase2_init.sql` คัดลอกทั้งหมดไปวาง แล้วกด **Run**
3. ต้องขึ้น `Success. No rows returned`
4. ตรวจ: **Table Editor** ต้องมีตาราง `profiles`, `projects`, `media_assets` และ **Storage** ต้องมี bucket `media`, `thumbnails` (ทั้งสองเป็น Private)

## 3. สร้าง OAuth Client ใน Google Cloud

1. เข้า https://console.cloud.google.com/ → สร้างหรือเลือกโปรเจกต์
2. **APIs & Services → OAuth consent screen** (หรือ **Google Auth Platform**)
   - User type: **External** · ชื่อแอป: `LUMINA STUDIO` · ใส่อีเมลติดต่อ
   - Scopes ใช้ค่าเริ่มต้น (`email`, `profile`, `openid`) พอ
   - ระหว่างทดสอบ ให้เพิ่มอีเมลที่จะใช้ล็อกอินใน **Test users** (หรือกด Publish เมื่อพร้อมเปิดจริง)
3. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:3000` (และโดเมนจริงเมื่อ deploy)
   - **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`
     (คัดลอกได้จาก Supabase: **Authentication → Sign In / Providers → Google** ช่อง *Callback URL*)
4. กด Create แล้วคัดลอก **Client ID** และ **Client secret**

## 4. เปิด Google provider ใน Supabase

1. **Authentication → Sign In / Providers → Google** → เปิด **Enable**
2. วาง Client ID และ Client secret จากข้อ 3 → **Save**
3. **Authentication → URL Configuration**
   - **Site URL**: `http://localhost:3000` (เปลี่ยนเป็นโดเมนจริงเมื่อ deploy)
   - **Redirect URLs**: เพิ่ม `http://localhost:3000/auth/callback` (และ `https://<โดเมนจริง>/auth/callback`)

> Client secret ของ Google ใส่ใน Supabase Dashboard เท่านั้น ไม่ต้องใส่ในโค้ดหรือ `.env.local`

## 5. ตั้งค่าแอป

1. Supabase: **Project Settings → API Keys** คัดลอก
   - **Project URL** (หน้า Data API หรือปุ่ม Connect) — ใช้แค่ `https://<project-ref>.supabase.co` ไม่ต้องมี `/rest/v1`
   - **Publishable key** (`sb_publishable_...`) — ถ้าโปรเจกต์ยังใช้คีย์แบบเก่า ใช้ **anon public** แทนได้
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

3. `npm run dev` → เปิด http://localhost:3000/login → **เข้าสู่ระบบด้วย Google**

> ห้ามใช้ **service_role / secret key** ในแอปนี้ — คีย์นั้นข้าม RLS ได้ทั้งหมด

## 6. (ไม่บังคับ) ผู้ใช้ทดสอบแบบอีเมล

สำหรับทดสอบอัตโนมัติบนเครื่อง dev:
1. **Authentication → Users → Add user → Create new user** ใส่อีเมล/รหัสผ่าน (ติ๊ก Auto Confirm)
2. ใน `.env.local` ตั้ง `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` → หน้า `/login` จะมีฟอร์มอีเมลเพิ่ม
3. **ห้ามเปิดค่านี้บน production**

## ทดสอบ RLS บนเครื่อง (ไม่บังคับ)

ถ้ามี PostgreSQL ในเครื่อง: `npm run test:db` — สร้างฐานข้อมูลชั่วคราว จำลอง schema `auth`/`storage`
ของ Supabase รัน migration แล้วตรวจว่าผู้ใช้แต่ละคนเข้าถึงได้เฉพาะข้อมูลของตัวเอง
