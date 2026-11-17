// สร้าง supabase/seed/official_products.sql จาก scripts/official-products.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { FX_LABELS, PRODUCTS, manifestFor } from "./official-products.mjs";

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
let sql = `-- LUMINA STUDIO · สินค้าตั้งต้นของ LUMINA Official (สร้างโดย scripts/gen-seed-sql.mjs — อย่าแก้ด้วยมือ)
-- รันหลัง migration ของ Phase 3 · รันซ้ำได้ (อัปเดตข้อมูลเดิม)
`;
for (const p of PRODUCTS) {
  sql += `
with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values (${q(p.slug)}, 'LUMINA Official', ${q(p.title)}, ${q(p.description)}, ${q(p.category)}, ${q(FX_LABELS[p.fx])}, ${p.priceSatang}, 'published',
          ${q(`/market/previews/${p.slug}.jpg`)}, ${q(`/market/previews/${p.slug}.webm`)}, ${p.sortOrder}, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, ${q(JSON.stringify(manifestFor(p)))}::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();
`;
}
mkdirSync("supabase/seed", { recursive: true });
writeFileSync("supabase/seed/official_products.sql", sql);
console.log("wrote", PRODUCTS.length, "products");
