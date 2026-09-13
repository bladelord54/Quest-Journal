/**
 * chest-weight-logic.js — chest rarity-weight modifiers (Roadmap #1, 86th slice).
 *
 * Under test: shiftWeights (the de-duplicated Lucky Loot / Ranger block), luckyDrawFloor, the
 * applyChestModifiers composite in generateChestRewards' original order, non-mutation, and a
 * byte-for-byte parity check against the ORIGINAL inline arithmetic across every balance.js chest
 * tier × modifier combination.
 */
import CWL from '../chest-weight-logic.js';
import BALANCE from '../balance.js';

// The original goal-manager.js inline code, transcribed verbatim, as the parity oracle.
function originalInline(base, luckyLoot, rangerWeight, luckyDraw) {
    const weights = { ...base };
    if (luckyLoot) {
        let shift = Math.min(weights.common, 15);
        weights.common -= shift;
        if (shift < 15) {
            const fromUncommon = Math.min(weights.uncommon, 15 - shift);
            weights.uncommon -= fromUncommon;
            shift += fromUncommon;
        }
        weights.rare += Math.ceil(shift * 0.5);
        weights.epic += Math.floor(shift * 0.5);
    }
    if (rangerWeight > 0) {
        let shift = Math.min(weights.common, rangerWeight);
        weights.common -= shift;
        if (shift < rangerWeight) {
            const fromUncommon = Math.min(weights.uncommon, rangerWeight - shift);
            weights.uncommon -= fromUncommon;
            shift += fromUncommon;
        }
        weights.rare += Math.ceil(shift * 0.5);
        weights.epic += Math.floor(shift * 0.5);
    }
    if (luckyDraw) {
        const commonWeight = weights.common;
        weights.common = 0;
        weights.uncommon += Math.floor(commonWeight * 0.4);
        weights.rare += Math.floor(commonWeight * 0.3);
        weights.epic += Math.floor(commonWeight * 0.2);
        weights.legendary += Math.floor(commonWeight * 0.1);
    }
    return weights;
}

const bronze = { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 };
const royal = { common: 5, uncommon: 15, rare: 30, epic: 30, legendary: 20 };
const total = (w) => Object.values(w).reduce((a, b) => a + b, 0);

describe('CHEST_WEIGHT_LOGIC — shape', () => {
    test('frozen namespace with the pinned constants', () => {
        expect(Object.isFrozen(CWL)).toBe(true);
        expect(CWL.LUCKY_LOOT_SHIFT).toBe(15);
        expect(CWL.LUCKY_DRAW_SHARES).toEqual({ uncommon: 0.4, rare: 0.3, epic: 0.2, legendary: 0.1 });
        expect(Object.isFrozen(CWL.LUCKY_DRAW_SHARES)).toBe(true);
    });
});

describe('shiftWeights', () => {
    test('pulls entirely from common when common has enough', () => {
        expect(CWL.shiftWeights(bronze, 15)).toEqual({ common: 35, uncommon: 30, rare: 23, epic: 11, legendary: 1 });
    });

    test('pulls the remainder from uncommon when common runs short', () => {
        // royal: 5 from common, 10 from uncommon → 15 total, 8 rare / 7 epic
        expect(CWL.shiftWeights(royal, 15)).toEqual({ common: 0, uncommon: 5, rare: 38, epic: 37, legendary: 20 });
    });

    test('caps at what common + uncommon can supply', () => {
        expect(CWL.shiftWeights({ common: 2, uncommon: 3, rare: 0, epic: 0, legendary: 0 }, 100))
            .toEqual({ common: 0, uncommon: 0, rare: 3, epic: 2, legendary: 0 });
    });

    test('odd amounts round the extra point to rare (ceil) not epic (floor)', () => {
        const w = CWL.shiftWeights(bronze, 7);
        expect(w.rare - bronze.rare).toBe(4);
        expect(w.epic - bronze.epic).toBe(3);
    });

    test('preserves total weight', () => {
        for (const amt of [0, 1, 7, 12, 15, 40, 100]) {
            expect(total(CWL.shiftWeights(bronze, amt))).toBe(total(bronze));
            expect(total(CWL.shiftWeights(royal, amt))).toBe(total(royal));
        }
    });

    test('amount <= 0 / NaN / undefined returns an unchanged copy', () => {
        expect(CWL.shiftWeights(bronze, 0)).toEqual(bronze);
        expect(CWL.shiftWeights(bronze, -5)).toEqual(bronze);
        expect(CWL.shiftWeights(bronze, NaN)).toEqual(bronze);
        expect(CWL.shiftWeights(bronze, undefined)).toEqual(bronze);
    });

    test('does not mutate its input and returns a new object', () => {
        const input = { ...bronze };
        const out = CWL.shiftWeights(input, 15);
        expect(input).toEqual(bronze);
        expect(out).not.toBe(input);
    });
});

describe('luckyDrawFloor', () => {
    test('zeroes common and splits it 40/30/20/10 (floored)', () => {
        expect(CWL.luckyDrawFloor(bronze)).toEqual({ common: 0, uncommon: 50, rare: 30, epic: 14, legendary: 6 });
    });

    test('flooring can lose weight on small common values (matches the original)', () => {
        // common 5: 2 + 1 + 1 + 0 = 4 redistributed, 1 point lost — the inline code did this too.
        const w = CWL.luckyDrawFloor(royal);
        expect(w).toEqual({ common: 0, uncommon: 17, rare: 31, epic: 31, legendary: 20 });
        expect(total(w)).toBe(total(royal) - 1);
    });

    test('does not mutate its input', () => {
        const input = { ...bronze };
        CWL.luckyDrawFloor(input);
        expect(input).toEqual(bronze);
    });
});

describe('applyChestModifiers', () => {
    test('no modifiers → an equal copy', () => {
        const out = CWL.applyChestModifiers(bronze, {});
        expect(out).toEqual(bronze);
        expect(out).not.toBe(bronze);
        expect(CWL.applyChestModifiers(bronze, undefined)).toEqual(bronze);
    });

    test('lucky loot alone = shiftWeights(15)', () => {
        expect(CWL.applyChestModifiers(bronze, { luckyLoot: true })).toEqual(CWL.shiftWeights(bronze, 15));
    });

    test('ranger alone = shiftWeights(perk); non-positive / non-numeric perk is ignored', () => {
        expect(CWL.applyChestModifiers(bronze, { rangerWeight: 12 })).toEqual(CWL.shiftWeights(bronze, 12));
        expect(CWL.applyChestModifiers(bronze, { rangerWeight: 0 })).toEqual(bronze);
        expect(CWL.applyChestModifiers(bronze, { rangerWeight: '12' })).toEqual(bronze);
    });

    test('lucky loot + ranger stack additively (15 + 12 = 27 points)', () => {
        expect(CWL.applyChestModifiers(bronze, { luckyLoot: true, rangerWeight: 12 }))
            .toEqual(CWL.shiftWeights(bronze, 27));
    });

    test('lucky draw runs LAST, on the already-shifted weights', () => {
        const shifted = CWL.shiftWeights(bronze, 15);
        expect(CWL.applyChestModifiers(bronze, { luckyLoot: true, luckyDraw: true }))
            .toEqual(CWL.luckyDrawFloor(shifted));
    });

    test('parity: identical to the original inline arithmetic for every balance tier × modifier combo', () => {
        const tiers = BALANCE.loot.chestRarityWeights;
        expect(Object.keys(tiers).length).toBeGreaterThan(0);
        for (const [tier, base] of Object.entries(tiers)) {
            for (const luckyLoot of [false, true]) {
                for (const rangerWeight of [0, 12]) {
                    for (const luckyDraw of [false, true]) {
                        const expected = originalInline(base, luckyLoot, rangerWeight, luckyDraw);
                        const actual = CWL.applyChestModifiers(base, { luckyLoot, rangerWeight, luckyDraw });
                        expect([tier, luckyLoot, rangerWeight, luckyDraw, actual])
                            .toEqual([tier, luckyLoot, rangerWeight, luckyDraw, expected]);
                    }
                }
            }
        }
    });
});
