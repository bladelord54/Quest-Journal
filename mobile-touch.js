// @ts-check
// Mobile Touch Enhancements for Life Quest Journal
// Handles swipe gestures, haptic feedback, and mobile-specific interactions

class MobileTouchHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 50; // Minimum distance for swipe
        /** @type {HTMLElement | null} — element currently being swiped (set on touchstart) */
        this.swipeTarget = null;
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            this.init();
        }
    }

    init() {
        this.setupSwipeGestures();
        this.setupLongPress();
        this.preventDoubleTapZoom();
        this.setupTouchRipple();
    }
    
    // Touch ripple effect for quest cards
    setupTouchRipple() {
        document.addEventListener('touchstart', (e) => {
            const card = /** @type {HTMLElement | null} */ (
                /** @type {Element | null} */ (e.target)?.closest('.quest-card') ?? null
            );
            if (!card) return;
            
            // Get touch position relative to card
            const rect = card.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Create ripple element
            const ripple = document.createElement('div');
            ripple.className = 'touch-ripple';
            ripple.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                width: 50px;
                height: 50px;
                margin-left: -25px;
                margin-top: -25px;
            `;
            
            card.appendChild(ripple);
            card.classList.add('touch-active');
            
            // Light haptic feedback
            this.vibrate(5);
            
            // Remove ripple after animation
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Remove touch-active class after glow animation
            setTimeout(() => {
                card.classList.remove('touch-active');
            }, 400);
        }, { passive: true });
    }

    // Haptic Feedback
    vibrate(duration = 10) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    // Success vibration pattern
    vibrateSuccess() {
        if (navigator.vibrate) {
            navigator.vibrate([30, 50, 30]); // Short-pause-short
        }
    }

    // Error vibration pattern
    vibrateError() {
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50, 30, 50]); // Multiple short bursts
        }
    }

    // Setup swipe gestures for task completion
    setupSwipeGestures() {
        document.addEventListener('touchstart', (e) => {
            const target = /** @type {HTMLElement | null} */ (
                /** @type {Element | null} */ (e.target)?.closest('[data-task-id], [data-goal-id]') ?? null
            );
            if (!target) return;

            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.swipeTarget = target;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const el = this.swipeTarget;
            if (!el) return;

            const currentX = e.touches[0].clientX;
            const diffX = this.touchStartX - currentX;

            // Visual feedback during swipe
            if (Math.abs(diffX) > 10) {
                el.style.transform = `translateX(${-diffX}px)`;
                el.style.opacity = String(1 - (Math.abs(diffX) / 200));
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const el = this.swipeTarget;
            if (!el) return;

            this.touchEndX = e.changedTouches[0].clientX;
            this.touchEndY = e.changedTouches[0].clientY;

            const swipeDistance = this.touchStartX - this.touchEndX;
            const verticalDistance = Math.abs(this.touchStartY - this.touchEndY);

            // Reset visual state
            el.style.transform = '';
            el.style.opacity = '';

            // Only trigger if swipe is mostly horizontal
            if (verticalDistance < 50 && Math.abs(swipeDistance) > this.swipeThreshold) {
                if (swipeDistance > 0) {
                    // Swipe left to complete
                    this.handleSwipeLeft(el);
                } else {
                    // Swipe right to undo/archive
                    this.handleSwipeRight(el);
                }
            }

            this.swipeTarget = null;
        });
    }

    /** @param {HTMLElement} element */
    handleSwipeLeft(element) {
        const taskId = element.dataset.taskId;
        const goalId = element.dataset.goalId;

        if (taskId && typeof goalManager !== 'undefined') {
            // Complete task
            const task = goalManager.dailyTasks.find((/** @type {any} */ t) => t.id === Number(taskId));
            if (task && !task.completed) {
                this.vibrateSuccess();
                goalManager.toggleTask(Number(taskId));
            }
        } else if (goalId && typeof goalManager !== 'undefined') {
            // Complete goal
            this.vibrateSuccess();
            // Implementation depends on goal type
        }
    }

    /** @param {HTMLElement} element */
    handleSwipeRight(element) {
        const taskId = element.dataset.taskId;
        
        if (taskId && typeof goalManager !== 'undefined') {
            // Archive or delete task
            this.vibrate(20);
            // Show quick action menu or archive
            goalManager.showConfirm('Archive this task?', () => {
                goalManager.deleteGoal(taskId, 'daily');
                this.vibrateSuccess();
            });
        }
    }

    // Long press for quick actions
    setupLongPress() {
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        let pressTimer;
        const longPressDuration = 500; // 500ms for long press

        document.addEventListener('touchstart', (e) => {
            const target = /** @type {HTMLElement | null} */ (
                /** @type {Element | null} */ (e.target)?.closest('button, .quest-card, [data-task-id]') ?? null
            );
            if (!target) return;

            pressTimer = setTimeout(() => {
                this.vibrate(30);
                this.handleLongPress(target);
            }, longPressDuration);
        });

        document.addEventListener('touchend', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
        });

        document.addEventListener('touchmove', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
        });
    }

    /** @param {HTMLElement} element */
    handleLongPress(element) {
        
        // Add a visual pulse effect
        element.classList.add('scale-105');
        setTimeout(() => element.classList.remove('scale-105'), 200);

        // Show context menu or quick actions
        // This can be customized based on element type
        if (element.dataset.taskId) {
            this.showTaskQuickActions(element);
        }
    }

    /** @param {HTMLElement} element */
    showTaskQuickActions(element) {
        const taskId = element.dataset.taskId;
        if (!taskId || typeof goalManager === 'undefined') return;

        goalManager.showConfirm('Complete this task?', () => {
            goalManager.toggleTask(Number(taskId));
            this.vibrateSuccess();
        });
    }

    // Prevent double-tap zoom on buttons and interactive elements
    preventDoubleTapZoom() {
        // Use CSS touch-action: manipulation (prevents double-tap zoom without
        // blocking legitimate interactions like text selection)
        const style = document.createElement('style');
        style.textContent = `
            button, input, select, textarea, a, .quest-card {
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }

    // Pull to refresh (optional - for future implementation)
    setupPullToRefresh() {
        let startY = 0;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 100) {
                // Show pull to refresh indicator
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            isPulling = false;
            // Reset pull to refresh indicator
        });
    }
}

// Initialize mobile touch handler
const mobileTouchHandler = new MobileTouchHandler();

// Enhance goalManager with mobile-specific features
if (typeof goalManager !== 'undefined' && mobileTouchHandler.isMobile) {
    // Override achievement showing to add haptic feedback
    const originalShowAchievement = goalManager.showAchievement;
    /** @this {any} @param {string} text @param {string} [type] */
    goalManager.showAchievement = function(text, type) {
        mobileTouchHandler.vibrateSuccess();
        originalShowAchievement.call(this, text, type);
    };

    // Add haptic feedback to task completion
    const originalToggleTask = goalManager.toggleTask;
    /** @this {any} @param {any} taskId */
    goalManager.toggleTask = function(taskId) {
        const task = this.dailyTasks.find((/** @type {any} */ t) => t.id === taskId);
        if (task && !task.completed) {
            mobileTouchHandler.vibrateSuccess();
        }
        originalToggleTask.call(this, taskId);
    };

    // Add haptic feedback to level up
    const originalLevelUp = goalManager.levelUp;
    if (originalLevelUp) {
        /** @this {any} */
        goalManager.levelUp = function() {
            const oldLevel = this.level;
            originalLevelUp.call(this);
            if (this.level > oldLevel) {
                // Epic vibration for level up!
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100, 50, 200]);
                }
            }
        };
    }
}

// Export for use in other modules
/** @type {any} */ (window).mobileTouchHandler = mobileTouchHandler;
