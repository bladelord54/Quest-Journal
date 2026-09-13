// @ts-check
'use strict';
/**
 * daily-quest-logic.js — pure Daily Quest Board rules (Engineering Roadmap #1).
 *
 * 80th incremental slice of the goal-manager.js God class, and the TWENTY-FIFTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic / reminder-schedule-logic / enchantment-lifecycle / bounty-logic /
 * recurring-logic pattern). It CLOSES the daily-board pair: the render half already went out in
 * daily-board-render.js (the 17th render module, 50th slice), so this is the save/load-style
 * split — data-driven view already extracted, the state math it renders now follows.
 *
 * ── WHAT THIS OWNS ─────────────────────────────────────────────────────────────────────────────────
 *
 * Two inline bodies had ZERO isolation coverage and both carry real logic:
 *
 *   - generateDailyQuestBoard : the date-seeded deterministic shuffle + level-eligibility filter that
 *     picks the day's three quests. The shuffle is a Lehmer/Park-Miller LCG (`s = (s * 16807) % 2147483647`)
 *     seeded from the date so a given calendar day ALWAYS rolls the same board for a given level — that
 *     determinism is the whole contract (the board must survive a reload without re-rolling), and it had
 *     never been pinned by a test.
 *   - checkDailyQuestCompletion : the `def.check(tracking)` sweep that flips each unclaimed quest to
 *     completed. The `allHabitsComplete` stat update (reads `this.habits`) and the `saveData`/`render`
 *     side-effects stay on the class; only the pure sweep moves here.
 *
 * ── WHY THE POOL IS INJECTED, NOT MOVED ────────────────────────────────────────────────────────────
 *
 * DAILY_QUEST_POOL stays a class field: its entries carry `check(tracking)` CLOSURES (not JSON data),
 * and three other class methods read it (`generateDailyQuestBoard`, `checkDailyQuestCompletion`,
 * `claimDailyQuest`, `renderDailyQuestBoard`). Passing it in as a param keeps this a clean LOGIC slice
 * (pure given `(pool, level, dateString, tracking)`) without a new load-order dependency, exactly as the
 * roadmap's 80th-slice note prescribes.
 *
 * ── PRESERVED VERBATIM ─────────────────────────────────────────────────────────────────────────────
 *
 *   - The seed is `dateString.split('-').join('')` parsed as an int mod 2147483647 — a 'YYYY-MM-DD'
 *     stamp becomes 'YYYYMMDD'. Kept exactly so today's board is byte-for-byte the same as before.
 *   - `count` defaults to 3 (the board size) but is a param so a test can shrink/grow it.
 *   - The board record shape `{ date, quests: [{ id, completed:false, claimed:false }], allClaimedBonus:false }`
 *     is what `saveData`/`loadData` round-trip and what daily-board-render.js reads.
 *   - `sweepQuestCompletions` MUTATES the quest records it is handed (setting `completed = true`), matching
 *     the original in-place behaviour, and RETURNS whether any NEW completion happened so the caller keeps
 *     its `if (anyNewCompletion) { saveData(); render(); }` guard.
 *
 * Dual-environment, no bundler (mirrors the other logic modules):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.DAILY_QUEST_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./daily-quest-logic.js') returns the frozen object via module.exports.
 */


/**
 * @typedef {Object} DailyQuestDef
 * @property {string} id
 * @property {number} minLevel
 * @property {(tracking: any) => boolean} check
 */

/**
 * @typedef {Object} BoardQuest
 * @property {string} id
 * @property {boolean} completed
 * @property {boolean} claimed
 */

/**
 * The board size — the number of quests rolled onto the board each day.
 * @type {number}
 */
const DEFAULT_BOARD_SIZE = 3;

/**
 * Deterministic date-seeded shuffle (Lehmer / Park-Miller LCG). Returns a NEW array; the input is
 * left untouched. The same `dateString` always yields the same ordering, which is what makes the
 * daily board stable across reloads.
 * @template T
 * @param {T[]} items
 * @param {string} dateString — 'YYYY-MM-DD'
 * @returns {T[]}
 */
function seededShuffle(items, dateString) {
    const shuffled = [...items];
    const seed = dateString.split('-').join('');
    let s = parseInt(seed) % 2147483647;
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Filter the pool to level-eligible quests, seed-shuffle them by date, take the first `count`, and
 * map each to a fresh board-quest record.
 * @param {ReadonlyArray<DailyQuestDef>} pool
 * @param {number} level
 * @param {string} dateString
 * @param {number} [count]
 * @returns {BoardQuest[]}
 */
function pickDailyQuests(pool, level, dateString, count = DEFAULT_BOARD_SIZE) {
    const eligible = (pool || []).filter(q => level >= q.minLevel);
    const shuffled = seededShuffle(eligible, dateString);
    return shuffled.slice(0, count).map(q => ({ id: q.id, completed: false, claimed: false }));
}

/**
 * The full daily-board record for a given day.
 * @param {ReadonlyArray<DailyQuestDef>} pool
 * @param {number} level
 * @param {string} dateString
 * @param {number} [count]
 * @returns {{ date: string, quests: BoardQuest[], allClaimedBonus: boolean }}
 */
function buildDailyQuestBoard(pool, level, dateString, count = DEFAULT_BOARD_SIZE) {
    return {
        date: dateString,
        quests: pickDailyQuests(pool, level, dateString, count),
        allClaimedBonus: false,
    };
}

/**
 * Sweep the board's quests, flipping each unclaimed-and-incomplete quest to `completed` when its
 * pool def's `check(tracking)` passes. MUTATES the quest records in place (matching the original) and
 * returns whether ANY new completion happened.
 * @param {BoardQuest[]} quests
 * @param {ReadonlyArray<DailyQuestDef>} pool
 * @param {any} tracking
 * @returns {boolean}
 */
function sweepQuestCompletions(quests, pool, tracking) {
    let anyNewCompletion = false;
    (quests || []).forEach(quest => {
        if (quest.completed) return;
        const def = (pool || []).find(q => q.id === quest.id);
        if (def && def.check(tracking)) {
            quest.completed = true;
            anyNewCompletion = true;
        }
    });
    return anyNewCompletion;
}

const DAILY_QUEST_LOGIC = Object.freeze({
    DEFAULT_BOARD_SIZE,
    seededShuffle,
    pickDailyQuests,
    buildDailyQuestBoard,
    sweepQuestCompletions,
});


// Node / Jest

export default DAILY_QUEST_LOGIC;
