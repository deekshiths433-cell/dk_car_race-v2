# DK Car Race

**Created by DEEKSHITH.S** · Version `v1.0.0`

A high-speed 3D supercar racing game built with Three.js, React, TypeScript, Tailwind CSS, and procedural Web Audio synthesis.

## Features
- **6 Realistic Supercars**: BMW M4 Competition, Porsche 911 GT3, Ferrari F8 Tributo, Lamborghini Aventador SVJ, Bugatti Chiron Pur Sport, and the unlockable DK Apex Hyper-X.
- **Procedural Tracks & 6 Biomes**: City, Desert Highway, Alpine Mountain Pass, Pacific Coastal Road, Snowy Pine Forest, and Night Neon City with scaling rival speed, corners, weather, and obstacles.
- **Physics & Car Features**: Real-world top speeds & 0–100 km/h curves, 7-speed gearboxes, nitro boost, drifting, working headlights/taillights/indicators/hazards, live rear-view mirror, rain wipers, and collision damage.
- **Procedural Web Audio**: Custom harmonic engine sound per car tied to RPM, turbo whistle, exhaust pops, tire screech, wind rush, horn, and synth racing music.
- **Cross-Device Controls**: Keyboard + Mouse + Gamepad on desktop; Landscape Fullscreen multi-touch Buttons, Gyroscope Tilt (with calibration), and Touch Steering Wheel / Gesture on mobile with drag-and-drop layout customization.
- **Progression**: Garage customization & upgrades, Repair Shop (points or free rewarded ad), Car Shop, Daily Login Streak, Daily Missions, Achievements, and Circuit Leaderboard saved locally.

## Folder Structure
- `src/audio/` — Procedural Web Audio engine (`SoundEngine.ts`)
- `src/components/` — HUD, Home Page, Garage, Car Shop, Repair Shop, Level Select, Settings, Rewards, How to Play, About
- `src/data/` — Real-world car specs (`cars.ts`) and procedural biome/level generator (`levels.ts`)
- `src/engine/` — Three.js rendering (`RaceEngine.ts`, `ShowroomCanvas.tsx`), composite car builder (`CarBuilder.ts`), track builder (`TrackGenerator.ts`), vehicle physics (`PhysicsEngine.ts`), pooled particles (`ParticleSystem.ts`), procedural textures (`ProceduralTextures.ts`)
- `src/types/` — TypeScript domain interfaces (`game.ts`)
- `src/utils/` — LocalStorage persistence (`storage.ts`) and placeholder Rewarded Ad SDK bridge (`ads.ts`)

## Local Run Steps
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## Build & Deploy to Vercel
1. Run a production build locally to verify:
   ```bash
   npm run build
   ```
2. Push this repository to GitHub (or install Vercel CLI `npm i -g vercel`).
3. Deploy with Vercel:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Or run `vercel --prod` from the project root.
