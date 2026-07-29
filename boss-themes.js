// @ts-check
'use strict';
/**
 * boss-themes.js — the boss theme catalog (Engineering Roadmap #1).
 *
 * Sixth incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. A keyed object with three theme pools — `daily`, `weekly`,
 * `monthly` — that the boss GENERATORS (generateDailyBoss / generateWeeklyBoss /
 * generateMonthlyBoss, which stay in goal-manager.js) draw from. Each theme is
 * `{ name, icon, flavor, particleType }`; the generators pick one by a
 * date-seeded index and spread its fields onto the live boss instance, then
 * scale HP by the player's level. This catalog holds NO runtime state — the
 * generated `dailyBoss` / `weeklyBoss` / `monthlyBoss` objects live on the
 * manager and are persisted separately.
 *
 * `particleType` (v2.9 Track 5) drives the defeat-dissolve particle palette
 * (effectsManager.bossDefeatDissolve). Five palettes:
 *   - shadow — dark purple wisps (default for spectral/evil bosses)
 *   - ember  — orange/red sparks (fire/demonic/draconic)
 *   - slime  — green goo (slimes, serpents, sea creatures)
 *   - leaf   — yellow-green nature (fungal, plant, scarecrow)
 *   - arcane — bright purple runes (undead, void, ghost, magic)
 * Existing saved boss objects (pre-v2.9) lack the field; the runtime helper
 * getBossParticleType() falls back to a name lookup against these themes, so no
 * save migration is needed.
 *
 * Dual-environment, no bundler (mirrors balance.js / level-titles.js /
 * companion-definitions.js / spell-definitions.js / theme-definitions.js /
 * achievement-definitions.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.BOSS_THEMES. goal-manager.js captures it into a
 *     module-scoped const and returns it from initializeBossThemes(), so
 *     `this.bossThemes` and every consumer are unchanged.
 *   - Jest/Node: `require('./boss-themes.js')` returns the object via
 *     module.exports (and also sets window.BOSS_THEMES under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — no generator or
     * render path can accidentally mutate a shared theme (or splice a pool) at runtime.
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

    const BOSS_THEMES = deepFreeze({
        daily: [
            { name: 'Slime of Procrastination', icon: '🟢', flavor: 'A gelatinous blob that feeds on delayed tasks.', particleType: 'slime' },
            { name: 'Goblin of Distraction', icon: '👺', flavor: 'Sneaky creature that steals your focus.', particleType: 'shadow' },
            { name: 'Imp of Laziness', icon: '😈', flavor: 'Whispers sweet nothings about staying in bed.', particleType: 'ember' },
            { name: 'Shadow of Doubt', icon: '👤', flavor: 'A dark figure that questions your every move.', particleType: 'shadow' },
            { name: 'Skeleton of Bad Habits', icon: '💀', flavor: 'Rattles with the chains of old patterns.', particleType: 'arcane' },
            { name: 'Bat of Anxiety', icon: '🦇', flavor: 'Swoops in when you least expect it.', particleType: 'shadow' },
            { name: 'Spider of Overwhelm', icon: '🕷️', flavor: 'Spins webs of endless to-do lists.', particleType: 'shadow' },
            { name: 'Rat of Excuses', icon: '🐀', flavor: 'Gnaws away at your good intentions.', particleType: 'shadow' },
            { name: 'Ghost of Yesterday', icon: '👻', flavor: 'Haunts you with missed opportunities.', particleType: 'arcane' },
            { name: 'Mushroom of Confusion', icon: '🍄', flavor: 'Clouds your mind with indecision.', particleType: 'leaf' },
            { name: 'Snake of Temptation', icon: '🐍', flavor: 'Lures you toward quick dopamine hits.', particleType: 'slime' },
            { name: 'Scarecrow of Fear', icon: '🎃', flavor: 'Guards the field of your ambitions.', particleType: 'leaf' },
            { name: 'Troll of Negativity', icon: '🧌', flavor: 'Blocks the bridge to your goals.', particleType: 'shadow' },
            { name: 'Wisp of Forgetfulness', icon: '🔮', flavor: 'Makes important tasks vanish from memory.', particleType: 'arcane' }
        ],
        weekly: [
            { name: 'Dragon of Distraction', icon: '🐉', flavor: 'Ancient beast that hoards your wasted hours.', particleType: 'ember' },
            { name: 'Lich of Procrastination', icon: '☠️', flavor: 'Undying lord of "I\'ll do it tomorrow."', particleType: 'arcane' },
            { name: 'Hydra of Overthinking', icon: '🐲', flavor: 'Cut one worry, two more take its place.', particleType: 'slime' },
            { name: 'Demon of Self-Doubt', icon: '👿', flavor: 'Feeds on your insecurities to grow stronger.', particleType: 'ember' },
            { name: 'Titan of Burnout', icon: '👹', flavor: 'Massive creature born from overwork.', particleType: 'ember' },
            { name: 'Kraken of Chaos', icon: '🦑', flavor: 'Tentacles of disorder wrap around your plans.', particleType: 'slime' },
            { name: 'Cerberus of Temptation', icon: '🐕', flavor: 'Three heads: social media, games, and snacks.', particleType: 'shadow' },
            { name: 'Golem of Stagnation', icon: '🗿', flavor: 'An immovable wall blocking your progress.', particleType: 'shadow' },
            { name: 'Wyvern of Wasted Time', icon: '🦅', flavor: 'Soars away with your precious hours.', particleType: 'ember' },
            { name: 'Necromancer of Old Habits', icon: '🧙', flavor: 'Keeps resurrecting the patterns you buried.', particleType: 'arcane' }
        ],
        monthly: [
            { name: 'The Obsidian Warden', icon: '🏴', flavor: 'An ancient guardian forged from pure resistance to change.', particleType: 'shadow' },
            { name: 'Archmage of the Void', icon: '🌑', flavor: 'Master of nothingness who erases your motivation.', particleType: 'arcane' },
            { name: 'Behemoth of Despair', icon: '🦣', flavor: 'A colossal beast whose footsteps shake your resolve.', particleType: 'shadow' },
            { name: 'The Crimson Overlord', icon: '👑', flavor: 'Tyrannical ruler who demands your surrender to mediocrity.', particleType: 'ember' },
            { name: 'Leviathan of Lost Days', icon: '🐋', flavor: 'Swallows entire weeks into its endless abyss.', particleType: 'slime' },
            { name: 'The Phantom Emperor', icon: '👁️', flavor: 'Rules an invisible empire built on your abandoned dreams.', particleType: 'arcane' },
            { name: 'Colossus of Complacency', icon: '🗽', flavor: 'A towering monument to "good enough" thinking.', particleType: 'shadow' },
            { name: 'The Abyssal Serpent', icon: '🐍', flavor: 'Coils around your potential and drags it to the depths.', particleType: 'slime' },
            { name: 'Infernal Juggernaut', icon: '🔥', flavor: 'An unstoppable force of destructive routines.', particleType: 'ember' },
            { name: 'The Shadow Sovereign', icon: '🌘', flavor: 'Commands an army of every excuse you\'ve ever made.', particleType: 'shadow' },
            { name: 'Dreadnought of Doom', icon: '⚓', flavor: 'An armored fortress of fear that blocks your horizon.', particleType: 'shadow' },
            { name: 'The Eternal Watcher', icon: '🗿', flavor: 'Has observed a thousand failed resolutions. Will yours be different?', particleType: 'shadow' }
        ]
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic BOSS_THEMES property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.BOSS_THEMES = BOSS_THEMES;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = BOSS_THEMES;
})();
