// @ts-check
'use strict';
/**
 * level-titles.js — the player level-title chain (Engineering Roadmap #1).
 *
 * First incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog extracted verbatim into its own module. Indexed by level
 * (1-based; level 1 maps to titles[0], level >= titles.length maps to the last
 * entry, i.e. 'Paragon'). The masculine and feminine chains are the same length
 * so every level has a gendered counterpart entry.
 *
 * v2.9.x balance audit: extended from 10 to 50 entries. Long-term users sat at
 * 'Legend' forever once they crossed level 10 (reachable in ~2 months of active
 * play), removing a key progression hook. Levels 11-50 continue through heroic,
 * mythic, and celestial tiers; level 50+ clamps at 'Paragon'. Entries 2-10 are
 * unchanged; entry 1 was renamed 'Peasant' -> 'Wanderer' (L1 onboarding fix),
 * which retitles existing level-1 users on update (called out in the changelog).
 *
 * Dual-environment, no bundler (mirrors balance.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.LEVEL_TITLES. goal-manager.js captures it into a
 *     module-scoped `LEVEL_TITLE_CHAINS` const and assigns it to the
 *     `this.LEVEL_TITLES` instance field so every call site is unchanged.
 *   - Jest/Node: `require('./level-titles.js')` returns the object via
 *     module.exports (and also sets window.LEVEL_TITLES under jsdom).
 */

/**
 * Recursively freeze the catalog so it is a true constant — no call site
 * (or test) can accidentally mutate the shared title chains at runtime.
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

const LEVEL_TITLES = deepFreeze({
    masculine: [
        'Wanderer', 'Squire', 'Knight', 'Baron',    'Earl',     'Duke',    'Prince',   'King',  'Emperor', 'Legend',
        'Hero',        'Champion',  'Vanquisher', 'Warlord',     'Conqueror',
        'Highlord',    'Archon',    'Sovereign',  'Overlord',    'Mythic',
        'Titan',       'Colossus',  'Juggernaut', 'Dragonheart', 'Dragonlord',
        'Stormcaller', 'Stormlord', 'Worldwalker','Realmshaper', 'Demigod',
        'Starborn',    'Starforger','Moonsage',   'Sunblade',    'Lightbringer',
        'Voidwalker',  'Fatebinder','Timekeeper', 'Oracle',      'Ascendant',
        'Celestial',   'Seraph',    'Archangel',  'Worldforger', 'Godslayer',
        'Immortal',    'Eternal',   'Transcendent','Infinite',   'Paragon'
    ],
    feminine: [
        'Wanderer', 'Squire', 'Dame',   'Baroness', 'Countess', 'Duchess', 'Princess', 'Queen', 'Empress', 'Legend',
        'Heroine',     'Champion',  'Vanquisher', 'Warlady',     'Conqueror',
        'Highlady',    'Archon',    'Sovereign',  'Overlady',    'Mythic',
        'Titaness',    'Colossus',  'Juggernaut', 'Dragonheart', 'Dragonqueen',
        'Stormcaller', 'Stormqueen','Worldwalker','Realmshaper', 'Demigoddess',
        'Starborn',    'Starforger','Moonsage',   'Sunblade',    'Lightbringer',
        'Voidwalker',  'Fatebinder','Timekeeper', 'Oracle',      'Ascendant',
        'Celestial',   'Seraph',    'Archangel',  'Worldforger', 'Godslayer',
        'Immortal',    'Eternal',   'Transcendent','Infinite',   'Paragon'
    ]
});


// Node / Jest

export default LEVEL_TITLES;
