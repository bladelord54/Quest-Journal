// @ts-check
'use strict';
/**
 * focus-session-logic.js — pure focus-timer & Pomodoro-chain math (Engineering Roadmap #1).
 *
 * 68th incremental slice of the goal-manager.js God class, and the SIXTEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy pattern). `crystal-economy.js` already owns what a session
 * PAYS OUT in crystals; this owns the session and chain mechanics AROUND that payout.
 *
 * The focus-timer surface had the densest duplication left in the class — FIVE separate pieces of knowledge
 * each written more than once:
 *
 *   1. The 25-minute DEFAULT SESSION LENGTH appeared FIVE times: `initState`, the `startFocusTimer` ternary,
 *      the `loadData` fallback, `completeFocusSession`'s `|| 25`, and `updateFocusTimerDisplay`'s progress-bar
 *      denominator. Re-tune the default and miss one and the progress bar renders against a different total
 *      than the timer is counting down.
 *   2. The CHAIN SETTINGS DEFAULTS `{ sessionsPerChain: 4, breakDuration: 5, longBreakDuration: 15 }` were a
 *      duplicated OBJECT LITERAL — in `initState` and again in `updatePomodoroChainSettings`'s repair branch.
 *      That is the same "second copy of the defaults silently drifts" failure the roadmap's `initState()`
 *      split (item #6) was created to kill, reintroduced at a different call site.
 *   3. `sessionsPerChain`'s 4 had a THIRD copy as `completePomodoroChain`'s bare `: 4` fallback.
 *   4. The REMAINING-SECONDS expression `Math.max(0, Math.ceil((focusEndTime - Date.now()) / 1000))` was
 *      written THREE times (`_tickFocusTimer`, `restoreFocusTimer`, `pauseFocusTimer`). The `ceil` matters:
 *      it makes a timer display "25:00" rather than "24:59" on the first tick, and a `floor` in one copy
 *      would desync that one path.
 *   5. The CHAIN-FINISHED predicate `currentSession > totalSessions` was written twice — once in
 *      `_startPomodoroBreak` to pick the long break, once in `_completePomodoroBreak` to end the chain. They
 *      MUST agree: if they ever disagreed the chain would either award a long break and then run another
 *      session, or finish without its long break.
 *
 * NOTE the `>` in `isChainFinished`: `currentSession` is PRE-incremented by `completeFocusSession` before the
 * break starts, so after the 4th of 4 sessions it is 5 — strictly greater than `totalSessions`. A `>=` here
 * would end the chain one session early. A test pins the whole 4-session walk for exactly this reason.
 *
 * `defaultChainSettings()` returns a FRESH object every call, NOT the frozen `DEFAULT_CHAIN_SETTINGS`
 * constant — the settings object is mutated in place by `updatePomodoroChainSettings(key, value)`, so handing
 * out a shared (or frozen) reference would either alias every manager together or throw in strict mode.
 *
 * `focusXpBonus` mirrors `crystal-economy.js`'s `focusSessionCrystals`: the Deep Work and Archivist
 * multipliers are each `Math.round`ed SEPARATELY and only applied when the running bonus is already > 0, so
 * the stages do NOT commute and a zero bonus stays zero rather than rounding up off a multiplier.
 *
 * Everything impure stays on the class: `setInterval`/`clearInterval`, `Date.now()` at the call sites,
 * `hasActiveEnchantment`, `getClassPerkValue`, every instance write (`deepWorkStack`,
 * `lastFocusSessionEndTime`, `focusEndTime`, `focusSessionLength`, `pomodoroChain`), the notification and
 * achievement toasts, audio, `addXP`, `grantAttackCharge`, `trackDaily`, `saveData` and `render`.
 *
 * Dual-environment, no bundler (mirrors reward-economy.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.FOCUS_SESSION_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./focus-session-logic.js') returns the frozen object via module.exports (and also
 *     sets window.FOCUS_SESSION_LOGIC under jsdom).
 */
(function () {
    /** Default focus-session length in minutes. Single source of truth. */
    const DEFAULT_SESSION_MINUTES = 25;
    /** Session length while the Time Warden (extended_focus) enchantment is active. */
    const EXTENDED_SESSION_MINUTES = 35;
    /** Break grace added to a session's length when deciding if the next session is "back-to-back". */
    const DEEP_WORK_GRACE_MINUTES = 30;
    /** Flat XP granted by an active Focus Mode spell on session completion. */
    const FOCUS_MODE_XP_BONUS = 50;
    /** Crystals awarded for finishing a whole Pomodoro chain. */
    const CHAIN_BONUS_CRYSTALS = 2;
    /** Chain-completion XP, multiplied by the chain's session count. */
    const CHAIN_XP_PER_SESSION = 50;

    /** Reference defaults for a Pomodoro chain. Frozen — use defaultChainSettings() for a mutable copy. */
    const DEFAULT_CHAIN_SETTINGS = Object.freeze({
        sessionsPerChain: 4,
        breakDuration: 5,
        longBreakDuration: 15,
    });

    /**
     * A FRESH, mutable copy of the chain-settings defaults. Must not be the frozen constant —
     * updatePomodoroChainSettings mutates this object in place. PURE (new object each call).
     * @returns {{ sessionsPerChain: number, breakDuration: number, longBreakDuration: number }}
     */
    function defaultChainSettings() {
        return {
            sessionsPerChain: DEFAULT_CHAIN_SETTINGS.sessionsPerChain,
            breakDuration: DEFAULT_CHAIN_SETTINGS.breakDuration,
            longBreakDuration: DEFAULT_CHAIN_SETTINGS.longBreakDuration,
        };
    }

    /**
     * Session length in minutes, extended while the Time Warden enchantment is active. PURE.
     * @param {boolean} extendedFocus
     * @returns {number}
     */
    function sessionMinutes(extendedFocus) {
        return extendedFocus ? EXTENDED_SESSION_MINUTES : DEFAULT_SESSION_MINUTES;
    }

    /**
     * Minutes → milliseconds. PURE.
     * @param {number} minutes
     * @returns {number}
     */
    function minutesToMs(minutes) {
        return (minutes || 0) * 60 * 1000;
    }

    /**
     * Whole seconds left on the clock, never negative. Rounds UP so a freshly-started 25-minute session
     * displays 25:00 rather than 24:59. PURE.
     * @param {number} endTime epoch ms the timer expires at
     * @param {number} now epoch ms
     * @returns {number}
     */
    function remainingSeconds(endTime, now) {
        return Math.max(0, Math.ceil((endTime - now) / 1000));
    }

    /**
     * The window within which a following session still counts as "back-to-back": the session's own length
     * plus a break grace. PURE.
     * @param {number} sessionLengthMinutes
     * @param {number|null|undefined} [graceMinutes] defaults to DEEP_WORK_GRACE_MINUTES (30)
     * @returns {number} milliseconds
     */
    function deepWorkWindowMs(sessionLengthMinutes, graceMinutes) {
        return minutesToMs(sessionLengthMinutes) + minutesToMs(graceMinutes ?? DEEP_WORK_GRACE_MINUTES);
    }

    /**
     * Advance the Scholar Deep Work chain for a session completing now. Without the capstone the stack is
     * flattened to 0 and the multiplier is 1. Otherwise a session inside the window increments the stack and
     * anything later resets it to 0. PURE — the caller writes the returned stack back. 
     * @param {{
     *   perkValue?: number,
     *   stack?: number,
     *   lastEndTime?: number,
     *   now?: number,
     *   sessionMinutes?: number,
     *   graceMinutes?: number,
     * }} [opts]
     * @returns {{ stack: number, multiplier: number, chained: boolean }}
     */
    function deepWorkAdvance(opts) {
        const o = opts || {};
        const perkValue = o.perkValue || 0;
        if (perkValue <= 0) return { stack: 0, multiplier: 1, chained: false };
        const windowMs = deepWorkWindowMs(o.sessionMinutes || 0, o.graceMinutes);
        const lastEndTime = o.lastEndTime || 0;
        const now = o.now || 0;
        const chained = lastEndTime > 0 && (now - lastEndTime) <= windowMs;
        const stack = chained ? (o.stack || 0) + 1 : 0;
        return { stack, multiplier: 1 + perkValue * stack, chained };
    }

    /**
     * Bonus XP for a completed focus session: the Focus Mode spell's flat grant plus the Scholar focus_xp
     * perk, then the Deep Work and Archivist multipliers — each rounded SEPARATELY and only when the running
     * bonus is already positive, so a zero bonus stays zero. PURE.
     * @param {{
     *   focusModeActive?: boolean,
     *   perkXP?: number,
     *   deepWorkMult?: number,
     *   archivistMult?: number,
     * }} [opts]
     * @returns {number}
     */
    function focusXpBonus(opts) {
        const o = opts || {};
        let xpBonus = 0;
        if (o.focusModeActive) xpBonus += FOCUS_MODE_XP_BONUS;
        const perkXP = o.perkXP || 0;
        if (perkXP > 0) xpBonus += perkXP;
        const deepWorkMult = o.deepWorkMult || 1;
        if (xpBonus > 0 && deepWorkMult > 1) xpBonus = Math.round(xpBonus * deepWorkMult);
        const archivistMult = o.archivistMult || 1;
        if (xpBonus > 0 && archivistMult > 1) xpBonus = Math.round(xpBonus * archivistMult);
        return xpBonus;
    }

    /**
     * True once every session in the chain has been completed. STRICTLY greater-than: currentSession is
     * pre-incremented on completion, so a finished 4-session chain sits at 5. PURE.
     * @param {{ currentSession?: number, totalSessions?: number }|null|undefined} chain
     * @returns {boolean}
     */
    function isChainFinished(chain) {
        if (!chain) return false;
        return (chain.currentSession || 0) > (chain.totalSessions || 0);
    }

    /**
     * Which break follows the session that just ended — the long break closes out a finished chain, a short
     * break sits between sessions. PURE.
     * @param {{ currentSession?: number, totalSessions?: number, breakDuration: number, longBreakDuration: number }} chain
     * @returns {{ isLongBreak: boolean, minutes: number }}
     */
    function breakPlan(chain) {
        const isLongBreak = isChainFinished(chain);
        return {
            isLongBreak,
            minutes: isLongBreak ? chain.longBreakDuration : chain.breakDuration,
        };
    }

    /**
     * Completion bonus for a whole Pomodoro chain: a flat crystal grant plus per-session XP. PURE.
     * @param {number} totalSessions
     * @returns {{ crystals: number, xp: number }}
     */
    function chainCompletionRewards(totalSessions) {
        return {
            crystals: CHAIN_BONUS_CRYSTALS,
            xp: (totalSessions || 0) * CHAIN_XP_PER_SESSION,
        };
    }

    const FOCUS_SESSION_LOGIC = Object.freeze({
        DEFAULT_SESSION_MINUTES,
        EXTENDED_SESSION_MINUTES,
        DEEP_WORK_GRACE_MINUTES,
        FOCUS_MODE_XP_BONUS,
        CHAIN_BONUS_CRYSTALS,
        CHAIN_XP_PER_SESSION,
        DEFAULT_CHAIN_SETTINGS,
        defaultChainSettings,
        sessionMinutes,
        minutesToMs,
        remainingSeconds,
        deepWorkWindowMs,
        deepWorkAdvance,
        focusXpBonus,
        isChainFinished,
        breakPlan,
        chainCompletionRewards,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // FOCUS_SESSION_LOGIC property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.FOCUS_SESSION_LOGIC = FOCUS_SESSION_LOGIC;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = FOCUS_SESSION_LOGIC;
})();
