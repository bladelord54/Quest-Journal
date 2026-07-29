# Chest Art Assets (v2.9 Track 1)

The code side is fully wired (`goal-manager.js` `_probeChestArt` /
`_tryChestOpenVideo` / `_chestStaticHTML`). Drop files matching these
names into this folder and they activate with **zero code changes**.
Absent files = emoji tiles + the CSS celebration, exactly as today.

## Naming contract

| File | Used for |
|---|---|
| `chest-wooden.webp` or `.png` | Static closed-chest art (treasury tile + celebration icon) |
| `chest-bronze.webp` or `.png` | " |
| `chest-silver.webp` or `.png` | " |
| `chest-gold.webp` or `.png` | " |
| `chest-royal.webp` or `.png` | " |
| `chest-open-bronze.webm` | Opaque open cinematic (played as framed card over dim backdrop) |
| `chest-open-silver.webm` | " |
| `chest-open-gold.webm` | " |
| `chest-open-royal.webm` | " |
| `chest-open-wooden.webm` | " (optional — wooden also accepts one) |

WebP is preferred over PNG when both exist for the same tier.

## Static art specs

- Transparent background (the tiles have their own gradient)
- Rendered at 72×72 px in tiles, 96×96 px in the celebration icon —
  ship ~256×256 source for crispness on high-DPI screens
- `cwebp -q 85 chest-gold.png -o chest-gold.webp` if converting from PNG

## Open-cinematic specs

- **Duration ~2.0 seconds** — the loot panel arrives at 2200 ms
  (`showChestRewards`); longer videos are force-removed at that mark
- **No audio track** — the video plays muted; `chest-open.mp3`
  carries the sound. Stripping audio saves ~78% of the file size.
- **Render size** — the video is shown at `min(70vw, 420px)` with
  rounded corners over a dimmed backdrop. The shipped assets are
  512×512 px and use a baked-in dark gradient background; the CSS
  frames them as a cinematic card (`border-radius: 16px`).
  *If you want a truly transparent overlay,* encode with alpha:
  `ffmpeg -framerate 30 -i frames_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 34 chest-open-gold.webm`
  then drop the backdrop + radius from `.chest-open-video-overlay`.
- **Encode command for the shipped opaque assets** (2× speed-up,
  no audio, VP9 CRF 34):
  `ffmpeg -i chest-open-gold.webm -an -vf "setpts=PTS/2.1" -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 chest-open-gold.webm`
- **Target sizes** — shipped files range from 38 KB (wooden) to 94 KB
  (royal) after stripping audio + retiming; even 4s originals came in
  under 2 MB, so there's comfortable headroom.

## Behavior gates

- `prefers-reduced-motion: reduce` and `fx-minimal` effects intensity
  both skip the video (CSS celebration runs instead, which has its own
  motion gates)
- Files are discovered via HEAD requests at startup; no 404 GETs are
  ever issued for missing art
