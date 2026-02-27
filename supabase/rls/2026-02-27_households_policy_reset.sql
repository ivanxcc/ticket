-- Hard fix for households RLS conflicts.
-- Use this if INSERT still fails with 42501 after adding an insert policy.
--
-- This script drops all existing policies on public.households (including
-- restrictive/conflicting ones) and recreates a clean policy set.

alter table public.households enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'households'
  loop
    execute format('drop policy if exists %I on public.households', p.policyname);
  end loop;
end
$$;

-- Anyone signed in can create a household during onboarding.
create policy households_insert_authenticated
  on public.households
  for insert
  to authenticated
  with check (true);

-- Signed-in users can read households during onboarding:
-- - create flow uses `.insert(...).select().single()`
-- - join flow reads by invite_code before a profile exists
create policy households_select_member
  on public.households
  for select
  to authenticated
  using (true);

-- Signed-in users can update/delete only their own household.
create policy households_update_member
  on public.households
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
  );

create policy households_delete_member
  on public.households
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
  );
