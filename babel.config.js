// Jest-only Babel config (Engineering Roadmap #3, criterion-(3) step 1 — tooling).
//
// Lets jest 29 read `import` / `export` syntax once the leaf modules and goal-manager.js
// are converted to real ES modules (steps 2–5). Until then every module is still CJS-shaped
// (IIFE + `module.exports`), which preset-env passes through untouched — so landing this first
// is a zero-behaviour-change check that the toolchain works before the codemod.
//
// NOT used by the browser build: the app ships unbundled source and `scripts/copy-web.js`
// copies files as-is. `targets: node current` means no down-levelling of syntax the running
// Node already supports; the only transform that matters is ESM → CJS for jest.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
};
