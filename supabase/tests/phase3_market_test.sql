-- ทดสอบ Marketplace: สิทธิ์, คำสั่งซื้อ, การชำระเงิน, License, ดาวน์โหลด
\set ON_ERROR_STOP on
\set A '''aaaaaaaa-0000-0000-0000-00000000000a'''
\set B '''bbbbbbbb-0000-0000-0000-00000000000b'''

create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
create or replace function pg_temp.pid(s text) returns uuid language sql as $$ select id from public.products where slug = s $$;

insert into auth.users (id, email) values (:A, 'a@x.dev'), (:B, 'b@x.dev');
select pg_temp.check((select count(*) from public.products where status = 'published') = 12, 'seed สินค้า 12 รายการ');
select pg_temp.check((select count(*) from public.product_packages) = 12, 'seed ไฟล์สินค้า 12 รายการ');
insert into public.products (id, slug, creator_name, title, category, price_satang, status)
  values ('dddddddd-0000-0000-0000-00000000000d', 'hidden-draft', 'X', 'Draft', 'abstract', 5000, 'draft');

-- ---------- anon ----------
set role anon;
select pg_temp.check((select count(*) from public.products) = 12, 'anon เห็นเฉพาะสินค้าที่วางขาย');
select pg_temp.check((select count(*) from public.product_packages) = 0, 'anon อ่านไฟล์สินค้าไม่ได้');
reset role;

-- ---------- ผู้ใช้ A ----------
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false);
select pg_temp.check((select count(*) from public.product_packages) = 0, 'ผู้ใช้อ่านไฟล์สินค้าไม่ได้ (ต้องผ่าน License)');
insert into public.cart_items (product_id) values (pg_temp.pid('neon-facade-outline')), (pg_temp.pid('spectrum-drift'));
select pg_temp.check((select count(*) from public.cart_items) = 2, 'ใส่ตะกร้า 2 รายการ');
do $$ begin
  begin
    insert into public.cart_items (product_id) values ('dddddddd-0000-0000-0000-00000000000d');
    raise exception 'FAIL: ใส่สินค้า draft ลงตะกร้าได้';
  exception when insufficient_privilege then raise notice 'ok - ใส่สินค้าที่ไม่ได้วางขายไม่ได้';
  end;
  begin
    insert into public.cart_items (user_id, product_id)
      values ('bbbbbbbb-0000-0000-0000-00000000000b', (select id from public.products where slug = 'ocean-sparkle'));
    raise exception 'FAIL: ใส่ตะกร้าของคนอื่นได้';
  exception when insufficient_privilege then raise notice 'ok - ใส่ตะกร้าของคนอื่นไม่ได้';
  end;
  begin
    insert into public.orders (user_id, total_satang, payment_method) values ('aaaaaaaa-0000-0000-0000-00000000000a', 0, 'free');
    raise exception 'FAIL: สร้างคำสั่งซื้อเองได้';
  exception when insufficient_privilege then raise notice 'ok - ผู้ใช้สร้างคำสั่งซื้อเองไม่ได้';
  end;
  begin
    insert into public.licenses (license_key, user_id, product_id, order_id)
      values ('LUM-AAAA-AAAA-AAAA-AAAA', 'aaaaaaaa-0000-0000-0000-00000000000a', gen_random_uuid(), gen_random_uuid());
    raise exception 'FAIL: สร้าง License เองได้';
  exception when insufficient_privilege then raise notice 'ok - ผู้ใช้สร้าง License เองไม่ได้';
  end;
  begin
    perform public.mark_order_paid(gen_random_uuid(), 'x', 0);
    raise exception 'FAIL: ผู้ใช้เรียก mark_order_paid ได้';
  exception when insufficient_privilege then raise notice 'ok - ผู้ใช้เรียกฟังก์ชันชำระเงินไม่ได้';
  end;
  begin
    perform public.create_order_from_cart('aaaaaaaa-0000-0000-0000-00000000000a', 'card');
    raise exception 'FAIL: ผู้ใช้เรียก create_order_from_cart ได้';
  exception when insufficient_privilege then raise notice 'ok - ผู้ใช้เรียกฟังก์ชันสร้างคำสั่งซื้อไม่ได้';
  end;
end $$;
reset role;

-- ---------- Edge Function (service_role) ----------
set role service_role;
create temp table t_order as select * from public.create_order_from_cart(:A, 'promptpay');
select pg_temp.check((select total_satang from t_order) = 89000 + 39000, 'ราคาคิดจากฐานข้อมูล (1,280 บาท)');
select pg_temp.check((select count(*) from public.order_items where order_id = (select order_id from t_order)) = 2, 'order_items 2 รายการ');
select public.attach_order_charge((select order_id from t_order), 'chrg_test_1', now() + interval '1 day');

do $$ begin
  begin
    perform public.mark_order_paid((select order_id from t_order), 'chrg_test_1', 100);
    raise exception 'FAIL: ยอดเงินไม่ตรงแต่ผ่าน';
  exception when raise_exception then
    if sqlerrm <> 'amount_mismatch' then raise; end if;
    raise notice 'ok - ยอดเงินไม่ตรง → ปฏิเสธ';
  end;
  begin
    perform public.mark_order_paid((select order_id from t_order), 'chrg_other', 128000);
    raise exception 'FAIL: charge id ไม่ตรงแต่ผ่าน';
  exception when raise_exception then
    if sqlerrm <> 'charge_mismatch' then raise; end if;
    raise notice 'ok - charge id ไม่ตรง → ปฏิเสธ';
  end;
end $$;

select pg_temp.check(public.mark_order_paid((select order_id from t_order), 'chrg_test_1', 128000) = 'paid', 'ชำระเงินสำเร็จ');
select pg_temp.check(public.mark_order_paid((select order_id from t_order), 'chrg_test_1', 128000) = 'already_paid', 'webhook ซ้ำไม่ทำซ้ำ');
select pg_temp.check((select count(*) from public.licenses where user_id = :A) = 2, 'ออก License 2 ใบ (ไม่ซ้ำ)');
select pg_temp.check((select bool_and(license_key ~ '^LUM(-[0-9A-F]{4}){4}$') from public.licenses), 'รูปแบบ License key');
select pg_temp.check((select count(*) from public.cart_items where user_id = :A) = 0, 'ล้างตะกร้าหลังจ่าย');

-- ซื้อซ้ำสินค้าที่มีอยู่แล้วไม่ได้
insert into public.cart_items (user_id, product_id) values (:A, pg_temp.pid('neon-facade-outline'));
do $$ begin
  begin
    perform public.create_order_from_cart('aaaaaaaa-0000-0000-0000-00000000000a', 'card');
    raise exception 'FAIL: ซื้อซ้ำได้';
  exception when raise_exception then
    if sqlerrm <> 'already_owned' then raise; end if;
    raise notice 'ok - ซื้อสินค้าที่มีอยู่แล้วซ้ำไม่ได้';
  end;
end $$;
delete from public.cart_items where user_id = :A;
do $$ begin
  begin
    perform public.create_order_from_cart('aaaaaaaa-0000-0000-0000-00000000000a', 'card');
    raise exception 'FAIL: ตะกร้าว่างแต่สร้างคำสั่งซื้อได้';
  exception when raise_exception then
    if sqlerrm <> 'cart_empty' then raise; end if;
    raise notice 'ok - ตะกร้าว่าง → ปฏิเสธ';
  end;
end $$;

-- ดาวน์โหลด: สิทธิ์ + จำกัดจำนวน
create temp table t_lic as select id from public.licenses where user_id = :A limit 1;
select pg_temp.check((select manifest->>'app' from public.consume_download(:A, (select id from t_lic))) = 'LUMINA STUDIO', 'ดาวน์โหลดได้เมื่อมี License');
do $$ begin
  begin
    perform public.consume_download('bbbbbbbb-0000-0000-0000-00000000000b', (select id from t_lic));
    raise exception 'FAIL: ใช้ License ของคนอื่นดาวน์โหลดได้';
  exception when raise_exception then
    if sqlerrm <> 'no_license' then raise; end if;
    raise notice 'ok - ใช้ License ของคนอื่นไม่ได้';
  end;
end $$;
select public.consume_download(:A, (select id from t_lic)) from generate_series(1, 19);
do $$ begin
  begin
    perform public.consume_download('aaaaaaaa-0000-0000-0000-00000000000a', (select id from t_lic));
    raise exception 'FAIL: ไม่จำกัดจำนวนดาวน์โหลด';
  exception when raise_exception then
    if sqlerrm <> 'rate_limited' then raise; end if;
    raise notice 'ok - จำกัด 20 ครั้ง/24 ชม.';
  end;
end $$;

-- คำสั่งซื้อล้มเหลว / หมดอายุ
insert into public.cart_items (user_id, product_id) values (:B, pg_temp.pid('ocean-sparkle'));
create temp table t_b as select * from public.create_order_from_cart(:B, 'promptpay');
select public.mark_order_failed((select order_id from t_b), 'expired', 'QR หมดอายุ');
select pg_temp.check((select status from public.orders where id = (select order_id from t_b)) = 'expired', 'คำสั่งซื้อหมดอายุ');
select pg_temp.check((select count(*) from public.cart_items where user_id = :B) = 1, 'หมดอายุแล้วตะกร้ายังอยู่');
-- จ่ายเข้ามาหลังหมดอายุ (เงินถูกตัดจริง) → ยังส่งมอบสินค้า
select pg_temp.check(public.mark_order_paid((select order_id from t_b), null, 45000) = 'paid', 'จ่ายหลังหมดอายุยังส่งมอบสินค้า');

-- คืนเงิน → ยกเลิก License
select public.mark_order_refunded((select order_id from t_order));
select pg_temp.check((select count(*) from public.licenses where user_id = :A and status = 'active') = 0, 'คืนเงินแล้ว License ถูกยกเลิก');
do $$ begin
  begin
    perform public.consume_download('aaaaaaaa-0000-0000-0000-00000000000a', (select id from t_lic));
    raise exception 'FAIL: License ที่ถูกยกเลิกยังดาวน์โหลดได้';
  exception when raise_exception then
    if sqlerrm <> 'no_license' then raise; end if;
    raise notice 'ok - License ที่ถูกยกเลิกดาวน์โหลดไม่ได้';
  end;
end $$;
reset role;

-- ---------- ผู้ใช้ B มองไม่เห็นของ A ----------
set role authenticated;
select set_config('request.jwt.claim.sub', :B, false);
select pg_temp.check((select count(*) from public.orders) = 1, 'B เห็นเฉพาะคำสั่งซื้อของตัวเอง');
select pg_temp.check((select count(*) from public.licenses) = 1, 'B เห็นเฉพาะ License ของตัวเอง');
select pg_temp.check((select count(*) from public.order_items) = 1, 'B เห็นเฉพาะรายการสินค้าในคำสั่งซื้อของตัวเอง');
update public.orders set status = 'paid';
update public.licenses set status = 'active';
reset role;
select pg_temp.check((select status from public.orders where id = (select order_id from t_order)) = 'refunded', 'ผู้ใช้แก้สถานะคำสั่งซื้อไม่ได้');
\echo 'Marketplace: ผ่านทั้งหมด'
