// @ts-check
'use strict';
/**
 * chest-weight-logic.js — the chest rarity-weight modifiers (Engineering Roadmap #1, 86th slice,
 * the THIRTY-FIRST LOGIC module; first of the five extractions queued by the Sep 7 criterion-(1)/(2)
 * audit).
 *
 * generateChestRewards() starts from balance.js's per-tier rarity weights and then applies up to
 * three modifiers before the roll loop in loot-engine.js. Two of them were the SAME block written
 * twice on the class — the Lucky Loot enchantment with a hard `15` and the Ranger Keen Eye perk
 * with its `loot_weight` value — and the third (the Lucky Draw spell) was a one-off redistribution.
 * They are now three pure functions over a plain weights object:
 *
 *   - shiftWeights(weights, amount) — move `amount` weight points upward: pull from common first,
 *     then uncommon when common runs short, and push ceil(half) into rare and floor(half) into
 *     epic. This is the "+N% rare loot" mechanic. Pulling from uncommon too matters on the high
 *     tiers (gold carries 10 common weight, royal only 5) where a common-only pull was nearly a
 *     no-op on exactly the chests players buff before opening.
 *   - luckyDrawFloor(weights) — the Lucky Draw spell's "minimum uncommon" rule: zero the common
 *     weight and redistribute it 40/30/20/10 into uncommon/rare/epic/legendary (floored).
 *   - applyChestModifiers(weights, mods) — the composite generateChestRewards applies, in the
 *     original order: Lucky Loot (15 points) → Ranger perk (its value) → Lucky Draw. Takes
 *     `{ luckyLoot: boolean, rangerWeight: number, luckyDraw: boolean }`.
 *
 * All three return a NEW object; the input is not mutated. Two-decimal drift: the halves use
 * Math.ceil / Math.floor exactly as the inline code did, so an odd shift (e.g. 15 → 8 rare, 7
 * epic) rounds the same way and the `lucky_loot chest weight shift` behavioural suite passes
 * unchanged.
 *
 * Dual-environment, no bundler (mirrors loot-engine.js):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.CHEST_WEIGHT_LOGIC.
 *   - Jest/Node: require('./chest-weight-logic.js') returns the frozen namespace.
 */

/** The Lucky Loot enchantment's advertised "+15% rare loot" — 15 rarity-weight points. */
const LUCKY_LOOT_SHIFT = 15;

/** Lucky Draw redistributes the zeroed common weight in these shares (floored). */
const LUCKY_DRAW_SHARES = Object.freeze({ uncommon: 0.4, rare: 0.3, epic: 0.2, legendary: 0.1 });

/**
 * @typedef {{ common: number, uncommon: number, rare: number, epic: number, legendary: number }} RarityWeights
 */

/**
 * Move `amount` weight points upward: from common (then uncommon) into rare/epic.
 * @param {RarityWeights} weights
 * @param {number} amount points to shift; <= 0 returns an unchanged copy
 * @returns {RarityWeights} a new object
 */
function shiftWeights(weights, amount) {
    const w = { ...weights };
    if (!(amount > 0)) return w;
    let shift = Math.min(w.common, amount);
    w.common -= shift;
    if (shift < amount) {
        const fromUncommon = Math.min(w.uncommon, amount - shift);
        w.uncommon -= fromUncommon;
        shift += fromUncommon;
    }
    w.rare += Math.ceil(shift * 0.5);
    w.epic += Math.floor(shift * 0.5);
    return w;
}

/**
 * Lucky Draw: no common drops — its weight is split 40/30/20/10 up the ladder.
 * @param {RarityWeights} weights
 * @returns {RarityWeights} a new object
 */
function luckyDrawFloor(weights) {
    const w = { ...weights };
    const commonWeight = w.common;
    w.common = 0;
    w.uncommon += Math.floor(commonWeight * LUCKY_DRAW_SHARES.uncommon);
    w.rare += Math.floor(commonWeight * LUCKY_DRAW_SHARES.rare);
    w.epic += Math.floor(commonWeight * LUCKY_DRAW_SHARES.epic);
    w.legendary += Math.floor(commonWeight * LUCKY_DRAW_SHARES.legendary);
    return w;
}

/**
 * The composite generateChestRewards applies, in its original order.
 * @param {RarityWeights} weights the balance.js tier weights (not mutated)
 * @param {{ luckyLoot?: boolean, rangerWeight?: number, luckyDraw?: boolean }} mods
 * @returns {RarityWeights} a new object
 */
function applyChestModifiers(weights, mods) {
    let w = { ...weights };
    if (mods && mods.luckyLoot) w = shiftWeights(w, LUCKY_LOOT_SHIFT);
    if (mods && typeof mods.rangerWeight === 'number' && mods.rangerWeight > 0) w = shiftWeights(w, mods.rangerWeight);
    if (mods && mods.luckyDraw) w = luckyDrawFloor(w);
    return w;
}

const CHEST_WEIGHT_LOGIC = Object.freeze({
    LUCKY_LOOT_SHIFT,
    LUCKY_DRAW_SHARES,
    shiftWeights,
    luckyDrawFloor,
    applyChestModifiers
});

export default CHEST_WEIGHT_LOGIC;
