/**
 * Unit Tests for habit-logic.js
 *
 * Roadmap #1, 83rd slice (28th LOGIC module): the pure habit progression math that goal-manager.js's
 * recalculateHabitStreak + toggleHabit delegate to — the LOGIC sibling of habit-render.js, and the
 * HABIT-streak counterpart to streak-logic.js's login streak. Coverage:
 *   - computeHabitStreak: empty history, lapsed streak, today-only, today+yesterday runs, the day-0
 *     grace (streak reaching only yesterday), a gap that stops the walk, the 365-day cap, lastCompleted
 *     presence rules, and no mutation of the input array.
 *   - streakIncrement: the double_streak 2-vs-1 rule.
 *   - milestoneTier: the exact 7/30/100 thresholds and the null default.
 *   - the frozen export surface.
 */

import HABIT_LOGIC from '../habit-logic.js';

// A deterministic date-string harness mirroring the class's dateToLocalString(currentDate) as currentDate
// steps back. `anchor` is "today" as a UTC calendar date; dateStringDaysAgo(n) returns the YYYY-MM-DD string
// n days before it. Built with a fixed anchor so the tests are timezone-independent.
function makeCtx(anchorISO) {
    const anchor = new Date(anchorISO + 'T00:00:00Z');
    const dateStringDaysAgo = (n) => {
        const d = new Date(anchor);
        d.setUTCDate(d.getUTCDate() - n);
        return d.toISOString().slice(0, 10);
    };
    return {
        today: dateStringDaysAgo(0),
        yesterday: dateStringDaysAgo(1),
        dateStringDaysAgo,
    };
}

// Convenience: build an array of the N consecutive day-strings ending at `today` (index 0 = today).
function consecutiveDays(ctx, n) {
    return Array.from({ length: n }, (_, i) => ctx.dateStringDaysAgo(i));
}

describe('habit-logic.js — computeHabitStreak', () => {
    const ctx = makeCtx('2026-06-15');

    test('empty / null history → streak 0, no lastCompleted', () => {
        expect(HABIT_LOGIC.computeHabitStreak([], ctx)).toEqual({ streak: 0 });
        expect(HABIT_LOGIC.computeHabitStreak(null, ctx)).toEqual({ streak: 0 });
        expect(HABIT_LOGIC.computeHabitStreak(undefined, ctx)).toEqual({ streak: 0 });
    });

    test('a lapsed streak (last completion 2+ days ago) → streak 0, no lastCompleted', () => {
        const history = [ctx.dateStringDaysAgo(2), ctx.dateStringDaysAgo(3)];
        expect(HABIT_LOGIC.computeHabitStreak(history, ctx)).toEqual({ streak: 0 });
    });

    test('completed today only → streak 1, lastCompleted today', () => {
        const res = HABIT_LOGIC.computeHabitStreak([ctx.today], ctx);
        expect(res.streak).toBe(1);
        expect(res.lastCompleted).toBe(ctx.today);
    });

    test('a 5-day run ending today → streak 5', () => {
        const history = consecutiveDays(ctx, 5);
        expect(HABIT_LOGIC.computeHabitStreak(history, ctx).streak).toBe(5);
    });

    test('day-0 grace: reached only yesterday (not today) still counts backwards from yesterday', () => {
        // yesterday + the two days before it, today NOT done yet.
        const history = [ctx.dateStringDaysAgo(1), ctx.dateStringDaysAgo(2), ctx.dateStringDaysAgo(3)];
        // Walk skips today (grace), counts yesterday..3-days-ago = 3.
        expect(HABIT_LOGIC.computeHabitStreak(history, ctx).streak).toBe(3);
    });

    test('a gap in the middle stops the walk at the break', () => {
        // today, yesterday present, then a hole at day 2, then day 3 (uncounted).
        const history = [ctx.dateStringDaysAgo(0), ctx.dateStringDaysAgo(1), ctx.dateStringDaysAgo(3)];
        expect(HABIT_LOGIC.computeHabitStreak(history, ctx).streak).toBe(2);
    });

    test('lastCompleted is the newest history entry (sorted desc), even if input is unordered', () => {
        const history = [ctx.dateStringDaysAgo(2), ctx.today, ctx.dateStringDaysAgo(1)];
        const res = HABIT_LOGIC.computeHabitStreak(history, ctx);
        expect(res.streak).toBe(3);
        expect(res.lastCompleted).toBe(ctx.today);
    });

    test('does not mutate the input history array', () => {
        const history = [ctx.dateStringDaysAgo(2), ctx.today, ctx.dateStringDaysAgo(1)];
        const snapshot = [...history];
        HABIT_LOGIC.computeHabitStreak(history, ctx);
        expect(history).toEqual(snapshot);
    });

    test('caps the walk at 365 days even for a longer unbroken run', () => {
        const history = consecutiveDays(ctx, 400);
        expect(HABIT_LOGIC.computeHabitStreak(history, ctx).streak).toBe(365);
    });

    test('handles month/year boundaries via the injected stepper', () => {
        const nyCtx = makeCtx('2026-01-02'); // today = Jan 2, yesterday = Jan 1, day 2 = Dec 31
        const history = consecutiveDays(nyCtx, 3); // Jan 2, Jan 1, Dec 31
        expect(HABIT_LOGIC.computeHabitStreak(history, nyCtx).streak).toBe(3);
    });
});

describe('habit-logic.js — streakIncrement', () => {
    test('2 when double_streak is active, 1 otherwise', () => {
        expect(HABIT_LOGIC.streakIncrement(true)).toBe(2);
        expect(HABIT_LOGIC.streakIncrement(false)).toBe(1);
    });
});

describe('habit-logic.js — milestoneTier', () => {
    test('maps the exact 7 / 30 / 100 thresholds', () => {
        expect(HABIT_LOGIC.milestoneTier(7)).toBe('week');
        expect(HABIT_LOGIC.milestoneTier(30)).toBe('month');
        expect(HABIT_LOGIC.milestoneTier(100)).toBe('life');
    });

    test('returns null for any non-milestone streak', () => {
        [0, 1, 6, 8, 29, 31, 99, 101, 365].forEach(n => {
            expect(HABIT_LOGIC.milestoneTier(n)).toBeNull();
        });
    });
});

describe('habit-logic.js — module surface', () => {
    test('exports a frozen object with the expected members', () => {
        expect(Object.isFrozen(HABIT_LOGIC)).toBe(true);
        expect(typeof HABIT_LOGIC.computeHabitStreak).toBe('function');
        expect(typeof HABIT_LOGIC.streakIncrement).toBe('function');
        expect(typeof HABIT_LOGIC.milestoneTier).toBe('function');
        expect(HABIT_LOGIC.MILESTONES).toEqual({ 7: 'week', 30: 'month', 100: 'life' });
        expect(Object.isFrozen(HABIT_LOGIC.MILESTONES)).toBe(true);
    });

    test('MILESTONES is DERIVED from the streak badges in achievement-definitions.js (criterion-(2) item)', () => {
        const badges = require('../achievement-definitions.js').default.filter(b => b.type === 'streak');
        expect(badges.length).toBe(3);
        const fromCatalog = Object.fromEntries(badges.map(b => [b.target, HABIT_LOGIC.TIER_BY_BADGE[b.id]]));
        expect(HABIT_LOGIC.MILESTONES).toEqual(fromCatalog);
        for (const b of badges) expect(HABIT_LOGIC.milestoneTier(b.target)).toBe(HABIT_LOGIC.TIER_BY_BADGE[b.id]);
    });
});
