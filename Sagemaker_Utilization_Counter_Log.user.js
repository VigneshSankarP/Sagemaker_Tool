// ==UserScript==
// @name         SageMaker Utilization + Count
// @namespace    http://tampermonkey.net/
// @version      20.15-tasktime-sync-pause
// @description  Utilization timer + daily counter + full history + sessions + dashboard.
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @grant        none
// @noframes
// @run-at       document-end
// ==/UserScript==
// @updateURL    https://raw.githubusercontent.com/VigneshSankarP/Sagemaker-Counter/main/Sagemaker_Utilization_Counter_Log.user.js
// @downloadURL  https://raw.githubusercontent.com/VigneshSankarP/Sagemaker-Counter/main/Sagemaker_Utilization_Counter_Log.user.js


(function () {
  "use strict";

  // ---------------- RUN-ONCE PROTECTION FOR TIMER ----------------
  if (window.__SM_TIMER_RUNNING__) return;
  window.__SM_TIMER_RUNNING__ = true;

  // Preserve original fetch for optional cloud sync, in case we later patch window.fetch
  const ORIGINAL_FETCH =
    typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  // ---------------- KEYS / CONSTANTS ----------------
  const UTIL_KEY = "sm_utilization";
  const LAST_DAY_KEY = "sm_last_day";
  const HISTORY_KEY = "sm_utilization_history";
  const ALERT_KEY = "sm_utilization_alerts";

  const FOOTER_SELECTORS =
    ".cswui-footer, .awsui-footer, #footer-root, .awsui-util-pv-xs.cswui-footer";

  const WS_SEP = "::";

  // ---------------- TIMER CONFIG ----------------
  const TIMER_CONFIG = {
    DAILY_ALERT_HOURS: 8,        // daily threshold in hours (0 or null to disable)
    INACTIVITY_MINUTES: 15,      // idle minutes before auto-pause (0 or null to disable)

    CLOUD_SYNC_ENABLED: false,   // set true to enable cloud sync
    CLOUD_SYNC_ENDPOINT: "https://example.com/sm-utilization-sync",
    CLOUD_SYNC_METHOD: "POST",
    CLOUD_SYNC_HEADERS: {
      "Content-Type": "application/json",
    },
    CLOUD_SYNC_EVERY_MS: 5 * 60 * 1000, // ms

    MAX_HISTORY_DAYS: 30,
  };

  // ---------------- TASK DETECTION PATTERNS ----------------
  // Things that mean "the task is actively running / usable"
  const TASK_PATTERNS = [
    /release\s*task/i,                                   // original behavior
    /Kernel:\s*(Busy|Running)/i,
    /Status:\s*(Running|InProgress)/i,
    /Endpoint status:\s*(Creating|Updating|InService)/i,
    /Processing job status:\s*(InProgress|Running)/i,
    /Training job status:\s*(InProgress|Running)/i,
  ];

  // Things that mean "this task is over and should NOT count any more"
  const TASK_STOP_PATTERNS = [
    /sorry[,!]*\s*this task has expired/i,
    /this task has expired/i,
    /task (failed|has failed)/i,
    /task (was )?(cancelled|canceled)/i,
    /time limit.*(reached|exceeded|expired)/i,
    /time is up/i,
    /time.*expired/i,
    /you did not submit this task in time/i,
  ];

  function taskPageTextSnapshot() {
    if (!document.body) return "";
    // innerText ≈ visible text
    return document.body.innerText || document.body.textContent || "";
  }

  function taskMatchesAny(text, patterns) {
    for (const re of patterns) {
      if (re.test(text)) return true;
    }
    return false;
  }

  function getTaskTimeSecondsFromPage() {
    try {
      if (!document.body) return null;
      const raw = document.body.innerText || document.body.textContent || "";
      if (!raw) return null;
      const text = raw.replace(/\s+/g, " ");
      const m = text.match(/Task time:\s*(\d+):(\d+)/i);
      if (!m) return null;
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
      return mins * 60 + secs;
    } catch (e) {
      return null;
    }
  }


  // ---------------- HELPERS ----------------
  const today = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return [
      String(Math.floor(s / 3600)).padStart(2, "0"),
      String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
      String(s % 60).padStart(2, "0"),
    ].join(":");
  };

  const fmtH = fmt;

  function safeParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage errors (quota, disabled, etc.)
    }
  }

  function getWorkspaceId() {
    const host = window.location.host || "unknown-host";
    const path = window.location.pathname || "/";
    const parts = path.split("/").filter(Boolean);
    const first = parts[0] || "root";
    return `${host}/${first}`;
  }

  const WORKSPACE_ID = getWorkspaceId();

  // ---------------- PER-HIT STATE (QUEUE/HIT) ----------------
  const CURRENT_HIT_KEY = "sm_current_hit_state";

  function getHitIdForPage() {
    const path = window.location.pathname || "/";
    const search = window.location.search || "";
    return WORKSPACE_ID + WS_SEP + path + search;
  }

  function loadCurrentHit() {
    return safeParse(localStorage.getItem(CURRENT_HIT_KEY), null);
  }

  function saveCurrentHit(state) {
    if (!state) {
      localStorage.removeItem(CURRENT_HIT_KEY);
    } else {
      try {
        safeSetItem(CURRENT_HIT_KEY, JSON.stringify(state));
      } catch {}
    }
  }

  // ---------------- UTILIZATION STORAGE (PER-WORKSPACE, BACKWARD COMPAT) ----------------

  function loadLastDayMap() {
    const raw = localStorage.getItem(LAST_DAY_KEY);
    if (!raw) return {};
    // v7.3 stored a plain string "YYYY-MM-DD"
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") {
        return { [WORKSPACE_ID]: parsed };
      }
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      return {};
    } catch {
      // raw was string
      return { [WORKSPACE_ID]: raw };
    }
  }

  function saveLastDayMap(map) {
    safeSetItem(LAST_DAY_KEY, JSON.stringify(map));
  }

  function loadUtilStore() {
    const raw = localStorage.getItem(UTIL_KEY);
    const parsed = safeParse(raw, {});
    const keys = Object.keys(parsed);
    if (keys.length && keys.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))) {
      // legacy: { "2025-01-01": ms }
      return { [WORKSPACE_ID]: parsed };
    }
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveUtilStore(all) {
    safeSetItem(UTIL_KEY, JSON.stringify(all));
  }

  function loadToday() {
    const t = today();
    const lastMap = loadLastDayMap();
    const storedDay = lastMap[WORKSPACE_ID];
    const utilStore = loadUtilStore();

    if (storedDay !== t) {
      lastMap[WORKSPACE_ID] = t;
      saveLastDayMap(lastMap);

      const wsData = utilStore[WORKSPACE_ID] || {};
      wsData[t] = 0;
      utilStore[WORKSPACE_ID] = wsData;
      saveUtilStore(utilStore);
      return 0;
    }

    const wsData = utilStore[WORKSPACE_ID] || {};
    return wsData[t] || 0;
  }

  function rawSaveToday(ms) {
    const t = today();
    const lastMap = loadLastDayMap();
    lastMap[WORKSPACE_ID] = t;
    saveLastDayMap(lastMap);

    const utilStore = loadUtilStore();
    const wsData = utilStore[WORKSPACE_ID] || {};
    wsData[t] = ms;
    utilStore[WORKSPACE_ID] = wsData;
    saveUtilStore(utilStore);
  }

  // ---------------- UTILIZATION HISTORY (PER-WORKSPACE + HOURLY + SESSIONS) ----------------

  function loadHistoryAll() {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = safeParse(raw, {});
    const migrated = {};
    let changed = false;

    for (const key of Object.keys(parsed)) {
      const val = parsed[key];
      if (key.includes(WS_SEP)) {
        migrated[key] = val;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        // legacy: date-only key -> treat as current workspace's data
        migrated[WORKSPACE_ID + WS_SEP + key] = val;
        changed = true;
      } else {
        migrated[key] = val;
      }
    }

    if (changed) {
      safeSetItem(HISTORY_KEY, JSON.stringify(migrated));
    }

    return migrated;
  }

  function saveHistoryAll(all) {
    safeSetItem(HISTORY_KEY, JSON.stringify(all));
  }

  function normalizeEntry(entry) {
    // entry can be number (legacy), or object with totalMs/hourly/sessions
    if (typeof entry === "number") {
      return { totalMs: entry, hourly: {}, sessions: [] };
    }
    if (!entry || typeof entry !== "object") {
      return { totalMs: 0, hourly: {}, sessions: [] };
    }
    if (!("totalMs" in entry)) entry.totalMs = 0;
    if (!entry.hourly || typeof entry.hourly !== "object") entry.hourly = {};
    if (!Array.isArray(entry.sessions)) entry.sessions = [];
    return entry;
  }

  function trimOldHistory(all) {
    const cutoff =
      Date.now() - TIMER_CONFIG.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    for (const k of Object.keys(all)) {
      const parts = k.split(WS_SEP);
      const dStr = parts[parts.length - 1];
      const ts = new Date(dStr).getTime();
      if (isFinite(ts) && ts < cutoff) delete all[k];
    }
  }

  function updateHistory(totalMs, deltaMs) {
    const all = loadHistoryAll();
    const t = today();
    const key = WORKSPACE_ID + WS_SEP + t;

    let entry = normalizeEntry(all[key]);
    entry.totalMs = totalMs;

    if (deltaMs > 0) {
      const h = String(new Date().getHours()).padStart(2, "0");
      entry.hourly[h] = (entry.hourly[h] || 0) + deltaMs;
    }

    all[key] = entry;
    trimOldHistory(all);
    saveHistoryAll(all);
  }

  function recordSession(startIso, pauseIso) {
    const all = loadHistoryAll();
    const t = today();
    const key = WORKSPACE_ID + WS_SEP + t;

    let entry = normalizeEntry(all[key]);
    entry.sessions.push({ start: startIso, pause: pauseIso });

    all[key] = entry;
    trimOldHistory(all);
    saveHistoryAll(all);
  }

  function loadHistoryWorkspace() {
    const all = loadHistoryAll();
    const prefix = WORKSPACE_ID + WS_SEP;
    const result = {};
    for (const key of Object.keys(all)) {
      if (key.startsWith(prefix)) {
        const date = key.slice(prefix.length);
        result[date] = all[key];
      }
    }
    return result;
  }

  // ---------------- ALERTS / DAILY THRESHOLD ----------------

  function loadAlertMap() {
    return safeParse(localStorage.getItem(ALERT_KEY), {});
  }

  function saveAlertMap(map) {
    safeSetItem(ALERT_KEY, JSON.stringify(map));
  }

  function checkDailyThresholdAlert(totalMs) {
    if (!TIMER_CONFIG.DAILY_ALERT_HOURS || TIMER_CONFIG.DAILY_ALERT_HOURS <= 0)
      return;
    const thresholdMs = TIMER_CONFIG.DAILY_ALERT_HOURS * 3600 * 1000;
    if (totalMs < thresholdMs) return;

    const alerts = loadAlertMap();
    const key = WORKSPACE_ID + WS_SEP + today();
    if (alerts[key]) return;

    alerts[key] = true;
    saveAlertMap(alerts);
    alert(
      `SageMaker utilization has exceeded ${TIMER_CONFIG.DAILY_ALERT_HOURS} hours today for workspace:\n\n${WORKSPACE_ID}`
    );
  }

  // ---------------- CLOUD SYNC (OPTIONAL) ----------------

  let lastSyncTs = 0;

  function maybeCloudSync(totalMs) {
    if (!TIMER_CONFIG.CLOUD_SYNC_ENABLED) return;

    const now = Date.now();
    if (now - lastSyncTs < TIMER_CONFIG.CLOUD_SYNC_EVERY_MS) return;
    lastSyncTs = now;

    const wsHistory = loadHistoryWorkspace();

    const payload = {
      workspaceId: WORKSPACE_ID,
      timestamp: new Date().toISOString(),
      today: today(),
      totalMs,
      history: wsHistory,
    };

    try {
      const fn = ORIGINAL_FETCH || window.fetch;
      if (!fn) return;
      fn(TIMER_CONFIG.CLOUD_SYNC_ENDPOINT, {
        method: TIMER_CONFIG.CLOUD_SYNC_METHOD,
        headers: TIMER_CONFIG.CLOUD_SYNC_HEADERS,
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // swallow errors
    }
  }

  // ---------------- SAVE TODAY WRAPPER ----------------

  const _origSaveToday = rawSaveToday;
  function saveToday(ms, deltaMs) {
    _origSaveToday(ms);
    updateHistory(ms, deltaMs || 0);
    checkDailyThresholdAlert(ms);
    maybeCloudSync(ms);
  }

  // ---------------- TIMER STATE ----------------
  // committedMs = last submitted utilization (backend-equivalent)
  // totalMs     = committedMs + in-progress time for current hit
  let committedMs = loadToday();
  let totalMs = committedMs;

  let timerId = null;
  let running = false;
  let lastActivityTs = Date.now();
  let currentSessionStart = null; // ISO string

  let currentHitId = getHitIdForPage();
  let currentHitState = loadCurrentHit() || null;

  // Task time adjustments for Stop & Resume behavior
  // taskTimeBreakAdjustSec: total seconds of "break" time to subtract from
  // the on-page Task time so that pauses (Stop and resume later) do not
  // count toward utilization. pauseTaskSec: raw Task time value at the
  // moment the user clicked Stop & resume.
  let taskTimeBreakAdjustSec = 0;
  let pauseTaskSec = null;

  function hydrateFromHitState() {
    const saved = loadCurrentHit();
    if (!saved || saved.hitId !== currentHitId) {
      // Different page or nothing saved: just use today's committed total
      currentHitState = null;
      committedMs = loadToday();
      totalMs = committedMs;
      return;
    }

    // Restore what we had at last save
    committedMs =
      typeof saved.committedMs === "number" ? saved.committedMs : loadToday();
    totalMs = typeof saved.totalMs === "number" ? saved.totalMs : committedMs;
    currentHitState = saved;

    // Also restore pause/break adjustments, if any
    if (typeof saved.taskTimeBreakAdjustSec === "number") {
      taskTimeBreakAdjustSec = saved.taskTimeBreakAdjustSec;
    } else {
      taskTimeBreakAdjustSec = 0;
    }
    if (typeof saved.pauseTaskSec === "number") {
      pauseTaskSec = saved.pauseTaskSec;
    } else {
      pauseTaskSec = null;
    }

    // Check once if this page already looks like an expired/failed task.
    // If so, don't add any offline time; just snap back to committedMs.
    let expiredNow = false;
    try {
      const text = taskPageTextSnapshot ? taskPageTextSnapshot() : "";
      if (text && taskMatchesAny && taskMatchesAny(text, TASK_STOP_PATTERNS)) {
        expiredNow = true;
      }
    } catch (e) {
      // ignore DOM issues; we'll let isTaskActive() handle it later
    }

    // offlineDelta removed; we now trust the on-page Task time label instead.

    // If the page is already expired, make sure we are rolled back and
    // mark the state as expired so this hit doesn't keep accumulating.
    if (expiredNow) {
      totalMs = committedMs;
      if (typeof persistHitState === "function") {
        persistHitState({ state: "expired" });
      }
    }
  }


  function persistHitState(stateOverride) {
    const state = stateOverride || currentHitState || {};
    state.hitId = currentHitId;
    state.committedMs = committedMs;
    state.totalMs = totalMs;
    state.lastTickTs = Date.now();
    if (!state.state) state.state = running ? "running" : "paused";
    currentHitState = state;
    saveCurrentHit(state);
  }

  // Commit pending time (on successful submit before end time)
  function commitCurrentHit(reason) {
    const deltaToCommit = totalMs - committedMs;
    if (deltaToCommit > 0) {
      committedMs = totalMs;
      // Only committedMs participates in daily utilization & history
      saveToday(committedMs, deltaToCommit);
    } else {
      // Ensure store is kept in sync even if nothing new
      saveToday(committedMs, 0);
    }
    saveCurrentHit(null);
  }

  // Roll back pending time (release, expire, late submit, etc.)
  function rollbackCurrentHit(reason) {
    totalMs = committedMs;
    saveCurrentHit(null);
    render();
  }

  // ---------------- INACTIVITY TRACKING ----------------
  function markActivity() {
    lastActivityTs = Date.now();
  }

  ["mousemove", "keydown", "click", "scroll"].forEach((evt) => {
    window.addEventListener(evt, markActivity, { passive: true });
  });

  setInterval(() => {
    if (!running) return;
    if (!TIMER_CONFIG.INACTIVITY_MINUTES || TIMER_CONFIG.INACTIVITY_MINUTES <= 0)
      return;

    const idleMs = Date.now() - lastActivityTs;
    if (idleMs >= TIMER_CONFIG.INACTIVITY_MINUTES * 60 * 1000) {
      stopTimer(true); // autoPause flag
      alert(
        `SageMaker utilization timer paused after ${TIMER_CONFIG.INACTIVITY_MINUTES} minutes of inactivity.`
      );
    }
  }, 30 * 1000);

  // ---------------- FOOTER DISPLAY ----------------
  const display = document.createElement("div");
  display.id = "sm-utilization";
  Object.assign(display.style, {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "inherit",
    fontSize: "inherit",
    fontFamily: "inherit",
    opacity: "0.88",
    pointerEvents: "auto",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  function render() {
    const text = `Utilization: ${fmt(totalMs)}`;
    if (display.firstChild) {
      display.firstChild.nodeValue = text;
    } else {
      display.insertBefore(document.createTextNode(text), display.firstChild);
    }
  }

  display.appendChild(document.createTextNode(`Utilization: ${fmt(totalMs)}`));

  // ---------------- INLINE " | View Log" BUTTON ----------------
  const logBtn = document.createElement("span");
  logBtn.id = "sm-log-btn";
  logBtn.textContent = " | View Log";
  Object.assign(logBtn.style, {
    cursor: "pointer",
    opacity: "0.85",
    fontSize: "inherit",
    color: "inherit",
    userSelect: "none",
    pointerEvents: "auto",
  });

  logBtn.onmouseenter = () => (logBtn.style.opacity = "1");
  logBtn.onmouseleave = () => (logBtn.style.opacity = "0.85");

  function attachLogInline() {
    if (!display.contains(logBtn)) display.appendChild(logBtn);
  }

  // ---------------- FOOTER ATTACH ----------------
  function attachToFooter() {
    const footer = document.querySelector(FOOTER_SELECTORS);
    if (!footer) return;

    if (getComputedStyle(footer).position === "static")
      footer.style.position = "relative";

    const dups = footer.querySelectorAll("#sm-utilization");
    if (dups.length > 1) {
      for (let i = 1; i < dups.length; i++) dups[i].remove();
    }

    if (!footer.contains(display)) footer.appendChild(display);

    attachLogInline();
  }

  let footerAttachTimer = null;
  function debouncedAttachToFooter() {
    clearTimeout(footerAttachTimer);
    footerAttachTimer = setTimeout(attachToFooter, 100);
  }

  new MutationObserver(debouncedAttachToFooter).observe(document.body, {
    childList: true,
    subtree: true,
  });

  // ---------------- HOMEPAGE DETECTION ----------------
  function isHomePage() {
    const path = window.location.pathname || "";
    const text = (taskPageTextSnapshot() || "").toLowerCase();

    // If we clearly see task-only UI (Release Task / Submit), it's NOT home
    if (/release\s*task/.test(text) || /\bsubmit\b/.test(text)) return false;

    // Typical SageMaker landing text (adjust to your actual home page if needed)
    if (/amazon sagemaker studio/.test(text) && /getting started/.test(text)) return true;
    if (/welcome to amazon sagemaker/.test(text)) return true;

    // Treat very short paths as console/home (no extra segments)
    const parts = path.split("/").filter(Boolean);
    if (parts.length <= 1) return true;

    return false;
  }

  // ---------------- TASK DETECTION (IMPROVED) ----------------
  function isTaskActive() {
    const text = taskPageTextSnapshot();
    if (!text) return false;
    if (isHomePage()) return false;

    // If we clearly see an "expired/failed" style message,
    // treat the task as inactive, roll back current hit, and stop.
    if (taskMatchesAny(text, TASK_STOP_PATTERNS)) {
      if (typeof rollbackCurrentHit === "function" && totalMs !== committedMs) {
        rollbackCurrentHit("expired");
        if (typeof persistHitState === "function") {
          persistHitState({ state: "expired" });
        }
      }
      return false;
    }

    // Otherwise, it's active if any of the usual patterns is present
    return taskMatchesAny(text, TASK_PATTERNS);
  }

  // ---------------- TIMER ----------------
  function startTimer() {
    if (running) return;
    if (typeof isHomePage === "function" && isHomePage()) return; // never run on home page
    running = true;
    clearInterval(timerId);

    // session start
    if (!currentSessionStart) {
      currentSessionStart = new Date().toISOString();
    }

    if (typeof persistHitState === "function") {
      persistHitState({ state: "running" });
    }

    timerId = setInterval(() => {
      if (!isTaskActive() || (typeof isHomePage === "function" && isHomePage())) {
        stopTimer(false);
        return;
      }
      const delta = 1000; // logical tick
      const taskSec = getTaskTimeSecondsFromPage && getTaskTimeSecondsFromPage();
      if (typeof taskSec === "number" && taskSec >= 0) {
        // We always start from the on-page Task time, but adjust out any
        // "break" time that came from Stop & Resume clicks.
        // If pauseTaskSec is set, this is the first tick after resuming
        // from a pause. Compute how much of the Task time happened while
        // we were paused (extraBreak), accumulate it into the break
        // adjustment, then clear pauseTaskSec so we don't repeat it.
        if (pauseTaskSec !== null) {
          const extraBreak = taskSec - pauseTaskSec;
          if (extraBreak > 0) {
            taskTimeBreakAdjustSec += extraBreak;
          }
          pauseTaskSec = null;
          if (typeof persistHitState === "function") {
            persistHitState({
              state: "running",
              taskTimeBreakAdjustSec,
              pauseTaskSec: null,
            });
          }
        }
        const effectiveTaskSec = Math.max(0, taskSec - taskTimeBreakAdjustSec);
        // Match the on-page "Task time" minus all pause/break segments.
        totalMs = committedMs + effectiveTaskSec * 1000;
      } else {
        // Fallback: only if no Task time label can be read.
        totalMs += delta;
      }
      render();
      if (typeof persistHitState === "function") {
        persistHitState();
      }
    }, 1000);

    render();
  }

  /**
   * stopTimer(autoPause)
   * autoPause is boolean flag; used to distinguish pause vs normal stop.
   */
  function stopTimer(autoPause) {
    if (!running && !currentSessionStart) return;

    if (running) {
      running = false;
      clearInterval(timerId);
      timerId = null;
      if (typeof persistHitState === "function") {
        persistHitState({ state: autoPause ? "paused" : "stopped" });
      }
      render();
    }

    if (currentSessionStart) {
      const pauseIso = new Date().toISOString();
      recordSession(currentSessionStart, pauseIso);
      currentSessionStart = null;
    }
  }

  // ---------------- TASK ACTION BUTTONS ----------------
  function wireTaskActionButtons() {
    const selector =
      'button, [role="button"], input[type="button"], input[type="submit"]';
    const btns = document.querySelectorAll(selector);
    btns.forEach((el) => {
      const raw = (el.innerText || el.value || "").trim().toLowerCase();
      if (!raw) return;

      // Release → discard current hit time
      if (raw.includes("release") && !el.__sm_release_bound) {
        el.__sm_release_bound = true;
        el.addEventListener("click", () => {
          if (typeof rollbackCurrentHit === "function") {
            rollbackCurrentHit("release");
          }
          stopTimer(false);
        });
      }

      // Stop and Resume Later → pause
      if (raw.includes("stop and resume") && !el.__sm_pause_bound) {
        el.__sm_pause_bound = true;
        el.addEventListener("click", () => {
          // Capture the Task time at the moment of pause so that any
          // additional Task time accumulated while the job is parked
          // (user on Jobs page, etc.) can be treated as "break" and
          // excluded from utilization.
          const tSec =
            getTaskTimeSecondsFromPage && getTaskTimeSecondsFromPage();
          if (typeof tSec === "number" && tSec >= 0) {
            pauseTaskSec = tSec;
          }
          stopTimer(true);
          if (typeof persistHitState === "function") {
            persistHitState({
              state: "paused",
              pauseTaskSec,
              taskTimeBreakAdjustSec,
            });
          }
        });
      }

      // Successful submit-and-start-next → commit utilization
      if (raw.includes("submit") && raw.includes("next") && !el.__sm_submit_bound) {
        el.__sm_submit_bound = true;
        el.addEventListener("click", () => {
          if (typeof commitCurrentHit === "function") {
            commitCurrentHit("submit");
          }
        });
      }
    });
  }

  // continuously watch for those buttons
  new MutationObserver(wireTaskActionButtons).observe(document.body, {
    childList: true,
    subtree: true,
  });

  let taskCheckScheduled = false;
  const taskObserver = new MutationObserver(() => {
    if (taskCheckScheduled) return;
    taskCheckScheduled = true;
    setTimeout(() => {
      taskCheckScheduled = false;
      const active = isTaskActive();
      if (active && !running) startTimer();
      if (!active && running) stopTimer(false);
    }, 200);
  });
  taskObserver.observe(document.body, { childList: true, subtree: true });

  // ---------------- SPA NAVIGATION ----------------
  (function hookNav() {
    const push = history.pushState;
    const replace = history.replaceState;

    function rescan() {
      setTimeout(() => {
        attachToFooter();
        isTaskActive() ? startTimer() : stopTimer(false);
      }, 500);
    }

    history.pushState = function (...args) {
      const r = push.apply(this, args);
      rescan();
      return r;
    };

    history.replaceState = function (...args) {
      const r = replace.apply(this, args);
      rescan();
      return r;
    };

    window.addEventListener("popstate", rescan);
  })();

  // ---------------- DAILY RESET ----------------
  setInterval(() => {
    const t = today();
    const lastMap = loadLastDayMap();
    const storedDay = lastMap[WORKSPACE_ID];

    if (storedDay !== t) {
      // If a session was somehow spanning midnight, close it.
      if (currentSessionStart) {
        recordSession(currentSessionStart, new Date().toISOString());
        currentSessionStart = null;
      }
      committedMs = 0;
      totalMs = 0;
      saveToday(committedMs, 0);
      saveCurrentHit(null);
      render();
    }
  }, 60000);

  // ===================================================================
  //                    FULL-PAGE DASHBOARD (NEW TAB)
  // ===================================================================

  function openLogDashboard() {
    const w = window.open("", "_blank");
    if (!w) {
      alert(
        "Popup blocked: please allow popups for the SageMaker domain to view the log."
      );
      return;
    }

    const workspaceIdLiteral = JSON.stringify(WORKSPACE_ID);
    const historyKeyLiteral = JSON.stringify(HISTORY_KEY);
    const wsSepLiteral = JSON.stringify(WS_SEP);
    const maxDaysLiteral = TIMER_CONFIG.MAX_HISTORY_DAYS;

    w.document.open();
    w.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SageMaker Utilization Log</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #0f172a;
    }
    .sm-container {
      max-width: 1320px;
      margin: 18px auto 40px;
      padding: 0 16px;
    }
    .sm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 10px 25px rgba(15,23,42,0.06);
      margin-bottom: 14px;
    }
    .sm-title {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .sm-subtitle {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 3px;
    }
    .sm-header-right {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .sm-button {
      border: none;
      padding: 6px 12px;
      font-size: 13px;
      border-radius: 999px;
      cursor: pointer;
      background: #0f766e;
      color: #f9fafb;
      box-shadow: 0 2px 6px rgba(15,118,110,0.25);
      white-space: nowrap;
    }
    .sm-button.secondary {
      background: #e5e7eb;
      color: #111827;
      box-shadow: none;
    }
    .sm-button:active {
      transform: translateY(1px);
    }

    .sm-filters {
      background: #ffffff;
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 8px 18px rgba(15,23,42,0.04);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 13px;
    }
    .sm-filters label {
      font-size: 11px;
      opacity: 0.75;
      margin-right: 4px;
    }
    .sm-filters input[type="date"] {
      padding: 4px 6px;
      font-size: 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .sm-filters span.sm-hint {
      font-size: 11px;
      opacity: 0.7;
    }

    .sm-layout {
      display: grid;
      grid-template-columns: minmax(0, 2.2fr) minmax(0, 1.4fr);
      gap: 14px;
      align-items: flex-start;
    }
    .sm-left {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sm-right {
      position: sticky;
      top: 10px;
      align-self: flex-start;
    }

    .sm-card {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 10px 22px rgba(15,23,42,0.04);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .sm-section-header {
      padding: 10px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sm-section-header-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sm-section-header-sub {
      font-size: 11px;
      opacity: 0.7;
    }
    .sm-section-body {
      padding: 8px 14px 10px;
      font-size: 12px;
      background: #f9fafb;
    }

    table.sm-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 12px;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
    }
    table.sm-table th,
    table.sm-table td {
      padding: 5px 7px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      white-space: nowrap;
    }
    table.sm-table th {
      background: #eff6ff;
      font-weight: 500;
      color: #1e293b;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    table.sm-table tr:nth-child(even) td {
      background: #f9fafb;
    }
    .sm-empty {
      font-size: 12px;
      opacity: 0.7;
      padding: 6px 2px;
    }
    .sm-pagination {
      margin-top: 6px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      opacity: 0.9;
    }
    .sm-pagination button {
      padding: 2px 7px;
      font-size: 11px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f9fafb;
      cursor: pointer;
    }
    .sm-pagination button:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .sm-tag {
      display: inline-block;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #e0f2fe;
      color: #0369a1;
      margin-left: 8px;
    }
    .sm-footer-note {
      margin-top: 4px;
      font-size: 11px;
      opacity: 0.65;
    }

    .sm-metric-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .sm-metric {
      flex: 1;
      min-width: 120px;
      padding: 7px 8px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f9fafb, #eff6ff);
      border: 1px solid #e2e8f0;
    }
    .sm-metric-label {
      font-size: 11px;
      opacity: 0.75;
      margin-bottom: 2px;
    }
    .sm-metric-value {
      font-size: 14px;
      font-weight: 600;
    }
    #sm-util-chart-30d {
      width: 100%;
      height: 230px;
    }

    .sm-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.45);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .sm-modal {
      width: 420px;
      max-width: 90%;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 40px rgba(15,23,42,0.25);
      padding: 14px 16px 12px;
      font-size: 12px;
    }
    .sm-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .sm-modal-title {
      font-size: 14px;
      font-weight: 600;
    }
    .sm-modal-close {
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0 4px;
    }
    .sm-modal-section {
      margin-bottom: 6px;
    }
    .sm-modal-section label {
      font-size: 11px;
      opacity: 0.8;
      margin-right: 4px;
    }
    .sm-modal select,
    .sm-modal input[type="date"],
    .sm-modal input[type="text"] {
      width: 100%;
      padding: 4px 6px;
      font-size: 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      margin-top: 2px;
    }
    .sm-modal textarea {
      width: 100%;
      height: 120px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      background: #f9fafb;
    }
    .sm-modal-actions {
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      gap: 6px;
      flex-wrap: wrap;
    }
    .sm-modal-actions button {
      flex: 1;
      min-width: 90px;
      padding: 5px 8px;
      font-size: 12px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
    }
    .sm-modal-actions .primary {
      background: #0f766e;
      color: #f9fafb;
    }
    .sm-modal-actions .secondary {
      background: #e5e7eb;
      color: #111827;
    }

    @media (max-width: 980px) {
      .sm-layout {
        grid-template-columns: minmax(0, 1fr);
      }
      .sm-right{
        position: static;
      }
    }
    @media (max-width: 680px) {
      .sm-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .sm-header-right {
        width: 100%;
        justify-content: flex-start;
      }
    }
  
/* --- Fix Reset Counter button layout --- */
#sm-counter-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
}
#sm-counter-header .sm-section-header-main {
    display: flex;
    flex-direction: column;
}

</style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="sm-container">
    <div class="sm-header">
      <div>
        <div class="sm-title">SageMaker Utilization Log</div>
        <div class="sm-subtitle" id="sm-workspace-subtitle"></div>
      </div>
      <div class="sm-header-right">
        <button class="sm-button secondary" id="sm-refresh">Refresh</button>
        <button class="sm-button" id="sm-download-csv">Download CSV</button>
      </div>
    </div>

    <div class="sm-filters">
      <div>
        <label for="sm-date-from">From</label>
        <input type="date" id="sm-date-from">
      </div>
      <div>
        <label for="sm-date-to">To</label>
        <input type="date" id="sm-date-to">
      </div>
      <button class="sm-button secondary" id="sm-apply-filter">Apply</button>
      <button class="sm-button secondary" id="sm-clear-filter">Clear</button>
      <span class="sm-hint">Filter applies to all three tables and chart (last ${maxDaysLiteral} days stored).</span>
    </div>

    <div class="sm-layout">
      <div class="sm-left">
        <div class="sm-card">
          <div class="sm-section-header">
            <div class="sm-section-header-main">
              <span>Date-wise Utilization &amp; Count</span>
              <span class="sm-section-header-sub">
                Each row is a stored day for this workspace. Count is daily submission counter (when available).
              </span>
            </div>
            <div class="sm-tag" id="sm-days-count"></div>
          </div>
          <div class="sm-section-body">
            <div id="sm-util-table-wrapper"></div>
            <div class="sm-pagination" id="sm-util-pagination">
              <button id="sm-util-prev">Prev</button>
              <span id="sm-util-page-label"></span>
              <button id="sm-util-next">Next</button>
            </div>
          </div>
        </div>

        <div class="sm-card">
          <div class="sm-section-header">
            <div class="sm-section-header-main">
              <span>Start / Pause / Stop History</span>
              <span class="sm-section-header-sub">
                Derived from session logs. "Task Name" is not stored by the timer yet, so shown as N/A.
              </span>
            </div>
          </div>
          <div class="sm-section-body">
            <div id="sm-sessions-table-wrapper"></div>
            <div class="sm-pagination" id="sm-sessions-pagination">
              <button id="sm-sessions-prev">Prev</button>
              <span id="sm-sessions-page-label"></span>
              <button id="sm-sessions-next">Next</button>
            </div>
            <div class="sm-footer-note">
              Each row is a continuous active period detected by the utilization timer.
            </div>
          </div>
        </div>

        <div class="sm-card">
          
<div class="sm-section-header" id="sm-counter-header">
    <div class="sm-section-header-main">
      <span>Assign-Counter History</span>
      <span class="sm-section-header-sub">
        Based on the submission counter stored in localStorage.
      </span>
    </div>

    <button class="sm-button secondary" id="sm-reset-counter">Reset Counter</button>
</div>

<div class="sm-section-body">
            <div id="sm-counter-table-wrapper"></div>
            <div class="sm-pagination" id="sm-counter-pagination">
              <button id="sm-counter-prev">Prev</button>
              <span id="sm-counter-page-label"></span>
              <button id="sm-counter-next">Next</button>
            </div>
            <div class="sm-footer-note">
              To track granular per-submit history, the main script would need to store events.
            </div>
          </div>
        </div>
      </div>

      <div class="sm-right">
        <div class="sm-card">
          <div class="sm-section-header">
            <div class="sm-section-header-main">
              <span>8-Hour Utilization View</span>
              <span class="sm-section-header-sub">
                Today vs. filtered range (up to last 30 days).
              </span>
            </div>
          </div>
          <div class="sm-section-body">
            <div class="sm-metric-row">
              <div class="sm-metric">
                <div class="sm-metric-label">Today Utilization</div>
                <div class="sm-metric-value" id="sm-today-util">00:00:00</div>
              </div>
              <div class="sm-metric">
                <div class="sm-metric-label">% of 8 hours (today)</div>
                <div class="sm-metric-value" id="sm-today-percent">0%</div>
              </div>
              <div class="sm-metric">
                <div class="sm-metric-label">Average (filtered days)</div>
                <div class="sm-metric-value" id="sm-avg-util">00:00:00</div>
              </div>
            </div>
            <canvas id="sm-util-chart-30d"></canvas>
            <div class="sm-footer-note">
              Bars show filtered days (up to last ${maxDaysLiteral}) in hours.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="sm-modal-backdrop" id="sm-csv-modal-backdrop">
    <div class="sm-modal">
      <div class="sm-modal-header">
        <div class="sm-modal-title">Download CSV</div>
        <div class="sm-modal-close" id="sm-csv-close">&times;</div>
      </div>
      <div class="sm-modal-section">
        <label for="sm-csv-mode">Export mode</label>
        <select id="sm-csv-mode">
          <option value="summary">Daily summary (1 row per day)</option>
          <option value="sessions">Session details (1 row per session)</option>
        </select>
      </div>
      <div class="sm-modal-section">
        <label>Date range</label>
        <div style="display:flex; gap:6px;">
          <input type="date" id="sm-csv-from">
          <input type="date" id="sm-csv-to">
        </div>
      </div>
      <div class="sm-modal-section">
        <label for="sm-csv-filename">File name</label>
        <input type="text" id="sm-csv-filename" value="sagemaker-utilization.csv">
      </div>
      <div class="sm-modal-section">
        <label for="sm-csv-preview">Preview</label>
        <textarea id="sm-csv-preview" readonly></textarea>
      </div>
      <div class="sm-modal-actions">
        <button class="secondary" id="sm-csv-preview-btn">Preview CSV</button>
        <button class="primary" id="sm-csv-download-btn">Download</button>
      </div>
    </div>
  </div>

<script>
(function () {
  const WORKSPACE_ID = ${workspaceIdLiteral};
  const HISTORY_KEY = ${historyKeyLiteral};
  const WS_SEP = ${wsSepLiteral};

  const COUNTER_COUNT_KEY = "sm_count";
  const COUNTER_LAST_RESET_KEY = "sm_last_reset";

  const PAGE_SIZE = 10;

  const today = () => new Date().toISOString().split("T")[0];

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return [
      String(Math.floor(s / 3600)).padStart(2, "0"),
      String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
      String(s % 60).padStart(2, "0"),
    ].join(":");
  };

  function safeParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function normalizeEntry(entry) {
    if (typeof entry === "number") {
      return { totalMs: entry, hourly: {}, sessions: [] };
    }
    if (!entry || typeof entry !== "object") {
      return { totalMs: 0, hourly: {}, sessions: [] };
    }
    if (!("totalMs" in entry)) entry.totalMs = 0;
    if (!entry.hourly || typeof entry.hourly !== "object") entry.hourly = {};
    if (!Array.isArray(entry.sessions)) entry.sessions = [];
    return entry;
  }

  function loadHistoryAll() {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = safeParse(raw, {});
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function loadWorkspaceEntries() {
    const all = loadHistoryAll();
    const prefix = WORKSPACE_ID + WS_SEP;
    const entries = [];
    for (const key of Object.keys(all)) {
      if (!key.startsWith(prefix)) continue;
      const date = key.slice(prefix.length);
      const entry = normalizeEntry(all[key]);
      entries.push({
        date,
        totalMs: entry.totalMs || 0,
        hourly: entry.hourly || {},
        sessions: entry.sessions || [],
      });
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return entries;
  }

  function loadCounter() {
    let count = 0;
    let lastReset = null;
    try {
      const rawCount = localStorage.getItem(COUNTER_COUNT_KEY);
      if (rawCount != null) count = JSON.parse(rawCount);
    } catch {}
    try {
      const rawReset = localStorage.getItem(COUNTER_LAST_RESET_KEY);
      if (rawReset != null) lastReset = JSON.parse(rawReset);
    } catch {}
    const safeCount =
      typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0;
    return { count: safeCount, lastReset };
  }

  function applyDateFilter(list, fromVal, toVal) {
    if (!fromVal && !toVal) return list.slice();
    return list.filter((e) => {
      const d = e.date || e.dateStr || "";
      if (fromVal && d < fromVal) return false;
      if (toVal && d > toVal) return false;
      return true;
    });
  }

  let allEntries = loadWorkspaceEntries();
  let filteredEntries = allEntries.slice();

  let utilPage = 1;
  let sessionsPage = 1;
  let counterPage = 1;

  const counter = loadCounter();

  function buildUtilRows() {
    const list = filteredEntries
      .map((e) => ({ ...e }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const todayStr = today();
    return list.map((e) => ({
      date: e.date,
      totalMs: e.totalMs,
      count: e.date === todayStr ? counter.count : null,
    }));
  }

  function renderUtilTable(page) {
    const wrapper = document.getElementById("sm-util-table-wrapper");
    const pageLabel = document.getElementById("sm-util-page-label");
    const prevBtn = document.getElementById("sm-util-prev");
    const nextBtn = document.getElementById("sm-util-next");
    const daysCount = document.getElementById("sm-days-count");

    const rows = buildUtilRows();
    const total = rows.length;
    daysCount.textContent = total + " day" + (total === 1 ? "" : "s");

    if (!total) {
      wrapper.innerHTML = '<div class="sm-empty">No utilization data found for this workspace in the selected range.</div>';
      pageLabel.textContent = "Page 0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    utilPage = currentPage;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);

    let html = '<table class="sm-table"><thead><tr>' +
      "<th>Date</th><th>Utilization</th><th>Count</th>" +
      "</tr></thead><tbody>";

    slice.forEach((r) => {
      const countText = r.count == null ? "–" : String(r.count);
      html += "<tr>" +
        "<td>" + r.date + "</td>" +
        "<td>" + fmt(r.totalMs || 0) + "</td>" +
        "<td>" + countText + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    wrapper.innerHTML = html;

    pageLabel.textContent = "Page " + currentPage + " / " + totalPages;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  function buildSessionRows() {
    const rows = [];
    filteredEntries.forEach((e) => {
      (e.sessions || []).forEach((s) => {
        const start = s.start || "";
        const pause = s.pause || "";
        let durationMs = 0;
        if (start && pause) {
          const st = new Date(start).getTime();
          const pt = new Date(pause).getTime();
          if (isFinite(st) && isFinite(pt) && pt >= st) {
            durationMs = pt - st;
          }
        }
        rows.push({
          date: e.date,
          start,
          pause,
          durationMs,
          taskName: "N/A",
        });
      });
    });
    rows.sort((a, b) => {
      const as = a.start || "";
      const bs = b.start || "";
      return as < bs ? 1 : as > bs ? -1 : 0;
    });
    return rows;
  }

  function renderSessionsTable(page) {
    const wrapper = document.getElementById("sm-sessions-table-wrapper");
    const pageLabel = document.getElementById("sm-sessions-page-label");
    const prevBtn = document.getElementById("sm-sessions-prev");
    const nextBtn = document.getElementById("sm-sessions-next");

    const rows = buildSessionRows();
    const total = rows.length;

    if (!total) {
      wrapper.innerHTML = '<div class="sm-empty">No session logs recorded in the selected range.</div>';
      pageLabel.textContent = "Page 0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    sessionsPage = currentPage;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);

    let html = '<table class="sm-table"><thead><tr>' +
      "<th>#</th><th>Date</th><th>Start</th><th>Stop</th><th>Duration</th><th>Task Name</th>" +
      "</tr></thead><tbody>";

    slice.forEach((r, idx) => {
      html += "<tr>" +
        "<td>" + (start + idx + 1) + "</td>" +
        "<td>" + r.date + "</td>" +
        "<td>" + (r.start || "–") + "</td>" +
        "<td>" + (r.pause || "–") + "</td>" +
        "<td>" + (r.durationMs ? fmt(r.durationMs) : "–") + "</td>" +
        "<td>" + r.taskName + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    wrapper.innerHTML = html;

    pageLabel.textContent = "Page " + currentPage + " / " + totalPages;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  function buildCounterRows() {
    const { count, lastReset } = counter;
    const dateStr = lastReset || "Unknown";
    return [
      {
        date: dateStr,
        event: "Counter window",
        value: count,
        notes: "Daily submission counter since this reset date.",
      },
    ];
  }

  function renderCounterTable(page) {
    const wrapper = document.getElementById("sm-counter-table-wrapper");
    const pageLabel = document.getElementById("sm-counter-page-label");
    const prevBtn = document.getElementById("sm-counter-prev");
    const nextBtn = document.getElementById("sm-counter-next");

    const rows = buildCounterRows();
    const total = rows.length;

    if (!total) {
      wrapper.innerHTML = '<div class="sm-empty">No counter history available.</div>';
      pageLabel.textContent = "Page 0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    counterPage = currentPage;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);

    let html = '<table class="sm-table"><thead><tr>' +
      "<th>#</th><th>From Date</th><th>Event</th><th>Value</th><th>Notes</th>" +
      "</tr></thead><tbody>";

    slice.forEach((r, idx) => {
      html += "<tr>" +
        "<td>" + (start + idx + 1) + "</td>" +
        "<td>" + r.date + "</td>" +
        "<td>" + r.event + "</td>" +
        "<td>" + r.value + "</td>" +
        "<td>" + r.notes + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    wrapper.innerHTML = html;

    pageLabel.textContent = "Page " + currentPage + " / " + totalPages;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  let chartInstance = null;

  function renderChartAndMetrics() {
    const todayStr = today();
    const todayEntry = filteredEntries.find((e) => e.date === todayStr);
    const todayMs = todayEntry ? todayEntry.totalMs || 0 : 0;
    const targetMs = 8 * 3600 * 1000;

    const avgMs =
      filteredEntries.length
        ? filteredEntries.reduce((acc, e) => acc + (e.totalMs || 0), 0) /
          filteredEntries.length
        : 0;

    document.getElementById("sm-today-util").textContent = fmt(todayMs);
    const pct = targetMs ? Math.round((todayMs / targetMs) * 100) : 0;
    document.getElementById("sm-today-percent").textContent =
      (pct > 999 ? 999 : pct) + "%";
    document.getElementById("sm-avg-util").textContent = fmt(avgMs);

    const sorted = filteredEntries
      .map((e) => ({ ...e }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const labels = sorted.map((e) => e.date);
    const dataHours = sorted.map((e) => (e.totalMs || 0) / 3600000);

    const ctx = document.getElementById("sm-util-chart-30d").getContext("2d");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Utilization (hours)",
            data: dataHours,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { autoSkip: true, maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const hours = ctx.parsed.y || 0;
                const ms = hours * 3600000;
                return " " + fmt(ms) + " (" + hours.toFixed(2) + " h)";
              },
            },
          },
        },
      },
    });
  }

  function buildSummaryCsv(entries, fromVal, toVal) {
    const filtered = applyDateFilter(entries, fromVal, toVal);
    const rows = filtered
      .map((e) => ({ ...e }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const todayStr = today();
    let csv = "Date,Utilization (HH:MM:SS),Utilization (ms),Count\\n";
    rows.forEach((e) => {
      const ms = e.totalMs || 0;
      const count = e.date === todayStr ? counter.count : "";
      csv += e.date + "," + fmt(ms) + "," + ms + "," + count + "\\n";
    });
    return csv;
  }

  function buildSessionsCsv(entries, fromVal, toVal) {
    const filtered = applyDateFilter(entries, fromVal, toVal);
    const allSessions = [];
    filtered.forEach((e) => {
      (e.sessions || []).forEach((s) => {
        const start = s.start || "";
        const pause = s.pause || "";
        let durationMs = 0;
        if (start && pause) {
          const st = new Date(start).getTime();
          const pt = new Date(pause).getTime();
          if (isFinite(st) && isFinite(pt) && pt >= st) {
            durationMs = pt - st;
          }
        }
        allSessions.push({
          date: e.date,
          start,
          pause,
          durationMs,
        });
      });
    });
    allSessions.sort((a, b) => {
      const as = a.start || "";
      const bs = b.start || "";
      return as < bs ? -1 : as > bs ? 1 : 0;
    });
    let csv = "Date,Start,Stop,Duration (HH:MM:SS),Duration (ms)\\n";
    allSessions.forEach((s) => {
      csv +=
        s.date +
        "," +
        (s.start || "") +
        "," +
        (s.pause || "") +
        "," +
        (s.durationMs ? fmt(s.durationMs) : "") +
        "," +
        (s.durationMs || 0) +
        "\\n";
    });
    return csv;
  }

  function openCsvModal() {
    const backdrop = document.getElementById("sm-csv-modal-backdrop");
    const fromEl = document.getElementById("sm-csv-from");
    const toEl = document.getElementById("sm-csv-to");
    const filenameEl = document.getElementById("sm-csv-filename");
    const previewEl = document.getElementById("sm-csv-preview");

    let minDate = "";
    let maxDate = "";
    if (allEntries.length) {
      minDate = allEntries[0].date;
      maxDate = allEntries[allEntries.length - 1].date;
    }

    const filterFrom = document.getElementById("sm-date-from").value || "";
    const filterTo = document.getElementById("sm-date-to").value || "";

    fromEl.value = filterFrom || minDate;
    toEl.value = filterTo || maxDate;
    filenameEl.value = "sagemaker-utilization.csv";
    previewEl.value = "";

    backdrop.style.display = "flex";
  }

  function closeCsvModal() {
    const backdrop = document.getElementById("sm-csv-modal-backdrop");
    backdrop.style.display = "none";
  }

  function downloadCsvFromModal() {
    const mode = document.getElementById("sm-csv-mode").value;
    const fromVal = document.getElementById("sm-csv-from").value || "";
    const toVal = document.getElementById("sm-csv-to").value || "";
    const filename = document.getElementById("sm-csv-filename").value || "sagemaker-utilization.csv";

    let csv = "";
    if (mode === "sessions") {
      csv = buildSessionsCsv(allEntries, fromVal, toVal);
    } else {
      csv = buildSummaryCsv(allEntries, fromVal, toVal);
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function previewCsvFromModal() {
    const mode = document.getElementById("sm-csv-mode").value;
    const fromVal = document.getElementById("sm-csv-from").value || "";
    const toVal = document.getElementById("sm-csv-to").value || "";
    const previewEl = document.getElementById("sm-csv-preview");

    let csv = "";
    if (mode === "sessions") {
      csv = buildSessionsCsv(allEntries, fromVal, toVal);
    } else {
      csv = buildSummaryCsv(allEntries, fromVal, toVal);
    }
    previewEl.value = csv;
  }

  function rerenderAll() {
    renderUtilTable(utilPage);
    renderSessionsTable(sessionsPage);
    renderCounterTable(counterPage);
    renderChartAndMetrics();
  }

  function init() {
    document.getElementById("sm-workspace-subtitle").textContent =
      "Workspace: " + WORKSPACE_ID;

    const fromEl = document.getElementById("sm-date-from");
    const toEl = document.getElementById("sm-date-to");

    document.getElementById("sm-apply-filter").addEventListener("click", () => {
      const fromVal = fromEl.value;
      const toVal = toEl.value;
      filteredEntries = applyDateFilter(allEntries, fromVal, toVal);
      utilPage = sessionsPage = counterPage = 1;
      
    // Reset Counter
    document.getElementById("sm-reset-counter").addEventListener("click", () => {
        if(confirm("Reset counter to zero?")){
            localStorage.setItem("sm_count", "0");
            localStorage.setItem("sm_last_reset", JSON.stringify(new Date().toISOString().split("T")[0]));
            alert("Counter reset.");
            location.reload();
        }
    });
rerenderAll();
    });

    document.getElementById("sm-clear-filter").addEventListener("click", () => {
      fromEl.value = "";
      toEl.value = "";
      filteredEntries = allEntries.slice();
      utilPage = sessionsPage = counterPage = 1;
      rerenderAll();
    });

    document.getElementById("sm-refresh").addEventListener("click", () => {
      allEntries = loadWorkspaceEntries();
      filteredEntries = allEntries.slice();
      utilPage = sessionsPage = counterPage = 1;
      rerenderAll();
    });

    document.getElementById("sm-download-csv").addEventListener("click", openCsvModal);
    document.getElementById("sm-csv-close").addEventListener("click", closeCsvModal);
    document.getElementById("sm-csv-modal-backdrop").addEventListener("click", (e) => {
      if (e.target && e.target.id === "sm-csv-modal-backdrop") {
        closeCsvModal();
      }
    });
    document.getElementById("sm-csv-preview-btn").addEventListener("click", previewCsvFromModal);
    document.getElementById("sm-csv-download-btn").addEventListener("click", downloadCsvFromModal);

    document.getElementById("sm-util-prev").addEventListener("click", () => {
      if (utilPage > 1) {
        utilPage--;
        renderUtilTable(utilPage);
      }
    });
    document.getElementById("sm-util-next").addEventListener("click", () => {
      utilPage++;
      renderUtilTable(utilPage);
    });

    document.getElementById("sm-sessions-prev").addEventListener("click", () => {
      if (sessionsPage > 1) {
        sessionsPage--;
        renderSessionsTable(sessionsPage);
      }
    });
    document.getElementById("sm-sessions-next").addEventListener("click", () => {
      sessionsPage++;
      renderSessionsTable(sessionsPage);
    });

    document.getElementById("sm-counter-prev").addEventListener("click", () => {
      if (counterPage > 1) {
        counterPage--;
        renderCounterTable(counterPage);
      }
    });
    document.getElementById("sm-counter-next").addEventListener("click", () => {
      counterPage++;
      renderCounterTable(counterPage);
    });

    rerenderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
</script>
</body>
</html>
    `);
    w.document.close();
  }

  // ---------------- INLINE "View Log" HANDLER ----------------
  logBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openLogDashboard();
  });

  
  // ===================================================================
  //            DAILY SUBMISSION COUNTER (IMPROVED, SHARED FOOTER)
  // ===================================================================

  (function initSubmissionCounter() {
    // Only run in top window, avoid iframes
    if (window !== window.top) return;

    const COUNTER_CONFIG = {
      COUNT_KEY: "sm_count",
      LAST_RESET_KEY: "sm_last_reset",
      DISABLED_KEY: "sm_counter_disabled",
    };

    const counterStore = {
      get(key, fallback) {
        try {
          const v = localStorage.getItem(key);
          return v ? JSON.parse(v) : fallback;
        } catch {
          return fallback;
        }
      },
      set(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // ignore quota / disabled
        }
      },
    };

    const counterState = {
      count: counterStore.get(COUNTER_CONFIG.COUNT_KEY, 0),
      disabled: !!counterStore.get(COUNTER_CONFIG.DISABLED_KEY, false),
    };

    // Use the same "today()" helper as utilization timer
    function ensureDailyReset() {
      const todayKey = today();
      const last = counterStore.get(COUNTER_CONFIG.LAST_RESET_KEY, null);
      if (last !== todayKey) {
        counterStore.set(COUNTER_CONFIG.LAST_RESET_KEY, todayKey);
        setCount(0);
      }
    }

    // ---------- UI helpers ----------
    function renderCount() {
      const span = document.getElementById("sm-counter-label");
      if (span) span.textContent = ` | Count: ${counterState.count}`;
    }

    function setCount(next) {
      const safe =
        Number.isFinite(next) && typeof next === "number" ? Math.max(0, next) : 0;
      counterState.count = safe;
      counterStore.set(COUNTER_CONFIG.COUNT_KEY, safe);
      renderCount();
    }

    function createCounterUI() {
      const display = document.getElementById("sm-utilization");
      if (!display) return;
      if (document.getElementById("sm-counter-label")) return;

      const span = document.createElement("span");
      span.id = "sm-counter-label";
      span.textContent = ` | Count: ${counterState.count}`;
      span.style.userSelect = "none";

      const logBtn = document.getElementById("sm-log-btn");
      if (logBtn && logBtn.parentNode === display) {
        display.insertBefore(span, logBtn);
      } else {
        display.appendChild(span);
      }
    }

    // ---------- Count Logic ----------
    let lastKey = "";
    let lastKeyAt = 0;

    function shouldCount(url, method, status) {
      if (counterState.disabled) return false;
      if (!url || !method) return false;

      const m = method.toUpperCase();
      if (m !== "POST") return false;
      if (typeof status !== "number" || status < 200 || status >= 300) return false;

      // SageMaker "submit-and-start-next" endpoint pattern
      if (!/\/tasks\/[^/]+\/submit-and-start-next/i.test(url)) return false;

      return true;
    }

    function bump(url, method, status) {
      ensureDailyReset();

      const key = `${method.toUpperCase()} ${url} ${status}`;
      const now = Date.now();
      // Simple de-bounce: ignore duplicates within 800ms
      if (key === lastKey && now - lastKeyAt < 800) {
        return;
      }
      lastKey = key;
      lastKeyAt = now;
      setCount(counterState.count + 1);
    }

    // ---------- Network hooks ----------
    if (typeof window.fetch === "function") {
      const originalFetch = window.fetch;
      window.fetch = function (...args) {
        const [input, init] = args;
        let url = "";
        let method = (init && init.method) || "GET";

        try {
          if (typeof input === "string") {
            url = input;
          } else if (input && typeof input.url === "string") {
            url = input.url;
          }
        } catch {}

        return originalFetch.apply(this, args).then((response) => {
          try {
            if (shouldCount(url, method, response.status)) {
              bump(url, method, response.status);
            }
          } catch {}
          return response;
        });
      };
    }

    if (typeof XMLHttpRequest !== "undefined") {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      const meta = new WeakMap();

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        try {
          meta.set(this, { method, url });
        } catch {}
        return originalOpen.call(this, method, url, ...rest);
      };

      XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener("loadend", function () {
          try {
            const info = meta.get(this);
            if (!info) return;
            if (shouldCount(info.url, info.method, this.status)) {
              bump(info.url, info.method, this.status);
            }
          } catch {}
        });
        return originalSend.call(this, body);
      };
    }

    // ---------- Init UI ----------
    function initCounterUI() {
      function tryInit() {
        if (!document.body) {
          setTimeout(tryInit, 100);
          return;
        }
        const display = document.getElementById("sm-utilization");
        if (!display) {
          // utilization footer not attached yet; retry shortly
          setTimeout(tryInit, 300);
          return;
        }
        createCounterUI();
        renderCount();
      }
      tryInit();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initCounterUI, { once: true });
    } else {
      initCounterUI();
    }

    // Reset when day changes while tab is open / refocused
    window.addEventListener("focus", ensureDailyReset);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") ensureDailyReset();
    });
  })();

// ---------------- INIT TIMER ----------------
  function initTimer() {
    committedMs = loadToday();
    totalMs = committedMs;
    if (typeof hydrateFromHitState === "function") {
      currentHitId = getHitIdForPage();
      hydrateFromHitState();
    }
    render();
    attachToFooter();

    setTimeout(() => {
      if (typeof isHomePage === "function" && isHomePage()) {
        stopTimer(false);
        saveCurrentHit(null);
        return;
      }
      isTaskActive() ? startTimer() : stopTimer(false);
    }, 500);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initTimer, { once: true });
  else initTimer();

  // ===================================================================
  //                         END (UTILIZATION ONLY)
  // ===================================================================
})();
