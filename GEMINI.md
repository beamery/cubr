# GEMINI.md - Cubr Web Project Context

## Codebase Purpose
A high-performance, standalone cubing dashboard built with Vite + React, designed to solve the Bluetooth and cross-platform sync limitations of the Obsidian plugin environment.
**Goal:** A hyper-optimized, mobile-first WCA-grade speedcubing toolkit (Timer + Analytics) built entirely in React.

## Design Standards (Kinetic Design)
All UI changes MUST align with the **Kinetic** design specification:
- **Rich Aesthetics:** Glassmorphism, dark mode by default, vibrant accents (Primary: #00A2FF, Success: #00FF9D).
- **Vertical HUD Flow:** Content follows a strict vertical stack (System Pill -> Scramble -> Timer -> Penalty HUD -> Visualizer). 
- **Absolute Centering:** The timer UI utilizes a proportional scaling strategy. The main time display is centered in a container that spans the viewport, while Scramble/Buttons float via layout springs. **Do not use standard justify-content: center** for the whole stack as it causes jittering; use top-anchoring with `margin: auto` springs.

### Critical Developer Notes
1. **Vertical Centering:** The timer UI utilizes an absolute-overlap strategy. The `TimerView`'s main time display is centered in a container that spans the full viewport, while the Scramble/Buttons float via absolute positioning. **Do not switch back to standard Flexbox `center`** as it will cause jittering with varied scramble lengths.
2. **Mobile First & Parity:** Cubr is designed to be used equally on mobile and desktop. **Mobile responsiveness is a high-priority requirement.** All new features, especially data-heavy analytics like histograms, must be neatly contained within the mobile viewport (e.g., iPhone 13 Pro) without horizontal scrolling. Use flex-wrap and relative units for all layout components.
3. **Rules of Hooks:** Always ensure `useMemo` and other hooks are called BEFORE any conditional returns (e.g., the `isLoadingData` check).

## Architecture

### 1. View Engine (React)
- **Mobile First UX:** Zero-latency touch response. Components use explicit `userSelect: 'none'` to prevent selection during solve logic.
- **Precision Timing:** The clock mechanism relies on `requestAnimationFrame` tied to `performance.now()` hardware timestamps.
- **Stats Logic:** Averages (Ao5, Ao12, Ao100) are calculated dynamically using linear loops.
    - **WCA 9f1/9f2 Compliance:** 
        - **Ao5:** Trims 1 best and 1 worst.
        - **Ao12+:** Trims 5% of solves from each end.
        - **Mo3:** Mean of 3 (no trimming).
        - **Ao25/50:** Extended WCA-compliant averages.
        - **DNF Tolerance:** Window is DNF if the number of DNFs exceeds the allowed trim count.
    - **High-Density HUD:** Mobile HUD uses a 2-column grid (`.hud-stats-grid`) to display mo3, ao5, ao12, ao25, ao50, and ao100 simultaneously without horizontal overflow.

### 2. Cubr Logic (cubing.js)
- **Scrambles:** `randomScrambleForEvent(event)` generates WCA-compliant sequences.
- **Visualizer:** `<twisty-player>` with `visualization="2D"`.
- **Smart Wrapping:** Megaminx scrambles wrap specifically after every `U` or `U'` move to maintain 11-move row integrity.

### 3. Data Integration (Supabase Sync)
- **Hybrid Storage:** Solves are stored in `localStorage` for instant local persistence and synced to Supabase (PostgreSQL) for cross-device availability.
- **Zombie Solve Protection (DEPRECATED):** Previous logic prioritized cloud state and deleted local solves if they were missing from the cloud. This has been replaced by the **Union Merge** strategy.
- **Union Merge (Current):** 
    - **Logic:** `solves = Union(Local, Remote)`. 
    - **Persistence:** Any solve in Local NOT in Remote is immediately scheduled for an `upsert` push.
    - **Safety:** Local solves are **never** deleted unless the user manually clears the session.
- **Sync Guard:** The `signOut` function checks `unsyncedCount`. It blocks the deletion of `localStorage` unless the user explicitly confirms the loss of pending data.
- **Robust Sync Triggers:** In addition to load-time sync, the engine reconciles data on **Window Focus** and at a **5-minute background interval** to recover from failed push attempts.
- **UUIDs:** All solve records use `crypto.randomUUID()` to prevent ID collisions during multi-device synchronization.
- **Paginated Loading:** PostgREST has a default 1000-row limit. `SupabaseStorageProvider` implements paginated fetching in batches of 1000 to support 5000+ solve histories.
- **Bulk Upserts:** Imports and migrations are chunked into 500-solve batches to ensure reliable saving to the cloud.

### 4. Interactive Modes
- **Stopwatch Mode:** Standard Stackmat state machine with `requestAnimationFrame` timing.
- **Typing Mode (Desktop Only):** csTimer-style manual entry.
    - **Shorthand Parsing:** `123` -> `1.23`, `1234` -> `12.34`, `12345` -> `1:23.45`.
    - **Submission:** `Enter` key triggers `onSolveComplete` and automatically generates the next scramble.
- **Ghost Timer:** Live timer feedback at **5% opacity** on desktop to confirm running state without distraction.

## Development Workflow Rules (CRITICAL)
1. **Automated Dev Server**: Ensure `npm run dev` is running and provide the link `http://localhost:5173`.
2. **Cloud Ownership**: The agent manages Google Drive API scopes and ClientID setup. The USER should never read cloud docs.
3. **Performance**: PR scanning MUST remain O(N). Avoid JS spread operator `(...)` on solve arrays as it causes stack exhaustion on large histories.

## Windows Environment Rules (CRITICAL)
1. **Node Commands**: Due to PowerShell execution policies, you MUST always append `.cmd` to Node binaries. Use `npm.cmd`, `npx.cmd`, and `vercel.cmd` instead of the base commands.
2. **Build Environment**: Always run build/deploy commands from Windows CMD or PowerShell. Avoid WSL to prevent `rolldown` native module binding errors.

## Deployment & Version Control Strategy
1. **Version Control**: Git is the official VCS. Pushing to GitHub repository `beamery/cubr` triggers automatic deployments.
2. **Deployment Platform**: Vercel Git integration. Automated builds compile the app directly in the cloud on every `git push` to `main`.
3. **Local Dev Commands**: Use `npm.cmd run dev` for local dev server (Vite) and `npm.cmd run build` to verify production builds locally.
4. **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured in the Vercel dashboard for production builds.
5. **SPA Configuration**: `vercel.json` rewrite rule is mandatory to support client-side routing on refresh.

## Tech Stack
- **Framework**: Vite + React + TypeScript.
- **Timer Engine**: `cubing.js`.
- **Sync**: Supabase (PostgreSQL + Auth).
- **Animations**: Framer Motion.
- **Icons**: Lucide React.
