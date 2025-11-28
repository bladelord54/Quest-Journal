# Quest Journal - Sound Files Guide

## 📁 Required Sound Files

Place your custom sound files in this `/sounds/` folder. The app will automatically load and play them.

---

## 🎵 Sound Files List

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

10. **`boss-damage.wav`** - Attacking boss
    - Plays for: Damaging a boss in boss battles
    - Suggested length: 0.3-0.5 seconds
    - Example: Sword slash or impact sound

11. **`boss-defeated.wav`** - Boss defeated!
    - Plays for: Defeating a boss battle
    - Suggested length: 3-4 seconds
    - Example: Epic victory fanfare

12. **`crystal-earn.wav`** - Focus crystal earned
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
boss-damage.wav
boss-defeated.wav
crystal-earn.wav
```

### Step 4: Place in This Folder
Copy all 12 files into this `/sounds/` folder.

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
- [ ] boss-damage.wav
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
