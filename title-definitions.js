// @ts-check
'use strict';
/**
 * title-definitions.js — the achievement-title catalog + pure unlock logic (Engineering Roadmap #1).
 *
 * 79th incremental slice of the goal-manager.js God class, and the TWIN of the badge de-drift
 * (see achievement-definitions.js + checkBadges): the achievement-title list was hand-maintained in
 * TWO places — the unlock thresholds in goal-manager.js's checkTitleUnlocks (~40 hand-coded
 * `if (stat >= N && !hasTitle('id')) unlockTitle('id', 'Name', 'Desc')` lines) AND the presentational
 * `titleCategories` catalog inside title-render.js (the same ~40 ids/names/descriptions/rarities,
 * grouped by category). Change one and forget the other and a title either unlocks but renders as
 * `???`, or shows in the gallery yet never unlocks — exactly the two-copies-of-one-list drift the
 * July 2026 loot bug was. This module is now the SINGLE SOURCE OF TRUTH for both.
 *
 * Two unlock sources, reflected in the schema:
 *   - THRESHOLD titles carry `{ type, target }` — a stat key (see the `stats` object checkTitleUnlocks
 *     gathers) and the count that unlocks them. computeUnlockableTitles() derives every unlock from
 *     these, so checkTitleUnlocks no longer hand-codes them.
 *   - EXTERNALLY-GRANTED titles omit `type`/`target` (the Login-Streak Milestones `centurion` /
 *     `mythic_warrior` are granted by the daily-login-bonus flow via its `extra.type === 'title'`
 *     reward, NOT by checkTitleUnlocks). They still appear in the catalog so the gallery renders them.
 *
 * Faithfulness note: the DISPLAYED name/description always came from the title-render catalog (the
 * gallery maps over titleCategories, not the stored unlockedTitles records), and the stored record's
 * `description` is never shown for titles (only its `name`, on the active-title banner). So unifying on
 * the catalog strings is display-invisible. Two descriptions that the OLD unlock path stored differ
 * only in wording — `quest_master`/`grand_master` said "Complete 500/1000 quests" vs the gallery's
 * "...tasks"; the stored value now simply matches the gallery, exactly as the badge slice accepted for
 * its vestigial `description`. Every name is identical across the two old copies, so the active-title
 * banner is byte-unchanged.
 *
 * Dual-environment, no bundler (mirrors achievement-definitions.js / balance.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js AND title-render.js in index.html;
 *     attaches window.TITLE_DEFINITIONS. goal-manager.js captures it into a module-scoped const and
 *     title-render.js reads its `.categories` at render time.
 *   - Jest/Node: require('./title-definitions.js') returns the frozen object via module.exports (and
 *     also sets window.TITLE_DEFINITIONS under jsdom).
 */

/**
 * Recursively freeze the catalog so no call site can mutate the shared table (or reorder/splice
 * a category's titles) at runtime.
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

// One collapsible section per category. `key`/`icon`/`label`/`color` drive the gallery section
// chrome; each title's `id`/`name`/`description`/`rarity` drive its card. THRESHOLD titles also
// carry `type` (a stat key) + `target` (the unlocking count); externally-granted titles omit them.
const CATEGORIES = deepFreeze([
    { key: 'early', icon: '⚔️', label: 'Early Game', color: 'green', titles: [
        { id: 'beginner', name: 'The Beginner', description: 'Complete your first task', rarity: 'common', type: 'tasks', target: 1 },
        { id: 'habit_starter', name: 'Habit Starter', description: 'Create your first habit', rarity: 'common', type: 'habits', target: 1 },
        { id: 'apprentice', name: 'The Apprentice', description: 'Reach Level 5', rarity: 'common', type: 'level', target: 5 },
    ]},
    { key: 'tasks', icon: '📜', label: 'Quest Milestones', color: 'amber', titles: [
        { id: 'determined', name: 'The Determined', description: 'Complete 10 tasks', rarity: 'common', type: 'tasks', target: 10 },
        { id: 'dedicated', name: 'The Dedicated', description: 'Complete 50 tasks', rarity: 'uncommon', type: 'tasks', target: 50 },
        { id: 'seasoned_adventurer', name: 'Seasoned Adventurer', description: 'Complete 100 tasks', rarity: 'rare', type: 'tasks', target: 100 },
        { id: 'relentless', name: 'The Relentless', description: 'Complete 250 tasks', rarity: 'epic', type: 'tasks', target: 250 },
        { id: 'quest_master', name: 'Quest Master', description: 'Complete 500 tasks', rarity: 'epic', type: 'tasks', target: 500 },
        { id: 'grand_master', name: 'Grand Master', description: 'Complete 1000 tasks', rarity: 'legendary', type: 'tasks', target: 1000 },
    ]},
    { key: 'streaks', icon: '🔥', label: 'Habit Streaks', color: 'orange', titles: [
        { id: 'consistent', name: 'The Consistent', description: 'Maintain a 3-day streak', rarity: 'common', type: 'streak', target: 3 },
        { id: 'disciplined', name: 'The Disciplined', description: 'Maintain a 7-day streak', rarity: 'uncommon', type: 'streak', target: 7 },
        { id: 'devoted', name: 'The Devoted', description: 'Maintain a 14-day streak', rarity: 'rare', type: 'streak', target: 14 },
        { id: 'unstoppable', name: 'The Unstoppable', description: 'Maintain a 30-day streak', rarity: 'epic', type: 'streak', target: 30 },
        { id: 'iron_will', name: 'Iron Will', description: 'Maintain a 60-day streak', rarity: 'epic', type: 'streak', target: 60 },
        { id: 'the_ascended', name: 'The Ascended', description: 'Maintain a 100-day streak', rarity: 'legendary', type: 'streak', target: 100 },
        { id: 'eternal', name: 'The Eternal', description: 'Maintain a 365-day streak', rarity: 'legendary', type: 'streak', target: 365 },
    ]},
    { key: 'levels', icon: '⬆️', label: 'Level Milestones', color: 'blue', titles: [
        { id: 'journeyman', name: 'Journeyman', description: 'Reach Level 10', rarity: 'uncommon', type: 'level', target: 10 },
        { id: 'veteran', name: 'Veteran', description: 'Reach Level 25', rarity: 'rare', type: 'level', target: 25 },
        { id: 'elite', name: 'Elite', description: 'Reach Level 50', rarity: 'epic', type: 'level', target: 50 },
        { id: 'legendary_hero', name: 'Legendary Hero', description: 'Reach Level 100', rarity: 'legendary', type: 'level', target: 100 },
    ]},
    { key: 'goals', icon: '🏰', label: 'Goal Conqueror', color: 'purple', titles: [
        // Life goals are major arcs even at count=1, so they skew
        // higher than raw count suggests. Yearly goal = legendary
        // because it represents a full annual commitment.
        { id: 'legendary', name: 'The Legendary', description: 'Complete a life goal', rarity: 'epic', type: 'lifeGoals', target: 1 },
        { id: 'dream_chaser', name: 'Dream Chaser', description: 'Complete 5 life goals', rarity: 'legendary', type: 'lifeGoals', target: 5 },
        { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Complete 10 weekly goals', rarity: 'epic', type: 'weeklyGoals', target: 10 },
        { id: 'monthly_champion', name: 'Monthly Champion', description: 'Complete 6 monthly goals', rarity: 'epic', type: 'monthlyGoals', target: 6 },
        { id: 'visionary', name: 'The Visionary', description: 'Complete a yearly goal', rarity: 'legendary', type: 'yearlyGoals', target: 1 },
    ]},
    { key: 'wealth', icon: '💰', label: 'Wealth & Treasury', color: 'yellow', titles: [
        { id: 'wealthy', name: 'The Wealthy', description: 'Accumulate 1,000 gold', rarity: 'uncommon', type: 'gold', target: 1000 },
        { id: 'rich', name: 'The Rich', description: 'Accumulate 10,000 gold', rarity: 'epic', type: 'gold', target: 10000 },
        { id: 'tycoon', name: 'Tycoon', description: 'Accumulate 100,000 gold', rarity: 'legendary', type: 'gold', target: 100000 },
        { id: 'treasure_hunter', name: 'Treasure Hunter', description: 'Open your first chest', rarity: 'common', type: 'chests', target: 1 },
        { id: 'loot_seeker', name: 'Loot Seeker', description: 'Open 25 chests', rarity: 'rare', type: 'chests', target: 25 },
        { id: 'chest_master', name: 'Chest Master', description: 'Open 100 chests', rarity: 'legendary', type: 'chests', target: 100 },
    ]},
    { key: 'arcane', icon: '✨', label: 'Arcane Mastery', color: 'indigo', titles: [
        { id: 'focused', name: 'The Focused', description: 'Complete your first focus session', rarity: 'common', type: 'focus', target: 1 },
        { id: 'zen_master', name: 'Zen Master', description: 'Complete 25 focus sessions', rarity: 'rare', type: 'focus', target: 25 },
        { id: 'meditation_guru', name: 'Meditation Guru', description: 'Complete 100 focus sessions', rarity: 'legendary', type: 'focus', target: 100 },
        { id: 'spellcaster', name: 'Spellcaster', description: 'Cast your first spell', rarity: 'common', type: 'spells', target: 1 },
        { id: 'mage', name: 'Mage', description: 'Cast 25 spells', rarity: 'rare', type: 'spells', target: 25 },
        { id: 'archmage', name: 'Archmage', description: 'Cast 50 spells', rarity: 'epic', type: 'spells', target: 50 },
    ]},
    { key: 'combat', icon: '🐉', label: 'Combat & Companions', color: 'red', titles: [
        { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat your first boss', rarity: 'common', type: 'bosses', target: 1 },
        { id: 'champion', name: 'Champion', description: 'Defeat 10 bosses', rarity: 'rare', type: 'bosses', target: 10 },
        { id: 'dragon_slayer', name: 'Dragon Slayer', description: 'Defeat 50 bosses', rarity: 'legendary', type: 'bosses', target: 50 },
        // Companions drop from chests, so first companion is
        // onboarding tier; collecting all 10 is the capstone.
        { id: 'beast_friend', name: 'Beast Friend', description: 'Obtain your first companion', rarity: 'common', type: 'companions', target: 1 },
        { id: 'beast_master', name: 'Beast Master', description: 'Collect 5 companions', rarity: 'rare', type: 'companions', target: 5 },
        { id: 'menagerie_keeper', name: 'Menagerie Keeper', description: 'Collect 10 companions', rarity: 'legendary', type: 'companions', target: 10 },
    ]},
    // Login-Streak Milestones are granted EXTERNALLY by the daily-login-bonus flow
    // (LOGIN_STREAK_MILESTONES → extra.type === 'title'), not by checkTitleUnlocks, so
    // they carry no `type`/`target`. They appear here purely so the gallery renders them.
    { key: 'login', icon: '👑', label: 'Login Streak Milestones', color: 'yellow', titles: [
        { id: 'centurion', name: '🌟 Centurion', description: '100-day login streak', rarity: 'epic' },
        { id: 'mythic_warrior', name: '🏆 Mythic Warrior', description: '365-day login streak', rarity: 'legendary' },
    ]},
]);

/**
 * PURE unlock logic behind checkTitleUnlocks. Given a `stats` object keyed by the catalog's `type`
 * values and the player's current `unlockedTitles`, return every THRESHOLD title whose stat has met
 * its target and is not yet unlocked, as `{ id, name, description }` ready for unlockTitle(). Titles
 * without a `type`/`target` (externally granted) are skipped. Iterates the catalog in declared order.
 * @param {Record<string, number>} stats
 * @param {Array<{ id?: string }|string>} unlockedTitles
 * @returns {Array<{ id: string, name: string, description: string }>}
 */
function computeUnlockableTitles(stats, unlockedTitles) {
    const list = Array.isArray(unlockedTitles) ? unlockedTitles : [];
    const has = (/** @type {string} */ id) => list.some(t => (t && typeof t === 'object') ? t.id === id : t === id);
    const s = stats || {};
    const result = [];
    for (const cat of CATEGORIES) {
        for (const t of cat.titles) {
            const def = /** @type {any} */ (t);
            if (typeof def.type !== 'string' || typeof def.target !== 'number') continue;
            if ((s[def.type] || 0) >= def.target && !has(def.id)) {
                result.push({ id: def.id, name: def.name, description: def.description });
            }
        }
    }
    return result;
}

const TITLE_DEFINITIONS = Object.freeze({
    categories: CATEGORIES,
    computeUnlockableTitles,
});


// Node / Jest

export default TITLE_DEFINITIONS;
