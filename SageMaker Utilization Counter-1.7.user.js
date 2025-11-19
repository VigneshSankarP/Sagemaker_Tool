// ==UserScript==
// @name         SageMaker Utilization Counter
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  AWS-accurate + Midnight Reset + Dashboard Reset Only - PVSANKAR
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @grant        none
// @updateURL   https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/main/SageMaker%20Utilization%20Counter-1.7.user.js
// @downloadURL https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/main/SageMaker%20Utilization%20Counter-1.7.user.js
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
      display.style.display = "flex";
    } else {
      display.style.display = "none";
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
  // UI: Footer + Dashboard Modal
  // ============================================================================
  const FOOTER_SELECTORS = ".cswui-footer, .awsui-footer, #footer-root, .awsui-util-pv-xs.cswui-footer";
  const display = document.createElement("div");
  display.id = "sm-utilization";
  Object.assign(display.style, {
    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
    color: "inherit", fontSize: "inherit", fontFamily: "inherit", opacity: "0.92",
    pointerEvents: "auto", userSelect: "none", whiteSpace: "nowrap", display: "none",
    alignItems: "center", gap: "8px", zIndex: 9999
  });

  const utilText = document.createTextNode("Utilization: 00:00:00");
  display.appendChild(utilText);
  const countLabel = document.createElement("span");
  countLabel.textContent = " | Count: 0";
  display.appendChild(countLabel);

  function createDashboardModal() {
    if (document.getElementById("sm-dashboard-root")) return document.getElementById("sm-dashboard-root");
    const root = document.createElement("div"); root.id = "sm-dashboard-root";
    root.innerHTML = `
      <style>
        #sm-dashboard-root { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 120000; }
        #sm-db-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
        #sm-db { position: relative; width: 980px; max-width: calc(100% - 48px); max-height: calc(100% - 80px); background: #ffffff; border-radius: 8px; box-shadow: 0 12px 40px rgba(11,18,32,0.6); overflow: hidden; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#0b1220; }
        #sm-db .header { padding:16px 18px; border-bottom: 1px solid #eef2f6; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        #sm-db h2 { margin:0; font-size:18px; font-weight:600; }
        #sm-db .body { display:flex; gap:16px; padding:14px; height:520px; box-sizing:border-box; }
        #sm-left { width: 420px; display:flex; flex-direction:column; gap:12px; }
        #sm-right { flex:1; display:flex; flex-direction:column; gap:12px; }
        .card { background:#f7fbff; border-radius:8px; padding:12px; box-shadow: 0 1px 0 rgba(11,18,32,0.03); }
        .card .big { font-size:20px; font-weight:700; }
        .row-cards { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
        .tabs { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
        .tab { padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; color:#385a8a; background:transparent; border:1px solid transparent; }
        .tab.active { background:#eaf3ff; border-color:#d1e9ff; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.02); }
        #sm-charts { flex:1; background:linear-gradient(180deg,#ffffff,#fbfdff); border-radius:6px; padding:12px; overflow:auto; }
        #sm-sessions { flex:1; overflow:auto; background:#fff; border-radius:6px; padding:8px; }
        table.sm-table { width:100%; border-collapse:collapse; font-size:13px; }
        table.sm-table th, table.sm-table td { padding:8px 6px; border-bottom:1px solid #eef2f6; text-align:left; }
        .actions { display:flex; gap:8px; }
        .btn { background:#2b6aa3; color:#fff; padding:6px 10px; border-radius:6px; border:none; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#fff; color:#2b6aa3; border:1px solid #cfe0ff; }
        .btn.danger { background:#dc2626; color:#fff; border:1px solid #b91c1c; }
        .btn.danger:hover { background:#b91c1c; }
        .small-muted { color:#6b7a90; font-size:12px; }
        #sm-footer { padding:12px 16px; border-top:1px solid #eef2f6; display:flex; justify-content:flex-end; gap:8px; background:#fff; }
        #sm-db-close { cursor:pointer; font-size:18px; color:#385a8a; border:none; background:transparent; }
        @media (max-width: 1000px) {
          #sm-db { width: calc(100% - 32px); max-height: calc(100% - 40px); }
          #sm-left { width: 380px; }
        }
      </style>

      <div id="sm-db-backdrop"></div>
      <div id="sm-db" role="dialog" aria-modal="true">
        <div class="header">
          <div style="display:flex; gap:12px; align-items:center;">
            <h2>SageMaker Utilization — Dashboard</h2>
            <div class="small-muted">⏰ Auto-reset at midnight</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button id="sm-db-close" title="Close">✕</button>
          </div>
        </div>
        <div class="body">
          <div id="sm-left">
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div class="small-muted">Today</div>
                  <div class="big" id="db-today-time">00:00:00</div>
                  <div class="small-muted">Submissions: <span id="db-today-count">0</span></div>
                </div>
                <div style="text-align:right">
                  <div class="small-muted">Daily target</div>
                  <div class="big">${CONFIG.DAILY_ALERT_HOURS}h</div>
                </div>
              </div>
            </div>

            <div class="row-cards">
              <div class="card">
                <div class="small-muted">Avg time / task</div>
                <div id="db-avg-task" class="big">00:00</div>
              </div>
              <div class="card">
                <div class="small-muted">This week's total</div>
                <div id="db-week-total" class="big">00:00:00</div>
              </div>
            </div>

            <div class="card" style="flex:1; min-height:200px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="small-muted">Recent sessions</div>
                <div class="small-muted">Showing latest 10</div>
              </div>
              <div id="db-recent" style="margin-top:8px; max-height:120px; overflow:auto;"></div>
            </div>
          </div>

          <div id="sm-right">
            <div style="display:flex; gap:8px; align-items:center;">
              <div class="tabs" id="db-tabs">
                <div class="tab active" data-tab="overview">Overview</div>
                <div class="tab" data-tab="charts">Charts</div>
                <div class="tab" data-tab="tasks">Task Log</div>
                <div class="tab" data-tab="export">Export</div>
                <div class="tab" data-tab="settings">Settings</div>
              </div>
              <div style="flex:1"></div>
              <div class="actions">
                <button class="btn danger" id="db-manual-reset" title="Reset options">🔄 Reset</button>
                <button class="btn" id="db-export-json">Export JSON</button>
                <button class="btn ghost" id="db-clear-sessions">Clear</button>
              </div>
            </div>

            <div id="db-content" style="flex:1; display:flex; flex-direction:column; gap:8px;">
              <div id="db-overview" class="card" style="display:block;">
                <div style="font-weight:600; margin-bottom:8px;">Overview</div>
                <div id="db-overview-charts" style="display:flex; gap:8px; align-items:flex-end;">
                  <div style="flex:1;">
                    <div class="small-muted">30-day utilization</div>
                    <div id="db-30chart" style="height:140px"></div>
                  </div>
                  <div style="width:220px;">
                    <div class="small-muted">30-day submissions</div>
                    <div id="db-countchart" style="height:140px"></div>
                  </div>
                </div>
              </div>

              <div id="db-charts-panel" class="card" style="display:none;">
                <div style="font-weight:600; margin-bottom:8px;">Charts</div>
                <div id="db-charts" style="height:300px; overflow:auto;"></div>
              </div>

              <div id="db-tasks-panel" class="card" style="display:none;">
                <div style="font-weight:600; margin-bottom:8px;">Task Log</div>
                <div style="max-height:320px; overflow:auto;">
                  <table class="sm-table" id="db-sessions-table"><thead><tr><th>Date</th><th>Duration</th><th>Action</th><th>Task ID</th></tr></thead><tbody></tbody></table>
                </div>
              </div>

              <div id="db-export-panel" class="card" style="display:none;">
                <div style="font-weight:600; margin-bottom:8px;">Export / Import</div>
                <div style="display:flex; gap:8px;">
                  <button class="btn" id="db-export-json2">Export JSON</button>
                  <button class="btn ghost" id="db-export-csv">Export CSV</button>
                  <button class="btn ghost" id="db-import-json">Import JSON</button>
                </div>
              </div>

              <div id="db-settings-panel" class="card" style="display:none;">
                <div style="font-weight:600; margin-bottom:8px;">Settings</div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <div style="display:flex; gap:8px; align-items:center;">
                    <label class="small-muted">Max sessions stored:</label>
                    <input id="db-max-sessions" type="number" min="100" max="10000" style="width:80px; padding:4px 8px; border:1px solid #cfe0ff; border-radius:4px;" value="${CONFIG.SESSIONS_LIMIT}">
                    <button class="btn ghost" id="db-save-settings">Save</button>
                  </div>
                  <div style="padding:12px; background:#fff3cd; border:1px solid #ffc107; border-radius:6px;">
                    <div style="font-weight:600; margin-bottom:4px;">🔄 Selective Reset</div>
                    <div class="small-muted" style="margin-bottom:8px;">Choose to reset timer only, counter only, or both</div>
                    <button class="btn danger" id="db-manual-reset-2">Open Reset Options</button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        <div id="sm-footer">
          <div class="small-muted" style="margin-right:auto">⏰ Midnight auto-reset active | 🔄 Manual reset in dashboard</div>
          <button class="btn ghost" id="db-close-2">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector("#sm-db-backdrop").addEventListener("click", hideDashboard);
    root.querySelector("#sm-db-close").addEventListener("click", hideDashboard);
    root.querySelector("#db-close-2").addEventListener("click", hideDashboard);

    root.querySelectorAll("#db-tabs .tab").forEach(t => {
      t.addEventListener("click", () => {
        root.querySelectorAll("#db-tabs .tab").forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        const tab = t.dataset.tab;
        root.querySelector("#db-overview").style.display = tab === "overview" ? "block" : "none";
        root.querySelector("#db-charts-panel").style.display = tab === "charts" ? "block" : "none";
        root.querySelector("#db-tasks-panel").style.display = tab === "tasks" ? "block" : "none";
        root.querySelector("#db-export-panel").style.display = tab === "export" ? "block" : "none";
        root.querySelector("#db-settings-panel").style.display = tab === "settings" ? "block" : "none";
        refreshDashboardPanels();
      });
    });

    root.querySelector("#db-export-json").addEventListener("click", dashboardExportJSON);
    root.querySelector("#db-export-json2").addEventListener("click", dashboardExportJSON);
    root.querySelector("#db-export-csv").addEventListener("click", dashboardExportCSV);
    root.querySelector("#db-import-json").addEventListener("click", dashboardImportJSON);
    root.querySelector("#db-manual-reset").addEventListener("click", showResetDialog);
    root.querySelector("#db-manual-reset-2").addEventListener("click", showResetDialog);
    root.querySelector("#db-clear-sessions").addEventListener("click", () => {
      if (!confirm("Clear all session summaries?")) return;
      store(KEYS.SESSIONS, []);
      updateDashboard();
    });
    root.querySelector("#db-save-settings").addEventListener("click", () => {
      const v = Math.max(100, parseInt(root.querySelector("#db-max-sessions").value || CONFIG.SESSIONS_LIMIT));
      CONFIG.SESSIONS_LIMIT = v;
      alert("Saved settings (in-memory). New limit will apply to future sessions.");
    });

    return root;
  }

  function showDashboard() { const root = createDashboardModal(); root.style.display = "flex"; updateDashboard(); }
  function hideDashboard() { const root = document.getElementById("sm-dashboard-root"); if (root) root.style.display = "none"; }

  function getSessions() { return retrieve(KEYS.SESSIONS, []) || []; }
  function updateDashboard() {
    const root = createDashboardModal();
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;
    root.querySelector("#db-today-time").textContent = fmt(committed);
    root.querySelector("#db-today-count").textContent = String(count);

    const recentContainer = root.querySelector("#db-recent");
    recentContainer.innerHTML = "";
    const sessions = getSessions();
    const recent = sessions.slice(0, 10);
    recent.forEach(s => {
      const el = document.createElement("div");
      el.style.display = "flex"; el.style.justifyContent = "space-between"; el.style.padding = "6px 4px";
      el.innerHTML = `<div style="font-size:13px">${new Date(s.date).toLocaleString()}</div><div style="font-weight:600">${fmt(s.duration)}</div><div class="small-muted">${s.action}</div>`;
      recentContainer.appendChild(el);
    });

    const submittedSessions = sessions.filter(s => s.action === "submitted");
    const avg = submittedSessions.length ? Math.round(submittedSessions.reduce((a,b)=>a+b.duration,0)/submittedSessions.length) : 0;
    root.querySelector("#db-avg-task").textContent = fmt(avg);

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-6);
    const weekTotal = sessions.filter(s => new Date(s.date) >= weekAgo && s.action === "submitted").reduce((a,b)=>a+b.duration,0);
    root.querySelector("#db-week-total").textContent = fmt(weekTotal);

    const tbody = root.querySelector("#db-sessions-table tbody");
    tbody.innerHTML = "";
    for (const s of sessions.slice(0, 200)) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td"); td1.textContent = new Date(s.date).toLocaleString();
      const td2 = document.createElement("td"); td2.textContent = fmt(s.duration);
      const td3 = document.createElement("td"); td3.textContent = s.action;
      const td4 = document.createElement("td"); td4.textContent = s.id.substring(0, 28);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
      tbody.appendChild(tr);
    }

    const history = retrieve(KEYS.HISTORY, {}) || {};
    drawMiniChart(root.querySelector("#db-30chart"), history, { days: CONFIG.MAX_HISTORY_DAYS, color:"#2b6aa3" });
    drawMiniCountChart(root.querySelector("#db-countchart"), history, { days: CONFIG.MAX_HISTORY_DAYS, color:"#7aa7d9" });
  }

  function refreshDashboardPanels() {
    const root = createDashboardModal();
    setTimeout(() => {
      updateDashboard();
    }, 80);
  }

  function drawMiniChart(container, history, opts={}) {
    if (!container) return;
    const days = opts.days || 30;
    const arr = [];
    for (let i = days-1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); const key = d.toISOString().split("T")[0];
      arr.push(history[key] || 0);
    }
    const w = container.clientWidth || 360, h = container.clientHeight || 120;
    const maxVal = Math.max(...arr, 3600);
    const barW = Math.max(2, Math.floor(w/arr.length));
    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${w}" height="${h}" fill="transparent"/>`;
    for (let i=0;i<arr.length;i++){
      const val = arr[i]; const bh = Math.round((val/maxVal)*(h-24)); const x = i*barW; const y = h-bh-12;
      const color = opts.color || "#2b6aa3";
      svg += `<rect x="${x+1}" y="${y}" width="${barW-2}" height="${bh}" fill="${color}" rx="2"></rect>`;
    }
    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function drawMiniCountChart(container, history, opts={}) {
    if (!container) return;
    const days = opts.days || 30;
    const arr = [];
    for (let i = days-1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); const key = d.toISOString().split("T")[0];
      const val = (history[key] && typeof history[key] === "number") ? 1 : 0;
      arr.push(val);
    }
    const w = container.clientWidth || 220, h = container.clientHeight || 120;
    const maxVal = Math.max(...arr, 1);
    const barW = Math.max(2, Math.floor(w/arr.length));
    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${w}" height="${h}" fill="transparent"/>`;
    for (let i=0;i<arr.length;i++){
      const val = arr[i]; const bh = Math.round((val/maxVal)*(h-24)); const x = i*barW; const y = h-bh-12;
      const color = opts.color || "#7aa7d9";
      svg += `<rect x="${x+1}" y="${y}" width="${barW-2}" height="${bh}" fill="${color}" rx="2"></rect>`;
    }
    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function dashboardExportJSON() {
    const payload = {
      history: retrieve(KEYS.HISTORY, {}),
      sessions: retrieve(KEYS.SESSIONS, []),
      daily_committed: retrieve(KEYS.DAILY_COMMITTED, 0) || 0,
      count: retrieve(KEYS.COUNT, 0) || 0,
      last_date: retrieve(KEYS.LAST_DATE, null)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sagemaker-utilization-export-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function dashboardExportCSV() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const rows = [["date","duration_seconds","action","task_id"]];
    sessions.forEach(s => rows.push([s.date, String(s.duration), s.action, s.id]));
    const csv = rows.map(r => r.map(cell=>{
      if (cell == null) return "";
      const c = String(cell).replace(/"/g,'""');
      return `"${c}"`;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sagemaker-utilization-sessions-${todayStr()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function dashboardImportJSON() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
    inp.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed.history) store(KEYS.HISTORY, parsed.history);
          if (parsed.sessions) store(KEYS.SESSIONS, parsed.sessions.slice(0, CONFIG.SESSIONS_LIMIT));
          if (typeof parsed.daily_committed === "number") store(KEYS.DAILY_COMMITTED, parsed.daily_committed);
          if (typeof parsed.count === "number") store(KEYS.COUNT, parsed.count);
          if (parsed.last_date) store(KEYS.LAST_DATE, parsed.last_date);
          updateDashboard(); updateDisplay(); alert("Import complete");
        } catch (err) { alert("Invalid JSON"); }
      };
      r.readAsText(f);
    });
    inp.click();
  }

  // ============================================================================
  // Footer attach - NO RESET BUTTON
  // ============================================================================
  function attachToFooter() {
    if (!isTaskPage()) {
      return;
    }

    const footer = document.querySelector(FOOTER_SELECTORS) || document.body.querySelector("footer") || document.body;
    if (!footer) return;
    if (getComputedStyle(footer).position === "static") footer.style.position = "relative";

    const existingUtil = document.querySelectorAll("#sm-utilization");
    if (existingUtil.length > 1) {
      for (let i = 1; i < existingUtil.length; i++) existingUtil[i].remove();
    }

    if (!footer.contains(display)) footer.appendChild(display);

    const existingBtn = display.querySelector("#sm-log-btn");

    if (!existingBtn) {
      const btn = document.createElement("button");
      btn.id = "sm-log-btn"; btn.type = "button"; btn.title = "Open utilization dashboard";
      btn.innerHTML = "📊 Log";
      Object.assign(btn.style, {
        marginLeft: "8px", padding: "6px 10px", borderRadius: "6px", background: "#ffffff",
        color: "#0b1220", border: "1px solid #cfcfcf", boxShadow: "none", cursor: "pointer", fontSize: "13px",
      });
      btn.addEventListener("mouseenter", () => btn.style.background = "#f5f7fb");
      btn.addEventListener("mouseleave", () => btn.style.background = "#ffffff");
      btn.addEventListener("click", showDashboard);
      display.appendChild(btn);
    }

    // REMOVED: Reset button from footer
  }

  let footerTimer = null;
  function debouncedAttachFooter() { clearTimeout(footerTimer); footerTimer = setTimeout(attachToFooter, 120); }
  new MutationObserver(debouncedAttachFooter).observe(document.body, { childList: true, subtree: true });

  // ============================================================================
  // UPDATE DISPLAY
  // ============================================================================
  function updateDisplay() {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    let pending = 0;
    if (activeTask && activeTask.status === "active") pending = activeTask.awsCurrent || 0;
    else if (activeTask && activeTask.status === "paused") pending = activeTask.awsCurrent || 0;
    const total = (committed || 0) + (pending || 0);
    utilText.nodeValue = `Utilization: ${fmt(total)}`;
    countLabel.textContent = ` | Count: ${retrieve(KEYS.COUNT, 0) || 0}`;
  }

  // ============================================================================
  // BUTTON WIRING
  // ============================================================================
  function wireTaskActionButtons() {
    const selector = 'button, [role="button"], input[type="button"], input[type="submit"], a';
    const btns = document.querySelectorAll(selector);
    btns.forEach((el) => {
      try {
        const raw = (el.innerText || el.value || el.title || "").trim().toLowerCase();
        if (!raw) return;
        const id = getTaskIdFromUrl();
        if ((raw.includes("stop") || raw.includes("pause")) && !el.__sm_pause_bound) {
          el.__sm_pause_bound = true;
          el.addEventListener("click", () => {
            setTimeout(() => {
              const aws = parseAWSTimer();
              if (aws && activeTask && activeTask.id === id) { updateActiveTaskFromAWS(aws); updateDisplay(); }
            }, 600);
          });
        }
        if ((raw.includes("release") || raw.includes("decline") || raw.includes("cancel") || raw.includes("return")) && !el.__sm_discard_bound) {
          el.__sm_discard_bound = true;
          el.addEventListener("click", () => { discardActiveTask("released"); updateDisplay(); });
        }
        if ((raw.includes("submit") || raw.includes("complete") || raw.includes("finish")) && !el.__sm_submit_bound) {
          el.__sm_submit_bound = true;
          el.addEventListener("click", () => { commitActiveTask(); updateDisplay(); });
        }
        if (raw.includes("skip") && !el.__sm_skip_bound) {
          el.__sm_skip_bound = true;
          el.addEventListener("click", () => { discardActiveTask("skipped"); updateDisplay(); });
        }
      } catch (e) {}
    });
  }
  new MutationObserver(wireTaskActionButtons).observe(document.body, { childList: true, subtree: true });

  // ============================================================================
  // CROSS-TAB SYNC
  // ============================================================================
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    if ([KEYS.DAILY_COMMITTED, KEYS.COUNT, KEYS.HISTORY, KEYS.LAST_DATE, KEYS.SESSIONS].includes(e.key)) {
      log("storage sync", e.key); updateDisplay();
      const root = document.getElementById("sm-dashboard-root"); if (root && root.style.display === "flex") updateDashboard();
    }
  });

  // ============================================================================
  // INIT
  // ============================================================================
  log("Init");
  checkDailyReset();
  scheduleMidnightReset();
  initSubmissionInterceptor();
  attachToFooter();
  updateDisplay();
  setInterval(trackOnce, CONFIG.CHECK_INTERVAL_MS);

  window.addEventListener("keydown", (e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "u") showDashboard(); });

  log("Ready - Dashboard-only reset | Counter bug fixed");

})();
