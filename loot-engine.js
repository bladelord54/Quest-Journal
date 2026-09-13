// @ts-check
'use strict';
import FEATURE_UNLOCKS from './feature-unlocks.js';
/**
 * loot-engine.js — the pure loot-roll engine (Engineering Roadmap #1).
 *
 * Eleventh incremental slice of the goal-manager.js God class, and the FIRST that
 * extracts LOGIC rather than a data catalog. Three pure, stateless functions that
 * together form the loot-rolling core shared by chest opens and boss defeats:
 *
 *   - weightedRandomSelect(items, rng) — pick one entry weighted by `item.weight`,
 *     using an injected `rng()` (a function returning [0,1)) so draws are testable.
 *   - buildLootReward(item, rarity, ctx) — turn a rolled pool entry into a concrete
 *     reward object. `ctx = { rng, level, companionLockedGold }` supplies the only
 *     instance-dependent inputs (the RNG seam, the player level for the companion
 *     unlock gate, and the balance-sourced locked-companion gold table). The gate's
 *     THRESHOLD comes from feature-unlocks.js (85th slice) — it used to be a bare `3`
 *     here and in two goal-manager.js sites.
 *   - rollLootTable(ctx) — the shared roll loop. `ctx = { rarityWeights,
 *     availablePools, itemCount, weightedRandomSelect, buildLootReward }`. This loop
 *     used to be hand-duplicated in generateChestRewards() AND generateBossLoot();
 *     centralising it here removes that drift risk (the raison d'être of Roadmap #1).
 *
 * SEAM NOTE: rollLootTable takes `weightedRandomSelect` and `buildLootReward` as
 * INJECTED functions rather than calling the module's own copies. goal-manager.js
 * passes its instance methods (`(items) => this.weightedRandomSelect(items)` etc.),
 * so (a) the RNG seam still flows through `this.rng()` and (b) tests that spy on
 * `gm.weightedRandomSelect` still observe every draw. The engine holds NO state.
 *
 * Dual-environment, no bundler (mirrors balance.js and the extracted catalogs):
 *   - Browser: loaded as a plain <script> AFTER feature-unlocks.js and BEFORE
 *     goal-manager.js in index.html; attaches to window.LOOT_ENGINE. goal-manager.js
 *     captures it into a module-scoped const and delegates from the loot methods.
 *   - Jest/Node: `require('./loot-engine.js')` returns the object via module.exports
 *     (and also sets window.LOOT_ENGINE under jsdom).
 */

const COMPANION_UNLOCK_LEVEL = FEATURE_UNLOCKS.COMPANION_UNLOCK_LEVEL;

/**
 * Pick one entry from `items` weighted by its `weight`, consuming one draw from
 * the injected `rng`. Mirrors the original goal-manager.js implementation exactly
 * (including the "return the last item" fallback for float drift).
 * @param {Array<{weight:number}&Record<string,any>>} items
 * @param {() => number} rng - returns a float in [0,1)
 * @returns {any}
 */
function weightedRandomSelect(items, rng) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = rng() * totalWeight;
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) {
            return item;
        }
    }
    return items[items.length - 1];
}

/**
 * Turn a rolled loot-pool entry into a concrete reward object.
 * @param {any} item - a pool entry, e.g. { type:'gold', amount:[min,max], name, icon }
 * @param {string} rarity - the tier this item was rolled from
 * @param {{ rng: () => number, level: number, companionLockedGold: Record<string, number[]> }} ctx
 * @returns {any|null} the reward object, or null for an unrecognised type
 */
function buildLootReward(item, rarity, ctx) {
    const { rng, level, companionLockedGold } = ctx;
    if (item.type === 'gold') {
        const [min, max] = item.amount;
        const amount = Math.floor(rng() * (max - min + 1)) + min;
        return { type: 'gold', amount, rarity, name: item.name, icon: item.icon };
    }
    if (item.type === 'xp') {
        const [min, max] = item.amount;
        const amount = Math.floor(rng() * (max - min + 1)) + min;
        return { type: 'xp', amount, rarity, name: item.name, icon: item.icon };
    }
    if (item.type === 'charges') {
        return { type: 'charges', amount: item.amount, rarity, name: item.name, icon: item.icon };
    }
    if (item.type === 'shards') {
        const [min, max] = item.amount;
        const amount = Math.floor(rng() * (max - min + 1)) + min;
        return { type: 'shards', amount, rarity, name: item.name, icon: item.icon };
    }
    if (item.type === 'spell') {
        return { type: 'spell', spellId: item.spellId, charges: item.charges, rarity };
    }
    if (item.type === 'theme') {
        return { type: 'theme', value: 'random', rarity };
    }
    if (item.type === 'companion') {
        if (level < COMPANION_UNLOCK_LEVEL) {
            // Companions locked before their unlock level - give gold instead
            const [min, max] = companionLockedGold[rarity] || companionLockedGold.default;
            const amount = Math.floor(rng() * (max - min + 1)) + min;
            return { type: 'gold', amount, rarity, name: 'Gold (Companion Locked)', icon: '💰' };
        }
        const companionId = item.companions[Math.floor(rng() * item.companions.length)];
        return { type: 'companion', value: companionId, rarity };
    }
    return null;
}

/**
 * The shared loot roll loop for chests and bosses. For each of `itemCount` rolls:
 * pick a rarity from `rarityWeights`, pick an item from that rarity's pool, and
 * build a reward. Selection + reward-building are INJECTED (see the SEAM NOTE) so
 * the RNG seam and spy-based tests keep flowing through the manager instance.
 * @param {{
 *   rarityWeights: Record<string, number>,
 *   availablePools: Record<string, any[]>,
 *   itemCount: number,
 *   weightedRandomSelect: (items: any[]) => any,
 *   buildLootReward: (item: any, rarity: string) => any
 * }} ctx
 * @returns {any[]} the rolled rewards (nulls from buildLootReward are skipped)
 */
function rollLootTable(ctx) {
    const { rarityWeights, availablePools, itemCount } = ctx;
    const select = ctx.weightedRandomSelect;
    const makeReward = ctx.buildLootReward;
    const rewards = [];
    const rarityEntries = Object.entries(rarityWeights).map(([rarity, weight]) => ({ rarity, weight }));
    for (let i = 0; i < itemCount; i++) {
        const rolledRarity = select(rarityEntries).rarity;
        const pool = availablePools[rolledRarity];
        const item = select(pool);
        const reward = makeReward(item, rolledRarity);
        if (reward) rewards.push(reward);
    }
    return rewards;
}

const LOOT_ENGINE = Object.freeze({ weightedRandomSelect, buildLootReward, rollLootTable });


// Node / Jest

export default LOOT_ENGINE;
