# เรนเดอร์วิดีโอตัวอย่างสินค้า LUMINA Official

สร้าง `public/market/previews/<slug>.webm|jpg` จาก `scripts/official-products.mjs` ด้วย engine ของ Studio

```bash
npx esbuild scripts/render-previews/entry.ts --bundle --format=iife --outfile=scripts/render-previews/engine.js
node scripts/render-previews/render.mjs   # ต้องมี playwright + Chromium
```
