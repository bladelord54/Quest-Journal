// @ts-check
'use strict';
/**
 * spell-definitions.js — the spellbook catalog (Engineering Roadmap #1).
 *
 * Third incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. Keyed by spell id; each entry carries display metadata
 * (name/icon/description), its rarity tier, its `effect` key + optional
 * `multiplier`, a `duration` (ms; -1 = active until a trigger, 0 = instant),
 * and monetization/availability flags:
 *   - `premium`: paid-ceiling spells (free users never receive them from loot);
 *   - `wizardExclusive`: granted ONLY by the Wizard's Forbidden Tomes node,
 *     never from chests — see grantWizardSpells() / getWizardLootEntries().
 * The free loot pool is DERIVED from these flags (getFreeLootableSpellIds =
 * every non-premium, non-wizardExclusive spell), so adding a free spell here
 * widens the reward pool automatically instead of drifting from a hardcoded
 * list.
 *
 * Dual-environment, no bundler (mirrors balance.js / level-titles.js /
 * companion-definitions.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.SPELL_DEFINITIONS. goal-manager.js captures it into a
 *     module-scoped const and returns it from initializeSpells(), so every call
 *     site (this.spellDefinitions) is unchanged.
 *   - Jest/Node: `require('./spell-definitions.js')` returns the object via
 *     module.exports (and also sets window.SPELL_DEFINITIONS under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — no call site can
     * accidentally mutate the shared spell table at runtime.
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

    // Free (non-premium) spells form the loot pool for free users — see
    // getFreeLootableSpellIds(), which derives that pool from the `premium`
    // flag so the list never drifts. Premium spells are the paid ceiling.
    // Wizard-exclusive spells (mana_font, philosophers_stone) are granted
    // only via the Forbidden Tomes node, never from chests.
    const SPELL_DEFINITIONS = deepFreeze({
        arcane_surge: {
            id: 'arcane_surge',
            name: 'Arcane Surge',
            icon: '🌟',
            description: '2x XP for the entire day',
            rarity: 'rare',
            effect: 'xp_multiplier',
            multiplier: 2,
            duration: 86400000, // 24 hours
            premium: true
        },
        golden_touch: {
            id: 'golden_touch',
            name: 'Golden Touch',
            icon: '💰',
            description: '2x Gold for the entire day',
            rarity: 'rare',
            effect: 'gold_multiplier',
            multiplier: 2,
            duration: 86400000, // 24 hours
            premium: true
        },
        streak_shield: {
            id: 'streak_shield',
            name: 'Streak Shield',
            icon: '🛡️',
            description: 'Protect your habit & login streak for 1 day',
            rarity: 'epic',
            effect: 'streak_protection',
            duration: 86400000, // 24 hours
            premium: true
        },
        lucky_draw: {
            id: 'lucky_draw',
            name: 'Lucky Draw',
            icon: '🎲',
            description: 'Guaranteed uncommon+ loot on next chest opened',
            rarity: 'uncommon',
            effect: 'chest_boost',
            multiplier: 1,
            duration: -1, // Active until next chest opened
            premium: false
        },
        inferno_focus: {
            id: 'inferno_focus',
            name: 'Inferno Focus',
            icon: '🔥',
            description: 'All tasks give +25% XP today',
            rarity: 'rare',
            effect: 'xp_boost',
            multiplier: 1.25,
            duration: 86400000,
            premium: true
        },
        time_freeze: {
            id: 'time_freeze',
            name: 'Time Freeze',
            icon: '❄️',
            description: 'Prevent daily quest reset for 1 day',
            rarity: 'legendary',
            effect: 'pause_reset',
            duration: 86400000,
            premium: true
        },
        moonlight_blessing: {
            id: 'moonlight_blessing',
            name: 'Moonlight Blessing',
            icon: '🌙',
            description: 'All tasks worth +50% XP today',
            rarity: 'legendary',
            effect: 'xp_boost',
            multiplier: 1.5,
            duration: 86400000,
            premium: true
        },
        quest_doubler: {
            id: 'quest_doubler',
            name: 'Quest Doubler',
            icon: '📋',
            description: '2x XP & Gold on next quest completed',
            rarity: 'uncommon',
            effect: 'double_reward',
            duration: -1, // Active until next quest completed
            premium: false
        },
        instant_archive: {
            id: 'instant_archive',
            name: 'Instant Archive',
            icon: '📦',
            description: 'Bulk archive all completed tasks',
            rarity: 'uncommon',
            effect: 'bulk_archive',
            duration: 0, // Instant use
            premium: false
        },
        focus_mode: {
            id: 'focus_mode',
            name: 'Focus Mode',
            icon: '🎯',
            description: '2x Focus Crystals & +50 XP per session for 2 hours',
            rarity: 'uncommon',
            effect: 'focus_boost',
            duration: 7200000, // 2 hours
            premium: false
        },
        minor_wisdom: {
            id: 'minor_wisdom',
            name: 'Minor Wisdom',
            icon: '📚',
            description: '+15% XP for the entire day',
            rarity: 'common',
            effect: 'xp_boost',
            multiplier: 1.15,
            duration: 86400000, // 24 hours
            premium: false
        },
        copper_blessing: {
            id: 'copper_blessing',
            name: 'Copper Blessing',
            icon: '🪙',
            description: '+15% Gold for the entire day',
            rarity: 'common',
            effect: 'gold_multiplier',
            multiplier: 1.15,
            duration: 86400000, // 24 hours
            premium: false
        },
        // v3.2 friction audit P1b — extra free mid-tier spells so the free
        // loot pool (getFreeLootableSpellIds) keeps surprising free users
        // instead of recycling the same six. Both reuse proven free-spell
        // effects (xp_boost / gold_multiplier) and sit in the uncommon tier
        // BELOW the premium ceiling (rare/legendary buffs and 2x multipliers).
        scholars_charm: {
            id: 'scholars_charm',
            name: "Scholar's Charm",
            icon: '📜',
            description: '+20% XP for the entire day',
            rarity: 'uncommon',
            effect: 'xp_boost',
            multiplier: 1.2,
            duration: 86400000, // 24 hours
            premium: false
        },
        merchants_fortune: {
            id: 'merchants_fortune',
            name: "Merchant's Fortune",
            icon: '💵',
            description: '+20% Gold for the entire day',
            rarity: 'uncommon',
            effect: 'gold_multiplier',
            multiplier: 1.2,
            duration: 86400000, // 24 hours
            premium: false
        },
        silver_blessing: {
            id: 'silver_blessing',
            name: 'Silver Blessing',
            icon: '🥈',
            description: '+25% Gold for the entire day',
            rarity: 'uncommon',
            effect: 'gold_multiplier',
            multiplier: 1.25,
            duration: 86400000, // 24 hours
            premium: true
        },
        gold_blessing: {
            id: 'gold_blessing',
            name: 'Gold Blessing',
            icon: '🥇',
            description: '+50% Gold for the entire day',
            rarity: 'rare',
            effect: 'gold_multiplier',
            multiplier: 1.5,
            duration: 86400000, // 24 hours
            premium: true
        },
        double_xp_weekend: {
            id: 'double_xp_weekend',
            name: 'Double XP Weekend',
            icon: '⚡',
            description: '2x XP for 48 hours',
            rarity: 'legendary',
            effect: 'xp_multiplier',
            multiplier: 2,
            duration: 172800000, // 48 hours
            premium: true
        },
        berserker_rage: {
            id: 'berserker_rage',
            name: 'Berserker Rage',
            icon: '⚔️',
            description: 'Next boss attack deals 1.5x damage',
            rarity: 'epic',
            effect: 'boss_double_damage',
            multiplier: 1.5,
            duration: -1, // Active until next boss damage
            premium: true
        },
        critical_strike: {
            id: 'critical_strike',
            name: 'Critical Strike',
            icon: '💥',
            description: '50% chance for +50% bonus damage on boss attacks today',
            rarity: 'rare',
            effect: 'boss_crit_chance',
            multiplier: 1.5,
            duration: 86400000, // 24 hours
            premium: true
        },
        boss_slayer: {
            id: 'boss_slayer',
            name: 'Boss Slayer',
            icon: '🗡️',
            description: '+25% damage to ALL bosses for 7 days',
            rarity: 'legendary',
            effect: 'boss_damage_boost',
            multiplier: 1.25,
            duration: 604800000, // 7 days
            premium: true
        },
        execute: {
            id: 'execute',
            name: 'Execute',
            icon: '💀',
            description: 'Instantly defeat ONE boss below 25% HP',
            rarity: 'legendary',
            effect: 'boss_execute',
            duration: -1, // Active until used
            premium: true
        },
        // --- Wizard-exclusive spells (Forbidden Tomes, v3.1 §3.2) ---
        // Granted ONLY by the Wizard's "Forbidden Tomes" node via
        // grantWizardSpells(); hidden from the collection until owned
        // (renderSpellCollection filters on `wizardExclusive`). Both are
        // timed multiplier spells, so they synergize with Empowered Magic
        // and can be Overcharged.
        mana_font: {
            id: 'mana_font',
            name: 'Mana Font',
            icon: '🔵',
            description: '2x XP for the entire day — a Wizard\'s bottomless arcane reservoir',
            rarity: 'epic',
            effect: 'xp_multiplier',
            multiplier: 2,
            duration: 86400000, // 24 hours
            premium: false,
            wizardExclusive: true
        },
        philosophers_stone: {
            id: 'philosophers_stone',
            name: 'Philosopher\'s Stone',
            icon: '⚗️',
            description: '2x Gold for the entire day — transmute diligence into treasure',
            rarity: 'epic',
            effect: 'gold_multiplier',
            multiplier: 2,
            duration: 86400000, // 24 hours
            premium: false,
            wizardExclusive: true
        }
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic SPELL_DEFINITIONS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.SPELL_DEFINITIONS = SPELL_DEFINITIONS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = SPELL_DEFINITIONS;
})();
