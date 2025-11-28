# 🎵 Dual Format Support - WAV & MP3

## ✨ Great News!

The app now supports **both WAV and MP3** formats automatically! You don't need to convert all your files to one format.

---

## 🎯 How It Works

When a sound needs to play, the app:

1. **First tries:** `achievement-daily.wav`
2. **If not found, tries:** `achievement-daily.mp3`
3. **Plays whichever exists!**

---

## 📁 Mix and Match!

You can use different formats for different sounds:

```
sounds/
├── achievement-daily.wav     ← WAV
├── achievement-weekly.mp3    ← MP3
├── achievement-monthly.wav   ← WAV
├── achievement-yearly.mp3    ← MP3
├── notification.mp3          ← MP3
├── spell.wav                 ← WAV
└── (etc...)
```

**It just works!** ✅

---

## 🎮 Example Scenarios

### Scenario 1: All WAV Files
```
achievement-daily.wav     ✓ Plays
achievement-weekly.wav    ✓ Plays
notification.wav          ✓ Plays
```

### Scenario 2: All MP3 Files
```
achievement-daily.mp3     ✓ Plays (falls back to .mp3)
achievement-weekly.mp3    ✓ Plays (falls back to .mp3)
notification.mp3          ✓ Plays (falls back to .mp3)
```

### Scenario 3: Mixed (Recommended!)
```
achievement-daily.wav     ✓ Plays .wav
achievement-weekly.mp3    ✓ Plays .mp3 (no .wav found)
notification.wav          ✓ Plays .wav
```

---

## 💡 Pro Tips

### Best Practices

1. **High Quality Sounds?** → Use WAV
   - Better audio quality
   - No compression artifacts
   - Larger file size

2. **Keep File Size Small?** → Use MP3
   - Smaller file size
   - Faster loading
   - Slightly lower quality

3. **Best of Both Worlds?**
   - Use WAV for important sounds (level-up, boss defeated)
   - Use MP3 for common sounds (daily tasks, notifications)

---

## 📝 File Naming

Just use the base name + format:

**Achievement Sounds:**
- `achievement-daily.wav` or `achievement-daily.mp3`
- `achievement-weekly.wav` or `achievement-weekly.mp3`
- `achievement-monthly.wav` or `achievement-monthly.mp3`
- `achievement-yearly.wav` or `achievement-yearly.mp3`
- `achievement-life.wav` or `achievement-life.mp3`

**Other Sounds:**
- `notification.wav` or `notification.mp3`
- `spell.wav` or `spell.mp3`

---

## ⚡ Performance

**Load Time:**
- WAV: Instant playback (no decoding needed)
- MP3: Very fast playback (minimal decoding)

**File Size Comparison:**
- WAV: ~100-500KB (0.5-2 seconds of audio)
- MP3: ~10-50KB (same audio, compressed)

**Recommendation:** If file size matters (for web deployment), use MP3. If quality matters, use WAV.

---

## 🔧 Technical Details

### How Fallback Works

```javascript
const audio = new Audio();
audio.src = './sounds/achievement-daily.wav';

// If .wav fails to load, automatically tries .mp3
audio.addEventListener('error', () => {
    audio.src = './sounds/achievement-daily.mp3';
}, { once: true });

audio.play();
```

### What Happens If Neither Exists?

- App continues to work normally
- No error shown to user
- Console message logged (for debugging)
- No crash or freeze

---

## 🎨 Format Comparison

| Feature | WAV | MP3 |
|---------|-----|-----|
| **Quality** | ⭐⭐⭐⭐⭐ Uncompressed | ⭐⭐⭐⭐ Very Good |
| **File Size** | ❌ Larger (100-500KB) | ✅ Smaller (10-50KB) |
| **Browser Support** | ✅ All browsers | ✅ All browsers |
| **Load Speed** | ✅ Instant | ✅ Very Fast |
| **Best For** | High-quality SFX | Web deployment |

---

## 🚀 Quick Start

1. **Get your sound files** (WAV or MP3 or both!)
2. **Name them correctly** (see list above)
3. **Drop in /sounds/ folder**
4. **Done!** They'll work automatically

---

## ❓ FAQ

**Q: Can I have both WAV and MP3 of the same sound?**  
A: Yes! The app will use .wav and ignore .mp3 as a backup.

**Q: Which format should I use?**  
A: Either! Use WAV for quality, MP3 for smaller files.

**Q: Can I convert between formats later?**  
A: Yes! Just add the new format file. Old one can stay or be deleted.

**Q: Does this work offline (PWA)?**  
A: Yes! Both formats are cached by the service worker.

**Q: What about OGG or M4A?**  
A: They work too, but there's no automatic fallback for them.

---

**Enjoy your flexible audio system!** 🎵✨
