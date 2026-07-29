// @ts-check
'use strict';
/**
 * achievement-definitions.js — the achievement/badge catalog (Engineering Roadmap #1).
 *
 * Fifth incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. An ordered LIST (not a keyed map) of the game's milestone
 * badges; each entry carries display metadata (name/description/icon), the
 * progress `type` it tracks (see getAchievementProgress()), the `target` count
 * that unlocks it, and a `rarity` tier that drives the `.rarity-frame` chrome in
 * the Achievement Gallery.
 *
 * `rarity` tiers are calibrated against actual effort:
 *   - common     onboarding action / one-shot setup (first quest, 30 future-task plan)
 *   - uncommon   a few days of casual play (10 tasks, 7-day streak, 20 spells cast,
 *                5 bosses, 10 chests)
 *   - rare       a couple weeks of committed use (50 tasks, first life goal)
 *   - epic       a couple months of dedicated play (30-day streak, 100 tasks,
 *                50 chests, 25 focus sessions ≈ 10 h)
 *   - legendary  extreme commitment (500 tasks, 100-day streak, 5 life goals)
 * Life-goal badges skew higher than their target counts suggest because
 * completing a life goal is itself a major arc.
 *
 * NOTE (Roadmap #1 follow-up): checkBadges() in goal-manager.js currently
 * hand-codes these same thresholds/names/icons a SECOND time to decide when to
 * unlock each badge. That parallel copy is exactly the drift risk Roadmap #1
 * targets — a future slice should have checkBadges() derive from this catalog
 * (id + type + target) instead of duplicating it.
 *
 * Dual-environment, no bundler (mirrors balance.js / level-titles.js /
 * companion-definitions.js / spell-definitions.js / theme-definitions.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.ACHIEVEMENT_DEFINITIONS. goal-manager.js captures it into
 *     a module-scoped const and returns it from getAchievementDefinitions(), so
 *     every call site is unchanged.
 *   - Jest/Node: `require('./achievement-definitions.js')` returns the array via
 *     module.exports (and also sets window.ACHIEVEMENT_DEFINITIONS under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — no call site can
     * accidentally mutate the shared table (or reorder/splice the list) at runtime.
     * @param {any} obj
     * @returns {any}
     */
    function deepFreeze(obj) {
        Object.getOwnPropertyNames(obj).forEach((key) => {
            const value = obj[key];
            if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                deepFreeze(value);
            }
        });
        return Object.freeze(obj);
    }

    const ACHIEVEMENT_DEFINITIONS = deepFreeze([
        { id: 'first_quest', name: 'First Quest', description: 'Complete your first quest', icon: '🎖️', type: 'tasks', target: 1, rarity: 'common' },
        { id: 'novice', name: 'Novice', description: 'Complete 10 quests', icon: '🥉', type: 'tasks', target: 10, rarity: 'uncommon' },
        { id: 'adept', name: 'Adept', description: 'Complete 50 quests', icon: '🥈', type: 'tasks', target: 50, rarity: 'rare' },
        { id: 'century', name: 'Century', description: 'Complete 100 quests', icon: '🥇', type: 'tasks', target: 100, rarity: 'epic' },
        { id: 'master', name: 'Master', description: 'Complete 500 quests', icon: '💎', type: 'tasks', target: 500, rarity: 'legendary' },
        { id: 'week_warrior', name: 'Week Warrior', description: '7-day habit streak', icon: '🔥', type: 'streak', target: 7, rarity: 'uncommon' },
        { id: 'month_master', name: 'Month Master', description: '30-day habit streak', icon: '⚡', type: 'streak', target: 30, rarity: 'epic' },
        { id: 'centurion', name: 'Centurion', description: '100-day habit streak', icon: '👑', type: 'streak', target: 100, rarity: 'legendary' },
        { id: 'legend', name: 'Legend', description: 'Complete a life goal', icon: '🌟', type: 'life_goals', target: 1, rarity: 'epic' },
        { id: 'mythic', name: 'Mythic', description: 'Complete 5 life goals', icon: '💫', type: 'life_goals', target: 5, rarity: 'legendary' },
        { id: 'planner', name: 'Master Planner', description: 'Schedule 30+ future tasks', icon: '📅', type: 'future_tasks', target: 30, rarity: 'common' },
        { id: 'treasure_hunter', name: 'Treasure Hunter', description: 'Open 10 chests', icon: '🎁', type: 'chests', target: 10, rarity: 'uncommon' },
        { id: 'treasure_master', name: 'Treasure Master', description: 'Open 50 chests', icon: '👑', type: 'chests', target: 50, rarity: 'epic' },
        { id: 'boss_hunter', name: 'Boss Hunter', description: 'Defeat 5 bosses', icon: '💀', type: 'bosses', target: 5, rarity: 'uncommon' },
        { id: 'spell_caster', name: 'Spell Caster', description: 'Cast 20 spells', icon: '✨', type: 'spells', target: 20, rarity: 'uncommon' },
        { id: 'focus_master', name: 'Focus Master', description: 'Complete 25 focus sessions', icon: '🎯', type: 'focus', target: 25, rarity: 'epic' }
    ]);

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic ACHIEVEMENT_DEFINITIONS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = ACHIEVEMENT_DEFINITIONS;
})();
