// ==UserScript==
// @name         SM Core Engine
// @namespace    sm-utilization
// @version      1.0
// @description  Core engine: timer, counter, AWS parser, daily reset, storage, submit detection
// ==/UserScript==

(function () {
    'use strict';

    if (window.SM_API) return; // prevent double-loading

    // --- Storage Keys ---
    const KEYS = {
        DAILY_COMMITTED: "sm_daily_committed",
        LAST_DATE: "sm_last_date",
        COUNT: "sm_count",
        SESSIONS: "sm_sessions",
        HISTORY: "sm_history"
    };

    // --- Helpers ---
    function store(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    function load(k, fb = null) {
        try { return JSON.parse(localStorage.getItem(k)) ?? fb; }
        catch { return fb; }
    }
    function today() { return new Date().toISOString().slice(0, 10); }

    // --- Timer State ---
    let activeTask = null;

    function parseAWS() {
        const t = document.body.innerText;
        const m = t.match(/Task time.*?(\\d+):(\\d+)/i);
        if (!m) return null;
        return { current: (+m[1]) * 60 + (+m[2]) };
    }

    function tick() {
        const aws = parseAWS();
        if (!aws) return;

        if (!activeTask) {
            activeTask = { last: aws.current };
            return;
        }
        if (aws.current > activeTask.last) {
            activeTask.last = aws.current;
        }
    }

    // --- Commit Logic ---
    function commit() {
        if (!activeTask) return;

        const sec = activeTask.last || 0;
        const old = load(KEYS.DAILY_COMMITTED, 0);
        const count = load(KEYS.COUNT, 0);

        store(KEYS.DAILY_COMMITTED, old + sec);
        store(KEYS.COUNT, count + 1);

        activeTask = null;
        window.dispatchEvent(new CustomEvent("SM_UPDATE"));
    }

    // --- Reset Daily ---
    function checkDayChange() {
        const d = today();
        const last = load(KEYS.LAST_DATE);
        if (d !== last) {
            store(KEYS.DAILY_COMMITTED, 0);
            store(KEYS.COUNT, 0);
            store(KEYS.LAST_DATE, d);
            window.dispatchEvent(new CustomEvent("SM_UPDATE"));
        }
    }

    setInterval(tick, 800);
    setInterval(checkDayChange, 30000);

    // --- Submit Intercept ---
    const oldFetch = window.fetch;
    window.fetch = function (...args) {
        return oldFetch.apply(this, args).then(res => {
            try {
                if (/submit|complete/i.test(args[0])) commit();
            } catch { }
            return res;
        });
    };

    // --- API Exposed ---
    window.SM_API = {
        getData() {
            return {
                totalCommitted: load(KEYS.DAILY_COMMITTED, 0),
                count: load(KEYS.COUNT, 0)
            };
        }
    };

    window.dispatchEvent(new CustomEvent("SM_UPDATE")); // initial

})();
