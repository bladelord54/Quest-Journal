// @ts-check
'use strict';
import DEFAULT_STATE from './default-state.js';
/**
 * load-deserializer.js — pure load-state builder (Engineering Roadmap #1).
 *
 * 77th incremental slice of the goal-manager.js God class, and the MIRROR of the 76th's
 * save-serializer.js. Together they close the persistence field map: buildSaveData()
 * marshals `this.*` OUT to the JSON blob, buildLoadState() marshals a parsed blob back
 * IN to a plain field→value object that loadData() assigns onto the instance.
 *
 * WHY THIS ONE MATTERED. The save side is a straight read of ~100 fields; the load side
 * is where every DEFAULT and FALLBACK lives, and those are not inert. The 71st slice
 * uncovered a real bug in exactly this block: `lastMonth` is 0-INDEXED (January === 0),
 * so the original `data.lastMonth || null` coerced a stored January to null and silently
 * suppressed the month-transition recap for anyone whose last visit was in January.
 *
 * THE FALLBACKS THAT ARE NOT PLAIN `|| default` — the reason this is field-by-field:
 *   1. `?? null` (NOT `||`) on the four period-tracking stamps. Required for `lastMonth`;
 *      the other three are safe under `||` but use `??` so nobody "tidies" away the one
 *      that matters.
 *   2. `classSelectedAtLevel ?? null` — matches importData().
 *   3. `totalGoldEarned ?? (data.goldCoins || 0)` — the v2.8 N3 migration. `??` is load-
 *      bearing: "field ABSENT" (pre-v2.8 save → seed from current balance, a correct lower
 *      bound on lifetime earnings) vs "present and 0" (genuine new player → stays 0).
 *   4. `repairableStreaks` — an Array.isArray() TYPE GUARD, so a corrupt non-array cannot
 *      poison the streak-repair path.
 *   5. `titleStyle` — a NORMALIZER: anything not exactly 'feminine' becomes 'masculine',
 *      so a corrupt save or foreign import always leaves the title chain renderable.
 *   6. `accountCreatedDate` — a MIGRATION with a level-dependent branch. Absent field →
 *      level <= 3 gets today (keeps Beginner's Blessing), else the '2020-01-01' sentinel
 *      (blessing already expired). Reads the level resolved from this same blob, so the
 *      branch is deterministic from `data` alone.
 *   7. `highPriorityXpDate` → `_highPriorityXpDate` — the ONE field whose save key and
 *      instance property differ. Easy to break silently, now pinned by a test.
 *   8. `pomodoroChainSettings` — CONDITIONAL. The original assigned it only when present,
 *      so the key is OMITTED rather than set to undefined and Object.assign leaves the
 *      constructor default intact.
 *
 * THE SCHEMA GATE. Class state (7 fields) is restored only when the saved
 * `classSchemaVersion` matches the current one. On a mismatch the node meanings have
 * changed, so class state HARD-RESETS — no migration shim, per the v3.1 dev-build
 * decision. Skill points re-derive from level; the player just re-picks their tree. Both
 * branches write all 7 fields, so a mismatch can never leave a half-restored tree.
 *
 * WHERE THE DEFAULTS COME FROM (84th slice). The plain `d.x || <default>` fields are no longer
 * written out one by one: buildLoadState loops over DEFAULT_STATE.SIMPLE_FIELDS and falls back to
 * DEFAULT_STATE.persistedDefaults() — the SAME object initState() assigns on a fresh install — so
 * the two can no longer disagree about what a missing field means. Only the fields with a
 * non-`||` rule (the eight notes above + the schema gate) remain explicit below, and
 * DEFAULT_STATE.SPECIAL_FIELDS names them so a parity test can prove nothing falls between.
 *
 * WHAT STAYS ON THE CLASS (impure or instance-shaped): the JSON.parse + try/catch +
 * corrupt-save backup rotation; `goalTabUnlockLevels` (derived via
 * this.getGoalTabUnlockLevelsForPath); the PERSISTENCE_MIGRATIONS passes that MUTATE the
 * loaded arrays; and the retroactive checkRewardUnlocks() pass. `normalizeClassId` is
 * INJECTED so this module keeps no dependency on persistence-migrations.js's load order.
 *
 * Dual-environment, no bundler (mirrors save-serializer.js):
 *   - Browser: plain <script> AFTER default-state.js and BEFORE goal-manager.js; attaches
 *     window.LOAD_DESERIALIZER.
 *   - Jest/Node: require('./load-deserializer.js') returns the frozen namespace (the harness
 *     must have required default-state.js first).
 */


/** Level at or below which an existing user is migrated INTO Beginner's Blessing. */
const BLESSING_MIGRATION_MAX_LEVEL = 3;

/** Sentinel creation date for established users on the Beginner's Blessing migration. */
const BLESSING_EXPIRED_SENTINEL = '2020-01-01';

/**
 * Build the instance-state patch from a parsed save blob. PURE — every dynamic input
 * is injected. Intended for Object.assign onto the manager.
 *
 * @param {Record<string, any>} data parsed `lifeOrganizeData` blob
 * @param {Object} opts
 * @param {string} opts.todayString today's date key, for the accountCreatedDate migration
 * @param {any} opts.classSchemaVersion the CURRENT schema version, compared against the save's
 * @param {number} opts.defaultSessionMinutes FOCUS_SESSION_LOGIC.DEFAULT_SESSION_MINUTES
 * @param {(id: any) => any} [opts.normalizeClassId] legacy class-id rename; identity when omitted
 * @returns {Record<string, any>}
 */
function buildLoadState(data, { todayString, classSchemaVersion, defaultSessionMinutes, normalizeClassId }) {
    const d = data || {};
    const normalize = normalizeClassId || (id => id);

    // A FRESH defaults object per call — the array/object defaults get mutated by the game.
    const defaults = DEFAULT_STATE.persistedDefaults({ defaultSessionMinutes });

    // Resolved first: the accountCreatedDate migration branches on it.
    const level = d.level || defaults.level;

    /** @type {Record<string, any>} */
    const state = {};

    // The plain `||` fields — one shared rule over the one shared default table.
    for (const key of DEFAULT_STATE.SIMPLE_FIELDS) {
        state[key] = d[key] || defaults[key];
    }

    state.level = level;

    // Type guard, not a truthiness fallback — a corrupt non-array must not reach the
    // streak-repair path; see docblock note 4.
    state.repairableStreaks = Array.isArray(d.repairableStreaks) ? d.repairableStreaks : defaults.repairableStreaks;

    // Period Transition Tracking — `??` NOT `||`; see docblock note 1.
    state.lastVisitDate = d.lastVisitDate ?? defaults.lastVisitDate;
    state.lastWeekNumber = d.lastWeekNumber ?? defaults.lastWeekNumber;
    state.lastMonth = d.lastMonth ?? defaults.lastMonth;
    state.lastYear = d.lastYear ?? defaults.lastYear;

    // Beginner's Blessing — migration branch; see docblock note 6.
    state.accountCreatedDate = d.accountCreatedDate
        ? d.accountCreatedDate
        : (level <= BLESSING_MIGRATION_MAX_LEVEL ? todayString : BLESSING_EXPIRED_SENTINEL);

    // v2.8 N3 migration — `??` is load-bearing; see docblock note 3.
    state.totalGoldEarned = d.totalGoldEarned ?? (d.goldCoins || 0);

    // v2.5 — normalizer, not a fallback; see docblock note 5.
    state.titleStyle = d.titleStyle === 'feminine' ? 'feminine' : defaults.titleStyle;

    // The one save-key → instance-property rename; see docblock note 7.
    state._highPriorityXpDate = d.highPriorityXpDate || defaults._highPriorityXpDate;

    // v3.1 §3.1 — Class System schema gate. Both branches write all 7 fields, so a
    // version mismatch can never leave a half-restored tree; see docblock.
    if (d.classSchemaVersion === classSchemaVersion) {
        // Defensive: legacy class id rename Mystic → Wizard.
        state.playerClass = normalize(d.playerClass || defaults.playerClass);
        state.classNodesUnlocked = d.classNodesUnlocked || defaults.classNodesUnlocked;
        state.classCapstone = d.classCapstone || defaults.classCapstone;
        state.skillPointsSpent = d.skillPointsSpent || defaults.skillPointsSpent;
        state.classSelectedAtLevel = d.classSelectedAtLevel ?? defaults.classSelectedAtLevel;
        // v3.1 §9 Subclass Specialization — schema-gated alongside the base class
        // state, since a subclass id is meaningless without it.
        state.subclass = d.subclass || defaults.subclass;
        state.subclassNodesUnlocked = d.subclassNodesUnlocked || defaults.subclassNodesUnlocked;
    } else {
        state.playerClass = defaults.playerClass;
        state.classNodesUnlocked = defaults.classNodesUnlocked;
        state.classCapstone = defaults.classCapstone;
        state.skillPointsSpent = defaults.skillPointsSpent;
        state.classSelectedAtLevel = defaults.classSelectedAtLevel;
        state.subclass = defaults.subclass;
        state.subclassNodesUnlocked = defaults.subclassNodesUnlocked;
    }

    // CONDITIONAL — key omitted when the save has none, so Object.assign leaves the
    // constructor default in place; see docblock note 8.
    if (d.pomodoroChainSettings) state.pomodoroChainSettings = d.pomodoroChainSettings;

    return state;
}

const LOAD_DESERIALIZER = Object.freeze({
    buildLoadState
});


// Node / Jest

export default LOAD_DESERIALIZER;
