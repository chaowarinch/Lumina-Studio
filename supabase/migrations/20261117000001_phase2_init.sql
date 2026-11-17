-- LUMINA STUDIO · Phase 2
-- profiles, projects, media_assets + Storage buckets และ Row Level Security
-- รันครั้งเดียวใน Supabase SQL Editor (หรือ `supabase db push`)

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: ข้อมูลสาธารณะของผู้ใช้ (ชื่อ/รูปจาก Google)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  avatar_url text check (char_length(avatar_url) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_all
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ), 100),
    left(new.raw_user_meta_data ->> 'avatar_url', 1000)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects: โปรเจกต์ Mapping Studio (data = ไฟล์โปรเจกต์ JSON v2)
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 200),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 2000000),
  thumbnail_path text check (thumbnail_path is null or thumbnail_path like owner_id::text || '/%'),
  -- เพิ่มขึ้นทุกครั้งที่บันทึก ใช้กันการเขียนทับกันจากหลายแท็บ
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

-- อ่าน/สร้าง/แก้/ลบ ได้เฉพาะโปรเจกต์ของตัวเอง

create policy projects_select_own
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy projects_insert_own
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy projects_update_own
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy projects_delete_own
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.projects_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.owner_id = old.owner_id;
  new.created_at = old.created_at;
  -- นับเป็นเวอร์ชันใหม่เฉพาะเมื่อเนื้อหาหรือชื่อเปลี่ยน
  if new.data is distinct from old.data or new.name is distinct from old.name then
    new.version = old.version + 1;
    new.updated_at = now();
  else
    new.version = old.version;
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

create trigger projects_before_update
  before update on public.projects
  for each row execute function public.projects_before_update();

-- ---------------------------------------------------------------------------
-- media_assets: ไฟล์ภาพ/วิดีโอที่อัปโหลด (ไฟล์จริงอยู่ใน Storage bucket "media")
-- ---------------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  mime_type text not null check (char_length(mime_type) <= 100),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  storage_path text not null unique check (storage_path like owner_id::text || '/%'),
  file_name text check (char_length(file_name) <= 255),
  created_at timestamptz not null default now()
);

create index media_assets_owner_idx on public.media_assets (owner_id, created_at desc);

alter table public.media_assets enable row level security;

-- อ่าน/สร้าง/ลบ ได้เฉพาะของตัวเอง (ไม่มีการแก้ไขหลังอัปโหลด)

create policy media_assets_select_own
  on public.media_assets for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy media_assets_insert_own
  on public.media_assets for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy media_assets_delete_own
  on public.media_assets for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- Storage: bucket แบบ private, path = {user_id}/{ไฟล์}
-- ทุก policy: ผู้ใช้เข้าถึงได้เฉพาะโฟลเดอร์ที่ชื่อตรงกับ user id ของตัวเอง
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', false, 52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('thumbnails', 'thumbnails', false, 1048576,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy lumina_storage_select_own
  on storage.objects for select
  to authenticated
  using (bucket_id in ('media', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy lumina_storage_insert_own
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('media', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy lumina_storage_update_own
  on storage.objects for update
  to authenticated
  using (bucket_id in ('media', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('media', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy lumina_storage_delete_own
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('media', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);
