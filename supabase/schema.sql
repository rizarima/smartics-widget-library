-- SmartICS Widget Library: run this in Supabase > SQL Editor.
-- Safe to run again after an update (it only adds what is missing).

-- ---------- tables ----------
create table if not exists public.widgets (
  slug text primary key,
  name text not null,
  kind text,
  categories text[] not null default '{}',
  template text,
  description text,
  properties jsonb not null default '[]',
  file_name text,
  svg text not null,
  created_at date not null default current_date
);
alter table public.widgets add column if not exists preview_svg text;
alter table public.widgets add column if not exists hidden boolean not null default false;
alter table public.widgets add column if not exists updated_at timestamptz not null default now();

create table if not exists public.updates (
  id bigint generated always as identity primary key,
  date date not null default current_date,
  title text not null,
  body text
);

create table if not exists public.packages (
  id bigint generated always as identity primary key,
  date date not null default current_date,
  name text not null,
  version text,
  template text,
  count int,
  description text,
  category text
);
alter table public.packages add column if not exists body text;
alter table public.packages add column if not exists widget_slugs text[] not null default '{}';

create table if not exists public.news (
  id bigint generated always as identity primary key,
  date date not null default current_date,
  title text not null,
  body text
);
alter table public.news add column if not exists image_url text;
alter table public.updates add column if not exists image_url text;
alter table public.packages add column if not exists image_url text;
-- uploaded cover images: the file's path in Storage bucket "images" (deleted together with the post)
alter table public.news add column if not exists image_path text;
alter table public.updates add column if not exists image_path text;
alter table public.packages add column if not exists image_path text;

-- who created this post (name kept as text so it survives a deleted account)
alter table public.news add column if not exists created_by uuid references auth.users on delete set null;
alter table public.news add column if not exists created_by_name text;
alter table public.updates add column if not exists created_by uuid references auth.users on delete set null;
alter table public.updates add column if not exists created_by_name text;
alter table public.packages add column if not exists created_by uuid references auth.users on delete set null;
alter table public.packages add column if not exists created_by_name text;

-- who uploaded / last changed a widget (name kept as text so it survives a deleted account)
alter table public.widgets add column if not exists uploaded_by uuid references auth.users on delete set null;
alter table public.widgets add column if not exists uploaded_by_name text;
alter table public.widgets add column if not exists updated_by uuid references auth.users on delete set null;
alter table public.widgets add column if not exists updated_by_name text;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  company text,
  phone text,
  role text not null default 'partner',
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('superadmin', 'admin', 'member', 'partner'));
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

create table if not exists public.widget_requests (
  id bigint generated always as identity primary key,
  widget_slug text,
  name text,
  email text,
  company text,
  created_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id bigint generated always as identity primary key,
  widget_slug text,
  user_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- sign-up: every new account is a partner waiting for approval ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company, phone, role, status)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company', new.raw_user_meta_data->>'phone', 'partner', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- accounts created before this update keep working
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

-- roles: superadmin (owner) > admin (SmartICS engineers) > member (SmartICS sales) > partner (approved sign-ups)
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin'));
$$;
create or replace function public.is_superadmin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin');
$$;

-- profile edits: everyone may change their own name/photo, but role and status follow the role rules
-- (runs as the signed-in user; SQL Editor and the service role have no auth.uid() and are not limited)
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare me text;
begin
  if auth.uid() is null then return new; end if;
  select role into me from public.profiles where id = auth.uid();
  if new.role is distinct from old.role or new.status is distinct from old.status or new.approved_at is distinct from old.approved_at then
    if me = 'superadmin' then
      if old.id = auth.uid() and new.role <> 'superadmin' then raise exception 'Tidak bisa menurunkan peran akun sendiri.'; end if;
    elsif me = 'admin' then
      if old.role in ('admin', 'superadmin') or new.role in ('admin', 'superadmin') then raise exception 'Hanya superadmin yang bisa mengatur akun admin dan superadmin.'; end if;
    else
      raise exception 'Tidak boleh mengubah peran atau status akun.';
    end if;
  end if;
  -- the email column only mirrors the login email
  if new.email is distinct from old.email then
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- ---------- audit trail: who did what to which record (read: admin & superadmin only, nobody can edit or delete) ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users on delete set null,
  actor_name text,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text,
  details jsonb
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

-- the actor's name and role come from their profile, not from the browser
create or replace function public.fill_audit_actor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.actor_id is not null then
    select coalesce(nullif(full_name, ''), email), role into new.actor_name, new.actor_role from public.profiles where id = new.actor_id;
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists fill_audit_actor on public.audit_log;
create trigger fill_audit_actor before insert on public.audit_log for each row execute function public.fill_audit_actor();

-- ---------- row level security ----------
alter table public.widgets enable row level security;
alter table public.updates enable row level security;
alter table public.packages enable row level security;
alter table public.news enable row level security;
alter table public.profiles enable row level security;
alter table public.widget_requests enable row level security;
alter table public.downloads enable row level security;
alter table public.audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['widgets', 'updates', 'packages', 'news'] loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$I', t);
    execute format('create policy "admin write %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "write own audit" on public.audit_log;
create policy "write own audit" on public.audit_log for insert with check (actor_id = auth.uid());
drop policy if exists "admin read audit" on public.audit_log;
create policy "admin read audit" on public.audit_log for select using (public.is_admin());

drop policy if exists "anyone can request" on public.widget_requests;
create policy "anyone can request" on public.widget_requests for insert with check (true);
drop policy if exists "admin read requests" on public.widget_requests;
create policy "admin read requests" on public.widget_requests for select using (public.is_admin());

drop policy if exists "log own download" on public.downloads;
create policy "log own download" on public.downloads for insert with check (auth.uid() = user_id);
drop policy if exists "admin read downloads" on public.downloads;
create policy "admin read downloads" on public.downloads for select using (public.is_admin());

-- ---------- storage: bucket "images" (max 5 MB; png, jpg, svg, webp, gif, avif) ----------
-- folders: berita/, package/, update/ (admin only) and avatar/<user id>/ (each user their own photo, no svg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "images read" on storage.objects;
create policy "images read" on storage.objects for select using (bucket_id = 'images');
drop policy if exists "images admin insert" on storage.objects;
create policy "images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] in ('berita', 'package', 'update') and public.is_admin());
drop policy if exists "images admin delete" on storage.objects;
create policy "images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] in ('berita', 'package', 'update') and public.is_admin());
drop policy if exists "avatar own insert" on storage.objects;
create policy "avatar own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = 'avatar' and (storage.foldername(name))[2] = auth.uid()::text and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'));
drop policy if exists "avatar own delete" on storage.objects;
create policy "avatar own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = 'avatar' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_admin()));

-- ---------- superadmin (change the email to your login email, then run this line once) ----------
-- update public.profiles set role = 'superadmin', status = 'approved' where email = 'email-anda@contoh.com';
