/**
 * Unit Tests for Life Quest Journal - AudioManager
 *
 * Covers the §2.6 sound-design code-first work (v2.10 scope, landed
 * ahead of the audio assets):
 *   Pass 2 — coverage-gap event ids (optional sounds: silent skip /
 *            fallback mapping)
 *   Pass 3 — anti-habituation variant picker (<id>-1/2/3.mp3)
 *   Pass 4 — central _eventVolumes table replacing per-call-site
 *            volume magic numbers
 */

const fs = require('fs');
const path = require('path');

// ── Test setup ────────────────────────────────────────────────────────────

// Mock localStorage (constructor reads audioVolume/audioEnabled)
let localStore = {};
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(key => localStore[key] || null),
        setItem: jest.fn((key, value) => { localStore[key] = String(value); }),
        removeItem: jest.fn(key => { delete localStore[key]; }),
        clear: jest.fn(() => { localStore = {}; }),
    },
    writable: true,
    configurable: true,
});

// fetch mock — per-test control over which sound files "exist".
// Default: every request 404s.
let existingPaths = new Set();
global.fetch = jest.fn((url, opts = {}) => {
    const exists = [...existingPaths].some(p => String(url).includes(p));
    return Promise.resolve({
        ok: exists,
        status: exists ? 200 : 404,
        statusText: exists ? 'OK' : 'Not Found',
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
});

// Web Audio API mock — records created gain nodes so tests can assert
// the volume that reached the hardware.
let createdGainNodes = [];
let createdSources = [];
function makeMockContext() {
    return {
        state: 'running',
        resume: jest.fn(() => Promise.resolve()),
        decodeAudioData: jest.fn(() => Promise.resolve({ duration: 0.1, __mockBuffer: true })),
        createBufferSource: jest.fn(() => {
            const src = { buffer: null, connect: jest.fn(), start: jest.fn(), onended: null };
            createdSources.push(src);
            return src;
        }),
        createGain: jest.fn(() => {
            const node = { gain: { value: 1 }, connect: jest.fn() };
            createdGainNodes.push(node);
            return node;
        }),
        destination: {},
    };
}
window.AudioContext = jest.fn(() => makeMockContext());

// HTML Audio element mock (Strategy 2 fallback) — track constructions so
// tests can assert optional sounds never hit this path.
let audioElementConstructions = [];
global.Audio = jest.fn(function (src) {
    audioElementConstructions.push(src);
    this.volume = 1;
    this.onended = null;
    this.onerror = null;
    this.play = jest.fn(() => Promise.resolve());
});

// Load and execute audio-manager.js (assigns window.audioManager)
const audioSource = fs.readFileSync(
    path.join(__dirname, '..', 'audio-manager.js'), 'utf-8'
);
// eslint-disable-next-line no-eval
eval(audioSource);
const AudioManagerClass = window.audioManager.constructor;

// Helper: fresh manager with clean throttle/queue state
function makeManager() {
    const am = new AudioManagerClass();
    am.enabled = true;
    am.volume = 0.5;
    return am;
}

// Helper: let the async play pipeline settle. The fallback path chains
// two full _loadBuffer calls (fetch → arrayBuffer → decodeAudioData
// each), so drain a generous number of microtask layers.
async function flush() {
    for (let i = 0; i < 12; i++) {
        await Promise.resolve();
    }
}

beforeEach(() => {
    localStore = {};
    existingPaths = new Set();
    createdGainNodes = [];
    createdSources = [];
    audioElementConstructions = [];
    jest.clearAllMocks();
});

// ── Pass 4: central event volume table ────────────────────────────────────

describe('AudioManager — _eventVolumes table (§2.6 Pass 4)', () => {
    test('listed event plays at its table multiplier × master volume', async () => {
        const am = makeManager();
        existingPaths.add('notification.wav');
        am.playNotification();
        await flush();
        expect(createdGainNodes).toHaveLength(1);
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.5 * 0.6);
    });

    test('unlisted event plays at full master volume', async () => {
        const am = makeManager();
        existingPaths.add('chest-open.mp3');
        am.playChestOpen();
        await flush();
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.5);
    });

    test('explicit volume override beats the table (crit slash)', async () => {
        const am = makeManager();
        existingPaths.add('sword-slice.mp3');
        am.playSlash(true);
        await flush();
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.5);
    });

    test('non-crit slash uses the table multiplier', async () => {
        const am = makeManager();
        existingPaths.add('sword-slice.mp3');
        // playSlash now random-picks the boss-attack pool; pin to index 0
        // (sword-slice) so this volume assertion stays deterministic.
        const realRandom = Math.random;
        Math.random = () => 0;
        try { am.playSlash(false); } finally { Math.random = realRandom; }
        await flush();
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.5 * 0.6);
    });

    test('table scales with master volume changes', async () => {
        const am = makeManager();
        am.volume = 1.0;
        existingPaths.add('crystal-earn.wav');
        am.playCrystalEarn();
        await flush();
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.8);
    });
});

// ── Pass 3: variant picker ────────────────────────────────────────────────

describe('AudioManager — variant picker (§2.6 Pass 3)', () => {
    test('_probeVariants registers only variants whose files exist', async () => {
        const am = makeManager();
        existingPaths.add('sword-slice-1.mp3');
        existingPaths.add('sword-slice-2.mp3');
        await am._probeVariants();
        expect(am._variants['sword-slice']).toEqual(['sword-slice-1', 'sword-slice-2']);
        expect(am._variants['gold-earned']).toBeUndefined();
        expect(am._soundPaths['sword-slice-1']).toBe('./sounds/sword-slice-1.mp3');
    });

    test('_resolveVariant returns base id when no variants registered', () => {
        const am = makeManager();
        expect(am._resolveVariant('sword-slice')).toBe('sword-slice');
    });

    test('_resolveVariant picks from base + variants pool', () => {
        const am = makeManager();
        am._variants['sword-slice'] = ['sword-slice-1', 'sword-slice-2'];
        const seen = new Set();
        const realRandom = Math.random;
        try {
            [0, 0.4, 0.9].forEach(v => {
                Math.random = () => v;
                seen.add(am._resolveVariant('sword-slice'));
            });
        } finally {
            Math.random = realRandom;
        }
        expect(seen).toEqual(new Set(['sword-slice', 'sword-slice-1', 'sword-slice-2']));
    });

    test('variants cannot bypass per-sound throttling (keyed on base id)', async () => {
        // Deterministic: drive _processSoundQueue directly (awaitable,
        // unlike play()'s fire-and-forget pipeline) and assert the two
        // halves of the property separately.
        const am = makeManager();
        existingPaths.add('sword-slice-1.mp3');

        // 1) When a variant plays, the throttle stamp lands on the BASE
        //    id, not the variant id.
        am._soundQueue.push({
            soundId: 'sword-slice-1', baseId: 'sword-slice',
            volumeOverride: null, enqueuedAt: Date.now()
        });
        am._soundPaths['sword-slice-1'] = './sounds/sword-slice-1.mp3';
        await am._processSoundQueue();
        expect(createdSources).toHaveLength(1);
        expect(am._lastPlayedById['sword-slice']).toBeDefined();
        expect(am._lastPlayedById['sword-slice-1']).toBeUndefined();

        // 2) A follow-up play() inside the 200ms window is dropped
        //    before variant resolution / enqueue even happens.
        const resolveSpy = jest.spyOn(am, '_resolveVariant');
        am._lastPlayedById['sword-slice'] = Date.now();
        am.play('sword-slice');
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(am._soundQueue).toHaveLength(0);
    });

    test('variant playback uses the base id volume from the table', async () => {
        const am = makeManager();
        am._variants['notification'] = ['notification-1'];
        am._soundPaths['notification-1'] = './sounds/notification-1.mp3';
        existingPaths.add('notification-1.mp3');
        const realRandom = Math.random;
        Math.random = () => 0.9; // force the variant
        try {
            am.playNotification();
            await flush();
        } finally {
            Math.random = realRandom;
        }
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.5 * 0.6);
    });
});

// ── Boss-attack variety pool ──────────────────────────────────────────────

describe('AudioManager — boss-attack pool', () => {
    test('non-crit playSlash rotates through the weapon pool', () => {
        const am = makeManager();
        const playSpy = jest.spyOn(am, 'play').mockImplementation(() => {});
        const seen = new Set();
        const realRandom = Math.random;
        try {
            [0, 0.5, 0.99].forEach(v => {
                Math.random = () => v;
                am.playSlash(false);
            });
        } finally {
            Math.random = realRandom;
        }
        playSpy.mock.calls.forEach(c => seen.add(c[0]));
        expect(seen).toEqual(new Set(['sword-slice', 'arrow-attack-boss', 'spell-attack-boss']));
    });

    test('crit playSlash always plays boss-crit at full master volume', () => {
        const am = makeManager();
        const playSpy = jest.spyOn(am, 'play').mockImplementation(() => {});
        am.playSlash(true);
        expect(playSpy).toHaveBeenCalledWith('boss-crit', am.volume);
    });

    test('arrow/spell attack ids are registered, optional, and fall back to sword-slice', () => {
        const am = makeManager();
        ['arrow-attack-boss', 'spell-attack-boss'].forEach(id => {
            expect(am._soundPaths[id]).toBe(`./sounds/${id}.mp3`);
            expect(am._optionalSounds.has(id)).toBe(true);
            expect(am._fallbacks[id]).toBe('sword-slice');
            expect(am._eventVolumes[id]).toBeCloseTo(0.6);
        });
    });
});

// ── Pass 2: optional event ids ────────────────────────────────────────────

describe('AudioManager — optional event ids (§2.6 Pass 2)', () => {
    test('all coverage-gap event ids are registered with sound paths', () => {
        const am = makeManager();
        ['prestige-ascension', 'streak-freeze-used', 'boss-enrage',
         'badge-unlock', 'focus-start', 'focus-break-start',
         'focus-break-end', 'companion-evolve', 'error-blocked',
         'task-complete'].forEach(id => {
            expect(am._soundPaths[id]).toBe(`./sounds/${id}.mp3`);
            expect(am._optionalSounds.has(id)).toBe(true);
        });
    });

    test('missing optional sound is silently skipped — no console.error, no HTML Audio retry', async () => {
        const am = makeManager();
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            am.play('boss-enrage'); // file does not exist
            await flush();
            expect(errSpy).not.toHaveBeenCalled();
            expect(audioElementConstructions).toHaveLength(0);
            expect(createdSources).toHaveLength(0);
        } finally {
            errSpy.mockRestore();
        }
    });

    test('missing optional sound does not wedge the queue', async () => {
        jest.useFakeTimers();
        try {
            const am = makeManager();
            existingPaths.add('chest-open.mp3');
            am.play('boss-enrage');
            am.play('chest-open');
            await flush();
            jest.advanceTimersByTime(150); // advance() timer after silent skip
            await flush();
            expect(createdSources).toHaveLength(1); // chest-open played
        } finally {
            jest.useRealTimers();
        }
    });

    test('task-complete falls back to daily-achievement until its asset ships', async () => {
        const am = makeManager();
        existingPaths.add('daily-achievement.mp3'); // fallback exists, task-complete.mp3 does not
        am.playTaskComplete();
        await flush();
        expect(createdSources).toHaveLength(1);
        expect(global.fetch).toHaveBeenCalledWith('./sounds/task-complete.mp3');
        expect(global.fetch).toHaveBeenCalledWith('./sounds/daily-achievement.mp3');
        // task-complete's own table entry (0.8) governs the fallback playback
        expect(createdGainNodes[0].gain.value).toBeCloseTo(0.5 * 0.8);
    });

    test('task-complete plays its own file once the asset exists', async () => {
        const am = makeManager();
        existingPaths.add('task-complete.mp3');
        am.playTaskComplete();
        await flush();
        expect(createdSources).toHaveLength(1);
        expect(global.fetch).toHaveBeenCalledWith('./sounds/task-complete.mp3');
        expect(global.fetch).not.toHaveBeenCalledWith('./sounds/daily-achievement.mp3');
    });

    test('optional sounds are excluded from warm-up prefetch', () => {
        const am = makeManager();
        // simulate the warm-up listener body
        global.fetch.mockClear();
        Object.keys(am._soundPaths).forEach(id => {
            if (am._optionalSounds.has(id)) return;
            am._loadBuffer(id).catch(() => {});
        });
        const fetched = global.fetch.mock.calls.map(c => String(c[0]));
        expect(fetched.some(u => u.includes('boss-enrage'))).toBe(false);
        expect(fetched.some(u => u.includes('notification'))).toBe(true);
    });
});
