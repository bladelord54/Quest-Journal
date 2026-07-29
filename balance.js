// @ts-check
'use strict';
/**
 * balance.js — centralized economy/balance numbers (Engineering Roadmap #6).
 *
 * Single source of truth for loot drop rates, reward ranges, chest/boss rarity
 * weights, and class-tree costs. These previously lived inline at each call
 * site in goal-manager.js, which is exactly how the July 2026 loot bug drifted
 * (two hand-maintained copies of the same table). Keeping them here makes
 * tuning auditable and impossible to duplicate.
 *
 * Dual-environment, no bundler:
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.BALANCE. goal-manager.js captures it into a
 *     module-scoped `BALANCE` const.
 *   - Jest/Node: `require('./balance.js')` returns the object via module.exports
 *     (and also sets window.BALANCE under jsdom).
 */
(function () {
    /**
     * Recursively freeze an object so the balance table is a true constant —
     * no call site can accidentally mutate shared tuning at runtime.
     * @param {any} obj
     * @returns {any}
     */
    function deepFreeze(obj) {
        Object.getOwnPropertyNames(obj).forEach((key) => {
            const value = obj[key];
            if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                deepFreeze(value);
            }
        });
        return Object.freeze(obj);
    }

    const BALANCE = deepFreeze({
        loot: {
            // checkLootDrop() rolls 0-100; these are the cumulative UPPER bounds
            // per rarity (legendary < 1, epic < 5, rare < 15, uncommon < 40,
            // else common) — i.e. 1% / 4% / 10% / 25% / 60%.
            dropRarityThresholds: { legendary: 1, epic: 5, rare: 15, uncommon: 40 },

            // Per-tier rarity weights for chest opens (generateChestRewards).
            chestRarityWeights: {
                bronze: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 },
                silver: { common: 30, uncommon: 35, rare: 25, epic: 8, legendary: 2 },
                gold:   { common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 8 },
                royal:  { common: 5,  uncommon: 15, rare: 30, epic: 30, legendary: 20 },
            },
            // Number of item rolls per chest tier.
            chestItemCounts: { bronze: 1, silver: 2, gold: 3, royal: 4 },

            // Per-cadence rarity weights for boss loot (generateBossLoot).
            bossRarityWeights: {
                daily:   { common: 40, uncommon: 35, rare: 18, epic: 5,  legendary: 2 },
                weekly:  { common: 15, uncommon: 30, rare: 35, epic: 15, legendary: 5 },
                monthly: { common: 5,  uncommon: 15, rare: 30, epic: 30, legendary: 20 },
            },
            // Base item rolls per boss cadence (before Ranger Trophy Hunter's bonus).
            bossItemCounts: { daily: 1, weekly: 2, monthly: 3 },

            // Gold [min,max] substituted when a rarity tier's pool ends up empty
            // (buildAvailableLootPools fallback).
            emptyPoolFallbackGold: {
                common: [25, 75], uncommon: [75, 150], rare: [150, 300],
                epic: [300, 600], legendary: [500, 1000], default: [50, 150],
            },
            // Gold [min,max] paid instead of a companion when one drops but the
            // player is still below the level-3 companion unlock (buildLootReward).
            companionLockedGold: {
                uncommon: [75, 150], rare: [150, 300], epic: [300, 500],
                legendary: [500, 1000], default: [50, 100],
            },
        },

        // Skill-point costs for the class tree (initializeClasses).
        classTree: {
            linearCosts: [2, 3, 4, 5, 6], // linear tiers 1-5
            capstoneCost: 10,             // either capstone
            subTierCosts: [3, 4, 5],      // v3.1 §9 subclass tiers 1-3
        },
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic BALANCE property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.BALANCE = BALANCE;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = BALANCE;
})();
