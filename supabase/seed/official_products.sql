-- LUMINA STUDIO · สินค้าตั้งต้นของ LUMINA Official (สร้างโดย scripts/gen-seed-sql.mjs — อย่าแก้ด้วยมือ)
-- รันหลัง migration ของ Phase 3 · รันซ้ำได้ (อัปเดตข้อมูลเดิม)

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('neon-facade-outline', 'LUMINA Official', 'Neon Facade Outline', 'เส้นนีออนวิ่งรอบขอบพื้นที่ เหมาะกับการเน้นโครงหน้าต่างและกรอบอาคาร', 'building', 'Neon', 89000, 'published',
          '/market/previews/neon-facade-outline.jpg', '/market/previews/neon-facade-outline.webm', 0, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Neon Facade Outline","dur":10,"surfaces":[{"name":"Neon Facade Outline","fx":1,"p":{"intensity":1,"speed":1,"hue":0.92,"scale":1,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('rainbow-wall-sweep', 'LUMINA Official', 'Rainbow Wall Sweep', 'แถบสีรุ้งกวาดผ่านผนังอย่างนุ่มนวล ใช้ได้ทั้งผนังเรียบและผนังมีลวดลาย', 'building', 'Spectrum', 69000, 'published',
          '/market/previews/rainbow-wall-sweep.jpg', '/market/previews/rainbow-wall-sweep.webm', 1, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Rainbow Wall Sweep","dur":10,"surfaces":[{"name":"Rainbow Wall Sweep","fx":2,"p":{"intensity":1,"speed":1,"hue":0,"scale":1.4,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('cube-pulse-pack', 'LUMINA Official', 'Cube Pulse Pack', 'วงคลื่นพลังงานเต้นจากศูนย์กลาง เหมาะกับแต่ละหน้าของลูกบาศก์', 'cube', 'Energy Pulse', 49000, 'published',
          '/market/previews/cube-pulse-pack.jpg', '/market/previews/cube-pulse-pack.webm', 2, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Cube Pulse Pack","dur":10,"surfaces":[{"name":"Cube Pulse Pack","fx":3,"p":{"intensity":1,"speed":1,"hue":0.6,"scale":0.7,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('matrix-grid-cube', 'LUMINA Official', 'Matrix Grid Cube', 'กริดดิจิทัลพร้อมแสงสแกน ให้ลุคเทคโนโลยีสำหรับงาน Cube Mapping', 'cube', 'Digital Grid', 59000, 'published',
          '/market/previews/matrix-grid-cube.jpg', '/market/previews/matrix-grid-cube.webm', 3, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Matrix Grid Cube","dur":10,"surfaces":[{"name":"Matrix Grid Cube","fx":4,"p":{"intensity":1,"speed":1,"hue":0.35,"scale":1,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('golden-temple-aura', 'LUMINA Official', 'Golden Temple Aura', 'ออร่าสีทองไหลเหมือนควันแสง เหมาะกับสถาปัตยกรรมไทยและวัตถุทรงอิสระ', 'organic', 'Golden Aura', 129000, 'published',
          '/market/previews/golden-temple-aura.jpg', '/market/previews/golden-temple-aura.webm', 4, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Golden Temple Aura","dur":10,"surfaces":[{"name":"Golden Temple Aura","fx":5,"p":{"intensity":1,"speed":1,"hue":0.1,"scale":1.2,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('liquid-light-form', 'LUMINA Official', 'Liquid Light Form', 'แสงเหลวโทนฟ้าน้ำทะเล เคลื่อนไหวช้า ๆ สำหรับประติมากรรมและผิวโค้ง', 'organic', 'Golden Aura', 79000, 'published',
          '/market/previews/liquid-light-form.jpg', '/market/previews/liquid-light-form.webm', 5, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Liquid Light Form","dur":10,"surfaces":[{"name":"Liquid Light Form","fx":5,"p":{"intensity":1,"speed":1,"hue":0.55,"scale":2,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('spectrum-drift', 'LUMINA Official', 'Spectrum Drift', 'สเปกตรัมสีลอยช้า ๆ สำหรับงาน Light Art แบบนามธรรม', 'abstract', 'Spectrum', 39000, 'published',
          '/market/previews/spectrum-drift.jpg', '/market/previews/spectrum-drift.webm', 6, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Spectrum Drift","dur":10,"surfaces":[{"name":"Spectrum Drift","fx":2,"p":{"intensity":1,"speed":0.6,"hue":0,"scale":0.5,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('violet-pulse-rings', 'LUMINA Official', 'Violet Pulse Rings', 'วงแหวนสีม่วงกระจายเป็นจังหวะ จับคู่กับเพลงได้ดีเมื่อเปิด Audio Reactive', 'abstract', 'Energy Pulse', 35000, 'published',
          '/market/previews/violet-pulse-rings.jpg', '/market/previews/violet-pulse-rings.webm', 7, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Violet Pulse Rings","dur":10,"surfaces":[{"name":"Violet Pulse Rings","fx":3,"p":{"intensity":1,"speed":1,"hue":0.78,"scale":1.6,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('starfall-particles', 'LUMINA Official', 'Starfall Particles', 'อนุภาคแสงสีอุ่นร่วงลงเหมือนดาวตก ใช้เป็นเลเยอร์ทับงานอื่นได้', 'particle', 'Particle Field', 59000, 'published',
          '/market/previews/starfall-particles.jpg', '/market/previews/starfall-particles.webm', 8, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Starfall Particles","dur":10,"surfaces":[{"name":"Starfall Particles","fx":6,"p":{"intensity":1,"speed":1,"hue":0.12,"scale":1,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('ocean-sparkle', 'LUMINA Official', 'Ocean Sparkle', 'ประกายแสงโทนฟ้าระยิบระยับ ให้บรรยากาศใต้ทะเล', 'particle', 'Particle Field', 45000, 'published',
          '/market/previews/ocean-sparkle.jpg', '/market/previews/ocean-sparkle.webm', 9, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Ocean Sparkle","dur":10,"surfaces":[{"name":"Ocean Sparkle","fx":6,"p":{"intensity":1,"speed":1,"hue":0.52,"scale":1.6,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('prism-triangles', 'LUMINA Official', 'Prism Triangles', 'สามเหลี่ยมปริซึมกระพริบเป็นจังหวะ สร้างมิติแบบ 3D บนพื้นผิวเรียบ', 'geometric', 'Geometric Prism', 69000, 'published',
          '/market/previews/prism-triangles.jpg', '/market/previews/prism-triangles.webm', 10, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Prism Triangles","dur":10,"surfaces":[{"name":"Prism Triangles","fx":7,"p":{"intensity":1,"speed":1,"hue":0.75,"scale":1,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();

with up as (
  insert into public.products (slug, creator_name, title, description, category, effect_label, price_satang, status, cover_url, preview_url, sort_order, published_at)
  values ('tumbling-facets', 'LUMINA Official', 'Tumbling Facets', 'เหลี่ยมเพชรโทนส้มพลิกไปมาช้า ๆ สำหรับงานหน้าอาคารขนาดใหญ่', 'geometric', 'Geometric Prism', 149000, 'published',
          '/market/previews/tumbling-facets.jpg', '/market/previews/tumbling-facets.webm', 11, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, category = excluded.category,
    effect_label = excluded.effect_label, price_satang = excluded.price_satang, status = excluded.status,
    cover_url = excluded.cover_url, preview_url = excluded.preview_url, sort_order = excluded.sort_order
  returning id
)
insert into public.product_packages (product_id, manifest)
select id, '{"app":"LUMINA STUDIO","version":2,"kind":"preset","project":{"name":"Tumbling Facets","dur":10,"surfaces":[{"name":"Tumbling Facets","fx":7,"p":{"intensity":1,"speed":0.6,"hue":0.05,"scale":1.8,"opacity":1,"feather":0,"audio":0},"blend":"add","mode":"pin","n":1,"pts":[[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],"mask":[],"maskInv":false,"media":null,"tin":0,"tout":null,"vis":true}]}}'::jsonb from up
on conflict (product_id) do update set manifest = excluded.manifest, updated_at = now();
