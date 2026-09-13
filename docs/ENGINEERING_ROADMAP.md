# Engineering Roadmap

> Codebase-health priorities from the July 2026 senior-dev review. This is the
> ENGINEERING counterpart to the product `ROADMAP.md` at the repo root — items
> here make the app *safer to change*, not bigger.
>
> Status: ✅ done · 🔄 in progress · ⬜ not started

## 1. ✅ Split `goal-manager.js` incrementally (July–Sep 2026)

**Problem:** ~22.5k lines at the outset, one God class holding game rules,
rendering, persistence, audio and analytics. Duplicated knowledge drifts — the July 2026
loot bug (three spells missing from chests/bosses) was caused by two
hand-maintained copies of the loot spell list, and the fix uncovered twin
copies of the pool-builder block too.

**Approach:** extract ONE cohesive ES module at a time (`loot.js`, `spells.js`,
`classes.js`, `bosses.js`, `persistence.js`), leaning on the jest suite as the
safety net. Never a big-bang rewrite.

**Definition of done (added Sep 2026 — this item previously had no finish line):** #1 is complete when
ALL of the following hold; each is checkable, and the last one is what unblocks #3.

1. ✅ **Every game RULE lives in a unit-tested module.** *(Closed Sep 9, 2026 by the audit queue, slices
   86–90.)* `goal-manager.js` keeps only orchestration:
   DOM writes, event wiring, timers, audio/effects, toasts, modals, `saveData`/`render` sequencing.
   Test: no method on the class contains a branch whose outcome is a reward amount, threshold,
   schedule, eligibility or state transition — those are delegated calls.
2. ✅ **No duplicated knowledge across files.** *(Closed Sep 9, 2026 by the five single-source items.)*
   Every table of defaults/thresholds/ids has ONE source with a parity test where a second consumer
   exists (save↔load, init↔load, badge/title catalogs, quest gates↔unlock ladder, theme gates↔catalog).
3. **The extracted modules are real ES modules** — `import`/`export` and `<script type="module">`,
   replacing the `window.X` + `module.exports` shims, the module-scoped capture consts, and the
   hand-maintained load order in `index.html` / `scripts/copy-web.js`. Not a framework; not a
   TypeScript conversion.
4. **`goal-manager.js` itself passes `// @ts-check`** once (3) makes its imports typed.

Line count is a *consequence*, not a criterion — bulk that is genuinely orchestration may stay, or be
moved to prototype-mixin files without pretending it is pure. Slices that only relocate lines without
satisfying (1) or (2) are not progress against this item.

**Progress (status page):** **90 slices → 68 modules** (13 data · 33 logic · 22 render).
`goal-manager.js` is **~19.5k lines**, down from ~22.5k at the outset (24.5k peak) — roughly 6k lines
now live in pure, tested siblings. Render burn-down **complete**; the Sep 7 criterion (1)/(2) audit queue
is **complete** (slices 86–90 + the five single-source items); criterion (3) — the ES-module conversion —
and criterion (4) — `// @ts-check` on `goal-manager.js` — landed Sep 9–12, 2026 (steps under item #3), so
**all four Definition-of-done criteria are ✅**. Suite: **1686/1686 jest + `npm run typecheck` clean
(0 errors)**. Every module follows one wiring recipe: `// @ts-check`, `export default X`, imported
directly by `goal-manager.js` (no `{}` fallbacks), copied by `scripts/copy-web.js`, imported in the jest
harness. Android `cap:build` device check passed Sep 12, 2026 — no open items under #3. Current tally,
then the archive.

**Data catalogs (13)** — deep-frozen literals the God class used to inline.

| Module | Owns |
|---|---|
| `level-titles.js` | the 100-string player level-title chain |
| `companion-definitions.js` | the 14-entry companion catalog |
| `spell-definitions.js` | the 23-entry spellbook catalog |
| `theme-definitions.js` | the 14-entry color-palette theme catalog (free/premium split, rotation) |
| `achievement-definitions.js` | the 16-entry badge catalog (ordered list; `checkBadges` derives from it) |
| `boss-themes.js` | 36 daily/weekly/monthly boss themes |
| `class-definitions.js` | raw class/subclass skill-tree data (costs still injected from `balance.js`) |
| `enchantment-definitions.js` | the 13-entry enchantment shop catalog |
| `starter-task-presets.js` | onboarding starter-task seed catalog |
| `quest-chain-templates.js` | the 5 multi-chapter quest chains (biggest single lift) |
| `loot-pool.js` | the rarity-keyed master loot table |
| `title-definitions.js` | the achievement-title catalog + `computeUnlockableTitles` (de-dup of `checkTitleUnlocks`) |
| `daily-quest-definitions.js` | the 20-quest Daily Board pool (gates DEFINED as `FEATURE_UNLOCKS` levels) + `BOARD_SWEEP_BONUS` |

**Logic modules (33)** — pure, unit-tested rules; the class keeps only side-effects.

| Slice | Module | Owns |
|---|---|---|
| — | `loot-engine.js` | weighted pick, `buildLootReward`, `rollLootTable` (de-duped chest/boss roll) |
| — | `boss-generator.js` | date-seed hash + `buildBoss` spawn/scaling engine |
| — | `persistence-migrations.js` | legacy-save normalizers + save-side list pruning |
| 56 | `streak-logic.js` | daily-LOGIN streak classification, login rewards, streak-repair math |
| 57 | `leveling-logic.js` | XP curve, cumulative XP, level-progress band |
| 58 | `effort-xp-logic.js` | priority → XP multiplier scaling |
| 59 | `buff-multipliers.js` | active spell/enchantment reward multipliers |
| 60 | `companion-logic.js` | companion slot + bonus resolution |
| 61 | `class-perks.js` | class/subclass perk-value resolution |
| 62 | `class-progression.js` | skill-tree progression-state predicates |
| 63 | `skill-points.js` | skill-point economy |
| 64 | `crystal-economy.js` | Focus Crystal supply math |
| 65 | `charge-rules.js` | attack-charge earn/spend rules |
| 66 | `combat-damage.js` | boss-damage pipeline |
| 67 | `reward-economy.js` | `addXP`/`addGold` reward-stack math |
| 68 | `focus-session-logic.js` | focus-timer + Pomodoro-chain mechanics |
| 69 | `spell-lifecycle.js` | active-spell lifecycle |
| 70–71 | `period-summary-logic.js` | previous-period recap math + period-transition detection |
| 72 | `reminder-schedule-logic.js` | reminder slot scheduling, catch-up window, streak-risk/bounty timers |
| 73 | `enchantment-lifecycle.js` | active-enchantment state math (spell/enchantment asymmetry made explicit) |
| 74 | `bounty-logic.js` | Royal Bounty level gate, period windows, eligibility, seeded pick |
| 75 | `recurring-logic.js` | one day vocabulary, four-branch `dueToday`, pre-schedule guards |
| 76 | `save-serializer.js` | `buildSaveData` — the 90-field `_doSave` object |
| 77–78 | `load-deserializer.js` | `buildLoadState` — the ~150-field `loadData` map; 78 = save↔load round-trip parity suite |
| 79 | *(in `title-definitions.js`)* | `computeUnlockableTitles` — title de-drift twin of the badge fix |
| 80 | `daily-quest-logic.js` | date-seeded daily board pick + `check(tracking)` sweep |
| 81 | `wooden-chest-loot.js` | free Wooden Chest weighted table + pick (second weighted-pick copy killed) |
| 82 | `quest-chain-logic.js` | quest-chain task toggle, chapter/chain completion, active→completed move |
| 83 | `habit-logic.js` | HABIT streak walk, `double_streak` increment, 7/30/100 milestone tiers |
| 84 | `default-state.js` | the ONE persisted-field defaults table; `initState` and `buildLoadState` both consume it (init↔load parity) |
| 85 | `feature-unlocks.js` | nav/arcane unlock tables, companion unlock level (was a bare `3` ×3 incl. `loot-engine.js`), level-keyed tutorials, `isUnlocked`/`isFarOff`; follow-up added the referral/review growth gates |
| 86 | `chest-weight-logic.js` | chest rarity-weight modifiers: `shiftWeights` (the Lucky Loot / Ranger block that was written twice), `luckyDrawFloor`, `applyChestModifiers` composite |
| 87 | `boss-streak-logic.js` | boss-defeat streak reward multiplier: `streakForBossType` cadence pick, `streakMultiplier` (+10%/streak, capped +100%), `applyStreakBonus`, `archiveDefeated` (50-cap) |
| 88 | *(in `companion-logic.js`)* | `companionXpGain` (Bonding ×2 → Beastmaster ceil) + `applyCompanionXp` (the `100 * level` multi-level-up walk) |
| 89 | `challenge-logic.js` | Challenge-a-Friend `PRESETS` + difficulty→{xp,gold} `REWARDS`, `challengeProgress` (100 clamp), `archiveCompleted` (50-cap) |
| 90 | *(in `reward-economy.js`)* | `forageReward(chance, rng)` — Ranger Forage hit-roll + 10–20 bonus gold + 1 crystal |

**Render modules (22)** — pure `input → HTML-string` builders; container/orchestrator methods stay on the class.

| Module | Surface |
|---|---|
| `boss-render.js` | HP bar, boss card, defeated gallery, battle log, monthly panels (5 slices) |
| `task-render.js` | checklist leaf, `priorityBadgeHTML`, all six task/goal cards |
| `companion-render.js` | whole Companion Den |
| `spell-render.js` | whole Spellbook |
| `class-render.js` | whole Class panel (selection, skill-tree rows, capstones, subclass track) |
| `analytics-render.js` | whole Analytics dashboard |
| `quest-chain-render.js` | whole Quest Chains tab |
| `enchantment-render.js` | whole Enchantments view |
| `dashboard-render.js` | four standalone Dashboard cards |
| `player-hud-render.js` | Player HUD (buffs bar, sigil orbit, portrait, compact row) |
| `title-render.js` | whole Title Hall |
| `reward-render.js` | Treasury tab (daily chest + four purchasable tiles) |
| `theme-render.js` | both Themes surfaces |
| `badge-render.js` | Badges/Achievements panel |
| `habit-render.js` | populated Rituals tab |
| `archive-render.js` | populated Archive |
| `daily-board-render.js` | both Daily-board surfaces |
| `recurring-render.js` | populated Recurring-tasks panel |
| `calendar-render.js` | Calendar day cells + selected-date list |
| `focus-timer-render.js` | Focus-timer controls + Pomodoro progress |
| `premium-render.js` | Premium card + shared upsell banner |
| `reminder-render.js` | Reminder settings (the last tab-render surface) |

### Slice log — archive (slices 1–85)

The full slice-by-slice narrative, kept for the design reasoning each extraction recorded
(what was de-duplicated, what was proven byte-faithful, which tests lock it). Collapsed
because it is history, not status.

<details>
<summary>Expand the slices 1–85 narrative</summary>

**Original running narrative:** ninety slices across sixty-seven modules — twelve are deep-frozen dual-env data
modules, thirty-three (`loot-engine.js`, `boss-generator.js`, `persistence-migrations.js`, `streak-logic.js`,
`leveling-logic.js`, `effort-xp-logic.js`, `buff-multipliers.js`, `companion-logic.js`, `class-perks.js`,
`class-progression.js`, `skill-points.js`, `crystal-economy.js`, `charge-rules.js`, `combat-damage.js`,
`reward-economy.js`, `focus-session-logic.js`, `spell-lifecycle.js`, `period-summary-logic.js`,
`reminder-schedule-logic.js`, `enchantment-lifecycle.js`, `bounty-logic.js`, `recurring-logic.js`,
`save-serializer.js`, `load-deserializer.js`, `daily-quest-logic.js`, `wooden-chest-loot.js`,
`quest-chain-logic.js`, `habit-logic.js`, `default-state.js`, `feature-unlocks.js`, `chest-weight-logic.js`,
`boss-streak-logic.js`, `challenge-logic.js`) are LOGIC modules
(`persistence-migrations.js` covers BOTH load-side normalizers AND the save-side list pruning;
`streak-logic.js` + `leveling-logic.js` + `effort-xp-logic.js` + `buff-multipliers.js` + `companion-logic.js`
+ `class-perks.js` + `class-progression.js` + `skill-points.js` + `crystal-economy.js` + `charge-rules.js` +
`combat-damage.js` + `reward-economy.js` + `focus-session-logic.js` + `spell-lifecycle.js` +
`period-summary-logic.js` + `reminder-schedule-logic.js` + `enchantment-lifecycle.js` +
`bounty-logic.js` + `recurring-logic.js` + `save-serializer.js` + `load-deserializer.js` +
`daily-quest-logic.js` + `wooden-chest-loot.js` + `quest-chain-logic.js` + `habit-logic.js` are the
TWENTY-FIVE
logic slices AFTER the render burn-down closed — daily-login-streak + streak-repair math, the XP curve +
level-progress band math, the
effort-based-XP priority scaling, the active-buff (spell + enchantment) reward multipliers, the companion slot
+ bonus resolution, then the CLASS-TREE TRIO (the class/subclass perk-value resolution, the tree
progression-state predicates, and the skill-point economy), then the BOSS-BATTLE TRIO (the Focus Crystal
supply math, the attack-charge earn/spend rules, and the boss-damage pipeline those charges pay for), then
the addXP/addGold reward-stack math every reward in the game routes through, the focus-timer +
Pomodoro-chain mechanics, the active-spell lifecycle, then BOTH halves of period tracking —
the previous-period recap math and, in a 71st slice on the same module, the transition DETECTION that
decides whether that recap is shown at all, then — in a 72nd slice — the reminder clock math in
`reminder-schedule-logic.js`: the daily morning/evening slot scheduling, the missed-reminder catch-up
window, and the streak-risk + bounty-ready timers that six thin delegators now consume, then the 73rd's
active-enchantment state math in `enchantment-lifecycle.js` — `spell-lifecycle.js`'s sibling, and the slice
that makes the spell/enchantment ASYMMETRY explicit — then the 74th's Royal Bounty rules in
`bounty-logic.js`: the level gate, the period keys/windows, the anti-stage eligibility rule and the seeded
weekly/monthly pick — and finally the 75th's recurring-task scheduling rules in `recurring-logic.js`: the
ONE day vocabulary behind four separate hand-written copies, the four-branch `dueToday` predicate
(weekly/biweekly/monthly-date/monthly-weekday) and the three pre-schedule guards — and finally the
76th's save-data builder in `save-serializer.js`: the 90-field `_doSave` object literal, its two `||`-fallen
date-stamp defaults, and the `premiumPurchaseToken || null` fallback, now a pure
`buildSaveData(manager, { todayString, currentWeekString })` that `_doSave` calls — and finally the 77th's
MIRROR of it, `load-deserializer.js`: the ~150-assignment `loadData` field map, where every DEFAULT lives,
now a pure `buildLoadState(data, { todayString, classSchemaVersion, defaultSessionMinutes, normalizeClassId })`
that `loadData` Object.assigns, closing the persistence field map from both ends — and finally the 80th's
Daily Quest Board rules in `daily-quest-logic.js`: the date-seeded deterministic board pick and the
`check(tracking)` completion sweep, closing the daily-board pair whose render half went out in the 50th slice,
and finally the 81st's daily free Wooden Chest loot in `wooden-chest-loot.js`: the frozen 8-entry weighted
table + the `weightedPick(table, rng)` loop — the SECOND hand-rolled cumulative-weight pick in the codebase,
de-duplicated from `loot-engine.js`'s (their float-drift fallbacks — first-entry vs last-entry — differ ON
PURPOSE and a test pins the disagreement), and finally the 82nd's quest-chain progression state math in
`quest-chain-logic.js` — `quest-chain-render.js`'s SIBLING: the task-toggle array math, the chapter-complete
predicate, the chapter-advance patch, the chain-complete detection and the active→completed list move that
the three progression methods delegate to, and finally the 83rd's habit progression math in `habit-logic.js`
— `habit-render.js`'s LOGIC SIBLING and the HABIT-streak counterpart to `streak-logic.js`'s LOGIN streak: the
consecutive-day `computeHabitStreak` walk behind `recalculateHabitStreak`, the `double_streak` increment rule
and the 7/30/100 milestone thresholds `toggleHabit` uses),
and TWENTY-TWO (`boss-render.js`, `task-render.js`, `companion-render.js`,
`spell-render.js`, `class-render.js`, `analytics-render.js`, `quest-chain-render.js`, `enchantment-render.js`,
`dashboard-render.js`, `player-hud-render.js`, `title-render.js`, `reward-render.js`, `theme-render.js`,
`badge-render.js`, `habit-render.js`, `archive-render.js`, `daily-board-render.js`, `recurring-render.js`,
`calendar-render.js`, `focus-timer-render.js`, `premium-render.js`, `reminder-render.js`) are
RENDER modules (`boss-render.js` holds five slices: the HP-bar helpers, the boss-card builder, the
defeated-bosses gallery, the battle-log rows, and the two monthly-boss panels; `task-render.js`
holds the per-task checklist leaf, the shared `priorityBadgeHTML` helper, plus ALL SIX task/goal
cards — side-quest, daily-task, weekly-, life-, yearly-, and monthly-goal; `companion-render.js`
covers the WHOLE Companion Den — the collection card plus the active-companion display and the
undiscovered grid; `spell-render.js` covers the WHOLE Spellbook — the active-spell card, the two
section headers, and the free + premium collection cards; `class-render.js` covers the WHOLE Class
panel — the class-selection cards, the shared skill-tree node row (reused by the subclass tiers), the
capstone cards, the subclass track, and the active-class shell; `analytics-render.js` covers the WHOLE
Analytics dashboard — the task-breakdown bars, the 12-week activity heatmap, the 30-day XP timeline,
the weekday productivity pattern, the personal-records grid, and the goals-progress overview;
`quest-chain-render.js` covers the WHOLE Quest Chains tab — the active-saga cards, the available-chain
catalog, and the completed-chain trophies; `enchantment-render.js` covers the WHOLE Enchantments view —
the active-enchantment countdown cards and the free/premium shop grid; `dashboard-render.js` covers the
FOUR standalone Dashboard cards — the Double-XP-Weekend banner, the weekly/monthly Royal Bounty pair, the
broken-streak repair card, and the Theme-of-the-Week discovery card; `player-hud-render.js` covers the Player HUD
— the arcane-tab active-buffs bar, the avatar sigil-orbit bubbles (a "+N" overflow bubble past 7), the
character-sheet companion portrait, and the compact panel active-buffs row; `title-render.js` covers the WHOLE
Title Hall — the equipped-title card (or the "No Title Equipped" empty-state) plus the collection body (a progress
summary + one collapsible section per achievement-title category, and the auto-earned Level Ranks chain);
`reward-render.js` covers the Treasury tab — the free Daily Wooden Chest card plus the four purchasable
bronze/silver/gold/royal tiles (rarity-frame chrome, affordability gating, per-type open counts); `theme-render.js`
covers BOTH Themes surfaces — the full "Theme of the Week" tile grid and the compact Tools-tab gradient-chip
selector; `badge-render.js` covers the Badges/Achievements panel — an Unlocked section plus an In-Progress section
(locked achievements sorted closest-to-completion with stepped progress bars), or its empty state; `habit-render.js`
covers the populated Rituals tab — the per-habit ritual cards (checkbox, escaped title, streak badge, description,
total-completions, edit/delete, and the completion heatmap); `archive-render.js` covers the populated Archive —
the archived goals sorted newest-first into type-colored cards, each with an optional "Completed" flag, escaped
title/description, the archived date, and restore/delete buttons; `daily-board-render.js` covers BOTH
Daily-board surfaces — the daily-quest-board body (a row per rolled quest with its pool icon/name/description and a
Claim button or CLAIMED / "N XP" state, plus the "Board Swept!" vs "N/3 complete" sweep footer) and the free daily
Wooden Chest's claimable-vs-claimed card; `recurring-render.js` covers the populated Recurring-tasks panel — one
row per recurring task (a toggle, the escaped title, a human schedule line derived from its recurrence, and a delete
button); and `calendar-render.js` covers the Calendar tab — each month-grid day cell's inner content (the day number
plus a completed/total ⚔️ badge when the day has tasks) and the selected-date quest list (a card per task with its
toggle/escaped title/delete, plus an "Add Another Quest" footer); `focus-timer-render.js` covers the Focus-timer
controls — the four-state `#focus-timer-controls` button set (idle Start + Start-Chain, running Pause + Stop, paused
Resume + Stop, and the break-only Stop) plus the Pomodoro-chain progress dots + "⚔️ Session N" / "☕ Break" status
line; `premium-render.js` covers the Premium surface — the `#premium-content` card (the premium thank-you view vs
the free upgrade prompt) and the shared upsell banner behind its five call sites; and `reminder-render.js` covers the
Reminders surface (`renderReminderSettings` — the LAST tab-render surface): the `#reminder-settings-container` body — a
master Enable-Reminders toggle, then either the morning/evening/overdue/streak/bounty rows (each a `reminder.toggle`
switch; the four timed ones carry an inline-onchange `<input type=time>`) or a "configure times" hint, and the
notification-status footer (an Enabled/Blocked/Not-Enabled/Not-Supported label, a native-only delivery row, and the
enable/guide/test button)) — all mirroring
`balance.js`'s wiring (browser `<script>`
before `goal-manager.js` + `module.exports` for jest; wired into `index.html`,
`scripts/copy-web.js`, and the jest harness):

- `level-titles.js` — the player level-title chain (100 strings). `goal-manager.js`
  captures it into a `LEVEL_TITLE_CHAINS` const and assigns `this.LEVEL_TITLES`.
- `companion-definitions.js` — the 14-entry companion catalog. Captured into a
  `COMPANION_DEFINITIONS` const; `getCompanionDefinitions()` now returns that
  const, so every call site is unchanged.
- `spell-definitions.js` — the 23-entry spellbook catalog. Captured into a
  `SPELL_DEFINITIONS` const; `initializeSpells()` now returns that const, so
  `this.spellDefinitions` and every call site is unchanged.
- `theme-definitions.js` — the 14-entry color-palette theme catalog. Unlike the
  three above (method returns), this was a `themeDefinitions = {…}` CLASS-FIELD
  initializer, so the swap anchors on the field, not a `return`; captured into a
  `THEME_DEFINITIONS` const and assigned `themeDefinitions = THEME_DEFINITIONS;`.
  Its design narrative (Proposal B free/premium split, rotation indices) moved
  into the module header.
- `achievement-definitions.js` — the 16-entry badge catalog (a LIST, not a keyed
  map). Captured into an `ACHIEVEMENT_DEFINITIONS` const (empty-array fallback);
  `getAchievementDefinitions()` now returns it. Its only consumer, `renderBadges()`,
  reads via filtered copies, so the freeze needed no test changes.
- `boss-themes.js` — the boss theme catalog: a keyed object `{ daily: 14, weekly: 10,
  monthly: 12 }` = 36 `{name, icon, flavor, particleType}` themes. Captured into a
  `BOSS_THEMES` const (empty-object fallback); `initializeBossThemes()` returns it, so
  `this.bossThemes` is unchanged. The generators (`generateDaily/Weekly/MonthlyBoss`)
  and `getBossParticleType()` only index/spread it (read-only), so the freeze needed
  no test changes; the `particleType` palette legend moved to the module header.
- `class-definitions.js` — the class/subclass skill-tree catalog, and the FIRST
  non-pure-literal slice: the tree is DATA + COMPUTATION. The module holds only the
  RAW data (4 classes × {metadata, 5 `nodes`, 2 `capstones`, 2 subclasses × 3 tiers});
  `initializeClasses()` KEEPS the `BALANCE.classTree`-driven builders that inject each
  node's `tier`/`cost` (+ the capstone flag), now mapping them over the const. Costs
  stay dynamic, so they never drift from the balance table. Because this reshapes data
  (not a byte-swap), it was proven safe by a baseline-output comparison (dump
  `initializeClasses()` before, assert `toEqual` after) + a new subclass-structure test.
- `enchantment-definitions.js` — the 13-entry enchantment shop catalog (temporary
  Focus-Crystal buffs), each `{ id, name, description, icon, cost, duration, effect,
  premium }`. Captured into an `ENCHANTMENT_DEFINITIONS` const (empty-object fallback);
  `initializeEnchantments()` returns it, so `this.enchantmentDefinitions` is unchanged.
  `purchaseEnchantment()` spreads a def into a fresh `activeEnchantments` entry and
  every other consumer only reads / `Object.values`-copies it, so the freeze needed no
  test changes — a clean pure-literal lift, back to the slices 1–6 pattern after the
  class detour.
- `starter-task-presets.js` — the onboarding starter-task catalog: a keyed object
  `{ daily, weekly, monthly, yearly, 'life-goals' }` of `{ name, icon, category }`
  seed tasks the Starter Tasks modal offers. Unlike the others this was a class FIELD
  (`starterTaskPresets = {…}`), not a method, so the swap assigns the captured
  `STARTER_TASK_PRESETS` const to the field (all instances now share one frozen copy
  instead of a fresh per-instance object — behaviourally identical since it is
  read-only). `addSelectedStarterTasks()` / the quick-start packs build BRAND-NEW task
  objects from a preset (`preset.name` -> the task's `title`) and the modal renderer
  only `.map()`s each bucket, so the freeze needed no test changes.
- `quest-chain-templates.js` — the 5 multi-chapter quest chains (learn_web_dev,
  fitness_journey, business_builder, creative_writer, language_master), each with
  nested `chapters:[{ id, title, description, tasks:[…], reward:{xp,gold,spell,charges} }]`.
  The biggest slice yet (~14.8k chars out of the God class). Captured into a
  `QUEST_CHAIN_TEMPLATES` const; `initializeQuestChainTemplates()` returns it. This was
  the DEFERRED candidate: `startQuestChain()` stores a LIVE reference to the (now frozen)
  `template.chapters` on each active chain (`chapters: template.chapters`). An exhaustive
  audit confirmed every consumer only READS that array — progression mutates only
  chain-owned fields (`completedTasks`, `currentChapterIndex`, `completedAt`) + the
  `active/completedQuestChains` arrays, and load rehydrates chapters from JSON — so the
  freeze is behaviour-preserving with NO defensive copy. Chains had ZERO test coverage,
  so 4 new regression tests now lock the invariant (start shares the frozen array;
  toggle→completeChapter advances without mutating it; final chapter moves the chain to
  completed; catalog data-integrity).
- `loot-engine.js` — **the first LOGIC slice**, not a data catalog. Three PURE functions
  the loot system delegates to: `weightedRandomSelect(items, rng)`, `buildLootReward(item,
  rarity, ctx)`, and `rollLootTable(ctx)`. The roll loop was hand-DUPLICATED in
  `generateChestRewards()` and `generateBossLoot()` — the exact drift risk this roadmap
  exists to kill — so centralising it is the real win. The seam: instance state is
  INJECTED (`rng: () => this.rng()`, `level`, `companionLockedGold`), and `rollLootTable`
  takes the manager's `weightedRandomSelect`/`buildLootReward` as params rather than the
  module's own copies, so (a) the #4 RNG seam still flows through `this.rng()` and (b) the
  `lucky_loot` test that spies on `gm.weightedRandomSelect` still observes every draw. The
  God-class methods became thin delegators, so ALL existing loot tests (deterministic
  select, min/max reward, companion fallback, lucky_loot weight shift, Trophy Hunter)
  passed UNCHANGED; 6 new tests lock the module in isolation. Its data companion
  (`getMasterLootPool()`) was extracted next — see below.
- `loot-pool.js` — the master loot pool: the base rarity-keyed loot table
  (`common`/`uncommon`/`rare`/`epic`/`legendary`, each a list of weighted
  `{ type, weight, … }` entries) that `getMasterLootPool()` returns. Pure DATA, so a
  straight literal-lift + deep-freeze; `buildAvailableLootPools()` only spreads/filters
  it (never mutates), so sharing one frozen instance is behaviour-identical. This is the
  EXACT catalog behind the July 2026 loot drift bug (two hand-maintained spell lists
  had drifted, hiding scholars_charm / merchants_fortune), so the 4 new tests do more
  than shape-check: one cross-checks EVERY spell entry against `spell-definitions.js`
  (must resolve + be non-wizard-exclusive), turning the single source of truth into an
  enforced invariant. Together with `loot-engine.js`, the loot area is now fully split
  out of the God class (data + logic).
- `boss-generator.js` — **the second LOGIC slice**: the pure boss spawn engine.
  `hashDateString(str)` (date→seed hash) + `buildBoss({ cadence, themes, seedKey, level })`,
  which picks a theme (`themes[hash(seedKey) % len]`) and scales HP/rewards by a per-cadence
  tuning table. The boss-object SHAPE was hand-copied across `generateDailyBoss` /
  `generateWeeklyBoss` / `challengeMonthlyBoss`, and — worse — the monthly HP/reward formula
  was ALSO re-derived inside `renderMonthlyBossChallenge` (the "here's what you'll face"
  preview), a live drift risk: the preview could lie if one copy changed. All four now flow
  through `buildBoss`. Side effects stay in the manager (assign `this.*Boss`, `addBossLog`,
  monthly `saveData`/`renderBossBattles`); the generators became theme-pool + seedKey
  adapters. `hashDateString()` became a thin delegator so its 4 callers stay unified. 9 new
  tests: `buildBoss` per cadence (theme pick + HP-on-raw-level + rewards-on-bossLevel +
  spawn stamp), `hashDateString` determinism, the previously-UNTESTED `generateWeeklyBoss`,
  and a render-preview drift lock (the preview's HP/XP/Gold must match the monthly tuning).
- `persistence-migrations.js` — **the third LOGIC slice**: the pure legacy-save
  normalizers `loadData()` delegates to. `loadData` is the riskiest method in the app (it
  rehydrates ~150 `this.*` fields), so this slice deliberately carved out ONLY the parts
  with real LOGIC — the migrations — and left every `this.x = data.x || default`
  field-mapping, the localStorage I/O, and the corrupted-save backup path untouched.
  Extracted (each pure, mutating the value it's HANDED, matching the original in-place
  behaviour): `migrateLegacySingleCompanion` / `migrateCompanionCollection`,
  `normalizeClassId` (mystic→wizard), `migrateTaskTitles`, `backfillDueDates(tasks, today)`
  (today INJECTED, not read from `this`), `normalizeGoalPriorities`. The prize: the
  companion name→type table was HAND-COPIED in loadData — a 4-entry subset for the legacy
  single-companion path and the full 12-entry table for the collection path — the same
  two-copies-of-one-map pattern that caused the July 2026 loot bug. It's now ONE frozen
  `COMPANION_NAME_TO_TYPE`; the single path upgrades 4→12 (a strict SUPERSET — the four
  original names are unchanged, it only ever infers BETTER for the near-nonexistent legacy
  save). loadData's existing integration tests + the Save/Load round-trip stayed green
  UNCHANGED (they exercise the delegating calls end-to-end); 9 new unit tests lock each
  normalizer, incl. companion + class-rename migrations that were previously UNTESTED.
- `boss-render.js` — **the first RENDER slice** (opening the roadmap's last + hardest
  surface). Rendering is mostly DOM-writing methods (querySelector + innerHTML side
  effects) that resist unit-testing, so the strategy is to start where it's SAFEST: the
  few render helpers that are already pure `input → HTML-string` (or a plain value) with
  zero DOM. Three qualified — `getBossPhase(currentHP, maxHP)` (HP ratio → phase
  color/label), `renderBossHPBar(boss, phaseColor)` (two-layer damage-trail markup), and
  `getBossParticleType(boss, bossThemes)` (defeat-dissolve palette; `bossThemes` INJECTED,
  the only `this` it had) — and, crucially, they already carried **19 tests**, so lifting
  them out behind thin delegators kept every caller (`renderBossCard`, `updateBossHPBar`,
  `onBossDefeated`) and all 19 tests green UNCHANGED, plus 5 new tests lock the module's
  exported surface. This proves the `renderX(state) → html` module pattern the bigger
  render methods will follow, and completes the boss cluster: `boss-themes.js` (catalog)
  → `boss-generator.js` (spawn logic) → `boss-render.js` (presentation).
- `renderBossCard(boss, type, deps)` — **the 16th slice**, added to `boss-render.js`: the
  full ~95-line active/defeated boss-card markup, and the first slice that BUILDS a large
  template rather than lifting a small helper. It already RETURNED the string
  `renderBossBattles` writes to the DOM, so it was a pure-ish builder; the coupling was
  injected via a `deps` object — instance state (`activeSpells`, `spellDefinitions`,
  `attackCharges`) + the time-dependent `bossResetLabel` fn (which STAYS on the class,
  wrapping `_bossResetLabel` so the reset-timer's time logic isn't dragged into a pure
  module) — while the two already-extracted helpers (`getBossPhase`, `renderBossHPBar`) are
  called in-module. The 3 `renderBossBattles` call sites are UNCHANGED (the delegator keeps
  the `(boss, type)` signature). `renderBossCard` had ZERO tests, so before swapping I
  proved the copy byte-faithful: a throwaway template-literal-aware scanner diffed the two
  templates and confirmed 4884 identical chars (after the known `this.*`→injected renames).
  That scanner earned its keep — my first naive extractor (`indexOf('return \`')`) grabbed
  the INNER `return \`<span>\`` from the spell-buff `.map()` callback, not the main return.
  7 new tests lock the builder (active/defeated variants, ATTACK enable/disable, EXECUTE
  gating, spell-buff list via injected defs, injected reset label) + the delegator wiring.
- `renderDefeatedBossesHTML(defeatedBossList, now)` — **the 17th slice**, added to
  `boss-render.js`: the victories gallery (empty-state prompt, or a summary banner + wins
  bucketed into This Week / This Month / Older collapsible sections). Unlike `renderBossCard`
  it OWNED both its inputs — the only coupling was `this.defeatedBossList` (passed in) and
  `new Date()` for the time-bucketing, INJECTED as `now` (exactly like `backfillDueDates`'s
  `today`), so bucketing is deterministic/testable. The thin wrapper keeps the DOM lookup +
  guard + single `container.innerHTML =` write; the builder returns the empty-state markup
  too, so the wrapper is branch-free. Single caller (`renderBossArena`) unchanged, and again
  NO prior tests — verified byte-faithful first: the method has no NESTED template literals,
  so a throwaway split-on-backtick diff confirmed all 5 templates identical (3786 chars,
  after `this.defeatedBossList`→param). One TS wrinkle: the module infers the empty
  `bosses: []` buckets as `never[]` (the class file didn't), so a one-line JSDoc cast keeps
  them `any[]` (runtime/output untouched). 5 new tests lock bucketing/totals/plurals, empty
  state, empty-section omission, per-boss fields + the delegator's DOM write.
- `renderBossLogHTML(bossLog, { getTimeAgo, sanitizeMessage, escapeHTML })` — **the 18th
  slice**, added to `boss-render.js`: the battle-log rows (empty-state prompt, else one row
  per entry = message + relative time). The interesting part was WHAT stayed behind: this
  method had THREE `this.*` calls at render time and all three are deliberately kept on the
  class and INJECTED — `getTimeAgo` (reads `Date.now()`), `escapeHTML` (util), and, most
  importantly, `_sanitizeBossLogMessage`, the v2.7 **security chokepoint** that lets legacy
  `<i class="ri-...">` icon chrome survive the `innerHTML` write while entity-escaping
  everything else. Moving a sanitizer into a pure render module would have been a real
  regression risk, so the builder just calls the injected fn — the chokepoint is untouched
  and its existing `_sanitizeBossLogMessage` tests still guard it. Two callers
  (`dealDamageToBoss`, `renderBossArena`) unchanged. No output tests existed, so byte-faithful
  first: the method has comment backticks (`` `<i ...>` ``, `` `_sanitizeBossLogMessage` ``)
  that break split-on-backtick, so the throwaway scanner anchored on `` return ` `` (past the
  comments) — row template identical (189 chars, after `this.escapeHTML`→param) + empty-state
  string identical (120). 5 new tests use tagging stubs to prove the row order, that the
  message routes through `sanitizeMessage` (not embedded raw), and that time is
  `getTimeAgo`→`escapeHTML`; a delegator test drives the REAL class fns end-to-end.
- `renderMonthlyBossChallengeHTML(preview)` + `renderMonthlyBossProgressHTML(kills, threshold)`
  — **the 19th slice**, added to `boss-render.js`: the two non-active states of the monthly-boss
  arena (the CHALLENGE prompt once the kill threshold is met, and the PROGRESS bar before it).
  This slice's lesson was a RETARGET: I set out to lift `renderBossBattles`, but reading it
  showed it (and `renderBossArena`) are pure ORCHESTRATORS — `generateBosses` + stat writes +
  delegating calls to the already-extracted card/log/gallery builders across two containers —
  with nothing pure left to lift. The actual remaining pure builders were these two monthly
  sub-panels. The challenge wrapper KEEPS its preview computation (seedKey from `new Date()` +
  `BOSS_GENERATOR.buildBoss(...)`, state `bossThemes.monthly`/`level`) so its existing no-drift
  test still guards the numbers, and only its `return <template>` became a delegate call; the
  progress panel is fully derived from (kills, threshold), so its whole body collapsed to a
  one-liner. Both templates reference ONLY locals (no `this.`), so byte-faithful was pure
  equality — no renames (challenge 2195 chars, progress 1066). `renderMonthlyBossProgress` had
  zero tests; the interpolation-aware scanner handled its NESTED `` `Defeat ${n} more boss…` ``
  template. 5 new tests lock the challenge's preview fields + the progress bar %, remaining
  count, singular/plural, and the ≥threshold clamp, plus the progress delegator.
- `getChecklistProgress(task)` + `renderChecklistHTML(task, taskType, { escapeHTML })` — **the
  20th slice**, and the FIRST cut of a SECOND render module, `task-render.js`. The boss render
  surface being done, this opens the home for the task/goal LIST renderers (daily / weekly /
  side-quest cards) that come next — and it starts with their shared LEAF, the per-task
  checklist, so those bigger builders can compose it as a tested pure fn (the same leaf-before-
  container order as cards→arena). `getChecklistProgress` (a pure fold over `task.checklist`,
  sole caller was the checklist builder) moved verbatim into the module; `renderChecklistHTML`
  has two branch templates (empty "add item" prompt + the populated list) and its ONLY coupling
  is `${this.escapeHTML(item.text)}` on the user-entered item text, INJECTED as `escapeHTML`.
  No prior tests, so byte-faithful first: the populated branch has NESTED templates (the item
  `.map` + the conditional progress bar), so the interpolation-aware scanner looped over both
  `` return ` `` templates — progress-fn body identical (384 chars), empty branch identical
  (444), populated identical (2140, after `this.escapeHTML`→param). New-module wiring mirrors
  `boss-render.js` exactly (`<script>` in `index.html`, `scripts/copy-web.js`, jest harness
  `require`). 9 new tests lock the fold (floor %, empty, all-done), both branches, the
  escapeHTML routing (XSS-safety), the progress-bar visibility window (only 0<done<total), and
  a delegator test driving the REAL `escapeHTML`.
- `pruneArchivedGoals(list, cap=500)` + `pruneBossLog(list, cap=200)` — **the 21st slice**,
  added to `persistence-migrations.js` (which now covers save-side too, not just load-side).
  This cleared the last small queued follow-up: `_doSave`'s inline list-capping (archived
  goals to the 500 most recent by date, boss log to the last 200) that kept localStorage from
  growing unbounded. Being LOGIC not a template, verification is BEHAVIORAL — the date-desc
  comparator (`archivedAt || archivedDate || ''`, returns 1/-1) was copied verbatim and the
  existing `archive prune keeps the 500 most recent` test still drives the whole thing through
  `_doSave` end-to-end. The helpers follow the module's mutate-what-you're-handed style but
  RETURN the (possibly new) array, and `_doSave` reassigns `this.archivedGoals`/`this.bossLog`;
  each returns the SAME reference unchanged when at/under the cap (a no-op assignment). 7 new
  unit tests lock the same-ref no-op, the date-desc top-N, the archivedAt→archivedDate→''
  precedence, the last-N boss-log window, and both default caps. (The block edit had to be an
  anchor-based script, not a string-replace: the original comparator line carried a trailing
  space.)
- `renderSideQuestCardHTML(quest, color, { escapeHTML, isBountyTarget })` — **the 22nd slice**,
  and the FIRST task/goal CARD in `task-render.js` (opening the big render surface, B1 of B).
  The side-quest card was the natural first cut: unlike the daily/weekly cards (whose templates
  are inlined inside their container renderers), it was ALREADY an isolated returns-string
  sub-builder (`renderSideQuestCard(quest, color)`), so lifting it mirrored the `renderBossCard`
  extraction exactly. Two INJECTED deps: `escapeHTML` (title + description) and `isBountyTarget`
  (the royal-bounty badge predicate — reads game state); the inline `ondrag*`/`onchange`
  handlers reference the global `goalManager` and stay as literal template text. The payoff of
  the leaf-first order: the card COMPOSES the module's own `renderChecklistHTML(quest,
  'sidequest', { escapeHTML })` directly — first module-internal composition, no `this.` bounce.
  No prior tests → byte-faithful first: nesting-aware scan (the description ternary is a nested
  template) proved the returned template IDENTICAL at 2902 chars modulo the renames
  (`this.escapeHTML`→`escapeHTML`, and the checklist call gaining `, { escapeHTML }`). Swap was
  again an anchor/brace-matched script (the `<input>` lines carry trailing spaces). One checkJs
  fix: typing `quest.priority` as `string` made `priorityIcons[...]` need a `Record<string,
  string>` annotation (the original `quest` was untyped `any`). 9 new tests: shell + escaped
  title + drag hooks, priority-icon map, description on/off, bounty badge on/off, the
  `isBountyTarget('sidequest', id)` query, completed strike/checkbox, checklist composition
  (empty + populated), title+description escape routing, and a delegator driving REAL
  `escapeHTML` + `isBountyTarget`.
- `renderDailyTaskCardHTML(task, { parentNames, isSelected, bulkSelectionMode, escapeHTML })` —
  **the 23rd slice** (B2), the daily-task card. First of the INLINED cards: its template lived
  inside `renderDailyTasks`'s `.map(task => { … })` callback, not a standalone method. The seam
  split the map callback in two — the pure card template moved to the module; the container
  query, empty-state, today-filter, and the per-task IMPURE reads stay on the class and are
  INJECTED: `parentNames` (`getParentNames` over `weeklyGoals`), `isSelected` (`selectedItems`
  membership), `bulkSelectionMode` (the class flag), and `escapeHTML` (×3 — title, description,
  parent chips). The pure `priority`/`priorityBadge` derivation moved INTO the builder; it
  composes `renderChecklistHTML(task, 'daily', { escapeHTML })`. Because the template was nested
  two levels deeper than a method body, its indentation is preserved byte-for-byte (deep base
  indent in the module) so output is unchanged — the nesting-aware scan (bulk-select ternary,
  parent-chip `.map`, description ternary are all nested templates) proved it IDENTICAL at 3920
  chars. The swap matched the map callback by its unique `}).join('');` tail (the inner
  parent-chip `.map(…).join('')` lacks the leading `}`/trailing `;`). 10 new tests: shell + drag
  hooks + controls, the 3-way priority badge incl. invalid→medium, description on/off, parent
  chips on/off, bulk-select box gated on `bulkSelectionMode`, `isSelected` ring + checked count,
  completed strike/box, checklist composition, triple escape routing, and a DOM delegator
  driving `renderDailyTasks` end-to-end with REAL `escapeHTML`.
- `renderWeeklyGoalCardHTML(goal, { linkedTasks, parentNames, isSelected, bulkSelectionMode,
  escapeHTML })` — **the 24th slice** (B3), the weekly-goal card, same inlined-`.map` shape as
  B2 but bigger (a progress bar + a linked-daily-tasks sub-list on top of the daily card's
  parts). Injected impure inputs: `linkedTasks` (daily tasks whose `weeklyGoalId(s)` include the
  goal — the filter STAYS in the wrapper), `parentNames` (over `monthlyGoals`), `isSelected`,
  `bulkSelectionMode`, `escapeHTML` (×4 — title, description, parent chips, linked-task titles);
  pure `priority`/`priorityBadge` stay in the builder; composes `renderChecklistHTML(goal,
  'weekly', { escapeHTML })`. **Dead-code find:** the method computed a `bountyBadge`
  (`this.isBountyTarget('weekly', goal.id) ? … : ''`) that was NEVER interpolated — a copy-paste
  leftover from the side-quest card. Dropped it (and its `isBountyTarget` call): the byte-faithful
  verify (nesting-aware; the card has bulk-select/parent/linked-tasks/description nested
  templates) proved the returned template IDENTICAL at 5364 chars WITHOUT it, so the rendered
  output is unchanged and the only removed behaviour is a no-op predicate call. Two verify/swap
  subtleties: the method's FIRST `return \`` is the *summary* card's day-row template, so the
  original template was anchored on `this.weeklyGoals.map(goal => {`; and the swap's
  `}).join('');` tail search starts AFTER that anchor (the summary card has its own `.join`). The
  "This Week's Scheduled Tasks" summary card (also inline in `renderWeeklyGoals`) is left for a
  small follow-up. 11 new tests incl. the progress-bar %/tally, linked-tasks list on/off, the
  quadruple escape routing, and a delegator that mocks `isBountyTarget`→true yet asserts NO
  "Royal Bounty" renders (locking the dead-code removal).
- `renderLifeGoalCardHTML(goal, { linkedYearly, escapeHTML })` — **the 25th slice** (B4a), the
  life-goal card and the first of B4 (the top-of-hierarchy goal cards). Simplest goal card yet:
  life goals sit at the top, so NO priority, bulk-select, parent chips, or checklist — just a
  completion box, an `h3` title + optional description, a created-date line, and then a BRANCH —
  EITHER a progress bar + linked yearly-campaigns list (when `linkedYearly` is non-empty) OR a
  "⚡ Legendary Quest" badge. Only `linkedYearly` (yearly goals whose `lifeGoalId(s)` include this
  goal — filter stays in the wrapper) and `escapeHTML` (×3 — title, description, yearly titles)
  are injected; `progress` (`linkedYearly.length > 0 ? goal.progress || 0 : 0`) is derived in the
  builder. The verify was nesting-aware over BOTH ternary branches (the linked-list branch has a
  nested `.map`, the else branch is the badge) — IDENTICAL at 4234 chars modulo
  `this.escapeHTML`→`escapeHTML`. 7 new tests: shell + `h3` + created line + controls, the
  Legendary-Quest/no-progress-bar branch (+ description absent), the linked-list branch
  (bar %, tally, escaped yearly titles, toggle), the `progress`-defaults-to-0 derivation,
  completed strike/box, triple escape routing, and a DOM delegator with REAL `escapeHTML`.
- `renderYearlyGoalCardHTML(goal, { linkedMonthly, parentNames, escapeHTML })` — **the 26th
  slice** (B4b), the yearly-goal (campaign) card. Mirrors the weekly card minus bulk-select (and
  has a "Campaign Progress" label BEFORE the bar): injected `linkedMonthly` (monthly goals whose
  `yearlyGoalId(s)` include the goal — filter stays in the wrapper), `parentNames` (over
  `lifeGoals`), and `escapeHTML` (×4 — title, description, parent chips, monthly titles); pure
  `priority`/`priorityBadge` stay in the builder; NO bulk/bounty/checklist. Byte-faithful verify
  IDENTICAL at 4891 chars modulo `this.escapeHTML`→`escapeHTML`. 9 new tests (shell/`h4`/toggle,
  3-way priority, Campaign-Progress line + bar %, linked-monthly list on/off with escaped titles
  + `(x%)`, description on/off, parent chips on/off, completed strike/box, quad escape routing,
  DOM delegator).
- `renderMonthlyGoalCardHTML(goal, { linkedWeekly, parentNames, isSelected, bulkSelectionMode,
  isBountyTarget, escapeHTML })` — **the 27th slice** (B4c), the monthly-goal (raid) card and the
  LAST of the six cards. The richest one: bulk-select + completion boxes, `h4` title +
  description, priority badge AND a royal-bounty badge in one row (`${priorityBadge}${bountyBadge}`),
  parent chips, progress bar + weekly tally, linked weekly-goals list, and add-weekly/connections
  + edit/delete. Injected `linkedWeekly` (filter stays in wrapper), `parentNames` (over
  `yearlyGoals`), `isSelected`, `bulkSelectionMode`, `isBountyTarget`, `escapeHTML` (×4); the pure
  `priority`/`priorityBadge` AND the `bountyBadge` (via injected `isBountyTarget`) are derived
  INSIDE. **Key contrast with the weekly card:** here `bountyBadge` IS interpolated, so
  `isBountyTarget` is a live injected dep (not dropped). Verify anchored on `this.monthlyGoals.map`
  (the summary card's week-group/day-row `return \`` come first) — IDENTICAL at 5320 chars modulo
  `this.escapeHTML`→`escapeHTML` + `this.bulkSelectionMode`→`bulkSelectionMode`. 11 new tests incl.
  the bounty badge gated on `isBountyTarget('monthly', id)` (spy asserts the exact query) and a DOM
  delegator that mocks `isBountyTarget`→true and asserts the badge DOES render (mirror-image of the
  weekly dead-code test).
- `priorityBadgeHTML(priority)` — **the 28th slice** (B6), the first pure DRY fold WITHIN
  `task-render.js` (not a lift from the God class). The daily/weekly/yearly/monthly cards had
  each inlined an IDENTICAL ~6-line block (validate `priority`→fallback `medium`, then a 3-way
  ternary emitting the 🔥/🪶/⭐ pill) — 4 hand-maintained copies of the same knowledge, the precise
  drift pattern that caused the July 2026 loot bug. Folded them into ONE exported helper; each
  builder is now just `const priorityBadge = priorityBadgeHTML(<task|goal>.priority)`. Safe by
  construction: the change is purely in the const FEEDING `${priorityBadge}` — the returned
  templates are untouched — so the four cards' existing byte-faithful shapes and their per-card
  priority tests (high/low/medium/invalid) stay green with no re-verification needed. 3 new tests:
  the three valid badges, the invalid/`undefined`/empty→Medium fallback, and a consistency test
  asserting all four cards literally `toContain(priorityBadgeHTML('high'))` (locks them to the
  single source). (`renderSideQuestCardHTML` is untouched — it uses a different `priorityIcons`
  map, not the badge.)
- `renderWeeklyScheduledTasksHTML(tasks, { todayStr, escapeHTML })` — **the 29th slice** (B5a),
  the first of the two "scheduled tasks" summary cards (a DIFFERENT shape from the per-item
  cards: an `html += \`…\`` block, not a `.map` callback). Lists this-week daily tasks not linked
  to a weekly goal, each with a weekday label + overdue highlight + toggle. The impure today probe
  (`this._cachedToday || this.getTodayDateString()`) is now computed ONCE in the wrapper and
  injected as `todayStr`; the day-row IIFE is preserved verbatim (its `const _todayStr = todayStr`
  just aliases the injected value) so the template is byte-identical. Verify anchored on the
  `html += \`` AFTER `renderWeeklyGoals() {` (that literal also appears in the monthly summary) —
  IDENTICAL at 2377 chars modulo `thisWeeksTasks`→`tasks`, the today-expr→`todayStr`, and
  `this.escapeHTML`→`escapeHTML`. Swap end found by a nesting-aware walk to the closing backtick +
  `;`. 4 new tests: shell + count + weekday + toggle, overdue vs future vs completed, escape
  routing, and a DOM delegator seeding a due-today task.
- `renderMonthlyScheduledTasksHTML(tasks, { todayStr, escapeHTML })` — **the 30th slice** (B5b),
  the LAST inline task/goal template. Same shape as the weekly summary but richer: it first folds
  the tasks into `weekGroups` (a by-calendar-week `forEach`, MOVED in from the wrapper) then
  renders one mini-panel per week (`Jan 4 Week`…), each with its day-rows. The `weekGroups` object
  needed a `/** @type {Record<string, Array<…>>} */` annotation to satisfy `task-render.js`'s
  `// @ts-check` (string-indexing an inferred `{}` errors under checkJs — goal-manager.js is not
  @ts-checked so it never flagged it). `todayStr` injected + day-row IIFE preserved as in B5a.
  Verify anchored on the `html += \`` AFTER `renderMonthlyGoals() {` — IDENTICAL at 2723 chars
  modulo `thisMonthsTasks`→`tasks`, today-expr→`todayStr`, `this.escapeHTML`→`escapeHTML` (the
  `weekGroups` grouping lives OUTSIDE the template so it's not part of the byte-diff). Swap span
  ran from `const weekGroups = {};` through the `html += \`…\`;` end. 4 new tests: week-grouping
  into labelled panels, overdue styling (past-incomplete only), escape routing, and a DOM
  delegator.
- `renderCompanionCollectionCardHTML(comp, { companionDefs, rarityColors, defaultColors,
  activeCompanionId, activeCompanionId2, twinBond, rarityNameplate })` — **the 31st slice**, and
  the FIRST cut of a THIRD render module, `companion-render.js`. It opens the Companion Den
  (`renderCompanionDen`) with its richest, most drift-prone piece: the per-companion COLLECTION
  CARD, which carries the Ranger Twin-Bond two-slot footer (Slot 1 / Slot 2 buttons vs. a single
  click-to-equip action), the `{bg,border,text}` rarity-colour derivation, and the catalog
  name/icon/description fallbacks. Injected deps: the frozen `companionDefs` catalog, the companion
  `rarityColors`/`defaultColors` map (kept in the wrapper because the active-companion display
  shares that copy), the `activeCompanionId`/`activeCompanionId2` slot ids, the `twinBond` perk
  flag, and `rarityNameplate` (`this._rarityNameplate` — a CROSS-CUTTING helper also used by the
  spellbook + loot preview, so injected, not moved). Unlike the six task/goal cards this was NOT a
  single `return \`…\`` template — the `comp => {…}` callback mixes const derivations with nested
  template literals (`cardOnclick`, the two-branch `footer`), so byte-faithfulness was proven by
  OUTPUT EQUALITY, not a template string-diff (see the lesson below): IDENTICAL across a 20-case
  matrix at 804 chars/card. The 2902-char arrow body then became a
  `.map(comp => COMPANION_RENDER.renderCompanionCollectionCardHTML(comp, {…}))` delegate; a zero-
  runtime `/** @type {string} */` cast on `rarityColors[comp.rarity]` keeps the module `@ts-check`-
  clean (goal-manager.js isn't checked so it never flagged it, cf. B5b's `weekGroups`). The three
  other den templates (empty state, active-companion display, undiscovered grid) followed in the
  32nd slice below. 7 new tests (762 total).
- `renderNoActiveCompanionHTML()` / `renderActiveCompanionHTML(activeCompanion, { rarityColors,
  defaultColors, companionDefs, rarityNameplate })` / `renderAllCompanionsDiscoveredHTML()` /
  `renderUndiscoveredCompanionsGridHTML(lockedCompanions, { rarityColors, defaultColors })` — **the
  32nd slice**, FINISHING `companion-render.js` and the whole Companion Den render surface. These are
  the four remaining `renderCompanionDen` templates: the active-companion panel's empty egg-card vs
  its equipped card (rarity colours, `_rarityNameplate`, ACTIVE badge, catalog icon/description
  fallbacks), and the undiscovered grid's all-discovered trophy vs the locked ??? mystery cards. The
  collection-grid empty state was NOT extracted — it already delegates to the class's shared
  `_renderEmptyState` helper. `renderCompanionDen` is now fully thin: gather data (active companion,
  sorted collection, `Object.entries` locked list) + inject deps (the shared `rarityColors` map stays
  in the wrapper; `_rarityNameplate` injected as before), delegate each section, write `innerHTML`.
  The wrapper swap was a CRLF one-shot Node script (single-line anchors + a between-anchors slice)
  since the byte-exact editor can't span goal-manager.js's `\r\n`. Byte-faithfulness was proven by a
  RUNTIME before/after snapshot (see the lesson below): a throwaway test drove the REAL
  `renderCompanionDen` across a 4-case matrix (none / one-active / catalog-fallback / all-discovered),
  dumped the three containers' `innerHTML` to a reference file pre-swap, and asserted IDENTICAL
  post-swap. 7 new unit tests lock the four builders (769 total).
- `renderActiveSpellCardHTML(spell, { timeDisplay, rarityNameplate })` / `renderFreeSpellsHeaderHTML(freeCount)`
  / `renderFreeSpellCardHTML(spell, { charges, isActive, rarityNameplate, overchargeButtonHTML })` /
  `renderPremiumSpellsHeaderHTML(premiumCount, bannerHTML)` / `renderPremiumSpellCardHTML(spell, { charges,
  isActive, isPremiumLocked, rarityNameplate, overchargeButtonHTML })` — **the 33rd slice**, a FOURTH render
  module `spell-render.js` covering the WHOLE Spellbook surface (which is split across TWO wrappers,
  `renderActiveSpells` + `renderSpellCollection`, both fed by `renderSpellbook`). Six pure builders: the
  active-spell buff-row card, the two section headers, and the free + premium collection cards (kept as TWO
  builders — the premium one adds an `opacity-60` lock tint, a lock icon by the nameplate, and a leading
  "Unlock Premium" action branch ahead of the shared active/cast/empty states). **DRY prize:** the spellbook's
  rarity→colour word map was TWO identical inline copies (one per wrapper, the 3rd + 4th copies overall); both
  collapsed into a single module-scoped `SPELL_RARITY_COLORS` const, each builder re-applying its historical
  fallback (`'purple'` for the active row, `'gray'` for the collection). Cross-cutting couplings INJECTED, not
  moved: `_rarityNameplate` (also used by companions + loot preview) and `_overchargeButtonHTML` (a Wizard-
  capstone perk probe that stays a tested class method); the premium upsell banner is passed pre-rendered
  (`getPremiumBannerHTML(...)`). The impure `timeDisplay` (a `Date.now()`-based "…remaining" string) stays
  computed in the wrapper and is passed in. Both wrappers are now thin: `renderActiveSpells` filters invalid
  spells + computes `timeDisplay` + `.map`-delegates; `renderSpellCollection` sorts/partitions free vs premium
  + `.map`-delegates each. The swap was a CRLF one-shot Node script (single-line + between-anchor slices; the
  free/premium `rarityColors` anchor needed a 2-line start because `renderCompanionDen` also has an 8-space
  `const rarityColors = {`). Byte-faithfulness proven by a RUNTIME before/after snapshot: a throwaway test
  drove the REAL `renderActiveSpells` + `renderSpellCollection` across a 3-case matrix (fresh / free-user with
  active+charged spells / premium-unlocked), with `Date.now()` mocked + `_overchargeButtonHTML` +
  `getPremiumBannerHTML` stubbed to fixed markers, dumped both containers' `innerHTML` pre-swap, and asserted
  IDENTICAL post-swap. 13 new unit tests lock the six builders per-branch (782 total).
- `renderClassSelectCardHTML(cls)` / `renderClassSelectPanelHTML(available, cardsHTML)` /
  `renderSkillNodeRowHTML(item, { isUnlocked, isNext, canAfford, color, unlockAction })` — **the 34th slice**,
  a FIRST cut of a FIFTH render module `class-render.js`, opening `renderClassPanel` — the LARGEST single panel
  (~240 lines, FIVE states: locked / class-select / linear tree / capstone / subclass). This slice takes the
  two "entry" experiences every classed player sees: State 2's four class-selection cards + their panel wrapper
  (header + skill-point line), and State 3's linear skill-tree node rows (the ●/◐/○ progress dot + perk desc +
  Unlocked/Unlock-button/Locked action). The dot moves INTO `renderSkillNodeRowHTML`; the loop-dependent
  `isUnlocked`/`isNext`/`canAfford` flags stay computed in the wrapper's `.map` and are passed in. **DRY
  forward-design:** the linear node row (State 3) and the subclass tier row (State 5) are TWO near-identical
  ~16-line templates differing only in indentation + the unlock `data-action` — `renderSkillNodeRowHTML` is
  that shared row, its `unlockAction` param ('class.unlockNode' here, 'class.unlockSubclassTier' next slice)
  the only distinguisher (both items expose the same `.desc` + `.cost`). This slice emits at the base node
  row's original 16-space indent so State 3 stays BYTE-identical; the tier rows re-indent to match next slice.
  Swap was a CRLF one-shot Node script (between-anchor slices). **Anchor gotcha:** a bare `const dot` start
  anchor is a SUBSTRING of the deeper-indented subclass tier row's identical `const dot` line (the extra
  leading spaces contain the shorter indent), so the uniqueness guard tripped — re-anchored on the callback's
  `i < unlocked;` (the tier body uses `i < subUnlocked;`), re-stating the three flag lines in the replacement.
  Byte-faithfulness proven by a RUNTIME before/after snapshot: a throwaway test drove the REAL
  `renderClassPanel` into `#panel-class-section` across a 7-case matrix spanning all five states, dumped
  `innerHTML` pre-swap, asserted IDENTICAL post-swap (State 4 capstone + State 5 subclass stay inline this
  slice, so those cases confirm no regression). 10 new unit tests lock the three builders (792 total). The
  capstone cards + subclass track + final active-class panel shell remain inline for the NEXT slice.
- `renderCapstoneCardHTML` / `renderCapstoneSectionHTML` / `renderSubclassLockedTeaserHTML` /
  `renderSubclassSelectCardHTML` / `renderSubclassSelectBodyHTML` / `renderActiveSubclassBodyHTML` /
  `renderSubclassSectionHTML` / `renderActiveClassPanelHTML` — **the 35th slice**, FINISHING
  `class-render.js` (now ELEVEN builders): State 4's capstone card (three branches — chosen/Mastered,
  pickable `class.selectCapstone`, greyed "Not chosen") + section header, State 5's subclass track
  (locked teaser, selection cards + body, active-subclass header + Respec), and the
  `renderActiveClassPanelHTML` shell (class header + skill-point line + the three assembled sections).
  **The DRY prize lands:** the subclass tier rows now reuse `renderSkillNodeRowHTML` (via
  `unlockAction: 'class.unlockSubclassTier'`) — the two near-identical ~16-line templates are ONE. That
  reuse re-indents the tier rows (24→16 space), the ONE intended byte change; every other branch keeps
  its historical indent verbatim. Swap was a CRLF one-shot Node script (three between-anchor slices:
  State 4 / State 5 / assembly). Byte/semantic faithfulness proven by the RUNTIME before/after snapshot
  (same 7-case/5-state matrix, now capturing BOTH raw AND per-line-trimmed `innerHTML`): six cases
  byte-IDENTICAL, `subclassActive` per-line-trim-IDENTICAL (the tier re-indent only, no content/attr/
  structural change). A too-weak whitespace-between-tags normaliser first false-flagged the `<button>`'s
  inner-text whitespace — confirming the check's teeth before switching to per-line trim. 18 new unit
  tests lock the eight builders (810 total); `renderClassPanel` is now a fully thin wrapper.
- `renderTaskBreakdownHTML(breakdown)` / `renderActivityHeatmapHTML(weeks)` — **the 36th slice**, opening a
  SIXTH render module `analytics-render.js` on the Analytics dashboard (a suite of seven `render*` methods,
  ~500 lines). FIRST cut: the two most self-contained charts. `renderTaskBreakdownHTML` takes the six
  completed-count tallies and emits one coloured bar per non-empty category (label + fill + a count/percent
  readout in its own column), or a call-to-action empty-state at zero. `renderActivityHeatmapHTML` takes a
  precomputed week/day cell matrix and paints the 12-week grid (S-M-T-W-T-F-S labels + the GitHub-style green
  ramp >0/>2/>5/>10; future cells dim); ALL date math + the date-bucketed completion lookup stay in the
  wrapper, so the builder is pure. `renderQuickStats` is deliberately NOT a target — it sets `.textContent`
  on four stat tiles (no markup), so like the `update*` mutators it stays on the class. NEW module, so
  registered in three places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest
  harness). Swap was a CRLF one-shot Node script (two between-anchor slices; the shared
  `container.innerHTML = html;` end anchor resolves per-method by searching AFTER each unique start). Proven
  byte-IDENTICAL by a RUNTIME before/after snapshot across empty/populated breakdown + a full past/future/
  every-green-threshold heatmap (the two date seams pinned for determinism). 10 new unit tests lock the two
  builders (820 total). Four render-producing analytics methods remain inline for the NEXT slices.
- `renderXPTimelineHTML(bars)` / `renderProductivityPatternHTML(dayCount)` / `renderPersonalRecordsHTML(records)`
  / `renderGoalsProgressOverviewHTML(goals, {escapeHTML})` — **the 37th slice**, FINISHING `analytics-render.js`
  (now SIX builders) and the WHOLE Analytics dashboard. The four remaining charts: the 30-day XP timeline (bars
  scaled to the busiest day, empty-state when the window is bare — the wrapper precomputes the 30-bar array so
  ALL date math stays out of the builder), the weekday productivity pattern (7 buckets → blue weekend / green
  weekday bars), the personal-records grid (6 stat cards behind a literal-class palette), and the goals-progress
  overview (a card per incomplete goal, tier-themed, `escapeHTML` INJECTED exactly as `renderChecklistHTML` wires
  it, empty-state when nothing's in progress). Each builder OWNS its palette/scale/empty-state + colour
  thresholds; the wrappers keep only the impure tallies. Swap was a CRLF one-shot Node script (six between-anchor
  slices: two build-region replacements + a delegate each, plus two dead-palette removals). Proven byte-IDENTICAL
  by a RUNTIME before/after snapshot across empty + populated states, the 30-day window boundary + out-of-window
  exclusion, weekday bucketing, progress clamping (0..100), and an ESCAPED goal title. 14 new unit tests (834
  total). `renderQuickStats` stays on the class — it sets `.textContent`, not markup — so the Analytics surface
  is now fully extracted.
- `renderActiveQuestChainsHTML(activeChains, { templates, spellDefinitions })` /
  `renderAvailableQuestChainsHTML(activeChains, completedChains, { templates })` /
  `renderCompletedQuestChainsHTML(completedChains, { templates })` — **the 38th slice**, a SEVENTH render
  module `quest-chain-render.js` covering the WHOLE Quest Chains tab that `renderQuestChains()` orchestrates.
  The three columns: the active-saga cards (chapter progress bar, current-chapter task checklist, reward
  preview), the available-chain catalog (every template minus the active + completed ones, "Begin Adventure"
  cards), and the completed-chain trophy shelf. All three depend ONLY on data — the `questChainTemplates` +
  `spellDefinitions` catalogs (INJECTED as `templates`/`spellDefinitions`) plus the chain arrays — no class
  methods, so each wrapper is now just `getElementById` + guard + delegate. NEW module, registered in three
  places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest harness). To keep the
  templates byte-exact (they carry trailing spaces + whitespace-only lines), the builder bodies were filled by
  a one-shot script that copied the method-body bytes verbatim and applied only mechanical transforms
  (`this.<state>` → params, `container.innerHTML = X` → `return X`, dropping the now-dead empty-state `return;`);
  the sole hand-edit was a JSDoc `string[]` cast on `currentChapter.tasks` so the nested `.map` params typecheck.
  Swap was a CRLF one-shot (three between-anchor slices; the shared `container.innerHTML = html;` end anchor
  resolves per-method after each unique start). Proven byte-IDENTICAL by a RUNTIME before/after snapshot across
  each empty-state, the difficulty-colour branches, the missing-template filter, progress math, and the
  present/absent completed-date. 12 new unit tests (846 total). The Quest Chains surface is now fully extracted.
- `renderActiveEnchantmentsHTML(activeEnchantments, { now, enchantmentDefinitions })` /
  `renderEnchantmentShopHTML(enchantmentDefinitions, { focusCrystals, isPremium, hasActiveEnchantment })` —
  **the 39th slice**, an EIGHTH render module `enchantment-render.js` covering the WHOLE Enchantments view
  that `renderEnchantments()` orchestrates. Two columns: the active-enchantment cards (icon, name, live
  time-remaining label, countdown progress bar) and the shop grid (free-first sort, then premium; each a
  locked "Unlock" teaser or a live ✓-Active / ✨-Purchase / 🔒-Need-crystals card). NEW module, registered in
  three places. The wrappers keep ONLY the impure bits: active keeps `checkExpiredEnchantments()` (a
  state-pruning side-effect that MUST run before reading the array) and injects the wall clock as `now` (the
  sole `Date.now()` read, moved out so the builder is deterministic); shop prepends the impure
  `getPremiumBannerHTML(...)` and injects the bound `hasActiveEnchantment` predicate (so ✓ Active works
  without reaching into instance state). Body-filled by the usual one-shot verbatim copy + mechanical
  transforms (`this.<state>` → params, `Date.now()` → `now`, `container.innerHTML = X` → `return X`, drop the
  dead empty-state `return;`, and the shop's `= getPremiumBannerHTML(...) + html` → `return html` with the
  banner rejoined in the wrapper). Swap was a CRLF one-shot (two between-anchor slices; the active end anchor
  `container.innerHTML = html;` resolves after the unique start). Proven byte-IDENTICAL by a RUNTIME
  before/after snapshot (with `Date.now()` FROZEN) across the active empty-state, the h+m vs m-only time
  labels, all three progress-width fallbacks (totalDuration → catalog duration → literal 180), and the shop's
  ✓-Active / affordable / unaffordable / premium-locked / premium-unlocked branches. 13 new unit tests (859
  total). The Enchantments surface is now fully extracted.
- `renderXPEventHTML(event, { escapeHTML, xpEventTimeLeftLabel })` /
  `renderRoyalBountyHTML(activeBounties, { bountyUnlocked, bountyQuest, bountyTimeLeftLabel, isPremium, escapeHTML })` —
  **the 40th slice**, a NINTH render module `dashboard-render.js`. `renderDashboard()` itself STAYS on the class — it's a
  textContent + hidden-toggle ORCHESTRATOR (level banner, quote, stat counts, today's-tasks list) that then calls the
  standalone card renderers; this slice takes the two CLEANEST of those cards. `renderXPEventHTML` is the
  Double-XP-Weekend banner (the wrapper keeps `getActiveXPEvent()` + the hide/show guard; the builder injects the
  clock-dependent time-left label). `renderRoyalBountyHTML` is the weekly/monthly Royal Bounty pair — an "add a quest"
  nudge (empty pool), a "Claimed ✓" receipt, or the live bounty (chest tier, escaped quest title, time-left, a
  premium-gated Reroll button); it returns the JOINED cards (or '' when nothing qualifies) and injects the bounty
  predicates/lookups (`bountyUnlocked` / `bountyQuest` / `bountyTimeLeftLabel`) + `isPremium` + `escapeHTML`. NEW module,
  registered in three places. Proven byte-IDENTICAL by a RUNTIME before/after snapshot (Date.now frozen) across the XP
  none/live branches and the bounty empty / claimed / active-premium(reroll) / active-free(reroll-locked) /
  rerolled(no-button) / deleted-target-skip / not-unlocked-skip / all-empty-hide branches. 12 new unit tests (871 total).
- `renderStreakRepairHTML(entries, { isPremium, hasFreeStreakRepair, focusCrystals, getStreakRepairCost, escapeHTML, streakRepairTimeLeftLabel })` /
  `renderWeeklyThemeCardHTML(theme, { eyebrow, copy, cta, from, to, border, escapeHTML })` — **the 41st slice**, COMPLETING
  `dashboard-render.js` with the other two cards. `renderStreakRepairHTML` is the broken-streak repair card body — the pure
  conversion upsell (a non-premium player who has spent their one free repair) OR the repairable-streak rows (premium pays
  Focus Crystals; a free-repair player pays nothing + ignores affordability). Its DOM `shell` closure (which did
  `classList.remove` + `innerHTML =`) became a PURE string helper returning the cyan container; the wrapper keeps
  `getRepairableStreaks()` + the hide/show + `classList.remove`. `renderWeeklyThemeCardHTML` is the Theme-of-the-Week
  discovery card (swatch + eyebrow/copy + preview/dismiss) — template ONLY: the wrapper keeps ALL guards (no featured /
  already-wearing / dismissed-this-week), the free-vs-premium copy derivation, the swatch colour fallbacks, AND the
  post-render `addEventListener` wiring on the two buttons. Proven byte-IDENTICAL by a RUNTIME before/after snapshot across
  the streak upsell / premium-rows(affordable + unaffordable + escaped title) / free-repair branches and the weekly-theme
  free / premium-with-colour-fallbacks / dismissed / no-featured / already-wearing branches. 7 new unit tests (878 total).
  The Dashboard card surface is now fully extracted.

All verified at 755/755 jest (+8 new across B5a+B5b) + `npm run typecheck` clean. Eleven data catalogs + three
logic engines (loot, boss, persistence-migrations — the last now load- AND save-side) + TWO
render modules (`boss-render.js` — the finished boss surface; `task-render.js` — the checklist
leaf + the `priorityBadgeHTML` helper + all SIX task/goal cards) are now carved out. **B IS DONE
and DRY: every task/goal card (side-quest, daily, weekly, life, yearly, monthly) is a pure,
byte-faithful, unit-tested builder in `task-render.js`; each container renderer on the class is a
thin filter + `.map` delegate + `innerHTML` write; and the once-4×-duplicated priority badge is
now a single shared helper. And BOTH "scheduled tasks" summary cards (weekly=B5a, monthly=B5b)
are extracted too — so `renderWeeklyGoals` and `renderMonthlyGoals` are now FULLY thin: filter,
delegate to the builders, `innerHTML`. There are no inline task/goal render templates left in the
God class; the entire B surface (all six cards + both summaries) lives in `task-render.js`.** The
proven seam (pure builder behind a thin DOM-writing wrapper, security-critical helpers + the
impure today probe INJECTED) carried all six cards and both summaries. Still uses the seam tactic
below. **The Companion Den is now DONE** — the THIRD render module, `companion-render.js`, holds all
of it: the collection card (31st slice) plus the active-companion display + undiscovered grid (32nd).
`renderCompanionDen` is a thin data-gather + delegate + `innerHTML` wrapper (the only inline markup
left is the collection empty-state, which uses the shared `_renderEmptyState` helper). **The Spellbook is
now DONE too** — the FOURTH render module, `spell-render.js`, holds the whole surface (active-spell card,
both section headers, free + premium collection cards); `renderActiveSpells` + `renderSpellCollection` are
now thin filter/partition + `.map`-delegate wrappers, and the two identical inline `rarityColors` copies
(the DRY prize) collapsed into one `SPELL_RARITY_COLORS` const in the module. **The Class & skill tree is now DONE too** — the FIFTH render module, `class-render.js`, holds the WHOLE
of `renderClassPanel` across two slices (34th: class-select cards + panel + linear skill-tree node rows;
35th: capstone cards, subclass track, and the active-class shell). The subclass tier rows reuse the same
`renderSkillNodeRowHTML` as the linear nodes (the DRY prize), distinguished only by the `unlockAction`
param; `renderClassPanel` is now a fully thin state/branch/compose wrapper. **The Analytics dashboard is now
DONE too** — the SIXTH render module, `analytics-render.js`, holds all six charts across two slices (36th:
task-breakdown bars + 12-week activity heatmap; 37th: 30-day XP timeline, weekday productivity pattern,
personal-records grid, goals-progress overview). Every `render*` chart method is now a thin data-gather +
delegate wrapper (all date math / tallies stay in the wrapper; the builders own palettes, scales, empty-states,
and colour thresholds). `renderQuickStats` stays on the class — it sets textContent, not markup. **Quest Chains
is now DONE too** — the SEVENTH render module, `quest-chain-render.js`, holds the whole tab (active-saga /
available-catalog / completed-trophy columns); `renderActiveQuestChains` + `renderAvailableQuestChains` +
`renderCompletedQuestChains` are now thin guard + delegate wrappers, and `renderQuestChains()` stays on the class
as a 3-call orchestrator. **Enchantments is now DONE too** — the EIGHTH render module, `enchantment-render.js`,
holds the whole view (active-enchantment countdown cards + the free/premium shop grid); `renderActiveEnchantments`
+ `renderEnchantmentShop` are now thin guard + delegate wrappers (active keeping `checkExpiredEnchantments()` +
the injected `now`, shop prepending `getPremiumBannerHTML(...)`), and `renderEnchantments()` stays on the class as
a crystal-display + 2-call orchestrator. **The Dashboard card surface is now DONE too** — the NINTH render module,
`dashboard-render.js`, holds all FOUR standalone cards across two slices (40th: the Double-XP-Weekend banner + the
weekly/monthly Royal Bounty pair; 41st: the broken-streak repair card + the Theme-of-the-Week discovery card).
`renderXPEvent` / `renderRoyalBounty` / `renderStreakRepair` / `renderWeeklyThemeCard` are now thin guard/derive +
delegate wrappers (the streak `shell` became a pure string helper; the weekly-theme wrapper keeps its post-render
`addEventListener` wiring), and `renderDashboard()` STAYS on the class as a textContent + hidden-toggle orchestrator.
**The Player HUD is now DONE too** — the TENTH render module, `player-hud-render.js`, holds the WHOLE surface across
two slices. The 42nd extracted the two standalone avatar-HUD "active effect" surfaces: the arcane-tab active-buffs
bar (`renderActiveBuffsSummary`) and the avatar sigil-orbit bubbles (`renderActiveSpellSigils`). The 43rd finished
it by carving `renderPlayerPanel`'s two embedded markup blocks — the character-sheet companion portrait
(`renderPanelCompanionHTML`) and the compact panel active-buffs row (`renderPanelActiveBuffsHTML`). Every wrapper is
now thin: buffs/sigils keep their container lookups + guards (sigils also the empty-clear early-return, the
change-detect `innerHTML` writes, and the post-render `requestAnimationFrame(_syncSigilCounterRotation)`), and
`renderPlayerPanel` keeps its `#panel-companion` + `#panel-active-buffs` lookups + the `getActiveCompanion()` /
`if (active)` gate + the two terminal `innerHTML` writes. The buffs surfaces interpolate spell/enchantment names
RAW (faithful — they never escaped them); only the sigil `title` is escaped. `renderXPDisplay` STAYS on the class
(a textContent/style/setAttribute DOM mutator, not a markup builder). **Title Hall is now DONE too** — the
ELEVENTH render module, `title-render.js`, holds the WHOLE surface (44th slice): `renderTitleHall` is now a thin
wrapper (three `getElementById` lookups + the `if (!container) return` guard + the `unlockedTitles.find(currentTitle)`
active-record resolve + two `innerHTML` writes + the legacy `#titles-locked-grid` clear) delegating its
`#active-title-display` card (`renderActiveTitleDisplayHTML`) and `#titles-container` body
(`renderTitleHallContentHTML` — collection progress + per-category earned/locked cards + the level-rank chain from
`LEVEL_TITLES[style]`) to two pure builders. The presentational `titleCategories` catalog (defined inline, no
`this.`) moved into the module; title/rank names interpolate RAW (faithful). **Rewards is now underway** — the
TWELFTH render module, `reward-render.js`, holds the Treasury tab body (45th slice): `renderTreasureChests` is a
thin wrapper (a `getElementById` lookup + guard + one `innerHTML` write) delegating to `renderTreasureChestsHTML`
(the free Daily Wooden Chest card + the four purchasable bronze/silver/gold/royal tiles, with affordability gating
and a per-type opened-count). The inline `chestTypes` catalog moved into the module; the clock-derived
`canClaimWooden` + `goldCoins`/`treasureChests` come in as inputs, and the chest visual (`<img>` vs emoji) via the
injected `_chestStaticHTML` (kept on the class — `renderWoodenChest` shares it). **The themes half is now DONE too**
— the THIRTEENTH render module, `theme-render.js`, holds BOTH Themes surfaces (46th slice): `renderThemes` (the
full `#themes-container` grid + the "Theme of the Week" banner) and `renderThemeSelector` (the compact Tools-tab
tiles) are now thin wrappers delegating to `renderThemesHTML` + `renderThemeSelectorHTML`. Each wrapper keeps its
lookup + guard + the clock-derived `featuredId` (from `getWeeklyFeaturedThemeId()`); `renderThemes` keeps the
deferred `setTimeout(maybeShowFeaturedThemeSpotlight)` and `renderThemeSelector` keeps its separate
`#theme-premium-banner` write. `themeDefinitions`/`unlockedThemes`/`currentTheme`/`isPremium` pass in as inputs,
and the compact tile gradient comes from the injected `darkenColor` (the manager's pure helper, kept on the class).
**Badges is now DONE too** — the FOURTEENTH render module, `badge-render.js`, holds the Badges/Achievements panel
(47th slice): `renderBadges` is a thin wrapper (container lookup + guard + the `getAchievementDefinitions()` /
`getAchievementProgress()` calls) delegating its `#badges-container` body to `renderBadgesHTML`. The builder is PURE
given `{ achievements, progress, badges }` — an "Unlocked" section (one amber rarity-frame card per earned
achievement + its unlock date) and an "In Progress" section (locked achievements sorted closest-to-completion, each
with a progress bar whose color steps gray/orange/yellow/green by percent), or the "Complete quests…" empty state.
**Habits is now DONE too** — the FIFTEENTH render module, `habit-render.js`, holds the populated Rituals-tab body
(48th slice): `renderBadges`’ sibling `renderHabits` keeps its `#habits-container` lookup + guard AND the
zero-habits empty-state branch (`this._renderEmptyState`) inline (mirroring `renderActiveSpells`), and when habits
exist delegates the per-habit ritual cards to `renderHabitsHTML`. Each card is a draggable checkbox row (line-
through + dimmed when done) with an escaped title, an optional "🔥 N day(s)" streak badge (hidden at streak 0), an
optional escaped description, a total-completions line, edit/delete buttons, and the completion heatmap. The
builder is PURE given `{ habits, escapeHTML, heatmapHTML }` — the clock-dependent GitHub-style heatmap is injected
as `heatmapHTML(habit)` (the wrapper passes the manager’s `generateHabitHeatMap`, which stays on the class).
**Archives is now DONE too** — the SIXTEENTH render module, `archive-render.js`, holds the populated Archive
(Tools-tab) body (49th slice): `renderArchives` keeps its `#archives-container` lookup + guard, the SEPARATE
`#archive-count` textContent write, AND the zero-archives empty-state branch (`this._renderEmptyState`) inline,
and when archives exist delegates the card list to `renderArchivesHTML`. The builder sorts a copy of the archived
goals newest-first by `archivedAt`, then emits one type-colored card each (per-type icon + capitalized type badge,
an optional "✓ Completed" flag, the escaped title, an optional escaped description, the localized "Archived: <date>"
line, and Restore / Delete-Forever buttons). PURE given `{ archivedGoals, escapeHTML }` — the sort compares, and
the date line formats, each record’s OWN `archivedAt`, never the wall clock. Whole suite now 950/950 jest +
`npm run typecheck` clean.
**The Daily board is now DONE** — the SEVENTEENTH render module, `daily-board-render.js`, holds BOTH Daily-board
surfaces (50th slice) via two pure builders. `renderDailyQuestBoard` keeps its `#daily-quest-board` lookup + guard
and the `generateDailyQuestBoard()` + `ensureDailyTracking()` side-effects, then delegates the whole body to
`renderDailyQuestBoardHTML({ quests, tracking, dailyQuestPool })`: a row per rolled quest (its `DAILY_QUEST_POOL`
def supplies the icon — a green check once claimed — name, and description; the right rail shows CLAIMED, a Claim
button when completed-but-unclaimed, or the "N XP" reward; claimed rows dim, completed ones get a green frame; an
id absent from the pool renders nothing), then the sweep-bonus footer ("🏅 Board Swept!" when every quest is
claimed, else "<claimed>/3 complete"). `renderWoodenChest` keeps its `#daily-wooden-chest` lookup + guard, computes
the clock-derived `canClaim` (`canClaimWoodenChest()`), injects `_chestStaticHTML`, and delegates to
`renderWoodenChestHTML({ canClaim, chestStaticHTML })` — the bouncing chest + "Open Chest" button when claimable,
the dimmed chest + "Already claimed today!" otherwise. Both PURE (the board's `def.check(tracking)` is a pure pool
predicate whose result the row template doesn't even use — preserved verbatim). Whole suite now 959/959 jest +
`npm run typecheck` clean.
**Recurring is now DONE** — the EIGHTEENTH render module, `recurring-render.js`, holds the populated Recurring-tasks
panel (Daily view → Recurring tab) body (51st slice): `renderRecurringTasks` keeps its `#recurring-tasks-container`
lookup + guard and the zero-tasks empty-state branch (`this._renderEmptyState`) inline, then delegates the list to
`renderRecurringTasksHTML({ recurringTasks, escapeHTML })`. The builder emits one row per task — a toggle button (a
filled green circle when active, a blank circle when paused; the whole row is cyan-tinted when active, dimmed gray
when paused), the escaped title, a human schedule line, and a delete button. The schedule line covers all four
recurrence shapes: weekly ("Every Mon, Wed"), biweekly ("Every other Fri"), monthly-date ("Monthly on day 12"), and
monthly-weekday ("2nd Tue of month", or "Last Fri of month" when `week === -1`). PURE given `{ recurringTasks,
escapeHTML }` — the schedule text is derived from each row's OWN `recurrence`, never shared state or the clock.
Whole suite now 970/970 jest + `npm run typecheck` clean.
**Calendar is now DONE** — the NINETEENTH render module, `calendar-render.js`, holds the Calendar tab's two pure
builders (52nd slice). This surface is the most DOM-imperative one extracted so far, so the wrappers keep more than
usual: `renderCalendar` still builds the `#calendar-days` grid by hand (`createElement` per cell, the per-day
`onclick = () => this.selectDate(...)` closure, `data-date`, `appendChild`), writes the month/year `textContent`,
pre-indexes `dailyTasks` into `tasksByDate`, and re-applies the previously-selected-day highlight — it only routes
each cell's inner HTML through `renderCalendarDayHTML({ day, isToday, completedTasks, totalTasks })` (the day number,
white on today's cell, plus a "<done>/<total> ⚔️" badge when the day has tasks). `renderCalendarTasks` keeps its
date parse, the selected-date `textContent`, the `dailyTasks` filter, the container lookup, and the zero-tasks
empty-state (`this._renderEmptyState`, which threads the viewed `dateString` into its CTA) — delegating only the
populated body to `renderCalendarTasksHTML({ tasksForDay, dateString, escapeHTML })` (a quest-card per task: a
checkbox wired to `goalManager.toggleTask`, the escaped title with done-styling, a delete button, an optional escaped
description, and an optional checklist, then an "Add Another Quest" footer carrying `dateString`). Both PURE.
Whole suite now 981/981 jest + `npm run typecheck` clean.
**The Focus-timer controls are now DONE** — the TWENTIETH render module, `focus-timer-render.js`, holds the two
markup builders behind the Pomodoro surface (53rd slice). `updateFocusTimerControls` keeps its `#focus-timer-controls`
lookup + guard, then delegates the 4-state button set to `renderFocusTimerControls({ focusTimerRunning, isBreak,
hasPomodoroChain, focusTimeRemaining, sessionsPerChain })` — which returns `{ containerClass, buttonsHTML }` (idle
Start + Start-Pomodoro-Chain; running Pause + Stop, the Stop labelled "Stop Chain" only with a chain; paused Resume +
Stop; break-only Stop) that the wrapper writes to `className` + `innerHTML`. `_updateChainProgressIndicator` keeps its
lookup + guard AND the no-chain empty/hidden early-return, then delegates the active-chain body (the per-session
progress dots — done ✓ / active pulsing / upcoming — plus the "⚔️ Session N of M" or "☕ Break — Next" status line) to
`renderChainProgressHTML(pomodoroChain)`. Both PURE; `renderFocusTimer` STAYS on the class (a `textContent`/timer
orchestrator, not a markup builder). Whole suite now 988/988 jest + `npm run typecheck` clean.
**The Premium surface is now DONE** — the TWENTY-FIRST render module, `premium-render.js`, holds both Premium builders
(54th slice). `renderPremiumCard` keeps its `#premium-content` lookup + guard and the locale-dependent
`toLocaleDateString()` purchase-date format, then delegates BOTH branches to `renderPremiumCardHTML({ isPremium,
purchaseDate })` — the premium "thank-you" card (crown, "Member since: <date>", the four-perk grid) vs the free
upgrade prompt (the six-perk list + the "$4.99" "Go Premium" `data-action="premium.showModal"` CTA).
`getPremiumBannerHTML(message)` — the shared upsell banner behind FIVE call sites — now forwards `this.isPremium` to
`renderPremiumBannerHTML(message, isPremium)` (the surface-specific message in, or `''` for premium users). Both PURE.
Byte-faithfulness was proven pre-swap by a temporary equality check (the card via a jsdom `innerHTML` round-trip, the
banner as a raw string) against the inline output. Whole suite now 995/995 jest + `npm run typecheck` clean.

**The Reminder settings surface is now DONE** — the TWENTY-SECOND render module, `reminder-render.js`, holds the WHOLE
`#reminder-settings-container` body (55th slice, and the LAST tab-render surface — item #1's render burn-down is now
100% complete). `renderReminderSettings` stays a thin wrapper: it keeps the container lookup + guard AND the permission
re-check that MUTATES `this.notificationsEnabled` (native plugin state vs `Notification.permission` vs the
`notificationsConfirmedWorking` localStorage fallback), then delegates to `renderReminderSettingsHTML({ settings,
notificationsEnabled, isNative, notificationSupported, permissionDenied })` — the master Enable-Reminders toggle, the
morning/evening/overdue/streak/bounty rows (or the "configure times" hint when disabled), and the notification-status
footer (Enabled/Blocked/Not-Enabled/Not-Supported label + native-only delivery row + enable/guide/test button). PURE;
the four `<input type=time>`s keep their inline `onchange="goalManager.updateReminderSettings(…, this.value)"` handlers
verbatim (faithful markup — `this.value` is the DOM event target, NOT a class-state read). Byte-faithfulness was proven
pre-swap by a temporary inline-vs-module equality check across the 8-state notification matrix (web granted/default/
denied/confirmed, native enabled/disabled, not-supported, settings-off). Whole suite now 1007/1007 jest +
`npm run typecheck` clean.

**The daily-login-streak + streak-repair math is now split out** — `streak-logic.js`, the FOURTH LOGIC
module and the FIRST non-render slice after item #1's render burn-down closed (56th slice). Six PURE
functions the login-bonus + streak-repair methods delegate to: `classifyLoginBonus(lastDate, today,
currentStreak)` (the date-gap break detector — returns a `{ status: 'already-claimed' | 'first' |
'continue' | 'reset', prevStreak, dayDiff, newStreak }` decision), `computeLoginRewards(streak,
milestones)` (the escalating base gold/XP — 15 gold / 10 XP, +5/+3 per streak day, both capped at day 7 —
folded with the exact-day milestone bonus into `{ goldReward, xpReward, milestone, totalXP, totalGold,
nextMilestone }`), `streakRepairCost(lostStreak)`, `computeRepairableStreakInsert(snapshot, list, now)`
(the 2+-day-only, de-duped repairable-streak record), `pruneRepairableStreaks(list, now, windowMs)` (the
48h expiry filter), and `canRepairStreakEntry(entry, ctx)` (the free/premium/afford repair gate). The
IMPURE orchestration deliberately STAYS on the class: `checkDailyLoginBonus` keeps the tutorial defer, the
streak-shield prompt modal (`_showLoginShieldPrompt`) + its early-return, and the `_recordRepairableStreak`
side-effect; `_completeLoginBonus` keeps `addXP`/`addGold` (Beginner's-Blessing routing + toast/sound
suppression), the milestone extras (chest/charges/title grants), `saveData`, `scheduleStreakRiskReminder`,
the review prompt, and all the render/effects; `repairStreak` keeps the free-then-crystals spend + the
upsell routing. Two Group-B methods became PARTIAL delegators: `checkDailyLoginBonus` swaps its inline
date-diff + the nested `if (lastLoginBonusDate)` for the `classifyLoginBonus` decision (flattening ONE
nesting level — the kept shield/repair block re-indents, the only intended byte change), and
`_completeLoginBonus` swaps its reward-calc block for the `computeLoginRewards` destructure — and the DRY
prize lands here: the inline `nextMilestone` recompute (the exact milestone-find just extracted) is GONE,
now read straight from the module's output (`this.loginStreak` is unmutated between the two points, so it's
identical). The four repair methods (`getStreakRepairCost` / `_recordRepairableStreak` /
`getRepairableStreaks` / `canRepairStreak`) became thin full-body delegators; their existing class-method
tests stayed green UNCHANGED, exercising the delegation end-to-end. NEW module, so registered in three
places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest harness). The swap
was a CRLF one-shot Node script using anchor-based region slicing (blank-line trailing whitespace lives
INSIDE each slice, so it never needs matching — the robust alternative to byte-exact whole-method matching).
`classifyLoginBonus` + `computeLoginRewards` had NO direct test before this slice (their only callers are
impure: shield modals, addXP/addGold, saveData, render), so 20 new unit tests lock the module in isolation —
the `classifyLoginBonus` branches + the `computeLoginRewards` escalation cap / milestone-fold / next-preview,
plus the repair-math contracts (cost curve, de-dupe insert, 48h prune, repair gate). Whole suite now
1027/1027 jest + `npm run typecheck` clean.

**The XP / leveling-curve math is now split out** — `leveling-logic.js`, the FIFTH LOGIC module and the
SECOND non-render slice (57th slice). Three PURE functions the XP/leveling methods delegate to:
`xpForLevel(level)` (the per-level requirement — 150 + (level - 1) * 250, so L1=150, L2=400, L3=650…),
`totalXpForLevel(level)` (cumulative XP to REACH a level from level 1 — level 1 = 0, level N = sum of
xpForLevel(1..N-1)), and `levelProgress(totalXp, level)` — the band math returning `{ currentLevelXP,
nextLevelXP, xpIntoLevel, xpNeededForLevel, pct }` (pct clamped 0–100). The DRY prize is `levelProgress`:
that "XP-into-current-level" computation was hand-DUPLICATED across FOUR sites — `showXPToast` (old + new
band), `renderXPDisplay` (the HUD bar), `_statBreakdownXP` (the stat-tooltip rows), and the character-sheet
share canvas — the exact drift class this roadmap targets. `getXPForLevel` / `getTotalXPForLevel` became
thin full-body delegators (their existing "XP & Level System" class tests stayed green UNCHANGED); the four
render/toast sites swapped their hand-rolled boundary math for a `levelProgress` destructure, renaming via
the destructure so ALL downstream code is untouched. The IMPURE work deliberately STAYS on the class: the
DOM/`getElement` writes, the canvas paints, the floating-toast element + `requestAnimationFrame` bar
animation, and the level-up threshold checks in `addXP` / `levelUp` (which still call the delegators). NEW
module, so registered in three places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`,
the jest harness) + the module-scoped capture const. The swap was a CRLF one-shot Node script: region
slicing for the `showXPToast` block (its trailing-whitespace blank line lives INSIDE the slice, so it never
needs matching) and exact whole-block matching for the three `this.level` sites — whose shared first line
`const currentLevelXP = this.getTotalXPForLevel(this.level);` (appearing 3×) makes a single-line anchor
ambiguous, but each full block is unique via a distinguishing local (`xpIntoCurrentLevel` / `xpForLevel` /
the `xpIntoLevel`-based `xpProgress`). 11 new unit tests lock the module in isolation — the curve values,
the cumulative running-sum invariant, and `levelProgress`'s band + clamp edges (0% at a band start, ~50%
mid-band, 100% at/over the next-level threshold, 0% when the band is ahead of the XP), plus a matrix parity
check asserting `levelProgress` reproduces the EXACT pre-extraction inline formula across a level × XP grid
(start / edge / mid / over-threshold). Whole suite now 1038/1038 jest + `npm run typecheck` clean.

**The effort-based-XP priority scaling is now split out** — `effort-xp-logic.js`, the SIXTH LOGIC module
and the THIRD non-render slice (58th slice). Three PURE functions the "N3 effort-based XP" methods delegate
to: `normalizePriority(priority)` (coerce any value to the low/medium/high effort band — unknown/missing →
`medium`, the 1.0× baseline so default-priority items keep their historical XP), `priorityXPMultiplier(priority)`
(high 1.5× / medium 1.0× / low 0.75×), and `scaledXP(base, priority)` (`Math.round(base * priorityXPMultiplier)`).
The DRY prize is `scaledXP`: that `base × multiplier, rounded` reward formula was hand-DUPLICATED across FIVE
completion sites — side-quest (×20 → 30/20/15), daily task (×15, via `_dailyTaskXP`), weekly goal (×50),
monthly goal (×200), and yearly goal (×1000) — the exact drift risk this roadmap targets (a comment already
warned each "Mirrors the long-standing side-quest reward ramp"). `_normalizePriority` / `getPriorityXPMultiplier`
became thin full-body delegators (their existing "Effort-based XP" class tests + the "side-quest reward parity"
guard stayed green UNCHANGED); the five reward sites swapped their inline
`Math.round(BASE * this.getPriorityXPMultiplier(...))` for `EFFORT_XP_LOGIC.scaledXP(BASE, …)`. The IMPURE
anti-gaming daily cap deliberately STAYS on the class: `_dailyTaskXP` keeps `_consumeHighPriorityDailySlot()`
(date-stamped instance state that self-resets at local midnight), downgrading high→medium once the day's slots
are spent, THEN calls the pure `scaledXP`. NEW module, so registered in three places (index.html `<script>`
before goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. The swap
was a CRLF one-shot Node script anchoring on unique single-line substrings + clean whole-method blocks (no
trailing-whitespace slices needed this time). 8 new unit tests lock the module in isolation — the coercion
table (including unknown→medium), the multiplier bands, and `scaledXP`'s five historical ramps + half-up
rounding (22.5→23, 37.5→38), plus a matrix parity check asserting `scaledXP` reproduces the EXACT
pre-extraction inline formula across a base × priority grid. Whole suite now 1046/1046 jest +
`npm run typecheck` clean.

**The active-buff reward multipliers are now split out** — `buff-multipliers.js`, the SEVENTH LOGIC module
and the FOURTH non-render slice (59th slice). A logic-ISOLATION slice rather than a de-dup: it lifts the
drift-prone economy-buff math that `getActiveSpellMultiplier` / `getEnchantmentMultiplier` resolve for
`addXP` / `addGold` (and the boss-damage path) into two PURE functions. `spellMultiplier(effectType,
activeSpells, spellDefinitions, { now, powerMult })` is the meaty one — it walks the active-spell list,
skips expired casts (`expiresAt === -1` means "until triggered"), matches each spell's effect, and multiplies
in its bonus (`multiplier - 1`); a positive bonus is scaled by Wizard Empowered Magic (`1 + powerMult`) and,
for an Overcharged capstone cast, doubled again — logic that had NO direct isolation coverage before this
slice. `enchantmentMultiplier(type, hasEnchantment)` is the reward-type lookup (double_xp → 2× xp,
double_gold → 2× gold, boss_damage → 1.3× boss_damage, else 1×). Both methods became thin delegators that
keep their IMPURE inputs on the class: the spell wrapper injects `Date.now()` + the `spell_power_mult` perk;
the enchantment wrapper runs `checkExpiredEnchantments()` first, then passes an `id => hasActiveEnchantment(id)`
predicate. All five call sites already funnelled through the two methods, so NO call-site edits were needed —
only the two bodies. Both bodies carried trailing-whitespace blank lines, so the CRLF swap script used REGION
SLICING (anchor on unique CODE lines — the method signature + the NEXT method's signature — and discard
everything between, re-emitting the intervening `// Celebration Animations` comment verbatim) instead of
exact block matching, sidestepping the noisy blanks entirely. NEW module, registered in the usual three
places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest harness) + the
module-scoped capture const. The existing "Spell Multiplier System" / "Enchantment System" class tests stayed
green UNCHANGED; 12 new unit tests lock the module in isolation — expiry / until-triggered, the
effect / unknown-id / flag-spell skips, multiplicative stacking, the Empowered × Overcharge bonus scaling
(1.25×→1.30× at +20% power, ×2 overcharge → 1.5–1.6×), the non-positive-bonus + negative-powerMult clamps,
the enchantment reward-type table, plus delegator-parity checks. Whole suite now 1058/1058 jest +
`npm run typecheck` clean.

**The companion slot + bonus resolution is now split out** — `companion-logic.js`, the EIGHTH LOGIC module
and the FIFTH non-render slice (60th slice), joining the companion family (`companion-definitions.js` data +
`companion-render.js` view) as the LOGIC sibling. This COMPLETES the reward-multiplier-input trio the prior
slice opened: `addXP` / `addGold` resolve their reward as `spellMultiplier × enchantmentMultiplier ×
(1 + companionBonus)`, and companion bonus was the third factor. Three PURE functions:
`activeCompanion(companions, activeCompanionId)` (the owned object in the primary slot, or null),
`secondCompanion(companions, activeCompanionId, activeCompanionId2, secondCompanionPerk)` (the Ranger Twin
Bond second slot — null unless the capstone perk is active AND a distinct, owned companion is equipped
there), and `companionBonus(type, active, second)` (sums the two slots' `bonusAmount` for entries whose
`bonusType` matches). The three methods became thin delegators that keep the IMPURE inputs on the class:
they read `this.companions` / `this.activeCompanionId` / `this.activeCompanionId2` and resolve the
`getClassPerkValue('second_companion')` gate, then pass plain values in. `getActiveCompanion` is a hot path
(a dozen-plus call sites) but they all call the method, so — as with the buff-multiplier slice — NO
call-site edits were needed, only the three bodies. All three bodies were compact (no internal
trailing-whitespace blanks), so the CRLF swap script used EXACT whole-method block matching rather than
region slicing. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. The existing
"Companion System" + Ranger "Twin Bond" class tests stayed green UNCHANGED; 9 new unit tests lock the module
in isolation — the slot-resolution edges (empty roster, unowned id, missing roster), the Twin Bond perk gate
+ duplicate / unowned guards, the matching-type-only summation (owl 0.10 + eagle 0.15 = 0.25; a gold
companion contributes nothing to xp), the missing-`bonusAmount`→0 case, plus delegator-parity checks
(including a mocked-perk Twin Bond path). Whole suite now 1067/1067 jest + `npm run typecheck` clean.

**The class/subclass perk-value resolution is now split out** — `class-perks.js`, the NINTH LOGIC module and
the SIXTH non-render slice (61st slice). This one is the SHARED UPSTREAM the two prior buff slices lean on:
buff-multipliers.js's spell-power scaling reads `getClassPerkValue('spell_power_mult')` and companion-logic.js's
Twin Bond gate reads `getClassPerkValue('second_companion')`, so isolating it locks the input both already
consume. Three PURE functions: `classPerkValue(effect, cls, classNodesUnlocked, capstone, subValue)` — the
authoritative resolver that scans the UNLOCKED linear nodes for the first matching effect (each effect appears
at most once per class, so first match wins), falls back to the chosen capstone, then folds in the subclass
value taking the HIGHEST (v3.1 §9.5 — base + subclass effect ids are distinct, a zero-behavior merge for
existing perks); `subclassPerkValue(effect, sub, subclassNodesUnlocked)` — the chosen subclass's value at the
current tier (tiers are escalating REPLACEMENTS, so it returns the top unlocked one); and
`chosenCapstone(cls, classCapstone)` — the capstone-by-id `.find`. The three methods became thin delegators
that keep the IMPURE accessors on the class: they resolve `this.getActiveClass()` / `this.getActiveSubclass()`
(both thin `classDefinitions[...]` / subclass-map reads) + the `this.classNodesUnlocked` /
`this.subclassNodesUnlocked` / `this.classCapstone` instance state, then pass plain values in. `getClassPerkValue`
is one of the hottest methods in the file (perk hooks fire from `addXP`, `addGold`, boss combat, enchantment
cost, the two prior buff modules, …) but every caller goes through the method, so — as with the last two
slices — NO call-site edits were needed, only the three bodies; the inline v3.1 §9.5 note moved into the module
doc. All three bodies were compact (no internal trailing-whitespace blanks), so the CRLF swap script used EXACT
whole-method block matching. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. The existing
"Class System v3.1 — Phase 1 / Phase 2 perks" describes (which drive `getClassPerkValue` end-to-end across all
four classes' nodes + capstones + subclass tiers) stayed green UNCHANGED; 9 new unit tests lock the module in
isolation with a SYNTHETIC class/subclass (decoupled from the live catalog) — the locked-until-unlocked node
scan, the matching-only capstone fallback, the highest-of-subclass merge (both directions), the subclass tier
ramp + cap, the capstone-by-id lookup edges, plus a delegator-parity check on a real Scholar. Whole suite now
1076/1076 jest + `npm run typecheck` clean.

**The class/subclass tree progression-state predicates are now split out** — `class-progression.js`, the TENTH
LOGIC module and the SEVENTH non-render slice (62nd slice), the direct SIBLING of the prior slice: where
class-perks.js resolves "what VALUE does the player's progression grant", this resolves "WHERE is the player in
the tree" — the state that gates the class-up UI and the respec refund math. EIGHT PURE functions in a
class/subclass mirror: FOUR for the base class tree — `linearNodeCount(cls)`,
`nextClassNode(cls, classNodesUnlocked)` (next not-yet-unlocked node, or null past the end),
`isCapstoneReady(cls, classNodesUnlocked, classCapstone)` (all nodes unlocked BUT no capstone chosen yet — the
choice is now offered), `isClassMastered(cls, classNodesUnlocked, classCapstone)` (all nodes unlocked AND a
capstone chosen) — and FOUR mirroring the subclass tree: `subclassTierCount(sub)`,
`nextSubclassTier(sub, subclassNodesUnlocked)`, `isSubclassMastered(sub, subclassNodesUnlocked)`, and
`subclassPointsSpent(sub, subclassNodesUnlocked)` (the cumulative `cost` of the UNLOCKED tiers, used to refund
precisely on a subclass-only respec). The module's `isCapstoneReady` / `isClassMastered` call its own
`linearNodeCount` internally (and `isSubclassMastered` its own `subclassTierCount`), so the count logic lives in
one place. The eight methods became thin delegators keeping the IMPURE accessors on the class
(`this.getActiveClass()` / `this.getActiveSubclass()` + the `this.classNodesUnlocked` /
`this.subclassNodesUnlocked` / `this.classCapstone` instance state). NO call-site edits — every caller goes
through the methods, only the eight bodies changed; all were compact (no internal trailing-whitespace blanks)
so the CRLF swap script used EXACT whole-method block matching. NEW module, registered in the usual three
places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest harness) + the
module-scoped capture const. The existing "Class System v3.1" + subclass class tests (which drive
`isCapstoneReady`, `isClassMastered`, `isSubclassMastered`, `getNextSubclassTier`, `getSubclassPointsSpent`
end-to-end) stayed green UNCHANGED; 10 new unit tests lock the module in isolation with a SYNTHETIC
class/subclass — the count edges, the next-node/next-tier index at the boundary + past the end, the two
ready/mastered AND-gates (both factors), the tier-cost ramp + cap, plus class-tree parity on a real mastered
Scholar and subclass-tree parity on a mocked active subclass. Whole suite now 1086/1086 jest +
`npm run typecheck` clean.

**The class skill-point economy is now split out** — `skill-points.js`, the ELEVENTH LOGIC module and the
EIGHTH non-render slice (63rd slice). This CLOSES the class-tree trio: class-perks.js answers "what VALUE a
perk grants", class-progression.js answers "WHERE in the tree the player is", and this answers "what the
player can AFFORD". The important boundary call here was leaving the state-MUTATING spenders
(`unlockNextClassNode`, `chooseCapstone`, `unlockNextSubclassTier`, `respecClass`, `respecSubclass`) ON the
class — they own the side effects (`showAchievement`, `saveData`, `trackEvent`, the instance writes,
`unlockCompanion` / `grantWizardSpells`) and rewriting them would have been churn over side-effect-laden code;
only their ARITHMETIC moved. SIX PURE functions: `earnedSkillPoints(level, classUnlockLevel)` — the lifetime
supply, DERIVED never stored (1 per level past the unlock level, clamped at 0), which is what auto-handles
retroactive grants for players already past the unlock level when the feature shipped and removes any
per-level-up hook; `availableSkillPoints(earned, skillPointsSpent)` — the unspent balance, clamped so a data
anomaly can never surface a negative budget; `isClassSystemUnlocked(level, classSelectLevel)` — the SELECTION
gate (8), deliberately EARLIER than the point supply (10) so the identity beat lands before the tree opens;
`isSubclassUnlocked(classMastered, level, subclassUnlockLevel)` — the specialization gate needing mastery AND
level 40; plus the two subtle rules that were buried mid-mutator — `respecCost(earnedPoints, baseCost)`, the
class-respec fee that is FREE while no points have accrued (an early, under-informed pick shouldn't cost
crystals the player may not have), and `refundedSpent(skillPointsSpent, subclassPointsSpent)`, the
subclass-only respec total, which can't just zero the pool because the pool covers BOTH trees. Each tunable's
`|| n` default is preserved exactly as inline. FOUR whole-method delegators plus TWO surgical single-line swaps
inside `respecClass` / `respecSubclass` (the mutators are otherwise byte-identical, side effects intact) — no
other call-site edits. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. The existing
"Class System v3.1" + subclass tests (which drive the L8 selection gate, the "points still START at L10" curve,
the L40+mastered subclass gate, the "re-picking is FREE pre-L10" rule and the 7-point `respecSubclass` refund
end-to-end) stayed green UNCHANGED; 7 new unit tests lock the six functions in isolation — the earn curve at
and either side of the unlock level, the two clamps, both level gates' boundaries, the free-vs-paid respec fee,
the partial refund, and every `|| n` tunable default, plus delegator parity. Whole suite now 1093/1093 jest +
`npm run typecheck` clean.

**The Focus Crystal supply math is now split out** — `crystal-economy.js`, the TWELFTH LOGIC module and the
NINTH non-render slice (64th slice), covering the three ways crystals come INTO existence. Chosen over the
remaining candidates on merit: the enchantment cost/tier math is too THIN (a 3-line
`getEffectiveEnchantmentCost` plus fragments buried in side-effect-heavy brew/expiry code) and quest-chain
progression is almost entirely ORCHESTRATION (`startQuestChain` / `completeQuestChain` / `abandonQuestChain`
are `showConfirm` / `render` / toast wrappers, with the catalog AND render already extracted). The crystal
economy won on two concrete defects. FIRST, a genuine DUPLICATED magic number: the 10-shard conversion
threshold was hardcoded in `addFocusCrystalShards` AND hand-written again in the shard reward-display string
(`(n/10)`) — the exact duplicated-knowledge drift that caused the July 2026 loot bug. Both now read the single
exported `SHARDS_PER_CRYSTAL`. SECOND, `focusSessionCrystals` is an ORDER- and ROUNDING-dependent four-stage
pipeline that had NO isolation coverage: base 1 + the `bonus_crystal` / `extended_focus` enchantments + the
Scholar `crystal_yield` perk, then the Focus Mode doubling, then the Deep Work capstone multiplier, then the
Archivist subclass multiplier — the last two each `Math.round()`ed SEPARATELY, so the stages do NOT commute
(base 3 ×1.5 ×1.2 yields 6 stage-wise but 5 folded together, now locked by a test asserting both numbers).
THREE PURE functions: `shardConversion(totalShards, shardsPerCrystal)` returning `{crystals, remainder}` (a
large grant can form SEVERAL crystals at once, leftover carries forward), `focusSessionCrystals({...})`, and
`bossCrystalReward(bossType)` (monthly 3 / weekly 2 / daily 1). The mutating callers stay on the class with
every side effect intact (`window.effectsManager`, toasts, `showNotification`, `saveData`, `trackDaily`, the
instance writes) plus the `soul_harvest` boss top-up; each caller's own guard is preserved, so the
"crystals formed" toast still fires ONLY on a real conversion (locked by a negative test). FIVE swap sites: the
boss-reward tier line, the `addFocusCrystalShards` conversion, the de-duplicated display threshold, and the
focus-session pipeline — which needed REGION SLICING rather than exact block matching because its span carries
trailing whitespace on blank/continuation lines; `focusModeActive` / `archivistMult` were deliberately
RE-EMITTED inside the new text since both are read further down for the XP bonus and the completion toast
(`deepWorkMult` likewise, declared earlier), and `crystalsEarned` tightened `let` → `const`. NEW module,
registered in the usual three places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the
jest harness) + the module-scoped capture const. The existing focus-session describes (the Deep Work stack
escalation and the Archivist multiplier tiers, which drive the pipeline end-to-end) stayed green UNCHANGED; 10
new unit tests lock the module — the conversion below / exactly at / past the threshold, multi-crystal grants, a
custom threshold, the stage-1 stack, the Focus Mode doubling AND its position before the multipliers, the
non-commuting separate rounding, the `> 1` multiplier guards, the boss tiers with their daily fallback, plus
two `addFocusCrystalShards` parity tests (one crossing the threshold, one banking shards without a toast).
Whole suite now 1103/1103 jest + `npm run typecheck` clean.

**The attack-charge rules are now split out** — `charge-rules.js`, the THIRTEENTH LOGIC module and the TENTH
non-render slice (65th slice). Attack charges are the boss-battle currency, and `grantAttackCharge` had grown
into a dense FOUR-RULE pipeline whose ORDER is load-bearing. The rule worth protecting: the Warrior
`charge_chance` bonus (+1) is applied BEFORE the Battle Fury doubling, so the enchantment doubles the bonus
charge too — reorder those two stages and a lucky Warrior silently loses a charge every proc. A test now pins
it ((1+1)×2 = 4, not (1×2)+1 = 3). FIVE PURE functions: `isForageSource(source)` — the eligible-source rule
set, since only completion-flavoured grants ('task', 'sidequest', 'habit', 'weekly', 'monthly') roll the Ranger
Forage capstone while loot / milestone / focus grants must NOT;
`grantedAmount(amount, bonusChargeHit, battleFury)` — the ordered bonus-then-doubling stage, taking the roll's
boolean OUTCOME because the `rng()` call itself is impure and stays on the class;
`chargeSplit(amount, currentCharges, cap, keepOverflow)` — the v2.9.x soft-cap split returning
`{granted, overflow}` (uncapped charges let heavy task days bank 20-30 and trivialize a week of bosses, a daily
boss being only 8-18 HP), with the Warrior Overflow capstone short-circuiting the cap entirely so nothing is
ever lost; `overflowGold(overflow, goldPerCharge)` — the excess-to-gold conversion so earned charges are never
wasted; and `canAttack(boss, attackCharges)` — the SPEND side, giving the module both halves of the currency's
lifecycle. `ATTACK_CHARGE_CAP` (25) and `CHARGE_OVERFLOW_GOLD` (5) are exported as the defaults behind the
class's tunable fields, and both fallbacks deliberately keep `??` rather than `||` exactly as inline — a
configured cap or rate of 0 must survive instead of snapping back to the default, which a `||` would silently
break (locked by a test asserting a rate of 0 pays 0, not 20). TWO swap sites: the `grantAttackCharge` earn
pipeline (the DOM charge-counter pulse below `saveData` left untouched) and the `attackBoss` spend guard. The
mutator keeps every side effect — `applyForage`, the `rng()` roll, `trackDaily`, `addGold`, the
`_suppressRewardToasts`-gated overflow toast, `saveData` — and the `let amount` parameter mutation became a
clean `const earned`. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. The existing
charge describes (cap overflow, the exactly-at-cap no-op, Battle Fury interacting WITH the cap, toast
suppression during reward sequences, and the Warrior Overflow capstone) stayed green UNCHANGED; 14 new unit
tests lock the module — the forage source set both ways, the three amount stages plus the order proof, the
split with room / clamped / at-cap / past-cap / capstone / default-cap, the conversion including the `??`
zero-rate edge, all five `canAttack` branches, and two parity tests (a clamped grant matching the pure split,
and Forage firing for 'task' but not 'loot'). Whole suite now 1117/1117 jest + `npm run typecheck` clean.

**The boss-damage math is now split out** — `combat-damage.js`, the FOURTEENTH LOGIC module and the ELEVENTH
non-render slice (66th slice), completing the boss-battle trio: crystals, the charges that buy attacks, and
now the damage those attacks deal. `attackBoss` was the densest rule pipeline left in the class — TWELVE
multiplier stages plus a Cleave splash, interleaved with RNG rolls, spell consumption, a mutating combo
counter and DOM/effect calls. Two defects justified it. FIRST, another genuinely DUPLICATED magic number: the
0.25 execute threshold was written TWICE — once to gate the Executioner capstone, and again INSIDE the
Berserker ramp to decide whether Executioner counts as "active" for the §9.8 anti-double-dip cap. Rebalance
Executioner to 0.30, miss the second copy, and the guardrail silently mis-computes the headroom; both now read
`EXECUTE_HP_THRESHOLD`. SECOND, STAGE ORDER AND ROUNDING ARE OBSERVABLE but were only ever covered
end-to-end: every stage is `Math.ceil`ed INDEPENDENTLY, so the stages neither commute nor collapse into one
folded multiply — `ceil(ceil(6 × 1.2) × 1.25)` is 10 while `ceil(6 × 1.2 × 1.25)` is 9, now pinned by a test
asserting both numbers so nobody "optimises" the chain into a single product. SEVEN PURE functions plus the
tunables: `baseDamage(level)` (1, +1 per 10 levels), `applyMultiplier(damage, multiplier)` /
`applyBonus(damage, bonus)` (the shared ceil-rounded stage step in the two shapes used inline, the latter just
`applyMultiplier(d, 1 + b)`), `hpFraction(boss)` + `isExecuteRange(boss, threshold)` (the low-HP predicates,
both guarding a zero/absent `maxHP`), `berserkerBonus(ramp, hpFrac, executeActive, cap)` (the §9.8 two-term
algebra — the ramp grows with missing HP but may only claim the headroom Executioner leaves under +75%, and
never goes negative), `rageComboAdvance(counter, every)` returning `{counter, triggered}`, `isHunterTarget`
(weekly/monthly only — daily bosses are excluded), and `cleaveSplash`. `CRIT_MULTIPLIER` (1.5, previously
hand-written at all THREE crit sources), `CRITICAL_STRIKE_CHANCE`, `BERSERKER_RAGE_MULTIPLIER`,
`BOSS_SLAYER_MULTIPLIER`, `LOW_HP_BONUS_CAP` and `LEVELS_PER_DAMAGE` are exported alongside. THIRTEEN swap
sites, every one CONTEXT-ANCHORED rather than matched bare: `damage = Math.ceil(damage * 1.5);` appears FOUR
times (Berserker Rage, Critical Strike, Keen Edge, Rage Combo), so each block carries its neighbouring
message/flag lines and the swap script asserts a SINGLE match per site or aborts. The Rage Combo swap also
restructured a nested `if` (`counter >= every` → `combo.triggered`) at identical brace depth, preserving the
subtle rule that the combo still "spends" when a crit already landed — the counter resets but the hit is not
re-multiplied. Everything impure stayed on the class: the two `rng()` rolls, consuming the Berserker Rage
spell, the `rageComboCounter` write, the message strings, the `window.effectsManager` crit flashes, HP
mutation, the boss log, animations and `saveData`. NEW module, registered in the usual three places
(index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped
capture const. The existing combat describes (Executioner at 20% vs 30% HP, Cleave splash, the three-hit Rage
Combo counter sequence, the Berserker ramp at 50% and full HP, the §9.8 cap combined with Executioner, and
Hunter on weekly/monthly) drive the whole pipeline end-to-end and stayed green UNCHANGED; 17 new unit tests
lock the module — the level curve at both breakpoints, the ceil step and the non-folding proof, the execute
boundary INCLUSIVE at exactly 25% plus the zero-maxHP guards, the ramp scaling / full-HP no-op / §9.8 clamp /
negative-headroom floor, the combo cycle with its unset-counter and inactive-perk edges, Hunter targeting,
cleave rounding up so a live cleave always chips, and an `attackBoss` parity test. Whole suite now 1134/1134
jest + `npm run typecheck` clean.

**The reward stacks are now shared** — `reward-economy.js`, the FIFTEENTH LOGIC module and the TWELFTH
non-render slice (67th slice). `addXP` and `addGold` are the TWO choke points every reward in the game routes
through, and they had grown into PARALLEL multiplier stacks that independently hardcoded the same knowledge.
THREE duplications drove the extraction. FIRST, the Beginner's Blessing 2× was written TWICE as
`isBeginnerBlessingActive() ? 2 : 1` — once per method. SECOND, and worse, the Quest Doubler 2× was written
TWICE and SPLIT ACROSS the two methods: `addXP` sets its own multiplier and stashes
`_questDoublerGoldPending = 2` for `addGold` to pick up on the next synchronous call, so two hand-written 2s
hundreds of lines apart had to agree or the spell would pay double XP but single gold. THIRD, both methods
ended in the same `Math.floor(amount × m1 × m2 × …)` convention — seven factors for XP, six for gold. THE
SUBTLE PART IS `applyStack`: it folds LEFT-TO-RIGHT SEEDED AT `amount`, reproducing the inline expression's
associativity exactly. Seeding the reduce at 1 and multiplying by `amount` afterwards REGROUPS the
floating-point product, and that is not academic — a brute-force search over realistic multiplier values found
genuine divergences, e.g. `5 × 1.2 × 1.5 × 3` floors to **27** left-to-right but **26** regrouped. A test pins
both numbers so the accumulator's seed can never be "simplified". SEVEN PURE functions plus the tunables:
`applyStack`, `blessingMultiplier`, `earlyBirdAmount`, `nextMomentumStack` + `momentumBonus`,
`isQuestDoublerSource` and `isQuietGoldSource`, with `BEGINNER_BLESSING_MULTIPLIER`,
`QUEST_DOUBLER_MULTIPLIER`, `EARLY_BIRD_MULTIPLIER` / `EARLY_BIRD_TASK_CAP`, `MOMENTUM_MAX_STACK` /
`MOMENTUM_XP_PER_STACK` and the two frozen source arrays exported alongside. The slice also lifted the two
PRE-multiplier XP bonus rules, which had NO direct coverage before: Early Bird (the counter keeps climbing
past the cap — only the COMPARISON is capped — so the class increments first and passes the new count in) and
Momentum (a 5/10/15/20/25 ramp clamped at five stacks). Their INTERACTION is now pinned too: Momentum is
ADDED after Early Bird MULTIPLIES, so the flat bonus is never tripled — `(10 × 3) + 5 = 35`, not
`(10 + 5) × 3 = 45`. NINE swap sites, each context-anchored and asserting a unique match; the two blessing
lines are byte-identical apart from their `2x XP` / `2x Gold` comments, so those anchors carry the comment.
Everything impure stayed on the class: `hasActiveEnchantment`, the `earlyBirdTasksToday` / `momentumStack`
writes (including the else-branch reset), the pending-gold flag and its microtask cleanup, consuming the
Quest Doubler spell, the `totalGoldEarned` accumulator, toasts, sounds, sprites and `saveData`. NEW module,
registered in the usual three places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the
jest harness) + the module-scoped capture const. The existing reward tests (the quest-doubler pending-flag
handoff, the post-multiplier `totalGoldEarned` counter, the companion gold bonus, and the N3 migration set)
stayed green UNCHANGED; 13 new unit tests lock the module — the fold with its empty/undefined and all-1×
pass-throughs, the 27-vs-26 regrouping proof, the blessing pair, the Early Bird cap INCLUSIVE at 5 plus custom
cap/multiplier overrides, the Momentum clamp and ramp with its unset-stack edge, the ordering proof, both
source sets asserted positively AND negatively (chest/focus/habit must not burn the spell), and two parity
tests. Whole suite now 1147/1147 jest + `npm run typecheck` clean.

**The focus timer + Pomodoro chain are now shared** — `focus-session-logic.js`, the SIXTEENTH LOGIC module
and the THIRTEENTH non-render slice (68th slice). `crystal-economy.js` already owned what a session PAYS OUT;
this owns the mechanics AROUND that payout. It was picked over the remaining candidates on raw defect
density: FIVE separate pieces of knowledge were each written more than once. The 25-minute DEFAULT SESSION
LENGTH appeared **five** times (`initState`, the `startFocusTimer` ternary, the `loadData` fallback,
`completeFocusSession`'s `|| 25`, and `updateFocusTimerDisplay`'s progress-bar denominator) — miss one when
re-tuning and the progress bar renders against a different total than the timer counts down. The CHAIN
SETTINGS DEFAULTS `{ sessionsPerChain: 4, breakDuration: 5, longBreakDuration: 15 }` were a duplicated OBJECT
LITERAL in `initState` and `updatePomodoroChainSettings`'s repair branch — the same "second copy of the
defaults silently drifts" failure that item #6's `initState()` split was created to kill, reintroduced at a
different call site — and `sessionsPerChain`'s 4 had a THIRD copy as `completePomodoroChain`'s bare `: 4`.
The REMAINING-SECONDS expression `Math.max(0, Math.ceil((focusEndTime - Date.now()) / 1000))` was written
THREE times; the `ceil` is load-bearing (it makes a fresh session read 25:00, not 24:59), so a `floor` in one
copy would desync just that path. Finally the CHAIN-FINISHED predicate `currentSession > totalSessions` was
written twice — once to pick the long break, once to end the chain — and they MUST agree or the chain either
awards its long break then runs another session, or finishes without one. TWO SUBTLETIES are now pinned by
tests. FIRST, `isChainFinished` is STRICTLY greater-than because `currentSession` is PRE-incremented by
`completeFocusSession`, so a finished 4-session chain sits at 5; a `>=` would end it one session early, and a
test walks the whole 4-session sequence (short/short/short/long) to lock it. SECOND,
`defaultChainSettings()` returns a FRESH object every call rather than the frozen `DEFAULT_CHAIN_SETTINGS`
constant — `updatePomodoroChainSettings(key, value)` mutates it IN PLACE, so handing out a shared reference
would alias every manager together (or throw in strict mode); a two-instance parity test proves the
isolation. TEN PURE functions plus the tunables: `defaultChainSettings`, `sessionMinutes`, `minutesToMs`,
`remainingSeconds`, `deepWorkWindowMs` + `deepWorkAdvance`, `focusXpBonus`, `isChainFinished` + `breakPlan`,
and `chainCompletionRewards`, with `DEFAULT_SESSION_MINUTES` / `EXTENDED_SESSION_MINUTES`,
`DEEP_WORK_GRACE_MINUTES`, `FOCUS_MODE_XP_BONUS`, `CHAIN_BONUS_CRYSTALS` / `CHAIN_XP_PER_SESSION` and the
frozen `DEFAULT_CHAIN_SETTINGS`. `focusXpBonus` mirrors `crystal-economy.js`'s `focusSessionCrystals`: the
Deep Work and Archivist multipliers are each `Math.round`ed SEPARATELY and only when the running bonus is
already > 0, so the stages do not commute and a zero bonus stays zero. 15 swap sites; the guarded swap script
EARNED ITS KEEP here — the `initState` chain-settings anchor (8-space indent) was a SUBSTRING of the
repair-branch line (12-space indent), so the unique-match assertion aborted the whole run before any write
rather than silently editing the wrong site. Everything impure stayed on the class: `setInterval` /
`clearInterval`, the `Date.now()` reads, `hasActiveEnchantment`, `getClassPerkValue`, every instance write
(`deepWorkStack`, `lastFocusSessionEndTime`, `focusEndTime`, `focusSessionLength`, `pomodoroChain`), audio,
toasts, notifications, `addXP`, `grantAttackCharge`, `trackDaily`, `saveData` and `render`. NEW module,
registered in the usual three places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`,
the jest harness) + the module-scoped capture const. The existing focus-timer tests (the four-state control
buttons, the chain progress dots, session completion and crystal yield) stayed green UNCHANGED; 23 new unit
tests lock the module — the session/extended lengths, the ceil-and-clamp clock read, the frozen-vs-fresh
defaults pair, the Deep Work window with its INCLUSIVE boundary / past-window reset / first-session and
no-capstone edges, the XP pipeline's separate rounding (75 staged vs 74 folded) and zero-stays-zero guard,
the strict-`>` predicate, the full 4-session chain walk, custom chain lengths, the completion rewards, and
two class-parity tests. Whole suite now 1170/1170 jest + `npm run typecheck` clean.

**The active-spell lifecycle is now shared** — `spell-lifecycle.js`, the SEVENTEENTH LOGIC module and the
FOURTEENTH non-render slice (69th slice). The `activeSpells` array was read at THIRTEEN call sites through
THREE mutually inconsistent phrasings of one question, "is this spell active?": the full predicate
`spellId === X && (expiresAt === -1 || expiresAt > now)` (4 sites — time_freeze, streak_shield ×2,
focus_mode), an expiry-only `spellId === X && expiresAt > now` (2 sites — boss_slayer, critical_strike), and a
bare `spellId === X` with NO expiry check at all (7 sites — berserker_rage, execute, quest_doubler,
lucky_draw, the cast guard, 2 render reads). The consume idiom `filter(s => s.spellId !== X)` was
hand-written SIX more times.

**This was a LATENT-DRIFT slice, NOT a bug fix — and saying so precisely matters.** The first read of the
evidence suggested the expiry-only variant was a live defect that would miss a permanent spell. It is not.
Every one of the thirteen sites was verified spell-by-spell against `spell-definitions.js` BEFORE extracting,
and each was already correct: the expiry-only variant's two spells are both finite (boss_slayer 7 days,
critical_strike 24h) so there is no `-1` to miss; the bare-check variant's spells ALL declare `duration: -1`
(trigger-consumed — they never time-expire, they are removed on use) so skipping the expiry check is right for
them; and the full-predicate variant's spells are ALL finite, which means its `expiresAt === -1` branch was
DEAD CODE at all four sites, and actively misleading since it implies focus_mode could be permanent when it
cannot. The real exposure was conditional but genuine: the "time-based vs trigger-consumed" distinction was
IMPLICIT knowledge duplicated across thirteen sites with no single source of truth. Re-balance focus_mode to
`-1`, or give lucky_draw a finite duration, and several sites silently stop working — the exact shape of the
July 2026 loot bug that started this roadmap item.

`isActive` adopts the full predicate, which is behaviour-identical at TEN of the thirteen sites given current
definitions — a rare property for a slice this size, so the unification carries near-zero regression risk.
THREE SITES WERE DELIBERATELY LEFT ALONE on their bare id check: the `castSpell` "already active" guard and
the two spellbook-card `isActive` reads. For a FINITE spell that has expired but has not yet been swept by the
`checkExpiredSpells` interval, a bare check reports "active" while the canonical predicate reports "expired",
so switching them would let a player re-cast marginally sooner and would change which card renders as active.
That is a GAMEPLAY change, not a refactor, so it stays out of this slice — an in-code comment at the cast
guard records the reasoning, and a test asserts the bare check is still there so it is not "tidied" later.
TEN PURE functions plus the two sentinels: `isActive` / `findActive`, `consume`, `expirySweep` (replacing the
two complementary filters in `checkExpiredSpells`), `effectiveDuration` (perks extend TIMED spells only — the
`-1` and `0` sentinels pass through untouched so a perk can never convert an until-triggered spell into a
timed one), `castEntry` (whose permanent branch intentionally OMITS the `overcharged` key, exactly as the
inline code did, and which returns null for an INSTANT `duration: 0` spell that never enters the array), and
`isTriggerConsumed` / `isInstant` — which finally NAME the distinction that used to be implicit.
17 swap sites. Everything impure stayed on the class: the `Date.now()` reads, the `this.activeSpells` writes,
the batched expiry toast, `saveData`, `renderSpellbook` / `renderActiveSpellSigils`, charge spend/refund and
every instant-effect dispatch. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. The existing
spell tests (casting, charges and refunds, the quest-doubler pending-flag handoff, expiry) stayed green
UNCHANGED; 29 new unit tests lock the module — the predicate with its EXCLUSIVE expiry boundary and
null-array tolerance (the login path used `?.`), `consume`'s non-mutating new array, the sweep's
disjoint-and-covering split, the sentinel pass-throughs, `castEntry`'s three branches including the absent
`overcharged` key, and — the point of the whole slice — a DEFINITION-WALK DRIFT GUARD that runs every spell in
`spell-definitions.js` through the classifier, asserting each falls in exactly ONE bucket, that the four
bare-check spells are all trigger-consumed, that the five expiry-check spells are all timed, and that a cast
of every spell round-trips consistently with its bucket. A future duration change now fails loudly instead of
drifting. Whole suite now 1199/1199 jest + `npm run typecheck` clean.

**The previous-period recap math is now shared** — `period-summary-logic.js`, the EIGHTEENTH LOGIC module
and the FIFTEENTH non-render slice (70th slice). `generatePreviousPeriodSummary(period)` was ~100 lines of
date-range arithmetic plus stat aggregation with **ZERO test coverage**, and it is not a single-caller
helper — FIVE call sites consume it: the new-week/month/year transition slideshow, the shareable recap
canvas, the `navigator.share` payload, the recap preview modal, and the per-platform share. THREE of those
five each HAND-WROTE the identical sentence `Completed ${n} tasks this week with a ${r}% completion rate!
#LifeQuestJournal`. Same duplicated-knowledge shape as the July 2026 loot bug that opened this roadmap
item: reword it or swap the stat in one place and the other two silently drift. `recapShareText` is now
the single source, and a test asserts the literal appears at ZERO call sites and that all three go through
the module.

The date math was the drift-prone part and is the reason this slice was picked. The week branch is
**Monday-start**, not the JS default Sunday-start — `dayOfWeek === 0 ? 6 : dayOfWeek - 1` treats Sunday as
day 7, a classic off-by-one that had never been pinned by a test. The month branch leans on the
`new Date(y, m, 0)` day-0 trick to land on the last day of the preceding month, which is leap-year correct
without a length table. Both are now locked, including a Sunday reference date, a Monday reference date,
the January→December year rollover, and Feb 2024 vs Feb 2026 ends. Eight pure functions:
`previousPeriodRange`, `formatDisplayDate`, `completionRate`, `buildStatBlock`, `countHabitCompletions`,
`estimatedXP`, `summarize`, and `recapShareText`.

**Three legacy shape quirks were preserved verbatim rather than "fixed",** since changing them would be a
behaviour change, not a refactor: `tasks.incomplete` / `goals.incomplete` are the ARRAYS of incomplete
records while `tasks.completed` / `goals.completed` are COUNTS (asymmetric, but the callers render the
arrays); `habits.total` is the total number of habits, NOT the number active in the period, while only
`habits.completions` is period-filtered; and an unrecognised `period` still leaves the range undefined
instead of inventing a fallback. Each quirk has a test naming it as deliberate. TWO date formats are also
kept because callers depend on both — `startDate`/`endDate` are MM/DD/YYYY display strings, while
`endDateISO` goes through the caller's timezone-aware `dateToLocalString`, which is INJECTED since it reads
the user's configured offset off the instance and therefore cannot move into a pure module. The recap's
XP weights (10/task, 50/200/1000 per goal) are RECAP ESTIMATES, not the live ledger — the real award path
still runs through `reward-economy.js` with buffs and perks applied — but they were inline literals before
and are at least visible in one place now.

Everything impure stayed on the class: `getTodayDateString()`, `dateToLocalString`, reading
`dailyTasks`/`habits`/`weeklyGoals`/`monthlyGoals`/`yearlyGoals`, and every DOM/canvas/share side effect.
NEW module, registered in the usual three places (index.html `<script>` before goal-manager.js,
`scripts/copy-web.js`, the jest harness) + the module-scoped capture const. Because the method had no
coverage to lean on, the swap was guarded by a THROWAWAY characterization baseline that drove the REAL
method across a week/month/year/empty matrix with the clock pinned, serialized the output BEFORE the
extraction, and asserted `toEqual` against it AFTER — green on the first post-swap run, then deleted along
with its JSON artifact once the 21 permanent tests (including two class-parity tests proving the delegator
and the pure module agree on identical inputs) replaced it. Whole suite now 1220/1220 jest +
`npm run typecheck` clean.

**The period-transition DETECTION now sits on the same module** — the 71st slice, and the direct follow-up
the 70th predicted. No new module: `period-summary-logic.js` gained four pure functions
(`isoWeekNumber`, `periodStamp`, `detectTransitions`, `mainTransition`) plus a `TRANSITION_PRIORITY`
const. This is the "has a new week/month/year begun since the user was last here?" logic that decides
whether the slice-70 recap is shown AT ALL, so the two halves of period tracking now live together —
detection on top of the range math it gates. It was inline in `checkPeriodTransitions()` with ZERO
coverage. `getWeekNumber` became a thin delegator; `updatePeriodTracking` now assigns from `periodStamp`.
Everything impure stayed on the class: the first-time-user guard, `getTodayDateString()`, the noon-parse
that dodges timezone edges, `showPeriodTransitionSlideshow`, and the `saveData` write.

**This slice found and fixed a REAL BUG — the first behaviour change in a while, not just a move.**
`loadData` read `this.lastMonth = data.lastMonth || null`, and `lastMonth` is 0-INDEXED, so a stored
JANUARY (0) was coerced to `null`. The null guard in the detector then SKIPPED the month check entirely,
meaning **anyone whose last visit was in January silently lost their "new month" recap** when they
returned in February. `saveData` and `importData` had always stored it correctly (`importData` already
used `??`) — only the load path dropped it. All four tracking fields now use `??`, and a test asserts the
`|| null` form appears nowhere for them, so the coercion cannot creep back.

**The ISO week-number subtlety is the reason the detector compares the calendar year.** `isoWeekNumber`
returns the ISO week NUMBER, not the ISO week-YEAR, so a late-December date can return 1 and an early
January date can return 53. The collision is real and reachable: `2025-12-29` and `2026-01-01` are BOTH
week 1, so a user who visited on the Monday and returned on the Thursday shows no change in the week
number alone. That is exactly what the `lastYear !== currentYear` clause in the month and week checks is
for — without it the returning user loses the recap. Anyone "simplifying" that clause away reintroduces
the bug, so it is pinned by test. Two more behaviours were preserved verbatim rather than "fixed": the
YEAR check uses a strict `<`, so a BACKWARDS clock (stored year ahead of today) reports no year
transition; and the guards test `!== null` specifically, so the 0-is-a-real-value distinction is
load-bearing in the module too, not just in the load path.

`mainTransition` picks by the explicit `year > month > week` priority rather than array position. That is
currently equivalent to `transitions[0]` since the detector pushes in the same order, but the priority
encodes the INTENT independently of push order, and a test drives it with a deliberately out-of-order
array to lock the distinction. Because the method had no coverage to lean on, the swap was again guarded
by a THROWAWAY characterization baseline — a 10-case branch matrix (first-time user, all-null tracking,
same day, week-only, month+week, month-without-week, New Year, a January last-seen, a backwards clock,
null-week-real-month) plus 12 week-number dates across year boundaries and leap years — written pre-swap
and asserted `toEqual` post-swap, green on the first run, then deleted along with its JSON artifact once
the 29 permanent tests replaced it. Note the baseline drove `checkPeriodTransitions` with EXPLICIT field
values, so it was deliberately blind to the `lastMonth` load-path bug; that fix is covered by its own
5-test regression block instead, including an end-to-end "January visitor arrives in February" case that
asserts the pre-fix output was `['week']` and is now `['month', 'week']`. Whole suite now 1249/1249 jest +
`npm run typecheck` clean.

**`enchantment-lifecycle.js` — the 73rd slice, and `spell-lifecycle.js`'s sibling.** Nine pure functions
(`minutesToMs`, `isActive`, `expiring`, `stillActive`, `durationWindowMs`, `effectiveDurationMs`,
`effectiveCost`, `castEntry`, `expiryWarningDelay`) covering the active-enchantment state math. The point of
doing it right after the spell slice was to make the spell/enchantment **ASYMMETRY explicit rather than
implicit** — the two systems look alike and are not the same shape. Enchantments are keyed by `effect` (not
`spellId`), their catalog durations are in MINUTES (not ms), they have NO `-1` permanent / `0` instant
sentinels because every enchantment is timed, their records carry `totalDuration` (not `castedAt`), and —
the sharp edge — `hasActiveEnchantment` is a BARE effect match that does NOT re-check expiry inline the way
`SPELL_LIFECYCLE.isActive` does. It relies on `checkExpiredEnchantments()` having just pruned the array, and
every caller sweeps first. So `isActive` here deliberately keeps the bare match: folding an expiry check
into it would silently change behaviour at every call site that sweeps on a different clock read. Same
reasoning as the three spell sites that kept their bare `spellId` check. `expiring` and `stillActive` are
likewise kept as two SEPARATE filters instead of one partition, because the caller mutates `expiresAt` on
preserved entries BETWEEN the two passes and that ordering is load-bearing.

**The find was a duration-window rule duplicated with DISAGREEING tails.** "How long was this enchantment's
window?" was answered in two hand-maintained places with the same precedence but different fallbacks: the
Scholar Insight preserve path in `checkExpiredEnchantments` fell back to `0`, while the progress-bar
denominator in `enchantment-render.js` fell back to a bare `180` minutes — a literal that appears nowhere
else in the game. Legacy entries saved BEFORE `totalDuration` existed are exactly the inputs that reach
those tails, so the two copies could genuinely disagree on a real save. `durationWindowMs(entry, def,
fallbackMinutes)` states the rule once and takes the tail as an explicit PARAMETER, turning the asymmetry
into a visible argument instead of a buried literal. **Only the preserve path delegates, deliberately:** no
`*-render.js` module reaches for another extracted module (they take injected deps only), and
`enchantment-render.js` is documented as a byte-faithful move, so coupling it here would trade a duplicated
literal for a new load-order dependency. Instead `fallbackMinutes` EXPRESSES the render tail and a test pins
the two spellings to the same answer — the drift is caught rather than merely re-homed, and neither caller's
behaviour changes. One deliberate hardening rode along: the old preserve tail produced `NaN` for a catalog
entry with no `duration` (`undefined * 60000`), and since `NaN <= 0` is false the guard let it through and
wrote `expiresAt = now + NaN` — a permanently STUCK enchantment. Routing through `minutesToMs` yields `0`,
which the existing `<= 0` guard rejects cleanly. Unreachable with the current deep-frozen 13-entry catalog
(every entry has a duration, locked by a data-integrity test), so this is a latent-bug guard, not a
behaviour change. `effectiveCost` keeps its floor of 1 so the Scholar discount can never make an enchant
free. 43 new tests.

**`bounty-logic.js` — the 74th slice, and the one where the extraction was mostly an excuse to get the
Royal Bounty core under test at all.** The whole subsystem — the level gate, period keys/starts, deadlines,
the cadence→tier table, the anti-stage eligibility rule, the seeded pick, the record builders, the expiry
probe and the read-side helpers — had **ZERO coverage** before this slice. The two rules worth naming: the
**anti-stage rule** only admits quests created strictly BEFORE the period start, so a player cannot stage a
fresh quest to farm a guaranteed bounty (a quest created exactly AT the boundary is staged, and a legacy
quest with no `created` stamp counts as pre-period); and the **seeded pick** is deterministic per period key
plus salt, so a given week always yields the same bounty for a given pool and the premium reroll is just the
same function with a `'reroll'` salt. Preserved verbatim: the unlock gate's `|| 6` / `|| 7` tails mean a
CONFIGURED `0` also falls back to the default rather than unlocking at level 0 — `||`, not `??` — which is
now pinned by a test that names it as deliberate. `QUEST_LIST_KEY` is also intentionally WIDER than
`CADENCE_TIERS`: monthly no longer draws `yearly`/`epic`, but a bounty saved when it did must still RESOLVE
its quest so `refreshBounties` can discard and re-pick it, and that self-heal is covered end-to-end.

**Three invariants are pinned rather than merged, because each is knowledge that still lives in two places
and picking a winner would be a behaviour change, not a refactor.** (1) The Monday-start off-by-one
`dayOfWeek === 0 ? 6 : dayOfWeek - 1` is written verbatim here AND in `period-summary-logic.js`'s
`previousPeriodRange`, but the surrounding computations genuinely differ — this week's Monday at local
midnight vs the PREVIOUS week's Monday with time-of-day preserved — so instead of forcing a shared helper, a
test walks all seven weekdays and asserts the two agree on the weekday arithmetic. (2) There are **TWO live
ISO-week implementations**: the class's `getISOWeekNumber`/`getISOWeekYear` are LOCAL-time while
`period-summary-logic.js` carries its own UTC-based `isoWeekNumber`. Reconciling them would MOVE week
boundaries for users near midnight, so `bounty-logic.js` takes the week key INJECTED and a test walks both
across year-boundary dates at local noon (noon dodges the offset, so the comparison is timezone-independent).
That injection also let `_weekKey` collapse FOUR hand-written `${year}-W${week}` template literals — the
trial prompt, the theme card, the featured-theme analytics guard and the bounty period key — into one
method; four chances to reintroduce the `getFullYear()`-instead-of-week-YEAR bug the week-year helper was
added to fix, since the correct and incorrect spellings differ by a single character. (3) `isPastWindow` is
strictly `>` while `_soonestClaimableBounty` keeps its own inclusive `!(expMs > nowMs)` phrasing, so for
exactly one millisecond at `expiresAt` a bounty is still claimable but no longer nudge-worthy. That is
harmless — the reminder is an optimisation, the claim path is the authority — and changing either side is a
gameplay decision, so a test asserts the disagreement AND that they agree 1ms earlier.

Everything impure stayed on the class: `Date.now()`, the `activeBounties` writes, `saveData`, the chest
hand-off, the premium gate and upsell, the reminder re-arm, and the re-renders. Because the subsystem had no
coverage to lean on, the swap was guarded by a THROWAWAY characterization baseline that drove the REAL class
across an 8-date × 2-cadence matrix — period keys/starts/deadlines, the level gate on both onboarding
curves, tiers + eligibility, the seeded pick, and the full assign/complete/reroll/refresh state machine —
serialized with LOCAL calendar fields so the artifact was timezone-independent, then asserted `toEqual`
post-swap and deleted along with its JSON artifact once the 68 permanent tests replaced it. Those 68 include
a `class parity` block that re-drives every delegator against the module on identical inputs, so the thin
wrappers cannot drift from the rules they now import. Whole suite now 1366/1366 jest +
`npm run typecheck` clean.

**`recurring-logic.js` — the 75th slice, where the duplicated knowledge was a SEVEN-STRING LIST written
out four separate times, in two different orders.** The recurring-task scheduler had 5 tests (weekly match,
the duplicate guard, the inactive skip, monthly-date, and the generated-task shape) and **nothing at all for
`biweekly` or `monthly-weekday`** — precisely the two branches carrying real date math. Extracted pure: the
day vocabulary (`DAY_KEYS`, `DAY_ORDER`, `DAY_LABELS`, `DAY_LABELS_LONG`), `dayKeyFor`/`dayContext`,
`daysSince`, `occurrenceOfMonth`, `isLastOccurrenceInMonth`, the four-branch `dueToday`, the three guards
(`hasGeneratedToday`, `taskExistsFor`, `isPending`) and the `generatedTask` builder.

**The two day orders are genuinely different and must stay that way.** `DAY_KEYS` is Sunday-first because
it is indexed by `Date.getDay()`; `DAY_ORDER` is Monday-first because that is what every picker shows. The
generator, `finishRecurringTaskSetup` and `showMultiSelectDays` each carried their own copy, so a
well-meaning "let's reuse that array" was a one-line change that would have shifted every weekly schedule by
a day — silently, since both spellings are seven lowercase three-letter strings. The module now names both
and a test asserts they are NOT interchangeable by showing `DAY_KEYS[sunday.getDay()] === 'sun'` against
`DAY_ORDER[sunday.getDay()] === 'mon'`. `recurring-render.js` keeps its inline `dayLabels` on purpose — it
takes injected deps only and never reaches for another module — so instead of re-homing that fourth copy, a
test drives the REAL builder across all seven keys and asserts it agrees with `DAY_LABELS`, which CATCHES
the duplication rather than merely relocating it.

**`BIWEEKLY_MIN_DAYS = 13` is preserved verbatim, and the reason is now written down and tested.** The
comparison mixes a local-noon `Date` against a bare `'YYYY-MM-DD'` stamp that parses as UTC midnight, so a
true fortnight floors to `14 + floor((12 - offset) / 24)` — 15 at UTC-12, 14 in the middle, and **13 at
UTC+14**. A tidy-looking `>= 14` would therefore make far-eastern users skip a fortnight entirely. A test
walks the offset from -12 to +14 by constructing the UTC instants directly, so the rule is pinned without
touching the machine's timezone. Also preserved: biweekly stamps **both** `lastGenerated` fields (its own
`recurrence.lastGenerated` anchor and the task-level day guard) while every other type stamps only the
latter, and `taskExistsFor` matches on all THREE of title, due date and parent id — so a same-named task
from a different parent does not suppress generation.

One deliberate hardening rather than a pure lift: `dueToday` treats a missing/corrupt `days` as "not due"
instead of throwing. Previously a single malformed weekly entry threw out of the load-time sweep and took
every LATER recurring task with it; a test now drives a corrupt entry ahead of a good one and asserts the
good one still generates. Impure remainder on the class: `getTodayDateString`, `uniqueId`, the `created`
timestamp, the `dailyTasks` push, `saveData` and the re-render. The swap was guarded by a throwaway
characterization baseline over a 30-case matrix (all four branches, the Sunday/Saturday index boundaries,
the biweekly window, `week: -1` in both a 4- and a 5-occurrence month, and every guard), asserted `toEqual`
post-swap and then deleted with its JSON artifact once the 44 permanent tests — including a `class parity`
block — replaced it. Whole suite now 1410/1410 jest + `npm run typecheck` clean.

**`save-serializer.js` — the 76th slice, where `_doSave` was the last untested save-data surface.** The
`JSON.stringify` call carried a 90-field object literal with two `||`-fallen date-stamp defaults
(`lastHabitReset` defaulting to today and `lastWeekReset` defaulting to the current week key) plus a
`premiumPurchaseToken || null` fallback. Extracted pure: `buildSaveData(manager, { todayString, currentWeekString })`,
a field-by-field builder that keeps every historical default and fallback while making the save field map
independently testable. `_doSave` now caps `archivedGoals`/`bossLog` via `PERSISTENCE_MIGRATIONS` and delegates to
`SAVE_SERIALIZER.buildSaveData(this, { todayString: this.getTodayDateString(), currentWeekString: this.getWeekString(new Date()) })`,
then `JSON.stringify` and `localStorage.setItem` stay on the class as the thin I/O wrapper. The module follows the
dual-environment pattern: a browser `<script>` before `goal-manager.js`, included in `scripts/copy-web.js` for the
Capacitor build, and `module.exports` for the Jest harness. 10 new unit tests in `tests/save-serializer.test.js` cover the
full key set, field mapping, `CLASS_SCHEMA_VERSION` capture, both date fallbacks, the `premiumPurchaseToken || null`
default, non-mutation, and JSON round-trippability. A follow-up 8-test `export → import round-trip parity (backup files)`
suite in `tests/goal-manager.test.js` — using the `makeFullManager` fixture in `tests/fixtures/full-manager.js` — drives
`buildSaveData` through `JSON.stringify/parse` into `importData` and asserts every saved key is restored on a fresh
manager. It caught a half-dozen dropped fields in `importData` (`companion`, the weekly-theme/bounty state,
`lastHabitReset`, `lastWeekReset`, `freeCastUsedDate`, `activeBounties`, `lastBountyClaim`) and several `||`-masked
booleans (`tutorialCompleted`, `isPremium`, `progressiveUnlockInitialized`, `referralRewardClaimed`); the test fixture
keeps `tutorialCompleted` at its production default so a dropped field cannot hide. `importData` was updated to restore
every field `buildSaveData` exports and to use `??` for those flags. 18 new tests total. Whole suite now 1428/1428 jest +
`npm run typecheck` clean.

**`load-deserializer.js` — the 77th slice, the MIRROR of the 76th, closing the persistence field map from
both ends.** The save side is a straight read; the LOAD side is where every default and fallback lives, and
those are not inert — the 71st slice's suppressed-January-recap bug was one `||` in exactly this block
(`lastMonth` is 0-INDEXED, so a stored January coerced to the "never seen" default). Extracted pure:
`buildLoadState(data, { todayString, classSchemaVersion, defaultSessionMinutes, normalizeClassId })`, a
field-by-field builder returning a plain patch that `loadData` `Object.assign`s onto the instance. Every
non-obvious rule came along and is now an assertable unit: the four `??` period stamps, `classSelectedAtLevel ?? null`,
the `totalGoldEarned ?? (goldCoins || 0)` v2.8 seeding migration (absent vs present-and-0), the
`Array.isArray` guard on `repairableStreaks`, the `titleStyle` normalizer, the level-branching
`accountCreatedDate` Beginner's Blessing migration, the lone `highPriorityXpDate` → `_highPriorityXpDate`
rename, the CONDITIONAL `pomodoroChainSettings` key (omitted, not `undefined`, so the constructor default
survives `Object.assign`), and the 7-field class schema gate whose both branches always write all 7.
`normalizeClassId` is INJECTED, so the module keeps no dependency on `persistence-migrations.js`'s load
order. What stayed on the class is exactly what is impure or instance-shaped: `JSON.parse` + the corrupt-save
backup rotation, the derived `goalTabUnlockLevels`, the companion-collection migration that pushes onto the
loaded array, and the `PERSISTENCE_MIGRATIONS` passes that mutate the loaded lists in place. The old
source-text guard asserting `this.<field> = data.<field> ?? null` was repointed at the new module rather
than deleted. 39 new unit tests. Whole suite now 1467/1467 jest + `npm run typecheck` clean.

**Round-trip parity — the 78th slice, and the point of having done 76 and 77.** Both halves were pinned
individually, but nothing yet caught the classic persistence bug: a field added to ONE half and forgotten in
the other. `tests/persistence-roundtrip.test.js` drives `buildSaveData` → `JSON.stringify/parse` (what
`localStorage` actually does) → `buildLoadState` and asserts the two agree FIELD-FOR-FIELD in BOTH
directions: every saved key is read back (else it silently resets on the next cold boot), and every loaded
field is written by someone (else it is null forever). The two legitimate asymmetries are declared as
constants at the top — `SAVE_ONLY_KEYS = ['classSchemaVersion']` (written from the constant, read as a
GATE, never instance state) and `SAVE_TO_INSTANCE_RENAMES = { highPriorityXpDate: '_highPriorityXpDate' }`
— so introducing a THIRD asymmetry fails the suite until it is deliberately documented there. Beyond the
key sets it pins values: a fully-populated manager survives the trip unchanged (including a January
`lastMonth` of 0), `save(load(save(m)))` is a FIXED POINT, and a schema-version bump drops the 7 class
fields AND NOTHING ELSE. Two fixture-health tests keep the parity honest — one fails if the fixture leaves
any save key `undefined` (a new field would otherwise slip through untested), the other fails if any
fixture value coincides with its load-side default (which would let a dropped field pass by luck). No
production change was needed: the halves were already in parity, which is now a fact under test rather
than an assumption. 14 new tests. Whole suite now 1481/1481 jest + `npm run typecheck` clean.

**`title-definitions.js` — the 79th slice, the TWIN of the badge de-drift.** The achievement-title list was
hand-maintained in TWO places: the ~40 hardcoded `if (stat >= N && !hasTitle('id')) unlockTitle('id', 'Name', 'Desc')`
threshold checks in `goal-manager.js`'s `checkTitleUnlocks`, AND the presentational `titleCategories` catalog
inside `title-render.js` (the same ~40 ids/names/descriptions/rarities, grouped by category for the gallery).
Change one and forget the other and a title either unlocks but renders as `???`, or shows in the gallery yet
never unlocks — exactly the two-copies-of-one-list drift the July 2026 loot bug was. Extracted a single
deep-frozen dual-env catalog: THRESHOLD titles carry `{ type, target }` (a stat key + the unlocking count) and
the two externally-granted Login-Streak Milestones (`centurion`/`mythic_warrior`, granted by the daily-login
flow, not by `checkTitleUnlocks`) omit them but stay in the catalog so the gallery renders them. The pure
`computeUnlockableTitles(stats, unlockedTitles)` derives every unlock from the catalog in declared order,
skipping typeless titles and ids already owned (tolerating both object records and bare-string ids).
`checkTitleUnlocks` now gathers its stats into a `{ tasks, habits, level, streak, lifeGoals, weeklyGoals,
monthlyGoals, yearlyGoals, gold, chests, focus, spells, bosses, companions }` map and delegates, and
`title-render.js` reads `TITLE_DEFINITIONS.categories` instead of its inline copy — one source of truth, no
drift possible. Two wording-only differences the OLD unlock path stored (`quest_master`/`grand_master` said
"...quests" vs the gallery's "...tasks") now match the gallery, exactly as the badge slice accepted for its
vestigial `description`; every displayed name is byte-unchanged. Dual-environment wiring mirrors
`achievement-definitions.js`: a browser `<script>` before `goal-manager.js` AND `title-render.js`, included in
`scripts/copy-web.js`, and `module.exports` for Jest. 17 new unit tests in `tests/title-definitions.test.js`
cover the frozen catalog shape, the threshold-vs-external split, exact `>=` thresholds, already-owned
skipping, null-input tolerance, declared order, and input non-mutation. Whole suite now 1498/1498 jest +
`npm run typecheck` clean.

**`daily-quest-logic.js` — the 80th slice, closing the daily-board pair.** The render half went out in
the 50th slice (`daily-board-render.js`); this is its save/load-style logic sibling. Two inline bodies had
ZERO isolation coverage and both carry real logic: `generateDailyQuestBoard`'s date-seeded deterministic
shuffle + level-eligibility filter (a Lehmer/Park-Miller LCG — `s = (s * 16807) % 2147483647` — seeded from
the `'YYYYMMDD'` stamp so a given calendar day ALWAYS rolls the same three quests for a given level, the
whole contract behind a board surviving a reload without re-rolling), and `checkDailyQuestCompletion`'s
`def.check(tracking)` sweep. FOUR pure functions: `seededShuffle(items, dateString)` (a NEW array, input
untouched), `pickDailyQuests(pool, level, dateString, count=3)` (filter → shuffle → slice → fresh
`{ id, completed:false, claimed:false }` records), `buildDailyQuestBoard(...)` (the full `{ date, quests,
allClaimedBonus:false }` record the save/load path round-trips and `daily-board-render.js` reads), and
`sweepQuestCompletions(quests, pool, tracking)` (MUTATES the quest records in place, matching the original,
and RETURNS whether any NEW completion happened so the caller keeps its `if (anyNewCompletion) { saveData();
render(); }` guard). The `DAILY_QUEST_POOL` catalog stays a CLASS FIELD and is INJECTED — its entries carry
`check(tracking)` CLOSURES (not JSON data) and three other methods (`claimDailyQuest`,
`renderDailyQuestBoard`) read it, so passing it in keeps this a clean logic slice with no new load-order
dependency (exactly the candidate note's prescription). The `allHabitsComplete` stat update (reads
`this.habits`) and the `saveData`/`render` side-effects stay on the class. `generateDailyQuestBoard` and
`checkDailyQuestCompletion` became thin delegators; the existing daily-board render + `trackDaily` tests
stayed green UNCHANGED. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. 20 new unit
tests in `tests/daily-quest-logic.test.js` lock the module — the shuffle's determinism / non-mutation /
permutation + a byte-for-byte LCG parity check, the level filter + count + fresh-record stamping + null-pool
tolerance, the board shape + JSON round-trip, and the sweep's pass/fail/already-done/absent-id/null-input
branches + in-place mutation. Whole suite now 1518/1518 jest + `npm run typecheck` clean.

**`wooden-chest-loot.js` — the 81st slice, killing the SECOND weighted-pick copy.** `claimWoodenChest`
hand-rolled a cumulative-weight loot pick over an inline 8-entry table — a second copy of what
`loot-engine.js`'s `weightedRandomSelect` already does, exactly the duplicated-knowledge drift class this
whole roadmap item was created to kill. Extracted the frozen `TABLE` (weights 30/18/22/8/8/5/5/4, total 100,
byte-identical to the literal) + `weightedPick(table, rng)`, and `claimWoodenChest` now rolls through it
(`() => this.rng()` keeps the RNG seam) then dispatches the reward + cinematic + `saveData`/`render` as
before — none of that impurity moved. It is DELIBERATELY not merged with `loot-engine.js`'s pick: the two
differ in behaviour, not just style — on a float-drift overshoot loot-engine returns the LAST item while the
wooden loop seeds `table[0]` and returns the FIRST, and the wooden table carries fixed `amount` + `label`
(the reward IS the entry) rather than loot-engine's `[min,max]` ranges routed through `buildLootReward`. So
the module keeps its own pick and a test PINS the fallback disagreement against `LOOT_ENGINE.weightedRandomSelect`
(the same "pin the disagreement rather than force a merge" call the bounty slice made). NEW module,
registered in the usual three places (index.html `<script>` before goal-manager.js, `scripts/copy-web.js`,
the jest harness) + the module-scoped capture const. 11 new unit tests in `tests/wooden-chest-loot.test.js`
lock it — the frozen table + exact weights, per-window boundary + midpoint picks, a byte-for-byte parity
check against the original inline loop across 101 rolls, the first-entry drift fallback, and the
in-range-agree / fallback-diverge relationship with loot-engine. Whole suite now 1529/1529 jest +
`npm run typecheck` clean.

**`quest-chain-logic.js` — the 82nd slice, the render sibling's logic half.** The three progression methods
(`toggleChainTask`, `completeChapter`, `completeQuestChain`) interleaved pure state transitions with heavy
impurity — reward grants, toasts, confetti (+ two `setTimeout` bursts), a Chain-Master badge unlock, and
`saveData`/`render`. This slice lifted ONLY the state math out into five pure functions: `toggleTaskIndex`
(add/remove an index, new array, no mutation), `isChapterComplete` (the `completedTasks.length ===
chapter.tasks.length` predicate the toggle's add-only-on-check invariant makes exact), `advanceChapterState`
(the `{ currentChapterIndex + 1, completedTasks: [] }` patch), `isChainComplete` (`currentChapterIndex >=
chapters.length`) and `completeChainLists` (the active→completed move as new arrays, stamping `completedAt`,
matching the identical filter-by-id both the template-present and template-missing branches used). Everything
impure stayed on the class in the SAME order, and the completion double-branch was refactored to share the
list move then early-return before the celebration when the template is missing — behaviour-identical. It is
the SIBLING of `quest-chain-render.js` (the 7th render slice), the same save/load-style view-then-logic split
the daily-board pair used. NEW module, registered in the usual three places (index.html `<script>` before
goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped capture const. 21 new unit
tests in `tests/quest-chain-logic.test.js` lock it — the toggle's add/remove/round-trip/no-mutation/null
tolerance, the chapter-complete predicate incl. the empty-chapter + missing-tasks edges, the advance patch's
non-mutation, the chain-complete boundary (within / at-count / past / missing-template), and the list move's
by-id removal, `completedAt` stamp, input non-mutation, order preservation and null tolerance. Whole suite
now 1550/1550 jest + `npm run typecheck` clean.

**`habit-logic.js` — the 83rd slice, the LOGIN-streak module's habit-streak twin.** `recalculateHabitStreak`
carried a drift-prone consecutive-day date walk: sort the completion history newest-first, bail to streak 0
if neither today nor yesterday is present, else step a mutable `currentDate = new Date()` backwards counting
matched days (with a one-day grace for an as-yet-uncompleted today) up to a 365-day cap. This slice lifted
that into a pure `computeHabitStreak(completionHistory, { today, yesterday, dateStringDaysAgo })` returning
`{ streak, lastCompleted? }` — the walk now asks the injected `dateStringDaysAgo(n)` seam for each day string
(mirroring the class's `dateToLocalString(currentDate)` day-for-day; the wrapper supplies `today =
dateStringDaysAgo(0)`, `yesterday = dateStringDaysAgo(1)`), and `lastCompleted` is present ONLY on the
counted-streak return so the two streak-0 early-returns leave `habit.lastCompleted` untouched exactly as
before. Two smaller inline rules came along: `streakIncrement(doubleStreakActive)` (the Precision
`double_streak` 2-vs-1 advance in `toggleHabit`) and `milestoneTier(streak)` (the exact 7/30/100 thresholds
`toggleHabit` fires the week/month/life achievements at — removing those magic numbers from the God class
while the toast copy + share prompts stay inline as presentation). It is the HABIT-streak COUNTERPART to
`streak-logic.js`'s LOGIN streak (separate features — one-per-player gap-tolerant login vs one-per-habit
history walk — so separate modules) and the LOGIC SIBLING of `habit-render.js` (the same view-then-logic
split the daily-board and quest-chain pairs used). NEW module, registered in the usual three places
(index.html `<script>` before goal-manager.js, `scripts/copy-web.js`, the jest harness) + the module-scoped
capture const. 14 new unit tests in `tests/habit-logic.test.js` lock it — via a fixed-anchor UTC
`dateStringDaysAgo` harness: empty/null history, a lapsed streak, today-only, a 5-day run, the day-0 grace
(reaching only yesterday), a mid-run gap, unordered-input `lastCompleted`, input non-mutation, the 365-day
cap, a month/year boundary, the increment rule, and the milestone thresholds incl. the null default. Whole
suite now 1564/1564 jest + `npm run typecheck` clean.

**`default-state.js` — the 84th slice, the FIRST taken directly against Definition-of-done criterion (2).**
The default value of every persisted field lived in TWO hand-maintained copies: `initState()` set
`this.x = <default>` for a fresh install, and `buildLoadState()` wrote `d.x || <default>` for a save lacking
the field — ninety-odd fields, the exact duplicated-knowledge shape behind the July 2026 loot bug, sitting
in the persistence path itself. Writing the module surfaced three drifts on day one: `lastHabitReset`,
`lastWeekReset` and `premiumPurchaseToken` were `null` after a load but `undefined` after `initState`
(never assigned; every consumer is a truthiness check, so harmless — this time). The module exports
`persistedDefaults({ defaultSessionMinutes })` — a FACTORY, not a frozen literal, because the `[]` / `{}` /
`{ weekly: null, monthly: null }` defaults are mutated in place by the game and two managers (or a manager
and a load pass) must never share one; `focusSessionLength` stays injected because `FOCUS_SESSION_LOGIC`
owns that number — plus two frozen field lists: `SIMPLE_FIELDS` (load rule is plain `d[key] || default`)
and `SPECIAL_FIELDS` (the eight documented non-`||` rules + the class schema gate + the one save-key
rename). `initState` now `Object.assign`s the factory output and keeps ONLY session state, derived
catalogs and tuning constants inline (~130 lines gone); `buildLoadState` loops `SIMPLE_FIELDS` against the
same object and keeps the specials explicit, each reading its fallback from `defaults.<f>`. Behaviour is
identical — the 39 deserializer tests, the round-trip parity suite and the `??`-guard source test all pass
unchanged (the guard was repointed at the new `?? defaults.<f>` form, not weakened). Wiring differs from the
usual recipe in one way: the `<script>` must precede `load-deserializer.js`, not just `goal-manager.js`, and
the deserializer resolves `DEFAULT_STATE` from `window` or `require` at load time. 13 new unit tests in
`tests/default-state.test.js` lock it — fresh-object-per-call, injected session length, pinned seed values,
`SIMPLE ∪ SPECIAL == keys(defaults)` with no overlap, an EMPTY save loading to the defaults field-for-field
(with `accountCreatedDate` pinned as the one deliberate migration exception), no aliasing across load
calls, and defaults↔`buildSaveData` key parity (the schema gate + conditional chain settings as the only
save-only keys). Whole suite now 1577/1577 jest + `npm run typecheck` clean.

**`feature-unlocks.js` — the 85th slice, the criterion-(2) sweep of the remaining `initState` tables.** The
sweep queued after the 84th slice audited the four tables still inline in `initState` for second copies.
`challengePresets` was single-sourced (every reader goes through `this.challengePresets`) and STAYS inline —
recording a "no extraction needed" is as much the point of the sweep as extracting. The feature-unlock
knowledge was not: "Arcane unlocks at 3" was `arcane: 3` in the table AND a bare `this.level === 3` in
`checkFeatureUnlocks`' welcome-spell grant; "companions unlock at 3" was a bare literal in THREE places
(`loot-engine.js`'s companion→gold fallback, the Player Panel companion-section toggle, `openCompanionDen`
+ its toast copy) and in the unlock table not at all; the `requiredLevel === undefined || level >= requiredLevel`
predicate was written three times (`isFeatureUnlocked` / `isGoalTabUnlocked` / `isArcaneTabUnlocked`); the
desktop-nav "More" collapse rule `typeof req === 'number' && req >= level + 2` twice; and the level-keyed
TUTORIALS were tied to the view-keyed LEVELS by nothing. The module exports the frozen `LEVELS`,
`ARCANE_TAB_LEVELS` and `TUTORIALS` tables, `COMPANION_UNLOCK_LEVEL` (DEFINED as `LEVELS.arcane`, since it is
the same beat), `NAV_MORE_HORIZON`, and the two predicates `isUnlocked(levels, key, level)` / `isFarOff(req,
level)`. `initState` now points the three instance fields at the frozen tables (`goalTabUnlockLevels` stays
derived from the onboarding path), the three predicates and both collapse sites delegate, the welcome spell
reads `this.featureUnlockLevels.arcane`, and both class companion gates + `loot-engine.js` read
`COMPANION_UNLOCK_LEVEL` — loot-engine resolves it from `window`/`require` at load time, so the `<script>`
must precede `loot-engine.js` (the same order note the 84th slice added for the deserializer). Behaviour is
identical; every existing unlock/nav/tutorial/loot test passed unchanged. 16 new unit tests in
`tests/feature-unlocks.test.js` lock it — frozen tables, pinned thresholds, spellbook≡arcane and
enchantments≡focus, companion≡arcane, EVERY gated view has a tutorial at exactly its level (the consistency
nothing enforced before), the 2/3/4/5/6/8/10 tutorial set, the `isUnlocked` absent/below/at/above cases against
the shipped tables, the `isFarOff` horizon incl. non-numeric thresholds and the level-1 collapse set, and
loot-engine's gate firing exactly below the constant plus a source guard that the bare `level < 3` is gone.
Whole suite now 1593/1593 jest + `npm run typecheck` clean.

*Follow-up (same day, no new module).* Two loose ends the slice queued. (a) The locked-nav / locked-tab
teaser copy in `_lockedNavMessage` / `_lockedTabMessage` keys on the same ids as the unlock tables but nothing
checked coverage — the L5 test that hardcoded five view names now DERIVES the gated set from
`FEATURE_UNLOCKS.LEVELS`, and a sibling does the same for `ARCANE_TAB_LEVELS` + the default goal-tab curve
against `_lockedTabMessage`, each asserting a real NAME (not the raw id echoed by the unknown-key fallback) and
a teaser. (b) A per-site audit of the remaining bare `level <op> N` literals in `goal-manager.js`: the referral
bonus `level < 2` was a product threshold stated TWICE (guard + the "Reach Level 2 for a bonus chest!" toast)
and the review prompt's `level < 3` a product threshold stated once — both named in `feature-unlocks.js` as
`REFERRAL_REWARD_LEVEL` / `REVIEW_PROMPT_MIN_LEVEL` (it is already the level-gates module) with a source-guard
test; the `level > 1` retroactive-tutorial sweep, the `level <= 1` brand-new-install heuristic and the
`level >= 2` dashboard-stats reveal are incidental "past the floor" checks OR'd with other signals, so they
stay as literals by decision. 1596/1596 jest + `npm run typecheck` clean.

</details>

### Recent slices (86–90) — the worked examples for the next one

Kept as prose because these are the current recipe references; when a new slice lands, move the
oldest of these into the archive above and add its row to the logic table.

**`chest-weight-logic.js` — the 86th slice, the first from the Sep 7 audit queue.** `generateChestRewards`
took balance.js's per-tier rarity weights and applied three modifiers inline before the loot-engine roll: the
Lucky Loot enchantment's 15-point upward shift, the Ranger Keen Eye perk's `loot_weight`-point shift, and
the Lucky Draw spell's common→upper redistribution. The first two were the SAME nine-line block pasted twice
(pull from common, then uncommon when common runs short, push `ceil(half)` to rare and `floor(half)` to
epic) — exactly the duplicated-rule shape criterion (1) targets, and the reason the audit ranked it first.
The module exports `shiftWeights(weights, amount)` (the one shift, with `amount <= 0` returning an unchanged
copy), `luckyDrawFloor(weights)` (zero common, split it 40/30/20/10 floored — including the one-point loss
the original's flooring had on royal's 5 common weight, pinned rather than "fixed"), and
`applyChestModifiers(weights, { luckyLoot, rangerWeight, luckyDraw })` composing them in the original order;
all three return NEW objects. `generateChestRewards` now makes one call. Behaviour-identical: the
`lucky_loot chest weight shift` and Ranger `loot_weight` behavioural suites passed unchanged. NEW module,
registered in the usual three places + the capture const. 17 new unit tests in
`tests/chest-weight-logic.test.js` — common-only vs common+uncommon pulls, the supply cap, odd-amount
rounding (extra point → rare), total-weight preservation, the `<= 0`/NaN/undefined no-op, non-mutation,
lucky-draw shares + the flooring loss, the composite's additive stacking (15 + 12 = 27) and lucky-draw-last
ordering, and a PARITY ORACLE: the original inline arithmetic transcribed verbatim, asserted equal across
every balance.js chest tier × {lucky loot} × {ranger 0/12} × {lucky draw}. Whole suite now 1613/1613 jest
+ `npm run typecheck` clean.

**`boss-streak-logic.js` — the 87th slice (32nd LOGIC module), second from the Sep 7 audit queue.**
`onBossDefeated` picked the streak counter for the boss cadence with a ternary chain, computed "+10% per
consecutive kill, capped at +100%" as `1 + min(streak - 1, 10) * 0.1` inline, rounded XP and gold through
it, and trimmed the defeated-boss gallery to 50 with a bare literal. Now `streakForBossType(bossType,
streaks)`, `streakMultiplier(streak)`, `applyStreakBonus(amount, multiplier)` and `archiveDefeated(list,
entry)` (newest-first, `DEFEATED_HISTORY_CAP` = 50, returns a new array — the `challenge-logic.js`
`archiveCompleted` twin). The streak-0 case follows the same line down to 0.9× — unreachable in production
(the counter is incremented first) but pinned rather than special-cased so the module stays byte-faithful.
`onBossDefeated` keeps the counters, log line, `addXP`/`addGold` and celebrations. 17 unit tests in
`tests/boss-streak-logic.test.js` incl. a parity oracle across boss types × streaks × reward amounts, and
the archive's prepend / cap / non-mutation / null-history cases. (Verification note, Sep 9: the cap was
left inline by the first pass and the header mis-stated the streak-0 baseline; both fixed on review.)

**`companion-logic.js` extended — the 88th slice, the second from the Sep 7 audit queue.**
`grantCompanionXP` still carried three rules inline: the Bonding enchantment's flat `×2`, the Ranger
Beastmaster perk's `ceil(xp * (1 + mult))` scale (applied AFTER bonding, in that order), and a `while`
loop walking the `100 * level` level-up threshold so one large XP gain can carry a companion through
multiple levels. Rather than a new module, this folds into the EXISTING `companion-logic.js` (the 60th
slice's slot/bonus-resolution sibling) as two more pure functions: `companionXpGain(amount, { bondingActive,
rangerCompXpMult })` returns the scaled gain, and `applyCompanionXp(companion, xpGain)` adds it and walks
the level-up loop, mutating the handed companion in place (the `persistence-migrations.js` convention) and
returning whether it leveled at least once. `grantCompanionXP` keeps the post-level-up side effects
(`effectsManager.companionLevelUp`, `showAchievement`) and is now a thin two-call wrapper. Behaviour-
identical: the existing Beastmaster "+50% companion XP" / "non-Rangers gain the base amount" tests passed
unchanged. 8 new unit tests lock the two functions in isolation (bonding-only, Beastmaster-only, stacked
order, non-positive-mult no-op, under-threshold/exact-threshold/multi-level-up/missing-field edge cases)
plus 2 new delegator-parity tests (a stacked-buff grant, and a 350-XP grant that clears two thresholds and
fires the Lv.3 achievement — the previously-untested multi-level-up path). Whole suite now 1636/1636 jest
+ `npm run typecheck` clean.

**`challenge-logic.js` — the 89th slice (33rd LOGIC module), third from the Sep 7 audit queue.** Moves
`challengePresets` (data half) plus `challengeRewards` (difficulty→{xp,gold}, medium fallback),
`challengeProgress(challenge, snapshot)` (custom/daily/cumulative/delta, 100 clamp) and
`archiveCompleted` (50-cap) out of the class; the three methods are now thin delegators. 19 new tests in
`tests/challenge-logic.test.js`. 1655/1655 jest + typecheck clean.

**`reward-economy.js` extended — the 90th slice, fourth from the Sep 7 audit queue.** `applyForage` still
carried the Ranger Forage capstone's hit-roll + `10 + floor(rng()*11)` bonus-gold math inline — too small
a rule for its own module, so it folds into the existing `reward-economy.js` as `forageReward(chance, rng)`,
returning `{ gold, crystals }` or `null` on a miss. `rng` is called at most twice in the original order
(hit-check, then amount), so single-value RNG mocks stay behaviour-identical. `applyForage` keeps the
`focusCrystals` write and toast; existing Forage tests pass unchanged. 5 new unit tests. 1660/1660 jest +
typecheck clean.

### Criterion (1)/(2) audit (Sep 7, 2026) — the finish line for the logic front

After 85 slices the per-slice "find the next duplicated thing" search was hitting diminishing returns (the
85th found one duplicated cluster and one already-clean table). Rather than keep slicing open-endedly, this is
ONE bounded audit of `goal-manager.js` whose output is the complete remaining list. **When every row marked
→ extract or → single-source below is done, criteria (1) and (2) are ✅ and the logic front closes.** Rows
marked *inline by decision* are the answer to "why is this still on the class" — do not re-audit them.

**Method.** Enumerated the ~600 class methods, then flagged every non-comment line matching the rule-math
shapes criterion (1) names: reward arithmetic (`Math.floor/round/ceil(... * ...)`, `* <const>`,
`* <multiplier>`), numeric thresholds (`>= NN`, `.length > N`), and resource writes (`gold/xp/crystals/charges
+=`). 107 methods hit; ~90 were display percentages, cosmetic particle budgets, timer arithmetic, toast copy or
list caps and were dismissed on sight. The remaining rule-bearing sites were read and each checked for a
second copy in the extracted modules, `index.html` and the definition catalogs.

**→ extract (criterion 1) — queued as slices 86–90, in this order:**

| # | Site | Rule still on the class | Target |
|---|---|---|---|
| ~~86~~ | ~~`generateChestRewards`~~ | ~~the weight-shift block written TWICE + the Lucky Draw redistribution~~ | ✅ done — `chest-weight-logic.js` (see Recent slices) |
| ~~87~~ | ~~`onBossDefeated`~~ | ~~boss streak multiplier + XP/gold rounding; `defeatedBossList` cap 50~~ | ✅ done — `boss-streak-logic.js` (see Recent slices) |
| ~~88~~ | ~~`grantCompanionXP`~~ | ~~Bonding `×2`, Beastmaster `ceil(xp * (1+mult))`, the `100 * level` multi-level-up loop~~ | ✅ done — extended `companion-logic.js` (see Recent slices) |
| ~~89~~ | ~~`getChallengeRewards` / `getChallengeProgress` / `completeChallenge`~~ | ~~difficulty→{xp,gold} table, progress % with the 100 clamp, `completedChallenges` cap 50~~ | ✅ done — `challenge-logic.js` (see Recent slices) |
| ~~90~~ | ~~`applyForage`~~ | ~~Ranger Forage `10 + floor(rng*11)` bonus gold + 1 crystal~~ | ✅ done — extended `reward-economy.js` (see Recent slices) |

**→ single-source (criterion 2) — ✅ all five landed Sep 9, 2026 (22 tests, 1686/1686):**

- ~~**Execute threshold stated twice.**~~ `executeBossBySpell` now guards on `COMBAT_DAMAGE.isExecuteRange(boss)`
  — the same predicate the Executioner capstone uses. Boundary tests at 25/26 HP of 100 + a source guard that
  `hpPercent > 25` is gone.
- ~~**Theme achievement thresholds stated twice.**~~ `theme-definitions.js` golden/shadow now carry
  `unlock: { goldEarned: 10000 }` / `{ bossesDefeated: 25 }`; `checkRewardUnlocks` is ONE catalog loop that
  evaluates any `unlock` stat table against the lifetime counters (level-gated themes unchanged; `special`
  copy with no `unlock` table is never auto-unlocked). Tests: catalog fields, copy quotes the numbers, a
  changed threshold is followed, and a source guard against the old literals.
- ~~**`DAILY_QUEST_POOL.minLevel` restates the unlock ladder.**~~ Pool moved to `daily-quest-definitions.js`
  (13th data catalog) with every gate DEFINED as `FEATURE_UNLOCKS.LEVELS.<view>` or
  `FEATURE_UNLOCKS.GOAL_TAB_LEVELS.default.<tab>`, a `feature` key per quest and `featureLevel(q)` so the
  test `minLevel === featureLevel(q)` holds for all 20. The goal-tab curves themselves moved from
  `getGoalTabUnlockLevelsForPath` into `feature-unlocks.js` (`GOAL_TAB_LEVELS`, `goalTabLevelsForPath`) to
  make that possible. **User-visible fix:** `side_adventurer` / `weekly_warrior` now appear from level 2, not 6.
- ~~**Daily Board Sweep bonus stated twice.**~~ `DAILY_QUEST_DEFINITIONS.BOARD_SWEEP_BONUS = { xp: 25, gold: 15 }`;
  the grants and the toast both read it.
- ~~**Habit tiers vs badge targets.**~~ `HABIT_LOGIC.MILESTONES` is now DERIVED at load from the `streak`-type
  badges in `achievement-definitions.js` via `TIER_BY_BADGE` (week_warrior→week, month_master→month,
  centurion→life); test asserts the table equals the catalog's targets.

**Inline by decision (do not re-audit):**

- Display percentages — `calculateProgress`, `updateChecklistProgress`, `_statBreakdownRate`, the period
  summary `completionRate`s: `round(done/total*100)` is presentation, not a rule.
- `toggleTask`'s `hour < 12` / `hour >= 18` daily-tracking buckets — they define the `tasksBeforeNoon` /
  `tasksAfter6pm` counters the quest pool reads; the quest `desc` copy says "noon" / "6pm". Acceptable as-is;
  if the pool moves to a definitions module, the two hours can move with it as named constants.
- List caps (`defeatedBossList` / `completedChallenges` at 50) travel with their slices above; the
  persistence-side pruning in `persistence-migrations.js` is the load-time counterpart and stays.
- Beginner's Blessing day math — already reads `BEGINNER_BLESSING_DAYS`; the `(today - created) / 86400000`
  is date plumbing.
- Everything cosmetic: particle budgets, confetti counts, toast durations, animation timings, `darkenColor`.
- Orchestration that only SEQUENCES delegated rules (`addXP`, `addGold`, `checkLootDrop`, `levelUp`,
  `completeFocusSession`, `_completeLoginBonus`, `checkPeriodTransitions`, `rolloverIncompleteTasks`) — their
  arithmetic already lives in `leveling-logic` / `reward-economy` / `buff-multipliers` / `crystal-economy` /
  `streak-logic` / `period-summary-logic`; what remains is `this.x += result` and side effects, which is what
  criterion (1) says the class keeps.

**Exit — reached Sep 9, 2026.** Slices 86–90 and the five single-source items are all done; criteria (1)
and (2) are marked ✅ in the Definition of done. The active front is criterion (3) (ES modules) — see the
plan under #3. Any future "is this rule inline?" question is answered by the *Inline by decision* list above.

Done so far from earlier queues: ~~persisted defaults~~ (84), ~~initState tables~~ (85), ~~teaser coverage +
bare level literals~~ (85 follow-up).

**Method:** read the target, write the pure module first (`// @ts-check`, deep-frozen where it's data,
`module.exports` + `window.X` dual-env), wire it into `index.html` (before `goal-manager.js`),
`scripts/copy-web.js`, and the jest harness require block in `tests/goal-manager.test.js`, capture it into a
module-scoped const with an inert fallback, replace the inline body with a delegating call, add a unit-test
suite, then confirm `npx jest --no-coverage` + `npx tsc -p jsconfig.json --noEmit` are both green before
updating the tables and this list. See the "Recent slices" entries above for the exact recipe.

### Render burn-down — ✅ COMPLETE

The render surface was item #1's "last + hardest" front. It is now fully extracted (see the render
table above), and the remaining `goal-manager.js` bulk is non-render — the active work has moved to
the logic slices tracked above.

<details>
<summary>Expand the surface-by-surface render record</summary>

Below is the surface-by-surface record: ✅ = extracted to a pure builder module · 🔄 = partial ·
⬜ = still inline. Container/orchestrator methods (filter + `.map` + `innerHTML` write, e.g.
`renderSpellbook` → `renderActiveSpells` + `renderSpellCollection`) intentionally STAY on the class;
the extraction target was their inline `input → HTML-string` builders.

**Done**
- ✅ **Boss battles** → `boss-render.js` — HP bar, boss card, defeated gallery, battle log, monthly
  challenge + progress panels. `renderBossBattles`/`renderBossArena` remain thin orchestrators.
- ✅ **Task/goal cards + scheduled summaries** → `task-render.js` — checklist leaf, `priorityBadgeHTML`,
  all six cards, weekly + monthly scheduled summaries. `renderDailyTasks`/`renderWeeklyGoals`/
  `renderMonthlyGoals`/`renderYearlyGoals`/`renderLifeGoals`/`renderSideQuests` remain thin
  filter→delegate containers.
- ✅ **Companion Den** (`renderCompanionDen`) → `companion-render.js` — collection card (31st) +
  active-companion display + undiscovered grid (32nd). Only the collection empty-state stays inline
  (it uses the shared `_renderEmptyState` helper).
- ✅ **Spellbook** (`renderActiveSpells` / `renderSpellCollection`) → `spell-render.js` (33rd) — active-spell
  card, free + premium section headers, free + premium collection cards. The two identical inline
  `rarityColors` copies collapsed into one `SPELL_RARITY_COLORS` const; `_rarityNameplate` +
  `_overchargeButtonHTML` + the premium banner are injected, and the `Date.now()`-based `timeDisplay` stays
  computed in the wrapper.
- ✅ **Class & skill tree** (`renderClassPanel`) → `class-render.js` (34th & 35th) — the WHOLE panel: State 2
  class-selection cards + panel, State 3 linear skill-tree node rows, State 4 capstone cards + section, State 5
  subclass track (locked teaser / selection cards + body / active-subclass header + tiers), and the
  `renderActiveClassPanelHTML` shell. The subclass tier rows reuse the shared `renderSkillNodeRowHTML` (the DRY
  prize); `renderClassPanel` is now a fully thin wrapper.
- ✅ **Analytics** (`renderAnalytics` suite) → `analytics-render.js` (36th & 37th) — the WHOLE dashboard: the
  task-breakdown bars, the 12-week activity heatmap, the 30-day XP timeline, the weekday productivity pattern,
  the personal-records grid, and the goals-progress overview. Every chart is a thin data-gather + delegate
  wrapper; the builders own palettes/scales/empty-states. `renderQuickStats` stays on the class (textContent,
  not markup).
- ✅ **Quest chains** (`renderQuestChains` suite) → `quest-chain-render.js` (38th) — the WHOLE tab: the
  active-saga cards, the available-chain catalog, and the completed-chain trophies. Each column depends only on
  data (the `questChainTemplates` + `spellDefinitions` catalogs + the chain arrays), so the three wrappers are
  now guard + delegate and `renderQuestChains()` is a 3-call orchestrator.
- ✅ **Enchantments** (`renderEnchantments` suite) → `enchantment-render.js` (39th) — the WHOLE view: the
  active-enchantment countdown cards + the free/premium shop grid. The active wrapper keeps
  `checkExpiredEnchantments()` + injects `now`; the shop wrapper prepends `getPremiumBannerHTML(...)` +
  injects the bound `hasActiveEnchantment`; `renderEnchantments()` is a crystal-display + 2-call orchestrator.
- ✅ **Dashboard cards** (`renderXPEvent` / `renderRoyalBounty` / `renderStreakRepair` / `renderWeeklyThemeCard`) →
  `dashboard-render.js` (40th & 41st) — the FOUR standalone cards: the Double-XP-Weekend banner, the weekly/monthly Royal
  Bounty pair (nudge / claimed / live-with-reroll), the broken-streak repair card (upsell vs repairable rows; its DOM
  `shell` became a pure string helper), and the Theme-of-the-Week discovery card (template only — the wrapper keeps its
  guards + `addEventListener` wiring). `renderDashboard` STAYS on the class as a textContent + hidden-toggle orchestrator
  (level banner, quote, stat counts, today's tasks) — NOT an extraction target.
- ✅ **Player HUD** (`renderActiveBuffsSummary` / `renderActiveSpellSigils` + `renderPlayerPanel`'s two embedded
  blocks) → `player-hud-render.js` (42nd & 43rd) — the arcane-tab active-buffs bar, the avatar sigil-orbit bubbles
  (shared by the tab + panel orbits, with a "+N" overflow bubble past 7), the character-sheet companion portrait,
  and the compact panel active-buffs row. Wrappers keep their `getElementById` + guards + `innerHTML` writes (sigils
  also the change-detect skip + `requestAnimationFrame(_syncSigilCounterRotation)`). `renderXPDisplay` STAYS (a
  textContent/attribute mutator, not a builder).
- ✅ **Title Hall** (`renderTitleHall`) → `title-render.js` (44th) — the WHOLE surface across two builders: the
  #active-title-display card (equipped gold card vs "No Title Equipped" empty-state) and the #titles-container body
  (collection progress summary + one collapsible section per achievement-title category with earned + locked ???
  cards + the auto-earned Level Ranks chain from `LEVEL_TITLES[style]`). The inline `titleCategories` catalog moved
  into the module; the wrapper keeps its lookups + guard + active-record resolve + two `innerHTML` writes + the
  legacy grid clear.
- ✅ **Rewards / Treasury** (`renderTreasureChests`) → `reward-render.js` (45th) — the Treasury tab body: the free
  Daily Wooden Chest card (FREE badge + claim/claimed button, driven by the clock-derived `canClaimWooden`) plus the
  four purchasable tiles (bronze/silver/gold/royal) with rarity-frame chrome, affordability gating against
  `goldCoins`, and a per-type "Opened N times" count. The inline `chestTypes` catalog moved into the module; the
  chest visual (`<img>` vs emoji) comes from the injected `_chestStaticHTML` (kept on the class — `renderWoodenChest`
  shares it). Wrapper keeps its lookup + guard + one `innerHTML` write.
- ✅ **Themes** (`renderThemes` + `renderThemeSelector`) → `theme-render.js` (46th) — BOTH surfaces across two
  builders: the full grid (a "Theme of the Week" banner + one layered tile per theme, each an
  Active/Preview/locked/"Free this week" state over the `themeDefinitions` catalog) and the compact Tools-tab
  selector (flat 135°-gradient chips with premium gating on `isPremium`). The featured-week id comes in as a param
  (the wrappers still call the clock helper); the selector gradient uses the injected `darkenColor`. Wrappers keep
  their lookups + guards + `innerHTML` writes, the `#theme-premium-banner` write, and the deferred spotlight prompt.
- ✅ **Badges / Achievements** (`renderBadges`) → `badge-render.js` (47th) — the `#badges-container` body: an
  "Unlocked" header + one amber rarity-frame card per earned achievement (icon, name, description, "✓ <unlock
  date>"), then an "In Progress" header + the locked achievements sorted closest-to-completion, each a dimmed
  rarity-frame card with a progress bar whose color/label steps through gray/orange/yellow/green by percent (a
  "(N to go!)" hint at ≥75%, else "(P%)"), or the "Complete quests to unlock badges!" empty state. The catalog +
  progress map (computed by the wrapper via `getAchievementDefinitions()`/`getAchievementProgress()`) and the
  earned-badge records pass in; the builder is pure (the unlock date reads the record's timestamp, never "now").
- ✅ **Habits / Rituals** (`renderHabits`) → `habit-render.js` (48th) — the populated `#habits-container` body: one
  draggable ritual card per habit — a completion checkbox (line-through + dimmed when done), the escaped title, an
  optional "🔥 N day(s)" streak badge (hidden at streak 0), an optional escaped description, a "Total: N
  completions" line, edit/delete buttons, and the habit’s GitHub-style completion heatmap. The wrapper keeps its
  lookup + guard + the zero-habits empty-state branch (`this._renderEmptyState`, mirroring `renderActiveSpells`);
  `escapeHTML` + the clock-dependent `heatmapHTML` (the manager’s `generateHabitHeatMap`) are injected, so the
  builder is pure.
- ✅ **Archives** (`renderArchives`) → `archive-render.js` (49th) — the populated `#archives-container` body: the
  archived goals sorted newest-first by `archivedAt`, each a type-colored card (per-type icon + capitalized type
  badge, an optional "✓ Completed" flag, the escaped title, an optional escaped description, the localized
  "Archived: <date>" line, and Restore / Delete-Forever buttons). The wrapper keeps its lookup + guard, the
  separate `#archive-count` textContent write, and the zero-archives empty-state branch (`this._renderEmptyState`);
  `escapeHTML` is injected and the sort/date read each record’s own `archivedAt` (never the clock), so it’s pure.
- ✅ **Daily board** (`renderDailyQuestBoard` + `renderWoodenChest`) → `daily-board-render.js` (50th) — two pure
  builders. `renderDailyQuestBoardHTML({ quests, tracking, dailyQuestPool })` emits the `#daily-quest-board` body:
  a row per rolled quest (pool icon/name/desc; CLAIMED, a `quest.claimDaily` Claim button, or the "N XP" reward;
  claimed dims, completed gets a green frame; a pool-absent id renders nothing) + the sweep footer ("Board Swept!"
  vs "N/3 complete"). `renderWoodenChestHTML({ canClaim, chestStaticHTML })` emits the `#daily-wooden-chest` body
  (the claimable "Open Chest" card vs the "Already claimed today!" card). The wrappers keep their lookups + guards,
  the board's `generateDailyQuestBoard()`/`ensureDailyTracking()` side-effects, and the chest's clock read;
  `def.check` is a pure predicate (its result unused by the template) and `_chestStaticHTML` is injected — so both
  are pure.
- ✅ **Recurring** (`renderRecurringTasks`) → `recurring-render.js` (51st) — the populated `#recurring-tasks-container`
  body: one row per recurring task — a toggle button (filled green circle + cyan tint when active, blank circle +
  dimmed when paused), the escaped title, a human schedule line, and a delete button. The schedule line derives from
  each row's `recurrence`: weekly ("Every Mon, Wed"), biweekly ("Every other Fri"), monthly-date ("Monthly on day
  N"), monthly-weekday ("2nd Tue of month", or "Last Fri of month" when `week === -1`). The wrapper keeps its lookup
  + guard and the zero-tasks empty-state branch (`this._renderEmptyState`) inline; `escapeHTML` is injected and the
  schedule text reads each row's own `recurrence`, so it's pure.
- ✅ **Calendar** (`renderCalendar` + `renderCalendarTasks`) → `calendar-render.js` (52nd) — two pure builders.
  `renderCalendarDayHTML({ day, isToday, completedTasks, totalTasks })` is one month-grid cell's inner content (the
  day number, white on today's cell; a "<done>/<total> ⚔️" badge when the day has tasks).
  `renderCalendarTasksHTML({ tasksForDay, dateString, escapeHTML })` is the selected-date list — a quest-card per
  task (checkbox → `goalManager.toggleTask`, escaped title with done-styling, delete button, optional escaped
  description, optional checklist) + an "Add Another Quest" footer carrying `dateString`. The wrappers stay
  imperative — `renderCalendar` keeps its `createElement`/`onclick`/`appendChild` grid loop, the month/year +
  `tasksByDate` work, and the selected-highlight; `renderCalendarTasks` keeps the date `textContent`, the filter,
  and the zero-tasks empty-state (`this._renderEmptyState`) — so both builders are pure (`escapeHTML` injected).
- ✅ **Focus timer** (`updateFocusTimerControls` + `_updateChainProgressIndicator`) → `focus-timer-render.js` (53rd)
  — the 4-state `#focus-timer-controls` button set (returned as `{ containerClass, buttonsHTML }`) and the
  Pomodoro-chain progress dots + status line. Wrappers keep their lookups + guards, the no-chain empty/hidden
  early-return, and the `className`/`innerHTML` writes; `renderFocusTimer` STAYS on the class (a textContent/timer
  orchestrator, not a markup builder).
- ✅ **Premium / upsell** (`renderPremiumCard` + `getPremiumBannerHTML`) → `premium-render.js` (54th) — the
  `#premium-content` card (premium thank-you view vs free upgrade prompt with the "$4.99" CTA) and the shared upsell
  banner behind FIVE call sites. `renderPremiumCard` keeps its lookup + guard + the `toLocaleDateString()` date
  format; `getPremiumBannerHTML` forwards `this.isPremium` (message in, or `''` for premium users). Both pure.
- ✅ **Reminder settings** (`renderReminderSettings`) → `reminder-render.js` (55th) — the whole
  `#reminder-settings-container` body: the master Enable-Reminders toggle, the morning/evening/overdue/streak/bounty
  rows (or the "configure times" hint when disabled), and the notification-status footer (Enabled/Blocked/Not-Enabled/
  Not-Supported label + native-only delivery row + enable/guide/test button). The wrapper keeps the lookup + guard + the
  permission re-check that mutates `this.notificationsEnabled`; the builder gets the five resolved flags. The time
  `<input>`s keep their inline `onchange` handlers verbatim.

**Not started** — none. Every tab-render surface above is a pure, unit-tested builder module behind a thin wrapper.

**Not extraction targets:** the imperative `update*` DOM mutators (`updateNavVisibility`, `updateGoalTabCounts`,
`updateDailyTabCounts`, `updateFocusTimerDisplay`, `updateThemeVideoBackground`, `updateProgress`,
`updateSlideshow`, `updateTitleBanner`, `updateBulkActionButtons`, …) toggle
classes / set `textContent` rather than build markup, so they stay on the class. (`updatePeriodTracking`
was listed here until the 71st slice, which showed the label was half-wrong: it is not a DOM mutator at
all but a STATE stamp, so its date math moved to `PERIOD_SUMMARY_LOGIC.periodStamp` and the method kept
only the four field assignments plus `saveData`.)

**Beyond rendering** — the current front. With the render surface decomposed, the God class's remaining
bulk is non-render, and the logic slices tracked above have been working through it: the streak / leveling /
effort-XP / buff / companion math, the class-tree trio, the boss-battle trio, the addXP/addGold reward
stacks, the focus-timer + Pomodoro-chain mechanics, the active-spell lifecycle, and BOTH halves of period
tracking are all carved out — the 70th slice took the recap summary and the 71st took the transition
DETECTION that gates it, so `checkPeriodTransitions` is now a thin impure wrapper (guard, clock read,
slideshow call, persist) over pure, tested functions. Reminder scheduling closed in the 72nd slice
(`reminder-schedule-logic.js`) and the enchantment lifecycle in the 73rd (`enchantment-lifecycle.js`) —
both were listed here as "still inline" until they were done; this note is kept current deliberately, since
a stale candidate list is how a slice gets planned twice.

**✅ Done — the persistence field map, both halves.** Listed here as "still inline" until the 77th slice
closed it. The save half went out in the 76th (`save-serializer.js`), the load-side MIGRATIONS long before
that (`persistence-migrations.js`), and the ~150-assignment `this.x = data.x || default` block in `loadData`
followed in the 77th (`load-deserializer.js`). Every fallback — and every deliberate `??`-vs-`||` choice,
including the one behind the January `lastMonth` bug — is now an assertable unit rather than a line of
untested plumbing. The follow-up landed immediately in the 78th slice: a genuine `buildSaveData` →
`buildLoadState` ROUND-TRIP suite now asserts the halves agree field-for-field in both directions, so a
field added to one and forgotten in the other fails CI instead of silently resetting on a cold boot.

**Don't let a test depend on the real clock landing in a date window (learned this slice):** the
B5a/B5b DOM-delegator tests originally seeded a task with `dueDate = today` and relied on the
wrapper's `isThisWeek`/`isThisMonth` filter keeping it — i.e. on the assumption that "today is in
this week/month." That passed on the authoring day but FAILED days later (a `getTodayDateString`
vs `isThisWeek` boundary/timezone interaction made `isThisWeek(today)` false, so the filter
dropped the task and the wrapper rendered its EMPTY state). Fix: `jest.spyOn(gm, 'isThisWeek')
.mockReturnValue(true)` (and `isThisMonth`) + a FIXED `dueDate`, so the test deterministically
exercises the filter→builder→`innerHTML` delegation — the thing under test — not the app's date
math. (The extraction was byte-verified regardless; this was purely a flaky-test-authoring fix.)
**Byte-faithful extraction for untested code (confirmed this slice):** when lifting a method
that has NO test net, don't trust the eyeball — before swapping, diff the copied template
against the still-present original with a throwaway script and assert byte-equality (modulo
the known renames). It must be template-literal-AWARE: a naive `indexOf('return \`')` /
`indexOf('\`;')` grabs nested templates (here the spell-buff `.map`'s inner `<span>` return),
giving false confidence. Only swap once the diff is clean, then delete the throwaway. When a
method has NO nested template literals (e.g. `renderDefeatedBosses`), a simpler split-on-
backtick diff works (odd segments = template contents) — but strip/avoid backticks in
COMMENTS first, or they masquerade as delimiters (a stray `` `bosses` `` in a comment cost me
a false count mismatch this slice).
**Verify by OUTPUT when a lift isn't one clean template (learned the 31st slice):** the six
task/goal cards were each a single `return \`…\``, so a template string-diff (modulo renames)
proved byte-faithfulness. The companion collection card was NOT — its `comp => {…}` callback
interleaves const derivations with nested template literals (`cardOnclick`, the two-branch
`footer`) that only compose in the final markup — so a template-only diff would miss the code
between them. Instead the throwaway extracted the ORIGINAL arrow body, renamed the injected free
vars, `eval`'d it into a function, and asserted IDENTICAL OUTPUT vs the module across a
branch-covering input matrix (twin-bond × active/second/neither × rarity/catalog fallbacks). This
verifies the actual contract (bytes emitted) and is indentation-insensitive, so the module can be
cleanly re-indented. **Matcher gotcha:** the template-aware body scanner must start in CODE mode
and only terminate when the OUTERMOST frame closes — an early version `break`'d on the first `}`
that closed any `${…}` interpolation (popping the whole walk at `${comp.type}`), truncating the
body; the fix is to `break` only once the frame stack empties, else pop-and-continue.
**Runtime before/after snapshot — the purest output check (32nd slice):** when the method is already
drivable headlessly (jsdom + the harness's `createTestManager`), don't extract-and-eval the old
template at all — snapshot the REAL method. A throwaway test rendered `renderCompanionDen` across a
branch matrix and wrote the three containers' `innerHTML` to a reference file on the FIRST (pre-swap)
run, then asserted `toEqual` on the SECOND (post-swap) run. Both runs go through jsdom's identical
re-serialisation so the compare is apples-to-apples, AND it exercises the real `getActiveCompanion` /
`_rarityNameplate` / `_renderEmptyState` — no eval hacks, no fragile source-span extraction. Caveat:
jsdom normalises whitespace BETWEEN attributes, so preserve each template's original indentation
verbatim in the module (the text-node whitespace between elements IS compared) — which also keeps the
lift honest. Delete the throwaway test + its snapshot file once green.
**Extract-the-logic-not-the-plumbing (confirmed this slice):** in a huge method that is
mostly mechanical field-mapping around a few logic nuggets, extract ONLY the nuggets
(here the migrations) and leave the plumbing + I/O in place. The blast radius stays tiny,
the risky I/O is never touched, and the drift-prone logic becomes independently testable.
**Preview/derive de-dup (confirmed this slice):** when a value is computed for real in one
place and RE-derived for a preview/summary elsewhere (here the monthly boss), route BOTH
through the one pure builder and lock it with a test asserting the preview matches — a
preview that silently drifts from the real thing is a genuine bug class.
**Logic-extraction seam tactic (confirmed this slice):** to extract a method that mixes
pure computation with instance state/DOM, (1) lift ONLY the pure core into a module fn,
(2) INJECT the instance-dependent inputs (rng, level, balance slices) as params, (3) when
de-duplicating a loop that calls other instance methods, pass those methods IN so existing
spies/seams keep working, and (4) leave the God-class method as a thin delegator so every
caller and test is unchanged. **Shared-reference freeze tactic (earlier slice):**
before freezing a catalog whose objects are handed out by reference and stored on
runtime state, audit every consumer of that reference for mutation; freeze only if all
paths read, and lock it with a progression regression test (add one if the area was
untested). Otherwise give the consumer its own deep copy at hand-off time instead.
**Compute-preserving split (confirmed this slice):** when a method is DATA + logic
(here `.map()` over `BALANCE`-sourced costs), extract ONLY the raw data literal and
leave the transform in place mapping over the new const — never bake the computed
fields into the module (that would re-duplicate `BALANCE`). Verify with a before/after
`toEqual` baseline dump, since it is a reshape rather than a byte-identical swap.
**NOTE (confirmed this slice):** `goal-manager.js` uses CRLF endings and the
byte-exact `edit` tool FAILS when its match spans a line break (LF vs CRLF). Use a
one-shot Node script that detects EOL via `src.includes('\r\n')`, anchors only on
single-line substrings, brace-matches the literal, guards for a unique match, then
deletes itself — the approach used for `spell-definitions.js` / `theme-definitions.js`.
**Freeze caveat:** extracted catalogs are deep-frozen, so any test that varies the
table must REBIND the instance field to a fresh object (`gm.x = { ...gm.x, … }` or
`Object.fromEntries(...)`), never mutate in place. Spells needed two straggler
sites converted; themes already used the safe rebind pattern.
**Drift fix (LANDED):** `checkBadges()` no longer hand-codes all 16
thresholds/labels. It now iterates `getAchievementDefinitions()` and unlocks each
badge when `getAchievementProgress()[type] >= target`, so `achievement-definitions.js`
is the single source of truth — adding a badge there auto-wires its unlock. The
catalog's `name`/`icon` were byte-identical to the old hand-coded copy and the
unlock toast shows only `name`, so the change is invisible; the stored-but-vestigial
`description` (the gallery renders the catalog's) now simply matches the gallery.
Guarded by 3 new Badge-System tests — including an anti-drift check that the set of
unlocked ids equals the catalog — bringing the suite to 612/612.

</details>

## 2. ✅ Automated release pipeline (July 2026)

**Problem:** every release hand-edited up to six version strings across five
files (`CACHE_NAME` reached v631 by hand) plus a manual `cap:sync`; one missed
edit ships stale code to returning PWA users or the Play build.

**Done:** `npm run release` (`scripts/release.js`) — runs jest, bumps
`CACHE_NAME`, optionally sets the app version everywhere (+ `versionCode`),
then runs `cap:sync`. Fail-loud: aborts if any expected version string is
missing or ambiguous. CI at `.github/workflows/test.yml` runs the type-check
(#3) and jest on every push and pull request.

## 3. ✅ Gradual type safety — JSDoc + `// @ts-check` (July–Sep 2026)

**Problem:** the game is wired with magic strings (spell ids, effect keys,
reward types). Typos fail *silently* — `getClassPerkValue('typo')` returns 0,
a mistyped `spellId` simply never drops.

**Done:** the type-check is a real, enforced gate now, not just IDE hinting:

- `jsconfig.json` (checkJs off ⇒ per-file `// @ts-check` opt-in, `strict: true`,
  excludes `capacitor.config.ts`) + `globals.d.ts` declaring the ambient window
  singletons shared across `<script>` tags (`goalManager`, `audioManager`,
  `effectsManager`) as `any` — precise typing needs the ES-module refactor in #1.
- `npm run typecheck` = `tsc -p jsconfig.json --noEmit`, with `typescript`
  pinned as an explicit devDep and wired into `.github/workflows/test.yml`
  alongside jest, so a mistyped id/effect key now fails the build.
- **Every extracted module is `// @ts-check`'d and tsc-clean** — all 67 modules
  produced by #1 (12 data catalogs, 33 logic modules, 22 render modules), plus the
  `scripts/release.js` exemplar and the seven standalone browser modules
  (`analytics-methods.js`, `parallax-tilt.js`, `pwa-handler.js`,
  `mobile-touch.js`, `stat-tooltip.js`, `audio-manager.js`, `effects-manager.js`).
  The typed surface grows one slice at a time as #1 proceeds.

- **`goal-manager.js` itself is `// @ts-check`'d and tsc-clean** *(Sep 12, 2026)* — the
  whole codebase is now under the gate. Record of how it got there below.

**Closing plan (Sep 7–12, 2026), kept as the record:** `goal-manager.js` under `// @ts-check`
was blocked on its imports being 44 `const X = window.X ? window.X : {}` capture consts,
all typed `any`. The conversion was structural, so steps 2–5 landed as ONE atomic change,
not per-module slices (a mixed shim/ESM state means two test harnesses). Step 1 (tooling)
and step 6 (triage) landed on their own.

1. ✅ **Tooling** *(landed Sep 9, 2026)* — `babel-jest` + `@babel/core` + `@babel/preset-env`
   (devDeps), `babel.config.js` (`targets: node current`, jest-only — the browser build is
   untouched), `transform: { '\\.js$': 'babel-jest' }` in `jest.config.js` (jsdom kept).
   `tests/esm-tooling.test.js` imports an `export`-syntax fixture (`tests/fixtures/esm-smoke.js`,
   the only ESM file until the codemod) and confirms CJS modules still load through the
   transform. Suite 1689/1689, ~14s. Delete the fixture + smoke test when step 5 lands.

   **Probe findings for steps 2–5 (Sep 9):** 78 `<script src>` tags; **90 inline
   `onclick="goalManager.…"` handlers** so `main.js` must assign `window.goalManager` (and
   `audioManager` / `effectsManager`) before first interaction; **3 inline `<script>` blocks**
   (`index.html` ~71, ~2414, ~2566) run synchronously and need an ordering check against a
   deferred module; **5** modules have load-time `window`/`require` resolvers, not 2
   (`loot-engine`, `load-deserializer`, `title-render`, `habit-logic`, `daily-quest-definitions`);
   the jest harness loads `goal-manager.js` by **reading + `eval`ing the source** (not `require`),
   so step 5 is a rewrite of that block; no service worker file exists to invalidate.
2. ✅ **Codemod the 69 leaf modules** *(landed Sep 9, 2026, steps 2–5 as one change)* —
   the `(function () { … if (root) root.X = X; module.exports = X; })();` wrapper is gone;
   every module ends in `export default X` (default, not named — one shape for the
   goal-manager imports, the test imports and the `require(…).default` fallback). The codemod
   used `@babel/parser` template-literal ranges so no HTML template string was re-indented
   (every render-string test passed unchanged). Four render modules were CRLF; normalised to LF.
   The five load-time resolvers are `import` lines (`habit-logic` lost its
   `Array.isArray` guard — the catalog is always present now).
3. ✅ **`goal-manager.js`** — 48 capture consts (not 44; `LEVEL_TITLE_CHAINS` aliases
   `level-titles.js`, `TITLE_DEFINITIONS` was multi-line) are `import` lines, PLUS 21 render
   modules that were read as bare `window` globals with no capture const at all — 69 imports
   total. `export default GoalManager` + named exports for the five inline-handler wrappers
   (`addLifeGoal` … `addDailyTask`). The module-scoped `let goalManager` is removed: the 11
   bare `goalManager.` reads inside the class resolve to `window.goalManager` at call time.
   All `{}` / `[]` fallbacks are gone — a missing module is a hard load error.
4. ✅ **`index.html` / `main.js`** — 74 leaf tags + the `goal-manager.js` tag → one
   `<script type="module" src="main.js">`. `main.js` imports the class, creates the instance
   **synchronously** (module scripts run after parse, before `DOMContentLoaded`, so every
   listener the classic scripts and the FAB inline block register sees `window.goalManager`
   — strictly better than the old `DOMContentLoaded` init, which fired AFTER
   `mobile-touch.js`'s listener), attaches `window.GoalManager` + the five wrappers, and
   carries the splash dismissal / error card verbatim. The 8 standalone scripts
   (analytics-methods, capacitor-bridge, pwa-handler, audio-manager, effects-manager,
   mobile-touch, parallax-tilt, stat-tooltip) stay classic — they read no module namespace.
   `scripts/copy-web.js` copies every root `.js` except the three configs.
   `run-in-browser.bat` now starts the http server (modules do not load over `file://`).
   **Android `cap:build` device check: passed Sep 12, 2026** (after step 6; app booted and ran
   with no visible issues).
5. ✅ **Tests** — the harness's 69 `window.X = require(…)` lines and the `eval(source)` are
   `import` lines (`import GoalManager from '../goal-manager.js'`); `source` stays for the
   regex-over-source guards, which needed no re-pointing. All 17 suites: top-level
   `const X = require(…)` → `import`, in-test `require(…)` → `.default`, `window.X` reads
   → the imported name. The step-1 smoke fixture is deleted. **1686/1686 + typecheck clean.**
   Watch-out for future PowerShell edits: `Get-Content -Raw` without `-Encoding UTF8`
   double-encodes emoji; the fix landed here was a cp1252→UTF-8 round trip.
6. ✅ **`// @ts-check` on `goal-manager.js`** *(landed Sep 12, 2026)* — triage order:
   instance-field JSDoc declarations on the class; DOM nullability case-by-case rather
   than a blanket `$id()` helper (`?.` on same-function-created nodes, `if (!el) return`
   where the element is genuinely optional, `/** @type {HTMLElement} */` casts only for
   static `index.html` ids / same-function-created nodes; a cast-only codemod at
   tsc-flagged lines, then hand fixes — `forEach`/focus-trap sites need a
   `NodeListOf<HTMLElement>` cast on the list, since typing the callback param is rejected
   under `strictFunctionTypes`); `Date` subtraction via `getTime()`; `String()` on numeric
   `textContent` / `strokeDashoffset` writes; `!!` on boolean render inputs.
   `daily-quest-logic.js` / `daily-board-render.js` pool params widened to `ReadonlyArray`.
   `jsconfig.json` adds `useUnknownInCatchVariables: false` (TS-class-centric, same rationale
   as `strictPropertyInitialization`). Real bugs surfaced: `BOUNTY_LOGIC.pickFrom` null
   return unguarded in assign/reroll; `updateSlideshow` on null `slideshowData`;
   parent-link resolver with unresolved `parentIdField`/`parentType`. Watch-out: the import
   `FileReader` mock in tests supplies `e.target.result` only — read the payload from the
   event, not `reader.result`. **1686/1686 + typecheck clean (0 errors).** Criterion (4) ✅.

**Convention:** every `.js` file — including `goal-manager.js` since step 6 — starts with
`// @ts-check` and JSDoc-typed function signatures. Note: the editor's TS server can lag on
`globals.d.ts` (stale "implicitly any" hints); `npm run typecheck` is the
authoritative result.

## 4. ✅ Injectable RNG (July 2026)

**Problem:** `Math.random()` was called directly in loot rolls, refund procs and
crits, so tests could only assert pool membership, never actual roll behavior.

**Done:** a `this.rng()` seam in `goal-manager.js` delegates to an injectable
`this._rng` (defaults to `Math.random`). All 20 *gameplay* random sites (loot
amounts, rarity/pool rolls, proc chances, crits, companion picks) now call
`this.rng()`; purely cosmetic particle jitter stays on `Math.random`. Tests
inject a fixed roll via `gm._rng` to assert deterministic behavior (see the
`Injectable RNG` suite in `tests/goal-manager.test.js`).

## 5. ✅ Testability refactor of the constructor (July 2026)

**Problem:** `tests/goal-manager.test.js` built instances with
`Object.create(GoalManager.prototype)` and hand-mirrored ~230 lines of
constructor state (plus an `extractedThemeDefs` hack that sliced the
`themeDefinitions` literal out of the source by brace-balance). That second
copy of the defaults silently drifted from the real constructor.

**Done:** the constructor is split into a pure `initState()` (every field
default, zero side effects) and `_boot()` (localStorage, timers, DOM/audio,
and Capacitor native wiring). `new GoalManager({ testMode: true })`
short-circuits before `_boot()`, so `createTestManager()` now builds a REAL
instance and only stubs DOM/render/persistence methods. The hand-mirrored
field block, the `extractedThemeDefs` source parser, and the per-suite
`classedManager` re-mirroring are gone. Verified by the full jest suite
(620 tests).

## 6. ✅ Central balance module (July 2026)

**Problem:** rarity weights, node costs and fallback amounts lived inline at call
sites — the same shape of duplicated knowledge behind the July 2026 loot drift.

**Done:** `balance.js` is the single source of truth for loot drop thresholds,
chest/boss rarity weights + item counts, empty-pool + companion-locked gold
ranges, and class-tree costs. Dual-env (deep-frozen `window.BALANCE` in the
browser, `module.exports` for jest); `goal-manager.js` captures it once as a
module-scoped `BALANCE` const. Loaded before `goal-manager.js` in `index.html`,
copied by `scripts/copy-web.js`, and required
by the jest harness before it evals the source. Covered by the `Balance module`
suite plus the existing behavioral loot/class tests that drive the real numbers.

## 7. ✅ Rendering hygiene (no framework) (July 2026)

Two halves: (a) systematic HTML-escaping of user content in `innerHTML`
templates, and (b) event delegation instead of inline
`onclick="goalManager..."` handlers.

**Done (a) — escaping (July 2026):** audited every user-content sink and escaped
the three unescaped ones via `this.escapeHTML()` — `showAwayRecapModal` (habit
titles), `showInputModal` (`defaultValue` + `placeholder`), and `showConfirm`
(message body). The list/card render methods already escaped titles, and toasts
insert via `textContent`. Verified by the full jest suite (606 tests).

**Done (b) — delegation (July 2026):** one capture-phase document listener
(`_ensureActionDelegation` → `_dispatchAction`) resolves `closest('[data-action]')`
and invokes a `this`-bound handler from the `_buildActionHandlers()` registry,
passing `(el, event)` so dynamic values ride on `data-*` and are read from
`el.dataset`. Capture phase is deliberate — modal bodies wrap themselves in
`onclick="event.stopPropagation()"` to guard backdrop-dismiss, which would starve
a bubble-phase listener. Namespaced dotted keys (`recap.gotoView`) can't collide
with the bare local `data-action` values a few modals wire themselves; unknown
keys are ignored. Migrated panel-by-panel until **zero** inline
`onclick="…goalManager…"` handlers remain — the only residual `onclick`s are
self-contained presentational DOM ops (`event.stopPropagation()` wrappers,
`this.remove()`/`closest('.fixed').remove()`, `classList.toggle()`) that carry no
`goalManager` coupling and are intentionally left inline. Covered by the
`delegated click dispatch (Roadmap #7b)` suite (nested-in-stopPropagation
dispatch, `closest` resolution, unregistered-action no-op, `data-*` pass-through);
full jest suite green (609 tests).

## 8. ✅ Platform focus — Capacitor/Android only (July 2026)

**Decision:** this ships as an Android app, so Capacitor/Android is the ONLY
supported target — the PWA and Electron/Windows shells were dropped. Three
shells multiplied QA + release work for platforms we don't ship.

**Done:** deleted `main.js` (Electron main), `service-worker.js` (+ its
`tests/service-worker-reminders.test.js`), `manifest.json`, and `run.bat`.
Stripped the electron/electron-builder scripts + devDeps + `build` block from
`package.json`; the web-only SW-registration + install-prompt blocks from
`pwa-handler.js` (its native Google-Play in-app-update logic stays); the
manifest link + install button from `index.html`; the SW/manifest entries from
`scripts/copy-web.js`; and the `CACHE_NAME` bump from `scripts/release.js`.

**Follow-up — dead-SW cleanup (done):** the ~13 leftover `navigator.serviceWorker`
sites are gone, removed in verifiable chunks (jest green after each):

- the web-push / SW-sync subsystem — `syncReminderSettingsToSW`,
  `registerPeriodicSync`, `subscribeToPush` + `_syncPushSubscription` +
  `_unsubscribeFromPush`, their fields and call sites;
- the SW branches in the in-app notification path — `_tryTestNotification`,
  `sendConfirmationNotification`, and `showNotification` now deliver via the
  browser `Notification` API directly (native still routes through `CapBridge` /
  `@capacitor/local-notifications`);
- the `controllerchange` reload listener, the day-2 `postMessage` nudge, and the
  focus-timer SW hooks;
- the dead web "Service Worker" delivery-diagnostic row (kept the native
  "✓ Native" indicator);
- the orphaned `_bountyReminderPayload()` (its only caller was the removed SW
  sync) plus its now-moot test.

The ONE deliberate survivor is the native-only legacy-SW unregister + cache-purge
in `pwa-handler.js` (guarded by `_isCapacitorNative`), which clears workers left
behind by pre-native PWA installs. Verified at 605/605 jest + `npm run typecheck`.

## 9. ⬜ Shrink `goal-manager.js` for navigability (deferred — added Sep 12, 2026)

**Problem:** with #1 closed, `goal-manager.js` is still **19,653 lines / 586 methods**. That is
no longer a *correctness* risk — every rule is in a tested module, the type-check covers the
whole file, and duplicated knowledge has a parity test — but it is a *navigation* cost: the
file cannot be held in one's head, and reviews of unrelated features touch the same 20k-line
diff surface. Line count was explicitly NOT a criterion of #1; this item makes it one.

**Composition (Sep 12 measurement):** 2,076 blank · 3,759 comment (19%, mostly slice-history
narration duplicated in this document) · ~1,435 inline HTML template literal · ~12,400 code.
Longest methods: `previewTheme` 200, `_buildActionHandlers` 198, `importData` 189,
`generateWeeklyRecapCard` 187, `performSearch` 186, `attackBoss` 186, `generateStatCard` 183,
`renderXPDisplay` 182, `onBossDefeated` 179, `_processToastQueue` 177.

**Decision (Sep 12, 2026): deferred in favour of the product roadmap.** No concern with waiting —
the safety net (#1–#3) does not depend on file length, the work is incremental and reversible,
and shipping more features first tells us which domains most deserve extraction. What must NOT
wait is the guard-rail below.

**Guard-rail (in force now):** new work lands as new modules, not new class bulk. A new rule →
a `*-logic.js` with tests; a new surface → a `*-render.js` builder; the class gets only the
orchestration call. Slice-history comments belong in this document, not in the source. Target:
the file does not grow past ~19.7k while #9 is deferred.

**Scope when picked up — two tiers, in order:**

1. **Tier 1 — cheap, ~3–4k lines, near-zero risk.**
   - Prune slice-history comments whose content already lives in this document (keep
     WHY-comments that explain a non-obvious decision at the call site).
   - Extract the remaining ~1,435 template-literal lines into render modules using the
     established byte-faithful recipe (23rd+ render module). Candidates: `showLoginStreakModal`,
     `showNotificationSettingsGuide`, `showActiveChallenges`, `showStarterTasksModal`,
     `showInputModal`, `generateStatCard` / `generateWeeklyRecapCard`, `previewTheme`.
2. **Tier 2 — medium, ~5–7k lines, moderate risk.** Prototype mixins by domain, one file
   each, applied via `Object.assign(GoalManager.prototype, {...})` (or a `mixin(Class)` helper):
   boss combat (~1.5k), focus timer / pomodoro, reminders / notifications, tutorial /
   onboarding, sharing / stat cards, billing / premium. Runtime behaviour is unchanged (same
   class, same instance) so the existing suite is the regression net; the cost is
   `@this {GoalManager}` JSDoc on every moved method to keep `// @ts-check` clean. Expected
   result: a ~6–8k-line core (state, persistence sequencing, `render()`, event dispatch).

**Explicitly out of scope (see Non-goals):** real controller objects with their own state
(`BossController`, `FocusTimer`, …). The domains share `this.*` state freely — boss defeat →
XP → level-up → feature unlock → nav → toast queue — and untangling that is an architecture
change that only a product need (cloud sync, multi-user) would justify.

**Gate:** each slice `1686+/1686+` jest + `npm run typecheck` clean; Android `cap:build`
device check at the end of each tier.

## Non-goals (decided — do not revisit casually)

- No framework migration (React/Vue rewrite) — the app ships and has tests.
- No big-bang TypeScript conversion — JSDoc opt-in only.
- No backend/accounts unless cloud sync becomes a product goal.

## Version-string map (automated by `scripts/release.js`)

| File | String | When it changes |
|---|---|---|
| `package.json` | `"version"` | version releases |
| `android/app/build.gradle` | `versionCode` / `versionName` | version releases (`versionCode` +1) |
| `goal-manager.js` | `CHANGELOG_VERSION` | version releases — re-arms the What's New modal |
| `pwa-handler.js` | `const APP_VERSION` | version releases (was stale at 2.5.0 until automated) |
| `index.html` | footer `Life Quest Journal vX.Y.Z` | version releases |
