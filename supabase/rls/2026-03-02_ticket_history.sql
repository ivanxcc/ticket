-- Phase 2: Ticket status change history table
-- Client writes on each status change; no server trigger needed.

CREATE TABLE IF NOT EXISTS public.ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_history_ticket_idx
  ON public.ticket_history (ticket_id, changed_at DESC);

ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Members can view history for tickets in their household
DROP POLICY IF EXISTS ticket_history_select_own ON public.ticket_history;
CREATE POLICY ticket_history_select_own
  ON public.ticket_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tickets t
      JOIN public.profiles p ON p.household_id = t.household_id
      WHERE t.id = ticket_history.ticket_id
        AND p.id = auth.uid()
    )
  );

-- Members can insert history entries for tickets in their household
DROP POLICY IF EXISTS ticket_history_insert_own ON public.ticket_history;
CREATE POLICY ticket_history_insert_own
  ON public.ticket_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tickets t
      JOIN public.profiles p ON p.household_id = t.household_id
      WHERE t.id = ticket_history.ticket_id
        AND p.id = auth.uid()
    )
  );
