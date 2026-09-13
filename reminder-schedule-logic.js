// @ts-check
'use strict';
/**
 * reminder-schedule-logic.js — pure reminder scheduling + notification-copy math (Engineering Roadmap #1).
 *
 * 72nd incremental slice of the goal-manager.js God class, and the NINETEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic pattern).
 *
 * The whole reminder surface (~350 lines: initializeReminders, checkMissedReminders,
 * scheduleDailyReminders, scheduleStreakRiskReminder, scheduleBountyReadyReminder, checkOverdueTasks,
 * sendMorningReminder, sendEveningReminder) had ZERO test coverage, and it carried FOUR separate
 * hand-duplicated blocks — the same two-copies-of-one-rule shape that caused the July 2026 loot bug:
 *
 *   1. `"HH:MM".split(':').map(Number)` at SIX call sites, of which only the two native schedulers
 *      bothered with a fallback (`|| '20:00'` / `|| '18:00'`) — now one `parseTimeOfDay`.
 *   2. The `remindersSentToday` day-rollover block, byte-identical in checkMissedReminders and
 *      _markReminderSent — now one `rolloverSentToday`.
 *   3. The "next daily slot" walk (setHours, and if it has already passed add a day), once in each
 *      native scheduler — now one `nextDailySlot`.
 *   4. The 2-hour catch-up comparison, once for morning and once for evening, with a bare literal
 *      `120` inline in both — now `isWithinCatchUpWindow` + the named `CATCH_UP_WINDOW_MINS`.
 *
 * PURE: no Date.now(), no localStorage, no setTimeout, no CapBridge, no Notification. Every function
 * takes the clock as an explicit `now` (the same convention as period-summary-logic's `today` and
 * boss-render's injected `now`). The God class keeps ALL the impure work — reading/writing
 * localStorage, arming and clearing timers, the native cancel/schedule bridge calls, and the
 * showNotification delivery.
 *
 * Behaviour is preserved verbatim, including two quirks worth naming so nobody "tidies" them by
 * accident:
 *   - `scheduleDailyReminders` arms NOTHING when the slot time has already passed (and, because the
 *     comparison is a strict `>`, also arms nothing at the exact slot minute). The catch-up path is
 *     what covers that window; see `msUntilTodaySlot` returning null.
 *   - The overdue copy reads "1 overdue task that need attention" — the noun is pluralized but the
 *     verb is not. Kept as-is: it is shipped user-facing copy, and changing it is a product decision,
 *     not a refactor. See `overdueReminderBody`.
 *
 * One deliberate (narrow) hardening: all four daily/native time reads now pass an explicit fallback,
 * so a missing time string yields the default slot instead of throwing a TypeError on
 * `undefined.split`. The two native sites already had this; the morning/evening pair did not. The
 * defaults table guarantees the fields exist, so this is unreachable in practice — it just removes a
 * latent crash rather than leaving the asymmetry lying around.
 *
 * Dual-environment, no bundler (mirrors the other logic modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.REMINDER_SCHEDULE_LOGIC.
 *   - Jest/Node: require('./reminder-schedule-logic.js') returns the frozen namespace.
 */


/**
 * @typedef {{
 *   enabled: boolean,
 *   morningReminder: boolean, morningTime: string,
 *   eveningReminder: boolean, eveningTime: string,
 *   overdueAlert: boolean,
 *   streakReminder: boolean, streakReminderTime: string,
 *   bountyReminder: boolean, bountyReminderTime: string
 * }} ReminderSettings
 */

/**
 * The shipped reminder defaults, applied when a user has no stored settings (or corrupt JSON).
 * `streakReminder*` and `bountyReminder*` were added after launch, which is what the backfill in
 * `backfillSettings` exists to repair for already-saved users.
 */
const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    morningReminder: true,
    morningTime: '09:00',
    eveningReminder: true,
    eveningTime: '18:00',
    overdueAlert: true,
    streakReminder: true,
    streakReminderTime: '20:00',
    bountyReminder: true,
    bountyReminderTime: '18:00',
});

/** How long after a missed slot the catch-up path will still deliver it. */
const CATCH_UP_WINDOW_MINS = 120;

/** Fixed native-notification ids, so a pending reminder can be reliably canceled/replaced. */
const STREAK_RISK_NOTIF_ID = 88001;
const BOUNTY_READY_NOTIF_ID = 88002;

/** Streaks shorter than this aren't worth a loss-aversion nudge (and avoid spamming new users). */
const STREAK_RISK_MIN_STREAK = 3;

/** @returns {ReminderSettings} a fresh mutable copy of the defaults */
function defaultSettings() {
    return { ...DEFAULT_SETTINGS };
}

/**
 * Repair settings saved before the streak/bounty reminder fields existed.
 *
 * The two idioms here are NOT interchangeable and the asymmetry is deliberate:
 *   - BOOLEAN toggles test `=== undefined`, because `false` is a legitimate stored value that must
 *     survive (a `!settings.streakReminder` test would silently re-enable a reminder the user
 *     turned off).
 *   - TIME strings test falsiness, because `''` is not a usable time and should be replaced.
 *
 * This is the same falsy-vs-absent distinction that caused the January `lastMonth` recap bug in
 * the 71st slice, where a 0-indexed month was coerced away by `||`.
 *
 * @param {Partial<ReminderSettings>} settings mutated in place and returned (the caller holds
 *   the only reference). Partial because the whole point is that legacy saves are missing fields.
 * @returns {ReminderSettings}
 */
function backfillSettings(settings) {
    if (settings.streakReminder === undefined) settings.streakReminder = DEFAULT_SETTINGS.streakReminder;
    if (!settings.streakReminderTime) settings.streakReminderTime = DEFAULT_SETTINGS.streakReminderTime;
    if (settings.bountyReminder === undefined) settings.bountyReminder = DEFAULT_SETTINGS.bountyReminder;
    if (!settings.bountyReminderTime) settings.bountyReminderTime = DEFAULT_SETTINGS.bountyReminderTime;
    // Cast: only the four post-launch fields are guaranteed above, so TS can't prove the rest are
    // present. The persisted shape always carries them (they predate the backfill).
    return /** @type {ReminderSettings} */ (settings);
}

/**
 * Parse an `"HH:MM"` settings string. Previously hand-inlined at SIX call sites.
 * @param {string|null|undefined} timeStr
 * @param {string} fallback used when `timeStr` is missing or empty
 * @returns {{ hours: number, minutes: number }}
 */
function parseTimeOfDay(timeStr, fallback) {
    const raw = (typeof timeStr === 'string' && timeStr) ? timeStr : fallback;
    const [hours, minutes] = String(raw).split(':').map(Number);
    return { hours, minutes };
}

/**
 * An `"HH:MM"` string as minutes since midnight.
 * @param {string|null|undefined} timeStr
 * @param {string} fallback
 * @returns {number}
 */
function timeToMinutes(timeStr, fallback) {
    const { hours, minutes } = parseTimeOfDay(timeStr, fallback);
    return hours * 60 + minutes;
}

/**
 * A Date's LOCAL wall-clock time as minutes since midnight.
 * @param {Date} now
 * @returns {number}
 */
function minutesSinceMidnight(now) {
    return now.getHours() * 60 + now.getMinutes();
}

/**
 * Is `now` inside the catch-up grace period that follows a missed slot?
 * Lower bound INCLUSIVE (the slot minute itself counts), upper bound EXCLUSIVE (so exactly
 * `window` minutes later is already too late) — preserved verbatim from both catch-up branches.
 *
 * @param {number} nowMins
 * @param {number} targetMins
 * @param {number} [windowMins]
 * @returns {boolean}
 */
function isWithinCatchUpWindow(nowMins, targetMins, windowMins = CATCH_UP_WINDOW_MINS) {
    return nowMins >= targetMins && nowMins < targetMins + windowMins;
}

/**
 * Today's occurrence of an `"HH:MM"` slot, as a Date on the same calendar day as `now`.
 * @param {string|null|undefined} timeStr
 * @param {Date} now
 * @param {string} fallback
 * @returns {Date}
 */
function todayAtTime(timeStr, now, fallback) {
    const { hours, minutes } = parseTimeOfDay(timeStr, fallback);
    const at = new Date(now);
    at.setHours(hours, minutes, 0, 0);
    return at;
}

/**
 * Milliseconds until today's slot, or NULL when the slot is not still ahead.
 *
 * Drives the in-page morning/evening timers. The comparison is a strict `>`, so the exact slot
 * minute returns null and NO timer is armed — the catch-up path (`isWithinCatchUpWindow`) is what
 * delivers that case. Preserved verbatim.
 *
 * @param {string|null|undefined} timeStr
 * @param {Date} now
 * @param {string} fallback
 * @returns {number|null}
 */
function msUntilTodaySlot(timeStr, now, fallback) {
    const at = todayAtTime(timeStr, now, fallback);
    return at > now ? at.getTime() - now.getTime() : null;
}

/**
 * The next time an `"HH:MM"` slot comes around — today if it is still ahead, otherwise tomorrow.
 * Previously hand-inlined in both native schedulers.
 *
 * @param {string|null|undefined} timeStr
 * @param {Date} now
 * @param {string} fallback
 * @param {boolean} [skipToday] force tomorrow even when today's slot is still ahead (the
 *   streak-risk case: today's login bonus is already claimed, so today is not at risk)
 * @returns {Date}
 */
function nextDailySlot(timeStr, now, fallback, skipToday = false) {
    const at = todayAtTime(timeStr, now, fallback);
    if (skipToday || at <= now) at.setDate(at.getDate() + 1);
    return at;
}

/**
 * Normalize the `remindersSentToday` record for `today`, resetting the per-slot flags when the
 * stored date is stale (or absent). Previously duplicated byte-for-byte in checkMissedReminders
 * and _markReminderSent.
 *
 * Mutates and returns the passed object, matching the original in-place style — the callers
 * immediately re-serialize it.
 *
 * @param {{ _date?: string, morning?: boolean, evening?: boolean }} sentData
 * @param {string} today YYYY-MM-DD
 * @returns {{ _date: string, morning: boolean, evening: boolean }}
 */
function rolloverSentToday(sentData, today) {
    const data = /** @type {{ _date: string, morning: boolean, evening: boolean }} */ (sentData || {});
    if (data._date !== today) {
        data._date = today;
        data.morning = false;
        data.evening = false;
    }
    return data;
}

/**
 * Should a catch-up delivery fire for one slot? Combines the per-slot toggle, the not-yet-sent
 * flag and the grace window that the two near-identical catch-up branches each spelled out.
 *
 * @param {{ toggleOn: boolean, alreadySent: boolean, slotTime: string|null|undefined, fallback: string, nowMins: number }} args
 * @returns {boolean}
 */
function shouldCatchUp({ toggleOn, alreadySent, slotTime, fallback, nowMins }) {
    if (!toggleOn || alreadySent) return false;
    return isWithinCatchUpWindow(nowMins, timeToMinutes(slotTime, fallback));
}

/**
 * Is a login streak long enough to be worth protecting with a nudge?
 * @param {number|null|undefined} streak
 * @returns {boolean}
 */
function isStreakWorthProtecting(streak) {
    return (streak || 0) >= STREAK_RISK_MIN_STREAK;
}

/**
 * `n` with `word` pluralized by a trailing "s" — the pattern repeated inline across every
 * reminder body.
 * @param {number} n
 * @param {string} word
 * @returns {string}
 */
function plural(n, word) {
    return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

/**
 * The morning nudge body, or NULL when there is nothing pending (the original sent no
 * notification at all in that case).
 * @param {number} taskCount
 * @param {number} habitCount
 * @returns {string|null}
 */
function morningReminderBody(taskCount, habitCount) {
    if (taskCount <= 0 && habitCount <= 0) return null;
    let body = '';
    if (taskCount > 0) body += `📋 ${plural(taskCount, 'task')} for today`;
    if (habitCount > 0) body += (body ? ' • ' : '') + `🔄 ${plural(habitCount, 'habit')} to complete`;
    return body;
}

/**
 * The evening report. Unlike the morning nudge this ALWAYS notifies — with an all-done
 * celebration when nothing is outstanding — so the title varies and is returned too.
 * @param {number} taskCount
 * @param {number} habitCount
 * @returns {{ title: string, body: string }}
 */
function eveningReminderBody(taskCount, habitCount) {
    if (taskCount <= 0 && habitCount <= 0) {
        return { title: '🏆 Quest Complete!', body: 'Amazing! All tasks and habits done for today!' };
    }
    let body = 'Before the day ends: ';
    if (taskCount > 0) body += `${plural(taskCount, 'task')} remaining`;
    if (habitCount > 0) body += (taskCount > 0 ? ', ' : '') + `${plural(habitCount, 'habit')} to complete`;
    return { title: '🌙 Evening Quest Report', body };
}

/**
 * The overdue-quests body.
 *
 * NOTE the grammar: the noun pluralizes but the verb does not, so a single task reads
 * "1 overdue task that need attention". That is the shipped copy and is reproduced exactly —
 * fixing it is a product decision, not part of this refactor.
 *
 * @param {number} count
 * @returns {string}
 */
function overdueReminderBody(count) {
    return `You have ${plural(count, 'overdue task')} that need attention`;
}

/**
 * The streak-risk nudge body.
 * @param {number} streak
 * @returns {string}
 */
function streakRiskBody(streak) {
    return `Your ${streak}-day login streak ends at midnight — open Quest Journal to keep it alive!`;
}

/**
 * The bounty-ready nudge body.
 * @param {string} label 'Weekly' | 'Monthly'
 * @param {string} chestTier
 * @returns {string}
 */
function bountyReadyBody(label, chestTier) {
    return `Your ${label} Bounty is unclaimed — finish it for a free ${chestTier} chest before the window closes!`;
}

const REMINDER_SCHEDULE_LOGIC = Object.freeze({
    DEFAULT_SETTINGS,
    CATCH_UP_WINDOW_MINS,
    STREAK_RISK_NOTIF_ID,
    BOUNTY_READY_NOTIF_ID,
    STREAK_RISK_MIN_STREAK,
    defaultSettings,
    backfillSettings,
    parseTimeOfDay,
    timeToMinutes,
    minutesSinceMidnight,
    isWithinCatchUpWindow,
    todayAtTime,
    msUntilTodaySlot,
    nextDailySlot,
    rolloverSentToday,
    shouldCatchUp,
    isStreakWorthProtecting,
    plural,
    morningReminderBody,
    eveningReminderBody,
    overdueReminderBody,
    streakRiskBody,
    bountyReadyBody,
});


// Node / Jest

export default REMINDER_SCHEDULE_LOGIC;
