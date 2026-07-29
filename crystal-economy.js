// @ts-check
'use strict';
/**
 * crystal-economy.js — pure Focus Crystal supply math (Engineering Roadmap #1).
 *
 * 64th incremental slice of the goal-manager.js God class, and the TWELFTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points pattern). It covers the
 * three ways Focus Crystals come INTO existence: shard auto-conversion, focus-session yield, and boss kills.
 *
 * Two things made this the highest-value remaining logic slice:
 *
 *   1. SHARDS_PER_CRYSTAL was a DUPLICATED magic number — the `10` threshold lived in
 *      addFocusCrystalShards' conversion AND again, hand-written, in the shard reward-display string
 *      ("(n/10)"). That is exactly the duplicated-knowledge drift that caused the July 2026 loot bug (two
 *      hand-maintained copies of the loot spell list). Both now read this single exported constant.
 *   2. focusSessionCrystals is an ORDER- and ROUNDING-dependent four-stage pipeline that had no isolation
 *      coverage: base 1 + two enchantments + a class perk, then the Focus Mode doubling, then the Deep Work
 *      capstone multiplier, then the Archivist subclass multiplier — the last two each Math.round()ed
 *      SEPARATELY, so the stages do NOT commute and the rounding is observable.
 *
 * The three PURE functions:
 *
 *   - shardConversion(totalShards, shardsPerCrystal) — {crystals, remainder} for a shard total. Every whole
 *     multiple of the threshold becomes a crystal (a large grant can form several at once) and the leftover
 *     carries forward. Below the threshold: {crystals: 0, remainder: totalShards}.
 *   - focusSessionCrystals({bonusCrystal, timeWarden, perkCrystals, focusModeActive, deepWorkMult,
 *     archivistMult}) — a session's crystal yield through the four stages, in that exact order.
 *   - bossCrystalReward(bossType) — monthly 3, weekly 2, anything else (daily) 1.
 *
 * The state-MUTATING callers stay on the class and keep every side effect (`window.effectsManager`,
 * `showAchievement`, `showNotification`, `saveData`, `trackDaily`, the instance writes) plus the
 * `soul_harvest` perk top-up on boss kills. Only the arithmetic lives here, and each caller's own guard
 * (e.g. "only toast when crystals actually formed") is preserved.
 *
 * Dual-environment, no bundler (mirrors skill-points.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.CRYSTAL_ECONOMY. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./crystal-economy.js') returns the frozen object via module.exports (and also sets
 *     window.CRYSTAL_ECONOMY under jsdom).
 */
(function () {
    /** Shards required to auto-form one Focus Crystal. Single source of truth. */
    const SHARDS_PER_CRYSTAL = 10;

    /**
     * Split a shard total into newly-formed crystals plus the carried-forward remainder. PURE.
     * @param {number} totalShards
     * @param {number|null|undefined} [shardsPerCrystal] defaults to SHARDS_PER_CRYSTAL (10)
     * @returns {{ crystals: number, remainder: number }}
     */
    function shardConversion(totalShards, shardsPerCrystal) {
        const per = shardsPerCrystal || SHARDS_PER_CRYSTAL;
        const total = totalShards || 0;
        if (total < per) return { crystals: 0, remainder: total };
        return { crystals: Math.floor(total / per), remainder: total % per };
    }

    /**
     * A focus session's crystal yield. The four stages apply in this exact order and the two multipliers are
     * rounded SEPARATELY, so they do not commute. PURE.
     * @param {{
     *   bonusCrystal?: boolean,
     *   timeWarden?: boolean,
     *   perkCrystals?: number,
     *   focusModeActive?: boolean,
     *   deepWorkMult?: number,
     *   archivistMult?: number,
     * }} [opts]
     * @returns {number}
     */
    function focusSessionCrystals(opts) {
        const o = opts || {};
        // Stage 1: base 1, + bonus_crystal / extended_focus enchantments, + the crystal_yield class perk.
        let crystals = 1 + (o.bonusCrystal ? 1 : 0) + (o.timeWarden ? 1 : 0) + (o.perkCrystals || 0);
        // Stage 2: the Focus Mode spell doubles the running total.
        if (o.focusModeActive) crystals *= 2;
        // Stage 3: the Deep Work capstone multiplier, rounded to a whole crystal.
        const deepWorkMult = o.deepWorkMult || 1;
        if (deepWorkMult > 1) crystals = Math.round(crystals * deepWorkMult);
        // Stage 4: the Archivist subclass multiplier stacks on top, rounded again.
        const archivistMult = o.archivistMult || 1;
        if (archivistMult > 1) crystals = Math.round(crystals * archivistMult);
        return crystals;
    }

    /**
     * Base Focus Crystal reward for defeating a boss (before the soul_harvest perk top-up). PURE.
     * @param {string} bossType
     * @returns {number}
     */
    function bossCrystalReward(bossType) {
        return bossType === 'monthly' ? 3 : bossType === 'weekly' ? 2 : 1;
    }

    const CRYSTAL_ECONOMY = Object.freeze({
        SHARDS_PER_CRYSTAL,
        shardConversion,
        focusSessionCrystals,
        bossCrystalReward,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // CRYSTAL_ECONOMY property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.CRYSTAL_ECONOMY = CRYSTAL_ECONOMY;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = CRYSTAL_ECONOMY;
})();
