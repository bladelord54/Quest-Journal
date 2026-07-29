// @ts-check
'use strict';
/**
 * combat-damage.js — pure boss-damage math (Engineering Roadmap #1).
 *
 * 66th incremental slice of the goal-manager.js God class, and the FOURTEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules pattern). `attackBoss` had become the densest rule pipeline left in the class: TWELVE damage
 * stages plus a cleave splash, every one of them `Math.ceil`-rounded and applied IN ORDER, interleaved with
 * RNG rolls, spell consumption, a mutating combo counter and DOM/effect side effects.
 *
 * What made this worth extracting:
 *
 *   1. A genuinely DUPLICATED magic number. The 0.25 execute threshold was written TWICE — once to gate the
 *      Executioner capstone, and again inside the Berserker ramp to decide whether Executioner is "active"
 *      for the §9.8 anti-double-dip cap. Rebalance Executioner to 0.30, miss the second copy, and the
 *      guardrail silently mis-computes. Both now read EXECUTE_HP_THRESHOLD.
 *   2. STAGE ORDER AND ROUNDING ARE OBSERVABLE. Every stage is `Math.ceil`ed independently, so the stages do
 *      NOT commute and do NOT equal one folded multiply — ceil(ceil(6 × 1.2) × 1.25) = 10, while
 *      ceil(6 × 1.2 × 1.25) = 9. Centralising the rounding convention in applyMultiplier / applyBonus keeps
 *      every stage honest.
 *   3. The §9.8 guardrail (`berserkerBonus`) is subtle two-term algebra — the ramp scales with missing HP but
 *      is clamped by whatever headroom Executioner has left under the +75% combined cap.
 *
 * The PURE surface:
 *
 *   - baseDamage(level) — 1 damage, +1 per 10 player levels.
 *   - applyMultiplier(damage, multiplier) / applyBonus(damage, bonus) — the shared ceil-rounded stage step.
 *     `applyBonus(d, b)` is just `applyMultiplier(d, 1 + b)`, matching the two shapes used inline.
 *   - hpFraction(boss) / isExecuteRange(boss, threshold) — the low-HP predicates, single-sourcing 0.25.
 *   - berserkerBonus(ramp, hpFrac, executeActive, cap) — the §9.8-capped low-HP ramp.
 *   - rageComboAdvance(counter, every) — {counter, triggered}; the combo "spends" on the Nth hit even when a
 *     crit already landed (the caller simply skips re-multiplying), which is why the reset is modelled here.
 *   - isHunterTarget(bossType) — the Hunter subclass hits only the larger weekly/monthly bosses.
 *   - cleaveSplash(damage, cleavePct) — the splash dealt to each OTHER live boss.
 *
 * Everything impure stays on the class: the `rng()` crit rolls, consuming the Berserker Rage spell, writing
 * `rageComboCounter`, the message strings, `window.effectsManager` crit flashes, HP mutation, the boss-log
 * line, animations and `saveData`.
 *
 * Dual-environment, no bundler (mirrors charge-rules.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.COMBAT_DAMAGE. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./combat-damage.js') returns the frozen object via module.exports (and also sets
 *     window.COMBAT_DAMAGE under jsdom).
 */
(function () {
    /** Player levels per +1 base damage. */
    const LEVELS_PER_DAMAGE = 10;
    /** Boss HP fraction at or below which "execute" effects switch on. */
    const EXECUTE_HP_THRESHOLD = 0.25;
    /** Damage multiplier for any critical hit (spell, Keen Edge or Rage Combo). */
    const CRIT_MULTIPLIER = 1.5;
    /** §9.8 guardrail: combined Executioner + Berserker low-HP bonus ceiling. */
    const LOW_HP_BONUS_CAP = 0.75;
    /** Berserker Rage spell multiplier (consumed on use). */
    const BERSERKER_RAGE_MULTIPLIER = 1.5;
    /** Boss Slayer spell multiplier (duration-based). */
    const BOSS_SLAYER_MULTIPLIER = 1.25;
    /** Critical Strike spell proc chance. */
    const CRITICAL_STRIKE_CHANCE = 0.5;
    /** Boss types the Hunter subclass bonus applies to (daily is excluded). */
    const HUNTER_BOSS_TYPES = Object.freeze(['weekly', 'monthly']);

    /**
     * Base hit damage before any multiplier: 1, plus 1 per LEVELS_PER_DAMAGE player levels. PURE.
     * @param {number} level
     * @returns {number}
     */
    function baseDamage(level) {
        return 1 + Math.floor((level || 0) / LEVELS_PER_DAMAGE);
    }

    /**
     * Apply one damage stage as a raw multiplier, rounded UP. Each stage rounds independently, so stages do
     * not commute and never equal a single folded multiply. PURE.
     * @param {number} damage
     * @param {number} multiplier
     * @returns {number}
     */
    function applyMultiplier(damage, multiplier) {
        return Math.ceil(damage * multiplier);
    }

    /**
     * Apply one damage stage expressed as a fractional bonus (+20% → 0.20), rounded UP. PURE.
     * @param {number} damage
     * @param {number} bonus
     * @returns {number}
     */
    function applyBonus(damage, bonus) {
        return applyMultiplier(damage, 1 + bonus);
    }

    /**
     * A boss's remaining HP as a fraction of its max, or 0 when it has no max HP. PURE.
     * @param {{ currentHP?: number, maxHP?: number }|null|undefined} boss
     * @returns {number}
     */
    function hpFraction(boss) {
        if (!boss || !boss.maxHP || boss.maxHP <= 0) return 0;
        return (boss.currentHP || 0) / boss.maxHP;
    }

    /**
     * True when a boss sits at or below the execute threshold. Measured on CURRENT HP, before the incoming
     * hit lands. Single source of truth for the 0.25 gate. PURE.
     * @param {{ currentHP?: number, maxHP?: number }|null|undefined} boss
     * @param {number|null|undefined} [threshold] defaults to EXECUTE_HP_THRESHOLD (0.25)
     * @returns {boolean}
     */
    function isExecuteRange(boss, threshold) {
        if (!boss || !boss.maxHP || boss.maxHP <= 0) return false;
        return hpFraction(boss) <= (threshold ?? EXECUTE_HP_THRESHOLD);
    }

    /**
     * The Berserker low-HP damage ramp, clamped by the §9.8 combined-bonus cap. The ramp grows with missing
     * HP, but may only use the headroom Executioner has not already taken. PURE.
     * @param {number} ramp per-tier ramp value (e.g. 0.50 at tier 3)
     * @param {number} hpFrac boss HP fraction, pre-hit
     * @param {number} [executeActive] the Executioner bonus currently applying, else 0
     * @param {number|null|undefined} [cap] defaults to LOW_HP_BONUS_CAP (0.75)
     * @returns {number}
     */
    function berserkerBonus(ramp, hpFrac, executeActive, cap) {
        const ceiling = cap ?? LOW_HP_BONUS_CAP;
        return Math.min(ramp * (1 - hpFrac), Math.max(0, ceiling - (executeActive || 0)));
    }

    /**
     * Advance the Rage Combo counter one boss attack. On the Nth hit the counter resets and the combo fires.
     * It "spends" even if a crit already landed this hit — the caller just skips re-multiplying. PURE.
     * @param {number} counter
     * @param {number} every
     * @returns {{ counter: number, triggered: boolean }}
     */
    function rageComboAdvance(counter, every) {
        const next = (counter || 0) + 1;
        if (every > 0 && next >= every) return { counter: 0, triggered: true };
        return { counter: next, triggered: false };
    }

    /**
     * True when the Hunter subclass bonus applies to this boss type. PURE.
     * @param {string} bossType
     * @returns {boolean}
     */
    function isHunterTarget(bossType) {
        return HUNTER_BOSS_TYPES.includes(bossType);
    }

    /**
     * Splash damage dealt to each OTHER live boss by Cleave, rounded UP. PURE.
     * @param {number} damage
     * @param {number} cleavePct
     * @returns {number}
     */
    function cleaveSplash(damage, cleavePct) {
        return Math.ceil(damage * cleavePct);
    }

    const COMBAT_DAMAGE = Object.freeze({
        LEVELS_PER_DAMAGE,
        EXECUTE_HP_THRESHOLD,
        CRIT_MULTIPLIER,
        LOW_HP_BONUS_CAP,
        BERSERKER_RAGE_MULTIPLIER,
        BOSS_SLAYER_MULTIPLIER,
        CRITICAL_STRIKE_CHANCE,
        HUNTER_BOSS_TYPES,
        baseDamage,
        applyMultiplier,
        applyBonus,
        hpFraction,
        isExecuteRange,
        berserkerBonus,
        rageComboAdvance,
        isHunterTarget,
        cleaveSplash,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // COMBAT_DAMAGE property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.COMBAT_DAMAGE = COMBAT_DAMAGE;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = COMBAT_DAMAGE;
})();
