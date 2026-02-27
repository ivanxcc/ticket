-- Notifications system for ticket assignment/status updates.
-- Run this in Supabase SQL Editor.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  type text not null check (type in ('ticket_assigned', 'ticket_reassigned', 'ticket_status_changed')),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.create_ticket_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if new.assigned_to is not null and new.assigned_to <> coalesce(new.created_by, '') then
      insert into public.notifications (user_id, household_id, ticket_id, type, title, body)
      values (
        new.assigned_to,
        new.household_id,
        new.id,
        'ticket_assigned',
        'New ticket assigned',
        format('#%s %s', new.ticket_number, new.title)
      );
    end if;
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if old.assigned_to is distinct from new.assigned_to and new.assigned_to is not null then
      insert into public.notifications (user_id, household_id, ticket_id, type, title, body)
      values (
        new.assigned_to,
        new.household_id,
        new.id,
        'ticket_reassigned',
        'Ticket assigned to you',
        format('#%s %s', new.ticket_number, new.title)
      );
    end if;

    if old.status is distinct from new.status then
      insert into public.notifications (user_id, household_id, ticket_id, type, title, body)
      select distinct recipient_id, new.household_id, new.id, 'ticket_status_changed',
        'Ticket status updated',
        format('#%s %s is now %s', new.ticket_number, new.title, replace(new.status, '_', ' '))
      from unnest(array[new.assigned_to, new.created_by]) as recipient_id
      where recipient_id is not null;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ticket_notifications on public.tickets;
create trigger trg_ticket_notifications
after insert or update of status, assigned_to
on public.tickets
for each row
execute function public.create_ticket_notifications();
