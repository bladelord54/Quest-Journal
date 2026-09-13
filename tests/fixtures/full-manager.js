// @ts-check
/**
 * Shared persistence test fixture — a fully-populated manager-shaped object plus the
 * declared asymmetries of the save/load boundary.
 *
 * Extracted here (Roadmap #1, 80th slice) because a SECOND suite now needs it: the
 * export -> import parity guard in tests/goal-manager.test.js. Keeping two hand-maintained
 * copies of a ~110-field fixture is the exact drift this roadmap exists to kill — a field
 * added to one copy and forgotten in the other would silently weaken whichever guard
 * did not learn about it.
 *
 * NOT a *.test.js file, so jest's testMatch ('**\/tests\/**\/*.test.js') does not collect it.
 */

const TODAY = '2026-06-15';
const WEEK = '2026-W25';
const SCHEMA = 2;
const DEFAULT_SESSION = 25;

/**
 * ASYMMETRY 1 — save-only. `classSchemaVersion` is written from the manager's
 * CLASS_SCHEMA_VERSION constant and read back as a GATE, never as instance state.
 */
const SAVE_ONLY_KEYS = ['classSchemaVersion'];

/**
 * ASYMMETRY 2 — the one save-key -> instance-property rename. Everything else must
 * keep its name across the boundary.
 * @type {Record<string, string>}
 */
const SAVE_TO_INSTANCE_RENAMES = { highPriorityXpDate: '_highPriorityXpDate' };

/**
 * ASYMMETRY 3 — the export FILE envelope. `exportData` adds these on top of the save
 * blob; they describe the file, not game state, so no import/load path restores them.
 * `reminderSettings` is deliberately NOT here: it is a genuine export-only field that
 * importData DOES restore (to its own localStorage key).
 */
const EXPORT_ENVELOPE_KEYS = ['exportDate', 'version'];

/**
 * The instance property a given save key lands on.
 * @param {string} saveKey
 * @returns {string}
 */
function instanceKeyFor(saveKey) {
    return SAVE_TO_INSTANCE_RENAMES[saveKey] || saveKey;
}

/** @returns {{ todayString: string, currentWeekString: string }} */
function saveOpts() {
    return { todayString: TODAY, currentWeekString: WEEK };
}

/**
 * @param {Record<string, any>} [overrides]
 * @returns {Record<string, any>}
 */
function loadOpts(overrides = {}) {
    return Object.assign(
        {
            todayString: TODAY,
            classSchemaVersion: SCHEMA,
            defaultSessionMinutes: DEFAULT_SESSION,
            normalizeClassId: (/** @type {string} */ id) => id
        },
        overrides
    );
}

/**
 * A fully-populated manager. Every persisted field carries a distinctive NON-DEFAULT
 * value, so a dropped field shows up as a value mismatch rather than coincidentally
 * matching the default. The `covers every save key` test keeps this honest.
 *
 * @param {Record<string, any>} [overrides]
 * @returns {Record<string, any>}
 */
function makeFullManager(overrides = {}) {
    return Object.assign(
        {
            CLASS_SCHEMA_VERSION: SCHEMA,

            lifeGoals: [{ id: 'life-1' }],
            yearlyGoals: [{ id: 'year-1' }],
            monthlyGoals: [{ id: 'month-1' }],
            weeklyGoals: [{ id: 'week-1' }],
            dailyTasks: [{ id: 1, title: 'Meditate' }],
            sideQuests: [{ id: 'side-1' }],
            habits: [{ id: 'habit-1' }],
            recurringTasks: [{ id: 'rec-1' }],
            xp: 1250,
            level: 7,
            badges: ['first-task'],
            archivedGoals: [{ id: 'arch-1' }],

            goldCoins: 500,
            unlockedThemes: ['default', 'forest'],
            currentTheme: 'forest',
            weeklyTrialPromptShown: { forest: true },
            weeklyTrialEndPromptShown: { forest: true },
            weeklyThemeCardDismissed: { forest: true },
            lastFeaturedWeekTracked: '2026-W24',
            weeklyTrialApplyDates: { forest: '2026-06-10' },
            unlockedTitles: ['novice'],
            currentTitle: 'novice',
            treasureChests: [{ id: 'chest-1' }],
            companion: { type: 'wolf' },
            companions: [{ id: 'comp-1' }],
            activeCompanionId: 'wolf',

            spellbook: [{ id: 'spell-1' }],
            activeSpells: [{ id: 'spell-1' }],
            playerClass: 'Wizard',
            classNodesUnlocked: 4,
            classCapstone: 'arcane',
            skillPointsSpent: 4,
            classSelectedAtLevel: 5,
            subclass: 'evoker',
            subclassNodesUnlocked: 2,

            activeQuestChains: [{ id: 'chain-1' }],
            completedQuestChains: [{ id: 'chain-0' }],

            focusCrystals: 12,
            focusCrystalShards: 3,
            repairableStreaks: [{ habitId: 'habit-1' }],
            freeStreakRepairUsed: true,
            totalFocusTime: 3600,
            activeEnchantments: [{ id: 'ench-1' }],
            focusEndTime: 1780000000000,
            focusSessionLength: 50,
            deepWorkStack: 2,
            lastFocusSessionEndTime: 1779999999000,
            pomodoroChain: { count: 3 },
            pomodoroChainSettings: { workMinutes: 50 },

            timezone: 'America/New_York',
            timezoneOffset: -300,
            tutorialCompleted: true,
            onboardingPath: 'grand-planner',
            lastHabitReset: '2026-06-14',
            lastWeekReset: '2026-W24',
            lastVisitDate: '2026-06-14',
            lastWeekNumber: 24,
            lastMonth: 0,
            lastYear: 2026,

            isPremium: true,
            premiumPurchaseDate: '2026-01-02',
            premiumPurchaseToken: 'tok-123',

            lastLoginBonusDate: '2026-06-14',
            loginStreak: 9,

            referralCode: 'ABC123',
            referredBy: 'XYZ789',
            referralRewardClaimed: true,
            referralsSent: 2,

            onboardingShareShown: true,

            firstTaskCreatedTracked: true,
            firstTaskCompletedTracked: true,

            reviewPromptCount: 1,
            reviewPromptLastDate: '2026-05-01',
            reviewLeft: true,

            chestsOpened: 11,
            bossesDefeated: 6,
            focusSessionsCompleted: 14,
            spellsCast: 33,
            totalGoldEarned: 4200,

            dailyBoss: { id: 'boss-d' },
            weeklyBoss: { id: 'boss-w' },
            monthlyBoss: { id: 'boss-m' },
            attackCharges: 3,
            rageComboCounter: 2,
            activeCompanionId2: 'owl',
            rangerProtectionsUsedThisWeek: 1,
            rangerProtectionResetWeek: '2026-W24',
            guardianProtectionsUsedThisWeek: 1,
            guardianProtectionResetWeek: '2026-W24',
            freeCastUsedDate: '2026-06-14',
            highPriorityTasksToday: 2,
            _highPriorityXpDate: '2026-06-15',

            bossLog: [{ id: 'log-1' }],
            defeatedBossList: ['boss-0'],
            dailyBossStreak: 4,
            weeklyBossStreak: 2,
            monthlyBossStreak: 1,
            bossKillsThisMonth: 5,
            bossKillsMonth: '2026-06',

            accountCreatedDate: '2025-11-20',
            titleStyle: 'feminine',
            seenFeatureTutorials: ['spellbook'],
            progressiveUnlockInitialized: true,

            dailyQuestBoard: { date: '2026-06-15' },
            dailyTracking: { tasksCompleted: 3 },
            lastWoodenChestDate: '2026-06-14',

            activeBounties: { weekly: { id: 'b-1' }, monthly: null },
            lastBountyClaim: { weekly: '2026-W23' },

            activeChallenges: [{ id: 'ch-1' }],
            completedChallenges: [{ id: 'ch-0' }]
        },
        overrides
    );
}

module.exports = {
    TODAY,
    WEEK,
    SCHEMA,
    DEFAULT_SESSION,
    SAVE_ONLY_KEYS,
    SAVE_TO_INSTANCE_RENAMES,
    EXPORT_ENVELOPE_KEYS,
    instanceKeyFor,
    saveOpts,
    loadOpts,
    makeFullManager
};
