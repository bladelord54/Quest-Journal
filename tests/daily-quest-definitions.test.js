/**
 * daily-quest-definitions.js — the Daily Quest Board catalog (criterion-(2) single-source item).
 *
 * Under test: catalog shape, that every quest's level gate equals the unlock level of the feature it
 * tracks (the drift the audit found — a stale `6` on the weekly/side quests — can't recur), the
 * regression for that stale gate specifically, and the Board Sweep bonus.
 */
import FU from '../feature-unlocks.js';
import DQD from '../daily-quest-definitions.js';

describe('DAILY_QUEST_DEFINITIONS — shape', () => {
    test('frozen namespace, frozen pool, frozen entries', () => {
        expect(Object.isFrozen(DQD)).toBe(true);
        expect(Object.isFrozen(DQD.POOL)).toBe(true);
        expect(DQD.POOL.length).toBeGreaterThan(0);
        for (const q of DQD.POOL) expect(Object.isFrozen(q)).toBe(true);
    });

    test('every entry has the fields daily-quest-logic / daily-board-render read', () => {
        for (const q of DQD.POOL) {
            expect(typeof q.id).toBe('string');
            expect(typeof q.name).toBe('string');
            expect(typeof q.desc).toBe('string');
            expect(typeof q.icon).toBe('string');
            expect(Number.isInteger(q.minLevel) && q.minLevel >= 1).toBe(true);
            expect(q.xp).toBeGreaterThan(0);
            expect(q.gold).toBeGreaterThan(0);
            expect(typeof q.check).toBe('function');
        }
    });

    test('quest ids are unique', () => {
        const ids = DQD.POOL.map(q => q.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('check() predicates are pure booleans over the tracking counters', () => {
        const zero = {
            tasksBeforeNoon: 0, tasksCompleted: 0, allHabitsComplete: false, habitsCompleted: 0, tasksCreated: 0,
            tasksAfter6pm: 0, xpEarned: 0, goldEarned: 0, chestsOpened: 0, spellsCast: 0, bossAttacks: 0,
            chargesEarned: 0, focusSessions: 0, crystalsEarned: 0, sideQuestsCompleted: 0, weeklyProgress: 0
        };
        for (const q of DQD.POOL) expect(q.check(zero)).toBeFalsy();
    });
});

describe('DAILY_QUEST_DEFINITIONS — gates are the feature ladder', () => {
    test('every quest minLevel equals the unlock level of the feature it tracks', () => {
        for (const q of DQD.POOL) {
            expect([q.id, q.minLevel]).toEqual([q.id, DQD.featureLevel(q)]);
        }
    });

    test('every referenced feature key resolves to a real level', () => {
        for (const q of DQD.POOL) expect(Number.isFinite(DQD.featureLevel(q))).toBe(true);
    });

    test('always-available quests (feature null) sit at level 1', () => {
        const open = DQD.POOL.filter(q => q.feature === null);
        expect(open.length).toBeGreaterThan(0);
        for (const q of open) expect(q.minLevel).toBe(1);
    });

    test('nav-gated quests follow FEATURE_UNLOCKS.LEVELS', () => {
        const byId = Object.fromEntries(DQD.POOL.map(q => [q.id, q]));
        expect(byId.treasure_hunter.minLevel).toBe(FU.LEVELS.rewards);
        expect(byId.gold_hoarder.minLevel).toBe(FU.LEVELS.rewards);
        expect(byId.spell_slinger.minLevel).toBe(FU.LEVELS.arcane);
        expect(byId.boss_striker.minLevel).toBe(FU.LEVELS.bossbattles);
        expect(byId.charge_collector.minLevel).toBe(FU.LEVELS.bossbattles);
        expect(byId.deep_focus.minLevel).toBe(FU.LEVELS.focus);
        expect(byId.crystal_miner.minLevel).toBe(FU.LEVELS.focus);
    });

    test('REGRESSION: side/weekly quests open with their goal tabs (default curve), not the pre-fork level 6', () => {
        const byId = Object.fromEntries(DQD.POOL.map(q => [q.id, q]));
        expect(byId.side_adventurer.minLevel).toBe(FU.GOAL_TAB_LEVELS.default.sidequests);
        expect(byId.weekly_warrior.minLevel).toBe(FU.GOAL_TAB_LEVELS.default.weekly);
        expect(byId.side_adventurer.minLevel).toBe(2);
        expect(byId.weekly_warrior.minLevel).toBe(2);
    });

    test('no quest is gated above the highest feature it could depend on', () => {
        const ceiling = Math.max(...Object.values(FU.LEVELS), ...Object.values(FU.GOAL_TAB_LEVELS.default));
        for (const q of DQD.POOL) expect(q.minLevel).toBeLessThanOrEqual(ceiling);
    });
});

describe('BOARD_SWEEP_BONUS', () => {
    test('is the single frozen source for the all-claimed bonus', () => {
        expect(Object.isFrozen(DQD.BOARD_SWEEP_BONUS)).toBe(true);
        expect(DQD.BOARD_SWEEP_BONUS).toEqual({ xp: 25, gold: 15 });
    });
});
