// ==UserScript==
// @name         SageMaker Smart-Play
// @namespace    http://tampermonkey.net/
// @version      10.2
// @description  Smart-Play with autoplay + spacebar + footer alignment + auto-update.
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

    /* ================== CONFIG ================== */
    const STATE_KEY = 'smk_autoPlayEnabled';
    const MSG = '__SMK_AP_SWITCH__';
    const BTN_ID = 'smk-auto-play-toggle';
    const VERSION = '10.12';
    const SENDER = `${Date.now()}-${Math.floor(Math.random()*1e9)}`;
    const MUTATION_DEBOUNCE_MS = 200;
    const RETRY_TIMEOUT_MS = 1000;
    const RETRY_ATTEMPTS = 10;

    /* ================ CLEAN OLD NODES ================ */
    function cleanOld() {
        ['smk-toggle','sm-utilization','sm-progress-bar','sm-log-btn']
            .forEach(id=> document.querySelectorAll(`#${id}`).forEach(el=>el.remove()));

        document.querySelectorAll('.smk-left-wrapper').forEach(el=>el.remove());
    }

    /* ================ STATE ================ */
    const readPersisted = () => localStorage.getItem(STATE_KEY) !== 'false';
    const writePersisted = v => localStorage.setItem(STATE_KEY, v ? 'true' : 'false');

    if (typeof window.__SMK_AP_ON === 'undefined')
        window.__SMK_AP_ON = readPersisted();

    /* ================ CROSS-FRAME SYNC ================ */
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

    /* ================ VIDEO DEEP SCANNER ================ */
    function findVideosDeep(root=document,out=[],seen=new WeakSet()){
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

    const isVisible = v => {
        try{
            const r = v.getBoundingClientRect();
            return r.width>30 && r.height>30 && r.bottom>0 && r.right>0;
        }catch{ return false; }
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

    /* ================ AUTOPLAY ENGINE ================ */
    let retryTimer=null;
    let retryLeft=0;

    function clearRetry(){ if(retryTimer) clearTimeout(retryTimer); retryTimer=null; }

    function stopAll() {
        clearRetry();
        retryLeft=0;
        findVideosDeep().forEach(v=>{ try{ v.pause(); }catch{} });
    }

    async function attemptPlayOnce(){
        if (!readPersisted()) return { ok:false };
        const vids=findVideosDeep();
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

    function autoPlayIfOn(){ if (readPersisted()) tryPlayLoop(); }

    /* ================ UNMUTE ON FIRST USER CLICK ================ */
    ['click','keydown','mousedown','touchstart'].forEach(evt=>{
        window.addEventListener(evt,()=>{
            const vids=findVideosDeep();
            vids.forEach(v=>{
                if(v.muted && !v.paused){
                    try{ v.muted=false; v.play().catch(()=>{}); }catch{}
                }
            });
        },{ once:true, capture:true });
    });

    /* ================ FOOTER TOGGLE ================ */
    function getFooter(){
        const p=document.querySelector("p.awsui-util-p-n.awsui-util-t-c.awsui-util-status-info");
        return p ? p.parentElement : null;
    }

    function insertToggle(){
        if (document.getElementById(BTN_ID)) return true;

        const footer=getFooter();
        if (!footer) return false;

        if (window.getComputedStyle(footer).position === 'static')
            footer.style.position='relative';

        const box=document.createElement('div');
        box.id=BTN_ID;
        box.style.position='absolute';
        box.style.right='12px';
        box.style.top='50%';
        box.style.transform='translateY(-50%)';
        box.style.display='flex';
        box.style.alignItems='center';
        box.style.gap='6px';
        box.style.fontFamily='sans-serif';
        box.style.fontSize='12px';
        box.style.cursor='pointer';
        box.style.zIndex=99999;

        const on=readPersisted();

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
        };

        box.addEventListener('click',()=>{
            const next=!readPersisted();
            writePersisted(next);
            window.__SMK_AP_ON=next;
            render(next);
            if(!next) stopAll();
            else autoPlayIfOn();
            postState(next);
        });

        return true;
    }

    /* ================ SPACEBAR SMART MODE ================ */
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

        if (typing) return;  // don't hijack space in text fields

        e.preventDefault();
        e.stopPropagation();

        const vids = findVideosDeep();
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

    /* ================ MUTATION OBSERVER ================ */
    let debounce=null;
    const mo=new MutationObserver(()=>{
        if(debounce) return;
        debounce=setTimeout(()=>{
            debounce=null;
            insertToggle();
            if (readPersisted()) autoPlayIfOn();
        },MUTATION_DEBOUNCE_MS);
    });

    /* ================ INIT ================ */
    function init(){
        cleanOld();
        insertToggle();
        if (readPersisted()) autoPlayIfOn();
        try{ mo.observe(document,{childList:true,subtree:true}); }catch(_){}
    }

    if (document.readyState==='loading')
        document.addEventListener('DOMContentLoaded',init);
    else
        init();

})();
