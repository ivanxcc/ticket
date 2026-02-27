-- Targeted fix: onboarding users need SELECT access to households before they
-- have a profile row.
--
-- Without this, both flows can fail:
-- 1) create flow: insert(...).select().single()
-- 2) join flow: select by invite_code before upserting profile

alter table public.households enable row level security;

drop policy if exists households_select_member on public.households;

create policy households_select_member
  on public.households
  for select
  to authenticated
  using (true);
