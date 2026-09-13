// @ts-check
/**
 * main.js — the ES-module entry point (Engineering Roadmap #3, criterion-(3) steps 2–5).
 *
 * Replaces the 74 hand-ordered `<script src>` tags that used to load every catalog / logic / render
 * module onto `window.X` ahead of goal-manager.js. goal-manager.js now `import`s each module directly,
 * so this file only has to (1) import the class, (2) instantiate it, and (3) attach the instance and the
 * five inline-handler wrappers to `window` — the ~90 `onclick="goalManager.…"` attributes in index.html,
 * the HTML that the render modules generate, and the standalone classic scripts (mobile-touch.js,
 * stat-tooltip.js, …) all still read the global.
 *
 * Load timing: a `<script type="module">` is deferred — it runs after the document is parsed and BEFORE
 * `DOMContentLoaded` fires. So the instance is created synchronously here (no listener needed), which
 * guarantees every `DOMContentLoaded` handler registered by the classic scripts and the FAB inline
 * block sees `window.goalManager` already set. The splash dismissal / error card are moved verbatim
 * from the old inline init block.
 *
 * The standalone browser scripts (analytics-methods, capacitor-bridge, pwa-handler, audio-manager,
 * effects-manager, mobile-touch, parallax-tilt, stat-tooltip) stay classic `<script>`s: they attach
 * their own runtime globals, read none of the module namespaces, and run before this entry.
 */
import GoalManager, { addLifeGoal, addYearlyGoal, addMonthlyGoal, addWeeklyGoal, addDailyTask } from './goal-manager.js';

const w = /** @type {any} */ (window);
w.GoalManager = GoalManager;
Object.assign(w, { addLifeGoal, addYearlyGoal, addMonthlyGoal, addWeeklyGoal, addDailyTask });

console.log('Starting GoalManager initialization...');
try {
    const goalManager = new GoalManager();
    w.goalManager = goalManager;
    console.log('✅ GoalManager created successfully!', goalManager);

    // Dismiss splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(() => splash.remove(), 500);
    }
} catch (err) {
    console.error('❌ Error creating GoalManager:', err);
    document.body.innerHTML = `
        <div class="min-h-screen bg-stone-900 flex items-center justify-center p-8">
            <div class="bg-red-900/50 border-2 border-red-500 rounded-xl p-8 max-w-md text-center">
                <div class="text-6xl mb-4">⚠️</div>
                <h2 class="text-2xl font-bold text-red-300 mb-4">Life Quest Journal Error</h2>
                <p class="text-red-200 mb-4">Sorry, the app couldn't load properly.</p>
                <p class="text-red-300/70 text-sm mb-6">${/** @type {Error} */ (err).message}</p>
                <button onclick="location.reload()" class="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold">
                    <i class="ri-refresh-line mr-1"></i>Reload App
                </button>
            </div>
        </div>
    `;
}
