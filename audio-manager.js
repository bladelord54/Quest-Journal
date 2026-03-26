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
        this.version = 283; // For debugging: confirms which code is running
        
        // Sound queue system
        this._soundQueue = [];
        this._soundPlaying = false;
        this._lastPlayedId = null;
        this._lastPlayedTime = 0;
        
        // Load saved settings
        const savedVolume = localStorage.getItem('audioVolume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
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
        this._soundPaths['achievement-yearly'] = './sounds/achievement-yearly.wav';
        this._soundPaths['achievement-life'] = './sounds/achievement-life.wav';
        this._soundPaths['notification'] = './sounds/notification.wav';
        this._soundPaths['spell'] = './sounds/spells.mp3';
        this._soundPaths['level-up'] = './sounds/level-up.wav';
        this._soundPaths['boss-damage'] = './sounds/boss-damage.mp3';
        this._soundPaths['boss-defeated'] = './sounds/boss-defeated.mp3';
        this._soundPaths['crystal-earn'] = './sounds/crystal-earn.wav';
        this._soundPaths['sword-slice'] = './sounds/sword-slice.mp3';
        this._soundPaths['loot-coin'] = './sounds/loot-coin.mp3';
        
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
            if (!response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            const ctx = this._getContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            this._audioBuffers[soundId] = audioBuffer;
            return audioBuffer;
        } catch (e) {
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
        this.play('notification', 0.3); // Quieter
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
        this.play('boss-damage', 0.4);
    }

    // Play sword slice sound (boss attacks)
    playSlash(isCrit = false) {
        this.play('sword-slice', isCrit ? this.volume : 0.5);
    }

    // Play boss defeated sound
    playBossDefeated() {
        this.play('boss-defeated');
    }

    // Play crystal earn sound
    playCrystalEarn() {
        this.play('crystal-earn', 0.6);
    }

    // Play loot coin sound (chest rewards, loot drops)
    playLootCoin() {
        this.play('loot-coin', 0.5);
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
    
    if (enabled) {
        toggleBtn.classList.remove('bg-gray-600');
        toggleBtn.classList.add('bg-green-600');
        toggleCircle.classList.add('translate-x-6');
        toggleCircle.classList.remove('translate-x-1');
    } else {
        toggleBtn.classList.remove('bg-green-600');
        toggleBtn.classList.add('bg-gray-600');
        toggleCircle.classList.remove('translate-x-6');
        toggleCircle.classList.add('translate-x-1');
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
    // Show version to confirm latest code is running
    const ver = window.audioManager ? window.audioManager.version : '?';
    if (window.goalManager) {
        window.goalManager.showToast(`Audio v${ver} — playing test sound…`, 'info', null);
    }
    // Play achievement sound via Web Audio API (fetched from SW cache)
    if (window.audioManager) {
        window.audioManager.playAchievement('weekly');
    }
}

function playTestBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const volume = window.audioManager.getVolume();
        
        // Create a pleasant two-tone chime
        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + startTime + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);
            
            oscillator.start(audioContext.currentTime + startTime);
            oscillator.stop(audioContext.currentTime + startTime + duration);
        };
        
        // Play a pleasant ascending chime (C5 -> E5 -> G5)
        playTone(523.25, 0, 0.15);      // C5
        playTone(659.25, 0.1, 0.15);    // E5
        playTone(783.99, 0.2, 0.25);    // G5
        
    } catch (e) {
        console.error('Could not play test sound:', e);
        // Show notification that sound couldn't play
        if (window.goalManager) {
            window.goalManager.showErrorNotification('Could not play test sound. Check browser audio permissions.');
        }
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
            toggleCircle.classList.add('translate-x-6');
            toggleCircle.classList.remove('translate-x-1');
        } else {
            toggleBtn.classList.add('bg-gray-600');
            toggleBtn.classList.remove('bg-green-600');
            toggleCircle.classList.remove('translate-x-6');
            toggleCircle.classList.add('translate-x-1');
        }
    }
    
    // Set initial volume
    if (volumeSlider && volumeDisplay) {
        const volume = Math.round(window.audioManager.getVolume() * 100);
        volumeSlider.value = volume;
        volumeDisplay.textContent = `${volume}%`;
    }
});

