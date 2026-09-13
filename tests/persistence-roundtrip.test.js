/**
 * Persistence ROUND-TRIP parity — Roadmap #1, 78th slice.
 *
 * save-serializer.js (76th) and load-deserializer.js (77th) are each pinned on their
 * own, but until now nothing caught a field added to ONE half and forgotten in the
 * other. That is the classic persistence bug: the save blob grows a key, the load map
 * never learns to read it, and the value silently resets on every cold boot (or the
 * reverse — a field is loaded from a key nobody ever writes, so it is null forever).
 *
 * This suite asserts the two halves agree FIELD-FOR-FIELD, in both directions, and
 * that a manager survives save → JSON → load unchanged (a fixed point). The two
 * legitimate asymmetries are declared as explicit constants in the shared fixture,
 * so adding a third one is a deliberate act that fails this suite until it is
 * documented there.
 *
 * The fixture + asymmetry declarations live in tests/fixtures/full-manager.js because
 * the export → import parity guard (in tests/goal-manager.test.js, which owns the
 * GoalManager harness) needs the very same inputs.
 */

import SAVE_SERIALIZER from '../save-serializer.js';
import LOAD_DESERIALIZER from '../load-deserializer.js';
const {
    TODAY,
    WEEK,
    SCHEMA,
    SAVE_ONLY_KEYS,
    instanceKeyFor,
    saveOpts,
    loadOpts,
    makeFullManager
} = require('./fixtures/full-manager.js');

/** save → JSON.stringify/parse (what localStorage really does) → load. */
function roundTrip(manager, opts = {}) {
    const saved = SAVE_SERIALIZER.buildSaveData(manager, saveOpts());
    const blob = JSON.parse(JSON.stringify(saved));
    const state = LOAD_DESERIALIZER.buildLoadState(blob, loadOpts(opts));
    return { saved, blob, state };
}

describe('persistence round-trip (save-serializer.js ⇄ load-deserializer.js)', () => {
    describe('fixture health', () => {
        test('the fixture manager covers every save key — no undefined values', () => {
            const saved = SAVE_SERIALIZER.buildSaveData(makeFullManager(), saveOpts());
            const missing = Object.keys(saved).filter(k => saved[k] === undefined);
            expect(missing).toEqual([]);
        });

        test('the fixture uses non-default values, so a dropped field cannot pass by luck', () => {
            const { state } = roundTrip(makeFullManager());
            const defaults = LOAD_DESERIALIZER.buildLoadState({}, loadOpts());
            const accidentallyDefault = Object.keys(defaults).filter(
                k => JSON.stringify(state[k]) === JSON.stringify(defaults[k])
            );
            // titleStyle's two legal values mean 'masculine' IS its default; the fixture
            // uses 'feminine', so nothing should collide.
            expect(accidentallyDefault).toEqual([]);
        });
    });

    describe('field-set parity — the forgotten-field guard', () => {
        const saved = SAVE_SERIALIZER.buildSaveData(makeFullManager(), saveOpts());
        const state = LOAD_DESERIALIZER.buildLoadState(
            JSON.parse(JSON.stringify(saved)),
            loadOpts()
        );

        test('every SAVED key is read back by the load half', () => {
            const unread = Object.keys(saved)
                .filter(k => !SAVE_ONLY_KEYS.includes(k))
                .filter(k => !Object.prototype.hasOwnProperty.call(state, instanceKeyFor(k)));
            // A key here is written on every save but never restored: the value
            // silently resets on the next cold boot.
            expect(unread).toEqual([]);
        });

        test('every LOADED field is written by the save half', () => {
            const savedInstanceKeys = new Set(Object.keys(saved).map(instanceKeyFor));
            const unwritten = Object.keys(state).filter(k => !savedInstanceKeys.has(k));
            // A key here is restored from a blob key nobody writes: null forever.
            expect(unwritten).toEqual([]);
        });

        test('the only save-only key is the schema gate', () => {
            const savedInstanceKeys = Object.keys(saved).map(instanceKeyFor);
            const loadKeys = new Set(Object.keys(state));
            const saveOnly = Object.keys(saved).filter(
                (k, i) => !loadKeys.has(savedInstanceKeys[i])
            );
            expect(saveOnly).toEqual(SAVE_ONLY_KEYS);
        });

        test('the only rename is highPriorityXpDate → _highPriorityXpDate', () => {
            expect(state._highPriorityXpDate).toBe('2026-06-15');
            expect(saved.highPriorityXpDate).toBe('2026-06-15');
            expect(state).not.toHaveProperty('highPriorityXpDate');
            expect(saved).not.toHaveProperty('_highPriorityXpDate');
        });
    });

    describe('value parity — a full manager survives save → JSON → load', () => {
        const manager = makeFullManager();
        const { saved, state } = roundTrip(manager);

        test('every save key round-trips to the same value', () => {
            for (const key of Object.keys(saved)) {
                if (SAVE_ONLY_KEYS.includes(key)) continue;
                expect(state[instanceKeyFor(key)]).toEqual(saved[key]);
            }
        });

        test('every persisted manager field comes back unchanged', () => {
            for (const key of Object.keys(state)) {
                expect(state[key]).toEqual(manager[key]);
            }
        });

        test('class state survives when the schema version matches', () => {
            expect(state.playerClass).toBe('Wizard');
            expect(state.classNodesUnlocked).toBe(4);
            expect(state.classCapstone).toBe('arcane');
            expect(state.skillPointsSpent).toBe(4);
            expect(state.classSelectedAtLevel).toBe(5);
            expect(state.subclass).toBe('evoker');
            expect(state.subclassNodesUnlocked).toBe(2);
        });

        test('a January lastMonth (0) survives the whole trip', () => {
            expect(saved.lastMonth).toBe(0);
            expect(state.lastMonth).toBe(0);
        });
    });

    describe('fixed point — a second trip changes nothing', () => {
        test('save(load(save(manager))) equals save(manager)', () => {
            const manager = makeFullManager();
            const first = roundTrip(manager);
            const managerAgain = Object.assign({ CLASS_SCHEMA_VERSION: SCHEMA }, first.state);
            const second = roundTrip(managerAgain);
            expect(second.saved).toEqual(first.saved);
            expect(second.state).toEqual(first.state);
        });

        test('a DEFAULTED state (empty blob) reaches a fixed point after one save', () => {
            const fresh = LOAD_DESERIALIZER.buildLoadState({}, loadOpts());
            const first = roundTrip(Object.assign({ CLASS_SCHEMA_VERSION: SCHEMA }, fresh));
            const second = roundTrip(Object.assign({ CLASS_SCHEMA_VERSION: SCHEMA }, first.state));
            expect(second.state).toEqual(first.state);
        });

        // The ONE value the save half invents: a null reset marker is stamped with the
        // caller's today/current-week on write. Pinned rather than hidden — it is why
        // the defaulted state above needs one save before it settles.
        test('null reset markers are stamped by the save half, then stable', () => {
            const fresh = LOAD_DESERIALIZER.buildLoadState({}, loadOpts());
            expect(fresh.lastHabitReset).toBeNull();
            expect(fresh.lastWeekReset).toBeNull();

            const { state } = roundTrip(Object.assign({ CLASS_SCHEMA_VERSION: SCHEMA }, fresh));
            expect(state.lastHabitReset).toBe(TODAY);
            expect(state.lastWeekReset).toBe(WEEK);
        });
    });

    describe('the schema gate is the one deliberate data loss', () => {
        test('a version bump drops class state and nothing else', () => {
            const manager = makeFullManager();
            const { saved, state } = roundTrip(manager, { classSchemaVersion: SCHEMA + 1 });

            expect(state.playerClass).toBeNull();
            expect(state.classNodesUnlocked).toBe(0);
            expect(state.classCapstone).toBeNull();
            expect(state.skillPointsSpent).toBe(0);
            expect(state.classSelectedAtLevel).toBeNull();
            expect(state.subclass).toBeNull();
            expect(state.subclassNodesUnlocked).toBe(0);

            const classFields = new Set([
                'playerClass', 'classNodesUnlocked', 'classCapstone', 'skillPointsSpent',
                'classSelectedAtLevel', 'subclass', 'subclassNodesUnlocked'
            ]);
            for (const key of Object.keys(saved)) {
                if (SAVE_ONLY_KEYS.includes(key) || classFields.has(key)) continue;
                expect(state[instanceKeyFor(key)]).toEqual(saved[key]);
            }
        });
    });
});
