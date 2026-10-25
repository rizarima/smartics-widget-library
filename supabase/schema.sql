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
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'partner', 'admin'));
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

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- row level security ----------
alter table public.widgets enable row level security;
alter table public.updates enable row level security;
alter table public.packages enable row level security;
alter table public.news enable row level security;
alter table public.profiles enable row level security;
alter table public.widget_requests enable row level security;
alter table public.downloads enable row level security;

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

drop policy if exists "anyone can request" on public.widget_requests;
create policy "anyone can request" on public.widget_requests for insert with check (true);
drop policy if exists "admin read requests" on public.widget_requests;
create policy "admin read requests" on public.widget_requests for select using (public.is_admin());

drop policy if exists "log own download" on public.downloads;
create policy "log own download" on public.downloads for insert with check (auth.uid() = user_id);
drop policy if exists "admin read downloads" on public.downloads;
create policy "admin read downloads" on public.downloads for select using (public.is_admin());

-- ---------- make yourself admin (change the email, then run this line once) ----------
-- update public.profiles set role = 'admin', status = 'approved' where email = 'email-anda@contoh.com';
