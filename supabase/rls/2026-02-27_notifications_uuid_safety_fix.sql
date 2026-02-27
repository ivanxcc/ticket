-- Fix notification trigger failures from blank/non-UUID recipient ids.
-- Run this in Supabase SQL Editor after the notifications_system.sql migration.

create or replace function public.create_ticket_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_uuid uuid;
  created_uuid uuid;
begin
  assigned_uuid := case
    when nullif(trim(new.assigned_to::text), '') is null then null
    when trim(new.assigned_to::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then trim(new.assigned_to::text)::uuid
    else null
  end;

  created_uuid := case
    when nullif(trim(new.created_by::text), '') is null then null
    when trim(new.created_by::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then trim(new.created_by::text)::uuid
    else null
  end;

  if TG_OP = 'INSERT' then
    if assigned_uuid is not null and assigned_uuid <> created_uuid then
      insert into public.notifications (user_id, household_id, ticket_id, type, title, body)
      values (
        assigned_uuid,
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
    if old.assigned_to is distinct from new.assigned_to and assigned_uuid is not null then
      insert into public.notifications (user_id, household_id, ticket_id, type, title, body)
      values (
        assigned_uuid,
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
      from unnest(array[assigned_uuid, created_uuid]) as recipient_id
      where recipient_id is not null;
    end if;

    return new;
  end if;

  return new;
end;
$$;
