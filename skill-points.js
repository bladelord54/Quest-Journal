// @ts-check
'use strict';
/**
 * skill-points.js — pure class skill-point ECONOMY math (Engineering Roadmap #1).
 *
 * 63rd incremental slice of the goal-manager.js God class, and the ELEVENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic
 * / buff-multipliers / companion-logic / class-perks / class-progression pattern). It completes the class-tree
 * trio: class-perks.js resolves "what VALUE a perk grants", class-progression.js resolves "WHERE in the tree
 * the player is", and this resolves "what the player can AFFORD" — the point supply, the two level gates, and
 * the respec fee/refund rules.
 *
 * The state-MUTATING spenders (`unlockNextClassNode`, `chooseCapstone`, `unlockNextSubclassTier`,
 * `respecClass`, `respecSubclass`) intentionally STAY on the class: they own the side effects
 * (`showAchievement`, `saveData`, `trackEvent`, the instance writes, `unlockCompanion` / `grantWizardSpells`).
 * Only their arithmetic lives here, as six PURE functions:
 *
 *   - earnedSkillPoints(level, classUnlockLevel) — the LIFETIME supply, derived (never stored): 1 point per
 *     level beyond the unlock level, clamped at 0. Deriving instead of storing auto-handles retroactive grants
 *     for players already past the unlock level when the feature shipped, and removes any per-level-up hook.
 *   - availableSkillPoints(earned, skillPointsSpent) — unspent balance, clamped at 0 so a data anomaly (spent
 *     exceeding earned) can never surface a negative budget.
 *   - isClassSystemUnlocked(level, classSelectLevel) — class SELECTION gate (level 8). Deliberately EARLIER
 *     than the point supply so the identity beat lands before the tree opens.
 *   - isSubclassUnlocked(classMastered, level, subclassUnlockLevel) — specialization gate: the base class must
 *     be fully mastered AND the player at the subclass level (40), the point where the 30-pt base tree maxes
 *     and surplus points become the subclass sink.
 *   - respecCost(earnedPoints, baseCost) — the class-respec fee, but FREE while no points have accrued yet:
 *     an early, under-informed class pick shouldn't cost crystals the player may not have.
 *   - refundedSpent(skillPointsSpent, subclassPointsSpent) — the new shared-pool total after a subclass-only
 *     respec. The pool covers BOTH trees, so it can't just be zeroed; only the subclass's sunk points come
 *     back, clamped at 0.
 *
 * The IMPURE inputs stay on the class: the delegators read this.level / this.skillPointsSpent + the
 * CLASS_SELECT_LEVEL / CLASS_UNLOCK_LEVEL / SUBCLASS_UNLOCK_LEVEL / CLASS_RESPEC_COST tunables and pass plain
 * values in (each default is preserved here as the `|| n` fallback, exactly as inline). Every function is a
 * byte-faithful lift of the expression it replaces (the existing "Class System v3.1" + subclass class tests
 * still drive the real delegators unchanged; the six functions are additionally locked by new isolation tests).
 *
 * Dual-environment, no bundler (mirrors class-progression.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.SKILL_POINTS. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./skill-points.js') returns the frozen object via module.exports (and also sets
 *     window.SKILL_POINTS under jsdom).
 */

/**
 * Lifetime skill points earned: 1 per level beyond the unlock level, clamped at 0. PURE.
 * @param {number} level
 * @param {number|null|undefined} classUnlockLevel  defaults to 10
 * @returns {number}
 */
function earnedSkillPoints(level, classUnlockLevel) {
    return Math.max(0, level - (classUnlockLevel || 10));
}

/**
 * Unspent skill points, clamped at 0. PURE.
 * @param {number} earned
 * @param {number|null|undefined} skillPointsSpent
 * @returns {number}
 */
function availableSkillPoints(earned, skillPointsSpent) {
    return Math.max(0, earned - (skillPointsSpent || 0));
}

/**
 * True once the player may PICK a class (earlier than the point supply). PURE.
 * @param {number} level
 * @param {number|null|undefined} classSelectLevel  defaults to 8
 * @returns {boolean}
 */
function isClassSystemUnlocked(level, classSelectLevel) {
    return level >= (classSelectLevel || 8);
}

/**
 * True once the base class is mastered AND the subclass level is reached. PURE.
 * @param {boolean} classMastered
 * @param {number} level
 * @param {number|null|undefined} subclassUnlockLevel  defaults to 40
 * @returns {boolean}
 */
function isSubclassUnlocked(classMastered, level, subclassUnlockLevel) {
    return classMastered && level >= (subclassUnlockLevel || 40);
}

/**
 * The class-respec Focus-Crystal fee — 0 (free) while no points have accrued. PURE.
 * @param {number} earnedPoints
 * @param {number|null|undefined} baseCost  defaults to 5
 * @returns {number}
 */
function respecCost(earnedPoints, baseCost) {
    return earnedPoints > 0 ? (baseCost || 5) : 0;
}

/**
 * The shared-pool spent total after a subclass-only respec: only the subclass's sunk points return,
 * clamped at 0. PURE.
 * @param {number|null|undefined} skillPointsSpent
 * @param {number} subclassPointsSpent
 * @returns {number}
 */
function refundedSpent(skillPointsSpent, subclassPointsSpent) {
    return Math.max(0, (skillPointsSpent || 0) - subclassPointsSpent);
}

const SKILL_POINTS = Object.freeze({
    earnedSkillPoints,
    availableSkillPoints,
    isClassSystemUnlocked,
    isSubclassUnlocked,
    respecCost,
    refundedSpent,
});


// Node / Jest

export default SKILL_POINTS;
