// @ts-check
'use strict';
import ACHIEVEMENT_DEFINITIONS from './achievement-definitions.js';
/**
 * habit-logic.js — pure habit progression math (Engineering Roadmap #1).
 *
 * 83rd incremental slice of the goal-manager.js God class, and the TWENTY-EIGHTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic / reminder-schedule-logic / enchantment-lifecycle / bounty-logic / recurring-logic /
 * save-serializer / load-deserializer / daily-quest-logic / wooden-chest-loot / quest-chain-logic pattern).
 * It is the LOGIC sibling of the habit RENDER module (`habit-render.js`) — the view was extracted earlier,
 * the progression math it visualises now follows, the same view-then-logic split the daily-board and
 * quest-chain pairs used.
 *
 * NOTE — this is the HABIT-streak counterpart to `streak-logic.js`, which owns the daily-LOGIN streak. They
 * are separate features (login streak = one per player, gap-tolerant with shields; habit streak = one per
 * habit, recomputed from a completion-history array), so they live in separate modules rather than one.
 *
 * The PURE functions:
 *
 *   - computeHabitStreak(completionHistory, { today, yesterday, dateStringDaysAgo }) — the consecutive-day
 *     count behind `recalculateHabitStreak`. Sorts the history newest-first, returns { streak: 0 } when the
 *     history is empty OR neither today nor yesterday is present (streak lapsed), otherwise walks backwards
 *     from today counting consecutive completed days (with the SAME one-day grace for an as-yet-uncompleted
 *     today) and returns { streak, lastCompleted }. The `dateStringDaysAgo(n)` seam mirrors the class's
 *     `dateToLocalString(currentDate)` as currentDate steps back — see the byte-faithful lift note below.
 *   - streakIncrement(doubleStreakActive) — the Precision enchantment (`double_streak`) rule: a completed
 *     habit advances the streak by 2 when it is active, 1 otherwise. Used by `toggleHabit`.
 *   - milestoneTier(streak) — names the 7 / 30 / 100-day thresholds `toggleHabit` fires special
 *     achievements at: 'week' | 'month' | 'life' | null. The thresholds are DERIVED from the `streak`-type
 *     badges in achievement-definitions.js (week_warrior / month_master / centurion), so the habit
 *     celebration and the badge that goes with it cannot drift (criterion-(2) item, Sep 2026).
 *
 * BYTE-FAITHFUL LIFT NOTE (computeHabitStreak): the original walked a mutable `currentDate = new Date()`
 * backwards, deriving the compared day string each iteration via `dateToLocalString(currentDate)`, and only
 * stepped the date back on a match OR on the day-0 today-grace `continue`. This module tracks that same step
 * count as `daysBack` and asks the injected `dateStringDaysAgo(daysBack)` for the string, so it is identical
 * to the inline loop day-for-day (the caller supplies today = dateStringDaysAgo(0), yesterday =
 * dateStringDaysAgo(1)). `lastCompleted` is only present on the counted-streak return, exactly as the inline
 * code only assigned `habit.lastCompleted` in that branch (the two streak-0 early returns left it untouched).
 *
 * Everything impure stays on the class: `getTodayDateString`/`dateToLocalString`/`new Date()` at the call
 * sites, the `habit.streak`/`habit.lastCompleted` writes, the reward grants + refunds, audio/effects,
 * showAchievement/share prompts, saveData and the re-renders.
 *
 * Dual-environment, no bundler (mirrors streak-logic.js and the other logic modules):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.HABIT_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./habit-logic.js') returns the frozen object via module.exports (and also sets
 *     window.HABIT_LOGIC under jsdom).
 */

/**
 * @typedef {{ today: string, yesterday: string, dateStringDaysAgo: (n: number) => string }} StreakCtx
 */

/** Which milestone tier each `streak`-type badge celebrates. */
const TIER_BY_BADGE = Object.freeze({ week_warrior: 'week', month_master: 'month', centurion: 'life' });

/**
 * Habit-streak milestone day thresholds → tier name, derived from the streak badges' `target`s so
 * the 7 / 30 / 100 live in ONE place (the badge catalog).
 * @type {Readonly<Record<number, 'week'|'month'|'life'>>}
 */
const MILESTONES = Object.freeze(
    /** @type {any[]} */ (ACHIEVEMENT_DEFINITIONS)
        .filter(b => b && b.type === 'streak' && TIER_BY_BADGE[/** @type {keyof typeof TIER_BY_BADGE} */ (b.id)])
        .reduce((acc, b) => {
            acc[b.target] = TIER_BY_BADGE[/** @type {keyof typeof TIER_BY_BADGE} */ (b.id)];
            return acc;
        }, /** @type {Record<number, 'week'|'month'|'life'>} */ ({}))
);

/**
 * The consecutive-day habit streak from a completion history. PURE — no clock read; `today`, `yesterday`
 * and the `dateStringDaysAgo(n)` day-stepper are injected (see the module header's byte-faithful note).
 * @param {string[]|null|undefined} completionHistory YYYY-MM-DD strings
 * @param {StreakCtx} ctx
 * @returns {{ streak: number, lastCompleted?: string }}
 */
function computeHabitStreak(completionHistory, ctx) {
    const sortedHistory = [...(completionHistory || [])].sort((a, b) =>
        /** @type {any} */ (new Date(b)) - /** @type {any} */ (new Date(a))
    );

    if (sortedHistory.length === 0) return { streak: 0 };

    const { today, yesterday, dateStringDaysAgo } = ctx;

    // Streak is only live if it reaches today or yesterday.
    if (!sortedHistory.includes(today) && !sortedHistory.includes(yesterday)) {
        return { streak: 0 };
    }

    let streak = 0;
    let daysBack = 0;
    for (let i = 0; i < 365; i++) { // Max 365 day streak check
        const dateStr = dateStringDaysAgo(daysBack);
        if (sortedHistory.includes(dateStr)) {
            streak++;
            daysBack++;
        } else {
            // Allow one skip if we're on day 0 (today) and yesterday was completed.
            if (i === 0 && dateStr === today) {
                daysBack++;
                continue;
            }
            break;
        }
    }

    return { streak, lastCompleted: sortedHistory[0] };
}

/**
 * How many days a completed habit advances the streak: 2 with the Precision enchantment (`double_streak`)
 * active, 1 otherwise. PURE.
 * @param {boolean} doubleStreakActive
 * @returns {number}
 */
function streakIncrement(doubleStreakActive) {
    return doubleStreakActive ? 2 : 1;
}

/**
 * The milestone tier a streak length hits, or null: 7 → 'week', 30 → 'month', 100 → 'life'. Only the
 * exact thresholds count (matching toggleHabit's `=== 7 / 30 / 100` branch). PURE.
 * @param {number} streak
 * @returns {'week'|'month'|'life'|null}
 */
function milestoneTier(streak) {
    const table = /** @type {Record<number, 'week'|'month'|'life'>} */ (MILESTONES);
    return table[streak] || null;
}

const HABIT_LOGIC = Object.freeze({
    MILESTONES,
    TIER_BY_BADGE,
    computeHabitStreak,
    streakIncrement,
    milestoneTier,
});


// Node / Jest

export default HABIT_LOGIC;
