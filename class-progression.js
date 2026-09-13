// @ts-check
'use strict';
/**
 * class-progression.js — pure class/subclass tree PROGRESSION-STATE predicates (Engineering Roadmap #1).
 *
 * 62nd incremental slice of the goal-manager.js God class, and the TENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic
 * / buff-multipliers / companion-logic / class-perks pattern). It is the direct SIBLING of the prior slice:
 * where class-perks.js answers "what VALUE does the player's progression grant for effect X", this answers
 * "WHERE is the player in the tree" — the node/tier counts, the next unlockable node/tier, and the
 * capstone-ready / mastered predicates that gate the class-up UI and the respec refund math.
 *
 * A symmetric set of PURE functions, four for the base class tree and four for the subclass tree, that the
 * God-class methods delegate to:
 *
 *   Class tree
 *     - linearNodeCount(cls) — number of linear nodes (0 when no class / no nodes).
 *     - nextClassNode(cls, classNodesUnlocked) — the next not-yet-unlocked linear node, or null when all
 *       are unlocked (capstone now available) / no class.
 *     - isCapstoneReady(cls, classNodesUnlocked, classCapstone) — every linear node unlocked BUT no capstone
 *       chosen yet (the capstone choice is now offered).
 *     - isClassMastered(cls, classNodesUnlocked, classCapstone) — every linear node unlocked AND a capstone
 *       chosen.
 *
 *   Subclass tree (mirror)
 *     - subclassTierCount(sub) — number of tiers (0 when no subclass / no tiers).
 *     - nextSubclassTier(sub, subclassNodesUnlocked) — the next not-yet-unlocked tier, or null.
 *     - isSubclassMastered(sub, subclassNodesUnlocked) — every tier unlocked.
 *     - subclassPointsSpent(sub, subclassNodesUnlocked) — skill points already sunk into the UNLOCKED tiers
 *       (their cumulative `cost`), used to refund precisely on a subclass-only respec.
 *
 * The IMPURE inputs stay on the class: the delegators resolve this.getActiveClass() / this.getActiveSubclass()
 * (thin classDefinitions[...] / subclass-map reads) + the this.classNodesUnlocked / this.subclassNodesUnlocked
 * / this.classCapstone instance state, then pass plain values in. Every function is a byte-faithful lift of
 * the inline body it replaces (the existing "Class System v3.1 — Phase 1 / Phase 2 perks" + subclass class
 * tests still drive the real delegators unchanged; the eight module functions are additionally locked by new
 * isolation tests).
 *
 * Dual-environment, no bundler (mirrors class-perks.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.CLASS_PROGRESSION. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./class-progression.js') returns the frozen object via module.exports (and also
 *     sets window.CLASS_PROGRESSION under jsdom).
 */

/**
 * @typedef {{ nodes?: Array<any> }} ClassDef
 * @typedef {{ tiers?: Array<{ cost?: number }> }} SubclassDef
 */

// ----------------------------------------------------------------- class tree

/**
 * Number of linear nodes in a class tree, or 0 when there is no class / no nodes. PURE.
 * @param {ClassDef|null} cls
 * @returns {number}
 */
function linearNodeCount(cls) {
    return (cls && cls.nodes) ? cls.nodes.length : 0;
}

/**
 * The next not-yet-unlocked linear node, or null when all are unlocked / no class. PURE.
 * @param {ClassDef|null} cls
 * @param {number} classNodesUnlocked
 * @returns {any}
 */
function nextClassNode(cls, classNodesUnlocked) {
    if (!cls) return null;
    return (cls.nodes || [])[classNodesUnlocked || 0] || null;
}

/**
 * True once every linear node is unlocked but no capstone is chosen yet — the capstone choice is now
 * available. PURE.
 * @param {ClassDef|null} cls
 * @param {number} classNodesUnlocked
 * @param {string|null|undefined} classCapstone
 * @returns {boolean}
 */
function isCapstoneReady(cls, classNodesUnlocked, classCapstone) {
    if (!cls) return false;
    return (classNodesUnlocked || 0) >= linearNodeCount(cls) && !classCapstone;
}

/**
 * True once every linear node is unlocked AND a capstone is chosen (fully mastered). PURE.
 * @param {ClassDef|null} cls
 * @param {number} classNodesUnlocked
 * @param {string|null|undefined} classCapstone
 * @returns {boolean}
 */
function isClassMastered(cls, classNodesUnlocked, classCapstone) {
    if (!cls) return false;
    return (classNodesUnlocked || 0) >= linearNodeCount(cls) && !!classCapstone;
}

// -------------------------------------------------------------- subclass tree

/**
 * Number of tiers in a subclass, or 0 when there is no subclass / no tiers. PURE.
 * @param {SubclassDef|null} sub
 * @returns {number}
 */
function subclassTierCount(sub) {
    return (sub && sub.tiers) ? sub.tiers.length : 0;
}

/**
 * The next not-yet-unlocked subclass tier, or null when all are unlocked / no subclass. PURE.
 * @param {SubclassDef|null} sub
 * @param {number} subclassNodesUnlocked
 * @returns {any}
 */
function nextSubclassTier(sub, subclassNodesUnlocked) {
    if (!sub) return null;
    return (sub.tiers || [])[subclassNodesUnlocked || 0] || null;
}

/**
 * True once every tier of the chosen subclass is unlocked. PURE.
 * @param {SubclassDef|null} sub
 * @param {number} subclassNodesUnlocked
 * @returns {boolean}
 */
function isSubclassMastered(sub, subclassNodesUnlocked) {
    if (!sub) return false;
    return (subclassNodesUnlocked || 0) >= subclassTierCount(sub);
}

/**
 * Skill points already sunk into the chosen subclass's UNLOCKED tiers — the cumulative `cost` of tiers
 * [0, subclassNodesUnlocked). 0 when no subclass. PURE.
 * @param {SubclassDef|null} sub
 * @param {number} subclassNodesUnlocked
 * @returns {number}
 */
function subclassPointsSpent(sub, subclassNodesUnlocked) {
    if (!sub) return 0;
    const tiers = sub.tiers || [];
    const n = Math.min(subclassNodesUnlocked || 0, tiers.length);
    let spent = 0;
    for (let i = 0; i < n; i++) spent += tiers[i].cost || 0;
    return spent;
}

const CLASS_PROGRESSION = Object.freeze({
    linearNodeCount,
    nextClassNode,
    isCapstoneReady,
    isClassMastered,
    subclassTierCount,
    nextSubclassTier,
    isSubclassMastered,
    subclassPointsSpent,
});


// Node / Jest

export default CLASS_PROGRESSION;
