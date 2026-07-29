// globals.d.ts — ambient declarations for cross-file browser globals.
//
// This app ships as plain <script> tags (no bundler / no import graph), so a few
// singletons are shared through the global scope rather than imported:
//   - `goalManager`     — index.html sets it after `new GoalManager()`.
//   - `audioManager`    — audio-manager.js sets `window.audioManager`.
//   - `effectsManager`  — effects-manager.js sets `window.effectsManager`.
//
// Declared here as `any` so per-file `// @ts-check` modules can reference these
// singletons without a bundler. Typing them precisely would require exporting
// the classes as ES modules — a bigger refactor tracked under Engineering
// Roadmap #1. Only globals that are NOT already a top-level `const`/`class` in a
// checked file belong here (e.g. `mobileTouchHandler` is a const in
// mobile-touch.js, so it must NOT be declared here). See docs/ENGINEERING_ROADMAP.md #3.

declare var goalManager: any;
declare var audioManager: any;
declare var effectsManager: any;
