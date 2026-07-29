/**
 * Tailwind build-time config — v2.9 deferred audit fix ("bundle Tailwind
 * locally"). Replaces the Play CDN runtime compiler that index.html and
 * landing.html loaded from cdn.tailwindcss.com (unstyled first launch
 * offline + in-WebView compilation cost on every cold start).
 *
 * Build:  npm run build:css   (tailwindcss CLI → tailwind.css, minified)
 * The no-bundler setup is preserved — the output is a plain stylesheet
 * linked from the HTML, nothing else changes.
 */

// Several renderers build class names by string interpolation (e.g.
// `from-${color}-900` in renderArchives / treasure chests / spellbook /
// boss cards / challenge cards). The CDN's MutationObserver compiled
// those at runtime; a static build can't see them, so every observed
// dynamic prefix × shade × opacity combination is safelisted below.
// This generates ~2k utility classes (~tens of KB minified+gzipped) —
// an acceptable cost for not auditing every template literal.
const PALETTE =
  '(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)';

module.exports = {
  content: [
    './index.html',
    './landing.html',
    './privacy-policy.html',
    './goal-manager.js',
    './analytics-methods.js',
    './effects-manager.js',
    './mobile-touch.js',
    './stat-tooltip.js',
    './pwa-handler.js',
    './capacitor-bridge.js'
  ],
  safelist: [
    // Gradient stops: from-/to-/via-{color}-{shade}, optional /20 /50
    // opacity (boss enrage overlay, challenge cards), hover variants
    // (chest open buttons).
    {
      pattern: new RegExp(`^(from|to|via)-${PALETTE}-(600|700|800|900|950)(\\/(20|50))?$`),
      variants: ['hover']
    },
    // Solid fills: spell cards (bg-{c}-950), cast buttons
    // (bg-{c}-700 hover:bg-{c}-600), type badges (bg-{c}-700/800),
    // progress bars (bg-{c}-500), archive pills (bg-{c}-800/50).
    {
      pattern: new RegExp(`^bg-${PALETTE}-(500|600|700|800|900|950)(\\/(20|50))?$`),
      variants: ['hover']
    },
    // Borders: chest/spell/boss card frames, challenge cards (/50).
    {
      pattern: new RegExp(`^border-${PALETTE}-(600|700|800)(\\/50)?$`)
    },
    // Text: card body copy, archive restore buttons (hover:text-{c}-200).
    {
      pattern: new RegExp(`^text-${PALETTE}-(100|200|300|400|500)$`),
      variants: ['hover']
    }
  ],
  theme: {
    extend: {
      // Ported from landing.html's inline `tailwind.config` (removed
      // along with the CDN script tag).
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
