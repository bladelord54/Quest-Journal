// Goal Management System
class GoalManager {
    constructor() {
        this.lifeGoals = [];
        this.yearlyGoals = [];
        this.monthlyGoals = [];
        this.weeklyGoals = [];
        this.dailyTasks = [];
        this.sideQuests = [];
        this.habits = [];
        this.recurringTasks = []; // Tasks that repeat on schedule
        this.currentCalendarDate = new Date();
        this.selectedDate = null;
        this.sideQuestFilter = 'all';
        this.xp = 0;
        this.level = 1;
        this.badges = [];
        this.darkMode = false;
        this.actionHistory = [];
        this.historyIndex = -1;
        this.archivedGoals = [];
        this.draggedItem = null;
        this.draggedType = null;
        
        // Rewards System
        this.goldCoins = 0;
        this.unlockedThemes = ['default'];
        this.currentTheme = 'default';
        this.unlockedTitles = [];
        this.currentTitle = null;
        this.treasureChests = [];
        this.companion = null; // Legacy - will migrate to companions array
        this.companions = []; // Collection of unlocked companions
        this.activeCompanionId = null; // Currently active companion type id
        this.statsPanelCollapsed = false;
        
        // Spellbook System
        this.spellbook = [];
        this.activeSpells = [];
        this.spellDefinitions = this.initializeSpells();
        
        // Quest Chains System
        this.activeQuestChains = [];
        this.completedQuestChains = [];
        this.questChainTemplates = this.initializeQuestChainTemplates();
        
        // Spell casting lock to prevent double-casting
        this.isCastingSpell = false;
        
        // Stats tracking for titles
        this.chestsOpened = 0;
        this.bossesDefeated = 0;
        this.focusSessionsCompleted = 0;
        this.spellsCast = 0;
        
        // Render optimization
        this.renderTimeout = null;
        this.isRendering = false;
        this.saveTimeout = null;
        this.currentView = 'dashboard';
        
        // DOM element cache for frequently accessed elements
        this.domCache = {};
        
        // Focus Timer & Enchantments
        this.focusCrystals = 0;
        this.focusTimer = null;
        this.focusTimeRemaining = 0;
        this.focusTimerRunning = false;
        this.totalFocusTime = 0; // in minutes
        this.activeEnchantments = [];
        this.enchantmentDefinitions = this.initializeEnchantments();
        
        // Settings
        this.timezone = 'auto'; // Can be 'auto' or a number (-12 to +13)
        this.timezoneOffset = 0;
        this.notificationsEnabled = false;
        
        // Bulk Actions
        this.bulkSelectionMode = false;
        this.selectedItems = new Set();
        
        // Tutorial System
        this.tutorialCompleted = false;
        this.currentTutorialStep = 0;
        this.tutorialActive = false;
        
        // Premium System
        this.isPremium = false;
        this.premiumPurchaseDate = null;
        
        // Period Transition Tracking
        this.lastVisitDate = null;
        this.lastWeekNumber = null;
        this.lastMonth = null;
        this.lastYear = null;
        
        // Daily Login Bonus
        this.lastLoginBonusDate = null;
        this.loginStreak = 0;
        
        this.loadData();
        this.requestNotificationPermission();
        this.checkHabitReset();
        this.generateRecurringTasksForToday(); // Generate scheduled recurring tasks
        this.initializeReminders(); // Set up task reminders
        this.initializeUI();
        this.loadTheme();
        this.setupKeyboardShortcuts();
        this.updateTimezoneDisplay();
        this.checkFirstTimeUser();
        
        // Check for period transitions after a short delay to let UI render first
        setTimeout(() => this.checkPeriodTransitions(), 1000);
        
        // Check for daily login bonus
        setTimeout(() => this.checkDailyLoginBonus(), 1500);
        
        // Check for expired spells on load and periodically
        setTimeout(() => this.checkExpiredSpells(), 500);
        this.spellCheckInterval = setInterval(() => this.checkExpiredSpells(), 60000); // Check every minute
        
        // Cleanup intervals on page unload to prevent memory leaks
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    cleanup() {
        // Clear all intervals
        if (this.spellCheckInterval) {
            clearInterval(this.spellCheckInterval);
        }
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
        if (this.focusTimer) {
            clearInterval(this.focusTimer);
        }
        
        // Force save any pending data
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this._doSave();
        }
    }

    loadData() {
        try {
            const saved = localStorage.getItem('lifeOrganizeData');
            if (saved) {
                const data = JSON.parse(saved);
                this.lifeGoals = data.lifeGoals || [];
                this.yearlyGoals = data.yearlyGoals || [];
                this.monthlyGoals = data.monthlyGoals || [];
                this.weeklyGoals = data.weeklyGoals || [];
                this.dailyTasks = data.dailyTasks || [];
                this.sideQuests = data.sideQuests || [];
                this.habits = data.habits || [];
                this.recurringTasks = data.recurringTasks || [];
                this.xp = data.xp || 0;
                this.level = data.level || 1;
                this.badges = data.badges || [];
                this.archivedGoals = data.archivedGoals || [];
                
                // Rewards System
                this.goldCoins = data.goldCoins || 0;
                this.unlockedThemes = data.unlockedThemes || ['default'];
                this.currentTheme = data.currentTheme || 'default';
                this.unlockedTitles = data.unlockedTitles || [];
                this.currentTitle = data.currentTitle || null;
                this.treasureChests = data.treasureChests || [];
                this.companion = data.companion || null;
                this.companions = data.companions || [];
                this.activeCompanionId = data.activeCompanionId || null;
                
                // Migrate legacy single companion to collection
                if (this.companion && this.companions.length === 0) {
                    // Ensure legacy companion has required fields
                    if (!this.companion.type) {
                        // Try to infer type from name or assign a default
                        const nameToType = {
                            'Baby Dragon': 'dragon',
                            'Wise Owl': 'owl',
                            'Loyal Wolf': 'wolf',
                            'Phoenix': 'phoenix'
                        };
                        this.companion.type = nameToType[this.companion.name] || 'wolf';
                    }
                    if (!this.companion.rarity) {
                        this.companion.rarity = 'rare'; // Default legacy companions to rare
                    }
                    this.companions.push(this.companion);
                    this.activeCompanionId = this.companion.type;
                }
                
                // Ensure all companions in collection have type and rarity
                this.companions.forEach(comp => {
                    if (!comp.rarity) comp.rarity = 'rare';
                    if (!comp.type && comp.name) {
                        const nameToType = {
                            'Baby Dragon': 'dragon', 'Wise Owl': 'owl', 'Loyal Wolf': 'wolf', 
                            'Phoenix': 'phoenix', 'Lucky Cat': 'cat', 'Swift Rabbit': 'rabbit',
                            'Clever Fox': 'fox', 'Ancient Turtle': 'turtle', 'Golden Eagle': 'eagle',
                            'Mighty Bear': 'bear', 'Mystic Unicorn': 'unicorn', 'Legendary Lion': 'lion'
                        };
                        comp.type = nameToType[comp.name] || 'wolf';
                    }
                });
                
                // Spellbook System
                this.spellbook = data.spellbook || [];
                this.activeSpells = data.activeSpells || [];
                
                // Quest Chains System
                this.activeQuestChains = data.activeQuestChains || [];
                this.completedQuestChains = data.completedQuestChains || [];
                
                // Focus & Enchantments
                this.focusCrystals = data.focusCrystals || 0;
                this.totalFocusTime = data.totalFocusTime || 0;
                this.activeEnchantments = data.activeEnchantments || [];
                
                // Settings
                this.timezone = data.timezone || 'auto';
                this.timezoneOffset = data.timezoneOffset || 0;
                
                // Tutorial
                this.tutorialCompleted = data.tutorialCompleted || false;
                
                // Period Transition Tracking
                this.lastVisitDate = data.lastVisitDate || null;
                this.lastWeekNumber = data.lastWeekNumber || null;
                this.lastMonth = data.lastMonth || null;
                this.lastYear = data.lastYear || null;
                
                // Premium System
                this.isPremium = data.isPremium || false;
                this.premiumPurchaseDate = data.premiumPurchaseDate || null;
                this.premiumPurchaseToken = data.premiumPurchaseToken || null;
                
                // Daily Login Bonus
                this.lastLoginBonusDate = data.lastLoginBonusDate || null;
                this.loginStreak = data.loginStreak || 0;
                
                // Stats tracking for titles
                this.chestsOpened = data.chestsOpened || 0;
                this.bossesDefeated = data.bossesDefeated || 0;
                this.focusSessionsCompleted = data.focusSessionsCompleted || 0;
                this.spellsCast = data.spellsCast || 0;
                
                // Add dueDate to existing tasks that don't have one
                this.dailyTasks.forEach(task => {
                    if (!task.dueDate) {
                        task.dueDate = new Date().toISOString().split('T')[0];
                    }
                });

                this.yearlyGoals.forEach(g => {
                    if (!g.priority || !['low', 'medium', 'high'].includes(g.priority)) g.priority = 'medium';
                });

                this.monthlyGoals.forEach(g => {
                    if (!g.priority || !['low', 'medium', 'high'].includes(g.priority)) g.priority = 'medium';
                });

                this.weeklyGoals.forEach(g => {
                    if (!g.priority || !['low', 'medium', 'high'].includes(g.priority)) g.priority = 'medium';
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showErrorNotification('Failed to load your data. Some progress may be lost.');
            // Try to backup corrupted data before resetting
            const corrupted = localStorage.getItem('lifeOrganizeData');
            if (corrupted) {
                localStorage.setItem('lifeOrganizeData_backup_' + Date.now(), corrupted);
            }
        }
    }

    saveData() {
        // Debounce saves to prevent excessive localStorage writes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this._doSave();
        }, 100); // 100ms debounce
    }
    
    _doSave() {
        try {
            const dataToSave = JSON.stringify({
                lifeGoals: this.lifeGoals,
                yearlyGoals: this.yearlyGoals,
                monthlyGoals: this.monthlyGoals,
                weeklyGoals: this.weeklyGoals,
                dailyTasks: this.dailyTasks,
                sideQuests: this.sideQuests,
                habits: this.habits,
                recurringTasks: this.recurringTasks,
                xp: this.xp,
                level: this.level,
                badges: this.badges,
                archivedGoals: this.archivedGoals,
                goldCoins: this.goldCoins,
                unlockedThemes: this.unlockedThemes,
                currentTheme: this.currentTheme,
                unlockedTitles: this.unlockedTitles,
                currentTitle: this.currentTitle,
                treasureChests: this.treasureChests,
                companion: this.companion,
                companions: this.companions,
                activeCompanionId: this.activeCompanionId,
                spellbook: this.spellbook,
                activeSpells: this.activeSpells,
                activeQuestChains: this.activeQuestChains,
                completedQuestChains: this.completedQuestChains,
                focusCrystals: this.focusCrystals,
                totalFocusTime: this.totalFocusTime,
                activeEnchantments: this.activeEnchantments,
                timezone: this.timezone,
                timezoneOffset: this.timezoneOffset,
                tutorialCompleted: this.tutorialCompleted,
                lastHabitReset: this.getTodayDateString(),
                lastWeekReset: this.getWeekString(new Date()),
                lastVisitDate: this.lastVisitDate,
                lastWeekNumber: this.lastWeekNumber,
                lastMonth: this.lastMonth,
                lastYear: this.lastYear,
                isPremium: this.isPremium,
                premiumPurchaseDate: this.premiumPurchaseDate,
                premiumPurchaseToken: this.premiumPurchaseToken || null,
                lastLoginBonusDate: this.lastLoginBonusDate,
                loginStreak: this.loginStreak,
                chestsOpened: this.chestsOpened,
                bossesDefeated: this.bossesDefeated,
                focusSessionsCompleted: this.focusSessionsCompleted,
                spellsCast: this.spellsCast
            });
            localStorage.setItem('lifeOrganizeData', dataToSave);
        } catch (error) {
            console.error('Error saving data:', error);
            if (error.name === 'QuotaExceededError') {
                this.showErrorNotification('Storage full! Please export your data and clear some old quests.');
            } else {
                this.showErrorNotification('Failed to save your progress. Please try again.');
            }
        }
    }

    initializeEnchantments() {
        return {
            double_xp: {
                id: 'double_xp',
                name: 'Enchantment of Swiftness',
                description: '2x XP from all sources for 1 hour',
                icon: '⚡',
                cost: 5,
                duration: 60, // minutes
                effect: 'double_xp'
            },
            double_gold: {
                id: 'double_gold',
                name: 'Enchantment of Fortune',
                description: '2x Gold from all sources for 1 hour',
                icon: '💰',
                cost: 5,
                duration: 60,
                effect: 'double_gold'
            },
            streak_shield: {
                id: 'streak_shield',
                name: 'Enchantment of Resilience',
                description: 'Protects your habit streak for 1 missed day',
                icon: '🛡️',
                cost: 8,
                duration: 1440, // 24 hours
                effect: 'streak_shield'
            },
            boss_slayer: {
                id: 'boss_slayer',
                name: 'Enchantment of the Titan',
                description: '+50% damage to boss battles for 1 hour',
                icon: '⚔️',
                cost: 6,
                duration: 60,
                effect: 'boss_damage'
            },
            crystal_finder: {
                id: 'crystal_finder',
                name: 'Enchantment of Discovery',
                description: '+1 bonus Focus Crystal per session for 4 hours',
                icon: '💎',
                cost: 4,
                duration: 240,
                effect: 'bonus_crystal'
            },
            time_warden: {
                id: 'time_warden',
                name: 'Enchantment of the Time Warden',
                description: 'Focus sessions are 35 min instead of 25 for 2 hours',
                icon: '⏳',
                cost: 3,
                duration: 120,
                effect: 'extended_focus'
            }
        };
    }

    initializeSpells() {
        // Free spells: lucky_draw, instant_archive, focus_mode, minor_wisdom, copper_blessing (5 free)
        // Premium spells: all others
        return {
            arcane_surge: {
                id: 'arcane_surge',
                name: 'Arcane Surge',
                icon: '🌟',
                description: '2x XP for the entire day',
                rarity: 'rare',
                effect: 'xp_multiplier',
                multiplier: 2,
                duration: 86400000, // 24 hours
                premium: true
            },
            golden_touch: {
                id: 'golden_touch',
                name: 'Golden Touch',
                icon: '💰',
                description: '2x Gold for the entire day',
                rarity: 'rare',
                effect: 'gold_multiplier',
                multiplier: 2,
                duration: 86400000, // 24 hours
                premium: true
            },
            streak_shield: {
                id: 'streak_shield',
                name: 'Streak Shield',
                icon: '🛡️',
                description: 'Protect your habit streak for 1 day',
                rarity: 'epic',
                effect: 'streak_protection',
                duration: 86400000, // 24 hours
                premium: true
            },
            lucky_draw: {
                id: 'lucky_draw',
                name: 'Lucky Draw',
                icon: '🎲',
                description: 'Guaranteed uncommon+ loot on next chest opened',
                rarity: 'uncommon',
                effect: 'chest_boost',
                multiplier: 1,
                duration: -1, // Active until next chest opened
                premium: false
            },
            inferno_focus: {
                id: 'inferno_focus',
                name: 'Inferno Focus',
                icon: '🔥',
                description: 'All tasks give +25% XP today',
                rarity: 'rare',
                effect: 'xp_boost',
                multiplier: 1.25,
                duration: 86400000,
                premium: true
            },
            time_freeze: {
                id: 'time_freeze',
                name: 'Time Freeze',
                icon: '❄️',
                description: 'Prevent daily quest reset for 1 day',
                rarity: 'legendary',
                effect: 'pause_reset',
                duration: 86400000,
                premium: true
            },
            moonlight_blessing: {
                id: 'moonlight_blessing',
                name: 'Moonlight Blessing',
                icon: '🌙',
                description: 'All tasks worth +50% XP today',
                rarity: 'legendary',
                effect: 'xp_boost',
                multiplier: 1.5,
                duration: 86400000,
                premium: true
            },
            quest_doubler: {
                id: 'quest_doubler',
                name: 'Quest Doubler',
                icon: '📋',
                description: '2x XP & Gold on next quest completed',
                rarity: 'epic',
                effect: 'double_reward',
                duration: -1, // Active until next quest completed
                premium: true
            },
            instant_archive: {
                id: 'instant_archive',
                name: 'Instant Archive',
                icon: '📦',
                description: 'Bulk archive all completed tasks',
                rarity: 'uncommon',
                effect: 'bulk_archive',
                duration: 0, // Instant use
                premium: false
            },
            focus_mode: {
                id: 'focus_mode',
                name: 'Focus Mode',
                icon: '🎯',
                description: '2x Focus Crystals & +50 XP per session for 1 hour',
                rarity: 'uncommon',
                effect: 'focus_boost',
                duration: 3600000, // 1 hour
                premium: false
            },
            minor_wisdom: {
                id: 'minor_wisdom',
                name: 'Minor Wisdom',
                icon: '📚',
                description: '+15% XP for the entire day',
                rarity: 'common',
                effect: 'xp_boost',
                multiplier: 1.15,
                duration: 86400000, // 24 hours
                premium: false
            },
            copper_blessing: {
                id: 'copper_blessing',
                name: 'Copper Blessing',
                icon: '🪙',
                description: '+15% Gold for the entire day',
                rarity: 'common',
                effect: 'gold_multiplier',
                multiplier: 1.15,
                duration: 86400000, // 24 hours
                premium: false
            },
            silver_blessing: {
                id: 'silver_blessing',
                name: 'Silver Blessing',
                icon: '🥈',
                description: '+25% Gold for the entire day',
                rarity: 'uncommon',
                effect: 'gold_multiplier',
                multiplier: 1.25,
                duration: 86400000, // 24 hours
                premium: true
            },
            gold_blessing: {
                id: 'gold_blessing',
                name: 'Gold Blessing',
                icon: '🥇',
                description: '+50% Gold for the entire day',
                rarity: 'rare',
                effect: 'gold_multiplier',
                multiplier: 1.5,
                duration: 86400000, // 24 hours
                premium: true
            },
            double_xp_weekend: {
                id: 'double_xp_weekend',
                name: 'Double XP Weekend',
                icon: '⚡',
                description: '2x XP for 48 hours',
                rarity: 'legendary',
                effect: 'xp_multiplier',
                multiplier: 2,
                duration: 172800000, // 48 hours
                premium: true
            },
            berserker_rage: {
                id: 'berserker_rage',
                name: 'Berserker Rage',
                icon: '⚔️',
                description: 'Next boss attack deals DOUBLE damage (200 DMG)',
                rarity: 'epic',
                effect: 'boss_double_damage',
                multiplier: 2,
                duration: -1, // Active until next boss damage
                premium: true
            },
            critical_strike: {
                id: 'critical_strike',
                name: 'Critical Strike',
                icon: '💥',
                description: '50% chance for +50 bonus damage on boss attacks today',
                rarity: 'rare',
                effect: 'boss_crit_chance',
                multiplier: 1.5,
                duration: 86400000, // 24 hours
                premium: true
            },
            boss_slayer: {
                id: 'boss_slayer',
                name: 'Boss Slayer',
                icon: '🗡️',
                description: '+25% damage to ALL bosses for 7 days',
                rarity: 'legendary',
                effect: 'boss_damage_boost',
                multiplier: 1.25,
                duration: 604800000, // 7 days
                premium: true
            },
            execute: {
                id: 'execute',
                name: 'Execute',
                icon: '💀',
                description: 'Instantly defeat ONE boss below 25% HP',
                rarity: 'legendary',
                effect: 'boss_execute',
                duration: -1, // Active until used
                premium: true
            }
        };
    }

    initializeQuestChainTemplates() {
        return {
            learn_web_dev: {
                id: 'learn_web_dev',
                name: 'Master Web Development',
                icon: '💻',
                description: 'From beginner to full-stack developer',
                difficulty: 'medium',
                estimatedWeeks: 16,
                category: 'Programming',
                chapters: [
                    {
                        id: 1,
                        title: 'HTML & CSS Foundations',
                        description: 'Build beautiful web pages',
                        tasks: [
                            'Complete HTML basics tutorial',
                            'Build 3 static web pages',
                            'Learn CSS styling and layouts',
                            'Create a personal landing page'
                        ],
                        reward: { xp: 500, gold: 300, spell: 'arcane_surge', charges: 1 }
                    },
                    {
                        id: 2,
                        title: 'JavaScript Essentials',
                        description: 'Make your pages interactive',
                        tasks: [
                            'Learn JavaScript basics',
                            'DOM manipulation exercises',
                            'Build a calculator app',
                            'Create an interactive game'
                        ],
                        reward: { xp: 800, gold: 500, spell: 'golden_touch', charges: 1 }
                    },
                    {
                        id: 3,
                        title: 'React Framework',
                        description: 'Modern component-based UI',
                        tasks: [
                            'Set up React development environment',
                            'Learn components and props',
                            'State management with hooks',
                            'Build a todo app in React'
                        ],
                        reward: { xp: 1200, gold: 800, spell: 'inferno_focus', charges: 2 }
                    },
                    {
                        id: 4,
                        title: 'Backend Development',
                        description: 'Server-side programming',
                        tasks: [
                            'Learn Node.js basics',
                            'Build REST API with Express',
                            'Database integration (MongoDB/SQL)',
                            'Authentication and security'
                        ],
                        reward: { xp: 1500, gold: 1000, spell: 'moonlight_blessing', charges: 1 }
                    },
                    {
                        id: 5,
                        title: 'Full-Stack Project',
                        description: 'Deploy a complete application',
                        tasks: [
                            'Design full-stack architecture',
                            'Build complete CRUD application',
                            'Deploy to production',
                            'Portfolio and resume update'
                        ],
                        reward: { xp: 2500, gold: 2000, spell: 'boss_slayer', charges: 1 }
                    }
                ]
            },
            fitness_journey: {
                id: 'fitness_journey',
                name: 'Ultimate Fitness Journey',
                icon: '💪',
                description: 'Transform your body and mind',
                difficulty: 'hard',
                estimatedWeeks: 12,
                category: 'Health',
                chapters: [
                    {
                        id: 1,
                        title: 'Foundation Phase',
                        description: 'Build healthy habits',
                        tasks: [
                            'Set fitness goals and baseline measurements',
                            'Exercise 3x per week for 2 weeks',
                            'Track meals for 14 days',
                            'Establish sleep routine'
                        ],
                        reward: { xp: 400, gold: 200, spell: 'streak_shield', charges: 1 }
                    },
                    {
                        id: 2,
                        title: 'Strength Building',
                        description: 'Develop core strength',
                        tasks: [
                            'Learn proper form for major lifts',
                            'Complete 4 weeks of strength training',
                            'Increase protein intake',
                            'Track progress photos'
                        ],
                        reward: { xp: 700, gold: 400, spell: 'berserker_rage', charges: 1 }
                    },
                    {
                        id: 3,
                        title: 'Cardio Mastery',
                        description: 'Build endurance',
                        tasks: [
                            'Run/walk 5K without stopping',
                            'Do 30 min cardio 4x/week',
                            'Hit target heart rate zones',
                            'Complete a fitness challenge'
                        ],
                        reward: { xp: 900, gold: 600, spell: 'inferno_focus', charges: 2 }
                    },
                    {
                        id: 4,
                        title: 'Transformation',
                        description: 'Achieve your goals',
                        tasks: [
                            'Reach target weight/measurements',
                            'Take final progress photos',
                            'Maintain routine for 4 weeks',
                            'Share your journey'
                        ],
                        reward: { xp: 2000, gold: 1500, spell: 'double_xp_weekend', charges: 1 }
                    }
                ]
            },
            business_builder: {
                id: 'business_builder',
                name: 'Launch Your Business',
                icon: '🚀',
                description: 'From idea to profitable venture',
                difficulty: 'hard',
                estimatedWeeks: 20,
                category: 'Business',
                chapters: [
                    {
                        id: 1,
                        title: 'Ideation & Validation',
                        description: 'Find your business idea',
                        tasks: [
                            'Brainstorm 10 business ideas',
                            'Research market and competitors',
                            'Validate idea with 20 potential customers',
                            'Create value proposition'
                        ],
                        reward: { xp: 600, gold: 400, spell: 'lucky_draw', charges: 2 }
                    },
                    {
                        id: 2,
                        title: 'Business Planning',
                        description: 'Create your roadmap',
                        tasks: [
                            'Write business plan',
                            'Define target audience',
                            'Create financial projections',
                            'Legal setup (LLC, etc.)'
                        ],
                        reward: { xp: 1000, gold: 700, spell: 'golden_touch', charges: 2 }
                    },
                    {
                        id: 3,
                        title: 'Product Development',
                        description: 'Build your MVP',
                        tasks: [
                            'Design MVP features',
                            'Build/create first version',
                            'Test with beta users',
                            'Iterate based on feedback'
                        ],
                        reward: { xp: 1500, gold: 1000, spell: 'critical_strike', charges: 2 }
                    },
                    {
                        id: 4,
                        title: 'Launch & Marketing',
                        description: 'Go to market',
                        tasks: [
                            'Create marketing materials',
                            'Build online presence',
                            'Launch to first customers',
                            'Get first 10 paying customers'
                        ],
                        reward: { xp: 2000, gold: 1500, spell: 'boss_slayer', charges: 1 }
                    },
                    {
                        id: 5,
                        title: 'Growth & Scale',
                        description: 'Build sustainable business',
                        tasks: [
                            'Reach $1000 monthly revenue',
                            'Establish systems and processes',
                            'Hire first team member/contractor',
                            'Plan for next phase'
                        ],
                        reward: { xp: 3000, gold: 3000, spell: 'execute', charges: 1 }
                    }
                ]
            },
            creative_writer: {
                id: 'creative_writer',
                name: 'Become a Published Writer',
                icon: '✍️',
                description: 'Craft and publish your first book',
                difficulty: 'medium',
                estimatedWeeks: 24,
                category: 'Creative',
                chapters: [
                    {
                        id: 1,
                        title: 'Writing Foundation',
                        description: 'Develop your craft',
                        tasks: [
                            'Write daily for 30 days',
                            'Complete writing course',
                            'Read 5 books in your genre',
                            'Join writing community'
                        ],
                        reward: { xp: 500, gold: 300, spell: 'streak_shield', charges: 1 }
                    },
                    {
                        id: 2,
                        title: 'Story Development',
                        description: 'Plan your masterpiece',
                        tasks: [
                            'Develop plot outline',
                            'Create character profiles',
                            'Build story world',
                            'Write first 3 chapters'
                        ],
                        reward: { xp: 800, gold: 500, spell: 'inferno_focus', charges: 1 }
                    },
                    {
                        id: 3,
                        title: 'First Draft',
                        description: 'Write your book',
                        tasks: [
                            'Write 50,000 words',
                            'Complete full first draft',
                            'Let manuscript rest 2 weeks',
                            'Celebrate completion'
                        ],
                        reward: { xp: 1500, gold: 1000, spell: 'moonlight_blessing', charges: 1 }
                    },
                    {
                        id: 4,
                        title: 'Editing & Revision',
                        description: 'Polish your work',
                        tasks: [
                            'Complete self-edit',
                            'Get beta reader feedback',
                            'Hire professional editor',
                            'Final revisions'
                        ],
                        reward: { xp: 1200, gold: 800, spell: 'critical_strike', charges: 1 }
                    },
                    {
                        id: 5,
                        title: 'Publishing',
                        description: 'Share with the world',
                        tasks: [
                            'Design book cover',
                            'Format for publication',
                            'Publish to Amazon/platform',
                            'Launch marketing campaign'
                        ],
                        reward: { xp: 2000, gold: 2000, spell: 'double_xp_weekend', charges: 1 }
                    }
                ]
            },
            language_master: {
                id: 'language_master',
                name: 'Master a New Language',
                icon: '🗣️',
                description: 'Become fluent in your target language',
                difficulty: 'medium',
                estimatedWeeks: 52,
                category: 'Education',
                chapters: [
                    {
                        id: 1,
                        title: 'Beginner Basics',
                        description: 'Start your journey',
                        tasks: [
                            'Learn 500 common words',
                            'Master basic grammar',
                            'Complete beginner course',
                            'Have first conversation'
                        ],
                        reward: { xp: 400, gold: 300, spell: 'arcane_surge', charges: 1 }
                    },
                    {
                        id: 2,
                        title: 'Intermediate Progress',
                        description: 'Build fluency',
                        tasks: [
                            'Expand vocabulary to 2000 words',
                            'Watch movies with subtitles',
                            'Read first book in target language',
                            'Practice speaking 3x/week'
                        ],
                        reward: { xp: 800, gold: 600, spell: 'golden_touch', charges: 1 }
                    },
                    {
                        id: 3,
                        title: 'Advanced Fluency',
                        description: 'Think in the language',
                        tasks: [
                            'Have 30-min conversation',
                            'Write essay in target language',
                            'Pass proficiency exam',
                            'Make friends who speak language'
                        ],
                        reward: { xp: 1500, gold: 1000, spell: 'boss_slayer', charges: 1 }
                    }
                ]
            }
        };
    }

    initializeUI() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.switchView(view);
                
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Restore stats panel collapsed state
        const savedCollapsed = localStorage.getItem('statsPanelCollapsed');
        if (savedCollapsed === 'true') {
            this.statsPanelCollapsed = false; // Set to false first so toggle makes it true
            // Wait for DOM to be ready
            setTimeout(() => this.toggleStatsPanel(), 0);
        }

        // Calculate progress on load
        this.updateParentProgress();
        this._doRender(); // Initial render - immediate, not debounced

        // Handle manifest shortcut URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const view = urlParams.get('view');
        
        if (view) {
            setTimeout(() => this.switchView(view), 100);
        }
        if (action === 'add-task') {
            setTimeout(() => {
                this.switchView('daily');
                if (typeof addDailyTask === 'function') {
                    setTimeout(() => addDailyTask(), 200);
                }
            }, 100);
        }
        
        // Clean URL parameters after handling
        if (action || view) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    switchView(viewName) {
        // Track current view for optimized rendering
        this.currentView = viewName;
        
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
        
        // Update navigation link active states
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            }
        });
        
        // Render the new view immediately
        this.render();
    }

    playAchievementSound(level = 'daily') {
        if (window.audioManager) {
            window.audioManager.playAchievement(level);
        }
    }

    showAchievement(text, level = 'daily', playSound = true) {
        if (this._suppressRewardSounds) playSound = false;
        // For backwards compatibility, map old calls to new toast system
        // Determine notification type based on text content
        let type = 'info';
        if (text.includes('Unlocked') || text.includes('Level Up') || text.includes('LEVEL')) {
            type = 'achievement';
        } else if (text.includes('PROTECTS') || text.includes('SHIELD') || text.includes('FREEZE') || text.includes('protected')) {
            type = 'protection';
        } else if (text.includes('DOUBLER') || text.includes('2x') || text.includes('BONUS') || text.includes('Bonus')) {
            type = 'bonus';
        } else if (text.includes('CHEST') || text.includes('LOOT') || text.includes('Lucky Draw')) {
            type = 'loot';
        } else if (text.includes('⚠️') || text.includes('Warning') || text.includes('first!')) {
            type = 'warning';
        } else if (text.includes('Complete') || text.includes('complete') || text.includes('+') && text.includes('XP')) {
            type = 'success';
        } else if (text.includes('COMPANION') || text.includes('is now active')) {
            type = 'companion';
        } else if (text.includes('Archive') || text.includes('Archived')) {
            type = 'info';
        }
        
        this.showToast(text, type, playSound ? level : null);
    }
    
    showToast(text, type = 'info', soundLevel = null) {
        const toast = this.getElement('achievement-toast');
        const toastContainer = this.getElement('toast-container');
        const toastIcon = this.getElement('toast-icon');
        const toastTitle = this.getElement('toast-title');
        const achievementText = this.getElement('achievement-text');
        
        // Define toast styles for different notification types
        const toastStyles = {
            achievement: {
                gradient: 'from-yellow-600 via-amber-500 to-yellow-700',
                border: 'border-yellow-400',
                icon: '⚔️',
                title: 'Achievement Unlocked!',
                animate: true
            },
            success: {
                gradient: 'from-green-600 via-emerald-500 to-green-700',
                border: 'border-green-400',
                icon: '✨',
                title: 'Quest Complete!',
                animate: false
            },
            bonus: {
                gradient: 'from-purple-600 via-violet-500 to-purple-700',
                border: 'border-purple-400',
                icon: '🎯',
                title: 'Bonus Activated!',
                animate: true
            },
            loot: {
                gradient: 'from-amber-600 via-orange-500 to-amber-700',
                border: 'border-orange-400',
                icon: '🎁',
                title: 'Treasure Found!',
                animate: true
            },
            protection: {
                gradient: 'from-blue-600 via-cyan-500 to-blue-700',
                border: 'border-cyan-400',
                icon: '🛡️',
                title: 'Protection Active!',
                animate: true
            },
            warning: {
                gradient: 'from-red-600 via-rose-500 to-red-700',
                border: 'border-red-400',
                icon: '⚠️',
                title: 'Warning',
                animate: false
            },
            companion: {
                gradient: 'from-teal-600 via-emerald-500 to-teal-700',
                border: 'border-teal-400',
                icon: '🐾',
                title: 'Companion Update!',
                animate: false
            },
            info: {
                gradient: 'from-slate-600 via-gray-500 to-slate-700',
                border: 'border-slate-400',
                icon: '📜',
                title: 'Notice',
                animate: false
            }
        };
        
        const style = toastStyles[type] || toastStyles.info;
        
        // Update toast appearance
        toastContainer.className = `bg-gradient-to-br ${style.gradient} text-white p-6 rounded-lg shadow-2xl border-4 ${style.border} quest-card`;
        toastIcon.textContent = style.icon;
        toastIcon.className = style.animate ? 'text-6xl animate-bounce' : 'text-6xl';
        toastTitle.textContent = style.title;
        achievementText.textContent = text;
        
        toast.classList.remove('hidden', 'scale-0');
        toast.classList.add('scale-100');
        
        if (soundLevel) {
            this.playAchievementSound(soundLevel);
        }
        
        setTimeout(() => {
            toast.classList.remove('scale-100');
            toast.classList.add('scale-0');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    addLifeGoal() {
        this.showInputModal({
            title: 'New Life Goal',
            placeholder: 'Enter your life goal...',
            icon: 'ri-compass-3-line'
        }, (title) => {
            if (!title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                const goal = {
                    id: Date.now(),
                    title: title.trim(),
                    description: (description || '').trim(),
                    created: new Date().toISOString(),
                    completed: false
                };
                this.lifeGoals.push(goal);
                this.saveData();
                this.render();
            });
        });
    }

    addYearlyGoal(parentLifeGoalId = null) {
        this.showInputModal({
            title: 'New Yearly Campaign',
            placeholder: 'Enter your yearly goal...',
            icon: 'ri-calendar-line'
        }, (title) => {
            if (!title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                this.showPriorityModal('medium', (priority) => {
                    const goal = {
                        id: Date.now(),
                        title: title.trim(),
                        description: (description || '').trim(),
                        lifeGoalIds: parentLifeGoalId ? [parentLifeGoalId] : [],
                        created: new Date().toISOString(),
                        completed: false,
                        progress: 0,
                        priority: priority
                    };
                    this.yearlyGoals.push(goal);
                    this.saveData();
                    this.render();
                });
            });
        });
    }

    addMonthlyGoal(parentYearlyGoalId = null) {
        this.showInputModal({
            title: 'New Monthly Quest',
            placeholder: 'Enter your monthly goal...',
            icon: 'ri-calendar-2-line'
        }, (title) => {
            if (!title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                this.showPriorityModal('medium', (priority) => {
                    const goal = {
                        id: Date.now(),
                        title: title.trim(),
                        description: (description || '').trim(),
                        yearlyGoalIds: parentYearlyGoalId ? [parentYearlyGoalId] : [],
                        created: new Date().toISOString(),
                        completed: false,
                        progress: 0,
                        priority: priority
                    };
                    this.monthlyGoals.push(goal);
                    this.saveData();
                    this.render();
                });
            });
        });
    }

    addWeeklyGoal(parentMonthlyGoalId = null) {
        this.showInputModal({
            title: 'New Weekly Mission',
            placeholder: 'Enter your weekly goal...',
            icon: 'ri-calendar-check-line'
        }, (title) => {
            if (!title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                this.showPriorityModal('medium', (priority) => {
                    const goal = {
                        id: Date.now(),
                        title: title.trim(),
                        description: (description || '').trim(),
                        monthlyGoalIds: parentMonthlyGoalId ? [parentMonthlyGoalId] : [],
                        created: new Date().toISOString(),
                        completed: false,
                        progress: 0,
                        checklist: [],
                        priority: priority
                    };
                    this.weeklyGoals.push(goal);
                    this.saveData();
                    this.render();
                });
            });
        });
    }

    addDailyTask(parentWeeklyGoalId = null, scheduledDate = null) {
        this.showInputModal({
            title: 'New Daily Task',
            placeholder: 'Enter your daily task...',
            icon: 'ri-checkbox-circle-line'
        }, (title) => {
            if (!title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                const finishAddingTask = (dueDate) => {
                    const task = {
                        id: Date.now(),
                        title: title.trim(),
                        description: (description || '').trim(),
                        weeklyGoalIds: parentWeeklyGoalId ? [parentWeeklyGoalId] : [],
                        created: new Date().toISOString(),
                        dueDate: dueDate,
                        completed: false,
                        checklist: []
                    };
                    this.dailyTasks.push(task);
                    this.saveData();
                    this.render();
                };

                if (scheduledDate) {
                    finishAddingTask(scheduledDate);
                } else {
                    const todayString = this.getTodayDateString();
                    this.showInputModal({
                        title: 'Due Date',
                        placeholder: 'YYYY-MM-DD',
                        defaultValue: todayString,
                        icon: 'ri-calendar-event-line',
                        inputType: 'date'
                    }, (dateInput) => {
                        const dueDate = dateInput && dateInput.trim() ? dateInput.trim() : todayString;
                        finishAddingTask(dueDate);
                    });
                }
            });
        });
    }

    // ==================== RECURRING TASKS ====================
    
    addRecurringTask() {
        this.showInputModal({
            title: 'New Recurring Task',
            placeholder: 'Enter the recurring task name...',
            icon: 'ri-repeat-line'
        }, (title) => {
            if (!title || !title.trim()) return;
            
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                // Show pattern selection
                this.showSelectModal({
                    title: 'Recurrence Pattern',
                    icon: 'ri-repeat-line',
                    choices: [
                        { value: '2', label: 'Weekly', icon: '📅', description: 'Specific days each week' },
                        { value: '3', label: 'Bi-weekly', icon: '📆', description: 'Every two weeks' },
                        { value: '4', label: 'Monthly (Date)', icon: '🗓️', description: 'Same date each month' },
                        { value: '5', label: 'Monthly (Day)', icon: '📋', description: 'e.g., First Monday' }
                    ]
                }, (patternChoice) => {
                    this.finishRecurringTaskSetup(title.trim(), (description || '').trim(), patternChoice);
                });
            });
        });
    }

    finishRecurringTaskSetup(title, description, patternChoice) {
        const dayChoices = [
            { value: 'mon', label: 'Monday', icon: '📌' },
            { value: 'tue', label: 'Tuesday', icon: '📌' },
            { value: 'wed', label: 'Wednesday', icon: '📌' },
            { value: 'thu', label: 'Thursday', icon: '📌' },
            { value: 'fri', label: 'Friday', icon: '📌' },
            { value: 'sat', label: 'Saturday', icon: '📌' },
            { value: 'sun', label: 'Sunday', icon: '📌' }
        ];

        const createTask = (recurrence) => {
            const recurringTask = {
                id: Date.now(),
                title: title,
                description: description,
                recurrence: recurrence,
                active: true,
                created: new Date().toISOString(),
                lastGenerated: null
            };
            this.recurringTasks.push(recurringTask);
            this.saveData();
            this.generateRecurringTasksForToday();
            this.render();
            this.showAchievement(`🔄 Recurring task "${title}" created!`, 'daily');
        };

        switch (patternChoice) {
            case '2': // Weekly
                this.showMultiSelectDays((days) => {
                    if (days.length === 0) return;
                    createTask({ type: 'weekly', days: days });
                });
                break;
            case '3': // Bi-weekly
                this.showSelectModal({
                    title: 'Select Day of Week',
                    icon: 'ri-calendar-line',
                    choices: dayChoices
                }, (day) => {
                    createTask({ type: 'biweekly', day: day, lastGenerated: null });
                });
                break;
            case '4': // Monthly date
                this.showInputModal({
                    title: 'Day of Month',
                    placeholder: '1-28',
                    defaultValue: '1',
                    icon: 'ri-calendar-line'
                }, (dateNum) => {
                    const dayOfMonth = Math.min(28, Math.max(1, parseInt(dateNum) || 1));
                    createTask({ type: 'monthly-date', dayOfMonth: dayOfMonth });
                });
                break;
            case '5': // Monthly weekday
                this.showSelectModal({
                    title: 'Which Week?',
                    icon: 'ri-calendar-line',
                    choices: [
                        { value: '1', label: 'First', icon: '1️⃣' },
                        { value: '2', label: 'Second', icon: '2️⃣' },
                        { value: '3', label: 'Third', icon: '3️⃣' },
                        { value: '4', label: 'Fourth', icon: '4️⃣' },
                        { value: '-1', label: 'Last', icon: '🔚' }
                    ]
                }, (week) => {
                    this.showSelectModal({
                        title: 'Select Day',
                        icon: 'ri-calendar-line',
                        choices: dayChoices
                    }, (day) => {
                        createTask({ type: 'monthly-weekday', week: parseInt(week), day: day });
                    });
                });
                break;
        }
    }

    showMultiSelectDays(callback) {
        const existingModal = document.getElementById('multiselect-modal');
        if (existingModal) existingModal.remove();

        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        const modal = document.createElement('div');
        modal.id = 'multiselect-modal';
        modal.className = 'fixed inset-0 bg-black/70 z-50 overflow-hidden';
        modal.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 24px;';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl shadow-2xl border-4 border-amber-600 animate-slide-down" style="width: 320px; max-width: calc(100vw - 48px);">
                <h3 class="text-lg font-bold text-amber-300 medieval-title mb-4 text-center">
                    <i class="ri-calendar-check-line mr-2"></i>Select Days
                </h3>
                <div class="grid grid-cols-4 gap-2 mb-4">
                    ${days.map((d, i) => `
                        <button type="button" data-day="${d}" 
                            class="day-toggle p-2 rounded-lg border-2 border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-amber-700 hover:border-amber-500 transition-all text-sm font-semibold">
                            ${labels[i]}
                        </button>
                    `).join('')}
                </div>
                <div class="flex gap-3">
                    <button onclick="goalManager.closeMultiSelectModal()" 
                        class="flex-1 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-all fancy-font">
                        Cancel
                    </button>
                    <button onclick="goalManager.submitMultiSelectDays()" 
                        class="flex-1 p-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold transition-all fancy-font">
                        Confirm
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.multiSelectCallback = callback;
        this.selectedDays = [];

        // Setup day toggle buttons
        modal.querySelectorAll('.day-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const day = btn.dataset.day;
                if (this.selectedDays.includes(day)) {
                    this.selectedDays = this.selectedDays.filter(d => d !== day);
                    btn.classList.remove('bg-amber-700', 'border-amber-500', 'text-white');
                    btn.classList.add('bg-gray-700/50', 'border-gray-600', 'text-gray-300');
                } else {
                    this.selectedDays.push(day);
                    btn.classList.add('bg-amber-700', 'border-amber-500', 'text-white');
                    btn.classList.remove('bg-gray-700/50', 'border-gray-600', 'text-gray-300');
                }
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeMultiSelectModal();
        });
    }

    submitMultiSelectDays() {
        const callback = this.multiSelectCallback;
        const days = [...this.selectedDays];
        this.closeMultiSelectModal();
        if (callback) callback(days);
    }

    closeMultiSelectModal() {
        const modal = document.getElementById('multiselect-modal');
        if (modal) modal.remove();
        this.multiSelectCallback = null;
        this.selectedDays = [];
    }

    generateRecurringTasksForToday() {
        const today = new Date(this.getTodayDateString() + 'T12:00:00');
        const todayStr = this.getTodayDateString();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const todayDay = dayNames[today.getDay()];
        const todayDate = today.getDate();
        
        this.recurringTasks.forEach(rt => {
            if (!rt.active) return;
            
            // Check if already generated for today
            if (rt.lastGenerated === todayStr) return;
            
            // Check if task already exists for today (by title match)
            const existsToday = this.dailyTasks.some(t => 
                t.title === rt.title && 
                t.dueDate === todayStr && 
                t.recurringTaskId === rt.id
            );
            if (existsToday) return;
            
            let shouldGenerate = false;
            
            switch (rt.recurrence.type) {
                case 'weekly':
                    shouldGenerate = rt.recurrence.days.includes(todayDay);
                    break;
                    
                case 'biweekly':
                    if (rt.recurrence.day === todayDay) {
                        // Check if it's been at least 13 days since last generation
                        if (!rt.recurrence.lastGenerated) {
                            shouldGenerate = true;
                        } else {
                            const lastGen = new Date(rt.recurrence.lastGenerated);
                            const daysDiff = Math.floor((today - lastGen) / (1000 * 60 * 60 * 24));
                            shouldGenerate = daysDiff >= 13;
                        }
                    }
                    break;
                    
                case 'monthly-date':
                    shouldGenerate = todayDate === rt.recurrence.dayOfMonth;
                    break;
                    
                case 'monthly-weekday':
                    if (rt.recurrence.day === todayDay) {
                        const weekOfMonth = Math.ceil(todayDate / 7);
                        if (rt.recurrence.week === -1) {
                            // Last occurrence of this day in month
                            const nextWeek = new Date(today);
                            nextWeek.setDate(todayDate + 7);
                            shouldGenerate = nextWeek.getMonth() !== today.getMonth();
                        } else {
                            shouldGenerate = weekOfMonth === rt.recurrence.week;
                        }
                    }
                    break;
            }
            
            if (shouldGenerate) {
                const task = {
                    id: Date.now() + Math.random(),
                    title: rt.title,
                    description: rt.description,
                    weeklyGoalIds: [],
                    created: new Date().toISOString(),
                    dueDate: todayStr,
                    completed: false,
                    checklist: [],
                    recurringTaskId: rt.id // Link to parent recurring task
                };
                this.dailyTasks.push(task);
                rt.lastGenerated = todayStr;
                if (rt.recurrence.type === 'biweekly') {
                    rt.recurrence.lastGenerated = todayStr;
                }
            }
        });
        
        this.saveData();
    }

    deleteRecurringTask(id) {
        if (confirm('Delete this recurring task? Future tasks will not be generated.')) {
            this.recurringTasks = this.recurringTasks.filter(rt => rt.id !== id);
            this.saveData();
            this.render();
        }
    }

    toggleRecurringTask(id) {
        const rt = this.recurringTasks.find(r => r.id === id);
        if (rt) {
            rt.active = !rt.active;
            this.saveData();
            this.render();
        }
    }

    renderRecurringTasks() {
        const container = document.getElementById('recurring-tasks-container');
        if (!container) return;
        
        if (this.recurringTasks.length === 0) {
            container.innerHTML = `
                <p class="text-cyan-300/70 text-sm text-center fancy-font py-2">
                    No recurring tasks yet. Add one to auto-generate tasks on schedule!
                </p>
            `;
            return;
        }
        
        const dayLabels = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
        
        container.innerHTML = this.recurringTasks.map(rt => {
            let scheduleText = '';
            switch (rt.recurrence.type) {
                case 'weekly':
                    scheduleText = 'Every ' + rt.recurrence.days.map(d => dayLabels[d] || d).join(', ');
                    break;
                case 'biweekly':
                    scheduleText = 'Every other ' + (dayLabels[rt.recurrence.day] || rt.recurrence.day);
                    break;
                case 'monthly-date':
                    scheduleText = 'Monthly on day ' + rt.recurrence.dayOfMonth;
                    break;
                case 'monthly-weekday':
                    const weekLabel = rt.recurrence.week === -1 ? 'Last' : ['', '1st', '2nd', '3rd', '4th'][rt.recurrence.week];
                    scheduleText = weekLabel + ' ' + (dayLabels[rt.recurrence.day] || rt.recurrence.day) + ' of month';
                    break;
            }
            
            return `
                <div class="flex items-center gap-2 p-2 rounded-lg ${rt.active ? 'bg-cyan-900/40' : 'bg-gray-800/40 opacity-60'} border border-cyan-700/50">
                    <button onclick="goalManager.toggleRecurringTask(${rt.id})" 
                        class="text-lg ${rt.active ? 'text-green-400' : 'text-gray-500'}">
                        ${rt.active ? '<i class="ri-checkbox-circle-fill"></i>' : '<i class="ri-checkbox-blank-circle-line"></i>'}
                    </button>
                    <div class="flex-1 min-w-0">
                        <div class="text-white text-sm font-bold truncate">${rt.title}</div>
                        <div class="text-cyan-300/70 text-xs">${scheduleText}</div>
                    </div>
                    <button onclick="goalManager.deleteRecurringTask(${rt.id})" 
                        class="text-red-400 hover:text-red-300 p-1" aria-label="Delete recurring task">
                        <i class="ri-delete-bin-line" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    addSideQuest() {
        this.showInputModal({
            title: 'New Side Quest',
            placeholder: 'Enter your side quest...',
            icon: 'ri-compass-3-line'
        }, (title) => {
            if (!title || !title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                this.showPriorityModal('medium', (priority) => {
                    const quest = {
                        id: Date.now(),
                        title: title.trim(),
                        description: (description || '').trim(),
                        priority: priority,
                        created: new Date().toISOString(),
                        completed: false,
                        checklist: []
                    };
                    this.sideQuests.push(quest);
                    this.saveData();
                    this.render();
                });
            });
        });
    }

    toggleSideQuest(questId) {
        const quest = this.sideQuests.find(q => q.id === questId);
        if (quest) {
            // Check if trying to complete quest
            if (!quest.completed) {
                // Check if all checklist items are complete
                if (!this.canCompleteTask(quest)) {
                    this.showAchievement('⚠️ Complete all checklist items first!', 'daily');
                    return;
                }
            }
            
            quest.completed = !quest.completed;
            if (quest.completed) {
                const xpReward = quest.priority === 'high' ? 30 : quest.priority === 'medium' ? 20 : 15;
                this.addXP(xpReward, 'side');
                this.showAchievement(`Side Quest Completed! +${xpReward} XP 🧭`, 'daily');
            } else {
                const xpReward = quest.priority === 'high' ? 30 : quest.priority === 'medium' ? 20 : 15;
                this.xp = Math.max(0, this.xp - xpReward);
            }
            this.saveData();
            this.render();
        }
    }

    filterSideQuests(priority) {
        this.sideQuestFilter = priority;
        
        // Update button styles
        document.querySelectorAll('[id^="filter-"]').forEach(btn => {
            btn.classList.remove('bg-cyan-700', 'text-white');
            btn.classList.add('bg-cyan-800/50', 'text-cyan-200');
        });
        
        const activeBtn = document.getElementById(`filter-${priority}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-cyan-800/50', 'text-cyan-200');
            activeBtn.classList.add('bg-cyan-700', 'text-white');
        }
        
        this.renderSideQuests();
    }

    // Checklist System for Tasks
    addChecklistItem(taskType, taskId, itemText) {
        let task = null;
        let taskArray = null;

        switch(taskType) {
            case 'weekly':
                task = this.weeklyGoals.find(t => t.id === taskId);
                taskArray = this.weeklyGoals;
                break;
            case 'daily':
                task = this.dailyTasks.find(t => t.id === taskId);
                taskArray = this.dailyTasks;
                break;
            case 'sidequest':
                task = this.sideQuests.find(t => t.id === taskId);
                taskArray = this.sideQuests;
                break;
        }

        if (task) {
            if (!task.checklist) {
                task.checklist = [];
            }
            
            const checklistItem = {
                id: Date.now(),
                text: itemText,
                completed: false
            };
            
            task.checklist.push(checklistItem);
            this.saveData();
            this.render();
        }
    }

    toggleChecklistItem(taskType, taskId, itemId) {
        let task = null;

        switch(taskType) {
            case 'weekly':
                task = this.weeklyGoals.find(t => t.id === taskId);
                break;
            case 'daily':
                task = this.dailyTasks.find(t => t.id === taskId);
                break;
            case 'sidequest':
                task = this.sideQuests.find(t => t.id === taskId);
                break;
        }

        if (task && task.checklist) {
            const item = task.checklist.find(i => i.id === itemId);
            if (item) {
                item.completed = !item.completed;
                
                // Award small XP for completing checklist item
                if (item.completed) {
                    this.addXP(8, 'checklist');
                    this.showAchievement('✓ Checklist item complete! +8 XP', 'daily');
                } else {
                    this.xp = Math.max(0, this.xp - 8);
                }
                
                // Update parent task progress
                this.updateChecklistProgress(task);
                this.saveData();
                this.render();
            }
        }
    }

    deleteChecklistItem(taskType, taskId, itemId) {
        let task = null;

        switch(taskType) {
            case 'weekly':
                task = this.weeklyGoals.find(t => t.id === taskId);
                break;
            case 'daily':
                task = this.dailyTasks.find(t => t.id === taskId);
                break;
            case 'sidequest':
                task = this.sideQuests.find(t => t.id === taskId);
                break;
        }

        if (task && task.checklist) {
            task.checklist = task.checklist.filter(i => i.id !== itemId);
            this.saveData();
            this.render();
        }
    }

    updateChecklistProgress(task) {
        if (!task.checklist || task.checklist.length === 0) {
            return;
        }

        const completedItems = task.checklist.filter(i => i.completed).length;
        const totalItems = task.checklist.length;
        const progress = Math.floor((completedItems / totalItems) * 100);
        
        // For weekly goals, update progress
        if (task.progress !== undefined) {
            task.progress = progress;
        }
    }

    getChecklistProgress(task) {
        if (!task.checklist || task.checklist.length === 0) {
            return { completed: 0, total: 0, percent: 0 };
        }

        const completed = task.checklist.filter(i => i.completed).length;
        const total = task.checklist.length;
        const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;

        return { completed, total, percent };
    }

    canCompleteTask(task) {
        // If task has checklist, all items must be complete
        if (task.checklist && task.checklist.length > 0) {
            return task.checklist.every(item => item.completed);
        }
        return true; // No checklist = can complete anytime
    }

    promptAddChecklistItem(taskType, taskId) {
        this.showInputModal({
            title: 'Add Checklist Item',
            placeholder: 'Enter checklist item...',
            icon: 'ri-checkbox-line'
        }, (text) => {
            if (text && text.trim()) {
                this.addChecklistItem(taskType, taskId, text);
            }
        });
    }

    renderChecklistHTML(task, taskType) {
        if (!task.checklist || task.checklist.length === 0) {
            return `
                <div class="mt-3 pt-3 border-t border-gray-700/50">
                    <button onclick="goalManager.promptAddChecklistItem('${taskType}', ${task.id});" 
                        class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-3 py-1 rounded border border-purple-600 fancy-font">
                        ✓ Add Checklist Item
                    </button>
                </div>
            `;
        }

        const progress = this.getChecklistProgress(task);
        
        return `
            <div class="mt-3 pt-3 border-t border-gray-700/50">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-xs text-purple-300 font-semibold">✓ Checklist (${progress.completed}/${progress.total})</p>
                    <button onclick="goalManager.promptAddChecklistItem('${taskType}', ${task.id});" 
                        class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-2 py-1 rounded border border-purple-600 fancy-font">
                        + Add
                    </button>
                </div>
                <div class="space-y-2 pl-2">
                    ${task.checklist.map(item => `
                        <div class="flex items-center text-sm group">
                            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                                onchange="goalManager.toggleChecklistItem('${taskType}', ${task.id}, ${item.id})"
                                class="mr-2">
                            <span class="${item.completed ? 'line-through text-purple-400 opacity-60' : 'text-purple-100'} flex-1">${item.text}</span>
                            <button onclick="if(confirm('Delete this item?')) goalManager.deleteChecklistItem('${taskType}', ${task.id}, ${item.id});" 
                                class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2 text-xs">
                                <i class="ri-close-circle-line"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                ${progress.completed > 0 && progress.completed < progress.total ? `
                    <div class="w-full bg-purple-950/60 rounded-full h-2 mt-2 border border-purple-700">
                        <div class="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full shadow-lg transition-all duration-500" style="width: ${progress.percent}%"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Habit/Recurring Task System
    checkHabitReset() {
        const saved = localStorage.getItem('lifeOrganizeData');
        if (saved) {
            const data = JSON.parse(saved);
            const lastReset = data.lastHabitReset;
            const lastWeekReset = data.lastWeekReset;
            const today = this.getTodayDateString();
            
            // Daily habit reset
            if (lastReset && lastReset !== today) {
                // Check for Time Freeze spell - skip the entire reset if active
                const timeFreezeActive = this.activeSpells.some(s => 
                    s.spellId === 'time_freeze' && (s.expiresAt === -1 || s.expiresAt > Date.now())
                );
                
                if (timeFreezeActive) {
                    // Time Freeze prevents habit reset - consume the spell
                    this.activeSpells = this.activeSpells.filter(s => s.spellId !== 'time_freeze');
                    this.showAchievement('❄️ TIME FREEZE! Daily reset was prevented!', 'life');
                    this.saveData();
                    return; // Skip the entire reset
                }
                
                // Check for Streak Shield spell
                const streakShieldActive = this.activeSpells.some(s => 
                    s.spellId === 'streak_shield' && (s.expiresAt === -1 || s.expiresAt > Date.now())
                );
                
                // Reset all habits for new day
                const activeCompanion = this.getActiveCompanion();
                this.habits.forEach(habit => {
                    if (habit.completedToday) {
                        habit.completedToday = false;
                        habit.lastCompleted = lastReset;
                        habit.streak = habit.streak || 0;
                        // If skipped a day, reset streak (unless protected)
                        const lastDate = new Date(lastReset);
                        const todayDate = new Date(today);
                        const dayDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
                        if (dayDiff > 1) {
                            // Check for Streak Shield spell first
                            if (streakShieldActive && habit.streak > 0) {
                                this.showAchievement(`🛡️ STREAK SHIELD! Your ${habit.title} streak of ${habit.streak} days was protected!`, 'life');
                                // Don't reset - spell protects all streaks for its duration
                            }
                            // Then check for streak protection companion
                            else {
                                const maxProtections = activeCompanion?.bonusAmount || 0;
                                const usedProtections = activeCompanion?.protectionsUsedThisWeek || 0;
                                
                                if (activeCompanion && 
                                    activeCompanion.bonusType === 'streak_protection' && 
                                    usedProtections < maxProtections &&
                                    habit.streak > 0) {
                                    // Companion protects the streak!
                                    activeCompanion.protectionsUsedThisWeek = usedProtections + 1;
                                    this.showAchievement(`${activeCompanion.icon} ${activeCompanion.name.toUpperCase()} PROTECTS! Your ${habit.title} streak of ${habit.streak} days was saved! (${maxProtections - usedProtections - 1} protections left this week)`, 'life');
                                } else {
                                    habit.streak = 0;
                                }
                            }
                        }
                    }
                });
                
                // Reset companion protection weekly
                if (activeCompanion && activeCompanion.bonusType === 'streak_protection') {
                    const lastProtectionReset = activeCompanion.lastProtectionReset;
                    const currentWeek = this.getWeekString(new Date());
                    if (lastProtectionReset !== currentWeek) {
                        activeCompanion.protectionsUsedThisWeek = 0;
                        activeCompanion.lastProtectionReset = currentWeek;
                    }
                }
                
                this.saveData();
            }
            
            // Weekly goal reset - check if we're in a new week
            const currentWeek = this.getWeekString(new Date());
            if (lastWeekReset && lastWeekReset !== currentWeek) {
                // Archive completed weekly goals
                const completedWeekly = this.weeklyGoals.filter(g => g.completed);
                completedWeekly.forEach(goal => {
                    goal.archived = true;
                    goal.archivedDate = new Date().toISOString();
                    this.archivedGoals.push(goal);
                });
                
                // Remove completed weekly goals from active list
                this.weeklyGoals = this.weeklyGoals.filter(g => !g.completed);
                
                // Reset incomplete weekly goals (optional - uncomment if you want incomplete tasks to also reset)
                // this.weeklyGoals.forEach(goal => {
                //     goal.progress = 0;
                // });
                
                this.saveData();
            }
        }
    }
    
    // Daily Login Bonus System
    checkDailyLoginBonus() {
        const today = this.getTodayDateString();
        
        // Already claimed today
        if (this.lastLoginBonusDate === today) {
            return;
        }
        
        // Calculate streak
        if (this.lastLoginBonusDate) {
            const lastDate = new Date(this.lastLoginBonusDate);
            const todayDate = new Date(today);
            const dayDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
                // Consecutive day - increase streak
                this.loginStreak = (this.loginStreak || 0) + 1;
            } else if (dayDiff > 1) {
                // Missed days - reset streak
                this.loginStreak = 1;
            }
        } else {
            // First login ever
            this.loginStreak = 1;
        }
        
        // Calculate bonus based on streak (base 25, max 75 at 7+ day streak)
        const streakBonus = Math.min(this.loginStreak - 1, 6) * 8; // +8 per streak day, max +48
        const baseBonus = 25;
        const totalBonus = baseBonus + streakBonus;
        
        // Award the bonus
        this.goldCoins += totalBonus;
        this.lastLoginBonusDate = today;
        this.saveData();
        
        // Show achievement with streak info
        if (this.loginStreak > 1) {
            this.showAchievement(`☀️ Daily Login Bonus! +${totalBonus} Gold (${this.loginStreak}-day streak!)`, 'daily');
        } else {
            this.showAchievement(`☀️ Daily Login Bonus! +${totalBonus} Gold`, 'daily');
        }
        
        this.render();
    }
    
    getWeekString(date) {
        // Get the week number (ISO week standard: Monday is start of week)
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // Set to Thursday of the week
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getFullYear()}-W${weekNo}`;
    }

    addHabit() {
        this.showInputModal({
            title: 'New Daily Ritual',
            placeholder: 'Enter your daily ritual/habit...',
            icon: 'ri-fire-line'
        }, (title) => {
            if (!title || !title.trim()) return;
            this.showInputModal({
                title: 'Description',
                placeholder: 'Add a description (optional)...',
                icon: 'ri-file-text-line',
                inputType: 'textarea',
                optional: true
            }, (description) => {
                const habit = {
                    id: Date.now(),
                    title: title.trim(),
                    description: (description || '').trim(),
                    created: new Date().toISOString(),
                    completedToday: false,
                    streak: 0,
                    totalCompletions: 0
                };
                this.habits.push(habit);
                this.saveData();
                this.render();
            });
        });
    }

    // XP and Leveling System
    getXPForLevel(level) {
        // Progressive scaling: Each level requires more XP
        // Level 1: 500 XP
        // Level 2: 800 XP
        // Level 3: 1,200 XP
        // Level 4: 1,700 XP
        // Formula: 500 + (level - 1) * 300
        return 500 + (level - 1) * 300;
    }

    getTotalXPForLevel(level) {
        // Calculate total XP needed to reach a specific level from level 1
        let total = 0;
        for (let i = 1; i < level; i++) {
            total += this.getXPForLevel(i);
        }
        return total;
    }

    addXP(amount, source) {
        // Apply spell multipliers
        const xpMultiplier = this.getActiveSpellMultiplier('xp_multiplier') * this.getActiveSpellMultiplier('xp_boost');
        // Apply enchantment multipliers
        const enchantmentMultiplier = this.getEnchantmentMultiplier('xp');
        // Apply companion bonus (Owl: +10% XP)
        const companionBonus = 1 + this.getCompanionBonus('xp');
        
        // Check for Quest Doubler spell (2x reward on next quest)
        let questDoublerMultiplier = 1;
        const questDoublerActive = this.activeSpells.find(s => s.spellId === 'quest_doubler');
        if (questDoublerActive) {
            questDoublerMultiplier = 2;
            // Consume the spell after use
            this.activeSpells = this.activeSpells.filter(s => s.spellId !== 'quest_doubler');
            this.showAchievement('📋 QUEST DOUBLER! 2x XP & Gold earned!', 'weekly');
        }
        
        const finalXP = Math.floor(amount * xpMultiplier * enchantmentMultiplier * companionBonus * questDoublerMultiplier);
        
        this.xp += finalXP;
        const xpForNextLevel = this.getTotalXPForLevel(this.level + 1);
        
        // Trigger XP bar animation
        this.animateXPGain(finalXP);
        
        // Also award gold coins (XP = Coins for simplicity) - pass questDoublerMultiplier
        this.addGold(amount, source, questDoublerMultiplier);
        
        if (this.xp >= xpForNextLevel) {
            this.levelUp();
        }
        
        this.checkBadges(source);
        this.checkLootDrop(source);
        this.checkTitleUnlocks();
        this.saveData();
    }
    
    // XP Bar Animation
    animateXPGain(amount) {
        const xpBar = document.getElementById('xp-progress');
        if (xpBar) {
            // Add glow and shimmer animation class
            xpBar.classList.add('xp-gaining');
            
            // Remove class after animation completes
            setTimeout(() => {
                xpBar.classList.remove('xp-gaining');
            }, 800);
        }
        
        // Show floating XP text
        this.showFloatingXP(amount);
    }
    
    showFloatingXP(amount) {
        // Get XP bar position for floating text
        const xpBar = document.getElementById('xp-progress');
        if (!xpBar) return;
        
        const rect = xpBar.getBoundingClientRect();
        
        const floatText = document.createElement('div');
        floatText.className = 'xp-gain-float';
        floatText.textContent = `+${amount} XP`;
        floatText.style.left = `${rect.left + rect.width / 2}px`;
        floatText.style.top = `${rect.top}px`;
        
        document.body.appendChild(floatText);
        
        // Remove after animation
        setTimeout(() => {
            floatText.remove();
        }, 1500);
    }

    // Gold Coin System
    addGold(amount, source, questDoublerMultiplier = 1) {
        // Apply spell multipliers
        const goldMultiplier = this.getActiveSpellMultiplier('gold_multiplier');
        // Apply enchantment multipliers
        const enchantmentMultiplier = this.getEnchantmentMultiplier('gold');
        // Apply companion bonus (Dragon: +15% gold)
        const companionBonus = 1 + this.getCompanionBonus('gold');
        const finalGold = Math.floor(amount * goldMultiplier * enchantmentMultiplier * companionBonus * questDoublerMultiplier);
        
        this.goldCoins += finalGold;
        this.checkRewardUnlocks();
    }

    // Loot Drop System
    checkLootDrop(source) {
        const random = Math.random() * 100;
        let rarity, reward;
        
        if (random < 1) { // 1% Legendary
            rarity = 'legendary';
            reward = { coins: 500, xpBonus: 100, special: 'theme_unlock' };
        } else if (random < 5) { // 4% Epic
            rarity = 'epic';
            reward = { coins: 200, xpBonus: 50, special: 'ability_unlock' };
        } else if (random < 15) { // 10% Rare
            rarity = 'rare';
            reward = { coins: 100, xpBonus: 20 };
        } else if (random < 40) { // 25% Uncommon
            rarity = 'uncommon';
            reward = { coins: 50, xpBonus: 10 };
        } else { // 60% Common
            rarity = 'common';
            reward = { coins: 20 };
        }
        
        // Only drop loot on significant completions
        if (['weekly', 'monthly', 'yearly', 'life'].includes(source)) {
            this.showLootDrop(rarity, reward);
            this.goldCoins += reward.coins;
            if (reward.xpBonus) this.xp += reward.xpBonus;
            if (reward.special === 'theme_unlock') this.tryUnlockRandomTheme();
            if (reward.special === 'ability_unlock') this.tryUnlockRandomAbility();
            this.saveData();
        }
    }

    showLootDrop(rarity, reward) {
        const rarityColors = {
            common: '#9ca3af',
            uncommon: '#10b981',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b'
        };
        
        const rarityEmojis = {
            common: '📦',
            uncommon: '🎁',
            rare: '💎',
            epic: '👑',
            legendary: '⭐'
        };
        
        const message = `${rarityEmojis[rarity]} ${rarity.toUpperCase()} LOOT! +${reward.coins} coins${reward.xpBonus ? ` +${reward.xpBonus} XP` : ''}`;
        // Skip sound for loot drops since the main achievement already plays one
        this.showAchievement(message, 'monthly', false);
    }

    // Title System
    checkTitleUnlocks() {
        // Gather stats for title checks
        const totalCompletedTasks = this.archivedGoals.filter(g => g.type === 'daily').length + 
            this.dailyTasks.filter(t => t.completed).length;
        const maxStreak = Math.max(...this.habits.map(h => h.streak || 0), 0);
        const completedLifeGoals = this.lifeGoals.filter(g => g.completed).length + 
            this.archivedGoals.filter(g => g.type === 'life').length;
        const completedWeeklyGoals = this.weeklyGoals.filter(g => g.completed).length +
            this.archivedGoals.filter(g => g.type === 'weekly').length;
        const completedMonthlyGoals = this.monthlyGoals.filter(g => g.completed).length +
            this.archivedGoals.filter(g => g.type === 'monthly').length;
        const completedYearlyGoals = this.yearlyGoals.filter(g => g.completed).length +
            this.archivedGoals.filter(g => g.type === 'yearly').length;
        const totalChestsOpened = this.chestsOpened || 0;
        const totalBossesDefeated = this.bossesDefeated || 0;
        const totalFocusSessions = this.focusSessionsCompleted || 0;
        const totalSpellsCast = this.spellsCast || 0;
        
        // Unlock titles based on achievements
        const hasTitle = (id) => Array.isArray(this.unlockedTitles) &&
            this.unlockedTitles.some(t => (t && typeof t === 'object') ? t.id === id : t === id);

        // === EARLY GAME TITLES ===
        if (totalCompletedTasks >= 1 && !hasTitle('beginner')) {
            this.unlockTitle('beginner', 'The Beginner', 'Complete your first task');
        }
        if (this.habits.length >= 1 && !hasTitle('habit_starter')) {
            this.unlockTitle('habit_starter', 'Habit Starter', 'Create your first habit');
        }
        if (this.level >= 5 && !hasTitle('apprentice')) {
            this.unlockTitle('apprentice', 'The Apprentice', 'Reach Level 5');
        }
        
        // === TASK MILESTONE TITLES ===
        if (totalCompletedTasks >= 10 && !hasTitle('determined')) {
            this.unlockTitle('determined', 'The Determined', 'Complete 10 tasks');
        }
        if (totalCompletedTasks >= 50 && !hasTitle('dedicated')) {
            this.unlockTitle('dedicated', 'The Dedicated', 'Complete 50 tasks');
        }
        if (totalCompletedTasks >= 100 && !hasTitle('centurion')) {
            this.unlockTitle('centurion', 'Centurion', 'Complete 100 tasks');
        }
        if (totalCompletedTasks >= 250 && !hasTitle('relentless')) {
            this.unlockTitle('relentless', 'The Relentless', 'Complete 250 tasks');
        }
        if (totalCompletedTasks >= 500 && !hasTitle('quest_master')) {
            this.unlockTitle('quest_master', 'Quest Master', 'Complete 500 quests');
        }
        if (totalCompletedTasks >= 1000 && !hasTitle('grand_master')) {
            this.unlockTitle('grand_master', 'Grand Master', 'Complete 1000 quests');
        }
        
        // === STREAK TITLES ===
        if (maxStreak >= 3 && !hasTitle('consistent')) {
            this.unlockTitle('consistent', 'The Consistent', 'Maintain a 3-day streak');
        }
        if (maxStreak >= 7 && !hasTitle('disciplined')) {
            this.unlockTitle('disciplined', 'The Disciplined', 'Maintain a 7-day streak');
        }
        if (maxStreak >= 14 && !hasTitle('devoted')) {
            this.unlockTitle('devoted', 'The Devoted', 'Maintain a 14-day streak');
        }
        if (maxStreak >= 30 && !hasTitle('unstoppable')) {
            this.unlockTitle('unstoppable', 'The Unstoppable', 'Maintain a 30-day streak');
        }
        if (maxStreak >= 60 && !hasTitle('iron_will')) {
            this.unlockTitle('iron_will', 'Iron Will', 'Maintain a 60-day streak');
        }
        if (maxStreak >= 100 && !hasTitle('habit_king')) {
            this.unlockTitle('habit_king', 'Habit King', 'Maintain a 100-day streak');
        }
        if (maxStreak >= 365 && !hasTitle('eternal')) {
            this.unlockTitle('eternal', 'The Eternal', 'Maintain a 365-day streak');
        }
        
        // === LEVEL TITLES ===
        if (this.level >= 10 && !hasTitle('journeyman')) {
            this.unlockTitle('journeyman', 'Journeyman', 'Reach Level 10');
        }
        if (this.level >= 25 && !hasTitle('veteran')) {
            this.unlockTitle('veteran', 'Veteran', 'Reach Level 25');
        }
        if (this.level >= 50 && !hasTitle('elite')) {
            this.unlockTitle('elite', 'Elite', 'Reach Level 50');
        }
        if (this.level >= 100 && !hasTitle('legendary_hero')) {
            this.unlockTitle('legendary_hero', 'Legendary Hero', 'Reach Level 100');
        }
        
        // === GOAL TYPE TITLES ===
        if (completedLifeGoals >= 1 && !hasTitle('legendary')) {
            this.unlockTitle('legendary', 'The Legendary', 'Complete a life goal');
        }
        if (completedLifeGoals >= 5 && !hasTitle('dream_chaser')) {
            this.unlockTitle('dream_chaser', 'Dream Chaser', 'Complete 5 life goals');
        }
        if (completedWeeklyGoals >= 10 && !hasTitle('weekly_warrior')) {
            this.unlockTitle('weekly_warrior', 'Weekly Warrior', 'Complete 10 weekly goals');
        }
        if (completedMonthlyGoals >= 6 && !hasTitle('monthly_champion')) {
            this.unlockTitle('monthly_champion', 'Monthly Champion', 'Complete 6 monthly goals');
        }
        if (completedYearlyGoals >= 1 && !hasTitle('visionary')) {
            this.unlockTitle('visionary', 'The Visionary', 'Complete a yearly goal');
        }
        
        // === WEALTH TITLES ===
        if (this.goldCoins >= 1000 && !hasTitle('wealthy')) {
            this.unlockTitle('wealthy', 'The Wealthy', 'Accumulate 1,000 gold');
        }
        if (this.goldCoins >= 10000 && !hasTitle('rich')) {
            this.unlockTitle('rich', 'The Rich', 'Accumulate 10,000 gold');
        }
        if (this.goldCoins >= 100000 && !hasTitle('tycoon')) {
            this.unlockTitle('tycoon', 'Tycoon', 'Accumulate 100,000 gold');
        }
        
        // === FEATURE TITLES ===
        if (totalChestsOpened >= 1 && !hasTitle('treasure_hunter')) {
            this.unlockTitle('treasure_hunter', 'Treasure Hunter', 'Open your first chest');
        }
        if (totalChestsOpened >= 25 && !hasTitle('loot_seeker')) {
            this.unlockTitle('loot_seeker', 'Loot Seeker', 'Open 25 chests');
        }
        if (totalChestsOpened >= 100 && !hasTitle('chest_master')) {
            this.unlockTitle('chest_master', 'Chest Master', 'Open 100 chests');
        }
        if (totalFocusSessions >= 1 && !hasTitle('focused')) {
            this.unlockTitle('focused', 'The Focused', 'Complete your first focus session');
        }
        if (totalFocusSessions >= 25 && !hasTitle('zen_master')) {
            this.unlockTitle('zen_master', 'Zen Master', 'Complete 25 focus sessions');
        }
        if (totalFocusSessions >= 100 && !hasTitle('meditation_guru')) {
            this.unlockTitle('meditation_guru', 'Meditation Guru', 'Complete 100 focus sessions');
        }
        if (totalSpellsCast >= 1 && !hasTitle('spellcaster')) {
            this.unlockTitle('spellcaster', 'Spellcaster', 'Cast your first spell');
        }
        if (totalSpellsCast >= 50 && !hasTitle('archmage')) {
            this.unlockTitle('archmage', 'Archmage', 'Cast 50 spells');
        }
        if (totalBossesDefeated >= 1 && !hasTitle('boss_slayer')) {
            this.unlockTitle('boss_slayer', 'Boss Slayer', 'Defeat your first boss');
        }
        if (totalBossesDefeated >= 10 && !hasTitle('champion')) {
            this.unlockTitle('champion', 'Champion', 'Defeat 10 bosses');
        }
        if (totalBossesDefeated >= 50 && !hasTitle('dragon_slayer')) {
            this.unlockTitle('dragon_slayer', 'Dragon Slayer', 'Defeat 50 bosses');
        }
        
        // === COMPANION TITLES ===
        if (this.companions.length >= 1 && !hasTitle('beast_friend')) {
            this.unlockTitle('beast_friend', 'Beast Friend', 'Obtain your first companion');
        }
        if (this.companions.length >= 5 && !hasTitle('beast_master')) {
            this.unlockTitle('beast_master', 'Beast Master', 'Collect 5 companions');
        }
        if (this.companions.length >= 10 && !hasTitle('menagerie_keeper')) {
            this.unlockTitle('menagerie_keeper', 'Menagerie Keeper', 'Collect 10 companions');
        }
    }

    unlockTitle(id, name, description) {
        if (!this.unlockedTitles.find(t => t.id === id)) {
            this.unlockedTitles.push({ id, name, description, unlockedAt: new Date().toISOString() });
            this.showAchievement(`🎖️ Title Unlocked: "${name}"!`, 'yearly');
        }
    }

    // Theme System
    checkRewardUnlocks() {
        // Theme unlocks based on level
        if (this.level >= 5 && !this.unlockedThemes.includes('forest')) {
            this.unlockTheme('forest', 'Forest Kingdom');
        }
        if (this.level >= 10 && !this.unlockedThemes.includes('desert')) {
            this.unlockTheme('desert', 'Desert Oasis');
        }
        if (this.level >= 15 && !this.unlockedThemes.includes('ice')) {
            this.unlockTheme('ice', 'Ice Citadel');
        }
        if (this.level >= 20 && !this.unlockedThemes.includes('volcanic')) {
            this.unlockTheme('volcanic', 'Volcanic Forge');
        }
        if (this.level >= 25 && !this.unlockedThemes.includes('mystic')) {
            this.unlockTheme('mystic', 'Mystic Realm');
        }
        
        // Special unlock conditions
        const totalCompleted = this.dailyTasks.filter(t => t.completed).length +
                              this.weeklyGoals.filter(g => g.completed).length +
                              this.monthlyGoals.filter(g => g.completed).length;
        
        if (totalCompleted >= 100 && !this.unlockedThemes.includes('golden')) {
            this.unlockTheme('golden', 'Golden Empire');
        }
        
        const completedLifeGoals = this.lifeGoals.filter(g => g.completed).length;
        if (completedLifeGoals >= 5 && !this.unlockedThemes.includes('shadow')) {
            this.unlockTheme('shadow', 'Shadow Realm');
        }
    }

    unlockTheme(id, name) {
        if (!this.unlockedThemes.includes(id)) {
            this.unlockedThemes.push(id);
            this.showAchievement(`🎨 Theme Unlocked: ${name}!`, 'yearly');
        }
    }

    tryUnlockRandomTheme() {
        // Use centralized themeDefinitions - exclude 'default' since it's always unlocked
        // Also exclude premium themes if user doesn't have premium
        const allThemes = Object.keys(this.themeDefinitions).filter(t => {
            if (t === 'default') return false;
            if (!this.isPremium && this.themeDefinitions[t].premium) return false;
            return true;
        });
        const lockedThemes = allThemes.filter(t => !this.unlockedThemes.includes(t));
        if (lockedThemes.length > 0) {
            const randomTheme = lockedThemes[Math.floor(Math.random() * lockedThemes.length)];
            this.unlockTheme(randomTheme, this.themeDefinitions[randomTheme].name);
        } else if (!this.isPremium) {
            // No free themes left to unlock, give bonus gold instead
            this.goldCoins += 100;
            this.showAchievement('💰 All free themes unlocked! +100 gold bonus!', 'daily');
        }
    }

    // Treasure Chest System
    openTreasureChest(type) {
        const costs = { bronze: 200, silver: 600, gold: 1500, royal: 5000 };
        if (this.goldCoins < costs[type]) {
            this.showAchievement(`💰 Not enough gold! Need ${costs[type]} coins.`, 'daily');
            return;
        }
        
        this.goldCoins -= costs[type];
        this.chestsOpened++; // Track for titles
        
        // Record the purchase
        this.treasureChests.push({
            type,
            cost: costs[type],
            openedAt: new Date().toISOString()
        });
        
        // Check if Lucky Draw spell is active
        const luckyDrawActive = this.activeSpells.some(s => s.spellId === 'lucky_draw');
        
        // Generate rewards based on chest type
        const rewards = this.generateChestRewards(type, luckyDrawActive);
        this.showChestRewards(type, rewards);
        
        // Consume Lucky Draw spell if active
        if (luckyDrawActive) {
            this.activeSpells = this.activeSpells.filter(s => s.spellId !== 'lucky_draw');
            this.showAchievement('🎲 Lucky Draw! Guaranteed rare loot!', 'rare', false);
        }
        
        // Apply rewards (spells, companions, themes only - no gold/XP from chests)
        // Suppress sub-reward sounds so only the chest toast sound plays
        this._suppressRewardSounds = true;
        rewards.forEach(reward => {
            if (reward.type === 'theme') this.tryUnlockRandomTheme();
            if (reward.type === 'companion') this.unlockCompanion(reward.value);
            if (reward.type === 'spell') this.addSpellToBook(reward.spellId, reward.charges);
        });
        this._suppressRewardSounds = false;
        
        this.saveData();
        this.render();
    }

    generateChestRewards(type, luckyDrawActive = false) {
        const rewards = [];
        
        // Free spells that non-premium users can earn
        const freeSpellIds = ['lucky_draw', 'instant_archive', 'focus_mode', 'minor_wisdom', 'copper_blessing'];
        
        // Define loot tables with weights (no gold/XP - earn those through tasks!)
        const lootTables = {
            bronze: {
                spells: [
                    { id: 'lucky_draw', weight: 30, charges: 1, rarity: 'uncommon' },
                    { id: 'minor_wisdom', weight: 25, charges: 1, rarity: 'common' },
                    { id: 'copper_blessing', weight: 25, charges: 1, rarity: 'common' },
                    { id: 'arcane_surge', weight: 15, charges: 1, rarity: 'rare' },
                    { id: 'golden_touch', weight: 5, charges: 1, rarity: 'rare' }
                ],
                companions: [
                    { id: 'cat', weight: 50, rarity: 'common' },
                    { id: 'rabbit', weight: 50, rarity: 'common' }
                ],
                companionChance: 0.05,
                itemCount: 1
            },
            silver: {
                spells: [
                    { id: 'arcane_surge', weight: 25, charges: 2, rarity: 'rare' },
                    { id: 'golden_touch', weight: 20, charges: 1, rarity: 'rare' },
                    { id: 'silver_blessing', weight: 20, charges: 1, rarity: 'uncommon' },
                    { id: 'inferno_focus', weight: 20, charges: 1, rarity: 'rare' },
                    { id: 'critical_strike', weight: 15, charges: 1, rarity: 'rare' }
                ],
                companions: [
                    { id: 'cat', weight: 20, rarity: 'common' },
                    { id: 'rabbit', weight: 20, rarity: 'common' },
                    { id: 'owl', weight: 25, rarity: 'uncommon' },
                    { id: 'fox', weight: 25, rarity: 'uncommon' },
                    { id: 'turtle', weight: 10, rarity: 'uncommon' }
                ],
                companionChance: 0.10,
                themeChance: 0.3,
                itemCount: 2
            },
            gold: {
                spells: [
                    { id: 'inferno_focus', weight: 30, charges: 2, rarity: 'rare' },
                    { id: 'berserker_rage', weight: 25, charges: 1, rarity: 'epic' },
                    { id: 'critical_strike', weight: 20, charges: 2, rarity: 'rare' },
                    { id: 'streak_shield', weight: 15, charges: 1, rarity: 'epic' },
                    { id: 'moonlight_blessing', weight: 10, charges: 1, rarity: 'legendary' }
                ],
                companions: [
                    { id: 'owl', weight: 15, rarity: 'uncommon' },
                    { id: 'fox', weight: 15, rarity: 'uncommon' },
                    { id: 'turtle', weight: 10, rarity: 'uncommon' },
                    { id: 'wolf', weight: 25, rarity: 'rare' },
                    { id: 'eagle', weight: 20, rarity: 'rare' },
                    { id: 'bear', weight: 15, rarity: 'rare' }
                ],
                companionChance: 0.20,
                themeChance: 0.5,
                itemCount: 3
            },
            royal: {
                spells: [
                    { id: 'boss_slayer', weight: 25, charges: 1, rarity: 'epic' },
                    { id: 'execute', weight: 20, charges: 1, rarity: 'epic' },
                    { id: 'moonlight_blessing', weight: 20, charges: 2, rarity: 'legendary' },
                    { id: 'berserker_rage', weight: 15, charges: 2, rarity: 'epic' },
                    { id: 'double_xp_weekend', weight: 10, charges: 1, rarity: 'legendary' },
                    { id: 'time_freeze', weight: 10, charges: 2, rarity: 'legendary' }
                ],
                companions: [
                    { id: 'wolf', weight: 10, rarity: 'rare' },
                    { id: 'eagle', weight: 10, rarity: 'rare' },
                    { id: 'bear', weight: 15, rarity: 'rare' },
                    { id: 'dragon', weight: 25, rarity: 'legendary' },
                    { id: 'unicorn', weight: 20, rarity: 'epic' },
                    { id: 'phoenix', weight: 10, rarity: 'legendary' },
                    { id: 'lion', weight: 10, rarity: 'legendary' }
                ],
                companionChance: 0.40,
                themeChance: 0.7,
                itemCount: 4
            }
        };
        
        const table = lootTables[type];
        
        // Filter spells based on premium status
        // Free users only get charges for free spells, premium users get all spells
        let availableSpells = table.spells;
        if (!this.isPremium) {
            availableSpells = table.spells.filter(s => freeSpellIds.includes(s.id));
            // If no free spells in this chest tier, use default free spells
            if (availableSpells.length === 0) {
                availableSpells = [
                    { id: 'minor_wisdom', weight: 25, charges: 1, rarity: 'common' }, 
                    { id: 'copper_blessing', weight: 25, charges: 1, rarity: 'common' }, 
                    { id: 'lucky_draw', weight: 20, charges: 1, rarity: 'uncommon' }, 
                    { id: 'focus_mode', weight: 15, charges: 1, rarity: 'uncommon' }, 
                    { id: 'instant_archive', weight: 15, charges: 1, rarity: 'uncommon' }
                ];
            }
        }
        
        // Lucky Draw: Filter to only uncommon+ loot (no common drops)
        const uncommonOrBetter = ['uncommon', 'rare', 'epic', 'legendary'];
        if (luckyDrawActive) {
            // Filter spells to uncommon or better
            const goodSpells = availableSpells.filter(s => uncommonOrBetter.includes(s.rarity));
            if (goodSpells.length > 0) {
                availableSpells = goodSpells;
            }
        }
        
        // Random spells based on weighted selection
        for (let i = 0; i < table.itemCount; i++) {
            const spell = this.weightedRandomSelect(availableSpells);
            if (spell) {
                rewards.push({ type: 'spell', spellId: spell.id, charges: spell.charges });
            }
        }
        
        // Random theme unlock (Lucky Draw guarantees theme if available)
        if (table.themeChance) {
            if (luckyDrawActive || Math.random() < table.themeChance) {
                rewards.push({ type: 'theme', value: 'random' });
            }
        }
        
        // Random companion unlock from pool
        let companionPool = table.companions;
        if (luckyDrawActive && companionPool) {
            // Lucky Draw: Filter to uncommon+ companions and guarantee a drop
            const goodCompanions = companionPool.filter(c => uncommonOrBetter.includes(c.rarity));
            if (goodCompanions.length > 0) {
                const companion = this.weightedRandomSelect(goodCompanions);
                rewards.push({ type: 'companion', value: companion.id });
            }
        } else if (table.companionChance && companionPool && Math.random() < table.companionChance) {
            const companion = this.weightedRandomSelect(companionPool);
            if (companion) {
                rewards.push({ type: 'companion', value: companion.id });
            }
        }
        
        return rewards;
    }
    
    weightedRandomSelect(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of items) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }
        return items[items.length - 1];
    }

    showChestRewards(type, rewards) {
        const companions = this.getCompanionDefinitions();
        const rewardText = rewards.map(r => {
            if (r.type === 'theme') return `🎨 Theme`;
            if (r.type === 'companion') {
                const companion = companions[r.value];
                return companion ? `${companion.icon} ${companion.name}` : '🐾 Companion';
            }
            if (r.type === 'spell') {
                const spellName = this.spellDefinitions[r.spellId]?.name || 'Unknown Spell';
                return `🔮 ${spellName} x${r.charges}`;
            }
            return '';
        }).filter(r => r).join(', ');
        
        this.celebrateChestOpen(type, rewards);
        
        // Delayed toast so it appears after the animation
        setTimeout(() => {
            this.showAchievement(`🎁 ${type.toUpperCase()} CHEST! ${rewardText}`, 'life');
        }, 1200);
    }

    celebrateChestOpen(type, rewards) {
        const chestIcons = { bronze: '🟫', silver: '⬜', gold: '🟨', royal: '🟪' };
        const chestIcon = chestIcons[type] || '🎁';

        // 1. Full-screen flash
        const flash = document.createElement('div');
        flash.className = `chest-open-flash ${type}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1000);

        // 2. Chest icon (shakes then bursts)
        const icon = document.createElement('div');
        icon.className = `chest-open-icon chest-tier-${type}`;
        icon.textContent = '🎁';
        document.body.appendChild(icon);
        setTimeout(() => icon.remove(), 1800);

        // 3. Aura glow ring
        const aura = document.createElement('div');
        aura.className = `chest-aura ${type}`;
        document.body.appendChild(aura);
        setTimeout(() => aura.remove(), 1800);

        // 4. Light beam shooting upward
        const beam = document.createElement('div');
        beam.className = `chest-light-beam ${type}`;
        document.body.appendChild(beam);
        setTimeout(() => beam.remove(), 2000);

        // 5. Coin/particle burst outward
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = `chest-coin-particle ${type}`;
                const angle = (i / particleCount) * Math.PI * 2;
                const radius = 100 + Math.random() * 100;
                p.style.left = '50%';
                p.style.top = '50%';
                p.style.setProperty('--coin-start-x', '0px');
                p.style.setProperty('--coin-start-y', '0px');
                p.style.setProperty('--coin-end-x', `${Math.cos(angle) * radius}px`);
                p.style.setProperty('--coin-end-y', `${Math.sin(angle) * radius}px`);
                document.body.appendChild(p);
                setTimeout(() => p.remove(), 1000);
            }, 400 + i * 20);
        }

        // 6. Loot items pop in around center
        const companions = this.getCompanionDefinitions();
        const lootIcons = rewards.map(r => {
            if (r.type === 'theme') return '🎨';
            if (r.type === 'companion') return companions[r.value]?.icon || '🐾';
            if (r.type === 'spell') return this.spellDefinitions[r.spellId]?.icon || '🔮';
            return '✨';
        });
        
        lootIcons.forEach((lootIcon, i) => {
            setTimeout(() => {
                const loot = document.createElement('div');
                loot.className = 'chest-loot-item';
                loot.textContent = lootIcon;
                const spread = lootIcons.length > 1 ? (i / (lootIcons.length - 1) - 0.5) * 200 : 0;
                loot.style.left = `calc(50% + ${spread}px)`;
                loot.style.top = '45%';
                document.body.appendChild(loot);
                setTimeout(() => loot.remove(), 1500);
            }, 800 + i * 200);
        });

        // 7. Tier label
        const label = document.createElement('div');
        label.className = `chest-tier-label ${type}`;
        label.textContent = `${type} Chest`;
        document.body.appendChild(label);
        setTimeout(() => label.remove(), 2500);

        // 8. Confetti burst (delayed to sync with opening moment)
        setTimeout(() => this.createConfetti(), 400);
    }

    // Companion System
    getCompanionDefinitions() {
        return {
            // COMMON - Bronze chest (5% chance)
            cat: { 
                name: 'Lucky Cat', 
                icon: '🐱', 
                rarity: 'common',
                bonusType: 'gold', 
                bonusAmount: 0.05,
                description: '+5% Gold from all sources'
            },
            rabbit: { 
                name: 'Swift Rabbit', 
                icon: '🐰', 
                rarity: 'common',
                bonusType: 'xp', 
                bonusAmount: 0.05,
                description: '+5% XP from all tasks'
            },
            
            // UNCOMMON - Silver chest (10% chance)
            owl: { 
                name: 'Wise Owl', 
                icon: '🦉', 
                rarity: 'uncommon',
                bonusType: 'xp', 
                bonusAmount: 0.10,
                description: '+10% XP from all tasks'
            },
            fox: { 
                name: 'Clever Fox', 
                icon: '🦊', 
                rarity: 'uncommon',
                bonusType: 'gold', 
                bonusAmount: 0.10,
                description: '+10% Gold from all sources'
            },
            turtle: { 
                name: 'Ancient Turtle', 
                icon: '🐢', 
                rarity: 'uncommon',
                bonusType: 'streak_protection', 
                bonusAmount: 1,
                description: 'Protects one streak per week from breaking'
            },
            
            // RARE - Gold chest (20% chance)
            wolf: { 
                name: 'Loyal Wolf', 
                icon: '🐺', 
                rarity: 'rare',
                bonusType: 'attack', 
                bonusAmount: 0.15,
                description: '+15% Boss damage'
            },
            eagle: { 
                name: 'Golden Eagle', 
                icon: '🦅', 
                rarity: 'rare',
                bonusType: 'xp', 
                bonusAmount: 0.15,
                description: '+15% XP from all tasks'
            },
            bear: { 
                name: 'Mighty Bear', 
                icon: '🐻', 
                rarity: 'rare',
                bonusType: 'attack', 
                bonusAmount: 0.20,
                description: '+20% Boss damage'
            },
            
            // EPIC - Royal chest (30% chance)
            dragon: { 
                name: 'Baby Dragon', 
                icon: '🐉', 
                rarity: 'epic',
                bonusType: 'gold', 
                bonusAmount: 0.20,
                description: '+20% Gold from all sources'
            },
            unicorn: { 
                name: 'Mystic Unicorn', 
                icon: '🦄', 
                rarity: 'epic',
                bonusType: 'xp', 
                bonusAmount: 0.20,
                description: '+20% XP from all tasks'
            },
            
            // LEGENDARY - Royal chest (10% chance)
            phoenix: { 
                name: 'Phoenix', 
                icon: '🔥', 
                rarity: 'legendary',
                bonusType: 'streak_protection', 
                bonusAmount: 2,
                description: 'Protects TWO streaks per week from breaking'
            },
            lion: { 
                name: 'Legendary Lion', 
                icon: '🦁', 
                rarity: 'legendary',
                bonusType: 'attack', 
                bonusAmount: 0.30,
                description: '+30% Boss damage'
            }
        };
    }
    
    unlockCompanion(companionType) {
        const companionDefs = this.getCompanionDefinitions();
        const selected = companionType || 'cat';
        const companionData = companionDefs[selected];
        
        if (!companionData) return;
        
        // Check if already have this companion
        const alreadyHave = this.companions.find(c => c.type === selected);
        
        if (alreadyHave) {
            // Already have this companion - give bonus gold
            const bonusGold = { common: 50, uncommon: 100, rare: 200, epic: 400, legendary: 800 }[companionData.rarity];
            this.goldCoins += bonusGold;
            this.showAchievement(`Already have ${companionData.name}! +${bonusGold} Gold instead`, 'daily');
        } else {
            // New companion - add to collection
            const newCompanion = { 
                ...companionData, 
                type: selected, 
                level: 1, 
                xp: 0, 
                streakProtectionUsed: false, 
                protectionsUsedThisWeek: 0,
                unlockedAt: new Date().toISOString()
            };
            this.companions.push(newCompanion);
            
            // Auto-set as active if first companion or higher rarity than current
            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            const activeCompanion = this.getActiveCompanion();
            
            if (!activeCompanion) {
                this.activeCompanionId = selected;
                this.showAchievement(`🎉 First Companion: ${companionData.name}! ${companionData.description}`, 'life');
            } else {
                const currentRarity = rarityOrder.indexOf(activeCompanion.rarity);
                const newRarity = rarityOrder.indexOf(companionData.rarity);
                
                if (newRarity > currentRarity) {
                    this.activeCompanionId = selected;
                    this.showAchievement(`🎉 NEW COMPANION: ${companionData.name}! Auto-equipped (higher rarity)`, 'life');
                } else {
                    this.showAchievement(`🎉 NEW COMPANION: ${companionData.name}! Check your collection to equip.`, 'life');
                }
            }
            
            // Keep legacy companion in sync for backwards compatibility
            this.companion = this.getActiveCompanion();
        }
        this.saveData();
    }
    
    getActiveCompanion() {
        if (!this.activeCompanionId || this.companions.length === 0) return null;
        return this.companions.find(c => c.type === this.activeCompanionId) || null;
    }
    
    setActiveCompanion(companionType) {
        const companion = this.companions.find(c => c.type === companionType);
        if (companion) {
            this.activeCompanionId = companionType;
            this.companion = companion; // Keep legacy in sync
            this.saveData();
            this.renderCompanion(); // Directly update companion UI
            this.showAchievement(`${companion.icon} ${companion.name} is now active! ${companion.description}`, 'daily');
        } else {
            console.warn('Companion not found:', companionType, 'Available:', this.companions.map(c => c.type));
        }
    }
    
    getCompanionBonus(type) {
        const activeCompanion = this.getActiveCompanion();
        if (!activeCompanion) return 0;
        if (activeCompanion.bonusType === type) {
            return activeCompanion.bonusAmount;
        }
        return 0;
    }

    levelUp() {
        this.level++;
        const titles = ['Peasant', 'Squire', 'Knight', 'Baron', 'Earl', 'Duke', 'Prince', 'King', 'Emperor', 'Legend'];
        const title = titles[Math.min(this.level - 1, titles.length - 1)];
        
        // Play level up sound
        if (window.audioManager) {
            window.audioManager.playLevelUp();
        }
        
        // Epic celebration animation!
        this.createLevelUpBurst(this.level, title);
        
        // Delayed toast so it appears after the animation
        setTimeout(() => {
            this.showAchievement(`⭐ Level Up! You are now Level ${this.level} - ${title}!`, 'yearly', false);
        }, 1500);
        this.unlockBadge('level_' + this.level, `Level ${this.level}`, `Reached Level ${this.level} - ${title}`, '⭐');
        
        // Check if can level up again (in case of large XP gain)
        const nextLevelXP = this.getTotalXPForLevel(this.level + 1);
        if (this.xp >= nextLevelXP) {
            this.levelUp();
        }
    }

    unlockBadge(id, name, description, icon) {
        if (!this.badges.find(b => b.id === id)) {
            this.badges.push({
                id,
                name,
                description,
                icon,
                unlockedAt: new Date().toISOString()
            });
            this.showAchievement(`🏆 Badge Unlocked: ${name}!`, 'monthly');
        }
    }

    checkBadges(source) {
        const totalTasks = this.dailyTasks.filter(t => t.completed).length +
                          this.weeklyGoals.filter(g => g.completed).length +
                          this.monthlyGoals.filter(g => g.completed).length;
        
        // First quest
        if (totalTasks === 1) {
            this.unlockBadge('first_quest', 'First Quest', 'Completed your first quest', '🎖️');
        }
        
        // Task milestones
        if (totalTasks >= 10) this.unlockBadge('novice', 'Novice', 'Completed 10 quests', '🥉');
        if (totalTasks >= 50) this.unlockBadge('adept', 'Adept', 'Completed 50 quests', '🥈');
        if (totalTasks >= 100) this.unlockBadge('century', 'Century', 'Completed 100 quests', '🥇');
        if (totalTasks >= 500) this.unlockBadge('master', 'Master', 'Completed 500 quests', '💎');
        
        // Habit streaks
        const maxStreak = Math.max(...this.habits.map(h => h.streak || 0), 0);
        if (maxStreak >= 7) this.unlockBadge('week_warrior', 'Week Warrior', '7-day habit streak', '🔥');
        if (maxStreak >= 30) this.unlockBadge('month_master', 'Month Master', '30-day habit streak', '⚡');
        if (maxStreak >= 100) this.unlockBadge('centurion', 'Centurion', '100-day habit streak', '👑');
        
        // Life goals
        const completedLifeGoals = this.lifeGoals.filter(g => g.completed).length;
        if (completedLifeGoals >= 1) this.unlockBadge('legend', 'Legend', 'Completed a life goal', '🌟');
        if (completedLifeGoals >= 5) this.unlockBadge('mythic', 'Mythic', 'Completed 5 life goals', '💫');
        
        // Planner badge
        const futureTasks = this.dailyTasks.filter(t => t.dueDate > this.getCachedToday()).length;
        if (futureTasks >= 30) this.unlockBadge('planner', 'Master Planner', 'Scheduled 30+ future tasks', '📅');
        
        // Treasure hunter badges
        if (this.chestsOpened >= 10) this.unlockBadge('treasure_hunter', 'Treasure Hunter', 'Opened 10 chests', '🎁');
        if (this.chestsOpened >= 50) this.unlockBadge('treasure_master', 'Treasure Master', 'Opened 50 chests', '👑');
        
        // Boss hunter badge
        if (this.bossesDefeated >= 5) this.unlockBadge('boss_hunter', 'Boss Hunter', 'Defeated 5 bosses', '💀');
        
        // Spell caster badge
        if (this.spellsCast >= 20) this.unlockBadge('spell_caster', 'Spell Caster', 'Cast 20 spells', '✨');
        
        // Focus master badge
        if (this.focusSessionsCompleted >= 25) this.unlockBadge('focus_master', 'Focus Master', 'Completed 25 focus sessions', '🎯');
    }

    toggleHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            habit.completedToday = !habit.completedToday;
            const today = this.getTodayDateString();
            
            // Initialize completion history if it doesn't exist
            if (!habit.completionHistory) {
                habit.completionHistory = [];
            }
            
            if (habit.completedToday) {
                habit.streak = (habit.streak || 0) + 1;
                habit.totalCompletions = (habit.totalCompletions || 0) + 1;
                habit.lastCompleted = today;
                
                // Add to completion history if not already there
                if (!habit.completionHistory.includes(today)) {
                    habit.completionHistory.push(today);
                }
                
                // Add XP for habit
                this.addXP(10, 'habit');
                
                // Special achievements for streaks
                if (habit.streak === 7) {
                    this.showAchievement('🔥 7-Day Streak! Keep the fire burning!', 'weekly');
                } else if (habit.streak === 30) {
                    this.showAchievement('⚡ 30-Day Streak! Legendary Discipline!', 'monthly');
                } else if (habit.streak === 100) {
                    this.showAchievement('👑 100-Day Streak! ULTIMATE MASTERY!', 'life');
                } else {
                    this.showAchievement('Daily Ritual Completed! 🕯️', 'daily');
                }
            } else {
                habit.streak = Math.max(0, (habit.streak || 0) - 1);
                habit.totalCompletions = Math.max(0, (habit.totalCompletions || 0) - 1);
                this.xp = Math.max(0, this.xp - 5);
                
                // Remove from completion history
                habit.completionHistory = habit.completionHistory.filter(d => d !== today);
            }
            
            this.saveData();
            this.render();
        }
    }

    markHabitPastCompletion(habitId, dateStr) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        
        // Initialize completion history if needed
        if (!habit.completionHistory) {
            habit.completionHistory = [];
        }
        
        // Check if already marked
        if (habit.completionHistory.includes(dateStr)) {
            this.showAchievement('⚠️ Already marked complete for this date', 'daily');
            return;
        }
        
        // Add to completion history
        habit.completionHistory.push(dateStr);
        habit.totalCompletions = (habit.totalCompletions || 0) + 1;
        
        // Recalculate streak from scratch
        this.recalculateHabitStreak(habit);
        
        // Award XP for retroactive completion
        this.addXP(10, 'habit');
        this.showAchievement(`✓ Marked complete for ${dateStr}! +10 XP`, 'daily');
        
        this.saveData();
        this.render();
    }

    recalculateHabitStreak(habit) {
        // Sort completion history by date (newest first)
        const sortedHistory = [...(habit.completionHistory || [])].sort((a, b) => 
            new Date(b) - new Date(a)
        );
        
        if (sortedHistory.length === 0) {
            habit.streak = 0;
            return;
        }
        
        const today = this.getTodayDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // Check if completed today or yesterday (streak is active)
        if (!sortedHistory.includes(today) && !sortedHistory.includes(yesterdayStr)) {
            habit.streak = 0;
            return;
        }
        
        // Count consecutive days from today backwards
        let streak = 0;
        let currentDate = new Date();
        
        // Start from today and go backwards
        for (let i = 0; i < 365; i++) { // Max 365 day streak check
            const dateStr = currentDate.toISOString().split('T')[0];
            
            if (sortedHistory.includes(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // Allow one skip if we're on day 0 (today) and yesterday was completed
                if (i === 0 && dateStr === today) {
                    currentDate.setDate(currentDate.getDate() - 1);
                    continue;
                }
                break;
            }
        }
        
        habit.streak = streak;
        habit.lastCompleted = sortedHistory[0];
    }

    // Focus Timer & Enchantment System
    startFocusTimer() {
        if (this.focusTimerRunning) {
            this.showAchievement('⚠️ Focus timer already running', 'daily');
            return;
        }

        // Check if extended focus enchantment is active
        const extendedFocus = this.hasActiveEnchantment('extended_focus');
        const sessionLength = extendedFocus ? 35 : 25;
        
        this.focusTimeRemaining = sessionLength * 60; // Convert to seconds
        this.focusTimerRunning = true;
        
        this.focusTimer = setInterval(() => {
            this.focusTimeRemaining--;
            
            if (this.focusTimeRemaining <= 0) {
                this.completeFocusSession();
            }
            
            this.updateFocusTimerDisplay();
        }, 1000);
        
        this.showAchievement(`🎯 Focus session started! (${sessionLength} minutes)`, 'daily');
        this.render();
    }

    pauseFocusTimer() {
        if (!this.focusTimerRunning) return;
        
        clearInterval(this.focusTimer);
        this.focusTimerRunning = false;
        this.showAchievement('⏸️ Focus timer paused', 'daily');
        this.render();
    }

    resumeFocusTimer() {
        if (this.focusTimerRunning || this.focusTimeRemaining <= 0) return;
        
        this.focusTimerRunning = true;
        this.focusTimer = setInterval(() => {
            this.focusTimeRemaining--;
            
            if (this.focusTimeRemaining <= 0) {
                this.completeFocusSession();
            }
            
            this.updateFocusTimerDisplay();
        }, 1000);
        
        this.showAchievement('▶️ Focus timer resumed', 'daily');
        this.render();
    }

    stopFocusTimer() {
        if (!this.focusTimerRunning && this.focusTimeRemaining <= 0) return;
        
        clearInterval(this.focusTimer);
        this.focusTimerRunning = false;
        this.focusTimeRemaining = 0;
        this.showAchievement('⏹️ Focus timer stopped', 'daily');
        this.render();
    }

    completeFocusSession() {
        clearInterval(this.focusTimer);
        this.focusTimerRunning = false;
        this.focusTimeRemaining = 0;
        
        // Check for extended focus enchantment
        const extendedFocus = this.hasActiveEnchantment('extended_focus');
        const sessionLength = extendedFocus ? 35 : 25;
        
        // Award crystals
        const bonusCrystal = this.hasActiveEnchantment('bonus_crystal');
        let crystalsEarned = bonusCrystal ? 2 : 1;
        
        // Check for Focus Mode spell (2x crystals)
        const focusModeActive = this.activeSpells.some(s => 
            s.spellId === 'focus_mode' && (s.expiresAt === -1 || s.expiresAt > Date.now())
        );
        if (focusModeActive) {
            crystalsEarned *= 2;
        }
        
        this.focusCrystals += crystalsEarned;
        this.totalFocusTime += sessionLength;
        this.focusSessionsCompleted++; // Track for titles
        
        // Play crystal earn sound
        if (window.audioManager) {
            window.audioManager.playCrystalEarn();
        }
        
        // Award XP bonus if Focus Mode is active
        let xpBonus = 0;
        if (focusModeActive) {
            xpBonus = 50;
            this.addXP(xpBonus, 'daily');
        }
        
        // Send browser notification
        const xpText = xpBonus > 0 ? ` +${xpBonus} XP!` : '';
        this.showNotification(
            '🎯 Focus Session Complete!',
            `Great work! You earned ${crystalsEarned} Focus Crystal${crystalsEarned > 1 ? 's' : ''}!${xpText} 💎`,
            '🎯'
        );
        
        const focusModeText = focusModeActive ? ' (🎯 Focus Mode!)' : '';
        this.showAchievement(`✨ Focus session complete! +${crystalsEarned} 💎${xpText}${focusModeText}`, 'weekly', false);
        
        this.saveData();
        this.render();
    }

    updateFocusTimerDisplay() {
        const timerElement = this.getElement('focus-timer-display');
        if (!timerElement) return;
        
        const minutes = Math.floor(this.focusTimeRemaining / 60);
        const seconds = this.focusTimeRemaining % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        const progressBar = this.getElement('focus-timer-progress');
        if (progressBar) {
            const extendedFocus = this.hasActiveEnchantment('extended_focus');
            const sessionLength = extendedFocus ? 35 : 25;
            const totalSeconds = sessionLength * 60;
            const progress = ((totalSeconds - this.focusTimeRemaining) / totalSeconds) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    playNotificationSound() {
        if (window.audioManager) {
            window.audioManager.playNotification();
        }
    }

    // Enchantment System
    purchaseEnchantment(enchantmentId) {
        const enchantment = this.enchantmentDefinitions[enchantmentId];
        if (!enchantment) return;
        
        if (this.focusCrystals < enchantment.cost) {
            this.showAchievement(`⚠️ Not enough Focus Crystals! Need ${enchantment.cost}, have ${this.focusCrystals}`, 'daily');
            return;
        }
        
        // Check if already active
        if (this.hasActiveEnchantment(enchantment.effect)) {
            this.showAchievement(`⚠️ ${enchantment.name} is already active!`, 'daily');
            return;
        }
        
        // Deduct cost
        this.focusCrystals -= enchantment.cost;
        
        // Add to active enchantments
        const activeEnchantment = {
            id: enchantment.id,
            effect: enchantment.effect,
            expiresAt: Date.now() + (enchantment.duration * 60 * 1000),
            name: enchantment.name,
            icon: enchantment.icon
        };
        
        this.activeEnchantments.push(activeEnchantment);
        
        // Schedule expiry notification
        this.scheduleEnchantmentExpiryNotification(activeEnchantment);
        
        this.showAchievement(`✨ ${enchantment.icon} ${enchantment.name} activated!`, 'weekly');
        this.saveData();
        this.render();
    }

    hasActiveEnchantment(effect) {
        this.checkExpiredEnchantments();
        return this.activeEnchantments.some(e => e.effect === effect);
    }

    checkExpiredEnchantments() {
        const now = Date.now();
        const expiredCount = this.activeEnchantments.length;
        
        this.activeEnchantments = this.activeEnchantments.filter(e => {
            if (e.expiresAt <= now) {
                this.showAchievement(`⏱️ ${e.icon} ${e.name} has expired`, 'daily');
                return false;
            }
            return true;
        });
        
        if (expiredCount !== this.activeEnchantments.length) {
            this.saveData();
        }
    }

    getEnchantmentMultiplier(type) {
        this.checkExpiredEnchantments();
        
        if (type === 'xp' && this.hasActiveEnchantment('double_xp')) {
            return 2;
        }
        if (type === 'gold' && this.hasActiveEnchantment('double_gold')) {
            return 2;
        }
        if (type === 'boss_damage' && this.hasActiveEnchantment('boss_damage')) {
            return 1.5;
        }
        
        return 1;
    }

    calculateProgress(parentId, childArray, idField) {
        // Support both old single ID format and new array format
        const children = childArray.filter(child => {
            const parentIds = child[idField];
            if (Array.isArray(parentIds)) {
                return parentIds.includes(parentId);
            }
            // Legacy support for old single ID format
            return child[idField.replace('Ids', 'Id')] === parentId;
        });
        if (children.length === 0) return 0;
        
        const completedCount = children.filter(child => child.completed).length;
        return Math.round((completedCount / children.length) * 100);
    }

    updateParentProgress() {
        // Update weekly goals based on daily tasks
        this.weeklyGoals.forEach(goal => {
            goal.progress = this.calculateProgress(goal.id, this.dailyTasks, 'weeklyGoalIds');
            if (goal.progress === 100 && !goal.completed) {
                goal.completed = true;
                this.showAchievement('Weekly Quest Auto-Completed! 🛡️', 'weekly');
            }
        });

        // Update monthly goals based on weekly goals
        this.monthlyGoals.forEach(goal => {
            goal.progress = this.calculateProgress(goal.id, this.weeklyGoals, 'monthlyGoalIds');
            if (goal.progress === 100 && !goal.completed) {
                goal.completed = true;
                this.showAchievement('Monthly Victory Auto-Achieved! 👑', 'monthly');
            }
        });

        // Update yearly goals based on monthly goals
        this.yearlyGoals.forEach(goal => {
            goal.progress = this.calculateProgress(goal.id, this.monthlyGoals, 'yearlyGoalIds');
            if (goal.progress === 100 && !goal.completed) {
                goal.completed = true;
                this.showAchievement('Yearly Campaign Auto-Completed! 🏆', 'yearly');
            }
        });

        // Update life goals based on yearly goals
        this.lifeGoals.forEach(goal => {
            goal.progress = this.calculateProgress(goal.id, this.yearlyGoals, 'lifeGoalIds');
            if (goal.progress === 100 && !goal.completed) {
                goal.completed = true;
                this.showAchievement('LIFE GOAL AUTO-MASTERED! ⚡👑⚡', 'life');
            }
            // Check for boss defeat
            this.checkBossDefeat(goal);
        });

        // Check yearly goals for boss defeats
        this.yearlyGoals.forEach(goal => {
            this.checkBossDefeat(goal);
        });
    }

    toggleTask(taskId, event) {
        const task = this.dailyTasks.find(t => t.id === taskId);
        if (task) {
            // Check if trying to complete task
            if (!task.completed) {
                // Check if all checklist items are complete
                if (!this.canCompleteTask(task)) {
                    this.showAchievement('⚠️ Complete all checklist items first!', 'daily');
                    return;
                }
            }
            
            task.completed = !task.completed;
            if (task.completed) {
                this.addXP(15, 'daily');
                this.showAchievement('Quest Task Completed! +15 XP ⚔️', 'daily');
                // Trigger completion animation
                this.playQuestCompleteAnimation(event);
            } else {
                this.xp = Math.max(0, this.xp - 10);
            }
            this.updateParentProgress();
            this.saveData();
            this.render();
        }
    }

    toggleWeeklyGoal(goalId, event) {
        const goal = this.weeklyGoals.find(g => g.id === goalId);
        if (goal) {
            // Check if trying to complete goal
            if (!goal.completed) {
                // Check if all checklist items are complete
                if (!this.canCompleteTask(goal)) {
                    this.showAchievement('⚠️ Complete all checklist items first!', 'daily');
                    return;
                }
            }
            
            goal.completed = !goal.completed;
            if (goal.completed) {
                this.addXP(50, 'weekly');
                this.showAchievement('Weekly Quest Conquered! +50 XP 🛡️', 'weekly');
                // Trigger completion animation
                this.playQuestCompleteAnimation(event);
            } else {
                this.xp = Math.max(0, this.xp - 50);
            }
            this.updateParentProgress();
            this.saveData();
            this.render();
        }
    }

    toggleMonthlyGoal(goalId, event) {
        const goal = this.monthlyGoals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = !goal.completed;
            if (goal.completed) {
                this.addXP(200, 'monthly');
                this.showAchievement('Monthly Victory Achieved! +200 XP 👑', 'monthly');
                // Deal damage to parent boss if exists
                this.dealBossDamage(goal, 'monthly');
                // Trigger completion animation
                this.playQuestCompleteAnimation(event);
            } else {
                this.xp = Math.max(0, this.xp - 200);
            }
            this.updateParentProgress();
            this.saveData();
            this.render();
        }
    }
    
    // Quest Complete Animation
    playQuestCompleteAnimation(event) {
        // Get position from event or use center of screen
        let x, y;
        if (event && event.target) {
            const rect = event.target.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
            
            // Add flash to parent card
            const card = event.target.closest('.quest-card, .goal-item, [class*="card"]');
            if (card) {
                card.classList.add('task-completing');
                setTimeout(() => card.classList.remove('task-completing'), 500);
            }
        } else {
            x = window.innerWidth / 2;
            y = window.innerHeight / 2;
        }
        
        // Create particle burst
        this.createCompletionParticles(x, y);
    }
    
    createCompletionParticles(x, y) {
        const colors = ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#a855f7'];
        const particleCount = 12;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'completion-particle';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.position = 'fixed';
            particle.style.zIndex = '9999';
            
            // Calculate burst direction
            const angle = (i / particleCount) * 360;
            const distance = 30 + Math.random() * 40;
            const tx = Math.cos(angle * Math.PI / 180) * distance;
            const ty = Math.sin(angle * Math.PI / 180) * distance;
            
            // Set custom animation end position
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 600 + Math.random() * 200,
                easing: 'ease-out'
            });
            
            document.body.appendChild(particle);
            
            // Remove after animation
            setTimeout(() => particle.remove(), 800);
        }
        
        // Create checkmark burst
        const checkmark = document.createElement('div');
        checkmark.innerHTML = '✓';
        checkmark.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            font-size: 2.5rem;
            color: #22c55e;
            text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
            pointer-events: none;
            z-index: 10000;
        `;
        checkmark.animate([
            { transform: 'translate(-50%, -50%) scale(0) rotate(-45deg)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1.5) rotate(0deg)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        });
        
        document.body.appendChild(checkmark);
        setTimeout(() => checkmark.remove(), 600);
    }

    toggleYearlyGoal(goalId, event) {
        const goal = this.yearlyGoals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = !goal.completed;
            if (goal.completed) {
                this.addXP(1000, 'yearly');
                this.showAchievement('Yearly Triumph! LEGENDARY! +1000 XP 🏆', 'yearly');
                // Deal damage to parent boss if exists
                this.dealBossDamage(goal, 'yearly');
                // Trigger completion animation
                this.playQuestCompleteAnimation(event);
            } else {
                this.xp = Math.max(0, this.xp - 1000);
            }
            this.updateParentProgress();
            this.saveData();
            this.render();
        }
    }

    toggleLifeGoal(goalId, event) {
        const goal = this.lifeGoals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = !goal.completed;
            if (goal.completed) {
                this.addXP(5000, 'life');
                this.showAchievement('LIFE GOAL MASTERED! +5000 XP! ⚡👑⚡', 'life');
                // Trigger completion animation
                this.playQuestCompleteAnimation(event);
            } else {
                this.xp = Math.max(0, this.xp - 5000);
            }
            this.saveData();
            this.render();
        }
    }

    deleteGoal(type, id) {
        if (confirm('Are you sure you want to delete this quest?')) {
            switch(type) {
                case 'life':
                    this.lifeGoals = this.lifeGoals.filter(g => g.id !== id);
                    break;
                case 'yearly':
                    this.yearlyGoals = this.yearlyGoals.filter(g => g.id !== id);
                    break;
                case 'monthly':
                    this.monthlyGoals = this.monthlyGoals.filter(g => g.id !== id);
                    break;
                case 'weekly':
                    this.weeklyGoals = this.weeklyGoals.filter(g => g.id !== id);
                    break;
                case 'daily':
                    this.dailyTasks = this.dailyTasks.filter(t => t.id !== id);
                    break;
                case 'side':
                    this.sideQuests = this.sideQuests.filter(q => q.id !== id);
                    break;
                case 'habit':
                    this.habits = this.habits.filter(h => h.id !== id);
                    break;
            }
            this.saveData();
            this.render();
        }
    }

    editGoal(type, id) {
        let item;
        switch(type) {
            case 'life':
                item = this.lifeGoals.find(g => g.id === id);
                break;
            case 'yearly':
                item = this.yearlyGoals.find(g => g.id === id);
                break;
            case 'monthly':
                item = this.monthlyGoals.find(g => g.id === id);
                break;
            case 'weekly':
                item = this.weeklyGoals.find(g => g.id === id);
                break;
            case 'daily':
                item = this.dailyTasks.find(t => t.id === id);
                break;
            case 'side':
                item = this.sideQuests.find(q => q.id === id);
                break;
            case 'habit':
                item = this.habits.find(h => h.id === id);
                break;
        }

        if (!item) return;

        const typeLabels = {
            life: 'Life Goal', yearly: 'Yearly Campaign', monthly: 'Monthly Quest',
            weekly: 'Weekly Mission', daily: 'Daily Task', side: 'Side Quest', habit: 'Daily Ritual'
        };

        this.showInputModal({
            title: `Edit ${typeLabels[type] || 'Quest'}`,
            placeholder: 'Enter new title...',
            defaultValue: item.title,
            icon: 'ri-edit-line'
        }, (newTitle) => {
            if (!newTitle || !newTitle.trim()) return;

            // For weekly/monthly/yearly, show priority selection
            if (type === 'weekly' || type === 'monthly' || type === 'yearly') {
                const currentPriority = item.priority && ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium';
                this.showPriorityModal(currentPriority, (newPriority) => {
                    item.title = newTitle.trim();
                    item.priority = newPriority;
                    this.saveData();
                    this.render();
                    this.showAchievement('✏️ Quest updated!', 'daily');
                });
                return;
            }

            item.title = newTitle.trim();

            // For side quests, also allow editing description and priority
            if (type === 'side') {
                this.showInputModal({
                    title: 'Edit Description',
                    placeholder: 'Description (optional)...',
                    defaultValue: item.description || '',
                    icon: 'ri-file-text-line',
                    inputType: 'textarea',
                    optional: true
                }, (newDescription) => {
                    item.description = (newDescription || '').trim();
                    this.showPriorityModal(item.priority || 'medium', (newPriority) => {
                        item.priority = newPriority;
                        this.saveData();
                        this.render();
                        this.showAchievement('✏️ Quest updated!', 'daily');
                    });
                });
                return;
            }

            this.saveData();
            this.render();
            this.showAchievement('✏️ Quest updated!', 'daily');
        });
    }

    render() {
        // Debounce rendering to prevent excessive calls
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        this.renderTimeout = setTimeout(() => {
            this._doRender();
        }, 50); // 50ms debounce - fast enough to feel instant, slow enough to batch rapid clicks
    }

    _doRender() {
        // Prevent overlapping renders
        if (this.isRendering) {
            return;
        }
        
        this.isRendering = true;
        
        try {
            // Refresh date cache at start of render cycle for performance
            this.refreshDateCache();
            
            // Always update global UI elements
            this.renderXPDisplay();
            this.updateProgress();
            
            // Only render the active view for performance
            const activeView = this.currentView || 'dashboard';
            
            // Map view names to render methods
            const viewRenderMap = {
                'dashboard': () => this.renderDashboard(),
                'life-goals': () => this.renderLifeGoals(),
                'yearly': () => this.renderYearlyGoals(),
                'monthly': () => this.renderMonthlyGoals(),
                'weekly': () => this.renderWeeklyGoals(),
                'daily': () => this.renderDailyTasks(),
                'sidequests': () => this.renderSideQuests(),
                'calendar': () => {
                    this.renderCalendar();
                    if (this.selectedDate) {
                        this.renderCalendarTasks(this.selectedDate);
                    }
                },
                'rewards': () => {
                    this.renderRewards();
                    this.renderBadges();
                },
                'spellbook': () => this.renderSpellbook(),
                'analytics': () => this.renderAnalytics(),
                'bossbattles': () => this.renderBossBattles(),
                'questchains': () => this.renderQuestChains(),
                'focus': () => this.renderFocusTimer(),
                'enchantments': () => this.renderEnchantments(),
                'tools': () => {
                    this.renderThemeSelector();
                    this.renderRecurringTasks();
                    this.renderReminderSettings();
                    this.renderArchives();
                    this.renderPremiumCard();
                }
            };
            
            // Render active view
            if (viewRenderMap[activeView]) {
                viewRenderMap[activeView]();
            }
            
            // Dashboard also needs habits for the daily view section
            if (activeView === 'dashboard') {
                this.renderHabits();
            }
        } finally {
            this.isRendering = false;
        }
    }

    getElement(id) {
        // Cache DOM elements to avoid repeated lookups
        if (!this.domCache[id]) {
            this.domCache[id] = document.getElementById(id);
        }
        return this.domCache[id];
    }
    
    // Cached date helpers - call refreshDateCache() at start of render cycle
    refreshDateCache() {
        const now = new Date();
        this._cachedToday = now.toISOString().split('T')[0];
        this._cachedNow = now;
    }
    
    getCachedToday() {
        if (!this._cachedToday) this.refreshDateCache();
        return this._cachedToday;
    }
    
    getCachedNow() {
        if (!this._cachedNow) this.refreshDateCache();
        return this._cachedNow;
    }
    
    renderXPDisplay() {
        const titles = ['Peasant', 'Squire', 'Knight', 'Baron', 'Earl', 'Duke', 'Prince', 'King', 'Emperor', 'Legend'];
        const title = titles[Math.min(this.level - 1, titles.length - 1)];
        
        const currentLevelXP = this.getTotalXPForLevel(this.level);
        const nextLevelXP = this.getTotalXPForLevel(this.level + 1);
        const xpIntoCurrentLevel = this.xp - currentLevelXP;
        const xpNeededForLevel = nextLevelXP - currentLevelXP;
        const xpProgress = (xpIntoCurrentLevel / xpNeededForLevel) * 100;
        
        // Use cached DOM elements for better performance
        const playerLevel = this.getElement('player-level');
        const playerTitle = this.getElement('player-title');
        const playerXp = this.getElement('player-xp');
        const xpProgressEl = this.getElement('xp-progress');
        const xpToNext = this.getElement('xp-to-next');
        const badgeCount = this.getElement('badge-count');
        const goldCoins = this.getElement('gold-coins');
        
        if (playerLevel) playerLevel.textContent = this.level;
        if (playerTitle) playerTitle.textContent = title;
        if (playerXp) playerXp.textContent = this.xp;
        if (xpProgressEl) xpProgressEl.style.width = Math.max(0, Math.min(100, xpProgress)) + '%';
        if (xpToNext) xpToNext.textContent = `${nextLevelXP - this.xp} XP`;
        if (badgeCount) badgeCount.textContent = this.badges.length;
        if (goldCoins) goldCoins.textContent = this.goldCoins;
        
        // Show current title/prefix
        const prefixEl = document.getElementById('current-prefix');
        if (prefixEl && this.currentTitle) {
            const titleData = this.unlockedTitles.find(t => t.id === this.currentTitle);
            if (titleData) {
                prefixEl.textContent = titleData.name;
            }
        }
        
        // Apply current theme
        if (this.currentTheme && this.currentTheme !== 'default') {
            this.applyColorTheme();
        }
    }

    getAchievementDefinitions() {
        return [
            { id: 'first_quest', name: 'First Quest', description: 'Complete your first quest', icon: '🎖️', type: 'tasks', target: 1 },
            { id: 'novice', name: 'Novice', description: 'Complete 10 quests', icon: '🥉', type: 'tasks', target: 10 },
            { id: 'adept', name: 'Adept', description: 'Complete 50 quests', icon: '🥈', type: 'tasks', target: 50 },
            { id: 'century', name: 'Century', description: 'Complete 100 quests', icon: '🥇', type: 'tasks', target: 100 },
            { id: 'master', name: 'Master', description: 'Complete 500 quests', icon: '💎', type: 'tasks', target: 500 },
            { id: 'week_warrior', name: 'Week Warrior', description: '7-day habit streak', icon: '🔥', type: 'streak', target: 7 },
            { id: 'month_master', name: 'Month Master', description: '30-day habit streak', icon: '⚡', type: 'streak', target: 30 },
            { id: 'centurion', name: 'Centurion', description: '100-day habit streak', icon: '👑', type: 'streak', target: 100 },
            { id: 'legend', name: 'Legend', description: 'Complete a life goal', icon: '🌟', type: 'life_goals', target: 1 },
            { id: 'mythic', name: 'Mythic', description: 'Complete 5 life goals', icon: '💫', type: 'life_goals', target: 5 },
            { id: 'planner', name: 'Master Planner', description: 'Schedule 30+ future tasks', icon: '📅', type: 'future_tasks', target: 30 },
            { id: 'treasure_hunter', name: 'Treasure Hunter', description: 'Open 10 chests', icon: '🎁', type: 'chests', target: 10 },
            { id: 'treasure_master', name: 'Treasure Master', description: 'Open 50 chests', icon: '👑', type: 'chests', target: 50 },
            { id: 'boss_hunter', name: 'Boss Hunter', description: 'Defeat 5 bosses', icon: '💀', type: 'bosses', target: 5 },
            { id: 'spell_caster', name: 'Spell Caster', description: 'Cast 20 spells', icon: '✨', type: 'spells', target: 20 },
            { id: 'focus_master', name: 'Focus Master', description: 'Complete 25 focus sessions', icon: '🎯', type: 'focus', target: 25 }
        ];
    }
    
    getAchievementProgress() {
        const totalTasks = this.dailyTasks.filter(t => t.completed).length +
                          this.weeklyGoals.filter(g => g.completed).length +
                          this.monthlyGoals.filter(g => g.completed).length;
        const maxStreak = Math.max(...this.habits.map(h => h.streak || 0), 0);
        const completedLifeGoals = this.lifeGoals.filter(g => g.completed).length;
        const futureTasks = this.dailyTasks.filter(t => t.dueDate > this.getCachedToday()).length;
        
        return {
            tasks: totalTasks,
            streak: maxStreak,
            life_goals: completedLifeGoals,
            future_tasks: futureTasks,
            chests: this.chestsOpened || 0,
            bosses: this.bossesDefeated || 0,
            spells: this.spellsCast || 0,
            focus: this.focusSessionsCompleted || 0
        };
    }
    
    renderBadges() {
        const container = document.getElementById('badges-container');
        if (!container) return;
        
        const achievements = this.getAchievementDefinitions();
        const progress = this.getAchievementProgress();
        const unlockedIds = this.badges.map(b => b.id);
        
        // Separate unlocked and locked achievements
        const unlocked = achievements.filter(a => unlockedIds.includes(a.id));
        const locked = achievements.filter(a => !unlockedIds.includes(a.id));
        
        // Sort locked by closest to completion
        locked.sort((a, b) => {
            const progressA = (progress[a.type] || 0) / a.target;
            const progressB = (progress[b.type] || 0) / b.target;
            return progressB - progressA;
        });
        
        let html = '';
        
        // Unlocked badges section
        if (unlocked.length > 0) {
            html += '<div class="col-span-2 md:col-span-4 mb-2"><h4 class="text-amber-300 font-bold fancy-font text-sm">🏆 Unlocked</h4></div>';
            html += unlocked.map(achievement => {
                const badge = this.badges.find(b => b.id === achievement.id);
                return `
                    <div class="quest-card bg-amber-950/60 p-5 rounded-lg border-2 border-amber-500 text-center">
                        <div class="text-4xl mb-2">${achievement.icon}</div>
                        <div class="text-amber-300 font-bold fancy-font text-sm">${achievement.name}</div>
                        <div class="text-amber-200 text-xs mt-1">${achievement.description}</div>
                        <div class="text-green-400 text-xs mt-2">✓ ${badge ? new Date(badge.unlockedAt).toLocaleDateString() : 'Unlocked'}</div>
                    </div>
                `;
            }).join('');
        }
        
        // In-progress achievements section
        if (locked.length > 0) {
            html += '<div class="col-span-2 md:col-span-4 mt-4 mb-2"><h4 class="text-amber-300 font-bold fancy-font text-sm">📊 In Progress</h4></div>';
            html += locked.map(achievement => {
                const current = progress[achievement.type] || 0;
                const target = achievement.target;
                const percent = Math.min(100, Math.round((current / target) * 100));
                const remaining = target - current;
                
                // Color based on progress
                let progressColor = 'bg-gray-600';
                let borderColor = 'border-gray-600';
                if (percent >= 75) {
                    progressColor = 'bg-green-500';
                    borderColor = 'border-green-600';
                } else if (percent >= 50) {
                    progressColor = 'bg-yellow-500';
                    borderColor = 'border-yellow-600';
                } else if (percent >= 25) {
                    progressColor = 'bg-orange-500';
                    borderColor = 'border-orange-600';
                }
                
                return `
                    <div class="quest-card bg-gray-900/60 p-5 rounded-lg border-2 ${borderColor} text-center opacity-80 hover:opacity-100">
                        <div class="text-3xl mb-2 grayscale-[50%]">${achievement.icon}</div>
                        <div class="text-gray-300 font-bold fancy-font text-sm">${achievement.name}</div>
                        <div class="text-gray-400 text-xs mt-1">${achievement.description}</div>
                        <div class="mt-2">
                            <div class="w-full bg-gray-700 rounded-full h-2">
                                <div class="${progressColor} h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                            </div>
                            <div class="text-xs mt-1 ${percent >= 75 ? 'text-green-400' : 'text-gray-400'}">
                                ${current}/${target} ${percent >= 75 ? `(${remaining} to go!)` : `(${percent}%)`}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        if (html === '') {
            html = '<p class="col-span-2 md:col-span-4 text-center text-amber-200 py-8 fancy-font">Complete quests to unlock badges!</p>';
        }
        
        container.innerHTML = html;
    }

    generateHabitHeatMap(habit) {
        const history = habit.completionHistory || [];
        const today = new Date();
        const daysToShow = 84; // 12 weeks
        const weeksToShow = 12;
        
        // Create array of last N days
        const days = [];
        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            days.push({
                date: dateStr,
                completed: history.includes(dateStr),
                dayOfWeek: dayOfWeek
            });
        }
        
        // Group by weeks
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }
        
        // Generate heat map HTML
        let html = '<div class="habit-heatmap mt-3 mb-2">';
        html += '<div class="flex items-start gap-1">';
        
        // Day labels
        html += '<div class="flex flex-col gap-1 text-xs text-amber-700 pr-1">';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
            html += `<div style="height: 12px; line-height: 12px;">${day}</div>`;
        });
        html += '</div>';
        
        // Weeks
        weeks.forEach(week => {
            html += '<div class="flex flex-col gap-1">';
            week.forEach(day => {
                const level = day.completed ? 3 : 0;
                const title = `${day.date}${day.completed ? ' ✓ Completed' : ' - Click to mark complete'}`;
                const isPast = new Date(day.date) < today;
                const isToday = day.date === today.toISOString().split('T')[0];
                const clickable = (isPast || isToday) && !day.completed;
                html += `<div class="heatmap-cell level-${level} ${clickable ? 'cursor-pointer hover:opacity-70' : ''}" 
                    title="${title}"
                    ${clickable ? `onclick="goalManager.markHabitPastCompletion(${habit.id}, '${day.date}')"` : ''}
                    ></div>`;
            });
            html += '</div>';
        });
        
        html += '</div>';
        
        // Legend and stats
        const completionRate = history.length > 0 ? Math.round((history.length / Math.min(daysToShow, habit.totalCompletions || history.length)) * 100) : 0;
        const last7Days = days.slice(-7).filter(d => d.completed).length;
        
        html += '<div class="flex items-center justify-between mt-2 text-xs text-amber-700">';
        html += '<div class="flex items-center gap-2">';
        html += '<span>Less</span>';
        html += '<div class="heatmap-cell level-0"></div>';
        html += '<div class="heatmap-cell level-1"></div>';
        html += '<div class="heatmap-cell level-2"></div>';
        html += '<div class="heatmap-cell level-3"></div>';
        html += '<span>More</span>';
        html += '</div>';
        html += `<div class="fancy-font"><span class="font-bold">${last7Days}/7</span> this week</div>`;
        html += '</div>';
        html += '<div class="text-xs text-amber-600 mt-1 italic fancy-font">💡 Tip: Click empty squares to mark past completions</div>';
        html += '</div>';
        
        return html;
    }

    renderHabits() {
        const container = document.getElementById('habits-container');
        if (!container) return;
        
        if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">🔥</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Build Your Rituals</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        Daily rituals forge legendary habits. Start a streak and watch your power grow!
                    </p>
                    <button onclick="goalManager.addHabit()" 
                        class="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-amber-400">
                        <i class="ri-fire-line mr-2"></i>Create Daily Ritual
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = this.habits.map(habit => `
                <div class="quest-card bg-gradient-to-br from-yellow-100 to-amber-50 p-5 rounded-lg shadow-lg border-3 border-yellow-600 hover:shadow-xl transition-all draggable-item"
                    draggable="true"
                    ondragstart="goalManager.handleDragStart('habit', ${habit.id}, event)"
                    ondragend="goalManager.handleDragEnd(event)"
                    ondragover="goalManager.handleDragOver(event)"
                    ondragenter="goalManager.handleDragEnter(event)"
                    ondragleave="goalManager.handleDragLeave(event)"
                    ondrop="goalManager.handleDrop('habit', ${habit.id}, event)">
                    
                    <div class="flex items-center">
                        <i class="ri-draggable drag-handle text-amber-600 mr-2"></i>
                        <input 
                            type="checkbox" 
                            ${habit.completedToday ? 'checked' : ''} 
                            onchange="goalManager.toggleHabit(${habit.id})">
                        <div class="ml-4 flex-1">
                            <div class="flex items-center gap-2">
                                <span class="text-lg font-bold fancy-font ${habit.completedToday ? 'line-through text-amber-700 opacity-60' : 'text-amber-900'}">${habit.title}</span>
                                ${habit.streak > 0 ? `<span class="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold">🔥 ${habit.streak} day${habit.streak !== 1 ? 's' : ''}</span>` : ''}
                            </div>
                            ${habit.description ? `<p class="text-sm text-amber-800 italic mt-1">${habit.description}</p>` : ''}
                            <div class="text-xs text-amber-700 mt-1">
                                Total: ${habit.totalCompletions || 0} completions
                            </div>
                        </div>
                        <button onclick="goalManager.editGoal('habit', ${habit.id})" class="text-blue-400 hover:text-blue-200 text-xl mr-2" title="Edit habit" aria-label="Edit habit">
                            <i class="ri-edit-line" aria-hidden="true"></i>
                        </button>
                        <button onclick="goalManager.deleteGoal('habit', ${habit.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete habit" aria-label="Delete habit">
                            <i class="ri-delete-bin-line" aria-hidden="true"></i>
                        </button>
                    </div>
                    
                    ${this.generateHabitHeatMap(habit)}
                </div>
            `).join('');
        }
    }

    renderArchives() {
        const container = document.getElementById('archives-container');
        if (!container) return;
        
        const archiveCountEl = document.getElementById('archive-count');
        if (archiveCountEl) {
            archiveCountEl.textContent = this.archivedGoals.length;
        }
        
        if (this.archivedGoals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-amber-200">
                    <div class="text-8xl mb-4 opacity-30">📦</div>
                    <p class="fancy-font text-lg">No archived quests yet. Archive completed goals to keep your lists clean!</p>
                </div>
            `;
        } else {
            const sortedArchives = [...this.archivedGoals].sort((a, b) => 
                new Date(b.archivedAt) - new Date(a.archivedAt)
            );
            
            container.innerHTML = sortedArchives.map(goal => {
                const typeIcons = {
                    life: '🏰',
                    yearly: '📅',
                    monthly: '🗓️',
                    weekly: '⚔️',
                    daily: '🗡️'
                };
                
                const typeColors = {
                    life: 'red',
                    yearly: 'purple',
                    monthly: 'blue',
                    weekly: 'green',
                    daily: 'orange'
                };
                
                const color = typeColors[goal.type] || 'gray';
                
                return `
                    <div class="quest-card bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-lg shadow-xl border-3 border-${color}-700">
                        <div class="flex items-start space-x-4">
                            <div class="text-3xl">${typeIcons[goal.type]}</div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-xs bg-${color}-800/50 text-${color}-200 px-2 py-1 rounded fancy-font capitalize">${goal.type}</span>
                                    ${goal.completed ? '<span class="text-xs text-green-400">✓ Completed</span>' : ''}
                                </div>
                                <h4 class="font-bold text-lg text-amber-300 medieval-title mb-1">${goal.title}</h4>
                                ${goal.description ? `<p class="text-sm text-${color}-200 italic mb-2">${goal.description}</p>` : ''}
                                <div class="text-xs text-${color}-300">
                                    Archived: ${new Date(goal.archivedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <button onclick="goalManager.restoreGoal(${goal.id})" class="text-${color}-400 hover:text-${color}-200 text-xl" title="Restore" aria-label="Restore archived goal">
                                    <i class="ri-refresh-line" aria-hidden="true"></i>
                                </button>
                                <button onclick="if(confirm('Permanently delete?')) { goalManager.archivedGoals = goalManager.archivedGoals.filter(g => g.id !== ${goal.id}); goalManager.saveData(); goalManager.render(); }" class="text-red-500 hover:text-red-300 text-xl" title="Delete Forever" aria-label="Permanently delete goal">
                                    <i class="ri-delete-bin-line" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Rewards System Rendering
    renderRewards() {
        this.renderTreasureChests();
        this.renderThemes();
        this.renderTitles();
        this.renderCompanion();
    }

    renderTreasureChests() {
        const container = document.getElementById('treasure-chests-container');
        if (!container) return;

        const chestTypes = [
            { type: 'bronze', name: 'Bronze Chest', cost: 200, color: 'orange', icon: '🎁' },
            { type: 'silver', name: 'Silver Chest', cost: 600, color: 'gray', icon: '💎' },
            { type: 'gold', name: 'Gold Chest', cost: 1500, color: 'yellow', icon: '👑' },
            { type: 'royal', name: 'Royal Chest', cost: 5000, color: 'purple', icon: '⭐' }
        ];

        container.innerHTML = chestTypes.map(chest => {
            const canAfford = this.goldCoins >= chest.cost;
            const timesOpened = this.treasureChests.filter(c => c.type === chest.type).length;
            
            return `
                <div class="quest-card bg-gradient-to-br from-${chest.color}-900 to-${chest.color}-950 p-5 rounded-xl shadow-xl border-3 border-${chest.color}-600 text-center">
                    <div class="text-6xl mb-3">${chest.icon}</div>
                    <h4 class="text-xl font-bold text-amber-300 medieval-title mb-2">${chest.name}</h4>
                    <p class="text-${chest.color}-200 text-lg font-bold mb-2">${chest.cost} Gold</p>
                    ${timesOpened > 0 ? `
                        <p class="text-${chest.color}-300 text-xs mb-2 fancy-font">Opened ${timesOpened} time${timesOpened !== 1 ? 's' : ''}</p>
                    ` : ''}
                    <button onclick="goalManager.openTreasureChest('${chest.type}')" 
                        class="w-full bg-gradient-to-r from-${chest.color}-600 to-${chest.color}-700 hover:from-${chest.color}-700 hover:to-${chest.color}-800 text-white px-4 py-3 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105 ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? '🎁 Open Chest!' : `🔒 Need ${chest.cost - this.goldCoins} More Gold`}
                    </button>
                </div>
            `;
        }).join('');
    }

    renderThemes() {
        const container = document.getElementById('themes-container');
        if (!container) return;

        container.innerHTML = Object.entries(this.themeDefinitions).map(([id, theme]) => {
            const isUnlocked = this.unlockedThemes.includes(id);
            const isSelected = this.currentTheme === id;
            const lockReason = !isUnlocked ? 
                (theme.special ? theme.special : `Level ${theme.unlockLevel}`) : '';

            return `
                <div onclick="goalManager.selectTheme('${id}')" 
                    class="theme-option quest-card p-5 rounded-xl shadow-xl text-center cursor-pointer transition-all ${isSelected ? 'ring-4 ring-yellow-400' : ''} ${!isUnlocked ? 'opacity-60' : ''}"
                    style="background: linear-gradient(135deg, ${theme.color}, ${this.darkenColor(theme.color, 40)}); border: 3px solid ${theme.color};"
                    title="${isUnlocked ? 'Click to apply' : 'Locked: ' + lockReason}">
                    <div class="text-5xl mb-2">${theme.icon}</div>
                    <h4 class="text-lg font-bold text-white medieval-title mb-2">${theme.name}</h4>
                    ${!isUnlocked ? `
                        <p class="text-white/70 text-xs mb-2">
                            🔒 ${lockReason}
                        </p>
                        <div class="text-white/50 text-sm italic">Locked</div>
                    ` : isSelected ? `
                        <div class="bg-yellow-500/30 border-2 border-yellow-400 rounded-lg px-3 py-2 text-yellow-300 text-sm font-bold">
                            ✓ Active Theme
                        </div>
                    ` : `
                        <div class="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-white text-sm font-bold transition-all">
                            Click to Activate
                        </div>
                    `}
                </div>
            `;
        }).join('');
    }

    renderTitles() {
        const container = document.getElementById('titles-container');
        if (!container) return;

        if (this.unlockedTitles.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-12 text-amber-200">
                    <div class="text-6xl mb-4">🎖️</div>
                    <p class="fancy-font text-lg">Complete achievements to earn prestigious titles!</p>
                </div>
            `;
        } else {
            container.innerHTML = this.unlockedTitles.map(title => {
                const active = this.currentTitle === title.id;
                return `
                    <div class="quest-card bg-gradient-to-br from-purple-900 to-purple-950 p-5 rounded-xl shadow-xl border-3 border-purple-600 ${active ? 'ring-4 ring-yellow-400' : ''}">
                        <div class="text-4xl mb-2 text-center">🎖️</div>
                        <h4 class="text-xl font-bold text-amber-300 medieval-title mb-2 text-center">"${title.name}"</h4>
                        <p class="text-purple-300 text-sm mb-3 text-center italic">${title.description}</p>
                        ${active ? `
                            <div class="bg-yellow-500/20 border-2 border-yellow-400 rounded-lg px-3 py-2 text-yellow-300 text-sm font-bold text-center">
                                ✓ Displaying
                            </div>
                        ` : `
                            <button onclick="goalManager.selectTitle('${title.id}')" 
                                class="w-full bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold fancy-font shadow-lg transition-transform hover:scale-105">
                                Equip Title
                            </button>
                        `}
                    </div>
                `;
            }).join('');
        }
    }

    renderCompanion() {
        const container = document.getElementById('companion-container');
        if (!container) return;

        const activeCompanion = this.getActiveCompanion();
        const rarityColors = {
            common: { bg: 'gray', border: 'gray', text: 'gray' },
            uncommon: { bg: 'green', border: 'green', text: 'green' },
            rare: { bg: 'blue', border: 'blue', text: 'blue' },
            epic: { bg: 'purple', border: 'purple', text: 'purple' },
            legendary: { bg: 'amber', border: 'amber', text: 'amber' }
        };
        const defaultColors = { bg: 'green', border: 'green', text: 'green' };

        if (this.companions.length === 0) {
            container.innerHTML = `
                <div class="quest-card bg-gradient-to-br from-green-900 to-green-950 p-8 rounded-xl shadow-2xl border-4 border-green-600 text-center">
                    <div class="text-8xl mb-4">🥚</div>
                    <h4 class="text-2xl font-bold text-amber-300 medieval-title mb-3">No Companions Yet</h4>
                    <p class="text-green-200 fancy-font text-lg mb-4">Open chests to discover loyal companions!</p>
                    <p class="text-green-300 text-sm">Each chest tier has different companions with unique bonuses!</p>
                </div>
            `;
        } else {
            // Active companion display
            const colors = rarityColors[activeCompanion?.rarity] || defaultColors;
            const companionDefs = this.getCompanionDefinitions();
            let html = '';
            
            if (activeCompanion) {
                // Get description from definitions if not on companion object
                const description = activeCompanion.description || companionDefs[activeCompanion.type]?.description || 'Loyal companion';
                const icon = activeCompanion.icon || companionDefs[activeCompanion.type]?.icon || '🐾';
                
                html += `
                    <div class="quest-card bg-gradient-to-br from-${colors.bg}-900 to-${colors.bg}-950 p-5 rounded-xl shadow-2xl border-4 border-${colors.border}-500 mb-6">
                        <div class="flex items-center gap-6">
                            <div class="text-8xl">${icon}</div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-xs px-2 py-1 rounded bg-${colors.bg}-700 text-${colors.text}-200 uppercase font-bold">${activeCompanion.rarity || 'rare'}</span>
                                    <span class="text-xs px-2 py-1 rounded bg-green-700 text-green-200 font-bold">ACTIVE</span>
                                </div>
                                <h4 class="text-2xl font-bold text-amber-300 medieval-title mb-1">${activeCompanion.name}</h4>
                                <p class="text-${colors.text}-200 fancy-font text-lg mb-2">${description}</p>
                                <p class="text-${colors.text}-300 text-sm">Level ${activeCompanion.level || 1}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Companion collection
            html += `
                <h4 class="text-xl font-bold text-amber-300 medieval-title mb-3 flex items-center gap-2">
                    <span>📚</span> Your Collection <span class="text-sm font-normal text-amber-400">(${this.companions.length} companions)</span>
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            `;
            
            // Sort companions by rarity
            const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
            const sortedCompanions = [...this.companions].sort((a, b) => 
                rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
            );
            
            sortedCompanions.forEach(comp => {
                const cColors = rarityColors[comp.rarity] || defaultColors;
                const isActive = comp.type === this.activeCompanionId;
                const compIcon = comp.icon || companionDefs[comp.type]?.icon || '🐾';
                const compName = comp.name || companionDefs[comp.type]?.name || 'Companion';
                
                html += `
                    <div class="quest-card bg-gradient-to-br from-${cColors.bg}-900 to-${cColors.bg}-950 p-5 rounded-lg border-2 ${isActive ? 'border-green-400 ring-2 ring-green-400' : `border-${cColors.border}-700`} text-center cursor-pointer hover:scale-105 transition-transform"
                         onclick="goalManager.setActiveCompanion('${comp.type}')">
                        <div class="text-5xl mb-2">${compIcon}</div>
                        <h5 class="font-bold text-amber-200 text-sm mb-1">${compName}</h5>
                        <span class="text-xs px-2 py-0.5 rounded bg-${cColors.bg}-700 text-${cColors.text}-200 uppercase">${comp.rarity || 'rare'}</span>
                        ${isActive ? '<div class="text-xs text-green-400 mt-2 font-bold">✓ ACTIVE</div>' : '<div class="text-xs text-gray-400 mt-2">Click to equip</div>'}
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Show all possible companions hint
            const allCompanions = this.getCompanionDefinitions();
            const unlockedTypes = this.companions.map(c => c.type);
            const lockedCount = Object.keys(allCompanions).length - unlockedTypes.length;
            
            if (lockedCount > 0) {
                html += `
                    <div class="mt-4 text-center text-gray-400 text-sm">
                        <span class="opacity-70">🔒 ${lockedCount} more companions to discover from chests!</span>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
    }

    selectTitle(titleId) {
        const title = this.unlockedTitles.find(t => t.id === titleId);
        this.currentTitle = titleId;
        this.saveData();
        this.renderTitles(); // Update titles display immediately
        this.updateTitleBanner(); // Update the title banner on dashboard
        
        if (title) {
            this.showAchievement(`🎖️ Now displaying: "${title.name}"`, 'daily');
        }
    }
    
    updateTitleBanner() {
        const banner = document.getElementById('current-title-banner');
        if (!banner) return;
        
        const title = this.unlockedTitles.find(t => t.id === this.currentTitle);
        if (title) {
            banner.innerHTML = `<span class="text-amber-300 font-bold">"${title.name}"</span>`;
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }

    // Spellbook System
    renderSpellbook() {
        this.renderActiveSpells();
        this.renderSpellCollection();
    }

    renderActiveSpells() {
        const container = document.getElementById('active-spells-container');
        if (!container) return;

        if (this.activeSpells.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-12 text-purple-200">
                    <div class="text-6xl mb-4">✨</div>
                    <p class="fancy-font text-lg">No active spell effects. Cast a spell from your spellbook!</p>
                </div>
            `;
        } else {
            // Filter out any invalid active spells
            const validActiveSpells = this.activeSpells.filter(activeSpell => {
                return this.spellDefinitions[activeSpell.spellId] !== undefined;
            });
            
            if (validActiveSpells.length !== this.activeSpells.length) {
                this.activeSpells = validActiveSpells;
                this.saveData();
            }
            
            container.innerHTML = validActiveSpells.map(activeSpell => {
                const spell = this.spellDefinitions[activeSpell.spellId];
                let timeDisplay;
                
                if (activeSpell.expiresAt === -1) {
                    // Spell active until triggered
                    timeDisplay = '✨ Active until triggered';
                } else {
                    const timeRemaining = Math.max(0, activeSpell.expiresAt - Date.now());
                    const hours = Math.floor(timeRemaining / 3600000);
                    const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                    timeDisplay = `⏰ ${hours}h ${minutes}m remaining`;
                }
                
                return `
                    <div class="quest-card bg-gradient-to-br from-purple-800 to-purple-900 p-5 rounded-xl shadow-2xl border-3 border-purple-500 active-spell">
                        <div class="text-5xl mb-2 text-center rune-text">${spell.icon}</div>
                        <h4 class="text-xl font-bold text-purple-200 medieval-title mb-2 text-center">${spell.name}</h4>
                        <p class="text-purple-300 text-sm mb-3 text-center">${spell.description}</p>
                        <div class="bg-purple-950 rounded-lg px-3 py-2 text-center">
                            <p class="text-purple-200 text-sm font-bold">${timeDisplay}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    renderSpellCollection() {
        const container = document.getElementById('spellbook-container');
        if (!container) return;

        // Show ALL spells from definitions
        // Free spells shown first, then premium spells
        // Within each section, sort by rarity: common -> uncommon -> rare -> epic -> legendary
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const sortByRarity = (a, b) => rarityOrder.indexOf(a[1].rarity) - rarityOrder.indexOf(b[1].rarity);
        
        const allSpells = Object.entries(this.spellDefinitions);
        const freeSpells = allSpells.filter(([id, spell]) => !spell.premium).sort(sortByRarity);
        const premiumSpells = allSpells.filter(([id, spell]) => spell.premium).sort(sortByRarity);
        
        const rarityColors = {
            common: 'gray',
            uncommon: 'green',
            rare: 'blue',
            epic: 'purple',
            legendary: 'yellow'
        };
        
        // Section header for free spells
        let html = `
            <div class="w-full mb-2">
                <h3 class="text-lg font-bold text-green-300 medieval-title flex items-center justify-center md:justify-start gap-2">
                    <span>✨</span> Free Spells <span class="text-sm font-normal text-green-400">(${freeSpells.length} available)</span>
                </h3>
            </div>
        `;
        
        // Render free spells
        html += freeSpells.map(([spellId, spell]) => {
            const spellEntry = this.spellbook.find(s => s.spellId === spellId);
            const charges = spellEntry ? spellEntry.charges : 0;
            const color = rarityColors[spell.rarity] || 'gray';
            const isActive = this.activeSpells.some(s => s.spellId === spellId);
            
            return `
                <div class="quest-card bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-xl shadow-xl border-3 border-${color}-600">
                    <div class="text-5xl mb-2 text-center">${spell.icon}</div>
                    <h4 class="text-lg font-bold text-${color}-200 medieval-title mb-2 text-center">${spell.name}</h4>
                    <p class="text-${color}-300 text-xs mb-2 text-center capitalize">${spell.rarity}</p>
                    <p class="text-${color}-300 text-sm mb-3 text-center">${spell.description}</p>
                    <div class="text-center mb-3">
                        <span class="text-${color}-200 text-sm font-bold">⚡ Charges: ${charges}</span>
                    </div>
                    ${isActive ? `
                        <div class="bg-green-500/20 border-2 border-green-400 rounded-lg px-3 py-2 text-green-300 text-sm font-bold text-center">
                            ✓ Active
                        </div>
                    ` : charges > 0 ? `
                        <button onclick="goalManager.castSpell('${spell.id}')" 
                            class="w-full bg-${color}-700 hover:bg-${color}-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105">
                            Cast Spell
                        </button>
                    ` : `
                        <div class="bg-${color}-950 border-2 border-${color}-800 rounded-lg px-3 py-2 text-${color}-500 text-sm font-bold text-center">
                            Open chests for charges
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
        // Section header for premium spells
        html += `
            <div class="w-full mt-6 mb-2">
                <h3 class="text-lg font-bold text-yellow-300 medieval-title flex items-center justify-center md:justify-start gap-2">
                    <span>👑</span> Premium Spells <span class="text-sm font-normal text-yellow-400">(${premiumSpells.length} spells)</span>
                </h3>
            </div>
        `;
        
        // Render premium spells
        html += premiumSpells.map(([spellId, spell]) => {
            const spellEntry = this.spellbook.find(s => s.spellId === spellId);
            const charges = spellEntry ? spellEntry.charges : 0;
            const color = rarityColors[spell.rarity] || 'gray';
            const isActive = this.activeSpells.some(s => s.spellId === spellId);
            const isPremiumLocked = !this.isPremium;
            
            return `
                <div class="quest-card bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-xl shadow-xl border-3 border-${color}-600 ${isPremiumLocked ? 'opacity-60' : ''}">
                    <div class="text-5xl mb-2 text-center">${spell.icon}</div>
                    <h4 class="text-lg font-bold text-${color}-200 medieval-title mb-2 text-center">${spell.name}</h4>
                    <p class="text-${color}-300 text-xs mb-2 text-center capitalize">${spell.rarity}${isPremiumLocked ? ' • 🔒' : ''}</p>
                    <p class="text-${color}-300 text-sm mb-3 text-center">${spell.description}</p>
                    <div class="text-center mb-3">
                        <span class="text-${color}-200 text-sm font-bold">⚡ Charges: ${charges}</span>
                    </div>
                    ${isPremiumLocked ? `
                        <button onclick="goalManager.showPremiumPurchaseModal()" 
                            class="w-full bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105">
                            👑 Unlock Premium
                        </button>
                    ` : isActive ? `
                        <div class="bg-green-500/20 border-2 border-green-400 rounded-lg px-3 py-2 text-green-300 text-sm font-bold text-center">
                            ✓ Active
                        </div>
                    ` : charges > 0 ? `
                        <button onclick="goalManager.castSpell('${spell.id}')" 
                            class="w-full bg-${color}-700 hover:bg-${color}-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105">
                            Cast Spell
                        </button>
                    ` : `
                        <div class="bg-${color}-950 border-2 border-${color}-800 rounded-lg px-3 py-2 text-${color}-500 text-sm font-bold text-center">
                            Open chests for charges
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    addSpellToBook(spellId, charges = 1) {
        const existingSpell = this.spellbook.find(s => s.spellId === spellId);
        if (existingSpell) {
            existingSpell.charges += charges;
        } else {
            this.spellbook.push({ spellId, charges });
        }
        
        const spell = this.spellDefinitions[spellId];
        if (spell) {
            this.celebrateSpellUnlock(spell);
        }
        this.saveData();
        this.render();
    }

    castSpell(spellId) {
        // Prevent simultaneous spell casting
        if (this.isCastingSpell) {
            return;
        }
        this.isCastingSpell = true;

        const spell = this.spellDefinitions[spellId];
        if (!spell) {
            this.isCastingSpell = false;
            console.warn('Spell definition not found:', spellId);
            return;
        }
        
        // Premium gate for premium spells
        if (spell.premium && !this.isPremium) {
            this.isCastingSpell = false;
            this.showPremiumPurchaseModal();
            return;
        }

        const spellEntry = this.spellbook.find(s => s.spellId === spellId);
        if (!spellEntry || spellEntry.charges <= 0) {
            this.isCastingSpell = false;
            this.showAchievement('⚡ No charges remaining for this spell!', 'daily');
            return;
        }
        
        // Check if spell is already active
        if (this.activeSpells.some(s => s.spellId === spellId)) {
            this.isCastingSpell = false;
            this.showAchievement('✨ This spell is already active!', 'daily');
            return;
        }

        // Use a charge
        spellEntry.charges--;
        this.spellsCast++; // Track for titles

        // Apply spell effect
        if (spell.duration > 0) {
            this.activeSpells.push({
                spellId: spell.id,
                castedAt: Date.now(),
                expiresAt: Date.now() + spell.duration
            });
        } else if (spell.duration === -1) {
            // Spell stays active until triggered (like lucky_draw)
            this.activeSpells.push({
                spellId: spell.id,
                castedAt: Date.now(),
                expiresAt: -1 // Never expires naturally
            });
        }

        // Celebration animation
        this.celebrateSpellCast(spell);

        // Apply instant effects
        if (spell.effect === 'bulk_archive') {
            // Instant Archive - bulk archive all completed tasks
            const archivedCount = this.bulkArchiveCompleted();
            if (archivedCount > 0) {
                this.showAchievement(`📦 INSTANT ARCHIVE! ${archivedCount} completed tasks archived!`, 'weekly');
            } else {
                this.showAchievement('📦 No completed tasks to archive!', 'daily');
            }
        }

        this.saveData();
        this.render();

        // Release casting lock
        this.isCastingSpell = false;

        // Check for expired spells periodically
        setTimeout(() => this.checkExpiredSpells(), spell.duration);
    }

    checkExpiredSpells() {
        const now = Date.now();
        // Find expired spells (exclude -1 which means "until triggered")
        const expiredSpells = this.activeSpells.filter(s => s.expiresAt !== -1 && s.expiresAt <= now);
        
        if (expiredSpells.length > 0) {
            // Show expiration messages
            expiredSpells.forEach(expired => {
                const spell = this.spellDefinitions[expired.spellId];
                if (spell) {
                    this.showAchievement(`⏱️ ${spell.icon} ${spell.name} has expired`, 'daily');
                }
            });
            
            // Remove expired spells (keep -1 and future expiry)
            this.activeSpells = this.activeSpells.filter(s => s.expiresAt === -1 || s.expiresAt > now);
            this.saveData();
            this.renderSpellbook();
        }
    }

    getActiveSpellMultiplier(effectType) {
        let multiplier = 1;
        const now = Date.now();
        
        this.activeSpells.forEach(activeSpell => {
            // Check if spell is still active (not expired, or -1 means until triggered)
            if (activeSpell.expiresAt === -1 || activeSpell.expiresAt > now) {
                const spell = this.spellDefinitions[activeSpell.spellId];
                // Skip if spell no longer exists in definitions
                if (spell && spell.effect === effectType && spell.multiplier) {
                    multiplier *= spell.multiplier;
                }
            }
        });
        
        return multiplier;
    }

    // Celebration Animations
    getSpellElement(spell) {
        const effectMap = {
            xp_multiplier: 'arcane', xp_boost: 'arcane',
            gold_multiplier: 'gold', double_reward: 'gold',
            streak_protection: 'ice', pause_reset: 'ice',
            boss_double_damage: 'fire', boss_crit_chance: 'fire', boss_damage_boost: 'fire', boss_execute: 'fire',
            chest_boost: 'nature', bulk_archive: 'nature', focus_boost: 'nature'
        };
        return effectMap[spell.effect] || 'arcane';
    }

    celebrateSpellCast(spell) {
        this.playSpellSound();
        const element = this.getSpellElement(spell);
        
        // 1. Full-screen flash
        const flash = document.createElement('div');
        flash.className = `spell-cast-flash ${element}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 800);
        
        // 2. Outer magic circle with runes
        const outer = document.createElement('div');
        outer.className = `spell-circle-outer ${element}`;
        document.body.appendChild(outer);
        setTimeout(() => outer.remove(), 1500);
        
        // 3. Inner magic circle (counter-rotating)
        const inner = document.createElement('div');
        inner.className = `spell-circle-inner ${element}`;
        document.body.appendChild(inner);
        setTimeout(() => inner.remove(), 1500);
        
        // 4. Spell icon floating up from center
        const icon = document.createElement('div');
        icon.className = 'spell-cast-icon';
        icon.textContent = spell.icon;
        document.body.appendChild(icon);
        setTimeout(() => icon.remove(), 1500);
        
        // 5. Energy particles bursting outward
        const particleCount = 16;
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = `spell-particle ${element}`;
                const angle = (i / particleCount) * Math.PI * 2;
                const radius = 120 + Math.random() * 80;
                particle.style.left = '50%';
                particle.style.top = '50%';
                particle.style.setProperty('--start-x', '0px');
                particle.style.setProperty('--start-y', '0px');
                particle.style.setProperty('--end-x', `${Math.cos(angle) * radius}px`);
                particle.style.setProperty('--end-y', `${Math.sin(angle) * radius}px`);
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 1200);
            }, i * 30);
        }
        
        // 6. Spell name text
        setTimeout(() => {
            const nameEl = document.createElement('div');
            nameEl.className = `spell-cast-name ${element}`;
            nameEl.textContent = spell.name;
            document.body.appendChild(nameEl);
            setTimeout(() => nameEl.remove(), 2000);
        }, 200);
        
        // 7. Achievement toast (delayed so it doesn't overlap the animation)
        setTimeout(() => {
            this.showAchievement(`🔮 ${spell.name} cast!`, 'rare', false);
        }, 800);
    }

    celebrateSpellUnlock(spell) {
        this.createSparkles();
        this.showAchievement(`📖 New spell learned: ${spell.name}!`, 'epic');
    }

    createConfetti() {
        const colors = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti-particle';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.3 + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 30);
        }
    }

    createSparkles() {
        const sparkleCount = 20;
        
        for (let i = 0; i < sparkleCount; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle-particle';
                sparkle.textContent = '✨';
                sparkle.style.left = Math.random() * 100 + '%';
                sparkle.style.top = Math.random() * 100 + '%';
                sparkle.style.animationDelay = Math.random() * 0.3 + 's';
                document.body.appendChild(sparkle);
                
                setTimeout(() => sparkle.remove(), 600);
            }, i * 50);
        }
    }

    createMagicCircle() {
        const circle = document.createElement('div');
        circle.className = 'magic-circle-effect';
        circle.style.left = '50%';
        circle.style.top = '50%';
        circle.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(circle);
        
        setTimeout(() => circle.remove(), 1000);
    }

    createLevelUpBurst(level, title) {
        // 1. Full-screen golden flash
        const flash = document.createElement('div');
        flash.className = 'levelup-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1200);

        // 2. "LEVEL UP!" text
        const text = document.createElement('div');
        text.className = 'levelup-text';
        text.textContent = '⭐ LEVEL UP! ⭐';
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 2200);

        // 3. Big level number
        const num = document.createElement('div');
        num.className = 'levelup-number';
        num.textContent = level || this.level;
        document.body.appendChild(num);
        setTimeout(() => num.remove(), 2200);

        // 4. Title text below number
        if (title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'levelup-title';
            titleEl.textContent = title;
            document.body.appendChild(titleEl);
            setTimeout(() => titleEl.remove(), 2500);
        }

        // 5. Three expanding ring bursts
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.className = `levelup-ring ${i > 0 ? 'ring-' + (i + 1) : ''}`;
            document.body.appendChild(ring);
            setTimeout(() => ring.remove(), 1800);
        }

        // 6. Star particles radiating outward
        const starChars = ['⭐', '✦', '✧', '★'];
        const starCount = 12;
        for (let i = 0; i < starCount; i++) {
            setTimeout(() => {
                const star = document.createElement('div');
                star.className = 'levelup-star';
                star.textContent = starChars[i % starChars.length];
                const angle = (i / starCount) * Math.PI * 2;
                const radius = 130 + Math.random() * 80;
                star.style.left = '50%';
                star.style.top = '45%';
                star.style.setProperty('--star-start-x', '0px');
                star.style.setProperty('--star-start-y', '0px');
                star.style.setProperty('--star-end-x', `${Math.cos(angle) * radius}px`);
                star.style.setProperty('--star-end-y', `${Math.sin(angle) * radius}px`);
                document.body.appendChild(star);
                setTimeout(() => star.remove(), 1400);
            }, 100 + i * 40);
        }

        // 7. Light pillars on left and right
        const pillarLeft = document.createElement('div');
        pillarLeft.className = 'levelup-pillar left';
        document.body.appendChild(pillarLeft);
        setTimeout(() => pillarLeft.remove(), 2000);

        const pillarRight = document.createElement('div');
        pillarRight.className = 'levelup-pillar right';
        document.body.appendChild(pillarRight);
        setTimeout(() => pillarRight.remove(), 2000);

        // 8. Gold shimmer particles floating upward
        const shimmerCount = 24;
        for (let i = 0; i < shimmerCount; i++) {
            setTimeout(() => {
                const shimmer = document.createElement('div');
                shimmer.className = 'levelup-shimmer';
                const xPos = 20 + Math.random() * 60;
                shimmer.style.left = `${xPos}%`;
                shimmer.style.top = `${50 + Math.random() * 30}%`;
                shimmer.style.setProperty('--shimmer-x', `${(Math.random() - 0.5) * 40}px`);
                shimmer.style.setProperty('--shimmer-y', `${-80 - Math.random() * 120}px`);
                document.body.appendChild(shimmer);
                setTimeout(() => shimmer.remove(), 2000);
            }, i * 50);
        }

        // 9. Confetti burst (delayed to sync with the opening moment)
        setTimeout(() => this.createConfetti(), 300);
    }

    playSpellSound() {
        if (window.audioManager) {
            window.audioManager.playSpell();
        }
    }

    // Dark Mode & Theme System
    loadTheme() {
        const savedTheme = localStorage.getItem('questTheme');
        this.darkMode = savedTheme === 'dark';
        this.applyTheme();
        this.applyColorTheme();
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.saveData();
        
        // Update toggle button text
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.darkMode ? '☀️' : '🌙';
        }
    }

    applyTheme() {
        const body = document.body;
        if (this.darkMode) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    }

    // Color Theme System
    // Free themes: default, forest (2 free themes)
    // Premium themes: all others require premium
    themeDefinitions = {
        default: { name: 'Medieval Kingdom', icon: '🏰', color: '#b45309', unlockLevel: 0, premium: false },
        forest: { name: 'Forest Kingdom', icon: '🌲', color: '#047857', unlockLevel: 5, premium: false },
        desert: { name: 'Desert Oasis', icon: '🏜️', color: '#c2410c', unlockLevel: 10, premium: true },
        ice: { name: 'Ice Citadel', icon: '❄️', color: '#0369a1', unlockLevel: 15, premium: true },
        volcanic: { name: 'Volcanic Forge', icon: '🌋', color: '#dc2626', unlockLevel: 20, premium: true },
        mystic: { name: 'Mystic Realm', icon: '✨', color: '#7c3aed', unlockLevel: 25, premium: true },
        golden: { name: 'Golden Empire', icon: '👑', color: '#ca8a04', unlockLevel: 0, special: '100 completed', premium: true },
        shadow: { name: 'Shadow Realm', icon: '🌑', color: '#374151', unlockLevel: 0, special: '5 life goals', premium: true }
    };

    applyColorTheme() {
        const body = document.body;
        // Remove all theme classes
        Object.keys(this.themeDefinitions).forEach(themeId => {
            body.classList.remove(`theme-${themeId}`);
        });
        
        // Apply current theme if not default
        if (this.currentTheme && this.currentTheme !== 'default') {
            body.classList.add(`theme-${this.currentTheme}`);
        }
        
        // Update theme particles
        this.initThemeParticles();
        
        // Update theme video background
        this.updateThemeVideoBackground();
    }
    
    updateThemeVideoBackground() {
        const video = document.getElementById('theme-video-bg');
        if (!video) return;
        
        // Check if mobile device or Android WebView/TWA (Google Play app)
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isWebView = /(wv|WebView)/i.test(navigator.userAgent);
        const isTWA = document.referrer.includes('android-app://') || window.matchMedia('(display-mode: standalone)').matches;
        const isMobile = isAndroid || isWebView || isTWA 
                         || /webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                         || window.innerWidth <= 768;
        
        // Define which themes have video/gif backgrounds
        const videoBackgrounds = {
            forest: {
                gif: 'icons/forest-bg.gif'
            },
            desert: {
                gif: 'icons/desert-bg.gif'
            },
            ice: {
                gif: 'icons/ice-bg.gif'
            },
            volcanic: {
                video: 'icons/volcanic-bg.mp4',
                gif: 'icons/volcanic-bg.gif'
            },
            mystic: {
                gif: 'icons/mystic-bg.gif'
            },
            golden: {
                gif: 'icons/golden-bg.gif'
            },
            shadow: {
                gif: 'icons/shadow-bg.gif'
            }
        };
        
        const bgConfig = videoBackgrounds[this.currentTheme];
        
        if (bgConfig) {
            // Use video if available and on desktop, otherwise use GIF
            if (!isMobile && bgConfig.video) {
                // Use video for desktop when available
                document.body.classList.remove('has-theme-bg');
                document.body.style.removeProperty('--theme-bg-image');
                video.src = bgConfig.video;
                video.load();
                video.classList.remove('hidden');
                video.classList.add('active');
                video.play().catch(() => {});
            } else {
                // Use GIF for mobile OR when no video is available
                video.style.display = 'none';
                video.classList.add('hidden');
                video.classList.remove('active');
                video.pause();
                video.src = '';
                document.body.style.setProperty('--theme-bg-image', `url('${bgConfig.gif}')`);
                document.body.classList.add('has-theme-bg');
            }
        } else {
            // No background for this theme
            video.classList.add('hidden');
            video.classList.remove('active');
            video.pause();
            video.src = '';
            document.body.classList.remove('has-theme-bg');
            document.body.style.removeProperty('--theme-bg-image');
        }
    }
    
    initThemeParticles() {
        // Clear existing particle interval
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
        
        const container = document.getElementById('theme-particles');
        if (!container) return;
        
        // Clear existing particles
        container.innerHTML = '';
        
        // Get particle config based on theme
        const particleConfig = this.getParticleConfig();
        
        // Spawn particles at interval
        this.particleInterval = setInterval(() => {
            if (document.hidden) return; // Don't spawn when tab not visible
            this.spawnParticle(container, particleConfig);
        }, particleConfig.spawnRate);
        
        // Initial burst of particles
        for (let i = 0; i < particleConfig.initialCount; i++) {
            setTimeout(() => this.spawnParticle(container, particleConfig), i * 200);
        }
    }
    
    getParticleConfig() {
        const configs = {
            default: { class: 'particle-gif', gif: 'icons/coin.gif', duration: [8, 12], spawnRate: 3000, initialCount: 3, maxParticles: 15, size: 40 },
            forest: { class: 'particle-gif', gif: 'icons/leaf.gif', duration: [10, 15], spawnRate: 2000, initialCount: 5, maxParticles: 20, size: 35 },
            desert: { class: 'particle-sand', duration: [10, 15], spawnRate: 500, initialCount: 10, maxParticles: 40 },
            ice: { class: 'particle-gif', gif: 'icons/snow.gif', duration: [12, 18], spawnRate: 1000, initialCount: 8, maxParticles: 30, size: 30 },
            volcanic: { class: 'particle-ember', duration: [6, 10], spawnRate: 800, initialCount: 6, maxParticles: 25 },
            mystic: { class: 'particle-gif particle-gif-rise', gif: 'icons/shine.gif', duration: [8, 12], spawnRate: 1200, initialCount: 5, maxParticles: 20, size: 35 },
            golden: { class: 'particle-gold', duration: [8, 12], spawnRate: 1500, initialCount: 5, maxParticles: 20 },
            shadow: { class: 'particle-shadow', duration: [12, 16], spawnRate: 1500, initialCount: 5, maxParticles: 18 }
        };
        
        return configs[this.currentTheme] || configs.default;
    }
    
    spawnParticle(container, config) {
        // Limit max particles for performance
        if (container.children.length >= config.maxParticles) return;
        
        let particle;
        
        // Check if this is a GIF-based particle
        if (config.gif) {
            particle = document.createElement('img');
            particle.src = config.gif;
            particle.className = 'theme-particle particle-gif';
            particle.style.width = `${config.size || 30}px`;
            particle.style.height = 'auto';
        } else {
            particle = document.createElement('div');
            particle.className = `theme-particle ${config.class}`;
        }
        
        // Random horizontal position
        particle.style.left = `${Math.random() * 100}%`;
        
        // Set starting vertical position based on animation direction
        const risingParticles = ['particle-ember', 'particle-magic', 'particle-shadow', 'particle-gif-rise'];
        const isRising = risingParticles.some(p => config.class.includes(p));
        if (isRising) {
            particle.style.bottom = '0';
        } else {
            particle.style.top = '0';
        }
        
        // Random duration within range
        const duration = config.duration[0] + Math.random() * (config.duration[1] - config.duration[0]);
        particle.style.animationDuration = `${duration}s`;
        
        container.appendChild(particle);
        
        // Remove after animation completes
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, (duration + 2) * 1000);
    }

    selectTheme(themeId) {
        const theme = this.themeDefinitions[themeId];
        
        // Check premium requirement first
        if (theme && theme.premium && !this.isPremium) {
            this.showPremiumPurchaseModal();
            return;
        }
        
        if (!this.unlockedThemes.includes(themeId)) {
            // Show a toast notification instead of achievement
            this.showLockedNotification('Theme locked! Keep leveling up to unlock.');
            return;
        }
        
        // Play theme transition animation
        this.playThemeTransition(theme.color, () => {
            this.currentTheme = themeId;
            this.applyColorTheme();
            this.saveData();
            this.renderThemeSelector();
            this.renderThemes();
        });
        
        if (theme) {
            this.showAchievement(`🎨 ${theme.name} theme activated!`, 'daily');
        }
    }
    
    playThemeTransition(color, callback) {
        const overlay = document.getElementById('theme-transition-overlay');
        if (!overlay) {
            callback();
            return;
        }
        
        // Create ripple effect from center
        const ripple = document.createElement('div');
        ripple.className = 'theme-ripple';
        ripple.style.cssText = `
            top: 50%;
            left: 50%;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, ${color}dd, ${color}44);
            transform: translate(-50%, -50%);
        `;
        overlay.appendChild(ripple);
        
        // Create particle burst
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'theme-particle';
            const angle = (i / 12) * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            particle.style.cssText = `
                top: 50%;
                left: 50%;
                background: ${color};
                --tx: ${tx}px;
                --ty: ${ty}px;
                animation-delay: ${i * 0.03}s;
            `;
            overlay.appendChild(particle);
        }
        
        // Flash overlay
        overlay.style.background = `radial-gradient(circle at center, ${color}33, transparent)`;
        overlay.classList.add('active', 'theme-flash');
        
        // Apply theme after brief delay
        setTimeout(() => {
            callback();
        }, 150);
        
        // Clean up after animation
        setTimeout(() => {
            overlay.classList.remove('active', 'theme-flash');
            overlay.innerHTML = '';
            overlay.style.background = '';
        }, 800);
    }

    renderThemeSelector() {
        const container = document.getElementById('theme-selector-container');
        if (!container) return;

        container.innerHTML = Object.entries(this.themeDefinitions).map(([id, theme]) => {
            const isUnlocked = this.unlockedThemes.includes(id);
            const isSelected = this.currentTheme === id;
            const isPremiumTheme = theme.premium && !this.isPremium;
            
            let lockReason = '';
            if (isPremiumTheme) {
                lockReason = '👑 Premium';
            } else if (!isUnlocked) {
                lockReason = theme.special ? theme.special : `Level ${theme.unlockLevel}`;
            }
            
            const isLocked = isPremiumTheme || !isUnlocked;

            return `
                <div onclick="goalManager.selectTheme('${id}')" 
                    class="theme-option p-3 rounded-lg text-center transition-all cursor-pointer ${isSelected ? 'selected ring-2 ring-yellow-400' : ''} ${isLocked ? 'opacity-70' : ''}"
                    style="background: linear-gradient(135deg, ${theme.color}, ${this.darkenColor(theme.color, 30)})"
                    title="${!isLocked ? 'Click to apply' : 'Locked: ' + lockReason}">
                    <div class="text-3xl mb-1">${theme.icon}</div>
                    <div class="text-xs font-bold text-white truncate">${theme.name}</div>
                    ${isLocked ? `<div class="text-xs text-white/70 mt-1">🔒 ${lockReason}</div>` : ''}
                    ${isSelected ? '<div class="text-xs text-yellow-300 mt-1">✓ Active</div>' : ''}
                </div>
            `;
        }).join('');
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    toggleStatsPanel() {
        this.statsPanelCollapsed = !this.statsPanelCollapsed;
        const panel = document.getElementById('stats-panel');
        const content = document.getElementById('stats-content');
        const icon = document.getElementById('stats-toggle-icon');
        
        if (this.statsPanelCollapsed) {
            // Collapsed state - slide out to the right (panel width + right margin)
            panel.style.transform = 'translateX(calc(100% + 1rem))';
            content.style.opacity = '0';
            icon.classList.remove('ri-arrow-right-s-line');
            icon.classList.add('ri-arrow-left-s-line');
        } else {
            // Expanded state - slide back in
            panel.style.transform = 'translateX(0)';
            content.style.opacity = '1';
            icon.classList.remove('ri-arrow-left-s-line');
            icon.classList.add('ri-arrow-right-s-line');
        }
        
        // Save state
        localStorage.setItem('statsPanelCollapsed', this.statsPanelCollapsed);
    }

    // Undo/Redo System
    recordAction(action, data) {
        // Remove any actions after current index (if we're in the middle of history)
        this.actionHistory = this.actionHistory.slice(0, this.historyIndex + 1);
        
        // Add new action
        this.actionHistory.push({
            action,
            data,
            timestamp: Date.now(),
            state: this.captureState()
        });
        
        // Keep only last 20 actions
        if (this.actionHistory.length > 20) {
            this.actionHistory.shift();
        } else {
            this.historyIndex++;
        }
    }

    captureState() {
        return {
            lifeGoals: JSON.parse(JSON.stringify(this.lifeGoals)),
            yearlyGoals: JSON.parse(JSON.stringify(this.yearlyGoals)),
            monthlyGoals: JSON.parse(JSON.stringify(this.monthlyGoals)),
            weeklyGoals: JSON.parse(JSON.stringify(this.weeklyGoals)),
            dailyTasks: JSON.parse(JSON.stringify(this.dailyTasks)),
            sideQuests: JSON.parse(JSON.stringify(this.sideQuests)),
            habits: JSON.parse(JSON.stringify(this.habits)),
            xp: this.xp,
            level: this.level
        };
    }

    restoreState(state) {
        this.lifeGoals = JSON.parse(JSON.stringify(state.lifeGoals));
        this.yearlyGoals = JSON.parse(JSON.stringify(state.yearlyGoals));
        this.monthlyGoals = JSON.parse(JSON.stringify(state.monthlyGoals));
        this.weeklyGoals = JSON.parse(JSON.stringify(state.weeklyGoals));
        this.dailyTasks = JSON.parse(JSON.stringify(state.dailyTasks));
        this.sideQuests = JSON.parse(JSON.stringify(state.sideQuests));
        this.habits = JSON.parse(JSON.stringify(state.habits));
        this.xp = state.xp;
        this.level = state.level;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.actionHistory[this.historyIndex].state);
            this.saveData();
            this.render();
            this.showAchievement('↩️ Undone!', 'daily');
        } else {
            this.showAchievement('📝 Nothing to undo!', 'daily');
        }
    }

    redo() {
        if (this.historyIndex < this.actionHistory.length - 1) {
            this.historyIndex++;
            this.restoreState(this.actionHistory[this.historyIndex].state);
            this.saveData();
            this.render();
            this.showAchievement('↪️ Redone!', 'daily');
        } else {
            this.showAchievement('📝 Nothing to redo!', 'daily');
        }
    }

    // Archive System
    archiveGoal(type, id) {
        let goal;
        switch(type) {
            case 'life':
                goal = this.lifeGoals.find(g => g.id === id);
                if (goal && confirm('Archive this life goal? You can restore it later.')) {
                    this.lifeGoals = this.lifeGoals.filter(g => g.id !== id);
                }
                break;
            case 'yearly':
                goal = this.yearlyGoals.find(g => g.id === id);
                if (goal && confirm('Archive this yearly goal?')) {
                    this.yearlyGoals = this.yearlyGoals.filter(g => g.id !== id);
                }
                break;
            case 'monthly':
                goal = this.monthlyGoals.find(g => g.id === id);
                if (goal && confirm('Archive this monthly goal?')) {
                    this.monthlyGoals = this.monthlyGoals.filter(g => g.id !== id);
                }
                break;
            case 'weekly':
                goal = this.weeklyGoals.find(g => g.id === id);
                if (goal && confirm('Archive this weekly goal?')) {
                    this.weeklyGoals = this.weeklyGoals.filter(g => g.id !== id);
                }
                break;
            case 'daily':
                goal = this.dailyTasks.find(t => t.id === id);
                if (goal && confirm('Archive this daily task?')) {
                    this.dailyTasks = this.dailyTasks.filter(t => t.id !== id);
                }
                break;
        }
        
        if (goal) {
            goal.archivedAt = new Date().toISOString();
            goal.type = type;
            this.archivedGoals.push(goal);
            this.recordAction('archive', {type, goal});
            this.saveData();
            this.render();
            this.showAchievement('📦 Archived!', 'daily');
        }
    }

    bulkArchiveCompleted() {
        let archivedCount = 0;
        const now = new Date().toISOString();
        
        // Archive completed daily tasks
        const completedDaily = this.dailyTasks.filter(t => t.completed);
        completedDaily.forEach(task => {
            task.archivedAt = now;
            task.type = 'daily';
            this.archivedGoals.push(task);
            archivedCount++;
        });
        this.dailyTasks = this.dailyTasks.filter(t => !t.completed);
        
        // Archive completed weekly goals
        const completedWeekly = this.weeklyGoals.filter(g => g.completed);
        completedWeekly.forEach(goal => {
            goal.archivedAt = now;
            goal.type = 'weekly';
            this.archivedGoals.push(goal);
            archivedCount++;
        });
        this.weeklyGoals = this.weeklyGoals.filter(g => !g.completed);
        
        // Archive completed monthly goals
        const completedMonthly = this.monthlyGoals.filter(g => g.completed);
        completedMonthly.forEach(goal => {
            goal.archivedAt = now;
            goal.type = 'monthly';
            this.archivedGoals.push(goal);
            archivedCount++;
        });
        this.monthlyGoals = this.monthlyGoals.filter(g => !g.completed);
        
        // Archive completed yearly goals
        const completedYearly = this.yearlyGoals.filter(g => g.completed);
        completedYearly.forEach(goal => {
            goal.archivedAt = now;
            goal.type = 'yearly';
            this.archivedGoals.push(goal);
            archivedCount++;
        });
        this.yearlyGoals = this.yearlyGoals.filter(g => !g.completed);
        
        // Archive completed life goals
        const completedLife = this.lifeGoals.filter(g => g.completed);
        completedLife.forEach(goal => {
            goal.archivedAt = now;
            goal.type = 'life';
            this.archivedGoals.push(goal);
            archivedCount++;
        });
        this.lifeGoals = this.lifeGoals.filter(g => !g.completed);
        
        return archivedCount;
    }

    restoreGoal(id) {
        const goal = this.archivedGoals.find(g => g.id === id);
        if (goal) {
            delete goal.archivedAt;
            const type = goal.type;
            delete goal.type;
            
            switch(type) {
                case 'life':
                    this.lifeGoals.push(goal);
                    break;
                case 'yearly':
                    this.yearlyGoals.push(goal);
                    break;
                case 'monthly':
                    this.monthlyGoals.push(goal);
                    break;
                case 'weekly':
                    this.weeklyGoals.push(goal);
                    break;
                case 'daily':
                    this.dailyTasks.push(goal);
                    break;
            }
            
            this.archivedGoals = this.archivedGoals.filter(g => g.id !== id);
            this.saveData();
            this.render();
            this.showAchievement('♻️ Restored!', 'daily');
        }
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in input fields (except search shortcuts)
            const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            
            // Escape to close modals
            if (e.key === 'Escape') {
                const inputModal = document.getElementById('input-modal');
                const selectModal = document.getElementById('select-modal');
                const multiselectModal = document.getElementById('multiselect-modal');
                const priorityModal = document.getElementById('priority-modal');
                const searchModal = document.getElementById('search-modal');
                const quickAddModal = document.getElementById('quick-add-modal');
                
                if (inputModal) {
                    e.preventDefault();
                    this.closeInputModal();
                    return;
                }
                
                if (selectModal) {
                    e.preventDefault();
                    this.closeSelectModal();
                    return;
                }
                
                if (multiselectModal) {
                    e.preventDefault();
                    this.closeMultiSelectModal();
                    return;
                }
                
                if (priorityModal) {
                    e.preventDefault();
                    this.closePriorityModal();
                    return;
                }
                
                if (searchModal && !searchModal.classList.contains('hidden')) {
                    e.preventDefault();
                    this.closeSearch();
                    return;
                }
                
                if (quickAddModal && !quickAddModal.classList.contains('hidden')) {
                    e.preventDefault();
                    this.closeQuickAdd();
                    return;
                }
            }
            
            // Ctrl+K or / to open search
            if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !isInputField)) {
                e.preventDefault();
                this.openSearchModal();
                return;
            }
            
            // N key to open Quick Add
            if (e.key === 'n' && !isInputField) {
                e.preventDefault();
                this.openQuickAdd();
                return;
            }
            
            // Skip other shortcuts if in input field
            if (isInputField) return;
            
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl+Shift+Z or Ctrl+Y for redo
            if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                this.redo();
            }
            
            // Ctrl+N for new task
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.addDailyTask();
            }
            
            // Ctrl+H for new habit
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.addHabit();
            }
            
            // Ctrl+/ for search (legacy)
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                this.switchView('tools');
                setTimeout(() => {
                    document.getElementById('global-search')?.focus();
                }, 100);
            }
        });
    }

    // Timezone Management
    updateTimezone(value) {
        this.timezone = value;
        
        if (value === 'auto') {
            // Auto-detect timezone offset
            this.timezoneOffset = -new Date().getTimezoneOffset() / 60;
        } else {
            this.timezoneOffset = parseFloat(value);
        }
        
        this.saveData();
        this.updateTimezoneDisplay();
        this.render(); // Re-render to update any date displays
        this.showAchievement(`⏰ Timezone updated!`, 'daily');
    }

    updateTimezoneDisplay() {
        const select = document.getElementById('timezone-select');
        const info = document.getElementById('timezone-info');
        
        if (select) {
            select.value = this.timezone;
        }
        
        if (info) {
            if (this.timezone === 'auto') {
                const offset = -new Date().getTimezoneOffset() / 60;
                const sign = offset >= 0 ? '+' : '';
                info.textContent = `Current: Auto-detected (UTC${sign}${offset.toFixed(offset % 1 === 0 ? 0 : 1)}:00)`;
            } else {
                const sign = this.timezoneOffset >= 0 ? '+' : '';
                info.textContent = `Current: UTC${sign}${this.timezoneOffset.toFixed(this.timezoneOffset % 1 === 0 ? 0 : 1)}:00`;
            }
        }
    }

    getTimezoneOffset() {
        return this.timezone === 'auto' ? -new Date().getTimezoneOffset() / 60 : this.timezoneOffset;
    }

    getTodayDateString() {
        // Get current date in the selected timezone
        const now = new Date();
        const offset = this.getTimezoneOffset();
        
        // Get UTC time in milliseconds and add timezone offset
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const timezoneTime = new Date(utcTime + (offset * 3600000));
        
        const year = timezoneTime.getFullYear();
        const month = String(timezoneTime.getMonth() + 1).padStart(2, '0');
        const day = String(timezoneTime.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    // Motivational Quotes
    getMotivationalQuote() {
        const quotes = [
            { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
            { text: "Victory awaits those who persist through adversity.", author: "Ancient Proverb" },
            { text: "Every quest completed brings you closer to mastery.", author: "Guild Master" },
            { text: "The brave warrior prepares today for tomorrow's battles.", author: "Knight's Creed" },
            { text: "Small daily victories forge legendary heroes.", author: "Chronicle of Champions" },
            { text: "Your greatest adventure is becoming who you're meant to be.", author: "Oracle's Wisdom" },
            { text: "Discipline is the bridge between goals and accomplishment.", author: "Master's Teaching" },
            { text: "The castle of success is built one stone at a time.", author: "Builder's Maxim" },
            { text: "Champions are made in the daily training, not the tournament.", author: "Arena Master" },
            { text: "A goal without a plan is just a wish. Start your quest!", author: "Quest Giver" },
            { text: "The best time to start was yesterday. The next best time is now.", author: "Time Keeper" },
            { text: "Your only limit is the one you set for yourself.", author: "Sage Advice" },
            { text: "Greatness is not given. It is earned, one quest at a time.", author: "Hall of Heroes" },
            { text: "Fall seven times, stand up eight.", author: "Warrior Code" },
            { text: "The harder the battle, the sweeter the victory.", author: "Campaign General" }
        ];
        
        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    // Drag and Drop System
    handleDragStart(type, id, event) {
        this.draggedType = type;
        this.draggedItem = id;
        event.target.style.opacity = '0.4';
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.innerHTML);
    }

    handleDragEnd(event) {
        event.target.style.opacity = '1';
        // Remove all drop zone highlights
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    handleDragOver(event) {
        if (event.preventDefault) {
            event.preventDefault();
        }
        event.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(event) {
        const target = event.target.closest('.draggable-item');
        if (target) {
            target.classList.add('drag-over');
        }
    }

    handleDragLeave(event) {
        const target = event.target.closest('.draggable-item');
        if (target) {
            target.classList.remove('drag-over');
        }
    }

    handleDrop(type, targetId, event) {
        if (event.stopPropagation) {
            event.stopPropagation();
        }

        event.target.closest('.draggable-item')?.classList.remove('drag-over');

        if (this.draggedType === type && this.draggedItem !== targetId) {
            this.reorderItems(type, this.draggedItem, targetId);
        }

        return false;
    }

    reorderItems(type, draggedId, targetId) {
        let array;
        
        switch(type) {
            case 'life':
                array = this.lifeGoals;
                break;
            case 'yearly':
                array = this.yearlyGoals;
                break;
            case 'monthly':
                array = this.monthlyGoals;
                break;
            case 'weekly':
                array = this.weeklyGoals;
                break;
            case 'daily':
                array = this.dailyTasks;
                break;
            case 'side':
                array = this.sideQuests;
                break;
            case 'habit':
                array = this.habits;
                break;
            default:
                return;
        }

        const draggedIndex = array.findIndex(item => item.id === draggedId);
        const targetIndex = array.findIndex(item => item.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove dragged item
            const [draggedItem] = array.splice(draggedIndex, 1);
            // Insert at target position
            array.splice(targetIndex, 0, draggedItem);
            
            this.recordAction('reorder', {type, draggedId, targetId});
            this.saveData();
            this.render();
            this.showAchievement('📋 Reordered!', 'daily');
        }
    }

    handleCalendarDrop(date, event) {
        if (event.stopPropagation) {
            event.stopPropagation();
        }

        event.target.classList.remove('drag-over');

        // Only allow dropping daily tasks on calendar
        if (this.draggedType === 'daily' && this.draggedItem) {
            const task = this.dailyTasks.find(t => t.id === this.draggedItem);
            if (task) {
                task.dueDate = date;
                this.recordAction('reschedule', {taskId: this.draggedItem, newDate: date});
                this.saveData();
                this.render();
                this.showAchievement('📅 Rescheduled!', 'daily');
            }
        }

        return false;
    }

    renderDashboard() {
        document.getElementById('life-goals-count').textContent = this.lifeGoals.length;
        document.getElementById('monthly-goals-count').textContent = this.monthlyGoals.filter(g => !g.completed).length;
        document.getElementById('weekly-goals-count').textContent = this.weeklyGoals.filter(g => !g.completed).length;
        
        // Only count today's completed tasks
        const todaysTasks = this.dailyTasks.filter(task => this.isToday(task.dueDate));
        const completedToday = todaysTasks.filter(t => t.completed).length;
        document.getElementById('daily-completed-count').textContent = completedToday;

        // Show currently equipped title in dashboard header
        const titleBanner = document.getElementById('current-title-banner');
        const titleTextEl = document.getElementById('current-title-text');
        if (titleBanner && titleTextEl) {
            if (this.currentTitle) {
                // Support both object-based and legacy string-based unlockedTitles
                let titleObj = null;
                if (Array.isArray(this.unlockedTitles)) {
                    titleObj = this.unlockedTitles.find(t =>
                        (t && typeof t === 'object' && t.id === this.currentTitle) ||
                        t === this.currentTitle
                    );
                }

                const titleName = titleObj && titleObj.name ? titleObj.name : this.currentTitle;

                titleTextEl.textContent = titleName;
                titleBanner.classList.remove('hidden');
            } else {
                titleBanner.classList.add('hidden');
                titleTextEl.textContent = '';
            }
        }

        // Show motivational quote
        const quote = this.getMotivationalQuote();
        const quoteEl = document.getElementById('motivational-quote');
        const authorEl = document.getElementById('quote-author');
        if (quoteEl && authorEl) {
            quoteEl.textContent = `"${quote.text}"`;
            authorEl.textContent = `- ${quote.author}`;
        }

        // Render today's tasks in dashboard
        const todayTasksList = document.getElementById('today-tasks-list');
        
        if (todaysTasks.length === 0) {
            todayTasksList.innerHTML = `
                <div class="text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">🗡️</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Your Quest Awaits</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        No quests scheduled for today. Begin your adventure and conquer new challenges!
                    </p>
                    <button onclick="addDailyTask()" 
                        class="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-amber-400">
                        <i class="ri-sword-line mr-2"></i>Add Today's Quest
                    </button>
                </div>
            `;
        } else {
            todayTasksList.innerHTML = todaysTasks.map(task => `
                <div class="flex items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all border-2 border-amber-300 task-item">
                    <input 
                        type="checkbox" 
                        ${task.completed ? 'checked' : ''} 
                        onchange="goalManager.toggleTask(${task.id}, event)">
                    <span class="ml-4 flex-1 fancy-font font-semibold text-lg ${task.completed ? 'line-through text-amber-700 opacity-60' : 'text-amber-900'}">${task.title}</span>
                    <button onclick="goalManager.deleteGoal('daily', ${task.id})" class="text-red-400 hover:text-red-200 text-xl">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    renderLifeGoals() {
        const container = document.getElementById('life-goals-container');
        if (this.lifeGoals.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">🏰</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Your Kingdom Awaits</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        Every great adventure begins with a dream. What legacy will you build?
                    </p>
                    <button onclick="goalManager.addLifeGoal()" 
                        class="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-red-400">
                        <i class="ri-add-line mr-2"></i>Create Your First Life Goal
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = this.lifeGoals.map(goal => {
                const linkedYearly = this.yearlyGoals.filter(y => {
                    // Support both legacy single parent (lifeGoalId) and new multi-parent (lifeGoalIds)
                    const ids = y.lifeGoalIds || (y.lifeGoalId ? [y.lifeGoalId] : []);
                    return ids.includes(goal.id);
                });
                const progress = linkedYearly.length > 0 ? goal.progress || 0 : 0;
                return `
                <div class="quest-card bg-gradient-to-br from-red-900 to-red-950 p-5 rounded-xl shadow-2xl border-4 border-red-700 goal-item">
                    <div class="flex items-start space-x-4">
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleLifeGoal(${goal.id}, event)"
                            class="mt-1">
                        <div class="flex-1">
                            <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-2 ${goal.completed ? 'line-through opacity-60' : ''}">${goal.title}</h3>
                            ${goal.description ? `<p class="text-sm text-red-200/80 mb-2 fancy-font">${goal.description}</p>` : ''}
                            <p class="text-sm text-red-200 mb-3 fancy-font">Created: ${new Date(goal.created).toLocaleDateString()}</p>
                            
                            ${linkedYearly.length > 0 ? `
                                <div class="w-full bg-red-950/60 rounded-full h-4 mt-3 border border-red-700">
                                    <div class="bg-gradient-to-r from-red-500 to-red-400 h-4 rounded-full shadow-lg transition-all duration-500" style="width: ${progress}%"></div>
                                </div>
                                <p class="text-xs text-red-200 mt-2 fancy-font">${progress}% complete (${linkedYearly.filter(y => y.completed).length}/${linkedYearly.length} yearly campaigns)</p>
                                
                                <div class="mt-3 pl-4 border-l-2 border-red-600/40 space-y-2">
                                    <p class="text-xs text-red-300 font-semibold mb-2">🏆 Linked Yearly Campaigns:</p>
                                    ${linkedYearly.map(yearly => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${yearly.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleYearlyGoal(${yearly.id}, event)"
                                                class="mr-2">
                                            <span class="${yearly.completed ? 'line-through text-red-400 opacity-60' : 'text-red-100'}">${yearly.title} (${yearly.progress}%)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="flex items-center space-x-2 mt-2">
                                    <span class="text-xs bg-red-800/50 text-red-200 px-3 py-1 rounded-full border border-red-600 fancy-font">
                                        ⚡ Legendary Quest
                                    </span>
                                </div>
                            `}
                            
                            <button onclick="goalManager.addYearlyGoal(${goal.id})" 
                                class="mt-3 text-xs bg-red-800/50 hover:bg-red-700/60 text-red-200 px-3 py-1 rounded border border-red-600 fancy-font">
                                + Add Yearly Campaign
                            </button>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button onclick="goalManager.editGoal('life', ${goal.id})" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit life goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button onclick="goalManager.deleteGoal('life', ${goal.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete life goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }
    }

    renderYearlyGoals() {
        const container = document.getElementById('yearly-goals-container');
        if (this.yearlyGoals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">📜</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Write Your Legend</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        Great campaigns are written in scrolls. What will this year's chapter hold?
                    </p>
                    <button onclick="goalManager.addYearlyGoal()" 
                        class="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-purple-400">
                        <i class="ri-add-line mr-2"></i>Create Yearly Campaign
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = this.yearlyGoals.map(goal => {
                const linkedMonthly = this.monthlyGoals.filter(m => {
                    const ids = m.yearlyGoalIds || (m.yearlyGoalId ? [m.yearlyGoalId] : []);
                    return ids.includes(goal.id);
                });
                const parentNames = this.getParentNames(goal, 'lifeGoalIds', this.lifeGoals);
                const priority = goal.priority && ['low', 'medium', 'high'].includes(goal.priority) ? goal.priority : 'medium';
                const priorityBadge = priority === 'high'
                    ? '<span class="text-xs bg-red-700/50 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">🔥 High</span>'
                    : priority === 'low'
                        ? '<span class="text-xs bg-gray-700/50 text-gray-200 px-2 py-1 rounded border border-gray-600/40 fancy-font">🪶 Low</span>'
                        : '<span class="text-xs bg-yellow-700/50 text-yellow-200 px-2 py-1 rounded border border-yellow-600/40 fancy-font">⭐ Medium</span>';
                return `
                <div class="quest-card bg-gradient-to-br from-purple-900 to-purple-950 p-5 rounded-lg shadow-xl border-3 border-purple-700 goal-item">
                    <div class="flex items-start space-x-4">
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleYearlyGoal(${goal.id}, event)">
                        <div class="flex-1">
                            <h4 class="font-bold text-xl text-amber-300 medieval-title mb-2 ${goal.completed ? 'line-through opacity-60' : ''}">${goal.title}</h4>
                            ${goal.description ? `<p class="text-sm text-purple-200/80 mb-2 fancy-font">${goal.description}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-red-700/40 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">
                                            🎯 ${name}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <p class="text-xs text-purple-200 mt-1 fancy-font">Campaign Progress: ${goal.progress}% (${linkedMonthly.filter(m => m.completed).length}/${linkedMonthly.length} monthly raids)</p>
                            <div class="w-full bg-purple-950/60 rounded-full h-3 mt-2 border border-purple-700">
                                <div class="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full shadow-lg transition-all duration-500" style="width: ${goal.progress}%"></div>
                            </div>
                            
                            ${linkedMonthly.length > 0 ? `
                                <div class="mt-3 pl-4 border-l-2 border-purple-600/40 space-y-2">
                                    <p class="text-xs text-purple-300 font-semibold mb-2">👑 Linked Monthly Raids:</p>
                                    ${linkedMonthly.map(monthly => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${monthly.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleMonthlyGoal(${monthly.id}, event)"
                                                class="mr-2">
                                            <span class="${monthly.completed ? 'line-through text-purple-400 opacity-60' : 'text-purple-100'}">${monthly.title} (${monthly.progress}%)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="flex gap-2 mt-3">
                                <button onclick="goalManager.addMonthlyGoal(${goal.id})" 
                                    class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-3 py-1 rounded border border-purple-600 fancy-font">
                                    + Add Monthly Raid
                                </button>
                                <button onclick="goalManager.manageParentConnections('yearly', ${goal.id})" 
                                    class="text-xs bg-red-800/50 hover:bg-red-700/60 text-red-200 px-3 py-1 rounded border border-red-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button onclick="goalManager.editGoal('yearly', ${goal.id})" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit yearly goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button onclick="goalManager.deleteGoal('yearly', ${goal.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete yearly goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }
    }

    renderMonthlyGoals() {
        const container = document.getElementById('monthly-goals-container');
        
        // Get tasks scheduled for this month (not linked to a monthly goal)
        const thisMonthsTasks = this.dailyTasks.filter(task => 
            this.isThisMonth(task.dueDate) && !task.weeklyGoalId
        );
        
        if (this.monthlyGoals.length === 0 && thisMonthsTasks.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">📖</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Open Your Tome</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        Each month is a new chapter in your tome. What raids will you record?
                    </p>
                    <button onclick="goalManager.addMonthlyGoal()" 
                        class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-blue-400">
                        <i class="ri-add-line mr-2"></i>Create Monthly Raid
                    </button>
                </div>
            `;
        } else {
            let html = '';
            
            // Show scheduled tasks for this month
            if (thisMonthsTasks.length > 0) {
                const weekGroups = {};
                thisMonthsTasks.forEach(task => {
                    // Parse date as local time to avoid timezone issues
                    const [year, month, day] = task.dueDate.split('-').map(Number);
                    const taskDate = new Date(year, month - 1, day);
                    const startOfWeek = new Date(taskDate);
                    startOfWeek.setDate(taskDate.getDate() - taskDate.getDay());
                    const weekKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
                    
                    if (!weekGroups[weekKey]) {
                        weekGroups[weekKey] = [];
                    }
                    weekGroups[weekKey].push(task);
                });
                
                html += `
                <div class="col-span-2 quest-card bg-gradient-to-br from-blue-900 to-blue-950 p-5 rounded-xl shadow-xl border-3 border-blue-700 goal-item mb-4">
                    <h4 class="font-bold text-xl text-amber-300 medieval-title mb-3">📅 This Month's Scheduled Tasks</h4>
                    <p class="text-xs text-blue-200 mb-3 fancy-font">${thisMonthsTasks.filter(t => t.completed).length}/${thisMonthsTasks.length} tasks complete</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Object.keys(weekGroups).sort().map(weekKey => {
                            const weekTasks = weekGroups[weekKey];
                            const [wy, wm, wd] = weekKey.split('-').map(Number);
                            const weekStart = new Date(wy, wm - 1, wd);
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `
                            <div class="bg-blue-950/40 p-3 rounded-lg border border-blue-700/30">
                                <p class="text-sm text-blue-300 font-semibold mb-2">${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} Week</p>
                                <div class="space-y-1">
                                    ${weekTasks.map(task => {
                                        const [ty, tm, td] = task.dueDate.split('-').map(Number);
                                        const taskDate = new Date(ty, tm - 1, td);
                                        const todayDate = new Date(this.getTodayDateString());
                                        const isOverdue = taskDate < todayDate && !this.isToday(task.dueDate) && !task.completed;
                                        return `
                                        <div class="flex items-center text-xs ${isOverdue ? 'bg-red-900/20 p-1 rounded' : ''}">
                                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleTask(${task.id}, event)"
                                                class="mr-2">
                                            <span class="${task.completed ? 'line-through text-blue-400 opacity-60' : isOverdue ? 'text-red-300' : 'text-blue-100'}">${task.title}</span>
                                        </div>
                                    `;}).join('')}
                                </div>
                            </div>
                        `;}).join('')}
                    </div>
                </div>
                `;
            }
            
            // Show monthly goals
            html += this.monthlyGoals.map(goal => {
                const linkedWeekly = this.weeklyGoals.filter(w => {
                    const ids = w.monthlyGoalIds || (w.monthlyGoalId ? [w.monthlyGoalId] : []);
                    return ids.includes(goal.id);
                });
                const parentNames = this.getParentNames(goal, 'yearlyGoalIds', this.yearlyGoals);
                const isSelected = this.selectedItems.has(`monthly-${goal.id}`);
                const priority = goal.priority && ['low', 'medium', 'high'].includes(goal.priority) ? goal.priority : 'medium';
                const priorityBadge = priority === 'high'
                    ? '<span class="text-xs bg-red-700/50 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">🔥 High</span>'
                    : priority === 'low'
                        ? '<span class="text-xs bg-gray-700/50 text-gray-200 px-2 py-1 rounded border border-gray-600/40 fancy-font">🪶 Low</span>'
                        : '<span class="text-xs bg-yellow-700/50 text-yellow-200 px-2 py-1 rounded border border-yellow-600/40 fancy-font">⭐ Medium</span>';
                return `
                <div class="quest-card bg-gradient-to-br from-blue-900 to-blue-950 p-5 rounded-xl shadow-xl border-3 border-blue-700 goal-item ${isSelected ? 'ring-4 ring-purple-500' : ''}">
                    <div class="flex items-start space-x-4">
                        ${this.bulkSelectionMode ? `
                            <input 
                                type="checkbox" 
                                ${isSelected ? 'checked' : ''}
                                onchange="goalManager.toggleItemSelection(${goal.id}, 'monthly')"
                                class="mt-1 mr-2 w-5 h-5 cursor-pointer">
                        ` : ''}
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleMonthlyGoal(${goal.id}, event)">
                        <div class="flex-1">
                            <h4 class="font-bold text-xl text-amber-300 medieval-title mb-3 ${goal.completed ? 'line-through opacity-60' : ''}">${goal.title}</h4>
                            ${goal.description ? `<p class="text-sm text-blue-200/80 mb-2 fancy-font">${goal.description}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-purple-700/40 text-purple-200 px-2 py-1 rounded border border-purple-600/40 fancy-font">
                                            🎯 ${name}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="w-full bg-blue-950/60 rounded-full h-3 mt-3 border border-blue-700">
                                <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full shadow-lg transition-all duration-500" style="width: ${goal.progress}%"></div>
                            </div>
                            <p class="text-xs text-blue-200 mt-2 fancy-font">${goal.progress}% complete (${linkedWeekly.filter(w => w.completed).length}/${linkedWeekly.length} weekly goals)</p>
                            
                            ${linkedWeekly.length > 0 ? `
                                <div class="mt-3 pl-4 border-l-2 border-blue-600/40 space-y-2">
                                    <p class="text-xs text-blue-300 font-semibold mb-2">🛡️ Linked Weekly Goals:</p>
                                    ${linkedWeekly.map(weekly => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${weekly.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleWeeklyGoal(${weekly.id}, event)"
                                                class="mr-2">
                                            <span class="${weekly.completed ? 'line-through text-blue-400 opacity-60' : 'text-blue-100'}">${weekly.title} (${weekly.progress}%)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="flex gap-2 mt-3">
                                <button onclick="goalManager.addWeeklyGoal(${goal.id})" 
                                    class="text-xs bg-blue-800/50 hover:bg-blue-700/60 text-blue-200 px-3 py-1 rounded border border-blue-600 fancy-font">
                                    + Add Weekly Goal
                                </button>
                                <button onclick="goalManager.manageParentConnections('monthly', ${goal.id})" 
                                    class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-3 py-1 rounded border border-purple-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button onclick="goalManager.editGoal('monthly', ${goal.id})" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit monthly goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button onclick="goalManager.deleteGoal('monthly', ${goal.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete monthly goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
            
            container.innerHTML = html;
        }
    }

    renderWeeklyGoals() {
        const container = document.getElementById('weekly-goals-container');
        
        // Get tasks scheduled for this week (not linked to a weekly goal)
        const thisWeeksTasks = this.dailyTasks.filter(task => 
            this.isThisWeek(task.dueDate) && !task.weeklyGoalId
        );
        
        if (this.weeklyGoals.length === 0 && thisWeeksTasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">🛡️</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Plan Your Week</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        A hero always has a plan. What battles will you fight this week?
                    </p>
                    <button onclick="goalManager.addWeeklyGoal()" 
                        class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-green-400">
                        <i class="ri-add-line mr-2"></i>Create Weekly Goal
                    </button>
                </div>
            `;
        } else {
            let html = '';
            
            // Show scheduled tasks for this week
            if (thisWeeksTasks.length > 0) {
                html += `
                <div class="quest-card bg-gradient-to-br from-green-900 to-green-950 p-5 rounded-lg shadow-xl border-3 border-green-700 goal-item mb-4">
                    <div class="flex items-start space-x-4">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-amber-300 medieval-title mb-2">📅 This Week's Scheduled Tasks</h4>
                            <p class="text-xs text-green-200 mb-3 fancy-font">${thisWeeksTasks.filter(t => t.completed).length}/${thisWeeksTasks.length} tasks complete</p>
                            
                            <div class="mt-3 pl-4 border-l-2 border-green-600/40 space-y-2">
                                ${thisWeeksTasks.map(task => {
                                    // Parse date as local time to avoid timezone issues
                                    const [year, month, day] = task.dueDate.split('-').map(Number);
                                    const taskDate = new Date(year, month - 1, day);
                                    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][taskDate.getDay()];
                                    const todayDate = new Date(this.getTodayDateString());
                                    const isOverdue = taskDate < todayDate && !this.isToday(task.dueDate) && !task.completed;
                                    return `
                                    <div class="flex items-center text-sm ${isOverdue ? 'bg-red-900/20 p-2 rounded' : ''}">
                                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                            onchange="goalManager.toggleTask(${task.id}, event)"
                                            class="mr-2">
                                        <span class="text-xs text-green-300 mr-2 font-bold">${dayName}</span>
                                        <span class="${task.completed ? 'line-through text-green-400 opacity-60' : isOverdue ? 'text-red-300 font-semibold' : 'text-green-100'}">${task.title}</span>
                                        ${isOverdue ? '<span class="ml-2 text-xs text-red-400">⚠️ Overdue</span>' : ''}
                                    </div>
                                `;}).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }
            
            // Show weekly goals
            html += this.weeklyGoals.map(goal => {
                const linkedTasks = this.dailyTasks.filter(t => {
                    const ids = t.weeklyGoalIds || (t.weeklyGoalId ? [t.weeklyGoalId] : []);
                    return ids.includes(goal.id);
                });
                const parentNames = this.getParentNames(goal, 'monthlyGoalIds', this.monthlyGoals);
                const isSelected = this.selectedItems.has(`weekly-${goal.id}`);
                const priority = goal.priority && ['low', 'medium', 'high'].includes(goal.priority) ? goal.priority : 'medium';
                const priorityBadge = priority === 'high'
                    ? '<span class="text-xs bg-red-700/50 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">🔥 High</span>'
                    : priority === 'low'
                        ? '<span class="text-xs bg-gray-700/50 text-gray-200 px-2 py-1 rounded border border-gray-600/40 fancy-font">🪶 Low</span>'
                        : '<span class="text-xs bg-yellow-700/50 text-yellow-200 px-2 py-1 rounded border border-yellow-600/40 fancy-font">⭐ Medium</span>';
                return `
                <div class="quest-card bg-gradient-to-br from-green-900 to-green-950 p-5 rounded-lg shadow-xl border-3 border-green-700 goal-item mb-4 ${isSelected ? 'ring-4 ring-purple-500' : ''}">
                    <div class="flex items-start space-x-4">
                        ${this.bulkSelectionMode ? `
                            <input 
                                type="checkbox" 
                                ${isSelected ? 'checked' : ''}
                                onchange="goalManager.toggleItemSelection(${goal.id}, 'weekly')"
                                class="mt-1 mr-2 w-5 h-5 cursor-pointer">
                        ` : ''}
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleWeeklyGoal(${goal.id}, event)">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-amber-300 medieval-title mb-2 ${goal.completed ? 'line-through opacity-60' : ''}">${goal.title}</h4>
                            ${goal.description ? `<p class="text-sm text-green-200/80 mb-2 fancy-font">${goal.description}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-blue-700/40 text-blue-200 px-2 py-1 rounded border border-blue-600/40 fancy-font">
                                            🎯 ${name}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="w-full bg-green-950/60 rounded-full h-3 mt-2 border border-green-700">
                                <div class="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full shadow-lg transition-all duration-500" style="width: ${goal.progress}%"></div>
                            </div>
                            <p class="text-xs text-green-200 mt-1 fancy-font">${goal.progress}% complete (${linkedTasks.filter(t => t.completed).length}/${linkedTasks.length} tasks)</p>
                            
                            ${linkedTasks.length > 0 ? `
                                <div class="mt-3 pl-4 border-l-2 border-green-600/40 space-y-2">
                                    <p class="text-xs text-green-300 font-semibold mb-2">⚔️ Linked Daily Tasks:</p>
                                    ${linkedTasks.map(task => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleTask(${task.id}, event)"
                                                class="mr-2">
                                            <span class="${task.completed ? 'line-through text-green-400 opacity-60' : 'text-green-100'}">${task.title}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${this.renderChecklistHTML(goal, 'weekly')}
                            
                            <div class="flex gap-2 mt-3">
                                <button onclick="goalManager.addDailyTask(${goal.id})" 
                                    class="text-xs bg-green-800/50 hover:bg-green-700/60 text-green-200 px-3 py-1 rounded border border-green-600 fancy-font">
                                    + Add Daily Task
                                </button>
                                <button onclick="goalManager.manageParentConnections('weekly', ${goal.id})" 
                                    class="text-xs bg-blue-800/50 hover:bg-blue-700/60 text-blue-200 px-3 py-1 rounded border border-blue-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button onclick="goalManager.editGoal('weekly', ${goal.id})" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit weekly goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button onclick="goalManager.deleteGoal('weekly', ${goal.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete weekly goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
            
            container.innerHTML = html;
        }
    }

    renderDailyTasks() {
        const container = document.getElementById('daily-tasks-container');
        
        // Filter tasks for today only
        const todaysTasks = this.dailyTasks.filter(task => this.isToday(task.dueDate));
        
        if (todaysTasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">⚔️</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">Ready for Battle!</h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        Your battlefield is clear. What challenge will you conquer today?
                    </p>
                    <button onclick="addDailyTask()" 
                        class="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-amber-400">
                        <i class="ri-sword-line mr-2"></i>Add Today's Quest
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = todaysTasks.map(task => {
                const parentNames = this.getParentNames(task, 'weeklyGoalIds', this.weeklyGoals);
                const isSelected = this.selectedItems.has(`daily-${task.id}`);
                const priority = task.priority && ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';
                const priorityBadge = priority === 'high'
                    ? '<span class="text-xs bg-red-700/50 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">🔥 High</span>'
                    : priority === 'low'
                        ? '<span class="text-xs bg-gray-700/50 text-gray-200 px-2 py-1 rounded border border-gray-600/40 fancy-font">🪶 Low</span>'
                        : '<span class="text-xs bg-yellow-700/50 text-yellow-200 px-2 py-1 rounded border border-yellow-600/40 fancy-font">⭐ Medium</span>';
                return `
                <div class="quest-card bg-gradient-to-br from-amber-900 to-amber-950 p-5 rounded-lg shadow-xl border-3 border-amber-700 task-item mb-4 ${isSelected ? 'ring-4 ring-purple-500' : ''}"
                    draggable="true"
                    ondragstart="goalManager.handleDragStart('daily', ${task.id}, event)"
                    ondragend="goalManager.handleDragEnd(event)"
                    ondragover="goalManager.handleDragOver(event)"
                    ondragenter="goalManager.handleDragEnter(event)"
                    ondragleave="goalManager.handleDragLeave(event)"
                    ondrop="goalManager.handleDrop('daily', ${task.id}, event)">
                    <div class="flex items-start space-x-4">
                        ${this.bulkSelectionMode ? `
                            <input 
                                type="checkbox" 
                                ${isSelected ? 'checked' : ''}
                                onchange="goalManager.toggleItemSelection(${task.id}, 'daily')"
                                class="mt-1 mr-2 w-5 h-5 cursor-pointer">
                        ` : ''}
                        <input 
                            type="checkbox" 
                            ${task.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleTask(${task.id}, event)"
                            class="mt-1">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-amber-300 medieval-title mb-2 ${task.completed ? 'line-through opacity-60' : ''}">${task.title}</h4>
                            ${task.description ? `<p class="text-sm text-amber-200/80 mb-2 fancy-font">${task.description}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-green-700/40 text-green-200 px-2 py-1 rounded border border-green-600/40 fancy-font">
                                            🎯 ${name}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${this.renderChecklistHTML(task, 'daily')}
                            
                            <div class="flex gap-2 mt-3">
                                <button onclick="goalManager.manageParentConnections('daily', ${task.id})" 
                                    class="text-xs bg-green-800/50 hover:bg-green-700/60 text-green-200 px-3 py-1 rounded border border-green-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button onclick="goalManager.editGoal('daily', ${task.id})" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit daily task">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button onclick="goalManager.deleteGoal('daily', ${task.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete daily task">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }
    }

    renderSideQuests() {
        const container = document.getElementById('sidequests-container');
        if (!container) return;
        
        // Filter quests based on current filter
        let filteredQuests = this.sideQuests;
        if (this.sideQuestFilter !== 'all') {
            filteredQuests = this.sideQuests.filter(q => q.priority === this.sideQuestFilter);
        }
        
        if (filteredQuests.length === 0) {
            const isFiltered = this.sideQuestFilter !== 'all';
            container.innerHTML = `
                <div class="text-center py-16 px-8">
                    <div class="empty-state-icon text-8xl mb-6">🧭</div>
                    <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-3">
                        ${isFiltered ? 'No Matching Quests' : 'Discover Side Quests'}
                    </h3>
                    <p class="text-amber-200/80 fancy-font text-lg mb-6 max-w-md mx-auto">
                        ${isFiltered 
                            ? 'Try a different priority filter or create a new quest!' 
                            : 'Side quests are optional adventures. Track ideas, errands, or things you want to explore!'}
                    </p>
                    ${!isFiltered ? `
                        <button onclick="goalManager.addSideQuest()" 
                            class="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-cyan-400">
                            <i class="ri-compass-3-line mr-2"></i>Add Side Quest
                        </button>
                    ` : ''}
                </div>
            `;
        } else {
            // Group by priority for display
            const grouped = {
                high: filteredQuests.filter(q => q.priority === 'high'),
                medium: filteredQuests.filter(q => q.priority === 'medium'),
                low: filteredQuests.filter(q => q.priority === 'low')
            };
            
            let html = '';
            
            // Render high priority
            if (grouped.high.length > 0) {
                html += `
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-red-400 medieval-title mb-3 flex items-center">
                        <span class="text-2xl mr-2">⚡</span> High Priority Side Quests
                    </h3>
                    <div class="space-y-3">
                        ${grouped.high.map(quest => this.renderSideQuestCard(quest, 'red')).join('')}
                    </div>
                </div>
                `;
            }
            
            // Render medium priority
            if (grouped.medium.length > 0) {
                html += `
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-yellow-400 medieval-title mb-3 flex items-center">
                        <span class="text-2xl mr-2">⭐</span> Medium Priority Side Quests
                    </h3>
                    <div class="space-y-3">
                        ${grouped.medium.map(quest => this.renderSideQuestCard(quest, 'yellow')).join('')}
                    </div>
                </div>
                `;
            }
            
            // Render low priority
            if (grouped.low.length > 0) {
                html += `
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-cyan-400 medieval-title mb-3 flex items-center">
                        <span class="text-2xl mr-2">💫</span> Low Priority Side Quests
                    </h3>
                    <div class="space-y-3">
                        ${grouped.low.map(quest => this.renderSideQuestCard(quest, 'cyan')).join('')}
                    </div>
                </div>
                `;
            }
            
            container.innerHTML = html;
        }
    }

    // ==================== PREMIUM SYSTEM ====================
    
    unlockPremium() {
        this.isPremium = true;
        this.premiumPurchaseDate = new Date().toISOString();
        
        // Welcome gift: Unlock Mystic Realm theme
        if (!this.unlockedThemes.includes('mystic')) {
            this.unlockedThemes.push('mystic');
            setTimeout(() => {
                this.showAchievement('🎁 Bonus: Mystic Realm theme unlocked!', 'daily');
            }, 2000);
        }
        
        this.saveData();
        this.renderPremiumCard();
    }
    
    // Debug: Toggle premium status for testing
    togglePremium() {
        this.isPremium = !this.isPremium;
        if (this.isPremium) {
            this.premiumPurchaseDate = new Date().toISOString();
        }
        this.saveData();
        this.renderPremiumCard();
        this.renderThemes();
        this.renderThemeSelector();
        this.showAchievement(this.isPremium ? '👑 Premium ENABLED (test mode)' : '🔒 Premium DISABLED (test mode)', 'daily');
    }

    renderPremiumCard() {
        const container = document.getElementById('premium-content');
        if (!container) return;

        if (this.isPremium) {
            // Premium user view
            const purchaseDate = this.premiumPurchaseDate 
                ? new Date(this.premiumPurchaseDate).toLocaleDateString() 
                : 'Unknown';
            
            container.innerHTML = `
                <div class="text-center">
                    <div class="text-6xl mb-4">👑</div>
                    <h3 class="text-2xl font-bold text-yellow-200 medieval-title mb-2">Premium Adventurer</h3>
                    <p class="text-yellow-100 fancy-font mb-4">Thank you for your support!</p>
                    <div class="bg-black/20 rounded-lg p-4 mb-4">
                        <p class="text-yellow-200 text-sm fancy-font">Member since: ${purchaseDate}</p>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">🐉</div>
                            <div class="text-xs text-yellow-200">Boss Battles</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">🎨</div>
                            <div class="text-xs text-yellow-200">All Themes</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">🏆</div>
                            <div class="text-xs text-yellow-200">Achievements</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">📊</div>
                            <div class="text-xs text-yellow-200">Stats</div>
                        </div>
                    </div>
                    
                </div>
            `;
        } else {
            // Free user view - show upgrade prompt
            container.innerHTML = `
                <div class="flex flex-col md:flex-row gap-6 items-center">
                    <div class="flex-1">
                        <h3 class="text-2xl font-bold text-yellow-200 medieval-title mb-2 flex items-center">
                            <i class="ri-vip-crown-2-line mr-2"></i> Upgrade to Premium
                        </h3>
                        <p class="text-yellow-100 fancy-font mb-4 text-sm">Unlock the full power of your Life Quest Journal!</p>
                        
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">🐉</span> Boss Battles
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">🎨</span> 8+ Themes
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">🏆</span> Achievements
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">📖</span> Full Spellbook
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">✨</span> Enchantments
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">📊</span> Advanced Stats
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center">
                        <div class="text-5xl mb-2">👑</div>
                        <div class="text-3xl font-bold text-yellow-200 medieval-title mb-1">$4.99</div>
                        <div class="text-yellow-300 text-sm fancy-font mb-3">One-time purchase</div>
                        <button onclick="goalManager.showPremiumPurchaseModal()" 
                            class="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-8 py-3 rounded-lg font-bold shadow-lg transition-all hover:scale-105 border-2 border-yellow-400">
                            <i class="ri-vip-crown-2-fill mr-2"></i> Go Premium
                        </button>
                    </div>
                </div>
            `;
        }
    }

    showPremiumPurchaseModal() {
        const existingModal = document.getElementById('premium-purchase-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'premium-purchase-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center overflow-hidden';
        modal.style.cssText = 'padding: 16px;';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-yellow-800 to-amber-950 rounded-xl shadow-2xl border-4 border-yellow-500 overflow-hidden" style="width: 100%; max-width: min(500px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto;">
                <div class="bg-black/30 p-6 text-center border-b-2 border-yellow-600">
                    <div class="text-6xl mb-2">👑</div>
                    <h2 class="text-2xl font-bold text-yellow-200 medieval-title">Life Quest Journal Premium</h2>
                    <p class="text-yellow-300 fancy-font">Unlock your full potential</p>
                </div>
                
                <div class="p-6">
                    <div class="space-y-3 mb-6">
                        <div class="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                            <span class="text-2xl">🐉</span>
                            <div>
                                <div class="font-bold text-yellow-200">Boss Battles</div>
                                <div class="text-xs text-yellow-300/70">Fight weekly & monthly bosses by completing tasks</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                            <span class="text-2xl">🎨</span>
                            <div>
                                <div class="font-bold text-yellow-200">8+ Premium Themes</div>
                                <div class="text-xs text-yellow-300/70">Forest, Ocean, Royal Purple, Crimson & more</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                            <span class="text-2xl">🏆</span>
                            <div>
                                <div class="font-bold text-yellow-200">30+ Achievement Badges</div>
                                <div class="text-xs text-yellow-300/70">Unlock badges for your accomplishments</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                            <span class="text-2xl">📖</span>
                            <div>
                                <div class="font-bold text-yellow-200">Full Spellbook (15+ Spells)</div>
                                <div class="text-xs text-yellow-300/70">Powerful spells to boost your productivity</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                            <span class="text-2xl">✨</span>
                            <div>
                                <div class="font-bold text-yellow-200">Enchantments System</div>
                                <div class="text-xs text-yellow-300/70">Apply permanent buffs to your profile</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                            <span class="text-2xl">📊</span>
                            <div>
                                <div class="font-bold text-yellow-200">Advanced Statistics</div>
                                <div class="text-xs text-yellow-300/70">Detailed analytics and productivity insights</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mb-4">
                        <div class="text-4xl font-bold text-yellow-200 medieval-title">$4.99</div>
                        <div class="text-yellow-300 text-sm fancy-font">One-time purchase • Lifetime access</div>
                    </div>
                    
                    <button onclick="goalManager.initiatePremiumPurchase()" 
                        class="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-6 py-4 rounded-lg font-bold text-lg shadow-lg transition-all hover:scale-105 border-2 border-yellow-400 mb-3">
                        <i class="ri-shopping-cart-2-fill mr-2"></i> Purchase Premium
                    </button>
                    
                    <button onclick="this.closest('.fixed').remove()" 
                        class="w-full bg-transparent hover:bg-black/20 text-yellow-300 px-4 py-2 rounded-lg font-semibold transition-all fancy-font">
                        Maybe Later
                    </button>
                    
                    <p class="text-xs text-yellow-400/50 text-center mt-4 fancy-font">
                        Secure payment via Google Play
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Google Play Digital Goods API for in-app purchases
    async initiatePremiumPurchase() {
        // Check if Digital Goods API is available (TWA on Android)
        if ('getDigitalGoodsService' in window) {
            try {
                await this.purchaseWithDigitalGoods();
                return;
            } catch (error) {
                console.error('Digital Goods API error:', error);
                const msg = (error.message || '').toLowerCase();
                
                // User explicitly canceled - show brief message
                if (msg.includes('canceled') || msg.includes('cancelled') || error.name === 'AbortError') {
                    this.showAchievement('Purchase was canceled', 'daily');
                    return;
                }
                
                // Product not found in Play Store - show specific error
                if (msg.includes('not found') && msg.includes('sku')) {
                    this.showAchievement('❌ Product not available yet. Please try again later.', 'daily');
                    return;
                }
                
                // All other failures (unsupported context, service unavailable, 
                // billing not supported, etc.) - fall through to web fallback
                console.warn('Digital Goods not available, showing fallback. Reason:', error.message);
                this.showWebPurchaseFallback();
            }
        } else if (window.Android && window.Android.purchasePremium) {
            // Legacy Android bridge fallback
            window.Android.purchasePremium();
        } else {
            // Web fallback - show restore option for users who purchased on Android
            this.showWebPurchaseFallback();
        }
    }
    
    // Show web fallback for premium purchase
    showWebPurchaseFallback() {
        this.showSelectModal({
            title: 'Premium Purchase',
            icon: 'ri-shopping-cart-2-line',
            choices: [
                { value: 'retry', label: 'Try Again', icon: '🔁', description: 'Retry the purchase (reopen app if needed)' },
                { value: 'restore', label: 'Restore Purchase', icon: '🔄', description: 'Already purchased? Restore here' },
                { value: 'info', label: 'Need Help?', icon: '❓', description: 'Troubleshooting tips' }
            ]
        }, async (choice) => {
            if (choice === 'retry') {
                await this.initiatePremiumPurchase();
            } else if (choice === 'restore') {
                await this.restorePurchases();
            } else if (choice === 'info') {
                this.showAchievement('💡 Try closing and reopening the app, or check for app updates.', 'daily');
            }
        });
    }

    // Purchase using Digital Goods API (Google Play Billing)
    async purchaseWithDigitalGoods() {
        const PREMIUM_SKU = 'quest_journal_premium'; // Set this in Google Play Console
        
        
        // Get the Digital Goods service
        let service;
        try {
            service = await window.getDigitalGoodsService('https://play.google.com/billing');
        } catch (serviceError) {
            console.error('Failed to get Digital Goods service:', serviceError);
            throw new Error('Billing service unavailable: ' + serviceError.message);
        }
        
        if (!service) {
            throw new Error('Digital Goods service returned null - billing not supported');
        }
        
        // Get product details
        const details = await service.getDetails([PREMIUM_SKU]);
        
        if (!details || details.length === 0) {
            throw new Error('Product not found - check SKU: ' + PREMIUM_SKU);
        }
        
        const product = details[0];
        
        // Create payment request
        const paymentMethods = [{
            supportedMethods: 'https://play.google.com/billing',
            data: {
                sku: PREMIUM_SKU
            }
        }];
        
        const paymentDetails = {
            total: {
                label: product.title || 'Life Quest Journal Premium',
                amount: { currency: product.price.currency, value: product.price.value }
            }
        };
        
        const request = new PaymentRequest(paymentMethods, paymentDetails);
        
        // Show payment UI
        const response = await request.show();
        
        // Payment succeeded - extract purchase token
        // response.details may be a JSON string or an object depending on Chrome version
        let purchaseToken = null;
        try {
            const details = typeof response.details === 'string' 
                ? JSON.parse(response.details) 
                : response.details;
            purchaseToken = details.purchaseToken || details.token || null;
        } catch (parseError) {
            console.warn('Could not parse purchase details:', parseError);
        }
        
        // Unlock premium FIRST - payment already succeeded at this point
        this.onPremiumPurchaseSuccess(purchaseToken);
        
        // Acknowledge and complete - these can fail without affecting the user
        try {
            if (purchaseToken) {
                await service.acknowledge(purchaseToken, 'onetime');
            }
            await response.complete('success');
        } catch (ackError) {
            console.warn('Post-purchase acknowledge/complete error (premium still activated):', ackError);
            try { await response.complete('success'); } catch(e) { /* ignore */ }
        }
        
        return true;
    }

    // Restore previous purchases
    async restorePurchases() {
        this.showAchievement('🔄 Checking for previous purchases...', 'daily');
        
        if ('getDigitalGoodsService' in window) {
            try {
                const service = await window.getDigitalGoodsService('https://play.google.com/billing');
                const purchases = await service.listPurchases();
                
                const premiumPurchase = purchases.find(p => p.itemId === 'quest_journal_premium');
                if (premiumPurchase) {
                    this.onPremiumPurchaseSuccess(premiumPurchase.purchaseToken);
                    this.showAchievement('✅ Premium restored successfully!', 'weekly');
                } else {
                    this.showAchievement('❌ No previous purchase found', 'daily');
                }
            } catch (error) {
                console.error('Restore error:', error);
                this.showAchievement('❌ Could not restore purchases', 'daily');
            }
        } else {
            // Check localStorage for web purchases
            if (this.isPremium) {
                this.showAchievement('✅ Premium is already active!', 'weekly');
            } else {
                this.showAchievement('❌ No previous purchase found', 'daily');
            }
        }
    }

    // Called when purchase is successful
    onPremiumPurchaseSuccess(purchaseToken = null) {
        this.unlockPremium();
        if (purchaseToken) {
            this.premiumPurchaseToken = purchaseToken;
            this.saveData();
        }
        const modal = document.getElementById('premium-purchase-modal');
        if (modal) modal.remove();
        this.showAchievement('👑 Premium unlocked! Welcome to the inner circle!', 'weekly');
    }

    // Data Export/Import
    exportData() {
        try {
            const data = {
                lifeGoals: this.lifeGoals,
                yearlyGoals: this.yearlyGoals,
                monthlyGoals: this.monthlyGoals,
                weeklyGoals: this.weeklyGoals,
                dailyTasks: this.dailyTasks,
                sideQuests: this.sideQuests,
                habits: this.habits,
                recurringTasks: this.recurringTasks,
                xp: this.xp,
                level: this.level,
                badges: this.badges,
                archivedGoals: this.archivedGoals,
                goldCoins: this.goldCoins,
                unlockedThemes: this.unlockedThemes,
                currentTheme: this.currentTheme,
                unlockedTitles: this.unlockedTitles,
                currentTitle: this.currentTitle,
                treasureChests: this.treasureChests,
                companions: this.companions,
                activeCompanionId: this.activeCompanionId,
                spellbook: this.spellbook,
                activeSpells: this.activeSpells,
                activeQuestChains: this.activeQuestChains,
                completedQuestChains: this.completedQuestChains,
                focusCrystals: this.focusCrystals,
                totalFocusTime: this.totalFocusTime,
                activeEnchantments: this.activeEnchantments,
                timezone: this.timezone,
                timezoneOffset: this.timezoneOffset,
                tutorialCompleted: this.tutorialCompleted,
                isPremium: this.isPremium,
                premiumPurchaseDate: this.premiumPurchaseDate,
                premiumPurchaseToken: this.premiumPurchaseToken || null,
                lastLoginBonusDate: this.lastLoginBonusDate,
                loginStreak: this.loginStreak,
                chestsOpened: this.chestsOpened,
                bossesDefeated: this.bossesDefeated,
                focusSessionsCompleted: this.focusSessionsCompleted,
                spellsCast: this.spellsCast,
                exportDate: new Date().toISOString(),
                version: '3.0'
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `quest-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            this.showSuccessNotification('Your quest data has been exported successfully!');
            this.showAchievement('📦 Data Exported Successfully!', 'daily');
        } catch (error) {
            console.error('Export error:', error);
            this.showErrorNotification('Failed to export data. Please try again.');
        }
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.name.endsWith('.json')) {
            this.showErrorNotification('Please select a valid JSON backup file.');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate it's a Life Quest Journal backup
                if (!data.version && !data.lifeGoals && !data.dailyTasks) {
                    this.showErrorNotification('This doesn\'t appear to be a valid Life Quest Journal backup file.');
                    return;
                }
                
                if (confirm('This will replace all current data. Are you sure?\n\nTip: Export your current data first as a backup!')) {
                    // Backup current data before import
                    const currentData = localStorage.getItem('lifeOrganizeData');
                    if (currentData) {
                        localStorage.setItem('lifeOrganizeData_pre_import_backup', currentData);
                    }
                    
                    this.lifeGoals = data.lifeGoals || [];
                    this.yearlyGoals = data.yearlyGoals || [];
                    this.monthlyGoals = data.monthlyGoals || [];
                    this.weeklyGoals = data.weeklyGoals || [];
                    this.dailyTasks = data.dailyTasks || [];
                    this.sideQuests = data.sideQuests || [];
                    this.habits = data.habits || this.habits;
                    this.recurringTasks = data.recurringTasks || this.recurringTasks;
                    this.xp = data.xp || this.xp;
                    this.level = data.level || this.level;
                    this.badges = data.badges || this.badges;
                    this.archivedGoals = data.archivedGoals || this.archivedGoals;
                    this.goldCoins = data.goldCoins || this.goldCoins;
                    this.unlockedThemes = data.unlockedThemes || this.unlockedThemes;
                    this.currentTheme = data.currentTheme || this.currentTheme;
                    this.unlockedTitles = data.unlockedTitles || this.unlockedTitles;
                    this.currentTitle = data.currentTitle || this.currentTitle;
                    this.treasureChests = data.treasureChests || this.treasureChests;
                    this.companions = data.companions || this.companions;
                    this.activeCompanionId = data.activeCompanionId || this.activeCompanionId;
                    this.spellbook = data.spellbook || this.spellbook;
                    this.activeSpells = data.activeSpells || this.activeSpells;
                    this.activeQuestChains = data.activeQuestChains || this.activeQuestChains;
                    this.completedQuestChains = data.completedQuestChains || this.completedQuestChains;
                    this.focusCrystals = data.focusCrystals || this.focusCrystals;
                    this.totalFocusTime = data.totalFocusTime || this.totalFocusTime;
                    this.activeEnchantments = data.activeEnchantments || this.activeEnchantments;
                    this.timezone = data.timezone || this.timezone;
                    this.timezoneOffset = data.timezoneOffset || this.timezoneOffset;
                    this.tutorialCompleted = data.tutorialCompleted || this.tutorialCompleted;
                    this.isPremium = data.isPremium || this.isPremium;
                    this.premiumPurchaseDate = data.premiumPurchaseDate || this.premiumPurchaseDate;
                    this.premiumPurchaseToken = data.premiumPurchaseToken || this.premiumPurchaseToken;
                    this.lastLoginBonusDate = data.lastLoginBonusDate || this.lastLoginBonusDate;
                    this.loginStreak = data.loginStreak || this.loginStreak;
                    this.chestsOpened = data.chestsOpened || this.chestsOpened;
                    this.bossesDefeated = data.bossesDefeated || this.bossesDefeated;
                    this.focusSessionsCompleted = data.focusSessionsCompleted || this.focusSessionsCompleted;
                    this.spellsCast = data.spellsCast || this.spellsCast;
                    
                    this.saveData();
                    this.render();
                    this.showSuccessNotification('Your quest data has been restored successfully!');
                    this.showAchievement('📥 Data Imported Successfully!', 'weekly');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showErrorNotification('Failed to import data. The file may be corrupted or invalid.');
            }
        };
        
        reader.onerror = () => {
            this.showErrorNotification('Failed to read the file. Please try again.');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    deleteAllData() {
        // First confirmation
        if (!confirm('⚠️ DELETE ALL DATA\n\nThis will permanently erase ALL your quests, progress, levels, spells, companions, and settings.\n\nThis action CANNOT be undone.\n\nWould you like to export a backup first?')) {
            return;
        }

        // Offer to export first
        const wantsBackup = confirm('Would you like to export a backup before deleting?\n\nClick OK to export first, or Cancel to skip.');
        if (wantsBackup) {
            this.exportData();
        }

        // Final confirmation with typed check
        const confirmation = prompt('To confirm deletion, type DELETE below:');
        if (confirmation !== 'DELETE') {
            this.showAchievement('❌ Data deletion cancelled.', 'daily');
            return;
        }

        // Clear all app data from localStorage
        localStorage.removeItem('lifeOrganizeData');
        localStorage.removeItem('lifeOrganizeData_pre_import_backup');
        localStorage.removeItem('audioEnabled');
        localStorage.removeItem('audioVolume');

        // Reload the app fresh
        window.location.reload();
    }

    // Search functionality
    performSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '<p class="text-purple-200 text-sm fancy-font">Type at least 2 characters to search...</p>';
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const results = [];
        
        // Search life goals
        this.lifeGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchTerm) || (goal.description && goal.description.toLowerCase().includes(searchTerm))) {
                results.push({type: 'Life Goal', item: goal, icon: '🏰', color: 'red'});
            }
        });
        
        // Search yearly goals
        this.yearlyGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchTerm) || (goal.description && goal.description.toLowerCase().includes(searchTerm))) {
                results.push({type: 'Yearly Campaign', item: goal, icon: '📅', color: 'purple'});
            }
        });
        
        // Search monthly goals
        this.monthlyGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchTerm) || (goal.description && goal.description.toLowerCase().includes(searchTerm))) {
                results.push({type: 'Monthly Raid', item: goal, icon: '🗓️', color: 'blue'});
            }
        });
        
        // Search weekly goals
        this.weeklyGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchTerm) || (goal.description && goal.description.toLowerCase().includes(searchTerm))) {
                results.push({type: 'Weekly Battle', item: goal, icon: '⚔️', color: 'green'});
            }
        });
        
        // Search daily tasks
        this.dailyTasks.forEach(task => {
            if (task.title.toLowerCase().includes(searchTerm) || (task.description && task.description.toLowerCase().includes(searchTerm))) {
                results.push({type: 'Daily Task', item: task, icon: '⚔️', color: 'orange', dueDate: task.dueDate});
            }
        });
        
        // Search side quests
        this.sideQuests.forEach(quest => {
            if (quest.title.toLowerCase().includes(searchTerm) || (quest.description && quest.description.toLowerCase().includes(searchTerm))) {
                results.push({type: 'Side Quest', item: quest, icon: '🧭', color: 'cyan'});
            }
        });
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="text-purple-200 text-sm fancy-font">No quests found matching your search.</p>';
        } else {
            resultsContainer.innerHTML = `
                <p class="text-purple-200 text-sm fancy-font mb-3">Found ${results.length} result(s):</p>
                ${results.map(result => `
                    <div class="bg-purple-950/60 p-3 rounded-lg border-2 border-purple-700 hover:border-purple-500 transition-all">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-lg">${result.icon}</span>
                            <span class="text-xs text-purple-300 fancy-font font-semibold">${result.type}</span>
                            ${result.item.completed ? '<span class="text-xs text-green-400">✓ Completed</span>' : ''}
                        </div>
                        <p class="text-white font-semibold fancy-font ${result.item.completed ? 'line-through opacity-60' : ''}">${result.item.title}</p>
                        ${result.item.description ? `<p class="text-sm text-purple-200 italic mt-1">${result.item.description}</p>` : ''}
                        ${result.dueDate ? `<p class="text-xs text-purple-300 mt-1">Due: ${result.dueDate}</p>` : ''}
                    </div>
                `).join('')}
            `;
        }
    }

    renderSideQuestCard(quest, color) {
        const priorityIcons = {
            high: '⚡',
            medium: '⭐',
            low: '💫'
        };
        
        return `
            <div class="quest-card bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-lg shadow-xl border-3 border-${color}-700 hover:shadow-2xl transition-all draggable-item"
                draggable="true"
                ondragstart="goalManager.handleDragStart('side', ${quest.id}, event)"
                ondragend="goalManager.handleDragEnd(event)"
                ondragover="goalManager.handleDragOver(event)"
                ondragenter="goalManager.handleDragEnter(event)"
                ondragleave="goalManager.handleDragLeave(event)"
                ondrop="goalManager.handleDrop('side', ${quest.id}, event)">
                <div class="flex items-start space-x-4">
                    <i class="ri-draggable drag-handle text-${color}-400 mr-1"></i>
                    <input 
                        type="checkbox" 
                        ${quest.completed ? 'checked' : ''} 
                        onchange="goalManager.toggleSideQuest(${quest.id})">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">${priorityIcons[quest.priority]}</span>
                            <h4 class="font-bold text-lg text-amber-300 medieval-title ${quest.completed ? 'line-through opacity-60' : ''}">${quest.title}</h4>
                        </div>
                        ${quest.description ? `<p class="text-sm text-${color}-100 mb-2 fancy-font italic">${quest.description}</p>` : ''}
                        <div class="flex items-center gap-2 text-xs text-${color}-200">
                            <span class="bg-${color}-800/50 px-2 py-1 rounded fancy-font capitalize">${quest.priority} Priority</span>
                            <span class="fancy-font">Added: ${new Date(quest.created).toLocaleDateString()}</span>
                        </div>
                        ${this.renderChecklistHTML(quest, 'sidequest')}
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="goalManager.editGoal('side', ${quest.id})" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit side quest">
                            <i class="ri-edit-line" aria-hidden="true"></i>
                        </button>
                        <button onclick="goalManager.deleteGoal('side', ${quest.id})" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete side quest">
                            <i class="ri-delete-bin-line" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    updateProgress() {
        // Only count today's tasks for progress bar
        const todaysTasks = this.dailyTasks.filter(task => this.isToday(task.dueDate));
        const total = todaysTasks.length;
        const completed = todaysTasks.filter(t => t.completed).length;
        
        document.getElementById('completed-count').textContent = completed;
        document.getElementById('total-count').textContent = total;
        
        const progress = total > 0 ? (completed / total) * 100 : 0;
        document.getElementById('daily-progress').style.width = progress + '%';
    }

    // Date utility methods
    isToday(dateString) {
        return dateString === this.getTodayDateString();
    }

    isThisWeek(dateString) {
        const taskDate = new Date(dateString);
        const today = new Date();
        
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Get the end of the week (Saturday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return taskDate >= startOfWeek && taskDate <= endOfWeek;
    }

    isThisMonth(dateString) {
        const taskDate = new Date(dateString);
        const today = new Date();
        
        return taskDate.getMonth() === today.getMonth() && 
               taskDate.getFullYear() === today.getFullYear();
    }

    // Calendar Methods
    previousMonth() {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
        this.renderCalendar();
    }

    selectDate(dateString) {
        this.selectedDate = dateString;
        this.renderCalendarTasks(dateString);
        
        // Highlight selected date
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        const selectedDay = document.querySelector(`[data-date="${dateString}"]`);
        if (selectedDay) {
            selectedDay.classList.add('selected');
        }
    }

    renderCalendar() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        
        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'p-4';
            calendarDays.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const tasksForDay = this.dailyTasks.filter(t => t.dueDate === dateString);
            const completedTasks = tasksForDay.filter(t => t.completed).length;
            const totalTasks = tasksForDay.length;
            
            const isToday = dateString === this.getTodayDateString();
            
            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day p-3 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                isToday ? 'bg-amber-600 text-white font-bold border-2 border-amber-900' : 'bg-amber-200 hover:bg-amber-300'
            }`;
            dayElement.setAttribute('data-date', dateString);
            dayElement.onclick = () => this.selectDate(dateString);
            
            dayElement.innerHTML = `
                <div class="text-center">
                    <div class="text-lg font-bold ${isToday ? 'text-white' : 'text-amber-900'}">${day}</div>
                    ${totalTasks > 0 ? `
                        <div class="mt-1">
                            <div class="text-xs ${isToday ? 'text-amber-100' : 'text-amber-800'} font-semibold">
                                ${completedTasks}/${totalTasks} ⚔️
                            </div>
                            <div class="w-full bg-amber-900/30 rounded-full h-1 mt-1">
                                <div class="bg-green-500 h-1 rounded-full transition-all" style="width: ${totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            calendarDays.appendChild(dayElement);
        }
    }

    renderCalendarTasks(dateString) {
        // Parse date string as local time to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        document.getElementById('selected-date-title').textContent = 
            `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        const tasksForDay = this.dailyTasks.filter(t => t.dueDate === dateString);
        const container = document.getElementById('selected-date-tasks');
        
        if (tasksForDay.length === 0) {
            container.innerHTML = `
                <div class="text-amber-200 text-center py-8 fancy-font">
                    <p class="mb-4">No quests scheduled for this day</p>
                    <button onclick="goalManager.addDailyTask(null, '${dateString}')" 
                        class="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all">
                        <i class="ri-add-line mr-2"></i>Add Quest
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = tasksForDay.map(task => `
                <div class="quest-card bg-gradient-to-br from-amber-100 to-yellow-50 p-5 rounded-lg shadow-lg border-3 border-amber-600 task-item hover:shadow-xl transition-all">
                    <div class="flex items-center">
                        <input 
                            type="checkbox" 
                            ${task.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleTask(${task.id}, event)">
                        <span class="ml-4 flex-1 text-lg font-semibold fancy-font ${task.completed ? 'line-through text-amber-700 opacity-60' : 'text-amber-900'}">${task.title}</span>
                        <button onclick="goalManager.deleteGoal('daily', ${task.id})" class="text-red-400 hover:text-red-200 text-xl">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                    ${task.description ? `<p class="text-sm text-amber-800/80 mt-2 ml-8 fancy-font italic">${task.description}</p>` : ''}
                    ${task.checklist && task.checklist.length > 0 ? `
                        <div class="ml-8 mt-2 space-y-1">
                            ${task.checklist.map((item, i) => `
                                <div class="flex items-center gap-2 text-sm text-amber-800">
                                    <span>${item.completed ? '☑' : '☐'}</span>
                                    <span class="${item.completed ? 'line-through opacity-60' : ''}">${item.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('') + `
                <div class="text-center mt-4">
                    <button onclick="goalManager.addDailyTask(null, '${dateString}')" 
                        class="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all fancy-font">
                        <i class="ri-add-line mr-2"></i>Add Another Quest
                    </button>
                </div>
            `;
        }
    }

    // Period Summary System
    generatePeriodSummary(period) {
        // Use noon to avoid timezone edge cases when parsing date string
        const today = new Date(this.getTodayDateString() + 'T12:00:00');
        let startDate, endDate, periodName;
        
        if (period === 'week') {
            // Get current week (Monday to Sunday)
            const dayOfWeek = today.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
            startDate = new Date(today);
            startDate.setDate(today.getDate() - daysFromMonday);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            periodName = 'This Week';
        } else if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            periodName = monthNames[today.getMonth()] + ' ' + today.getFullYear();
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            periodName = today.getFullYear().toString();
        }
        
        // ISO format for internal comparisons
        const startISO = startDate.toISOString().split('T')[0];
        const endISO = endDate.toISOString().split('T')[0];
        
        // Format dates as MM/DD/YYYY for display
        const formatDate = (d) => {
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            return `${month}/${day}/${year}`;
        };
        const startStr = formatDate(startDate);
        const endStr = formatDate(endDate);
        
        // Calculate stats for daily tasks
        const periodTasks = this.dailyTasks.filter(t => t.dueDate >= startISO && t.dueDate <= endISO);
        const completedTasks = periodTasks.filter(t => t.completed);
        const incompleteTasks = periodTasks.filter(t => !t.completed);
        
        // Calculate stats for goals
        let periodGoals = [];
        let completedGoals = [];
        let incompleteGoals = [];
        
        if (period === 'week') {
            periodGoals = this.weeklyGoals;
            completedGoals = this.weeklyGoals.filter(g => g.completed);
            incompleteGoals = this.weeklyGoals.filter(g => !g.completed);
        } else if (period === 'month') {
            periodGoals = this.monthlyGoals;
            completedGoals = this.monthlyGoals.filter(g => g.completed);
            incompleteGoals = this.monthlyGoals.filter(g => !g.completed);
        } else if (period === 'year') {
            periodGoals = this.yearlyGoals;
            completedGoals = this.yearlyGoals.filter(g => g.completed);
            incompleteGoals = this.yearlyGoals.filter(g => !g.completed);
        }
        
        // Calculate XP earned during period
        const xpPerTask = 10;
        const xpPerGoal = period === 'week' ? 50 : period === 'month' ? 200 : 1000;
        const totalXP = (completedTasks.length * xpPerTask) + (completedGoals.length * xpPerGoal);
        
        return {
            period,
            periodName,
            startDate: startStr,
            endDate: endStr,
            endDateISO: endISO,  // ISO format for internal operations
            tasks: {
                total: periodTasks.length,
                completed: completedTasks.length,
                incomplete: incompleteTasks,
                completionRate: periodTasks.length > 0 ? Math.round((completedTasks.length / periodTasks.length) * 100) : 0
            },
            goals: {
                total: periodGoals.length,
                completed: completedGoals.length,
                incomplete: incompleteGoals,
                completionRate: periodGoals.length > 0 ? Math.round((completedGoals.length / periodGoals.length) * 100) : 0
            },
            xpEarned: totalXP
        };
    }

    // Get the ISO week number
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // Check for period transitions (new week/month/year)
    checkPeriodTransitions() {
        // Don't show for first-time users
        if (!this.tutorialCompleted && this.lastVisitDate === null) {
            this.updatePeriodTracking();
            return;
        }

        // Use timezone-aware date for consistency with rest of app
        const todayString = this.getTodayDateString();
        const today = new Date(todayString + 'T12:00:00'); // Use noon to avoid timezone edge cases
        const currentWeek = this.getWeekNumber(today);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const transitions = [];

        // Check for year transition
        if (this.lastYear !== null && this.lastYear < currentYear) {
            transitions.push('year');
        }
        
        // Check for month transition
        if (this.lastMonth !== null && (this.lastMonth !== currentMonth || this.lastYear !== currentYear)) {
            transitions.push('month');
        }
        
        // Check for week transition
        if (this.lastWeekNumber !== null && (this.lastWeekNumber !== currentWeek || this.lastYear !== currentYear)) {
            transitions.push('week');
        }

        // Show slideshow for the most significant transition
        if (transitions.length > 0) {
            // Prioritize: year > month > week
            const priority = ['year', 'month', 'week'];
            const mainTransition = priority.find(p => transitions.includes(p));
            this.showPeriodTransitionSlideshow(mainTransition, transitions);
        }

        // Update tracking
        this.updatePeriodTracking();
    }

    updatePeriodTracking() {
        // Use timezone-aware date for consistency
        const todayString = this.getTodayDateString();
        const today = new Date(todayString + 'T12:00:00');
        this.lastVisitDate = todayString;
        this.lastWeekNumber = this.getWeekNumber(today);
        this.lastMonth = today.getMonth();
        this.lastYear = today.getFullYear();
        this.saveData();
    }

    // Generate previous period summary (for transition slideshow)
    generatePreviousPeriodSummary(period) {
        // Use noon to avoid timezone edge cases when parsing date string
        const today = new Date(this.getTodayDateString() + 'T12:00:00');
        let startDate, endDate, periodName;
        
        if (period === 'week') {
            // Get last week (Monday to Sunday)
            const dayOfWeek = today.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            // This Monday
            const thisMonday = new Date(today);
            thisMonday.setDate(today.getDate() - daysFromMonday);
            // Last week's Monday and Sunday
            startDate = new Date(thisMonday);
            startDate.setDate(thisMonday.getDate() - 7);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            periodName = 'Last Week';
        } else if (period === 'month') {
            // Get last month
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            periodName = monthNames[startDate.getMonth()] + ' ' + startDate.getFullYear();
        } else if (period === 'year') {
            // Get last year
            startDate = new Date(today.getFullYear() - 1, 0, 1);
            endDate = new Date(today.getFullYear() - 1, 11, 31);
            periodName = (today.getFullYear() - 1).toString();
        }
        
        const startISO = startDate.toISOString().split('T')[0];
        const endISO = endDate.toISOString().split('T')[0];
        
        // Format dates for display
        const formatDate = (d) => {
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            return `${month}/${day}/${year}`;
        };
        
        // Calculate stats for daily tasks in that period
        const periodTasks = this.dailyTasks.filter(t => t.dueDate >= startISO && t.dueDate <= endISO);
        const completedTasks = periodTasks.filter(t => t.completed);
        const incompleteTasks = periodTasks.filter(t => !t.completed);
        
        // Calculate habit completions (approximation based on streak)
        const habitsCompleted = this.habits.reduce((total, h) => total + (h.streak || 0), 0);
        
        // Calculate goals
        let periodGoals = [];
        let completedGoals = [];
        let incompleteGoals = [];
        
        if (period === 'week') {
            periodGoals = this.weeklyGoals;
            completedGoals = this.weeklyGoals.filter(g => g.completed);
            incompleteGoals = this.weeklyGoals.filter(g => !g.completed);
        } else if (period === 'month') {
            periodGoals = this.monthlyGoals;
            completedGoals = this.monthlyGoals.filter(g => g.completed);
            incompleteGoals = this.monthlyGoals.filter(g => !g.completed);
        } else if (period === 'year') {
            periodGoals = this.yearlyGoals;
            completedGoals = this.yearlyGoals.filter(g => g.completed);
            incompleteGoals = this.yearlyGoals.filter(g => !g.completed);
        }
        
        const xpPerTask = 10;
        const xpPerGoal = period === 'week' ? 50 : period === 'month' ? 200 : 1000;
        const totalXP = (completedTasks.length * xpPerTask) + (completedGoals.length * xpPerGoal);
        
        return {
            period,
            periodName,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            endDateISO: endISO,
            tasks: {
                total: periodTasks.length,
                completed: completedTasks.length,
                incomplete: incompleteTasks,
                completionRate: periodTasks.length > 0 ? Math.round((completedTasks.length / periodTasks.length) * 100) : 0
            },
            goals: {
                total: periodGoals.length,
                completed: completedGoals.length,
                incomplete: incompleteGoals,
                completionRate: periodGoals.length > 0 ? Math.round((completedGoals.length / periodGoals.length) * 100) : 0
            },
            habits: {
                total: this.habits.length,
                completions: habitsCompleted
            },
            xpEarned: totalXP
        };
    }

    // Animated Period Transition Slideshow
    showPeriodTransitionSlideshow(mainPeriod, allTransitions) {
        const summary = this.generatePreviousPeriodSummary(mainPeriod);
        
        const iconConfig = {
            week: { icon: 'ri-shield-line', color: 'text-green-400', bg: 'from-green-900 to-green-950', border: 'border-green-600' },
            month: { icon: 'ri-book-3-line', color: 'text-blue-400', bg: 'from-blue-900 to-blue-950', border: 'border-blue-600' },
            year: { icon: 'ri-file-paper-2-line', color: 'text-purple-400', bg: 'from-purple-900 to-purple-950', border: 'border-purple-600' }
        };
        const config = iconConfig[mainPeriod];
        
        const periodLabel = mainPeriod === 'week' ? 'Week' : mainPeriod === 'month' ? 'Month' : 'Year';
        const nextPeriodLabel = mainPeriod === 'week' ? 'This Week' : mainPeriod === 'month' ? 'This Month' : 'This Year';
        
        const slides = [
            // Slide 1: Period Complete Celebration
            `<div class="slide-content text-center animate-fade-in">
                <div class="text-8xl mb-6 animate-bounce-slow">🎉</div>
                <h2 class="text-3xl font-bold text-amber-300 medieval-title mb-4">${periodLabel} Complete!</h2>
                <p class="text-amber-200 fancy-font text-xl mb-4">${summary.periodName}</p>
                <p class="text-amber-300/70 text-sm">${summary.startDate} - ${summary.endDate}</p>
            </div>`,
            
            // Slide 2: Tasks & Goals Stats
            `<div class="slide-content animate-fade-in">
                <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-6 text-center">Your Accomplishments</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-blue-900/50 p-6 rounded-xl border-2 border-blue-500 text-center">
                        <i class="ri-sword-line text-4xl text-orange-400 mb-2"></i>
                        <div class="text-5xl font-bold text-blue-300 medieval-title animate-count-up">${summary.tasks.completed}</div>
                        <div class="text-blue-200 fancy-font">Tasks Completed</div>
                        <div class="text-blue-300/70 text-sm mt-1">${summary.tasks.completionRate}% completion rate</div>
                    </div>
                    <div class="bg-green-900/50 p-6 rounded-xl border-2 border-green-500 text-center">
                        <i class="${config.icon} text-4xl ${config.color} mb-2"></i>
                        <div class="text-5xl font-bold text-green-300 medieval-title animate-count-up">${summary.goals.completed}</div>
                        <div class="text-green-200 fancy-font">${periodLabel}ly Goals</div>
                        <div class="text-green-300/70 text-sm mt-1">${summary.goals.completionRate}% completion rate</div>
                    </div>
                </div>
                ${summary.habits.total > 0 ? `
                <div class="mt-4 bg-purple-900/50 p-4 rounded-xl border-2 border-purple-500 text-center">
                    <i class="ri-repeat-line text-3xl text-purple-400 mb-2"></i>
                    <div class="text-3xl font-bold text-purple-300 medieval-title">${summary.habits.completions}</div>
                    <div class="text-purple-200 fancy-font">Habit Completions</div>
                </div>
                ` : ''}
            </div>`,
            
            // Slide 3: XP & Progress
            `<div class="slide-content animate-fade-in text-center">
                <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-6">Experience Gained</h3>
                <div class="bg-gradient-to-br from-yellow-900/50 to-amber-900/50 p-8 rounded-xl border-2 border-yellow-500 mb-6">
                    <div class="text-6xl mb-4">⭐</div>
                    <div class="text-5xl font-bold text-yellow-300 medieval-title mb-2">${summary.xpEarned} XP</div>
                    <div class="text-yellow-200 fancy-font">Total Experience Earned</div>
                </div>
                <div class="text-amber-200 fancy-font">
                    Current Level: <span class="text-2xl font-bold text-amber-300">${this.level}</span>
                </div>
            </div>`,
            
            // Slide 4: Incomplete Items & Rollover Option
            `<div class="slide-content animate-fade-in">
                <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-6 text-center">Ready for ${nextPeriodLabel}?</h3>
                ${summary.tasks.incomplete.length > 0 || summary.goals.incomplete.length > 0 ? `
                <div class="bg-orange-900/50 p-6 rounded-xl border-2 border-orange-500 mb-6">
                    <h4 class="text-lg font-bold text-orange-300 mb-4 flex items-center">
                        <i class="ri-error-warning-line mr-2"></i>Unfinished Quests
                    </h4>
                    ${summary.tasks.incomplete.length > 0 ? `
                    <p class="text-orange-200 mb-2"><i class="ri-sword-line mr-2"></i>${summary.tasks.incomplete.length} incomplete task${summary.tasks.incomplete.length !== 1 ? 's' : ''}</p>
                    ` : ''}
                    ${summary.goals.incomplete.length > 0 ? `
                    <p class="text-orange-200 mb-4"><i class="${config.icon} mr-2"></i>${summary.goals.incomplete.length} incomplete ${mainPeriod}ly goal${summary.goals.incomplete.length !== 1 ? 's' : ''}</p>
                    ` : ''}
                    <button onclick="goalManager.rolloverFromSlideshow('${mainPeriod}', '${summary.endDateISO}'); goalManager.nextSlide();" 
                        class="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all fancy-font mb-2">
                        <i class="ri-arrow-right-line mr-2"></i>Move to ${nextPeriodLabel}
                    </button>
                    <button onclick="goalManager.nextSlide();" 
                        class="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all fancy-font text-sm">
                        Skip - Leave as is
                    </button>
                </div>
                ` : `
                <div class="bg-green-900/50 p-6 rounded-xl border-2 border-green-500 mb-6 text-center">
                    <div class="text-6xl mb-4">🏆</div>
                    <h4 class="text-xl font-bold text-green-300 mb-2">Perfect ${periodLabel}!</h4>
                    <p class="text-green-200 fancy-font">All quests completed! Amazing work!</p>
                </div>
                `}
                <div class="text-center">
                    <p class="text-amber-200 fancy-font text-sm">Good luck on your new adventures!</p>
                </div>
            </div>`
        ];

        // Create slideshow modal
        const modal = document.createElement('div');
        modal.id = 'period-transition-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-[100] flex items-center justify-center overflow-hidden';
        modal.style.cssText = 'padding: 16px;';
        modal.innerHTML = `
            <div class="bg-gradient-to-br ${config.bg} rounded-2xl shadow-2xl border-4 ${config.border} overflow-hidden" style="width: 100%; max-width: min(512px, calc(100vw - 32px));">
                <!-- Header with icon -->
                <div class="bg-black/30 p-4 text-center border-b-2 ${config.border}">
                    <i class="${config.icon} text-4xl ${config.color}"></i>
                </div>
                
                <!-- Slides container -->
                <div id="slideshow-container" class="p-6 min-h-[400px] flex items-center justify-center">
                    ${slides[0]}
                </div>
                
                <!-- Navigation -->
                <div class="bg-black/30 p-4 border-t-2 ${config.border}">
                    <div class="flex justify-between items-center">
                        <button id="prev-slide-btn" onclick="goalManager.prevSlide()" 
                            class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold transition-all opacity-50 pointer-events-none">
                            <i class="ri-arrow-left-line mr-1"></i>Back
                        </button>
                        
                        <!-- Slide indicators -->
                        <div class="flex gap-2">
                            ${slides.map((_, i) => `<div class="slide-dot w-3 h-3 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-gray-600'} transition-all"></div>`).join('')}
                        </div>
                        
                        <button id="next-slide-btn" onclick="goalManager.nextSlide()" 
                            class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                            Next<i class="ri-arrow-right-line ml-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store slides data for navigation
        this.slideshowData = {
            slides: slides,
            currentSlide: 0,
            totalSlides: slides.length
        };
    }

    nextSlide() {
        if (!this.slideshowData) return;
        
        const { slides, currentSlide, totalSlides } = this.slideshowData;
        
        if (currentSlide >= totalSlides - 1) {
            // Close slideshow
            this.closeSlideshow();
            return;
        }
        
        this.slideshowData.currentSlide++;
        this.updateSlideshow();
    }

    prevSlide() {
        if (!this.slideshowData || this.slideshowData.currentSlide <= 0) return;
        
        this.slideshowData.currentSlide--;
        this.updateSlideshow();
    }

    updateSlideshow() {
        const { slides, currentSlide, totalSlides } = this.slideshowData;
        
        const container = document.getElementById('slideshow-container');
        const prevBtn = document.getElementById('prev-slide-btn');
        const nextBtn = document.getElementById('next-slide-btn');
        const dots = document.querySelectorAll('.slide-dot');
        
        if (container) {
            container.innerHTML = slides[currentSlide];
        }
        
        // Update prev button
        if (prevBtn) {
            if (currentSlide === 0) {
                prevBtn.classList.add('opacity-50', 'pointer-events-none');
            } else {
                prevBtn.classList.remove('opacity-50', 'pointer-events-none');
            }
        }
        
        // Update next button
        if (nextBtn) {
            if (currentSlide === totalSlides - 1) {
                nextBtn.innerHTML = 'Finish<i class="ri-check-line ml-1"></i>';
            } else {
                nextBtn.innerHTML = 'Next<i class="ri-arrow-right-line ml-1"></i>';
            }
        }
        
        // Update dots
        dots.forEach((dot, i) => {
            if (i === currentSlide) {
                dot.classList.remove('bg-gray-600');
                dot.classList.add('bg-amber-400');
            } else {
                dot.classList.remove('bg-amber-400');
                dot.classList.add('bg-gray-600');
            }
        });
    }

    closeSlideshow() {
        const modal = document.getElementById('period-transition-modal');
        if (modal) {
            modal.remove();
        }
        this.slideshowData = null;
    }

    rolloverFromSlideshow(period, endDateISO) {
        this.rolloverIncompleteTasks(period, endDateISO);
        this.showAchievement('📦 Quests moved to new ' + period + '!', 'daily');
    }

    showPeriodSummary(period) {
        const summary = this.generatePeriodSummary(period);
        // Use matching Remix Icons from bottom navigation
        const iconConfig = {
            week: { icon: 'ri-shield-line', color: 'text-green-400' },
            month: { icon: 'ri-book-3-line', color: 'text-blue-400' },
            year: { icon: 'ri-file-paper-2-line', color: 'text-purple-400' }
        };
        const { icon, color } = iconConfig[period];
        
        const html = `
            <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-hidden" style="padding: 16px;" onclick="this.remove()">
                <div class="bg-gradient-to-br from-amber-900 via-amber-950 to-stone-950 rounded-xl shadow-2xl border-4 border-amber-600 max-h-[90vh] overflow-y-auto" style="width: 100%; max-width: min(672px, calc(100vw - 32px));" onclick="event.stopPropagation()">
                    <div class="p-6">
                        <div class="text-center mb-2">
                            <i class="${icon} text-5xl ${color}"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-amber-300 medieval-title mb-2 text-center">${summary.periodName} Summary</h2>
                        <p class="text-amber-200 text-center mb-6 fancy-font text-sm">${summary.startDate} to ${summary.endDate}</p>
                        
                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div onclick="event.stopPropagation(); goalManager.switchView('daily'); this.closest('.fixed').remove();" class="bg-blue-900/40 p-4 rounded-lg border-2 border-blue-600 cursor-pointer hover:bg-blue-800/50 hover:border-blue-500 transition-all">
                                <div class="text-4xl font-bold text-blue-300 medieval-title pointer-events-none">${summary.tasks.completed}/${summary.tasks.total}</div>
                                <div class="text-blue-200 fancy-font pointer-events-none">Daily Tasks</div>
                                <div class="text-blue-100 text-sm mt-2 pointer-events-none">${summary.tasks.completionRate}% Complete</div>
                            </div>
                            <div onclick="event.stopPropagation(); goalManager.switchView('${period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : 'yearly'}'); this.closest('.fixed').remove();" class="bg-green-900/40 p-4 rounded-lg border-2 border-green-600 cursor-pointer hover:bg-green-800/50 hover:border-green-500 transition-all">
                                <div class="text-4xl font-bold text-green-300 medieval-title pointer-events-none">${summary.goals.completed}/${summary.goals.total}</div>
                                <div class="text-green-200 fancy-font pointer-events-none">${period.charAt(0).toUpperCase() + period.slice(1)}ly Goals</div>
                                <div class="text-green-100 text-sm mt-2 pointer-events-none">${summary.goals.completionRate}% Complete</div>
                            </div>
                        </div>
                        
                        <!-- XP Earned -->
                        <div class="bg-purple-900/40 p-4 rounded-lg border-2 border-purple-600 mb-6 text-center">
                            <div class="text-2xl font-bold text-purple-300 medieval-title">⭐ ${summary.xpEarned} XP Earned ⭐</div>
                            <div class="text-purple-200 fancy-font text-sm">Experience gained this ${period}</div>
                        </div>
                        
                        ${summary.tasks.incomplete.length > 0 || summary.goals.incomplete.length > 0 ? `
                            <div class="bg-orange-900/40 p-4 rounded-lg border-2 border-orange-600 mb-6">
                                <h3 class="text-xl font-bold text-orange-300 medieval-title mb-3">📋 Incomplete Items</h3>
                                ${summary.tasks.incomplete.length > 0 ? `
                                    <p class="text-orange-200 mb-2">${summary.tasks.incomplete.length} daily task${summary.tasks.incomplete.length !== 1 ? 's' : ''}</p>
                                ` : ''}
                                ${summary.goals.incomplete.length > 0 ? `
                                    <p class="text-orange-200 mb-3">${summary.goals.incomplete.length} ${period}ly goal${summary.goals.incomplete.length !== 1 ? 's' : ''}</p>
                                ` : ''}
                                <button onclick="goalManager.rolloverIncompleteTasks('${period}', '${summary.endDateISO}'); this.closest('.fixed').remove();" 
                                    class="w-full bg-orange-700 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-all fancy-font">
                                    ➡️ Move to Next ${period.charAt(0).toUpperCase() + period.slice(1)}
                                </button>
                            </div>
                        ` : `
                            <div class="bg-green-900/40 p-4 rounded-lg border-2 border-green-600 mb-6 text-center">
                                <div class="text-6xl mb-2">🎉</div>
                                <h3 class="text-xl font-bold text-green-300 medieval-title">Perfect ${period.charAt(0).toUpperCase() + period.slice(1)}!</h3>
                                <p class="text-green-200 fancy-font">All tasks and goals completed!</p>
                            </div>
                        `}
                        
                        <button onclick="this.closest('.fixed').remove()" 
                            class="w-full bg-amber-700 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-all fancy-font">
                            Close Summary
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    rolloverIncompleteTasks(period, currentEndDate) {
        const summary = this.generatePeriodSummary(period);
        
        // Calculate next period start date
        const endDate = new Date(currentEndDate);
        let nextStartDate = new Date(endDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
        
        if (period === 'week') {
            // Move incomplete daily tasks to next week
            summary.tasks.incomplete.forEach(task => {
                const taskDate = new Date(task.dueDate);
                const dayOffset = taskDate.getDay();
                const newDate = new Date(nextStartDate);
                newDate.setDate(nextStartDate.getDate() + dayOffset);
                task.dueDate = newDate.toISOString().split('T')[0];
            });
            
            // Archive completed weekly goals
            summary.goals.completed.forEach(goal => {
                this.archivedGoals.push({ ...goal, archivedAt: new Date().toISOString(), type: 'weekly' });
            });
            this.weeklyGoals = this.weeklyGoals.filter(g => !g.completed);
            
        } else if (period === 'month') {
            // Move incomplete daily tasks to next month
            summary.tasks.incomplete.forEach(task => {
                task.dueDate = nextStartDate.toISOString().split('T')[0];
            });
            
            // Archive completed monthly goals
            summary.goals.completed.forEach(goal => {
                this.archivedGoals.push({ ...goal, archivedAt: new Date().toISOString(), type: 'monthly' });
            });
            this.monthlyGoals = this.monthlyGoals.filter(g => !g.completed);
            
        } else if (period === 'year') {
            // Move incomplete daily tasks to next year
            summary.tasks.incomplete.forEach(task => {
                task.dueDate = nextStartDate.toISOString().split('T')[0];
            });
            
            // Archive completed yearly goals
            summary.goals.completed.forEach(goal => {
                this.archivedGoals.push({ ...goal, archivedAt: new Date().toISOString(), type: 'yearly' });
            });
            this.yearlyGoals = this.yearlyGoals.filter(g => !g.completed);
        }
        
        this.saveData();
        this.render();
        this.showAchievement(`📋 Incomplete items moved to next ${period}!`, 'daily');
    }

    // Multi-Parent Connection Management
    manageParentConnections(goalType, goalId) {
        let goal, parentArray, parentType, parentIdField;
        
        if (goalType === 'yearly') {
            goal = this.yearlyGoals.find(g => g.id === goalId);
            parentArray = this.lifeGoals;
            parentType = 'Life';
            parentIdField = 'lifeGoalIds';
        } else if (goalType === 'monthly') {
            goal = this.monthlyGoals.find(g => g.id === goalId);
            parentArray = this.yearlyGoals;
            parentType = 'Yearly';
            parentIdField = 'yearlyGoalIds';
        } else if (goalType === 'weekly') {
            goal = this.weeklyGoals.find(g => g.id === goalId);
            parentArray = this.monthlyGoals;
            parentType = 'Monthly';
            parentIdField = 'monthlyGoalIds';
        } else if (goalType === 'daily') {
            goal = this.dailyTasks.find(t => t.id === goalId);
            parentArray = this.weeklyGoals;
            parentType = 'Weekly';
            parentIdField = 'weeklyGoalIds';
        }
        
        if (!goal || !parentArray) return;
        
        // Ensure parentIds exists and is an array (migrate old format)
        if (!goal[parentIdField]) {
            const oldField = parentIdField.replace('Ids', 'Id');
            goal[parentIdField] = goal[oldField] ? [goal[oldField]] : [];
            delete goal[oldField];
        }
        
        // Build HTML for selection modal
        const html = `
            <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick="this.remove()">
                <div class="bg-gradient-to-br from-amber-900 via-amber-950 to-stone-950 rounded-xl shadow-2xl border-4 border-amber-600 max-w-lg w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="p-6">
                        <h2 class="text-2xl font-bold text-amber-300 medieval-title mb-4 text-center">🔗 Manage ${parentType} Connections</h2>
                        <p class="text-amber-200 text-center mb-4 fancy-font text-sm">Select which ${parentType.toLowerCase()} goals this connects to</p>
                        
                        <div class="space-y-2 mb-6">
                            ${parentArray.length === 0 ? `
                                <p class="text-amber-300 text-center py-4 fancy-font">No ${parentType.toLowerCase()} goals available</p>
                            ` : parentArray.map(parent => {
                                const isConnected = goal[parentIdField].includes(parent.id);
                                return `
                                    <div class="flex items-center gap-3 bg-amber-900/30 p-3 rounded-lg border-2 ${isConnected ? 'border-green-500' : 'border-amber-700'} hover:border-amber-500 transition-all">
                                        <input 
                                            type="checkbox" 
                                            id="parent-${parent.id}" 
                                            ${isConnected ? 'checked' : ''}
                                            onchange="goalManager.toggleParentConnection('${goalType}', ${goalId}, ${parent.id}, '${parentIdField}')"
                                            class="w-5 h-5">
                                        <label for="parent-${parent.id}" class="flex-1 text-amber-200 fancy-font cursor-pointer">
                                            ${parent.title}
                                        </label>
                                        ${isConnected ? '<span class="text-green-400 text-xl">✓</span>' : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        <button onclick="this.closest('.fixed').remove(); goalManager.render();" 
                            class="w-full bg-amber-700 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-all fancy-font">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    toggleParentConnection(goalType, goalId, parentId, parentIdField) {
        let goal;
        
        if (goalType === 'yearly') {
            goal = this.yearlyGoals.find(g => g.id === goalId);
        } else if (goalType === 'monthly') {
            goal = this.monthlyGoals.find(g => g.id === goalId);
        } else if (goalType === 'weekly') {
            goal = this.weeklyGoals.find(g => g.id === goalId);
        } else if (goalType === 'daily') {
            goal = this.dailyTasks.find(t => t.id === goalId);
        }
        
        if (!goal) return;
        
        // Ensure parentIds exists and is an array
        if (!goal[parentIdField]) {
            goal[parentIdField] = [];
        }
        
        const index = goal[parentIdField].indexOf(parentId);
        if (index > -1) {
            // Remove connection
            goal[parentIdField].splice(index, 1);
        } else {
            // Add connection
            goal[parentIdField].push(parentId);
        }
        
        this.saveData();
        this.updateParentProgress();
    }

    getParentNames(goal, parentIdField, parentArray) {
        // Ensure we're working with an array
        const parentIds = Array.isArray(goal[parentIdField]) 
            ? goal[parentIdField] 
            : (goal[parentIdField.replace('Ids', 'Id')] ? [goal[parentIdField.replace('Ids', 'Id')]] : []);
        
        return parentIds
            .map(id => {
                const parent = parentArray.find(p => p.id === id);
                return parent ? parent.title : null;
            })
            .filter(name => name !== null);
    }

    // Analytics Dashboard
    renderAnalytics() {
        // Premium gate for advanced analytics (keep basic stats free)
        if (!this.isPremium) {
            // Render basic stats for free users
            this.renderQuickStats();
            
            // Show premium prompt for advanced analytics
            const heatmapContainer = document.getElementById('activity-heatmap');
            if (heatmapContainer) {
                heatmapContainer.innerHTML = `
                    <div class="text-center py-8">
                        <div class="text-6xl mb-4">📊</div>
                        <h3 class="text-xl font-bold text-emerald-300 medieval-title mb-2">Activity Heatmap</h3>
                        <p class="text-emerald-200/70 text-sm mb-4 fancy-font">See your daily activity patterns</p>
                        <button onclick="goalManager.showPremiumPurchaseModal()" 
                            class="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-4 py-2 rounded-lg font-bold shadow-lg transition-all hover:scale-105 border-2 border-yellow-400 text-sm">
                            <i class="ri-vip-crown-2-fill mr-1"></i> Premium
                        </button>
                    </div>
                `;
            }
            
            const xpContainer = document.getElementById('xp-timeline');
            if (xpContainer) xpContainer.innerHTML = '<div class="text-center py-4 text-gray-400 fancy-font">Premium feature</div>';
            
            const breakdownContainer = document.getElementById('task-breakdown');
            if (breakdownContainer) breakdownContainer.innerHTML = '<div class="text-center py-4 text-gray-400 fancy-font">Premium feature</div>';
            
            const patternContainer = document.getElementById('productivity-pattern');
            if (patternContainer) patternContainer.innerHTML = '<div class="text-center py-4 text-gray-400 fancy-font">Premium feature</div>';
            
            return;
        }
        
        this.renderQuickStats();
        this.renderActivityHeatmap();
        this.renderXPTimeline();
        this.renderTaskBreakdown();
        this.renderProductivityPattern();
        this.renderPersonalRecords();
        this.renderGoalsProgressOverview();
    }

    renderQuickStats() {
        // Total Completed
        const totalCompleted = this.dailyTasks.filter(t => t.completed).length +
                              this.weeklyGoals.filter(g => g.completed).length +
                              this.monthlyGoals.filter(g => g.completed).length +
                              this.yearlyGoals.filter(g => g.completed).length +
                              this.lifeGoals.filter(g => g.completed).length +
                              this.sideQuests.filter(q => q.completed).length;
        
        const statEl = document.getElementById('stat-total-completed');
        if (statEl) statEl.textContent = totalCompleted.toLocaleString();
        
        // Current Streak
        const maxStreak = Math.max(...this.habits.map(h => h.streak || 0), 0);
        const streakEl = document.getElementById('stat-current-streak');
        if (streakEl) streakEl.textContent = maxStreak;
        
        // Total XP
        const xpEl = document.getElementById('stat-total-xp');
        if (xpEl) xpEl.textContent = this.xp.toLocaleString();
        
        // Completion Rate
        const totalTasks = this.dailyTasks.length + this.weeklyGoals.length + 
                          this.monthlyGoals.length + this.sideQuests.length;
        const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
        const rateEl = document.getElementById('stat-completion-rate');
        if (rateEl) rateEl.textContent = completionRate + '%';
    }

    renderActivityHeatmap() {
        const container = document.getElementById('activity-heatmap');
        if (!container) return;
        
        const today = new Date();
        
        // Create completion data map
        const completionData = {};
        this.dailyTasks.filter(t => t.completed).forEach(task => {
            const date = task.dueDate;
            completionData[date] = (completionData[date] || 0) + 1;
        });
        
        // Generate heatmap
        let html = '<div class="flex flex-col gap-1">';
        
        // Day labels
        html += '<div class="flex gap-1 mb-2"><div class="w-8"></div>';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
            html += `<div class="text-xs text-amber-300 w-4 text-center">${day}</div>`;
        });
        html += '</div>';
        
        // Generate weeks
        for (let week = 0; week < 12; week++) {
            html += '<div class="flex gap-1 items-center">';
            html += `<div class="text-xs text-amber-400 w-8 text-right pr-2">W${52 - week}</div>`;
            
            for (let day = 0; day < 7; day++) {
                const date = new Date(today);
                date.setDate(date.getDate() - ((11 - week) * 7 + (6 - day)));
                const dateStr = date.toISOString().split('T')[0];
                const count = completionData[dateStr] || 0;
                
                let color = 'bg-stone-700';
                if (count > 0) color = 'bg-green-900';
                if (count > 2) color = 'bg-green-700';
                if (count > 5) color = 'bg-green-500';
                if (count > 10) color = 'bg-green-300';
                
                html += `<div class="w-4 h-4 ${color} rounded border border-stone-600 hover:border-amber-500 transition-all cursor-pointer" 
                             title="${dateStr}: ${count} tasks"></div>`;
            }
            html += '</div>';
        }
        html += '</div>';
        
        container.innerHTML = html;
    }

    renderXPTimeline() {
        const container = document.getElementById('xp-timeline-chart');
        if (!container) return;
        
        const days = 30;
        const today = new Date();
        
        // Calculate XP per day from completion history
        const dailyXP = {};
        this.dailyTasks.filter(t => t.completed).forEach(task => {
            dailyXP[task.dueDate] = (dailyXP[task.dueDate] || 0) + 10;
        });
        
        // Find max for scaling
        const maxXP = Math.max(...Object.values(dailyXP), 1);
        
        // Generate bar chart
        let html = '<div class="flex items-end justify-between h-full gap-1">';
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const xp = dailyXP[dateStr] || 0;
            const height = maxXP > 0 ? (xp / maxXP) * 100 : 0;
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            
            html += `
                <div class="flex-1 flex flex-col items-center group">
                    <div class="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all hover:from-purple-500 hover:to-purple-300" 
                         style="height: ${height}%"
                         title="${dateStr}: ${xp} XP"></div>
                    <div class="text-xs text-amber-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">${dayName[0]}</div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderTaskBreakdown() {
        const container = document.getElementById('task-breakdown-chart');
        if (!container) return;
        
        const breakdown = {
            daily: this.dailyTasks.filter(t => t.completed).length,
            weekly: this.weeklyGoals.filter(g => g.completed).length,
            monthly: this.monthlyGoals.filter(g => g.completed).length,
            yearly: this.yearlyGoals.filter(g => g.completed).length,
            life: this.lifeGoals.filter(g => g.completed).length,
            side: this.sideQuests.filter(q => q.completed).length
        };
        
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            container.innerHTML = '<div class="text-center text-amber-300 py-12 fancy-font">Complete some quests to see breakdown!</div>';
            return;
        }
        
        const colors = {
            daily: { bg: 'bg-orange-500', text: 'Daily' },
            weekly: { bg: 'bg-green-500', text: 'Weekly' },
            monthly: { bg: 'bg-blue-500', text: 'Monthly' },
            yearly: { bg: 'bg-purple-500', text: 'Yearly' },
            life: { bg: 'bg-red-500', text: 'Life' },
            side: { bg: 'bg-cyan-500', text: 'Side' }
        };
        
        let html = '<div class="w-full flex flex-col gap-3">';
        
        Object.entries(breakdown).forEach(([type, count]) => {
            if (count > 0) {
                const percent = ((count / total) * 100).toFixed(1);
                html += `
                    <div class="flex items-center gap-3">
                        <div class="w-24 text-right text-amber-200 text-sm fancy-font">${colors[type].text}</div>
                        <div class="flex-1 bg-stone-800 rounded-full h-8 overflow-hidden border border-amber-700/30">
                            <div class="${colors[type].bg} h-full flex items-center justify-end px-3 text-white font-bold text-sm transition-all duration-500"
                                 style="width: ${percent}%">
                                ${count} (${percent}%)
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderProductivityPattern() {
        const container = document.getElementById('productivity-pattern-chart');
        if (!container) return;
        
        // Count completions by day of week
        const dayCount = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        this.dailyTasks.filter(t => t.completed).forEach(task => {
            const date = new Date(task.dueDate);
            dayCount[date.getDay()]++;
        });
        
        const maxCount = Math.max(...dayCount, 1);
        
        let html = '<div class="flex items-end justify-between h-full gap-2">';
        
        dayCount.forEach((count, index) => {
            const height = (count / maxCount) * 100;
            const color = index === 0 || index === 6 ? 'from-blue-600 to-blue-400' : 'from-green-600 to-green-400';
            
            html += `
                <div class="flex-1 flex flex-col items-center group">
                    <div class="text-sm text-amber-300 mb-2 font-bold">${count}</div>
                    <div class="w-full bg-gradient-to-t ${color} rounded-t transition-all hover:scale-105" 
                         style="height: ${height}%"
                         title="${dayNames[index]}: ${count} tasks"></div>
                    <div class="text-xs text-amber-400 mt-2">${dayNames[index].slice(0, 3)}</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderPersonalRecords() {
        const container = document.getElementById('personal-records');
        if (!container) return;
        
        // Calculate records
        const longestStreak = Math.max(...this.habits.map(h => h.longestStreak || h.streak || 0), 0);
        const mostTasksInDay = Object.entries(
            this.dailyTasks.filter(t => t.completed).reduce((acc, task) => {
                acc[task.dueDate] = (acc[task.dueDate] || 0) + 1;
                return acc;
            }, {})
        ).reduce((max, [date, count]) => Math.max(max, count), 0);
        
        const totalDaysActive = new Set(this.dailyTasks.filter(t => t.completed).map(t => t.dueDate)).size;
        
        const records = [
            { icon: '🔥', label: 'Longest Streak', value: `${longestStreak} days`, color: 'orange' },
            { icon: '⚡', label: 'Current Level', value: this.level, color: 'purple' },
            { icon: '📋', label: 'Most Tasks in a Day', value: mostTasksInDay, color: 'blue' },
            { icon: '📅', label: 'Total Active Days', value: totalDaysActive, color: 'green' },
            { icon: '💰', label: 'Total Gold Earned', value: this.goldCoins.toLocaleString(), color: 'yellow' },
            { icon: '🎁', label: 'Chests Opened', value: this.treasureChests.length, color: 'red' }
        ];
        
        const html = records.map(record => `
            <div class="bg-gradient-to-br from-${record.color}-900 to-${record.color}-950 p-4 rounded-lg border-2 border-${record.color}-600 text-center">
                <div class="text-3xl mb-2">${record.icon}</div>
                <div class="text-2xl font-bold text-${record.color}-300 medieval-title">${record.value}</div>
                <div class="text-xs text-${record.color}-200 fancy-font mt-1">${record.label}</div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    renderGoalsProgressOverview() {
        const container = document.getElementById('goals-progress-overview');
        if (!container) return;
        
        const allGoals = [
            ...this.lifeGoals.filter(g => !g.completed).map(g => ({ ...g, type: 'Life', color: 'red' })),
            ...this.yearlyGoals.filter(g => !g.completed).map(g => ({ ...g, type: 'Yearly', color: 'purple' })),
            ...this.monthlyGoals.filter(g => !g.completed).map(g => ({ ...g, type: 'Monthly', color: 'blue' })),
            ...this.weeklyGoals.filter(g => !g.completed).map(g => ({ ...g, type: 'Weekly', color: 'green' }))
        ];
        
        if (allGoals.length === 0) {
            container.innerHTML = '<div class="text-center text-amber-300 py-8 fancy-font">All goals completed! Time to set new ones! 🎉</div>';
            return;
        }
        
        const html = allGoals.map(goal => {
            const progress = goal.progress || 0;
            return `
                <div class="bg-${goal.color}-900/30 border-2 border-${goal.color}-700/50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                            <span class="text-xs bg-${goal.color}-700/50 text-${goal.color}-200 px-2 py-1 rounded fancy-font">${goal.type}</span>
                            <h4 class="text-lg font-bold text-amber-300 medieval-title">${goal.title}</h4>
                        </div>
                        <span class="text-${goal.color}-300 font-bold">${progress}%</span>
                    </div>
                    <div class="w-full bg-${goal.color}-950 rounded-full h-3 border border-${goal.color}-700">
                        <div class="bg-gradient-to-r from-${goal.color}-600 to-${goal.color}-400 h-3 rounded-full transition-all duration-500" 
                             style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    // Boss Battles System
    renderBossBattles() {
        // Premium gate for boss battles
        if (!this.isPremium) {
            const container = document.getElementById('active-bosses-container');
            if (container) {
                container.innerHTML = `
                    <div class="col-span-2 text-center py-12">
                        <div class="text-8xl mb-4">🐉</div>
                        <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-2">Boss Battles</h3>
                        <p class="text-amber-200 fancy-font mb-4">Transform your goals into epic boss fights!</p>
                        <p class="text-amber-300/70 text-sm mb-6 fancy-font">Complete tasks to deal damage and defeat bosses for bonus rewards.</p>
                        <button onclick="goalManager.showPremiumPurchaseModal()" 
                            class="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-6 py-3 rounded-lg font-bold shadow-lg transition-all hover:scale-105 border-2 border-yellow-400">
                            <i class="ri-vip-crown-2-fill mr-2"></i> Unlock with Premium
                        </button>
                    </div>
                `;
            }
            const defeatedContainer = document.getElementById('defeated-bosses-container');
            if (defeatedContainer) defeatedContainer.innerHTML = '';
            const conversionContainer = document.getElementById('boss-conversion-container');
            if (conversionContainer) conversionContainer.innerHTML = '';
            return;
        }
        
        this.renderActiveBosses();
        this.renderDefeatedBosses();
        this.renderBossConversionList();
    }

    renderActiveBosses() {
        const container = document.getElementById('active-bosses-container');
        if (!container) return;

        const activeBosses = [
            ...this.lifeGoals.filter(g => g.isBoss && !g.completed),
            ...this.yearlyGoals.filter(g => g.isBoss && !g.completed)
        ];

        if (activeBosses.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-12 text-amber-200">
                    <div class="text-8xl mb-4 opacity-30">⚔️</div>
                    <p class="fancy-font text-lg">No active boss battles. Transform a goal into a boss below!</p>
                </div>
            `;
            return;
        }

        const html = activeBosses.map(boss => {
            const isLife = this.lifeGoals.includes(boss);
            const children = isLife 
                ? this.yearlyGoals.filter(y => {
                    // Check both array format (lifeGoalIds) and old single format (lifeGoalId)
                    const ids = y.lifeGoalIds || (y.lifeGoalId ? [y.lifeGoalId] : []);
                    return ids.includes(boss.id);
                })
                : this.monthlyGoals.filter(m => {
                    // Check both array format (yearlyGoalIds) and old single format (yearlyGoalId)
                    const ids = m.yearlyGoalIds || (m.yearlyGoalId ? [m.yearlyGoalId] : []);
                    return ids.includes(boss.id);
                });
            
            const maxHP = children.length * 100;
            
            // Initialize HP if not set (for existing bosses or new bosses)
            if (boss.bossCurrentHP === null || boss.bossCurrentHP === undefined) {
                boss.bossCurrentHP = maxHP;
                boss.totalDamageDealt = 0;
            }
            
            // If max HP increased (new sub-goals added), increase current HP proportionally
            const oldMaxHP = boss.bossCurrentHP + (boss.totalDamageDealt || 0);
            if (maxHP > oldMaxHP && oldMaxHP > 0) {
                // New sub-goal added! Increase boss HP
                const hpIncrease = maxHP - oldMaxHP;
                boss.bossCurrentHP += hpIncrease;
            }
            
            // Ensure HP stays within bounds
            boss.bossCurrentHP = Math.max(0, Math.min(boss.bossCurrentHP, maxHP));
            
            const currentHP = Math.max(0, boss.bossCurrentHP);
            const hpPercent = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
            const completedChildren = children.filter(c => c.completed).length;
            
            // Determine boss phase
            let phase = 'full';
            let phaseText = 'Full Power';
            let phaseColor = 'red';
            if (hpPercent <= 25) {
                phase = 'critical';
                phaseText = 'CRITICAL!';
                phaseColor = 'purple';
            } else if (hpPercent <= 50) {
                phase = 'wounded';
                phaseText = 'Wounded';
                phaseColor = 'orange';
            } else if (hpPercent <= 75) {
                phase = 'injured';
                phaseText = 'Injured';
                phaseColor = 'yellow';
            }

            const bossIcon = this.getBossIcon(boss);
            
            return `
                <div class="boss-card bg-gradient-to-br from-${phaseColor}-950 via-red-950 to-stone-950 p-6 rounded-xl border-3 border-${phaseColor}-600 shadow-2xl relative overflow-hidden">
                    <!-- Boss Aura Effect -->
                    <div class="absolute inset-0 bg-gradient-to-t from-${phaseColor}-900/20 to-transparent animate-pulse"></div>
                    
                    <div class="relative z-10">
                        <!-- Boss Header -->
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-4">
                                <div class="text-6xl animate-bounce">${bossIcon}</div>
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-xs bg-${phaseColor}-700 text-white px-2 py-1 rounded fancy-font">
                                            ${isLife ? 'LEGENDARY BOSS' : 'ELITE BOSS'}
                                        </span>
                                        <span class="text-xs bg-red-700 text-white px-2 py-1 rounded fancy-font animate-pulse">
                                            ${phaseText}
                                        </span>
                                    </div>
                                    <h3 class="text-2xl font-bold text-amber-300 medieval-title">${boss.title}</h3>
                                    <p class="text-sm text-${phaseColor}-200 fancy-font">Level ${isLife ? '99' : '50'} Boss</p>
                                </div>
                            </div>
                            <button onclick="goalManager.toggleBossMode(${boss.id}, '${isLife ? 'life' : 'yearly'}')" 
                                class="text-red-400 hover:text-red-200 text-xl" title="Remove boss status">
                                <i class="ri-close-circle-line"></i>
                            </button>
                        </div>

                        <!-- HP Bar -->
                        <div class="mb-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm text-amber-200 font-bold fancy-font">HP</span>
                                <span class="text-sm text-${phaseColor}-300 font-bold">${currentHP} / ${maxHP}</span>
                            </div>
                            <div class="relative w-full bg-stone-900 rounded-full h-8 border-2 border-${phaseColor}-700 overflow-hidden">
                                <div class="absolute inset-0 bg-gradient-to-r from-${phaseColor}-900/50 to-transparent animate-pulse"></div>
                                <div class="relative h-full bg-gradient-to-r from-${phaseColor}-600 to-${phaseColor}-400 transition-all duration-1000 flex items-center justify-center" 
                                     style="width: ${hpPercent}%">
                                    <span class="text-white font-bold text-sm drop-shadow-lg">${Math.round(hpPercent)}%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Battle Progress -->
                        <div class="bg-stone-900/60 rounded-lg p-4 border border-${phaseColor}-700/50">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm text-amber-300 font-bold fancy-font">
                                    ⚔️ Battle Progress
                                </span>
                                <span class="text-${phaseColor}-300 font-bold">
                                    ${completedChildren}/${children.length} defeated
                                </span>
                            </div>
                            <div class="text-xs text-amber-200 mb-3">
                                ${children.length - completedChildren} ${isLife ? 'yearly campaigns' : 'monthly raids'} remaining
                                <div class="text-purple-300 mt-1">
                                    💡 Boss dies when HP reaches 0 (even if not all quests done!)
                                </div>
                            </div>
                            
                            ${children.length > 0 ? `
                                <div class="space-y-1 max-h-32 overflow-y-auto">
                                    ${children.map(child => `
                                        <div class="flex items-center gap-2 text-xs ${child.completed ? 'text-green-400' : 'text-amber-200'}">
                                            ${child.completed ? '✓' : '○'} ${child.title}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <p class="text-xs text-${phaseColor}-300 italic">
                                    No sub-quests yet. Add some to deal damage!
                                </p>
                            `}
                        </div>

                        <!-- Damage Counter -->
                        ${boss.totalDamageDealt > 0 ? `
                            <div class="mt-4 text-center">
                                <div class="text-3xl font-bold text-${phaseColor}-300 animate-pulse">
                                    ${boss.totalDamageDealt} TOTAL DMG DEALT!
                                </div>
                                ${boss.totalDamageDealt > completedChildren * 100 ? `
                                    <div class="text-xs text-amber-300 mt-1">
                                        🔥 BONUS DAMAGE from spells! ${boss.totalDamageDealt - (completedChildren * 100)} extra!
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        <!-- Active Boss Spells -->
                        ${this.renderBossSpellBuffs()}

                        <!-- Execute Button (if boss is below 25% HP and spell is active) -->
                        ${this.canExecuteBoss(boss, hpPercent) ? `
                            <div class="mt-4">
                                <button onclick="goalManager.executeBoss(${boss.id}, '${isLife ? 'life' : 'yearly'}')"
                                    class="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-xl transition-all hover:scale-105 border-2 border-red-400 animate-pulse">
                                    💀 EXECUTE! Instant Kill!
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderDefeatedBosses() {
        const container = document.getElementById('defeated-bosses-container');
        if (!container) return;

        const defeatedBosses = [
            ...this.lifeGoals.filter(g => g.isBoss && g.completed),
            ...this.yearlyGoals.filter(g => g.isBoss && g.completed)
        ];

        if (defeatedBosses.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8 text-amber-200">
                    <div class="text-6xl mb-3 opacity-30">🏆</div>
                    <p class="fancy-font">No victories yet. Defeat your first boss to start your legend!</p>
                </div>
            `;
            return;
        }

        const html = defeatedBosses.map(boss => {
            const isLife = this.lifeGoals.includes(boss);
            const bossIcon = this.getBossIcon(boss);
            const completedDate = boss.completed ? new Date(boss.completedAt || boss.created).toLocaleDateString() : '';

            return `
                <div class="bg-gradient-to-br from-green-900/40 to-stone-900/40 p-4 rounded-lg border-2 border-green-600/50 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="text-4xl mb-2 grayscale opacity-75">${bossIcon}</div>
                        <h4 class="text-lg font-bold text-green-300 medieval-title mb-1">${boss.title}</h4>
                        <div class="text-xs text-green-200 mb-2">
                            <span class="bg-green-700/50 px-2 py-1 rounded">${isLife ? 'LEGENDARY' : 'ELITE'}</span>
                        </div>
                        <div class="text-xs text-amber-300 fancy-font">
                            ⚔️ Defeated: ${completedDate}
                        </div>
                        <div class="mt-2 text-center">
                            <span class="text-2xl">🏆</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderBossConversionList() {
        const container = document.getElementById('boss-conversion-list');
        if (!container) return;

        const eligibleGoals = [
            ...this.lifeGoals.filter(g => !g.isBoss && !g.completed).map(g => ({ ...g, type: 'life', icon: '👑', label: 'Life Goal' })),
            ...this.yearlyGoals.filter(g => !g.isBoss && !g.completed).map(g => ({ ...g, type: 'yearly', icon: '📅', label: 'Yearly Campaign' }))
        ];

        if (eligibleGoals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-6 text-amber-300 fancy-font">
                    No eligible goals. Create a Life Goal or Yearly Campaign first!
                </div>
            `;
            return;
        }

        const html = eligibleGoals.map(goal => `
            <div class="flex items-center justify-between bg-stone-900/60 p-3 rounded-lg border border-amber-700/30 hover:border-red-600 transition-all">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${goal.icon}</span>
                    <div>
                        <div class="font-bold text-amber-300">${goal.title}</div>
                        <div class="text-xs text-amber-200 fancy-font">${goal.label}</div>
                    </div>
                </div>
                <button onclick="goalManager.toggleBossMode(${goal.id}, '${goal.type}')" 
                    class="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105">
                    ⚔️ Make Boss
                </button>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    toggleBossMode(goalId, goalType) {
        let goal;
        if (goalType === 'life') {
            goal = this.lifeGoals.find(g => g.id === goalId);
        } else if (goalType === 'yearly') {
            goal = this.yearlyGoals.find(g => g.id === goalId);
        }

        if (!goal) return;

        goal.isBoss = !goal.isBoss;

        if (goal.isBoss) {
            // Initialize boss damage tracking
            goal.bossCurrentHP = null; // Will be calculated based on sub-goals
            goal.totalDamageDealt = 0;
            this.showAchievement(`⚔️ BOSS BATTLE INITIATED: ${goal.title}!`, 'life');
            this.createConfetti();
        } else {
            // Clean up boss properties
            delete goal.bossCurrentHP;
            delete goal.totalDamageDealt;
            this.showAchievement(`Normal quest restored: ${goal.title}`, 'daily');
        }

        this.saveData();
        this.render();
    }

    getBossIcon(boss) {
        const icons = ['🐉', '👹', '💀', '🦹', '👾', '🤖', '🐲', '🦖', '👿', '😈'];
        // Generate consistent icon based on boss ID
        const index = boss.id % icons.length;
        return icons[index];
    }

    renderBossSpellBuffs() {
        const bossSpells = this.activeSpells.filter(s => 
            ['berserker_rage', 'critical_strike', 'boss_slayer', 'execute'].includes(s.spellId)
        );

        if (bossSpells.length === 0) return '';

        const html = bossSpells.map(activeSpell => {
            const spell = this.spellDefinitions[activeSpell.spellId];
            if (!spell) return ''; // Skip if spell no longer exists
            let timeText = '';
            
            if (activeSpell.expiresAt === -1) {
                timeText = 'Ready!';
            } else {
                const timeRemaining = Math.max(0, activeSpell.expiresAt - Date.now());
                const hours = Math.floor(timeRemaining / 3600000);
                const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                timeText = `${hours}h ${minutes}m`;
            }

            return `
                <div class="bg-purple-900/40 border border-purple-500 rounded px-2 py-1 text-xs">
                    <span class="text-xl mr-1">${spell.icon}</span>
                    <span class="text-purple-200 font-bold">${spell.name}</span>
                    <span class="text-purple-300 ml-2">${timeText}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="mt-4">
                <div class="text-xs text-purple-300 mb-2 font-bold">⚡ Active Buffs:</div>
                <div class="flex flex-wrap gap-2">
                    ${html}
                </div>
            </div>
        `;
    }

    canExecuteBoss(boss, hpPercent) {
        const executeSpell = this.activeSpells.find(s => s.spellId === 'execute');
        return executeSpell && hpPercent <= 25 && !boss.completed;
    }

    executeBoss(bossId, bossType) {
        let boss;
        if (bossType === 'life') {
            boss = this.lifeGoals.find(g => g.id === bossId);
        } else if (bossType === 'yearly') {
            boss = this.yearlyGoals.find(g => g.id === bossId);
        }

        if (!boss || !boss.isBoss) return;

        // Consume Execute spell
        this.activeSpells = this.activeSpells.filter(s => s.spellId !== 'execute');

        // Mark boss as defeated
        boss.completed = true;
        boss.completedAt = new Date().toISOString();

        // Epic execution celebration
        this.showAchievement('💀 EXECUTE! INSTANT KILL!', 'legendary');
        this.createConfetti();
        setTimeout(() => this.createConfetti(), 300);
        setTimeout(() => this.createConfetti(), 600);

        // Trigger boss defeat rewards
        this.defeatBoss(boss);

        this.saveData();
        this.render();
    }

    dealBossDamage(completedGoal, goalType) {
        // Find parent bosses
        let parentBosses = [];
        
        if (goalType === 'monthly') {
            // Check yearly bosses
            const yearlyIds = completedGoal.yearlyGoalIds || (completedGoal.yearlyGoalId ? [completedGoal.yearlyGoalId] : []);
            parentBosses = this.yearlyGoals.filter(y => y.isBoss && yearlyIds.includes(y.id) && !y.completed);
        } else if (goalType === 'yearly') {
            // Check life goal bosses
            const lifeIds = completedGoal.lifeGoalIds || (completedGoal.lifeGoalId ? [completedGoal.lifeGoalId] : []);
            parentBosses = this.lifeGoals.filter(l => l.isBoss && lifeIds.includes(l.id) && !l.completed);
        }

        if (parentBosses.length === 0) return;

        // Calculate damage with spell bonuses
        let baseDamage = 100;
        let totalDamage = baseDamage;
        let damageMessages = [];
        let isCrit = false;

        // Check for Wolf companion bonus (+20% attack damage)
        const wolfBonus = this.getCompanionBonus('attack');
        if (wolfBonus > 0) {
            totalDamage *= (1 + wolfBonus);
            damageMessages.push('🐺 WOLF PACK! +20% Damage!');
        }

        // Check for Boss Slayer Enchantment (+50% damage)
        const enchantmentBonus = this.getEnchantmentMultiplier('boss_damage');
        if (enchantmentBonus > 1) {
            totalDamage *= enchantmentBonus;
            damageMessages.push('⚔️ TITAN ENCHANTMENT! +50% Damage!');
        }

        // Check for Berserker Rage (double damage, one-time use)
        const berserkerRage = this.activeSpells.find(s => s.spellId === 'berserker_rage');
        if (berserkerRage) {
            totalDamage *= 2;
            damageMessages.push('⚔️ BERSERKER RAGE! x2 Damage!');
            // Consume the spell
            this.activeSpells = this.activeSpells.filter(s => s.spellId !== 'berserker_rage');
        }

        // Check for Boss Slayer (+25% damage, duration-based)
        const bossSlayer = this.activeSpells.find(s => s.spellId === 'boss_slayer');
        if (bossSlayer && bossSlayer.expiresAt > Date.now()) {
            totalDamage *= 1.25;
            damageMessages.push('🗡️ BOSS SLAYER! +25% Damage!');
        }

        // Check for Critical Strike (50% chance for +50% damage)
        const criticalStrike = this.activeSpells.find(s => s.spellId === 'critical_strike');
        if (criticalStrike && criticalStrike.expiresAt > Date.now()) {
            if (Math.random() < 0.5) {
                totalDamage *= 1.5;
                isCrit = true;
                damageMessages.push('💥 CRITICAL STRIKE! +50% Damage!');
            }
        }

        totalDamage = Math.round(totalDamage);

        // Apply damage to all parent bosses
        parentBosses.forEach(boss => {
            // Initialize HP tracking if needed
            const isLife = this.lifeGoals.includes(boss);
            const children = isLife 
                ? this.yearlyGoals.filter(y => {
                    const ids = y.lifeGoalIds || (y.lifeGoalId ? [y.lifeGoalId] : []);
                    return ids.includes(boss.id);
                })
                : this.monthlyGoals.filter(m => {
                    const ids = m.yearlyGoalIds || (m.yearlyGoalId ? [m.yearlyGoalId] : []);
                    return ids.includes(boss.id);
                });
            
            const maxHP = children.length * 100;
            
            if (boss.bossCurrentHP === null || boss.bossCurrentHP === undefined) {
                boss.bossCurrentHP = maxHP;
                boss.totalDamageDealt = 0;
            }
            
            // Deal damage
            boss.bossCurrentHP = Math.max(0, boss.bossCurrentHP - totalDamage);
            boss.totalDamageDealt = (boss.totalDamageDealt || 0) + totalDamage;
            
            // Play boss damage sound
            if (window.audioManager) {
                window.audioManager.playBossDamage();
            }
            
            const bossIcon = this.getBossIcon(boss);
            let message = `${bossIcon} BOSS HIT! ${totalDamage} DMG dealt to ${boss.title}!`;
            if (isCrit) message = '💥 ' + message;
            
            this.showAchievement(message, 'life', false);
            
            if (damageMessages.length > 0) {
                setTimeout(() => {
                    damageMessages.forEach(msg => {
                        this.showAchievement(msg, 'epic', false);
                    });
                }, 500);
            }
            
            // Check if boss is defeated by damage
            if (boss.bossCurrentHP <= 0 && !boss.completed) {
                setTimeout(() => {
                    boss.completed = true;
                    boss.completedAt = new Date().toISOString();
                    this.showAchievement(`💀 ${boss.title} HP DEPLETED! Boss defeated by pure damage!`, 'legendary', false);
                    this.defeatBoss(boss);
                    this.saveData();
                    this.render();
                }, 1000);
            }
        });
    }

    checkBossDefeat(goal) {
        if (!goal || !goal.isBoss || goal.completed) return;

        const isLife = this.lifeGoals.includes(goal);
        const children = isLife 
            ? this.yearlyGoals.filter(y => {
                // Check both array format (lifeGoalIds) and old single format (lifeGoalId)
                const ids = y.lifeGoalIds || (y.lifeGoalId ? [y.lifeGoalId] : []);
                return ids.includes(goal.id);
            })
            : this.monthlyGoals.filter(m => {
                // Check both array format (yearlyGoalIds) and old single format (yearlyGoalId)
                const ids = m.yearlyGoalIds || (m.yearlyGoalId ? [m.yearlyGoalId] : []);
                return ids.includes(goal.id);
            });

        const allChildrenCompleted = children.length > 0 && children.every(c => c.completed);

        if (allChildrenCompleted) {
            // Boss defeated!
            goal.completed = true;
            goal.completedAt = new Date().toISOString();
            this.defeatBoss(goal);
        }
    }

    defeatBoss(boss) {
        const isLife = this.lifeGoals.includes(boss);
        this.bossesDefeated++; // Track for titles
        
        // Play boss defeated sound
        if (window.audioManager) {
            window.audioManager.playBossDefeated();
        }
        
        // Epic celebration
        this.createConfetti();
        setTimeout(() => this.createConfetti(), 500);
        setTimeout(() => this.createConfetti(), 1000);

        // Legendary rewards
        const xpReward = isLife ? 5000 : 2000;
        const goldReward = isLife ? 10000 : 5000;
        
        this.addXP(xpReward, 'boss');
        this.addGold(goldReward, 'boss');

        // Special loot
        const legendarySpells = ['moonlight_blessing', 'double_xp_weekend', 'time_freeze', 'berserker_rage'];
        const randomSpell = legendarySpells[Math.floor(Math.random() * legendarySpells.length)];
        this.addSpellToBook(randomSpell, 3);

        // Epic achievement
        this.showAchievement(
            `🏆 BOSS DEFEATED! ${boss.title}! +${xpReward} XP +${goldReward} Gold!`,
            'life',
            false
        );

        // Unlock badge
        this.unlockBadge(
            'boss_slayer_' + boss.id,
            'Boss Slayer',
            `Defeated ${boss.title}`,
            '⚔️'
        );

        this.saveData();
        this.render();
    }

    // Quest Chains System
    renderQuestChains() {
        this.renderActiveQuestChains();
        this.renderAvailableQuestChains();
        this.renderCompletedQuestChains();
    }

    renderActiveQuestChains() {
        const container = document.getElementById('active-questchains-container');
        if (!container) return;

        if (this.activeQuestChains.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-cyan-200">
                    <div class="text-8xl mb-4 opacity-30">⛓️</div>
                    <p class="fancy-font text-lg">No active quest chains. Start an adventure below!</p>
                </div>
            `;
            return;
        }

        // Filter out chains with missing templates
        const validChains = this.activeQuestChains.filter(chain => 
            this.questChainTemplates[chain.templateId] !== undefined
        );
        
        const html = validChains.map(chain => {
            const template = this.questChainTemplates[chain.templateId];
            const currentChapter = chain.chapters[chain.currentChapterIndex];
            const progress = Math.round((chain.currentChapterIndex / template.chapters.length) * 100);
            
            return `
                <div class="bg-gradient-to-br from-cyan-900 to-cyan-950 p-6 rounded-xl border-3 border-cyan-600 shadow-2xl">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="text-6xl">${template.icon}</div>
                            <div>
                                <h3 class="text-2xl font-bold text-cyan-300 medieval-title">${template.name}</h3>
                                <p class="text-sm text-cyan-200">${template.description}</p>
                                <div class="flex items-center gap-2 mt-2">
                                    <span class="text-xs bg-cyan-700 text-white px-2 py-1 rounded">${template.category}</span>
                                    <span class="text-xs bg-${template.difficulty === 'easy' ? 'green' : template.difficulty === 'medium' ? 'yellow' : 'red'}-700 text-white px-2 py-1 rounded">
                                        ${template.difficulty.toUpperCase()}
                                    </span>
                                    <span class="text-xs text-cyan-300">Chapter ${chain.currentChapterIndex + 1}/${template.chapters.length}</span>
                                </div>
                            </div>
                        </div>
                        <button onclick="goalManager.abandonQuestChain('${chain.id}')" 
                            class="text-red-400 hover:text-red-200" title="Abandon Quest Chain">
                            <i class="ri-close-circle-line text-2xl"></i>
                        </button>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-cyan-200 font-bold">Overall Progress</span>
                            <span class="text-sm text-cyan-300">${progress}%</span>
                        </div>
                        <div class="w-full bg-cyan-950 rounded-full h-3 border border-cyan-700">
                            <div class="bg-gradient-to-r from-cyan-600 to-cyan-400 h-3 rounded-full transition-all duration-500" 
                                 style="width: ${progress}%"></div>
                        </div>
                    </div>

                    <!-- Current Chapter -->
                    <div class="bg-stone-900/60 rounded-lg p-4 border border-cyan-700/50">
                        <h4 class="text-lg font-bold text-cyan-300 mb-2">📖 ${currentChapter.title}</h4>
                        <p class="text-sm text-cyan-200 mb-3">${currentChapter.description}</p>
                        
                        <!-- Chapter Tasks -->
                        <div class="space-y-2">
                            ${currentChapter.tasks.map((task, index) => {
                                const isCompleted = chain.completedTasks.includes(index);
                                return `
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                                            onchange="goalManager.toggleChainTask('${chain.id}', ${index})"
                                            class="cursor-pointer">
                                        <span class="${isCompleted ? 'line-through text-green-400' : 'text-cyan-100'} text-sm">
                                            ${task}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Chapter Reward Preview -->
                        <div class="mt-4 p-3 bg-amber-900/30 rounded border border-amber-700/50">
                            <div class="text-xs text-amber-300 mb-1">🏆 Chapter Reward:</div>
                            <div class="text-sm text-amber-200">
                                +${currentChapter.reward.xp} XP, 
                                +${currentChapter.reward.gold} Gold, 
                                ${this.spellDefinitions[currentChapter.reward.spell]?.name} x${currentChapter.reward.charges}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderAvailableQuestChains() {
        const container = document.getElementById('available-questchains-container');
        if (!container) return;

        // Get templates that aren't currently active or completed
        const activeIds = this.activeQuestChains.map(c => c.templateId);
        const completedIds = this.completedQuestChains.map(c => c.templateId);
        const availableTemplates = Object.values(this.questChainTemplates)
            .filter(t => !activeIds.includes(t.id) && !completedIds.includes(t.id));

        if (availableTemplates.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8 text-cyan-200">
                    <p class="fancy-font">All quest chains completed or in progress! More coming soon...</p>
                </div>
            `;
            return;
        }

        const html = availableTemplates.map(template => {
            const difficultyColor = template.difficulty === 'easy' ? 'green' : template.difficulty === 'medium' ? 'yellow' : 'red';
            
            return `
                <div class="bg-gradient-to-br from-stone-800 to-stone-900 p-5 rounded-lg border-2 border-cyan-700/50 hover:border-cyan-500 transition-all cursor-pointer group">
                    <div class="text-5xl mb-3 text-center group-hover:scale-110 transition-transform">${template.icon}</div>
                    <h4 class="text-lg font-bold text-cyan-300 medieval-title mb-2 text-center">${template.name}</h4>
                    <p class="text-sm text-cyan-200 mb-3 text-center">${template.description}</p>
                    
                    <div class="flex flex-wrap justify-center gap-2 mb-3">
                        <span class="text-xs bg-cyan-700 text-white px-2 py-1 rounded">${template.category}</span>
                        <span class="text-xs bg-${difficultyColor}-700 text-white px-2 py-1 rounded">${template.difficulty.toUpperCase()}</span>
                        <span class="text-xs bg-purple-700 text-white px-2 py-1 rounded">${template.chapters.length} Chapters</span>
                        <span class="text-xs bg-blue-700 text-white px-2 py-1 rounded">~${template.estimatedWeeks} weeks</span>
                    </div>

                    <button onclick="goalManager.startQuestChain('${template.id}')"
                        class="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105">
                        🗺️ Begin Adventure
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderCompletedQuestChains() {
        const container = document.getElementById('completed-questchains-container');
        if (!container) return;

        if (this.completedQuestChains.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8 text-cyan-200">
                    <div class="text-6xl mb-3 opacity-30">🏆</div>
                    <p class="fancy-font">No completed quest chains yet. Finish your first saga!</p>
                </div>
            `;
            return;
        }

        // Filter out chains with missing templates
        const validChains = this.completedQuestChains.filter(chain => 
            this.questChainTemplates[chain.templateId] !== undefined
        );
        
        const html = validChains.map(chain => {
            const template = this.questChainTemplates[chain.templateId];
            const completedDate = chain.completedAt ? new Date(chain.completedAt).toLocaleDateString() : '';

            return `
                <div class="bg-gradient-to-br from-green-900/40 to-stone-900/40 p-4 rounded-lg border-2 border-green-600/50">
                    <div class="text-4xl mb-2 text-center grayscale opacity-75">${template.icon}</div>
                    <h4 class="text-lg font-bold text-green-300 medieval-title mb-1 text-center">${template.name}</h4>
                    <div class="text-xs text-green-200 mb-2 text-center">
                        <span class="bg-green-700/50 px-2 py-1 rounded">${template.category}</span>
                    </div>
                    <div class="text-xs text-amber-300 fancy-font text-center">
                        ✅ Completed: ${completedDate}
                    </div>
                    <div class="text-xs text-cyan-300 mt-1 text-center">
                        ${template.chapters.length} Chapters Conquered
                    </div>
                    <div class="mt-2 text-center">
                        <span class="text-2xl">🏆</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // Focus Timer Rendering
    renderFocusTimer() {
        // Update crystal display
        const crystalsElement = document.getElementById('focus-crystals');
        if (crystalsElement) {
            crystalsElement.textContent = this.focusCrystals;
        }
        
        const crystalsDisplay = document.getElementById('focus-crystals-display');
        if (crystalsDisplay) {
            crystalsDisplay.textContent = this.focusCrystals;
        }
        
        const totalFocusTime = document.getElementById('total-focus-time');
        if (totalFocusTime) {
            totalFocusTime.textContent = this.totalFocusTime;
        }
    }

    // Enchantments Rendering
    renderEnchantments() {
        // Premium gate for enchantments
        if (!this.isPremium) {
            const activeContainer = document.getElementById('active-enchantments-container');
            if (activeContainer) {
                activeContainer.innerHTML = `
                    <div class="col-span-3 text-center py-12">
                        <div class="text-8xl mb-4">✨</div>
                        <h3 class="text-2xl font-bold text-pink-300 medieval-title mb-2">Enchantments</h3>
                        <p class="text-pink-200 fancy-font mb-4">Apply magical buffs to boost your productivity!</p>
                        <p class="text-pink-300/70 text-sm mb-6 fancy-font">Earn Focus Crystals and activate powerful enchantments.</p>
                        <button onclick="goalManager.showPremiumPurchaseModal()" 
                            class="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-6 py-3 rounded-lg font-bold shadow-lg transition-all hover:scale-105 border-2 border-yellow-400">
                            <i class="ri-vip-crown-2-fill mr-2"></i> Unlock with Premium
                        </button>
                    </div>
                `;
            }
            const shopContainer = document.getElementById('enchantments-shop-container');
            if (shopContainer) shopContainer.innerHTML = '';
            return;
        }
        
        // Update crystal display in enchantments view
        const enchantmentsCrystals = document.getElementById('enchantments-crystals');
        if (enchantmentsCrystals) {
            enchantmentsCrystals.textContent = this.focusCrystals;
        }
        
        // Render active enchantments
        this.renderActiveEnchantments();
        
        // Render enchantment shop
        this.renderEnchantmentShop();
    }

    renderActiveEnchantments() {
        const container = document.getElementById('active-enchantments-container');
        if (!container) return;
        
        this.checkExpiredEnchantments();
        
        if (this.activeEnchantments.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8 text-pink-200">
                    <div class="text-6xl mb-3 opacity-30">✨</div>
                    <p class="fancy-font">No active enchantments. Purchase some below!</p>
                </div>
            `;
            return;
        }
        
        const html = this.activeEnchantments.map(ench => {
            const timeRemaining = ench.expiresAt - Date.now();
            const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
            const hoursRemaining = Math.floor(minutesRemaining / 60);
            const mins = minutesRemaining % 60;
            
            let timeDisplay = '';
            if (hoursRemaining > 0) {
                timeDisplay = `${hoursRemaining}h ${mins}m remaining`;
            } else {
                timeDisplay = `${mins}m remaining`;
            }
            
            return `
                <div class="bg-gradient-to-br from-pink-900 to-purple-900 p-4 rounded-lg border-3 border-pink-600 shadow-xl animate-pulse-slow">
                    <div class="text-4xl text-center mb-2">${ench.icon}</div>
                    <h4 class="text-lg font-bold text-pink-200 medieval-title text-center mb-2">${ench.name}</h4>
                    <div class="text-xs text-pink-300 fancy-font text-center">
                        ⏱️ ${timeDisplay}
                    </div>
                    <div class="mt-2 w-full bg-pink-950 rounded-full h-2">
                        <div class="bg-gradient-to-r from-pink-500 to-purple-400 h-2 rounded-full transition-all" 
                            style="width: ${(timeRemaining / (ench.expiresAt - (Date.now() - timeRemaining))) * 100}%"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    renderEnchantmentShop() {
        const container = document.getElementById('enchantments-shop-container');
        if (!container) return;
        
        const enchantments = Object.values(this.enchantmentDefinitions);
        
        const html = enchantments.map(ench => {
            const isActive = this.hasActiveEnchantment(ench.effect);
            const canAfford = this.focusCrystals >= ench.cost;
            
            return `
                <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border-3 ${isActive ? 'border-green-600' : 'border-amber-600'} shadow-xl ${isActive ? 'opacity-50' : ''}">
                    <div class="text-5xl text-center mb-3">${ench.icon}</div>
                    <h4 class="text-xl font-bold text-amber-300 medieval-title text-center mb-2">${ench.name}</h4>
                    <p class="text-sm text-amber-200 fancy-font text-center mb-4">${ench.description}</p>
                    
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-sm text-cyan-300 fancy-font">
                            💎 ${ench.cost} Crystals
                        </div>
                        <div class="text-sm text-purple-300 fancy-font">
                            ⏱️ ${ench.duration >= 60 ? Math.floor(ench.duration / 60) + 'h' : ench.duration + 'm'}
                        </div>
                    </div>
                    
                    <button 
                        onclick="goalManager.purchaseEnchantment('${ench.id}')" 
                        class="${isActive ? 'bg-gray-600 cursor-not-allowed' : (canAfford ? 'bg-pink-600 hover:bg-pink-500' : 'bg-gray-600 cursor-not-allowed')} text-white w-full py-3 rounded-lg font-bold fancy-font shadow-lg transition-all"
                        ${isActive || !canAfford ? 'disabled' : ''}>
                        ${isActive ? '✓ Active' : (canAfford ? '✨ Purchase' : '🔒 Locked')}
                    </button>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    // Global Search
    openSearch() {
        const modal = document.getElementById('search-modal');
        const input = document.getElementById('global-search-input');
        if (modal && input) {
            modal.classList.remove('hidden');
            input.focus();
            input.value = '';
            this.performSearch('');
        }
    }

    closeSearch() {
        const modal = document.getElementById('search-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    performSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        if (!query || query.trim() === '') {
            resultsContainer.innerHTML = `
                <div class="text-center text-amber-300 fancy-font py-8">
                    <i class="ri-search-2-line text-5xl mb-3 opacity-50"></i>
                    <p>Start typing to search...</p>
                </div>
            `;
            return;
        }
        
        const searchLower = query.toLowerCase();
        const results = [];
        
        // Search Life Goals
        this.lifeGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchLower) || 
                (goal.description && goal.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Epic Quest', icon: '🏰', item: goal, view: 'life-goals' });
            }
        });
        
        // Search Yearly Goals
        this.yearlyGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchLower) || 
                (goal.description && goal.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Yearly Campaign', icon: '📅', item: goal, view: 'yearly' });
            }
        });
        
        // Search Monthly Goals
        this.monthlyGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchLower) || 
                (goal.description && goal.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Monthly Raid', icon: '🗓️', item: goal, view: 'monthly' });
            }
        });
        
        // Search Weekly Goals
        this.weeklyGoals.forEach(goal => {
            if (goal.title.toLowerCase().includes(searchLower) || 
                (goal.description && goal.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Weekly Battle', icon: '⚔️', item: goal, view: 'weekly' });
            }
        });
        
        // Search Daily Tasks
        this.dailyTasks.forEach(task => {
            if (task.title.toLowerCase().includes(searchLower) || 
                (task.description && task.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Daily Task', icon: '🗡️', item: task, view: 'daily' });
            }
        });
        
        // Search Side Quests
        this.sideQuests.forEach(quest => {
            if (quest.title.toLowerCase().includes(searchLower) || 
                (quest.description && quest.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Side Quest', icon: '🧭', item: quest, view: 'sidequests' });
            }
        });
        
        // Search Habits
        this.habits.forEach(habit => {
            if (habit.title.toLowerCase().includes(searchLower) || 
                (habit.description && habit.description.toLowerCase().includes(searchLower))) {
                results.push({ type: 'Daily Ritual', icon: '🕯️', item: habit, view: 'habits' });
            }
        });
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center text-amber-300 fancy-font py-8">
                    <i class="ri-search-off-line text-5xl mb-3 opacity-50"></i>
                    <p>No results found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="mb-4 text-sm text-amber-400 fancy-font">
                Found ${results.length} result${results.length !== 1 ? 's' : ''}
            </div>
            <div class="space-y-3">
                ${results.map(result => `
                    <div class="bg-gradient-to-br from-gray-800 to-stone-900 p-4 rounded-lg border-2 border-amber-700 hover:border-amber-500 cursor-pointer transition-all" 
                        onclick="goalManager.closeSearch(); goalManager.switchView('${result.view}');">
                        <div class="flex items-center gap-3">
                            <div class="text-3xl">${result.icon}</div>
                            <div class="flex-1">
                                <div class="text-xs text-amber-400 fancy-font mb-1">${result.type}</div>
                                <div class="text-lg font-bold text-amber-200 medieval-title ${result.item.completed ? 'line-through opacity-60' : ''}">${result.item.title}</div>
                                ${result.item.description ? `<div class="text-sm text-amber-300 fancy-font mt-1">${result.item.description}</div>` : ''}
                            </div>
                            ${result.item.completed ? '<div class="text-green-400 text-2xl">✓</div>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    }

    // ==================== PRIORITY SELECTION MODAL ====================
    
    showPriorityModal(currentPriority = 'medium', callback) {
        // Remove existing modal if any
        const existingModal = document.getElementById('priority-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'priority-modal';
        modal.className = 'fixed inset-0 bg-black/70 z-50 overflow-hidden';
        modal.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 24px;';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl shadow-2xl border-4 border-amber-600 animate-slide-down" style="width: 280px; max-width: calc(100vw - 48px);">
                <h3 class="text-xl font-bold text-amber-300 medieval-title mb-4 text-center">
                    <i class="ri-flag-line mr-2"></i>Select Priority
                </h3>
                <div class="space-y-3">
                    <button onclick="goalManager.selectPriority('high')" 
                        class="w-full p-4 rounded-lg border-2 transition-all hover:scale-105 flex items-center gap-3
                        ${currentPriority === 'high' ? 'bg-red-700 border-red-500 ring-2 ring-red-400' : 'bg-red-900/50 border-red-700 hover:bg-red-800'}">
                        <span class="text-2xl">🔥</span>
                        <div class="text-left">
                            <div class="font-bold text-red-200">High Priority</div>
                            <div class="text-xs text-red-300/70">Urgent and important</div>
                        </div>
                    </button>
                    <button onclick="goalManager.selectPriority('medium')" 
                        class="w-full p-4 rounded-lg border-2 transition-all hover:scale-105 flex items-center gap-3
                        ${currentPriority === 'medium' ? 'bg-yellow-700 border-yellow-500 ring-2 ring-yellow-400' : 'bg-yellow-900/50 border-yellow-700 hover:bg-yellow-800'}">
                        <span class="text-2xl">⭐</span>
                        <div class="text-left">
                            <div class="font-bold text-yellow-200">Medium Priority</div>
                            <div class="text-xs text-yellow-300/70">Normal importance</div>
                        </div>
                    </button>
                    <button onclick="goalManager.selectPriority('low')" 
                        class="w-full p-4 rounded-lg border-2 transition-all hover:scale-105 flex items-center gap-3
                        ${currentPriority === 'low' ? 'bg-gray-600 border-gray-400 ring-2 ring-gray-300' : 'bg-gray-700/50 border-gray-600 hover:bg-gray-600'}">
                        <span class="text-2xl">🪶</span>
                        <div class="text-left">
                            <div class="font-bold text-gray-200">Low Priority</div>
                            <div class="text-xs text-gray-300/70">Can wait if needed</div>
                        </div>
                    </button>
                </div>
                <button onclick="goalManager.closePriorityModal()" 
                    class="w-full mt-4 p-2 text-gray-400 hover:text-white text-sm fancy-font">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.priorityCallback = callback;
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePriorityModal();
            }
        });
    }

    selectPriority(priority) {
        const callback = this.priorityCallback;
        this.closePriorityModal();
        if (callback) {
            callback(priority);
        }
    }

    closePriorityModal() {
        const modal = document.getElementById('priority-modal');
        if (modal) modal.remove();
        this.priorityCallback = null;
    }

    // ==================== CUSTOM INPUT MODAL ====================
    
    showInputModal(options, callback) {
        const {
            title = 'Enter Value',
            placeholder = '',
            defaultValue = '',
            inputType = 'text',
            icon = 'ri-edit-line',
            buttonText = 'Confirm',
            optional = false
        } = options;

        const existingModal = document.getElementById('input-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'input-modal';
        modal.className = 'fixed inset-0 bg-black/70 z-50 overflow-hidden';
        modal.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 24px;';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl shadow-2xl border-4 border-amber-600 animate-slide-down" style="width: 320px; max-width: calc(100vw - 48px);">
                <h3 class="text-lg font-bold text-amber-300 medieval-title mb-4 text-center">
                    <i class="${icon} mr-2"></i>${title}
                </h3>
                <div class="space-y-4">
                    ${inputType === 'textarea' ? `
                        <textarea id="modal-input" 
                            class="w-full p-3 rounded-lg bg-gray-700/50 border-2 border-amber-600/50 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none fancy-font resize-none"
                            placeholder="${placeholder}"
                            rows="3">${defaultValue}</textarea>
                    ` : `
                        <input type="${inputType}" id="modal-input" 
                            class="w-full p-3 rounded-lg bg-gray-700/50 border-2 border-amber-600/50 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none fancy-font"
                            placeholder="${placeholder}"
                            value="${defaultValue}">
                    `}
                    <div class="flex gap-3">
                        <button onclick="goalManager.closeInputModal()" 
                            class="flex-1 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-all fancy-font">
                            Cancel
                        </button>
                        <button onclick="goalManager.submitInputModal()" 
                            class="flex-1 p-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold transition-all fancy-font">
                            ${buttonText}
                        </button>
                    </div>
                    ${optional ? '<p class="text-xs text-gray-400 text-center fancy-font">Leave empty to skip</p>' : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.inputCallback = callback;
        this.inputOptional = optional;

        // Focus and select input
        setTimeout(() => {
            const input = document.getElementById('modal-input');
            if (input) {
                input.focus();
                if (inputType !== 'textarea') input.select();
            }
        }, 100);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeInputModal();
            }
        });

        // Handle Enter key
        const input = modal.querySelector('#modal-input');
        if (input && inputType !== 'textarea') {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitInputModal();
                }
            });
        }
    }

    submitInputModal() {
        const input = document.getElementById('modal-input');
        const value = input ? input.value : '';
        const callback = this.inputCallback;
        const optional = this.inputOptional;
        
        this.closeInputModal();
        
        if (callback) {
            if (value.trim() || optional) {
                callback(value);
            }
        }
    }

    closeInputModal() {
        const modal = document.getElementById('input-modal');
        if (modal) modal.remove();
        this.inputCallback = null;
        this.inputOptional = false;
    }

    // ==================== CUSTOM SELECT MODAL ====================
    
    showSelectModal(options, callback) {
        const {
            title = 'Select Option',
            icon = 'ri-list-check',
            choices = [] // [{value: 'x', label: 'X', icon: '🔥', description: '...'}]
        } = options;

        const existingModal = document.getElementById('select-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'select-modal';
        modal.className = 'fixed inset-0 bg-black/70 z-50 overflow-hidden';
        modal.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 24px;';
        
        const choicesHtml = choices.map(c => `
            <button onclick="goalManager.selectOption('${c.value}')" 
                class="w-full p-3 rounded-lg border-2 transition-all hover:scale-102 flex items-center gap-3 bg-gray-700/50 border-gray-600 hover:bg-gray-600 hover:border-amber-500">
                ${c.icon ? `<span class="text-xl">${c.icon}</span>` : ''}
                <div class="text-left flex-1">
                    <div class="font-semibold text-gray-200">${c.label}</div>
                    ${c.description ? `<div class="text-xs text-gray-400">${c.description}</div>` : ''}
                </div>
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl shadow-2xl border-4 border-amber-600 animate-slide-down" style="width: 320px; max-width: calc(100vw - 48px); max-height: calc(100vh - 48px); overflow-y: auto;">
                <h3 class="text-lg font-bold text-amber-300 medieval-title mb-4 text-center">
                    <i class="${icon} mr-2"></i>${title}
                </h3>
                <div class="space-y-2">
                    ${choicesHtml}
                </div>
                <button onclick="goalManager.closeSelectModal()" 
                    class="w-full mt-4 p-2 text-gray-400 hover:text-white text-sm fancy-font">
                    Cancel
                </button>
            </div>
        `;

        document.body.appendChild(modal);
        this.selectCallback = callback;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSelectModal();
            }
        });
    }

    selectOption(value) {
        const callback = this.selectCallback;
        this.closeSelectModal();
        if (callback) {
            callback(value);
        }
    }

    closeSelectModal() {
        const modal = document.getElementById('select-modal');
        if (modal) modal.remove();
        this.selectCallback = null;
    }

    // Notification System
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationsEnabled = permission === 'granted';
        }
    }

    showNotification(title, body, icon = '⚔️') {
        if (!this.notificationsEnabled || !('Notification' in window)) {
            return;
        }

        try {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'quest-journal',
                requireInteraction: false
            });
        } catch (error) {
            // Notification failed silently
        }
    }

    // ==================== TASK REMINDERS ====================
    
    initializeReminders() {
        // Load reminder settings
        const savedSettings = localStorage.getItem('reminderSettings');
        if (savedSettings) {
            this.reminderSettings = JSON.parse(savedSettings);
        } else {
            this.reminderSettings = {
                enabled: true,
                morningReminder: true,
                morningTime: '09:00',
                eveningReminder: true,
                eveningTime: '18:00',
                overdueAlert: true
            };
        }
        
        // Schedule daily reminders
        this.scheduleDailyReminders();
        
        // Check for overdue tasks periodically
        this.checkOverdueTasks();
        setInterval(() => this.checkOverdueTasks(), 30 * 60 * 1000); // Every 30 minutes
    }

    scheduleDailyReminders() {
        if (!this.reminderSettings.enabled) return;
        
        const now = new Date();
        
        // Schedule morning reminder
        if (this.reminderSettings.morningReminder) {
            const [hours, mins] = this.reminderSettings.morningTime.split(':').map(Number);
            const morningTime = new Date(now);
            morningTime.setHours(hours, mins, 0, 0);
            
            if (morningTime > now) {
                const delay = morningTime - now;
                setTimeout(() => {
                    this.sendMorningReminder();
                    // Reschedule for next day
                    setTimeout(() => this.scheduleDailyReminders(), 1000);
                }, delay);
            }
        }
        
        // Schedule evening reminder
        if (this.reminderSettings.eveningReminder) {
            const [hours, mins] = this.reminderSettings.eveningTime.split(':').map(Number);
            const eveningTime = new Date(now);
            eveningTime.setHours(hours, mins, 0, 0);
            
            if (eveningTime > now) {
                const delay = eveningTime - now;
                setTimeout(() => {
                    this.sendEveningReminder();
                }, delay);
            }
        }
    }

    sendMorningReminder() {
        const todayStr = this.getTodayDateString();
        const todayTasks = this.dailyTasks.filter(t => t.dueDate === todayStr && !t.completed);
        const incompleteHabits = this.habits.filter(h => !h.completedToday);
        
        if (todayTasks.length > 0 || incompleteHabits.length > 0) {
            let body = '';
            if (todayTasks.length > 0) {
                body += `📋 ${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''} for today`;
            }
            if (incompleteHabits.length > 0) {
                body += (body ? ' • ' : '') + `🔄 ${incompleteHabits.length} habit${incompleteHabits.length !== 1 ? 's' : ''} to complete`;
            }
            
            this.showNotification('🌅 Good Morning, Adventurer!', body);
        }
    }

    sendEveningReminder() {
        const todayStr = this.getTodayDateString();
        const incompleteTasks = this.dailyTasks.filter(t => t.dueDate === todayStr && !t.completed);
        const incompleteHabits = this.habits.filter(h => !h.completedToday);
        
        if (incompleteTasks.length > 0 || incompleteHabits.length > 0) {
            let body = 'Before the day ends: ';
            if (incompleteTasks.length > 0) {
                body += `${incompleteTasks.length} task${incompleteTasks.length !== 1 ? 's' : ''} remaining`;
            }
            if (incompleteHabits.length > 0) {
                body += (incompleteTasks.length > 0 ? ', ' : '') + `${incompleteHabits.length} habit${incompleteHabits.length !== 1 ? 's' : ''} to complete`;
            }
            
            this.showNotification('🌆 Evening Check-in', body);
        } else {
            this.showNotification('🏆 Quest Complete!', 'Amazing! All tasks and habits done for today!');
        }
    }

    checkOverdueTasks() {
        if (!this.reminderSettings.enabled || !this.reminderSettings.overdueAlert) return;
        
        const todayStr = this.getTodayDateString();
        const overdueTasks = this.dailyTasks.filter(t => 
            !t.completed && t.dueDate < todayStr
        );
        
        // Only notify once per session for overdue tasks
        if (overdueTasks.length > 0 && !this.overdueNotificationSent) {
            this.showNotification(
                '⚠️ Overdue Quests!',
                `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} that need attention`
            );
            this.overdueNotificationSent = true;
        }
    }

    updateReminderSettings(setting, value) {
        this.reminderSettings[setting] = value;
        localStorage.setItem('reminderSettings', JSON.stringify(this.reminderSettings));
        
        // Reschedule reminders if times changed
        if (setting === 'morningTime' || setting === 'eveningTime' || setting === 'enabled') {
            this.scheduleDailyReminders();
        }
    }

    renderReminderSettings() {
        const container = document.getElementById('reminder-settings-container');
        if (!container) return;
        
        const settings = this.reminderSettings;
        
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Master Toggle -->
                <div class="flex items-center justify-between">
                    <span class="text-amber-200 fancy-font">Enable Reminders</span>
                    <button onclick="goalManager.updateReminderSettings('enabled', ${!settings.enabled}); goalManager.renderReminderSettings();"
                        class="w-14 h-8 rounded-full transition-all ${settings.enabled ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span class="absolute w-6 h-6 bg-white rounded-full top-1 transition-all ${settings.enabled ? 'left-7' : 'left-1'}"></span>
                    </button>
                </div>
                
                ${settings.enabled ? `
                <!-- Morning Reminder -->
                <div class="flex items-center justify-between">
                    <span class="text-amber-200 fancy-font text-sm">🌅 Morning Reminder</span>
                    <div class="flex items-center gap-2">
                        <input type="time" value="${settings.morningTime}" 
                            onchange="goalManager.updateReminderSettings('morningTime', this.value)"
                            class="bg-amber-900/50 text-white px-2 py-1 rounded border border-amber-600 text-sm">
                        <button onclick="goalManager.updateReminderSettings('morningReminder', ${!settings.morningReminder}); goalManager.renderReminderSettings();"
                            class="w-10 h-6 rounded-full transition-all ${settings.morningReminder ? 'bg-green-600' : 'bg-gray-600'} relative">
                            <span class="absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings.morningReminder ? 'left-5' : 'left-1'}"></span>
                        </button>
                    </div>
                </div>
                
                <!-- Evening Reminder -->
                <div class="flex items-center justify-between">
                    <span class="text-amber-200 fancy-font text-sm">🌆 Evening Reminder</span>
                    <div class="flex items-center gap-2">
                        <input type="time" value="${settings.eveningTime}" 
                            onchange="goalManager.updateReminderSettings('eveningTime', this.value)"
                            class="bg-amber-900/50 text-white px-2 py-1 rounded border border-amber-600 text-sm">
                        <button onclick="goalManager.updateReminderSettings('eveningReminder', ${!settings.eveningReminder}); goalManager.renderReminderSettings();"
                            class="w-10 h-6 rounded-full transition-all ${settings.eveningReminder ? 'bg-green-600' : 'bg-gray-600'} relative">
                            <span class="absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings.eveningReminder ? 'left-5' : 'left-1'}"></span>
                        </button>
                    </div>
                </div>
                
                <!-- Overdue Alert -->
                <div class="flex items-center justify-between">
                    <span class="text-amber-200 fancy-font text-sm">⚠️ Overdue Alerts</span>
                    <button onclick="goalManager.updateReminderSettings('overdueAlert', ${!settings.overdueAlert}); goalManager.renderReminderSettings();"
                        class="w-10 h-6 rounded-full transition-all ${settings.overdueAlert ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span class="absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings.overdueAlert ? 'left-5' : 'left-1'}"></span>
                    </button>
                </div>
                ` : '<p class="text-gray-400 text-sm text-center">Enable reminders to configure notification times</p>'}
                
                <!-- Notification Status -->
                <div class="mt-4 pt-4 border-t border-amber-700/50">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-amber-300/70">Browser Notifications:</span>
                        <span class="${this.notificationsEnabled ? 'text-green-400' : 'text-red-400'}">
                            ${this.notificationsEnabled ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                    </div>
                    ${!this.notificationsEnabled ? `
                    <button onclick="goalManager.requestNotificationPermission().then(() => goalManager.renderReminderSettings())"
                        class="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded text-sm fancy-font">
                        Enable Browser Notifications
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showErrorNotification(message) {
        // Create error toast element
        let errorToast = document.getElementById('error-toast');
        if (!errorToast) {
            errorToast = document.createElement('div');
            errorToast.id = 'error-toast';
            errorToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md';
            document.body.appendChild(errorToast);
        }
        
        errorToast.innerHTML = `
            <div class="bg-gradient-to-r from-red-900 to-red-800 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-red-500 flex items-center gap-3 animate-slide-down">
                <i class="ri-error-warning-line text-2xl text-red-300"></i>
                <div class="flex-1">
                    <div class="font-bold fancy-font">Quest Failed!</div>
                    <div class="text-sm text-red-200">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-red-300 hover:text-white">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
        `;
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorToast.parentElement) {
                errorToast.remove();
            }
        }, 8000);
    }

    showLockedNotification(message) {
        // Create locked toast element - different from achievement notification
        let lockedToast = document.getElementById('locked-toast');
        if (!lockedToast) {
            lockedToast = document.createElement('div');
            lockedToast.id = 'locked-toast';
            lockedToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md';
            document.body.appendChild(lockedToast);
        }
        
        lockedToast.innerHTML = `
            <div class="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-gray-500 flex items-center gap-3 animate-slide-down">
                <i class="ri-lock-line text-2xl text-gray-300"></i>
                <div class="flex-1">
                    <div class="font-bold fancy-font">Locked</div>
                    <div class="text-sm text-gray-300">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-300 hover:text-white">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
        `;
        
        // Auto-remove after 3 seconds (shorter than errors)
        setTimeout(() => {
            if (lockedToast.parentElement) {
                lockedToast.remove();
            }
        }, 3000);
    }

    showSuccessNotification(message) {
        // Create success toast element
        let successToast = document.getElementById('success-toast');
        if (!successToast) {
            successToast = document.createElement('div');
            successToast.id = 'success-toast';
            successToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md';
            document.body.appendChild(successToast);
        }
        
        successToast.innerHTML = `
            <div class="bg-gradient-to-r from-green-900 to-green-800 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-green-500 flex items-center gap-3 animate-slide-down">
                <i class="ri-checkbox-circle-line text-2xl text-green-300"></i>
                <div class="flex-1">
                    <div class="font-bold fancy-font">Success!</div>
                    <div class="text-sm text-green-200">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-green-300 hover:text-white">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
        `;
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successToast.parentElement) {
                successToast.remove();
            }
        }, 5000);
    }

    // ==================== SEARCH FUNCTIONALITY ====================
    
    openSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'search-modal';
        modal.className = 'fixed inset-0 bg-black/70 z-[100] flex items-start justify-center pt-20 p-4';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-xl shadow-2xl border-4 border-indigo-600 w-full max-w-2xl max-h-[70vh] flex flex-col">
                <div class="p-4 border-b-2 border-indigo-600">
                    <div class="flex items-center gap-3">
                        <i class="ri-search-line text-2xl text-indigo-300"></i>
                        <input type="text" id="search-input" 
                            placeholder="Search all quests, tasks, and goals..."
                            class="flex-1 bg-indigo-800/50 text-white px-4 py-3 rounded-lg border-2 border-indigo-500 focus:border-indigo-400 outline-none fancy-font text-lg"
                            oninput="goalManager.performSearch(this.value)"
                            autofocus>
                        <button onclick="document.getElementById('search-modal').remove()" class="text-indigo-300 hover:text-white p-2" aria-label="Close search">
                            <i class="ri-close-line text-2xl" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button onclick="goalManager.filterSearchResults('all')" class="search-filter-btn active px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-600 text-white" data-filter="all">All</button>
                        <button onclick="goalManager.filterSearchResults('tasks')" class="search-filter-btn px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-800 text-indigo-300 hover:bg-indigo-700" data-filter="tasks">Tasks</button>
                        <button onclick="goalManager.filterSearchResults('goals')" class="search-filter-btn px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-800 text-indigo-300 hover:bg-indigo-700" data-filter="goals">Goals</button>
                        <button onclick="goalManager.filterSearchResults('habits')" class="search-filter-btn px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-800 text-indigo-300 hover:bg-indigo-700" data-filter="habits">Habits</button>
                        <button onclick="goalManager.filterSearchResults('sidequests')" class="search-filter-btn px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-800 text-indigo-300 hover:bg-indigo-700" data-filter="sidequests">Side Quests</button>
                    </div>
                </div>
                <div id="search-results" class="flex-1 overflow-y-auto p-4">
                    <div class="text-indigo-300 text-center fancy-font py-8">
                        <i class="ri-search-line text-4xl mb-2 block opacity-50"></i>
                        Start typing to search...
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentSearchFilter = 'all';
        
        // Focus the input
        setTimeout(() => document.getElementById('search-input')?.focus(), 100);
        
        // Add keyboard shortcut to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    filterSearchResults(filter) {
        this.currentSearchFilter = filter;
        
        // Update button styles
        document.querySelectorAll('.search-filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.className = 'search-filter-btn active px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-600 text-white';
            } else {
                btn.className = 'search-filter-btn px-3 py-1 rounded-lg text-sm fancy-font bg-indigo-800 text-indigo-300 hover:bg-indigo-700';
            }
        });
        
        // Re-run search with current query
        const input = document.getElementById('search-input');
        if (input && input.value) {
            this.performSearch(input.value);
        }
    }

    performSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = `
                <div class="text-indigo-300 text-center fancy-font py-8">
                    <i class="ri-search-line text-4xl mb-2 block opacity-50"></i>
                    Type at least 2 characters to search...
                </div>
            `;
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const results = [];
        const filter = this.currentSearchFilter || 'all';
        
        // Search daily tasks
        if (filter === 'all' || filter === 'tasks') {
            this.dailyTasks.forEach(task => {
                if (task.title.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'task',
                        icon: 'ri-sword-line',
                        color: 'orange',
                        title: task.title,
                        subtitle: `Daily Task • ${task.dueDate}`,
                        completed: task.completed,
                        view: 'daily',
                        id: task.id
                    });
                }
            });
        }
        
        // Search habits
        if (filter === 'all' || filter === 'habits') {
            this.habits.forEach(habit => {
                if (habit.name.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'habit',
                        icon: 'ri-repeat-line',
                        color: 'purple',
                        title: habit.name,
                        subtitle: `Daily Ritual • ${habit.streak || 0} day streak`,
                        completed: habit.completedToday,
                        view: 'daily',
                        id: habit.id
                    });
                }
            });
        }
        
        // Search weekly goals
        if (filter === 'all' || filter === 'goals') {
            this.weeklyGoals.forEach(goal => {
                if (goal.title.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'goal',
                        icon: 'ri-shield-line',
                        color: 'green',
                        title: goal.title,
                        subtitle: 'Weekly Goal',
                        completed: goal.completed,
                        view: 'weekly',
                        id: goal.id
                    });
                }
            });
            
            // Search monthly goals
            this.monthlyGoals.forEach(goal => {
                if (goal.title.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'goal',
                        icon: 'ri-book-3-line',
                        color: 'blue',
                        title: goal.title,
                        subtitle: 'Monthly Goal',
                        completed: goal.completed,
                        view: 'monthly',
                        id: goal.id
                    });
                }
            });
            
            // Search yearly goals
            this.yearlyGoals.forEach(goal => {
                if (goal.title.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'goal',
                        icon: 'ri-file-paper-2-line',
                        color: 'purple',
                        title: goal.title,
                        subtitle: 'Yearly Goal',
                        completed: goal.completed,
                        view: 'yearly',
                        id: goal.id
                    });
                }
            });
            
            // Search life goals
            this.lifeGoals.forEach(goal => {
                if (goal.title.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'goal',
                        icon: 'ri-flag-line',
                        color: 'red',
                        title: goal.title,
                        subtitle: 'Life Goal',
                        completed: goal.completed,
                        view: 'life-goals',
                        id: goal.id
                    });
                }
            });
        }
        
        // Search side quests
        if (filter === 'all' || filter === 'sidequests') {
            this.sideQuests.forEach(quest => {
                if (quest.title.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'sidequest',
                        icon: 'ri-compass-3-line',
                        color: 'cyan',
                        title: quest.title,
                        subtitle: `Side Quest • ${quest.priority} priority`,
                        completed: quest.completed,
                        view: 'sidequests',
                        id: quest.id
                    });
                }
            });
        }
        
        // Render results
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-indigo-300 text-center fancy-font py-8">
                    <i class="ri-emotion-sad-line text-4xl mb-2 block opacity-50"></i>
                    No quests found for "${query}"
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = `
            <div class="text-indigo-300 text-sm mb-3 fancy-font">${results.length} result${results.length !== 1 ? 's' : ''} found</div>
            ${results.map(r => `
                <div onclick="goalManager.goToSearchResult('${r.view}', '${r.id}'); document.getElementById('search-modal').remove();" 
                    class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-indigo-800/50 mb-2 ${r.completed ? 'opacity-60' : ''}">
                    <i class="${r.icon} text-2xl text-${r.color}-400"></i>
                    <div class="flex-1">
                        <div class="text-white font-bold ${r.completed ? 'line-through' : ''}">${r.title}</div>
                        <div class="text-indigo-300 text-sm">${r.subtitle}</div>
                    </div>
                    ${r.completed ? '<i class="ri-checkbox-circle-fill text-green-400 text-xl"></i>' : '<i class="ri-arrow-right-s-line text-indigo-400 text-xl"></i>'}
                </div>
            `).join('')}
        `;
    }

    goToSearchResult(view, id) {
        this.switchView(view);
        // Optionally scroll to or highlight the item
        setTimeout(() => {
            const element = document.querySelector(`[data-id="${id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-4', 'ring-yellow-400');
                setTimeout(() => element.classList.remove('ring-4', 'ring-yellow-400'), 2000);
            }
        }, 300);
    }

    scheduleEnchantmentExpiryNotification(enchantment) {
        const timeUntilExpiry = enchantment.expiresAt - Date.now();
        const warningTime = 5 * 60 * 1000; // 5 minutes

        if (timeUntilExpiry > warningTime) {
            setTimeout(() => {
                this.showNotification(
                    '⏰ Enchantment Expiring Soon!',
                    `${enchantment.name} will expire in 5 minutes`,
                    '✨'
                );
            }, timeUntilExpiry - warningTime);
        }
    }

    checkDailyTaskReminder() {
        const now = new Date();
        const hour = now.getHours();
        
        // Check at 8 PM if there are incomplete tasks
        if (hour === 20) {
            const incompleteTasks = this.dailyTasks.filter(t => !t.completed).length;
            if (incompleteTasks > 0) {
                this.showNotification(
                    '📋 Daily Tasks Reminder',
                    `You have ${incompleteTasks} incomplete task${incompleteTasks > 1 ? 's' : ''} today`,
                    '⚔️'
                );
            }
        }
    }

    // Quick Add Modal
    openQuickAdd() {
        const modal = document.getElementById('quick-add-modal');
        const input = document.getElementById('quick-add-input');
        if (modal && input) {
            modal.classList.remove('hidden');
            input.focus();
            input.value = '';
        }
    }

    closeQuickAdd() {
        const modal = document.getElementById('quick-add-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    handleQuickAdd(event) {
        if (event.key === 'Enter') {
            const input = event.target;
            const text = input.value.trim();
            
            if (text) {
                // Determine task type based on current view
                const currentView = document.querySelector('.view-container:not(.hidden)')?.id;
                
                if (currentView === 'habits-view') {
                    this.addHabit(text);
                } else if (currentView === 'sidequests-view') {
                    this.addSideQuest(text);
                } else if (currentView === 'weekly-view') {
                    this.addWeeklyGoal(text);
                } else if (currentView === 'monthly-view') {
                    this.addMonthlyGoal(text);
                } else {
                    // Default to daily task
                    this.addDailyTask(text);
                }
                
                this.closeQuickAdd();
            }
        } else if (event.key === 'Escape') {
            this.closeQuickAdd();
        }
    }

    // Bulk Actions
    toggleBulkSelectionMode() {
        this.bulkSelectionMode = !this.bulkSelectionMode;
        this.selectedItems.clear();
        
        if (this.bulkSelectionMode) {
            this.showAchievement('📦 Bulk Selection Mode Active', 'daily');
        }
        
        this.render();
    }

    toggleItemSelection(itemId, itemType) {
        const key = `${itemType}-${itemId}`;
        
        if (this.selectedItems.has(key)) {
            this.selectedItems.delete(key);
        } else {
            this.selectedItems.add(key);
        }
        
        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const count = this.selectedItems.size;
        const bulkActions = document.getElementById('bulk-actions-bar');
        const countDisplay = document.getElementById('bulk-selected-count');
        
        if (bulkActions) {
            if (count > 0) {
                bulkActions.classList.remove('hidden');
                if (countDisplay) {
                    countDisplay.textContent = count;
                }
            } else {
                bulkActions.classList.add('hidden');
            }
        }
    }

    bulkComplete() {
        let completed = 0;
        
        this.selectedItems.forEach(key => {
            const [type, id] = key.split('-');
            const itemId = Number(id);
            
            if (type === 'daily') {
                const task = this.dailyTasks.find(t => t.id === itemId);
                if (task && !task.completed) {
                    this.toggleDailyTask(itemId);
                    completed++;
                }
            } else if (type === 'weekly') {
                const goal = this.weeklyGoals.find(g => g.id === itemId);
                if (goal && !goal.completed) {
                    this.toggleWeeklyGoal(itemId);
                    completed++;
                }
            } else if (type === 'monthly') {
                const goal = this.monthlyGoals.find(g => g.id === itemId);
                if (goal && !goal.completed) {
                    this.toggleMonthlyGoal(itemId);
                    completed++;
                }
            }
        });
        
        this.selectedItems.clear();
        this.showAchievement(`✅ Completed ${completed} item${completed > 1 ? 's' : ''}!`, 'daily');
        this.render();
    }

    bulkArchive() {
        let archived = 0;
        
        this.selectedItems.forEach(key => {
            const [type, id] = key.split('-');
            const itemId = Number(id);
            
            let item = null;
            if (type === 'daily') {
                item = this.dailyTasks.find(t => t.id === itemId);
                if (item) this.dailyTasks = this.dailyTasks.filter(t => t.id !== itemId);
            } else if (type === 'weekly') {
                item = this.weeklyGoals.find(g => g.id === itemId);
                if (item) this.weeklyGoals = this.weeklyGoals.filter(g => g.id !== itemId);
            } else if (type === 'monthly') {
                item = this.monthlyGoals.find(g => g.id === itemId);
                if (item) this.monthlyGoals = this.monthlyGoals.filter(g => g.id !== itemId);
            } else if (type === 'yearly') {
                item = this.yearlyGoals.find(g => g.id === itemId);
                if (item) this.yearlyGoals = this.yearlyGoals.filter(g => g.id !== itemId);
            } else if (type === 'life') {
                item = this.lifeGoals.find(g => g.id === itemId);
                if (item) this.lifeGoals = this.lifeGoals.filter(g => g.id !== itemId);
            }
            
            if (item) {
                item.archivedAt = new Date().toISOString();
                this.archivedGoals.push(item);
                archived++;
            }
        });
        
        this.selectedItems.clear();
        this.showAchievement(`📦 Archived ${archived} item${archived > 1 ? 's' : ''}!`, 'daily');
        this.saveData();
        this.render();
    }

    bulkDelete() {
        if (!confirm(`Are you sure you want to delete ${this.selectedItems.size} item(s)? This cannot be undone.`)) {
            return;
        }
        
        let deleted = 0;
        
        this.selectedItems.forEach(key => {
            const [type, id] = key.split('-');
            const itemId = Number(id);
            
            if (type === 'daily') {
                this.dailyTasks = this.dailyTasks.filter(t => t.id !== itemId);
                deleted++;
            } else if (type === 'weekly') {
                this.weeklyGoals = this.weeklyGoals.filter(g => g.id !== itemId);
                deleted++;
            } else if (type === 'monthly') {
                this.monthlyGoals = this.monthlyGoals.filter(g => g.id !== itemId);
                deleted++;
            }
        });
        
        this.selectedItems.clear();
        this.showAchievement(`🗑️ Deleted ${deleted} item${deleted > 1 ? 's' : ''}!`, 'daily');
        this.saveData();
        this.render();
    }

    cancelBulkSelection() {
        this.bulkSelectionMode = false;
        this.selectedItems.clear();
        this.render();
    }

    // Tutorial System
    checkFirstTimeUser() {
        // Small delay to ensure DOM is fully loaded
        setTimeout(() => {
            if (!this.tutorialCompleted) {
                this.startTutorial();
            }
        }, 1000);
    }

    startTutorial() {
        this.tutorialActive = true;
        this.currentTutorialStep = 0;
        this.showTutorialStep();
    }

    tutorialSteps = [
        {
            title: "Welcome to Life Quest Journal! ⚔️",
            content: "Welcome, brave adventurer! This RPG-themed task manager will help you level up in real life. Let me show you around!",
            element: null,
            action: () => this.switchView('dashboard')
        },
        {
            title: "Your Dashboard 🏰",
            content: "This is your command center. Here you can see your level, XP, gold, and quick stats. Track your progress at a glance!",
            element: "a[href='#dashboard'].nav-link",
            action: null
        },
        {
            title: "Experience & Leveling 📊",
            content: "Complete tasks to earn XP and gold! Level up to unlock new rewards, spells, and abilities. Your current stats are shown in the top-right panel.",
            element: "#stats-content",
            action: null
        },
        {
            title: "Epic Quests 🚩",
            content: "Your life's grandest goals! Epic Quests are long-term life goals that can span years. Break them down into Yearly Campaigns for manageable progress.",
            element: "a[href='#life-goals'].nav-link",
            action: () => this.switchView('life-goals')
        },
        {
            title: "Yearly Campaigns 📜",
            content: "Year-long objectives! These connect to your Epic Quests above and break down into Monthly Raids. Perfect for big annual goals!",
            element: "a[href='#yearly'].nav-link",
            action: () => this.switchView('yearly')
        },
        {
            title: "Monthly & Weekly Goals 📅",
            content: "Plan bigger campaigns! Monthly Raids and Weekly Battles help you tackle larger projects. Link daily tasks to these goals to track progress.",
            element: "a[href='#weekly'].nav-link",
            action: () => this.switchView('weekly')
        },
        {
            title: "Daily Skirmishes ⚔️",
            content: "Your daily quests! Each task you complete earns XP and gold. You'll also find Daily Rituals (habits) and Recurring Tasks here!",
            element: "a[href='#daily'].nav-link",
            action: () => this.switchView('daily')
        },
        {
            title: "Recurring Tasks 🔄",
            content: "Tasks that repeat automatically! Set up weekly or monthly recurring tasks and they'll appear on the right days. Find them in Daily Skirmishes!",
            element: null,
            action: null
        },
        {
            title: "Daily Rituals 🕯️",
            content: "Build streaks with daily habits! Complete them every day to build powerful streaks. The heat map shows your consistency over time.",
            element: null,
            action: null
        },
        {
            title: "Quest Calendar 📆",
            content: "See all your quests on a calendar! View tasks by day, plan ahead, and never miss a deadline. Click any day to see what's due.",
            element: "a[href='#calendar'].nav-link",
            action: () => this.switchView('calendar')
        },
        {
            title: "Side Quests 🧭",
            content: "Quick tasks without deadlines! Perfect for ideas, someday-maybes, or tasks that don't fit a specific timeline. Tackle them whenever you're ready!",
            element: "a[href='#sidequests'].nav-link",
            action: () => this.switchView('sidequests')
        },
        {
            title: "Treasury & Rewards 🏆",
            content: "Spend your gold here! Open treasure chests for spells, themes, and companions. Unlock kingdom themes to customize your look, and equip earned titles!",
            element: "a[href='#rewards'].nav-link",
            action: () => this.switchView('rewards')
        },
        {
            title: "Spellbook 📖",
            content: "Collect powerful spells from treasure chests! Cast spells for helpful effects like bonus XP, gold boosts, or guaranteed rare loot.",
            element: "a[href='#spellbook'].nav-link",
            action: () => this.switchView('spellbook')
        },
        {
            title: "Focus Timer 🎯",
            content: "Deep work sessions! Complete 25-minute Pomodoro sessions to earn Focus Crystals. Stay focused to build your currency for enchantments!",
            element: "a[href='#focus'].nav-link",
            action: () => this.switchView('focus')
        },
        {
            title: "Enchantments ✨",
            content: "Magical power-ups! Spend your Focus Crystals on temporary buffs like 2x XP, 2x Gold, Boss Damage, and more. Stack them for maximum power!",
            element: "a[href='#enchantments'].nav-link",
            action: () => this.switchView('enchantments')
        },
        {
            title: "Boss Battles 💀",
            content: "Epic challenges! Turn your life goals into boss fights. Deal damage by completing sub-goals and defeat them for legendary rewards!",
            element: "a[href='#bossbattles'].nav-link",
            action: () => this.switchView('bossbattles')
        },
        {
            title: "Quest Chains ⛓️",
            content: "Multi-step adventures! Quest Chains are guided storylines with multiple chapters. Complete sequential tasks to unlock the next chapter and earn epic rewards!",
            element: "a[href='#questchains'].nav-link",
            action: () => this.switchView('questchains')
        },
        {
            title: "Analytics 📈",
            content: "Track your progress over time! See charts of your productivity, completion rates, and streaks. Identify patterns and optimize your quest strategy!",
            element: "a[href='#analytics'].nav-link",
            action: () => this.switchView('analytics')
        },
        {
            title: "Global Search 🔍",
            content: "Find anything instantly! Press Ctrl+K or / to search all your tasks, goals, and habits. Click a result to jump right to it.",
            element: null,
            action: null
        },
        {
            title: "Keyboard Shortcuts ⌨️",
            content: "Work faster with hotkeys:\n• N - Quick add task\n• Ctrl+K or / - Search\n• Ctrl+Z - Undo\n• Ctrl+Y - Redo\n\nMaster these to become unstoppable!",
            element: null,
            action: null
        },
        {
            title: "Ready to Begin! 🎉",
            content: "You're all set! Start by adding your first daily task or goal. Remember: every quest completed makes you stronger. Good luck, hero! You can replay this tutorial anytime from Tools & Settings.",
            element: null,
            action: () => this.switchView('dashboard')
        }
    ];

    showTutorialStep() {
        const step = this.tutorialSteps[this.currentTutorialStep];
        if (!step) {
            this.endTutorial();
            return;
        }

        // Show tutorial overlay and tooltip
        const overlay = document.getElementById('tutorial-overlay');
        const tooltip = document.getElementById('tutorial-tooltip');
        const spotlight = document.getElementById('tutorial-spotlight');
        
        if (!overlay || !tooltip) return;

        overlay.classList.remove('hidden');
        
        // Update tooltip content
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-content').innerHTML = step.content.replace(/\n/g, '<br>');
        document.getElementById('tutorial-step-number').textContent = `${this.currentTutorialStep + 1} / ${this.tutorialSteps.length}`;
        
        // Update button text
        const nextBtn = document.getElementById('tutorial-next-btn');
        if (nextBtn) {
            nextBtn.textContent = this.currentTutorialStep === this.tutorialSteps.length - 1 ? '🎉 Start My Adventure!' : 'Next →';
        }

        // Execute step action after a small delay to let the view render
        setTimeout(() => {
            if (step.action) {
                step.action();
            }

            // Position spotlight on element if specified - longer delay for view rendering
            setTimeout(() => {
                if (step.element && spotlight) {
                    const targetElement = document.querySelector(step.element);
                    if (targetElement) {
                        // Scroll element into view first
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Wait for scroll animation to complete before getting rect
                        setTimeout(() => {
                            const rect = targetElement.getBoundingClientRect();
                            spotlight.style.display = 'block';
                            spotlight.style.top = `${rect.top - 10}px`;
                            spotlight.style.left = `${rect.left - 10}px`;
                            spotlight.style.width = `${rect.width + 20}px`;
                            spotlight.style.height = `${rect.height + 20}px`;
                            
                            // Position tooltip to not cover the highlighted element
                            this.positionTooltip(rect, tooltip);
                        }, 400);
                    } else {
                        spotlight.style.display = 'none';
                        this.centerTooltip(tooltip);
                    }
                } else if (spotlight) {
                    spotlight.style.display = 'none';
                    this.centerTooltip(tooltip);
                }
            }, 500);
        }, 100);
    }

    positionTooltip(targetRect, tooltip) {
        // Check if there's enough space above or below the target
        const viewportHeight = window.innerHeight;
        const tooltipHeight = 400; // Approximate height
        const spaceAbove = targetRect.top;
        const spaceBelow = viewportHeight - targetRect.bottom;
        
        // If target is in the middle third of the screen, center tooltip
        if (targetRect.top > viewportHeight / 3 && targetRect.bottom < (viewportHeight * 2 / 3)) {
            this.centerTooltip(tooltip);
        } else if (spaceBelow > tooltipHeight + 50) {
            // Position below if there's space
            tooltip.style.top = `${targetRect.bottom + 30}px`;
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translateX(-50%)';
        } else if (spaceAbove > tooltipHeight + 50) {
            // Position above if there's space
            tooltip.style.top = `${targetRect.top - tooltipHeight - 30}px`;
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translateX(-50%)';
        } else {
            // Default: center it
            this.centerTooltip(tooltip);
        }
    }

    centerTooltip(tooltip) {
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }

    nextTutorialStep() {
        this.currentTutorialStep++;
        this.showTutorialStep();
    }

    previousTutorialStep() {
        if (this.currentTutorialStep > 0) {
            this.currentTutorialStep--;
            this.showTutorialStep();
        }
    }

    skipTutorial() {
        if (confirm('Are you sure you want to skip the tutorial? You can always restart it from Tools & Settings.')) {
            this.endTutorial();
        }
    }

    endTutorial() {
        this.tutorialActive = false;
        this.tutorialCompleted = true;
        this.currentTutorialStep = 0;
        
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        
        this.saveData();
        this.showAchievement('🎓 Tutorial completed! You\'re ready to conquer your quests!', 'weekly');
        
        // Show starter tasks modal after tutorial
        setTimeout(() => this.showStarterTasksModal(), 500);
    }

    restartTutorial() {
        this.tutorialCompleted = false;
        this.startTutorial();
    }

    // Preset Starter Tasks System
    starterTaskPresets = {
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

    showStarterTasksModal() {
        const modal = document.createElement('div');
        modal.id = 'starter-tasks-modal';
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-gradient-to-b from-amber-900 to-stone-900 rounded-xl border-2 border-amber-600 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <div class="p-6 border-b border-amber-700">
                    <h2 class="text-2xl font-bold text-amber-300 medieval-title text-center">⚔️ Choose Your Starting Quests</h2>
                    <p class="text-amber-100/80 text-center mt-2 text-sm">Select preset tasks to jumpstart your adventure, or start fresh!</p>
                </div>
                
                <div class="p-6 overflow-y-auto max-h-[60vh]">
                    <!-- Quick Start Options -->
                    <div class="mb-6">
                        <h3 class="text-lg font-bold text-yellow-300 mb-3">🚀 Quick Start Packs</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onclick="goalManager.addStarterPack('wellness')" class="bg-green-800/50 hover:bg-green-700/50 border border-green-600 rounded-lg p-4 text-left transition-all">
                                <div class="text-green-300 font-bold">🌿 Wellness Starter</div>
                                <div class="text-green-200/70 text-xs mt-1">Daily: Water, Exercise, Meditate, Sleep</div>
                            </button>
                            <button onclick="goalManager.addStarterPack('productivity')" class="bg-blue-800/50 hover:bg-blue-700/50 border border-blue-600 rounded-lg p-4 text-left transition-all">
                                <div class="text-blue-300 font-bold">⚡ Productivity Starter</div>
                                <div class="text-blue-200/70 text-xs mt-1">Daily: Read, Journal + Weekly: Goals Review</div>
                            </button>
                            <button onclick="goalManager.addStarterPack('fitness')" class="bg-red-800/50 hover:bg-red-700/50 border border-red-600 rounded-lg p-4 text-left transition-all">
                                <div class="text-red-300 font-bold">💪 Fitness Starter</div>
                                <div class="text-red-200/70 text-xs mt-1">Daily: Exercise, Walk + Weekly: 3 Workouts</div>
                            </button>
                            <button onclick="goalManager.addStarterPack('balanced')" class="bg-purple-800/50 hover:bg-purple-700/50 border border-purple-600 rounded-lg p-4 text-left transition-all">
                                <div class="text-purple-300 font-bold">⚖️ Balanced Life</div>
                                <div class="text-purple-200/70 text-xs mt-1">Mix of health, productivity & social tasks</div>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Custom Selection -->
                    <div class="border-t border-amber-700/50 pt-6">
                        <h3 class="text-lg font-bold text-yellow-300 mb-3">📋 Or Pick Individual Tasks</h3>
                        
                        <!-- Daily Tasks -->
                        <div class="mb-4">
                            <div class="text-amber-400 font-semibold mb-2 text-sm">Daily Quests</div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="starter-daily-tasks">
                                ${this.starterTaskPresets.daily.map((task, i) => `
                                    <label class="flex items-center gap-2 bg-stone-800/50 rounded p-2 cursor-pointer hover:bg-stone-700/50 transition-all">
                                        <input type="checkbox" class="starter-task-checkbox" data-type="daily" data-index="${i}" class="rounded">
                                        <span class="text-stone-200 text-xs">${task.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Weekly Tasks -->
                        <div class="mb-4">
                            <div class="text-amber-400 font-semibold mb-2 text-sm">Weekly Quests</div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="starter-weekly-tasks">
                                ${this.starterTaskPresets.weekly.map((task, i) => `
                                    <label class="flex items-center gap-2 bg-stone-800/50 rounded p-2 cursor-pointer hover:bg-stone-700/50 transition-all">
                                        <input type="checkbox" class="starter-task-checkbox" data-type="weekly" data-index="${i}" class="rounded">
                                        <span class="text-stone-200 text-xs">${task.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Monthly Tasks -->
                        <div class="mb-4">
                            <div class="text-amber-400 font-semibold mb-2 text-sm">Monthly Quests</div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="starter-monthly-tasks">
                                ${this.starterTaskPresets.monthly.map((task, i) => `
                                    <label class="flex items-center gap-2 bg-stone-800/50 rounded p-2 cursor-pointer hover:bg-stone-700/50 transition-all">
                                        <input type="checkbox" class="starter-task-checkbox" data-type="monthly" data-index="${i}" class="rounded">
                                        <span class="text-stone-200 text-xs">${task.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 border-t border-amber-700 flex flex-wrap gap-3 justify-center bg-stone-900/50">
                    <button onclick="goalManager.addSelectedStarterTasks()" class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-4 py-2 rounded-lg font-bold transition-all">
                        ✅ Add Selected Tasks
                    </button>
                    <button onclick="goalManager.closeStarterTasksModal()" class="bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-500 hover:to-stone-600 text-white px-4 py-2 rounded-lg font-bold transition-all">
                        🚀 Start Fresh
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    closeStarterTasksModal() {
        const modal = document.getElementById('starter-tasks-modal');
        if (modal) modal.remove();
    }

    addStarterPack(packType) {
        const packs = {
            wellness: {
                daily: [0, 1, 3, 7], // Water, Exercise, Meditate, Sleep
                weekly: [],
                monthly: []
            },
            productivity: {
                daily: [2, 5], // Read, Journal
                weekly: [3], // Review goals
                monthly: [1] // Set monthly goals
            },
            fitness: {
                daily: [1, 8], // Exercise, Walk
                weekly: [5], // 3 workouts
                monthly: []
            },
            balanced: {
                daily: [0, 1, 2, 3], // Water, Exercise, Read, Meditate
                weekly: [1, 3], // Call friend, Review goals
                monthly: [0, 1] // Budget, Monthly goals
            }
        };

        const pack = packs[packType];
        if (!pack) return;

        let added = 0;

        // Add daily tasks
        pack.daily.forEach(index => {
            const task = this.starterTaskPresets.daily[index];
            if (task) {
                this.dailyTasks.push({
                    id: Date.now() + added,
                    name: task.name,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
                added++;
            }
        });

        // Add weekly tasks
        pack.weekly.forEach(index => {
            const task = this.starterTaskPresets.weekly[index];
            if (task) {
                this.weeklyGoals.push({
                    id: Date.now() + added,
                    name: task.name,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
                added++;
            }
        });

        // Add monthly tasks
        pack.monthly.forEach(index => {
            const task = this.starterTaskPresets.monthly[index];
            if (task) {
                this.monthlyGoals.push({
                    id: Date.now() + added,
                    name: task.name,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
                added++;
            }
        });

        this.saveData();
        this.closeStarterTasksModal();
        this.render();
        this.showAchievement(`🎒 ${packType.charAt(0).toUpperCase() + packType.slice(1)} pack added! ${added} quests ready!`, 'weekly');
    }

    addSelectedStarterTasks() {
        const checkboxes = document.querySelectorAll('.starter-task-checkbox:checked');
        let added = 0;

        checkboxes.forEach(checkbox => {
            const type = checkbox.dataset.type;
            const index = parseInt(checkbox.dataset.index);
            const task = this.starterTaskPresets[type][index];

            if (task) {
                const newTask = {
                    id: Date.now() + added,
                    name: task.name,
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                if (type === 'daily') {
                    this.dailyTasks.push(newTask);
                } else if (type === 'weekly') {
                    this.weeklyGoals.push(newTask);
                } else if (type === 'monthly') {
                    this.monthlyGoals.push(newTask);
                }
                added++;
            }
        });

        this.saveData();
        this.closeStarterTasksModal();
        this.render();

        if (added > 0) {
            this.showAchievement(`📜 ${added} starter quests added! Your journey begins!`, 'weekly');
        } else {
            this.showAchievement('🚀 Starting fresh! Add quests when you\'re ready!', 'daily');
        }
    }

    startQuestChain(templateId) {
        const template = this.questChainTemplates[templateId];
        if (!template) return;

        const newChain = {
            id: Date.now(),
            templateId: templateId,
            startedAt: new Date().toISOString(),
            currentChapterIndex: 0,
            completedTasks: [],
            chapters: template.chapters
        };

        this.activeQuestChains.push(newChain);
        this.showAchievement(`🗺️ Started: ${template.name}!`, 'epic');
        this.createConfetti();
        
        this.saveData();
        this.render();
    }

    toggleChainTask(chainId, taskIndex) {
        const chain = this.activeQuestChains.find(c => c.id === Number(chainId));
        if (!chain) return;

        const currentChapter = chain.chapters[chain.currentChapterIndex];
        
        if (chain.completedTasks.includes(taskIndex)) {
            // Uncheck
            chain.completedTasks = chain.completedTasks.filter(i => i !== taskIndex);
        } else {
            // Check
            chain.completedTasks.push(taskIndex);
            this.showAchievement('✅ Task completed!', 'daily');

            // Check if all tasks in chapter are done
            if (chain.completedTasks.length === currentChapter.tasks.length) {
                this.completeChapter(chain);
            }
        }

        this.saveData();
        this.render();
    }

    completeChapter(chain) {
        const template = this.questChainTemplates[chain.templateId];
        if (!template) return; // Skip if template doesn't exist
        
        const currentChapter = chain.chapters[chain.currentChapterIndex];
        if (!currentChapter) return; // Skip if chapter doesn't exist

        // Grant rewards
        this.addXP(currentChapter.reward.xp, 'chain');
        this.addGold(currentChapter.reward.gold, 'chain');
        if (currentChapter.reward.spell) {
            this.addSpellToBook(currentChapter.reward.spell, currentChapter.reward.charges);
        }

        this.showAchievement(`📖 Chapter Complete: ${currentChapter.title}!`, 'epic');
        this.createConfetti();

        // Move to next chapter
        chain.currentChapterIndex++;
        chain.completedTasks = [];

        // Check if quest chain is complete
        if (chain.currentChapterIndex >= template.chapters.length) {
            this.completeQuestChain(chain);
        }

        this.saveData();
        this.render();
    }

    completeQuestChain(chain) {
        const template = this.questChainTemplates[chain.templateId];
        if (!template) {
            // Still complete the chain even if template is missing
            chain.completedAt = new Date().toISOString();
            this.completedQuestChains.push(chain);
            this.activeQuestChains = this.activeQuestChains.filter(c => c.id !== chain.id);
            return;
        }
        
        chain.completedAt = new Date().toISOString();
        this.completedQuestChains.push(chain);
        this.activeQuestChains = this.activeQuestChains.filter(c => c.id !== chain.id);

        // Epic celebration
        this.createConfetti();
        setTimeout(() => this.createConfetti(), 500);
        setTimeout(() => this.createConfetti(), 1000);

        // Massive rewards
        this.addXP(5000, 'chain');
        this.addGold(5000, 'chain');

        this.showAchievement(`🏆 QUEST CHAIN MASTERED: ${template.name}!`, 'legendary');
        
        // Unlock special badge
        this.unlockBadge(
            'chain_' + template.id,
            'Chain Master',
            `Completed ${template.name}`,
            template.icon
        );

        this.saveData();
        this.render();
    }

    abandonQuestChain(chainId) {
        if (!confirm('Abandon this quest chain? All progress will be lost.')) return;

        this.activeQuestChains = this.activeQuestChains.filter(c => c.id !== Number(chainId));
        this.showAchievement('Quest chain abandoned', 'daily');
        
        this.saveData();
        this.render();
    }
}

// Global functions for onclick handlers
let goalManager;

function addLifeGoal() {
    if (window.goalManager) goalManager.addLifeGoal();
}

function addYearlyGoal() {
    if (window.goalManager) goalManager.addYearlyGoal();
}

function addMonthlyGoal() {
    if (window.goalManager) goalManager.addMonthlyGoal();
}

function addWeeklyGoal() {
    if (window.goalManager) goalManager.addWeeklyGoal();
}

function addDailyTask() {
    if (window.goalManager) goalManager.addDailyTask();
}

// Global Error Handler - catches uncaught errors (log only, no notification)
window.onerror = function(message, source, lineno, colno, error) {
    // Log for debugging but don't bother the user with notifications
    // Most global errors are non-critical (extensions, third-party scripts, etc.)
    console.warn('Global error (suppressed notification):', { message, source, lineno, colno, error });
    return false;
};

// Handle unhandled promise rejections (log only, no notification)
window.onunhandledrejection = function(event) {
    // Log for debugging but don't bother the user
    // Common causes: audio playback, network hiccups, browser quirks
    console.warn('Unhandled promise rejection (suppressed notification):', event.reason);
};

// GoalManager is initialized in index.html now
