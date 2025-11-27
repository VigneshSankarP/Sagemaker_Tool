// ==UserScript==
// @name         SageMaker Keyboard Shortcuts
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Add Q W E R keyboard shortcuts for options 11-14 in SageMaker labeling tasks
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @match        https://dcjt2af5rw.labeling.us-west-2.sagemaker.aws/*
// @match        https://*.amazonaws.com/*
// @grant        none
// @run-at       document-idle
// @homepageURL  https://github.com/VigneshSankarP/Sagemaker_Tool
// @supportURL   https://github.com/VigneshSankarP/Sagemaker_Tool/issues
// @updateURL    https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sagemaker-keyboard-shortcuts.meta.js
// @downloadURL  https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sagemaker-keyboard-shortcuts.user.js
// @icon         https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/icon.png
// ==/UserScript==

(function() {
    'use strict';

    console.log('⌨️ SageMaker Keyboard Shortcuts v1.1');

    const SHORTCUTS = [
        { key: '1', text: 'Real' },
        { key: '2', text: 'Synthetic Editing' },
        { key: '3', text: 'Entire GenAI Synthesized' },
        { key: '4', text: 'Very Strong Physical Makeup' },
        { key: '5', text: 'Physical Mask' },
        { key: '6', text: 'Screen Replay' },
        { key: '7', text: 'Paper Print' },
        { key: '8', text: 'Cartoon / Anime / Artistic / Human-like' },
        { key: '9', text: 'Others / Unknown' },
        { key: '0', text: '0 second' },
        { key: 'Q', text: 'Transition', addKey: true },
        { key: 'W', text: 'Static Image / Video', addKey: true },
        { key: 'E', text: 'Watermarks / Logo / Subtitle / Movie-Credits', addKey: true },
        { key: 'R', text: 'Low Quality Video (entire image or video is too blur)', addKey: true }
    ];

    let observer = null;
    let isProcessing = false;

    function cloneExactStructure() {
        if (isProcessing) return false;
        isProcessing = true;

        const crowdClassifier = document.querySelector('crowd-classifier');
        if (!crowdClassifier) {
            isProcessing = false;
            return false;
        }

        const shadowRoot = crowdClassifier.shadowRoot || crowdClassifier;
        const allElements = shadowRoot.querySelectorAll ? shadowRoot.querySelectorAll('*') : [];

        let defaultNumberElement = null;
        let defaultNumberParent = null;

        for (const el of allElements) {
            const text = el.textContent?.trim();
            if (text && /^[1-9]$/.test(text)) {
                defaultNumberElement = el;
                defaultNumberParent = el.parentElement;
                break;
            }
        }

        if (!defaultNumberElement) {
            isProcessing = false;
            return false;
        }

        // Remove old cloned elements first
        for (const shortcut of SHORTCUTS) {
            if (!shortcut.addKey) continue;
            const oldElements = shadowRoot.querySelectorAll(`.exact-clone-${shortcut.key}`);
            oldElements.forEach(el => el.remove());
        }

        let addedCount = 0;

        for (const shortcut of SHORTCUTS) {
            if (!shortcut.addKey) continue;

            let optionElement = null;

            for (const el of allElements) {
                let text = '';
                for (const node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        text += node.textContent;
                    }
                }
                text = text.trim();

                if (!text || text.length > 200) continue;

                const textLower = text.toLowerCase();
                const searchLower = shortcut.text.toLowerCase();

                if (textLower === searchLower || textLower.includes(searchLower)) {
                    optionElement = el;
                    break;
                }
            }

            if (!optionElement) continue;

            let targetParent = optionElement;
            let depth = 0;
            while (targetParent && depth < 20) {
                if (targetParent.tagName === defaultNumberParent.tagName) {
                    const rect = targetParent.getBoundingClientRect();
                    if (rect.width > 300 && rect.height > 20 && rect.height < 100) {
                        break;
                    }
                }
                targetParent = targetParent.parentElement;
                depth++;
            }

            const keyElement = defaultNumberElement.cloneNode(false);
            keyElement.className = `exact-clone-${shortcut.key} ${defaultNumberElement.className}`;
            keyElement.textContent = shortcut.key;
            keyElement.removeAttribute('id');

            try {
                targetParent.appendChild(keyElement);
                addedCount++;
            } catch (e) {
                console.error('Error adding key:', e);
            }
        }

        isProcessing = false;
        return addedCount > 0;
    }

    function findOption(searchText) {
        const crowdClassifier = document.querySelector('crowd-classifier');
        if (!crowdClassifier) return null;

        const shadowRoot = crowdClassifier.shadowRoot || crowdClassifier;
        const allElements = shadowRoot.querySelectorAll ? shadowRoot.querySelectorAll('*') : [];

        for (const el of allElements) {
            if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            let text = '';
            for (const node of el.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                }
            }
            text = text.trim();

            if (!text || text.length > 200) continue;
            if (text.includes('{') || text.includes(':')) continue;

            const textLower = text.toLowerCase();
            const searchLower = searchText.toLowerCase();

            if (textLower === searchLower || textLower.includes(searchLower)) {
                return el;
            }
        }

        return null;
    }

    function clickOption(element) {
        if (!element) return false;

        try {
            element.click();

            let parent = element.parentElement;
            let depth = 0;
            while (parent && depth < 5) {
                parent.click();
                parent = parent.parentElement;
                depth++;
            }

            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));

            return true;
        } catch (e) {
            return false;
        }
    }

    function handleShortcut(shortcut) {
        const element = findOption(shortcut.text);
        return clickOption(element);
    }

    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable) {
            return;
        }

        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }

        const shortcut = SHORTCUTS.find(s => s.key.toLowerCase() === e.key.toLowerCase());
        if (shortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handleShortcut(shortcut);
        }
    }, true);

    function startObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver((mutations) => {
            // Check if crowd-classifier exists and has content
            const crowdClassifier = document.querySelector('crowd-classifier');
            if (crowdClassifier) {
                const shadowRoot = crowdClassifier.shadowRoot || crowdClassifier;
                const hasContent = shadowRoot.querySelector('*');

                if (hasContent && !isProcessing) {
                    // Debounce: wait a bit before re-adding keys
                    setTimeout(() => {
                        const success = cloneExactStructure();
                        if (success) {
                            console.log('🔄 Keyboard shortcuts refreshed');
                        }
                    }, 500);
                }
            }
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        console.log('👀 Observer started - watching for content changes');
    }

    function init(attempts = 0) {
        const success = cloneExactStructure();

        if (!success && attempts < 10) {
            setTimeout(() => init(attempts + 1), 1000);
        } else if (success) {
            console.log('✅ SageMaker Keyboard Shortcuts ready! (1-9, 0, Q, W, E, R)');
            // Start observing for changes after successful initialization
            startObserver();
        } else if (attempts >= 10) {
            // Even if initial setup fails, start observer
            startObserver();
        }
    }

    setTimeout(() => init(), 2000);

})();
