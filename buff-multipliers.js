// @ts-check
'use strict';
/**
 * buff-multipliers.js — pure active-buff → reward-multiplier resolution (Engineering Roadmap #1).
 *
 * 59th incremental slice of the goal-manager.js God class, and the SEVENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic
 * pattern). This is a logic-ISOLATION slice: it locks the drift-prone economy-buff math that
 * getActiveSpellMultiplier / getEnchantmentMultiplier resolve for addXP / addGold (and the boss-damage
 * path). Two PURE, stateless functions the God-class methods delegate to:
 *
 *   - spellMultiplier(effectType, activeSpells, spellDefinitions, { now, powerMult }) — the active-spell
 *     walk: skip expired casts (expiresAt === -1 means "until triggered"), match each spell's effect,
 *     and multiply in its bonus (the part above 1×). Wizard Empowered Magic scales that bonus by
 *     powerMult; an Overcharged cast (capstone) doubles the scaled bonus again. This is the one with
 *     real, previously-hard-to-test-in-isolation logic.
 *   - enchantmentMultiplier(type, hasEnchantment) — the reward-type → multiplier lookup: double_xp → 2×
 *     on xp, double_gold → 2× on gold, boss_damage → 1.3× on boss_damage, else 1×. hasEnchantment(id) is
 *     INJECTED so the caller owns the expiry side effect.
 *
 * The IMPURE inputs stay on the class: the spell wrapper injects Date.now() + the spell_power_mult perk;
 * the enchantment wrapper runs checkExpiredEnchantments() first, then passes an id => hasActiveEnchantment(id)
 * predicate. Every function is a byte-faithful lift of the inline body it replaces (the existing "Spell
 * Multiplier System" / "Enchantment System" class tests still drive the real delegators unchanged; the two
 * module functions are additionally locked by new isolation tests — especially the Empowered × Overcharge
 * scaling, which had no direct coverage before this slice).
 *
 * Dual-environment, no bundler (mirrors leveling-logic.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.BUFF_MULTIPLIERS. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./buff-multipliers.js') returns the frozen object via module.exports (and also
 *     sets window.BUFF_MULTIPLIERS under jsdom).
 */

/**
 * Active-spell reward multiplier for an economy effect (e.g. 'xp_multiplier', 'xp_boost',
 * 'gold_multiplier'). Walks the active-spell list, skipping expired casts, and for each spell whose
 * `effect` matches multiplies in its bonus (spell.multiplier - 1). When a bonus is positive it is
 * scaled by Empowered Magic (1 + powerMult) and, for an overcharged cast, doubled again. PURE.
 * @param {string} effectType
 * @param {Array<{ spellId: string, expiresAt: number, overcharged?: boolean }>} activeSpells
 * @param {Record<string, { effect?: string, multiplier?: number }>} spellDefinitions
 * @param {{ now?: number, powerMult?: number }} [opts]
 * @returns {number}
 */
function spellMultiplier(effectType, activeSpells, spellDefinitions, opts) {
    const now = (opts && typeof opts.now === 'number') ? opts.now : Date.now();
    const powerMult = (opts && typeof opts.powerMult === 'number') ? opts.powerMult : 0;
    let multiplier = 1;

    (activeSpells || []).forEach(activeSpell => {
        // Check if spell is still active (not expired, or -1 means until triggered)
        if (activeSpell.expiresAt === -1 || activeSpell.expiresAt > now) {
            const spell = spellDefinitions[activeSpell.spellId];
            // Skip if spell no longer exists in definitions
            if (spell && spell.effect === effectType && spell.multiplier) {
                let bonus = spell.multiplier - 1; // the portion above 1×
                if (bonus > 0) {
                    // Empowered Magic scales the bonus; an Overcharged cast
                    // (capstone) doubles it again, recorded per-instance.
                    let scale = 1 + (powerMult > 0 ? powerMult : 0);
                    if (activeSpell.overcharged) scale *= 2;
                    bonus *= scale;
                }
                multiplier *= (1 + bonus);
            }
        }
    });

    return multiplier;
}

/**
 * Enchantment reward multiplier for a reward type. double_xp → 2× (xp), double_gold → 2× (gold),
 * boss_damage → 1.3× (boss_damage), otherwise 1×. hasEnchantment(id) is injected so the caller owns
 * the expiry side effect (checkExpiredEnchantments). PURE.
 * @param {string} type
 * @param {(id: string) => boolean} hasEnchantment
 * @returns {number}
 */
function enchantmentMultiplier(type, hasEnchantment) {
    if (type === 'xp' && hasEnchantment('double_xp')) {
        return 2;
    }
    if (type === 'gold' && hasEnchantment('double_gold')) {
        return 2;
    }
    if (type === 'boss_damage' && hasEnchantment('boss_damage')) {
        return 1.3;
    }
    return 1;
}

const BUFF_MULTIPLIERS = Object.freeze({
    spellMultiplier,
    enchantmentMultiplier,
});


// Node / Jest

export default BUFF_MULTIPLIERS;
