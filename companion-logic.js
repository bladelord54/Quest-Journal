// @ts-check
'use strict';
/**
 * companion-logic.js — pure companion slot/bonus resolution + XP-gain math (Engineering Roadmap #1).
 *
 * 60th incremental slice of the goal-manager.js God class (the EIGHTH LOGIC extraction), extended by
 * the 88th slice (the Sep 7 criterion (1)/(2) audit) with the companion XP-gain math `grantCompanionXP`
 * still had inline. It joins the companion family — companion-definitions.js (data catalog) and
 * companion-render.js (the Companion Den view) — as the LOGIC sibling. The original trio completes the
 * reward-multiplier-input triad: addXP / addGold resolve their reward as
 * spellMultiplier × enchantmentMultiplier × (1 + companionBonus), and companionBonus is the third factor.
 *
 * Five PURE, stateless functions the God-class methods delegate to:
 *
 *   - activeCompanion(companions, activeCompanionId) — the owned companion object in the primary slot,
 *     or null (no slot set / not owned / empty roster).
 *   - secondCompanion(companions, activeCompanionId, activeCompanionId2, secondCompanionPerk) — the
 *     Ranger Twin Bond (v3.1 §3.2) second slot: null unless the capstone perk is active AND a distinct,
 *     owned companion is equipped there (never the primary).
 *   - companionBonus(type, active, second) — sums the two slots' bonusAmount for entries whose bonusType
 *     matches (Owl +10% xp, Dragon +15% gold, etc.); missing bonusAmount counts as 0.
 *   - companionXpGain(amount, { bondingActive, rangerCompXpMult }) — the raw XP grant resolves the
 *     Bonding enchantment's flat ×2 THEN the Ranger Beastmaster perk's `ceil(xp * (1 + mult))` scale, in
 *     that order (matches the original `grantCompanionXP` line order — bonding first, ceil-scale second).
 *   - applyCompanionXp(companion, xpGain) — adds xpGain to the companion (handed object mutated in
 *     place, matching `persistence-migrations.js`'s convention for mutate-what-you're-handed lifts) and
 *     walks the `100 * level` level-up threshold in a `while` loop so a single large XP gain can carry a
 *     companion through more than one level; returns whether it leveled at least once.
 *
 * The IMPURE inputs stay on the class: the delegators read this.companions / this.activeCompanionId /
 * this.activeCompanionId2 / this.hasActiveEnchantment('companion_bond') /
 * this.getClassPerkValue('companion_xp_mult') instance state and pass the plain values in; the
 * post-level-up side effects (`effectsManager.companionLevelUp`, `showAchievement`) stay on
 * `grantCompanionXP` too. Every function is a byte-faithful lift of the inline body it replaces (the
 * existing "Companion System" + Ranger "Twin Bond"/"Beastmaster" class tests still drive the real
 * delegators unchanged; the module functions are additionally locked by new isolation tests).
 *
 * Dual-environment, no bundler (mirrors buff-multipliers.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.COMPANION_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./companion-logic.js') returns the frozen object via module.exports (and also
 *     sets window.COMPANION_LOGIC under jsdom).
 */

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

/**
 * The XP a companion actually gains from a raw `amount`, after the Bonding enchantment's flat ×2
 * and the Ranger Beastmaster perk's `ceil(xp * (1 + mult))` scale — bonding applies FIRST, then the
 * ceil-scale, matching the original inline order. `rangerCompXpMult <= 0` (no Ranger / no perk node
 * unlocked) skips the ceil entirely, so a non-Ranger with bonding gets an exact ×2 with no rounding.
 * PURE.
 * @param {number} amount
 * @param {{ bondingActive?: boolean, rangerCompXpMult?: number }} [opts]
 * @returns {number}
 */
function companionXpGain(amount, opts) {
    const bondingActive = !!(opts && opts.bondingActive);
    const rangerCompXpMult = (opts && opts.rangerCompXpMult) || 0;
    let xpGain = bondingActive ? amount * 2 : amount;
    if (rangerCompXpMult > 0) {
        xpGain = Math.ceil(xpGain * (1 + rangerCompXpMult));
    }
    return xpGain;
}

/**
 * Adds `xpGain` to `companion.xp` and walks the `100 * level` level-up threshold in a `while` loop —
 * so a single large XP gain (e.g. a Beastmaster-scaled boss-defeat grant) can carry the companion
 * through more than one level in one call, unlike an `if`. Mutates the handed `companion` object in
 * place (matching `persistence-migrations.js`'s mutate-what-you're-handed convention); both
 * `companion.xp` and `companion.level` default to treating a missing value as the level-1 floor,
 * exactly like the original inline body. PURE aside from that in-place mutation. Returns whether the
 * companion leveled at least once, so the caller knows whether to fire the level-up side effects.
 * @param {{ xp?: number, level?: number }} companion
 * @param {number} xpGain
 * @returns {boolean}
 */
function applyCompanionXp(companion, xpGain) {
    companion.xp = (companion.xp || 0) + xpGain;
    let leveled = false;
    while (companion.xp >= 100 * (companion.level || 1)) {
        companion.xp -= 100 * (companion.level || 1);
        companion.level = (companion.level || 1) + 1;
        leveled = true;
    }
    return leveled;
}

const COMPANION_LOGIC = Object.freeze({
    activeCompanion,
    secondCompanion,
    companionBonus,
    companionXpGain,
    applyCompanionXp,
});


// Node / Jest

export default COMPANION_LOGIC;
