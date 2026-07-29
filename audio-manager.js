// @ts-check
// Audio Manager for Life Quest Journal
// Handles loading and playing custom sound files

class AudioManager {
    constructor() {
        /** @type {Record<string, string>} */
        this._soundPaths = {};
        /** @type {Record<string, AudioBuffer>} */
        this._audioBuffers = {};
        /** @type {AudioContext | null} */
        this._ctx = null;
        this._warmedUp = false;
        this.enabled = true;
        this.volume = 0.5; // Master volume (0.0 to 1.0)
        
        // Sound queue system
        /** @type {Array<{ soundId: string, baseId: string, volumeOverride: number|null, enqueuedAt: number }>} */
        this._soundQueue = [];
        this._soundPlaying = false;
        /** @type {string | null} */
        this._lastPlayedId = null;
        this._lastPlayedTime = 0;

        // Per-sound-id last-played map for fine-grained throttling (Fix E)
        /** @type {Record<string, number>} */
        this._lastPlayedById = {};
        // Per-sound minimum interval in ms; defaults to 150ms (Fix E)
        /** @type {Record<string, number>} */
        this._minIntervalById = {
            'sword-slice': 200,
            'arrow-attack-boss': 200,
            'spell-attack-boss': 200
        };
        // Max age before a queued sound is considered stale and dropped (Fix A)
        this._maxQueueAgeMs = 1500;

        // §2.6 Pass 4 — central event volume table. Multiplier applied to
        // the master volume when the caller passes no explicit override.
        // Replaces the magic numbers that were scattered across the play*
        // helpers (playNotification's 0.6, playCrystalEarn's 0.8, ...).
        // Unlisted ids play at 1.0 × master.
        /** @type {Record<string, number>} */
        this._eventVolumes = {
            'notification': 0.6,
            'sword-slice': 0.6,   // non-crit; crit passes a full-volume override
            'arrow-attack-boss': 0.6,  // boss-attack pool — match the slash mix
            'spell-attack-boss': 0.6,
            'crystal-earn': 0.8,
            'daily-achievement': 0.8,
            'task-complete': 0.8,
            'error-blocked': 0.5
        };

        // §2.6 Pass 3 — anti-habituation variants. High-frequency sounds
        // may ship 2–3 alternates named `<id>-1.mp3` / `<id>-2.mp3` /
        // `<id>-3.mp3`; _probeVariants() (run at warm-up) registers the
        // ones that exist and play() picks randomly among base + variants.
        // No variant files on disk yet — drop them into sounds/ and they
        // are picked up with zero code changes.
        this._variantIds = ['task-complete', 'gold-earned', 'sword-slice', 'loot-coin', 'notification'];
        /** @type {Record<string, string[]>} */
        this._variants = {}; // baseId -> [registered variant ids]

        // Boss-attack sound pool — a non-crit boss hit randomly plays one
        // of these for weapon variety (a sword slash, an arrow volley, or a
        // spell bolt). `sword-slice` is further randomized with its
        // anti-habituation variants (e.g. sword-slice-2) by _resolveVariant.
        // arrow/spell-attack-boss fall back to sword-slice if their file is
        // ever missing. Crits ignore this pool and play `boss-crit`.
        this._bossAttackPool = ['sword-slice', 'arrow-attack-boss', 'spell-attack-boss'];

        // §2.6 Pass 2 — coverage-gap event ids registered ahead of their
        // assets. Optional: a missing file is silently skipped (no console
        // error, no HTML-Audio retry) or routed through _fallbacks, so
        // call sites can be wired up now and the real sounds activate the
        // moment the files land in sounds/.
        this._optionalSounds = new Set([
            'task-complete', 'prestige-ascension', 'streak-freeze-used',
            'boss-enrage', 'badge-unlock', 'focus-start',
            'focus-break-start', 'focus-break-end', 'companion-evolve',
            'error-blocked',
            // §2.6 Pass 1 — repetition fixes. New ids registered ahead of
            // their assets; each falls back (via _fallbacks) to the sound
            // that previously did double-duty, so the split is audibly a
            // no-op until the dedicated files land.
            'spell-cast', 'enchantment-activate',          // R1
            'chest-open-bronze', 'chest-open-silver',       // R2
            'chest-open-gold', 'chest-open-royal',
            'boss-crit',                                    // R4
            // Boss-attack weapon-variety pool (random per non-crit hit).
            'arrow-attack-boss', 'spell-attack-boss',
            // §2.6 asset drop — dedicated daily/wooden chest open + habit
            // completion sounds (files now on disk; ids registered here).
            'chest-open-wooden', 'habit-completion'
        ]);
        // Each split id falls back to the sound that previously did
        // double-duty: routine completions → daily-achievement (R6), spell
        // systems → the shared `spell` (R1; now spell-cast.mp3), per-tier
        // chests → the base `chest-open` (R2), crits → `sword-slice` (R4).
        /** @type {Record<string, string>} */
        this._fallbacks = {
            'task-complete': 'daily-achievement',
            'spell-cast': 'spell',
            'enchantment-activate': 'spell',
            'chest-open-bronze': 'chest-open',
            'chest-open-silver': 'chest-open',
            'chest-open-gold': 'chest-open',
            'chest-open-royal': 'chest-open',
            'boss-crit': 'sword-slice',
            'arrow-attack-boss': 'sword-slice',
            'spell-attack-boss': 'sword-slice',
            // §2.6 Pass 2 wiring — coverage-gap events whose call sites
            // previously played a stand-in tier/notification sound. Each
            // falls back to that prior sound so the split is audibly a
            // no-op until the dedicated file lands in sounds/. (Events
            // with no prior sound — prestige-ascension, companion-evolve,
            // boss-enrage — are intentionally absent: their mechanics
            // aren't implemented yet, so they stay silent until both the
            // feature and its asset ship.)
            'badge-unlock': 'achievement-monthly',
            'focus-start': 'achievement-daily',
            'streak-freeze-used': 'achievement-life',
            'focus-break-start': 'notification',
            'focus-break-end': 'notification',
            'error-blocked': 'notification',
            // §2.6 asset drop — graceful fallbacks if a file is ever absent.
            'chest-open-wooden': 'chest-open',
            'habit-completion': 'daily-achievement'
        };
        
        // Load saved settings
        const savedVolume = localStorage.getItem('audioVolume');
        if (savedVolume !== null) {
            const parsed = parseFloat(savedVolume);
            if (!isNaN(parsed)) this.volume = Math.max(0, Math.min(1, parsed));
        }
        
        const savedEnabled = localStorage.getItem('audioEnabled');
        if (savedEnabled !== null) {
            this.enabled = savedEnabled === 'true';
        }
        
        // Legacy compat: some code checks window.audioManager.sounds
        this.sounds = {};
        
        this.init();
    }

    _getContext() {
        let ctx = this._ctx;
        if (!ctx || ctx.state === 'closed') {
            const Ctor = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
            ctx = /** @type {AudioContext} */ (new Ctor());
            this._ctx = ctx;
        }
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        return ctx;
    }

    init() {
        // Register sound file paths (loaded on-demand via fetch + Web Audio API)
        this._soundPaths['achievement-daily'] = './sounds/achievement-daily.wav';
        this._soundPaths['achievement-weekly'] = './sounds/achievement-weekly.wav';
        this._soundPaths['achievement-monthly'] = './sounds/achievement-monthly.wav';
        this._soundPaths['achievement-yearly'] = './sounds/achievement-yearly.mp3';
        this._soundPaths['achievement-life'] = './sounds/achievement-life.wav';
        this._soundPaths['notification'] = './sounds/notification.wav';
        // §2.6 R1 — `spells.mp3` was renamed `spell-cast.mp3` (the dedicated
        // spellbook-cast asset). The legacy `spell` id points at the same
        // file so it stays a valid fallback target for spell-cast /
        // enchantment-activate.
        this._soundPaths['spell'] = './sounds/spell-cast.mp3';
        this._soundPaths['level-up'] = './sounds/level-up.wav';
        this._soundPaths['boss-defeated'] = './sounds/boss-defeated.mp3';
        this._soundPaths['crystal-earn'] = './sounds/crystal-earn.wav';
        this._soundPaths['sword-slice'] = './sounds/sword-slice.mp3';
        this._soundPaths['loot-coin'] = './sounds/loot-coin.mp3';
        this._soundPaths['chest-open'] = './sounds/chest-open.mp3';
        this._soundPaths['gold-earned'] = './sounds/gold-earned.mp3';
        this._soundPaths['daily-achievement'] = './sounds/daily-achievement.mp3';

        // §2.6 Pass 2 event ids — files don't exist yet (optional sounds,
        // see _optionalSounds); paths are the naming contract for the
        // incoming assets.
        this._optionalSounds.forEach(id => {
            this._soundPaths[id] = `./sounds/${id}.mp3`;
        });
        
        // Pre-warm audio buffers on first user interaction
        const warmUp = () => {
            if (this._warmedUp) return;
            this._warmedUp = true;
            document.removeEventListener('touchstart', warmUp);
            document.removeEventListener('click', warmUp);
            // Initialize AudioContext and pre-fetch all sounds in background
            try { this._getContext(); } catch(e) {}
            Object.keys(this._soundPaths).forEach(id => {
                if (this._optionalSounds.has(id)) return; // fetched on demand, may not exist
                this._loadBuffer(id).catch(() => {});
            });
            this._probeVariants().catch(() => {});
        };
        document.addEventListener('touchstart', warmUp, { once: true });
        document.addEventListener('click', warmUp, { once: true });
    }

    // §2.6 Pass 3 — discover `<id>-1/2/3.mp3` variant files. Quiet
    // probing: a missing variant is the normal case, not an error.
    async _probeVariants() {
        for (const baseId of this._variantIds) {
            for (let n = 1; n <= 3; n++) {
                const variantId = `${baseId}-${n}`;
                const path = `./sounds/${variantId}.mp3`;
                try {
                    const res = await fetch(path, { method: 'HEAD' });
                    if (res.ok) {
                        this._soundPaths[variantId] = path;
                        if (!this._variants[baseId]) this._variants[baseId] = [];
                        this._variants[baseId].push(variantId);
                    }
                } catch (e) { /* offline or missing — base sound still works */ }
            }
        }
    }

    // Pick randomly among base + registered variants (base id if none).
    /** @param {string} soundId */
    _resolveVariant(soundId) {
        const variants = this._variants[soundId];
        if (!variants || variants.length === 0) return soundId;
        const pool = [soundId, ...variants];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /** @param {string} soundId @returns {Promise<AudioBuffer | null>} */
    async _loadBuffer(soundId) {
        if (this._audioBuffers[soundId]) return this._audioBuffers[soundId];
        
        const path = this._soundPaths[soundId];
        if (!path) return null;
        
        try {
            const response = await fetch(path);
            if (!response.ok) {
                // Optional sounds are expected to 404 until their assets
                // arrive — stay silent (§2.6 Pass 2).
                if (!this._optionalSounds.has(soundId)) {
                    console.error(`[Audio] Fetch failed for ${soundId}: ${response.status} ${response.statusText}`);
                }
                return null;
            }
            const arrayBuffer = await response.arrayBuffer();
            const ctx = this._getContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            this._audioBuffers[soundId] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.error(`[Audio] Failed to load/decode ${soundId}:`, /** @type {any} */ (e)?.message);
            return null;
        }
    }

    /** @param {string} soundId @param {number | null} [volumeOverride] */
    play(soundId, volumeOverride = null) {
        if (!this.enabled) return;
        if (!this._soundPaths[soundId]) return;

        const now = Date.now();
        
        // Per-sound throttle: skip if same sound played too recently (Fix E)
        const minInterval = this._minIntervalById[soundId] || 150;
        const lastForId = this._lastPlayedById[soundId] || 0;
        if (now - lastForId < minInterval) return;
        
        // Auto-recover if queue has been stuck for more than 2 seconds (Fix C)
        if (this._soundPlaying && now - this._lastPlayedTime > 2000) {
            this._soundPlaying = false;
            this._soundQueue = [];
        }
        
        // Cap queue to prevent runaway accumulation
        if (this._soundQueue.length >= 6) this._soundQueue.shift();
        
        // Variant resolution happens at enqueue time; throttling above is
        // keyed on the base id so variants can't bypass it. baseId also
        // drives the _eventVolumes lookup.
        this._soundQueue.push({ soundId: this._resolveVariant(soundId), baseId: soundId, volumeOverride, enqueuedAt: now });
        
        if (!this._soundPlaying) {
            this._processSoundQueue();
        }
    }
    
    async _processSoundQueue() {
        // Drop stale entries from the head of the queue (Fix A)
        const now = Date.now();
        while (this._soundQueue.length > 0 &&
               now - this._soundQueue[0].enqueuedAt > this._maxQueueAgeMs) {
            this._soundQueue.shift();
        }
        if (this._soundQueue.length === 0) {
            this._soundPlaying = false;
            return;
        }
        
        this._soundPlaying = true;
        const entry = this._soundQueue.shift();
        if (!entry) { this._soundPlaying = false; return; }
        const { soundId, baseId, volumeOverride } = entry;
        const throttleId = baseId || soundId;
        
        this._lastPlayedId = soundId;
        this._lastPlayedTime = Date.now();
        this._lastPlayedById[throttleId] = this._lastPlayedTime;
        
        // §2.6 Pass 4 — explicit override wins, else the central event
        // volume table scales the master volume.
        const eventMult = this._eventVolumes[throttleId] !== undefined ? this._eventVolumes[throttleId] : 1;
        const vol = volumeOverride !== null ? volumeOverride : this.volume * eventMult;
        const advance = () => setTimeout(() => this._processSoundQueue(), 100);
        
        // Strategy 1: Web Audio API (uses fetch → service worker cache)
        try {
            let buffer = await this._loadBuffer(soundId);
            // §2.6 Pass 2 — asset not shipped yet: try the fallback id,
            // else skip silently (optional ids never hit the HTML-Audio
            // retry below, which would log a load error per play).
            if (!buffer && this._fallbacks[throttleId]) {
                buffer = await this._loadBuffer(this._fallbacks[throttleId]);
            }
            if (!buffer && this._optionalSounds.has(throttleId)) {
                advance();
                return;
            }
            if (buffer) {
                const ctx = this._getContext();
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                
                const gainNode = ctx.createGain();
                gainNode.gain.value = vol;
                
                source.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                source.onended = advance;
                source.start(0);
                return; // Success — done
            }
        } catch (e) {}
        
        // Strategy 2: HTML Audio element fallback
        try {
            const audio = new Audio(this._soundPaths[soundId]);
            audio.volume = vol;
            audio.onended = advance;
            audio.onerror = advance;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(advance);
            }
        } catch (e) {
            advance();
        }
    }

    // Play achievement sound based on tier
    /** @param {string} [level] */
    playAchievement(level = 'daily') {
        /** @type {Record<string, string>} */
        const soundMap = {
            'daily': 'achievement-daily',
            'weekly': 'achievement-weekly',
            'monthly': 'achievement-monthly',
            'yearly': 'achievement-yearly',
            'life': 'achievement-life'
        };
        
        const soundId = soundMap[level] || 'achievement-daily';
        this.play(soundId);
    }

    // Play notification sound (volume via _eventVolumes)
    playNotification() {
        this.play('notification');
    }

    // Play spell casting sound.
    // §2.6 R1 — `spell` previously served two systems. Prefer the split
    // helpers below; this stays as a back-compat alias (routes to the
    // spellbook-cast sound) for any un-migrated caller.
    playSpell() {
        this.playSpellCast();
    }

    // §2.6 R1 — spellbook cast (Tools → Spells). Plays spell-cast.mp3 (the
    // renamed spells.mp3); `spell` is its fallback (same file).
    playSpellCast() {
        this.play('spell-cast');
    }

    // §2.6 R1 — enchantment activation (focus buffs). Falls back to
    // `spell` until enchantment-activate.mp3 ships.
    playEnchantmentActivate() {
        this.play('enchantment-activate');
    }

    // Play level up sound
    playLevelUp() {
        this.play('level-up');
    }

    // Play a boss-attack sound.
    // §2.6 R4 — crits play a dedicated `boss-crit` sound at full master
    // volume for punch. Non-crit hits randomly pick from _bossAttackPool
    // (sword slash / arrow / spell bolt) for variety; the chosen sound
    // still runs through play()'s variant picker (so sword-slice may swap
    // in sword-slice-2, etc.).
    playSlash(isCrit = false) {
        if (isCrit) {
            this.play('boss-crit', this.volume);
            return;
        }
        const pool = this._bossAttackPool;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        this.play(pick);
    }

    // Play boss defeated sound
    playBossDefeated() {
        this.play('boss-defeated');
    }

    // Play crystal earn sound (volume via _eventVolumes)
    playCrystalEarn() {
        this.play('crystal-earn');
    }

    // Play loot coin sound (chest rewards, loot drops)
    playLootCoin() {
        this.play('loot-coin', this.volume);
    }

    // Play chest opening celebration sound.
    // §2.6 R2 — per-tier open sounds (wooden/bronze/silver/gold/royal) give
    // each chest tier its own weight, each falling back to the base
    // `chest-open` if its file is ever missing. An unknown tier uses the
    // base sound.
    /** @param {string | null} [tier] */
    playChestOpen(tier = null) {
        /** @type {Record<string, string>} */
        const perTier = { wooden: 'chest-open-wooden', bronze: 'chest-open-bronze', silver: 'chest-open-silver', gold: 'chest-open-gold', royal: 'chest-open-royal' };
        this.play((tier && perTier[tier]) || 'chest-open');
    }

    // Play gold earned sound
    playGoldEarned() {
        this.play('gold-earned', this.volume);
    }

    // Play daily task completion sound (volume via _eventVolumes)
    playDailyAchievement() {
        this.play('daily-achievement');
    }

    // §2.6 R6 — dedicated routine-completion sound. Falls back to
    // daily-achievement (via _fallbacks) until task-complete.mp3 ships,
    // so call sites can switch over now with no audible change.
    playTaskComplete() {
        this.play('task-complete');
    }

    // §2.6 asset drop — dedicated habit-completion sound, distinct from the
    // routine task-complete sound. Falls back to daily-achievement if the
    // file is ever absent.
    playHabitComplete() {
        this.play('habit-completion');
    }

    // §2.6 Pass 2 — badge / achievement-badge unlock. Falls back to
    // achievement-monthly (the tier sound it previously borrowed) until
    // badge-unlock.mp3 ships.
    playBadgeUnlock() {
        this.play('badge-unlock');
    }

    // §2.6 Pass 2 — focus session start. Falls back to achievement-daily
    // until focus-start.mp3 ships.
    playFocusStart() {
        this.play('focus-start');
    }

    // §2.6 Pass 2 — Pomodoro break begins. Falls back to notification
    // (its prior sound) until focus-break-start.mp3 ships.
    playFocusBreakStart() {
        this.play('focus-break-start');
    }

    // §2.6 Pass 2 — Pomodoro break ends. Falls back to notification (its
    // prior sound) until focus-break-end.mp3 ships.
    playFocusBreakEnd() {
        this.play('focus-break-end');
    }

    // §2.6 Pass 2 — streak freeze / Time Freeze consumed to protect
    // progress. Falls back to achievement-life (the tier sound it
    // previously borrowed) until streak-freeze-used.mp3 ships.
    playStreakFreezeUsed() {
        this.play('streak-freeze-used');
    }

    // §2.6 Pass 2 — blocked / invalid action feedback (e.g. "not enough
    // gold", "timer already running"). Falls back to notification until
    // error-blocked.mp3 ships; quieter via _eventVolumes (0.5).
    playErrorBlocked() {
        this.play('error-blocked');
    }

    // §2.6 Pass 2 — events whose mechanics aren't implemented yet. No
    // fallback: they stay silent until BOTH the feature and the asset
    // ship. Helpers exist so the call sites can be wired the moment the
    // feature lands, with zero audio-manager changes.
    playPrestigeAscension() {
        this.play('prestige-ascension');
    }

    playCompanionEvolve() {
        this.play('companion-evolve');
    }

    playBossEnrage() {
        this.play('boss-enrage');
    }

    // Set master volume
    /** @param {number} volume */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        
        // Save to localStorage
        localStorage.setItem('audioVolume', this.volume.toString());
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('audioEnabled', this.enabled.toString());
        return this.enabled;
    }

    // Enable sounds
    enable() {
        this.enabled = true;
        localStorage.setItem('audioEnabled', 'true');
    }

    // Disable sounds
    disable() {
        this.enabled = false;
        localStorage.setItem('audioEnabled', 'false');
    }

    // Check if sounds are enabled
    isEnabled() {
        return this.enabled;
    }

    // Get current volume
    getVolume() {
        return this.volume;
    }
}

// Create global instance. `window.audioManager` is a runtime-attached global;
// cast once via a uniquely-named const (flat scripts share global lexical scope,
// so this must not collide with e.g. pwa-handler.js's `_win`).
const _amWin = /** @type {any} */ (window);
_amWin.audioManager = new AudioManager();

// UI Control Functions
function toggleAudio() {
    const enabled = _amWin.audioManager.toggle();
    const toggleBtn = document.getElementById('audio-toggle-btn');
    const toggleCircle = document.getElementById('audio-toggle-circle');
    if (!toggleBtn || !toggleCircle) return;
    
    if (enabled) {
        toggleBtn.classList.remove('bg-gray-600');
        toggleBtn.classList.add('bg-green-600');
        toggleCircle.classList.add('translate-x-5');
        toggleCircle.classList.remove('translate-x-0');
    } else {
        toggleBtn.classList.remove('bg-green-600');
        toggleBtn.classList.add('bg-gray-600');
        toggleCircle.classList.remove('translate-x-5');
        toggleCircle.classList.add('translate-x-0');
    }
}

/** @param {string} value */
function updateVolume(value) {
    const volume = parseFloat(value) / 100;
    _amWin.audioManager.setVolume(volume);
    
    const display = document.getElementById('volume-display');
    if (display) {
        display.textContent = `${value}%`;
    }
}

function testSound() {
    if (_amWin.audioManager) {
        _amWin.audioManager.playAchievement('weekly');
    }
}

// Initialize UI on page load
window.addEventListener('load', () => {
    // Set initial toggle state
    const toggleBtn = document.getElementById('audio-toggle-btn');
    const toggleCircle = document.getElementById('audio-toggle-circle');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeDisplay = document.getElementById('volume-display');
    
    if (toggleBtn && toggleCircle) {
        const enabled = _amWin.audioManager.isEnabled();
        if (enabled) {
            toggleBtn.classList.add('bg-green-600');
            toggleBtn.classList.remove('bg-gray-600');
            toggleCircle.classList.add('translate-x-5');
            toggleCircle.classList.remove('translate-x-0');
        } else {
            toggleBtn.classList.add('bg-gray-600');
            toggleBtn.classList.remove('bg-green-600');
            toggleCircle.classList.remove('translate-x-5');
            toggleCircle.classList.add('translate-x-0');
        }
    }
    
    // Set initial volume
    if (volumeSlider && volumeDisplay) {
        const volume = Math.round(_amWin.audioManager.getVolume() * 100);
        /** @type {HTMLInputElement} */ (volumeSlider).value = String(volume);
        volumeDisplay.textContent = `${volume}%`;
    }
});

