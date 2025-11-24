// ==UserScript==
// @name         Sagemaker Utilization Counter
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Ultra Premium Dashboard with AI Protection Engine - No Toast Notifications
// @author       PVSANKAR
// @match        *://*.sagemaker.aws/*
// @match        *://*/*
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
  "use strict";

  if (window.__SM_TIMER_RUNNING__) return;
  window.__SM_TIMER_RUNNING__ = true;

  // ============================================================================
  // 🛡️ SECURITY FIX
  // ============================================================================
  const sanitizeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // ============================================================================
  // 🎨 TOAST NOTIFICATION SYSTEM
  // ============================================================================
  class ToastManager {
    constructor() {}
    init() {}
    show(message, type = 'success', duration = 3000) {
      console.log(`[SM ${type.toUpperCase()}]`, message);
    }
  }

  const toast = new ToastManager();

  // ============================================================================
  // 💾 DATA COMPRESSION UTILITY
  // ============================================================================
  const Compression = {
    compress(data) {
      try {
        const json = JSON.stringify(data);
        return btoa(encodeURIComponent(json));
      } catch (e) {
        return null;
      }
    },

    decompress(compressed) {
      try {
        return JSON.parse(decodeURIComponent(atob(compressed)));
      } catch (e) {
        return null;
      }
    }
  };

  // ============================================================================
  // 🎯 DOM CACHE UTILITY
  // ============================================================================
  const DOMCache = {
    elements: new Map(),

    get(selector, refresh = false) {
      if (refresh || !this.elements.has(selector)) {
        this.elements.set(selector, document.querySelector(selector));
      }
      return this.elements.get(selector);
    },

    getAll(selector, refresh = false) {
      const key = `all:${selector}`;
      if (refresh || !this.elements.has(key)) {
        this.elements.set(key, document.querySelectorAll(selector));
      }
      return this.elements.get(key);
    },

    clear() {
      this.elements.clear();
    }
  };

  // ============================================================================
  // ⚙️ CONFIGURATION
  // ============================================================================
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

    AI_ENABLED: true,
    AI_CHECK_INTERVAL: 10000,
    AI_LEARNING_ENABLED: true,
    AI_PROTECTION_ENABLED: true,
    AI_SUGGESTIONS_ENABLED: true,
    AI_AUTO_FIX_ENABLED: true,
    AI_ANOMALY_THRESHOLD: 0.7,
    AI_PREDICTION_ENABLED: true,
    AI_OPTIMIZATION_ENABLED: true,
  };

  function log(...args) { if (CONFIG.DEBUG) console.log("[SM]", ...args); }

  const KEYS = {
    DAILY_COMMITTED: "sm_daily_committed",
    LAST_DATE: "sm_last_date",
    HISTORY: "sm_history",
    COUNT: "sm_count",
    LAST_RESET: "sm_last_reset",
    IGNORE_TASK: "sm_ignore_task",
    SESSIONS: "sm_sessions",
    LAST_MIDNIGHT_CHECK: "sm_last_midnight_check",
    ANALYTICS: "sm_analytics",
    LAST_BACKUP: "sm_last_backup",
    PREFERENCES: "sm_preferences",
    AUTO_BACKUP: "sm_auto_backup",
    AI_PATTERNS: "sm_ai_patterns",
    AI_PREDICTIONS: "sm_ai_predictions",
    AI_ANOMALIES: "sm_ai_anomalies",
    AI_INSIGHTS: "sm_ai_insights",
    AI_CONFIG: "sm_ai_config",
    AI_PROFILE: "sm_ai_profile",
    AI_STATS: "sm_ai_stats",
  };

  // ============================================================================
  // 🛡️ ERROR BOUNDARY
  // ============================================================================
  function withErrorBoundary(fn, context = 'operation') {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        console.error(`[SM Error in ${context}]`, error);
        const analytics = retrieve(KEYS.ANALYTICS, {});
        analytics.errors = analytics.errors || [];
        analytics.errors.push({
          context,
          message: error.message,
          stack: error.stack?.substring(0, 500),
          timestamp: new Date().toISOString()
        });
        if (analytics.errors.length > 50) {
          analytics.errors = analytics.errors.slice(-50);
        }
        store(KEYS.ANALYTICS, analytics);
        return null;
      }
    };
  }

  // ============================================================================
  // 💾 STORAGE FUNCTIONS
  // ============================================================================
  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      log("store error", e);
      if (e.name === 'QuotaExceededError') {
        try {
          const sessions = retrieve(KEYS.SESSIONS, []);
          if (sessions.length > 100) {
            store(KEYS.SESSIONS, sessions.slice(0, Math.floor(sessions.length / 2)));
            log("Emergency cleanup: sessions reduced");
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          }
        } catch (retryError) {
          console.error('Storage full! Please export data.');
          return false;
        }
      }
      return false;
    }
  }

  function retrieve(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      log("retrieve error", e);
      return fallback;
    }
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
    } catch (e) {
      return store(key, value);
    }
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
    } catch (e) {
      return retrieve(key, fallback);
    }
  }

  function setIgnoreTask(taskId) {
    try {
      if (taskId == null) sessionStorage.removeItem(KEYS.IGNORE_TASK);
      else sessionStorage.setItem(KEYS.IGNORE_TASK, taskId);
    } catch (e) { log(e); }
  }

  function getIgnoreTask() {
    try { return sessionStorage.getItem(KEYS.IGNORE_TASK); }
    catch (e) { return null; }
  }

  // ============================================================================
  // 🔧 UTILITY FUNCTIONS
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
  // 🤖 AI ENGINE
  // ============================================================================
  class AIEngine {
    constructor() {
      this.patterns = retrieve(KEYS.AI_PATTERNS, {});
      this.predictions = retrieve(KEYS.AI_PREDICTIONS, {});
      this.anomalies = retrieve(KEYS.AI_ANOMALIES, []);
      this.insights = retrieve(KEYS.AI_INSIGHTS, []);
      this.profile = retrieve(KEYS.AI_PROFILE, {});
      this.stats = retrieve(KEYS.AI_STATS, {
        protections_applied: 0,
        anomalies_detected: 0,
        patterns_learned: 0,
        predictions_made: 0,
        auto_fixes: 0,
        optimizations: 0
      });

      this.config = retrieve(KEYS.AI_CONFIG, {
        learning_enabled: CONFIG.AI_LEARNING_ENABLED,
        protection_enabled: CONFIG.AI_PROTECTION_ENABLED,
        suggestions_enabled: CONFIG.AI_SUGGESTIONS_ENABLED,
        auto_fix_enabled: CONFIG.AI_AUTO_FIX_ENABLED,
        prediction_enabled: CONFIG.AI_PREDICTION_ENABLED,
        optimization_enabled: CONFIG.AI_OPTIMIZATION_ENABLED,
        anomaly_threshold: CONFIG.AI_ANOMALY_THRESHOLD
      });

      this.lastCheck = Date.now();
      this.performanceMetrics = {
        memory_usage: 0,
        cpu_impact: 'Low',
        efficiency: 100
      };

      log("🤖 AI Engine initialized");
    }

    protect() {
      if (!this.config.protection_enabled) return;
      this.detectDataCorruption();
      this.validateSessions();
      this.preventMemoryLeaks();
      this.checkIntegrity();
      this.stats.protections_applied++;
      this.saveState();
    }

    detectDataCorruption() {
      try {
        const committed = retrieve(KEYS.DAILY_COMMITTED, 0);
        const count = retrieve(KEYS.COUNT, 0);
        const sessions = retrieve(KEYS.SESSIONS, []);
        let fixed = false;

        if (committed < 0 || committed > 86400) {
          log("🤖 AI: Fixed corrupted daily_committed", committed);
          store(KEYS.DAILY_COMMITTED, Math.max(0, Math.min(86400, committed)));
          this.logAnomaly('data_corruption', 'Invalid daily_committed value', 'auto_fixed');
          fixed = true;
        }

        if (count < 0) {
          log("🤖 AI: Fixed negative count", count);
          store(KEYS.COUNT, 0);
          this.logAnomaly('data_corruption', 'Negative count value', 'auto_fixed');
          fixed = true;
        }

        if (!Array.isArray(sessions)) {
          log("🤖 AI: Fixed corrupted sessions array");
          store(KEYS.SESSIONS, []);
          this.logAnomaly('data_corruption', 'Invalid sessions array', 'auto_fixed');
          fixed = true;
        }

        if (fixed) this.stats.auto_fixes++;
        return fixed;
      } catch (e) {
        log("AI protect error", e);
        return false;
      }
    }

    validateSessions() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        let cleaned = false;

        const validSessions = sessions.filter(s => {
          if (s.duration < 0 || s.duration > 86400) {
            this.logAnomaly('invalid_session', `Impossible duration: ${s.duration}`, 'removed');
            cleaned = true;
            return false;
          }
          if (!s.date || isNaN(new Date(s.date).getTime())) {
            this.logAnomaly('invalid_session', 'Invalid date', 'removed');
            cleaned = true;
            return false;
          }
          return true;
        });

        if (cleaned) {
          store(KEYS.SESSIONS, validSessions);
          this.stats.auto_fixes++;
          log(`🤖 AI: Cleaned ${sessions.length - validSessions.length} invalid sessions`);
        }
        return cleaned;
      } catch (e) {
        log("AI validate error", e);
        return false;
      }
    }

    preventMemoryLeaks() {
      try {
        if (this.anomalies.length > 100) {
          this.anomalies = this.anomalies.slice(-100);
          store(KEYS.AI_ANOMALIES, this.anomalies);
        }
        if (this.insights.length > 50) {
          this.insights = this.insights.slice(-50);
          store(KEYS.AI_INSIGHTS, this.insights);
        }
        if (Date.now() - this.lastCheck > 60000) {
          DOMCache.clear();
          this.lastCheck = Date.now();
        }
        return true;
      } catch (e) {
        log("AI memory error", e);
        return false;
      }
    }

    checkIntegrity() {
      try {
        const history = retrieve(KEYS.HISTORY, {});
        let fixed = false;

        for (const [date, value] of Object.entries(history)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            delete history[date];
            fixed = true;
            continue;
          }
          if (value < 0 || value > 86400) {
            history[date] = Math.max(0, Math.min(86400, value));
            fixed = true;
          }
        }

        if (fixed) {
          store(KEYS.HISTORY, history);
          this.stats.auto_fixes++;
        }
        return !fixed;
      } catch (e) {
        log("AI integrity error", e);
        return false;
      }
    }

    learn() {
      if (!this.config.learning_enabled) return;
      this.analyzePatterns();
      this.buildUserProfile();
      this.saveState();
    }

    analyzePatterns() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        if (sessions.length < 5) return;

        const taskPatterns = {};

        sessions.forEach(session => {
          const taskName = session.taskName || 'Unknown';

          if (!taskPatterns[taskName]) {
            taskPatterns[taskName] = {
              count: 0,
              total_duration: 0,
              avg_duration: 0,
              success_rate: 0,
              submitted: 0,
              skipped: 0,
              expired: 0
            };
          }

          const pattern = taskPatterns[taskName];
          pattern.count++;

          if (session.action === 'submitted') {
            pattern.total_duration += session.duration;
            pattern.submitted++;
          } else if (session.action === 'skipped') {
            pattern.skipped++;
          } else if (session.action === 'expired') {
            pattern.expired++;
          }

          pattern.avg_duration = pattern.submitted > 0 ?
            Math.round(pattern.total_duration / pattern.submitted) : 0;
          pattern.success_rate = pattern.count > 0 ?
            Math.round((pattern.submitted / pattern.count) * 100) : 0;
        });

        store(KEYS.AI_PATTERNS, taskPatterns);
        this.stats.patterns_learned = Object.keys(taskPatterns).length;

        log(`🤖 AI: Learned ${Object.keys(taskPatterns).length} task patterns`);
        return taskPatterns;
      } catch (e) {
        log("AI learn error", e);
        return {};
      }
    }

    buildUserProfile() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        const history = retrieve(KEYS.HISTORY, {});

        if (sessions.length === 0) return;

        const profile = {
          total_sessions: sessions.length,
          total_time_worked: Object.values(history).reduce((a, b) => a + b, 0),
          average_daily_hours: 0,
          most_productive_hour: 0,
          efficiency_score: 0
        };

        const daysTracked = Object.keys(history).length;
        if (daysTracked > 0) {
          profile.average_daily_hours = (profile.total_time_worked / daysTracked / 3600).toFixed(2);
        }

        const hourlyActivity = new Array(24).fill(0);
        sessions.forEach(s => {
          const hour = new Date(s.date).getHours();
          hourlyActivity[hour]++;
        });
        profile.most_productive_hour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

        const submitted = sessions.filter(s => s.action === 'submitted').length;
        profile.efficiency_score = Math.round((submitted / sessions.length) * 100);

        this.profile = profile;
        store(KEYS.AI_PROFILE, profile);

        log("🤖 AI: Built user profile", profile);
        return profile;
      } catch (e) {
        log("AI profile error", e);
        return {};
      }
    }

    logAnomaly(type, description, action) {
      this.anomalies.unshift({
        type,
        description,
        action,
        timestamp: new Date().toISOString()
      });

      if (this.anomalies.length > 100) {
        this.anomalies = this.anomalies.slice(0, 100);
      }

      this.stats.anomalies_detected++;
      store(KEYS.AI_ANOMALIES, this.anomalies);
    }

    saveState() {
      try {
        store(KEYS.AI_STATS, this.stats);
        store(KEYS.AI_CONFIG, this.config);
      } catch (e) {
        log("AI save error", e);
      }
    }

    getStatus() {
      return {
        enabled: CONFIG.AI_ENABLED,
        stats: this.stats,
        performance: this.performanceMetrics,
        profile: this.profile,
        predictions: this.predictions,
        insights: this.insights.slice(0, 5),
        anomalies: this.anomalies.slice(0, 5)
      };
    }

    run() {
      try {
        this.protect();
        this.learn();
        log("🤖 AI cycle completed");
      } catch (e) {
        log("AI run error", e);
      }
    }
  }

  const AI = new AIEngine();

  if (CONFIG.AI_ENABLED) {
    setInterval(() => {
      AI.run();
    }, CONFIG.AI_CHECK_INTERVAL);

    setTimeout(() => {
      AI.run();
    }, 5000);
  }

  // ============================================================================
  // TASK NAME DETECTION
  // ============================================================================
  function getTaskName() {
    try {
      const bodyText = document.body.innerText || document.body.textContent || "";
      let match = bodyText.match(/Task description:\s*([^\n]+)/i);
      if (match && match[1] && match[1].trim().length > 5) {
        return match[1].trim();
      }

      const selectors = [
        'p.awsui-util-d-ib',
        '.awsui-util-d-ib',
        '[class*="task-title"]',
        '[class*="task-description"]',
        '.cswui-header-name'
      ];

      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const text = (el.innerText || el.textContent || "").trim();
          if (text.length > 10 && text.length < 200 && !text.includes('\n')) {
            return text;
          }
        }
      }

      return `Task-${Date.now().toString().slice(-6)}`;

    } catch (e) {
      log("getTaskName error", e);
      return `Task-${Date.now().toString().slice(-6)}`;
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================
  function updateAnalytics(event, data = {}) {
    if (!CONFIG.ENABLE_ANALYTICS) return;

    const analytics = retrieve(KEYS.ANALYTICS, {
      total_tasks_completed: 0,
      total_tasks_skipped: 0,
      total_tasks_expired: 0,
      total_time_worked: 0,
      longest_session: 0,
      last_activity: null
    });

    const now = new Date();

    switch(event) {
      case 'task_completed':
        analytics.total_tasks_completed++;
        analytics.total_time_worked += (data.duration || 0);
        if (data.duration > analytics.longest_session) {
          analytics.longest_session = data.duration;
        }
        break;
      case 'task_skipped':
        analytics.total_tasks_skipped++;
        break;
      case 'task_expired':
        analytics.total_tasks_expired++;
        break;
    }

    analytics.last_activity = now.toISOString();
    store(KEYS.ANALYTICS, analytics);
  }

  // ============================================================================
  // DATA VALIDATION
  // ============================================================================
  function validateAndFixData() {
    log("Running data validation...");
    const issues = [];

    let committed = retrieve(KEYS.DAILY_COMMITTED, 0);
    if (committed < 0) {
      issues.push('Negative time detected - resetting to 0');
      store(KEYS.DAILY_COMMITTED, 0);
      committed = 0;
    }
    if (committed > 86400) {
      issues.push('Time exceeds 24 hours - capping at 24h');
      store(KEYS.DAILY_COMMITTED, 86400);
    }

    let count = retrieve(KEYS.COUNT, 0);
    if (count < 0) {
      issues.push('Negative count detected - resetting to 0');
      store(KEYS.COUNT, 0);
    }

    const history = retrieve(KEYS.HISTORY, {});
    let historyFixed = false;
    for (const [date, value] of Object.entries(history)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        issues.push(`Invalid date format: ${date} - removing`);
        delete history[date];
        historyFixed = true;
      }
      if (value < 0 || value > 86400) {
        issues.push(`Invalid time for ${date}: ${value} - capping`);
        history[date] = Math.max(0, Math.min(86400, value));
        historyFixed = true;
      }
    }
    if (historyFixed) {
      store(KEYS.HISTORY, history);
    }

    const sessions = retrieve(KEYS.SESSIONS, []);
    if (!Array.isArray(sessions)) {
      issues.push('Sessions corrupted - resetting');
      store(KEYS.SESSIONS, []);
    }

    if (issues.length > 0) {
      log("Data issues found and fixed:", issues);
    } else {
      log("Data validation passed ✓");
    }

    return issues;
  }

  // ============================================================================
  // DIAGNOSTICS
  // ============================================================================
  function runDiagnostics() {
    const aiStatus = AI.getStatus();

    const diag = {
      version: '3.2.4-final',
      localStorage_size: (JSON.stringify(localStorage).length / 1024).toFixed(2) + ' KB',
      active_task: activeTask ? 'Yes (' + fmt(activeTask.awsCurrent) + ')' : 'No',
      is_task_page: isTaskPage(),
      daily_committed: fmt(retrieve(KEYS.DAILY_COMMITTED, 0)),
      count: retrieve(KEYS.COUNT, 0),
      sessions_count: (retrieve(KEYS.SESSIONS, []) || []).length,
      ai_protections: aiStatus.stats.protections_applied,
      ai_patterns: aiStatus.stats.patterns_learned
    };

    console.log('=== SAGEMAKER DIAGNOSTICS ===');
    console.table(diag);
    console.log('✅ Diagnostics complete!');
    return diag;
  }

  // ============================================================================
  // TASK PAGE DETECTION
  // ============================================================================
  function isTaskPage() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (url.includes('/task') || url.includes('/labeling') || path.includes('/task')) {
      return true;
    }

    const awsTimer = parseAWSTimer();
    if (awsTimer) return true;

    const bodyText = (document.body.innerText || "").toLowerCase();
    if (bodyText.includes("task time") || bodyText.includes("task description")) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // SHIELD
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
        return t.includes("task") && (t.includes("time") || t.includes("min") || t.includes("sec"));
      }
    };
  })();

  // ============================================================================
  // AWS TIMER PARSER
  // ============================================================================
  function parseAWSTimer() {
    try {
      const bodyText = document.body.innerText || document.body.textContent || "";
      const cleanText = bodyText.replace(/\s+/g, " ").trim();

      if (!window.__SM_SHIELD.containsAWSTimerKeywords(cleanText)) {
        return null;
      }

      let m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+of\s+(\d+)\s*Min\s+(\d+)\s*Sec/i);
      if (m) {
        const current = (+m[1])*60 + (+m[2]);
        const limit = (+m[3])*60 + (+m[4]);
        return { current, limit, remaining: limit - current };
      }

      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+(?:of|\/)\s+(\d+):(\d+)/i);
      if (m) {
        const current = (+m[1])*60 + (+m[2]);
        const limit = (+m[3])*60 + (+m[4]);
        return { current, limit, remaining: limit - current };
      }

      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)/i);
      if (m) {
        const current = (+m[1])*60 + (+m[2]);
        return { current, limit: 3600, remaining: 3600 - current };
      }

      return null;
    } catch (e) {
      log("parseAWSTimer err", e);
      return null;
    }
  }

  function hasTaskExpiredOnPage() {
    try {
      const t = (document.body.innerText || "").toLowerCase();
      if (!t) return false;
      return (t.includes("task has expired") || t.includes("task expired"));
    } catch (e) { return false; }
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  let activeTask = null;
  function getTaskIdFromUrl() { return window.location.pathname + window.location.search; }

  function startNewTaskFromAWS(awsData) {
    const id = getTaskIdFromUrl();
    const taskName = getTaskName();
    activeTask = {
      id,
      taskName,
      awsCurrent: awsData.current,
      awsLimit: awsData.limit,
      lastAws: awsData.current,
      status: "active",
      createdAt: Date.now()
    };
    log("✅ New task started:", taskName);
    return activeTask;
  }

  function updateActiveTaskFromAWS(awsData) {
    if (!activeTask) return startNewTaskFromAWS(awsData);
    const id = getTaskIdFromUrl();
    if (activeTask.id !== id) {
      activeTask = null;
      return startNewTaskFromAWS(awsData);
    }
    if (typeof awsData.current === "number") {
      activeTask.status = awsData.current === activeTask.lastAws ? "paused" : "active";
      activeTask.awsCurrent = awsData.current;
      activeTask.awsLimit = awsData.limit;
      activeTask.lastAws = awsData.current;
    }
    return activeTask;
  }

  function pushSessionRecord(rec) {
    try {
      const sessions = retrieve(KEYS.SESSIONS, []) || [];
      if (!rec.taskName && activeTask) {
        rec.taskName = activeTask.taskName || getTaskName();
      }
      sessions.unshift(rec);
      if (sessions.length > CONFIG.SESSIONS_LIMIT) sessions.length = CONFIG.SESSIONS_LIMIT;
      store(KEYS.SESSIONS, sessions);
    } catch (e) { log("pushSession err", e); }
  }

  // ============================================================================
  // DAILY RESET
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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFIG.MAX_HISTORY_DAYS);
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
      log(`Daily goal of ${CONFIG.DAILY_ALERT_HOURS} hours reached!`);
    }
  }

  // ============================================================================
  // RESET FUNCTIONALITY
  // ============================================================================
  let resetInProgress = false;

  function performReset(resetType = "both", source = "manual") {
    if (resetInProgress) return false;
    resetInProgress = true;

    try {
      const currentDate = todayStr();
      const previousTimer = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
      const previousCount = retrieve(KEYS.COUNT, 0) || 0;

      if (source === "auto" || source === "midnight") {
        const lastDate = retrieve(KEYS.LAST_DATE);
        if (previousTimer > 0 && lastDate && lastDate !== currentDate) {
          saveToHistory(lastDate, previousTimer);
        }
      }

      switch(resetType) {
        case "timer":
          store(KEYS.DAILY_COMMITTED, 0);
          break;
        case "counter":
          store(KEYS.COUNT, 0);
          break;
        case "both":
        default:
          store(KEYS.DAILY_COMMITTED, 0);
          store(KEYS.COUNT, 0);
          break;
      }

      store(KEYS.LAST_DATE, currentDate);
      store(KEYS.LAST_RESET, new Date().toISOString());

      if (resetType === "both" || source === "auto" || source === "midnight") {
        setIgnoreTask(null);
        if (activeTask) {
          pushSessionRecord({
            id: activeTask.id,
            taskName: activeTask.taskName || getTaskName(),
            date: new Date().toISOString(),
            duration: activeTask.awsCurrent || 0,
            action: source === "manual" ? `manual_reset_${resetType}` : "midnight_reset"
          });
          activeTask = null;
        }
      }

      updateDisplay();
      return true;
    } finally {
      resetInProgress = false;
    }
  }

  function showResetDialog() {
    const existing = document.getElementById("sm-reset-dialog");
    if (existing) existing.remove();

    const dialog = document.createElement("div");
    dialog.id = "sm-reset-dialog";
    dialog.innerHTML = `
      <style>
        #sm-reset-dialog {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999999999;
        }
        #sm-reset-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
        }
        #sm-reset-modal {
          position: relative;
          width: 360px;
          max-width: calc(100% - 32px);
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          overflow: hidden;
          font-family: system-ui;
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        #sm-reset-modal .header {
          padding: 12px 16px;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #sm-reset-modal h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        #sm-reset-modal .body {
          padding: 16px;
        }
        #sm-reset-modal .current-values {
          background: #f9fafb;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          border: 1px solid #e5e7eb;
        }
        #sm-reset-modal .value {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
          color: #374151;
        }
        #sm-reset-modal .value strong {
          color: #111827;
          font-weight: 700;
        }
        #sm-reset-modal .options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        #sm-reset-modal .option-btn {
          padding: 10px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        #sm-reset-modal .option-btn:hover {
          border-color: #dc2626;
          background: #fef2f2;
          transform: translateX(3px);
        }
        #sm-reset-modal .option-btn:active {
          transform: scale(0.98);
        }
        #sm-reset-modal .footer {
          padding: 10px 16px;
          background: #f9fafb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #e5e7eb;
        }
        #sm-reset-modal .cancel-btn {
          padding: 6px 14px;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 5px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.15s;
        }
        #sm-reset-modal .cancel-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        #sm-reset-modal .esc-hint {
          font-size: 10px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        #sm-reset-modal .esc-key {
          padding: 1px 5px;
          background: #e5e7eb;
          border-radius: 3px;
          font-family: monospace;
          font-weight: 600;
          font-size: 10px;
        }
      </style>

      <div id="sm-reset-backdrop"></div>
      <div id="sm-reset-modal">
        <div class="header">
          <h3>🔄 Reset Options</h3>
        </div>
        <div class="body">
          <div class="current-values">
            <div class="value">
              <span>Timer:</span>
              <strong>${fmt(retrieve(KEYS.DAILY_COMMITTED, 0) || 0)}</strong>
            </div>
            <div class="value">
              <span>Counter:</span>
              <strong>${retrieve(KEYS.COUNT, 0) || 0}</strong>
            </div>
          </div>
          <div class="options">
            <button class="option-btn" data-reset="timer">
              <span>⏱️</span>
              <span>Reset Timer Only</span>
            </button>
            <button class="option-btn" data-reset="counter">
              <span>🔢</span>
              <span>Reset Counter Only</span>
            </button>
            <button class="option-btn" data-reset="both">
              <span>🔄</span>
              <span>Reset Both</span>
            </button>
          </div>
        </div>
        <div class="footer">
          <div class="esc-hint">
            <span>Press</span>
            <span class="esc-key">ESC</span>
          </div>
          <button class="cancel-btn" id="reset-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // ESC KEY HANDLER - STOPS PROPAGATION
    const escHandler = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.stopPropagation();
        e.preventDefault();
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
      }
    };

    document.addEventListener('keydown', escHandler, true);

    // Backdrop click
    dialog.querySelector("#sm-reset-backdrop").addEventListener("click", () => {
      dialog.remove();
      document.removeEventListener('keydown', escHandler, true);
    });

    // Cancel button
    dialog.querySelector("#reset-cancel").addEventListener("click", () => {
      dialog.remove();
      document.removeEventListener('keydown', escHandler, true);
    });

    // Reset options
    dialog.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const resetType = btn.dataset.reset;
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
        performReset(resetType, "manual");
      });
    });
  }

  // ============================================================================
  // MIDNIGHT RESET
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
      performReset("both", "midnight");
      scheduleMidnightReset();
    }, msUntilMidnight);
  }

  function backupMidnightCheck() {
    const currentDate = todayStr();
    const lastDate = retrieve(KEYS.LAST_DATE);
    if (lastDate && lastDate !== currentDate) {
      performReset("both", "midnight");
    }
  }

  setInterval(backupMidnightCheck, 60000);

  // ============================================================================
  // COMMIT & DISCARD
  // ============================================================================
  function commitActiveTask() {
    if (!activeTask) return 0;
    const finalElapsed = activeTask.awsCurrent || 0;
    if (finalElapsed <= 0) { activeTask = null; return 0; }

    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const newTotal = committed + finalElapsed;
    store(KEYS.DAILY_COMMITTED, newTotal);
    saveToHistory(todayStr(), newTotal);
    checkDailyAlert(newTotal);

    const c = (retrieve(KEYS.COUNT, 0) || 0) + 1;
    store(KEYS.COUNT, c);

    pushSessionRecord({
      id: activeTask.id,
      taskName: activeTask.taskName || getTaskName(),
      date: new Date().toISOString(),
      duration: finalElapsed,
      action: "submitted"
    });

    updateAnalytics('task_completed', { duration: finalElapsed });

    const id = activeTask.id;
    activeTask = null;
    if (getIgnoreTask() === id) setIgnoreTask(null);

    return finalElapsed;
  }

  function discardActiveTask(reason) {
    if (!activeTask) return;
    const rec = {
      id: activeTask.id,
      taskName: activeTask.taskName || getTaskName(),
      date: new Date().toISOString(),
      duration: activeTask.awsCurrent || 0,
      action: reason || "discarded"
    };
    pushSessionRecord(rec);

    if (reason === 'expired') {
      updateAnalytics('task_expired');
    } else if (reason === 'skipped') {
      updateAnalytics('task_skipped');
    }

    const id = activeTask.id;
    activeTask = null;
    try { setIgnoreTask(id); } catch (e) {}
  }

  // ============================================================================
  // SUBMISSION INTERCEPTOR
  // ============================================================================
  function initSubmissionInterceptor() {
    if (typeof window.fetch === "function") {
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const method = args[1]?.method || "GET";
        return origFetch.apply(this, args).then(response => {
          try {
            if (method.toUpperCase() === "POST" && response.ok && /submit|complete|finish/i.test(url)) {
              commitActiveTask();
              updateDisplay();
            }
          } catch (e) {}
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
              commitActiveTask();
              updateDisplay();
            }
          } catch (e) {}
        });
        return origSend.call(this, body);
      };
    }
  }

  // ============================================================================
  // TRACKING LOOP
  // ============================================================================
  let lastAWSData = null;
  let currentCheckInterval = CONFIG.CHECK_INTERVAL_MS;
  let lastDisplayedTotal = -1;

  function trackOnce() {
    window.__SM_SHIELD.pushDom();
    checkDailyReset();

    const onTaskPage = isTaskPage();

    if (onTaskPage) {
      display.style.display = "flex";
    } else {
      display.style.display = "none";
      return;
    }

    if (hasTaskExpiredOnPage()) {
      if (activeTask) discardActiveTask("expired");
      else setIgnoreTask(getTaskIdFromUrl());
      updateDisplay();
      return;
    }

    const awsData = parseAWSTimer();

    if (window.__SM_SHIELD.isLikelyVideoNoise() && !awsData) {
      return;
    }

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

    if (!activeTask || activeTask.id !== currentTaskId) {
      startNewTaskFromAWS(awsData);
    } else {
      updateActiveTaskFromAWS(awsData);
    }

    if (typeof awsData.limit === "number" && awsData.current >= awsData.limit) {
      discardActiveTask("expired");
    }

    lastAWSData = awsData;
    updateDisplay();
  }

  // ============================================================================
  // DISPLAY UI WITH PROGRESS BAR
  // ============================================================================
  const display = document.createElement("div");
  display.id = "sm-utilization";
  Object.assign(display.style, {
    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
    color: "inherit", fontSize: "inherit", fontFamily: "inherit", opacity: "0.92",
    pointerEvents: "auto", userSelect: "none", whiteSpace: "nowrap", display: "none",
    alignItems: "center", gap: "0px", zIndex: "9999"
  });

  // PROGRESS BAR CONTAINER
  const timerContainer = document.createElement("div");
  timerContainer.style.cssText = "display: inline-block; position: relative;";

  const timerTextSpan = document.createElement("span");
  timerTextSpan.id = "sm-timer-text";
  timerTextSpan.textContent = "Utilization: 00:00:00";
  timerContainer.appendChild(timerTextSpan);

  // PROGRESS BAR (POSITIONED HIGHER)
  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; margin-top: 1px;
    height: 4px; background: rgba(0,0,0,0.15);
    border-radius: 2px; overflow: hidden;
  `;
  const progressBar = document.createElement("div");
  progressBar.id = "sm-progress-bar";
  progressBar.style.cssText = `
    height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
    width: 0%; transition: width 0.5s ease;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  `;
  progressContainer.appendChild(progressBar);
  timerContainer.appendChild(progressContainer);

  display.appendChild(timerContainer);

  const countLabel = document.createElement("span");
  countLabel.id = "sm-count-label";
  countLabel.textContent = " | Count: 0";
  countLabel.style.marginLeft = "8px";
  display.appendChild(countLabel);

  let footerObserver = null;

  function attachToFooter() {
    if (!isTaskPage()) return;

    const footer = document.querySelector('.cswui-footer, .awsui-footer, footer') || document.body;
    if (!footer) return;
    if (getComputedStyle(footer).position === "static") footer.style.position = "relative";

    if (!footer.contains(display)) footer.appendChild(display);

    if (!display.querySelector("#sm-log-btn")) {
      const btn = document.createElement("button");
      btn.id = "sm-log-btn";
      btn.innerHTML = "🤖";
      btn.title = "Open Dashboard (Ctrl+Shift+U)";
      Object.assign(btn.style, {
        marginLeft: "8px",
        padding: "6px 12px",
        borderRadius: "6px",
        background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: "600",
        transition: "all 0.2s"
      });
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "translateY(-2px)";
        btn.style.boxShadow = "0 4px 8px rgba(139, 92, 246, 0.4)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translateY(0)";
        btn.style.boxShadow = "none";
      });
      btn.addEventListener("click", showUltraPremiumDashboard);
      display.appendChild(btn);
    }
  }

  footerObserver = new MutationObserver(() => {
    setTimeout(attachToFooter, 120);
  });
  footerObserver.observe(document.body, { childList: true, subtree: true });

  function updateDisplay() {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    let pending = 0;

    if (activeTask && (activeTask.status === "active" || activeTask.status === "paused")) {
      pending = activeTask.awsCurrent || 0;
    }

    const total = committed + pending;

    if (total !== lastDisplayedTotal) {
      const timerText = document.getElementById('sm-timer-text');
      if (timerText) {
        timerText.textContent = `Utilization: ${fmt(total)}`;
      }
      lastDisplayedTotal = total;
    }

    const countLabelEl = document.getElementById('sm-count-label');
    if (countLabelEl) {
      const currentCount = retrieve(KEYS.COUNT, 0) || 0;
      countLabelEl.textContent = ` | Count: ${currentCount}`;
    }

    // UPDATE PROGRESS BAR
    const bar = document.getElementById('sm-progress-bar');
    if (bar) {
      const targetSeconds = CONFIG.DAILY_ALERT_HOURS * 3600;
      const percent = Math.min(100, (total / targetSeconds) * 100);
      bar.style.width = `${percent}%`;
    }
  }

  function wireTaskActionButtons() {
    const btns = document.querySelectorAll('button, [role="button"]');
    btns.forEach((el) => {
      try {
        const raw = (el.innerText || "").toLowerCase();
        if (!raw) return;

        if ((raw.includes("submit") || raw.includes("complete")) && !el.__sm_submit_bound) {
          el.__sm_submit_bound = true;
          el.addEventListener("click", () => {
            setTimeout(() => {
              commitActiveTask();
              updateDisplay();
            }, 100);
          });
        }
        if (raw.includes("skip") && !el.__sm_skip_bound) {
          el.__sm_skip_bound = true;
          el.addEventListener("click", () => {
            discardActiveTask("skipped");
            updateDisplay();
          });
        }
      } catch (e) {}
    });
  }

  const buttonsObserver = new MutationObserver(wireTaskActionButtons);
  buttonsObserver.observe(document.body, { childList: true, subtree: true });

  // ============================================================================
  // DASHBOARD FUNCTIONS
  // ============================================================================
  function aggregateTodayTaskData() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const today = new Date().toISOString().split('T')[0];

    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.date).toISOString().split('T')[0];
      return sessionDate === today;
    });

    const taskMap = new Map();

    todaySessions.forEach(session => {
      const taskName = session.taskName || "Unknown Task";

      if (!taskMap.has(taskName)) {
        taskMap.set(taskName, {
          taskName: taskName,
          totalTime: 0,
          totalSessions: 0,
          submitted: 0,
          skipped: 0,
          expired: 0,
          lastWorked: null
        });
      }

      const task = taskMap.get(taskName);

      if (session.action === 'submitted') {
        task.totalTime += (session.duration || 0);
      }

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
      successRate: task.totalSessions > 0 ?
        Math.round((task.submitted / task.totalSessions) * 100) : 0
    }));
  }

  function getTodaySessions() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const today = new Date().toISOString().split('T')[0];

    return sessions.filter(s => {
      const sessionDate = new Date(s.date).toISOString().split('T')[0];
      return sessionDate === today;
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
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate === dateStr && s.action === 'submitted';
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

 // ============================================================================
// ⌨️ KEYBOARD SHORTCUTS - DASHBOARD SHORTCUT REMOVED
// ============================================================================
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey) {
    switch(e.key.toLowerCase()) {
      // case 'u': // REMOVED - Use button only
      //   e.preventDefault();
      //   showUltraPremiumDashboard();
      //   break;
      case 'r':
        e.preventDefault();
        showResetDialog();
        break;
      case 'd':
        e.preventDefault();
        runDiagnostics();
        break;
    }
  }
});

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  let currentSessionPage = 1;
  const SESSIONS_PER_PAGE = 10;

  function showUltraPremiumDashboard() {
    const existing = document.getElementById('sm-ultra-dashboard');
    if (existing) {
      existing.remove();
      return;
    }

    const root = document.createElement('div');
    root.id = 'sm-ultra-dashboard';

    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;
    const aiStatus = AI.getStatus();

    const todayTasks = aggregateTodayTaskData();
    const todaySessions = getTodaySessions();
    const last7Days = getLast7DaysData();

    root.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

        #sm-ultra-dashboard {
          position: fixed;
          inset: 0;
          z-index: 999999;
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          overflow-y: auto;
        }

        .dashboard-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
          height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .dashboard-title {
          font-size: 32px;
          font-weight: 900;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
        }

        .close-btn {
          background: #ef4444;
          color: white;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }

        .kpi-card {
          background: rgba(255,255,255,0.95);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .kpi-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .kpi-value {
          font-size: 28px;
          font-weight: 900;
          color: #111827;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          flex: 1;
          overflow: hidden;
        }

        .card {
          background: rgba(255,255,255,0.95);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }

        .table-container {
          flex: 1;
          overflow-y: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
          position: sticky;
          top: 0;
          z-index: 10;
          font-size: 13px;
        }

        tr:hover {
          background: #f9fafb;
        }

        .task-name-cell {
          font-weight: 600;
          font-size: 14px;
          max-width: 400px;
          word-wrap: break-word;
          white-space: normal;
          line-height: 1.4;
          cursor: help;
          position: relative;
        }

        .task-name-cell:hover::after {
          content: attr(data-full-name);
          position: absolute;
          left: 0;
          top: 100%;
          background: #111827;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          white-space: normal;
          max-width: 500px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          margin-top: 4px;
          line-height: 1.5;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          display: inline-block;
          white-space: nowrap;
        }

        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-info { background: #dbeafe; color: #1e40af; }

        .empty-state {
          text-align: center;
          padding: 30px;
          color: #6b7280;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 12px 0;
          border-top: 1px solid #e5e7eb;
          background: white;
          position: sticky;
          bottom: 0;
          z-index: 10;
        }

        .pagination button {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .pagination button:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #6366f1;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination button.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-color: #6366f1;
        }

        .right-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="dashboard-title">🤖 Dashboard</div>
          <div class="header-actions">
            <button class="btn btn-primary" id="reset-btn">🔄 Reset</button>
            <button class="btn close-btn" id="close-dashboard">✕</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Today's Progress</div>
            <div class="kpi-value">${fmt(committed)}</div>
            <div style="font-size:11px;color:#6b7280;">${count} submissions</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Today's Tasks</div>
            <div class="kpi-value">${todayTasks.length}</div>
            <div style="font-size:11px;color:#6b7280;">Unique tasks</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Today's Sessions</div>
            <div class="kpi-value">${todaySessions.length}</div>
            <div style="font-size:11px;color:#6b7280;">Completed today</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Efficiency</div>
            <div class="kpi-value">${aiStatus.profile.efficiency_score || 0}%</div>
            <div style="font-size:11px;color:#6b7280;">AI Score</div>
          </div>
        </div>

        <div class="content-grid">
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="card">
              <div class="card-header">
                <div class="card-title">📋 Today's Queue Tasks</div>
                <span style="padding:6px 12px;background:#6366f1;color:white;border-radius:6px;font-size:11px;font-weight:600;">
                  ${todayTasks.length} tasks
                </span>
              </div>
              <div class="table-container">
                ${todayTasks.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Task Name</th>
                        <th>Total Time</th>
                        <th>Subs</th>
                        <th>Avg</th>
                        <th>Rate</th>
                        <th>Last Worked</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${todayTasks.map(task => `
                        <tr>
                          <td class="task-name-cell" data-full-name="${sanitizeHTML(task.taskName)}">
                            ${sanitizeHTML(task.taskName)}
                          </td>
                          <td style="font-weight:700;font-size:15px;">${fmt(task.totalTime)}</td>
                          <td>
                            <span class="badge badge-success">${task.submitted}</span>
                            ${task.skipped > 0 ? `<span class="badge badge-warning">${task.skipped}</span>` : ''}
                            ${task.expired > 0 ? `<span class="badge badge-danger">${task.expired}</span>` : ''}
                          </td>
                          <td style="font-size:14px;">${fmt(task.avgTime)}</td>
                          <td><span class="badge ${
                            task.successRate >= 80 ? 'badge-success' :
                            task.successRate >= 50 ? 'badge-warning' : 'badge-danger'
                          }">${task.successRate}%</span></td>
                          <td style="font-size:12px;">${task.lastWorked ? new Date(task.lastWorked).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : '<div class="empty-state">📋 No tasks today yet</div>'}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="card-title">📝 Today's Sessions</div>
                <span style="padding:6px 12px;background:#10b981;color:white;border-radius:6px;font-size:11px;font-weight:600;">
                  ${todaySessions.length} today
                </span>
              </div>
              <div class="table-container" style="flex: 1; overflow-y: auto; max-height: 400px;">
                ${todaySessions.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Task Name</th>
                        <th>Duration</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody id="sessions-tbody">
                    </tbody>
                  </table>
                ` : '<div class="empty-state">📝 No sessions today yet</div>'}
              </div>
              ${todaySessions.length > SESSIONS_PER_PAGE ? `
                <div class="pagination" id="sessions-pagination"></div>
              ` : ''}
            </div>
          </div>

          <div class="right-column">
            <div class="card">
              <div class="card-header">
                <div class="card-title">📅 Last 7 Days</div>
              </div>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${last7Days.map(day => `
                      <tr>
                        <td style="font-weight:600;font-size:12px;">${day.dayName}</td>
                        <td style="font-weight:700;color:#6366f1;font-size:14px;">${fmt(day.time)}</td>
                        <td><span class="badge badge-info">${day.count}</span></td>
                      </tr>
                    `).join('')}
                    <tr style="background:#f3f4f6;font-weight:700;">
                      <td>Total</td>
                      <td style="color:#6366f1;font-size:14px;">${fmt(last7Days.reduce((sum, d) => sum + d.time, 0))}</td>
                      <td><span class="badge badge-success">${last7Days.reduce((sum, d) => sum + d.count, 0)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="card-title">🤖 AI Status</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr;gap:10px;">
                <div style="padding:12px;background:#dbeafe;border-radius:8px;">
                  <div style="font-size:11px;color:#1e40af;margin-bottom:4px;">Protections</div>
                  <div style="font-size:24px;font-weight:900;color:#1e3a8a;">${aiStatus.stats.protections_applied}</div>
                </div>
                <div style="padding:12px;background:#fef3c7;border-radius:8px;">
                  <div style="font-size:11px;color:#92400e;margin-bottom:4px;">Patterns</div>
                  <div style="font-size:24px;font-weight:900;color:#78350f;">${aiStatus.stats.patterns_learned}</div>
                </div>
                <div style="padding:12px;background:#d1fae5;border-radius:8px;">
                  <div style="font-size:11px;color:#065f46;margin-bottom:4px;">Anomalies</div>
                  <div style="font-size:24px;font-weight:900;color:#064e3b;">${aiStatus.stats.anomalies_detected}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    if (todaySessions.length > 0) {
      renderSessionsPage(todaySessions, 1);
    }

    root.querySelector('#close-dashboard').addEventListener('click', () => {
      root.remove();
    });

    root.querySelector('#reset-btn').addEventListener('click', showResetDialog);

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

    tbody.innerHTML = pageSessions.map(s => `
      <tr>
        <td style="font-size:12px;font-weight:600;">${new Date(s.date).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        })}</td>
        <td class="task-name-cell" data-full-name="${sanitizeHTML(s.taskName || 'Unknown')}">
          ${sanitizeHTML(s.taskName || 'Unknown')}
        </td>
        <td style="font-weight:700;font-size:15px;">${fmt(s.duration)}</td>
        <td><span class="badge badge-${
          s.action === 'submitted' ? 'success' :
          s.action === 'skipped' ? 'warning' : 'danger'
        }">${s.action}</span></td>
      </tr>
    `).join('');

    if (pagination && totalPages > 1) {
      let paginationHTML = `
        <button ${page === 1 ? 'disabled' : ''} onclick="window.renderSessionsPage(window.getTodaySessions(), ${page - 1})">
          ← Prev
        </button>
      `;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
          paginationHTML += `
            <button class="${i === page ? 'active' : ''}"
                    onclick="window.renderSessionsPage(window.getTodaySessions(), ${i})">
              ${i}
            </button>
          `;
        } else if (i === page - 2 || i === page + 2) {
          paginationHTML += '<span style="padding:6px;">...</span>';
        }
      }

      paginationHTML += `
        <button ${page === totalPages ? 'disabled' : ''} onclick="window.renderSessionsPage(window.getTodaySessions(), ${page + 1})">
          Next →
        </button>
      `;

      pagination.innerHTML = paginationHTML;
    }

    currentSessionPage = page;
  }

  window.renderSessionsPage = renderSessionsPage;
  window.getTodaySessions = getTodaySessions;

  // ============================================================================
  // 🚀 INITIALIZATION
  // ============================================================================
  log("🚀 SageMaker Dashboard v3.2.4 initializing...");

  validateAndFixData();
  checkDailyReset();
  scheduleMidnightReset();
  initSubmissionInterceptor();

  setTimeout(() => {
    attachToFooter();
    updateDisplay();
  }, 1000);

  setInterval(() => {
    trackOnce();
  }, currentCheckInterval);

  log("✅ SageMaker Dashboard v3.2.4 Ready!");
  log("✨ Progress Bar: Enabled (higher position, 4px thick)");
  log("📋 Today's Queue Tasks: Full names visible");
  log("🔤 Font Size: Increased for better readability");
  log("📄 Pagination: Fixed and visible");
  log("🔄 Reset Dialog: Ultra compact (360px) with ESC handling");
  log("🛡️ Timer Jump Issue: FIXED");

})();
