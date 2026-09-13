// @ts-check
'use strict';
import FEATURE_UNLOCKS from './feature-unlocks.js';
/**
 * daily-quest-definitions.js — the Daily Quest Board catalog (Engineering Roadmap #1, criterion-(2)
 * single-source item from the Sep 7 audit; the DATA half of daily-quest-logic.js).
 *
 * `DAILY_QUEST_POOL` was a class field on goal-manager.js whose `minLevel` column RESTATED the
 * progressive-unlock ladder as bare numbers (2 = Treasury, 3 = Arcane, 4 = Boss Battles, 5 = Focus)
 * — and the `6` on the two weekly/side-quest quests was stale: it predated the onboarding fork that
 * opens those goal tabs at level 2, so `side_adventurer` and `weekly_warrior` were hidden four levels
 * longer than the feature they track. Every gate is now DEFINED in terms of feature-unlocks.js
 * (`LEVELS.<view>` for nav views, `GOAL_TAB_LEVELS.default.<tab>` for goal tabs) so the pool cannot
 * drift from the ladder again; `feature` records which gate each quest follows so a test can assert it.
 *
 * Also here: `BOARD_SWEEP_BONUS`, the all-quests-claimed bonus that was stated twice on the class
 * (the `addXP(25)` / `addGold(15)` grants AND the "+25 XP, +15 Gold" toast copy).
 *
 * Entries carry `check(tracking)` closures, so the array is frozen shallowly per entry (functions are
 * not deep-frozen). The pool is INJECTED into daily-quest-logic.js's pure pick/sweep functions.
 *
 * Dual-environment, no bundler (mirrors the other catalogs):
 *   - Browser: plain <script> AFTER feature-unlocks.js and BEFORE goal-manager.js; attaches
 *     window.DAILY_QUEST_DEFINITIONS.
 *   - Jest/Node: require('./daily-quest-definitions.js') returns the frozen namespace.
 */

const LEVELS = FEATURE_UNLOCKS.LEVELS;
const GOAL_TABS = FEATURE_UNLOCKS.GOAL_TAB_LEVELS.default;

/**
 * @typedef {Object} DailyQuestDef
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {string} icon
 * @property {number} minLevel player level the quest can appear from
 * @property {string|null} feature the feature-unlocks key the gate follows (`nav:<view>` /
 *   `goalTab:<tab>`), or null for always-available quests
 * @property {number} xp
 * @property {number} gold
 * @property {(t: any) => boolean} check predicate over the day's tracking counters
 */

/** @type {ReadonlyArray<Readonly<DailyQuestDef>>} */
const POOL = Object.freeze(/** @type {DailyQuestDef[]} */ ([
    // Always available (Level 1+)
    { id: 'early_bird', name: 'Early Bird', desc: 'Complete a task before noon', icon: '🌅', minLevel: 1, feature: null, xp: 15, gold: 10, check: (t) => t.tasksBeforeNoon >= 1 },
    { id: 'triple_threat', name: 'Triple Threat', desc: 'Complete 3 tasks today', icon: '⚔️', minLevel: 1, feature: null, xp: 20, gold: 15, check: (t) => t.tasksCompleted >= 3 },
    { id: 'questmaster', name: 'Questmaster', desc: 'Complete 5 tasks today', icon: '👑', minLevel: 1, feature: null, xp: 35, gold: 25, check: (t) => t.tasksCompleted >= 5 },
    { id: 'ritual_keeper', name: 'Ritual Keeper', desc: 'Complete all your habits', icon: '🔥', minLevel: 1, feature: null, xp: 25, gold: 15, check: (t) => t.allHabitsComplete },
    { id: 'habit_starter', name: 'Habit Starter', desc: 'Complete at least 1 habit', icon: '✅', minLevel: 1, feature: null, xp: 10, gold: 5, check: (t) => t.habitsCompleted >= 1 },
    { id: 'productive_day', name: 'Productive Day', desc: 'Complete 3 tasks and 2 habits', icon: '📋', minLevel: 1, feature: null, xp: 30, gold: 20, check: (t) => t.tasksCompleted >= 3 && t.habitsCompleted >= 2 },
    { id: 'new_quest', name: 'New Quest', desc: 'Create a new task today', icon: '📝', minLevel: 1, feature: null, xp: 10, gold: 5, check: (t) => t.tasksCreated >= 1 },
    { id: 'night_owl', name: 'Night Owl', desc: 'Complete a task after 6pm', icon: '🦉', minLevel: 1, feature: null, xp: 15, gold: 10, check: (t) => t.tasksAfter6pm >= 1 },
    { id: 'xp_seeker', name: 'XP Seeker', desc: 'Earn 50+ XP today', icon: '⭐', minLevel: 1, feature: null, xp: 15, gold: 10, check: (t) => t.xpEarned >= 50 },
    { id: 'xp_hunter', name: 'XP Hunter', desc: 'Earn 150+ XP today', icon: '💫', minLevel: 1, feature: null, xp: 30, gold: 20, check: (t) => t.xpEarned >= 150 },
    { id: 'gold_earner', name: 'Gold Earner', desc: 'Earn 30+ gold today', icon: '💰', minLevel: 1, feature: null, xp: 15, gold: 10, check: (t) => t.goldEarned >= 30 },
    // Treasury
    { id: 'treasure_hunter', name: 'Treasure Hunter', desc: 'Open a treasure chest', icon: '🎁', minLevel: LEVELS.rewards, feature: 'nav:rewards', xp: 20, gold: 10, check: (t) => t.chestsOpened >= 1 },
    { id: 'gold_hoarder', name: 'Gold Hoarder', desc: 'Earn 50+ gold today', icon: '🏆', minLevel: LEVELS.rewards, feature: 'nav:rewards', xp: 15, gold: 10, check: (t) => t.goldEarned >= 50 },
    // Arcane Powers
    { id: 'spell_slinger', name: 'Spell Slinger', desc: 'Cast a spell today', icon: '🔮', minLevel: LEVELS.arcane, feature: 'nav:arcane', xp: 20, gold: 15, check: (t) => t.spellsCast >= 1 },
    // Boss Battles
    { id: 'boss_striker', name: 'Boss Striker', desc: 'Deal boss damage today', icon: '💀', minLevel: LEVELS.bossbattles, feature: 'nav:bossbattles', xp: 25, gold: 15, check: (t) => t.bossAttacks >= 1 },
    { id: 'charge_collector', name: 'Charge Collector', desc: 'Earn 3+ attack charges', icon: '⚡', minLevel: LEVELS.bossbattles, feature: 'nav:bossbattles', xp: 20, gold: 10, check: (t) => t.chargesEarned >= 3 },
    // Focus Timer
    { id: 'deep_focus', name: 'Deep Focus', desc: 'Complete a focus session', icon: '🎯', minLevel: LEVELS.focus, feature: 'nav:focus', xp: 25, gold: 20, check: (t) => t.focusSessions >= 1 },
    { id: 'crystal_miner', name: 'Crystal Miner', desc: 'Earn 2+ Focus Crystals', icon: '💎', minLevel: LEVELS.focus, feature: 'nav:focus', xp: 20, gold: 15, check: (t) => t.crystalsEarned >= 2 },
    // Side / Weekly quests (goal tabs — the default onboarding curve)
    { id: 'side_adventurer', name: 'Side Adventurer', desc: 'Complete a side quest', icon: '🧭', minLevel: GOAL_TABS.sidequests, feature: 'goalTab:sidequests', xp: 20, gold: 15, check: (t) => t.sideQuestsCompleted >= 1 },
    { id: 'weekly_warrior', name: 'Weekly Warrior', desc: 'Progress on a weekly goal', icon: '🛡️', minLevel: GOAL_TABS.weekly, feature: 'goalTab:weekly', xp: 20, gold: 15, check: (t) => t.weeklyProgress >= 1 },
]).map(q => Object.freeze(q)));

/** Bonus granted once per day when every quest on the board has been claimed. */
const BOARD_SWEEP_BONUS = Object.freeze({ xp: 25, gold: 15 });

/**
 * Resolve a quest's `feature` key against the ladder: the level its feature unlocks at, or 1
 * for always-available quests. The consistency test asserts `minLevel === featureLevel(q)`.
 * @param {Readonly<DailyQuestDef>} quest
 * @returns {number}
 */
function featureLevel(quest) {
    if (!quest.feature) return 1;
    const [kind, key] = quest.feature.split(':');
    if (kind === 'nav') return LEVELS[key];
    if (kind === 'goalTab') return GOAL_TABS[key];
    return NaN;
}

const DAILY_QUEST_DEFINITIONS = Object.freeze({
    POOL,
    BOARD_SWEEP_BONUS,
    featureLevel
});

export default DAILY_QUEST_DEFINITIONS;
