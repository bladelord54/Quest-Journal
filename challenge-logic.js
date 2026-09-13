// @ts-check
'use strict';
/**
 * challenge-logic.js — Challenge-a-Friend data + pure rules (Engineering Roadmap #1, 89th slice,
 * the THIRTY-THIRD LOGIC module; fourth of the five extractions queued by the Sep 7 criterion-(1)/(2)
 * audit).
 *
 * Four things the challenge methods on the class carried inline, now in one place:
 *
 *   - PRESETS — the 8 preset challenge templates (id, `{n}`-templated title, icon, tracked field,
 *     trackType daily|cumulative|delta, default n, option list). Single-sourced already (85th audit);
 *     moved here as the data half so the field/trackType contract sits next to the progress reader.
 *   - challengeRewards(difficulty) — the difficulty → { xp, gold } table; unknown → medium.
 *   - challengeProgress(challenge, snapshot) — { current, target, pct } with the 100 clamp. `snapshot`
 *     is `{ dailyTracking, loginStreak, bossesDefeated }` read off the instance; custom challenges
 *     are 0/1 on `completed`.
 *   - archiveCompleted(history, challenge) — push + keep the last COMPLETED_HISTORY_CAP (50).
 *     Returns a NEW array (the class reassigns `this.completedChallenges`).
 *
 * Dual-environment, no bundler (mirrors chest-weight-logic.js):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.CHALLENGE_LOGIC.
 *   - Jest/Node: require('./challenge-logic.js') returns the frozen namespace.
 */

/**
 * @typedef {{ id: string, title: string, icon: string, field: string,
 *             trackType: 'daily'|'cumulative'|'delta', defaults: { n: number }, options: ReadonlyArray<number> }} ChallengePreset
 */

/** @type {ReadonlyArray<ChallengePreset>} */
const PRESETS = Object.freeze(/** @type {ChallengePreset[]} */ ([
    { id: 'tasks_today', title: 'Complete {n} tasks today', icon: '<i class="ri-sword-line"></i>', field: 'tasksCompleted', trackType: 'daily', defaults: { n: 5 }, options: [3, 5, 7, 10] },
    { id: 'habits_today', title: 'Complete {n} habits today', icon: '<i class="ri-loop-right-line"></i>', field: 'habitsCompleted', trackType: 'daily', defaults: { n: 3 }, options: [2, 3, 5] },
    { id: 'login_streak', title: 'Reach a {n}-day login streak', icon: '<i class="ri-fire-line"></i>', field: 'loginStreak', trackType: 'cumulative', defaults: { n: 7 }, options: [3, 7, 14, 30] },
    { id: 'defeat_boss', title: 'Defeat {n} boss(es)', icon: '<i class="ri-skull-2-line"></i>', field: 'bossesDefeated', trackType: 'delta', defaults: { n: 1 }, options: [1, 3, 5] },
    { id: 'focus_sessions', title: 'Complete {n} focus session(s)', icon: '<i class="ri-focus-3-line"></i>', field: 'focusSessions', trackType: 'daily', defaults: { n: 1 }, options: [1, 2, 3] },
    { id: 'earn_xp', title: 'Earn {n} XP today', icon: '<i class="ri-star-fill"></i>', field: 'xpEarned', trackType: 'daily', defaults: { n: 100 }, options: [50, 100, 200, 500] },
    { id: 'earn_gold', title: 'Earn {n} gold today', icon: '<i class="ri-coin-line"></i>', field: 'goldEarned', trackType: 'daily', defaults: { n: 50 }, options: [25, 50, 100, 200] },
    { id: 'side_quests', title: 'Complete {n} side quest(s)', icon: '<i class="ri-compass-3-line"></i>', field: 'sideQuestsCompleted', trackType: 'daily', defaults: { n: 2 }, options: [1, 2, 3, 5] }
]).map(p => Object.freeze({ ...p, defaults: Object.freeze(p.defaults), options: Object.freeze(p.options) })));

/** Difficulty → flat reward. Unknown difficulty falls back to medium. */
const REWARDS = Object.freeze({
    easy:   Object.freeze({ xp: 25,  gold: 15 }),
    medium: Object.freeze({ xp: 50,  gold: 30 }),
    hard:   Object.freeze({ xp: 100, gold: 60 }),
    epic:   Object.freeze({ xp: 200, gold: 100 })
});

/** completedChallenges history keeps only the most recent N. */
const COMPLETED_HISTORY_CAP = 50;

/**
 * @param {string} presetId
 * @returns {ChallengePreset | null}
 */
function findPreset(presetId) {
    return PRESETS.find(p => p.id === presetId) || null;
}

/**
 * @param {string} difficulty
 * @returns {{ xp: number, gold: number }}
 */
function challengeRewards(difficulty) {
    return REWARDS[/** @type {keyof typeof REWARDS} */ (difficulty)] || REWARDS.medium;
}

/**
 * @param {{ type?: string, completed?: boolean, target?: number, trackType?: string, field?: string, startValue?: number }} challenge
 * @param {{ dailyTracking?: Record<string, number>, loginStreak?: number, bossesDefeated?: number }} snapshot
 * @returns {{ current: number, target: number, pct: number }}
 */
function challengeProgress(challenge, snapshot) {
    if (challenge.type === 'custom') {
        return { current: challenge.completed ? 1 : 0, target: 1, pct: challenge.completed ? 100 : 0 };
    }

    const s = snapshot || {};
    let current = 0;
    const target = /** @type {number} */ (challenge.target);

    if (challenge.trackType === 'daily') {
        current = (s.dailyTracking && challenge.field && s.dailyTracking[challenge.field]) || 0;
    } else if (challenge.trackType === 'cumulative') {
        if (challenge.field === 'loginStreak') current = s.loginStreak || 0;
    } else if (challenge.trackType === 'delta') {
        let currentTotal = 0;
        if (challenge.field === 'bossesDefeated') currentTotal = s.bossesDefeated || 0;
        current = currentTotal - (challenge.startValue || 0);
    }

    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return { current, target, pct };
}

/**
 * @template T
 * @param {T[]} history
 * @param {T} challenge
 * @returns {T[]} a new array, capped to the last COMPLETED_HISTORY_CAP entries
 */
function archiveCompleted(history, challenge) {
    const next = (history || []).concat([challenge]);
    return next.length > COMPLETED_HISTORY_CAP ? next.slice(-COMPLETED_HISTORY_CAP) : next;
}

const CHALLENGE_LOGIC = Object.freeze({
    PRESETS,
    REWARDS,
    COMPLETED_HISTORY_CAP,
    findPreset,
    challengeRewards,
    challengeProgress,
    archiveCompleted
});

export default CHALLENGE_LOGIC;
