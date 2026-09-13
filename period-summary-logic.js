// @ts-check
'use strict';
/**
 * period-summary-logic.js — pure previous-period recap math (Engineering Roadmap #1).
 *
 * 70th incremental slice of the goal-manager.js God class, and the EIGHTEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle pattern).
 *
 * The module holds BOTH halves of period tracking. This docblock covers the RECAP MATH (70th slice);
 * the 71st slice added the period-transition DETECTION that decides whether that recap is shown at
 * all — see the section banner further down, above `isoWeekNumber`.
 *
 * `generatePreviousPeriodSummary(period)` was ~100 lines of date-range math plus stat aggregation with
 * ZERO test coverage, and it is NOT a single-caller helper — FIVE call sites depend on it:
 *
 *   1. showPeriodTransitionSlideshow  — the new-week/month/year transition slideshow
 *   2. generateWeeklyRecapCard        — the shareable recap canvas
 *   3. shareWeeklyRecap               — the navigator.share payload
 *   4. showWeeklyRecapPreview         — the recap modal
 *   5. shareRecapToPlatform           — per-platform share
 *
 * …and three of those (3, 4, 5) each HAND-WROTE the identical share sentence
 * `Completed ${n} tasks this week with a ${r}% completion rate! #LifeQuestJournal`. That is the same
 * duplicated-knowledge shape as the July 2026 loot bug that started this roadmap item: change the wording
 * or the stat in one place and the other two silently drift. `recapShareText` is now the single source.
 *
 * The date math is the drift-prone part and is now independently testable:
 *   - week  — the PREVIOUS Monday–Sunday. Sunday is treated as day 7 (`dayOfWeek === 0 ? 6 : dayOfWeek - 1`),
 *             so the week is Monday-start, not the JS default Sunday-start.
 *   - month — the previous calendar month, whose end uses the `new Date(y, m, 0)` day-0 trick (the last day
 *             of the preceding month), so it is leap-year correct without a length table.
 *   - year  — Jan 1 to Dec 31 of the previous year.
 *
 * TWO DATE FORMATS are deliberately preserved, because callers depend on both:
 *   - `startDate`/`endDate` are display strings (MM/DD/YYYY) built from the raw Date getters.
 *   - `endDateISO` goes through the caller's timezone-aware `dateToLocalString`, which is INJECTED
 *     (it reads the user's configured offset off the instance, so it cannot move into a pure module).
 *
 * Shape quirks kept verbatim so the five callers are unaffected:
 *   - `tasks.incomplete` / `goals.incomplete` are the ARRAYS of the incomplete records, not counts,
 *     while `tasks.completed` / `goals.completed` ARE counts. Asymmetric, but load-bearing.
 *   - `habits.total` is the TOTAL number of habits, not the number active in the period; only
 *     `habits.completions` is period-filtered.
 *   - `completionRate` is a whole-number percent guarded to 0 on an empty set.
 *   - An unrecognised `period` leaves the range undefined exactly as before — deliberately NOT
 *     "fixed" here, since inventing a fallback would be a behaviour change, not a refactor.
 *
 * Impure work stays on the class: `getTodayDateString()`, `dateToLocalString`, reading
 * `dailyTasks`/`habits`/`weeklyGoals`/`monthlyGoals`/`yearlyGoals`, and every DOM/canvas/share side effect.
 *
 * Dual-environment, no bundler (mirrors spell-lifecycle.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.PERIOD_SUMMARY_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./period-summary-logic.js') returns the frozen object via module.exports (and
 *     also sets window.PERIOD_SUMMARY_LOGIC under jsdom).
 */

/**
 * XP weights used by the recap's headline `xpEarned` figure.
 *
 * NOTE: these are RECAP ESTIMATES, not the live reward ledger — the real award path
 * (reward-economy.js / addXP) applies buffs, perks and multipliers. They were inline
 * literals before this slice and are reproduced verbatim; centralising them here at
 * least makes the estimate visible in one place.
 */
const PERIOD_XP = Object.freeze({
    task: 10,
    week: 50,
    month: 200,
    year: 1000,
});

const MONTH_NAMES = Object.freeze([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]);

/**
 * Format a Date as MM/DD/YYYY using its LOCAL calendar fields.
 * @param {Date} d
 * @returns {string}
 */
function formatDisplayDate(d) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * The calendar range of the period IMMEDIATELY BEFORE the one containing `today`.
 * Returns undefined fields for an unrecognised period (preserved legacy behaviour).
 * @param {'week'|'month'|'year'|string} period
 * @param {Date} today
 * @returns {{ startDate: Date|undefined, endDate: Date|undefined, periodName: string|undefined }}
 */
function previousPeriodRange(period, today) {
    /** @type {Date|undefined} */ let startDate;
    /** @type {Date|undefined} */ let endDate;
    /** @type {string|undefined} */ let periodName;

    if (period === 'week') {
        // Monday-start week: Sunday (0) is the 7th day, so it is 6 days from Monday.
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() - daysFromMonday);
        startDate = new Date(thisMonday);
        startDate.setDate(thisMonday.getDate() - 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        periodName = 'Last Week';
    } else if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        // Day 0 of THIS month === the last day of the previous month (leap-year safe).
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        periodName = MONTH_NAMES[startDate.getMonth()] + ' ' + startDate.getFullYear();
    } else if (period === 'year') {
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        periodName = (today.getFullYear() - 1).toString();
    }

    return { startDate, endDate, periodName };
}

/**
 * Whole-number completion percent, 0 for an empty set.
 * @param {number} completed
 * @param {number} total
 * @returns {number}
 */
function completionRate(completed, total) {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * The `{ total, completed, incomplete, completionRate }` block shared by tasks and goals.
 * `incomplete` is the ARRAY of records (legacy shape), `completed` is a COUNT.
 * @param {Array<{completed?: boolean}>} items
 * @returns {{ total: number, completed: number, incomplete: Array<any>, completionRate: number }}
 */
function buildStatBlock(items) {
    const list = items || [];
    const completed = list.filter(i => i.completed);
    const incomplete = list.filter(i => !i.completed);
    return {
        total: list.length,
        completed: completed.length,
        incomplete,
        completionRate: completionRate(completed.length, list.length),
    };
}

/**
 * Total habit completions whose recorded ISO date falls inside [startISO, endISO].
 * Habits with no `completionHistory` contribute 0.
 * @param {Array<{completionHistory?: string[]}>} habits
 * @param {string} startISO
 * @param {string} endISO
 * @returns {number}
 */
function countHabitCompletions(habits, startISO, endISO) {
    return (habits || []).reduce((total, h) => {
        if (!h.completionHistory) return total;
        return total + h.completionHistory.filter(d => d >= startISO && d <= endISO).length;
    }, 0);
}

/**
 * The recap's estimated XP: completed tasks at the flat task rate plus completed goals at the
 * period's goal rate. An unrecognised period falls back to the yearly rate, matching the original
 * `period === 'week' ? 50 : period === 'month' ? 200 : 1000` ternary chain.
 * @param {string} period
 * @param {number} completedTasks
 * @param {number} completedGoals
 * @returns {number}
 */
function estimatedXP(period, completedTasks, completedGoals) {
    const xpPerGoal = period === 'week' ? PERIOD_XP.week
        : period === 'month' ? PERIOD_XP.month
        : PERIOD_XP.year;
    return (completedTasks * PERIOD_XP.task) + (completedGoals * xpPerGoal);
}

/**
 * Build the whole previous-period summary object the five callers consume.
 *
 * @param {object} args
 * @param {string} args.period                       'week' | 'month' | 'year'
 * @param {Date} args.today                          the reference date (caller supplies it)
 * @param {(d: Date) => string} args.dateToLocalString timezone-aware ISO formatter (INJECTED)
 * @param {Array<any>} args.dailyTasks
 * @param {Array<any>} args.habits
 * @param {Array<any>} args.periodGoals              the goal array matching `period`
 * @returns {object}
 */
function summarize({ period, today, dateToLocalString, dailyTasks, habits, periodGoals }) {
    const { startDate, endDate, periodName } = previousPeriodRange(period, today);

    const startISO = dateToLocalString(/** @type {Date} */ (startDate));
    const endISO = dateToLocalString(/** @type {Date} */ (endDate));

    const periodTasks = (dailyTasks || []).filter(t => t.dueDate >= startISO && t.dueDate <= endISO);
    const tasks = buildStatBlock(periodTasks);
    const goals = buildStatBlock(periodGoals || []);

    return {
        period,
        periodName,
        startDate: formatDisplayDate(/** @type {Date} */ (startDate)),
        endDate: formatDisplayDate(/** @type {Date} */ (endDate)),
        endDateISO: endISO,
        tasks,
        goals,
        habits: {
            total: (habits || []).length,
            completions: countHabitCompletions(habits, startISO, endISO),
        },
        xpEarned: estimatedXP(period, tasks.completed, goals.completed),
    };
}

/**
 * The weekly-recap share sentence. Previously hand-written at THREE call sites
 * (shareWeeklyRecap, showWeeklyRecapPreview, shareRecapToPlatform).
 * @param {{ tasks: { completed: number, completionRate: number } }} summary
 * @returns {string}
 */
function recapShareText(summary) {
    return `Completed ${summary.tasks.completed} tasks this week with a ${summary.tasks.completionRate}% completion rate! #LifeQuestJournal`;
}

// ---------------------------------------------------------------------------------------------
// PERIOD TRANSITION DETECTION (71st slice)
//
// "Has a new week/month/year begun since the user was last here?" — the detection that decides
// whether the recap slideshow above is shown at all. Previously inline in checkPeriodTransitions()
// with zero coverage, sitting directly on top of the (now pure) range math.
// ---------------------------------------------------------------------------------------------

/**
 * Transition significance, most significant first. The detector pushes in this same order, so
 * `mainTransition` is currently equivalent to `transitions[0]` — the explicit priority is kept
 * because it encodes the INTENT ("year beats month beats week") independently of push order.
 */
const TRANSITION_PRIORITY = Object.freeze(['year', 'month', 'week']);

/**
 * ISO-8601 week number (1–53) for `date`, computed in UTC off the date's LOCAL calendar fields
 * so a local-midnight/noon Date is not shifted across a boundary.
 *
 * Returns the ISO week NUMBER only, NOT the ISO week-YEAR — so a late-December date can return 1
 * (e.g. 2025-12-29 → 1, since ISO week 1 of 2026 starts that Monday) and an early-January date
 * can return 53 (2021-01-01 → 53). `detectTransitions` therefore CANNOT compare week numbers
 * alone; it also compares the calendar year, which is what its `lastYear !== currentYear` clause
 * is for. Preserved verbatim from the original `getWeekNumber`.
 *
 * @param {Date} date
 * @returns {number}
 */
function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((/** @type {any} */ (d) - /** @type {any} */ (yearStart)) / 86400000) + 1) / 7);
}

/**
 * The last-seen stamp persisted after every visit: the four `last*` tracking fields.
 * `lastMonth` is 0-INDEXED (January === 0), which is why the load path must use `??` and not
 * `||` — see the note in goal-manager.js loadData().
 *
 * @param {string} todayString  timezone-aware YYYY-MM-DD from the caller
 * @param {Date} today          the same day as a Date (caller parses at noon)
 * @returns {{ lastVisitDate: string, lastWeekNumber: number, lastMonth: number, lastYear: number }}
 */
function periodStamp(todayString, today) {
    return {
        lastVisitDate: todayString,
        lastWeekNumber: isoWeekNumber(today),
        lastMonth: today.getMonth(),
        lastYear: today.getFullYear(),
    };
}

/**
 * Which period boundaries have been crossed since the last visit, most significant first.
 *
 * Each check is SKIPPED when its stored field is null (a user who has never been stamped for
 * that unit must not get a spurious recap). Semantics preserved verbatim, including:
 *   - YEAR uses a strict `<`, so a BACKWARDS clock (stored year ahead of today) reports no year
 *     transition — deliberately not "fixed" here.
 *   - MONTH and WEEK also fire when the calendar YEAR differs, which is what makes them correct
 *     across a New Year even when the month index or ISO week number happens to repeat.
 *   - The guards test `!== null` specifically, so an `undefined` field would fall THROUGH and be
 *     compared. The persistence paths write null, never undefined.
 *
 * @param {{ lastWeekNumber: number|null, lastMonth: number|null, lastYear: number|null }} last
 * @param {{ currentWeek: number, currentMonth: number, currentYear: number }} current
 * @returns {string[]}
 */
function detectTransitions(last, current) {
    const transitions = [];

    if (last.lastYear !== null && last.lastYear < current.currentYear) {
        transitions.push('year');
    }
    if (last.lastMonth !== null && (last.lastMonth !== current.currentMonth || last.lastYear !== current.currentYear)) {
        transitions.push('month');
    }
    if (last.lastWeekNumber !== null && (last.lastWeekNumber !== current.currentWeek || last.lastYear !== current.currentYear)) {
        transitions.push('week');
    }

    return transitions;
}

/**
 * The most significant crossed boundary, or undefined when none were.
 * @param {string[]} transitions
 * @returns {string|undefined}
 */
function mainTransition(transitions) {
    return TRANSITION_PRIORITY.find(p => transitions.includes(p));
}

const PERIOD_SUMMARY_LOGIC = Object.freeze({
    PERIOD_XP,
    MONTH_NAMES,
    formatDisplayDate,
    previousPeriodRange,
    completionRate,
    buildStatBlock,
    countHabitCompletions,
    estimatedXP,
    summarize,
    recapShareText,
    TRANSITION_PRIORITY,
    isoWeekNumber,
    periodStamp,
    detectTransitions,
    mainTransition,
});


// Node / Jest

export default PERIOD_SUMMARY_LOGIC;
