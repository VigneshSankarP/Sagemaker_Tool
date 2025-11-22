// ==UserScript==
// @name        SM - Core Engine (Original v1.7)
// @namespace   sm-utilization
// @version     1.0-original-v1.7
// @description Core engine extracted from your v1.7 upload — timer, counter, parsing, daily reset, submission interception, sessions, history. (Source: uploaded v1.7). Exposes window.SM_API for UIs.
// @match       *://*.sagemaker.aws/*
// @match       *://*.amazonaws.com/*
// @match       *://*.console.aws.amazon.com/*
// @grant       none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__SM_TIMER_RUNNING__) return;
  window.__SM_TIMER_RUNNING__ = true;

  // ============================================================================
  // CONFIG
  // ============================================================================
  const CONFIG = {
    CHECK_INTERVAL_MS: 500,
    DAILY_ALERT_HOURS: 8,
    MAX_HISTORY_DAYS: 30,
    DEBUG: false,
    SESSIONS_LIMIT: 2000,
  };

  function log(...args) { if (CONFIG.DEBUG) console.log("[SM]", ...args); }

  // ============================================================================
  // KEYS
  // ============================================================================
  const KEYS = {
    DAILY_COMMITTED: "sm_daily_committed",
    LAST_DATE: "sm_last_date",
    HISTORY: "sm_history",
    COUNT: "sm_count",
    LAST_RESET: "sm_last_reset",
    IGNORE_TASK: "sm_ignore_task",
    SESSIONS: "sm_sessions",
    LAST_MIDNIGHT_CHECK: "sm_last_midnight_check"
  };

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { log("store err", e); }
  }
  function retrieve(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function setIgnoreTask(taskId) {
    try { if (taskId == null) sessionStorage.removeItem(KEYS.IGNORE_TASK); else sessionStorage.setItem(KEYS.IGNORE_TASK, taskId); } catch (e) { log(e); }
  }
  function getIgnoreTask() { try { return sessionStorage.getItem(KEYS.IGNORE_TASK); } catch (e) { return null; } }

  // ============================================================================
  // FORMATTING
  // ============================================================================
  const todayStr = () => new Date().toISOString().split("T")[0];
  function fmt(seconds) {
    seconds = Math.max(0, Math.floor(+seconds || 0));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
  }

  // ============================================================================
  // TASK PAGE DETECTION
  // ============================================================================
  function isTaskPage() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (url.includes('/task') ||
        url.includes('/labeling') ||
        url.includes('/annotation') ||
        path.includes('/task') ||
        path.includes('/labeling')) {
      return true;
    }

    const awsTimer = parseAWSTimer();
    if (awsTimer) {
      return true;
    }

    const bodyText = (document.body.innerText || "").toLowerCase();
    if (bodyText.includes("task time") &&
        (bodyText.includes("submit") || bodyText.includes("complete"))) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // COMPATIBILITY SHIELD
  // ============================================================================
  (function Shield() {
    window.__SM_DOM_EVENTS__ = window.__SM_DOM_EVENTS__ || [];
    function pushDom() {
      const now = performance.now();
      window.__SM_DOM_EVENTS__.push(now);
      window.__SM_DOM_EVENTS__ = window.__SM_DOM_EVENTS__.filter(t => now - t < 1000);
      return window.__SM_DOM_EVENTS__.length;
    }
    window.__SM_SHIELD = {
      pushDom,
      isLikelyVideoNoise() {
        const vids = document.querySelectorAll ? document.querySelectorAll("video").length : 0;
        const evs = window.__SM_DOM_EVENTS__.length;
        return (vids > 0 && evs > 25) || evs > 60;
      },
      containsAWSTimerKeywords(text) {
        if (!text) return false;
        const t = text.toLowerCase();
        return t.includes("task") && (t.includes("time") || t.includes("min") || t.includes("sec") || t.includes("duration"));
      }
    };
    log("Shield active");
  })();

  // ============================================================================
  // AWS TIMER PARSING
  // ============================================================================
  function parseAWSTimer() {
    try {
      const bodyText = document.body.innerText || document.body.textContent || "";
      const cleanText = bodyText.replace(/\s+/g, " ").trim();
      if (!window.__SM_SHIELD.containsAWSTimerKeywords(cleanText)) return null;

      let m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+of\s+(\d+)\s*Min\s+(\d+)\s*Sec/i);
      if (m) return { current: (+m[1])*60 + (+m[2]), limit: (+m[3])*60 + (+m[4]), remaining: (+m[3])*60 + (+m[4]) - ((+m[1])*60 + (+m[2])) };

      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+(?:of|\/)\s+(\d+):(\d+)/i);
      if (m) return { current: (+m[1])*60 + (+m[2]), limit: (+m[3])*60 + (+m[4]), remaining: (+m[3])*60 + (+m[4]) - ((+m[1])*60 + (+m[2])) };

      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)/i);
      if (m) return { current: (+m[1])*60 + (+m[2]), limit: 3600, remaining: 3600 - ((+m[1])*60 + (+m[2])) };

      m = cleanText.match(/(?:Time|Timer|Duration)[:\s]+(\d+):(\d+)/i);
      if (m) return { current: (+m[1])*60 + (+m[2]), limit: 3600, remaining: 3600 - ((+m[1])*60 + (+m[2])) };

      return null;
    } catch (e) { log("parseAWSTimer err", e); return null; }
  }

  function hasTaskExpiredOnPage() {
    try {
      const t = (document.body.innerText || "").toLowerCase();
      if (!t) return false;
      return (t.includes("task has expired") || t.includes("task expired") || t.includes("time is up") || t.includes("time limit") || t.includes("session expired"));
    } catch (e) { return false; }
  }

  // ============================================================================
  // IN-MEMORY ACTIVE TASK
  // ============================================================================
  let activeTask = null;
  function getTaskIdFromUrl() { return window.location.pathname + window.location.search; }

  function startNewTaskFromAWS(awsData) {
    const id = getTaskIdFromUrl();
    activeTask = { id, awsCurrent: awsData.current, awsLimit: awsData.limit, lastAws: awsData.current, status: "active", createdAt: Date.now() };
    log("New task", id, fmt(activeTask.awsCurrent));
    return activeTask;
  }

  function updateActiveTaskFromAWS(awsData) {
    if (!activeTask) return startNewTaskFromAWS(awsData);
    const id = getTaskIdFromUrl();
    if (activeTask.id !== id) { activeTask = null; return startNewTaskFromAWS(awsData); }
    if (typeof awsData.current === "number") {
      if (awsData.current === activeTask.lastAws) activeTask.status = "paused";
      else if (awsData.current > activeTask.lastAws) activeTask.status = "active";
      activeTask.awsCurrent = awsData.current;
      activeTask.awsLimit = awsData.limit;
      activeTask.lastAws = awsData.current;
    }
    return activeTask;
  }

  // ============================================================================
  // SESSIONS STORAGE
  // ============================================================================
  function pushSessionRecord(rec) {
    try {
      const sessions = retrieve(KEYS.SESSIONS, []) || [];
      sessions.unshift(rec);
      if (sessions.length > CONFIG.SESSIONS_LIMIT) sessions.length = CONFIG.SESSIONS_LIMIT;
      store(KEYS.SESSIONS, sessions);
    } catch (e) { log("pushSession err", e); }
  }

  // ============================================================================
  // DAILY RESET & HISTORY
  // ============================================================================
  function checkDailyReset() {
    const currentDate = todayStr();
    const lastDate = retrieve(KEYS.LAST_DATE);
    if (lastDate !== currentDate) {
      log("New day detected - resetting");
      const previousTotal = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;

      if (previousTotal > 0 && lastDate) {
        saveToHistory(lastDate, previousTotal);
      }

      performReset("both", "auto");
      return 0;
    }
    return retrieve(KEYS.DAILY_COMMITTED, 0);
  }

  function saveToHistory(dateStr, totalSeconds) {
    const history = retrieve(KEYS.HISTORY, {}) || {};
    history[dateStr] = totalSeconds;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - CONFIG.MAX_HISTORY_DAYS);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    for (const d in history) if (d < cutoffStr) delete history[d];
    store(KEYS.HISTORY, history);
  }

  function checkDailyAlert(totalSeconds) {
    if (!CONFIG.DAILY_ALERT_HOURS || CONFIG.DAILY_ALERT_HOURS <= 0) return;
    const threshold = CONFIG.DAILY_ALERT_HOURS * 3600;
    const key = `sm_alert_${todayStr()}`;
    if (totalSeconds >= threshold && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      try { alert(`🎉 You've reached ${CONFIG.DAILY_ALERT_HOURS} hours today!`); } catch (e) {}
    }
  }

  // ============================================================================
  // RESET FUNCTION (Selective reset options) - FIXED
  // ============================================================================
  function performReset(resetType = "both", source = "manual") {
    const currentDate = todayStr();
    const previousTimer = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const previousCount = retrieve(KEYS.COUNT, 0) || 0;

    // Save previous day's data to history if it's a new day
    if (source === "auto" || source === "midnight") {
      const lastDate = retrieve(KEYS.LAST_DATE);
      if (previousTimer > 0 && lastDate && lastDate !== currentDate) {
        saveToHistory(lastDate, previousTimer);
      }
    }

    let resetMessage = "";

    // Reset based on type
    switch(resetType) {
      case "timer":
        store(KEYS.DAILY_COMMITTED, 0);
        resetMessage = `Timer reset: ${fmt(previousTimer)} → 00:00:00`;
        log(`🔄 Timer reset. Previous: ${fmt(previousTimer)}`);
        break;

      case "counter":
        store(KEYS.COUNT, 0);
        resetMessage = `Counter reset: ${previousCount} → 0`;
        log(`🔄 Counter reset. Previous: ${previousCount}`);
        break;

      case "both":
      default:
        store(KEYS.DAILY_COMMITTED, 0);
        store(KEYS.COUNT, 0);
        resetMessage = `Both reset: ${fmt(previousTimer)} & ${previousCount} → 00:00:00 & 0`;
        log(`🔄 Both reset. Timer: ${fmt(previousTimer)}, Counter: ${previousCount}`);
        break;
    }

    // Update date and reset time
    store(KEYS.LAST_DATE, currentDate);
    store(KEYS.LAST_RESET, new Date().toISOString());

    // For full reset or auto reset, also clear ignore and discard active task
    if (resetType === "both" || source === "auto" || source === "midnight") {
      setIgnoreTask(null);

      if (activeTask) {
        pushSessionRecord({
          id: activeTask.id,
          date: new Date().toISOString(),
          duration: activeTask.awsCurrent || 0,
          action: source === "manual" ? `manual_reset_${resetType}` : "midnight_reset"
        });
        activeTask = null;
        log(`Active task discarded due to ${source} reset`);
      }
    }

    // Update UI
    updateDisplay();
    const root = document.getElementById("sm-dashboard-root");
    if (root && root.style.display === "flex") updateDashboard();

    // Show notification for manual resets
    if (source === "manual") {
      showResetNotification(resetMessage);
    }

    return true;
  }

  function showResetNotification(message) {
    const notif = document.createElement("div");
    notif.innerHTML = `<div style="font-weight:700; margin-bottom:4px;">✅ Reset Successful!</div><div style="font-size:12px; opacity:0.9;">${message}</div>`;
    Object.assign(notif.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      background: "#10b981",
      color: "#fff",
      padding: "14px 20px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: "999999",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      minWidth: "280px"
    });
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  }

  // ============================================================================
  // RESET DIALOG
  // ============================================================================
  function showResetDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById("sm-reset-dialog");
    if (existing) existing.remove();

    const dialog = document.createElement("div");
    dialog.id = "sm-reset-dialog";
    dialog.innerHTML = `
      <style>
        #sm-reset-dialog { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 150000; }
        #sm-reset-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
        #sm-reset-modal { position: relative; width: 480px; max-width: calc(100% - 32px); background: #fff; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
        #sm-reset-modal .header { padding: 20px 24px; background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff; }
        #sm-reset-modal h3 { margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        #sm-reset-modal .body { padding: 24px; }
        #sm-reset-modal .info { background: #fef3c7; border: 1px solid #fbbf24; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #92400e; }
        #sm-reset-modal .current-values { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
        #sm-reset-modal .current-values .value { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        #sm-reset-modal .current-values .value:last-child { border-bottom: none; }
        #sm-reset-modal .current-values .label { color: #6b7280; font-size: 13px; }
        #sm-reset-modal .current-values .num { font-weight: 700; font-size: 16px; color: #111827; }
        #sm-reset-modal .options { display: flex; flex-direction: column; gap: 12px; }
        #sm-reset-modal .option-btn { padding: 16px 20px; border: 2px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; gap: 12px; }
        #sm-reset-modal .option-btn:hover { border-color: #dc2626; background: #fef2f2; }
        #sm-reset-modal .option-btn .icon { font-size: 24px; }
        #sm-reset-modal .option-btn .text { flex: 1; }
        #sm-reset-modal .option-btn .title { font-weight: 700; color: #111827; margin-bottom: 4px; }
        #sm-reset-modal .option-btn .desc { font-size: 12px; color: #6b7280; }
        #sm-reset-modal .footer { padding: 16px 24px; background: #f9fafb; display: flex; justify-content: flex-end; gap: 8px; }
        #sm-reset-modal .cancel-btn { padding: 10px 20px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer; font-size: 14px; color: #374151; }
        #sm-reset-modal .cancel-btn:hover { background: #f3f4f6; }
      </style>

      <div id="sm-reset-backdrop"></div>
      <div id="sm-reset-modal">
        <div class="header">
          <h3>🔄 Reset Options</h3>
        </div>
        <div class="body">
          <div class="info">
            ⚠️ <strong>Warning:</strong> This action cannot be undone. Choose what you want to reset.
          </div>

          <div class="current-values">
            <div class="value">
              <span class="label">Current Timer:</span>
              <span class="num" id="reset-current-timer">${fmt(retrieve(KEYS.DAILY_COMMITTED, 0) || 0)}</span>
            </div>
            <div class="value">
              <span class="label">Current Counter:</span>
              <span class="num" id="reset-current-counter">${retrieve(KEYS.COUNT, 0) || 0}</span>
            </div>
          </div>

          <div class="options">
            <button class="option-btn" data-reset="timer">
              <div class="icon">⏱️</div>
              <div class="text">
                <div class="title">Reset Timer Only</div>
                <div class="desc">Resets utilization time to 00:00:00 (keeps counter)</div>
              </div>
            </button>

            <button class="option-btn" data-reset="counter">
              <div class="icon">🔢</div>
              <div class="text">
                <div class="title">Reset Counter Only</div>
                <div class="desc">Resets submission count to 0 (keeps timer)</div>
              </div>
            </button>

            <button class="option-btn" data-reset="both">
              <div class="icon">🔄</div>
              <div class="text">
                <div class="title">Reset Both (Timer + Counter)</div>
                <div class="desc">Resets everything: 00:00:00 & 0</div>
              </div>
            </button>
          </div>
        </div>
        <div class="footer">
          <button class="cancel-btn" id="reset-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Event handlers
    dialog.querySelector("#sm-reset-backdrop").addEventListener("click", () => dialog.remove());
    dialog.querySelector("#reset-cancel").addEventListener("click", () => dialog.remove());

    dialog.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const resetType = btn.dataset.reset;
        dialog.remove();
        performReset(resetType, "manual");
      });
    });
  }

  // ============================================================================
  // MIDNIGHT RESET SCHEDULER
  // ============================================================================
  function getMsUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  function scheduleMidnightReset() {
    const msUntilMidnight = getMsUntilMidnight();

    setTimeout(() => {
      log("🕛 Scheduled midnight reset triggered");
      performReset("both", "midnight");
      store(KEYS.LAST_MIDNIGHT_CHECK, new Date().toISOString());
      scheduleMidnightReset();
    }, msUntilMidnight);

    const hours = Math.floor(msUntilMidnight / 3600000);
    const minutes = Math.floor((msUntilMidnight % 3600000) / 60000);
    log(`⏰ Midnight reset scheduled in ${hours}h ${minutes}m`);
  }

  function backupMidnightCheck() {
    const currentDate = todayStr();
    const lastDate = retrieve(KEYS.LAST_DATE);
    const lastMidnightCheck = retrieve(KEYS.LAST_MIDNIGHT_CHECK);

    if (lastDate && lastDate !== currentDate) {
      const today = new Date(currentDate);
      const lastCheck = lastMidnightCheck ? new Date(lastMidnightCheck) : null;

      if (!lastCheck || lastCheck < today) {
        log("🔔 Backup midnight check triggered reset");
        performReset("both", "midnight");
        store(KEYS.LAST_MIDNIGHT_CHECK, new Date().toISOString());
      }
    }
  }

  setInterval(backupMidnightCheck, 60000);

  // ============================================================================
  // COMMIT & DISCARD
  // ============================================================================
  function commitActiveTask() {
    if (!activeTask) { log("No active to commit"); return 0; }
    const finalElapsed = activeTask.awsCurrent || 0;
    if (finalElapsed <= 0) { activeTask = null; return 0; }
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const newTotal = committed + finalElapsed;
    store(KEYS.DAILY_COMMITTED, newTotal);
    saveToHistory(todayStr(), newTotal);
    checkDailyAlert(newTotal);

    // FIXED: Always read count from storage, not cached variable
    const c = (retrieve(KEYS.COUNT, 0) || 0) + 1;
    store(KEYS.COUNT, c);

    pushSessionRecord({
      id: activeTask.id,
      date: new Date().toISOString(),
      duration: finalElapsed,
      action: "submitted"
    });

    log(`Committed ${fmt(finalElapsed)} → total ${fmt(newTotal)} (count ${c})`);
    const id = activeTask.id;
    activeTask = null;
    if (getIgnoreTask() === id) setIgnoreTask(null);
    return finalElapsed;
  }

  function discardActiveTask(reason) {
    if (!activeTask) return;
    const rec = { id: activeTask.id, date: new Date().toISOString(), duration: activeTask.awsCurrent || 0, action: reason || "discarded" };
    pushSessionRecord(rec);
    log("Discarded", rec);
    const id = activeTask.id;
    activeTask = null;
    try { setIgnoreTask(id); } catch (e) { log("ignore set err", e); }
  }

  // ============================================================================
  // SUBMISSION INTERCEPTION - FIXED
  // ============================================================================
  function initSubmissionInterceptor() {
    // REMOVED: let count = retrieve(KEYS.COUNT, 0) || 0;
    // Now we always read from storage to get the latest value

    if (typeof window.fetch === "function") {
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const method = args[1]?.method || "GET";
        return origFetch.apply(this, args).then(response => {
          try {
            if (method.toUpperCase() === "POST" && response.ok && /submit|complete|finish/i.test(url)) {
              log("Detected submission via fetch");
              commitActiveTask();
              // Count is now updated in commitActiveTask()
              updateDisplay();
            }
          } catch (e) { log(e); }
          return response;
        });
      };
    }

    if (typeof XMLHttpRequest !== "undefined") {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      const meta = new WeakMap();

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        meta.set(this, { method, url });
        return origOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener("loadend", function () {
          try {
            const info = meta.get(this);
            if (info && info.method.toUpperCase() === "POST" && this.status >= 200 && this.status < 300 && /submit|complete|finish/i.test(info.url)) {
              log("Detected submission via XHR");
              commitActiveTask();
              // Count is now updated in commitActiveTask()
              updateDisplay();
            }
          } catch (e) { log(e); }
        });
        return origSend.call(this, body);
      };
    }
  }

  // ============================================================================
  // TRACKING LOOP
  // ============================================================================
  let lastAWSData = null;
  let lastTaskIdSeen = null;

  function trackOnce() {
    window.__SM_SHIELD.pushDom();
    checkDailyReset();

    if (isTaskPage()) {
      // display variable (UI) is referenced later by UI code; core keeps logic to show/hide
      try { if (typeof display !== 'undefined' && display) display.style.display = 'flex'; } catch(e){}
    } else {
      try { if (typeof display !== 'undefined' && display) display.style.display = 'none'; } catch(e){}
      return;
    }

    if (hasTaskExpiredOnPage()) {
      if (activeTask) discardActiveTask("expired");
      else setIgnoreTask(getTaskIdFromUrl());
      lastAWSData = null;
      lastTaskIdSeen = null;
      updateDisplay();
      return;
    }

    const awsData = parseAWSTimer();
    if (window.__SM_SHIELD.isLikelyVideoNoise() && !awsData) { log("Noise skip"); return; }

    const currentTaskId = getTaskIdFromUrl();
    const ignoreId = getIgnoreTask();
    if (ignoreId && ignoreId === currentTaskId) {
      if (lastAWSData && awsData && awsData.current < lastAWSData.current) { setIgnoreTask(null); log("Clear ignore on reset"); }
      else { lastAWSData = awsData || lastAWSData; return; }
    }

    if (!awsData) { lastAWSData = null; return; }

    if (!activeTask || activeTask.id !== currentTaskId) startNewTaskFromAWS(awsData);
    else updateActiveTaskFromAWS(awsData);

    if (typeof awsData.limit === "number" && awsData.current >= awsData.limit) {
      discardActiveTask("expired");
    }

    lastAWSData = awsData;
    lastTaskIdSeen = currentTaskId;
    updateDisplay();
  }

  // ============================================================================
  // Expose SM_API for UIs (safe, minimal wrapper)
  // ============================================================================
  if (!window.SM_API) {
    window.SM_API = {
      getData() {
        return {
          committed: retrieve(KEYS.DAILY_COMMITTED, 0) || 0,
          count: retrieve(KEYS.COUNT, 0) || 0,
          sessions: retrieve(KEYS.SESSIONS, []) || [],
          history: retrieve(KEYS.HISTORY, {}) || {},
          running: !!(activeTask && activeTask.status === "active"),
          pending: activeTask ? (activeTask.awsCurrent || 0) : 0
        };
      },
      reset(type = 'both') { return performReset(type, 'manual'); },
      commitActiveTask() { return commitActiveTask(); },
      discardActiveTask(reason) { return discardActiveTask(reason); },
      onUpdate(fn) { if (typeof fn === 'function') window.addEventListener('sm_core_update', fn); },
      _internal_getActiveTask() { return activeTask; }
    };
  }

  // ============================================================================
  // INIT
  // ============================================================================
  log("Init");
  checkDailyReset();
  scheduleMidnightReset();
  initSubmissionInterceptor();
  try { if (typeof attachToFooter === 'function') attachToFooter(); } catch(e){}
  updateDisplay();
  setInterval(trackOnce, CONFIG.CHECK_INTERVAL_MS);

  window.addEventListener("keydown", (e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "u") showDashboard(); });

  log("Ready - Core engine (from v1.7) loaded");

})();
