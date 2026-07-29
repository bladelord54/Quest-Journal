// @ts-check
'use strict';
/**
 * streak-logic.js — pure daily-login-streak + streak-repair math (Engineering Roadmap #1).
 *
 * 56th incremental slice of the goal-manager.js God class, and the FIRST non-render extraction
 * after the render burn-down completed — a return to the LOGIC-module pattern (loot-engine.js /
 * boss-generator.js / persistence-migrations.js). A cohesive set of pure, stateless functions
 * carrying the drift-prone date/number logic behind the daily-login streak and the §1.7
 * Streak-Repair feature. The God-class methods stay as thin wrappers holding all the IMPURE
 * orchestration (getTodayDateString, the shield modals + spell/enchantment consumption,
 * addXP/addGold, saveData, render, reminders):
 *
 *   - classifyLoginBonus(lastLoginBonusDate, today, loginStreak) — the date-gap break detector
 *     behind checkDailyLoginBonus. Returns a { status, … } decision (already-claimed / first /
 *     continue / gap / ignore); the wrapper handles the impure shield check on a 'gap'.
 *   - computeLoginRewards(loginStreak, milestones) — the escalating daily gold/XP + milestone
 *     total + next-milestone preview behind _completeLoginBonus.
 *   - streakRepairCost(lostStreak) — Focus-Crystal cost (~1 per 10 lost days, min 1, cap 5).
 *   - computeRepairableStreakInsert(snapshot, existingList, now) — build + de-dupe a freshly
 *     broken streak's repair snapshot (behind _recordRepairableStreak).
 *   - pruneRepairableStreaks(list, now, windowMs) — drop snapshots past the 48h window (behind
 *     getRepairableStreaks).
 *   - canRepairStreakEntry(entry, ctx) — repair-eligibility gate (window + free/premium/afford)
 *     behind canRepairStreak.
 *
 * Every function is a byte-faithful lift of the inline expression it replaces (verified pre-swap
 * by a temporary equality check + the pre-existing repair-method unit tests, which still drive
 * the real class delegators unchanged).
 *
 * Dual-environment, no bundler (mirrors loot-engine.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.STREAK_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./streak-logic.js') returns the frozen object via module.exports (and
 *     also sets window.STREAK_LOGIC under jsdom).
 */
(function () {
    /**
     * Classify today's login relative to the last claim date. PURE: no clock read — `today`
     * (a YYYY-MM-DD string already in the player's timezone) is injected by the caller. The
     * caller (checkDailyLoginBonus) handles the impure work on a 'gap' (shield prompt / repair
     * snapshot) and always finishes via _completeLoginBonus unless it returns early for a shield.
     *
     * status:
     *   'already-claimed' — lastLoginBonusDate === today (no-op; wrapper returns).
     *   'first'    — no prior claim; newStreak = 1.
     *   'continue' — exactly one day elapsed; newStreak = prevStreak + 1.
     *   'gap'      — 2+ days elapsed; the streak is at risk (wrapper does the shield/repair work).
     *   'ignore'   — dayDiff <= 0 but not today (e.g. clock/timezone moved backwards); no change.
     * @param {string|null|undefined} lastLoginBonusDate
     * @param {string} today
     * @param {number} loginStreak
     * @returns {{ status: string, prevStreak?: number, dayDiff?: number, newStreak?: number }}
     */
    function classifyLoginBonus(lastLoginBonusDate, today, loginStreak) {
        if (lastLoginBonusDate === today) return { status: 'already-claimed' };
        const prevStreak = loginStreak || 0;
        if (!lastLoginBonusDate) return { status: 'first', prevStreak, newStreak: 1 };
        const lastDate = new Date(lastLoginBonusDate);
        const todayDate = new Date(today);
        const dayDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) return { status: 'continue', prevStreak, dayDiff, newStreak: prevStreak + 1 };
        if (dayDiff > 1) return { status: 'gap', prevStreak, dayDiff };
        return { status: 'ignore', prevStreak, dayDiff };
    }

    /**
     * The daily login reward: escalating base gold/XP (base 15/10, +5/+3 per streak day, both
     * capped at day 7) plus any milestone bonus for the exact current day, and a preview of the
     * next milestone. PURE — `milestones` (LOGIN_STREAK_MILESTONES) is injected. `milestone` /
     * `nextMilestone` are the raw Array.find results (undefined when none), matching the inline.
     * @param {number} loginStreak
     * @param {Array<{day:number,xpBonus:number,goldBonus:number}&Record<string,any>>} milestones
     * @returns {{ goldReward:number, xpReward:number, milestone:any, totalXP:number, totalGold:number, nextMilestone:any }}
     */
    function computeLoginRewards(loginStreak, milestones) {
        const goldReward = 15 + Math.min(loginStreak - 1, 6) * 5;
        const xpReward = 10 + Math.min(loginStreak - 1, 6) * 3;
        const milestone = milestones.find(m => m.day === loginStreak);
        const totalXP = xpReward + (milestone ? milestone.xpBonus : 0);
        const totalGold = goldReward + (milestone ? milestone.goldBonus : 0);
        const nextMilestone = milestones.find(m => m.day > loginStreak);
        return { goldReward, xpReward, milestone, totalXP, totalGold, nextMilestone };
    }

    /**
     * Focus-Crystal cost to repair a lost streak: ~1 per 10 lost days, min 1, capped at 5 so even
     * a year-long streak stays affordable (bosses award 1–3 crystals each). PURE.
     * @param {number} lostStreak
     * @returns {number}
     */
    function streakRepairCost(lostStreak) {
        const len = Math.max(0, Math.floor(lostStreak || 0));
        return Math.min(5, Math.max(1, Math.ceil(len / 10)));
    }

    /**
     * Build the repair snapshot for a freshly broken streak, de-duped against `existingList` (one
     * 'login' entry; one per habit id — a repeated break REPLACES rather than stacks). Only 2+ day
     * streaks are worth recording (a 1-day streak isn't a real loss). PURE — returns the new list
     * + the created entry, or { entry:null, list:existingList } for <2-day / no-op (the wrapper
     * then leaves this.repairableStreaks untouched, exactly like the original guard).
     * @param {{ kind?: string, habitId?: any, title?: string, lostStreak?: number }} snapshot
     * @param {any[]} existingList
     * @param {number} now
     * @returns {{ entry: any, list: any[] }}
     */
    function computeRepairableStreakInsert(snapshot, existingList, now) {
        const lost = Math.floor((snapshot && snapshot.lostStreak) || 0);
        if (lost < 2) return { entry: null, list: existingList };
        const list = Array.isArray(existingList) ? existingList : [];
        const habitId = snapshot.kind === 'habit' ? (snapshot.habitId ?? null) : null;
        const filtered = list.filter(e =>
            snapshot.kind === 'habit'
                ? !(e.kind === 'habit' && e.habitId === habitId)
                : e.kind !== 'login'
        );
        const entry = {
            id: `repair-${snapshot.kind === 'habit' ? 'habit' : 'login'}-${habitId ?? 'login'}-${now}`,
            kind: snapshot.kind === 'habit' ? 'habit' : 'login',
            habitId,
            title: snapshot.title || (snapshot.kind === 'habit' ? 'Habit streak' : 'Login streak'),
            lostStreak: lost,
            brokenAt: now,
        };
        filtered.push(entry);
        return { entry, list: filtered };
    }

    /**
     * Drop repair snapshots whose 48h window has closed (and any malformed entries). PURE.
     * @param {any[]} list
     * @param {number} now
     * @param {number} windowMs
     * @returns {any[]}
     */
    function pruneRepairableStreaks(list, now, windowMs) {
        if (!Array.isArray(list)) return [];
        return list.filter(e =>
            e && typeof e.brokenAt === 'number' && (now - e.brokenAt) < windowMs
        );
    }

    /**
     * Repair-eligibility gate for one entry: it must be inside the window, and EITHER the free
     * lifetime repair is available (P2b) OR the player is premium with enough Focus Crystals for
     * `cost`. PURE — the caller precomputes `hasFreeRepair` and `cost` (both side-effect-free).
     * @param {{ brokenAt?: number }|null|undefined} entry
     * @param {{ now:number, windowMs:number, hasFreeRepair:boolean, isPremium:boolean, focusCrystals:number, cost:number }} ctx
     * @returns {boolean}
     */
    function canRepairStreakEntry(entry, ctx) {
        if (!entry || typeof entry.brokenAt !== 'number') return false;
        if ((ctx.now - entry.brokenAt) >= ctx.windowMs) return false;
        if (ctx.hasFreeRepair) return true;
        if (!ctx.isPremium) return false;
        return (ctx.focusCrystals || 0) >= ctx.cost;
    }

    const STREAK_LOGIC = Object.freeze({
        classifyLoginBonus,
        computeLoginRewards,
        streakRepairCost,
        computeRepairableStreakInsert,
        pruneRepairableStreaks,
        canRepairStreakEntry,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // STREAK_LOGIC property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.STREAK_LOGIC = STREAK_LOGIC;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = STREAK_LOGIC;
})();
