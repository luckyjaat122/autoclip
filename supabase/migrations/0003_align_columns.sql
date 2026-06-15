-- ============================================================================
-- Align pre-existing tables with the AutoClip schema. Your project already had
-- these tables, so `create table if not exists` skipped them — this adds every
-- missing column (idempotent) and reloads the PostgREST schema cache.
-- Run once in the Supabase SQL Editor.
-- ============================================================================

-- profiles -------------------------------------------------------------------
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists subscription_status text not null default 'inactive';
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists generations_used int not null default 0;
alter table public.profiles add column if not exists generations_limit int not null default 0;
alter table public.profiles add column if not exists cycle_start timestamptz not null default now();
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- subscriptions --------------------------------------------------------------
alter table public.subscriptions add column if not exists user_id uuid;
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists amount int;
alter table public.subscriptions add column if not exists razorpay_subscription_id text;
alter table public.subscriptions add column if not exists razorpay_payment_id text;
alter table public.subscriptions add column if not exists start_date timestamptz default now();
alter table public.subscriptions add column if not exists renewal_date timestamptz;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();

-- payments -------------------------------------------------------------------
alter table public.payments add column if not exists user_id uuid;
alter table public.payments add column if not exists amount int;
alter table public.payments add column if not exists currency text default 'INR';
alter table public.payments add column if not exists status text;
alter table public.payments add column if not exists razorpay_order_id text;
alter table public.payments add column if not exists razorpay_payment_id text;
alter table public.payments add column if not exists razorpay_signature text;
alter table public.payments add column if not exists description text;
alter table public.payments add column if not exists created_at timestamptz not null default now();

-- generations ----------------------------------------------------------------
alter table public.generations add column if not exists user_id uuid;
alter table public.generations add column if not exists youtube_url text;
alter table public.generations add column if not exists video_id text;
alter table public.generations add column if not exists title text;
alter table public.generations add column if not exists channel text;
alter table public.generations add column if not exists description text;
alter table public.generations add column if not exists duration_seconds int default 0;
alter table public.generations add column if not exists thumbnail text;
alter table public.generations add column if not exists status text not null default 'queued';
alter table public.generations add column if not exists progress int not null default 0;
alter table public.generations add column if not exists stage_label text;
alter table public.generations add column if not exists error text;
alter table public.generations add column if not exists clip_count int not null default 0;
alter table public.generations add column if not exists caption_style jsonb;
alter table public.generations add column if not exists engine text default 'real';
alter table public.generations add column if not exists logs jsonb default '[]'::jsonb;
alter table public.generations add column if not exists created_at timestamptz not null default now();
alter table public.generations add column if not exists completed_at timestamptz;

-- clips ----------------------------------------------------------------------
alter table public.clips add column if not exists generation_id uuid;
alter table public.clips add column if not exists user_id uuid;
alter table public.clips add column if not exists title text;
alter table public.clips add column if not exists hook_type text;
alter table public.clips add column if not exists viral_score int;
alter table public.clips add column if not exists start_seconds double precision;
alter table public.clips add column if not exists end_seconds double precision;
alter table public.clips add column if not exists duration int;
alter table public.clips add column if not exists reason text;
alter table public.clips add column if not exists transcript text;
alter table public.clips add column if not exists video_url text;
alter table public.clips add column if not exists thumbnail_url text;
alter table public.clips add column if not exists width int default 1080;
alter table public.clips add column if not exists height int default 1920;
alter table public.clips add column if not exists created_at timestamptz not null default now();

-- usage_tracking -------------------------------------------------------------
alter table public.usage_tracking add column if not exists user_id uuid;
alter table public.usage_tracking add column if not exists type text not null default 'generation';
alter table public.usage_tracking add column if not exists generation_id uuid;
alter table public.usage_tracking add column if not exists created_at timestamptz not null default now();

-- Make sure RLS is on (idempotent) ------------------------------------------
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;
alter table public.generations   enable row level security;
alter table public.clips         enable row level security;
alter table public.usage_tracking enable row level security;

-- Reload the PostgREST schema cache so the new columns are visible immediately.
notify pgrst, 'reload schema';
