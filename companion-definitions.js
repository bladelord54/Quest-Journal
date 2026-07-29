// @ts-check
'use strict';
/**
 * companion-definitions.js — the companion catalog (Engineering Roadmap #1).
 *
 * Second incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. Keyed by companion id; each entry carries display metadata
 * (name/icon), its rarity tier (which chest tier can drop it), and its passive
 * bonus (bonusType + bonusAmount). rangerExclusive companions are granted only
 * by a class perk and never appear in loot pools.
 *
 * Dual-environment, no bundler (mirrors balance.js / level-titles.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.COMPANION_DEFINITIONS. goal-manager.js captures it into
 *     a module-scoped const and returns it from getCompanionDefinitions(), so
 *     every call site is unchanged.
 *   - Jest/Node: `require('./companion-definitions.js')` returns the object via
 *     module.exports (and also sets window.COMPANION_DEFINITIONS under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — no call site can
     * accidentally mutate the shared companion table at runtime.
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

    const COMPANION_DEFINITIONS = deepFreeze({
        // COMMON - Bronze chest (5% chance)
        cat: {
            name: 'Lucky Cat',
            icon: '🐱',
            rarity: 'common',
            bonusType: 'gold',
            bonusAmount: 0.05,
            description: '+5% Gold from all sources'
        },
        rabbit: {
            name: 'Swift Rabbit',
            icon: '🐰',
            rarity: 'common',
            bonusType: 'xp',
            bonusAmount: 0.05,
            description: '+5% XP from all tasks'
        },

        // UNCOMMON - Silver chest (10% chance)
        owl: {
            name: 'Wise Owl',
            icon: '🦉',
            rarity: 'uncommon',
            bonusType: 'xp',
            bonusAmount: 0.10,
            description: '+10% XP from all tasks'
        },
        fox: {
            name: 'Clever Fox',
            icon: '🦊',
            rarity: 'uncommon',
            bonusType: 'gold',
            bonusAmount: 0.10,
            description: '+10% Gold from all sources'
        },
        turtle: {
            name: 'Ancient Turtle',
            icon: '🐢',
            rarity: 'uncommon',
            bonusType: 'streak_protection',
            bonusAmount: 1,
            description: 'Protects one streak per week from breaking'
        },

        // RARE - Gold chest (20% chance)
        wolf: {
            name: 'Loyal Wolf',
            icon: '🐺',
            rarity: 'rare',
            bonusType: 'attack',
            bonusAmount: 0.15,
            description: '+15% Boss damage'
        },
        eagle: {
            name: 'Golden Eagle',
            icon: '🦅',
            rarity: 'rare',
            bonusType: 'xp',
            bonusAmount: 0.15,
            description: '+15% XP from all tasks'
        },
        bear: {
            name: 'Mighty Bear',
            icon: '🐻',
            rarity: 'rare',
            bonusType: 'attack',
            bonusAmount: 0.20,
            description: '+20% Boss damage'
        },

        // EPIC - Royal chest (30% chance)
        dragon: {
            name: 'Baby Dragon',
            icon: '🐉',
            rarity: 'epic',
            bonusType: 'gold',
            bonusAmount: 0.20,
            description: '+20% Gold from all sources'
        },
        unicorn: {
            name: 'Mystic Unicorn',
            icon: '🦄',
            rarity: 'epic',
            bonusType: 'xp',
            bonusAmount: 0.20,
            description: '+20% XP from all tasks'
        },

        // LEGENDARY - Royal chest (10% chance)
        phoenix: {
            name: 'Phoenix',
            icon: '🔥',
            rarity: 'legendary',
            bonusType: 'streak_protection',
            bonusAmount: 2,
            description: 'Protects TWO streaks per week from breaking'
        },
        lion: {
            name: 'Legendary Lion',
            icon: '🦁',
            rarity: 'legendary',
            bonusType: 'attack',
            bonusAmount: 0.30,
            description: '+30% Boss damage'
        },
        // Ranger-exclusive (v3.1 §3.2): granted only by the Wild Bond perk;
        // absent from every loot pool so it never drops from chests/bosses.
        lynx: {
            name: 'Spirit Lynx',
            icon: '🐆',
            rarity: 'epic',
            bonusType: 'xp',
            bonusAmount: 0.25,
            description: '+25% XP from all tasks (Ranger bond)',
            rangerExclusive: true
        }
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic COMPANION_DEFINITIONS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.COMPANION_DEFINITIONS = COMPANION_DEFINITIONS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = COMPANION_DEFINITIONS;
})();
