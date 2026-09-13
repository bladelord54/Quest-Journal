# Changelog

All notable changes to **Life Quest Journal** are tracked in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with an `Android versionCode` bump on every release.

> **Note:** This file begins with v2.5. v2.4.10 (shipped May 22, 2026, Build 20) is
> recorded below as the baseline that v2.5 builds on, but earlier history lives only
> in `docs/HISTORY.md` § Phase 1.

## Sections we use

- **Added** — new features
- **Changed** — changes in existing functionality
- **Deprecated** — soon-to-be removed features
- **Removed** — features removed this release
- **Fixed** — bug fixes
- **Security** — vulnerabilities patched
- **Internal** — refactors, build/tooling, no user-facing impact

---

## [Unreleased]

### Fixed

- **Two daily quests were hidden four levels too long.** The Daily Quest Board's "Side Adventurer"
  and "Weekly Warrior" quests were gated at level 6 — a leftover from before the onboarding rework
  that opens the Side Quests and Weekly Quests tabs at level 2. They now appear from level 2, the
  same level as the tabs they track. (Root cause: the quest pool restated the unlock ladder as bare
  numbers; the gates are now defined in terms of `feature-unlocks.js` so this cannot recur.)

### Internal

- **ES-module conversion, step 6 of 6 — `// @ts-check` on `goal-manager.js` (Engineering Roadmap
  #3, criterion 4)** — the monolith is now under the same type check as every extracted module.
  Triage, in order: instance-field JSDoc declarations on the class; DOM nullability handled
  case-by-case — `?.` on same-function-created nodes, `if (!el) return` guards where the element
  is genuinely optional, `/** @type {HTMLElement} */` casts only where the node is a static
  `index.html` id or was created in the same function (a cast-only codemod applied at
  tsc-flagged lines, then hand fixes for the `forEach`/focus-trap/`NodeList` sites that need a
  `NodeListOf<HTMLElement>` cast because callback-param typing is rejected under
  `strictFunctionTypes`); `Date` subtraction made explicit via `getTime()`; `String()` on
  numeric `textContent`/`strokeDashoffset` writes; `!!` on boolean-typed render inputs.
  `daily-quest-logic.js` / `daily-board-render.js` pool params widened to `ReadonlyArray` since
  they never mutate the pool. `jsconfig.json` adds `useUnknownInCatchVariables: false`
  (TS-class-centric strict flag, same rationale as the existing `strictPropertyInitialization`
  opt-out). Real fixes surfaced along the way: `BOUNTY_LOGIC.pickFrom` null return is now guarded
  in assign/reroll; `updateSlideshow` guards a null `slideshowData`; `showStarterTasks` parent
  resolver bails on an unresolved `parentIdField`/`parentType`. No behaviour change otherwise.
  **1686/1686 + `npm run typecheck` clean (0 errors).** Criterion (4) closed.
- **ES-module conversion, steps 2–5 of 6 (Engineering Roadmap #3, criterion 3)** — the app is
  now a real ES-module graph. All 69 catalog / logic / render modules end in `export default X`
  instead of the IIFE + `window.X` + `module.exports` shim; the five load-time `window`/`require`
  resolvers are `import` lines. `goal-manager.js` imports its 69 dependencies directly (48 former
  capture consts + 21 render modules that were read as bare globals), exports the class and the
  five inline-handler wrappers, and has no `{}` fallbacks left — a missing module is a hard load
  error, not a silent empty object. New `main.js` is the single `<script type="module">` entry,
  replacing 75 hand-ordered `<script src>` tags in `index.html`; it creates `window.goalManager`
  synchronously (before `DOMContentLoaded`, so every listener sees it). The 8 standalone scripts
  stay classic. `scripts/copy-web.js` copies every root `.js` (no hand list);
  `run-in-browser.bat` starts the http server because modules do not load over `file://`. Tests:
  the `eval(source)` harness and 77 top-level `require`s are `import`s; the step-1 smoke fixture is
  gone. 1686/1686 + typecheck clean. No behaviour change intended; Android device check via
  `cap:build` passed Sep 12 (after step 6).
- **ES-module conversion, step 1 of 6 (tooling)** — `babel-jest` + `@babel/core` +
  `@babel/preset-env` added as devDependencies; `babel.config.js` (jest-only, `targets: node
  current`) and a `transform` entry in `jest.config.js`. See Engineering Roadmap #3.
- **Engineering Roadmap #1 criteria (1) and (2) closed** — the five criterion-(2) single-source items
  from the Sep 7 audit landed as one change (22 new tests; 1686/1686 jest + typecheck clean):
  `executeBossBySpell` guards on `COMBAT_DAMAGE.isExecuteRange` instead of a second `25`;
  `theme-definitions.js` golden/shadow carry machine-readable `unlock: { goldEarned: 10000 }` /
  `{ bossesDefeated: 25 }` tables and `checkRewardUnlocks` is one catalog loop; the Daily Quest pool
  moved to a new `daily-quest-definitions.js` (13th data catalog) with every `minLevel` DEFINED as a
  `FEATURE_UNLOCKS` level (the goal-tab curves moved into `feature-unlocks.js` as `GOAL_TAB_LEVELS` to
  make that possible) plus `BOARD_SWEEP_BONUS` for the all-claimed bonus grants and toast; and
  `HABIT_LOGIC.MILESTONES` is derived at load from the `streak`-type badges in
  `achievement-definitions.js`. No behaviour change beyond the Fixed entry above. The active front
  for Roadmap #1 is now criterion (3), the ES-module conversion.
- **Ranger Forage bonus-gold math folded into `reward-economy.js`** (Engineering Roadmap #1, 90th slice;
  fifth of the Sep 7 audit queue) — `applyForage` still had the hit-roll + `10 + floor(rng()*11)`
  bonus-gold math inline. Too small a rule for its own module, so it extends `reward-economy.js` with
  `forageReward(chance, rng)`; `applyForage` keeps the `focusCrystals` write and toast. Behaviour-
  identical; 5 new tests (1660 total).
- **Challenge-a-Friend rules extracted to `challenge-logic.js`** (Engineering Roadmap #1, 89th slice;
  fourth of the Sep 7 audit queue) — `challengePresets`, the difficulty→{xp,gold} table, the
  progress reader with its 100 clamp, and the `completedChallenges` 50-cap moved out of
  `goal-manager.js`; `getChallengeRewards` / `getChallengeProgress` / `completeChallenge` delegate.
  Behaviour-identical; 19 new tests (1655 total).
- **Companion XP-gain math folded into `companion-logic.js`** (Engineering Roadmap #1, 88th slice;
  third of the Sep 7 audit queue) — `grantCompanionXP` still had the Bonding enchantment's flat
  `×2`, the Ranger Beastmaster perk's `ceil(xp * (1 + mult))` scale, and a `100 * level` multi-
  level-up `while` loop inline. Extended (not a new module) the existing companion slot/bonus
  module with `companionXpGain(amount, opts)` and `applyCompanionXp(companion, xpGain)`;
  `grantCompanionXP` is now a thin two-call wrapper. No behaviour change — existing Beastmaster
  tests passed unchanged; 10 new tests incl. a stacked-buff case and a 350-XP grant that clears
  two level thresholds in one call (1636/1636 jest + typecheck clean).
- **Boss-defeat streak reward multiplier extracted to `boss-streak-logic.js`** (Engineering
  Roadmap #1, 87th slice, 32nd LOGIC module; second of the Sep 7 audit queue) — `onBossDefeated`'s
  daily/weekly/monthly streak-counter ternary and its "+10% per streak, capped at +100%" XP/gold
  multiplier are now `streakForBossType`, `streakMultiplier` and `applyStreakBonus`. No behaviour
  change; 13 new tests incl. a parity oracle of the original inline arithmetic (1626/1626 jest +
  typecheck clean). Review follow-up (Sep 9): the defeated-boss gallery's bare `50` cap, which the
  first pass left inline, is now `archiveDefeated` / `DEFEATED_HISTORY_CAP` in the same module
  (+4 tests; 1664/1664).
- **Chest rarity-weight modifiers extracted to `chest-weight-logic.js`** (Engineering Roadmap #1,
  86th slice, 31st LOGIC module; first of the Sep 7 audit queue) — the Lucky Loot enchantment
  and Ranger Keen Eye perk applied the SAME nine-line weight-shift block, pasted twice in
  `generateChestRewards`; the Lucky Draw spell's 40/30/20/10 redistribution sat beside them.
  Now `shiftWeights(weights, amount)`, `luckyDrawFloor(weights)` and the
  `applyChestModifiers(weights, { luckyLoot, rangerWeight, luckyDraw })` composite (original
  order, new objects, no mutation); `generateChestRewards` makes one call. No behaviour change
  — the existing lucky_loot / Ranger behavioural suites passed unchanged; 17 new tests incl. a
  parity oracle of the original inline arithmetic across every chest tier × modifier combo
  (1613/1613 jest + typecheck clean).
- **Engineering Roadmap #1 criterion (1)/(2) audit** — one bounded scan of `goal-manager.js`
  (~600 methods, rule-math pattern match, second-copy checks against the catalogs) replaces
  the open-ended per-slice search. Output: five queued extractions (86–90: chest weight-shift
  ×2, boss streak multiplier, companion XP/level-up, challenge rewards/progress, Forage), five
  single-source items (execute 25% vs `COMBAT_DAMAGE.isExecuteRange`, golden/shadow theme
  thresholds vs `theme-definitions.js` prose, `DAILY_QUEST_POOL.minLevel` vs the unlock ladder
  — incl. a stale `6` hiding two quests four levels too long, the Board Sweep bonus toast,
  habit tiers vs badge targets), an inline-by-decision list, and an explicit exit. Also adds
  the six-step criterion (3) ES-module plan under item #3. Docs only.
- **Progressive-unlock thresholds unified in `feature-unlocks.js`** (Engineering Roadmap #1,
  85th slice, 30th LOGIC module) — the criterion-(2) sweep of the tables still inline in
  `initState` found the unlock knowledge re-stated: "Arcane unlocks at 3" as both `arcane: 3`
  and a bare `this.level === 3` (welcome-spell grant); "companions unlock at 3" as a bare
  literal in three places incl. `loot-engine.js`; the unlock predicate written three times
  and the desktop-nav "More" collapse rule twice. The frozen `LEVELS` / `ARCANE_TAB_LEVELS` /
  `TUTORIALS` tables, `COMPANION_UNLOCK_LEVEL` (defined as `LEVELS.arcane`) and the
  `isUnlocked` / `isFarOff` predicates are now the one source; `challengePresets` was audited
  single-sourced and left inline. New `<script>` loads before `loot-engine.js`. No behaviour
  change; 16 new tests incl. every-gated-view-has-a-tutorial-at-its-level consistency
  (1593/1593 jest + typecheck clean). Follow-up: the referral bonus (`level < 2`, previously
  stated twice incl. the welcome toast) and review prompt (`level < 3`) gates are named
  `REFERRAL_REWARD_LEVEL` / `REVIEW_PROMPT_MIN_LEVEL` in the same module, and the locked-nav /
  locked-tab teaser-copy tests now derive the gated id set from the tables so a new gated
  view/tab without a name + teaser fails CI (1596/1596).
- **Persisted-field defaults unified in `default-state.js`** (Engineering Roadmap #1, 84th
  slice, 29th LOGIC module) — the default for every saved field used to be written twice: once
  in `initState()` (fresh install) and once as the `d.x || <default>` fallback in
  `load-deserializer.js` (save missing the field). `persistedDefaults({ defaultSessionMinutes })`
  is now the one source both consume: `initState` `Object.assign`s it and keeps only session
  state / derived catalogs / constants inline; `buildLoadState` loops `SIMPLE_FIELDS` against
  it and keeps the documented special rules (`??`, type guards, migrations, schema gate)
  explicit. Fixes three latent `undefined`-vs-`null` drifts (`lastHabitReset`, `lastWeekReset`,
  `premiumPurchaseToken`); otherwise no behaviour change. New `<script>` loads before
  `load-deserializer.js`. 13 new tests incl. init↔load and defaults↔save key parity
  (1577/1577 jest + typecheck clean).
- **Engineering Roadmap #1 given a Definition of done** — four checkable criteria (every rule
  in a tested module; every table single-sourced; real ES modules; `goal-manager.js` under
  `// @ts-check`) replace the open-ended "keep slicing" framing. Docs only.
- **`docs/ENGINEERING_ROADMAP.md` restructured as a status page** — item #1's ~100-line
  running "Progress" sentence is replaced by a headline summary plus three module tables
  (12 data / 28 logic / 22 render, with slice numbers); the slices 1–80 narrative and the
  completed render burn-down record are preserved verbatim inside collapsed `<details>`
  blocks; slices 81–83 stay as prose recipe examples. Item #3's stale "11 modules"
  `// @ts-check` count updated to all 62 extracted modules. Docs only.
- **Habit progression math extracted to `habit-logic.js`** (Engineering Roadmap #1, 83rd
  slice, 28th LOGIC module) — the consecutive-day streak recomputation (`computeHabitStreak`,
  behind `recalculateHabitStreak`), the `double_streak` increment rule and the 7/30/100
  milestone thresholds (both inline in `toggleHabit`) are now pure, unit-tested functions.
  The HABIT-streak counterpart to `streak-logic.js`'s login streak and the logic sibling of
  `habit-render.js`. The `habit.streak`/`lastCompleted` writes, reward grants/refunds, audio,
  effects, toasts and `saveData` stay on the class. No behaviour change; 14 new tests
  (1564/1564 jest + typecheck clean).
- **Quest-chain progression extracted to `quest-chain-logic.js`** (Engineering Roadmap #1,
  82nd slice, 27th LOGIC module) — the task-toggle array math, the chapter-complete
  predicate, the chapter-advance patch, the chain-complete detection and the
  active→completed list move are now pure, unit-tested functions;
  `toggleChainTask` / `completeChapter` / `completeQuestChain` delegate their state math
  while keeping every reward/toast/confetti/badge/`saveData` side-effect on the class.
  Sibling of the already-extracted `quest-chain-render.js`. No behaviour change; 21 new
  tests (1550/1550 jest + typecheck clean).
- **Wooden Chest loot extracted to `wooden-chest-loot.js`** (Engineering Roadmap #1,
  81st slice, 26th LOGIC module) — the daily free chest's weighted loot table + pick
  (the SECOND hand-rolled cumulative-weight loop) is now a pure, unit-tested module,
  de-duplicated from `loot-engine.js`; `claimWoodenChest` delegates its roll through the
  `this.rng()` seam. The float-drift fallback (first entry) differs from loot-engine's
  (last entry) on purpose and is pinned by a divergence test. No behaviour change; 11 new
  tests (1529/1529 jest + typecheck clean).
- **Daily Quest Board logic extracted to `daily-quest-logic.js`** (Engineering Roadmap
  #1, 80th slice, 25th LOGIC module) — the date-seeded deterministic board pick and the
  `check(tracking)` completion sweep are now pure, unit-tested functions;
  `generateDailyQuestBoard` / `checkDailyQuestCompletion` are thin delegators. Closes the
  daily-board pair (render half was already `daily-board-render.js`). No behaviour change;
  20 new tests (1518/1518 jest + typecheck clean).

---

## [3.0.0] — 2026-07-29 (Build 32)

> **Theme:** The Class System & Subclass Specialization — the largest gameplay
> update since launch. A full skill-tree progression layer for every player,
> plus the new-user onboarding overhaul and effort-based XP.

### Added

- **Class System (§3.1)** — at **Level 8** you choose one of four classes —
  **Scholar**, **Warrior**, **Wizard**, or **Ranger** — each with its own
  **5-node linear perk tree** (node costs `[2,3,4,5,6]`) plus a **choice of two
  capstones** (10 pts each), 30 points total. Skill points are **derived from
  level** (1 per level past 10), so a class maxes at **exactly Level 40**. Every
  perk is **free** (earned through play, no premium gating) and hooks into the
  live systems — focus XP, enchantment discounts, crystal yield, boss damage,
  attack/crit chance, spell duration & preservation, companion XP, and loot
  weighting.

- **Eight class capstones** — each class picks 1 of 2 build-defining endgame
  payoffs: Scholar **Deep Work / Insight**, Warrior **Executioner / Overflow**,
  Wizard **Overcharge / Archmage**, Ranger **Second Companion Slot / Forage**.

- **Subclass Specialization (§9)** — once you **master a base class** and reach
  **Level 40**, you unlock one of **two subclasses per class** (eight total),
  each a multi-tier mini-tree that **stacks on top** of your base perks rather
  than replacing them, with its own separate (costlier) re-specialize action.

- **Player Panel class UI** — `renderClassPanel()` drives the whole flow:
  class-selection cards (locked until L8), the active skill tree with per-node
  unlock buttons, the capstone choice at full mastery, subclass cards at L40,
  and Focus-Crystal respec / re-specialize confirmations.

- **Effort-based XP (N3)** — the existing low/medium/high `priority` field now
  doubles as an effort proxy: **high pays 1.5×**, **low 0.75×**, and **medium stays
  at the historical 1.0× baseline**, so nothing you already earn changes. Applied to
  daily tasks, side quests and habits. The high-priority bonus on **daily tasks is
  capped per day** — a date-stamped counter that self-resets at midnight and survives
  reloads — so self-reported effort cannot be farmed; past the cap, high-priority
  tasks pay the medium rate.

- **Day-one goal creation — onboarding play-style fork (P0)** — progressive unlock
  gated the weekly / side / monthly / yearly / life goal tabs behind levels 6–9, so
  a new user who arrived to map out real goals *couldn't create them*. The
  onboarding fork now derives the unlock map from the play style the player picks,
  opening the tiers they actually came for on day one.

- **Starter content for the Grand Planner path (N1)** — that path opens the yearly
  and life-goal tabs at Level 1, which previously landed unlocked-but-empty with no
  guidance. Those tiers are now seeded with starter quests like the others.

- **First-session notification ask (P1a)** — reminders are the single biggest
  return driver, but the permission prompt never landed in session 1. It now
  follows the tutorial.

- **Wider free reward loop (P1b)** — chest loot drew spells from a hardcoded pool
  of six, so the free reward loop narrowed almost immediately. The free pool is
  now broader.

- **First streak repair is free (P2b)** — losing a long streak is the sharpest
  churn moment in the app, and recovery was entirely paywalled. Every player's
  first repair is now free, sitting behind the proactive streak-at-risk
  notification as a second safety net.

### Changed

- **Lock feedback explains itself (P2a)** — every bare `🔒 Unlocks at Level X!`
  dead-end toast now routes through shared builders that add the feature name, a
  **"N levels to go"** progress affordance and a value teaser. No bare form remains
  in the gating paths.

- **Class selection unlocks at Level 8 (was 10)** — the class system is a
  flagship feature, so it now surfaces earlier with its own "Choose Your Class!"
  tutorial at L8, filling the previously empty L7–L9 stretch. Selection is
  **decoupled** from skill points: you choose a class at L8, but skill points
  still begin accruing at L10 (so a class still maxes at *exactly* Level 40 and
  the L40 subclass/prestige math is unchanged). Re-picking a class is now **free
  before Level 10** (no points are committed yet), then reverts to the normal
  5 Focus Crystal fee.

### Fixed

- **January visitors lost their "new month" recap** — `loadData` read
  `this.lastMonth = data.lastMonth || null`, but `lastMonth` is **0-indexed**,
  so a stored **January (0)** was coerced to `null` on load. The period-transition
  check skips any tracking field that is `null`, so the month boundary was never
  detected: anyone whose last visit was in January got no month recap when they
  came back in February. `saveData` and `importData` had always stored the value
  correctly (`importData` already used `??`) — only the load path dropped it. All
  four period-tracking fields now use `??`, and a regression test asserts the
  `|| null` form appears for none of them. (Same `??` vs `||` trap as the v2.8
  `totalGoldEarned` migration below — second occurrence of this bug class.)

### Removed

- **The PWA / service-worker shell** — `manifest.json`, `service-worker.js` and
  the `beforeinstallprompt` install flow are gone now that the web/PWA target is
  retired. Update delivery runs through the Google Play in-app update flow, and a
  native-side cleanup unregisters any service worker (and purges caches) left
  behind by an older PWA install, which could otherwise keep serving stale assets
  after an APK update. Notifications deliver via Capacitor `LocalNotifications`
  with a plain `Notification` fallback in the browser.

### Internal

- **Version bumps** — Android `versionCode 29 → 32`, `versionName 2.10.0 →
  3.0.0`; `package.json`, the in-app footer string and the data-export version to
  `3.0.0`; `CHANGELOG_VERSION` to `3.0.0`, which re-arms the What's New modal —
  whose copy was rewritten from the stale v2.10 sound/chest announcement to the
  class system. Codes 30 and 31 were prepared locally but never uploaded, so the
  Play sequence skips them. Full suite green (**1255 tests**, up from 599 when
  this entry was first drafted).

- **`goal-manager.js` split into 52 modules (Engineering Roadmap #1)** — 72
  incremental slices took the God class from ~22.5k lines down into deep-frozen
  data catalogs, **19 pure LOGIC modules** and **22 RENDER modules**, each wired as
  a `<script>` before `goal-manager.js` plus `module.exports` for jest. The trigger
  was a drift bug: three spells missing from chests and bosses because the loot
  spell list existed in two hand-maintained copies. Behaviour-preserving
  throughout, with the suite growing **599 → 1255 tests**. Last two slices:
  `period-summary-logic.js` (70th + 71st — the recap math, then the transition
  DETECTION deciding whether a recap shows at all) and `reminder-schedule-logic.js`
  (72nd — the reminder clock math, previously untested).

- **Release tooling** — `scripts/release.js` replaces hand-editing five version
  strings across five files (`npm run release -- x.y.z` runs jest → version bumps →
  `cap:sync`, aborting unless each pattern matches exactly once). This release also
  repaired a real instance of that drift: `pwa-handler.js` had been left at
  `APP_VERSION = '2.5.0'`. `scripts/fetch-vendor.js` vendors Remix Icons and Google
  Fonts locally so a cold start is fully styled without CDN latency.

- **Repo history repaired** — the work behind builds 27–30 had been cut from an
  uncommitted working tree, leaving `HEAD` stranded at `v2.8.0` while ~90
  runtime-required modules (every logic and render module `index.html` loads)
  existed only on one machine. All of it is now committed and pushed.

- **Deferred to §3.2 (Crafting System)** — the four class `[large]` crafting
  subsystems (Warrior weapon forging, Ranger arrow crafting, Wizard spell
  crafting, Scholar enchantment crafting) were intentionally scoped out of this
  release.

---

## [2.10.0] — 2026-06-23 (Build 29)

> **Theme:** Sound Design Expansion + chest open animations.

### Added

- **Streak Repair (premium, §1.7)** — a broken **login or habit streak**
  of 2+ days is now snapshotted for **48 hours** so a premium player can
  **spend Focus Crystals to restore it** (cost scales ~1 crystal per 10
  lost days, min 1, capped at 5). A dashboard card lists every repairable
  streak with its exact cost and a one-tap restore; free users get a
  single contextual upsell instead. Snapshots de-dupe per target,
  auto-prune once the 48h window closes, and a repair never charges
  unless the restore lands (display-only until you spend). Persisted
  across both save objects + loaders. Service-worker cache `v620 → v621`.
  Covered by 21 unit tests.

- **Double XP Weekend (Limited-time events)** — the **first full weekend**
  (Sat 00:00 → Sun 23:59:59, UTC) of **each month** now grants **2× XP**
  on every quest, stacking multiplicatively with Beginner's Blessing,
  spells, enchantments, and companion bonuses. A dashboard banner
  announces the live event with a countdown. The window is computed
  purely from the clock — no scheduling or sync, so every client agrees —
  and the whole system sits behind a `limitedTimeEventsEnabled`
  kill-switch. A lightweight precursor to §3.3 Seasonal Events. Ships in
  the `v621` cache bump above. Covered by 10 unit tests.

- **Royal Bounty "ready" reminder (§1.9)** — a loss-aversion nudge that
  reminds you to finish an active Royal Bounty for its free chest before
  the window closes. Mirrors the v2.9.1 Streak Saver: native
  pre-schedules a notification (re-armed on app open, claim, assignment,
  and settings change), and the web/PWA service worker evaluates it at
  fire time. Fires once per day while there's an **active, unclaimed**
  bounty whose target quest is still **incomplete**. New Settings → 👑
  **Bounty Reminder** toggle + time (default `18:00`); respects the
  master reminders switch. Service-worker cache `v618 → v619`.

- **Sequential loot reveal by rarity (Track 1)** — the chest loot panel
  (`showLootPanel`) now reveals its reward rows in **ascending rarity**
  order, so the staggered top-to-bottom reveal builds to the rarest drop
  for a satisfying crescendo (best lands last) instead of appearing in
  random generation order. A new shared `_rarityRank()` helper drives a
  stable sort (ties keep generation order). **Display-only** — rewards are
  granted before the panel opens, so the reorder can never change what you
  actually receive. Service-worker cache `v619 → v620`.

- **Desktop sidebar "More" disclosure (UX audit L6)** — a brand-new player
  no longer faces a 10-item sidebar full of locked, far-off destinations.
  The desktop/tablet sidebar now shows your unlocked items plus the
  immediate next unlock, tucking anything that unlocks **two or more levels
  out** behind a **"More (N)"** toggle (default collapsed each launch;
  expand/collapse is session-only). Focus Timer was reordered before Quest
  Chains so the level-gated entries ascend cleanly. **Desktop-only** — the
  mobile bottom bar still shows every destination via horizontal scroll,
  and the toggle is hidden there (the per-link collapse is scoped to
  `≥769px`). Ships in the `v620` cache bump above.

### Changed

- **Level-1 rank renamed `Peasant` → `Wanderer`** — the default starting
  title was mildly demoralizing as a first impression (L1 of the
  pre-v2.7.1 UX audit). Renamed across both the masculine and feminine
  `LEVEL_TITLES` chains; **entry 1 only — levels 2–50 are unchanged**.
  This **retitles existing level-1 users** on update (a one-time,
  expected change). `'Novice'` was rejected because it already exists as
  a badge/achievement, and `'Adventurer'` because it's already the game's
  generic word for the player.

### Fixed

- **Silent daily-quest-board claim & side-quest completion** — claiming a
  daily quest board reward and completing a side quest played **no sound**.
  Both route their feedback through `effectsManager` (visual-only) and grant
  rewards via "quiet" sources (`addGold('daily')` / `addXP('side')`), and the
  completion sound lived **only** in the no-`effectsManager` fallback branch —
  which never runs in production. They now play the dedicated `task-complete`
  sound in the `effectsManager` branch too (matching the routine-task and
  ritual-completion sounds). Service-worker cache `v628 → v629`. Covered by 2
  new regression tests.
- **Analytics: heatmaps now show today and align to the calendar (§5.0)** —
  both the Activity Heatmap and the GitHub-style Habit Heatmap computed
  their start date as `today − (weeksToShow*7 − 1) − weekday`, which always
  landed on a **Monday** (mislabeled under the Sunday column) and ended the
  grid on **last** week's Sunday. The result: today's square was missing 6
  days out of 7, and every column was shifted one day off its label. Fixed
  the offset to `(weeksToShow − 1) * 7` via a single shared
  `_heatmapStartSunday()` helper used by both heatmaps, so the newest column
  is always the current Sun–Sat week with today in the last row.
- **Analytics: XP Timeline scales to the visible 30-day window** — the bar
  heights were scaled against the tallest day in *all* history, so a busy
  day from last quarter flattened every recent bar. The chart now scales to
  the tallest day **within the 30-day window**.
- **Analytics: "Longest Streak" personal record no longer decreases** — it
  read a `longestStreak` field that was never persisted and fell back to the
  live `habit.streak`, which resets to 0 when a streak breaks. It now derives
  the true record from each habit's append-only `completionHistory` (longest
  run of consecutive days), so a broken streak can't erase your record.
- **Analytics (internal): Activity Heatmap completion bucketing** now routes
  through the same `new Date(…'T12:00:00') → dateToLocalString` pipeline as
  the XP Timeline (plus a missing-`dueDate` guard), keeping the two
  date-bucketing widgets consistent.

---

## [2.9.1] — 2026-06-16 (Build 28)

> **Theme:** Engagement & Retention. Ships the §1.8 **Royal Bounty**
> (spotlight quests + free bonus chest) and the §1.9 **proactive
> streak-risk login reminder** ("Streak Saver"), the highest-value gap
> from the Jun 16 retention audit. Both features reuse existing systems
> (Theme-of-the-Week period rotation, the Track 1 chest pipeline, and the
> existing notification stack), so net new surface area is small.
>
> Cache series: `life-quest-journal-v616` (v2.9.0) → `v617` (Royal
> Bounty) → **`v618`** (streak-risk reminder). Lazy cache stays at
> `lazy-v280` (no lazy-asset payload change).
>
> Tests: **329 passing** (unchanged).

### Added

- **Royal Bounty (§1.8)** — each period spotlights one higher-tier quest
  with a tight sub-deadline and a free bonus chest on completion. A
  **Weekly Bounty** (assigned Monday, targets a `weeklyGoals` item,
  window = rest of the ISO week) and a **Monthly Bounty** (assigned the
  1st, targets a `monthlyGoals`/`yearlyGoals`/`lifeGoals` item, ~10-day
  window) run concurrently. Reward tiers scale with the quest tier
  (weekly → Silver, monthly → Gold, yearly/epic → Royal), reusing the
  existing chest pipeline's free-open path + loot fountain. Surfaced via
  a dashboard card (`#dashboard-royal-bounty`) plus a `👑 Royal Bounty`
  badge on the targeted quest in the Quest Log. Pure upside — no penalty
  for ignoring it.
  - **Anti-gaming:** the target is **assigned, never chosen**; the
    eligible pool excludes quests created after the period opened (via
    the existing `created` stamp); one claimable bonus chest per cadence
    per period (`lastBountyClaim` guard).
  - **Anti-frustration:** **one reroll per period** (premium-only; free
    users are routed to the upsell). Empty pool shows an "add a quest"
    nudge card instead of nothing.
- **Streak Saver — proactive streak-risk reminder (§1.9)** — a heads-up
  **before** your daily-login streak breaks, rather than the old
  after-the-fact shield prompt. Fires only on days you haven't yet opened
  the app (`lastLoginBonusDate !== today`) and only when the streak is
  worth protecting (`loginStreak >= 3`). Native builds pre-schedule the
  notification (canceled/re-armed the moment the daily login bonus is
  claimed); web/PWA evaluates streak state at fire time in the service
  worker (both periodic and push paths). New **🔥 Streak Saver** toggle +
  time picker under Settings → Reminders (default `20:00`).

### Internal

- **Retention Gap Audit (§1.9, Jun 16)** — recorded in `ROADMAP.md`:
  shipped the streak-risk reminder; tracked remaining gaps (chest/bounty
  "ready" nudge, habit-specific streak freeze, streak repair, limited-time
  events, weekly recap, leaderboards/guilds) with cross-links.
- **Version bumps** — Android `versionCode 27 → 28`,
  `versionName 2.9.0 → 2.9.1`; `package.json` and the in-app version
  string to `2.9.1`; `CHANGELOG_VERSION` to `2.9.1` (re-arms the What's
  New modal); `CACHE_NAME` to `v618`.

---

## [2.9.0] — 2026-06-15 (Build 27)

> **Theme:** Loot, Chest & Boss Battle Visuals + Theme of the Week. Ships
> the v2.9 cycle's boss-combat visual overhaul (Tracks 3–6: damage-trail
> HP bar, crit reticle + shockwave, per-theme defeat dissolve, loot
> fountain into the avatar ring, monthly FINAL BLOW overlay), Theme of
> the Week (Track 7: 9-week deterministic rotation, Monday spotlight,
> end-of-trial revert + upsell, analytics funnel), and the Track 1 chest
> visual pipeline (asset-gated WebM/PNG chest art + the chest loot
> fountain). Also folds in the Jun 10–11 features/balance audit fixes
> (round 1: Precision toggle exploit, lucky_loot weight shift; round 2:
> charge cap, Early Bird rebalance), the Android UX pass (hardware back
> button, search modal consolidation, confirm-dialog safety), and the
> Jun 15 reward/theme polish (round 3: chest loot fountain + theme text
> legibility). **Boss portraits (Track 2) are deferred to a later v2.9.x**
> pending the art-source decision (ROADMAP D1) — the code falls back to
> the existing emoji boss icons until then.
>
> Cache series: `life-quest-journal-v613` (v2.8.0) → `v614` (CDN removal)
> → `v615` (chest-art pipeline) → **`v616`** (this release cut). Lazy
> cache stays at `lazy-v280` (no lazy-asset payload change).
>
> Tests: 129 → **329 passing** across the cycle.

### Added

- **Delete UNDO button** — deleting a quest/habit now shows a
  `🗑️ "<name>" deleted` toast with a tappable ↩️ UNDO button that
  restores the item at its original position. Previously the only undo
  path was Ctrl+Z — unreachable on Android, i.e. for the entire user
  base. One-shot with a duplicate-id guard; the toast system gained
  generic `action: { label, callback }` support for future use.
- **Toast tap-to-dismiss** — the whole achievement toast is now a tap
  target that dismisses immediately and advances the queue, so bulk
  completions no longer trap users behind a wall of queued toasts.
  Action toasts stay up 6s (vs. 3s default) so the button is tappable.
- **Extended level titles (L11–L50)** — `LEVEL_TITLES` grew from 10 to
  50 entries per style. Users past level 10 were stuck on 'Legend'
  forever (reachable in ~2 months of active play); titles now progress
  through heroic, mythic, and celestial tiers (Hero → Mythic → Demigod
  → … → Paragon), clamping at 'Paragon' for level 50+. Levels 1–10 are
  unchanged, so no existing user is retitled on update. Feminine chain
  carries gendered counterparts at the same indices (Heroine, Warlady,
  Dragonqueen, Demigoddess, …).
- **"While you were away" recap** — returning after a missed day (or
  several) used to fire one toast per protected streak and *silently*
  zero broken streaks. The daily reset now collects all streak events:
  a single event keeps the familiar toast; 2+ events surface one
  consolidated recap modal with "Streaks Protected" and "Streaks Lost"
  sections plus a days-away header. Genuinely lost streaks (2+ days)
  are now reported instead of vanishing without explanation. The modal
  is dismissible via the Android hardware back button.
- **Offline indicator (audit L11)** — a small "📶 Offline" pill at the
  top of the viewport appears when `navigator.onLine === false`. The
  app works fully offline, but sync actions (referrals, challenges,
  shares) used to fail with cryptic errors and no context.
- **Locked-nav teasers (audit L5)** — locked sidebar entries now sell
  what's coming (`🔒 Boss Battles unlocks at Level 4 — slay epic bosses
  for legendary loot!`) instead of just stating the gate.
- **Chest art pipeline (Track 1)** — `goal-manager.js` is wired for
  real chest visuals: per-tier static art
  (`images/chests/chest-<tier>.webp|png`) replaces the emoji in
  treasury tiles + the celebration icon, and an opaque
  `chest-open-<tier>.webm` cinematic (framed as a rounded card over a
  dimmed backdrop, ~2 s, no audio, VP9/CRF 34) replaces the CSS
  celebration when present. Assets discovered via HEAD probes at startup
  — missing files keep today's emoji + CSS behavior exactly; playback
  errors, `prefers-reduced-motion`, and fx-minimal all fall back to
  the CSS path. Naming contract + encode specs in
  `images/chests/README.md`; resolves ROADMAP decision D2 toward
  video. SW cache → v615; `images/` added to `scripts/copy-web.js`.
- **Chest loot fountain** — opening any chest now sends the reward icons
  arcing out of the chest and up into the player's avatar ring before the
  loot panel opens, reusing the boss-defeat `effectsManager.lootFountain()`
  collection effect. The panel opens on the fountain's arrival callback
  instead of a fixed 2.2 s timer, so the beat reads as "loot flows from
  the chest into you, then you open it." Inherits the effect's
  accessibility gating (minimal-fx → loot appears instantly,
  `prefers-reduced-motion` → sprites hidden, off-screen avatar ring →
  viewport-center fallback) and falls back to the legacy fixed-delay
  panel open when the effect isn't available.

### Changed

- **Chest coin burst trimmed (20 → 12 particles)** — the outward CSS
  coin explosion in the chest celebration was thinned so it reads as the
  chest bursting open without competing with the new inward loot fountain
  — the burst is the explosion, the fountain is the collection payoff.
- **Attack charge soft cap (25)** — attack charges were uncapped, so
  heavy task days could bank 20–30 charges that trivialized the next
  week of bosses (the daily boss is only 8–18 HP). Charges now cap at
  25; overflow converts to gold at 5 gold/charge (routed through
  `addGold` so multipliers and lifetime counters apply) with a toast
  explaining the conversion. Battle Fury's charge doubling still
  applies before the cap.
- **Early Bird rebalance** — cost 4 → 2 crystals, boost window first
  3 → first 5 daily tasks. At 4 crystals for a max of +90 bonus XP it
  had the worst crystal-per-XP rate in the enchantment shop; the new
  rate (+150 XP max for 2 crystals) puts it in line with its peers.
- **Zero runtime CDN dependencies** — Tailwind is now compiled at build
  time (`npm run build:css` → minified `tailwind.css` with a
  dynamic-class safelist in `tailwind.config.js`); Remix Icons and all
  fonts (MedievalSharp, Cinzel, Uncial Antiqua, Inter) are bundled
  under `vendor/` via `npm run fetch:vendor`. First launch with no
  network now renders fully styled, cold starts skip CDN latency and
  the in-WebView Tailwind compilation, and no third party sees app
  opens (privacy-policy.html's third-party section updated to match).
  `index.html`, `landing.html`, `privacy-policy.html` and the service
  worker (CACHE_NAME → v614) all switched to the local assets.

### Fixed

- **Loot fountain rendered behind the chest** — the loot-fountain sprites
  sat at z-index 9100, below the chest cinematic/icon layers (9999), so
  the chest loot looked like it fell from nowhere instead of erupting out
  of the chest. Bumped to 10001 (above the chest band and the 10000
  boss-defeat band, which always finishes before the fountain fires) so
  the loot is now the topmost layer as it streams into the avatar ring.
- **Themed text matching the theme background** — text sitting directly on
  a theme background (the transparent view headers + title banner) could
  blend into same-hue radial highlight glows (golden's yellow title over
  the yellow top-glow, desert's orange-on-orange sun-ray) and into the
  bright regions of the WebM/image hybrid themes. A WCAG contrast audit
  confirmed every theme's text already clears AA against its solid card
  surface (min 4.87:1), so this was a layering issue, not a palette one;
  added a subtle dark text-shadow legibility halo to themed text —
  negligible on the opaque `.quest-card` panels (text there is already
  high-contrast) and decisive over the bright backgrounds. The default
  (unthemed) theme is untouched.
- **Pre-v2.7.1 UX audit deferred batch (L2/L3/L7/L8/L10)** — splash
  screen a11y attributes (`role="status"`, `aria-live`); dishonest
  "Loading wisdom..." quote placeholder replaced with a real inlined
  quote (kills the per-render FOUC); tutorial tooltip gained
  `max-height: 90vh` + scroll; PWA install button now respects
  `env(safe-area-inset-bottom)`; main content area got
  `id="main-content"` and `mobile.css` dropped the last fragile
  `div:last-child` positional selector.

### Internal

- **§2.6 sound expansion, code side (ahead of the v2.10 asset drop)** —
  `audio-manager.js` gained: a central `_eventVolumes` table replacing
  scattered per-call-site volume magic numbers (mix preserved
  verbatim); an anti-habituation variant picker (`<id>-1/2/3.mp3`
  probed at warm-up, random pick per play, throttling keyed on base
  id); and 10 optional event ids (`task-complete`, `boss-enrage`,
  `focus-start`, …) that are silently skipped until their files exist
  — `task-complete` falls back to `daily-achievement` per R6. Naming
  contract documented in `sounds/SOUNDS-README.md`. New
  `tests/audio-manager.test.js` suite (17 tests).
- 32 new regression tests covering the charge cap (incl. Battle Fury
  interaction and toast suppression), title chain integrity (length
  parity, L1–10 immutability, clamping), Early Bird boost window,
  recap consolidation (queue/flush paths, modal a11y attributes,
  back-button reachability), the delete UNDO flow (all 7 type keys,
  one-shot semantics, duplicate-id guard), and toast tap-to-dismiss
  (queue advance, action-button lifecycle, durations).
- 3 regression tests for the chest loot fountain — `showChestRewards`
  schedules `lootFountain` into the avatar ring and opens the panel on
  arrival, falls back to the fixed-delay panel open when no avatar ring
  is present, and `_lootFountainIcon` resolves per-reward-type icons with
  fallbacks.
- `_processToastQueue` now degrades gracefully (drops the toast) when
  the toast DOM isn't mounted instead of throwing; `deleteGoal`
  refactored onto a shared `DELETE_LIST_KEYS` map (was a 7-case
  switch).
- Verified (no change needed): daily quest pool `minLevel`s align with
  `featureUnlockLevels` / `goalTabUnlockLevels`; login-shield prompt
  and login-streak modal already route through the hardware back
  handler.
- Deferred to `ROADMAP.md` backlog (design-level): duplicate
  companions → evolution shards, task XP scaling by effort, XP curve
  review past level 20, boss streak freeze item.

---

## [2.8.0] — 2026-06-07 (Build 26)

> **Theme:** Theme Expansion release. Six new hybrid themes (Stormwatch,
> Sunken Library, Verdant Grove, Dark Cathedral, Crystal Caves, Aurora
> Spires), Proposal B free/premium rebalance (5 free / 9 premium),
> achievement-flavored theme criteria overhaul (Golden Empire by lifetime
> gold, Shadow Realm by bosses defeated), live theme preview modal with
> a full focus-trap + scroll-lock a11y baseline, per-theme accent
> micro-styling, and a `totalGoldEarned` lifetime counter with generous
> existing-user migration. Closes docs/HISTORY.md \u00A7 2.4.
>
> Cache series: `life-quest-journal-v612` (v2.7.1 build 25) → `v613`
> (this release). Lazy cache stays at `lazy-v280` (no lazy-asset payload
> change — theme WebMs ride in the standard cache).
>
> Bundle impact: +10.76 MB across 6 new hybrid theme WebMs (Stormwatch
> 992 KB, Verdant 3.26 MB, Sunken 1.05 MB, Cathedral WebM 1.49 MB +
> static .webp fallback 885 KB, Crystal 1.96 MB, Aurora 1.12 MB).
> Comfortably under the ~98 MB headroom reclaimed by the v2.7.1 GIF
> removal. Compression sweep (Jun 6) reduced the original 16.50 MB
> animated-bg footprint by 34.8% (-5.75 MB).
>
> Tests: 117 → **129 passing** (+12 net across the v2.8 cycle).

### Added

- **Stormwatch (Lv 18, premium)** — v2.8 marquee theme. Hybrid: 992 KB
  WebM v2 with baked-in cloud-to-cloud lightning + `.particle-rain`
  streaks layered on top. Desaturated slate palette tuned to harmonize
  with the overcast WebM. CSS-side lightning was iterated through three
  versions then deliberately dropped — the WebM carries the storm cue
  alone, which sidesteps WCAG 2.3.1 three-flashes concerns by design.
- **Sunken Library (Lv 13, premium)** — drowned-archive hybrid theme.
  3.28 MB → 1.05 MB compressed WebM + teal/deep-blue palette with
  parchment-amber accent + `.particle-bubble` (rising bioluminescent
  spheres). SVG bookshelf silhouettes from the original sketch are
  obsolete now that the WebM carries real archive imagery.
- **Verdant Grove (Lv 22, premium)** — sun-dappled grove hybrid. WebM
  (4.83 MB → 3.26 MB compressed at CRF 44; foliage = worst-case VP9
  content and the only single asset still over the 2 MB rule, kept as
  a deliberate exception) + warm olive palette + `.particle-leaf`. Moss
  SVG accents removed after the WebM landed (felt redundant against the
  real foliage).
- **Dark Cathedral (Lv 28, premium)** — gothic-crimson hybrid. 1.49 MB
  WebM as the primary background + 885 KB static .webp retained as the
  no-decode fallback (referenced in the body background stack). Crimson
  red-800 + cold cathedral-window slate-400 palette. `.particle-mote`
  overridden to pale-moonlight white under this theme so the default
  warm-amber motes don't clash with the crimson.
- **Crystal Caves (Lv 31, premium)** — underground-geode hybrid. 1.96 MB
  WebM + deep slate cave-rock base pierced by magenta + cyan crystal-
  cluster radials (5 radials) + `.particle-crystal` (6 px diamond shards
  that rise, tumble continuously via the standalone `rotate` property,
  and shimmer via cheap GPU `hue-rotate`).
- **Aurora Spires (Lv 35, premium)** — top-of-ladder hybrid. 3.08 MB →
  1.12 MB compressed WebM + cyan-violet palette retuned to match the
  actual aurora bands in the footage (was indigo-monochromatic, which
  matched the night-sky base but missed the saturated cyan-teal +
  violet-magenta dominance). `.particle-star` continues rendering on
  top of the WebM. **Last pure-CSS theme to fall — v2.8 hybrid count
  is now SIX, every theme in the lineup has a real asset.**
- **Live theme preview modal** — tap any theme tile (locked or unlocked)
  to open a fullscreen preview with:
  - Animated background stage (gradient + WebM for hybrid themes)
  - Sample themed quest card with XP bar, themed gradient, themed icon
  - Lock-reason copy ("🔒 Reach Level 35", "👑 Premium theme", etc.)
    surfaced clearly with a Close-only action when locked
  - Explicit Apply Theme button when unlocked — eliminates accidental
    theme switches from stray tile taps
  - Esc / X / backdrop / Close all route through one cleanup path
- **Modal a11y baseline** — `aria-modal="true"` + `aria-label` on the
  dialog, `aria-hidden="true"` on the decorative `<video>`, initial focus
  to the primary action (or Close if locked), full Tab/Shift+Tab focus
  trap, focus restoration to the previously-focused element on close,
  body scroll lock during modal lifecycle.
- **`totalGoldEarned` lifetime counter** — tracks gold ever earned (not
  current balance) so spending gold on chests/spells/enchantments never
  re-locks the Golden Empire unlock. Incremented in `addGold()` AFTER
  all multipliers (blessing, spells, enchantments, companion bonus,
  quest doubler) so it tracks what actually hit the wallet.
- **Per-theme accent micro-styling** — toast halo (1 px ring + soft outer
  glow in `var(--theme-primary-light)`) on top of the existing per-type
  toast gradients (gold for achievement, red for warning, etc.) for all
  non-default themes. Three truly-generic primary buttons gained an opt-
  in `.btn-themed-primary` class: Resume Focus Timer, search filter
  "All" chip, Search Quests sidebar CTA. Default Medieval Kingdom theme
  looks identical to v2.7.x. Semantic / brand-colored buttons (Streak
  Shield, Save-to-Phone, Equip Title, Settings, Share Stat Card, Stop)
  deliberately left untouched per the audit.

### Changed

- **Free / premium theme tier rebalance — Proposal B (5 free / 9
  premium).** v2.8's expansion to 14 themes triggered a reassessment.
  Previous 2-free / 12-premium split felt stingy and double-gated the
  two achievement-flavored themes. New split:
  - **Free (5):** 🏰 Medieval Kingdom (Lv 0), 🌲 Forest Kingdom (Lv 6),
    ❄️ Ice Citadel (Lv 15 — promoted from premium), 👑 Golden Empire
    (10 k gold lifetime), 🌑 Shadow Realm (25 bosses defeated)
  - **Premium (9):** 🏜️ Desert Oasis, 🌋 Volcanic Forge, ✨ Mystic
    Realm, plus all six v2.8 hybrid themes (Sunken, Stormwatch, Verdant,
    Cathedral, Crystal, Aurora)
- **Golden Empire criteria** — changed from `100 quests completed` to
  `10,000 gold lifetime earned`. Better thematic fit ("Empire" = wealth
  amassed, not busywork done). Reads from the new `totalGoldEarned`
  counter so spending never re-locks the unlock. **Existing-user
  migration is generous:** `totalGoldEarned` seeds from the player's
  current `goldCoins` balance on first v2.8 load (strict lower bound on
  true lifetime earnings — gold can ONLY enter via `addGold()`, so
  current ≤ lifetime for all states). Players who already hold ≥10 k
  gold get Golden Empire auto-unlocked on first launch via the existing
  constructor `checkRewardUnlocks()` sweep with toasts suppressed.
- **Shadow Realm criteria** — changed from `5 life goals completed` to
  `25 bosses defeated`. Reuses the existing `bossesDefeated` counter
  (no new tracking needed). 25 sits between Champion (10) and Dragon
  Slayer (50) titles for clean ladder placement.
- **Achievement-gated themes no longer double-gated.** Previously both
  Golden Empire and Shadow Realm had `premium: true` AND a criteria
  check, so a free user could hit the criteria and still be blocked by
  the premium gate. Both moved to free — effort is rewarded, full stop.
- **Aurora Spires palette retune** — primary `#4f46e5` indigo →
  `#06b6d4` cyan-500; accent `#c084fc` violet → `#a78bfa` violet-400.
  Body radials retuned to match. Original indigo values preserved in
  trailing `/* was ... */` comments for one-line revert.
- **Verdant Grove palette retune** — warm sun-dappled olive replacing
  the cool jade/mint of the original pure-CSS version, to harmonize
  with the actual grove WebM. Original cool-jade values preserved in
  trailing comments.
- **Stormwatch palette retune** — desaturated steel tones (`#94a3b8`
  thumb, slate-900 transparent track) replacing the saturated sky-blue
  accents, harmonizing with the overcast cloud WebM.
- **Service-worker cache bumps** — `CACHE_NAME` `v612 → v613`.
  `LAZY_CACHE_NAME` stays at `v280` (no lazy-asset payload change —
  theme WebMs ride in the standard cache after the v2.7.1 GIF-removal
  sweep emptied `lazyAssets`).
- **Themes selector unified across both surfaces** — the compact
  selector in the player panel previously had no preview path at all
  (tile click = direct apply). Both surfaces now route tile clicks
  through `previewTheme(id)` so users never have to remember which
  view applies vs. previews.

### Fixed

- **C1 — Preview modal `previewVideos` map was incomplete (critical).**
  Map only included the 6 v2.8 hybrids, missing `forest`, `desert`,
  `ice`, `volcanic`, `mystic`, `golden`, `shadow` — all of which have
  body WebMs. Previewing Volcanic showed a flat red gradient; applying
  it then played the full lava WebM on the body. All 13 themes with
  body videos now preview their actual asset.
- **Body `<video>` now pauses while the preview modal is open** —
  previously when a hybrid theme was active and the user previewed
  another, both videos decoded simultaneously. The body video pauses
  on modal open and resumes on close (only if it was playing before,
  to avoid spurious autoplay-policy failures on non-hybrid themes).
  Restores the "only one WebM ever decodes at a time" invariant.
- **Bottom-pinned stray dead-code block in `goal-manager.js`** — an
  earlier `videoBackgrounds` hoist refactor left a ~100-line inline
  duplicate of the asset map below the live code path. Physically
  removed; file dropped from 20,108 → 20,005 lines. (N1 audit item.)

### Internal

- **`totalGoldEarned` migration uses `??` not `||`** to distinguish
  field-absent (existing user upgrading → seed from `goldCoins`) from
  field-present-and-zero (genuine new player or zero-balance returning
  user post-spend → stay 0). Without the distinction, a player who
  spent down to 0 would get re-seeded from `goldCoins` on every load,
  double-counting their lifetime earnings indefinitely. Two call sites
  hardened: `goal-manager.js:556` (`loadData`) and `:12942`
  (`importData`).
- **Theme system regression test coverage (S6 audit fix).** Added a new
  "Theme System (v2.8)" describe block with 9 tests covering: all 14
  themes present with required fields (name, icon, 6-digit hex,
  explicit boolean `premium`); Proposal B split exact (`[default,
  forest, golden, ice, shadow]` free + 9-theme premium roster);
  `addGold()` increments `totalGoldEarned` by post-multiplier finalGold;
  counter never decreases when gold is spent; save/load round-trip;
  existing-user migration; Golden Empire boundary tested at 9,999
  negative + 10,000 positive; Shadow Realm at 25 bosses; idempotency
  of theme grants. **4 additional N3 migration tests** cover seed-from-
  goldCoins, field-present-as-0-stays-0, missing-both-fields-defensive,
  and end-to-end auto-unlock.
- **Test infrastructure addition: `extractedThemeDefs`.** Class fields
  like `themeDefinitions = { ... }` run as part of the constructor
  body, and `createTestManager()` uses `Object.create()` to bypass the
  heavy constructor. That means class fields are NOT present on test
  instances. Solved by parsing the production source string for
  `themeDefinitions = {` and slicing the literal out using a brace-
  balance walk that ignores braces inside `/* */` comments and `'...'`
  strings. `eval`'d once at module load, attached to every test
  instance via the factory. Guarantees tests validate the REAL theme
  data, not a fixture duplicate that could drift. Pattern reusable for
  any future class-field literal that needs test access without
  constructor side effects.
- **Test fixture lesson — wrong localStorage key.** First run of the new
  migration tests failed with `Expected: 8500, Received: 0`. Root
  cause: used `lifeQuestJournalData` (the file's logical name) but
  production `loadData` reads from `lifeOrganizeData` (legacy pre-
  rename key, never migrated). The earlier "tolerates missing
  totalGoldEarned" test passed only because the wrong key meant the
  `if (saved)` branch never executed and the field stayed at the
  factory-init 0 — false green. Caught it now because the new tests
  expect non-zero values. All four migration tests now use the correct
  key. The earlier stale test was replaced rather than kept, since
  keeping a 0-expectation test would lie about the intended behavior.
- **Compression sweep** — 2-pass libvpx-vp9 re-encodes on the three
  backlog WebMs. ffmpeg 8.1.1, no audio. Realized: Aurora 3.08 → 1.12 MB
  (-63.5% at CRF 32), Sunken 3.28 → 1.05 MB (-67.9% at CRF 32), Verdant
  4.82 → 3.26 MB (-32.3% at CRF 44 — foliage worst-case content;
  stopped at 44 because pushing further risked visible smearing of
  high-frequency leaf detail). Combined 11.18 MB → 5.43 MB (-51.4%).
  Originals preserved at `icons/_originals/` for A/B comparison and
  clean revert.
- **Strategy D "at most ONE marquee per release" clause dropped.** v2.8
  originally allotted ONE hybrid theme (Stormwatch); the user supplying
  WebMs for five more flipped that constraint. New informal rule:
  prefer pure-CSS, allow hybrids when (a) the user supplies an asset
  that markedly elevates the theme and (b) no single asset exceeds
  ~2 MB compressed without a compression-pass plan attached. Total
  animated-bg bundle envelope is the real constraint, not a count cap.

---

## [2.7.1] — 2026-06-01 (Build 24)

> **Theme:** v2.7.x patch-window release. Modal scroll-clipping fix flagged
> by the maintainer + same-day preventive audit of every modal in the
> codebase + the long-deferred GIF fallback removal (docs/HISTORY.md \u00A7 1.6) bundled
> in as a piggyback because the SW cache bump was already happening.
>
> Cache series: `life-quest-journal-v608` (v2.7.0) → `v611` (this release).
> Lazy cache also bumped `lazy-v270 → lazy-v280` to evict ~95 MB of stale
> GIF payloads from returning PWA users.

### Fixed

- **What's New modal scroll-clipping** — the v2.7 rewrite expanded the
  modal from 2 sections / 8 bullets to 4 sections / 11 bullets, exceeding
  viewport height on shorter phones. Outer wrapper had `fixed inset-0`
  with no `overflow-y-auto`, so `flex items-center` centered a taller-
  than-viewport card with both ends clipped behind the viewport edges and
  no scroll. Added `overflow-y-auto` to the outer wrapper.
- **Eight other modals at risk of the same clipping** — preventive audit
  walked every modal in the codebase against the same vulnerability
  profile (centered modal + tall content + no containment). Found 8
  vulnerable: `search-modal`, `login-shield-prompt`, `login-streak-modal`,
  `period-transition-modal`, `share-card-modal`, `weekly-recap-modal`,
  `challenge-share-modal`, `accept-challenge-modal`. None had been
  observed clipping in production yet — fixed preventively by appending
  `max-h-[90vh] overflow-y-auto` to the inner gradient card class on
  each, matching the existing containment pattern already used by
  `period-summary`, `connection-modal`, `select-modal`,
  `create-challenge-modal`, `active-challenges-modal`, `premium-purchase`,
  `quest-search`, and `starter-quests`. docs/HISTORY.md \u00A7 2.3.1 documents the
  three valid containment strategies as the going-forward standard.

### Removed

- **Animated-theme GIF fallbacks (docs/HISTORY.md \u00A7 1.6 resolved)** — the seven
  `icons/*-bg.gif` files (forest 1.7, desert 0.3, ice 2.4, volcanic 3.6,
  mystic 63, golden 7.5, shadow 16.7 — total ~95 MB) plus the unreachable
  `icons/volcanic-bg.mp4` (3.4 MB) deleted from the bundle. The `webm ||
  mp4` selector in `updateThemeVideoBackground()` never reached the mp4
  branch because every theme has a webm; with `minSdkVersion=24`'s
  Android CDD requiring VP9 hardware decode on every supported device
  (Android 7.0+), the GIFs were also strictly dead weight on real
  hardware. **Net bundle / cache-footprint win: ~98 MB.**
- **`useGifFallback` helper + `body.has-theme-bg::before` GIF layer** —
  replaced with `hideVideoKeepThemedGradients()` which on hardware-decode
  failure hides the `<video>` and keeps `has-theme-bg` on so the themed
  sidebar / quest-card gradients still paint a coherent themed look.
  Graceful degradation to static themed gradients rather than swapping
  in a 16 MB GIF. The `themes.css` `has-theme-bg` transparency rules
  (shared with the video path) were preserved per spec.

### Internal

- **Service-worker cache bumps** — `CACHE_NAME` `v610 → v611`;
  `LAZY_CACHE_NAME` `v270 → v280`. The lazy-cache bump is what evicts
  the stale ~95 MB GIF payload on returning PWA users' next launch
  (the activate handler's cleanup branch deletes any cache name that
  doesn't match either current constant).
- **`lazyAssets` array emptied** — kept in place as wiring for any
  future large lazy-cached asset; the `isLazyAsset` / `targetCache`
  fork in the fetch handler is now effectively a no-op since no asset
  matches, but the infrastructure remains available without further SW
  refactor.
- **Telemetry plumbing skipped** — the original docs/HISTORY.md \u00A7 1.6 spec also
  outlined a codec probe + `localStorage.lqj_webmFails` breadcrumb. Both
  skipped because no user reports of broken backgrounds came in during
  the v2.5–v2.7 window. If reports start coming in against v2.7.1+ now
  that the static-gradient fallback replaces the GIF fallback, revisit.

---

## [2.7.0] — 2026-05-31 (Build 23)

> **Theme:** Character Sheet & Player Panel Overhaul + Quest Card & Component Redesign
> (docs/HISTORY.md \u00A7 2.2 + § 2.3, consolidated)
>
> This release fuses what was originally planned as two minor versions
> (v2.6 Character Sheet & Panel work + v2.7 Quest Card & Component
> Redesign) into a single Play Store rollout. The v2.6 line was built
> and battle-tested across a long internal cycle but never shipped to
> production; the v2.7 visual layer was developed on top of it.
> Releasing them together avoids exposing users to a stale v2.5 client
> during the v2.6 window and keeps the player-panel + rarity-frame
> work aesthetically coherent on first contact.
>
> Cache series: `life-quest-journal-v6xx` (was v5xx in the unreleased
> v2.6 branch, v4xx in v2.5). Hundreds-digit ramps per minor release
> so two clients on neighboring versions can never mistake each
> other's cached assets.

### Added — Character Sheet & Player Panel (§ 2.2)

- **XP ring around player avatar** — live-updating SVG arc tracking
  current-level progress toward the next level. Renders on both the
  always-visible top-right avatar button and the expanded character-
  sheet avatar. `pathLength="100"` for clean progress math.
- **Avatar rarity frame system** — tier-colored stroke around the ring
  with prestige-star anchor positions reserved for v3.0 (eight cardinal/
  intercardinal SVG anchors in the `xp-ring__prestige-slots` group,
  opacity 0 until prestige ships).
- **Comet shimmer overlay** — tier-driven SVG comet image rotates
  around the ring at variable speed (tiers 4–6 slow, 7–8 medium, 9–10
  brisk). Replaced an earlier dashed-stroke approach that rendered as
  broken segments on some Android WebView builds.
- **Active spell sigils orbiting the avatar** — 0×0 anchor at avatar
  center holds N rotated children; outer container spins (24s
  `sigilOrbit`), inner icons counter-rotate to stay upright. Capped at
  7 visible + `+N` overflow badge. Stripped on `fx-minimal`.
- **Active companion bubble portrait** — gentle 2.4s idle bob next to
  the XP ring (`companion-bubble` keyframe), slowed on `fx-reduced`,
  animation stripped on `fx-minimal`.
- **Equipped title on parchment scroll** — replaces the flat title
  text under the avatar; tap opens the Title Hall.
- **Stat-breakdown tooltips** — hover (desktop) / long-press (mobile)
  on stat rows reveals the breakdown of bonuses, with `backdrop-filter`
  blur. Transitions stripped on `fx-minimal`.

### Added — Quest Card & Component Redesign (§ 2.3)

- **Rarity frame system** — generic `.rarity-frame` chrome layer with
  `data-rarity="common|uncommon|rare|epic|legendary"`. Each tier gets
  a distinct border treatment, inner glow, and subtle ambient
  animation. Applied to:
  - Spell collection (active spells + spellbook)
  - Companion collection (active companion + grid)
  - Loot drop rewards
  - Treasure chests (wooden = common, bronze = uncommon, silver =
    rare, gold = epic, royal = legendary)
  - Titles in Title Hall (per-title explicit rarity — see calibration
    note below)
  - Badges in Achievement Gallery (per-badge explicit rarity that
    reflects milestone significance, not just target magnitude)
  - **Rarity calibration pass** — initial title tiering used a positional
    ramp inside each category (first slot = common, last slot =
    legendary, linear between). Worked for categories ordered easy →
    hard with comparable absolute difficulty (Quest Milestones, Habit
    Streaks), broke for everything else: mixed-metric categories
    (Wealth interleaving gold + chests, Arcane interleaving focus
    sessions + spells, Combat interleaving bosses + companions)
    jumbled the ramp, and the 2-entry Login Streak category collapsed
    a 100-day login streak to "common". Replaced the algorithm with an
    explicit `rarity` field on every title and every badge, calibrated
    against actual effort to earn (common = onboarding one-shot,
    uncommon = a few days, rare = a couple weeks committed, epic =
    a couple months dedicated, legendary = extreme / multi-year).
    Fixes 5 mis-tiered badges (Month Master ↑ epic, Focus Master ↑
    epic, Master Planner ↓ common, Spell Caster ↓ uncommon, Boss
    Hunter ↓ uncommon) and ~12 mis-tiered titles (Dragon Slayer ↑
    legendary, Centurion login ↑ epic, Treasure Hunter title ↓
    common, Spellcaster title ↓ common, etc.).
- **`.rarity-nameplate` companion stamp** — Remix Icon glyph + tier
  label pinned to the foot of any rarity-frame card. Driven by the
  same `data-rarity` attribute so the visual tier and the nameplate
  text can never disagree.
- **Parallax tilt on epic+ items** (`parallax-tilt.js`) — pointer-
  tracked 3D rotation + follow-the-cursor sheen highlight on hover
  for any `.rarity-frame[data-rarity="epic"]` or `legendary` card.
  Uses event delegation on `document` so it survives every
  `render()` re-paint without re-binding. `pointermove` updates are
  rAF-batched so we never write CSS custom properties more than
  once per frame. Bails at init on touch (`(hover: none)`) and
  `prefers-reduced-motion`; clamps max tilt from 8° to 4° on
  `fx-reduced`; re-checks `fx-minimal` per frame so toggling
  intensity in Tools view applies live without reload.
- **Illustrated empty-state primitive** (`_renderEmptyState()`) —
  parchment-tinted card with corner flourishes, rotating ray-burst,
  medallion icon, drifting sparkles, headline, body copy, and
  optional CTA. Single source of truth for "nothing here yet"
  surfaces. Now used on **8 surfaces**: locked goals, recurring
  tasks, habits, today's tasks, side quests, companion collection,
  archived goals, active spells, and calendar day-detail. Replaces
  every "📦 No items yet" text wall in the app.
- **Progress bar polish** — bars marked `.progress-bar` get an
  ambient shimmer sweep, a near-completion shimmer accelerator
  (75%+), and an epic glow + pulse when filled (100%). All three
  layers respect `fx-reduced` (slower) and `fx-minimal` (off).
- **Cross-device icon consistency sweep** — replaced platform-rendered
  emoji with Remix Icon SVG glyphs throughout the app's chrome so a
  Samsung One UI device, a Pixel, and a TWA on Chrome OS all render
  the same shapes at the same weight. Toast `cosmetic-icon` maps each
  toast type to a Remix Icon. Section headers, recurring-task pattern
  picker, "Which Week?" ordinal picker, Daily Quest Pool icons, Daily
  Quest Board status badges, and `index.html` chrome buttons all
  swapped. Content / identity emoji (level-up titles, chest tier
  reveals, boss themes, enchantment / spell icons, side-quest
  priority indicators, splash backgrounds) left as-is on purpose.
  Toast big-icon switched to a center-stacked layout (icon on top,
  title + message centered below) because the previous icon-left /
  text-right flex depended on emoji's built-in padding to look
  balanced — Remix Icons are tighter, so the layout was rebuilt.

### Added — Panel & Visual Cohesion Pass

- **Dashboard button consolidation** — the 6-button row (Week Summary
  / Month Summary / Year Summary / Share Weekly Recap / Challenge a
  Friend / My Challenges) collapsed into two amber/stone dropdown
  buttons (Reports ▾ / Challenges ▾). Uses the ARIA disclosure
  pattern: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`,
  `role="menuitem"`. Outside-click and Escape close handlers bound
  once at module load. Original icon colors preserved as menu-row
  tints so the learned green=week / blue=month associations carry over.
- **Tools view chrome unification** — repainted 7 panels (Backup &
  Export, Settings, Realm Themes, Tutorial & Help, Share & Community,
  Privacy & Legal, plus pre-existing Task Reminders) to a single
  `from-stone-800 to-stone-900 + border-amber-700/50` palette,
  replacing the previous indigo / purple / blue / gray / slate
  patchwork. Settings panel was the deepest refactor — every internal
  indigo class was remapped (timezone select, volume slider, 3
  section dividers, 6 labels, 3 Animation Intensity buttons, 2 Title
  Style buttons, Test Sound button, helper-text paragraphs, focus
  rings).
- **Body background darkening** — `<body>` shifted from `bg-stone-900`
  (#1c1917) to `bg-stone-950` (#0c0a09). Side benefit: panels using
  `from-stone-800 to-stone-900` no longer blend into the body on
  their bottom-right gradient stop, so cards visibly elevate over
  the surface instead of leaking into it.
- **Default-theme particle removal** — the default theme previously
  spawned `icons/coin.gif` 40px spinning-coin particles (3 initial +
  interval-spawned, max 15 on screen). Replaced with `{ disabled:
  true }` and a guard in `initThemeParticles()` that short-circuits
  both the spawn interval and initial-burst loop. All 7 themed states
  (forest leaves, desert sand, ice snow, volcanic embers, mystic
  shine, golden sparkle, shadow wisps) keep their atmospheric
  particles untouched. The disabled-particle config pattern is now
  the documented way to opt a theme out of ambient motion.

### Changed

- **Dashboard title decluttering** — removed the `⚔️` crossed-swords
  emoji from the dashboard `<h2>` because the always-visible top-right
  player-panel-toggle (avatar + XP ring) sat directly over it on most
  viewport widths.
- **Bulk Actions button color match** — Tools view quick-action button
  was `bg-purple-700` while neighboring Undo/Redo were `bg-gray-700`.
  Aligned to gray-700 so the row reads as four utility buttons of the
  same weight rather than three utility + one categorical action.
- **Mobile bottom-nav contrast bump** — against the new darker body
  (`bg-stone-950`), the active-tab indicator's previous tint was
  closer to the surrounding chrome than intended. Bumped the active
  state's amber tint and glow so the selected tab pops at a glance
  on small viewports.
- **Recurring-task multi-day discoverability** — the multi-select
  modal subtitle now explicitly says "Tap one or more days" so a
  user expecting a single-pick flow discovers the multi-day option.
  No data-model change required: the model and UI already supported
  `recurrence: { type: 'weekly', days: [...] }`; the gap was purely
  in copy.

### Fixed — Analytics view correctness pass (§ 5.0 prerequisite)

A full walkthrough of every widget on the Analytics view against
empty / partial / full dataset states. Six root-cause fixes so
Phase 5 features can build on a known-good foundation.

- **Completion-rate denominator** — was counting only scheduled tasks,
  so a heavy ad-hoc day showed > 100%. Now divides completions by
  total tasks created in the window.
- **Login-streak source** — productivity-pattern card was reading
  from a stale memoized helper; rewired to `this.loginStreak` direct.
- **Real task-count timeline** — XP timeline was synthesizing fake
  per-day XP from level deltas. Replaced with the actual `xpHistory`
  feed and a real-tasks-completed series so the chart matches the
  numbers shown elsewhere.
- **Timezone-safe date parsing** — heatmap and timeline were using
  `new Date(yyyy-mm-dd)` which UTC-parses on some Android WebView
  builds, shifting cells one day west in negative-offset zones.
  Switched to explicit Y/M/D constructor.
- **Tailwind dynamic-class refactor (×2)** — two widgets were
  building class names by string concat (`bg-${color}-500`) which
  Tailwind JIT can't see at build time, so they rendered class-less
  in production. Switched to a const map.

### Internal

- **Test infrastructure** — added 9 analytics regression tests
  covering the six widget fixes above. Plugged a class-field gap
  in the test factory (`LEVEL_TITLES` was a per-instance class
  field, but the factory used `Object.create(GoalManager.prototype)`
  to skip the constructor, so every test that crossed a level
  threshold crashed inside `getLevelTitle`). Replaced one stale
  `toggleTask` uncomplete assertion with three contract-pinning
  tests that lock the v2.5 anti-exploit refund logic in place
  (fallback baseline for legacy tasks, exact-snapshot refund for
  modern buffed tasks, clamp-at-zero edge case). Suite is now
  **110 / 110 passing**.
- **Service-worker cache bump** — `life-quest-journal-v601` +
  `life-quest-journal-lazy-v270` so returning PWA users force-
  refresh past the v2.5 cache instead of seeing partial v2.7
  chrome layered over v2.5 cached JS/CSS.

---

## [2.5.0] — 2026-05-24 (Build 21)

> **Theme:** View Transitions & Navigation Polish (docs/HISTORY.md \u00A7 2.1)

### Added
- **View transitions between top-level views** — switching between Dashboard,
  Daily Quests, Calendar, Tools, and other views now uses a 280ms decelerate-out
  fade-and-rise animation (`opacity 0→1 + translateY 12px→0`,
  `cubic-bezier(0.16, 1, 0.3, 1)`). Driven by a new
  `_animateViewEnter()` helper in `goal-manager.js` that re-triggers the
  `viewEnter` keyframe on every `switchView()` call, so navigating back to a
  previously visible view animates correctly. Honors `prefers-reduced-motion`
  (CSS) and `effectsManager.intensity === 'minimal'` (JS).
- **Active nav-link spotlight** — the currently-selected sidebar tab now has a
  gentle 2.4s outer-glow pulse so it's always visible at a glance, plus a
  quick scale-down (`scale(0.97)`, 80ms) on tap for haptic-feeling press
  feedback. Layers over the existing border-left theme accent without conflict.
  Honors `prefers-reduced-motion`.
- **Quest-card resting elevation** — every `.quest-card` now has a subtle
  baseline `box-shadow: 0 4px 12px rgba(0,0,0,0.18)`. Cards no longer look
  flat at rest, and the existing v2.4.9 hover lift (`translateY(-6px)
  scale(1.02)`) reads as a deliberate rise instead of materializing.
- **Universal button press feedback** — every `<button>` (except the mobile
  sidebar pull-tab and anything explicitly marked `.no-press`) now gets a
  subtle `scale(0.97)`, 80ms scale-down on `:active` for tactile feedback
  on both click and tap.
- **Opt-in `.btn-ripple` class** — applies a soft white radial flash that
  blooms from center on press and fades 400ms after release. Pure-CSS,
  reliable, no JS pointer tracking required. Add the class to any primary
  action button to enable.
- **Opt-in `.fx-success-flash` class + `effectsManager.successFlash(el)`
  helper** — fires a 600ms green pulse + glow on confirm actions (claim
  reward, complete quest, redeem code). Helper handles the reflow-restart
  pattern and auto-cleanup so callers just pass an element.
- **Gendered level-title chain (Settings → Title Style)** — the level
  progression (Peasant → Squire → Knight → … → Legend) now ships with both
  a masculine and a feminine chain, switchable from a new "Title Style"
  control in the Sound & Effects card. Masculine (default, no change for
  existing users) keeps the original chain; feminine swaps every gendered
  rank — Knight→Dame, Baron→Baroness, Earl→Countess, Duke→Duchess,
  Prince→Princess, King→Queen, Emperor→Empress (Peasant/Squire/Legend
  stay neutral). Toggle persists across sessions, survives backup
  import/export, and re-renders the visible XP display immediately so
  the new title appears without a refresh. Internally consolidates three
  previously duplicated hardcoded title arrays in `showXPToast`,
  `levelUp`, and `renderXPDisplay` into a single `LEVEL_TITLES` table +
  `getLevelTitle(level)` helper — future title-chain edits are now a
  one-line change.
- **Skeleton loaders for the analytics view** — the 6 chart containers
  (Activity Heatmap, XP Timeline, Task Breakdown, Productivity Pattern,
  Personal Records, Goals Progress) now show content-shape-appropriate
  shimmer placeholders instead of empty boxes during the brief render
  window. Skeletons self-clear: each `render*()` function overwrites
  `innerHTML` with real markup, so no JS cleanup is required. Stone/amber
  palette matches the app — reads as part of the UI, not a generic gray
  loader. Honors `prefers-reduced-motion` (shape preserved, shimmer halts).

- **`.btn-ripple` wired into 7 primary-action buttons** — the new ripple
  class now actually appears in the UI on: Claim Daily Quest, Open Wooden
  Chest, ATTACK! (boss), Add Today's Quest (both empty states), Add Quest
  on calendar day, Add Another Quest on calendar day, and the Quick Add
  modal's "✓ Add Task" button. Each press now blooms a soft white radial
  flash from center that fades 400ms after release.
- **List-stagger entrance animation** — items in list views (Daily Quests,
  Side Quests, calendar day tasks, anything using `.task-item`) now fade
  in with a 40ms per-item stagger so the list reads as "filled in" rather
  than "popped" all at once. Caps at item 10 to avoid compounding delays
  on long lists. Pairs naturally with the new view transition. Honors
  `prefers-reduced-motion` (all delays drop to 0ms).
- **Sub-tab spotlight pulse** — the new active-nav-link glow now extends to
  the Goals view tabs (Epic / Yearly / Monthly / Weekly / Side) with an
  amber halo, and the Arcane view tabs (Spellbook / Enchantments) with a
  purple halo. Same 2.4s cadence as the sidebar pulse, slightly tighter
  glow radius proportional to the smaller tab targets. Consistent "you are
  here" cue at every level of navigation.
- **"What's New in v2.5" modal** — existing users upgrading from v2.4.x see
  a one-time announcement on first launch summarizing the headline changes
  (smoother transitions, active tab spotlight, tactile buttons, list
  stagger, faster Analytics). Dismisses with a single button, persisted
  via the `lastSeenChangelogVersion` localStorage key, never re-appears.
  Brand-new installs are silently marked as seen so they never see
  "what's new" on their first launch. Suppressed if a tutorial overlay is
  active to avoid stacking. Deferred 3500ms after init so it lands after
  login-bonus / referral / period-transition checks.

### Changed
- **`.quest-card:active` rule** — moved out of `mobile.css`'s
  `@media (max-width: 768px)` block into `animations.css` as a universal
  rule, with a matching shadow change. Mobile-only block left as a comment
  pointer.

### Fixed (v2.5.1–v2.5.4 follow-ups from on-device pre-flight)
- **View transition blink** — root cause was a stale
  `.view-container { animation: viewFadeIn 0.15s ease-out }` rule (and its
  `@keyframes viewFadeIn`) lingering in `styles.css` from a previous
  version. When v2.5's JS removed the `is-entering` class on
  `animationend`, the element's resolved `animation` property changed
  back to `viewFadeIn`, which Android Chromium WebView treated as a
  fresh animation start and re-fired the 150ms fade — producing a
  visible blink right after the smooth view-enter completed. Both the
  rule and its keyframe were deleted; the v2.5 `viewEnter` system
  completely supersedes them. Also added a static `opacity: 0; transform`
  from-state to `.view-container.is-entering` (alongside the keyframe
  animation) so the very first paint after class-add is guaranteed to
  be in the from-state regardless of WebView animation-start timing.
- **List-stagger cascade not perceptible** — scoped stagger to view-enter
  via `.is-entering .task-item` selector (so adding a single task no
  longer makes that one task wait for an inherited nth-child delay), and
  bumped per-item cadence from 40ms → 80ms with a 60ms base offset so the
  cascade reads consciously instead of as one quick blur. Cap dropped
  from 10 → 8 to keep total under 700ms.

### Added (v2.5.5 — ripple, JS-driven this time)
- **Material-style click ripple** (`@e:\CascadeProjects\Life Organize\CascadeProjects\life-quest-journal\effects-manager.js:_initRipple`) —
  the `.btn-ripple` opt-in effect is back, now implemented properly via
  a single delegated `pointerdown` listener that injects a
  `<span class="ripple-wave">` at the exact click coordinates. The wave's
  diameter is computed as 2× the click-to-farthest-corner distance so it
  always fully covers the button regardless of tap location, then expands
  scale 0→1 with opacity 0.55→0 over 600ms before self-removing on
  `animationend` (with an 800ms safety-net `setTimeout` for edge cases
  where the button is detached mid-animation). Honors
  `intensity: 'minimal'` (skips spawn) and `prefers-reduced-motion`
  (CSS `display: none` fallback on the wave). Three CSS-only attempts
  (v2.5.1–v2.5.3) failed on Android Chromium WebView due to
  `mix-blend-mode` + pseudo-element rendering quirks; the JS-driven
  approach is reliable on every modern browser/WebView.

### Reverted (v2.5.4 — failed pre-flight items, not worth their cost)
- **`.quest-card` baseline resting shadow** — multiple iterations
  (`rgba(0,0,0,0.18)` → `0.45/0.30 layered` → `0.85/0.65 layered`) all
  either disappeared into the warm-dark themed parent panels (amber-900,
  indigo-900) or visually competed with the `shadow-xl` / `shadow-2xl`
  Tailwind utilities already paired with the class throughout the app.
  Letting Tailwind own each surface's resting shadow keeps the existing
  per-surface design intent intact. The `:hover` lift and `:active`
  press-shadow rules from v2.5 polish A still apply on top.
- **Analytics skeleton re-injection on view-enter** — the deferred-render
  flow (`_showAnalyticsSkeletons` + `_renderAnalyticsImpl` split, 200ms
  `setTimeout`) wasn't reading clearly on device and the artificial
  delay before chart paint wasn't earning its cost. The initial-HTML
  skeletons still serve their purpose on the very first page load
  (before `renderAnalytics()` ever runs), which is the only moment a
  user actually waits for analytics to appear.

---

## [2.4.10] — 2026-05-22 (Build 20)

> **Theme:** Polish & In-App Updates. Real-world refinements after v2.4.9's
> animation system reached the Play Store, plus infrastructure to make every
> future release land automatically.

### Added
- **Companion level-up celebration banner** — 2.8s banner ("*<Companion> reached Lv <N>!*")
  on top of the existing bounce/sparkle/floating text. The float-up alone was too
  brief to read on mobile.
- **Flying gold sprite** — `effectsManager.goldEarned()` mirrors `crystalEarned`,
  flying a `⚜` sprite from screen-center to the avatar badge. Auto-triggers from
  `addGold()` for non-routine sources (focus session bonuses, chest loot, boss
  rewards). Daily/habit/weekly/monthly gold still uses the existing card float-up.
- **Google Play in-app updates** — `@capawesome/capacitor-app-update@^8.0.3` wired
  to Play Core's *flexible* flow. On native launch + foreground (24h throttled),
  the app asks Play whether an update is available, downloads it in the
  background, and surfaces a non-blocking toast ("*✨ Update downloaded — restart
  to install*"). Falls back to `performImmediateUpdate()` for rare
  developer-mandated updates.
- **Animated theme WebM backgrounds** — Forest, Desert, Ice, Volcanic, Mystic,
  Golden, and Shadow themes now use hardware-decoded WebM video. ~93% smaller
  than the previous GIFs (~190 MB → ~7 MB across all 7 themes), smoother
  playback, lower battery draw. GIFs retained as runtime fallback for any device
  where WebM decode fails.

### Changed
- **Flying reward sprite duration** — `flyingReward` arc length 700ms → 1300ms
  with a hold-and-shrink scale curve. Reads as a deliberate "dropping into your
  inventory" instead of a quick flash.
- **Crystal sprite retargeted** — flies to the always-visible top-right avatar
  badge (`#player-panel-toggle`) instead of the in-panel `#focus-crystals`
  element, which was hidden whenever the character sheet was closed (almost
  always). The previous target had no rendered position, contributing to the
  "wrong place" feel.

### Fixed
- **Login bonus modal vs. flying gold collision** — `addGold('login', …)` was
  triggering the new gold flying sprite at the same moment the login streak modal
  opened, which already showed the gold reward prominently. Wrapped login
  rewards in `_suppressRewardToasts` so the sprite is skipped and the modal
  carries the full visual.
- **Stale "v1.0.0" footer in Settings** — bumped to "v2.4.10".
- **Stale `version` field in data exports** — backup JSON now stamps "2.4.10".

### Security
- **Challenge-acceptance XSS hardened** — `showAcceptChallengeModal` now
  defensively escapes/decodes challenge titles coming from URL parameters
  before rendering. Defense-in-depth; no known exploit shipped. Full audit in
  `SECURITY_AUDIT_v2.4.10.md`.

### Internal
- **Service worker** bumped to `life-quest-journal-v403` cache name and
  configured to bypass cache for video media so HTTP Range requests reach the
  network/asset-loader directly (otherwise Android WebView's `<video>` silently
  failed on cached responses).
- **Diagnostic logging** added to `updateThemeVideoBackground()` during the
  WebM rollout, then stripped after confirmation. A single `console.warn` is
  retained inside the fallback path for future device-specific failure reports.
- **docs/HISTORY.md \u00A7 1.6** tracks the eventual GIF removal (deferred 1–2 releases for
  safety telemetry).

---

[Unreleased]: https://github.com/bladelord54/Quest-Journal/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/bladelord54/Quest-Journal/releases/tag/v2.5.0
[2.4.10]: https://github.com/bladelord54/Quest-Journal/releases/tag/v2.4.10
