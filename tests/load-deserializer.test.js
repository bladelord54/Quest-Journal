/**
 * Unit Tests for load-deserializer.js
 *
 * Roadmap #1, 77th slice: pure load-state builder that goal-manager.js loadData()
 * delegates to — the MIRROR of the 76th slice's save-serializer.js.
 */

import LOAD_DESERIALIZER from '../load-deserializer.js';

const TODAY = '2026-06-15';
const SCHEMA = 2;
const DEFAULT_SESSION = 25;

/** Standard opts; every dynamic input is injected, so tests fully control them. */
function makeOpts(overrides = {}) {
    return Object.assign(
        {
            todayString: TODAY,
            classSchemaVersion: SCHEMA,
            defaultSessionMinutes: DEFAULT_SESSION,
            normalizeClassId: (id) => id
        },
        overrides
    );
}

/** A save blob with every field populated with a distinctive non-default value. */
function makeFullBlob(overrides = {}) {
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

            classSchemaVersion: SCHEMA,
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

            lastHabitReset: '2026-06-14',
            lastWeekReset: '2026-W24',

            tutorialCompleted: true,
            onboardingPath: 'grand-planner',

            seenFeatureTutorials: ['spellbook'],
            progressiveUnlockInitialized: true,

            lastVisitDate: '2026-06-14',
            lastWeekNumber: 24,
            lastMonth: 5,
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

            accountCreatedDate: '2025-11-20',

            dailyQuestBoard: { date: '2026-06-15' },
            dailyTracking: { tasksCompleted: 3 },
            lastWoodenChestDate: '2026-06-14',

            activeBounties: { weekly: { id: 'b-1' }, monthly: null },
            lastBountyClaim: { weekly: '2026-W23' },

            activeChallenges: [{ id: 'ch-1' }],
            completedChallenges: [{ id: 'ch-0' }],

            chestsOpened: 11,
            bossesDefeated: 6,
            focusSessionsCompleted: 14,
            totalGoldEarned: 4200,
            titleStyle: 'feminine',
            spellsCast: 33,

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
            highPriorityXpDate: '2026-06-15',
            bossLog: [{ id: 'log-1' }],
            defeatedBossList: ['boss-0'],
            dailyBossStreak: 4,
            weeklyBossStreak: 2,
            monthlyBossStreak: 1,
            bossKillsThisMonth: 5,
            bossKillsMonth: '2026-06'
        },
        overrides
    );
}

describe('load-deserializer.js', () => {
    describe('module shape', () => {
        test('exports a frozen namespace with buildLoadState', () => {
            expect(typeof LOAD_DESERIALIZER.buildLoadState).toBe('function');
            expect(Object.isFrozen(LOAD_DESERIALIZER)).toBe(true);
        });
    });

    describe('full blob — every populated field maps straight through', () => {
        test('same-named save keys round-trip by value', () => {
            const blob = makeFullBlob();
            const state = LOAD_DESERIALIZER.buildLoadState(blob, makeOpts());
            const sameNameKeys = Object.keys(blob).filter(
                k => k !== 'highPriorityXpDate' && k !== 'classSchemaVersion'
            );
            for (const key of sameNameKeys) {
                expect(state[key]).toEqual(blob[key]);
            }
        });

        test('renames highPriorityXpDate to _highPriorityXpDate', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(makeFullBlob(), makeOpts());
            expect(state._highPriorityXpDate).toBe('2026-06-15');
            expect(state).not.toHaveProperty('highPriorityXpDate');
        });

        test('classSchemaVersion is a gate, never copied onto the state', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(makeFullBlob(), makeOpts());
            expect(state).not.toHaveProperty('classSchemaVersion');
        });

        test('does not mutate the input blob', () => {
            const blob = makeFullBlob();
            const snapshot = JSON.parse(JSON.stringify(blob));
            LOAD_DESERIALIZER.buildLoadState(blob, makeOpts());
            expect(blob).toEqual(snapshot);
        });

        test('output is JSON round-trippable', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(makeFullBlob(), makeOpts());
            expect(JSON.parse(JSON.stringify(state))).toEqual(state);
        });
    });

    describe('empty blob — documented defaults', () => {
        test('list fields default to empty arrays', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            const listFields = [
                'lifeGoals', 'yearlyGoals', 'monthlyGoals', 'weeklyGoals', 'dailyTasks',
                'sideQuests', 'habits', 'recurringTasks', 'badges', 'archivedGoals',
                'unlockedTitles', 'treasureChests', 'companions', 'spellbook', 'activeSpells',
                'activeQuestChains', 'completedQuestChains', 'repairableStreaks',
                'activeEnchantments', 'seenFeatureTutorials', 'activeChallenges',
                'completedChallenges', 'bossLog', 'defeatedBossList'
            ];
            for (const field of listFields) {
                expect(state[field]).toEqual([]);
            }
        });

        test('counter fields default to 0', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            const counters = [
                'xp', 'goldCoins', 'focusCrystals', 'focusCrystalShards', 'totalFocusTime',
                'deepWorkStack', 'lastFocusSessionEndTime', 'timezoneOffset', 'loginStreak',
                'referralsSent', 'reviewPromptCount', 'chestsOpened', 'bossesDefeated',
                'focusSessionsCompleted', 'totalGoldEarned', 'spellsCast', 'attackCharges',
                'rageComboCounter', 'rangerProtectionsUsedThisWeek',
                'guardianProtectionsUsedThisWeek', 'highPriorityTasksToday',
                'dailyBossStreak', 'weeklyBossStreak', 'monthlyBossStreak', 'bossKillsThisMonth'
            ];
            for (const field of counters) {
                expect(state[field]).toBe(0);
            }
        });

        test('boolean flags default to false', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            const flags = [
                'freeStreakRepairUsed', 'tutorialCompleted', 'progressiveUnlockInitialized',
                'isPremium', 'referralRewardClaimed', 'onboardingShareShown',
                'firstTaskCreatedTracked', 'firstTaskCompletedTracked', 'reviewLeft'
            ];
            for (const field of flags) {
                expect(state[field]).toBe(false);
            }
        });

        test('nullable fields default to null', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            const nullable = [
                'lastFeaturedWeekTracked', 'currentTitle', 'companion', 'activeCompanionId',
                'focusEndTime', 'pomodoroChain', 'lastHabitReset', 'lastWeekReset',
                'onboardingPath', 'lastVisitDate', 'lastWeekNumber', 'lastMonth', 'lastYear',
                'premiumPurchaseDate', 'premiumPurchaseToken', 'lastLoginBonusDate',
                'referralCode', 'referredBy', 'reviewPromptLastDate', 'dailyQuestBoard',
                'dailyTracking', 'lastWoodenChestDate', 'dailyBoss', 'weeklyBoss',
                'monthlyBoss', 'activeCompanionId2', 'rangerProtectionResetWeek',
                'guardianProtectionResetWeek', 'freeCastUsedDate', '_highPriorityXpDate',
                'bossKillsMonth'
            ];
            for (const field of nullable) {
                expect(state[field]).toBeNull();
            }
        });

        test('map fields default to empty objects', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            const maps = [
                'weeklyTrialPromptShown', 'weeklyTrialEndPromptShown',
                'weeklyThemeCardDismissed', 'weeklyTrialApplyDates', 'lastBountyClaim'
            ];
            for (const field of maps) {
                expect(state[field]).toEqual({});
            }
        });

        test('non-empty seed defaults', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            expect(state.level).toBe(1);
            expect(state.unlockedThemes).toEqual(['default']);
            expect(state.currentTheme).toBe('default');
            expect(state.timezone).toBe('auto');
            expect(state.titleStyle).toBe('masculine');
            expect(state.activeBounties).toEqual({ weekly: null, monthly: null });
            expect(state.focusSessionLength).toBe(DEFAULT_SESSION);
        });

        test('tolerates a null/undefined blob', () => {
            expect(LOAD_DESERIALIZER.buildLoadState(null, makeOpts()).level).toBe(1);
            expect(LOAD_DESERIALIZER.buildLoadState(undefined, makeOpts()).xp).toBe(0);
        });

        test('focusSessionLength honours the injected default', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts({ defaultSessionMinutes: 45 }));
            expect(state.focusSessionLength).toBe(45);
        });
    });

    // The regression the 71st slice found: `||` on a 0-INDEXED month silently
    // suppressed the January month-transition recap. Must stay `??`.
    describe('period-tracking stamps use ?? not ||', () => {
        test('lastMonth of 0 (January) survives', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({ lastMonth: 0 }, makeOpts());
            expect(state.lastMonth).toBe(0);
        });

        test('lastWeekNumber, lastYear and lastVisitDate of 0/empty survive', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { lastWeekNumber: 0, lastYear: 0, lastVisitDate: '' },
                makeOpts()
            );
            expect(state.lastWeekNumber).toBe(0);
            expect(state.lastYear).toBe(0);
            expect(state.lastVisitDate).toBe('');
        });

        test('absent period stamps still become null', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            expect(state.lastMonth).toBeNull();
            expect(state.lastWeekNumber).toBeNull();
            expect(state.lastYear).toBeNull();
            expect(state.lastVisitDate).toBeNull();
        });
    });

    // v2.8 N3 — `??` distinguishes "field absent" (pre-v2.8 save: seed from the
    // current balance, a correct lower bound) from "present and 0" (new player).
    describe('totalGoldEarned seeding migration', () => {
        test('absent field seeds from goldCoins', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({ goldCoins: 750 }, makeOpts());
            expect(state.totalGoldEarned).toBe(750);
        });

        test('present-and-0 stays 0 even with a balance', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { goldCoins: 750, totalGoldEarned: 0 },
                makeOpts()
            );
            expect(state.totalGoldEarned).toBe(0);
        });

        test('absent field with no balance is 0', () => {
            expect(LOAD_DESERIALIZER.buildLoadState({}, makeOpts()).totalGoldEarned).toBe(0);
        });

        test('present non-zero value wins', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { goldCoins: 10, totalGoldEarned: 9999 },
                makeOpts()
            );
            expect(state.totalGoldEarned).toBe(9999);
        });
    });

    describe("accountCreatedDate — Beginner's Blessing migration", () => {
        test('stored date is preserved', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { accountCreatedDate: '2025-01-05', level: 40 },
                makeOpts()
            );
            expect(state.accountCreatedDate).toBe('2025-01-05');
        });

        test('absent + level <= 3 grants the blessing (today)', () => {
            for (const level of [1, 2, 3]) {
                const state = LOAD_DESERIALIZER.buildLoadState({ level }, makeOpts());
                expect(state.accountCreatedDate).toBe(TODAY);
            }
        });

        test('absent + level > 3 gets the expired sentinel', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({ level: 4 }, makeOpts());
            expect(state.accountCreatedDate).toBe('2020-01-01');
        });

        test('absent level defaults to 1, so the blessing applies', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            expect(state.accountCreatedDate).toBe(TODAY);
        });

        test('branches on the level from the same blob, not the manager', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { level: 99 },
                makeOpts({ todayString: '2030-03-03' })
            );
            expect(state.accountCreatedDate).toBe('2020-01-01');
        });
    });

    describe('repairableStreaks type guard', () => {
        test('a real array passes through', () => {
            const streaks = [{ habitId: 'h1' }];
            const state = LOAD_DESERIALIZER.buildLoadState({ repairableStreaks: streaks }, makeOpts());
            expect(state.repairableStreaks).toEqual(streaks);
        });

        test('corrupt non-array values become an empty array', () => {
            for (const corrupt of [{ h1: true }, 'nope', 42, true]) {
                const state = LOAD_DESERIALIZER.buildLoadState(
                    { repairableStreaks: corrupt },
                    makeOpts()
                );
                expect(state.repairableStreaks).toEqual([]);
            }
        });
    });

    describe('titleStyle normalizer', () => {
        test("only exactly 'feminine' stays feminine", () => {
            expect(LOAD_DESERIALIZER.buildLoadState({ titleStyle: 'feminine' }, makeOpts()).titleStyle)
                .toBe('feminine');
        });

        test('anything else normalizes to masculine', () => {
            for (const value of ['masculine', 'Feminine', 'neutral', '', null, 0, undefined]) {
                const state = LOAD_DESERIALIZER.buildLoadState({ titleStyle: value }, makeOpts());
                expect(state.titleStyle).toBe('masculine');
            }
        });
    });

    describe('class-state schema gate', () => {
        const classFields = [
            'playerClass', 'classNodesUnlocked', 'classCapstone', 'skillPointsSpent',
            'classSelectedAtLevel', 'subclass', 'subclassNodesUnlocked'
        ];

        test('matching schema restores all 7 class fields', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(makeFullBlob(), makeOpts());
            expect(state.playerClass).toBe('Wizard');
            expect(state.classNodesUnlocked).toBe(4);
            expect(state.classCapstone).toBe('arcane');
            expect(state.skillPointsSpent).toBe(4);
            expect(state.classSelectedAtLevel).toBe(5);
            expect(state.subclass).toBe('evoker');
            expect(state.subclassNodesUnlocked).toBe(2);
        });

        test('mismatched schema hard-resets all 7 class fields', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                makeFullBlob({ classSchemaVersion: SCHEMA - 1 }),
                makeOpts()
            );
            expect(state.playerClass).toBeNull();
            expect(state.classNodesUnlocked).toBe(0);
            expect(state.classCapstone).toBeNull();
            expect(state.skillPointsSpent).toBe(0);
            expect(state.classSelectedAtLevel).toBeNull();
            expect(state.subclass).toBeNull();
            expect(state.subclassNodesUnlocked).toBe(0);
        });

        test('an absent classSchemaVersion is a mismatch', () => {
            const blob = makeFullBlob();
            delete blob.classSchemaVersion;
            const state = LOAD_DESERIALIZER.buildLoadState(blob, makeOpts());
            expect(state.playerClass).toBeNull();
            expect(state.subclass).toBeNull();
        });

        test('both branches always write all 7 fields — never half-restored', () => {
            const matched = LOAD_DESERIALIZER.buildLoadState(makeFullBlob(), makeOpts());
            const reset = LOAD_DESERIALIZER.buildLoadState(
                makeFullBlob({ classSchemaVersion: 'other' }),
                makeOpts()
            );
            for (const field of classFields) {
                expect(matched).toHaveProperty(field);
                expect(reset).toHaveProperty(field);
            }
        });

        test('classSelectedAtLevel uses ?? so level 0 survives', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { classSchemaVersion: SCHEMA, classSelectedAtLevel: 0 },
                makeOpts()
            );
            expect(state.classSelectedAtLevel).toBe(0);
        });

        test('normalizeClassId is applied to the restored class id', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { classSchemaVersion: SCHEMA, playerClass: 'Mystic' },
                makeOpts({ normalizeClassId: (id) => (id === 'Mystic' ? 'Wizard' : id) })
            );
            expect(state.playerClass).toBe('Wizard');
        });

        test('normalizeClassId is optional — identity when omitted', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { classSchemaVersion: SCHEMA, playerClass: 'Mystic' },
                {
                    todayString: TODAY,
                    classSchemaVersion: SCHEMA,
                    defaultSessionMinutes: DEFAULT_SESSION
                }
            );
            expect(state.playerClass).toBe('Mystic');
        });
    });

    describe('pomodoroChainSettings is conditional', () => {
        test('present settings are mapped', () => {
            const state = LOAD_DESERIALIZER.buildLoadState(
                { pomodoroChainSettings: { workMinutes: 50 } },
                makeOpts()
            );
            expect(state.pomodoroChainSettings).toEqual({ workMinutes: 50 });
        });

        test('the key is OMITTED when absent, so Object.assign keeps the default', () => {
            const state = LOAD_DESERIALIZER.buildLoadState({}, makeOpts());
            expect(Object.prototype.hasOwnProperty.call(state, 'pomodoroChainSettings')).toBe(false);

            const target = { pomodoroChainSettings: { workMinutes: 25 } };
            Object.assign(target, state);
            expect(target.pomodoroChainSettings).toEqual({ workMinutes: 25 });
        });
    });
});
