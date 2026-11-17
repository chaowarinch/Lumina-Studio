-- ทดสอบ Row Level Security: ผู้ใช้ A กับ B ต้องเห็นเฉพาะข้อมูลของตัวเอง
\set ON_ERROR_STOP on
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''

create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- สมัครสมาชิก → trigger สร้าง profile
insert into auth.users (id, email, raw_user_meta_data) values
  (:A, 'a@example.com', '{"full_name":"ผู้ใช้ A","avatar_url":"https://x/a.png"}'),
  (:B, 'b@example.com', '{}');
select pg_temp.check((select display_name from public.profiles where id = :A) = 'ผู้ใช้ A', 'profile จาก full_name');
select pg_temp.check((select display_name from public.profiles where id = :B) = 'b', 'profile fallback เป็นชื่อหน้าอีเมล');

-- ---------- ผู้ใช้ A ----------
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false);
insert into public.projects (name, data) values ('งาน A', '{"name":"งาน A","dur":10,"surfaces":[]}');
select pg_temp.check((select owner_id from public.projects where name = 'งาน A') = :A, 'owner_id = auth.uid() อัตโนมัติ');
select pg_temp.check((select version from public.projects where name = 'งาน A') = 1, 'version เริ่มที่ 1');
update public.projects set name = 'งาน A2' where name = 'งาน A';
select pg_temp.check((select version from public.projects where name = 'งาน A2') = 2, 'บันทึกแล้ว version +1');
update public.projects set thumbnail_path = 'aaaaaaaa-0000-0000-0000-000000000001/t.jpg' where name = 'งาน A2';
select pg_temp.check((select version from public.projects where name = 'งาน A2') = 2, 'แก้แค่ thumbnail ไม่เพิ่ม version');
update public.projects set version = 99 where name = 'งาน A2';
select pg_temp.check((select version from public.projects where name = 'งาน A2') = 2, 'ตั้ง version เองไม่ได้');
insert into public.media_assets (kind, mime_type, size_bytes, storage_path)
  values ('image', 'image/png', 1000, 'aaaaaaaa-0000-0000-0000-000000000001/x.png');
insert into storage.objects (bucket_id, name) values ('media', 'aaaaaaaa-0000-0000-0000-000000000001/x.png');

do $$ begin
  begin
    insert into public.projects (owner_id, name, data) values ('bbbbbbbb-0000-0000-0000-000000000002', 'ปลอม', '{}');
    raise exception 'FAIL: สร้างโปรเจกต์ในชื่อคนอื่นได้';
  exception when insufficient_privilege then raise notice 'ok - สร้างโปรเจกต์ในชื่อคนอื่นไม่ได้';
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'bbbbbbbb-0000-0000-0000-000000000002/y.png');
    raise exception 'FAIL: อัปโหลดลงโฟลเดอร์คนอื่นได้';
  exception when insufficient_privilege then raise notice 'ok - อัปโหลดลงโฟลเดอร์คนอื่นไม่ได้';
  end;
  begin
    insert into public.media_assets (kind, mime_type, size_bytes, storage_path)
      values ('video', 'video/mp4', 52428801, 'aaaaaaaa-0000-0000-0000-000000000001/big.mp4');
    raise exception 'FAIL: ไฟล์เกิน 50 MB ผ่าน';
  exception when check_violation then raise notice 'ok - ไฟล์เกิน 50 MB ถูกปฏิเสธ';
  end;
  begin
    insert into public.media_assets (kind, mime_type, size_bytes, storage_path)
      values ('image', 'image/png', 10, 'bbbbbbbb-0000-0000-0000-000000000002/z.png');
    raise exception 'FAIL: บันทึก path ในโฟลเดอร์คนอื่นได้';
  exception when check_violation then raise notice 'ok - media path ต้องอยู่ในโฟลเดอร์ตัวเอง';
  end;
end $$;

-- ---------- ผู้ใช้ B ----------
select set_config('request.jwt.claim.sub', :B, false);
select pg_temp.check((select count(*) from public.projects) = 0, 'B มองไม่เห็นโปรเจกต์ของ A');
select pg_temp.check((select count(*) from public.media_assets) = 0, 'B มองไม่เห็นสื่อของ A');
select pg_temp.check((select count(*) from storage.objects) = 0, 'B มองไม่เห็นไฟล์ใน Storage ของ A');
select pg_temp.check((select count(*) from public.profiles) = 2, 'profiles อ่านได้ทุกคน');
update public.projects set name = 'แฮ็ก';
delete from public.projects;
delete from storage.objects;
update public.profiles set display_name = 'แฮ็ก' where id = :A;

-- ---------- anon ----------
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.check((select count(*) from public.projects) = 0, 'anon มองไม่เห็นโปรเจกต์');

-- ---------- ตรวจผลจาก superuser ----------
reset role;
select pg_temp.check((select name from public.projects where owner_id = :A) = 'งาน A2', 'B แก้/ลบโปรเจกต์ของ A ไม่ได้');
select pg_temp.check((select count(*) from storage.objects) = 1, 'B ลบไฟล์ของ A ไม่ได้');
select pg_temp.check((select display_name from public.profiles where id = :A) = 'ผู้ใช้ A', 'B แก้ profile ของ A ไม่ได้');

-- ลบผู้ใช้ → ข้อมูลถูกลบตาม (cascade)
delete from auth.users where id = :A;
select pg_temp.check((select count(*) from public.projects) = 0, 'ลบผู้ใช้แล้วโปรเจกต์ถูกลบตาม');
\echo 'RLS: ผ่านทั้งหมด'
