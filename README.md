# Ticket

A household task and maintenance ticketing app built with React Native and Expo. Track repairs, chores, and to-dos across your household — with real-time sync between members.


## Features

- Create tickets with title, description, category, priority, and assignee
- Track status through a stepper: Submitted → In Progress → Pending → Complete
- Filter tickets by status (Open, Submitted, In Progress, Pending, Complete)
- Swipe left on a ticket to delete it
- 9 built-in categories (IT & Tech, Plumbing, Electrical, Cleaning, etc.)
- Real-time sync — partner's changes appear instantly via Supabase Realtime
- In-app notifications for ticket assignments and status changes
- Household invite code — share with your partner to join the same household
- Pull-to-refresh + auto-reconnect when returning from background
- Offline queue — mutations are retried automatically when connection resumes
- Light / dark / system theme support

## Tech Stack

- [React Native](https://reactnative.dev/) 0.81 + [Expo](https://expo.dev/) SDK 54
- [Expo Router](https://expo.github.io/router/) (file-based routing)
- [Supabase](https://supabase.com/) — Auth, Postgres, RLS, Realtime
- [Zustand](https://zustand-demo.pmnd.rs/) + AsyncStorage (state + persistence)
- [expo-notifications](https://docs.expo.dev/push-notifications/overview/) (push infrastructure)
- TypeScript

## Getting Started

### Prerequisites

- Node.js (LTS)
- Xcode (macOS, for iOS builds)
- A [Supabase](https://supabase.com/) project with the schema applied (see `supabase/rls/`)

### Environment variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Install dependencies

```bash
npm install
```

### iOS setup

```bash
cd ios && pod install && cd ..
```

Then open `ios/Ticket.xcworkspace` in Xcode and run on your device or simulator.

### Start the development server

```bash
npm start
```

## Project Structure

```
app/
  _layout.tsx             # Root layout, auth gate, push registration
  (tabs)/
    _layout.tsx           # Tab bar layout
    index.tsx             # Tickets list with filters
    settings.tsx          # Settings, invite code, theme, sign out
  (auth)/
    sign-in.tsx           # Email/password sign in
    sign-up.tsx           # Account creation
    setup.tsx             # Household create/join onboarding
    verify-email.tsx      # Post-signup email confirmation screen
  create.tsx              # New ticket modal
  ticket/[id].tsx         # Ticket detail + status stepper
  notifications.tsx       # In-app notifications list
components/
  TicketCard.tsx          # Swipeable ticket list item
  StatusBadge.tsx         # Status indicator chip
  EmptyState.tsx          # Empty list placeholder
store/
  index.ts                # Zustand store — all state, Supabase sync, offline queue
lib/
  supabase.ts             # Supabase client + DB types
  pushNotifications.ts    # Push token registration + Edge Function delivery
supabase/
  functions/send-push/    # Deno Edge Function — signs APNs JWTs + delivers pushes
  rls/                    # SQL migrations (run in Supabase Dashboard)
constants/
  categories.ts           # Category definitions
  theme.ts                # Theme tokens (colors, status/priority palettes)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in browser |
| `npm run lint` | Lint the code |
| `npm run type-check` | TypeScript type check |

## Push Notifications

Push notification infrastructure is in place but requires a paid Apple Developer account ($99/year) to activate. See `DEVELOPER_HANDOFF.md` for setup steps.
