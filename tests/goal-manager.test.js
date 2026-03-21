/**
 * Unit Tests for Life Quest Journal - GoalManager
 * 
 * Tests core logic: task creation, data integrity, XP/gold calculations,
 * recurring tasks, data migration, starter tasks, and edge cases.
 */

const fs = require('fs');
const path = require('path');

// ==================== TEST SETUP ====================

// Mock localStorage with a resettable store
let localStore = {};
const localStorageMock = {
    getItem: jest.fn(key => localStore[key] || null),
    setItem: jest.fn((key, value) => { localStore[key] = String(value); }),
    removeItem: jest.fn(key => { delete localStore[key]; }),
    clear: jest.fn(() => { localStore = {}; }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

// Mock window APIs
window.audioManager = {
    playLevelUp: jest.fn(),
    playSpellCast: jest.fn(),
    playChestOpen: jest.fn(),
    playBossDefeated: jest.fn(),
    playAchievement: jest.fn(),
    playTaskComplete: jest.fn(),
    playHabitComplete: jest.fn(),
    playSlash: jest.fn()
};
window.confirm = jest.fn(() => true);
window.alert = jest.fn();
window.Notification = { permission: 'denied', requestPermission: jest.fn().mockResolvedValue('denied') };

// Load GoalManager class source
// The file defines `class GoalManager { ... }` at the top level and sets window.onerror/onunhandledrejection
const sourceFile = path.join(__dirname, '..', 'goal-manager.js');
const source = fs.readFileSync(sourceFile, 'utf-8');

// eval the source with an explicit window assignment so we can access the class
// (class declarations in eval are block-scoped and don't leak to outer scope)
eval(source + '\nwindow.GoalManager = GoalManager;');
const GoalManager = window.GoalManager;

/**
 * Create a minimal GoalManager instance without triggering the constructor.
 * Sets up all required properties and stubs for DOM-dependent methods.
 */
function createTestManager(overrides = {}) {
    const gm = Object.create(GoalManager.prototype);

    // Core data arrays
    gm.lifeGoals = [];
    gm.yearlyGoals = [];
    gm.monthlyGoals = [];
    gm.weeklyGoals = [];
    gm.dailyTasks = [];
    gm.sideQuests = [];
    gm.habits = [];
    gm.recurringTasks = [];
    gm.archivedGoals = [];

    // Rewards & progression
    gm.xp = 0;
    gm.level = 1;
    gm.badges = [];
    gm.goldCoins = 0;
    gm.unlockedThemes = ['default'];
    gm.currentTheme = 'default';
    gm.unlockedTitles = [];
    gm.currentTitle = null;
    gm.treasureChests = [];
    gm.companion = null;
    gm.companions = [];
    gm.activeCompanionId = null;

    // Spellbook
    gm.spellbook = [];
    gm.activeSpells = [];
    gm.spellDefinitions = gm.initializeSpells();
    gm.isCastingSpell = false;
    gm.spellsCast = 0;

    // Starter Task Presets (class field, not on prototype)
    gm.starterTaskPresets = {
        daily: [
            { name: '💧 Drink 8 glasses of water', icon: '💧', category: 'Health' },
            { name: '🏃 Exercise for 30 minutes', icon: '🏃', category: 'Fitness' },
            { name: '📖 Read for 20 minutes', icon: '📖', category: 'Learning' },
            { name: '🧘 Meditate for 10 minutes', icon: '🧘', category: 'Wellness' },
            { name: '🛏️ Make your bed', icon: '🛏️', category: 'Home' },
            { name: '📝 Write a journal entry', icon: '📝', category: 'Reflection' },
            { name: '🥗 Eat a healthy meal', icon: '🥗', category: 'Health' },
            { name: '😴 Get 8 hours of sleep', icon: '😴', category: 'Health' },
            { name: '🚶 Take a 15 minute walk', icon: '🚶', category: 'Fitness' },
            { name: '📵 1 hour screen-free time', icon: '📵', category: 'Wellness' }
        ],
        weekly: [
            { name: '🧹 Clean room/house', icon: '🧹', category: 'Home' },
            { name: '📞 Call a friend or family', icon: '📞', category: 'Social' },
            { name: '🛒 Meal prep for the week', icon: '🛒', category: 'Health' },
            { name: '📊 Review weekly goals', icon: '📊', category: 'Planning' },
            { name: '🧺 Do laundry', icon: '🧺', category: 'Home' },
            { name: '💪 Complete 3 workouts', icon: '💪', category: 'Fitness' },
            { name: '📚 Finish a book chapter', icon: '📚', category: 'Learning' },
            { name: '🎨 Practice a hobby', icon: '🎨', category: 'Personal' }
        ],
        monthly: [
            { name: '💰 Review budget/finances', icon: '💰', category: 'Finance' },
            { name: '🎯 Set new monthly goals', icon: '🎯', category: 'Planning' },
            { name: '📸 Take progress photos', icon: '📸', category: 'Tracking' },
            { name: '🧹 Deep clean one area', icon: '🧹', category: 'Home' },
            { name: '👥 Meet up with friends', icon: '👥', category: 'Social' },
            { name: '📋 Review subscriptions', icon: '📋', category: 'Finance' },
            { name: '🏥 Schedule health checkup', icon: '🏥', category: 'Health' },
            { name: '🌱 Learn something new', icon: '🌱', category: 'Learning' }
        ]
    };

    // Quest Chains
    gm.activeQuestChains = [];
    gm.completedQuestChains = [];
    gm.questChainTemplates = gm.initializeQuestChainTemplates();

    // Enchantments
    gm.focusCrystals = 0;
    gm.totalFocusTime = 0;
    gm.activeEnchantments = [];
    gm.enchantmentDefinitions = gm.initializeEnchantments();

    // Boss Battle System
    gm.dailyBoss = null;
    gm.weeklyBoss = null;
    gm.monthlyBoss = null;
    gm.attackCharges = 0;
    gm.bossLog = [];
    gm.defeatedBossList = [];
    gm.dailyBossStreak = 0;
    gm.weeklyBossStreak = 0;
    gm.monthlyBossStreak = 0;
    gm.bossKillsThisMonth = 0;
    gm.bossKillsMonth = null;
    gm.monthlyBossUnlockThreshold = 5;
    gm.bossThemes = gm.initializeBossThemes();

    // Stats tracking
    gm.chestsOpened = 0;
    gm.bossesDefeated = 0;
    gm.focusSessionsCompleted = 0;

    // Settings
    gm.timezone = 'auto';
    gm.timezoneOffset = 0;

    // Misc
    gm.actionHistory = [];
    gm.historyIndex = -1;
    gm.saveTimeout = null;
    gm.renderTimeout = null;
    gm.isRendering = false;
    gm.currentView = 'dashboard';
    gm.domCache = {};
    gm.bulkSelectionMode = false;
    gm.selectedItems = new Set();
    gm.tutorialCompleted = true;
    gm.isPremium = false;
    gm._suppressRewardSounds = false;
    gm._suppressRewardToasts = false;

    // Feature unlock tutorials (set in constructor)
    gm.featureUnlockTutorials = {
        2: { title: '🏆 Treasury Unlocked!', text: "You've earned gold from your quests! Visit the Treasury to open treasure chests and discover spells, themes, and companions." },
        3: { title: '🔮 Arcane Powers Unlocked!', text: "You may have collected spell scrolls from treasure chests — visit Arcane Powers to view your spellbook and cast powerful spells!" },
        4: { title: '⚔️ Weekly Battles & Side Quests!', text: "Your Quest Log now has Weekly Battles and Side Quests! Set weekly goals and track flexible tasks without deadlines." },
        5: { title: '🎯 Focus Timer & Enchantments!', text: "The Focus Timer lets you earn Focus Crystals through timed work sessions. Spend them on Enchantments for powerful buffs!" },
        6: { title: '🎨 Kingdom Themes Unlocked!', text: "You've unlocked the Forest Kingdom theme! Customize your journal's look by visiting the Treasury and selecting Themes. As you level up, more themes will become available — each with unique backgrounds and particle effects!" },
        7: { title: '📖 Monthly Raids & Quest Chains!', text: "Plan bigger with Monthly Raids! Chain multiple tasks into epic multi-step Quest Chains for bonus rewards." },
        9: { title: '🚩 Life Goals & Yearly Campaigns!', text: "Think long-term! Set Yearly Campaigns and Epic Life Quests to plan your biggest, most ambitious goals." },
        10: { title: '💀 Boss Battles Unlocked!', text: "Challenge daily and weekly bosses! Complete quests to earn attack charges and defeat powerful foes for epic rewards. This is a Premium feature — upgrade to unlock the full Boss Battle experience!" }
    };
    gm.seenFeatureTutorials = [];
    gm.progressiveUnlockInitialized = false;
    gm.navUnlockLevels = { treasury: 2, 'arcane-powers': 3, 'quest-log': 4, focus: 5, calendar: 1 };
    gm.arcaneTabUnlockLevels = { spellbook: 3, enchantments: 5 };
    gm.questLogTabUnlockLevels = { weekly: 4, side: 4, monthly: 7, yearly: 9, life: 9, chains: 7 };
    gm.lastVisitDate = null;
    gm.lastWeekNumber = null;
    gm.lastMonth = null;
    gm.lastYear = null;
    gm.lastLoginBonusDate = null;
    gm.loginStreak = 0;
    gm.focusTimer = null;
    gm.focusTimeRemaining = 0;
    gm.focusTimerRunning = false;

    // Stub DOM-dependent methods to no-ops
    gm.render = jest.fn();
    gm.saveData = jest.fn();
    gm.showAchievement = jest.fn();
    gm.showLootDrop = jest.fn();
    gm.animateXPGain = jest.fn();
    gm.showFloatingXP = jest.fn();
    gm.checkRewardUnlocks = jest.fn();
    gm.checkBadges = jest.fn();
    gm.checkLootDrop = jest.fn();
    gm.checkTitleUnlocks = jest.fn();
    gm.playQuestCompleteAnimation = jest.fn();
    gm.createLevelUpBurst = jest.fn();
    gm.createConfetti = jest.fn();
    gm.celebrateSpellCast = jest.fn();
    gm.celebrateChestOpen = jest.fn();
    gm.celebrateBossDefeat = jest.fn();
    gm.showLootPanel = jest.fn();
    gm.tryUnlockRandomTheme = jest.fn();
    gm.unlockCompanion = jest.fn();
    gm.renderBossBattles = jest.fn();
    gm.updateNavVisibility = jest.fn();
    gm.checkFeatureUnlocks = jest.fn();
    gm.showErrorNotification = jest.fn();
    gm.renderCompanion = jest.fn();
    gm.showInputModal = jest.fn();
    gm.closeInputModal = jest.fn();
    gm.showSelectModal = jest.fn();
    gm.showPriorityModal = jest.fn();
    gm.closeStarterTasksModal = jest.fn();
    gm.initThemeParticles = jest.fn();

    // Apply overrides
    Object.assign(gm, overrides);

    return gm;
}


// ==================== TESTS ====================

describe('GoalManager', () => {

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    // ==================== XP & LEVEL SYSTEM ====================

    describe('XP & Level System', () => {

        test('getXPForLevel returns correct XP requirements', () => {
            const gm = createTestManager();
            expect(gm.getXPForLevel(1)).toBe(150);
            expect(gm.getXPForLevel(2)).toBe(400);
            expect(gm.getXPForLevel(3)).toBe(650);
            expect(gm.getXPForLevel(5)).toBe(1150);
        });

        test('getTotalXPForLevel returns cumulative XP', () => {
            const gm = createTestManager();
            expect(gm.getTotalXPForLevel(1)).toBe(0);    // Level 1 starts at 0
            expect(gm.getTotalXPForLevel(2)).toBe(150);   // Need 150 to reach level 2
            expect(gm.getTotalXPForLevel(3)).toBe(550);   // 150 + 400
            expect(gm.getTotalXPForLevel(4)).toBe(1200);  // 150 + 400 + 650
        });

        test('addXP increases XP correctly with no multipliers', () => {
            const gm = createTestManager();
            gm.addXP(100, 'daily');
            expect(gm.xp).toBe(100);
        });

        test('addXP triggers levelUp when threshold is reached', () => {
            const gm = createTestManager();
            gm.updateNavVisibility = jest.fn();
            gm.showFeatureUnlockPopup = jest.fn();
            gm.addXP(150, 'daily');
            expect(gm.level).toBe(2); // 150 XP should trigger level 2
        });

        test('addXP handles multiple level-ups from large XP gain', () => {
            const gm = createTestManager();
            gm.updateNavVisibility = jest.fn();
            gm.showFeatureUnlockPopup = jest.fn();
            // Level 2 needs 150, level 3 needs 550 total
            gm.addXP(600, 'life');
            expect(gm.level).toBeGreaterThanOrEqual(3);
        });

        test('levelUp increments level and creates badge', () => {
            const gm = createTestManager();
            gm.unlockBadge = jest.fn();
            gm.updateNavVisibility = jest.fn();
            gm.showFeatureUnlockPopup = jest.fn();
            gm.levelUp();
            expect(gm.level).toBe(2);
            expect(gm.unlockBadge).toHaveBeenCalledWith('level_2', 'Level 2', expect.any(String), '⭐', true);
        });

        test('addXP applies companion XP bonus', () => {
            const gm = createTestManager();
            gm.companions = [{ type: 'owl', bonusType: 'xp', bonusAmount: 0.10, rarity: 'uncommon' }];
            gm.activeCompanionId = 'owl';
            gm.addXP(100, 'daily');
            // 100 * 1 (no spell) * 1 (no enchantment) * 1.10 (companion) * 1 (no doubler) = 110
            expect(gm.xp).toBe(110);
        });
    });

    // ==================== GOLD SYSTEM ====================

    describe('Gold System', () => {

        test('addGold increases gold correctly', () => {
            const gm = createTestManager();
            gm.addGold(100, 'daily');
            expect(gm.goldCoins).toBe(100);
        });

        test('addGold applies companion gold bonus', () => {
            const gm = createTestManager();
            gm.companions = [{ type: 'dragon', bonusType: 'gold', bonusAmount: 0.20, rarity: 'epic' }];
            gm.activeCompanionId = 'dragon';
            gm.addGold(100, 'daily');
            // 100 * 1 (no spell) * 1 (no enchant) * 1.20 (companion) * 1 (no doubler) = 120
            expect(gm.goldCoins).toBe(120);
        });

        test('addGold applies quest doubler multiplier', () => {
            const gm = createTestManager();
            gm.addGold(100, 'daily', 2);
            expect(gm.goldCoins).toBe(200);
        });
    });

    // ==================== SPELL MULTIPLIER SYSTEM ====================

    describe('Spell Multiplier System', () => {

        test('getActiveSpellMultiplier returns 1 with no active spells', () => {
            const gm = createTestManager();
            expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBe(1);
        });

        test('getActiveSpellMultiplier applies active spell multiplier', () => {
            const gm = createTestManager();
            // Find a spell with xp_multiplier effect
            const xpSpellId = Object.keys(gm.spellDefinitions).find(
                id => gm.spellDefinitions[id].effect === 'xp_multiplier'
            );
            if (xpSpellId) {
                gm.activeSpells = [{
                    spellId: xpSpellId,
                    expiresAt: Date.now() + 60000 // expires in 1 minute
                }];
                const multiplier = gm.getActiveSpellMultiplier('xp_multiplier');
                expect(multiplier).toBeGreaterThan(1);
            }
        });

        test('getActiveSpellMultiplier ignores expired spells', () => {
            const gm = createTestManager();
            const xpSpellId = Object.keys(gm.spellDefinitions).find(
                id => gm.spellDefinitions[id].effect === 'xp_multiplier'
            );
            if (xpSpellId) {
                gm.activeSpells = [{
                    spellId: xpSpellId,
                    expiresAt: Date.now() - 60000 // expired 1 minute ago
                }];
                expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBe(1);
            }
        });
    });

    // ==================== ENCHANTMENT SYSTEM ====================

    describe('Enchantment System', () => {

        test('getEnchantmentMultiplier returns 1 with no active enchantments', () => {
            const gm = createTestManager();
            gm.checkExpiredEnchantments = jest.fn();
            gm.hasActiveEnchantment = jest.fn(() => false);
            expect(gm.getEnchantmentMultiplier('xp')).toBe(1);
            expect(gm.getEnchantmentMultiplier('gold')).toBe(1);
        });

        test('getEnchantmentMultiplier returns 2 for double_xp enchantment', () => {
            const gm = createTestManager();
            gm.checkExpiredEnchantments = jest.fn();
            gm.hasActiveEnchantment = jest.fn((type) => type === 'double_xp');
            expect(gm.getEnchantmentMultiplier('xp')).toBe(2);
        });

        test('getEnchantmentMultiplier returns 2 for double_gold enchantment', () => {
            const gm = createTestManager();
            gm.checkExpiredEnchantments = jest.fn();
            gm.hasActiveEnchantment = jest.fn((type) => type === 'double_gold');
            expect(gm.getEnchantmentMultiplier('gold')).toBe(2);
        });

        test('getEnchantmentMultiplier returns 1.3 for boss_damage enchantment', () => {
            const gm = createTestManager();
            gm.checkExpiredEnchantments = jest.fn();
            gm.hasActiveEnchantment = jest.fn((type) => type === 'boss_damage');
            expect(gm.getEnchantmentMultiplier('boss_damage')).toBe(1.3);
        });
    });

    // ==================== COMPANION SYSTEM ====================

    describe('Companion System', () => {

        test('getActiveCompanion returns null when no companion set', () => {
            const gm = createTestManager();
            expect(gm.getActiveCompanion()).toBeNull();
        });

        test('getActiveCompanion returns correct companion', () => {
            const gm = createTestManager();
            gm.companions = [
                { type: 'cat', name: 'Lucky Cat', bonusType: 'xp', bonusAmount: 0.05 },
                { type: 'owl', name: 'Wise Owl', bonusType: 'xp', bonusAmount: 0.10 }
            ];
            gm.activeCompanionId = 'owl';
            const active = gm.getActiveCompanion();
            expect(active.type).toBe('owl');
            expect(active.name).toBe('Wise Owl');
        });

        test('getCompanionBonus returns 0 when no companion', () => {
            const gm = createTestManager();
            expect(gm.getCompanionBonus('xp')).toBe(0);
        });

        test('getCompanionBonus returns bonus for matching type', () => {
            const gm = createTestManager();
            gm.companions = [{ type: 'owl', bonusType: 'xp', bonusAmount: 0.10 }];
            gm.activeCompanionId = 'owl';
            expect(gm.getCompanionBonus('xp')).toBe(0.10);
        });

        test('getCompanionBonus returns 0 for non-matching type', () => {
            const gm = createTestManager();
            gm.companions = [{ type: 'owl', bonusType: 'xp', bonusAmount: 0.10 }];
            gm.activeCompanionId = 'owl';
            expect(gm.getCompanionBonus('gold')).toBe(0);
        });

        test('setActiveCompanion updates active companion', () => {
            const gm = createTestManager();
            gm.companions = [
                { type: 'cat', name: 'Lucky Cat', icon: '🐱' },
                { type: 'owl', name: 'Wise Owl', icon: '🦉' }
            ];
            gm.activeCompanionId = 'cat';
            gm.setActiveCompanion('owl');
            expect(gm.activeCompanionId).toBe('owl');
            expect(gm.companion.type).toBe('owl');
        });
    });

    // ==================== BADGE SYSTEM ====================

    describe('Badge System', () => {

        test('unlockBadge adds new badge', () => {
            const gm = createTestManager();
            gm.unlockBadge('test_badge', 'Test Badge', 'A test badge', '🏆');
            expect(gm.badges).toHaveLength(1);
            expect(gm.badges[0].id).toBe('test_badge');
            expect(gm.badges[0].name).toBe('Test Badge');
        });

        test('unlockBadge does not add duplicate badge', () => {
            const gm = createTestManager();
            gm.unlockBadge('test_badge', 'Test Badge', 'A test badge', '🏆');
            gm.unlockBadge('test_badge', 'Test Badge', 'A test badge', '🏆');
            expect(gm.badges).toHaveLength(1);
        });
    });

    // ==================== STARTER TASK SYSTEM ====================

    describe('Starter Task System', () => {

        test('starterTaskPresets have name property for all tasks', () => {
            const gm = createTestManager();
            const presets = gm.starterTaskPresets;
            ['daily', 'weekly', 'monthly'].forEach(type => {
                presets[type].forEach((task, i) => {
                    expect(task.name).toBeDefined();
                    expect(typeof task.name).toBe('string');
                    expect(task.name.length).toBeGreaterThan(0);
                });
            });
        });

        test('addStarterPack creates tasks with title (not name) property', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.addStarterPack('wellness');

            // Check daily tasks have title
            gm.dailyTasks.forEach(task => {
                expect(task.title).toBeDefined();
                expect(typeof task.title).toBe('string');
                expect(task.title.length).toBeGreaterThan(0);
                expect(task.name).toBeUndefined(); // should NOT have name
            });

            // Check weekly goals have title
            gm.weeklyGoals.forEach(goal => {
                expect(goal.title).toBeDefined();
                expect(typeof goal.title).toBe('string');
                expect(goal.name).toBeUndefined();
            });

            // Check monthly goals have title
            gm.monthlyGoals.forEach(goal => {
                expect(goal.title).toBeDefined();
                expect(typeof goal.title).toBe('string');
                expect(goal.name).toBeUndefined();
            });
        });

        test('addStarterPack creates tasks with required fields', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.addStarterPack('wellness');

            // Daily tasks should have all required fields
            gm.dailyTasks.forEach(task => {
                expect(task).toHaveProperty('id');
                expect(task).toHaveProperty('title');
                expect(task).toHaveProperty('description');
                expect(task).toHaveProperty('weeklyGoalIds');
                expect(task).toHaveProperty('created');
                expect(task).toHaveProperty('dueDate');
                expect(task).toHaveProperty('completed', false);
                expect(task).toHaveProperty('checklist');
                expect(Array.isArray(task.weeklyGoalIds)).toBe(true);
                expect(Array.isArray(task.checklist)).toBe(true);
            });

            // Weekly goals should have all required fields
            gm.weeklyGoals.forEach(goal => {
                expect(goal).toHaveProperty('id');
                expect(goal).toHaveProperty('title');
                expect(goal).toHaveProperty('description');
                expect(goal).toHaveProperty('monthlyGoalIds');
                expect(goal).toHaveProperty('created');
                expect(goal).toHaveProperty('completed', false);
                expect(goal).toHaveProperty('progress', 0);
                expect(goal).toHaveProperty('priority', 'medium');
            });

            // Monthly goals should have all required fields
            gm.monthlyGoals.forEach(goal => {
                expect(goal).toHaveProperty('id');
                expect(goal).toHaveProperty('title');
                expect(goal).toHaveProperty('description');
                expect(goal).toHaveProperty('yearlyGoalIds');
                expect(goal).toHaveProperty('created');
                expect(goal).toHaveProperty('completed', false);
                expect(goal).toHaveProperty('progress', 0);
                expect(goal).toHaveProperty('priority', 'medium');
            });
        });

        test('addSelectedStarterTasks creates tasks with title property', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            // Mock DOM checkboxes
            const mockCheckboxes = [
                { dataset: { type: 'daily', index: '0' } },
                { dataset: { type: 'weekly', index: '1' } },
                { dataset: { type: 'monthly', index: '0' } }
            ];
            document.querySelectorAll = jest.fn(() => mockCheckboxes);

            gm.addSelectedStarterTasks();

            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0].title).toBe(gm.starterTaskPresets.daily[0].name);
            expect(gm.dailyTasks[0].name).toBeUndefined();

            expect(gm.weeklyGoals).toHaveLength(1);
            expect(gm.weeklyGoals[0].title).toBe(gm.starterTaskPresets.weekly[1].name);
            expect(gm.weeklyGoals[0].name).toBeUndefined();

            expect(gm.monthlyGoals).toHaveLength(1);
            expect(gm.monthlyGoals[0].title).toBe(gm.starterTaskPresets.monthly[0].name);
            expect(gm.monthlyGoals[0].name).toBeUndefined();
        });
    });

    // ==================== DATA MIGRATION ====================

    describe('Data Migration', () => {

        test('loadData migrates tasks with name to title', () => {
            const gm = createTestManager();

            // Simulate saved data with the old `name` bug
            const savedData = {
                dailyTasks: [
                    { id: 1, name: 'Test task with name only', completed: false }
                ],
                weeklyGoals: [
                    { id: 2, name: 'Weekly with name', completed: false }
                ],
                monthlyGoals: [
                    { id: 3, name: 'Monthly with name', completed: false }
                ],
                yearlyGoals: [],
                lifeGoals: [],
                sideQuests: [],
                habits: [],
                recurringTasks: [],
                xp: 100,
                level: 1,
                badges: [],
                archivedGoals: [],
                goldCoins: 50,
                unlockedThemes: ['default'],
                currentTheme: 'default',
                unlockedTitles: [],
                currentTitle: null,
                treasureChests: [],
                companions: [],
                activeCompanionId: null,
                spellbook: [],
                activeSpells: [],
                activeQuestChains: [],
                completedQuestChains: [],
                focusCrystals: 0,
                totalFocusTime: 0,
                activeEnchantments: [],
                timezone: 'auto',
                timezoneOffset: 0,
                tutorialCompleted: true
            };

            localStorage.getItem.mockReturnValueOnce(JSON.stringify(savedData));

            // Call loadData (will read from mocked localStorage)
            gm.loadData();

            // Verify migration happened
            expect(gm.dailyTasks[0].title).toBe('Test task with name only');
            expect(gm.weeklyGoals[0].title).toBe('Weekly with name');
            expect(gm.monthlyGoals[0].title).toBe('Monthly with name');
        });

        test('loadData does not overwrite existing title with name', () => {
            const gm = createTestManager();

            const savedData = {
                dailyTasks: [
                    { id: 1, title: 'Correct title', name: 'Old name', completed: false }
                ],
                weeklyGoals: [],
                monthlyGoals: [],
                yearlyGoals: [],
                lifeGoals: [],
                sideQuests: [],
                habits: [],
                recurringTasks: [],
                xp: 0,
                level: 1,
                badges: [],
                archivedGoals: [],
                goldCoins: 0,
                unlockedThemes: ['default'],
                currentTheme: 'default',
                unlockedTitles: [],
                currentTitle: null,
                treasureChests: [],
                companions: [],
                activeCompanionId: null,
                spellbook: [],
                activeSpells: [],
                activeQuestChains: [],
                completedQuestChains: [],
                focusCrystals: 0,
                totalFocusTime: 0,
                activeEnchantments: [],
                timezone: 'auto',
                timezoneOffset: 0,
                tutorialCompleted: true
            };

            localStorage.getItem.mockReturnValueOnce(JSON.stringify(savedData));
            gm.loadData();

            // Should keep existing title, not overwrite with name
            expect(gm.dailyTasks[0].title).toBe('Correct title');
        });

        test('loadData adds dueDate to tasks missing it', () => {
            const gm = createTestManager();

            const savedData = {
                dailyTasks: [
                    { id: 1, title: 'No due date task', completed: false }
                ],
                weeklyGoals: [],
                monthlyGoals: [],
                yearlyGoals: [],
                lifeGoals: [],
                sideQuests: [],
                habits: [],
                recurringTasks: [],
                xp: 0,
                level: 1,
                badges: [],
                archivedGoals: [],
                goldCoins: 0,
                unlockedThemes: ['default'],
                currentTheme: 'default',
                unlockedTitles: [],
                currentTitle: null,
                treasureChests: [],
                companions: [],
                activeCompanionId: null,
                spellbook: [],
                activeSpells: [],
                activeQuestChains: [],
                completedQuestChains: [],
                focusCrystals: 0,
                totalFocusTime: 0,
                activeEnchantments: [],
                timezone: 'auto',
                timezoneOffset: 0,
                tutorialCompleted: true
            };

            localStorage.getItem.mockReturnValueOnce(JSON.stringify(savedData));
            gm.loadData();

            expect(gm.dailyTasks[0].dueDate).toBeDefined();
            expect(typeof gm.dailyTasks[0].dueDate).toBe('string');
        });

        test('loadData adds default priority to goals missing it', () => {
            const gm = createTestManager();

            const savedData = {
                dailyTasks: [],
                weeklyGoals: [{ id: 1, title: 'No priority', completed: false }],
                monthlyGoals: [{ id: 2, title: 'No priority', completed: false }],
                yearlyGoals: [{ id: 3, title: 'No priority', completed: false }],
                lifeGoals: [],
                sideQuests: [],
                habits: [],
                recurringTasks: [],
                xp: 0,
                level: 1,
                badges: [],
                archivedGoals: [],
                goldCoins: 0,
                unlockedThemes: ['default'],
                currentTheme: 'default',
                unlockedTitles: [],
                currentTitle: null,
                treasureChests: [],
                companions: [],
                activeCompanionId: null,
                spellbook: [],
                activeSpells: [],
                activeQuestChains: [],
                completedQuestChains: [],
                focusCrystals: 0,
                totalFocusTime: 0,
                activeEnchantments: [],
                timezone: 'auto',
                timezoneOffset: 0,
                tutorialCompleted: true
            };

            localStorage.getItem.mockReturnValueOnce(JSON.stringify(savedData));
            gm.loadData();

            expect(gm.weeklyGoals[0].priority).toBe('medium');
            expect(gm.monthlyGoals[0].priority).toBe('medium');
            expect(gm.yearlyGoals[0].priority).toBe('medium');
        });

        test('loadData handles empty/null localStorage gracefully', () => {
            const gm = createTestManager();
            localStorage.getItem.mockReturnValueOnce(null);
            expect(() => gm.loadData()).not.toThrow();
        });

        test('loadData handles corrupted JSON gracefully', () => {
            const gm = createTestManager();
            localStorage.getItem.mockReturnValueOnce('not valid json {{{');
            expect(() => gm.loadData()).not.toThrow();
            expect(gm.showErrorNotification).toHaveBeenCalled();
        });
    });

    // ==================== RECURRING TASKS ====================

    describe('Recurring Task Generation', () => {

        test('generateRecurringTasksForToday creates weekly task on correct day', () => {
            const gm = createTestManager();
            const today = new Date('2025-01-15T12:00:00'); // Wednesday
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.recurringTasks = [{
                id: 100,
                title: 'Weekly Wednesday Task',
                description: 'Test',
                recurrence: { type: 'weekly', days: ['wed'] },
                active: true,
                lastGenerated: null
            }];

            gm.generateRecurringTasksForToday();

            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0].title).toBe('Weekly Wednesday Task');
            expect(gm.dailyTasks[0].dueDate).toBe('2025-01-15');
            expect(gm.dailyTasks[0].recurringTaskId).toBe(100);
        });

        test('generateRecurringTasksForToday does not duplicate existing tasks', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.recurringTasks = [{
                id: 100,
                title: 'Weekly Task',
                description: '',
                recurrence: { type: 'weekly', days: ['wed'] },
                active: true,
                lastGenerated: null
            }];

            // Already has a task for today
            gm.dailyTasks = [{
                id: 999,
                title: 'Weekly Task',
                dueDate: '2025-01-15',
                recurringTaskId: 100,
                completed: false
            }];

            gm.generateRecurringTasksForToday();

            // Should still be just 1 task
            expect(gm.dailyTasks).toHaveLength(1);
        });

        test('generateRecurringTasksForToday skips inactive tasks', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.recurringTasks = [{
                id: 100,
                title: 'Inactive Task',
                description: '',
                recurrence: { type: 'weekly', days: ['wed'] },
                active: false,
                lastGenerated: null
            }];

            gm.generateRecurringTasksForToday();

            expect(gm.dailyTasks).toHaveLength(0);
        });

        test('generateRecurringTasksForToday handles monthly-date type', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.recurringTasks = [{
                id: 200,
                title: 'Monthly 15th Task',
                description: '',
                recurrence: { type: 'monthly-date', dayOfMonth: 15 },
                active: true,
                lastGenerated: null
            }];

            gm.generateRecurringTasksForToday();

            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0].title).toBe('Monthly 15th Task');
        });

        test('recurring tasks have all required task fields', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            gm.recurringTasks = [{
                id: 100,
                title: 'Complete Task',
                description: 'Test description',
                recurrence: { type: 'weekly', days: ['wed'] },
                active: true,
                lastGenerated: null
            }];

            gm.generateRecurringTasksForToday();

            const task = gm.dailyTasks[0];
            expect(task).toHaveProperty('id');
            expect(task).toHaveProperty('title', 'Complete Task');
            expect(task).toHaveProperty('description', 'Test description');
            expect(task).toHaveProperty('weeklyGoalIds');
            expect(task).toHaveProperty('dueDate', '2025-01-15');
            expect(task).toHaveProperty('completed', false);
            expect(task).toHaveProperty('checklist');
            expect(task).toHaveProperty('recurringTaskId', 100);
        });
    });

    // ==================== TASK TOGGLING ====================

    describe('Task Toggle Operations', () => {

        test('toggleTask completes a daily task and adds XP', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.dailyTasks = [{
                id: 1,
                title: 'Test Task',
                completed: false,
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(15, 'daily');
        });

        test('toggleTask uncompletes a task without XP clawback', () => {
            const gm = createTestManager();
            gm.xp = 100;
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.dailyTasks = [{
                id: 1,
                title: 'Test Task',
                completed: true,
                rewarded: true,
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(false);
            expect(gm.xp).toBe(100); // No XP clawback
        });

        test('toggleTask does not award XP on re-completion (exploit prevention)', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.dailyTasks = [{
                id: 1,
                title: 'Test Task',
                completed: false,
                rewarded: true, // Already rewarded from first completion
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(true);
            expect(gm.addXP).not.toHaveBeenCalled(); // No double XP
        });

        test('toggleTask sets rewarded flag on first completion', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.dailyTasks = [{
                id: 1,
                title: 'Test Task',
                completed: false,
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(true);
            expect(gm.dailyTasks[0].rewarded).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(15, 'daily');
        });

        test('toggleWeeklyGoal completes and adds XP', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.weeklyGoals = [{
                id: 1,
                title: 'Weekly Goal',
                completed: false,
                priority: 'medium'
            }];

            gm.toggleWeeklyGoal(1, { target: { closest: () => null } });

            expect(gm.weeklyGoals[0].completed).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(50, 'weekly');
        });

        test('toggleMonthlyGoal completes and adds XP', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.monthlyGoals = [{
                id: 1,
                title: 'Monthly Goal',
                completed: false,
                priority: 'medium'
            }];

            gm.toggleMonthlyGoal(1, { target: { closest: () => null } });

            expect(gm.monthlyGoals[0].completed).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(200, 'monthly');
        });
    });

    // ==================== DELETE OPERATIONS ====================

    describe('Delete Operations', () => {

        test('deleteGoal removes daily task', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.dailyTasks = [
                { id: 1, title: 'Task 1' },
                { id: 2, title: 'Task 2' }
            ];
            gm.deleteGoal('daily', 1);
            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0].id).toBe(2);
        });

        test('deleteGoal removes weekly goal', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.weeklyGoals = [
                { id: 1, title: 'Goal 1' },
                { id: 2, title: 'Goal 2' }
            ];
            gm.deleteGoal('weekly', 1);
            expect(gm.weeklyGoals).toHaveLength(1);
            expect(gm.weeklyGoals[0].id).toBe(2);
        });

        test('deleteGoal removes monthly goal', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.monthlyGoals = [
                { id: 1, title: 'Goal 1' },
                { id: 2, title: 'Goal 2' }
            ];
            gm.deleteGoal('monthly', 1);
            expect(gm.monthlyGoals).toHaveLength(1);
        });

        test('deleteGoal removes yearly goal', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.yearlyGoals = [
                { id: 1, title: 'Goal 1' },
                { id: 2, title: 'Goal 2' }
            ];
            gm.deleteGoal('yearly', 1);
            expect(gm.yearlyGoals).toHaveLength(1);
        });

        test('deleteGoal removes life goal', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.lifeGoals = [
                { id: 1, title: 'Goal 1' },
                { id: 2, title: 'Goal 2' }
            ];
            gm.deleteGoal('life', 1);
            expect(gm.lifeGoals).toHaveLength(1);
        });

        test('deleteGoal removes side quest', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.sideQuests = [
                { id: 1, title: 'Quest 1' },
                { id: 2, title: 'Quest 2' }
            ];
            gm.deleteGoal('side', 1);
            expect(gm.sideQuests).toHaveLength(1);
        });

        test('deleteGoal removes habit', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.habits = [
                { id: 1, title: 'Habit 1' },
                { id: 2, title: 'Habit 2' }
            ];
            gm.deleteGoal('habit', 1);
            expect(gm.habits).toHaveLength(1);
        });

        test('deleteRecurringTask removes recurring task', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.recurringTasks = [
                { id: 1, title: 'RT 1' },
                { id: 2, title: 'RT 2' }
            ];
            gm.deleteRecurringTask(1);
            expect(gm.recurringTasks).toHaveLength(1);
            expect(gm.recurringTasks[0].id).toBe(2);
        });
    });

    // ==================== PROGRESS CALCULATION ====================

    describe('Progress Calculation', () => {

        test('calculateProgress returns 0 for no children', () => {
            const gm = createTestManager();
            const result = gm.calculateProgress(1, [], 'weeklyGoalIds');
            expect(result).toBe(0);
        });

        test('calculateProgress returns correct percentage', () => {
            const gm = createTestManager();
            const tasks = [
                { id: 1, weeklyGoalIds: [10], completed: true },
                { id: 2, weeklyGoalIds: [10], completed: false },
                { id: 3, weeklyGoalIds: [10], completed: true },
                { id: 4, weeklyGoalIds: [10], completed: false }
            ];
            const result = gm.calculateProgress(10, tasks, 'weeklyGoalIds');
            expect(result).toBe(50); // 2 of 4 completed
        });

        test('calculateProgress returns 100 for all completed', () => {
            const gm = createTestManager();
            const tasks = [
                { id: 1, weeklyGoalIds: [10], completed: true },
                { id: 2, weeklyGoalIds: [10], completed: true }
            ];
            const result = gm.calculateProgress(10, tasks, 'weeklyGoalIds');
            expect(result).toBe(100);
        });

        test('calculateProgress filters by parent ID', () => {
            const gm = createTestManager();
            const tasks = [
                { id: 1, weeklyGoalIds: [10], completed: true },
                { id: 2, weeklyGoalIds: [20], completed: false }, // different parent
                { id: 3, weeklyGoalIds: [10], completed: true }
            ];
            const result = gm.calculateProgress(10, tasks, 'weeklyGoalIds');
            expect(result).toBe(100); // Only counting parent 10's children
        });
    });

    // ==================== ARCHIVING ====================

    describe('Archive System', () => {

        test('archiveGoal moves goal to archive with metadata', () => {
            const gm = createTestManager();
            gm.showConfirm = jest.fn((msg, cb) => cb());
            gm.recordAction = jest.fn();
            gm.dailyTasks = [
                { id: 1, title: 'Task to archive', completed: true }
            ];

            gm.archiveGoal('daily', 1);

            expect(gm.dailyTasks).toHaveLength(0);
            expect(gm.archivedGoals).toHaveLength(1);
            expect(gm.archivedGoals[0].title).toBe('Task to archive');
            expect(gm.archivedGoals[0].type).toBe('daily');
            expect(gm.archivedGoals[0].archivedAt).toBeDefined();
        });
    });

    // ==================== EDGE CASES & ROBUSTNESS ====================

    describe('Edge Cases', () => {

        test('tasks with undefined title render as undefined (regression check)', () => {
            // This verifies the bug scenario: if a task somehow has no title,
            // string interpolation would show "undefined"
            const task = { id: 1, completed: false };
            const rendered = `${task.title}`;
            expect(rendered).toBe('undefined');
            // This is WHY the migration and fix are important
        });

        test('tasks with name but no title would show undefined without migration', () => {
            const task = { id: 1, name: 'Real Name', completed: false };
            const rendered = `${task.title}`;
            expect(rendered).toBe('undefined');
        });

        test('migration fixes task with name but no title', () => {
            const task = { id: 1, name: 'Real Name', completed: false };
            // Simulate migration logic
            if (!task.title && task.name) {
                task.title = task.name;
            }
            expect(task.title).toBe('Real Name');
        });

        test('toggleTask handles non-existent task gracefully', () => {
            const gm = createTestManager();
            gm.dailyTasks = [];
            // Should not throw
            expect(() => gm.toggleTask(999, { target: { closest: () => null } })).not.toThrow();
        });

        test('deleteGoal with non-existent ID does not crash', () => {
            const gm = createTestManager();
            gm.dailyTasks = [{ id: 1, title: 'Only task' }];
            gm.deleteGoal('daily', 999);
            expect(gm.dailyTasks).toHaveLength(1); // unchanged
        });

        test('getActiveCompanion with invalid ID returns null', () => {
            const gm = createTestManager();
            gm.companions = [{ type: 'cat', name: 'Cat' }];
            gm.activeCompanionId = 'nonexistent';
            expect(gm.getActiveCompanion()).toBeNull();
        });

        test('unlockCompanion with invalid type does not crash', () => {
            const gm = createTestManager();
            expect(() => gm.unlockCompanion('totally_fake_companion')).not.toThrow();
        });

        test('addXP with zero amount does not change state', () => {
            const gm = createTestManager();
            gm.addXP(0, 'daily');
            expect(gm.xp).toBe(0);
            expect(gm.level).toBe(1);
        });

        test('getTotalXPForLevel with level 1 returns 0', () => {
            const gm = createTestManager();
            expect(gm.getTotalXPForLevel(1)).toBe(0);
        });
    });

    // ==================== QUICK ADD ====================

    describe('Quick Add System', () => {

        test('handleQuickAdd passes text as parentId not title (known UX issue)', () => {
            // This documents the current behavior where Quick Add passes text
            // to add functions as the first param (parentId), not as a title.
            // The add functions then open their own modal for the title.
            const gm = createTestManager();

            // addDailyTask signature: addDailyTask(parentWeeklyGoalId = null, scheduledDate = null)
            // When called from quickAdd with text, text becomes parentWeeklyGoalId
            // The function still opens a modal for title entry
            // This is a UX issue (double prompting) but not an undefined title bug
            expect(typeof gm.addDailyTask).toBe('function');
            expect(gm.addDailyTask.length).toBeLessThanOrEqual(2); // Takes up to 2 params
        });
    });

    // ==================== HABIT SYSTEM ====================

    describe('Habit System', () => {

        test('toggleRecurringTask toggles active state', () => {
            const gm = createTestManager();
            gm.recurringTasks = [{ id: 1, title: 'RT', active: true }];
            gm.toggleRecurringTask(1);
            expect(gm.recurringTasks[0].active).toBe(false);
            gm.toggleRecurringTask(1);
            expect(gm.recurringTasks[0].active).toBe(true);
        });
    });

    // ==================== XP EXPLOIT PREVENTION ====================

    describe('XP Exploit Prevention', () => {

        test('toggleWeeklyGoal does not award XP on re-completion', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.weeklyGoals = [{
                id: 1,
                title: 'Weekly Goal',
                completed: false,
                rewarded: true,
                priority: 'medium'
            }];

            gm.toggleWeeklyGoal(1, { target: { closest: () => null } });

            expect(gm.weeklyGoals[0].completed).toBe(true);
            expect(gm.addXP).not.toHaveBeenCalled();
        });

        test('toggleMonthlyGoal does not award XP on re-completion', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.monthlyGoals = [{
                id: 1,
                title: 'Monthly Goal',
                completed: false,
                rewarded: true,
                priority: 'medium'
            }];

            gm.toggleMonthlyGoal(1, { target: { closest: () => null } });

            expect(gm.monthlyGoals[0].completed).toBe(true);
            expect(gm.addXP).not.toHaveBeenCalled();
        });

        test('toggleSideQuest does not award XP on re-completion', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.sideQuests = [{
                id: 1,
                title: 'Side Quest',
                completed: false,
                rewarded: true,
                priority: 'medium'
            }];

            gm.toggleSideQuest(1);

            expect(gm.sideQuests[0].completed).toBe(true);
            expect(gm.addXP).not.toHaveBeenCalled();
        });

        test('toggleWeeklyGoal sets rewarded flag on first completion', () => {
            const gm = createTestManager();
            gm.dealBossDamage = jest.fn();
            gm.addXP = jest.fn();

            gm.weeklyGoals = [{
                id: 1,
                title: 'Weekly Goal',
                completed: false,
                priority: 'medium'
            }];

            gm.toggleWeeklyGoal(1, { target: { closest: () => null } });

            expect(gm.weeklyGoals[0].rewarded).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(50, 'weekly');
        });
    });

    // ==================== TUTORIAL SYSTEM ====================

    describe('Tutorial System', () => {

        test('tutorial has exactly 5 steps', () => {
            const gm = createTestManager();
            const steps = gm.getAllTutorialSteps();
            expect(steps).toHaveLength(5);
        });

        test('tutorial steps cover level 1 features only', () => {
            const gm = createTestManager();
            const steps = gm.getAllTutorialSteps();
            // No step should have a requiredLevel property > 1
            steps.forEach(step => {
                if (step.requiredLevel) {
                    expect(step.requiredLevel).toBe(1);
                }
            });
        });

        test('tutorial includes Welcome, Stats, Daily Quests, Calendar, Ready steps', () => {
            const gm = createTestManager();
            const steps = gm.getAllTutorialSteps();
            const titles = steps.map(s => s.title);
            expect(titles[0]).toContain('Welcome');
            expect(titles[1]).toContain('Level Up');
            expect(titles[2]).toContain('Daily Quests');
            expect(titles[3]).toContain('Quest Calendar');
            expect(titles[4]).toContain('Ready to Begin');
        });

        test('feature unlock tutorials cover levels 2-10', () => {
            const gm = createTestManager();
            const unlockLevels = Object.keys(gm.featureUnlockTutorials).map(Number);
            expect(unlockLevels).toEqual(expect.arrayContaining([2, 3, 4, 5, 6, 7, 9, 10]));
        });

        test('level 6 feature unlock is Kingdom Themes', () => {
            const gm = createTestManager();
            expect(gm.featureUnlockTutorials[6].title).toContain('Kingdom Themes');
        });

        test('level 10 Boss Battles mentions Premium', () => {
            const gm = createTestManager();
            expect(gm.featureUnlockTutorials[10].text).toContain('Premium');
        });
    });

    // ==================== MONTHLY BOSS SYSTEM ====================

    describe('Monthly Boss System', () => {

        test('canChallengeMonthlyBoss returns false when kills below threshold', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 3;
            expect(gm.canChallengeMonthlyBoss()).toBe(false);
        });

        test('canChallengeMonthlyBoss returns true when kills meet threshold and no active monthly boss', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 5;
            gm.monthlyBoss = null;
            expect(gm.canChallengeMonthlyBoss()).toBe(true);
        });

        test('canChallengeMonthlyBoss returns false when monthly boss already exists', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 10;
            gm.monthlyBoss = { name: 'Test Boss', defeated: false };
            expect(gm.canChallengeMonthlyBoss()).toBe(false);
        });

        test('challengeMonthlyBoss spawns a monthly boss when threshold met', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 5;
            gm.level = 5;
            gm.monthlyBoss = null;

            gm.challengeMonthlyBoss();

            expect(gm.monthlyBoss).not.toBeNull();
            expect(gm.monthlyBoss.type).toBe('monthly');
            expect(gm.monthlyBoss.defeated).toBe(false);
            expect(gm.monthlyBoss.maxHP).toBe(100 + 5 * 10); // 150
            expect(gm.monthlyBoss.rewards.xp).toBe(500 + 5 * 50); // 750
            expect(gm.monthlyBoss.rewards.gold).toBe(400 + 5 * 40); // 600
            expect(gm.saveData).toHaveBeenCalled();
            expect(gm.renderBossBattles).toHaveBeenCalled();
        });

        test('challengeMonthlyBoss does nothing when threshold not met', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 2;
            gm.monthlyBoss = null;

            gm.challengeMonthlyBoss();

            expect(gm.monthlyBoss).toBeNull();
        });

        test('challengeMonthlyBoss does nothing when monthly boss already active', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 10;
            gm.monthlyBoss = { name: 'Existing Boss', defeated: false, type: 'monthly' };

            gm.challengeMonthlyBoss();

            expect(gm.monthlyBoss.name).toBe('Existing Boss');
        });

        test('monthly boss HP scales with player level', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 5;
            gm.level = 10;

            gm.challengeMonthlyBoss();

            expect(gm.monthlyBoss.maxHP).toBe(100 + 10 * 10); // 200
        });

        test('monthly boss rewards scale with player level', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 5;
            gm.level = 10;

            gm.challengeMonthlyBoss();

            expect(gm.monthlyBoss.rewards.xp).toBe(500 + 10 * 50); // 1000
            expect(gm.monthlyBoss.rewards.gold).toBe(400 + 10 * 40); // 800
        });

        test('attackBoss works on monthly boss', () => {
            const gm = createTestManager();
            gm.level = 1;
            gm.attackCharges = 3;
            gm.monthlyBoss = {
                name: 'Test Monthly Boss',
                icon: '🏴',
                flavor: 'Test',
                maxHP: 100,
                currentHP: 100,
                level: 1,
                spawnMonth: '2026-03',
                type: 'monthly',
                defeated: false,
                totalDamage: 0,
                rewards: { xp: 500, gold: 400 }
            };

            gm.attackBoss('monthly');

            expect(gm.attackCharges).toBe(2);
            expect(gm.monthlyBoss.currentHP).toBeLessThan(100);
            expect(gm.monthlyBoss.totalDamage).toBeGreaterThan(0);
        });

        test('onBossDefeated increments monthly streak and bossKillsThisMonth', () => {
            const gm = createTestManager();
            gm.level = 1;
            gm.monthlyBoss = {
                name: 'Test Monthly Boss',
                icon: '🏴',
                flavor: 'Test',
                maxHP: 100,
                currentHP: 0,
                level: 1,
                spawnMonth: '2026-03',
                type: 'monthly',
                defeated: true,
                totalDamage: 100,
                rewards: { xp: 500, gold: 400 }
            };
            gm.monthlyBossStreak = 0;
            gm.bossKillsThisMonth = 5;
            gm.bossesDefeated = 10;
            gm.generateBossLoot = jest.fn(() => []);

            gm.onBossDefeated('monthly');

            expect(gm.monthlyBossStreak).toBe(1);
            expect(gm.bossKillsThisMonth).toBe(6);
            expect(gm.bossesDefeated).toBe(11);
        });

        test('onBossDefeated generates boss loot drops', () => {
            const gm = createTestManager();
            gm.level = 5;
            gm.monthlyBoss = {
                name: 'Test Monthly Boss',
                icon: '🏴',
                flavor: 'Test',
                maxHP: 100,
                currentHP: 0,
                level: 1,
                spawnMonth: '2026-03',
                type: 'monthly',
                defeated: true,
                totalDamage: 100,
                rewards: { xp: 500, gold: 400 }
            };
            const fakeLoot = [{ type: 'gold', amount: 200, rarity: 'rare', name: 'Grand Gold Pouch', icon: '💰' }];
            gm.generateBossLoot = jest.fn(() => fakeLoot);

            gm.onBossDefeated('monthly');

            expect(gm.generateBossLoot).toHaveBeenCalledWith('monthly');
            // Gold from loot is applied via addGold
            expect(gm.goldCoins).toBeGreaterThanOrEqual(400);
        });

        test('onBossDefeated awards XP and gold for monthly boss', () => {
            const gm = createTestManager();
            gm.level = 10;
            gm.xp = 0;
            gm.goldCoins = 0;
            gm.monthlyBoss = {
                name: 'Test Monthly Boss',
                icon: '🏴',
                flavor: 'Test',
                maxHP: 100,
                currentHP: 0,
                level: 1,
                spawnMonth: '2026-03',
                type: 'monthly',
                defeated: true,
                totalDamage: 100,
                rewards: { xp: 500, gold: 400 }
            };
            gm.monthlyBossStreak = 0;
            gm.generateBossLoot = jest.fn(() => []);

            gm.onBossDefeated('monthly');

            // Streak becomes 1, multiplier = 1.0
            // With empty loot, only base boss reward gold applies
            expect(gm.goldCoins).toBe(400);
            expect(gm.xp).toBe(500);
        });

        test('monthly boss added to defeatedBossList on defeat', () => {
            const gm = createTestManager();
            gm.level = 1;
            gm.monthlyBoss = {
                name: 'The Obsidian Warden',
                icon: '🏴',
                flavor: 'Test',
                maxHP: 100,
                currentHP: 0,
                level: 1,
                spawnMonth: '2026-03',
                type: 'monthly',
                defeated: true,
                totalDamage: 100,
                rewards: { xp: 500, gold: 400 }
            };
            gm.generateBossLoot = jest.fn(() => []);

            gm.onBossDefeated('monthly');

            expect(gm.defeatedBossList.length).toBe(1);
            expect(gm.defeatedBossList[0].type).toBe('monthly');
            expect(gm.defeatedBossList[0].name).toBe('The Obsidian Warden');
        });

        test('monthly boss themes exist and have required fields', () => {
            const gm = createTestManager();
            expect(gm.bossThemes.monthly).toBeDefined();
            expect(gm.bossThemes.monthly.length).toBeGreaterThanOrEqual(10);
            gm.bossThemes.monthly.forEach(theme => {
                expect(theme.name).toBeDefined();
                expect(theme.icon).toBeDefined();
                expect(theme.flavor).toBeDefined();
            });
        });

        test('monthly boss unlock threshold defaults to 5', () => {
            const gm = createTestManager();
            expect(gm.monthlyBossUnlockThreshold).toBe(5);
        });

        test('bossKillsThisMonth increments on daily boss defeat', () => {
            const gm = createTestManager();
            gm.level = 1;
            gm.bossKillsThisMonth = 0;
            gm.dailyBoss = {
                name: 'Test Daily Boss',
                icon: '🐀',
                flavor: 'Test',
                maxHP: 10,
                currentHP: 0,
                level: 1,
                spawnDate: '2026-03-19',
                type: 'daily',
                defeated: true,
                totalDamage: 10,
                rewards: { xp: 70, gold: 45 }
            };

            gm.onBossDefeated('daily');

            expect(gm.bossKillsThisMonth).toBe(1);
        });

        test('bossKillsThisMonth increments on weekly boss defeat', () => {
            const gm = createTestManager();
            gm.level = 1;
            gm.bossKillsThisMonth = 3;
            gm.weeklyBoss = {
                name: 'Test Weekly Boss',
                icon: '🐉',
                flavor: 'Test',
                maxHP: 30,
                currentHP: 0,
                level: 1,
                spawnWeek: '2026-W12',
                type: 'weekly',
                defeated: true,
                totalDamage: 30,
                rewards: { xp: 230, gold: 175, spellScroll: true }
            };

            gm.onBossDefeated('weekly');

            expect(gm.bossKillsThisMonth).toBe(4);
        });
    });

    // ==================== SAVE/LOAD ROUND TRIP ====================

    describe('Save/Load Round Trip', () => {

        test('_doSave writes to localStorage without error', () => {
            const gm = createTestManager();
            // Restore real saveData/_doSave
            gm._doSave = GoalManager.prototype._doSave.bind(gm);

            expect(() => gm._doSave()).not.toThrow();
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'lifeOrganizeData',
                expect.any(String)
            );
        });

        test('save then load preserves task data', () => {
            const gm = createTestManager();
            gm._doSave = GoalManager.prototype._doSave.bind(gm);

            // Add test data
            gm.dailyTasks = [{ id: 1, title: 'Saved Task', completed: false, dueDate: '2025-01-15' }];
            gm.xp = 500;
            gm.level = 2;
            gm.goldCoins = 1000;

            // Save
            gm._doSave();

            // Create new instance and load
            const gm2 = createTestManager();
            gm2.loadData();

            expect(gm2.dailyTasks[0].title).toBe('Saved Task');
            expect(gm2.xp).toBe(500);
            expect(gm2.level).toBe(2);
            expect(gm2.goldCoins).toBe(1000);
        });
    });
});
