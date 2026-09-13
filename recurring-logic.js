// @ts-check
'use strict';
/**
 * recurring-logic.js — pure recurring-task scheduling rules (Engineering Roadmap #1).
 *
 * 75th incremental slice of the goal-manager.js God class, and the TWENTY-SECOND LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic / reminder-schedule-logic / enchantment-lifecycle / bounty-logic pattern).
 *
 * This is the "has this recurring task come due today?" decision behind `generateRecurringTasksForToday()`,
 * which runs on every load. Before this slice the whole subsystem had FIVE tests — weekly-match, the
 * duplicate guard, the inactive skip, monthly-date and the generated-task field shape — and NOTHING for
 * `biweekly` or `monthly-weekday`, which are the only two branches with real date math in them.
 *
 * ── THE FIND: FOUR hand-maintained copies of the same seven-day vocabulary ──────────────────────────
 *
 *   goal-manager generateRecurringTasksForToday : ['sun','mon','tue','wed','thu','fri','sat']  (getDay order)
 *   goal-manager showMultiSelectDays            : ['mon',…,'sun'] + ['Mon',…,'Sun']  (two parallel arrays)
 *   goal-manager finishRecurringTaskSetup       : [{ value:'mon', label:'Monday' }, …]
 *   recurring-render.js                         : { sun:'Sun', mon:'Mon', … }
 *
 * Same seven days, four spellings, two different ORDERS, three different label sets — and the ordering
 * distinction is load-bearing: `DAY_KEYS` is indexed by `Date.getDay()` so it MUST stay Sunday-first, while
 * every picker the user sees is Monday-first. Conflating them silently shifts every weekly schedule by a
 * day, which is exactly the kind of drift that opened this roadmap item. They are now one frozen source
 * with the two orders named separately.
 *
 * `recurring-render.js` keeps its inline copy DELIBERATELY — no `*-render.js` module reaches for another
 * extracted module (they take injected deps only), and coupling it here would trade a duplicated table for
 * a new load-order dependency. Same call as the `180` literal in slice 73: `DAY_LABELS` expresses the render
 * table and a test drives the real builder across all seven keys to pin the two to one answer, so the drift
 * is CAUGHT rather than merely re-homed. The two goal-manager copies do collapse, since the class already
 * captures modules.
 *
 * ── WHY THE BIWEEKLY WINDOW IS 13 DAYS AND NOT 14 ──────────────────────────────────────────────────
 *
 * `daysSince` reproduces the original's mixed-parse subtraction verbatim, and the mixture is the point:
 *
 *   today   = new Date(getTodayDateString() + 'T12:00:00')  → LOCAL noon
 *   lastGen = new Date('2025-01-02')                        → date-only ISO, so UTC MIDNIGHT per spec
 *
 * Subtracting a UTC-midnight instant from a local-noon instant leaves the user's UTC offset baked into the
 * difference. Writing the offset as hours-ahead-of-UTC (X), local noon lands at `12 - X` hours UTC, so a
 * gap of N calendar days floors to `N + floor((12 - X) / 24)` — that is N-1, N or N+1 depending purely on
 * WHERE THE USER IS. For a true fortnight: 15 at UTC-12, 14 across most of the world, and 13 at UTC+13/+14.
 * So the `>= 13` threshold is not sloppiness, it is the slack that keeps the far-eastern timezones working;
 * tightening it to `>= 14` would make every biweekly task in Kiribati, Samoa and NZ summer time silently
 * skip a fortnight. A test walks X from -12 to +14 and asserts the floor never drops below the threshold,
 * which pins the rule without touching the machine's timezone.
 *
 * ── THE TWO `lastGenerated` FIELDS ─────────────────────────────────────────────────────────────────
 *
 * There are two, they mean different things, and both are written when a biweekly task fires:
 *   - `rt.lastGenerated`            — the once-per-DAY guard, on every recurrence type.
 *   - `rt.recurrence.lastGenerated` — biweekly ONLY, the anchor the 13-day window measures from.
 * The day guard alone cannot express a fortnight, and the fortnight anchor alone would let a same-day
 * second sweep through. `isPending` owns the first, `dueToday` owns the second.
 *
 * ── OCCURRENCE-OF-MONTH ────────────────────────────────────────────────────────────────────────────
 *
 * `occurrenceOfMonth` is `Math.ceil(dayOfMonth / 7)`, which is exact for "the Nth <weekday>" because the
 * 1st Tuesday is always in dates 1–7, the 2nd in 8–14, and so on. Note it can legitimately return 5, and
 * `dueToday` honours a stored `week: 5` even though the creation UI only offers 1–4 and Last. `week: -1`
 * does NOT use the counter at all — it probes whether the same weekday still exists seven days later,
 * which is what makes "last Friday" land on the 5th Friday in a 31-day month and the 4th in February.
 *
 * The PURE surface:
 *   - DAY_KEYS / DAY_ORDER / DAY_LABELS / DAY_LABELS_LONG — the one day vocabulary, both orders.
 *   - dayKeyFor(date) — `Date.getDay()` → key, the Sunday-first lookup.
 *   - dayContext(date) — { date, dayKey, dayOfMonth }, built once per sweep.
 *   - daysSince(today, isoDateStr) — the mixed-parse day difference described above.
 *   - occurrenceOfMonth(dayOfMonth) / isLastOccurrenceInMonth(date) — the monthly-weekday primitives.
 *   - dueToday(recurrence, ctx) — the four-branch schedule predicate.
 *   - hasGeneratedToday(rt, todayStr) / taskExistsFor(dailyTasks, rt, todayStr) / isPending(rt, deps) —
 *     the three guards that run BEFORE the schedule is consulted.
 *   - generatedTask(rt, { id, todayStr, createdISO }) — the daily-task record.
 *
 * One deliberate hardening: a `weekly` recurrence whose `days` array is missing used to THROW
 * (`undefined.includes`) from inside the sweep, and the sweep runs on load — so one corrupt entry could
 * break boot for everything after it. `dueToday` now treats a non-array as "not due" and moves on.
 * Unreachable through the UI (the creation path returns early on an empty selection and always writes
 * `days`), so this is a latent-bug guard, not a behaviour change.
 *
 * Everything impure stays on the class: `getTodayDateString()`, the noon parse, `uniqueId()`,
 * `new Date().toISOString()`, the `dailyTasks` / `lastGenerated` writes and `saveData()`.
 *
 * Dual-environment, no bundler (mirrors the other logic modules):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.RECURRING_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./recurring-logic.js') returns the frozen object via module.exports.
 */

/**
 * @typedef {{ type: 'weekly', days: string[] }
 *   | { type: 'biweekly', day: string, lastGenerated?: string|null }
 *   | { type: 'monthly-date', dayOfMonth: number }
 *   | { type: 'monthly-weekday', week: number, day: string }} Recurrence
 */
/**
 * @typedef {{ id: number, title: string, description?: string, recurrence: Recurrence,
 *             active?: boolean, created?: string, lastGenerated?: string|null }} RecurringTask
 */
/** @typedef {{ date: Date, dayKey: string, dayOfMonth: number }} DayContext */

const DAY_MS = 1000 * 60 * 60 * 24;

/** Minimum whole days between biweekly generations — see the header on why this is 13, not 14. */
const BIWEEKLY_MIN_DAYS = 13;

/** Sentinel `week` value meaning "the last occurrence of this weekday in the month". */
const LAST_OCCURRENCE = -1;

/** Indexed by `Date.getDay()` — MUST stay Sunday-first. */
const DAY_KEYS = Object.freeze(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);

/** Presentation order for every day picker the user sees — Monday-first. */
const DAY_ORDER = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

/** @type {Readonly<Record<string, string>>} */
const DAY_LABELS = Object.freeze({
    sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
});

/** @type {Readonly<Record<string, string>>} */
const DAY_LABELS_LONG = Object.freeze({
    sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
});

/**
 * `Date.getDay()` → the stored day key.
 * @param {Date} date
 * @returns {string}
 */
function dayKeyFor(date) {
    return DAY_KEYS[date.getDay()];
}

/**
 * The per-sweep context every schedule branch reads.
 * @param {Date} date — the caller's noon-parsed "today".
 * @returns {DayContext}
 */
function dayContext(date) {
    return { date, dayKey: dayKeyFor(date), dayOfMonth: date.getDate() };
}

/**
 * Whole days from a stored `YYYY-MM-DD` stamp to `today`. Deliberately keeps the original's mixed
 * parse (UTC-midnight stamp vs local-noon today) — see the header.
 * @param {Date} today
 * @param {string} isoDateStr
 * @returns {number}
 */
function daysSince(today, isoDateStr) {
    const last = new Date(isoDateStr);
    return Math.floor((today.getTime() - last.getTime()) / DAY_MS);
}

/**
 * Which occurrence of its weekday this date is — the 1st Tuesday is always in dates 1–7.
 * @param {number} dayOfMonth
 * @returns {number}
 */
function occurrenceOfMonth(dayOfMonth) {
    return Math.ceil(dayOfMonth / 7);
}

/**
 * True when the same weekday does NOT recur in this month — i.e. today is the last one.
 * @param {Date} date
 * @returns {boolean}
 */
function isLastOccurrenceInMonth(date) {
    const next = new Date(date);
    next.setDate(date.getDate() + 7);
    return next.getMonth() !== date.getMonth();
}

/**
 * Does this recurrence fall due on the context's day? Schedule only — the guards are separate.
 * @param {Recurrence} recurrence
 * @param {DayContext} ctx
 * @returns {boolean}
 */
function dueToday(recurrence, ctx) {
    if (!recurrence) return false;
    const { date, dayKey, dayOfMonth } = ctx;

    switch (recurrence.type) {
        case 'weekly':
            // Non-array `days` used to throw out of the whole load-time sweep; see the header.
            return Array.isArray(recurrence.days) && recurrence.days.includes(dayKey);

        case 'biweekly':
            if (recurrence.day !== dayKey) return false;
            if (!recurrence.lastGenerated) return true;
            return daysSince(date, recurrence.lastGenerated) >= BIWEEKLY_MIN_DAYS;

        case 'monthly-date':
            return dayOfMonth === recurrence.dayOfMonth;

        case 'monthly-weekday':
            if (recurrence.day !== dayKey) return false;
            return recurrence.week === LAST_OCCURRENCE
                ? isLastOccurrenceInMonth(date)
                : occurrenceOfMonth(dayOfMonth) === recurrence.week;

        default:
            return false;
    }
}

/**
 * The once-per-day guard.
 * @param {RecurringTask} rt
 * @param {string} todayStr
 * @returns {boolean}
 */
function hasGeneratedToday(rt, todayStr) {
    return rt.lastGenerated === todayStr;
}

/**
 * The belt-and-braces guard: is today's task already in the list? Matches on all THREE of title,
 * due date and parent id, so an unrelated task sharing a title does not suppress generation.
 * @param {Array<{ title?: string, dueDate?: string, recurringTaskId?: number }>} dailyTasks
 * @param {RecurringTask} rt
 * @param {string} todayStr
 * @returns {boolean}
 */
function taskExistsFor(dailyTasks, rt, todayStr) {
    return dailyTasks.some(t =>
        t.title === rt.title &&
        t.dueDate === todayStr &&
        t.recurringTaskId === rt.id
    );
}

/**
 * All three pre-schedule guards: active, not already generated today, not already present.
 * @param {RecurringTask} rt
 * @param {{ todayStr: string, dailyTasks: Array<any> }} deps
 * @returns {boolean}
 */
function isPending(rt, { todayStr, dailyTasks }) {
    if (!rt.active) return false;
    if (hasGeneratedToday(rt, todayStr)) return false;
    return !taskExistsFor(dailyTasks, rt, todayStr);
}

/**
 * The daily-task record a due recurring task produces.
 * @param {RecurringTask} rt
 * @param {{ id: number, todayStr: string, createdISO: string }} deps
 */
function generatedTask(rt, { id, todayStr, createdISO }) {
    return {
        id,
        title: rt.title,
        description: rt.description,
        weeklyGoalIds: [],
        created: createdISO,
        dueDate: todayStr,
        completed: false,
        checklist: [],
        recurringTaskId: rt.id, // link back to the parent recurring task
    };
}

const RECURRING_LOGIC = Object.freeze({
    DAY_MS,
    BIWEEKLY_MIN_DAYS,
    LAST_OCCURRENCE,
    DAY_KEYS,
    DAY_ORDER,
    DAY_LABELS,
    DAY_LABELS_LONG,
    dayKeyFor,
    dayContext,
    daysSince,
    occurrenceOfMonth,
    isLastOccurrenceInMonth,
    dueToday,
    hasGeneratedToday,
    taskExistsFor,
    isPending,
    generatedTask,
});


// Node / Jest

export default RECURRING_LOGIC;
