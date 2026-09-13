/**
 * Unit Tests for daily-quest-logic.js
 *
 * Roadmap #1, 80th slice (25th LOGIC module): the pure Daily Quest Board rules that
 * goal-manager.js's generateDailyQuestBoard + checkDailyQuestCompletion delegate to.
 * The render half already lives in daily-board-render.js, so this closes the pair.
 * Coverage:
 *   - seededShuffle is deterministic per date, non-mutating, and a permutation.
 *   - pickDailyQuests filters by level, respects count, and stamps fresh records.
 *   - buildDailyQuestBoard returns the exact board shape the save/load path round-trips.
 *   - sweepQuestCompletions flips passing quests in place and reports new completions.
 *   - the frozen export surface + tolerant empty/null inputs.
 */

import DAILY_QUEST_LOGIC from '../daily-quest-logic.js';

// A synthetic pool mirroring the DAILY_QUEST_POOL shape (id / minLevel / check(tracking)),
// decoupled from the live catalog so these tests never drift when quests are re-tuned.
function makePool() {
    return [
        { id: 'a', minLevel: 1, xp: 10, gold: 5, check: (t) => t.tasks >= 1 },
        { id: 'b', minLevel: 1, xp: 20, gold: 10, check: (t) => t.tasks >= 3 },
        { id: 'c', minLevel: 1, xp: 30, gold: 15, check: (t) => t.habits >= 1 },
        { id: 'd', minLevel: 2, xp: 15, gold: 10, check: (t) => t.chests >= 1 },
        { id: 'e', minLevel: 3, xp: 20, gold: 15, check: (t) => t.spells >= 1 },
        { id: 'f', minLevel: 5, xp: 25, gold: 20, check: (t) => t.focus >= 1 },
    ];
}

describe('daily-quest-logic.js — seededShuffle', () => {
    test('is deterministic for a given date string', () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8];
        const a = DAILY_QUEST_LOGIC.seededShuffle(items, '2026-08-11');
        const b = DAILY_QUEST_LOGIC.seededShuffle(items, '2026-08-11');
        expect(a).toEqual(b);
    });

    test('different dates generally yield a different ordering', () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const a = DAILY_QUEST_LOGIC.seededShuffle(items, '2026-08-11');
        const b = DAILY_QUEST_LOGIC.seededShuffle(items, '2026-08-12');
        expect(a).not.toEqual(b);
    });

    test('does not mutate the input and returns a permutation', () => {
        const items = [1, 2, 3, 4, 5];
        const copy = [...items];
        const out = DAILY_QUEST_LOGIC.seededShuffle(items, '2026-01-01');
        expect(items).toEqual(copy); // untouched
        expect(out).not.toBe(items); // new array
        expect([...out].sort((x, y) => x - y)).toEqual(copy); // same elements
    });

    test('reproduces the original LCG output byte-for-byte', () => {
        // Mirror of the pre-extraction inline algorithm, run independently.
        const items = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
        const dateString = '2026-08-11';
        const expected = [...items];
        const seed = dateString.split('-').join('');
        let s = parseInt(seed) % 2147483647;
        for (let i = expected.length - 1; i > 0; i--) {
            s = (s * 16807) % 2147483647;
            const j = s % (i + 1);
            [expected[i], expected[j]] = [expected[j], expected[i]];
        }
        expect(DAILY_QUEST_LOGIC.seededShuffle(items, dateString)).toEqual(expected);
    });
});

describe('daily-quest-logic.js — pickDailyQuests', () => {
    test('filters out quests above the player level', () => {
        const picked = DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 1, '2026-08-11', 10);
        const ids = picked.map(q => q.id);
        // level 1 excludes d(2), e(3), f(5)
        expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c']));
        expect(ids).not.toContain('d');
        expect(ids).not.toContain('e');
        expect(ids).not.toContain('f');
    });

    test('a higher level unlocks more of the pool', () => {
        const picked = DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 5, '2026-08-11', 10);
        const ids = picked.map(q => q.id).sort();
        expect(ids).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    test('honours the count and defaults to 3', () => {
        expect(DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 5, '2026-08-11')).toHaveLength(3);
        expect(DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 5, '2026-08-11', 2)).toHaveLength(2);
    });

    test('never returns more quests than are eligible', () => {
        // level 1 has only 3 eligible, asking for 5 still yields 3
        expect(DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 1, '2026-08-11', 5)).toHaveLength(3);
    });

    test('stamps every record fresh (not completed, not claimed)', () => {
        const picked = DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 5, '2026-08-11');
        picked.forEach(q => {
            expect(q).toEqual({ id: expect.any(String), completed: false, claimed: false });
        });
    });

    test('is deterministic across calls for the same (level, date)', () => {
        const a = DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 5, '2026-08-11');
        const b = DAILY_QUEST_LOGIC.pickDailyQuests(makePool(), 5, '2026-08-11');
        expect(a).toEqual(b);
    });

    test('tolerates a null/empty pool', () => {
        expect(DAILY_QUEST_LOGIC.pickDailyQuests(null, 5, '2026-08-11')).toEqual([]);
        expect(DAILY_QUEST_LOGIC.pickDailyQuests([], 5, '2026-08-11')).toEqual([]);
    });
});

describe('daily-quest-logic.js — buildDailyQuestBoard', () => {
    test('returns the { date, quests, allClaimedBonus } shape', () => {
        const board = DAILY_QUEST_LOGIC.buildDailyQuestBoard(makePool(), 5, '2026-08-11');
        expect(board.date).toBe('2026-08-11');
        expect(board.allClaimedBonus).toBe(false);
        expect(board.quests).toHaveLength(3);
        board.quests.forEach(q => {
            expect(q).toEqual({ id: expect.any(String), completed: false, claimed: false });
        });
    });

    test('round-trips through JSON unchanged (save/load fidelity)', () => {
        const board = DAILY_QUEST_LOGIC.buildDailyQuestBoard(makePool(), 5, '2026-08-11');
        expect(JSON.parse(JSON.stringify(board))).toEqual(board);
    });
});

describe('daily-quest-logic.js — sweepQuestCompletions', () => {
    const pool = makePool();

    test('flips a quest to completed when its check passes', () => {
        const quests = [{ id: 'a', completed: false, claimed: false }];
        const changed = DAILY_QUEST_LOGIC.sweepQuestCompletions(quests, pool, { tasks: 1 });
        expect(changed).toBe(true);
        expect(quests[0].completed).toBe(true);
    });

    test('leaves a quest incomplete when its check fails', () => {
        const quests = [{ id: 'b', completed: false, claimed: false }];
        const changed = DAILY_QUEST_LOGIC.sweepQuestCompletions(quests, pool, { tasks: 1 });
        expect(changed).toBe(false);
        expect(quests[0].completed).toBe(false);
    });

    test('reports false when nothing new completes (already-completed skip)', () => {
        const quests = [{ id: 'a', completed: true, claimed: true }];
        const changed = DAILY_QUEST_LOGIC.sweepQuestCompletions(quests, pool, { tasks: 5 });
        expect(changed).toBe(false);
        expect(quests[0].completed).toBe(true); // untouched
    });

    test('mutates in place across multiple quests and reports true if any newly completes', () => {
        const quests = [
            { id: 'a', completed: false, claimed: false }, // tasks>=1 -> passes
            { id: 'b', completed: false, claimed: false }, // tasks>=3 -> fails
            { id: 'c', completed: false, claimed: false }, // habits>=1 -> passes
        ];
        const changed = DAILY_QUEST_LOGIC.sweepQuestCompletions(quests, pool, { tasks: 1, habits: 2 });
        expect(changed).toBe(true);
        expect(quests.map(q => q.completed)).toEqual([true, false, true]);
    });

    test('ignores a board quest whose id is absent from the pool', () => {
        const quests = [{ id: 'ghost', completed: false, claimed: false }];
        const changed = DAILY_QUEST_LOGIC.sweepQuestCompletions(quests, pool, { tasks: 5 });
        expect(changed).toBe(false);
        expect(quests[0].completed).toBe(false);
    });

    test('tolerates null quests / pool', () => {
        expect(DAILY_QUEST_LOGIC.sweepQuestCompletions(null, pool, {})).toBe(false);
        expect(DAILY_QUEST_LOGIC.sweepQuestCompletions([{ id: 'a', completed: false }], null, { tasks: 1 })).toBe(false);
    });
});

describe('daily-quest-logic.js — module surface', () => {
    test('exports a frozen object with the expected functions', () => {
        expect(Object.isFrozen(DAILY_QUEST_LOGIC)).toBe(true);
        expect(typeof DAILY_QUEST_LOGIC.seededShuffle).toBe('function');
        expect(typeof DAILY_QUEST_LOGIC.pickDailyQuests).toBe('function');
        expect(typeof DAILY_QUEST_LOGIC.buildDailyQuestBoard).toBe('function');
        expect(typeof DAILY_QUEST_LOGIC.sweepQuestCompletions).toBe('function');
        expect(DAILY_QUEST_LOGIC.DEFAULT_BOARD_SIZE).toBe(3);
    });
});
