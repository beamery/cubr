# Cubr: Kinetic Speedcubing Dashboard

A hyper-optimized, standalone WCA-grade speedcubing dashboard built with React and Vite. Designed for high performance, distraction-free practice, and seamless cross-platform sync.

## 1. Quick Start

### Running Locally
1. Clone the repository.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Open the app: `http://localhost:5173`

### Cloud Sync (Supabase)
To enable cross-device solve history, click the **Connect Sync** button in the top bar. 
- All solves are stored locally in your browser for zero-latency.
- Data is automatically synced to a high-performance Supabase database.
- Supports 5000+ solve histories via paginated cloud loading.
- This allows you to practice on your phone and see the analytics on your desktop instantly.

## 2. Using the Dashboard

Cubr is designed to be as frictionless as a real Stackmat timer, heavily optimized for zero-latency interaction.

- **Starting/Stopping:** Tap or click anywhere in the massive timer area. The timer follows a professional **Stackmat state machine** (Cold -> Hold -> Ready -> Run).
- **Ghost Timer:** During a solve on desktop, the live digits remain visible at a subtle **5% opacity**, providing peripheral confirmation of the running time without being a distraction.
- **Typing Mode (Desktop):** Toggle the Keyboard icon to enter times manually. Supports **csTimer-style shorthands**:
    - `123` → `1.23`
    - `1234` → `12.34`
    - `1:23.45` → `1:23.45`
    - Press **Enter** to submit and automatically refresh your scramble.
- **HUD Flow:** The interface follows a strict vertical stack. Everything you need (Scramble, Timer, Penalty Buttons, and Scramble Preview) is perfectly centered and scaled to your viewport.
- **Smart Scrambles:** WCA-compliant notation powered by `cubing.js`. Megaminx scrambles are specifically formatted into 11-move rows for professional readability.

## 3. Performance & Analytics

The dashboard features a real-time **Performance Matrix** at the bottom of the screen.
- **Real-time Metrics:** Calculates your current `ao5`, `ao12`, and `ao100` on the fly.
- **WCA Compliance:** Averages are calculated following WCA regulations (9f1/9f2), including proper trimming and DNF tolerance.
- **Solve Detail:** Tap any solve in your history to view details, add comments, or toggle penalties (+2/DNF).

## 4. Multi-Event Architecture

Cubr maintains isolated solve histories for every puzzle type:
- **Event Selector:** Switch between 2x2 through 7x7, Megaminx, and more via the System Pill at the top.
- **Data Partitioning:** Your 3x3 times will never mix with your Megaminx times. Analytics and records are tracked independently per event.

## 5. Technical Design (The Kinetic System)

- **Zero-Latency Touch:** Native prevention of browser pull-to-refresh and scroll-bounce ensures a hardware-grade timing response on mobile.
- **Precision Timing:** Uses `performance.now()` hardware timestamps for sub-millisecond accuracy.
- **Screen Wake Lock:** Integrates the native Screen Wake Lock API to prevent device dimming or sleeping during long solves (e.g., Megaminx).
- **Kinetic Typography:** Employs dynamic CSS `clamp()` and `vw` (viewport width) functions to automatically scale scramble text right to the absolute edges of the user's specific screen size.
- **Cloud Data Integrity:** Employs a **Union Merge** strategy that ensures local solves are never overwritten by stale remote data. Includes a **Sync Guard** that prevents destructive logouts when unsynced data is present.
- **O(N) Scanning:** All history and PR logic is optimized to remain fast even with thousands of solves in your history.
- **Glassmorphism UI:** A premium, dark-mode-first aesthetic designed to be easy on the eyes during long practice sessions.
