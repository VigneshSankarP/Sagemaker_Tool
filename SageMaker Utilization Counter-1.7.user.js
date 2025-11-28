// ==UserScript==
// @name         Sagemaker Utilization Counter
// @namespace    http://tampermonkey.net/
// @version      5
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

  console.log("🚀 SageMaker ULTIMATE AI v5.0.0 initializing...");

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
  // ⚙️ CONFIGURATION - ULTIMATE SETTINGS
  // ============================================================================
  const CONFIG = {
    CHECK_INTERVAL_MS: 500,
    DAILY_ALERT_HOURS: 8,
    MAX_HISTORY_DAYS: 30,
    DEBUG: true,
    SESSIONS_LIMIT: 2000,
    ENABLE_ANALYTICS: true,
    AUTO_BACKUP_INTERVAL: 24 * 60 * 60 * 1000,

    // 🎯 CORE: Only submitted tasks count
    COUNTING_MODE: "submitted_only",

    // 🤖 AI - FULL SUITE ENABLED
    AI_ENABLED: true,
    AI_CHECK_INTERVAL: 5000,
    AI_LEARNING_ENABLED: true,
    AI_PROTECTION_ENABLED: true,
    AI_SUGGESTIONS_ENABLED: true,
    AI_AUTO_FIX_ENABLED: true,
    AI_ANOMALY_THRESHOLD: 0.7,
    AI_PREDICTION_ENABLED: true,
    AI_OPTIMIZATION_ENABLED: true,
    AI_REAL_TIME_VALIDATION: true,
    AI_PREDICTIVE_FAILURE: true,
    AI_SELF_HEALING: true,
    AI_PERFORMANCE_MONITOR: true,
    AI_STABILITY_CHECKS: true,
    AI_RELIABILITY_SCORING: true,

    // 🔧 ALL BUG FIXES ENABLED
    FIX_REFRESH_LOSS: true,
    FIX_DETECTION: true,
    FIX_IGNORE_LOOP: true,
    FIX_PARSING: true,
    FIX_RACE_CONDITIONS: true,
    FIX_MIDNIGHT: true,
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
    COMMIT_QUEUE: "sm_commit_queue",
    AI_PATTERNS: "sm_ai_patterns",
    AI_PREDICTIONS: "sm_ai_predictions",
    AI_ANOMALIES: "sm_ai_anomalies",
    AI_INSIGHTS: "sm_ai_insights",
    AI_CONFIG: "sm_ai_config",
    AI_PROFILE: "sm_ai_profile",
    AI_STATS: "sm_ai_stats",
    AI_HEALTH: "sm_ai_health",
    AI_PERFORMANCE: "sm_ai_performance",
    AI_ERROR_LOG: "sm_ai_error_log",
    AI_RECOVERY_LOG: "sm_ai_recovery_log",
  };

  let trackingIntervalId = null;

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

        if (window.AI) {
          AI.handleError(error, context);
        }

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
  // 🔧 COMMIT QUEUE SYSTEM - Prevents Race Conditions
  // ============================================================================
  const commitQueue = [];
  let isProcessingQueue = false;

  async function addToCommitQueue(taskData) {
    commitQueue.push(taskData);
    log(`📥 Added to queue: ${taskData.action} - ${fmt(taskData.duration)}`);
    await processCommitQueue();
  }

  async function processCommitQueue() {
    if (isProcessingQueue || commitQueue.length === 0) return;

    isProcessingQueue = true;
    log(`⚙️ Processing queue (${commitQueue.length} items)...`);

    while (commitQueue.length > 0) {
      const taskData = commitQueue.shift();

      try {
        if (taskData.shouldCommitTime) {
          const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
          const newTotal = committed + taskData.duration;
          store(KEYS.DAILY_COMMITTED, newTotal);
          log(`✅ Timer updated: ${fmt(committed)} → ${fmt(newTotal)}`);
        } else {
          log(`⏭️ Timer not updated (${taskData.action})`);
        }

        if (taskData.shouldCount) {
          const count = retrieve(KEYS.COUNT, 0) || 0;
          store(KEYS.COUNT, count + 1);
          log(`✅ Counter updated: ${count} → ${count + 1}`);
        } else {
          log(`⏭️ Counter not updated (${taskData.action})`);
        }

        pushSessionRecord({
          id: taskData.id,
          taskName: taskData.taskName,
          date: new Date().toISOString(),
          duration: taskData.duration,
          action: taskData.action
        });

        if (CONFIG.ENABLE_ANALYTICS) {
          updateAnalytics(taskData.action === 'submitted' ? 'task_completed' :
                         taskData.action === 'skipped' ? 'task_skipped' : 'task_expired',
                         { duration: taskData.duration });
        }

        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (e) {
        log("❌ Commit queue error:", e);
        if (window.AI) AI.handleError(e, 'commit_queue');
      }
    }

    isProcessingQueue = false;
    log("✅ Queue processing complete");
  }

  // ============================================================================
  // 🤖 ULTIMATE AI ENGINE - FULL SUITE
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
        optimizations: 0,
        accuracy_validations: 0,
        data_recoveries: 0,
        errors_prevented: 0,
        self_heals: 0,
        performance_optimizations: 0,
        stability_checks: 0,
        reliability_improvements: 0,
      });

      this.config = retrieve(KEYS.AI_CONFIG, {
        learning_enabled: CONFIG.AI_LEARNING_ENABLED,
        protection_enabled: CONFIG.AI_PROTECTION_ENABLED,
        suggestions_enabled: CONFIG.AI_SUGGESTIONS_ENABLED,
        auto_fix_enabled: CONFIG.AI_AUTO_FIX_ENABLED,
        prediction_enabled: CONFIG.AI_PREDICTION_ENABLED,
        optimization_enabled: CONFIG.AI_OPTIMIZATION_ENABLED,
        anomaly_threshold: CONFIG.AI_ANOMALY_THRESHOLD,
        real_time_validation: CONFIG.AI_REAL_TIME_VALIDATION,
        predictive_failure: CONFIG.AI_PREDICTIVE_FAILURE,
        self_healing: CONFIG.AI_SELF_HEALING,
        performance_monitor: CONFIG.AI_PERFORMANCE_MONITOR,
        stability_checks: CONFIG.AI_STABILITY_CHECKS,
        reliability_scoring: CONFIG.AI_RELIABILITY_SCORING,
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

      this.health = retrieve(KEYS.AI_HEALTH, {
        status: 'excellent',
        last_check: Date.now(),
        issues: [],
        warnings: [],
      });

      this.performanceHistory = [];
      this.errorLog = retrieve(KEYS.AI_ERROR_LOG, []);
      this.recoveryLog = retrieve(KEYS.AI_RECOVERY_LOG, []);

      if (this.config.real_time_validation) {
        this.startRealTimeValidation();
      }

      log("🤖 AI Engine ULTIMATE v5.0.0 initialized - Full Suite Active");
    }

    startRealTimeValidation() {
      setInterval(() => {
        this.validateAccuracyRealTime();
      }, 5000);
      log("✅ Real-time validation started (5s intervals)");
    }

    validateAccuracyRealTime() {
      try {
        const startTime = performance.now();

        const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
        const sessions = retrieve(KEYS.SESSIONS, []) || [];
        const today = todayStr();

        const todaySessions = sessions.filter(s => {
          const sessionDate = new Date(s.date).toISOString().split('T')[0];
          return sessionDate === today;
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

        if (diff > 5) {
          log(`⚠️ AI ALERT: Accuracy drift detected!`);
          log(`   Expected: ${fmt(expectedTotal)} (${expectedTotal}s)`);
          log(`   Actual:   ${fmt(actual)} (${actual}s)`);
          log(`   Diff:     ${fmt(diff)} (${diff}s)`);

          if (this.config.self_healing) {
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
        log("❌ AI validation error:", e);
        this.handleError(e, 'real_time_validation');
      }
    }

    performSelfHeal(issueType, data) {
      try {
        log(`🔧 AI Self-Heal: Repairing ${issueType}...`);

        switch(issueType) {
          case 'accuracy_drift':
            store(KEYS.DAILY_COMMITTED, data.corrected_value);
            this.stats.self_heals++;
            this.stats.auto_fixes++;
            this.stats.data_recoveries++;
            this.logRecovery(issueType, `Auto-corrected ${fmt(data.diff)} drift`, data);
            log(`✅ Corrected: ${fmt(data.actual)} → ${fmt(data.expected)}`);
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
            this.logRecovery(issueType, 'Validated and cleaned sessions', data);
            break;
        }

        this.saveState();
        log(`✅ AI Self-Heal: ${issueType} repaired successfully`);

        if (typeof updateDisplay === 'function') {
          updateDisplay();
        }

      } catch (e) {
        log("❌ Self-heal error:", e);
        this.handleError(e, 'self_heal');
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
          log('🔮 AI Predictions:', predictions);
          this.predictions.failures = predictions;
          store(KEYS.AI_PREDICTIONS, this.predictions);
        }

        return predictions;

      } catch (e) {
        log("❌ Predictive failure error:", e);
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

        store(KEYS.AI_PERFORMANCE, this.performanceMetrics);
        this.stats.performance_optimizations++;

      } catch (e) {
        log("❌ Performance monitoring error:", e);
      }
    }

    checkStability() {
      try {
        const issues = [];
        const warnings = [];

        const committed = retrieve(KEYS.DAILY_COMMITTED, 0);
        if (committed < 0 || committed > 86400) {
          issues.push('Invalid daily_committed value');
        }

        const count = retrieve(KEYS.COUNT, 0);
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

        store(KEYS.AI_HEALTH, this.health);
        this.stats.stability_checks++;

        if (issues.length > 0 && this.config.self_healing) {
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
        log("❌ Reliability scoring error:", e);
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
        store(KEYS.AI_ERROR_LOG, this.errorLog);

        if (this.config.self_healing) {
          this.attemptRecovery(error, context);
        }

        this.stats.errors_prevented++;

      } catch (e) {
        log("❌ Error handler error:", e);
      }
    }

    attemptRecovery(error, context) {
      try {
        log(`🔧 AI Recovery: Attempting to recover from ${context}...`);

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
      store(KEYS.AI_RECOVERY_LOG, this.recoveryLog);
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

        store(KEYS.AI_HEALTH, this.health);

      } catch (e) {
        log("❌ Health status update error:", e);
      }
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
          log(`🔧 Fixing corrupted timer: ${committed}`);
          store(KEYS.DAILY_COMMITTED, Math.max(0, Math.min(86400, committed)));
          fixed = true;
        }

        if (count < 0) {
          log(`🔧 Fixing negative counter: ${count}`);
          store(KEYS.COUNT, 0);
          fixed = true;
        }

        if (!Array.isArray(sessions)) {
          log(`🔧 Fixing corrupted sessions array`);
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
            log(`🔧 Removing invalid session: duration=${s.duration}`);
            cleaned = true;
            return false;
          }
          if (!s.date || isNaN(new Date(s.date).getTime())) {
            log(`🔧 Removing invalid session: bad date`);
            cleaned = true;
            return false;
          }
          return true;
        });

        if (cleaned) {
          store(KEYS.SESSIONS, validSessions);
          this.stats.auto_fixes++;
          log(`✅ Cleaned ${sessions.length - validSessions.length} invalid sessions`);
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
          store(KEYS.AI_ANOMALIES, this.anomalies);
        }
        if (this.insights.length > 50) {
          this.insights = this.insights.slice(-50);
          store(KEYS.AI_INSIGHTS, this.insights);
        }
        if (this.errorLog.length > 100) {
          this.errorLog = this.errorLog.slice(-100);
          store(KEYS.AI_ERROR_LOG, this.errorLog);
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

          if (session.action === 'submitted' || session.action.includes('manual_reset')) {
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
        store(KEYS.AI_PROFILE, profile);
        return profile;
      } catch (e) {
        return {};
      }
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
        store(KEYS.AI_STATS, this.stats);
        store(KEYS.AI_CONFIG, this.config);
        store(KEYS.AI_HEALTH, this.health);
        store(KEYS.AI_PERFORMANCE, this.performanceMetrics);
      } catch (e) {
        log("❌ AI save error", e);
      }
    }

    getStatus() {
      return {
        enabled: CONFIG.AI_ENABLED,
        version: '5.0.0-ULTIMATE-AI',
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
      };
    }

    run() {
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
        log("❌ AI run error", e);
        this.handleError(e, 'ai_run');
      }
    }
  }

  // Initialize AI Engine
  const AI = new AIEngine();
  window.AI = AI;

  if (CONFIG.AI_ENABLED) {
    setInterval(() => {
      AI.run();
    }, CONFIG.AI_CHECK_INTERVAL);

    setTimeout(() => {
      AI.run();
    }, 5000);
  }

  // ============================================================================
  // 🔧 TIMER PARSING - Enhanced with 20+ patterns
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
        /(?:Task|Work)\s+Duration[:\s]+(\d+):(\d+)/i,
        /^(\d+):(\d+)$/m,
        /(\d+)\s*minutes?\s+(\d+)\s*seconds?/i,
        /(\d+)m\s*(\d+)s/i,
        /Time\s+Left[:\s]+(\d+):(\d+)/i,
        /Countdown[:\s]+(\d+):(\d+)/i,
        /(\d+):(\d+)\s+left/i,
        /(\d+):(\d+)\s+remaining/i,
        /Active\s+time[:\s]+(\d+):(\d+)/i,
        /Work\s+time[:\s]+(\d+):(\d+)/i,
        /Session[:\s]+(\d+):(\d+)/i,
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
            log(`✅ Parsed AWS timer: ${fmt(current)} / ${fmt(limit)}`);
            return { current, limit, remaining: limit - current };
          }
        }
      }

      const selectors = [
        '.timer', '.task-timer', '.elapsed-time',
        '[class*="time"]', '[class*="timer"]',
        '[data-timer]', '[aria-label*="time"]',
        '[class*="duration"]', '[id*="timer"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.innerText || "";
          const m = text.match(/(\d+):(\d+)/);
          if (m) {
            const current = (+m[1]) * 60 + (+m[2]);
            if (current >= 0 && current <= 86400) {
              log(`✅ Parsed AWS timer from element: ${fmt(current)}`);
              return { current, limit: 3600, remaining: 3600 - current };
            }
          }
        }
      }

      return null;
    } catch (e) {
      log("❌ parseAWSTimer error:", e);
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

  function getTaskName() {
    try {
      const bodyText = document.body.innerText || "";
      let match = bodyText.match(/Task description:\s*([^\n]+)/i);
      if (match && match[1] && match[1].trim().length > 5) {
        return sanitizeHTML(match[1].trim());
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
          const text = (el.innerText || "").trim();
          if (text.length > 10 && text.length < 200 && !text.includes('\n')) {
            return sanitizeHTML(text);
          }
        }
      }

      return `Task-${Date.now().toString().slice(-6)}`;
    } catch (e) {
      return `Task-${Date.now().toString().slice(-6)}`;
    }
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
  // 🎯 TASK MANAGEMENT
  // ============================================================================
  let activeTask = null;

  function getTaskIdFromUrl() {
    return window.location.pathname + window.location.search;
  }

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
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };

    if (CONFIG.FIX_REFRESH_LOSS) {
      store(KEYS.ACTIVE_TASK, activeTask);
    }

    log(`✅ New task started: ${taskName} (${fmt(awsData.current)} / ${fmt(awsData.limit)})`);
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
      activeTask.lastUpdate = Date.now();

      if (CONFIG.FIX_REFRESH_LOSS) {
        store(KEYS.ACTIVE_TASK, activeTask);
      }

      log(`🔄 Task updated: ${fmt(awsData.current)} / ${fmt(awsData.limit)} (${activeTask.status})`);
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
      log(`📝 Session recorded: ${rec.action} - ${fmt(rec.duration)}`);
    } catch (e) {
      log("❌ pushSession error:", e);
    }
  }

  // ============================================================================
  // 🎯 CORE LOGIC: COMMIT (SUBMIT)
  // ============================================================================
  function commitActiveTask() {
    if (!activeTask) {
      log("⚠️ No active task to commit");
      return 0;
    }

    const finalElapsed = activeTask.awsCurrent || 0;
    if (finalElapsed <= 0) {
      log("⚠️ Task has 0 duration, skipping commit");
      activeTask = null;
      return 0;
    }

    log(`✅ COMMITTING TASK (SUBMIT):`);
    log(`   Task: ${activeTask.taskName}`);
    log(`   Duration: ${fmt(finalElapsed)}`);
    log(`   Action: Adding to timer AND counter`);

    if (CONFIG.FIX_RACE_CONDITIONS) {
      addToCommitQueue({
        id: activeTask.id,
        taskName: activeTask.taskName || getTaskName(),
        duration: finalElapsed,
        action: "submitted",
        shouldCommitTime: true,
        shouldCount: true
      });
    } else {
      const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
      store(KEYS.DAILY_COMMITTED, committed + finalElapsed);

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

      log(`✅ Timer: ${fmt(committed)} → ${fmt(committed + finalElapsed)}`);
      log(`✅ Counter: ${c - 1} → ${c}`);
    }

    const id = activeTask.id;
    activeTask = null;

    if (CONFIG.FIX_REFRESH_LOSS) {
      store(KEYS.ACTIVE_TASK, null);
    }

    if (getIgnoreTask() === id) setIgnoreTask(null);

    updateDisplay();
    return finalElapsed;
  }

  // ============================================================================
  // 🎯 CORE LOGIC: DISCARD (RELEASE/SKIP/EXPIRE)
  // ============================================================================
  function discardActiveTask(reason) {
    if (!activeTask) {
      log("⚠️ No active task to discard");
      return;
    }

    const duration = activeTask.awsCurrent || 0;

    log(`❌ DISCARDING TASK (${reason.toUpperCase()}):`);
    log(`   Task: ${activeTask.taskName}`);
    log(`   Duration: ${fmt(duration)}`);
    log(`   Action: NOT adding to timer or counter (submitted_only mode)`);

    pushSessionRecord({
      id: activeTask.id,
      taskName: activeTask.taskName || getTaskName(),
      date: new Date().toISOString(),
      duration: duration,
      action: reason || "discarded"
    });

    if (reason === 'expired') updateAnalytics('task_expired');
    else if (reason === 'skipped') updateAnalytics('task_skipped');

    log(`✅ Timer: No change (task not submitted)`);
    log(`✅ Counter: No change (task not submitted)`);

    const id = activeTask.id;
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
    log(`🔙 Timer goes back to last submitted total`);
  }

  // ============================================================================
  // 📅 DAILY RESET
  // ============================================================================
  function checkDailyReset() {
    const currentDate = todayStr();
    const lastDate = retrieve(KEYS.LAST_DATE);

    if (lastDate !== currentDate) {
      log("🌅 New day detected - performing reset");
      const previousTotal = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;

      if (previousTotal > 0 && lastDate) {
        saveToHistory(lastDate, previousTotal);
        log(`📊 Saved to history: ${lastDate} = ${fmt(previousTotal)}`);
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

    for (const d in history) {
      if (d < cutoffStr) delete history[d];
    }

    store(KEYS.HISTORY, history);
  }

  // ============================================================================
  // 🔧 ULTIMATE RESET SYSTEM - Continues AWS Tracking
  // ============================================================================
  function performReset(resetType = 'both', source = 'manual') {
    try {
      log(`🔄 Reset initiated: ${resetType} (${source})`);

      // ✅ Step 1: Commit current task snapshot (if exists)
      if (activeTask && activeTask.awsCurrent) {
        const snapshot = activeTask.awsCurrent || 0;
        log(`📸 Snapshot: ${fmt(snapshot)}`);

        if (CONFIG.FIX_RACE_CONDITIONS) {
          addToCommitQueue({
            id: activeTask.id,
            taskName: activeTask.taskName || getTaskName(),
            duration: snapshot,
            action: 'manual_reset_' + resetType,
            shouldCommitTime: true,
            shouldCount: true
          });
        } else {
          const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
          store(KEYS.DAILY_COMMITTED, committed + snapshot);
          const c = (retrieve(KEYS.COUNT, 0) || 0) + 1;
          store(KEYS.COUNT, c);
          pushSessionRecord({
            id: activeTask.id,
            taskName: activeTask.taskName || getTaskName(),
            date: new Date().toISOString(),
            duration: snapshot,
            action: 'manual_reset_' + resetType
          });
          updateAnalytics('task_completed', { duration: snapshot });
        }
      }

      // ✅ Step 2: Reset counters (but KEEP activeTask alive for AWS tracking)
      switch (resetType) {
        case 'timer':
          store(KEYS.DAILY_COMMITTED, 0);
          break;
        case 'counter':
          store(KEYS.COUNT, 0);
          break;
        case 'both':
        default:
          store(KEYS.DAILY_COMMITTED, 0);
          store(KEYS.COUNT, 0);
          break;
      }

      store(KEYS.LAST_DATE, todayStr());
      store(KEYS.LAST_RESET, new Date().toISOString());

      // ✅ Step 3: Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white; padding: 16px 24px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 999999999;
        font-family: system-ui; font-weight: 600;
      `;
      notification.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 8px;">✅ Reset Complete!</div>
        <div style="font-size: 13px; opacity: 0.9;">
          ${activeTask ?
            `Current task continues tracking AWS timer (${fmt(activeTask.awsCurrent)})` :
            'Navigate to a task to start tracking'}
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 5000);

      // ✅ Step 4: Update display (will show AWS time if on task page)
      updateDisplay();
      updateHomeDisplay();

      log('✅ Reset complete!');
      log(`   Committed: ${fmt(retrieve(KEYS.DAILY_COMMITTED, 0))}`);
      log(`   Count: ${retrieve(KEYS.COUNT, 0)}`);
      if (activeTask) {
        log(`   Active task continues: ${fmt(activeTask.awsCurrent)}`);
      }

      return true;

    } catch (e) {
      console.error("❌ Reset error:", e);
      return false;
    }
  }

  function showResetDialog() {
    const existing = document.getElementById("sm-reset-dialog");
    if (existing) existing.remove();

    const dialog = document.createElement("div");
    dialog.id = "sm-reset-dialog";
    dialog.innerHTML = `
      <style>
        #sm-reset-dialog { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 999999999; }
        #sm-reset-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
        #sm-reset-modal { position: relative; width: 360px; max-width: calc(100% - 32px); background: #fff; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); overflow: hidden; font-family: system-ui; animation: slideIn 0.2s ease; }
        @keyframes slideIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        #sm-reset-modal .header { padding: 16px 20px; background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff; }
        #sm-reset-modal h3 { margin: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        #sm-reset-modal .body { padding: 20px; }
        #sm-reset-modal .current-values { background: #f9fafb; padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        #sm-reset-modal .value { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #374151; }
        #sm-reset-modal .value strong { color: #111827; font-weight: 700; }
        #sm-reset-modal .warning { background: #dbeafe; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; color: #1e40af; border-left: 4px solid #3b82f6; }
        #sm-reset-modal .options { display: flex; flex-direction: column; gap: 10px; }
        #sm-reset-modal .option-btn { padding: 12px 16px; border: 1.5px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all 0.15s; display: flex; align-items: center; gap: 10px; font-weight: 600; }
        #sm-reset-modal .option-btn:hover { border-color: #dc2626; background: #fef2f2; transform: translateX(3px); }
        #sm-reset-modal .footer { padding: 12px 20px; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; }
        #sm-reset-modal .cancel-btn { padding: 8px 16px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        #sm-reset-modal .cancel-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
        #sm-reset-modal .esc-hint { font-size: 10px; color: #6b7280; display: flex; align-items: center; gap: 4px; }
        #sm-reset-modal .esc-key { padding: 2px 6px; background: #e5e7eb; border-radius: 3px; font-family: monospace; font-weight: 600; font-size: 10px; }
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
          <div class="warning">
            💡 <strong>Note:</strong> If you're on a task page, the AWS timer will continue tracking after reset.
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

    const escHandler = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.stopPropagation();
        e.preventDefault();
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
      btn.addEventListener("click", () => {
        const resetType = btn.dataset.reset;
        dialog.remove();
        document.removeEventListener('keydown', escHandler, true);
        performReset(resetType, "manual");
      });
    });
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
      log("🕛 Scheduled midnight reset triggered");
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
  // 🔧 ENHANCED SUBMISSION DETECTION
  // ============================================================================
  function initSubmissionInterceptor() {
    if (typeof window.fetch === "function") {
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const method = args[1]?.method || "GET";

        return origFetch.apply(this, args).then(response => {
          try {
            if (method.toUpperCase() === "POST" && response.ok && CONFIG.FIX_DETECTION) {
              const isTaskEndpoint =
                /submit|complete|finish/i.test(url) ||
                /task/i.test(url) ||
                /labeling/i.test(url) ||
                /annotation/i.test(url) ||
                /response/i.test(url) ||
                /answer/i.test(url) ||
                /save/i.test(url) ||
                /update/i.test(url);

              if (isTaskEndpoint) {
                log("📡 Detected submission via fetch");
                commitActiveTask();
                updateDisplay();
              }
            }
          } catch (e) {
            log("❌ Fetch intercept error:", e);
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
              const isTaskEndpoint =
                /submit|complete|finish/i.test(info.url) ||
                /task/i.test(info.url) ||
                /labeling/i.test(info.url) ||
                /answer/i.test(info.url);

              if (isTaskEndpoint) {
                log("📡 Detected submission via XHR");
                commitActiveTask();
                updateDisplay();
              }
            }
          } catch (e) {
            log("❌ XHR intercept error:", e);
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
          'confirm', 'save', 'next', 'continue', 'proceed',
          'accept', 'approve', 'validate', 'verify', 'commit',
          'finalize', 'conclude', 'end', 'close', 'mark complete'
        ];

        const isSubmitButton = CONFIG.FIX_DETECTION &&
          submitKeywords.some(kw => raw.includes(kw));

        if (isSubmitButton && !el.__sm_submit_bound) {
          el.__sm_submit_bound = true;
          el.addEventListener("click", () => {
            setTimeout(() => {
              log("🖱️ Submit button clicked");
              commitActiveTask();
              updateDisplay();
            }, 100);
          });
        }

        if (raw.includes("skip") && !el.__sm_skip_bound) {
          el.__sm_skip_bound = true;
          el.addEventListener("click", () => {
            log("🖱️ Skip button clicked");
            discardActiveTask("skipped");
            updateDisplay();
          });
        }

        if ((raw.includes("stop") || raw.includes("release")) && !el.__sm_release_bound) {
          el.__sm_release_bound = true;
          el.addEventListener("click", () => {
            log("🖱️ Release/Stop button clicked");
            discardActiveTask("released");
            updateDisplay();
          });
        }
      } catch (e) {}
    });
  }

  // ============================================================================
  // 🎯 PAGE DETECTION
  // ============================================================================
  function isHomePage() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (path === '/' || path === '/home' || path === '/dashboard') {
      return true;
    }

    if (url.includes('sagemaker.aws') &&
        !path.includes('/task') &&
        !path.includes('/job') &&
        !path.includes('/labeling') &&
        !path.includes('/work')) {
      return true;
    }

    return false;
  }

  function isJobsListPage() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const bodyText = (document.body.innerText || "").toLowerCase();

    if (path.includes('/jobs') ||
        path.includes('/job') ||
        bodyText.includes('jobs (') ||
        bodyText.includes('start working') ||
        document.querySelector('button[data-test-id*="start-working"]') ||
        document.querySelector('.awsui-table')) {
      return true;
    }

    return false;
  }

  function isTaskPage() {
    if (isJobsListPage()) {
      return false;
    }

    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (url.includes('/task') || url.includes('/labeling')) {
      const awsTimer = parseAWSTimer();
      if (awsTimer) return true;
    }

    const awsTimer = parseAWSTimer();
    if (awsTimer) return true;

    const bodyText = (document.body.innerText || "").toLowerCase();
    if (bodyText.includes("task time") && bodyText.includes("task description")) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // 🏠 HOME PAGE STATS DISPLAY - COMPACT SIZE (NO AI MENTION)
  // ============================================================================
  const homeDisplay = document.createElement("div");
  homeDisplay.id = "sm-home-stats";
  homeDisplay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    display: block;
    font-family: 'Inter', system-ui, sans-serif;
    user-select: none;
  `;

  homeDisplay.innerHTML = `
    <style>
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }

      @keyframes glow {
        0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.3), 0 0 30px rgba(59, 130, 246, 0.2); }
        50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.5), 0 0 50px rgba(59, 130, 246, 0.3); }
      }

      .home-stats-container {
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.98) 0%, rgba(49, 46, 129, 0.98) 100%);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 16px;
        width: 200px;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        border: 1.5px solid rgba(99, 102, 241, 0.3);
        animation: float 3s ease-in-out infinite, glow 2s ease-in-out infinite;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .home-stats-container:hover {
        transform: translateY(-4px) scale(1.03);
        border-color: rgba(99, 102, 241, 0.6);
        box-shadow: 0 20px 50px rgba(99, 102, 241, 0.4);
      }

      .home-stats-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1.5px solid rgba(99, 102, 241, 0.3);
      }

      .home-stats-title {
        font-size: 14px;
        font-weight: 900;
        background: linear-gradient(135deg, #a78bfa, #c4b5fd);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: 0.5px;
      }

      .home-stats-badge {
        padding: 3px 8px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        animation: pulse 2s infinite;
      }

      .home-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .home-stat-row:last-child {
        margin-bottom: 0;
      }

      .home-stat-label {
        font-size: 11px;
        font-weight: 600;
        color: #c4b5fd;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .home-stat-icon {
        font-size: 14px;
      }

      .home-stat-value {
        font-size: 16px;
        font-weight: 900;
        color: #ffffff;
        font-family: 'Courier New', monospace;
                text-shadow: 0 2px 8px rgba(99, 102, 241, 0.5);
      }

      .home-stat-progress {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
        margin-top: 8px;
      }

      .home-stat-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
        border-radius: 10px;
        transition: width 0.5s ease;
        box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
      }

      .home-stats-footer {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(99, 102, 241, 0.2);
        text-align: center;
        font-size: 9px;
        color: #a78bfa;
        font-weight: 600;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.05); }
      }
    </style>

    <div class="home-stats-container">
      <div class="home-stats-header">
        <div class="home-stats-title">📊 TRACKER</div>
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

      <div class="home-stat-row">
        <div class="home-stat-label">
          <span class="home-stat-icon">🎯</span>
          <span>Goal</span>
        </div>
        <div class="home-stat-value" id="home-goal-value" style="font-size: 14px; color: #10b981;">0%</div>
      </div>

      <div class="home-stat-progress">
        <div class="home-stat-progress-fill" id="home-goal-progress" style="width: 0%"></div>
      </div>

      <div class="home-stats-footer">
        Click to open Dashboard
      </div>
    </div>
  `;

  document.body.appendChild(homeDisplay);
  homeDisplay.addEventListener('click', showDashboard);

  function updateHomeDisplay() {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;

    const timerEl = document.getElementById('home-timer-value');
    const countEl = document.getElementById('home-count-value');
    const goalEl = document.getElementById('home-goal-value');
    const goalProgress = document.getElementById('home-goal-progress');

    if (timerEl) timerEl.textContent = fmt(committed);
    if (countEl) countEl.textContent = count;

    if (goalEl && goalProgress) {
      const targetSeconds = CONFIG.DAILY_ALERT_HOURS * 3600;
      const percent = Math.min(100, Math.round((committed / targetSeconds) * 100));
      goalEl.textContent = `${percent}%`;
      goalProgress.style.width = `${percent}%`;
    }
  }

  // ============================================================================
  // 🎨 DISPLAY UI - Task Page (NO AI MENTION)
  // ============================================================================
  const display = document.createElement("div");
  display.id = "sm-utilization";
  display.style.cssText = `
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: inherit;
    fontSize: inherit;
    font-family: inherit;
    opacity: 0.92;
    pointer-events: auto;
    user-select: none;
    white-space: nowrap;
    display: none;
    align-items: center;
    gap: 0px;
    z-index: 9999;
  `;

  const timerContainer = document.createElement("div");
  timerContainer.style.cssText = "display: inline-block; position: relative;";

  const timerTextSpan = document.createElement("span");
  timerTextSpan.id = "sm-timer-text";
  timerTextSpan.textContent = "Utilization: 00:00:00";
  timerContainer.appendChild(timerTextSpan);

  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; margin-top: 2px;
    height: 4px; background: rgba(0,0,0,0.15);
    border-radius: 2px; overflow: hidden;
  `;

  const progressBar = document.createElement("div");
  progressBar.id = "sm-progress-bar";
  progressBar.style.cssText = `
    height: 100%;
    background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
    width: 0%;
    transition: width 0.5s ease;
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

  // ============================================================================
  // 🎨 DISPLAY VISIBILITY
  // ============================================================================
  function updateDisplayVisibility() {
    const isHome = isHomePage();
    const isJobsList = isJobsListPage();
    const isTask = isTaskPage();

    log(`Page detection - Home: ${isHome}, JobsList: ${isJobsList}, Task: ${isTask}`);

    if (isTask) {
      display.style.display = "flex";
      homeDisplay.style.display = "none";
      log("✅ Showing task page timer");
    } else {
      display.style.display = "none";
      homeDisplay.style.display = "block";
      log("✅ Showing home page stats");
    }
  }

  let footerObserver = null;

  function attachToFooter() {
    if (!isTaskPage()) return;

    const footer = document.querySelector('.cswui-footer, .awsui-footer, footer') || document.body;
    if (!footer) return;
    if (getComputedStyle(footer).position === "static") {
      footer.style.position = "relative";
    }

    if (!footer.contains(display)) footer.appendChild(display);

    if (!display.querySelector("#sm-dashboard-btn")) {
      const btn = document.createElement("button");
      btn.id = "sm-dashboard-btn";
      btn.innerHTML = "📊 Dashboard";
      btn.title = "Open Dashboard (Ctrl+Shift+U)";
      btn.style.cssText = `
        margin-left: 8px;
        padding: 6px 12px;
        border-radius: 6px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
      `;
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "translateY(-2px)";
        btn.style.boxShadow = "0 4px 8px rgba(99, 102, 241, 0.4)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translateY(0)";
        btn.style.boxShadow = "0 2px 4px rgba(99, 102, 241, 0.3)";
      });
      btn.addEventListener("click", showDashboard);
      display.appendChild(btn);
    }
  }

  footerObserver = new MutationObserver(() => {
    setTimeout(attachToFooter, 120);
  });
  footerObserver.observe(document.body, { childList: true, subtree: true });

  // ============================================================================
  // 🎯 DISPLAY UPDATE
  // ============================================================================
  function updateDisplay() {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    let pending = 0;

    if (activeTask && (activeTask.status === "active" || activeTask.status === "paused")) {
      pending = activeTask.awsCurrent || 0;
    }

    const total = committed + pending;

    const timerText = document.getElementById('sm-timer-text');
    if (timerText) {
      timerText.textContent = `Utilization: ${fmt(total)}`;
    }

    const countLabelEl = document.getElementById('sm-count-label');
    if (countLabelEl) {
      countLabelEl.textContent = ` | Count: ${retrieve(KEYS.COUNT, 0) || 0}`;
    }

    const bar = document.getElementById('sm-progress-bar');
    if (bar) {
      const targetSeconds = CONFIG.DAILY_ALERT_HOURS * 3600;
      const percent = Math.min(100, (total / targetSeconds) * 100);
      bar.style.width = `${percent}%`;
    }

    updateHomeDisplay();
  }

  // ============================================================================
  // 📊 DASHBOARD FUNCTIONS
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

      if (session.action === 'submitted' || session.action.includes('manual_reset')) {
        task.totalTime += (session.duration || 0);
        task.submitted++;
      } else if (session.action === 'skipped') {
        task.skipped++;
      } else if (session.action === 'expired') {
        task.expired++;
      }

      task.totalSessions++;

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
        return sessionDate === dateStr && (s.action === 'submitted' || s.action.includes('manual_reset'));
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

  function dashboardExportJSON() {
    const aiStatus = AI.getStatus();

    const payload = {
      version: "5.0.0-ULTIMATE",
      exported_at: new Date().toISOString(),
      history: retrieve(KEYS.HISTORY, {}),
      sessions: retrieve(KEYS.SESSIONS, []),
      analytics: retrieve(KEYS.ANALYTICS, {}),
      daily_committed: retrieve(KEYS.DAILY_COMMITTED, 0),
      count: retrieve(KEYS.COUNT, 0),
      last_date: retrieve(KEYS.LAST_DATE),
      queue_summary: aggregateTodayTaskData(),
      system_status: aiStatus,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sagemaker-data-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    log('✅ Data exported successfully!');
  }

  function dashboardExportCSV() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];

    if (sessions.length === 0) {
      log('No data to export');
      return;
    }

    const headers = ['Date', 'Time', 'Task Name', 'Duration (seconds)', 'Duration (formatted)', 'Action'];

    const rows = sessions.map(s => {
      const date = new Date(s.date);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        (s.taskName || 'Unknown').replace(/,/g, ';'),
        s.duration || 0,
        fmt(s.duration || 0),
        s.action || 'unknown'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sagemaker-sessions-${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    log('✅ CSV exported successfully');
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
            throw new Error('Invalid backup file format');
          }

          const shouldMerge = confirm('Merge with existing data?\n\nOK = Merge\nCancel = Replace all data');

          if (shouldMerge) {
            const existingSessions = retrieve(KEYS.SESSIONS, []);
            const existingHistory = retrieve(KEYS.HISTORY, {});

            store(KEYS.SESSIONS, [...existingSessions, ...data.sessions]);
            store(KEYS.HISTORY, { ...existingHistory, ...data.history });

            if (data.analytics) {
              const existingAnalytics = retrieve(KEYS.ANALYTICS, {});
              store(KEYS.ANALYTICS, { ...existingAnalytics, ...data.analytics });
            }
          } else {
            store(KEYS.HISTORY, data.history || {});
            store(KEYS.SESSIONS, data.sessions || []);
            store(KEYS.ANALYTICS, data.analytics || {});

            if (data.daily_committed) store(KEYS.DAILY_COMMITTED, data.daily_committed);
            if (data.count) store(KEYS.COUNT, data.count);
          }

          log('✅ Import successful!');

          if (CONFIG.AI_ENABLED) {
            setTimeout(() => AI.run(), 1000);
          }

          if (document.getElementById('sm-dashboard')) {
            showDashboard();
          }
        } catch (err) {
          console.error('❌ Import failed:', err.message);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  // ============================================================================
  // 📊 PROFESSIONAL DASHBOARD - CLEAN & COMPACT
  // ============================================================================
  function showDashboard() {
    const existing = document.getElementById('sm-dashboard');
    if (existing) {
      existing.remove();
      return;
    }

    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;
    const todayTasks = aggregateTodayTaskData();
    const last7Days = getLast7DaysData();
    const analytics = retrieve(KEYS.ANALYTICS, {});

    const targetSeconds = CONFIG.DAILY_ALERT_HOURS * 3600;
    const goalPercent = Math.min(100, Math.round((committed / targetSeconds) * 100));

    const root = document.createElement('div');
    root.id = 'sm-dashboard';
    root.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        #sm-dashboard {
          position: fixed;
          inset: 0;
          z-index: 999999;
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          overflow-y: auto;
          color: #e2e8f0;
        }

        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        /* ===== HEADER ===== */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 28px;
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .dashboard-title {
          font-size: 28px;
          font-weight: 900;
          color: #f1f5f9;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .version-badge {
          padding: 6px 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 10px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .btn-close {
          background: #ef4444;
          color: white;
        }

        .btn-close:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }

        /* ===== MAIN STATS GRID ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .stat-label {
          font-size: 13px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: 1px;
        }

        .stat-value {
          font-size: 42px;
          font-weight: 900;
          color: #f1f5f9;
          font-family: 'Courier New', monospace;
          text-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
          line-height: 1;
        }

        .stat-meta {
          font-size: 13px;
          color: #64748b;
          margin-top: 8px;
          font-weight: 600;
        }

        /* ===== CONTENT SECTIONS ===== */
        .content-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .section-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          padding: 24px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid rgba(148, 163, 184, 0.1);
        }

        .section-title {
          font-size: 18px;
          font-weight: 800;
          color: #f1f5f9;
        }

        .section-badge {
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
        }

        /* ===== GOAL SECTION ===== */
        .goal-section {
          grid-column: 1 / 7;
        }

        .goal-display {
          display: flex;
          justify-content: space-around;
          margin-bottom: 20px;
        }

        .goal-item {
          text-align: center;
        }

        .goal-item-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .goal-item-value {
          font-size: 32px;
          font-weight: 900;
          color: #f1f5f9;
          font-family: 'Courier New', monospace;
        }

        .progress-container {
          width: 100%;
          height: 40px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          margin: 20px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 16px;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
        }

        .goal-success {
          padding: 12px;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          text-align: center;
          color: #10b981;
          font-size: 14px;
          font-weight: 700;
        }

        /* ===== WEEKLY CHART ===== */
        .weekly-section {
          grid-column: 7 / 13;
        }

        .chart-container {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 180px;
          gap: 12px;
        }

        .chart-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .chart-bar {
          width: 100%;
          background: linear-gradient(180deg, #3b82f6, #2563eb);
          border-radius: 8px 8px 0 0;
          transition: all 0.3s;
          position: relative;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
        }

        .chart-bar:hover {
          background: linear-gradient(180deg, #60a5fa, #3b82f6);
          box-shadow: 0 0 25px rgba(59, 130, 246, 0.6);
          transform: scaleY(1.05);
        }

        .chart-label {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 700;
        }

        .chart-value {
          font-size: 14px;
          color: #f1f5f9;
          font-weight: 800;
        }

        /* ===== TASKS TABLE ===== */
        .tasks-section {
          grid-column: 1 / 9;
        }

        .data-table {
          width: 100%;
          font-size: 13px;
          border-collapse: collapse;
        }

        .data-table th {
          background: rgba(15, 23, 42, 0.6);
          color: #cbd5e1;
          padding: 14px 12px;
          text-align: left;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .data-table td {
          padding: 14px 12px;
          color: #e2e8f0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .data-table tr:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .task-name-col {
          font-weight: 700;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f1f5f9;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          display: inline-block;
          margin-right: 4px;
        }

        .badge-success { background: #065f46; color: #d1fae5; }
        .badge-warning { background: #92400e; color: #fef3c7; }
        .badge-danger { background: #991b1b; color: #fee2e2; }

        /* ===== ANALYTICS ===== */
        .analytics-section {
          grid-column: 9 / 13;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .analytics-item {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 12px;
          padding: 18px;
          text-align: center;
        }

        .analytics-label {
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .analytics-value {
          font-size: 32px;
          font-weight: 900;
          color: #f1f5f9;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #64748b;
          font-size: 14px;
        }
      </style>

      <div class="dashboard-container">
        <!-- HEADER -->
        <div class="dashboard-header">
          <div class="dashboard-title">
            📊 Utilization Dashboard
            <span class="version-badge">v5.0.0</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="document.getElementById('sm-dashboard').dispatchEvent(new CustomEvent('reset'))">🔄 Reset</button>
            <button class="btn btn-primary" onclick="document.getElementById('sm-dashboard').dispatchEvent(new CustomEvent('export'))">💾 Export</button>
            <button class="btn btn-primary" onclick="document.getElementById('sm-dashboard').dispatchEvent(new CustomEvent('import'))">📥 Import</button>
            <button class="btn btn-close" id="close-dashboard">✕ Close</button>
          </div>
        </div>

        <!-- MAIN STATS -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">⏱️ Time Today</div>
            <div class="stat-value">${fmt(committed).substring(0, 5)}</div>
            <div class="stat-meta">Total work time</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">📋 Tasks Done</div>
            <div class="stat-value">${count}</div>
            <div class="stat-meta">Submitted today</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🎯 Daily Goal</div>
            <div class="stat-value" style="font-size: 36px;">${goalPercent}%</div>
            <div class="stat-meta">${fmt(Math.max(0, targetSeconds - committed)).substring(0, 5)} remaining</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">📊 Total Tasks</div>
            <div class="stat-value">${todayTasks.length}</div>
            <div class="stat-meta">Unique tasks</div>
          </div>
        </div>

        <!-- CONTENT GRID -->
        <div class="content-grid">
          <!-- GOAL PROGRESS -->
          <div class="section-card goal-section">
            <div class="section-header">
              <div class="section-title">🎯 Goal Progress</div>
              <div class="section-badge">${goalPercent}%</div>
            </div>
            <div class="goal-display">
              <div class="goal-item">
                <div class="goal-item-label">Current</div>
                <div class="goal-item-value">${fmt(committed).substring(0, 5)}</div>
              </div>
              <div class="goal-item">
                <div class="goal-item-label">Target</div>
                <div class="goal-item-value">${fmt(targetSeconds).substring(0, 5)}</div>
              </div>
              <div class="goal-item">
                <div class="goal-item-label">Remaining</div>
                <div class="goal-item-value">${fmt(Math.max(0, targetSeconds - committed)).substring(0, 5)}</div>
              </div>
            </div>
            <div class="progress-container">
              <div class="progress-fill" style="width: ${goalPercent}%">
                ${goalPercent}%
              </div>
            </div>
            ${goalPercent >= 100 ? '<div class="goal-success">🎉 Congratulations! Daily goal achieved!</div>' : ''}
          </div>

          <!-- WEEKLY CHART -->
          <div class="section-card weekly-section">
            <div class="section-header">
              <div class="section-title">📅 Last 7 Days</div>
              <div class="section-badge">${last7Days.reduce((sum, d) => sum + d.count, 0)} tasks</div>
            </div>
            <div class="chart-container">
              ${last7Days.map(day => {
                const maxTime = Math.max(...last7Days.map(d => d.time), 1);
                const height = Math.max(15, (day.time / maxTime) * 100);
                return `
                  <div class="chart-bar-wrapper">
                    <div class="chart-value">${day.count}</div>
                    <div class="chart-bar" style="height: ${height}%" title="${fmt(day.time)}"></div>
                    <div class="chart-label">${day.dayName.substring(0, 3)}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- TASKS TABLE -->
          <div class="section-card tasks-section">
            <div class="section-header">
              <div class="section-title">📋 Today's Tasks</div>
              <div class="section-badge">${todayTasks.length}</div>
            </div>
            ${todayTasks.length > 0 ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${todayTasks.map(task => `
                    <tr>
                      <td class="task-name-col" title="${sanitizeHTML(task.taskName)}">${sanitizeHTML(task.taskName)}</td>
                      <td style="font-weight: 800; color: #60a5fa;">${fmt(task.totalTime).substring(0, 5)}</td>
                      <td>
                        <span class="badge badge-success">${task.submitted}</span>
                        ${task.skipped > 0 ? `<span class="badge badge-warning">${task.skipped}</span>` : ''}
                        ${task.expired > 0 ? `<span class="badge badge-danger">${task.expired}</span>` : ''}
                      </td>
                      <td><span class="badge ${
                        task.successRate >= 80 ? 'badge-success' :
                        task.successRate >= 50 ? 'badge-warning' : 'badge-danger'
                      }">${task.successRate}%</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="empty-state">📋 No tasks completed today</div>'}
          </div>

          <!-- ANALYTICS -->
          <div class="section-card analytics-section">
            <div class="section-header">
              <div class="section-title">📊 Analytics</div>
            </div>
            <div class="analytics-grid">
              <div class="analytics-item">
                <div class="analytics-label">✅ Completed</div>
                <div class="analytics-value">${analytics.total_tasks_completed || 0}</div>
              </div>
              <div class="analytics-item">
                <div class="analytics-label">⏭️ Skipped</div>
                <div class="analytics-value">${analytics.total_tasks_skipped || 0}</div>
              </div>
              <div class="analytics-item">
                <div class="analytics-label">⏰ Expired</div>
                <div class="analytics-value">${analytics.total_tasks_expired || 0}</div>
              </div>
              <div class="analytics-item">
                <div class="analytics-label">🏆 Best Session</div>
                <div class="analytics-value" style="font-size: 20px;">${fmt(analytics.longest_session || 0).substring(0, 5)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    root.querySelector('#close-dashboard').addEventListener('click', () => root.remove());
    root.addEventListener('reset', showResetDialog);
    root.addEventListener('export', () => {
      const menu = document.createElement('div');
      menu.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(30, 41, 59, 0.98); backdrop-filter: blur(20px); padding: 28px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 9999999; border: 1px solid rgba(148, 163, 184, 0.2);';
      menu.innerHTML = `
        <div style="font-size: 20px; font-weight: 800; margin-bottom: 20px; color: #f1f5f9;">Export Data</div>
        <button onclick="this.parentElement.dispatchEvent(new CustomEvent('exportjson'))" style="width: 100%; padding: 14px; margin-bottom: 10px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px;">💾 Export as JSON</button>
        <button onclick="this.parentElement.dispatchEvent(new CustomEvent('exportcsv'))" style="width: 100%; padding: 14px; margin-bottom: 10px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px;">📊 Export as CSV</button>
        <button onclick="this.remove()" style="width: 100%; padding: 14px; background: #64748b; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px;">Cancel</button>
      `;
      menu.addEventListener('exportjson', () => { dashboardExportJSON(); menu.remove(); });
      menu.addEventListener('exportcsv', () => { dashboardExportCSV(); menu.remove(); });
      document.body.appendChild(menu);
    });
    root.addEventListener('import', dashboardImportJSON);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') root.remove();
    });
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
          dashboardExportJSON();
          break;
        case 'i':
          e.preventDefault();
          dashboardImportJSON();
          break;
        case 'c':
          e.preventDefault();
          dashboardExportCSV();
          break;
      }
    }
  });

  // ============================================================================
  // 🔧 RESTORE ACTIVE TASK ON PAGE LOAD
  // ============================================================================
  function restoreActiveTask() {
    if (!CONFIG.FIX_REFRESH_LOSS) return;

    const savedTask = retrieve(KEYS.ACTIVE_TASK);
    if (!savedTask || !savedTask.id) return;

    const currentTaskId = getTaskIdFromUrl();

    if (savedTask.id === currentTaskId) {
      activeTask = savedTask;
      log(`🔧 Restored active task: ${activeTask.taskName}`);

      const awsData = parseAWSTimer();
      if (awsData) {
        log(`📡 AWS timer shows: ${fmt(awsData.current)}`);
        activeTask.awsCurrent = awsData.current;
        activeTask.awsLimit = awsData.limit;
        activeTask.lastAws = awsData.current;
        activeTask.lastUpdate = Date.now();
        store(KEYS.ACTIVE_TASK, activeTask);
        log(`✅ Updated with AWS time: ${fmt(awsData.current)}`);
      } else {
        log(`⚠️ Could not read AWS timer, using saved: ${fmt(savedTask.awsCurrent)}`);
      }
    } else {
      log("🔄 Different task detected, clearing saved task");
      store(KEYS.ACTIVE_TASK, null);
    }
  }

  // ============================================================================
  // 💾 AUTO-BACKUP SYSTEM
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
            daily_committed: retrieve(KEYS.DAILY_COMMITTED, 0),
            count: retrieve(KEYS.COUNT, 0),
          }
        };

        try {
          storeCompressed(KEYS.AUTO_BACKUP, backup);
          store(KEYS.LAST_BACKUP, backup.timestamp);
          log('🤖 Auto-backup completed');
        } catch (e) {
          log('❌ Auto-backup failed', e);
        }
      }
    };

    setInterval(performBackup, 60 * 60 * 1000);
    setTimeout(performBackup, 5000);
  }

  // ============================================================================
  // 🔄 TRACKING LOOP
  // ============================================================================
  let lastAWSData = null;

  function trackOnce() {
    checkDailyReset();

    const onTaskPage = isTaskPage();

    updateDisplayVisibility();

    if (!onTaskPage) {
      updateHomeDisplay();
      return;
    }

    if (hasTaskExpiredOnPage()) {
      log("⏰ Task expired detected on page");
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
        log("🔄 Timer reset detected - clearing ignore");
      } else {
        lastAWSData = awsData || lastAWSData;
        return;
      }
    }

    if (!awsData) {
      lastAWSData = null;
      return;
    }

    if (!activeTask || activeTask.id !== currentPageId) {
      startNewTaskFromAWS(awsData);
    } else {
      updateActiveTaskFromAWS(awsData);
    }

    if (typeof awsData.limit === "number" && awsData.current >= awsData.limit) {
      log("⏰ Task reached time limit");
      discardActiveTask("expired");
    }

    lastAWSData = awsData;
    updateDisplay();
  }

  // ============================================================================
  // 🚀 INITIALIZATION
  // ============================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 SageMaker Utilization Tracker v5.0.0");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Compact home stats - VISIBLE");
  console.log("✅ Professional dashboard - READY");
  console.log("✅ 100% Accuracy tracking");
  console.log("");
  console.log("⌨️ Keyboard Shortcuts:");
  console.log("  Ctrl+Shift+U - Dashboard");
  console.log("  Ctrl+Shift+R - Reset");
  console.log("  Ctrl+Shift+E - Export JSON");
  console.log("  Ctrl+Shift+C - Export CSV");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  checkDailyReset();
  scheduleMidnightReset();
  initSubmissionInterceptor();
  setupAutoBackup();

  setTimeout(() => {
    restoreActiveTask();
    attachToFooter();
    updateDisplay();
    updateHomeDisplay();
    updateDisplayVisibility();
    log("✅ All displays initialized!");
  }, 1000);

  trackingIntervalId = setInterval(() => {
    trackOnce();
  }, CONFIG.CHECK_INTERVAL_MS);

  const buttonsObserver = new MutationObserver(wireTaskActionButtons);
  buttonsObserver.observe(document.body, { childList: true, subtree: true });

  console.log("✅ SageMaker Tracker v5.0.0 Ready!");

})();
