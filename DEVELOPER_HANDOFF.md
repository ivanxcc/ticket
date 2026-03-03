# Developer Handoff (Ticket App)

Last updated: March 3, 2026 (Phase 2 + UI polish)

## Project Snapshot
- App: React Native + Expo SDK 54 household ticket app
- Backend: Supabase Auth + Postgres + RLS + Realtime
- Current branch: `main`
- Current version: `1.2.0` (see `constants/version.ts`)
- Recent work focus (Phase 2):
  - Multiple assignees per ticket (`assigned_to uuid[]` in DB)
  - Ticket deadlines with overdue badge on card + detail
  - Status history timeline on ticket detail screen
  - Feedback submission (modal in Settings → `feedback` table in Supabase)
  - `@react-native-community/datetimepicker` installed + pod install done

## Latest Commits (newest first)
- `1f11234` Increase confetti and switch deadline picker to iOS inline calendar
- `6cf66f2` Remove aps-environment entitlement for personal team build
- `600a8b2` Fix multiple_assignees migration: drop trigger+FK before ALTER
- `43eff76` Add Phase 2 features: multiple assignees, deadlines, history, feedback
- `ff49d2e` Add Phase 1 features: edit tickets, confetti, changelog, filter fix
- `0edcdcd` Commit iOS project updates and EAS config
- `ad6fb73` Update README for current state
- `70db982` Switch push to Supabase Edge Function + direct APNs (no EAS required)
- `9ab0603` Fix push notifications: entitlements, UIBackgroundModes, and diagnostics
- `ea5a60a` Add background push notifications via expo-notifications

## Important SQL Migrations
Run these in Supabase SQL Editor if not already applied (in order).

1. `supabase/rls/2026-02-27_households_insert_policy_fix.sql`
2. `supabase/rls/2026-02-27_households_policy_reset.sql`
3. `supabase/rls/2026-02-27_households_select_onboarding_fix.sql`
4. `supabase/rls/2026-02-27_notifications_system.sql`
5. `supabase/rls/2026-02-27_notifications_uuid_safety_fix.sql`
6. `supabase/rls/2026-02-27_add_push_token.sql` — adds `push_token text` column to `profiles`

**Phase 2 migrations (run BEFORE deploying v1.2.0):**

7. `supabase/rls/2026-03-02_multiple_assignees.sql` — changes `tickets.assigned_to` to `uuid[]` + updates notifications trigger
8. `supabase/rls/2026-03-02_ticket_deadline.sql` — adds `tickets.deadline timestamptz`
9. `supabase/rls/2026-03-02_ticket_history.sql` — creates `ticket_history` table with RLS
10. `supabase/rls/2026-03-02_feedback.sql` — creates `feedback` table with RLS

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
- Added "Clear All" action in notifications header (destructive confirm + store delete)
- Store fetches, persists, and subscribes to notifications via Realtime

### Real-time sync
- Supabase channel per household, filters INSERT/UPDATE/DELETE
- AppState listener: when app returns to foreground, tears down and reinitialises the Realtime channel
- Pull-to-refresh on ticket list calls `initFromSupabase` directly

### Ticket card UX
- Swipe left → delete (with confirmation via alert)
- Swipe right → removed (was "advance status", conflicted with delete)
- Footer shows primary assignee emoji + first name + "+N" overflow (e.g., `Ivan +3`)
- Category row shows deadline short date (e.g., `2/4`) when deadline exists
- Overdue badge (red) shown when `deadline < now && status !== 'complete'`

### Edit tickets
- Pencil icon in ticket detail header opens `app/ticket/edit.tsx` as a slide-up modal
- Pre-fills title, description, category, priority, assignee from existing ticket
- `editTicket` store action: optimistic update + Supabase UPDATE; warns on error (no queue needed)
- Pass ticket ID via URL param: `/ticket/edit?id=${ticket.id}`

### Confetti on complete
- `components/Confetti.tsx` — 70 animated particles using react-native-reanimated v4
- Each piece: shoots up (700ms, ease-out), falls down (1800ms, ease-in), drifts X, rotates, fades
- Triggered in `app/ticket/[id].tsx` when status changes to `complete`
- Wrapped in absolute overlay with `pointerEvents="none"`; auto-hides after 3.2s via `onFinish`

### Changelog / versioning
- `constants/version.ts` — `APP_VERSION` + `CHANGELOG` array
- `app/changelog.tsx` — modal listing all versions with their changes
- First-run: `_layout.tsx` checks `AsyncStorage('lastSeenVersion')` on `authState === 'ready'`;
  if different from `APP_VERSION`, pushes `/changelog` after 600ms delay
- `changelog.tsx` sets `lastSeenVersion` in AsyncStorage on mount
- Settings About section: version badge + "What's New" button → `/changelog`

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
- `app/_layout.tsx` — auth gate, AppState reconnect, push registration, changelog first-run
- `lib/pushNotifications.ts` — token registration + Edge Function call
- `supabase/functions/send-push/index.ts` — APNs Edge Function
- `app/(tabs)/index.tsx` — ticket list, filters, pull-to-refresh
- `components/TicketCard.tsx` — swipe UX, assignee display
- `app/ticket/[id].tsx` — ticket detail, status stepper, edit button, confetti
- `app/ticket/edit.tsx` — edit ticket modal
- `components/Confetti.tsx` — confetti animation
- `constants/version.ts` — version + changelog data
- `app/changelog.tsx` — changelog modal
- `app/notifications.tsx` — in-app notification screen
- `supabase/rls/*.sql` — all DB schema/policy migrations

## Known Issues / Caveats
- Push notifications non-functional until paid Apple Developer account + secrets configured
- Full auth user deletion not implemented (only app data/profile cleanup)
- Local type-check may report missing `@expo/vector-icons` types — pre-existing

## Phase 2 — DONE

### Multiple assignees (v1.2.0)
- `tickets.assigned_to` is now `uuid[]`
- `Ticket.assignedTo: string[]` in store; `normalizeUuidArray()` validates on write
- Backward-compat migration in `onRehydrateStorage` converts old single-string to array
- Create/Edit screens: tap to toggle each member; at least one required to submit
- `TicketCard`: shows up to 2 emoji + "+N" badge; red Overdue badge when past deadline
- `ticket/[id].tsx`: lists all assignees in metadata row

### Ticket deadline (v1.2.0)
- `tickets.deadline timestamptz` column
- `Ticket.deadline: string | null` in store
- Create/Edit: iOS inline calendar DateTimePicker (`display="inline"`), default picker on Android
- pod install done — **Xcode rebuild required**
- TicketCard: red Overdue badge when `deadline < now && status !== complete`
- Ticket detail: Deadline metadata row with red overdue pill

### UI polish fixes (post-Phase 2)
- `Mine` filter fixed for multi-assignee model (`assignedTo.includes(currentMemberId)`)
- Light haptics added on list filter chip taps and Mine toggle

### Ticket history (v1.2.0)
- `ticket_history` table with RLS
- `updateTicketStatus` inserts a row on each status change (after successful Supabase update)
- `ticket/[id].tsx`: fetches history on mount, renders a vertical timeline

### Feedback (v1.2.0)
- `feedback` table with RLS (insert-only for users)
- `submitFeedback(message, rating)` store action
- Settings About section: "Send Feedback" button → slide-up Modal with textarea + 1-5 star rating
