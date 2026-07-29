// @ts-check
'use strict';
/**
 * class-definitions.js — the RAW class/subclass skill-tree catalog (Roadmap #1).
 *
 * Seventh incremental slice of the goal-manager.js God class, and the FIRST that
 * is not a pure literal lift: the class tree is DATA + COMPUTATION. This module
 * holds only the data — the four classes (scholar / warrior / wizard / ranger),
 * each with:
 *   - metadata: id, name, icon, color, tagline
 *   - `nodes`: the 5 linear skill nodes, each { id, effect, value, name, desc }
 *   - `capstones`: the 2 mutually-exclusive endgame perks, same shape
 *   - `subclasses`: keyed { id, name, icon, tagline, effect, tiers } where each
 *     tier is { value, desc }
 *
 * The COMPUTATION stays in goal-manager.js `initializeClasses()`: it injects the
 * `tier` numbers and per-tier `cost` (from BALANCE.classTree.linearCosts /
 * capstoneCost / subTierCosts) and the capstone flag. Keeping costs dynamic there
 * means they never drift from the central balance table — so this catalog is
 * deliberately cost-FREE. See docs/CLASS_REDESIGN.md for the full spec.
 *
 * Dual-environment, no bundler (mirrors balance.js and the other extracted
 * catalogs): browser loads it as a plain <script> BEFORE goal-manager.js
 * (attaches window.CLASS_DEFINITIONS); jest/Node require()s it via module.exports.
 * goal-manager.js captures it into a module-scoped const and builds the priced
 * tree from it, so `this.classDefinitions` and every consumer are unchanged.
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — the builder in
     * initializeClasses() only READS it (it maps into fresh priced objects), so a
     * frozen source can never be mutated by a render or progression path.
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

    const CLASS_DEFINITIONS = deepFreeze({
        scholar: {
            id: 'scholar',
            name: 'Scholar',
            icon: '📚',
            color: '#3b82f6',
            tagline: 'Focus & enchantment mastery',
            nodes: [
                { id: 'focus_xp', effect: 'focus_xp', value: 40, name: 'Diligent Study', desc: '+40 XP per focus session' },
                { id: 'enchant_discount', effect: 'enchant_discount', value: 2, name: 'Frugal Arcana', desc: '-2 Focus Crystal enchantment cost (min 1)' },
                { id: 'crystal_yield', effect: 'crystal_yield', value: 1, name: 'Crystal Harvest', desc: '+1 Focus Crystal per focus session' },
                { id: 'enchant_duration', effect: 'enchant_duration_mult', value: 0.40, name: 'Lingering Magic', desc: '+40% enchantment duration' },
                { id: 'scholarship', effect: 'study_xp_mult', value: 0.10, name: 'Scholarship', desc: '+10% XP from all sources' }
            ],
            capstones: [
                { id: 'deep_work', effect: 'deep_work', value: 0.25, name: 'Deep Work', desc: 'Back-to-back focus sessions stack an escalating +25% crystal & XP bonus' },
                { id: 'insight', effect: 'enchant_preserve', value: 0.25, name: 'Insight', desc: '25% chance an enchantment is not consumed when it expires' }
            ],
            subclasses: {
                archivist: { id: 'archivist', name: 'Archivist', icon: '📖', tagline: 'Focus XP master', effect: 'archivist_focus_mult', tiers: [
                    { value: 0.15, desc: '+15% XP & crystals from focus sessions' },
                    { value: 0.30, desc: '+30% XP & crystals from focus sessions' },
                    { value: 0.50, desc: '+50% XP & crystals from focus sessions' }
                ] },
                sage: { id: 'sage', name: 'Sage', icon: '🌿', tagline: 'Habit crystal harvester', effect: 'sage_habit_crystals', tiers: [
                    { value: 0.20, desc: '20% chance a completed habit yields a Focus Crystal' },
                    { value: 0.35, desc: '35% chance a completed habit yields a Focus Crystal' },
                    { value: 0.50, desc: '50% chance a completed habit yields a Focus Crystal' }
                ] }
            }
        },
        warrior: {
            id: 'warrior',
            name: 'Warrior',
            icon: '⚔️',
            color: '#ef4444',
            tagline: 'Boss combat specialist',
            nodes: [
                { id: 'power_strikes', effect: 'boss_damage_mult', value: 0.20, name: 'Power Strikes', desc: '+20% boss damage' },
                { id: 'battle_frenzy', effect: 'charge_chance', value: 0.25, name: 'Battle Frenzy', desc: '25% chance of a bonus attack charge from tasks' },
                { id: 'keen_edge', effect: 'crit_chance', value: 0.20, name: 'Keen Edge', desc: '20% chance of a +50% critical hit on bosses' },
                { id: 'cleave', effect: 'cleave_pct', value: 0.25, name: 'Cleave', desc: '25% of boss damage splashes to other active bosses' },
                { id: 'rage_combo', effect: 'rage_combo', value: 3, name: 'Rage Combo', desc: 'Every 3rd consecutive attack is a guaranteed critical hit' }
            ],
            capstones: [
                { id: 'executioner', effect: 'execute_bonus', value: 0.50, name: 'Executioner', desc: '+50% damage to bosses below 25% HP' },
                { id: 'overflow', effect: 'charge_overflow', value: 1, name: 'Overflow', desc: 'Attack charges earned above the cap are kept instead of lost' }
            ],
            subclasses: {
                berserker: { id: 'berserker', name: 'Berserker', icon: '🪓', tagline: 'Low-HP executioner', effect: 'berserker_ramp', tiers: [
                    { value: 0.20, desc: 'Up to +20% boss damage as the boss\'s HP drops' },
                    { value: 0.35, desc: 'Up to +35% boss damage as the boss\'s HP drops' },
                    { value: 0.50, desc: 'Up to +50% boss damage as the boss\'s HP drops' }
                ] },
                guardian: { id: 'guardian', name: 'Guardian', icon: '🛡️', tagline: 'Streak protector', effect: 'guardian_protect', tiers: [
                    { value: 1, desc: '+1 personal streak protection per week' },
                    { value: 2, desc: '+2 personal streak protections per week' },
                    { value: 3, desc: '+3 personal streak protections per week' }
                ] }
            }
        },
        wizard: {
            id: 'wizard',
            name: 'Wizard',
            icon: '🔮',
            color: '#a855f7',
            tagline: 'Spell mastery',
            nodes: [
                { id: 'sustained_casting', effect: 'spell_duration_mult', value: 0.40, name: 'Sustained Casting', desc: '+40% spell duration' },
                { id: 'arcane_efficiency', effect: 'spell_preserve', value: 0.25, name: 'Arcane Efficiency', desc: '25% chance a spell cast does not consume a charge' },
                { id: 'empowered_magic', effect: 'spell_power_mult', value: 0.20, name: 'Empowered Magic', desc: '+20% spell power (where applicable)' },
                { id: 'forbidden_tomes', effect: 'mage_spells', value: 1, name: 'Forbidden Tomes', desc: 'Unlock Wizard-exclusive spells' },
                { id: 'daily_ritual', effect: 'free_daily_cast', value: 1, name: 'Daily Ritual', desc: 'One free common/uncommon spell cast per day' }
            ],
            capstones: [
                { id: 'overcharge', effect: 'overcharge', value: 1, name: 'Overcharge', desc: 'Optionally spend 2 charges to cast a spell at boosted power' },
                { id: 'archmage', effect: 'archmage', value: 0.50, name: 'Archmage', desc: 'All active spells last +50% longer and gain a charge-refund chance' }
            ],
            subclasses: {
                diviner: { id: 'diviner', name: 'Diviner', icon: '👁️', tagline: 'Spell-charge seer', effect: 'diviner_refund', tiers: [
                    { value: 0.10, desc: '+10% chance a spell cast refunds its charge' },
                    { value: 0.20, desc: '+20% chance a spell cast refunds its charge' },
                    { value: 0.30, desc: '+30% chance a spell cast refunds its charge' }
                ] },
                necromancer: { id: 'necromancer', name: 'Necromancer', icon: '💀', tagline: 'Soul harvester', effect: 'soul_harvest', tiers: [
                    { value: 1, desc: '+1 Focus Crystal when you defeat a boss' },
                    { value: 2, desc: '+2 Focus Crystals when you defeat a boss' },
                    { value: 3, desc: '+3 Focus Crystals when you defeat a boss' }
                ] }
            }
        },
        ranger: {
            id: 'ranger',
            name: 'Ranger',
            icon: '🏹',
            color: '#22c55e',
            tagline: 'Companion & loot expert',
            nodes: [
                { id: 'beastmaster', effect: 'companion_xp_mult', value: 0.50, name: 'Beastmaster', desc: '+50% companion XP gain' },
                { id: 'keen_eye', effect: 'loot_weight', value: 12, name: 'Keen Eye', desc: '+12 rare-loot weight on chest opens' },
                { id: 'trophy_hunter', effect: 'boss_loot', value: 1, name: 'Trophy Hunter', desc: '+1 bonus loot drop from defeated bosses' },
                { id: 'wild_bond', effect: 'ranger_companion', value: 1, name: 'Wild Bond', desc: 'Unlock a Ranger-exclusive companion' },
                { id: 'guardian_instinct', effect: 'companion_protect', value: 1, name: 'Guardian Instinct', desc: '+1 companion streak protection per week' }
            ],
            capstones: [
                { id: 'twin_bond', effect: 'second_companion', value: 1, name: 'Twin Bond', desc: 'Equip a second companion at the same time' },
                { id: 'forage', effect: 'forage', value: 0.20, name: 'Forage', desc: '20% chance to find bonus gold & Focus Crystals on task completion' }
            ],
            subclasses: {
                hunter: { id: 'hunter', name: 'Hunter', icon: '🎯', tagline: 'Big-boss slayer', effect: 'hunter_bonus', tiers: [
                    { value: 0.15, desc: '+15% damage to weekly & monthly bosses' },
                    { value: 0.25, desc: '+25% damage to weekly & monthly bosses' },
                    { value: 0.40, desc: '+40% damage to weekly & monthly bosses' }
                ] },
                pathfinder: { id: 'pathfinder', name: 'Pathfinder', icon: '🧭', tagline: 'Fortune seeker', effect: 'pathfinder_fortune', tiers: [
                    { value: 0.10, desc: '+10% gold from all sources' },
                    { value: 0.20, desc: '+20% gold from all sources' },
                    { value: 0.30, desc: '+30% gold from all sources' }
                ] }
            }
        }
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic CLASS_DEFINITIONS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.CLASS_DEFINITIONS = CLASS_DEFINITIONS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = CLASS_DEFINITIONS;
})();
