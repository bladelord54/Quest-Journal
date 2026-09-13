// @ts-check
'use strict';
/**
 * class-render.js — pure Class / Skill-Tree presentation builders (Engineering Roadmap #1).
 *
 * The FIFTH render module (after boss-render.js, task-render.js, companion-render.js,
 * spell-render.js), covering the WHOLE of `renderClassPanel` — the largest single panel in the
 * God class (~240 lines, five states: locked / class-select / linear tree / capstone / subclass).
 * Extracted over two slices (34th: class-select + linear tree; 35th: capstone + subclass + shell).
 *
 * The eleven builders, by panel state:
 *   - State 2 (no class): renderClassSelectCardHTML(cls) + renderClassSelectPanelHTML(available, cards).
 *   - State 3 (linear tree): renderSkillNodeRowHTML(item, { isUnlocked, isNext, canAfford, color,
 *     unlockAction }) — the ●/◐/○ dot (computed from the flags) + perk desc + Unlocked/Unlock/Locked.
 *   - State 4 (capstone): renderCapstoneCardHTML(cap, { isChosen, canAfford, capstoneReady, color })
 *     + renderCapstoneSectionHTML(capstoneReady, firstCapstoneCost, capCards).
 *   - State 5 (subclass): renderSubclassLockedTeaserHTML(unlockLevel), renderSubclassSelectCardHTML(sub,
 *     { color }), renderSubclassSelectBodyHTML(subCards), renderActiveSubclassBodyHTML(activeSub,
 *     { subMastered, color, tierRowsHTML }), renderSubclassSectionHTML(subBody).
 *   - Shell (States 3–5 assembled): renderActiveClassPanelHTML({ cls, activeSub, fullyMastered,
 *     available, nodeRowsHTML, capstoneSectionHTML, subclassSectionHTML }).
 *
 * DRY prize: the linear skill-tree node rows (State 3) and the subclass tier rows (State 5) were TWO
 * near-identical ~16-line templates differing only in indentation + the unlock `data-action`.
 * renderSkillNodeRowHTML is that ONE shared row — its `unlockAction` param ('class.unlockNode' for
 * base nodes, 'class.unlockSubclassTier' for subclass tiers) is the only distinguisher (both items
 * expose the same `.desc` + `.cost`). It emits at the base node row's original 16-space indent, so
 * State 3 is byte-identical and the State 5 tier rows re-indent to match (a whitespace-only change
 * between block elements — the rendered panel is unchanged). Every other builder reproduces its
 * original inline template verbatim (each capstone/subclass branch keeps its historical indent).
 *
 * The wrapper `renderClassPanel` is now thin: it computes state (available points, unlocked counts,
 * mastery flags), branches, `.map`-delegates the cards/rows, composes the sections, and writes
 * `innerHTML` — no inline markup remains.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.CLASS_RENDER.
 *   - Jest/Node: require('./class-render.js') returns the frozen builders via module.exports.
 */

/**
 * @typedef {Object} ClassDef
 * @property {string} id
 * @property {string} color
 * @property {string} icon
 * @property {string} name
 * @property {string} tagline
 */

/**
 * @typedef {Object} SkillItem
 * @property {string} desc
 * @property {number} cost
 */

/**
 * One class-selection button (State 2). Pure over the class metadata; the inline hover
 * handlers restore the 40%-alpha border on mouseout. Byte-faithful to the original template.
 * @param {ClassDef} cls
 * @returns {string}
 */
function renderClassSelectCardHTML(cls) {
    return `
                <button data-action="class.choose" data-class-id="${cls.id}"
                    class="w-full text-left quest-card bg-stone-900/70 rounded-lg p-3 border-2 transition-all hover:scale-[1.02]"
                    style="border-color:${cls.color}66"
                    onmouseover="this.style.borderColor='${cls.color}'"
                    onmouseout="this.style.borderColor='${cls.color}66'">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-2xl">${cls.icon}</span>
                        <span class="font-bold fancy-font" style="color:${cls.color}">${cls.name}</span>
                    </div>
                    <div class="text-xs text-stone-300 fancy-font">${cls.tagline}</div>
                </button>
            `;
}

/**
 * The State 2 wrapper: "Choose Your Class" header, the available-points line (with singular/
 * plural), and the pre-rendered selection cards. Byte-faithful to the original template.
 * @param {number} available
 * @param {string} cardsHTML
 * @returns {string}
 */
function renderClassSelectPanelHTML(available, cardsHTML) {
    return `
                <div class="quest-card bg-gradient-to-br from-stone-800/60 to-stone-950/60 rounded-xl p-4 border-2 border-purple-700/50">
                    <div class="text-sm font-bold text-purple-300 fancy-font mb-1 flex items-center justify-center">
                        <i class="ri-sword-line mr-2"></i> Choose Your Class
                    </div>
                    <div class="text-xs text-purple-200/80 fancy-font text-center mb-3">
                        ${available} skill point${available === 1 ? '' : 's'} ready to spend
                    </div>
                    <div class="space-y-2">${cardsHTML}</div>
                </div>
            `;
}

/**
 * One row of a linear skill track (State 3 base nodes; State 5 subclass tiers next slice).
 * Computes the ●/◐/○ dot from the progression flags, then renders the perk desc + the
 * Unlocked badge / Unlock button (affordability-gated + `disabled`) / Locked line. The
 * `unlockAction` distinguishes base nodes ('class.unlockNode') from subclass tiers
 * ('class.unlockSubclassTier'). Byte-faithful to the original base-node-row template.
 * @param {SkillItem} item
 * @param {{ isUnlocked: boolean, isNext: boolean, canAfford: boolean, color: string, unlockAction: string }} opts
 * @returns {string}
 */
function renderSkillNodeRowHTML(item, { isUnlocked, isNext, canAfford, color, unlockAction }) {
    const dot = isUnlocked
        ? `<span style="color:${color}">●</span>`
        : isNext ? '<span class="text-amber-300">◐</span>'
        : '<span class="text-stone-600">○</span>';
    return `
                <div class="flex items-start gap-2 py-1 ${isUnlocked ? '' : 'opacity-70'}">
                    <div class="text-lg leading-none mt-0.5">${dot}</div>
                    <div class="flex-1">
                        <div class="text-xs fancy-font ${isUnlocked ? 'text-stone-100' : 'text-stone-300'}">${item.desc}</div>
                        ${isUnlocked
                            ? '<div class="text-[10px] text-green-400 fancy-font">Unlocked</div>'
                            : isNext
                                ? `<button data-action="${unlockAction}" ${canAfford ? '' : 'disabled'}
                                     class="mt-1 text-[11px] font-bold fancy-font px-2 py-0.5 rounded ${canAfford ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-stone-700 text-stone-400 cursor-not-allowed'}">
                                     Unlock (${item.cost} pt${item.cost === 1 ? '' : 's'})
                                   </button>`
                                : `<div class="text-[10px] text-stone-500 fancy-font">Locked — ${item.cost} pts</div>`}
                    </div>
                </div>
            `;
}

/**
 * @typedef {Object} CapstoneDef
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {number} cost
 */

/**
 * One capstone option (State 4). Three mutually-exclusive branches: the CHOSEN capstone (a
 * static "Mastered" card tinted with the class colour), a PICKABLE option while the choice is
 * open (affordability-gated `class.selectCapstone` button), or a greyed "Not chosen" card once
 * a sibling was picked. Byte-faithful to the three original inline templates — each keeps its
 * own historical indentation, since the output whitespace is part of the panel's markup.
 * @param {CapstoneDef} cap
 * @param {{ isChosen: boolean, canAfford: boolean, capstoneReady: boolean, color: string }} opts
 * @returns {string}
 */
function renderCapstoneCardHTML(cap, { isChosen, canAfford, capstoneReady, color }) {
    if (isChosen) {
        return `
                        <div class="rounded-lg p-2 border-2" style="border-color:${color};background:${color}1a">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span style="color:${color}">★</span>
                                <span class="text-xs font-bold fancy-font" style="color:${color}">${cap.name}</span>
                                <span class="text-[10px] text-green-400 fancy-font ml-auto">Mastered</span>
                            </div>
                            <div class="text-[11px] text-stone-200 fancy-font">${cap.desc}</div>
                        </div>
                    `;
    }
    if (capstoneReady) {
        return `
                        <button data-action="class.selectCapstone" data-capstone-id="${cap.id}" ${canAfford ? '' : 'disabled'}
                            class="w-full text-left rounded-lg p-2 border-2 transition-all ${canAfford ? 'hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'}"
                            style="border-color:${color}66">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span class="text-amber-300">◆</span>
                                <span class="text-xs font-bold fancy-font" style="color:${color}">${cap.name}</span>
                                <span class="text-[10px] fancy-font ml-auto ${canAfford ? 'text-amber-300' : 'text-stone-500'}">${cap.cost} pts</span>
                            </div>
                            <div class="text-[11px] text-stone-300 fancy-font">${cap.desc}</div>
                        </button>
                    `;
    }
    return `
                    <div class="rounded-lg p-2 border-2 border-stone-700/50 opacity-50">
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="text-stone-600">◇</span>
                            <span class="text-xs font-bold fancy-font text-stone-400">${cap.name}</span>
                            <span class="text-[10px] text-stone-600 fancy-font ml-auto">Not chosen</span>
                        </div>
                        <div class="text-[11px] text-stone-500 fancy-font">${cap.desc}</div>
                    </div>
                `;
}

/**
 * The State 4 capstone section wrapper: a header ("⭐ Choose your capstone (pick one, N pts)"
 * while pickable, else a plain "Capstone" label) over the pre-rendered capstone cards.
 * @param {boolean} capstoneReady
 * @param {number} firstCapstoneCost  cost of capstones[0] — both cost the same; shown in the header
 * @param {string} capCardsHTML
 * @returns {string}
 */
function renderCapstoneSectionHTML(capstoneReady, firstCapstoneCost, capCardsHTML) {
    const capHeader = capstoneReady
        ? `<div class="text-[11px] text-amber-300 fancy-font text-center mb-1.5">⭐ Choose your capstone (pick one, ${firstCapstoneCost} pts)</div>`
        : `<div class="text-[11px] text-stone-400 fancy-font text-center mb-1.5">Capstone</div>`;
    return `
                <div class="border-t border-stone-700/60 mt-2 pt-2">
                    ${capHeader}
                    <div class="space-y-1.5">${capCardsHTML}</div>
                </div>
            `;
}

/**
 * State 5 locked teaser — shown once the base class is mastered but the player hasn't reached
 * the subclass unlock level yet. Assigned directly as the subclass body (no wrapper newline).
 * @param {number} unlockLevel
 * @returns {string}
 */
function renderSubclassLockedTeaserHTML(unlockLevel) {
    return `<div class="text-[11px] text-stone-400 fancy-font text-center">🔒 Reach Level ${unlockLevel} to specialize</div>`;
}

/**
 * One subclass-selection button (State 5, once unlocked): the subclass icon/name/tagline + its
 * first-tier preview. The hover handlers restore the 40%-alpha border on mouseout.
 * @param {{ id: string, icon: string, name: string, tagline: string, tiers: Array<{ desc: string }> }} sub
 * @param {{ color: string }} opts
 * @returns {string}
 */
function renderSubclassSelectCardHTML(sub, { color }) {
    return `
                        <button data-action="class.chooseSubclass" data-subclass-id="${sub.id}"
                            class="w-full text-left rounded-lg p-2 border-2 transition-all hover:scale-[1.02]"
                            style="border-color:${color}66"
                            onmouseover="this.style.borderColor='${color}'"
                            onmouseout="this.style.borderColor='${color}66'">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span>${sub.icon}</span>
                                <span class="text-xs font-bold fancy-font" style="color:${color}">${sub.name}</span>
                                <span class="text-[10px] text-stone-400 fancy-font ml-auto">${sub.tagline}</span>
                            </div>
                            <div class="text-[11px] text-stone-300 fancy-font">${sub.tiers[0].desc}</div>
                        </button>
                    `;
}

/**
 * State 5 subclass-selection body: the "✨ Specialize" prompt over the pre-rendered choice cards.
 * @param {string} subCardsHTML
 * @returns {string}
 */
function renderSubclassSelectBodyHTML(subCardsHTML) {
    return `
                        <div class="text-[11px] text-amber-300 fancy-font text-center mb-1.5">✨ Specialize (pick one path)</div>
                        <div class="space-y-1.5">${subCardsHTML}</div>
                    `;
}

/**
 * State 5 active-subclass body: the chosen subclass's header (icon/name, ★ Mastered badge when
 * fully unlocked, and a Respec button) over its pre-rendered tier rows (which reuse
 * renderSkillNodeRowHTML with unlockAction 'class.unlockSubclassTier').
 * @param {{ icon: string, name: string }} activeSub
 * @param {{ subMastered: boolean, color: string, tierRowsHTML: string }} opts
 * @returns {string}
 */
function renderActiveSubclassBodyHTML(activeSub, { subMastered, color, tierRowsHTML }) {
    return `
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-1.5">
                            <span>${activeSub.icon}</span>
                            <span class="text-xs font-bold fancy-font" style="color:${color}">${activeSub.name}</span>
                            ${subMastered ? '<span class="text-[10px] text-green-400 fancy-font">★ Mastered</span>' : ''}
                        </div>
                        <button data-action="class.subclassRespec" title="Change subclass"
                            class="text-stone-400 hover:text-white text-[10px] fancy-font flex items-center gap-1">
                            <i class="ri-refresh-line"></i> Respec
                        </button>
                    </div>
                    <div>${tierRowsHTML}</div>
                `;
}

/**
 * State 5 wrapper: the "🔱 Subclass Specialization" heading over whichever subclass body applies.
 * @param {string} subBodyHTML
 * @returns {string}
 */
function renderSubclassSectionHTML(subBodyHTML) {
    return `
                <div class="border-t border-stone-700/60 mt-2 pt-2">
                    <div class="text-[11px] text-purple-300 fancy-font text-center mb-1.5">🔱 Subclass Specialization</div>
                    ${subBodyHTML}
                </div>
            `;
}

/**
 * The active-class panel shell (States 3–5 assembled): the class header (icon/name, an optional
 * "· subclass" suffix, a Respec button), the skill-point summary line ("⭐ Class fully mastered"
 * or "N skill points available"), and the three pre-rendered sections (linear nodes + capstone +
 * subclass). Byte-faithful to the original `section.innerHTML` template.
 * @param {{ cls: { icon: string, name: string, color: string }, activeSub: ({ icon: string, name: string }|null), fullyMastered: boolean, available: number, nodeRowsHTML: string, capstoneSectionHTML: string, subclassSectionHTML: string }} opts
 * @returns {string}
 */
function renderActiveClassPanelHTML({ cls, activeSub, fullyMastered, available, nodeRowsHTML, capstoneSectionHTML, subclassSectionHTML }) {
    return `
            <div class="quest-card bg-gradient-to-br from-stone-800/60 to-stone-950/60 rounded-xl p-4 border-2" style="border-color:${cls.color}66">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${cls.icon}</span>
                        <span class="font-bold fancy-font" style="color:${cls.color}">${cls.name}</span>
                        ${activeSub ? `<span class="text-sm fancy-font text-stone-300">· ${activeSub.icon} ${activeSub.name}</span>` : ''}
                    </div>
                    <button data-action="class.respec" title="Change class"
                        class="text-stone-400 hover:text-white text-xs fancy-font flex items-center gap-1">
                        <i class="ri-refresh-line"></i> Respec
                    </button>
                </div>
                <div class="text-xs fancy-font text-center mb-3 ${fullyMastered || available > 0 ? 'text-amber-300' : 'text-stone-400'}">
                    ${fullyMastered ? '⭐ Class fully mastered' : `${available} skill point${available === 1 ? '' : 's'} available`}
                </div>
                <div class="border-t border-stone-700/60 pt-2">${nodeRowsHTML}</div>
                ${capstoneSectionHTML}
                ${subclassSectionHTML}
            </div>
        `;
}

const CLASS_RENDER = Object.freeze({
    renderClassSelectCardHTML,
    renderClassSelectPanelHTML,
    renderSkillNodeRowHTML,
    renderCapstoneCardHTML,
    renderCapstoneSectionHTML,
    renderSubclassLockedTeaserHTML,
    renderSubclassSelectCardHTML,
    renderSubclassSelectBodyHTML,
    renderActiveSubclassBodyHTML,
    renderSubclassSectionHTML,
    renderActiveClassPanelHTML,
});


// Node / Jest

export default CLASS_RENDER;
