# Changelog

All notable changes to **Life Quest Journal** are tracked in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with an `Android versionCode` bump on every release.

> **Note:** This file begins with v2.5. v2.4.10 (shipped May 22, 2026, Build 20) is
> recorded below as the baseline that v2.5 builds on, but earlier history lives only
> in `ROADMAP.md` § Phase 1.

## Sections we use

- **Added** — new features
- **Changed** — changes in existing functionality
- **Deprecated** — soon-to-be removed features
- **Removed** — features removed this release
- **Fixed** — bug fixes
- **Security** — vulnerabilities patched
- **Internal** — refactors, build/tooling, no user-facing impact

---

## [2.8.0] — 2026-06-07 (Build 26)

> **Theme:** Theme Expansion release. Six new hybrid themes (Stormwatch,
> Sunken Library, Verdant Grove, Dark Cathedral, Crystal Caves, Aurora
> Spires), Proposal B free/premium rebalance (5 free / 9 premium),
> achievement-flavored theme criteria overhaul (Golden Empire by lifetime
> gold, Shadow Realm by bosses defeated), live theme preview modal with
> a full focus-trap + scroll-lock a11y baseline, per-theme accent
> micro-styling, and a `totalGoldEarned` lifetime counter with generous
> existing-user migration. Closes ROADMAP § 2.4.
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
> codebase + the long-deferred GIF fallback removal (ROADMAP § 1.6) bundled
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
  `quest-search`, and `starter-quests`. ROADMAP § 2.3.1 documents the
  three valid containment strategies as the going-forward standard.

### Removed

- **Animated-theme GIF fallbacks (ROADMAP § 1.6 resolved)** — the seven
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
- **Telemetry plumbing skipped** — the original ROADMAP § 1.6 spec also
  outlined a codec probe + `localStorage.lqj_webmFails` breadcrumb. Both
  skipped because no user reports of broken backgrounds came in during
  the v2.5–v2.7 window. If reports start coming in against v2.7.1+ now
  that the static-gradient fallback replaces the GIF fallback, revisit.

---

## [2.7.0] — 2026-05-31 (Build 23)

> **Theme:** Character Sheet & Player Panel Overhaul + Quest Card & Component Redesign
> (ROADMAP § 2.2 + § 2.3, consolidated)
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

> **Theme:** View Transitions & Navigation Polish (ROADMAP § 2.1)

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
- **ROADMAP § 1.6** tracks the eventual GIF removal (deferred 1–2 releases for
  safety telemetry).

---

[Unreleased]: https://github.com/bladelord54/Quest-Journal/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/bladelord54/Quest-Journal/releases/tag/v2.5.0
[2.4.10]: https://github.com/bladelord54/Quest-Journal/releases/tag/v2.4.10
