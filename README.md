# Ticket

A household task and maintenance ticketing app for React Native, built with Expo and TypeScript. Track repairs, chores, and to-dos across your household members.

## Features

- Create tickets with title, description, category, priority, and assignee
- Track status through a stepper: Submitted → In Progress → Pending → Complete
- Filter tickets by status or by household member
- 9 built-in categories (IT & Tech, Plumbing, Electrical, Cleaning, etc.)
- Household member management with custom names and emojis
- Light / dark / system theme support
- Persisted state via AsyncStorage

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo Go](https://expo.dev/go) on your phone (SDK 54)

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Run on a specific platform

```bash
npm run android   # Android emulator
npm run ios       # iOS simulator (macOS only)
npm run web       # Web browser
```

## Project Structure

```
app/
  _layout.tsx           # Root layout
  (tabs)/
    _layout.tsx         # Tab bar layout
    index.tsx           # Tickets list screen
    settings.tsx        # Settings & household members
  create.tsx            # New ticket form
  ticket/[id].tsx       # Ticket detail view
components/
  TicketCard.tsx        # Ticket list item
  StatusBadge.tsx       # Status indicator chip
  EmptyState.tsx        # Empty list placeholder
store/
  index.ts              # Zustand store (persisted)
constants/
  categories.ts         # Category definitions
  theme.ts              # Theme tokens
utils/
  format.ts             # Date and ticket number formatting
hooks/
  useTheme.ts           # Theme hook
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run in browser |
| `npm test` | Run tests |
| `npm run lint` | Lint the code |
| `npm run type-check` | TypeScript type check |

## Tech Stack

- [React Native](https://reactnative.dev/) 0.81
- [Expo](https://expo.dev/) SDK 54
- [Expo Router](https://expo.github.io/router/) (file-based routing)
- [Zustand](https://zustand-demo.pmnd.rs/) (state management)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) (persistence)
- [TypeScript](https://www.typescriptlang.org/)
