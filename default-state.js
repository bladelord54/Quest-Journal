// @ts-check
'use strict';
/**
 * default-state.js — the ONE source of persisted-field defaults (Engineering Roadmap #1).
 *
 * 84th incremental slice of the goal-manager.js God class, and the TWENTY-NINTH LOGIC module. It is the
 * third leg of the persistence trio (save-serializer.js writes the blob, load-deserializer.js reads it, THIS
 * says what every persisted field is when there is nothing to read) and the first slice taken against the
 * roadmap's Definition-of-done criterion (2): "every table of defaults has ONE source with a parity test".
 *
 * WHY. Before this slice the default value of every persisted field lived in TWO places: `initState()` set
 * `this.x = <default>` for a fresh install, and `buildLoadState()` wrote `d.x || <default>` for a save that
 * lacks the field. Ninety-odd fields, two hand-maintained copies — exactly the duplicated-knowledge shape
 * behind the July 2026 loot bug. Writing this module surfaced three drifts on day one: `lastHabitReset`,
 * `lastWeekReset` and `premiumPurchaseToken` were `null` after a load but `undefined` after `initState`
 * (never assigned). Every consumer is a truthiness check, so it was harmless — this time.
 *
 * SHAPE.
 *   - persistedDefaults({ defaultSessionMinutes }) — a FACTORY returning a FRESH object each call. It must
 *     be a factory, not a frozen literal: the array/object defaults (`[]`, `{}`, `{ weekly: null, … }`) are
 *     mutated in place by the game, so two managers (or a manager and a load pass) must never share one.
 *     `focusSessionLength` is the one default that is itself injected (FOCUS_SESSION_LOGIC owns the number),
 *     mirroring buildLoadState's existing `defaultSessionMinutes` option.
 *   - SIMPLE_FIELDS — the frozen list of persisted fields whose load rule is plain `d[key] || default`.
 *     buildLoadState loops over it; initState Object.assigns the whole defaults object. Adding a persisted
 *     field = one default here + one save key in save-serializer; the round-trip suite catches a miss.
 *   - SPECIAL_FIELDS — the persisted fields buildLoadState handles EXPLICITLY (non-`||` fallbacks, type
 *     guards, normalizers, migrations, the class schema gate, the save-key rename). Listed so the parity
 *     test can assert SIMPLE ∪ SPECIAL == every key of persistedDefaults() — nothing falls between.
 *
 * NOT here (stay in initState): session-only state (`draggedItem`, `domCache`, timers, view tabs…), the
 * derived catalogs (`spellDefinitions`, `classDefinitions`, …), the UPPER_CASE tuning constants, and
 * `pomodoroChainSettings` (a FOCUS_SESSION_LOGIC-derived default that load only overrides when present).
 *
 * Dual-environment, no bundler (mirrors load-deserializer.js):
 *   - Browser: plain <script> BEFORE load-deserializer.js and goal-manager.js; attaches window.DEFAULT_STATE.
 *   - Jest/Node: require('./default-state.js') returns the frozen namespace.
 */

/**
 * Fresh defaults for every persisted manager field. See the module header for why this is a factory.
 * @param {{ defaultSessionMinutes: number }} opts
 * @returns {Record<string, any>}
 */
function persistedDefaults({ defaultSessionMinutes }) {
    return {
        // Goal hierarchy + tasks
        lifeGoals: [],
        yearlyGoals: [],
        monthlyGoals: [],
        weeklyGoals: [],
        dailyTasks: [],
        sideQuests: [],
        habits: [],
        recurringTasks: [], // Tasks that repeat on schedule
        xp: 0,
        level: 1,
        badges: [],
        archivedGoals: [],

        // Rewards System
        goldCoins: 0,
        unlockedThemes: ['default'],
        currentTheme: 'default',
        // v2.9 Track 7 — Theme of the Week.
        //
        // Two separate idempotency maps drive the two distinct prompts:
        //
        //   `weeklyTrialPromptShown` — `{ 'YYYY-Wnn': true }` keyed by
        //   ISO year+week. Records that the START-of-week spotlight
        //   ("✨ Theme of the Week — try it now") has been shown for
        //   that week, so navigating back to the Themes panel later in
        //   the same week is a no-op.
        //
        //   `weeklyTrialEndPromptShown` — `{ themeId: true }` keyed by
        //   theme id. Records that the END-of-trial upsell ("Your trial
        //   of {Name} ended — subscribe to keep it") has been shown for
        //   a given premium theme. Tracked PER THEME (not per week) so
        //   a user who got a Sunken Library trial last June and a
        //   Mystic Realm trial this June each see one prompt; we don't
        //   double-prompt if Sunken Library cycles back into the
        //   rotation a year later.
        //
        // Both are cleared back to {} only via Reset Data.
        weeklyTrialPromptShown: {},
        weeklyTrialEndPromptShown: {},
        //   `weeklyThemeCardDismissed` — `{ 'YYYY-Wnn': true }` keyed by
        //   ISO year+week. Records that the user dismissed the PASSIVE
        //   dashboard Theme-of-the-Week card for that week (distinct from
        //   the interruptive spotlight modal above). The card re-appears
        //   automatically when the rotation advances to a new week.
        //   Cleared only via Reset Data.
        weeklyThemeCardDismissed: {},
        // v2.9 Track 7 Q7 — Analytics funnel state.
        //
        //   `lastFeaturedWeekTracked` — last ISO-week-key (`YYYY-Wnn`)
        //   for which we've emitted `weekly_theme_featured`. Compared
        //   against the current week in `maybeTrackWeeklyThemeFeatured()`
        //   so the event fires exactly once per rotation regardless of
        //   how many times the app launches that week.
        //
        //   `weeklyTrialApplyDates` — `{ themeId: ISOdate }` recording
        //   when a free user APPLIED a featured-week trial. Powers the
        //   conversion event: when `unlockPremium()` fires, any entry
        //   here within 14 days emits `weekly_theme_subscribe` with the
        //   day-delta so we can validate the funnel hypothesis ("free
        //   user trials Stormwatch → subscribes within 2 weeks").
        //   Entries are kept indefinitely (never cleared) — a trial
        //   from 6 months ago that finally converts is still a valid
        //   signal, just one with a large `daysFromApply`.
        lastFeaturedWeekTracked: null,
        weeklyTrialApplyDates: {},
        unlockedTitles: [],
        currentTitle: null,
        treasureChests: [],
        companion: null, // Legacy - will migrate to companions array
        companions: [], // Collection of unlocked companions
        activeCompanionId: null, // Currently active companion type id

        // Spellbook System
        spellbook: [],
        activeSpells: [],

        // Class System (v3.1 §3.1) — schema-gated on load; see load-deserializer.js.
        playerClass: null,        // 'scholar' | 'warrior' | 'wizard' | 'ranger'
        classNodesUnlocked: 0,    // count of linear nodes unlocked (0-5)
        classCapstone: null,      // chosen capstone id, or null
        skillPointsSpent: 0,      // points sunk into unlocked nodes + capstone
        classSelectedAtLevel: null,
        subclass: null,           // chosen subclass id (scoped to playerClass)
        subclassNodesUnlocked: 0, // count of subclass tiers unlocked (0-3)

        // Quest Chains System
        activeQuestChains: [],
        completedQuestChains: [],

        // Stats tracking for titles
        chestsOpened: 0,
        bossesDefeated: 0,
        focusSessionsCompleted: 0,
        spellsCast: 0,
        // v2.8 (Jun 7, 2026) — lifetime gold-earned counter for the
        // Golden Empire theme unlock (10,000 gold earned, NOT current
        // balance — players who spend gold on chests/spells shouldn't
        // re-lose the unlock). Incremented in `addGold()` AFTER all
        // multipliers (blessing, spells, enchantments, companion) so
        // the counter reflects what actually hit the wallet. Migrated
        // for existing users in loadData (seeded from the current
        // balance when the field is absent).
        totalGoldEarned: 0,

        // Boss Battle System (auto-generated daily/weekly/monthly bosses)
        dailyBoss: null,
        weeklyBoss: null,
        monthlyBoss: null,
        attackCharges: 0,
        bossLog: [],
        defeatedBossList: [],
        dailyBossStreak: 0,
        weeklyBossStreak: 0,
        monthlyBossStreak: 0,
        bossKillsThisMonth: 0,
        bossKillsMonth: null, // Tracks which month the kill count belongs to

        // Daily Quest Board
        dailyQuestBoard: null, // { date, quests: [{id, completed}], allClaimedBonus }
        dailyTracking: null, // { date, xpEarned, goldEarned, tasksCompleted, habitsCompleted, tasksCreated, chestsOpened, spellsCast, bossAttacks, chargesEarned, focusSessions, crystalsEarned, sideQuestsCompleted, weeklyProgress }

        // Challenge a Friend System
        activeChallenges: [],
        completedChallenges: [],

        // Daily Free Wooden Chest
        lastWoodenChestDate: null,

        // v2.9.1 §1.8 — Royal Bounty (spotlight quests + bonus chest).
        // One active bounty per cadence. Each value is either null, an
        // assigned bounty object, or { periodKey, cadence, empty:true }
        // when there was no eligible quest that period. `lastBountyClaim`
        // is the per-cadence period guard ({ weekly:'YYYY-Wnn',
        // monthly:'YYYY-MM' }) capping one claimed bonus chest per period.
        activeBounties: { weekly: null, monthly: null },
        lastBountyClaim: {},

        // Focus Timer & Enchantments
        focusCrystals: 0,
        focusCrystalShards: 0,
        // §1.7 Streak Repair: snapshots of recently-broken streaks the player
        // can restore within 48h. P2b — the first repair is free; further
        // repairs are a premium action costing Focus Crystals. Entries are
        // pruned once their window closes (see getRepairableStreaks).
        repairableStreaks: [],
        // P2b — every player's first streak repair is free (no premium, no
        // crystals); persisted so the one-time grant survives reloads.
        freeStreakRepairUsed: false,
        focusEndTime: null,
        focusSessionLength: defaultSessionMinutes,
        totalFocusTime: 0, // in minutes
        pomodoroChain: null, // { currentSession, totalSessions, isBreak, breakDuration, longBreakDuration }
        activeEnchantments: [],
        // N3 effort-based XP: # of high-priority daily-task bonuses granted today,
        // and the local-date stamp gating the counter (reload-proof, self-resets).
        // `_highPriorityXpDate` is the ONE field whose save key (`highPriorityXpDate`)
        // differs from its instance property.
        highPriorityTasksToday: 0,
        _highPriorityXpDate: null,
        deepWorkStack: 0, // Scholar Deep Work: consecutive back-to-back focus sessions
        lastFocusSessionEndTime: 0, // Timestamp of last completed focus session (Deep Work chaining)
        rageComboCounter: 0, // Warrior Rage Combo: consecutive boss attacks toward the next guaranteed crit
        activeCompanionId2: null, // Ranger Twin Bond: second equipped companion id
        rangerProtectionsUsedThisWeek: 0, // Ranger Guardian Instinct: weekly streak protections used
        rangerProtectionResetWeek: null, // ISO week-key of the last Guardian Instinct reset
        guardianProtectionsUsedThisWeek: 0, // Warrior Guardian subclass (v3.1 §9): own weekly streak-protection pool
        guardianProtectionResetWeek: null, // ISO week-key of the last Guardian pool reset
        freeCastUsedDate: null, // Wizard Daily Ritual: date-string of the last free spell cast

        // Settings
        timezone: 'auto', // Can be 'auto' or a number (-12 to +13)
        timezoneOffset: 0,

        // Habit/weekly reset markers — advanced ONLY by checkHabitReset(). Null
        // (rather than a "today" stamp) is what lets a missed midnight still reset.
        lastHabitReset: null,
        lastWeekReset: null,

        // Tutorial System + onboarding play-style fork (habits vs goals). The chosen
        // path drives how soon the weekly/monthly/yearly/life goal tabs unlock.
        // See getGoalTabUnlockLevelsForPath() / chooseOnboardingPath().
        tutorialCompleted: false,
        onboardingPath: null,

        // Progressive Feature Unlock System
        seenFeatureTutorials: [],
        progressiveUnlockInitialized: false,

        // Premium System
        isPremium: false,
        premiumPurchaseDate: null,
        premiumPurchaseToken: null,

        // Period Transition Tracking (`lastMonth` is 0-INDEXED — January === 0 — which
        // is why load uses `??`, never `||`, on these four; see load-deserializer.js).
        lastVisitDate: null,
        lastWeekNumber: null,
        lastMonth: null,
        lastYear: null,

        // Daily Login Bonus
        lastLoginBonusDate: null,
        loginStreak: 0,

        // Beginner's Blessing (2x XP & Gold for first 3 calendar days)
        accountCreatedDate: null,

        // v2.5 — Level-title style. 'masculine' keeps every existing user's
        // title chain unchanged on upgrade; 'feminine' swaps the gendered
        // entries (Knight→Dame, Baron→Baroness, Earl→Countess, Duke→
        // Duchess, Prince→Princess, King→Queen, Emperor→Empress). Toggleable
        // in Settings → Title Style. Defaults to 'masculine' for backward
        // compatibility — the load path also normalizes any unexpected value
        // back to 'masculine' so save corruption can't cause weird titles.
        titleStyle: 'masculine',

        // Referral System
        referralCode: null,
        referredBy: null,
        referralRewardClaimed: false,
        referralsSent: 0,

        // Onboarding Share Hook
        onboardingShareShown: false,

        // Activation funnel instrumentation — fire-once flags so the
        // first_task_created / first_task_completed analytics events
        // each emit exactly once per account (the North-Star activation
        // signals). Persisted like onboardingShareShown.
        firstTaskCreatedTracked: false,
        firstTaskCompletedTracked: false,

        // In-App Review Prompt
        reviewPromptCount: 0,
        reviewPromptLastDate: null,
        reviewLeft: false,
    };
}

/**
 * Persisted fields whose load rule is plain `d[key] || default`. buildLoadState loops over this list.
 */
const SIMPLE_FIELDS = Object.freeze([
    'lifeGoals', 'yearlyGoals', 'monthlyGoals', 'weeklyGoals', 'dailyTasks', 'sideQuests', 'habits',
    'recurringTasks', 'xp', 'badges', 'archivedGoals',
    'goldCoins', 'unlockedThemes', 'currentTheme', 'weeklyTrialPromptShown', 'weeklyTrialEndPromptShown',
    'weeklyThemeCardDismissed', 'lastFeaturedWeekTracked', 'weeklyTrialApplyDates', 'unlockedTitles',
    'currentTitle', 'treasureChests', 'companion', 'companions', 'activeCompanionId',
    'spellbook', 'activeSpells',
    'activeQuestChains', 'completedQuestChains',
    'focusCrystals', 'focusCrystalShards', 'freeStreakRepairUsed', 'totalFocusTime', 'activeEnchantments',
    'focusEndTime', 'focusSessionLength', 'deepWorkStack', 'lastFocusSessionEndTime', 'pomodoroChain',
    'timezone', 'timezoneOffset',
    'lastHabitReset', 'lastWeekReset',
    'tutorialCompleted', 'onboardingPath',
    'seenFeatureTutorials', 'progressiveUnlockInitialized',
    'isPremium', 'premiumPurchaseDate', 'premiumPurchaseToken',
    'lastLoginBonusDate', 'loginStreak',
    'referralCode', 'referredBy', 'referralRewardClaimed', 'referralsSent',
    'onboardingShareShown',
    'firstTaskCreatedTracked', 'firstTaskCompletedTracked',
    'reviewPromptCount', 'reviewPromptLastDate', 'reviewLeft',
    'dailyQuestBoard', 'dailyTracking', 'lastWoodenChestDate',
    'activeBounties', 'lastBountyClaim',
    'activeChallenges', 'completedChallenges',
    'chestsOpened', 'bossesDefeated', 'focusSessionsCompleted', 'spellsCast',
    'dailyBoss', 'weeklyBoss', 'monthlyBoss', 'attackCharges', 'rageComboCounter', 'activeCompanionId2',
    'rangerProtectionsUsedThisWeek', 'rangerProtectionResetWeek', 'guardianProtectionsUsedThisWeek',
    'guardianProtectionResetWeek', 'freeCastUsedDate', 'highPriorityTasksToday',
    'bossLog', 'defeatedBossList', 'dailyBossStreak', 'weeklyBossStreak', 'monthlyBossStreak',
    'bossKillsThisMonth', 'bossKillsMonth',
]);

/**
 * Persisted fields buildLoadState handles EXPLICITLY — each has a non-`||` rule documented there.
 * SIMPLE_FIELDS ∪ SPECIAL_FIELDS must equal the keys of persistedDefaults(); a test enforces it.
 */
const SPECIAL_FIELDS = Object.freeze([
    'level',                         // resolved first; the blessing migration branches on it
    'repairableStreaks',             // Array.isArray type guard
    'lastVisitDate', 'lastWeekNumber', 'lastMonth', 'lastYear', // `??` — lastMonth is 0-indexed
    'accountCreatedDate',            // level-dependent migration
    'totalGoldEarned',               // `??` seeded from goldCoins when absent
    'titleStyle',                    // normalizer to 'masculine' | 'feminine'
    '_highPriorityXpDate',           // save key is `highPriorityXpDate`
    'playerClass', 'classNodesUnlocked', 'classCapstone', 'skillPointsSpent', 'classSelectedAtLevel',
    'subclass', 'subclassNodesUnlocked', // class schema gate
]);

const DEFAULT_STATE = Object.freeze({
    persistedDefaults,
    SIMPLE_FIELDS,
    SPECIAL_FIELDS,
});


// Node / Jest

export default DEFAULT_STATE;
