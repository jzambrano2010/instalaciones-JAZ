-- ElectroPlan AR - Esquema de Base de Datos y Seguridad RLS para Supabase
-- Ejecutá este script completo en: Supabase Dashboard -> SQL Editor -> New Query

-- 1. Tabla de Perfiles y Licencias de Usuarios
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text default '',
  matricula text default '',
  role text not null default 'profesional' check (role in ('profesional', 'administrador')),
  trial_started_at timestamptz not null default now(),
  license_status text not null default 'trial' check (license_status in ('trial', 'active', 'expired')),
  license_code text,
  license_activated_at timestamptz,
  license_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabla de Proyectos Eléctricos por Cliente
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Proyecto Principal',
  params jsonb not null default '{}'::jsonb,
  floors jsonb not null default '[]'::jsonb,
  budget_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabla de Códigos de Licencia Generados por el Administrador
create table if not exists public.license_codes (
  code text primary key,
  duration_days integer not null default 60,
  created_by uuid references auth.users(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Función auxiliar para verificar rol de Administrador sin recursión en RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'administrador' or lower(email) = 'zambrano.julio@gmail.com')
  );
$$;

-- 5. Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.license_codes enable row level security;

-- Políticas para public.profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Políticas para public.projects
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Políticas para public.license_codes
drop policy if exists "Admins manage license codes" on public.license_codes;
create policy "Admins manage license codes"
  on public.license_codes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated users can read active codes" on public.license_codes;
create policy "Authenticated users can read active codes"
  on public.license_codes for select
  using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Authenticated users can redeem unused codes" on public.license_codes;
create policy "Authenticated users can redeem unused codes"
  on public.license_codes for update
  using (auth.role() = 'authenticated' and is_active = true and redeemed_by is null)
  with check (auth.uid() = redeemed_by);

-- 6. Trigger automático al registrar un usuario en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, matricula, role, trial_started_at, license_status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'matricula', ''),
    case
      when lower(coalesce(new.email, '')) = 'zambrano.julio@gmail.com' then 'administrador'
      else 'profesional'
    end,
    now(),
    'trial'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
