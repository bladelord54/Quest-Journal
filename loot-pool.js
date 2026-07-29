// @ts-check
'use strict';
/**
 * loot-pool.js — the master loot pool catalog (Engineering Roadmap #1).
 *
 * Twelfth incremental slice of the goal-manager.js God class, and the one that
 * finishes the loot area (paired with the loot-engine.js LOGIC slice). A pure,
 * read-only DATA catalog: the base loot table keyed by the five rarity tiers
 * (`common`, `uncommon`, `rare`, `epic`, `legendary`). Each entry is a pool item —
 * `{ type, weight, ... }` — where `type` is one of gold / xp / charges / shards /
 * spell / theme / companion, and the extra fields depend on the type (e.g. gold/xp/
 * shards carry an `amount:[min,max]`, spell carries `spellId` + `charges`, companion
 * carries a `companions` list). `weight` drives the weighted pick in the loot engine.
 *
 * This is the exact catalog behind the July 2026 loot drift bug: two hand-maintained
 * copies of the spell list had drifted, hiding scholars_charm / merchants_fortune
 * from chests. It now lives in ONE frozen place, and a jest data-integrity test
 * cross-checks every spell entry against spell-definitions.js so a bad/removed
 * spellId can never silently vanish from loot again.
 *
 * WIZARD-EXCLUSIVE spells are deliberately NOT here — they reach high-tier chests/
 * bosses only via getWizardLootEntries(), gated on playerClass. The master pool is
 * the shared, class-agnostic base; buildAvailableLootPools() spreads/filters it (it
 * never mutates), so sharing one frozen instance is behaviour-identical.
 *
 * Dual-environment, no bundler (mirrors balance.js and the other catalogs):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.MASTER_LOOT_POOL. goal-manager.js captures it into a
 *     module-scoped const and returns it from getMasterLootPool(), so
 *     buildAvailableLootPools() and every downstream path are unchanged.
 *   - Jest/Node: `require('./loot-pool.js')` returns the object via module.exports
 *     (and also sets window.MASTER_LOOT_POOL under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — no loot path can
     * accidentally mutate a shared entry (or splice a tier) at runtime.
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

    const MASTER_LOOT_POOL = deepFreeze({
        common: [
            { type: 'gold', amount: [50, 100], weight: 22, name: 'Small Gold Pouch', icon: '💰' },
            { type: 'gold', amount: [100, 175], weight: 15, name: 'Gold Pouch', icon: '💰' },
            { type: 'xp', amount: [15, 30], weight: 18, name: 'Minor XP Scroll', icon: '📜' },
            { type: 'xp', amount: [5, 15], weight: 12, name: 'Tiny XP Scroll', icon: '📜' },
            { type: 'charges', amount: 1, weight: 10, name: 'Attack Charge', icon: '⚔️' },
            { type: 'shards', amount: [5, 8], weight: 15, name: 'Focus Crystal Shards', icon: '🔮' },
            { type: 'spell', spellId: 'minor_wisdom', charges: 1, weight: 15 },
            { type: 'spell', spellId: 'copper_blessing', charges: 1, weight: 10 },
        ],
        uncommon: [
            { type: 'gold', amount: [150, 300], weight: 18, name: 'Large Gold Pouch', icon: '💰' },
            { type: 'xp', amount: [50, 100], weight: 15, name: 'Greater XP Scroll', icon: '📜' },
            { type: 'charges', amount: 1, weight: 15, name: 'Attack Charge', icon: '⚔️' },
            { type: 'spell', spellId: 'lucky_draw', charges: 1, weight: 14 },
            { type: 'spell', spellId: 'focus_mode', charges: 1, weight: 12 },
            { type: 'spell', spellId: 'instant_archive', charges: 1, weight: 10 },
            { type: 'spell', spellId: 'quest_doubler', charges: 1, weight: 10 },
            { type: 'spell', spellId: 'scholars_charm', charges: 1, weight: 10 },
            { type: 'spell', spellId: 'merchants_fortune', charges: 1, weight: 10 },
            { type: 'spell', spellId: 'silver_blessing', charges: 1, weight: 8 },
            { type: 'companion', companions: ['cat', 'rabbit'], weight: 8 },
        ],
        rare: [
            { type: 'gold', amount: [300, 550], weight: 12, name: 'Grand Gold Pouch', icon: '💰' },
            { type: 'xp', amount: [100, 200], weight: 10, name: 'Epic XP Scroll', icon: '📜' },
            { type: 'charges', amount: 2, weight: 10, name: 'Attack Charges x2', icon: '⚔️' },
            { type: 'spell', spellId: 'arcane_surge', charges: 2, weight: 15 },
            { type: 'spell', spellId: 'golden_touch', charges: 1, weight: 12 },
            { type: 'spell', spellId: 'gold_blessing', charges: 1, weight: 12 },
            { type: 'spell', spellId: 'inferno_focus', charges: 1, weight: 12 },
            { type: 'spell', spellId: 'critical_strike', charges: 1, weight: 10 },
            { type: 'theme', weight: 10 },
            { type: 'companion', companions: ['owl', 'fox', 'turtle'], weight: 9 },
        ],
        epic: [
            { type: 'spell', spellId: 'berserker_rage', charges: 1, weight: 20 },
            { type: 'spell', spellId: 'streak_shield', charges: 1, weight: 15 },
            { type: 'spell', spellId: 'boss_slayer', charges: 1, weight: 15 },
            { type: 'spell', spellId: 'execute', charges: 1, weight: 10 },
            { type: 'companion', companions: ['wolf', 'eagle', 'bear', 'unicorn'], weight: 18 },
            { type: 'gold', amount: [500, 900], weight: 10, name: 'Epic Gold Hoard', icon: '💰' },
            { type: 'charges', amount: 3, weight: 7, name: 'Battle Charges x3', icon: '⚔️' },
            { type: 'theme', weight: 5 },
        ],
        legendary: [
            { type: 'spell', spellId: 'moonlight_blessing', charges: 2, weight: 22 },
            { type: 'spell', spellId: 'double_xp_weekend', charges: 1, weight: 18 },
            { type: 'spell', spellId: 'time_freeze', charges: 2, weight: 18 },
            { type: 'companion', companions: ['dragon', 'phoenix', 'lion'], weight: 17 },
            { type: 'gold', amount: [800, 1500], weight: 12, name: 'Legendary Treasure', icon: '👑' },
            { type: 'charges', amount: 5, weight: 8, name: 'War Chest x5', icon: '⚔️' },
            { type: 'theme', weight: 5 },
        ],
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic MASTER_LOOT_POOL property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.MASTER_LOOT_POOL = MASTER_LOOT_POOL;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = MASTER_LOOT_POOL;
})();
