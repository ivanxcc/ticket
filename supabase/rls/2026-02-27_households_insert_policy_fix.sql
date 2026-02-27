-- Fix signup/setup failure:
-- ERROR 42501: new row violates row-level security policy for table "households"
--
-- Run this in Supabase SQL Editor for your project.
-- It safely adds a permissive INSERT policy for authenticated users.

alter table public.households enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'households'
      and policyname = 'households_insert_authenticated'
  ) then
    create policy households_insert_authenticated
      on public.households
      for insert
      to authenticated
      with check (true);
  end if;
end
$$;
