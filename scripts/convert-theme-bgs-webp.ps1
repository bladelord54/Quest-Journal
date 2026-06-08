# Theme background GIF -> animated WebP converter
#
# Drop-in replacement for the GIFs: animated WebP files keep the existing
# `background-image: url(...)` CSS pattern (no markup refactor like WebM
# would require) but ship at ~70-90% smaller file sizes.
#
# Browser/WebView support:
#   - Android System WebView (Chromium) — full animated WebP since Android 5
#   - Capacitor on Android — uses System WebView, so always supported
#   - All modern desktop browsers
#
# Requires ffmpeg on PATH. Install with: winget install Gyan.FFmpeg
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/convert-theme-bgs-webp.ps1

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$IconsDir = Join-Path $RepoRoot 'icons'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "ffmpeg not found on PATH. Install: winget install Gyan.FFmpeg"
    exit 1
}

$gifs = Get-ChildItem -Path (Join-Path $IconsDir '*-bg.gif')
if ($gifs.Count -eq 0) {
    Write-Host "No *-bg.gif files found in $IconsDir"
    exit 0
}

# Per-theme quality tuning. Larger GIFs need more aggressive compression to
# clear our ~1.5 MB target. Quality is 0-100 (higher = better/larger).
# Lossy mode is used for everything (lossless animated WebP is huge).
$quality = @{
    'desert-bg'   = 80   # tiny source, can keep high quality
    'forest-bg'   = 75
    'ice-bg'      = 70
    'volcanic-bg' = 65
    'shadow-bg'   = 65
    'golden-bg'   = 55   # 7.4 MB GIF -> push harder
    'mystic-bg'   = 45   # 63 MB GIF -> push hardest
}

Write-Host "Converting $($gifs.Count) theme background(s) to animated WebP..."
Write-Host ""

$totalBefore = 0
$totalAfter  = 0

foreach ($gif in $gifs) {
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($gif.Name)
    $webp = [System.IO.Path]::ChangeExtension($gif.FullName, '.webp')
    $q    = if ($quality.ContainsKey($stem)) { $quality[$stem] } else { 70 }
    $gifSize = [math]::Round($gif.Length / 1MB, 2)
    $totalBefore += $gif.Length

    Write-Host "[$($gif.Name)] ($gifSize MB, q=$q) -> $(Split-Path $webp -Leaf)"

    # libwebp_anim encoder produces animated WebP from a GIF.
    #   -loop 0       : loop forever (matches GIF behavior)
    #   -lossless 0   : lossy mode (lossless animated WebP is massive)
    #   -q:v <n>      : quality 0-100
    #   -compression_level 6 : max compression effort (slow, smallest output)
    #   scale+crop    : 1080x1920 portrait, cover-style
    & ffmpeg -y -hide_banner -loglevel error `
        -i $gif.FullName `
        -vcodec libwebp_anim `
        -loop 0 `
        -lossless 0 `
        -q:v $q `
        -compression_level 6 `
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" `
        -an `
        $webp

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $webp)) {
        Write-Warning "  ffmpeg failed for $($gif.Name)"
        continue
    }

    $webpFile = Get-Item $webp
    $webpSize = [math]::Round($webpFile.Length / 1MB, 2)
    $reduction = [math]::Round((1 - ($webpFile.Length / $gif.Length)) * 100, 1)
    $totalAfter += $webpFile.Length

    Write-Host "  -> $webpSize MB ($reduction% smaller)" -ForegroundColor Green
    Write-Host ""
}

$totalBeforeMB = [math]::Round($totalBefore / 1MB, 2)
$totalAfterMB  = [math]::Round($totalAfter  / 1MB, 2)
$totalReduction = if ($totalBefore -gt 0) { [math]::Round((1 - ($totalAfter / $totalBefore)) * 100, 1) } else { 0 }

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Total: $totalBeforeMB MB -> $totalAfterMB MB ($totalReduction% smaller)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Visually verify each *-bg.webp (drag into Chrome to preview)."
Write-Host "  2. The JS config will be auto-updated to point at .webp files."
Write-Host "  3. Run: node scripts/copy-web.js && npx cap sync android"
