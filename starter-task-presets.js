// @ts-check
'use strict';
/**
 * starter-task-presets.js — the onboarding starter-task catalog (Roadmap #1).
 *
 * Ninth incremental slice of the goal-manager.js God class: a pure, read-only
 * data catalog. A keyed object of the seed tasks the "Starter Tasks" onboarding
 * modal offers, bucketed by goal tier — `daily`, `weekly`, `monthly`, `yearly`,
 * and `'life-goals'` — where each entry is a `{ name, icon, category }` template.
 *
 * The catalog holds NO runtime state: `addSelectedStarterTasks()` / the quick-start
 * packs read a preset by index and build a BRAND-NEW task object from it (mapping
 * `preset.name` -> the new task's `title`), and the modal renderer only `.map()`s
 * over each bucket. Nothing mutates the presets, so the shared frozen const is safe.
 *
 * Dual-environment, no bundler (mirrors balance.js and the other extracted
 * catalogs):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.STARTER_TASK_PRESETS. goal-manager.js captures it into a
 *     module-scoped const and assigns it to the `starterTaskPresets` class field,
 *     so every consumer is unchanged.
 *   - Jest/Node: `require('./starter-task-presets.js')` returns the object via
 *     module.exports (and also sets window.STARTER_TASK_PRESETS under jsdom).
 */
(function () {
    /**
     * Recursively freeze the catalog so it is a true constant — the presets are
     * only ever READ (consumers build fresh task objects from them), so a frozen
     * source can never be mutated by an onboarding or render path.
     * @param {any} obj
     * @returns {any}
     */
    function deepFreeze(obj) {
        Object.getOwnPropertyNames(obj).forEach((key) => {
            const value = obj[key];
            if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                deepFreeze(value);
            }
        });
        return Object.freeze(obj);
    }

    const STARTER_TASK_PRESETS = deepFreeze({
        daily: [
            { name: '💧 Drink 8 glasses of water', icon: '💧', category: 'Health' },
            { name: '🏃 Exercise for 30 minutes', icon: '🏃', category: 'Fitness' },
            { name: '📖 Read for 20 minutes', icon: '📖', category: 'Learning' },
            { name: '🧘 Meditate for 10 minutes', icon: '🧘', category: 'Wellness' },
            { name: '🛏️ Make your bed', icon: '🛏️', category: 'Home' },
            { name: '📝 Write a journal entry', icon: '📝', category: 'Reflection' },
            { name: '🥗 Eat a healthy meal', icon: '🥗', category: 'Health' },
            { name: '😴 Get 8 hours of sleep', icon: '😴', category: 'Health' },
            { name: '🚶 Take a 15 minute walk', icon: '🚶', category: 'Fitness' },
            { name: '📵 1 hour screen-free time', icon: '📵', category: 'Wellness' }
        ],
        weekly: [
            { name: '🧹 Clean room/house', icon: '🧹', category: 'Home' },
            { name: '📞 Call a friend or family', icon: '📞', category: 'Social' },
            { name: '🛒 Meal prep for the week', icon: '🛒', category: 'Health' },
            { name: '📊 Review weekly goals', icon: '📊', category: 'Planning' },
            { name: '🧺 Do laundry', icon: '🧺', category: 'Home' },
            { name: '💪 Complete 3 workouts', icon: '💪', category: 'Fitness' },
            { name: '📚 Finish a book chapter', icon: '📚', category: 'Learning' },
            { name: '🎨 Practice a hobby', icon: '🎨', category: 'Personal' }
        ],
        monthly: [
            { name: '💰 Review budget/finances', icon: '💰', category: 'Finance' },
            { name: '🎯 Set new monthly goals', icon: '🎯', category: 'Planning' },
            { name: '📸 Take progress photos', icon: '📸', category: 'Tracking' },
            { name: '🧹 Deep clean one area', icon: '🧹', category: 'Home' },
            { name: '👥 Meet up with friends', icon: '👥', category: 'Social' },
            { name: '📋 Review subscriptions', icon: '📋', category: 'Finance' },
            { name: '🏥 Schedule health checkup', icon: '🏥', category: 'Health' },
            { name: '🌱 Learn something new', icon: '🌱', category: 'Learning' }
        ],
        // v3.2 friction audit N1 — yearly + life-goal seed presets. The
        // onboarding "Grand Planner" path unlocks the yearly & life-goals tabs at
        // level 1, but the starter modal previously only offered
        // daily/weekly/monthly — so those tabs opened unlocked-but-empty with no
        // guidance. These give Grand Planners concrete big-goal starters; the
        // modal only surfaces a section when its tab is actually unlocked, so
        // habit-first players never see them until they level into the tier.
        yearly: [
            { name: '🎓 Earn a degree or certification', icon: '🎓', category: 'Learning' },
            { name: '💰 Save 3 months of expenses', icon: '💰', category: 'Finance' },
            { name: '✈️ Take a dream trip', icon: '✈️', category: 'Adventure' },
            { name: '🏃 Train for a race (5K, 10K, marathon)', icon: '🏃', category: 'Fitness' },
            { name: '📚 Read 24 books this year', icon: '📚', category: 'Learning' },
            { name: '🚀 Launch a side project', icon: '🚀', category: 'Career' }
        ],
        'life-goals': [
            { name: '🏡 Own a home', icon: '🏡', category: 'Milestone' },
            { name: '🌍 Travel the world', icon: '🌍', category: 'Adventure' },
            { name: '❤️ Build deep, lasting relationships', icon: '❤️', category: 'Relationships' },
            { name: '💪 Achieve lifelong health & fitness', icon: '💪', category: 'Health' },
            { name: '🎯 Master my craft or career', icon: '🎯', category: 'Career' },
            { name: '🧘 Find balance & inner peace', icon: '🧘', category: 'Wellness' }
        ]
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic STARTER_TASK_PRESETS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.STARTER_TASK_PRESETS = STARTER_TASK_PRESETS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = STARTER_TASK_PRESETS;
})();
