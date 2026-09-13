// @ts-check
'use strict';
/**
 * wooden-chest-loot.js — the daily free Wooden Chest loot table + weighted pick (Engineering Roadmap #1).
 *
 * 81st incremental slice of the goal-manager.js God class, and the TWENTY-SIXTH LOGIC extraction. It lifts
 * the SECOND hand-rolled weighted-pick loop in the codebase out of `claimWoodenChest`. The FIRST already
 * lives in `loot-engine.js` (weightedRandomSelect / rollLootTable), so the raison d'être of Roadmap #1 —
 * kill duplicated knowledge before it drifts — applies directly: two hand-maintained cumulative-weight
 * loops that could silently diverge.
 *
 * ── WHY THIS IS NOT LITERALLY loot-engine.js's weightedRandomSelect ────────────────────────────────
 *
 * They are DELIBERATELY different, and the difference is behaviour, not style, so merging them would be a
 * gameplay change rather than a refactor:
 *
 *   1. FALLBACK. When float drift leaves the running roll > 0 after every subtraction, `loot-engine.js`
 *      returns the LAST item (`items[items.length - 1]`), while the wooden-chest loop seeds `reward` with
 *      the FIRST entry (`table[0]`) and only overrides it inside the loop — so on the same drift it returns
 *      the FIRST item. `weightedPick` here preserves the wooden-chest's first-entry seed verbatim.
 *   2. TABLE SHAPE. loot-engine's pools carry `amount: [min, max]` ranges + `name`/`icon` and are turned
 *      into concrete rewards by `buildLootReward`; the wooden table carries FIXED `amount` + a `label` and
 *      the reward IS the rolled entry. No shared reward-builder applies.
 *
 * So this module keeps its OWN pick, and a test pins the divergence from `LOOT_ENGINE.weightedRandomSelect`
 * (the fallback disagreement) so the two are consciously different, not accidentally drifted — the same
 * "pin the disagreement rather than force a merge" call the bounty slice made for its inclusive-vs-exclusive
 * expiry windows.
 *
 * ── PRESERVED VERBATIM ─────────────────────────────────────────────────────────────────────────────
 *
 *   - The 8-entry table and its weights (30/18/22/8/8/5/5/4, total 105) are byte-identical to the inline
 *     literal, so today's drops are unchanged.
 *   - `weightedPick(table, rng)` takes an injected `rng` (a function returning [0,1)), mirroring
 *     `loot-engine.js`'s seam so `this.rng()` still flows through and tests inject a fixed roll.
 *   - The reward object returned IS a table entry (`{ type, amount, weight, label, [spellId] }`); the class
 *     still dispatches it (addGold / addXP / grantAttackCharge / addFocusCrystalShards / addSpellToBook),
 *     plays the cinematic and persists — none of that impurity moves here.
 *
 * Dual-environment, no bundler (mirrors loot-engine.js and the other logic modules):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.WOODEN_CHEST_LOOT. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./wooden-chest-loot.js') returns the frozen object via module.exports.
 */


/**
 * @typedef {Object} WoodenLootEntry
 * @property {string} type - 'gold' | 'xp' | 'charges' | 'shards' | 'spell'
 * @property {number} amount
 * @property {number} weight
 * @property {string} label
 * @property {string} [spellId]
 */

/**
 * The daily free Wooden Chest loot table — weaker than the bronze chest. Frozen so the shared
 * reference can never be mutated at a call site.
 * @type {ReadonlyArray<WoodenLootEntry>}
 */
const TABLE = Object.freeze([
    Object.freeze({ type: 'gold', amount: 15, weight: 30, label: '15 Gold' }),
    Object.freeze({ type: 'gold', amount: 25, weight: 18, label: '25 Gold' }),
    Object.freeze({ type: 'xp', amount: 20, weight: 22, label: '20 XP' }),
    Object.freeze({ type: 'xp', amount: 35, weight: 8, label: '35 XP' }),
    Object.freeze({ type: 'charges', amount: 1, weight: 8, label: '1 Attack Charge' }),
    Object.freeze({ type: 'shards', amount: 5, weight: 5, label: '5 Crystal Shards' }),
    Object.freeze({ type: 'spell', spellId: 'minor_wisdom', amount: 1, weight: 5, label: '📚 Minor Wisdom Spell' }),
    Object.freeze({ type: 'spell', spellId: 'copper_blessing', amount: 1, weight: 4, label: '🪙 Copper Blessing Spell' }),
]);

/**
 * Pick one entry from `table` weighted by `item.weight`, consuming one draw from the injected `rng`.
 * Reproduces the original inline loop EXACTLY, including its first-entry (`table[0]`) fallback for the
 * float-drift edge — see the module header for why that differs from loot-engine.js's last-item fallback.
 * @param {ReadonlyArray<WoodenLootEntry>} table
 * @param {() => number} rng - returns a float in [0,1)
 * @returns {WoodenLootEntry}
 */
function weightedPick(table, rng) {
    const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng() * totalWeight;
    let reward = table[0];
    for (const item of table) {
        roll -= item.weight;
        if (roll <= 0) { reward = item; break; }
    }
    return reward;
}

const WOODEN_CHEST_LOOT = Object.freeze({
    TABLE,
    weightedPick,
});


// Node / Jest

export default WOODEN_CHEST_LOOT;
