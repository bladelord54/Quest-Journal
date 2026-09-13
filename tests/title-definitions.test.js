/**
 * Unit Tests for title-definitions.js
 *
 * Roadmap #1, 79th slice: the achievement-title catalog + pure unlock logic that
 * goal-manager.js checkTitleUnlocks and title-render.js's gallery both consume as
 * their single source of truth. Coverage:
 *   - the catalog is a deeply-frozen, well-formed set of categories/titles.
 *   - THRESHOLD titles carry {type, target}; the two login-streak titles do not.
 *   - computeUnlockableTitles derives the right unlocks from a stats map.
 *   - it skips already-unlocked ids (object records and bare-string ids).
 *   - it skips externally-granted (typeless) titles regardless of stats.
 *   - it is pure: no mutation of inputs, stable declared order, empty-input safe.
 */

import TITLE_DEFINITIONS from '../title-definitions.js';

const ALL_TITLES = TITLE_DEFINITIONS.categories.flatMap(c => c.titles);
const THRESHOLD_TITLES = ALL_TITLES.filter(t => typeof t.type === 'string' && typeof t.target === 'number');
const EXTERNAL_TITLES = ALL_TITLES.filter(t => typeof t.type !== 'string' || typeof t.target !== 'number');

// A stats map high enough to satisfy every threshold in the catalog.
function maxStats() {
    return {
        tasks: 100000, habits: 100, level: 1000, streak: 1000,
        lifeGoals: 100, weeklyGoals: 100, monthlyGoals: 100, yearlyGoals: 100,
        gold: 10000000, chests: 1000, focus: 1000, spells: 1000,
        bosses: 1000, companions: 100,
    };
}

describe('title-definitions.js — catalog shape', () => {
    test('exposes categories array and computeUnlockableTitles function', () => {
        expect(Array.isArray(TITLE_DEFINITIONS.categories)).toBe(true);
        expect(typeof TITLE_DEFINITIONS.computeUnlockableTitles).toBe('function');
    });

    test('the catalog and its nested categories/titles are deep-frozen', () => {
        expect(Object.isFrozen(TITLE_DEFINITIONS)).toBe(true);
        expect(Object.isFrozen(TITLE_DEFINITIONS.categories)).toBe(true);
        for (const cat of TITLE_DEFINITIONS.categories) {
            expect(Object.isFrozen(cat)).toBe(true);
            expect(Object.isFrozen(cat.titles)).toBe(true);
            for (const t of cat.titles) expect(Object.isFrozen(t)).toBe(true);
        }
    });

    test('every category carries gallery chrome and a non-empty titles array', () => {
        for (const cat of TITLE_DEFINITIONS.categories) {
            expect(typeof cat.key).toBe('string');
            expect(typeof cat.icon).toBe('string');
            expect(typeof cat.label).toBe('string');
            expect(typeof cat.color).toBe('string');
            expect(Array.isArray(cat.titles)).toBe(true);
            expect(cat.titles.length).toBeGreaterThan(0);
        }
    });

    test('every title has id/name/description/rarity strings', () => {
        for (const t of ALL_TITLES) {
            expect(typeof t.id).toBe('string');
            expect(typeof t.name).toBe('string');
            expect(typeof t.description).toBe('string');
            expect(typeof t.rarity).toBe('string');
        }
    });

    test('title ids are unique across the whole catalog', () => {
        const ids = ALL_TITLES.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('only the two login-streak titles are externally granted (no type/target)', () => {
        expect(EXTERNAL_TITLES.map(t => t.id).sort()).toEqual(['centurion', 'mythic_warrior']);
    });

    test('threshold titles carry a string type and positive numeric target', () => {
        for (const t of THRESHOLD_TITLES) {
            expect(typeof t.type).toBe('string');
            expect(typeof t.target).toBe('number');
            expect(t.target).toBeGreaterThan(0);
        }
    });
});

describe('title-definitions.js — computeUnlockableTitles', () => {
    test('unlocks every threshold title when all stats are maxed and none are owned', () => {
        const result = TITLE_DEFINITIONS.computeUnlockableTitles(maxStats(), []);
        expect(result.map(r => r.id).sort()).toEqual(THRESHOLD_TITLES.map(t => t.id).sort());
    });

    test('never returns externally-granted titles even at max stats', () => {
        const ids = TITLE_DEFINITIONS.computeUnlockableTitles(maxStats(), []).map(r => r.id);
        expect(ids).not.toContain('centurion');
        expect(ids).not.toContain('mythic_warrior');
    });

    test('returns { id, name, description } matching the catalog entry', () => {
        const result = TITLE_DEFINITIONS.computeUnlockableTitles({ tasks: 1 }, []);
        const beginner = result.find(r => r.id === 'beginner');
        expect(beginner).toEqual({ id: 'beginner', name: 'The Beginner', description: 'Complete your first task' });
    });

    test('honors thresholds exactly (>= target)', () => {
        const below = TITLE_DEFINITIONS.computeUnlockableTitles({ streak: 6 }, []).map(r => r.id);
        expect(below).toContain('consistent'); // target 3
        expect(below).not.toContain('disciplined'); // target 7
        const at = TITLE_DEFINITIONS.computeUnlockableTitles({ streak: 7 }, []).map(r => r.id);
        expect(at).toContain('disciplined');
    });

    test('skips titles already unlocked as object records', () => {
        const owned = [{ id: 'beginner' }];
        const ids = TITLE_DEFINITIONS.computeUnlockableTitles({ tasks: 1 }, owned).map(r => r.id);
        expect(ids).not.toContain('beginner');
    });

    test('skips titles already unlocked as bare string ids', () => {
        const ids = TITLE_DEFINITIONS.computeUnlockableTitles({ tasks: 1 }, ['beginner']).map(r => r.id);
        expect(ids).not.toContain('beginner');
    });

    test('missing stat keys count as zero (no unlocks)', () => {
        expect(TITLE_DEFINITIONS.computeUnlockableTitles({}, [])).toEqual([]);
    });

    test('tolerates null/undefined stats and unlockedTitles', () => {
        expect(TITLE_DEFINITIONS.computeUnlockableTitles(null, null)).toEqual([]);
        expect(TITLE_DEFINITIONS.computeUnlockableTitles(undefined, undefined)).toEqual([]);
    });

    test('returns results in catalog declared order', () => {
        const order = THRESHOLD_TITLES.map(t => t.id);
        const result = TITLE_DEFINITIONS.computeUnlockableTitles(maxStats(), []).map(r => r.id);
        expect(result).toEqual(order);
    });

    test('does not mutate the stats or unlockedTitles inputs', () => {
        const stats = maxStats();
        const statsCopy = JSON.parse(JSON.stringify(stats));
        const owned = [{ id: 'beginner' }];
        const ownedCopy = JSON.parse(JSON.stringify(owned));
        TITLE_DEFINITIONS.computeUnlockableTitles(stats, owned);
        expect(stats).toEqual(statsCopy);
        expect(owned).toEqual(ownedCopy);
    });
});
