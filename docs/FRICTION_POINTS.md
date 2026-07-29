# Onboarding & Retention — Friction Point Audit

> **Created:** Jun 25, 2026 (unreleased dev build). **Updated:** Jun 27, 2026 —
> P1a + P1b + P2a + P2b + N1 resolved (see sections). **Scope:** new-user onboarding + early/mid
> retention friction. Consolidates two passes: the original new-user audit
> (P0–P2 below) and the Jun 25 follow-up sweep done alongside the onboarding-fork work.
>
> **Status legend:** ✅ resolved · 🚧 in progress · ⬜ open · 🔎 verify (may
> already be done).
>
> **Line refs** are current as of this writing but cite the **method/symbol**
> first so they survive code drift. All references are in `goal-manager.js`
> unless noted.

---

## TL;DR — priority order

| # | Friction | Priority | Status | Effort |
|---|---|---|---|---|
| **P0** | Goal tabs locked behind levels for weeks; new users can't create their goals on day one | P0 | ✅ resolved (onboarding fork v3.2) | — |
| **P1a** | First-session users are never asked to enable notifications | P1 | ✅ resolved (v3.2) | — |
| **P1b** | Free reward loop narrows almost immediately (6-spell pool) | P1 | ✅ resolved (v3.2) | — |
| **P2a** | Lock feedback is a dead-end ("🔒 Unlocks at Level X") | P2 | ✅ resolved (v3.2) | — |
| **P2b** | Streak repair is premium-only — sharpest churn moment is paywalled | P2 | ✅ resolved (first repair free) | — |
| **P2c** | Cognitive load (25+ systems) | P2 | 🚧 partially relieved by P0 | — |
| **N1** | Grand Planner path opens yearly/life tabs with no starter content | new | ✅ resolved (v3.2) | — |
| **N2** | Late-game unlock cliff — *(re-scoped)* L10–L40 is now covered by the class skill tree + theme cadence; the real gaps are post-L40 skill-point overflow (needs prestige built), the L10 XP-ring tier cap, the free-user cosmetic drought after L15, and no themes/titles L35→L50+ | new | ⬜ open | days+ (blocks on prestige) |
| **N3** | Flat XP regardless of task effort | backlog | ✅ resolved (effort-XP pass) | — |
| **N4** | `deleteAllData()` confirmation never audited (L12) | backlog | ⬜ open | hours |
| **N5** | Desktop sidebar density for new users (L6) | backlog | 🔎 likely shipped | — |

**Highest-leverage remaining move:** with **P0, P1a, P1b, P2a, P2b, N1, and N3
now fixed**, the top remaining win is the late-game unlock hook (**N2**) — which,
after the class-system audit, now centers on **building prestige (§3.8)**.

---

## P0 — Day-one goal creation ✅ RESOLVED (this build)

**Was:** Progressive unlock gated the weekly/side/monthly/yearly/life goal tabs
behind levels 6/6/7/9/9, so a new user who came to map real goals couldn't
create most of them for *weeks*. The intended cognitive-load mitigation
(progressive unlock) overcorrected into a wall.

**Fixed by the onboarding play-style fork (v3.2):**
- New tutorial **fork step** ("Choose Your Path") — `_renderOnboardingForkHTML()`
  + `chooseOnboardingPath()` (`goal-manager.js:21430`), inserted at index 1 of
  `getAllTutorialSteps()`.
- `getGoalTabUnlockLevelsForPath(path)` (`goal-manager.js:3102`) +
  `applyOnboardingPath()` (`goal-manager.js:3111`):
  - **Grand Planner** (`'goals'`) → entire weekly→life hierarchy open at **level 1**.
  - **Daily Focus / default** (`'habits'`/null) → lowered fast curve
    `weekly:2, sidequests:2, monthly:3, yearly:4, life-goals:4` (down from 6/6/7/9/9).
- Path persists through save/load + export/import (re-derives thresholds).
- `featureUnlockTutorials` resynced (L6 reworded to Quest Chains; the stale L7
  "Monthly Raids" / L9 "Life Goals" celebration toasts removed).

Covered by the **Onboarding Path Fork** suite in `tests/goal-manager.test.js`
(full suite green: 521 tests).

---

## P1a — First-session users are never asked to enable notifications ✅ RESOLVED (this build)

Push/reminders are the **#1 return driver**, but the ask never landed in session 1.

**Was (root cause):** the boot prompt was scheduled +3s
(`checkNotificationPermission()`) but fired *during* the tutorial, so
`showNotificationPrompt()` bailed on `!this.tutorialCompleted`. `endTutorial()`
flipped the flag but never re-fired the ask, silently deferring it to **session 2**
— which a large fraction of installs never reach.

**Fixed (v3.2) — the ask now fires at the real end of onboarding:**
- `closeStarterTasksModal()` passes an `onClose` callback to the Beginner's
  Blessing popup → `_maybePromptPostOnboardingNotifications()`
  (`goal-manager.js:22008-22044`).
- `showFeatureUnlockPopup(title, text, onClose = null)` now routes both the
  "Awesome!" button and backdrop dismissal through a single `close()` that fires
  `onClose` **at most once** (`goal-manager.js:3352-3393`).
- `showNotificationPrompt()` self-guards: already-enabled / tutorial-incomplete /
  a card already on screen / the **7-day `notificationPromptDismissed` cooldown**
  (centralized so every caller is protected) (`goal-manager.js:19875-19889`).

**Net effect:** brand-new users get the ask while still engaged (session 1); the
boot +3s path still covers returning users without double-showing.

---

## P1b — The free reward loop narrows almost immediately ✅ RESOLVED (this build)

**Was:** chest opens are a core dopamine loop, but loot only awarded a spell on
the 4% Epic `ability_unlock` branch from a **hardcoded pool of exactly 6 free
spells** (duplicated in the Daily Board Sweep bonus too). Free users saw the same
handful recycle, flattening the mid-term "one more day" pull. The pool was also a
hardcoded mirror of the non-premium spells — prone to drift.

**Fixed (v3.2):**
- Added two free mid-tier spells — **Scholar's Charm** (+20% XP/day) and
  **Merchant's Fortune** (+20% Gold/day), both `uncommon`, reusing the proven
  `xp_boost` / `gold_multiplier` effects (`goal-manager.js:2551-2577`). They sit
  **below the premium ceiling** (rare/legendary buffs and the 2x multipliers stay
  paid), so the monetization wall is intact.
- Replaced both hardcoded `freeSpells` arrays with a single derived source of
  truth, `getFreeLootableSpellIds()` — every non-premium, non-Wizard-exclusive
  spell (`goal-manager.js:2687-2698`), wired into the loot drop
  (`:7224`) and the Daily Board Sweep bonus (`:6666`). Future free spells now
  widen the pool automatically. The free pool grew **6 → 8** (+33%).

Covered by 3 new tests in the **Free loot spell pool (P1b)** suite (full suite
green: 529).

---

## P2 — Smaller frictions

### P2a — Lock feedback is a dead-end ✅ RESOLVED (this build)
Every locked gate previously showed a bare `🔒 Unlocks at Level X!` toast with no
progress sense and no "why". They now all route through shared builders that add a
feature name, a **"N levels to go" progress affordance**, and a value teaser:
- Shared builder: `_lockedFeatureMessage(name, requiredLevel, teaser)`
  (`goal-manager.js:2986-2990`).
- **Nav + direct view** → `_lockedNavMessage()` (`goal-manager.js:2997`), used at
  `:3057` (nav click) and `:3571` (direct view).
- **Goal view / goal tab / arcane tab** → `_lockedTabMessage(tabName, requiredLevel)`
  (`goal-manager.js:3013`), used at `:3605`, `:3658`, `:3774`.

No bare `🔒 Unlocks at Level X!` string remains in the gating paths.

### P2b — Streak repair is premium-only ✅ RESOLVED (this build)
Losing a long streak is the **sharpest churn moment**, and recovery was fully
paywalled. Now **every player's first streak repair is free** — the safety net
for when a streak slips through despite the proactive at-risk notification.

**Fixed (first-repair-free):**
- `freeStreakRepairUsed` (persisted) tracks the one-time grant;
  `hasFreeStreakRepair()` = `!isPremium && !freeStreakRepairUsed`. Constructor
  init + **both** save/load paths (primary + cloud/import) carry the flag.
- `canRepairStreak()` returns true inside the 48h window when the free repair is
  available, otherwise falls back to the premium + Focus-Crystal cost path.
- `repairStreak()` captures the free-vs-paid decision **up front** (so a vanished
  habit target can't silently burn the freebie), restores for free on first use,
  then routes non-premium users to the upsell and charges premium users.
- `renderStreakRepair()` shows actionable Repair buttons (badge “Free”, “1 free
  repair” header) while the freebie is available; the pure upsell card only
  appears once it's spent.
- Premium repairs still cost `getStreakRepairCost()` (~1 Focus Crystal / 10 lost
  days, min 1, cap 5) inside the 48h `STREAK_REPAIR_WINDOW_MS` window.

Covered by the **§1.7 Streak Repair** suite in `tests/goal-manager.test.js`
(full suite green: 533 tests).

### P2c — Cognitive load 🚧
25+ systems; progressive unlock is the intended mitigation, and the **P0 fix
relieves the early wall**. Caveat: the **Grand Planner** path now surfaces more
at once (see **N1**) — so for that path, lean on starter content + teasers rather
than re-gating.

---

## New / adjacent findings (Jun 25 sweep)

### N1 — Grand Planner opens empty tabs with no seed ✅ RESOLVED (this build)
**Was:** `showStarterTasksModal()` only seeded daily/weekly/monthly, but the
**Grand Planner** path opens the yearly + life-goals tabs at L1 — so those tiers
opened **unlocked-but-empty with no guidance**.

**Fixed (v3.2):**
- Added `yearly` + `'life-goals'` seed presets to `starterTaskPresets`
  (`goal-manager.js:21888`).
- `showStarterTasksModal()` now renders Yearly Campaigns / Life Goals pick
  sections whenever those tabs are unlocked (`goal-manager.js:21913`); habit-first
  players still never see them until they level into the tier.
- `addSelectedStarterTasks()` handles the two new types with unlock guards and the
  correct record shapes (mirrors `quickAddYearlyGoal` / `quickAddLifeGoal`)
  (`goal-manager.js:22222-22248`).
- The post-onboarding empty-state nudge is now path-aware: a Grand Planner with no
  big goals is pointed at the Quest Log instead of the daily view
  (`goal-manager.js:22083-22106`).

Covered by 5 new tests in the **Starter Task System** suite (full suite green: 526).

### N2 — Late-game unlock cliff ⬜ *(re-scoped after the class-system audit)*
The original "unlocks stop at ~L9" framing predates the **live v3.1 class system**.
The actual level-gated map is denser than that:
- **L1–L6** — every feature/goal tab (`featureUnlockLevels` max `questchains` L6;
  `goalTabUnlockLevels` max L4).
- **L10** — "all features unlocked" toast **+ class selection** (`CLASS_UNLOCK_LEVEL = 10`).
- **L10 → L40** — **1 skill point per level** (`getEarnedSkillPoints = level − 10`),
  spent on the class tree; costs `[2,3,4,5,6]+10 = 30` are tuned so the main class
  maxes at **exactly L40 = prestige unlock** (`goal-manager.js` `initializeClasses`,
  `docs/CLASS_REDESIGN.md` §6).
- **Themes** — a steady **L6→L35** cadence (forest 6, desert 10, sunken 13, ice 15,
  stormwatch 18, volcanic 20, verdant 22, mystic 25, cathedral 28, crystal 31, aurora 35).
- **Titles** — apprentice 5, journeyman 10, veteran 25, elite 50, legendary_hero 100.

So the **L10–L40 band is the best-covered stretch already**; the cliff has *moved*
to four specific gaps:
1. **Post-L40 skill-point overflow (sharpest).** `getEarnedSkillPoints` is **uncapped**
   but a maxed class only absorbs 30 points (at L40). **Prestige is not built yet**
   (design-locked, Phase 2/3 in `CLASS_REDESIGN.md`), so L40+ players bank points with
   nothing to spend them on — the exact "maxed, nothing to spend" dead zone the design
   wants to avoid. **Hard dependency: ship prestige (§3.8).**
2. **XP avatar ring flatlines at tier-10** — `xpTierIndex = Math.min(this.level, 10)`;
   L11+ stay on the legendary cyan tier "until prestige introduces higher tiers."
3. **Free-user cosmetic drought after L15** — only **forest (L6)** and **ice (L15)** are
   non-premium level themes; the rest are `premium: true`. Free players get no
   level-driven cosmetic past L15 (Golden/Shadow are achievement-gated, not level).
4. **No themes/titles between L35 (aurora) and the L50 milestone** — and the per-level
   `LEVEL_TITLES` name clamps at "Paragon" by L50, so **L50→L100 adds no new ranks**.

The steep linear curve (`getXPForLevel = 150 + (level−1)×250`) stretches each gap over
weeks of real time. See `ROADMAP.md` backlog "XP curve review past level 20". Most of
N2 now **blocks on building prestige (§3.8)**.

### N3 — Flat XP regardless of effort ✅ RESOLVED (effort-XP pass)
The existing low/medium/high `priority` field now doubles as an effort proxy via
a shared `getPriorityXPMultiplier` (high **1.5×**, medium **1.0×** = the historical
baseline, unchanged, low **0.75×**). Applied to daily tasks (`_dailyTaskXP`,
base 15 → 23/15/11), side quests (base 20 → 30/20/15, replacing the old
hard-coded switch with no behavior change), and manual weekly/monthly/yearly goal
completions (50/200/1000 × multiplier). Auto-complete roll-ups and life goals stay
at the flat baseline by design. **Anti-gaming:** the high-priority *bonus* on daily
tasks is capped per local day (`HIGH_PRIORITY_XP_DAILY_CAP`, default 8) via a
date-stamped counter that self-resets at midnight and survives reloads; past the
cap, high tasks pay the medium rate. Covered by the "Effort-based XP" Jest suite.

### N4 — `deleteAllData()` confirmation never audited ⬜ *(audit L12)*
Worth a device-test pass; consider a "type DELETE to confirm" pattern.
`ROADMAP.md` Deferred Findings L12.

### N5 — Desktop sidebar density 🔎 *(audit L6)*
10-item sidebar is dense for new users staring at locked entries. The
"More" disclosure appears **already shipped in code** (`ROADMAP.md:60`); verify
before doing anything, don't re-do.

---

## Already strong — build on, don't touch

Illustrated empty states across every surface · serialized post-tutorial modals ·
day-1 login bonus folded into the tutorial-complete toast · anti-exploit reward
refunds · FOUC removals (M3–M7) · reduced-motion safety net · storage-quota
warning · single-rotating corrupted-save backup · streak-at-risk + Royal Bounty
reminders · desktop nav "More" disclosure (L6).

---

## Suggested sequencing

- **Quick wins (hours–days):** +2–3 free spells / rotate the free pool (**P1b**).
  *(Done: notification prompt post-tutorial **P1a**; lock-toast progress
  affordance + teaser on tab/view gates **P2a**; Grand Planner starter seed **N1**.)*
- **Medium (days):** decide the late-game unlock hook (**N2**); audit
  `deleteAllData()` (**N4**). *(Done: one free streak repair **P2b**; effort-based XP **N3**.)*
- **Big bet:** optional account + cloud sync (foundation for cross-device + social).

> **P0, P1a, P1b, P2a, P2b, N1, and N3 are done.** The next medium move is the
> late-game unlock hook (**N2**).

---

## Cross-links
- **P0 fix** — onboarding play-style fork; `getGoalTabUnlockLevelsForPath()` /
  `chooseOnboardingPath()`; Onboarding Path Fork test suite.
- **ROADMAP.md** — §1.7 Streak Protection (P2b), Deferred Findings L6/L12 (N4/N5),
  backlog XP-curve / effort-XP (N2/N3).
- **docs/CLASS_REDESIGN.md** — prestige L40 context for N2.
