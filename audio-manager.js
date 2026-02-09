// Audio Manager for Life Quest Journal
// Handles loading and playing custom sound files

class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5; // Master volume (0.0 to 1.0)
        
        // Load saved settings
        const savedVolume = localStorage.getItem('audioVolume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }
        
        const savedEnabled = localStorage.getItem('audioEnabled');
        if (savedEnabled !== null) {
            this.enabled = savedEnabled === 'true';
        }
        
        this.init();
    }

    init() {
        // Preload all sound files
        // You can add your sound files to the /sounds/ folder
        this.loadSound('achievement-daily', './sounds/achievement-daily.wav');
        this.loadSound('achievement-weekly', './sounds/achievement-weekly.wav');
        this.loadSound('achievement-monthly', './sounds/achievement-monthly.wav');
        this.loadSound('achievement-yearly', './sounds/achievement-yearly.wav');
        this.loadSound('achievement-life', './sounds/achievement-life.wav');
        this.loadSound('notification', './sounds/achievement-daily.wav');
        this.loadSound('spell', './sounds/spells.mp3');
        this.loadSound('level-up', './sounds/achievement-yearly.wav');
        this.loadSound('quest-complete', './sounds/achievement-weekly.wav');
        this.loadSound('boss-damage', './sounds/achievement-daily.wav');
        this.loadSound('boss-defeated', './sounds/achievement-life.wav');
        this.loadSound('crystal-earn', './sounds/achievement-daily.wav');
        
        console.log('🔊 Audio Manager initialized');
    }

    loadSound(id, path) {
        const audio = new Audio();
        audio.src = path;
        audio.preload = 'auto';
        audio.volume = this.volume;
        
        // Handle load errors gracefully (file might not exist yet)
        audio.addEventListener('error', () => {
            console.log(`⚠️ Sound file not found: ${path} (using fallback)`);
        });
        
        this.sounds[id] = audio;
    }

    play(soundId, volumeOverride = null) {
        if (!this.enabled) return;
        
        const sound = this.sounds[soundId];
        if (!sound) {
            console.log(`Sound not found: ${soundId}`);
            return;
        }

        // Clone the audio to allow overlapping sounds
        const clone = sound.cloneNode();
        clone.volume = volumeOverride !== null ? volumeOverride : this.volume;
        
        // Play the sound
        clone.play().catch(e => {
            console.log(`Could not play sound: ${soundId}`, e.message);
        });
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

    // Play quest complete sound
    playQuestComplete() {
        this.play('quest-complete');
    }

    // Play boss damage sound
    playBossDamage() {
        this.play('boss-damage', 0.4);
    }

    // Play boss defeated sound
    playBossDefeated() {
        this.play('boss-defeated');
    }

    // Play crystal earn sound
    playCrystalEarn() {
        this.play('crystal-earn', 0.6);
    }

    // Set master volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        
        // Update all loaded sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
        
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
    // Try to play the achievement sound first
    const sound = window.audioManager.sounds['achievement-weekly'];
    
    // Check if the sound file loaded successfully
    if (sound && sound.readyState >= 2) {
        window.audioManager.playAchievement('weekly');
    } else {
        // Fallback: Generate a pleasant test beep using Web Audio API
        playTestBeep();
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
        
        console.log('🔊 Test beep played (no custom sounds loaded)');
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

// Integrate with goal manager if it exists
if (typeof goalManager !== 'undefined') {
    console.log('🎵 Integrating Audio Manager with Goal Manager');
    
    // Replace the old playAchievementSound method
    goalManager.playAchievementSound = function(level) {
        window.audioManager.playAchievement(level);
    };
    
    // Replace the old playNotificationSound method
    goalManager.playNotificationSound = function() {
        window.audioManager.playNotification();
    };
    
    // Replace the old playSpellSound method
    goalManager.playSpellSound = function() {
        window.audioManager.playSpell();
    };
    
    // Add level up sound
    const originalCheckLevelUp = goalManager.checkLevelUp;
    goalManager.checkLevelUp = function() {
        const oldLevel = this.level;
        originalCheckLevelUp.call(this);
        if (this.level > oldLevel) {
            window.audioManager.playLevelUp();
        }
    };
}
