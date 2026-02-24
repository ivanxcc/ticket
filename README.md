# My Phone App

A React Native mobile app built with [Expo](https://expo.dev) and TypeScript.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/go) app on your phone (for development)

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Run on a specific platform

```bash
npm run android   # Android emulator
npm run ios       # iOS simulator (macOS only)
npm run web       # Web browser
```

## Project Structure

```
app/
  _layout.tsx          # Root layout (navigation shell)
  (tabs)/
    _layout.tsx        # Tab bar layout
    index.tsx          # Home screen
    settings.tsx       # Settings screen
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
| `npm run type-check` | Run TypeScript type check |

## Tech Stack

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/) ~52
- [Expo Router](https://expo.github.io/router/) (file-based routing)
- [TypeScript](https://www.typescriptlang.org/)
