// @ts-check
'use strict';
/**
 * quest-chain-templates.js — the multi-chapter quest-chain catalog (Roadmap #1).
 *
 * Tenth incremental slice of the goal-manager.js God class: a large, deeply-nested
 * but pure, read-only data catalog. A keyed object of the 5 long-form quest chains
 * (learn_web_dev / fitness_journey / business_builder / creative_writer /
 * language_master), each with { id, name, icon, description, difficulty,
 * estimatedWeeks, category, chapters:[ { id, title, description, tasks:[…],
 * reward:{ xp, gold, spell, charges } } ] }.
 *
 * MUTATION-SAFETY NOTE (why the freeze is safe): `startQuestChain()` stores a LIVE
 * reference to a template's `chapters` array on the active chain
 * (`chapters: template.chapters`). An exhaustive audit (Roadmap #1, 10th slice)
 * confirmed every consumer only READS that array — chain progression mutates only
 * chain-owned fields (`completedTasks`, `currentChapterIndex`, `completedAt`) and
 * the `activeQuestChains`/`completedQuestChains` arrays, never a chapter, its
 * `tasks`, or its `reward`. So deep-freezing the catalog is behaviour-preserving.
 * A chain-progression regression test guards this. If a future feature needs to
 * mutate per-chain chapter state, give the chain its OWN deep copy at creation
 * time rather than un-freezing this catalog.
 *
 * Dual-environment, no bundler (mirrors balance.js and the other extracted
 * catalogs):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.QUEST_CHAIN_TEMPLATES. goal-manager.js captures it into a
 *     module-scoped const and returns it from initializeQuestChainTemplates(), so
 *     `this.questChainTemplates` and every consumer are unchanged.
 *   - Jest/Node: `require('./quest-chain-templates.js')` returns the object via
 *     module.exports (and also sets window.QUEST_CHAIN_TEMPLATES under jsdom).
 */

/**
 * Recursively freeze the catalog so it is a true constant — the templates are
 * only ever READ (chains hold a reference but never mutate the chapters), so a
 * frozen source can never be corrupted by a progression or render path.
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

const QUEST_CHAIN_TEMPLATES = deepFreeze({
    learn_web_dev: {
        id: 'learn_web_dev',
        name: 'Master Web Development',
        icon: '💻',
        description: 'From beginner to full-stack developer',
        difficulty: 'medium',
        estimatedWeeks: 16,
        category: 'Programming',
        chapters: [
            {
                id: 1,
                title: 'HTML & CSS Foundations',
                description: 'Build beautiful web pages',
                tasks: [
                    'Complete HTML basics tutorial',
                    'Build 3 static web pages',
                    'Learn CSS styling and layouts',
                    'Create a personal landing page'
                ],
                reward: { xp: 500, gold: 300, spell: 'arcane_surge', charges: 1 }
            },
            {
                id: 2,
                title: 'JavaScript Essentials',
                description: 'Make your pages interactive',
                tasks: [
                    'Learn JavaScript basics',
                    'DOM manipulation exercises',
                    'Build a calculator app',
                    'Create an interactive game'
                ],
                reward: { xp: 800, gold: 500, spell: 'golden_touch', charges: 1 }
            },
            {
                id: 3,
                title: 'React Framework',
                description: 'Modern component-based UI',
                tasks: [
                    'Set up React development environment',
                    'Learn components and props',
                    'State management with hooks',
                    'Build a todo app in React'
                ],
                reward: { xp: 1200, gold: 800, spell: 'inferno_focus', charges: 2 }
            },
            {
                id: 4,
                title: 'Backend Development',
                description: 'Server-side programming',
                tasks: [
                    'Learn Node.js basics',
                    'Build REST API with Express',
                    'Database integration (MongoDB/SQL)',
                    'Authentication and security'
                ],
                reward: { xp: 1500, gold: 1000, spell: 'moonlight_blessing', charges: 1 }
            },
            {
                id: 5,
                title: 'Full-Stack Project',
                description: 'Deploy a complete application',
                tasks: [
                    'Design full-stack architecture',
                    'Build complete CRUD application',
                    'Deploy to production',
                    'Portfolio and resume update'
                ],
                reward: { xp: 2500, gold: 2000, spell: 'boss_slayer', charges: 1 }
            }
        ]
    },
    fitness_journey: {
        id: 'fitness_journey',
        name: 'Ultimate Fitness Journey',
        icon: '💪',
        description: 'Transform your body and mind',
        difficulty: 'hard',
        estimatedWeeks: 12,
        category: 'Health',
        chapters: [
            {
                id: 1,
                title: 'Foundation Phase',
                description: 'Build healthy habits',
                tasks: [
                    'Set fitness goals and baseline measurements',
                    'Exercise 3x per week for 2 weeks',
                    'Track meals for 14 days',
                    'Establish sleep routine'
                ],
                reward: { xp: 400, gold: 200, spell: 'streak_shield', charges: 1 }
            },
            {
                id: 2,
                title: 'Strength Building',
                description: 'Develop core strength',
                tasks: [
                    'Learn proper form for major lifts',
                    'Complete 4 weeks of strength training',
                    'Increase protein intake',
                    'Track progress photos'
                ],
                reward: { xp: 700, gold: 400, spell: 'berserker_rage', charges: 1 }
            },
            {
                id: 3,
                title: 'Cardio Mastery',
                description: 'Build endurance',
                tasks: [
                    'Run/walk 5K without stopping',
                    'Do 30 min cardio 4x/week',
                    'Hit target heart rate zones',
                    'Complete a fitness challenge'
                ],
                reward: { xp: 900, gold: 600, spell: 'inferno_focus', charges: 2 }
            },
            {
                id: 4,
                title: 'Transformation',
                description: 'Achieve your goals',
                tasks: [
                    'Reach target weight/measurements',
                    'Take final progress photos',
                    'Maintain routine for 4 weeks',
                    'Share your journey'
                ],
                reward: { xp: 2000, gold: 1500, spell: 'double_xp_weekend', charges: 1 }
            }
        ]
    },
    business_builder: {
        id: 'business_builder',
        name: 'Launch Your Business',
        icon: '🚀',
        description: 'From idea to profitable venture',
        difficulty: 'hard',
        estimatedWeeks: 20,
        category: 'Business',
        chapters: [
            {
                id: 1,
                title: 'Ideation & Validation',
                description: 'Find your business idea',
                tasks: [
                    'Brainstorm 10 business ideas',
                    'Research market and competitors',
                    'Validate idea with 20 potential customers',
                    'Create value proposition'
                ],
                reward: { xp: 600, gold: 400, spell: 'lucky_draw', charges: 2 }
            },
            {
                id: 2,
                title: 'Business Planning',
                description: 'Create your roadmap',
                tasks: [
                    'Write business plan',
                    'Define target audience',
                    'Create financial projections',
                    'Legal setup (LLC, etc.)'
                ],
                reward: { xp: 1000, gold: 700, spell: 'golden_touch', charges: 2 }
            },
            {
                id: 3,
                title: 'Product Development',
                description: 'Build your MVP',
                tasks: [
                    'Design MVP features',
                    'Build/create first version',
                    'Test with beta users',
                    'Iterate based on feedback'
                ],
                reward: { xp: 1500, gold: 1000, spell: 'critical_strike', charges: 2 }
            },
            {
                id: 4,
                title: 'Launch & Marketing',
                description: 'Go to market',
                tasks: [
                    'Create marketing materials',
                    'Build online presence',
                    'Launch to first customers',
                    'Get first 10 paying customers'
                ],
                reward: { xp: 2000, gold: 1500, spell: 'boss_slayer', charges: 1 }
            },
            {
                id: 5,
                title: 'Growth & Scale',
                description: 'Build sustainable business',
                tasks: [
                    'Reach $1000 monthly revenue',
                    'Establish systems and processes',
                    'Hire first team member/contractor',
                    'Plan for next phase'
                ],
                reward: { xp: 3000, gold: 3000, spell: 'execute', charges: 1 }
            }
        ]
    },
    creative_writer: {
        id: 'creative_writer',
        name: 'Become a Published Writer',
        icon: '✍️',
        description: 'Craft and publish your first book',
        difficulty: 'medium',
        estimatedWeeks: 24,
        category: 'Creative',
        chapters: [
            {
                id: 1,
                title: 'Writing Foundation',
                description: 'Develop your craft',
                tasks: [
                    'Write daily for 30 days',
                    'Complete writing course',
                    'Read 5 books in your genre',
                    'Join writing community'
                ],
                reward: { xp: 500, gold: 300, spell: 'streak_shield', charges: 1 }
            },
            {
                id: 2,
                title: 'Story Development',
                description: 'Plan your masterpiece',
                tasks: [
                    'Develop plot outline',
                    'Create character profiles',
                    'Build story world',
                    'Write first 3 chapters'
                ],
                reward: { xp: 800, gold: 500, spell: 'inferno_focus', charges: 1 }
            },
            {
                id: 3,
                title: 'First Draft',
                description: 'Write your book',
                tasks: [
                    'Write 50,000 words',
                    'Complete full first draft',
                    'Let manuscript rest 2 weeks',
                    'Celebrate completion'
                ],
                reward: { xp: 1500, gold: 1000, spell: 'moonlight_blessing', charges: 1 }
            },
            {
                id: 4,
                title: 'Editing & Revision',
                description: 'Polish your work',
                tasks: [
                    'Complete self-edit',
                    'Get beta reader feedback',
                    'Hire professional editor',
                    'Final revisions'
                ],
                reward: { xp: 1200, gold: 800, spell: 'critical_strike', charges: 1 }
            },
            {
                id: 5,
                title: 'Publishing',
                description: 'Share with the world',
                tasks: [
                    'Design book cover',
                    'Format for publication',
                    'Publish to Amazon/platform',
                    'Launch marketing campaign'
                ],
                reward: { xp: 2000, gold: 2000, spell: 'double_xp_weekend', charges: 1 }
            }
        ]
    },
    language_master: {
        id: 'language_master',
        name: 'Master a New Language',
        icon: '🗣️',
        description: 'Become fluent in your target language',
        difficulty: 'medium',
        estimatedWeeks: 52,
        category: 'Education',
        chapters: [
            {
                id: 1,
                title: 'Beginner Basics',
                description: 'Start your journey',
                tasks: [
                    'Learn 500 common words',
                    'Master basic grammar',
                    'Complete beginner course',
                    'Have first conversation'
                ],
                reward: { xp: 400, gold: 300, spell: 'arcane_surge', charges: 1 }
            },
            {
                id: 2,
                title: 'Intermediate Progress',
                description: 'Build fluency',
                tasks: [
                    'Expand vocabulary to 2000 words',
                    'Watch movies with subtitles',
                    'Read first book in target language',
                    'Practice speaking 3x/week'
                ],
                reward: { xp: 800, gold: 600, spell: 'golden_touch', charges: 1 }
            },
            {
                id: 3,
                title: 'Advanced Fluency',
                description: 'Think in the language',
                tasks: [
                    'Have 30-min conversation',
                    'Write essay in target language',
                    'Pass proficiency exam',
                    'Make friends who speak language'
                ],
                reward: { xp: 1500, gold: 1000, spell: 'boss_slayer', charges: 1 }
            }
        ]
    }
});


// Node / Jest

export default QUEST_CHAIN_TEMPLATES;
