// @ts-check
'use strict';
/**
 * class-perks.js — pure class/subclass perk-value resolution (Engineering Roadmap #1).
 *
 * 61st incremental slice of the goal-manager.js God class, and the NINTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic
 * / buff-multipliers / companion-logic pattern). This is the SHARED UPSTREAM the two prior buff slices
 * lean on: buff-multipliers.js's spell-power scaling reads getClassPerkValue('spell_power_mult'), and
 * companion-logic.js's Twin Bond gate reads getClassPerkValue('second_companion'). It locks the
 * drift-prone "what does the player's current class progression grant for effect X" math into three PURE
 * functions the God-class methods delegate to:
 *
 *   - classPerkValue(effect, cls, classNodesUnlocked, capstone, subValue) — the authoritative resolver.
 *     Scans the UNLOCKED linear nodes for the first matching `effect` (each effect appears at most once
 *     per class, so first match wins); if none, falls back to the chosen capstone; then folds in the
 *     subclass value taking the HIGHEST (v3.1 §9.5 — base + subclass effect ids are distinct, so this is
 *     a zero-behavior-change merge for existing perks). Returns 0 when there is no class.
 *   - subclassPerkValue(effect, sub, subclassNodesUnlocked) — the chosen subclass's value at the player's
 *     current tier, or 0 (no subclass / effect isn't its signature / no tiers unlocked). Tiers are
 *     strictly escalating REPLACEMENTS, so it returns the highest unlocked tier's value.
 *   - chosenCapstone(cls, classCapstone) — the capstone node object matching the chosen id, or null.
 *
 * The IMPURE inputs stay on the class: the delegators resolve this.getActiveClass() /
 * this.getActiveSubclass() (thin classDefinitions[...] reads) + the this.classNodesUnlocked /
 * this.subclassNodesUnlocked / this.classCapstone instance state, then pass plain values in. Every
 * function is a byte-faithful lift of the inline body it replaces (the existing "Class System v3.1 —
 * Phase 1 / Phase 2 perks" class tests still drive the real delegators unchanged; the three module
 * functions are additionally locked by new isolation tests).
 *
 * Dual-environment, no bundler (mirrors companion-logic.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.CLASS_PERKS. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./class-perks.js') returns the frozen object via module.exports (and also sets
 *     window.CLASS_PERKS under jsdom).
 */

/**
 * @typedef {{ effect?: string, value?: number, id?: string }} PerkNode
 * @typedef {{ nodes?: PerkNode[], capstones?: PerkNode[] }} ClassDef
 * @typedef {{ effect?: string, tiers?: Array<{ value?: number }> }} SubclassDef
 */

/**
 * The effect value for a perk at the player's current progression: unlocked linear nodes first, then
 * the chosen capstone, then the highest of that and the subclass value. 0 when no class. PURE.
 * @param {string} effect
 * @param {ClassDef|null} cls
 * @param {number} classNodesUnlocked
 * @param {PerkNode|null} capstone
 * @param {number} subValue  already-resolved subclass value for this effect
 * @returns {number}
 */
function classPerkValue(effect, cls, classNodesUnlocked, capstone, subValue) {
    if (!cls) return 0;
    let value = 0;
    const nodes = cls.nodes || [];
    const n = Math.min(classNodesUnlocked || 0, nodes.length);
    for (let i = 0; i < n; i++) {
        if (nodes[i].effect === effect) { value = nodes[i].value || 0; break; }
    }
    if (value === 0) {
        if (capstone && capstone.effect === effect) value = capstone.value || 0;
    }
    const sub = subValue || 0;
    return sub > value ? sub : value;
}

/**
 * The chosen subclass's value at the current tier, or 0 when no subclass, the effect isn't the
 * subclass's signature, or no tiers are unlocked. Returns the HIGHEST unlocked tier's value. PURE.
 * @param {string} effect
 * @param {SubclassDef|null} sub
 * @param {number} subclassNodesUnlocked
 * @returns {number}
 */
function subclassPerkValue(effect, sub, subclassNodesUnlocked) {
    if (!sub || sub.effect !== effect) return 0;
    const tiers = sub.tiers || [];
    const n = Math.min(subclassNodesUnlocked || 0, tiers.length);
    if (n <= 0) return 0;
    return tiers[n - 1].value || 0;
}

/**
 * The chosen capstone node object (matching classCapstone by id), or null when no class, no capstone
 * chosen, the class has no capstones, or the id isn't found. PURE.
 * @param {ClassDef|null} cls
 * @param {string|null|undefined} classCapstone
 * @returns {PerkNode|null}
 */
function chosenCapstone(cls, classCapstone) {
    if (!cls || !classCapstone || !cls.capstones) return null;
    return cls.capstones.find(c => c.id === classCapstone) || null;
}

const CLASS_PERKS = Object.freeze({
    classPerkValue,
    subclassPerkValue,
    chosenCapstone,
});


// Node / Jest

export default CLASS_PERKS;
