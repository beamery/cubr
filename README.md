# ⚡ Cubr: Kinetic Speedcubing Dashboard

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen.svg)](https://project-3da7l.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://project-3da7l.vercel.app)
[![React Version](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Vite Version](https://img.shields.io/badge/Vite-8-purple.svg)](https://vite.dev)

**Cubr** is a hyper-optimized, standalone, WCA-grade speedcubing toolkit built with React 19 and Vite 8. Designed from the ground up for elite performance, distraction-free practice, and seamless cross-platform synchronization, it provides a premium, zero-latency timing and analytics experience on both desktop and mobile devices.

👉 **Experience the App:** [project-3da7l.vercel.app](https://project-3da7l.vercel.app)

---

## ✨ Features

### 🎮 Hardware-Grade Timing (Stackmat State Machine)
- **Sub-Millisecond Accuracy:** Leverages high-resolution `performance.now()` monotonic clock timestamps, completely decoupled from visual frame rates or CPU throttling.
- **Stackmat State Machine:** Mimics a professional physical timer (Idle -> Holding -> Ready -> Running -> Stopped) with responsive color transitions:
  - 🟥 **Holding (Pulse Red):** Preparing for solve.
  - 🟩 **Ready (Electric Green):** Inspection ready, timing triggers on release.
  - 👻 **Ghost Timer:** The running timer digits are rendered at a subtle **5% opacity** on desktop during solves, confirming the timer is running in your peripheral vision without causing cognitive distraction.
  - 🟦 **Stop (Overshoot Snap):** Instantly snaps to 100% opacity with a scale-up bump effect to celebrate your solve.

### 📱 Zero-Latency Mobile HUD (Native PWA)
- **High-Performance Gestures:** Built with `touch-action: none` to entirely bypass default mobile browser tap delays.
- **Native Wake Lock:** Integrates the browser's native **Screen Wake Lock API** to prevent your mobile screen from dimming or sleeping during long practice sessions.
- **Standalone Mode:** Fully configured as a Progressive Web App (PWA) with premium high-resolution home screen icons and full viewport scaling.

### 📊 Professional Analytics & WCA Compliance
- **Strict Average Compliance (Regulation 9f):** Dynamically computes WCA-compliant averages (`ao5`, `ao12`, `ao50`, `ao100`) including best/worst time trimming and strict DNF (Did Not Finish) tolerance limits.
- **Mean of 3 (mo3):** Track three-solve average events dynamically.
- **Interactive Performance Matrix:** Beautiful real-time metrics, interactive comparison histograms, and session record/PR tracking at the bottom of the workspace.
- **Multi-Event Partitioning:** Isolated data sets for every WCA event (2x2x2 through 7x7x7, Megaminx, Pyraminx, Square-1, Skewb, 3x3x3 OH, 3x3x3 BLD) ensuring records are tracked independently.

### 🔌 Ecosystem & Integration
- **csTimer Shorthand Inputs:** Desktop manual typing mode supports csTimer-style shorthands (e.g., `123` → `1.23`, `1234` → `12.34`, `12345` → `1:23.45`). Pressing `Enter` automatically submits the time and fetches your next scramble.
- **csTimer Import & Export:** Built-in csTimer-compatible JSON session import and export interface in the timer controls, enabling seamless migration of your solve histories.
- **🌀 Smart Cube (Bluetooth) Integration:** Direct connection support for modern Bluetooth smart cubes, supporting automated solve triggers and real-time state synchronization.
- **☁️ Hybrid Local-First Sync (Union Merge):** Solves are saved instantly to `localStorage` for offline speed, and synced to a Supabase database in the background when connected. Features a safety logout guard to prevent accidental data loss.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** React 19 + TypeScript + Vite 8
- **Timer Engine:** `cubing.js` (official WCA-compliant scramble generator and visualizer)
- **Database/Auth:** Supabase (Postgres + Gotrue)
- **Animations:** Framer Motion (smooth, fluid transition states)
- **Icons:** Lucide React (premium glassmorphism icon system)
- **Layout:** CSS `clamp()` and responsive variables for seamless edge-to-edge typography scaling.

---

## 🚀 Getting Started

### 1. Run Locally
You can run Cubr locally with zero cloud dependencies; it will default to storing all solves in your browser's local storage:

```bash
# Clone the repository
git clone https://github.com/beamery/cubr.git
cd cubr

# Install dependencies
npm install

# Start the local development server
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser and start solving!

### 2. Self-Hosting with Cloud Sync (Supabase)
To enable cloud backup and cross-device sync on your own infrastructure:

1. **Configure Environment Variables:** Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-key
   ```

2. **Initialize Database Table:** Run the following SQL query in your Supabase SQL Editor to provision the required schema and Row Level Security (RLS) policies:

   ```sql
   -- Create the solves table
   CREATE TABLE public.solves (
       id TEXT PRIMARY KEY,
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       time_ms BIGINT NOT NULL,
       penalty TEXT NOT NULL DEFAULT 'NONE',
       scramble TEXT NOT NULL,
       comment TEXT,
       date TIMESTAMP WITH TIME ZONE NOT NULL,
       event TEXT NOT NULL DEFAULT '333'
   );

   -- Grant privileges to roles for Data API access (required after Supabase May 2026 update)
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.solves TO authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.solves TO service_role;

   -- Enable Row Level Security (RLS)
   ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;

   -- Row Level Security Policies
   CREATE POLICY "Users can insert their own solves"
       ON public.solves FOR INSERT
       WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can view their own solves"
       ON public.solves FOR SELECT
       USING (auth.uid() = user_id);

   CREATE POLICY "Users can update their own solves"
       ON public.solves FOR UPDATE
       USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own solves"
       ON public.solves FOR DELETE
       USING (auth.uid() = user_id);

   -- Create search index for event filtering and chronological sorting
   CREATE INDEX idx_solves_user_event_date ON public.solves (user_id, event, date DESC);
   ```

3. **Start the App:** Run `npm run dev` again, and the dashboard will automatically connect to your Supabase instance.

---

## 🤝 Contributing

We welcome contributions from speedcubers and developers alike! To contribute:

1. **Fork the repository** on GitHub.
2. **Create a branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes** following modern git commit conventions:
   ```bash
   git commit -m "feat: add amazing new feature"
   ```
4. **Push your branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request** describing your changes.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
