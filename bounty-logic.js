// @ts-check
'use strict';
/**
 * bounty-logic.js — pure Royal Bounty rules (Engineering Roadmap #1).
 *
 * 74th incremental slice of the goal-manager.js God class, and the TWENTY-FIRST LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic / spell-lifecycle /
 * period-summary-logic / reminder-schedule-logic / enchantment-lifecycle pattern).
 *
 * This CLOSES the Royal Bounty cluster. Its two other halves were already out: `dashboard-render.js` owns
 * the card markup (40th/41st) and `reminder-schedule-logic.js` owns the "bounty ready" clock (72nd). What
 * was left in the God class was the part in the middle — the rules deciding WHICH quest gets bountied,
 * WHEN the window opens and closes, and WHETHER a completion credits — and it had ZERO test coverage, so
 * this slice was guarded by a throwaway characterization baseline over a date/state matrix (recorded from
 * the unmodified class, asserted `toEqual` after the swap, then replaced by the permanent tests below).
 *
 * ── The duplicated knowledge this centralises ────────────────────────────────────────────────────
 *
 * 1. THE MONDAY-START OFF-BY-ONE. `dayOfWeek === 0 ? 6 : dayOfWeek - 1` — the rule that treats Sunday as
 *    the SEVENTH day rather than the first — is written verbatim in two places: here (this ISO week's
 *    Monday at 00:00) and in `period-summary-logic.js`'s `previousPeriodRange` (the PREVIOUS week's Monday,
 *    time-of-day preserved). To be precise: the surrounding computations genuinely differ, so this is a
 *    duplicated RULE FRAGMENT, not a duplicated function — `mondayOf` names it once, and a test pins the
 *    two modules to the same weekday arithmetic so a "fix" to one cannot silently desync the other.
 *
 * 2. THE WEEK KEY. `` `${isoWeekYear}-W${isoWeekNumber}` `` was hand-written at FOUR call sites (three
 *    Theme-of-the-Week guards + the bounty period key). It is now the class's single `_weekKey()`, which
 *    this module takes INJECTED. It stays on the class deliberately: the class's ISO helpers are LOCAL-TIME
 *    and `period-summary-logic.js` carries a separate UTC-based `isoWeekNumber`. Two live ISO-week
 *    implementations is a real finding, but reconciling them is a BEHAVIOUR question (which clock owns a
 *    week boundary?), not a refactor, so it is left intact here and pinned by a test that walks both across
 *    a year-boundary date matrix. Folding the timezone-sensitive week math into a pure module would have
 *    quietly picked a winner.
 *
 * 3. THE EXPIRY QUESTION, asked three ways. `checkBountyCompletion` and `refreshBounties` both wrote
 *    `Date.now() > new Date(b.expiresAt).getTime()`; `isPastWindow` is now the one copy.
 *
 * ── A 1ms ASYMMETRY, preserved on purpose ────────────────────────────────────────────────────────
 *
 * The third phrasing of that expiry question is `_soonestClaimableBounty`'s `!(expMs > nowMs)`, and it does
 * NOT agree with the other two at the boundary. At the exact instant `now === expiresAt`:
 *
 *   isPastWindow      → false  → the bounty is still claimable, a completion DOES credit
 *   !(expMs > nowMs)  → true   → the reminder resolver skips it, no nudge is scheduled
 *
 * So for one millisecond a bounty is claimable but un-nudged. That is harmless (the reminder is an
 * optimisation, and the claim path is the authority) and changing either side is a gameplay decision, so
 * `_soonestClaimableBounty` KEEPS its own inline phrasing and a test pins the disagreement as deliberate.
 * Same discipline as the three spell sites that kept their bare id check in the 69th slice.
 *
 * ── What stayed on the class ─────────────────────────────────────────────────────────────────────
 *
 * Everything impure: `saveData`, `trackEvent`, the toast queue (`showAchievement`), `openTreasureChest`,
 * `renderRoyalBounty`, `scheduleBountyReadyReminder`, the deferred `setTimeout` chest hand-off, the
 * premium upsell, and every `this.activeBounties` write. The module never reads a clock — callers pass
 * `now` / `nowMs` in, exactly like `backfillDueDates(tasks, today)` and the period-summary slices.
 *
 * @typedef {'weekly'|'monthly'} Cadence
 * @typedef {{ id:any, tier:string }} Pick
 *
 * QuestLists is the manager's quest arrays keyed by field name — `weeklyGoals`, `sideQuests`,
 * `monthlyGoals`, `yearlyGoals`, `lifeGoals` (see QUEST_LIST_KEY). Typed as an index signature because
 * every lookup here goes through that table rather than a literal property.
 * @typedef {Record<string, any[]|null|undefined>} QuestLists
 */


/** The two bounty cadences, in the order every sweep iterates them. */
const CADENCES = Object.freeze(['weekly', 'monthly']);

/**
 * Feature-gate fallbacks. These mirror the Quest Log tab unlocks (weekly @ 6, monthly @ 7) and are only
 * reached when `goalTabUnlockLevels` is missing entirely — note the original used `||`, not `??`, so a
 * configured 0 also falls back. Preserved verbatim.
 */
/** @type {Readonly<Record<string, number>>} */
const DEFAULT_UNLOCK_LEVELS = Object.freeze({ weekly: 6, monthly: 7 });

/**
 * Chest tier awarded per targeted quest tier.
 * @type {Readonly<Record<string, string>>}
 */
const CHEST_TIER_BY_QUEST_TIER = Object.freeze({
    weekly: 'silver',
    sidequest: 'silver',
    monthly: 'gold',
    yearly: 'royal',
    epic: 'royal',
});

/**
 * Which quest tiers each cadence draws from. The monthly cadence was narrowed to monthly-only; legacy
 * saves pointing at yearly/epic are self-healed by `refreshBounties` via `servesTier`.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
const CADENCE_TIERS = Object.freeze({
    weekly: Object.freeze(['weekly', 'sidequest']),
    monthly: Object.freeze(['monthly']),
});

/**
 * Quest tier → the manager list that holds it. Wider than CADENCE_TIERS so legacy records resolve.
 * @type {Readonly<Record<string, string>>}
 */
const QUEST_LIST_KEY = Object.freeze({
    weekly: 'weeklyGoals',
    sidequest: 'sideQuests',
    monthly: 'monthlyGoals',
    yearly: 'yearlyGoals',
    epic: 'lifeGoals',
});

/** Monthly window: the assignment day counts, so "the 1st → end of the 10th" = +9 days. */
const MONTHLY_WINDOW_DAYS = 10;
const HOUR_MS = 3600000;

/**
 * Normalise any cadence-ish input the way the original ternaries did: weekly, else monthly.
 * @param {string} cadence
 * @returns {'weekly'|'monthly'}
 */
function cadenceOf(cadence) {
    return cadence === 'weekly' ? 'weekly' : 'monthly';
}

/**
 * Days to subtract to reach this week's Monday. Sunday (0) is the SEVENTH day, hence 6 — the
 * off-by-one that `period-summary-logic.js` also encodes.
 * @param {number} dayOfWeek 0 Sun .. 6 Sat
 * @returns {number}
 */
function daysFromMonday(dayOfWeek) {
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

/**
 * This week's Monday at 00:00:00.000 LOCAL.
 * @param {Date} now
 * @returns {Date}
 */
function mondayOf(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysFromMonday(d.getDay()));
    return d;
}

/**
 * Feature gate: bounties only surface once the matching Quest Log tab is unlocked.
 * @param {string} cadence
 * @param {number} level
 * @param {Record<string, number>|null|undefined} unlockLevels
 * @returns {boolean}
 */
function isUnlocked(cadence, level, unlockLevels) {
    const key = cadenceOf(cadence);
    return level >= ((unlockLevels && unlockLevels[key]) || DEFAULT_UNLOCK_LEVELS[key]);
}

/**
 * The period identity a bounty is stamped with. Weekly uses the INJECTED week key (see the header note
 * on the two ISO implementations); monthly is `YYYY-MM` off the LOCAL calendar.
 * @param {string} cadence
 * @param {Date} now
 * @param {(date: Date) => string} weekKey
 * @returns {string}
 */
function periodKey(cadence, now, weekKey) {
    if (cadenceOf(cadence) === 'weekly') return weekKey(now);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Start-of-period boundary used by the anti-stage rule. Weekly = this ISO week's Monday 00:00 local;
 * monthly = the 1st at 00:00 local.
 * @param {string} cadence
 * @param {Date} now
 * @returns {Date}
 */
function periodStart(cadence, now) {
    if (cadenceOf(cadence) === 'weekly') return mondayOf(now);
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Fixed windows: weekly expires at the end of this ISO week (Sun 23:59:59.999 local); monthly runs a
 * rolling 10 days from the assignment day, so it can cross into the next month.
 * @param {string} cadence
 * @param {Date} now
 * @returns {Date}
 */
function deadline(cadence, now) {
    if (cadenceOf(cadence) === 'weekly') {
        const start = periodStart('weekly', now);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
    }
    const end = new Date(now);
    end.setDate(end.getDate() + (MONTHLY_WINDOW_DAYS - 1));
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * The [tier, list] pairs a cadence draws from.
 * @param {string} cadence
 * @param {QuestLists} lists
 * @returns {Array<[string, any[]|null|undefined]>}
 */
function tiersFor(cadence, lists) {
    return CADENCE_TIERS[cadenceOf(cadence)].map(
        (tier) => /** @type {[string, any[]|null|undefined]} */ ([tier, lists[QUEST_LIST_KEY[tier]]])
    );
}

/**
 * True when `cadence` still draws from `questType` — the legacy self-heal probe.
 * @param {string} cadence
 * @param {string} questType
 * @returns {boolean}
 */
function servesTier(cadence, questType) {
    return CADENCE_TIERS[cadenceOf(cadence)].indexOf(questType) !== -1;
}

/**
 * Eligible = incomplete Quest Log items of the cadence's tier(s) that existed BEFORE this period
 * opened (anti-stage). Items missing the `created` stamp (legacy saves) are treated as pre-period,
 * i.e. eligible.
 * @param {string} cadence
 * @param {Date} start
 * @param {QuestLists} lists
 * @returns {Pick[]}
 */
function eligibleQuests(cadence, start, lists) {
    const out = [];
    for (const [tier, list] of tiersFor(cadence, lists)) {
        for (const q of (list || [])) {
            if (!q || q.completed) continue;
            if (q.created && new Date(q.created) >= start) continue;
            out.push({ id: q.id, tier });
        }
    }
    return out;
}

/**
 * Deterministic index into a pool, seeded by periodKey (+ optional salt so the reroll lands on a
 * different slot than the original pick). A string hash feeding one Lehmer step — the same
 * 16807/2147483647 generator family the daily quest board uses, though the board seeds from a
 * parsed date and drives a Fisher-Yates shuffle rather than a single index.
 * @param {string} key
 * @param {string|undefined|null} salt
 * @param {number} length
 * @returns {number}
 */
function seededIndex(key, salt, length) {
    if (length <= 0) return 0;
    const str = `${key}:${salt || ''}`;
    let s = 0;
    for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) % 2147483647;
    s = (s * 16807) % 2147483647;
    return s % length;
}

/**
 * The seeded pick itself — pool entry chosen for `key`/`salt`. Returns null for an empty pool.
 * @param {Pick[]|null|undefined} pool
 * @param {string} key
 * @param {string|undefined|null} [salt]
 * @returns {Pick|null}
 */
function pickFrom(pool, key, salt) {
    if (!pool || pool.length === 0) return null;
    return pool[seededIndex(key, salt, pool.length)];
}

/**
 * The "no eligible quest" record, which drives the dashboard's add-a-quest nudge.
 * @param {string} cadence
 * @param {string} key
 */
function emptyBounty(cadence, key) {
    return { periodKey: key, cadence, empty: true };
}

/**
 * A freshly assigned bounty record.
 * @param {{ cadence:string, periodKey:string, pick:Pick, now:Date, expiresAt:Date }} args
 */
function assignedBounty({ cadence, periodKey: key, pick, now, expiresAt }) {
    return {
        periodKey: key,
        cadence,
        questType: pick.tier,
        questId: pick.id,
        assignedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        chestTier: CHEST_TIER_BY_QUEST_TIER[pick.tier],
        status: 'active',
        rerolled: false,
    };
}

/** A fresh, empty cadence map — the shape `activeBounties` is initialized to. */
function emptySlots() {
    return { weekly: null, monthly: null };
}

/**
 * The live quest a bounty targets (its title may have changed; it may have been deleted → null).
 * @param {any} bounty
 * @param {QuestLists} lists
 */
function findQuest(bounty, lists) {
    if (!bounty || bounty.empty) return null;
    const key = QUEST_LIST_KEY[bounty.questType];
    const list = key ? lists[key] : null;
    return (list || []).find((/** @type {any} */ q) => q && q.id === bounty.questId) || null;
}

/**
 * True when the quest is the live target of an ACTIVE bounty — badges the Quest Log card.
 * @param {Record<string, any>|null|undefined} activeBounties
 * @param {any} questType
 * @param {any} questId
 * @returns {boolean}
 */
function isTarget(activeBounties, questType, questId) {
    if (!activeBounties) return false;
    for (const cadence of CADENCES) {
        const b = activeBounties[cadence];
        if (b && !b.empty && b.status === 'active' && b.questType === questType && b.questId === questId) {
            return true;
        }
    }
    return false;
}

/**
 * STRICTLY past its window. See the header: `_soonestClaimableBounty` deliberately uses an inclusive
 * variant, so the two disagree for exactly the boundary millisecond.
 * @param {any} bounty
 * @param {number} nowMs
 * @returns {boolean}
 */
function isPastWindow(bounty, nowMs) {
    return nowMs > new Date(bounty.expiresAt).getTime();
}

/**
 * Human "time remaining" label for the dashboard card.
 * @param {string|number|Date} expiresAt
 * @param {number} nowMs
 * @returns {string}
 */
function timeLeftLabel(expiresAt, nowMs) {
    const ms = new Date(expiresAt).getTime() - nowMs;
    if (ms <= 0) return 'expired';
    const hours = Math.floor(ms / HOUR_MS);
    if (hours < 1) return 'less than 1h left';
    if (hours < 24) return `${hours}h left`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} left`;
}

const BOUNTY_LOGIC = Object.freeze({
    CADENCES,
    DEFAULT_UNLOCK_LEVELS,
    CHEST_TIER_BY_QUEST_TIER,
    CADENCE_TIERS,
    QUEST_LIST_KEY,
    MONTHLY_WINDOW_DAYS,
    daysFromMonday,
    mondayOf,
    isUnlocked,
    periodKey,
    periodStart,
    deadline,
    tiersFor,
    servesTier,
    eligibleQuests,
    seededIndex,
    pickFrom,
    emptyBounty,
    assignedBounty,
    emptySlots,
    findQuest,
    isTarget,
    isPastWindow,
    timeLeftLabel,
});


// Node / Jest

export default BOUNTY_LOGIC;
