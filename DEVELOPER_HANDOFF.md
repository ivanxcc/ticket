# Developer Handoff (Ticket App)

Last updated: February 28, 2026

## Project Snapshot
- App: React Native + Expo SDK 54 household ticket app
- Backend: Supabase Auth + Postgres + RLS + Realtime
- Current branch: `main`
- Recent work focus:
  - Fixed real-time updates (AppState foreground reconnect + pull-to-refresh)
  - Swipe UX cleanup (removed swipe-to-advance, kept swipe-to-delete)
  - Assignee name + emoji displayed on ticket cards
  - Push notification infrastructure (entitlements, UIBackgroundModes, Supabase Edge Function)

## Latest Commits (newest first)
- `70db982` Switch push to Supabase Edge Function + direct APNs (no EAS required)
- `9ab0603` Fix push notifications: entitlements, UIBackgroundModes, and diagnostics
- `ea5a60a` Add background push notifications via expo-notifications
- `37784ed` Fix real-time updates, swipe UX, and assignee display
- `7dbc628` Add developer handoff document for next session
- `09499b5` Fix ticket sync UUID errors and settings stat routing

## Important SQL Migrations
Run these in Supabase SQL Editor if not already applied (in order).

1. `supabase/rls/2026-02-27_households_insert_policy_fix.sql`
2. `supabase/rls/2026-02-27_households_policy_reset.sql`
3. `supabase/rls/2026-02-27_households_select_onboarding_fix.sql`
4. `supabase/rls/2026-02-27_notifications_system.sql`
5. `supabase/rls/2026-02-27_notifications_uuid_safety_fix.sql`
6. `supabase/rls/2026-02-27_add_push_token.sql` — adds `push_token text` column to `profiles`

## Key Functional Areas

### Auth and onboarding
- Signup branches: immediate session → setup, no session (email confirm) → verify-email screen
- Setup flow checks active session before create/join household
- Root layout gates app: unauthenticated → sign-in, no household → setup, ready → tabs

### Household RLS
- Policies allow onboarding create/join paths
- UUID safety: normalizes UUID fields before all inserts to prevent `invalid input syntax for type uuid`

### In-app notifications
- `public.notifications` table + RLS + Postgres trigger on `tickets`
- Trigger fires on: `ticket_assigned`, `ticket_reassigned`, `ticket_status_changed`
- Notifications screen: `app/notifications.tsx` — bell icon + unread badge in header
- Store fetches, persists, and subscribes to notifications via Realtime

### Real-time sync
- Supabase channel per household, filters INSERT/UPDATE/DELETE
- AppState listener: when app returns to foreground, tears down and reinitialises the Realtime channel
- Pull-to-refresh on ticket list calls `initFromSupabase` directly

### Ticket card UX
- Swipe left → delete (with confirmation via alert)
- Swipe right → removed (was "advance status", conflicted with delete)
- Footer shows assignee emoji + name side by side

### Push notifications (infrastructure ready, requires paid Apple Developer account)
- Architecture: `getDevicePushTokenAsync()` → raw APNs hex token stored in `profiles.push_token`
- Delivery: app calls Supabase Edge Function `send-push`, which signs an APNs JWT (ES256) and POSTs directly to `api.sandbox.push.apple.com`
- Edge Function: `supabase/functions/send-push/index.ts` — handles JWT signing, DER→P1363 conversion, auth verification
- iOS entitlements: `aps-environment = development` added to `Ticket.entitlements`
- `UIBackgroundModes = [remote-notification]` added to `Info.plist`
- `expo-notifications` plugin with `mode: development` in `app.json`

**To activate push notifications:**
1. Pay for Apple Developer Program ($99/year) and get APNs p8 key
2. Set Supabase secrets: `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_SANDBOX`
3. Deploy Edge Function: `npx supabase functions deploy send-push --project-ref <ref>`
4. Rebuild app in Xcode (pod install already done)
5. Change `APNS_SANDBOX=false` when building for production

## iOS Build Notes
- `ios/` folder exists (generated via `expo prebuild`)
- Bundle ID: `com.ivanxcc.ticket`
- Xcode workspace: `ios/Ticket.xcworkspace`
- Free Apple ID limitation: provisioning expires ~every 7 days, requires rebuild
- For standalone (no Metro): build with `Release` configuration in Xcode
- `expo-notifications` uses autolinking via `use_expo_modules!` — runs automatically on `pod install`

## EAS / Expo
- EAS project ID: `eea0e5ee-f026-41cb-b676-b1b6b5105082` (in `app.json` extra.eas.projectId)
- `eas.json` exists with `development` and `production` build profiles
- EAS Build is not currently used — app is built locally via Xcode

## Environment Variables (.env)
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Files Most Relevant Next Session
- `store/index.ts` — all state, Supabase sync, push trigger logic
- `app/_layout.tsx` — auth gate, AppState reconnect, push registration
- `lib/pushNotifications.ts` — token registration + Edge Function call
- `supabase/functions/send-push/index.ts` — APNs Edge Function
- `app/(tabs)/index.tsx` — ticket list, filters, pull-to-refresh
- `components/TicketCard.tsx` — swipe UX, assignee display
- `app/notifications.tsx` — in-app notification screen
- `supabase/rls/*.sql` — all DB schema/policy migrations

## Known Issues / Caveats
- Push notifications non-functional until paid Apple Developer account + secrets configured
- Full auth user deletion not implemented (only app data/profile cleanup)
- Local type-check may report missing `@expo/vector-icons` types — pre-existing, not introduced by recent changes

## Suggested Next Improvements
- Add migration tracking strategy (Supabase CLI or explicit ledger in repo)
- Add tests around store sync edge cases (pending queue + reload)
- Add server-side path to truly delete `auth.users` accounts
- Ticket editing (currently tickets cannot be edited after creation)
- Due dates / reminders
