// @ts-check
'use strict';
/**
 * enchantment-lifecycle.js — pure active-enchantment state math (Engineering Roadmap #1).
 *
 * 73rd incremental slice of the goal-manager.js God class, and the TWENTIETH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic / reminder-schedule-logic pattern).
 *
 * The sibling to `spell-lifecycle.js`, and the slice that makes the spell/enchantment ASYMMETRY explicit
 * rather than implicit. The two systems look alike but are NOT the same shape:
 *
 *   |                  | spells                              | enchantments                          |
 *   |------------------|-------------------------------------|---------------------------------------|
 *   | keyed by         | `spellId`                           | `effect`                              |
 *   | duration unit    | ms (already)                        | MINUTES in the catalog                |
 *   | sentinels        | `-1` permanent, `0` instant         | none — every enchantment is timed     |
 *   | records          | `castedAt`                          | `totalDuration`                       |
 *   | active predicate | id match AND not expired            | effect match ONLY (swept beforehand)  |
 *
 * That last row is the sharp edge. `hasActiveEnchantment` does NOT re-check expiry inline the way
 * `SPELL_LIFECYCLE.isActive` does — it relies on `checkExpiredEnchantments()` having just pruned the array
 * (every caller sweeps first). `isActive` here therefore deliberately keeps the bare `effect` match:
 * folding an expiry check into it would silently change behaviour at every call site that sweeps on a
 * different clock read. Same reasoning as the three spell sites that kept their bare `spellId` check.
 *
 * THE REAL FIND — a duplicated duration-window rule with DISAGREEING fallbacks. "How long was this
 * enchantment's window?" is answered in two hand-maintained places:
 *
 *   checkExpiredEnchantments (Scholar Insight preserve):
 *       e.totalDuration || (def ? def.duration * 60 * 1000 : 0)          // fallback 0
 *   enchantment-render.js (progress-bar denominator):
 *       ench.totalDuration || (defs[ench.id]?.duration || 180) * 60000   // fallback 180 MINUTES
 *
 * Same rule, same precedence, different tail — and a bare `180` literal that appears nowhere else in the
 * game. Legacy entries saved BEFORE `totalDuration` was introduced are exactly the inputs that reach those
 * tails, so the two copies could disagree on a real save. `durationWindowMs` states the rule once and takes
 * the fallback as an explicit PARAMETER, so the asymmetry becomes a visible argument instead of a buried
 * literal.
 *
 * Scope note: only the preserve path (here) delegates. The render copy stays INLINE deliberately — no
 * `*-render.js` module reaches for another extracted module (they take injected deps only), and
 * enchantment-render.js is documented as a byte-faithful move. Coupling it here would trade a duplicated
 * literal for a new load-order dependency, so instead `fallbackMinutes` EXPRESSES the render tail and a
 * test pins the two spellings to the same answer — the drift is caught rather than merely re-homed.
 * Neither caller's behaviour changes.
 *
 * One deliberate hardening: the old preserve-path tail produced `NaN` for a catalog entry with no
 * `duration` (`undefined * 60000`), and `NaN <= 0` is false, so the guard let it through and wrote
 * `expiresAt = now + NaN` — a permanently-stuck enchantment. Routing through `minutesToMs` yields `0`,
 * which the existing `<= 0` guard rejects cleanly. Unreachable with the current deep-frozen 13-entry
 * catalog (every entry has a duration, locked by a data-integrity test), so this is a latent-bug guard,
 * not a behaviour change.
 *
 * The PURE functions:
 *
 *   - minutesToMs(minutes) — catalog durations are in MINUTES; this is the one conversion (three inline
 *     copies of `* 60 * 1000` collapsed into it).
 *   - isActive(enchantments, effect) — the bare effect-match predicate described above.
 *   - expiring(enchantments, now) / stillActive(enchantments, now) — the two filters the expiry sweep runs.
 *     Kept as SEPARATE functions rather than one partition because the caller mutates `expiresAt` on
 *     preserved entries BETWEEN the two filters, and that ordering is load-bearing.
 *   - durationWindowMs(entry, def, fallbackMinutes) — the rule above; the tail is the caller's choice
 *     (0 = "no window, skip it" for the preserve path, 180 = the render denominator's assumption).
 *   - effectiveDurationMs(def, multiplier) — purchase-time window after the Scholar Lingering Magic perk.
 *   - effectiveCost(def, discount) — Scholar enchant discount, floored at 1 so nothing is ever free.
 *   - castEntry(def, { now, durationMs }) — the activeEnchantments record.
 *   - expiryWarningDelay(entry, now, warningMs) — setTimeout delay for the "expiring soon" notification,
 *     or null when the window is already inside the warning period.
 *
 * Everything impure stays on the class: `Date.now()`, the `activeEnchantments` writes, the crystal
 * deduction, the premium gate, the `rng()` preserve roll, the per-day counter resets (early_bird /
 * momentum), toasts, `saveData`, the re-renders and the real `setTimeout`.
 *
 * Dual-environment, no bundler (mirrors spell-lifecycle.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.ENCHANTMENT_LIFECYCLE. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./enchantment-lifecycle.js') returns the frozen object via module.exports.
 */

/**
 * @typedef {{ id: string, effect: string, expiresAt: number, totalDuration?: number,
 *             name?: string, icon?: string }} ActiveEnchantment
 */
/**
 * @typedef {{ id: string, effect: string, duration: number, cost: number,
 *             name?: string, icon?: string }} EnchantmentDef
 */

/** Milliseconds in a minute — catalog `duration` values are in MINUTES. */
const MINUTE_MS = 60 * 1000;

/** Lead time for the "expiring soon" notification. */
const EXPIRY_WARNING_MS = 5 * MINUTE_MS;

/**
 * Catalog minutes → milliseconds. Mirrors FOCUS_SESSION_LOGIC.minutesToMs (kept local so the two
 * logic modules stay independent of each other's load order). PURE.
 * @param {number|null|undefined} minutes
 * @returns {number}
 */
function minutesToMs(minutes) {
    return (minutes || 0) * MINUTE_MS;
}

/**
 * "Is an enchantment with this effect active?" — a BARE effect match, with no expiry check, because
 * every caller sweeps expired entries first (see the docblock). PURE.
 * @param {ActiveEnchantment[]|null|undefined} enchantments
 * @param {string} effect
 * @returns {boolean}
 */
function isActive(enchantments, effect) {
    return (enchantments || []).some(e => e.effect === effect);
}

/**
 * The entries whose window has closed at `now`. PURE.
 * @param {ActiveEnchantment[]|null|undefined} enchantments
 * @param {number} now epoch ms
 * @returns {ActiveEnchantment[]}
 */
function expiring(enchantments, now) {
    return (enchantments || []).filter(e => e.expiresAt <= now);
}

/**
 * The entries still running at `now`. Run AFTER any preserve step has pushed `expiresAt` forward, so
 * preserved entries survive this filter. PURE.
 * @param {ActiveEnchantment[]|null|undefined} enchantments
 * @param {number} now epoch ms
 * @returns {ActiveEnchantment[]}
 */
function stillActive(enchantments, now) {
    return (enchantments || []).filter(e => e.expiresAt > now);
}

/**
 * How long this enchantment's window is, in ms: the recorded `totalDuration` if present, else the
 * catalog duration, else the caller's fallback. The ONE statement of a rule that used to exist in two
 * places with different tails — pass 0 to mean "no window, skip", or a minute count to mean "assume
 * this long". PURE.
 * @param {{ totalDuration?: number }|null|undefined} entry
 * @param {{ duration?: number }|null|undefined} def catalog entry for the enchantment, if any
 * @param {number} [fallbackMinutes=0] used when neither a recorded nor a catalog duration exists
 * @returns {number} milliseconds (0 when nothing resolves and no fallback was given)
 */
function durationWindowMs(entry, def, fallbackMinutes) {
    const recorded = entry && entry.totalDuration;
    if (recorded) return recorded;
    return minutesToMs((def && def.duration) || fallbackMinutes || 0);
}

/**
 * The purchase-time window after a duration multiplier (Scholar Lingering Magic). PURE.
 * @param {{ duration?: number }|null|undefined} def
 * @param {number} [multiplier=1] e.g. 1.25 for a +25% perk
 * @returns {number} milliseconds
 */
function effectiveDurationMs(def, multiplier) {
    return Math.round(minutesToMs(def && def.duration) * (multiplier || 1));
}

/**
 * Focus-Crystal cost after the Scholar discount, floored at 1 so an enchantment is never free. PURE.
 * @param {{ cost?: number }|null|undefined} def
 * @param {number} [discount=0]
 * @returns {number} 0 for a missing definition, else at least 1
 */
function effectiveCost(def, discount) {
    if (!def) return 0;
    return Math.max(1, (def.cost || 0) - (discount || 0));
}

/**
 * Build the activeEnchantments record for a purchase. `totalDuration` is stored alongside `expiresAt`
 * so the progress bar reflects the ACTUAL (perk-extended) window rather than the base catalog value.
 * PURE.
 * @param {EnchantmentDef|null|undefined} def
 * @param {{ now?: number, durationMs?: number }} [opts]
 * @returns {ActiveEnchantment|null}
 */
function castEntry(def, opts) {
    if (!def) return null;
    const o = opts || {};
    const now = o.now || 0;
    const durationMs = o.durationMs === undefined ? minutesToMs(def.duration) : o.durationMs;
    return {
        id: def.id,
        effect: def.effect,
        expiresAt: now + durationMs,
        totalDuration: durationMs,
        name: def.name,
        icon: def.icon,
    };
}

/**
 * The setTimeout delay for the "expiring soon" warning, or null when the remaining window is already
 * at/inside the warning period (in which case no warning is scheduled at all). PURE.
 * @param {{ expiresAt?: number }|null|undefined} entry
 * @param {number} now epoch ms
 * @param {number} [warningMs=EXPIRY_WARNING_MS]
 * @returns {number|null}
 */
function expiryWarningDelay(entry, now, warningMs) {
    if (!entry || typeof entry.expiresAt !== 'number') return null;
    const warn = warningMs === undefined ? EXPIRY_WARNING_MS : warningMs;
    const timeUntilExpiry = entry.expiresAt - now;
    return timeUntilExpiry > warn ? timeUntilExpiry - warn : null;
}

const ENCHANTMENT_LIFECYCLE = Object.freeze({
    MINUTE_MS,
    EXPIRY_WARNING_MS,
    minutesToMs,
    isActive,
    expiring,
    stillActive,
    durationWindowMs,
    effectiveDurationMs,
    effectiveCost,
    castEntry,
    expiryWarningDelay,
});


// Node / Jest

export default ENCHANTMENT_LIFECYCLE;
