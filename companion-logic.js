// @ts-check
'use strict';
/**
 * companion-logic.js — pure companion slot + bonus resolution (Engineering Roadmap #1).
 *
 * 60th incremental slice of the goal-manager.js God class, and the EIGHTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic
 * / buff-multipliers pattern). It joins the companion family — companion-definitions.js (data catalog)
 * and companion-render.js (the Companion Den view) — as the LOGIC sibling. This completes the
 * reward-multiplier-input trio the prior slice started: addXP / addGold resolve their reward as
 * spellMultiplier × enchantmentMultiplier × (1 + companionBonus), and companionBonus is the third factor.
 *
 * Three PURE, stateless functions the God-class methods delegate to:
 *
 *   - activeCompanion(companions, activeCompanionId) — the owned companion object in the primary slot,
 *     or null (no slot set / not owned / empty roster).
 *   - secondCompanion(companions, activeCompanionId, activeCompanionId2, secondCompanionPerk) — the
 *     Ranger Twin Bond (v3.1 §3.2) second slot: null unless the capstone perk is active AND a distinct,
 *     owned companion is equipped there (never the primary).
 *   - companionBonus(type, active, second) — sums the two slots' bonusAmount for entries whose bonusType
 *     matches (Owl +10% xp, Dragon +15% gold, etc.); missing bonusAmount counts as 0.
 *
 * The IMPURE inputs stay on the class: the delegators read this.companions / this.activeCompanionId /
 * this.activeCompanionId2 instance state and resolve the this.getClassPerkValue('second_companion') gate,
 * then pass the plain values in. Every function is a byte-faithful lift of the inline body it replaces
 * (the existing "Companion System" + Ranger "Twin Bond" class tests still drive the real delegators
 * unchanged; the three module functions are additionally locked by new isolation tests).
 *
 * Dual-environment, no bundler (mirrors buff-multipliers.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.COMPANION_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./companion-logic.js') returns the frozen object via module.exports (and also
 *     sets window.COMPANION_LOGIC under jsdom).
 */
(function () {
    /**
     * @typedef {{ type: string, bonusType?: string, bonusAmount?: number }} Companion
     */

    /**
     * The owned companion object in the primary slot, or null when no slot is set, the roster is empty,
     * or the id isn't owned. PURE.
     * @param {Companion[]} companions
     * @param {string|null|undefined} activeCompanionId
     * @returns {Companion|null}
     */
    function activeCompanion(companions, activeCompanionId) {
        if (!activeCompanionId || !companions || companions.length === 0) return null;
        return companions.find(c => c.type === activeCompanionId) || null;
    }

    /**
     * The Ranger Twin Bond second-slot companion, or null when the capstone isn't active, no distinct
     * second companion is set, or it duplicates / isn't owned. secondCompanionPerk is the resolved
     * getClassPerkValue('second_companion') (> 0 when the capstone is chosen). PURE.
     * @param {Companion[]} companions
     * @param {string|null|undefined} activeCompanionId
     * @param {string|null|undefined} activeCompanionId2
     * @param {number} secondCompanionPerk
     * @returns {Companion|null}
     */
    function secondCompanion(companions, activeCompanionId, activeCompanionId2, secondCompanionPerk) {
        if (secondCompanionPerk <= 0) return null;
        if (!activeCompanionId2 || activeCompanionId2 === activeCompanionId) return null;
        return (companions || []).find(c => c.type === activeCompanionId2) || null;
    }

    /**
     * Sum the active companion's bonus and, when the Ranger Twin Bond capstone is active, the second
     * equipped companion's bonus — but only for entries whose bonusType matches `type`. A missing
     * bonusAmount contributes 0. PURE.
     * @param {string} type
     * @param {Companion|null} active
     * @param {Companion|null} second
     * @returns {number}
     */
    function companionBonus(type, active, second) {
        let bonus = 0;
        if (active && active.bonusType === type) bonus += (active.bonusAmount || 0);
        if (second && second.bonusType === type) bonus += (second.bonusAmount || 0);
        return bonus;
    }

    const COMPANION_LOGIC = Object.freeze({
        activeCompanion,
        secondCompanion,
        companionBonus,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // COMPANION_LOGIC property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.COMPANION_LOGIC = COMPANION_LOGIC;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = COMPANION_LOGIC;
})();
