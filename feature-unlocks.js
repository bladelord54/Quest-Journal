// @ts-check
'use strict';
/**
 * feature-unlocks.js — the ONE source of progressive-unlock thresholds (Engineering Roadmap #1,
 * 85th slice, the THIRTIETH LOGIC module; the second slice taken against Definition-of-done
 * criterion (2), "every table is single-sourced").
 *
 * The criterion-(2) sweep of the tables still inline in initState() found that the feature-unlock
 * knowledge was NOT single-sourced, in four ways:
 *
 *   1. "Arcane Powers unlocks at 3" was written as `arcane: 3` in featureUnlockLevels AND as a bare
 *      `this.level === 3` in checkFeatureUnlocks' welcome-spell grant. Retune the table and the
 *      welcome spell silently stops arriving on the unlock level.
 *   2. "Companions unlock at 3" was a bare literal in THREE places: loot-engine.js's `level < 3`
 *      companion→gold fallback, the Player Panel's companion-section `level >= 3`, and
 *      openCompanionDen's `level < 3` (+ its toast copy). It is not in featureUnlockLevels at all —
 *      it rides the Arcane unlock — so it gets its own named constant here.
 *   3. The `requiredLevel === undefined || level >= requiredLevel` predicate was written three times
 *      (isFeatureUnlocked / isGoalTabUnlocked / isArcaneTabUnlocked) and the desktop-nav "More"
 *      collapse rule `typeof req === 'number' && req >= level + 2` twice (_navCollapsedViews and
 *      _applyNavMoreDisclosure's isCollapsible).
 *   4. The unlock TUTORIALS are keyed by LEVEL (2,3,4,5,6,8,10) while the unlock LEVELS are keyed by
 *      VIEW — nothing tied them together, so a threshold could move without its celebration moving.
 *      A unit test now proves every view in LEVELS above 1 has a tutorial at exactly its level.
 *
 * What is deliberately NOT here: goalTabUnlockLevels (it is DERIVED from the onboarding path via
 * getGoalTabUnlockLevelsForPath and stays on the class), the locked-nav/tab teaser copy (presentation),
 * and challengePresets — single-sourced; it now lives in challenge-logic.js (89th slice).
 *
 * Dual-environment, no bundler (mirrors default-state.js):
 *   - Browser: plain <script> BEFORE loot-engine.js AND goal-manager.js; attaches window.FEATURE_UNLOCKS.
 *   - Jest/Node: require('./feature-unlocks.js') returns the frozen namespace.
 */

/**
 * Minimum level per nav view. Views absent from the table (or at 1) are always open.
 * @type {Readonly<Record<string, number>>}
 */
const LEVELS = Object.freeze({
    dashboard: 1, goals: 1, daily: 1, calendar: 1, tools: 1,
    rewards: 2,
    arcane: 3,
    bossbattles: 4,
    focus: 5,
    questchains: 6
});

/**
 * Minimum level per Arcane Powers sub-tab.
 * @type {Readonly<Record<string, number>>}
 */
const ARCANE_TAB_LEVELS = Object.freeze({
    spellbook: 3,
    enchantments: 5
});

/**
 * Goal-tab (weekly / side-quest / monthly / yearly / life) unlock curves, keyed by the onboarding
 * play-style path. `goals` (Grand Planner) opens the whole hierarchy at level 1; `default` is the
 * fast progressive curve every other path (Daily Focus / no choice yet) uses. Until this table
 * existed the default curve lived only in goal-manager.js and the daily quest pool restated the
 * weekly/side gate as a stale `6` from before the onboarding fork.
 * @type {Readonly<Record<'goals'|'default', Readonly<Record<string, number>>>>}
 */
const GOAL_TAB_LEVELS = Object.freeze({
    goals: Object.freeze({ weekly: 1, sidequests: 1, monthly: 1, yearly: 1, 'life-goals': 1 }),
    default: Object.freeze({ weekly: 2, sidequests: 2, monthly: 3, yearly: 4, 'life-goals': 4 })
});

/**
 * The goal-tab curve for an onboarding path; anything but 'goals' is the default curve.
 * @param {string|null|undefined} path
 * @returns {Readonly<Record<string, number>>}
 */
function goalTabLevelsForPath(path) {
    return path === 'goals' ? GOAL_TAB_LEVELS.goals : GOAL_TAB_LEVELS.default;
}

/**
 * Companions (Den, Player Panel section, loot drops) open with Arcane Powers. Not a nav view,
 * so it is not in LEVELS — but it is the same beat, so it is DEFINED in terms of it.
 */
const COMPANION_UNLOCK_LEVEL = LEVELS.arcane;

/**
 * Growth gates (criterion-(2) follow-up to the 85th slice). Not feature unlocks, but level gates
 * all the same, and the referral one was stated twice: in checkReferralReward's guard AND in the
 * referred-user welcome toast ("Reach Level 2 for a bonus chest!").
 */
/** A referred player must reach this level before the referral bonus chest is granted. */
const REFERRAL_REWARD_LEVEL = 2;
/** The in-app review prompt never fires below this level (too early to have an opinion). */
const REVIEW_PROMPT_MIN_LEVEL = 3;

/**
 * How many levels out a locked nav view must be before the desktop sidebar tucks it behind the
 * "More" disclosure. Unlocked views and the immediate next unlock always stay visible.
 */
const NAV_MORE_HORIZON = 2;

/**
 * Feature-unlock celebration popups, keyed by the level they fire at.
 * @type {Readonly<Record<number, Readonly<{ title: string, text: string }>>>}
 */
const TUTORIALS = Object.freeze({
    2: Object.freeze({ title: '🏆 Treasury Unlocked!', text: "You've earned gold from your quests! Visit the Treasury to open treasure chests and discover spells, themes, and companions." }),
    3: Object.freeze({ title: '🔮 Arcane Powers Unlocked!', text: "Your Spellbook is ready! You've received a welcome spell — visit Arcane Powers to view and cast it. Earn more spells from treasure chests and boss loot!" }),
    4: Object.freeze({ title: '💀 Boss Battles Unlocked!', text: "Challenge daily and weekly bosses! Complete quests to earn attack charges and defeat powerful foes for epic loot rewards!" }),
    5: Object.freeze({ title: '🎯 Focus Timer & Enchantments!', text: "The Focus Timer lets you earn Focus Crystals through timed work sessions. Chain multiple sessions together for bonus rewards! Spend crystals on Enchantments for powerful buffs." }),
    // Quest Chains still unlock at L6 (questchains in LEVELS). The weekly/side-quest/monthly/
    // yearly/life goal tabs unlock far earlier via the onboarding fork, so their old L6/L7/L9
    // celebration toasts were removed to avoid announcing unlocks that already happened.
    6: Object.freeze({ title: '⚔️ Quest Chains Unlocked!', text: "Quest Chains let you link tasks into epic multi-step adventures for bonus rewards! You've also unlocked the Forest Kingdom theme." }),
    8: Object.freeze({ title: '🎖️ Choose Your Class!', text: "A major milestone! Open your Player Panel to choose a class — Warrior, Ranger, Wizard, or Scholar — each with its own perk tree. Pick freely now (re-picks are free until Level 10), then at Level 10 you'll start earning skill points to spend on your path!" }),
    10: Object.freeze({ title: '👑 Legend Status & Skill Points!', text: "You've reached Level 10 — the rank of Legend! Your class skill points now begin: every level from here grants a point to spend in your Player Panel's class tree on powerful perks." })
});

/**
 * The shared unlock predicate. A key absent from the table is always unlocked.
 * @param {Readonly<Record<string, number>>} levels
 * @param {string} key
 * @param {number} level the player's current level
 * @returns {boolean}
 */
function isUnlocked(levels, key, level) {
    const requiredLevel = levels[key];
    if (requiredLevel === undefined) return true;
    return level >= requiredLevel;
}

/**
 * The desktop-nav "More" collapse rule: a locked view is tucked away when it unlocks
 * NAV_MORE_HORIZON or more levels out. Non-numeric thresholds are never collapsed.
 * @param {unknown} requiredLevel
 * @param {number} level the player's current level
 * @returns {boolean}
 */
function isFarOff(requiredLevel, level) {
    return typeof requiredLevel === 'number' && requiredLevel >= level + NAV_MORE_HORIZON;
}

const FEATURE_UNLOCKS = Object.freeze({
    LEVELS,
    ARCANE_TAB_LEVELS,
    GOAL_TAB_LEVELS,
    goalTabLevelsForPath,
    COMPANION_UNLOCK_LEVEL,
    REFERRAL_REWARD_LEVEL,
    REVIEW_PROMPT_MIN_LEVEL,
    NAV_MORE_HORIZON,
    TUTORIALS,
    isUnlocked,
    isFarOff
});

export default FEATURE_UNLOCKS;
