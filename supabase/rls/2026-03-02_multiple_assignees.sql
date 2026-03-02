-- Phase 2: Convert assigned_to from single uuid to uuid[]
-- Run in Supabase SQL Editor BEFORE deploying the updated app.

-- 1. Change the column type: wrap existing single-uuid values in an array
ALTER TABLE public.tickets
  ALTER COLUMN assigned_to TYPE uuid[]
  USING CASE
    WHEN assigned_to IS NULL THEN ARRAY[]::uuid[]
    ELSE ARRAY[assigned_to]
  END;

-- 2. Replace the notifications trigger to handle uuid[] for assigned_to
CREATE OR REPLACE FUNCTION public.create_ticket_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify each new assignee (except the creator)
    INSERT INTO public.notifications (user_id, household_id, ticket_id, type, title, body)
    SELECT assignee_id,
           new.household_id,
           new.id,
           'ticket_assigned',
           'New ticket assigned',
           format('#%s %s', new.ticket_number, new.title)
    FROM unnest(COALESCE(new.assigned_to, ARRAY[]::uuid[])) AS assignee_id
    WHERE assignee_id IS NOT NULL
      AND assignee_id <> COALESCE(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Notify newly added assignees (those in new but not in old)
    IF old.assigned_to IS DISTINCT FROM new.assigned_to AND new.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, household_id, ticket_id, type, title, body)
      SELECT assignee_id,
             new.household_id,
             new.id,
             'ticket_reassigned',
             'Ticket assigned to you',
             format('#%s %s', new.ticket_number, new.title)
      FROM unnest(COALESCE(new.assigned_to, ARRAY[]::uuid[])) AS assignee_id
      WHERE assignee_id IS NOT NULL
        AND NOT (assignee_id = ANY(COALESCE(old.assigned_to, ARRAY[]::uuid[])));
    END IF;

    -- Notify all current assignees + creator of a status change
    IF old.status IS DISTINCT FROM new.status THEN
      INSERT INTO public.notifications (user_id, household_id, ticket_id, type, title, body)
      SELECT DISTINCT recipient_id,
             new.household_id,
             new.id,
             'ticket_status_changed',
             'Ticket status updated',
             format('#%s %s is now %s', new.ticket_number, new.title, replace(new.status, '_', ' '))
      FROM unnest(
        COALESCE(new.assigned_to, ARRAY[]::uuid[]) || ARRAY[new.created_by]
      ) AS recipient_id
      WHERE recipient_id IS NOT NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (unchanged, but re-run to pick up function changes)
DROP TRIGGER IF EXISTS trg_ticket_notifications ON public.tickets;
CREATE TRIGGER trg_ticket_notifications
AFTER INSERT OR UPDATE OF status, assigned_to
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.create_ticket_notifications();
