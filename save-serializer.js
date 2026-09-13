// @ts-check
'use strict';
/**
 * save-serializer.js — pure save-object builder (Engineering Roadmap #1).
 *
 * 76th incremental slice of the goal-manager.js God class. _doSave() was the last
 * untested save-data surface: its only job is to marshal the ~100 `this.*` fields
 * that the load path consumes into the one JSON blob. By lifting the object-builder
 * out, the save field map becomes independently testable, and the class method
 * shrinks to pruning + stringify + localStorage.setItem.
 *
 * The builder is deliberately field-by-field, not a clever loop, so every field
 * keeps its historical default/fallback and new fields are added explicitly. The
 * only dynamic values are the two fallback stamps injected by the caller:
 * `lastHabitReset` defaults to today, and `lastWeekReset` defaults to the current
 * week key — both were computed inside the original object literal and are now
 * precomputed and passed in.
 *
 * Dual-environment, no bundler (mirrors the other logic modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.SAVE_SERIALIZER.
 *   - Jest/Node: require('./save-serializer.js') returns the frozen namespace.
 */

/**
 * Build the save object from a GoalManager-like instance.
 *
 * @param {Record<string, any>} manager
 * @param {Object} fallbacks
 * @param {string} fallbacks.todayString
 * @param {string} fallbacks.currentWeekString
 * @returns {Record<string, any>}
 */
function buildSaveData(manager, { todayString, currentWeekString }) {
    return {
        lifeGoals: manager.lifeGoals,
        yearlyGoals: manager.yearlyGoals,
        monthlyGoals: manager.monthlyGoals,
        weeklyGoals: manager.weeklyGoals,
        dailyTasks: manager.dailyTasks,
        sideQuests: manager.sideQuests,
        habits: manager.habits,
        recurringTasks: manager.recurringTasks,
        xp: manager.xp,
        level: manager.level,
        badges: manager.badges,
        archivedGoals: manager.archivedGoals,

        goldCoins: manager.goldCoins,
        unlockedThemes: manager.unlockedThemes,
        currentTheme: manager.currentTheme,
        weeklyTrialPromptShown: manager.weeklyTrialPromptShown,
        weeklyTrialEndPromptShown: manager.weeklyTrialEndPromptShown,
        weeklyThemeCardDismissed: manager.weeklyThemeCardDismissed,
        lastFeaturedWeekTracked: manager.lastFeaturedWeekTracked,
        weeklyTrialApplyDates: manager.weeklyTrialApplyDates,
        unlockedTitles: manager.unlockedTitles,
        currentTitle: manager.currentTitle,
        treasureChests: manager.treasureChests,
        companion: manager.companion,
        companions: manager.companions,
        activeCompanionId: manager.activeCompanionId,

        spellbook: manager.spellbook,
        activeSpells: manager.activeSpells,
        classSchemaVersion: manager.CLASS_SCHEMA_VERSION,
        playerClass: manager.playerClass,
        classNodesUnlocked: manager.classNodesUnlocked,
        classCapstone: manager.classCapstone,
        skillPointsSpent: manager.skillPointsSpent,
        classSelectedAtLevel: manager.classSelectedAtLevel,
        subclass: manager.subclass,
        subclassNodesUnlocked: manager.subclassNodesUnlocked,

        activeQuestChains: manager.activeQuestChains,
        completedQuestChains: manager.completedQuestChains,

        focusCrystals: manager.focusCrystals,
        focusCrystalShards: manager.focusCrystalShards,
        repairableStreaks: manager.repairableStreaks,
        freeStreakRepairUsed: manager.freeStreakRepairUsed,
        totalFocusTime: manager.totalFocusTime,
        activeEnchantments: manager.activeEnchantments,
        focusEndTime: manager.focusEndTime,
        focusSessionLength: manager.focusSessionLength,
        deepWorkStack: manager.deepWorkStack,
        lastFocusSessionEndTime: manager.lastFocusSessionEndTime,
        pomodoroChain: manager.pomodoroChain,
        pomodoroChainSettings: manager.pomodoroChainSettings,

        timezone: manager.timezone,
        timezoneOffset: manager.timezoneOffset,
        tutorialCompleted: manager.tutorialCompleted,
        onboardingPath: manager.onboardingPath,
        lastHabitReset: manager.lastHabitReset || todayString,
        lastWeekReset: manager.lastWeekReset || currentWeekString,
        lastVisitDate: manager.lastVisitDate,
        lastWeekNumber: manager.lastWeekNumber,
        lastMonth: manager.lastMonth,
        lastYear: manager.lastYear,

        isPremium: manager.isPremium,
        premiumPurchaseDate: manager.premiumPurchaseDate,
        premiumPurchaseToken: manager.premiumPurchaseToken || null,

        lastLoginBonusDate: manager.lastLoginBonusDate,
        loginStreak: manager.loginStreak,

        referralCode: manager.referralCode,
        referredBy: manager.referredBy,
        referralRewardClaimed: manager.referralRewardClaimed,
        referralsSent: manager.referralsSent,

        onboardingShareShown: manager.onboardingShareShown,

        firstTaskCreatedTracked: manager.firstTaskCreatedTracked,
        firstTaskCompletedTracked: manager.firstTaskCompletedTracked,

        reviewPromptCount: manager.reviewPromptCount,
        reviewPromptLastDate: manager.reviewPromptLastDate,
        reviewLeft: manager.reviewLeft,

        chestsOpened: manager.chestsOpened,
        bossesDefeated: manager.bossesDefeated,
        focusSessionsCompleted: manager.focusSessionsCompleted,
        spellsCast: manager.spellsCast,
        totalGoldEarned: manager.totalGoldEarned,

        dailyBoss: manager.dailyBoss,
        weeklyBoss: manager.weeklyBoss,
        monthlyBoss: manager.monthlyBoss,
        attackCharges: manager.attackCharges,
        rageComboCounter: manager.rageComboCounter,
        activeCompanionId2: manager.activeCompanionId2,
        rangerProtectionsUsedThisWeek: manager.rangerProtectionsUsedThisWeek,
        rangerProtectionResetWeek: manager.rangerProtectionResetWeek,
        guardianProtectionsUsedThisWeek: manager.guardianProtectionsUsedThisWeek,
        guardianProtectionResetWeek: manager.guardianProtectionResetWeek,
        freeCastUsedDate: manager.freeCastUsedDate,
        highPriorityTasksToday: manager.highPriorityTasksToday,
        highPriorityXpDate: manager._highPriorityXpDate,

        bossLog: manager.bossLog,
        defeatedBossList: manager.defeatedBossList,
        dailyBossStreak: manager.dailyBossStreak,
        weeklyBossStreak: manager.weeklyBossStreak,
        monthlyBossStreak: manager.monthlyBossStreak,
        bossKillsThisMonth: manager.bossKillsThisMonth,
        bossKillsMonth: manager.bossKillsMonth,

        accountCreatedDate: manager.accountCreatedDate,
        titleStyle: manager.titleStyle,
        seenFeatureTutorials: manager.seenFeatureTutorials,
        progressiveUnlockInitialized: manager.progressiveUnlockInitialized,

        dailyQuestBoard: manager.dailyQuestBoard,
        dailyTracking: manager.dailyTracking,
        lastWoodenChestDate: manager.lastWoodenChestDate,

        activeBounties: manager.activeBounties,
        lastBountyClaim: manager.lastBountyClaim,

        activeChallenges: manager.activeChallenges,
        completedChallenges: manager.completedChallenges
    };
}

const SAVE_SERIALIZER = Object.freeze({
    buildSaveData
});


// Node / Jest

export default SAVE_SERIALIZER;
