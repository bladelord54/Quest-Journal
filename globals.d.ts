// globals.d.ts — ambient declarations for cross-file browser globals.
//
// The catalog / logic / render modules are ES modules (Roadmap #3), but the standalone
// classic scripts still share their singletons through the global scope:
//   - `goalManager`     — main.js sets it after `new GoalManager()`.
//   - `audioManager`    — audio-manager.js sets `window.audioManager`.
//   - `effectsManager`  — effects-manager.js sets `window.effectsManager`.
//   - `CapBridge`       — capacitor-bridge.js; `Capacitor` is injected by the native shell.
//   - `Android`         — the WebView JS-interface object on the Android build.
//   - `trackEvent`      — analytics-methods.js (classic script, global function).
//
// Declared here as `any` so `// @ts-check` modules can reference them. Only globals that are
// NOT already a top-level `const`/`class` in a checked file belong here (e.g.
// `mobileTouchHandler` is a const in mobile-touch.js, so it must NOT be declared here).
// See docs/ENGINEERING_ROADMAP.md #3.

declare var goalManager: any;
declare var audioManager: any;
declare var effectsManager: any;
declare function trackEvent(name: string, data?: Record<string, any>): void;

// `CapBridge` is a top-level `const` in capacitor-bridge.js (a classic script), so it is already a
// global binding — but block-scoped globals are NOT part of `typeof globalThis`, which is why a
// `declare var` does not make `window.CapBridge` typecheck. Augmenting `Window` does. The others
// are injected at runtime (native shell / Play Billing) and have no source declaration at all.
interface Window {
    CapBridge: any;
    Capacitor: any;
    Android: any;
    getDigitalGoodsService?: (serviceProvider: string) => Promise<any>;
}
