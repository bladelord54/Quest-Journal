# Class System Redesign — Design Doc (v3.1 — IMPLEMENTED)

> Status: **IMPLEMENTED — Phases 0–2, all capstones, AND the §9 Subclass
> Specialization layer shipped in code** (Jun 25–28, 2026; unreleased). The
> architecture refactor, every `[easy]` and `[med]` perk, all eight capstones,
> and all eight subclasses (2 per class × 3 tiers) across the four classes are
> wired and covered by tests (full suite green: **587 tests**). What remains:
> the **subclass selection UI**, plus the four `[large]` **crafting subsystems**
> — the latter **moved out of update 3.1 into the §3.2 Crafting System** (see
> `ROADMAP.md` §3.2). The `(DRAFT)` numbers below were tunable placeholders; the
> **live values live in `goal-manager.js` `initializeClasses()`**, and the
> **Phase 1 perks**, **Class System v3.1 — Phase 2 perks**, and **Class System
> v3.1 — Subclasses** suites in `tests/goal-manager.test.js` are the behavioral
> source of truth. This doc captures the as-is system, the redesign as-built,
> per-class perk specs, balance notes, and the phased roadmap (§7).

---

## 0. Locked decisions (2026-06-24)

- **Tree shape:** Option B — **linear core + capstone choice**.
- **Naming:** **Mystic → Wizard**; **`enchant_discount` moves to Scholar**. Confirmed.
- **Nodes per class:** **6**, where the final slot is a **capstone** (choose 1 of 2-3).
- **Crafting:** the four `[large]` systems are **deferred** — now consolidated into the **§3.2 Crafting System** update (see `ROADMAP.md` §3.2).
- **Monetization:** **all class perks are free** (earned via skill points); no premium gating.
- **New ideas:** accepted in principle, with refinements added below.
- **Capstones (CONFIRMED):** Warrior *Executioner vs Overflow*; Ranger *2nd companion
  slot vs Forage*; Wizard *Overcharge vs Archmage*; Scholar *Deep Work vs Insight*.
- **Wizard free-cast:** **common/uncommon spells only** (rarity gate).
- **Prestige:** unlocks at **Level 40**. Cost curve tuned so a main class maxes
  *exactly* at L40 (see §6).
- **Respec:** **one combined "change class / re-pick nodes" action** (no separate path).
- **Migration UX:** **none needed** — single-user dev build, so the architecture refactor
  can hard-reset class state without a migration notice.
- **Spell power scope:** **RESOLVED (Phase 2)** — `spell_power_mult` applies to the
  xp/gold **economy-multiplier** spells (those resolved through `getActiveSpellMultiplier`)
  and scales the spell's *bonus* (the portion above 1×). Overcharge doubles that bonus. See §8.1.

---

## 1. Current state (as-is)

- Four classes: **Scholar** (`focus_xp`), **Warrior** (`charge_chance`),
  **Mystic** (`enchant_discount`), **Ranger** (`loot_weight`).
- Each class has **exactly one effect**, scaled across a **linear 5-node tree**.
  A node's `value` is the *total* effect at that tier; `getClassPerkValue(effect)`
  reads the highest unlocked node and returns 0 unless the active class matches
  that effect.
- Node costs `[2,3,4,5,6]` = **20 points** total; class maxes ~Level 30.
- Skill points are **derived from level** (1 per level past `CLASS_UNLOCK_LEVEL = 10`),
  not stored — so retroactive grants are automatic. Only `skillPointsSpent` is saved.
- Respec = change class for `CLASS_RESPEC_COST = 5` Focus Crystals; refunds all
  points (they re-derive), resets the tree.

### Why it needs to change
Your design gives each class **4-6 distinct perks** instead of one scaled number.
The single-`effect`-per-class model can't represent that. We need nodes that each
carry their **own** effect.

---

## 2. Proposed architecture change

Move from "one class effect" to **"each node is its own perk."**

```
class = {
  id, name, icon, color, tagline,
  nodes: [
    { id, tier, cost, effect, value, name, desc },   // each node = a distinct perk
    ...
  ]
}
```

- `getClassPerkValue(effect)` changes from "matches class.effect" to
  **"scan the active class's UNLOCKED nodes for one with this `effect`, return its
  `value` (0 if not unlocked)."** This is the single core refactor; every existing
  perk hook (`charge_chance`, `loot_weight`, `enchant_discount`, `focus_xp`) keeps
  working through the same call.
- Backward-compatible migration: existing saves store `classNodesUnlocked` (a count)
  and `playerClass`. Since node *meanings* change, on first load of the new version
  we **auto-respec** (reset `classNodesUnlocked`/`skillPointsSpent` to 0, keep
  `playerClass`) and show a one-time "Your class tree was upgraded — re-pick your
  perks" notice. Points re-derive from level so nothing is lost.

### Tree shape — OPEN QUESTION
- **Option A (linear, simplest):** must unlock node *i* before *i+1*. Matches today.
- **Option B (light branching):** linear core (nodes 1-3) then **choose a capstone**
  (one of 2-3 powerful endgame nodes). Adds build identity without full tree complexity.
- **Option C (free pick):** spend points on any node in any order. Most flexible,
  hardest to balance and to render cleanly on mobile.

**DECISION: Option B (LOCKED).** Linear core (nodes 1-5) then a **capstone** as node 6,
chosen from 2-3 powerful endgame options. Keeps the clean mobile UI while giving an
endgame choice that makes each class feel personal. Each class therefore has **6 nodes**:
5 linear + 1 capstone slot.

---

## 3. Naming & remap decisions (need your sign-off)

- **Mystic → Wizard** (spell-focused). Renames `playerClass: 'mystic'` →
  `'wizard'` (migration maps old value forward).
- **`enchant_discount` moves Mystic → Scholar.** Wizard becomes purely spell-focused;
  Scholar owns focus + enchantments.
- **Scholar's current `focus_xp`** stays as one Scholar node (not dropped).

**All confirmed (LOCKED).** Migration maps `playerClass: 'mystic'` → `'wizard'` and
reassigns the enchant-discount perk to Scholar.

### Changing class later (LOCKED)
Players can **switch class after picking** via a **single combined respec action**
(`respecClass()`, Focus-Crystal fee, refunds points which re-derive from level).
- One action covers **both** "change class" and "re-pick nodes within the same class"
  (including the capstone choice) — no separate cheaper same-class path.
- Respec always available from the class panel (button already wired).
- Optional polish (non-blocking): make the **first respec free** so early experimenting
  isn't punished.

---

## 4. Per-class perk specs

Legend for feasibility: **[easy]** existing hook · **[med]** new hook/logic ·
**[large]** new subsystem (**moved to the §3.2 Crafting System update** — see `ROADMAP.md` §3.2).

### ⚔️ Warrior — Boss combat
| Perk | Effect | Feasibility | Draft values |
|---|---|---|---|
| **Increased boss damage** | `boss_damage_mult` | [easy] mult slot in `attackBoss()` | +10/20/30% |
| **Attacks per task** | `charge_chance` (existing) + cap raise | [easy] | keep + raise soft cap |
| **Critical hit chance** | `crit_chance` | [easy] crit pattern exists | 10/15/25% for +50% dmg |
| **Cleave** (was "sweeping") | `cleave_pct` | [med] bosses are separate objects | 15/30% splash to other active bosses |
| **Rage combo** (was "combo") | `rage_stacks` | [med] new per-day stack meter | every 3 hits → next hit guaranteed crit |
| **Weapon forging** | — | [large] DEFERRED | — |

**My refinements / new ideas:**
- **Cleave** reframes "sweeping attack" — a % of your hit splashes to the *other*
  active bosses (daily/weekly/monthly), which is cleaner than true multi-target.
- **Rage combo** ties into the existing `momentum` concept: consecutive attacks build
  a meter that pays off, instead of vague "use multiple attacks to gain strong attack."
- **NEW — Executioner:** bonus damage vs bosses under 25% HP (synergy with the existing
  `execute` spell). Great capstone candidate.
- **NEW — Overflow:** attack charges above the soft cap are *kept* instead of discarded
  (today they're thrown away at `:1463-1466`). Strong, unique identity perk.

### 🏹 Ranger — Companion & loot
| Perk | Effect | Feasibility | Draft values |
|---|---|---|---|
| **Companion growth** | `companion_xp_mult` | [easy] mult in `grantCompanionXP()` | +25/50/100% |
| **Better loot chance** | `loot_weight` (existing, already built) | [easy] | keep, scale up |
| **Boss loot qty/quality** | `boss_loot` | [med] boss-defeat reward hook | +1 drop / rarity bump |
| **Ranger-only companion** | unlock + gate | [med] new companion def | unique pet w/ class ability |
| **Arrow crafting** | — | [large] DEFERRED | — |

**My refinements / new ideas:**
- **NEW — Second companion slot:** Ranger can equip **two** companions at once
  (`activeCompanionId` is currently single). Huge class identity, very desirable capstone.
- **NEW — Forage:** small chance for bonus gold/Focus Crystals on task completion.
- **Arrow crafting alt (lightweight):** instead of a full crafting UI, accumulate
  "arrows" from tasks as a mini-currency spent to *guarantee* a loot-rarity upgrade on
  the next chest. Defers the heavy crafting system while keeping the flavor.

### 🔮 Wizard — Spells & enchantments... no, **spells only**
| Perk | Effect | Feasibility | Draft values |
|---|---|---|---|
| **Increased spell length** | `spell_duration_mult` | [easy] mult at cast | +20/40/60% |
| **Chance to not consume charge** | `spell_preserve` | [easy] consume points explicit | 15/25/40% |
| **Increased spell power** | `spell_power_mult` | [med] per-spell scaling varies | +15/30% where applicable |
| **Bonus mage-specific spells** | new spell defs + gate | [med] | 2-3 wizard-exclusive spells |
| **Spell crafting** | — | [large] DEFERRED | — |

**My refinements / new ideas:**
- **NOTE:** spells have **no time recharge** (charges from chests/quests), so a
  "cooldown" perk doesn't fit — `spell_preserve` (chance to refund the charge) is the
  right lever and is cheap to implement.
- **NEW — Free daily cast (LOCKED: common/uncommon only):** one free spell cast per day
  (no charge consumed), gated by **spell rarity to `common`/`uncommon`**. High-tier spells
  (`boss_slayer`, `execute`, `quest_doubler`, etc.) are excluded so a free OP cast can't
  happen. Implementation: check the cast spell's `rarity` against `['common','uncommon']`
  before granting the free cast.
- **NEW — Overcharge:** optionally spend 2 charges of a spell for a boosted effect.
  Pairs with `spell_power_mult`. Capstone candidate.
- **Spell power** is the trickiest — each spell scales differently (duration vs
  multiplier vs flat). We'd apply it only to spells where it's well-defined; flag
  per-spell during implementation.

### 📚 Scholar — Focus & enchantments
| Perk | Effect | Feasibility | Draft values |
|---|---|---|---|
| **Focus crystal yield** | `crystal_yield` | [easy] hook in `earnFocusCrystals` | +1 per session / +% |
| **Reduced enchantment costs** | `enchant_discount` (moved from Mystic) | [easy] already built | -1/-2/-3 crystals |
| **Increased enchantment length** | `enchant_duration_mult` | [easy] duration at purchase | +25/50% |
| **Focus XP** (keep existing) | `focus_xp` | [easy] already built | +10..60 XP/session |
| **Enchantment crafting** | — | [large] DEFERRED | — |

**My refinements / new ideas:**
- **NEW — Insight:** chance an enchantment is *not* consumed when it expires (one free
  re-up). Mirrors Wizard's `spell_preserve` for thematic symmetry.
- **NEW — Deep Work:** focus sessions completed back-to-back grant escalating bonus
  crystals/XP (a focus "streak"). Rewards the core focus loop.
- **NOTE:** multiple *different* enchantments can already be active at once, so
  "enchant stacking" isn't a real unlock — `enchant_duration`/`Insight` are the
  meaningful enchantment levers.

---

## 5. New cross-cutting ideas (optional, beyond your notes)

- **Class identity passive:** picking a class grants a small *always-on* baseline perk
  immediately (before spending points), so the choice feels rewarding at level 10.
- **Subclasses at Level ~30:** the existing code comment already anticipates
  "subclass specialization." Each class could branch into 2 specs (e.g., Warrior →
  *Berserker* (damage) vs *Guardian* (charge/sustain)). Natural Phase 3.
- **Per-node respec:** refund a single node for a small fee, instead of full respec only.
- **Visual:** show the active class icon/color on the player avatar ring and in the
  boss/focus/arcane views for identity reinforcement.

---

## 6. Balance & economy

- **Point economy (LOCKED):** derived points = 1/level past 10. **Cost curve =
  `[2, 3, 4, 5, 6]` for linear nodes 1-5 + `10` for the capstone = 30 total.** Since a
  player has `level - 10` points, **30 points lands exactly at Level 40** — so a main
  class maxes precisely at the **prestige unlock (L40)**. Prestige then becomes the next
  sink, with no dead "fully maxed, nothing to spend" window.
- **Multiplicative stacking risk:** boss damage × crit × cleave × `boss_damage`
  enchantment × spell buffs can compound fast. Proposed guardrails: cap total boss-damage
  multiplier, make crit additive with spell crits (not multiplicative), cap cleave.
- **Monetization (LOCKED):** **all class perks are free** — earned via skill points.
  No premium gating on perks; monetize via cosmetics/themes instead.
- **Prestige pacing (LOCKED — unlock at Level 40):**
  - One class maxed (30 points) = **exactly Level 40** = prestige unlock. Tight by design.
  - Maxing **all four** classes = 120 points → Level 130 (long-tail completionist goal).
  - **Design intent:** a focused player maxes their **main class** right as prestige
    unlocks, so prestige is the immediate next sink — no "maxed with nothing to spend" gap.
  - **Prestige interaction options (decide when prestige is built):** (a) prestige
    **resets** class trees for a permanent multiplier + prestige currency; (b) prestige
    **grants bonus skill points / a 2nd class slot**; (c) prestige **unlocks subclasses**
    (§5). Recommend (a)+(c) combined. *Not needed for Phase 0/1.*

---

## 7. Phased roadmap

- ✅ **Phase 0 — Architecture (shipped in code).** Nodes refactored to per-node effects
  (5 linear + capstone); `getClassPerkValue` scans the active class's unlocked nodes by
  effect; Mystic→Wizard rename + `enchant_discount` moved to Scholar; cost curve
  `[2,3,4,5,6,10]`; combined `respecClass()`; the class panel renders the capstone choice
  (`chooseCapstone`). Class state hard-resets on this dev build (no migration shim).
- ✅ **Phase 1 — Easy perks (shipped in code).** Every `[easy]` perk wired through its
  existing hook: Warrior `boss_damage_mult` / `crit_chance` / `charge_chance`; Ranger
  `companion_xp_mult` / `loot_weight`; Wizard `spell_duration_mult` / `spell_preserve`;
  Scholar `crystal_yield` / `enchant_discount` / `enchant_duration_mult` / `focus_xp`
  (`study_xp_mult`). Fully playable redesign.
- ✅ **Phase 2 — Medium perks (shipped in code).** All `[med]` perks: Warrior **Cleave**
  (`cleave_pct`) + **Rage Combo** (`rage_combo`); Ranger **Boss loot** (`boss_loot`) +
  **Ranger companion** (`ranger_companion` → lynx) + **Second companion slot**
  (`second_companion`); Wizard **Spell power** (`spell_power_mult`) + **Wizard-exclusive
  spells** (`mage_spells` → `grantWizardSpells`) + **Free daily cast** (`free_daily_cast`).
- ✅ **Capstones (shipped in code, alongside Phases 0–2).** Warrior *Executioner*
  (`execute_bonus`) / *Overflow* (`charge_overflow`); Ranger *Twin Bond* (`second_companion`) /
  *Forage* (`forage`); Wizard *Overcharge* (2-charge boosted cast, doubles the bonus) /
  *Archmage* (+50% spell duration + fixed +25% charge refund); Scholar *Deep Work* (`deep_work`) /
  *Insight* (`enchant_preserve`).
- ✅ **Phase 3 — Subclass Specialization (shipped in code).** The §9 layer is implemented
  and tested: 2 subclasses per class (pick one), each a single effect escalating over 3 tiers
  `[3,4,5]`, drawn from the shared skill-point pool and L40-gated (decoupled from prestige).
  All eight effects are wired onto existing hooks via `getClassPerkValue`'s §9.5 max-resolution,
  and the **Class System v3.1 — Subclasses** suite covers gating, pick-one exclusivity, the tier
  economy, perk resolution, every hook, and respec. **Only the selection UI is outstanding.**
- ⏳ **Phase 3 — Crafting (moved to §3.2).** The four `[large]` crafting subsystems are
  **no longer part of update 3.1**; they are consolidated into the **§3.2 Crafting System**
  update (see `ROADMAP.md` §3.2).

> **As-built notes (Jun 25, 2026):** Live perk values are in `goal-manager.js`
> `initializeClasses()`; behavior is locked down by the **Phase 1 perks** and
> **Class System v3.1 — Phase 2 perks** suites in `tests/goal-manager.test.js`
> (full `npm test` green: 511 tests). Notable as-built scope choices vs. the `(DRAFT)`
> tables: (1) `spell_power_mult` is a single **+20%** node scoped to the xp/gold
> economy-multiplier spells (§8.1); (2) **Overcharge** spends 2 charges, flags the active
> spell `overcharged`, and **doubles** the spell's bonus (stacks with Empowered Magic),
> surfaced as an "⚡ Overcharge" spellbook button; (3) two Wizard-exclusive spells
> (`mana_font`, `philosophers_stone`) carry a `wizardExclusive` flag, are granted
> idempotently on the Forbidden Tomes unlock, and stay hidden from the collection until
> owned; (4) Free Daily Cast is the first common/uncommon cast each day, tracked by a
> persisted `freeCastUsedDate`.

---

## 8. Remaining open questions

**All resolved.** (See §0 for the full locked set: tree shape B, naming, 6 nodes +
capstone, confirmed capstones, free-cast common/uncommon, prestige L40, cost curve
`[2,3,4,5,6,10]`, combined respec, all perks free, no migration.)

1. ✅ **Spell power scope (Phase 2) — RESOLVED.** `spell_power_mult` applies to the xp/gold
   **economy-multiplier** spells — the ones resolved through `getActiveSpellMultiplier` —
   and scales the spell's *bonus* (the portion above 1×) by the node value (**+20%** as built).
   Spells whose effect is a duration/flag rather than an economy multiplier are unaffected, so
   the perk can't double-dip on instant effects. **Overcharge** doubles that same bonus and stacks on top.

Phases 0–2, capstones, **and the §9 subclass specialization** are **implemented and tested**;
the remaining work is the **subclass selection UI** and the four `[large]` crafting systems
(**moved to §3.2** — see `ROADMAP.md` §3.2).

---

## 9. Subclass Specialization — Phase 3 detail (IMPLEMENTED)

> **Status (Jun 28, 2026):** ✅ **shipped in code & tested** — the data model, all eight
> subclasses, persistence (all four serialization touchpoints), the helper API, and the eight
> effect hooks are live; the **Class System v3.1 — Subclasses** suite is green. **Only the
> selection UI remains.** The spec below is the as-built reference.
>
> **Scope decision (Jun 27, 2026):** subclasses are **decoupled from prestige.** The §5
> sketch ("subclasses at ~L30") and the `ROADMAP.md` §3.1 copy ("post-Ascension," Level 30,
> market / boss-resummon perks) are **superseded by this section.** Subclasses ship as the
> class system's own endgame in update **3.1**; prestige (§3.8) layers on top later and is
> **not** a prerequisite.

### 9.1 — Why L40 (overflow absorption)
Skill points are `level − 10` and the base tree costs exactly 30, so a main class maxes at
**L40**. Past L40 a player keeps earning ~1 point/level with nothing to spend it on — the
`docs/FRICTION_POINTS.md` **N2** "post-L40 skill-point overflow" gap. Subclass mini-trees draw
from the **same** `getAvailableSkillPoints()` pool, so they become the natural L41+ sink and
close that gap **without** needing prestige.

### 9.2 — Unlock & selection
- **Unlock gate:** `level ≥ SUBCLASS_UNLOCK_LEVEL (40)` **AND** `isClassMastered()` (all 5
  linear nodes + a capstone) — the base tree is always finished before subclassing.
- Each base class offers **2 subclasses; pick ONE** (build identity, like the capstone). The
  other is reachable only via respec.
- A subclass is **tied to its parent class**; a full `respecClass()` clears it.

### 9.3 — Mini-tree shape & economy
- Each subclass = **one signature effect that escalates across 3 tiers.**
- Tier costs **`[3, 4, 5] = 12 points`** → a subclass fully completes at **L52** (the L41→L52
  post-L40 chase). Bump to 4 tiers `[3,4,5,6] = 18` (→ L58) if a longer tail is wanted.
- Subclass spend flows through the existing `skillPointsSpent` / `getAvailableSkillPoints()`
  pool; only the spend count + the choice persist (points re-derive on respec).

### 9.4 — Data model (additions)
```js
// constructor
this.SUBCLASS_UNLOCK_LEVEL = 40;
this.SUBCLASS_RESPEC_COST  = 8;   // Focus Crystals (> base respec's 5 — weightier)
this.subclass = null;             // chosen subclass id, scoped to playerClass
this.subclassNodesUnlocked = 0;   // 0–3 tiers unlocked
// persisted in loadData / saveData / import alongside the existing class fields,
// and reset by selectClass()/respecClass() exactly like classNodesUnlocked.
```
`initializeClasses()` gains a `subclasses` map per class, e.g.:
```js
scholar: { …, subclasses: {
  archivist: { id:'archivist', name:'Archivist', icon:'📖', effect:'archivist_focus_mult',
    tiers: [ {cost:3, value:0.15}, {cost:4, value:0.30}, {cost:5, value:0.50} ] },
  sage:      { id:'sage', name:'Sage', icon:'🌿', effect:'sage_habit_crystals',
    tiers: [ {cost:3, value:0.20}, {cost:4, value:0.35}, {cost:5, value:0.50} ] }
}}
```

### 9.5 — `getClassPerkValue` change (backward compatible)
Today it returns the **first** unlocked node/capstone matching `effect`. Change it to return
the **highest `value`** among all unlocked matches **including unlocked subclass tiers**. Base
trees keep one node per effect, so "highest" == "the one" — **zero behavior change for existing
perks** — while subclass tiers (same effect, rising value) resolve to the top unlocked tier.
Every existing `getClassPerkValue('…')` hook then works unchanged, and new subclass hooks call
the same method.

### 9.6 — The 8 subclass perks (all on existing hooks)

| Parent | Subclass | Effect | Tiers T1/T2/T3 | Existing hook it plugs into |
|---|---|---|---|---|
| Scholar | **Archivist** | `archivist_focus_mult` | +15 / +30 / +50% | focus-session reward path (the `deep_work` block, `goal-manager.js:8995`) — scales focus XP + crystal yield |
| Scholar | **Sage** | `sage_habit_crystals` | 20 / 35 / 50% chance | `toggleHabit` reward bundle (`habit.lastRewards.crystals`, `goal-manager.js:8704`) |
| Warrior | **Berserker** | `berserker_ramp` | up to +20 / +35 / +50% | `dealBossDamage` missing-HP scaling (`boss.currentHP/maxHP`, `goal-manager.js:1690`) |
| Warrior | **Guardian** | `guardian_protect` | +1 / +2 / +3 per week | streak-protection resolution (mirror `companion_protect`, `goal-manager.js:5301`; add a `guardianProtectionResetWeek` field) |
| Wizard | **Diviner** | `diviner_refund` | +10 / +20 / +30% | spell charge-consume path, additive with `spell_preserve` |
| Wizard | **Necromancer** | `soul_harvest` | +1 / +2 / +3 💎 | `onBossDefeated` reward (`goal-manager.js:1945`) |
| Ranger | **Hunter** | `hunter_bonus` | +15 / +25 / +40% | `dealBossDamage`, gated to `bossType ∈ {weekly, monthly}` (`goal-manager.js:1946`) |
| Ranger | **Pathfinder** | `pathfinder_fortune` | +10 / +20 / +30% | `addGold` multiplier, source-guarded (`goal-manager.js:1583`) |

**Remapped off the unbuilt §3.7 / §3.9** (so 3.1 ships standalone): Diviner market re-rolls →
spell charge-refund; Necromancer boss-resummon rarity → soul-harvest crystals; Pathfinder
market loyalty → gold fortune. (Hunter, Berserker, Guardian, Archivist, Sage already mapped
to live systems.)

### 9.7 — Respec
- `respecSubclass()` — clears `subclass` + `subclassNodesUnlocked`, refunds the subclass points
  (they re-derive), costs `SUBCLASS_RESPEC_COST` (8 💎). Lets a player switch Archivist↔Sage, etc.
- The existing `respecClass()` (change parent class) also resets the subclass.

### 9.8 — Balance guardrails
- **Berserker × Executioner** (both Warrior, low-HP damage): a Warrior with the *Executioner*
  capstone **and** *Berserker* subclass would double-dip below 25% HP. Cap the **combined**
  low-HP boss-damage multiplier (e.g. ≤ +75%), or have Berserker's ramp exclude the <25% band
  Executioner already covers. Decide at implementation.
- **Pathfinder** must apply its multiplier at a single choke point (`addGold`) with a source
  guard, so forage / overflow / quest gold isn't multiplied twice.
- All other effects are additive into existing, already-capped systems.

### 9.9 — Surfacing & tests
- **Surface** the chosen subclass on the Character Sheet, Share Card, and the avatar ring
  (per `ROADMAP.md` §3.1), reusing the class icon/color treatment.
- **Tests** — a "Class System v3.1 — Subclasses" suite mirroring the Phase 1/2 pattern: unlock
  gating (L40 + mastery), pick-one exclusivity, tier costs draw from the shared point pool,
  `getClassPerkValue` max-value resolution, each of the 8 effects' hook behavior, respec
  refund/reset, and a save/load round-trip.
