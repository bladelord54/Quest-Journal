// @ts-check
'use strict';
/**
 * leveling-logic.js — pure XP / leveling-curve math (Engineering Roadmap #1).
 *
 * 57th incremental slice of the goal-manager.js God class, and the SECOND non-render LOGIC
 * extraction (after streak-logic.js) — a continuation of the loot-engine.js / boss-generator.js /
 * persistence-migrations.js / streak-logic.js pattern. A cohesive set of pure, stateless functions
 * carrying the XP curve and the "progress within the current level" math that was hand-DUPLICATED
 * across FOUR sites in goal-manager.js (showXPToast, renderXPDisplay, _statBreakdownXP, and the
 * character-sheet share canvas) — the exact drift risk this roadmap targets. The God-class methods
 * stay as thin wrappers/delegators holding all the IMPURE work (DOM writes, canvas paints, toasts):
 *
 *   - xpForLevel(level) — XP required to advance FROM `level` to `level + 1` (behind
 *     getXPForLevel): 150 + (level - 1) * 250 (L1=150, L2=400, L3=650, L4=900, L5=1150).
 *   - totalXpForLevel(level) — cumulative XP to REACH `level` from level 1 (behind
 *     getTotalXPForLevel): level 1 = 0; level N = Σ xpForLevel(1..N-1).
 *   - levelProgress(totalXp, level) — the band math the four render/toast sites duplicated:
 *     { currentLevelXP, nextLevelXP, xpIntoLevel, xpNeededForLevel, pct }.
 *
 * Every function is a byte-faithful lift of the inline expression it replaces (the curve is
 * covered by the pre-existing getXPForLevel / getTotalXPForLevel unit tests, which still drive the
 * real class delegators unchanged; levelProgress is locked by new unit tests).
 *
 * Dual-environment, no bundler (mirrors streak-logic.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.LEVELING_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./leveling-logic.js') returns the frozen object via module.exports (and
 *     also sets window.LEVELING_LOGIC under jsdom).
 */
(function () {
    /**
     * XP required to advance FROM `level` to `level + 1`. Progressive scaling: level 1 = 150,
     * +250 per level (L2=400, L3=650, L4=900, L5=1150). PURE.
     * @param {number} level
     * @returns {number}
     */
    function xpForLevel(level) {
        return 150 + (level - 1) * 250;
    }

    /**
     * Total cumulative XP required to REACH `level` from level 1. Level 1 = 0; level N is the sum
     * of xpForLevel(1..N-1). PURE. Uses the module's own xpForLevel — the class delegator is a thin
     * wrapper (never overridden), so no seam is lost by not routing through `this`.
     * @param {number} level
     * @returns {number}
     */
    function totalXpForLevel(level) {
        let total = 0;
        for (let i = 1; i < level; i++) {
            total += xpForLevel(i);
        }
        return total;
    }

    /**
     * Progress of a cumulative-XP value within a given level's band. Single source of truth for the
     * XP-bar fill + "N / M XP" readouts that were duplicated across showXPToast, renderXPDisplay,
     * _statBreakdownXP, and the character-sheet canvas. PURE.
     *   currentLevelXP   — total XP at the START of `level`
     *   nextLevelXP      — total XP at the start of `level + 1`
     *   xpNeededForLevel — XP span of `level` (nextLevelXP - currentLevelXP)
     *   xpIntoLevel      — how far `totalXp` is into `level` (can exceed the span before a pending
     *                      level-up is processed, or be negative if `level` is ahead of `totalXp`)
     *   pct              — xpIntoLevel / xpNeededForLevel as a 0–100 clamped percentage
     * @param {number} totalXp
     * @param {number} level
     * @returns {{ currentLevelXP:number, nextLevelXP:number, xpIntoLevel:number, xpNeededForLevel:number, pct:number }}
     */
    function levelProgress(totalXp, level) {
        const currentLevelXP = totalXpForLevel(level);
        const nextLevelXP = totalXpForLevel(level + 1);
        const xpNeededForLevel = nextLevelXP - currentLevelXP;
        const xpIntoLevel = totalXp - currentLevelXP;
        const pct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));
        return { currentLevelXP, nextLevelXP, xpIntoLevel, xpNeededForLevel, pct };
    }

    const LEVELING_LOGIC = Object.freeze({
        xpForLevel,
        totalXpForLevel,
        levelProgress,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // LEVELING_LOGIC property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.LEVELING_LOGIC = LEVELING_LOGIC;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = LEVELING_LOGIC;
})();
