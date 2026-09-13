# Life Quest Journal — Feature Roadmap

> **Current Released Version:** 3.0.0 (Build 32) — Play Store
> **In Development:** §3.2 Crafting System (deferred out of 3.0.0); §3.8 Prestige — which the
> re-scoped §N2 late-game unlock hook blocks on; Track 2 boss portraits still deferred (see § v2.9)
> **Last Updated:** Sep 12, 2026 (Differentiation Review — see the section before the Priority Matrix)

This document is the **forward-looking plan only**. Shipped-work
narratives live in two places:

- `CHANGELOG.md` — per-release notes (v2.4.10 onward)
- `docs/HISTORY.md` — the full release archaeology: design rationale,
  per-day timelines, reverted experiments, audit logs, and as-built
  notes for everything from Phase 1 (v2.4) through the in-flight v2.9
  work. If a section here references a § number that isn't in this
  file, it's in HISTORY.

---

## Current Feature Inventory

| System | Status |
|---|---|
| Quest Log (Epic / Yearly / Monthly / Weekly / Side) | ✅ Live |
| Daily Quests (Tasks / Rituals / Recurring) | ✅ Live |
| Task Checklists / Subtasks (add, toggle, progress bar, completion gating) | ✅ Live |
| XP / Leveling / Titles (gendered title chains) | ✅ Live |
| Gold & Treasury (chests: Bronze/Silver/Gold/Royal) | ✅ Live |
| Focus Timer + Focus Crystals | ✅ Live |
| Pomodoro Chains (multi-session chains, breaks, chain bonus) | ✅ Live |
| Spellbook (10 spells, rarities, charges) | ✅ Live |
| Enchantments (timed buffs) | ✅ Live |
| Companions (10 pets with passive bonuses) | ✅ Live |
| Boss Battles (daily/weekly/monthly + streaks) | ✅ Live |
| Achievements & Badges | ✅ Live |
| Titles & Marks (equippable) | ✅ Live |
| Themes (14 unlockable: 8 pure-CSS + 6 hybrid WebM) | ✅ Live |
| Login Bonus (7-day cycle) | ✅ Live |
| Streak Shields | ✅ Live |
| Weekly Recap | ✅ Live |
| Challenges (friend challenges via share links) | ✅ Live |
| Referral System | ✅ Live |
| Share Cards (stat cards as images) | ✅ Live |
| Calendar View | ✅ Live |
| Analytics (activity heatmap, XP timeline, task breakdown, productivity patterns, personal records) | ✅ Live |
| Habit Heatmap (GitHub-style with click-to-backfill) | ✅ Live |
| Search | ✅ Live |
| Push Notifications & Reminders | ✅ Live |
| Tutorial & Onboarding | ✅ Live |
| Beginner's Blessing (3-day 2x boost) | ✅ Live |
| Premium System (IAP gating) | ✅ Live |
| Data Export / Import (JSON backup) | ✅ Live |
| PWA + Android (Capacitor) | ✅ Live |
| Basic Accessibility (ARIA labels on key interactive elements) | ✅ Live |
| Theme Preview Modal (on-demand WebM preview, a11y-complete) | ✅ Live (v2.8) |
| Google Play In-App Updates (flexible flow) | ✅ Live (v2.4.10) |
| Theme of the Week (9-week rotation, trial + upsell + analytics funnel) | ✅ In code (v2.9, unreleased) |
| Boss combat visuals (damage-trail HP bar, crit reticle, defeat dissolve, loot fountain, monthly FINAL BLOW) | ✅ In code (v2.9, unreleased) |
| Chest loot fountain (rewards erupt from chest → avatar ring, panel opens on arrival) + sequential rarity-ordered loot reveal (best lands last) | ✅ In code (v2.9, unreleased) |
| Android hardware back button (overlay-aware close → dashboard → minimize) | ✅ In code (v2.9, unreleased) |
| Desktop sidebar "More" disclosure (declutters far-off locked nav for new players; desktop-only) | ✅ In code (unreleased, UX audit L6) |
| Streak Repair (first repair free; then premium spends Focus Crystals within 48h to restore a broken login/habit streak) | ✅ In code (unreleased, §1.7, v621; first-free P2b) |
| Double XP Weekend (first weekend of each month, UTC, 2× XP; behind a limited-time-events kill-switch) | ✅ In code (unreleased, v621) |

---

## Shipped Phases — summary only

Full narratives in `docs/HISTORY.md` (same § numbers) and `CHANGELOG.md`.

| Phase / Section | Scope | Shipped |
|---|---|---|
| **Phase 1** (§1.1–1.6) | Quick-add FAB, notification improvements, Pomodoro chains, `effects-manager.js` animation system, in-app updates, GIF-fallback removal (~98 MB reclaimed) | v2.4.1 – v2.7.1 |
| **§2.1** | View transitions & navigation polish (nav pulses later removed by the v2.7 calm pass) | v2.5.0, May 24, 2026 |
| **§2.2** | Character Sheet & Player Panel overhaul (developed as v2.6, rolled into v2.7.0) | v2.7.0, May 31, 2026 |
| **§2.3** | Quest card & component redesign + Motion Calm Pass + design-token layer | v2.7.0, May 31, 2026 |
| **§2.3.1** | v2.7.x patch window: modal-containment audit (8 fixed), themed-particle visibility fix, GIF removal | v2.7.1, Jun 1, 2026 |
| **§2.4** | Theme System Expansion: 6 hybrid WebM themes, Strategy D, compression sweep (16.5→10.8 MB), Proposal B free/premium rebalance, preview modal, `totalGoldEarned` migration | v2.8.0, Jun 7, 2026 |

**Standards that remain binding** (full text in HISTORY):

- **Modal containment** — every centered modal carries
  `max-h-[90vh] overflow-y-auto` (or the flex-col sticky-header
  variant). See HISTORY §2.3.1.
- **Theme asset rule** — prefer pure-CSS themes; hybrids allowed when
  a supplied WebM markedly elevates the theme AND no single asset
  exceeds ~2MB compressed without a compression plan. See HISTORY §2.4.
- **Theme-specific particle keyframes use a theme-prefix** (global
  keyframe namespace collision lesson, HISTORY §2.4 Cathedral note).
- **SW cache naming** — hundreds-digit tracks the minor version
  (v6xx = v2.7.x, v7xx = v2.8+). Currently mid-v7xx series.

---

## Active — v2.9: Loot, Chest & Boss Battle Visuals + Theme of the Week ✅ shipped (2.9.0)

**Status (Jun 15, 2026):** **v2.9.0 (Build 27) cut to the Play Store.**
Tracks 3–7 + the Track 1 chest code (asset-gated WebM/PNG pipeline +
chest loot fountain) shipped; **Track 2 boss portraits deferred to a
later v2.9.x** (resolves decision D4 — see below). Track 1 ships with
zero art assets in the build: missing chest art falls back to the
existing emoji + CSS celebration, so dropping the cinematics/statics in
later is a content-only update. Regression tests live behind the
`v2.9 Track N` comment anchors in `goal-manager.js` /
`effects-manager.js` / `animations.css`; as-built notes in
`docs/HISTORY.md` §2.5. SW cache `v616`.

| Track | Deliverable | Status |
|---|---|---|
| 3 | Boss HP bar — shipped as a two-layer **damage-trail bar** (not the planned chunk segmentation); crit-yellow vs hit-red flash | ✅ in code |
| 4 | Crit / weakpoint indicators — reticle + shockwave + time-dilation in `effectsManager.bossCrit()` | ✅ in code |
| 5 | Defeat sequence — `particleType` per boss theme (shadow/ember/slime/frost/radiant), `bossDefeatDissolve()` + `lootFountain()` into the avatar ring | ✅ in code |
| 6 | Monthly final blow — **FINAL BLOW! overlay + vignette** (planned `body.slow-motion` global override rejected as too risky) | ✅ in code |
| 7 | Theme of the Week — 9-week deterministic rotation, Monday spotlight, end-of-trial revert+upsell, Q7 analytics funnel wired | ✅ in code |

### Follow-ups after 2.9.0 (target v2.9.x)

**Track 1 — Per-tier chest-open sequences ✅ code shipped (2.9.0), art assets pending**
- *Code side landed Jun 11:* asset-gated WebM/PNG pipeline in
  `goal-manager.js` — `_probeChestArt()` discovers per-tier files at
  startup (HEAD probes, no 404s), `celebrateChestOpen` plays an
  alpha-transparent `chest-open-<tier>.webm` overlay when present
  (muted, ≤2s, force-cleaned at video end / the loot-panel hand-off, CSS
  fallback on playback error / reduced-motion / fx-minimal), and
  treasury tiles + the celebration icon swap emoji for
  `chest-<tier>.webp|png` statics. Naming contract + encode specs in
  `images/chests/README.md`. Drop assets in — zero further code.
- *Code side landed Jun 15:* **chest loot fountain** — `showChestRewards()`
  now reuses `effectsManager.lootFountain()` (the boss-defeat collection
  effect): the reward icons erupt from the chest and arc into the player
  avatar ring ~1.2s after the chest opens, and the loot panel now opens on
  the fountain's `onArrive` callback rather than the old fixed 2200ms
  timer ("loot flows from the chest into you, then you open it"). The
  outward CSS coin burst was trimmed (20→12) so it reads as the chest
  explosion and the fountain as the inward collection payoff. Sprite
  z-index raised 9100 → 10001 so the loot renders in front of the chest
  cinematic/icon (the chest layers sit at 9999). Falls back to the legacy
  fixed-delay panel open when `effectsManager` / the avatar ring is
  absent; inherits the effect's a11y gating (minimal-fx → instant,
  reduced-motion → hidden, off-screen ring → viewport-center). 3
  regression tests.
- Remaining (asset + polish): the per-tier cinematics themselves
  (bronze = latch pop; silver = side-hinged lid + starfield; gold =
  dual-lid + god-rays; royal = floating rotating lid + prismatic
  refraction) now ship as video content rather than CSS/SVG sequences.
- Sequential item-by-item loot reveal staggered by rarity (hooks into
  `showLootPanel`); adjust `showChestRewards()` delay per tier. (The
  Jun 15 loot fountain delivers the "loot flies to you" feel; this
  remaining item is the staggered *panel* reveal on top of it.)
- Coordinate with §2.6 R2 per-tier chest audio.
- **Asset-gated (D2 — resolved toward video):** 4–5 alpha WebM
  cinematics + 5 static WebP/PNGs. Any art source that exports
  frames/video works now; the lid-sprite SVG approach is obsolete.

**Track 2 — Boss portraits / illustrated art ⏸️ deferred from 2.9.0 → v2.9.x**
- *Explicitly cut from the 2.9.0 release (Jun 15)* so the boss-combat
  visuals, Theme of the Week, and chest pipeline could ship without
  waiting on the art-source decision. Bosses keep their existing emoji
  icons until this lands; nothing in 2.9.0 depends on it.
- Optional `portraitUrl` field on boss theme definitions, `<img>`
  portrait swap with emoji fallback (supports phased rollout:
  monthly → weekly → daily).
- Damaged-state CSS filter ramp keyed to HP % (desaturate → red tint
  → bloodied vignette + shake).
- **Still blocked on D1:** AI-generated vs. commissioned art decision
  needed first. Code itself is ~1 day once art direction is chosen.

**Track 7 leftovers**
- **Q5 dashboard card surface** — persistent between-summary-and-habits
  card slot was descoped; Monday spotlight modal + `.theme-featured`
  tile badge are the only surfaces. Reconsider if user testing flags
  low awareness.

**Deferred audit findings** (from the Jun 10–11 mid-cycle audits —
fix log in `docs/HISTORY.md` §2.5):
- ~~**Bundle Tailwind/icons/fonts locally**~~ ✅ **Fixed (Jun 11)** —
  Tailwind is now compiled at build time (`npm run build:css` →
  minified `tailwind.css`; `tailwind.config.js` carries the
  dynamic-class safelist for all `from-${color}-900`-style template
  literals). Remix Icons + Google Fonts (MedievalSharp, Cinzel,
  Uncial Antiqua, Inter) live in `vendor/` via `npm run fetch:vendor`
  (`scripts/fetch-vendor.js`, re-runnable). `index.html`,
  `landing.html`, and `privacy-policy.html` link local files; the SW
  caches them (CACHE_NAME → v614); `copy:web` chains the CSS build.
  The app makes zero CDN requests at runtime — privacy policy's
  third-party section updated to match.
- ~~**Toast "UNDO" action for deletes**~~ ✅ **Fixed (Jun 11)** —
  `deleteGoal` snapshots the deleted item + position and shows a toast
  with a tappable ↩️ UNDO button (`undoLastDelete` restores in place,
  one-shot, duplicate-id guarded). Toast system gained generic
  `action: { label, callback }` support.
- ~~**Toast tap-to-dismiss**~~ ✅ **Fixed (Jun 11)** — the whole toast
  is now a tap target that dismisses immediately and advances the
  queue (`dismissCurrentToast`). Closes L4 below.

**Open decisions**
- **D1:** Boss portrait art source (AI vs. commissioned) — blocks Track 2.
- ~~**D2:** Chest lid sprite source~~ ✅ **Resolved (Jun 11)** — Track 1
  re-architected to alpha-WebM cinematics + static WebP/PNG art (wired,
  asset-gated). The remaining choice is only *who makes the videos*
  (AI / DIY render / commission), which no longer blocks any code.
- ~~**D4:** Ship Tracks 3–7 as v2.9.0 now and let Tracks 1–2 follow in
  v2.9.x, vs. hold for a single combined release.~~ ✅ **Resolved
  (Jun 15)** — shipped **2.9.0 (Build 27)** with Tracks 3–7 + the Track 1
  chest code (asset-gated, falls back to emoji/CSS). Track 2 boss
  portraits deferred to a later v2.9.x (still blocked on D1); Track 1 art
  assets land as a content-only follow-up.

---

## Planned — §1.7 Streak Protection & Recovery (v2.9.x or v2.10)

Retention-focused safety net for daily-login and habit streaks. Today a
single missed day zeroes a streak — punishing for users with long
habit chains who get sick or travel. Adds forgiveness that preserves
the *meaning* of a streak without making one missed day catastrophic.

- **Streak Freeze (consumable)** — held in inventory, auto-protects the
  daily-login streak from a missed day. Consumed silently; next-morning
  toast explains ("❄️ Streak Freeze used — your 47-day streak is safe!").
- **Habit-specific protection** — each habit can hold its own freeze
  charge so a missed yoga day doesn't burn the global freeze.
- **Acquisition** — chest drops (uncommon), §3.7 Rotating Market for
  Gold, automatic award at every 30-day streak milestone.
- **Caps** — free: max 1 held, 1 use per 7 days. Premium (§6.4): max 3
  held + automatic "sick day" shield (1 free freeze per 30 days).
- **UX safeguards** — opt-out settings toggle; one-tap "don't use my
  freeze" on the next-day toast for intentional re-breaks.
- ~~**Streak repair (premium-only)**~~ ✅ **Shipped in code (Jun 21, v621;
  first-repair-free Jun 27 per friction-audit P2b)** — within 48h of a
  login/habit break, restore a streak; **every player's first repair is free**
  (`freeStreakRepairUsed`), then premium spends Focus Crystals (cost scales ~1
  per 10 lost days, min 1, capped at 5) and non-premium users hit the upsell.
  `repairableStreaks` snapshots de-dupe per target + auto-prune at 48h;
  dashboard card + §1.7 Streak Repair unit suite.

---

## In Development — §1.8 Royal Bounty (Spotlight Quests + Bonus Chest) (v2.9.1) 🚧

Engagement boost for the **higher-tier quests**. Daily quests get
constant reinforcement (you touch them every day), but weekly / monthly
/ yearly / epic quests have long, low-urgency horizons where it's easy
to drift. A Bounty periodically spotlights one of those quests and
offers a **free bonus treasure chest** for completing it inside a tight
window — manufacturing short-term urgency *inside* a long-horizon goal.
Pure upside (no penalty for ignoring it), in keeping with the
positive-loop philosophy (§3.9's enrage penalties are opt-out for the
same reason).

**Why it fits v2.9.x (the "does this belong in 2.9" answer):** yes —
it's a natural v2.9.x follow-up because it reuses two systems 2.9.0 just
shipped. The deterministic period rotation + dashboard spotlight card +
`.featured` tile badge come straight from **Track 7 Theme of the Week**
(`getISOWeekNumber` / `getISOWeekYear`, `YYYY-Wnn` idempotency keys,
`renderWeeklyThemeCard`), and the reward reuses the **Track 1 chest
pipeline** — `openTreasureChest(tier, /*free*/ true)` already supports a
no-cost open and now plays the chest cinematic + loot fountain. Net new
surface area is small. Self-contained and bonus-only, so it ships
without touching balance-sensitive systems.

### Design decisions
- **Cadence (recommended MVP):** a **Weekly Bounty** (assigned each
  Monday, targets one incomplete `weeklyGoals` item, window = rest of
  the ISO week) and a **Monthly Bounty** (assigned on the first app-open
  of the calendar month, targets a `monthlyGoals` item, window ≈ 10 days
  from assignment). Can ship Weekly-only first, add Monthly second.
  *(Shipped: monthly pool narrowed to `monthlyGoals` only; weekly pool
  also includes `sideQuests`. See `_bountyTiers`.)*
- **Tight sub-deadline, not the quest's own expiry.** The value is
  urgency: a monthly quest has a whole month, so the bounty says
  "finish it in the next ~10 days for a bonus chest." `expiresAt` is
  shorter than the quest's natural period.
- **Reward tiers scale with quest tier:** weekly → **Silver**, monthly →
  **Gold**, yearly/epic → **Royal**. Reuses the existing chest tiers.
- **Anti-gaming (the critical rules):**
  - Selection is **assigned, never chosen**, so users can't pre-stage a
    trivial quest to farm it.
  - Eligible pool excludes quests **created after the period opened**
    (`createdAt >= periodStart`) — no "add 'drink water' as a weekly,
    instant-claim."
  - **One claimable bounty chest per cadence per period** (hard cap,
    matching the charge-cap / lucky_loot balance discipline).
- **Anti-frustration:** **one reroll per period** so an undoable target
  ("file taxes") doesn't waste the window.
- **Empty pool:** if there are no eligible quests for the cadence, show a
  nudge card ("A bounty awaits — add a weekly quest to claim it")
  instead of nothing. Doubles as a prompt to actually use the
  higher-tier quest types this feature exists to encourage.
- **Surfacing:** a dashboard Bounty card (mirror `renderWeeklyThemeCard`)
  + a `.bounty-target` badge on the spotlighted quest card + an optional
  assignment notification (honors existing notification settings).

### Data model sketch
Persisted on `GoalManager` via the standard `saveData` / `loadData`
fallback pattern (like `weeklyTrialPromptShown`). Keyed by cadence so
Weekly + Monthly can run concurrently:

```js
// One active bounty per cadence. `empty:true` records "no eligible
// quest this period" so we show the nudge card without re-rolling.
this.activeBounties = {
  weekly:  null,  // or the bounty object below / { periodKey, empty:true }
  monthly: null,
};
// Period guard — at most one claimed bonus chest per cadence per period.
this.lastBountyClaim = {};   // { weekly: '2026-W24', monthly: '2026-06' }

// Bounty object shape:
// {
//   periodKey:  '2026-W24',            // ISO week-year key, or '2026-06' (monthly)
//   cadence:    'weekly',              // 'weekly' | 'monthly'
//   questType:  'weekly',              // 'weekly'|'monthly'|'yearly'|'epic'
//   questId:    1234,                  // id of the targeted Quest Log item
//   assignedAt: '2026-06-08T07:00:00Z',
//   expiresAt:  '2026-06-14T23:59:59Z',// tight sub-deadline
//   chestTier:  'silver',              // weekly→silver, monthly→gold, yearly/epic→royal
//   status:     'active',              // 'active' | 'claimed' | 'expired'
//   rerolled:   false,                 // one reroll per period
// }
```

*Prerequisite:* Quest Log items need a `createdAt` stamp for the
anti-stage rule. Side quests already store `created`; the goal tiers
should stamp `createdAt` on creation (cheap add to the `addGoal` /
quick-add paths; existing items without it are treated as "pre-period"
= eligible).

### Selection logic sketch
Deterministic per period, but **persisted on assignment** (unlike Theme
of the Week, the pool is user-specific and dynamic, so we can't purely
recompute — we pick once and store, guarded by `periodKey`):

```js
maybeAssignBounty(cadence = 'weekly', now = new Date()) {
  const periodKey = this._bountyPeriodKey(cadence, now);      // 'YYYY-Wnn' | 'YYYY-MM'
  const cur = this.activeBounties[cadence];
  if (cur && cur.periodKey === periodKey) return;             // already handled this period

  const pool = this._bountyEligibleQuests(cadence, periodKey);// incomplete + created before periodStart
  if (pool.length === 0) {
    this.activeBounties[cadence] = { periodKey, empty: true };
    this.saveData();
    return;
  }
  // Seeded pick — reuse the daily-board LCG seeded by periodKey so a
  // reload can't reroll for free.
  const quest = this._seededPick(pool, periodKey);
  this.activeBounties[cadence] = {
    periodKey, cadence,
    questType: quest._tier,
    questId:   quest.id,
    assignedAt: now.toISOString(),
    expiresAt:  this._bountyDeadline(cadence, now).toISOString(),
    chestTier:  BOUNTY_CHEST_TIER[quest._tier],   // {weekly:'silver',monthly:'gold',yearly:'royal',epic:'royal'}
    status: 'active', rerolled: false,
  };
  this.saveData();
  if (typeof trackEvent === 'function') trackEvent('bounty_assigned', { cadence, questType: quest._tier });
}

// Eligibility: incomplete Quest Log items of the cadence's tier(s),
// created before this period opened (anti-stage).
_bountyEligibleQuests(cadence, periodKey) {
  const tiers = cadence === 'weekly'
    ? [['weekly', this.weeklyGoals]]
    : [['monthly', this.monthlyGoals], ['yearly', this.yearlyGoals], ['epic', this.lifeGoals]];
  const periodStart = this._bountyPeriodStart(cadence, periodKey);
  const out = [];
  for (const [tier, list] of tiers) for (const q of (list || [])) {
    if (q.completed) continue;
    if (q.createdAt && new Date(q.createdAt) >= periodStart) continue;
    out.push({ ...q, _tier: tier });
  }
  return out;
}
```

**Completion hook** — from the existing "complete a Quest Log item"
path, call `checkBountyCompletion(questId)`: if an active bounty targets
that quest and `now <= expiresAt`, set `status:'claimed'`, stamp
`lastBountyClaim[cadence]`, and award the chest via
`openTreasureChest(b.chestTier, true)` (free open → fires the chest
cinematic + loot fountain shipped in 2.9.0).

**Expiry / refresh** — piggyback on the existing period-transition
checks (`lastWeekNumber` / `lastMonth` in `checkPeriodTransitions`): on a
new period, stale `active` bounties flip to `expired` and
`maybeAssignBounty` runs for the fresh period. Assignment itself is
deferred on boot like the Theme-of-the-Week checks (next-tick timeout)
so it never blocks first paint or stacks on another modal.

**Reroll** — `rerollBounty(cadence)` re-picks from the eligible pool
excluding the current `questId`, sets `rerolled:true`; no-op if already
rerolled or not `active`.

### Resolved decisions (Jun 15, 2026)
- ~~**B1:** Scope of the first cut.~~ ✅ **Both Weekly + Monthly** ship
  together in v2.9.1.
- ~~**B2:** Window length.~~ ✅ **Fixed windows** — Weekly = rest of the
  ISO week (assigned Mon, expires Sun 23:59 local); Monthly = a fixed
  **10-day** window measured from the assignment day (the first app-open
  of the calendar month, not necessarily the 1st) → expires end of the
  10th day, i.e. `assignedAt + 9 days` at 23:59 local. `_bountyDeadline`
  is the source of truth.
- ~~**B3:** Reroll.~~ ✅ **Premium-only** perk (§6.4) — free users get
  the assigned bounty + the option to ignore it; premium users get one
  reroll per period. Non-premium reroll routes to the upsell modal.
- ~~**B4:** Empty-pool behavior.~~ ✅ **"Add a quest" nudge card** — when
  no eligible quest exists for a cadence, the dashboard shows a nudge to
  create one (drives higher-tier quest creation).
- ~~**B5:** Naming.~~ ✅ **Royal Bounty.**

### Cross-links
- **Track 7 Theme of the Week** — reuse the rotation/period helpers,
  dashboard card scaffold, and `.featured`-badge pattern.
- **Track 1 chest pipeline** — the bonus chest reuses the free-open path
  + loot fountain.
- **§3.7 Rotating Market** — another timed-rotation surface; could share
  a generic "period rotation" helper if both land.
- **§3.10 Quest Chain Mastery** — the heavier long-horizon cousin;
  Bounty is the lightweight, single-quest urgency nudge.
- **§1.7 Streak Protection** — sibling retention feature.

---

## §1.9 — Retention Gap Audit (Jun 16, 2026)

A sweep for retention/engagement gaps surfaced alongside the v2.9.1
Royal Bounty work. Ordered by value. The highest-value gap (proactive
streak-at-risk notification) shipped immediately; the rest are tracked
here with cross-links to their natural homes.

- ✅ **Proactive streak-at-risk notification (shipped v2.9.1)** — the
  highest-value gap. Previously the streak shield prompt only appeared
  *after* reopening the app having already missed a day; there was no
  "🔥 Your 18-day streak ends at midnight" nudge *before* the break.
  Now reuses the existing notification stack:
  - Native: `scheduleStreakRiskReminder()` pre-schedules a notification
    (id `88001`) for the next un-claimed day's slot, canceled/re-armed
    the moment the daily login bonus is claimed (`_completeLoginBonus`).
  - Web: the service worker re-evaluates streak state at fire time via
    the `streak` payload in `syncReminderSettingsToSW` (`isStreakAtRisk`
    in `checkAndSendReminders` + `handlePushEvent`).
  - Only fires when `loginStreak >= 3` and the day is genuinely at risk
    (`lastLoginBonusDate !== today`). Settings → 🔥 Streak Saver toggle
    + time (default `20:00`). Cache bumped `v617 → v618`.
- ✅ **Royal Bounty "ready" reminder (shipped)** — §1.8 assignment toast
  fires once when a bounty lands, but nothing nudged the player to
  *finish* it before the window closed (the "free chest" is the bounty's
  own chest reward — there is no separate free-chest system). Mirrors the
  streak-saver architecture exactly:
  - Native: `scheduleBountyReadyReminder()` pre-schedules a notification
    (id `88002`) for the next reminder slot before the bounty's deadline,
    canceled/re-armed on app open, claim (`checkBountyCompletion`),
    assignment/expiry (`refreshBounties`), and settings change.
  - Web: the service worker evaluates the `bounty` payload from
    `syncReminderSettingsToSW` at fire time (`isBountyClaimable` in
    `checkAndSendReminders` + `handlePushEvent`, once/day via
    `sentToday.bountyReady`).
  - "Claimable" = the soonest-expiring **active, unclaimed** bounty still
    in its window whose target quest is still **incomplete**
    (`_soonestClaimableBounty`, reusing the canonical `_bountyQuest`
    resolver). Settings → 👑 Bounty Reminder toggle + time (default
    `18:00`). Cache bumped `v618 → v619`. Covered by SW + GoalManager
    unit tests.
- **Habit-specific streak freeze** — planned in §1.7 but not built
  (global shield only). *(Cross-link: §1.7 "Habit-specific protection.")*
- ~~**Streak repair (spend Focus Crystals within 48h to restore)**~~ ✅
  **Shipped (Jun 21, v621; first repair free Jun 27, P2b)** — first repair free,
  then premium-gated; see §1.7 "Streak repair."
- ~~**Limited-time events**~~ ✅ **Shipped in code (Jun 21, v621)** — a
  recurring **Double XP Weekend** (first weekend of each month, UTC, 2×)
  folded into the `addXP` multiplier path (`getActiveXPEvent` /
  `getXPEventMultiplier`) with a dashboard banner + a
  `limitedTimeEventsEnabled` kill-switch; 10 unit tests. A lightweight
  precursor to §3.3 Seasonal Events; event bosses still deferred.
- **Dedicated weekly recap** — only ad-hoc stat-card sharing today; no
  automatic weekly "here's your week" summary card.
- **Leaderboards / guilds** — planned in §4 (social), not built. The
  heaviest lift; deferred behind the lighter retention wins above.

---

## §2.6 — Sound Design Expansion (v2.10)

Deliberately sequenced *after* v2.9 so the audio pass can cover the new
visual moments (per-tier chest opens, crits, defeat dissolves, FINAL
BLOW) while fixing the existing sound system's repetition and coverage
gaps. **Baseline:** 15 registered sounds in `audio-manager.js`. Jun 7
audit found 6 repetition issues (R1–R6) + 17 coverage gaps.

**Pass 1 — Resolve repetition (R1–R6)**
- **R1:** Split `spell` into `spell-cast` (spellbook) vs `enchantment-activate` — one file currently serves two systems (`goal-manager.js` ~6892 / ~9802).
- **R2:** Per-tier chest-open variants (`chest-open-bronze/silver/gold/royal`); `playChestOpen(tier)` picks variant, falls back to base.
- **R3:** Split `loot-coin` (one-shot chest-reveal sting) from `gold-earned` (short repeatable currency tick).
- **R4:** Dedicated `boss-crit` sound — crits currently just play `sword-slice` louder; `playSlash(isCrit)` swaps the sound, not just volume.
- **R5:** Wire up or delete the orphan `daily-achievement` (registered at `audio-manager.js:74`, never called).
- **R6:** Dedicated `task-complete` sound — tier sounds stop double-duty for routine completions.

**Pass 2 — Coverage gaps (8 ship-in-v2.10):**
`prestige-ascension`, `streak-freeze-used`, `boss-enrage`,
`badge-unlock`, `focus-start`, `focus-break-start`/`focus-break-end`,
`companion-evolve`, `error-blocked`.
*Code side landed Jun 11 (v2.9 cycle):* all 9 ids + `task-complete`
registered in `audio-manager.js` as optional sounds — missing files
are silently skipped (no console noise, no HTML-Audio retry);
`task-complete` falls back to `daily-achievement` per R6 so call sites
can switch now. Drop the `.mp3`s into `sounds/` to activate.
Nice-to-have backlog: streak milestone tiers, companion equip, theme
change, subclass select, chain mastery, title equip, pomodoro
milestone, task delete, modal open/close (opt-in only).

**Pass 3 — Variety (anti-habituation):** 2–3 randomized variants for
high-frequency sounds; `play('id')` checks `<id>-1/2/3.mp3`, falls back
to base. Priority: `task-complete`, `gold-earned`, `sword-slice`,
`boss-damage`, `loot-coin`, `notification`.
*Code side landed Jun 11:* `_probeVariants()` discovers variant files
at audio warm-up; `play()` picks randomly among base + found variants,
throttling stays keyed on the base id. Zero code changes needed when
variant files arrive.

**Pass 4 — Central volume table:** ~~replace scattered per-call-site
magic numbers with one `_eventVolumes` map on `AudioManager`~~ ✅ table
landed Jun 11 (all former magic numbers preserved verbatim; covered by
`tests/audio-manager.test.js`); the holistic back-to-back mix audit
remains for v2.10 when the new assets exist.

**Pass 5 — Sound theme packs (premium hook, cross-links §6.5 + themes):**
alternative sound sets per animated theme (Stormwatch thunder,
Verdant woodwinds, Crystal chimes, Cathedral organ/bells, Aurora pads);
themes without a pack fall back to the Medieval default. Cosmetic-only
premium per the §6.5 no-pay-to-win rule.

**Pass 6 — Accessibility + granular settings:** category sliders
(UI / Combat / Reward × master), "reduced audio" mode paired with
`prefers-reduced-motion`, per-sound mute toggles, opt-in visual sound
captions.

**Asset acquisition:** code-first (variant picker, settings UI, new
event ids silent or fallback-mapped); drop files into `/sounds/` as
they arrive, zero further code changes. Update `sounds/SOUNDS-README.md`
to the full inventory + variant naming convention.
*Status Jun 11:* variant picker + optional-id plumbing + volume table
are in (`audio-manager.js` + tests). Remaining for v2.10: the assets
themselves, R1–R5 splits, settings UI (Pass 6), theme packs (Pass 5),
SOUNDS-README inventory refresh shipped alongside.

---

## Phase 3 — Depth & Progression (v3.0)

Features that deepen the RPG layer and give long-term players more to chase.

### 3.1 — Skill Trees / Class System

> ✅ **Redesigned & shipped in code (v3.1, Jun 25–28 2026; unreleased).** The
> single-perk-per-class sketch below was superseded by the **v3.1 multi-perk
> redesign** (`docs/CLASS_REDESIGN.md`). Each class now has **5 linear nodes +
> 1 capstone**, each node its own perk; **Mystic was renamed Wizard** and
> `enchant_discount` moved to Scholar. Per that doc's §7, the redesign's
> **Phases 0–2 (all `[easy]` + `[med]` perks), all eight capstones, AND the
> Phase 3 Subclass Specialization layer (§9) are implemented and tested**
> (full suite green: 587 tests). The cost curve `[2,3,4,5,6,10]` maxes a class
> exactly at the L40 prestige unlock, where the **eight subclasses (2 per class,
> 3 tiers each at `[3,4,5]`)** then absorb the post-L40 skill-point overflow.
> **The subclass selection UI is the only remaining slice.** The four `[large]`
> **crafting** subsystems are **no longer part of 3.1** — they move to the
> **§3.2 Crafting System** update.

- Choose a "class" at a milestone level (e.g., Level 15): **Scholar**, **Warrior**, **Mystic**, **Ranger**
- Each class unlocks a small passive perk tree (3–5 nodes)
  - Scholar: bonus XP from focus sessions
  - Warrior: extra attack charges from tasks
  - Mystic: reduced enchantment costs
  - Ranger: bonus loot luck from chests
- Respec option available for Focus Crystals

**Subclass Specialization (Level 40+)**

> ✅ **Implemented in code & tested (v3.1, Jun 28 2026; unreleased) per `docs/CLASS_REDESIGN.md` §9.**
> The build-ready spec **decouples subclasses from prestige** and moves the unlock L30 → **L40**
> (where the base class maxes, so subclass tiers absorb the post-L40 skill-point overflow — the N2
> gap). Each class branches into **2 subclasses (pick one), each a single effect escalating over 3
> tiers** costing `[3,4,5]`; all eight effects are wired onto existing gameplay hooks and covered by
> the "Class System v3.1 — Subclasses" test suite. The §3.7/§3.9-dependent perks below (Diviner
> re-rolls, Necromancer re-summon, Pathfinder market loyalty) were **remapped onto existing hooks**
> (spell-charge refund / soul-harvest crystals / gold fortune). **Only the selection UI remains.**
> The prose below is kept for design intent; **§9 is authoritative.**

- At Level 30 each class branches into 2 subclasses, giving newly-prestiged players (§3.8 ascension threshold is Level 25) a near-term goal to chase post-Ascension.
  - **Scholar** → *Archivist* (deeper XP scaling from long focus chains) / *Sage* (passive crystal generation from completed habits)
  - **Warrior** → *Berserker* (escalating attack damage as boss HP drops) / *Guardian* (streak protection bonus — stacks with §1.7 freezes)
  - **Mystic** → *Diviner* (spell charge re-rolls in the Rotating Market §3.7) / *Necromancer* (re-summoned bosses §3.9 keep one rarity tier instead of dropping one)
  - **Ranger** → *Hunter* (bonus damage vs. weekly/monthly bosses) / *Pathfinder* (faster Rotating Market loyalty discount accumulation)
- Each subclass adds its own 3–4 node mini-tree on top of the base class tree, so subclass picks compound rather than replace earlier perk choices.
- Same Focus Crystal respec mechanic applies; subclass respec costs more than base-class respec to make the choice feel weightier.
- Subclass unlock is a permanent character milestone — surfaced on the Character Sheet, Share Card, and the player avatar ring alongside Prestige Stars (§3.8).

### 3.2 — Crafting System

> 📦 **Now also absorbs the four class `[large]` crafting subsystems deferred from §3.1**
> (`docs/CLASS_REDESIGN.md` §4 — Warrior weapon forging, Ranger arrow crafting, Wizard spell
> crafting, Scholar enchantment crafting). They were always Phase-3 `[large]` work; consolidating
> them here keeps 3.1 scoped to the class + subclass trees.

- Combine lower-rarity spell charges to craft higher-rarity ones
  - e.g., 3× Minor Wisdom → 1× Arcane Surge
- Combine crystal shards + gold to craft specific enchantment scrolls
- Gives a use for excess common drops and creates a resource sink

### 3.3 — Seasonal Events & Limited-Time Content
- Rotating monthly themed events (e.g., "Harvest Festival", "Frost Trials")
- Event-specific quest chains with unique cosmetic rewards (titles, themes, companion skins)
- Event leaderboard (personal bests, no server required)

### 3.4 — Companion Evolution
- Companions gain evolution stages at XP thresholds (e.g., Baby → Juvenile → Adult → Elder)
- Each evolution improves their passive ability multiplier
- Visual change (icon/emoji swap) at each stage
- Adds long-term attachment and collection depth
- **Cross-link to §6.4** — premium tier's second active companion slot stacks both equipped companions' passive multipliers (with a per-effect cap to prevent runaway scaling, e.g., +XP buffs cap at +15% combined regardless of how many companions stack).

### 3.5 — Achievement Gallery Overhaul
- Categorized badge pages: Combat, Productivity, Collection, Social, Milestones
- Progress tracking for locked badges (e.g., "Defeat 20 more bosses")
- Rare hidden achievements for discovery moments

### 3.6 — Boss Bestiary (refine existing)
- Expand the existing defeated bosses log into a full Bestiary page
- Add lore entries, boss art/icons, and per-boss kill stats (fastest kill, highest damage, etc.)
- Track collection progress ("Encountered X of Y boss types")

### 3.7 — Rotating Market
- A special shop that refreshes its inventory on a timer (daily deals + weekly featured stock)
- **Dual currency** based on item rarity:
  - **Common / Uncommon items** → priced in **Gold** (gives gold a meaningful sink)
  - **Rare / Epic items** → priced in **Focus Crystals** (gives crystals a spend path beyond enchantments)
  - **Legendary items** → priced in a **mix of Gold + Crystals**
- **Daily Deals (3 slots, refresh every 24h)**
  - Discounted spell charges (random rarity, 20–40% off)
  - Enchantment scrolls (pre-activated, skip the shop flow)
  - Crystal Shard or Gold bundles
- **Weekly Featured Stock (5 slots, refresh every Monday)**
  - Rare/Epic spell charges not commonly found in chests
  - Exclusive companion eggs (rotating pool of 2–3 companions)
  - Limited-run cosmetic themes or title scrolls
  - Occasional "Mystery Box" (random loot pull)
- **Market Loyalty**: consecutive days visiting the market builds a small loyalty discount (caps at 10%)
- Market UI: medieval merchant stall aesthetic, item cards with rarity borders and currency icons, "SOLD" stamps on purchased items
- Creates dual-currency sinks; prevents hoarding gold or crystals with no purpose; drives daily check-ins
- **Premium angle** (from the original Market design doc): free users
  see 3 daily slots; premium sees 5 + the weekly featured legendary.
  Shop prices sit above chest expected value so chests stay worthwhile.

### 3.8 — Prestige System & Title Perks
Two interlocking systems that reward long-term play with permanent power growth.

**Prestige (Ascension)**
- Available once a player reaches a threshold level (e.g., Level 25)
- Choosing to Ascend resets level back to 1, but grants a permanent **Prestige Star** (⭐)
- Each Prestige Star gives a small stacking passive buff (player chooses one per ascension):
  - ⭐ **Wisdom** — +5% XP from all sources
  - ⭐ **Fortune** — +5% Gold from all sources
  - ⭐ **Arcana** — +1 bonus crystal shard per focus session
  - ⭐ **Valor** — +5% boss damage
  - ⭐ **Serendipity** — +3% loot rarity luck
- Prestige stars are displayed on the player avatar ring (visual progression)
- All companions, spells, themes, titles, and badges are **kept** across prestiges — only level and XP reset
- Prestige count is shown in the Character Sheet and Share Card
- Caps at a reasonable number (e.g., 5–10 prestiges) to prevent runaway scaling
- **UI ideas** (from the original design doc): tiered avatar-panel
  borders per ascension (Bronze → Silver → Gold → Diamond → animated
  glow), Roman-numeral prestige badge next to the player name, an
  "Ascension Chamber" view with a dramatic animation.

**Title Perks**
- Earned titles now grant small permanent passive bonuses when equipped:
  - *Wanderer* — no perk (starting title)
  - *Knight* — +2% XP
  - *Baron* — +3% Gold
  - *Earl* — +1 attack charge per day
  - *Duke* — +5% boss damage
  - *King* — +5% loot luck
  - *Emperor* — +1 bonus crystal shard per focus session
  - *Legend* — +10% XP & Gold
  - *(Post-prestige titles)* Mythic, Ascendant, Immortal, Eternal — increasingly powerful perks
- Only the **equipped** title's perk is active (encourages strategic title choice vs. cosmetic preference)
- Title perk is shown on the Character Sheet next to the title name
- Creates meaningful choice: equip the title with the best perk, or the one that looks coolest?

### 3.9 — Boss Loop Expansion
Two paired additions that give long-term players agency over the boss cadence and a worthy target for stockpiled attack charges. Designed as a single shipping unit because each half makes the other more interesting (re-summons let you grind charges, the epic boss is what justifies grinding).

**Re-Summoning (spell + consumable item)**
- The weekly and monthly boss cadence is currently fixed — once a player defeats the boss for the period, there's no way to engage further until the timer resets. Adds two ways to summon a fresh boss within the same period for additional rewards:
  - **Spell** — *Echo of the Hunt* (rare): re-summons the current period's boss type with full HP. Single-use charge, consumed on cast.
  - **Consumable item** — *Summoning Brazier* (epic): same effect, available via Rotating Market (§3.7) or rare chest drops. Provides a non-spell path for players who don't invest in the spellbook.
- Diminishing returns to prevent grinding loops: each re-summon in the same period drops loot quality by one rarity tier (Royal→Gold→Silver→Bronze) and reduces XP/gold reward by 25% per stack. Reset at period rollover.
- Re-summoned bosses get a small HP/damage modifier scaled to the player's level so they remain a meaningful fight rather than a free farm.
- Boss log (existing defeated-bosses list) annotates re-summoned kills with a marker so the Bestiary (§3.6) can distinguish first-kill stats from re-summon stats.

**Epic / Apex Boss (single-player endgame)**
- A high-tier boss tuned for long-term players who have built up attack charges, prestige stars, and title perks. Distinct from §4.3 Cooperative Boss Raids (which is multiplayer).
- Unlock gate: minimum player level (e.g., Level 30), at least one prestige star, and a minimum lifetime boss-kill count to ensure the player has built the toolkit needed.
- Appears on a longer cadence than the monthly boss — quarterly or seasonal — so each encounter feels like an event rather than routine.
- Multi-phase fight: HP bar segmented into 3–4 phases, each with a mechanic shift (e.g., damage-reflect phase, charge-drain phase, elemental-weakness rotation). Drives strategic spell/enchantment loadout choice.
- Loot table is meaningfully better than monthly bosses: guaranteed Royal-tier chest, exclusive prestige-themed cosmetic drops, a rare chance at a unique companion or title not available elsewhere.
- Defeat unlocks a permanent badge and a Bestiary entry with lore.
- Optionally integrates with §3.3 Seasonal Events: each season's epic boss has a themed skin and a limited-time exclusive drop tied to the event window.

**Enrage Timers & Failure Penalties**
- The current boss cadence is binary: kill the boss before its period expires and you get the loot; miss it and you get nothing. Adds a *negative* consequence layer so ignoring a boss isn't free — converts boss expiration from a missed-opportunity to an active threat, giving §1.2's already-shipped boss expiration warnings real teeth.
- **Enrage windows** — each boss tier gets a soft deadline before the hard expiration:
  - **Weekly boss** — enters "Enraged" state at 72 hours remaining if still alive. Enrage applies a stacking 24h debuff to the player (e.g., −5% XP per stack, refreshes daily until the boss is killed or the period ends).
  - **Monthly boss** — enters Enraged at 7 days remaining. Debuff is harsher (−10% XP + locks one random equipped spell slot for the remainder of the period).
  - **Apex / Epic boss** — enrage shifts the fight itself: each unkilled day adds a permanent HP buff to the boss for that encounter (+5% per day) and unlocks a damage-reflect mechanic at 50% HP. Kills that happen post-enrage still award loot but at one rarity tier lower.
- **Penalty visibility** — debuffs surface on the Character Sheet under a new "Active Effects" pill row (red/orange treatment to distinguish from positive title perks). Each active curse links back to the boss that applied it so the player knows exactly how to clear it.
- **Escalating notifications** — §1.2's boss expiration warnings escalate copy from informational ("Boss expires in 1 hour!") through warning ("Boss enraged — debuff active!") to critical ("Final 24h — defeat the boss to lift the curse!"). Honors the existing notification settings so users who muted boss reminders stay muted.
- ~~**Opt-out for casual players** — Settings toggle (default ON) to disable enrage penalties~~ **Revised Sep 12, 2026 (Differentiation Review): enrage penalties are opt-IN, default OFF.** The positive-only loop is a core differentiator from damage-on-miss competitors and default-on debuffs punish the sick/travelling users §1.7 protects. Settings toggle enables enrage for players who want the threat; still one-way per period (can't disable mid-period to dodge an active debuff).
- **Cross-link to §3.1 Guardian subclass** — the Guardian subclass perk includes partial enrage resistance (debuff stacks cap one tier lower), giving subclass picks a defensive use-case beyond pure damage scaling.

### 3.10 — Quest Chain Mastery
Expands the existing quest-chain concept (currently scoped to §3.3 Seasonal Events with cosmetic-only rewards) into a permanent gameplay system where completing themed quest chains grants stat buffs that stack with class perks (§3.1), title perks (§3.8), and prestige stars (§3.8). Gives players a fourth permanent-progression axis distinct from level, class, and prestige.

- **Chain types** — themed multi-step quests that span days or weeks rather than the existing single-day daily quests:
  - **Discipline chains** — complete 30 focus sessions in 30 days → permanent +2% focus session XP
  - **Combat chains** — defeat 10 weekly bosses without missing a week → permanent +1 attack charge regen per day
  - **Collection chains** — earn 50 chests of any tier → permanent +3% loot luck
  - **Mastery chains** — reach a per-habit streak milestone (e.g., 100-day yoga streak) → permanent +1% XP from that habit category
  - **Exploration chains** — try every theme at least once → permanent +5% crystal shard yield (rewards engagement with the §2.4 theme expansion work)
- **Buff stacking rules** — each completed chain grants a small permanent buff (+1–5% range). Buffs stack additively with other chain buffs, multiplicatively with class/title perks, to prevent runaway scaling. Per-chain cap of +5% so no single chain dominates.
- **Chain visibility** — new "Quest Chains" page (slots into the Tools section or as a Character Sheet sub-tab) shows in-progress chains with step-by-step progress bars, completed chains with the awarded buff displayed, and locked/preview chains teasing future targets.
- **Pacing safeguards** — chains require sustained behavior over weeks/months by design; no chain completable in under 7 days. Prevents one-week grind sessions from frontloading all buffs.
- **Cross-link to §3.3 Seasonal Events** — seasonal event chains continue to award *cosmetic* rewards (titles, themes, companion skins) on top of any stat buff. Cosmetic vs. permanent-buff distinction keeps both systems meaningful — seasonal chains feel special, permanent chains feel earned.
- **No respec** — unlike class/subclass perks, chain buffs are uncapped-stack permanent additions to the character. Once earned, never lost (survives prestige resets per the §3.8 "kept across prestiges" rule). Creates the long-tail collection motivation Phase 3 is designed around.

---

## Phase 4 — Social & Multiplayer (v4.0)

> ⬇️ **Deprioritized behind Phase 5 (Sep 12, 2026 Differentiation Review)** — guilds/parties/
> shared-HP raids are the incumbent's home turf, need the server the no-server pillar avoids,
> and compete with a decade-old network. The live share-link friend challenges are the right
> no-server form. If co-op is built, an **async raid via share codes** is the only on-brand shape.

Features that connect players and drive organic growth.

### 4.1 — Guilds / Parties
- Create or join a guild (invite-link based, no server accounts needed)
- Shared guild quest board with collective goals (e.g., "Guild members complete 100 tasks this week")
- Guild XP and level — unlocks shared perks (bonus gold %, shared loot luck)
- Guild chat (simple message board via cloud sync)

### 4.2 — Leaderboards
- Opt-in anonymous leaderboards: Weekly XP, Boss Kills, Focus Hours, Streak Length
- Friend-only leaderboards via challenge links
- Seasonal leaderboard resets with cosmetic rewards for top tiers

### 4.3 — Cooperative Boss Raids
- Weekly "Raid Boss" with massive HP pool shared across guild members
- Each member's attack charges contribute to a shared damage pool
- Raid completion grants everyone in the guild unique loot
- Introduces cooperative motivation without requiring real-time play

### 4.4 — Social Feed / Activity Log
- Opt-in feed of friend achievements ("Alex defeated the Weekly Boss!", "Sam hit a 30-day streak!")
- React with quick emoji responses
- Drives friendly competition and accountability

---

## Phase 5 — Intelligence & Insights (v5.0)

Data-driven features that help users understand and improve their productivity.

### 5.0 — Analytics Foundation Audit (prerequisite) — ✅ done (v2.9.x, unreleased)
Before any of §5.1–5.5 build new analytics on top of the existing Analytics view, the existing page needed a full correctness pass. Several widgets rendered with empty, stale, or visibly-broken state (initially reported during v2.6 testing). The audit walked every widget — activity heatmap, XP timeline, task breakdown, productivity patterns, personal records, habit heatmap — against empty / partial / full datasets and fixed root causes (not symptoms).

**Bugs found & fixed:**

- ✅ **Heatmap start-date off-by-6 (off-by-one date math)** — the highest-value
  finding. Both the Activity Heatmap and the Habit Heatmap computed their grid
  start as `today − (weeksToShow*7 − 1) − weekday` instead of
  `today − weekday − (weeksToShow−1)*7`. The extra 6 days forced `startDate`
  onto a **Monday** every time (`−83 ≡ 1 (mod 7)`, and the `−weekday` term
  cancels today's offset), so the grid was mislabeled (Monday under the
  'S'/Sunday column, every day shifted one) **and** its newest cell was *last*
  week's Sunday — today's square was absent 6 days out of 7. Fixed via a single
  shared `_heatmapStartSunday()` helper.
- ✅ **XP Timeline scaled to all-history, not the visible window (stale scale)**
  — bar heights divided by the tallest day across *all* history, so an
  off-screen spike flattened every recent bar. Now scales to the window max.
- ✅ **"Longest Streak" personal record could decrease (data-source mismatch)**
  — it read a `longestStreak` field that was never persisted, falling back to
  the live `habit.streak` (resets to 0 on a miss). Now derived from each
  habit's append-only `completionHistory` via `_longestRunInHistory()`, so a
  record never goes down.
- ✅ **Activity Heatmap bucketing consistency** — completion keys now route
  through the same `new Date(…'T12:00:00') → dateToLocalString` pipeline as the
  XP Timeline (+ a missing-`dueDate` guard). (Consistency/defensive; canonical
  dates already matched.)

**Verified healthy (no change needed):** completion-rate denominator & empty
state (`renderQuickStats`), Productivity Pattern local-day parsing, Task
Breakdown totals/empty state, Goals Progress clamping/empty state — all already
covered by the v2.6.x audit's tests.

**Regression coverage added** (in `tests/goal-manager.test.js` → *Analytics
Aggregation*): `_heatmapStartSunday` (Sunday-aligned + today-inclusive across
every weekday), Activity Heatmap (today present, Sunday-aligned, empty grid),
XP Timeline window scaling, `_longestRunInHistory` (gaps / order / dupes), and
the Personal Records longest-streak record. Result: a known-good baseline that
§5.1 / §5.4 / §5.5 can extend with confidence.

### 5.1 — Smart Scheduling
- Analyze historical completion patterns (time of day, day of week)
- Suggest optimal scheduling for new tasks based on past behavior
- "Best time to focus" recommendation based on focus session completion rates

### 5.2 — Weekly AI Digest
- Auto-generated weekly summary: trends, highlights, areas of improvement
- Compare current week vs. previous week performance
- Celebrate improvements, gently flag declining metrics

### 5.3 — Goal Dependency Mapping

> ⬆️ **Pulled forward (Sep 12, 2026 Differentiation Review)** — scheduled directly after §3.8
> Prestige, ahead of the rest of Phase 3. The goal hierarchy is the app's primary structural
> differentiator and this is the feature that makes it *visible*. `parentIds` links already
> exist on every goal tier, so the data side is done. Scope additions: (a) an onboarding path
> that starts from "what is your Epic quest?" so the difference lands in the first minute;
> (b) shipped together with **Android home-screen widgets** (promoted from Backlog).

- Visual graph linking life goals → yearly → monthly → weekly → daily tasks
- See which daily actions feed into long-term objectives
- Identify "orphan" tasks with no strategic purpose

### 5.4 — Focus Session Analytics (refine existing)
- Expand the existing analytics to add focus-specific breakdowns: session length distribution, completion rate, time-of-day heatmap
- Track "deep work hours" per week with trend charts
- Integration with calendar view (show focus blocks on calendar)

### 5.5 — Analytics Export (refine existing)
- Expand the existing JSON export to include CSV/PDF export of analytics data
- Shareable productivity reports (weekly/monthly summaries)
- GDPR-compliant full data download

---

## Phase 6 — Platform & Monetization (v6.0)

Infrastructure and business model improvements.

### 6.1 — Cloud Sync & Multi-Device
- Optional cloud backup (Firebase / Supabase) with account creation
- Real-time sync across devices (phone, tablet, desktop)
- Conflict resolution for offline edits
- Foundation for all multiplayer/social features
- Tiering (from the original design doc): free users keep manual
  export/import; premium gets automatic cloud sync.

### 6.2 — iOS App
- Capacitor build for iOS
- App Store submission with proper assets
- iOS-specific: haptics, widgets, Shortcuts integration

### 6.3 — Desktop App Polish — DROPPED
Cut with the Jul 2026 platform-focus decision (Engineering Roadmap #8):
Capacitor/Android is the only supported shell, so the Electron/Windows desktop
build was retired. Kept here for history.
- ~~Electron tray icon with quick-add~~
- ~~System notification integration~~
- ~~Global hotkey for starting focus timer~~
- ~~Menu bar mini-timer display~~

### 6.4 — Premium Tier Expansion
- **Free tier**: All core productivity features, basic spells/enchantments, 1 companion slot, 1 streak freeze (§1.7) held at a time
- **Premium tier** (current + planned additions):
  - All spells/enchantments, unlimited companion collection, premium themes
  - **Second active companion slot** *(planned)* — equip two companions simultaneously; their passive multipliers stack subject to the per-effect cap noted in §3.4. First true gameplay-affecting premium perk (everything previously was cosmetic or collection-depth); justified as premium because the cap prevents pay-to-win runaway while still delivering a meaningful daily-play advantage.
  - **Streak protection upgrades** *(planned, §1.7)* — hold up to 3 streak freezes at a time + automatic "sick day" shield (1 free freeze per 30 days even if inventory is empty) + streak repair option (spend Focus Crystals to restore a recently-broken streak within 48 hours).
- **Premium+ / Annual**: Cloud sync, advanced analytics, priority seasonal content, exclusive companion evolutions

### 6.5 — Monetization Options
- Cosmetic-only microtransactions: theme packs, companion skins, title packs, sound packs (§2.6 Pass 5)
- One-time "Starter Pack" bundle (crystals + spells + theme)
- Ensure no pay-to-win: all gameplay-affecting items remain earnable through play

### 6.6 — Monetization Expansion

> 💰 **Today's model is a single one-time IAP unlock (`isPremium` + `premiumPurchaseToken`),
> which caps lifetime value.** This section layers *recurring* and *à-la-carte* revenue on top,
> all inside the §6.5 no-pay-to-win rule. The two highest-ROI, on-brand moves are a **Season Pass**
> on Seasonal Events (§3.3) and a **subscription** wrapping the Premium+ content already named in
> §6.4 — both add revenue without ever touching gameplay power.

- **Recurring — Subscription / Premium+ (formalize §6.4's "Premium+/Annual"):** a monthly/annual
  tier bundling Cloud Sync (§6.1), advanced analytics, priority seasonal content (§3.3), and
  exclusive companion evolutions (§3.4). Recurring revenue is the single biggest lever versus the
  current one-time unlock.
- **Recurring — Season Pass (on §3.3 Seasonal Events):** a per-event reward track with a **free
  lane** and a **premium lane**, paying out **cosmetics only** (themes, companion skins, titles,
  trophies). Best-in-class genre pattern and fully no-pay-to-win. Rewards are drawn from §6.7.
- **À-la-carte — Cosmetic storefront (depends on §6.7):** direct purchase of companion skins, theme
  packs, title packs, sound packs (§2.6 Pass 5), prestige avatar-ring frames (§3.8), and Boss Trophy
  cosmetics (backlog). The scalable, zero-power revenue engine.
- **Convenience tier (capacity, never power):** extra streak-freeze slots + sick-day shield
  (§1.7 / §6.4) and the premium Rotating Market slots (§3.7 — free 3 / premium 5 + weekly featured
  legendary). Convenience and capacity only.
- **Conversion funnels (extend what's already live):** generalize the weekly featured-theme free
  trial (the `weekly_theme_applied` → `weekly_theme_subscribe` analytics path already exists in
  `goal-manager.js`) to trial a premium companion/spell for a week; add contextual upsells at
  high-intent moments (about to lose a long streak; the streak-repair and bounty-reroll upsells
  already route to the purchase modal); ship the one-time **Starter Pack** bundle (§6.5).
- **Guardrails:** class/subclass perks stay free forever; never sell permanent power
  (XP / gold / damage). The §6.4 second-companion slot remains the *only* gameplay-affecting premium
  perk, justified solely by its per-effect cap (§3.4).

### 6.7 — Cosmetic System

> 🎨 **The customization layer is currently scattered** — themes (§2.4), companion skins, titles
> (`LEVEL_TITLES`, already 50 deep), Share Card styling, and planned sound packs (§2.6 Pass 5) each
> live on their own. This consolidates them into one **wardrobe / loadout** that §6.6 monetizes and
> the Season Pass fills. Pure content + identity; **no gameplay effect**, so the whole system sits
> safely inside the no-pay-to-win rule.

- **Categories:** animated themes, companion skins, avatar-ring frames & prestige flair (§3.8),
  titles, profile / Share Card styling, sound packs (§2.6 Pass 5), Boss Trophies (backlog).
- **Wardrobe UI:** a single hub to preview and equip owned cosmetics, with a persisted "equipped
  loadout." Reuses surfaces that already render identity (player avatar ring, Character Sheet,
  Share Card).
- **Unlock sources (dual, no-pay-to-win):** every cosmetic is BOTH earnable through play (chests,
  achievements, prestige stars, streak milestones, Season-Pass free lane) AND purchasable (premium
  lane / §6.6 storefront). Nothing cosmetic is ever purchase-exclusive forever.
- **Cosmetic currency — design decision:** optionally add a soft "cosmetic token" earned via play
  + buyable, spendable only on cosmetics. Keeps Gold/Crystals as gameplay sinks (§3.7) and isolates
  real-money spend to cosmetics. Alternative: direct per-item IAP. Decide at design.
- **Data model:** `ownedCosmetics` + `equippedCosmetics` maps mirroring the existing
  `unlockedThemes` / `isPremium` patterns, plus a cosmetic-definitions table keyed by category +
  rarity (mirrors `themeDefinitions`).
- **Cross-links:** feeds the §6.6 storefront and the §3.3 Season Pass; extends §2.4 Theme System
  and §2.6 sound packs; surfaces §3.8 prestige flair.

---

## Pre-v2.7.1 UX Audit — Deferred Findings (Jun 3, 2026)

Full 6-dimension UX audit run before tagging v2.7.1. The 2 ship-blockers
+ 8 quick fixes were addressed in v2.7.1 itself (see `docs/HISTORY.md`);
the deferred findings below remain open unless marked resolved.

| # | Finding | File / Area | Dimension |
|---|---|---|---|
| ~~**L1**~~ | ✅ **Fixed** — default level-1 title renamed `'Peasant'` → `'Wanderer'` across both `LEVEL_TITLES` chains (entry 1 only; 2–50 unchanged). `'Novice'` was rejected (collides with an existing badge/achievement) and `'Adventurer'` was passed over (already the game's generic player noun — `adventurerName`, notifications, marketing). Retitles existing level-1 users on update (changelog-noted); test + static placeholder updated. | `goal-manager.js` (`LEVEL_TITLES`) | Onboarding |
| ~~**L2**~~ | ✅ **Fixed (Jun 11)** — splash block now has `role="status"`, `aria-live="polite"`, `aria-label="Loading Life Quest Journal"`. | `index.html` splash block | Onboarding |
| ~~**L3**~~ | ✅ **Fixed (Jun 11)** — dishonest `"Loading wisdom..."` placeholder replaced with a real quote inlined in the HTML; JS re-picks on render as before. | `index.html` quote slot | Daily flow |
| ~~**L4**~~ | ✅ **Fixed (Jun 11)** — tap-to-dismiss added (whole toast is the tap target); done together with the delete-toast UNDO button as planned. | `goal-manager.js` (toast logic) | Daily flow |
| ~~**L5**~~ | ✅ **Fixed (Jun 11)** — per-feature teaser fragments added (`_lockedNavMessage`, extracted for testability + covered by tests). | `goal-manager.js` locked-nav handler | Discoverability |
| **L6** | 10-item desktop sidebar at full unlock is dense for new users staring at locked entries. Consider a "More" disclosure that hides level 6+ features until the user is closer to unlocking them. Mobile already handles this well via horizontal scroll + locked visuals. | `index.html` sidebar | Discoverability |
| ~~**L7**~~ | ✅ **Fixed (Jun 11)** — `max-height: 90vh; overflow-y: auto;` added to the tutorial tooltip. | `index.html` tutorial tooltip | Mobile UX |
| ~~**L8**~~ | ✅ **Fixed (Jun 11)** — install button now uses `calc(90px + env(safe-area-inset-bottom, 0px))` matching the other bottom-pinned overlays. | `mobile.css` | Mobile UX |
| **L9** | ~~PWA install button shows on Capacitor APK~~ ✅ RESOLVED — `pwa-handler.js` short-circuits entirely when `Capacitor.isNativePlatform()` (`_isCapacitorNative` guard at the top of the file). | `pwa-handler.js` | Mobile UX |
| ~~**L10**~~ | ✅ **Fixed (Jun 11)** — content area got `id="main-content"`; `mobile.css` selectors switched off the fragile `div:last-child` pattern. | `mobile.css`, `index.html` | Mobile UX |
| ~~**L11**~~ | ✅ **Fixed (Jun 11)** — `#offline-indicator` pill in `index.html`, toggled by `_initOfflineIndicator`/`_updateOfflineIndicator` on `online`/`offline` events (covered by tests). | `index.html` + `goal-manager.js` | Empty/edge states |
| **L12** | `deleteAllData()` confirmation flow not audited end-to-end. Worth a manual device-test pass to verify the confirmation modal text is sufficiently scary (irreversible warning, maybe a "type DELETE to confirm" pattern). | `index.html` + confirmation modal | Empty/edge states |
| **L13** | ~~`future-updates.md` at repo root duplicates ROADMAP content~~ ✅ RESOLVED Jun 11, 2026 — unique ideas (loot items, extended titles, market/prestige premium angles) merged into this roadmap; original archived at `docs/future-updates-archive.md`. `SECURITY_AUDIT_v2.4.10.md` moved to `docs/`. Shipped-work narratives split out to `docs/HISTORY.md` in the same pass. | repo root | Polish hygiene |

---

## Backlog / Ideas (Unscheduled)

| Idea | Notes |
|---|---|
| **Task Templates** | Save and reuse task/quest templates for non-recurring project types (recurring tasks already exist for scheduled repeats) |
| **Calendar Integrations** | Import from Google Calendar / Apple Calendar as auto-generated quests |
| **Custom Spell Creation** | Premium feature: design a custom spell with constrained effect parameters |
| **Mini-Games** | Simple skill-check mini-games during boss battles for bonus damage |
| **Dark/Light Theme Toggle** | System-respecting light mode option (previously tested, needs more visual contrast work to be impactful) |
| **Accessibility Deep Pass** | Full screen reader audit, high-contrast themes, reduced motion mode (basic ARIA already in place) |
| **Localization / i18n** | Multi-language support starting with Spanish, Portuguese, Japanese |
| **Offline-First Improvements** | Better PWA offline experience, background sync queue |
| **Widget Support** | Android home screen widgets (today's quests, streak counter, focus timer). **Promoted Sep 12, 2026 — scheduled with §5.3** (Differentiation Review: the widget is what a user sees 20× a day; the incumbent's is weak). |
| **New loot item ideas** *(merged from future-updates.md, Jun 11, 2026)* | Consumables: Shield Charge (blocks 1 boss attack reset), Lucky Coin (next chest +1 rarity tier). Spells: Mirror Image (duplicate next task XP), Treasure Hunter (+25% gold 24h), Chain Lightning (3-task combo → bonus boss damage), Second Wind (habit completion restores attack charge), Alchemist's Touch (crystal↔gold conversion), Phoenix Rebirth (legendary — revive expired boss at 25% HP). Companions: Raven (+10% boss gold), Golem (+1 attack charge daily), Kraken (splash damage). Boss Trophies — cosmetic per-boss collectibles in a Trophy Case. Slots naturally into §3.7 Rotating Market stock. |
| ~~**Extended title tiers**~~ *(merged from future-updates.md)* | ✅ **Shipped (v2.9.x balance pass)** — `LEVEL_TITLES` extended from 10 to 50 entries per style (Hero → … → Paragon), clamping at 'Paragon' for level 50+. §3.8 post-prestige title perks remain open. |
| **Duplicate companions → evolution shards** *(v2.9.x balance audit)* | Duplicate companion drops currently convert to flat gold. Convert to per-companion "evolution shards" instead, feeding the §3 companion-evolution system — makes late-game chest opens exciting again. Design-level: needs shard economy + evolution UI. |
| ~~**Task XP scaling by effort**~~ *(v2.9.x balance audit)* | ✅ **Shipped (effort-XP pass)** — the existing low/medium/high `priority` field doubles as the effort proxy via a shared `getPriorityXPMultiplier` (high 1.5× / medium 1.0× baseline / low 0.75×). Applied to daily tasks (`_dailyTaskXP`), side quests (refactored off the old hard-coded switch, same 30/20/15 values), and manual weekly/monthly/yearly goal completions; auto-complete roll-ups + life goals stay flat by design. Self-reported-effort gaming is blunted by a per-day cap on the high-priority bonus (`HIGH_PRIORITY_XP_DAILY_CAP`, date-stamped + reload-safe). Covered by the "Effort-based XP" Jest suite. |
| **XP curve review past level 20** *(v2.9.x balance audit; re-scoped after the class-system audit)* | The L10–L40 band is now covered by the **class skill tree** (1 skill point/level via `getEarnedSkillPoints = level − 10`; the main class maxes at *exactly* L40) plus the **L6→L35 theme cadence**, so the old "unlocks stop at L9" concern is largely addressed mid-game. Remaining late-game gaps: **post-L40 skill-point overflow** — `getEarnedSkillPoints` is uncapped but a maxed class absorbs only 30 points, so it **needs prestige built** to absorb the surplus (the "maxed, nothing to spend" dead zone); the XP-ring tier cap at L10 (`xpTierIndex = Math.min(level, 10)`); the free-user cosmetic drought after L15 (only forest/ice are free level themes); and no themes/titles between L35 (aurora) and L50+. `getXPForLevel = 150 + (level−1)×250` stretches each gap over weeks. **Most of this blocks on building prestige (§3.8).** |
| **Boss streak freeze item** *(v2.9.x balance audit)* | Boss-defeat streaks reset to 0 on a single missed day. Add a purchasable/lootable "streak freeze" (mirrors habit Streak Shield) so one bad day doesn't wipe a month of boss streaks. Slots into §3.7 Rotating Market stock. |

---

## Differentiation Review (Sep 12, 2026)

A pass over every unshipped item asking one question: *does this make Life Quest
Journal stand out among RPG habit trackers, or does it just keep pace?* Basis: the
genre as known through mid-2026 — Habitica as the incumbent (pets/mounts, classes,
parties, shared-HP bosses, guilds, galas, damage-on-miss), the LifeRPG / Do It Now /
Level Up Life / Habit Hunter long tail, and adjacent gamified trackers (Finch,
Forest). Re-run this review when new entrants appear.

**Genre table stakes (parity, not differentiation):** XP/levels, gold, evolving
pets, class perk trees, streaks, cosmetics, a shop, seasonal events, guilds/parties,
party boss HP pools, leaderboards. Roadmap items in this list are credibility
maintenance — necessary, but not why anyone switches.

**What LQJ already has that the genre mostly does not — the five pillars every
standout item should amplify:**

1. **A goal hierarchy** (Epic → Yearly → Monthly → Weekly → Daily). Competitors are
   flat habit lists. "Life *Quest*" vs "habit" is the positioning.
2. **Focus timer + Pomodoro chains fused into the economy** (Focus Crystals).
   Habitica has no timer.
3. **Solo boss cadence with real combat feel** (daily/weekly/monthly, crits,
   dissolves, FINAL BLOW). The genre's bosses are party-dependent HP sponges.
4. **Positive-only loop** — no HP loss for a missed day. Damage-on-miss is
   Habitica's most-cited churn reason.
5. **No server** — private, offline, no account. A distinct trust story.

### Tier A — genuinely differentiating (build these)

| Item | Why it stands out | Adjustment |
|---|---|---|
| **§5.3 Goal Dependency Mapping** | Nobody in the genre shows daily actions feeding long-term goals. Turns pillar 1 — the unique data model — into a *visible* feature and answers "why am I doing this task", which habit apps structurally cannot. `parentIds` links already exist, so cost is low relative to impact. | **Pulled forward from Phase 5 to directly after §3.8.** The single most on-brand item in this document. Also the natural first-minute onboarding hook ("what is your Epic quest?"). |
| **§3.10 Quest Chain Mastery** | Permanent buffs for *sustained arcs* (30 focus sessions in 30 days) rather than per-task payouts. Rewards consistency — the actual product promise. No competitor does this. | Keep as specified (no respec, survives prestige). |
| **§3.9 Apex Boss + Re-summon** | A solo multi-phase fight whose mechanics reward loadout choice is rare; amplifies pillar 3. | **Enrage penalties become opt-IN (default OFF).** Default-on debuffs contradict pillar 4 and punish the sick/travelling users §1.7 exists to protect. |
| **§5.1 Smart Scheduling / §5.2 Weekly Digest** | "The game learns you" is absent from the genre; the §5.0 analytics baseline is already stronger than Habitica's (none). | Must stay on-device heuristics — a server would spend pillar 5. |
| **§3.8 Prestige** | Uncommon in habit RPGs; also unblocks the documented post-L40 dead zone. | Medium uniqueness, structurally overdue. Unchanged position. |

### Tier B — credibility, not a reason to switch

- **§3.7 Rotating Market** — economic sink the game needs; Habitica has a shop. Build for the economy, not the pitch.
- **§3.4 Companion Evolution** — Habitica's *signature* feature (pets → mounts). Parity at best; the backlog "duplicate companions → evolution shards" angle is the more distinctive half.
- **§3.3 Seasonal Events** — Habitica runs four galas a year. A content treadmill that is expensive for a small team to keep fresh; Double XP Weekend already covers the lightweight version.
- **§3.2 Crafting** — moderate uniqueness, but inventory chores for productivity users. Justified by the sink, not by standing out.
- **§3.5 Achievement Gallery / §3.6 Bestiary** — polish.

### Tier C — high cost, low differentiation

- **Phase 4 Social (guilds, raids, feed)** — Habitica's home turf, requires the server pillar 5 avoids, and competes with a decade-old network. The live no-server friend challenges are the right form. **Deprioritized behind Phase 5.** If co-op is ever built, an async raid via share codes is the only on-brand shape.
- **§6.6 / §6.7 Monetization + Cosmetics** — revenue infrastructure, not differentiation.

### Two additions

- **Android home-screen widgets** *(promoted from Backlog)* — habit trackers live or die on the widget; Habitica's is weak. Today's quests / streak / focus timer on the home screen is what a user sees 20× a day, and it is cheap on Capacitor. Scheduled alongside §5.3.
- **Goal hierarchy as the onboarding hook** — a new user currently sees a habit tracker with a sword. §5.3 plus an onboarding path that starts from the Epic quest communicates the difference in the first minute. Folded into §5.3's scope.

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
     Phase 3            │           Phase 2
  (Depth/Progression)   │     (Visual & Experience)
                        │
  ──────────────────────┼──────────────────────
                        │
     Phase 4            │           Phase 6
    (Social)            │        (Platform)
                        │
                    LOW IMPACT
       HIGH EFFORT ◄────┼────► LOW EFFORT
```

*(Phase 1 shipped in v2.4. Phase 2 is nearly complete — v2.9 in flight, v2.10 sound pass remaining. Phase 5 — Intelligence & Insights — spans mid-impact / mid-effort and slots after Phase 4.)*

**Recommended execution order (revised Sep 12, 2026 — Differentiation Review):**
finish Phase 2 (v2.10 sound pass) → §3.8 Prestige → **§5.3 Goal Dependency Mapping + Android
widgets** (pulled forward) → §3.10 Quest Chain Mastery → §3.9 Boss Loop (enrage opt-in) → rest of
Phase 3 (§3.7, §3.4, §3.2, §3.3, §3.5/3.6) → Phase 5 (§5.1 / §5.2 on-device) → Phase 6.1 cloud
sync → Phase 4 social → rest of Phase 6.

*Previous order (Jul 29):* Phase 2 → Phase 3 → 6.1 → Phase 4 → Phase 5 → rest of 6. The change
moves the two items that amplify the goal-hierarchy pillar ahead of parity features, and
social behind intelligence.

---

*This roadmap is a living document. Reprioritize based on user feedback and analytics. Shipped work moves to `CHANGELOG.md` + `docs/HISTORY.md` rather than accumulating here.*
