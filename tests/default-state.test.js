/**
 * default-state.js — the ONE source of persisted-field defaults (Roadmap #1, 84th slice).
 *
 * The contract under test: initState() on a fresh manager and buildLoadState({}) on an EMPTY save
 * must agree, field for field, on every persisted default — and the field lists that drive the loop
 * must cover the defaults table exactly, so a new field cannot fall between the two halves.
 */
import DEFAULT_STATE from '../default-state.js';
import LOAD_DESERIALIZER from '../load-deserializer.js';
import SAVE_SERIALIZER from '../save-serializer.js';

const DEFAULT_SESSION_MINUTES = 25;
const opts = () => ({ defaultSessionMinutes: DEFAULT_SESSION_MINUTES });
const loadOpts = (extra = {}) => ({
    todayString: '2026-09-07',
    classSchemaVersion: 2,
    defaultSessionMinutes: DEFAULT_SESSION_MINUTES,
    ...extra
});

describe('DEFAULT_STATE — persistedDefaults()', () => {
    test('exports a frozen namespace with the factory + both field lists', () => {
        expect(Object.isFrozen(DEFAULT_STATE)).toBe(true);
        expect(typeof DEFAULT_STATE.persistedDefaults).toBe('function');
        expect(Object.isFrozen(DEFAULT_STATE.SIMPLE_FIELDS)).toBe(true);
        expect(Object.isFrozen(DEFAULT_STATE.SPECIAL_FIELDS)).toBe(true);
    });

    test('returns a FRESH object each call — mutable defaults are never shared', () => {
        const a = DEFAULT_STATE.persistedDefaults(opts());
        const b = DEFAULT_STATE.persistedDefaults(opts());
        expect(a).toEqual(b);
        expect(a).not.toBe(b);
        a.lifeGoals.push({ id: 1 });
        a.activeBounties.weekly = 'x';
        a.lastBountyClaim.weekly = '2026-W36';
        expect(b.lifeGoals).toEqual([]);
        expect(b.activeBounties).toEqual({ weekly: null, monthly: null });
        expect(b.lastBountyClaim).toEqual({});
    });

    test('focusSessionLength is the injected default, not a hardcoded number', () => {
        expect(DEFAULT_STATE.persistedDefaults({ defaultSessionMinutes: 25 }).focusSessionLength).toBe(25);
        expect(DEFAULT_STATE.persistedDefaults({ defaultSessionMinutes: 50 }).focusSessionLength).toBe(50);
    });

    test('non-trivial seed defaults are pinned', () => {
        const d = DEFAULT_STATE.persistedDefaults(opts());
        expect(d.level).toBe(1);
        expect(d.unlockedThemes).toEqual(['default']);
        expect(d.currentTheme).toBe('default');
        expect(d.timezone).toBe('auto');
        expect(d.titleStyle).toBe('masculine');
        expect(d.activeBounties).toEqual({ weekly: null, monthly: null });
    });

    test('SIMPLE_FIELDS ∪ SPECIAL_FIELDS == every key of the defaults table, with no overlap', () => {
        const keys = Object.keys(DEFAULT_STATE.persistedDefaults(opts())).sort();
        const simple = [...DEFAULT_STATE.SIMPLE_FIELDS];
        const special = [...DEFAULT_STATE.SPECIAL_FIELDS];
        const union = [...simple, ...special].sort();

        const overlap = simple.filter(k => special.includes(k));
        expect(overlap).toEqual([]);

        const dupes = union.filter((k, i) => union.indexOf(k) !== i);
        expect(dupes).toEqual([]);

        expect(union).toEqual(keys);
    });

    test('every listed field actually exists in the defaults table (no typos)', () => {
        const d = DEFAULT_STATE.persistedDefaults(opts());
        for (const key of [...DEFAULT_STATE.SIMPLE_FIELDS, ...DEFAULT_STATE.SPECIAL_FIELDS]) {
            expect(Object.prototype.hasOwnProperty.call(d, key)).toBe(true);
        }
    });
});

describe('DEFAULT_STATE ↔ buildLoadState — an EMPTY save loads to the defaults', () => {
    const defaults = DEFAULT_STATE.persistedDefaults(opts());
    const state = LOAD_DESERIALIZER.buildLoadState({}, loadOpts());

    test('every simple field equals its default', () => {
        for (const key of DEFAULT_STATE.SIMPLE_FIELDS) {
            expect([key, state[key]]).toEqual([key, defaults[key]]);
        }
    });

    test('the class block resolves to the defaults on the schema-mismatch (fresh) path', () => {
        for (const key of ['playerClass', 'classNodesUnlocked', 'classCapstone', 'skillPointsSpent',
            'classSelectedAtLevel', 'subclass', 'subclassNodesUnlocked']) {
            expect([key, state[key]]).toEqual([key, defaults[key]]);
        }
    });

    test('the deliberate exception is accountCreatedDate — a migration, not a default', () => {
        // initState's default is null (set on first save); an empty LOAD blob is a returning
        // user with no field, so the level<=3 migration hands them today.
        expect(defaults.accountCreatedDate).toBeNull();
        expect(state.accountCreatedDate).toBe('2026-09-07');
    });

    test('every other special field agrees with the defaults', () => {
        const agree = DEFAULT_STATE.SPECIAL_FIELDS.filter(k => k !== 'accountCreatedDate');
        for (const key of agree) {
            expect([key, state[key]]).toEqual([key, defaults[key]]);
        }
    });

    test('the loaded key set is exactly the defaults table (pomodoroChainSettings omitted when absent)', () => {
        expect(Object.keys(state).sort()).toEqual(Object.keys(defaults).sort());
    });

    test('the load path does not alias the defaults into a shared object across calls', () => {
        const s1 = LOAD_DESERIALIZER.buildLoadState({}, loadOpts());
        const s2 = LOAD_DESERIALIZER.buildLoadState({}, loadOpts());
        s1.habits.push({ id: 1 });
        expect(s2.habits).toEqual([]);
    });
});

describe('DEFAULT_STATE ↔ buildSaveData — the defaults table IS the persisted field set', () => {
    test('every default is a save key (modulo the one documented rename) and vice-versa', () => {
        const defaults = DEFAULT_STATE.persistedDefaults(opts());
        const saved = SAVE_SERIALIZER.buildSaveData(
            { ...defaults, CLASS_SCHEMA_VERSION: 2, pomodoroChainSettings: {} },
            { todayString: '2026-09-07', currentWeekString: '2026-W37' }
        );
        const saveKeyFor = k => (k === '_highPriorityXpDate' ? 'highPriorityXpDate' : k);
        const savedKeys = new Set(Object.keys(saved));

        const notSaved = Object.keys(defaults).filter(k => !savedKeys.has(saveKeyFor(k)));
        expect(notSaved).toEqual([]);

        const defaultKeys = new Set(Object.keys(defaults).map(saveKeyFor));
        const savedOnly = Object.keys(saved).filter(k => !defaultKeys.has(k));
        // The schema gate + the conditionally-loaded chain settings are the only save-only keys.
        expect(savedOnly.sort()).toEqual(['classSchemaVersion', 'pomodoroChainSettings']);
    });
});
