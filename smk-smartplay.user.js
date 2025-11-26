// ==UserScript==
// @name         SageMaker Smart-Play
// @namespace    http://tampermonkey.net/
// @version      10.6
// @description  Smart-Play with autoplay + spacebar + footer alignment + auto-update + all fixes
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @match        https://mturk-console-template-preview-hooks.s3.amazonaws.com/*
// @run-at       document-end
// @grant        none
// @updateURL    https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/smk-smartplay.user.js
// @downloadURL  https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/smk-smartplay.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ===== FIX #4: Double initialization guard =====
    if (window.__SMK_SMART_PLAY_LOADED__) {
        console.log('[Smart-Play] Already loaded, skipping duplicate initialization');
        return;
    }
    window.__SMK_SMART_PLAY_LOADED__ = true;

    // ===== COORDINATION LAYER =====
    (function() {
        if (!window.__SAGEMAKER__) {
            window.__SAGEMAKER__ = {
                version: '1.0',
                scripts: {},
                getFooter() {
                    const p = document.querySelector("p.awsui-util-p-n.awsui-util-t-c.awsui-util-status-info");
                    if (p?.parentElement) return p.parentElement;
                    return document.querySelector('.cswui-footer, .awsui-footer, footer, [role="contentinfo"]');
                },
                checkHealth() {
                    console.log('🔍 SageMaker Scripts Status:', this.scripts);
                    return this.scripts;
                }
            };
        }
    })();

    // ===== FIX #3: Sanitization helper =====
    function sanitizeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // ===== AUTO-UPDATE SYSTEM =====
    const UPDATE_CONFIG = {
        CHECK_ON_STARTUP: true,
        CHECK_INTERVAL_HOURS: 24,
        NOTIFY_UPDATES: true,
        LAST_CHECK_KEY: 'smk_last_update_check',
        UPDATE_AVAILABLE_KEY: 'smk_update_available'
    };

    function checkForUpdates(silent = false) {
        try {
            if (typeof GM === 'undefined' || !GM.info) {
                if (!silent) console.log('[Smart-Play] GM API not available for update check');
                return;
            }

            // FIX #1: Use consistent version from header
            const CURRENT_VERSION = GM.info.script.version || '10.6';
            const UPDATE_URL = GM.info.script.updateURL || GM.info.script.downloadURL;
            const DOWNLOAD_URL = GM.info.script.downloadURL;

            if (!UPDATE_URL || !DOWNLOAD_URL) {
                if (!silent) console.log('[Smart-Play] No update URLs configured');
                return;
            }

            console.log('[Smart-Play] 🔍 Checking for updates... Current version:', CURRENT_VERSION);

            fetch(UPDATE_URL + '?t=' + Date.now())
                .then(response => response.text())
                .then(text => {
                    const match = text.match(/@version\s+([0-9.]+)/);
                    if (!match) {
                        if (!silent) console.log('[Smart-Play] Could not parse version from remote script');
                        return;
                    }

                    const REMOTE_VERSION = match[1];
                    console.log('[Smart-Play] Remote version:', REMOTE_VERSION);

                    if (REMOTE_VERSION !== CURRENT_VERSION) {
                        console.log(`[Smart-Play] 🎉 New version available: ${REMOTE_VERSION} (current: ${CURRENT_VERSION})`);

                        try {
                            localStorage.setItem(UPDATE_CONFIG.UPDATE_AVAILABLE_KEY, JSON.stringify({
                                version: REMOTE_VERSION,
                                currentVersion: CURRENT_VERSION,
                                downloadUrl: DOWNLOAD_URL,
                                checkedAt: new Date().toISOString()
                            }));
                        } catch (e) {
                            console.warn('[Smart-Play] Cannot save update info:', e);
                        }

                        if (UPDATE_CONFIG.NOTIFY_UPDATES) {
                            showSmartPlayUpdateNotification(REMOTE_VERSION, CURRENT_VERSION, DOWNLOAD_URL);
                        }
                    } else {
                        console.log('[Smart-Play] ✅ Script is up to date');
                        try {
                            localStorage.removeItem(UPDATE_CONFIG.UPDATE_AVAILABLE_KEY);
                            localStorage.setItem(UPDATE_CONFIG.LAST_CHECK_KEY, new Date().toISOString());
                        } catch (e) {}
                    }
                })
                .catch(err => {
                    if (!silent) console.error('[Smart-Play] Update check failed:', err);
                });
        } catch (e) {
            if (!silent) console.error('[Smart-Play] Update check error:', e);
        }
    }

    function showSmartPlayUpdateNotification(newVersion, currentVersion, downloadUrl) {
        const existing = document.getElementById('smk-update-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'smk-update-notification';

        // FIX #3: Sanitize versions before inserting
        const safeNewVersion = sanitizeHTML(newVersion);
        const safeCurrentVersion = sanitizeHTML(currentVersion);

        notification.innerHTML = `
            <style>
                #smk-update-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 320px;
                    background: linear-gradient(135deg, #4a5a66 0%, #2c3e50 100%);
                    color: white;
                    padding: 16px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(74, 90, 102, 0.4);
                    z-index: 9999999;
                    font-family: system-ui, -apple-system, sans-serif;
                    animation: slideInRight 0.4s ease-out;
                }
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                #smk-update-notification .update-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    font-weight: 700;
                    font-size: 16px;
                }
                #smk-update-notification .update-body {
                    font-size: 13px;
                    margin-bottom: 12px;
                    opacity: 0.95;
                }
                #smk-update-notification .update-version {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-family: monospace;
                    font-weight: 700;
                }
                #smk-update-notification .update-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                }
                #smk-update-notification button {
                    flex: 1;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                #smk-update-notification .btn-update {
                    background: white;
                    color: #2c3e50;
                }
                #smk-update-notification .btn-update:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
                }
                #smk-update-notification .btn-dismiss {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }
                #smk-update-notification .btn-dismiss:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            </style>
            <div class="update-header">
                <span style="font-size: 24px;">🎬</span>
                <span>Smart-Play Update!</span>
            </div>
            <div class="update-body">
                A new version of SageMaker Smart-Play is available!
                <div style="margin-top: 8px;">
                    <span class="update-version">${safeCurrentVersion}</span>
                    <span style="margin: 0 8px;">→</span>
                    <span class="update-version">${safeNewVersion}</span>
                </div>
            </div>
            <div class="update-actions">
                <button class="btn-update" id="smk-update-now">Update Now</button>
                <button class="btn-dismiss" id="smk-update-dismiss">Later</button>
            </div>
        `;

        document.body.appendChild(notification);

        const autoDismiss = setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-in reverse';
            setTimeout(() => notification.remove(), 300);
        }, 15000);

        notification.querySelector('#smk-update-now').addEventListener('click', () => {
            clearTimeout(autoDismiss);
            window.location.href = downloadUrl;
        });

        notification.querySelector('#smk-update-dismiss').addEventListener('click', () => {
            clearTimeout(autoDismiss);
            notification.style.animation = 'slideInRight 0.3s ease-in reverse';
            setTimeout(() => notification.remove(), 300);
        });
    }

    // Check on startup
    if (UPDATE_CONFIG.CHECK_ON_STARTUP) {
        setTimeout(() => {
            try {
                const lastCheck = localStorage.getItem(UPDATE_CONFIG.LAST_CHECK_KEY);
                const shouldCheck = !lastCheck ||
                    (new Date() - new Date(lastCheck)) > (UPDATE_CONFIG.CHECK_INTERVAL_HOURS * 60 * 60 * 1000);

                if (shouldCheck) {
                    checkForUpdates(true);
                }
            } catch (e) {
                console.warn('[Smart-Play] Cannot check update schedule:', e);
            }
        }, 5000);
    }

    // ===== CONFIG =====
    const STATE_KEY = 'smk_autoPlayEnabled';
    const MSG = '__SMK_AP_SWITCH__';
    const BTN_ID = 'smk-auto-play-toggle';
    const VERSION = '10.6';  // FIX #1: Match header version
    const SENDER = `${Date.now()}-${Math.floor(Math.random()*1e9)}`;
    const MUTATION_DEBOUNCE_MS = 200;
    const RETRY_TIMEOUT_MS = 1000;
    const RETRY_ATTEMPTS = 10;
    const VIDEO_CACHE_MS = 1000;  // FIX #7: Video cache duration

    // ===== FIX #2: Clean only Smart-Play elements =====
    function cleanOld() {
        ['smk-toggle', 'smk-auto-play-toggle'].forEach(id => {
            document.querySelectorAll(`#${id}`).forEach(el => el.remove());
        });
        document.querySelectorAll('.smk-left-wrapper').forEach(el => el.remove());
        // DO NOT remove: sm-utilization, sm-progress-bar, sm-log-btn (Script 1 elements)
    }

    // ===== FIX #9: Safe localStorage access =====
    const readPersisted = () => {
        try {
            return localStorage.getItem(STATE_KEY) !== 'false';
        } catch (e) {
            console.warn('[Smart-Play] localStorage unavailable, defaulting to enabled');
            return true;
        }
    };

    const writePersisted = v => {
        try {
            localStorage.setItem(STATE_KEY, v ? 'true' : 'false');
            return true;
        } catch (e) {
            console.warn('[Smart-Play] Cannot save state to localStorage');
            return false;
        }
    };

    if (typeof window.__SMK_AP_ON === 'undefined') {
        window.__SMK_AP_ON = readPersisted();
    }

    // ===== CROSS-FRAME SYNC =====
    let lastSeq = 0;

    function postState(on) {
        const p = { [MSG]:'STATE', on, sender:SENDER, seq:Date.now(), version:VERSION };
        window.postMessage(p,'*');
        document.querySelectorAll('iframe').forEach(ifr=>{
            try{ ifr.contentWindow.postMessage(p,'*'); }catch(_){}
        });
    }

    function requestState() {
        const p = { [MSG]:'REQUEST', sender:SENDER, seq:Date.now(), version:VERSION };
        window.top?.postMessage(p,'*');
    }

    window.addEventListener('message', evt=>{
        const d = evt?.data;
        if (!d || !d[MSG]) return;
        if (d.sender === SENDER) return;

        if (d[MSG] === 'STATE') {
            if (d.seq && d.seq <= lastSeq) return;
            lastSeq = d.seq;
            writePersisted(d.on);
            window.__SMK_AP_ON = d.on;
        } else if (d[MSG] === 'REQUEST') {
            const rsp = { [MSG]:'STATE', on:readPersisted(), sender:SENDER, seq:Date.now(), version:VERSION };
            try{ evt.source.postMessage(rsp,'*'); }catch(_){}
            try{ window.top.postMessage(rsp,'*'); }catch(_){}
        }
    });

    // ===== FIX #7: Video cache for performance =====
    let videoCache = { videos: [], timestamp: 0 };

    function findVideosDeep(root=document, out=[], seen=new WeakSet()){
        if (!root || seen.has(root)) return out;
        seen.add(root);
        try {
            root.querySelectorAll('video')?.forEach(v=>out.push(v));
            root.querySelectorAll('*')?.forEach(el=>{
                if (el.shadowRoot) findVideosDeep(el.shadowRoot,out,seen);
            });
            root.querySelectorAll('iframe')?.forEach(ifr=>{
                try{
                    const doc = ifr.contentDocument || ifr.contentWindow?.document;
                    if (doc) findVideosDeep(doc,out,seen);
                }catch(_){}
            });
        } catch(_){}
        return out;
    }

    function findVideosDeepCached() {
        const now = Date.now();
        if (videoCache.videos.length && (now - videoCache.timestamp) < VIDEO_CACHE_MS) {
            return videoCache.videos;
        }
        const videos = findVideosDeep();
        videoCache = { videos, timestamp: now };
        return videos;
    }

    // ===== FIX #10: Better video visibility detection =====
    const isVisible = v => {
        try {
            const r = v.getBoundingClientRect();
            const hasSize = r.width > 30 && r.height > 30;
            const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
            const style = window.getComputedStyle(v);
            const notHidden = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            const hasSource = v.src || (v.currentSrc && v.currentSrc !== '');
            return hasSize && inViewport && notHidden && hasSource;
        } catch {
            return false;
        }
    };

    const sortByProminence = vids => vids.slice().sort((a,b)=>{
        try {
            const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
            const va=ra.width*ra.height, vb=rb.width*rb.height;
            const visA=isVisible(a)?1:0, visB=isVisible(b)?1:0;
            if (visB!==visA) return visB-visA;
            return vb-va;
        } catch { return 0; }
    });

    // ===== AUTOPLAY ENGINE =====
    let retryTimer=null;
    let retryLeft=0;

    function clearRetry(){
        if(retryTimer) clearTimeout(retryTimer);
        retryTimer=null;
    }

    function stopAll() {
        clearRetry();
        retryLeft=0;
        findVideosDeepCached().forEach(v=>{ try{ v.pause(); }catch{} });
    }

    async function attemptPlayOnce(){
        if (!readPersisted()) return { ok:false };
        const vids=findVideosDeepCached();
        if (!vids.length) return { ok:false };

        const v = sortByProminence(vids).find(isVisible) || vids[0];
        try {
            await v.play();
            return { ok:true, v, muted:false };
        } catch {
            try {
                v.muted=true;
                await v.play();
                return { ok:true, v, muted:true };
            } catch {
                return { ok:false };
            }
        }
    }

    function tryPlayLoop(n=RETRY_ATTEMPTS){
        clearRetry();
        retryLeft=n;

        const step=async()=>{
            if(!readPersisted()) return;
            const r=await attemptPlayOnce();
            if(r.ok){ clearRetry(); return; }
            retryLeft--;
            if(retryLeft>0) retryTimer=setTimeout(step,RETRY_TIMEOUT_MS);
        };
        step();
    }

    function autoPlayIfOn(){
        if (readPersisted()) tryPlayLoop();
    }

    // ===== UNMUTE ON FIRST USER CLICK =====
    ['click','keydown','mousedown','touchstart'].forEach(evt=>{
        window.addEventListener(evt,()=>{
            const vids=findVideosDeepCached();
            vids.forEach(v=>{
                if(v.muted && !v.paused){
                    try{ v.muted=false; v.play().catch(()=>{}); }catch{}
                }
            });
        },{ once:true, capture:true });
    });

    // ===== FOOTER TOGGLE =====
    function getFooter(){
        const footer = window.__SAGEMAKER__.getFooter();
        window.__SAGEMAKER__.scripts.smartPlay = !!footer;
        return footer;
    }

    function insertToggle(){
        if (document.getElementById(BTN_ID)) return true;

        const footer=getFooter();
        if (!footer) return false;

        if (window.getComputedStyle(footer).position === 'static')
            footer.style.position='relative';

        const box=document.createElement('div');
        box.id=BTN_ID;

        // FIX #5: Adjust position if Script 1 is present
        const utilizationExists = document.getElementById('sm-utilization');
        const rightOffset = utilizationExists ? '200px' : '12px';

        box.style.position='absolute';
        box.style.right=rightOffset;
        box.style.top='50%';
        box.style.transform='translateY(-50%)';
        box.style.display='flex';
        box.style.alignItems='center';
        box.style.gap='6px';
        box.style.fontFamily='sans-serif';
        box.style.fontSize='12px';
        box.style.cursor='pointer';
        box.style.zIndex='99999';

        const on=readPersisted();

        // FIX #8: Add accessibility attributes
        box.setAttribute('role', 'switch');
        box.setAttribute('aria-checked', on ? 'true' : 'false');
        box.setAttribute('aria-label', 'Toggle Smart-Play video autoplay');
        box.setAttribute('tabindex', '0');

        box.innerHTML=`
            <span>Smart-Play</span>
            <div id="smk-track" style="
                width:36px;height:18px;border-radius:18px;
                background:${on?"#4a5a66":"#ccc"};
                position:relative;transition:.2s;">
                <div id="smk-knob" style="
                    width:16px;height:16px;border-radius:50%;
                    background:${on?"#9fb5c1":"#fff"};
                    position:absolute;top:1px;left:${on?"19px":"1px"};
                    transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,0.3);">
                </div>
            </div>
        `;

        footer.appendChild(box);

        const track=box.querySelector('#smk-track');
        const knob=box.querySelector('#smk-knob');

        const render=v=>{
            track.style.background=v?"#4a5a66":"#ccc";
            knob.style.left=v?"19px":"1px";
            knob.style.background=v?"#9fb5c1":"#fff";
            box.setAttribute('aria-checked', v ? 'true' : 'false');  // FIX #8: Update ARIA
        };

        const toggleHandler = ()=>{
            const next=!readPersisted();
            writePersisted(next);
            window.__SMK_AP_ON=next;
            render(next);
            if(!next) stopAll();
            else autoPlayIfOn();
            postState(next);
        };

        box.addEventListener('click', toggleHandler);

        // FIX #8: Keyboard accessibility
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleHandler();
            }
        });

        return true;
    }

    // ===== SPACEBAR SMART MODE =====
    window.addEventListener("keydown", e => {
        if (e.code !== "Space") return;

        const active = document.activeElement;
        const typing = (
            active && (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.isContentEditable ||
                (active.tagName === "DIV" && active.getAttribute("role") === "textbox")
            )
        );

        if (typing) return;

        e.preventDefault();
        e.stopPropagation();

        const vids = findVideosDeepCached();
        if (!vids.length) return;

        const target = sortByProminence(vids).find(isVisible) || vids[0];

        if (!target) return;

        try {
            if (target.paused) {
                target.play().catch(()=>{});
            } else {
                target.pause();
            }
        } catch(_){}
    }, true);

    // ===== MUTATION OBSERVER =====
    let debounce=null;
    const mo=new MutationObserver(()=>{
        if(debounce) return;
        debounce=setTimeout(()=>{
            debounce=null;
            insertToggle();
            if (readPersisted()) autoPlayIfOn();
        },MUTATION_DEBOUNCE_MS);
    });

    // ===== FIX #6: Cleanup on unload =====
    window.addEventListener('beforeunload', () => {
        console.log('[Smart-Play] Cleaning up...');
        if (mo) mo.disconnect();
        clearRetry();
        videoCache = { videos: [], timestamp: 0 };
    });

    // ===== INIT =====
    function init(){
        cleanOld();
        insertToggle();
        if (readPersisted()) autoPlayIfOn();
        try{ mo.observe(document,{childList:true,subtree:true}); }catch(_){}
        setTimeout(() => {
            if (window.__SAGEMAKER__) {
                window.__SAGEMAKER__.checkHealth();
            }
        }, 2000);
        console.log('[Smart-Play] ✅ Initialized v' + VERSION);
    }

    if (document.readyState==='loading')
        document.addEventListener('DOMContentLoaded',init);
    else
        init();

})();
