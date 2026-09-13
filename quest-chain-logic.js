// @ts-check
'use strict';
/**
 * quest-chain-logic.js — pure quest-chain progression state math (Engineering Roadmap #1).
 *
 * 82nd incremental slice of the goal-manager.js God class, and the TWENTY-SEVENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic / reminder-schedule-logic / enchantment-lifecycle / bounty-logic / recurring-logic /
 * save-serializer / load-deserializer / daily-quest-logic / wooden-chest-loot pattern). It is the SIBLING of
 * the quest-chain RENDER module (`quest-chain-render.js`, the 7th render slice) — view already extracted, the
 * state transitions it paints now follow, the same save/load-style split the daily-board pair used.
 *
 * ── WHAT THIS OWNS ─────────────────────────────────────────────────────────────────────────────────
 *
 * The three progression methods (`toggleChainTask`, `completeChapter`, `completeQuestChain`) interleave PURE
 * state math with heavy impurity (reward grants, toasts, confetti, badge unlocks, `saveData`/`render`). This
 * module lifts ONLY the state math out; everything impure stays on the class, dispatched in the same order.
 *
 *   - toggleTaskIndex(completedTasks, taskIndex) — a NEW array with the index removed if present, appended
 *     otherwise. Mirrors the includes()/filter()/push() branch. Does not mutate.
 *   - isChapterComplete(completedTasks, chapter) — the "every task in this chapter is checked" predicate,
 *     `completedTasks.length === chapter.tasks.length` (the ONLY-adds-when-checking invariant of the toggle
 *     means a length match is a full match). PURE.
 *   - advanceChapterState(chain) — the {currentChapterIndex, completedTasks} the chain becomes after a chapter
 *     clears: index + 1, tasks reset to []. Returns a patch, does NOT mutate the chain.
 *   - isChainComplete(chain, template) — currentChapterIndex has run past the last chapter,
 *     `currentChapterIndex >= template.chapters.length`. PURE.
 *   - completeChainLists(chain, { active, completed, completedAt }) — the active→completed move: a NEW
 *     `{ active, completed }` pair with the chain filtered out of active and (stamped with completedAt)
 *     appended to completed. Matches the filter-by-id both the template-present and template-missing branches
 *     used. Does NOT mutate the input arrays; the caller stamps chain.completedAt before persisting.
 *
 * The class keeps: the `activeQuestChains.find(...)` lookup + guard, the `Number(chainId)` coercion, the
 * clock read for `completedAt` (`new Date().toISOString()`), every reward grant (addXP/addGold/addSpellToBook,
 * the 5000/5000 chain-master payout), showAchievement, createConfetti (+ the two setTimeout bursts),
 * unlockBadge, and saveData/render.
 *
 * Dual-environment, no bundler (mirrors spell-lifecycle.js and the other logic modules):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.QUEST_CHAIN_LOGIC. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./quest-chain-logic.js') returns the frozen object via module.exports (and also
 *     sets window.QUEST_CHAIN_LOGIC under jsdom).
 */

/**
 * @typedef {{ tasks: any[] }} Chapter
 * @typedef {{ id: any, currentChapterIndex: number, completedTasks: number[], completedAt?: string }} Chain
 */

/**
 * Toggle a task index in a chapter's completed set: remove it if present, append it otherwise. Returns a
 * NEW array — does not mutate. Mirrors the inline includes()/filter()/push() branch. PURE.
 * @param {number[]|null|undefined} completedTasks
 * @param {number} taskIndex
 * @returns {number[]}
 */
function toggleTaskIndex(completedTasks, taskIndex) {
    const list = completedTasks || [];
    return list.includes(taskIndex)
        ? list.filter(i => i !== taskIndex)
        : [...list, taskIndex];
}

/**
 * True when every task in the chapter is checked. The toggle only ever ADDS an index when checking (and
 * removes on uncheck), so a length match is a full match — exactly the inline test. PURE.
 * @param {number[]|null|undefined} completedTasks
 * @param {Chapter|null|undefined} chapter
 * @returns {boolean}
 */
function isChapterComplete(completedTasks, chapter) {
    if (!chapter || !chapter.tasks) return false;
    return (completedTasks || []).length === chapter.tasks.length;
}

/**
 * The chain state after a chapter clears: advance to the next chapter and reset the completed-task set.
 * Returns a PATCH ({ currentChapterIndex, completedTasks }) rather than mutating the chain. PURE.
 * @param {Chain} chain
 * @returns {{ currentChapterIndex: number, completedTasks: number[] }}
 */
function advanceChapterState(chain) {
    return {
        currentChapterIndex: chain.currentChapterIndex + 1,
        completedTasks: [],
    };
}

/**
 * True when the chain has advanced past its last chapter. `currentChapterIndex >= chapters.length`,
 * exactly the inline completion check. PURE.
 * @param {Chain} chain
 * @param {{ chapters: any[] }|null|undefined} template
 * @returns {boolean}
 */
function isChainComplete(chain, template) {
    if (!template || !template.chapters) return false;
    return chain.currentChapterIndex >= template.chapters.length;
}

/**
 * The active→completed move as pure list math. Returns a NEW { active, completed } pair: the chain removed
 * from `active` by id, and the chain (stamped with `completedAt` when provided) appended to `completed`.
 * Does NOT mutate the input arrays. Mirrors both the template-present and template-missing branches, which
 * used the identical filter-by-id + push. PURE.
 * @param {Chain} chain
 * @param {{ active: Chain[], completed: Chain[], completedAt?: string }} ctx
 * @returns {{ active: Chain[], completed: Chain[] }}
 */
function completeChainLists(chain, ctx) {
    const completedChain = ctx.completedAt === undefined
        ? chain
        : { ...chain, completedAt: ctx.completedAt };
    return {
        active: (ctx.active || []).filter(c => c.id !== chain.id),
        completed: [...(ctx.completed || []), completedChain],
    };
}

const QUEST_CHAIN_LOGIC = Object.freeze({
    toggleTaskIndex,
    isChapterComplete,
    advanceChapterState,
    isChainComplete,
    completeChainLists,
});


// Node / Jest

export default QUEST_CHAIN_LOGIC;
