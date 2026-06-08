/**
 * Unit Tests for Life Quest Journal - EffectsManager
 *
 * Focused on the v2.9 Track 4 crit visuals (weakpoint reticle + shockwave +
 * freeze-frame). EffectsManager is otherwise a thin DOM-effects wrapper —
 * we don't try to test every animation here, just the new structured
 * surfaces where logic + intensity gating live.
 */

const fs = require('fs');
const path = require('path');

// ── Test setup ────────────────────────────────────────────────────────────

// Mock localStorage (effects-manager reads STORAGE_KEY on init)
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

// Load and execute effects-manager.js (IIFE; assigns to window.effectsManager)
const effectsSource = fs.readFileSync(
    path.join(__dirname, '..', 'effects-manager.js'), 'utf-8'
);
// eslint-disable-next-line no-eval
eval(effectsSource);
const effectsManager = window.effectsManager;

// Helper: build a minimal boss-card DOM matching what renderBossCard emits
// for the parts bossCrit reads/touches.
function mountBossCard({ withPortrait = true } = {}) {
    document.body.innerHTML = '';
    const card = document.createElement('div');
    card.id = 'boss-card-daily';
    card.className = 'boss-card';
    card.style.position = 'relative';
    if (withPortrait) {
        const portrait = document.createElement('div');
        portrait.className = 'boss-portrait text-5xl animate-bounce';
        portrait.textContent = '🐉';
        card.appendChild(portrait);
    }
    document.body.appendChild(card);
    return card;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('EffectsManager — v2.9 Track 4 (bossCrit visuals)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        document.body.className = '';
        // Default to 'full' intensity for each test unless overridden
        effectsManager.setIntensity('full', false);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        document.body.innerHTML = '';
        document.body.className = '';
    });

    test('bossCrit on full intensity creates reticle + shockwave on the portrait and applies freeze class to the card', () => {
        const card = mountBossCard();
        effectsManager.bossCrit(card);

        const portrait = card.querySelector('.boss-portrait');
        expect(portrait.querySelector('.crit-reticle')).not.toBeNull();
        expect(portrait.querySelector('.crit-shockwave')).not.toBeNull();
        expect(card.classList.contains('crit-freeze')).toBe(true);
    });

    test('bossCrit cleans up the freeze class after the 80ms hitch', () => {
        const card = mountBossCard();
        effectsManager.bossCrit(card);
        expect(card.classList.contains('crit-freeze')).toBe(true);

        jest.advanceTimersByTime(85);
        expect(card.classList.contains('crit-freeze')).toBe(false);
    });

    test('bossCrit removes reticle + shockwave from the DOM after their animations finish', () => {
        const card = mountBossCard();
        effectsManager.bossCrit(card);
        const portrait = card.querySelector('.boss-portrait');

        // Both elements should be present right after the call
        expect(portrait.querySelector('.crit-reticle')).not.toBeNull();
        expect(portrait.querySelector('.crit-shockwave')).not.toBeNull();

        // Shockwave clears at +420ms, reticle at +650ms
        jest.advanceTimersByTime(430);
        expect(portrait.querySelector('.crit-shockwave')).toBeNull();
        expect(portrait.querySelector('.crit-reticle')).not.toBeNull();

        jest.advanceTimersByTime(230);
        expect(portrait.querySelector('.crit-reticle')).toBeNull();
    });

    test('bossCrit on reduced intensity creates the reticle but NOT the shockwave or freeze', () => {
        effectsManager.setIntensity('reduced', false);
        const card = mountBossCard();

        effectsManager.bossCrit(card);

        const portrait = card.querySelector('.boss-portrait');
        expect(portrait.querySelector('.crit-reticle')).not.toBeNull();
        expect(portrait.querySelector('.crit-shockwave')).toBeNull();
        expect(card.classList.contains('crit-freeze')).toBe(false);
    });

    test('bossCrit on minimal intensity creates none of the Track 4 visuals', () => {
        effectsManager.setIntensity('minimal', false);
        const card = mountBossCard();

        effectsManager.bossCrit(card);

        const portrait = card.querySelector('.boss-portrait');
        expect(portrait.querySelector('.crit-reticle')).toBeNull();
        expect(portrait.querySelector('.crit-shockwave')).toBeNull();
        expect(card.classList.contains('crit-freeze')).toBe(false);
    });

    test('bossCrit falls back to the boss card when no .boss-portrait child exists', () => {
        // Defensive path: legacy markup or arena variants may not have the
        // portrait class; we should still render the visuals on the card itself.
        const card = mountBossCard({ withPortrait: false });

        effectsManager.bossCrit(card);

        expect(card.querySelector('.crit-reticle')).not.toBeNull();
        expect(card.querySelector('.crit-shockwave')).not.toBeNull();
        expect(card.classList.contains('crit-freeze')).toBe(true);
    });

    test('bossCrit is a no-op when called with a null element', () => {
        // Should not throw and should not leave any stray DOM.
        expect(() => effectsManager.bossCrit(null)).not.toThrow();
        expect(document.querySelectorAll('.crit-reticle').length).toBe(0);
        expect(document.querySelectorAll('.crit-shockwave').length).toBe(0);
    });

    test('reticle SVG markup includes the lock-on crosshair shapes', () => {
        const card = mountBossCard();
        effectsManager.bossCrit(card);

        const reticle = card.querySelector('.crit-reticle');
        expect(reticle).not.toBeNull();
        const svg = reticle.querySelector('svg');
        expect(svg).not.toBeNull();
        // Outer + inner ring + 4 tick lines + center dot = 7 shapes total
        expect(svg.querySelectorAll('circle').length).toBe(3); // 2 rings + center dot
        expect(svg.querySelectorAll('line').length).toBe(4);   // 4 ticks
    });

    test('reticle has aria-hidden so it is invisible to screen readers', () => {
        const card = mountBossCard();
        effectsManager.bossCrit(card);

        const reticle = card.querySelector('.crit-reticle');
        const shockwave = card.querySelector('.crit-shockwave');
        expect(reticle.getAttribute('aria-hidden')).toBe('true');
        expect(shockwave.getAttribute('aria-hidden')).toBe('true');
    });
});
