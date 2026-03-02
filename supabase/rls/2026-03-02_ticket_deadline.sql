-- Phase 2: Add optional deadline column to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS deadline timestamptz;
