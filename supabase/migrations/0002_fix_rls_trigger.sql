-- ============================================================================
-- FIX: `force row level security` made the SECURITY DEFINER signup trigger
-- subject to RLS, which broke auth user creation ("Database error creating new
-- user"). Drop FORCE (ENABLE still protects anon/authenticated; service_role
-- bypasses) and make the trigger crash-proof. Run this once in the SQL Editor.
-- ============================================================================

alter table public.profiles      no force row level security;
alter table public.subscriptions no force row level security;
alter table public.payments      no force row level security;
alter table public.generations   no force row level security;
alter table public.clips         no force row level security;
alter table public.usage_tracking no force row level security;

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
