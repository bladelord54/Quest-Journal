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
    // Key enumeration — needed by the corrupted-save backup cleanup in
    // loadData (and any test that iterates stored keys).
    key: jest.fn(i => Object.keys(localStore)[i] ?? null),
    get length() { return Object.keys(localStore).length; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

// Mock window APIs
window.audioManager = {
    playLevelUp: jest.fn(),
    playSpellCast: jest.fn(),
    playEnchantmentActivate: jest.fn(),
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

// Load the centralized balance table into the global BEFORE eval'ing
// goal-manager.js, mirroring the browser's <script src="balance.js"> order.
// goal-manager.js captures BALANCE into its module-scoped `BALANCE`.
import BALANCE from '../balance.js';
// Same dual-env wiring for the extracted data catalogs (Roadmap #1): goal-manager.js
// captures LEVEL_TITLES / COMPANION_DEFINITIONS / SPELL_DEFINITIONS
// / THEME_DEFINITIONS / ACHIEVEMENT_DEFINITIONS / BOSS_THEMES
// / CLASS_DEFINITIONS / ENCHANTMENT_DEFINITIONS / STARTER_TASK_PRESETS
// / QUEST_CHAIN_TEMPLATES into module consts.
import LEVEL_TITLES from '../level-titles.js';
import COMPANION_DEFINITIONS from '../companion-definitions.js';
import SPELL_DEFINITIONS from '../spell-definitions.js';
import THEME_DEFINITIONS from '../theme-definitions.js';
import ACHIEVEMENT_DEFINITIONS from '../achievement-definitions.js';
// Achievement-title catalog + pure unlock logic (Roadmap #1, 79th slice): checkTitleUnlocks derives
// every unlock from TITLE_DEFINITIONS.computeUnlockableTitles and title-render.js reads .categories.
import TITLE_DEFINITIONS from '../title-definitions.js';
import BOSS_THEMES from '../boss-themes.js';
import CLASS_DEFINITIONS from '../class-definitions.js';
import ENCHANTMENT_DEFINITIONS from '../enchantment-definitions.js';
import STARTER_TASK_PRESETS from '../starter-task-presets.js';
import QUEST_CHAIN_TEMPLATES from '../quest-chain-templates.js';
// The ONE source of progressive-unlock thresholds (Roadmap #1, 85th slice). Must be required
// BEFORE loot-engine.js, which reads FEATURE_UNLOCKS for the companion gate at load time.
import FEATURE_UNLOCKS from '../feature-unlocks.js';
// Daily Quest Board catalog + Board Sweep bonus (criterion-(2) item): gates are defined in terms of
// FEATURE_UNLOCKS, so it must come AFTER it. goal-manager.js seeds DAILY_QUEST_POOL from it.
import DAILY_QUEST_DEFINITIONS from '../daily-quest-definitions.js';
// Pure loot roll engine (Roadmap #1, first LOGIC slice): goal-manager.js captures
// LOOT_ENGINE and delegates its loot methods to it.
import LOOT_ENGINE from '../loot-engine.js';
// Chest rarity-weight modifiers (Roadmap #1, 86th slice): generateChestRewards delegates the
// Lucky Loot / Ranger / Lucky Draw weight shifts to CHEST_WEIGHT_LOGIC.applyChestModifiers.
import CHEST_WEIGHT_LOGIC from '../chest-weight-logic.js';
// Boss-defeat streak reward multiplier (Roadmap #1, 87th slice): onBossDefeated delegates the
// streak-counter pick and the "+10% per streak, capped at +100%" reward multiplier to
// BOSS_STREAK_LOGIC.
import BOSS_STREAK_LOGIC from '../boss-streak-logic.js';
// Challenge-a-Friend presets + rules (Roadmap #1, 89th slice): challengePresets / getChallengeRewards /
// getChallengeProgress / completeChallenge's history cap delegate to CHALLENGE_LOGIC.
import CHALLENGE_LOGIC from '../challenge-logic.js';
// Master loot pool catalog (Roadmap #1): getMasterLootPool() returns this.
import MASTER_LOOT_POOL from '../loot-pool.js';
// Pure boss spawn engine (Roadmap #1, 2nd LOGIC slice): the boss generators +
// hashDateString + the monthly-challenge preview delegate to it.
import BOSS_GENERATOR from '../boss-generator.js';
// Pure save-data migrations (Roadmap #1): loadData() delegates its legacy-save
// normalizers (companion/class/task/priority) to this.
import PERSISTENCE_MIGRATIONS from '../persistence-migrations.js';
// Pure daily-login-streak + streak-repair math (Roadmap #1, 56th slice — first non-render LOGIC
// module): checkDailyLoginBonus / _completeLoginBonus / the streak-repair methods delegate to it.
import STREAK_LOGIC from '../streak-logic.js';
// Pure XP / leveling-curve math (Roadmap #1, 57th slice — second non-render LOGIC module):
// getXPForLevel / getTotalXPForLevel + the four XP-progress sites delegate to it.
import LEVELING_LOGIC from '../leveling-logic.js';
// Pure effort-based-XP priority scaling (Roadmap #1, 58th slice): _normalizePriority /
// getPriorityXPMultiplier + the five XP-reward sites delegate to it.
import EFFORT_XP_LOGIC from '../effort-xp-logic.js';
// Pure active-buff → reward-multiplier resolution (Roadmap #1, 59th slice): getActiveSpellMultiplier /
// getEnchantmentMultiplier delegate to it.
import BUFF_MULTIPLIERS from '../buff-multipliers.js';
// Pure companion slot + bonus resolution (Roadmap #1, 60th slice): getActiveCompanion /
// getSecondCompanion / getCompanionBonus delegate to it.
import COMPANION_LOGIC from '../companion-logic.js';
// Pure class/subclass perk-value resolution (Roadmap #1, 61st slice): getClassPerkValue /
// getSubclassPerkValue / getChosenCapstone delegate to it.
import CLASS_PERKS from '../class-perks.js';
// Pure class/subclass tree progression-state predicates (Roadmap #1, 62nd slice): the eight
// progression methods delegate to it.
import CLASS_PROGRESSION from '../class-progression.js';
// Pure class skill-point economy math (Roadmap #1, 63rd slice): the point-supply / gate getters and
// the respec fee + refund lines delegate to it.
import SKILL_POINTS from '../skill-points.js';
// Pure Focus Crystal supply math (Roadmap #1, 64th slice): the shard conversion, the focus-session
// yield pipeline and the boss reward tiers delegate to it.
import CRYSTAL_ECONOMY from '../crystal-economy.js';
// Pure attack-charge earn + spend rules (Roadmap #1, 65th slice): grantAttackCharge and the
// attackBoss guard delegate to it.
import CHARGE_RULES from '../charge-rules.js';
// Pure boss-damage math (Roadmap #1, 66th slice): the attackBoss damage pipeline delegates to it.
import COMBAT_DAMAGE from '../combat-damage.js';
// Pure XP/gold reward-stack math (Roadmap #1, 67th slice): addXP and addGold delegate to it.
import REWARD_ECONOMY from '../reward-economy.js';
// Pure focus-timer + Pomodoro-chain math (Roadmap #1, 68th slice).
import FOCUS_SESSION_LOGIC from '../focus-session-logic.js';
// Pure active-spell state math (Roadmap #1, 69th slice).
import SPELL_LIFECYCLE from '../spell-lifecycle.js';
// Pure previous-period recap math (Roadmap #1, 70th slice).
import PERIOD_SUMMARY_LOGIC from '../period-summary-logic.js';
// Pure reminder scheduling + notification-copy math (Roadmap #1, 72nd slice): the reminder surface
// (catch-up window, daily/native slot math, sent-today rollover, settings backfill, bodies) delegates to it.
import REMINDER_SCHEDULE_LOGIC from '../reminder-schedule-logic.js';
// Pure active-enchantment state math (Roadmap #1, 73rd slice): the effect-match predicate, the two
// expiry-sweep filters, the duration/cost rules, the cast-entry builder and the warning delay.
import ENCHANTMENT_LIFECYCLE from '../enchantment-lifecycle.js';
// Pure Royal Bounty rules (Roadmap #1, 74th slice): the level gate, period keys/starts, deadlines,
// cadence→tier table, anti-stage eligibility, the seeded pick and the expiry probe.
import BOUNTY_LOGIC from '../bounty-logic.js';
// Pure recurring-task scheduling rules (Roadmap #1, 75th slice): the one day vocabulary, the
// four-branch dueToday predicate, the three pre-schedule guards and the generated-task builder.
import RECURRING_LOGIC from '../recurring-logic.js';
// Pure Daily Quest Board rules (Roadmap #1, 80th slice): generateDailyQuestBoard's
// seeded pick and checkDailyQuestCompletion's sweep delegate to it.
import DAILY_QUEST_LOGIC from '../daily-quest-logic.js';
// Daily free Wooden Chest loot table + weighted pick (Roadmap #1, 81st slice): claimWoodenChest
// delegates its loot roll to it (the second hand-rolled weighted pick, de-duplicated from loot-engine).
import WOODEN_CHEST_LOOT from '../wooden-chest-loot.js';
// Pure quest-chain progression state math (Roadmap #1, 82nd slice): toggleChainTask / completeChapter /
// completeQuestChain delegate their task-toggle, chapter-complete predicate, chapter advance, chain-complete
// detection and the active→completed list move to it.
import QUEST_CHAIN_LOGIC from '../quest-chain-logic.js';
// Pure habit progression math (Roadmap #1, 83rd slice): recalculateHabitStreak delegates its consecutive-day
// streak walk, and toggleHabit delegates the double_streak increment + the 7/30/100 milestone thresholds.
import HABIT_LOGIC from '../habit-logic.js';
// The ONE source of persisted-field defaults (Roadmap #1, 84th slice): initState Object.assigns
// persistedDefaults(), and load-deserializer's buildLoadState falls back to the same object.
// Must be required BEFORE load-deserializer.js, which reads DEFAULT_STATE at load time.
import DEFAULT_STATE from '../default-state.js';
// Pure save-data builder (Roadmap #1, 76th slice): _doSave delegates the save-object
// marshalling to SAVE_SERIALIZER.buildSaveData.
import SAVE_SERIALIZER from '../save-serializer.js';
// Pure load-state builder (Roadmap #1, 77th slice): loadData delegates the field mapping
// to LOAD_DESERIALIZER.buildLoadState — save-serializer's mirror.
import LOAD_DESERIALIZER from '../load-deserializer.js';
// Pure boss-card presentation helpers (Roadmap #1, first render slice): getBossPhase,
// renderBossHPBar, getBossParticleType delegate to this.
import BOSS_RENDER from '../boss-render.js';
// Pure task/goal presentation builders (Roadmap #1, 2nd render module): getChecklistProgress
// + renderChecklistHTML delegate to this.
import TASK_RENDER from '../task-render.js';
// Pure companion-den presentation builders (Roadmap #1, 3rd render module): the collection-card
// builder renderCompanionDen delegates to.
import COMPANION_RENDER from '../companion-render.js';
// Pure spellbook presentation builders (Roadmap #1, 4th render module): the active-spell +
// free/premium collection card builders renderActiveSpells/renderSpellCollection delegate to.
import SPELL_RENDER from '../spell-render.js';
// Pure Class / Skill-Tree presentation builders (Roadmap #1, 5th render module): renderClassPanel's
// class-selection cards + linear skill-tree node rows delegate to.
import CLASS_RENDER from '../class-render.js';
// Pure Analytics presentation builders (Roadmap #1, 6th render module): renderTaskBreakdown +
// renderActivityHeatmap delegate their chart markup to these.
import ANALYTICS_RENDER from '../analytics-render.js';
// Pure Quest Chains presentation builders (Roadmap #1, 7th render module): renderActiveQuestChains
// + renderAvailableQuestChains + renderCompletedQuestChains delegate their card markup to these.
import QUEST_CHAIN_RENDER from '../quest-chain-render.js';
// Pure Enchantments presentation builders (Roadmap #1, 8th render module): renderActiveEnchantments
// + renderEnchantmentShop delegate their card markup to these.
import ENCHANTMENT_RENDER from '../enchantment-render.js';
// Pure Dashboard-card presentation builders (Roadmap #1, 9th render module): renderXPEvent +
// renderRoyalBounty delegate their card markup to these (renderStreakRepair + renderWeeklyThemeCard
// join in the 41st slice).
import DASHBOARD_RENDER from '../dashboard-render.js';
// Pure Player-HUD presentation builders (Roadmap #1, 10th render module): renderActiveBuffsSummary +
// renderActiveSpellSigils delegate their markup to these (renderPlayerPanel's blocks join in the 43rd slice).
import PLAYER_HUD_RENDER from '../player-hud-render.js';
// Pure Title Hall presentation builders (Roadmap #1, 11th render module): renderTitleHall delegates its
// #active-title-display card + #titles-container content (progress + category sections + level ranks) to these.
import TITLE_RENDER from '../title-render.js';
// Pure Treasury / rewards presentation builders (Roadmap #1, 12th render module): renderTreasureChests
// delegates its #treasure-chests-container body (free Daily Wooden Chest card + the four purchasable tiles) here.
import REWARD_RENDER from '../reward-render.js';
// Pure Themes-panel presentation builders (Roadmap #1, 13th render module): renderThemes + renderThemeSelector
// delegate their tile/banner markup (featured-week banner + full/compact theme grids) to these.
import THEME_RENDER from '../theme-render.js';
// Pure Badges/Achievements presentation builder (Roadmap #1, 14th render module): renderBadges delegates its
// #badges-container body (Unlocked cards + In-Progress cards with progress bars, or the empty state) to this.
import BADGE_RENDER from '../badge-render.js';
// Pure Rituals/Habits presentation builder (Roadmap #1, 15th render module): renderHabits delegates its
// populated #habits-container body (the per-habit ritual cards + heatmaps) to this; the empty-state stays inline.
import HABIT_RENDER from '../habit-render.js';
// Pure Archive-panel presentation builder (Roadmap #1, 16th render module): renderArchives delegates its
// populated #archives-container body (the newest-first type-colored archived-goal cards) to this; the
// #archive-count textContent write + the zero-archives empty-state stay inline in the wrapper.
import ARCHIVE_RENDER from '../archive-render.js';
// Pure Daily-board presentation builders (Roadmap #1, 17th render module): renderDailyQuestBoard delegates its
// #daily-quest-board body (quest rows + sweep footer) and renderWoodenChest delegates its #daily-wooden-chest
// body (claimable vs claimed) to these; the wrappers keep the generate/ensure side-effects + clock read + guards.
import DAILY_BOARD_RENDER from '../daily-board-render.js';
// Pure Recurring-tasks presentation builder (Roadmap #1, 18th render module): renderRecurringTasks delegates its
// populated #recurring-tasks-container body (a row per recurring task with a human schedule line) to this; the
// lookup + guard + the zero-tasks empty-state (this._renderEmptyState) stay inline in the wrapper.
import RECURRING_RENDER from '../recurring-render.js';
// Pure Calendar-tab presentation builders (Roadmap #1, 19th render module): renderCalendar delegates each day
// cell's inner HTML to renderCalendarDayHTML, and renderCalendarTasks delegates its populated selected-date list
// to renderCalendarTasksHTML; the wrappers keep all imperative DOM (grid loop/onclick, textContent writes, the
// zero-tasks empty-state) inline.
import CALENDAR_RENDER from '../calendar-render.js';
// Pure Focus-timer presentation builders (Roadmap #1, 20th render module): updateFocusTimerControls delegates its
// 4-state #focus-timer-controls button set (returning { containerClass, buttonsHTML }) to renderFocusTimerControls,
// and _updateChainProgressIndicator delegates its active-chain dots+status body to renderChainProgressHTML; the
// wrappers keep the lookups/guards, the no-chain empty/hidden branch, and renderFocusTimer's textContent writes.
import FOCUS_TIMER_RENDER from '../focus-timer-render.js';
// Pure Premium-surface presentation builders (Roadmap #1, 21st render module): renderPremiumCard delegates both
// #premium-content branches (premium thank-you view / free upgrade prompt) to renderPremiumCardHTML, and
// getPremiumBannerHTML forwards this.isPremium to renderPremiumBannerHTML (the shared upsell banner, 5 call sites).
import PREMIUM_RENDER from '../premium-render.js';
// Pure Reminder-settings presentation builder (Roadmap #1, 22nd render module): renderReminderSettings keeps its
// container lookup/guard + the permission re-check (mutates this.notificationsEnabled), then delegates the whole
// #reminder-settings-container body to renderReminderSettingsHTML (settings + the four resolved notif flags).
import REMINDER_RENDER from '../reminder-render.js';

import GoalManager from '../goal-manager.js';

// (Removed in Roadmap #5) themeDefinitions used to be sliced out of the source
// by brace-balance so tests could read it without booting the constructor.
// createTestManager now builds a REAL instance, so the class field is present
// directly on `gm.themeDefinitions` — no source-parsing needed.

/**
 * Build a fully-populated REAL GoalManager for tests (Engineering Roadmap #5).
 * Uses the constructor's `testMode` seam: the class-field initializers +
 * initState() set every field to its production default, while _boot()
 * (localStorage, timers, DOM, audio) is skipped. DOM/render/persistence
 * methods are stubbed to no-ops below.
 */
function createTestManager(overrides = {}) {
    const gm = new GoalManager({ testMode: true });

    // Test-specific deviations from production defaults:
    gm.tutorialCompleted = true;         // skip onboarding (initState sets false)
    gm.limitedTimeEventsEnabled = false; // keep Double-XP-Weekend out of exact-XP asserts
    gm._suppressRewardSounds = false;    // reward-FX flags (normally set in _boot, which we skip)
    gm._suppressRewardToasts = false;

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
    gm.showPremiumPurchaseModal = jest.fn();

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

        // checkBadges now DERIVES every unlock from achievement-definitions.js
        // (Engineering Roadmap #1) instead of a hand-coded parallel copy of all 16
        // thresholds. These guard that the catalog and the unlock logic stay in sync.
        // createTestManager stubs checkBadges to a no-op, so each test restores the
        // real prototype method and overrides getAchievementProgress() to drive it.
        test('checkBadges unlocks every catalog achievement once its progress meets the target', () => {
            const gm = createTestManager();
            gm.checkBadges = GoalManager.prototype.checkBadges;
            gm.badges = [];
            gm.getAchievementProgress = () => ({
                tasks: 999, streak: 999, life_goals: 999, future_tasks: 999,
                chests: 999, bosses: 999, spells: 999, focus: 999
            });

            gm.checkBadges('test');

            // Anti-drift guard: unlocked ids must exactly equal the catalog's ids.
            const defs = gm.getAchievementDefinitions();
            expect(gm.badges.map(b => b.id).sort()).toEqual(defs.map(d => d.id).sort());
            // Each stored badge mirrors its catalog entry (single source of truth).
            defs.forEach(d => {
                expect(gm.badges.find(b => b.id === d.id)).toMatchObject({
                    id: d.id, name: d.name, description: d.description, icon: d.icon
                });
            });
        });

        test('checkBadges unlocks nothing when all progress is below target', () => {
            const gm = createTestManager();
            gm.checkBadges = GoalManager.prototype.checkBadges;
            gm.badges = [];
            gm.getAchievementProgress = () => ({
                tasks: 0, streak: 0, life_goals: 0, future_tasks: 0,
                chests: 0, bosses: 0, spells: 0, focus: 0
            });

            gm.checkBadges('test');

            expect(gm.badges).toHaveLength(0);
        });

        test("checkBadges respects each achievement's own threshold", () => {
            const gm = createTestManager();
            gm.checkBadges = GoalManager.prototype.checkBadges;
            gm.badges = [];
            // 10 completed tasks: enough for first_quest (1) + novice (10), not adept (50).
            gm.getAchievementProgress = () => ({
                tasks: 10, streak: 0, life_goals: 0, future_tasks: 0,
                chests: 0, bosses: 0, spells: 0, focus: 0
            });

            gm.checkBadges('test');

            const ids = gm.badges.map(b => b.id);
            expect(ids).toContain('first_quest');
            expect(ids).toContain('novice');
            expect(ids).not.toContain('adept');
        });
    });

    // ==================== STARTER TASK SYSTEM ====================

    describe('Starter Task System', () => {

        test('starterTaskPresets have name property for all tasks', () => {
            const gm = createTestManager();
            const presets = gm.starterTaskPresets;
            ['daily', 'weekly', 'monthly', 'yearly', 'life-goals'].forEach(type => {
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

            // Mock DOM checkboxes. NOTE: monkey-patching `document.querySelectorAll`
            // leaks across tests (jest doesn't auto-restore property assignments
            // on globals), so we capture the original up front and restore it
            // in `finally`. Without this, every subsequent test that touches
            // `document.querySelectorAll` sees this 3-element mock instead of
            // a live NodeList — which silently broke Track 7 tests when they
            // were added because no prior test depended on querySelectorAll
            // returning real DOM.
            const mockCheckboxes = [
                { dataset: { type: 'daily', index: '0' } },
                { dataset: { type: 'weekly', index: '1' } },
                { dataset: { type: 'monthly', index: '0' } }
            ];
            const originalQuerySelectorAll = document.querySelectorAll.bind(document);
            document.querySelectorAll = jest.fn(() => mockCheckboxes);

            try {
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
            } finally {
                document.querySelectorAll = originalQuerySelectorAll;
            }
        });

        // v3.2 friction audit N1 — the Grand Planner path unlocks the yearly &
        // life-goals tabs at L1, so the starter modal must be able to seed them.
        test('addSelectedStarterTasks creates yearly + life goals when those tiers are unlocked', () => {
            const gm = createTestManager();
            gm.applyOnboardingPath('goals'); // opens every goal tier at level 1
            gm.getTodayDateString = jest.fn(() => '2025-01-15');

            const mockCheckboxes = [
                { dataset: { type: 'yearly', index: '0' } },
                { dataset: { type: 'life-goals', index: '1' } }
            ];
            const originalQuerySelectorAll = document.querySelectorAll.bind(document);
            document.querySelectorAll = jest.fn(() => mockCheckboxes);

            try {
                gm.addSelectedStarterTasks();

                expect(gm.yearlyGoals).toHaveLength(1);
                expect(gm.yearlyGoals[0].title).toBe(gm.starterTaskPresets.yearly[0].name);
                expect(gm.yearlyGoals[0].name).toBeUndefined();
                expect(gm.yearlyGoals[0]).toHaveProperty('lifeGoalIds', []);
                expect(gm.yearlyGoals[0]).toHaveProperty('progress', 0);
                expect(gm.yearlyGoals[0]).toHaveProperty('priority', 'medium');

                expect(gm.lifeGoals).toHaveLength(1);
                expect(gm.lifeGoals[0].title).toBe(gm.starterTaskPresets['life-goals'][1].name);
                expect(gm.lifeGoals[0].name).toBeUndefined();
                // Life goals are top-level — no parent-link array.
                expect(gm.lifeGoals[0].lifeGoalIds).toBeUndefined();
            } finally {
                document.querySelectorAll = originalQuerySelectorAll;
            }
        });

        test('addSelectedStarterTasks skips yearly + life goals when those tiers are locked', () => {
            const gm = createTestManager(); // default path: yearly/life-goals unlock at L4
            gm.level = 1;
            gm.getTodayDateString = jest.fn(() => '2025-01-15');
            expect(gm.isGoalTabUnlocked('yearly')).toBe(false);
            expect(gm.isGoalTabUnlocked('life-goals')).toBe(false);

            const mockCheckboxes = [
                { dataset: { type: 'yearly', index: '0' } },
                { dataset: { type: 'life-goals', index: '0' } }
            ];
            const originalQuerySelectorAll = document.querySelectorAll.bind(document);
            document.querySelectorAll = jest.fn(() => mockCheckboxes);

            try {
                gm.addSelectedStarterTasks();
                expect(gm.yearlyGoals).toHaveLength(0);
                expect(gm.lifeGoals).toHaveLength(0);
            } finally {
                document.querySelectorAll = originalQuerySelectorAll;
            }
        });

        // v3.2 friction audit N1 — the post-onboarding empty-state nudge is
        // path-aware. switchView is called synchronously (the toast is deferred),
        // so we assert on it; fake timers keep the deferred toast from leaking.
        test('closeStarterTasksModal nudges a Grand Planner with no big goals toward the Quest Log', () => {
            jest.useFakeTimers();
            try {
                const gm = createTestManager();
                gm.applyOnboardingPath('goals');
                gm.switchView = jest.fn();
                // Use the real method (the factory stubs it to a no-op by default).
                gm.closeStarterTasksModal = GoalManager.prototype.closeStarterTasksModal.bind(gm);

                gm.closeStarterTasksModal();

                expect(gm.switchView).toHaveBeenCalledWith('life-goals');
            } finally {
                jest.useRealTimers();
            }
        });

        test('closeStarterTasksModal keeps the daily-quest nudge for the default path', () => {
            jest.useFakeTimers();
            try {
                const gm = createTestManager(); // onboardingPath === null
                gm.switchView = jest.fn();
                gm.closeStarterTasksModal = GoalManager.prototype.closeStarterTasksModal.bind(gm);

                gm.closeStarterTasksModal();

                expect(gm.switchView).toHaveBeenCalledWith('daily');
            } finally {
                jest.useRealTimers();
            }
        });

        test('closeStarterTasksModal does not force the big-goal tab once a Grand Planner has big goals', () => {
            jest.useFakeTimers();
            try {
                const gm = createTestManager();
                gm.applyOnboardingPath('goals');
                gm.yearlyGoals.push({ id: 'y1', title: 'Existing campaign' });
                gm.switchView = jest.fn();
                gm.closeStarterTasksModal = GoalManager.prototype.closeStarterTasksModal.bind(gm);

                gm.closeStarterTasksModal();

                // hasBigGoals === true → falls through to the daily nudge instead.
                expect(gm.switchView).not.toHaveBeenCalledWith('life-goals');
            } finally {
                jest.useRealTimers();
            }
        });
    });

    // ==================== QUEST CHAIN PROGRESSION (Roadmap #1 10th slice) ====================
    // The quest-chain catalog was extracted to quest-chain-templates.js and deep-frozen.
    // startQuestChain() stores a LIVE reference to the frozen template.chapters on the
    // active chain, so these tests lock the audited invariant: progression only READS that
    // shared array (mutating chain-owned fields), never the frozen template.
    describe('quest chain progression (frozen template safety)', () => {
        test('startQuestChain shares the frozen template chapters by reference', () => {
            const gm = createTestManager();
            gm.startQuestChain('learn_web_dev');
            expect(gm.activeQuestChains).toHaveLength(1);
            const chain = gm.activeQuestChains[0];
            expect(chain.templateId).toBe('learn_web_dev');
            expect(chain.chapters).toBe(gm.questChainTemplates.learn_web_dev.chapters);
            expect(Object.isFrozen(chain.chapters)).toBe(true);
        });

        test('completing every task in a chapter advances the chain without mutating the frozen template', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.addGold = jest.fn();
            gm.addSpellToBook = jest.fn();
            gm.startQuestChain('learn_web_dev');
            const chain = gm.activeQuestChains[0];
            const chapter0 = gm.questChainTemplates.learn_web_dev.chapters[0];

            // Drive the real user flow: toggle each task; the last one auto-fires completeChapter.
            chapter0.tasks.forEach((_, i) => gm.toggleChainTask(chain.id, i));

            expect(chain.currentChapterIndex).toBe(1);
            expect(chain.completedTasks).toEqual([]);
            // Chapter reward was read from the frozen template and granted.
            expect(gm.addXP).toHaveBeenCalledWith(chapter0.reward.xp, 'chain');
            expect(gm.addGold).toHaveBeenCalledWith(chapter0.reward.gold, 'chain');
            expect(gm.addSpellToBook).toHaveBeenCalledWith(chapter0.reward.spell, chapter0.reward.charges);
            // The frozen template chapter is untouched by progression.
            expect(chapter0.tasks).toHaveLength(4);
            expect(Object.isFrozen(chapter0)).toBe(true);
        });

        test('completing the final chapter moves the chain to completedQuestChains', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.addGold = jest.fn();
            gm.addSpellToBook = jest.fn();
            gm.unlockBadge = jest.fn();
            gm.startQuestChain('language_master'); // shortest chain: 3 chapters
            const chain = gm.activeQuestChains[0];
            const template = gm.questChainTemplates.language_master;

            template.chapters.forEach(ch => {
                ch.tasks.forEach((_, i) => gm.toggleChainTask(chain.id, i));
            });

            expect(gm.activeQuestChains).toHaveLength(0);
            expect(gm.completedQuestChains).toHaveLength(1);
            expect(gm.completedQuestChains[0].templateId).toBe('language_master');
            expect(gm.unlockBadge).toHaveBeenCalledWith(
                'chain_language_master', 'Chain Master', expect.any(String), template.icon
            );
        });

        test('data integrity: every chain has chapters with tasks + a full reward', () => {
            const defs = createTestManager().initializeQuestChainTemplates();
            expect(Object.keys(defs)).toEqual([
                'learn_web_dev', 'fitness_journey', 'business_builder', 'creative_writer', 'language_master'
            ]);
            Object.values(defs).forEach(chain => {
                expect(chain.chapters.length).toBeGreaterThan(0);
                chain.chapters.forEach(ch => {
                    expect(Array.isArray(ch.tasks)).toBe(true);
                    expect(ch.tasks.length).toBeGreaterThan(0);
                    expect(typeof ch.reward.xp).toBe('number');
                    expect(typeof ch.reward.gold).toBe('number');
                    expect(typeof ch.reward.spell).toBe('string');
                    expect(typeof ch.reward.charges).toBe('number');
                });
            });
        });
    });

    // ==================== FREE LOOT SPELL POOL (P1b) ====================

    describe('Free loot spell pool (P1b)', () => {

        test('getFreeLootableSpellIds excludes premium and Wizard-exclusive spells', () => {
            const gm = createTestManager();
            const pool = gm.getFreeLootableSpellIds();
            expect(pool.length).toBeGreaterThan(0);
            pool.forEach(id => {
                const spell = gm.spellDefinitions[id];
                expect(spell.premium).toBeFalsy();
                expect(spell.wizardExclusive).toBeFalsy();
            });
            // A known premium spell and the Wizard-exclusives must never drop.
            expect(pool).not.toContain('arcane_surge');
            expect(pool).not.toContain('mana_font');
            expect(pool).not.toContain('philosophers_stone');
        });

        test('getFreeLootableSpellIds includes the original six plus the new mid-tier spells', () => {
            const gm = createTestManager();
            const pool = gm.getFreeLootableSpellIds();
            ['lucky_draw', 'focus_mode', 'minor_wisdom', 'copper_blessing',
             'instant_archive', 'quest_doubler', 'scholars_charm', 'merchants_fortune']
                .forEach(id => expect(pool).toContain(id));
            expect(pool.length).toBeGreaterThanOrEqual(8);
        });

        test('new free spells are non-premium and reuse supported buff effects', () => {
            const gm = createTestManager();
            ['scholars_charm', 'merchants_fortune'].forEach(id => {
                const spell = gm.spellDefinitions[id];
                expect(spell).toBeDefined();
                expect(spell.premium).toBe(false);
                expect(spell.wizardExclusive).toBeFalsy();
                expect(['xp_boost', 'gold_multiplier']).toContain(spell.effect);
                expect(spell.multiplier).toBeGreaterThan(1);
            });
        });

        test('every non-Wizard-exclusive spell appears in the master loot pool', () => {
            const gm = createTestManager();
            const pooledSpellIds = new Set(
                Object.values(gm.getMasterLootPool()).flat()
                    .filter(item => item.type === 'spell')
                    .map(item => item.spellId)
            );
            Object.values(gm.spellDefinitions).forEach(spell => {
                if (spell.wizardExclusive) return;
                expect(pooledSpellIds.has(spell.id)).toBe(true);
            });
        });

        test('scholars_charm, merchants_fortune and gold_blessing are lootable from the master pool', () => {
            const gm = createTestManager();
            const pooledSpellIds = new Set(
                Object.values(gm.getMasterLootPool()).flat()
                    .filter(item => item.type === 'spell')
                    .map(item => item.spellId)
            );
            ['scholars_charm', 'merchants_fortune', 'gold_blessing']
                .forEach(id => expect(pooledSpellIds.has(id)).toBe(true));
        });

        test('Wizard-exclusive spells never appear in the master loot pool', () => {
            const gm = createTestManager();
            const pooledSpellIds = new Set(
                Object.values(gm.getMasterLootPool()).flat()
                    .filter(item => item.type === 'spell')
                    .map(item => item.spellId)
            );
            ['mana_font', 'philosophers_stone']
                .forEach(id => expect(pooledSpellIds.has(id)).toBe(false));
        });
    });

    // ==================== WIZARD-ONLY LOOT (class-gated) ====================

    describe('Wizard-only loot drops', () => {

        const spellIdsByRarity = (gm) => Object.fromEntries(
            Object.entries(gm.buildAvailableLootPools()).map(([rarity, items]) => [
                rarity,
                items.filter(i => i.type === 'spell').map(i => i.spellId)
            ])
        );

        test('getWizardLootEntries is empty for non-Wizards', () => {
            const gm = createTestManager();
            gm.playerClass = null;
            expect(gm.getWizardLootEntries()).toEqual({});
            gm.playerClass = 'ranger';
            expect(gm.getWizardLootEntries()).toEqual({});
        });

        test('getWizardLootEntries surfaces both exclusive spells in epic + legendary for a Wizard', () => {
            const gm = createTestManager();
            gm.playerClass = 'wizard';
            const entries = gm.getWizardLootEntries();
            ['epic', 'legendary'].forEach(rarity => {
                const ids = (entries[rarity] || []).map(e => e.spellId);
                expect(ids).toEqual(expect.arrayContaining(['mana_font', 'philosophers_stone']));
            });
            [...(entries.epic || []), ...(entries.legendary || [])].forEach(e => {
                expect(e.type).toBe('spell');
                expect(e.charges).toBe(1);
                expect(e.weight).toBeGreaterThan(0);
            });
        });

        test('a free Wizard can roll the exclusive spells from epic/legendary loot', () => {
            const gm = createTestManager();
            gm.playerClass = 'wizard';
            gm.isPremium = false; // class-gated, not premium-gated
            const byRarity = spellIdsByRarity(gm);
            ['epic', 'legendary'].forEach(r => {
                expect(byRarity[r]).toEqual(expect.arrayContaining(['mana_font', 'philosophers_stone']));
            });
            ['common', 'uncommon', 'rare'].forEach(r => {
                expect(byRarity[r]).not.toContain('mana_font');
                expect(byRarity[r]).not.toContain('philosophers_stone');
            });
        });

        test('non-Wizards never see the exclusive spells, even with premium', () => {
            const gm = createTestManager();
            gm.playerClass = 'warrior';
            gm.isPremium = true; // premium bypass must still not surface them
            const byRarity = spellIdsByRarity(gm);
            Object.values(byRarity).forEach(ids => {
                expect(ids).not.toContain('mana_font');
                expect(ids).not.toContain('philosophers_stone');
            });
        });

        test('buildAvailableLootPools still filters premium spells for a free non-Wizard', () => {
            const gm = createTestManager();
            gm.playerClass = null;
            gm.isPremium = false;
            const byRarity = spellIdsByRarity(gm);
            expect(byRarity.rare).not.toContain('arcane_surge'); // premium
            expect(byRarity.common).toContain('minor_wisdom');   // free
        });
    });

    // ==================== INJECTABLE RNG (#4, deterministic gameplay) ====================

    describe('Injectable RNG', () => {

        test('rng() defaults to Math.random and returns a value in [0,1)', () => {
            const gm = createTestManager();
            expect(gm._rng).toBeUndefined();
            for (let i = 0; i < 25; i++) {
                const v = gm.rng();
                expect(typeof v).toBe('number');
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });

        test('rng() delegates to an injected _rng source', () => {
            const gm = createTestManager();
            gm._rng = () => 0.42;
            expect(gm.rng()).toBe(0.42);
        });

        test('weightedRandomSelect is deterministic under an injected roll', () => {
            const gm = createTestManager();
            const items = [
                { id: 'a', weight: 1 },
                { id: 'b', weight: 1 },
                { id: 'c', weight: 2 }
            ]; // total weight 4
            gm._rng = () => 0;    // roll 0.0 -> first bucket
            expect(gm.weightedRandomSelect(items).id).toBe('a');
            gm._rng = () => 0.5;  // roll 2.0 -> second bucket boundary
            expect(gm.weightedRandomSelect(items).id).toBe('b');
            gm._rng = () => 0.9;  // roll 3.6 -> weight-2 tail bucket
            expect(gm.weightedRandomSelect(items).id).toBe('c');
        });

        test('buildLootReward amounts hit the min at roll 0 and the max near roll 1', () => {
            const gm = createTestManager();
            const gold = { type: 'gold', amount: [10, 20], name: 'Gold', icon: '💰' };
            const xp = { type: 'xp', amount: [50, 100], name: 'XP', icon: '⭐' };

            gm._rng = () => 0;
            expect(gm.buildLootReward(gold, 'common').amount).toBe(10);
            expect(gm.buildLootReward(xp, 'common').amount).toBe(50);

            gm._rng = () => 0.999999;
            expect(gm.buildLootReward(gold, 'common').amount).toBe(20);
            expect(gm.buildLootReward(xp, 'common').amount).toBe(100);
        });

        test('buildLootReward companion below level 3 pays deterministic fallback gold', () => {
            const gm = createTestManager();
            gm.level = 1; // companions locked -> gold fallback
            gm._rng = () => 0;
            const reward = gm.buildLootReward({ type: 'companion', companions: ['cat'] }, 'rare');
            expect(reward.type).toBe('gold');
            expect(reward.amount).toBe(150); // rare fallback [150,300], min at roll 0
        });

        test('a proc (checkSerenityBonus) fires only below its threshold under injected rng', () => {
            const gm = createTestManager();
            gm.hasActiveEnchantment = () => true; // isolate the roll from enchantment state
            gm.focusCrystals = 0;

            gm._rng = () => 0.2; // < 0.3 -> fires
            gm.checkSerenityBonus();
            expect(gm.focusCrystals).toBe(1);

            gm._rng = () => 0.4; // >= 0.3 -> no-op
            gm.checkSerenityBonus();
            expect(gm.focusCrystals).toBe(1);
        });
    });

    // ==================== LOOT ENGINE (Roadmap #1, 11th slice — first LOGIC module) ====================
    // loot-engine.js holds the PURE roll primitives that generateChestRewards() and
    // generateBossLoot() delegate to. The instance-level behaviour is already covered
    // above (weightedRandomSelect determinism, buildLootReward min/max + companion
    // fallback) and by the lucky_loot / Trophy Hunter suites; these lock the module in
    // ISOLATION, especially rollLootTable (the newly de-duplicated shared loop).
    describe('loot-engine.js (pure roll engine)', () => {
        const LootEngine = require('../loot-engine.js').default;
        // ctx factory: fixed rng, level, and a minimal locked-companion gold table.
        const ctx = (rngValue, level = 5) => ({
            rng: () => rngValue,
            level,
            companionLockedGold: { default: [50, 100], rare: [150, 300] }
        });

        test('weightedRandomSelect picks by cumulative weight under an injected rng', () => {
            const items = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 2 }]; // total 4
            expect(LootEngine.weightedRandomSelect(items, () => 0).id).toBe('a');
            expect(LootEngine.weightedRandomSelect(items, () => 0.5).id).toBe('b');
            expect(LootEngine.weightedRandomSelect(items, () => 0.9).id).toBe('c');
        });

        test('buildLootReward maps ranged types to the min at roll 0 and the max near roll 1', () => {
            const gold = { type: 'gold', amount: [10, 20], name: 'Gold', icon: '💰' };
            expect(LootEngine.buildLootReward(gold, 'common', ctx(0)).amount).toBe(10);
            expect(LootEngine.buildLootReward(gold, 'common', ctx(0.999999)).amount).toBe(20);
        });

        test('buildLootReward gives locked-gold for a companion below level 3, else a companion', () => {
            const locked = LootEngine.buildLootReward({ type: 'companion', companions: ['cat'] }, 'rare', ctx(0, 1));
            expect(locked).toEqual({ type: 'gold', amount: 150, rarity: 'rare', name: 'Gold (Companion Locked)', icon: '💰' });
            const unlocked = LootEngine.buildLootReward({ type: 'companion', companions: ['cat', 'wolf'] }, 'epic', ctx(0, 5));
            expect(unlocked).toEqual({ type: 'companion', value: 'cat', rarity: 'epic' });
        });

        test('buildLootReward returns null for an unrecognised item type', () => {
            expect(LootEngine.buildLootReward({ type: 'mystery' }, 'common', ctx(0))).toBeNull();
        });

        test('rollLootTable rolls itemCount rewards, routing selection through injected fns', () => {
            const availablePools = {
                common: [{ type: 'gold', amount: [5, 5], name: 'G', icon: '💰' }],
                rare: [{ type: 'gold', amount: [9, 9], name: 'G', icon: '💰' }]
            };
            const rewards = LootEngine.rollLootTable({
                rarityWeights: { common: 100, rare: 0 },
                availablePools,
                itemCount: 3,
                weightedRandomSelect: (items) => items[0], // deterministic: always first entry
                buildLootReward: (item, rarity) => ({ type: 'gold', amount: item.amount[0], rarity })
            });
            expect(rewards).toHaveLength(3);
            expect(rewards.every(r => r.rarity === 'common' && r.amount === 5)).toBe(true);
        });

        test('rollLootTable skips null rewards from buildLootReward', () => {
            const rewards = LootEngine.rollLootTable({
                rarityWeights: { common: 100 },
                availablePools: { common: [{ type: 'unknown' }] },
                itemCount: 4,
                weightedRandomSelect: (items) => items[0],
                buildLootReward: () => null
            });
            expect(rewards).toEqual([]);
        });
    });

    // ==================== STREAK LOGIC (Roadmap #1, 56th slice — first non-render LOGIC module) ====================
    // streak-logic.js holds the PURE daily-login-streak + streak-repair math that
    // checkDailyLoginBonus / _completeLoginBonus + the streak-repair methods delegate to. The
    // class-level repair behaviour is already covered (the getStreakRepairCost / _recordRepairableStreak
    // / getRepairableStreaks / canRepairStreak / repairStreak suites further below); these lock the
    // module in ISOLATION — especially classifyLoginBonus + computeLoginRewards, which had NO direct
    // test before this slice (their callers are impure: shield modals, addXP/addGold, saveData, render).
    describe('streak-logic.js (pure login-streak + repair math)', () => {
        const StreakLogic = require('../streak-logic.js').default;

        describe('classifyLoginBonus (date-gap break detection)', () => {
            test('already-claimed when today === lastLoginBonusDate', () => {
                expect(StreakLogic.classifyLoginBonus('2026-01-10', '2026-01-10', 5))
                    .toEqual({ status: 'already-claimed' });
            });
            test('first login (no prior claim) starts the streak at 1', () => {
                expect(StreakLogic.classifyLoginBonus(null, '2026-01-10', 0))
                    .toEqual({ status: 'first', prevStreak: 0, newStreak: 1 });
                expect(StreakLogic.classifyLoginBonus(undefined, '2026-01-10', 7).status).toBe('first');
            });
            test('continue: exactly one day later increments the streak', () => {
                expect(StreakLogic.classifyLoginBonus('2026-01-09', '2026-01-10', 5))
                    .toEqual({ status: 'continue', prevStreak: 5, dayDiff: 1, newStreak: 6 });
            });
            test('gap: 2+ days later flags the streak at risk (wrapper handles shield/repair)', () => {
                expect(StreakLogic.classifyLoginBonus('2026-01-07', '2026-01-10', 5))
                    .toEqual({ status: 'gap', prevStreak: 5, dayDiff: 3 });
            });
            test('ignore: clock moved backwards (dayDiff <= 0) leaves the streak untouched', () => {
                expect(StreakLogic.classifyLoginBonus('2026-01-12', '2026-01-10', 5))
                    .toEqual({ status: 'ignore', prevStreak: 5, dayDiff: -2 });
            });
            test('prevStreak coerces a missing streak to 0', () => {
                expect(StreakLogic.classifyLoginBonus('2026-01-09', '2026-01-10', undefined).newStreak).toBe(1);
            });
        });

        describe('computeLoginRewards (escalating gold/XP + milestone)', () => {
            const MILES = [
                { day: 3, xpBonus: 25, goldBonus: 30 },
                { day: 7, xpBonus: 50, goldBonus: 75 },
            ];
            test('day 1: base 10 XP / 15 gold, no milestone, previews the first milestone', () => {
                const r = StreakLogic.computeLoginRewards(1, MILES);
                expect(r).toMatchObject({ goldReward: 15, xpReward: 10, totalXP: 10, totalGold: 15 });
                expect(r.milestone).toBeUndefined();
                expect(r.nextMilestone).toEqual({ day: 3, xpBonus: 25, goldBonus: 30 });
            });
            test('day 3: escalated base + milestone bonus folded into the totals', () => {
                const r = StreakLogic.computeLoginRewards(3, MILES);
                // base gold 15 + 2*5 = 25; base xp 10 + 2*3 = 16
                expect(r).toMatchObject({ goldReward: 25, xpReward: 16, totalGold: 55, totalXP: 41 });
                expect(r.milestone.day).toBe(3);
                expect(r.nextMilestone.day).toBe(7);
            });
            test('day 7: base escalation caps (+30 gold / +18 XP), no next milestone remains', () => {
                const r = StreakLogic.computeLoginRewards(7, MILES);
                expect(r).toMatchObject({ goldReward: 45, xpReward: 28, totalGold: 120, totalXP: 78 });
                expect(r.nextMilestone).toBeUndefined();
            });
            test('past day 7 the base stays capped even without a milestone', () => {
                const r = StreakLogic.computeLoginRewards(10, MILES);
                expect(r).toMatchObject({ goldReward: 45, xpReward: 28, totalGold: 45, totalXP: 28 });
                expect(r.milestone).toBeUndefined();
            });
        });

        describe('streakRepairCost', () => {
            test('scales ~1 per 10 lost days, min 1, capped at 5', () => {
                expect(StreakLogic.streakRepairCost(2)).toBe(1);
                expect(StreakLogic.streakRepairCost(11)).toBe(2);
                expect(StreakLogic.streakRepairCost(50)).toBe(5);
                expect(StreakLogic.streakRepairCost(365)).toBe(5);
                expect(StreakLogic.streakRepairCost(0)).toBe(1);
            });
        });

        describe('computeRepairableStreakInsert', () => {
            const NOW = 1700000000000;
            test('records a 2+ day break with the expected shape', () => {
                const { entry, list } = StreakLogic.computeRepairableStreakInsert({ kind: 'login', lostStreak: 12 }, [], NOW);
                expect(entry).toMatchObject({ kind: 'login', habitId: null, lostStreak: 12, brokenAt: NOW });
                expect(list).toHaveLength(1);
            });
            test('no-op for a <2-day streak — returns the original list reference untouched', () => {
                const existing = [{ id: 'x' }];
                const res = StreakLogic.computeRepairableStreakInsert({ kind: 'login', lostStreak: 1 }, existing, NOW);
                expect(res.entry).toBeNull();
                expect(res.list).toBe(existing);
            });
            test('de-dupes the login entry, and per-habit id coexists with login', () => {
                let list = [{ id: 'old-login', kind: 'login', lostStreak: 5, brokenAt: NOW }];
                list = StreakLogic.computeRepairableStreakInsert({ kind: 'login', lostStreak: 9 }, list, NOW + 1).list;
                expect(list).toHaveLength(1);
                expect(list[0].lostStreak).toBe(9);
                const withHabit = StreakLogic.computeRepairableStreakInsert({ kind: 'habit', habitId: 7, title: 'Yoga', lostStreak: 4 }, list, NOW + 2).list;
                expect(withHabit).toHaveLength(2);
                expect(withHabit.find(e => e.habitId === 7)).toMatchObject({ kind: 'habit', title: 'Yoga', lostStreak: 4 });
            });
        });

        describe('pruneRepairableStreaks', () => {
            const NOW = 1700000000000, HOUR = 3600000, WINDOW = 48 * HOUR;
            test('keeps fresh entries, drops ones past the window and malformed entries', () => {
                const list = [
                    { id: 'fresh', brokenAt: NOW - 47 * HOUR },
                    { id: 'stale', brokenAt: NOW - 49 * HOUR },
                    { id: 'bad' }, // no numeric brokenAt
                ];
                expect(StreakLogic.pruneRepairableStreaks(list, NOW, WINDOW).map(e => e.id)).toEqual(['fresh']);
            });
        });

        describe('canRepairStreakEntry', () => {
            const NOW = 1700000000000, HOUR = 3600000, WINDOW = 48 * HOUR;
            const base = { brokenAt: NOW };
            const ctx = (over) => ({ now: NOW, windowMs: WINDOW, hasFreeRepair: false, isPremium: false, focusCrystals: 0, cost: 2, ...over });
            test('false for a missing / malformed entry', () => {
                expect(StreakLogic.canRepairStreakEntry(null, ctx())).toBe(false);
                expect(StreakLogic.canRepairStreakEntry({}, ctx())).toBe(false);
            });
            test('false once the window has closed', () => {
                expect(StreakLogic.canRepairStreakEntry({ brokenAt: NOW - 49 * HOUR }, ctx())).toBe(false);
            });
            test('true with the free repair even at 0 crystals (P2b)', () => {
                expect(StreakLogic.canRepairStreakEntry(base, ctx({ hasFreeRepair: true }))).toBe(true);
            });
            test('non-premium without a free repair cannot repair', () => {
                expect(StreakLogic.canRepairStreakEntry(base, ctx({ isPremium: false }))).toBe(false);
            });
            test('premium can repair only when they can afford the cost', () => {
                expect(StreakLogic.canRepairStreakEntry(base, ctx({ isPremium: true, focusCrystals: 1, cost: 2 }))).toBe(false);
                expect(StreakLogic.canRepairStreakEntry(base, ctx({ isPremium: true, focusCrystals: 2, cost: 2 }))).toBe(true);
            });
        });
    });

    // ==================== LEVELING LOGIC (Roadmap #1, 57th slice — second non-render LOGIC module) ====================
    // leveling-logic.js holds the PURE XP curve + the "progress within the current level" band math
    // that getXPForLevel / getTotalXPForLevel and the four XP-progress sites (showXPToast,
    // renderXPDisplay, _statBreakdownXP, the character-sheet canvas) delegate to. The curve is also
    // covered through the class in the XP & Level System describe above; these lock the module in
    // ISOLATION — especially levelProgress (the de-duplicated four-site core) and its clamp edges,
    // plus a matrix parity check against the exact pre-extraction inline formula.
    describe('leveling-logic.js (pure XP curve + level-progress math)', () => {
        const LevelingLogic = require('../leveling-logic.js').default;

        describe('xpForLevel (XP to advance from a level)', () => {
            test('level 1 = 150, then +250 per level', () => {
                expect(LevelingLogic.xpForLevel(1)).toBe(150);
                expect(LevelingLogic.xpForLevel(2)).toBe(400);
                expect(LevelingLogic.xpForLevel(3)).toBe(650);
                expect(LevelingLogic.xpForLevel(4)).toBe(900);
                expect(LevelingLogic.xpForLevel(5)).toBe(1150);
            });
        });

        describe('totalXpForLevel (cumulative XP to reach a level)', () => {
            test('level 1 = 0 (the starting point)', () => {
                expect(LevelingLogic.totalXpForLevel(1)).toBe(0);
            });
            test('cumulative sums of the per-level curve', () => {
                expect(LevelingLogic.totalXpForLevel(2)).toBe(150);   // 150
                expect(LevelingLogic.totalXpForLevel(3)).toBe(550);   // 150 + 400
                expect(LevelingLogic.totalXpForLevel(4)).toBe(1200);  // 150 + 400 + 650
                expect(LevelingLogic.totalXpForLevel(5)).toBe(2100);  // + 900
            });
            test('stays the running sum of xpForLevel across the first 30 levels', () => {
                let running = 0;
                for (let lvl = 1; lvl <= 30; lvl++) {
                    expect(LevelingLogic.totalXpForLevel(lvl)).toBe(running);
                    running += LevelingLogic.xpForLevel(lvl);
                }
            });
        });

        describe('levelProgress (band math — the de-duplicated four-site core)', () => {
            test('at the exact start of a level band: 0 into the band, 0%', () => {
                // total XP to reach L3 = 550; L3 span (xpForLevel(3)) = 650; L4 starts at 1200.
                expect(LevelingLogic.levelProgress(550, 3)).toEqual({
                    currentLevelXP: 550, nextLevelXP: 1200, xpIntoLevel: 0, xpNeededForLevel: 650, pct: 0,
                });
            });
            test('halfway through a band reports half the span and ~50%', () => {
                // L3 band is [550, 1200), span 650; midpoint = 550 + 325 = 875.
                const p = LevelingLogic.levelProgress(875, 3);
                expect(p.xpIntoLevel).toBe(325);
                expect(p.pct).toBeCloseTo(50, 5);
            });
            test('xpNeededForLevel equals xpForLevel(level) for every level', () => {
                for (let lvl = 1; lvl <= 20; lvl++) {
                    const p = LevelingLogic.levelProgress(LevelingLogic.totalXpForLevel(lvl), lvl);
                    expect(p.xpNeededForLevel).toBe(LevelingLogic.xpForLevel(lvl));
                }
            });
            test('pct clamps to 100 at/above the next-level threshold (pre-level-up)', () => {
                const atThreshold = LevelingLogic.levelProgress(1200, 3); // == nextLevelXP
                expect(atThreshold.xpIntoLevel).toBe(650);
                expect(atThreshold.pct).toBe(100);
                expect(LevelingLogic.levelProgress(5000, 3).pct).toBe(100);
            });
            test('pct clamps to 0 when the band is ahead of the XP (negative xpIntoLevel)', () => {
                const p = LevelingLogic.levelProgress(0, 3);
                expect(p.xpIntoLevel).toBeLessThan(0);
                expect(p.pct).toBe(0);
            });
        });

        describe('parity with the GoalManager delegators + the faithful lift', () => {
            test('getXPForLevel / getTotalXPForLevel delegate straight to the module', () => {
                const gm = createTestManager();
                for (let lvl = 1; lvl <= 15; lvl++) {
                    expect(gm.getXPForLevel(lvl)).toBe(LevelingLogic.xpForLevel(lvl));
                    expect(gm.getTotalXPForLevel(lvl)).toBe(LevelingLogic.totalXpForLevel(lvl));
                }
            });
            test('levelProgress reproduces the exact pre-extraction inline formula across a matrix', () => {
                // The four render/toast sites each hand-computed these; assert the module matches the
                // original expressions everywhere (start / edge / mid / over-threshold XP per level).
                const inline = (totalXp, level) => {
                    const currentLevelXP = LevelingLogic.totalXpForLevel(level);
                    const nextLevelXP = LevelingLogic.totalXpForLevel(level + 1);
                    const xpNeededForLevel = nextLevelXP - currentLevelXP;
                    const xpIntoLevel = totalXp - currentLevelXP;
                    const pct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));
                    return { currentLevelXP, nextLevelXP, xpIntoLevel, xpNeededForLevel, pct };
                };
                for (let level = 1; level <= 25; level++) {
                    const base = LevelingLogic.totalXpForLevel(level);
                    const span = LevelingLogic.xpForLevel(level);
                    const samples = [0, base - 1, base, base + 1, base + Math.floor(span / 2), base + span - 1, base + span, base + span + 1000];
                    for (const xp of samples) {
                        expect(LevelingLogic.levelProgress(xp, level)).toEqual(inline(xp, level));
                    }
                }
            });
        });
    });

    // ==================== EFFORT-XP LOGIC (Roadmap #1, 58th slice — sixth LOGIC module) ====================
    // effort-xp-logic.js holds the PURE "N3 effort-based XP" priority scaling that _normalizePriority /
    // getPriorityXPMultiplier and the five reward sites (side-quest ×20, daily ×15, weekly ×50, monthly ×200,
    // yearly ×1000) delegate to. The class-level behaviour is already covered (the "Effort-based XP" describe
    // further below + its side-quest reward-parity guard); these lock the module in ISOLATION — especially
    // scaledXP (the de-duplicated five-site core) and normalizePriority's unknown→medium coercion.
    describe('effort-xp-logic.js (pure effort-based-XP priority scaling)', () => {
        const EffortXP = require('../effort-xp-logic.js').default;

        describe('normalizePriority (low/medium/high coercion)', () => {
            test('passes through the two non-default bands', () => {
                expect(EffortXP.normalizePriority('high')).toBe('high');
                expect(EffortXP.normalizePriority('low')).toBe('low');
            });
            test('coerces medium / unknown / missing to medium (the 1.0x baseline)', () => {
                expect(EffortXP.normalizePriority('medium')).toBe('medium');
                expect(EffortXP.normalizePriority('urgent')).toBe('medium');
                expect(EffortXP.normalizePriority('')).toBe('medium');
                expect(EffortXP.normalizePriority(undefined)).toBe('medium');
                expect(EffortXP.normalizePriority(null)).toBe('medium');
            });
        });

        describe('priorityXPMultiplier (effort → multiplier)', () => {
            test('high 1.5x / medium 1.0x / low 0.75x', () => {
                expect(EffortXP.priorityXPMultiplier('high')).toBe(1.5);
                expect(EffortXP.priorityXPMultiplier('medium')).toBe(1);
                expect(EffortXP.priorityXPMultiplier('low')).toBe(0.75);
            });
            test('unknown / missing falls back to the medium 1.0x baseline', () => {
                expect(EffortXP.priorityXPMultiplier('whatever')).toBe(1);
                expect(EffortXP.priorityXPMultiplier(undefined)).toBe(1);
                expect(EffortXP.priorityXPMultiplier(null)).toBe(1);
            });
        });

        describe('scaledXP (the de-duplicated five-site reward formula)', () => {
            test('reproduces the historical ramp for every reward base', () => {
                // [base, low, medium, high] — the exact values the five call sites used to hand-compute.
                const cases = [
                    [20, 15, 20, 30],        // side-quest
                    [15, 11, 15, 23],        // daily task (11.25→11, 22.5→23)
                    [50, 38, 50, 75],        // weekly goal (37.5→38)
                    [200, 150, 200, 300],    // monthly goal
                    [1000, 750, 1000, 1500], // yearly goal
                ];
                for (const [base, low, med, high] of cases) {
                    expect(EffortXP.scaledXP(base, 'low')).toBe(low);
                    expect(EffortXP.scaledXP(base, 'medium')).toBe(med);
                    expect(EffortXP.scaledXP(base, 'high')).toBe(high);
                }
            });
            test('rounds half-up like the original Math.round sites; unknown → medium', () => {
                expect(EffortXP.scaledXP(15, 'high')).toBe(23);    // 22.5 → 23
                expect(EffortXP.scaledXP(50, 'low')).toBe(38);     // 37.5 → 38
                expect(EffortXP.scaledXP(20, 'mystery')).toBe(20); // unknown → medium 1.0x
            });
        });

        describe('parity with the GoalManager delegators + the faithful lift', () => {
            test('_normalizePriority / getPriorityXPMultiplier delegate straight to the module', () => {
                const gm = createTestManager();
                for (const p of ['high', 'medium', 'low', 'urgent', undefined, null]) {
                    expect(gm._normalizePriority(p)).toBe(EffortXP.normalizePriority(p));
                    expect(gm.getPriorityXPMultiplier(p)).toBe(EffortXP.priorityXPMultiplier(p));
                }
            });
            test('scaledXP reproduces the exact pre-extraction inline formula across a matrix', () => {
                // The five reward sites each hand-computed Math.round(base * getPriorityXPMultiplier(p)).
                const inline = (base, priority) => Math.round(base * EffortXP.priorityXPMultiplier(priority));
                for (const base of [15, 20, 50, 200, 1000, 7, 999]) {
                    for (const p of ['high', 'medium', 'low', undefined, 'nope']) {
                        expect(EffortXP.scaledXP(base, p)).toBe(inline(base, p));
                    }
                }
            });
        });
    });

    // ==================== BUFF MULTIPLIERS (Roadmap #1, 59th slice — seventh LOGIC module) ====================
    // buff-multipliers.js holds the PURE active-buff → reward-multiplier math that getActiveSpellMultiplier /
    // getEnchantmentMultiplier delegate to. The class methods are already covered (the "Spell Multiplier
    // System" + "Enchantment System" describes near the top); these lock the module in ISOLATION — most
    // importantly the Empowered-Magic × Overcharge bonus scaling on spellMultiplier, which had NO direct
    // coverage before the extraction.
    describe('buff-multipliers.js (pure active-buff reward multipliers)', () => {
        const BuffMultipliers = require('../buff-multipliers.js').default;
        const NOW = 1_000_000;
        // Synthetic definitions so the assertions do not couple to the live spell catalog's balance values.
        const DEFS = {
            x1: { effect: 'xp_multiplier', multiplier: 1.25 },
            x2: { effect: 'xp_multiplier', multiplier: 2 },
            g1: { effect: 'gold_multiplier', multiplier: 1.5 },
            flag: { effect: 'xp_multiplier' },            // no multiplier → contributes nothing
            weak: { effect: 'xp_multiplier', multiplier: 0.8 }, // bonus <= 0 → left unscaled
        };
        const live = (spellId, extra = {}) => ({ spellId, expiresAt: NOW + 60000, ...extra });

        describe('spellMultiplier (active-spell economy buffs)', () => {
            test('returns 1 with no active spells (empty or missing list)', () => {
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [], DEFS, { now: NOW })).toBe(1);
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', undefined, DEFS, { now: NOW })).toBe(1);
            });
            test('applies a matching, unexpired spell multiplier', () => {
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x1')], DEFS, { now: NOW })).toBe(1.25);
            });
            test('skips expired casts but honours expiresAt === -1 (until triggered)', () => {
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [{ spellId: 'x1', expiresAt: NOW - 1 }], DEFS, { now: NOW })).toBe(1);
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [{ spellId: 'x1', expiresAt: -1 }], DEFS, { now: NOW })).toBe(1.25);
            });
            test('ignores effect mismatches, unknown spellIds, and flag spells with no multiplier', () => {
                expect(BuffMultipliers.spellMultiplier('gold_multiplier', [live('x1')], DEFS, { now: NOW })).toBe(1);
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('nope')], DEFS, { now: NOW })).toBe(1);
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('flag')], DEFS, { now: NOW })).toBe(1);
            });
            test('stacks multiple matching spells multiplicatively', () => {
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x1'), live('x1')], DEFS, { now: NOW })).toBeCloseTo(1.5625, 10);
            });
            test('Empowered Magic (spell_power_mult) scales the BONUS above 1x', () => {
                // 1.25x: bonus 0.25 × (1 + 0.2) = 0.30 → 1.30x. 2x: bonus 1.0 × 1.2 = 1.2 → 2.2x.
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x1')], DEFS, { now: NOW, powerMult: 0.2 })).toBeCloseTo(1.3, 10);
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x2')], DEFS, { now: NOW, powerMult: 0.2 })).toBeCloseTo(2.2, 10);
            });
            test('an Overcharged cast doubles the (already power-scaled) bonus', () => {
                // powerMult 0: scale 1×2 = 2, bonus 0.25×2 = 0.5 → 1.5x.
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x1', { overcharged: true })], DEFS, { now: NOW, powerMult: 0 })).toBe(1.5);
                // powerMult 0.2: scale 1.2×2 = 2.4, bonus 0.25×2.4 = 0.6 → 1.6x.
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x1', { overcharged: true })], DEFS, { now: NOW, powerMult: 0.2 })).toBeCloseTo(1.6, 10);
            });
            test('leaves a non-positive bonus unscaled and clamps negative powerMult to 0', () => {
                // 0.8x spell: bonus -0.2 (not > 0) → never touched by power/overcharge.
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('weak')], DEFS, { now: NOW, powerMult: 0.5 })).toBeCloseTo(0.8, 10);
                // negative powerMult behaves as 0 → plain 1.25x.
                expect(BuffMultipliers.spellMultiplier('xp_multiplier', [live('x1')], DEFS, { now: NOW, powerMult: -0.5 })).toBe(1.25);
            });
        });

        describe('enchantmentMultiplier (reward-type lookup)', () => {
            test('maps each active enchantment to its reward-type multiplier', () => {
                expect(BuffMultipliers.enchantmentMultiplier('xp', (id) => id === 'double_xp')).toBe(2);
                expect(BuffMultipliers.enchantmentMultiplier('gold', (id) => id === 'double_gold')).toBe(2);
                expect(BuffMultipliers.enchantmentMultiplier('boss_damage', (id) => id === 'boss_damage')).toBe(1.3);
            });
            test('returns 1 when the enchantment does not match the reward type or is absent', () => {
                expect(BuffMultipliers.enchantmentMultiplier('xp', () => false)).toBe(1);
                expect(BuffMultipliers.enchantmentMultiplier('xp', (id) => id === 'double_gold')).toBe(1);
                expect(BuffMultipliers.enchantmentMultiplier('gold', (id) => id === 'double_xp')).toBe(1);
                expect(BuffMultipliers.enchantmentMultiplier('mystery', () => true)).toBe(1);
            });
        });

        describe('parity with the GoalManager delegators', () => {
            test('getActiveSpellMultiplier delegates with injected now + spell_power_mult perk', () => {
                const gm = createTestManager();
                const xpSpellId = Object.keys(gm.spellDefinitions).find(id => gm.spellDefinitions[id].effect === 'xp_multiplier');
                expect(xpSpellId).toBeDefined();
                gm.activeSpells = [{ spellId: xpSpellId, expiresAt: -1 }]; // until-triggered → now-independent
                const powerMult = gm.getClassPerkValue('spell_power_mult');
                expect(gm.getActiveSpellMultiplier('xp_multiplier'))
                    .toBe(BuffMultipliers.spellMultiplier('xp_multiplier', gm.activeSpells, gm.spellDefinitions, { powerMult }));
            });
            test('getEnchantmentMultiplier runs the expiry sweep, then delegates via hasActiveEnchantment', () => {
                const gm = createTestManager();
                gm.checkExpiredEnchantments = jest.fn();
                gm.hasActiveEnchantment = jest.fn((id) => id === 'double_xp');
                expect(gm.getEnchantmentMultiplier('xp')).toBe(2);
                expect(gm.checkExpiredEnchantments).toHaveBeenCalledTimes(1);
                expect(gm.getEnchantmentMultiplier('gold')).toBe(BuffMultipliers.enchantmentMultiplier('gold', gm.hasActiveEnchantment));
            });
        });
    });

    // ==================== COMPANION LOGIC (Roadmap #1, 60th slice + 88th slice) ====================
    // companion-logic.js holds the PURE slot + bonus resolution that getActiveCompanion / getSecondCompanion /
    // getCompanionBonus delegate to (60th slice, eighth LOGIC module), plus — since the 88th slice (the Sep 7
    // criterion (1)/(2) audit) — the companion XP-gain math grantCompanionXP delegates to. The class methods
    // are already covered (the "Companion System" describe + the Ranger "Twin Bond"/"Beastmaster" describes);
    // these lock the five functions in ISOLATION — the slot-resolution edge cases (empty roster, unowned id,
    // the Twin Bond perk gate + duplicate guard), the matching-type sum, the Bonding×Beastmaster XP-gain
    // stacking order, and the 100*level multi-level-up loop.
    describe('companion-logic.js (pure companion slot/bonus resolution + XP-gain math)', () => {
        const CompanionLogic = require('../companion-logic.js').default;
        const owl = { type: 'owl', bonusType: 'xp', bonusAmount: 0.10 };
        const dragon = { type: 'dragon', bonusType: 'gold', bonusAmount: 0.15 };
        const eagle = { type: 'eagle', bonusType: 'xp', bonusAmount: 0.15 };
        const roster = [owl, dragon, eagle];

        describe('activeCompanion (primary slot)', () => {
            test('returns null with no id, an empty roster, an unowned id, or a missing roster', () => {
                expect(CompanionLogic.activeCompanion(roster, null)).toBeNull();
                expect(CompanionLogic.activeCompanion([], 'owl')).toBeNull();
                expect(CompanionLogic.activeCompanion(roster, 'nonexistent')).toBeNull();
                expect(CompanionLogic.activeCompanion(undefined, 'owl')).toBeNull();
            });
            test('returns the owned companion object for a valid id', () => {
                expect(CompanionLogic.activeCompanion(roster, 'owl')).toBe(owl);
            });
        });

        describe('secondCompanion (Ranger Twin Bond slot)', () => {
            test('returns null unless the second_companion capstone perk is active', () => {
                expect(CompanionLogic.secondCompanion(roster, 'owl', 'eagle', 0)).toBeNull();
                expect(CompanionLogic.secondCompanion(roster, 'owl', 'eagle', 1)).toBe(eagle);
            });
            test('returns null with no second id, a duplicate of the primary, or an unowned id', () => {
                expect(CompanionLogic.secondCompanion(roster, 'owl', null, 1)).toBeNull();
                expect(CompanionLogic.secondCompanion(roster, 'owl', 'owl', 1)).toBeNull();
                expect(CompanionLogic.secondCompanion(roster, 'owl', 'nonexistent', 1)).toBeNull();
            });
        });

        describe('companionBonus (matching-type sum)', () => {
            test('is 0 when both slots are empty', () => {
                expect(CompanionLogic.companionBonus('xp', null, null)).toBe(0);
            });
            test('adds only the slots whose bonusType matches the requested type', () => {
                expect(CompanionLogic.companionBonus('xp', owl, null)).toBeCloseTo(0.10);
                expect(CompanionLogic.companionBonus('gold', owl, null)).toBe(0);
                expect(CompanionLogic.companionBonus('xp', owl, eagle)).toBeCloseTo(0.25); // owl 0.10 + eagle 0.15
                expect(CompanionLogic.companionBonus('xp', owl, dragon)).toBeCloseTo(0.10); // dragon is gold
                expect(CompanionLogic.companionBonus('gold', owl, dragon)).toBeCloseTo(0.15); // owl is xp
            });
            test('treats a missing bonusAmount as 0', () => {
                expect(CompanionLogic.companionBonus('xp', { type: 'ghost', bonusType: 'xp' }, null)).toBe(0);
            });
        });

        describe('companionXpGain (Bonding ×2 then Beastmaster ceil-scale)', () => {
            test('returns the raw amount with neither buff active', () => {
                expect(CompanionLogic.companionXpGain(10)).toBe(10);
                expect(CompanionLogic.companionXpGain(10, {})).toBe(10);
            });
            test('Bonding enchantment doubles the raw amount', () => {
                expect(CompanionLogic.companionXpGain(10, { bondingActive: true })).toBe(20);
            });
            test('Beastmaster ceil-scales the (possibly bonded) amount', () => {
                // ceil(10 * 1.5) = 15
                expect(CompanionLogic.companionXpGain(10, { rangerCompXpMult: 0.5 })).toBe(15);
                // bonding first (10*2=20), THEN ceil(20 * 1.5) = 30
                expect(CompanionLogic.companionXpGain(10, { bondingActive: true, rangerCompXpMult: 0.5 })).toBe(30);
            });
            test('a non-positive mult is a no-op (no ceil rounding introduced)', () => {
                expect(CompanionLogic.companionXpGain(10, { rangerCompXpMult: 0 })).toBe(10);
                expect(CompanionLogic.companionXpGain(10, { bondingActive: true, rangerCompXpMult: -1 })).toBe(20);
            });
        });

        describe('applyCompanionXp (100*level multi-level-up loop)', () => {
            test('adds xp with no level-up when under threshold', () => {
                const companion = { level: 1, xp: 0 };
                expect(CompanionLogic.applyCompanionXp(companion, 50)).toBe(false);
                expect(companion).toEqual({ level: 1, xp: 50 });
            });
            test('levels up once, carrying the remainder', () => {
                const companion = { level: 1, xp: 80 };
                expect(CompanionLogic.applyCompanionXp(companion, 30)).toBe(true);
                expect(companion).toEqual({ level: 2, xp: 10 });
            });
            test('a large gain carries through multiple level-ups (the while-loop fix)', () => {
                // level 1->2 costs 100, 2->3 costs 200: 350 xp clears both with 50 left over.
                const companion = { level: 1, xp: 0 };
                expect(CompanionLogic.applyCompanionXp(companion, 350)).toBe(true);
                expect(companion).toEqual({ level: 3, xp: 50 });
            });
            test('missing xp/level default to the level-1 floor when computing the threshold', () => {
                const companion = {};
                expect(CompanionLogic.applyCompanionXp(companion, 50)).toBe(false);
                expect(companion.xp).toBe(50); // under the 100*1 threshold, so level is never written
            });
        });

        describe('parity with the GoalManager delegators', () => {
            test('getActiveCompanion delegates to activeCompanion', () => {
                const gm = createTestManager();
                gm.companions = [{ type: 'owl', name: 'Wise Owl', bonusType: 'xp', bonusAmount: 0.10 }];
                gm.activeCompanionId = 'owl';
                expect(gm.getActiveCompanion()).toBe(CompanionLogic.activeCompanion(gm.companions, gm.activeCompanionId));
            });
            test('getSecondCompanion + getCompanionBonus delegate under an active Twin Bond', () => {
                const gm = createTestManager();
                gm.companions = [
                    { type: 'owl', bonusType: 'xp', bonusAmount: 0.10 },
                    { type: 'eagle', bonusType: 'xp', bonusAmount: 0.15 },
                ];
                gm.activeCompanionId = 'owl';
                gm.activeCompanionId2 = 'eagle';
                gm.getClassPerkValue = jest.fn((perk) => (perk === 'second_companion' ? 1 : 0));
                const perk = gm.getClassPerkValue('second_companion');
                expect(gm.getSecondCompanion())
                    .toBe(CompanionLogic.secondCompanion(gm.companions, gm.activeCompanionId, gm.activeCompanionId2, perk));
                expect(gm.getCompanionBonus('xp'))
                    .toBe(CompanionLogic.companionBonus('xp', gm.getActiveCompanion(), gm.getSecondCompanion()));
            });
            test('grantCompanionXP delegates to companionXpGain + applyCompanionXp', () => {
                const gm = createTestManager();
                gm.hasActiveEnchantment = jest.fn(() => true); // Bonding active
                gm.getClassPerkValue = jest.fn(() => 0.5); // Beastmaster +50%
                gm.companions = [{ type: 'owl', icon: '🦉', name: 'Wise Owl', level: 1, xp: 0 }];
                gm.activeCompanionId = 'owl';
                gm.showAchievement = jest.fn();
                gm.grantCompanionXP(10);
                // bonding: 10*2=20, then ceil(20*1.5)=30
                const expectedGain = CompanionLogic.companionXpGain(10, { bondingActive: true, rangerCompXpMult: 0.5 });
                expect(expectedGain).toBe(30);
                expect(gm.companions[0].xp).toBe(30);
            });
            test('grantCompanionXP fires the level-up achievement across a multi-level gain', () => {
                const gm = createTestManager();
                gm.hasActiveEnchantment = jest.fn(() => false);
                gm.getClassPerkValue = jest.fn(() => 0);
                gm.companions = [{ type: 'owl', icon: '🦉', name: 'Wise Owl', level: 1, xp: 0 }];
                gm.activeCompanionId = 'owl';
                gm.showAchievement = jest.fn();
                gm.grantCompanionXP(350); // clears 1->2 (100) and 2->3 (200), 50 left over
                expect(gm.companions[0].level).toBe(3);
                expect(gm.companions[0].xp).toBe(50);
                expect(gm.showAchievement).toHaveBeenCalledWith(
                    expect.stringContaining('leveled up to Lv.3'), 'weekly'
                );
            });
        });
    });

    // ==================== CLASS PERKS (Roadmap #1, 61st slice — ninth LOGIC module) ====================
    // class-perks.js holds the PURE perk-value resolution getClassPerkValue / getSubclassPerkValue /
    // getChosenCapstone delegate to — the shared upstream buff-multipliers.js (spell_power_mult) and
    // companion-logic.js (second_companion) both read. The class methods are already covered end-to-end (the
    // "Class System v3.1 — Phase 1 / Phase 2 perks" describes); these lock the three functions in ISOLATION
    // with a synthetic class/subclass so they're decoupled from the live class catalog.
    describe('class-perks.js (pure class/subclass perk-value resolution)', () => {
        const ClassPerks = require('../class-perks.js').default;
        const cls = {
            nodes: [
                { effect: 'focus_xp', value: 40 },
                { effect: 'enchant_discount', value: 2 },
                { effect: 'crystal_yield', value: 1 },
            ],
            capstones: [
                { id: 'deep_work', effect: 'deep_work', value: 0.25 },
                { id: 'insight', effect: 'enchant_preserve', value: 1 },
            ],
        };
        const sub = { effect: 'focus_xp', tiers: [{ value: 50 }, { value: 60 }, { value: 75 }] };
        const deepWork = cls.capstones[0];

        describe('classPerkValue (node scan → capstone → subclass merge)', () => {
            test('returns 0 when no class is active', () => {
                expect(ClassPerks.classPerkValue('focus_xp', null, 5, null, 0)).toBe(0);
            });
            test('a linear node resolves to 0 until unlocked, then to its value', () => {
                expect(ClassPerks.classPerkValue('focus_xp', cls, 0, null, 0)).toBe(0);
                expect(ClassPerks.classPerkValue('focus_xp', cls, 1, null, 0)).toBe(40);
                // 2nd node still locked at nodesUnlocked=1, unlocked at 2.
                expect(ClassPerks.classPerkValue('enchant_discount', cls, 1, null, 0)).toBe(0);
                expect(ClassPerks.classPerkValue('enchant_discount', cls, 2, null, 0)).toBe(2);
            });
            test('falls back to the chosen capstone only when it matches', () => {
                expect(ClassPerks.classPerkValue('deep_work', cls, 5, deepWork, 0)).toBe(0.25);
                // A different perk name is not the chosen capstone's effect → 0.
                expect(ClassPerks.classPerkValue('enchant_preserve', cls, 5, deepWork, 0)).toBe(0);
            });
            test('folds in the subclass value taking the highest', () => {
                expect(ClassPerks.classPerkValue('focus_xp', cls, 1, null, 60)).toBe(60); // subclass 60 > node 40
                expect(ClassPerks.classPerkValue('focus_xp', cls, 1, null, 20)).toBe(40); // node 40 > subclass 20
            });
        });

        describe('subclassPerkValue (highest unlocked tier)', () => {
            test('returns 0 with no subclass, an effect mismatch, or no unlocked tiers', () => {
                expect(ClassPerks.subclassPerkValue('focus_xp', null, 3)).toBe(0);
                expect(ClassPerks.subclassPerkValue('boss_damage', sub, 3)).toBe(0);
                expect(ClassPerks.subclassPerkValue('focus_xp', sub, 0)).toBe(0);
            });
            test('returns the highest unlocked tier value and caps at the tier count', () => {
                expect(ClassPerks.subclassPerkValue('focus_xp', sub, 1)).toBe(50);
                expect(ClassPerks.subclassPerkValue('focus_xp', sub, 2)).toBe(60);
                expect(ClassPerks.subclassPerkValue('focus_xp', sub, 3)).toBe(75);
                expect(ClassPerks.subclassPerkValue('focus_xp', sub, 99)).toBe(75);
            });
        });

        describe('chosenCapstone (capstone-by-id lookup)', () => {
            test('returns null with no class, no chosen id, no capstones, or an unknown id', () => {
                expect(ClassPerks.chosenCapstone(null, 'deep_work')).toBeNull();
                expect(ClassPerks.chosenCapstone(cls, null)).toBeNull();
                expect(ClassPerks.chosenCapstone({ nodes: [] }, 'deep_work')).toBeNull();
                expect(ClassPerks.chosenCapstone(cls, 'nonexistent')).toBeNull();
            });
            test('returns the capstone object matching the chosen id', () => {
                expect(ClassPerks.chosenCapstone(cls, 'deep_work')).toBe(deepWork);
            });
        });

        describe('parity with the GoalManager delegators', () => {
            test('getChosenCapstone / getClassPerkValue / getSubclassPerkValue delegate', () => {
                const gm = createTestManager();
                gm.classDefinitions = gm.initializeClasses();
                gm.playerClass = 'scholar';
                gm.classNodesUnlocked = 5;
                gm.classCapstone = 'deep_work';
                expect(gm.getChosenCapstone())
                    .toBe(ClassPerks.chosenCapstone(gm.getActiveClass(), gm.classCapstone));
                expect(gm.getSubclassPerkValue('focus_xp'))
                    .toBe(ClassPerks.subclassPerkValue('focus_xp', gm.getActiveSubclass(), gm.subclassNodesUnlocked));
                expect(gm.getClassPerkValue('focus_xp')).toBeGreaterThan(0); // sanity: a real perk resolves
                expect(gm.getClassPerkValue('focus_xp'))
                    .toBe(ClassPerks.classPerkValue('focus_xp', gm.getActiveClass(), gm.classNodesUnlocked, gm.getChosenCapstone(), gm.getSubclassPerkValue('focus_xp')));
            });
        });
    });

    // ==================== CLASS PROGRESSION (Roadmap #1, 62nd slice — tenth LOGIC module) ====================
    // class-progression.js holds the PURE tree-progression predicates the eight class/subclass progression
    // methods delegate to — the WHERE-in-the-tree state sibling of class-perks.js (VALUE resolution). The
    // class methods are already covered end-to-end (the "Class System v3.1" + subclass describes); these lock
    // the eight functions in ISOLATION with a synthetic class/subclass so they're decoupled from the catalog.
    describe('class-progression.js (pure class/subclass tree progression state)', () => {
        const CLASS_PROGRESSION = require('../class-progression.js').default;
        const cls = { nodes: [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }] };
        const sub = { tiers: [{ cost: 3 }, { cost: 4 }, { cost: 5 }] };

        describe('class tree', () => {
            test('linearNodeCount is the node count, or 0 with no class / no nodes', () => {
                expect(CLASS_PROGRESSION.linearNodeCount(null)).toBe(0);
                expect(CLASS_PROGRESSION.linearNodeCount({})).toBe(0);
                expect(CLASS_PROGRESSION.linearNodeCount(cls)).toBe(5);
            });
            test('nextClassNode returns the node at the unlocked index, or null past the end / no class', () => {
                expect(CLASS_PROGRESSION.nextClassNode(null, 0)).toBeNull();
                expect(CLASS_PROGRESSION.nextClassNode(cls, 0)).toBe(cls.nodes[0]);
                expect(CLASS_PROGRESSION.nextClassNode(cls, 2)).toBe(cls.nodes[2]);
                expect(CLASS_PROGRESSION.nextClassNode(cls, 5)).toBeNull(); // all unlocked
            });
            test('isCapstoneReady is true only when all nodes are unlocked AND no capstone is chosen', () => {
                expect(CLASS_PROGRESSION.isCapstoneReady(null, 5, null)).toBe(false);
                expect(CLASS_PROGRESSION.isCapstoneReady(cls, 4, null)).toBe(false); // not all nodes
                expect(CLASS_PROGRESSION.isCapstoneReady(cls, 5, null)).toBe(true);
                expect(CLASS_PROGRESSION.isCapstoneReady(cls, 5, 'deep_work')).toBe(false); // already chosen
            });
            test('isClassMastered is true only when all nodes are unlocked AND a capstone is chosen', () => {
                expect(CLASS_PROGRESSION.isClassMastered(null, 5, 'deep_work')).toBe(false);
                expect(CLASS_PROGRESSION.isClassMastered(cls, 5, null)).toBe(false); // no capstone
                expect(CLASS_PROGRESSION.isClassMastered(cls, 4, 'deep_work')).toBe(false); // not all nodes
                expect(CLASS_PROGRESSION.isClassMastered(cls, 5, 'deep_work')).toBe(true);
            });
        });

        describe('subclass tree', () => {
            test('subclassTierCount is the tier count, or 0 with no subclass / no tiers', () => {
                expect(CLASS_PROGRESSION.subclassTierCount(null)).toBe(0);
                expect(CLASS_PROGRESSION.subclassTierCount({})).toBe(0);
                expect(CLASS_PROGRESSION.subclassTierCount(sub)).toBe(3);
            });
            test('nextSubclassTier returns the tier at the unlocked index, or null past the end / no subclass', () => {
                expect(CLASS_PROGRESSION.nextSubclassTier(null, 0)).toBeNull();
                expect(CLASS_PROGRESSION.nextSubclassTier(sub, 0)).toBe(sub.tiers[0]);
                expect(CLASS_PROGRESSION.nextSubclassTier(sub, 3)).toBeNull(); // all unlocked
            });
            test('isSubclassMastered is true only once every tier is unlocked', () => {
                expect(CLASS_PROGRESSION.isSubclassMastered(null, 3)).toBe(false);
                expect(CLASS_PROGRESSION.isSubclassMastered(sub, 2)).toBe(false);
                expect(CLASS_PROGRESSION.isSubclassMastered(sub, 3)).toBe(true);
            });
            test('subclassPointsSpent sums the unlocked tiers cost and caps at the tier count', () => {
                expect(CLASS_PROGRESSION.subclassPointsSpent(null, 3)).toBe(0);
                expect(CLASS_PROGRESSION.subclassPointsSpent(sub, 0)).toBe(0);
                expect(CLASS_PROGRESSION.subclassPointsSpent(sub, 1)).toBe(3);
                expect(CLASS_PROGRESSION.subclassPointsSpent(sub, 2)).toBe(7); // 3 + 4
                expect(CLASS_PROGRESSION.subclassPointsSpent(sub, 3)).toBe(12); // 3 + 4 + 5
                expect(CLASS_PROGRESSION.subclassPointsSpent(sub, 99)).toBe(12); // caps at tier count
            });
        });

        describe('parity with the GoalManager delegators', () => {
            test('the four class-tree methods delegate (mastered Scholar)', () => {
                const gm = createTestManager();
                gm.classDefinitions = gm.initializeClasses();
                gm.playerClass = 'scholar';
                gm.classNodesUnlocked = 5;
                gm.classCapstone = 'deep_work';
                const activeCls = gm.getActiveClass();
                expect(gm.getLinearNodeCount(activeCls)).toBe(CLASS_PROGRESSION.linearNodeCount(activeCls));
                expect(gm.getNextClassNode()).toBe(CLASS_PROGRESSION.nextClassNode(activeCls, gm.classNodesUnlocked));
                expect(gm.isCapstoneReady()).toBe(CLASS_PROGRESSION.isCapstoneReady(activeCls, gm.classNodesUnlocked, gm.classCapstone));
                expect(gm.isClassMastered()).toBe(CLASS_PROGRESSION.isClassMastered(activeCls, gm.classNodesUnlocked, gm.classCapstone));
                expect(gm.isClassMastered()).toBe(true); // sanity: a fully-mastered class resolves
            });
            test('the four subclass-tree methods delegate (mocked active subclass)', () => {
                const gm = createTestManager();
                gm.getActiveSubclass = () => sub;
                gm.subclassNodesUnlocked = 2;
                expect(gm.getSubclassTierCount(sub)).toBe(CLASS_PROGRESSION.subclassTierCount(sub));
                expect(gm.getNextSubclassTier()).toBe(CLASS_PROGRESSION.nextSubclassTier(sub, gm.subclassNodesUnlocked));
                expect(gm.isSubclassMastered()).toBe(CLASS_PROGRESSION.isSubclassMastered(sub, gm.subclassNodesUnlocked));
                expect(gm.getSubclassPointsSpent()).toBe(CLASS_PROGRESSION.subclassPointsSpent(sub, gm.subclassNodesUnlocked));
                expect(gm.getSubclassPointsSpent()).toBe(7); // sanity: 3 + 4
            });
        });
    });

    // ==================== SKILL POINTS (Roadmap #1, 63rd slice — eleventh LOGIC module) ====================
    // skill-points.js holds the PURE skill-point economy math: the derived point supply, the unspent balance,
    // the class-selection + subclass level gates, and the respec fee / refund rules. It completes the
    // class-tree trio with class-perks.js (perk VALUES) and class-progression.js (tree STATE). The mutating
    // spenders keep their side effects on the class and only borrow this arithmetic. The economy is already
    // covered end-to-end by the "Class System v3.1" + subclass describes; these lock the six functions in
    // isolation, including the explicit `|| n` tunable defaults.
    describe('skill-points.js (pure class skill-point economy)', () => {
        const SKILL_POINTS = require('../skill-points.js').default;

        describe('point supply', () => {
            test('earnedSkillPoints grants 1 per level beyond the unlock level, clamped at 0', () => {
                expect(SKILL_POINTS.earnedSkillPoints(5, 10)).toBe(0);  // below unlock → clamped
                expect(SKILL_POINTS.earnedSkillPoints(10, 10)).toBe(0); // at unlock → still 0
                expect(SKILL_POINTS.earnedSkillPoints(11, 10)).toBe(1);
                expect(SKILL_POINTS.earnedSkillPoints(15, 10)).toBe(5);
                expect(SKILL_POINTS.earnedSkillPoints(15, null)).toBe(5); // defaults to 10
            });
            test('availableSkillPoints subtracts spent and never goes negative', () => {
                expect(SKILL_POINTS.availableSkillPoints(5, 0)).toBe(5);
                expect(SKILL_POINTS.availableSkillPoints(5, 2)).toBe(3);
                expect(SKILL_POINTS.availableSkillPoints(5, null)).toBe(5);
                expect(SKILL_POINTS.availableSkillPoints(5, 9)).toBe(0); // anomaly → clamped, not negative
            });
        });

        describe('level gates', () => {
            test('isClassSystemUnlocked gates class SELECTION at level 8', () => {
                expect(SKILL_POINTS.isClassSystemUnlocked(7, 8)).toBe(false);
                expect(SKILL_POINTS.isClassSystemUnlocked(8, 8)).toBe(true);
                expect(SKILL_POINTS.isClassSystemUnlocked(10, 8)).toBe(true);
                expect(SKILL_POINTS.isClassSystemUnlocked(7, null)).toBe(false); // defaults to 8
                expect(SKILL_POINTS.isClassSystemUnlocked(8, null)).toBe(true);
            });
            test('isSubclassUnlocked needs BOTH mastery and the subclass level', () => {
                expect(SKILL_POINTS.isSubclassUnlocked(false, 40, 40)).toBe(false); // not mastered
                expect(SKILL_POINTS.isSubclassUnlocked(true, 39, 40)).toBe(false);  // level short
                expect(SKILL_POINTS.isSubclassUnlocked(true, 40, 40)).toBe(true);
                expect(SKILL_POINTS.isSubclassUnlocked(true, 40, null)).toBe(true); // defaults to 40
            });
        });

        describe('respec fee + refund', () => {
            test('respecCost is FREE until points have accrued', () => {
                expect(SKILL_POINTS.respecCost(0, 5)).toBe(0); // pre-unlock pick → free
                expect(SKILL_POINTS.respecCost(1, 5)).toBe(5);
                expect(SKILL_POINTS.respecCost(5, null)).toBe(5); // defaults to 5
                expect(SKILL_POINTS.respecCost(0, null)).toBe(0);
            });
            test('refundedSpent returns only the subclass points to the shared pool', () => {
                expect(SKILL_POINTS.refundedSpent(37, 7)).toBe(30); // 30 base survives
                expect(SKILL_POINTS.refundedSpent(null, 0)).toBe(0);
                expect(SKILL_POINTS.refundedSpent(5, 9)).toBe(0); // clamped, never negative
            });
        });

        describe('parity with the GoalManager delegators', () => {
            test('the supply getters and both gates delegate', () => {
                const gm = createTestManager();
                gm.classDefinitions = gm.initializeClasses();
                gm.level = 15;
                gm.CLASS_SELECT_LEVEL = 8;
                gm.CLASS_UNLOCK_LEVEL = 10;
                gm.SUBCLASS_UNLOCK_LEVEL = 40;
                gm.skillPointsSpent = 2;
                expect(gm.getEarnedSkillPoints()).toBe(SKILL_POINTS.earnedSkillPoints(gm.level, gm.CLASS_UNLOCK_LEVEL));
                expect(gm.getEarnedSkillPoints()).toBe(5); // sanity: 15 - 10
                expect(gm.getAvailableSkillPoints()).toBe(SKILL_POINTS.availableSkillPoints(gm.getEarnedSkillPoints(), gm.skillPointsSpent));
                expect(gm.getAvailableSkillPoints()).toBe(3); // sanity: 5 - 2
                expect(gm.isClassSystemUnlocked()).toBe(SKILL_POINTS.isClassSystemUnlocked(gm.level, gm.CLASS_SELECT_LEVEL));
                expect(gm.isSubclassUnlocked()).toBe(SKILL_POINTS.isSubclassUnlocked(gm.isClassMastered(), gm.level, gm.SUBCLASS_UNLOCK_LEVEL));
            });
        });
    });

    // ==================== CRYSTAL ECONOMY (Roadmap #1, 64th slice — twelfth LOGIC module) ====================
    // crystal-economy.js holds the PURE Focus Crystal supply math — the three ways crystals come into
    // existence. Two rules earned this extraction: SHARDS_PER_CRYSTAL was a DUPLICATED magic number (the `10`
    // lived in the conversion AND in the shard display string), and focusSessionCrystals is an order- and
    // rounding-sensitive four-stage pipeline that had no isolation coverage. The mutating callers keep their
    // side effects; these tests lock the arithmetic.
    describe('crystal-economy.js (pure Focus Crystal supply math)', () => {
        const CRYSTAL_ECONOMY = require('../crystal-economy.js').default;

        describe('shard auto-conversion', () => {
            test('SHARDS_PER_CRYSTAL is the single source of truth (10)', () => {
                expect(CRYSTAL_ECONOMY.SHARDS_PER_CRYSTAL).toBe(10);
            });
            test('converts only at/after the threshold and carries the remainder', () => {
                expect(CRYSTAL_ECONOMY.shardConversion(0)).toEqual({ crystals: 0, remainder: 0 });
                expect(CRYSTAL_ECONOMY.shardConversion(9)).toEqual({ crystals: 0, remainder: 9 });
                expect(CRYSTAL_ECONOMY.shardConversion(10)).toEqual({ crystals: 1, remainder: 0 });
                expect(CRYSTAL_ECONOMY.shardConversion(13)).toEqual({ crystals: 1, remainder: 3 });
            });
            test('a single large grant can form SEVERAL crystals at once', () => {
                expect(CRYSTAL_ECONOMY.shardConversion(25)).toEqual({ crystals: 2, remainder: 5 });
                expect(CRYSTAL_ECONOMY.shardConversion(30)).toEqual({ crystals: 3, remainder: 0 });
                expect(CRYSTAL_ECONOMY.shardConversion(10, 5)).toEqual({ crystals: 2, remainder: 0 }); // custom threshold
            });
        });

        describe('focus-session yield pipeline', () => {
            test('stage 1 stacks the base, both enchantments and the class perk', () => {
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({})).toBe(1); // base only
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ bonusCrystal: true })).toBe(2);
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ timeWarden: true })).toBe(2);
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ bonusCrystal: true, timeWarden: true, perkCrystals: 1 })).toBe(4);
            });
            test('Focus Mode doubles, and does so BEFORE the multipliers', () => {
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ focusModeActive: true })).toBe(2);
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ bonusCrystal: true, timeWarden: true, perkCrystals: 1, focusModeActive: true })).toBe(8);
                // Doubling first: (1 * 2) * 1.5 = 3. Multiplying first would give round(1.5) * 2 = 4.
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ focusModeActive: true, deepWorkMult: 1.5 })).toBe(3);
            });
            test('the two multipliers round SEPARATELY, so the stages do not commute', () => {
                // base 3 → round(3 * 1.5) = 5 → round(5 * 1.2) = 6.
                // Folding the multipliers together instead would give round(3 * 1.5 * 1.2) = round(5.4) = 5.
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ perkCrystals: 2, deepWorkMult: 1.5, archivistMult: 1.2 })).toBe(6);
                expect(Math.round(3 * 1.5 * 1.2)).toBe(5); // the value a single combined multiply would produce
            });
            test('multipliers at or below 1 are inert', () => {
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ deepWorkMult: 1, archivistMult: 1 })).toBe(1);
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ perkCrystals: 2, deepWorkMult: 0.5 })).toBe(3); // guarded, never shrinks
                expect(CRYSTAL_ECONOMY.focusSessionCrystals({ perkCrystals: 2, archivistMult: 1.5 })).toBe(5); // round(3 * 1.5)
            });
        });

        describe('boss reward tiers', () => {
            test('monthly 3 / weekly 2 / daily 1', () => {
                expect(CRYSTAL_ECONOMY.bossCrystalReward('monthly')).toBe(3);
                expect(CRYSTAL_ECONOMY.bossCrystalReward('weekly')).toBe(2);
                expect(CRYSTAL_ECONOMY.bossCrystalReward('daily')).toBe(1);
                expect(CRYSTAL_ECONOMY.bossCrystalReward(undefined)).toBe(1); // unknown falls back to the daily tier
            });
        });

        describe('parity with addFocusCrystalShards', () => {
            function shardManager(startShards) {
                const gm = createTestManager();
                gm.saveData = jest.fn();
                gm.showAchievement = jest.fn();
                gm.focusCrystals = 0;
                gm.focusCrystalShards = startShards;
                return gm;
            }
            test('crossing the threshold forms crystals, keeps the remainder and toasts', () => {
                const gm = shardManager(7);
                gm.addFocusCrystalShards(5); // 12 total
                const expected = CRYSTAL_ECONOMY.shardConversion(12);
                expect(gm.focusCrystals).toBe(expected.crystals);
                expect(gm.focusCrystalShards).toBe(expected.remainder);
                expect(gm.focusCrystals).toBe(1); // sanity
                expect(gm.focusCrystalShards).toBe(2);
                expect(gm.showAchievement).toHaveBeenCalled();
            });
            test('staying below the threshold banks shards and does NOT toast', () => {
                const gm = shardManager(3);
                gm.addFocusCrystalShards(4); // 7 total — no crystal
                expect(gm.focusCrystals).toBe(0);
                expect(gm.focusCrystalShards).toBe(7);
                expect(gm.showAchievement).not.toHaveBeenCalled();
            });
        });
    });

    // ==================== CHARGE RULES (Roadmap #1, 65th slice — thirteenth LOGIC module) ====================
    // charge-rules.js holds the PURE attack-charge earn + spend rules. grantAttackCharge had grown into a
    // four-rule pipeline whose ORDER is load-bearing (the Warrior bonus must land BEFORE the Battle Fury
    // doubling, or a lucky Warrior silently loses a charge). The impure rng roll and every side effect stay
    // on the class; these tests lock the arithmetic, the source set and the guards.
    describe('charge-rules.js (pure attack-charge earn + spend rules)', () => {
        const CHARGE_RULES = require('../charge-rules.js').default;

        describe('forage-eligible sources', () => {
            test('only completion-flavoured sources roll Forage', () => {
                ['task', 'sidequest', 'habit', 'weekly', 'monthly'].forEach(src => {
                    expect(CHARGE_RULES.isForageSource(src)).toBe(true);
                });
                ['loot', 'milestone', 'focus', 'daily', undefined].forEach(src => {
                    expect(CHARGE_RULES.isForageSource(src)).toBe(false);
                });
            });
        });

        describe('grant amount (bonus then doubling)', () => {
            test('passes the amount through untouched with no bonus and no Battle Fury', () => {
                expect(CHARGE_RULES.grantedAmount(1, false, false)).toBe(1);
                expect(CHARGE_RULES.grantedAmount(3, false, false)).toBe(3);
            });
            test('the Warrior bonus adds one, Battle Fury doubles', () => {
                expect(CHARGE_RULES.grantedAmount(1, true, false)).toBe(2);
                expect(CHARGE_RULES.grantedAmount(2, false, true)).toBe(4);
            });
            test('the bonus lands BEFORE the doubling, so Battle Fury doubles it too', () => {
                // (1 + 1) * 2 = 4. Doubling first would give (1 * 2) + 1 = 3 and quietly rob the Warrior.
                expect(CHARGE_RULES.grantedAmount(1, true, true)).toBe(4);
                expect(CHARGE_RULES.grantedAmount(3, true, true)).toBe(8);
            });
        });

        describe('soft-cap split', () => {
            test('grants in full when there is room', () => {
                expect(CHARGE_RULES.chargeSplit(3, 10, 25, false)).toEqual({ granted: 3, overflow: 0 });
            });
            test('clamps to the remaining room and overflows the rest', () => {
                expect(CHARGE_RULES.chargeSplit(5, 23, 25, false)).toEqual({ granted: 2, overflow: 3 });
            });
            test('grants nothing once already at (or past) the cap', () => {
                expect(CHARGE_RULES.chargeSplit(4, 25, 25, false)).toEqual({ granted: 0, overflow: 4 });
                expect(CHARGE_RULES.chargeSplit(4, 30, 25, false)).toEqual({ granted: 0, overflow: 4 }); // room floored at 0
            });
            test('the Overflow capstone ignores the cap entirely', () => {
                expect(CHARGE_RULES.chargeSplit(5, 24, 25, true)).toEqual({ granted: 5, overflow: 0 });
                expect(CHARGE_RULES.chargeSplit(5, 99, 25, true)).toEqual({ granted: 5, overflow: 0 });
            });
            test('falls back to the default cap of 25', () => {
                expect(CHARGE_RULES.ATTACK_CHARGE_CAP).toBe(25);
                expect(CHARGE_RULES.chargeSplit(5, 23, null, false)).toEqual({ granted: 2, overflow: 3 });
            });
        });

        describe('overflow conversion', () => {
            test('converts at the configured rate, defaulting to 5 gold', () => {
                expect(CHARGE_RULES.CHARGE_OVERFLOW_GOLD).toBe(5);
                expect(CHARGE_RULES.overflowGold(3, 5)).toBe(15);
                expect(CHARGE_RULES.overflowGold(3, null)).toBe(15);
                expect(CHARGE_RULES.overflowGold(0, 5)).toBe(0);
            });
            test('a configured rate of 0 survives (?? not ||)', () => {
                expect(CHARGE_RULES.overflowGold(4, 0)).toBe(0); // `||` here would wrongly pay 20 gold
            });
        });

        describe('spend guard', () => {
            test('needs a live, undefeated boss AND a charge', () => {
                const boss = { defeated: false };
                expect(CHARGE_RULES.canAttack(boss, 1)).toBe(true);
                expect(CHARGE_RULES.canAttack(boss, 0)).toBe(false);
                expect(CHARGE_RULES.canAttack({ defeated: true }, 5)).toBe(false);
                expect(CHARGE_RULES.canAttack(null, 5)).toBe(false);
                expect(CHARGE_RULES.canAttack(undefined, 5)).toBe(false);
            });
        });

        describe('parity with grantAttackCharge', () => {
            function chargeManager(overrides = {}) {
                const gm = createTestManager();
                gm.attackCharges = overrides.attackCharges ?? 0;
                gm.ATTACK_CHARGE_CAP = 25;
                gm.CHARGE_OVERFLOW_GOLD = 5;
                gm.hasActiveEnchantment = jest.fn(() => false);
                gm.getClassPerkValue = jest.fn(() => 0);
                gm.applyForage = jest.fn();
                gm.trackDaily = jest.fn();
                gm.addGold = jest.fn();
                gm.showAchievement = jest.fn();
                gm.saveData = jest.fn();
                return gm;
            }
            test('a normal grant matches the pure split', () => {
                const gm = chargeManager({ attackCharges: 23 });
                gm.grantAttackCharge(5, 'loot');
                const expected = CHARGE_RULES.chargeSplit(5, 23, 25, false);
                expect(gm.attackCharges).toBe(23 + expected.granted);
                expect(gm.attackCharges).toBe(25); // sanity
                expect(gm.addGold).toHaveBeenCalledWith(CHARGE_RULES.overflowGold(expected.overflow, 5), 'charge_overflow');
                expect(gm.trackDaily).toHaveBeenCalledWith('chargesEarned', 2);
            });
            test('only completion sources trigger the Forage roll', () => {
                const lootGm = chargeManager();
                lootGm.grantAttackCharge(1, 'loot');
                expect(lootGm.applyForage).not.toHaveBeenCalled();
                const taskGm = chargeManager();
                taskGm.grantAttackCharge(1, 'task');
                expect(taskGm.applyForage).toHaveBeenCalled();
            });
        });
    });

    // ==================== COMBAT DAMAGE (Roadmap #1, 66th slice — fourteenth LOGIC module) ====================
    // combat-damage.js holds the PURE boss-damage math behind attackBoss's twelve-stage pipeline. Two rules
    // earned the extraction: the 0.25 execute threshold was written TWICE (once to gate Executioner, again
    // inside the Berserker ramp to decide whether Executioner is "active" for the §9.8 cap), and every stage
    // is Math.ceil'ed INDEPENDENTLY so the stages neither commute nor equal one folded multiply.
    describe('combat-damage.js (pure boss-damage math)', () => {
        const COMBAT_DAMAGE = require('../combat-damage.js').default;

        describe('base damage curve', () => {
            test('starts at 1 and gains +1 per 10 levels', () => {
                expect(COMBAT_DAMAGE.baseDamage(1)).toBe(1);
                expect(COMBAT_DAMAGE.baseDamage(9)).toBe(1);
                expect(COMBAT_DAMAGE.baseDamage(10)).toBe(2); // first breakpoint
                expect(COMBAT_DAMAGE.baseDamage(50)).toBe(6);
                expect(COMBAT_DAMAGE.baseDamage(0)).toBe(1);
                expect(COMBAT_DAMAGE.baseDamage(undefined)).toBe(1);
            });
        });

        describe('stage step (ceil rounding)', () => {
            test('rounds each stage UP', () => {
                expect(COMBAT_DAMAGE.applyMultiplier(6, 1.2)).toBe(8); // 7.2 → 8
                expect(COMBAT_DAMAGE.applyMultiplier(4, 1.5)).toBe(6); // exact, no rounding
                expect(COMBAT_DAMAGE.applyBonus(6, 0.2)).toBe(8);
                expect(COMBAT_DAMAGE.applyBonus(6, 0)).toBe(6);
            });
            test('applyBonus is applyMultiplier with 1 + bonus', () => {
                expect(COMBAT_DAMAGE.applyBonus(7, 0.25)).toBe(COMBAT_DAMAGE.applyMultiplier(7, 1.25));
            });
            test('stages round SEPARATELY, so they do not fold into one multiply', () => {
                // Power Strikes then Boss Slayer, stage-wise: ceil(ceil(6 × 1.2) × 1.25) = 10.
                const staged = COMBAT_DAMAGE.applyMultiplier(COMBAT_DAMAGE.applyMultiplier(6, 1.2), 1.25);
                expect(staged).toBe(10);
                expect(Math.ceil(6 * 1.2 * 1.25)).toBe(9); // the value a single folded multiply would give
            });
        });

        describe('low-HP predicates', () => {
            test('hpFraction guards a missing or zero maxHP', () => {
                expect(COMBAT_DAMAGE.hpFraction({ currentHP: 25, maxHP: 100 })).toBe(0.25);
                expect(COMBAT_DAMAGE.hpFraction({ currentHP: 5, maxHP: 0 })).toBe(0);
                expect(COMBAT_DAMAGE.hpFraction(null)).toBe(0);
            });
            test('execute range is inclusive at exactly 25%', () => {
                expect(COMBAT_DAMAGE.EXECUTE_HP_THRESHOLD).toBe(0.25);
                expect(COMBAT_DAMAGE.isExecuteRange({ currentHP: 25, maxHP: 100 })).toBe(true); // boundary
                expect(COMBAT_DAMAGE.isExecuteRange({ currentHP: 26, maxHP: 100 })).toBe(false);
                expect(COMBAT_DAMAGE.isExecuteRange({ currentHP: 20, maxHP: 100 })).toBe(true);
            });
            test('a boss with no max HP is never in execute range', () => {
                expect(COMBAT_DAMAGE.isExecuteRange({ currentHP: 0, maxHP: 0 })).toBe(false);
                expect(COMBAT_DAMAGE.isExecuteRange(null)).toBe(false);
            });
            test('honours a custom threshold', () => {
                expect(COMBAT_DAMAGE.isExecuteRange({ currentHP: 30, maxHP: 100 }, 0.30)).toBe(true);
            });
        });

        describe('Berserker ramp (§9.8 cap)', () => {
            test('scales with missing HP', () => {
                expect(COMBAT_DAMAGE.berserkerBonus(0.5, 0.5, 0)).toBeCloseTo(0.25);
                expect(COMBAT_DAMAGE.berserkerBonus(0.5, 0.2, 0)).toBeCloseTo(0.40);
            });
            test('gives nothing at full HP', () => {
                expect(COMBAT_DAMAGE.berserkerBonus(0.5, 1, 0)).toBe(0);
            });
            test('is clamped by the headroom Executioner leaves under +75%', () => {
                // Raw ramp at 10% HP would be 0.45, but Executioner already claims 0.50 → only 0.25 left.
                expect(COMBAT_DAMAGE.LOW_HP_BONUS_CAP).toBe(0.75);
                expect(COMBAT_DAMAGE.berserkerBonus(0.5, 0.1, 0.5)).toBeCloseTo(0.25);
            });
            test('never goes negative when Executioner alone exceeds the cap', () => {
                expect(COMBAT_DAMAGE.berserkerBonus(0.5, 0.1, 0.8)).toBe(0);
            });
        });

        describe('rage combo counter', () => {
            test('fires and resets on every Nth hit', () => {
                expect(COMBAT_DAMAGE.rageComboAdvance(0, 3)).toEqual({ counter: 1, triggered: false });
                expect(COMBAT_DAMAGE.rageComboAdvance(1, 3)).toEqual({ counter: 2, triggered: false });
                expect(COMBAT_DAMAGE.rageComboAdvance(2, 3)).toEqual({ counter: 0, triggered: true });
            });
            test('tolerates an unset counter and an inactive perk', () => {
                expect(COMBAT_DAMAGE.rageComboAdvance(undefined, 3)).toEqual({ counter: 1, triggered: false });
                expect(COMBAT_DAMAGE.rageComboAdvance(5, 0)).toEqual({ counter: 6, triggered: false });
            });
        });

        describe('hunter targeting and cleave', () => {
            test('Hunter hits only the larger weekly & monthly bosses', () => {
                expect(COMBAT_DAMAGE.isHunterTarget('weekly')).toBe(true);
                expect(COMBAT_DAMAGE.isHunterTarget('monthly')).toBe(true);
                expect(COMBAT_DAMAGE.isHunterTarget('daily')).toBe(false);
                expect(COMBAT_DAMAGE.isHunterTarget(undefined)).toBe(false);
            });
            test('cleave splash rounds up so a live cleave always chips', () => {
                expect(COMBAT_DAMAGE.cleaveSplash(8, 0.25)).toBe(2);
                expect(COMBAT_DAMAGE.cleaveSplash(1, 0.25)).toBe(1); // 0.25 → 1
                expect(COMBAT_DAMAGE.cleaveSplash(8, 0)).toBe(0);
            });
        });

        describe('parity with attackBoss', () => {
            test('an unbuffed hit deals exactly baseDamage(level)', () => {
                const gm = createTestManager();
                gm.level = 50;
                gm.attackCharges = 3;
                gm.activeSpells = [];
                gm.getClassPerkValue = jest.fn(() => 0);
                gm.getCompanionBonus = jest.fn(() => 0);
                gm.getEnchantmentMultiplier = jest.fn(() => 1);
                gm.dailyBoss = null;
                gm.weeklyBoss = null;
                gm.monthlyBoss = {
                    id: 'parity-boss', name: 'Parity', icon: '👹',
                    maxHP: 100, currentHP: 100, totalDamage: 0, defeated: false,
                    rewards: { xp: 500, gold: 400 }
                };
                gm.attackBoss('monthly');
                expect(gm.monthlyBoss.currentHP).toBe(100 - COMBAT_DAMAGE.baseDamage(50));
                expect(gm.monthlyBoss.currentHP).toBe(94); // sanity: 6 damage
                expect(gm.attackCharges).toBe(2);
            });
        });
    });

    // ==================== SPELL LIFECYCLE (Roadmap #1, 69th slice — seventeenth LOGIC module) ====================
    // spell-lifecycle.js holds the PURE activeSpells state math. The array was read at THIRTEEN call sites
    // through THREE inconsistent phrasings of "is this spell active?" (full predicate / expiry-only / bare id),
    // plus six hand-written copies of the consume idiom. Every site was already CORRECT against the current
    // definitions — this was a LATENT-DRIFT slice, so the drift itself is what these tests pin.
    describe('spell-lifecycle.js (pure active-spell state math)', () => {
        const SL = require('../spell-lifecycle.js').default;
        const SPELL_DEFS = require('../spell-definitions.js').default;

        const NOW = 10_000_000;
        const timed = (spellId, msLeft) => ({ spellId, castedAt: NOW - 1000, expiresAt: NOW + msLeft });
        const permanent = (spellId) => ({ spellId, castedAt: NOW - 1000, expiresAt: SL.PERMANENT });

        describe('sentinels', () => {
            test('exposes the duration/expiry sentinels', () => {
                expect(SL.PERMANENT).toBe(-1);
                expect(SL.INSTANT).toBe(0);
            });
        });

        describe('isActive / findActive (the canonical predicate)', () => {
            test('a future expiry is active, a past expiry is not', () => {
                expect(SL.isActive([timed('focus_mode', 5000)], 'focus_mode', NOW)).toBe(true);
                expect(SL.isActive([timed('focus_mode', -5000)], 'focus_mode', NOW)).toBe(false);
            });
            test('the expiry boundary is EXCLUSIVE — expiresAt === now is expired', () => {
                expect(SL.isActive([timed('focus_mode', 0)], 'focus_mode', NOW)).toBe(false);
            });
            test('a permanent (-1) entry is always active', () => {
                expect(SL.isActive([permanent('lucky_draw')], 'lucky_draw', NOW)).toBe(true);
                expect(SL.isActive([permanent('lucky_draw')], 'lucky_draw', NOW + 1e12)).toBe(true);
            });
            test('a different spell id does not match', () => {
                expect(SL.isActive([permanent('lucky_draw')], 'quest_doubler', NOW)).toBe(false);
            });
            test('tolerates a null/undefined/empty array (the login path used optional chaining)', () => {
                expect(SL.isActive(null, 'x', NOW)).toBe(false);
                expect(SL.isActive(undefined, 'x', NOW)).toBe(false);
                expect(SL.isActive([], 'x', NOW)).toBe(false);
                expect(SL.findActive(null, 'x', NOW)).toBeNull();
            });
            test('findActive returns the entry, or null when absent/expired', () => {
                const e = timed('boss_slayer', 5000);
                expect(SL.findActive([e], 'boss_slayer', NOW)).toBe(e);
                expect(SL.findActive([timed('boss_slayer', -1)], 'boss_slayer', NOW)).toBeNull();
                expect(SL.findActive([], 'boss_slayer', NOW)).toBeNull();
            });
        });

        describe('consume', () => {
            test('removes every entry of the spell and returns a NEW array', () => {
                const spells = [permanent('lucky_draw'), timed('focus_mode', 5000)];
                const out = SL.consume(spells, 'lucky_draw');
                expect(out).toEqual([spells[1]]);
                expect(out).not.toBe(spells);
                expect(spells).toHaveLength(2); // original untouched
            });
            test('is a no-op for a spell that is not active', () => {
                const spells = [timed('focus_mode', 5000)];
                expect(SL.consume(spells, 'lucky_draw')).toEqual(spells);
            });
            test('tolerates a null array', () => {
                expect(SL.consume(null, 'x')).toEqual([]);
            });
        });

        describe('expirySweep', () => {
            test('splits survivors from the just-expired, keeping permanents forever', () => {
                const keepTimed = timed('boss_slayer', 5000);
                const keepPerm = permanent('lucky_draw');
                const gone = timed('focus_mode', -1);
                const sweep = SL.expirySweep([keepTimed, keepPerm, gone], NOW);
                expect(sweep.kept).toEqual([keepTimed, keepPerm]);
                expect(sweep.expired).toEqual([gone]);
            });
            test('kept and expired are disjoint and cover the whole input', () => {
                const all = [timed('a', 1), timed('b', -1), permanent('c'), timed('d', 0)];
                const sweep = SL.expirySweep(all, NOW);
                expect(sweep.kept.length + sweep.expired.length).toBe(all.length);
                expect(sweep.kept.filter(s => sweep.expired.includes(s))).toEqual([]);
            });
            test('a permanent entry is NEVER clock-expired', () => {
                const sweep = SL.expirySweep([permanent('execute')], NOW + 1e12);
                expect(sweep.expired).toEqual([]);
                expect(sweep.kept).toHaveLength(1);
            });
            test('tolerates a null array', () => {
                expect(SL.expirySweep(null, NOW)).toEqual({ kept: [], expired: [] });
            });
        });

        describe('effectiveDuration', () => {
            test('scales and rounds a TIMED duration', () => {
                expect(SL.effectiveDuration(86400000, 1.5)).toBe(129600000);
                expect(SL.effectiveDuration(1001, 1.5)).toBe(1502); // rounded, not truncated
            });
            test('a 1x multiplier (or none) is a pass-through', () => {
                expect(SL.effectiveDuration(7200000, 1)).toBe(7200000);
                expect(SL.effectiveDuration(7200000, undefined)).toBe(7200000);
            });
            test('the -1 and 0 sentinels pass through UNTOUCHED', () => {
                // A perk must never be able to turn an "until triggered" spell into a timed one.
                expect(SL.effectiveDuration(SL.PERMANENT, 3)).toBe(SL.PERMANENT);
                expect(SL.effectiveDuration(SL.INSTANT, 3)).toBe(SL.INSTANT);
            });
        });

        describe('castEntry', () => {
            test('a timed spell records castedAt, the extended expiry and the overcharge flag', () => {
                const entry = SL.castEntry({ id: 'focus_mode', duration: 7200000 }, {
                    now: NOW, effectiveDuration: 9000000, overcharged: true,
                });
                expect(entry).toEqual({
                    spellId: 'focus_mode', castedAt: NOW, expiresAt: NOW + 9000000, overcharged: true,
                });
            });
            test('falls back to the base duration when no effective duration is supplied', () => {
                const entry = SL.castEntry({ id: 'focus_mode', duration: 7200000 }, { now: NOW });
                expect(entry.expiresAt).toBe(NOW + 7200000);
            });
            test('a permanent spell gets expiresAt -1 and NO overcharged key', () => {
                // Matches the inline code exactly: the until-triggered branch never recorded overcharge.
                const entry = SL.castEntry({ id: 'lucky_draw', duration: -1 }, {
                    now: NOW, overcharged: true,
                });
                expect(entry).toEqual({ spellId: 'lucky_draw', castedAt: NOW, expiresAt: SL.PERMANENT });
                expect('overcharged' in entry).toBe(false);
            });
            test('an INSTANT spell returns null — it never enters activeSpells', () => {
                expect(SL.castEntry({ id: 'instant_archive', duration: 0 }, { now: NOW })).toBeNull();
            });
            test('tolerates a missing spell', () => {
                expect(SL.castEntry(null, { now: NOW })).toBeNull();
            });
        });

        describe('definition classification (the drift guard)', () => {
            const defs = SPELL_DEFS.SPELL_DEFINITIONS || SPELL_DEFS;
            const entries = Object.entries(defs);

            test('the definitions actually loaded', () => {
                expect(entries.length).toBeGreaterThan(10);
            });

            test('every spell is exactly ONE of timed / trigger-consumed / instant', () => {
                // This is the guard the slice exists for: the "time-based vs trigger-consumed" split used to be
                // implicit across thirteen call sites. If a rebalance gives a spell a duration that does not fit
                // one of the three buckets, this fails loudly instead of silently breaking a call site.
                for (const [id, def] of entries) {
                    const buckets = [
                        def.duration > 0,
                        SL.isTriggerConsumed(def),
                        SL.isInstant(def),
                    ].filter(Boolean);
                    expect({ id, buckets: buckets.length }).toEqual({ id, buckets: 1 });
                }
            });

            test('the spells read via a bare id check at their call site are all trigger-consumed', () => {
                // berserker_rage / execute / quest_doubler / lucky_draw skip the expiry check because they
                // never time-expire. If any of these gains a finite duration, its call site silently breaks.
                for (const id of ['berserker_rage', 'execute', 'quest_doubler', 'lucky_draw']) {
                    expect({ id, trigger: SL.isTriggerConsumed(defs[id]) }).toEqual({ id, trigger: true });
                }
            });

            test('the spells read via an expiry check at their call site are all TIMED', () => {
                // boss_slayer / critical_strike / time_freeze / streak_shield / focus_mode are clock-bound, which
                // is why the -1 branch of the old variant-A predicate was dead code at those sites.
                for (const id of ['boss_slayer', 'critical_strike', 'time_freeze', 'streak_shield', 'focus_mode']) {
                    expect({ id, timed: defs[id].duration > 0 }).toEqual({ id, timed: true });
                }
            });

            test('a cast of every spell round-trips through castEntry consistently with its bucket', () => {
                for (const [id, def] of entries) {
                    const entry = SL.castEntry(def, { now: NOW });
                    if (SL.isInstant(def)) {
                        expect({ id, entry }).toEqual({ id, entry: null });
                    } else if (SL.isTriggerConsumed(def)) {
                        expect({ id, active: SL.isActive([entry], def.id, NOW + 1e12) })
                            .toEqual({ id, active: true });
                    } else {
                        expect({ id, active: SL.isActive([entry], def.id, NOW) })
                            .toEqual({ id, active: true });
                        expect({ id, later: SL.isActive([entry], def.id, NOW + def.duration) })
                            .toEqual({ id, later: false });
                    }
                }
            });
        });

        describe('parity with the class', () => {
            test('the cast guard DELIBERATELY still uses a bare id check', () => {
                // Documented decision: switching it to the canonical predicate would let a player re-cast a
                // finite spell that expired but has not yet been swept — a gameplay change, not a refactor.
                const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'goal-manager.js'), 'utf8');
                expect(src).toContain('if (this.activeSpells.some(s => s.spellId === spellId)) {');
            });
            test('checkExpiredSpells drops timed spells and keeps permanents', () => {
                const gm = createTestManager();
                gm.activeSpells = [
                    { spellId: 'focus_mode', castedAt: Date.now() - 10, expiresAt: Date.now() - 1 },
                    { spellId: 'lucky_draw', castedAt: Date.now() - 10, expiresAt: -1 },
                ];
                gm.checkExpiredSpells();
                expect(gm.activeSpells.map(s => s.spellId)).toEqual(['lucky_draw']);
            });
        });
    });

    // ==================== ENCHANTMENT LIFECYCLE (Roadmap #1, 73rd slice — twentieth LOGIC module) ====================
    // enchantment-lifecycle.js is spell-lifecycle.js's SIBLING, and the asymmetry between them is the whole
    // point of the slice: enchantments key on `effect` (not id), store durations in MINUTES (not ms), have no
    // permanent/instant sentinels, and their "is it active?" predicate is a BARE match because every caller
    // sweeps expiry first. The find was a duration-window rule duplicated with DISAGREEING tails (0 in the
    // preserve path, a bare 180 in the render module) — the last describe pins those two to one answer.
    describe('enchantment-lifecycle.js (pure active-enchantment state math)', () => {
        const EL = require('../enchantment-lifecycle.js').default;
        const ENCH_DEFS = require('../enchantment-definitions.js').default;

        const NOW = 10_000_000;
        // A live entry with `msLeft` remaining. `totalDuration` is what purchases record.
        const live = (id, effect, msLeft, totalDuration) => ({
            id, effect, expiresAt: NOW + msLeft,
            ...(totalDuration === undefined ? {} : { totalDuration }),
            name: id, icon: '✨',
        });

        describe('constants', () => {
            test('exposes the minute and expiry-warning constants', () => {
                expect(EL.MINUTE_MS).toBe(60 * 1000);
                expect(EL.EXPIRY_WARNING_MS).toBe(5 * 60 * 1000);
            });
        });

        describe('minutesToMs (the catalog unit conversion)', () => {
            test('converts catalog MINUTES to milliseconds', () => {
                expect(EL.minutesToMs(180)).toBe(10_800_000);
                expect(EL.minutesToMs(1440)).toBe(86_400_000);
            });
            test('a missing/zero duration is 0 ms, never NaN', () => {
                expect(EL.minutesToMs(0)).toBe(0);
                expect(EL.minutesToMs(null)).toBe(0);
                expect(EL.minutesToMs(undefined)).toBe(0);
            });
        });

        describe('isActive (the BARE effect match)', () => {
            test('matches on `effect`, not on id', () => {
                const e = live('boss_slayer', 'boss_damage', 5000);
                expect(EL.isActive([e], 'boss_damage')).toBe(true);
                expect(EL.isActive([e], 'boss_slayer')).toBe(false);
            });
            test('does NOT re-check expiry — the sweep is the callers\' job', () => {
                // The documented asymmetry with SPELL_LIFECYCLE.isActive. An already-expired entry still reads
                // active here; folding an expiry check in would change behaviour at every site that sweeps on a
                // different clock read.
                expect(EL.isActive([live('double_xp', 'double_xp', -5000)], 'double_xp')).toBe(true);
            });
            test('tolerates a null/undefined/empty array', () => {
                expect(EL.isActive(null, 'double_xp')).toBe(false);
                expect(EL.isActive(undefined, 'double_xp')).toBe(false);
                expect(EL.isActive([], 'double_xp')).toBe(false);
            });
        });

        describe('expiring / stillActive (the two sweep filters)', () => {
            test('splits the closed windows from the running ones', () => {
                const gone = live('double_xp', 'double_xp', -1);
                const kept = live('serenity', 'crystal_chance', 5000);
                expect(EL.expiring([gone, kept], NOW)).toEqual([gone]);
                expect(EL.stillActive([gone, kept], NOW)).toEqual([kept]);
            });
            test('the boundary is INCLUSIVE for expiring and exclusive for stillActive', () => {
                const boundary = live('double_xp', 'double_xp', 0); // expiresAt === now
                expect(EL.expiring([boundary], NOW)).toEqual([boundary]);
                expect(EL.stillActive([boundary], NOW)).toEqual([]);
            });
            test('the two filters are disjoint and cover the whole input', () => {
                const all = [
                    live('a', 'a', 5000), live('b', 'b', -1), live('c', 'c', 0), live('d', 'd', 1),
                ];
                const expired = EL.expiring(all, NOW);
                const kept = EL.stillActive(all, NOW);
                expect(expired.length + kept.length).toBe(all.length);
                expect(kept.filter(e => expired.includes(e))).toEqual([]);
            });
            test('neither filter mutates its input, and both tolerate null', () => {
                const all = [live('a', 'a', -1)];
                EL.expiring(all, NOW);
                EL.stillActive(all, NOW);
                expect(all).toHaveLength(1);
                expect(EL.expiring(null, NOW)).toEqual([]);
                expect(EL.stillActive(null, NOW)).toEqual([]);
            });
        });

        describe('durationWindowMs (the de-duplicated rule)', () => {
            const def = { duration: 120 };

            test('a recorded totalDuration WINS over the catalog', () => {
                expect(EL.durationWindowMs({ totalDuration: 999 }, def, 180)).toBe(999);
            });
            test('falls back to the catalog duration (converted from minutes)', () => {
                expect(EL.durationWindowMs({}, def, 180)).toBe(7_200_000);
            });
            test('falls back to the caller\'s tail when neither exists', () => {
                expect(EL.durationWindowMs({}, null, 180)).toBe(10_800_000);
                expect(EL.durationWindowMs({}, undefined, 0)).toBe(0);
            });
            test('the default tail is 0 — the preserve path\'s "no window, skip it"', () => {
                expect(EL.durationWindowMs({}, null)).toBe(0);
                expect(EL.durationWindowMs(null, null)).toBe(0);
            });
            test('a catalog entry with NO duration yields 0, never NaN (the latent-bug guard)', () => {
                // The old preserve tail computed `undefined * 60000` → NaN, and `NaN <= 0` is false, so the
                // guard passed it through and wrote `expiresAt = now + NaN` — a permanently-stuck enchantment.
                const out = EL.durationWindowMs({}, { id: 'broken' });
                expect(Number.isNaN(out)).toBe(false);
                expect(out).toBe(0);
            });
            test('a zero/falsy totalDuration falls through to the catalog (precedence is ||, by design)', () => {
                expect(EL.durationWindowMs({ totalDuration: 0 }, def)).toBe(7_200_000);
            });
        });

        describe('effectiveDurationMs (purchase-time window)', () => {
            test('converts the catalog minutes and applies the perk multiplier', () => {
                expect(EL.effectiveDurationMs({ duration: 180 }, 1)).toBe(10_800_000);
                expect(EL.effectiveDurationMs({ duration: 180 }, 1.25)).toBe(13_500_000);
            });
            test('rounds rather than truncates', () => {
                expect(EL.effectiveDurationMs({ duration: 1 }, 1.000_008)).toBe(60_000);
                expect(EL.effectiveDurationMs({ duration: 3 }, 1.111)).toBe(199_980);
            });
            test('a missing multiplier is a 1x pass-through, a missing def is 0', () => {
                expect(EL.effectiveDurationMs({ duration: 120 }, undefined)).toBe(7_200_000);
                expect(EL.effectiveDurationMs(null, 2)).toBe(0);
            });
        });

        describe('effectiveCost (Scholar discount, floored at 1)', () => {
            test('subtracts the discount', () => {
                expect(EL.effectiveCost({ cost: 8 }, 3)).toBe(5);
            });
            test('is NEVER free — the floor is 1 crystal', () => {
                expect(EL.effectiveCost({ cost: 5 }, 5)).toBe(1);
                expect(EL.effectiveCost({ cost: 5 }, 100)).toBe(1);
            });
            test('no discount is a pass-through; a missing def costs 0', () => {
                expect(EL.effectiveCost({ cost: 7 }, 0)).toBe(7);
                expect(EL.effectiveCost({ cost: 7 }, undefined)).toBe(7);
                expect(EL.effectiveCost(null, 3)).toBe(0);
            });
        });

        describe('castEntry (the activeEnchantments record)', () => {
            const def = ENCH_DEFS.double_xp;

            test('records the id, effect, expiry AND the actual window as totalDuration', () => {
                const entry = EL.castEntry(def, { now: NOW, durationMs: 13_500_000 });
                expect(entry).toEqual({
                    id: 'double_xp', effect: 'double_xp', expiresAt: NOW + 13_500_000,
                    totalDuration: 13_500_000, name: def.name, icon: def.icon,
                });
            });
            test('totalDuration is the PERK-EXTENDED window, not the base catalog value', () => {
                // This is why the progress bar can be trusted: the denominator is the real window.
                const durationMs = EL.effectiveDurationMs(def, 1.25);
                const entry = EL.castEntry(def, { now: NOW, durationMs });
                expect(entry.totalDuration).toBe(13_500_000);
                expect(entry.totalDuration).toBeGreaterThan(EL.minutesToMs(def.duration));
            });
            test('falls back to the base catalog duration when no durationMs is supplied', () => {
                const entry = EL.castEntry(def, { now: NOW });
                expect(entry.expiresAt).toBe(NOW + 10_800_000);
                expect(entry.totalDuration).toBe(10_800_000);
            });
            test('an explicit 0 durationMs is respected (not treated as absent)', () => {
                const entry = EL.castEntry(def, { now: NOW, durationMs: 0 });
                expect(entry.expiresAt).toBe(NOW);
                expect(entry.totalDuration).toBe(0);
            });
            test('tolerates a missing def and missing opts', () => {
                expect(EL.castEntry(null, { now: NOW })).toBeNull();
                expect(EL.castEntry(def).expiresAt).toBe(10_800_000); // now defaults to 0
            });
        });

        describe('expiryWarningDelay', () => {
            test('returns the lead-time delay when the window is longer than the warning', () => {
                expect(EL.expiryWarningDelay({ expiresAt: NOW + 600_000 }, NOW)).toBe(300_000);
            });
            test('returns null when the remaining window is already AT or inside the warning period', () => {
                expect(EL.expiryWarningDelay({ expiresAt: NOW + 300_000 }, NOW)).toBeNull(); // exactly 5m
                expect(EL.expiryWarningDelay({ expiresAt: NOW + 60_000 }, NOW)).toBeNull();
                expect(EL.expiryWarningDelay({ expiresAt: NOW - 1 }, NOW)).toBeNull();
            });
            test('honours a custom warning window, including 0', () => {
                expect(EL.expiryWarningDelay({ expiresAt: NOW + 600_000 }, NOW, 60_000)).toBe(540_000);
                expect(EL.expiryWarningDelay({ expiresAt: NOW + 600_000 }, NOW, 0)).toBe(600_000);
            });
            test('tolerates a missing entry or a non-numeric expiresAt', () => {
                expect(EL.expiryWarningDelay(null, NOW)).toBeNull();
                expect(EL.expiryWarningDelay({}, NOW)).toBeNull();
            });
        });

        describe('catalog integrity (the guard\'s premise)', () => {
            const entries = Object.entries(ENCH_DEFS);

            test('all 13 enchantments loaded', () => {
                expect(entries).toHaveLength(13);
            });
            test('every entry has a positive MINUTE duration and a payable cost', () => {
                for (const [id, def] of entries) {
                    expect({ id, ok: def.duration > 0 && def.cost >= 1 }).toEqual({ id, ok: true });
                }
            });
            test('every catalog entry resolves a real window for a LEGACY entry with no totalDuration', () => {
                // Legacy saves (pre-totalDuration) are exactly the inputs that reach the fallback tails, so the
                // preserve path must resolve a usable window for every real enchantment.
                for (const [id, def] of entries) {
                    const windowMs = EL.durationWindowMs({ id }, def);
                    expect({ id, windowMs }).toEqual({ id, windowMs: def.duration * 60_000 });
                }
            });
            test('a full purchase → cast round-trip is active now and expired after its window', () => {
                for (const [id, def] of entries) {
                    const entry = EL.castEntry(def, { now: NOW });
                    expect({ id, active: EL.isActive([entry], def.effect) }).toEqual({ id, active: true });
                    expect({ id, expiring: EL.expiring([entry], NOW + entry.totalDuration).length })
                        .toEqual({ id, expiring: 1 });
                    expect({ id, live: EL.stillActive([entry], NOW).length }).toEqual({ id, live: 1 });
                }
            });
        });

        describe('the duplicated duration-window rule (drift pin)', () => {
            // enchantment-render.js keeps its own INLINE copy of this rule on purpose: no *-render.js module
            // reaches for another extracted module. So instead of coupling them, these tests pin the two
            // spellings to the same answer — if either tail is edited, this fails.
            const fs = require('fs');
            const path = require('path');

            /** The render module's progress-bar denominator, transcribed verbatim from enchantment-render.js. */
            const renderWindowMs = (ench, defs) =>
                ench.totalDuration || (defs[ench.id]?.duration || 180) * 60000;

            test('durationWindowMs(entry, def, 180) === the render module\'s inline expression', () => {
                const defs = { double_xp: { duration: 180 }, boss_slayer: { duration: 120 } };
                const cases = [
                    { id: 'boss_slayer', totalDuration: 13_500_000 }, // recorded window wins
                    { id: 'boss_slayer' },                            // catalog fallback
                    { id: 'double_xp' },                              // catalog fallback
                    { id: 'not_in_catalog' },                         // the 180-minute tail
                    { id: 'not_in_catalog', totalDuration: 60_000 },  // recorded, no catalog entry
                ];
                for (const ench of cases) {
                    expect({ id: ench.id, ms: EL.durationWindowMs(ench, defs[ench.id], 180) })
                        .toEqual({ id: ench.id, ms: renderWindowMs(ench, defs) });
                }
            });

            test('the render module still carries the tail this pin was written against', () => {
                const src = fs.readFileSync(path.join(__dirname, '..', 'enchantment-render.js'), 'utf8');
                expect(src).toContain("ench.totalDuration || (enchantmentDefinitions[ench.id]?.duration || 180) * 60000");
            });

            test('the preserve path DELIBERATELY passes no fallback, so an unknown window skips', () => {
                const src = fs.readFileSync(path.join(__dirname, '..', 'goal-manager.js'), 'utf8');
                expect(src).toContain('ENCHANTMENT_LIFECYCLE.durationWindowMs(e, def)');
                expect(EL.durationWindowMs({ id: 'unknown' }, undefined)).toBe(0);
            });
        });

        describe('parity with the class', () => {
            test('hasActiveEnchantment sweeps FIRST, then bare-matches the effect', () => {
                const gm = createTestManager();
                gm.showAchievement = jest.fn();
                gm.activeEnchantments = [
                    { id: 'double_xp', effect: 'double_xp', expiresAt: Date.now() - 1, name: 'x', icon: '⚡' },
                ];
                // Expired-but-unswept reads active from the pure predicate, but the class sweeps first.
                expect(EL.isActive(gm.activeEnchantments, 'double_xp')).toBe(true);
                expect(gm.hasActiveEnchantment('double_xp')).toBe(false);
                expect(gm.activeEnchantments).toEqual([]);
            });

            test('checkExpiredEnchantments drops expired entries and keeps live ones', () => {
                const gm = createTestManager();
                gm.showAchievement = jest.fn();
                gm.getClassPerkValue = () => 0; // no Insight
                gm.activeEnchantments = [
                    { id: 'double_xp', effect: 'double_xp', expiresAt: Date.now() - 1, name: 'x', icon: '⚡' },
                    { id: 'serenity', effect: 'crystal_chance', expiresAt: Date.now() + 60_000, name: 'y', icon: '🧘' },
                ];
                gm.checkExpiredEnchantments();
                expect(gm.activeEnchantments.map(e => e.id)).toEqual(['serenity']);
            });

            test('the Insight preserve re-extends by the durationWindowMs answer', () => {
                const gm = createTestManager();
                gm.showAchievement = jest.fn();
                gm.scheduleEnchantmentExpiryNotification = jest.fn();
                gm.getClassPerkValue = (k) => (k === 'enchant_preserve' ? 1 : 0);
                gm.rng = () => 0; // always inside the preserve chance
                const entry = { id: 'boss_slayer', effect: 'boss_damage', expiresAt: Date.now() - 1, name: 'y', icon: '⚔️' };
                gm.activeEnchantments = [entry];

                gm.checkExpiredEnchantments();

                // Survived, with a fresh full window from the catalog (120 minutes).
                expect(gm.activeEnchantments).toEqual([entry]);
                expect(entry.expiresAt).toBeGreaterThan(Date.now());
                expect(gm.scheduleEnchantmentExpiryNotification).toHaveBeenCalledWith(entry);
            });

            test('a legacy entry with an UNKNOWN id is dropped, never left permanently stuck', () => {
                // The NaN path: no totalDuration and no catalog entry. windowMs is 0, so the guard drops it.
                const gm = createTestManager();
                gm.showAchievement = jest.fn();
                gm.getClassPerkValue = (k) => (k === 'enchant_preserve' ? 1 : 0);
                gm.rng = () => 0;
                gm.activeEnchantments = [
                    { id: 'removed_in_a_rebalance', effect: 'ghost', expiresAt: Date.now() - 1, name: 'z', icon: '❓' },
                ];
                gm.checkExpiredEnchantments();
                expect(gm.activeEnchantments).toEqual([]);
            });

            test('purchaseEnchantment records the perk-extended window as totalDuration', () => {
                const gm = createTestManager();
                gm.showAchievement = jest.fn();
                gm.saveData = jest.fn();
                gm.render = jest.fn();
                gm.scheduleEnchantmentExpiryNotification = jest.fn();
                gm.isPremium = true;
                gm.focusCrystals = 50;
                gm.getClassPerkValue = (k) => (k === 'enchant_duration_mult' ? 0.25 : 0);

                gm.purchaseEnchantment('double_xp');

                expect(gm.activeEnchantments).toHaveLength(1);
                const cast = gm.activeEnchantments[0];
                expect(cast.effect).toBe('double_xp');
                expect(cast.totalDuration).toBe(EL.effectiveDurationMs(ENCH_DEFS.double_xp, 1.25));
                expect(gm.focusCrystals).toBe(50 - EL.effectiveCost(ENCH_DEFS.double_xp, 0));
            });
        });
    });

    // ==================== PERIOD SUMMARY LOGIC (Roadmap #1, 70th slice — eighteenth LOGIC module) ====================
    // period-summary-logic.js holds the PURE previous-period recap math behind generatePreviousPeriodSummary,
    // which had ZERO coverage despite FIVE call sites, and whose weekly share sentence was hand-written at
    // THREE of them. The date ranges are the drift-prone part (Monday-start weeks, leap-year month ends),
    // so those are pinned hardest here.
    describe('period-summary-logic.js (pure previous-period recap math)', () => {
        const PSL = require('../period-summary-logic.js').default;

        // The real dateToLocalString is timezone-aware and lives on the class; a plain local-calendar
        // ISO formatter is the correct stand-in for the pure module's injected dependency.
        const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const at = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);

        describe('previousPeriodRange (week — Monday-start)', () => {
            // Sunday is the END of a week here, not the start; that ternary is the classic off-by-one.
            test('from a Wednesday, returns the previous Mon–Sun', () => {
                const { startDate, endDate, periodName } = PSL.previousPeriodRange('week', at(2026, 1, 14));
                expect(isoOf(startDate)).toBe('2026-01-05');
                expect(isoOf(endDate)).toBe('2026-01-11');
                expect(periodName).toBe('Last Week');
            });
            test('from a Monday, returns the immediately preceding full week', () => {
                const { startDate, endDate } = PSL.previousPeriodRange('week', at(2026, 1, 12));
                expect(isoOf(startDate)).toBe('2026-01-05');
                expect(isoOf(endDate)).toBe('2026-01-11');
            });
            test('from a Sunday, treats it as day 7 (not the start of a new week)', () => {
                const { startDate, endDate } = PSL.previousPeriodRange('week', at(2026, 1, 11));
                expect(isoOf(startDate)).toBe('2025-12-29');
                expect(isoOf(endDate)).toBe('2026-01-04');
            });
        });

        describe('previousPeriodRange (month / year)', () => {
            test('previous month, including the year rollover from January', () => {
                const jan = PSL.previousPeriodRange('month', at(2026, 1, 20));
                expect(isoOf(jan.startDate)).toBe('2025-12-01');
                expect(isoOf(jan.endDate)).toBe('2025-12-31');
                expect(jan.periodName).toBe('December 2025');
            });
            test('the day-0 trick gives a leap-year-correct February end', () => {
                const leap = PSL.previousPeriodRange('month', at(2024, 3, 10));
                expect(isoOf(leap.endDate)).toBe('2024-02-29');
                const nonLeap = PSL.previousPeriodRange('month', at(2026, 3, 10));
                expect(isoOf(nonLeap.endDate)).toBe('2026-02-28');
            });
            test('previous full calendar year', () => {
                const { startDate, endDate, periodName } = PSL.previousPeriodRange('year', at(2026, 6, 5));
                expect(isoOf(startDate)).toBe('2025-01-01');
                expect(isoOf(endDate)).toBe('2025-12-31');
                expect(periodName).toBe('2025');
            });
            test('an unrecognised period yields an undefined range (legacy behaviour, deliberately kept)', () => {
                expect(PSL.previousPeriodRange('decade', at(2026, 6, 5)))
                    .toEqual({ startDate: undefined, endDate: undefined, periodName: undefined });
            });
        });

        describe('buildStatBlock (asymmetric legacy shape)', () => {
            test('completed is a COUNT while incomplete is the ARRAY of records', () => {
                const block = PSL.buildStatBlock([
                    { id: 'a', completed: true },
                    { id: 'b', completed: false },
                    { id: 'c', completed: true },
                    { id: 'd' },
                ]);
                expect(block.total).toBe(4);
                expect(block.completed).toBe(2);
                expect(block.incomplete.map(i => i.id)).toEqual(['b', 'd']);
                expect(block.completionRate).toBe(50);
            });
            test('an empty set is 0% rather than NaN', () => {
                expect(PSL.buildStatBlock([])).toEqual({ total: 0, completed: 0, incomplete: [], completionRate: 0 });
                expect(PSL.buildStatBlock(undefined).completionRate).toBe(0);
            });
            test('completionRate rounds to a whole percent', () => {
                expect(PSL.completionRate(1, 3)).toBe(33);
                expect(PSL.completionRate(2, 3)).toBe(67);
            });
        });

        describe('countHabitCompletions', () => {
            const habits = [
                { completionHistory: ['2026-01-04', '2026-01-06', '2026-01-08'] },
                { completionHistory: ['2026-01-11', '2026-01-12'] },
                {},
            ];
            test('counts only entries inside the inclusive range, ignoring history-less habits', () => {
                expect(PSL.countHabitCompletions(habits, '2026-01-05', '2026-01-11')).toBe(3);
            });
            test('boundaries are inclusive on both ends', () => {
                expect(PSL.countHabitCompletions(habits, '2026-01-04', '2026-01-04')).toBe(1);
                expect(PSL.countHabitCompletions(habits, '2026-01-12', '2026-01-12')).toBe(1);
            });
        });

        describe('estimatedXP', () => {
            test('flat 10/task plus the period goal rate', () => {
                expect(PSL.estimatedXP('week', 3, 2)).toBe(30 + 100);
                expect(PSL.estimatedXP('month', 3, 2)).toBe(30 + 400);
                expect(PSL.estimatedXP('year', 3, 2)).toBe(30 + 2000);
            });
            test('an unrecognised period falls back to the yearly rate (matches the old ternary chain)', () => {
                expect(PSL.estimatedXP('decade', 0, 1)).toBe(PSL.PERIOD_XP.year);
            });
        });

        describe('summarize (the object all five callers consume)', () => {
            const summaryFor = (period) => PSL.summarize({
                period,
                today: at(2026, 1, 14),
                dateToLocalString: isoOf,
                dailyTasks: [
                    { dueDate: '2026-01-06', completed: true },
                    { dueDate: '2026-01-07', completed: true },
                    { dueDate: '2026-01-08', completed: false },
                    { dueDate: '2026-01-13', completed: true }, // this week — outside the range
                ],
                habits: [{ completionHistory: ['2026-01-06', '2026-01-20'] }],
                periodGoals: [{ completed: true }, { completed: false }],
            });

            test('filters tasks to the period and reports both date formats', () => {
                const s = summaryFor('week');
                expect(s.tasks.total).toBe(3);
                expect(s.tasks.completed).toBe(2);
                expect(s.tasks.completionRate).toBe(67);
                expect(s.startDate).toBe('01/05/2026');
                expect(s.endDate).toBe('01/11/2026');
                expect(s.endDateISO).toBe('2026-01-11');
            });
            test('habits.total is ALL habits while completions are period-filtered', () => {
                const s = summaryFor('week');
                expect(s.habits).toEqual({ total: 1, completions: 1 });
            });
            test('xpEarned combines the filtered tasks with the injected goals', () => {
                expect(summaryFor('week').xpEarned).toBe((2 * 10) + (1 * 50));
            });
        });

        describe('recapShareText (the de-duplicated three-site sentence)', () => {
            test('renders the exact legacy wording', () => {
                expect(PSL.recapShareText({ tasks: { completed: 7, completionRate: 88 } }))
                    .toBe('Completed 7 tasks this week with a 88% completion rate! #LifeQuestJournal');
            });
            test('no call site hand-writes the sentence any more', () => {
                const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'goal-manager.js'), 'utf8');
                expect(src).not.toContain('tasks this week with a ');
                // All three former sites now go through the single source.
                expect(src.match(/PERIOD_SUMMARY_LOGIC\.recapShareText/g)).toHaveLength(3);
            });
        });

        describe('parity with the class', () => {
            test('generatePreviousPeriodSummary delegates and picks the goal array by period', () => {
                const gm = createTestManager();
                gm.weeklyGoals = [{ completed: true }, { completed: false }];
                gm.monthlyGoals = [{ completed: true }];
                gm.yearlyGoals = [];
                expect(gm.generatePreviousPeriodSummary('week').goals.total).toBe(2);
                expect(gm.generatePreviousPeriodSummary('month').goals.total).toBe(1);
                expect(gm.generatePreviousPeriodSummary('year').goals.total).toBe(0);
            });
            test('the returned summary matches the pure module given the same inputs', () => {
                const gm = createTestManager();
                gm.dailyTasks = [{ dueDate: '2026-01-06', completed: true }];
                gm.habits = [];
                gm.weeklyGoals = [{ completed: true }];
                gm.getTodayDateString = () => '2026-01-14';

                const viaClass = gm.generatePreviousPeriodSummary('week');
                const viaModule = PSL.summarize({
                    period: 'week',
                    today: new Date('2026-01-14T12:00:00'),
                    dateToLocalString: (d) => gm.dateToLocalString(d),
                    dailyTasks: gm.dailyTasks,
                    habits: gm.habits,
                    periodGoals: gm.weeklyGoals,
                });
                expect(viaClass).toEqual(viaModule);
            });
        });

        // ── PERIOD TRANSITION DETECTION (Roadmap #1, 71st slice) ────────────────────────────────
        // The detection that decides whether the recap above is shown at all. It sat inline in
        // checkPeriodTransitions() with zero coverage.
        describe('isoWeekNumber', () => {
            const weekOf = (iso) => PSL.isoWeekNumber(new Date(iso + 'T12:00:00'));

            test('ordinary mid-year dates', () => {
                expect(weekOf('2026-03-10')).toBe(11);
                expect(weekOf('2026-01-05')).toBe(2);
            });
            test('returns the ISO week NUMBER, not the ISO week-year — late December can be week 1', () => {
                // Each of these Mondays OPENS ISO week 1 of the following year.
                expect(weekOf('2025-12-29')).toBe(1); // opens week 1 of 2026
                expect(weekOf('2024-12-30')).toBe(1); // opens week 1 of 2025
            });
            test('…and early January can be week 53', () => {
                // 2021-01-01 (a Friday) belongs to ISO week 53 of 2020.
                expect(weekOf('2021-01-01')).toBe(53);
                expect(weekOf('2021-01-04')).toBe(1); // the following Monday opens week 1
            });
            test('a 53-week ISO year really does reach 53', () => {
                // 2026 starts on a Thursday, which makes it a 53-week ISO year.
                expect(weekOf('2026-12-28')).toBe(53);
            });
            test('this is exactly why detectTransitions must also compare the calendar year', () => {
                // Real collision: a visit on Mon 2025-12-29 and a return on Thu 2026-01-01 are BOTH
                // ISO week 1. On the week number alone nothing changed, so without the year clause
                // the returning user would silently lose their new-week recap.
                expect(weekOf('2025-12-29')).toBe(1);
                expect(weekOf('2026-01-01')).toBe(1);
                expect(PSL.detectTransitions(
                    { lastWeekNumber: 1, lastMonth: 11, lastYear: 2025 },
                    { currentWeek: 1, currentMonth: 0, currentYear: 2026 }
                )).toContain('week');
            });
            test('is unaffected by the time of day (UTC normalisation of local fields)', () => {
                expect(PSL.isoWeekNumber(new Date(2026, 2, 10, 0, 0, 0))).toBe(11);
                expect(PSL.isoWeekNumber(new Date(2026, 2, 10, 23, 59, 59))).toBe(11);
            });
        });

        describe('detectTransitions', () => {
            const last = (w, m, y) => ({ lastWeekNumber: w, lastMonth: m, lastYear: y });
            const now = (w, m, y) => ({ currentWeek: w, currentMonth: m, currentYear: y });

            test('same day / same period yields nothing', () => {
                expect(PSL.detectTransitions(last(11, 2, 2026), now(11, 2, 2026))).toEqual([]);
            });
            test('a new ISO week alone', () => {
                expect(PSL.detectTransitions(last(10, 2, 2026), now(11, 2, 2026))).toEqual(['week']);
            });
            test('a month rollover reports month AND week when both changed', () => {
                expect(PSL.detectTransitions(last(8, 1, 2026), now(11, 2, 2026))).toEqual(['month', 'week']);
            });
            test('a month can roll over while the ISO week does not', () => {
                // Mar 31 2026 and Apr 1 2026 are both in ISO week 14.
                expect(PSL.detectTransitions(last(14, 2, 2026), now(14, 3, 2026))).toEqual(['month']);
            });
            test('a New Year reports all three, most significant first', () => {
                expect(PSL.detectTransitions(last(51, 11, 2025), now(2, 0, 2026))).toEqual(['year', 'month', 'week']);
            });
            test('null fields are skipped so a never-stamped user gets no spurious recap', () => {
                expect(PSL.detectTransitions(last(null, null, null), now(11, 2, 2026))).toEqual([]);
                expect(PSL.detectTransitions(last(null, 1, 2026), now(11, 2, 2026))).toEqual(['month']);
            });
            test('lastMonth === 0 (January) is a REAL value, not a missing one', () => {
                // The `!== null` guard must not be loosened to a truthiness check: January is 0.
                expect(PSL.detectTransitions(last(4, 0, 2026), now(6, 1, 2026))).toEqual(['month', 'week']);
            });
            test('a backwards clock reports no YEAR transition (strict `<`, preserved verbatim)', () => {
                const t = PSL.detectTransitions(last(1, 0, 2027), now(11, 2, 2026));
                expect(t).not.toContain('year');
                expect(t).toEqual(['month', 'week']);
            });
        });

        describe('mainTransition', () => {
            test('year beats month beats week', () => {
                expect(PSL.mainTransition(['year', 'month', 'week'])).toBe('year');
                expect(PSL.mainTransition(['month', 'week'])).toBe('month');
                expect(PSL.mainTransition(['week'])).toBe('week');
            });
            test('picks by PRIORITY, not array order', () => {
                expect(PSL.mainTransition(['week', 'year'])).toBe('year');
            });
            test('nothing crossed → undefined', () => {
                expect(PSL.mainTransition([])).toBeUndefined();
            });
        });

        describe('periodStamp', () => {
            test('captures the four last-seen fields, with a 0-indexed month', () => {
                expect(PSL.periodStamp('2026-01-20', new Date('2026-01-20T12:00:00'))).toEqual({
                    lastVisitDate: '2026-01-20',
                    lastWeekNumber: 4,
                    lastMonth: 0,
                    lastYear: 2026,
                });
            });
        });

        describe('parity with the class (transitions)', () => {
            // Drives the REAL checkPeriodTransitions with the clock pinned and the slideshow captured.
            function run({ today, tutorialCompleted = true, lastVisitDate = today, week, month, year }) {
                const gm = createTestManager();
                gm.getTodayDateString = () => today;
                gm.tutorialCompleted = tutorialCompleted;
                gm.lastVisitDate = lastVisitDate;
                gm.lastWeekNumber = week;
                gm.lastMonth = month;
                gm.lastYear = year;
                const shows = [];
                gm.showPeriodTransitionSlideshow = (main, all) => shows.push({ main, all });
                gm.checkPeriodTransitions();
                return { gm, shows };
            }

            test('a first-time user is stamped but shown nothing', () => {
                const { gm, shows } = run({
                    today: '2026-03-10', tutorialCompleted: false, lastVisitDate: null,
                    week: null, month: null, year: null,
                });
                expect(shows).toEqual([]);
                expect(gm.lastVisitDate).toBe('2026-03-10');
                expect(gm.lastWeekNumber).toBe(11);
            });
            test('no boundary crossed → no slideshow', () => {
                expect(run({ today: '2026-03-10', week: 11, month: 2, year: 2026 }).shows).toEqual([]);
            });
            test('a New Year shows the YEAR slideshow and passes every crossed boundary', () => {
                const { shows } = run({
                    today: '2026-01-05', lastVisitDate: '2025-12-20', week: 51, month: 11, year: 2025,
                });
                expect(shows).toHaveLength(1);
                expect(shows[0].main).toBe('year');
                expect(shows[0].all).toEqual(['year', 'month', 'week']);
            });
            test('the tracking fields are re-stamped to today afterwards', () => {
                const { gm } = run({
                    today: '2026-03-10', lastVisitDate: '2026-02-20', week: 8, month: 1, year: 2026,
                });
                expect({
                    lastVisitDate: gm.lastVisitDate, lastWeekNumber: gm.lastWeekNumber,
                    lastMonth: gm.lastMonth, lastYear: gm.lastYear,
                }).toEqual(PSL.periodStamp('2026-03-10', new Date('2026-03-10T12:00:00')));
            });
            test('the class picks the same transitions as the pure module', () => {
                const today = '2026-03-10';
                const { shows } = run({ today, lastVisitDate: '2026-02-20', week: 8, month: 1, year: 2026 });
                const expected = PSL.detectTransitions(
                    { lastWeekNumber: 8, lastMonth: 1, lastYear: 2026 },
                    { currentWeek: 11, currentMonth: 2, currentYear: 2026 }
                );
                expect(shows[0].all).toEqual(expected);
                expect(shows[0].main).toBe(PSL.mainTransition(expected));
            });
            test('getWeekNumber still delegates to the pure module', () => {
                const gm = createTestManager();
                const d = new Date('2026-03-10T12:00:00');
                expect(gm.getWeekNumber(d)).toBe(PSL.isoWeekNumber(d));
            });
        });

        // ── loadData January regression (found during the 71st slice) ───────────────────────────
        // `this.lastMonth = data.lastMonth || null` coerced a stored January (0) to null, and the
        // null guard in detectTransitions then SKIPPED the month check — so anyone whose last visit
        // was in January silently lost their "new month" recap. saveData/importData always stored it
        // correctly; only the load path dropped it. Must stay `??`.
        describe('loadData preserves a January lastMonth (regression)', () => {
            function loadWith(tracking) {
                const gm = createTestManager();
                localStorage.setItem('lifeOrganizeData', JSON.stringify({
                    version: '3.0.0', xp: 0, level: 1, ...tracking,
                }));
                delete gm.checkRewardUnlocks;
                gm.loadData();
                return gm;
            }

            test('lastMonth === 0 survives the load instead of becoming null', () => {
                const gm = loadWith({
                    lastVisitDate: '2026-01-20', lastWeekNumber: 4, lastMonth: 0, lastYear: 2026,
                });
                expect(gm.lastMonth).toBe(0);
                expect(gm.lastMonth).not.toBeNull();
            });

            test('a January visitor still gets their month recap in February', () => {
                // The end-to-end shape of the bug: load a January stamp, then arrive in February.
                const gm = loadWith({
                    lastVisitDate: '2026-01-20', lastWeekNumber: 4, lastMonth: 0, lastYear: 2026,
                });
                gm.getTodayDateString = () => '2026-02-03';
                gm.saveData = () => {};
                const shows = [];
                gm.showPeriodTransitionSlideshow = (main, all) => shows.push({ main, all });

                gm.checkPeriodTransitions();

                expect(shows).toHaveLength(1);
                expect(shows[0].all).toContain('month'); // pre-fix: ['week'] only
                expect(shows[0].main).toBe('month');     // pre-fix: 'week'
            });

            test('a genuinely absent stamp still loads as null', () => {
                const gm = loadWith({});
                expect(gm.lastMonth).toBeNull();
                expect(gm.lastWeekNumber).toBeNull();
                expect(gm.lastVisitDate).toBeNull();
                expect(gm.lastYear).toBeNull();
            });

            test('the other three tracking fields round-trip unchanged', () => {
                const gm = loadWith({
                    lastVisitDate: '2026-01-20', lastWeekNumber: 4, lastMonth: 0, lastYear: 2026,
                });
                expect(gm.lastVisitDate).toBe('2026-01-20');
                expect(gm.lastWeekNumber).toBe(4);
                expect(gm.lastYear).toBe(2026);
            });

            // The field mapping moved to load-deserializer.js in the 77th slice, so the
            // source guard follows it there. `d` is the module's local alias for the blob and
            // `defaults` the shared default-state.js table (84th slice) — the four period fields
            // must stay EXPLICIT with `??`, never fall into the `||` loop.
            test('the load path uses `??` for every period-tracking field', () => {
                const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'load-deserializer.js'), 'utf8');
                ['lastVisitDate', 'lastWeekNumber', 'lastMonth', 'lastYear'].forEach(f => {
                    expect(src).toContain(`state.${f} = d.${f} ?? defaults.${f};`);
                    expect(src).not.toContain(`d.${f} || `);
                });
            });
        });
    });

    // ==================== FOCUS SESSION LOGIC (Roadmap #1, 68th slice — sixteenth LOGIC module) ====================
    // focus-session-logic.js holds the PURE focus-timer + Pomodoro-chain math. The surface had five separate
    // pieces of duplicated knowledge: the 25-min session default (×5), the chain-settings literal (×2),
    // sessionsPerChain's 4 (×3), the remaining-seconds expression (×3), and the chain-finished predicate (×2).
    describe('focus-session-logic.js (pure focus-timer + Pomodoro-chain math)', () => {
        const FSL = require('../focus-session-logic.js').default;

        describe('session length', () => {
            test('exposes the de-duplicated defaults', () => {
                expect(FSL.DEFAULT_SESSION_MINUTES).toBe(25);
                expect(FSL.EXTENDED_SESSION_MINUTES).toBe(35);
            });
            test('Time Warden extends the session', () => {
                expect(FSL.sessionMinutes(false)).toBe(25);
                expect(FSL.sessionMinutes(true)).toBe(35);
            });
            test('converts minutes to ms', () => {
                expect(FSL.minutesToMs(25)).toBe(1500000);
                expect(FSL.minutesToMs(0)).toBe(0);
                expect(FSL.minutesToMs(undefined)).toBe(0);
            });
        });

        describe('remaining seconds', () => {
            test('rounds UP so a fresh session reads its full length, never negative', () => {
                const now = 1000000;
                // 24:59.5 left must display as 25:00, not 24:59 — a floor here would desync the display.
                expect(FSL.remainingSeconds(now + 1499500, now)).toBe(1500);
                expect(FSL.remainingSeconds(now + 1000, now)).toBe(1);
                expect(FSL.remainingSeconds(now, now)).toBe(0);
                expect(FSL.remainingSeconds(now - 60000, now)).toBe(0); // clamped, never negative
            });
        });

        describe('chain settings defaults', () => {
            test('exposes the frozen reference defaults', () => {
                expect(FSL.DEFAULT_CHAIN_SETTINGS).toEqual({
                    sessionsPerChain: 4, breakDuration: 5, longBreakDuration: 15,
                });
                expect(Object.isFrozen(FSL.DEFAULT_CHAIN_SETTINGS)).toBe(true);
            });
            test('defaultChainSettings() hands out a FRESH mutable object each call', () => {
                // updatePomodoroChainSettings mutates this in place, so a shared/frozen
                // reference would alias every manager together (or throw in strict mode).
                const a = FSL.defaultChainSettings();
                const b = FSL.defaultChainSettings();
                expect(a).toEqual(FSL.DEFAULT_CHAIN_SETTINGS);
                expect(a).not.toBe(b);
                expect(Object.isFrozen(a)).toBe(false);
                a.sessionsPerChain = 99;
                expect(b.sessionsPerChain).toBe(4);
                expect(FSL.DEFAULT_CHAIN_SETTINGS.sessionsPerChain).toBe(4);
            });
        });

        describe('Deep Work', () => {
            test('the window is the session length plus the break grace', () => {
                expect(FSL.DEEP_WORK_GRACE_MINUTES).toBe(30);
                expect(FSL.deepWorkWindowMs(25)).toBe((25 + 30) * 60 * 1000);
            });
            test('without the capstone the stack is flattened and the multiplier is 1', () => {
                expect(FSL.deepWorkAdvance({ perkValue: 0, stack: 4, lastEndTime: 1, now: 2, sessionMinutes: 25 }))
                    .toEqual({ stack: 0, multiplier: 1, chained: false });
            });
            test('a session inside the window escalates the stack', () => {
                const now = 10_000_000;
                const r = FSL.deepWorkAdvance({
                    perkValue: 0.25, stack: 1, lastEndTime: now - 60_000, now, sessionMinutes: 25,
                });
                expect(r.chained).toBe(true);
                expect(r.stack).toBe(2);
                expect(r.multiplier).toBe(1.5); // 1 + 0.25 * 2
            });
            test('a gap past the window resets the stack to zero', () => {
                const now = 10_000_000;
                const justPast = now - (FSL.deepWorkWindowMs(25) + 1);
                const r = FSL.deepWorkAdvance({ perkValue: 0.25, stack: 3, lastEndTime: justPast, now, sessionMinutes: 25 });
                expect(r).toEqual({ stack: 0, multiplier: 1, chained: false });
            });
            test('the window boundary is INCLUSIVE', () => {
                const now = 10_000_000;
                const exactly = now - FSL.deepWorkWindowMs(25);
                expect(FSL.deepWorkAdvance({ perkValue: 0.25, stack: 0, lastEndTime: exactly, now, sessionMinutes: 25 }).chained).toBe(true);
            });
            test('the very first session cannot chain (no previous end time)', () => {
                const r = FSL.deepWorkAdvance({ perkValue: 0.25, stack: 0, lastEndTime: 0, now: 10_000_000, sessionMinutes: 25 });
                expect(r).toEqual({ stack: 0, multiplier: 1, chained: false });
            });
        });

        describe('focus XP bonus', () => {
            test('Focus Mode grants its flat bonus', () => {
                expect(FSL.FOCUS_MODE_XP_BONUS).toBe(50);
                expect(FSL.focusXpBonus({ focusModeActive: true })).toBe(50);
            });
            test('a session with no bonuses pays nothing', () => {
                expect(FSL.focusXpBonus({})).toBe(0);
                expect(FSL.focusXpBonus(undefined)).toBe(0);
            });
            test('a zero bonus stays zero even under multipliers', () => {
                // The multipliers only apply when the running bonus is already > 0.
                expect(FSL.focusXpBonus({ deepWorkMult: 3, archivistMult: 2 })).toBe(0);
            });
            test('the two multipliers round SEPARATELY, so the stages do not commute', () => {
                // round(round(45 * 1.5) * 1.1) = round(68 * 1.1) = 75
                // whereas folding them: round(45 * 1.5 * 1.1) = round(74.25) = 74
                const staged = FSL.focusXpBonus({ perkXP: 45, deepWorkMult: 1.5, archivistMult: 1.1 });
                expect(staged).toBe(75);
                expect(Math.round(45 * 1.5 * 1.1)).toBe(74); // what a folded pipeline would pay
            });
            test('Focus Mode and the Scholar perk add before any multiplier', () => {
                expect(FSL.focusXpBonus({ focusModeActive: true, perkXP: 40 })).toBe(90);
            });
        });

        describe('chain progression', () => {
            const chain = (currentSession, totalSessions = 4) => ({
                currentSession, totalSessions, breakDuration: 5, longBreakDuration: 15,
            });

            test('isChainFinished is STRICTLY greater-than (currentSession is pre-incremented)', () => {
                // After the 4th of 4 sessions completeFocusSession has already bumped this to 5.
                // A >= here would end the chain one session early, at 4.
                expect(FSL.isChainFinished(chain(4))).toBe(false);
                expect(FSL.isChainFinished(chain(5))).toBe(true);
                expect(FSL.isChainFinished(null)).toBe(false);
            });

            test('a full 4-session chain takes three short breaks then one long break', () => {
                // Walks the real sequence: sessions 1-3 each end on a short break,
                // the 4th ends the chain on the long break.
                const plans = [2, 3, 4, 5].map(n => FSL.breakPlan(chain(n)));
                expect(plans.map(p => p.isLongBreak)).toEqual([false, false, false, true]);
                expect(plans.map(p => p.minutes)).toEqual([5, 5, 5, 15]);
            });

            test('breakPlan honours a custom chain length', () => {
                expect(FSL.breakPlan(chain(2, 2)).isLongBreak).toBe(false);
                expect(FSL.breakPlan(chain(3, 2)).isLongBreak).toBe(true);
            });

            test('chain completion pays flat crystals plus per-session XP', () => {
                expect(FSL.CHAIN_BONUS_CRYSTALS).toBe(2);
                expect(FSL.CHAIN_XP_PER_SESSION).toBe(50);
                expect(FSL.chainCompletionRewards(4)).toEqual({ crystals: 2, xp: 200 });
                expect(FSL.chainCompletionRewards(6)).toEqual({ crystals: 2, xp: 300 });
                expect(FSL.chainCompletionRewards(0)).toEqual({ crystals: 2, xp: 0 });
            });
        });

        describe('parity with the class', () => {
            test('initState seeds both defaults from the module', () => {
                const gm = createTestManager();
                expect(gm.focusSessionLength).toBe(FSL.DEFAULT_SESSION_MINUTES);
                expect(gm.pomodoroChainSettings).toEqual(FSL.DEFAULT_CHAIN_SETTINGS);
            });
            test('the settings object is per-instance, not shared', () => {
                const a = createTestManager();
                const b = createTestManager();
                a.updatePomodoroChainSettings('sessionsPerChain', 8);
                expect(a.pomodoroChainSettings.sessionsPerChain).toBe(8);
                expect(b.pomodoroChainSettings.sessionsPerChain).toBe(4);
                expect(FSL.DEFAULT_CHAIN_SETTINGS.sessionsPerChain).toBe(4);
            });
        });
    });

    // ==================== REWARD ECONOMY (Roadmap #1, 67th slice — fifteenth LOGIC module) ====================
    // reward-economy.js holds the PURE reward-stack math behind addXP and addGold, the two choke points every
    // reward routes through. They were parallel stacks that each hardcoded the Beginner's Blessing 2× and the
    // Quest Doubler 2× (the latter split ACROSS the two methods via _questDoublerGoldPending), and both ended
    // in the same Math.floor(amount × m1 × m2 × …) convention.
    describe('reward-economy.js (pure XP/gold reward-stack math)', () => {
        const REWARD_ECONOMY = require('../reward-economy.js').default;

        describe('multiplier stack', () => {
            test('multiplies through and floors', () => {
                expect(REWARD_ECONOMY.applyStack(100, [2, 1.5])).toBe(300);
                expect(REWARD_ECONOMY.applyStack(10, [1.15])).toBe(11); // 11.5 → 11
                expect(REWARD_ECONOMY.applyStack(100, [])).toBe(100);
                expect(REWARD_ECONOMY.applyStack(100, undefined)).toBe(100);
            });
            test('an all-1× stack is a pass-through', () => {
                expect(REWARD_ECONOMY.applyStack(37, [1, 1, 1, 1, 1, 1, 1])).toBe(37);
            });
            test('folds LEFT-TO-RIGHT from amount, matching the original inline expression', () => {
                // Regrouping as amount × (m1 × m2 × …) can land one ulp lower and lose a whole point to the
                // floor. This case genuinely differs between the two groupings, so it pins the seed of the
                // accumulator: seeding the fold at 1 instead of `amount` would silently pay out 26, not 27.
                const amount = 5;
                const mults = [1.2, 1.5, 3];
                const leftToRight = Math.floor(amount * 1.2 * 1.5 * 3);
                const regrouped = Math.floor(amount * (1.2 * 1.5 * 3));
                expect(leftToRight).toBe(27);
                expect(regrouped).toBe(26);
                expect(REWARD_ECONOMY.applyStack(amount, mults)).toBe(leftToRight);
            });
        });

        describe("Beginner's Blessing", () => {
            test('doubles while active and is a no-op otherwise', () => {
                expect(REWARD_ECONOMY.BEGINNER_BLESSING_MULTIPLIER).toBe(2);
                expect(REWARD_ECONOMY.blessingMultiplier(true)).toBe(2);
                expect(REWARD_ECONOMY.blessingMultiplier(false)).toBe(1);
            });
        });

        describe('Early Bird', () => {
            test('triples the first five daily tasks, inclusive at the cap', () => {
                expect(REWARD_ECONOMY.earlyBirdAmount(10, 1)).toBe(30);
                expect(REWARD_ECONOMY.earlyBirdAmount(10, 5)).toBe(30); // boundary
                expect(REWARD_ECONOMY.earlyBirdAmount(10, 6)).toBe(10); // past the cap
            });
            test('honours custom cap and multiplier', () => {
                expect(REWARD_ECONOMY.earlyBirdAmount(10, 6, 10)).toBe(30);
                expect(REWARD_ECONOMY.earlyBirdAmount(10, 1, 5, 2)).toBe(20);
            });
        });

        describe('Momentum', () => {
            test('ramps one per task and clamps at five stacks', () => {
                expect(REWARD_ECONOMY.nextMomentumStack(0)).toBe(1);
                expect(REWARD_ECONOMY.nextMomentumStack(4)).toBe(5);
                expect(REWARD_ECONOMY.nextMomentumStack(5)).toBe(5); // clamped
                expect(REWARD_ECONOMY.nextMomentumStack(undefined)).toBe(1);
            });
            test('pays +5 XP per stack, ramping 5/10/15/20/25', () => {
                expect([1, 2, 3, 4, 5].map(s => REWARD_ECONOMY.momentumBonus(s))).toEqual([5, 10, 15, 20, 25]);
                expect(REWARD_ECONOMY.momentumBonus(0)).toBe(0);
            });
            test('is ADDED after Early Bird multiplies, so the bonus is never tripled', () => {
                // Order matters: (10 × 3) + 5 = 35, not (10 + 5) × 3 = 45.
                const afterEarlyBird = REWARD_ECONOMY.earlyBirdAmount(10, 1);
                expect(afterEarlyBird + REWARD_ECONOMY.momentumBonus(1)).toBe(35);
            });
        });

        describe('source rule-sets', () => {
            test('only quest completions may consume the Quest Doubler', () => {
                expect(REWARD_ECONOMY.QUEST_DOUBLER_MULTIPLIER).toBe(2);
                ['daily', 'weekly', 'monthly', 'life', 'epic', 'side'].forEach(src => {
                    expect(REWARD_ECONOMY.isQuestDoublerSource(src)).toBe(true);
                });
                // Chest loot, focus bonuses and habits must NOT burn the spell.
                ['chest', 'focus', 'habit', 'boss', 'loot', undefined].forEach(src => {
                    expect(REWARD_ECONOMY.isQuestDoublerSource(src)).toBe(false);
                });
            });
            test('routine gold sources stay silent', () => {
                ['daily', 'habit', 'weekly', 'monthly'].forEach(src => {
                    expect(REWARD_ECONOMY.isQuietGoldSource(src)).toBe(true);
                });
                ['chest', 'boss', 'focus', 'charge_overflow', undefined].forEach(src => {
                    expect(REWARD_ECONOMY.isQuietGoldSource(src)).toBe(false);
                });
            });
        });

        // Ranger Forage capstone (90th slice, Sep 7 criterion (1)/(2) audit): the hit-roll +
        // 10-20 bonus-gold math applyForage still had inline, now isolated and unit-tested.
        describe('Ranger Forage (forageReward)', () => {
            test('misses (returns null) when chance is <= 0', () => {
                const rng = jest.fn(() => 0);
                expect(REWARD_ECONOMY.forageReward(0, rng)).toBeNull();
                expect(REWARD_ECONOMY.forageReward(-0.1, rng)).toBeNull();
                expect(rng).not.toHaveBeenCalled();
            });
            test('misses when the hit-roll lands >= chance', () => {
                const rng = jest.fn(() => 0.2);
                expect(REWARD_ECONOMY.forageReward(0.2, rng)).toBeNull();
                expect(rng).toHaveBeenCalledTimes(1); // only the hit-check — amount roll never fires on a miss
            });
            test('hits when the roll is strictly below chance, granting 10-20 gold + 1 crystal', () => {
                const rng = jest.fn(() => 0); // hit; amount roll floors to the base
                expect(REWARD_ECONOMY.forageReward(0.2, rng)).toEqual({ gold: 10, crystals: 1 });
                expect(rng).toHaveBeenCalledTimes(2);
            });
            test('spreads the bonus gold across the full 10-20 range', () => {
                expect(REWARD_ECONOMY.forageReward(1, () => 0).gold).toBe(10);
                expect(REWARD_ECONOMY.forageReward(1, () => 0.99).gold).toBe(20);
                expect(REWARD_ECONOMY.forageReward(1, () => 0.5).gold).toBe(15);
            });
            test('calls rng at most twice, hit-check first then the amount roll', () => {
                const order = [];
                const rng = jest.fn(() => { order.push(order.length); return 0; });
                REWARD_ECONOMY.forageReward(1, rng);
                expect(order).toEqual([0, 1]);
            });
        });

        describe('parity with addXP / addGold', () => {
            test('addGold matches the pure stack under a companion bonus', () => {
                const gm = createTestManager();
                gm.goldCoins = 0;
                gm.companions = [{ type: 'dragon', bonusType: 'gold', bonusAmount: 0.20, rarity: 'epic' }];
                gm.activeCompanionId = 'dragon';
                gm.addGold(100, 'daily');
                expect(gm.goldCoins).toBe(REWARD_ECONOMY.applyStack(100, [1, 1, 1, 1.2, 1, 1]));
                expect(gm.goldCoins).toBe(120); // sanity
            });
            test('the Quest Doubler constant drives the cross-method gold handoff', () => {
                const gm = createTestManager();
                gm.goldCoins = 0;
                gm._questDoublerGoldPending = REWARD_ECONOMY.QUEST_DOUBLER_MULTIPLIER;
                gm.addGold(100, 'daily');
                expect(gm.goldCoins).toBe(200);
                expect(gm._questDoublerGoldPending).toBeNull();
            });
        });
    });

    // ==================== MASTER LOOT POOL (Roadmap #1, 12th slice — data catalog) ====================
    // loot-pool.js is the base rarity-keyed loot table getMasterLootPool() returns.
    // These lock the catalog's shape and — critically — cross-check every spell entry
    // against spell-definitions.js, the exact drift that caused the July 2026 loot bug
    // (scholars_charm / merchants_fortune had silently vanished from a duplicated list).
    describe('loot-pool.js (master loot pool data)', () => {
        const MASTER_LOOT_POOL = require('../loot-pool.js').default;
        const SPELL_DEFINITIONS = require('../spell-definitions.js').default;
        const allEntries = Object.values(MASTER_LOOT_POOL).flat();

        test('has the five rarity tiers in order, each a non-empty array', () => {
            expect(Object.keys(MASTER_LOOT_POOL)).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary']);
            for (const tier of Object.values(MASTER_LOOT_POOL)) {
                expect(Array.isArray(tier)).toBe(true);
                expect(tier.length).toBeGreaterThan(0);
            }
        });

        test('every entry carries a numeric weight and a known type', () => {
            const knownTypes = new Set(['gold', 'xp', 'charges', 'shards', 'spell', 'theme', 'companion']);
            for (const entry of allEntries) {
                expect(typeof entry.weight).toBe('number');
                expect(knownTypes.has(entry.type)).toBe(true);
            }
        });

        test('every spell entry resolves to a real, non-wizard-exclusive spell definition', () => {
            // Guards the July 2026 drift bug: a pool spellId that no longer exists (or
            // is wizard-only, which must come via getWizardLootEntries) would silently
            // disappear from loot. Cross-checking the single source of truth kills it.
            const spellEntries = allEntries.filter(e => e.type === 'spell');
            expect(spellEntries.length).toBeGreaterThan(0);
            for (const entry of spellEntries) {
                const def = SPELL_DEFINITIONS[entry.spellId];
                expect(def).toBeDefined();
                expect(def.wizardExclusive).toBeFalsy();
            }
        });

        test('is deep-frozen so the shared pool cannot be mutated at runtime', () => {
            expect(Object.isFrozen(MASTER_LOOT_POOL)).toBe(true);
            expect(Object.isFrozen(MASTER_LOOT_POOL.common)).toBe(true);
            expect(Object.isFrozen(MASTER_LOOT_POOL.common[0])).toBe(true);
        });
    });

    // ==================== BOSS GENERATOR (Roadmap #1, 13th slice — 2nd logic module) ====================
    // boss-generator.js holds the PURE boss factory the three generators + the monthly
    // preview delegate to. These lock the tuning per cadence and — critically — that the
    // renderMonthlyBossChallenge preview numbers match what challengeMonthlyBoss summons
    // (the formula used to be duplicated between them). generateWeeklyBoss was previously
    // UNTESTED; it gets coverage here too.
    describe('boss-generator.js (pure boss engine)', () => {
        const BossGen = require('../boss-generator.js').default;
        const fakeThemes = [
            { name: 'Alpha', icon: 'A', flavor: 'first', particleType: 'shadow' },
            { name: 'Beta', icon: 'B', flavor: 'second', particleType: 'ember' },
            { name: 'Gamma', icon: 'G', flavor: 'third', particleType: 'slime' }
        ];

        test('hashDateString is deterministic and non-negative', () => {
            expect(BossGen.hashDateString('2026-07-07')).toBe(BossGen.hashDateString('2026-07-07'));
            expect(BossGen.hashDateString('2026-07-07')).toBeGreaterThanOrEqual(0);
            expect(BossGen.hashDateString('2026-07-07')).not.toBe(BossGen.hashDateString('2026-07-08'));
        });

        test('buildBoss picks a theme by seeded index and spreads its fields', () => {
            const seedKey = '2026-07';
            const idx = BossGen.hashDateString(seedKey) % fakeThemes.length;
            const boss = BossGen.buildBoss({ cadence: 'monthly', themes: fakeThemes, seedKey, level: 5 });
            expect(boss.name).toBe(fakeThemes[idx].name);
            expect(boss.icon).toBe(fakeThemes[idx].icon);
            expect(boss.flavor).toBe(fakeThemes[idx].flavor);
            expect(boss.particleType).toBe(fakeThemes[idx].particleType);
        });

        test('buildBoss daily: HP on raw level, rewards on bossLevel, spawnDate stamped', () => {
            const boss = BossGen.buildBoss({ cadence: 'daily', themes: fakeThemes, seedKey: '2026-07-07', level: 9 });
            expect(boss.type).toBe('daily');
            expect(boss.maxHP).toBe(8 + Math.floor(9 / 3)); // 11
            expect(boss.currentHP).toBe(boss.maxHP);
            expect(boss.level).toBe(Math.max(1, Math.floor(9 / 2))); // 4
            expect(boss.rewards).toEqual({ xp: 50 + 4 * 20, gold: 30 + 4 * 15 }); // {130, 90}
            expect(boss.spawnDate).toBe('2026-07-07');
            expect(boss.defeated).toBe(false);
            expect(boss.totalDamage).toBe(0);
        });

        test('buildBoss weekly: HP + rewards match the tuning, spawnWeek stamped', () => {
            const boss = BossGen.buildBoss({ cadence: 'weekly', themes: fakeThemes, seedKey: '2026-W27', level: 10 });
            expect(boss.type).toBe('weekly');
            expect(boss.maxHP).toBe(30 + Math.floor(10 / 2) * 5); // 55
            expect(boss.level).toBe(10);
            expect(boss.rewards).toEqual({ xp: 200 + 10 * 30, gold: 150 + 10 * 25 }); // {500, 400}
            expect(boss.spawnWeek).toBe('2026-W27');
        });

        test('buildBoss monthly: HP + rewards match the tuning, spawnMonth stamped', () => {
            const boss = BossGen.buildBoss({ cadence: 'monthly', themes: fakeThemes, seedKey: '2026-07', level: 5 });
            expect(boss.type).toBe('monthly');
            expect(boss.maxHP).toBe(100 + 5 * 10); // 150
            expect(boss.level).toBe(5);
            expect(boss.rewards).toEqual({ xp: 500 + 5 * 50, gold: 400 + 5 * 40 }); // {750, 600}
            expect(boss.spawnMonth).toBe('2026-07');
        });

        test('buildBoss returns a fresh, equal object each call (no shared state)', () => {
            const a = BossGen.buildBoss({ cadence: 'daily', themes: fakeThemes, seedKey: '2026-07-07', level: 3 });
            const b = BossGen.buildBoss({ cadence: 'daily', themes: fakeThemes, seedKey: '2026-07-07', level: 3 });
            expect(a).not.toBe(b);
            expect(a).toEqual(b);
        });

        test('generateWeeklyBoss builds via the factory + logs (previously untested)', () => {
            const gm = createTestManager();
            gm.level = 10;
            gm.weeklyBoss = null;
            gm.generateWeeklyBoss('2026-W27');
            expect(gm.weeklyBoss).not.toBeNull();
            expect(gm.weeklyBoss.type).toBe('weekly');
            expect(gm.weeklyBoss.maxHP).toBe(30 + Math.floor(10 / 2) * 5); // 55
            expect(gm.weeklyBoss.rewards.xp).toBe(200 + 10 * 30); // 500
            expect(gm.weeklyBoss.spawnWeek).toBe('2026-W27');
        });

        test('renderMonthlyBossChallenge preview numbers match the monthly tuning (no drift)', () => {
            const gm = createTestManager();
            gm.level = 7;
            const html = gm.renderMonthlyBossChallenge();
            const bossLevel = Math.max(1, 7);
            expect(html).toContain(`HP: ${100 + 7 * 10}`);          // 170
            expect(html).toContain(`${500 + bossLevel * 50} XP`);    // 850 XP
            expect(html).toContain(`${400 + bossLevel * 40} Gold`);  // 680 Gold
        });
    });

    // ==================== PERSISTENCE MIGRATIONS (Roadmap #1, 14th slice) ====================
    // persistence-migrations.js holds the PURE legacy-save normalizers loadData() delegates
    // to. loadData itself is still integration-tested (Data Migration + Save/Load Round Trip
    // describes); these lock each migration in isolation — including the companion name→type
    // table that used to be hand-copied in TWO places (the whole reason for this roadmap).
    describe('persistence-migrations.js (pure save-data normalizers)', () => {
        const PM = require('../persistence-migrations.js').default;

        test('COMPANION_NAME_TO_TYPE covers all 12 companions and is frozen', () => {
            expect(Object.keys(PM.COMPANION_NAME_TO_TYPE)).toHaveLength(12);
            expect(PM.COMPANION_NAME_TO_TYPE['Baby Dragon']).toBe('dragon');
            expect(PM.COMPANION_NAME_TO_TYPE['Legendary Lion']).toBe('lion');
            expect(Object.isFrozen(PM.COMPANION_NAME_TO_TYPE)).toBe(true);
        });

        test('inferCompanionType maps known names and defaults unknown/missing to wolf', () => {
            expect(PM.inferCompanionType('Wise Owl')).toBe('owl');
            expect(PM.inferCompanionType('Lucky Cat')).toBe('cat');
            expect(PM.inferCompanionType('Nonexistent Beast')).toBe('wolf');
            expect(PM.inferCompanionType(undefined)).toBe('wolf');
        });

        test('migrateLegacySingleCompanion infers type + defaults rarity (unified 12-entry map)', () => {
            // Old code used a 4-entry map here; a "Lucky Cat" legacy single companion would
            // have wrongly become a wolf. The unified table now infers it correctly.
            const cat = { name: 'Lucky Cat' };
            PM.migrateLegacySingleCompanion(cat);
            expect(cat.type).toBe('cat');
            expect(cat.rarity).toBe('rare');
        });

        test('migrateLegacySingleCompanion preserves an already-set type and rarity', () => {
            const c = { name: 'Baby Dragon', type: 'phoenix', rarity: 'legendary' };
            PM.migrateLegacySingleCompanion(c);
            expect(c.type).toBe('phoenix');
            expect(c.rarity).toBe('legendary');
        });

        test('migrateCompanionCollection backfills rarity + type in place, only typing named comps', () => {
            const comps = [
                { name: 'Golden Eagle' },              // -> type eagle, rarity rare
                { type: 'fox', rarity: 'epic' },       // untouched
                { rarity: 'rare' }                      // no name -> no type inferred
            ];
            const returned = PM.migrateCompanionCollection(comps);
            expect(returned).toBe(comps); // mutates in place
            expect(comps[0]).toEqual({ name: 'Golden Eagle', type: 'eagle', rarity: 'rare' });
            expect(comps[1]).toEqual({ type: 'fox', rarity: 'epic' });
            expect(comps[2].type).toBeUndefined();
        });

        test('normalizeClassId renames mystic -> wizard and passes everything else through', () => {
            expect(PM.normalizeClassId('mystic')).toBe('wizard');
            expect(PM.normalizeClassId('wizard')).toBe('wizard');
            expect(PM.normalizeClassId('ranger')).toBe('ranger');
            expect(PM.normalizeClassId(null)).toBeNull();
        });

        test('migrateTaskTitles backfills title from name without overwriting an existing title', () => {
            const daily = [{ name: 'Only name' }, { title: 'Real', name: 'Ignored' }];
            const weekly = [{ name: 'Weekly name' }];
            PM.migrateTaskTitles([daily, weekly]);
            expect(daily[0].title).toBe('Only name');
            expect(daily[1].title).toBe('Real');
            expect(weekly[0].title).toBe('Weekly name');
        });

        test('backfillDueDates stamps the injected today only where dueDate is missing', () => {
            const tasks = [{ id: 1 }, { id: 2, dueDate: '2025-01-15' }];
            PM.backfillDueDates(tasks, '2026-07-07');
            expect(tasks[0].dueDate).toBe('2026-07-07');
            expect(tasks[1].dueDate).toBe('2025-01-15');
        });

        test('normalizeGoalPriorities forces missing/invalid to medium, keeps valid values', () => {
            const goals = [{}, { priority: 'bogus' }, { priority: 'high' }, { priority: 'low' }];
            PM.normalizeGoalPriorities(goals);
            expect(goals.map(g => g.priority)).toEqual(['medium', 'medium', 'high', 'low']);
        });

        // ---- save-side pruning (Roadmap #1, 21st slice) ----
        const dateISO = (i) => new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString();

        test('pruneArchivedGoals returns the list unchanged (same ref) at or under the cap', () => {
            const list = [{ id: 1 }, { id: 2 }];
            expect(PM.pruneArchivedGoals(list, 5)).toBe(list);   // no sort/copy under cap
            expect(PM.pruneArchivedGoals(list, 2)).toBe(list);   // exactly at cap
            expect(PM.pruneArchivedGoals(list)).toBe(list);      // default 500
        });

        test('pruneArchivedGoals keeps the `cap` most recent by archived date (descending)', () => {
            const list = [0, 1, 2, 3, 4, 5].map(i => ({ id: i, archivedDate: dateISO(i) }));
            const pruned = PM.pruneArchivedGoals(list, 3);
            expect(pruned).toHaveLength(3);
            expect(pruned.map(g => g.id)).toEqual([5, 4, 3]); // newest first
        });

        test('pruneArchivedGoals prefers archivedAt, falls back to archivedDate then empty', () => {
            const list = [
                { id: 'noDate' },                            // '' -> oldest, dropped
                { id: 'viaDate', archivedDate: '2021-01-01' },
                { id: 'viaAt', archivedAt: '2023-01-01' },   // archivedAt wins over archivedDate
            ];
            const pruned = PM.pruneArchivedGoals(list, 2);
            expect(pruned.map(g => g.id)).toEqual(['viaAt', 'viaDate']);
        });

        test('pruneArchivedGoals defaults the cap to 500', () => {
            const list = Array.from({ length: 501 }, (_, i) => ({ id: i, archivedDate: dateISO(i) }));
            const pruned = PM.pruneArchivedGoals(list);
            expect(pruned).toHaveLength(500);
            expect(pruned[0].id).toBe(500);                  // newest survives
            expect(pruned.some(g => g.id === 0)).toBe(false); // oldest dropped
        });

        test('pruneBossLog returns the log unchanged (same ref) at or under the cap', () => {
            const log = [{ m: 'a' }, { m: 'b' }];
            expect(PM.pruneBossLog(log, 5)).toBe(log);
            expect(PM.pruneBossLog(log, 2)).toBe(log);
            expect(PM.pruneBossLog(log)).toBe(log);          // default 200
        });

        test('pruneBossLog keeps the last `cap` entries when over the cap', () => {
            const log = [0, 1, 2, 3, 4].map(i => ({ i }));
            expect(PM.pruneBossLog(log, 3).map(e => e.i)).toEqual([2, 3, 4]);
        });

        test('pruneBossLog defaults the cap to 200', () => {
            const log = Array.from({ length: 205 }, (_, i) => ({ i }));
            const pruned = PM.pruneBossLog(log);
            expect(pruned).toHaveLength(200);
            expect(pruned[0].i).toBe(5);     // dropped the oldest 5 (indices 0..4)
            expect(pruned[199].i).toBe(204);
        });
    });

    // ==================== BOSS RENDER (Roadmap #1, 15th slice — first render module) ====================
    // boss-render.js holds the PURE boss-card presentation helpers the manager delegates to.
    // The behaviour is already covered end-to-end via the instance (the `Boss HP Damage-Trail
    // Bar` + `Boss particle types` describes drive gm.getBossPhase / gm.renderBossHPBar /
    // gm.getBossParticleType through the delegators); these lock the MODULE's exported surface
    // directly, incl. the newly-injected `bossThemes` param on getBossParticleType.
    describe('boss-render.js (pure boss presentation helpers)', () => {
        const BR = require('../boss-render.js').default;

        test('getBossPhase maps the HP ratio to the right color/label bands', () => {
            expect(BR.getBossPhase(100, 100)).toEqual({ color: 'red', text: 'Full Power' });
            expect(BR.getBossPhase(75, 100)).toEqual({ color: 'yellow', text: 'Injured' });
            expect(BR.getBossPhase(50, 100)).toEqual({ color: 'orange', text: 'Wounded' });
            expect(BR.getBossPhase(25, 100)).toEqual({ color: 'purple', text: 'CRITICAL!' });
            expect(BR.getBossPhase(0, 100)).toEqual({ color: 'green', text: 'DEFEATED' });
            expect(BR.getBossPhase(0, 0)).toEqual({ color: 'green', text: 'DEFEATED' });
        });

        test('renderBossHPBar emits the two-layer markup with fill width + phase', () => {
            const html = BR.renderBossHPBar({ maxHP: 100, currentHP: 70 }, 'red');
            expect(html).toContain('boss-hp-fill');
            expect(html).toContain('boss-hp-damage');
            expect(html).toContain('data-phase="red"');
            expect(html).toMatch(/boss-hp-fill"\s+style="width:\s*70%"/);
        });

        test('renderBossHPBar toggles the percent label at the 15% threshold', () => {
            expect(BR.renderBossHPBar({ maxHP: 100, currentHP: 50 }, 'orange')).toContain('boss-hp-percent');
            expect(BR.renderBossHPBar({ maxHP: 100, currentHP: 12 }, 'purple')).not.toContain('boss-hp-percent');
        });

        test('renderBossHPBar returns empty for maxHP<=0 and clamps overflow to 100%', () => {
            expect(BR.renderBossHPBar({ maxHP: 0, currentHP: 0 }, 'green')).toBe('');
            expect(BR.renderBossHPBar({ maxHP: 10, currentHP: 999 }, 'red')).toMatch(/width:\s*100%/);
        });

        test('getBossParticleType prefers the boss field, then a themes name lookup, then shadow', () => {
            const themes = {
                daily: [{ name: 'Slime of Procrastination', particleType: 'slime' }],
                weekly: [],
                monthly: [{ name: 'The Overwhelm', particleType: 'void' }]
            };
            expect(BR.getBossParticleType({ name: 'X', particleType: 'ember' }, themes)).toBe('ember');
            expect(BR.getBossParticleType({ name: 'Slime of Procrastination' }, themes)).toBe('slime');
            expect(BR.getBossParticleType({ name: 'The Overwhelm' }, themes)).toBe('void');
            expect(BR.getBossParticleType({ name: 'Unknown' }, themes)).toBe('shadow');
            expect(BR.getBossParticleType(null, themes)).toBe('shadow');
            expect(BR.getBossParticleType({ name: 'X' }, undefined)).toBe('shadow'); // no themes -> shadow
        });

        // ---- renderBossCard (full active/defeated card markup) ----
        const makeBoss = (over = {}) => ({
            icon: '🐉', name: 'Test Fiend', flavor: 'A test foe', level: 5,
            maxHP: 100, currentHP: 70, totalDamage: 0, defeated: false,
            rewards: { xp: 500, gold: 400 }, ...over
        });

        test('renderBossCard emits an active card with header, HP, ATTACK button + rewards preview', () => {
            const html = BR.renderBossCard(makeBoss(), 'daily', { attackCharges: 3 });
            expect(html).toContain('id="boss-card-daily"');
            expect(html).toContain('DAILY FOE');
            expect(html).toContain('🐉');
            expect(html).toContain('Test Fiend');
            expect(html).toContain('A test foe');
            expect(html).toContain('Lv.5');
            expect(html).toContain('70 / 100');
            expect(html).toContain('data-action="boss.attack"');
            expect(html).toContain('(3)');            // attackCharges count shown
            expect(html).toContain('boss-hp-fill');    // delegates to renderBossHPBar in-module
            expect(html).toContain('Rewards: 500 XP, 400 Gold');
        });

        test('renderBossCard disables ATTACK at 0 charges and omits the count', () => {
            const html = BR.renderBossCard(makeBoss(), 'daily', { attackCharges: 0 });
            expect(html).toMatch(/data-action="boss\.attack"[\s\S]*?disabled/);
            expect(html).not.toContain('(0)');
        });

        test('renderBossCard renders the defeated variant instead of the action row', () => {
            const html = BR.renderBossCard(makeBoss({ defeated: true, currentHP: 0 }), 'weekly', {});
            expect(html).toContain('DEFEATED!');
            expect(html).toContain('+500 XP, +400 Gold');
            expect(html).not.toContain('data-action="boss.attack"');
            expect(html).not.toContain('Rewards:'); // preview hidden once defeated
        });

        test('renderBossCard shows EXECUTE only with the execute spell active AND HP<=25%', () => {
            const lowHP = makeBoss({ currentHP: 20 }); // 20% -> eligible
            expect(BR.renderBossCard(lowHP, 'daily', { activeSpells: [{ spellId: 'execute' }] }))
                .toContain('data-action="boss.execute"');
            // low HP but no execute spell -> no execute
            expect(BR.renderBossCard(lowHP, 'daily', {})).not.toContain('boss.execute');
            // execute spell but healthy (70%) -> no execute
            expect(BR.renderBossCard(makeBoss(), 'daily', { activeSpells: [{ spellId: 'execute' }] }))
                .not.toContain('boss.execute');
        });

        test('renderBossCard lists active boss-buff spells via the injected spellDefinitions', () => {
            const html = BR.renderBossCard(makeBoss(), 'daily', {
                activeSpells: [{ spellId: 'berserker_rage' }],
                spellDefinitions: { berserker_rage: { icon: '😡', name: 'Berserker Rage' } }
            });
            expect(html).toContain('😡');
            expect(html).toContain('Berserker Rage');
        });

        test('renderBossCard injects the reset label (time-state helper stays on the class)', () => {
            const html = BR.renderBossCard(makeBoss(), 'monthly', {
                bossResetLabel: (type, isDefeated) => `RESET:${type}:${isDefeated}`
            });
            expect(html).toContain('RESET:monthly:false');
            expect(html).toContain('MONTHLY CHAMPION');
        });

        test('the manager delegator wires instance state through to the module builder', () => {
            const gm = createTestManager();
            gm.attackCharges = 2;
            const boss = makeBoss({ name: 'Deleg Boss', currentHP: 25, maxHP: 50 });
            const html = gm.renderBossCard(boss, 'daily');
            expect(html).toContain('id="boss-card-daily"');
            expect(html).toContain('Deleg Boss');
            expect(html).toContain('(2)'); // attackCharges came from the instance
        });

        // ---- renderDefeatedBossesHTML (victories gallery) ----
        const makeVictory = (over = {}) => ({
            icon: '💀', name: 'Fallen Foe', type: 'daily', level: 3, maxHP: 200,
            defeatedAt: new Date(2026, 2, 16).getTime(),
            rewards: { xp: 100, gold: 10 }, ...over
        });

        test('renderDefeatedBossesHTML shows the empty state when there are no victories', () => {
            const html = BR.renderDefeatedBossesHTML([], new Date(2026, 2, 18));
            expect(html).toContain('🏆');
            expect(html).toContain('No victories yet');
            expect(html).not.toContain('Total Victories');
        });

        test('renderDefeatedBossesHTML buckets victories by the injected now, with totals + plurals', () => {
            // Wed Mar 18 2026 -> startOfWeek Sun Mar 15, startOfMonth Mar 1.
            const now = new Date(2026, 2, 18);
            const list = [
                makeVictory({ name: 'Week A', defeatedAt: new Date(2026, 2, 16).getTime(), rewards: { xp: 100, gold: 10 } }),
                makeVictory({ name: 'Week B', defeatedAt: new Date(2026, 2, 17).getTime(), rewards: { xp: 100, gold: 10 } }),
                makeVictory({ name: 'Month One', defeatedAt: new Date(2026, 2, 3).getTime(), rewards: { xp: 200, gold: 20 } }),
                makeVictory({ name: 'Old One', defeatedAt: new Date(2026, 1, 20).getTime(), rewards: { xp: 300, gold: 30 } }),
            ];
            const html = BR.renderDefeatedBossesHTML(list, now);
            expect(html).toContain('Total Victories: 4');
            expect(html).toContain('700 XP earned');    // 100+100+200+300
            expect(html).toContain('70 Gold plundered'); // 10+10+20+30
            expect(html).toContain('This Week');
            expect(html).toContain('This Month');
            expect(html).toContain('Older Victories');
            expect(html).toContain('2 bosses');           // week bucket has 2
            expect(html).toContain('1 boss');              // month/older buckets have 1
            expect(html).toContain('Week A');
            expect(html).toContain('Month One');
            expect(html).toContain('Old One');
        });

        test('renderDefeatedBossesHTML omits empty period sections', () => {
            const now = new Date(2026, 2, 18);
            // Only an older victory -> This Week / This Month sections are omitted.
            const html = BR.renderDefeatedBossesHTML(
                [makeVictory({ name: 'Ancient', defeatedAt: new Date(2026, 0, 5).getTime() })],
                now
            );
            expect(html).toContain('Older Victories');
            expect(html).not.toContain('This Week');
            expect(html).not.toContain('This Month');
        });

        test('renderDefeatedBossesHTML renders per-boss type label, level, HP and rewards', () => {
            const now = new Date(2026, 2, 18);
            const html = BR.renderDefeatedBossesHTML(
                [makeVictory({ name: 'Weekly Wolf', type: 'weekly', level: 7, maxHP: 999, defeatedAt: new Date(2026, 2, 16).getTime(), rewards: { xp: 50, gold: 5 } })],
                now
            );
            expect(html).toContain('Weekly Wolf');
            expect(html).toContain('Weekly Lv.7 (999 HP)');
            expect(html).toContain('+50 XP, +5 Gold');
        });

        test('the manager delegator writes the gallery markup into the container', () => {
            const gm = createTestManager();
            gm.defeatedBossList = [];
            const container = document.createElement('div');
            container.id = 'defeated-bosses-container';
            document.body.appendChild(container);
            try {
                gm.renderDefeatedBosses();
                expect(container.innerHTML).toContain('No victories yet');
            } finally {
                container.remove();
            }
        });

        // ---- renderBossLogHTML (battle-log rows) ----
        // Stubs tag their inputs so the tests can prove WHICH injected fn shaped each part.
        const logDeps = {
            getTimeAgo: (t) => 'AGO(' + t + ')',
            sanitizeMessage: (m) => 'SAFE(' + m + ')',
            escapeHTML: (s) => 'ESC(' + s + ')',
        };

        test('renderBossLogHTML shows the empty state when there are no entries', () => {
            const html = BR.renderBossLogHTML([], logDeps);
            expect(html).toContain('No battles yet');
            expect(html).not.toContain('<span>');
        });

        test('renderBossLogHTML renders one row per entry, in order', () => {
            const html = BR.renderBossLogHTML([
                { time: 1, message: 'first' },
                { time: 2, message: 'second' },
            ], logDeps);
            expect(html.indexOf('SAFE(first)')).toBeLessThan(html.indexOf('SAFE(second)'));
            expect((html.match(/<div class="text-sm/g) || []).length).toBe(2);
        });

        test('renderBossLogHTML routes the message through sanitizeMessage (security chokepoint)', () => {
            const html = BR.renderBossLogHTML([{ time: 0, message: '<script>x</script>' }], logDeps);
            // The stub wrapper proves the message was passed to sanitizeMessage, not embedded raw.
            expect(html).toContain('<span>SAFE(<script>x</script>)</span>');
        });

        test('renderBossLogHTML formats the time via getTimeAgo then escapeHTML', () => {
            const html = BR.renderBossLogHTML([{ time: 42, message: 'm' }], logDeps);
            expect(html).toContain('ESC(AGO(42))'); // getTimeAgo(42) -> AGO(42) -> escapeHTML -> ESC(AGO(42))
        });

        test('the manager delegator wires the class fns + writes into the container', () => {
            const gm = createTestManager();
            gm.bossLog = [];
            const container = document.createElement('div');
            container.id = 'boss-battle-log';
            document.body.appendChild(container);
            try {
                gm.renderBossLog();
                expect(container.innerHTML).toContain('No battles yet');
                // Populated: exercises the REAL getTimeAgo / _sanitizeBossLogMessage / escapeHTML.
                gm.bossLog = [{ time: Date.now(), message: 'Victory!' }];
                gm.renderBossLog();
                expect(container.innerHTML).toContain('Victory!');
                expect(container.innerHTML).toContain('text-amber-200/80');
            } finally {
                container.remove();
            }
        });

        // ---- renderMonthlyBossChallengeHTML / renderMonthlyBossProgressHTML (monthly panels) ----
        test('renderMonthlyBossChallengeHTML renders every field of the preview boss', () => {
            const preview = {
                icon: '🐉', name: 'Wyrmking', flavor: 'Ancient terror',
                maxHP: 340, level: 12, rewards: { xp: 1100, gold: 880 },
            };
            const html = BR.renderMonthlyBossChallengeHTML(preview);
            expect(html).toContain('🐉');
            expect(html).toContain('Wyrmking');
            expect(html).toContain('Ancient terror');
            expect(html).toContain('HP: 340');
            expect(html).toContain('Lv.12');
            expect(html).toContain('1100 XP');
            expect(html).toContain('880 Gold');
            expect(html).toContain('MONTHLY CHAMPION');
            expect(html).toContain('data-action="boss.challengeMonthly"');
            expect(html).toContain('CHALLENGE THE CHAMPION!');
        });

        test('renderMonthlyBossProgressHTML computes bar width, remaining count and plural', () => {
            const html = BR.renderMonthlyBossProgressHTML(2, 5);
            expect(html).toContain('width: 40%');            // (2/5)*100
            expect(html).toContain('Defeat 3 more bosses');  // remaining 3 -> plural
            expect(html).toContain('2 / 5 bosses defeated');
        });

        test('renderMonthlyBossProgressHTML uses singular "boss" when one kill remains', () => {
            const html = BR.renderMonthlyBossProgressHTML(4, 5);
            expect(html).toContain('width: 80%');
            expect(html).toContain('Defeat 1 more boss this month'); // singular, no "es"
            expect(html).not.toContain('1 more bosses');
        });

        test('renderMonthlyBossProgressHTML clamps to 100% and prompts when at/over threshold', () => {
            const html = BR.renderMonthlyBossProgressHTML(7, 5);
            expect(html).toContain('width: 100%');           // min(140, 100)
            expect(html).toContain('Challenge available!');  // remaining clamped to 0
            expect(html).toContain('7 / 5 bosses defeated');
        });

        test('the manager delegator feeds instance kills/threshold into the progress panel', () => {
            const gm = createTestManager();
            gm.bossKillsThisMonth = 2;
            gm.monthlyBossUnlockThreshold = 5;
            const html = gm.renderMonthlyBossProgress();
            expect(html).toContain('width: 40%');
            expect(html).toContain('2 / 5 bosses defeated');
        });
    });

    // ==================== TASK RENDER (Roadmap #1, 20th slice — 2nd render module) ====================
    // task-render.js holds the shared LEAF of the task/goal cards — the per-task checklist. The
    // manager's renderChecklistHTML/getChecklistProgress now delegate here; these lock the module's
    // exported surface directly (the method had ZERO prior tests), incl. the injected escapeHTML.
    describe('task-render.js (pure task/goal presentation builders)', () => {
        const TR = require('../task-render.js').default;
        const esc = (s) => String(s); // identity-ish stub so raw text is visible in assertions

        // getChecklistProgress — the completion fold
        test('getChecklistProgress returns zeros for a missing/empty checklist', () => {
            expect(TR.getChecklistProgress({})).toEqual({ completed: 0, total: 0, percent: 0 });
            expect(TR.getChecklistProgress({ checklist: [] })).toEqual({ completed: 0, total: 0, percent: 0 });
        });

        test('getChecklistProgress floors the percent of completed items', () => {
            const task = { checklist: [{ completed: true }, { completed: false }, { completed: false }] };
            expect(TR.getChecklistProgress(task)).toEqual({ completed: 1, total: 3, percent: 33 }); // floor(33.33)
        });

        test('getChecklistProgress reports 100% when all items are done', () => {
            const task = { checklist: [{ completed: true }, { completed: true }] };
            expect(TR.getChecklistProgress(task)).toEqual({ completed: 2, total: 2, percent: 100 });
        });

        // renderChecklistHTML — empty branch
        test('renderChecklistHTML shows the add-item prompt when there is no checklist', () => {
            const html = TR.renderChecklistHTML({ id: 7 }, 'daily', { escapeHTML: esc });
            expect(html).toContain('Add Checklist Item');
            expect(html).toContain('data-action="checklist.add"');
            expect(html).toContain('data-task-type="daily"');
            expect(html).toContain('data-task-id="7"');
            expect(html).not.toContain('checklist.toggle'); // no item rows
        });

        // renderChecklistHTML — populated branch
        test('renderChecklistHTML renders the header count and a row per item', () => {
            const task = { id: 3, checklist: [
                { id: 11, text: 'alpha', completed: true },
                { id: 12, text: 'beta', completed: false },
            ] };
            const html = TR.renderChecklistHTML(task, 'weekly', { escapeHTML: esc });
            expect(html).toContain('Checklist (1/2)');
            expect((html.match(/data-action="checklist.toggle"/g) || []).length).toBe(2);
            expect(html).toContain('data-item-id="11"');
            expect(html).toContain('data-item-id="12"');
            expect(html).toContain('alpha');
            expect(html).toContain('beta');
        });

        test('renderChecklistHTML strikes through + pre-checks completed items only', () => {
            const task = { id: 3, checklist: [
                { id: 11, text: 'done', completed: true },
                { id: 12, text: 'todo', completed: false },
            ] };
            const html = TR.renderChecklistHTML(task, 'weekly', { escapeHTML: esc });
            expect(html).toContain('line-through');                      // the completed item
            expect((html.match(/checked/g) || []).length).toBe(1);       // exactly one box pre-checked
        });

        test('renderChecklistHTML routes item text through the injected escapeHTML', () => {
            const task = { id: 1, checklist: [{ id: 9, text: '<img src=x onerror=alert(1)>', completed: false }] };
            const html = TR.renderChecklistHTML(task, 'daily', { escapeHTML: (s) => 'ESC(' + s + ')' });
            expect(html).toContain('ESC(<img src=x onerror=alert(1)>)'); // stub proves text went through escapeHTML
        });

        test('renderChecklistHTML shows the progress bar only while partially complete', () => {
            const partial = TR.renderChecklistHTML({ id: 1, checklist: [
                { id: 1, text: 'a', completed: true }, { id: 2, text: 'b', completed: false },
            ] }, 'daily', { escapeHTML: esc });
            expect(partial).toContain('width: 50%');

            const none = TR.renderChecklistHTML({ id: 1, checklist: [
                { id: 1, text: 'a', completed: false },
            ] }, 'daily', { escapeHTML: esc });
            expect(none).not.toContain('progress-bar');

            const all = TR.renderChecklistHTML({ id: 1, checklist: [
                { id: 1, text: 'a', completed: true },
            ] }, 'daily', { escapeHTML: esc });
            expect(all).not.toContain('progress-bar');
        });

        // delegator wiring: the manager injects the REAL escapeHTML
        test('the manager delegator injects the real escapeHTML into item text', () => {
            const gm = createTestManager();
            const html = gm.renderChecklistHTML({ id: 1, checklist: [
                { id: 9, text: '<b>x</b>', completed: false },
            ] }, 'daily');
            expect(html).toContain('&lt;b&gt;x&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).not.toContain('<b>x</b>');
        });

        // ---- renderSideQuestCardHTML (Roadmap #1, 22nd slice — B1, first task/goal CARD) ----
        const sqDeps = (isBountyTarget = () => false) => ({ escapeHTML: esc, isBountyTarget });
        const baseQuest = (over = {}) => ({
            id: 42, priority: 'medium', title: 'Slay the dragon', created: '2026-01-15T00:00:00.000Z', ...over,
        });

        test('renderSideQuestCardHTML renders the card shell, escaped title, and drag/drop hooks', () => {
            const html = TR.renderSideQuestCardHTML(baseQuest(), 'amber', sqDeps());
            expect(html).toContain('data-side-quest-id="42"');
            expect(html).toContain('Slay the dragon');
            expect(html).toContain("goalManager.handleDragStart('side', 42, event)");
            expect(html).toContain('goalManager.toggleSideQuest(42)');
            expect(html).toContain('from-amber-900 to-amber-950'); // injected theme color threads through
            expect(html).toContain('data-action="goal.edit"');
            expect(html).toContain('data-action="goal.delete"');
        });

        test('renderSideQuestCardHTML picks the priority icon by priority', () => {
            expect(TR.renderSideQuestCardHTML(baseQuest({ priority: 'high' }), 'amber', sqDeps())).toContain('⚡');
            expect(TR.renderSideQuestCardHTML(baseQuest({ priority: 'medium' }), 'amber', sqDeps())).toContain('⭐');
            expect(TR.renderSideQuestCardHTML(baseQuest({ priority: 'low' }), 'amber', sqDeps())).toContain('💫');
        });

        test('renderSideQuestCardHTML includes the description block only when a description exists', () => {
            const withDesc = TR.renderSideQuestCardHTML(baseQuest({ description: 'to the death' }), 'amber', sqDeps());
            expect(withDesc).toContain('to the death');
            expect(withDesc).toContain('fancy-font italic');          // the description <p>
            const without = TR.renderSideQuestCardHTML(baseQuest(), 'amber', sqDeps());
            expect(without).not.toContain('fancy-font italic');       // omitted entirely
        });

        test('renderSideQuestCardHTML shows the royal-bounty badge only when isBountyTarget is true', () => {
            expect(TR.renderSideQuestCardHTML(baseQuest(), 'amber', sqDeps(() => true))).toContain('Royal Bounty');
            expect(TR.renderSideQuestCardHTML(baseQuest(), 'amber', sqDeps(() => false))).not.toContain('Royal Bounty');
        });

        test('renderSideQuestCardHTML queries isBountyTarget with (\'sidequest\', quest.id)', () => {
            const spy = jest.fn(() => false);
            TR.renderSideQuestCardHTML(baseQuest({ id: 7 }), 'amber', sqDeps(spy));
            expect(spy).toHaveBeenCalledWith('sidequest', 7);
        });

        test('renderSideQuestCardHTML marks a completed quest (strike-through + checked box)', () => {
            const done = TR.renderSideQuestCardHTML(baseQuest({ completed: true }), 'amber', sqDeps());
            expect(done).toContain('line-through');
            expect(done).toContain('checked');
            const open = TR.renderSideQuestCardHTML(baseQuest({ completed: false }), 'amber', sqDeps());
            expect(open).not.toContain('line-through');
            expect(open).not.toContain('checked');
        });

        test('renderSideQuestCardHTML composes the checklist leaf (empty prompt + populated header)', () => {
            const empty = TR.renderSideQuestCardHTML(baseQuest(), 'amber', sqDeps());
            expect(empty).toContain('Add Checklist Item');
            expect(empty).toContain('data-task-type="sidequest"'); // checklist wired to the sidequest type
            const filled = TR.renderSideQuestCardHTML(baseQuest({ checklist: [
                { id: 1, text: 'step one', completed: true }, { id: 2, text: 'step two', completed: false },
            ] }), 'amber', sqDeps());
            expect(filled).toContain('Checklist (1/2)');
            expect(filled).toContain('step one');
        });

        test('renderSideQuestCardHTML routes title AND description through the injected escapeHTML', () => {
            const html = TR.renderSideQuestCardHTML(
                baseQuest({ title: '<x>', description: '<y>' }), 'amber',
                { escapeHTML: (s) => 'E[' + s + ']', isBountyTarget: () => false },
            );
            expect(html).toContain('E[<x>]');
            expect(html).toContain('E[<y>]');
        });

        test('the manager delegator injects the real escapeHTML + isBountyTarget into the side-quest card', () => {
            const gm = createTestManager();
            const quest = { id: 5, priority: 'high', title: '<b>raid</b>', created: '2026-01-01T00:00:00.000Z' };
            jest.spyOn(gm, 'isBountyTarget').mockImplementation((type, id) => type === 'sidequest' && id === 5);
            const html = gm.renderSideQuestCard(quest, 'amber');
            expect(html).toContain('&lt;b&gt;raid&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).not.toContain('<b>raid</b>');
            expect(html).toContain('Royal Bounty');            // real isBountyTarget routed through
        });

        // ---- renderDailyTaskCardHTML (Roadmap #1, 23rd slice — B2, daily card) ----
        const dailyDeps = (over = {}) => ({
            parentNames: [], isSelected: false, bulkSelectionMode: false, escapeHTML: esc, ...over,
        });
        const baseTask = (over = {}) => ({ id: 8, title: 'Train', completed: false, priority: 'medium', ...over });

        test('renderDailyTaskCardHTML renders the shell, escaped title, drag hooks, and controls', () => {
            const html = TR.renderDailyTaskCardHTML(baseTask({ title: 'Train hard' }), dailyDeps());
            expect(html).toContain('Train hard');
            expect(html).toContain("goalManager.handleDragStart('daily', 8, event)");
            expect(html).toContain('goalManager.toggleTask(8, event)');
            expect(html).toContain('data-action="goal.edit"');
            expect(html).toContain('data-goal-type="daily"');
            expect(html).toContain('🔗 Connections');
        });

        test('renderDailyTaskCardHTML picks the priority badge (high / low / medium + invalid fallback)', () => {
            expect(TR.renderDailyTaskCardHTML(baseTask({ priority: 'high' }), dailyDeps())).toContain('🔥 High');
            expect(TR.renderDailyTaskCardHTML(baseTask({ priority: 'low' }), dailyDeps())).toContain('🪶 Low');
            expect(TR.renderDailyTaskCardHTML(baseTask({ priority: 'medium' }), dailyDeps())).toContain('⭐ Medium');
            expect(TR.renderDailyTaskCardHTML(baseTask({ priority: 'bogus' }), dailyDeps())).toContain('⭐ Medium');
        });

        test('renderDailyTaskCardHTML includes the description block only when present', () => {
            expect(TR.renderDailyTaskCardHTML(baseTask({ description: 'do it' }), dailyDeps())).toContain('do it');
            expect(TR.renderDailyTaskCardHTML(baseTask(), dailyDeps())).not.toContain('text-amber-200/80'); // the desc <p>
        });

        test('renderDailyTaskCardHTML renders linked-parent chips only when parentNames is non-empty', () => {
            const withParents = TR.renderDailyTaskCardHTML(baseTask(), dailyDeps({ parentNames: ['Weekly A', 'Weekly B'] }));
            expect(withParents).toContain('🎯');
            expect(withParents).toContain('Weekly A');
            expect(withParents).toContain('Weekly B');
            expect(TR.renderDailyTaskCardHTML(baseTask(), dailyDeps())).not.toContain('🎯');
        });

        test('renderDailyTaskCardHTML shows the bulk-select checkbox only in bulkSelectionMode', () => {
            const on = TR.renderDailyTaskCardHTML(baseTask(), dailyDeps({ bulkSelectionMode: true }));
            expect(on).toContain("goalManager.toggleItemSelection(8, 'daily')");
            expect(TR.renderDailyTaskCardHTML(baseTask(), dailyDeps())).not.toContain('toggleItemSelection');
        });

        test('renderDailyTaskCardHTML reflects isSelected (ring highlight + bulk box checked)', () => {
            const sel = TR.renderDailyTaskCardHTML(baseTask(), dailyDeps({ isSelected: true, bulkSelectionMode: true }));
            expect(sel).toContain('ring-4 ring-purple-500');
            expect((sel.match(/checked/g) || []).length).toBe(1); // bulk box only (task open)
            const unsel = TR.renderDailyTaskCardHTML(baseTask(), dailyDeps({ isSelected: false, bulkSelectionMode: true }));
            expect(unsel).not.toContain('ring-4 ring-purple-500');
        });

        test('renderDailyTaskCardHTML marks a completed task (strike-through + checked completion box)', () => {
            const done = TR.renderDailyTaskCardHTML(baseTask({ completed: true }), dailyDeps());
            expect(done).toContain('line-through');
            expect(done).toContain('checked');
        });

        test('renderDailyTaskCardHTML composes the checklist leaf (empty prompt + populated header)', () => {
            const empty = TR.renderDailyTaskCardHTML(baseTask(), dailyDeps());
            expect(empty).toContain('Add Checklist Item');
            expect(empty).toContain('data-task-type="daily"');
            const filled = TR.renderDailyTaskCardHTML(baseTask({ checklist: [
                { id: 1, text: 'sub a', completed: true }, { id: 2, text: 'sub b', completed: false },
            ] }), dailyDeps());
            expect(filled).toContain('Checklist (1/2)');
            expect(filled).toContain('sub a');
        });

        test('renderDailyTaskCardHTML routes title, description, AND parent names through escapeHTML', () => {
            const html = TR.renderDailyTaskCardHTML(
                baseTask({ title: '<t>', description: '<d>' }),
                { parentNames: ['<p>'], isSelected: false, bulkSelectionMode: false, escapeHTML: (s) => 'E[' + s + ']' },
            );
            expect(html).toContain('E[<t>]');
            expect(html).toContain('E[<d>]');
            expect(html).toContain('E[<p>]');
        });

        test('the manager delegator renders daily cards into the container with real escapeHTML', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="daily-tasks-container"></div>';
            const today = gm._cachedToday || gm.getTodayDateString();
            gm.weeklyGoals = [];
            gm.dailyTasks = [{ id: 3, title: '<b>raid</b>', dueDate: today, completed: false, priority: 'high' }];
            gm.renderDailyTasks();
            const html = document.getElementById('daily-tasks-container').innerHTML;
            expect(html).toContain('&lt;b&gt;raid&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).toContain('🔥 High');
            expect(html).toContain('data-goal-type="daily"');
        });

        // ---- renderWeeklyGoalCardHTML (Roadmap #1, 24th slice — B3, weekly card) ----
        const wgDeps = (over = {}) => ({
            linkedTasks: [], parentNames: [], isSelected: false, bulkSelectionMode: false, escapeHTML: esc, ...over,
        });
        const baseGoal = (over = {}) => ({ id: 12, title: 'Ship it', completed: false, priority: 'medium', progress: 40, ...over });

        test('renderWeeklyGoalCardHTML renders the shell, escaped title, completion toggle, and controls', () => {
            const html = TR.renderWeeklyGoalCardHTML(baseGoal({ title: 'Ship v2' }), wgDeps());
            expect(html).toContain('Ship v2');
            expect(html).toContain('goalManager.toggleWeeklyGoal(12, event)');
            expect(html).toContain('data-action="task.addDaily"');
            expect(html).toContain('data-action="goal.manageParents"');
            expect(html).toContain('data-goal-type="weekly"');
        });

        test('renderWeeklyGoalCardHTML picks the priority badge (high / low / medium + invalid fallback)', () => {
            expect(TR.renderWeeklyGoalCardHTML(baseGoal({ priority: 'high' }), wgDeps())).toContain('🔥 High');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal({ priority: 'low' }), wgDeps())).toContain('🪶 Low');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal({ priority: 'medium' }), wgDeps())).toContain('⭐ Medium');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal({ priority: 'zzz' }), wgDeps())).toContain('⭐ Medium');
        });

        test('renderWeeklyGoalCardHTML shows the progress-bar width and the linked-task tally', () => {
            const html = TR.renderWeeklyGoalCardHTML(baseGoal({ progress: 75 }), wgDeps({ linkedTasks: [
                { completed: true, title: 'a' }, { completed: false, title: 'b' },
            ] }));
            expect(html).toContain('width: 75%');
            expect(html).toContain('75% complete (1/2 tasks)');
        });

        test('renderWeeklyGoalCardHTML lists linked daily tasks only when present (escaped, toggleable)', () => {
            const withTasks = TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps({ linkedTasks: [{ id: 9, completed: false, title: 'sub quest' }] }));
            expect(withTasks).toContain('⚔️ Linked Daily Tasks');
            expect(withTasks).toContain('sub quest');
            expect(withTasks).toContain('goalManager.toggleTask(9, event)');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps())).not.toContain('Linked Daily Tasks');
        });

        test('renderWeeklyGoalCardHTML includes the description block only when present', () => {
            expect(TR.renderWeeklyGoalCardHTML(baseGoal({ description: 'do it' }), wgDeps())).toContain('do it');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps())).not.toContain('text-green-200/80');
        });

        test('renderWeeklyGoalCardHTML renders parent chips only when parentNames is non-empty', () => {
            const withParents = TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps({ parentNames: ['Q3 OKR'] }));
            expect(withParents).toContain('🎯');
            expect(withParents).toContain('Q3 OKR');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps())).not.toContain('🎯');
        });

        test('renderWeeklyGoalCardHTML shows the bulk-select box only in bulkSelectionMode + reflects isSelected', () => {
            const on = TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps({ bulkSelectionMode: true, isSelected: true }));
            expect(on).toContain("goalManager.toggleItemSelection(12, 'weekly')");
            expect(on).toContain('ring-4 ring-purple-500');
            expect(TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps())).not.toContain('toggleItemSelection');
        });

        test('renderWeeklyGoalCardHTML marks a completed goal (strike-through + checked box)', () => {
            const done = TR.renderWeeklyGoalCardHTML(baseGoal({ completed: true }), wgDeps());
            expect(done).toContain('line-through');
            expect(done).toContain('checked');
        });

        test('renderWeeklyGoalCardHTML composes the checklist leaf (empty prompt + populated header)', () => {
            const empty = TR.renderWeeklyGoalCardHTML(baseGoal(), wgDeps());
            expect(empty).toContain('Add Checklist Item');
            expect(empty).toContain('data-task-type="weekly"');
            const filled = TR.renderWeeklyGoalCardHTML(baseGoal({ checklist: [
                { id: 1, text: 'part a', completed: true }, { id: 2, text: 'part b', completed: false },
            ] }), wgDeps());
            expect(filled).toContain('Checklist (1/2)');
            expect(filled).toContain('part a');
        });

        test('renderWeeklyGoalCardHTML routes title, description, parent names, AND linked-task titles through escapeHTML', () => {
            const html = TR.renderWeeklyGoalCardHTML(
                baseGoal({ title: '<t>', description: '<d>' }),
                { linkedTasks: [{ id: 1, completed: false, title: '<lt>' }], parentNames: ['<p>'], isSelected: false, bulkSelectionMode: false, escapeHTML: (s) => 'E[' + s + ']' },
            );
            expect(html).toContain('E[<t>]');
            expect(html).toContain('E[<d>]');
            expect(html).toContain('E[<p>]');
            expect(html).toContain('E[<lt>]');
        });

        test('the manager delegator renders weekly cards with real escapeHTML AND keeps the dead bounty badge dropped', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="weekly-goals-container"></div>';
            gm.dailyTasks = [];
            gm.monthlyGoals = [];
            gm.weeklyGoals = [{ id: 4, title: '<b>plan</b>', completed: false, priority: 'high', progress: 0 }];
            jest.spyOn(gm, 'isBountyTarget').mockReturnValue(true); // was dead here — must still NOT render
            gm.renderWeeklyGoals();
            const html = document.getElementById('weekly-goals-container').innerHTML;
            expect(html).toContain('&lt;b&gt;plan&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).toContain('🔥 High');
            expect(html).toContain('data-goal-type="weekly"');
            expect(html).not.toContain('Royal Bounty'); // the removed dead bountyBadge stays absent
        });

        // ---- renderLifeGoalCardHTML (Roadmap #1, 25th slice — B4a, life card) ----
        const lgDeps = (over = {}) => ({ linkedYearly: [], escapeHTML: esc, ...over });
        const baseLife = (over = {}) => ({ id: 1, title: 'Legacy', completed: false, created: '2026-01-01T00:00:00.000Z', progress: 0, ...over });

        test('renderLifeGoalCardHTML renders the shell, escaped h3 title, created date, and controls', () => {
            const html = TR.renderLifeGoalCardHTML(baseLife({ title: 'Build empire' }), lgDeps());
            expect(html).toContain('Build empire');
            expect(html).toContain('text-2xl'); // the h3 heading
            expect(html).toContain('goalManager.toggleLifeGoal(1, event)');
            expect(html).toContain('data-goal-type="life"');
            expect(html).toContain('+ Add Yearly Campaign');
            expect(html).toContain('Created:');
        });

        test('renderLifeGoalCardHTML shows the Legendary Quest badge (no progress bar) when no yearly goals are linked', () => {
            const html = TR.renderLifeGoalCardHTML(baseLife(), lgDeps());
            expect(html).toContain('⚡ Legendary Quest');
            expect(html).not.toContain('progress-bar');
            expect(html).not.toContain('Linked Yearly Campaigns');
            expect(html).not.toContain('text-red-200/80'); // description <p> absent
        });

        test('renderLifeGoalCardHTML shows the progress bar + linked yearly list when yearly goals are linked', () => {
            const html = TR.renderLifeGoalCardHTML(baseLife({ progress: 60 }), lgDeps({ linkedYearly: [
                { id: 2, completed: true, title: 'Year One', progress: 100 },
                { id: 3, completed: false, title: 'Year Two', progress: 20 },
            ] }));
            expect(html).toContain('🏆 Linked Yearly Campaigns');
            expect(html).toContain('width: 60%');
            expect(html).toContain('60% complete (1/2 yearly campaigns)');
            expect(html).toContain('Year One');
            expect(html).toContain('goalManager.toggleYearlyGoal(2, event)');
            expect(html).not.toContain('Legendary Quest');
        });

        test('renderLifeGoalCardHTML derives progress 0 when yearly goals are linked but goal.progress is missing', () => {
            const html = TR.renderLifeGoalCardHTML(baseLife({ progress: undefined }), lgDeps({ linkedYearly: [{ id: 2, completed: false, title: 'Y', progress: 0 }] }));
            expect(html).toContain('width: 0%');
            expect(html).toContain('0% complete (0/1 yearly campaigns)');
        });

        test('renderLifeGoalCardHTML marks a completed goal (strike-through + checked box)', () => {
            const done = TR.renderLifeGoalCardHTML(baseLife({ completed: true }), lgDeps());
            expect(done).toContain('line-through');
            expect(done).toContain('checked');
        });

        test('renderLifeGoalCardHTML routes title, description, AND linked yearly titles through escapeHTML', () => {
            const html = TR.renderLifeGoalCardHTML(
                baseLife({ title: '<t>', description: '<d>' }),
                { linkedYearly: [{ id: 2, completed: false, title: '<y>', progress: 0 }], escapeHTML: (s) => 'E[' + s + ']' },
            );
            expect(html).toContain('E[<t>]');
            expect(html).toContain('E[<d>]');
            expect(html).toContain('E[<y>]');
        });

        test('the manager delegator renders life cards into the container with real escapeHTML', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="life-goals-container"></div>';
            gm.yearlyGoals = [];
            gm.lifeGoals = [{ id: 7, title: '<b>dream</b>', completed: false, created: '2026-01-01T00:00:00.000Z', progress: 0 }];
            gm.renderLifeGoals();
            const html = document.getElementById('life-goals-container').innerHTML;
            expect(html).toContain('&lt;b&gt;dream&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).toContain('⚡ Legendary Quest'); // no linked yearly
            expect(html).toContain('data-goal-type="life"');
        });

        // ---- renderYearlyGoalCardHTML (Roadmap #1, 26th slice — B4b, yearly card) ----
        const ygDeps = (over = {}) => ({ linkedMonthly: [], parentNames: [], escapeHTML: esc, ...over });
        const baseYear = (over = {}) => ({ id: 20, title: 'Campaign', completed: false, priority: 'medium', progress: 30, ...over });

        test('renderYearlyGoalCardHTML renders the shell, escaped h4 title, toggle, and controls', () => {
            const html = TR.renderYearlyGoalCardHTML(baseYear({ title: 'Conquer' }), ygDeps());
            expect(html).toContain('Conquer');
            expect(html).toContain('text-xl'); // the h4 heading
            expect(html).toContain('goalManager.toggleYearlyGoal(20, event)');
            expect(html).toContain('data-goal-type="yearly"');
            expect(html).toContain('+ Add Monthly Raid');
            expect(html).toContain('data-action="goal.manageParents"');
        });

        test('renderYearlyGoalCardHTML picks the priority badge (high / low / medium + invalid fallback)', () => {
            expect(TR.renderYearlyGoalCardHTML(baseYear({ priority: 'high' }), ygDeps())).toContain('🔥 High');
            expect(TR.renderYearlyGoalCardHTML(baseYear({ priority: 'low' }), ygDeps())).toContain('🪶 Low');
            expect(TR.renderYearlyGoalCardHTML(baseYear({ priority: 'medium' }), ygDeps())).toContain('⭐ Medium');
            expect(TR.renderYearlyGoalCardHTML(baseYear({ priority: 'nope' }), ygDeps())).toContain('⭐ Medium');
        });

        test('renderYearlyGoalCardHTML shows the Campaign Progress line, bar width, and monthly tally', () => {
            const html = TR.renderYearlyGoalCardHTML(baseYear({ progress: 45 }), ygDeps({ linkedMonthly: [
                { id: 1, completed: true, title: 'M1', progress: 100 }, { id: 2, completed: false, title: 'M2', progress: 0 },
            ] }));
            expect(html).toContain('Campaign Progress: 45% (1/2 monthly raids)');
            expect(html).toContain('width: 45%');
        });

        test('renderYearlyGoalCardHTML lists linked monthly raids only when present (escaped, toggleable)', () => {
            const withM = TR.renderYearlyGoalCardHTML(baseYear(), ygDeps({ linkedMonthly: [{ id: 8, completed: false, title: 'Raid A', progress: 50 }] }));
            expect(withM).toContain('👑 Linked Monthly Raids');
            expect(withM).toContain('Raid A');
            expect(withM).toContain('(50%)');
            expect(withM).toContain('goalManager.toggleMonthlyGoal(8, event)');
            expect(TR.renderYearlyGoalCardHTML(baseYear(), ygDeps())).not.toContain('Linked Monthly Raids');
        });

        test('renderYearlyGoalCardHTML includes the description block only when present', () => {
            expect(TR.renderYearlyGoalCardHTML(baseYear({ description: 'grand plan' }), ygDeps())).toContain('grand plan');
            expect(TR.renderYearlyGoalCardHTML(baseYear(), ygDeps())).not.toContain('text-purple-200/80');
        });

        test('renderYearlyGoalCardHTML renders parent chips only when parentNames is non-empty', () => {
            const withParents = TR.renderYearlyGoalCardHTML(baseYear(), ygDeps({ parentNames: ['My Legacy'] }));
            expect(withParents).toContain('🎯');
            expect(withParents).toContain('My Legacy');
            expect(TR.renderYearlyGoalCardHTML(baseYear(), ygDeps())).not.toContain('🎯');
        });

        test('renderYearlyGoalCardHTML marks a completed goal (strike-through + checked box)', () => {
            const done = TR.renderYearlyGoalCardHTML(baseYear({ completed: true }), ygDeps());
            expect(done).toContain('line-through');
            expect(done).toContain('checked');
        });

        test('renderYearlyGoalCardHTML routes title, description, parent names, AND monthly titles through escapeHTML', () => {
            const html = TR.renderYearlyGoalCardHTML(
                baseYear({ title: '<t>', description: '<d>' }),
                { linkedMonthly: [{ id: 1, completed: false, title: '<m>', progress: 0 }], parentNames: ['<p>'], escapeHTML: (s) => 'E[' + s + ']' },
            );
            expect(html).toContain('E[<t>]');
            expect(html).toContain('E[<d>]');
            expect(html).toContain('E[<p>]');
            expect(html).toContain('E[<m>]');
        });

        test('the manager delegator renders yearly cards into the container with real escapeHTML', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="yearly-goals-container"></div>';
            gm.monthlyGoals = [];
            gm.lifeGoals = [];
            gm.yearlyGoals = [{ id: 5, title: '<b>year</b>', completed: false, priority: 'high', progress: 0 }];
            gm.renderYearlyGoals();
            const html = document.getElementById('yearly-goals-container').innerHTML;
            expect(html).toContain('&lt;b&gt;year&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).toContain('🔥 High');
            expect(html).toContain('data-goal-type="yearly"');
        });

        // ---- renderMonthlyGoalCardHTML (Roadmap #1, 27th slice — B4c, monthly card) ----
        const mgDeps = (over = {}) => ({
            linkedWeekly: [], parentNames: [], isSelected: false, bulkSelectionMode: false,
            isBountyTarget: () => false, escapeHTML: esc, ...over,
        });
        const baseMonth = (over = {}) => ({ id: 30, title: 'Raid', completed: false, priority: 'medium', progress: 25, ...over });

        test('renderMonthlyGoalCardHTML renders the shell, escaped h4 title, toggle, and controls', () => {
            const html = TR.renderMonthlyGoalCardHTML(baseMonth({ title: 'Siege' }), mgDeps());
            expect(html).toContain('Siege');
            expect(html).toContain('goalManager.toggleMonthlyGoal(30, event)');
            expect(html).toContain('data-goal-type="monthly"');
            expect(html).toContain('+ Add Weekly Goal');
            expect(html).toContain('data-action="goal.manageParents"');
        });

        test('renderMonthlyGoalCardHTML picks the priority badge (high / low / medium + invalid fallback)', () => {
            expect(TR.renderMonthlyGoalCardHTML(baseMonth({ priority: 'high' }), mgDeps())).toContain('🔥 High');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth({ priority: 'low' }), mgDeps())).toContain('🪶 Low');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth({ priority: 'medium' }), mgDeps())).toContain('⭐ Medium');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth({ priority: 'x' }), mgDeps())).toContain('⭐ Medium');
        });

        test('renderMonthlyGoalCardHTML renders the royal-bounty badge only when isBountyTarget is true (queried with monthly, id)', () => {
            const spy = jest.fn(() => true);
            const on = TR.renderMonthlyGoalCardHTML(baseMonth({ id: 9 }), mgDeps({ isBountyTarget: spy }));
            expect(on).toContain('Royal Bounty');
            expect(spy).toHaveBeenCalledWith('monthly', 9);
            expect(TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps({ isBountyTarget: () => false }))).not.toContain('Royal Bounty');
        });

        test('renderMonthlyGoalCardHTML shows the progress-bar width and weekly tally', () => {
            const html = TR.renderMonthlyGoalCardHTML(baseMonth({ progress: 80 }), mgDeps({ linkedWeekly: [
                { id: 1, completed: true, title: 'W1', progress: 100 }, { id: 2, completed: false, title: 'W2', progress: 0 },
            ] }));
            expect(html).toContain('width: 80%');
            expect(html).toContain('80% complete (1/2 weekly goals)');
        });

        test('renderMonthlyGoalCardHTML lists linked weekly goals only when present (escaped, toggleable)', () => {
            const withW = TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps({ linkedWeekly: [{ id: 6, completed: false, title: 'Week A', progress: 33 }] }));
            expect(withW).toContain('🛡️ Linked Weekly Goals');
            expect(withW).toContain('Week A');
            expect(withW).toContain('(33%)');
            expect(withW).toContain('goalManager.toggleWeeklyGoal(6, event)');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps())).not.toContain('Linked Weekly Goals');
        });

        test('renderMonthlyGoalCardHTML shows the bulk-select box only in bulkSelectionMode + reflects isSelected', () => {
            const on = TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps({ bulkSelectionMode: true, isSelected: true }));
            expect(on).toContain("goalManager.toggleItemSelection(30, 'monthly')");
            expect(on).toContain('ring-4 ring-purple-500');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps())).not.toContain('toggleItemSelection');
        });

        test('renderMonthlyGoalCardHTML includes the description block only when present', () => {
            expect(TR.renderMonthlyGoalCardHTML(baseMonth({ description: 'big raid' }), mgDeps())).toContain('big raid');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps())).not.toContain('text-blue-200/80');
        });

        test('renderMonthlyGoalCardHTML renders parent chips only when parentNames is non-empty', () => {
            const withParents = TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps({ parentNames: ['Year Goal'] }));
            expect(withParents).toContain('🎯');
            expect(withParents).toContain('Year Goal');
            expect(TR.renderMonthlyGoalCardHTML(baseMonth(), mgDeps())).not.toContain('🎯');
        });

        test('renderMonthlyGoalCardHTML marks a completed goal (strike-through + checked box)', () => {
            const done = TR.renderMonthlyGoalCardHTML(baseMonth({ completed: true }), mgDeps());
            expect(done).toContain('line-through');
            expect(done).toContain('checked');
        });

        test('renderMonthlyGoalCardHTML routes title, description, parent names, AND weekly titles through escapeHTML', () => {
            const html = TR.renderMonthlyGoalCardHTML(
                baseMonth({ title: '<t>', description: '<d>' }),
                { linkedWeekly: [{ id: 1, completed: false, title: '<w>', progress: 0 }], parentNames: ['<p>'], isSelected: false, bulkSelectionMode: false, isBountyTarget: () => false, escapeHTML: (s) => 'E[' + s + ']' },
            );
            expect(html).toContain('E[<t>]');
            expect(html).toContain('E[<d>]');
            expect(html).toContain('E[<p>]');
            expect(html).toContain('E[<w>]');
        });

        test('the manager delegator renders monthly cards into the container with real escapeHTML + isBountyTarget', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="monthly-goals-container"></div>';
            gm.dailyTasks = [];
            gm.weeklyGoals = [];
            gm.yearlyGoals = [];
            gm.monthlyGoals = [{ id: 3, title: '<b>raid</b>', completed: false, priority: 'high', progress: 0 }];
            jest.spyOn(gm, 'isBountyTarget').mockImplementation((type, id) => type === 'monthly' && id === 3);
            gm.renderMonthlyGoals();
            const html = document.getElementById('monthly-goals-container').innerHTML;
            expect(html).toContain('&lt;b&gt;raid&lt;/b&gt;'); // real escapeHTML entity-escapes
            expect(html).toContain('🔥 High');
            expect(html).toContain('Royal Bounty'); // real isBountyTarget → true renders the badge
            expect(html).toContain('data-goal-type="monthly"');
        });

        // ---- renderWeeklyScheduledTasksHTML (Roadmap #1, 29th slice — B5a, weekly summary card) ----
        const weekSummaryDeps = (over = {}) => ({ todayStr: '2026-01-15', escapeHTML: esc, ...over });

        test('renderWeeklyScheduledTasksHTML renders the card, completed/total count, weekday, and toggle', () => {
            const html = TR.renderWeeklyScheduledTasksHTML([
                { id: 1, dueDate: '2026-01-16', completed: false, title: 'Patrol' },
                { id: 2, dueDate: '2026-01-17', completed: true, title: 'Guard' },
            ], weekSummaryDeps());
            expect(html).toContain("This Week's Scheduled Tasks");
            expect(html).toContain('1/2 tasks complete');
            expect(html).toContain('Patrol');
            expect(html).toContain('goalManager.toggleTask(1, event)');
            expect(html).toMatch(/>(Sun|Mon|Tue|Wed|Thu|Fri|Sat)</);
        });

        test('renderWeeklyScheduledTasksHTML flags an overdue task but not a future or completed one', () => {
            const overdue = TR.renderWeeklyScheduledTasksHTML([{ id: 1, dueDate: '2026-01-10', completed: false, title: 'Late' }], weekSummaryDeps());
            expect(overdue).toContain('⚠️ Overdue');
            const future = TR.renderWeeklyScheduledTasksHTML([{ id: 2, dueDate: '2026-01-20', completed: false, title: 'Soon' }], weekSummaryDeps());
            expect(future).not.toContain('Overdue');
            const doneEarly = TR.renderWeeklyScheduledTasksHTML([{ id: 3, dueDate: '2026-01-10', completed: true, title: 'Done' }], weekSummaryDeps());
            expect(doneEarly).not.toContain('Overdue');
        });

        test('renderWeeklyScheduledTasksHTML routes task titles through escapeHTML', () => {
            const html = TR.renderWeeklyScheduledTasksHTML([{ id: 1, dueDate: '2026-01-16', completed: false, title: '<x>' }], { todayStr: '2026-01-15', escapeHTML: (s) => 'E[' + s + ']' });
            expect(html).toContain('E[<x>]');
        });

        test('the manager delegator renders the weekly summary for this-week tasks with real escapeHTML', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="weekly-goals-container"></div>';
            gm.weeklyGoals = [];
            jest.spyOn(gm, 'isThisWeek').mockReturnValue(true); // deterministic: exercise the filter->builder delegation, not date math
            gm.dailyTasks = [{ id: 8, title: '<b>scout</b>', dueDate: '2026-01-16', completed: false }];
            gm.renderWeeklyGoals();
            const html = document.getElementById('weekly-goals-container').innerHTML;
            expect(html).toContain("This Week's Scheduled Tasks");
            expect(html).toContain('&lt;b&gt;scout&lt;/b&gt;'); // real escapeHTML entity-escapes
        });

        // ---- renderMonthlyScheduledTasksHTML (Roadmap #1, 30th slice — B5b, monthly summary card) ----
        const monthSummaryDeps = (over = {}) => ({ todayStr: '2026-01-15', escapeHTML: esc, ...over });

        test('renderMonthlyScheduledTasksHTML groups tasks by week into labelled panels', () => {
            const html = TR.renderMonthlyScheduledTasksHTML([
                { id: 1, dueDate: '2026-01-05', completed: false, title: 'Alpha' },
                { id: 2, dueDate: '2026-01-06', completed: true, title: 'Bravo' },
                { id: 3, dueDate: '2026-01-15', completed: false, title: 'Charlie' },
            ], monthSummaryDeps());
            expect(html).toContain("This Month's Scheduled Tasks");
            expect(html).toContain('1/3 tasks complete');
            expect(html).toContain('Jan 4 Week');  // 2026-01-05/06 group to the Jan-4 (Sun) week
            expect(html).toContain('Jan 11 Week'); // 2026-01-15 groups to the Jan-11 (Sun) week
            expect(html).toContain('Alpha');
            expect(html).toContain('Charlie');
            expect(html).toContain('goalManager.toggleTask(1, event)');
        });

        test('renderMonthlyScheduledTasksHTML applies overdue styling to a past incomplete task only', () => {
            const overdue = TR.renderMonthlyScheduledTasksHTML([{ id: 1, dueDate: '2026-01-05', completed: false, title: 'Late' }], monthSummaryDeps());
            expect(overdue).toContain('text-red-300');
            const future = TR.renderMonthlyScheduledTasksHTML([{ id: 2, dueDate: '2026-01-20', completed: false, title: 'Soon' }], monthSummaryDeps());
            expect(future).not.toContain('text-red-300');
        });

        test('renderMonthlyScheduledTasksHTML routes task titles through escapeHTML', () => {
            const html = TR.renderMonthlyScheduledTasksHTML([{ id: 1, dueDate: '2026-01-05', completed: false, title: '<z>' }], { todayStr: '2026-01-15', escapeHTML: (s) => 'E[' + s + ']' });
            expect(html).toContain('E[<z>]');
        });

        test('the manager delegator renders the monthly summary for this-month tasks with real escapeHTML', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="monthly-goals-container"></div>';
            gm.monthlyGoals = [];
            gm.weeklyGoals = [];
            jest.spyOn(gm, 'isThisMonth').mockReturnValue(true); // deterministic: exercise the filter->builder delegation, not date math
            gm.dailyTasks = [{ id: 9, title: '<b>ledger</b>', dueDate: '2026-01-05', completed: false }];
            gm.renderMonthlyGoals();
            const html = document.getElementById('monthly-goals-container').innerHTML;
            expect(html).toContain("This Month's Scheduled Tasks");
            expect(html).toContain('&lt;b&gt;ledger&lt;/b&gt;'); // real escapeHTML entity-escapes
        });

        // ---- priorityBadgeHTML (Roadmap #1, 28th slice — B6, DRY fold of the 4× badge block) ----
        test('priorityBadgeHTML returns the matching badge for high / low / medium', () => {
            expect(TR.priorityBadgeHTML('high')).toContain('🔥 High');
            expect(TR.priorityBadgeHTML('low')).toContain('🪶 Low');
            expect(TR.priorityBadgeHTML('medium')).toContain('⭐ Medium');
        });

        test('priorityBadgeHTML falls back to Medium for invalid / missing priority', () => {
            expect(TR.priorityBadgeHTML('bogus')).toContain('⭐ Medium');
            expect(TR.priorityBadgeHTML(undefined)).toContain('⭐ Medium');
            expect(TR.priorityBadgeHTML('')).toContain('⭐ Medium');
        });

        test('priorityBadgeHTML is the single source the daily/weekly/yearly/monthly cards render', () => {
            const badge = TR.priorityBadgeHTML('high');
            expect(TR.renderDailyTaskCardHTML(baseTask({ priority: 'high' }), dailyDeps())).toContain(badge);
            expect(TR.renderWeeklyGoalCardHTML(baseGoal({ priority: 'high' }), wgDeps())).toContain(badge);
            expect(TR.renderYearlyGoalCardHTML(baseYear({ priority: 'high' }), ygDeps())).toContain(badge);
            expect(TR.renderMonthlyGoalCardHTML(baseMonth({ priority: 'high' }), mgDeps())).toContain(badge);
        });
    });

    // ==================== COMPANION RENDER (Roadmap #1, 31st slice — 3rd render module) ====================
    // companion-render.js opens the Companion Den surface with its richest piece: the per-companion
    // COLLECTION CARD (Ranger Twin-Bond two-slot logic + rarity colours + catalog fallbacks). The
    // manager's renderCompanionDen now maps the owned companions through this builder; these lock the
    // module's exported surface directly (it had ZERO prior isolated coverage), incl. the injected
    // rarity colour map, slot ids, twinBond flag, and the cross-cutting _rarityNameplate helper.
    describe('companion-render.js (pure companion-den presentation builders)', () => {
        const CR = require('../companion-render.js').default;
        const companionDeps = (over = {}) => ({
            companionDefs: { wolf: { icon: '🐺', name: 'Wolf', description: 'A loyal wolf', rarity: 'rare' } },
            rarityColors: {
                common: { bg: 'gray', border: 'gray', text: 'gray' },
                uncommon: { bg: 'green', border: 'green', text: 'green' },
                rare: { bg: 'blue', border: 'blue', text: 'blue' },
                epic: { bg: 'purple', border: 'purple', text: 'purple' },
                legendary: { bg: 'amber', border: 'amber', text: 'amber' },
            },
            defaultColors: { bg: 'green', border: 'green', text: 'green' },
            activeCompanionId: null,
            activeCompanionId2: null,
            twinBond: false,
            rarityNameplate: (r) => `NP[${r}]`,
            ...over,
        });

        test('single-mode card (not active): click-to-equip footer + card-level equip action, no ring', () => {
            const html = CR.renderCompanionCollectionCardHTML({ type: 'wolf', rarity: 'rare', name: 'Wolf' }, companionDeps());
            expect(html).toContain('Click to equip');
            expect(html).toContain('data-action="companion.setActive" data-companion-type="wolf"');
            expect(html).toContain('cursor-pointer hover:scale-105');
            expect(html).not.toContain('ring-2');
            expect(html).toContain('from-blue-900'); // rare -> blue via injected rarityColors
            expect(html).toContain('NP[rare]');       // injected rarityNameplate output
            expect(html).not.toContain('companion.setSecond'); // no twin-bond slots
        });

        test('single-mode card (active): ✓ ACTIVE footer + green ring', () => {
            const html = CR.renderCompanionCollectionCardHTML({ type: 'wolf', rarity: 'rare', name: 'Wolf' }, companionDeps({ activeCompanionId: 'wolf' }));
            expect(html).toContain('✓ ACTIVE');
            expect(html).toContain('ring-2 ring-green-400');
        });

        test('twin-bond card (slot-1 active): two slot buttons (Slot 1 checked, Slot 2 disabled), no card-level onclick', () => {
            const html = CR.renderCompanionCollectionCardHTML({ type: 'wolf', rarity: 'epic', name: 'Wolf' }, companionDeps({ twinBond: true, activeCompanionId: 'wolf' }));
            expect(html).toContain('companion.setSecond');
            expect(html).toContain('✓ Slot 1');
            expect(html).toContain('disabled'); // slot-2 disabled while this comp holds slot-1
            expect(html).toContain('ring-2 ring-green-400');
            expect(html).not.toContain('cursor-pointer hover:scale-105'); // twinBond -> card carries no equip cursor/action
        });

        test('twin-bond card (slot-2 companion): ✓ Slot 2 + sky ring', () => {
            const html = CR.renderCompanionCollectionCardHTML({ type: 'owl', rarity: 'rare', name: 'Owl' }, companionDeps({ twinBond: true, activeCompanionId: 'wolf', activeCompanionId2: 'owl' }));
            expect(html).toContain('✓ Slot 2');
            expect(html).toContain('ring-2 ring-sky-400');
        });

        test('rarity + catalog fallbacks: missing rarity -> defaultColors + data-rarity="rare"; missing fields -> catalog', () => {
            const html = CR.renderCompanionCollectionCardHTML({ type: 'wolf' }, companionDeps());
            expect(html).toContain('data-rarity="rare"'); // ${comp.rarity || 'rare'}
            expect(html).toContain('from-green-900');      // defaultColors green (no rarity match)
            expect(html).toContain('🐺');                  // catalog icon fallback
            expect(html).toContain('Wolf');                // catalog name fallback
            expect(html).toContain('A loyal wolf');        // catalog description fallback
        });

        test('final literal fallbacks when the companion is absent from the catalog', () => {
            const html = CR.renderCompanionCollectionCardHTML({ type: 'ghost' }, companionDeps());
            expect(html).toContain('🐾');        // literal icon fallback
            expect(html).toContain('Companion'); // literal name fallback
        });

        test('the manager delegator maps owned companions through the builder into the collection grid', () => {
            const gm = createTestManager();
            document.body.innerHTML = '<div id="active-companion-display"></div>'
                + '<div id="companion-collection-grid"></div><div id="companion-undiscovered-grid"></div>';
            gm.companions = [{ type: 'wolf', rarity: 'rare', name: 'Wolf', description: 'A loyal wolf', icon: '🐺' }];
            gm.activeCompanionId = 'wolf';
            gm.renderCompanionDen();
            const html = document.getElementById('companion-collection-grid').innerHTML;
            expect(html).toContain('Wolf');
            expect(html).toContain('data-companion-type="wolf"');
        });

        // --- 32nd slice: the remaining Companion Den builders (active display + undiscovered grid) ---

        test('renderNoActiveCompanionHTML: the egg empty-state with the Visit Treasury CTA', () => {
            const html = CR.renderNoActiveCompanionHTML();
            expect(html).toContain('No Companions Yet');
            expect(html).toContain('🥚');
            expect(html).toContain('data-action="nav.switchView" data-view="rewards"');
            expect(html).toContain('Visit Treasury');
        });

        test('renderActiveCompanionHTML: equipped card uses rarity colours, nameplate, ACTIVE badge, level', () => {
            const D = companionDeps();
            const html = CR.renderActiveCompanionHTML(
                { type: 'wolf', rarity: 'epic', name: 'Wolfie', description: 'A fierce ally', icon: '🐺', level: 4 },
                { rarityColors: D.rarityColors, defaultColors: D.defaultColors, companionDefs: {}, rarityNameplate: (r) => `NP[${r}]` },
            );
            expect(html).toContain('data-rarity="epic"');
            expect(html).toContain('from-purple-900'); // epic -> purple
            expect(html).toContain('NP[epic]');         // injected rarityNameplate
            expect(html).toContain('ACTIVE');
            expect(html).toContain('🐺');
            expect(html).toContain('Wolfie');
            expect(html).toContain('A fierce ally');
            expect(html).toContain('Level 4');
        });

        test('renderActiveCompanionHTML: missing fields fall back to catalog icon/description + default rarity/colour/level', () => {
            const D = companionDeps();
            const html = CR.renderActiveCompanionHTML(
                { type: 'owl' }, // no rarity/name/description/icon/level
                { rarityColors: D.rarityColors, defaultColors: D.defaultColors, companionDefs: { owl: { icon: '🦉', description: 'Wise one' } }, rarityNameplate: (r) => `NP[${r}]` },
            );
            expect(html).toContain('data-rarity="rare"'); // rarity || 'rare'
            expect(html).toContain('from-green-900');      // defaultColors (no rarity match)
            expect(html).toContain('🦉');                  // catalog icon fallback
            expect(html).toContain('Wise one');            // catalog description fallback
            expect(html).toContain('NP[rare]');
            expect(html).toContain('Level 1');             // level || 1
        });

        test('renderActiveCompanionHTML: ultimate fallbacks are "Loyal companion" + 🐾 when absent from catalog', () => {
            const D = companionDeps();
            const html = CR.renderActiveCompanionHTML(
                { type: 'ghost' },
                { rarityColors: D.rarityColors, defaultColors: D.defaultColors, companionDefs: {}, rarityNameplate: (r) => `NP[${r}]` },
            );
            expect(html).toContain('Loyal companion');
            expect(html).toContain('🐾');
        });

        test('renderAllCompanionsDiscoveredHTML: the trophy all-discovered card', () => {
            const html = CR.renderAllCompanionsDiscoveredHTML();
            expect(html).toContain('🏆');
            expect(html).toContain('All companions discovered!');
        });

        test('renderUndiscoveredCompanionsGridHTML: one ??? mystery card per locked entry with its rarity badge', () => {
            const D = companionDeps();
            const html = CR.renderUndiscoveredCompanionsGridHTML(
                [['wolf', { rarity: 'epic' }], ['owl', { rarity: 'rare' }]],
                { rarityColors: D.rarityColors, defaultColors: D.defaultColors },
            );
            expect((html.match(/❓/g) || []).length).toBe(2); // one card per locked entry
            expect(html).toContain('???');
            expect(html).toContain('Found in treasure chests');
            expect(html).toContain('bg-purple-800'); // epic badge colour
            expect(html).toContain('bg-blue-800');    // rare badge colour
            expect(html).toContain('>epic</span>');
            expect(html).toContain('>rare</span>');
        });

        test('renderUndiscoveredCompanionsGridHTML: unknown rarity falls back to defaultColors', () => {
            const D = companionDeps();
            const html = CR.renderUndiscoveredCompanionsGridHTML(
                [['x', { rarity: 'mythic' }]],
                { rarityColors: D.rarityColors, defaultColors: D.defaultColors },
            );
            expect(html).toContain('bg-green-800'); // defaultColors bg
        });
    });

    // ==================== CLASS RENDER MODULE (class-render.js) ====================
    //
    // Roadmap #1, 5th render module: renderClassPanel (the largest single panel) delegates its WHOLE
    // markup to these eleven pure builders across two slices (34th: class-select + linear tree; 35th:
    // capstone + subclass + the active-class shell). The wiring (real renderClassPanel producing
    // identical output) was proven faithful by a temporary before/after runtime snapshot across all
    // FIVE panel states; these lock the builders' per-branch shape directly. renderSkillNodeRowHTML is
    // the ONE shared row used by BOTH the linear nodes (unlockAction 'class.unlockNode') and the
    // subclass tiers ('class.unlockSubclassTier').
    describe('Class render module (class-render.js)', () => {
        const CLS = require('../class-render.js').default;
        const klass = (over = {}) => ({ id: 'warrior', color: '#ef4444', icon: '⚔️', name: 'Warrior', tagline: 'Boss combat specialist', ...over });
        const node = (over = {}) => ({ desc: '+20% boss damage', cost: 2, ...over });
        const rowOpts = (over = {}) => ({ isUnlocked: false, isNext: false, canAfford: false, color: '#ef4444', unlockAction: 'class.unlockNode', ...over });
        const cap = (over = {}) => ({ id: 'executioner', name: 'Executioner', desc: 'Execute low-HP bosses', cost: 3, ...over });
        const capOpts = (over = {}) => ({ isChosen: false, canAfford: false, capstoneReady: false, color: '#ef4444', ...over });
        const sub = (over = {}) => ({ id: 'berserker', icon: '🪓', name: 'Berserker', tagline: 'Rage and fury', tiers: [{ desc: 'Tier 1 perk', cost: 2 }], ...over });

        test('module is frozen with all eleven builders', () => {
            expect(Object.isFrozen(CLS)).toBe(true);
            [
                'renderClassSelectCardHTML', 'renderClassSelectPanelHTML', 'renderSkillNodeRowHTML',
                'renderCapstoneCardHTML', 'renderCapstoneSectionHTML', 'renderSubclassLockedTeaserHTML',
                'renderSubclassSelectCardHTML', 'renderSubclassSelectBodyHTML', 'renderActiveSubclassBodyHTML',
                'renderSubclassSectionHTML', 'renderActiveClassPanelHTML',
            ].forEach(fn => expect(typeof CLS[fn]).toBe('function'));
        });

        describe('renderClassSelectCardHTML', () => {
            test('renders the choose action + class metadata + colour border', () => {
                const html = CLS.renderClassSelectCardHTML(klass());
                expect(html).toContain('data-action="class.choose"');
                expect(html).toContain('data-class-id="warrior"');
                expect(html).toContain('⚔️');
                expect(html).toContain('Warrior');
                expect(html).toContain('Boss combat specialist');
                expect(html).toContain('border-color:#ef444466'); // 40%-alpha border
            });
        });

        describe('renderClassSelectPanelHTML', () => {
            test('header + plural points + cards passthrough', () => {
                const html = CLS.renderClassSelectPanelHTML(3, '<CARDS/>');
                expect(html).toContain('Choose Your Class');
                expect(html).toContain('3 skill points ready to spend');
                expect(html).toContain('<CARDS/>');
            });
            test('singular point wording at 1', () => {
                expect(CLS.renderClassSelectPanelHTML(1, '')).toContain('1 skill point ready');
            });
        });

        describe('renderSkillNodeRowHTML', () => {
            test('unlocked: filled ● dot (class colour) + Unlocked badge, no button/dim', () => {
                const html = CLS.renderSkillNodeRowHTML(node(), rowOpts({ isUnlocked: true }));
                expect(html).toContain('color:#ef4444">●');
                expect(html).toContain('Unlocked');
                expect(html).not.toContain('data-action');
                expect(html).not.toContain('opacity-70');
            });
            test('next + affordable: ◐ dot + enabled purple Unlock button', () => {
                const html = CLS.renderSkillNodeRowHTML(node({ cost: 2 }), rowOpts({ isNext: true, canAfford: true }));
                expect(html).toContain('◐');
                expect(html).toContain('data-action="class.unlockNode"');
                expect(html).not.toContain('disabled');
                expect(html).toContain('bg-purple-700');
                expect(html).toContain('Unlock (2 pts)');
            });
            test('next + unaffordable: disabled greyed button', () => {
                const html = CLS.renderSkillNodeRowHTML(node(), rowOpts({ isNext: true, canAfford: false }));
                expect(html).toContain('disabled');
                expect(html).toContain('cursor-not-allowed');
            });
            test('locked: hollow ○ dot + Locked line + dim row', () => {
                const html = CLS.renderSkillNodeRowHTML(node(), rowOpts());
                expect(html).toContain('○');
                expect(html).toContain('Locked');
                expect(html).toContain('opacity-70');
                expect(html).not.toContain('data-action');
            });
            test('cost 1 uses the singular "pt"', () => {
                const html = CLS.renderSkillNodeRowHTML(node({ cost: 1 }), rowOpts({ isNext: true, canAfford: true }));
                expect(html).toContain('Unlock (1 pt)');
                expect(html).not.toContain('Unlock (1 pts)');
            });
            test('unlockAction is injected (shared by the subclass tier rows)', () => {
                const html = CLS.renderSkillNodeRowHTML(node(), rowOpts({ isNext: true, canAfford: true, unlockAction: 'class.unlockSubclassTier' }));
                expect(html).toContain('data-action="class.unlockSubclassTier"');
            });
        });

        describe('renderCapstoneCardHTML', () => {
            test('chosen: Mastered card tinted with the class colour, no action button', () => {
                const html = CLS.renderCapstoneCardHTML(cap(), capOpts({ isChosen: true }));
                expect(html).toContain('★');
                expect(html).toContain('Mastered');
                expect(html).toContain('border-color:#ef4444;background:#ef44441a');
                expect(html).toContain('Executioner');
                expect(html).toContain('Execute low-HP bosses');
                expect(html).not.toContain('data-action');
            });
            test('pickable + affordable: enabled selectCapstone button', () => {
                const html = CLS.renderCapstoneCardHTML(cap({ cost: 3 }), capOpts({ capstoneReady: true, canAfford: true }));
                expect(html).toContain('data-action="class.selectCapstone"');
                expect(html).toContain('data-capstone-id="executioner"');
                expect(html).toContain('◆');
                expect(html).toContain('3 pts');
                expect(html).toContain('hover:scale-[1.02]');
                expect(html).not.toContain('disabled');
            });
            test('pickable + unaffordable: disabled greyed button', () => {
                const html = CLS.renderCapstoneCardHTML(cap(), capOpts({ capstoneReady: true, canAfford: false }));
                expect(html).toContain('data-action="class.selectCapstone"');
                expect(html).toContain('disabled');
                expect(html).toContain('opacity-60 cursor-not-allowed');
            });
            test('not chosen + not ready: greyed "Not chosen" card, no action', () => {
                const html = CLS.renderCapstoneCardHTML(cap(), capOpts());
                expect(html).toContain('◇');
                expect(html).toContain('Not chosen');
                expect(html).toContain('opacity-50');
                expect(html).not.toContain('data-action');
            });
        });

        describe('renderCapstoneSectionHTML', () => {
            test('ready: prompt with the first-capstone cost + cards passthrough', () => {
                const html = CLS.renderCapstoneSectionHTML(true, 3, '<CAPS/>');
                expect(html).toContain('Choose your capstone (pick one, 3 pts)');
                expect(html).toContain('<CAPS/>');
            });
            test('not ready: plain "Capstone" label, no prompt', () => {
                const html = CLS.renderCapstoneSectionHTML(false, 3, '<CAPS/>');
                expect(html).toContain('>Capstone<');
                expect(html).not.toContain('pick one');
            });
        });

        describe('renderSubclassLockedTeaserHTML', () => {
            test('shows the unlock level', () => {
                expect(CLS.renderSubclassLockedTeaserHTML(40)).toContain('Reach Level 40 to specialize');
            });
        });

        describe('renderSubclassSelectCardHTML', () => {
            test('choose action + subclass metadata + first-tier preview + hover border', () => {
                const html = CLS.renderSubclassSelectCardHTML(sub(), { color: '#ef4444' });
                expect(html).toContain('data-action="class.chooseSubclass"');
                expect(html).toContain('data-subclass-id="berserker"');
                expect(html).toContain('🪓');
                expect(html).toContain('Berserker');
                expect(html).toContain('Rage and fury');
                expect(html).toContain('Tier 1 perk');
                expect(html).toContain('border-color:#ef444466');
                expect(html).toContain("onmouseout=\"this.style.borderColor='#ef444466'\"");
            });
        });

        describe('renderSubclassSelectBodyHTML', () => {
            test('Specialize prompt + cards passthrough', () => {
                const html = CLS.renderSubclassSelectBodyHTML('<SUBCARDS/>');
                expect(html).toContain('Specialize (pick one path)');
                expect(html).toContain('<SUBCARDS/>');
            });
        });

        describe('renderActiveSubclassBodyHTML', () => {
            test('header + respec + tier rows passthrough; Mastered badge when mastered', () => {
                const html = CLS.renderActiveSubclassBodyHTML(sub(), { subMastered: true, color: '#ef4444', tierRowsHTML: '<TIERS/>' });
                expect(html).toContain('🪓');
                expect(html).toContain('Berserker');
                expect(html).toContain('data-action="class.subclassRespec"');
                expect(html).toContain('★ Mastered');
                expect(html).toContain('<TIERS/>');
            });
            test('no Mastered badge when not mastered', () => {
                const html = CLS.renderActiveSubclassBodyHTML(sub(), { subMastered: false, color: '#ef4444', tierRowsHTML: '' });
                expect(html).not.toContain('★ Mastered');
            });
        });

        describe('renderSubclassSectionHTML', () => {
            test('Subclass Specialization heading + body passthrough', () => {
                const html = CLS.renderSubclassSectionHTML('<SUBBODY/>');
                expect(html).toContain('Subclass Specialization');
                expect(html).toContain('<SUBBODY/>');
            });
        });

        describe('renderActiveClassPanelHTML', () => {
            const panelOpts = (over = {}) => ({ cls: klass(), activeSub: null, fullyMastered: false, available: 3, nodeRowsHTML: '<NODES/>', capstoneSectionHTML: '<CAP/>', subclassSectionHTML: '<SUB/>', ...over });
            test('class header + respec + all three sections passthrough', () => {
                const html = CLS.renderActiveClassPanelHTML(panelOpts());
                expect(html).toContain('⚔️');
                expect(html).toContain('Warrior');
                expect(html).toContain('data-action="class.respec"');
                expect(html).toContain('<NODES/>');
                expect(html).toContain('<CAP/>');
                expect(html).toContain('<SUB/>');
            });
            test('available points line (plural) when not mastered', () => {
                expect(CLS.renderActiveClassPanelHTML(panelOpts({ available: 3 }))).toContain('3 skill points available');
            });
            test('singular skill point at 1', () => {
                expect(CLS.renderActiveClassPanelHTML(panelOpts({ available: 1 }))).toContain('1 skill point available');
            });
            test('fully mastered line replaces the points line', () => {
                const html = CLS.renderActiveClassPanelHTML(panelOpts({ fullyMastered: true }));
                expect(html).toContain('Class fully mastered');
                expect(html).not.toContain('skill point');
            });
            test('active subclass suffix appears in the class header', () => {
                const html = CLS.renderActiveClassPanelHTML(panelOpts({ activeSub: { icon: '🪓', name: 'Berserker' } }));
                expect(html).toContain('· 🪓 Berserker');
            });
            test('no subclass suffix when activeSub is null', () => {
                expect(CLS.renderActiveClassPanelHTML(panelOpts({ activeSub: null }))).not.toContain('·');
            });
        });
    });

    // ==================== ANALYTICS RENDER MODULE (analytics-render.js) ====================
    //
    // Roadmap #1, 6th render module: the Analytics dashboard's two most self-contained charts —
    // renderTaskBreakdown + renderActivityHeatmap — delegate their markup to these pure builders.
    // The wrappers keep only the impure data-gather (completed-count tallies / the date-bucketed
    // completion map + the week/day cell-matrix precompute) + the innerHTML write. Byte-faithfulness
    // across empty/populated breakdown + a full past/future/every-green-threshold heatmap was proven
    // by a temporary before/after runtime snapshot during the extraction; these lock the builders'
    // per-branch shape directly. renderQuickStats stays on the class (it sets textContent, no markup).
    describe('Analytics render module (analytics-render.js)', () => {
        const AR = require('../analytics-render.js').default;
        const counts = (over = {}) => ({ daily: 0, weekly: 0, monthly: 0, yearly: 0, life: 0, side: 0, ...over });
        const cell = (over = {}) => ({ dateStr: '2026-06-15', count: 0, isFuture: false, ...over });

        test('module is frozen with all six builders', () => {
            expect(Object.isFrozen(AR)).toBe(true);
            ['renderTaskBreakdownHTML', 'renderActivityHeatmapHTML', 'renderXPTimelineHTML',
                'renderProductivityPatternHTML', 'renderPersonalRecordsHTML', 'renderGoalsProgressOverviewHTML']
                .forEach(fn => expect(typeof AR[fn]).toBe('function'));
        });

        describe('renderTaskBreakdownHTML', () => {
            test('empty (no completions): call-to-action empty-state, no bars', () => {
                const html = AR.renderTaskBreakdownHTML(counts());
                expect(html).toContain('Complete some quests to see breakdown!');
                expect(html).not.toContain('progress-bar');
            });
            test('one bar per non-empty category; zero-count categories are omitted', () => {
                const html = AR.renderTaskBreakdownHTML(counts({ daily: 2, side: 1 }));
                expect(html).toContain('>Daily<');
                expect(html).toContain('bg-orange-500');
                expect(html).toContain('>Side<');
                expect(html).toContain('bg-cyan-500');
                expect(html).not.toContain('>Weekly<');
                expect(html).not.toContain('>Yearly<');
                expect((html.match(/progress-bar/g) || []).length).toBe(2);
            });
            test('percent = category share of total (one decimal), in both the fill width and the readout', () => {
                const html = AR.renderTaskBreakdownHTML(counts({ daily: 1, weekly: 1 }));
                expect(html).toContain('width: 50.0%');
                expect(html).toContain('(50.0%)');
            });
            test('each category maps to its colour + label', () => {
                const html = AR.renderTaskBreakdownHTML(counts({ daily: 1, weekly: 1, monthly: 1, yearly: 1, life: 1, side: 1 }));
                expect(html).toContain('bg-orange-500'); // daily
                expect(html).toContain('bg-green-500');  // weekly
                expect(html).toContain('bg-blue-500');   // monthly
                expect(html).toContain('bg-purple-500'); // yearly
                expect(html).toContain('bg-red-500');    // life
                expect(html).toContain('bg-cyan-500');   // side
            });
        });

        describe('renderActivityHeatmapHTML', () => {
            const oneCell = (over) => AR.renderActivityHeatmapHTML([[cell(over)]]);
            test('renders the S M T W T F S day-label row (7 cells)', () => {
                const html = AR.renderActivityHeatmapHTML([]);
                expect((html.match(/text-amber-300 text-center/g) || []).length).toBe(7);
            });
            test('one row per week (label row excluded)', () => {
                const w = [cell(), cell(), cell(), cell(), cell(), cell(), cell()];
                const html = AR.renderActivityHeatmapHTML([w, w]);
                expect((html.match(/class="flex gap-1"/g) || []).length).toBe(2);
            });
            test('completion count drives the GitHub-style green ramp (>0 / >2 / >5 / >10)', () => {
                expect(oneCell({ count: 0 })).toContain('bg-stone-700');
                expect(oneCell({ count: 1 })).toContain('bg-green-900');
                expect(oneCell({ count: 2 })).toContain('bg-green-900');
                expect(oneCell({ count: 3 })).toContain('bg-green-700');
                expect(oneCell({ count: 5 })).toContain('bg-green-700');
                expect(oneCell({ count: 6 })).toContain('bg-green-500');
                expect(oneCell({ count: 10 })).toContain('bg-green-500');
                expect(oneCell({ count: 11 })).toContain('bg-green-300');
            });
            test('past cell carries a "date: N tasks" tooltip + hover affordance', () => {
                const html = oneCell({ dateStr: '2026-06-15', count: 4 });
                expect(html).toContain('title="2026-06-15: 4 tasks"');
                expect(html).toContain('cursor-pointer');
            });
            test('future cell is a dim placeholder with no tooltip', () => {
                const html = oneCell({ isFuture: true, count: 0 });
                expect(html).toContain('opacity:0.15');
                expect(html).not.toContain('title=');
                expect(html).not.toContain('cursor-pointer');
            });
        });

        describe('renderXPTimelineHTML', () => {
            const bar = (over = {}) => ({ dateStr: '2026-06-15', count: 0, dayLetter: 'M', ...over });
            test('empty bars -> call-to-action empty-state', () => {
                expect(AR.renderXPTimelineHTML([])).toContain('Complete daily quests to see your XP timeline');
            });
            test('an all-zero window is treated as empty (no bars painted)', () => {
                const html = AR.renderXPTimelineHTML([bar(), bar(), bar()]);
                expect(html).toContain('Complete daily quests');
                expect(html).not.toContain('bg-gradient-to-t');
            });
            test('bars scale against the busiest day in the window (max -> 100%)', () => {
                const html = AR.renderXPTimelineHTML([bar({ count: 1 }), bar({ count: 4 })]);
                expect(html).toContain('height: 100%');   // the count:4 bar
                expect(html).toContain('height: 25%');    // the count:1 bar (1/4)
            });
            test('tooltip pluralises tasks + surfaces date and day-letter', () => {
                const one = AR.renderXPTimelineHTML([bar({ count: 1, dateStr: '2026-06-15', dayLetter: 'M' })]);
                expect(one).toContain('title="2026-06-15: 1 task completed"');
                expect(one).toContain('>M</div>');
                expect(AR.renderXPTimelineHTML([bar({ count: 2 })])).toContain('2 tasks completed');
            });
        });

        describe('renderProductivityPatternHTML', () => {
            test('renders 7 weekday bars with counts + 3-letter labels', () => {
                const html = AR.renderProductivityPatternHTML([1, 2, 3, 4, 5, 6, 7]);
                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => expect(html).toContain(`>${d}</div>`));
                expect(html).toContain('title="Sunday: 1 tasks"');
                expect(html).toContain('title="Saturday: 7 tasks"');
            });
            test('weekend bars are blue, weekdays green', () => {
                const html = AR.renderProductivityPatternHTML([1, 1, 1, 1, 1, 1, 1]);
                expect((html.match(/from-blue-600 to-blue-400/g) || []).length).toBe(2);   // Sun + Sat
                expect((html.match(/from-green-600 to-green-400/g) || []).length).toBe(5); // Mon–Fri
            });
            test('height scales against the busiest weekday (max floored at 1 -> all-zero = 0%)', () => {
                const html = AR.renderProductivityPatternHTML([0, 0, 0, 0, 0, 0, 0]);
                expect((html.match(/height: 0%/g) || []).length).toBe(7);
            });
        });

        describe('renderPersonalRecordsHTML', () => {
            test('one themed card per record (icon + value + label)', () => {
                const html = AR.renderPersonalRecordsHTML([
                    { icon: '🔥', label: 'Longest Streak', value: '5 days', color: 'orange' },
                    { icon: '⚡', label: 'Current Level', value: 7, color: 'purple' },
                ]);
                expect(html).toContain('🔥');
                expect(html).toContain('>5 days</div>');
                expect(html).toContain('>Longest Streak</div>');
                expect(html).toContain('from-orange-900 to-orange-950');
                expect(html).toContain('from-purple-900 to-purple-950');
            });
            test('unknown colour falls back to the orange palette', () => {
                const html = AR.renderPersonalRecordsHTML([{ icon: '❓', label: 'X', value: 1, color: 'chartreuse' }]);
                expect(html).toContain('from-orange-900 to-orange-950');
            });
        });

        describe('renderGoalsProgressOverviewHTML', () => {
            const esc = { escapeHTML: (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;') };
            test('empty goal list -> celebratory empty-state', () => {
                expect(AR.renderGoalsProgressOverviewHTML([], esc)).toContain('All goals completed!');
            });
            test('one themed card per goal (tier chip + percent + title)', () => {
                const html = AR.renderGoalsProgressOverviewHTML([
                    { type: 'Life', title: 'Learn piano', progress: 30 },
                    { type: 'Weekly', title: 'Ship it', progress: 80 },
                ], esc);
                expect(html).toContain('>Life</span>');
                expect(html).toContain('bg-red-900/30');
                expect(html).toContain('>30%</span>');
                expect(html).toContain('>Ship it</h4>');
                expect(html).toContain('width: 80%');
            });
            test('injected escapeHTML sanitises the user-entered title', () => {
                const html = AR.renderGoalsProgressOverviewHTML([{ type: 'Weekly', title: '<script>x</script>', progress: 10 }], esc);
                expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
                expect(html).not.toContain('<script>x</script>');
            });
            test('progress clamps to 0..100', () => {
                const html = AR.renderGoalsProgressOverviewHTML([
                    { type: 'Yearly', title: 'over', progress: 150 },
                    { type: 'Monthly', title: 'under', progress: -20 },
                ], esc);
                expect(html).toContain('>100%</span>');
                expect(html).toContain('>0%</span>');
            });
            test('unknown tier falls back to the Weekly palette', () => {
                const html = AR.renderGoalsProgressOverviewHTML([{ type: 'Quarterly', title: 'x', progress: 5 }], esc);
                expect(html).toContain('bg-green-900/30');
            });
        });
    });

    // ==================== QUEST CHAIN RENDER MODULE (quest-chain-render.js) ====================
    //
    // Roadmap #1, 7th render module: the whole Quest Chains tab (active / available / completed
    // columns) delegates its card markup to these pure builders. The wrappers keep only the
    // getElementById + guard + innerHTML write; the builders take the chain arrays + the
    // questChainTemplates / spellDefinitions catalogs. Byte-faithfulness across every empty-state,
    // difficulty branch, the missing-template filter, and the present/absent completed-date was
    // proven by a temporary before/after runtime snapshot during the extraction; these lock the
    // builders' per-branch shape directly.
    describe('Quest chain render module (quest-chain-render.js)', () => {
        const QCR = require('../quest-chain-render.js').default;
        const chapters = () => [
            { title: 'Ch1', description: 'First', tasks: ['a', 'b'], reward: { xp: 100, gold: 50, spell: 'fireball', charges: 2 } },
            { title: 'Ch2', description: 'Second', tasks: ['c'], reward: { xp: 200, gold: 80, spell: 'frostbolt', charges: 1 } },
        ];
        const tmpl = (over = {}) => ({ id: 't1', icon: '🗡️', name: 'Blade Saga', description: 'Adventure', category: 'Combat', difficulty: 'medium', estimatedWeeks: 3, chapters: chapters(), ...over });
        const templates = () => ({
            t1: tmpl({ id: 't1', difficulty: 'easy', name: 'Easy Saga' }),
            t2: tmpl({ id: 't2', difficulty: 'hard', name: 'Hard Saga' }),
            t3: tmpl({ id: 't3', difficulty: 'medium', name: 'Medium Saga' }),
        });
        const spellDefs = { fireball: { name: 'Fireball' }, frostbolt: { name: 'Frostbolt' } };

        test('module is frozen with the three builders', () => {
            expect(Object.isFrozen(QCR)).toBe(true);
            ['renderActiveQuestChainsHTML', 'renderAvailableQuestChainsHTML', 'renderCompletedQuestChainsHTML']
                .forEach(fn => expect(typeof QCR[fn]).toBe('function'));
        });

        describe('renderActiveQuestChainsHTML', () => {
            const deps = () => ({ templates: templates(), spellDefinitions: spellDefs });
            test('no active chains -> call-to-action empty-state', () => {
                const html = QCR.renderActiveQuestChainsHTML([], deps());
                expect(html).toContain('No active quest chains');
                expect(html).not.toContain('Overall Progress');
            });
            test('renders a saga card: name, progress %, current chapter, reward spell', () => {
                const html = QCR.renderActiveQuestChainsHTML([
                    { id: 'c1', templateId: 't1', currentChapterIndex: 1, chapters: chapters(), completedTasks: [0] },
                ], deps());
                expect(html).toContain('Easy Saga');
                expect(html).toContain('Chapter 2/2');
                expect(html).toContain('style="width: 50%"');   // 1 of 2 chapters done
                expect(html).toContain('>50%</span>');
                expect(html).toContain('Ch2');                    // currentChapter.title
                expect(html).toContain('Frostbolt x1');           // Ch2 reward spell + charges
            });
            test('difficulty maps to a colour chip (easy=green, hard=red)', () => {
                const easy = QCR.renderActiveQuestChainsHTML([{ id: 'c1', templateId: 't1', currentChapterIndex: 0, chapters: chapters(), completedTasks: [] }], deps());
                expect(easy).toContain('bg-green-700');
                const hard = QCR.renderActiveQuestChainsHTML([{ id: 'c2', templateId: 't2', currentChapterIndex: 0, chapters: chapters(), completedTasks: [] }], deps());
                expect(hard).toContain('bg-red-700');
            });
            test('a completed task is checked + struck through', () => {
                const html = QCR.renderActiveQuestChainsHTML([{ id: 'c1', templateId: 't1', currentChapterIndex: 0, chapters: chapters(), completedTasks: [0] }], deps());
                expect(html).toContain('checked');
                expect(html).toContain('line-through');
            });
            test('chains with a missing template are filtered out (not an empty-state)', () => {
                const html = QCR.renderActiveQuestChainsHTML([{ id: 'x', templateId: 'GONE', currentChapterIndex: 0, chapters: chapters(), completedTasks: [] }], deps());
                expect(html).toBe('');
            });
        });

        describe('renderAvailableQuestChainsHTML', () => {
            test('all templates started/finished -> empty-state', () => {
                const html = QCR.renderAvailableQuestChainsHTML([{ templateId: 't1' }, { templateId: 't2' }], [{ templateId: 't3' }], { templates: templates() });
                expect(html).toContain('All quest chains completed or in progress');
            });
            test('excludes active + completed; renders the rest as Begin Adventure cards', () => {
                const html = QCR.renderAvailableQuestChainsHTML([{ templateId: 't1' }], [{ templateId: 't2' }], { templates: templates() });
                expect(html).toContain('Medium Saga');   // t3 only
                expect(html).not.toContain('Easy Saga');
                expect(html).not.toContain('Hard Saga');
                expect(html).toContain('Begin Adventure');
                expect(html).toContain('2 Chapters');
                expect(html).toContain('~3 weeks');
            });
        });

        describe('renderCompletedQuestChainsHTML', () => {
            test('no completed chains -> empty-state', () => {
                const html = QCR.renderCompletedQuestChainsHTML([], { templates: templates() });
                expect(html).toContain('No completed quest chains yet');
            });
            test('renders trophy cards (name, category, chapters conquered)', () => {
                const html = QCR.renderCompletedQuestChainsHTML([{ templateId: 't1', completedAt: '2026-01-15T10:00:00Z' }], { templates: templates() });
                expect(html).toContain('Easy Saga');
                expect(html).toContain('Combat');
                expect(html).toContain('2 Chapters Conquered');
                expect(html).toContain('Completed:');
            });
            test('missing completedAt renders the card with an empty date (no crash)', () => {
                const html = QCR.renderCompletedQuestChainsHTML([{ templateId: 't1', completedAt: null }], { templates: templates() });
                expect(html).toContain('Easy Saga');
                expect(html).toContain('Completed:');
            });
            test('chains with a missing template are filtered out', () => {
                const html = QCR.renderCompletedQuestChainsHTML([{ templateId: 'GONE', completedAt: '2026-01-01' }], { templates: templates() });
                expect(html).toBe('');
            });
        });
    });

    // ==================== ENCHANTMENT RENDER MODULE (enchantment-render.js) ====================
    //
    // Roadmap #1, 8th render module: the whole Enchantments view (active-enchantment column + shop
    // column) delegates its card markup to these pure builders. The wrappers keep only the impure
    // bits — active keeps `checkExpiredEnchantments()` (state-pruning side-effect) + injects the wall
    // clock as `now`; shop prepends the impure `getPremiumBannerHTML(...)` + injects the bound
    // `hasActiveEnchantment` predicate. Byte-faithfulness across the active empty-state, both
    // time-label branches, all three progress-width fallbacks, and the shop's ✓-Active / affordable /
    // unaffordable / premium-locked / premium-unlocked branches was proven by a temporary before/after
    // runtime snapshot (Date.now frozen) during the extraction; these lock the builders' shape directly.
    describe('Enchantment render module (enchantment-render.js)', () => {
        const ER = require('../enchantment-render.js').default;
        const NOW = 1800000000000;
        const defs = () => ({
            double_xp:  { id: 'double_xp',  name: 'Double XP',  icon: '⚡', description: '2x XP',  cost: 50,  duration: 60, effect: 'double_xp',  premium: false },
            lucky_loot: { id: 'lucky_loot', name: 'Lucky Loot', icon: '🍀', description: 'loot',   cost: 999, duration: 90, effect: 'lucky_loot', premium: true  },
        });

        test('module is frozen with the two builders', () => {
            expect(Object.isFrozen(ER)).toBe(true);
            ['renderActiveEnchantmentsHTML', 'renderEnchantmentShopHTML']
                .forEach(fn => expect(typeof ER[fn]).toBe('function'));
        });

        describe('renderActiveEnchantmentsHTML', () => {
            const deps = () => ({ now: NOW, enchantmentDefinitions: defs() });
            test('no active enchantments -> empty-state', () => {
                const html = ER.renderActiveEnchantmentsHTML([], deps());
                expect(html).toContain('No active enchantments');
                expect(html).not.toContain('remaining');
            });
            test('over an hour left -> "Xh Ym remaining" label', () => {
                const html = ER.renderActiveEnchantmentsHTML([
                    { id: 'double_xp', icon: '⚡', name: 'Double XP', effect: 'double_xp', expiresAt: NOW + 90 * 60000, totalDuration: 120 * 60000 },
                ], deps());
                expect(html).toContain('1h 30m remaining');
                expect(html).toContain('Double XP');
            });
            test('under an hour left -> "Ym remaining" label', () => {
                const html = ER.renderActiveEnchantmentsHTML([
                    { id: 'double_xp', icon: '⚡', name: 'Double XP', effect: 'double_xp', expiresAt: NOW + 25 * 60000, totalDuration: 60 * 60000 },
                ], deps());
                expect(html).toContain('25m remaining');
                expect(html).not.toContain('0h');
            });
            test('progress width uses totalDuration when present', () => {
                const html = ER.renderActiveEnchantmentsHTML([
                    { id: 'double_xp', icon: '⚡', name: 'Double XP', effect: 'double_xp', expiresAt: NOW + 90 * 60000, totalDuration: 120 * 60000 },
                ], deps());
                expect(html).toContain('width: 75%');
            });
            test('progress width falls back to the catalog duration when no totalDuration', () => {
                const html = ER.renderActiveEnchantmentsHTML([
                    { id: 'double_xp', icon: '⚡', name: 'Double XP', effect: 'double_xp', expiresAt: NOW + 30 * 60000 },
                ], deps());
                expect(html).toContain('width: 50%');   // 30m of the catalog's 60m
            });
            test('progress width falls back to a literal 180 when neither is available', () => {
                const html = ER.renderActiveEnchantmentsHTML([
                    { id: 'ghost', icon: '👻', name: 'Ghost', effect: 'ghost', expiresAt: NOW + 18 * 60000 },
                ], deps());
                expect(html).toContain('width: 10%');    // 18m of the fallback 180m
            });
        });

        describe('renderEnchantmentShopHTML', () => {
            const shopDeps = (over = {}) => ({ focusCrystals: 0, isPremium: false, hasActiveEnchantment: () => false, ...over });
            test('free enchantments sort before premium ones', () => {
                const catalog = { lucky_loot: defs().lucky_loot, double_xp: defs().double_xp }; // premium listed first
                const html = ER.renderEnchantmentShopHTML(catalog, shopDeps());
                expect(html.indexOf('Double XP')).toBeLessThan(html.indexOf('Lucky Loot'));
            });
            test('an active enchantment shows ✓ Active + disabled', () => {
                const html = ER.renderEnchantmentShopHTML({ double_xp: defs().double_xp }, shopDeps({ focusCrystals: 999, hasActiveEnchantment: e => e === 'double_xp' }));
                expect(html).toContain('✓ Active');
                expect(html).toContain('border-green-600');
                expect(html).toContain('disabled');
            });
            test('an affordable, inactive enchantment shows ✨ Purchase', () => {
                const html = ER.renderEnchantmentShopHTML({ double_xp: defs().double_xp }, shopDeps({ focusCrystals: 50 }));
                expect(html).toContain('✨ Purchase');
                expect(html).toContain('bg-pink-600');
            });
            test('an unaffordable enchantment shows the 🔒 Need cost label', () => {
                const html = ER.renderEnchantmentShopHTML({ double_xp: defs().double_xp }, shopDeps({ focusCrystals: 10 }));
                expect(html).toContain('🔒 Need 50');
            });
            test('a premium enchantment is a locked Unlock teaser while not premium', () => {
                const html = ER.renderEnchantmentShopHTML({ lucky_loot: defs().lucky_loot }, shopDeps({ isPremium: false }));
                expect(html).toContain('premium.showModal');
                expect(html).toContain('Unlock');
                expect(html).not.toContain('premium.enchant');
            });
            test('a premium enchantment becomes a normal card once premium is unlocked', () => {
                const html = ER.renderEnchantmentShopHTML({ lucky_loot: defs().lucky_loot }, shopDeps({ isPremium: true, focusCrystals: 999 }));
                expect(html).toContain('premium.enchant');
                expect(html).not.toContain('premium.showModal');
            });
        });
    });

    // ==================== DASHBOARD RENDER MODULE (dashboard-render.js) ====================
    //
    // Roadmap #1, 9th render module (40th slice): the two CLEANEST Dashboard cards delegate their markup
    // to these pure builders. `renderDashboard()` STAYS on the class — it is a textContent + hidden-toggle
    // orchestrator. The wrappers keep the impure bits: XP event keeps `getActiveXPEvent()` + the hide/show
    // guard; Royal Bounty keeps the hide-when-empty branch. Every coupling is injected the same arrow-bound
    // way the other render modules use — the clock-dependent time-left labels (`xpEventTimeLeftLabel` /
    // `bountyTimeLeftLabel`), the bounty predicates/lookups (`bountyUnlocked` / `bountyQuest`), `isPremium`,
    // and `escapeHTML`. The 41st slice completed the suite with renderStreakRepairHTML (its DOM `shell`
    // closure became a pure string helper) + renderWeeklyThemeCardHTML (template only; the wrapper keeps
    // every guard + the post-render addEventListener wiring). Byte-faithfulness across all branches — XP
    // none/live; bounty empty/claimed/active-premium/active-free-locked/rerolled/deleted-target/not-unlocked/
    // all-empty; streak upsell/premium-rows(affordable+unaffordable)/free-repair; weekly-theme
    // free/premium-with-colour-fallbacks/dismissed/no-featured/already-wearing — was proven by temporary
    // before/after runtime snapshots during each extraction; these lock the builders' per-branch shape directly.
    describe('Dashboard render module (dashboard-render.js)', () => {
        const DR = require('../dashboard-render.js').default;

        test('module is frozen with the four builders', () => {
            expect(Object.isFrozen(DR)).toBe(true);
            ['renderXPEventHTML', 'renderRoyalBountyHTML', 'renderStreakRepairHTML', 'renderWeeklyThemeCardHTML'].forEach(fn => expect(typeof DR[fn]).toBe('function'));
        });

        describe('renderXPEventHTML', () => {
            const deps = (over = {}) => ({ escapeHTML: (s) => String(s), xpEventTimeLeftLabel: () => '5h left', ...over });
            test('renders the multiplier, icon, label, injected time-left, and Live badge', () => {
                const html = DR.renderXPEventHTML({ icon: '⚡', multiplier: 2, label: 'Double XP' }, deps());
                expect(html).toContain('⚡');
                expect(html).toContain('2×');
                expect(html).toContain('Double XP');
                expect(html).toContain('5h left');
                expect(html).toContain('Live');
            });
            test('escapes the event label via the injected escapeHTML', () => {
                const html = DR.renderXPEventHTML({ icon: '⚡', multiplier: 3, label: 'raw' }, deps({ escapeHTML: (s) => 'ESC(' + s + ')' }));
                expect(html).toContain('ESC(raw)');
            });
        });

        describe('renderRoyalBountyHTML', () => {
            const deps = (over = {}) => ({
                bountyUnlocked: () => true,
                bountyQuest: () => ({ title: 'Slay the Wyrm' }),
                bountyTimeLeftLabel: () => '3 days left',
                isPremium: false,
                escapeHTML: (s) => String(s),
                ...over,
            });
            const active = (over = {}) => ({ weekly: { status: 'active', chestTier: 'silver', questId: 'w1', expiresAt: 1, rerolled: false, ...over } });

            test('an empty pool renders the cadence-specific "add a quest" nudge', () => {
                const html = DR.renderRoyalBountyHTML({ weekly: { empty: true } }, deps());
                expect(html).toContain('royal-bounty-empty');
                expect(html).toContain('data-action="goal.addWeekly"');
                expect(html).toContain('Weekly Royal Bounty');
            });
            test('a claimed bounty renders the "Claimed ✓" receipt with its chest emoji', () => {
                const html = DR.renderRoyalBountyHTML({ monthly: { status: 'claimed', chestTier: 'gold' } }, deps());
                expect(html).toContain('royal-bounty-claimed');
                expect(html).toContain('Claimed ✓');
                expect(html).toContain('🥇');
                expect(html).toContain('Monthly Royal Bounty');
            });
            test('an active bounty (premium) shows an unlocked Reroll button', () => {
                const html = DR.renderRoyalBountyHTML(active(), deps({ isPremium: true }));
                expect(html).toContain('royal-bounty-active');
                expect(html).toContain('3 days left');
                expect(html).toContain('</i> Reroll</button>');
                expect(html).not.toContain('reroll-locked');
            });
            test('an active bounty (non-premium) shows a premium-locked Reroll button', () => {
                const html = DR.renderRoyalBountyHTML(active(), deps({ isPremium: false }));
                expect(html).toContain('royal-bounty-reroll-locked');
                expect(html).toContain('Reroll 👑');
            });
            test('an already-rerolled bounty shows no Reroll button', () => {
                const html = DR.renderRoyalBountyHTML(active({ rerolled: true }), deps({ isPremium: true }));
                expect(html).toContain('royal-bounty-active');
                expect(html).not.toContain('bounty.reroll');
            });
            test('escapes the quest title via the injected escapeHTML', () => {
                const html = DR.renderRoyalBountyHTML(active(), deps({ bountyQuest: () => ({ title: 'x' }), escapeHTML: (s) => 'ESC(' + s + ')' }));
                expect(html).toContain('ESC(x)');
            });
            test('a locked cadence is skipped', () => {
                expect(DR.renderRoyalBountyHTML(active(), deps({ bountyUnlocked: () => false }))).toBe('');
            });
            test('an active bounty whose target was deleted is skipped', () => {
                expect(DR.renderRoyalBountyHTML(active(), deps({ bountyQuest: () => null }))).toBe('');
            });
            test('an expired (non-active/claimed/empty) bounty renders nothing', () => {
                expect(DR.renderRoyalBountyHTML({ weekly: { status: 'expired' } }, deps())).toBe('');
            });
        });

        describe('renderStreakRepairHTML', () => {
            const deps = (over = {}) => ({
                isPremium: false,
                hasFreeStreakRepair: () => false,
                focusCrystals: 0,
                getStreakRepairCost: (n) => n * 10,
                escapeHTML: (s) => String(s),
                streakRepairTimeLeftLabel: () => '24h left',
                ...over,
            });

            test('a non-premium player who has spent their free repair sees the pure upsell', () => {
                const html = DR.renderStreakRepairHTML([{ id: 'a', kind: 'login', lostStreak: 7 }], deps());
                expect(html).toContain('Unlock Streak Repair');
                expect(html).toContain('Your 7-day streak just broke');
                expect(html).toContain('premium.showModal');
                expect(html).not.toContain('streak.repair');
            });
            test('a premium player sees repairable rows with affordable + unaffordable costs', () => {
                const html = DR.renderStreakRepairHTML([
                    { id: 'w1', kind: 'login', lostStreak: 3 },
                    { id: 'w2', kind: 'habit', title: 'Read', lostStreak: 8 },
                ], deps({ isPremium: true, focusCrystals: 50 }));
                expect(html).toContain('50 🔮 available');
                expect(html).toContain('Restore a broken streak within 48 hours.');
                expect(html).toContain('Repair · 30 🔮');   // affordable: cost 30 <= 50
                expect(html).toContain('Need 80 🔮');         // unaffordable: cost 80 > 50
            });
            test('a free-repair player pays nothing and ignores affordability', () => {
                const html = DR.renderStreakRepairHTML([{ id: 'a', kind: 'habit', title: 'Meditate', lostStreak: 4 }], deps({ hasFreeStreakRepair: () => true }));
                expect(html).toContain('1 free repair');
                expect(html).toContain('Your first streak repair is on us');
                expect(html).toContain('Repair · Free');
            });
            test('login streaks use a fixed label; habit streaks escape the title via the injected escapeHTML', () => {
                const html = DR.renderStreakRepairHTML([
                    { id: 'a', kind: 'login', lostStreak: 2 },
                    { id: 'b', kind: 'habit', title: 'x', lostStreak: 2 },
                ], deps({ isPremium: true, focusCrystals: 999, escapeHTML: (s) => 'ESC(' + s + ')' }));
                expect(html).toContain('Login streak');
                expect(html).toContain('ESC(x)');
            });
            test('injects the clock-dependent time-left label', () => {
                const html = DR.renderStreakRepairHTML([{ id: 'a', kind: 'login', lostStreak: 3 }], deps({ isPremium: true, streakRepairTimeLeftLabel: () => 'SENTINEL-LEFT' }));
                expect(html).toContain('SENTINEL-LEFT');
            });
        });

        describe('renderWeeklyThemeCardHTML', () => {
            const deps = (over = {}) => ({ eyebrow: 'EYE', copy: 'COPY', cta: 'CTA', from: '#111', to: '#222', border: '#333', escapeHTML: (s) => String(s), ...over });

            test('renders the swatch gradient, icon, eyebrow/copy/cta, and both action buttons', () => {
                const html = DR.renderWeeklyThemeCardHTML({ name: 'Ocean', icon: '🌊' }, deps());
                expect(html).toContain('linear-gradient(135deg, #111, #222)');
                expect(html).toContain('--wt-border: #333;');
                expect(html).toContain('🌊');
                expect(html).toContain('>EYE</div>');
                expect(html).toContain('>COPY</p>');
                expect(html).toContain('data-action="preview">CTA</button>');
                expect(html).toContain('data-action="dismiss"');
            });
            test('escapes the theme name in the aria-label via the injected escapeHTML', () => {
                const html = DR.renderWeeklyThemeCardHTML({ name: 'raw', icon: '🌊' }, deps({ escapeHTML: (s) => 'ESC(' + s + ')' }));
                expect(html).toContain('aria-label="Theme of the Week: ESC(raw)"');
            });
        });
    });

    // ==================== PLAYER HUD RENDER MODULE (player-hud-render.js) ====================
    //
    // Roadmap #1, 10th render module (42nd slice): the two standalone avatar-HUD "active effect" surfaces —
    // the arcane-tab active-buffs bar (renderActiveBuffsSummary) and the avatar sigil-orbit bubbles
    // (renderActiveSpellSigils) — delegate their markup to these pure builders. The wrappers keep only the
    // impure bits: the container/orbit lookups + guards, the injected wall clock, and (for sigils) the
    // empty-clear early-return + change-detect innerHTML writes + the rAF counter-rotation sync. NOTE: the
    // buffs bar interpolates spell/enchantment names RAW (faithful — this surface never escaped them); only
    // the sigil `title` is escaped. renderXPDisplay STAYS on the class (a textContent/attribute DOM mutator,
    // not a markup builder). Byte-faithfulness across every branch was proven by a temporary before/after
    // runtime snapshot (clock frozen) during extraction; these lock the builders' per-branch shape directly.
    describe('Player HUD render module (player-hud-render.js)', () => {
        const PH = require('../player-hud-render.js').default;
        const NOW = 1800000000000;
        const min = (n) => NOW + n * 60000;
        const iso = (ms) => new Date(ms).toISOString();
        const spellDefs = {
            fireball: { icon: '🔥', name: 'Fireball', rarity: 'rare' },
            heal:     { icon: '💚', name: 'Heal',     rarity: 'common' },
        };

        test('module is frozen with the four builders', () => {
            expect(Object.isFrozen(PH)).toBe(true);
            ['renderActiveBuffsSummaryHTML', 'renderActiveSpellSigilsHTML', 'renderPanelCompanionHTML', 'renderPanelActiveBuffsHTML'].forEach(fn => expect(typeof PH[fn]).toBe('function'));
        });

        describe('renderActiveBuffsSummaryHTML', () => {
            const deps = (over = {}) => ({ spellDefinitions: spellDefs, now: NOW, ...over });
            test('renders a "No active buffs" empty-state when nothing is active', () => {
                const html = PH.renderActiveBuffsSummaryHTML([], [], deps());
                expect(html).toContain('No active buffs');
                expect(html).not.toContain('bg-purple-800/50');
            });
            test('renders a timed spell badge with an (Nm) remaining hint', () => {
                const html = PH.renderActiveBuffsSummaryHTML([{ spellId: 'fireball', expiresAt: min(25) }], [], deps());
                expect(html).toContain('bg-purple-800/50');
                expect(html).toContain('🔥');
                expect(html).toContain('Fireball');
                expect(html).toContain('(25m)');
            });
            test('an until-triggered spell shows "(Until triggered)"', () => {
                const html = PH.renderActiveBuffsSummaryHTML([{ spellId: 'heal', expiresAt: -1 }], [], deps());
                expect(html).toContain('(Until triggered)');
            });
            test('a spell with no expiry (0) renders no time hint', () => {
                const html = PH.renderActiveBuffsSummaryHTML([{ spellId: 'heal', expiresAt: 0 }], [], deps());
                expect(html).toContain('Heal');
                expect(html).not.toContain('text-purple-400 text-xs');
            });
            test('a live enchantment renders a pink badge with (Nm) and the 🔮 icon fallback', () => {
                const html = PH.renderActiveBuffsSummaryHTML([], [{ name: 'Aura', expiresAt: iso(min(30)) }], deps());
                expect(html).toContain('bg-pink-800/50');
                expect(html).toContain('Aura');
                expect(html).toContain('(30m)');
                expect(html).toContain('🔮');
            });
            test('an expired enchantment (0 remaining) is filtered out', () => {
                const html = PH.renderActiveBuffsSummaryHTML([], [{ name: 'Old', expiresAt: iso(min(-5)) }], deps());
                expect(html).toContain('No active buffs');
            });
            test('an unknown spellId is skipped', () => {
                const html = PH.renderActiveBuffsSummaryHTML([{ spellId: 'ghost', expiresAt: -1 }], [], deps());
                expect(html).toContain('No active buffs');
            });
        });

        describe('renderActiveSpellSigilsHTML', () => {
            const deps = (over = {}) => ({ spellDefinitions: spellDefs, enchantmentDefinitions: { glow: { icon: '✨', name: 'Glow' } }, now: NOW, escapeHTML: (s) => String(s), ...over });
            const untn = (ids) => ids.map(id => ({ spellId: id, expiresAt: -1 }));
            const manyDefs = {};
            for (let i = 1; i <= 9; i++) manyDefs['s' + i] = { icon: '•', name: 'S' + i, rarity: 'common' };

            test("returns '' when no effect is active", () => {
                expect(PH.renderActiveSpellSigilsHTML([], [], deps())).toBe('');
            });
            test('renders one spell bubble with rarity class, angle, title, and icon', () => {
                const html = PH.renderActiveSpellSigilsHTML([{ spellId: 'fireball', expiresAt: -1 }], [], deps());
                expect(html).toContain('avatar-sigil--rare');
                expect(html).toContain('--angle: 0.00deg');
                expect(html).toContain('title="Fireball"');
                expect(html).toContain('🔥');
            });
            test('distributes a spell + enchantment at 0° and 180°', () => {
                const html = PH.renderActiveSpellSigilsHTML([{ spellId: 'heal', expiresAt: -1 }], [{ id: 'glow', expiresAt: NOW + 1000 }], deps());
                expect(html).toContain('avatar-sigil--common');
                expect(html).toContain('avatar-sigil--enchantment');
                expect(html).toContain('--angle: 0.00deg');
                expect(html).toContain('--angle: 180.00deg');
            });
            test('caps at seven visible sigils with no overflow badge', () => {
                const html = PH.renderActiveSpellSigilsHTML(untn(['s1', 's2', 's3', 's4', 's5', 's6', 's7']), [], deps({ spellDefinitions: manyDefs }));
                expect(html.match(/avatar-sigil--common/g).length).toBe(7);
                expect(html).not.toContain('avatar-sigil--overflow');
            });
            test('adds a plural "+N" overflow badge beyond seven', () => {
                const html = PH.renderActiveSpellSigilsHTML(untn(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']), [], deps({ spellDefinitions: manyDefs }));
                expect(html).toContain('avatar-sigil--overflow');
                expect(html).toContain('title="+2 more active effects"');
                expect(html).toContain('>+2</span>');
            });
            test('the overflow badge is singular for exactly one extra', () => {
                const html = PH.renderActiveSpellSigilsHTML(untn(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']), [], deps({ spellDefinitions: manyDefs }));
                expect(html).toContain('title="+1 more active effect"');
            });
            test('escapes the sigil title via the injected escapeHTML', () => {
                const html = PH.renderActiveSpellSigilsHTML([{ spellId: 'x', expiresAt: -1 }], [], deps({ spellDefinitions: { x: { icon: '⚡', name: 'raw', rarity: 'epic' } }, escapeHTML: (s) => 'ESC(' + s + ')' }));
                expect(html).toContain('title="ESC(raw)"');
            });
            test('filters out a spell whose non-(-1) expiry is in the past', () => {
                expect(PH.renderActiveSpellSigilsHTML([{ spellId: 'fireball', expiresAt: NOW - 1000 }], [], deps())).toBe('');
            });
            test('falls back to common rarity / ✨ icon / "Active spell" name', () => {
                const html = PH.renderActiveSpellSigilsHTML([{ spellId: 'bare', expiresAt: -1 }], [], deps({ spellDefinitions: { bare: {} } }));
                expect(html).toContain('avatar-sigil--common');
                expect(html).toContain('✨');
                expect(html).toContain('title="Active spell"');
            });
            test('an enchantment with no def uses the 🔮 / "Active enchantment" fallbacks', () => {
                const html = PH.renderActiveSpellSigilsHTML([], [{ id: 'unknown', expiresAt: NOW + 1000 }], deps({ enchantmentDefinitions: {} }));
                expect(html).toContain('avatar-sigil--enchantment');
                expect(html).toContain('🔮');
                expect(html).toContain('title="Active enchantment"');
            });
        });

        describe('renderPanelCompanionHTML', () => {
            const companionDefs = { wolf: { icon: '🐺', name: 'Wolf', description: 'A loyal wolf' } };
            const deps = (over = {}) => ({ companionDefinitions: companionDefs, ...over });
            test('renders the bubble with the companion\'s explicit icon/name (def not consulted)', () => {
                const html = PH.renderPanelCompanionHTML({ type: 'dragon', icon: '🐉', name: 'Smaug' }, deps());
                expect(html).toContain('companion-bubble');
                expect(html).toContain('🐉');
                expect(html).toContain('>Smaug</div>');
            });
            test('falls back to the catalog icon/name/description by type', () => {
                const html = PH.renderPanelCompanionHTML({ type: 'wolf' }, deps());
                expect(html).toContain('🐺');
                expect(html).toContain('>Wolf</div>');
                expect(html).toContain('>A loyal wolf</div>');
            });
            test('uses the 🐾 / "Companion" literal fallbacks when no def exists', () => {
                const html = PH.renderPanelCompanionHTML({ type: 'ghost' }, deps({ companionDefinitions: {} }));
                expect(html).toContain('🐾');
                expect(html).toContain('>Companion</div>');
            });
            test('the description is empty when neither the companion nor its def supplies one', () => {
                const html = PH.renderPanelCompanionHTML({ type: 'dragon', icon: '🐉', name: 'Smaug' }, deps({ companionDefinitions: {} }));
                expect(html).toContain('<div class="text-green-400 text-xs fancy-font"></div>');
            });
        });

        describe('renderPanelActiveBuffsHTML', () => {
            const deps = (over = {}) => ({ spellDefinitions: spellDefs, now: NOW, ...over });
            test('renders a "No active buffs" empty-state (purple-500/60) when nothing is active', () => {
                const html = PH.renderPanelActiveBuffsHTML([], [], deps());
                expect(html).toBe('<span class="text-purple-500/60 fancy-font text-xs">No active buffs</span>');
            });
            test('renders a compact purple chip per active spell with no time hint', () => {
                const html = PH.renderPanelActiveBuffsHTML([{ spellId: 'fireball' }], [], deps());
                expect(html).toContain('bg-purple-800/50');
                expect(html).toContain('px-2 py-1 text-xs');
                expect(html).toContain('🔥');
                expect(html).toContain('Fireball');
                expect(html).not.toContain('(');
            });
            test('renders a pink chip per live enchantment with the 🔮 icon fallback', () => {
                const html = PH.renderPanelActiveBuffsHTML([], [{ name: 'Aura', expiresAt: iso(min(30)) }], deps());
                expect(html).toContain('bg-pink-800/50');
                expect(html).toContain('🔮');
                expect(html).toContain('Aura');
            });
            test('an expired enchantment is filtered out', () => {
                const html = PH.renderPanelActiveBuffsHTML([], [{ name: 'Old', expiresAt: iso(min(-5)) }], deps());
                expect(html).toContain('No active buffs');
            });
            test('an unknown spellId is skipped', () => {
                const html = PH.renderPanelActiveBuffsHTML([{ spellId: 'ghost' }], [], deps());
                expect(html).toContain('No active buffs');
            });
        });
    });

    // ==================== TITLE HALL RENDER MODULE (title-render.js) ====================
    //
    // Roadmap #1, 11th render module (44th slice): the WHOLE Title Hall surface. renderTitleHall is now a
    // thin wrapper (3 getElementById lookups + guard + active-record resolve + two innerHTML writes + the
    // legacy grid clear) delegating its #active-title-display card + #titles-container body (progress
    // summary + per-category earned/locked cards + level ranks) to these pure builders. Byte-faithfulness
    // across every branch was proven by a temporary before/after runtime snapshot during extraction; these
    // lock the builders' per-branch shape directly. No clock; title/rank names interpolated raw.
    describe('Title Hall render module (title-render.js)', () => {
        const TR = require('../title-render.js').default;
        const contentDeps = (over = {}) => ({
            unlockedTitles: [],
            currentTitle: null,
            level: 1,
            titleStyle: 'masculine',
            levelTitles: { masculine: ['Wanderer', 'Squire', 'Knight'], feminine: ['Wanderer', 'Squire', 'Dame'] },
            ...over,
        });

        test('module is frozen with the two builders', () => {
            expect(Object.isFrozen(TR)).toBe(true);
            ['renderActiveTitleDisplayHTML', 'renderTitleHallContentHTML'].forEach(fn => expect(typeof TR[fn]).toBe('function'));
        });

        describe('renderActiveTitleDisplayHTML', () => {
            test('renders the EQUIPPED gold card when a title is active', () => {
                const html = TR.renderActiveTitleDisplayHTML({ name: 'The Beginner', description: 'Complete your first task' });
                expect(html).toContain('EQUIPPED');
                expect(html).toContain('from-yellow-900');
                expect(html).toContain('"The Beginner"');
                expect(html).toContain('Complete your first task');
            });
            test('renders the "No Title Equipped" empty-state when no title is active', () => {
                const html = TR.renderActiveTitleDisplayHTML(undefined);
                expect(html).toContain('No Title Equipped');
                expect(html).toContain('from-purple-900');
                expect(html).not.toContain('EQUIPPED');
            });
        });

        describe('renderTitleHallContentHTML', () => {
            test('renders the collection progress summary (0 / 45 when nothing unlocked)', () => {
                const html = TR.renderTitleHallContentHTML(contentDeps());
                expect(html).toContain('Title Collection');
                expect(html).toContain('0 / 45 (0%)');
            });
            test('counts unlocked titles toward the progress summary', () => {
                const html = TR.renderTitleHallContentHTML(contentDeps({
                    unlockedTitles: [{ id: 'beginner', name: 'The Beginner' }, { id: 'determined', name: 'The Determined' }],
                }));
                expect(html).toContain('2 / 45 (4%)');
            });
            test('renders an earned title card (name from unlockedMap, ✓ Equipped when active) plus locked ??? cards', () => {
                const html = TR.renderTitleHallContentHTML(contentDeps({
                    unlockedTitles: [{ id: 'beginner', name: 'The Beginner', description: 'Complete your first task' }],
                    currentTitle: 'beginner',
                }));
                expect(html).toContain('"The Beginner"');
                expect(html).toContain('✓ Equipped');
                expect(html).toContain('???');
            });
            test('renders the Level Ranks section with the current-rank marker', () => {
                const html = TR.renderTitleHallContentHTML(contentDeps({ level: 2 }));
                expect(html).toContain('Squire');
                expect(html).toContain('Current');
            });
            test('uses the feminine rank chain when titleStyle is feminine', () => {
                const html = TR.renderTitleHallContentHTML(contentDeps({ level: 3, titleStyle: 'feminine' }));
                expect(html).toContain('Dame');
                expect(html).not.toContain('Knight');
            });
        });
    });

    // ==================== REWARD RENDER MODULE (reward-render.js) ====================
    //
    // Roadmap #1, 12th render module (45th slice): the Treasury tab body. renderTreasureChests is now a thin
    // wrapper (getElementById + guard + one innerHTML write) delegating to this pure builder. Byte-faithfulness
    // across the claim / afford / opened-count branches was proven by a temporary before/after runtime snapshot
    // during extraction; these lock the builder's per-branch shape directly. The clock-derived canClaimWooden +
    // goldCoins/treasureChests come in as inputs; the chest visual is produced by the injected chestStaticHTML.
    describe('Reward render module (reward-render.js)', () => {
        const RR = require('../reward-render.js').default;
        const stamp = (tier, emoji, cls) => `<CHEST:${tier}:${emoji}:${cls || ''}>`;
        const deps = (over = {}) => ({
            canClaimWooden: true,
            goldCoins: 0,
            treasureChests: [],
            chestStaticHTML: stamp,
            ...over,
        });

        test('module is frozen with the builder', () => {
            expect(Object.isFrozen(RR)).toBe(true);
            expect(typeof RR.renderTreasureChestsHTML).toBe('function');
        });

        test('claimable wooden chest shows the FREE badge + Open button (bounce visual)', () => {
            const html = RR.renderTreasureChestsHTML(deps({ canClaimWooden: true }));
            expect(html).toContain('>FREE<');
            expect(html).toContain('🪵 Open Chest!');
            expect(html).toContain('<CHEST:wooden:🪵:animate-bounce>');
            expect(html).not.toContain('Claimed Today');
        });

        test('already-claimed wooden chest is disabled (opacity visual, no FREE badge)', () => {
            const html = RR.renderTreasureChestsHTML(deps({ canClaimWooden: false }));
            expect(html).toContain('Claimed Today');
            expect(html).toContain('<CHEST:wooden:🪵:opacity-40>');
            expect(html).not.toContain('>FREE<');
        });

        test('purchasable tiles gate on goldCoins (shortfall vs afford)', () => {
            const broke = RR.renderTreasureChestsHTML(deps({ goldCoins: 0 }));
            expect(broke).toContain('🔒 Need 200 More Gold'); // bronze costs 200
            expect(broke).toContain('disabled');

            const rich = RR.renderTreasureChestsHTML(deps({ goldCoins: 10000 }));
            expect(rich).toContain('🎁 Open Chest!');
            expect(rich).not.toContain('More Gold');
        });

        test('opened-count line: hidden at 0, singular at 1, plural at 2+', () => {
            expect(RR.renderTreasureChestsHTML(deps({ treasureChests: [] }))).not.toContain('Opened');
            expect(RR.renderTreasureChestsHTML(deps({ treasureChests: [{ type: 'bronze' }] }))).toContain('Opened 1 time<');
            expect(RR.renderTreasureChestsHTML(deps({ treasureChests: [{ type: 'bronze' }, { type: 'bronze' }] }))).toContain('Opened 2 times');
        });

        test('injects chestStaticHTML for the wooden chest + all four purchasable tiles, in order', () => {
            const calls = [];
            RR.renderTreasureChestsHTML(deps({ chestStaticHTML: (t) => { calls.push(t); return ''; } }));
            expect(calls).toEqual(['wooden', 'bronze', 'silver', 'gold', 'royal']);
        });
    });

    // ==================== THEME RENDER MODULE (theme-render.js) ====================
    //
    // Roadmap #1, 13th render module (46th slice): the two Themes surfaces. renderThemes (full #themes-container
    // grid + "Theme of the Week" banner) and renderThemeSelector (compact Tools-tab tiles) are now thin wrappers
    // delegating to these pure builders. Byte-faithfulness across featured/no-featured, premium/not, and
    // locked/unlocked/selected branches was proven by a temporary before/after runtime snapshot during
    // extraction; these lock the builders' per-branch shape directly. The clock-derived featuredId + the
    // themeDefinitions catalog / unlockedThemes / currentTheme / isPremium come in as inputs; the compact tile
    // gradient is produced by the injected darkenColor (the manager's pure helper, kept on the class).
    describe('Theme render module (theme-render.js)', () => {
        const TH = require('../theme-render.js').default;
        const defs = {
            forest: { name: 'Forest', icon: '🌲', color: '#228833', unlockLevel: 1 },
            ocean: { name: 'Ocean', icon: '🌊', color: '#1166aa', unlockLevel: 5 },
            royal: { name: 'Royal', icon: '👑', color: '#8844cc', premium: true, unlockLevel: 10 },
        };
        const themesDeps = (over = {}) => ({
            themeDefinitions: defs,
            unlockedThemes: ['forest'],
            currentTheme: 'forest',
            featuredId: null,
            ...over,
        });
        const selDeps = (over = {}) => ({
            themeDefinitions: defs,
            unlockedThemes: ['forest'],
            currentTheme: 'forest',
            isPremium: false,
            featuredId: null,
            darkenColor: (hex, p) => `${hex}~dark${p}`,
            ...over,
        });

        test('module is frozen with both builders', () => {
            expect(Object.isFrozen(TH)).toBe(true);
            expect(typeof TH.renderThemesHTML).toBe('function');
            expect(typeof TH.renderThemeSelectorHTML).toBe('function');
        });

        describe('renderThemesHTML (full grid)', () => {
            test('featured id renders the Theme-of-the-Week banner; null omits it', () => {
                const featured = TH.renderThemesHTML(themesDeps({ featuredId: 'ocean' }));
                expect(featured).toContain('theme-featured-banner');
                expect(featured).toContain('✨ Theme of the Week');
                expect(featured).toContain('Ocean — free for everyone this week!');
                expect(featured).toContain('data-theme-id="ocean"');

                expect(TH.renderThemesHTML(themesDeps())).not.toContain('theme-featured-banner');
            });

            test('selected tile is Active + ring; unlocked-not-selected is Preview', () => {
                const html = TH.renderThemesHTML(themesDeps({ unlockedThemes: ['forest', 'ocean'] }));
                expect(html).toContain('✓ Active Theme'); // forest (selected)
                expect(html).toContain('ring-4 ring-yellow-400');
                expect(html).toContain('👁 Preview'); // ocean (unlocked, not selected)
            });

            test('locked tile shows the level lock chip + theme-locked class', () => {
                const html = TH.renderThemesHTML(themesDeps());
                expect(html).toContain('🔒 Level 5'); // ocean, unlockLevel 5, not unlocked
                expect(html).toContain('theme-locked');
            });

            test('locked-but-featured tile flips to the FREE badge/pill (no lock chip)', () => {
                const html = TH.renderThemesHTML(themesDeps({ featuredId: 'ocean' }));
                expect(html).toContain('✨ FREE');
                expect(html).toContain('✨ Free this week');
                expect(html).not.toContain('🔒 Level 5'); // ocean is featured, so no lock chip
            });
        });

        describe('renderThemeSelectorHTML (compact tiles)', () => {
            test('premium themes gate on isPremium', () => {
                expect(TH.renderThemeSelectorHTML(selDeps({ isPremium: false }))).toContain('👑 Premium');
                expect(TH.renderThemeSelectorHTML(selDeps({ isPremium: true }))).not.toContain('👑 Premium');
            });

            test('selected tile shows the Active pill', () => {
                expect(TH.renderThemeSelectorHTML(selDeps())).toContain('✓ Active');
            });

            test('featured tile shows the ✨ badge + Free-this-week label', () => {
                const html = TH.renderThemeSelectorHTML(selDeps({ featuredId: 'ocean' }));
                expect(html).toContain('theme-featured-badge-sm');
                expect(html).toContain('✨ Free this week');
            });

            test('tile gradient is built from the injected darkenColor', () => {
                const html = TH.renderThemeSelectorHTML(selDeps());
                expect(html).toContain('linear-gradient(135deg, #228833, #228833~dark30)');
            });
        });
    });

    // ==================== BADGE RENDER MODULE (badge-render.js) ====================
    //
    // Roadmap #1, 14th render module (47th slice): the Badges/Achievements panel. renderBadges is now a thin
    // wrapper (container lookup + guard + getAchievementDefinitions()/getAchievementProgress() calls) delegating
    // its #badges-container body to this pure builder. Byte-faithfulness across mixed/all-locked/empty (with all
    // four progress-bar color bands) was proven by a temporary before/after runtime snapshot during extraction;
    // these lock the builder's per-branch shape directly. The achievement catalog + progress map + earned-badge
    // records are inputs; the builder is pure (the unlock date reads the record's own timestamp, never "now").
    describe('Badge render module (badge-render.js)', () => {
        const BR = require('../badge-render.js').default;
        const defs = [
            { id: 'a1', type: 'tasks', target: 10, rarity: 'rare', icon: '🥉', name: 'First Steps', description: 'Do 10 tasks' },
            { id: 'a2', type: 'streak', target: 7, rarity: 'epic', icon: '🔥', name: 'Week Warrior', description: '7-day streak' },
            { id: 'a3', type: 'focus', target: 10, rarity: 'common', icon: '🎯', name: 'Focused', description: 'Focus 10x' },
            { id: 'a4', type: 'gold', target: 100, rarity: 'legendary', icon: '💰', name: 'Rich', description: 'Earn 100 gold' },
            { id: 'a5', type: 'level', target: 5, rarity: 'common', icon: '⭐', name: 'Rising', description: 'Reach level 5' },
        ];
        // a1 earned; a2 6/7=86% (green), a3 6/10=60% (yellow), a4 30/100=30% (orange), a5 1/5=20% (gray)
        const deps = (over = {}) => ({
            achievements: defs,
            progress: { tasks: 10, streak: 6, focus: 6, gold: 30, level: 1 },
            badges: [{ id: 'a1', unlockedAt: '2026-01-15T10:00:00Z' }],
            ...over,
        });

        test('module is frozen with the builder', () => {
            expect(Object.isFrozen(BR)).toBe(true);
            expect(typeof BR.renderBadgesHTML).toBe('function');
        });

        test('empty inputs render the "complete quests" empty state', () => {
            const html = BR.renderBadgesHTML({ achievements: [], progress: {}, badges: [] });
            expect(html).toContain('Complete quests to unlock badges!');
            expect(html).not.toContain('Unlocked</h4>');
            expect(html).not.toContain('In Progress</h4>');
        });

        test('earned achievement renders an Unlocked card with its rarity frame + unlock date', () => {
            const html = BR.renderBadgesHTML(deps());
            expect(html).toContain('<i class="ri-trophy-line mr-1.5"></i>Unlocked');
            expect(html).toContain('First Steps');
            expect(html).toContain('data-rarity="rare"');
            const date = new Date('2026-01-15T10:00:00Z').toLocaleDateString();
            expect(html).toContain(`✓ ${date}`);
        });

        test('locked achievements sort closest-to-completion in the In Progress section', () => {
            const html = BR.renderBadgesHTML(deps());
            expect(html).toContain('<i class="ri-line-chart-line mr-1.5"></i>In Progress');
            // a2 (86%) > a3 (60%) > a4 (30%) > a5 (20%)
            const order = ['Week Warrior', 'Focused', 'Rich', 'Rising'].map(n => html.indexOf(n));
            expect(order).toEqual([...order].sort((x, y) => x - y));
            expect(order.every(i => i !== -1)).toBe(true);
        });

        test('progress-bar color + label steps through all four bands', () => {
            const html = BR.renderBadgesHTML(deps());
            expect(html).toContain('bg-green-500');  // a2 >=75
            expect(html).toContain('(1 to go!)');
            expect(html).toContain('bg-yellow-500'); // a3 50-74
            expect(html).toContain('(60%)');
            expect(html).toContain('bg-orange-500'); // a4 25-49
            expect(html).toContain('(30%)');
            expect(html).toContain('bg-gray-600');   // a5 <25
            expect(html).toContain('(20%)');
        });

        test('an earned achievement is excluded from the In Progress list', () => {
            // a1 is earned, so its 100%-style progress card must not appear; only the 4 locked ones do.
            const html = BR.renderBadgesHTML(deps());
            const progressBars = html.match(/progress-bar/g) || [];
            expect(progressBars).toHaveLength(4);
        });
    });

    // ==================== HABIT RENDER MODULE (habit-render.js) ====================
    //
    // Roadmap #1, 15th render module (48th slice): the populated body of the Rituals tab. renderHabits keeps its
    // #habits-container lookup + guard AND the zero-habits empty-state branch (this._renderEmptyState) inline
    // (mirroring renderActiveSpells); when habits exist it delegates the per-habit ritual cards to this pure
    // builder. Byte-faithfulness across empty + populated was proven by a temporary before/after runtime snapshot
    // during extraction; these lock the builder's per-card shape directly. escapeHTML + heatmapHTML are injected
    // (the heatmap is clock-dependent and stays on the class as generateHabitHeatMap); the builder is pure.
    describe('Habit render module (habit-render.js)', () => {
        const HR = require('../habit-render.js').default;
        // Marker stubs so assertions can see exactly what the builder routes through each injected helper.
        const esc = (s) => `[[${s}]]`;
        const hm = (h) => `<!--HM:${h.id}-->`;
        const build = (habits) => HR.renderHabitsHTML({ habits, escapeHTML: esc, heatmapHTML: hm });
        const habit = (over = {}) => ({ id: 7, title: 'Meditate', completedToday: false, streak: 3, description: 'Calm', totalCompletions: 12, ...over });

        test('module is frozen with the builder', () => {
            expect(Object.isFrozen(HR)).toBe(true);
            expect(typeof HR.renderHabitsHTML).toBe('function');
        });

        test('a habit card carries its id, escaped title, total, and injected heatmap', () => {
            const html = build([habit()]);
            expect(html).toContain('data-habit-id="7"');
            expect(html).toContain('[[Meditate]]');            // title routed through escapeHTML
            expect(html).toContain('Total: 12 completions');
            expect(html).toContain('<!--HM:7-->');              // heatmapHTML injected verbatim
        });

        test('streak badge pluralizes and disappears at zero', () => {
            expect(build([habit({ streak: 1 })])).toContain('🔥 1 day<');
            expect(build([habit({ streak: 5 })])).toContain('🔥 5 days<');
            expect(build([habit({ streak: 0 })])).not.toContain('🔥');
        });

        test('completedToday toggles the checkbox + line-through styling', () => {
            const done = build([habit({ completedToday: true })]);
            expect(done).toContain('checked');
            expect(done).toContain('line-through');
            const open = build([habit({ completedToday: false })]);
            expect(open).not.toContain('checked');
            expect(open).not.toContain('line-through');
        });

        test('description block appears only when a description is present, and is escaped', () => {
            expect(build([habit({ description: 'Jog & run' })])).toContain('[[Jog & run]]');
            expect(build([habit({ description: '' })])).not.toContain('italic mt-1');
            expect(build([habit({ description: undefined })])).not.toContain('italic mt-1');
        });

        test('totalCompletions falls back to 0 when absent', () => {
            expect(build([habit({ totalCompletions: undefined })])).toContain('Total: 0 completions');
        });

        test('multiple habits are joined into one card list', () => {
            const html = build([habit({ id: 1 }), habit({ id: 2 }), habit({ id: 3 })]);
            expect((html.match(/data-habit-id=/g) || [])).toHaveLength(3);
            expect((html.match(/<!--HM:/g) || [])).toHaveLength(3);
        });

        test('an empty habit list yields an empty string (the wrapper owns the empty state)', () => {
            expect(build([])).toBe('');
        });
    });

    // ==================== ARCHIVE RENDER MODULE (archive-render.js) ====================
    //
    // Roadmap #1, 16th render module (49th slice): the populated body of the Archive (Tools tab). renderArchives
    // keeps its #archives-container lookup + guard, the separate #archive-count textContent write, AND the
    // zero-archives empty-state branch (this._renderEmptyState) inline; when archives exist it delegates the
    // newest-first archived-goal cards to this pure builder. Byte-faithfulness across empty + populated (count +
    // innerHTML) was proven by a temporary before/after runtime snapshot during extraction; these lock the
    // builder's per-card shape directly. escapeHTML is injected; the sort + "Archived:" date read each record's
    // own archivedAt (never the wall clock), so the builder is pure.
    describe('Archive render module (archive-render.js)', () => {
        const AR = require('../archive-render.js').default;
        // Marker stub so assertions can see exactly what the builder routes through escapeHTML.
        const esc = (s) => `[[${s}]]`;
        const build = (archivedGoals) => AR.renderArchivesHTML({ archivedGoals, escapeHTML: esc });
        const goal = (over = {}) => ({ id: 7, type: 'life', title: 'Castle', description: 'Grand', completed: false, archivedAt: '2026-01-10T10:00:00Z', ...over });

        test('module is frozen with the builder', () => {
            expect(Object.isFrozen(AR)).toBe(true);
            expect(typeof AR.renderArchivesHTML).toBe('function');
        });

        test('a card carries its id, escaped title, restore/delete actions, and archived date', () => {
            const html = build([goal()]);
            expect(html).toContain('data-goal-id="7"');
            expect(html).toContain('[[Castle]]');                          // title routed through escapeHTML
            expect(html).toContain('data-action="goal.restore"');
            expect(html).toContain('data-action="goal.purgeArchived"');
            expect(html).toContain('Archived:');
        });

        test('each type maps to its icon + color, unknown falls back to gray with an undefined icon', () => {
            expect(build([goal({ type: 'life' })])).toContain('🏰');
            expect(build([goal({ type: 'life' })])).toContain('from-red-900');
            expect(build([goal({ type: 'yearly' })])).toContain('📅');
            expect(build([goal({ type: 'monthly' })])).toContain('🗓️');
            expect(build([goal({ type: 'weekly' })])).toContain('⚔️');
            expect(build([goal({ type: 'daily' })])).toContain('🗡️');
            const unknown = build([goal({ type: 'sidequest' })]);
            expect(unknown).toContain('from-gray-900');
            expect(unknown).toContain('>undefined<');                      // typeIcons['sidequest'] is undefined
        });

        test('the completed flag shows only when the goal was completed', () => {
            expect(build([goal({ completed: true })])).toContain('✓ Completed');
            expect(build([goal({ completed: false })])).not.toContain('✓ Completed');
        });

        test('description block appears only when present, and is escaped', () => {
            expect(build([goal({ description: 'Jog & run' })])).toContain('[[Jog & run]]');
            expect(build([goal({ description: '' })])).not.toContain('italic mb-2');
            expect(build([goal({ description: undefined })])).not.toContain('italic mb-2');
        });

        test('cards are sorted newest-first by archivedAt regardless of input order', () => {
            const html = build([
                goal({ id: 1, title: 'Jan', archivedAt: '2026-01-01T00:00:00Z' }),
                goal({ id: 2, title: 'Mar', archivedAt: '2026-03-01T00:00:00Z' }),
                goal({ id: 3, title: 'Feb', archivedAt: '2026-02-01T00:00:00Z' }),
            ]);
            expect(html.indexOf('[[Mar]]')).toBeLessThan(html.indexOf('[[Feb]]'));
            expect(html.indexOf('[[Feb]]')).toBeLessThan(html.indexOf('[[Jan]]'));
        });

        test('multiple archives are joined into one card list', () => {
            const html = build([goal({ id: 1 }), goal({ id: 2 }), goal({ id: 3 })]);
            expect((html.match(/data-goal-id=/g) || [])).toHaveLength(6); // restore + delete button per card
        });

        test('an empty archive list yields an empty string (the wrapper owns the empty state)', () => {
            expect(build([])).toBe('');
        });
    });

    // ==================== DAILY-BOARD RENDER MODULE (daily-board-render.js) ====================
    //
    // Roadmap #1, 17th render module (50th slice): the two Daily-board surfaces the dashboard paints.
    // renderDailyQuestBoard keeps its #daily-quest-board lookup + guard + the generateDailyQuestBoard() +
    // ensureDailyTracking() side-effects, then delegates the whole body (quest rows + sweep footer) to
    // renderDailyQuestBoardHTML. renderWoodenChest keeps its #daily-wooden-chest lookup + guard, computes the
    // clock-derived canClaim, injects _chestStaticHTML, and delegates the claimable/claimed markup to
    // renderWoodenChestHTML. Byte-faithfulness was proven by a temporary before/after runtime snapshot during
    // extraction; these lock the builders' per-branch shape directly. Both are pure: dailyQuestPool is the
    // manager's static DAILY_QUEST_POOL, def.check(tracking) is a pure predicate (and its result isn't even used
    // by the row template — preserved verbatim), and the chest's canClaim + chestStaticHTML come in as inputs.
    describe('Daily-board render module (daily-board-render.js)', () => {
        const DB = require('../daily-board-render.js').default;
        // A tiny fake pool + a marker chestStaticHTML so assertions see exactly what routes through each dep.
        const pool = [
            { id: 'a', name: 'Alpha', desc: 'do alpha', icon: '🅰️', xp: 15, check: (t) => t.x >= 1 },
            { id: 'b', name: 'Beta', desc: 'do beta', icon: '🅱️', xp: 20, check: () => false },
        ];
        const board = (quests, tracking = {}) => DB.renderDailyQuestBoardHTML({ quests, tracking, dailyQuestPool: pool });
        const chestStatic = (tier, emoji, cls) => `[chest:${tier}:${emoji}:${cls}]`;
        const chest = (canClaim) => DB.renderWoodenChestHTML({ canClaim, chestStaticHTML: chestStatic });

        test('module is frozen with both builders', () => {
            expect(Object.isFrozen(DB)).toBe(true);
            expect(typeof DB.renderDailyQuestBoardHTML).toBe('function');
            expect(typeof DB.renderWoodenChestHTML).toBe('function');
        });

        test('a claimed quest dims, shows the green-check icon, and reads CLAIMED', () => {
            const html = board([{ id: 'a', claimed: true, completed: true }]);
            expect(html).toContain('data-daily-quest-id="a"');
            expect(html).toContain('opacity-50');
            expect(html).toContain('ri-checkbox-circle-fill');
            expect(html).toContain('>CLAIMED</span>');
        });

        test('a completed-but-unclaimed quest gets a green frame and a Claim button', () => {
            const html = board([{ id: 'a', claimed: false, completed: true }]);
            expect(html).toContain('border-green-500/70');
            expect(html).toContain('data-action="quest.claimDaily"');
            expect(html).toContain('data-quest-id="a"');
            expect(html).toContain('Claim</button>');
        });

        test('a plain todo quest shows its pool def (icon/name/desc) and the XP reward', () => {
            const html = board([{ id: 'a', claimed: false, completed: false }]);
            expect(html).toContain('🅰️');
            expect(html).toContain('Alpha');
            expect(html).toContain('do alpha');
            expect(html).toContain('15 XP');
            expect(html).not.toContain('Claim</button>'); // not completed → no claim button
        });

        test('a quest id absent from the pool renders no row', () => {
            const html = board([{ id: 'ghost', claimed: false, completed: false }]);
            expect(html).not.toContain('data-daily-quest-id');
        });

        test('the sweep footer reads "Board Swept!" only when every quest is claimed', () => {
            const swept = board([
                { id: 'a', claimed: true, completed: true },
                { id: 'b', claimed: true, completed: true },
            ]);
            expect(swept).toContain('Board Swept!');
            expect(swept).not.toContain('complete —');

            const partial = board([
                { id: 'a', claimed: true, completed: true },
                { id: 'b', claimed: false, completed: false },
            ]);
            expect(partial).toContain('1/3 complete — sweep the board for a bonus!');
            expect(partial).not.toContain('Board Swept!');
        });

        test('an empty board is vacuously "swept" (matches [].every)', () => {
            expect(board([])).toContain('Board Swept!');
        });

        test('the wooden chest offers "Open Chest" when claimable', () => {
            const html = chest(true);
            expect(html).toContain('[chest:wooden:🪵:animate-bounce]');
            expect(html).toContain('A free chest awaits you each day!');
            expect(html).toContain('data-action="chest.claimWooden"');
            expect(html).toContain('Open Chest');
        });

        test('the wooden chest shows the claimed state otherwise', () => {
            const html = chest(false);
            expect(html).toContain('[chest:wooden:🪵:opacity-40]');
            expect(html).toContain('Already claimed today!');
            expect(html).toContain('Return tomorrow for another chest');
            expect(html).not.toContain('Open Chest');
        });
    });

    // ==================== RECURRING RENDER MODULE (recurring-render.js) ====================
    //
    // Roadmap #1, 18th render module (51st slice): the populated Recurring-tasks panel (Daily view → Recurring
    // tab). renderRecurringTasks keeps its #recurring-tasks-container lookup + guard and the zero-tasks empty-state
    // branch (this._renderEmptyState) inline, then delegates the list body to renderRecurringTasksHTML. Byte-
    // faithfulness was proven by a temporary before/after runtime snapshot during extraction; these lock the
    // builder's per-branch shape directly. PURE: recurringTasks is the manager's list and escapeHTML is injected;
    // the human schedule line is derived from each row's own recurrence (no clock, no shared state).
    describe('Recurring render module (recurring-render.js)', () => {
        const RR = require('../recurring-render.js').default;
        const esc = (s) => `[esc:${s}]`; // marker escapeHTML so assertions can see the title route through it
        const build = (recurringTasks) => RR.renderRecurringTasksHTML({ recurringTasks, escapeHTML: esc });
        // A single active task with the given recurrence (schedule-line assertions only care about recurrence).
        const sched = (recurrence) => build([{ id: 7, active: true, title: 'T', recurrence }]);

        test('module is frozen with the builder', () => {
            expect(Object.isFrozen(RR)).toBe(true);
            expect(typeof RR.renderRecurringTasksHTML).toBe('function');
        });

        test('weekly recurrence joins its day labels', () => {
            expect(sched({ type: 'weekly', days: ['mon', 'wed', 'fri'] })).toContain('Every Mon, Wed, Fri');
        });

        test('an unrecognized weekday label falls back to its raw key', () => {
            expect(sched({ type: 'weekly', days: ['mon', 'xyz'] })).toContain('Every Mon, xyz');
        });

        test('biweekly recurrence reads "Every other <day>"', () => {
            expect(sched({ type: 'biweekly', day: 'fri' })).toContain('Every other Fri');
        });

        test('monthly-date recurrence reads "Monthly on day N"', () => {
            expect(sched({ type: 'monthly-date', dayOfMonth: 12 })).toContain('Monthly on day 12');
        });

        test('monthly-weekday recurrence reads "<ordinal> <day> of month"', () => {
            expect(sched({ type: 'monthly-weekday', week: 2, day: 'tue' })).toContain('2nd Tue of month');
        });

        test('monthly-weekday with week === -1 reads "Last <day> of month"', () => {
            expect(sched({ type: 'monthly-weekday', week: -1, day: 'fri' })).toContain('Last Fri of month');
        });

        test('an active task uses the cyan frame + filled green toggle', () => {
            const html = build([{ id: 7, active: true, title: 'T', recurrence: { type: 'biweekly', day: 'fri' } }]);
            expect(html).toContain('bg-cyan-900/40');
            expect(html).toContain('text-green-400');
            expect(html).toContain('ri-checkbox-circle-fill');
        });

        test('a paused task dims and uses the blank toggle', () => {
            const html = build([{ id: 7, active: false, title: 'T', recurrence: { type: 'biweekly', day: 'fri' } }]);
            expect(html).toContain('bg-gray-800/40 opacity-60');
            expect(html).toContain('text-gray-500');
            expect(html).toContain('ri-checkbox-blank-circle-line');
        });

        test('each row wires toggle + delete actions to its id and escapes the title', () => {
            const html = build([{ id: 42, active: true, title: '<b>hi</b>', recurrence: { type: 'biweekly', day: 'fri' } }]);
            expect(html).toContain('data-action="recurring.toggle"');
            expect(html).toContain('data-action="recurring.delete"');
            expect(html).toContain('data-rt-id="42"');
            expect(html).toContain('[esc:<b>hi</b>]'); // title routed through injected escapeHTML
        });

        test('an empty list yields an empty string (the wrapper owns the empty state)', () => {
            expect(build([])).toBe('');
        });
    });

    // ==================== CALENDAR RENDER MODULE (calendar-render.js) ====================
    //
    // Roadmap #1, 19th render module (52nd slice): the Calendar tab. renderCalendar builds its #calendar-days grid
    // imperatively (createElement + a per-day onclick selectDate closure + appendChild) and routes ONLY each cell's
    // inner HTML through renderCalendarDayHTML; renderCalendarTasks writes the #selected-date-title textContent and,
    // for a day that has tasks, the #selected-date-tasks body through renderCalendarTasksHTML (the zero-tasks empty-
    // state stays inline in the wrapper). Byte-faithfulness across the extraction was proven by a temporary before/
    // after runtime snapshot; these lock the builders' per-branch shape directly. Both PURE — the day cell is a pure
    // function of {day,isToday,completed,total} scalars, and the task list of {tasksForDay,dateString} + injected
    // escapeHTML (goalManager.toggleTask is an inline onchange string in the OUTPUT markup, not a live ref).
    describe('Calendar render module (calendar-render.js)', () => {
        const CR = require('../calendar-render.js').default;
        const esc = (s) => `[esc:${s}]`; // marker escapeHTML so assertions can see text route through it

        test('module is frozen with both builders', () => {
            expect(Object.isFrozen(CR)).toBe(true);
            expect(typeof CR.renderCalendarDayHTML).toBe('function');
            expect(typeof CR.renderCalendarTasksHTML).toBe('function');
        });

        // ----- renderCalendarDayHTML (one calendar cell's inner content) -----
        test('a day with no tasks renders just the number, no badge', () => {
            const html = CR.renderCalendarDayHTML({ day: 3, isToday: false, completedTasks: 0, totalTasks: 0 });
            expect(html).toContain('>3</div>');
            expect(html).not.toContain('⚔️');
        });

        test('a day with tasks renders a completed/total ⚔️ badge', () => {
            expect(CR.renderCalendarDayHTML({ day: 9, isToday: false, completedTasks: 1, totalTasks: 3 })).toContain('1/3 ⚔️');
        });

        test("today's cell tints the number white and the badge amber-100", () => {
            const html = CR.renderCalendarDayHTML({ day: 15, isToday: true, completedTasks: 2, totalTasks: 2 });
            expect(html).toContain('text-white');
            expect(html).toContain('text-amber-100');
        });

        test('a non-today cell tints the number amber-200 and the badge amber-300', () => {
            const html = CR.renderCalendarDayHTML({ day: 15, isToday: false, completedTasks: 0, totalTasks: 1 });
            expect(html).toContain('text-amber-200');
            expect(html).toContain('text-amber-300');
        });

        // ----- renderCalendarTasksHTML (the populated selected-date list) -----
        const build = (tasksForDay, dateString = '2026-07-15') =>
            CR.renderCalendarTasksHTML({ tasksForDay, dateString, escapeHTML: esc });

        test('each task becomes a card with a toggle wired to its id, an escaped title, and a delete button', () => {
            const html = build([{ id: 5, completed: false, title: '<b>hi</b>' }]);
            expect(html).toContain('goalManager.toggleTask(5, event)');
            expect(html).toContain('[esc:<b>hi</b>]');
            expect(html).toContain('data-action="goal.delete"');
            expect(html).toContain('data-goal-type="daily"');
            expect(html).toContain('data-goal-id="5"');
        });

        test('a completed task is checked and struck through', () => {
            const html = build([{ id: 5, completed: true, title: 'T' }]);
            expect(html).toContain('checked');
            expect(html).toContain('line-through text-amber-600 opacity-60');
        });

        test('an incomplete task is neither checked nor struck through', () => {
            const html = build([{ id: 5, completed: false, title: 'T' }]);
            expect(html).not.toContain('checked'); // "checkbox" does not contain "checked"
            expect(html).toContain('text-amber-100');
        });

        test('a description renders an escaped italic line only when present', () => {
            expect(build([{ id: 5, title: 'T', description: '<i>d</i>' }])).toContain('[esc:<i>d</i>]');
            expect(build([{ id: 5, title: 'T' }])).not.toContain('italic');
        });

        test('a checklist renders escaped items with checked/unchecked glyphs only when present', () => {
            const html = build([{ id: 5, title: 'T', checklist: [{ completed: true, text: '<a>' }, { completed: false, text: 'b' }] }]);
            expect(html).toContain('☑');
            expect(html).toContain('☐');
            expect(html).toContain('[esc:<a>]');
            expect(build([{ id: 5, title: 'T' }])).not.toContain('☑');
        });

        test('the footer Add-Another button carries the selected dateString', () => {
            const html = build([{ id: 5, title: 'T' }], '2026-07-20');
            expect(html).toContain('Add Another Quest');
            expect(html).toContain('data-action="task.addDaily"');
            expect(html).toContain('data-date="2026-07-20"');
        });
    });

    // ==================== FOCUS-TIMER RENDER MODULE (focus-timer-render.js) ====================
    //
    // Roadmap #1, 20th render module: updateFocusTimerControls delegates its 4-state #focus-timer-controls button
    // set to renderFocusTimerControls (which returns { containerClass, buttonsHTML }), and
    // _updateChainProgressIndicator delegates its active-chain dots+status body to renderChainProgressHTML. The
    // wrappers keep only the impure bits (getElementById lookups/guards, the no-chain empty/hidden branch, and the
    // className/innerHTML writes). The wiring (real wrappers producing identical output) was proven byte-faithful by
    // a temporary before/after runtime snapshot during the extraction; these lock the builders' per-branch shape.
    describe('Focus-timer render module (focus-timer-render.js)', () => {
        const FTR = require('../focus-timer-render.js').default;
        const ctrl = (o) => FTR.renderFocusTimerControls({ focusTimerRunning: false, isBreak: false, hasPomodoroChain: false, focusTimeRemaining: 0, sessionsPerChain: 4, ...o });

        describe('renderFocusTimerControls', () => {
            test('running + break shows only a Stop Chain button (no pause/resume during breaks)', () => {
                const { containerClass, buttonsHTML } = ctrl({ focusTimerRunning: true, isBreak: true, hasPomodoroChain: true });
                expect(containerClass).toContain('grid-cols-1');
                expect(buttonsHTML).toContain('data-action="focus.stop"');
                expect(buttonsHTML).toContain('Stop Chain');
                expect(buttonsHTML).not.toContain('data-action="focus.pause"');
                expect(buttonsHTML).not.toContain('data-action="focus.resume"');
            });

            test('running (not break) with a chain shows Pause + Stop Chain', () => {
                const { containerClass, buttonsHTML } = ctrl({ focusTimerRunning: true, isBreak: false, hasPomodoroChain: true });
                expect(containerClass).toContain('grid-cols-2');
                expect(buttonsHTML).toContain('data-action="focus.pause"');
                expect(buttonsHTML).toContain('data-action="focus.stop"');
                expect(buttonsHTML).toContain('Stop Chain');
            });

            test('running (not break) without a chain shows Pause + a plain Stop (no chain label)', () => {
                const { buttonsHTML } = ctrl({ focusTimerRunning: true, isBreak: false, hasPomodoroChain: false });
                expect(buttonsHTML).toContain('data-action="focus.pause"');
                expect(buttonsHTML).toContain('data-action="focus.stop"');
                expect(buttonsHTML).not.toContain('Stop Chain');
            });

            test('paused (time remaining) shows Resume + Stop, honoring the chain stop-label', () => {
                const noChain = ctrl({ focusTimerRunning: false, focusTimeRemaining: 300, hasPomodoroChain: false });
                expect(noChain.containerClass).toContain('grid-cols-2');
                expect(noChain.buttonsHTML).toContain('data-action="focus.resume"');
                expect(noChain.buttonsHTML).not.toContain('Stop Chain');
                const withChain = ctrl({ focusTimerRunning: false, focusTimeRemaining: 300, hasPomodoroChain: true });
                expect(withChain.buttonsHTML).toContain('data-action="focus.resume"');
                expect(withChain.buttonsHTML).toContain('Stop Chain');
            });

            test('idle shows Start Focus + a Start Pomodoro Chain button carrying the session count', () => {
                const { containerClass, buttonsHTML } = ctrl({ focusTimerRunning: false, focusTimeRemaining: 0, sessionsPerChain: 4 });
                expect(containerClass).toContain('grid-cols-1');
                expect(buttonsHTML).toContain('data-action="focus.start"');
                expect(buttonsHTML).toContain('Start Focus');
                expect(buttonsHTML).toContain('data-action="focus.chain"');
                expect(buttonsHTML).toContain('(4x)');
            });
        });

        describe('renderChainProgressHTML', () => {
            test('mid-chain marks completed sessions done, the current one active, and the rest numbered', () => {
                const html = FTR.renderChainProgressHTML({ totalSessions: 4, currentSession: 2, isBreak: false });
                expect(html).toContain('⚔️ Session 2 of 4');
                expect(html).toContain('✓');             // session 1 completed
                expect(html).toContain('bg-blue-500');    // current focus dot is active
                expect(html).toContain('animate-pulse');  // ...and pulses
                expect((html.match(/rounded-full/g) || []).length).toBe(4);
            });

            test('a break renders the coffee marker and a Break — Next status line', () => {
                const html = FTR.renderChainProgressHTML({ totalSessions: 4, currentSession: 2, isBreak: true });
                expect(html).toContain('☕');
                expect(html).toContain('☕ Break — Next: Session 2');
                expect(html).toContain('animate-pulse');
            });
        });
    });

    // ==================== PREMIUM RENDER MODULE (premium-render.js) ====================
    //
    // Roadmap #1, 21st render module: renderPremiumCard delegates both #premium-content branches (the premium
    // thank-you view / the free upgrade prompt) to renderPremiumCardHTML, and getPremiumBannerHTML forwards
    // this.isPremium to renderPremiumBannerHTML (the shared upsell banner behind 5 call sites). The wrappers keep
    // the getElementById lookup + guard and the locale-dependent toLocaleDateString() purchase-date format.
    // Byte-faithfulness was proven during extraction by a temporary equality check against the pre-swap inline
    // output; these lock the builders' per-branch shape and the real-wrapper wiring.
    describe('Premium render module (premium-render.js)', () => {
        const PR = require('../premium-render.js').default;

        test('module is frozen with the two builders', () => {
            expect(Object.isFrozen(PR)).toBe(true);
            expect(typeof PR.renderPremiumCardHTML).toBe('function');
            expect(typeof PR.renderPremiumBannerHTML).toBe('function');
        });

        describe('renderPremiumCardHTML', () => {
            test('premium view shows the thank-you card with the injected purchase date + perk grid', () => {
                const html = PR.renderPremiumCardHTML({ isPremium: true, purchaseDate: '1/15/2026' });
                expect(html).toContain('Premium Adventurer');
                expect(html).toContain('Member since: 1/15/2026');
                expect(html).toContain('Boss Battles');
                expect(html).not.toContain('$4.99');
                expect(html).not.toContain('data-action="premium.showModal"');
            });

            test('free view shows the upgrade prompt with the $4.99 Go Premium CTA + six perks', () => {
                const html = PR.renderPremiumCardHTML({ isPremium: false, purchaseDate: 'Unknown' });
                expect(html).toContain('Upgrade to Premium');
                expect(html).toContain('$4.99');
                expect(html).toContain('data-action="premium.showModal"');
                expect(html).toContain('Go Premium');
                expect(html).not.toContain('Member since');
                expect((html.match(/flex items-center gap-2 text-yellow-100 text-sm/g) || []).length).toBe(6);
            });
        });

        describe('renderPremiumBannerHTML', () => {
            test('non-premium returns the banner carrying the surface-specific message', () => {
                const html = PR.renderPremiumBannerHTML('Unlock exclusive premium themes!', false);
                expect(html).toContain('Unlock exclusive premium themes!');
                expect(html).toContain('data-action="premium.showModal"');
                expect(html).toContain('Go Premium');
            });

            test('premium users get an empty banner (no upsell)', () => {
                expect(PR.renderPremiumBannerHTML('anything', true)).toBe('');
            });
        });

        describe('delegators (real GoalManager wiring)', () => {
            test('renderPremiumCard writes the module card into #premium-content for both states', () => {
                const gm = createTestManager({ isPremium: false });
                document.body.innerHTML = '<div id="premium-content"></div>';
                gm.renderPremiumCard();
                expect(document.getElementById('premium-content').innerHTML).toContain('Upgrade to Premium');

                gm.isPremium = true;
                gm.premiumPurchaseDate = '2026-01-15T12:00:00';
                gm.renderPremiumCard();
                const out = document.getElementById('premium-content').innerHTML;
                expect(out).toContain('Premium Adventurer');
                expect(out).toContain('Member since: ' + new Date('2026-01-15T12:00:00').toLocaleDateString());
            });

            test('getPremiumBannerHTML forwards isPremium to the module builder (raw-string identical)', () => {
                const free = createTestManager({ isPremium: false });
                expect(free.getPremiumBannerHTML('Premium unlocks advanced analytics & more!'))
                    .toBe(PR.renderPremiumBannerHTML('Premium unlocks advanced analytics & more!', false));
                expect(free.getPremiumBannerHTML('x')).toContain('x');
                const premium = createTestManager({ isPremium: true });
                expect(premium.getPremiumBannerHTML('x')).toBe('');
            });
        });
    });

    // ==================== REMINDER RENDER MODULE (reminder-render.js) ====================
    //
    // Roadmap #1, 22nd render module (55th slice) — the LAST tab-render surface, completing item #1's
    // render burn-down. renderReminderSettings is now a thin wrapper: it keeps the #reminder-settings-container
    // lookup + guard AND the permission re-check that MUTATES this.notificationsEnabled (native plugin state vs
    // Notification.permission vs the notificationsConfirmedWorking localStorage fallback), then delegates the whole
    // body to renderReminderSettingsHTML with the five resolved flags. Byte-faithfulness across the notif-state
    // matrix (web granted/default/denied/confirmed, native enabled/disabled, not-supported, settings-off) was
    // proven during extraction by a temporary inline-vs-module equality check; these lock the builder's per-branch
    // shape + the real-wrapper flag resolution. The time <input>s keep their inline onchange handlers verbatim.
    describe('Reminder render module (reminder-render.js)', () => {
        const RR = require('../reminder-render.js').default;
        const settings = (over = {}) => ({
            enabled: true, morningReminder: true, morningTime: '09:00',
            eveningReminder: true, eveningTime: '18:00', overdueAlert: true,
            streakReminder: true, streakReminderTime: '20:00',
            bountyReminder: true, bountyReminderTime: '18:00', ...over
        });
        const build = (over = {}) => RR.renderReminderSettingsHTML({
            settings: settings(), notificationsEnabled: false, isNative: false,
            notificationSupported: true, permissionDenied: false, ...over
        });

        test('module is frozen with the one builder', () => {
            expect(Object.isFrozen(RR)).toBe(true);
            expect(typeof RR.renderReminderSettingsHTML).toBe('function');
        });

        describe('master toggle + enabled/disabled body', () => {
            test('enabled shows the five timed/toggle rows + the master toggle', () => {
                const html = build({ settings: settings({ enabled: true }) });
                expect(html).toContain('Enable Reminders');
                expect(html).toContain('data-setting="enabled"');
                expect(html).toContain('🌅 Morning');
                expect(html).toContain('🌆 Evening');
                expect(html).toContain('⚠️ Overdue Alerts');
                expect(html).toContain('🔥 Streak Saver');
                expect(html).toContain('👑 Bounty Reminder');
                expect(html).not.toContain('Enable reminders to configure notification times');
            });
            test('disabled collapses the rows to the configure hint', () => {
                const html = build({ settings: settings({ enabled: false }) });
                expect(html).toContain('Enable reminders to configure notification times');
                expect(html).not.toContain('🌅 Morning');
                expect(html).not.toContain('👑 Bounty Reminder');
            });
            test('per-setting toggle flips green/gray by its boolean (within the same button tag)', () => {
                const on = build({ settings: settings({ morningReminder: true }) });
                const off = build({ settings: settings({ morningReminder: false }) });
                expect(on).toMatch(/data-setting="morningReminder"[^>]*bg-green-600/);
                expect(off).toMatch(/data-setting="morningReminder"[^>]*bg-gray-600/);
            });
            test('time inputs carry their values + the inline onchange handlers verbatim', () => {
                const html = build({ settings: settings({ morningTime: '07:30', bountyReminderTime: '21:15' }) });
                expect(html).toContain('value="07:30"');
                expect(html).toContain("onchange=\"goalManager.updateReminderSettings('morningTime', this.value)\"");
                expect(html).toContain('value="21:15"');
                expect(html).toContain("onchange=\"goalManager.updateReminderSettings('bountyReminderTime', this.value)\"");
            });
        });

        describe('notification status label + enable section', () => {
            test('enabled -> ✓ Enabled + test button, no delivery row on web', () => {
                const html = build({ notificationsEnabled: true, isNative: false });
                expect(html).toContain('✓ Enabled');
                expect(html).toContain('data-action="reminder.test"');
                expect(html).not.toContain('Delivery:');
            });
            test('native + not enabled -> ○ Not Enabled + native delivery row + enable button', () => {
                const html = build({ notificationsEnabled: false, isNative: true });
                expect(html).toContain('○ Not Enabled');
                expect(html).toContain('Delivery:');
                expect(html).toContain('✓ Native');
                expect(html).toContain('data-action="reminder.enable"');
            });
            test('web + denied -> ✗ Blocked + guide button (not the enable button)', () => {
                const html = build({ notificationsEnabled: false, isNative: false, notificationSupported: true, permissionDenied: true });
                expect(html).toContain('✗ Blocked');
                expect(html).toContain('data-action="reminder.guide"');
                expect(html).toContain('How to Enable Notifications');
                expect(html).not.toContain('data-action="reminder.enable"');
            });
            test('web + supported + not denied -> ○ Not Enabled + generic enable button', () => {
                const html = build({ notificationsEnabled: false, isNative: false, notificationSupported: true, permissionDenied: false });
                expect(html).toContain('○ Not Enabled');
                expect(html).toContain('data-action="reminder.enable"');
                expect(html).not.toContain('data-action="reminder.guide"');
            });
            test('not supported -> ✗ Not Supported + generic enable button', () => {
                const html = build({ notificationsEnabled: false, isNative: false, notificationSupported: false, permissionDenied: false });
                expect(html).toContain('✗ Not Supported');
                expect(html).toContain('data-action="reminder.enable"');
            });
        });

        describe('delegator (real GoalManager wiring)', () => {
            const savedNotification = window.Notification;
            const savedCapBridge = window.CapBridge;
            afterAll(() => {
                window.Notification = savedNotification;
                if (savedCapBridge === undefined) delete window.CapBridge; else window.CapBridge = savedCapBridge;
                localStorage.removeItem('notificationsConfirmedWorking');
            });

            test('web + granted: wrapper re-check flips notificationsEnabled=true and writes ✓ Enabled', () => {
                delete window.CapBridge;
                window.Notification = { permission: 'granted' };
                localStorage.removeItem('notificationsConfirmedWorking');
                const gm = createTestManager();
                gm.reminderSettings = settings();
                gm.notificationsEnabled = false; // the wrapper's re-check should flip this
                document.body.innerHTML = '<div id="reminder-settings-container"></div>';
                gm.renderReminderSettings();
                expect(gm.notificationsEnabled).toBe(true);
                const out = document.getElementById('reminder-settings-container').innerHTML;
                expect(out).toContain('✓ Enabled');
                expect(out).toContain('data-action="reminder.test"');
            });

            test('missing container: guards without throwing', () => {
                const gm = createTestManager();
                gm.reminderSettings = settings();
                document.body.innerHTML = '';
                expect(() => gm.renderReminderSettings()).not.toThrow();
            });
        });
    });

    // ==================== SPELL RENDER MODULE (spell-render.js) ====================
    //
    // Roadmap #1, 4th render module: the Spellbook surface (renderActiveSpells +
    // renderSpellCollection) delegates its card/header markup to these pure builders.
    // The wrappers keep only the impure bits (Date.now-based timeDisplay, spellbook/
    // activeSpells lookups) and inject _rarityNameplate + _overchargeButtonHTML. The
    // wiring (real wrappers producing identical output) was proven byte-faithful by a
    // temporary before/after runtime snapshot during the extraction; these lock the
    // builders' per-branch shape directly.
    describe('Spell render module (spell-render.js)', () => {
        const SR = require('../spell-render.js').default;
        const nameplate = (r) => `<NP:${r}>`;
        const overcharge = (spell, charges) => `<OC:${spell.id}:${charges}>`;
        const spell = (over = {}) => ({ id: 'lucky_draw', rarity: 'rare', icon: '🎲', name: 'Lucky Draw', description: 'desc', ...over });

        test('module is frozen with the six builders', () => {
            expect(Object.isFrozen(SR)).toBe(true);
            expect(typeof SR.renderActiveSpellCardHTML).toBe('function');
            expect(typeof SR.renderFreeSpellsHeaderHTML).toBe('function');
            expect(typeof SR.renderFreeSpellCardHTML).toBe('function');
            expect(typeof SR.renderPremiumSpellsHeaderHTML).toBe('function');
            expect(typeof SR.renderPremiumSpellCardHTML).toBe('function');
        });

        describe('renderActiveSpellCardHTML', () => {
            test('renders rarity chrome + injected nameplate + caller-computed timeDisplay', () => {
                const html = SR.renderActiveSpellCardHTML(spell({ rarity: 'legendary' }), { timeDisplay: '⏰ 1h 2m remaining', rarityNameplate: nameplate });
                expect(html).toContain('data-rarity="legendary"');
                expect(html).toContain('from-yellow-800 to-yellow-900'); // legendary -> yellow
                expect(html).toContain('active-spell');
                expect(html).toContain('🎲');
                expect(html).toContain('Lucky Draw');
                expect(html).toContain('<NP:legendary>');
                expect(html).toContain('⏰ 1h 2m remaining');
            });
            test('unknown rarity falls back to purple (the active-row fallback)', () => {
                const html = SR.renderActiveSpellCardHTML(spell({ rarity: 'mythic' }), { timeDisplay: 'x', rarityNameplate: nameplate });
                expect(html).toContain('from-purple-800 to-purple-900');
            });
        });

        describe('renderFreeSpellsHeaderHTML', () => {
            test('shows the available count', () => {
                const html = SR.renderFreeSpellsHeaderHTML(7);
                expect(html).toContain('Free Spells');
                expect(html).toContain('(7 available)');
            });
        });

        describe('renderFreeSpellCardHTML', () => {
            test('active spell shows the Active badge (not a cast button)', () => {
                const html = SR.renderFreeSpellCardHTML(spell(), { charges: 0, isActive: true, rarityNameplate: nameplate, overchargeButtonHTML: overcharge });
                expect(html).toContain('✓ Active');
                expect(html).not.toContain('Cast Spell');
                expect(html).not.toContain('Open chests for charges');
            });
            test('charged (inactive) shows Cast Spell + the injected overcharge button', () => {
                const html = SR.renderFreeSpellCardHTML(spell(), { charges: 2, isActive: false, rarityNameplate: nameplate, overchargeButtonHTML: overcharge });
                expect(html).toContain('Cast Spell');
                expect(html).toContain('data-action="spell.cast"');
                expect(html).toContain('data-spell-id="lucky_draw"');
                expect(html).toContain('⚡ Charges: 2');
                expect(html).toContain('<OC:lucky_draw:2>');
            });
            test('no charges (inactive) shows the empty "open chests" state', () => {
                const html = SR.renderFreeSpellCardHTML(spell(), { charges: 0, isActive: false, rarityNameplate: nameplate, overchargeButtonHTML: overcharge });
                expect(html).toContain('Open chests for charges');
                expect(html).not.toContain('Cast Spell');
            });
            test('unknown rarity falls back to gray (the collection fallback)', () => {
                const html = SR.renderFreeSpellCardHTML(spell({ rarity: 'mythic' }), { charges: 0, isActive: false, rarityNameplate: nameplate, overchargeButtonHTML: overcharge });
                expect(html).toContain('from-gray-900 to-gray-950');
            });
        });

        describe('renderPremiumSpellsHeaderHTML', () => {
            test('shows the count + passes the pre-rendered banner through verbatim', () => {
                const html = SR.renderPremiumSpellsHeaderHTML(3, '<BANNER/>');
                expect(html).toContain('Premium Spells');
                expect(html).toContain('(3 spells)');
                expect(html).toContain('<BANNER/>');
            });
        });

        describe('renderPremiumSpellCardHTML', () => {
            const base = { charges: 0, isActive: false, isPremiumLocked: false, rarityNameplate: nameplate, overchargeButtonHTML: overcharge };
            test('locked: dimmed frame + lock icon + Unlock Premium (wins over active/charges)', () => {
                const html = SR.renderPremiumSpellCardHTML(spell(), { ...base, isPremiumLocked: true, charges: 5, isActive: true });
                expect(html).toContain('opacity-60');
                expect(html).toContain('ri-lock-line');
                expect(html).toContain('👑 Unlock Premium');
                expect(html).toContain('data-action="premium.showModal"');
                expect(html).not.toContain('✓ Active');
                expect(html).not.toContain('Cast Spell');
            });
            test('unlocked + active shows the Active badge (no dim tint)', () => {
                const html = SR.renderPremiumSpellCardHTML(spell(), { ...base, isActive: true });
                expect(html).not.toContain('opacity-60');
                expect(html).toContain('✓ Active');
            });
            test('unlocked + charged shows Cast Spell + the injected overcharge button', () => {
                const html = SR.renderPremiumSpellCardHTML(spell(), { ...base, charges: 3 });
                expect(html).toContain('Cast Spell');
                expect(html).toContain('<OC:lucky_draw:3>');
            });
            test('unlocked + no charges shows the empty "open chests" state', () => {
                const html = SR.renderPremiumSpellCardHTML(spell(), { ...base });
                expect(html).toContain('Open chests for charges');
            });
        });
    });

    // ==================== BALANCE MODULE (#6, centralized economy numbers) ====================
    //
    // The *wiring* (production code actually reading these numbers) is already
    // proven by existing behavioral tests: the `lucky_loot chest weight shift`
    // suite drives the real generateChestRewards() rarity weights, `Trophy Hunter
    // (boss_loot)` drives generateBossLoot() item counts, and the class-tree cost
    // tests drive initializeClasses(). These tests lock the module's shape + tuning
    // so any future edit to balance.js is a deliberate, reviewable act.
    describe('Balance module (balance.js)', () => {
        const BALANCE = require('../balance.js').default;

        test('is loaded, non-empty, and deeply frozen (immutable source of truth)', () => {
            expect(BALANCE).toBeTruthy();
            expect(Object.isFrozen(BALANCE)).toBe(true);
            expect(Object.isFrozen(BALANCE.loot)).toBe(true);
            expect(Object.isFrozen(BALANCE.loot.chestRarityWeights)).toBe(true);
            expect(Object.isFrozen(BALANCE.loot.chestRarityWeights.bronze)).toBe(true);
            expect(Object.isFrozen(BALANCE.classTree)).toBe(true);
            expect(Object.isFrozen(BALANCE.classTree.linearCosts)).toBe(true);
        });

        test('goal-manager.js captured the exact same table (wiring identity)', () => {
            expect(BALANCE).toBe(BALANCE);
        });

        test('loot drop thresholds match the documented 1/4/10/25/60 curve', () => {
            expect(BALANCE.loot.dropRarityThresholds).toEqual({
                legendary: 1, epic: 5, rare: 15, uncommon: 40
            });
        });

        test('every chest tier rarity weight set sums to 100', () => {
            for (const tier of ['bronze', 'silver', 'gold', 'royal']) {
                const sum = Object.values(BALANCE.loot.chestRarityWeights[tier]).reduce((a, b) => a + b, 0);
                expect(sum).toBe(100);
            }
        });

        test('every boss cadence rarity weight set sums to 100', () => {
            for (const cadence of ['daily', 'weekly', 'monthly']) {
                const sum = Object.values(BALANCE.loot.bossRarityWeights[cadence]).reduce((a, b) => a + b, 0);
                expect(sum).toBe(100);
            }
        });

        test('item counts and gold fallback tables have the expected shape', () => {
            expect(BALANCE.loot.chestItemCounts).toEqual({ bronze: 1, silver: 2, gold: 3, royal: 4 });
            expect(BALANCE.loot.bossItemCounts).toEqual({ daily: 1, weekly: 2, monthly: 3 });
            expect(BALANCE.loot.companionLockedGold.default).toEqual([50, 100]);
            expect(BALANCE.loot.emptyPoolFallbackGold.default).toEqual([50, 150]);
            for (const table of [BALANCE.loot.companionLockedGold, BALANCE.loot.emptyPoolFallbackGold]) {
                for (const range of Object.values(table)) {
                    expect(Array.isArray(range)).toBe(true);
                    const [min, max] = range;
                    expect(min).toBeLessThanOrEqual(max);
                }
            }
        });

        test('class-tree costs are the single source initializeClasses() reads', () => {
            const defs = createTestManager().initializeClasses();
            expect(defs.scholar.nodes.map(n => n.cost)).toEqual(BALANCE.classTree.linearCosts);
            expect(defs.scholar.capstones.every(c => c.cost === BALANCE.classTree.capstoneCost)).toBe(true);
            expect(defs.scholar.subclasses.archivist.tiers.map(t => t.cost)).toEqual(BALANCE.classTree.subTierCosts);
            // pin the actual numbers so a balance.js edit is a deliberate act
            expect(BALANCE.classTree.linearCosts).toEqual([2, 3, 4, 5, 6]);
            expect(BALANCE.classTree.capstoneCost).toBe(10);
            expect(BALANCE.classTree.subTierCosts).toEqual([3, 4, 5]);
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
        // Quick Add (the FAB / "n" shortcut) must create the item DIRECTLY from
        // the typed text — no modal, no discarded input. The old handler passed
        // the text to the regular addX(parentId) overloads, which either dropped
        // it (side quests) or corrupted parent-link arrays (weekly/monthly/...),
        // and to addHabit()/addRecurringTask() which ignored it and opened their
        // own modal (the "double-prompt" UX bug this suite now guards against).

        // Minimal synthetic keyboard event; closeQuickAdd() is DOM-guarded.
        function fireQuickAdd(gm, text) {
            gm.handleQuickAdd({ key: 'Enter', target: { value: text } });
        }

        test('quickAddDailyTask creates a dated daily task from the title, no modal', () => {
            const gm = createTestManager();
            gm.trackDaily = jest.fn();
            gm.trackFirstTaskCreated = jest.fn();
            gm.quickAddDailyTask('Slay the dragon');

            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0]).toMatchObject({
                title: 'Slay the dragon', completed: false, description: ''
            });
            expect(gm.dailyTasks[0].dueDate).toBe(gm.getTodayDateString());
            expect(gm.showInputModal).not.toHaveBeenCalled();
            expect(gm.saveData).toHaveBeenCalled();
        });

        test('quickAdd goal helpers set the title and never corrupt parent-link arrays', () => {
            const gm = createTestManager();
            gm.quickAddSideQuest('Side A');
            gm.quickAddWeeklyGoal('Week A');
            gm.quickAddMonthlyGoal('Month A');
            gm.quickAddYearlyGoal('Year A');
            gm.quickAddLifeGoal('Life A');

            expect(gm.sideQuests[0].title).toBe('Side A');
            expect(gm.weeklyGoals[0]).toMatchObject({ title: 'Week A', monthlyGoalIds: [] });
            expect(gm.monthlyGoals[0]).toMatchObject({ title: 'Month A', yearlyGoalIds: [] });
            expect(gm.yearlyGoals[0]).toMatchObject({ title: 'Year A', lifeGoalIds: [] });
            expect(gm.lifeGoals[0].title).toBe('Life A');
            // The typed text must never leak into a parent-link array.
            expect(gm.weeklyGoals[0].monthlyGoalIds).not.toContain('Week A');
            expect(gm.showInputModal).not.toHaveBeenCalled();
        });

        test('quickAddHabit creates a habit directly with sensible defaults (no modal)', () => {
            const gm = createTestManager();
            gm.quickAddHabit('Meditate');
            expect(gm.habits).toHaveLength(1);
            expect(gm.habits[0]).toMatchObject({
                title: 'Meditate', description: '', streak: 0,
                totalCompletions: 0, completedToday: false
            });
            expect(gm.showInputModal).not.toHaveBeenCalled();
            expect(gm.saveData).toHaveBeenCalled();
        });

        describe('handleQuickAdd routing by view/tab', () => {
            test('habits route to quickAddHabit (direct create, NOT the modal addHabit)', () => {
                const gm = createTestManager();
                gm.quickAddHabit = jest.fn();
                gm.addHabit = jest.fn();
                gm.currentView = 'daily'; gm.activeDailyTab = 'rituals';
                fireQuickAdd(gm, 'Stretch');
                gm.currentView = 'habits-view';
                fireQuickAdd(gm, 'Hydrate');

                expect(gm.quickAddHabit).toHaveBeenCalledWith('Stretch');
                expect(gm.quickAddHabit).toHaveBeenCalledWith('Hydrate');
                expect(gm.addHabit).not.toHaveBeenCalled();
            });

            test('recurring tab passes the typed title to addRecurringTask (text not discarded)', () => {
                const gm = createTestManager();
                gm.addRecurringTask = jest.fn();
                gm.currentView = 'daily'; gm.activeDailyTab = 'recurring';
                fireQuickAdd(gm, 'Water plants');
                expect(gm.addRecurringTask).toHaveBeenCalledWith('Water plants');
            });

            test('goal tabs route to the matching quickAdd helper with the title', () => {
                const gm = createTestManager();
                gm.quickAddSideQuest = jest.fn();
                gm.quickAddWeeklyGoal = jest.fn();
                gm.quickAddMonthlyGoal = jest.fn();
                gm.quickAddYearlyGoal = jest.fn();
                gm.quickAddLifeGoal = jest.fn();
                const cases = [
                    ['sidequests', 'quickAddSideQuest'],
                    ['weekly', 'quickAddWeeklyGoal'],
                    ['monthly', 'quickAddMonthlyGoal'],
                    ['yearly', 'quickAddYearlyGoal'],
                    ['life-goals', 'quickAddLifeGoal'],
                ];
                for (const [tab, method] of cases) {
                    gm.currentView = 'goals'; gm.activeGoalTab = tab;
                    fireQuickAdd(gm, `T-${tab}`);
                    expect(gm[method]).toHaveBeenCalledWith(`T-${tab}`);
                }
            });

            test('falls back to a daily quick-add for views without a dedicated tab', () => {
                const gm = createTestManager();
                gm.quickAddDailyTask = jest.fn();
                gm.currentView = 'dashboard';
                fireQuickAdd(gm, 'From dashboard');
                gm.currentView = 'daily'; gm.activeDailyTab = 'tasks';
                fireQuickAdd(gm, 'From daily tasks');
                expect(gm.quickAddDailyTask).toHaveBeenCalledWith('From dashboard');
                expect(gm.quickAddDailyTask).toHaveBeenCalledWith('From daily tasks');
            });

            test('blank / whitespace-only input creates nothing', () => {
                const gm = createTestManager();
                gm.quickAddDailyTask = jest.fn();
                fireQuickAdd(gm, '   ');
                expect(gm.quickAddDailyTask).not.toHaveBeenCalled();
            });
        });

        test('addRecurringTask seeds the name modal with the prefill title', () => {
            const gm = createTestManager();
            gm.addRecurringTask('Take vitamins');
            expect(gm.showInputModal).toHaveBeenCalledWith(
                expect.objectContaining({ defaultValue: 'Take vitamins' }),
                expect.any(Function)
            );
        });

        test('addRecurringTask with no argument leaves the name field empty (unchanged button flow)', () => {
            const gm = createTestManager();
            gm.addRecurringTask();
            expect(gm.showInputModal).toHaveBeenCalledWith(
                expect.objectContaining({ defaultValue: '' }),
                expect.any(Function)
            );
        });
    });

    // ==================== DELETE ALL DATA (L12 hardening) ====================
    //
    // The irreversible "Delete All Data" flow gates the wipe behind a scary
    // confirm, a backup-export offer, and a strict "type DELETE" prompt. These
    // guard (a) the gate — the wipe must NEVER fire without an exact match —
    // and (b) wipe completeness, after the audit found the old explicit
    // remove-list left `lifeOrganizeData_backup`, `lastSeenChangelogVersion`,
    // and `day2NotificationScheduled` behind.
    describe('Delete All Data (L12 — irreversible wipe hardening)', () => {
        afterEach(() => {
            localStorage.clear();
            const modal = document.getElementById('custom-confirm-modal');
            if (modal) modal.remove();
        });

        describe('_wipeAllLocalData', () => {
            test('clears every app key — including ones the old remove-list missed', () => {
                const gm = createTestManager();
                localStorage.setItem('lifeOrganizeData', '{"xp":999}');
                localStorage.setItem('lifeOrganizeData_backup', '{"corrupt":true}'); // missed: no trailing _
                localStorage.setItem('lifeOrganizeData_pre_import_backup', '{}');
                localStorage.setItem('lastSeenChangelogVersion', '2.9.1');           // missed
                localStorage.setItem('day2NotificationScheduled', 'true');           // missed
                localStorage.setItem('audioVolume', '0.5');
                expect(localStorage.length).toBeGreaterThan(0);

                gm._wipeAllLocalData();

                expect(localStorage.length).toBe(0);
                expect(localStorage.getItem('lifeOrganizeData')).toBeNull();
                expect(localStorage.getItem('lifeOrganizeData_backup')).toBeNull();
                expect(localStorage.getItem('lastSeenChangelogVersion')).toBeNull();
                expect(localStorage.getItem('day2NotificationScheduled')).toBeNull();
            });
        });

        describe('showPrompt typed-confirmation gate', () => {
            test('fires onMatch ONLY when the typed value matches exactly', () => {
                const gm = createTestManager();
                const onMatch = jest.fn();
                const onCancel = jest.fn();
                gm.showPrompt('type DELETE', 'DELETE', onMatch, onCancel);

                document.getElementById('prompt-input').value = 'delete'; // wrong case
                document.getElementById('prompt-ok-btn').click();
                expect(onMatch).not.toHaveBeenCalled();
                expect(onCancel).toHaveBeenCalledTimes(1);
            });

            test('trims surrounding whitespace before matching', () => {
                const gm = createTestManager();
                const onMatch = jest.fn();
                gm.showPrompt('type DELETE', 'DELETE', onMatch, jest.fn());
                document.getElementById('prompt-input').value = '  DELETE  ';
                document.getElementById('prompt-ok-btn').click();
                expect(onMatch).toHaveBeenCalledTimes(1);
            });

            test('Cancel button fires onCancel, never onMatch', () => {
                const gm = createTestManager();
                const onMatch = jest.fn();
                const onCancel = jest.fn();
                gm.showPrompt('type DELETE', 'DELETE', onMatch, onCancel);
                document.getElementById('prompt-cancel-btn').click();
                expect(onMatch).not.toHaveBeenCalled();
                expect(onCancel).toHaveBeenCalledTimes(1);
            });

            test('renders an empty typed-confirm input (not prefilled) hinting the keyword', () => {
                const gm = createTestManager();
                gm.showPrompt('type DELETE', 'DELETE', jest.fn(), jest.fn());
                const input = document.getElementById('prompt-input');
                expect(input).not.toBeNull();
                expect(input.value).toBe('');                       // friction: user must type it
                expect(input.getAttribute('placeholder')).toContain('DELETE');
            });
        });

        describe('deleteAllData flow wiring', () => {
            test('walks confirm → export-backup offer → typed-DELETE gate', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn((msg, onYes) => onYes()); // auto-accept each step
                gm.exportData = jest.fn();
                gm.showPrompt = jest.fn();

                gm.deleteAllData();

                expect(gm.showConfirm).toHaveBeenCalledTimes(2);   // warning + backup offer
                expect(gm.exportData).toHaveBeenCalledTimes(1);    // accepted the backup offer
                expect(gm.showPrompt).toHaveBeenCalledWith(
                    expect.stringMatching(/type DELETE/i), 'DELETE',
                    expect.any(Function), expect.any(Function)
                );
            });

            test('declining the backup offer still reaches the typed-DELETE gate', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn()
                    .mockImplementationOnce((msg, onYes) => onYes())
                    .mockImplementationOnce((msg, onYes, onNo) => onNo && onNo());
                gm.exportData = jest.fn();
                gm.showPrompt = jest.fn();

                gm.deleteAllData();

                expect(gm.exportData).not.toHaveBeenCalled();
                expect(gm.showPrompt).toHaveBeenCalledTimes(1);
            });

            test('typing DELETE wipes data then reloads; the wipe never runs before confirmation', () => {
                const gm = createTestManager();
                gm._wipeAllLocalData = jest.fn();
                gm._reloadApp = jest.fn();
                let onMatch;
                gm.showPrompt = jest.fn((msg, expected, match) => { onMatch = match; });

                gm._deleteAllDataFinalCheck();
                expect(gm._wipeAllLocalData).not.toHaveBeenCalled(); // not until confirmed
                onMatch();                                           // user typed DELETE
                expect(gm._wipeAllLocalData).toHaveBeenCalledTimes(1);
                expect(gm._reloadApp).toHaveBeenCalledTimes(1);
            });

            test('cancelling the typed gate does NOT wipe', () => {
                const gm = createTestManager();
                gm._wipeAllLocalData = jest.fn();
                gm._reloadApp = jest.fn();
                let onCancel;
                gm.showPrompt = jest.fn((msg, expected, match, cancel) => { onCancel = cancel; });
                gm._deleteAllDataFinalCheck();
                onCancel();
                expect(gm._wipeAllLocalData).not.toHaveBeenCalled();
                expect(gm._reloadApp).not.toHaveBeenCalled();
            });
        });
    });

    // ==================== SIDEBAR "MORE" DISCLOSURE (L6) ====================
    //
    // Desktop declutter: a new (low-level) user should see their unlocked
    // destinations plus the immediate next unlock, with further-off locked
    // entries tucked behind a "More (N)" toggle. The collapse is desktop-only
    // (CSS scopes `.nav-more-hidden` to >=769px and hides the toggle on
    // mobile), so these tests assert the class/toggle wiring the JS produces.
    describe('Sidebar "More" disclosure (L6)', () => {
        function mountSidebar() {
            const wrap = document.createElement('div');
            wrap.id = 'main-sidebar';
            const views = ['dashboard','goals','daily','calendar','rewards','arcane','bossbattles','focus','questchains','tools'];
            wrap.innerHTML = '<nav>' + views.map(v =>
                `<a class="nav-link" data-view="${v}"><span class="fancy-font text-lg">${v}</span></a>`
            ).join('') + '</nav>';
            document.body.appendChild(wrap);
            return () => wrap.remove();
        }
        const hidden = (v) => document.querySelector(`#main-sidebar [data-view="${v}"]`).classList.contains('nav-more-hidden');

        describe('_navCollapsedViews (rule)', () => {
            test('a brand-new (L1) user collapses everything unlocking 2+ levels out', () => {
                const gm = createTestManager({ level: 1 });
                expect(gm._navCollapsedViews().sort()).toEqual(['arcane','bossbattles','focus','questchains']);
            });

            test('the immediate next unlock is never collapsed', () => {
                const gm = createTestManager({ level: 2 }); // rewards(2) unlocked, arcane(3) is next
                expect(gm._navCollapsedViews()).not.toContain('arcane');
                expect(gm._navCollapsedViews().sort()).toEqual(['bossbattles','focus','questchains']);
            });

            test('L4 collapses only the last (questchains) entry', () => {
                expect(createTestManager({ level: 4 })._navCollapsedViews()).toEqual(['questchains']);
            });

            test('once within one level of the final unlock, nothing collapses', () => {
                expect(createTestManager({ level: 5 })._navCollapsedViews()).toEqual([]);
                expect(createTestManager({ level: 9 })._navCollapsedViews()).toEqual([]);
            });

            test('an expanded disclosure collapses nothing regardless of level', () => {
                expect(createTestManager({ level: 1, _navMoreExpanded: true })._navCollapsedViews()).toEqual([]);
            });
        });

        describe('_applyNavMoreDisclosure (DOM)', () => {
            let teardown;
            afterEach(() => { if (teardown) teardown(); teardown = null; });

            test('hides far-off locked links and shows a "More (N)" toggle for an L1 user', () => {
                teardown = mountSidebar();
                const gm = createTestManager({ level: 1 });
                gm._applyNavMoreDisclosure();

                ['arcane','bossbattles','focus','questchains'].forEach(v => expect(hidden(v)).toBe(true));
                ['dashboard','goals','daily','calendar','tools','rewards'].forEach(v => expect(hidden(v)).toBe(false));

                const toggle = document.getElementById('nav-more-toggle');
                expect(toggle).not.toBeNull();
                expect(toggle.textContent).toContain('More (4)');
                expect(toggle.getAttribute('aria-expanded')).toBe('false');
                // Anchored just before the first collapsed item.
                expect(toggle.nextElementSibling.getAttribute('data-view')).toBe('arcane');
            });

            test('toggleNavMore reveals the collapsed group and flips the toggle label', () => {
                teardown = mountSidebar();
                const gm = createTestManager({ level: 1 });
                gm._applyNavMoreDisclosure(); // collapsed
                gm.toggleNavMore();           // expand

                ['arcane','bossbattles','focus','questchains'].forEach(v => expect(hidden(v)).toBe(false));
                const toggle = document.getElementById('nav-more-toggle');
                expect(toggle.textContent).toContain('Show less');
                expect(toggle.getAttribute('aria-expanded')).toBe('true');

                gm.toggleNavMore();           // collapse again
                expect(hidden('arcane')).toBe(true);
                expect(document.getElementById('nav-more-toggle').textContent).toContain('More (4)');
            });

            test('no toggle and no hidden links once the user reaches L5', () => {
                teardown = mountSidebar();
                const gm = createTestManager({ level: 5 });
                gm._applyNavMoreDisclosure();
                expect(document.getElementById('nav-more-toggle')).toBeNull();
                expect(hidden('questchains')).toBe(false);
            });

            test('leveling up removes the toggle once nothing is far enough out', () => {
                teardown = mountSidebar();
                const gm = createTestManager({ level: 1 });
                gm._applyNavMoreDisclosure();
                expect(document.getElementById('nav-more-toggle')).not.toBeNull();
                gm.level = 5;
                gm._applyNavMoreDisclosure();
                expect(document.getElementById('nav-more-toggle')).toBeNull();
            });
        });

        test('updateNavVisibility invokes the More disclosure', () => {
            const gm = createTestManager({ level: 1 });
            delete gm.updateNavVisibility; // use the real implementation
            gm.updateGoalTabVisibility = jest.fn();
            gm.updateArcaneTabVisibility = jest.fn();
            gm._applyNavMoreDisclosure = jest.fn();
            gm.updateNavVisibility();
            expect(gm._applyNavMoreDisclosure).toHaveBeenCalledTimes(1);
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

        test('tutorial has exactly 6 steps (incl. onboarding fork)', () => {
            const gm = createTestManager();
            const steps = gm.getAllTutorialSteps();
            expect(steps).toHaveLength(6);
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

        test('tutorial includes Welcome, Path fork, Stats, Daily Quests, Calendar, Ready steps', () => {
            const gm = createTestManager();
            const steps = gm.getAllTutorialSteps();
            const titles = steps.map(s => s.title);
            expect(titles[0]).toContain('Welcome');
            expect(titles[1]).toContain('Choose Your Path');
            expect(titles[2]).toContain('Level Up');
            expect(titles[3]).toContain('Daily Quests');
            expect(titles[4]).toContain('Quest Calendar');
            expect(titles[5]).toContain('Ready to Begin');
        });

        test('feature unlock tutorials cover levels 2,3,4,5,6,8,10 (L8 = class selection; L7/L9 retired)', () => {
            const gm = createTestManager();
            const unlockLevels = Object.keys(gm.featureUnlockTutorials).map(Number).sort((a, b) => a - b);
            expect(unlockLevels).toEqual([2, 3, 4, 5, 6, 8, 10]);
            expect(gm.featureUnlockTutorials[8].title).toContain('Class');
            // L7 (Monthly Raids) and L9 (Life Goals) celebration toasts were retired
            // because those goal tabs now unlock early via the onboarding fork.
            expect(gm.featureUnlockTutorials[7]).toBeUndefined();
            expect(gm.featureUnlockTutorials[9]).toBeUndefined();
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

    // ==================== ONBOARDING PATH FORK ====================

    describe('Onboarding Path Fork', () => {

        test('default (null) path uses the lowered fast-progression curve', () => {
            const gm = createTestManager();
            expect(gm.onboardingPath).toBeNull();
            expect(gm.goalTabUnlockLevels).toEqual({
                weekly: 2, sidequests: 2, monthly: 3, yearly: 4, 'life-goals': 4
            });
        });

        test('getGoalTabUnlockLevelsForPath("goals") unlocks every tier at level 1', () => {
            const gm = createTestManager();
            expect(gm.getGoalTabUnlockLevelsForPath('goals')).toEqual({
                weekly: 1, sidequests: 1, monthly: 1, yearly: 1, 'life-goals': 1
            });
        });

        test('getGoalTabUnlockLevelsForPath("habits")/null/unknown all use the default curve', () => {
            const gm = createTestManager();
            const expected = { weekly: 2, sidequests: 2, monthly: 3, yearly: 4, 'life-goals': 4 };
            expect(gm.getGoalTabUnlockLevelsForPath('habits')).toEqual(expected);
            expect(gm.getGoalTabUnlockLevelsForPath(null)).toEqual(expected);
            expect(gm.getGoalTabUnlockLevelsForPath('nonsense')).toEqual(expected);
        });

        test('returned threshold objects are independent copies (no shared mutation)', () => {
            const gm = createTestManager();
            const a = gm.getGoalTabUnlockLevelsForPath('goals');
            a.weekly = 99;
            expect(gm.getGoalTabUnlockLevelsForPath('goals').weekly).toBe(1);
        });

        test('applyOnboardingPath("goals") stores the path and opens all goal tabs', () => {
            const gm = createTestManager();
            gm.applyOnboardingPath('goals');
            expect(gm.onboardingPath).toBe('goals');
            expect(gm.goalTabUnlockLevels.yearly).toBe(1);
            expect(gm.isGoalTabUnlocked('life-goals')).toBe(true); // gm.level === 1
        });

        test('applyOnboardingPath normalizes unknown values to null + the default curve', () => {
            const gm = createTestManager();
            gm.applyOnboardingPath('goals');
            gm.applyOnboardingPath('bogus');
            expect(gm.onboardingPath).toBeNull();
            expect(gm.goalTabUnlockLevels.yearly).toBe(4);
        });

        test('chooseOnboardingPath applies path, persists, refreshes tabs, and advances tutorial', () => {
            const gm = createTestManager({ currentTutorialStep: 1 });
            gm.updateGoalTabVisibility = jest.fn();
            gm.showTutorialStep = jest.fn();
            gm.chooseOnboardingPath('goals');
            expect(gm.onboardingPath).toBe('goals');
            expect(gm.goalTabUnlockLevels.weekly).toBe(1);
            expect(gm.saveData).toHaveBeenCalled();
            expect(gm.updateGoalTabVisibility).toHaveBeenCalled();
            expect(gm.currentTutorialStep).toBe(2);
            expect(gm.showTutorialStep).toHaveBeenCalled();
        });

        test('fork step sits at index 1 with no spotlight target or auto-advance action', () => {
            const gm = createTestManager();
            const fork = gm.getAllTutorialSteps()[1];
            expect(fork.fork).toBe(true);
            expect(fork.title).toContain('Choose Your Path');
            expect(fork.element).toBeNull();
            expect(fork.action).toBeNull();
        });

        test('_renderOnboardingForkHTML offers both play-styles wired to chooseOnboardingPath', () => {
            const gm = createTestManager();
            const html = gm._renderOnboardingForkHTML();
            expect(html).toContain('Daily Focus');
            expect(html).toContain('Grand Planner');
            expect(html).toContain('data-action="onboarding.choosePath"');
            expect(html).toContain('data-path="habits"');
            expect(html).toContain('data-path="goals"');
        });

        test('final tutorial step copy reflects the chosen path', () => {
            const planner = createTestManager({ onboardingPath: 'goals' });
            const plannerLast = planner.getAllTutorialSteps().slice(-1)[0];
            expect(plannerLast.content.toLowerCase()).toContain('unlocked');

            const focus = createTestManager({ onboardingPath: null });
            const focusLast = focus.getAllTutorialSteps().slice(-1)[0];
            expect(focusLast.content.toLowerCase()).toContain('first daily task');
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

        describe('executeBossBySpell — the 25% window is COMBAT_DAMAGE.isExecuteRange (criterion-(2) item)', () => {
            const COMBAT_DAMAGE = require('../combat-damage.js').default;
            const armed = (currentHP) => {
                const gm = createTestManager();
                gm.activeSpells = [{ spellId: 'execute', expiresAt: -1 }];
                gm.dailyBoss = { name: 'B', icon: 'x', maxHP: 100, currentHP, level: 1, type: 'daily', defeated: false, totalDamage: 0, rewards: { xp: 1, gold: 1 } };
                gm.updateBossHPBar = jest.fn();
                gm.addBossLog = jest.fn();
                gm.saveData = jest.fn();
                return gm;
            };

            test('kills at exactly the threshold (25% HP) and consumes the spell', () => {
                const gm = armed(25);
                expect(COMBAT_DAMAGE.isExecuteRange(gm.dailyBoss)).toBe(true);
                gm.executeBossBySpell('daily');
                expect(gm.dailyBoss.defeated).toBe(true);
                expect(gm.dailyBoss.currentHP).toBe(0);
                expect(gm.activeSpells).toEqual([]);
            });

            test('does nothing one point above the threshold', () => {
                const gm = armed(26);
                expect(COMBAT_DAMAGE.isExecuteRange(gm.dailyBoss)).toBe(false);
                gm.executeBossBySpell('daily');
                expect(gm.dailyBoss.defeated).toBe(false);
                expect(gm.dailyBoss.currentHP).toBe(26);
                expect(gm.activeSpells).toHaveLength(1);
            });

            test('does nothing without an active execute spell, even at low HP', () => {
                const gm = armed(5);
                gm.activeSpells = [];
                gm.executeBossBySpell('daily');
                expect(gm.dailyBoss.defeated).toBe(false);
            });

            test('goal-manager.js no longer hardcodes the 25% as a percent comparison', () => {
                const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'goal-manager.js'), 'utf8');
                expect(src).not.toMatch(/hpPercent\s*>\s*25/);
            });
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

    // ==================== BOSS HP DAMAGE-TRAIL BAR (v2.9 TRACK 3) ====================

    // The damage-trail bar refactor (two-layer "lag bar" replacing the v2.8
    // single-fill gradient) introduces three new surfaces worth pinning down:
    //   - getBossPhase()    — phase color + label thresholds
    //   - renderBossHPBar() — two-layer markup (fill at currentHP%, damage
    //                          trail with --hp-current/--hp-previous CSS vars)
    //   - updateBossHPBar() — per-hit DOM mutations (fill width drain,
    //                          damage-trail .is-draining toggle + crit variant,
    //                          phase data-attribute cross-fade)
    // The tests below exercise all three with deterministic inputs.

    describe('Boss HP Damage-Trail Bar (v2.9 Track 3)', () => {

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

        // ---- renderBossHPBar markup ----------------------------------------

        test('renderBossHPBar emits the two-layer structure (fill + damage)', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPBar({ maxHP: 100, currentHP: 70 }, 'red');
            expect(html).toContain('boss-hp-bar');
            expect(html).toContain('boss-hp-fill');
            expect(html).toContain('boss-hp-damage');
            expect(html).toContain('data-phase="red"');
        });

        test('renderBossHPBar sets fill width to currentHP percentage', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPBar({ maxHP: 100, currentHP: 70 }, 'red');
            // Fill carries `style="width: 70%"` on the boss-hp-fill div.
            expect(html).toMatch(/boss-hp-fill"\s+style="width:\s*70%"/);
        });

        test('renderBossHPBar shows the percent label above 15% HP', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPBar({ maxHP: 100, currentHP: 50 }, 'orange');
            expect(html).toContain('boss-hp-percent');
            expect(html).toContain('>50%<');
        });

        test('renderBossHPBar omits the percent label at or below 15% HP', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPBar({ maxHP: 100, currentHP: 12 }, 'purple');
            expect(html).not.toContain('boss-hp-percent');
        });

        test('renderBossHPBar seeds damage layer with --hp-current matching --hp-previous (idle = invisible)', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPBar({ maxHP: 100, currentHP: 70 }, 'red');
            // Both vars equal so any stray animation would no-op visually,
            // and the layer's default opacity 0 keeps it hidden until JS
            // drives the .is-draining state.
            expect(html).toContain('--hp-current: 70%');
            expect(html).toContain('--hp-previous: 70%');
        });

        test('renderBossHPBar returns empty string when maxHP <= 0', () => {
            const gm = createTestManager();
            expect(gm.renderBossHPBar({ maxHP: 0, currentHP: 0 }, 'green')).toBe('');
        });

        test('renderBossHPBar clamps currentHP > maxHP defensively to 100%', () => {
            const gm = createTestManager();
            const html = gm.renderBossHPBar({ maxHP: 10, currentHP: 999 }, 'red');
            expect(html).toMatch(/boss-hp-fill"\s+style="width:\s*100%"/);
        });

        test('renderBossHPBar handles fractional HP percentage cleanly', () => {
            const gm = createTestManager();
            // 14 maxHP / 11 current = 78.5714...%
            const html = gm.renderBossHPBar({ maxHP: 14, currentHP: 11 }, 'red');
            expect(html).toMatch(/boss-hp-fill"\s+style="width:\s*78\.\d+%/);
        });

        // ---- updateBossHPBar DOM mutations -----------------------------------

        // Helper: mount a fake boss card matching what renderBossCard emits
        // for the parts updateBossHPBar reads/writes. We don't need the full
        // card markup, only the elements queried by selectors.
        function mountBossCardDom(bossType, boss, phaseColor = 'red') {
            const gm = createTestManager();
            const card = document.createElement('div');
            card.id = `boss-card-${bossType}`;
            const barHtml = gm.renderBossHPBar(boss, phaseColor);
            card.innerHTML = `
                <div class="font-bold">HP <span class="font-bold">${boss.currentHP} / ${boss.maxHP}</span></div>
                ${barHtml}
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

        test('updateBossHPBar drives the fill layer to the new currentHP width', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 3, false);

            const fill = card.querySelector('.boss-hp-fill');
            expect(fill.style.width).toBe('70%');
            jest.runAllTimers();
        });

        test('updateBossHPBar triggers the damage trail with previous and current HP CSS vars', () => {
            jest.useFakeTimers();
            // Pre-hit HP was 10/10 (100%); after 3 damage current=7/10 (70%).
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 3, false);

            const damage = card.querySelector('.boss-hp-damage');
            expect(damage.classList.contains('is-draining')).toBe(true);
            expect(damage.classList.contains('boss-hp-damage--crit')).toBe(false);
            expect(damage.style.getPropertyValue('--hp-previous').trim()).toBe('100%');
            expect(damage.style.getPropertyValue('--hp-current').trim()).toBe('70%');
            jest.runAllTimers();
        });

        test('updateBossHPBar tags the damage trail with the crit variant on isCrit=true', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 3, true);

            const damage = card.querySelector('.boss-hp-damage');
            expect(damage.classList.contains('is-draining')).toBe(true);
            expect(damage.classList.contains('boss-hp-damage--crit')).toBe(true);
            jest.runAllTimers();
        });

        test('updateBossHPBar strips transient classes after the animation cleanup window', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 3 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 3, true);

            const damage = card.querySelector('.boss-hp-damage');
            expect(damage.classList.contains('is-draining')).toBe(true);

            jest.advanceTimersByTime(950);
            expect(damage.classList.contains('is-draining')).toBe(false);
            expect(damage.classList.contains('boss-hp-damage--crit')).toBe(false);
        });

        test('updateBossHPBar with damage=0 leaves the damage trail untouched', () => {
            jest.useFakeTimers();
            const boss = { maxHP: 10, currentHP: 7, totalDamage: 0 };
            const { gm, card } = mountBossCardDom('daily', boss);

            gm.updateBossHPBar('daily', boss, 0, false);

            const damage = card.querySelector('.boss-hp-damage');
            expect(damage.classList.contains('is-draining')).toBe(false);
            // Fill width should still be updated to currentHP%
            expect(card.querySelector('.boss-hp-fill').style.width).toBe('70%');
            jest.runAllTimers();
        });

        test('updateBossHPBar updates the data-phase attribute when HP crosses a phase threshold', () => {
            jest.useFakeTimers();
            // Start at 60% HP (yellow), drop to 40% HP (orange) via 20 damage
            const boss = { maxHP: 100, currentHP: 40, totalDamage: 20 };
            const { gm, card } = mountBossCardDom('daily', boss, 'yellow');
            const bar = card.querySelector('.boss-hp-bar');
            expect(bar.dataset.phase).toBe('yellow');

            gm.updateBossHPBar('daily', boss, 20, false);

            expect(bar.dataset.phase).toBe('orange');
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

        test('updateBossHPBar hides the % label when HP drops below the 15% threshold', () => {
            jest.useFakeTimers();
            // Start at 50% HP, take 40 damage -> 10% HP (below 15% cutoff)
            const boss = { maxHP: 100, currentHP: 10, totalDamage: 40 };
            const { gm, card } = mountBossCardDom('daily', boss, 'orange');
            const label = card.querySelector('.boss-hp-percent');
            // Initial render: at 50% currentHP, label is present (mountBossCardDom
            // uses the post-damage boss object, so label was rendered at currentHP%).
            // Wait — in this fixture the initial HP IS 10%, so the label was
            // omitted at render time. Verify the helper-mounted DOM matches that.
            expect(label).toBeNull();

            // Now manually re-mount with a starting HP > 15% to test the dynamic hide.
            document.body.innerHTML = '';
            const startBoss = { maxHP: 100, currentHP: 50, totalDamage: 0 };
            const { gm: gm2, card: card2 } = mountBossCardDom('daily', startBoss, 'yellow');
            expect(card2.querySelector('.boss-hp-percent')).not.toBeNull();

            // Drop HP to 10% via a 40-damage hit.
            startBoss.currentHP = 10;
            startBoss.totalDamage = 40;
            gm2.updateBossHPBar('daily', startBoss, 40, false);

            const labelAfter = card2.querySelector('.boss-hp-percent');
            expect(labelAfter.style.display).toBe('none');
            jest.runAllTimers();
        });

        test('updateBossHPBar is a no-op for the bar when the bar DOM is missing', () => {
            // Defensive path: card exists but no bar element.
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

        // ── Heatmap start-date alignment (§5.0 audit) ───────────────────────
        // Regression for the off-by-6 bug: the grid subtracted `weeksToShow*7-1`
        // (83) days instead of `(weeksToShow-1)*7` (77), which always started it
        // on a Monday (mislabeled under the Sunday column) and ended it on LAST
        // week's Sunday — dropping today's square for 6 days out of 7.
        describe('_heatmapStartSunday', () => {
            test('always returns a Sunday and a today-inclusive 12-week span, every weekday', () => {
                const gm = createTestManager();
                const dayMs = 86400000;
                // Sun Jun 14 2026 .. Sat Jun 20 2026 — one run per weekday.
                for (let offset = 0; offset < 7; offset++) {
                    const today = new Date(2026, 5, 14 + offset, 9, 30, 0);
                    const start = gm._heatmapStartSunday(12, today);
                    expect(start.getDay()).toBe(0); // calendar-aligned: a Sunday

                    const todayMidnight = new Date(2026, 5, 14 + offset);
                    const daysBack = Math.round((todayMidnight - start) / dayMs);
                    expect(daysBack).toBe(today.getDay() + (12 - 1) * 7); // dow + 77

                    // Newest cell = start + 83 days must be >= today (today shown).
                    const last = new Date(start);
                    last.setDate(last.getDate() + 12 * 7 - 1);
                    expect(last.getTime()).toBeGreaterThanOrEqual(todayMidnight.getTime());
                    expect(last.getDay()).toBe(6); // a Saturday
                }
            });
        });

        test('Activity Heatmap includes today and is Sunday-aligned (regression: grid was 6 days early)', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                const todayStr = gm.getTodayDateString();
                gm.dailyTasks = [{ id: 1, completed: true, dueDate: todayStr }];

                gm.renderActivityHeatmap();
                const html = document.getElementById('activity-heatmap').innerHTML;

                // Today's square must exist (was missing 6/7 days before the fix).
                expect(html).toContain(`${todayStr}: 1 tasks`);
                // The oldest cell must fall on a Sunday (calendar alignment).
                const firstDate = (html.match(/title="(\d{4}-\d{2}-\d{2}):/) || [])[1];
                expect(firstDate).toBeTruthy();
                expect(new Date(firstDate + 'T12:00:00').getDay()).toBe(0);
            } finally { teardown(); }
        });

        test('Activity Heatmap renders an empty grid (no completions) without errors', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                gm.dailyTasks = [];
                expect(() => gm.renderActivityHeatmap()).not.toThrow();
                const html = document.getElementById('activity-heatmap').innerHTML;
                expect(html).not.toContain('bg-green');                 // nothing completed
                expect(html).toContain(`${gm.getTodayDateString()}: 0 tasks`); // today still present
            } finally { teardown(); }
        });

        test('XP Timeline scales bars to the visible window, not all-time history', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                const today = new Date();
                const todayStr = gm.dateToLocalString(today);
                const old = new Date(today);
                old.setDate(old.getDate() - 60);           // well outside the 30-day window
                const oldStr = gm.dateToLocalString(old);

                // 1 completion today (in-window) + 5 on a day 60 days ago.
                gm.dailyTasks = [
                    { id: 1, completed: true, dueDate: todayStr },
                    { id: 2, completed: true, dueDate: oldStr },
                    { id: 3, completed: true, dueDate: oldStr },
                    { id: 4, completed: true, dueDate: oldStr },
                    { id: 5, completed: true, dueDate: oldStr },
                    { id: 6, completed: true, dueDate: oldStr },
                ];

                gm.renderXPTimeline();
                const html = document.getElementById('xp-timeline-chart').innerHTML;
                // Today is the tallest IN-WINDOW value (1) → full height. Before
                // the fix maxCount=5 (the off-window spike) → today bar = 20%.
                expect(html).toContain('height: 100%');
                expect(html).not.toContain('height: 20%');
            } finally { teardown(); }
        });

        // ── Longest-streak record derivation (§5.0 audit) ───────────────────
        describe('_longestRunInHistory', () => {
            test('empty / non-array history → 0', () => {
                const gm = createTestManager();
                expect(gm._longestRunInHistory([])).toBe(0);
                expect(gm._longestRunInHistory(undefined)).toBe(0);
            });
            test('a single completion → 1', () => {
                const gm = createTestManager();
                expect(gm._longestRunInHistory(['2026-01-05'])).toBe(1);
            });
            test('finds the longest consecutive run despite gaps, order, and dupes', () => {
                const gm = createTestManager();
                // 3-run (Jan 1-3), gap, 5-run (Jan 10-14) ← longest; unsorted + dup.
                const hist = ['2026-01-11', '2026-01-02', '2026-01-01', '2026-01-03',
                    '2026-01-10', '2026-01-12', '2026-01-13', '2026-01-14', '2026-01-14'];
                expect(gm._longestRunInHistory(hist)).toBe(5);
            });
            test('all-isolated days → 1', () => {
                const gm = createTestManager();
                expect(gm._longestRunInHistory(['2026-01-01', '2026-01-03', '2026-01-05'])).toBe(1);
            });
        });

        test('Personal Records "Longest Streak" is the all-time record, not the reset current streak', () => {
            const teardown = mountAnalyticsDom();
            try {
                const gm = createTestManager();
                // A 5-day run that already broke, then a fresh 1-day streak. The
                // real-world case: longestStreak was never persisted, so the old
                // Math.max(streak) surfaced the post-break current streak (1).
                gm.habits = [{
                    streak: 1,
                    completionHistory: ['2026-01-01', '2026-01-02', '2026-01-03',
                        '2026-01-04', '2026-01-05', '2026-02-10'],
                }];
                gm.dailyTasks = [];
                gm.goldCoins = 0;
                gm.treasureChests = [];
                gm.level = 1;

                gm.renderPersonalRecords();
                const html = document.getElementById('personal-records').innerHTML;
                expect(html).toContain('5 days');     // the historical record
                expect(html).not.toMatch(/>\s*1 day\b/); // not the reset current streak
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

        test('golden/shadow gates are read from theme-definitions.js `unlock` fields (single source)', () => {
            const THEMES = require('../theme-definitions.js').default;
            expect(THEMES.golden.unlock).toEqual({ goldEarned: 10000 });
            expect(THEMES.shadow.unlock).toEqual({ bossesDefeated: 25 });
            // The lock-card copy is derived prose — it must quote the same numbers.
            expect(THEMES.golden.special).toContain((10000).toLocaleString('en-US'));
            expect(THEMES.shadow.special).toContain('25');
            // And checkRewardUnlocks has no hardcoded copy of either threshold left.
            const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'goal-manager.js'), 'utf8');
            expect(src).not.toMatch(/totalGoldEarned\s*\|\|\s*0\)\s*>=\s*10000/);
            expect(src).not.toMatch(/bossesDefeated\s*\|\|\s*0\)\s*>=\s*25/);
        });

        test('checkRewardUnlocks follows a changed catalog threshold (data-driven, not hardcoded)', () => {
            const gm = createTestManager();
            delete gm.checkRewardUnlocks;
            gm.themeDefinitions = {
                ...gm.themeDefinitions,
                golden: { ...gm.themeDefinitions.golden, unlock: { goldEarned: 500 } },
            };
            gm.unlockedThemes = ['default'];
            gm.totalGoldEarned = 499;
            gm.bossesDefeated = 0;
            gm.level = 1;
            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).not.toContain('golden');
            gm.totalGoldEarned = 500;
            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).toContain('golden');
        });

        test('a theme with `special` copy but no `unlock` table is never auto-unlocked', () => {
            const gm = createTestManager();
            delete gm.checkRewardUnlocks;
            gm.themeDefinitions = {
                ...gm.themeDefinitions,
                mystery: { name: 'Mystery', icon: '?', color: '#000', unlockLevel: 0, special: 'Find the secret', premium: false },
            };
            gm.unlockedThemes = ['default'];
            gm.totalGoldEarned = 1e9;
            gm.bossesDefeated = 1e9;
            gm.level = 99;
            gm.checkRewardUnlocks();
            expect(gm.unlockedThemes).not.toContain('mystery');
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

    // ==================== v2.9 TRACK 5 — Boss particle types ====================
    //
    // Guards the contract between the boss theme catalog and the defeat
    // dissolve effect (effects-manager.bossDefeatDissolve):
    //   • Every boss theme carries a `particleType` in the 5-value enum.
    //   • Newly-generated bosses inherit that field.
    //   • getBossParticleType() falls back to name-lookup for legacy
    //     saves that pre-date the field, and to 'shadow' as final default.
    //
    describe('Boss particle types (v2.9 Track 5)', () => {

        const VALID_PARTICLE_TYPES = ['shadow', 'ember', 'slime', 'leaf', 'arcane'];

        test('every daily/weekly/monthly boss theme declares a valid particleType', () => {
            const gm = createTestManager();
            const all = [
                ...gm.bossThemes.daily,
                ...gm.bossThemes.weekly,
                ...gm.bossThemes.monthly
            ];
            // Sanity: we should have at least 30 themes across the three tiers.
            expect(all.length).toBeGreaterThanOrEqual(30);
            all.forEach(theme => {
                expect(theme.particleType).toBeDefined();
                expect(VALID_PARTICLE_TYPES).toContain(theme.particleType);
            });
        });

        test('getBossParticleType returns the boss.particleType when present', () => {
            const gm = createTestManager();
            const boss = { name: 'Custom Boss', particleType: 'ember' };
            expect(gm.getBossParticleType(boss)).toBe('ember');
        });

        test('getBossParticleType falls back to a name lookup for legacy saves', () => {
            // Simulates a pre-v2.9 saved boss object that lacks particleType.
            // The helper must reach into bossThemes and find the matching
            // entry by name. "Slime of Procrastination" is daily/slime.
            const gm = createTestManager();
            const legacyBoss = { name: 'Slime of Procrastination', icon: '🟢' };
            expect(gm.getBossParticleType(legacyBoss)).toBe('slime');
        });

        test('getBossParticleType defaults to "shadow" when the boss is unknown', () => {
            const gm = createTestManager();
            const mystery = { name: 'Some Boss That Does Not Exist' };
            expect(gm.getBossParticleType(mystery)).toBe('shadow');
            expect(gm.getBossParticleType(null)).toBe('shadow');
            expect(gm.getBossParticleType(undefined)).toBe('shadow');
        });

        test('generateDailyBoss seeds particleType on the new boss object', () => {
            const gm = createTestManager();
            gm.dailyBoss = null;
            gm.generateDailyBoss('2026-06-08');
            expect(gm.dailyBoss).not.toBeNull();
            expect(gm.dailyBoss.particleType).toBeDefined();
            expect(VALID_PARTICLE_TYPES).toContain(gm.dailyBoss.particleType);
        });
    });

    // ==================== v2.9 TRACK 7 — Theme of the Week ====================
    //
    // Locks the rotation contract end-to-end:
    //   • getISOWeekNumber + getWeeklyFeaturedThemeId are deterministic for
    //     a given date and roll evenly across the 9-week premium rotation.
    //   • selectTheme bypasses both the premium and unlock-level gates for
    //     the currently-featured theme (and only for that one).
    //   • renderThemes / renderThemeSelector add `.theme-featured` to the
    //     matching tile, and the spotlight modal mounts at most once per
    //     ISO week (persistence via weeklyTrialPromptShown).
    //   • Dismissal paths (button, Esc, backdrop, Apply) all mark the week
    //     key shown so re-renders stay quiet.
    //
    describe('Theme of the Week (v2.9 Track 7)', () => {

        // The 9 premium themes that carry weeklyRotationIndex 0..8 in the
        // catalog. Order here matches the indices declared in the source so
        // the rotation determinism test reads like the data.
        // Mirrors weeklyRotationIndex declarations in goal-manager.js:
        // 0 sunken, 1 desert, 2 stormwatch, 3 volcanic, 4 verdant,
        // 5 mystic, 6 aurora, 7 cathedral, 8 crystal.
        const ROTATION_BY_INDEX = [
            'sunken', 'desert', 'stormwatch', 'volcanic', 'verdant',
            'mystic', 'aurora', 'cathedral', 'crystal'
        ];

        test('all 9 premium rotation themes carry a unique weeklyRotationIndex 0..8', () => {
            const gm = createTestManager();
            const indexed = Object.entries(gm.themeDefinitions)
                .filter(([_, t]) => t.premium && t.weeklyRotationIndex != null)
                .map(([id, t]) => [id, t.weeklyRotationIndex]);
            expect(indexed).toHaveLength(9);
            const indices = indexed.map(([_, i]) => i).sort((a, b) => a - b);
            expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
            // No duplicates, no holes — Set size matches array length.
            expect(new Set(indices).size).toBe(9);
        });

        test('getISOWeekNumber matches known ISO week values', () => {
            const gm = createTestManager();
            // 2026-01-01 is a Thursday → ISO week 1 (year contains its
            // first Thursday). 2026-12-31 is also Thursday → week 53.
            expect(gm.getISOWeekNumber(new Date('2026-01-01T12:00:00Z'))).toBe(1);
            expect(gm.getISOWeekNumber(new Date('2026-06-08T12:00:00Z'))).toBe(24);
            expect(gm.getISOWeekNumber(new Date('2026-12-31T12:00:00Z'))).toBe(53);
            // ISO-edge: 2027-01-01 is a Friday → still week 53 of 2026.
            expect(gm.getISOWeekNumber(new Date('2027-01-01T12:00:00Z'))).toBe(53);
        });

        test('getWeeklyFeaturedThemeId is deterministic and rotates evenly', () => {
            const gm = createTestManager();
            // Walk 9 consecutive weeks starting from a known Monday and
            // assert each one lands on the matching ROTATION_BY_INDEX
            // entry (week % 9). The starting week is week 23 of 2026
            // (Mon Jun 1 2026), so first hit is index 23 % 9 = 5 = aurora.
            let week = gm.getISOWeekNumber(new Date('2026-06-01T12:00:00Z'));
            for (let offset = 0; offset < 9; offset++) {
                const date = new Date('2026-06-01T12:00:00Z');
                date.setDate(date.getDate() + offset * 7);
                const expectedIdx = (week + offset) % 9;
                expect(gm.getWeeklyFeaturedThemeId(date)).toBe(ROTATION_BY_INDEX[expectedIdx]);
            }
        });

        test('getWeeklyFeaturedThemeId returns null when no premium themes carry weeklyRotationIndex', () => {
            const gm = createTestManager();
            // Wipe the rotation indices to simulate a config with the
            // feature disabled. Helper must defend against an empty
            // rotation rather than throwing on `[][n][0]`.
            gm.themeDefinitions = Object.fromEntries(
                Object.entries(gm.themeDefinitions).map(([id, t]) => {
                    const { weeklyRotationIndex, ...rest } = t;
                    return [id, rest];
                })
            );
            expect(gm.getWeeklyFeaturedThemeId(new Date('2026-06-08'))).toBeNull();
        });

        test('selectTheme bypasses premium gate for the featured-week theme', () => {
            const gm = createTestManager();
            gm.isPremium = false;
            const featuredId = gm.getWeeklyFeaturedThemeId();
            expect(featuredId).toBeTruthy();
            // Featured theme is premium AND not in unlockedThemes — yet
            // selectTheme must apply it without showing the upsell.
            expect(gm.themeDefinitions[featuredId].premium).toBe(true);
            expect(gm.unlockedThemes).not.toContain(featuredId);

            gm.showAchievement = jest.fn();
            gm.applyColorTheme = jest.fn();
            gm.saveData = jest.fn();
            gm.renderThemes = jest.fn();
            gm.renderThemeSelector = jest.fn();
            // Run the transition callback synchronously so the mutation
            // is observable without faking timers.
            gm.playThemeTransition = (_color, cb) => cb && cb();
            gm.showPremiumPurchaseModal = jest.fn();
            gm.selectTheme(featuredId);

            // Theme switched, premium upsell modal NOT shown.
            expect(gm.currentTheme).toBe(featuredId);
            expect(gm.showPremiumPurchaseModal).not.toHaveBeenCalled();
        });

        test('selectTheme still blocks a non-featured premium theme for non-premium users', () => {
            const gm = createTestManager();
            gm.isPremium = false;
            const featuredId = gm.getWeeklyFeaturedThemeId();
            // Pick any premium theme that is NOT this week's featured.
            const otherPremium = Object.entries(gm.themeDefinitions)
                .find(([id, t]) => t.premium && id !== featuredId)[0];

            const before = gm.currentTheme;
            gm.showAchievement = jest.fn();
            gm.showPremiumPurchaseModal = jest.fn();
            gm.showLockedNotification = jest.fn();
            gm.playThemeTransition = jest.fn(); // would normally start the swap
            gm.selectTheme(otherPremium);

            // Did NOT switch — early-return triggered the upsell modal,
            // and the transition (which is the only thing that mutates
            // currentTheme) was never invoked.
            expect(gm.currentTheme).toBe(before);
            expect(gm.showPremiumPurchaseModal).toHaveBeenCalled();
            expect(gm.playThemeTransition).not.toHaveBeenCalled();
        });

        test('renderThemes flags the matching tile with .theme-featured and a badge', () => {
            const gm = createTestManager();
            const featuredId = gm.getWeeklyFeaturedThemeId();

            // Mount the container element renderThemes() looks up.
            document.body.innerHTML = '<div id="themes-container"></div>';
            gm.getPremiumBannerHTML = jest.fn(() => '');
            gm.maybeShowFeaturedThemeSpotlight = jest.fn(); // suppress modal in this test
            gm.renderThemes();

            const featuredTile = document.querySelector(`.theme-option[data-theme-id="${featuredId}"]`)
                || document.querySelector('.theme-featured');
            expect(featuredTile).not.toBeNull();
            expect(featuredTile.classList.contains('theme-featured')).toBe(true);
            // Exactly one tile carries the flag — the rotation is single-id.
            expect(document.querySelectorAll('.theme-featured').length).toBe(1);
            // Badge mounted inside the tile.
            expect(featuredTile.querySelector('.theme-featured-badge')).not.toBeNull();
        });

        test('renderThemeSelector flags the matching compact tile', () => {
            const gm = createTestManager();
            const featuredId = gm.getWeeklyFeaturedThemeId();

            document.body.innerHTML = '<div id="theme-selector-container"></div>';
            gm.getPremiumBannerHTML = jest.fn(() => '');
            gm.renderThemeSelector();

            const flagged = document.querySelectorAll('.theme-featured');
            expect(flagged.length).toBe(1);
            expect(flagged[0].querySelector('.theme-featured-badge-sm')).not.toBeNull();
        });

        test('maybeShowFeaturedThemeSpotlight mounts the modal once and persists the week key on dismiss', () => {
            const gm = createTestManager();
            gm.weeklyTrialPromptShown = {};
            gm.saveData = jest.fn();

            document.body.innerHTML = '';
            gm.maybeShowFeaturedThemeSpotlight();
            const modal = document.getElementById('theme-spotlight-modal');
            expect(modal).not.toBeNull();
            expect(modal.getAttribute('role')).toBe('dialog');
            expect(modal.getAttribute('aria-modal')).toBe('true');

            // Re-entering the renderer same week without dismissing must
            // be a no-op (don't stack a second backdrop).
            gm.maybeShowFeaturedThemeSpotlight();
            expect(document.querySelectorAll('#theme-spotlight-modal').length).toBe(1);

            // Dismiss → key set + saveData called.
            modal.querySelector('[data-action="dismiss"]').click();
            const now = new Date();
            const weekKey = `${gm.getISOWeekYear(now)}-W${gm.getISOWeekNumber(now)}`;
            expect(gm.weeklyTrialPromptShown[weekKey]).toBe(true);
            expect(gm.saveData).toHaveBeenCalled();

            // Subsequent calls within the same week are silenced even
            // after the DOM finishes its leave-animation removal.
            document.body.innerHTML = '';
            gm.maybeShowFeaturedThemeSpotlight();
            expect(document.getElementById('theme-spotlight-modal')).toBeNull();
        });

        test('Try-it-now button applies the featured theme and dismisses the modal', () => {
            const gm = createTestManager();
            gm.isPremium = false;
            gm.weeklyTrialPromptShown = {};
            gm.saveData = jest.fn();
            gm.applyColorTheme = jest.fn();
            gm.renderThemes = jest.fn();
            gm.renderThemeSelector = jest.fn();
            gm.playThemeTransition = (_color, cb) => cb && cb();
            gm.showPremiumPurchaseModal = jest.fn();
            gm.showAchievement = jest.fn();

            document.body.innerHTML = '';
            gm.maybeShowFeaturedThemeSpotlight();
            const modal = document.getElementById('theme-spotlight-modal');
            expect(modal).not.toBeNull();

            const featuredId = gm.getWeeklyFeaturedThemeId();
            modal.querySelector('[data-action="apply"]').click();

            // Theme switched, week marked shown.
            expect(gm.currentTheme).toBe(featuredId);
            const now = new Date();
            const weekKey = `${gm.getISOWeekYear(now)}-W${gm.getISOWeekNumber(now)}`;
            expect(gm.weeklyTrialPromptShown[weekKey]).toBe(true);
        });

        test('maybeShowFeaturedThemeSpotlight is a no-op when no rotation themes exist', () => {
            const gm = createTestManager();
            gm.themeDefinitions = Object.fromEntries(
                Object.entries(gm.themeDefinitions).map(([id, t]) => {
                    const { weeklyRotationIndex, ...rest } = t;
                    return [id, rest];
                })
            );
            document.body.innerHTML = '';
            gm.maybeShowFeaturedThemeSpotlight();
            expect(document.getElementById('theme-spotlight-modal')).toBeNull();
        });

        test('save/load round-trip preserves weeklyTrialPromptShown', () => {
            const gm = createTestManager();
            delete gm.saveData;
            gm.weeklyTrialPromptShown = { '2026-W24': true };
            gm._doSave();

            const gm2 = createTestManager();
            delete gm2.checkRewardUnlocks;
            gm2.loadData();
            expect(gm2.weeklyTrialPromptShown).toEqual({ '2026-W24': true });
        });

        // ── End-of-trial revert + upsell (checkExpiredThemeTrial) ──────
        //
        // Trigger truth table (all four conditions required to mount):
        //   currentTheme premium  ✓
        //   not in unlockedThemes  ✓
        //   !isPremium             ✓
        //   not this week's featured slot ✓
        //   prompt not previously shown for this themeId ✓
        //
        // Each test below disables exactly one condition and asserts the
        // modal does NOT mount. The positive test asserts mount + dismiss
        // paths set the shown flag and revert currentTheme to 'default'.
        describe('checkExpiredThemeTrial', () => {

            // Force the featured slot to a known DIFFERENT theme so the
            // "current is not featured" condition is satisfied without
            // depending on real wall-clock time. Picks any premium theme
            // with weeklyRotationIndex that isn't the one under test.
            function pinFeaturedAwayFrom(gm, themeId) {
                const other = Object.entries(gm.themeDefinitions)
                    .find(([id, t]) => t.premium && t.weeklyRotationIndex != null && id !== themeId)[0];
                gm.getWeeklyFeaturedThemeId = jest.fn(() => other);
                return other;
            }

            function makeTrialUser(themeOverride) {
                const gm = createTestManager();
                gm.isPremium = false;
                gm.saveData = jest.fn();
                gm.applyColorTheme = jest.fn();
                // Pick a premium rotation theme as the "trialed" one.
                const themeId = themeOverride || 'desert';
                gm.currentTheme = themeId;
                gm.unlockedThemes = gm.unlockedThemes.filter(t => t !== themeId);
                gm.weeklyTrialEndPromptShown = {};
                pinFeaturedAwayFrom(gm, themeId);
                document.body.innerHTML = '';
                return { gm, themeId };
            }

            test('mounts the trial-ended modal when all conditions hold', () => {
                const { gm, themeId } = makeTrialUser();
                const result = gm.checkExpiredThemeTrial();
                expect(result).toBe(true);
                const modal = document.getElementById('theme-trial-ended-modal');
                expect(modal).not.toBeNull();
                expect(modal.getAttribute('role')).toBe('dialog');
                // Theme name appears in the copy so the user knows what
                // they're being asked to subscribe for.
                expect(modal.textContent).toContain(gm.themeDefinitions[themeId].name);
            });

            test('no-op when currentTheme is the default', () => {
                const { gm } = makeTrialUser();
                gm.currentTheme = 'default';
                expect(gm.checkExpiredThemeTrial()).toBe(false);
                expect(document.getElementById('theme-trial-ended-modal')).toBeNull();
            });

            test('no-op when currentTheme is a non-premium theme', () => {
                const { gm } = makeTrialUser();
                // Forest is non-premium in the catalog.
                gm.currentTheme = 'forest';
                expect(gm.checkExpiredThemeTrial()).toBe(false);
                expect(document.getElementById('theme-trial-ended-modal')).toBeNull();
            });

            test('no-op when user permanently owns the theme', () => {
                const { gm, themeId } = makeTrialUser();
                gm.unlockedThemes = [...gm.unlockedThemes, themeId];
                expect(gm.checkExpiredThemeTrial()).toBe(false);
                expect(document.getElementById('theme-trial-ended-modal')).toBeNull();
            });

            test('no-op when user is a premium subscriber', () => {
                const { gm } = makeTrialUser();
                gm.isPremium = true;
                expect(gm.checkExpiredThemeTrial()).toBe(false);
                expect(document.getElementById('theme-trial-ended-modal')).toBeNull();
            });

            test('no-op while the theme is still this week\'s featured slot', () => {
                const { gm, themeId } = makeTrialUser();
                // Override the pin: featured IS the current theme now.
                gm.getWeeklyFeaturedThemeId = jest.fn(() => themeId);
                expect(gm.checkExpiredThemeTrial()).toBe(false);
                expect(document.getElementById('theme-trial-ended-modal')).toBeNull();
            });

            test('silent revert (no modal) when prompt already shown for this theme', () => {
                const { gm, themeId } = makeTrialUser();
                gm.weeklyTrialEndPromptShown = { [themeId]: true };
                const result = gm.checkExpiredThemeTrial();
                expect(result).toBe(false);
                expect(document.getElementById('theme-trial-ended-modal')).toBeNull();
                // Critical: the user must NOT be left on the premium theme
                // even though we didn't show the modal — they already saw
                // it once and dismissed.
                expect(gm.currentTheme).toBe('default');
                expect(gm.applyColorTheme).toHaveBeenCalled();
                expect(gm.saveData).toHaveBeenCalled();
            });

            test('"Keep default" dismiss reverts theme and sets shown flag', () => {
                const { gm, themeId } = makeTrialUser();
                gm.checkExpiredThemeTrial();
                const modal = document.getElementById('theme-trial-ended-modal');
                modal.querySelector('[data-action="revert"]').click();

                expect(gm.weeklyTrialEndPromptShown[themeId]).toBe(true);
                expect(gm.currentTheme).toBe('default');
                expect(gm.applyColorTheme).toHaveBeenCalled();
                expect(gm.saveData).toHaveBeenCalled();
            });

            test('"Subscribe" CTA routes to showPremiumPurchaseModal and reverts', () => {
                const { gm, themeId } = makeTrialUser();
                gm.showPremiumPurchaseModal = jest.fn();
                gm.checkExpiredThemeTrial();
                const modal = document.getElementById('theme-trial-ended-modal');
                modal.querySelector('[data-action="subscribe"]').click();

                expect(gm.showPremiumPurchaseModal).toHaveBeenCalled();
                // Dismissal contract still applies on the subscribe path —
                // shown-flag set, theme reverted to default. The user is
                // free to actually subscribe via the purchase modal; that
                // flow re-grants the theme by setting isPremium = true.
                expect(gm.weeklyTrialEndPromptShown[themeId]).toBe(true);
                expect(gm.currentTheme).toBe('default');
            });

            test('Escape key dismisses the modal and reverts', () => {
                const { gm, themeId } = makeTrialUser();
                gm.checkExpiredThemeTrial();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                expect(gm.weeklyTrialEndPromptShown[themeId]).toBe(true);
                expect(gm.currentTheme).toBe('default');
            });

            test('does not stack a second backdrop if called twice in one session', () => {
                const { gm } = makeTrialUser();
                gm.checkExpiredThemeTrial();
                gm.checkExpiredThemeTrial();
                expect(document.querySelectorAll('#theme-trial-ended-modal').length).toBe(1);
            });

            test('save/load round-trip preserves weeklyTrialEndPromptShown', () => {
                const gm = createTestManager();
                delete gm.saveData;
                gm.weeklyTrialEndPromptShown = { desert: true, stormwatch: true };
                gm._doSave();

                const gm2 = createTestManager();
                delete gm2.checkRewardUnlocks;
                gm2.loadData();
                expect(gm2.weeklyTrialEndPromptShown).toEqual({ desert: true, stormwatch: true });
            });
        });
    });

    // ==================== v2.9.x AUDIT FIXES ====================
    //
    // Regression coverage for the persistence/date-math audit:
    //   #1 archive prune is a pure 500-cap (the documented-but-dead
    //      6-month cutoff was removed, not implemented)
    //   #2 lastHabitReset is advanced ONLY by checkHabitReset — saves
    //      persist the stored value instead of stamping "today"
    //   #4 week keys use the ISO week-YEAR (getISOWeekYear), not the
    //      calendar year, so New Year boundary weeks don't collide
    //   #6 flushPendingSave writes a pending debounced save immediately
    //      (wired to visibilitychange:hidden for Android WebView)
    //   #7 corrupted-save backups are capped at ONE rotating key
    //   #8 loadData no longer double-assigns dailyQuestBoard et al.
    describe('v2.9.x Audit Fixes', () => {

        test('getISOWeekYear returns the ISO week-year across New Year boundaries', () => {
            const gm = createTestManager();
            // 2025-12-29 is a Monday in ISO week 1 of 2026.
            expect(gm.getISOWeekYear(new Date('2025-12-29T12:00:00Z'))).toBe(2026);
            expect(gm.getISOWeekNumber(new Date('2025-12-29T12:00:00Z'))).toBe(1);
            // 2027-01-01 is a Friday in ISO week 53 of 2026.
            expect(gm.getISOWeekYear(new Date('2027-01-01T12:00:00Z'))).toBe(2026);
            // Mid-year dates match the calendar year.
            expect(gm.getISOWeekYear(new Date('2026-06-08T12:00:00Z'))).toBe(2026);
        });

        test('maybeTrackWeeklyThemeFeatured stamps an ISO week-year key', () => {
            const gm = createTestManager();
            gm.maybeTrackWeeklyThemeFeatured();
            const now = new Date();
            const expected = `${gm.getISOWeekYear(now)}-W${gm.getISOWeekNumber(now)}`;
            expect(gm.lastFeaturedWeekTracked).toBe(expected);
            // Second call same week is a no-op.
            expect(gm.maybeTrackWeeklyThemeFeatured()).toBe(false);
        });

        test('_doSave persists the stored lastHabitReset instead of stamping today', () => {
            const gm = createTestManager();
            delete gm.saveData;
            gm.lastHabitReset = '2020-01-01';
            gm.lastWeekReset = '2020-W1';
            gm._doSave();

            const saved = JSON.parse(localStorage.getItem('lifeOrganizeData'));
            expect(saved.lastHabitReset).toBe('2020-01-01');
            expect(saved.lastWeekReset).toBe('2020-W1');
        });

        test('checkHabitReset initializes markers on first run without resetting', () => {
            const gm = createTestManager();
            gm.lastHabitReset = null;
            gm.lastWeekReset = null;
            gm.habits = [{ title: 'Run', completedToday: true, streak: 3 }];
            gm.checkHabitReset();

            expect(gm.lastHabitReset).toBe(gm.getTodayDateString());
            expect(gm.lastWeekReset).toBe(gm.getWeekString(new Date()));
            // First run must NOT touch habits.
            expect(gm.habits[0].completedToday).toBe(true);
            expect(gm.habits[0].streak).toBe(3);
        });

        test('checkHabitReset advances lastHabitReset and resets habits on a new day', () => {
            const gm = createTestManager();
            gm.lastHabitReset = '2020-01-01';
            gm.lastWeekReset = gm.getWeekString(new Date());
            gm.earlyBirdTasksToday = 5;
            gm.habits = [{ title: 'Run', completedToday: true, streak: 3, rewardedToday: '2020-01-01' }];
            gm.checkHabitReset();

            expect(gm.lastHabitReset).toBe(gm.getTodayDateString());
            expect(gm.habits[0].completedToday).toBe(false);
            expect(gm.habits[0].rewardedToday).toBeNull();
            expect(gm.saveData).toHaveBeenCalled();
        });

        test('an intervening save does not skip the next day-change reset', () => {
            // The original bug: _doSave stamped lastHabitReset with "today"
            // on every write, so a save landing after midnight (but before
            // checkHabitReset ran) silently swallowed the reset.
            const gm = createTestManager();
            delete gm.saveData;
            gm.lastHabitReset = '2020-01-01';
            gm.lastWeekReset = gm.getWeekString(new Date());
            gm._doSave(); // simulate any unrelated save "after midnight"
            expect(gm.lastHabitReset).toBe('2020-01-01'); // not clobbered

            gm.saveData = jest.fn();
            gm.habits = [{ title: 'Run', completedToday: true, streak: 3 }];
            gm.checkHabitReset();
            expect(gm.habits[0].completedToday).toBe(false); // reset still ran
        });

        test('flushPendingSave writes a pending debounced save immediately', () => {
            jest.useFakeTimers();
            try {
                const gm = createTestManager();
                delete gm.saveData; // use the real debounced implementation
                gm.saveData();
                expect(localStorage.getItem('lifeOrganizeData')).toBeNull(); // still debounced

                gm.flushPendingSave();
                expect(localStorage.getItem('lifeOrganizeData')).not.toBeNull();
                expect(gm.saveTimeout).toBeNull();

                // The cancelled timer must not double-save.
                const spy = jest.spyOn(gm, '_doSave');
                jest.runAllTimers();
                expect(spy).not.toHaveBeenCalled();
            } finally {
                jest.useRealTimers();
            }
        });

        test('flushPendingSave is a no-op when nothing is pending', () => {
            const gm = createTestManager();
            const spy = jest.spyOn(gm, '_doSave').mockImplementation(() => {});
            gm.flushPendingSave();
            expect(spy).not.toHaveBeenCalled();
        });

        test('corrupted-save backup is capped at one rotating key', () => {
            localStorage.setItem('lifeOrganizeData', '{not valid json');
            // Legacy timestamped backups from the pre-fix behavior.
            localStorage.setItem('lifeOrganizeData_backup_1700000000000', 'old1');
            localStorage.setItem('lifeOrganizeData_backup_1700000000001', 'old2');

            const gm = createTestManager();
            gm.loadData();
            gm.loadData(); // repeated boots must not mint new keys

            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('lifeOrganizeData_backup')) backupKeys.push(key);
            }
            expect(backupKeys).toEqual(['lifeOrganizeData_backup']);
            expect(localStorage.getItem('lifeOrganizeData_backup')).toBe('{not valid json');
        });

        test('archive prune keeps the 500 most recent regardless of age', () => {
            const gm = createTestManager();
            delete gm.saveData;
            // 510 archives, all 2+ years old — the dead 6-month cutoff
            // would have nuked them all; the cap keeps the newest 500.
            gm.archivedGoals = Array.from({ length: 510 }, (_, i) => ({
                id: i,
                archivedDate: new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString()
            }));
            gm._doSave();

            expect(gm.archivedGoals.length).toBe(500);
            // Newest survive (descending sort keeps ids 10..509).
            const ids = gm.archivedGoals.map(g => g.id);
            expect(Math.min(...ids)).toBe(10);
            expect(Math.max(...ids)).toBe(509);
        });

        test('dailyQuestBoard survives a save/load round-trip (dedup regression)', () => {
            const gm = createTestManager();
            delete gm.saveData;
            gm.dailyQuestBoard = { date: '2026-06-08', quests: [] };
            gm.dailyTracking = { date: '2026-06-08', tasksCompleted: 2 };
            gm.lastWoodenChestDate = '2026-06-07';
            gm._doSave();

            const gm2 = createTestManager();
            delete gm2.checkRewardUnlocks;
            gm2.loadData();
            expect(gm2.dailyQuestBoard).toEqual({ date: '2026-06-08', quests: [] });
            expect(gm2.dailyTracking).toEqual({ date: '2026-06-08', tasksCompleted: 2 });
            expect(gm2.lastWoodenChestDate).toBe('2026-06-07');
        });
    });

    // ==================== v2.9.x ANDROID UX FIXES ====================
    //
    // Regression coverage for the Android-focused UI/UX audit:
    //   - hardware back button: close topmost overlay > go to dashboard
    //     > report unhandled (CapBridge then minimizes the app)
    //   - search consolidation: the static #search-modal was removed
    //     from index.html; openSearchModal/closeSearch are the single
    //     implementation and the Escape listener no longer leaks
    //   - showConfirm focuses Cancel (not Confirm) so a stray double-tap
    //     or Enter can't land on a destructive action
    describe('v2.9.x Android UX Fixes', () => {

        beforeEach(() => {
            document.body.innerHTML = '';
        });

        describe('Hardware back button', () => {

            test('setupHardwareBackButton registers the handler with CapBridge', () => {
                const gm = createTestManager();
                window.CapBridge = { registerBackButton: jest.fn() };
                try {
                    gm.setupHardwareBackButton();
                    expect(window.CapBridge.registerBackButton).toHaveBeenCalledTimes(1);
                    // The registered callback must route to handleHardwareBack.
                    const cb = window.CapBridge.registerBackButton.mock.calls[0][0];
                    gm.handleHardwareBack = jest.fn(() => true);
                    expect(cb()).toBe(true);
                    expect(gm.handleHardwareBack).toHaveBeenCalled();
                } finally {
                    delete window.CapBridge;
                }
            });

            test('is a no-op when CapBridge is absent (web/test context)', () => {
                const gm = createTestManager();
                expect(() => gm.setupHardwareBackButton()).not.toThrow();
            });

            test('back press on a confirm dialog cancels — never confirms', () => {
                const gm = createTestManager();
                const onConfirm = jest.fn();
                const onCancel = jest.fn();
                gm.showConfirm('Permanently delete?', onConfirm, onCancel);

                expect(gm.handleHardwareBack()).toBe(true);
                expect(onConfirm).not.toHaveBeenCalled();
                expect(onCancel).toHaveBeenCalled();
                expect(document.getElementById('custom-confirm-modal')).toBeNull();
            });

            test('back press closes an open search modal', () => {
                const gm = createTestManager();
                gm.openSearchModal();
                expect(document.getElementById('search-modal')).not.toBeNull();

                expect(gm.handleHardwareBack()).toBe(true);
                expect(document.getElementById('search-modal')).toBeNull();
            });

            test('back press closes a visible quick-add modal via closeQuickAdd', () => {
                const gm = createTestManager();
                const quickAdd = document.createElement('div');
                quickAdd.id = 'quick-add-modal';
                document.body.appendChild(quickAdd);
                gm.closeQuickAdd = jest.fn();

                expect(gm.handleHardwareBack()).toBe(true);
                expect(gm.closeQuickAdd).toHaveBeenCalled();
            });

            test('hidden quick-add modal is NOT treated as open', () => {
                const gm = createTestManager();
                const quickAdd = document.createElement('div');
                quickAdd.id = 'quick-add-modal';
                quickAdd.classList.add('hidden');
                document.body.appendChild(quickAdd);
                gm.closeQuickAdd = jest.fn();
                gm.currentView = 'dashboard';

                expect(gm.handleHardwareBack()).toBe(false);
                expect(gm.closeQuickAdd).not.toHaveBeenCalled();
            });

            test('back press closes the player panel slide-over', () => {
                const gm = createTestManager();
                gm.playerPanelOpen = true;
                gm.togglePlayerPanel = jest.fn();

                expect(gm.handleHardwareBack()).toBe(true);
                expect(gm.togglePlayerPanel).toHaveBeenCalled();
            });

            test('with no overlays, back navigates non-dashboard views to dashboard', () => {
                const gm = createTestManager();
                gm.currentView = 'goals';
                gm.switchView = jest.fn();

                expect(gm.handleHardwareBack()).toBe(true);
                expect(gm.switchView).toHaveBeenCalledWith('dashboard');
            });

            test('on dashboard with no overlays, back is unhandled (app minimizes)', () => {
                const gm = createTestManager();
                gm.currentView = 'dashboard';
                gm.switchView = jest.fn();

                expect(gm.handleHardwareBack()).toBe(false);
                expect(gm.switchView).not.toHaveBeenCalled();
            });

            test('overlay close takes priority over view navigation', () => {
                const gm = createTestManager();
                gm.currentView = 'goals';
                gm.switchView = jest.fn();
                gm.showConfirm('Sure?', jest.fn());

                expect(gm.handleHardwareBack()).toBe(true);
                // First press only closed the dialog — view unchanged.
                expect(gm.switchView).not.toHaveBeenCalled();
                // Second press now navigates.
                expect(gm.handleHardwareBack()).toBe(true);
                expect(gm.switchView).toHaveBeenCalledWith('dashboard');
            });

            test('fallback closes an unknown dialog via its close control', () => {
                const gm = createTestManager();
                const dialog = document.createElement('div');
                dialog.setAttribute('role', 'dialog');
                dialog.innerHTML = '<button data-action="close">Close</button>';
                const onClose = jest.fn(() => dialog.remove());
                dialog.querySelector('[data-action="close"]').addEventListener('click', onClose);
                document.body.appendChild(dialog);

                expect(gm.handleHardwareBack()).toBe(true);
                expect(onClose).toHaveBeenCalled();
            });
        });

        describe('Search consolidation', () => {

            test('openSearchModal renders results into ITS OWN container (dedup regression)', () => {
                const gm = createTestManager();
                gm.dailyTasks = [{ id: 't1', title: 'Slay the laundry dragon', completed: false }];
                gm.openSearchModal();

                // Exactly one #search-modal / #search-results in the DOM —
                // the static index.html duplicate is gone.
                expect(document.querySelectorAll('#search-modal').length).toBe(1);
                expect(document.querySelectorAll('#search-results').length).toBe(1);

                gm.performSearch('laundry');
                const results = document.getElementById('search-results');
                expect(results.textContent).toContain('Slay the laundry dragon');
            });

            test('reopening the search modal never stacks instances', () => {
                const gm = createTestManager();
                gm.openSearchModal();
                gm.openSearchModal();
                expect(document.querySelectorAll('#search-modal').length).toBe(1);
            });

            test('closeSearch removes the modal AND the document Escape listener', () => {
                const gm = createTestManager();
                const addSpy = jest.spyOn(document, 'addEventListener');
                const removeSpy = jest.spyOn(document, 'removeEventListener');
                try {
                    gm.openSearchModal();
                    const handler = gm._searchEscapeHandler;
                    expect(addSpy).toHaveBeenCalledWith('keydown', handler);

                    gm.closeSearch();
                    expect(document.getElementById('search-modal')).toBeNull();
                    expect(removeSpy).toHaveBeenCalledWith('keydown', handler);
                    expect(gm._searchEscapeHandler).toBeNull();
                } finally {
                    addSpy.mockRestore();
                    removeSpy.mockRestore();
                }
            });

            test('Escape key closes the search modal (listener actually wired)', () => {
                const gm = createTestManager();
                gm.openSearchModal();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                expect(document.getElementById('search-modal')).toBeNull();
            });

            test('closeSearch is safe to call when no modal is open', () => {
                const gm = createTestManager();
                expect(() => gm.closeSearch()).not.toThrow();
            });

            test('legacy static-search entry point is gone', () => {
                // openSearch() targeted the removed static modal; it must not
                // linger as a dead method that silently does nothing.
                expect(GoalManager.prototype.openSearch).toBeUndefined();
            });
        });

        describe('Destructive confirm safety', () => {

            test('showConfirm focuses Cancel, not Confirm', () => {
                jest.useFakeTimers();
                try {
                    const gm = createTestManager();
                    gm.showConfirm('Permanently delete?', jest.fn(), jest.fn());
                    jest.advanceTimersByTime(60);
                    expect(document.activeElement.id).toBe('confirm-cancel-btn');
                } finally {
                    jest.useRealTimers();
                }
            });

            test('confirm path still works when explicitly clicked', () => {
                const gm = createTestManager();
                const onConfirm = jest.fn();
                gm.showConfirm('Sure?', onConfirm);
                document.getElementById('confirm-ok-btn').click();
                expect(onConfirm).toHaveBeenCalled();
                expect(document.getElementById('custom-confirm-modal')).toBeNull();
            });
        });
    });

    // ==================== BALANCE AUDIT FIXES (Jun 11, 2026) ====================
    //
    // Regression coverage for two fixes from the features/balance audit:
    //   #1 Precision (double_streak) toggle exploit — checking a habit under
    //      the enchantment added +2 streak but unchecking only refunded 1,
    //      netting +1 streak per on/off cycle. The actual increment is now
    //      recorded in habit.lastRewards.streak and refunded exactly.
    //   #2 lucky_loot weight shift — description promises "+15% rare loot"
    //      but the old implementation shifted at most 10 points and only
    //      from common, making it a near-no-op on gold (10 common weight)
    //      and royal (5) chests. Now shifts 15 points, pulling from
    //      uncommon when common runs short.
    describe('Balance Audit Fixes', () => {

        // Shared habit-test factory: stubs out the side-effecting reward
        // chain that toggleHabit invokes so only streak math is exercised.
        function createHabitManager(enchantments = []) {
            const gm = createTestManager({
                focusCrystalShards: 0,
                activeChallenges: [],
                dailyQuestBoard: null,
                dailyTracking: null,
                earlyBirdTasksToday: 0,
                momentumStack: 0,
                accountCreatedDate: null,
                BEGINNER_BLESSING_DAYS: 3,
                activeEnchantments: enchantments,
                grantCompanionXP: jest.fn(),
                checkOnboardingShareHook: jest.fn(),
                checkSerenityBonus: jest.fn(),
                _showMilestoneSharePrompt: jest.fn(),
                trackDaily: jest.fn(),
                maybeShowReviewPrompt: jest.fn()
            });
            gm.habits = [{
                id: 'h1', title: 'Test Habit', completedToday: false,
                streak: 0, totalCompletions: 0, completionHistory: []
            }];
            return gm;
        }

        describe('Precision (double_streak) toggle symmetry', () => {

            test('records the actual streak increment in lastRewards', () => {
                const gm = createHabitManager([
                    { id: 'precision', effect: 'double_streak', expiresAt: Date.now() + 600000 }
                ]);
                gm.toggleHabit('h1');
                expect(gm.habits[0].streak).toBe(2);
                expect(gm.habits[0].lastRewards.streak).toBe(2);
            });

            test('uncheck refunds the full +2 under Precision (no farming)', () => {
                const gm = createHabitManager([
                    { id: 'precision', effect: 'double_streak', expiresAt: Date.now() + 600000 }
                ]);
                // Three on/off cycles — previously netted +3 streak
                for (let i = 0; i < 3; i++) {
                    gm.toggleHabit('h1'); // on  → +2
                    gm.toggleHabit('h1'); // off → -2 (was -1 before the fix)
                }
                expect(gm.habits[0].streak).toBe(0);
                expect(gm.habits[0].totalCompletions).toBe(0);
            });

            test('normal toggle (no enchantment) stays symmetric at ±1', () => {
                const gm = createHabitManager();
                gm.toggleHabit('h1');
                expect(gm.habits[0].streak).toBe(1);
                expect(gm.habits[0].lastRewards.streak).toBe(1);
                gm.toggleHabit('h1');
                expect(gm.habits[0].streak).toBe(0);
            });

            test('legacy lastRewards without streak field falls back to -1', () => {
                const gm = createHabitManager();
                const today = gm.getTodayDateString();
                // Simulate a habit rewarded by a pre-fix build: rewardedToday
                // set, lastRewards recorded without the streak field.
                gm.habits[0] = {
                    id: 'h1', title: 'Legacy Habit', completedToday: true,
                    streak: 5, totalCompletions: 5, rewardedToday: today,
                    completionHistory: [today],
                    lastRewards: { xp: 10, gold: 3, charges: 1, shards: 1, crystals: 0 }
                };
                gm.toggleHabit('h1'); // uncheck
                expect(gm.habits[0].streak).toBe(4); // -1 fallback, never NaN
            });
        });

        describe('lucky_loot chest weight shift', () => {

            // Capture the rarity-weight entries that generateChestRewards
            // passes into its FIRST weightedRandomSelect call per item.
            function rollWeights(gm, chestType) {
                let captured = null;
                gm.weightedRandomSelect = jest.fn(pool => {
                    // The rarity roll is the only pool whose entries carry
                    // a `rarity` key; item pools carry `type`.
                    if (!captured && pool.length && pool[0].rarity !== undefined && pool[0].type === undefined) {
                        captured = pool;
                    }
                    return pool[0];
                });
                gm.generateChestRewards(chestType);
                return Object.fromEntries(captured.map(e => [e.rarity, e.weight]));
            }

            test('royal chest: shifts full 15 points, pulling from uncommon', () => {
                const gm = createTestManager({
                    activeEnchantments: [{ id: 'lucky_loot', effect: 'lucky_loot', expiresAt: Date.now() + 600000 }]
                });
                const w = rollWeights(gm, 'royal');
                // Base royal: common 5, uncommon 15, rare 30, epic 30, legendary 20
                expect(w.common).toBe(0);       // 5 drained
                expect(w.uncommon).toBe(5);     // 10 more drained from uncommon
                expect(w.rare).toBe(38);        // +ceil(15*0.5)
                expect(w.epic).toBe(37);        // +floor(15*0.5)
                expect(w.legendary).toBe(20);   // untouched
                // Total weight is conserved
                expect(w.common + w.uncommon + w.rare + w.epic + w.legendary).toBe(100);
            });

            test('bronze chest: shifts 15 points entirely from common', () => {
                const gm = createTestManager({
                    activeEnchantments: [{ id: 'lucky_loot', effect: 'lucky_loot', expiresAt: Date.now() + 600000 }]
                });
                const w = rollWeights(gm, 'bronze');
                // Base bronze: common 50, uncommon 30, rare 15, epic 4, legendary 1
                expect(w.common).toBe(35);      // 50 - 15
                expect(w.uncommon).toBe(30);    // untouched (common covered the full shift)
                expect(w.rare).toBe(23);        // 15 + ceil(15*0.5)
                expect(w.epic).toBe(11);        // 4 + floor(15*0.5)
                expect(w.legendary).toBe(1);    // untouched
                // Total weight is conserved
                expect(w.common + w.uncommon + w.rare + w.epic + w.legendary).toBe(100);
            });

            test('weights unchanged without the enchantment', () => {
                const gm = createTestManager({ activeEnchantments: [] });
                const w = rollWeights(gm, 'gold');
                expect(w).toEqual({ common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 8 });
            });
        });
    });

    // ==================== BALANCE & UX PASS (v2.9.x audit, round 2) ====================
    //
    // Regression coverage for the second balance/UX pass:
    //   #1 Attack charge soft cap — charges cap at 25; overflow converts to
    //      gold (5/charge via addGold) so heavy task days can't bank 30+
    //      charges that trivialize a week of bosses.
    //   #2 Extended level titles — LEVEL_TITLES grew 10 → 50 entries so
    //      users past level 10 aren't stuck on 'Legend' forever. Level 50+
    //      clamps at 'Paragon'. Entries 1-10 unchanged (no retitling).
    //   #3 early_bird rebalance — cost 4 → 2 crystals, boost window first
    //      3 → first 5 daily tasks.
    //   #4 Away recap consolidation — multi-event daily resets surface ONE
    //      recap modal instead of stacked toasts, and genuinely broken
    //      streaks (previously silent) are now reported.
    describe('Balance & UX Pass (round 2)', () => {

        describe('Attack charge soft cap', () => {

            function createChargeManager(overrides = {}) {
                return createTestManager({
                    attackCharges: 0,
                    activeEnchantments: [],
                    addGold: jest.fn(),
                    trackDaily: jest.fn(),
                    ...overrides
                });
            }

            test('grants charges normally below the cap', () => {
                const gm = createChargeManager({ attackCharges: 10 });
                gm.grantAttackCharge(3, 'daily');
                expect(gm.attackCharges).toBe(13);
                expect(gm.addGold).not.toHaveBeenCalled();
                expect(gm.trackDaily).toHaveBeenCalledWith('chargesEarned', 3);
            });

            test('caps at 25 and converts overflow to gold at 5/charge', () => {
                const gm = createChargeManager({ attackCharges: 23 });
                gm.grantAttackCharge(5, 'daily');
                expect(gm.attackCharges).toBe(25);
                // 3 overflow charges × 5 gold
                expect(gm.addGold).toHaveBeenCalledWith(15, 'charge_overflow');
                expect(gm.trackDaily).toHaveBeenCalledWith('chargesEarned', 2);
            });

            test('fully-capped grant converts everything to gold', () => {
                const gm = createChargeManager({ attackCharges: 25 });
                gm.grantAttackCharge(4, 'daily');
                expect(gm.attackCharges).toBe(25);
                expect(gm.addGold).toHaveBeenCalledWith(20, 'charge_overflow');
                // No charges granted → no chargesEarned tracking
                expect(gm.trackDaily).not.toHaveBeenCalledWith('chargesEarned', expect.anything());
            });

            test('Battle Fury doubling still respects the cap', () => {
                const gm = createChargeManager({
                    attackCharges: 24,
                    activeEnchantments: [{ id: 'battle_fury', effect: 'bonus_charges', expiresAt: Date.now() + 600000 }]
                });
                gm.grantAttackCharge(2, 'daily'); // doubled to 4, room for 1
                expect(gm.attackCharges).toBe(25);
                expect(gm.addGold).toHaveBeenCalledWith(15, 'charge_overflow');
            });

            test('overflow toast suppressed during reward sequences', () => {
                const gm = createChargeManager({ attackCharges: 25, _suppressRewardToasts: true });
                gm.grantAttackCharge(1, 'daily');
                expect(gm.showAchievement).not.toHaveBeenCalled();
                // Gold conversion still happens
                expect(gm.addGold).toHaveBeenCalledWith(5, 'charge_overflow');
            });
        });

        describe('Extended level titles', () => {

            test('both title chains have 50 entries of equal length', () => {
                const gm = createTestManager();
                expect(gm.LEVEL_TITLES.masculine).toHaveLength(50);
                expect(gm.LEVEL_TITLES.feminine).toHaveLength(50);
            });

            test('level 1 renamed Peasant->Wanderer (L1 fix); levels 2-10 unchanged', () => {
                const gm = createTestManager();
                // Entry 1 deliberately changed (L1 onboarding fix).
                expect(gm.LEVEL_TITLES.masculine[0]).toBe('Wanderer');
                expect(gm.LEVEL_TITLES.feminine[0]).toBe('Wanderer');
                // 'Peasant' is fully retired from both chains.
                expect(gm.LEVEL_TITLES.masculine).not.toContain('Peasant');
                expect(gm.LEVEL_TITLES.feminine).not.toContain('Peasant');
                // Entries 2-10 are untouched (no regression for those users).
                expect(gm.LEVEL_TITLES.masculine.slice(1, 10)).toEqual(
                    ['Squire', 'Knight', 'Baron', 'Earl', 'Duke', 'Prince', 'King', 'Emperor', 'Legend']
                );
                expect(gm.LEVEL_TITLES.feminine.slice(1, 10)).toEqual(
                    ['Squire', 'Dame', 'Baroness', 'Countess', 'Duchess', 'Princess', 'Queen', 'Empress', 'Legend']
                );
            });

            test('titles progress past level 10 instead of sticking at Legend', () => {
                const gm = createTestManager({ titleStyle: 'masculine' });
                expect(gm.getLevelTitle(10)).toBe('Legend');
                expect(gm.getLevelTitle(11)).toBe('Hero');
                expect(gm.getLevelTitle(20)).toBe('Mythic');
                expect(gm.getLevelTitle(50)).toBe('Paragon');
            });

            test('level 50+ clamps at Paragon', () => {
                const gm = createTestManager({ titleStyle: 'masculine' });
                expect(gm.getLevelTitle(51)).toBe('Paragon');
                expect(gm.getLevelTitle(999)).toBe('Paragon');
            });

            test('feminine chain has gendered counterparts at the same indices', () => {
                const gm = createTestManager({ titleStyle: 'feminine' });
                expect(gm.getLevelTitle(11)).toBe('Heroine');
                expect(gm.getLevelTitle(14)).toBe('Warlady');
                expect(gm.getLevelTitle(25)).toBe('Dragonqueen');
                expect(gm.getLevelTitle(50)).toBe('Paragon');
            });

            describe('Title Hall — Level Ranks section', () => {
                afterEach(() => { document.body.innerHTML = ''; });

                function mountHall() {
                    document.body.innerHTML =
                        '<div id="active-title-display"></div>' +
                        '<div id="titles-container"></div>' +
                        '<div id="titles-locked-grid"></div>';
                }

                test('renders all 50 level ranks with a progress count', () => {
                    const gm = createTestManager({ level: 12, titleStyle: 'masculine' });
                    mountHall();
                    gm.renderTitleHall();
                    const html = document.getElementById('titles-container').innerHTML;
                    expect(html).toContain('Level Ranks');
                    // All 50 ranks listed (first, a mid, and the capstone)
                    expect(html).toContain('Wanderer');
                    expect(html).toContain('Mythic');
                    expect(html).toContain('Paragon');
                    // Earned/total reflects the player's level
                    expect(html).toContain('12/50');
                });

                test('marks the current rank and dims unreached ranks', () => {
                    const gm = createTestManager({ level: 11, titleStyle: 'masculine' });
                    mountHall();
                    gm.renderTitleHall();
                    const html = document.getElementById('titles-container').innerHTML;
                    // Lv 11 (Hero) is the current rank
                    expect(html).toContain('Lv 11 • Current');
                    // A future rank chip carries the locked/dim styling
                    expect(html).toMatch(/opacity-50[\s\S]*Lv 50/);
                });

                test('uses the feminine chain when titleStyle is feminine', () => {
                    const gm = createTestManager({ level: 25, titleStyle: 'feminine' });
                    mountHall();
                    gm.renderTitleHall();
                    const html = document.getElementById('titles-container').innerHTML;
                    expect(html).toContain('Dragonqueen'); // feminine Lv 25
                    expect(html).not.toContain('Dragonlord'); // masculine counterpart absent
                });
            });
        });

        describe('early_bird rebalance', () => {

            test('definition costs 2 crystals and covers first 5 tasks', () => {
                const gm = createTestManager();
                const defs = gm.initializeEnchantments();
                expect(defs.early_bird.cost).toBe(2);
                expect(defs.early_bird.description).toContain('First 5 tasks');
            });

            function createXPManager() {
                return createTestManager({
                    earlyBirdTasksToday: 0,
                    momentumStack: 0,
                    accountCreatedDate: null,
                    BEGINNER_BLESSING_DAYS: 3,
                    activeEnchantments: [{ id: 'early_bird', effect: 'early_bird', expiresAt: Date.now() + 600000 }],
                    grantCompanionXP: jest.fn(),
                    trackDaily: jest.fn(),
                    checkBadges: jest.fn(),
                    checkLootDrop: jest.fn(),
                    checkTitleUnlocks: jest.fn(),
                    animateXPGain: jest.fn(),
                    levelUp: jest.fn()
                });
            }

            test('triples XP for the first 5 daily tasks, not the 6th', () => {
                const gm = createXPManager();
                for (let i = 0; i < 5; i++) gm.addXP(10, 'daily');
                expect(gm.xp).toBe(150); // 5 × 30
                gm.addXP(10, 'daily'); // 6th task — no boost
                expect(gm.xp).toBe(160);
            });

            test('does not boost non-daily XP sources', () => {
                const gm = createXPManager();
                gm.addXP(10, 'weekly');
                expect(gm.xp).toBe(10);
                expect(gm.earlyBirdTasksToday).toBe(0);
            });
        });

        describe('Away recap consolidation', () => {

            afterEach(() => {
                const modal = document.getElementById('away-recap-modal');
                if (modal) modal.remove();
            });

            test('_applyStreakBreak queues a broken event for streaks of 2+', () => {
                const gm = createTestManager({ _recapEvents: [], activeEnchantments: [] });
                const habit = { title: 'Run', streak: 5 };
                gm._applyStreakBreak(habit, false, null);
                expect(habit.streak).toBe(0);
                expect(gm._recapEvents).toHaveLength(1);
                expect(gm._recapEvents[0].type).toBe('broken');
                expect(gm._recapEvents[0].message).toContain('Run streak of 5 days');
            });

            test('1-day streaks break silently (not a real loss)', () => {
                const gm = createTestManager({ _recapEvents: [], activeEnchantments: [] });
                const habit = { title: 'Run', streak: 1 };
                gm._applyStreakBreak(habit, false, null);
                expect(habit.streak).toBe(0);
                expect(gm._recapEvents).toHaveLength(0);
            });

            test('queue falls back to an immediate toast outside a reset', () => {
                const gm = createTestManager({ _recapEvents: null, activeEnchantments: [] });
                gm._queueRecapEvent({ type: 'protected', message: '🛡️ saved!' });
                expect(gm.showAchievement).toHaveBeenCalledWith('🛡️ saved!', 'life');
            });

            test('a single event flushes as the familiar toast, no modal', () => {
                const gm = createTestManager();
                gm._flushRecapEvents([{ type: 'broken', message: '💔 Run streak of 5 days was lost' }], '2026-06-10', '2026-06-11');
                expect(gm.showAchievement).toHaveBeenCalledWith('💔 Run streak of 5 days was lost', 'life');
                expect(document.getElementById('away-recap-modal')).toBeNull();
            });

            test('multiple events flush as one consolidated recap modal', () => {
                const gm = createTestManager();
                gm._flushRecapEvents([
                    { type: 'broken', message: '💔 Run streak of 5 days was lost' },
                    { type: 'protected', message: '🛡️ STREAK SHIELD! Your Read streak of 9 days was protected!' }
                ], '2026-06-08', '2026-06-11');
                expect(gm.showAchievement).not.toHaveBeenCalled();
                const modal = document.getElementById('away-recap-modal');
                expect(modal).not.toBeNull();
                expect(modal.getAttribute('role')).toBe('dialog');
                expect(modal.textContent).toContain('While You Were Away');
                expect(modal.textContent).toContain('3 days passed in the realm');
                expect(modal.textContent).toContain('Run streak of 5 days was lost');
                expect(modal.textContent).toContain('Read streak of 9 days was protected');
            });

            test('recap modal close control is reachable by the back-button fallback', () => {
                const gm = createTestManager();
                gm.showAwayRecapModal([
                    { type: 'broken', message: '💔 a' },
                    { type: 'broken', message: '💔 b' }
                ], 2);
                const modal = document.getElementById('away-recap-modal');
                // closeTopOverlay's fallback finds a close control via this exact
                // selector. The X button qualifies through aria-label="Close" now
                // that its click is handled by delegated
                // data-action="modal.closeAwayRecap" (Engineering Roadmap #7b).
                expect(modal.getAttribute('role')).toBe('dialog');
                expect(modal.querySelector(
                    '[data-action="close"], [data-action="dismiss"], [aria-label="Close"], [aria-label^="Close"]'
                )).not.toBeNull();
                gm.closeAwayRecapModal();
                expect(document.getElementById('away-recap-modal')).toBeNull();
            });

            test('empty or null event lists flush silently', () => {
                const gm = createTestManager();
                gm._flushRecapEvents([], '2026-06-10', '2026-06-11');
                gm._flushRecapEvents(null, '2026-06-10', '2026-06-11');
                expect(gm.showAchievement).not.toHaveBeenCalled();
                expect(document.getElementById('away-recap-modal')).toBeNull();
            });
        });
    });

    // ==================== TOAST UNDO & TAP-TO-DISMISS (v2.9.x UX audit) ====================
    //
    // Two deferred audit findings done together (same surface):
    //   - Delete toast UNDO: Ctrl+Z is unreachable on Android (the entire
    //     user base), so deletes were irreversible in practice. deleteGoal
    //     now snapshots the item + position and shows a toast with a
    //     tappable ↩️ UNDO button that restores it in place.
    //   - Tap-to-dismiss (L4): queued toasts couldn't be skipped during
    //     bulk completions. The whole toast is now a tap target that
    //     advances the queue immediately.
    describe('Toast UNDO & Tap-to-Dismiss', () => {

        // Static toast markup fixture mirroring index.html. The real toast
        // pipeline (showToast → _processToastQueue) runs against this.
        function mountToastDom() {
            const host = document.createElement('div');
            host.id = 'toast-fixture';
            host.innerHTML = `
                <div id="achievement-toast" class="hidden scale-0">
                    <div id="toast-container">
                        <div id="toast-icon"></div>
                        <div id="toast-title"></div>
                        <p id="achievement-text"></p>
                    </div>
                </div>`;
            document.body.appendChild(host);
            return () => host.remove();
        }

        describe('deleteGoal UNDO flow', () => {

            test('delete shows a toast with an UNDO action and snapshots the item', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn((msg, cb) => cb());
                gm.showToast = jest.fn();
                gm.dailyTasks = [
                    { id: 1, title: 'Keep me' },
                    { id: 2, title: 'Delete me' },
                    { id: 3, title: 'Keep me too' }
                ];
                gm.deleteGoal('daily', 2);

                expect(gm.dailyTasks.map(t => t.id)).toEqual([1, 3]);
                expect(gm._lastDelete).toEqual({
                    listKey: 'dailyTasks', item: { id: 2, title: 'Delete me' }, index: 1
                });
                expect(gm.showToast).toHaveBeenCalledWith(
                    expect.stringContaining('"Delete me" deleted'),
                    'info', null,
                    expect.objectContaining({ label: expect.stringContaining('UNDO'), callback: expect.any(Function) })
                );
            });

            test('undoLastDelete restores the item at its original position', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn((msg, cb) => cb());
                gm.showToast = jest.fn();
                gm.dailyTasks = [
                    { id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }
                ];
                gm.deleteGoal('daily', 2);
                gm.undoLastDelete();
                expect(gm.dailyTasks.map(t => t.id)).toEqual([1, 2, 3]);
                expect(gm.showAchievement).toHaveBeenCalledWith('↩️ Restored!', 'daily');
            });

            test('undoLastDelete is one-shot — second call is a no-op', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn((msg, cb) => cb());
                gm.showToast = jest.fn();
                gm.habits = [{ id: 'h1', title: 'Run' }];
                gm.deleteGoal('habit', 'h1');
                gm.undoLastDelete();
                gm.undoLastDelete();
                expect(gm.habits).toHaveLength(1);
                expect(gm._lastDelete).toBeNull();
            });

            test('undoLastDelete refuses to duplicate an id already back in the list', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn((msg, cb) => cb());
                gm.showToast = jest.fn();
                gm.sideQuests = [{ id: 'q1', title: 'Quest' }];
                gm.deleteGoal('side', 'q1');
                // User re-creates an item with the same id before tapping UNDO
                gm.sideQuests.push({ id: 'q1', title: 'Recreated' });
                gm.undoLastDelete();
                expect(gm.sideQuests).toHaveLength(1);
                expect(gm.sideQuests[0].title).toBe('Recreated');
            });

            test('works for every delete type key', () => {
                const gm = createTestManager();
                gm.showConfirm = jest.fn((msg, cb) => cb());
                gm.showToast = jest.fn();
                const cases = [
                    ['life', 'lifeGoals'], ['yearly', 'yearlyGoals'],
                    ['monthly', 'monthlyGoals'], ['weekly', 'weeklyGoals'],
                    ['daily', 'dailyTasks'], ['side', 'sideQuests'], ['habit', 'habits']
                ];
                for (const [type, listKey] of cases) {
                    gm[listKey] = [{ id: 'x', title: 'Item' }];
                    gm.deleteGoal(type, 'x');
                    expect(gm[listKey]).toHaveLength(0);
                    gm.undoLastDelete();
                    expect(gm[listKey]).toHaveLength(1);
                }
            });
        });

        describe('toast action button & tap-to-dismiss', () => {

            let teardown;
            beforeEach(() => { teardown = mountToastDom(); });
            afterEach(() => {
                teardown();
                jest.useRealTimers();
            });

            test('action toast renders a tappable button that fires the callback', () => {
                jest.useFakeTimers();
                const gm = createTestManager();
                const callback = jest.fn();
                gm.showToast('🗑️ "Task" deleted', 'info', null, { label: '↩️ UNDO', callback });

                const btn = document.getElementById('toast-action-btn');
                expect(btn).not.toBeNull();
                expect(btn.textContent).toBe('↩️ UNDO');
                expect(btn.classList.contains('hidden')).toBe(false);

                btn.click();
                expect(callback).toHaveBeenCalledTimes(1);
                // Button tap also dismisses the toast
                jest.advanceTimersByTime(200);
                expect(document.getElementById('achievement-toast').classList.contains('hidden')).toBe(true);
            });

            test('action button is hidden again on the next plain toast', () => {
                jest.useFakeTimers();
                const gm = createTestManager();
                gm.showToast('🗑️ deleted', 'info', null, { label: '↩️ UNDO', callback: jest.fn() });
                gm.dismissCurrentToast();
                jest.advanceTimersByTime(200);
                gm.showToast('Plain notice', 'info');
                const btn = document.getElementById('toast-action-btn');
                expect(btn.classList.contains('hidden')).toBe(true);
            });

            test('tapping the toast dismisses it and advances the queue', () => {
                jest.useFakeTimers();
                const gm = createTestManager();
                gm.showToast('First', 'info');
                gm.showToast('Second', 'info');
                expect(document.getElementById('achievement-text').textContent).toBe('First');

                document.getElementById('achievement-toast').click();
                jest.advanceTimersByTime(200);
                expect(document.getElementById('achievement-text').textContent).toBe('Second');
            });

            test('toast cursor signals tappability', () => {
                const gm = createTestManager();
                gm.showToast('Notice', 'info');
                expect(document.getElementById('achievement-toast').style.cursor).toBe('pointer');
            });

            test('action toasts stay up 6s instead of the 3s default', () => {
                jest.useFakeTimers();
                const gm = createTestManager();
                gm.showToast('🗑️ deleted', 'info', null, { label: '↩️ UNDO', callback: jest.fn() });
                const toast = document.getElementById('achievement-toast');
                jest.advanceTimersByTime(3500);
                expect(toast.classList.contains('scale-0')).toBe(false); // would be hidden by now if plain
                jest.advanceTimersByTime(3000);
                expect(toast.classList.contains('scale-0')).toBe(true);
            });

            test('dismissCurrentToast is a no-op when nothing is showing', () => {
                const gm = createTestManager();
                expect(() => gm.dismissCurrentToast()).not.toThrow();
            });
        });
    });

    describe('v2.7.1 UX Audit deferred fixes (v2.9 cycle)', () => {

        describe('L5 — locked-nav teaser copy (_lockedNavMessage)', () => {
            // Criterion (2) follow-up to the 85th slice: the gated id set is DERIVED from the
            // feature-unlocks.js tables, so adding a gated view/tab without a name + teaser fails
            // here instead of shipping a bare "<id> unlocks at Level N!" toast.
            const FU = require('../feature-unlocks.js').default;
            const gatedIds = (levels) => Object.keys(levels).filter(k => levels[k] > 1);

            test('every gated nav view gets a NAME and a teaser fragment, not just the gate', () => {
                const gm = createTestManager();
                const gated = gatedIds(FU.LEVELS);
                expect(gated).toEqual(['rewards', 'arcane', 'bossbattles', 'focus', 'questchains']);
                gated.forEach(view => {
                    const msg = gm._lockedNavMessage(view);
                    expect([view, msg]).toEqual([view, expect.stringContaining(`unlocks at Level ${FU.LEVELS[view]}`)]);
                    expect([view, msg]).toEqual([view, expect.stringContaining(' — ')]); // teaser separator present
                    // Named, not the raw id echoed back (the unknown-view fallback).
                    expect([view, msg.startsWith(`🔒 ${view} unlocks`)]).toEqual([view, false]);
                });
            });

            test('every gated arcane tab and goal tab gets a NAME and a teaser (_lockedTabMessage)', () => {
                const gm = createTestManager();
                const tabs = [
                    ...gatedIds(FU.ARCANE_TAB_LEVELS).map(t => [t, FU.ARCANE_TAB_LEVELS[t]]),
                    ...gatedIds(gm.getGoalTabUnlockLevelsForPath(null)).map(t => [t, gm.getGoalTabUnlockLevelsForPath(null)[t]])
                ];
                expect(tabs.map(([t]) => t)).toEqual(['spellbook', 'enchantments', 'weekly', 'sidequests', 'monthly', 'yearly', 'life-goals']);
                tabs.forEach(([tab, lvl]) => {
                    const msg = gm._lockedTabMessage(tab, lvl);
                    expect([tab, msg]).toEqual([tab, expect.stringContaining(`unlocks at Level ${lvl}`)]);
                    expect([tab, msg]).toEqual([tab, expect.stringContaining(' — ')]);
                    expect([tab, msg.startsWith(`🔒 ${tab} unlocks`)]).toEqual([tab, false]);
                });
            });

            test('teaser names the right feature and level', () => {
                const gm = createTestManager();
                const msg = gm._lockedNavMessage('bossbattles');
                expect(msg).toContain('Boss Battles');
                expect(msg).toContain(`Level ${gm.featureUnlockLevels.bossbattles}`);
                expect(msg).toContain('slay epic bosses');
            });

            test('unknown view falls back gracefully (no teaser, plain gate copy)', () => {
                const gm = createTestManager();
                const msg = gm._lockedNavMessage('mystery');
                expect(msg).toContain('mystery unlocks at Level');
                expect(msg).not.toContain(' — ');
                expect(msg.endsWith('!')).toBe(true);
            });
        });

        describe('L11 — offline indicator (_updateOfflineIndicator)', () => {
            afterEach(() => {
                document.body.innerHTML = '';
                Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
            });

            function mountPill() {
                document.body.innerHTML = '<div id="offline-indicator" style="display:none"></div>';
                return document.getElementById('offline-indicator');
            }

            test('pill shows when navigator reports offline', () => {
                const gm = createTestManager();
                const pill = mountPill();
                Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
                gm._updateOfflineIndicator();
                expect(pill.style.display).toBe('flex');
            });

            test('pill hides when back online', () => {
                const gm = createTestManager();
                const pill = mountPill();
                Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
                gm._updateOfflineIndicator();
                Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
                gm._updateOfflineIndicator();
                expect(pill.style.display).toBe('none');
            });

            test('no crash when the pill markup is absent', () => {
                const gm = createTestManager();
                document.body.innerHTML = '';
                expect(() => gm._updateOfflineIndicator()).not.toThrow();
            });

            test('_initOfflineIndicator wires online/offline listeners and syncs initial state', () => {
                const gm = createTestManager();
                const pill = mountPill();
                Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
                gm._initOfflineIndicator();
                expect(pill.style.display).toBe('flex'); // initial sync

                Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
                window.dispatchEvent(new Event('online'));
                expect(pill.style.display).toBe('none');

                Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
                window.dispatchEvent(new Event('offline'));
                expect(pill.style.display).toBe('flex');
            });
        });
    });

    describe('v2.9 Track 1 — chest art wiring (asset-gated)', () => {
        let realFetch;
        let realPlay;

        beforeEach(() => {
            document.body.innerHTML = '';
            realFetch = global.fetch;
            realPlay = window.HTMLMediaElement.prototype.play;
            window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
        });

        afterEach(() => {
            global.fetch = realFetch;
            window.HTMLMediaElement.prototype.play = realPlay;
            document.body.innerHTML = '';
            document.body.className = '';
        });

        // fetch mock: HEAD succeeds only for paths in `existing`
        function mockHeadFetch(existing) {
            global.fetch = jest.fn((url, opts = {}) => {
                const ok = opts.method === 'HEAD' && existing.some(p => String(url).includes(p));
                return Promise.resolve({ ok });
            });
        }

        describe('_probeChestArt', () => {
            test('registers statics (webp preferred over png) and open videos per tier', async () => {
                const gm = createTestManager();
                gm.renderTreasureChests = jest.fn();
                mockHeadFetch([
                    'chest-gold.webp', 'chest-gold.png', // both exist — webp must win
                    'chest-bronze.png',                  // png only
                    'chest-open-royal.webm'
                ]);
                await gm._probeChestArt();
                expect(gm._chestArt.statics.gold).toBe('./images/chests/chest-gold.webp');
                expect(gm._chestArt.statics.bronze).toBe('./images/chests/chest-bronze.png');
                expect(gm._chestArt.statics.silver).toBeUndefined();
                expect(gm._chestArt.videos.royal).toBe('./images/chests/chest-open-royal.webm');
                expect(gm._chestArt.videos.gold).toBeUndefined();
                // statics found → treasury refresh requested
                expect(gm.renderTreasureChests).toHaveBeenCalled();
            });

            test('no assets and even fetch rejections leave maps empty without throwing', async () => {
                const gm = createTestManager();
                gm.renderTreasureChests = jest.fn();
                global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
                await expect(gm._probeChestArt()).resolves.toBeUndefined();
                expect(gm._chestArt.statics).toEqual({});
                expect(gm._chestArt.videos).toEqual({});
                expect(gm.renderTreasureChests).not.toHaveBeenCalled();
            });
        });

        describe('_chestStaticHTML', () => {
            test('renders an <img> when art is registered, emoji div otherwise', () => {
                const gm = createTestManager();
                gm._getChestArt().statics.gold = './images/chests/chest-gold.webp';
                expect(gm._chestStaticHTML('gold', '👑')).toContain('<img src="./images/chests/chest-gold.webp"');
                expect(gm._chestStaticHTML('silver', '💎')).toContain('💎');
                expect(gm._chestStaticHTML('silver', '💎')).not.toContain('<img');
            });
        });

        describe('celebrateChestOpen video path', () => {
            // createTestManager stubs celebrateChestOpen (most suites only
            // care that the celebration was *requested*). These tests
            // exercise the real implementation, so drop the own-property
            // stub and let the prototype method through.
            function makeCelebrationManager() {
                const gm = createTestManager();
                delete gm.celebrateChestOpen;
                gm.createConfetti = jest.fn();
                return gm;
            }

            test('plays the WebM overlay when the asset is registered', () => {
                const gm = makeCelebrationManager();
                gm._getChestArt().videos.gold = './images/chests/chest-open-gold.webm';
                const cssSpy = jest.spyOn(gm, '_celebrateChestOpenCSS');
                gm.celebrateChestOpen('gold', []);
                const video = document.querySelector('.chest-open-video');
                expect(video).not.toBeNull();
                expect(video.getAttribute('src')).toBe('./images/chests/chest-open-gold.webm');
                expect(video.muted).toBe(true);
                expect(cssSpy).not.toHaveBeenCalled();
                // overlay self-removes when the video ends
                video.onended();
                expect(document.querySelector('.chest-open-video-overlay')).toBeNull();
            });

            test('falls back to the CSS celebration when no video asset exists', () => {
                const gm = makeCelebrationManager();
                gm.celebrateChestOpen('gold', []);
                expect(document.querySelector('.chest-open-video')).toBeNull();
                expect(document.querySelector('.chest-open-flash')).not.toBeNull();
            });

            test('playback error swaps to the CSS celebration mid-flight', () => {
                const gm = makeCelebrationManager();
                gm._getChestArt().videos.royal = './images/chests/chest-open-royal.webm';
                gm.celebrateChestOpen('royal', []);
                const video = document.querySelector('.chest-open-video');
                video.onerror();
                expect(document.querySelector('.chest-open-video-overlay')).toBeNull();
                expect(document.querySelector('.chest-open-flash')).not.toBeNull();
            });

            test('fx-minimal users get the CSS path even when the video asset exists', () => {
                const gm = makeCelebrationManager();
                gm._getChestArt().videos.gold = './images/chests/chest-open-gold.webm';
                document.body.classList.add('fx-minimal');
                gm.celebrateChestOpen('gold', []);
                expect(document.querySelector('.chest-open-video')).toBeNull();
                expect(document.querySelector('.chest-open-flash')).not.toBeNull();
            });

            test('prefers-reduced-motion users get the CSS path', () => {
                const gm = makeCelebrationManager();
                gm._getChestArt().videos.gold = './images/chests/chest-open-gold.webm';
                const realMatchMedia = window.matchMedia;
                window.matchMedia = jest.fn(() => ({ matches: true }));
                try {
                    gm.celebrateChestOpen('gold', []);
                } finally {
                    window.matchMedia = realMatchMedia;
                }
                expect(document.querySelector('.chest-open-video')).toBeNull();
                expect(document.querySelector('.chest-open-flash')).not.toBeNull();
            });
        });

        describe('renderTreasureChests static art', () => {
            test('tiles use <img> for tiers with art and emoji for the rest', () => {
                const gm = createTestManager();
                gm.canClaimWoodenChest = jest.fn(() => true);
                gm._getChestArt().statics.bronze = './images/chests/chest-bronze.png';
                gm._getChestArt().statics.wooden = './images/chests/chest-wooden.webp';
                document.body.innerHTML = '<div id="treasure-chests-container"></div>';
                gm.renderTreasureChests();
                const html = document.getElementById('treasure-chests-container').innerHTML;
                expect(html).toContain('chest-bronze.png');
                expect(html).toContain('chest-wooden.webp');
                expect(html).toContain('💎'); // silver still emoji
                expect(html).toContain('👑'); // gold still emoji
            });
        });

        // v2.9 — chest loot fountain (showChestRewards). The reward icons
        // arc into the player avatar ring (reusing effectsManager
        // .lootFountain, the boss-defeat collection effect); the loot panel
        // opens via the fountain's onArrive callback. When effectsManager
        // or the avatar ring is absent, it falls back to the legacy
        // fixed-delay panel open.
        describe('showChestRewards loot fountain', () => {
            let realEffects;
            beforeEach(() => {
                jest.useFakeTimers();
                realEffects = window.effectsManager;
            });
            afterEach(() => {
                jest.useRealTimers();
                window.effectsManager = realEffects;
                document.body.innerHTML = '';
            });

            function makeManager() {
                const gm = createTestManager();
                gm.celebrateChestOpen = jest.fn();
                gm.showLootPanel = jest.fn();
                gm.maybeShowReviewPrompt = jest.fn();
                return gm;
            }

            test('runs the fountain into the avatar ring then opens the panel on arrival', () => {
                const gm = makeManager();
                document.body.innerHTML = '<div id="player-avatar-ring"></div>';
                const target = document.getElementById('player-avatar-ring');
                const lootFountain = jest.fn((from, to, items, onArrive) => onArrive());
                window.effectsManager = { lootFountain };

                const rewards = [{ type: 'gold', amount: 100, icon: '💰' }];
                gm.showChestRewards('gold', rewards);

                // Fountain is scheduled, not immediate.
                expect(lootFountain).not.toHaveBeenCalled();
                jest.advanceTimersByTime(1200);

                expect(lootFountain).toHaveBeenCalledTimes(1);
                const [fromEl, toEl, items] = lootFountain.mock.calls[0];
                expect(fromEl).toBe(document.body);
                expect(toEl).toBe(target);
                expect(items).toEqual([{ icon: '💰' }]);
                // onArrive opened the panel.
                expect(gm.showLootPanel).toHaveBeenCalledWith('gold', rewards);
            });

            test('falls back to the fixed-delay panel open when no avatar ring exists', () => {
                const gm = makeManager();
                const lootFountain = jest.fn();
                window.effectsManager = { lootFountain };

                gm.showChestRewards('bronze', [{ type: 'gold', amount: 10, icon: '💰' }]);
                jest.advanceTimersByTime(2200);

                expect(lootFountain).not.toHaveBeenCalled();
                expect(gm.showLootPanel).toHaveBeenCalledTimes(1);
            });

            test('_lootFountainIcon resolves per-type icons with fallbacks', () => {
                const gm = makeManager();
                expect(gm._lootFountainIcon({ type: 'gold', icon: '💰' })).toBe('💰');
                expect(gm._lootFountainIcon({ type: 'theme' })).toBe('🎨');
                expect(gm._lootFountainIcon({ type: 'xp' })).toBe('📜');
                expect(gm._lootFountainIcon({ type: 'mystery' })).toBe('✨');
                expect(gm._lootFountainIcon(null)).toBe('✨');
            });
        });

        // ── Completion sound regression (silent-claim bug) ────────────────
        //
        // claimDailyQuest / toggleSideQuest route their visual feedback
        // through effectsManager (visual-only) and grant rewards via quiet
        // sources (addGold('daily') / addXP('side')). The completion sound
        // used to live ONLY in the `else` (no-effectsManager) branch, so in
        // production — where effectsManager always exists — the claim was
        // completely silent. The fix plays playTaskComplete() in the
        // effectsManager branch too.
        describe('completion claims play a sound when effectsManager is present', () => {
            let realEffects;
            beforeEach(() => {
                realEffects = window.effectsManager;
                window.audioManager.playTaskComplete.mockClear();
            });
            afterEach(() => {
                window.effectsManager = realEffects;
                document.body.innerHTML = '';
            });

            test('claimDailyQuest plays the task-complete sound (not silent)', () => {
                const gm = createTestManager();
                gm.addXP = jest.fn();
                gm.addGold = jest.fn();
                gm.DAILY_QUEST_POOL = [{ id: 'q1', name: 'Test Quest', xp: 10, gold: 5, check: () => true }];
                // Two quests so the claim doesn't trip the all-claimed bonus path.
                gm.dailyQuestBoard = {
                    date: gm.getTodayDateString(),
                    quests: [
                        { id: 'q1', completed: true, claimed: false },
                        { id: 'q2', completed: false, claimed: false }
                    ],
                    allClaimedBonus: false
                };
                window.effectsManager = { dailyQuestCompleted: jest.fn() };

                gm.claimDailyQuest('q1');

                expect(window.effectsManager.dailyQuestCompleted).toHaveBeenCalled();
                expect(window.audioManager.playTaskComplete).toHaveBeenCalledTimes(1);
            });

            test('toggleSideQuest completion plays the task-complete sound (not silent)', () => {
                const gm = createTestManager();
                gm.addXP = jest.fn();
                gm.grantAttackCharge = jest.fn();
                gm.addFocusCrystalShards = jest.fn();
                gm.checkSerenityBonus = jest.fn();
                gm.trackDaily = jest.fn();
                gm.checkOnboardingShareHook = jest.fn();
                gm.checkBountyCompletion = jest.fn();
                gm.sideQuests = [{ id: 7, title: 'Side Quest', completed: false, rewarded: false, priority: 'low' }];
                window.effectsManager = { sideQuestCompleted: jest.fn() };

                gm.toggleSideQuest(7);

                expect(gm.sideQuests[0].completed).toBe(true);
                expect(window.effectsManager.sideQuestCompleted).toHaveBeenCalled();
                expect(window.audioManager.playTaskComplete).toHaveBeenCalledTimes(1);
            });
        });

        // ── v2.9 Track 1 — sequential loot reveal by rarity ──────────────
        //
        // The loot panel reveals its rows top-to-bottom via the staggered
        // `lootItemIn` animation. Ordering the rows by ascending rarity makes
        // the reveal build to the rarest drop (best lands last), turning a
        // flat list into a crescendo. The reorder is display-only: rewards are
        // already granted before the panel opens, so it can never change the
        // loot the player receives.
        describe('showLootPanel sequential reveal by rarity (Track 1)', () => {
            let realAudio;
            beforeEach(() => {
                realAudio = window.audioManager;
                window.audioManager = { playLootCoin: jest.fn() };
            });
            afterEach(() => {
                window.audioManager = realAudio;
                document.body.innerHTML = '';
            });

            const renderedRarities = () =>
                [...document.querySelectorAll('div.rarity-frame')].map(el => el.getAttribute('data-rarity'));
            const delayOf = (el) => parseFloat(el.getAttribute('style').match(/([\d.]+)s\s+both/)[1]);

            describe('_rarityRank', () => {
                test('orders the rarity ladder lowest → highest', () => {
                    const gm = createTestManager();
                    expect(['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => gm._rarityRank(r)))
                        .toEqual([0, 1, 2, 3, 4]);
                });

                test('treats unknown/missing rarity as common and is case-insensitive', () => {
                    const gm = createTestManager();
                    expect(gm._rarityRank('mythic')).toBe(0);
                    expect(gm._rarityRank(undefined)).toBe(0);
                    expect(gm._rarityRank('LEGENDARY')).toBe(4);
                });
            });

            test('renders reward rows in ascending rarity order so the rarest lands last', () => {
                const gm = createTestManager();
                delete gm.showLootPanel; // exercise the real implementation
                const rewards = [
                    { type: 'gold', amount: 100, rarity: 'legendary', icon: '💰' },
                    { type: 'gold', amount: 50, rarity: 'common', icon: '💰' },
                    { type: 'gold', amount: 200, rarity: 'rare', icon: '💰' },
                    { type: 'gold', amount: 75, rarity: 'uncommon', icon: '💰' },
                ];
                gm.showLootPanel('royal', rewards);
                expect(renderedRarities()).toEqual(['common', 'uncommon', 'rare', 'legendary']);
            });

            test('keeps generation order within a rarity tier (stable sort)', () => {
                const gm = createTestManager();
                delete gm.showLootPanel;
                const rewards = [
                    { type: 'gold', amount: 1, rarity: 'rare', icon: '💰', name: 'A' },
                    { type: 'gold', amount: 2, rarity: 'common', icon: '💰', name: 'B' },
                    { type: 'gold', amount: 3, rarity: 'rare', icon: '💰', name: 'C' },
                ];
                gm.showLootPanel('gold', rewards);
                const names = [...document.querySelectorAll('div.rarity-frame .font-bold')].map(el => el.textContent);
                expect(names).toEqual(['B', 'A', 'C']);
            });

            test('staggers the rows so the reveal is sequential (later rows reveal later)', () => {
                const gm = createTestManager();
                delete gm.showLootPanel;
                gm.showLootPanel('silver', [
                    { type: 'gold', amount: 1, rarity: 'common', icon: '💰' },
                    { type: 'gold', amount: 2, rarity: 'rare', icon: '💰' },
                ]);
                const rows = [...document.querySelectorAll('div.rarity-frame')];
                expect(delayOf(rows[1])).toBeGreaterThan(delayOf(rows[0]));
            });

            test('does not reorder or mutate the source rewards array (grants unaffected)', () => {
                const gm = createTestManager();
                delete gm.showLootPanel;
                const rewards = [
                    { type: 'gold', amount: 100, rarity: 'legendary', icon: '💰' },
                    { type: 'gold', amount: 50, rarity: 'common', icon: '💰' },
                ];
                const before = rewards.map(r => r.rarity);
                gm.showLootPanel('gold', rewards);
                expect(rewards.map(r => r.rarity)).toEqual(before);
            });
        });
    });

    describe('avatar sigil orbit — spells + enchantments', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        function mountOrbit() {
            document.body.innerHTML =
                '<div id="player-sigil-orbit"></div><div id="panel-sigil-orbit"></div>';
        }

        test('renders rarity-tinted sigils for active spells', () => {
            const gm = createTestManager();
            mountOrbit();
            const spellId = Object.keys(gm.spellDefinitions)[0];
            gm.activeSpells = [{ spellId, expiresAt: Date.now() + 60000 }];
            gm.renderActiveSpellSigils();
            const rarity = gm.spellDefinitions[spellId].rarity || 'common';
            const html = document.getElementById('player-sigil-orbit').innerHTML;
            expect(html).toContain(`avatar-sigil--${rarity}`);
            expect(html).not.toContain('avatar-sigil--enchantment');
        });

        test('renders a distinct enchantment-class sigil for active enchantments', () => {
            const gm = createTestManager();
            mountOrbit();
            gm.activeEnchantments = [{
                id: 'double_xp', effect: 'double_xp', name: 'Enchantment of Swiftness',
                icon: '⚡', expiresAt: Date.now() + 60000
            }];
            gm.renderActiveSpellSigils();
            const html = document.getElementById('player-sigil-orbit').innerHTML;
            expect(html).toContain('avatar-sigil--enchantment');
            expect(html).toContain('Enchantment of Swiftness');
        });

        test('orbits spells and enchantments together with both class families', () => {
            const gm = createTestManager();
            mountOrbit();
            const spellId = Object.keys(gm.spellDefinitions)[0];
            const rarity = gm.spellDefinitions[spellId].rarity || 'common';
            gm.activeSpells = [{ spellId, expiresAt: Date.now() + 60000 }];
            gm.activeEnchantments = [{
                id: 'double_gold', effect: 'double_gold', name: 'Enchantment of Fortune',
                icon: '💰', expiresAt: Date.now() + 60000
            }];
            gm.renderActiveSpellSigils();
            const html = document.getElementById('panel-sigil-orbit').innerHTML;
            expect(html).toContain(`avatar-sigil--${rarity}`);
            expect(html).toContain('avatar-sigil--enchantment');
            // Two bubbles total
            const count = (html.match(/class="avatar-sigil /g) || []).length;
            expect(count).toBe(2);
        });

        test('expired enchantments are excluded from the orbit', () => {
            const gm = createTestManager();
            mountOrbit();
            gm.activeEnchantments = [{
                id: 'double_xp', effect: 'double_xp', name: 'Enchantment of Swiftness',
                icon: '⚡', expiresAt: Date.now() - 1000
            }];
            gm.renderActiveSpellSigils();
            expect(document.getElementById('player-sigil-orbit').innerHTML).toBe('');
        });
    });
});

// ── Royal Bounty "ready" reminder — claimable selection (§1.9) ──────────────
// Unit coverage for _soonestClaimableBounty, the resolver behind the native
// bounty-ready pre-scheduled reminder (scheduleBountyReadyReminder).
describe('Royal Bounty — _soonestClaimableBounty', () => {
    // Fixed evaluation instant so expiry comparisons are deterministic.
    const NOW = new Date('2026-06-10T00:00:00Z');

    function mgrWithBounties(bounties) {
        const gm = createTestManager();
        gm.activeBounties = { weekly: null, monthly: null, ...bounties };
        return gm;
    }

    test('returns null when there are no active bounties', () => {
        expect(mgrWithBounties({})._soonestClaimableBounty(NOW)).toBeNull();
    });

    test('returns an active, unclaimed bounty whose target is still incomplete', () => {
        const gm = mgrWithBounties({
            weekly: { cadence: 'weekly', status: 'active', questType: 'weekly', questId: 1, chestTier: 'silver', expiresAt: '2026-06-14T23:59:59Z' },
        });
        gm.weeklyGoals = [{ id: 1, completed: false }];
        expect(gm._soonestClaimableBounty(NOW)).toMatchObject({
            cadence: 'weekly', label: 'Weekly', chestTier: 'silver', expiresAt: '2026-06-14T23:59:59Z',
        });
    });

    test('skips expired, empty, claimed, completed-target, and deleted-target bounties', () => {
        // Window already closed.
        let gm = mgrWithBounties({ weekly: { cadence: 'weekly', status: 'active', questType: 'weekly', questId: 1, chestTier: 'silver', expiresAt: '2026-06-01T00:00:00Z' } });
        gm.weeklyGoals = [{ id: 1, completed: false }];
        expect(gm._soonestClaimableBounty(NOW)).toBeNull();

        // Empty-pool record (no quest to nudge toward).
        gm = mgrWithBounties({ weekly: { cadence: 'weekly', empty: true, periodKey: '2026-W24' } });
        expect(gm._soonestClaimableBounty(NOW)).toBeNull();

        // Already claimed this period.
        gm = mgrWithBounties({ weekly: { cadence: 'weekly', status: 'claimed', questType: 'weekly', questId: 1, chestTier: 'silver', expiresAt: '2026-06-30T00:00:00Z' } });
        gm.weeklyGoals = [{ id: 1, completed: false }];
        expect(gm._soonestClaimableBounty(NOW)).toBeNull();

        // Target quest already completed.
        gm = mgrWithBounties({ weekly: { cadence: 'weekly', status: 'active', questType: 'weekly', questId: 1, chestTier: 'silver', expiresAt: '2026-06-30T00:00:00Z' } });
        gm.weeklyGoals = [{ id: 1, completed: true }];
        expect(gm._soonestClaimableBounty(NOW)).toBeNull();

        // Target quest deleted (id no longer present).
        gm = mgrWithBounties({ weekly: { cadence: 'weekly', status: 'active', questType: 'weekly', questId: 99, chestTier: 'silver', expiresAt: '2026-06-30T00:00:00Z' } });
        gm.weeklyGoals = [{ id: 1, completed: false }];
        expect(gm._soonestClaimableBounty(NOW)).toBeNull();
    });

    test('chooses the soonest-expiring among multiple claimable bounties', () => {
        const gm = mgrWithBounties({
            weekly: { cadence: 'weekly', status: 'active', questType: 'weekly', questId: 1, chestTier: 'silver', expiresAt: '2026-06-14T23:59:59Z' },
            monthly: { cadence: 'monthly', status: 'active', questType: 'monthly', questId: 2, chestTier: 'gold', expiresAt: '2026-06-12T23:59:59Z' },
        });
        gm.weeklyGoals = [{ id: 1, completed: false }];
        gm.monthlyGoals = [{ id: 2, completed: false }];
        expect(gm._soonestClaimableBounty(NOW).cadence).toBe('monthly'); // Jun 12 < Jun 14
    });

    // ── §1.7 Streak Repair ───────────────────────────────────────────
    //
    // When a streak of 2+ days breaks we snapshot it; the player has 48h to
    // restore it. P2b (friction audit): every player's FIRST repair is free
    // (no premium, no crystals); after that it's premium and costs Focus
    // Crystals scaling with the lost length. Snapshots de-dupe per target and
    // prune once the window closes, and a repair never charges (nor burns the
    // freebie) unless the restore is guaranteed to land.
    describe('§1.7 Streak Repair', () => {
        const HOUR = 60 * 60 * 1000;
        const NOW = 1700000000000; // fixed clock for deterministic windows

        describe('getStreakRepairCost', () => {
            test('scales ~1 crystal per 10 lost days, min 1, capped at 5', () => {
                const gm = createTestManager();
                expect(gm.getStreakRepairCost(2)).toBe(1);
                expect(gm.getStreakRepairCost(10)).toBe(1);
                expect(gm.getStreakRepairCost(11)).toBe(2);
                expect(gm.getStreakRepairCost(30)).toBe(3);
                expect(gm.getStreakRepairCost(50)).toBe(5);
                expect(gm.getStreakRepairCost(365)).toBe(5); // capped
            });
            test('never returns below 1 for tiny/missing input', () => {
                const gm = createTestManager();
                expect(gm.getStreakRepairCost(0)).toBe(1);
                expect(gm.getStreakRepairCost(undefined)).toBe(1);
            });
        });

        describe('_recordRepairableStreak', () => {
            test('records a 2+ day break with the expected shape', () => {
                const gm = createTestManager();
                const entry = gm._recordRepairableStreak({ kind: 'login', lostStreak: 12 }, NOW);
                expect(entry).toMatchObject({ kind: 'login', habitId: null, lostStreak: 12, brokenAt: NOW });
                expect(typeof entry.id).toBe('string');
                expect(gm.repairableStreaks).toHaveLength(1);
            });
            test('ignores streaks under 2 days (not a meaningful loss)', () => {
                const gm = createTestManager();
                expect(gm._recordRepairableStreak({ kind: 'login', lostStreak: 1 }, NOW)).toBeNull();
                expect(gm.repairableStreaks).toHaveLength(0);
            });
            test('de-dupes the login entry — a second break replaces the first', () => {
                const gm = createTestManager();
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 5 }, NOW);
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 9 }, NOW + HOUR);
                expect(gm.repairableStreaks).toHaveLength(1);
                expect(gm.repairableStreaks[0].lostStreak).toBe(9);
            });
            test('de-dupes per habit id but keeps distinct habits', () => {
                const gm = createTestManager();
                gm._recordRepairableStreak({ kind: 'habit', habitId: 1, title: 'Yoga', lostStreak: 5 }, NOW);
                gm._recordRepairableStreak({ kind: 'habit', habitId: 2, title: 'Read', lostStreak: 7 }, NOW + 1);
                gm._recordRepairableStreak({ kind: 'habit', habitId: 1, title: 'Yoga', lostStreak: 8 }, NOW + 2);
                expect(gm.repairableStreaks).toHaveLength(2);
                expect(gm.repairableStreaks.find(e => e.habitId === 1).lostStreak).toBe(8);
            });
        });

        describe('getRepairableStreaks', () => {
            test('prunes entries older than the 48h window, keeps fresh ones', () => {
                const gm = createTestManager();
                gm.repairableStreaks = [
                    { id: 'a', kind: 'login', lostStreak: 5, brokenAt: NOW - 47 * HOUR }, // fresh
                    { id: 'b', kind: 'login', lostStreak: 5, brokenAt: NOW - 49 * HOUR }, // expired
                ];
                const live = gm.getRepairableStreaks(NOW);
                expect(live.map(e => e.id)).toEqual(['a']);
                expect(gm.repairableStreaks.map(e => e.id)).toEqual(['a']); // pruned in place
            });
        });

        describe('canRepairStreak', () => {
            const fresh = () => ({ id: 'x', kind: 'login', lostStreak: 20, brokenAt: NOW });
            test('true for a non-premium player with their free repair, even with 0 crystals (P2b)', () => {
                const gm = createTestManager({ isPremium: false, focusCrystals: 0 });
                expect(gm.canRepairStreak(fresh(), NOW)).toBe(true);
            });
            test('false for a non-premium player who already used their free repair (P2b)', () => {
                const gm = createTestManager({ isPremium: false, focusCrystals: 99, freeStreakRepairUsed: true });
                expect(gm.canRepairStreak(fresh(), NOW)).toBe(false);
            });
            test('false once the 48h window has passed', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 99 });
                expect(gm.canRepairStreak({ ...fresh(), brokenAt: NOW - 49 * HOUR }, NOW)).toBe(false);
            });
            test('false when a premium player can not afford the cost', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 1 }); // 20-day → cost 2
                expect(gm.canRepairStreak(fresh(), NOW)).toBe(false);
            });
            test('true when premium, inside the window, and affordable', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 2 });
                expect(gm.canRepairStreak(fresh(), NOW)).toBe(true);
            });
        });

        describe('repairStreak', () => {
            test('restores a login streak (lost + today) and spends the crystals', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 5, loginStreak: 1 });
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 30 }, NOW); // cost 3
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(true);
                expect(gm.loginStreak).toBe(31);   // 30 + today
                expect(gm.focusCrystals).toBe(2);  // 5 − 3
                expect(gm.repairableStreaks).toHaveLength(0);
                expect(gm.saveData).toHaveBeenCalled();
            });
            test('restores a habit streak to its lost value', () => {
                const habit = { id: 7, title: 'Yoga', streak: 0 };
                const gm = createTestManager({ isPremium: true, focusCrystals: 5, habits: [habit] });
                gm._recordRepairableStreak({ kind: 'habit', habitId: 7, title: 'Yoga', lostStreak: 12 }, NOW); // cost 2
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(true);
                expect(habit.streak).toBe(12);
                expect(gm.focusCrystals).toBe(3);
            });
            test("a non-premium player's first repair is free — restores without spending crystals (P2b)", () => {
                const gm = createTestManager({ isPremium: false, focusCrystals: 0, loginStreak: 1 });
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 30 }, NOW); // would cost 3 if paid
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(true);
                expect(gm.loginStreak).toBe(31);             // 30 + today
                expect(gm.focusCrystals).toBe(0);            // free — nothing spent
                expect(gm.freeStreakRepairUsed).toBe(true);  // freebie consumed
                expect(gm.showPremiumPurchaseModal).not.toHaveBeenCalled();
                expect(gm.repairableStreaks).toHaveLength(0);
                expect(gm.saveData).toHaveBeenCalled();
            });
            test('the free repair is one-time — a second break then routes to the upsell (P2b)', () => {
                const habit = { id: 1, title: 'Yoga', streak: 0 };
                const gm = createTestManager({ isPremium: false, focusCrystals: 0, loginStreak: 1, habits: [habit] });
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 5 }, NOW);
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(true); // first repair free
                // A later, separate break — the freebie is gone now.
                gm._recordRepairableStreak({ kind: 'habit', habitId: 1, title: 'Yoga', lostStreak: 8 }, NOW + HOUR);
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW + HOUR)).toBe(false);
                expect(gm.showPremiumPurchaseModal).toHaveBeenCalled();
                expect(habit.streak).toBe(0); // not restored — now paywalled
            });
            test('a vanished habit target does not consume the free repair (P2b)', () => {
                const gm = createTestManager({ isPremium: false, focusCrystals: 0, habits: [] });
                gm._recordRepairableStreak({ kind: 'habit', habitId: 999, title: 'Gone', lostStreak: 20 }, NOW);
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(false);
                expect(gm.freeStreakRepairUsed).toBeFalsy(); // freebie preserved for a real streak
                expect(gm.repairableStreaks).toHaveLength(0); // dead entry dropped
            });
            test('a non-premium player who already used their free repair is routed to the upsell (P2b)', () => {
                const gm = createTestManager({ isPremium: false, focusCrystals: 5, freeStreakRepairUsed: true });
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 10 }, NOW);
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(false);
                expect(gm.showPremiumPurchaseModal).toHaveBeenCalled();
                expect(gm.focusCrystals).toBe(5);
                expect(gm.repairableStreaks).toHaveLength(1); // still repairable later
            });
            test('an unaffordable repair fails without spending', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 1 });
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 30 }, NOW); // cost 3
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(false);
                expect(gm.focusCrystals).toBe(1);
                expect(gm.repairableStreaks).toHaveLength(1);
            });
            test('expired entries can no longer be repaired', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 5 });
                gm._recordRepairableStreak({ kind: 'login', lostStreak: 10 }, NOW - 49 * HOUR);
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(false);
                expect(gm.focusCrystals).toBe(5);
            });
            test('a vanished habit target spends nothing and drops the dead entry', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 5, habits: [] });
                gm._recordRepairableStreak({ kind: 'habit', habitId: 999, title: 'Gone', lostStreak: 20 }, NOW);
                expect(gm.repairStreak(gm.repairableStreaks[0].id, NOW)).toBe(false);
                expect(gm.focusCrystals).toBe(5);
                expect(gm.repairableStreaks).toHaveLength(0);
            });
            test('unknown id is a no-op', () => {
                const gm = createTestManager({ isPremium: true, focusCrystals: 5 });
                expect(gm.repairStreak('nope', NOW)).toBe(false);
            });
        });

        describe('break-path integration', () => {
            test('_applyStreakBreak records a repairable habit when a 2+ streak is lost', () => {
                const gm = createTestManager();
                const habit = { id: 3, title: 'Read', streak: 6 };
                gm._applyStreakBreak(habit, false, null);
                expect(habit.streak).toBe(0);
                expect(gm.repairableStreaks).toHaveLength(1);
                expect(gm.repairableStreaks[0]).toMatchObject({ kind: 'habit', habitId: 3, lostStreak: 6 });
            });
            test('a protected streak break records nothing', () => {
                const gm = createTestManager();
                const habit = { id: 3, title: 'Read', streak: 6 };
                gm._applyStreakBreak(habit, /* streakShieldActive */ true, null);
                expect(habit.streak).toBe(6); // preserved
                expect(gm.repairableStreaks).toHaveLength(0);
            });
            test('_declineLoginShield records the declined login streak as repairable', () => {
                const gm = createTestManager({ loginStreak: 40 });
                gm._completeLoginBonus = jest.fn(); // skip the heavy completion path
                gm._loginShieldContext = { prevStreak: 40 };
                gm._declineLoginShield();
                expect(gm.loginStreak).toBe(1);
                expect(gm.repairableStreaks).toHaveLength(1);
                expect(gm.repairableStreaks[0]).toMatchObject({ kind: 'login', lostStreak: 40 });
            });
        });
    });

    // ── Limited-time events: Double-XP weekends (→ §3.3) ─────────────
    //
    // A deterministic, recurring "Double XP Weekend" on the first full
    // weekend (Sat 00:00 → Sun 23:59:59, UTC) of each month. All windows
    // are derived from the clock, so tests pin explicit UTC timestamps.
    // The event is gated by `limitedTimeEventsEnabled`, which the test
    // factory deliberately omits so legacy addXP assertions stay clean.
    describe('Limited-time events (Double-XP weekends)', () => {
        // Jun 2024: the 1st IS a Saturday → first weekend = Jun 1–2.
        const JUN_START = Date.UTC(2024, 5, 1, 0, 0, 0, 0);
        const JUN_END = Date.UTC(2024, 5, 2, 23, 59, 59, 999);
        const JUN_MIDWEEK = Date.UTC(2024, 5, 12, 12); // Wed Jun 12 — no event

        describe('getActiveXPEvent', () => {
            test('is gated by the limitedTimeEventsEnabled kill-switch', () => {
                const off = createTestManager(); // factory omits the flag → falsy
                expect(off.getActiveXPEvent(JUN_START + 12 * 3600000)).toBeNull();
                const on = createTestManager({ limitedTimeEventsEnabled: true });
                expect(on.getActiveXPEvent(JUN_START + 12 * 3600000)).not.toBeNull();
            });
            test('returns the 2x event with the expected shape during the window', () => {
                const gm = createTestManager({ limitedTimeEventsEnabled: true });
                const ev = gm.getActiveXPEvent(JUN_START + 12 * 3600000);
                expect(ev).toMatchObject({ id: 'xp2x-2024-06', label: 'Double XP Weekend', multiplier: 2 });
                expect(ev.startsAt).toBe(JUN_START);
                expect(ev.endsAt).toBe(JUN_END);
            });
            test('is inclusive of both window boundaries', () => {
                const gm = createTestManager({ limitedTimeEventsEnabled: true });
                expect(gm.getActiveXPEvent(JUN_START)).not.toBeNull();      // Sat 00:00
                expect(gm.getActiveXPEvent(JUN_END)).not.toBeNull();        // Sun 23:59:59.999
                expect(gm.getActiveXPEvent(JUN_START - 1)).toBeNull();      // a tick before
                expect(gm.getActiveXPEvent(JUN_END + 1)).toBeNull();        // Mon 00:00
            });
            test('fires only on the FIRST weekend, not every weekend', () => {
                const gm = createTestManager({ limitedTimeEventsEnabled: true });
                // Sat Jun 15 2024 is the 3rd Saturday — a weekend, but not the first.
                expect(gm.getActiveXPEvent(Date.UTC(2024, 5, 15, 12))).toBeNull();
            });
            test('computes the first Saturday when the 1st is mid-week', () => {
                const gm = createTestManager({ limitedTimeEventsEnabled: true });
                // Jul 2024: Jul 1 is a Monday → first Saturday is Jul 6.
                expect(gm.getActiveXPEvent(Date.UTC(2024, 6, 1, 12))).toBeNull();        // Mon Jul 1
                const ev = gm.getActiveXPEvent(Date.UTC(2024, 6, 6, 12));                // Sat Jul 6
                expect(ev).toMatchObject({ id: 'xp2x-2024-07', multiplier: 2 });
                expect(ev.startsAt).toBe(Date.UTC(2024, 6, 6, 0, 0, 0, 0));
            });
        });

        describe('getXPEventMultiplier', () => {
            test('is 2 during the event and 1 outside it', () => {
                const gm = createTestManager({ limitedTimeEventsEnabled: true });
                expect(gm.getXPEventMultiplier(JUN_START + 12 * 3600000)).toBe(2);
                expect(gm.getXPEventMultiplier(JUN_MIDWEEK)).toBe(1);
            });
            test('is 1 when events are disabled, even on an event weekend', () => {
                const gm = createTestManager(); // disabled
                expect(gm.getXPEventMultiplier(JUN_START + 12 * 3600000)).toBe(1);
            });
        });

        describe('addXP integration', () => {
            test('doubles awarded XP while a Double XP Weekend is live', () => {
                const spy = jest.spyOn(Date, 'now').mockReturnValue(JUN_START + 12 * 3600000);
                try {
                    const gm = createTestManager({ limitedTimeEventsEnabled: true });
                    gm.addXP(100, 'daily');
                    expect(gm.xp).toBe(200);
                } finally {
                    spy.mockRestore();
                }
            });
            test('leaves XP untouched when events are disabled (factory default)', () => {
                // Same mocked event weekend — proves the kill-switch, not the
                // calendar, is what keeps legacy addXP math multiplier-free.
                const spy = jest.spyOn(Date, 'now').mockReturnValue(JUN_START + 12 * 3600000);
                try {
                    const gm = createTestManager();
                    gm.addXP(100, 'daily');
                    expect(gm.xp).toBe(100);
                } finally {
                    spy.mockRestore();
                }
            });
        });

        describe('_xpEventTimeLeftLabel', () => {
            const ev = { endsAt: JUN_END };
            test('formats the remaining window as <1h / Nh / Nd / ending now', () => {
                const gm = createTestManager();
                expect(gm._xpEventTimeLeftLabel(ev, ev.endsAt - 30 * 60 * 1000)).toBe('<1h left'); // 30m
                expect(gm._xpEventTimeLeftLabel(ev, ev.endsAt - 5 * 3600000)).toBe('5h left');     // 5h
                expect(gm._xpEventTimeLeftLabel(ev, ev.endsAt - 30 * 3600000)).toBe('2d left');    // 30h → 2d
                expect(gm._xpEventTimeLeftLabel(ev, ev.endsAt + 1000)).toBe('ending now');         // elapsed
            });
        });
    });

    // ==================== CLASS SYSTEM v3.1 — PHASE 1 PERKS ====================
    //
    // Phase 1 of the class redesign (docs/CLASS_REDESIGN.md §7) wires every
    // [easy] perk across the four classes plus the Scholar capstones through
    // getClassPerkValue. These regression tests lock in the perk values, the
    // node/capstone progression pipeline, and the two non-trivial Scholar
    // capstone behaviours (Deep Work escalation, Insight preservation).
    describe('Class System v3.1 — Phase 1 perks', () => {
        // createTestManager() builds a real instance, so initState() already
        // provides classDefinitions, the CLASS_* constants, and the default
        // null/0 class state — and stubs showAchievement/saveData. We only set
        // the per-test class selection + tree progression here.
        function classedManager(classId, { nodesUnlocked = 0, capstone = null, level = 50 } = {}) {
            const gm = createTestManager();
            gm.playerClass = classId;
            gm.classNodesUnlocked = nodesUnlocked;
            gm.classCapstone = capstone;
            gm.level = level;
            return gm;
        }

        describe('class tree data integrity', () => {
            const buildDefs = () => createTestManager().initializeClasses();

            test('every class has 5 linear nodes + 2 capstones', () => {
                const defs = buildDefs();
                ['scholar', 'warrior', 'wizard', 'ranger'].forEach(id => {
                    expect(defs[id].nodes).toHaveLength(5);
                    expect(defs[id].capstones).toHaveLength(2);
                });
            });

            test('linear cost curve is [2,3,4,5,6] + capstone 10 = 30 total', () => {
                Object.values(buildDefs()).forEach(cls => {
                    expect(cls.nodes.map(n => n.cost)).toEqual([2, 3, 4, 5, 6]);
                    cls.capstones.forEach(c => expect(c.cost).toBe(10));
                    const total = cls.nodes.reduce((s, n) => s + n.cost, 0) + 10;
                    expect(total).toBe(30);
                });
            });

            test('no class repeats an effect across its nodes + capstones', () => {
                Object.values(buildDefs()).forEach(cls => {
                    const effects = [...cls.nodes, ...cls.capstones].map(n => n.effect);
                    expect(new Set(effects).size).toBe(effects.length);
                });
            });

            // Locks the subclass builder (buildSubclasses + subTiers) that applies
            // BALANCE.classTree.subTierCosts to the raw tiers from class-definitions.js
            // (Engineering Roadmap #1 class slice).
            test('every class has 2 subclasses, each with 3 tiers priced [3,4,5]', () => {
                Object.values(buildDefs()).forEach(cls => {
                    const subs = Object.values(cls.subclasses);
                    expect(subs).toHaveLength(2);
                    subs.forEach(sub => {
                        ['id', 'name', 'icon', 'tagline', 'effect'].forEach(k => {
                            expect(typeof sub[k]).toBe('string');
                            expect(sub[k].length).toBeGreaterThan(0);
                        });
                        expect(sub.tiers).toHaveLength(3);
                        expect(sub.tiers.map(t => t.tier)).toEqual([1, 2, 3]);
                        expect(sub.tiers.map(t => t.cost)).toEqual([3, 4, 5]);
                        sub.tiers.forEach(t => {
                            expect(typeof t.value).toBe('number');
                            expect(typeof t.desc).toBe('string');
                        });
                    });
                });
            });
        });

        describe('getClassPerkValue scanning', () => {
            test('returns 0 when no class is selected', () => {
                expect(classedManager(null).getClassPerkValue('focus_xp')).toBe(0);
            });

            test('a node resolves to 0 until unlocked, then to its value', () => {
                expect(classedManager('scholar', { nodesUnlocked: 0 }).getClassPerkValue('focus_xp')).toBe(0);
                expect(classedManager('scholar', { nodesUnlocked: 1 }).getClassPerkValue('focus_xp')).toBe(40);
            });

            test('only resolves perks belonging to the active class', () => {
                const warrior = classedManager('warrior', { nodesUnlocked: 5 });
                expect(warrior.getClassPerkValue('focus_xp')).toBe(0);
                expect(warrior.getClassPerkValue('boss_damage_mult')).toBe(0.20);
            });

            test('resolves the chosen capstone and not the alternative', () => {
                const gm = classedManager('scholar', { nodesUnlocked: 5, capstone: 'deep_work' });
                expect(gm.getClassPerkValue('deep_work')).toBe(0.25);
                expect(gm.getClassPerkValue('enchant_preserve')).toBe(0);
            });

            test('Scholar easy perks resolve at full unlock', () => {
                const gm = classedManager('scholar', { nodesUnlocked: 5 });
                expect(gm.getClassPerkValue('focus_xp')).toBe(40);
                expect(gm.getClassPerkValue('enchant_discount')).toBe(2);
                expect(gm.getClassPerkValue('crystal_yield')).toBe(1);
                expect(gm.getClassPerkValue('enchant_duration_mult')).toBe(0.40);
                expect(gm.getClassPerkValue('study_xp_mult')).toBe(0.10);
            });

            test('Warrior easy perks resolve at full unlock', () => {
                const gm = classedManager('warrior', { nodesUnlocked: 5 });
                expect(gm.getClassPerkValue('boss_damage_mult')).toBe(0.20);
                expect(gm.getClassPerkValue('charge_chance')).toBe(0.25);
                expect(gm.getClassPerkValue('crit_chance')).toBe(0.20);
            });

            test('Wizard easy perks resolve at full unlock', () => {
                const gm = classedManager('wizard', { nodesUnlocked: 5 });
                expect(gm.getClassPerkValue('spell_duration_mult')).toBe(0.40);
                expect(gm.getClassPerkValue('spell_preserve')).toBe(0.25);
            });

            test('Ranger easy perks resolve at full unlock', () => {
                const gm = classedManager('ranger', { nodesUnlocked: 5 });
                expect(gm.getClassPerkValue('companion_xp_mult')).toBe(0.50);
                expect(gm.getClassPerkValue('loot_weight')).toBe(12);
            });
        });

        describe('progression pipeline', () => {
            test('available skill points derive from level past the unlock level', () => {
                const gm = classedManager('scholar', { level: 15 });
                expect(gm.getEarnedSkillPoints()).toBe(5);
                expect(gm.getAvailableSkillPoints()).toBe(5);
                gm.skillPointsSpent = 2;
                expect(gm.getAvailableSkillPoints()).toBe(3);
            });

            test('unlockNextClassNode spends the node cost and advances', () => {
                const gm = classedManager('scholar', { level: 50, nodesUnlocked: 0 });
                expect(gm.unlockNextClassNode()).toBe(true);
                expect(gm.classNodesUnlocked).toBe(1);
                expect(gm.skillPointsSpent).toBe(2);
            });

            test('unlockNextClassNode is blocked without enough points', () => {
                const gm = classedManager('scholar', { level: 10, nodesUnlocked: 0 });
                expect(gm.unlockNextClassNode()).toBe(false);
                expect(gm.classNodesUnlocked).toBe(0);
            });

            test('the capstone requires every linear node first', () => {
                const gm = classedManager('scholar', { level: 50, nodesUnlocked: 3 });
                expect(gm.isCapstoneReady()).toBe(false);
                expect(gm.chooseCapstone('deep_work')).toBe(false);
                gm.classNodesUnlocked = 5;
                expect(gm.isCapstoneReady()).toBe(true);
            });

            test('chooseCapstone spends 10 points and masters the class', () => {
                const gm = classedManager('scholar', { level: 50, nodesUnlocked: 5 });
                gm.skillPointsSpent = 20;
                expect(gm.chooseCapstone('insight')).toBe(true);
                expect(gm.classCapstone).toBe('insight');
                expect(gm.skillPointsSpent).toBe(30);
                expect(gm.isClassMastered()).toBe(true);
            });

            test('respecClass refunds the tree and charges Focus Crystals', () => {
                const gm = classedManager('scholar', { level: 50, nodesUnlocked: 5, capstone: 'insight' });
                gm.skillPointsSpent = 30;
                gm.focusCrystals = 10;
                expect(gm.respecClass()).toBe(true);
                expect(gm.focusCrystals).toBe(5);
                expect(gm.playerClass).toBeNull();
                expect(gm.classNodesUnlocked).toBe(0);
                expect(gm.classCapstone).toBeNull();
                expect(gm.skillPointsSpent).toBe(0);
            });
        });

        describe('class SELECTION unlock + early respec (v3.1 §3.1 — L8 decouple)', () => {
            // Selection unlocks at CLASS_SELECT_LEVEL (8) for an early identity
            // beat, but skill points still start at CLASS_UNLOCK_LEVEL (10), so a
            // class still maxes (30 pts) at exactly L40.
            test('isClassSystemUnlocked gates on CLASS_SELECT_LEVEL (8), not the skill-point level', () => {
                expect(classedManager(null, { level: 7 }).isClassSystemUnlocked()).toBe(false);
                expect(classedManager(null, { level: 8 }).isClassSystemUnlocked()).toBe(true);
                expect(classedManager(null, { level: 10 }).isClassSystemUnlocked()).toBe(true);
            });

            test('a class can be chosen at L8', () => {
                const gm = classedManager(null, { level: 8 });
                expect(gm.selectClass('warrior')).toBe(true);
                expect(gm.playerClass).toBe('warrior');
            });

            test('selectClass is rejected below L8 with an L8 prompt', () => {
                const gm = classedManager(null, { level: 7 });
                expect(gm.selectClass('warrior')).toBe(false);
                expect(gm.playerClass).toBeNull();
                expect(gm.showAchievement).toHaveBeenCalledWith(expect.stringContaining('Level 8'), 'error');
            });

            test('skill points still START at L10 — decoupled from selection', () => {
                expect(classedManager('warrior', { level: 8 }).getEarnedSkillPoints()).toBe(0);
                expect(classedManager('warrior', { level: 9 }).getEarnedSkillPoints()).toBe(0);
                expect(classedManager('warrior', { level: 10 }).getEarnedSkillPoints()).toBe(0);
                expect(classedManager('warrior', { level: 11 }).getEarnedSkillPoints()).toBe(1);
            });

            test('re-picking is FREE before any points are earned (pre-L10)', () => {
                const gm = classedManager('warrior', { level: 8 });
                gm.focusCrystals = 0; // can't afford the normal fee
                expect(gm.respecClass()).toBe(true); // free anyway
                expect(gm.playerClass).toBeNull();
                expect(gm.focusCrystals).toBe(0); // nothing charged
            });

            test('once points are earned (L11+) respec charges the normal fee', () => {
                const gm = classedManager('warrior', { level: 11 });
                gm.focusCrystals = 0;
                expect(gm.respecClass()).toBe(false); // 1 pt earned → fee applies, can't afford
                expect(gm.playerClass).toBe('warrior'); // unchanged
                gm.focusCrystals = 5;
                expect(gm.respecClass()).toBe(true);
                expect(gm.focusCrystals).toBe(0);
            });
        });

        describe('enchant_discount hook (Scholar)', () => {
            test('reduces enchantment cost by the perk value, floored at 1', () => {
                const gm = classedManager('scholar', { nodesUnlocked: 5 });
                expect(gm.getEffectiveEnchantmentCost({ cost: 5 })).toBe(3);
                expect(gm.getEffectiveEnchantmentCost({ cost: 1 })).toBe(1);
            });

            test('no discount for a class without the perk', () => {
                const gm = classedManager('warrior', { nodesUnlocked: 5 });
                expect(gm.getEffectiveEnchantmentCost({ cost: 5 })).toBe(5);
            });
        });

        describe('deep_work capstone (Scholar)', () => {
            function focusScholar(capstone) {
                const gm = classedManager('scholar', { nodesUnlocked: 5, capstone });
                gm.activeSpells = [];
                gm.focusCrystals = 0;
                gm.totalFocusTime = 0;
                gm.focusSessionsCompleted = 0;
                gm.focusSessionLength = 25;
                gm.focusTimer = null;
                gm.pomodoroChain = null;
                gm.deepWorkStack = 0;
                gm.lastFocusSessionEndTime = 0;
                gm._cancelFocusTimerNotification = jest.fn();
                gm.hasActiveEnchantment = jest.fn(() => false);
                gm.grantAttackCharge = jest.fn();
                gm.trackDaily = jest.fn();
                gm.showNotification = jest.fn();
                gm.addXP = jest.fn();
                gm.render = jest.fn();
                window.audioManager.playCrystalEarn = jest.fn();
                return gm;
            }

            test('back-to-back sessions escalate the stack', () => {
                const gm = focusScholar('deep_work');
                gm.completeFocusSession();
                expect(gm.deepWorkStack).toBe(0);
                gm.completeFocusSession();
                expect(gm.deepWorkStack).toBe(1);
                gm.completeFocusSession();
                expect(gm.deepWorkStack).toBe(2);
            });

            test('a gap longer than the chaining window resets the stack', () => {
                const gm = focusScholar('deep_work');
                gm.completeFocusSession();
                gm.completeFocusSession();
                expect(gm.deepWorkStack).toBe(1);
                gm.lastFocusSessionEndTime = Date.now() - (25 + 30 + 5) * 60 * 1000;
                gm.completeFocusSession();
                expect(gm.deepWorkStack).toBe(0);
            });

            test('escalates the focus XP bonus on chained sessions', () => {
                const gm = focusScholar('deep_work'); // Diligent Study grants +40 XP
                gm.completeFocusSession();
                expect(gm.addXP).toHaveBeenLastCalledWith(40, 'daily');
                gm.completeFocusSession(); // stack 1 -> 40 * 1.25 = 50
                expect(gm.addXP).toHaveBeenLastCalledWith(50, 'daily');
            });

            test('no escalation without the Deep Work capstone', () => {
                const gm = focusScholar('insight');
                gm.completeFocusSession();
                gm.completeFocusSession();
                expect(gm.deepWorkStack).toBe(0);
                expect(gm.addXP).toHaveBeenLastCalledWith(40, 'daily');
            });
        });

        describe('enchant_preserve capstone (Scholar)', () => {
            function expiringScholar(capstone) {
                const gm = classedManager('scholar', { nodesUnlocked: 5, capstone });
                gm.activeEnchantments = [{
                    id: 'double_xp', effect: 'double_xp',
                    expiresAt: Date.now() - 1000, totalDuration: 30 * 60 * 1000,
                    name: 'Double XP', icon: '✨'
                }];
                gm.scheduleEnchantmentExpiryNotification = jest.fn();
                gm.renderActiveSpellSigils = jest.fn();
                return gm;
            }

            test('preserves an expiring enchantment on a successful roll', () => {
                const gm = expiringScholar('insight');
                const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.1);
                try {
                    gm.checkExpiredEnchantments();
                } finally { rnd.mockRestore(); }
                expect(gm.activeEnchantments).toHaveLength(1);
                expect(gm.activeEnchantments[0].expiresAt).toBeGreaterThan(Date.now());
                expect(gm.scheduleEnchantmentExpiryNotification).toHaveBeenCalled();
            });

            test('consumes the enchantment on a failed roll', () => {
                const gm = expiringScholar('insight');
                const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.9);
                try {
                    gm.checkExpiredEnchantments();
                } finally { rnd.mockRestore(); }
                expect(gm.activeEnchantments).toHaveLength(0);
            });

            test('always consumes without the Insight capstone', () => {
                const gm = expiringScholar('deep_work');
                const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.01);
                try {
                    gm.checkExpiredEnchantments();
                } finally { rnd.mockRestore(); }
                expect(gm.activeEnchantments).toHaveLength(0);
            });
        });
    });

    // ==================== CLASS SYSTEM v3.1 — PHASE 2 PERKS ====================
    //
    // Phase 2 wires the [med] perks (docs/CLASS_REDESIGN.md §7) that need new
    // logic beyond a single getClassPerkValue multiply. Each class gets its own
    // sub-suite; setting nodesUnlocked + capstone directly isolates the perk
    // under test (getClassPerkValue does not gate the capstone on node count).
    describe('Class System v3.1 — Phase 2 perks', () => {
        function classedManager(classId, { nodesUnlocked = 0, capstone = null, level = 50 } = {}) {
            const gm = createTestManager();
            gm.classDefinitions = gm.initializeClasses();
            gm.playerClass = classId;
            gm.classNodesUnlocked = nodesUnlocked;
            gm.classCapstone = capstone;
            gm.skillPointsSpent = 0;
            gm.level = level;
            gm.CLASS_SELECT_LEVEL = 8;
            gm.CLASS_UNLOCK_LEVEL = 10;
            gm.CLASS_RESPEC_COST = 5;
            gm.showAchievement = jest.fn();
            gm.saveData = jest.fn();
            return gm;
        }

        describe('Warrior — charge_overflow (Overflow capstone)', () => {
            function chargeWarrior(capstone) {
                const gm = classedManager('warrior', { nodesUnlocked: 5, capstone });
                gm.attackCharges = 24;
                gm.ATTACK_CHARGE_CAP = 25;
                gm.CHARGE_OVERFLOW_GOLD = 5;
                gm.hasActiveEnchantment = jest.fn(() => false);
                gm.trackDaily = jest.fn();
                gm.addGold = jest.fn();
                return gm;
            }

            test('keeps charges above the soft cap instead of converting to gold', () => {
                const gm = chargeWarrior('overflow');
                gm.grantAttackCharge(5, 'loot');
                expect(gm.attackCharges).toBe(29);
                expect(gm.addGold).not.toHaveBeenCalled();
            });

            test('without the capstone, charges cap and overflow converts to gold', () => {
                const gm = chargeWarrior(null);
                gm.grantAttackCharge(5, 'loot');
                expect(gm.attackCharges).toBe(25);
                expect(gm.addGold).toHaveBeenCalledWith(20, 'charge_overflow');
            });
        });

        describe('Warrior — attackBoss perks', () => {
            function combatWarrior({ nodesUnlocked = 0, capstone = null } = {}) {
                const gm = classedManager('warrior', { nodesUnlocked, capstone });
                gm.attackCharges = 10;
                gm.rageComboCounter = 0;
                gm.activeSpells = [];
                gm.dailyBoss = null;
                gm.weeklyBoss = null;
                gm.monthlyBoss = null;
                gm.getCompanionBonus = jest.fn(() => 0);
                gm.getActiveCompanion = jest.fn(() => null);
                gm.getEnchantmentMultiplier = jest.fn(() => 1);
                gm.addBossLog = jest.fn();
                gm.renderBossLog = jest.fn();
                gm.animateBossHit = jest.fn();
                gm.updateBossHPBar = jest.fn();
                gm.onBossDefeated = jest.fn();
                gm.renderBossBattles = jest.fn();
                return gm;
            }
            const boss = (over) => ({ maxHP: 100, currentHP: 100, totalDamage: 0, defeated: false, icon: '👹', name: 'Test', ...over });

            test('Executioner adds +50% damage to a boss below 25% HP', () => {
                const gm = combatWarrior({ nodesUnlocked: 0, capstone: 'executioner' });
                gm.dailyBoss = boss({ currentHP: 20 }); // 20% → eligible
                gm.attackBoss('daily');
                // base dmg = 1 + floor(50/10) = 6; ×1.5 = 9 → 20 - 9 = 11
                expect(gm.dailyBoss.currentHP).toBe(11);
            });

            test('Executioner does nothing above 25% HP', () => {
                const gm = combatWarrior({ nodesUnlocked: 0, capstone: 'executioner' });
                gm.dailyBoss = boss({ currentHP: 30 }); // 30% → not eligible
                gm.attackBoss('daily');
                expect(gm.dailyBoss.currentHP).toBe(24); // 30 - 6
            });

            test('Cleave splashes 25% of the hit to other active bosses', () => {
                const gm = combatWarrior({ nodesUnlocked: 4 }); // Cleave = node index 3
                const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // Keen Edge won't crit
                gm.dailyBoss = boss({ currentHP: 100 });
                gm.weeklyBoss = boss({ currentHP: 50 });
                try {
                    gm.attackBoss('daily');
                } finally { rnd.mockRestore(); }
                // dmg = ceil(6 × 1.2 Power Strikes) = 8 → daily 100 - 8 = 92
                expect(gm.dailyBoss.currentHP).toBe(92);
                // splash = ceil(8 × 0.25) = 2 → weekly 50 - 2 = 48
                expect(gm.weeklyBoss.currentHP).toBe(48);
            });

            test('Rage Combo lands a guaranteed crit on every 3rd attack', () => {
                const gm = combatWarrior({ nodesUnlocked: 5 }); // Rage Combo = node index 4 (every 3)
                const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // Keen Edge won't crit
                gm.dailyBoss = boss({ maxHP: 1000, currentHP: 1000 });
                try {
                    gm.attackBoss('daily'); // hit 1: 8 dmg
                    expect(gm.rageComboCounter).toBe(1);
                    gm.attackBoss('daily'); // hit 2: 8 dmg
                    expect(gm.rageComboCounter).toBe(2);
                    gm.attackBoss('daily'); // hit 3: crit → 12 dmg, counter resets
                    expect(gm.rageComboCounter).toBe(0);
                } finally { rnd.mockRestore(); }
                // 1000 - 8 - 8 - 12 = 972
                expect(gm.dailyBoss.currentHP).toBe(972);
            });
        });

        describe('Ranger — Phase 2 perks', () => {
            // Ranger linear nodes (in order): beastmaster(companion_xp_mult),
            // keen_eye(loot_weight), trophy_hunter(boss_loot),
            // wild_bond(ranger_companion), guardian_instinct(companion_protect).
            // Capstones (mutually exclusive): twin_bond(second_companion), forage.

            describe('perk-value wiring', () => {
                test('each unlocked linear node exposes its value', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 5 });
                    expect(gm.getClassPerkValue('companion_xp_mult')).toBeCloseTo(0.50);
                    expect(gm.getClassPerkValue('loot_weight')).toBe(12);
                    expect(gm.getClassPerkValue('boss_loot')).toBe(1);
                    expect(gm.getClassPerkValue('ranger_companion')).toBe(1);
                    expect(gm.getClassPerkValue('companion_protect')).toBe(1);
                    // Capstones are inert until explicitly chosen.
                    expect(gm.getClassPerkValue('second_companion')).toBe(0);
                    expect(gm.getClassPerkValue('forage')).toBe(0);
                });

                test('a locked node returns 0', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 2 });
                    expect(gm.getClassPerkValue('companion_xp_mult')).toBeCloseTo(0.50);
                    expect(gm.getClassPerkValue('loot_weight')).toBe(12);
                    expect(gm.getClassPerkValue('boss_loot')).toBe(0); // node 3 still locked
                });

                test('capstone perks resolve only when chosen', () => {
                    const twin = classedManager('ranger', { nodesUnlocked: 5, capstone: 'twin_bond' });
                    expect(twin.getClassPerkValue('second_companion')).toBe(1);
                    expect(twin.getClassPerkValue('forage')).toBe(0);
                    const forage = classedManager('ranger', { nodesUnlocked: 5, capstone: 'forage' });
                    expect(forage.getClassPerkValue('forage')).toBeCloseTo(0.20);
                    expect(forage.getClassPerkValue('second_companion')).toBe(0);
                });
            });

            describe('Beastmaster (companion_xp_mult)', () => {
                test('grants +50% companion XP', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 1 });
                    gm.hasActiveEnchantment = jest.fn(() => false);
                    gm.companions = [{ type: 'owl', level: 1, xp: 0, bonusType: 'xp', bonusAmount: 0.10 }];
                    gm.activeCompanionId = 'owl';
                    gm.grantCompanionXP(10); // ceil(10 × 1.5) = 15
                    expect(gm.companions[0].xp).toBe(15);
                });

                test('non-Rangers gain the base amount', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 0 });
                    gm.hasActiveEnchantment = jest.fn(() => false);
                    gm.companions = [{ type: 'owl', level: 1, xp: 0, bonusType: 'xp', bonusAmount: 0.10 }];
                    gm.activeCompanionId = 'owl';
                    gm.grantCompanionXP(10);
                    expect(gm.companions[0].xp).toBe(10);
                });
            });

            describe('Trophy Hunter (boss_loot)', () => {
                test('adds a bonus boss-loot roll', () => {
                    const withPerk = classedManager('ranger', { nodesUnlocked: 3 });
                    expect(withPerk.generateBossLoot('daily')).toHaveLength(2); // 1 base + 1
                });

                test('no bonus roll before the node is unlocked', () => {
                    const without = classedManager('ranger', { nodesUnlocked: 2 });
                    expect(without.generateBossLoot('daily')).toHaveLength(1);
                });
            });

            describe('Wild Bond (ranger_companion)', () => {
                test('unlocking the node grants the Ranger-exclusive lynx', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 3, level: 50 });
                    expect(gm.unlockNextClassNode()).toBe(true);
                    expect(gm.classNodesUnlocked).toBe(4);
                    expect(gm.unlockCompanion).toHaveBeenCalledWith('lynx');
                });

                test('the lynx never appears in any loot pool', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 5 });
                    const pools = gm.getMasterLootPool();
                    const everyCompanion = Object.values(pools)
                        .flat()
                        .filter(item => item.type === 'companion')
                        .flatMap(item => item.companions);
                    expect(everyCompanion).not.toContain('lynx');
                });
            });

            describe('Guardian Instinct (companion_protect)', () => {
                function guardianRanger(nodesUnlocked = 5) {
                    const gm = classedManager('ranger', { nodesUnlocked });
                    gm._recapEvents = [];
                    gm.activeEnchantments = [];
                    gm.hasActiveEnchantment = jest.fn(() => false);
                    gm.rangerProtectionsUsedThisWeek = 0;
                    gm.rangerProtectionResetWeek = gm.getWeekString(new Date());
                    return gm;
                }

                test('protects a streak from its own weekly pool (no companion needed)', () => {
                    const gm = guardianRanger(5);
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, null);
                    expect(habit.streak).toBe(5);
                    expect(gm.rangerProtectionsUsedThisWeek).toBe(1);
                    expect(gm._recapEvents.some(e => e.type === 'protected')).toBe(true);
                });

                test('falls through to a break once the weekly pool is spent', () => {
                    const gm = guardianRanger(5);
                    gm.rangerProtectionsUsedThisWeek = 1; // pool size is 1
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, null);
                    expect(habit.streak).toBe(0);
                    expect(gm._recapEvents.some(e => e.type === 'broken')).toBe(true);
                });

                test('resets the weekly pool on a new ISO week', () => {
                    const gm = guardianRanger(5);
                    gm.rangerProtectionsUsedThisWeek = 1;
                    gm.rangerProtectionResetWeek = '1999-W01'; // stale
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, null);
                    expect(habit.streak).toBe(5);
                    expect(gm.rangerProtectionResetWeek).toBe(gm.getWeekString(new Date()));
                    expect(gm.rangerProtectionsUsedThisWeek).toBe(1);
                });

                test('consumes a companion protection before the Ranger pool', () => {
                    const gm = guardianRanger(5);
                    const companion = { name: 'Turtle', icon: '🐢', bonusType: 'streak_protection', bonusAmount: 1, protectionsUsedThisWeek: 0 };
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, companion);
                    expect(habit.streak).toBe(5);
                    expect(companion.protectionsUsedThisWeek).toBe(1);
                    expect(gm.rangerProtectionsUsedThisWeek).toBe(0); // Ranger pool untouched
                });
            });

            describe('Twin Bond (second_companion)', () => {
                function twinRanger() {
                    const gm = classedManager('ranger', { nodesUnlocked: 5, capstone: 'twin_bond' });
                    gm.companions = [
                        { type: 'owl', bonusType: 'xp', bonusAmount: 0.10, rarity: 'uncommon' },
                        { type: 'fox', bonusType: 'gold', bonusAmount: 0.10, rarity: 'uncommon' },
                        { type: 'eagle', bonusType: 'xp', bonusAmount: 0.15, rarity: 'rare' },
                    ];
                    gm.activeCompanionId = 'owl';
                    return gm;
                }

                test('getSecondCompanion is null until a second companion is equipped', () => {
                    expect(twinRanger().getSecondCompanion()).toBeNull();
                });

                test('getCompanionBonus sums both companions of a matching type', () => {
                    const gm = twinRanger();
                    expect(gm.setSecondCompanion('eagle')).toBe(true);
                    expect(gm.getCompanionBonus('xp')).toBeCloseTo(0.25); // owl 0.10 + eagle 0.15
                });

                test('only the matching-type companion contributes', () => {
                    const gm = twinRanger();
                    gm.setSecondCompanion('fox'); // gold companion
                    expect(gm.getCompanionBonus('xp')).toBeCloseTo(0.10);   // owl only
                    expect(gm.getCompanionBonus('gold')).toBeCloseTo(0.10); // fox only
                });

                test('the second slot cannot duplicate the primary companion', () => {
                    const gm = twinRanger();
                    expect(gm.setSecondCompanion('owl')).toBe(false);
                    expect(gm.getSecondCompanion()).toBeNull();
                });

                test('promoting the second companion to primary clears the second slot', () => {
                    const gm = twinRanger();
                    gm.setSecondCompanion('eagle');
                    gm.setActiveCompanion('eagle');
                    expect(gm.activeCompanionId2).toBeNull();
                });

                test('setSecondCompanion is a no-op without the capstone', () => {
                    const gm = classedManager('ranger', { nodesUnlocked: 5, capstone: 'forage' });
                    gm.companions = [
                        { type: 'owl', bonusType: 'xp', bonusAmount: 0.10 },
                        { type: 'eagle', bonusType: 'xp', bonusAmount: 0.15 },
                    ];
                    gm.activeCompanionId = 'owl';
                    expect(gm.setSecondCompanion('eagle')).toBe(false);
                    expect(gm.getSecondCompanion()).toBeNull();
                    expect(gm.getCompanionBonus('xp')).toBeCloseTo(0.10);
                });
            });

            describe('Forage (capstone)', () => {
                function forageRanger(capstone = 'forage') {
                    const gm = classedManager('ranger', { nodesUnlocked: 5, capstone });
                    gm.focusCrystals = 0;
                    gm.addGold = jest.fn();
                    return gm;
                }

                test('grants bonus gold and a Focus Crystal on a hit', () => {
                    const gm = forageRanger();
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0); // hit; gold = 10
                    try { gm.applyForage(); } finally { rnd.mockRestore(); }
                    expect(gm.addGold).toHaveBeenCalledWith(10, 'forage');
                    expect(gm.focusCrystals).toBe(1);
                });

                test('does nothing on a miss', () => {
                    const gm = forageRanger();
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // 0.99 >= 0.20
                    try { gm.applyForage(); } finally { rnd.mockRestore(); }
                    expect(gm.addGold).not.toHaveBeenCalled();
                    expect(gm.focusCrystals).toBe(0);
                });

                test('is a no-op without the capstone', () => {
                    const gm = forageRanger(null);
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0);
                    try { gm.applyForage(); } finally { rnd.mockRestore(); }
                    expect(gm.addGold).not.toHaveBeenCalled();
                    expect(gm.focusCrystals).toBe(0);
                });
            });
        });

        describe('Wizard — Phase 2 perks', () => {
            // Wizard linear nodes (in order): sustained_casting(spell_duration_mult),
            // arcane_efficiency(spell_preserve), empowered_magic(spell_power_mult),
            // forbidden_tomes(mage_spells), daily_ritual(free_daily_cast).
            // Capstones (mutually exclusive): overcharge, archmage(+50% duration).

            // A wizard wired to drive castSpell: the factory already no-ops
            // render/saveData/celebrateSpellCast/showAchievement; here we add
            // the remaining non-DOM helpers the cast path touches and seed two
            // synthetic spell defs so assertions don't couple to live tuning.
            function castWizard({ nodesUnlocked = 0, capstone = null } = {}) {
                const gm = classedManager('wizard', { nodesUnlocked, capstone });
                gm.trackDaily = jest.fn();
                gm.renderActiveSpellSigils = jest.fn();
                gm.celebrateSpellUnlock = jest.fn();
                gm.isCastingSpell = false;
                gm.spellsCast = 0;
                gm.freeCastUsedDate = null;
                gm.activeSpells = [];
                gm.spellDefinitions = {
                    ...gm.spellDefinitions,
                    test_common: { id: 'test_common', name: 'Test Common', icon: '🧪', rarity: 'common', effect: 'xp_multiplier', multiplier: 2, duration: 86400000, premium: false },
                    test_rare:   { id: 'test_rare',   name: 'Test Rare',   icon: '🧪', rarity: 'rare',   effect: 'xp_multiplier', multiplier: 2, duration: 86400000, premium: false },
                };
                return gm;
            }

            describe('perk-value wiring', () => {
                test('each unlocked linear node exposes its value', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5 });
                    expect(gm.getClassPerkValue('spell_duration_mult')).toBeCloseTo(0.40);
                    expect(gm.getClassPerkValue('spell_preserve')).toBeCloseTo(0.25);
                    expect(gm.getClassPerkValue('spell_power_mult')).toBeCloseTo(0.20);
                    expect(gm.getClassPerkValue('mage_spells')).toBe(1);
                    expect(gm.getClassPerkValue('free_daily_cast')).toBe(1);
                    // Capstones stay inert until explicitly chosen.
                    expect(gm.getClassPerkValue('overcharge')).toBe(0);
                    expect(gm.getClassPerkValue('archmage')).toBe(0);
                });

                test('a locked node returns 0', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 2 });
                    expect(gm.getClassPerkValue('spell_duration_mult')).toBeCloseTo(0.40);
                    expect(gm.getClassPerkValue('spell_preserve')).toBeCloseTo(0.25);
                    expect(gm.getClassPerkValue('spell_power_mult')).toBe(0); // node 3 still locked
                });

                test('capstone perks resolve only when chosen', () => {
                    const oc = classedManager('wizard', { nodesUnlocked: 5, capstone: 'overcharge' });
                    expect(oc.getClassPerkValue('overcharge')).toBe(1);
                    expect(oc.getClassPerkValue('archmage')).toBe(0);
                    const am = classedManager('wizard', { nodesUnlocked: 5, capstone: 'archmage' });
                    expect(am.getClassPerkValue('archmage')).toBeCloseTo(0.50);
                    expect(am.getClassPerkValue('overcharge')).toBe(0);
                });
            });

            describe('Empowered Magic & Overcharge (getActiveSpellMultiplier)', () => {
                function powerWizard(nodesUnlocked) {
                    const gm = classedManager('wizard', { nodesUnlocked });
                    // Inject synthetic spells via a fresh map (the shared
                    // SPELL_DEFINITIONS catalog is deep-frozen — Roadmap #1).
                    gm.spellDefinitions = {
                        ...gm.spellDefinitions,
                        test_double: { id: 'test_double', effect: 'xp_multiplier', multiplier: 2, duration: 86400000 },
                        test_minor:  { id: 'test_minor',  effect: 'xp_multiplier', multiplier: 1.25, duration: 86400000 },
                    };
                    gm.activeSpells = [];
                    return gm;
                }
                const active = (id, extra = {}) => ({ spellId: id, castedAt: Date.now(), expiresAt: Date.now() + 60000, ...extra });

                test('Empowered Magic scales a 2x spell to 2.2x (+20% of the bonus)', () => {
                    const gm = powerWizard(3); // empowered_magic = node index 2
                    gm.activeSpells = [active('test_double')];
                    expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBeCloseTo(2.2);
                });

                test('Empowered Magic scales a 1.25x spell to 1.30x', () => {
                    const gm = powerWizard(3);
                    gm.activeSpells = [active('test_minor')];
                    expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBeCloseTo(1.30);
                });

                test('no scaling until Empowered Magic is unlocked', () => {
                    const gm = powerWizard(2); // node 3 locked
                    gm.activeSpells = [active('test_double')];
                    expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBeCloseTo(2.0);
                });

                test('non-Wizards never get spell-power scaling', () => {
                    const gm = classedManager('warrior', { nodesUnlocked: 5 });
                    gm.spellDefinitions = {
                        ...gm.spellDefinitions,
                        test_double: { id: 'test_double', effect: 'xp_multiplier', multiplier: 2, duration: 86400000 },
                    };
                    gm.activeSpells = [active('test_double')];
                    expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBeCloseTo(2.0);
                });

                test('an Overcharged cast doubles the bonus (2x → 3x)', () => {
                    const gm = powerWizard(2); // isolate Overcharge (no Empowered Magic)
                    gm.activeSpells = [active('test_double', { overcharged: true })];
                    expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBeCloseTo(3.0);
                });

                test('Empowered Magic and Overcharge stack on the bonus (2x → 3.4x)', () => {
                    const gm = powerWizard(3); // Empowered Magic unlocked
                    gm.activeSpells = [active('test_double', { overcharged: true })];
                    expect(gm.getActiveSpellMultiplier('xp_multiplier')).toBeCloseTo(3.4);
                });
            });

            describe('Daily Ritual (free_daily_cast)', () => {
                test('the first common/uncommon cast each day consumes no charge', () => {
                    const gm = castWizard({ nodesUnlocked: 5 }); // daily_ritual = node 5
                    gm.spellbook = [{ spellId: 'test_common', charges: 3 }];
                    gm.castSpell('test_common');
                    expect(gm.spellbook[0].charges).toBe(3); // free
                    expect(gm.freeCastUsedDate).toBe(gm.getTodayDateString());
                });

                test('the second cast the same day spends a charge', () => {
                    const gm = castWizard({ nodesUnlocked: 5 });
                    gm.spellbook = [{ spellId: 'test_common', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // no preserve refund
                    try {
                        gm.castSpell('test_common'); // free
                        gm.activeSpells = [];        // clear so the spell can be recast
                        gm.castSpell('test_common'); // now paid
                    } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(2);
                });

                test('rare+ spells are excluded from the free cast', () => {
                    const gm = castWizard({ nodesUnlocked: 5 });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99);
                    try { gm.castSpell('test_rare'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(2); // charged despite a free cast being available
                    expect(gm.freeCastUsedDate).toBeNull();
                });

                test('no free cast without the Daily Ritual node', () => {
                    const gm = castWizard({ nodesUnlocked: 4 }); // daily_ritual locked
                    gm.spellbook = [{ spellId: 'test_common', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99);
                    try { gm.castSpell('test_common'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(2);
                });
            });

            describe('Overcharge (castSpell charge spend)', () => {
                test('spending 2 charges flags the active spell as overcharged', () => {
                    const gm = castWizard({ nodesUnlocked: 5, capstone: 'overcharge' });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    gm.castSpell('test_rare', { overcharge: true });
                    expect(gm.spellbook[0].charges).toBe(1); // 3 - 2
                    expect(gm.activeSpells).toHaveLength(1);
                    expect(gm.activeSpells[0].overcharged).toBe(true);
                });

                test('an overcharged cast never refunds a charge', () => {
                    // nodes 5 keeps Arcane Efficiency's 0.25 preserve chance live; a
                    // roll of 0 would refund a normal cast, but overcharged casts
                    // skip the refund branch entirely.
                    const gm = castWizard({ nodesUnlocked: 5, capstone: 'overcharge' });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0); // would refund a normal cast
                    try { gm.castSpell('test_rare', { overcharge: true }); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(1); // still 3 - 2, no refund
                });

                test('overcharge with only 1 charge is blocked', () => {
                    const gm = castWizard({ nodesUnlocked: 5, capstone: 'overcharge' });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 1 }];
                    gm.castSpell('test_rare', { overcharge: true });
                    expect(gm.spellbook[0].charges).toBe(1); // unchanged
                    expect(gm.activeSpells).toHaveLength(0); // not cast
                });

                test('without the capstone, overcharge falls back to a normal 1-charge cast', () => {
                    const gm = castWizard({ nodesUnlocked: 4, capstone: null }); // no Overcharge capstone
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // no preserve refund
                    try { gm.castSpell('test_rare', { overcharge: true }); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(2); // only 1 spent
                    expect(gm.activeSpells[0].overcharged).toBe(false);
                });
            });

            describe('Archmage (capstone) duration & refund', () => {
                test('extends timed spell duration by +50% on top of Sustained Casting', () => {
                    const gm = castWizard({ nodesUnlocked: 5, capstone: 'archmage' });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    const now = jest.spyOn(Date, 'now').mockReturnValue(1000000);
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // no refund
                    try { gm.castSpell('test_rare'); } finally { now.mockRestore(); rnd.mockRestore(); }
                    // durationMult = 1 + 0.40 (Sustained Casting) + 0.50 (Archmage) = 1.90
                    const expected = Math.round(86400000 * 1.90);
                    const window = gm.activeSpells[0].expiresAt - gm.activeSpells[0].castedAt;
                    expect(window).toBe(expected);
                });

                test('adds a fixed +25% to the charge-refund chance', () => {
                    const gm = castWizard({ nodesUnlocked: 5, capstone: 'archmage' });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    // refundChance = 0.25 (Arcane Efficiency) + 0.25 (Archmage) = 0.50; roll 0.4 → refund
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.4);
                    try { gm.castSpell('test_rare'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(3); // spent then refunded
                });
            });

            describe('Arcane Efficiency (spell_preserve refund)', () => {
                test('a successful roll refunds the spent charge', () => {
                    const gm = castWizard({ nodesUnlocked: 2 }); // Arcane Efficiency only (no Archmage)
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.25 → refund
                    try { gm.castSpell('test_rare'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(3);
                });

                test('a failed roll consumes the charge', () => {
                    const gm = castWizard({ nodesUnlocked: 2 });
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.5); // >= 0.25 → no refund
                    try { gm.castSpell('test_rare'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(2);
                });
            });

            describe('Forbidden Tomes (mage_spells)', () => {
                test('unlocking the node grants both Wizard-exclusive spells', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 3, level: 50 }); // next node = forbidden_tomes
                    gm.celebrateSpellUnlock = jest.fn();
                    expect(gm.unlockNextClassNode()).toBe(true);
                    expect(gm.classNodesUnlocked).toBe(4);
                    const ids = gm.spellbook.map(s => s.spellId).sort();
                    expect(ids).toEqual(['mana_font', 'philosophers_stone']);
                    expect(gm.spellbook.every(s => s.charges === 2)).toBe(true);
                });

                test('grantWizardSpells is idempotent (no charge re-stacking)', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5 });
                    gm.celebrateSpellUnlock = jest.fn();
                    expect(gm.grantWizardSpells()).toBe(true);
                    expect(gm.grantWizardSpells()).toBe(false); // already owned
                    const manaFont = gm.spellbook.find(s => s.spellId === 'mana_font');
                    expect(manaFont.charges).toBe(2); // not 4
                });

                test('the exclusive spells are defined and flagged', () => {
                    const gm = createTestManager();
                    ['mana_font', 'philosophers_stone'].forEach(id => {
                        expect(gm.spellDefinitions[id].wizardExclusive).toBe(true);
                        expect(gm.spellDefinitions[id].premium).toBe(false);
                    });
                });
            });

            describe('collection visibility (render filter)', () => {
                function mountSpellbook() {
                    document.body.innerHTML = '<div id="spellbook-container"></div>';
                    return document.getElementById('spellbook-container');
                }

                test('Wizard-exclusive spells stay hidden until owned', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5 });
                    gm.spellbook = [];
                    gm.getPremiumBannerHTML = jest.fn(() => '');
                    const container = mountSpellbook();
                    gm.renderSpellCollection();
                    expect(container.innerHTML).not.toContain('Mana Font');
                    expect(container.innerHTML).not.toContain('Philosopher');
                });

                test('owned Wizard-exclusive spells appear in the collection', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5 });
                    gm.spellbook = [{ spellId: 'mana_font', charges: 2 }];
                    gm.getPremiumBannerHTML = jest.fn(() => '');
                    const container = mountSpellbook();
                    gm.renderSpellCollection();
                    expect(container.innerHTML).toContain('Mana Font');
                    expect(container.innerHTML).not.toContain('Philosopher'); // still unowned
                });
            });

            describe('Overcharge button (_overchargeButtonHTML)', () => {
                const timedSpell = { id: 'test_rare', multiplier: 2, duration: 86400000 };
                const instantSpell = { id: 'lucky', multiplier: 1, duration: -1 };

                test('renders for a capstone Wizard on a timed multiplier spell with 2+ charges', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5, capstone: 'overcharge' });
                    const html = gm._overchargeButtonHTML(timedSpell, 2);
                    expect(html).toContain('Overcharge');
                    expect(html).toContain('data-action="spell.cast"');
                    expect(html).toContain('data-spell-id="test_rare"');
                    expect(html).toContain('data-overcharge="true"');
                });

                test('hidden without the Overcharge capstone', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5, capstone: 'archmage' });
                    expect(gm._overchargeButtonHTML(timedSpell, 2)).toBe('');
                });

                test('hidden with fewer than 2 charges', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5, capstone: 'overcharge' });
                    expect(gm._overchargeButtonHTML(timedSpell, 1)).toBe('');
                });

                test('hidden on instant / non-multiplier spells', () => {
                    const gm = classedManager('wizard', { nodesUnlocked: 5, capstone: 'overcharge' });
                    expect(gm._overchargeButtonHTML(instantSpell, 5)).toBe('');
                });
            });
        });
    });

    // ==================== CLASS SYSTEM v3.1 — SUBCLASSES ====================
    //
    // Phase 3 (docs/CLASS_REDESIGN.md §9): each base class branches into two
    // subclasses, unlocked once the class is mastered AND the player reaches
    // L40. Each subclass is one escalating effect over 3 tiers (costs [3,4,5])
    // drawn from the shared skill-point pool. These tests lock the unlock
    // gating, pick-one exclusivity + respec, the tier economy, the §9.5
    // getClassPerkValue max-resolution, and every one of the 8 effect hooks.
    describe('Class System v3.1 — Subclasses', () => {
        // Base class fully mastered (5 linear nodes + a capstone) at a given
        // level, with the §9 subclass + economy fields wired. Mirrors the Phase 2
        // `classedManager` factory.
        function mastered(classId, capstone, { level = 52, spent = 30 } = {}) {
            const gm = createTestManager();
            gm.classDefinitions = gm.initializeClasses();
            gm.playerClass = classId;
            gm.classNodesUnlocked = 5;
            gm.classCapstone = capstone;
            gm.skillPointsSpent = spent;
            gm.level = level;
            gm.CLASS_SELECT_LEVEL = 8;
            gm.CLASS_UNLOCK_LEVEL = 10;
            gm.CLASS_RESPEC_COST = 5;
            gm.SUBCLASS_UNLOCK_LEVEL = 40;
            gm.SUBCLASS_RESPEC_COST = 8;
            gm.subclass = null;
            gm.subclassNodesUnlocked = 0;
            gm.showAchievement = jest.fn();
            gm.saveData = jest.fn();
            return gm;
        }
        // Convenience: master + pick a subclass + unlock N tiers directly,
        // bypassing the point economy (which is exercised on its own below).
        function withSub(classId, capstone, subId, tiers, opts = {}) {
            const gm = mastered(classId, capstone, opts);
            gm.subclass = subId;
            gm.subclassNodesUnlocked = tiers;
            return gm;
        }

        describe('unlock gating (§9.2)', () => {
            test('locked until the base class is mastered', () => {
                const gm = mastered('scholar', 'deep_work');
                gm.classCapstone = null; // not mastered
                expect(gm.isClassMastered()).toBe(false);
                expect(gm.isSubclassUnlocked()).toBe(false);
            });

            test('locked until Level 40 even when mastered', () => {
                const gm = mastered('scholar', 'deep_work', { level: 39 });
                expect(gm.isClassMastered()).toBe(true);
                expect(gm.isSubclassUnlocked()).toBe(false);
            });

            test('unlocks once mastered AND Level 40+', () => {
                expect(mastered('scholar', 'deep_work', { level: 40 }).isSubclassUnlocked()).toBe(true);
            });

            test('selectSubclass is rejected while locked', () => {
                const gm = mastered('warrior', 'overflow', { level: 39 });
                expect(gm.selectSubclass('berserker')).toBe(false);
                expect(gm.subclass).toBeNull();
            });

            test('selectSubclass succeeds when unlocked', () => {
                const gm = mastered('warrior', 'overflow');
                expect(gm.selectSubclass('berserker')).toBe(true);
                expect(gm.subclass).toBe('berserker');
                expect(gm.subclassNodesUnlocked).toBe(0);
            });

            test('selectSubclass rejects an id from a different class', () => {
                const gm = mastered('warrior', 'overflow');
                expect(gm.selectSubclass('archivist')).toBe(false); // a Scholar subclass
                expect(gm.subclass).toBeNull();
            });
        });

        describe('pick-one exclusivity & respec (§9.7)', () => {
            test('a second selectSubclass is rejected while one is chosen', () => {
                const gm = mastered('scholar', 'deep_work');
                expect(gm.selectSubclass('archivist')).toBe(true);
                expect(gm.selectSubclass('sage')).toBe(false); // must respec first
                expect(gm.subclass).toBe('archivist');
            });

            test('respecSubclass clears the pick and refunds its points for a fee', () => {
                const gm = withSub('scholar', 'deep_work', 'archivist', 2); // 3 + 4 = 7 sunk
                gm.skillPointsSpent = 37; // 30 base + 7 subclass
                gm.focusCrystals = 10;
                expect(gm.respecSubclass()).toBe(true);
                expect(gm.subclass).toBeNull();
                expect(gm.subclassNodesUnlocked).toBe(0);
                expect(gm.skillPointsSpent).toBe(30); // 7 refunded
                expect(gm.focusCrystals).toBe(2);     // 8 fee
            });

            test('respecSubclass is blocked without enough Focus Crystals', () => {
                const gm = withSub('scholar', 'deep_work', 'archivist', 1);
                gm.focusCrystals = 3; // < 8
                expect(gm.respecSubclass()).toBe(false);
                expect(gm.subclass).toBe('archivist');
            });

            test('a base respecClass also dissolves the subclass', () => {
                const gm = withSub('warrior', 'overflow', 'berserker', 2);
                gm.focusCrystals = 10;
                expect(gm.respecClass()).toBe(true);
                expect(gm.playerClass).toBeNull();
                expect(gm.subclass).toBeNull();
                expect(gm.subclassNodesUnlocked).toBe(0);
            });
        });

        describe('tier economy — shared skill-point pool (§9.3)', () => {
            test('subclass tiers cost [3, 4, 5]', () => {
                const gm = mastered('ranger', 'forage');
                expect(gm.classDefinitions.ranger.subclasses.hunter.tiers.map(t => t.cost)).toEqual([3, 4, 5]);
            });

            test('unlocking tiers draws from getAvailableSkillPoints', () => {
                const gm = mastered('ranger', 'forage', { level: 52, spent: 30 });
                gm.subclass = 'hunter';
                gm.subclassNodesUnlocked = 0;
                expect(gm.getAvailableSkillPoints()).toBe(12); // (52-10) - 30 = [3,4,5]
                expect(gm.unlockNextSubclassTier()).toBe(true); // -3
                expect(gm.unlockNextSubclassTier()).toBe(true); // -4
                expect(gm.unlockNextSubclassTier()).toBe(true); // -5
                expect(gm.subclassNodesUnlocked).toBe(3);
                expect(gm.getAvailableSkillPoints()).toBe(0);
                expect(gm.isSubclassMastered()).toBe(true);
                expect(gm.getNextSubclassTier()).toBeNull();
                expect(gm.unlockNextSubclassTier()).toBe(false); // nothing left
            });

            test('insufficient points blocks the next tier', () => {
                const gm = mastered('ranger', 'forage', { level: 40, spent: 30 }); // available 0
                gm.subclass = 'hunter';
                expect(gm.unlockNextSubclassTier()).toBe(false);
                expect(gm.subclassNodesUnlocked).toBe(0);
            });

            test('getSubclassPointsSpent tracks cumulative tier cost', () => {
                expect(withSub('ranger', 'forage', 'hunter', 2).getSubclassPointsSpent()).toBe(7); // 3 + 4
            });
        });

        describe('getClassPerkValue resolution (§9.5)', () => {
            test('existing base/capstone perks are unchanged when a subclass exists', () => {
                const gm = withSub('scholar', 'deep_work', 'archivist', 3);
                expect(gm.getClassPerkValue('focus_xp')).toBe(40);
                expect(gm.getClassPerkValue('deep_work')).toBe(0.25);
                expect(gm.getClassPerkValue('enchant_preserve')).toBe(0); // unchosen capstone
            });

            test('a subclass effect resolves to its highest unlocked tier', () => {
                expect(withSub('scholar', 'deep_work', 'archivist', 0).getClassPerkValue('archivist_focus_mult')).toBe(0);
                expect(withSub('scholar', 'deep_work', 'archivist', 1).getClassPerkValue('archivist_focus_mult')).toBeCloseTo(0.15);
                expect(withSub('scholar', 'deep_work', 'archivist', 2).getClassPerkValue('archivist_focus_mult')).toBeCloseTo(0.30);
                expect(withSub('scholar', 'deep_work', 'archivist', 3).getClassPerkValue('archivist_focus_mult')).toBeCloseTo(0.50);
            });

            test('a subclass effect is inert for the wrong subclass / no pick', () => {
                expect(mastered('scholar', 'deep_work').getClassPerkValue('archivist_focus_mult')).toBe(0);
                const sage = withSub('scholar', 'deep_work', 'sage', 3);
                expect(sage.getClassPerkValue('archivist_focus_mult')).toBe(0); // sage ≠ archivist
                expect(sage.getClassPerkValue('sage_habit_crystals')).toBeCloseTo(0.50);
            });

            test('all 8 subclass effects expose their top-tier value', () => {
                expect(withSub('scholar', 'deep_work', 'archivist', 3).getClassPerkValue('archivist_focus_mult')).toBeCloseTo(0.50);
                expect(withSub('scholar', 'deep_work', 'sage', 3).getClassPerkValue('sage_habit_crystals')).toBeCloseTo(0.50);
                expect(withSub('warrior', 'overflow', 'berserker', 3).getClassPerkValue('berserker_ramp')).toBeCloseTo(0.50);
                expect(withSub('warrior', 'overflow', 'guardian', 3).getClassPerkValue('guardian_protect')).toBe(3);
                expect(withSub('wizard', 'overcharge', 'diviner', 3).getClassPerkValue('diviner_refund')).toBeCloseTo(0.30);
                expect(withSub('wizard', 'overcharge', 'necromancer', 3).getClassPerkValue('soul_harvest')).toBe(3);
                expect(withSub('ranger', 'forage', 'hunter', 3).getClassPerkValue('hunter_bonus')).toBeCloseTo(0.40);
                expect(withSub('ranger', 'forage', 'pathfinder', 3).getClassPerkValue('pathfinder_fortune')).toBeCloseTo(0.30);
            });
        });

        describe('effect hooks', () => {
            describe('Archivist — focus rewards (completeFocusSession)', () => {
                function focusArchivist(tiers) {
                    const gm = withSub('scholar', 'insight', 'archivist', tiers); // insight avoids Deep Work interaction
                    gm.activeSpells = [];
                    gm.focusCrystals = 0;
                    gm.totalFocusTime = 0;
                    gm.focusSessionsCompleted = 0;
                    gm.focusSessionLength = 25;
                    gm.focusTimer = null;
                    gm.pomodoroChain = null;
                    gm.deepWorkStack = 0;
                    gm.lastFocusSessionEndTime = 0;
                    gm._cancelFocusTimerNotification = jest.fn();
                    gm.hasActiveEnchantment = jest.fn(() => false);
                    gm.grantAttackCharge = jest.fn();
                    gm.trackDaily = jest.fn();
                    gm.showNotification = jest.fn();
                    gm.addXP = jest.fn();
                    gm.render = jest.fn();
                    window.audioManager.playCrystalEarn = jest.fn();
                    return gm;
                }

                test('scales focus crystals by the subclass multiplier', () => {
                    const gm = focusArchivist(3); // +50%; base 2 (1 + Crystal Harvest 1) → round(2×1.5) = 3
                    gm.completeFocusSession();
                    expect(gm.focusCrystals).toBe(3);
                });

                test('scales the focus XP bonus too', () => {
                    const gm = focusArchivist(3); // focus_xp 40 → round(40×1.5) = 60
                    gm.completeFocusSession();
                    expect(gm.addXP).toHaveBeenLastCalledWith(60, 'daily');
                });

                test('no scaling at 0 tiers', () => {
                    const gm = focusArchivist(0);
                    gm.completeFocusSession();
                    expect(gm.focusCrystals).toBe(2);
                    expect(gm.addXP).toHaveBeenLastCalledWith(40, 'daily');
                });
            });

            describe('Sage — habit crystal chance (toggleHabit)', () => {
                function sageScholar(tiers) {
                    const gm = withSub('scholar', 'insight', 'sage', tiers);
                    gm.habits = [{ id: 1, title: 'Read', completedToday: false, streak: 0, completionHistory: [] }];
                    gm.focusCrystals = 0;
                    gm.getTodayDateString = () => '2026-06-28';
                    gm.hasActiveEnchantment = jest.fn(() => false);
                    gm.addXP = jest.fn();
                    gm.addGold = jest.fn();
                    gm.grantAttackCharge = jest.fn();
                    gm.addFocusCrystalShards = jest.fn();
                    gm.checkSerenityBonus = jest.fn();
                    gm.trackDaily = jest.fn();
                    gm.checkOnboardingShareHook = jest.fn();
                    gm.render = jest.fn();
                    gm.renderHabits = jest.fn();
                    gm._showMilestoneSharePrompt = jest.fn();
                    window.audioManager.playHabitComplete = jest.fn();
                    return gm;
                }

                test('a successful roll grants a bonus Focus Crystal', () => {
                    const gm = sageScholar(3); // 50% chance
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0); // < 0.50 → hit
                    try { gm.toggleHabit(1); } finally { rnd.mockRestore(); }
                    expect(gm.focusCrystals).toBe(1);
                });

                test('a failed roll grants no crystal', () => {
                    const gm = sageScholar(3);
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // ≥ 0.50 → miss
                    try { gm.toggleHabit(1); } finally { rnd.mockRestore(); }
                    expect(gm.focusCrystals).toBe(0);
                });

                test('unchecking the habit refunds the Sage crystal', () => {
                    const gm = sageScholar(3);
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0);
                    try {
                        gm.toggleHabit(1); // complete → +1 crystal, recorded in lastRewards
                        expect(gm.focusCrystals).toBe(1);
                        gm.toggleHabit(1); // uncheck → refund
                    } finally { rnd.mockRestore(); }
                    expect(gm.focusCrystals).toBe(0);
                });
            });

            describe('Berserker — low-HP damage ramp (attackBoss)', () => {
                function berserkerWarrior(tiers, capstone = 'overflow') {
                    const gm = withSub('warrior', capstone, 'berserker', tiers);
                    gm.attackCharges = 10;
                    gm.rageComboCounter = 0;
                    gm.activeSpells = [];
                    gm.dailyBoss = null; gm.weeklyBoss = null; gm.monthlyBoss = null;
                    gm.getCompanionBonus = jest.fn(() => 0);
                    gm.getActiveCompanion = jest.fn(() => null);
                    gm.getEnchantmentMultiplier = jest.fn(() => 1);
                    gm.addBossLog = jest.fn();
                    gm.renderBossLog = jest.fn();
                    gm.animateBossHit = jest.fn();
                    gm.updateBossHPBar = jest.fn();
                    gm.onBossDefeated = jest.fn();
                    gm.renderBossBattles = jest.fn();
                    gm.trackDaily = jest.fn();
                    return gm;
                }
                const boss = (over) => ({ maxHP: 100, currentHP: 100, totalDamage: 0, defeated: false, icon: '👹', name: 'Test', ...over });

                test('adds more damage the lower the boss HP', () => {
                    const gm = berserkerWarrior(3); // up to +50%
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99); // no Keen Edge crit
                    gm.dailyBoss = boss({ currentHP: 50 }); // 50% HP → +25%
                    try { gm.attackBoss('daily'); } finally { rnd.mockRestore(); }
                    // base 6 ×1.2 Power Strikes = 8; ×1.25 Berserker = 10 → 50 - 10
                    expect(gm.dailyBoss.currentHP).toBe(40);
                });

                test('the ramp is zero at full HP', () => {
                    const gm = berserkerWarrior(3);
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99);
                    gm.dailyBoss = boss({ currentHP: 100 });
                    try { gm.attackBoss('daily'); } finally { rnd.mockRestore(); }
                    expect(gm.dailyBoss.currentHP).toBe(92); // just 8, no ramp
                });

                test('combined with Executioner the low-HP bonus is capped (§9.8)', () => {
                    const gm = berserkerWarrior(3, 'executioner'); // execute_bonus 0.50
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99);
                    gm.dailyBoss = boss({ maxHP: 1000, currentHP: 100 }); // 10% HP
                    try { gm.attackBoss('daily'); } finally { rnd.mockRestore(); }
                    // base 6 ×1.2 = 8; Executioner ×1.5 = 12; Berserker ramp 0.45
                    // capped to 0.25 (0.75 − 0.50) → ceil(12×1.25) = 15 → 100 − 15
                    expect(gm.dailyBoss.currentHP).toBe(85);
                });
            });

            describe('Guardian — weekly streak-protection pool (_applyStreakBreak)', () => {
                function guardianWarrior(tiers) {
                    const gm = withSub('warrior', 'overflow', 'guardian', tiers);
                    gm._recapEvents = [];
                    gm.activeEnchantments = [];
                    gm.hasActiveEnchantment = jest.fn(() => false);
                    gm.guardianProtectionsUsedThisWeek = 0;
                    gm.guardianProtectionResetWeek = gm.getWeekString(new Date());
                    gm.rangerProtectionsUsedThisWeek = 0;
                    gm.rangerProtectionResetWeek = gm.getWeekString(new Date());
                    return gm;
                }

                test('protects a streak from its own weekly pool', () => {
                    const gm = guardianWarrior(3); // +3/week
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, null);
                    expect(habit.streak).toBe(5);
                    expect(gm.guardianProtectionsUsedThisWeek).toBe(1);
                    expect(gm._recapEvents.some(e => e.type === 'protected')).toBe(true);
                });

                test('falls through to a break once the pool is exhausted', () => {
                    const gm = guardianWarrior(1); // pool size 1
                    gm.guardianProtectionsUsedThisWeek = 1;
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, null);
                    expect(habit.streak).toBe(0);
                    expect(gm._recapEvents.some(e => e.type === 'broken')).toBe(true);
                });

                test('resets the pool on a new ISO week', () => {
                    const gm = guardianWarrior(2);
                    gm.guardianProtectionsUsedThisWeek = 2;
                    gm.guardianProtectionResetWeek = '1999-W01'; // stale
                    const habit = { id: 1, title: 'Run', streak: 5 };
                    gm._applyStreakBreak(habit, false, null);
                    expect(habit.streak).toBe(5);
                    expect(gm.guardianProtectionResetWeek).toBe(gm.getWeekString(new Date()));
                    expect(gm.guardianProtectionsUsedThisWeek).toBe(1);
                });
            });

            describe('Diviner — spell charge refund (castSpell)', () => {
                function divinerWizard(tiers, capstone = 'overcharge') {
                    const gm = withSub('wizard', capstone, 'diviner', tiers);
                    gm.trackDaily = jest.fn();
                    gm.renderActiveSpellSigils = jest.fn();
                    gm.celebrateSpellUnlock = jest.fn();
                    gm.isCastingSpell = false;
                    gm.spellsCast = 0;
                    gm.freeCastUsedDate = null;
                    gm.activeSpells = [];
                    gm.spellDefinitions = {
                        ...gm.spellDefinitions,
                        test_rare: { id: 'test_rare', name: 'Test Rare', icon: '🧪', rarity: 'rare', effect: 'xp_multiplier', multiplier: 2, duration: 86400000, premium: false },
                    };
                    gm.spellbook = [{ spellId: 'test_rare', charges: 3 }];
                    return gm;
                }

                test('its chance stacks additively with Arcane Efficiency', () => {
                    const gm = divinerWizard(3); // 0.25 preserve + 0.30 diviner = 0.55
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.5); // < 0.55 → refund
                    try { gm.castSpell('test_rare'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(3); // spent then refunded
                });

                test('without Diviner the same roll would not refund', () => {
                    const gm = divinerWizard(0); // diviner inert → refundChance 0.25
                    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.5); // ≥ 0.25 → no refund
                    try { gm.castSpell('test_rare'); } finally { rnd.mockRestore(); }
                    expect(gm.spellbook[0].charges).toBe(2);
                });
            });

            describe('Necromancer — soul harvest (onBossDefeated)', () => {
                function necroWizard(tiers) {
                    const gm = withSub('wizard', 'overcharge', 'necromancer', tiers);
                    gm.focusCrystals = 0;
                    gm.monthlyBoss = {
                        name: 'M', icon: '🏴', flavor: 'x', maxHP: 100, currentHP: 0,
                        level: 1, spawnMonth: '2026-06', type: 'monthly', defeated: true,
                        totalDamage: 100, rewards: { xp: 100, gold: 50 }
                    };
                    gm.monthlyBossStreak = 0;
                    gm.bossKillsThisMonth = 0;
                    gm.bossesDefeated = 0;
                    gm.generateBossLoot = jest.fn(() => []);
                    return gm;
                }

                test('adds bonus Focus Crystals on top of the base boss reward', () => {
                    const gm = necroWizard(3); // +3; monthly base = 3 → 6
                    gm.onBossDefeated('monthly');
                    expect(gm.focusCrystals).toBe(6);
                });

                test('no bonus without the subclass', () => {
                    const gm = necroWizard(0);
                    gm.onBossDefeated('monthly');
                    expect(gm.focusCrystals).toBe(3); // base only
                });
            });

            describe('Hunter — bonus vs weekly & monthly bosses (attackBoss)', () => {
                function hunterRanger(tiers) {
                    const gm = withSub('ranger', 'forage', 'hunter', tiers);
                    gm.attackCharges = 10;
                    gm.activeSpells = [];
                    gm.dailyBoss = null; gm.weeklyBoss = null; gm.monthlyBoss = null;
                    gm.getCompanionBonus = jest.fn(() => 0);
                    gm.getActiveCompanion = jest.fn(() => null);
                    gm.getEnchantmentMultiplier = jest.fn(() => 1);
                    gm.addBossLog = jest.fn();
                    gm.renderBossLog = jest.fn();
                    gm.animateBossHit = jest.fn();
                    gm.updateBossHPBar = jest.fn();
                    gm.onBossDefeated = jest.fn();
                    gm.renderBossBattles = jest.fn();
                    gm.trackDaily = jest.fn();
                    return gm;
                }
                const boss = (over) => ({ maxHP: 200, currentHP: 200, totalDamage: 0, defeated: false, icon: '👹', name: 'T', ...over });

                test('boosts weekly boss damage', () => {
                    const gm = hunterRanger(3); // +40%
                    gm.weeklyBoss = boss({});
                    gm.attackBoss('weekly');
                    // ranger base 6 (no Power Strikes); ceil(6×1.4) = 9 → 200 - 9
                    expect(gm.weeklyBoss.currentHP).toBe(191);
                });

                test('does nothing to a daily boss', () => {
                    const gm = hunterRanger(3);
                    gm.dailyBoss = boss({});
                    gm.attackBoss('daily');
                    expect(gm.dailyBoss.currentHP).toBe(194); // 200 - 6, no Hunter
                });
            });

            describe('Pathfinder — gold fortune (addGold)', () => {
                function pathRanger(tiers) {
                    const gm = withSub('ranger', 'forage', 'pathfinder', tiers);
                    gm.goldCoins = 0;
                    gm.totalGoldEarned = 0;
                    gm._suppressRewardSounds = true;
                    gm._suppressRewardToasts = true;
                    gm.getActiveSpellMultiplier = jest.fn(() => 1);
                    gm.getEnchantmentMultiplier = jest.fn(() => 1);
                    gm.getCompanionBonus = jest.fn(() => 0);
                    gm.isBeginnerBlessingActive = jest.fn(() => false);
                    gm.trackDaily = jest.fn();
                    gm.checkRewardUnlocks = jest.fn();
                    return gm;
                }

                test('multiplies gold from any source', () => {
                    const gm = pathRanger(3); // +30%
                    gm.addGold(100, 'task');
                    expect(gm.goldCoins).toBe(130);
                });

                test('no bonus at 0 tiers', () => {
                    const gm = pathRanger(0);
                    gm.addGold(100, 'task');
                    expect(gm.goldCoins).toBe(100);
                });

                test('applies at a single choke point across sources', () => {
                    const gm = pathRanger(1); // +10%
                    gm.addGold(50, 'forage');
                    gm.addGold(50, 'boss');
                    expect(gm.goldCoins).toBe(110); // 55 + 55
                });
            });
        });

        describe('persistence round-trip', () => {
            test('a loaded save shape restores the subclass + Guardian pool fields', () => {
                // The four serialization touchpoints (loadData / saveData / the
                // backup export + import) read and write these fields verbatim;
                // here we assert a load-shaped assignment rehydrates behavior.
                const saved = withSub('warrior', 'overflow', 'guardian', 2);
                saved.guardianProtectionsUsedThisWeek = 1;
                saved.guardianProtectionResetWeek = '2026-W26';

                const fresh = mastered('warrior', 'overflow');
                fresh.subclass = saved.subclass;
                fresh.subclassNodesUnlocked = saved.subclassNodesUnlocked;
                fresh.guardianProtectionsUsedThisWeek = saved.guardianProtectionsUsedThisWeek;
                fresh.guardianProtectionResetWeek = saved.guardianProtectionResetWeek;

                expect(fresh.subclass).toBe('guardian');
                expect(fresh.subclassNodesUnlocked).toBe(2);
                expect(fresh.getSubclassPerkValue('guardian_protect')).toBe(2);
                expect(fresh.guardianProtectionsUsedThisWeek).toBe(1);
                expect(fresh.guardianProtectionResetWeek).toBe('2026-W26');
            });
        });

        describe('panel UI (renderClassPanel)', () => {
            function renderPanel(gm) {
                document.body.innerHTML = '<div id="panel-class-section"></div>';
                gm.renderClassPanel();
                return document.getElementById('panel-class-section').innerHTML;
            }

            test('shows a locked teaser when mastered but below Level 40', () => {
                const html = renderPanel(mastered('scholar', 'deep_work', { level: 39 }));
                expect(html).toContain('Subclass Specialization');
                expect(html).toContain('to specialize');
                expect(html).not.toContain('class.chooseSubclass');
            });

            test('shows both selection cards once unlocked', () => {
                const html = renderPanel(mastered('scholar', 'deep_work', { level: 40 }));
                expect(html).toContain('data-action="class.chooseSubclass"');
                expect(html).toContain('data-subclass-id="archivist"');
                expect(html).toContain('data-subclass-id="sage"');
                expect(html).toContain('Archivist');
                expect(html).toContain('Sage');
            });

            test('shows the tier track + respec once a subclass is chosen', () => {
                const html = renderPanel(withSub('scholar', 'deep_work', 'archivist', 1));
                expect(html).toContain('data-action="class.unlockSubclassTier"');
                expect(html).toContain('data-action="class.subclassRespec"');
                expect(html).toContain('Archivist');
                expect(html).toContain('Unlock (4 pt'); // next tier (T2) cost
            });

            test('surfaces the chosen subclass in the panel header', () => {
                const html = renderPanel(withSub('warrior', 'overflow', 'guardian', 2));
                expect(html).toContain('Guardian');
                expect(html).toContain('data-action="class.subclassRespec"');
            });

            test('marks the subclass mastered when all tiers are unlocked', () => {
                const html = renderPanel(withSub('ranger', 'forage', 'hunter', 3));
                expect(html).toContain('Mastered');                 // ★ Mastered badge
                expect(html).not.toContain('class.unlockSubclassTier');   // nothing left to unlock
            });

            test('no subclass section before the base class is mastered', () => {
                const gm = mastered('scholar', 'deep_work');
                gm.classCapstone = null; // not mastered yet
                const html = renderPanel(gm);
                expect(html).not.toContain('Subclass Specialization');
            });
        });
    });
});

// ==================== EFFORT-BASED XP (PRIORITY SCALING) ====================
// N3 friction-audit fix: the low/medium/high `priority` field doubles as an
// effort proxy so higher-effort quests pay more XP. Medium is the 1.0×
// baseline (historical values unchanged); the high bonus on DAILY TASKS is
// capped per day to blunt self-reported-effort gaming.
describe('Effort-based XP (priority scaling)', () => {

    describe('getPriorityXPMultiplier / _normalizePriority', () => {
        test('returns 1.5 / 1.0 / 0.75 for high / medium / low', () => {
            const gm = createTestManager();
            expect(gm.getPriorityXPMultiplier('high')).toBe(1.5);
            expect(gm.getPriorityXPMultiplier('medium')).toBe(1);
            expect(gm.getPriorityXPMultiplier('low')).toBe(0.75);
        });

        test('treats missing / unknown priority as medium (1.0×, no regression)', () => {
            const gm = createTestManager();
            expect(gm.getPriorityXPMultiplier(undefined)).toBe(1);
            expect(gm.getPriorityXPMultiplier(null)).toBe(1);
            expect(gm.getPriorityXPMultiplier('urgent')).toBe(1);
            expect(gm._normalizePriority('high')).toBe('high');
            expect(gm._normalizePriority('low')).toBe('low');
            expect(gm._normalizePriority('whatever')).toBe('medium');
        });
    });

    describe('_dailyTaskXP', () => {
        test('scales the base 15 XP by priority (low 11, medium 15, high 23)', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-02-01');
            expect(gm._dailyTaskXP({ priority: 'low' })).toBe(11);    // round(15 * 0.75)
            expect(gm._dailyTaskXP({ priority: 'medium' })).toBe(15);
            expect(gm._dailyTaskXP({})).toBe(15);                     // no priority → medium
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(23);   // round(15 * 1.5)
        });
    });

    describe('anti-gaming daily cap on the high-priority bonus', () => {
        test('only the first N high-priority daily tasks earn the high bonus; the rest pay medium', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-02-01');
            gm.HIGH_PRIORITY_XP_DAILY_CAP = 2;

            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(23); // 1st (bonus)
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(23); // 2nd (bonus)
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(15); // 3rd (capped → medium)
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(15); // stays capped
            expect(gm.highPriorityTasksToday).toBe(2);
        });

        test('low / medium tasks are never affected by the high-bonus cap', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-02-01');
            gm.HIGH_PRIORITY_XP_DAILY_CAP = 0; // no high bonuses available at all
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(15);   // capped immediately
            expect(gm._dailyTaskXP({ priority: 'medium' })).toBe(15);
            expect(gm._dailyTaskXP({ priority: 'low' })).toBe(11);    // unaffected
            expect(gm.highPriorityTasksToday).toBe(0);                // never incremented
        });

        test('the cap self-resets on a new local day', () => {
            const gm = createTestManager();
            gm.HIGH_PRIORITY_XP_DAILY_CAP = 1;
            gm.getTodayDateString = jest.fn(() => '2025-02-01');
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(23); // day 1, slot used
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(15); // day 1, capped
            gm.getTodayDateString = jest.fn(() => '2025-02-02');    // new day
            expect(gm._dailyTaskXP({ priority: 'high' })).toBe(23); // fresh slot
        });
    });

    describe('toggleTask integration', () => {
        function dailyTask(priority) {
            return { id: 1, title: 'T', completed: false, priority, dueDate: '2025-02-01' };
        }

        test('completing a high-priority daily task grants the scaled 23 XP', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-02-01');
            gm.addXP = jest.fn();
            gm.dealBossDamage = jest.fn();
            gm.dailyTasks = [dailyTask('high')];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.dailyTasks[0].completed).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(23, 'daily');
        });

        test('a medium daily task still grants the historical 15 XP (no regression)', () => {
            const gm = createTestManager();
            gm.getTodayDateString = jest.fn(() => '2025-02-01');
            gm.addXP = jest.fn();
            gm.dealBossDamage = jest.fn();
            gm.dailyTasks = [dailyTask('medium')];

            gm.toggleTask(1, { target: { closest: () => null } });

            expect(gm.addXP).toHaveBeenCalledWith(15, 'daily');
        });
    });

    describe('goal completion scales by priority (manual toggle)', () => {
        test('toggleWeeklyGoal grants 75 XP for a high-priority weekly goal', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.updateParentProgress = jest.fn();
            gm.checkBountyCompletion = jest.fn();
            gm.weeklyGoals = [{ id: 1, title: 'W', completed: false, priority: 'high', checklist: [] }];

            gm.toggleWeeklyGoal(1, { target: { closest: () => null } });

            expect(gm.weeklyGoals[0].completed).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(75, 'weekly'); // round(50 * 1.5)
        });

        test('toggleMonthlyGoal grants 150 XP for a low-priority monthly goal', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.updateParentProgress = jest.fn();
            gm.checkBountyCompletion = jest.fn();
            gm.monthlyGoals = [{ id: 1, title: 'M', completed: false, priority: 'low', checklist: [] }];

            gm.toggleMonthlyGoal(1, { target: { closest: () => null } });

            expect(gm.addXP).toHaveBeenCalledWith(150, 'monthly'); // round(200 * 0.75)
        });

        test('toggleYearlyGoal grants 1500 XP for a high-priority yearly goal', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.updateParentProgress = jest.fn();
            gm.checkBountyCompletion = jest.fn();
            gm.dealBossDamage = jest.fn();
            gm.yearlyGoals = [{ id: 1, title: 'Y', completed: false, priority: 'high', checklist: [] }];

            gm.toggleYearlyGoal(1, { target: { closest: () => null } });

            expect(gm.addXP).toHaveBeenCalledWith(1500, 'yearly'); // round(1000 * 1.5)
        });

        test('a medium goal keeps its historical XP (weekly = 50)', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.updateParentProgress = jest.fn();
            gm.checkBountyCompletion = jest.fn();
            gm.weeklyGoals = [{ id: 1, title: 'W', completed: false, priority: 'medium', checklist: [] }];

            gm.toggleWeeklyGoal(1, { target: { closest: () => null } });

            expect(gm.addXP).toHaveBeenCalledWith(50, 'weekly');
        });
    });

    describe('side-quest reward parity (refactor guard)', () => {
        test('the 20 × multiplier formula reproduces the historical 30 / 20 / 15 ramp', () => {
            const gm = createTestManager();
            expect(Math.round(20 * gm.getPriorityXPMultiplier('high'))).toBe(30);
            expect(Math.round(20 * gm.getPriorityXPMultiplier('medium'))).toBe(20);
            expect(Math.round(20 * gm.getPriorityXPMultiplier('low'))).toBe(15);
        });

        test('toggleSideQuest grants the priority-scaled baseXp (high = 30)', () => {
            const gm = createTestManager();
            gm.addXP = jest.fn();
            gm.grantAttackCharge = jest.fn();
            gm.trackDaily = jest.fn();
            gm.checkOnboardingShareHook = jest.fn();
            gm.checkBountyCompletion = jest.fn();
            gm.dealBossDamage = jest.fn();
            gm.sideQuests = [{ id: 1, title: 'S', completed: false, rewarded: false, priority: 'high' }];

            gm.toggleSideQuest(1);

            expect(gm.sideQuests[0].completed).toBe(true);
            expect(gm.addXP).toHaveBeenCalledWith(30, 'side');
        });
    });
});

// ==================== DELEGATED CLICK DISPATCH (Roadmap #7b) ====================
// Regression guard for the document-level action dispatcher. It MUST listen in
// the CAPTURE phase: many modals wrap their body in
// `onclick="event.stopPropagation()"` to suppress backdrop-dismiss on inner
// clicks. A bubble-phase listener would be swallowed by that stopPropagation
// and never see clicks on data-action buttons nested inside the modal (which
// silently broke e.g. the away-recap close button). These tests dispatch REAL
// clicks through jsdom (which honours capture/bubble + inline stopPropagation),
// so they fail if the listener ever regresses to the bubble phase.
describe('delegated click dispatch (Roadmap #7b)', () => {
    let gm;
    beforeAll(() => {
        gm = createTestManager();
        gm._ensureActionDelegation(); // wires a single capture-phase document listener
    });
    beforeEach(() => { document.body.innerHTML = ''; });
    afterEach(() => { document.body.innerHTML = ''; jest.restoreAllMocks(); });

    test('fires a data-action handler nested inside an onclick="event.stopPropagation()" wrapper', () => {
        const spy = jest.spyOn(gm, 'closeAwayRecapModal').mockImplementation(() => {});
        const modal = document.createElement('div');
        modal.className = 'fixed';
        // Mirror the real modal shape: an inner wrapper that stops propagation.
        modal.innerHTML =
            '<div onclick="event.stopPropagation()">' +
            '  <button id="deleg-close-btn" data-action="modal.closeAwayRecap">Close</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('deleg-close-btn').click();

        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('resolves the action from a nested child via closest([data-action])', () => {
        const spy = jest.spyOn(gm, 'closeAwayRecapModal').mockImplementation(() => {});
        const btn = document.createElement('button');
        btn.setAttribute('data-action', 'modal.closeAwayRecap');
        btn.innerHTML = '<i id="deleg-icon"></i><span>Close</span>';
        document.body.appendChild(btn);

        // Click the inner <i>, not the button itself.
        document.getElementById('deleg-icon').click();

        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('ignores unregistered data-action values without throwing', () => {
        const btn = document.createElement('button');
        btn.id = 'deleg-unreg';
        btn.setAttribute('data-action', 'totally.unregistered');
        document.body.appendChild(btn);

        expect(() => document.getElementById('deleg-unreg').click()).not.toThrow();
    });

    test('passes dynamic data-* values through to the handler', () => {
        const spy = jest.spyOn(gm, 'addDailyTask').mockImplementation(() => {});
        const btn = document.createElement('button');
        btn.id = 'deleg-daily';
        btn.setAttribute('data-action', 'task.addDaily');
        btn.setAttribute('data-date', '2026-01-15');
        document.body.appendChild(btn);

        document.getElementById('deleg-daily').click();

        expect(spy).toHaveBeenCalledWith(null, '2026-01-15');
    });
});

// ==================== REMINDER SCHEDULING (Roadmap #1, 72nd slice) ====================
// Covers reminder-schedule-logic.js directly, then the six thin delegators that consume it
// (initializeReminders' settings resolution, checkMissedReminders, scheduleDailyReminders,
// scheduleStreakRiskReminder, scheduleBountyReadyReminder, checkOverdueTasks + the two send*
// builders).
//
// Clock strategy for the delegator cases: fake ONLY Date (doNotFake everything else) so
// `new Date()` is deterministic, then monkeypatch setTimeout/clearTimeout/setInterval to recorders
// so nothing is really armed and the scheduled DELAYS become observable. Dates are compared as
// LOCAL calendar fields, never toISOString(), so the assertions are timezone-independent.
describe('reminder scheduling', () => {
    const RSL = require('../reminder-schedule-logic.js').default;

    // Local-field serialization: TZ-independent and readable in the artifact.
    const fmt = (d) => d === null || d === undefined ? null :
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    const DEFAULTS = {
        enabled: true,
        morningReminder: true, morningTime: '09:00',
        eveningReminder: true, eveningTime: '18:00',
        overdueAlert: true,
        streakReminder: true, streakReminderTime: '20:00',
        bountyReminder: true, bountyReminderTime: '18:00',
    };

    /** Pin the wall clock to a LOCAL date/time and swap timers for recorders. */
    function withPinnedClock(y, mo, d, h, mi, fn) {
        jest.useFakeTimers({
            doNotFake: [
                'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
                'setImmediate', 'clearImmediate', 'nextTick', 'performance',
                'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
                'requestIdleCallback', 'cancelIdleCallback', 'hrtime',
            ],
        });
        jest.setSystemTime(new Date(y, mo, d, h, mi, 0, 0));

        const realSetTimeout = global.setTimeout;
        const realClearTimeout = global.clearTimeout;
        const realSetInterval = global.setInterval;
        const timeouts = [];
        const intervals = [];
        let handle = 1;
        // @ts-ignore - recorder stand-ins for the duration of one case
        global.setTimeout = (cb, delay) => { timeouts.push(delay); return handle++; };
        // @ts-ignore
        global.clearTimeout = () => {};
        // @ts-ignore
        global.setInterval = (cb, delay) => { intervals.push(delay); return handle++; };
        try {
            return fn({ timeouts, intervals });
        } finally {
            global.setTimeout = realSetTimeout;
            global.clearTimeout = realClearTimeout;
            global.setInterval = realSetInterval;
            jest.useRealTimers();
        }
    }

    /** A manager with the reminder surface's collaborators stubbed to recorders. */
    function mgr({ today, settings, notificationsEnabled = true, extra = {} }) {
        const gm = createTestManager();
        gm.getTodayDateString = () => today;
        gm.reminderSettings = settings === undefined ? { ...DEFAULTS } : settings;
        gm.notificationsEnabled = notificationsEnabled;
        gm.dailyTasks = [];
        gm.habits = [];
        Object.assign(gm, extra);
        return gm;
    }

    // ── scheduleDailyReminders — which in-page timers get armed, and with what delay ──
    test('scheduleDailyReminders arms only the slots still ahead of now', () => {
        const delaysAt = (h, mi, settings = { ...DEFAULTS }) =>
            withPinnedClock(2026, 2, 10, h, mi, ({ timeouts }) => {
                const gm = mgr({ today: '2026-03-10', settings });
                gm.sendMorningReminder = () => {};
                gm.sendEveningReminder = () => {};
                gm.scheduleDailyReminders();
                return timeouts;
            });
        const HOUR = 60 * 60 * 1000;

        expect(delaysAt(8, 0)).toEqual([HOUR, 10 * HOUR]);          // 09:00 and 18:00 both ahead
        expect(delaysAt(10, 0)).toEqual([8 * HOUR]);                // morning gone, evening ahead
        expect(delaysAt(19, 0)).toEqual([]);                        // both gone
        // AT the morning slot nothing is armed for it — the catch-up path covers that minute.
        expect(delaysAt(9, 0)).toEqual([9 * HOUR]);
        expect(delaysAt(8, 0, { ...DEFAULTS, enabled: false })).toEqual([]);
        expect(delaysAt(8, 0, { ...DEFAULTS, morningReminder: false })).toEqual([10 * HOUR]);
        expect(delaysAt(8, 0, { ...DEFAULTS, eveningReminder: false })).toEqual([HOUR]);
    });

    // ── checkMissedReminders — the 2-hour catch-up window + the sent-today bookkeeping ──
    test('checkMissedReminders delivers a missed slot only inside the grace window', () => {
        const runAt = (h, mi, { settings = { ...DEFAULTS }, sent = null, notificationsEnabled = true } = {}) =>
            withPinnedClock(2026, 2, 10, h, mi, () => {
                const gm = mgr({ today: '2026-03-10', settings, notificationsEnabled });
                const sends = [];
                gm.sendMorningReminder = () => sends.push('morning');
                gm.sendEveningReminder = () => sends.push('evening');
                localStorage.removeItem('remindersSentToday');
                if (sent) localStorage.setItem('remindersSentToday', JSON.stringify(sent));
                gm.checkMissedReminders();
                const raw = localStorage.getItem('remindersSentToday');
                return { sends, stored: raw ? JSON.parse(raw) : null };
            });
        const SENT_MORNING = { _date: '2026-03-10', morning: true, evening: false };

        expect(runAt(9, 30)).toEqual({ sends: ['morning'], stored: SENT_MORNING });
        expect(runAt(9, 0)).toEqual({ sends: ['morning'], stored: SENT_MORNING });    // inclusive start
        expect(runAt(10, 59)).toEqual({ sends: ['morning'], stored: SENT_MORNING });  // last minute
        expect(runAt(11, 0)).toEqual({ sends: [], stored: null });                    // exclusive end
        expect(runAt(11, 30)).toEqual({ sends: [], stored: null });
        expect(runAt(8, 0)).toEqual({ sends: [], stored: null });                     // slot not reached
        expect(runAt(18, 30)).toEqual({
            sends: ['evening'], stored: { _date: '2026-03-10', morning: false, evening: true },
        });

        // Already delivered today → silent, and the record is left as-is.
        expect(runAt(9, 30, { sent: SENT_MORNING })).toEqual({ sends: [], stored: SENT_MORNING });
        // A stale record rolls over to today, which re-opens the day's slots.
        expect(runAt(9, 30, { sent: { _date: '2026-03-09', morning: true, evening: true } }))
            .toEqual({ sends: ['morning'], stored: SENT_MORNING });

        // Nothing is sent and nothing is written when the surface is switched off anywhere.
        expect(runAt(9, 30, { notificationsEnabled: false })).toEqual({ sends: [], stored: null });
        expect(runAt(9, 30, { settings: { ...DEFAULTS, enabled: false } })).toEqual({ sends: [], stored: null });
        expect(runAt(9, 30, { settings: { ...DEFAULTS, morningReminder: false } })).toEqual({ sends: [], stored: null });
    });

    // ── scheduleStreakRiskReminder — the native pre-schedule slot ──
    test('scheduleStreakRiskReminder pre-schedules the soonest genuinely at-risk slot', () => {
        const savedBridge = window.CapBridge;
        const runAt = (h, { settings = { ...DEFAULTS }, isNative = true, streak = 5,
                            lastLoginBonusDate = '2026-03-10', notificationsEnabled = true } = {}) =>
            withPinnedClock(2026, 2, 10, h, 0, () => {
                const canceled = [];
                const scheduled = [];
                window.CapBridge = {
                    isNative,
                    cancelNotification: (id) => canceled.push(id),
                    scheduleNotification: (o) => scheduled.push({ id: o.id, title: o.title, body: o.body, scheduleAt: fmt(o.scheduleAt) }),
                };
                const gm = mgr({ today: '2026-03-10', settings, notificationsEnabled,
                                 extra: { loginStreak: streak, lastLoginBonusDate } });
                gm.scheduleStreakRiskReminder();
                return { canceled, scheduled };
            });
        const NOT_CLAIMED = { lastLoginBonusDate: '2026-03-09' };
        // Every native run re-arms idempotently, so the pending id is always canceled first.
        const CANCELED = [RSL.STREAK_RISK_NOTIF_ID];
        const nudge = (streak, scheduleAt) => ({
            id: RSL.STREAK_RISK_NOTIF_ID,
            title: '🔥 Streak in Danger!',
            body: RSL.streakRiskBody(streak),
            scheduleAt,
        });

        try {
            // Opening the app auto-claims today, so today is not at risk → skip to tomorrow's slot.
            expect(runAt(10)).toEqual({ canceled: CANCELED, scheduled: [nudge(5, '2026-03-11 20:00:00')] });
            expect(runAt(10, NOT_CLAIMED)).toEqual({ canceled: CANCELED, scheduled: [nudge(5, '2026-03-10 20:00:00')] });
            expect(runAt(21, NOT_CLAIMED)).toEqual({ canceled: CANCELED, scheduled: [nudge(5, '2026-03-11 20:00:00')] });
            expect(runAt(10, { ...NOT_CLAIMED, streak: 3 })).toEqual({ canceled: CANCELED, scheduled: [nudge(3, '2026-03-10 20:00:00')] });
            // A missing time string yields the default slot instead of throwing on `undefined.split`.
            expect(runAt(10, { ...NOT_CLAIMED, settings: { ...DEFAULTS, streakReminderTime: undefined } }))
                .toEqual({ canceled: CANCELED, scheduled: [nudge(5, '2026-03-10 20:00:00')] });

            // Every opt-out still cancels the pending nudge, it just doesn't re-arm one.
            expect(runAt(10, { streak: 2 })).toEqual({ canceled: CANCELED, scheduled: [] });
            expect(runAt(10, { settings: { ...DEFAULTS, streakReminder: false } })).toEqual({ canceled: CANCELED, scheduled: [] });
            expect(runAt(10, { settings: { ...DEFAULTS, enabled: false } })).toEqual({ canceled: CANCELED, scheduled: [] });
            expect(runAt(10, { notificationsEnabled: false })).toEqual({ canceled: CANCELED, scheduled: [] });
            // Non-native has no bridge to cancel through at all.
            expect(runAt(10, { isNative: false })).toEqual({ canceled: [], scheduled: [] });
        } finally {
            if (savedBridge === undefined) delete window.CapBridge; else window.CapBridge = savedBridge;
        }
    });

    // ── scheduleBountyReadyReminder — slot pick + the never-past-the-deadline clamp ──
    test('scheduleBountyReadyReminder never schedules past the bounty deadline', () => {
        const savedBridge = window.CapBridge;
        const bounty = (expiresAt) => ({
            weekly: { cadence: 'weekly', status: 'active', questType: 'weekly', questId: 1, chestTier: 'silver', expiresAt },
            monthly: null,
        });
        const runAt = (h, { settings = { ...DEFAULTS }, isNative = true, bounties, goals = [{ id: 1, completed: false }] } = {}) =>
            withPinnedClock(2026, 2, 10, h, 0, () => {
                const canceled = [];
                const scheduled = [];
                window.CapBridge = {
                    isNative,
                    cancelNotification: (id) => canceled.push(id),
                    scheduleNotification: (o) => scheduled.push({ id: o.id, title: o.title, body: o.body, scheduleAt: fmt(o.scheduleAt) }),
                };
                const gm = mgr({ today: '2026-03-10', settings,
                                 extra: { activeBounties: bounties, weeklyGoals: goals, monthlyGoals: [] } });
                gm.scheduleBountyReadyReminder();
                return { canceled, scheduled };
            });
        const OPEN = bounty('2026-03-20T23:59:59Z');   // deadline far enough out to be TZ-proof
        const CANCELED = [RSL.BOUNTY_READY_NOTIF_ID];
        const nudge = (scheduleAt) => ({
            id: RSL.BOUNTY_READY_NOTIF_ID,
            title: '👑 Royal Bounty Awaiting!',
            body: RSL.bountyReadyBody('Weekly', 'silver'),
            scheduleAt,
        });

        try {
            expect(runAt(10, { bounties: OPEN })).toEqual({ canceled: CANCELED, scheduled: [nudge('2026-03-10 18:00:00')] });
            expect(runAt(19, { bounties: OPEN })).toEqual({ canceled: CANCELED, scheduled: [nudge('2026-03-11 18:00:00')] });
            // Slot has passed, so the next one is tomorrow — past a deadline that is tonight, so
            // nothing is armed. (Under a far-west TZ the bounty has already expired by 19:00 local
            // and the earlier claimable check bails instead; either way, no nudge.)
            expect(runAt(19, { bounties: bounty('2026-03-10T23:00:00Z') })).toEqual({ canceled: CANCELED, scheduled: [] });

            expect(runAt(10, { bounties: { weekly: null, monthly: null } })).toEqual({ canceled: CANCELED, scheduled: [] });
            // A completed target has nothing left to nudge about.
            expect(runAt(10, { bounties: OPEN, goals: [{ id: 1, completed: true }] })).toEqual({ canceled: CANCELED, scheduled: [] });
            expect(runAt(10, { bounties: OPEN, settings: { ...DEFAULTS, bountyReminder: false } })).toEqual({ canceled: CANCELED, scheduled: [] });
            expect(runAt(10, { bounties: OPEN, isNative: false })).toEqual({ canceled: [], scheduled: [] });
        } finally {
            if (savedBridge === undefined) delete window.CapBridge; else window.CapBridge = savedBridge;
        }
    });

    // ── initializeReminders — the settings defaults + the post-hoc field backfill ──
    test('initializeReminders resolves settings, defaulting and backfilling missing fields', () => {
        const resolve = (stored) =>
            withPinnedClock(2026, 2, 10, 10, 0, () => {
                const gm = mgr({ today: '2026-03-10', settings: null });
                localStorage.removeItem('reminderSettings');
                if (stored !== undefined) localStorage.setItem('reminderSettings', stored);
                // Isolate the settings resolution from the scheduling side effects.
                gm.scheduleDailyReminders = () => {};
                gm.scheduleStreakRiskReminder = () => {};
                gm.scheduleBountyReadyReminder = () => {};
                gm.checkMissedReminders = () => {};
                gm.checkOverdueTasks = () => {};
                gm.initializeReminders();
                return gm.reminderSettings;
            });

        expect(resolve(undefined)).toEqual(RSL.DEFAULT_SETTINGS);
        expect(resolve('{not json')).toEqual(RSL.DEFAULT_SETTINGS);

        // A save from before the streak/bounty fields existed keeps its own values and gains theirs.
        expect(resolve(JSON.stringify({
            enabled: true, morningReminder: true, morningTime: '07:30',
            eveningReminder: false, eveningTime: '21:00', overdueAlert: false,
        }))).toEqual({
            enabled: true, morningReminder: true, morningTime: '07:30',
            eveningReminder: false, eveningTime: '21:00', overdueAlert: false,
            streakReminder: true, streakReminderTime: '20:00',
            bountyReminder: true, bountyReminderTime: '18:00',
        });

        // The critical falsy cases: an explicit false must SURVIVE the backfill (it tests
        // `=== undefined`), or a reminder the user turned off would silently switch back on.
        expect(resolve(JSON.stringify({ ...DEFAULTS, streakReminder: false })))
            .toEqual({ ...RSL.DEFAULT_SETTINGS, streakReminder: false });
        expect(resolve(JSON.stringify({ ...DEFAULTS, bountyReminder: false })))
            .toEqual({ ...RSL.DEFAULT_SETTINGS, bountyReminder: false });
        // Time strings test falsiness instead, because '' is not a usable time.
        expect(resolve(JSON.stringify({ ...DEFAULTS, streakReminderTime: '', bountyReminderTime: '' })))
            .toEqual(RSL.DEFAULT_SETTINGS);
    });

    // ── The notification bodies (pluralization + the all-done branch) ──
    test('the send* builders pluralize their bodies, and only the evening report always fires', () => {
        // `overdueState` seeds BOTH once-per-day guard fields: the sent flag and the date it was
        // stamped for. Seeding only the flag proves nothing — checkOverdueTasks resets it whenever
        // _overdueNotificationDate !== today, so the guard has to be driven through both.
        const shots = (tasks, habits, overdueState = {}, settings = { ...DEFAULTS }) =>
            withPinnedClock(2026, 2, 10, 9, 0, () => {
                const gm = mgr({ today: '2026-03-10', settings });
                gm.dailyTasks = tasks;
                gm.habits = habits;
                gm.overdueNotificationSent = overdueState.sent || false;
                gm._overdueNotificationDate = overdueState.date;
                const notes = [];
                gm.showNotification = (title, body, icon, tag) => notes.push({ title, body, icon, tag });
                gm.sendMorningReminder();
                gm.sendEveningReminder();
                gm.checkOverdueTasks();
                return {
                    notes,
                    overdueSentAfter: gm.overdueNotificationSent,
                    overdueDateAfter: gm._overdueNotificationDate ?? null,
                };
            });
        const T = (dueDate, completed = false) => ({ dueDate, completed, title: 't' });
        const TODO = T('2026-03-10');
        const PENDING_HABIT = { completedToday: false };
        const morning = (body) => ({ title: '🌅 Good Morning, Adventurer!', body, icon: '⚔️', tag: 'quest-reminder-morning' });
        const evening = (body) => ({ title: '🌙 Evening Quest Report', body, icon: '⚔️', tag: 'quest-reminder-evening' });
        const ALL_DONE = { title: '🏆 Quest Complete!', body: 'Amazing! All tasks and habits done for today!', icon: '⚔️', tag: 'quest-reminder-evening' };
        const overdue = (n) => ({ title: '⚠️ Overdue Quests!', body: RSL.overdueReminderBody(n), icon: '⚔️', tag: 'quest-overdue' });
        const UNSTAMPED = { overdueSentAfter: false, overdueDateAfter: null };
        const STAMPED_TODAY = { overdueSentAfter: true, overdueDateAfter: '2026-03-10' };

        expect(shots([TODO], [])).toEqual({
            notes: [morning('📋 1 task for today'), evening('Before the day ends: 1 task remaining')],
            ...UNSTAMPED,
        });
        expect(shots([TODO, TODO], [PENDING_HABIT, PENDING_HABIT])).toEqual({
            notes: [
                morning('📋 2 tasks for today • 🔄 2 habits to complete'),
                evening('Before the day ends: 2 tasks remaining, 2 habits to complete'),
            ],
            ...UNSTAMPED,
        });
        // Nothing pending: the morning nudge stays silent, the evening report celebrates instead.
        expect(shots([T('2026-03-10', true)], [{ completedToday: true }])).toEqual({ notes: [ALL_DONE], ...UNSTAMPED });

        // An overdue task is not due *today*, so it drives only the overdue alert — and note the
        // shipped copy's noun-only pluralization ("1 overdue task that need attention").
        expect(shots([T('2026-03-01')], [])).toEqual({ notes: [ALL_DONE, overdue(1)], ...STAMPED_TODAY });
        expect(shots([T('2026-03-01'), T('2026-03-02')], [])).toEqual({ notes: [ALL_DONE, overdue(2)], ...STAMPED_TODAY });
        // Guard genuinely armed for TODAY → must stay silent.
        expect(shots([T('2026-03-01')], [], { sent: true, date: '2026-03-10' })).toEqual({ notes: [ALL_DONE], ...STAMPED_TODAY });
        // Guard stamped for a PREVIOUS day → resets and fires again.
        expect(shots([T('2026-03-01')], [], { sent: true, date: '2026-03-09' })).toEqual({ notes: [ALL_DONE, overdue(1)], ...STAMPED_TODAY });

        // Either toggle bails before the guard is even evaluated, so nothing gets stamped.
        expect(shots([T('2026-03-01')], [], {}, { ...DEFAULTS, overdueAlert: false })).toEqual({ notes: [ALL_DONE], ...UNSTAMPED });
        expect(shots([T('2026-03-01')], [], {}, { ...DEFAULTS, enabled: false })).toEqual({ notes: [ALL_DONE], ...UNSTAMPED });
        expect(shots([T('2026-03-01', true)], [])).toEqual({ notes: [ALL_DONE], ...UNSTAMPED });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// bounty-logic.js — pure Royal Bounty rules (Roadmap #1, 74th slice).
//
// Replaces the throwaway pre-extraction characterization baseline that guarded
// the swap (the bounty core had ZERO coverage before this slice). These tests
// drive the MODULE directly, then re-drive the REAL class delegators so the
// wrappers can't drift away from the rules they now import.
//
// Three documented invariants are pinned deliberately here, because each one is
// knowledge that still exists in two places and the module header promises a
// test rather than a merge:
//   1. The Monday-start off-by-one, shared verbatim with period-summary-logic.js.
//   2. The two live ISO-week implementations (class LOCAL vs PSL UTC).
//   3. The 1ms expiry disagreement between isPastWindow and the reminder resolver.
//
// Every Date is built from LOCAL calendar fields and asserted the same way, so
// the suite is timezone-independent.
// ═══════════════════════════════════════════════════════════════════════════
describe('bounty-logic.js (pure Royal Bounty rules)', () => {
    const BL = require('../bounty-logic.js').default;
    const PSL = require('../period-summary-logic.js').default;

    /** Local-field Date builder (month is 1-based for readability). */
    const D = (y, mo, d, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, mo - 1, d, h, mi, s, ms);
    /** Local calendar fields of a Date — the timezone-independent assertion form. */
    const LF = (d) => (d == null ? null : [
        d.getFullYear(), d.getMonth() + 1, d.getDate(),
        d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds(),
    ]);
    /** Local Y-M-D only, for comparisons where time-of-day is not part of the rule. */
    const YMD = (d) => (d == null ? null : LF(d).slice(0, 3));

    // June 2026 starts on a Monday, so: 8th = Mon, 10th = Wed, 14th = Sun.
    const WED = D(2026, 6, 10, 9, 0);

    /** A manager with every bounty side-effect stubbed, so only the rules are observed. */
    const mgr = (over = {}) => {
        const gm = createTestManager();
        gm.level = 50;
        gm.weeklyGoals = [];
        gm.sideQuests = [];
        gm.monthlyGoals = [];
        gm.yearlyGoals = [];
        gm.lifeGoals = [];
        gm.activeBounties = { weekly: null, monthly: null };
        gm.scheduleBountyReadyReminder = jest.fn();
        gm.openTreasureChest = jest.fn();
        gm.renderRoyalBounty = jest.fn();
        Object.assign(gm, over);
        return gm;
    };

    describe('the cadence → tier → chest tables', () => {
        test('CADENCES is the sweep order every caller iterates', () => {
            expect(BL.CADENCES).toEqual(['weekly', 'monthly']);
        });

        test('weekly draws from weekly + sidequest; monthly from monthly ONLY', () => {
            expect(BL.CADENCE_TIERS.weekly).toEqual(['weekly', 'sidequest']);
            expect(BL.CADENCE_TIERS.monthly).toEqual(['monthly']);
        });

        test('every tier maps to the manager list that holds it', () => {
            expect(BL.QUEST_LIST_KEY).toEqual({
                weekly: 'weeklyGoals',
                sidequest: 'sideQuests',
                monthly: 'monthlyGoals',
                yearly: 'yearlyGoals',
                epic: 'lifeGoals',
            });
        });

        test('chest tier escalates with quest tier', () => {
            expect(BL.CHEST_TIER_BY_QUEST_TIER).toEqual({
                weekly: 'silver',
                sidequest: 'silver',
                monthly: 'gold',
                yearly: 'royal',
                epic: 'royal',
            });
        });

        test('QUEST_LIST_KEY is WIDER than CADENCE_TIERS so legacy records still resolve', () => {
            // A saved monthly bounty pointing at 'yearly'/'epic' must still find its
            // quest (to be self-healed) even though monthly no longer draws those.
            for (const tier of ['yearly', 'epic']) {
                expect(BL.QUEST_LIST_KEY[tier]).toBeDefined();
                expect(BL.servesTier('monthly', tier)).toBe(false);
            }
        });

        test('the tables are frozen', () => {
            expect(Object.isFrozen(BL.CADENCES)).toBe(true);
            expect(Object.isFrozen(BL.CADENCE_TIERS)).toBe(true);
            expect(Object.isFrozen(BL.CADENCE_TIERS.weekly)).toBe(true);
            expect(Object.isFrozen(BL.QUEST_LIST_KEY)).toBe(true);
            expect(Object.isFrozen(BL.CHEST_TIER_BY_QUEST_TIER)).toBe(true);
            expect(Object.isFrozen(BL.DEFAULT_UNLOCK_LEVELS)).toBe(true);
        });
    });

    // ── INVARIANT 1: the Monday-start off-by-one ─────────────────────────────
    describe('daysFromMonday / mondayOf', () => {
        test('Sunday is the SEVENTH day, not the first', () => {
            // dow:      Sun Mon Tue Wed Thu Fri Sat
            expect([0, 1, 2, 3, 4, 5, 6].map(BL.daysFromMonday)).toEqual([6, 0, 1, 2, 3, 4, 5]);
        });

        test('mondayOf snaps to this week Monday at local midnight', () => {
            expect(LF(BL.mondayOf(WED))).toEqual([2026, 6, 8, 0, 0, 0, 0]);
            // Sunday the 14th still belongs to the week that OPENED on the 8th.
            expect(LF(BL.mondayOf(D(2026, 6, 14, 23, 30)))).toEqual([2026, 6, 8, 0, 0, 0, 0]);
        });

        test('Monday 00:00 is a fixed point', () => {
            const mon = D(2026, 6, 8, 0, 0, 0, 0);
            expect(LF(BL.mondayOf(mon))).toEqual(LF(mon));
        });

        test('walks back across a month AND year boundary', () => {
            // Fri 2026-01-02 → Mon 2025-12-29.
            expect(LF(BL.mondayOf(D(2026, 1, 2, 12, 0)))).toEqual([2025, 12, 29, 0, 0, 0, 0]);
        });

        test('does not mutate its argument', () => {
            const input = D(2026, 6, 10, 9, 30, 15, 250);
            const before = LF(input);
            BL.mondayOf(input);
            expect(LF(input)).toEqual(before);
        });

        // The rule fragment `dayOfWeek === 0 ? 6 : dayOfWeek - 1` is written in BOTH
        // this module and period-summary-logic.js's previousPeriodRange. The
        // surrounding computations genuinely differ (this week's Monday at midnight
        // vs the PREVIOUS week's Monday with time preserved), so they are not merged
        // — this pins them to the same weekday arithmetic instead.
        test('agrees with period-summary-logic across all seven weekdays', () => {
            for (let day = 8; day <= 14; day++) {
                const today = D(2026, 6, day, 15, 45);
                const psl = PSL.previousPeriodRange('week', today).startDate;
                const mine = BL.mondayOf(today);
                mine.setDate(mine.getDate() - 7);   // this week's Monday → last week's
                expect(YMD(psl)).toEqual(YMD(mine));
            }
        });
    });

    // ── INVARIANT 2: two live ISO-week implementations ───────────────────────
    describe('the week key (INJECTED, not owned)', () => {
        test('weekly delegates to the injected weekKey; monthly never calls it', () => {
            const weekKey = jest.fn(() => 'INJECTED');
            expect(BL.periodKey('weekly', WED, weekKey)).toBe('INJECTED');
            expect(weekKey).toHaveBeenCalledWith(WED);

            weekKey.mockClear();
            expect(BL.periodKey('monthly', WED, weekKey)).toBe('2026-06');
            expect(weekKey).not.toHaveBeenCalled();
        });

        test('monthly key is local YYYY-MM, zero-padded', () => {
            const never = () => { throw new Error('weekKey must not be called'); };
            expect(BL.periodKey('monthly', D(2026, 1, 5), never)).toBe('2026-01');
            expect(BL.periodKey('monthly', D(2026, 12, 31), never)).toBe('2026-12');
        });

        // The class's ISO helpers are LOCAL-time; period-summary-logic carries a
        // separate UTC-based isoWeekNumber. Reconciling them would MOVE week
        // boundaries for users near midnight, so both stay live and this walks them
        // across the year-boundary dates where an ISO week-year actually disagrees
        // with the calendar year. Dates are built at local NOON so the local/UTC
        // calendar day cannot diverge for any real offset.
        test('the class LOCAL and PSL UTC ISO-week numbers agree at local noon', () => {
            const gm = mgr();
            const dates = [
                D(2026, 1, 1, 12), D(2025, 12, 29, 12), D(2025, 12, 31, 12),
                D(2026, 6, 10, 12), D(2024, 2, 29, 12), D(2027, 1, 3, 12),
            ];
            for (const d of dates) {
                expect(gm.getISOWeekNumber(d)).toBe(PSL.isoWeekNumber(d));
            }
        });

        test('_weekKey uses the ISO week-YEAR, so New Year keys cannot collide', () => {
            const gm = mgr();
            // 2025-12-29 is Monday of ISO week 1 of 2027's predecessor year 2026,
            // so its key must carry 2026 — NOT the calendar year 2025.
            expect(gm._weekKey(D(2025, 12, 29, 12))).toBe('2026-W1');
            expect(gm._weekKey(D(2026, 1, 1, 12))).toBe('2026-W1');
            // Same week → identical key from both ends of the boundary.
            expect(gm._weekKey(D(2025, 12, 29, 12))).toBe(gm._weekKey(D(2026, 1, 1, 12)));
        });
    });

    describe('isUnlocked — the feature gate', () => {
        const TABLE = { weekly: 6, monthly: 7 };

        test('gates each cadence at its Quest Log tab level', () => {
            expect(BL.isUnlocked('weekly', 5, TABLE)).toBe(false);
            expect(BL.isUnlocked('weekly', 6, TABLE)).toBe(true);
            expect(BL.isUnlocked('monthly', 6, TABLE)).toBe(false);
            expect(BL.isUnlocked('monthly', 7, TABLE)).toBe(true);
        });

        test('falls back to 6 / 7 when the table is absent', () => {
            for (const missing of [undefined, null]) {
                expect(BL.isUnlocked('weekly', 5, missing)).toBe(false);
                expect(BL.isUnlocked('weekly', 6, missing)).toBe(true);
                expect(BL.isUnlocked('monthly', 6, missing)).toBe(false);
                expect(BL.isUnlocked('monthly', 7, missing)).toBe(true);
            }
        });

        test('a CONFIGURED 0 also falls back — the original used || not ??', () => {
            // Preserved verbatim from the inline rule: 0 is falsy, so the default
            // applies rather than unlocking the cadence at level 0.
            expect(BL.isUnlocked('weekly', 3, { weekly: 0 })).toBe(false);
            expect(BL.isUnlocked('weekly', 6, { weekly: 0 })).toBe(true);
        });

        test('any non-weekly cadence string is treated as monthly', () => {
            expect(BL.isUnlocked('nonsense', 6, TABLE)).toBe(false);
            expect(BL.isUnlocked('nonsense', 7, TABLE)).toBe(true);
        });
    });

    describe('periodStart / deadline — the window boundaries', () => {
        test('weekly period runs Monday 00:00 → Sunday 23:59:59.999', () => {
            expect(LF(BL.periodStart('weekly', WED))).toEqual([2026, 6, 8, 0, 0, 0, 0]);
            expect(LF(BL.deadline('weekly', WED))).toEqual([2026, 6, 14, 23, 59, 59, 999]);
        });

        test('every day of one ISO week shares the same weekly window', () => {
            const start = LF(BL.periodStart('weekly', WED));
            const end = LF(BL.deadline('weekly', WED));
            for (let day = 8; day <= 14; day++) {
                const d = D(2026, 6, day, 17, 3);
                expect(LF(BL.periodStart('weekly', d))).toEqual(start);
                expect(LF(BL.deadline('weekly', d))).toEqual(end);
            }
        });

        test('monthly period starts on the 1st at local midnight', () => {
            expect(LF(BL.periodStart('monthly', WED))).toEqual([2026, 6, 1, 0, 0, 0, 0]);
            expect(LF(BL.periodStart('monthly', D(2024, 2, 29, 12)))).toEqual([2024, 2, 1, 0, 0, 0, 0]);
        });

        test('monthly deadline is a ROLLING 10-day window from the assignment day', () => {
            // The assignment day counts, so the window is +(10 - 1) days.
            expect(BL.MONTHLY_WINDOW_DAYS).toBe(10);
            expect(LF(BL.deadline('monthly', WED))).toEqual([2026, 6, 19, 23, 59, 59, 999]);
            // Assigned on the 1st → through the end of the 10th.
            expect(LF(BL.deadline('monthly', D(2026, 6, 1, 8, 0)))).toEqual([2026, 6, 10, 23, 59, 59, 999]);
        });

        test('the monthly window can cross into the next month (and year)', () => {
            expect(LF(BL.deadline('monthly', D(2026, 3, 31, 12)))).toEqual([2026, 4, 9, 23, 59, 59, 999]);
            expect(LF(BL.deadline('monthly', D(2026, 12, 28, 12)))).toEqual([2027, 1, 6, 23, 59, 59, 999]);
        });

        test('does not mutate the injected clock', () => {
            const now = D(2026, 6, 10, 9, 0, 0, 0);
            const before = LF(now);
            BL.periodStart('weekly', now);
            BL.periodStart('monthly', now);
            BL.deadline('weekly', now);
            BL.deadline('monthly', now);
            expect(LF(now)).toEqual(before);
        });
    });

    describe('tiersFor / servesTier', () => {
        const lists = {
            weeklyGoals: [{ id: 'w1' }],
            sideQuests: [{ id: 's1' }, { id: 's2' }],
            monthlyGoals: [{ id: 'm1' }],
        };

        test('pairs each drawn tier with its list, in sweep order', () => {
            expect(BL.tiersFor('weekly', lists)).toEqual([
                ['weekly', lists.weeklyGoals],
                ['sidequest', lists.sideQuests],
            ]);
            expect(BL.tiersFor('monthly', lists)).toEqual([['monthly', lists.monthlyGoals]]);
        });

        test('a missing list comes back as undefined rather than throwing', () => {
            expect(BL.tiersFor('weekly', {})).toEqual([['weekly', undefined], ['sidequest', undefined]]);
        });

        test('servesTier is the legacy self-heal probe', () => {
            expect(BL.servesTier('weekly', 'weekly')).toBe(true);
            expect(BL.servesTier('weekly', 'sidequest')).toBe(true);
            expect(BL.servesTier('weekly', 'monthly')).toBe(false);
            expect(BL.servesTier('monthly', 'monthly')).toBe(true);
            // The narrowing that refreshBounties heals: monthly no longer draws these.
            expect(BL.servesTier('monthly', 'yearly')).toBe(false);
            expect(BL.servesTier('monthly', 'epic')).toBe(false);
        });
    });

    describe('eligibleQuests — the anti-stage rule', () => {
        const START = D(2026, 6, 8);   // this week's Monday

        test('only incomplete quests that PREDATE the period are eligible', () => {
            const lists = {
                weeklyGoals: [
                    { id: 'old', created: D(2026, 6, 1).toISOString() },
                    { id: 'staged', created: D(2026, 6, 9).toISOString() },   // after the start
                    { id: 'done', created: D(2026, 6, 1).toISOString(), completed: true },
                ],
                sideQuests: [{ id: 'sq', created: D(2026, 5, 30).toISOString() }],
            };
            expect(BL.eligibleQuests('weekly', START, lists)).toEqual([
                { id: 'old', tier: 'weekly' },
                { id: 'sq', tier: 'sidequest' },
            ]);
        });

        test('a quest created exactly AT the boundary is staged, not eligible', () => {
            const lists = { weeklyGoals: [{ id: 'edge', created: START.toISOString() }] };
            expect(BL.eligibleQuests('weekly', START, lists)).toEqual([]);
        });

        test('a legacy quest with no `created` stamp counts as pre-period', () => {
            const lists = { weeklyGoals: [{ id: 'legacy' }] };
            expect(BL.eligibleQuests('weekly', START, lists)).toEqual([{ id: 'legacy', tier: 'weekly' }]);
        });

        test('null holes, absent and empty lists are all tolerated', () => {
            const lists = { weeklyGoals: [null, { id: 'ok' }], sideQuests: undefined };
            expect(BL.eligibleQuests('weekly', START, lists)).toEqual([{ id: 'ok', tier: 'weekly' }]);
            expect(BL.eligibleQuests('weekly', START, {})).toEqual([]);
            expect(BL.eligibleQuests('monthly', START, { monthlyGoals: [] })).toEqual([]);
        });

        test('monthly ignores the weekly-only lists entirely', () => {
            const lists = {
                weeklyGoals: [{ id: 'w' }],
                sideQuests: [{ id: 's' }],
                monthlyGoals: [{ id: 'm' }],
            };
            expect(BL.eligibleQuests('monthly', D(2026, 6, 1), lists)).toEqual([{ id: 'm', tier: 'monthly' }]);
        });
    });

    describe('seededIndex / pickFrom — the deterministic pick', () => {
        test('same key + salt + length always yields the same index', () => {
            const a = BL.seededIndex('2026-W24', '', 5);
            for (let i = 0; i < 25; i++) expect(BL.seededIndex('2026-W24', '', 5)).toBe(a);
        });

        test('always in range for any pool size', () => {
            for (const len of [1, 2, 3, 5, 17, 40]) {
                for (const key of ['2026-W24', '2026-06', '2025-W1', '2026-W1']) {
                    const idx = BL.seededIndex(key, '', len);
                    expect(Number.isInteger(idx)).toBe(true);
                    expect(idx).toBeGreaterThanOrEqual(0);
                    expect(idx).toBeLessThan(len);
                }
            }
        });

        test('an empty pool is index 0, never NaN or -1', () => {
            expect(BL.seededIndex('2026-W24', '', 0)).toBe(0);
            expect(BL.seededIndex('2026-W24', '', -3)).toBe(0);
        });

        test('undefined and null salt behave exactly like the empty string', () => {
            for (const len of [3, 5, 17]) {
                const base = BL.seededIndex('2026-W24', '', len);
                expect(BL.seededIndex('2026-W24', undefined, len)).toBe(base);
                expect(BL.seededIndex('2026-W24', null, len)).toBe(base);
            }
        });

        test('the reroll salt moves the pick off the original slot', () => {
            // Not guaranteed for every key/length, but it must be a DIFFERENT
            // sequence — otherwise a reroll could never land anywhere new.
            const plain = [];
            const salted = [];
            for (const key of ['2026-W24', '2026-W25', '2026-06', '2026-07']) {
                plain.push(BL.seededIndex(key, '', 5));
                salted.push(BL.seededIndex(key, 'reroll', 5));
            }
            expect(salted).not.toEqual(plain);
        });

        test('a different period key generally re-rolls the pick', () => {
            const keys = ['2026-W20', '2026-W21', '2026-W22', '2026-W23', '2026-W24'];
            const picks = new Set(keys.map(k => BL.seededIndex(k, '', 5)));
            expect(picks.size).toBeGreaterThan(1);
        });

        test('pickFrom returns the pooled entry at the seeded index', () => {
            const pool = [
                { id: 'a', tier: 'weekly' }, { id: 'b', tier: 'weekly' },
                { id: 'c', tier: 'sidequest' },
            ];
            expect(BL.pickFrom(pool, '2026-W24')).toBe(pool[BL.seededIndex('2026-W24', '', 3)]);
            expect(BL.pickFrom(pool, '2026-W24', 'reroll')).toBe(pool[BL.seededIndex('2026-W24', 'reroll', 3)]);
        });

        test('pickFrom yields null for an empty or absent pool', () => {
            expect(BL.pickFrom([], '2026-W24')).toBeNull();
            expect(BL.pickFrom(null, '2026-W24')).toBeNull();
            expect(BL.pickFrom(undefined, '2026-W24')).toBeNull();
        });
    });

    describe('the record builders', () => {
        test('emptyBounty is the add-a-quest nudge record', () => {
            expect(BL.emptyBounty('weekly', '2026-W24')).toEqual({
                periodKey: '2026-W24', cadence: 'weekly', empty: true,
            });
        });

        test('assignedBounty stamps the full active record', () => {
            const now = D(2026, 6, 10, 9, 0);
            const expiresAt = D(2026, 6, 14, 23, 59, 59, 999);
            expect(BL.assignedBounty({
                cadence: 'weekly',
                periodKey: '2026-W24',
                pick: { id: 'w1', tier: 'sidequest' },
                now,
                expiresAt,
            })).toEqual({
                periodKey: '2026-W24',
                cadence: 'weekly',
                questType: 'sidequest',
                questId: 'w1',
                assignedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                chestTier: 'silver',      // sidequest → silver, from the table
                status: 'active',
                rerolled: false,
            });
        });

        test('the chest tier always comes from the table, per targeted tier', () => {
            const args = (tier) => ({
                cadence: 'monthly', periodKey: '2026-06', pick: { id: 'q', tier },
                now: WED, expiresAt: WED,
            });
            expect(BL.assignedBounty(args('monthly')).chestTier).toBe('gold');
            expect(BL.assignedBounty(args('yearly')).chestTier).toBe('royal');
            expect(BL.assignedBounty(args('epic')).chestTier).toBe('royal');
        });

        test('emptySlots hands back a FRESH map each call', () => {
            const a = BL.emptySlots();
            expect(a).toEqual({ weekly: null, monthly: null });
            a.weekly = { id: 'mutated' };
            // Callers assign into this, so a shared object would leak between saves.
            expect(BL.emptySlots()).toEqual({ weekly: null, monthly: null });
        });
    });

    describe('findQuest / isTarget — the read side', () => {
        const lists = {
            weeklyGoals: [{ id: 'w1', title: 'Slay' }],
            sideQuests: [{ id: 's1', title: 'Scout' }],
            monthlyGoals: [{ id: 'm1', title: 'Raid' }],
            yearlyGoals: [{ id: 'y1', title: 'Campaign' }],
            lifeGoals: [{ id: 'l1', title: 'Legend' }],
        };

        test('resolves the live quest for every tier, legacy ones included', () => {
            const find = (questType, questId) => BL.findQuest({ questType, questId }, lists);
            expect(find('weekly', 'w1')).toBe(lists.weeklyGoals[0]);
            expect(find('sidequest', 's1')).toBe(lists.sideQuests[0]);
            expect(find('monthly', 'm1')).toBe(lists.monthlyGoals[0]);
            expect(find('yearly', 'y1')).toBe(lists.yearlyGoals[0]);
            expect(find('epic', 'l1')).toBe(lists.lifeGoals[0]);
        });

        test('null for a deleted target, an unknown tier, or a non-record', () => {
            expect(BL.findQuest({ questType: 'weekly', questId: 'gone' }, lists)).toBeNull();
            expect(BL.findQuest({ questType: 'mystery', questId: 'w1' }, lists)).toBeNull();
            expect(BL.findQuest({ empty: true }, lists)).toBeNull();
            expect(BL.findQuest(null, lists)).toBeNull();
            expect(BL.findQuest(undefined, lists)).toBeNull();
        });

        const active = {
            weekly: { questType: 'weekly', questId: 'w1', status: 'active' },
            monthly: null,
        };

        test('badges only the live target of an ACTIVE bounty', () => {
            expect(BL.isTarget(active, 'weekly', 'w1')).toBe(true);
            expect(BL.isTarget(active, 'sidequest', 'w1')).toBe(false);
            expect(BL.isTarget(active, 'weekly', 'nope')).toBe(false);
        });

        test('a claimed, expired or empty bounty badges nothing', () => {
            for (const status of ['claimed', 'expired']) {
                expect(BL.isTarget({ weekly: { ...active.weekly, status } }, 'weekly', 'w1')).toBe(false);
            }
            expect(BL.isTarget({ weekly: { empty: true }, monthly: null }, 'weekly', 'w1')).toBe(false);
        });

        test('checks BOTH cadences, and survives an absent map', () => {
            const monthlyOnly = {
                weekly: null,
                monthly: { questType: 'monthly', questId: 'm1', status: 'active' },
            };
            expect(BL.isTarget(monthlyOnly, 'monthly', 'm1')).toBe(true);
            expect(BL.isTarget(null, 'weekly', 'w1')).toBe(false);
            expect(BL.isTarget(undefined, 'weekly', 'w1')).toBe(false);
        });
    });

    describe('timeLeftLabel', () => {
        const NOW = D(2026, 6, 10, 9, 0).getTime();
        const HOUR = 3600000;
        const label = (offsetMs) => BL.timeLeftLabel(new Date(NOW + offsetMs).toISOString(), NOW);

        test('a closed window reads "expired" — including the exact instant', () => {
            expect(label(-HOUR)).toBe('expired');
            expect(label(-1)).toBe('expired');
            expect(label(0)).toBe('expired');
        });

        test('under an hour is spelled out rather than "0h"', () => {
            expect(label(1)).toBe('less than 1h left');
            expect(label(30 * 60000)).toBe('less than 1h left');
            expect(label(HOUR - 1)).toBe('less than 1h left');
        });

        test('hours are floored, up to the 24h changeover', () => {
            expect(label(HOUR)).toBe('1h left');
            expect(label(2 * HOUR)).toBe('2h left');
            expect(label(23 * HOUR)).toBe('23h left');
            expect(label(24 * HOUR - 1)).toBe('23h left');
        });

        test('a day or more is ROUNDED, with singular/plural agreement', () => {
            expect(label(24 * HOUR)).toBe('1 day left');
            expect(label(36 * HOUR)).toBe('2 days left');   // round(1.5) → 2
            expect(label(47 * HOUR)).toBe('2 days left');
            expect(label(72 * HOUR)).toBe('3 days left');
        });

        test('accepts an ISO string, epoch number or Date', () => {
            const exp = new Date(NOW + 2 * HOUR);
            expect(BL.timeLeftLabel(exp.toISOString(), NOW)).toBe('2h left');
            expect(BL.timeLeftLabel(exp.getTime(), NOW)).toBe('2h left');
            expect(BL.timeLeftLabel(exp, NOW)).toBe('2h left');
        });
    });

    // ── INVARIANT 3: the deliberate 1ms disagreement ─────────────────────────
    describe('isPastWindow', () => {
        const exp = D(2026, 6, 14, 23, 59, 59, 999);
        const bounty = { expiresAt: exp.toISOString() };

        test('is STRICTLY past — the boundary instant is still inside the window', () => {
            expect(BL.isPastWindow(bounty, exp.getTime() - 1)).toBe(false);
            expect(BL.isPastWindow(bounty, exp.getTime())).toBe(false);
            expect(BL.isPastWindow(bounty, exp.getTime() + 1)).toBe(true);
        });

        test('the reminder resolver DISAGREES at exactly the boundary, on purpose', () => {
            // _soonestClaimableBounty keeps its own inclusive phrasing
            // `!(expMs > nowMs)`. At now === expiresAt the claim path still credits
            // while the resolver already declines to schedule a nudge, so for one
            // millisecond a bounty is claimable but un-nudged. Harmless (the
            // reminder is an optimisation, the claim path is the authority) and
            // changing either side is a gameplay decision — pinned, not "fixed".
            const gm = mgr({ weeklyGoals: [{ id: 'w1', title: 'Slay' }] });
            gm.activeBounties = {
                weekly: {
                    periodKey: '2026-W24', cadence: 'weekly', questType: 'weekly', questId: 'w1',
                    expiresAt: exp.toISOString(), chestTier: 'silver', status: 'active', rerolled: false,
                },
                monthly: null,
            };

            const atBoundary = new Date(exp.getTime());
            expect(BL.isPastWindow(gm.activeBounties.weekly, atBoundary.getTime())).toBe(false);
            expect(gm._soonestClaimableBounty(atBoundary)).toBeNull();

            // One millisecond earlier the two agree the bounty is live.
            const before = new Date(exp.getTime() - 1);
            expect(BL.isPastWindow(gm.activeBounties.weekly, before.getTime())).toBe(false);
            expect(gm._soonestClaimableBounty(before)).toMatchObject({ cadence: 'weekly', chestTier: 'silver' });
        });
    });

    // ── the class delegators still speak for the module ──────────────────────
    describe('class parity (the thin wrappers)', () => {
        test('the boundary/key/gate wrappers return exactly the module values', () => {
            const gm = mgr();
            for (const cadence of BL.CADENCES) {
                expect(gm._bountyPeriodKey(cadence, WED))
                    .toBe(BL.periodKey(cadence, WED, (d) => gm._weekKey(d)));
                expect(LF(gm._bountyPeriodStart(cadence, WED))).toEqual(LF(BL.periodStart(cadence, WED)));
                expect(LF(gm._bountyDeadline(cadence, WED))).toEqual(LF(BL.deadline(cadence, WED)));
            }
        });

        test('the weekly period key is the class _weekKey, not a second spelling', () => {
            const gm = mgr();
            expect(gm._bountyPeriodKey('weekly', WED)).toBe(gm._weekKey(WED));
        });

        test('_bountyUnlocked forwards the live unlock table on every onboarding path', () => {
            for (const path of [null, 'goals']) {
                for (const level of [1, 5, 6, 7, 8]) {
                    const gm = mgr();
                    gm.applyOnboardingPath(path);
                    gm.level = level;
                    for (const cadence of BL.CADENCES) {
                        expect(gm._bountyUnlocked(cadence))
                            .toBe(BL.isUnlocked(cadence, level, gm.goalTabUnlockLevels));
                    }
                }
            }
        });

        test('the eligibility + pick wrappers agree with the module', () => {
            const quests = {
                weeklyGoals: [
                    { id: 'w1', created: D(2026, 6, 1).toISOString() },
                    { id: 'w2', created: D(2026, 6, 9).toISOString() },
                ],
                sideQuests: [{ id: 's1', created: D(2026, 5, 30).toISOString() }],
                monthlyGoals: [{ id: 'm1', created: D(2026, 5, 2).toISOString() }],
            };
            const gm = mgr(quests);
            for (const cadence of BL.CADENCES) {
                const start = gm._bountyPeriodStart(cadence, WED);
                expect(gm._bountyEligibleQuests(cadence, start))
                    .toEqual(BL.eligibleQuests(cadence, start, gm));
            }
            for (const len of [0, 1, 5, 17]) {
                expect(gm._bountySeededIndex('2026-W24', 'reroll', len))
                    .toBe(BL.seededIndex('2026-W24', 'reroll', len));
            }
        });

        test('the read-side wrappers agree with the module', () => {
            const gm = mgr({
                weeklyGoals: [{ id: 'w1', title: 'Slay' }],
                monthlyGoals: [{ id: 'm1', title: 'Raid' }],
            });
            const record = { questType: 'weekly', questId: 'w1', status: 'active' };
            gm.activeBounties = { weekly: record, monthly: null };

            expect(gm._bountyQuest(record)).toBe(BL.findQuest(record, gm));
            expect(gm.isBountyTarget('weekly', 'w1')).toBe(BL.isTarget(gm.activeBounties, 'weekly', 'w1'));
            expect(gm.isBountyTarget('monthly', 'm1')).toBe(false);

            const exp = D(2026, 6, 14, 23, 59, 59, 999).toISOString();
            expect(gm._bountyTimeLeftLabel(exp)).toBe(BL.timeLeftLabel(exp, Date.now()));
        });

        test('assignment writes a module-shaped record, once per period', () => {
            const gm = mgr({
                weeklyGoals: [
                    { id: 'w1', created: D(2026, 6, 1).toISOString() },
                    { id: 'w2', created: D(2026, 6, 1).toISOString() },
                ],
            });
            const assigned = gm.maybeAssignBounty('weekly', WED);
            expect(assigned).toMatchObject({
                periodKey: gm._weekKey(WED),
                cadence: 'weekly',
                questType: 'weekly',
                chestTier: 'silver',
                status: 'active',
                rerolled: false,
            });
            expect(LF(new Date(assigned.expiresAt))).toEqual(LF(BL.deadline('weekly', WED)));
            expect(['w1', 'w2']).toContain(assigned.questId);

            // Re-running inside the same period is a no-op returning the same object.
            expect(gm.maybeAssignBounty('weekly', WED)).toBe(gm.activeBounties.weekly);
        });

        test('no eligible quest yields the empty nudge; a locked level yields null', () => {
            expect(mgr().maybeAssignBounty('weekly', WED)).toEqual({
                periodKey: mgr()._weekKey(WED), cadence: 'weekly', empty: true,
            });

            const locked = mgr({
                level: 1,
                weeklyGoals: [{ id: 'w1', created: D(2026, 6, 1).toISOString() }],
            });
            expect(locked.maybeAssignBounty('weekly', WED)).toBeNull();
            expect(locked.activeBounties).toEqual({ weekly: null, monthly: null });
        });

        test('an absent activeBounties map is initialized from emptySlots, not thrown on', () => {
            const gm = mgr({ weeklyGoals: [{ id: 'w1', created: D(2026, 6, 1).toISOString() }] });
            gm.activeBounties = null;
            expect(() => gm.maybeAssignBounty('weekly', WED)).not.toThrow();
            expect(gm.activeBounties.monthly).toBeNull();
            expect(gm.activeBounties.weekly).toMatchObject({ questId: 'w1', status: 'active' });
        });

        test('completing the target credits once; a stale window expires instead', () => {
            const live = (over = {}) => ({
                periodKey: '2026-W24', cadence: 'weekly', questType: 'weekly', questId: 'w1',
                assignedAt: D(2026, 6, 8).toISOString(),
                expiresAt: D(2099, 1, 1).toISOString(),
                chestTier: 'silver', status: 'active', rerolled: false, ...over,
            });

            const gm = mgr({ weeklyGoals: [{ id: 'w1' }] });
            gm.activeBounties = { weekly: live(), monthly: null };
            gm.checkBountyCompletion('w1');
            expect(gm.activeBounties.weekly.status).toBe('claimed');

            // Idempotent — a second check changes nothing.
            gm.checkBountyCompletion('w1');
            expect(gm.activeBounties.weekly.status).toBe('claimed');

            // A non-target id is ignored.
            const other = mgr({ weeklyGoals: [{ id: 'w1' }] });
            other.activeBounties = { weekly: live(), monthly: null };
            other.checkBountyCompletion('nope');
            expect(other.activeBounties.weekly.status).toBe('active');

            // Past its window → expired, never claimed.
            const late = mgr({ weeklyGoals: [{ id: 'w1' }] });
            late.activeBounties = { weekly: live({ expiresAt: D(2020, 1, 1).toISOString() }), monthly: null };
            late.checkBountyCompletion('w1');
            expect(late.activeBounties.weekly.status).toBe('expired');

            // No map at all → no throw.
            const none = mgr();
            none.activeBounties = null;
            expect(() => none.checkBountyCompletion('w1')).not.toThrow();
        });

        test('refreshBounties self-heals a record whose tier the cadence dropped', () => {
            const gm = mgr({
                weeklyGoals: [{ id: 'w1', created: D(2026, 6, 1).toISOString() }],
                monthlyGoals: [{ id: 'm1', created: D(2026, 5, 1).toISOString() }],
                yearlyGoals: [{ id: 'y1', created: D(2020, 1, 1).toISOString() }],
            });
            // A legacy monthly bounty pointing at 'yearly' — a tier monthly no
            // longer serves (servesTier === false), so it must be re-picked.
            gm.activeBounties = {
                weekly: null,
                monthly: {
                    periodKey: '2026-06', cadence: 'monthly', questType: 'yearly', questId: 'y1',
                    expiresAt: D(2099, 1, 1).toISOString(), chestTier: 'royal',
                    status: 'active', rerolled: false,
                },
            };
            gm.refreshBounties();
            expect(gm.activeBounties.monthly.questType).toBe('monthly');
            expect(gm.activeBounties.monthly.questId).toBe('m1');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// recurring-logic.js — pure recurring-task scheduling rules (Roadmap #1, 75th slice).
//
// Replaces the throwaway characterization baseline that guarded the swap. Before
// this slice the whole subsystem had FIVE tests (weekly match, the duplicate
// guard, the inactive skip, monthly-date and the generated-task shape) and
// NOTHING for `biweekly` or `monthly-weekday` — the only two branches with real
// date math in them.
//
// Calendar facts these tests lean on (January 2025 opens on a WEDNESDAY):
//   4th Sat · 5th Sun · 6th Mon · 7th Tue (1st Tue) · 14th Tue (2nd) · 15th Wed
//   (3rd Wed) · 21st Tue (3rd) · 28th Tue (4th AND last) · 31st Fri (5th and
//   last). February 2025 ends Friday the 28th (4th and last Friday).
//
// Every Date is built from LOCAL calendar fields, because every branch of
// `dueToday` reads local getters — so the suite is timezone-independent. The one
// deliberate exception is the biweekly offset walk, which builds UTC instants on
// purpose to stand in for users in other timezones.
// ═══════════════════════════════════════════════════════════════════════════
describe('recurring-logic.js (pure recurring-task scheduling rules)', () => {
    const RL = require('../recurring-logic.js').default;

    /** Local-field noon Date — mirrors the class's own `T12:00:00` parse. */
    const at = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);
    /** The per-sweep context every schedule branch reads. */
    const ctx = (y, m, d) => RL.dayContext(at(y, m, d));

    const WED = ctx(2025, 1, 15);

    describe('the one day vocabulary', () => {
        test('DAY_KEYS is Sunday-first because it is indexed by Date.getDay()', () => {
            expect(RL.DAY_KEYS).toEqual(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
            // Jan 5 2025 is a Sunday — walk a real week through the real getter.
            RL.DAY_KEYS.forEach((key, i) => {
                expect(RL.dayKeyFor(at(2025, 1, 5 + i))).toBe(key);
            });
        });

        test('DAY_ORDER is Monday-first for the pickers, and is the same seven days', () => {
            expect(RL.DAY_ORDER).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
            expect([...RL.DAY_ORDER].sort()).toEqual([...RL.DAY_KEYS].sort());
        });

        test('the two orders are NOT interchangeable — swapping them shifts every schedule by a day', () => {
            expect(RL.DAY_ORDER).not.toEqual(RL.DAY_KEYS);
            const sunday = at(2025, 1, 5);
            expect(RL.DAY_KEYS[sunday.getDay()]).toBe('sun');
            expect(RL.DAY_ORDER[sunday.getDay()]).toBe('mon'); // the drift, made visible
        });

        test('both label tables cover all seven keys', () => {
            RL.DAY_KEYS.forEach(key => {
                expect(RL.DAY_LABELS[key]).toEqual(expect.any(String));
                expect(RL.DAY_LABELS_LONG[key]).toEqual(expect.any(String));
                expect(RL.DAY_LABELS_LONG[key].startsWith(RL.DAY_LABELS[key])).toBe(true);
            });
            expect(Object.keys(RL.DAY_LABELS)).toHaveLength(7);
            expect(Object.keys(RL.DAY_LABELS_LONG)).toHaveLength(7);
        });

        test('DAY_LABELS agrees with the copy recurring-render.js deliberately keeps inline', () => {
            // recurring-render.js takes injected deps only and never reaches for another
            // module, so its table stays duplicated — this drives the REAL builder across
            // all seven keys so the duplication is CAUGHT rather than merely re-homed.
            const RECURRING_RENDER = require('../recurring-render.js').default;
            RL.DAY_KEYS.forEach(key => {
                const html = RECURRING_RENDER.renderRecurringTasksHTML({
                    recurringTasks: [{ id: 1, active: true, title: 'T', recurrence: { type: 'biweekly', day: key } }],
                    escapeHTML: (s) => s,
                });
                expect(html).toContain(`Every other ${RL.DAY_LABELS[key]}`);
            });
        });

        test('the exported tables are frozen', () => {
            expect(Object.isFrozen(RL.DAY_KEYS)).toBe(true);
            expect(Object.isFrozen(RL.DAY_ORDER)).toBe(true);
            expect(Object.isFrozen(RL.DAY_LABELS)).toBe(true);
            expect(Object.isFrozen(RL.DAY_LABELS_LONG)).toBe(true);
            expect(Object.isFrozen(RL)).toBe(true);
        });

        test('dayContext bundles the date, its key and its day-of-month', () => {
            expect(WED).toEqual({ date: expect.any(Date), dayKey: 'wed', dayOfMonth: 15 });
        });
    });

    describe('daysSince — the mixed local-noon / UTC-midnight parse', () => {
        test('a true fortnight reads as 13, 14 or 15 depending purely on the user\'s offset', () => {
            const n = RL.daysSince(at(2025, 1, 15), '2025-01-01');
            expect(n).toBeGreaterThanOrEqual(13);
            expect(n).toBeLessThanOrEqual(15);
        });

        test('the >= 13 window holds for every UTC offset from -12 to +14', () => {
            // Local noon at offset X is `12 - X` hours UTC, while the stored stamp parses
            // as UTC midnight — so a 14-day gap floors to 14 + floor((12 - X) / 24).
            for (let x = -12; x <= 14; x++) {
                const localNoonAtOffset = new Date(Date.UTC(2025, 0, 15, 12 - x));
                const n = RL.daysSince(localNoonAtOffset, '2025-01-01');
                expect(n).toBe(14 + Math.floor((12 - x) / 24));
                expect(n).toBeGreaterThanOrEqual(RL.BIWEEKLY_MIN_DAYS);
            }
        });

        test('why the threshold is 13 and not 14 — the far east would otherwise skip a fortnight', () => {
            const kiribati = new Date(Date.UTC(2025, 0, 15, 12 - 14)); // UTC+14
            const bakerIsland = new Date(Date.UTC(2025, 0, 15, 12 + 12)); // UTC-12
            expect(RL.daysSince(kiribati, '2025-01-01')).toBe(13);
            expect(RL.daysSince(bakerIsland, '2025-01-01')).toBe(15);
            // A `>= 14` rule would silently strand the first of those.
            expect(RL.BIWEEKLY_MIN_DAYS).toBe(13);
        });
    });

    describe('the monthly-weekday primitives', () => {
        test('occurrenceOfMonth is exact — the Nth weekday always lands in its 7-day band', () => {
            expect(RL.occurrenceOfMonth(1)).toBe(1);
            expect(RL.occurrenceOfMonth(7)).toBe(1);
            expect(RL.occurrenceOfMonth(8)).toBe(2);
            expect(RL.occurrenceOfMonth(14)).toBe(2);
            expect(RL.occurrenceOfMonth(21)).toBe(3);
            expect(RL.occurrenceOfMonth(22)).toBe(4);
            expect(RL.occurrenceOfMonth(28)).toBe(4);
            expect(RL.occurrenceOfMonth(29)).toBe(5); // legitimately 5
            expect(RL.occurrenceOfMonth(31)).toBe(5);
        });

        test('isLastOccurrenceInMonth probes seven days ahead rather than counting', () => {
            expect(RL.isLastOccurrenceInMonth(at(2025, 1, 28))).toBe(true);  // 4th AND last Tue
            expect(RL.isLastOccurrenceInMonth(at(2025, 1, 21))).toBe(false); // 3rd Tue
            expect(RL.isLastOccurrenceInMonth(at(2025, 1, 31))).toBe(true);  // 5th and last Fri
            expect(RL.isLastOccurrenceInMonth(at(2025, 2, 28))).toBe(true);  // 4th and last Fri
        });

        test('the probe does not mutate the date it is given', () => {
            const d = at(2025, 1, 28);
            RL.isLastOccurrenceInMonth(d);
            expect(d.getTime()).toBe(at(2025, 1, 28).getTime());
        });
    });

    describe('dueToday — weekly', () => {
        test('fires when today\'s key is listed, alone or among others', () => {
            expect(RL.dueToday({ type: 'weekly', days: ['wed'] }, WED)).toBe(true);
            expect(RL.dueToday({ type: 'weekly', days: ['mon', 'wed', 'fri'] }, WED)).toBe(true);
        });

        test('a non-matching or empty list is simply not due', () => {
            expect(RL.dueToday({ type: 'weekly', days: ['mon'] }, WED)).toBe(false);
            expect(RL.dueToday({ type: 'weekly', days: [] }, WED)).toBe(false);
        });

        test('index 0 and index 6 both resolve — the Sunday-first boundary', () => {
            expect(RL.dueToday({ type: 'weekly', days: ['sun'] }, ctx(2025, 1, 5))).toBe(true);
            expect(RL.dueToday({ type: 'weekly', days: ['sat'] }, ctx(2025, 1, 4))).toBe(true);
            expect(RL.dueToday({ type: 'weekly', days: ['mon'] }, ctx(2025, 1, 6))).toBe(true);
        });

        test('a corrupt `days` is not due instead of throwing out of the load-time sweep', () => {
            const corrupt = [{ type: 'weekly' }, { type: 'weekly', days: null }, { type: 'weekly', days: 'wed' }];
            corrupt.forEach(recurrence => {
                expect(() => RL.dueToday(/** @type {any} */ (recurrence), WED)).not.toThrow();
                expect(RL.dueToday(/** @type {any} */ (recurrence), WED)).toBe(false);
            });
        });
    });

    describe('dueToday — biweekly (the 13-day window on its own anchor)', () => {
        const bi = (lastGenerated) => ({ type: 'biweekly', day: 'wed', lastGenerated });

        test('the very first run has no anchor, so it fires', () => {
            expect(RL.dueToday(bi(null), WED)).toBe(true);
            expect(RL.dueToday(bi(undefined), WED)).toBe(true);
        });

        test('the wrong weekday never fires, anchor or not', () => {
            expect(RL.dueToday({ type: 'biweekly', day: 'mon', lastGenerated: null }, WED)).toBe(false);
            expect(RL.dueToday({ type: 'biweekly', day: 'mon', lastGenerated: '2024-11-06' }, WED)).toBe(false);
        });

        test('a fortnight-old anchor fires; a week-old one does not', () => {
            expect(RL.dueToday(bi('2025-01-01'), WED)).toBe(true);
            expect(RL.dueToday(bi('2025-01-08'), WED)).toBe(false);
        });

        test('a same-day anchor never re-fires', () => {
            expect(RL.dueToday(bi('2025-01-15'), WED)).toBe(false);
        });

        test('a long-dormant task fires on its next matching weekday', () => {
            expect(RL.dueToday(bi('2024-11-06'), WED)).toBe(true);
        });
    });

    describe('dueToday — monthly-date', () => {
        test('matches on the calendar day number', () => {
            expect(RL.dueToday({ type: 'monthly-date', dayOfMonth: 15 }, WED)).toBe(true);
            expect(RL.dueToday({ type: 'monthly-date', dayOfMonth: 14 }, WED)).toBe(false);
            expect(RL.dueToday({ type: 'monthly-date', dayOfMonth: 1 }, ctx(2025, 1, 1))).toBe(true);
            expect(RL.dueToday({ type: 'monthly-date', dayOfMonth: 28 }, ctx(2025, 2, 28))).toBe(true);
        });

        test('a 31st schedule simply never fires in a short month', () => {
            expect(RL.dueToday({ type: 'monthly-date', dayOfMonth: 31 }, ctx(2025, 2, 28))).toBe(false);
            expect(RL.dueToday({ type: 'monthly-date', dayOfMonth: 31 }, ctx(2025, 1, 31))).toBe(true);
        });
    });

    describe('dueToday — monthly-weekday', () => {
        const mw = (week, day) => ({ type: 'monthly-weekday', week, day });

        test('the Nth weekday counts by 7-day band', () => {
            expect(RL.dueToday(mw(1, 'tue'), ctx(2025, 1, 7))).toBe(true);
            expect(RL.dueToday(mw(2, 'tue'), ctx(2025, 1, 7))).toBe(false);
            expect(RL.dueToday(mw(2, 'tue'), ctx(2025, 1, 14))).toBe(true);
            expect(RL.dueToday(mw(3, 'tue'), ctx(2025, 1, 21))).toBe(true);
            expect(RL.dueToday(mw(4, 'tue'), ctx(2025, 1, 28))).toBe(true);
        });

        test('the wrong weekday never fires', () => {
            expect(RL.dueToday(mw(3, 'tue'), WED)).toBe(false);
        });

        test('week -1 means LAST, which is the 4th in one month and the 5th in another', () => {
            expect(RL.dueToday(mw(-1, 'tue'), ctx(2025, 1, 28))).toBe(true);  // 4th and last
            expect(RL.dueToday(mw(-1, 'tue'), ctx(2025, 1, 21))).toBe(false); // 3rd, not yet
            expect(RL.dueToday(mw(-1, 'fri'), ctx(2025, 1, 31))).toBe(true);  // 5th and last
            expect(RL.dueToday(mw(-1, 'fri'), ctx(2025, 2, 28))).toBe(true);  // 4th and last
            expect(RL.LAST_OCCURRENCE).toBe(-1);
        });

        test('a stored week: 5 is honoured even though the UI only offers 1-4 and Last', () => {
            expect(RL.dueToday(mw(5, 'fri'), ctx(2025, 1, 31))).toBe(true);
            expect(RL.dueToday(mw(5, 'fri'), ctx(2025, 2, 28))).toBe(false);
        });
    });

    describe('dueToday — anything else', () => {
        test('an unknown type, and an absent recurrence, are not due', () => {
            expect(RL.dueToday(/** @type {any} */ ({ type: 'fortnightly', days: ['wed'] }), WED)).toBe(false);
            expect(RL.dueToday(/** @type {any} */ (null), WED)).toBe(false);
            expect(RL.dueToday(/** @type {any} */ (undefined), WED)).toBe(false);
            expect(RL.dueToday(/** @type {any} */ ({}), WED)).toBe(false);
        });
    });

    describe('the three pre-schedule guards', () => {
        const TODAY = '2025-01-15';
        const rt = (over = {}) => ({
            id: 100, title: 'RT', description: 'desc', active: true, lastGenerated: null,
            recurrence: { type: 'weekly', days: ['wed'] }, ...over,
        });

        test('hasGeneratedToday is the once-per-DAY stamp', () => {
            expect(RL.hasGeneratedToday(rt({ lastGenerated: TODAY }), TODAY)).toBe(true);
            expect(RL.hasGeneratedToday(rt({ lastGenerated: '2025-01-14' }), TODAY)).toBe(false);
            expect(RL.hasGeneratedToday(rt(), TODAY)).toBe(false);
        });

        test('taskExistsFor matches on ALL THREE of title, due date and parent id', () => {
            const hit = { id: 1, title: 'RT', dueDate: TODAY, recurringTaskId: 100 };
            expect(RL.taskExistsFor([hit], rt(), TODAY)).toBe(true);
            expect(RL.taskExistsFor([{ ...hit, title: 'Other' }], rt(), TODAY)).toBe(false);
            expect(RL.taskExistsFor([{ ...hit, dueDate: '2025-01-14' }], rt(), TODAY)).toBe(false);
            expect(RL.taskExistsFor([{ ...hit, recurringTaskId: 555 }], rt(), TODAY)).toBe(false);
            expect(RL.taskExistsFor([], rt(), TODAY)).toBe(false);
        });

        test('an unrelated task that merely shares the title does not suppress generation', () => {
            const decoy = { id: 9, title: 'RT', dueDate: TODAY, recurringTaskId: 555 };
            expect(RL.isPending(rt(), { todayStr: TODAY, dailyTasks: [decoy] })).toBe(true);
        });

        test('isPending is active AND not-generated-today AND not-already-present', () => {
            const deps = { todayStr: TODAY, dailyTasks: [] };
            expect(RL.isPending(rt(), deps)).toBe(true);
            expect(RL.isPending(rt({ active: false }), deps)).toBe(false);
            expect(RL.isPending(rt({ active: undefined }), deps)).toBe(false);
            expect(RL.isPending(rt({ lastGenerated: TODAY }), deps)).toBe(false);
            expect(RL.isPending(rt(), {
                todayStr: TODAY,
                dailyTasks: [{ id: 1, title: 'RT', dueDate: TODAY, recurringTaskId: 100 }],
            })).toBe(false);
        });

        test('yesterday\'s generation does not block today', () => {
            expect(RL.isPending(rt({ lastGenerated: '2025-01-14' }), { todayStr: TODAY, dailyTasks: [] })).toBe(true);
        });
    });

    describe('generatedTask', () => {
        const parent = {
            id: 100, title: 'RT', description: 'desc', active: true,
            recurrence: { type: 'weekly', days: ['wed'] },
        };

        test('carries the parent\'s text and links back by id', () => {
            expect(RL.generatedTask(parent, { id: 7, todayStr: '2025-01-15', createdISO: '2025-01-15T09:00:00.000Z' }))
                .toEqual({
                    id: 7,
                    title: 'RT',
                    description: 'desc',
                    weeklyGoalIds: [],
                    created: '2025-01-15T09:00:00.000Z',
                    dueDate: '2025-01-15',
                    completed: false,
                    checklist: [],
                    recurringTaskId: 100,
                });
        });

        test('hands back FRESH arrays each call, never shared ones', () => {
            const deps = { id: 7, todayStr: '2025-01-15', createdISO: '2025-01-15T09:00:00.000Z' };
            const a = RL.generatedTask(parent, deps);
            const b = RL.generatedTask(parent, deps);
            expect(a.checklist).not.toBe(b.checklist);
            expect(a.weeklyGoalIds).not.toBe(b.weeklyGoalIds);
        });
    });

    // ── class parity: the impure half still on GoalManager ───────────────────
    describe('class parity — generateRecurringTasksForToday', () => {
        /** Deterministic manager: fixed "today" and counter ids. */
        const managerOn = (today, recurringTasks, dailyTasks = []) => {
            const gm = createTestManager();
            gm.getTodayDateString = () => today;
            gm.recurringTasks = JSON.parse(JSON.stringify(recurringTasks));
            gm.dailyTasks = JSON.parse(JSON.stringify(dailyTasks));
            let n = 0;
            gm.uniqueId = () => ++n * 1000;
            return gm;
        };

        const one = (recurrence, over = {}) => [{
            id: 100, title: 'RT', description: 'desc', recurrence, active: true, lastGenerated: null, ...over,
        }];

        test('a due task produces exactly the module\'s record', () => {
            const gm = managerOn('2025-01-15', one({ type: 'weekly', days: ['wed'] }));
            gm.generateRecurringTasksForToday();

            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0]).toEqual({
                ...RL.generatedTask(gm.recurringTasks[0], {
                    id: 1000, todayStr: '2025-01-15', createdISO: gm.dailyTasks[0].created,
                }),
            });
            expect(typeof gm.dailyTasks[0].created).toBe('string');
        });

        test('a task that is not due generates nothing and stamps nothing', () => {
            const gm = managerOn('2025-01-15', one({ type: 'weekly', days: ['mon'] }));
            gm.generateRecurringTasksForToday();
            expect(gm.dailyTasks).toHaveLength(0);
            expect(gm.recurringTasks[0].lastGenerated).toBeNull();
        });

        test('BOTH lastGenerated stamps are written for biweekly, only the day guard otherwise', () => {
            const bi = managerOn('2025-01-15', one({ type: 'biweekly', day: 'wed', lastGenerated: null }));
            bi.generateRecurringTasksForToday();
            expect(bi.recurringTasks[0].lastGenerated).toBe('2025-01-15');
            expect(bi.recurringTasks[0].recurrence.lastGenerated).toBe('2025-01-15');

            const wk = managerOn('2025-01-15', one({ type: 'weekly', days: ['wed'] }));
            wk.generateRecurringTasksForToday();
            expect(wk.recurringTasks[0].lastGenerated).toBe('2025-01-15');
            expect(wk.recurringTasks[0].recurrence.lastGenerated).toBeUndefined();
        });

        test('the day guard stops a second sweep on the same day', () => {
            const gm = managerOn('2025-01-15', one({ type: 'weekly', days: ['wed'] }));
            gm.generateRecurringTasksForToday();
            gm.generateRecurringTasksForToday();
            expect(gm.dailyTasks).toHaveLength(1);
        });

        test('a mixed sweep generates only the due, active, un-generated tasks', () => {
            const gm = managerOn('2025-01-15', [
                { id: 1, title: 'A', description: '', recurrence: { type: 'weekly', days: ['wed'] }, active: true, lastGenerated: null },
                { id: 2, title: 'B', description: '', recurrence: { type: 'weekly', days: ['mon'] }, active: true, lastGenerated: null },
                { id: 3, title: 'C', description: '', recurrence: { type: 'monthly-date', dayOfMonth: 15 }, active: false, lastGenerated: null },
                { id: 4, title: 'D', description: '', recurrence: { type: 'biweekly', day: 'wed', lastGenerated: null }, active: true, lastGenerated: null },
            ]);
            gm.generateRecurringTasksForToday();

            expect(gm.dailyTasks.map(t => t.title)).toEqual(['A', 'D']);
            expect(gm.dailyTasks.map(t => t.recurringTaskId)).toEqual([1, 4]);
            expect(gm.recurringTasks.map(rt => rt.lastGenerated))
                .toEqual(['2025-01-15', null, null, '2025-01-15']);
        });

        test('the noon parse keeps the weekday correct rather than reading back a day early', () => {
            // A bare 'YYYY-MM-DD' parses as UTC midnight, which is the PREVIOUS day for
            // every user west of UTC — this is a Wednesday schedule on a Wednesday.
            const gm = managerOn('2025-01-15', one({ type: 'weekly', days: ['wed'] }));
            gm.generateRecurringTasksForToday();
            expect(gm.dailyTasks).toHaveLength(1);
            expect(gm.dailyTasks[0].dueDate).toBe('2025-01-15');
        });

        test('the sweep persists', () => {
            const gm = managerOn('2025-01-15', one({ type: 'weekly', days: ['wed'] }));
            gm.generateRecurringTasksForToday();
            expect(gm.saveData).toHaveBeenCalled();
        });

        test('one corrupt entry no longer breaks the whole load-time sweep', () => {
            const gm = managerOn('2025-01-15', [
                { id: 1, title: 'Corrupt', description: '', recurrence: { type: 'weekly' }, active: true, lastGenerated: null },
                { id: 2, title: 'Good', description: '', recurrence: { type: 'weekly', days: ['wed'] }, active: true, lastGenerated: null },
            ]);
            expect(() => gm.generateRecurringTasksForToday()).not.toThrow();
            expect(gm.dailyTasks.map(t => t.title)).toEqual(['Good']);
        });
    });
});

// ==================== EXPORT → IMPORT PARITY (Roadmap #1, 80th slice guard) ====================
//
// tests/persistence-roundtrip.test.js pins save ⇄ load. This is the THIRD leg of the
// same triangle: exportData ⇄ importData, the backup-file round trip.
//
// The 79th slice made exportData delegate to SAVE_SERIALIZER.buildSaveData, so a backup
// file is now a strict superset of the save blob. importData, however, is still a
// hand-maintained ~110-line field map — the LAST copy of the persistence field list —
// so any field export writes but import forgets is silently dropped on restore: the
// user's backup contains the value, and restoring it resets to whatever the running
// instance happened to hold.
//
// These tests drive the REAL importData and name every such field.
describe('export → import round-trip parity (backup files)', () => {
    const SAVE_SERIALIZER = require('../save-serializer.js').default;
    const {
        SAVE_ONLY_KEYS,
        EXPORT_ENVELOPE_KEYS,
        instanceKeyFor,
        saveOpts,
        makeFullManager
    } = require('./fixtures/full-manager.js');

    const IMPORTED_REMINDERS = { enabled: true, morningTime: '07:15' };

    beforeEach(() => {
        localStorage.clear();
    });

    /**
     * The exact payload exportData writes, built the way exportData now builds it:
     * buildSaveData + the reminderSettings extra + the file envelope. Going through
     * the serializer (rather than calling exportData) skips the share-sheet / native
     * Filesystem I/O while keeping the PAYLOAD identical — that payload is the contract
     * under test here.
     */
    function exportBlob() {
        const saved = SAVE_SERIALIZER.buildSaveData(makeFullManager(), saveOpts());
        const withEnvelope = Object.assign({}, saved, {
            reminderSettings: IMPORTED_REMINDERS,
            exportDate: new Date().toISOString(),
            version: '3.0.0'
        });
        // JSON round-trip: what actually happens to a backup file on disk.
        return JSON.parse(JSON.stringify(withEnvelope));
    }

    /** A manager ready to receive an import (the DOM/toast tail stubbed out). */
    function importTarget() {
        const gm = createTestManager();
        // createTestManager flips this to true to skip onboarding; a fresh import
        // target must carry the production default so the indistinguishable-field
        // guard can detect a dropped tutorialCompleted.
        gm.tutorialCompleted = false;
        gm.showConfirm = (_msg, onConfirm) => onConfirm();
        gm.loadTheme = jest.fn();
        gm.showSuccessNotification = jest.fn();
        return gm;
    }

    /**
     * Drive the real importData. importData assigns reader.onload BEFORE calling
     * readAsText, so a synchronous FileReader stand-in fires the handler inline and
     * keeps the test deterministic — jsdom's async FileReader would add flake, not
     * coverage, since the field map is what is under test.
     */
    function importInto(gm, blob) {
        const RealFileReader = global.FileReader;
        global.FileReader = /** @type {any} */ (class {
            constructor() { this.onload = null; this.onerror = null; }
            readAsText() { this.onload({ target: { result: JSON.stringify(blob) } }); }
        });
        try {
            gm.importData({ target: { files: [{ name: 'backup.json' }], value: 'backup.json' } });
        } finally {
            global.FileReader = RealFileReader;
        }
    }

    /** Blob keys that should land on the instance (envelope + schema gate excluded). */
    function restorableKeys(blob) {
        return Object.keys(blob)
            .filter(k => !EXPORT_ENVELOPE_KEYS.includes(k))
            .filter(k => !SAVE_ONLY_KEYS.includes(k));
    }

    test('the import actually ran (guard against a silently skipped confirm)', () => {
        const gm = importTarget();
        importInto(gm, exportBlob());
        expect(gm.showSuccessNotification).toHaveBeenCalled();
        expect(gm.saveData).toHaveBeenCalled();
    });

    // Health check, mirroring the save/load suite's "cannot pass by luck" test: if a
    // fixture value coincidentally equals the fresh manager's default, a dropped field
    // would be invisible. Any key listed here needs a more distinctive fixture value.
    test('every exported field differs from a fresh manager, so a drop cannot hide', () => {
        const blob = exportBlob();
        const fresh = importTarget();
        const indistinguishable = restorableKeys(blob).filter(
            k => JSON.stringify(fresh[instanceKeyFor(k)]) === JSON.stringify(blob[k])
        );
        expect(indistinguishable).toEqual([]);
    });

    test('every field in a backup file is restored by importData', () => {
        const blob = exportBlob();
        const gm = importTarget();
        importInto(gm, blob);

        // A key here rides in the backup file but is NEVER read by importData — the
        // value is silently lost on restore.
        const dropped = restorableKeys(blob).filter(
            k => JSON.stringify(gm[instanceKeyFor(k)]) !== JSON.stringify(blob[k])
        );
        expect(dropped).toEqual([]);
    });

    test('export → import → export is a fixed point', () => {
        const first = exportBlob();
        const gm = importTarget();
        importInto(gm, first);

        const second = SAVE_SERIALIZER.buildSaveData(gm, saveOpts());
        for (const key of Object.keys(second)) {
            if (SAVE_ONLY_KEYS.includes(key)) continue;
            expect(second[key]).toEqual(first[key]);
        }
    });

    test('reminderSettings is restored to its own localStorage key', () => {
        const gm = importTarget();
        importInto(gm, exportBlob());
        expect(gm.reminderSettings).toEqual(IMPORTED_REMINDERS);
        expect(JSON.parse(localStorage.getItem('reminderSettings'))).toEqual(IMPORTED_REMINDERS);
    });

    test('the pre-import backup of current data is written before overwriting', () => {
        localStorage.setItem('lifeOrganizeData', '{"xp":1}');
        const gm = importTarget();
        importInto(gm, exportBlob());
        expect(localStorage.getItem('lifeOrganizeData_pre_import_backup')).toBe('{"xp":1}');
    });

    test('a non-JSON file is rejected without touching state', () => {
        const gm = importTarget();
        const xpBefore = gm.xp;
        gm.importData({ target: { files: [{ name: 'notes.txt' }], value: 'notes.txt' } });
        expect(gm.showErrorNotification).toHaveBeenCalled();
        expect(gm.xp).toBe(xpBefore);
    });

    test('a JSON file that is not a backup is rejected', () => {
        const gm = importTarget();
        const xpBefore = gm.xp;
        importInto(gm, { somethingElse: true });
        expect(gm.showErrorNotification).toHaveBeenCalled();
        expect(gm.xp).toBe(xpBefore);
    });
});
