// ==UserScript==
// @name         Sagemaker Utilization Counter
// @namespace    http://tampermonkey.net/
// @version      8
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
// @updateURL    https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/SageMaker%20Utilization%20Counter-1.7.meta.js
// @downloadURL  https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/SageMaker%20Utilization%20Counter-1.7.user.js
// ==/UserScript==

(function () {
  "use strict";

  if (window.__SM_TIMER_RUNNING__) return;
  window.__SM_TIMER_RUNNING__ = true;

  console.log("🚀 SageMaker ULTIMATE v7.3 - DUAL-AXIS LINE CHARTS EDITION");

  // ============================================================================
  // 🔒 TRANSACTION LOCKS - ENHANCED
  // ============================================================================
  let isCommitting = false;
  let isResetting = false;
  let lastCommitTime = 0;
  let resetInProgress = false;
  let forceResetActive = false;
  let manualResetJustHappened = false;
  const COMMIT_DEBOUNCE_MS = 300;
  const RESET_LOCK_DURATION = 3000;
  const MANUAL_RESET_PROTECTION_DURATION = 10000;

  // ============================================================================
  // 🛡️ SECURITY
  // ============================================================================
  const sanitizeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // ============================================================================
  // 💾 DATA COMPRESSION
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
  // 🎯 DOM CACHE
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
    CHECK_INTERVAL_MS: 250,
    DAILY_ALERT_HOURS: 8,
    MAX_HISTORY_DAYS: 30,
    DEBUG: false,
    SESSIONS_LIMIT: 2000,
    ENABLE_ANALYTICS: true,
    AUTO_BACKUP_INTERVAL: 24 * 60 * 60 * 1000,
    COUNTING_MODE: "submitted_only",
    SMART_ENABLED: true,
    SMART_CHECK_INTERVAL: 5000,
    SMART_LEARNING_ENABLED: true,
    SMART_PROTECTION_ENABLED: true,
    SMART_SUGGESTIONS_ENABLED: true,
    SMART_AUTO_FIX_ENABLED: true,
    SMART_ANOMALY_THRESHOLD: 0.7,
    SMART_PREDICTION_ENABLED: true,
    SMART_OPTIMIZATION_ENABLED: true,
    SMART_REAL_TIME_VALIDATION: true,
    SMART_PREDICTIVE_FAILURE: true,
    SMART_SELF_HEALING: true,
    SMART_PERFORMANCE_MONITOR: true,
    SMART_STABILITY_CHECKS: true,
    SMART_RELIABILITY_SCORING: true,
    FIX_REFRESH_LOSS: true,
    FIX_DETECTION: true,
    FIX_IGNORE_LOOP: true,
    FIX_PARSING: true,
    FIX_RACE_CONDITIONS: true,
    FIX_MIDNIGHT: true,
    FIX_TIMING_DRIFT: true,
    MULTI_TAB_SYNC: true,
    TASK_NAME_RETRY_ATTEMPTS: 10,
    TASK_NAME_RETRY_DELAY: 500,
    TASK_NAME_OBSERVER_ENABLED: true,
    PERFECT_RESET_ENABLED: true,
    FORCE_RESET_METHOD: true,
    RESET_VERIFICATION_ENABLED: true,
    DISABLE_SELF_HEALING_AFTER_RESET: true,
  };

  function log(...args) {
    if (CONFIG.DEBUG) console.log("[SM-ULTIMATE]", ...args);
  }

  const KEYS = {
    DAILY_COMMITTED: "sm_daily_committed",
    LAST_DATE: "sm_last_date",
    HISTORY: "sm_history",
    COUNT: "sm_count",
    LAST_RESET: "sm_last_reset",
    IGNORE_TASK: "sm_ignore_task",
    SESSIONS: "sm_sessions",
    ANALYTICS: "sm_analytics",
    LAST_BACKUP: "sm_last_backup",
    ACTIVE_TASK: "sm_active_task",
    SMART_PATTERNS: "sm_smart_patterns",
    SMART_PREDICTIONS: "sm_smart_predictions",
    SMART_ANOMALIES: "sm_smart_anomalies",
    SMART_INSIGHTS: "sm_smart_insights",
    SMART_CONFIG: "sm_smart_config",
    SMART_PROFILE: "sm_smart_profile",
    SMART_STATS: "sm_smart_stats",
    SMART_HEALTH: "sm_smart_health",
    SMART_PERFORMANCE: "sm_smart_performance",
    SMART_ERROR_LOG: "sm_smart_error_log",
    SMART_RECOVERY_LOG: "sm_smart_recovery_log",
    THEME: "sm_theme",
    CUSTOM_TARGET_HOURS: "sm_custom_target_hours",
    CUSTOM_TARGET_COUNT: "sm_custom_target_count",
    ACHIEVEMENTS: "sm_achievements",
    STREAKS: "sm_streaks",
    SESSION_START: "sm_session_start",
    PROGRESS_BARS_ENABLED: "sm_progress_bars_enabled",
    DELAY_STATS: "sm_delay_stats",
    REMINDER_SETTINGS: "sm_reminder_settings",
    REMINDER_STATS: "sm_reminder_stats",
    TOTAL_COMMITS_ALLTIME: "sm_total_commits_alltime",
    TASK_NAME_SYNC: "sm_task_name_sync",
    MULTITAB_SYNC_TIME: "sm_multitab_sync_time",
    TOTAL_TODAY_HITS: "sm_total_today_hits",
    TASK_NAMES_CACHE: "sm_task_names_cache",
    TASK_TYPE_CACHE: "sm_task_type_cache",
    DETECTED_TASK_NAME: "sm_detected_task_name",
    PERMANENT_DAILY_HITS: "sm_permanent_daily_hits",
    RESET_LOG: "sm_reset_log",
    FORCE_RESET_FLAG: "sm_force_reset_flag",
    RESET_VERIFICATION: "sm_reset_verification",
    LAST_MANUAL_RESET_TIME: "sm_last_manual_reset_time",
    MANUAL_RESET_TODAY: "sm_manual_reset_today",
    PERMANENT_TASK_COMMITS: "sm_permanent_task_commits",
  };

  let trackingIntervalId = null;

  // ============================================================================
  // 🎨 GLOBAL THEME SYSTEM - ENHANCED
  // ============================================================================
  const ThemeManager = {
    currentTheme: 'dark',
    listeners: [],

    init() {
      this.currentTheme = this.getStoredTheme();
      this.applyGlobalTheme(this.currentTheme);
      this.setupStorageListener();
    },

    getStoredTheme() {
      try {
        const saved = localStorage.getItem(KEYS.THEME);
        if (saved) {
          const parsed = JSON.parse(saved);
          return (parsed === 'light') ? 'light' : 'dark';
        }
      } catch (e) {}
      return 'dark';
    },

    setTheme(theme) {
      const validTheme = (theme === 'light') ? 'light' : 'dark';
      this.currentTheme = validTheme;
      localStorage.setItem(KEYS.THEME, JSON.stringify(validTheme));
      this.applyGlobalTheme(validTheme);
      this.notifyListeners(validTheme);
      log(`🎨 Theme changed to: ${validTheme}`);
    },

    applyGlobalTheme(theme) {
      document.documentElement.setAttribute('data-sm-theme', theme);

      // Apply to all SM elements
      const smElements = document.querySelectorAll('[id^="sm-"], [class*="sm-"]');
      smElements.forEach(el => {
        el.setAttribute('data-theme', theme);
      });

      // Update home display
      this.updateHomeDisplayTheme(theme);

      // Update any open dialogs
      this.updateDialogThemes(theme);
    },

    updateHomeDisplayTheme(theme) {
      const homeDisplay = document.getElementById('sm-home-stats');
      if (homeDisplay) {
        homeDisplay.setAttribute('data-theme', theme);
        const container = homeDisplay.querySelector('.home-stats-container');
        if (container) {
          if (theme === 'light') {
            container.style.background = 'linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.98) 100%)';
            container.style.borderColor = 'rgba(99, 102, 241, 0.4)';
            container.style.color = '#1e293b';
          } else {
            container.style.background = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)';
            container.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            container.style.color = '#f1f5f9';
          }
        }
      }
    },

    updateDialogThemes(theme) {
      const dialogs = [
        'sm-reset-dialog',
        'sm-target-dialog',
        'sm-reminder-settings-dialog',
        'sm-export-dialog',
        'sm-reminder-popup',
        'task-name-modal'
      ];

      dialogs.forEach(dialogId => {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
          dialog.setAttribute('data-theme', theme);
        }
      });
    },

    addListener(callback) {
      this.listeners.push(callback);
    },

    removeListener(callback) {
      this.listeners = this.listeners.filter(l => l !== callback);
    },

    notifyListeners(theme) {
      this.listeners.forEach(callback => {
        try {
          callback(theme);
        } catch (e) {
          console.error('Theme listener error:', e);
        }
      });
    },

    setupStorageListener() {
      window.addEventListener('storage', (e) => {
        if (e.key === KEYS.THEME && e.newValue) {
          try {
            const newTheme = JSON.parse(e.newValue);
            if (newTheme !== this.currentTheme) {
              this.currentTheme = newTheme;
              this.applyGlobalTheme(newTheme);
              this.notifyListeners(newTheme);
            }
          } catch (err) {}
        }
      });
    },

    getTheme() {
      return this.currentTheme;
    },

    cycleTheme() {
      const next = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
      return next;
    },

    getThemeColors() {
      if (this.currentTheme === 'light') {
        return {
          bgPrimary: '#FFFFFF',
          bgSecondary: '#F8F9FA',
          bgTertiary: '#F1F3F5',
          bgElevated: '#E9ECEF',
          bgHover: '#DEE2E6',
          borderSubtle: 'rgba(0, 0, 0, 0.06)',
          borderDefault: 'rgba(0, 0, 0, 0.1)',
          borderStrong: 'rgba(0, 0, 0, 0.15)',
          textPrimary: '#212529',
          textSecondary: '#495057',
          textTertiary: '#868E96',
          accent: '#6366F1',
          accentHover: '#7C3AED',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        };
      } else {
        return {
          bgPrimary: '#0a0a0a',
          bgSecondary: '#141414',
          bgTertiary: '#1e1e1e',
          bgElevated: '#282828',
          bgHover: '#323232',
          borderSubtle: 'rgba(255, 255, 255, 0.05)',
          borderDefault: 'rgba(255, 255, 255, 0.08)',
          borderStrong: 'rgba(255, 255, 255, 0.12)',
          textPrimary: '#FFFFFF',
          textSecondary: '#B0B0B0',
          textTertiary: '#707070',
          accent: '#6366F1',
          accentHover: '#7C3AED',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        };
      }
    }
  };

  // Initialize theme manager
  ThemeManager.init();

  // Legacy compatibility functions
  function getTheme() {
    return ThemeManager.getTheme();
  }

  function setTheme(theme) {
    ThemeManager.setTheme(theme);
  }

  function applyTheme(theme) {
    ThemeManager.applyGlobalTheme(theme);
  }

  function cycleTheme() {
    return ThemeManager.cycleTheme();
  }

  // ============================================================================
  // 🛡️ STARTUP DATA VALIDATION - PREVENTS CORRUPTION
  // ============================================================================
  function validateAndFixStoredData() {
    console.log("[SM] Validating stored data...");

    const numericKeys = {
      [KEYS.DAILY_COMMITTED]: 0,
      [KEYS.COUNT]: 0,
      [KEYS.TOTAL_COMMITS_ALLTIME]: 0,
      [KEYS.CUSTOM_TARGET_HOURS]: 8,
    };

    let fixedCount = 0;

    Object.entries(numericKeys).forEach(([key, defaultVal]) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return;

        const parsed = JSON.parse(raw);

        if (typeof parsed !== 'number' || isNaN(parsed) || parsed < 0) {
          console.warn(`[SM-FIX] Fixing corrupted ${key}:`, parsed);
          localStorage.setItem(key, JSON.stringify(defaultVal));
          fixedCount++;
        }
      } catch (e) {
        console.warn(`[SM-FIX] Error parsing ${key}, resetting`);
        localStorage.setItem(key, JSON.stringify(defaultVal));
        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      console.log(`[SM] Fixed ${fixedCount} corrupted values`);
    } else {
      console.log("[SM] All data validated OK");
    }
  }

  // Run validation immediately
  validateAndFixStoredData();

  // ============================================================================
  // ⚡ FIXED DELAY ACCUMULATOR - ACCURATE 99.7%
  // ============================================================================
  const DelayAccumulator = {
    currentTask: {
      lastPollTime: null,
      lastPollAWS: 0,
    },

    dailyStats: {
      totalRecovered: 0,
      taskCount: 0,
      avgDelayPerTask: 0,
      maxDelay: 0,
    },

    updateLastPoll(awsValue) {
      this.currentTask.lastPollTime = performance.now();
      this.currentTask.lastPollAWS = awsValue;
    },

    calculateDelay() {
      if (!this.currentTask.lastPollTime) {
        log("⚠️ No last poll time, skipping delay calculation");
        return 0;
      }

      const now = performance.now();
      const timeSinceLastPoll = now - this.currentTask.lastPollTime;

      const maxExpectedGap = CONFIG.CHECK_INTERVAL_MS;
      const delayMs = Math.max(0, Math.min(timeSinceLastPoll, maxExpectedGap));

      this.dailyStats.totalRecovered += delayMs;
      this.dailyStats.taskCount++;
      this.dailyStats.avgDelayPerTask = this.dailyStats.totalRecovered / this.dailyStats.taskCount;
      this.dailyStats.maxDelay = Math.max(this.dailyStats.maxDelay, delayMs);

      const delaySeconds = delayMs / 1000;

      log(`📊 ACCURATE DELAY: ${delayMs.toFixed(1)}ms (+${delaySeconds.toFixed(3)}s)`);

      return delaySeconds;
    },

    getStats() {
      return {
        daily: {
          totalRecoveredSeconds: (this.dailyStats.totalRecovered / 1000).toFixed(2),
          totalRecoveredMs: this.dailyStats.totalRecovered.toFixed(0),
          taskCount: this.dailyStats.taskCount,
          avgDelayMs: this.dailyStats.avgDelayPerTask.toFixed(1),
          maxDelayMs: this.dailyStats.maxDelay.toFixed(1)
        }
      };
    },

    reset() {
      this.dailyStats = {
        totalRecovered: 0,
        taskCount: 0,
        avgDelayPerTask: 0,
        maxDelay: 0,
      };
      this.currentTask = {
        lastPollTime: null,
        lastPollAWS: 0,
      };
      log("📊 Delay accumulator reset for new day");
    }
  };

  // ============================================================================
  // 🛡️ ERROR BOUNDARY
  // ============================================================================
  function withErrorBoundary(fn, context = 'operation') {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        console.error(`[SM-ULTIMATE Error in ${context}]`, error);
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

        if (window.SmartEngine) {
          SmartEngine.handleError(error, context);
        }

        return null;
      }
    };
  }

  // ============================================================================
  // 💾 STORAGE FUNCTIONS WITH VALIDATION - ENHANCED
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
      if (v === null || v === undefined) return fallback;

      const parsed = JSON.parse(v);

      // Validate numeric keys
      const numericKeys = [KEYS.DAILY_COMMITTED, KEYS.COUNT, KEYS.TOTAL_COMMITS_ALLTIME, KEYS.CUSTOM_TARGET_HOURS, KEYS.CUSTOM_TARGET_COUNT];
      if (numericKeys.includes(key)) {
        if (typeof parsed === 'object' && parsed !== null) {
          console.warn(`[SM-FIX] Corrupted object in ${key}, resetting`);
          localStorage.setItem(key, JSON.stringify(fallback));
          return fallback;
        }
        if (typeof parsed !== 'number' || isNaN(parsed)) {
          console.warn(`[SM-FIX] Invalid number in ${key}, resetting`);
          localStorage.setItem(key, JSON.stringify(fallback));
          return fallback;
        }
      }

      return parsed;
    } catch (e) {
      log("retrieve error", e);
      return fallback;
    }
  }

  // Safe number retrieval helper - ENHANCED
  function retrieveNumber(key, fallback = 0) {
    // During manual reset, always return 0 for timer and count
    if (manualResetJustHappened) {
      if (key === KEYS.DAILY_COMMITTED || key === KEYS.COUNT) {
        return 0;
      }
    }

    try {
      const v = localStorage.getItem(key);
      if (v === null || v === undefined) return fallback;

      const parsed = JSON.parse(v);

      if (typeof parsed === 'number' && !isNaN(parsed) && parsed >= 0) {
        return parsed;
      }

      console.warn(`[SM-FIX] Resetting corrupted ${key}`);
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Direct localStorage write - bypasses all validation for reset
  function forceStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Verify write
      const verify = localStorage.getItem(key);
      const parsed = JSON.parse(verify);
      return parsed === value;
    } catch (e) {
      console.error(`[SM] Force store failed for ${key}:`, e);
      return false;
    }
  }

  // Direct localStorage read
  function forceRetrieve(key) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : null;
    } catch (e) {
      return null;
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

  function setIgnoreTask(taskId, timestamp = null) {
    try {
      if (taskId == null) {
        sessionStorage.removeItem(KEYS.IGNORE_TASK);
      } else {
        const ignoreData = {
          taskId: taskId,
          timestamp: timestamp || Date.now()
        };
        sessionStorage.setItem(KEYS.IGNORE_TASK, JSON.stringify(ignoreData));
      }
    } catch (e) { log(e); }
  }

  function getIgnoreTask() {
    try {
      const data = sessionStorage.getItem(KEYS.IGNORE_TASK);
      if (!data) return null;

      const ignoreData = JSON.parse(data);
      const fiveMinutes = 5 * 60 * 1000;

      if (Date.now() - ignoreData.timestamp > fiveMinutes) {
        setIgnoreTask(null);
        return null;
      }

      return ignoreData.taskId;
    } catch (e) { return null; }
  }

  // ============================================================================
  // 🔄 MULTI-TAB SYNC SYSTEM
  // ============================================================================
  const MultiTabSync = {
    syncTaskName(taskId, taskName) {
      if (!CONFIG.MULTI_TAB_SYNC) return;

      try {
        const syncData = {
          taskId: taskId,
          taskName: taskName,
          timestamp: Date.now(),
          tabId: window.name || `tab_${Date.now()}`
        };

        store(KEYS.TASK_NAME_SYNC, syncData);
        store(KEYS.MULTITAB_SYNC_TIME, Date.now());

        log(`📡 Task name synced: ${taskName}`);
      } catch (e) {
        log("❌ Task name sync error:", e);
      }
    },

    getSyncedTaskName(taskId) {
      if (!CONFIG.MULTI_TAB_SYNC) return null;

      try {
        const syncData = retrieve(KEYS.TASK_NAME_SYNC);

        if (!syncData || syncData.taskId !== taskId) {
          return null;
        }

        const age = Date.now() - syncData.timestamp;
        if (age > 60000) {
          return null;
        }

        return syncData.taskName;
      } catch (e) {
        return null;
      }
    },

    setupStorageListener() {
      if (!CONFIG.MULTI_TAB_SYNC) return;

      window.addEventListener('storage', (e) => {
        if (e.key === KEYS.TASK_NAME_SYNC && e.newValue) {
          try {
            const syncData = JSON.parse(e.newValue);
            const myTabId = window.name || `tab_${Date.now()}`;

            if (syncData.tabId !== myTabId && activeTask && activeTask.id === syncData.taskId) {
              log(`📡 Received task name update from another tab: ${syncData.taskName}`);
              activeTask.taskName = syncData.taskName;

              if (CONFIG.FIX_REFRESH_LOSS) {
                store(KEYS.ACTIVE_TASK, activeTask);
              }

              updateDisplay();
            }
          } catch (err) {
            log("❌ Storage event error:", err);
          }
        }

        // Sync theme changes across tabs
        if (e.key === KEYS.THEME && e.newValue) {
          try {
            const newTheme = JSON.parse(e.newValue);
            ThemeManager.applyGlobalTheme(newTheme);
          } catch (err) {}
        }

        // Sync reset across tabs
        if (e.key === KEYS.FORCE_RESET_FLAG && e.newValue) {
          try {
            const resetData = JSON.parse(e.newValue);
            if (resetData.timestamp > Date.now() - 5000) {
              // Recent reset from another tab
              manualResetJustHappened = true;
              setTimeout(() => {
                manualResetJustHappened = false;
              }, MANUAL_RESET_PROTECTION_DURATION);
              updateDisplay();
              updateHomeDisplay();
              updateTopBanner();
            }
          } catch (err) {}
        }
      });

      if (!window.name) {
        window.name = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      log("✅ Multi-tab sync listener active");
    }
  };

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

  function fmt12Hour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  // ============================================================================
  // 🎚️ PROGRESS BAR TOGGLE
  // ============================================================================
  function getProgressBarsEnabled() {
    return retrieve(KEYS.PROGRESS_BARS_ENABLED, true);
  }

  function setProgressBarsEnabled(enabled) {
    store(KEYS.PROGRESS_BARS_ENABLED, enabled);
    applyProgressBarVisibility();
    log(`🎚️ Progress bars: ${enabled ? 'ON' : 'OFF'}`);
  }

  function applyProgressBarVisibility() {
    const enabled = getProgressBarsEnabled();
    const progressBars = document.querySelectorAll('.sm-thin-progress');
    const utilContainer = document.getElementById('sm-utilization');

    progressBars.forEach(bar => {
      if (enabled) {
        bar.classList.remove('hidden');
        bar.style.display = 'block';
      } else {
        bar.classList.add('hidden');
        bar.style.display = 'none';
      }
    });

    if (utilContainer) {
      if (enabled) {
        utilContainer.classList.remove('compact-mode');
      } else {
        utilContainer.classList.add('compact-mode');
      }
    }
  }

  function toggleProgressBars() {
    const current = getProgressBarsEnabled();
    setProgressBarsEnabled(!current);
    updateProgressToggleButton();

    const utilContainer = document.getElementById('sm-utilization');
    if (utilContainer) {
      utilContainer.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
  }

  function updateProgressToggleButton() {
    const btn = document.getElementById('progress-toggle-btn');
    if (!btn) return;

    const enabled = getProgressBarsEnabled();
    btn.innerHTML = enabled ? '📊 Progress Bar: ON' : '📊 Progress Bar: OFF';
    btn.title = enabled ? 'Hide Progress Bars' : 'Show Progress Bars';
  }

  // ============================================================================
  // 🏆 ACHIEVEMENTS & STREAKS
  // ============================================================================
  const AchievementSystem = {
    updateStreaks() {
      const history = retrieve(KEYS.HISTORY, {});
      const today = todayStr();
      const todayCommitted = retrieveNumber(KEYS.DAILY_COMMITTED, 0);

      const streaks = retrieve(KEYS.STREAKS, {
        current: 0,
        longest: 0,
        lastDate: null
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const todayHasWork = (history[today] && history[today] > 0) || todayCommitted > 0;

      if (todayHasWork) {
        if (streaks.lastDate === yesterdayStr) {
          streaks.current = streaks.current + 1;
          streaks.lastDate = today;
        } else if (streaks.lastDate === today) {
          // Already counted
        } else if (!streaks.lastDate) {
          streaks.current = 1;
          streaks.lastDate = today;
        } else {
          streaks.current = 1;
          streaks.lastDate = today;
        }

        streaks.longest = Math.max(streaks.longest, streaks.current);
      } else if (streaks.lastDate && streaks.lastDate < yesterdayStr) {
        streaks.current = 0;
      }

      store(KEYS.STREAKS, streaks);
      return streaks;
    },

    checkAchievements(count, committed) {
      const achievements = retrieve(KEYS.ACHIEVEMENTS, {});
      const newAchievements = [];

      const checks = [
        { id: 'first_task', name: 'First Step', desc: 'Complete your first task', condition: count >= 1, emoji: '🎯' },
        { id: 'ten_tasks', name: 'Getting Started', desc: 'Complete 10 tasks', condition: count >= 10, emoji: '📋' },
        { id: 'fifty_tasks', name: 'Productive', desc: 'Complete 50 tasks', condition: count >= 50, emoji: '⚡' },
        { id: 'century', name: 'Century Maker', desc: 'Complete 100 tasks in a day', condition: count >= 100, emoji: '🥇' },
        { id: 'double_century', name: 'Double Century', desc: 'Complete 200 tasks in a day', condition: count >= 200, emoji: '🏆' },
        { id: 'one_hour', name: 'Good Start', desc: 'Work for 1 hour', condition: committed >= 3600, emoji: '⏰' },
        { id: 'four_hours', name: 'Half Day', desc: 'Work for 4 hours', condition: committed >= 14400, emoji: '🌤️' },
        { id: 'eight_hours', name: 'Full Day', desc: 'Work for 8 hours', condition: committed >= 28800, emoji: '🌟' },
        { id: 'streak_7', name: 'Week Warrior', desc: '7-day streak', condition: this.getStreak().current >= 7, emoji: '🔥' },
        { id: 'streak_30', name: 'Month Master', desc: '30-day streak', condition: this.getStreak().current >= 30, emoji: '💪' },
      ];

      checks.forEach(check => {
        if (check.condition && !achievements[check.id]) {
          achievements[check.id] = {
            ...check,
            unlockedAt: new Date().toISOString()
          };
          newAchievements.push(check);
        }
      });

      store(KEYS.ACHIEVEMENTS, achievements);
      return { all: achievements, new: newAchievements };
    },

    getStreak() {
      return retrieve(KEYS.STREAKS, { current: 0, longest: 0, lastDate: null });
    },

    getAllAchievements() {
      return retrieve(KEYS.ACHIEVEMENTS, {});
    }
  };

  // ============================================================================
  // 📊 LIVE SESSION TRACKER
  // ============================================================================
  const LiveSession = {
    start() {
      if (!retrieve(KEYS.SESSION_START)) {
        store(KEYS.SESSION_START, Date.now());
      }
    },

    getElapsed() {
      const start = retrieve(KEYS.SESSION_START);
      if (!start) return 0;
      return Math.floor((Date.now() - start) / 1000);
    },

    getTaskRate() {
      const elapsed = this.getElapsed();
      const count = retrieveNumber(KEYS.COUNT, 0);
      if (elapsed < 60) return 0;
      return ((count / elapsed) * 3600).toFixed(1);
    },

    getEstimatedFinish(targetHours) {
      const committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
      const rate = committed > 0 ? (retrieveNumber(KEYS.COUNT, 0) / committed) * 3600 : 0;

      if (rate === 0) return 'N/A';

      const targetSeconds = targetHours * 3600;
      const remaining = targetSeconds - committed;

      if (remaining <= 0) return 'Goal Reached!';

      const hoursNeeded = remaining / 3600;
      const finishTime = new Date(Date.now() + (hoursNeeded * 60 * 60 * 1000));

      return finishTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    },

    shouldTakeBreak() {
      const elapsed = this.getElapsed();
      const breakInterval = 2 * 60 * 60;
      return elapsed > 0 && elapsed % breakInterval < 60;
    }
  };

  // ============================================================================
  // 🎯 SMART TASK TYPE DETECTION
  // ============================================================================
  const TaskTypeDetector = {
    types: {
      VIDEO: 'video',
      IMAGE: 'image',
      TEXT: 'text',
      AUDIO: 'audio',
      CLASSIFICATION: 'classification',
      ANNOTATION: 'annotation',
      UNKNOWN: 'unknown'
    },

    detect() {
      try {
        const bodyText = (document.body.innerText || '').toLowerCase();
        const url = window.location.href.toLowerCase();

        // Check for video tasks
        if (bodyText.includes('video') || bodyText.includes('liveness') ||
            bodyText.includes('deepfake') || url.includes('video')) {
          return {
            type: this.types.VIDEO,
            subtype: this.detectVideoSubtype(bodyText),
            confidence: 0.95
          };
        }

        // Check for image tasks
        if (bodyText.includes('image') || bodyText.includes('photo') ||
            bodyText.includes('picture') || bodyText.includes('bounding box')) {
          return {
            type: this.types.IMAGE,
            subtype: this.detectImageSubtype(bodyText),
            confidence: 0.9
          };
        }

        // Check for text tasks
        if (bodyText.includes('text') || bodyText.includes('sentence') ||
            bodyText.includes('paragraph') || bodyText.includes('document')) {
          return {
            type: this.types.TEXT,
            subtype: 'text_annotation',
            confidence: 0.85
          };
        }

        // Check for audio tasks
        if (bodyText.includes('audio') || bodyText.includes('sound') ||
            bodyText.includes('speech') || bodyText.includes('voice')) {
          return {
            type: this.types.AUDIO,
            subtype: 'audio_classification',
            confidence: 0.85
          };
        }

        // Default classification
        if (bodyText.includes('classify') || bodyText.includes('select') ||
            bodyText.includes('choose') || bodyText.includes('label')) {
          return {
            type: this.types.CLASSIFICATION,
            subtype: 'general',
            confidence: 0.7
          };
        }

        return {
          type: this.types.UNKNOWN,
          subtype: 'unknown',
          confidence: 0.5
        };
      } catch (e) {
        return { type: this.types.UNKNOWN, subtype: 'error', confidence: 0 };
      }
    },

    detectVideoSubtype(text) {
      if (text.includes('deepfake')) return 'deepfake_detection';
      if (text.includes('liveness')) return 'liveness_detection';
      if (text.includes('action')) return 'action_recognition';
      if (text.includes('object')) return 'object_tracking';
      return 'video_classification';
    },

    detectImageSubtype(text) {
      if (text.includes('bounding')) return 'object_detection';
      if (text.includes('segment')) return 'segmentation';
      if (text.includes('face')) return 'face_detection';
      if (text.includes('ocr') || text.includes('text')) return 'ocr';
      return 'image_classification';
    },

    cache(taskId, taskType) {
      const cache = retrieve(KEYS.TASK_TYPE_CACHE, {});
      cache[taskId] = {
        ...taskType,
        timestamp: Date.now()
      };

      // Keep only last 100 entries
      const keys = Object.keys(cache);
      if (keys.length > 100) {
        keys.slice(0, keys.length - 100).forEach(key => delete cache[key]);
      }

      store(KEYS.TASK_TYPE_CACHE, cache);
    },

    getCached(taskId) {
      const cache = retrieve(KEYS.TASK_TYPE_CACHE, {});
      const cached = cache[taskId];

      if (cached && Date.now() - cached.timestamp < 3600000) {
        return cached;
      }

      return null;
    }
  };

  // ============================================================================
  // 🔧 MANUAL RESET TRACKER - NEW
  // ============================================================================
  const ManualResetTracker = {
    getLastResetTime() {
      const today = todayStr();
      const resetData = retrieve(KEYS.MANUAL_RESET_TODAY, {});
      if (resetData.date === today && resetData.timestamp) {
        return resetData.timestamp;
      }
      return null;
    },

    setResetTime() {
      const today = todayStr();
      store(KEYS.MANUAL_RESET_TODAY, {
        date: today,
        timestamp: Date.now()
      });
      store(KEYS.LAST_MANUAL_RESET_TIME, Date.now());
      log("📌 Manual reset time recorded: " + new Date().toISOString());
    },

    wasResetToday() {
      const today = todayStr();
      const resetData = retrieve(KEYS.MANUAL_RESET_TODAY, {});
      return resetData.date === today && resetData.timestamp;
    },

    clearForNewDay() {
      const today = todayStr();
      const resetData = retrieve(KEYS.MANUAL_RESET_TODAY, {});
      if (resetData.date !== today) {
        store(KEYS.MANUAL_RESET_TODAY, {});
        store(KEYS.LAST_MANUAL_RESET_TIME, null);
        log("🌅 Manual reset tracker cleared for new day");
      }
    },

    shouldSkipSessionsBeforeReset(sessionDate) {
      const lastReset = this.getLastResetTime();
      if (!lastReset) return false;

      const sessionTime = new Date(sessionDate).getTime();
      return sessionTime < lastReset;
    }
  };

  // ============================================================================
  // 📊 PERMANENT TASK COMMITS TRACKER - NOT AFFECTED BY MANUAL RESET
  // ============================================================================
  const PermanentTaskCommits = {
    // Get permanent commits for today (not affected by manual reset)
    getTodayCommits() {
      const today = todayStr();
      const data = retrieve(KEYS.PERMANENT_TASK_COMMITS, {});
      if (!data[today]) {
        data[today] = {
          tasks: {},
          totalCommits: 0
        };
        store(KEYS.PERMANENT_TASK_COMMITS, data);
      }
      return data[today];
    },

    // Add a commit for a task
    addCommit(taskName, duration) {
      const today = todayStr();
      const data = retrieve(KEYS.PERMANENT_TASK_COMMITS, {});

      if (!data[today]) {
        data[today] = {
          tasks: {},
          totalCommits: 0
        };
      }

      const normalizedName = taskName || 'Unknown Task';

      if (!data[today].tasks[normalizedName]) {
        data[today].tasks[normalizedName] = {
          commits: 0,
          totalTime: 0,
          avgDuration: 0
        };
      }

      data[today].tasks[normalizedName].commits++;
      data[today].tasks[normalizedName].totalTime += (duration || 0);
      data[today].tasks[normalizedName].avgDuration =
        data[today].tasks[normalizedName].totalTime / data[today].tasks[normalizedName].commits;
      data[today].totalCommits++;

      store(KEYS.PERMANENT_TASK_COMMITS, data);

      log(`📊 Permanent commit added: ${normalizedName} (Total: ${data[today].tasks[normalizedName].commits})`);
    },

    // Get task data for today
    getTaskData(taskName) {
      const todayData = this.getTodayCommits();
      return todayData.tasks[taskName] || { commits: 0, totalTime: 0, avgDuration: 0 };
    },

    // Get all tasks for today
    getAllTasks() {
      const todayData = this.getTodayCommits();
      return todayData.tasks;
    },

    // Get total commits for today
    getTotalCommits() {
      const todayData = this.getTodayCommits();
      return todayData.totalCommits || 0;
    },

    // Clean up old data (keep only last 30 days)
    cleanup() {
      const data = retrieve(KEYS.PERMANENT_TASK_COMMITS, {});
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      let cleaned = false;
      Object.keys(data).forEach(date => {
        if (date < cutoffStr) {
          delete data[date];
          cleaned = true;
        }
      });

      if (cleaned) {
        store(KEYS.PERMANENT_TASK_COMMITS, data);
        log("🧹 Old permanent task commits cleaned up");
      }
    }
  };

  // Run cleanup on startup
  PermanentTaskCommits.cleanup();

  // ============================================================================
  // 🤖 SMART ENGINE
  // ============================================================================
  class SmartEngineClass {
    constructor() {
      this.patterns = retrieve(KEYS.SMART_PATTERNS, {});
      this.predictions = retrieve(KEYS.SMART_PREDICTIONS, {});
      this.anomalies = retrieve(KEYS.SMART_ANOMALIES, []);
      this.insights = retrieve(KEYS.SMART_INSIGHTS, []);
      this.profile = retrieve(KEYS.SMART_PROFILE, {});
      this.stats = retrieve(KEYS.SMART_STATS, {
        protections_applied: 0,
        anomalies_detected: 0,
        patterns_learned: 0,
        predictions_made: 0,
        auto_fixes: 0,
        optimizations: 0,
        accuracy_validations: 0,
        data_recoveries: 0,
        errors_prevented: 0,
        self_heals: 0,
        performance_optimizations: 0,
        stability_checks: 0,
        reliability_improvements: 0,
      });

      this.config = retrieve(KEYS.SMART_CONFIG, {
        learning_enabled: CONFIG.SMART_LEARNING_ENABLED,
        protection_enabled: CONFIG.SMART_PROTECTION_ENABLED,
        suggestions_enabled: CONFIG.SMART_SUGGESTIONS_ENABLED,
        auto_fix_enabled: CONFIG.SMART_AUTO_FIX_ENABLED,
        prediction_enabled: CONFIG.SMART_PREDICTION_ENABLED,
        optimization_enabled: CONFIG.SMART_OPTIMIZATION_ENABLED,
        anomaly_threshold: CONFIG.SMART_ANOMALY_THRESHOLD,
        real_time_validation: CONFIG.SMART_REAL_TIME_VALIDATION,
        predictive_failure: CONFIG.SMART_PREDICTIVE_FAILURE,
        self_healing: CONFIG.SMART_SELF_HEALING,
        performance_monitor: CONFIG.SMART_PERFORMANCE_MONITOR,
        stability_checks: CONFIG.SMART_STABILITY_CHECKS,
        reliability_scoring: CONFIG.SMART_RELIABILITY_SCORING,
      });

      this.lastCheck = Date.now();
      this.performanceMetrics = {
        memory_usage: 0,
        cpu_impact: 'Low',
        efficiency: 100,
        accuracy: 100,
        response_time: 0,
        error_rate: 0,
        success_rate: 100,
        uptime: 100,
        stability_score: 100,
        reliability_score: 100,
      };

      this.health = retrieve(KEYS.SMART_HEALTH, {
        status: 'excellent',
        last_check: Date.now(),
        issues: [],
        warnings: [],
      });

      this.performanceHistory = [];
      this.errorLog = retrieve(KEYS.SMART_ERROR_LOG, []);
      this.recoveryLog = retrieve(KEYS.SMART_RECOVERY_LOG, []);

      this.isPaused = false;

      if (this.config.real_time_validation) {
        this.startRealTimeValidation();
      }

      log("🤖 Smart Engine v7.3 initialized");
    }

    startRealTimeValidation() {
      setInterval(() => {
        if (!this.isPaused) {
          this.validateAccuracyRealTime();
        }
      }, 5000);
    }

    validateAccuracyRealTime() {
      // Skip validation during reset or if paused
      if (forceResetActive || resetInProgress || isResetting || this.isPaused || manualResetJustHappened) {
        log("⏸️ Skipping validation - reset/pause active");
        return;
      }

      // Skip if manual reset happened today and self-healing is disabled after reset
      if (CONFIG.DISABLE_SELF_HEALING_AFTER_RESET && ManualResetTracker.wasResetToday()) {
        log("⏸️ Skipping validation - manual reset happened today");
        return;
      }

      try {
        const startTime = performance.now();
        const committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
        const sessions = retrieve(KEYS.SESSIONS, []) || [];
        const today = todayStr();

        // Get the last manual reset time
        const lastManualResetTime = ManualResetTracker.getLastResetTime();

        // Only count sessions AFTER the last manual reset
        const todaySessions = sessions.filter(s => {
          const sessionDate = new Date(s.date).toISOString().split('T')[0];
          if (sessionDate !== today) return false;

          // If there was a manual reset today, only count sessions after that
          if (lastManualResetTime) {
            const sessionTime = new Date(s.date).getTime();
            if (sessionTime < lastManualResetTime) {
              return false;
            }
          }

          return true;
        });

        const expectedTotal = todaySessions.reduce((sum, s) => {
          if (s.action === 'submitted' || s.action.includes('manual_reset')) {
            return sum + (s.duration || 0);
          }
          return sum;
        }, 0);

        const actual = committed;
        const diff = Math.abs(expectedTotal - actual);

        const responseTime = performance.now() - startTime;
        this.performanceMetrics.response_time = responseTime.toFixed(2);

        // Only attempt to fix if difference is significant AND no manual reset happened
        if (diff > 60 && !forceResetActive && !ManualResetTracker.wasResetToday()) {
          log(`⚠️ Alert: Accuracy drift detected! Expected: ${expectedTotal}, Actual: ${actual}, Diff: ${diff}`);

          if (this.config.self_healing && !forceResetActive && !manualResetJustHappened) {
            log("🔧 Auto-repairing...");
            this.performSelfHeal('accuracy_drift', {
              expected: expectedTotal,
              actual,
              diff,
              corrected_value: expectedTotal
            });
          }
        } else {
          this.performanceMetrics.accuracy = 100;
          this.performanceMetrics.success_rate = Math.min(100, this.performanceMetrics.success_rate + 0.1);
        }

        this.stats.accuracy_validations++;
        this.updateHealthStatus();

      } catch (e) {
        log("❌ Validation error:", e);
        this.handleError(e, 'real_time_validation');
      }
    }

    performSelfHeal(issueType, data) {
      // Skip during manual reset or if recently reset
      if (forceResetActive || resetInProgress || manualResetJustHappened) {
        log("⏸️ Skipping self-heal - reset in progress or just happened");
        return;
      }

      // Skip if manual reset happened today
      if (CONFIG.DISABLE_SELF_HEALING_AFTER_RESET && ManualResetTracker.wasResetToday()) {
        log("⏸️ Skipping self-heal - manual reset happened today");
        return;
      }

      try {
        log(`🔧 Self-Heal: ${issueType}`);

        switch(issueType) {
          case 'accuracy_drift':
            if (!forceResetActive && !manualResetJustHappened && !ManualResetTracker.wasResetToday()) {
              store(KEYS.DAILY_COMMITTED, data.corrected_value);
              this.stats.self_heals++;
              this.stats.auto_fixes++;
              this.stats.data_recoveries++;
              this.logRecovery(issueType, `Auto-corrected drift`, data);
            }
            break;

          case 'corrupted_data':
            this.detectDataCorruption();
            this.stats.self_heals++;
            this.logRecovery(issueType, 'Cleaned corrupted data', data);
            break;

          case 'memory_leak':
            this.preventMemoryLeaks();
            this.stats.self_heals++;
            this.logRecovery(issueType, 'Cleared memory leaks', data);
            break;

          case 'session_corruption':
            this.validateSessions();
            this.stats.self_heals++;
            this.logRecovery(issueType, 'Validated sessions', data);
            break;
        }

        this.saveState();

        if (typeof updateDisplay === 'function' && !forceResetActive && !manualResetJustHappened) {
          updateDisplay();
        }

      } catch (e) {
        log("❌ Self-heal error:", e);
        this.handleError(e, 'self_heal');
      }
    }

    detectDataCorruption() {
      if (forceResetActive || manualResetJustHappened) return false;

      try {
        const committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
        const count = retrieveNumber(KEYS.COUNT, 0);
        const sessions = retrieve(KEYS.SESSIONS, []);
        let fixed = false;

        if (committed < 0 || committed > 86400) {
          store(KEYS.DAILY_COMMITTED, Math.max(0, Math.min(86400, committed)));
          fixed = true;
        }

        if (count < 0) {
          store(KEYS.COUNT, 0);
          fixed = true;
        }

        if (!Array.isArray(sessions)) {
          store(KEYS.SESSIONS, []);
          fixed = true;
        }

        if (fixed) this.stats.auto_fixes++;
        return fixed;
      } catch (e) {
        return false;
      }
    }

    validateSessions() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        let cleaned = false;

        const validSessions = sessions.filter(s => {
          if (s.duration < 0 || s.duration > 86400) {
            cleaned = true;
            return false;
          }
          if (!s.date || isNaN(new Date(s.date).getTime())) {
            cleaned = true;
            return false;
          }
          return true;
        });

        if (cleaned) {
          store(KEYS.SESSIONS, validSessions);
          this.stats.auto_fixes++;
        }
        return cleaned;
      } catch (e) {
        return false;
      }
    }

    preventMemoryLeaks() {
      try {
        if (this.anomalies.length > 100) {
          this.anomalies = this.anomalies.slice(-100);
          store(KEYS.SMART_ANOMALIES, this.anomalies);
        }
        if (this.insights.length > 50) {
          this.insights = this.insights.slice(-50);
          store(KEYS.SMART_INSIGHTS, this.insights);
        }
        if (this.errorLog.length > 100) {
          this.errorLog = this.errorLog.slice(-100);
          store(KEYS.SMART_ERROR_LOG, this.errorLog);
        }
        if (Date.now() - this.lastCheck > 60000) {
          DOMCache.clear();
          this.lastCheck = Date.now();
        }
        return true;
      } catch (e) {
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
        return false;
      }
    }

    analyzePatterns() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        if (sessions.length < 5) return;

        const taskPatterns = {};

        sessions.forEach(session => {
          const taskName = session.taskName || "Unknown Task";

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

          if (session.action === 'submitted' || session.action.includes('manual_reset')) {
            pattern.total_duration += (session.duration || 0);
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

        store(KEYS.SMART_PATTERNS, taskPatterns);
        this.stats.patterns_learned = Object.keys(taskPatterns).length;
        return taskPatterns;
      } catch (e) {
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
          efficiency_score: 0,
          consistency_score: 0
        };

        const daysTracked = Object.keys(history).length;
        if (daysTracked > 0) {
          profile.average_daily_hours = (profile.total_time_worked / daysTracked / 3600).toFixed(2);
        }

        const submitted = sessions.filter(s => s.action === 'submitted' || s.action.includes('manual_reset')).length;
        profile.efficiency_score = Math.round((submitted / sessions.length) * 100);

        this.profile = profile;
        store(KEYS.SMART_PROFILE, profile);
        return profile;
      } catch (e) {
        return {};
      }
    }

    predictFailures() {
      try {
        const predictions = [];

        const storageUsed = JSON.stringify(localStorage).length;
        const storageLimit = 10000000;
        const storagePercent = (storageUsed / storageLimit) * 100;

        if (storagePercent > 80) {
          predictions.push({
            type: 'storage_overflow',
            severity: 'high',
            probability: storagePercent - 80,
            eta: this.estimateStorageFull(),
            action: 'Cleanup old data or export'
          });
        }

        const sessions = retrieve(KEYS.SESSIONS, []);
        if (sessions.length > CONFIG.SESSIONS_LIMIT * 0.9) {
          predictions.push({
            type: 'session_limit',
            severity: 'medium',
            probability: 70,
            eta: this.estimateSessionLimit(sessions.length),
            action: 'Export and cleanup sessions'
          });
        }

        if (this.errorLog.length > 10) {
          const recentErrors = this.errorLog.slice(-10);
          const errorRate = recentErrors.length / 10;
          if (errorRate > 0.3) {
            predictions.push({
              type: 'stability_degradation',
              severity: 'high',
              probability: errorRate * 100,
              eta: 'Immediate',
              action: 'Review error log and reset if needed'
            });
          }
        }

        if (predictions.length > 0) {
          this.predictions.failures = predictions;
          store(KEYS.SMART_PREDICTIONS, this.predictions);
        }

        return predictions;

      } catch (e) {
        return [];
      }
    }

    estimateStorageFull() {
      const storageUsed = JSON.stringify(localStorage).length;
      const sessions = retrieve(KEYS.SESSIONS, []);
      const avgSessionSize = storageUsed / Math.max(1, sessions.length);
      const remainingSpace = 10000000 - storageUsed;
      const sessionsUntilFull = remainingSpace / avgSessionSize;
      const avgSessionsPerDay = sessions.filter(s => {
        const date = new Date(s.date);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return date > dayAgo;
      }).length;
      const daysUntilFull = sessionsUntilFull / Math.max(1, avgSessionsPerDay);
      return `${Math.floor(daysUntilFull)} days`;
    }

    estimateSessionLimit(currentCount) {
      const sessions = retrieve(KEYS.SESSIONS, []);
      const avgSessionsPerDay = sessions.filter(s => {
        const date = new Date(s.date);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return date > dayAgo;
      }).length;
      const remainingSessions = CONFIG.SESSIONS_LIMIT - currentCount;
      const daysUntilLimit = remainingSessions / Math.max(1, avgSessionsPerDay);
      return `${Math.floor(daysUntilLimit)} days`;
    }

    monitorPerformance() {
      try {
        const startTime = performance.now();

        const storageSize = JSON.stringify(localStorage).length;
        this.performanceMetrics.memory_usage = (storageSize / 1024).toFixed(2);

        const operations = this.stats.protections_applied + this.stats.accuracy_validations;
        if (operations > 1000) {
          this.performanceMetrics.cpu_impact = 'High';
        } else if (operations > 500) {
          this.performanceMetrics.cpu_impact = 'Medium';
        } else {
          this.performanceMetrics.cpu_impact = 'Low';
        }

        const errorRate = this.errorLog.length / Math.max(1, operations);
        this.performanceMetrics.error_rate = (errorRate * 100).toFixed(2);
        this.performanceMetrics.efficiency = Math.max(0, 100 - (errorRate * 100));

        const responseTime = performance.now() - startTime;
        this.performanceHistory.push(responseTime);
        if (this.performanceHistory.length > 100) {
          this.performanceHistory.shift();
        }

        const avgResponseTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
        this.performanceMetrics.response_time = avgResponseTime.toFixed(2);

        const recentErrors = this.errorLog.slice(-20).length;
        this.performanceMetrics.stability_score = Math.max(0, 100 - (recentErrors * 5));

        store(KEYS.SMART_PERFORMANCE, this.performanceMetrics);
        this.stats.performance_optimizations++;

      } catch (e) {
        log("❌ Performance monitoring error:", e);
      }
    }

    checkStability() {
      try {
        const issues = [];
        const warnings = [];

        const committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
        if (committed < 0 || committed > 86400) {
          issues.push('Invalid daily_committed value');
        }

        const count = retrieveNumber(KEYS.COUNT, 0);
        if (count < 0) {
          issues.push('Negative count value');
        }

        const sessions = retrieve(KEYS.SESSIONS, []);
        if (!Array.isArray(sessions)) {
          issues.push('Sessions not an array');
        }

        const storageUsed = JSON.stringify(localStorage).length;
        const storagePercent = (storageUsed / 10000000) * 100;
        if (storagePercent > 90) {
          issues.push('Storage almost full');
        } else if (storagePercent > 70) {
          warnings.push('Storage usage high');
        }

        const recentErrors = this.errorLog.slice(-20);
        if (recentErrors.length > 10) {
          issues.push('High error rate detected');
        } else if (recentErrors.length > 5) {
          warnings.push('Elevated error rate');
        }

        this.health.issues = issues;
        this.health.warnings = warnings;
        this.health.last_check = Date.now();

        if (issues.length === 0 && warnings.length === 0) {
          this.health.status = 'excellent';
        } else if (issues.length === 0) {
          this.health.status = 'good';
        } else if (issues.length < 3) {
          this.health.status = 'degraded';
        } else {
          this.health.status = 'critical';
        }

        store(KEYS.SMART_HEALTH, this.health);
        this.stats.stability_checks++;

        if (issues.length > 0 && this.config.self_healing && !forceResetActive && !manualResetJustHappened && !ManualResetTracker.wasResetToday()) {
          issues.forEach(issue => {
            if (issue.includes('Invalid daily_committed')) {
              this.performSelfHeal('corrupted_data', { field: 'daily_committed' });
            }
            if (issue.includes('Negative count')) {
              this.performSelfHeal('corrupted_data', { field: 'count' });
            }
            if (issue.includes('Sessions not an array')) {
              this.performSelfHeal('session_corruption', {});
            }
          });
        }

      } catch (e) {
        log("❌ Stability check error:", e);
        this.handleError(e, 'stability_check');
      }
    }

    calculateReliabilityScore() {
      try {
        let score = 100;

        const errorRate = this.errorLog.length / Math.max(1, this.stats.accuracy_validations);
        score -= (errorRate * 50);

        const sessions = retrieve(KEYS.SESSIONS, []);
        const validationFailures = sessions.filter(s => s.action === 'validation_failed').length;
        score -= (validationFailures * 2);

        score -= (this.health.issues.length * 10);
        score -= (this.health.warnings.length * 5);

        const successRate = this.performanceMetrics.success_rate || 100;
        score = (score + successRate) / 2;

        const healBonus = Math.min(10, this.stats.self_heals * 0.5);
        score += healBonus;

        score = Math.max(0, Math.min(100, score));

        this.performanceMetrics.reliability_score = Math.round(score);
        this.stats.reliability_improvements++;

        return score;

      } catch (e) {
        return 0;
      }
    }

    handleError(error, context) {
      try {
        const errorEntry = {
          error: error.message,
          context: context,
          timestamp: new Date().toISOString(),
          stack: error.stack?.substring(0, 200)
        };

        this.errorLog.push(errorEntry);
        if (this.errorLog.length > 100) {
          this.errorLog.shift();
        }
        store(KEYS.SMART_ERROR_LOG, this.errorLog);

        if (this.config.self_healing && !forceResetActive && !manualResetJustHappened) {
          this.attemptRecovery(error, context);
        }

        this.stats.errors_prevented++;

      } catch (e) {
        log("❌ Error handler error:", e);
      }
    }

    attemptRecovery(error, context) {
      if (forceResetActive || manualResetJustHappened || ManualResetTracker.wasResetToday()) return;

      try {
        switch(context) {
          case 'storage':
            this.performSelfHeal('memory_leak', {});
            break;
          case 'validation':
            this.performSelfHeal('accuracy_drift', {});
            break;
          case 'session':
            this.performSelfHeal('session_corruption', {});
            break;
          default:
            DOMCache.clear();
            this.validateSessions();
            this.detectDataCorruption();
        }

        this.logRecovery(context, 'Auto-recovery attempted', { error: error.message });

      } catch (e) {
        log("❌ Recovery attempt error:", e);
      }
    }

    logRecovery(type, message, data) {
      const recoveryEntry = {
        type,
        message,
        data,
        timestamp: new Date().toISOString()
      };

      this.recoveryLog.push(recoveryEntry);
      if (this.recoveryLog.length > 50) {
        this.recoveryLog.shift();
      }
      store(KEYS.SMART_RECOVERY_LOG, this.recoveryLog);
    }

    updateHealthStatus() {
      try {
        const score = this.calculateReliabilityScore();

        if (score >= 95) {
          this.health.status = 'excellent';
        } else if (score >= 80) {
          this.health.status = 'good';
        } else if (score >= 60) {
          this.health.status = 'degraded';
        } else {
          this.health.status = 'critical';
        }

        store(KEYS.SMART_HEALTH, this.health);

      } catch (e) {
        log("❌ Health status update error:", e);
      }
    }

    getInsights() {
      const sessions = retrieve(KEYS.SESSIONS, []);
      const insights = [];

      if (sessions.length < 10) return ['Complete more tasks to generate insights'];

      const hourlyData = Array(24).fill(0).map((_, hour) => ({ hour, tasks: 0 }));
      sessions.forEach(session => {
        const hour = new Date(session.date).getHours();
        if (session.action === 'submitted' || session.action.includes('manual_reset')) {
          hourlyData[hour].tasks++;
        }
      });

      const peakHour = hourlyData.reduce((max, h) => h.tasks > max.tasks ? h : max, hourlyData[0]);
      if (peakHour.tasks > 0) {
        insights.push(`🔥 You're most productive at ${fmt12Hour(peakHour.hour)}`);
      }

      const taskTimes = sessions
        .filter(s => s.action === 'submitted' && s.duration > 0)
        .map(s => s.duration);

      if (taskTimes.length > 0) {
        const avgTime = taskTimes.reduce((a, b) => a + b, 0) / taskTimes.length;
        if (avgTime < 300) {
          insights.push(`⚡ You're fast! Average task: ${Math.floor(avgTime / 60)} mins`);
        } else if (avgTime > 600) {
          insights.push(`🐢 Complex tasks? Average: ${Math.floor(avgTime / 60)} mins`);
        }
      }

      const streaks = AchievementSystem.getStreak();
      if (streaks.current >= 7) {
        insights.push(`🔥 Amazing ${streaks.current}-day streak! Keep it up!`);
      }

      // Task type insight
      const taskType = TaskTypeDetector.detect();
      if (taskType.type !== 'unknown') {
        insights.push(`📋 Current task type: ${taskType.type.replace('_', ' ').toUpperCase()}`);
      }

      return insights.length > 0 ? insights : ['Keep working to generate insights!'];
    }

    protect() {
      if (!this.config.protection_enabled || forceResetActive || manualResetJustHappened) return;

      this.detectDataCorruption();
      this.validateSessions();
      this.preventMemoryLeaks();
      this.checkIntegrity();

      this.stats.protections_applied++;
      this.saveState();
    }

    learn() {
      if (!this.config.learning_enabled) return;
      this.analyzePatterns();
      this.buildUserProfile();
      this.saveState();
    }

    predict() {
      if (!this.config.prediction_enabled) return;

      if (this.config.predictive_failure) {
        this.predictFailures();
      }

      this.stats.predictions_made++;
      this.saveState();
    }

    optimize() {
      if (!this.config.optimization_enabled) return;

      if (this.config.performance_monitor) {
        this.monitorPerformance();
      }

      this.stats.optimizations++;
      this.saveState();
    }

    saveState() {
      try {
        store(KEYS.SMART_STATS, this.stats);
        store(KEYS.SMART_CONFIG, this.config);
        store(KEYS.SMART_HEALTH, this.health);
        store(KEYS.SMART_PERFORMANCE, this.performanceMetrics);
      } catch (e) {
        log("❌ Save error", e);
      }
    }

    getStatus() {
      return {
        enabled: CONFIG.SMART_ENABLED,
        version: '7.3-ULTIMATE',
        counting_mode: CONFIG.COUNTING_MODE,
        stats: this.stats,
        performance: this.performanceMetrics,
        health: this.health,
        profile: this.profile,
        predictions: this.predictions,
        insights: this.insights.slice(0, 5),
        anomalies: this.anomalies.slice(0, 5),
        recent_errors: this.errorLog.slice(-5),
        recent_recoveries: this.recoveryLog.slice(-5),
        delayTracking: DelayAccumulator.getStats(),
        isPaused: this.isPaused,
        manualResetToday: ManualResetTracker.wasResetToday()
      };
    }

    run() {
      if (forceResetActive || resetInProgress || this.isPaused || manualResetJustHappened) return;

      try {
        this.protect();
        this.learn();
        this.predict();
        this.optimize();

        if (this.config.stability_checks) {
          this.checkStability();
        }

        if (this.config.reliability_scoring) {
          this.calculateReliabilityScore();
        }

      } catch (e) {
        log("❌ Smart Engine Run error", e);
        this.handleError(e, 'smart_run');
      }
    }

    // Pause during reset
    pause() {
      this.isPaused = true;
      log("🤖 Smart Engine paused for reset");
    }

    resume() {
      this.isPaused = false;
      log("🤖 Smart Engine resumed");
    }
  }

  const SmartEngine = new SmartEngineClass();
  window.SmartEngine = SmartEngine;

  if (CONFIG.SMART_ENABLED) {
    setInterval(() => {
      if (!forceResetActive && !resetInProgress && !manualResetJustHappened) {
        SmartEngine.run();
      }
    }, CONFIG.SMART_CHECK_INTERVAL);

    setTimeout(() => {
      SmartEngine.run();
    }, 5000);
  }

  LiveSession.start();

  // ============================================================================
  // 🔔 ULTRA ENHANCED REMINDER SYSTEM - PRO EDITION
  // ============================================================================
  class UltraReminderSystem {
    constructor() {
      this.settings = this.loadSettings();
      this.stats = this.loadStats();
      this.activeReminders = new Map();
      this.snoozedReminders = new Map();
      this.lastWarnings = new Map();
      this.audioContext = null;
      this.notificationQueue = [];
      this.isShowingNotification = false;
      this.browserNotificationsEnabled = false;

      this.initializeAudio();
      this.requestNotificationPermission();
      this.startReminderLoop();

      log("🔔 Ultra Reminder System v7.3 PRO initialized");
    }

    loadSettings() {
      const defaults = {
        enabled: false,
        taskExpiry: {
          enabled: false,
          warningTime: 120,
          urgentTime: 60,
          criticalTime: 30,
        },
        sound: {
          enabled: true,
          volume: 60,
          type: 'gentle',
          repeatCount: 3,
          repeatInterval: 800
        },
        notification: {
          browserNotification: true,
          popupNotification: true,
          position: 'top-right',
          autoDismiss: 15,
          theme: 'match-dashboard'
        },
        advanced: {
          smartTiming: true,
          snoozeEnabled: true,
          snoozeDuration: 60,
          repeatWarnings: true,
          vibrate: false,
        }
      };

      return retrieve(KEYS.REMINDER_SETTINGS, defaults);
    }

    saveSettings() {
      store(KEYS.REMINDER_SETTINGS, this.settings);
      log("💾 Reminder settings saved");
    }

    loadStats() {
      return retrieve(KEYS.REMINDER_STATS, {
        totalShown: 0,
        totalSnoozed: 0,
        totalDismissed: 0,
        tasksSavedByWarning: 0,
        lastShown: null
      });
    }

    saveStats() {
      store(KEYS.REMINDER_STATS, this.stats);
    }

    initializeAudio() {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        log("🔊 Audio system initialized");
      } catch (e) {
        log("❌ Audio system failed:", e);
      }
    }

    async playSound(type = 'gentle', urgency = 'normal') {
      if (!this.settings.sound.enabled || !this.audioContext) return;

      const repeatCount = this.settings.sound.repeatCount || 1;
      const repeatInterval = this.settings.sound.repeatInterval || 800;

      log(`🔊 Playing ${type} sound ${repeatCount}x (${urgency})`);

      for (let i = 0; i < repeatCount; i++) {
        await this.playSingleBeep(type, urgency);

        if (i < repeatCount - 1) {
          await new Promise(resolve => setTimeout(resolve, repeatInterval));
        }
      }
    }

    playSingleBeep(type, urgency) {
      return new Promise((resolve) => {
        try {
          const volume = this.settings.sound.volume / 100;

          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);

          const profiles = {
            gentle: {
              normal: { freq: 440, duration: 0.3 },
              warning: { freq: 523, duration: 0.4 },
              urgent: { freq: 659, duration: 0.5 },
              critical: { freq: 784, duration: 0.6 }
            },
            beep: {
              normal: { freq: 800, duration: 0.2 },
              warning: { freq: 900, duration: 0.3 },
              urgent: { freq: 1000, duration: 0.4 },
              critical: { freq: 1200, duration: 0.5 }
            },
            chime: {
              normal: { freq: 523, duration: 0.4 },
              warning: { freq: 659, duration: 0.5 },
              urgent: { freq: 784, duration: 0.6 },
              critical: { freq: 880, duration: 0.7 }
            },
            bell: {
              normal: { freq: 349, duration: 0.5 },
              warning: { freq: 392, duration: 0.6 },
              urgent: { freq: 440, duration: 0.7 },
              critical: { freq: 494, duration: 0.8 }
            }
          };

          const profile = profiles[type] || profiles.gentle;
          const config = profile[urgency] || profile.normal;

          oscillator.frequency.value = config.freq;
          oscillator.type = 'sine';

          const now = this.audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
          gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + config.duration - 0.05);
          gainNode.gain.linearRampToValueAtTime(0, now + config.duration);

          oscillator.start(now);
          oscillator.stop(now + config.duration);

          oscillator.onended = () => {
            resolve();
          };

          if (urgency === 'critical' || urgency === 'urgent') {
            setTimeout(() => {
              const osc2 = this.audioContext.createOscillator();
              const gain2 = this.audioContext.createGain();
              osc2.connect(gain2);
              gain2.connect(this.audioContext.destination);
              osc2.frequency.value = config.freq * 1.5;
              osc2.type = 'sine';

              const now2 = this.audioContext.currentTime;
              gain2.gain.setValueAtTime(0, now2);
              gain2.gain.linearRampToValueAtTime(volume * 0.2, now2 + 0.01);
              gain2.gain.linearRampToValueAtTime(0, now2 + config.duration * 0.5);

              osc2.start(now2);
              osc2.stop(now2 + config.duration * 0.5);
            }, 100);
          }

        } catch (e) {
          log("❌ Sound playback failed:", e);
          resolve();
        }
      });
    }

    async requestNotificationPermission() {
      if (!("Notification" in window)) {
        log("⚠️ Browser notifications not supported");
        return;
      }

      if (Notification.permission === "granted") {
        this.browserNotificationsEnabled = true;
        log("✅ Browser notifications: GRANTED");
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        this.browserNotificationsEnabled = (permission === "granted");
        log(`🔔 Notification permission: ${permission}`);
      }
    }

    showBrowserNotification(title, message, urgency = 'normal') {
      if (!this.settings.notification.browserNotification) return;
      if (!this.browserNotificationsEnabled) return;

      try {
        const notification = new Notification(title, {
          body: message,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">⏰</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">⏰</text></svg>',
          tag: 'sagemaker-reminder',
          requireInteraction: urgency === 'critical',
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        if (urgency !== 'critical') {
          setTimeout(() => notification.close(), this.settings.notification.autoDismiss * 1000);
        }

        log(`🌐 Browser notification shown: ${title}`);
      } catch (e) {
        log("❌ Browser notification failed:", e);
      }
    }

    showPopupNotification(data) {
      if (!this.settings.notification.popupNotification) return;

      if (this.isShowingNotification) {
        this.notificationQueue.push(data);
        log("📋 Notification queued");
        return;
      }

      this.isShowingNotification = true;
      this.createPopupElement(data);
    }

    createPopupElement(data) {
      const {
        title,
        message,
        urgency = 'normal',
        actions = [],
        countdown = null,
        icon = '⏰'
      } = data;

      const existing = document.getElementById('sm-reminder-popup');
      if (existing) existing.remove();

      const theme = ThemeManager.getTheme();
      const colors = ThemeManager.getThemeColors();

      const popup = document.createElement('div');
      popup.id = 'sm-reminder-popup';
      popup.setAttribute('data-theme', theme);
      popup.className = `sm-reminder-popup urgency-${urgency} position-${this.settings.notification.position}`;

      const urgencyColors = {
        normal: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', glow: 'rgba(59, 130, 246, 0.3)' },
        warning: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', glow: 'rgba(245, 158, 11, 0.3)' },
        urgent: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.3)' },
        critical: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.2)', glow: 'rgba(220, 38, 38, 0.5)' }
      };

      const uColors = urgencyColors[urgency] || urgencyColors.normal;

      popup.innerHTML = `
        <style>
          @keyframes slideInRight {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          @keyframes slideInLeft {
            from { transform: translateX(-400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }

          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px ${uColors.glow}, 0 8px 32px rgba(0,0,0,0.4); }
            50% { box-shadow: 0 0 40px ${uColors.glow}, 0 12px 48px rgba(0,0,0,0.6); }
          }

          .sm-reminder-popup {
            position: fixed;
            z-index: 999999999;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-width: 360px;
            max-width: 420px;
            background: ${theme === 'light' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)' : 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)'};
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            border: 2px solid ${uColors.border};
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)'} inset;
            overflow: hidden;
            animation: glow 2s ease-in-out infinite;
          }

          .sm-reminder-popup.position-top-right {
            top: 20px;
            right: 20px;
            animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .sm-reminder-popup.position-top-left {
            top: 20px;
            left: 20px;
            animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .sm-reminder-popup.position-bottom-right {
            bottom: 20px;
            right: 20px;
            animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .sm-reminder-popup.position-bottom-left {
            bottom: 20px;
            left: 20px;
            animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .sm-reminder-popup.urgency-critical {
            animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), shake 0.5s ease-in-out 0.4s;
          }

          .sm-reminder-popup::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, transparent, ${uColors.border}, transparent);
            animation: shimmer 2s linear infinite;
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          .sm-reminder-header {
            padding: 18px 20px;
            background: ${uColors.bg};
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)'};
          }

          .sm-reminder-icon {
            font-size: 28px;
            animation: pulse 2s ease-in-out infinite;
            filter: drop-shadow(0 2px 8px ${uColors.glow});
          }

          .sm-reminder-title-section {
            flex: 1;
          }

          .sm-reminder-title {
            font-size: 16px;
            font-weight: 900;
            color: ${colors.textPrimary};
            margin: 0 0 4px 0;
            line-height: 1.2;
          }

          .sm-reminder-urgency-badge {
            display: inline-block;
            padding: 2px 8px;
            background: ${uColors.border};
            color: white;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .sm-reminder-close {
            width: 28px;
            height: 28px;
            border: none;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(100, 116, 139, 0.3)'};
            color: ${colors.textSecondary};
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            font-weight: 700;
          }

          .sm-reminder-close:hover {
            background: rgba(239, 68, 68, 0.8);
            color: white;
            transform: scale(1.1);
          }

          .sm-reminder-body {
            padding: 20px;
          }

          .sm-reminder-message {
            font-size: 14px;
            color: ${colors.textSecondary};
            line-height: 1.6;
            margin-bottom: 16px;
            font-weight: 500;
          }

          .sm-reminder-countdown {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0, 0, 0, 0.3)'};
            border-radius: 12px;
            margin-bottom: 16px;
            border: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)'};
          }

          .sm-reminder-countdown-icon {
            font-size: 24px;
            margin-right: 12px;
          }

          .sm-reminder-countdown-time {
            font-size: 32px;
            font-weight: 900;
            color: ${uColors.border};
            font-variant-numeric: tabular-nums;
            text-shadow: 0 2px 12px ${uColors.glow};
            font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
          }

          .sm-reminder-countdown-label {
            font-size: 11px;
            color: ${colors.textTertiary};
            text-transform: uppercase;
            font-weight: 700;
            margin-left: 8px;
          }

          .sm-reminder-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .sm-reminder-btn {
            flex: 1;
            min-width: 100px;
            padding: 12px 16px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 700;
            font-size: 13px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          .sm-reminder-btn:hover {
            transform: translateY(-2px);
          }

          .sm-reminder-btn-primary {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }

          .sm-reminder-btn-primary:hover {
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          }

          .sm-reminder-btn-secondary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }

          .sm-reminder-btn-secondary:hover {
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
          }

          .sm-reminder-btn-tertiary {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(100, 116, 139, 0.3)'};
            color: ${colors.textSecondary};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }

          .sm-reminder-btn-tertiary:hover {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(100, 116, 139, 0.4)'};
          }

          .sm-reminder-footer {
            padding: 12px 20px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(0, 0, 0, 0.2)'};
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: ${colors.textTertiary};
            border-top: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)'};
          }

          .sm-reminder-settings-link {
            color: #6366f1;
            text-decoration: none;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }

          .sm-reminder-settings-link:hover {
            color: #8b5cf6;
            text-decoration: underline;
          }

          @media (max-width: 768px) {
            .sm-reminder-popup {
              min-width: 320px;
              max-width: calc(100% - 40px);
              left: 20px !important;
              right: 20px !important;
            }
          }
        </style>

        <div class="sm-reminder-header">
          <div class="sm-reminder-icon">${icon}</div>
          <div class="sm-reminder-title-section">
            <div class="sm-reminder-title">${sanitizeHTML(title)}</div>
            <span class="sm-reminder-urgency-badge">${urgency.toUpperCase()}</span>
          </div>
          <button class="sm-reminder-close" id="sm-reminder-close">✕</button>
        </div>

        <div class="sm-reminder-body">
          <div class="sm-reminder-message">${sanitizeHTML(message)}</div>

          ${countdown !== null ? `
            <div class="sm-reminder-countdown">
              <div class="sm-reminder-countdown-icon">⏱️</div>
              <div class="sm-reminder-countdown-time" id="sm-countdown-display">${this.formatTime(countdown)}</div>
              <div class="sm-reminder-countdown-label">remaining</div>
            </div>
          ` : ''}

          ${actions.length > 0 ? `
            <div class="sm-reminder-actions">
              ${actions.map((action, index) => `
                <button class="sm-reminder-btn sm-reminder-btn-${action.style || 'tertiary'}"
                        data-action="${action.action}"
                        id="sm-reminder-action-${index}">
                  ${action.icon ? `<span>${action.icon}</span>` : ''}
                  <span>${sanitizeHTML(action.label)}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="sm-reminder-footer">
          <span>SageMaker Ultra Reminder</span>
          <a class="sm-reminder-settings-link" id="sm-reminder-settings-link">⚙️ Settings</a>
        </div>
      `;

      document.body.appendChild(popup);

      if (countdown !== null) {
        let remainingTime = countdown;
        const countdownDisplay = popup.querySelector('#sm-countdown-display');

        const countdownInterval = setInterval(() => {
          remainingTime--;
          if (countdownDisplay) {
            countdownDisplay.textContent = this.formatTime(remainingTime);

            if (remainingTime <= 10) {
              countdownDisplay.style.color = '#dc2626';
              countdownDisplay.style.animation = 'pulse 0.5s ease-in-out infinite';
            } else if (remainingTime <= 30) {
              countdownDisplay.style.color = '#ef4444';
            }
          }

          if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            this.closePopup(popup);
          }
        }, 1000);

        popup.dataset.countdownInterval = countdownInterval;
      }

      popup.querySelector('#sm-reminder-close').addEventListener('click', () => {
        this.closePopup(popup);
        this.stats.totalDismissed++;
        this.saveStats();
      });

      actions.forEach((action, index) => {
        const btn = popup.querySelector(`#sm-reminder-action-${index}`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (action.callback) action.callback();
            this.closePopup(popup);

            if (action.action === 'snooze') {
              this.stats.totalSnoozed++;
              this.saveStats();
            }
          });
        }
      });

      popup.querySelector('#sm-reminder-settings-link').addEventListener('click', () => {
        this.closePopup(popup);
        showDashboard();
        setTimeout(() => {
          const settingsBtn = document.getElementById('reminder-settings-btn');
          if (settingsBtn) {
            settingsBtn.click();
            settingsBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      });

      if (this.settings.notification.autoDismiss > 0 && urgency !== 'critical') {
        setTimeout(() => {
          if (document.getElementById('sm-reminder-popup') === popup) {
            this.closePopup(popup);
          }
        }, this.settings.notification.autoDismiss * 1000);
      }

      if (this.settings.advanced.vibrate && 'vibrate' in navigator) {
        const vibrationPattern = {
          normal: [100],
          warning: [100, 50, 100],
          urgent: [100, 50, 100, 50, 100],
          critical: [200, 100, 200, 100, 200]
        };
        navigator.vibrate(vibrationPattern[urgency] || vibrationPattern.normal);
      }

      this.stats.totalShown++;
      this.stats.lastShown = new Date().toISOString();
      this.saveStats();

      log(`🎨 Popup notification shown: ${title} (${urgency})`);
    }

    closePopup(popup) {
      if (!popup) return;

      if (popup.dataset.countdownInterval) {
        clearInterval(parseInt(popup.dataset.countdownInterval));
      }

      popup.style.transition = 'all 0.3s ease';
      popup.style.opacity = '0';
      popup.style.transform = 'translateX(400px)';

      setTimeout(() => {
        popup.remove();
        this.isShowingNotification = false;

        if (this.notificationQueue.length > 0) {
          const nextNotification = this.notificationQueue.shift();
          setTimeout(() => this.showPopupNotification(nextNotification), 300);
        }
      }, 300);
    }

    checkTaskExpiry() {
      if (!this.settings.enabled || !this.settings.taskExpiry.enabled) return;
      if (!activeTask) return;

      const awsData = parseAWSTimer();
      if (!awsData || !awsData.limit) return;

      const remaining = awsData.limit - awsData.current;
      const warningTime = this.settings.taskExpiry.warningTime;
      const urgentTime = this.settings.taskExpiry.urgentTime;
      const criticalTime = this.settings.taskExpiry.criticalTime;

      let urgency = 'normal';
      let shouldAlert = false;

      if (remaining <= criticalTime && remaining > criticalTime - 5) {
        urgency = 'critical';
        shouldAlert = true;
      } else if (remaining <= urgentTime && remaining > urgentTime - 5) {
        urgency = 'urgent';
        shouldAlert = true;
      } else if (remaining <= warningTime && remaining > warningTime - 5) {
        urgency = 'warning';
        shouldAlert = true;
      }

      const warningKey = `${activeTask.id}-${urgency}`;
      if (this.lastWarnings.has(warningKey)) {
        const lastWarningTime = this.lastWarnings.get(warningKey);
        if (Date.now() - lastWarningTime < 10000) return;
      }

      if (shouldAlert) {
        this.lastWarnings.set(warningKey, Date.now());
        this.showTaskExpiryWarning(remaining, urgency);
      }
    }

    showTaskExpiryWarning(remainingSeconds, urgency) {
      const taskName = activeTask.taskName || 'Current Task';

      const messages = {
        warning: `Your task "${taskName}" will expire in ${this.formatTime(remainingSeconds)}. Consider submitting soon.`,
        urgent: `⚠️ URGENT: Only ${this.formatTime(remainingSeconds)} left on "${taskName}"! Submit now to save your work.`,
        critical: `🚨 CRITICAL: ${this.formatTime(remainingSeconds)} remaining! Task "${taskName}" is about to expire!`
      };

      const titles = {
        warning: '⏰ Task Expiry Warning',
        urgent: '⚠️ Task Expiring Soon',
        critical: '🚨 TASK EXPIRING NOW'
      };

      const icons = {
        warning: '⏰',
        urgent: '⚠️',
        critical: '🚨'
      };

      const actions = [
        {
          label: 'Got It',
          icon: '✓',
          style: 'primary',
          action: 'dismiss',
          callback: () => {
            log("✅ User acknowledged warning");
            this.stats.tasksSavedByWarning++;
            this.saveStats();
          }
        }
      ];

      if (this.settings.advanced.snoozeEnabled && urgency !== 'critical') {
        actions.push({
          label: `Snooze ${this.settings.advanced.snoozeDuration}s`,
          icon: '💤',
          style: 'secondary',
          action: 'snooze',
          callback: () => {
            this.snoozeReminder(remainingSeconds, urgency);
          }
        });
      }

      actions.push({
        label: 'Settings',
        icon: '⚙️',
        style: 'tertiary',
        action: 'settings'
      });

      this.playSound(this.settings.sound.type, urgency);

      this.showBrowserNotification(
        titles[urgency] || titles.warning,
        messages[urgency] || messages.warning,
        urgency
      );

      this.showPopupNotification({
        title: titles[urgency] || titles.warning,
        message: messages[urgency] || messages.warning,
        urgency: urgency,
        icon: icons[urgency] || icons.warning,
        countdown: remainingSeconds,
        actions: actions
      });

      log(`🔔 Task expiry warning shown: ${urgency} (${remainingSeconds}s remaining)`);
    }

    snoozeReminder(remainingSeconds, urgency) {
      const snoozeUntil = Date.now() + (this.settings.advanced.snoozeDuration * 1000);
      this.snoozedReminders.set(`${activeTask.id}-${urgency}`, snoozeUntil);

      log(`💤 Reminder snoozed for ${this.settings.advanced.snoozeDuration}s`);
    }

    startReminderLoop() {
      setInterval(() => {
        this.checkTaskExpiry();
      }, 1000);

      log("🔁 Reminder loop started");
    }

    formatTime(seconds) {
      if (seconds < 0) return "0:00";

      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    showSettingsDialog() {
      requestAnimationFrame(() => {
        const existing = document.getElementById('sm-reminder-settings-dialog');
        if (existing) {
          existing.remove();
          return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'sm-reminder-settings-dialog';
        const theme = ThemeManager.getTheme();
        dialog.setAttribute('data-theme', theme);
        dialog.innerHTML = this.getSettingsDialogHTML();

        document.body.appendChild(dialog);
        this.attachSettingsEventHandlers(dialog);

        log("⚙️ Reminder settings dialog opened");
      });
    }

    getSettingsDialogHTML() {
      const theme = ThemeManager.getTheme();
      const colors = ThemeManager.getThemeColors();

      return `
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from { transform: translate(-50%, -48%) scale(0.95); opacity: 0; }
            to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }

          #sm-reminder-settings-dialog {
            position: fixed;
            inset: 0;
            z-index: 99999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', sans-serif;
            animation: fadeIn 0.15s ease;
          }

          #sm-reminder-backdrop {
            position: absolute;
            inset: 0;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.5)' : 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(15,23,42,0.8) 100%)'};
            backdrop-filter: blur(20px);
          }

          #sm-reminder-modal {
            position: relative;
            width: 550px;
            max-width: calc(100% - 40px);
            max-height: calc(100vh - 40px);
            background: ${theme === 'light' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)'};
            backdrop-filter: blur(40px);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99, 102, 241, 0.3);
            overflow: hidden;
            animation: slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            will-change: transform, opacity;
          }

          .reminder-settings-header {
            padding: 20px 24px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
          }

          .reminder-settings-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .reminder-settings-body {
            padding: 20px 24px;
            max-height: calc(100vh - 250px);
            overflow-y: auto;
          }

          .reminder-settings-body::-webkit-scrollbar {
            width: 8px;
          }

          .reminder-settings-body::-webkit-scrollbar-track {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(15, 23, 42, 0.5)'};
            border-radius: 4px;
          }

          .reminder-settings-body::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 4px;
          }

          .settings-section {
            margin-bottom: 20px;
            padding: 16px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(15, 23, 42, 0.6)'};
            border: 1px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.2)'};
            border-radius: 12px;
          }

          .settings-section-title {
            font-size: 14px;
            font-weight: 800;
            color: ${colors.textPrimary};
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .settings-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(71, 85, 105, 0.3)'};
          }

          .settings-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }

          .settings-label {
            flex: 1;
            font-size: 12px;
            font-weight: 600;
            color: ${colors.textSecondary};
            line-height: 1.4;
          }

          .settings-label-desc {
            font-size: 10px;
            color: ${colors.textTertiary};
            margin-top: 3px;
            font-weight: 500;
          }

          .settings-control {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .toggle-switch {
            position: relative;
            width: 50px;
            height: 26px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(100, 116, 139, 0.5)'};
            border-radius: 13px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(100, 116, 139, 0.3)'};
          }

          .toggle-switch.active {
            background: linear-gradient(135deg, #10b981, #059669);
            border-color: #10b981;
          }

          .toggle-switch-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            background: white;
            border-radius: 50%;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }

          .toggle-switch.active .toggle-switch-slider {
            transform: translateX(24px);
          }

          .settings-input {
            width: 80px;
            padding: 6px 10px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(15, 23, 42, 0.8)'};
            border: 2px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
            border-radius: 8px;
            color: ${colors.textPrimary};
            font-size: 12px;
            font-weight: 700;
            text-align: center;
            font-family: 'Inter', sans-serif;
          }

          .settings-input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          }

          .settings-select {
            padding: 6px 10px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(15, 23, 42, 0.8)'};
            border: 2px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
            border-radius: 8px;
            color: ${colors.textPrimary};
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
          }

          .settings-select:focus {
            outline: none;
            border-color: #6366f1;
          }

          .volume-slider-container {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            max-width: 200px;
          }

          .volume-slider {
            flex: 1;
            height: 6px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(100, 116, 139, 0.3)'};
            border-radius: 3px;
            outline: none;
            -webkit-appearance: none;
          }

          .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.5);
          }

          .volume-value {
            font-size: 12px;
            font-weight: 800;
            color: #6366f1;
            min-width: 35px;
            text-align: right;
          }

          .test-sound-btn {
            padding: 5px 10px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 700;
            transition: all 0.3s;
          }

          .test-sound-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          }

          .reminder-settings-footer {
            padding: 16px 24px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(0, 0, 0, 0.2)'};
            display: flex;
            gap: 10px;
            border-top: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)'};
          }

          .reminder-settings-btn {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 800;
            font-size: 13px;
            transition: all 0.3s;
            font-family: 'Inter', sans-serif;
          }

          .reminder-settings-btn-save {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }

          .reminder-settings-btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          }

          .reminder-settings-btn-cancel {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(100, 116, 139, 0.3)'};
            color: ${colors.textSecondary};
          }

          .reminder-settings-btn-cancel:hover {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(100, 116, 139, 0.5)'};
          }

          .master-toggle-banner {
            background: ${theme === 'light' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)'};
            border: 2px solid #ef4444;
            padding: 14px;
            border-radius: 10px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .master-toggle-banner.enabled {
            background: ${theme === 'light' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)'};
            border-color: #10b981;
          }

          .master-toggle-info {
            flex: 1;
          }

          .master-toggle-title {
            font-size: 14px;
            font-weight: 900;
            color: ${colors.textPrimary};
            margin-bottom: 3px;
          }

          .master-toggle-desc {
            font-size: 11px;
            color: ${colors.textSecondary};
            font-weight: 500;
          }

          .master-toggle-switch {
            width: 60px;
            height: 32px;
          }

          .master-toggle-switch .toggle-switch-slider {
            width: 24px;
            height: 24px;
          }

          .master-toggle-switch.active .toggle-switch-slider {
            transform: translateX(28px);
          }
        </style>

        <div id="sm-reminder-backdrop"></div>
        <div id="sm-reminder-modal">
          <div class="reminder-settings-header">
            <h3>🔔 Reminder Settings</h3>
          </div>

          <div class="reminder-settings-body">
            <div class="master-toggle-banner ${this.settings.enabled ? 'enabled' : ''}">
              <div class="master-toggle-info">
                <div class="master-toggle-title">
                  ${this.settings.enabled ? '✅ Reminders Enabled' : '🔴 Reminders Disabled'}
                </div>
                <div class="master-toggle-desc">
                  ${this.settings.enabled ? 'All reminder notifications are active' : 'Turn on to receive task expiry warnings'}
                </div>
              </div>
              <div class="toggle-switch master-toggle-switch ${this.settings.enabled ? 'active' : ''}" id="master-toggle">
                <div class="toggle-switch-slider"></div>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">⏰ Task Expiry Warnings</div>

              <div class="settings-row">
                <div class="settings-label">
                  Enable Task Expiry Warnings
                  <div class="settings-label-desc">Get notified before your task expires</div>
                </div>
                <div class="settings-control">
                  <div class="toggle-switch ${this.settings.taskExpiry.enabled ? 'active' : ''}" id="toggle-task-expiry">
                    <div class="toggle-switch-slider"></div>
                  </div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Warning Time (seconds)
                  <div class="settings-label-desc">First warning before task expires</div>
                </div>
                <div class="settings-control">
                  <input type="number" class="settings-input" id="warning-time"
                         value="${this.settings.taskExpiry.warningTime}"
                         min="30" max="600" step="30">
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Urgent Warning (seconds)
                  <div class="settings-label-desc">Second urgent warning</div>
                </div>
                <div class="settings-control">
                  <input type="number" class="settings-input" id="urgent-time"
                         value="${this.settings.taskExpiry.urgentTime}"
                         min="15" max="300" step="15">
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Critical Warning (seconds)
                  <div class="settings-label-desc">Final critical warning</div>
                </div>
                <div class="settings-control">
                  <input type="number" class="settings-input" id="critical-time"
                         value="${this.settings.taskExpiry.criticalTime}"
                         min="10" max="120" step="10">
                </div>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">🔊 Sound Settings</div>

              <div class="settings-row">
                <div class="settings-label">
                  Enable Sound
                  <div class="settings-label-desc">Play sound with notifications</div>
                </div>
                <div class="settings-control">
                  <div class="toggle-switch ${this.settings.sound.enabled ? 'active' : ''}" id="toggle-sound">
                    <div class="toggle-switch-slider"></div>
                  </div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Volume
                  <div class="settings-label-desc">Notification sound volume</div>
                </div>
                <div class="settings-control">
                  <div class="volume-slider-container">
                    <input type="range" class="volume-slider" id="volume-slider"
                           min="0" max="100" value="${this.settings.sound.volume}">
                    <span class="volume-value" id="volume-value">${this.settings.sound.volume}%</span>
                  </div>
                  <button class="test-sound-btn" id="test-sound">🔊 Test</button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Sound Type
                  <div class="settings-label-desc">Choose notification sound style</div>
                </div>
                <div class="settings-control">
                  <select class="settings-select" id="sound-type">
                    <option value="gentle" ${this.settings.sound.type === 'gentle' ? 'selected' : ''}>Gentle</option>
                    <option value="beep" ${this.settings.sound.type === 'beep' ? 'selected' : ''}>Beep</option>
                    <option value="chime" ${this.settings.sound.type === 'chime' ? 'selected' : ''}>Chime</option>
                    <option value="bell" ${this.settings.sound.type === 'bell' ? 'selected' : ''}>Bell</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">📱 Notification Settings</div>

              <div class="settings-row">
                <div class="settings-label">
                  Browser Notifications
                  <div class="settings-label-desc">Show even when tab is inactive</div>
                </div>
                <div class="settings-control">
                  <div class="toggle-switch ${this.settings.notification.browserNotification ? 'active' : ''}" id="toggle-browser-notif">
                    <div class="toggle-switch-slider"></div>
                  </div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Popup Notifications
                  <div class="settings-label-desc">In-page notification popups</div>
                </div>
                <div class="settings-control">
                  <div class="toggle-switch ${this.settings.notification.popupNotification ? 'active' : ''}" id="toggle-popup-notif">
                    <div class="toggle-switch-slider"></div>
                  </div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-label">
                  Auto Dismiss (seconds)
                  <div class="settings-label-desc">Auto-close after duration (0 = manual)</div>
                </div>
                <div class="settings-control">
                  <input type="number" class="settings-input" id="auto-dismiss"
                         value="${this.settings.notification.autoDismiss}"
                         min="0" max="60" step="5">
                </div>
              </div>
            </div>
          </div>

          <div class="reminder-settings-footer">
            <button class="reminder-settings-btn reminder-settings-btn-save" id="save-reminder-settings">
              💾 Save Settings
            </button>
            <button class="reminder-settings-btn reminder-settings-btn-cancel" id="cancel-reminder-settings">
              ✕ Cancel
            </button>
          </div>
        </div>
      `;
    }

    attachSettingsEventHandlers(dialog) {
      dialog.querySelector('#sm-reminder-backdrop').addEventListener('click', () => {
        dialog.remove();
      });

      dialog.querySelector('#cancel-reminder-settings').addEventListener('click', () => {
        dialog.remove();
      });

      dialog.querySelector('#master-toggle').addEventListener('click', (e) => {
        const toggle = e.currentTarget;
        toggle.classList.toggle('active');
        this.settings.enabled = toggle.classList.contains('active');

        const banner = dialog.querySelector('.master-toggle-banner');
        banner.classList.toggle('enabled', this.settings.enabled);
        banner.querySelector('.master-toggle-title').textContent =
          this.settings.enabled ? '✅ Reminders Enabled' : '🔴 Reminders Disabled';
        banner.querySelector('.master-toggle-desc').textContent =
          this.settings.enabled ? 'All reminder notifications are active' : 'Turn on to receive task expiry warnings';
      });

      const toggles = {
        'toggle-task-expiry': 'taskExpiry.enabled',
        'toggle-sound': 'sound.enabled',
        'toggle-browser-notif': 'notification.browserNotification',
        'toggle-popup-notif': 'notification.popupNotification'
      };

      Object.entries(toggles).forEach(([id, path]) => {
        const el = dialog.querySelector(`#${id}`);
        if (el) {
          el.addEventListener('click', (e) => {
            const toggle = e.currentTarget;
            toggle.classList.toggle('active');

            const keys = path.split('.');
            if (keys.length === 2) {
              this.settings[keys[0]][keys[1]] = toggle.classList.contains('active');
            }
          });
        }
      });

      const volumeSlider = dialog.querySelector('#volume-slider');
      const volumeValue = dialog.querySelector('#volume-value');

      if (volumeSlider && volumeValue) {
        volumeSlider.addEventListener('input', (e) => {
          this.settings.sound.volume = parseInt(e.target.value);
          volumeValue.textContent = `${this.settings.sound.volume}%`;
        });
      }

      const testSoundBtn = dialog.querySelector('#test-sound');
      if (testSoundBtn) {
        testSoundBtn.addEventListener('click', () => {
          const soundType = dialog.querySelector('#sound-type').value;
          this.playSound(soundType, 'warning');
        });
      }

      const numberInputs = {
        'warning-time': 'taskExpiry.warningTime',
        'urgent-time': 'taskExpiry.urgentTime',
        'critical-time': 'taskExpiry.criticalTime',
        'auto-dismiss': 'notification.autoDismiss'
      };

      Object.entries(numberInputs).forEach(([id, path]) => {
        const el = dialog.querySelector(`#${id}`);
        if (el) {
          el.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            const keys = path.split('.');
            if (keys.length === 2) {
              this.settings[keys[0]][keys[1]] = value;
            }
          });
        }
      });

      const soundTypeEl = dialog.querySelector('#sound-type');
      if (soundTypeEl) {
        soundTypeEl.addEventListener('change', (e) => {
          this.settings.sound.type = e.target.value;
        });
      }

      dialog.querySelector('#save-reminder-settings').addEventListener('click', () => {
        this.saveSettings();

        if (this.settings.notification.browserNotification) {
          this.requestNotificationPermission();
        }

        dialog.remove();
        log("💾 Reminder settings saved successfully");
      });

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          dialog.remove();
          document.removeEventListener('keydown', escHandler, true);
        }
      };
      document.addEventListener('keydown', escHandler, true);
    }
  }

  const ReminderSystem = new UltraReminderSystem();
  window.ReminderSystem = ReminderSystem;

  // ============================================================================
  // 🔧 TIMER PARSING
  // ============================================================================
  function parseAWSTimer() {
    try {
      const bodyText = document.body.innerText || document.body.textContent || "";
      const cleanText = bodyText.replace(/\s+/g, " ").trim();

      const patterns = [
        /Task\s+time[:\s]+(\d+):(\d+)\s+of\s+(\d+)\s*Min\s+(\d+)\s*Sec/i,
        /Task\s+time[:\s]+(\d+):(\d+)\s+(?:of|\/)\s+(\d+):(\d+)/i,
        /Task\s+time[:\s]+(\d+):(\d+)/i,
        /Time\s+(?:Remaining|Elapsed)[:\s]+(\d+):(\d+)/i,
        /Duration[:\s]+(\d+)\s*min(?:ute)?s?\s+(\d+)\s*sec(?:ond)?s?/i,
        /Timer[:\s]+(\d+):(\d+):(\d+)/i,
        /Elapsed[:\s]+(\d+)m\s+(\d+)s/i,
        /(\d+):(\d+)\s*\/\s*(\d+):(\d+)/i,
        /Time[:\s]+(\d+):(\d+)/i,
      ];

      for (const pattern of patterns) {
        const m = cleanText.match(pattern);
        if (m) {
          let current, limit;

          if (m.length === 5 && m[3] && m[4]) {
            current = (+m[1]) * 60 + (+m[2]);
            limit = (+m[3]) * 60 + (+m[4]);
          } else if (m.length === 4 && m[1] && m[2] && m[3]) {
            current = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
            limit = 3600;
          } else if (m.length === 3 || m.length === 2) {
            current = (+m[1]) * 60 + (+m[2]);
            limit = 3600;
          } else {
            continue;
          }

          if (current >= 0 && current <= 86400) {
            return { current, limit, remaining: limit - current };
          }
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  function hasTaskExpiredOnPage() {
    try {
      const t = (document.body.innerText || "").toLowerCase();
      return t.includes("task has expired") ||
             t.includes("task expired") ||
             t.includes("time is up") ||
             t.includes("session expired");
    } catch (e) { return false; }
  }

  // ============================================================================
  // 🎯 100% ACCURATE TASK NAME DETECTION SYSTEM
  // ============================================================================
  const TaskNameDetector = {
    currentTaskId: null,
    detectedName: null,
    retryCount: 0,
    observer: null,
    isDetecting: false,

    // Priority-ordered extraction methods
    extractionMethods: [
      // Method 1: Task description from page text
      {
        name: 'task_description',
        priority: 1,
        extract: () => {
          const bodyText = document.body.innerText || "";
          const match = bodyText.match(/Task description:\s*([^\n]+)/i);
          if (match && match[1]) {
            const text = match[1].trim();
            if (TaskNameDetector.isValidTaskName(text)) {
              return text;
            }
          }
          return null;
        }
      },

      // Method 2: Classify/Label instruction
      {
        name: 'classify_instruction',
        priority: 2,
        extract: () => {
          const bodyText = document.body.innerText || "";
          const patterns = [
            /Classify the (?:video|image|content)\s*[-–:]\s*([^\n.!?]{10,200})/i,
            /(?:classify|label|identify|annotate|review)\s+(?:the\s+)?(?:video|image|content)\s*[-–:]\s*([^\n.!?]{10,200})/i,
          ];

          for (const pattern of patterns) {
            const match = bodyText.match(pattern);
            if (match && match[1]) {
              const text = match[1].trim();
              if (TaskNameDetector.isValidTaskName(text)) {
                return text;
              }
            }
          }

          // Check for "Classify the video - X" pattern - FULL NAME
          const classifyMatch = bodyText.match(/Classify the (?:video|image)\s*[-–]\s*([a-zA-Z0-9_\-\s]+?)(?:\.\.\.|$|\n)/i);
          if (classifyMatch && classifyMatch[1]) {
            return classifyMatch[1].trim();
          }

          return null;
        }
      },

      // Method 3: Header elements
      {
        name: 'header_elements',
        priority: 3,
        extract: () => {
          const selectors = [
            '.cswui-header-name',
            '[class*="task-title"]',
            '[class*="task-name"]',
            '[class*="instruction-title"]',
            '[class*="question-title"]',
            'h1[class*="task"]',
            'h2[class*="task"]',
            '[data-testid*="task-title"]',
            '[data-testid*="instruction"]'
          ];

          for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
              const text = (el.innerText || el.textContent || "").trim();
              if (TaskNameDetector.isValidTaskName(text)) {
                return text;
              }
            }
          }
          return null;
        }
      },

      // Method 4: Queue/Job name from URL or page - FULL NAME
      {
        name: 'queue_name',
        priority: 4,
        extract: () => {
          // Try to get from page - full name
          const bodyText = document.body.innerText || "";
          const queueMatch = bodyText.match(/(?:queue|job|batch|project)[:\s]+([a-zA-Z0-9_\-\s]{5,200})/i);
          if (queueMatch && queueMatch[1]) {
            return queueMatch[1].trim();
          }

          // Try from URL
          const url = window.location.href;
          const urlMatch = url.match(/\/([a-zA-Z0-9_-]{10,100})(?:\/|$|\?)/);
          if (urlMatch && urlMatch[1]) {
            // Check if it looks like a task/queue ID
            if (/[a-zA-Z]/.test(urlMatch[1]) && /[0-9]/.test(urlMatch[1])) {
              return urlMatch[1];
            }
          }

          return null;
        }
      },

      // Method 5: Video/Image specific patterns - FULL NAME
      {
        name: 'media_task',
        priority: 5,
        extract: () => {
          const bodyText = document.body.innerText || "";

          // Liveness/Deepfake detection - get full name
          if (bodyText.toLowerCase().includes('liveness') || bodyText.toLowerCase().includes('deepfake')) {
            const typeMatch = bodyText.match(/(liveness[a-zA-Z0-9_\-\s]*|deepfake[a-zA-Z0-9_\-\s]*)/i);
            if (typeMatch) {
              return typeMatch[1].trim();
            }
            return 'Video Classification Task';
          }

          // General video/image task
          if (bodyText.toLowerCase().includes('video')) {
            return 'Video Classification Task';
          }
          if (bodyText.toLowerCase().includes('image') || bodyText.toLowerCase().includes('photo')) {
            return 'Image Classification Task';
          }

          return null;
        }
      },

      // Method 6: Question/Prompt text
      {
        name: 'question_text',
        priority: 6,
        extract: () => {
          const bodyText = document.body.innerText || "";
          const questionPatterns = [
            /(?:What|Which|Is|Does|Are|Can)\s+[^?]{10,200}\?/i,
            /Please\s+(?:select|choose|identify|classify)[^.]{10,200}\./i
          ];

          for (const pattern of questionPatterns) {
            const match = bodyText.match(pattern);
            if (match && match[0]) {
              const text = match[0].trim();
              if (text.length >= 15 && text.length <= 300) {
                return text;
              }
            }
          }
          return null;
        }
      }
    ],

    isValidTaskName(text) {
      if (!text || typeof text !== 'string') return false;

      const trimmed = text.trim();

      // Length check - allow longer names
      if (trimmed.length < 5 || trimmed.length > 500) return false;

      // Exclude patterns
      const excludePatterns = [
        /^hello/i,
        /^welcome/i,
        /^please\s+login/i,
        /logout/i,
        /^submit$/i,
        /^skip\s+task$/i,
        /^release\s+task$/i,
        /@.*\.com/i,
        /^customer\s+id/i,
        /^task\s+time/i,
        /^\d+:\d+$/,
        /^sagemaker$/i,
        /^amazon$/i,
        /^instructions?$/i,
        /^shortcuts?$/i
      ];

      for (const pattern of excludePatterns) {
        if (pattern.test(trimmed)) return false;
      }

      return true;
    },

    async detect(taskId, forceRefresh = false) {
      // If same task and already detected, return cached
      if (!forceRefresh && this.currentTaskId === taskId && this.detectedName) {
        return this.detectedName;
      }

      // Check localStorage cache first
      const cachedNames = retrieve(KEYS.TASK_NAMES_CACHE, {});
      if (!forceRefresh && cachedNames[taskId] && this.isValidTaskName(cachedNames[taskId])) {
        this.currentTaskId = taskId;
        this.detectedName = cachedNames[taskId];
        log(`📝 Using cached task name: ${this.detectedName}`);
        return this.detectedName;
      }

      // New task - reset
      this.currentTaskId = taskId;
      this.detectedName = null;
      this.retryCount = 0;

      // Try detection with retries
      return await this.detectWithRetry(taskId);
    },

    async detectWithRetry(taskId) {
      const maxRetries = CONFIG.TASK_NAME_RETRY_ATTEMPTS;
      const retryDelay = CONFIG.TASK_NAME_RETRY_DELAY;

      while (this.retryCount < maxRetries) {
        // Try each extraction method in priority order
        for (const method of this.extractionMethods) {
          try {
            const result = method.extract();
            if (result && this.isValidTaskName(result)) {
              this.detectedName = result;
              this.cacheTaskName(taskId, result);
              log(`✅ Task name detected via ${method.name}: ${result}`);
              return result;
            }
          } catch (e) {
            log(`❌ Method ${method.name} failed:`, e);
          }
        }

        // No valid name found, wait and retry
        this.retryCount++;
        if (this.retryCount < maxRetries) {
          log(`⏳ Retry ${this.retryCount}/${maxRetries} for task name detection...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      // Fallback: Generate descriptive name
      const fallback = this.generateFallbackName(taskId);
      this.detectedName = fallback;
      log(`⚠️ Using fallback task name: ${fallback}`);
      return fallback;
    },

    generateFallbackName(taskId) {
      // Try to make a meaningful name from available info
      const taskType = TaskTypeDetector.detect();
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      if (taskType.type !== 'unknown') {
        return `${taskType.type.charAt(0).toUpperCase() + taskType.type.slice(1)} Task (${timestamp})`;
      }

      // Extract something from URL
      const urlParts = window.location.pathname.split('/').filter(p => p && p.length > 3);
      if (urlParts.length > 0) {
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart.length > 5 && lastPart.length < 100) {
          return lastPart;
        }
      }

      return `Task (${timestamp})`;
    },

    cacheTaskName(taskId, taskName) {
      try {
        const cachedNames = retrieve(KEYS.TASK_NAMES_CACHE, {});
        cachedNames[taskId] = taskName;

        // Keep only last 500 task names
        const keys = Object.keys(cachedNames);
        if (keys.length > 500) {
          keys.slice(0, keys.length - 500).forEach(key => delete cachedNames[key]);
        }

        store(KEYS.TASK_NAMES_CACHE, cachedNames);
      } catch (e) {
        log('❌ Cache error:', e);
      }
    },

    // Setup MutationObserver for dynamic content
    setupObserver(taskId, callback) {
      if (!CONFIG.TASK_NAME_OBSERVER_ENABLED) return;

      // Clean up existing observer
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      let debounceTimer = null;

      this.observer = new MutationObserver((mutations) => {
        // Debounce to avoid too many checks
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          // Only re-detect if we don't have a good name yet
          if (!this.detectedName || this.detectedName.includes('Task (')) {
            const newName = await this.detect(taskId, true);
            if (newName && !newName.includes('Task (') && callback) {
              callback(newName);
            }
          }
        }, 500);
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Auto-disconnect after 30 seconds to prevent memory issues
      setTimeout(() => {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
          log("🔌 Task name observer disconnected (timeout)");
        }
      }, 30000);
    },

    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.currentTaskId = null;
      this.detectedName = null;
      this.retryCount = 0;
    }
  };

  // Legacy function for compatibility
  function getTaskName() {
    return TaskNameDetector.detectedName || TaskNameDetector.generateFallbackName(getTaskIdFromUrl());
  }

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

    analytics.last_activity = new Date().toISOString();
    store(KEYS.ANALYTICS, analytics);
  }

  // ============================================================================
  // 🎯 PAGE DETECTION
  // ============================================================================
  function isHomePage() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '/home' || path === '/dashboard') return true;
    return false;
  }

  function isJobsListPage() {
    const path = window.location.pathname.toLowerCase();
    const bodyText = (document.body.innerText || "").toLowerCase();
    return path.includes('/jobs') || bodyText.includes('start working');
  }

  function isTaskPage() {
    if (isJobsListPage()) return false;
    const awsTimer = parseAWSTimer();
    return awsTimer !== null;
  }

  // ============================================================================
  // 🎯 TASK MANAGEMENT
  // ============================================================================
  let activeTask = null;

  function getTaskIdFromUrl() {
    return window.location.pathname + window.location.search;
  }

  async function startNewTaskFromAWS(awsData) {
    const id = getTaskIdFromUrl();

    DelayAccumulator.updateLastPoll(awsData.current);

    // Detect task type
    const taskType = TaskTypeDetector.detect();
    TaskTypeDetector.cache(id, taskType);

    // Start task name detection - FULL NAME
    const taskName = await TaskNameDetector.detect(id);

    activeTask = {
      id,
      taskName: taskName,
      taskType: taskType,
      awsCurrent: awsData.current,
      awsLimit: awsData.limit,
      lastAws: awsData.current,
      status: "active",
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };

    MultiTabSync.syncTaskName(id, taskName);

    if (CONFIG.FIX_REFRESH_LOSS) {
      store(KEYS.ACTIVE_TASK, activeTask);
    }

    // Setup observer for better task name detection
    TaskNameDetector.setupObserver(id, (newName) => {
      if (activeTask && activeTask.id === id && newName !== activeTask.taskName) {
        activeTask.taskName = newName;
        MultiTabSync.syncTaskName(id, newName);

        if (CONFIG.FIX_REFRESH_LOSS) {
          store(KEYS.ACTIVE_TASK, activeTask);
        }

        updateDisplay();
        log(`📝 Task name updated: ${newName}`);
      }
    });

    // Increment total today hits - PERMANENT (not affected by manual reset)
    incrementPermanentDailyHits();

    log(`✅ New task started: ${taskName}`);
    return activeTask;
  }

  function updateActiveTaskFromAWS(awsData) {
    if (!activeTask) return startNewTaskFromAWS(awsData);

    const id = getTaskIdFromUrl();
    if (activeTask.id !== id) {
      TaskNameDetector.cleanup();
      activeTask = null;
      return startNewTaskFromAWS(awsData);
    }

    const syncedName = MultiTabSync.getSyncedTaskName(id);
    if (syncedName && syncedName !== activeTask.taskName) {
      activeTask.taskName = syncedName;
      log(`📡 Task name updated from sync: ${syncedName}`);
    }

    if (typeof awsData.current === "number") {
      activeTask.status = awsData.current === activeTask.lastAws ? "paused" : "active";
      activeTask.awsCurrent = awsData.current;
      activeTask.awsLimit = awsData.limit;
      activeTask.lastAws = awsData.current;
      activeTask.lastUpdate = Date.now();

      if (CONFIG.FIX_REFRESH_LOSS) {
        store(KEYS.ACTIVE_TASK, activeTask);
      }
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
      if (sessions.length > CONFIG.SESSIONS_LIMIT) {
        sessions.length = CONFIG.SESSIONS_LIMIT;
      }
      store(KEYS.SESSIONS, sessions);
    } catch (e) {
      log("❌ pushSession error:", e);
    }
  }

  // ============================================================================
  // 📊 PERMANENT DAILY HITS COUNTER - NOT AFFECTED BY MANUAL RESET
  // ============================================================================
  function incrementPermanentDailyHits() {
    const today = todayStr();
    const hitsData = retrieve(KEYS.PERMANENT_DAILY_HITS, {});

    if (!hitsData[today]) {
      hitsData[today] = 0;
    }

    hitsData[today]++;
    store(KEYS.PERMANENT_DAILY_HITS, hitsData);

    log(`📊 Permanent daily hits: ${hitsData[today]}`);
  }

  function getPermanentDailyHits() {
    const today = todayStr();
    const hitsData = retrieve(KEYS.PERMANENT_DAILY_HITS, {});
    return hitsData[today] || 0;
  }

  // Clean up old hits data (keep only last 30 days)
  function cleanupOldHitsData() {
    const hitsData = retrieve(KEYS.PERMANENT_DAILY_HITS, {});
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let cleaned = false;
    Object.keys(hitsData).forEach(date => {
      if (date < cutoffStr) {
        delete hitsData[date];
        cleaned = true;
      }
    });

    if (cleaned) {
      store(KEYS.PERMANENT_DAILY_HITS, hitsData);
    }
  }

  // Run cleanup on startup
  cleanupOldHitsData();

  // Legacy compatibility
  function getTodayHits() {
    return getPermanentDailyHits();
  }

  function incrementTodayHits() {
    incrementPermanentDailyHits();
  }

  // ============================================================================
  // 🎯 COMMIT WITH ACCURATE DELAY CORRECTION
  // ============================================================================
  function commitActiveTask() {
    if (isCommitting) {
      log("⚠️ Commit in progress");
      return 0;
    }

    if (isResetting || forceResetActive || resetInProgress || manualResetJustHappened) {
      log("⚠️ Reset in progress, skipping commit");
      return 0;
    }

    const now = Date.now();
    if (now - lastCommitTime < COMMIT_DEBOUNCE_MS) {
      log("⚠️ Commit debounced");
      return 0;
    }

    if (!activeTask) {
      log("⚠️ No active task");
      return 0;
    }

    let finalElapsed = activeTask.awsCurrent || 0;
    let delayRecovered = 0;

    if (CONFIG.FIX_TIMING_DRIFT) {
      delayRecovered = DelayAccumulator.calculateDelay();
      finalElapsed = finalElapsed + delayRecovered;

      log(`✅ ACCURATE CORRECTION: ${activeTask.awsCurrent}s + ${delayRecovered.toFixed(3)}s = ${finalElapsed.toFixed(3)}s`);
    }

    if (finalElapsed <= 0) {
      log("⚠️ Zero duration");
      activeTask = null;
      return 0;
    }

    isCommitting = true;
    lastCommitTime = now;

    log(`✅ COMMITTING: ${fmt(Math.floor(finalElapsed))}`);

    try {
      lockNavigation(true);
      maintainCurrentDisplay();

      const committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
      const newCommitted = committed + finalElapsed;
      store(KEYS.DAILY_COMMITTED, newCommitted);

      const count = retrieveNumber(KEYS.COUNT, 0);
      const newCount = count + 1;
      store(KEYS.COUNT, newCount);

      const allTimeCommits = retrieveNumber(KEYS.TOTAL_COMMITS_ALLTIME, 0);
      store(KEYS.TOTAL_COMMITS_ALLTIME, allTimeCommits + 1);

      // Add to permanent task commits tracker
      const taskName = activeTask.taskName || getTaskName();
      PermanentTaskCommits.addCommit(taskName, finalElapsed);

      pushSessionRecord({
        id: activeTask.id,
        taskName: taskName,
        taskType: activeTask.taskType,
        date: new Date().toISOString(),
        duration: finalElapsed,
        awsReported: activeTask.awsCurrent,
        delayRecovered: delayRecovered,
        action: "submitted"
      });

      if (CONFIG.ENABLE_ANALYTICS) {
        updateAnalytics('task_completed', { duration: finalElapsed });
      }

      AchievementSystem.updateStreaks();
      AchievementSystem.checkAchievements(newCount, newCommitted);

      const id = activeTask.id;
      TaskNameDetector.cleanup();
      activeTask = null;

      if (CONFIG.FIX_REFRESH_LOSS) {
        store(KEYS.ACTIVE_TASK, null);
      }

      if (getIgnoreTask() === id) setIgnoreTask(null);

      store(KEYS.DELAY_STATS, DelayAccumulator.dailyStats);

      updateDisplay();
      updateTopBanner();

      maintainCurrentDisplay();

      log(`✅ COMMIT COMPLETE: ${fmt(newCommitted)}`);

      return finalElapsed;

    } catch (e) {
      log("❌ Commit error:", e);
      if (window.SmartEngine) SmartEngine.handleError(e, 'commit');
      return 0;
    } finally {
      isCommitting = false;
    }
  }

  // ============================================================================
  // 🎯 DISCARD
  // ============================================================================
  function discardActiveTask(reason) {
    if (!activeTask) {
      log("⚠️ No active task to discard");
      return;
    }

    const duration = activeTask.awsCurrent || 0;

    log(`❌ DISCARDING: ${reason}`);

    lockNavigation(true);
    maintainCurrentDisplay();

    pushSessionRecord({
      id: activeTask.id,
      taskName: activeTask.taskName || getTaskName(),
      date: new Date().toISOString(),
      duration: duration,
      action: reason || "discarded"
    });

    if (reason === 'expired') updateAnalytics('task_expired');
    else if (reason === 'skipped') updateAnalytics('task_skipped');

    const id = activeTask.id;
    TaskNameDetector.cleanup();
    activeTask = null;

    if (CONFIG.FIX_REFRESH_LOSS) {
      store(KEYS.ACTIVE_TASK, null);
    }

    try {
      setIgnoreTask(id, Date.now());
    } catch (e) {
      log(e);
    }

    updateDisplay();
    updateTopBanner();

    maintainCurrentDisplay();
  }

  // ============================================================================
  // 📅 DAILY RESET - MIDNIGHT ONLY
  // ============================================================================
  function checkDailyReset() {
    if (isResetting || forceResetActive || resetInProgress || manualResetJustHappened) {
      return retrieveNumber(KEYS.DAILY_COMMITTED, 0);
    }

    const currentDate = todayStr();
    const lastDate = retrieve(KEYS.LAST_DATE);

    // Clear manual reset tracker for new day
    ManualResetTracker.clearForNewDay();

    if (lastDate !== currentDate) {
      log("🌅 New day - midnight reset");
      const previousTotal = retrieveNumber(KEYS.DAILY_COMMITTED, 0);

      if (previousTotal > 0 && lastDate) {
        saveToHistory(lastDate, previousTotal);
      }

      // Midnight reset - automatic, saves data
      performMidnightReset();

      DelayAccumulator.reset();

      store(KEYS.SESSION_START, null);
      LiveSession.start();

      return 0;
    }

    return retrieveNumber(KEYS.DAILY_COMMITTED, 0);
  }

  function saveToHistory(dateStr, totalSeconds) {
    const history = retrieve(KEYS.HISTORY, {}) || {};
    history[dateStr] = totalSeconds;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFIG.MAX_HISTORY_DAYS);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    for (const d in history) {
      if (d < cutoffStr) delete history[d];
    }

    store(KEYS.HISTORY, history);
  }

  // ============================================================================
  // 🔧 MIDNIGHT RESET - AUTOMATIC (SAVES DATA TO HISTORY)
  // ============================================================================
  function performMidnightReset() {
    log("🕛 Performing midnight reset");

    // Save current data to history before resetting
    const currentDate = retrieve(KEYS.LAST_DATE);
    const currentCommitted = retrieveNumber(KEYS.DAILY_COMMITTED, 0);

    if (currentDate && currentCommitted > 0) {
      saveToHistory(currentDate, currentCommitted);
    }

    // Reset daily values
    forceStore(KEYS.DAILY_COMMITTED, 0);
    forceStore(KEYS.COUNT, 0);

    // Update date
    store(KEYS.LAST_DATE, todayStr());
    store(KEYS.LAST_RESET, new Date().toISOString());

    // Clear active task
    TaskNameDetector.cleanup();
    activeTask = null;
    store(KEYS.ACTIVE_TASK, null);

    // Reset delay accumulator
    DelayAccumulator.reset();

    // Reset session start
    store(KEYS.SESSION_START, Date.now());

    // Clear manual reset tracker for new day
    store(KEYS.MANUAL_RESET_TODAY, {});
    store(KEYS.LAST_MANUAL_RESET_TIME, null);

    // Update displays
    updateDisplay();
    updateHomeDisplay();
    updateTopBanner();

    log("✅ Midnight reset complete");
  }

  // ============================================================================
  // 🔧 MANUAL RESET - PERFECT IMPLEMENTATION (NO DATA SAVE)
  // ============================================================================
  function performManualReset(resetType = 'both') {
    return new Promise((resolve) => {
      log(`🔄 MANUAL RESET INITIATED: Type=${resetType}`);

      // Set all protection flags
      forceResetActive = true;
      resetInProgress = true;
      isResetting = true;
      manualResetJustHappened = true;

      // Pause Smart Engine
      if (window.SmartEngine) {
        SmartEngine.pause();
      }

      // Clear active task FIRST
      TaskNameDetector.cleanup();
      activeTask = null;

      try {
        // Step 1: Remove keys completely from localStorage
        if (resetType === 'timer' || resetType === 'both') {
          localStorage.removeItem(KEYS.DAILY_COMMITTED);
        }

        if (resetType === 'counter' || resetType === 'both') {
          localStorage.removeItem(KEYS.COUNT);
        }

        // Step 2: Force write zeros with direct localStorage access
        if (resetType === 'timer' || resetType === 'both') {
          localStorage.setItem(KEYS.DAILY_COMMITTED, '0');
        }

        if (resetType === 'counter' || resetType === 'both') {
          localStorage.setItem(KEYS.COUNT, '0');
        }

        // Step 3: Verify the write
        let verified = true;
        if (resetType === 'timer' || resetType === 'both') {
          const checkTimer = localStorage.getItem(KEYS.DAILY_COMMITTED);
          if (checkTimer !== '0') {
            console.error('[SM] Timer reset verification FAILED, forcing again');
            localStorage.setItem(KEYS.DAILY_COMMITTED, '0');
            verified = false;
          }
        }

        if (resetType === 'counter' || resetType === 'both') {
          const checkCount = localStorage.getItem(KEYS.COUNT);
          if (checkCount !== '0') {
            console.error('[SM] Counter reset verification FAILED, forcing again');
            localStorage.setItem(KEYS.COUNT, '0');
            verified = false;
          }
        }

        // Step 4: Clear active task storage
        localStorage.removeItem(KEYS.ACTIVE_TASK);
        localStorage.setItem(KEYS.ACTIVE_TASK, 'null');

        // Step 5: Reset delay accumulator if both
        if (resetType === 'both') {
          DelayAccumulator.reset();
        }

        // Step 6: Update date and reset log
        store(KEYS.LAST_DATE, todayStr());
        store(KEYS.LAST_RESET, new Date().toISOString());

        // Step 7: Record the manual reset time - THIS IS CRITICAL
        ManualResetTracker.setResetTime();

        // Log the reset
        const resetLog = retrieve(KEYS.RESET_LOG, []);
        resetLog.unshift({
          type: resetType,
          timestamp: new Date().toISOString(),
          verified: verified,
          manualResetTime: Date.now()
        });
        if (resetLog.length > 50) resetLog.length = 50;
        store(KEYS.RESET_LOG, resetLog);

        // Broadcast reset to other tabs
        store(KEYS.FORCE_RESET_FLAG, {
          type: resetType,
          timestamp: Date.now()
        });

        log(`✅ MANUAL RESET VERIFIED: Timer=${localStorage.getItem(KEYS.DAILY_COMMITTED)}, Count=${localStorage.getItem(KEYS.COUNT)}`);
        log(`📌 Manual reset time recorded for Smart Engine bypass`);

        // Step 8: Force UI update after a small delay
        setTimeout(() => {
          updateDisplay();
          updateHomeDisplay();
          updateTopBanner();

          // Resume Smart Engine after delay (but it will skip self-healing for today)
          setTimeout(() => {
            if (window.SmartEngine) {
              SmartEngine.resume();
            }
          }, 1000);

          // Clear protection flags after extended delay
          setTimeout(() => {
            forceResetActive = false;
            resetInProgress = false;
            isResetting = false;
            log("🔓 Reset protection flags cleared");

            // Keep manualResetJustHappened active for longer to prevent immediate self-healing
            setTimeout(() => {
              manualResetJustHappened = false;
              log("🔓 Manual reset just happened flag cleared");
            }, MANUAL_RESET_PROTECTION_DURATION);

            resolve(true);
          }, 1000);
        }, 100);

      } catch (e) {
        console.error("❌ Manual reset error:", e);

        // Emergency fallback
        try {
          localStorage.setItem(KEYS.DAILY_COMMITTED, '0');
          localStorage.setItem(KEYS.COUNT, '0');
          ManualResetTracker.setResetTime();
        } catch (e2) {
          console.error("❌ Emergency reset also failed:", e2);
        }

        forceResetActive = false;
        resetInProgress = false;
        isResetting = false;
        manualResetJustHappened = false;
        resolve(false);
      }
    });
  }

  // Legacy performReset function - routes to appropriate reset type
  function performReset(resetType = 'both', source = 'manual') {
    if (source === 'manual') {
      return performManualReset(resetType);
    } else {
      // Midnight/auto reset
      performMidnightReset();
      return Promise.resolve(true);
    }
  }

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
      log("🕛 Midnight reset");
      performMidnightReset();
      scheduleMidnightReset();
    }, msUntilMidnight);
  }

  function backupMidnightCheck() {
    if (forceResetActive || resetInProgress || manualResetJustHappened) return;

    const currentDate = todayStr();
    const lastDate = retrieve(KEYS.LAST_DATE);
    if (lastDate && lastDate !== currentDate) {
      performMidnightReset();
    }
  }

  setInterval(backupMidnightCheck, 60000);

  // ============================================================================
  // 🔧 SUBMISSION DETECTION
  // ============================================================================
  let lastSubmitDetection = 0;
  const SUBMIT_DEBOUNCE_MS = 500;

  function initSubmissionInterceptor() {
    if (typeof window.fetch === "function") {
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const method = args[1]?.method || "GET";

        return origFetch.apply(this, args).then(response => {
          try {
            if (method.toUpperCase() === "POST" && response.ok && CONFIG.FIX_DETECTION) {
              const now = Date.now();
              if (now - lastSubmitDetection < SUBMIT_DEBOUNCE_MS) {
                return response;
              }

              // Skip during reset
              if (forceResetActive || resetInProgress || isResetting || manualResetJustHappened) {
                return response;
              }

              const isTaskEndpoint =
                /submit|complete|finish/i.test(url) ||
                /task/i.test(url) ||
                /labeling/i.test(url);

              if (isTaskEndpoint) {
                lastSubmitDetection = now;
                log("📡 Fetch submit detected");

                commitActiveTask();
                updateDisplay();
                updateTopBanner();
              }
            }
          } catch (e) {
            log("❌ Fetch error:", e);
          }
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
            if (info && info.method.toUpperCase() === "POST" &&
                this.status >= 200 && this.status < 300 && CONFIG.FIX_DETECTION) {

              const now = Date.now();
              if (now - lastSubmitDetection < SUBMIT_DEBOUNCE_MS) {
                return;
              }

              // Skip during reset
              if (forceResetActive || resetInProgress || isResetting || manualResetJustHappened) {
                return;
              }

              const isTaskEndpoint =
                /submit|complete|finish/i.test(info.url) ||
                /task/i.test(info.url);

              if (isTaskEndpoint) {
                lastSubmitDetection = now;
                log("📡 XHR submit detected");

                commitActiveTask();
                updateDisplay();
                updateTopBanner();
              }
            }
          } catch (e) {
            log("❌ XHR error:", e);
          }
        });
        return origSend.call(this, body);
      };
    }
  }

  function wireTaskActionButtons() {
    const btns = document.querySelectorAll('button, [role="button"]');
    btns.forEach((el) => {
      try {
        const raw = (el.innerText || "").toLowerCase();
        if (!raw) return;

        const submitKeywords = [
          'submit', 'complete', 'finish', 'done', 'send',
          'confirm', 'save', 'next', 'continue'
        ];

        const isSubmitButton = CONFIG.FIX_DETECTION &&
          submitKeywords.some(kw => raw.includes(kw));

        if (isSubmitButton && !el.__sm_submit_bound) {
          el.__sm_submit_bound = true;

          el.addEventListener("click", () => {
            const now = Date.now();
            if (now - lastSubmitDetection < SUBMIT_DEBOUNCE_MS) {
              return;
            }

            // Skip during reset
            if (forceResetActive || resetInProgress || isResetting || manualResetJustHappened) {
              return;
            }

            lastSubmitDetection = now;

            log("🖱️ Submit clicked");
            commitActiveTask();
            updateDisplay();
            updateTopBanner();
          }, true);
        }

        if (raw.includes("skip") && !el.__sm_skip_bound) {
          el.__sm_skip_bound = true;
          el.addEventListener("click", () => {
            if (forceResetActive || resetInProgress || manualResetJustHappened) return;
            log("🖱️ Skip");
            discardActiveTask("skipped");
            updateDisplay();
            updateTopBanner();
          });
        }

        if ((raw.includes("stop") || raw.includes("release")) && !el.__sm_release_bound) {
          el.__sm_release_bound = true;
          el.addEventListener("click", () => {
            if (forceResetActive || resetInProgress || manualResetJustHappened) return;
            log("🖱️ Release");
            discardActiveTask("released");
            updateDisplay();
            updateTopBanner();
          });
        }
      } catch (e) {}
    });
  }

  // ============================================================================
  // 🥚 EASTER EGG
  // ============================================================================
  function showEasterEgg() {
    const existing = document.getElementById('sm-easter-egg');
    if (existing) existing.remove();

    const egg = document.createElement('div');
    egg.id = 'sm-easter-egg';
    egg.innerHTML = `
      <style>
        @keyframes eggFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes eggFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        #sm-easter-egg {
          position: fixed;
          inset: 0;
          z-index: 999999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          animation: eggFadeIn 0.3s ease;
        }
        #sm-easter-egg.fade-out {
          animation: eggFadeOut 0.3s ease;
        }
        .egg-text {
          font-size: 48px;
          font-weight: 700;
          color: #6366f1;
          letter-spacing: 2px;
          text-align: center;
          text-shadow: 0 0 30px rgba(99, 102, 241, 0.8);
        }
      </style>
      <div class="egg-text">PVSANKAR</div>
    `;

    document.body.appendChild(egg);

    setTimeout(() => {
      egg.classList.add('fade-out');
      setTimeout(() => {
        egg.remove();
      }, 300);
    }, 2000);

    log("🥚 Easter egg revealed!");
  }

  window.PVSANKAR = function() {
    console.log("%cPVSANKAR", "font-size: 20px; font-weight: bold; color: #6366f1;");
    showEasterEgg();
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      showEasterEgg();
    }
  });

  // ============================================================================
  // 🏠 HOME PAGE STATS - THEME AWARE
  // ============================================================================
  const homeDisplay = document.createElement("div");
  homeDisplay.id = "sm-home-stats";
  homeDisplay.setAttribute('data-theme', ThemeManager.getTheme());

  function updateHomeDisplayStyles() {
    const theme = ThemeManager.getTheme();
    const colors = ThemeManager.getThemeColors();

    homeDisplay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      user-select: none;
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
      transition: opacity 0.15s ease-in-out;
    `;

    homeDisplay.innerHTML = `
    <style>
      @keyframes float-gentle {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 12px 40px rgba(99, 102, 241, 0.5); }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .home-stats-container {
        background: ${theme === 'light' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'};
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 2px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'};
        border-radius: 16px;
        padding: 16px;
        width: 180px;
        animation: float-gentle 3s ease-in-out infinite, glow-pulse 2s ease-in-out infinite;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }
      .home-stats-container::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.15), transparent);
        animation: shimmer 3s infinite;
      }
      .home-stats-container:hover {
        transform: translateY(-6px) scale(1.05);
        box-shadow: 0 16px 50px rgba(99, 102, 241, 0.6);
        border-color: #6366f1;
      }
      .home-stats-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
        position: relative;
        z-index: 1;
      }
      .home-stats-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #a78bfa;
      }
      .home-stats-badge {
        padding: 3px 8px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        animation: pulse 2s infinite;
        box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.05); }
      }
      .home-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        position: relative;
        z-index: 1;
        padding: 6px;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .home-stat-row:hover {
        background: rgba(99, 102, 241, 0.1);
      }
      .home-stat-row:last-child {
        margin-bottom: 0;
      }
      .home-stat-label {
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
        color: ${colors.textSecondary};
      }
      .home-stat-icon {
        font-size: 16px;
      }
      .home-stat-value {
        font-size: 16px;
        font-weight: 900;
        font-family: 'Inter', system-ui;
        font-variant-numeric: tabular-nums;
        color: ${colors.textPrimary};
        text-shadow: 0 0 15px rgba(99, 102, 241, 0.6);
      }
      .home-stats-footer {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.2)'};
        text-align: center;
        font-size: 9px;
        font-weight: 700;
        position: relative;
        z-index: 1;
        color: #a78bfa;
      }
    </style>

    <div class="home-stats-container">
      <div class="home-stats-header">
        <div class="home-stats-title">⚡ Tracker</div>
        <div class="home-stats-badge">LIVE</div>
      </div>
      <div class="home-stat-row">
        <div class="home-stat-label">
          <span class="home-stat-icon">⏱️</span>
          <span>Time</span>
        </div>
        <div class="home-stat-value" id="home-timer-value">00:00:00</div>
      </div>
      <div class="home-stat-row">
        <div class="home-stat-label">
          <span class="home-stat-icon">📋</span>
          <span>Tasks</span>
        </div>
        <div class="home-stat-value" id="home-count-value">0</div>
      </div>
      <div class="home-stats-footer">
        Click to open Dashboard
      </div>
    </div>
  `;
  }

  // Initialize home display
  updateHomeDisplayStyles();
  document.body.appendChild(homeDisplay);

  // Listen for theme changes
  ThemeManager.addListener((theme) => {
    updateHomeDisplayStyles();
    updateHomeDisplay();
  });

  homeDisplay.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    log("🏠 Home display clicked");
    try {
      showDashboard();
    } catch (error) {
      console.error("Dashboard error:", error);
      alert("Dashboard error. Check console: " + error.message);
    }
  };

  function updateHomeDisplay() {
    let committed, count;

    // Read directly during/after reset
    if (forceResetActive || resetInProgress || manualResetJustHappened) {
      try {
        const rawCommitted = localStorage.getItem(KEYS.DAILY_COMMITTED);
        const rawCount = localStorage.getItem(KEYS.COUNT);
        committed = rawCommitted ? parseInt(rawCommitted) : 0;
        count = rawCount ? parseInt(rawCount) : 0;
      } catch (e) {
        committed = 0;
        count = 0;
      }
    } else {
      committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
      count = retrieveNumber(KEYS.COUNT, 0);
    }

    const timerEl = document.getElementById('home-timer-value');
    const countEl = document.getElementById('home-count-value');

    if (timerEl) timerEl.textContent = fmt(committed);
    if (countEl) countEl.textContent = count;
  }

  // ============================================================================
  // 🎨 TOP BANNER UPDATE
  // ============================================================================
  function updateTopBanner() {
    const bannerEl = document.getElementById('sm-top-banner');
    if (!bannerEl) return;

    let committed, count;

    // Read directly during/after reset
    if (forceResetActive || resetInProgress || manualResetJustHappened) {
      try {
        const rawCommitted = localStorage.getItem(KEYS.DAILY_COMMITTED);
        const rawCount = localStorage.getItem(KEYS.COUNT);
        committed = rawCommitted ? parseInt(rawCommitted) : 0;
        count = rawCount ? parseInt(rawCount) : 0;
      } catch (e) {
        committed = 0;
        count = 0;
      }
    } else {
      committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
      count = retrieveNumber(KEYS.COUNT, 0);
    }

    const timeEl = bannerEl.querySelector('#banner-time');
    const countEl = bannerEl.querySelector('#banner-count');

    if (timeEl) timeEl.textContent = fmt(committed);
    if (countEl) countEl.textContent = count;
  }

  setInterval(updateTopBanner, 1000);

  // ============================================================================
  // 🎨 ANTI-FLICKER SYSTEM
  // ============================================================================
  let currentPageState = null;
  let displayUpdateTimeout = null;
  let isNavigating = false;
  let navigationLockTimeout = null;
  let commitLockActive = false;
  const DISPLAY_UPDATE_DELAY = 200;
  const NAVIGATION_LOCK_DURATION = 1500;
  const COMMIT_LOCK_DURATION = 2000;

  function lockNavigation(isCommitAction = false) {
    isNavigating = true;

    if (isCommitAction) {
      commitLockActive = true;
      log("🔒 COMMIT LOCK activated");
    }

    if (navigationLockTimeout) {
      clearTimeout(navigationLockTimeout);
    }

    const lockDuration = isCommitAction ? COMMIT_LOCK_DURATION : NAVIGATION_LOCK_DURATION;

    navigationLockTimeout = setTimeout(() => {
      isNavigating = false;
      commitLockActive = false;
      log("🔓 Navigation unlocked");

      setTimeout(() => {
        updateDisplayVisibilitySafe();
      }, 300);
    }, lockDuration);

    log(`🔒 Navigation locked for ${lockDuration}ms`);
  }

  function updateDisplayVisibilitySafe() {
    if (isNavigating || commitLockActive) {
      log("⏸️ Skipping update - navigation/commit in progress");
      return;
    }

    if (displayUpdateTimeout) {
      clearTimeout(displayUpdateTimeout);
    }

    displayUpdateTimeout = setTimeout(() => {
      const isTask = isTaskPage();
      const isHome = isHomePage();

      let newState = null;
      if (isTask) newState = 'task';
      else if (isHome) newState = 'home';
      else newState = 'other';

      if (currentPageState === newState) {
        log(`✓ State unchanged: ${newState}`);
        return;
      }

      log(`🔄 Page state: ${currentPageState} → ${newState}`);
      currentPageState = newState;

      if (newState === 'task') {
        homeDisplay.style.opacity = '0';
        homeDisplay.style.pointerEvents = 'none';

        setTimeout(() => {
          homeDisplay.style.display = "none";
          homeDisplay.style.visibility = "hidden";

          display.style.display = "flex";
          display.style.visibility = "visible";
          display.style.pointerEvents = 'auto';

          setTimeout(() => {
            display.style.opacity = '1';
          }, 50);
        }, 150);

      } else if (newState === 'home') {
        display.style.opacity = '0';
        display.style.pointerEvents = 'none';

        setTimeout(() => {
          display.style.display = "none";
          display.style.visibility = "hidden";

          homeDisplay.style.display = "block";
          homeDisplay.style.visibility = "visible";
          homeDisplay.style.pointerEvents = 'auto';

          setTimeout(() => {
            homeDisplay.style.opacity = '1';
          }, 50);
        }, 150);

      } else {
        display.style.opacity = '0';
        homeDisplay.style.opacity = '0';
        display.style.pointerEvents = 'none';
        homeDisplay.style.pointerEvents = 'none';

        setTimeout(() => {
          display.style.display = "none";
          homeDisplay.style.display = "none";
          display.style.visibility = "hidden";
          homeDisplay.style.visibility = "hidden";
        }, 150);
      }
    }, DISPLAY_UPDATE_DELAY);
  }

  function updateDisplayVisibility() {
    updateDisplayVisibilitySafe();
  }

  function maintainCurrentDisplay() {
    if (currentPageState === 'task') {
      display.style.opacity = '1';
      display.style.display = 'flex';
      display.style.visibility = 'visible';
      display.style.pointerEvents = 'auto';

      homeDisplay.style.opacity = '0';
      homeDisplay.style.display = 'none';
      homeDisplay.style.visibility = 'hidden';
      homeDisplay.style.pointerEvents = 'none';
    } else if (currentPageState === 'home') {
      homeDisplay.style.opacity = '1';
      homeDisplay.style.display = 'block';
      homeDisplay.style.visibility = 'visible';
      homeDisplay.style.pointerEvents = 'auto';

      display.style.opacity = '0';
      display.style.display = 'none';
      display.style.visibility = 'hidden';
      display.style.pointerEvents = 'none';
    }
  }

  // ============================================================================
  // 🎨 TASK PAGE DISPLAY - FIXED POSITIONING
  // ============================================================================
  const display = document.createElement("div");
  display.id = "sm-utilization";

  // Use fixed positioning for reliability
  display.style.cssText = `
    position: fixed;
    left: 12px;
    bottom: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 999999;
    pointer-events: auto;
    user-select: none;
    opacity: 1;
    visibility: visible;
    transition: opacity 0.15s ease-in-out, all 0.3s ease;
    background: transparent;
    padding: 0;
    border-radius: 0;
    border: none;
    box-shadow: none;
  `;

  display.innerHTML = `
    <style>
      #sm-utilization {
        font-family: 'Inter', system-ui;
        font-variant-numeric: tabular-nums;
        font-size: 14px;
        font-weight: 500;
      }
      .sm-stat-group {
        display: inline-flex;
        flex-direction: column;
        gap: 3px;
        position: relative;
        transition: all 0.3s ease;
      }
      #sm-utilization.compact-mode {
        gap: 14px;
      }
      #sm-utilization.compact-mode .sm-stat-group {
        flex-direction: row;
        align-items: center;
        gap: 0;
      }
      #sm-utilization.compact-mode .sm-stat-text {
        font-size: 14px !important;
        font-weight: 500;
        letter-spacing: 0.1px;
        line-height: 1;
      }
      #sm-utilization.compact-mode #sm-count-label {
        margin-left: 4px;
      }

      /* TEXT COLOR - DARK FOR VISIBILITY */
      .sm-stat-text {
        white-space: nowrap;
        line-height: 1.2;
        display: block;
        transition: all 0.3s ease;
        font-weight: 600;
        color: #1a1a1a !important;  /* DARK TEXT */
        text-shadow: 0 0 2px rgba(255,255,255,0.8); /* Subtle outline for any background */
      }

      .sm-thin-progress {
        width: 100%;
        height: 3px;
        background: rgba(0, 0, 0, 0.15);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        align-self: stretch;
        transition: all 0.3s ease;
      }
      .sm-thin-progress.hidden {
        height: 0;
        opacity: 0;
        margin: 0;
        display: none;
      }
      .sm-thin-fill {
        height: 100%;
        border-radius: 10px;
        transition: width 0.3s ease, background 0.3s ease;
        position: relative;
      }
      .sm-thin-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: shimmerProgress 2s infinite;
      }
      @keyframes shimmerProgress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .progress-red { background: linear-gradient(90deg, #dc2626, #ef4444); }
      .progress-orange { background: linear-gradient(90deg, #ea580c, #f97316); }
      .progress-yellow { background: linear-gradient(90deg, #d97706, #f59e0b); }
      .progress-lime { background: linear-gradient(90deg, #65a30d, #84cc16); }
      .progress-green { background: linear-gradient(90deg, #059669, #10b981); }

      #sm-dashboard-btn {
        all: unset !important;
        display: inline-flex !important;
        cursor: pointer !important;
        margin-left: 8px !important;
        vertical-align: middle !important;
        position: relative !important;
        align-self: center !important;
      }
      #sm-dashboard-btn::before {
        content: 'Dashboard';
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) scale(0.9);
        background: #1e293b;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: 'Inter', sans-serif;
      }
      #sm-dashboard-btn:hover::before {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
      .dashboard-icon {
        width: 20px;
        height: 20px;
        display: grid;
        grid-template-columns: 11px 8px;
        grid-template-rows: 9px 10px;
        gap: 1px;
      }
      .icon-square {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      .icon-square.dark {
        background: #374151;
        border-radius: 3px;
      }
      .icon-square.orange {
        background: #FF9900;
        border-radius: 4px;
      }
      .icon-square {
        transition: all 0.5s ease-in-out;
      }
      @keyframes shuffle1 {
        0%, 100% { grid-area: 1 / 1 / 2 / 2; }
        25% { grid-area: 2 / 2 / 3 / 3; }
        50% { grid-area: 2 / 1 / 3 / 2; }
        75% { grid-area: 1 / 2 / 2 / 3; }
      }
      @keyframes shuffle2 {
        0%, 100% { grid-area: 1 / 2 / 2 / 3; }
        25% { grid-area: 2 / 1 / 3 / 2; }
        50% { grid-area: 1 / 1 / 2 / 2; }
        75% { grid-area: 2 / 2 / 3 / 3; }
      }
      @keyframes shuffle3 {
        0%, 100% { grid-area: 2 / 1 / 3 / 2; }
        25% { grid-area: 1 / 2 / 2 / 3; }
        50% { grid-area: 2 / 2 / 3 / 3; }
        75% { grid-area: 1 / 1 / 2 / 2; }
      }
      @keyframes shuffle4 {
        0%, 100% { grid-area: 2 / 2 / 3 / 3; }
        25% { grid-area: 1 / 1 / 2 / 2; }
        50% { grid-area: 1 / 2 / 2 / 3; }
        75% { grid-area: 2 / 1 / 3 / 2; }
      }
      #sm-dashboard-btn:hover .icon-square.sq1 {
        animation: shuffle1 2s ease-in-out infinite;
      }
      #sm-dashboard-btn:hover .icon-square.sq2 {
        animation: shuffle2 2s ease-in-out infinite;
      }
      #sm-dashboard-btn:hover .icon-square.sq3 {
        animation: shuffle3 2s ease-in-out infinite;
      }
      #sm-dashboard-btn:hover .icon-square.sq4 {
        animation: shuffle4 2s ease-in-out infinite;
      }
    </style>

    <div class="sm-stat-group">
      <span class="sm-stat-text" id="sm-timer-text">Utilization: 00:00:00</span>
      <div class="sm-thin-progress">
        <div id="sm-timer-progress" class="sm-thin-fill progress-red" style="width: 0%"></div>
      </div>
    </div>

    <div class="sm-stat-group">
      <span class="sm-stat-text" id="sm-count-label">| Count: 0</span>
      <div class="sm-thin-progress">
        <div id="sm-count-progress" class="sm-thin-fill progress-red" style="width: 0%"></div>
      </div>
    </div>

    <button id="sm-dashboard-btn">
      <div class="dashboard-icon">
        <div class="icon-square dark sq1"></div>
        <div class="icon-square orange sq2"></div>
        <div class="icon-square orange sq3"></div>
        <div class="icon-square dark sq4"></div>
      </div>
    </button>
  `;

  // ============================================================================
  // 🔧 FIXED attachToFooter FUNCTION
  // ============================================================================
  function attachToFooter() {
    if (!isTaskPage()) return;

    // Extended list of footer selectors
    const footerSelectors = [
      '.cswui-footer',
      '.awsui-footer',
      'footer',
      '[class*="footer"]',
      '.task-footer',
      '.labeling-footer',
      '[data-testid="footer"]',
      '.bottom-bar',
      '.action-bar'
    ];

    let footer = null;
    for (const selector of footerSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetHeight > 0) {
        footer = el;
        break;
      }
    }

    // Remove display from current parent first
    if (display.parentElement) {
      display.parentElement.removeChild(display);
    }

    if (footer) {
      // Found a footer - use absolute positioning within it
      display.style.position = 'absolute';
      display.style.left = '12px';
      display.style.top = '50%';
      display.style.bottom = 'auto';
      display.style.transform = 'translateY(-50%)';
      display.style.background = 'transparent';
      display.style.backdropFilter = 'none';
      display.style.padding = '0';
      display.style.border = 'none';
      display.style.boxShadow = 'none';
      display.style.borderRadius = '0';
      display.style.zIndex = '50';

      // Ensure footer has relative positioning
      const footerPosition = window.getComputedStyle(footer).position;
      if (footerPosition === 'static') {
        footer.style.position = 'relative';
      }

      footer.appendChild(display);
      log("✅ Display attached to footer element");
    } else {
      // No footer found - use fixed positioning at bottom of screen
      display.style.position = 'fixed';
      display.style.left = '12px';
      display.style.bottom = '10px';
      display.style.top = 'auto';
      display.style.transform = 'none';
      display.style.background = 'rgba(15, 23, 42, 0.95)';
      display.style.backdropFilter = 'blur(10px)';
      display.style.padding = '8px 14px';
      display.style.border = '1px solid rgba(99, 102, 241, 0.3)';
      display.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
      display.style.borderRadius = '10px';
      display.style.zIndex = '999999';

      document.body.appendChild(display);
      log("⚠️ No footer found - using fixed positioning");
    }

    // Setup dashboard button click handler
    setTimeout(() => {
      const dashBtn = document.getElementById('sm-dashboard-btn');
      if (dashBtn && !dashBtn.onclick) {
        dashBtn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          log("📊 Dashboard clicked");
          try {
            showDashboard();
          } catch (error) {
            console.error("Dashboard error:", error);
            alert("Dashboard error: " + error.message);
          }
        };
      }
    }, 50);
  }

  // Improved footer observer with retry
  let footerRetryCount = 0;
  const MAX_FOOTER_RETRIES = 20;

  function tryAttachToFooter() {
    attachToFooter();

    // Check if we're in fixed mode (no footer found)
    if (display.style.position === 'fixed' && footerRetryCount < MAX_FOOTER_RETRIES) {
      footerRetryCount++;
      setTimeout(tryAttachToFooter, 500);
    } else {
      footerRetryCount = 0;
    }
  }

  let footerObserver = new MutationObserver((mutations) => {
    // Only re-attach if display is in fixed mode (not in footer)
    if (display.style.position === 'fixed' && isTaskPage()) {
      setTimeout(attachToFooter, 100);
    }
  });

  footerObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  // ============================================================================
  // 🎯 DISPLAY UPDATE
  // ============================================================================
  function updateDisplay() {
    // Read directly from localStorage during/after reset
    let committed, count;

    if (forceResetActive || resetInProgress || manualResetJustHappened) {
      // During reset, read directly from localStorage
      try {
        const rawCommitted = localStorage.getItem(KEYS.DAILY_COMMITTED);
        const rawCount = localStorage.getItem(KEYS.COUNT);
        committed = rawCommitted ? parseInt(rawCommitted) : 0;
        count = rawCount ? parseInt(rawCount) : 0;

        // Ensure we show 0 if values are invalid
        if (isNaN(committed) || committed < 0) committed = 0;
        if (isNaN(count) || count < 0) count = 0;
      } catch (e) {
        committed = 0;
        count = 0;
      }
    } else {
      committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
      count = retrieveNumber(KEYS.COUNT, 0);
    }

    let pending = 0;

    if (activeTask && !isCommitting && !isResetting && !forceResetActive && !resetInProgress && !manualResetJustHappened &&
        (activeTask.status === "active" || activeTask.status === "paused")) {
      pending = typeof activeTask.awsCurrent === 'number' ? activeTask.awsCurrent : 0;
    }

    const total = committed + pending;

    const timerText = document.getElementById('sm-timer-text');
    if (timerText) {
      timerText.textContent = `Utilization: ${fmt(total)}`;
    }

    const countLabelEl = document.getElementById('sm-count-label');
    if (countLabelEl) {
      countLabelEl.textContent = `| Count: ${count}`;
    }

    const customTargets = getCustomTargets();
    const targetSeconds = customTargets.hours * 3600;
    const targetCount = customTargets.count;

    const timerProgressBar = document.getElementById('sm-timer-progress');
    if (timerProgressBar) {
      const timePercent = Math.min(100, Math.round((total / targetSeconds) * 100));
      timerProgressBar.style.width = `${timePercent}%`;

      timerProgressBar.classList.remove('progress-red', 'progress-orange', 'progress-yellow', 'progress-lime', 'progress-green');

      if (timePercent < 20) {
        timerProgressBar.classList.add('progress-red');
      } else if (timePercent < 40) {
        timerProgressBar.classList.add('progress-orange');
      } else if (timePercent < 60) {
        timerProgressBar.classList.add('progress-yellow');
      } else if (timePercent < 80) {
        timerProgressBar.classList.add('progress-lime');
      } else {
        timerProgressBar.classList.add('progress-green');
      }
    }

    const countProgressBar = document.getElementById('sm-count-progress');
    if (countProgressBar) {
      if (targetCount !== null && targetCount > 0) {
        const countPercent = Math.min(100, Math.round((count / targetCount) * 100));
        countProgressBar.style.width = `${countPercent}%`;

        countProgressBar.classList.remove('progress-red', 'progress-orange', 'progress-yellow', 'progress-lime', 'progress-green');

        if (countPercent < 20) {
          countProgressBar.classList.add('progress-red');
        } else if (countPercent < 40) {
          countProgressBar.classList.add('progress-orange');
        } else if (countPercent < 60) {
          countProgressBar.classList.add('progress-yellow');
        } else if (countPercent < 80) {
          countProgressBar.classList.add('progress-lime');
        } else {
          countProgressBar.classList.add('progress-green');
        }
      } else {
        countProgressBar.style.width = '0%';
        countProgressBar.style.background = 'rgba(148, 163, 184, 0.3)';
      }
    }

    if (!forceResetActive && !resetInProgress && !manualResetJustHappened) {
      AchievementSystem.updateStreaks();
    }

    updateHomeDisplay();
    applyProgressBarVisibility();
  }

  // ============================================================================
  // 📊 DASHBOARD DATA FUNCTIONS
  // ============================================================================
  function aggregateTodayTaskData() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const today = todayStr();
    const permanentTasks = PermanentTaskCommits.getAllTasks();

    // Get the last manual reset time
    const lastManualResetTime = ManualResetTracker.getLastResetTime();

    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.date).toISOString().split('T')[0];
      if (sessionDate !== today) return false;

      // If there was a manual reset today, only count sessions after that
      if (lastManualResetTime) {
        const sessionTime = new Date(s.date).getTime();
        if (sessionTime < lastManualResetTime) {
          return false;
        }
      }

      return true;
    });

    const taskMap = new Map();

    // First, populate with permanent commits data (not affected by manual reset)
    Object.entries(permanentTasks).forEach(([taskName, data]) => {
      taskMap.set(taskName, {
        taskName: taskName,
        totalTime: data.totalTime || 0,
        totalSessions: data.commits || 0,
        submitted: data.commits || 0,
        skipped: 0,
        expired: 0,
        permanentCommits: data.commits || 0, // This never resets except at midnight
      });
    });

    // Then update with session data for skipped/expired counts
    todaySessions.forEach(session => {
      const taskName = session.taskName || "Unknown Task";

      if (!taskMap.has(taskName)) {
        const permData = PermanentTaskCommits.getTaskData(taskName);
        taskMap.set(taskName, {
          taskName: taskName,
          totalTime: 0,
          totalSessions: 0,
          submitted: 0,
          skipped: 0,
          expired: 0,
          permanentCommits: permData.commits || 0,
        });
      }

      const task = taskMap.get(taskName);

      if (session.action === 'skipped') {
        task.skipped++;
        task.totalSessions++;
      } else if (session.action === 'expired') {
        task.expired++;
        task.totalSessions++;
      }
    });

    return Array.from(taskMap.values()).map(task => ({
      ...task,
      successRate: task.totalSessions > 0 ?
        Math.round((task.submitted / task.totalSessions) * 100) : (task.submitted > 0 ? 100 : 0),
      avgDuration: task.submitted > 0 ? Math.round(task.totalTime / task.submitted) : 0
    }));
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
        return sessionDate === dateStr && (s.action === 'submitted' || s.action.includes('reset'));
      });

      last7Days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        time: time,
        count: daySessions.length
      });
    }

    return last7Days;
  }

  function getLast30DaysData() {
    const history = retrieve(KEYS.HISTORY, {}) || {};
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const last30Days = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const time = history[dateStr] || 0;

      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate === dateStr && (s.action === 'submitted' || s.action.includes('reset'));
      });

      last30Days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        time: time,
        count: daySessions.length
      });
    }

    return last30Days;
  }

  function getHourlyData() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const today = todayStr();

    // Get the last manual reset time
    const lastManualResetTime = ManualResetTracker.getLastResetTime();

    const hourlyData = Array(24).fill(0).map((_, hour) => ({
      hour,
      tasks: 0,
      time: 0
    }));

    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const sessionDateStr = sessionDate.toISOString().split('T')[0];

      if (sessionDateStr === today &&
          (session.action === 'submitted' || session.action.includes('reset'))) {

        // If there was a manual reset today, only count sessions after that
        if (lastManualResetTime) {
          const sessionTime = sessionDate.getTime();
          if (sessionTime < lastManualResetTime) {
            return;
          }
        }

        const hour = sessionDate.getHours();
        hourlyData[hour].tasks++;
        hourlyData[hour].time += (session.duration || 0);
      }
    });

    return hourlyData;
  }

  function getActiveHoursOnly() {
    const hourlyData = getHourlyData();
    return hourlyData.filter(h => h.tasks > 0);
  }

  function getCustomTargets() {
    return {
      hours: retrieve(KEYS.CUSTOM_TARGET_HOURS, CONFIG.DAILY_ALERT_HOURS),
      count: retrieve(KEYS.CUSTOM_TARGET_COUNT, null)
    };
  }

  function dashboardExportJSON(dateRange = null) {
    let sessions = retrieve(KEYS.SESSIONS, []);
    let history = retrieve(KEYS.HISTORY, {});

    if (dateRange && dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from).toISOString().split('T')[0];
      const toDate = new Date(dateRange.to).toISOString().split('T')[0];

      sessions = sessions.filter(s => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate >= fromDate && sessionDate <= toDate;
      });

      const filteredHistory = {};
      Object.keys(history).forEach(date => {
        if (date >= fromDate && date <= toDate) {
          filteredHistory[date] = history[date];
        }
      });
      history = filteredHistory;
    }

    const payload = {
      version: "7.3-ULTIMATE",
      exported_at: new Date().toISOString(),
      date_range: dateRange || 'all',
      history: history,
      sessions: sessions,
      analytics: retrieve(KEYS.ANALYTICS, {}),
      daily_committed: retrieveNumber(KEYS.DAILY_COMMITTED, 0),
      count: retrieveNumber(KEYS.COUNT, 0),
      total_commits_alltime: retrieveNumber(KEYS.TOTAL_COMMITS_ALLTIME, 0),
      permanent_daily_hits: getPermanentDailyHits(),
      permanent_task_commits: retrieve(KEYS.PERMANENT_TASK_COMMITS, {}),
      last_date: retrieve(KEYS.LAST_DATE),
      achievements: retrieve(KEYS.ACHIEVEMENTS, {}),
      streaks: retrieve(KEYS.STREAKS, {}),
      delay_stats: DelayAccumulator.dailyStats,
      smart_status: SmartEngine.getStatus(),
      reminder_settings: ReminderSystem.settings,
      reminder_stats: ReminderSystem.stats
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = dateRange ?
      `sagemaker-data-${dateRange.from}-to-${dateRange.to}.json` :
      `sagemaker-data-${todayStr()}.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function dashboardExportCSV(dateRange = null) {
    let sessions = retrieve(KEYS.SESSIONS, []) || [];

    if (dateRange && dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from).toISOString().split('T')[0];
      const toDate = new Date(dateRange.to).toISOString().split('T')[0];

      sessions = sessions.filter(s => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate >= fromDate && sessionDate <= toDate;
      });
    }

    if (sessions.length === 0) {
      alert('No sessions found for the selected date range.');
      return;
    }

    const headers = ['Date', 'Time', 'Task Name', 'Duration (seconds)', 'Duration (formatted)', 'Action', 'Delay Recovered (s)'];
    const rows = sessions.map(s => {
      const date = new Date(s.date);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${(s.taskName || 'Unknown').replace(/"/g, '""')}"`,
        s.duration || 0,
        fmt(s.duration || 0),
        s.action || 'unknown',
        s.delayRecovered ? s.delayRecovered.toFixed(3) : '0'
      ];
    });

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = dateRange ?
      `sagemaker-sessions-${dateRange.from}-to-${dateRange.to}.csv` :
      `sagemaker-sessions-${todayStr()}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function dashboardImportJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (!data.version || !data.sessions) {
            throw new Error('Invalid file');
          }

          const shouldMerge = confirm('Merge with existing data?\n\nOK = Merge\nCancel = Replace');

          if (shouldMerge) {
            const existingSessions = retrieve(KEYS.SESSIONS, []);
            const existingHistory = retrieve(KEYS.HISTORY, {});
            store(KEYS.SESSIONS, [...existingSessions, ...data.sessions]);
            store(KEYS.HISTORY, { ...existingHistory, ...data.history });
          } else {
            store(KEYS.HISTORY, data.history || {});
            store(KEYS.SESSIONS, data.sessions || []);
            store(KEYS.ANALYTICS, data.analytics || {});
            if (data.daily_committed !== undefined) store(KEYS.DAILY_COMMITTED, data.daily_committed);
            if (data.count !== undefined) store(KEYS.COUNT, data.count);
            if (data.total_commits_alltime !== undefined) store(KEYS.TOTAL_COMMITS_ALLTIME, data.total_commits_alltime);
            if (data.achievements) store(KEYS.ACHIEVEMENTS, data.achievements);
            if (data.streaks) store(KEYS.STREAKS, data.streaks);
            if (data.delay_stats) DelayAccumulator.dailyStats = data.delay_stats;
            if (data.reminder_settings) store(KEYS.REMINDER_SETTINGS, data.reminder_settings);
            if (data.reminder_stats) store(KEYS.REMINDER_STATS, data.reminder_stats);
            if (data.permanent_task_commits) store(KEYS.PERMANENT_TASK_COMMITS, data.permanent_task_commits);
          }

          if (document.getElementById('sm-dashboard')) {
            showDashboard();
          }

          alert('✅ Data imported successfully!');
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  // ============================================================================
  // 🎨 RESET DIALOG - THEME AWARE WITH PERFECT RESET
  // ============================================================================
  function showResetDialog() {
    requestAnimationFrame(() => {
      const existing = document.getElementById("sm-reset-dialog");
      if (existing) existing.remove();

      const currentTimer = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
      const currentCount = retrieveNumber(KEYS.COUNT, 0);
      const theme = ThemeManager.getTheme();
      const colors = ThemeManager.getThemeColors();

      const dialog = document.createElement("div");
      dialog.id = "sm-reset-dialog";
      dialog.setAttribute('data-theme', theme);

      dialog.innerHTML = `
        <style>
          #sm-reset-dialog {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999999;
            font-family: 'Inter', sans-serif;
            animation: fadeIn 0.15s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          #sm-reset-backdrop {
            position: absolute;
            inset: 0;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)'};
            backdrop-filter: blur(20px);
          }
          #sm-reset-modal {
            position: relative;
            width: 420px;
            background: ${theme === 'light' ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'};
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(239, 68, 68, 0.3);
            overflow: hidden;
            animation: slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          #sm-reset-modal .header {
            padding: 20px 24px;
            background: linear-gradient(135deg, #dc2626, #ef4444);
          }
          #sm-reset-modal h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          #sm-reset-modal .body {
            padding: 24px;
          }
          #sm-reset-modal .current-values {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(15,23,42,0.8)'};
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-around;
            gap: 16px;
            border: 1px solid ${theme === 'light' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.2)'};
          }
          #sm-reset-modal .value {
            text-align: center;
            flex: 1;
          }
          #sm-reset-modal .value-label {
            font-size: 11px;
            color: ${colors.textTertiary};
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          #sm-reset-modal .value strong {
            display: block;
            color: ${colors.textPrimary};
            font-weight: 900;
            font-size: 24px;
            font-variant-numeric: tabular-nums;
          }
          #sm-reset-modal .warning-box {
            background: ${theme === 'light' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.05) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)'};
            border: 2px solid rgba(239, 68, 68, 0.4);
            padding: 14px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          #sm-reset-modal .warning-text {
            font-size: 13px;
            color: #fca5a5;
            font-weight: 600;
            line-height: 1.5;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          #sm-reset-modal .warning-icon {
            font-size: 20px;
            flex-shrink: 0;
          }
          #sm-reset-modal .info-box {
            background: ${theme === 'light' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.15)'};
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 12px;
            color: ${theme === 'light' ? '#1d4ed8' : '#93c5fd'};
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          #sm-reset-modal .options {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          #sm-reset-modal .option-btn {
            padding: 14px 18px;
            border: 2px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(148,163,184,0.2)'};
            border-radius: 12px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(30,41,59,0.6)'};
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 700;
            color: ${colors.textPrimary};
          }
          #sm-reset-modal .option-btn:hover {
            border-color: #dc2626;
            background: rgba(220, 38, 38, 0.15);
            transform: translateX(6px);
            box-shadow: 0 6px 20px rgba(220,38,38,0.3);
          }
          #sm-reset-modal .option-btn .icon {
            font-size: 20px;
          }
          #sm-reset-modal .option-btn .text {
            flex: 1;
          }
          #sm-reset-modal .option-btn .desc {
            font-size: 11px;
            color: ${colors.textTertiary};
            font-weight: 500;
            margin-top: 2px;
          }
          #sm-reset-modal .footer {
            padding: 16px 24px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(15,23,42,0.8)'};
            display: flex;
            justify-content: flex-end;
            border-top: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'};
          }
          #sm-reset-modal .cancel-btn {
            padding: 12px 24px;
            border: 2px solid ${theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(148,163,184,0.4)'};
            background: transparent;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.3s;
            color: ${colors.textSecondary};
          }
          #sm-reset-modal .cancel-btn:hover {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(148,163,184,0.15)'};
            border-color: ${theme === 'light' ? 'rgba(0,0,0,0.3)' : '#64748b'};
            color: ${colors.textPrimary};
          }
        </style>

        <div id="sm-reset-backdrop"></div>
        <div id="sm-reset-modal">
          <div class="header">
            <h3>🔄 Manual Reset</h3>
          </div>
          <div class="body">
            <div class="current-values">
              <div class="value">
                <div class="value-label">⏱️ Current Timer</div>
                <strong>${fmt(currentTimer)}</strong>
              </div>
              <div class="value">
                <div class="value-label">📋 Current Count</div>
                <strong>${currentCount}</strong>
              </div>
            </div>

            <div class="warning-box">
              <div class="warning-text">
                <span class="warning-icon">⚠️</span>
                <span>Manual reset will immediately set values to <strong>ZERO</strong>. This action cannot be undone. Data will <strong>NOT</strong> be saved to history.</span>
              </div>
            </div>

            <div class="info-box">
              <span>ℹ️</span>
              <span>Total Hits (${getPermanentDailyHits()}) and Total Commits (${PermanentTaskCommits.getTotalCommits()}) will NOT be affected. They only reset at midnight.</span>
            </div>

            <div class="options">
              <button class="option-btn" data-reset="timer">
                <span class="icon">⏱️</span>
                <div class="text">
                  <div>Reset Timer Only</div>
                  <div class="desc">Sets timer to 00:00:00, keeps count</div>
                </div>
              </button>
              <button class="option-btn" data-reset="counter">
                <span class="icon">🔢</span>
                <div class="text">
                  <div>Reset Counter Only</div>
                  <div class="desc">Sets task count to 0, keeps timer</div>
                </div>
              </button>
              <button class="option-btn" data-reset="both">
                <span class="icon">🔄</span>
                <div class="text">
                  <div>Reset Both</div>
                  <div class="desc">Resets timer and counter to 0</div>
                </div>
              </button>
            </div>
          </div>
          <div class="footer">
            <button class="cancel-btn" id="reset-cancel">Cancel (ESC)</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.stopImmediatePropagation();
          dialog.remove();
          document.removeEventListener('keydown', escHandler, true);
        }
      };

      document.addEventListener('keydown', escHandler, true);

      dialog.querySelector("#sm-reset-backdrop").addEventListener("click", () => {
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
      });

      dialog.querySelector("#reset-cancel").addEventListener("click", () => {
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
      });

      dialog.querySelectorAll(".option-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const resetType = btn.dataset.reset;
          dialog.remove();
          document.removeEventListener('keydown', escHandler, true);

          // Show loading indicator
          const loadingToast = document.createElement('div');
          loadingToast.id = 'sm-reset-loading';
          loadingToast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: white;
            padding: 24px 40px;
            border-radius: 16px;
            font-weight: 800;
            font-size: 16px;
            z-index: 9999999999;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            gap: 16px;
            border: 2px solid rgba(99, 102, 241, 0.5);
          `;
          loadingToast.innerHTML = `
            <div style="width: 24px; height: 24px; border: 3px solid rgba(99, 102, 241, 0.3); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>Resetting...</span>
            <style>
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          `;
          document.body.appendChild(loadingToast);

          // Execute the perfect manual reset
          const success = await performManualReset(resetType);

          // Remove loading
          loadingToast.remove();

          // Verify reset worked
          const verifyTimer = localStorage.getItem(KEYS.DAILY_COMMITTED);
          const verifyCount = localStorage.getItem(KEYS.COUNT);

          log(`🔍 Reset verification: Timer=${verifyTimer}, Count=${verifyCount}`);

          if (success) {
            // Show success confirmation
            const toast = document.createElement('div');
            toast.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 16px 32px;
              border-radius: 14px;
              font-weight: 800;
              font-size: 15px;
              z-index: 9999999999;
              box-shadow: 0 8px 32px rgba(16, 185, 129, 0.5);
              animation: slideDown 0.3s ease;
              display: flex;
              align-items: center;
              gap: 12px;
            `;

            let resetLabel = '';
            if (resetType === 'timer') resetLabel = 'Timer';
            else if (resetType === 'counter') resetLabel = 'Counter';
            else resetLabel = 'Timer & Counter';

            toast.innerHTML = `
              <span style="font-size: 24px;">✅</span>
              <span>Reset Complete! ${resetLabel} set to 0</span>
              <style>
                @keyframes slideDown {
                  from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                  to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
              </style>
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
              toast.style.opacity = '0';
              toast.style.transition = 'opacity 0.3s';
              setTimeout(() => {
                toast.remove();
              }, 300);
            }, 3000);

            // Force update all displays
            setTimeout(() => {
              updateDisplay();
              updateHomeDisplay();
              updateTopBanner();
            }, 100);

          } else {
            // Show error
            const errorToast = document.createElement('div');
            errorToast.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #ef4444, #dc2626);
              color: white;
              padding: 16px 32px;
              border-radius: 14px;
              font-weight: 800;
              font-size: 15px;
              z-index: 9999999999;
              box-shadow: 0 8px 32px rgba(239, 68, 68, 0.5);
            `;
            errorToast.innerHTML = `❌ Reset failed. Please try again.`;
            document.body.appendChild(errorToast);

            setTimeout(() => {
              errorToast.remove();
            }, 3000);
          }
        });
      });
    });
  }

  // ============================================================================
  // 🎨 TARGET DIALOG - THEME AWARE
  // ============================================================================
  function showTargetDialog() {
    requestAnimationFrame(() => {
      const existing = document.getElementById('sm-target-dialog');
      if (existing) existing.remove();

      const currentTargets = getCustomTargets();
      const theme = ThemeManager.getTheme();
      const colors = ThemeManager.getThemeColors();

      const targetDialog = document.createElement('div');
      targetDialog.id = 'sm-target-dialog';
      targetDialog.setAttribute('data-theme', theme);

      targetDialog.innerHTML = `
        <style>
          @keyframes targetFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes targetSlideUp {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          #sm-target-dialog {
            position: fixed;
            inset: 0;
            z-index: 99999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', sans-serif;
            animation: targetFadeIn 0.15s ease;
          }
          #sm-target-backdrop {
            position: absolute;
            inset: 0;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.5)' : 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(15,23,42,0.8) 100%)'};
            backdrop-filter: blur(20px);
          }
          #sm-target-modal {
            position: relative;
            width: 400px;
            max-width: calc(100% - 32px);
            background: ${theme === 'light' ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'};
            backdrop-filter: blur(40px);
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(99, 102, 241, 0.3);
            overflow: hidden;
            animation: targetSlideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          #sm-target-modal .header {
            padding: 24px 24px 20px 24px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          }
          #sm-target-modal h3 {
            margin: 0;
            font-size: 22px;
            font-weight: 900;
            color: white;
          }
          #sm-target-modal .body {
            padding: 24px;
          }
          #sm-target-modal .input-group {
            margin-bottom: 20px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.03)' : 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.6) 100%)'};
            padding: 18px;
            border-radius: 14px;
            border: 1px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.25)'};
          }
          #sm-target-modal .input-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 800;
            color: ${colors.textSecondary};
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          #sm-target-modal input {
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            border: 2px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
            background: ${theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(15, 23, 42, 0.6)'};
            color: ${colors.textPrimary};
            font-size: 16px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
            transition: all 0.3s;
          }
          #sm-target-modal input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          }
          #sm-target-modal .input-hint {
            font-size: 11px;
            color: ${colors.textTertiary};
            margin-top: 8px;
            font-weight: 600;
          }
          #sm-target-modal .button-group {
            display: flex;
            gap: 10px;
            margin-top: 24px;
          }
          #sm-target-modal .btn {
            flex: 1;
            padding: 14px 18px;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            font-weight: 800;
            font-size: 14px;
            transition: all 0.3s;
            font-family: 'Inter', sans-serif;
          }
          #sm-target-modal .btn-save {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          #sm-target-modal .btn-save:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          }
          #sm-target-modal .btn-cancel {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(100, 116, 139, 0.3)'};
            color: ${colors.textSecondary};
          }
          #sm-target-modal .btn-cancel:hover {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(100, 116, 139, 0.4)'};
          }
        </style>

        <div id="sm-target-backdrop"></div>
        <div id="sm-target-modal">
          <div class="header">
            <h3>🎯 Set Daily Targets</h3>
          </div>
          <div class="body">
            <div class="input-group">
              <label class="input-label">
                <span>⏱️</span>
                <span>Time Target (Hours)</span>
              </label>
              <input type="number" id="target-hours" value="${currentTargets.hours}" min="1" max="24" step="0.5">
              <div class="input-hint">💡 Set your daily work hour target</div>
            </div>

            <div class="input-group">
              <label class="input-label">
                <span>📋</span>
                <span>Task Count Target</span>
              </label>
              <input type="number" id="target-count"
                ${currentTargets.count !== null ? `value="${currentTargets.count}"` : 'placeholder="e.g., 600"'}
                min="1" max="10000" step="1">
              <div class="input-hint">💡 Optional task count goal</div>
            </div>

            <div class="button-group">
              <button class="btn btn-save" id="target-save">💾 Save</button>
              <button class="btn btn-cancel" id="target-cancel">✕ Cancel</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(targetDialog);

      targetDialog.querySelector('#sm-target-backdrop').addEventListener('click', () => {
        targetDialog.remove();
      });

      targetDialog.querySelector('#target-cancel').addEventListener('click', () => {
        targetDialog.remove();
      });

      targetDialog.querySelector('#target-save').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const hours = parseFloat(document.getElementById('target-hours').value) || 8;
        const countInput = document.getElementById('target-count').value;
        const targetCount = countInput ? parseInt(countInput) : null;

        store(KEYS.CUSTOM_TARGET_HOURS, hours);
        store(KEYS.CUSTOM_TARGET_COUNT, targetCount);

        targetDialog.remove();

        // Update displays
        updateDisplay();

        if (document.getElementById('sm-dashboard')) {
          const dash = document.getElementById('sm-dashboard');
          dash.remove();
          setTimeout(() => showDashboard(), 100);
        }
      });

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          targetDialog.remove();
          document.removeEventListener('keydown', escHandler, true);
        }
      };
      document.addEventListener('keydown', escHandler, true);
    });
  }

  // ============================================================================
  // 📤 EXPORT DIALOG - THEME AWARE
  // ============================================================================
  function showExportDialog() {
    requestAnimationFrame(() => {
      const existing = document.getElementById('sm-export-dialog');
      if (existing) existing.remove();

      const theme = ThemeManager.getTheme();
      const colors = ThemeManager.getThemeColors();

      const dialog = document.createElement('div');
      dialog.id = 'sm-export-dialog';
      dialog.setAttribute('data-theme', theme);

      dialog.innerHTML = `
        <style>
          @keyframes exportFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes exportSlideUp {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          #sm-export-dialog {
            position: fixed;
            inset: 0;
            z-index: 99999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', sans-serif;
            animation: exportFadeIn 0.15s ease;
          }
          #sm-export-backdrop {
            position: absolute;
            inset: 0;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.5)' : 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(15,23,42,0.8) 100%)'};
            backdrop-filter: blur(20px);
          }
          #sm-export-modal {
            position: relative;
            width: 500px;
            max-width: calc(100% - 32px);
            background: ${theme === 'light' ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)'};
            backdrop-filter: blur(40px);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99, 102, 241, 0.3);
            overflow: hidden;
            animation: exportSlideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .export-header {
            padding: 20px 24px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
          }
          .export-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
          }
          .export-body {
            padding: 24px;
          }
          .export-section {
            margin-bottom: 20px;
          }
          .export-section-title {
            font-size: 13px;
            font-weight: 800;
            color: ${colors.textPrimary};
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .date-range-inputs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .date-input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .date-input-label {
            font-size: 11px;
            font-weight: 700;
            color: ${colors.textTertiary};
            text-transform: uppercase;
          }
          .date-input {
            padding: 10px 12px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(15, 23, 42, 0.8)'};
            border: 2px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
            border-radius: 8px;
            color: ${colors.textPrimary};
            font-size: 13px;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
          }
          .date-input:focus {
            outline: none;
            border-color: #6366f1;
          }
          .quick-select-buttons {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
          }
          .quick-select-btn {
            padding: 8px 12px;
            background: ${theme === 'light' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.1)'};
            border: 1px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
            border-radius: 8px;
            color: ${theme === 'light' ? '#6366f1' : '#a5b4fc'};
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
          }
          .quick-select-btn:hover {
            background: ${theme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.2)'};
            border-color: #6366f1;
            transform: translateY(-2px);
          }
          .export-format-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .export-format-btn {
            padding: 14px 20px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(15, 23, 42, 0.6)'};
            border: 2px solid ${theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)'};
            border-radius: 12px;
            color: ${colors.textPrimary};
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
          }
          .export-format-btn:hover {
            background: ${theme === 'light' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.2)'};
            border-color: #6366f1;
            transform: translateX(4px);
          }
          .export-format-icon {
            font-size: 20px;
            margin-right: 12px;
          }
          .export-format-info {
            flex: 1;
            text-align: left;
          }
          .export-format-name {
            font-size: 14px;
            font-weight: 800;
            margin-bottom: 2px;
          }
          .export-format-desc {
            font-size: 10px;
            color: ${colors.textTertiary};
            font-weight: 600;
          }
          .export-footer {
            padding: 16px 24px;
            background: ${theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(0, 0, 0, 0.2)'};
            display: flex;
            justify-content: space-between;
            border-top: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)'};
          }
          .export-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 800;
            font-size: 13px;
            transition: all 0.3s;
            font-family: 'Inter', sans-serif;
          }
          .export-btn-import {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
          }
          .export-btn-import:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
          }
          .export-btn-close {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(100, 116, 139, 0.3)'};
            color: ${colors.textSecondary};
          }
          .export-btn-close:hover {
            background: ${theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(100, 116, 139, 0.5)'};
          }
        </style>

        <div id="sm-export-backdrop"></div>
        <div id="sm-export-modal">
          <div class="export-header">
            <h3>📤 Export Data</h3>
          </div>

          <div class="export-body">
            <div class="export-section">
              <div class="export-section-title">📅 Select Date Range</div>
              <div class="date-range-inputs">
                <div class="date-input-group">
                  <label class="date-input-label">From Date</label>
                  <input type="date" class="date-input" id="export-date-from" value="${todayStr()}">
                </div>
                <div class="date-input-group">
                  <label class="date-input-label">To Date</label>
                  <input type="date" class="date-input" id="export-date-to" value="${todayStr()}">
                </div>
              </div>
              <div class="quick-select-buttons">
                <button class="quick-select-btn" data-range="today">Today</button>
                <button class="quick-select-btn" data-range="week">This Week</button>
                <button class="quick-select-btn" data-range="month">This Month</button>
                <button class="quick-select-btn" data-range="7days">Last 7 Days</button>
                <button class="quick-select-btn" data-range="30days">Last 30 Days</button>
                <button class="quick-select-btn" data-range="all">All Time</button>
              </div>
            </div>

            <div class="export-section">
              <div class="export-section-title">📄 Select Format</div>
              <div class="export-format-buttons">
                <button class="export-format-btn" id="export-json-btn">
                  <span class="export-format-icon">💾</span>
                  <div class="export-format-info">
                    <div class="export-format-name">JSON Format</div>
                    <div class="export-format-desc">Complete data with all details</div>
                  </div>
                </button>
                <button class="export-format-btn" id="export-csv-btn">
                  <span class="export-format-icon">📊</span>
                  <div class="export-format-info">
                    <div class="export-format-name">CSV Format</div>
                    <div class="export-format-desc">Session data for Excel/Sheets</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="export-footer">
            <button class="export-btn export-btn-import" id="import-json-btn">
              📥 Import JSON
            </button>
            <button class="export-btn export-btn-close" id="export-close-btn">
              ✕ Close
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // Quick select buttons
      dialog.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const range = btn.dataset.range;
          const fromInput = dialog.querySelector('#export-date-from');
          const toInput = dialog.querySelector('#export-date-to');
          const today = new Date();

          switch(range) {
            case 'today':
              fromInput.value = todayStr();
              toInput.value = todayStr();
              break;
            case 'week':
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              fromInput.value = startOfWeek.toISOString().split('T')[0];
              toInput.value = todayStr();
              break;
            case 'month':
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              fromInput.value = startOfMonth.toISOString().split('T')[0];
              toInput.value = todayStr();
              break;
            case '7days':
              const sevenDaysAgo = new Date(today);
              sevenDaysAgo.setDate(today.getDate() - 6);
              fromInput.value = sevenDaysAgo.toISOString().split('T')[0];
              toInput.value = todayStr();
              break;
            case '30days':
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 29);
              fromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
              toInput.value = todayStr();
              break;
            case 'all':
              fromInput.value = '';
              toInput.value = '';
              break;
          }
        });
      });

      // Export buttons
      dialog.querySelector('#export-json-btn').addEventListener('click', () => {
        const fromDate = dialog.querySelector('#export-date-from').value;
        const toDate = dialog.querySelector('#export-date-to').value;

        if (fromDate && toDate) {
          dashboardExportJSON({ from: fromDate, to: toDate });
        } else {
          dashboardExportJSON();
        }
        dialog.remove();
      });

      dialog.querySelector('#export-csv-btn').addEventListener('click', () => {
        const fromDate = dialog.querySelector('#export-date-from').value;
        const toDate = dialog.querySelector('#export-date-to').value;

        if (fromDate && toDate) {
          dashboardExportCSV({ from: fromDate, to: toDate });
        } else {
          dashboardExportCSV();
        }
        dialog.remove();
      });

      // Import button
      dialog.querySelector('#import-json-btn').addEventListener('click', () => {
        dialog.remove();
        dashboardImportJSON();
      });

      // Close buttons
      dialog.querySelector('#sm-export-backdrop').addEventListener('click', () => {
        dialog.remove();
      });

      dialog.querySelector('#export-close-btn').addEventListener('click', () => {
        dialog.remove();
      });

      // ESC handler
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          dialog.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  // ============================================================================
  // 📈 SVG LINE CHART GENERATOR - DUAL AXIS
  // ============================================================================
  function generateDualAxisLineChart(data, options = {}) {
    const {
      width = 800,
      height = 300,
      padding = { top: 40, right: 60, bottom: 50, left: 60 },
      line1Color = '#6366f1',
      line2Color = '#10b981',
      line1Label = 'Tasks',
      line2Label = 'Time (hours)',
      showDots = true,
      showGrid = true,
      showArea = true,
      animate = true
    } = options;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate max values for each axis
    const maxValue1 = Math.max(...data.map(d => d.value1 || 0), 1);
    const maxValue2 = Math.max(...data.map(d => d.value2 || 0), 1);

    // Generate points for each line
    const points1 = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value1 || 0) / maxValue1) * chartHeight;
      return { x, y, value: d.value1 || 0, label: d.label };
    });

    const points2 = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value2 || 0) / maxValue2) * chartHeight;
      return { x, y, value: d.value2 || 0, label: d.label };
    });

    // Create path strings
    const createPath = (points) => {
      if (points.length === 0) return '';
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    // Create area path (for fill)
    const createAreaPath = (points) => {
      if (points.length === 0) return '';
      const linePath = createPath(points);
      return `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
    };

    // Generate Y-axis labels
    const yLabels1 = [0, Math.round(maxValue1 * 0.25), Math.round(maxValue1 * 0.5), Math.round(maxValue1 * 0.75), maxValue1];
    const yLabels2 = [0, (maxValue2 * 0.25).toFixed(1), (maxValue2 * 0.5).toFixed(1), (maxValue2 * 0.75).toFixed(1), maxValue2.toFixed(1)];

    // Generate X-axis labels (show every nth label based on data length)
    const labelInterval = Math.ceil(data.length / 7);

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${line1Color};stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:${line1Color};stop-opacity:0.05"/>
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${line2Color};stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:${line2Color};stop-opacity:0.05"/>
          </linearGradient>
          <filter id="glow1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Grid lines -->
        ${showGrid ? `
          <g class="grid-lines" stroke="var(--border-subtle)" stroke-width="1" opacity="0.5">
            ${yLabels1.map((_, i) => {
              const y = padding.top + (i / 4) * chartHeight;
              return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke-dasharray="4,4"/>`;
            }).join('')}
          </g>
        ` : ''}

        <!-- Area fills -->
        ${showArea ? `
          <path d="${createAreaPath(points1)}" fill="url(#gradient1)" opacity="0.6">
            ${animate ? `<animate attributeName="opacity" from="0" to="0.6" dur="0.8s" fill="freeze"/>` : ''}
          </path>
          <path d="${createAreaPath(points2)}" fill="url(#gradient2)" opacity="0.6">
            ${animate ? `<animate attributeName="opacity" from="0" to="0.6" dur="0.8s" fill="freeze"/>` : ''}
          </path>
        ` : ''}

        <!-- Line 1 (Tasks) -->
        <path d="${createPath(points1)}" fill="none" stroke="${line1Color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow1)">
          ${animate ? `<animate attributeName="stroke-dasharray" from="0 9999" to="9999 0" dur="1.5s" fill="freeze"/>` : ''}
        </path>

        <!-- Line 2 (Time) -->
        <path d="${createPath(points2)}" fill="none" stroke="${line2Color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow2)">
          ${animate ? `<animate attributeName="stroke-dasharray" from="0 9999" to="9999 0" dur="1.5s" fill="freeze"/>` : ''}
        </path>

        <!-- Dots for Line 1 -->
        ${showDots ? points1.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="${line1Color}" stroke="var(--bg-primary)" stroke-width="2" class="chart-dot" data-index="${i}" data-line="1" data-value="${p.value}" data-label="${p.label}">
            ${animate ? `<animate attributeName="r" from="0" to="5" dur="0.3s" begin="${0.5 + i * 0.05}s" fill="freeze"/>` : ''}
          </circle>
        `).join('') : ''}

        <!-- Dots for Line 2 -->
        ${showDots ? points2.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="${line2Color}" stroke="var(--bg-primary)" stroke-width="2" class="chart-dot" data-index="${i}" data-line="2" data-value="${p.value}" data-label="${p.label}">
            ${animate ? `<animate attributeName="r" from="0" to="5" dur="0.3s" begin="${0.5 + i * 0.05}s" fill="freeze"/>` : ''}
          </circle>
        `).join('') : ''}

        <!-- Y-Axis Left (Tasks) -->
        <g class="y-axis-left" fill="${line1Color}" font-size="11" font-weight="700">
          ${yLabels1.reverse().map((label, i) => {
            const y = padding.top + (i / 4) * chartHeight;
            return `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${label}</text>`;
          }).join('')}
          <text x="${padding.left - 35}" y="${padding.top + chartHeight / 2}" text-anchor="middle" transform="rotate(-90, ${padding.left - 35}, ${padding.top + chartHeight / 2})" font-size="12" font-weight="800">${line1Label}</text>
        </g>

        <!-- Y-Axis Right (Time) -->
        <g class="y-axis-right" fill="${line2Color}" font-size="11" font-weight="700">
          ${yLabels2.reverse().map((label, i) => {
            const y = padding.top + (i / 4) * chartHeight;
            return `<text x="${width - padding.right + 10}" y="${y + 4}" text-anchor="start">${label}h</text>`;
          }).join('')}
          <text x="${width - padding.right + 40}" y="${padding.top + chartHeight / 2}" text-anchor="middle" transform="rotate(90, ${width - padding.right + 40}, ${padding.top + chartHeight / 2})" font-size="12" font-weight="800">${line2Label}</text>
        </g>

        <!-- X-Axis Labels -->
        <g class="x-axis" fill="var(--text-tertiary)" font-size="10" font-weight="700">
          ${data.map((d, i) => {
            if (i % labelInterval === 0 || i === data.length - 1) {
              const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
              return `<text x="${x}" y="${height - 15}" text-anchor="middle">${d.label}</text>`;
            }
            return '';
          }).join('')}
        </g>

        <!-- Axis Lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="var(--border-default)" stroke-width="2"/>
        <line x1="${width - padding.right}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="var(--border-default)" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="var(--border-default)" stroke-width="2"/>
      </svg>
    `;
  }

  // ============================================================================
  // 📊 ULTIMATE PROFESSIONAL DASHBOARD v7.3 - WITH DUAL-AXIS LINE CHARTS
  // ============================================================================
  function showDashboard() {
    const existing = document.getElementById('sm-dashboard');
    if (existing) {
      existing.remove();
      return;
    }

    log("🎯 Opening ULTIMATE v7.3 dashboard with Dual-Axis Line Charts...");

    // Gather all data
    const committed = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
    const count = retrieveNumber(KEYS.COUNT, 0);
    const allTimeCommits = retrieveNumber(KEYS.TOTAL_COMMITS_ALLTIME, 0);
    const permanentHits = getPermanentDailyHits();
    const permanentTotalCommits = PermanentTaskCommits.getTotalCommits();
    const todayTasks = aggregateTodayTaskData();
    const last7Days = getLast7DaysData();
    const last30Days = getLast30DaysData();
    const activeHours = getActiveHoursOnly();
    const customTargets = getCustomTargets();
    const sessions = retrieve(KEYS.SESSIONS, []);
    const history = retrieve(KEYS.HISTORY, {});
    const theme = ThemeManager.getTheme();

    const targetSeconds = customTargets.hours * 3600;
    const goalPercent = Math.min(100, Math.round((committed / targetSeconds) * 100));
    const countProgress = customTargets.count ? Math.round((count / customTargets.count) * 100) : 0;

    const avgTaskTime = count > 0 ? Math.round(committed / count) : 0;
    const sortedTasks = todayTasks.filter(t => t.submitted > 0 || t.permanentCommits > 0).sort((a, b) => b.permanentCommits - a.permanentCommits);
    const thisWeekTotal = last7Days.reduce((sum, d) => sum + d.count, 0);
    const thisWeekTime = last7Days.reduce((sum, d) => sum + d.time, 0);

    // Analytics calculations
    const totalAllTime = Object.values(history).reduce((sum, val) => sum + val, 0);
    const avgDailyTime = totalAllTime / Math.max(1, Object.keys(history).length);
    const totalDays = Object.keys(history).length;

    const submittedSessions = sessions.filter(s => s.action === 'submitted' || s.action.includes('reset'));
    const totalTasksCompleted = submittedSessions.length;
    const totalWorkTime = submittedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgTaskDuration = totalTasksCompleted > 0 ? totalWorkTime / totalTasksCompleted : 0;

    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.date).toISOString().split('T')[0];
      return sessionDate === todayStr();
    });
    const todaySubmitted = todaySessions.filter(s => s.action === 'submitted' || s.action.includes('reset')).length;
    const todaySkipped = todaySessions.filter(s => s.action === 'skipped').length;
    const todayExpired = todaySessions.filter(s => s.action === 'expired').length;
    const todaySuccessRate = todaySessions.length > 0 ? Math.round((todaySubmitted / todaySessions.length) * 100) : 0;

    // Best Day calculation
    const bestDay = Object.entries(history).sort((a, b) => b[1] - a[1])[0];
    const bestDayFormatted = bestDay ? `${new Date(bestDay[0]).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} (${fmt(bestDay[1])})` : 'N/A';

    // Week comparison
    const last7DaysTotal = last7Days.reduce((sum, d) => sum + d.time, 0);
    const previous7Days = [];
    for (let i = 13; i >= 7; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      previous7Days.push(history[dateStr] || 0);
    }
    const previous7DaysTotal = previous7Days.reduce((sum, val) => sum + val, 0);
    const weekComparison = previous7DaysTotal > 0 ? ((last7DaysTotal - previous7DaysTotal) / previous7DaysTotal * 100).toFixed(1) : 0;

    // Yesterday comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayTime = history[yesterdayStr] || 0;
    const yesterdaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.date).toISOString().split('T')[0];
      return sessionDate === yesterdayStr && (s.action === 'submitted' || s.action.includes('reset'));
    });
    const yesterdayCount = yesterdaySessions.length;

    // Peak hour
    const hourlyData = getHourlyData();
    const peakHour = hourlyData.reduce((max, h) => h.tasks > max.tasks ? h : max, hourlyData[0]);

    // Smart Insights
    const smartInsights = SmartEngine.getInsights();

    // Task type detection
    const currentTaskType = TaskTypeDetector.detect();

    // Prepare data for line charts
    const weeklyChartData = last7Days.map(d => ({
      label: d.dayName,
      value1: d.count,
      value2: d.time / 3600 // Convert to hours
    }));

    const monthlyChartData = last30Days.map(d => ({
      label: `${d.month} ${d.dayNum}`,
      value1: d.count,
      value2: d.time / 3600 // Convert to hours
    }));

    // Generate SVG charts
    const weeklyLineChart = generateDualAxisLineChart(weeklyChartData, {
      width: 600,
      height: 280,
      line1Label: 'Tasks',
      line2Label: 'Time (h)',
      showArea: true
    });

    const monthlyLineChart = generateDualAxisLineChart(monthlyChartData, {
      width: 900,
      height: 350,
      padding: { top: 40, right: 70, bottom: 60, left: 70 },
      line1Label: 'Tasks',
      line2Label: 'Time (h)',
      showArea: true
    });

    const root = document.createElement('div');
    root.id = 'sm-dashboard';
    root.setAttribute('data-theme', theme);

    root.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        :root {
          --bg-primary: #0a0a0a;
          --bg-secondary: #141414;
          --bg-tertiary: #1e1e1e;
          --bg-elevated: #282828;
          --bg-hover: #323232;
          --border-subtle: rgba(255, 255, 255, 0.05);
          --border-default: rgba(255, 255, 255, 0.08);
          --border-strong: rgba(255, 255, 255, 0.12);
          --text-primary: #FFFFFF;
          --text-secondary: #B0B0B0;
          --text-tertiary: #707070;
          --accent: #6366F1;
          --accent-hover: #7C3AED;
          --accent-subtle: rgba(99, 102, 241, 0.08);
          --accent-border: rgba(99, 102, 241, 0.25);
          --success: #10B981;
          --success-subtle: rgba(16, 185, 129, 0.08);
          --warning: #F59E0B;
          --warning-subtle: rgba(245, 158, 11, 0.08);
          --danger: #EF4444;
          --transition: 180ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        #sm-dashboard[data-theme="light"] {
          --bg-primary: #FFFFFF;
          --bg-secondary: #F8F9FA;
          --bg-tertiary: #F1F3F5;
          --bg-elevated: #E9ECEF;
          --bg-hover: #DEE2E6;
          --border-subtle: rgba(0, 0, 0, 0.06);
          --border-default: rgba(0, 0, 0, 0.1);
          --border-strong: rgba(0, 0, 0, 0.15);
          --text-primary: #212529;
          --text-secondary: #495057;
          --text-tertiary: #868E96;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

        #sm-dashboard {
          position: fixed;
          inset: 0;
          z-index: 999999;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }

        .dashboard-layout {
          display: flex;
          height: 100vh;
        }

        /* SIDEBAR */
        .sidebar {
          width: 260px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-header {
          padding: 18px 16px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent), #8b5cf6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .logo-text h1 {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
        }

        .logo-text p {
          font-size: 10px;
          color: var(--text-tertiary);
          margin: 2px 0 0 0;
          font-weight: 600;
        }

        .sidebar-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .sidebar-stat {
          padding: 10px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          transition: all var(--transition);
        }

        .sidebar-stat:hover {
          border-color: var(--accent-border);
        }

        .sidebar-stat-label {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-bottom: 3px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .sidebar-stat-value {
          font-size: 17px;
          font-weight: 900;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--bg-elevated);
          border-radius: 2px;
        }

        .nav-section {
          margin-bottom: 18px;
        }

        .nav-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          padding: 0 10px;
          margin-bottom: 6px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
          border: 1px solid transparent;
          user-select: none;
        }

        .nav-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--accent-subtle);
          color: var(--accent);
          border-color: var(--accent-border);
          font-weight: 700;
        }

        .nav-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .nav-badge {
          margin-left: auto;
          padding: 3px 8px;
          background: var(--bg-elevated);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-tertiary);
        }

        .nav-item.active .nav-badge {
          background: var(--accent);
          color: white;
        }

        .sidebar-footer {
          padding: 14px 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--bg-elevated);
          border-radius: 8px;
          font-size: 11px;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--success);
          animation: pulse 2s infinite;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }

        /* MAIN CONTENT */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .top-bar {
          height: 56px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 18px;
          font-weight: 800;
        }

        .top-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition);
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--accent), #8b5cf6);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .content-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .content-area::-webkit-scrollbar {
          width: 8px;
        }

        .content-area::-webkit-scrollbar-thumb {
          background: var(--bg-elevated);
          border-radius: 4px;
        }

        /* Theme Toggle */
        .theme-toggle {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--bg-elevated);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
        }

        .theme-option {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition);
          color: var(--text-tertiary);
        }

        .theme-option:hover {
          color: var(--text-primary);
        }

        .theme-option.active {
          background: linear-gradient(135deg, var(--accent), #8b5cf6);
          color: white;
        }

        /* Comparison Badge */
        .comparison-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          margin-left: 6px;
        }

        .comparison-badge.positive {
          background: var(--success-subtle);
          color: var(--success);
        }

        .comparison-badge.negative {
          background: rgba(239, 68, 68, 0.08);
          color: var(--danger);
        }

        .comparison-badge.neutral {
          background: var(--bg-elevated);
          color: var(--text-tertiary);
        }

        /* HERO STATS */
        .hero-stat {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 20px;
          transition: all var(--transition);
          animation: slideUp 0.3s ease;
          animation-fill-mode: both;
          position: relative;
          overflow: hidden;
        }

        .hero-stat::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--stat-color, var(--accent));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform var(--transition);
        }

        .hero-stat:hover::before {
          transform: scaleX(1);
        }

        .hero-stat:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-default);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .hero-stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .hero-stat-icon {
          font-size: 18px;
          opacity: 0.8;
        }

        .hero-stat-trend {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          background: var(--success-subtle);
          color: var(--success);
        }

        .hero-stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }

        .hero-stat-value {
          font-size: 32px;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1;
          margin-bottom: 10px;
          font-variant-numeric: tabular-nums;
        }

        .hero-stat-meta {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-progress {
          margin-top: 12px;
          height: 5px;
          background: var(--bg-elevated);
          border-radius: 3px;
          overflow: hidden;
        }

        .stat-progress-fill {
          height: 100%;
          background: var(--stat-color, var(--accent));
          border-radius: 3px;
          transition: width 1s ease;
        }

        /* SECTIONS */
        .section {
          background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
          border-radius: 14px;
          margin-bottom: 20px;
          animation: slideUp 0.4s ease;
          overflow: hidden;
        }

        .section-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-tertiary);
        }

        .section-title {
          font-size: 15px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-tertiary);
          background: var(--bg-elevated);
          padding: 5px 10px;
          border-radius: 6px;
        }

        .section-content {
          padding: 20px;
        }

        /* Search Box */
        .search-box {
          position: relative;
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 12px 40px 12px 14px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-subtle);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 600;
          transition: all var(--transition);
          box-sizing: border-box;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-subtle);
        }

        .search-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
          pointer-events: none;
          font-size: 14px;
        }

        /* GRIDS */
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        /* LINE CHART STYLES */
        .line-chart-container {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .line-chart-container svg {
          display: block;
        }

        .chart-dot {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chart-dot:hover {
          r: 8;
          filter: brightness(1.2);
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-color {
          width: 16px;
          height: 4px;
          border-radius: 2px;
        }

        .legend-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        /* Chart Tooltip */
        .chart-tooltip {
          position: absolute;
          background: var(--bg-primary);
          border: 1px solid var(--border-default);
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          min-width: 120px;
        }

        .chart-tooltip.visible {
          opacity: 1;
        }

        .chart-tooltip-title {
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .chart-tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .chart-tooltip-label {
          color: var(--text-secondary);
        }

        .chart-tooltip-value {
          font-weight: 800;
        }

        /* TASKS TABLE - FULL NAMES */
        .tasks-table-container {
          overflow-x: auto;
          max-height: 500px;
          overflow-y: auto;
        }

        .tasks-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .tasks-table thead th {
          padding: 14px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          border-bottom: 2px solid var(--border-default);
          background: var(--bg-tertiary);
          position: sticky;
          top: 0;
          z-index: 10;
          cursor: pointer;
          user-select: none;
          transition: all var(--transition);
        }

        .tasks-table thead th:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .tasks-table thead th.sortable::after {
          content: '⇅';
          margin-left: 6px;
          opacity: 0.3;
          font-size: 10px;
        }

        .tasks-table tbody td {
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
        }

        .tasks-table tbody tr {
          transition: all var(--transition);
        }

        .tasks-table tbody tr:hover {
          background: var(--bg-elevated);
        }

        /* FULL TASK NAME - NO TRUNCATION */
        .task-name-full {
          font-weight: 700;
          color: var(--text-primary);
          word-wrap: break-word;
          word-break: break-word;
          max-width: 350px;
          line-height: 1.4;
        }

        .badge {
          display: inline-flex;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .badge-success {
          background: var(--success-subtle);
          color: var(--success);
        }

        .badge-warning {
          background: var(--warning-subtle);
          color: var(--warning);
        }

        .badge-permanent {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08));
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        /* Insights Panel */
        .insights-panel {
          background: linear-gradient(135deg, var(--accent-subtle), var(--bg-tertiary));
          border: 1px solid var(--accent-border);
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 20px;
        }

        .insights-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .insights-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }

        .insight-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .stat-card {
          padding: 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          transition: all var(--transition);
        }

        .stat-card:hover {
          background: var(--bg-hover);
          border-color: var(--border-default);
          transform: translateY(-2px);
        }

        .stat-card-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }

        .stat-card-value {
          font-size: 26px;
          font-weight: 900;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .stat-card-meta {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .view-content {
          display: none;
        }

        .view-content.active {
          display: block;
        }

        /* Total Commits Badge - Prominent */
        .total-commits-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08));
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          color: var(--warning);
        }

        /* Animation delays */
        .hero-stat:nth-child(1) { animation-delay: 0s; }
        .hero-stat:nth-child(2) { animation-delay: 0.05s; }
        .hero-stat:nth-child(3) { animation-delay: 0.1s; }
        .hero-stat:nth-child(4) { animation-delay: 0.15s; }

        @media (max-width: 1200px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
        }
      </style>

      <div class="dashboard-layout">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <div class="logo-icon">⚡</div>
              <div class="logo-text">
                <h1>Performance Hub</h1>
                <p>v7.3 Line Charts Edition</p>
              </div>
            </div>
            <div class="sidebar-stats">
              <div class="sidebar-stat">
                <div class="sidebar-stat-label">Today</div>
                <div class="sidebar-stat-value" id="sidebar-time-live">${fmt(committed)}</div>
              </div>
              <div class="sidebar-stat">
                <div class="sidebar-stat-label">Tasks</div>
                <div class="sidebar-stat-value" id="sidebar-count-live">${count}</div>
              </div>
            </div>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section">
              <div class="nav-label">Views</div>
              <div class="nav-item active" data-view="overview">
                <span class="nav-icon">📊</span>
                <span>Overview</span>
              </div>
              <div class="nav-item" data-view="analytics">
                <span class="nav-icon">📈</span>
                <span>Analytics</span>
                <span class="nav-badge">${totalDays}d</span>
              </div>
              <div class="nav-item" data-view="tasks">
                <span class="nav-icon">📋</span>
                <span>Tasks</span>
                <span class="nav-badge">${sortedTasks.length}</span>
              </div>
            </div>

            <div class="nav-section">
              <div class="nav-label">Settings</div>
              <div class="nav-item" data-action="reminders">
                <span class="nav-icon">🔔</span>
                <span>Reminders</span>
                <span class="nav-badge">${ReminderSystem.settings.enabled ? 'ON' : 'OFF'}</span>
              </div>
              <div class="nav-item" data-action="targets">
                <span class="nav-icon">🎯</span>
                <span>Targets</span>
                <span class="nav-badge">${customTargets.hours}h</span>
              </div>
              <div class="nav-item" data-action="export">
                <span class="nav-icon">💾</span>
                <span>Export</span>
              </div>
              <div class="nav-item" data-action="reset">
                <span class="nav-icon">🔄</span>
                <span>Reset</span>
              </div>
            </div>
          </nav>

          <div class="sidebar-footer">
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span>Live • All-Time: <strong>${allTimeCommits}</strong> commits</span>
            </div>
          </div>
        </aside>

        <main class="main-content">
          <header class="top-bar">
            <h1 class="page-title" id="page-title-text">Overview</h1>
            <div class="top-actions">
              <div class="theme-toggle">
                <div class="theme-option ${theme === 'dark' ? 'active' : ''}" data-theme="dark">🌙 Dark</div>
                <div class="theme-option ${theme === 'light' ? 'active' : ''}" data-theme="light">☀️ Light</div>
              </div>
              <button class="btn" id="progress-toggle-btn">
                📊 Progress Bar: ${getProgressBarsEnabled() ? 'ON' : 'OFF'}
              </button>
              <button class="btn" id="refresh-btn">🔄 Refresh</button>
              <button class="btn-primary btn" id="close-dashboard">✕ Close</button>
            </div>
          </header>

          <div class="content-area">
            <!-- OVERVIEW VIEW -->
            <div class="view-content active" id="view-overview">
              <!-- SMART INSIGHTS PANEL -->
              ${smartInsights.length > 0 ? `
                <div class="insights-panel">
                  <div class="insights-header">
                    <span style="font-size: 22px;">💡</span>
                    <div class="insights-title">Smart Insights</div>
                  </div>
                  <div class="insights-list">
                    ${smartInsights.slice(0, 3).map(insight => `
                      <div class="insight-item">
                        <span class="insight-icon">✨</span>
                        <span>${sanitizeHTML(insight)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- PRIMARY STATS -->
              <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div class="hero-stat" style="--stat-color: var(--accent);">
                  <div class="hero-stat-header">
                    <span class="hero-stat-icon">⏱️</span>
                    <span class="hero-stat-trend">+${(committed / 3600).toFixed(1)}h</span>
                  </div>
                  <div class="hero-stat-label">Time Today</div>
                  <div class="hero-stat-value" id="hero-time-live">${fmt(committed)}</div>
                  <div class="hero-stat-meta">
                    <span>Target: ${customTargets.hours}h</span>
                    <span style="color: var(--accent); font-weight: 800;">${goalPercent}%</span>
                  </div>
                  <div class="stat-progress">
                    <div class="stat-progress-fill" style="width: ${goalPercent}%;"></div>
                  </div>
                  ${yesterdayTime > 0 ? `
                    <div style="margin-top: 10px; font-size: 10px; color: var(--text-tertiary);">
                      vs Yesterday:
                      <span class="comparison-badge ${committed > yesterdayTime ? 'positive' : committed < yesterdayTime ? 'negative' : 'neutral'}">
                        ${committed > yesterdayTime ? '↑' : committed < yesterdayTime ? '↓' : '='}
                        ${Math.abs(committed - yesterdayTime) > 0 ? fmt(Math.abs(committed - yesterdayTime)) : '0'}
                      </span>
                    </div>
                  ` : ''}
                </div>

                <div class="hero-stat" style="--stat-color: var(--success);">
                  <div class="hero-stat-header">
                    <span class="hero-stat-icon">📋</span>
                    <span class="hero-stat-trend">Today</span>
                  </div>
                  <div class="hero-stat-label">Tasks Committed</div>
                  <div class="hero-stat-value" id="hero-count-live">${count}</div>
                  <div class="hero-stat-meta">
                    <span>${customTargets.count ? `/${customTargets.count}` : 'Count'}</span>
                    <span style="color: var(--success); font-weight: 800;">${countProgress}%</span>
                  </div>
                  <div class="stat-progress">
                    <div class="stat-progress-fill" style="width: ${countProgress}%; background: var(--success);"></div>
                  </div>
                  ${yesterdayCount > 0 ? `
                    <div style="margin-top: 10px; font-size: 10px; color: var(--text-tertiary);">
                      vs Yesterday:
                      <span class="comparison-badge ${count > yesterdayCount ? 'positive' : count < yesterdayCount ? 'negative' : 'neutral'}">
                        ${count > yesterdayCount ? '↑' : count < yesterdayCount ? '↓' : '='}
                        ${Math.abs(count - yesterdayCount)}
                      </span>
                    </div>
                  ` : ''}
                </div>

                <div class="hero-stat" style="--stat-color: var(--warning);">
                  <div class="hero-stat-header">
                    <span class="hero-stat-icon">🎯</span>
                    <span class="hero-stat-trend">Permanent</span>
                  </div>
                  <div class="hero-stat-label">Total Commits Today</div>
                  <div class="hero-stat-value">${permanentTotalCommits}</div>
                  <div class="hero-stat-meta">
                    <span>Never resets manually</span>
                  </div>
                  <div style="margin-top: 10px; font-size: 10px; color: var(--text-tertiary);">
                    Hits: ${permanentHits} • Resets at midnight
                  </div>
                </div>

                <div class="hero-stat" style="--stat-color: #8b5cf6;">
                  <div class="hero-stat-header">
                    <span class="hero-stat-icon">⚡</span>
                    <span class="hero-stat-trend">Avg</span>
                  </div>
                  <div class="hero-stat-label">Task Time</div>
                  <div class="hero-stat-value">${fmt(avgTaskTime).split(':').slice(1).join(':')}</div>
                  <div class="hero-stat-meta">
                    <span>${(avgTaskTime / 60).toFixed(1)} min</span>
                  </div>
                  ${peakHour.tasks > 0 ? `
                    <div style="margin-top: 10px; font-size: 10px; color: var(--text-tertiary);">
                      Peak: ${fmt12Hour(peakHour.hour)}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- BEST PERFORMANCE -->
              ${bestDay ? `
                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                  <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1)); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 32px;">🏆</span>
                    <div>
                      <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase;">Best Day Ever</div>
                      <div style="font-size: 16px; font-weight: 900; color: var(--text-primary); margin-top: 4px;">${bestDayFormatted}</div>
                    </div>
                  </div>
                  ${weekComparison != 0 ? `
                    <div style="flex: 1; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 12px; display: flex; align-items: center; gap: 14px;">
                      <span style="font-size: 32px;">${parseFloat(weekComparison) > 0 ? '📈' : '📉'}</span>
                      <div>
                        <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase;">This Week vs Last</div>
                        <div style="font-size: 16px; font-weight: 900; color: ${parseFloat(weekComparison) > 0 ? 'var(--success)' : 'var(--danger)'}; margin-top: 4px;">
                          ${parseFloat(weekComparison) > 0 ? '+' : ''}${weekComparison}%
                        </div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- WEEKLY LINE CHART & HOURLY -->
              <div class="grid-2">
                <!-- WEEKLY DUAL-AXIS LINE CHART -->
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">
                      <span>📈</span>
                      <span>Weekly Trend</span>
                    </div>
                    <div class="section-badge">${thisWeekTotal} tasks • ${fmt(thisWeekTime).split(':').slice(0, 2).join(':')} time</div>
                  </div>
                  <div class="section-content">
                    ${last7Days.some(d => d.count > 0 || d.time > 0) ? `
                      <div class="line-chart-container" id="weekly-chart-container">
                        ${weeklyLineChart}
                        <div class="chart-tooltip" id="weekly-chart-tooltip">
                          <div class="chart-tooltip-title"></div>
                          <div class="chart-tooltip-row">
                            <span class="chart-tooltip-label">Tasks:</span>
                            <span class="chart-tooltip-value" style="color: #6366f1;"></span>
                          </div>
                          <div class="chart-tooltip-row">
                            <span class="chart-tooltip-label">Time:</span>
                            <span class="chart-tooltip-value" style="color: #10b981;"></span>
                          </div>
                        </div>
                      </div>
                      <div class="chart-legend">
                        <div class="legend-item">
                          <div class="legend-color" style="background: #6366f1;"></div>
                          <span class="legend-label">Tasks</span>
                        </div>
                        <div class="legend-item">
                          <div class="legend-color" style="background: #10b981;"></div>
                          <span class="legend-label">Time (hours)</span>
                        </div>
                      </div>
                    ` : `
                      <div style="padding: 60px; text-align: center; color: var(--text-tertiary);">
                        <div style="font-size: 56px; margin-bottom: 14px; opacity: 0.3;">📈</div>
                        <div style="font-size: 15px; font-weight: 700;">No data this week</div>
                      </div>
                    `}
                  </div>
                </div>

                <!-- HOURLY ACTIVITY -->
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">
                      <span>🕐</span>
                      <span>Hourly Activity</span>
                    </div>
                    <div class="section-badge">${activeHours.length} active hours</div>
                  </div>
                  <div class="section-content">
                    ${activeHours.length > 0 ? `
                      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px;">
                        ${activeHours.map(h => {
                          const maxTasks = Math.max(...activeHours.map(d => d.tasks), 1);
                          const intensity = Math.min(4, Math.ceil((h.tasks / maxTasks) * 4));
                          const bgColors = [
                            'rgba(100, 116, 139, 0.1)',
                            'rgba(59, 130, 246, 0.2)',
                            'rgba(99, 102, 241, 0.35)',
                            'rgba(139, 92, 246, 0.5)',
                            'rgba(168, 85, 247, 0.7)'
                          ];
                          return `
                            <div style="padding: 14px; background: ${bgColors[intensity]}; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle); transition: all 0.3s; cursor: pointer;"
                                 title="${fmt12Hour(h.hour)}: ${h.tasks} tasks, ${fmt(h.time)}">
                              <div style="font-size: 14px; font-weight: 900; color: var(--text-primary);">${fmt12Hour(h.hour)}</div>
                              <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-top: 4px;">${h.tasks} tasks</div>
                              <div style="font-size: 10px; font-weight: 600; color: var(--text-tertiary); margin-top: 2px;">${fmt(h.time).split(':').slice(0,2).join(':')}</div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    ` : `
                      <div style="padding: 60px; text-align: center; color: var(--text-tertiary);">
                        <div style="font-size: 56px; margin-bottom: 14px; opacity: 0.3;">🕐</div>
                        <div style="font-size: 15px; font-weight: 700;">No activity today</div>
                      </div>
                    `}
                  </div>
                </div>
              </div>

              <!-- TODAY'S TASKS TABLE WITH PERMANENT COMMITS -->
              <div class="section">
                <div class="section-header">
                  <div class="section-title">
                    <span>📋</span>
                    <span>Today's Tasks</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="total-commits-badge">
                      <span>🎯</span>
                      <span>Total Commits: ${permanentTotalCommits}</span>
                    </div>
                    <div class="section-badge">${sortedTasks.length} tasks</div>
                  </div>
                </div>
                <div class="section-content">
                  ${sortedTasks.length > 0 ? `
                    <div class="search-box">
                      <input type="text" class="search-input" id="task-search" placeholder="Search tasks...">
                      <span class="search-icon">🔍</span>
                    </div>
                    <div class="tasks-table-container">
                      <table class="tasks-table" id="tasks-table">
                        <thead>
                          <tr>
                            <th class="sortable" data-sort="name" style="width: 35%;">Task Name (Full)</th>
                            <th class="sortable" data-sort="permanentCommits" style="width: 13%; text-align: center;">Total Commits ⭐</th>
                            <th class="sortable" data-sort="time" style="width: 13%;">Total Time</th>
                            <th class="sortable" data-sort="avgDuration" style="width: 13%;">Avg Duration</th>
                            <th class="sortable" data-sort="successRate" style="width: 13%;">Success Rate</th>
                            <th class="sortable" data-sort="submitted" style="width: 13%; text-align: center;">Session Commits</th>
                          </tr>
                        </thead>
                        <tbody id="tasks-tbody">
                          ${sortedTasks.map(task => `
                            <tr data-task-name="${sanitizeHTML(task.taskName.toLowerCase())}">
                              <td>
                                <div class="task-name-full">${sanitizeHTML(task.taskName)}</div>
                              </td>
                              <td style="text-align: center;" data-value="${task.permanentCommits}">
                                <span class="badge badge-permanent">🏆 ${task.permanentCommits}</span>
                              </td>
                              <td style="font-weight: 700; color: var(--accent);" data-value="${task.totalTime}">${fmt(task.totalTime)}</td>
                              <td style="font-weight: 700;" data-value="${task.avgDuration}">${fmt(task.avgDuration).split(':').slice(1).join(':')}</td>
                              <td data-value="${task.successRate}">
                                <span style="color: ${task.successRate >= 80 ? 'var(--success)' : task.successRate >= 50 ? 'var(--warning)' : 'var(--danger)'}; font-weight: 800;">
                                  ${task.successRate}%
                                </span>
                              </td>
                              <td style="text-align: center;" data-value="${task.submitted}">
                                <span class="badge badge-success">✓ ${task.submitted}</span>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                    <div style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 11px; color: var(--text-tertiary);">
                      <strong>💡 Note:</strong> "Total Commits" column shows permanent count that only resets at midnight, not affected by manual reset. "Session Commits" may differ after manual reset.
                    </div>
                  ` : `
                    <div style="padding: 60px; text-align: center; color: var(--text-tertiary);">
                      <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">📋</div>
                      <div style="font-size: 17px; font-weight: 800; color: var(--text-secondary); margin-bottom: 8px;">No tasks yet</div>
                      <div style="font-size: 13px;">Complete your first task to see it here</div>
                    </div>
                  `}
                </div>
              </div>
            </div>

            <!-- ANALYTICS VIEW -->
            <div class="view-content" id="view-analytics">
              <!-- 30-DAY DUAL-AXIS LINE CHART -->
              <div class="section">
                <div class="section-header">
                  <div class="section-title">
                    <span>📈</span>
                    <span>30-Day Performance Trend</span>
                  </div>
                  <div class="section-badge">${last30Days.reduce((sum, d) => sum + d.count, 0)} total tasks • ${fmt(last30Days.reduce((sum, d) => sum + d.time, 0)).split(':').slice(0,2).join(':')} total time</div>
                </div>
                <div class="section-content">
                  ${last30Days.some(d => d.count > 0 || d.time > 0) ? `
                    <div class="line-chart-container" id="monthly-chart-container">
                      ${monthlyLineChart}
                      <div class="chart-tooltip" id="monthly-chart-tooltip">
                        <div class="chart-tooltip-title"></div>
                        <div class="chart-tooltip-row">
                          <span class="chart-tooltip-label">Tasks:</span>
                          <span class="chart-tooltip-value" style="color: #6366f1;"></span>
                        </div>
                        <div class="chart-tooltip-row">
                          <span class="chart-tooltip-label">Time:</span>
                          <span class="chart-tooltip-value" style="color: #10b981;"></span>
                        </div>
                      </div>
                    </div>
                    <div class="chart-legend">
                      <div class="legend-item">
                        <div class="legend-color" style="background: #6366f1;"></div>
                        <span class="legend-label">Tasks (Left Axis)</span>
                      </div>
                      <div class="legend-item">
                        <div class="legend-color" style="background: #10b981;"></div>
                        <span class="legend-label">Time in Hours (Right Axis)</span>
                      </div>
                    </div>
                    <!-- Summary Stats -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px;">
                      <div style="text-align: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <div style="font-size: 24px; font-weight: 900; color: var(--accent);">${last30Days.reduce((sum, d) => sum + d.count, 0)}</div>
                        <div style="font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Total Tasks</div>
                      </div>
                      <div style="text-align: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <div style="font-size: 24px; font-weight: 900; color: var(--success);">${fmt(last30Days.reduce((sum, d) => sum + d.time, 0)).split(':').slice(0,2).join(':')}</div>
                        <div style="font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Total Time</div>
                      </div>
                      <div style="text-align: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <div style="font-size: 24px; font-weight: 900; color: var(--warning);">${Math.round(last30Days.reduce((sum, d) => sum + d.count, 0) / 30)}</div>
                        <div style="font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Daily Avg Tasks</div>
                      </div>
                      <div style="text-align: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <div style="font-size: 24px; font-weight: 900; color: #8b5cf6;">${last30Days.filter(d => d.count > 0).length}</div>
                        <div style="font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Active Days</div>
                      </div>
                    </div>
                  ` : `
                    <div style="padding: 100px; text-align: center; color: var(--text-tertiary);">
                      <div style="font-size: 80px; margin-bottom: 20px; opacity: 0.3;">📈</div>
                      <div style="font-size: 20px; font-weight: 800; color: var(--text-secondary); margin-bottom: 10px;">No data yet</div>
                      <div style="font-size: 14px;">Complete tasks to see your 30-day trend</div>
                    </div>
                  `}
                </div>
              </div>

              <!-- Performance Stats -->
              <div class="section">
                <div class="section-header">
                  <div class="section-title">
                    <span>📊</span>
                    <span>Performance Overview</span>
                  </div>
                </div>
                <div class="section-content">
                  <div class="grid-4">
                    <div class="stat-card">
                      <div class="stat-card-label">Total Days Tracked</div>
                      <div class="stat-card-value">${totalDays}</div>
                      <div class="stat-card-meta">Since first use</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-card-label">Total Time Worked</div>
                      <div class="stat-card-value">${fmt(totalAllTime).split(':').slice(0, 2).join(':')}</div>
                      <div class="stat-card-meta">${(totalAllTime / 3600).toFixed(1)} hours</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-card-label">Daily Average</div>
                      <div class="stat-card-value">${fmt(avgDailyTime).split(':').slice(0, 2).join(':')}</div>
                      <div class="stat-card-meta">${(avgDailyTime / 3600).toFixed(1)}h per day</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-card-label">Avg Task Duration</div>
                      <div class="stat-card-value">${fmt(avgTaskDuration).split(':').slice(1).join(':')}</div>
                      <div class="stat-card-meta">${(avgTaskDuration / 60).toFixed(1)} minutes</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Today's & All-Time Stats -->
              <div class="grid-2">
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">
                      <span>📅</span>
                      <span>Today's Breakdown</span>
                    </div>
                  </div>
                  <div class="section-content">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">✅ Submitted</span>
                        <span style="color: var(--success); font-weight: 900; font-size: 20px;">${todaySubmitted}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">⏭️ Skipped</span>
                        <span style="color: var(--warning); font-weight: 900; font-size: 20px;">${todaySkipped}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">⏰ Expired</span>
                        <span style="color: var(--danger); font-weight: 900; font-size: 20px;">${todayExpired}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: linear-gradient(135deg, var(--accent-subtle), var(--bg-tertiary)); border-radius: 10px; border: 1px solid var(--accent-border);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">📈 Success Rate</span>
                        <span style="color: var(--accent); font-weight: 900; font-size: 20px;">${todaySuccessRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-header">
                    <div class="section-title">
                      <span>📊</span>
                      <span>All-Time Stats</span>
                    </div>
                  </div>
                  <div class="section-content">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">This Week Tasks</span>
                        <span style="color: var(--success); font-weight: 900; font-size: 20px;">${thisWeekTotal}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">This Week Time</span>
                        <span style="color: var(--accent); font-weight: 900; font-size: 20px;">${fmt(thisWeekTime).split(':').slice(0,2).join(':')}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">Total Sessions</span>
                        <span style="color: var(--text-primary); font-weight: 900; font-size: 20px;">${sessions.length}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), var(--bg-tertiary)); border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.3);">
                        <span style="color: var(--text-secondary); font-size: 14px; font-weight: 700;">All-Time Commits</span>
                        <span style="color: var(--warning); font-weight: 900; font-size: 20px;">${allTimeCommits}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TASKS VIEW - FULL NAMES WITH PERMANENT COMMITS -->
            <div class="view-content" id="view-tasks">
              <div class="section">
                <div class="section-header">
                  <div class="section-title">
                    <span>📋</span>
                    <span>All Tasks (Full Names)</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="total-commits-badge">
                      <span>🏆</span>
                      <span>Total Commits: ${permanentTotalCommits}</span>
                    </div>
                    <div class="section-badge">${sortedTasks.length} unique tasks</div>
                  </div>
                </div>
                <div class="section-content">
                  ${sortedTasks.length > 0 ? `
                    <div class="search-box">
                      <input type="text" class="search-input" id="all-task-search" placeholder="Search all tasks...">
                      <span class="search-icon">🔍</span>
                    </div>
                    <div class="tasks-table-container">
                      <table class="tasks-table" id="all-tasks-table">
                        <thead>
                          <tr>
                            <th class="sortable" data-sort="name" style="width: 30%;">Task Name (Full Queue Name)</th>
                            <th class="sortable" data-sort="permanentCommits" style="width: 12%; text-align: center;">Total Commits ⭐</th>
                            <th class="sortable" data-sort="time" style="width: 12%;">Total Time</th>
                            <th class="sortable" data-sort="avgDuration" style="width: 12%;">Avg Duration</th>
                            <th class="sortable" data-sort="sessions" style="width: 10%;">Sessions</th>
                            <th class="sortable" data-sort="successRate" style="width: 12%;">Success Rate</th>
                            <th class="sortable" data-sort="submitted" style="width: 12%; text-align: center;">Session Commits</th>
                          </tr>
                        </thead>
                        <tbody id="all-tasks-tbody">
                          ${sortedTasks.map(task => `
                            <tr data-task-name="${sanitizeHTML(task.taskName.toLowerCase())}">
                              <td>
                                <div class="task-name-full">${sanitizeHTML(task.taskName)}</div>
                              </td>
                              <td style="text-align: center;" data-value="${task.permanentCommits}">
                                <span class="badge badge-permanent">🏆 ${task.permanentCommits}</span>
                              </td>
                              <td style="font-weight: 800; color: var(--accent);" data-value="${task.totalTime}">${fmt(task.totalTime)}</td>
                              <td style="font-weight: 700;" data-value="${task.avgDuration}">${fmt(task.avgDuration).split(':').slice(1).join(':')}</td>
                              <td style="font-weight: 700;" data-value="${task.totalSessions}">${task.totalSessions}</td>
                              <td data-value="${task.successRate}">
                                <span style="color: ${task.successRate >= 80 ? 'var(--success)' : task.successRate >= 50 ? 'var(--warning)' : 'var(--danger)'}; font-weight: 800;">
                                  ${task.successRate}%
                                </span>
                              </td>
                              <td style="text-align: center;" data-value="${task.submitted}">
                                <span class="badge badge-success">✓ ${task.submitted}</span>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                    <div style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 11px; color: var(--text-tertiary);">
                      <strong>💡 Note:</strong> "Total Commits" (⭐) is a permanent counter that only resets at midnight. It is NOT affected by manual reset. This gives you accurate daily totals even if you reset during the day.
                    </div>
                  ` : `
                    <div style="padding: 80px; text-align: center; color: var(--text-tertiary);">
                      <div style="font-size: 80px; margin-bottom: 20px; opacity: 0.3;">📋</div>
                      <div style="font-size: 20px; font-weight: 800; color: var(--text-secondary); margin-bottom: 10px;">No tasks yet</div>
                      <div style="font-size: 14px;">Complete your first task to see it here</div>
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    document.body.appendChild(root);

    // ============================================================================
    // 🎯 DASHBOARD EVENT HANDLERS
    // ============================================================================

    // Setup chart tooltip interactions
    function setupChartTooltips(containerId, tooltipId, chartData) {
      const container = root.querySelector(`#${containerId}`);
      const tooltip = root.querySelector(`#${tooltipId}`);
      if (!container || !tooltip) return;

      const dots = container.querySelectorAll('.chart-dot');
      dots.forEach((dot, index) => {
        dot.addEventListener('mouseenter', (e) => {
          const dataIndex = parseInt(dot.getAttribute('data-index'));
          const data = chartData[dataIndex];
          if (!data) return;

          tooltip.querySelector('.chart-tooltip-title').textContent = data.label;
          tooltip.querySelectorAll('.chart-tooltip-value')[0].textContent = data.value1;
          tooltip.querySelectorAll('.chart-tooltip-value')[1].textContent = data.value2.toFixed(2) + 'h';

          const rect = dot.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          tooltip.style.left = (rect.left - containerRect.left + rect.width / 2 - 60) + 'px';
          tooltip.style.top = (rect.top - containerRect.top - 80) + 'px';
          tooltip.classList.add('visible');
        });

        dot.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });
      });
    }

    // Setup tooltips for both charts
    if (last7Days.some(d => d.count > 0 || d.time > 0)) {
      setupChartTooltips('weekly-chart-container', 'weekly-chart-tooltip', weeklyChartData);
    }
    if (last30Days.some(d => d.count > 0 || d.time > 0)) {
      setupChartTooltips('monthly-chart-container', 'monthly-chart-tooltip', monthlyChartData);
    }

    // Live update function
    function updateLiveData() {
      let currentCommitted, currentCount;

      // Read directly during/after reset
      if (forceResetActive || resetInProgress) {
        try {
          const rawCommitted = localStorage.getItem(KEYS.DAILY_COMMITTED);
          const rawCount = localStorage.getItem(KEYS.COUNT);
          currentCommitted = rawCommitted ? parseInt(rawCommitted) : 0;
          currentCount = rawCount ? parseInt(rawCount) : 0;
        } catch (e) {
          currentCommitted = 0;
          currentCount = 0;
        }
      } else {
        currentCommitted = retrieveNumber(KEYS.DAILY_COMMITTED, 0);
        currentCount = retrieveNumber(KEYS.COUNT, 0);
      }

      const timeStr = fmt(currentCommitted);

      const sidebarTime = document.getElementById('sidebar-time-live');
      const heroTime = document.getElementById('hero-time-live');
      const heroCount = document.getElementById('hero-count-live');
      const sidebarCount = document.getElementById('sidebar-count-live');

      if (sidebarTime) sidebarTime.textContent = timeStr;
      if (heroTime) heroTime.textContent = timeStr;
      if (heroCount) heroCount.textContent = currentCount;
      if (sidebarCount) sidebarCount.textContent = currentCount;
    }

    const liveUpdateInterval = setInterval(updateLiveData, 1000);
    updateLiveData();

    // Theme toggle
    root.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', function() {
        const newTheme = this.getAttribute('data-theme');
        root.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        ThemeManager.setTheme(newTheme);
        root.setAttribute('data-theme', newTheme);
        log(`🎨 Theme changed to: ${newTheme}`);
      });
    });

    // Search functionality
    function setupSearch(searchInputId, tableBodyId) {
      const searchInput = root.querySelector(`#${searchInputId}`);
      const tableBody = root.querySelector(`#${tableBodyId}`);

      if (!searchInput || !tableBody) return;

      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = tableBody.querySelectorAll('tr');

        rows.forEach(row => {
          const taskName = row.getAttribute('data-task-name');
          if (taskName && taskName.includes(searchTerm)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    setupSearch('task-search', 'tasks-tbody');
    setupSearch('all-task-search', 'all-tasks-tbody');

    // Sortable table functionality
    function setupSortableTable(tableId) {
      const table = root.querySelector(`#${tableId}`);
      if (!table) return;

      const headers = table.querySelectorAll('thead th.sortable');
      let currentSort = { column: null, direction: 'asc' };

      headers.forEach((header, colIndex) => {
        header.addEventListener('click', function() {
          const sortKey = this.getAttribute('data-sort');
          const tbody = table.querySelector('tbody');
          const rows = Array.from(tbody.querySelectorAll('tr'));

          if (currentSort.column === sortKey) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.column = sortKey;
            currentSort.direction = 'desc';
          }

          headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
          this.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

          rows.sort((a, b) => {
            let aVal, bVal;

            if (sortKey === 'name') {
              aVal = a.getAttribute('data-task-name') || '';
              bVal = b.getAttribute('data-task-name') || '';
              return currentSort.direction === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
            } else {
              const aCells = a.querySelectorAll('td');
              const bCells = b.querySelectorAll('td');

              // Find the cell with the matching data-value attribute
              for (let i = 0; i < aCells.length; i++) {
                if (aCells[i].hasAttribute('data-value')) {
                  const cellSort = headers[i]?.getAttribute('data-sort');
                  if (cellSort === sortKey) {
                    aVal = parseFloat(aCells[i].getAttribute('data-value')) || 0;
                    break;
                  }
                }
              }
              for (let i = 0; i < bCells.length; i++) {
                if (bCells[i].hasAttribute('data-value')) {
                  const cellSort = headers[i]?.getAttribute('data-sort');
                  if (cellSort === sortKey) {
                    bVal = parseFloat(bCells[i].getAttribute('data-value')) || 0;
                    break;
                  }
                }
              }

              aVal = aVal || 0;
              bVal = bVal || 0;

              return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
          });

          rows.forEach(row => tbody.appendChild(row));
        });
      });
    }

    setupSortableTable('tasks-table');
    setupSortableTable('all-tasks-table');

    // Navigation
    root.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', function() {
        const viewId = this.getAttribute('data-view');

        root.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');

        root.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));
        const targetView = root.querySelector(`#view-${viewId}`);
        if (targetView) targetView.classList.add('active');

        const titleMap = {
          'overview': 'Overview',
          'analytics': 'Analytics',
          'tasks': 'Tasks'
        };
        const titleEl = document.getElementById('page-title-text');
        if (titleEl) titleEl.textContent = titleMap[viewId] || 'Dashboard';
      });
    });

    // Actions
    root.querySelectorAll('.nav-item[data-action]').forEach(item => {
      item.addEventListener('click', function() {
        const action = this.getAttribute('data-action');

        switch(action) {
          case 'reminders':
            ReminderSystem.showSettingsDialog();
            break;
          case 'targets':
            showTargetDialog();
            break;
          case 'export':
            showExportDialog();
            break;
          case 'reset':
            showResetDialog();
            break;
        }
      });
    });

    // Progress toggle button
    root.querySelector('#progress-toggle-btn').addEventListener('click', () => {
      toggleProgressBars();
      const btn = root.querySelector('#progress-toggle-btn');
      if (btn) btn.textContent = `📊 Progress Bar: ${getProgressBarsEnabled() ? 'ON' : 'OFF'}`;
    });

    // Refresh button
    root.querySelector('#refresh-btn').addEventListener('click', () => {
      clearInterval(liveUpdateInterval);
      root.remove();
      setTimeout(() => showDashboard(), 100);
    });

    // Close dashboard
    root.querySelector('#close-dashboard').addEventListener('click', () => {
      clearInterval(liveUpdateInterval);
      root.remove();
    });

    // ESC handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        // Don't close if other dialogs are open
        if (document.getElementById('sm-reset-dialog') ||
            document.getElementById('sm-target-dialog') ||
            document.getElementById('sm-reminder-settings-dialog') ||
            document.getElementById('sm-export-dialog') ||
            document.getElementById('task-name-modal')) {
          return;
        }

        clearInterval(liveUpdateInterval);
        root.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    log("✅ Dashboard v7.3 with Dual-Axis Line Charts rendered successfully!");
  }

  // ============================================================================
  // 🔄 TRACKING LOOP
  // ============================================================================
  let lastAWSData = null;

  function trackOnce() {
    if (forceResetActive || resetInProgress || isResetting || manualResetJustHappened) {
      return;
    }

    try {
      checkDailyReset();

      const onTaskPage = isTaskPage();

      updateDisplayVisibilitySafe();

      if (!onTaskPage) {
        updateHomeDisplay();
        return;
      }

      if (hasTaskExpiredOnPage()) {
        log("⏰ Task expired");
        if (activeTask) discardActiveTask("expired");
        else setIgnoreTask(getTaskIdFromUrl());
        updateDisplay();
        return;
      }

      const awsData = parseAWSTimer();
      const ignoreId = getIgnoreTask();
      const currentPageId = getTaskIdFromUrl();

      if (CONFIG.FIX_IGNORE_LOOP && ignoreId && ignoreId === currentPageId) {
        if (lastAWSData && awsData && awsData.current < lastAWSData.current) {
          setIgnoreTask(null);
          log("🔄 Timer reset detected");
        } else {
          lastAWSData = awsData || lastAWSData;
          return;
        }
      }

      if (!awsData) {
        lastAWSData = null;
        return;
      }

      DelayAccumulator.updateLastPoll(awsData.current);

      if (!activeTask || activeTask.id !== currentPageId) {
        startNewTaskFromAWS(awsData);
      } else {
        updateActiveTaskFromAWS(awsData);
      }

      if (typeof awsData.limit === "number" && awsData.current >= awsData.limit) {
        log("⏰ Time limit reached");
        discardActiveTask("expired");
      }

      lastAWSData = awsData;
      updateDisplay();

    } catch (e) {
      log("❌ trackOnce error:", e);
      if (window.SmartEngine) SmartEngine.handleError(e, 'track_once');
    }
  }

  // ============================================================================
  // 🔧 RESTORE ACTIVE TASK
  // ============================================================================
  function restoreActiveTask() {
    if (!CONFIG.FIX_REFRESH_LOSS) return;

    const savedTask = retrieve(KEYS.ACTIVE_TASK);
    if (!savedTask || !savedTask.id) return;

    const currentTaskId = getTaskIdFromUrl();

    if (savedTask.id === currentTaskId) {
      activeTask = savedTask;
      log(`🔧 Restored: ${activeTask.taskName}`);

      const awsData = parseAWSTimer();
      if (awsData) {
        activeTask.awsCurrent = awsData.current;
        activeTask.awsLimit = awsData.limit;
        activeTask.lastAws = awsData.current;
        activeTask.lastUpdate = Date.now();
        store(KEYS.ACTIVE_TASK, activeTask);
        log(`✅ Updated: ${fmt(awsData.current)}`);
      }
    } else {
      store(KEYS.ACTIVE_TASK, null);
    }
  }

  // ============================================================================
  // 💾 AUTO-BACKUP
  // ============================================================================
  function setupAutoBackup() {
    const performBackup = () => {
      const lastBackup = retrieve(KEYS.LAST_BACKUP);
      const now = Date.now();

      if (!lastBackup || (now - new Date(lastBackup).getTime()) > CONFIG.AUTO_BACKUP_INTERVAL) {
        const backup = {
          timestamp: new Date().toISOString(),
          data: {
            history: retrieve(KEYS.HISTORY, {}),
            sessions: retrieve(KEYS.SESSIONS, []).slice(0, 200),
            analytics: retrieve(KEYS.ANALYTICS, {}),
            daily_committed: retrieveNumber(KEYS.DAILY_COMMITTED, 0),
            count: retrieveNumber(KEYS.COUNT, 0),
            total_commits_alltime: retrieveNumber(KEYS.TOTAL_COMMITS_ALLTIME, 0),
            permanent_daily_hits: getPermanentDailyHits(),
            permanent_task_commits: retrieve(KEYS.PERMANENT_TASK_COMMITS, {}),
            delay_stats: DelayAccumulator.dailyStats,
            reminder_settings: ReminderSystem.settings,
            reminder_stats: ReminderSystem.stats
          }
        };

        try {
          storeCompressed('sm_auto_backup', backup);
          store(KEYS.LAST_BACKUP, backup.timestamp);
          log('💾 Auto-backup done');
        } catch (e) {
          log('❌ Backup failed', e);
        }
      }
    };

    setInterval(performBackup, 60 * 60 * 1000);
    setTimeout(performBackup, 5000);
  }

  // ============================================================================
  // ⌨️ KEYBOARD SHORTCUTS
  // ============================================================================
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey) {
      switch(e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          showDashboard();
          break;
        case 'r':
          e.preventDefault();
          showResetDialog();
          break;
        case 'e':
          e.preventDefault();
          showExportDialog();
          break;
        case 'n':
          e.preventDefault();
          ReminderSystem.showSettingsDialog();
          break;
        case 't':
          e.preventDefault();
          showTargetDialog();
          break;
      }
    }
  });

  // ============================================================================
  // 🚀 INITIALIZATION
  // ============================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 SageMaker ULTIMATE v7.3 - DUAL-AXIS LINE CHARTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ KEY FEATURES IN v7.3:");
  console.log("  • 📈 Dual-Axis Line Charts (Tasks & Time)");
  console.log("  • 🏆 Permanent Task Commits Counter");
  console.log("  • 🔄 PERFECT Manual Reset (100% Working)");
  console.log("  • 📋 Full Task Names (No Truncation)");
  console.log("  • 🎯 Total Commits in Tasks Table");
  console.log("  • 🛡️ Smart Engine Reset Protection");
  console.log("  • 🎨 Theme Sync Across All Popups");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  checkDailyReset();
  scheduleMidnightReset();
  initSubmissionInterceptor();
  setupAutoBackup();
  MultiTabSync.setupStorageListener();

  // Clear manual reset tracker for new day on startup
  ManualResetTracker.clearForNewDay();

  setTimeout(() => {
    restoreActiveTask();
    updateDisplay();
    updateHomeDisplay();
    tryAttachToFooter();

    currentPageState = null;
    updateDisplayVisibilitySafe();

    LiveSession.start();
    AchievementSystem.updateStreaks();

    applyProgressBarVisibility();

    const dashBtn = document.getElementById('sm-dashboard-btn');
    if (dashBtn) {
      dashBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        log("📊 Dashboard clicked");
        try {
          showDashboard();
        } catch (error) {
          console.error("Dashboard error:", error);
          alert("Dashboard error: " + error.message);
        }
      };
      log("✅ Dashboard button ready");
    }

    log("✅ All systems ready!");
  }, 100);

  trackingIntervalId = setInterval(() => {
    trackOnce();
  }, CONFIG.CHECK_INTERVAL_MS);

  const buttonsObserver = new MutationObserver(wireTaskActionButtons);
  buttonsObserver.observe(document.body, { childList: true, subtree: true });

  console.log("");
  console.log("✅ ULTIMATE v7.3 - FULLY READY!");
  console.log("🎉 Created by PVSANKAR");
  console.log("📈 Charts: DUAL-AXIS LINE CHARTS");
  console.log("🔄 Manual Reset: PERFECT (Smart Engine Bypass)");
  console.log("📋 Full Task Names: YES");
  console.log("🏆 Permanent Task Commits: ENABLED");
  console.log("🎯 Total Commits in Table: YES");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 CURRENT STATUS:");
  console.log("  Daily Committed: " + fmt(retrieveNumber(KEYS.DAILY_COMMITTED, 0)));
  console.log("  Task Count: " + retrieveNumber(KEYS.COUNT, 0));
  console.log("  Permanent Hits: " + getPermanentDailyHits());
  console.log("  Permanent Commits: " + PermanentTaskCommits.getTotalCommits());
  console.log("  All-Time Commits: " + retrieveNumber(KEYS.TOTAL_COMMITS_ALLTIME, 0));
  console.log("  Theme: " + ThemeManager.getTheme().toUpperCase());
  console.log("  Reminders: " + (ReminderSystem.settings.enabled ? "✅ ENABLED" : "🔴 DISABLED"));
  console.log("  Manual Reset Today: " + (ManualResetTracker.wasResetToday() ? "YES" : "NO"));
  console.log("  Multi-Tab Sync: ✅ ACTIVE");
  console.log("  Smart Engine: ✅ RUNNING (Reset Protected)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("⌨️ KEYBOARD SHORTCUTS:");
  console.log("  Ctrl+Shift+U - Open Dashboard");
  console.log("  Ctrl+Shift+N - Reminder Settings");
  console.log("  Ctrl+Shift+R - Reset Dialog");
  console.log("  Ctrl+Shift+E - Export Dialog");
  console.log("  Ctrl+Shift+T - Target Settings");
  console.log("  Ctrl+Shift+P - Easter Egg");
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("   🚀 v7.3 ULTIMATE - DUAL-AXIS LINE CHARTS READY! 🚀   ");
  console.log("═══════════════════════════════════════════════════");

})();
