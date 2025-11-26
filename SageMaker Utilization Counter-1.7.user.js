// ==UserScript==
// @name         Sagemaker Utilization Counter
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  Dashboard - Optimized for 8+ Hour Sessions
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @match        https://dcjt2af5rw.labeling.us-west-2.sagemaker.aws/*
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        none
// @run-at       document-idle
// @homepageURL  https://github.com/VigneshSankarP/Sagemaker_Tool
// @supportURL   https://github.com/VigneshSankarP/Sagemaker_Tool/issues
// @updateURL    https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/main/SageMaker%20Utilization%20Counter-1.7.meta.js
// @downloadURL  https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/main/SageMaker%20Utilization%20Counter-1.7.user.js
// ==/UserScript==

(function () {
  'use strict';

  if (window.__SM_TIMER_RUNNING__) return;
  window.__SM_TIMER_RUNNING__ = true;

  // ---------------------------------------------------------------------------
  // Minimal utilities (sanitization, compression, dom cache)
  // ---------------------------------------------------------------------------
  const sanitizeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const Compression = {
    compress(data) {
      try {
        const json = JSON.stringify(data);
        return btoa(encodeURIComponent(json));
      } catch (e) { return null; }
    },
    decompress(compressed) {
      try { return JSON.parse(decodeURIComponent(atob(compressed))); }
      catch (e) { return null; }
    }
  };

  const DOMCache = {
    elements: new Map(),
    get(selector, refresh = false) {
      if (refresh || !this.elements.has(selector)) this.elements.set(selector, document.querySelector(selector));
      return this.elements.get(selector);
    },
    getAll(selector, refresh = false) {
      const key = `all:${selector}`;
      if (refresh || !this.elements.has(key)) this.elements.set(key, document.querySelectorAll(selector));
      return this.elements.get(key);
    },
    clear() { this.elements.clear(); }
  };

  function fmt(seconds) {
    seconds = Math.max(0, Math.floor(+seconds || 0));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  }

  // ---------------------------------------------------------------------------
  // Config & keys
  // ---------------------------------------------------------------------------
  const CONFIG = {
    CHECK_INTERVAL_MS: 500,
    CHECK_INTERVAL_ACTIVE: 1000,
    CHECK_INTERVAL_IDLE: 3000,
    DAILY_ALERT_HOURS: 8,
    MAX_HISTORY_DAYS: 30,
    DEBUG: false,
    SESSIONS_LIMIT: 2000,
    ENABLE_ANALYTICS: true,
    AUTO_BACKUP_INTERVAL: 24 * 60 * 60 * 1000,
    TASK_NAME_CACHE_MS: 2000,
    TASK_NAME_RETRY_ATTEMPTS: 3,
    TASK_NAME_RETRY_DELAY: 500,
    MUTATION_OBSERVER_THROTTLE: 1000,
    BACKWARD_TIMER_THRESHOLD: 5, // seconds
    BODY_TEXT_CACHE_MS: 500 // NEW: Body text caching
  };

  const KEYS = {
    DAILY_COMMITTED: 'sm_daily_committed',
    LAST_DATE: 'sm_last_date',
    HISTORY: 'sm_history',
    COUNT: 'sm_count',
    LAST_RESET: 'sm_last_reset',
    IGNORE_TASK: 'sm_ignore_task',
    SESSIONS: 'sm_sessions',
    LAST_MIDNIGHT_CHECK: 'sm_last_midnight_check',
    ANALYTICS: 'sm_analytics',
    LAST_BACKUP: 'sm_last_backup',
    PREFERENCES: 'sm_preferences',
    AUTO_BACKUP: 'sm_auto_backup'
  };

  function log(...args) { if (CONFIG.DEBUG) console.log('[SM]', ...args); }

  // NEW: Body text caching for performance
  let bodyTextCache = { text: '', timestamp: 0 };
  function getBodyText() {
    const now = Date.now();
    if (bodyTextCache.text && (now - bodyTextCache.timestamp) < CONFIG.BODY_TEXT_CACHE_MS) {
      return bodyTextCache.text;
    }
    try {
      const text = document.body.innerText || document.body.textContent || '';
      bodyTextCache = { text, timestamp: now };
      return text;
    } catch (e) {
      return '';
    }
  }

  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
    catch (e) {
      log('store error', e);
      if (e.name === 'QuotaExceededError') {
        console.warn('[SM] Storage quota exceeded! Attempting cleanup...');
        try {
          const sessions = retrieve(KEYS.SESSIONS, []);
          if (sessions.length > 100) {
            // Smart trimming - keep recent + submitted tasks
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            const cutoffISO = cutoffDate.toISOString();

            const trimmed = sessions.filter(s => {
              if (s.date >= cutoffISO) return true;
              if (s.action === 'submitted') return true;
              return false;
            }).slice(0, 1000);

            localStorage.setItem(KEYS.SESSIONS, JSON.stringify(trimmed));
            console.log('[SM] Trimmed sessions from', sessions.length, 'to', trimmed.length);
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          }
        } catch (err) {
          console.error('[SM] Storage full! Please export data and reset.');
          alert('⚠️ Storage full! Please open dashboard and export your data.');
          return false;
        }
      }
      return false;
    }
  }

  function retrieve(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { log('retrieve error', e); return fallback; }
  }

  function storeCompressed(key, value) {
    try {
      const compressed = Compression.compress(value);
      if (compressed) {
        localStorage.setItem(key + '_compressed', compressed);
        localStorage.setItem(key + '_compressed_flag', 'true');
        return true;
      }
      return store(key, value);
    } catch (e) { return store(key, value); }
  }

  function retrieveCompressed(key, fallback = null) {
    try {
      const isCompressed = localStorage.getItem(key + '_compressed_flag');
      if (isCompressed) {
        const compressed = localStorage.getItem(key + '_compressed');
        if (compressed) {
          const decompressed = Compression.decompress(compressed);
          return decompressed || fallback;
        }
      }
      return retrieve(key, fallback);
    } catch (e) { return retrieve(key, fallback); }
  }

  function setIgnoreTask(taskId) {
    try { if (taskId == null) sessionStorage.removeItem(KEYS.IGNORE_TASK); else sessionStorage.setItem(KEYS.IGNORE_TASK, taskId); }
    catch (e) { log(e); }
  }
  function getIgnoreTask() { try { return sessionStorage.getItem(KEYS.IGNORE_TASK); } catch (e) { return null; } }

  // ---------------------------------------------------------------------------
  // Storage size warning
  // ---------------------------------------------------------------------------
  function checkStorageSize() {
    try {
      const size = JSON.stringify(localStorage).length;
      const maxSize = 5 * 1024 * 1024;
      const percent = (size / maxSize) * 100;
      if (percent > 90) {
        console.warn('[SM] Storage nearly full:', (size/1024).toFixed(2) + 'KB of ~5120KB (' + percent.toFixed(1) + '%)');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Error boundary
  // ---------------------------------------------------------------------------
  function withErrorBoundary(fn, context = 'operation') {
    return function(...args) {
      try { return fn.apply(this, args); }
      catch (error) {
        console.error(`[SM Error in ${context}]`, error);
        const analytics = retrieve(KEYS.ANALYTICS, {});
        analytics.errors = analytics.errors || [];
        analytics.errors.push({ context, message: error.message, stack: error.stack?.substring(0, 500), timestamp: new Date().toISOString() });
        if (analytics.errors.length > 50) analytics.errors = analytics.errors.slice(-50);
        store(KEYS.ANALYTICS, analytics);
        return null;
      }
    };
  }

  // Global error handler
  window.addEventListener('error', (e) => {
    console.error('[SM Global Error]', e.error);
    updateAnalytics('error', { message: e.message, filename: e.filename, lineno: e.lineno });
  });

  // ---------------------------------------------------------------------------
  // Task name detection with caching and retry
  // ---------------------------------------------------------------------------
  let taskNameCache = {
    taskId: null,
    name: null,
    timestamp: 0
  };

  function clearTaskNameCache() {
    taskNameCache = {
      taskId: null,
      name: null,
      timestamp: 0
    };
    DOMCache.clear();
    log('Task name cache cleared');
  }

  function getTaskName(forceRefresh = false) {
    try {
      const currentTaskId = getTaskIdFromUrl();
      const now = Date.now();

      if (!forceRefresh &&
          taskNameCache.taskId === currentTaskId &&
          taskNameCache.name &&
          (now - taskNameCache.timestamp) < CONFIG.TASK_NAME_CACHE_MS) {
        return taskNameCache.name;
      }

      if (taskNameCache.taskId && taskNameCache.taskId !== currentTaskId) {
        clearTaskNameCache();
      }

      // OPTIMIZED: Use cached body text
      const bodyText = getBodyText();

      // Method 1: Look for "Task description:" pattern
      let match = bodyText.match(/Task description:\s*([^\n]+)/i);
      if (match && match[1] && match[1].trim().length > 5 && match[1].trim().length < 200) {
        const detectedName = match[1].trim();
        taskNameCache = { taskId: currentTaskId, name: detectedName, timestamp: now };
        log('Task name detected (method 1):', detectedName);
        return detectedName;
      }

      // Method 2: Look for specific AWS Sagemaker selectors
      const selectors = [
        'p.awsui-util-d-ib',
        '.awsui-util-d-ib',
        '[class*="task-title"]',
        '[class*="task-description"]',
        '.cswui-header-name',
        'h1',
        'h2'
      ];

      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > 10 &&
              text.length < 200 &&
              !text.includes('\n') &&
              !text.toLowerCase().includes('task time') &&
              !text.toLowerCase().includes('utilization') &&
              !/^\d+:\d+/.test(text)) {
            const detectedName = text;
            taskNameCache = { taskId: currentTaskId, name: detectedName, timestamp: now };
            log('Task name detected (method 2):', detectedName);
            return detectedName;
          }
        }
      }

      // Method 3: Extract from URL if possible
      const taskParam = new URLSearchParams(window.location.search).get('task');
      if (taskParam && taskParam.length > 5) {
        const detectedName = `Task: ${taskParam}`;
        taskNameCache = { taskId: currentTaskId, name: detectedName, timestamp: now };
        log('Task name from URL:', detectedName);
        return detectedName;
      }

      // Fallback
      const fallbackName = `Task-${currentTaskId.substring(Math.max(0, currentTaskId.length - 8))}`;
      taskNameCache = { taskId: currentTaskId, name: fallbackName, timestamp: now };
      log('Task name fallback:', fallbackName);
      return fallbackName;

    } catch (e) {
      log('getTaskName error', e);
      return `Task-${Date.now().toString().slice(-6)}`;
    }
  }

  async function getTaskNameWithRetry(attempts = CONFIG.TASK_NAME_RETRY_ATTEMPTS) {
    for (let i = 0; i < attempts; i++) {
      const name = getTaskName(true);
      if (name && !name.startsWith('Task-')) {
        log(`✓ Task name found on attempt ${i + 1}:`, name);
        return name;
      }
      if (i < attempts - 1) {
        const delay = CONFIG.TASK_NAME_RETRY_DELAY * Math.pow(2, i);
        log(`Retrying task name detection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    const fallback = getTaskName(true);
    log('⚠️ Using fallback task name:', fallback);
    return fallback;
  }

  const Shield = (function() {
    window.__SM_DOM_EVENTS__ = window.__SM_DOM_EVENTS__ || [];
    function pushDom() { const now = performance.now(); window.__SM_DOM_EVENTS__.push(now); window.__SM_DOM_EVENTS__ = window.__SM_DOM_EVENTS__.filter(t => now - t < 1000); return window.__SM_DOM_EVENTS__.length; }
    return {
      pushDom,
      isLikelyVideoNoise() { const vids = document.querySelectorAll ? document.querySelectorAll('video').length : 0; const evs = window.__SM_DOM_EVENTS__.length; return (vids > 0 && evs > 25) || evs > 60; },
      containsAWSTimerKeywords(text) { if (!text) return false; const t = text.toLowerCase(); return t.includes('task') && (t.includes('time') || t.includes('min') || t.includes('sec')); }
    };
  })();

  // OPTIMIZED: Uses cached body text
  function parseAWSTimer() {
    try {
      const bodyText = getBodyText();
      const cleanText = bodyText.replace(/\s+/g, ' ').trim();
      if (!Shield.containsAWSTimerKeywords(cleanText)) return null;

      let m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+of\s+(\d+)\s*Min\s+(\d+)\s*Sec/i);
      if (m) { const current = (+m[1])*60 + (+m[2]); const limit = (+m[3])*60 + (+m[4]); return { current, limit, remaining: limit - current }; }
      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+(?:of|\/)\s+(\d+):(\d+)/i);
      if (m) { const current = (+m[1])*60 + (+m[2]); const limit = (+m[3])*60 + (+m[4]); return { current, limit, remaining: limit - current }; }
      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)/i);
      if (m) { const current = (+m[1])*60 + (+m[2]); return { current, limit: 3600, remaining: 3600 - current }; }
      return null;
    } catch (e) { log('parseAWSTimer err', e); return null; }
  }

  // OPTIMIZED: Uses cached body text
  function hasTaskExpiredOnPage() {
    try {
      const t = getBodyText().toLowerCase();
      if (!t) return false;
      return (t.includes('task has expired') || t.includes('task expired'));
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------------------------
  // Session validation
  // ---------------------------------------------------------------------------
  function validateSession(session) {
    if (!session || typeof session !== 'object') return false;
    if (!session.id || !session.date) return false;
    if (typeof session.duration !== 'number' || session.duration < 0 || session.duration > 86400) return false;
    if (!session.action || typeof session.action !== 'string') return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Sessions & analytics
  // ---------------------------------------------------------------------------
  function pushSessionRecord(rec) {
    try {
      const sessions = retrieve(KEYS.SESSIONS, []) || [];

      if (!rec.taskName) {
        if (activeTask && activeTask.taskName) {
          rec.taskName = activeTask.taskName;
        } else {
          rec.taskName = getTaskName(true);
        }
      }

      sessions.unshift(rec);
      if (sessions.length > CONFIG.SESSIONS_LIMIT) sessions.length = CONFIG.SESSIONS_LIMIT;
      store(KEYS.SESSIONS, sessions);
      log('Session recorded:', rec.taskName, rec.action);
    } catch (e) { log('pushSession err', e); }
  }

  function updateAnalytics(event, data = {}) {
    if (!CONFIG.ENABLE_ANALYTICS) return;
    try {
      const analytics = retrieve(KEYS.ANALYTICS, { total_tasks_completed: 0, total_tasks_skipped: 0, total_tasks_expired: 0, total_time_worked: 0, longest_session: 0, last_activity: null });
      const now = new Date();
      switch(event) {
        case 'task_completed': analytics.total_tasks_completed++; analytics.total_time_worked += (data.duration || 0); if (data.duration > analytics.longest_session) analytics.longest_session = data.duration; break;
        case 'task_skipped': analytics.total_tasks_skipped++; break;
        case 'task_expired': analytics.total_tasks_expired++; break;
      }
      analytics.last_activity = now.toISOString();
      store(KEYS.ANALYTICS, analytics);
    } catch (e) {
      log('updateAnalytics error', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Validation & diagnostics
  // ---------------------------------------------------------------------------
  function validateAndFixData() {
    log('Running data validation...');
    const issues = [];
    let committed = retrieve(KEYS.DAILY_COMMITTED, 0);
    if (committed < 0) { issues.push('Negative time detected - resetting to 0'); store(KEYS.DAILY_COMMITTED, 0); committed = 0; }
    if (committed > 86400) { issues.push('Time exceeds 24 hours - capping at 24h'); store(KEYS.DAILY_COMMITTED, 86400); }

    let count = retrieve(KEYS.COUNT, 0);
    if (count < 0) { issues.push('Negative count detected - resetting to 0'); store(KEYS.COUNT, 0); }

    const history = retrieve(KEYS.HISTORY, {});
    let historyFixed = false;
    for (const [date, value] of Object.entries(history)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { issues.push(`Invalid date format: ${date} - removing`); delete history[date]; historyFixed = true; }
      if (value < 0 || value > 86400) { issues.push(`Invalid time for ${date}: ${value} - capping`); history[date] = Math.max(0, Math.min(86400, value)); historyFixed = true; }
    }
    if (historyFixed) store(KEYS.HISTORY, history);

    const sessions = retrieve(KEYS.SESSIONS, []);
    if (!Array.isArray(sessions)) {
      issues.push('Sessions corrupted - resetting');
      store(KEYS.SESSIONS, []);
    } else {
      const validSessions = sessions.filter(validateSession);
      if (validSessions.length !== sessions.length) {
        issues.push(`Removed ${sessions.length - validSessions.length} invalid sessions`);
        store(KEYS.SESSIONS, validSessions);
      }
    }

    if (issues.length > 0) log('Data issues found and fixed:', issues); else log('Data validation passed ✓');

    checkStorageSize();

    return issues;
  }

  function runDiagnostics() {
    const diag = {
      version: '3.7-ultra-stable',
      localStorage_size: (JSON.stringify(localStorage).length / 1024).toFixed(2) + ' KB',
      localStorage_percent: ((JSON.stringify(localStorage).length / (5 * 1024 * 1024)) * 100).toFixed(1) + '%',
      active_task: activeTask ? 'Yes (' + fmt(activeTask.awsCurrent) + ')' : 'No',
      active_task_name: activeTask ? activeTask.taskName : 'N/A',
      active_task_status: activeTask ? activeTask.status : 'N/A',
      cached_task_name: taskNameCache.name || 'N/A',
      cache_age_ms: taskNameCache.timestamp ? Date.now() - taskNameCache.timestamp : 'N/A',
      body_text_cache_age: bodyTextCache.timestamp ? Date.now() - bodyTextCache.timestamp : 'N/A',
      is_task_page: isTaskPage(),
      is_home_page: isHomePage(),
      daily_committed: fmt(retrieve(KEYS.DAILY_COMMITTED, 0)),
      count: retrieve(KEYS.COUNT, 0),
      sessions_count: (retrieve(KEYS.SESSIONS, []) || []).length,
      last_aws_timer: lastAWSData ? fmt(lastAWSData.current) + ' / ' + fmt(lastAWSData.limit) : 'N/A',
      observers_active: !!(footerObserver && buttonsObserver)
    };
    console.log('=== SAGEMAKER DIAGNOSTICS (ULTRA-STABLE) ===');
    console.table(diag);

    console.log('\n=== HEALTH CHECKS ===');
    console.log('✓ LocalStorage available:', typeof localStorage !== 'undefined');
    console.log('✓ SessionStorage available:', typeof sessionStorage !== 'undefined');
    console.log('✓ Footer observer active:', !!footerObserver);
    console.log('✓ Buttons observer active:', !!buttonsObserver);
    console.log('✓ Task name cache:', taskNameCache.name ? 'CACHED' : 'EMPTY');
    console.log('✓ Body text cache:', bodyTextCache.text ? 'ACTIVE' : 'EMPTY');
    console.log('✓ Home floating icon:', !!document.getElementById('sm-home-floating-icon'));

    const analytics = retrieve(KEYS.ANALYTICS, {});
    if (analytics && Object.keys(analytics).length > 0) {
      console.log('\n=== ANALYTICS SUMMARY ===');
      console.log('Total tasks completed:', analytics.total_tasks_completed || 0);
      console.log('Total tasks skipped:', analytics.total_tasks_skipped || 0);
      console.log('Total tasks expired:', analytics.total_tasks_expired || 0);
      console.log('Total time worked:', fmt(analytics.total_time_worked || 0));
      console.log('Longest session:', fmt(analytics.longest_session || 0));
      console.log('Last activity:', analytics.last_activity || 'N/A');
    }

    console.log('\n✅ Diagnostics complete! (Ultra-Stable Version)');
    return diag;
  }

  // ---------------------------------------------------------------------------
  // Task management
  // ---------------------------------------------------------------------------
  let activeTask = null;
  let lastTaskId = null;

  function getTaskIdFromUrl() { return window.location.pathname + window.location.search; }

  function startNewTaskFromAWS(awsData) {
    const id = getTaskIdFromUrl();

    if (lastTaskId && lastTaskId !== id) {
      clearTaskNameCache();
    }

    const taskName = getTaskName(true);
    activeTask = {
      id,
      taskName,
      awsCurrent: awsData.current,
      awsLimit: awsData.limit,
      lastAws: awsData.current,
      status: 'active',
      createdAt: Date.now(),
      taskNameRefreshed: Date.now()
    };
    lastTaskId = id;

    getTaskNameWithRetry().then(betterName => {
      if (activeTask && activeTask.id === id && betterName !== taskName && !betterName.startsWith('Task-')) {
        activeTask.taskName = betterName;
        log('✓ Task name improved:', betterName);
      }
    }).catch(err => log('Task name retry failed:', err));

    log('✅ New task started:', taskName, 'ID:', id);
    return activeTask;
  }

  function updateActiveTaskFromAWS(awsData) {
    if (!activeTask) return startNewTaskFromAWS(awsData);
    const id = getTaskIdFromUrl();

    if (activeTask.id !== id) {
      clearTaskNameCache();
      activeTask = null;
      return startNewTaskFromAWS(awsData);
    }

    if (typeof awsData.current === 'number') {
      activeTask.status = awsData.current === activeTask.lastAws ? 'paused' : 'active';
      activeTask.awsCurrent = awsData.current;
      activeTask.awsLimit = awsData.limit;
      activeTask.lastAws = awsData.current;

      if (!activeTask.taskNameRefreshed || (Date.now() - activeTask.taskNameRefreshed) > 5000) {
        const refreshedName = getTaskName(true);
        if (refreshedName && refreshedName !== activeTask.taskName && !refreshedName.startsWith('Task-')) {
          log('✓ Task name refreshed:', refreshedName);
          activeTask.taskName = refreshedName;
        }
        activeTask.taskNameRefreshed = Date.now();
      }
    }
    return activeTask;
  }

  // ---------------------------------------------------------------------------
  // Reset functions
  // ---------------------------------------------------------------------------
  let resetInProgress = false;
  let lastResetTime = 0; // NEW: Debounce reset

  function performReset(resetType = 'both', source = 'manual') {
    if (resetInProgress) return false;
    resetInProgress = true;
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const previousTimer = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;

      if (source === 'auto' || source === 'midnight') {
        const lastDate = retrieve(KEYS.LAST_DATE);
        if (previousTimer > 0 && lastDate && lastDate !== currentDate) {
          saveToHistory(lastDate, previousTimer);
        }
      }

      switch(resetType) {
        case 'timer': store(KEYS.DAILY_COMMITTED, 0); break;
        case 'counter': store(KEYS.COUNT, 0); break;
        case 'both': default: store(KEYS.DAILY_COMMITTED, 0); store(KEYS.COUNT, 0); break;
      }

      store(KEYS.LAST_DATE, currentDate);
      store(KEYS.LAST_RESET, new Date().toISOString());

      if (resetType === 'both' || source === 'auto' || source === 'midnight') {
        setIgnoreTask(null);
        clearTaskNameCache();
        if (activeTask) {
          pushSessionRecord({
            id: activeTask.id,
            taskName: activeTask.taskName,
            date: new Date().toISOString(),
            duration: activeTask.awsCurrent || 0,
            action: source === 'manual' ? `manual_reset_${resetType}` : 'midnight_reset'
          });
          activeTask = null;
          lastTaskId = null;
        }
      }

      updateDisplay();
      updateHomeFloatingIcon();
      log('✓ Reset completed:', resetType, source);
      return true;
    } finally {
      resetInProgress = false;
    }
  }

  function saveToHistory(dateStr, totalSeconds) {
    const history = retrieve(KEYS.HISTORY, {}) || {};
    history[dateStr] = totalSeconds;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFIG.MAX_HISTORY_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    for (const d in history) {
      if (d < cutoffStr) delete history[d];
    }
    store(KEYS.HISTORY, history);
    log('✓ Saved to history:', dateStr, fmt(totalSeconds));
  }

  function checkDailyReset() {
    const currentDate = new Date().toISOString().split('T')[0];
    const lastDate = retrieve(KEYS.LAST_DATE);

    if (lastDate !== currentDate) {
      log('📅 New day detected - performing reset');
      const previousTotal = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
      if (previousTotal > 0 && lastDate) {
        saveToHistory(lastDate, previousTotal);
      }
      performReset('both', 'auto');
      return 0;
    }
    return retrieve(KEYS.DAILY_COMMITTED, 0);
  }

  function checkDailyAlert(totalSeconds) {
    if (!CONFIG.DAILY_ALERT_HOURS || CONFIG.DAILY_ALERT_HOURS <= 0) return;
    const threshold = CONFIG.DAILY_ALERT_HOURS * 3600;
    const key = `sm_alert_${new Date().toISOString().split('T')[0]}`;
    if (totalSeconds >= threshold && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      log(`🎯 Daily goal of ${CONFIG.DAILY_ALERT_HOURS} hours reached!`);
    }
  }

  setInterval(() => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const lastDate = retrieve(KEYS.LAST_DATE);
      if (lastDate && lastDate !== currentDate) {
        log('⏰ Midnight check triggered');
        checkDailyReset();
      }
    } catch (e) {
      console.error('[SM] Midnight check error:', e);
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // Commit & Discard
  // ---------------------------------------------------------------------------
  function commitActiveTask() {
    if (!activeTask) return 0;
    const finalElapsed = activeTask.awsCurrent || 0;

    if (finalElapsed <= 0) {
      activeTask = null;
      lastTaskId = null;
      clearTaskNameCache();
      return 0;
    }

    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const newTotal = committed + finalElapsed;
    store(KEYS.DAILY_COMMITTED, newTotal);
    saveToHistory(new Date().toISOString().split('T')[0], newTotal);
    checkDailyAlert(newTotal);

    const c = (retrieve(KEYS.COUNT, 0) || 0) + 1;
    store(KEYS.COUNT, c);

    const finalTaskName = activeTask.taskName || getTaskName(true);

    pushSessionRecord({
      id: activeTask.id,
      taskName: finalTaskName,
      date: new Date().toISOString(),
      duration: finalElapsed,
      action: 'submitted'
    });

    updateAnalytics('task_completed', { duration: finalElapsed });

    const id = activeTask.id;
    activeTask = null;
    lastTaskId = null;
    clearTaskNameCache();

    if (getIgnoreTask() === id) setIgnoreTask(null);

    log('✅ Task committed:', finalTaskName, fmt(finalElapsed));
    return finalElapsed;
  }

  function discardActiveTask(reason) {
    if (!activeTask) return;

    const taskName = activeTask.taskName || getTaskName(true);
    const rec = {
      id: activeTask.id,
      taskName: taskName,
      date: new Date().toISOString(),
      duration: activeTask.awsCurrent || 0,
      action: reason || 'discarded'
    };

    pushSessionRecord(rec);

    if (reason === 'expired') updateAnalytics('task_expired');
    else if (reason === 'skipped') updateAnalytics('task_skipped');

    const id = activeTask.id;
    activeTask = null;
    lastTaskId = null;
    clearTaskNameCache();

    try { setIgnoreTask(id); } catch (e) {}

    log('⚠️ Task discarded:', taskName, reason);
  }

  // ---------------------------------------------------------------------------
  // Submission interception
  // ---------------------------------------------------------------------------
  function initSubmissionInterceptor() {
    if (typeof window.fetch === 'function') {
      const origFetch = window.fetch;
      window.fetch = function(...args) {
        return origFetch.apply(this, args).then(response => {
          try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
            const method = args[1]?.method || 'GET';
            if (method.toUpperCase() === 'POST' && response.ok && /submit|complete|finish/i.test(url)) {
              setTimeout(() => {
                log('📤 Submission detected via fetch');
                commitActiveTask();
                updateDisplay();
                updateHomeFloatingIcon();
              }, 100);
            }
          } catch (e) {
            log('Fetch intercept error:', e);
          }
          return response;
        }).catch(error => {
          throw error;
        });
      };
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      const meta = new WeakMap();
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        meta.set(this, { method, url });
        return origOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function(body) {
        this.addEventListener('loadend', function() {
          try {
            const info = meta.get(this);
            if (info && info.method.toUpperCase() === 'POST' && this.status >= 200 && this.status < 300 && /submit|complete|finish/i.test(info.url)) {
              setTimeout(() => {
                log('📤 Submission detected via XHR');
                commitActiveTask();
                updateDisplay();
                updateHomeFloatingIcon();
              }, 100);
            }
          } catch (e) {
            log('XHR intercept error:', e);
          }
        });
        return origSend.call(this, body);
      };
    }
  }

  initSubmissionInterceptor();

  // ---------------------------------------------------------------------------
  // Home Page Detection & Floating Icon
  // ---------------------------------------------------------------------------
  function isHomePage() {
    try {
      const url = window.location.href.toLowerCase();
      const path = window.location.pathname.toLowerCase();

      if (url.includes('/labeling-jobs') || url.includes('/jobs') || path === '/' || path === '') {
        return true;
      }

      const bodyText = getBodyText(); // OPTIMIZED: Use cached text
      if (bodyText.includes('Jobs (') || bodyText.includes('Task title') || bodyText.includes('Customer ID')) {
        return true;
      }

      const hasJobsTable = document.querySelector('table') &&
                          (document.querySelector('th')?.innerText.includes('Task title') ||
                           document.querySelector('th')?.innerText.includes('Status'));

      if (hasJobsTable) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  const homeFloatingIcon = document.createElement('div');
homeFloatingIcon.id = 'sm-home-floating-icon';
homeFloatingIcon.innerHTML = `
  <style>
    #sm-home-floating-icon {
      position: fixed;
      bottom: 20px;
      left: 20px;
      min-width: 160px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      display: none;
      padding: 12px 14px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: slideIn 0.4s ease-out;
      font-family: system-ui, -apple-system, sans-serif;
    }

    @keyframes slideIn {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    #sm-home-floating-icon:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 10px 32px rgba(102, 126, 234, 0.5);
    }

    #sm-home-floating-icon:active {
      transform: translateY(-1px) scale(0.99);
    }

    .floating-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      color: white;
    }

    .floating-icon {
      font-size: 20px;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
    }

    .floating-title {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.95);
      letter-spacing: 0.3px;
    }

    .floating-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .stat-box {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.2s;
    }

    .stat-box:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }

    .stat-label {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 900;
      color: white;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      font-family: 'Courier New', monospace;
      line-height: 1;
    }

    .floating-footer {
      margin-top: 8px;
      text-align: center;
      font-size: 9px;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
    }

    .pulse-indicator {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      margin-right: 4px;
      animation: pulse 2s infinite;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      #sm-home-floating-icon {
        min-width: 140px;
        padding: 10px 12px;
        bottom: 16px;
        left: 16px;
      }

      .floating-title {
        font-size: 10px;
      }

      .stat-value {
        font-size: 14px;
      }

      .stat-label {
        font-size: 8px;
      }
    }
  </style>
  <div class="floating-header">
    <div class="floating-icon">🤖</div>
    <div class="floating-title">SAGEMAKER STATS</div>
  </div>
  <div class="floating-stats">
    <div class="stat-box">
      <div class="stat-label">⏱️ Time</div>
      <div class="stat-value" id="home-time-display">00:00:00</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">📊 Tasks</div>
      <div class="stat-value" id="home-count-display">0</div>
    </div>
  </div>
  <div class="floating-footer">
    <span class="pulse-indicator"></span>Click for details
  </div>
`;

  document.body.appendChild(homeFloatingIcon);

  homeFloatingIcon.addEventListener('click', () => {
    showUltraPremiumDashboard();
  });

  function updateHomeFloatingIcon() {
  try {
    const isHome = isHomePage();
    const isTask = isTaskPage();

    if (isHome && !isTask) {
      homeFloatingIcon.style.display = 'block';

      const count = retrieve(KEYS.COUNT, 0) || 0;
      const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;

      const timeDisplay = document.getElementById('home-time-display');
      const countDisplay = document.getElementById('home-count-display');

      if (timeDisplay) {
        timeDisplay.textContent = fmt(committed);
      }
      if (countDisplay) {
        countDisplay.textContent = count;
      }

      log('✓ Home icon updated - Time:', fmt(committed), 'Count:', count);
    } else {
      homeFloatingIcon.style.display = 'none';
    }
  } catch (e) {
    log('updateHomeFloatingIcon error:', e);
  }
}
  // ---------------------------------------------------------------------------
  // Tracking loop + UI (Task Page)
  // ---------------------------------------------------------------------------
  let lastAWSData = null;
  let lastDisplayedTotal = -1;

  const display = document.createElement('div');
  display.id = 'sm-utilization';
  Object.assign(display.style, {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'inherit',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    opacity: '0.92',
    pointerEvents: 'auto',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    display: 'none',
    alignItems: 'center',
    gap: '0px',
    zIndex: '9999'
  });

  const timerContainer = document.createElement('div');
  timerContainer.style.cssText = 'display: inline-block; position: relative;';
  const timerTextSpan = document.createElement('span');
  timerTextSpan.id = 'sm-timer-text';
  timerTextSpan.textContent = 'Utilization: 00:00:00';
  timerContainer.appendChild(timerTextSpan);

  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; margin-top: 1px; height: 4px; background: rgba(0,0,0,0.15); border-radius: 2px; overflow: hidden;';
  const progressBar = document.createElement('div');
  progressBar.id = 'sm-progress-bar';
  progressBar.style.cssText = 'height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6); width: 0%; transition: width 0.5s ease, background 0.3s ease; box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);';
  progressContainer.appendChild(progressBar);
  timerContainer.appendChild(progressContainer);
  display.appendChild(timerContainer);

  const countLabel = document.createElement('span');
  countLabel.id = 'sm-count-label';
  countLabel.textContent = ' | Count: 0';
  countLabel.style.marginLeft = '8px';
  display.appendChild(countLabel);

  let footerObserver = null;
  let buttonsObserver = null;
  let attachFooterTimeout = null;
  let wireButtonsTimeout = null;

  function cleanupObservers() {
    try {
      if (footerObserver) {
        footerObserver.disconnect();
        footerObserver = null;
      }
      if (buttonsObserver) {
        buttonsObserver.disconnect();
        buttonsObserver = null;
      }
      if (attachFooterTimeout) {
        clearTimeout(attachFooterTimeout);
        attachFooterTimeout = null;
      }
      if (wireButtonsTimeout) {
        clearTimeout(wireButtonsTimeout);
        wireButtonsTimeout = null;
      }
      log('✓ Observers cleaned up');
    } catch (e) {
      log('Cleanup error:', e);
    }
  }

  function attachToFooter() {
    if (!isTaskPage()) return;
    const footer = document.querySelector('.cswui-footer, .awsui-footer, footer') || document.body;
    if (!footer) return;
    if (getComputedStyle(footer).position === 'static') footer.style.position = 'relative';
    if (!footer.contains(display)) footer.appendChild(display);
    if (!display.querySelector('#sm-log-btn')) {
      const btn = document.createElement('button');
      btn.id = 'sm-log-btn';
      btn.innerHTML = '🤖';
      btn.title = 'Open Dashboard (Ctrl+Shift+U)';
      Object.assign(btn.style, {
        marginLeft: '8px',
        padding: '6px 12px',
        borderRadius: '6px',
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600',
        transition: 'all 0.2s'
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.4)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
      });
      btn.addEventListener('click', showUltraPremiumDashboard);
      display.appendChild(btn);
    }
  }

  footerObserver = new MutationObserver(() => {
    if (attachFooterTimeout) return;
    attachFooterTimeout = setTimeout(() => {
      try {
        attachToFooter();
      } catch (e) {
        log('attachToFooter error:', e);
      } finally {
        attachFooterTimeout = null;
      }
    }, CONFIG.MUTATION_OBSERVER_THROTTLE);
  });
  footerObserver.observe(document.body, { childList: true, subtree: true });

  function updateDisplay() {
    try {
      const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
      let pending = 0;
      if (activeTask && (activeTask.status === 'active' || activeTask.status === 'paused')) {
        pending = activeTask.awsCurrent || 0;
      }
      const total = committed + pending;

      if (total !== lastDisplayedTotal) {
        const timerText = document.getElementById('sm-timer-text');
        if (timerText) timerText.textContent = `Utilization: ${fmt(total)}`;
        lastDisplayedTotal = total;
      }

      const countLabelEl = document.getElementById('sm-count-label');
      if (countLabelEl) {
        const currentCount = retrieve(KEYS.COUNT, 0) || 0;
        countLabelEl.textContent = ` | Count: ${currentCount}`;
      }

      const bar = document.getElementById('sm-progress-bar');
      if (bar) {
        const targetSeconds = CONFIG.DAILY_ALERT_HOURS * 3600;
        const percent = Math.min(100, (total / targetSeconds) * 100);
        bar.style.width = `${percent}%`;

        if (percent < 50) {
          bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        } else if (percent < 80) {
          bar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        } else {
          bar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        }
      }

      updateHomeFloatingIcon();
    } catch (e) {
      log('updateDisplay error:', e);
    }
  }

  // OPTIMIZED: Better event listener management
  function wireTaskActionButtons() {
    try {
      const btns = document.querySelectorAll('button, [role="button"]');
      btns.forEach((el) => {
        try {
          // Skip if already processed
          if (el.getAttribute('data-sm-id')) return;

          const raw = (el.innerText || '').toLowerCase();
          if (!raw) return;

          // Mark as processed FIRST
          const btnId = `btn_${Date.now()}_${Math.random()}`;
          el.setAttribute('data-sm-id', btnId);

          if (raw.includes('submit') || raw.includes('complete')) {
            const submitHandler = () => {
              setTimeout(() => {
                log('🖱️ Submit button clicked');
                commitActiveTask();
                updateDisplay();
              }, 100);
            };
            el.addEventListener('click', submitHandler);
          }

          if (raw.includes('skip')) {
            const skipHandler = () => {
              log('🖱️ Skip button clicked');
              discardActiveTask('skipped');
              updateDisplay();
            };
            el.addEventListener('click', skipHandler);
          }
        } catch (e) {}
      });
    } catch (e) {
      log('wireTaskActionButtons error:', e);
    }
  }

  buttonsObserver = new MutationObserver(() => {
    if (wireButtonsTimeout) return;
    wireButtonsTimeout = setTimeout(() => {
      try {
        wireTaskActionButtons();
      } catch (e) {
        log('wireTaskActionButtons error:', e);
      } finally {
        wireButtonsTimeout = null;
      }
    }, 500);
  });
  buttonsObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('beforeunload', () => {
    cleanupObservers();
  });

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  function aggregateTodayTaskData() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => {
      if (!validateSession(s)) return false;
      try {
        return new Date(s.date).toISOString().split('T')[0] === today;
      } catch (e) {
        return false;
      }
    });

    const taskMap = new Map();
    todaySessions.forEach(session => {
      const taskName = session.taskName || 'Unknown Task';
      if (!taskMap.has(taskName)) {
        taskMap.set(taskName, {
          taskName,
          totalTime: 0,
          totalSessions: 0,
          submitted: 0,
          skipped: 0,
          expired: 0,
          lastWorked: null
        });
      }
      const task = taskMap.get(taskName);
      if (session.action === 'submitted') task.totalTime += (session.duration || 0);
      task.totalSessions++;
      if (session.action === 'submitted') task.submitted++;
      else if (session.action === 'skipped') task.skipped++;
      else if (session.action === 'expired') task.expired++;

      const sessionDate = new Date(session.date);
      if (!task.lastWorked || sessionDate > new Date(task.lastWorked)) {
        task.lastWorked = session.date;
      }
    });

    return Array.from(taskMap.values()).map(task => ({
      ...task,
      avgTime: task.submitted > 0 ? Math.round(task.totalTime / task.submitted) : 0,
      successRate: task.totalSessions > 0 ? Math.round((task.submitted / task.totalSessions) * 100) : 0
    }));
  }

  function getTodaySessions() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(s => {
      if (!validateSession(s)) return false;
      try {
        return new Date(s.date).toISOString().split('T')[0] === today;
      } catch (e) {
        return false;
      }
    });
  }

  function getLast7DaysData() {
    const history = retrieve(KEYS.HISTORY, {}) || {};
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const time = history[dateStr] || 0;
      const daySessions = sessions.filter(s => {
        if (!validateSession(s)) return false;
        try {
          return new Date(s.date).toISOString().split('T')[0] === dateStr && s.action === 'submitted';
        } catch (e) {
          return false;
        }
      });
      last7Days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: time,
        count: daySessions.length
      });
    }
    return last7Days;
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'u': e.preventDefault(); showUltraPremiumDashboard(); break;
        case 'r': e.preventDefault(); showResetDialog(); break;
        case 'd': e.preventDefault(); runDiagnostics(); break;
      }
    }
  });

  let currentSessionPage = 1;
  const SESSIONS_PER_PAGE = 10;

  function showUltraPremiumDashboard() {
    const existing = document.getElementById('sm-ultra-dashboard');
    if (existing) { existing.remove(); return; }

    const root = document.createElement('div');
    root.id = 'sm-ultra-dashboard';
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;
    const todayTasks = aggregateTodayTaskData();
    const todaySessions = getTodaySessions();
    const last7Days = getLast7DaysData();

    root.innerHTML = `
      <style>
        #sm-ultra-dashboard{position:fixed;inset:0;z-index:999999;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);overflow-y:auto}
        .dashboard-container{max-width:1600px;margin:20px auto;padding:20px;background:rgba(255,255,255,0.95);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
        .dashboard-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}
        .dashboard-title{font-size:24px;font-weight:800;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .btn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-weight:600;transition:all 0.2s;font-size:14px}
        .btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
        .btn-primary{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white}
        .btn-danger{background:#ef4444;color:white}
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px}
        .stat-card{padding:16px;background:white;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:transform 0.2s}
        .stat-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.12)}
        .stat-label{font-size:13px;color:#6b7280;font-weight:500;margin-bottom:4px}
        .stat-value{font-size:28px;font-weight:900;color:#1f2937}
        .stat-subtitle{font-size:12px;color:#9ca3af;margin-top:4px}
        .content-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px}
        .card{background:white;padding:16px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
        .card-title{font-weight:700;font-size:16px;margin-bottom:12px;color:#1f2937}
        table{width:100%;border-collapse:collapse;font-size:14px}
        thead{background:#f9fafb;border-bottom:2px solid #e5e7eb}
        th{padding:10px 8px;text-align:left;font-weight:600;color:#4b5563;font-size:13px}
        td{padding:10px 8px;border-bottom:1px solid #f3f4f6;color:#374151}
        tbody tr:hover{background:#f9fafb}
        .empty-state{padding:40px 20px;text-align:center;color:#9ca3af;font-size:14px}
        .day-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
        .day-name{color:#6b7280;font-weight:500}
        .day-time{font-weight:700;color:#1f2937}
        .week-total{font-weight:700;padding-top:12px;margin-top:8px;border-top:2px solid #e5e7eb;font-size:15px;color:#1f2937}
        .pagination{margin-top:12px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
        .pagination button{padding:6px 12px;border:1px solid #e5e7eb;background:white;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
        .pagination button:hover{background:#f3f4f6}
        .pagination button:disabled{background:#8b5cf6;color:white;cursor:default}
        @media(max-width:1024px){.content-grid{grid-template-columns:1fr}}
      </style>
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="dashboard-title">🤖 Sagemaker Dashboard <span style="font-size:12px;color:#6b7280">(Ultra-Stable)</span></div>
          <div style="display:flex;gap:8px;">
            <button id="reset-btn" class="btn btn-primary">🔄 Reset</button>
            <button id="diagnostics-btn" class="btn btn-primary">🔍 Diagnostics</button>
            <button id="close-dashboard" class="btn btn-danger">✕ Close</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Today's Progress</div>
            <div class="stat-value">${sanitizeHTML(fmt(committed))}</div>
            <div class="stat-subtitle">${count} submissions</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tasks Worked</div>
            <div class="stat-value">${todayTasks.length}</div>
            <div class="stat-subtitle">unique tasks today</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Sessions</div>
            <div class="stat-value">${todaySessions.length}</div>
            <div class="stat-subtitle">activity logs today</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Weekly Total</div>
            <div class="stat-value">${sanitizeHTML(fmt(last7Days.reduce((s,d)=>s+d.time,0)))}</div>
            <div class="stat-subtitle">last 7 days</div>
          </div>
        </div>

        <div class="content-grid">
          <div class="card">
            <div class="card-title">📊 Today's Task Breakdown</div>
            ${todayTasks.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Total Time</th>
                    <th>Submitted</th>
                    <th>Avg Time</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${todayTasks.map(t => `
                    <tr>
                      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${sanitizeHTML(t.taskName)}">${sanitizeHTML(t.taskName)}</td>
                      <td style="font-weight:600">${sanitizeHTML(fmt(t.totalTime))}</td>
                      <td>${t.submitted}</td>
                      <td>${sanitizeHTML(fmt(t.avgTime))}</td>
                      <td><span style="color:${t.successRate >= 80 ? '#10b981' : t.successRate >= 50 ? '#f59e0b' : '#ef4444'};font-weight:700">${t.successRate}%</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="empty-state">🎯 No tasks completed today. Start working to see your stats!</div>'}
          </div>

          <div class="card">
            <div class="card-title">📅 Last 7 Days</div>
            <div style="margin-top:8px">
              ${last7Days.map(d => `
                <div class="day-row">
                  <div class="day-name">${sanitizeHTML(d.dayName)}</div>
                  <div class="day-time">${sanitizeHTML(fmt(d.time))}</div>
                </div>
              `).join('')}
              <div class="week-total">
                <div style="display:flex;justify-content:space-between">
                  <div>Total</div>
                  <div>${sanitizeHTML(fmt(last7Days.reduce((s,d)=>s+d.time,0)))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${todaySessions.length > 0 ? `
          <div class="card" style="margin-top:16px">
            <div class="card-title">📝 Today's Sessions (${todaySessions.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Task Name</th>
                  <th>Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="sessions-tbody"></tbody>
            </table>
            <div id="sessions-pagination" class="pagination"></div>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(root);

    if (todaySessions.length > 0) {
      renderSessionsPage(todaySessions, 1);
    }

    root.querySelector('#close-dashboard').addEventListener('click', () => {
      root.remove();
      document.removeEventListener('keydown', escHandler);
    });

    root.querySelector('#reset-btn').addEventListener('click', () => {
      showResetDialog();
    });

    root.querySelector('#diagnostics-btn').addEventListener('click', () => {
      runDiagnostics();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        root.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function renderSessionsPage(sessions, page) {
    const tbody = document.getElementById('sessions-tbody');
    const pagination = document.getElementById('sessions-pagination');
    if (!tbody) return;

    const totalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
    const startIdx = (page - 1) * SESSIONS_PER_PAGE;
    const endIdx = startIdx + SESSIONS_PER_PAGE;
    const pageSessions = sessions.slice(startIdx, endIdx);

    tbody.innerHTML = pageSessions.map(s => {
      const actionColor = s.action === 'submitted' ? '#10b981' : s.action === 'skipped' ? '#f59e0b' : '#ef4444';
      return `
        <tr>
          <td style="font-weight:600;font-size:12px">${new Date(s.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
          <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${sanitizeHTML(s.taskName || 'Unknown')}">${sanitizeHTML(s.taskName || 'Unknown')}</td>
          <td style="font-weight:700">${fmt(s.duration)}</td>
          <td><span style="color:${actionColor};font-weight:600">${s.action}</span></td>
        </tr>
      `;
    }).join('');

    if (pagination && totalPages > 1) {
      pagination.innerHTML = '';
      for (let p = 1; p <= totalPages; p++) {
        const btn = document.createElement('button');
        btn.textContent = p;
        if (p === page) btn.disabled = true;
        btn.addEventListener('click', () => renderSessionsPage(sessions, p));
        pagination.appendChild(btn);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reset dialog UI (NEW: Debounced)
  // ---------------------------------------------------------------------------
  function showResetDialog() {
    // NEW: Debounce to prevent spam clicks
    const now = Date.now();
    if (now - lastResetTime < 1000) {
      console.log('[SM] Please wait before opening reset dialog again');
      return;
    }
    lastResetTime = now;

    const existing = document.getElementById('sm-reset-dialog');
    if (existing) existing.remove();

    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;

    const dialog = document.createElement('div');
    dialog.id = 'sm-reset-dialog';
    dialog.innerHTML = `
      <style>
        #sm-reset-dialog{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999999999}
        #sm-reset-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)}
        #sm-reset-modal{position:relative;width:360px;background:#fff;border-radius:12px;overflow:hidden;font-family:system-ui;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
        #sm-reset-modal .header{padding:20px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white}
        #sm-reset-modal .header-title{font-size:20px;font-weight:800}
        #sm-reset-modal .body{padding:20px}
        #sm-reset-modal .warning{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin-bottom:16px;border-radius:6px;font-size:13px;color:#92400e}
        #sm-reset-modal .impact{background:#f3f4f6;padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px}
        #sm-reset-modal .option-btn{width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;margin-bottom:10px;text-align:left;font-weight:600;transition:all 0.2s;font-size:14px}
        #sm-reset-modal .option-btn:hover{border-color:#8b5cf6;background:#f5f3ff;transform:translateX(4px)}
        #sm-reset-modal .footer{padding:12px 20px;background:#f9fafb;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb}
        #sm-reset-modal .footer-hint{font-size:12px;color:#6b7280}
        #sm-reset-modal .cancel-btn{padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:6px;cursor:pointer;font-weight:600;transition:all 0.2s}
        #sm-reset-modal .cancel-btn:hover{background:#f3f4f6}
      </style>
      <div id="sm-reset-backdrop"></div>
      <div id="sm-reset-modal">
        <div class="header">
          <div class="header-title">⚠️ Reset Confirmation</div>
        </div>
        <div class="body">
          <div class="warning">⚡ This action cannot be undone. Choose wisely!</div>
          <div class="impact">
            <div style="font-weight:600;margin-bottom:4px">Current Data:</div>
            <div>⏱️ Time: <strong>${fmt(committed)}</strong></div>
            <div>📊 Count: <strong>${count}</strong></div>
          </div>
          <button class="option-btn" data-reset="timer">
            🕐 Reset Timer Only<br>
            <small style="color:#6b7280;font-weight:400">Keeps your task count (${count})</small>
          </button>
          <button class="option-btn" data-reset="counter">
            🔢 Reset Counter Only<br>
            <small style="color:#6b7280;font-weight:400">Keeps your time (${fmt(committed)})</small>
          </button>
          <button class="option-btn" data-reset="both">
            🔄 Reset Both<br>
            <small style="color:#6b7280;font-weight:400">Full reset to start fresh</small>
          </button>
        </div>
        <div class="footer">
          <div class="footer-hint">Press ESC to cancel</div>
          <button id="reset-cancel" class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
      }
    };
    document.addEventListener('keydown', escHandler, true);

    dialog.querySelector('#sm-reset-backdrop').addEventListener('click', () => {
      dialog.remove();
      document.removeEventListener('keydown', escHandler, true);
    });

    dialog.querySelector('#reset-cancel').addEventListener('click', () => {
      dialog.remove();
      document.removeEventListener('keydown', escHandler, true);
    });

    dialog.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const resetType = btn.dataset.reset;
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
        performReset(resetType, 'manual');
        updateDisplay();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // isTaskPage and tracking
  // ---------------------------------------------------------------------------
  function isTaskPage() {
    try {
      const url = window.location.href.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (url.includes('/task') || url.includes('/labeling') || path.includes('/task')) return true;
      const awsTimer = parseAWSTimer();
      if (awsTimer) return true;
      const bodyText = getBodyText().toLowerCase(); // OPTIMIZED
      if (bodyText.includes('task time') || bodyText.includes('task description')) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function trackOnce() {
    Shield.pushDom();
    checkDailyReset();
    const onTaskPage = isTaskPage();

    updateHomeFloatingIcon();

    if (onTaskPage) {
      display.style.display = 'flex';
    } else {
      display.style.display = 'none';
      return;
    }

    if (hasTaskExpiredOnPage()) {
      if (activeTask) discardActiveTask('expired');
      else setIgnoreTask(getTaskIdFromUrl());
      updateDisplay();
      return;
    }

    const awsData = parseAWSTimer();

    if (Shield.isLikelyVideoNoise() && !awsData) return;

    const currentTaskId = getTaskIdFromUrl();
    const ignoreId = getIgnoreTask();

    if (ignoreId && ignoreId === currentTaskId) {
      if (lastAWSData && awsData && awsData.current < lastAWSData.current) {
        setIgnoreTask(null);
      } else {
        lastAWSData = awsData || lastAWSData;
        return;
      }
    }

    if (!awsData) {
      lastAWSData = null;
      return;
    }

    if (lastAWSData && awsData.current < (lastAWSData.current - CONFIG.BACKWARD_TIMER_THRESHOLD)) {
      log('⚠️ Timer went backward! Old:', lastAWSData.current, 'New:', awsData.current);
      log('Possible causes: New task, browser tab suspended, or page refresh');
      clearTaskNameCache();
      activeTask = null;
      lastTaskId = null;
    }

    if (!activeTask || activeTask.id !== currentTaskId) {
      startNewTaskFromAWS(awsData);
    } else {
      updateActiveTaskFromAWS(awsData);
    }

    if (typeof awsData.limit === 'number' && awsData.current >= awsData.limit) {
      discardActiveTask('expired');
    }

    lastAWSData = awsData;
    updateDisplay();
  }

  // Adaptive interval tracking with error handling
  let checkInterval = CONFIG.CHECK_INTERVAL_MS;
  function adaptiveTrack() {
    try {
      trackOnce();
    } catch (error) {
      console.error('[SM] Tracking error:', error);
    }

    if (activeTask?.status === 'active') {
      checkInterval = CONFIG.CHECK_INTERVAL_ACTIVE;
    } else if (isTaskPage()) {
      checkInterval = CONFIG.CHECK_INTERVAL_MS;
    } else {
      checkInterval = CONFIG.CHECK_INTERVAL_IDLE;
    }

    setTimeout(adaptiveTrack, checkInterval);
  }

  // Start adaptive tracking
  adaptiveTrack();

  // Initial setup
  setTimeout(() => {
    try {
      attachToFooter();
      validateAndFixData();
      updateDisplay();
      updateHomeFloatingIcon();
      log('✅ Sagemaker Utilization Counter initialized (Ultra-Stable Version)');
    } catch (e) {
      console.error('[SM] Initialization error:', e);
    }
  }, 500);

})();
