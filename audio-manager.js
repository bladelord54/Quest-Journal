// Audio Manager for Life Quest Journal
// Handles loading and playing custom sound files

class AudioManager {
    constructor() {
        this._soundPaths = {};
        this._audioBuffers = {};
        this._ctx = null;
        this._warmedUp = false;
        this.enabled = true;
        this.volume = 0.5; // Master volume (0.0 to 1.0)
        
        // Sound queue system
        this._soundQueue = [];
        this._soundPlaying = false;
        this._lastPlayedId = null;
        this._lastPlayedTime = 0;
        
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
        if (!this._ctx || this._ctx.state === 'closed') {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._ctx.state === 'suspended') {
            this._ctx.resume().catch(() => {});
        }
        return this._ctx;
    }

    init() {
        // Register sound file paths (loaded on-demand via fetch + Web Audio API)
        this._soundPaths['achievement-daily'] = './sounds/achievement-daily.wav';
        this._soundPaths['achievement-weekly'] = './sounds/achievement-weekly.wav';
        this._soundPaths['achievement-monthly'] = './sounds/achievement-monthly.wav';
        this._soundPaths['achievement-yearly'] = './sounds/achievement-yearly.mp3';
        this._soundPaths['achievement-life'] = './sounds/achievement-life.wav';
        this._soundPaths['notification'] = './sounds/notification.wav';
        this._soundPaths['spell'] = './sounds/spells.mp3';
        this._soundPaths['level-up'] = './sounds/level-up.wav';
        this._soundPaths['boss-damage'] = './sounds/boss-damage.mp3';
        this._soundPaths['boss-defeated'] = './sounds/boss-defeated.mp3';
        this._soundPaths['crystal-earn'] = './sounds/crystal-earn.wav';
        this._soundPaths['sword-slice'] = './sounds/sword-slice.mp3';
        this._soundPaths['loot-coin'] = './sounds/loot-coin.mp3';
        this._soundPaths['chest-open'] = './sounds/chest-open.mp3';
        this._soundPaths['gold-earned'] = './sounds/gold-earned.mp3';
        this._soundPaths['daily-achievement'] = './sounds/daily-achievement.mp3';
        
        // Pre-warm audio buffers on first user interaction
        const warmUp = () => {
            if (this._warmedUp) return;
            this._warmedUp = true;
            document.removeEventListener('touchstart', warmUp);
            document.removeEventListener('click', warmUp);
            // Initialize AudioContext and pre-fetch all sounds in background
            try { this._getContext(); } catch(e) {}
            Object.keys(this._soundPaths).forEach(id => {
                this._loadBuffer(id).catch(() => {});
            });
        };
        document.addEventListener('touchstart', warmUp, { once: true });
        document.addEventListener('click', warmUp, { once: true });
    }

    async _loadBuffer(soundId) {
        if (this._audioBuffers[soundId]) return this._audioBuffers[soundId];
        
        const path = this._soundPaths[soundId];
        if (!path) return null;
        
        try {
            const response = await fetch(path);
            if (!response.ok) {
                console.error(`[Audio] Fetch failed for ${soundId}: ${response.status} ${response.statusText}`);
                return null;
            }
            const arrayBuffer = await response.arrayBuffer();
            const ctx = this._getContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            this._audioBuffers[soundId] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.error(`[Audio] Failed to load/decode ${soundId}:`, e.message);
            return null;
        }
    }

    play(soundId, volumeOverride = null) {
        if (!this.enabled) return;
        if (!this._soundPaths[soundId]) return;

        const now = Date.now();
        
        // Debounce: skip if same sound played within 150ms
        if (soundId === this._lastPlayedId && now - this._lastPlayedTime < 150) return;
        
        // Auto-recover if queue has been stuck for more than 5 seconds
        if (this._soundPlaying && now - this._lastPlayedTime > 5000) {
            this._soundPlaying = false;
            this._soundQueue = [];
        }
        
        // Cap queue to prevent runaway accumulation
        if (this._soundQueue.length >= 6) this._soundQueue.shift();
        
        this._soundQueue.push({ soundId, volumeOverride });
        
        if (!this._soundPlaying) {
            this._processSoundQueue();
        }
    }
    
    async _processSoundQueue() {
        if (this._soundQueue.length === 0) {
            this._soundPlaying = false;
            return;
        }
        
        this._soundPlaying = true;
        const { soundId, volumeOverride } = this._soundQueue.shift();
        
        this._lastPlayedId = soundId;
        this._lastPlayedTime = Date.now();
        
        const vol = volumeOverride !== null ? volumeOverride : this.volume;
        const advance = () => setTimeout(() => this._processSoundQueue(), 100);
        
        // Strategy 1: Web Audio API (uses fetch → service worker cache)
        try {
            const buffer = await this._loadBuffer(soundId);
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
    playAchievement(level = 'daily') {
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

    // Play notification sound
    playNotification() {
        this.play('notification', this.volume * 0.6);
    }

    // Play spell casting sound
    playSpell() {
        this.play('spell');
    }

    // Play level up sound
    playLevelUp() {
        this.play('level-up');
    }

    // Play boss damage sound
    playBossDamage() {
        this.play('boss-damage', this.volume * 0.8);
    }

    // Play sword slice sound (boss attacks)
    playSlash(isCrit = false) {
        this.play('sword-slice', isCrit ? this.volume : this.volume * 0.6);
    }

    // Play boss defeated sound
    playBossDefeated() {
        this.play('boss-defeated');
    }

    // Play crystal earn sound
    playCrystalEarn() {
        this.play('crystal-earn', this.volume * 0.8);
    }

    // Play loot coin sound (chest rewards, loot drops)
    playLootCoin() {
        this.play('loot-coin', this.volume);
    }

    // Play chest opening celebration sound
    playChestOpen() {
        this.play('chest-open');
    }

    // Play gold earned sound
    playGoldEarned() {
        this.play('gold-earned', this.volume);
    }

    // Play daily task completion sound
    playDailyAchievement() {
        this.play('daily-achievement', this.volume * 0.8);
    }

    // Set master volume
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

// Create global instance
window.audioManager = new AudioManager();

// UI Control Functions
function toggleAudio() {
    const enabled = window.audioManager.toggle();
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

function updateVolume(value) {
    const volume = parseFloat(value) / 100;
    window.audioManager.setVolume(volume);
    
    const display = document.getElementById('volume-display');
    if (display) {
        display.textContent = `${value}%`;
    }
}

function testSound() {
    if (window.audioManager) {
        window.audioManager.playAchievement('weekly');
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
        const enabled = window.audioManager.isEnabled();
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
        const volume = Math.round(window.audioManager.getVolume() * 100);
        volumeSlider.value = volume;
        volumeDisplay.textContent = `${volume}%`;
    }
});

