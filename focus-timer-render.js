// @ts-check
'use strict';
/**
 * focus-timer-render.js — pure Focus-timer presentation builders (Engineering Roadmap #1).
 *
 * The TWENTIETH render module. Holds the two markup builders behind the Focus tab. (renderFocusTimer itself only
 * writes crystal/shard/total-time textContent + delegates, and renderChainSettingsSelects / updateFocusTimerDisplay
 * only push .value / progress-bar width+class — none build markup, so they stay on the class.)
 *   - renderFocusTimerControls({ focusTimerRunning, isBreak, hasPomodoroChain, focusTimeRemaining, sessionsPerChain })
 *       the #focus-timer-controls button set, in four mutually-exclusive states: running+break (a lone "Stop Chain"),
 *       running (Pause + Stop/"Stop Chain"), paused i.e. focusTimeRemaining > 0 (Resume + Stop/"Stop Chain"), and
 *       idle (Start Focus + "Start Pomodoro Chain (Nx)"). Because each state also picks the container's grid layout
 *       class (1- vs 2-column), this returns BOTH: { containerClass, buttonsHTML }. The wrapper just applies them.
 *   - renderChainProgressHTML(chain)
 *       the #pomodoro-chain-progress body for an ACTIVE chain: one dot per session (green ✓ for done, a pulsing
 *       blue ⚔️ for the current focus session, a pulsing ☕ for the current break, plain numbered for upcoming)
 *       plus a status line ("☕ Break — Next: Session N" during a break, else "⚔️ Session N of M").
 *
 * Both are PURE. The wrappers keep every DOM side-effect: the getElementById lookups + guards, and
 * _updateChainProgressIndicator's no-chain branch (container.innerHTML = '' + classList.add('hidden')) and its
 * classList.remove('hidden') before delegating.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.FOCUS_TIMER_RENDER.
 *   - Jest/Node: require('./focus-timer-render.js') returns the frozen builders via module.exports.
 */

/**
 * @param {{ focusTimerRunning: boolean, isBreak: boolean, hasPomodoroChain: boolean, focusTimeRemaining: number, sessionsPerChain: number }} state
 * @returns {{ containerClass: string, buttonsHTML: string }}
 */
function renderFocusTimerControls({ focusTimerRunning, isBreak, hasPomodoroChain, focusTimeRemaining, sessionsPerChain }) {
    const btnBase = 'py-4 rounded-lg font-bold fancy-font shadow-lg transition-all text-lg flex items-center justify-center gap-2';
    const chainBtnBase = 'py-3 rounded-lg font-bold fancy-font shadow-lg transition-all text-sm flex items-center justify-center gap-2 border border-amber-500/50';
    let containerClass, buttonsHTML;
    
    if (focusTimerRunning) {
        if (isBreak) {
            // Break running: only Stop (no pause during breaks)
            containerClass = 'grid grid-cols-1 gap-3 max-w-xs mx-auto';
            buttonsHTML = `
                    <button data-action="focus.stop" class="bg-red-600 hover:bg-red-500 text-white ${btnBase}">
                        <i class="ri-stop-fill text-xl" aria-hidden="true"></i> Stop Chain
                    </button>
                `;
        } else {
            // Running: Pause + Stop
            const stopLabel = hasPomodoroChain ? 'Stop Chain' : 'Stop';
            containerClass = 'grid grid-cols-2 gap-3 max-w-sm mx-auto';
            buttonsHTML = `
                    <button data-action="focus.pause" class="bg-yellow-600 hover:bg-yellow-500 text-white ${btnBase}">
                        <i class="ri-pause-fill text-xl" aria-hidden="true"></i> Pause
                    </button>
                    <button data-action="focus.stop" class="bg-red-600 hover:bg-red-500 text-white ${btnBase}">
                        <i class="ri-stop-fill text-xl" aria-hidden="true"></i> ${stopLabel}
                    </button>
                `;
        }
    } else if (focusTimeRemaining > 0) {
        // Paused: Resume + Stop
        const stopLabel = hasPomodoroChain ? 'Stop Chain' : 'Stop';
        containerClass = 'grid grid-cols-2 gap-3 max-w-sm mx-auto';
        buttonsHTML = `
                <button data-action="focus.resume" class="btn-themed-primary ${btnBase}">
                    <i class="ri-play-fill text-xl" aria-hidden="true"></i> Resume
                </button>
                <button data-action="focus.stop" class="bg-red-600 hover:bg-red-500 text-white ${btnBase}">
                    <i class="ri-stop-fill text-xl" aria-hidden="true"></i> ${stopLabel}
                </button>
            `;
    } else {
        // Idle: Start + Chain
        containerClass = 'grid grid-cols-1 gap-3 max-w-xs mx-auto';
        buttonsHTML = `
                <button data-action="focus.start" class="bg-green-600 hover:bg-green-500 text-white ${btnBase}">
                    <i class="ri-play-fill text-xl" aria-hidden="true"></i> Start Focus
                </button>
                <button data-action="focus.chain" class="bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white ${chainBtnBase}">
                    <i class="ri-links-fill text-lg" aria-hidden="true"></i> Start Pomodoro Chain (${sessionsPerChain}x)
                </button>
            `;
    }

    return { containerClass, buttonsHTML };
}

/**
 * @param {{ totalSessions: number, currentSession: number, isBreak: boolean }} chain
 * @returns {string}
 */
function renderChainProgressHTML(chain) {
    const dots = [];
    
    for (let i = 1; i <= chain.totalSessions; i++) {
        let dotClass = '';
        /** @type {string|number} */ let icon = ''; // upcoming-session dots use the numeric index; `${icon}` coerces either way
        if (i < chain.currentSession) {
            dotClass = 'bg-green-500 border-green-400';
            icon = '✓';
        } else if (i === chain.currentSession && !chain.isBreak) {
            dotClass = 'bg-blue-500 border-blue-400 animate-pulse';
            icon = '⚔️';
        } else if (i === chain.currentSession && chain.isBreak) {
            dotClass = 'bg-green-500/50 border-green-400 animate-pulse';
            icon = '☕';
        } else {
            dotClass = 'bg-stone-700 border-stone-500';
            icon = i;
        }
        dots.push(`<div class="w-10 h-10 rounded-full ${dotClass} border-2 flex items-center justify-center text-xs font-bold text-white fancy-font">${icon}</div>`);
    }
    
    const statusText = chain.isBreak 
        ? `☕ Break — Next: Session ${chain.currentSession}` 
        : `⚔️ Session ${chain.currentSession} of ${chain.totalSessions}`;
    
    return `
            <div class="flex items-center justify-center gap-2 mb-2">${dots.join('')}</div>
            <div class="text-center text-sm text-amber-200 fancy-font">${statusText}</div>
        `;
}

const FOCUS_TIMER_RENDER = Object.freeze({ renderFocusTimerControls, renderChainProgressHTML });


// Node / Jest

export default FOCUS_TIMER_RENDER;
