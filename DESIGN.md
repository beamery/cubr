# DESIGN.md - Kinetic Design Specification

## 1. Visual Identity
- **Primary Theme:** High-contrast dark mode.
- **Surface:** `#0A0A0C` (Kinetic Surface).
- **Accents:**
  - **Primary:** `#00A2FF` (Vibrant Blue).
  - **Success:** `#00FF9D` (Electric Green).
  - **Error/Holding:** `#EF4444` (Pulse Red).
- **Glassmorphism:** `rgba(255, 255, 255, 0.03)` with `24px` backdrop blur.

## 2. Interactive States

### Timer Display
- **Idle:** Full white opacity.
- **Holding:** Pulse Red (#EF4444) + `scale(0.96)`.
- **Ready:** Electric Green (#00FF9D) + `scale(1.04)`.
- **Running (Ghost Timer):** **5% opacity** + `scale(1.1)`. 
  - **Rationale:** Desktop users benefit from seeing the digits for confirmation, but high contrast creates visual "jitter" that distracts from the solve. 5% provides a "peripheral" confirmation of motion.
- **Stop Animation:** Instant snap to `100%` opacity + `scale(1.2)` (Bump Effect) -> Overshoot back to `scale(1.0)`.

### Manual Input (Typing Mode)
- **Placeholder:** **10% opacity** ("Type time...").
- **Focus State:** 
  - **Underline:** `6px` thick, `var(--kinetic-primary)` color, `16px` offset.
  - **Motion Control:** `caret-color: transparent`. 
  - **Rationale:** Standard blinking cursors create rhythmic motion that distracts cubers during inspection or solve setup. The static primary-colored underline provides unambiguous focus feedback without motion.
  - **Scale:** Subtle `1.02` scale-up on focus.

## 3. Layout & HUD
- **System Pill:** Fixed top-center. Houses Event Selector, Mode Toggles, and Sync Status.
- **Vertical Flow:**
  1. System Pill
  2. Scramble Card (Hold to refresh)
  3. Timer Area (Ghost Timer)
  4. Penalty HUD (Appears post-solve)
  5. Mobile HUD (Session Stats)
- **Centering:** Use layout springs (`margin: auto`) rather than flex-centering for the main stack to prevent UI jitter when scramble lengths change.

## 4. Mobile Assets (PWA)
- **Icons:** Use high-resolution `.jpg` assets (from `unnamed.jpg`).
- **iOS Meta:** 
  - `apple-touch-icon`: Mandatory for premium homescreen presence.
  - `apple-mobile-web-app-status-bar-style`: `black-translucent` or `default` (dark).
  - `display: standalone`: Ensures the app feels native without browser chrome.

## 5. Data Persistence & Sync
- **Local-First:** All solves are saved to `localStorage` immediately upon completion.
- **Background Sync:** The app attempts to push new solves to Supabase in the background.
- **Sync Status Badge:**
  - **Location:** Attached to the Cloud icon in the System Pill.
  - **Visual:** A small red circle with a white count (e.g., `3`) indicating solves that exist locally but have not yet reached the cloud.
- **Protective Logout:** The `signOut` flow is non-destructive. If unsynced data is detected, a mandatory `window.confirm` modal is triggered to prevent accidental data loss.
- **Union Merge Logic:** The sync engine performs a union of local and remote state. Local-only data is prioritized for upload and is never silently deleted by stale cloud data.
