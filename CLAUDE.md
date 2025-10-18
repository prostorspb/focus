# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Focus ADHD Companion" - a minimalist, gesture-based mobile web app for capturing thoughts (text, voice, photo) with minimal distraction. Built as a Progressive Web App (PWA) using React, TypeScript, and Vite.

The app uses an innovative interaction model: users drag vertically on the central interaction zone to switch between text, audio recording, and photo capture modes. This gesture-based approach reduces cognitive load for ADHD users.

## Development Commands

### Setup
```bash
npm install
```

Set `GEMINI_API_KEY` in `.env.local` (though currently the API key is configured in vite.config.ts but not actively used in the codebase).

### Running the App
```bash
npm run dev
```
Runs on `http://localhost:3000` (configured in vite.config.ts with host `0.0.0.0` for network access).

### Building
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Architecture

### Core Interaction Model

The app centers around **InteractionZone** ([components/InteractionZone.tsx](components/InteractionZone.tsx)), which implements a drag-based mode switcher:

- **Drag down** (past threshold 1): Enter audio ready mode
- **Drag down further** (past threshold 2): Start audio recording immediately
- **Drag up** (past threshold 1): Enter camera ready mode
- **Drag up further** (past threshold 2): Capture photo immediately
- **No drag**: Text entry mode (default)

Thresholds are adaptive based on viewport height:
- Threshold 1: 15% of viewport height
- Threshold 2: 30% of viewport height
- Warning zone starts at 80% of the way to threshold 2

Haptic feedback and audio clicks provide sensory confirmation at each threshold crossing.

### State Management

The app uses React's built-in state management (useState, useCallback) without external state libraries. State flows:

1. **App.tsx**: Root component managing notes array and sidebar visibility
2. **InteractionZone**: Manages interaction modes, drag state, and media permissions
3. **NoteList**: Renders saved notes with delete functionality

### Data Persistence

Uses **Dexie.js** (IndexedDB wrapper) for client-side storage:

- Database name: `focusAppDatabase`
- Single table: `notes` with schema `'id, type, content, timestamp'`
- Defined in [storage.ts](storage.ts) as `MySubClassedDexie` class

Notes are stored with:
- `id`: ISO timestamp + random number
- `type`: 'text' | 'audio' | 'image'
- `content`: Text string or data URL for binary data
- `timestamp`: Date object

### Media Handling

**Audio Recording** ([InteractionZone.tsx](components/InteractionZone.tsx)):
- Preferred format: `audio/webm;codecs=opus`
- Fallback: `audio/mp4;codecs=aac` (for Safari)
- Stored as data URLs in IndexedDB
- Converted to Blob URLs for playback in NoteList

**Photo Capture**:
- Uses `getUserMedia` with `facingMode: 'environment'` (rear camera)
- Canvas-based capture to JPEG data URL
- Stored directly in IndexedDB

**Wake Lock**: Prevents screen sleep during recording/camera usage (WakeLock API).

### PWA Features & Installation

**Onboarding Experience** ([components/OnboardingScreen.tsx](components/OnboardingScreen.tsx)):
- First-launch onboarding flow (shown once, tracked via localStorage)
- Welcome screen introducing the app
- Permission request screen that requests both camera and microphone access upfront
- Tutorial screen explaining gesture controls
- Critical for Android: Permissions are requested during onboarding so they persist for the installed PWA

**Service Worker** ([sw.js](sw.js)):
- Cache-first strategy for offline support
- Cache name: `focus-app-cache-v2`
- Runtime caching for additional resources
- Skips caching media device requests

**Manifest** ([manifest.webmanifest](manifest.webmanifest)):
- Fully configured for Android installation
- Display mode: `standalone` (fullscreen, no browser UI)
- Orientation: `portrait` (optimal for mobile use)
- Theme colors: Dark (#111827) for consistent UI
- Icons: SVG icon (scalable for all sizes)

**Installation on Android**:
See [INSTALLATION.md](INSTALLATION.md) for detailed installation instructions. Key points:
- PWA installs as a native-like app from Chrome
- After installation, permissions persist (no repeated prompts)
- Runs fullscreen without browser chrome
- Available offline after first load

### UI/UX Design

**Styling**:
- Tailwind CSS loaded via CDN (see index.html)
- Dark theme (gray-900 background) for focus and reduced eye strain
- Gesture-based interactions with visual feedback

**Sidebar**:
- Swipeable from left edge to view saved notes
- Swipe-to-close gesture (must drag 1/3 of width to close)
- Touch action set to `pan-y` to prevent browser back navigation while allowing vertical scroll
- Backdrop overlay when visible

**Animations**:
- Transform-based dragging with CSS transitions
- Transitions disabled during drag for immediate feedback
- Pulse animations for mode indicators

### TypeScript Configuration

Path alias `@/*` maps to root directory (configured in both tsconfig.json and vite.config.ts).

Experimental decorators enabled for Dexie.js compatibility.

### Component Structure

```
App.tsx (root)
├── OnboardingScreen (first-launch only, conditionally rendered)
│   ├── Welcome screen
│   ├── Permissions request screen
│   └── Tutorial screen
├── InteractionZone (gesture-based mode switcher)
│   ├── Text mode (default)
│   ├── Audio modes (ready/recording)
│   └── Camera modes (ready/capturing)
├── NoteList (sidebar)
│   └── NoteItem (individual note renderer)
└── icons.tsx (SVG icon components)
```

## Important Implementation Details

### Drag State Management

The InteractionZone uses a `feedbackState` ref to track threshold crossings during a single drag gesture, preventing repeated haptic/audio feedback. This ref is reset at the start of each drag.

### Media Stream Cleanup

Always stop media streams when:
- Switching modes
- Closing camera/audio interfaces
- Component unmounts

The `stopAllMediaStreams` function centralizes this cleanup logic.

### Pointer Events

Uses Pointer Events API (not Touch Events) for better cross-device compatibility. Pointer capture ensures drag continues even if pointer leaves the interaction zone.

### Data URL Conversion

Audio playback requires converting data URLs to Blob URLs (see `dataURLtoBlobUrl` in NoteList.tsx) because some browsers have issues with large data URLs in audio elements.

### Dexie Type Casting

The storage.ts file uses `(this as Dexie)` type casting to work around TypeScript inference issues with Dexie subclassing.

### Permission Handling

**Critical Pattern**: Permissions must be requested in response to user action (browser security requirement).

The onboarding flow ([OnboardingScreen.tsx](components/OnboardingScreen.tsx)):
1. User clicks "Разрешить доступ" button
2. Sequentially requests camera then microphone access
3. Immediately releases streams (only testing permissions)
4. Once granted, permissions persist for installed PWA
5. localStorage flag `onboarding_completed` prevents re-showing onboarding

**Why this works for Android PWA**:
- Installed PWA maintains permissions across sessions
- No need to re-request on each app launch
- Works like a native app with persistent permissions
- Onboarding only shows once per installation

## Known Limitations

- GEMINI_API_KEY is configured but not currently used in the app logic
- No TypeScript linting configured (no ESLint in package.json)
- No test suite configured
- Icon is basic SVG (could be improved with custom design)
