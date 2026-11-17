-- LUMINA STUDIO · Phase 3 — Marketplace
-- สินค้า, ตะกร้า, คำสั่งซื้อ, License, การดาวน์โหลด
--
-- หลักการ:
-- - ผู้ใช้อ่าน/เขียนผ่าน RLS เฉพาะ cart_items และอ่านข้อมูลของตัวเองเท่านั้น
-- - คำสั่งซื้อ / การจ่ายเงิน / License ถูกสร้างโดยฟังก์ชัน SECURITY DEFINER ที่เรียกได้เฉพาะ
--   service_role (Supabase Edge Functions) — ราคาคิดจากฐานข้อมูลเสมอ ไม่เชื่อค่าจากเบราว์เซอร์
-- - เงินเก็บเป็นสตางค์ (integer) · Omise คิดขั้นต่ำ 20 บาท จึงอนุญาตราคา 0 (ฟรี) หรือ ≥ 2000 สตางค์

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  -- null = สินค้าของแพลตฟอร์ม (LUMINA Official)
  creator_id uuid references auth.users (id) on delete set null,
  creator_name text not null check (char_length(creator_name) between 1 and 100),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('building', 'cube', 'organic', 'abstract', 'particle', 'geometric')),
  effect_label text not null default '' check (char_length(effect_label) <= 60),
  price_satang integer not null check (price_satang = 0 or price_satang between 2000 and 10000000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  cover_url text check (char_length(cover_url) <= 1000),
  preview_url text check (char_length(preview_url) <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index products_published_idx on public.products (status, published_at desc);

alter table public.products enable row level security;

-- ทุกคนเห็นสินค้าที่วางขาย (ตัวพรีเซ็ตจริงอยู่ใน product_packages ซึ่งไม่มี policy ให้อ่าน)
create policy products_select_published
  on public.products for select
  to anon, authenticated
  using (status = 'published');

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ไฟล์สินค้า (พรีเซ็ต/โปรเจกต์ LUMINA) — ไม่มี policy: อ่านได้เฉพาะผ่าน Edge Function หลังตรวจ License
create table public.product_packages (
  product_id uuid primary key references public.products (id) on delete cascade,
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object' and pg_column_size(manifest) <= 2000000),
  updated_at timestamptz not null default now()
);

alter table public.product_packages enable row level security;

-- ---------------------------------------------------------------------------
-- cart_items
-- ---------------------------------------------------------------------------
create table public.cart_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.cart_items enable row level security;

create policy cart_items_select_own
  on public.cart_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ใส่ตะกร้าได้เฉพาะสินค้าที่วางขายอยู่
create policy cart_items_insert_own
  on public.cart_items for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
  );

create policy cart_items_delete_own
  on public.cart_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- orders / order_items
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'refunded')),
  total_satang integer not null check (total_satang >= 0),
  currency text not null default 'thb' check (currency = 'thb'),
  payment_method text not null check (payment_method in ('promptpay', 'card', 'free')),
  provider text not null default 'omise',
  provider_charge_id text unique,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz
);

create index orders_user_idx on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

create policy orders_select_own
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  -- ข้อมูล ณ เวลาที่ซื้อ (ใช้คำนวณรายได้ creator ใน Phase 4)
  title text not null,
  price_satang integer not null check (price_satang >= 0),
  creator_id uuid references auth.users (id) on delete set null,
  primary key (order_id, product_id)
);

alter table public.order_items enable row level security;

create policy order_items_select_own
  on public.order_items for select
  to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- licenses / download_events
-- ---------------------------------------------------------------------------
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text not null unique check (license_key ~ '^LUM(-[0-9A-F]{4}){4}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ผู้ใช้หนึ่งคนมี License ที่ใช้งานได้ต่อสินค้าได้ใบเดียว
create unique index licenses_one_active_idx on public.licenses (user_id, product_id) where status = 'active';
create index licenses_user_idx on public.licenses (user_id, created_at desc);

alter table public.licenses enable row level security;

create policy licenses_select_own
  on public.licenses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create table public.download_events (
  id bigint generated always as identity primary key,
  license_id uuid not null references public.licenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index download_events_license_idx on public.download_events (license_id, created_at desc);

alter table public.download_events enable row level security;

create policy download_events_select_own
  on public.download_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- ฟังก์ชันสำหรับ Edge Functions (service_role เท่านั้น)
-- ---------------------------------------------------------------------------

create or replace function public.new_license_key()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'LUM-' || substr(k, 1, 4) || '-' || substr(k, 5, 4) || '-' || substr(k, 9, 4) || '-' || substr(k, 13, 4)
  from (select upper(replace(gen_random_uuid()::text, '-', '')) as k) s;
$$;

/**
 * สร้างคำสั่งซื้อจากตะกร้าของผู้ใช้ (ราคาจากตาราง products)
 * ข้ามสินค้าที่ไม่ได้วางขายแล้ว และปฏิเสธถ้าตะกร้าว่างหรือมีสินค้าที่มี License อยู่แล้ว
 */
create or replace function public.create_order_from_cart(p_user uuid, p_method text)
returns table (order_id uuid, total_satang integer, item_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
  v_total integer;
  v_count integer;
begin
  if p_method not in ('promptpay', 'card') then
    raise exception 'invalid payment method' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.cart_items c
    join public.licenses l on l.product_id = c.product_id and l.user_id = c.user_id and l.status = 'active'
    where c.user_id = p_user
  ) then
    raise exception 'already_owned' using errcode = 'P0001';
  end if;

  select coalesce(sum(p.price_satang), 0)::integer, count(*)::integer
    into v_total, v_count
  from public.cart_items c
  join public.products p on p.id = c.product_id and p.status = 'published'
  where c.user_id = p_user;

  if v_count = 0 then
    raise exception 'cart_empty' using errcode = 'P0001';
  end if;
  if v_total > 0 and v_total < 2000 then
    raise exception 'below_minimum' using errcode = 'P0001';
  end if;

  insert into public.orders (user_id, total_satang, payment_method)
  values (p_user, v_total, case when v_total = 0 then 'free' else p_method end)
  returning id into v_order;

  insert into public.order_items (order_id, product_id, title, price_satang, creator_id)
  select v_order, p.id, p.title, p.price_satang, p.creator_id
  from public.cart_items c
  join public.products p on p.id = c.product_id and p.status = 'published'
  where c.user_id = p_user;

  return query select v_order, v_total, v_count;
end;
$$;

create or replace function public.attach_order_charge(p_order uuid, p_charge text, p_expires_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
     set provider_charge_id = p_charge, expires_at = p_expires_at
   where id = p_order and status = 'pending';
$$;

/**
 * ทำเครื่องหมายว่าชำระแล้ว + ออก License + ล้างสินค้านั้นออกจากตะกร้า
 * idempotent: เรียกซ้ำได้ (webhook ส่งซ้ำ / polling) โดยไม่ออก License ซ้ำ
 * ตรวจยอดเงินกับยอดในคำสั่งซื้อทุกครั้ง
 */
create or replace function public.mark_order_paid(p_order uuid, p_charge text, p_amount integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if o.status = 'paid' then
    return 'already_paid';
  end if;
  if o.status = 'refunded' then
    return 'refunded';
  end if;
  if p_amount <> o.total_satang then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;
  if o.provider_charge_id is not null and p_charge is distinct from o.provider_charge_id then
    raise exception 'charge_mismatch' using errcode = 'P0001';
  end if;

  -- จ่ายแล้วจริง (แม้คำสั่งซื้อจะเคยถูกตั้งว่าหมดอายุ/ล้มเหลวในฝั่งเรา) → ส่งมอบสินค้า
  update public.orders
     set status = 'paid', paid_at = now(), failure_message = null,
         provider_charge_id = coalesce(provider_charge_id, p_charge)
   where id = p_order;

  insert into public.licenses (license_key, user_id, product_id, order_id)
  select public.new_license_key(), o.user_id, i.product_id, o.id
  from public.order_items i
  where i.order_id = o.id
  on conflict (user_id, product_id) where status = 'active' do nothing;

  delete from public.cart_items c
  using public.order_items i
  where i.order_id = o.id and c.user_id = o.user_id and c.product_id = i.product_id;

  return 'paid';
end;
$$;

create or replace function public.mark_order_failed(p_order uuid, p_status text, p_message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
     set status = p_status, failure_message = left(p_message, 300)
   where id = p_order and status = 'pending' and p_status in ('failed', 'expired');
$$;

/** คืนเงินแล้ว → ยกเลิก License ของคำสั่งซื้อนั้น */
create or replace function public.mark_order_refunded(p_order uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders set status = 'refunded' where id = p_order and status = 'paid';
  update public.licenses set status = 'revoked', revoked_at = now()
   where order_id = p_order and status = 'active';
$$;

/**
 * ตรวจสิทธิ์ดาวน์โหลด + จำกัด 20 ครั้งต่อ License ต่อ 24 ชั่วโมง
 * คืนค่า manifest ของสินค้า (null ถ้าไม่มีสิทธิ์)
 */
create or replace function public.consume_download(p_user uuid, p_license uuid)
returns table (product_id uuid, title text, manifest jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.licenses%rowtype;
begin
  select * into l from public.licenses where id = p_license and user_id = p_user and status = 'active';
  if not found then
    raise exception 'no_license' using errcode = 'P0001';
  end if;
  if (select count(*) from public.download_events d
       where d.license_id = l.id and d.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.download_events (license_id, user_id) values (l.id, p_user);
  return query
    select p.id, p.title, pk.manifest
    from public.products p join public.product_packages pk on pk.product_id = p.id
    where p.id = l.product_id;
end;
$$;

-- เรียกได้เฉพาะ service_role (Edge Functions)
revoke execute on function public.new_license_key() from public, anon, authenticated;
revoke execute on function public.create_order_from_cart(uuid, text) from public, anon, authenticated;
revoke execute on function public.attach_order_charge(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.mark_order_failed(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.mark_order_refunded(uuid) from public, anon, authenticated;
revoke execute on function public.consume_download(uuid, uuid) from public, anon, authenticated;
grant execute on function public.new_license_key() to service_role;
grant execute on function public.create_order_from_cart(uuid, text) to service_role;
grant execute on function public.attach_order_charge(uuid, text, timestamptz) to service_role;
grant execute on function public.mark_order_paid(uuid, text, integer) to service_role;
grant execute on function public.mark_order_failed(uuid, text, text) to service_role;
grant execute on function public.mark_order_refunded(uuid) to service_role;
grant execute on function public.consume_download(uuid, uuid) to service_role;
