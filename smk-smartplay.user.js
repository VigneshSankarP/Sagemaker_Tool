// ==UserScript==
// @name         SageMaker Smart-Play
// @namespace    http://tampermonkey.net/
// @version      10.1
// @description  Smart-play visible videos + AWS-themed small toggle UI in MTurk footer.
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @match        https://mturk-console-template-preview-hooks.s3.amazonaws.com/*
// @updateURL    https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/smk-smartplay.user.js
// @downloadURL  https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/smk-smartplay.user.js
// @all-frames   true
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STATE_KEY = 'smk_autoPlayEnabled';
    const MSG = '__SMK_AP_SWITCH__';
    const BTN_ID = 'smk-auto-play-toggle';

    const getPersisted = () => localStorage.getItem(STATE_KEY) !== 'false';
    const setPersisted = (on) => localStorage.setItem(STATE_KEY, on ? 'true' : 'false');

    if (typeof window.__SMK_AP_ON === 'undefined') window.__SMK_AP_ON = null;

    /* ---------------- Cross-frame sync ---------------- */
    function postState(on) {
        const payload = { [MSG]: 'STATE', on };
        try { window.postMessage(payload, '*'); } catch (_) {}
        document.querySelectorAll('iframe')?.forEach(ifr => {
            try { ifr.contentWindow?.postMessage(payload, '*'); } catch (_) {}
        });
    }

    function requestState() {
        const payload = { [MSG]: 'REQUEST' };
        try { window.top?.postMessage(payload, '*'); } catch (_) {}
    }

    window.addEventListener('message', (evt) => {
        const d = evt?.data;
        if (!d || !d[MSG]) return;
        if (d[MSG] === 'STATE' && typeof d.on === 'boolean') {
            window.__SMK_AP_ON = d.on;
            try { setPersisted(d.on); } catch (_) {}
        } else if (d[MSG] === 'REQUEST') {
            if (window.top === window.self) postState(getPersisted());
        }
    });


    /* ---------------- Insert NEW Small AWS-style Smart-Play toggle ---------------- */
    function insertSwitchInFooter() {

        const footerText = document.querySelector(
            "p.awsui-util-p-n.awsui-util-t-c.awsui-util-status-info"
        );

        if (!footerText) return false;

        const footer = footerText.parentElement;
        if (!footer || document.getElementById(BTN_ID)) return false;

        footer.style.display = "flex";
        footer.style.alignItems = "center";
        footer.style.justifyContent = "flex-end";

        const wrap = document.createElement('div');
        wrap.id = BTN_ID;

        wrap.innerHTML = `
        <style>

            .smart-toggle {
                display:flex;
                align-items:center;
                cursor:pointer;
                font-family:sans-serif;
                font-size:12px;
                margin-left:8px;
                user-select:none;
            }

            .smart-label {
                margin-right:6px;
                color:#1a1a1a;
            }

            /* SMALL AWS toggle */
            .smart-track {
                width:36px;
                height:18px;
                background:${getPersisted() ? "#4a5a66" : "#c7c7c7"};
                border-radius:18px;
                position:relative;
                transition:background 0.25s;
            }

            .smart-knob {
                width:16px;
                height:16px;
                background:${getPersisted() ? "#9fb5c1" : "#ffffff"};
                border-radius:50%;
                position:absolute;
                top:1px;
                left:${getPersisted() ? "19px" : "1px"};
                transition:left .25s, background .25s;
                box-shadow:0 1px 2px rgba(0,0,0,0.25);
            }

        </style>

        <label class="smart-toggle">
            <span class="smart-label">Smart-Play</span>
            <div id="switch-track" class="smart-track">
                <div id="switch-knob" class="smart-knob"></div>
            </div>
        </label>
        `;

        const track = wrap.querySelector("#switch-track");
        const knob = wrap.querySelector("#switch-knob");

        wrap.addEventListener("click", () => {
            const next = !getPersisted();
            setPersisted(next);
            window.__SMK_AP_ON = next;

            track.style.background = next ? "#4a5a66" : "#c7c7c7";
            knob.style.left = next ? "19px" : "1px";
            knob.style.background = next ? "#9fb5c1" : "#ffffff";

            postState(next);
        });

        footer.appendChild(wrap);
        return true;
    }


    function ensureSwitch() {
        if (window.top !== window.self) return;
        if (!insertSwitchInFooter()) {
            const int = setInterval(() => {
                if (insertSwitchInFooter()) clearInterval(int);
            }, 500);
        }
    }


    /* ---------------- INIT ---------------- */
    if (window.top === window.self) {
        const initTop = () => {
            ensureSwitch();
            const on = getPersisted();
            window.__SMK_AP_ON = on;
            postState(on);
        };
        if (document.readyState === 'complete' || document.readyState === 'interactive')
            initTop();
        else
            window.addEventListener('DOMContentLoaded', initTop, { once: true });
    } else {
        requestState();
    }


    /* ---------------- VIDEO AUTOPLAY ENGINE (unchanged) ---------------- */
    function findVideosDeep(root = document, out = [], seen = new WeakSet()) {
        if (!root || seen.has(root)) return out;
        seen.add(root);
        try {
            root.querySelectorAll('video')?.forEach(v => out.push(v));
            root.querySelectorAll('*')?.forEach(el => {
                if (el.shadowRoot) findVideosDeep(el.shadowRoot, out, seen);
            });
            root.querySelectorAll('iframe')?.forEach(ifr => {
                try {
                    const idoc = ifr.contentDocument || ifr.contentWindow?.document;
                    if (idoc) findVideosDeep(idoc, out, seen);
                } catch (_) {}
            });
        } catch (_) {}
        return out;
    }

    const isVisible = el => {
        const r = el.getBoundingClientRect();
        return r.width > 30 && r.height > 30 && r.bottom > 0 && r.right > 0;
    };

    const sortByProminence = vids => vids.slice().sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const va = ra.width * ra.height, vb = rb.width * rb.height;
        const visA = isVisible(a) ? 1 : 0, visB = isVisible(b) ? 1 : 0;
        if (visB !== visA) return visB - visA;
        return vb - va;
    });

    const playing = v => !v.paused && !v.ended && v.readyState >= 2;

    async function autoPlayVideo() {
        const vids = findVideosDeep();
        if (!vids.length) return;
        const t = sortByProminence(vids).find(isVisible) || vids[0];
        if (!t) return;
        try { await t.play(); }
        catch { try { t.muted = true; await t.play(); } catch {} }
    }

    function autoPlayIfEnabled() {
        if (window.__SMK_AP_ON === true) autoPlayVideo();
    }

    ['click', 'keydown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, unmuteOnInteraction, { once: true, capture: true });
    });

    function unmuteOnInteraction() {
        const vids = findVideosDeep();
        vids.forEach(v => {
            if (v.muted && !v.paused) {
                v.muted = false;
                try { v.play(); } catch {}
            }
        });
    }

    function isEditable(el) {
        if (!el) return false;
        if (el.isContentEditable) return true;
        return ['INPUT','TEXTAREA','SELECT'].includes(el.tagName);
    }

    function isSpaceEvent(e) {
        return e.code === 'Space' || e.key === ' ' || e.keyCode === 32;
    }

    async function toggleVideos() {
        const vids = findVideosDeep();
        if (!vids.length) return;
        const somePlaying = vids.some(playing);
        if (somePlaying) {
            vids.forEach(v => { try { v.pause(); } catch {} });
            window.__SMK_AP_ON = false;
            localStorage.setItem(STATE_KEY, 'false');
            postState(false);
        } else {
            const t = sortByProminence(vids).find(isVisible) || vids[0];
            try { await t.play(); }
            catch { try { t.muted = true; await t.play(); } catch {} }
        }
    }

    window.addEventListener('keydown', (e) => {
        if (!isSpaceEvent(e)) return;
        if (isEditable(document.activeElement)) return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        e.preventDefault();
        e.stopPropagation();
        toggleVideos();
    }, { capture: true, passive: false });

    function tryPlayWithDelay(retries = 10) {
        autoPlayIfEnabled();
        if (retries > 0) setTimeout(() => tryPlayWithDelay(retries - 1), 1000);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive')
        tryPlayWithDelay();
    else
        window.addEventListener('DOMContentLoaded', () => tryPlayWithDelay(), { once: true });

    const mo = new MutationObserver(() => autoPlayIfEnabled());
    mo.observe(document, { childList: true, subtree: true });

})();
