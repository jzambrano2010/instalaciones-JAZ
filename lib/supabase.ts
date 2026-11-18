import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { FloorData, TechnicalParams } from '@/lib/types';

const DEFAULT_SUPABASE_URL = 'https://wtybjvtzzoxgvirqfatr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_UTbLCosfTsOJXbTrx8Jnzw_l55OYj5Y';

function resolveSupabaseUrl(...candidates: Array<string | undefined>): string {
  for (const raw of candidates) {
    const val = (raw || '').trim();
    if (/^https?:\/\/[a-z0-9.-]+/i.test(val)) {
      return val;
    }
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseKey(...candidates: Array<string | undefined>): string {
  for (const raw of candidates) {
    const val = (raw || '').trim();
    if (val && !val.startsWith('YOUR_') && !val.startsWith('MY_')) {
      return val;
    }
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

export const SUPABASE_URL = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_ANON_KEY = resolveSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const OWNER_ADMIN_EMAIL = 'zambrano.julio@gmail.com';
export const TRIAL_DURATION_DAYS = 15;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function createSupabaseServerClient(accessToken?: string): SupabaseClient {
  const serverUrl = resolveSupabaseUrl(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL
  );
  const serverKey = resolveSupabaseKey(
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY
  );
  return createClient(serverUrl, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export interface UserLicenseProfile {
  id: string;
  email: string;
  full_name: string;
  matricula: string;
  role: 'profesional' | 'administrador';
  trial_started_at: string;
  license_status: 'trial' | 'active' | 'expired';
  license_code?: string | null;
  license_activated_at?: string | null;
  license_expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CloudProjectRecord {
  id: string;
  user_id: string;
  name: string;
  params: TechnicalParams;
  floors: FloorData[];
  budget_overrides?: Record<string, unknown>;
  created_at?: string;
  updated_at: string;
}

export interface ComputedLicenseSummary {
  licenseActive: boolean;
  licenseDaysLeft: number;
  trialDaysLeft: number;
  isExpired: boolean;
  trialStartDate: string;
  licenseExpiresAt: string | null;
  licenseCode: string | null;
  role: 'profesional' | 'administrador';
}

export function isSchemaMissingError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

export function computeLicenseSummary(
  profile: Partial<UserLicenseProfile> | null,
  user?: User | null
): ComputedLicenseSummary {
  const now = Date.now();
  const meta = (user?.user_metadata || {}) as Record<string, any>;
  const email = (profile?.email || user?.email || '').toLowerCase();
  const role: 'profesional' | 'administrador' =
    profile?.role === 'administrador' ||
    meta.role === 'administrador' ||
    email === OWNER_ADMIN_EMAIL
      ? 'administrador'
      : 'profesional';

  const trialStartIso =
    profile?.trial_started_at ||
    meta.trial_started_at ||
    user?.created_at ||
    new Date().toISOString();
  const trialStartMs = new Date(trialStartIso).getTime();
  const daysSinceTrialStart = Number.isFinite(trialStartMs)
    ? Math.max(0, Math.floor((now - trialStartMs) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialDaysLeft = Math.max(0, TRIAL_DURATION_DAYS - daysSinceTrialStart);

  const licenseCode = profile?.license_code || meta.license_code || null;
  const licenseExpiresAt = profile?.license_expires_at || meta.license_expires_at || null;
  const status = profile?.license_status || meta.license_status || 'trial';

  let licenseActive = false;
  let licenseDaysLeft = 0;

  if (status === 'active' || (licenseCode && String(licenseCode).startsWith('LIC-PRO-'))) {
    if (licenseExpiresAt) {
      const expMs = new Date(licenseExpiresAt).getTime();
      if (Number.isFinite(expMs) && expMs > now) {
        licenseActive = true;
        licenseDaysLeft = Math.max(1, Math.ceil((expMs - now) / (1000 * 60 * 60 * 24)));
      }
    } else if (status === 'active') {
      licenseActive = true;
      licenseDaysLeft = 60;
    }
  }

  const isExpired = role !== 'administrador' && !licenseActive && trialDaysLeft <= 0;

  return {
    licenseActive,
    licenseDaysLeft,
    trialDaysLeft,
    isExpired,
    trialStartDate: trialStartIso,
    licenseExpiresAt,
    licenseCode,
    role,
  };
}

export const SUPABASE_SETUP_SQL = `-- Copiá y ejecutá este script en Supabase Dashboard -> SQL Editor -> New Query

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

create table if not exists public.license_codes (
  code text primary key,
  duration_days integer not null default 60,
  created_by uuid references auth.users(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'administrador' or lower(email) = 'zambrano.julio@gmail.com')
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.license_codes enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects" on public.projects
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins manage license codes" on public.license_codes;
create policy "Admins manage license codes" on public.license_codes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authenticated users can read active codes" on public.license_codes;
create policy "Authenticated users can read active codes" on public.license_codes
  for select using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Authenticated users can redeem unused codes" on public.license_codes;
create policy "Authenticated users can redeem unused codes" on public.license_codes
  for update using (auth.role() = 'authenticated' and is_active = true and redeemed_by is null)
  with check (auth.uid() = redeemed_by);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, matricula, role, trial_started_at, license_status)
  values (
    new.id, coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'matricula', ''),
    case when lower(coalesce(new.email, '')) = 'zambrano.julio@gmail.com' then 'administrador' else 'profesional' end,
    now(), 'trial'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();`;
