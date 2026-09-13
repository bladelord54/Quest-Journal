// @ts-check
'use strict';
/**
 * effort-xp-logic.js — pure effort-based-XP priority scaling (Engineering Roadmap #1).
 *
 * 58th incremental slice of the goal-manager.js God class, and the SIXTH LOGIC extraction (the
 * loot-engine.js / boss-generator.js / persistence-migrations.js / streak-logic.js / leveling-logic.js
 * pattern). The "N3 effort-based XP" subsystem: the low/medium/high `priority` field doubles as an
 * effort proxy that scales each quest's XP reward. Medium is the 1.0x baseline so default-priority
 * items keep their historical XP exactly (no balance regression). The `base × multiplier, rounded`
 * reward pattern was hand-DUPLICATED across FIVE completion sites (side-quest ×20, daily-task ×15,
 * weekly ×50, monthly ×200, yearly ×1000) — the exact drift risk this roadmap targets. Three PURE,
 * stateless functions the God-class methods delegate to:
 *
 *   - normalizePriority(priority) — coerce any value to 'high' | 'medium' | 'low' (medium default).
 *   - priorityXPMultiplier(priority) — high 1.5×, medium 1.0×, low 0.75× (behind getPriorityXPMultiplier).
 *   - scaledXP(base, priority) — Math.round(base * priorityXPMultiplier(priority)); the shared
 *     five-site reward formula.
 *
 * The IMPURE anti-gaming daily cap (`_consumeHighPriorityDailySlot`, date-stamped instance state)
 * STAYS on the class: `_dailyTaskXP` downgrades high→medium once the per-day slot is spent, THEN
 * calls scaledXP. Every function is a byte-faithful lift of the inline expression it replaces (the
 * existing "Effort-based XP" class tests still drive the real delegators unchanged; the three module
 * functions are additionally locked by new isolation tests).
 *
 * Dual-environment, no bundler (mirrors leveling-logic.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.EFFORT_XP_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./effort-xp-logic.js') returns the frozen object via module.exports (and
 *     also sets window.EFFORT_XP_LOGIC under jsdom).
 */

/**
 * Coerce any priority value to the low/medium/high effort band. Unknown / missing → 'medium'
 * (the 1.0x baseline, so default-priority items keep their historical XP). PURE.
 * @param {string=} priority
 * @returns {'high'|'medium'|'low'}
 */
function normalizePriority(priority) {
    return (priority === 'high' || priority === 'low') ? priority : 'medium';
}

/**
 * Effort → XP multiplier: high 1.5×, medium 1.0×, low 0.75×. PURE.
 * @param {string=} priority
 * @returns {number}
 */
function priorityXPMultiplier(priority) {
    switch (normalizePriority(priority)) {
        case 'high': return 1.5;
        case 'low':  return 0.75;
        default:     return 1;
    }
}

/**
 * A quest's effort-scaled XP: base × priority multiplier, rounded. Single source of truth for
 * the five reward sites (side-quest 20, daily 15, weekly 50, monthly 200, yearly 1000). PURE.
 * @param {number} base
 * @param {string=} priority
 * @returns {number}
 */
function scaledXP(base, priority) {
    return Math.round(base * priorityXPMultiplier(priority));
}

const EFFORT_XP_LOGIC = Object.freeze({
    normalizePriority,
    priorityXPMultiplier,
    scaledXP,
});


// Node / Jest

export default EFFORT_XP_LOGIC;
