/**
 * Unit Tests for wooden-chest-loot.js
 *
 * Roadmap #1, 81st slice (26th LOGIC module): the daily free Wooden Chest loot table + weighted pick that
 * goal-manager.js's claimWoodenChest delegates to — the SECOND hand-rolled weighted-pick loop in the
 * codebase, lifted out so it can't drift from loot-engine.js's. Coverage:
 *   - the frozen 8-entry table + its exact weights (byte-identical to the old inline literal).
 *   - weightedPick lands on the right entry across cumulative-weight boundaries, using an injected rng.
 *   - the first-entry (table[0]) float-drift fallback is preserved verbatim.
 *   - the DELIBERATE divergence from LOOT_ENGINE.weightedRandomSelect (last-item fallback) is pinned.
 */

import WOODEN_CHEST_LOOT from '../wooden-chest-loot.js';
import LOOT_ENGINE from '../loot-engine.js';

const TABLE = WOODEN_CHEST_LOOT.TABLE;
const TOTAL_WEIGHT = TABLE.reduce((s, i) => s + i.weight, 0); // 100 (30+18+22+8+8+5+5+4)

// A fixed rng() that makes `rng() * TOTAL_WEIGHT === target`, so tests can aim at an exact roll value.
const rngForRoll = (target) => () => target / TOTAL_WEIGHT;

describe('wooden-chest-loot.js — TABLE', () => {
    test('is frozen (table and every entry)', () => {
        expect(Object.isFrozen(WOODEN_CHEST_LOOT)).toBe(true);
        expect(Object.isFrozen(TABLE)).toBe(true);
        TABLE.forEach(entry => expect(Object.isFrozen(entry)).toBe(true));
    });

    test('is the byte-identical 8-entry table with weights totalling 105', () => {
        expect(TABLE).toEqual([
            { type: 'gold', amount: 15, weight: 30, label: '15 Gold' },
            { type: 'gold', amount: 25, weight: 18, label: '25 Gold' },
            { type: 'xp', amount: 20, weight: 22, label: '20 XP' },
            { type: 'xp', amount: 35, weight: 8, label: '35 XP' },
            { type: 'charges', amount: 1, weight: 8, label: '1 Attack Charge' },
            { type: 'shards', amount: 5, weight: 5, label: '5 Crystal Shards' },
            { type: 'spell', spellId: 'minor_wisdom', amount: 1, weight: 5, label: '📚 Minor Wisdom Spell' },
            { type: 'spell', spellId: 'copper_blessing', amount: 1, weight: 4, label: '🪙 Copper Blessing Spell' },
        ]);
        expect(TOTAL_WEIGHT).toBe(100);
    });
});

describe('wooden-chest-loot.js — weightedPick', () => {
    test('a roll of 0 lands on the first entry', () => {
        expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rngForRoll(0))).toBe(TABLE[0]);
    });

    test('lands within the first weight window (0 < roll <= 30 -> entry 0)', () => {
        expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rngForRoll(30))).toBe(TABLE[0]);
    });

    test('crossing into the second window (roll 31 -> entry 1)', () => {
        // cumulative: entry0 covers (0,30], entry1 covers (30,48]
        expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rngForRoll(31))).toBe(TABLE[1]);
        expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rngForRoll(48))).toBe(TABLE[1]);
    });

    test('lands on each entry at the midpoint of its cumulative window', () => {
        // cumulative upper bounds: 30, 48, 70, 78, 86, 91, 96, 100 (weights 30,18,22,8,8,5,5,4)
        const bounds = [];
        let acc = 0;
        TABLE.forEach(e => { acc += e.weight; bounds.push(acc); });
        // midpoint of each window rolls that entry
        let lower = 0;
        TABLE.forEach((entry, idx) => {
            const mid = (lower + bounds[idx]) / 2;
            expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rngForRoll(mid))).toBe(entry);
            lower = bounds[idx];
        });
    });

    test('the last spell entry is reachable near the top of the range', () => {
        expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rngForRoll(TOTAL_WEIGHT))).toBe(TABLE[TABLE.length - 1]);
    });

    test('reproduces the original inline loop byte-for-byte across many rolls', () => {
        const inlinePick = (table, rng) => {
            const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
            let roll = rng() * totalWeight;
            let reward = table[0];
            for (const item of table) {
                roll -= item.weight;
                if (roll <= 0) { reward = item; break; }
            }
            return reward;
        };
        for (let i = 0; i <= 100; i++) {
            const rng = () => i / 100;
            expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rng)).toBe(inlinePick(TABLE, rng));
        }
    });
});

describe('wooden-chest-loot.js — float-drift fallback', () => {
    // An rng() returning >= 1 makes `roll` start at/above TOTAL_WEIGHT, so the running roll never reaches
    // <= 0 and the loop never breaks — the seeded `table[0]` is returned. (roll = rng()*105 > 105.)
    test('a roll past the total falls back to the FIRST entry (table[0])', () => {
        const overshoot = () => 1.0001; // roll = 105.0105, never hits <= 0
        expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, overshoot)).toBe(TABLE[0]);
    });
});

describe('wooden-chest-loot.js — deliberate divergence from loot-engine.js', () => {
    // Both are cumulative-weight picks, but their float-drift fallbacks differ ON PURPOSE:
    // wooden-chest seeds table[0] (returns FIRST on overshoot); loot-engine returns items[last].
    // This pins the disagreement so the two are consciously different, not accidentally drifted.
    test('on an overshooting roll, wooden returns the FIRST entry while loot-engine returns the LAST', () => {
        const overshoot = () => 1.0001;
        const woodenPick = WOODEN_CHEST_LOOT.weightedPick(TABLE, overshoot);
        const enginePick = LOOT_ENGINE.weightedRandomSelect(TABLE, overshoot);
        expect(woodenPick).toBe(TABLE[0]);
        expect(enginePick).toBe(TABLE[TABLE.length - 1]);
        expect(woodenPick).not.toBe(enginePick);
    });

    test('within range the two agree (only the fallback edge differs)', () => {
        for (let i = 0; i < 100; i++) {
            const rng = () => i / 100;
            expect(WOODEN_CHEST_LOOT.weightedPick(TABLE, rng))
                .toBe(LOOT_ENGINE.weightedRandomSelect(TABLE, rng));
        }
    });
});
