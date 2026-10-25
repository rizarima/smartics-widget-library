-- SmartICS Widget Library: run this once in Supabase > SQL Editor.

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

create table if not exists public.news (
  id bigint generated always as identity primary key,
  date date not null default current_date,
  title text not null,
  body text
);

-- one row per account; role is 'partner' for self sign-up, change it to 'member' or 'admin' by hand
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  company text,
  phone text,
  role text not null default 'partner' check (role in ('member', 'partner', 'admin')),
  created_at timestamptz not null default now()
);

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

-- create the profile automatically when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, company, phone, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company', new.raw_user_meta_data->>'phone', 'partner');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- row level security
alter table public.widgets enable row level security;
alter table public.updates enable row level security;
alter table public.packages enable row level security;
alter table public.news enable row level security;
alter table public.profiles enable row level security;
alter table public.widget_requests enable row level security;
alter table public.downloads enable row level security;

drop policy if exists "public read widgets" on public.widgets;
create policy "public read widgets" on public.widgets for select using (true);
drop policy if exists "public read updates" on public.updates;
create policy "public read updates" on public.updates for select using (true);
drop policy if exists "public read packages" on public.packages;
create policy "public read packages" on public.packages for select using (true);
drop policy if exists "public read news" on public.news;
create policy "public read news" on public.news for select using (true);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "anyone can request" on public.widget_requests;
create policy "anyone can request" on public.widget_requests for insert with check (true);

drop policy if exists "log own download" on public.downloads;
create policy "log own download" on public.downloads for insert with check (auth.uid() = user_id);
