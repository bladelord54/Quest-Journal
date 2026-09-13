/**
 * challenge-logic.js — Challenge-a-Friend presets + rules (Roadmap #1, 89th slice).
 *
 * Under test: the PRESETS data contract (ids, fields, trackTypes, defaults ∈ options), findPreset,
 * the difficulty→{xp,gold} table with its medium fallback, challengeProgress across the four
 * shapes (custom / daily / cumulative / delta) incl. the 100 clamp and the missing-target guard,
 * and archiveCompleted's 50-cap (new array, input untouched).
 */
import CL from '../challenge-logic.js';

describe('challenge-logic.js', () => {
    describe('PRESETS', () => {
        test('8 presets with unique ids and a valid trackType', () => {
            expect(CL.PRESETS).toHaveLength(8);
            const ids = CL.PRESETS.map(p => p.id);
            expect(new Set(ids).size).toBe(8);
            for (const p of CL.PRESETS) {
                expect(['daily', 'cumulative', 'delta']).toContain(p.trackType);
                expect(p.title).toContain('{n}');
                expect(typeof p.field).toBe('string');
                expect(p.options).toContain(p.defaults.n);
            }
        });

        test('non-daily presets read the fields challengeProgress understands', () => {
            expect(CL.PRESETS.find(p => p.id === 'login_streak')).toMatchObject({ trackType: 'cumulative', field: 'loginStreak' });
            expect(CL.PRESETS.find(p => p.id === 'defeat_boss')).toMatchObject({ trackType: 'delta', field: 'bossesDefeated' });
        });

        test('frozen — presets, defaults and options cannot be mutated', () => {
            expect(Object.isFrozen(CL.PRESETS)).toBe(true);
            expect(Object.isFrozen(CL.PRESETS[0])).toBe(true);
            expect(Object.isFrozen(CL.PRESETS[0].options)).toBe(true);
            expect(Object.isFrozen(CL.PRESETS[0].defaults)).toBe(true);
        });

        test('findPreset returns the preset or null', () => {
            expect(CL.findPreset('earn_xp').defaults.n).toBe(100);
            expect(CL.findPreset('nope')).toBeNull();
        });
    });

    describe('challengeRewards', () => {
        test.each([
            ['easy', 25, 15],
            ['medium', 50, 30],
            ['hard', 100, 60],
            ['epic', 200, 100]
        ])('%s → %i xp / %i gold', (d, xp, gold) => {
            expect(CL.challengeRewards(d)).toEqual({ xp, gold });
        });

        test('unknown / undefined difficulty falls back to medium', () => {
            expect(CL.challengeRewards('legendary')).toEqual(CL.REWARDS.medium);
            expect(CL.challengeRewards(undefined)).toEqual(CL.REWARDS.medium);
        });
    });

    describe('challengeProgress', () => {
        test('custom challenges are 0/1 on completed', () => {
            expect(CL.challengeProgress({ type: 'custom', completed: false }, {})).toEqual({ current: 0, target: 1, pct: 0 });
            expect(CL.challengeProgress({ type: 'custom', completed: true }, {})).toEqual({ current: 1, target: 1, pct: 100 });
        });

        test('daily reads the tracked field off dailyTracking', () => {
            const ch = { type: 'preset', trackType: 'daily', field: 'tasksCompleted', target: 5 };
            expect(CL.challengeProgress(ch, { dailyTracking: { tasksCompleted: 2 } })).toEqual({ current: 2, target: 5, pct: 40 });
            expect(CL.challengeProgress(ch, { dailyTracking: {} })).toEqual({ current: 0, target: 5, pct: 0 });
            expect(CL.challengeProgress(ch, {})).toEqual({ current: 0, target: 5, pct: 0 });
        });

        test('cumulative reads loginStreak only', () => {
            expect(CL.challengeProgress({ type: 'preset', trackType: 'cumulative', field: 'loginStreak', target: 7 }, { loginStreak: 3 }))
                .toEqual({ current: 3, target: 7, pct: 43 });
            expect(CL.challengeProgress({ type: 'preset', trackType: 'cumulative', field: 'other', target: 7 }, { loginStreak: 3 }).current).toBe(0);
        });

        test('delta subtracts startValue from bossesDefeated', () => {
            const ch = { type: 'preset', trackType: 'delta', field: 'bossesDefeated', target: 3, startValue: 10 };
            expect(CL.challengeProgress(ch, { bossesDefeated: 12 })).toEqual({ current: 2, target: 3, pct: 67 });
            expect(CL.challengeProgress({ ...ch, startValue: undefined }, { bossesDefeated: 1 }).current).toBe(1);
        });

        test('pct clamps at 100 and rounds', () => {
            const ch = { type: 'preset', trackType: 'daily', field: 'xpEarned', target: 100 };
            expect(CL.challengeProgress(ch, { dailyTracking: { xpEarned: 250 } }).pct).toBe(100);
            expect(CL.challengeProgress(ch, { dailyTracking: { xpEarned: 1 } }).pct).toBe(1);
        });

        test('missing target yields pct 0 and never reports current >= target', () => {
            const p = CL.challengeProgress({ type: 'preset', trackType: 'daily', field: 'tasksCompleted' }, { dailyTracking: { tasksCompleted: 4 } });
            expect(p.pct).toBe(0);
            expect(p.current >= p.target).toBe(false);
        });

        test('snapshot may be omitted', () => {
            expect(CL.challengeProgress({ type: 'preset', trackType: 'daily', field: 'x', target: 1 })).toEqual({ current: 0, target: 1, pct: 0 });
        });
    });

    describe('archiveCompleted', () => {
        test('appends and returns a new array; input untouched', () => {
            const history = [{ id: 1 }];
            const next = CL.archiveCompleted(history, { id: 2 });
            expect(next).toEqual([{ id: 1 }, { id: 2 }]);
            expect(next).not.toBe(history);
            expect(history).toHaveLength(1);
        });

        test('caps at COMPLETED_HISTORY_CAP keeping the most recent', () => {
            expect(CL.COMPLETED_HISTORY_CAP).toBe(50);
            const history = Array.from({ length: 50 }, (_, i) => ({ id: i }));
            const next = CL.archiveCompleted(history, { id: 50 });
            expect(next).toHaveLength(50);
            expect(next[0].id).toBe(1);
            expect(next[49].id).toBe(50);
        });

        test('tolerates a missing history', () => {
            expect(CL.archiveCompleted(undefined, { id: 1 })).toEqual([{ id: 1 }]);
        });
    });
});
