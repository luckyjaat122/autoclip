-- ============================================================================
-- AutoClip AI — schema + Row Level Security
-- Safe to run multiple times (idempotent). Run in the Supabase SQL Editor or
-- via the apply script. Service role bypasses RLS automatically (backend jobs).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- profiles.id == auth.users.id (one row per authenticated user)
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text,
  email               text,
  plan                text not null default 'free',
  subscription_status text not null default 'inactive',
  role                text not null default 'user',
  generations_used    int  not null default 0,
  generations_limit   int  not null default 0,
  cycle_start         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  plan                     text not null,
  status                   text not null,
  amount                   int  not null,
  razorpay_subscription_id text,
  razorpay_payment_id      text,
  start_date               timestamptz not null default now(),
  renewal_date             timestamptz,
  created_at               timestamptz not null default now()
);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  amount              int  not null,
  currency            text not null default 'INR',
  status              text not null,
  razorpay_order_id   text,
  razorpay_payment_id text,
  razorpay_signature  text,
  description         text,
  created_at          timestamptz not null default now()
);

create table if not exists public.generations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  youtube_url      text not null,
  video_id         text,
  title            text,
  channel          text,
  description      text,
  duration_seconds int default 0,
  thumbnail        text,
  status           text not null default 'queued',
  progress         int  not null default 0,
  stage_label      text,
  error            text,
  clip_count       int  not null default 0,
  caption_style    jsonb,
  engine           text default 'real',
  logs             jsonb default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create table if not exists public.clips (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid references public.generations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text,
  hook_type     text,
  viral_score   int,
  start_seconds double precision,
  end_seconds   double precision,
  duration      int,
  reason        text,
  transcript    text,
  video_url     text,
  thumbnail_url text,
  width         int default 1080,
  height        int default 1920,
  created_at    timestamptz not null default now()
);

create table if not exists public.usage_tracking (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null default 'generation',
  generation_id uuid references public.generations(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_payments_user      on public.payments(user_id);
create index if not exists idx_generations_user   on public.generations(user_id);
create index if not exists idx_clips_user         on public.clips(user_id);
create index if not exists idx_clips_generation   on public.clips(generation_id);
create index if not exists idx_usage_user         on public.usage_tracking(user_id);

-- ----------------------------------------------------------------------------
-- Enable Row Level Security on every table (no public/anon access)
-- ----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;
alter table public.generations   enable row level security;
alter table public.clips         enable row level security;
alter table public.usage_tracking enable row level security;

-- NOTE: do NOT use `force row level security` here — it makes the SECURITY
-- DEFINER signup trigger (which runs as the table owner) subject to RLS and
-- breaks new-user creation. `enable` already blocks anon/authenticated; the
-- service_role bypasses RLS via its bypassrls attribute.

-- ----------------------------------------------------------------------------
-- Policies — only the authenticated owner can touch their own rows.
-- (anon role gets NO policy → fully blocked. service_role bypasses RLS.)
-- ----------------------------------------------------------------------------

-- profiles (keyed by id == auth.uid())
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- subscriptions
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own on public.subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own on public.subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- payments
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- generations
drop policy if exists generations_select_own on public.generations;
create policy generations_select_own on public.generations
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists generations_insert_own on public.generations;
create policy generations_insert_own on public.generations
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists generations_update_own on public.generations;
create policy generations_update_own on public.generations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists generations_delete_own on public.generations;
create policy generations_delete_own on public.generations
  for delete to authenticated using (auth.uid() = user_id);

-- clips
drop policy if exists clips_select_own on public.clips;
create policy clips_select_own on public.clips
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists clips_insert_own on public.clips;
create policy clips_insert_own on public.clips
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists clips_update_own on public.clips;
create policy clips_update_own on public.clips
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists clips_delete_own on public.clips;
create policy clips_delete_own on public.clips
  for delete to authenticated using (auth.uid() = user_id);

-- usage_tracking
drop policy if exists usage_select_own on public.usage_tracking;
create policy usage_select_own on public.usage_tracking
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists usage_insert_own on public.usage_tracking;
create policy usage_insert_own on public.usage_tracking
  for insert to authenticated with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up (incl. Google OAuth)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never let profile creation block auth user signup.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
