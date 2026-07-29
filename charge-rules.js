// @ts-check
'use strict';
/**
 * charge-rules.js — pure attack-charge EARN + SPEND rules (Engineering Roadmap #1).
 *
 * 65th incremental slice of the goal-manager.js God class, and the THIRTEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy
 * pattern). Attack charges are the boss-battle currency, and `grantAttackCharge` had grown into a dense
 * four-rule pipeline whose ORDER is load-bearing:
 *
 *   1. Forage eligibility — only completion-flavoured sources ('task', 'sidequest', 'habit', 'weekly',
 *      'monthly') roll the Ranger Forage capstone. Loot / milestone / focus grants do NOT.
 *   2. The Warrior charge_chance bonus (+1) applies BEFORE the Battle Fury doubling, so the enchantment
 *      doubles the bonus charge too — swap the order and a lucky Warrior silently loses a charge.
 *   3. The soft cap split (v2.9.x balance audit): uncapped charges let heavy task days bank 20-30 charges
 *      that trivialize a week of bosses (a daily boss is only 8-18 HP), so grants clamp to the remaining
 *      room and the excess overflows.
 *   4. Overflow conversion — excess becomes gold (5 each) so earned charges are never wasted, UNLESS the
 *      Warrior Overflow capstone is active, in which case the charges are KEPT and nothing overflows.
 *
 * The four PURE functions plus the spend guard:
 *
 *   - isForageSource(source) — the eligible-source rule set for rule 1.
 *   - grantedAmount(amount, bonusChargeHit, battleFury) — rule 2, in the correct order. The RNG roll itself
 *     stays on the class (impure); only its boolean OUTCOME is passed in.
 *   - chargeSplit(amount, currentCharges, cap, keepOverflow) — rule 3, returning {granted, overflow}. With
 *     keepOverflow (the Overflow capstone) everything is granted and overflow is 0.
 *   - overflowGold(overflow, goldPerCharge) — rule 4's conversion.
 *   - canAttack(boss, attackCharges) — the SPEND side: a live, undefeated boss and at least one charge.
 *
 * ATTACK_CHARGE_CAP (25) and CHARGE_OVERFLOW_GOLD (5) are exported as the defaults behind the class's
 * tunable fields. Both fallbacks use `??` rather than `||`, exactly as inline — a deliberately configured
 * cap or rate of 0 must survive instead of silently snapping back to the default.
 *
 * The mutating caller stays on the class and keeps every side effect (`applyForage`, the `rng()` roll,
 * `trackDaily`, `addGold`, the `_suppressRewardToasts`-gated toast, `saveData`, and the charge-counter DOM
 * pulse). Only the arithmetic and the predicates live here.
 *
 * Dual-environment, no bundler (mirrors crystal-economy.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.CHARGE_RULES. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./charge-rules.js') returns the frozen object via module.exports (and also sets
 *     window.CHARGE_RULES under jsdom).
 */
(function () {
    /** Soft cap on banked attack charges. */
    const ATTACK_CHARGE_CAP = 25;
    /** Gold awarded per charge lost to overflow. */
    const CHARGE_OVERFLOW_GOLD = 5;

    /** Grant sources that count as a "completion" and therefore roll Ranger Forage. */
    const FORAGE_SOURCES = Object.freeze(['task', 'sidequest', 'habit', 'weekly', 'monthly']);

    /**
     * True when a grant source is completion-flavoured and should roll the Forage capstone. PURE.
     * @param {string} source
     * @returns {boolean}
     */
    function isForageSource(source) {
        return FORAGE_SOURCES.includes(source);
    }

    /**
     * The charge amount after the Warrior bonus and the Battle Fury doubling. The bonus is added BEFORE the
     * doubling, so Battle Fury doubles it too. PURE.
     * @param {number} amount
     * @param {boolean} [bonusChargeHit] outcome of the impure charge_chance roll
     * @param {boolean} [battleFury] the bonus_charges enchantment is active
     * @returns {number}
     */
    function grantedAmount(amount, bonusChargeHit, battleFury) {
        const withBonus = amount + (bonusChargeHit ? 1 : 0);
        return battleFury ? withBonus * 2 : withBonus;
    }

    /**
     * Split a grant into the part that fits under the soft cap and the part that overflows. With
     * keepOverflow (the Warrior Overflow capstone) the cap is ignored entirely. PURE.
     * @param {number} amount
     * @param {number} currentCharges
     * @param {number|null|undefined} [cap] defaults to ATTACK_CHARGE_CAP (25)
     * @param {boolean} [keepOverflow]
     * @returns {{ granted: number, overflow: number }}
     */
    function chargeSplit(amount, currentCharges, cap, keepOverflow) {
        if (keepOverflow) return { granted: amount, overflow: 0 };
        const limit = cap ?? ATTACK_CHARGE_CAP;
        const room = Math.max(0, limit - currentCharges);
        const granted = Math.min(amount, room);
        return { granted, overflow: amount - granted };
    }

    /**
     * Gold owed for charges lost to overflow. PURE.
     * @param {number} overflow
     * @param {number|null|undefined} [goldPerCharge] defaults to CHARGE_OVERFLOW_GOLD (5)
     * @returns {number}
     */
    function overflowGold(overflow, goldPerCharge) {
        return overflow * (goldPerCharge ?? CHARGE_OVERFLOW_GOLD);
    }

    /**
     * True when a boss can be attacked: it exists, is not already defeated, and a charge is available. PURE.
     * @param {{ defeated?: boolean }|null|undefined} boss
     * @param {number} attackCharges
     * @returns {boolean}
     */
    function canAttack(boss, attackCharges) {
        return !!boss && !boss.defeated && attackCharges > 0;
    }

    const CHARGE_RULES = Object.freeze({
        ATTACK_CHARGE_CAP,
        CHARGE_OVERFLOW_GOLD,
        FORAGE_SOURCES,
        isForageSource,
        grantedAmount,
        chargeSplit,
        overflowGold,
        canAttack,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // CHARGE_RULES property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.CHARGE_RULES = CHARGE_RULES;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = CHARGE_RULES;
})();
