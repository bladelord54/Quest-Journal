/**
 * Unit Tests for save-serializer.js
 *
 * Roadmap #1, 76th slice: pure save-data builder that goal-manager.js _doSave()
 * delegates to.  Coverage:
 *   - buildSaveData returns the expected field set.
 *   - buildSaveData maps manager fields without mutation.
 *   - buildSaveData applies the caller-supplied default date strings.
 *   - buildSaveData uses manager.CLASS_SCHEMA_VERSION.
 *   - buildSaveData produces JSON-round-trippable output.
 */

import SAVE_SERIALIZER from '../save-serializer.js';

// Helper to build a GoalManager-like instance with the full set of persisted fields.
function makeManager(overrides = {}) {
    return Object.assign(
        {
            lifeGoals: [{ id: 'life-1' }],
            yearlyGoals: [{ id: 'year-1' }],
            monthlyGoals: [{ id: 'month-1' }],
            weeklyGoals: [{ id: 'week-1' }],
            dailyTasks: [{ id: 1, title: 'Meditate' }],
            sideQuests: [{ id: 'side-1' }],
            habits: [{ id: 'habit-1' }],
            recurringTasks: [{ id: 'rec-1' }],
            xp: 1250,
            level: 3,
            badges: ['first-task'],
            archivedGoals: [{ id: 'arch-1' }],

            goldCoins: 500,
            unlockedThemes: ['default'],
            currentTheme: 'default',
            weeklyTrialPromptShown: {},
            weeklyTrialEndPromptShown: {},
            weeklyThemeCardDismissed: {},
            lastFeaturedWeekTracked: null,
            weeklyTrialApplyDates: {},
            unlockedTitles: [],
            currentTitle: null,
            treasureChests: [],
            companion: null,
            companions: [{ id: 'comp-1' }],
            activeCompanionId: null,

            spellbook: [{ id: 'spell-1' }],
            activeSpells: [],
            CLASS_SCHEMA_VERSION: 2,
            playerClass: null,
            classNodesUnlocked: 0,
            classCapstone: null,
            skillPointsSpent: 0,
            classSelectedAtLevel: null,
            subclass: null,
            subclassNodesUnlocked: 0,

            activeQuestChains: [],
            completedQuestChains: [],

            focusCrystals: 0,
            focusCrystalShards: 0,
            repairableStreaks: [],
            freeStreakRepairUsed: false,
            totalFocusTime: 0,
            activeEnchantments: [],
            focusEndTime: null,
            focusSessionLength: 25,
            deepWorkStack: 0,
            lastFocusSessionEndTime: null,
            pomodoroChain: 0,
            pomodoroChainSettings: {},

            timezone: 'UTC',
            timezoneOffset: 0,
            tutorialCompleted: true,
            onboardingPath: null,
            lastHabitReset: '2026-07-31',
            lastWeekReset: '2026-W30',
            lastVisitDate: null,
            lastWeekNumber: null,
            lastMonth: null,
            lastYear: null,

            isPremium: false,
            premiumPurchaseDate: null,
            premiumPurchaseToken: undefined,
            lastLoginBonusDate: null,
            loginStreak: 0,
            referralCode: null,
            referredBy: null,
            referralRewardClaimed: false,
            referralsSent: 0,

            onboardingShareShown: false,
            firstTaskCreatedTracked: false,
            firstTaskCompletedTracked: false,

            reviewPromptCount: 0,
            reviewPromptLastDate: null,
            reviewLeft: false,

            chestsOpened: 0,
            bossesDefeated: 0,
            focusSessionsCompleted: 0,
            spellsCast: 0,
            totalGoldEarned: 0,

            dailyBoss: null,
            weeklyBoss: null,
            monthlyBoss: null,
            attackCharges: 0,
            rageComboCounter: 0,
            activeCompanionId2: null,
            rangerProtectionsUsedThisWeek: 0,
            rangerProtectionResetWeek: null,
            guardianProtectionsUsedThisWeek: 0,
            guardianProtectionResetWeek: null,
            freeCastUsedDate: null,
            highPriorityTasksToday: 0,
            _highPriorityXpDate: null,

            bossLog: [{ id: 'boss-1' }],
            defeatedBossList: [],
            dailyBossStreak: 0,
            weeklyBossStreak: 0,
            monthlyBossStreak: 0,
            bossKillsThisMonth: 0,
            bossKillsMonth: null,

            accountCreatedDate: null,
            titleStyle: null,
            seenFeatureTutorials: {},
            progressiveUnlockInitialized: false,

            dailyQuestBoard: [],
            dailyTracking: {},
            lastWoodenChestDate: null,

            activeBounties: { weekly: null, monthly: null },
            lastBountyClaim: null,

            activeChallenges: [],
            completedChallenges: ['chal-1']
        },
        overrides
    );
}

describe('SAVE_SERIALIZER', () => {

    test('buildSaveData exists and is a function', () => {
        expect(SAVE_SERIALIZER).toBeDefined();
        expect(typeof SAVE_SERIALIZER.buildSaveData).toBe('function');
    });

    test('buildSaveData returns all expected save fields', () => {
        const manager = makeManager();
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });

        const expectedKeys = [
            'lifeGoals', 'yearlyGoals', 'monthlyGoals', 'weeklyGoals', 'dailyTasks',
            'sideQuests', 'habits', 'recurringTasks', 'xp', 'level', 'badges',
            'archivedGoals', 'goldCoins', 'unlockedThemes', 'currentTheme',
            'weeklyTrialPromptShown', 'weeklyTrialEndPromptShown', 'weeklyThemeCardDismissed',
            'lastFeaturedWeekTracked', 'weeklyTrialApplyDates', 'unlockedTitles', 'currentTitle',
            'treasureChests', 'companion', 'companions', 'activeCompanionId', 'spellbook',
            'activeSpells', 'classSchemaVersion', 'playerClass', 'classNodesUnlocked',
            'classCapstone', 'skillPointsSpent', 'classSelectedAtLevel', 'subclass',
            'subclassNodesUnlocked', 'activeQuestChains', 'completedQuestChains', 'focusCrystals',
            'focusCrystalShards', 'repairableStreaks', 'freeStreakRepairUsed', 'totalFocusTime',
            'activeEnchantments', 'focusEndTime', 'focusSessionLength', 'deepWorkStack',
            'lastFocusSessionEndTime', 'pomodoroChain', 'pomodoroChainSettings', 'timezone',
            'timezoneOffset', 'tutorialCompleted', 'onboardingPath', 'lastHabitReset',
            'lastWeekReset', 'lastVisitDate', 'lastWeekNumber', 'lastMonth', 'lastYear',
            'isPremium', 'premiumPurchaseDate', 'premiumPurchaseToken', 'lastLoginBonusDate',
            'loginStreak', 'referralCode', 'referredBy', 'referralRewardClaimed', 'referralsSent',
            'onboardingShareShown', 'firstTaskCreatedTracked', 'firstTaskCompletedTracked',
            'reviewPromptCount', 'reviewPromptLastDate', 'reviewLeft', 'chestsOpened',
            'bossesDefeated', 'focusSessionsCompleted', 'spellsCast', 'totalGoldEarned',
            'dailyBoss', 'weeklyBoss', 'monthlyBoss', 'attackCharges', 'rageComboCounter',
            'activeCompanionId2', 'rangerProtectionsUsedThisWeek', 'rangerProtectionResetWeek',
            'guardianProtectionsUsedThisWeek', 'guardianProtectionResetWeek', 'freeCastUsedDate',
            'highPriorityTasksToday', 'highPriorityXpDate', 'bossLog', 'defeatedBossList',
            'dailyBossStreak', 'weeklyBossStreak', 'monthlyBossStreak', 'bossKillsThisMonth',
            'bossKillsMonth', 'accountCreatedDate', 'titleStyle', 'seenFeatureTutorials',
            'progressiveUnlockInitialized', 'dailyQuestBoard', 'dailyTracking', 'lastWoodenChestDate',
            'activeBounties', 'lastBountyClaim', 'activeChallenges', 'completedChallenges'
        ];

        expect(Object.keys(data).sort()).toEqual(expectedKeys.sort());
    });

    test('buildSaveData maps manager fields correctly', () => {
        const manager = makeManager({
            xp: 777,
            goldCoins: 123,
            currentTheme: 'dark',
            loginStreak: 5,
            _highPriorityXpDate: '2026-08-01',
            premiumPurchaseToken: 'token-abc'
        });
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });

        expect(data.xp).toBe(777);
        expect(data.goldCoins).toBe(123);
        expect(data.currentTheme).toBe('dark');
        expect(data.loginStreak).toBe(5);
        expect(data.highPriorityXpDate).toBe('2026-08-01');
        expect(data.premiumPurchaseToken).toBe('token-abc');
        expect(data.dailyTasks).toEqual(manager.dailyTasks);
        expect(data.spellbook).toEqual(manager.spellbook);
        expect(data.bossLog).toEqual(manager.bossLog);
    });

    test('buildSaveData uses manager CLASS_SCHEMA_VERSION for classSchemaVersion', () => {
        const manager = makeManager({ CLASS_SCHEMA_VERSION: 42 });
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        expect(data.classSchemaVersion).toBe(42);
    });

    test('buildSaveData falls back lastHabitReset and lastWeekReset when manager values are missing', () => {
        const manager = makeManager({
            lastHabitReset: undefined,
            lastWeekReset: undefined
        });
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        expect(data.lastHabitReset).toBe('2026-08-01');
        expect(data.lastWeekReset).toBe('2026-W31');
    });

    test('buildSaveData keeps explicit lastHabitReset and lastWeekReset when manager values are present', () => {
        const manager = makeManager({
            lastHabitReset: '2026-07-25',
            lastWeekReset: '2026-W29'
        });
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        expect(data.lastHabitReset).toBe('2026-07-25');
        expect(data.lastWeekReset).toBe('2026-W29');
    });

    test('buildSaveData defaults premiumPurchaseToken to null when missing', () => {
        const manager = makeManager({
            premiumPurchaseToken: undefined
        });
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        expect(data.premiumPurchaseToken).toBeNull();
    });

    test('buildSaveData does not mutate the manager object', () => {
        const manager = makeManager();
        const snapshot = JSON.stringify(manager);
        SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        expect(JSON.stringify(manager)).toBe(snapshot);
    });

    test('buildSaveData produces JSON-round-trippable output', () => {
        const manager = makeManager();
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        const roundTripped = JSON.parse(JSON.stringify(data));
        expect(roundTripped).toEqual(data);
    });

    test('buildSaveData preserves null boss fields', () => {
        const manager = makeManager({
            dailyBoss: null,
            weeklyBoss: null,
            monthlyBoss: null
        });
        const data = SAVE_SERIALIZER.buildSaveData(manager, {
            todayString: '2026-08-01',
            currentWeekString: '2026-W31'
        });
        expect(data.dailyBoss).toBeNull();
        expect(data.weeklyBoss).toBeNull();
        expect(data.monthlyBoss).toBeNull();
    });
});
