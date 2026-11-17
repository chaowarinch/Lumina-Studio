# ตั้งค่า Marketplace + ชำระเงิน Omise (Phase 3)

ใช้ **test mode** ของ Omise ทั้งหมด — ไม่มีการตัดเงินจริง

## 1. รัน SQL ใน Supabase

**SQL Editor → New query** แล้วรันทีละไฟล์ตามลำดับ (คัดลอกทั้งไฟล์ → Run):

1. `supabase/migrations/20261118000001_phase3_marketplace.sql` — ตารางสินค้า ตะกร้า คำสั่งซื้อ License
2. `supabase/seed/official_products.sql` — สินค้าตั้งต้น 12 รายการของ LUMINA Official (รันซ้ำได้)

ตรวจ: **Table Editor → products** ต้องมี 12 แถว

## 2. คีย์ของ Omise (test)

Omise Dashboard → สลับเป็น **Test mode** (มุมบน) → **Keys**

| คีย์ | ขึ้นต้นด้วย | ใส่ที่ไหน |
|---|---|---|
| Public key | `pkey_test_` | `.env.local` ของแอป (ค่าสาธารณะ) |
| Secret key | `skey_test_` | **Supabase Secrets เท่านั้น** (ข้อ 4) ห้ามใส่ใน `.env.local` ห้ามส่งในแชต |

เพิ่มบรรทัดนี้ใน `.env.local` แล้วรีสตาร์ท `npm run dev`:

```
NEXT_PUBLIC_OMISE_PUBLIC_KEY=pkey_test_xxxxxxxx
```

## 3. ติดตั้ง/ล็อกอิน Supabase CLI (ครั้งเดียว)

ใน PowerShell ในโฟลเดอร์ `Lumina-Studio`:

```bash
npx supabase login
```

(เปิดเบราว์เซอร์ให้ยืนยัน) แล้วเชื่อมกับโปรเจกต์ — `<project-ref>` คือส่วนหน้าของ Project URL เช่น `odohtsnqmwmttcbztsxy`:

```bash
npx supabase link --project-ref <project-ref>
```

## 4. ตั้ง secrets ของ Edge Functions

```bash
npx supabase secrets set OMISE_SECRET_KEY=skey_test_xxxxxxxx
```

```bash
npx supabase secrets set APP_ORIGINS=http://localhost:3000
```

`APP_ORIGINS` = เว็บที่อนุญาตให้ชำระเงิน (คั่นด้วย `,` เมื่อมีโดเมนจริง เช่น `http://localhost:3000,https://lumina.example.com`)

> `SUPABASE_URL` และ service role key มีให้ใน Edge Functions อัตโนมัติ ไม่ต้องตั้งเอง

## 5. Deploy Edge Functions

```bash
npx supabase functions deploy --use-api
```

ต้องเห็น `checkout`, `order-sync`, `payment-webhook`, `download` ใน **Edge Functions** ของ Dashboard
(ถ้า CLI รุ่นของคุณไม่รู้จัก `--use-api` ให้รันโดยไม่ใส่ flag นี้ — ต้องเปิด Docker Desktop ไว้)

## 6. ตั้ง Webhook ใน Omise

Omise Dashboard (Test mode) → **Webhooks** → endpoint:

```
https://<project-ref>.supabase.co/functions/v1/payment-webhook
```

Webhook ช่วยให้คำสั่งซื้ออัปเดตแม้ผู้ซื้อปิดหน้าเว็บไปแล้ว (หน้าเว็บเองก็ถามสถานะทุก 4 วินาทีอยู่แล้ว)
ฟังก์ชันไม่เชื่อข้อมูลใน webhook — ดึง charge จาก Omise ใหม่ด้วย secret key ทุกครั้ง

## 7. ทดสอบ

1. http://localhost:3000/market → เลือกสินค้า → **ใส่ตะกร้า** → **ชำระเงิน**
2. **PromptPay**: จะเห็น QR → ไปที่ Omise Dashboard (Test mode) → **Charges** → เปิดรายการล่าสุด → กดปุ่ม
   ยืนยันว่าจ่ายแล้ว (Mark as paid / successful) → หน้าเว็บจะขึ้น "ชำระเงินสำเร็จ" ภายในไม่กี่วินาที
3. **บัตร**: เลข `4242 4242 4242 4242` วันหมดอายุในอนาคต CVV อะไรก็ได้ → สำเร็จ
   (บัตรทดสอบแบบล้มเหลว/3-D Secure ดูได้ที่หน้า *Testing* ในเอกสารของ Omise)
4. **ผลงานของฉัน → My Downloads**: ต้องเห็น License key → **ดาวน์โหลด** (ไฟล์ `.lumina.json`) และ **ใช้ใน Studio**

## แก้ปัญหา

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| "ที่อยู่เว็บนี้ยังไม่ได้รับอนุญาตให้ชำระเงิน" | ตั้ง `APP_ORIGINS` ให้ตรงกับที่อยู่ในแถบเบราว์เซอร์ (ข้อ 4) แล้ว deploy ใหม่ |
| "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_OMISE_PUBLIC_KEY" | ข้อ 2 แล้วรีสตาร์ท `npm run dev` |
| กดชำระแล้วขึ้น "ชำระเงินไม่สำเร็จ ลองอีกครั้ง" ทันที | ดู log: Dashboard → Edge Functions → checkout → Logs (มักเป็น secret key ผิด) |
| จ่ายแล้วหน้าเว็บไม่อัปเดต | ตรวจ Omise Webhook (ข้อ 6) และ log ของ `order-sync` |
