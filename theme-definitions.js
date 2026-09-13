// @ts-check
'use strict';
/**
 * theme-definitions.js — the color-palette theme catalog (Engineering Roadmap #1).
 *
 * Fourth incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. Keyed by theme id; each entry carries display metadata
 * (name/icon/color), its `unlockLevel`, a `premium` flag, optional
 * achievement-gate copy (`special`), the selector-card palette
 * (`cardFrom`/`cardTo`/`border`), and — for premium themes in the Theme-of-the-
 * Week rotation — a `weeklyRotationIndex` (0..8) read by getWeeklyFeaturedThemeId().
 *
 * Color Theme System — Proposal B split (Jun 7, 2026):
 *   Free (5): default, forest, ice, golden, shadow
 *     - default + forest are level-gated free starters (lvl 0, 6)
 *     - ice promoted from premium to free as a mid-game level reward (lvl 15) —
 *       gives free users a real progression journey beyond forest at lvl 6
 *     - golden + shadow are achievement-gated (effort-rewards): promoted from
 *       premium to free Jun 7, 2026 to fix the prior "double-gating" weirdness
 *       where free users could hit the criteria but still couldn't use the
 *       reward. Achievement is now the only gate.
 *   Premium (9): desert, sunken, stormwatch, volcanic, verdant, mystic,
 *     cathedral, crystal, aurora
 *     - All 6 hybrid (WebM) themes stay premium (highest production cost)
 *     - Plus 3 pure-CSS themes (desert, volcanic, mystic) kept premium for
 *       revenue balance — the "prestige palette" tier that visually distinguishes
 *       premium users.
 *   Achievement criteria (Jun 7, 2026):
 *     - Golden Empire: 10,000 gold LIFETIME earned (not current balance — see
 *       `totalGoldEarned`)
 *     - Shadow Realm: 25 bosses defeated (lifetime)
 *
 * Dual-environment, no bundler (mirrors balance.js / level-titles.js /
 * companion-definitions.js / spell-definitions.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.THEME_DEFINITIONS. goal-manager.js captures it into a
 *     module-scoped const and assigns it to the `themeDefinitions` class field,
 *     so this.themeDefinitions and every call site is unchanged.
 *   - Jest/Node: `require('./theme-definitions.js')` returns the object via
 *     module.exports (and also sets window.THEME_DEFINITIONS under jsdom).
 */

/**
 * Recursively freeze the catalog so it is a true constant — no call site can
 * accidentally mutate the shared theme table at runtime. (Tests that need to
 * vary the table rebind the instance field to a fresh object instead.)
 * @param {any} obj
 * @returns {any}
 */
function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach((key) => {
        const value = obj[key];
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    });
    return Object.freeze(obj);
}

const THEME_DEFINITIONS = deepFreeze({
    default: { name: 'Medieval Kingdom', icon: '🏰', color: '#b45309', unlockLevel: 0, premium: false },
    forest: { name: 'Forest Kingdom', icon: '🌲', color: '#047857', unlockLevel: 6, premium: false, cardFrom: '#033026', cardTo: '#011812', border: '#059669' },
    // v2.9 Track 7 — Theme of the Week rotation.
    // Premium themes carry a `weeklyRotationIndex: N` (0–8) that drives
    // `getWeeklyFeaturedThemeId()`. The hand-picked order alternates
    // cool/warm tonal pairs so consecutive weeks don't feel monotonous:
    //   0 sunken     (cool / teal water)
    //   1 desert     (warm / orange dunes)
    //   2 stormwatch (cool / blue thunderhead)
    //   3 volcanic   (warm / crimson forge)
    //   4 verdant    (cool / mossy green)
    //   5 mystic     (warm / violet)
    //   6 aurora     (cool / cyan polar)
    //   7 cathedral  (warm / gothic red)
    //   8 crystal    (cool / magenta caves)
    // Rotation period = 9 weeks. Re-order by editing these indices;
    // determinism comes from `getWeeklyFeaturedThemeId()` reading the
    // sorted-by-index list, not from their declaration order here.
    desert: { name: 'Desert Oasis', icon: '🏜️', color: '#c2410c', unlockLevel: 10, premium: true, weeklyRotationIndex: 1, cardFrom: '#431407', cardTo: '#1f0a04', border: '#ea580c' },
    ice: { name: 'Ice Citadel', icon: '❄️', color: '#0369a1', unlockLevel: 15, premium: false, cardFrom: '#082f49', cardTo: '#041726', border: '#0ea5e9' },
    volcanic: { name: 'Volcanic Forge', icon: '🌋', color: '#dc2626', unlockLevel: 20, premium: true, weeklyRotationIndex: 3, cardFrom: '#450a0a', cardTo: '#1f0505', border: '#ef4444' },
    mystic: { name: 'Mystic Realm', icon: '✨', color: '#7c3aed', unlockLevel: 25, premium: true, weeklyRotationIndex: 5, cardFrom: '#2e1065', cardTo: '#140830', border: '#8b5cf6' },
    golden: { name: 'Golden Empire', icon: '👑', color: '#ca8a04', unlockLevel: 0, unlock: { goldEarned: 10000 }, special: 'Earn 10,000 gold', premium: false, cardFrom: '#402804', cardTo: '#1f0f03', border: '#eab308' },
    shadow: { name: 'Shadow Realm', icon: '🌑', color: '#374151', unlockLevel: 0, unlock: { bossesDefeated: 25 }, special: 'Defeat 25 bosses', premium: false, cardFrom: '#1f2937', cardTo: '#0f1623', border: '#374151' },
    // v2.8 marquee theme — hybrid (WebM atmosphere + CSS rain particles).
    // Slotted at level 18 to fit cleanly between ice (15) and volcanic
    // (20) in the existing 5-level cadence; premium tier matches every
    // other non-default theme. See docs/HISTORY.md § 2.4 for the full design
    // narrative (strategy D, lightning iteration history, palette tune).
    stormwatch: { name: 'Stormwatch', icon: '⛈️', color: '#475569', unlockLevel: 18, premium: true, weeklyRotationIndex: 2, cardFrom: '#1e293b', cardTo: '#0f172a', border: '#60a5fa' },
    // v2.8 pure-CSS theme — Verdant Grove. Wedged at level 22 between
    // volcanic (20) and mystic (25), mirroring Stormwatch's 3-level
    // wedge above ice. Differentiated from the existing free Forest
    // Kingdom (level 6) by going darker/mossier/ancient-druid: deeper
    // jade-into-near-black palette + slower leaf drift in the particle
    // config + `.particle-leaf` CSS class instead of forest's
    // `icons/leaf.gif`. No WebM (strategy D pure-CSS lane). docs/HISTORY.md § 2.4.
    verdant: { name: 'Verdant Grove', icon: '🌿', color: '#15803d', unlockLevel: 22, premium: true, weeklyRotationIndex: 4, cardFrom: '#0c3a1f', cardTo: '#04150c', border: '#16a34a' },
    // v2.8 round 2 (Jun 5, 2026) — three additional pure-CSS themes
    // built on the strategy D pattern (palette + radial gradients +
    // pure-CSS particles, no GIF runtime dep, optionally promotable
    // to hybrid later if the user supplies a WebM). Unlock levels
    // chosen to extend the existing cadence:
    //   Sunken Library 13 — between desert (10) and ice (15)
    //   Dark Cathedral 28 — above mystic (25), prestige tier
    //   Aurora Spires  35 — top of ladder, ultimate prestige theme
    // Card from/to/border match the body palette in themes.css; the
    // `color` field drives the theme-transition flash and selector
    // chip. Each theme has a corresponding particle config below
    // and a `body.theme-X` block in themes.css. docs/HISTORY.md § 2.4.
    sunken: { name: 'Sunken Library', icon: '🌊', color: '#0e7490', unlockLevel: 13, premium: true, weeklyRotationIndex: 0, cardFrom: '#0e3a52', cardTo: '#07182a', border: '#06b6d4' },
    // Dark Cathedral — v2.8 round 3 background upgrade (Jun 5, 2026
    // afternoon). Was originally a pure-CSS violet+amber gradient
    // theme (round 2 morning); upgraded to a STATIC IMAGE BACKGROUND
    // (icons/cathedral-bg.webp, user-supplied) plus a 4-candle CSS
    // flicker overlay (see #theme-cathedral-candles in index.html
    // and the candle-flicker class in animations.css). Palette
    // retuned violet→crimson + amber→cold-slate to match the
    // image's black-and-red gothic interior. color/cardFrom/cardTo/
    // border below all updated to crimson palette so the Themes
    // selector preview card matches the in-game theme. Icon ⛪
    // unchanged — still reads as cathedral. docs/HISTORY.md § 2.4 round 3.
    cathedral: { name: 'Dark Cathedral', icon: '⛪', color: '#991b1b', unlockLevel: 28, premium: true, weeklyRotationIndex: 7, cardFrom: '#292524', cardTo: '#0c0a09', border: '#991b1b' },
    // Aurora Spires — top-tier prestige theme. 🌌 icon (Milky Way)
    // signals the cosmic-night aesthetic. Promoted to hybrid Jun 6,
    // 2026 (round 4) when user supplied `icons/aurora-spires-bg.webm`,
    // and palette retuned same evening from indigo-primary →
    // cyan-primary to match the WebM's saturated cyan-teal aurora
    // bands + ice-spire foreground (the original indigo palette
    // was a poor match against the actual video — see themes.css
    // body.theme-aurora block for the full retune narrative).
    // `color` is now cyan-500 to drive the theme-transition flash
    // and selector chip in the saturated aurora hue rather than
    // muted indigo. cardFrom/To preserve the indigo-950→slate-900
    // night-sky base; border shifts to cyan-400 to mirror the
    // ice-spire foreground.
    aurora: { name: 'Aurora Spires', icon: '🌌', color: '#06b6d4', unlockLevel: 35, premium: true, weeklyRotationIndex: 6, cardFrom: '#1e1b4b', cardTo: '#0f172a', border: '#22d3ee' },
    // Crystal Caves — v2.8 round 3, 6th theme (Jun 5, 2026).
    // Slotted at level 31 specifically to even out the unlock
    // ladder (previously had a 7-level gap between Cathedral 28
    // and Aurora 35; now 28→31→35 gives two clean 3-4 level
    // jumps). 💎 icon (gem stone) reads as the theme at a
    // glance — chosen over 🔮 (crystal ball, too mystical) and
    // 🌟 (star, too aurora-adjacent). cardFrom/To match
    // themes.css's indigo-950→slate-950 cave gradient; border
    // is fuchsia-600 to suggest the magenta crystal edges
    // around card chrome. Pure-CSS for now (per the new
    // informal "prefer pure-CSS, allow hybrids only with
    // user-supplied WebM" rule from § 2.4).
    crystal: { name: 'Crystal Caves', icon: '💎', color: '#c026d3', unlockLevel: 31, premium: true, weeklyRotationIndex: 8, cardFrom: '#1e1b4b', cardTo: '#020617', border: '#c026d3' }
});


// Node / Jest

export default THEME_DEFINITIONS;
