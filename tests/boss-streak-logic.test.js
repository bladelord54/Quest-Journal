/**
 * boss-streak-logic.js — boss-defeat streak reward multiplier (Roadmap #1, 87th slice).
 *
 * Under test: streakForBossType (the de-duplicated daily/weekly/monthly ternary chain),
 * streakMultiplier (the "+10% per streak, capped at +100%" formula), applyStreakBonus (the
 * shared rounded apply step), and a byte-for-byte parity check against the ORIGINAL inline
 * arithmetic from onBossDefeated.
 */
import BSL from '../boss-streak-logic.js';

// The original goal-manager.js inline code, transcribed verbatim, as the parity oracle.
function originalInline(bossType, streaks, xp, gold) {
    const streak = bossType === 'daily' ? streaks.daily : bossType === 'weekly' ? streaks.weekly : streaks.monthly;
    const streakMultiplier = 1 + Math.min(streak - 1, 10) * 0.1; // +10% per streak, max +100%
    return {
        xpReward: Math.round(xp * streakMultiplier),
        goldReward: Math.round(gold * streakMultiplier)
    };
}

describe('BOSS_STREAK_LOGIC — shape', () => {
    test('frozen namespace with the pinned constants', () => {
        expect(Object.isFrozen(BSL)).toBe(true);
        expect(BSL.STREAK_BONUS_PER_KILL).toBe(0.1);
        expect(BSL.MAX_STREAK_BONUS_STACKS).toBe(10);
        expect(BSL.DEFEATED_HISTORY_CAP).toBe(50);
    });
});

describe('archiveDefeated', () => {
    const entry = (n) => ({ name: `Boss ${n}` });

    test('prepends the new record (newest first)', () => {
        const out = BSL.archiveDefeated([entry(1)], entry(2));
        expect(out.map(e => e.name)).toEqual(['Boss 2', 'Boss 1']);
    });

    test('trims to the newest DEFEATED_HISTORY_CAP records, dropping the oldest', () => {
        const full = Array.from({ length: 50 }, (_, i) => entry(i));
        const out = BSL.archiveDefeated(full, entry('new'));
        expect(out).toHaveLength(50);
        expect(out[0].name).toBe('Boss new');
        expect(out[49].name).toBe('Boss 48');
    });

    test('does not mutate the input list and returns a new array', () => {
        const input = [entry(1)];
        const out = BSL.archiveDefeated(input, entry(2));
        expect(input).toEqual([entry(1)]);
        expect(out).not.toBe(input);
    });

    test('null/undefined history is treated as empty', () => {
        expect(BSL.archiveDefeated(null, entry(1))).toEqual([entry(1)]);
        expect(BSL.archiveDefeated(undefined, entry(1))).toEqual([entry(1)]);
    });
});

describe('streakForBossType', () => {
    const streaks = { daily: 3, weekly: 7, monthly: 2 };

    test('picks the matching cadence counter', () => {
        expect(BSL.streakForBossType('daily', streaks)).toBe(3);
        expect(BSL.streakForBossType('weekly', streaks)).toBe(7);
        expect(BSL.streakForBossType('monthly', streaks)).toBe(2);
    });

    test('missing counter on the streaks object defaults to 0', () => {
        expect(BSL.streakForBossType('daily', {})).toBe(0);
        expect(BSL.streakForBossType('weekly', { daily: 5 })).toBe(0);
    });

    test('null/undefined streaks object returns 0', () => {
        expect(BSL.streakForBossType('daily', null)).toBe(0);
        expect(BSL.streakForBossType('daily', undefined)).toBe(0);
    });

    test('unknown boss type returns 0', () => {
        expect(BSL.streakForBossType('yearly', streaks)).toBe(0);
    });
});

describe('streakMultiplier', () => {
    test('a fresh kill (streak 1) is the 1.0x baseline', () => {
        expect(BSL.streakMultiplier(1)).toBe(1);
    });

    test('streak 0 follows the same linear formula down to 0.9x (never hit in production — onBossDefeated increments the counter before computing the multiplier)', () => {
        expect(BSL.streakMultiplier(0)).toBeCloseTo(0.9);
    });

    test('+10% per consecutive kill beyond the first', () => {
        expect(BSL.streakMultiplier(2)).toBeCloseTo(1.1);
        expect(BSL.streakMultiplier(3)).toBeCloseTo(1.2);
        expect(BSL.streakMultiplier(5)).toBeCloseTo(1.4);
    });

    test('caps at +100% (streak 11) and holds beyond it', () => {
        expect(BSL.streakMultiplier(11)).toBeCloseTo(2.0);
        expect(BSL.streakMultiplier(20)).toBeCloseTo(2.0);
        expect(BSL.streakMultiplier(1000)).toBeCloseTo(2.0);
    });

    test('falsy streak (undefined/NaN) is treated as 0, same as an explicit 0', () => {
        expect(BSL.streakMultiplier(undefined)).toBeCloseTo(BSL.streakMultiplier(0));
        expect(BSL.streakMultiplier(NaN)).toBeCloseTo(BSL.streakMultiplier(0));
    });
});

describe('applyStreakBonus', () => {
    test('rounds the multiplied amount to the nearest whole unit', () => {
        expect(BSL.applyStreakBonus(500, 1.4)).toBe(700);
        expect(BSL.applyStreakBonus(150, 1.25)).toBe(188); // 187.5 rounds up
        expect(BSL.applyStreakBonus(100, 1)).toBe(100);
    });

    test('falsy amount is treated as 0', () => {
        expect(BSL.applyStreakBonus(undefined, 1.5)).toBe(0);
        expect(BSL.applyStreakBonus(0, 2)).toBe(0);
    });
});

describe('parity with the original inline arithmetic', () => {
    test('identical XP/gold rewards across boss types, streak values and reward amounts', () => {
        const streaks = { daily: 0, weekly: 0, monthly: 0 };
        for (const bossType of ['daily', 'weekly', 'monthly']) {
            for (const streak of [0, 1, 2, 3, 7, 10, 11, 15, 50]) {
                for (const [xp, gold] of [[500, 400], [150, 80], [1, 1], [0, 0]]) {
                    streaks.daily = streaks.weekly = streaks.monthly = streak;
                    const expected = originalInline(bossType, streaks, xp, gold);

                    const actualStreak = BSL.streakForBossType(bossType, streaks);
                    const multiplier = BSL.streakMultiplier(actualStreak);
                    const actual = {
                        xpReward: BSL.applyStreakBonus(xp, multiplier),
                        goldReward: BSL.applyStreakBonus(gold, multiplier)
                    };

                    expect([bossType, streak, xp, gold, actual]).toEqual([bossType, streak, xp, gold, expected]);
                }
            }
        }
    });
});
