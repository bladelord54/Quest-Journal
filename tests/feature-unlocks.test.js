/**
 * feature-unlocks.js — the ONE source of progressive-unlock thresholds (Roadmap #1, 85th slice).
 *
 * Under test: the frozen tables, the tutorial↔level consistency that nothing previously enforced,
 * the shared isUnlocked / isFarOff predicates, and that loot-engine.js's companion gate now reads
 * the same constant (it used to be a bare `3`).
 */
import FEATURE_UNLOCKS from '../feature-unlocks.js';
import LOOT_ENGINE from '../loot-engine.js';

describe('FEATURE_UNLOCKS — tables', () => {
    test('exports a frozen namespace with frozen tables', () => {
        expect(Object.isFrozen(FEATURE_UNLOCKS)).toBe(true);
        expect(Object.isFrozen(FEATURE_UNLOCKS.LEVELS)).toBe(true);
        expect(Object.isFrozen(FEATURE_UNLOCKS.ARCANE_TAB_LEVELS)).toBe(true);
        expect(Object.isFrozen(FEATURE_UNLOCKS.TUTORIALS)).toBe(true);
        for (const t of Object.values(FEATURE_UNLOCKS.TUTORIALS)) expect(Object.isFrozen(t)).toBe(true);
    });

    test('nav-view thresholds are pinned', () => {
        expect(FEATURE_UNLOCKS.LEVELS).toEqual({
            dashboard: 1, goals: 1, daily: 1, calendar: 1, tools: 1,
            rewards: 2, arcane: 3, bossbattles: 4, focus: 5, questchains: 6
        });
    });

    test('arcane sub-tab thresholds are pinned and the spellbook opens WITH Arcane Powers', () => {
        expect(FEATURE_UNLOCKS.ARCANE_TAB_LEVELS).toEqual({ spellbook: 3, enchantments: 5 });
        expect(FEATURE_UNLOCKS.ARCANE_TAB_LEVELS.spellbook).toBe(FEATURE_UNLOCKS.LEVELS.arcane);
        // Enchantments ride the Focus Timer unlock (crystals are their currency).
        expect(FEATURE_UNLOCKS.ARCANE_TAB_LEVELS.enchantments).toBe(FEATURE_UNLOCKS.LEVELS.focus);
    });

    test('companions unlock with Arcane Powers', () => {
        expect(FEATURE_UNLOCKS.COMPANION_UNLOCK_LEVEL).toBe(3);
        expect(FEATURE_UNLOCKS.COMPANION_UNLOCK_LEVEL).toBe(FEATURE_UNLOCKS.LEVELS.arcane);
    });

    test('growth gates are pinned: referral bonus at 2, review prompt from 3', () => {
        expect(FEATURE_UNLOCKS.REFERRAL_REWARD_LEVEL).toBe(2);
        expect(FEATURE_UNLOCKS.REVIEW_PROMPT_MIN_LEVEL).toBe(3);
    });

    test('goal-manager.js reads the growth gates from the module, not bare literals', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'goal-manager.js'), 'utf8');
        expect(src).toContain('this.level < FEATURE_UNLOCKS.REFERRAL_REWARD_LEVEL');
        expect(src).toContain('Reach Level ${FEATURE_UNLOCKS.REFERRAL_REWARD_LEVEL} for a bonus chest');
        expect(src).toContain('this.level < FEATURE_UNLOCKS.REVIEW_PROMPT_MIN_LEVEL');
        expect(src).not.toContain('Reach Level 2 for a bonus chest');
    });

    test('every gated nav view has a celebration tutorial at EXACTLY its unlock level', () => {
        const gated = Object.entries(FEATURE_UNLOCKS.LEVELS).filter(([, lvl]) => lvl > 1);
        expect(gated.length).toBeGreaterThan(0);
        for (const [view, lvl] of gated) {
            expect([view, FEATURE_UNLOCKS.TUTORIALS[lvl]]).toEqual([view, expect.objectContaining({ title: expect.any(String), text: expect.any(String) })]);
        }
    });

    test('tutorials cover 2,3,4,5,6,8,10 only (L7/L9 retired; L8/L10 are the class milestones)', () => {
        expect(Object.keys(FEATURE_UNLOCKS.TUTORIALS).map(Number).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 8, 10]);
        expect(FEATURE_UNLOCKS.TUTORIALS[8].title).toContain('Class');
        expect(FEATURE_UNLOCKS.TUTORIALS[10].title).toContain('Legend');
    });

    test('the Arcane tutorial promises the welcome spell the unlock grants', () => {
        expect(FEATURE_UNLOCKS.TUTORIALS[FEATURE_UNLOCKS.LEVELS.arcane].text).toContain('welcome spell');
    });
});

describe('FEATURE_UNLOCKS.isUnlocked — the shared predicate', () => {
    const levels = { open: 1, gated: 4 };

    test('a key absent from the table is always unlocked', () => {
        expect(FEATURE_UNLOCKS.isUnlocked(levels, 'missing', 1)).toBe(true);
        expect(FEATURE_UNLOCKS.isUnlocked(levels, 'missing', 0)).toBe(true);
    });

    test('below / at / above the threshold', () => {
        expect(FEATURE_UNLOCKS.isUnlocked(levels, 'gated', 3)).toBe(false);
        expect(FEATURE_UNLOCKS.isUnlocked(levels, 'gated', 4)).toBe(true);
        expect(FEATURE_UNLOCKS.isUnlocked(levels, 'gated', 40)).toBe(true);
        expect(FEATURE_UNLOCKS.isUnlocked(levels, 'open', 1)).toBe(true);
    });

    test('works against every shipped table', () => {
        expect(FEATURE_UNLOCKS.isUnlocked(FEATURE_UNLOCKS.LEVELS, 'bossbattles', 3)).toBe(false);
        expect(FEATURE_UNLOCKS.isUnlocked(FEATURE_UNLOCKS.LEVELS, 'bossbattles', 4)).toBe(true);
        expect(FEATURE_UNLOCKS.isUnlocked(FEATURE_UNLOCKS.ARCANE_TAB_LEVELS, 'enchantments', 4)).toBe(false);
        expect(FEATURE_UNLOCKS.isUnlocked(FEATURE_UNLOCKS.ARCANE_TAB_LEVELS, 'enchantments', 5)).toBe(true);
    });
});

describe('FEATURE_UNLOCKS.isFarOff — the desktop-nav "More" collapse rule', () => {
    test('horizon is 2 levels', () => {
        expect(FEATURE_UNLOCKS.NAV_MORE_HORIZON).toBe(2);
    });

    test('the immediate next unlock stays visible; two-or-more out collapses', () => {
        expect(FEATURE_UNLOCKS.isFarOff(2, 1)).toBe(false);
        expect(FEATURE_UNLOCKS.isFarOff(3, 1)).toBe(true);
        expect(FEATURE_UNLOCKS.isFarOff(6, 1)).toBe(true);
        expect(FEATURE_UNLOCKS.isFarOff(6, 5)).toBe(false);
        expect(FEATURE_UNLOCKS.isFarOff(6, 4)).toBe(true);
    });

    test('unlocked views and non-numeric thresholds never collapse', () => {
        expect(FEATURE_UNLOCKS.isFarOff(1, 5)).toBe(false);
        expect(FEATURE_UNLOCKS.isFarOff(undefined, 1)).toBe(false);
        expect(FEATURE_UNLOCKS.isFarOff(null, 1)).toBe(false);
        expect(FEATURE_UNLOCKS.isFarOff('6', 1)).toBe(false);
    });

    test('a level-1 player sees rewards but collapses arcane..questchains', () => {
        const collapsed = Object.keys(FEATURE_UNLOCKS.LEVELS)
            .filter(v => FEATURE_UNLOCKS.isFarOff(FEATURE_UNLOCKS.LEVELS[v], 1));
        expect(collapsed).toEqual(['arcane', 'bossbattles', 'focus', 'questchains']);
    });
});

describe('FEATURE_UNLOCKS ↔ loot-engine.js — one companion gate', () => {
    const ctx = (level) => ({ rng: () => 0, level, companionLockedGold: { rare: [150, 300], default: [10, 20] } });
    const item = { type: 'companion', companions: ['cat', 'wolf'] };

    test('the gold fallback fires exactly below COMPANION_UNLOCK_LEVEL and a companion drops at it', () => {
        const L = FEATURE_UNLOCKS.COMPANION_UNLOCK_LEVEL;
        expect(LOOT_ENGINE.buildLootReward(item, 'rare', ctx(L - 1)).type).toBe('gold');
        expect(LOOT_ENGINE.buildLootReward(item, 'rare', ctx(L))).toEqual({ type: 'companion', value: 'cat', rarity: 'rare' });
    });

    test('loot-engine.js no longer hardcodes the gate', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'loot-engine.js'), 'utf8');
        expect(src).toContain('level < COMPANION_UNLOCK_LEVEL');
        expect(src).not.toMatch(/level\s*<\s*3\b/);
    });
});

describe('feature-unlocks.js — goal-tab curves (criterion-(2) item)', () => {
    test('GOAL_TAB_LEVELS holds both onboarding curves, frozen', () => {
        expect(Object.isFrozen(FEATURE_UNLOCKS.GOAL_TAB_LEVELS)).toBe(true);
        expect(Object.isFrozen(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.goals)).toBe(true);
        expect(Object.isFrozen(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.default)).toBe(true);
        expect(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.goals).toEqual({ weekly: 1, sidequests: 1, monthly: 1, yearly: 1, 'life-goals': 1 });
        expect(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.default).toEqual({ weekly: 2, sidequests: 2, monthly: 3, yearly: 4, 'life-goals': 4 });
    });

    test('goalTabLevelsForPath: only "goals" gets the Grand Planner curve', () => {
        expect(FEATURE_UNLOCKS.goalTabLevelsForPath('goals')).toBe(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.goals);
        for (const p of ['habits', null, undefined, 'nonsense']) {
            expect(FEATURE_UNLOCKS.goalTabLevelsForPath(p)).toBe(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.default);
        }
    });

    test('the default curve never gates a goal tab above the Quest Chains nav view (the top of the ladder)', () => {
        for (const lvl of Object.values(FEATURE_UNLOCKS.GOAL_TAB_LEVELS.default)) {
            expect(lvl).toBeLessThanOrEqual(FEATURE_UNLOCKS.LEVELS.questchains);
        }
    });
});
