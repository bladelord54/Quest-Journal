// @ts-check
'use strict';
/**
 * boss-streak-logic.js — the boss-defeat streak reward multiplier (Engineering Roadmap #1, 87th
 * slice, the THIRTY-SECOND LOGIC module; second of the five extractions queued by the Sep 7
 * criterion-(1)/(2) audit).
 *
 * onBossDefeated() picked the right streak counter for the boss cadence with a ternary chain and
 * then computed "+10% reward per consecutive kill, capped at +100%" inline before rounding the XP
 * and gold rewards. That branch — which counter to read, the per-kill bonus, and the ten-stack cap
 * — is exactly the reward-amount rule criterion (1) asks to live off the class. It is now three
 * pure functions:
 *
 *   - streakForBossType(bossType, streaks) — picks daily/weekly/monthly from a plain
 *     `{ daily, weekly, monthly }` object, de-duplicating the ternary chain.
 *   - streakMultiplier(streak) — 1 + min(streak - 1, 10) * 0.10 (a fresh kill, streak 1, is the
 *     1.0x baseline; streak 11 and beyond holds at the +100% ceiling). A streak of 0 follows the
 *     same line down to 0.9x — never reached in production because onBossDefeated increments the
 *     counter first, but pinned rather than special-cased so the module stays byte-faithful.
 *   - applyStreakBonus(amount, multiplier) — the shared `Math.round(amount * multiplier)` step
 *     onBossDefeated applies to both the XP and gold rewards.
 *   - archiveDefeated(list, entry) — prepend the defeated-boss record and keep the newest
 *     DEFEATED_HISTORY_CAP (50); returns a NEW array. The challenge-logic.js `archiveCompleted`
 *     twin.
 *
 * Everything impure stays on the class: incrementing the streak counters themselves, the boss log
 * line, `addXP`/`addGold`, building the defeated-boss record and every celebration side effect.
 *
 * Dual-environment, no bundler (mirrors chest-weight-logic.js):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.BOSS_STREAK_LOGIC.
 *   - Jest/Node: require('./boss-streak-logic.js') returns the frozen namespace.
 */

/** Reward bonus per consecutive kill beyond the first ("+10% per streak"). */
const STREAK_BONUS_PER_KILL = 0.1;
/** Streak levels (beyond the first kill) the bonus keeps stacking for, before it caps. */
const MAX_STREAK_BONUS_STACKS = 10;
/** Newest defeated-boss records kept in the gallery/history list. */
const DEFEATED_HISTORY_CAP = 50;

/**
 * @typedef {{ daily?: number, weekly?: number, monthly?: number }} BossStreaks
 */

/**
 * Pick the streak counter for a boss cadence out of a plain streaks object. PURE.
 * @param {string} bossType 'daily' | 'weekly' | 'monthly'
 * @param {BossStreaks|null|undefined} streaks
 * @returns {number}
 */
function streakForBossType(bossType, streaks) {
    if (!streaks) return 0;
    if (bossType === 'daily') return streaks.daily || 0;
    if (bossType === 'weekly') return streaks.weekly || 0;
    if (bossType === 'monthly') return streaks.monthly || 0;
    return 0;
}

/**
 * The reward multiplier for a given consecutive-kill streak: +10% per streak level past the
 * first kill, capped at +100% (streak 11+). A streak of 0 or 1 is the 1.0x baseline. PURE.
 * @param {number} streak
 * @returns {number}
 */
function streakMultiplier(streak) {
    return 1 + Math.min((streak || 0) - 1, MAX_STREAK_BONUS_STACKS) * STREAK_BONUS_PER_KILL;
}

/**
 * Apply the streak multiplier to a base reward amount, rounded to the nearest whole unit —
 * the shared step onBossDefeated runs for both XP and gold. PURE.
 * @param {number} amount
 * @param {number} multiplier
 * @returns {number}
 */
function applyStreakBonus(amount, multiplier) {
    return Math.round((amount || 0) * multiplier);
}

/**
 * Prepend a defeated-boss record and trim to the newest DEFEATED_HISTORY_CAP. PURE — returns a
 * new array; the input list is not mutated.
 * @template T
 * @param {T[]|null|undefined} list newest-first history
 * @param {T} entry
 * @returns {T[]}
 */
function archiveDefeated(list, entry) {
    const next = [entry].concat(list || []);
    if (next.length > DEFEATED_HISTORY_CAP) next.length = DEFEATED_HISTORY_CAP;
    return next;
}

const BOSS_STREAK_LOGIC = Object.freeze({
    STREAK_BONUS_PER_KILL,
    MAX_STREAK_BONUS_STACKS,
    DEFEATED_HISTORY_CAP,
    streakForBossType,
    streakMultiplier,
    applyStreakBonus,
    archiveDefeated
});

export default BOSS_STREAK_LOGIC;
