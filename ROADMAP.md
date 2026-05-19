# Life Quest Journal — Feature Roadmap

> **Current Version:** 2.3.0 (Build 13)  
> **Last Updated:** May 18, 2025

---

## Current Feature Inventory

| System | Status |
|---|---|
| Quest Log (Epic / Yearly / Monthly / Weekly / Side) | ✅ Live |
| Daily Quests (Tasks / Rituals / Recurring) | ✅ Live |
| Task Checklists / Subtasks (add, toggle, progress bar, completion gating) | ✅ Live |
| Quest Calendar | ✅ Live |
| XP & Leveling (progressive unlock gating) | ✅ Live |
| Gold Economy | ✅ Live |
| Focus Timer (wall-clock, Pomodoro-style) | ✅ Live |
| Focus Crystals & Shards | ✅ Live |
| Enchantments (7 buffs, premium gating) | ✅ Live |
| Spellbook (14 spells, rarity tiers) | ✅ Live |
| Boss Battles (daily / weekly / monthly) | ✅ Live |
| Defeated Bosses Log (last 50 kills with stats) | ✅ Live |
| Quest Chains (multi-step templates) | ✅ Live |
| Companion System (collection, XP, abilities) | ✅ Live |
| Treasure Chests (wooden → royal, loot tables) | ✅ Live |
| Themes & Titles | ✅ Live |
| Daily Quest Board (3 auto-generated quests) | ✅ Live |
| Login Streak & Daily Bonuses | ✅ Live |
| Streak Shields (spell, enchantment, companion protection + login prompt) | ✅ Live |
| Challenge a Friend (share link) | ✅ Live |
| Badges / Achievements | ✅ Live |
| Share Stat Card & Weekly Recap | ✅ Live |
| Referral System | ✅ Live |
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

---

## Phase 1 — Quality of Life & Retention (v2.4)

Small-to-medium features that improve daily engagement and reduce friction.

### 1.1 — Quick-Add Widget
- Floating action button (FAB) on mobile for rapid task entry
- Single-tap to add a daily quest without navigating away from current view
- Support quick entry with title-only (auto-set to today, normal priority)

### 1.2 — Notification Improvements
- Smart reminders: remind only for uncompleted tasks near end-of-day
- Boss expiration warnings (1 hour before daily boss resets)
- Focus timer completion push notification (when app is backgrounded)

### 1.3 — Pomodoro Chains
- Chain multiple focus sessions with configurable short breaks (e.g., 4×25 min + 5 min breaks)
- Bonus XP/crystal reward for completing a full chain
- Visual chain progress indicator on the Focus Timer view

---

## Phase 2 — Depth & Progression (v2.5)

Features that deepen the RPG layer and give long-term players more to chase.

### 2.1 — Skill Trees / Class System
- Choose a "class" at a milestone level (e.g., Level 15): **Scholar**, **Warrior**, **Mystic**, **Ranger**
- Each class unlocks a small passive perk tree (3–5 nodes)
  - Scholar: bonus XP from focus sessions
  - Warrior: extra attack charges from tasks
  - Mystic: reduced enchantment costs
  - Ranger: bonus loot luck from chests
- Respec option available for Focus Crystals

### 2.2 — Crafting System
- Combine lower-rarity spell charges to craft higher-rarity ones
  - e.g., 3× Minor Wisdom → 1× Arcane Surge
- Combine crystal shards + gold to craft specific enchantment scrolls
- Gives a use for excess common drops and creates a resource sink

### 2.3 — Seasonal Events & Limited-Time Content
- Rotating monthly themed events (e.g., "Harvest Festival", "Frost Trials")
- Event-specific quest chains with unique cosmetic rewards (titles, themes, companion skins)
- Event leaderboard (personal bests, no server required)

### 2.4 — Companion Evolution
- Companions gain evolution stages at XP thresholds (e.g., Baby → Juvenile → Adult → Elder)
- Each evolution improves their passive ability multiplier
- Visual change (icon/emoji swap) at each stage
- Adds long-term attachment and collection depth

### 2.5 — Achievement Gallery Overhaul
- Categorized badge pages: Combat, Productivity, Collection, Social, Milestones
- Progress tracking for locked badges (e.g., "Defeat 20 more bosses")
- Rare hidden achievements for discovery moments

### 2.6 — Boss Bestiary (refine existing)
- Expand the existing defeated bosses log into a full Bestiary page
- Add lore entries, boss art/icons, and per-boss kill stats (fastest kill, highest damage, etc.)
- Track collection progress ("Encountered X of Y boss types")

### 2.7 — Rotating Market
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

### 2.8 — Prestige System & Title Perks
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

**Title Perks**
- Earned titles now grant small permanent passive bonuses when equipped:
  - *Peasant* — no perk (starting title)
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

---

## Phase 3 — Social & Multiplayer (v3.0)

Features that connect players and drive organic growth.

### 3.1 — Guilds / Parties
- Create or join a guild (invite-link based, no server accounts needed)
- Shared guild quest board with collective goals (e.g., "Guild members complete 100 tasks this week")
- Guild XP and level — unlocks shared perks (bonus gold %, shared loot luck)
- Guild chat (simple message board via cloud sync)

### 3.2 — Leaderboards
- Opt-in anonymous leaderboards: Weekly XP, Boss Kills, Focus Hours, Streak Length
- Friend-only leaderboards via challenge links
- Seasonal leaderboard resets with cosmetic rewards for top tiers

### 3.3 — Cooperative Boss Raids
- Weekly "Raid Boss" with massive HP pool shared across guild members
- Each member's attack charges contribute to a shared damage pool
- Raid completion grants everyone in the guild unique loot
- Introduces cooperative motivation without requiring real-time play

### 3.4 — Social Feed / Activity Log
- Opt-in feed of friend achievements ("Alex defeated the Weekly Boss!", "Sam hit a 30-day streak!")
- React with quick emoji responses
- Drives friendly competition and accountability

---

## Phase 4 — Intelligence & Insights (v3.5)

Data-driven features that help users understand and improve their productivity.

### 4.1 — Smart Scheduling
- Analyze historical completion patterns (time of day, day of week)
- Suggest optimal scheduling for new tasks based on past behavior
- "Best time to focus" recommendation based on focus session completion rates

### 4.2 — Weekly AI Digest
- Auto-generated weekly summary: trends, highlights, areas of improvement
- Compare current week vs. previous week performance
- Celebrate improvements, gently flag declining metrics

### 4.3 — Goal Dependency Mapping
- Visual graph linking life goals → yearly → monthly → weekly → daily tasks
- See which daily actions feed into long-term objectives
- Identify "orphan" tasks with no strategic purpose

### 4.4 — Focus Session Analytics (refine existing)
- Expand the existing analytics to add focus-specific breakdowns: session length distribution, completion rate, time-of-day heatmap
- Track "deep work hours" per week with trend charts
- Integration with calendar view (show focus blocks on calendar)

### 4.5 — Analytics Export (refine existing)
- Expand the existing JSON export to include CSV/PDF export of analytics data
- Shareable productivity reports (weekly/monthly summaries)
- GDPR-compliant full data download

---

## Phase 5 — Platform & Monetization (v4.0)

Infrastructure and business model improvements.

### 5.1 — Cloud Sync & Multi-Device
- Optional cloud backup (Firebase / Supabase) with account creation
- Real-time sync across devices (phone, tablet, desktop)
- Conflict resolution for offline edits
- Foundation for all multiplayer/social features

### 5.2 — iOS App
- Capacitor build for iOS
- App Store submission with proper assets
- iOS-specific: haptics, widgets, Shortcuts integration

### 5.3 — Desktop App Polish
- Electron tray icon with quick-add
- System notification integration
- Global hotkey for starting focus timer
- Menu bar mini-timer display

### 5.4 — Premium Tier Expansion
- **Free tier**: All core productivity features, basic spells/enchantments, 1 companion slot
- **Premium tier** (current): All spells/enchantments, unlimited companions, premium themes
- **Premium+ / Annual**: Cloud sync, advanced analytics, priority seasonal content, exclusive companion evolutions

### 5.5 — Monetization Options
- Cosmetic-only microtransactions: theme packs, companion skins, title packs
- One-time "Starter Pack" bundle (crystals + spells + theme)
- Ensure no pay-to-win: all gameplay-affecting items remain earnable through play

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
| **Widget Support** | Android home screen widgets (today's quests, streak counter, focus timer) |

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
     Phase 2            │           Phase 1
  (Depth/Progression)   │        (QoL/Retention)
                        │
  ──────────────────────┼──────────────────────
                        │
     Phase 3            │           Phase 5
    (Social)            │        (Platform)
                        │
                    LOW IMPACT
       HIGH EFFORT ◄────┼────► LOW EFFORT
```

**Recommended execution order:** Phase 1 → Phase 2 → Phase 5.1 (cloud sync) → Phase 3 → Phase 4 → Phase 5

---

*This roadmap is a living document. Reprioritize based on user feedback and analytics.*
