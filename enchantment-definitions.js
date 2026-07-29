// @ts-check
'use strict';
/**
 * enchantment-definitions.js — the enchantment shop catalog (Roadmap #1).
 *
 * Eighth incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. A keyed object of the 13 purchasable enchantments (temporary,
 * Focus-Crystal-bought buffs), each { id, name, description, icon, cost,
 * `duration` (minutes), `effect`, `premium` }. `purchaseEnchantment()` looks one
 * up by id and spreads its fields into a NEW `activeEnchantments` entry (with a
 * computed `expiresAt`), so this catalog holds NO runtime state — the live
 * buffs are the separate `this.activeEnchantments` array. The `effect` string is
 * what `getEnchantmentMultiplier()` / `hasActiveEnchantment()` match against.
 *
 * Dual-environment, no bundler (mirrors balance.js and the other extracted
 * catalogs):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.ENCHANTMENT_DEFINITIONS. goal-manager.js captures it into
 *     a module-scoped const and returns it from initializeEnchantments(), so
 *     `this.enchantmentDefinitions` and every consumer are unchanged.
 *   - Jest/Node: `require('./enchantment-definitions.js')` returns the object via
 *     module.exports (and also sets window.ENCHANTMENT_DEFINITIONS under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — the definitions
     * are only ever READ (purchaseEnchantment spreads them into fresh active
     * entries), so a frozen source can never be mutated by a shop or render path.
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

    const ENCHANTMENT_DEFINITIONS = deepFreeze({
        double_xp: {
            id: 'double_xp',
            name: 'Enchantment of Swiftness',
            description: '2x XP from all sources for 3 hours',
            icon: '⚡',
            cost: 5,
            duration: 180, // minutes
            effect: 'double_xp',
            premium: true
        },
        double_gold: {
            id: 'double_gold',
            name: 'Enchantment of Fortune',
            description: '2x Gold from all sources for 3 hours',
            icon: '💰',
            cost: 5,
            duration: 180,
            effect: 'double_gold',
            premium: true
        },
        streak_shield: {
            id: 'streak_shield',
            name: 'Enchantment of Resilience',
            description: 'Protects your habit & login streak for 1 missed day',
            icon: '🛡️',
            cost: 8,
            duration: 1440, // 24 hours
            effect: 'streak_shield',
            premium: true
        },
        boss_slayer: {
            id: 'boss_slayer',
            name: 'Enchantment of the Titan',
            description: '+30% damage to boss battles for 2 hours',
            icon: '⚔️',
            cost: 5,
            duration: 120,
            effect: 'boss_damage',
            premium: true
        },
        crystal_finder: {
            id: 'crystal_finder',
            name: 'Enchantment of Discovery',
            description: '+1 bonus Focus Crystal per session for 4 hours',
            icon: '💎',
            cost: 4,
            duration: 240,
            effect: 'bonus_crystal',
            premium: false
        },
        time_warden: {
            id: 'time_warden',
            name: 'Enchantment of the Time Warden',
            description: 'Focus sessions are 35 min and grant +1 bonus crystal for 2 hours',
            icon: '⏳',
            cost: 2,
            duration: 120,
            effect: 'extended_focus',
            premium: false
        },
        lucky_loot: {
            id: 'lucky_loot',
            name: 'Enchantment of Luck',
            description: '+15% rare loot & companion chance from chests for 2 hours',
            icon: '🍀',
            cost: 3,
            duration: 120,
            effect: 'lucky_loot',
            premium: false
        },
        serenity: {
            id: 'serenity',
            name: 'Enchantment of Serenity',
            description: '30% chance to earn a bonus Focus Crystal on task completion for 3 hours',
            icon: '🧘',
            cost: 3,
            duration: 180,
            effect: 'crystal_chance',
            premium: false
        },
        bonding: {
            id: 'bonding',
            name: 'Enchantment of Bonding',
            description: '2x companion XP gain for 3 hours',
            icon: '🐾',
            cost: 5,
            duration: 180,
            effect: 'companion_bond',
            premium: true
        },
        momentum: {
            id: 'momentum',
            name: 'Enchantment of Momentum',
            description: '+5 bonus XP per consecutive task (stacks up to +25) for 3 hours',
            icon: '⚡',
            cost: 5,
            duration: 180,
            effect: 'momentum',
            premium: true
        },
        early_bird: {
            id: 'early_bird',
            name: 'Enchantment of the Early Bird',
            // v2.9.x balance audit: was 4 crystals / first 3 tasks — a
            // max of +90 bonus XP, the worst crystal-per-XP rate in the
            // shop. Now 2 crystals / first 5 tasks (+150 XP max).
            description: 'First 5 tasks of the day give 3x XP for 24 hours',
            icon: '🌅',
            cost: 2,
            duration: 1440,
            effect: 'early_bird',
            premium: true
        },
        precision: {
            id: 'precision',
            name: 'Enchantment of Precision',
            description: 'Habit completions count as double streak progress for 12 hours',
            icon: '🎯',
            cost: 7,
            duration: 720,
            effect: 'double_streak',
            premium: true
        },
        battle_fury: {
            id: 'battle_fury',
            name: 'Enchantment of Battle Fury',
            description: 'Earn +1 bonus attack charge per charge gained for 2 hours',
            icon: '🗡️',
            cost: 5,
            duration: 120,
            effect: 'bonus_charges',
            premium: true
        }
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic ENCHANTMENT_DEFINITIONS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.ENCHANTMENT_DEFINITIONS = ENCHANTMENT_DEFINITIONS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = ENCHANTMENT_DEFINITIONS;
})();
