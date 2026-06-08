# Theme background GIF -> WebM converter
#
# Converts every icons/*-bg.gif into a 1080x1920 portrait WebM (VP9) for use
# as a fixed <video> element behind the app. Original GIFs are preserved so
# you can verify visually before deleting them.
#
# Requires ffmpeg on PATH. Install with:  winget install Gyan.FFmpeg
#
# Usage:  pwsh ./scripts/convert-theme-bgs.ps1
#         (or)  powershell -ExecutionPolicy Bypass -File scripts/convert-theme-bgs.ps1

$ErrorActionPreference = 'Stop'

# Resolve paths relative to repo root regardless of where the script is invoked.
$RepoRoot = Split-Path -Parent $PSScriptRoot
$IconsDir = Join-Path $RepoRoot 'icons'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "ffmpeg not found on PATH. Install: winget install Gyan.FFmpeg"
    exit 1
}

if (-not (Test-Path $IconsDir)) {
    Write-Error "icons/ directory not found at $IconsDir"
    exit 1
}

$gifs = Get-ChildItem -Path (Join-Path $IconsDir '*-bg.gif')
if ($gifs.Count -eq 0) {
    Write-Host "No *-bg.gif files found in $IconsDir"
    exit 0
}

Write-Host "Converting $($gifs.Count) theme background(s) to 1080x1920 WebM (VP9)..."
Write-Host ""

$totalBefore = 0
$totalAfter  = 0

foreach ($gif in $gifs) {
    $webm = [System.IO.Path]::ChangeExtension($gif.FullName, '.webm')
    $gifSize = [math]::Round($gif.Length / 1MB, 2)
    $totalBefore += $gif.Length

    Write-Host "[$($gif.Name)] ($gifSize MB) -> $(Split-Path $webm -Leaf)"

    # VP9 settings:
    #   -crf 35    : quality (lower=better, higher=smaller; 32-38 sweet spot for backgrounds)
    #   -b:v 0     : constant-quality mode
    #   -row-mt 1  : multi-threaded encoding
    #   scale+crop : fit to 1080x1920 portrait, cover-style (no letterboxing)
    #   -an        : strip any audio (GIFs don't have it but be explicit)
    # -pix_fmt yuv420p : force YUV 4:2:0 — VP9's standard input format. GIFs
    #                    decode as 'gbrap' (RGB+alpha) which VP9 rejects.
    #                    Backgrounds don't need transparency, so flatten.
    & ffmpeg -y -hide_banner -loglevel error `
        -i $gif.FullName `
        -c:v libvpx-vp9 -crf 35 -b:v 0 -row-mt 1 `
        -pix_fmt yuv420p `
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=15" `
        -an `
        $webm

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "  ffmpeg failed for $($gif.Name)"
        continue
    }

    $webmFile = Get-Item $webm
    $webmSize = [math]::Round($webmFile.Length / 1MB, 2)
    $reduction = [math]::Round((1 - ($webmFile.Length / $gif.Length)) * 100, 1)
    $totalAfter += $webmFile.Length

    Write-Host "  -> $webmSize MB ($reduction% smaller)" -ForegroundColor Green
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
Write-Host "  1. Visually verify each *-bg.webm in a video player."
Write-Host "  2. Run: npm run copy-web   (copies new files into www/)"
Write-Host "  3. Run: npx cap sync android"
Write-Host "  4. Once satisfied, delete the original *-bg.gif files manually."
