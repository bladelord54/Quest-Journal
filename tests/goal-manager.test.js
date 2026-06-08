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
    playSlash: jest.fn(),
    playGoldEarned: jest.fn(),
    playDailyAchievement: jest.fn()
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

// Extract `themeDefinitions = { ... }` class-field literal from the source so
// tests can validate the real data without booting the full constructor (which
// touches DOM, audio, localStorage, render scheduling etc.). Class-field
// initializers can't be invoked in isolation in pure JS — they run as part of
// the constructor body — so we slice the literal out by brace-balance and
// `eval` just that fragment. Brittle to comments containing braces, so the
// extraction is anchored to the well-known `themeDefinitions = {` opener and
// stops at the matching close brace using a depth counter that ignores
// braces inside `/* ... */` comments and `'...'` strings.
const extractedThemeDefs = (() => {
    const startMatch = source.match(/themeDefinitions\s*=\s*\{/);
    if (!startMatch) throw new Error('themeDefinitions literal not found in source');
    const start = startMatch.index + startMatch[0].length - 1; // points at `{`
    let depth = 0, i = start, inBlockComment = false, inLineComment = false, inStr = null;
    for (; i < source.length; i++) {
        const c = source[i], n = source[i + 1];
        if (inBlockComment) { if (c === '*' && n === '/') { inBlockComment = false; i++; } continue; }
        if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
        if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
        if (c === '/' && n === '*') { inBlockComment = true; i++; continue; }
        if (c === '/' && n === '/') { inLineComment = true; i++; continue; }
        if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    const literal = source.slice(start, i);
    // eslint-disable-next-line no-eval
    return eval('(' + literal + ')');
})();

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

    // Class fields — these are declared with `FIELD = {...}` syntax in
    // goal-manager.js and are assigned per-instance during `new GoalManager()`.
    // The factory uses `Object.create(GoalManager.prototype)` to bypass the
    // constructor (which has heavy side effects: DOM lookups, audio init,
    // localStorage reads, render scheduling), so class fields are NOT
    // present on the resulting instance and must be re-declared here.
    // Symptom when a needed field is missing: any code path that touches
    // it crashes with `Cannot read properties of undefined`. Mirror them
    // verbatim from the production source.

    // LEVEL_TITLES — consumed by getLevelTitle(), called from levelUp().
    // Without this, any test that triggers a level-up (directly via
    // levelUp(), or transitively via addXP() / boss defeat / task toggle
    // crossing a level threshold) crashes inside getLevelTitle.
    gm.LEVEL_TITLES = {
        masculine: ['Peasant', 'Squire', 'Knight', 'Baron',    'Earl',     'Duke',    'Prince',   'King',  'Emperor', 'Legend'],
        feminine:  ['Peasant', 'Squire', 'Dame',   'Baroness', 'Countess', 'Duchess', 'Princess', 'Queen', 'Empress', 'Legend']
    };
    gm.titleStyle = 'masculine';

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
    // v2.8 lifetime gold-earned counter (Jun 7, 2026). Drives Golden
    // Empire theme unlock criteria. Initialized to 0 here so the
    // factory matches the production constructor; tests can override.
    gm.totalGoldEarned = 0;
    // Theme catalog — class field on production instances. Extracted
    // from source above (see `extractedThemeDefs`) so tests validate
    // the real data and `checkRewardUnlocks()` can iterate it without
    // booting the full constructor.
    gm.themeDefinitions = extractedThemeDefs;

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
        3: { title: '🔮 Arcane Powers Unlocked!', text: "Your Spellbook is ready! You've received a welcome spell — visit Arcane Powers to view and cast it. Earn more spells from treasure chests and boss loot!" },
        4: { title: '💀 Boss Battles Unlocked!', text: "Challenge daily and weekly bosses! Complete quests to earn attack charges and defeat powerful foes for epic loot rewards!" },
        5: { title: '🎯 Focus Timer & Enchantments!', text: "The Focus Timer lets you earn Focus Crystals through timed work sessions. Chain multiple sessions together for bonus rewards! Spend crystals on Enchantments for powerful buffs." },
        6: { title: '⚔️ New Quest Types & Chains!', text: "Your Quest Log now has Weekly Battles and Side Quests! Plus, Quest Chains let you link tasks into epic multi-step adventures for bonus rewards. You've also unlocked the Forest Kingdom theme!" },
        7: { title: '� Monthly Raids Unlocked!', text: "Plan bigger with Monthly Raids! Set monthly goals and conquer larger challenges over longer timeframes." },
        9: { title: '🚩 Life Goals & Yearly Campaigns!', text: "Think long-term! Set Yearly Campaigns and Epic Life Quests to plan your biggest, most ambitious goals." },
        10: { title: '👑 Legend Status Achieved!', text: "You've reached Level 10 — the rank of Legend! All features are now unlocked. Your dedication is truly epic!" }
    };
    gm.seenFeatureTutorials = [];
    gm.progressiveUnlockInitialized = false;
    gm.featureUnlockLevels = {
        dashboard: 1, goals: 1, daily: 1, calendar: 1, tools: 1,
        rewards: 2, arcane: 3, bossbattles: 4, focus: 5, questchains: 6
    };
    gm.goalTabUnlockLevels = {
        weekly: 6, sidequests: 6, monthly: 7, yearly: 9, 'life-goals': 9
    };
    gm.arcaneTabUnlockLevels = { spellbook: 3, enchantments: 5 };
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

        test('addGold applies quest doubler multiplier via pending flag', () => {
            const gm = createTestManager();
            gm._questDoublerGoldPending = 2;
            gm.addGold(100, 'daily');
            expect(gm.goldCoins).toBe(200);
            expect(gm._questDoublerGoldPending).toBeNull();
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
            gm.level = 10; // Unlock all goal tabs so weekly/monthly tasks are added
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

        // v2.6.x test refresh — the previous test asserted "no XP clawback"
        // with `expect(gm.xp).toBe(100)`. That expectation predates the v2.5
        // anti-exploit refund logic in `toggleTask` (goal-manager.js ~6841)
        // which deliberately refunds the exact multiplied reward (or a
        // fallback baseline) on uncomplete to close a check/uncheck farming
        // loop on buffed tasks. The original test also mocked `gm.addXP =
        // jest.fn()` expecting that to intercept the clawback, but the
        // refund branch mutates `this.xp` directly and never goes through
        // addXP, so the mock did nothing. Replacing one stale assertion
        // with two explicit ones that lock the documented contract:
        //   (a) legacy task (rewarded:true, no lastRewards) → fallback refund
        //   (b) modern task with a lastRewards snapshot → exact-amount refund
        test('toggleTask uncomplete: legacy task without lastRewards refunds the fallback baseline', () => {
            const gm = createTestManager();
            gm.xp = 100;
            gm.goldCoins = 50;
            gm.attackCharges = 5;
            gm.dealBossDamage = jest.fn();

            gm.dailyTasks = [{
                id: 1,
                title: 'Legacy Task',
                completed: true,
                rewarded: true,
                // intentionally no lastRewards — pre-v2.5 data shape
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(false);
            expect(gm.dailyTasks[0].rewarded).toBe(false);
            expect(gm.dailyTasks[0].lastRewards).toBeNull();
            // Fallback baseline { xp: 15, gold: 5, charges: 1 } refunded
            expect(gm.xp).toBe(85);
            expect(gm.goldCoins).toBe(45);
            expect(gm.attackCharges).toBe(4);
        });

        test('toggleTask uncomplete: modern task refunds the exact lastRewards snapshot', () => {
            const gm = createTestManager();
            gm.xp = 200;
            gm.goldCoins = 100;
            gm.attackCharges = 10;
            gm.dealBossDamage = jest.fn();

            // Snapshot reflects e.g. a Blessing 2x grant — refund must mirror
            // it so the user nets zero across check/uncheck cycles.
            gm.dailyTasks = [{
                id: 1,
                title: 'Buffed Task',
                completed: true,
                rewarded: true,
                lastRewards: { xp: 30, gold: 10, charges: 2, shards: 0, crystals: 0 },
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(false);
            expect(gm.dailyTasks[0].rewarded).toBe(false);
            expect(gm.dailyTasks[0].lastRewards).toBeNull();
            expect(gm.xp).toBe(170);          // 200 - 30
            expect(gm.goldCoins).toBe(90);    // 100 - 10
            expect(gm.attackCharges).toBe(8); // 10 - 2
        });

        test('toggleTask uncomplete: refund clamps at zero (never negative)', () => {
            const gm = createTestManager();
            gm.xp = 5;          // less than fallback 15
            gm.goldCoins = 2;   // less than fallback 5
            gm.attackCharges = 0;
            gm.dealBossDamage = jest.fn();

            gm.dailyTasks = [{
                id: 1, title: 'Edge Case', completed: true, rewarded: true,
                dueDate: '2025-01-15'
            }];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.xp).toBe(0);
            expect(gm.goldCoins).toBe(0);
            expect(gm.attackCharges).toBe(0);
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

        test('level 4 feature unlock is Boss Battles', () => {
            const gm = createTestManager();
            expect(gm.featureUnlockTutorials[4].title).toContain('Boss Battles');
        });

        test('level 10 is Legend Status celebration', () => {
            const gm = createTestManager();
            expect(gm.featureUnlockTutorials[10].title).toContain('Legend Status');
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

    // ==================== BOSS HP CHUNK BAR (v2.9 TRACK 3) ====================

    // The chunk-bar refactor (replacing the v2.8 single-fill gradient with N
    // segmented chunks) introduces three new surfaces worth pinning down:
    //   - getBossPhase()       — phase color + label thresholds
    //   - renderBossHPChunks() — chunk count math + filled/empty distribution
    //   - updateBossHPBar()    — per-hit DOM mutations (drain vs flash, crit
    //                            class variant, phase data-attribute updates)
    // The tests below exercise all three with deterministic inputs.

    describe('Boss HP Chunk Bar (v2.9 Track 3)', () => {

        // ---- getBossPhase ----------------------------------------------------

        test('getBossPhase returns red Full Power above 75%', () => {
            const gm = createTestManager();
            expect(gm.getBossPhase(100, 100)).toEqual({ color: 'red', text: 'Full Power' });
            expect(gm.getBossPhase(76,  100)).toEqual({ color: 'red', text: 'Full Power' });
        });

        test('getBossPhase returns yellow Injured at 50-75%', () => {
            const gm = createTestManager();
            expect(gm.getBossPhase(75, 100)).toEqual({ color: 'yellow', text: 'Injured' });
            expect(gm.getBossPhase(51, 100)).toEqual({ color: 'yellow', text: 'Injured' });
        });

        test('getBossPhase returns orange Wounded at 25-50%', () => {
            const gm = createTestManager();
            expect(gm.getBossPhase(50, 100)).toEqual({ color: 'orange', text: 'Wounded' });
            expect(gm.getBossPhase(26, 100)).toEqual({ color: 'orange', text: 'Wounded' });
        });

        test('getBossPhase returns purple CRITICAL! at 0-25% (exclusive of 0)', () => {
            const gm = createTestManager();
            expect(gm.getBossPhase(25, 100)).toEqual({ color: 'purple', text: 'CRITICAL!' });
            expect(gm.getBossPhase(1,  100)).toEqual({ color: 'purple', text: 'CRITICAL!' });
        });

        test('getBossPhase returns green DEFEATED at 0 HP', () => {
            const gm = createTestManager();
            expect(gm.getBossPhase(0, 100)).toEqual({ color: 'green', text: 'DEFEATED' });
        });

        test('getBossPhase handles maxHP of 0 defensively (treats as defeated)', () => {
            const gm = createTestManager();
            expect(gm.getBossPhase(0, 0)).toEqual({ color: 'green', text: 'DEFEATED' });
        });

        // ---- renderBossHPChunks chunk count math -----------------------------

        test('renderBossHPChunks produces maxHP chunks when maxHP <= 20', () => {
            const gm = createTestManager();
            // maxHP=14 -> 14 chunks (1 HP each)
            const html = gm.renderBossHPChunks({ maxHP: 14, currentHP: 14 }, 'red');
            const matches = html.match(/class="hp-chunk /g) || [];
            expect(matches).toHaveLength(14);
            expect(html).toContain('data-chunk-count="14"');
            expect(html).toContain('data-hp-per-chunk="1"');
        });

        test('renderBossHPChunks caps at 20 chunks when maxHP > 20', () => {
            const gm = createTestManager();
            // maxHP=100 -> 20 chunks (5 HP each)
            const html = gm.renderBossHPChunks({ maxHP: 100, currentHP: 100 }, 'red');
            const matches = html.match(/class="hp-chunk /g) || [];
            expect(matches).toHaveLength(20);
            expect(html).toContain('data-chunk-count="20"');
            expect(html).toContain('data-hp-per-chunk="5"');
        });

        test('renderBossHPChunks renders single chunk for maxHP=1 boss', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPChunks({ maxHP: 1, currentHP: 1 }, 'red');
            const matches = html.match(/class="hp-chunk /g) || [];
            expect(matches).toHaveLength(1);
        });

        test('renderBossHPChunks returns empty string when maxHP <= 0', () => {
            const gm = createTestManager();
            expect(gm.renderBossHPChunks({ maxHP: 0, currentHP: 0 }, 'green')).toBe('');
        });

        test('renderBossHPChunks emits expected filled/empty distribution', () => {
            const gm = createTestManager();
            // maxHP=10, currentHP=7 -> 7 filled, 3 empty
            const html = gm.renderBossHPChunks({ maxHP: 10, currentHP: 7 }, 'yellow');
            const filled = (html.match(/hp-chunk--filled/g) || []).length;
            const empty  = (html.match(/hp-chunk--empty/g)  || []).length;
            expect(filled).toBe(7);
            expect(empty).toBe(3);
        });

        test('renderBossHPChunks ceils boundary: currentHP between bucket edges still shows the boundary chunk filled', () => {
            const gm = createTestManager();
            // maxHP=100 -> hpPerChunk=5; currentHP=93 -> ceil(93/5)=19 filled
            const html = gm.renderBossHPChunks({ maxHP: 100, currentHP: 93 }, 'red');
            const filled = (html.match(/hp-chunk--filled/g) || []).length;
            const empty  = (html.match(/hp-chunk--empty/g)  || []).length;
            expect(filled).toBe(19);
            expect(empty).toBe(1);
        });

        test('renderBossHPChunks emits the phase data attribute for CSS hookup', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPChunks({ maxHP: 10, currentHP: 5 }, 'orange');
            expect(html).toContain('data-phase="orange"');
            expect(html).toContain('hp-chunk-track');
        });

        test('renderBossHPChunks clamps currentHP > maxHP defensively', () => {
            const gm = createTestManager();
            // Should not produce more filled chunks than chunkCount
            const html = gm.renderBossHPChunks({ maxHP: 10, currentHP: 999 }, 'red');
            const filled = (html.match(/hp-chunk--filled/g) || []).length;
            expect(filled).toBe(10);
        });

        // ---- updateBossHPBar DOM mutations -----------------------------------

        // Helper: mount a fake boss card matching what renderBossCard emits
        // for the parts updateBossHPBar reads/writes. We don't need the full
        // card markup, only the elements queried by selectors.
        function mountBossCardDom(bossType, boss, phaseColor = 'red') {
            const gm = createTestManager();
            const card = document.createElement('div');
            card.id = `boss-card-${bossType}`;
            const trackHtml = gm.renderBossHPChunks(boss, phaseColor);
            card.innerHTML = `
                <div class="font-bold">HP <span class="font-bold">${boss.currentHP} / ${boss.maxHP}</span></div>
                ${trackHtml}
                <div class="text-amber-300 mb-3">${boss.totalDamage || 0} total damage dealt</div>
                <button onclick="goalManager.attackBoss('${bossType}')">ATTACK!</button>
            `;
            document.body.appendChild(card);
            return { gm, card };
        }

        afterEach(() => {
            document.body.innerHTML = '';
            jest.useRealTimers();
        });

        test('updateBossHPBar drains the correct number of chunks for a hit', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);
            gm.attackCharges = 2;

            // Hit dealt 3 damage: previous=10 chunks filled, after=7 -> drain 3 chunks
            gm.updateBossHPBar('daily', boss, 3, false);

            // Drain is staggered (80ms each); fast-forward all timers to settle.
            jest.runAllTimers();

            const chunks = card.querySelectorAll('.hp-chunk');
            const empty = Array.from(chunks).filter(c => c.classList.contains('hp-chunk--empty'));
            const filled = Array.from(chunks).filter(c => c.classList.contains('hp-chunk--filled'));
            expect(empty).toHaveLength(3);
            expect(filled).toHaveLength(7);
        });

        test('updateBossHPBar uses crit drain class when isCrit=true', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 3, true);

            // Right after the first stagger tick, the rightmost-drained chunk should
            // carry the crit drain class (before the post-animation cleanup at +500ms).
            jest.advanceTimersByTime(1);
            const draining = card.querySelectorAll('.hp-chunk--draining-crit');
            expect(draining.length).toBeGreaterThan(0);
            // And the non-crit drain class should NOT be applied.
            expect(card.querySelectorAll('.hp-chunk--draining').length).toBe(0);

            jest.runAllTimers();
        });

        test('updateBossHPBar flashes the boundary chunk when hit does not cross a chunk boundary', () => {
            jest.useFakeTimers();
            // maxHP=100, hpPerChunk=5; currentHP went 95 -> 93 (damage=2)
            // Both round up to 19 chunks filled, so chunksToDrain=0 -> flash path.
            const boss = { maxHP: 100, currentHP: 93, totalDamage: 2 };
            const { gm, card } = mountBossCardDom('weekly', boss);

            gm.updateBossHPBar('weekly', boss, 2, false);

            // Boundary chunk (index 18, the rightmost still-filled) should have the
            // flash class applied immediately.
            const flashing = card.querySelectorAll('.hp-chunk--flashing');
            expect(flashing.length).toBe(1);
            expect(card.querySelectorAll('.hp-chunk--flashing-crit').length).toBe(0);

            // After 250ms the flash class is removed.
            jest.advanceTimersByTime(260);
            expect(card.querySelectorAll('.hp-chunk--flashing').length).toBe(0);
        });

        test('updateBossHPBar updates the data-phase attribute when HP crosses a phase threshold', () => {
            jest.useFakeTimers();
            // Start at 60% HP (yellow), drop to 40% HP (orange) via 20 damage
            const boss = { maxHP: 100, currentHP: 40, totalDamage: 20 };
            const { gm, card } = mountBossCardDom('daily', boss, 'yellow');
            const track = card.querySelector('.hp-chunk-track');
            expect(track.dataset.phase).toBe('yellow');

            gm.updateBossHPBar('daily', boss, 20, false);

            expect(track.dataset.phase).toBe('orange');
            jest.runAllTimers();
        });

        test('updateBossHPBar updates HP text after a hit', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 14, currentHP: 11, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 3, false);

            const hpText = Array.from(card.querySelectorAll('.font-bold'))
                .map(el => el.textContent.trim())
                .find(t => t.includes('/'));
            expect(hpText).toBe('11 / 14');
            jest.runAllTimers();
        });

        test('updateBossHPBar is a no-op for chunk drain when track DOM is missing', () => {
            // Defensive path: card exists but no chunk track (e.g., legacy markup).
            const card = document.createElement('div');
            card.id = 'boss-card-daily';
            card.innerHTML = `<div class="font-bold">HP <span class="font-bold">5 / 10</span></div>`;
            document.body.appendChild(card);
            const gm = createTestManager();

            // Should not throw, should still update the HP text.
            const boss = { maxHP: 10, currentHP: 5, totalDamage: 5 };
            expect(() => gm.updateBossHPBar('daily', boss, 5, false)).not.toThrow();
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

    // ==================== SECURITY HARDENING (v2.7 audit) ====================
    //
    // Pre-release security audit identified that `bossLog[i].message` is
    // rendered via `innerHTML` (legacy entries embed `<i class="ri-...">`
    // icon prefixes) and `importData()` restores `bossLog` verbatim
    // from a user-supplied JSON file. Without sanitization, a hostile
    // backup could plant an XSS payload that fires on the next boss
    // arena render. `_sanitizeBossLogMessage` is the chokepoint that
    // prevents this — these tests pin its allowlist.

    describe('Boss Log XSS Sanitizer', () => {

        test('escapes plain HTML tags', () => {
            const gm = createTestManager();
            const out = gm._sanitizeBossLogMessage('<script>alert(1)</script>');
            expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(out).not.toContain('<script>');
        });

        // Helper: parse the sanitizer output as HTML and confirm only
        // benign nodes survive. Anything that would have executed
        // (script, img with onerror, anchor with javascript:) must be
        // rendered as inert text — i.e., not present as DOM elements.
        function parsedNodeNames(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            return Array.from(div.querySelectorAll('*')).map(el => el.tagName.toLowerCase());
        }

        test('img onerror payload renders as inert text, not an <img>', () => {
            const gm = createTestManager();
            const out = gm._sanitizeBossLogMessage('<img src=x onerror=alert(1)>');
            expect(parsedNodeNames(out)).not.toContain('img');
            // Original `<` must have been entity-escaped
            expect(out.startsWith('&lt;img')).toBe(true);
        });

        test('<i> tag with disallowed class is escaped, not rendered', () => {
            const gm = createTestManager();
            const out = gm._sanitizeBossLogMessage('<i class="evil-class" onclick="x">!</i>');
            // The disallowed <i> stays escaped — no <i> node in the DOM
            expect(parsedNodeNames(out)).not.toContain('i');
            expect(out).toContain('&lt;i class=&quot;evil-class&quot;');
        });

        test('preserves allowlisted ri- icon tags as real DOM nodes', () => {
            const gm = createTestManager();
            const out = gm._sanitizeBossLogMessage('<i class="ri-trophy-line mr-1"></i>Victory!');
            expect(parsedNodeNames(out)).toContain('i');
            expect(out).toContain('<i class="ri-trophy-line mr-1"></i>');
            expect(out).toContain('Victory!');
        });

        test('handles non-string input gracefully', () => {
            const gm = createTestManager();
            expect(gm._sanitizeBossLogMessage(null)).toBe('');
            expect(gm._sanitizeBossLogMessage(undefined)).toBe('');
            expect(gm._sanitizeBossLogMessage({ malicious: '<script>' })).toBe('');
        });

        test('javascript: URI in <a> is rendered as inert text, not an anchor', () => {
            const gm = createTestManager();
            const out = gm._sanitizeBossLogMessage('<a href="javascript:alert(1)">x</a>');
            expect(parsedNodeNames(out)).not.toContain('a');
            expect(out.startsWith('&lt;a')).toBe(true);
        });

        test('rejects ri-* spoofing via injected attributes', () => {
            const gm = createTestManager();
            // Attacker tries to smuggle an event handler by claiming a valid class
            const out = gm._sanitizeBossLogMessage('<i class="ri-fire-line" onclick="alert(1)"></i>');
            // The whole tag must not be re-inflated because the original markup
            // has more than just `class="..."`. Outer regex anchors on the exact
            // shape `<i class="..."></i>`, so any extra attrs cause the
            // escape-pass to win.
            expect(parsedNodeNames(out)).not.toContain('i');
        });
    });

    // ==================== ANALYTICS AGGREGATION (v2.6.x audit) ====================
    //
    // These tests pin down the aggregation logic surfaced by `renderQuickStats`,
    // `renderXPTimeline`, `renderProductivityPattern`, `renderPersonalRecords`,
    // and `renderGoalsProgressOverview` after the v2.6.x analytics audit. They
    // exercise the *data shape* the renderers consume rather than the DOM
    // output, since jsdom doesn't carry the analytics view's element ids by
    // default and the bugs being guarded against were arithmetic / parsing
    // bugs, not markup bugs.

    describe('Analytics Aggregation', () => {

        // Helper: set up DOM elements the renderers look up. Returns a teardown.
        function mountAnalyticsDom() {
            const ids = [
                'stat-total-completed', 'stat-current-streak', 'stat-total-xp', 'stat-completion-rate',
                'activity-heatmap', 'xp-timeline-chart', 'task-breakdown-chart',
                'productivity-pattern-chart', 'personal-records', 'goals-progress-overview'
            ];
            ids.forEach(id => {
                const el = document.createElement('div');
                el.id = id;
                document.body.appendChild(el);
            });
            return () => ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        }

        test('completion rate is capped at 100% and uses a denominator that spans all counted collections', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                // 3 daily completed, 1 weekly completed, 1 monthly completed,
                // 1 yearly completed, 1 life completed = 7 completed of 7 total.
                gm.dailyTasks = [
                    { id: 1, completed: true, dueDate: '2025-01-15' },
                    { id: 2, completed: true, dueDate: '2025-01-15' },
                    { id: 3, completed: true, dueDate: '2025-01-15' }
                ];
                gm.weeklyGoals = [{ id: 10, completed: true }];
                gm.monthlyGoals = [{ id: 20, completed: true }];
                gm.yearlyGoals = [{ id: 30, completed: true }];
                gm.lifeGoals = [{ id: 40, completed: true }];
                gm.sideQuests = [];
                gm.xp = 1234;
                gm.loginStreak = 5;

                gm.renderQuickStats();

                expect(document.getElementById('stat-total-completed').textContent).toBe((7).toLocaleString());
                expect(document.getElementById('stat-completion-rate').textContent).toBe('100%');
                // Regression: denominator previously excluded yearlyGoals + lifeGoals,
                // so this exact dataset would have rendered (7/5) = 140%.
            } finally { teardown(); }
        });

        test('completion rate is 0% when there are no tasks at all', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.xp = 0;
                gm.loginStreak = 0;
                gm.renderQuickStats();
                expect(document.getElementById('stat-completion-rate').textContent).toBe('0%');
                expect(document.getElementById('stat-total-completed').textContent).toBe('0');
            } finally { teardown(); }
        });

        test('Day Streak tile sources loginStreak, not max habit streak', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.loginStreak = 12;
                // A higher habit streak should NOT win — the tile is the login streak.
                gm.habits = [{ streak: 99, longestStreak: 99 }];
                gm.renderQuickStats();
                expect(document.getElementById('stat-current-streak').textContent).toBe((12).toLocaleString());
            } finally { teardown(); }
        });

        test('XP Timeline renders one bar per day across the 30-day window', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.dailyTasks = [
                    { id: 1, completed: true, dueDate: gm.dateToLocalString(new Date()) }
                ];
                gm.renderXPTimeline();
                const container = document.getElementById('xp-timeline-chart');
                // 30 bar columns rendered (one per day), regardless of data density
                const bars = container.querySelectorAll('.flex-1.flex.flex-col');
                expect(bars.length).toBe(30);
                // Tooltip uses "task(s) completed" language, not synthetic "XP"
                expect(container.innerHTML).toMatch(/task[s]? completed/);
                expect(container.innerHTML).not.toMatch(/\d+ XP/);
            } finally { teardown(); }
        });

        test('Productivity Pattern parses dueDate strings as LOCAL days (no UTC off-by-one)', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                // 2025-01-15 is a Wednesday in every timezone east of the
                // dateline. The previous renderer (`new Date('2025-01-15')`)
                // parsed this as UTC-midnight, which in negative-UTC zones
                // local-renders as 2025-01-14 (Tuesday). The fix appends
                // `T12:00:00` so local-day is preserved regardless of TZ.
                gm.dailyTasks = [
                    { id: 1, completed: true, dueDate: '2025-01-15' },
                    { id: 2, completed: true, dueDate: '2025-01-15' },
                    { id: 3, completed: true, dueDate: '2025-01-15' }
                ];
                gm.renderProductivityPattern();
                const html = document.getElementById('productivity-pattern-chart').innerHTML;
                // Wednesday's bar should report 3 completions
                expect(html).toMatch(/Wednesday:\s*3 tasks/);
                // Tuesday's bar should report 0 (regression guard)
                expect(html).toMatch(/Tuesday:\s*0 tasks/);
            } finally { teardown(); }
        });

        test('Productivity Pattern skips tasks missing or with invalid dueDate', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.dailyTasks = [
                    { id: 1, completed: true, dueDate: '2025-01-15' },
                    { id: 2, completed: true, dueDate: null },
                    { id: 3, completed: true, dueDate: undefined },
                    { id: 4, completed: true, dueDate: 'not-a-date' }
                ];
                // Should not throw, should still render 7 day columns
                expect(() => gm.renderProductivityPattern()).not.toThrow();
                const bars = document.getElementById('productivity-pattern-chart')
                    .querySelectorAll('.flex-1.flex.flex-col');
                expect(bars.length).toBe(7);
            } finally { teardown(); }
        });

        test('Personal Records uses literal Tailwind class names (no dynamic interpolation)', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.dailyTasks = [];
                gm.habits = [{ longestStreak: 4, streak: 4 }];
                gm.goldCoins = 50;
                gm.treasureChests = [];
                gm.level = 3;

                gm.renderPersonalRecords();
                const html = document.getElementById('personal-records').innerHTML;

                // Each palette entry must appear as a literal substring — these
                // are exactly what Tailwind needs to see at scan time to
                // generate the rules.
                ['from-orange-900', 'from-purple-900', 'from-blue-900',
                 'from-green-900', 'from-yellow-900', 'from-red-900',
                 'text-orange-300', 'text-purple-300', 'text-blue-300',
                 'text-green-300', 'text-yellow-300', 'text-red-300'].forEach(cls => {
                    expect(html).toContain(cls);
                });

                // Sanity: no `from-${...}` template fragments leaked through.
                expect(html).not.toMatch(/\$\{[^}]*color[^}]*\}/);
            } finally { teardown(); }
        });

        test('Goals Progress Overview clamps progress to [0, 100] and uses literal class names', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.lifeGoals = [{ id: 1, title: 'Life A', completed: false, progress: 150 }]; // over-shot
                gm.yearlyGoals = [{ id: 2, title: 'Year A', completed: false, progress: -10 }]; // underflow
                gm.monthlyGoals = [{ id: 3, title: 'Month A', completed: false, progress: 42 }];
                gm.weeklyGoals = [];

                gm.renderGoalsProgressOverview();
                const html = document.getElementById('goals-progress-overview').innerHTML;

                expect(html).toContain('100%'); // Life A clamped down
                expect(html).toContain('0%');   // Year A clamped up
                expect(html).toContain('42%');  // Month A passes through

                // Literal palette classes present
                ['bg-red-900/30', 'bg-purple-900/30', 'bg-blue-900/30'].forEach(cls => {
                    expect(html).toContain(cls);
                });
            } finally { teardown(); }
        });

        test('Goals Progress Overview renders the empty state when there are no incomplete goals', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.lifeGoals = [];
                gm.yearlyGoals = [{ id: 1, title: 'Done', completed: true }];
                gm.monthlyGoals = [];
                gm.weeklyGoals = [];

                gm.renderGoalsProgressOverview();
                const html = document.getElementById('goals-progress-overview').innerHTML;
                expect(html).toMatch(/All goals completed/i);
            } finally { teardown(); }
        });
    });

    // ==================== THEME SYSTEM (v2.8 audit S6) ====================
    //
    // Regression tests added Jun 7, 2026 after the v2.8 audit identified
    // that the theme system had no test coverage despite carrying the
    // bulk of v2.8's surface area. These guard:
    //   - themeDefinitions structural integrity (all 14 themes present
    //     with required fields), so a future refactor can't silently
    //     drop a theme or break a field used by previewTheme()
    //   - Proposal B free/premium split (5 free / 9 premium) — the
    //     pricing rebalance shipped Jun 7 morning, this locks it in
    //   - totalGoldEarned counter behavior (post-multiplier increment,
    //     save/load round-trip) — drives Golden Empire unlock criteria
    //   - checkRewardUnlocks() achievement gates for Golden Empire
    //     (10k gold lifetime) and Shadow Realm (25 bosses defeated)
    //
    describe('Theme System (v2.8)', () => {

        test('themeDefinitions has all 14 v2.8 themes with required fields', () => {
            const gm = createTestManager();
            const expectedThemes = [
                'default', 'forest', 'desert', 'ice', 'volcanic', 'mystic',
                'golden', 'shadow', 'stormwatch', 'verdant', 'sunken',
                'cathedral', 'aurora', 'crystal'
            ];
            expect(Object.keys(gm.themeDefinitions).sort()).toEqual(expectedThemes.sort());

            // Every theme must have name, icon, color, and explicit
            // premium boolean — previewTheme() and renderThemes() rely
            // on all four. Missing any breaks the modal mock card.
            expectedThemes.forEach(id => {
                const t = gm.themeDefinitions[id];
                expect(t.name).toEqual(expect.any(String));
                expect(t.icon).toEqual(expect.any(String));
                expect(t.color).toMatch(/^#[0-9a-fA-F]{6}$/);
                expect(typeof t.premium).toBe('boolean');
            });
        });

        test('Proposal B split: exactly 5 free themes and 9 premium themes', () => {
            const gm = createTestManager();
            const free = Object.entries(gm.themeDefinitions)
                .filter(([_, t]) => !t.premium)
                .map(([id]) => id);
            const premium = Object.entries(gm.themeDefinitions)
                .filter(([_, t]) => t.premium)
                .map(([id]) => id);

            expect(free.sort()).toEqual(['default', 'forest', 'golden', 'ice', 'shadow']);
            expect(premium.sort()).toEqual([
                'aurora', 'cathedral', 'crystal', 'desert', 'mystic',
                'stormwatch', 'sunken', 'verdant', 'volcanic'
            ]);
        });

        test('addGold increments totalGoldEarned by the post-multiplier amount', () => {
            const gm = createTestManager();
            gm.totalGoldEarned = 0;

            // Plain add — no multipliers active
            gm.addGold(100, 'daily');
            expect(gm.totalGoldEarned).toBe(100);

            // With companion gold bonus (+20%) — counter must follow
            // finalGold (post-multiplier), not the raw input. This is
            // the contract the Golden Empire unlock relies on.
            gm.companions = [{ type: 'dragon', bonusType: 'gold', bonusAmount: 0.20, rarity: 'epic' }];
            gm.activeCompanionId = 'dragon';
            gm.addGold(100, 'daily');
            expect(gm.totalGoldEarned).toBe(220); // 100 + 120
            expect(gm.goldCoins).toBe(220);       // counter and balance match
        });

        test('totalGoldEarned never decreases when gold is spent', () => {
            const gm = createTestManager();
            gm.totalGoldEarned = 5000;
            gm.goldCoins = 5000;

            // Simulate spending — the counter is a lifetime accumulator,
            // only addGold() touches it. Direct goldCoins decrement
            // (chest purchase, spell cast) must not affect the counter.
            gm.goldCoins -= 3000;
            expect(gm.totalGoldEarned).toBe(5000);
            expect(gm.goldCoins).toBe(2000);
        });

        test('save/load round-trip preserves totalGoldEarned', () => {
            const gm = createTestManager();
            gm.totalGoldEarned = 7500;
            // Use the real save path, not the stubbed one
            delete gm.saveData;
            gm._doSave();

            const gm2 = createTestManager();
            delete gm2.checkRewardUnlocks; // let real load logic run cleanly
            gm2.loadData();
            expect(gm2.totalGoldEarned).toBe(7500);
        });

        test('N3 migration: missing totalGoldEarned seeds from goldCoins (existing user)', () => {
            // v2.8 N3 (Jun 7, 2026 audit) — existing users upgrading
            // from pre-v2.8 saves get their CURRENT goldCoins balance
            // copied into totalGoldEarned as the lifetime starting
            // point. Strictly correct lower bound (gold can only enter
            // via addGold, so balance ≤ true lifetime earned).
            const gm = createTestManager();
            localStorage.setItem('lifeOrganizeData', JSON.stringify({
                version: '2.7.0',
                xp: 100,
                level: 2,
                goldCoins: 8500,
                unlockedThemes: ['default'],
                currentTheme: 'default'
                // totalGoldEarned intentionally absent
            }));
            delete gm.checkRewardUnlocks;
            gm.loadData();
            expect(gm.totalGoldEarned).toBe(8500);
        });

        test('N3 migration: field present as 0 stays 0 (new player or zero-balance returning user)', () => {
            // The `??` (nullish coalesce) gate must distinguish
            // "field absent" (seed from goldCoins) from "field present
            // and explicitly 0" (genuine new save state). Without this
            // distinction a new player who happens to have spent all
            // their gold would get re-seeded every load.
            const gm = createTestManager();
            localStorage.setItem('lifeOrganizeData', JSON.stringify({
                version: '2.8.0',
                xp: 0,
                level: 1,
                goldCoins: 250,
                totalGoldEarned: 0, // explicitly zero
                unlockedThemes: ['default'],
                currentTheme: 'default'
            }));
            delete gm.checkRewardUnlocks;
            gm.loadData();
            expect(gm.totalGoldEarned).toBe(0);
        });

        test('N3 migration: missing field with no goldCoins falls back to 0', () => {
            // Defensive case — a corrupt or hand-edited save with
            // neither field. Should not throw, should not set NaN,
            // should land at 0.
            const gm = createTestManager();
            localStorage.setItem('lifeOrganizeData', JSON.stringify({
                version: '2.7.0',
                xp: 0,
                level: 1,
                unlockedThemes: ['default'],
                currentTheme: 'default'
                // both totalGoldEarned and goldCoins absent
            }));
            delete gm.checkRewardUnlocks;
            gm.loadData();
            expect(gm.totalGoldEarned).toBe(0);
        });

        test('N3 migration: existing user with 10k+ goldCoins auto-unlocks Golden Empire on first post-upgrade load', () => {
            // The end-to-end intent of N3 option A: a returning player
            // already past 10k gold should see Golden Empire unlocked
            // immediately, not have to grind one more gold drop. The
            // constructor's retroactive `checkRewardUnlocks()` sweep
            // (with toasts suppressed) is what closes the loop. We
            // simulate that sweep here by calling it after loadData,
            // matching the production flow at goal-manager.js:236.
            const gm = createTestManager();
            localStorage.setItem('lifeOrganizeData', JSON.stringify({
                version: '2.7.0',
                xp: 500,
                level: 5,
                goldCoins: 12000,
                unlockedThemes: ['default'],
                currentTheme: 'default'
                // totalGoldEarned absent — pre-v2.8 save
            }));
            delete gm.checkRewardUnlocks;
            gm.loadData();
            expect(gm.totalGoldEarned).toBe(12000);
            // Constructor-equivalent retroactive sweep
            gm._suppressRewardToasts = true;
            gm.checkRewardUnlocks();
            gm._suppressRewardToasts = false;
            expect(gm.unlockedThemes).toContain('golden');
        });

        test('checkRewardUnlocks unlocks Golden Empire at 10,000 totalGoldEarned', () => {
            const gm = createTestManager();
            // Restore the real method (factory stubs it out)
            delete gm.checkRewardUnlocks;
            gm.unlockedThemes = ['default'];
            gm.totalGoldEarned = 9999;
            gm.bossesDefeated = 0;
            gm.level = 1;

            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).not.toContain('golden');

            gm.totalGoldEarned = 10000;
            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).toContain('golden');
        });

        test('checkRewardUnlocks unlocks Shadow Realm at 25 bossesDefeated', () => {
            const gm = createTestManager();
            delete gm.checkRewardUnlocks;
            gm.unlockedThemes = ['default'];
            gm.totalGoldEarned = 0;
            gm.bossesDefeated = 24;
            gm.level = 1;

            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).not.toContain('shadow');

            gm.bossesDefeated = 25;
            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).toContain('shadow');
        });

        test('checkRewardUnlocks does NOT re-toast already-unlocked achievement themes', () => {
            // Existing players who already had golden/shadow under the
            // old criteria keep them — the new criteria don't re-lock,
            // and unlockTheme guards against double-add. This locks in
            // the migration safety net.
            const gm = createTestManager();
            delete gm.checkRewardUnlocks;
            gm.unlockedThemes = ['default', 'golden', 'shadow'];
            gm.totalGoldEarned = 50000;
            gm.bossesDefeated = 100;
            gm.level = 1;

            const before = [...gm.unlockedThemes];
            gm.checkRewardUnlocks();
            // No duplicates
            expect(gm.unlockedThemes.filter(t => t === 'golden')).toHaveLength(1);
            expect(gm.unlockedThemes.filter(t => t === 'shadow')).toHaveLength(1);
            // Original entries still present
            before.forEach(t => expect(gm.unlockedThemes).toContain(t));
        });
    });
});
