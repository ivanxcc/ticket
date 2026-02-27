# Developer Handoff (Ticket App)

Last updated: February 27, 2026

## Project Snapshot
- App: React Native + Expo SDK 54 household ticket app
- Backend: Supabase Auth + Postgres + RLS + Realtime
- Current branch: `main`
- Recent work focus:
  - Onboarding/auth stability
  - Household RLS fixes
  - In-app notifications (assignment + status changes)
  - Settings shortcuts to filtered ticket list
  - Ticket sync robustness with offline queue

## Latest Commits (newest first)
- `a6b9f3e` Fix ticket sync UUID errors and settings stat routing
- `8ded782` Add settings stat shortcuts to ticket filters
- `077c386` Add realtime ticket notifications with Supabase triggers and UI
- `9383613` Fix onboarding auth/session flow and household RLS setup

## Important SQL Migrations
Run these in Supabase SQL Editor if not already applied.

1. `supabase/rls/2026-02-27_households_insert_policy_fix.sql`
2. `supabase/rls/2026-02-27_households_policy_reset.sql`
3. `supabase/rls/2026-02-27_households_select_onboarding_fix.sql`
4. `supabase/rls/2026-02-27_notifications_system.sql`
5. `supabase/rls/2026-02-27_notifications_uuid_safety_fix.sql`

Notes:
- The UUID safety fix is important to prevent:
  - `invalid input syntax for type uuid: ""`

## Key Functional Changes

### 1) Auth and onboarding
- Signup now branches based on session presence:
  - Immediate session -> setup flow
  - No session (email confirmation required) -> verify-email screen
- Added `app/(auth)/verify-email.tsx`
- Setup flow checks active session before create/join household actions
- Added "Start Over" button on setup screen (sign out and reset flow)
- Root layout now redirects `ready` auth state to `/(tabs)`

### 2) Household RLS fixes
- Added/updated policies to allow onboarding household create/join paths
- Fixed select-policy issue that blocked onboarding when profile row did not yet exist

### 3) Notifications system
- Added `public.notifications` table + indexes + RLS policies
- Added trigger function on `tickets` for:
  - `ticket_assigned`
  - `ticket_reassigned`
  - `ticket_status_changed`
- Added in-app notifications screen: `app/notifications.tsx`
- Added bell + unread badge in tickets header
- Store now fetches, persists, and realtime-subscribes to notifications

### 4) Ticket sync robustness
- Normalizes UUID fields before ticket insert/flush to avoid invalid UUID writes
- Create screen now blocks submit when assignee/current user is missing
- `initFromSupabase` merges server tickets with pending local insert ops so queued tickets do not disappear after reload

### 5) Settings shortcuts
- Settings `Open` and `Done` counters now deep-link to ticket list filters:
  - `/?filter=open`
  - `/?filter=complete`

## Known Issues / Caveats
- Local type-check in this environment reports missing `@expo/vector-icons` types/module.
  - This is pre-existing in this environment and not introduced by recent changes.
- Full Auth user deletion is not implemented client-side (only app data/profile cleanup in current flow).

## Files Most Relevant Next Session
- `store/index.ts`
- `app/_layout.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(auth)/setup.tsx`
- `app/(auth)/verify-email.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/settings.tsx`
- `app/notifications.tsx`
- `supabase/rls/*.sql`

## Quick Validation Checklist
1. Sign up with email confirmation required:
   - Confirm app routes to verify-email screen (not setup directly).
2. After verification + sign-in:
   - Complete setup and reach tabs.
3. Create ticket assigned to self/other:
   - No UUID console error.
   - Ticket remains after reload.
4. Open settings and tap:
   - `Open` -> tickets screen filtered to open.
   - `Done` -> tickets screen filtered to complete.
5. Notifications:
   - Assignment/status changes create notification rows.
   - Bell badge updates in realtime.
   - Notifications screen can mark read/all read.

## Suggested Next Improvements
- Add server-side/admin path to truly delete `auth.users` accounts.
- Add push notifications (Expo Notifications) for background delivery.
- Add migration tracking strategy (Supabase CLI or explicit migration ledger in repo).
- Add tests around store sync edge cases (pending queue + reload).
