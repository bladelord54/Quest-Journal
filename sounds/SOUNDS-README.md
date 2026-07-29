# Quest Journal - Sound Files Guide

## 📁 Required Sound Files

Place your custom sound files in this `/sounds/` folder. The app will automatically load and play them.

---

## � v2.9 code-first contract (§2.6 sound expansion)

`audio-manager.js` is already wired for the v2.10 asset drop. Drop files
matching these names into `/sounds/` and they activate with **zero code
changes**:

### Shipped (files on disk, active — v628 cache)

| File | Plays for | Notes |
|---|---|---|
| `chest-open-wooden.mp3` | Daily free wooden chest open | id `chest-open-wooden`; falls back to `chest-open.mp3` |
| `chest-open-bronze.mp3` | Bronze chest open | falls back to `chest-open.mp3` |
| `chest-open-silver.mp3` | Silver chest open | falls back to `chest-open.mp3` |
| `chest-open-gold.mp3` | Gold chest open | falls back to `chest-open.mp3` |
| `chest-open-royal.mp3` | Royal chest open | falls back to `chest-open.mp3` |
| `boss-crit.mp3` | Boss critical hits | id `boss-crit`; played via `playSlash(isCrit)` at full volume; falls back to `sword-slice.mp3` |
| `habit-completion.mp3` | Habit checked off (distinct from task completion) | id `habit-completion`; played from `toggleHabit`; falls back to `daily-achievement.mp3` |
| `streak-freeze-used.mp3` | Streak freeze consumed | §1.7; falls back to `achievement-life.mp3` |
| `task-complete.mp3` | Routine task / side-quest / ritual completion | id `task-complete` (§2.6 R6); via `showAchievement(…,'task')`; falls back to `daily-achievement.mp3` |
| `spell-cast.mp3` | Spellbook cast (Tools → Spells) | id `spell-cast` (§2.6 R1; renamed from `spells.mp3`); the legacy `spell` id points at this same file |
| `enchantment-activate.mp3` | Enchantment activation (focus buffs) | id `enchantment-activate` (§2.6 R1); falls back to `spell` (`spell-cast.mp3`) |
| `prestige-ascension.mp3` | Prestige/ascension ceremony | **Registered + precached but silent** — no call site (and no fallback) until the prestige feature ships |
| `arrow-attack-boss.mp3` | Non-crit boss hit (weapon variety) | Part of `playSlash`'s random boss-attack pool; falls back to `sword-slice.mp3` |
| `spell-attack-boss.mp3` | Non-crit boss hit (weapon variety) | Part of `playSlash`'s random boss-attack pool; falls back to `sword-slice.mp3` |
| `focus-start.mp3` | Focus/Pomodoro session start | id `focus-start` (§2.6 Pass 2); via `showAchievement(…,'focus-start')`; falls back to `achievement-daily.mp3` |
| `focus-break-start.mp3` | Pomodoro break begins | id `focus-break-start`; falls back to `notification.wav` |
| `focus-break-end.mp3` | Pomodoro break ends (resume) | id `focus-break-end`; falls back to `notification.wav` |
| `badge-unlock.mp3` | Badge earned | id `badge-unlock`; via `showAchievement(…,'badge')`; falls back to `achievement-monthly.wav` |
| `error-blocked.mp3` | Blocked / invalid action | id `error-blocked`; plays at 0.5× master; falls back to `notification.wav` |

> **Boss-attack pool:** a non-crit boss hit randomly plays one of
> `sword-slice` / `arrow-attack-boss` / `spell-attack-boss` (see
> `_bossAttackPool` in `audio-manager.js`). The `sword-slice` pick is
> further randomized with its `-N` variants (below). Crits always play
> `boss-crit`. Add more weapon sounds by extending `_bossAttackPool`.

### Optional event sounds (silently skipped until the file exists)

Remaining gaps are **feature-gated** — their mechanics aren't built yet, so
they have no call site and stay silent (no fallback) until both the feature
and its asset ship.

| File | Plays for | Notes |
|---|---|---|
| `boss-enrage.mp3` | Boss entering enrage phase | enrage mechanic not implemented |
| `companion-evolve.mp3` | Companion evolution | evolution mechanic not implemented |

### Anti-habituation variants (§2.6 Pass 3)

High-frequency sounds may ship 2–3 alternates named `<id>-1.mp3`,
`<id>-2.mp3`, `<id>-3.mp3`. The app probes for them at audio warm-up
and picks randomly among base + found variants per play. Supported
base ids: `task-complete`, `gold-earned`, `sword-slice`, `loot-coin`,
`notification`.

**On disk:** `sword-slice-2.mp3` (mixed into every `sword-slice` play).

### Volume table (§2.6 Pass 4)

Per-event loudness lives in the `_eventVolumes` map in
`audio-manager.js` (constructor) — adjust mix there, not at call sites.

---

## �🎵 Sound Files List

### Achievement Sounds (5 files)
These play when you unlock achievements of different tiers:

1. **`achievement-daily.wav`** - Quick victory chime (short, simple)
   - Plays for: Daily task completions, small wins
   - Suggested length: 0.5-1 second
   - Example: Simple "ding" or "chime"

2. **`achievement-weekly.wav`** - Better victory fanfare (medium)
   - Plays for: Weekly goal completions, moderate achievements
   - Suggested length: 1-2 seconds
   - Example: Ascending chime sequence

3. **`achievement-monthly.wav`** - Strong achievement (longer)
   - Plays for: Monthly goal completions, significant progress
   - Suggested length: 2-3 seconds
   - Example: Triumphant fanfare

4. **`achievement-yearly.wav`** - Epic fanfare (impressive)
   - Plays for: Yearly goals, major milestones
   - Suggested length: 3-4 seconds
   - Example: Orchestral victory theme

5. **`achievement-life.wav`** - LEGENDARY! (most epic)
   - Plays for: Life goals, ultimate achievements
   - Suggested length: 4-6 seconds
   - Example: Full triumphant orchestration

### Gameplay Sounds (7 files)

6. **`notification.wav`** - Gentle notification ping
   - Plays for: Focus timer completion, reminders
   - Suggested length: 0.5-1 second
   - Example: Soft bell or chime

7. **`spell.wav`** - Magical spell casting
   - Plays for: Using spells from spellbook
   - Suggested length: 1-2 seconds
   - Example: Magical "whoosh" or sparkle sound

8. **`level-up.wav`** - Level up celebration
   - Plays for: Gaining a new level
   - Suggested length: 2-3 seconds
   - Example: Power-up sound with rising tone

9. **`quest-complete.wav`** - Quest completion
   - Plays for: Completing quests and goals
   - Suggested length: 1-2 seconds
   - Example: Success jingle

10. **`boss-defeated.wav`** - Boss defeated!
    - Plays for: Defeating a boss battle
    - Suggested length: 3-4 seconds
    - Example: Epic victory fanfare

11. **`crystal-earn.wav`** - Focus crystal earned
    - Plays for: Earning focus crystals from Pomodoro
    - Suggested length: 1-2 seconds
    - Example: Crystalline chime or sparkle

---

## 📝 File Format Guidelines

### Supported Formats
- **WAV** (currently configured - highest quality)
- **MP3** (good alternative - best compatibility)
- **OGG** (also supported)
- **M4A** (works on most browsers)

### File Size Recommendations
- Achievement sounds: < 100KB each
- Gameplay sounds: < 50KB each
- Total folder size: < 1MB for fast loading

### Audio Quality
- **Sample rate**: 44.1 kHz or 48 kHz
- **Bit rate**: 128-192 kbps (MP3)
- **Channels**: Mono or Stereo
- **Volume**: Normalize to -6dB to -3dB (not too loud!)

---

## 🎨 Where to Get Sounds

### Free Sound Resources
1. **Freesound.org** - Huge library of free sounds
2. **Zapsplat.com** - Free game sounds (attribution required)
3. **Mixkit.co** - Free sound effects
4. **OpenGameArt.org** - Game sounds (various licenses)
5. **Soundbible.com** - Public domain sounds

### Paid/Premium (Optional)
1. **Audiojungle.net** - Professional game sounds ($1-5 each)
2. **Envato Elements** - Unlimited downloads ($16.50/month)
3. **Epidemic Sound** - Royalty-free library

### Create Your Own
- **GarageBand** (Mac/iOS) - Free music creation
- **Audacity** (Free) - Audio editing
- **FL Studio** (Paid) - Professional audio production
- **Bfxr** (Free online) - 8-bit game sound generator: https://www.bfxr.net/

---

## 🛠️ Setting Up Your Sounds

### Step 1: Get Your Sound Files
Download or create 12 sound files matching the names above.

### Step 2: Convert to WAV (if needed)
Use a free converter like:
- https://cloudconvert.com/audio-converter
- Audacity (free software)

### Step 3: Rename Files
Make sure your files are named EXACTLY as listed above:
```
achievement-daily.wav
achievement-weekly.wav
achievement-monthly.wav
achievement-yearly.wav
achievement-life.wav
notification.wav
spell.wav
level-up.wav
quest-complete.wav
boss-defeated.wav
crystal-earn.wav
```

### Step 4: Place in This Folder
Copy all 11 files into this `/sounds/` folder.

### Step 5: Test in App
1. Open Quest Journal
2. Complete a task → Should hear `achievement-daily.wav`
3. Use a spell → Should hear `spell.wav`
4. Complete focus session → Should hear `notification.wav`

---

## ⚙️ Audio Settings in App

Users can control sound in **Tools & Settings**:
- **Master Volume Slider**: 0% to 100%
- **Enable/Disable Toggle**: Turn all sounds on/off
- Settings are saved locally

---

## 🐛 Troubleshooting

### Sounds Not Playing?
1. Check file names match exactly (case-sensitive!)
2. Verify files are valid audio files (try opening in media player)
3. Check browser console (F12) for error messages
4. Ensure sounds are enabled in Tools & Settings
5. Check your browser allows audio (some browsers block autoplay)

### Sounds Too Loud/Quiet?
1. Adjust master volume in Tools & Settings
2. Or normalize audio files using Audacity:
   - Effect → Normalize → Set to -6dB

### Wrong Sound Playing?
1. Double-check file names
2. Clear browser cache (Ctrl+Shift+Delete)
3. Reload app (Ctrl+F5)

---

## 📦 Example Sound Pack

Want to test quickly? Download a free RPG sound pack:

**Fantasy Game UI Sounds** (Free)
https://opengameart.org/content/fantasy-game-ui-sounds

Or use placeholder sounds from:
**Universal UI Sounds** (Free)
https://assetstore.unity.com/packages/audio/sound-fx/universal-sound-fx-17256

---

## 🎵 Sample Configuration

If you want different file formats, update `audio-manager.js`:

```javascript
// Change extensions if needed
this.loadSound('achievement-daily', './sounds/achievement-daily.ogg');
this.loadSound('achievement-weekly', './sounds/achievement-weekly.wav');
```

---

## 📊 Current Status

Place an ✅ next to sounds you've added:

- [ ] achievement-daily.wav
- [ ] achievement-weekly.wav
- [ ] achievement-monthly.wav
- [ ] achievement-yearly.wav
- [ ] achievement-life.wav
- [ ] notification.wav
- [ ] spell.wav
- [ ] level-up.wav
- [ ] quest-complete.wav
- [ ] boss-defeated.wav
- [ ] crystal-earn.wav

---

## 🚀 Ready to Launch?

Once all sounds are in place:
1. Test each sound in the app
2. Adjust volume if needed
3. Update service worker cache in `service-worker.js` to include sounds
4. Deploy with your sound files

---

**Need help? Check the console (F12) for audio loading messages!**
