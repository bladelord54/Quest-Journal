/**
 * Unit Tests for quest-chain-logic.js
 *
 * Roadmap #1, 82nd slice (27th LOGIC module): the pure quest-chain progression state math that
 * goal-manager.js's toggleChainTask / completeChapter / completeQuestChain delegate to — the SIBLING of
 * quest-chain-render.js (view already extracted, the transitions it paints now follow). Coverage:
 *   - toggleTaskIndex adds/removes an index without mutating, tolerant of null.
 *   - isChapterComplete fires only on a full length match, tolerant of missing chapter/tasks.
 *   - advanceChapterState returns the {index+1, tasks:[]} patch without mutating the chain.
 *   - isChainComplete detects running past the last chapter, tolerant of a missing template.
 *   - completeChainLists moves the chain active→completed by id, stamping completedAt, without mutation.
 *   - the frozen export surface.
 */

import QUEST_CHAIN_LOGIC from '../quest-chain-logic.js';

const chapter = (taskCount) => ({ tasks: Array.from({ length: taskCount }, (_, i) => `task ${i}`) });

describe('quest-chain-logic.js — toggleTaskIndex', () => {
    test('appends an index that is not present', () => {
        expect(QUEST_CHAIN_LOGIC.toggleTaskIndex([0, 1], 2)).toEqual([0, 1, 2]);
    });

    test('removes an index that is present', () => {
        expect(QUEST_CHAIN_LOGIC.toggleTaskIndex([0, 1, 2], 1)).toEqual([0, 2]);
    });

    test('does not mutate the input array', () => {
        const input = [0, 1];
        const out = QUEST_CHAIN_LOGIC.toggleTaskIndex(input, 2);
        expect(input).toEqual([0, 1]);
        expect(out).not.toBe(input);
    });

    test('a null/undefined list starts a fresh single-element array', () => {
        expect(QUEST_CHAIN_LOGIC.toggleTaskIndex(null, 0)).toEqual([0]);
        expect(QUEST_CHAIN_LOGIC.toggleTaskIndex(undefined, 3)).toEqual([3]);
    });

    test('toggling the same index twice returns to the original set', () => {
        const once = QUEST_CHAIN_LOGIC.toggleTaskIndex([5], 2);
        expect(QUEST_CHAIN_LOGIC.toggleTaskIndex(once, 2)).toEqual([5]);
    });
});

describe('quest-chain-logic.js — isChapterComplete', () => {
    test('true when every task index is checked (length match)', () => {
        expect(QUEST_CHAIN_LOGIC.isChapterComplete([0, 1, 2], chapter(3))).toBe(true);
    });

    test('false when fewer tasks are checked', () => {
        expect(QUEST_CHAIN_LOGIC.isChapterComplete([0, 1], chapter(3))).toBe(false);
    });

    test('an empty chapter (0 tasks) is complete with 0 checked', () => {
        expect(QUEST_CHAIN_LOGIC.isChapterComplete([], chapter(0))).toBe(true);
    });

    test('tolerates null completedTasks and missing chapter/tasks', () => {
        expect(QUEST_CHAIN_LOGIC.isChapterComplete(null, chapter(0))).toBe(true);
        expect(QUEST_CHAIN_LOGIC.isChapterComplete([0], null)).toBe(false);
        expect(QUEST_CHAIN_LOGIC.isChapterComplete([0], {})).toBe(false);
    });
});

describe('quest-chain-logic.js — advanceChapterState', () => {
    test('advances the index by one and resets completed tasks', () => {
        expect(QUEST_CHAIN_LOGIC.advanceChapterState({ currentChapterIndex: 0, completedTasks: [0, 1, 2] }))
            .toEqual({ currentChapterIndex: 1, completedTasks: [] });
    });

    test('does not mutate the chain', () => {
        const chain = { currentChapterIndex: 2, completedTasks: [0] };
        QUEST_CHAIN_LOGIC.advanceChapterState(chain);
        expect(chain).toEqual({ currentChapterIndex: 2, completedTasks: [0] });
    });
});

describe('quest-chain-logic.js — isChainComplete', () => {
    const template = { chapters: [chapter(1), chapter(1), chapter(1)] }; // 3 chapters

    test('false while still within the chapters', () => {
        expect(QUEST_CHAIN_LOGIC.isChainComplete({ currentChapterIndex: 2 }, template)).toBe(false);
    });

    test('true once the index reaches the chapter count', () => {
        expect(QUEST_CHAIN_LOGIC.isChainComplete({ currentChapterIndex: 3 }, template)).toBe(true);
    });

    test('true when the index has run past the last chapter', () => {
        expect(QUEST_CHAIN_LOGIC.isChainComplete({ currentChapterIndex: 4 }, template)).toBe(true);
    });

    test('tolerates a missing template', () => {
        expect(QUEST_CHAIN_LOGIC.isChainComplete({ currentChapterIndex: 9 }, null)).toBe(false);
        expect(QUEST_CHAIN_LOGIC.isChainComplete({ currentChapterIndex: 9 }, {})).toBe(false);
    });
});

describe('quest-chain-logic.js — completeChainLists', () => {
    const mkChain = (id) => ({ id, templateId: 't', currentChapterIndex: 0, completedTasks: [] });

    test('removes the chain from active and appends it to completed', () => {
        const a = mkChain(1), b = mkChain(2);
        const moved = QUEST_CHAIN_LOGIC.completeChainLists(b, { active: [a, b], completed: [] });
        expect(moved.active).toEqual([a]);
        expect(moved.completed).toHaveLength(1);
        expect(moved.completed[0].id).toBe(2);
    });

    test('stamps completedAt when provided', () => {
        const b = mkChain(2);
        const moved = QUEST_CHAIN_LOGIC.completeChainLists(b, { active: [b], completed: [], completedAt: '2026-08-25T00:00:00.000Z' });
        expect(moved.completed[0].completedAt).toBe('2026-08-25T00:00:00.000Z');
    });

    test('does not mutate the input arrays or the source chain', () => {
        const a = mkChain(1), b = mkChain(2);
        const active = [a, b];
        const completed = [];
        QUEST_CHAIN_LOGIC.completeChainLists(b, { active, completed, completedAt: 'X' });
        expect(active).toEqual([a, b]); // untouched
        expect(completed).toEqual([]); // untouched
        expect(b.completedAt).toBeUndefined(); // source chain not stamped (a copy is)
    });

    test('preserves already-completed chains in order', () => {
        const done = mkChain(9);
        const b = mkChain(2);
        const moved = QUEST_CHAIN_LOGIC.completeChainLists(b, { active: [b], completed: [done] });
        expect(moved.completed.map(c => c.id)).toEqual([9, 2]);
    });

    test('tolerates null active/completed arrays', () => {
        const b = mkChain(2);
        const moved = QUEST_CHAIN_LOGIC.completeChainLists(b, { active: null, completed: null });
        expect(moved.active).toEqual([]);
        expect(moved.completed.map(c => c.id)).toEqual([2]);
    });
});

describe('quest-chain-logic.js — module surface', () => {
    test('exports a frozen object with the expected functions', () => {
        expect(Object.isFrozen(QUEST_CHAIN_LOGIC)).toBe(true);
        expect(typeof QUEST_CHAIN_LOGIC.toggleTaskIndex).toBe('function');
        expect(typeof QUEST_CHAIN_LOGIC.isChapterComplete).toBe('function');
        expect(typeof QUEST_CHAIN_LOGIC.advanceChapterState).toBe('function');
        expect(typeof QUEST_CHAIN_LOGIC.isChainComplete).toBe('function');
        expect(typeof QUEST_CHAIN_LOGIC.completeChainLists).toBe('function');
    });
});
