# 🎵 Sound Files Setup

## Place Your Sound Files Here

Put your custom sound files in this `/sounds/` folder with these **exact names**:

**Supports both .wav and .mp3 formats!**

```
sounds/
├── achievement-daily.wav (or .mp3)
├── achievement-weekly.wav (or .mp3)
├── achievement-monthly.wav (or .mp3)
├── achievement-yearly.wav (or .mp3)
├── achievement-life.wav (or .mp3)
├── notification.wav (or .mp3)
└── spell.wav (or .mp3)
```

The app will automatically try .wav first, then fall back to .mp3 if not found.

## Required Sound Files

| File Name | When It Plays | Suggested Length |
|-----------|---------------|------------------|
| `achievement-daily` (.wav or .mp3) | Daily tasks completed | 0.5-1 sec |
| `achievement-weekly` (.wav or .mp3) | Weekly goals completed | 1-2 sec |
| `achievement-monthly` (.wav or .mp3) | Monthly raids completed | 2-3 sec |
| `achievement-yearly` (.wav or .mp3) | Yearly goals completed | 3-4 sec |
| `achievement-life` (.wav or .mp3) | Life goals completed | 4-6 sec |
| `notification` (.wav or .mp3) | Focus timer done, reminders | 0.5-1 sec |
| `spell` (.wav or .mp3) | Casting spells from spellbook | 1-2 sec |

## Supported Formats

- **WAV & MP3** (both fully supported with automatic fallback!)
- Also works: OGG, M4A

**How it works:** The app tries .wav first. If not found, it automatically tries .mp3. You can mix and match formats!

## Quick Test

1. Add your sound files to this folder (either .wav or .mp3)
2. Open the app
3. Complete a task → should hear your achievement sound
4. Use a spell → should hear your spell sound
5. Complete focus timer → should hear your notification sound

## Volume Levels

Current volumes in the code:
- Achievement sounds: 50% volume
- Notification: 30% volume  
- Spell: 50% volume

To change, edit `goal-manager.js` and adjust the `audio.volume` values (0.0 to 1.0)

## Troubleshooting

**Sounds not playing?**
- Verify file names match EXACTLY (case-sensitive!)
- Check files are in the `/sounds/` folder
- Open browser console (F12) for error messages
- Make sure files are valid audio files

**Wrong sound playing?**
- Double-check file names
- Refresh the page (Ctrl+F5)

---

That's it! Just drop your files here and they'll work automatically! 🎮
