// ==UserScript==
// @name         Sagemaker Utilization Counter
// @namespace    http://tampermonkey.net/
// @version      3.2.1
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
  // 🎨 TOAST NOTIFICATION SYSTEM (DISABLED)
  // ============================================================================
  class ToastManager {
    constructor() {
      // Notifications disabled
    }

    init() {
      // Notifications disabled
    }

    show(message, type = 'success', duration = 3000) {
      // Silent mode - log to console only
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

    // AI Configuration
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

    // AI Keys
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
  // 🤖 AI ENGINE - FULL SUITE
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

    // ========================================================================
    // 🛡️ TIER 1: PROTECTION LAYER
    // ========================================================================

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

        // Check for impossible time values
        if (committed < 0 || committed > 86400) {
          log("🤖 AI: Fixed corrupted daily_committed", committed);
          store(KEYS.DAILY_COMMITTED, Math.max(0, Math.min(86400, committed)));
          this.logAnomaly('data_corruption', 'Invalid daily_committed value', 'auto_fixed');
          fixed = true;
        }

        // Check for negative count
        if (count < 0) {
          log("🤖 AI: Fixed negative count", count);
          store(KEYS.COUNT, 0);
          this.logAnomaly('data_corruption', 'Negative count value', 'auto_fixed');
          fixed = true;
        }

        // Check sessions integrity
        if (!Array.isArray(sessions)) {
          log("🤖 AI: Fixed corrupted sessions array");
          store(KEYS.SESSIONS, []);
          this.logAnomaly('data_corruption', 'Invalid sessions array', 'auto_fixed');
          fixed = true;
        }

        if (fixed) {
          this.stats.auto_fixes++;
        }

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
          // Check for impossible durations
          if (s.duration < 0 || s.duration > 86400) {
            this.logAnomaly('invalid_session', `Impossible duration: ${s.duration}`, 'removed');
            cleaned = true;
            return false;
          }

          // Check for valid dates
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
        // Clean old anomalies (keep last 100)
        if (this.anomalies.length > 100) {
          this.anomalies = this.anomalies.slice(-100);
          store(KEYS.AI_ANOMALIES, this.anomalies);
        }

        // Clean old insights (keep last 50)
        if (this.insights.length > 50) {
          this.insights = this.insights.slice(-50);
          store(KEYS.AI_INSIGHTS, this.insights);
        }

        // Clear DOM cache periodically
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
          // Validate date format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            delete history[date];
            fixed = true;
            continue;
          }

          // Validate value range
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

    // ========================================================================
    // 🧠 TIER 2: LEARNING LAYER
    // ========================================================================

    learn() {
      if (!this.config.learning_enabled) return;

      this.analyzePatterns();
      this.buildUserProfile();
      this.categorizeTasksAutomatically();
      this.learnWorkHabits();

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
              expired: 0,
              typical_time_of_day: []
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

          // Track time of day
          const hour = new Date(session.date).getHours();
          pattern.typical_time_of_day.push(hour);

          // Calculate metrics
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
          most_productive_day: null,
          preferred_task_types: [],
          work_patterns: {
            morning: 0,
            afternoon: 0,
            evening: 0,
            night: 0
          },
          efficiency_score: 0,
          consistency_score: 0
        };

        // Calculate average daily hours
        const daysTracked = Object.keys(history).length;
        if (daysTracked > 0) {
          profile.average_daily_hours = (profile.total_time_worked / daysTracked / 3600).toFixed(2);
        }

        // Find most productive hour
        const hourlyActivity = new Array(24).fill(0);
        sessions.forEach(s => {
          const hour = new Date(s.date).getHours();
          hourlyActivity[hour]++;
        });
        profile.most_productive_hour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

        // Analyze work patterns
        sessions.forEach(s => {
          const hour = new Date(s.date).getHours();
          if (hour >= 6 && hour < 12) profile.work_patterns.morning++;
          else if (hour >= 12 && hour < 18) profile.work_patterns.afternoon++;
          else if (hour >= 18 && hour < 24) profile.work_patterns.evening++;
          else profile.work_patterns.night++;
        });

        // Calculate efficiency score
        const submitted = sessions.filter(s => s.action === 'submitted').length;
        profile.efficiency_score = Math.round((submitted / sessions.length) * 100);

        // Calculate consistency score
        const dailyHours = Object.values(history).map(s => s / 3600);
        if (dailyHours.length > 0) {
          const avgHours = dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length;
          const variance = dailyHours.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / dailyHours.length;
          profile.consistency_score = Math.max(0, 100 - Math.round(variance * 10));
        }

        this.profile = profile;
        store(KEYS.AI_PROFILE, profile);

        log("🤖 AI: Built user profile", profile);
        return profile;
      } catch (e) {
        log("AI profile error", e);
        return {};
      }
    }

    categorizeTasksAutomatically() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        const categories = {};

        const categoryKeywords = {
          'video': ['video', 'clip', 'footage', 'recording'],
          'audio': ['audio', 'sound', 'voice', 'transcription'],
          'image': ['image', 'photo', 'picture', 'visual'],
          'text': ['text', 'document', 'article', 'writing'],
          'annotation': ['annotation', 'label', 'tag', 'classify'],
          'quality': ['quality', 'review', 'verify', 'check']
        };

        sessions.forEach(session => {
          const taskName = (session.taskName || '').toLowerCase();
          let category = 'other';

          for (const [cat, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(kw => taskName.includes(kw))) {
              category = cat;
              break;
            }
          }

          if (!categories[category]) {
            categories[category] = { count: 0, total_time: 0 };
          }

          const catData = categories[category];
          catData.count++;
          if (session.action === 'submitted') {
            catData.total_time += session.duration;
          }
        });

        const topCategories = Object.entries(categories)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([cat]) => cat);

        this.profile.preferred_task_types = topCategories;
        store(KEYS.AI_PROFILE, this.profile);

        return categories;
      } catch (e) {
        log("AI categorize error", e);
        return {};
      }
    }

    learnWorkHabits() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        if (sessions.length < 10) return;

        const habits = {
          typical_session_duration: 0,
          typical_daily_sessions: 0,
          break_frequency: 0,
          most_active_days: [],
          task_switching_frequency: 0
        };

        // Calculate typical session duration
        const submittedSessions = sessions.filter(s => s.action === 'submitted');
        if (submittedSessions.length > 0) {
          const totalDuration = submittedSessions.reduce((sum, s) => sum + s.duration, 0);
          habits.typical_session_duration = Math.round(totalDuration / submittedSessions.length);
        }

        // Group sessions by day
        const sessionsByDay = {};
        sessions.forEach(s => {
          const day = new Date(s.date).toISOString().split('T')[0];
          if (!sessionsByDay[day]) {
            sessionsByDay[day] = [];
          }
          sessionsByDay[day].push(s);
        });

        // Calculate typical daily sessions
        const sessionsPerDay = Object.values(sessionsByDay).map(arr => arr.length);
        if (sessionsPerDay.length > 0) {
          habits.typical_daily_sessions = Math.round(
            sessionsPerDay.reduce((a, b) => a + b, 0) / sessionsPerDay.length
          );
        }

        // Find most active days
        const dayActivity = Object.entries(sessionsByDay)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 3)
          .map(([day]) => day);
        habits.most_active_days = dayActivity;

        this.profile.work_habits = habits;
        store(KEYS.AI_PROFILE, this.profile);

        return habits;
      } catch (e) {
        log("AI habits error", e);
        return {};
      }
    }

    // ========================================================================
    // 🔮 TIER 3: PREDICTIVE LAYER
    // ========================================================================

    predict() {
      if (!this.config.prediction_enabled) return;

      this.predictGoalCompletion();
      this.forecastWeeklyHours();
      this.detectBurnoutRisk();
      this.suggestOptimalTiming();

      this.stats.predictions_made++;
      this.saveState();
    }

    predictGoalCompletion() {
      try {
        const committed = retrieve(KEYS.DAILY_COMMITTED, 0);
        const goal = CONFIG.DAILY_ALERT_HOURS * 3600;

        if (committed >= goal) {
          this.predictions.goal_completion = {
            status: 'completed',
            time: new Date().toISOString(),
            percentage: 100
          };
          return;
        }

        const sessions = retrieve(KEYS.SESSIONS, []);
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySessions = sessions.filter(s =>
          new Date(s.date).toISOString().split('T')[0] === todayStr &&
          s.action === 'submitted'
        );

        if (todaySessions.length === 0) {
          this.predictions.goal_completion = {
            status: 'insufficient_data',
            message: 'Need more sessions today to predict'
          };
          return;
        }

        // Calculate average time per session today
        const avgSessionTime = todaySessions.reduce((sum, s) => sum + s.duration, 0) / todaySessions.length;

        // Calculate time elapsed today
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const hoursElapsed = (now - todayStart) / (1000 * 3600);

        // Calculate pace
        const pace = committed / hoursElapsed;

        // Predict completion time
        const remaining = goal - committed;
        const hoursNeeded = remaining / pace;
        const completionTime = new Date(now.getTime() + hoursNeeded * 3600000);

        this.predictions.goal_completion = {
          status: 'predicted',
          current: committed,
          goal: goal,
          remaining: remaining,
          pace: pace,
          estimated_completion: completionTime.toISOString(),
          estimated_completion_readable: completionTime.toLocaleTimeString(),
          confidence: Math.min(95, 50 + (todaySessions.length * 5))
        };

        store(KEYS.AI_PREDICTIONS, this.predictions);

        return this.predictions.goal_completion;
      } catch (e) {
        log("AI predict goal error", e);
        return null;
      }
    }

    forecastWeeklyHours() {
      try {
        const history = retrieve(KEYS.HISTORY, {});
        const committed = retrieve(KEYS.DAILY_COMMITTED, 0);

        // Get last 7 days
        const last7Days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          last7Days.push(history[dateStr] || 0);
        }
        last7Days[0] = committed;

        const weekTotal = last7Days.reduce((a, b) => a + b, 0);
        const dailyAvg = weekTotal / 7;

        // Forecast remaining week
        const daysLeftInWeek = 7 - new Date().getDay();
        const forecastedWeekTotal = weekTotal + (dailyAvg * daysLeftInWeek);

        this.predictions.weekly_forecast = {
          current_week_total: weekTotal,
          daily_average: dailyAvg,
          days_left: daysLeftInWeek,
          forecasted_total: forecastedWeekTotal,
          forecasted_total_hours: (forecastedWeekTotal / 3600).toFixed(1),
          trend: weekTotal > (dailyAvg * 7 * 0.9) ? 'positive' : 'neutral'
        };

        store(KEYS.AI_PREDICTIONS, this.predictions);

        return this.predictions.weekly_forecast;
      } catch (e) {
        log("AI forecast error", e);
        return null;
      }
    }

    detectBurnoutRisk() {
      try {
        const history = retrieve(KEYS.HISTORY, {});
        const sessions = retrieve(KEYS.SESSIONS, []);

        // Get last 7 days
        const last7Days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          last7Days.push(history[dateStr] || 0);
        }

        const weekTotal = last7Days.reduce((a, b) => a + b, 0);
        const weekHours = weekTotal / 3600;

        // Calculate skip rate
        const last30Sessions = sessions.slice(0, 30);
        const skipRate = last30Sessions.length > 0 ?
          last30Sessions.filter(s => s.action === 'skipped').length / last30Sessions.length : 0;

        let riskLevel = 'low';
        let riskScore = 0;
        const factors = [];

        // Factor 1: Excessive hours
        if (weekHours > 50) {
          riskScore += 30;
          factors.push(`High weekly hours: ${weekHours.toFixed(1)}h`);
        } else if (weekHours > 40) {
          riskScore += 15;
        }

        // Factor 2: High skip rate
        if (skipRate > 0.3) {
          riskScore += 25;
          factors.push(`High skip rate: ${Math.round(skipRate * 100)}%`);
        }

        // Factor 3: Declining productivity
        const firstHalf = last7Days.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const secondHalf = last7Days.slice(4, 7).reduce((a, b) => a + b, 0) / 3;
        if (secondHalf < firstHalf * 0.7) {
          riskScore += 20;
          factors.push('Declining daily productivity');
        }

        if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';

        this.predictions.burnout_risk = {
          level: riskLevel,
          score: riskScore,
          factors: factors,
          recommendation: riskLevel === 'high' ?
            'Consider taking a break. Your work pattern shows signs of burnout risk.' :
            riskLevel === 'medium' ?
            'Monitor your work-life balance. Take regular breaks.' :
            'Your work pattern looks healthy. Keep it up!'
        };

        store(KEYS.AI_PREDICTIONS, this.predictions);

        return this.predictions.burnout_risk;
      } catch (e) {
        log("AI burnout error", e);
        return null;
      }
    }

    suggestOptimalTiming() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        if (sessions.length < 20) return;

        const hourlyPerformance = new Array(24).fill(0).map(() => ({
          count: 0,
          success: 0,
          avg_duration: 0,
          total_duration: 0,
          success_rate: 0
        }));

        sessions.forEach(s => {
          const hour = new Date(s.date).getHours();
          hourlyPerformance[hour].count++;

          if (s.action === 'submitted') {
            hourlyPerformance[hour].success++;
            hourlyPerformance[hour].total_duration += s.duration;
          }
        });

        hourlyPerformance.forEach(h => {
          if (h.count > 0) {
            h.success_rate = (h.success / h.count) * 100;
            h.avg_duration = h.success > 0 ? h.total_duration / h.success : 0;
          }
        });

        const productiveHours = hourlyPerformance
          .map((h, hour) => ({ hour, ...h }))
          .filter(h => h.count >= 3)
          .sort((a, b) => b.success_rate - a.success_rate)
          .slice(0, 3)
          .map(h => ({
            hour: h.hour,
            success_rate: Math.round(h.success_rate),
            avg_duration: Math.round(h.avg_duration)
          }));

        this.predictions.optimal_timing = {
          best_hours: productiveHours,
          recommendation: productiveHours.length > 0 ?
            `Your most productive hours are ${productiveHours.map(h => `${h.hour}:00`).join(', ')}` :
            'Need more data to determine optimal timing'
        };

        store(KEYS.AI_PREDICTIONS, this.predictions);

        return this.predictions.optimal_timing;
      } catch (e) {
        log("AI timing error", e);
        return null;
      }
    }

    // ========================================================================
    // 💡 INSIGHT GENERATION
    // ========================================================================

    generateInsights() {
      try {
        const newInsights = [];

        const patterns = retrieve(KEYS.AI_PATTERNS, {});
        for (const [taskName, pattern] of Object.entries(patterns)) {
          if (pattern.success_rate < 50 && pattern.count > 5) {
            newInsights.push({
              type: 'low_success',
              priority: 'high',
              message: `Task "${taskName}" has low success rate (${pattern.success_rate}%). Consider reviewing your approach.`,
              timestamp: new Date().toISOString()
            });
          }

          if (pattern.avg_duration > 1800 && pattern.submitted > 3) {
            newInsights.push({
              type: 'long_duration',
              priority: 'medium',
              message: `Task "${taskName}" typically takes ${fmt(pattern.avg_duration)}. Consider breaking it into smaller parts.`,
              timestamp: new Date().toISOString()
            });
          }
        }

        if (this.profile.efficiency_score < 70) {
          newInsights.push({
            type: 'low_efficiency',
            priority: 'high',
            message: `Your efficiency score is ${this.profile.efficiency_score}%. Focus on completing tasks rather than skipping.`,
            timestamp: new Date().toISOString()
          });
        }

        if (this.profile.consistency_score < 60) {
          newInsights.push({
            type: 'inconsistent',
            priority: 'medium',
            message: `Your work hours vary significantly. Try maintaining a consistent schedule.`,
            timestamp: new Date().toISOString()
          });
        }

        if (this.predictions.burnout_risk?.level === 'high') {
          newInsights.push({
            type: 'burnout_risk',
            priority: 'critical',
            message: this.predictions.burnout_risk.recommendation,
            timestamp: new Date().toISOString()
          });
        }

        this.insights = [...newInsights, ...this.insights].slice(0, 50);
        store(KEYS.AI_INSIGHTS, this.insights);

        return newInsights;
      } catch (e) {
        log("AI insights error", e);
        return [];
      }
    }

    // ========================================================================
    // ⚡ OPTIMIZATION LAYER
    // ========================================================================

    optimize() {
      if (!this.config.optimization_enabled) return;

      this.optimizePerformance();
      this.adaptiveIntervals();
      this.cleanupOldData();

      this.stats.optimizations++;
      this.saveState();
    }

    optimizePerformance() {
      try {
        const storageSize = JSON.stringify(localStorage).length;
        this.performanceMetrics.memory_usage = (storageSize / 1024).toFixed(2);

        if (storageSize > 5000000) {
          this.performanceMetrics.efficiency = 85;
          this.performanceMetrics.cpu_impact = 'Medium';
        } else if (storageSize > 10000000) {
          this.performanceMetrics.efficiency = 70;
          this.performanceMetrics.cpu_impact = 'High';
          this.cleanupOldData();
        } else {
          this.performanceMetrics.efficiency = 100;
          this.performanceMetrics.cpu_impact = 'Low';
        }

        return this.performanceMetrics;
      } catch (e) {
        log("AI optimize error", e);
        return this.performanceMetrics;
      }
    }

    adaptiveIntervals() {
      try {
        const sessions = retrieve(KEYS.SESSIONS, []);
        const recentSessions = sessions.slice(0, 10);

        if (recentSessions.length >= 8) {
          const timeSinceLastSession = Date.now() - new Date(recentSessions[0].date).getTime();
          if (timeSinceLastSession < 300000) {
            currentCheckInterval = Math.max(500, CONFIG.CHECK_INTERVAL_MS);
            return 'high_frequency';
          }
        }

        currentCheckInterval = CONFIG.CHECK_INTERVAL_MS;
        return 'normal';
      } catch (e) {
        log("AI adaptive error", e);
        return 'normal';
      }
    }

    cleanupOldData() {
      try {
        let cleaned = false;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        this.anomalies = this.anomalies.filter(a =>
          new Date(a.timestamp) > cutoffDate
        );

        if (this.anomalies.length < retrieve(KEYS.AI_ANOMALIES, []).length) {
          store(KEYS.AI_ANOMALIES, this.anomalies);
          cleaned = true;
        }

        this.insights = this.insights.filter(i =>
          new Date(i.timestamp) > cutoffDate
        );

        if (this.insights.length < retrieve(KEYS.AI_INSIGHTS, []).length) {
          store(KEYS.AI_INSIGHTS, this.insights);
          cleaned = true;
        }

        if (cleaned) {
          log("🤖 AI: Cleaned up old data");
        }

        return cleaned;
      } catch (e) {
        log("AI cleanup error", e);
        return false;
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
        this.predict();
        this.optimize();
        this.generateInsights();

        log("🤖 AI cycle completed");
      } catch (e) {
        log("AI run error", e);
      }
    }
  }

  // Initialize AI Engine
  const AI = new AIEngine();

  // Start AI monitoring loop
  if (CONFIG.AI_ENABLED) {
    setInterval(() => {
      AI.run();
    }, CONFIG.AI_CHECK_INTERVAL);

    log("🤖 AI Engine started");

    setTimeout(() => {
      AI.run();
    }, 5000);
  }

  // ============================================================================
  // ⏳ LOADING STATE
  // ============================================================================
  function showLoading(message = 'Loading...') {
    const existing = document.getElementById('sm-loader');
    if (existing) return existing;

    const loader = document.createElement('div');
    loader.id = 'sm-loader';
    loader.innerHTML = `
      <style>
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div class="spinner"></div>
        <div style="font-size: 16px; color: white; font-weight: 600;">${message}</div>
      </div>
    `;
    Object.assign(loader.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '999999999'
    });

    document.body.appendChild(loader);
    return loader;
  }

  function hideLoading() {
    const loader = document.getElementById('sm-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.3s ease';
      setTimeout(() => loader.remove(), 300);
    }
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
        '.cswui-header-name',
        'div.awsui-util-d-ib p'
      ];

      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const text = (el.innerText || el.textContent || "").trim();
          if (text.toLowerCase().includes('task description:')) {
            const extracted = text.replace(/^Task description:\s*/i, '').trim();
            if (extracted.length > 5 && extracted.length < 300) {
              return extracted;
            }
          }
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
      shortest_session: 999999,
      average_task_time: 0,
      most_productive_hour: {},
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
        if (data.duration < analytics.shortest_session && data.duration > 0) {
          analytics.shortest_session = data.duration;
        }
        analytics.average_task_time = Math.floor(
          analytics.total_time_worked / analytics.total_tasks_completed
        );
        const hour = now.getHours();
        analytics.most_productive_hour[hour] = (analytics.most_productive_hour[hour] || 0) + 1;
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
      version: '3.2.1-fixed-no-toast',
      browser: navigator.userAgent.substring(0, 60),
      localStorage_available: !!window.localStorage,
      localStorage_size: (JSON.stringify(localStorage).length / 1024).toFixed(2) + ' KB',
      active_task: activeTask ? 'Yes (' + fmt(activeTask.awsCurrent) + ')' : 'No',
      is_task_page: isTaskPage(),
      daily_committed: fmt(retrieve(KEYS.DAILY_COMMITTED, 0)),
      count: retrieve(KEYS.COUNT, 0),
      sessions_count: (retrieve(KEYS.SESSIONS, []) || []).length,
      history_days: Object.keys(retrieve(KEYS.HISTORY, {})).length,
      last_reset: retrieve(KEYS.LAST_RESET),
      last_backup: retrieve(KEYS.LAST_BACKUP),
      ai_enabled: CONFIG.AI_ENABLED,
      ai_protections: aiStatus.stats.protections_applied,
      ai_anomalies: aiStatus.stats.anomalies_detected,
      ai_patterns: aiStatus.stats.patterns_learned,
      ai_efficiency: aiStatus.performance.efficiency + '%',
      ai_memory: aiStatus.performance.memory_usage + ' KB'
    };

    console.log('=== SAGEMAKER AI-ENHANCED DIAGNOSTICS v3.2.1 ===');
    console.table(diag);
    console.log('=== AI STATUS ===');
    console.log('Profile:', aiStatus.profile);
    console.log('Recent Insights:', aiStatus.insights);
    console.log('Recent Anomalies:', aiStatus.anomalies);
    console.log('Predictions:', aiStatus.predictions);
    console.log('=============================================');

    console.log('✅ Diagnostics complete!');
    return diag;
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
      log("Task page detected by URL");
      return true;
    }

    const awsTimer = parseAWSTimer();
    if (awsTimer) {
      log("Task page detected by AWS timer");
      return true;
    }

    const bodyText = (document.body.innerText || "").toLowerCase();
    if (bodyText.includes("task time") ||
        bodyText.includes("task description") ||
        (bodyText.includes("submit") && bodyText.includes("task"))) {
      log("Task page detected by body text");
      return true;
    }

    return false;
  }

  // ============================================================================
  // SHIELD (DOM NOISE DETECTION)
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
        log("Timer parsed (pattern 1):", fmt(current), "/", fmt(limit));
        return { current, limit, remaining: limit - current };
      }

      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)\s+(?:of|\/)\s+(\d+):(\d+)/i);
      if (m) {
        const current = (+m[1])*60 + (+m[2]);
        const limit = (+m[3])*60 + (+m[4]);
        log("Timer parsed (pattern 2):", fmt(current), "/", fmt(limit));
        return { current, limit, remaining: limit - current };
      }

      m = cleanText.match(/Task\s+time[:\s]+(\d+):(\d+)/i);
      if (m) {
        const current = (+m[1])*60 + (+m[2]);
        log("Timer parsed (pattern 3):", fmt(current));
        return { current, limit: 3600, remaining: 3600 - current };
      }

      m = cleanText.match(/(?:Time|Timer|Duration)[:\s]+(\d+):(\d+)/i);
      if (m) {
        const current = (+m[1])*60 + (+m[2]);
        log("Timer parsed (pattern 4):", fmt(current));
        return { current, limit: 3600, remaining: 3600 - current };
      }

      return null;
    } catch (e) {
      log("parseAWSTimer err", e);
      return null;
    }
  }

  // ============================================================================
  // TASK EXPIRATION CHECK
  // ============================================================================
  function hasTaskExpiredOnPage() {
    try {
      const t = (document.body.innerText || "").toLowerCase();
      if (!t) return false;
      return (t.includes("task has expired") || t.includes("task expired") || t.includes("time is up") || t.includes("time limit") || t.includes("session expired"));
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
    log("✅ New task started:", taskName, fmt(activeTask.awsCurrent));
    return activeTask;
  }

  function updateActiveTaskFromAWS(awsData) {
    if (!activeTask) return startNewTaskFromAWS(awsData);
    const id = getTaskIdFromUrl();
    if (activeTask.id !== id) {
      log("Task ID changed, starting new task");
      activeTask = null;
      return startNewTaskFromAWS(awsData);
    }
    if (typeof awsData.current === "number") {
      if (awsData.current === activeTask.lastAws) {
        activeTask.status = "paused";
      } else if (awsData.current > activeTask.lastAws) {
        activeTask.status = "active";
      }
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
      log(`Daily goal of ${CONFIG.DAILY_ALERT_HOURS} hours reached!`);
    }
  }

  // ============================================================================
  // RESET FUNCTIONALITY
  // ============================================================================
  let resetInProgress = false;

  function performReset(resetType = "both", source = "manual") {
    if (resetInProgress) {
      log("Reset already in progress, skipping");
      return false;
    }

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

      let resetMessage = "";

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
          log(`Active task discarded due to ${source} reset`);
        }
      }

      updateDisplay();
      window.dispatchEvent(new CustomEvent('sm-data-updated'));

      if (source === "manual") {
        console.log(resetMessage);
      }

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
        #sm-reset-dialog { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 999999999; }
        #sm-reset-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
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
  // COMMIT & DISCARD TASKS
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

    log(`✅ Committed ${fmt(finalElapsed)} → total ${fmt(newTotal)} (count ${c})`);

    const id = activeTask.id;
    activeTask = null;
    if (getIgnoreTask() === id) setIgnoreTask(null);

    window.dispatchEvent(new CustomEvent('sm-data-updated'));

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

    log("❌ Discarded", rec);
    const id = activeTask.id;
    activeTask = null;
    try { setIgnoreTask(id); } catch (e) { log("ignore set err", e); }

    window.dispatchEvent(new CustomEvent('sm-data-updated'));
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
              log("Detected submission via fetch");
              commitActiveTask();
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
  let currentCheckInterval = CONFIG.CHECK_INTERVAL_MS;
  let trackingLoopStarted = false;

  function trackOnce() {
    window.__SM_SHIELD.pushDom();
    checkDailyReset();

    const onTaskPage = isTaskPage();

    if (onTaskPage) {
      display.style.display = "flex";

      if (!trackingLoopStarted) {
        log("🚀 Tracking loop activated on task page");
        trackingLoopStarted = true;
      }
    } else {
      display.style.display = "none";
      currentCheckInterval = CONFIG.CHECK_INTERVAL_IDLE;
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

    if (window.__SM_SHIELD.isLikelyVideoNoise() && !awsData) {
      log("Noise skip");
      return;
    }

    if (awsData && activeTask) {
      currentCheckInterval = CONFIG.CHECK_INTERVAL_ACTIVE;
    } else if (!awsData) {
      currentCheckInterval = CONFIG.CHECK_INTERVAL_IDLE;
    }

    const currentTaskId = getTaskIdFromUrl();
    const ignoreId = getIgnoreTask();
    if (ignoreId && ignoreId === currentTaskId) {
      if (lastAWSData && awsData && awsData.current < lastAWSData.current) {
        setIgnoreTask(null);
        log("Clear ignore on reset");
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
    lastTaskIdSeen = currentTaskId;
    updateDisplay();
  }

  // ============================================================================
  // DISPLAY UI
  // ============================================================================
  const FOOTER_SELECTORS = ".cswui-footer, .awsui-footer, #footer-root, .awsui-util-pv-xs.cswui-footer";
  const display = document.createElement("div");
  display.id = "sm-utilization";
  Object.assign(display.style, {
    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
    color: "inherit", fontSize: "inherit", fontFamily: "inherit", opacity: "0.92",
    pointerEvents: "auto", userSelect: "none", whiteSpace: "nowrap", display: "none",
    alignItems: "center", gap: "0px", zIndex: 9999
  });

  const timerContainer = document.createElement("div");
  timerContainer.style.cssText = "display: inline-block; position: relative;";

    const timerTextSpan = document.createElement("span");
  timerTextSpan.id = "sm-timer-text";
  timerTextSpan.textContent = "Utilization: 00:00:00";
  timerContainer.appendChild(timerTextSpan);

  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; margin-top: 2px;
    height: 2px; background: rgba(0,0,0,0.1);
    border-radius: 1px; overflow: hidden;
  `;
  const progressBar = document.createElement("div");
  progressBar.id = "sm-progress-bar";
  progressBar.style.cssText = `
    height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6);
    width: 0%; transition: width 0.5s ease;
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
  let buttonsObserver = null;

  function attachToFooter() {
    if (!isTaskPage()) return;

    const footer = DOMCache.get(FOOTER_SELECTORS, true) || document.body.querySelector("footer") || document.body;
    if (!footer) return;
    if (getComputedStyle(footer).position === "static") footer.style.position = "relative";

    const existingUtil = document.querySelectorAll("#sm-utilization");
    if (existingUtil.length > 1) {
      for (let i = 1; i < existingUtil.length; i++) existingUtil[i].remove();
    }

    if (!footer.contains(display)) footer.appendChild(display);

    if (!display.querySelector("#sm-log-btn")) {
      const btn = document.createElement("button");
      btn.id = "sm-log-btn";
      btn.type = "button";
      btn.title = "Open AI-Enhanced Dashboard (Ctrl+Shift+U)";
      btn.innerHTML = "🤖 AI Dashboard";
      Object.assign(btn.style, {
        marginLeft: "8px", padding: "6px 12px", borderRadius: "6px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
        color: "#fff", border: "none", cursor: "pointer", fontSize: "13px",
        fontWeight: "600", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(139, 92, 246, 0.3)"
      });
      btn.addEventListener("mouseenter", () => { btn.style.transform = "translateY(-2px)"; btn.style.boxShadow = "0 4px 8px rgba(139, 92, 246, 0.4)"; });
      btn.addEventListener("mouseleave", () => { btn.style.transform = "translateY(0)"; btn.style.boxShadow = "0 2px 4px rgba(139, 92, 246, 0.3)"; });
      btn.addEventListener("click", showUltraPremiumDashboard);
      display.appendChild(btn);
    }
  }

  let footerTimer = null;
  function debouncedAttachFooter() {
    clearTimeout(footerTimer);
    footerTimer = setTimeout(attachToFooter, 120);
  }

  footerObserver = new MutationObserver(debouncedAttachFooter);
  footerObserver.observe(document.body, { childList: true, subtree: true });

  function updateDisplay() {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    let pending = 0;
    if (activeTask && (activeTask.status === "active" || activeTask.status === "paused")) {
      pending = activeTask.awsCurrent || 0;
    }
    const total = (committed || 0) + (pending || 0);

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
  }

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
              if (aws && activeTask && activeTask.id === id) {
                updateActiveTaskFromAWS(aws);
                updateDisplay();
              }
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

  buttonsObserver = new MutationObserver(wireTaskActionButtons);
  buttonsObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('beforeunload', () => {
    if (footerObserver) footerObserver.disconnect();
    if (buttonsObserver) buttonsObserver.disconnect();
  });

  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    if ([KEYS.DAILY_COMMITTED, KEYS.COUNT, KEYS.HISTORY, KEYS.LAST_DATE, KEYS.SESSIONS].includes(e.key)) {
      log("storage sync", e.key);
      updateDisplay();
      window.dispatchEvent(new CustomEvent('sm-data-updated'));
    }
  });

  // ============================================================================
  // 💾 AUTO-BACKUP SYSTEM
  // ============================================================================
  function setupAutoBackup() {
    const performBackup = withErrorBoundary(() => {
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
            ai_profile: AI.profile,
            ai_patterns: retrieve(KEYS.AI_PATTERNS, {}),
          }
        };

        try {
          storeCompressed(KEYS.AUTO_BACKUP, backup);
          store(KEYS.LAST_BACKUP, backup.timestamp);
          log('Auto-backup completed at', backup.timestamp);
        } catch (e) {
          log('Auto-backup failed', e);
        }
      }
    }, 'autoBackup');

    setInterval(performBackup, 60 * 60 * 1000);
    setTimeout(performBackup, 5000);
  }

  // ============================================================================
  // ⌨️ KEYBOARD SHORTCUTS
  // ============================================================================
  function showKeyboardShortcuts() {
    const shortcuts = [
      { key: 'Ctrl+Shift+U', desc: 'Open AI Dashboard' },
      { key: 'Ctrl+Shift+R', desc: 'Reset Dialog' },
      { key: 'Ctrl+Shift+E', desc: 'Export JSON' },
      { key: 'Ctrl+Shift+I', desc: 'Import JSON' },
      { key: 'Ctrl+Shift+C', desc: 'Export CSV' },
      { key: 'Ctrl+Shift+A', desc: 'AI Insights' },
      { key: 'Ctrl+Shift+D', desc: 'Diagnostics' },
      { key: 'Ctrl+Shift+/', desc: 'Show Shortcuts' },
      { key: 'Escape', desc: 'Close Dashboard' }
    ];

    const modal = document.createElement('div');
    modal.id = 'sm-shortcuts-modal';
    modal.innerHTML = `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999999;">
        <div style="background: white; padding: 32px; border-radius: 16px; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
          <h3 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
            <span>⌨️</span>
            <span>Keyboard Shortcuts</span>
          </h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${shortcuts.map(s => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 14px; color: #334155;">${s.desc}</span>
                <kbd style="padding: 6px 12px; background: white; border: 2px solid #e2e8f0; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: 600; color: #475569; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${s.key}</kbd>
              </div>
            `).join('')}
          </div>
          <button onclick="this.closest('div').parentElement.remove()"
                  style="margin-top: 24px; width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
            Close (Esc)
          </button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && document.getElementById('sm-shortcuts-modal')) {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });

    document.body.appendChild(modal);
  }

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey) {
      switch(e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          showUltraPremiumDashboard();
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
        case 'a':
          e.preventDefault();
          showAIInsightsModal();
          break;
        case 'd':
          e.preventDefault();
          runDiagnostics();
          break;
        case '/':
        case '?':
          e.preventDefault();
          showKeyboardShortcuts();
          break;
      }
    }
  });

  // ============================================================================
  // 🤖 AI INSIGHTS MODAL (Quick Access)
  // ============================================================================
  function showAIInsightsModal() {
    const aiStatus = AI.getStatus();

    const modal = document.createElement('div');
    modal.id = 'sm-ai-insights-modal';
    modal.innerHTML = `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999999;">
        <div style="background: white; padding: 32px; border-radius: 16px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
          <h3 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
            <span>🤖</span>
            <span>AI Insights</span>
          </h3>

          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 20px; border-radius: 12px; color: white;">
              <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">AI Performance</div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <div>
                  <div style="font-size: 24px; font-weight: 700;">${aiStatus.stats.protections_applied}</div>
                  <div style="font-size: 11px; opacity: 0.8;">Protections</div>
                </div>
                <div>
                  <div style="font-size: 24px; font-weight: 700;">${aiStatus.stats.patterns_learned}</div>
                  <div style="font-size: 11px; opacity: 0.8;">Patterns</div>
                </div>
                <div>
                  <div style="font-size: 24px; font-weight: 700;">${aiStatus.performance.efficiency}%</div>
                  <div style="font-size: 11px; opacity: 0.8;">Efficiency</div>
                </div>
              </div>
            </div>

            <div>
              <div style="font-weight: 700; margin-bottom: 12px; font-size: 16px;">💡 Recent Insights</div>
              ${aiStatus.insights.length > 0 ? aiStatus.insights.map(insight => `
                <div style="padding: 12px; background: #f8fafc; border-left: 3px solid ${
                  insight.priority === 'critical' ? '#ef4444' :
                  insight.priority === 'high' ? '#f59e0b' :
                  insight.priority === 'medium' ? '#3b82f6' : '#10b981'
                }; border-radius: 6px; margin-bottom: 8px;">
                  <div style="font-size: 13px; color: #334155;">${insight.message}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${new Date(insight.timestamp).toLocaleString()}</div>
                </div>
              `).join('') : '<div style="text-align: center; padding: 20px; color: #64748b;">No insights yet. Keep working!</div>'}
            </div>

            ${aiStatus.predictions.goal_completion ? `
            <div>
              <div style="font-weight: 700; margin-bottom: 12px; font-size: 16px;">🎯 Goal Prediction</div>
              <div style="padding: 16px; background: #dbeafe; border-radius: 12px;">
                <div style="font-size: 14px; color: #1e40af; margin-bottom: 8px;">
                  Estimated completion: <strong>${aiStatus.predictions.goal_completion.estimated_completion_readable || 'Calculating...'}</strong>
                </div>
                <div style="font-size: 12px; color: #1e40af;">
                  Confidence: ${aiStatus.predictions.goal_completion.confidence || 0}%
                </div>
              </div>
            </div>
            ` : ''}

            ${aiStatus.anomalies.length > 0 ? `
            <div>
              <div style="font-weight: 700; margin-bottom: 12px; font-size: 16px;">⚠️ Recent Anomalies</div>
              ${aiStatus.anomalies.map(anomaly => `
                <div style="padding: 10px; background: #fef3c7; border-radius: 6px; margin-bottom: 6px; font-size: 13px; color: #92400e;">
                  ${anomaly.description} - <strong>${anomaly.action}</strong>
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>

          <button onclick="this.closest('div').parentElement.remove()"
                  style="margin-top: 24px; width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
            Close
          </button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  // ============================================================================
  // 📥 IMPORT FUNCTIONALITY
  // ============================================================================
  function dashboardImportJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = withErrorBoundary((e) => {
      const file = e.target.files[0];
      if (!file) return;

      const loader = showLoading('Importing data...');

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

          hideLoading();
          console.log('✅ Import successful!');

          if (CONFIG.AI_ENABLED) {
            setTimeout(() => AI.run(), 1000);
          }

          if (document.getElementById('sm-ultra-dashboard')) {
            forceRefresh();
          }
        } catch (err) {
          hideLoading();
          console.error('❌ Import failed:', err.message);
        }
      };

      reader.onerror = () => {
        hideLoading();
        console.error('❌ Failed to read file');
      };

      reader.readAsText(file);
    }, 'dashboardImportJSON');

    input.click();
  }

  // ============================================================================
  // 📤 CSV EXPORT
  // ============================================================================
  function dashboardExportCSV() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];

    if (sessions.length === 0) {
      console.log('No data to export');
      return;
    }

    const headers = ['Date', 'Time', 'Task Name', 'Duration (seconds)', 'Duration (formatted)', 'Action', 'Status'];

    const rows = sessions.map(s => {
      const date = new Date(s.date);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        (s.taskName || 'Unknown').replace(/,/g, ';'),
        s.duration || 0,
        fmt(s.duration || 0),
        s.action || 'unknown',
        'logged'
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

    console.log('✅ CSV exported successfully');
  }

  // ============================================================================
  // 📊 DASHBOARD - AGGREGATION FUNCTIONS
  // ============================================================================
  function aggregateTaskData() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const taskMap = new Map();

    sessions.forEach(session => {
      const taskName = session.taskName || "Unknown Task";

      if (!taskMap.has(taskName)) {
        taskMap.set(taskName, {
          taskName: taskName,
          totalTime: 0,
          totalSessions: 0,
          submitted: 0,
          skipped: 0,
          expired: 0,
          lastWorked: null,
          sessions: []
        });
      }

      const task = taskMap.get(taskName);

      if (session.action === 'submitted') {
        task.totalTime += (session.duration || 0);
      }

      task.totalSessions++;
      task.sessions.push(session);

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

  function aggregateTodayTaskData() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const todayStr = new Date().toISOString().split('T')[0];

    const todaySessions = sessions.filter(s => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate === todayStr;
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
                lastWorked: null,
                sessions: []
            });
        }

        const task = taskMap.get(taskName);

        if (session.action === 'submitted') {
            task.totalTime += (session.duration || 0);
        }

        task.totalSessions++;
        task.sessions.push(session);

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

  // ============================================================================
  // 📄 PAGINATION HELPER
  // ============================================================================
  function createPagination(totalItems, currentPage, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return '';

    let paginationHTML = '<div class="pagination-container">';

    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}"
                data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            ← Previous
        </button>
    `;

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                    data-page="${i}">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            Next →
        </button>
    `;

    paginationHTML += '</div>';

    return paginationHTML;
  }

  let todayTasksPage = 1;
  let queueAnalysisPage = 1;
  let historyPage = 1;
  const ITEMS_PER_PAGE = 5;
  const HISTORY_ITEMS_PER_PAGE = 20;

  let cachedData = {
      dailyCommitted: 0,
      count: 0,
      sessionsLength: 0,
      lastUpdate: 0
  };

  function loadChartJS() {
    return new Promise((resolve, reject) => {
      if (window.Chart) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ============================================================================
  // 💎 DASHBOARD MAIN FUNCTION (FIXED FOR EMPTY TABLES)
  // ============================================================================
  function showUltraPremiumDashboard() {
    const existing = document.getElementById('sm-ultra-dashboard');
    if (existing) {
      existing.remove();
    }

    // FORCE DATA REFRESH BEFORE RENDERING
    updateCachedData();

    const root = document.createElement('div');
    root.id = 'sm-ultra-dashboard';
    root.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        :root {
          --primary: #6366f1;
          --primary-dark: #4f46e5;
          --secondary: #8b5cf6;
          --accent: #ec4899;
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;
          --dark: #0f172a;
          --dark-light: #1e293b;
          --gray-50: #f8fafc;
          --gray-100: #f1f5f9;
          --gray-200: #e2e8f0;
          --gray-300: #cbd5e1;
          --gray-400: #94a3b8;
          --gray-500: #64748b;
          --gray-600: #475569;
          --gray-700: #334155;
          --gray-800: #1e293b;
          --gray-900: #0f172a;
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.18);
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        [data-theme="dark"] {
          --gray-50: #1e293b;
          --gray-100: #334155;
          --gray-200: #475569;
          --gray-300: #64748b;
          --gray-400: #94a3b8;
          --gray-500: #cbd5e1;
          --gray-600: #e2e8f0;
          --gray-700: #f1f5f9;
          --gray-800: #f8fafc;
          --gray-900: #ffffff;
          --glass-bg: rgba(30, 41, 59, 0.7);
          --glass-border: rgba(255, 255, 255, 0.1);
        }

        #sm-ultra-dashboard {
          position: fixed;
          inset: 0;
          z-index: 999999;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          animation: fadeIn 0.3s ease;
          overflow: hidden;
        }

        [data-theme="dark"] #sm-ultra-dashboard {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .dashboard-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dashboard-header {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--glass-border);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: var(--shadow-md);
          animation: slideDown 0.4s ease;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .dashboard-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dashboard-title h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-badge {
          padding: 4px 12px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: var(--shadow);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .theme-toggle {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 18px;
        }

        .theme-toggle:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .header-btn {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          box-shadow: var(--shadow);
        }

        .header-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .header-btn-ghost {
          background: var(--glass-bg);
          color: var(--gray-700);
          border: 1px solid var(--glass-border);
        }

        .header-btn-ghost:hover {
          background: var(--gray-100);
        }

        .close-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border: none;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: var(--danger);
          color: white;
          transform: rotate(90deg);
        }

        .dashboard-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .dashboard-sidebar {
          width: 280px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          padding: 20px 0;
          animation: slideUp 0.4s ease;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 16px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 8px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-600);
          transition: all 0.2s;
          position: relative;
        }

        .nav-item:hover {
          background: var(--gray-100);
          color: var(--gray-900);
          transform: translateX(4px);
        }

        .nav-item.active {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          box-shadow: var(--shadow-md);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: white;
          border-radius: 0 4px 4px 0;
        }

        .nav-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--glass-border);
        }

        .productivity-score {
          background: linear-gradient(135deg, var(--success), #059669);
          padding: 20px;
          border-radius: 16px;
          color: white;
          text-align: center;
          box-shadow: var(--shadow-md);
        }

        .productivity-score-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .productivity-score-value {
          font-size: 48px;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 8px;
        }

        .productivity-score-change {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.9;
        }

        .dashboard-main {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: transparent;
        }

        .dashboard-main::-webkit-scrollbar {
          width: 8px;
        }

        .dashboard-main::-webkit-scrollbar-track {
          background: transparent;
        }

        .dashboard-main::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 10px;
        }

        .dashboard-main::-webkit-scrollbar-thumb:hover {
          background: var(--gray-400);
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
          animation: slideUp 0.5s ease;
        }

        .kpi-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-md);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
          opacity: 0.05;
          transition: all 0.3s;
        }

        .kpi-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
        }

        .kpi-card:hover::before {
          opacity: 0.1;
          transform: scale(1.2);
        }

        .kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .kpi-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-600);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          box-shadow: var(--shadow);
        }

        .kpi-value {
          font-size: 42px;
          font-weight: 900;
          color: var(--gray-900);
          line-height: 1;
          margin-bottom: 12px;
        }

        .kpi-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .kpi-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .kpi-change.positive {
          color: var(--success);
        }

        .kpi-change.negative {
          color: var(--danger);
        }

        .card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-md);
          margin-bottom: 24px;
          animation: scaleIn 0.4s ease;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--gray-200);
        }

        .card-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--gray-900);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .search-box {
          padding: 10px 16px;
          border: 2px solid var(--gray-300);
          border-radius: 10px;
          font-size: 14px;
          width: 280px;
          transition: all 0.2s;
          background: white;
        }

        .search-box:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--gray-200);
        }

        table.ultra-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: white;
        }

        table.ultra-table thead th {
          padding: 14px 16px;
          text-align: left;
          font-weight: 700;
          color: var(--gray-700);
          background: var(--gray-50);
          border-bottom: 2px solid var(--gray-200);
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        table.ultra-table thead th:hover {
          background: var(--gray-100);
          color: var(--gray-900);
        }

        table.ultra-table thead th.sortable::after {
          content: '⇅';
          margin-left: 8px;
          opacity: 0.3;
          font-size: 12px;
        }

        table.ultra-table thead th.sort-asc::after {
          content: '↑';
          opacity: 1;
          color: var(--primary);
        }

        table.ultra-table thead th.sort-desc::after {
          content: '↓';
          opacity: 1;
          color: var(--primary);
        }

        table.ultra-table tbody td {
          padding: 16px;
          border-bottom: 1px solid var(--gray-100);
          color: var(--gray-700);
        }

        table.ultra-table tbody tr {
          transition: all 0.2s;
        }

        table.ultra-table tbody tr:hover {
          background: var(--gray-50);
          transform: scale(1.01);
          box-shadow: var(--shadow-sm);
        }

        table.ultra-table tbody tr:last-child td {
          border-bottom: none;
        }

        .badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-info {
          background: #dbeafe;
          color: #1e40af;
        }

        .chart-container {
          height: 400px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--gray-200);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--gray-500);
        }

        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--gray-700);
          margin-bottom: 8px;
        }

        .empty-state-description {
          font-size: 14px;
          color: var(--gray-500);
        }

        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          padding: 16px;
        }

        .pagination-btn {
          padding: 8px 14px;
          border: 1px solid var(--gray-300);
          background: white;
          color: var(--gray-700);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          min-width: 40px;
        }

        .pagination-btn:hover:not(.disabled):not(.active) {
          background: var(--gray-100);
          border-color: var(--gray-400);
        }

        .pagination-btn.active {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border-color: var(--primary);
        }

        .pagination-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-dots {
          padding: 0 8px;
          color: var(--gray-400);
          font-weight: 600;
        }

        .progress-ring-container {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 160px;
          height: 160px;
          margin: 20px auto;
        }

        .progress-ring {
          transform: rotate(-90deg);
        }

        .progress-ring-circle {
          fill: none;
          stroke-width: 12;
          transition: stroke-dashoffset 0.5s ease;
        }

        .progress-ring-bg {
          stroke: var(--gray-200);
        }

        .progress-ring-fill {
          stroke: url(#progress-gradient);
          stroke-linecap: round;
        }

        .progress-ring-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-ring-value {
          font-size: 32px;
          font-weight: 900;
          color: var(--gray-900);
        }

        .progress-ring-label {
          font-size: 12px;
          color: var(--gray-600);
          font-weight: 600;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 20px;
        }

        .comparison-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 2px solid var(--gray-200);
        }

        .comparison-card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-600);
          margin-bottom: 12px;
        }

        .comparison-card-value {
          font-size: 32px;
          font-weight: 900;
          color: var(--gray-900);
          margin-bottom: 8px;
        }

        .comparison-card-change {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size:14px;
          font-weight: 600;
        }

        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(24, 1fr);
          gap: 4px;
          margin-top: 16px;
        }

        .heatmap-cell {
          aspect-ratio: 1;
          border-radius: 4px;
          transition: all 0.2s;
          cursor: pointer;
          position: relative;
        }

        .heatmap-cell:hover {
          transform: scale(1.2);
          z-index: 10;
          box-shadow: var(--shadow-md);
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          font-size: 12px;
          color: var(--gray-600);
        }

        .heatmap-legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .heatmap-legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        [data-theme="dark"] table.ultra-table,
        [data-theme="dark"] .card,
        [data-theme="dark"] .kpi-card,
        [data-theme="dark"] .table-wrapper,
        [data-theme="dark"] .chart-container {
            background: #0f172a !important;
            color: #e6f0ff !important;
        }

        [data-theme="dark"] table.ultra-table thead th,
        [data-theme="dark"] table.ultra-table tbody td {
            color: #e2e8f0 !important;
            background: transparent !important;
            border-color: #273449 !important;
        }

        [data-theme="dark"] .card-title,
        [data-theme="dark"] .kpi-value,
        [data-theme="dark"] .kpi-label {
            color: #f1f5f9 !important;
        }

        [data-theme="dark"] input,
        [data-theme="dark"] .search-box {
            background: #071026 !important;
            color: #f8fafc !important;
            border-color: #1f2a3a !important;
        }

        [data-theme="dark"] table.ultra-table tbody tr:hover {
            background: rgba(255,255,255,0.02) !important;
        }

        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .comparison-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-sidebar {
            position: absolute;
            left: -280px;
            height: 100%;
            z-index: 100;
            transition: left 0.3s;
          }
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <div class="dashboard-container" data-theme="light">
        <div class="dashboard-header">
          <div class="header-left">
            <div class="dashboard-title">
              <h1>🤖 AI-Enhanced Dashboard</h1>
              <span class="header-badge">v3.2.1 Fixed</span>
            </div>
          </div>
          <div class="header-actions">
            <div class="theme-toggle" id="theme-toggle" title="Toggle Dark Mode">🌙</div>
            <button class="header-btn header-btn-ghost" id="refresh-btn">🔄 Refresh</button>
            <button class="header-btn header-btn-primary" id="export-btn">💾 Export</button>
            <button class="close-btn" id="close-dashboard">✕</button>
          </div>
        </div>

        <div class="dashboard-body">
          <div class="dashboard-sidebar">
            <div class="sidebar-nav" id="sidebar-nav">
              <div class="nav-item active" data-page="overview">
                <span class="nav-icon">📊</span>
                <span>Overview</span>
              </div>
              <div class="nav-item" data-page="ai">
                <span class="nav-icon">🤖</span>
                <span>AI Insights</span>
              </div>
              <div class="nav-item" data-page="queue">
                <span class="nav-icon">📋</span>
                <span>Queue Tasks</span>
              </div>
              <div class="nav-item" data-page="analytics">
                <span class="nav-icon">📈</span>
                <span>Analytics</span>
              </div>
              <div class="nav-item" data-page="productivity">
                <span class="nav-icon">🎯</span>
                <span>Productivity</span>
              </div>
              <div class="nav-item" data-page="history">
                <span class="nav-icon">📜</span>
                <span>History</span>
              </div>
              <div class="nav-item" data-page="settings">
                <span class="nav-icon">⚙️</span>
                <span>Settings</span>
              </div>
            </div>
            <div class="sidebar-footer">
              <div class="productivity-score">
                <div class="productivity-score-label">Productivity Score</div>
                <div class="productivity-score-value" id="productivity-score-value">85</div>
                <div class="productivity-score-change">↑ AI-Powered</div>
              </div>
            </div>
          </div>

          <div class="dashboard-main" id="dashboard-main">
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    initUltraDashboard(root);
  }

    // ============================================================================
  // DASHBOARD INITIALIZATION (CONTINUED)
  // ============================================================================
  function initUltraDashboard(root) {
    const themeToggle = root.querySelector('#theme-toggle');
    const container = root.querySelector('.dashboard-container');
    let currentTheme = retrieve(KEYS.PREFERENCES, {}).theme || 'light';

    container.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        container.setAttribute('data-theme', currentTheme);
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

        const prefs = retrieve(KEYS.PREFERENCES, {});
        prefs.theme = currentTheme;
        store(KEYS.PREFERENCES, prefs);
    });

    root.querySelector('#close-dashboard').addEventListener('click', () => {
        root.remove();
        document.removeEventListener('keydown', handleEscKey);
        window.removeEventListener('sm-data-updated', smartDataUpdateHandler);
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });

    const handleEscKey = (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            const dashboard = document.getElementById('sm-ultra-dashboard');
            if (dashboard) {
                dashboard.remove();
                document.removeEventListener('keydown', handleEscKey);
                window.removeEventListener('sm-data-updated', smartDataUpdateHandler);
                if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            }
        }
    };
    document.addEventListener('keydown', handleEscKey);

    root.querySelector('#refresh-btn').addEventListener('click', () => {
        forceRefresh();
    });

    root.querySelector('#export-btn').addEventListener('click', () => {
        dashboardExportJSON();
    });

    root.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            root.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const page = item.dataset.page;
            renderPage(page);
        });
    });

    renderPage('overview');
    updateCachedData();

    const smartDataUpdateHandler = () => {
        if (document.getElementById('sm-ultra-dashboard') && hasDataChanged()) {
            smartUpdate();
        }
    };

    window.addEventListener('sm-data-updated', smartDataUpdateHandler);

    let autoRefreshInterval = setInterval(() => {
        if (document.getElementById('sm-ultra-dashboard') && hasDataChanged()) {
            smartUpdate();
        }
    }, 30000);
  }

  function hasDataChanged() {
    const currentCommitted = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const currentCount = retrieve(KEYS.COUNT, 0) || 0;
    const currentSessions = (retrieve(KEYS.SESSIONS, []) || []).length;

    return (
        cachedData.dailyCommitted !== currentCommitted ||
        cachedData.count !== currentCount ||
        cachedData.sessionsLength !== currentSessions
    );
  }

  function updateCachedData() {
    cachedData = {
        dailyCommitted: retrieve(KEYS.DAILY_COMMITTED, 0) || 0,
        count: retrieve(KEYS.COUNT, 0) || 0,
        sessionsLength: (retrieve(KEYS.SESSIONS, []) || []).length,
        lastUpdate: Date.now()
    };
  }

  function smartUpdate() {
    const mainContent = document.querySelector('#dashboard-main');
    if (!mainContent) return;

    updateProductivityScore();

    switch(currentPage) {
        case 'overview':
            smartUpdateOverview();
            break;
        case 'queue':
            smartUpdateQueueTasks();
            break;
        case 'history':
            smartUpdateHistory();
            break;
    }

    updateCachedData();
  }

  function smartUpdateOverview() {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;

    const kpiValues = document.querySelectorAll('.kpi-value');
    if (kpiValues[0]) {
        smoothUpdateText(kpiValues[0], fmt(committed));
    }

    const countElements = document.querySelectorAll('.kpi-meta span');
    countElements.forEach(el => {
        if (el.textContent.includes('submissions')) {
            smoothUpdateText(el, `${count} submissions`);
        }
    });
  }

  function smartUpdateQueueTasks() {
    const todayTaskData = aggregateTodayTaskData();
    const tbody = document.getElementById('today-tasks-tbody');

    if (tbody && todayTaskData.length > 0) {
        const currentRowCount = tbody.querySelectorAll('tr').length;
        const expectedRowCount = Math.min(todayTaskData.length, ITEMS_PER_PAGE);

        if (currentRowCount !== expectedRowCount) {
            renderTodayTasksTable();
        }
    }

    const queueTbody = document.getElementById('queue-tbody');
    if (queueTbody) {
        const allTimeTaskData = aggregateTaskData();
        const currentRowCount = queueTbody.querySelectorAll('tr').length;
        const expectedRowCount = Math.min(allTimeTaskData.length, ITEMS_PER_PAGE);

        if (currentRowCount !== expectedRowCount) {
            renderQueueTable();
        }
    }
  }

  function smartUpdateHistory() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const tbody = document.getElementById('history-tbody');

    if (tbody) {
        const currentRowCount = tbody.querySelectorAll('tr').length;
        const expectedRowCount = Math.min(sessions.length, HISTORY_ITEMS_PER_PAGE);

        if (currentRowCount !== expectedRowCount) {
            renderHistoryTable();
        }
    }
  }

  function smoothUpdateText(element, newText) {
    if (element.textContent !== newText) {
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0.7';

        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = '1';
        }, 100);
    }
  }

  function forceRefresh() {
    updateCachedData();
    renderCurrentPage();
    console.log('Dashboard refreshed');
  }

  let currentPage = 'overview';
  let isRendering = false;

  function renderCurrentPage() {
    if (isRendering) return;
    renderPage(currentPage);
  }

  function renderPage(page) {
    if (isRendering) return;

    isRendering = true;
    currentPage = page;
    const mainContent = document.querySelector('#dashboard-main');
    if (!mainContent) {
        isRendering = false;
        return;
    }

    mainContent.style.transition = 'opacity 0.15s ease';
    mainContent.style.opacity = '0.7';

    setTimeout(() => {
        try {
            switch(page) {
                case 'overview':
                    renderOverviewPage(mainContent);
                    break;
                case 'ai':
                    renderAIPage(mainContent);
                    break;
                case 'queue':
                    renderQueueTasksPage(mainContent);
                    break;
                case 'analytics':
                    renderAnalyticsPage(mainContent);
                    break;
                case 'productivity':
                    renderProductivityPage(mainContent);
                    break;
                case 'history':
                    renderHistoryPage(mainContent);
                    break;
                case 'settings':
                    renderSettingsPage(mainContent);
                    break;
            }

            updateProductivityScore();
            mainContent.style.opacity = '1';
        } finally {
            isRendering = false;
        }
    }, 150);
  }

  function calculateProductivityScore() {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const analytics = retrieve(KEYS.ANALYTICS, {});
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;

    let score = 50;

    const totalTasks = sessions.length;
    const completed = sessions.filter(s => s.action === 'submitted').length;
    if (totalTasks > 0) {
        score += (completed / totalTasks) * 25;
    }

    const avgTime = analytics.average_task_time || 0;
    if (avgTime > 0 && avgTime < 600) {
        score += 25;
    } else if (avgTime < 1200) {
        score += 15;
    } else if (avgTime < 1800) {
        score += 10;
    }

    if (committed > CONFIG.DAILY_ALERT_HOURS * 3600) {
        score += 25;
    } else {
        score += (committed / (CONFIG.DAILY_ALERT_HOURS * 3600)) * 25;
    }

    const expiredTasks = sessions.filter(s => s.action === 'expired').length;
    if (totalTasks > 0) {
        const qualityRate = 1 - (expiredTasks / totalTasks);
        score += qualityRate * 25;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  function updateProductivityScore() {
    const scoreEl = document.getElementById('productivity-score-value');
    if (scoreEl) {
        const score = calculateProductivityScore();
        smoothUpdateText(scoreEl, score.toString());
    }
  }

  function calculateStreak() {
    const history = retrieve(KEYS.HISTORY, {}) || {};
    const dates = Object.keys(history).sort().reverse();

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const checkStr = checkDate.toISOString().split('T')[0];

        if (history[checkStr] && history[checkStr] > 0) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
  }

  // ============================================================================
  // RENDER PAGE FUNCTIONS
  // ============================================================================
  function renderOverviewPage(container) {
    const committed = retrieve(KEYS.DAILY_COMMITTED, 0) || 0;
    const count = retrieve(KEYS.COUNT, 0) || 0;
    const sessions = retrieve(KEYS.SESSIONS, []) || [];
    const history = retrieve(KEYS.HISTORY, {}) || {};

    const totalTime = Object.values(history).reduce((a,b)=>a+b,0);
    const uniqueTasks = new Set(sessions.map(s => s.taskName || 'Unknown')).size;

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
    const weekSessions = sessions.filter(s => new Date(s.date) >= weekAgo);
    const weekTotal = weekSessions.filter(s => s.action === 'submitted').reduce((a,b)=>a+b.duration,0);

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayTime = history[yesterdayStr] || 0;
    const todayChange = yesterdayTime > 0 ? Math.round(((committed - yesterdayTime) / yesterdayTime) * 100) : 0;

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">Today's Progress</div>
            <div class="kpi-icon">⏱️</div>
          </div>
          <div class="kpi-value">${fmt(committed)}</div>
          <div class="kpi-meta">
            <span>${count} submissions</span>
            <span class="kpi-change ${todayChange >= 0 ? 'positive' : 'negative'}">
              ${todayChange >= 0 ? '↑' : '↓'} ${Math.abs(todayChange)}%
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">Total Time</div>
            <div class="kpi-icon">📊</div>
          </div>
          <div class="kpi-value">${(totalTime/3600).toFixed(1)}h</div>
          <div class="kpi-meta">
            <span>${Object.keys(history).length} days tracked</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">Unique Tasks</div>
            <div class="kpi-icon">📋</div>
          </div>
          <div class="kpi-value">${uniqueTasks}</div>
          <div class="kpi-meta">
            <span>${sessions.length} total sessions</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">This Week</div>
            <div class="kpi-icon">📈</div>
          </div>
          <div class="kpi-value">${fmt(weekTotal)}</div>
          <div class="kpi-meta">
            <span>${weekSessions.length} sessions</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">📈 30-Day Trend</div>
          </div>
          <div class="chart-container">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🎯 Goal Progress</div>
          </div>
          <div class="progress-ring-container">
            <svg class="progress-ring" width="160" height="160">
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                </linearGradient>
              </defs>
              <circle class="progress-ring-circle progress-ring-bg" cx="80" cy="80" r="70"></circle>
              <circle class="progress-ring-circle progress-ring-fill" cx="80" cy="80" r="70"
                      id="progress-circle"></circle>
            </svg>
            <div class="progress-ring-text">
              <div class="progress-ring-value" id="progress-percent">0%</div>
              <div class="progress-ring-label">of ${CONFIG.DAILY_ALERT_HOURS}h goal</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Comparison Analysis</div>
        </div>
        <div class="comparison-grid">
          <div class="comparison-card">
            <div class="comparison-card-title">Today vs Yesterday</div>
            <div class="comparison-card-value">${fmt(committed)}</div>
            <div class="comparison-card-change ${todayChange >= 0 ? 'positive' : 'negative'}">
              ${todayChange >= 0 ? '↑' : '↓'} ${Math.abs(todayChange)}% (${fmt(yesterdayTime)} yesterday)
            </div>
          </div>
          <div class="comparison-card">
            <div class="comparison-card-title">This Week vs Last Week</div>
            <div class="comparison-card-value">${fmt(weekTotal)}</div>
            <div class="comparison-card-change positive">
              ↑ Active tracking
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📝 Recent Sessions</div>
        </div>
        <div class="table-wrapper">
          <table class="ultra-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Task Name</th>
                <th>Duration</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sessions.slice(0, 10).map(s => `
                <tr>
                  <td style="font-size:12px;">${new Date(s.date).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}</td>
                  <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;font-weight:600;"
                      title="${s.taskName||'Unknown'}">${s.taskName||'Unknown'}</td>
                  <td style="font-weight:700;font-size:15px;">${fmt(s.duration)}</td>
                  <td><span class="badge ${s.action==='submitted'?'badge-success':s.action==='skipped'?'badge-warning':'badge-danger'}">${s.action}</span></td>
                  <td><span class="badge badge-info">Logged</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    setTimeout(() => {
        drawTrendChart(history);
        drawProgressRing(committed);
    }, 100);
  }

  function drawTrendChart(history) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas || !window.Chart) return;

    const days = 30;
    const data = [], labels = [];
    for (let i = days-1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(key.slice(5));
        data.push((history[key] || 0) / 3600);
    }

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Hours Worked',
                data,
                fill: true,
                tension: 0.4,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 12 } }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 11 } }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
  }

  function drawProgressRing(committed) {
    const circle = document.getElementById('progress-circle');
    const percentEl = document.getElementById('progress-percent');
    if (!circle || !percentEl) return;

    const targetSeconds = CONFIG.DAILY_ALERT_HOURS * 3600;
    const percent = Math.min(100, (committed / targetSeconds) * 100);

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;

    percentEl.textContent = Math.round(percent) + '%';
  }

  // ============================================================================
  // 🤖 AI INSIGHTS PAGE
  // ============================================================================
  function renderAIPage(container) {
    const aiStatus = AI.getStatus();

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">🛡️ Protections</div>
            <div class="kpi-icon">🛡️</div>
          </div>
          <div class="kpi-value">${aiStatus.stats.protections_applied}</div>
          <div class="kpi-meta">
            <span>Auto-fixes applied</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">🧠 Patterns</div>
            <div class="kpi-icon">🧠</div>
          </div>
          <div class="kpi-value">${aiStatus.stats.patterns_learned}</div>
          <div class="kpi-meta">
            <span>Patterns learned</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">⚡ Efficiency</div>
            <div class="kpi-icon">⚡</div>
          </div>
          <div class="kpi-value">${aiStatus.performance.efficiency}%</div>
          <div class="kpi-meta">
            <span>${aiStatus.performance.memory_usage} KB memory</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">⚠️ Anomalies</div>
            <div class="kpi-icon">⚠️</div>
          </div>
          <div class="kpi-value">${aiStatus.stats.anomalies_detected}</div>
          <div class="kpi-meta">
            <span>Issues detected</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">👤 Your Work Profile</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div style="padding: 20px; background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px;">
            <div style="font-size: 13px; color: #1e40af; margin-bottom: 8px;">Efficiency Score</div>
            <div style="font-size: 32px; font-weight: 900; color: #1e3a8a;">${aiStatus.profile.efficiency_score || 0}%</div>
          </div>
          <div style="padding: 20px; background: linear-gradient(135deg, #fef3c7, #fef08a); border-radius: 12px;">
            <div style="font-size: 13px; color: #92400e; margin-bottom: 8px;">Consistency Score</div>
            <div style="font-size: 32px; font-weight: 900; color: #78350f;">${aiStatus.profile.consistency_score || 0}%</div>
          </div>
          <div style="padding: 20px; background: linear-gradient(135deg, #d1fae5, #a7f3d0); border-radius: 12px;">
            <div style="font-size: 13px; color: #065f46; margin-bottom: 8px;">Peak Hour</div>
            <div style="font-size: 32px; font-weight: 900; color: #064e3b;">${aiStatus.profile.most_productive_hour || 0}:00</div>
          </div>
        </div>
      </div>

      ${aiStatus.predictions.goal_completion ? `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔮 AI Predictions</div>
        </div>
        <div style="padding: 24px; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); border-radius: 16px;">
          <div style="font-size: 18px; font-weight: 700; color: #3730a3; margin-bottom: 12px;">
            Goal Completion Forecast
          </div>
          <div style="font-size: 14px; color: #4338ca; margin-bottom: 8px;">
            📅 Estimated completion: <strong>${aiStatus.predictions.goal_completion.estimated_completion_readable || 'Calculating...'}</strong>
          </div>
          <div style="font-size: 14px; color: #4338ca; margin-bottom: 8px;">
            🎯 Current pace: <strong>${fmt(aiStatus.predictions.goal_completion.pace || 0)}/hour</strong>
          </div>
          <div style="font-size: 14px; color: #4338ca;">
            💪 Confidence: <strong>${aiStatus.predictions.goal_completion.confidence || 0}%</strong>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <div class="card-title">💡 AI Insights</div>
        </div>
        ${aiStatus.insights.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${aiStatus.insights.map(insight => `
              <div style="padding: 16px; background: ${
                insight.priority === 'critical' ? '#fee2e2' :
                insight.priority === 'high' ? '#fef3c7' :
                insight.priority === 'medium' ? '#dbeafe' : '#d1fae5'
              }; border-left: 4px solid ${
                insight.priority === 'critical' ? '#ef4444' :
                insight.priority === 'high' ? '#f59e0b' :
                insight.priority === 'medium' ? '#3b82f6' : '#10b981'
              }; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 20px;">${
                    insight.priority === 'critical' ? '🚨' :
                    insight.priority === 'high' ? '⚠️' :
                    insight.priority === 'medium' ? '💡' : '✨'
                  }</span>
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${
                    insight.priority === 'critical' ? '#991b1b' :
                    insight.priority === 'high' ? '#92400e' :
                    insight.priority === 'medium' ? '#1e40af' : '#065f46'
                  };">${insight.priority}</span>
                </div>
                <div style="font-size: 14px; color: #334155; margin-bottom: 6px;">${insight.message}</div>
                <div style="font-size: 11px; color: #64748b;">${new Date(insight.timestamp).toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">💡</div>
            <div class="empty-state-title">No insights yet</div>
            <div class="empty-state-description">AI is learning your patterns. Keep working to get personalized insights!</div>
          </div>
        `}
      </div>

      ${aiStatus.anomalies.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚠️ Recent Anomalies Detected</div>
        </div>
        <div class="table-wrapper">
          <table class="ultra-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Action Taken</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${aiStatus.anomalies.map(a => `
                <tr>
                  <td><span class="badge badge-warning">${a.type}</span></td>
                  <td>${a.description}</td>
                  <td><span class="badge badge-success">${a.action}</span></td>
                  <td style="font-size:12px;">${new Date(a.timestamp).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      ${aiStatus.predictions.burnout_risk ? `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔥 Burnout Risk Assessment</div>
        </div>
        <div style="padding: 24px; background: ${
          aiStatus.predictions.burnout_risk.level === 'high' ? 'linear-gradient(135deg, #fee2e2, #fecaca)' :
          aiStatus.predictions.burnout_risk.level === 'medium' ? 'linear-gradient(135deg, #fef3c7, #fef08a)' :
          'linear-gradient(135deg, #d1fae5, #a7f3d0)'
        }; border-radius: 16px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="font-size: 48px;">${
              aiStatus.predictions.burnout_risk.level === 'high' ? '🔴' :
              aiStatus.predictions.burnout_risk.level === 'medium' ? '🟡' : '🟢'
            }</div>
            <div>
              <div style="font-size: 24px; font-weight: 900; color: ${
                aiStatus.predictions.burnout_risk.level === 'high' ? '#991b1b' :
                aiStatus.predictions.burnout_risk.level === 'medium' ? '#92400e' : '#065f46'
              };">${aiStatus.predictions.burnout_risk.level.toUpperCase()} RISK</div>
              <div style="font-size: 14px; color: ${
                aiStatus.predictions.burnout_risk.level === 'high' ? '#7f1d1d' :
                aiStatus.predictions.burnout_risk.level === 'medium' ? '#78350f' : '#064e3b'
              };">Risk Score: ${aiStatus.predictions.burnout_risk.score}/100</div>
            </div>
          </div>
          ${aiStatus.predictions.burnout_risk.factors.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 700; margin-bottom: 8px;">Contributing Factors:</div>
              <ul style="margin: 0; padding-left: 20px;">
                ${aiStatus.predictions.burnout_risk.factors.map(f => `<li style="margin-bottom: 4px;">${f}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          <div style="padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px; font-size: 14px;">
            💡 ${aiStatus.predictions.burnout_risk.recommendation}
          </div>
        </div>
      </div>
      ` : ''}
    `;
  }

  // ============================================================================
  // QUEUE TASKS PAGE
  // ============================================================================
  function renderQueueTasksPage(container) {
    const todayTaskData = aggregateTodayTaskData();

    container.innerHTML = `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div class="card-title">📋 Today's Queue Tasks</div>
          <div class="card-actions">
            <span style="padding: 8px 16px; background: var(--primary); color: white; border-radius: 8px; font-size: 13px; font-weight: 600;">
              ${todayTaskData.length} tasks today
            </span>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="ultra-table" id="today-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="taskName">Task Name</th>
                <th class="sortable" data-sort="totalTime">Total Time</th>
                <th class="sortable" data-sort="submitted">Submissions</th>
                <th class="sortable" data-sort="avgTime">Avg Time</th>
                <th class="sortable" data-sort="successRate">Success Rate</th>
                <th class="sortable" data-sort="lastWorked">Last Worked</th>
              </tr>
            </thead>
            <tbody id="today-tasks-tbody"></tbody>
          </table>
        </div>
        <div id="today-tasks-pagination"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Queue Task Analysis (All-Time)</div>
          <div class="card-actions">
            <input type="text" id="queue-search" class="search-box" placeholder="Search tasks..." />
          </div>
        </div>
        <div class="table-wrapper">
          <table class="ultra-table" id="queue-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="taskName">Task Name</th>
                <th class="sortable" data-sort="totalTime">Total Time</th>
                <th class="sortable" data-sort="submitted">Submissions</th>
                <th class="sortable" data-sort="avgTime">Avg Time</th>
                <th class="sortable" data-sort="successRate">Success Rate</th>
                <th class="sortable" data-sort="lastWorked">Last Worked</th>
              </tr>
            </thead>
            <tbody id="queue-tbody"></tbody>
          </table>
        </div>
        <div id="queue-analysis-pagination"></div>
      </div>
    `;

    renderTodayTasksTable();
    renderQueueTable();
    wireQueueTableEvents();
    wireTodayTasksEvents();
  }

  let todaySortKey = 'totalTime';
  let todaySortDir = 'desc';

  function renderTodayTasksTable() {
    const tbody = document.getElementById('today-tasks-tbody');
    const paginationContainer = document.getElementById('today-tasks-pagination');
    if (!tbody || !paginationContainer) return;

    let taskData = aggregateTodayTaskData();

    taskData.sort((a, b) => {
        let valA = a[todaySortKey];
        let valB = b[todaySortKey];

        if (todaySortKey === 'lastWorked') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        return todaySortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const totalItems = taskData.length;
    const startIndex = (todayTasksPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = taskData.slice(startIndex, endIndex);

    if (paginatedData.length > 0) {
        tbody.innerHTML = paginatedData.map(task => {
            const successClass = task.successRate >= 80 ? 'badge-success' :
                                task.successRate >= 50 ? 'badge-warning' : 'badge-danger';

            return `<tr>
                <td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;font-weight:600;"
                    title="${task.taskName}">${task.taskName}</td>
                <td style="font-weight:700;font-size:15px;">${fmt(task.totalTime)}</td>
                <td>
                  <span class="badge badge-success">${task.submitted}</span>
                  ${task.skipped > 0 ? `<span class="badge badge-warning" style="margin-left:6px;">${task.skipped} skip</span>` : ''}
                  ${task.expired > 0 ? `<span class="badge badge-danger" style="margin-left:6px;">${task.expired} exp</span>` : ''}
                </td>
                <td style="font-weight:600;">${fmt(task.avgTime)}</td>
                <td><span class="badge ${successClass}">${task.successRate}%</span></td>
                <td style="font-size:12px;">${task.lastWorked ? new Date(task.lastWorked).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '-'}</td>
            </tr>`;
        }).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No tasks today</div>
            <div class="empty-state-description">Start working on tasks to see them here</div>
        </td></tr>`;
    }

    paginationContainer.innerHTML = createPagination(totalItems, todayTasksPage, ITEMS_PER_PAGE);
    wireTodayTasksPagination();
  }

  function wireTodayTasksPagination() {
    const paginationContainer = document.getElementById('today-tasks-pagination');
    if (!paginationContainer) return;

    paginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
            todayTasksPage = parseInt(e.target.dataset.page);
            renderTodayTasksTable();
        }
    });
  }

  function wireTodayTasksEvents() {
    document.querySelectorAll('#today-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (todaySortKey === sortKey) {
                todaySortDir = todaySortDir === 'asc' ? 'desc' : 'asc';
            } else {
                todaySortKey = sortKey;
                todaySortDir = 'desc';
            }

            document.querySelectorAll('#today-table th').forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            th.classList.add(todaySortDir === 'asc' ? 'sort-asc' : 'sort-desc');

            todayTasksPage = 1;
            renderTodayTasksTable();
        });
    });
  }

  let queueSortKey = 'totalTime';
  let queueSortDir = 'desc';

  function renderQueueTable(searchTerm = '') {
    const tbody = document.getElementById('queue-tbody');
    const paginationContainer = document.getElementById('queue-analysis-pagination');
    if (!tbody || !paginationContainer) return;

    let taskData = aggregateTaskData();

    if (searchTerm) {
        taskData = taskData.filter(task =>
            task.taskName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    taskData.sort((a, b) => {
        let valA = a[queueSortKey];
        let valB = b[queueSortKey];

        if (queueSortKey === 'lastWorked') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        return queueSortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const totalItems = taskData.length;
    const startIndex = (queueAnalysisPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = taskData.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedData.map(task => {
        const successClass = task.successRate >= 80 ? 'badge-success' :
                            task.successRate >= 50 ? 'badge-warning' : 'badge-danger';

        return `<tr>
            <td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;font-weight:600;"
                title="${task.taskName}">${task.taskName}</td>
            <td style="font-weight:700;font-size:15px;">${fmt(task.totalTime)}</td>
            <td>
              <span class="badge badge-success">${task.submitted}</span>
              ${task.skipped > 0 ? `<span class="badge badge-warning" style="margin-left:6px;">${task.skipped} skip</span>` : ''}
              ${task.expired > 0 ? `<span class="badge badge-danger" style="margin-left:6px;">${task.expired} exp</span>` : ''}
            </td>
            <td style="font-weight:600;">${fmt(task.avgTime)}</td>
            <td><span class="badge ${successClass}">${task.successRate}%</span></td>
            <td style="font-size:12px;">${task.lastWorked ? new Date(task.lastWorked).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-'}</td>
        </tr>`;
    }).join('');

    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No tasks found</div>
            <div class="empty-state-description">Try adjusting your search or start working on tasks</div>
        </td></tr>`;
    }

    paginationContainer.innerHTML = createPagination(totalItems, queueAnalysisPage, ITEMS_PER_PAGE);
    wireQueueAnalysisPagination();
  }

  function wireQueueAnalysisPagination() {
    const paginationContainer = document.getElementById('queue-analysis-pagination');
    if (!paginationContainer) return;

    paginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
            queueAnalysisPage = parseInt(e.target.dataset.page);
            renderQueueTable(document.getElementById('queue-search')?.value || '');
        }
    });
  }

  function wireQueueTableEvents() {
    const searchBox = document.getElementById('queue-search');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            queueAnalysisPage = 1;
            renderQueueTable(e.target.value);
        });
    }

    document.querySelectorAll('#queue-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (queueSortKey === sortKey) {
                queueSortDir = queueSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                queueSortKey = sortKey;
                queueSortDir = 'desc';
            }

            document.querySelectorAll('#queue-table th').forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            th.classList.add(queueSortDir === 'asc' ? 'sort-asc' : 'sort-desc');

            queueAnalysisPage = 1;
            renderQueueTable(document.getElementById('queue-search')?.value || '');
        });
    });
  }

  function renderAnalyticsPage(container) {
    const analytics = retrieve(KEYS.ANALYTICS, {});

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">✅ Completed</div>
            <div class="kpi-icon">✅</div>
          </div>
          <div class="kpi-value">${analytics.total_tasks_completed || 0}</div>
          <div class="kpi-meta">
            <span>Total submissions</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">⏭️ Skipped</div>
            <div class="kpi-icon">⏭️</div>
          </div>
          <div class="kpi-value">${analytics.total_tasks_skipped || 0}</div>
          <div class="kpi-meta">
            <span>Tasks skipped</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">⏱️ Total Time</div>
            <div class="kpi-icon">⏱️</div>
          </div>
          <div class="kpi-value">${fmt(analytics.total_time_worked || 0)}</div>
          <div class="kpi-meta">
            <span>Time worked</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">🏆 Longest Session</div>
            <div class="kpi-icon">🏆</div>
          </div>
          <div class="kpi-value">${fmt(analytics.longest_session || 0)}</div>
          <div class="kpi-meta">
            <span>Best performance</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Performance Distribution</div>
        </div>
        <div class="chart-container">
          <canvas id="performance-chart"></canvas>
        </div>
      </div>
    `;

    setTimeout(() => {
        drawPerformanceChart(analytics);
    }, 100);
  }

  function drawPerformanceChart(analytics) {
    const canvas = document.getElementById('performance-chart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Skipped', 'Expired'],
            datasets: [{
                data: [
                    analytics.total_tasks_completed || 0,
                    analytics.total_tasks_skipped || 0,
                    analytics.total_tasks_expired || 0
                ],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: { size: 13, weight: '600' }
                    }
                }
            }
        }
    });
  }

  function renderProductivityPage(container) {
    const sessions = retrieve(KEYS.SESSIONS, []) || [];

    const hourlyData = new Array(24).fill(0);
    sessions.forEach(s => {
        const hour = new Date(s.date).getHours();
        hourlyData[hour] += s.duration;
    });

    const maxHourly = Math.max(...hourlyData, 1);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔥 Productivity Heat Map</div>
        </div>
        <div class="heatmap-grid">
          ${hourlyData.map((value, hour) => {
            const intensity = (value / maxHourly) * 100;
            const color = intensity === 0 ? '#f1f5f9' :
                         intensity < 25 ? '#bfdbfe' :
                         intensity < 50 ? '#60a5fa' :
                         intensity < 75 ? '#3b82f6' : '#1e40af';
            return `<div class="heatmap-cell" style="background: ${color};"
                         title="Hour ${hour}:00 - ${fmt(value)}"></div>`;
          }).join('')}
        </div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-legend-item">
            <div class="heatmap-legend-color" style="background:#f1f5f9;"></div>
          </div>
          <div class="heatmap-legend-item">
            <div class="heatmap-legend-color" style="background:#bfdbfe;"></div>
          </div>
          <div class="heatmap-legend-item">
            <div class="heatmap-legend-color" style="background:#60a5fa;"></div>
          </div>
          <div class="heatmap-legend-item">
            <div class="heatmap-legend-color" style="background:#3b82f6;"></div>
          </div>
          <div class="heatmap-legend-item">
            <div class="heatmap-legend-color" style="background:#1e40af;"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      <div class="kpi-grid" style="margin-top: 24px;">
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">🌟 Peak Hour</div>
            <div class="kpi-icon">🌟</div>
          </div>
          <div class="kpi-value">${hourlyData.indexOf(Math.max(...hourlyData))}:00</div>
          <div class="kpi-meta">
            <span>Most productive</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">⚡ Efficiency</div>
            <div class="kpi-icon">⚡</div>
          </div>
          <div class="kpi-value">${calculateProductivityScore()}%</div>
          <div class="kpi-meta">
            <span>Overall score</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-label">🎯 Streak</div>
            <div class="kpi-icon">🎯</div>
          </div>
          <div class="kpi-value">${calculateStreak()} days</div>
          <div class="kpi-meta">
            <span>Current streak</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderHistoryPage(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 Complete Session History</div>
          <div class="card-actions">
            <input type="text" id="history-search" class="search-box" placeholder="Search history..." />
          </div>
        </div>
        <div class="table-wrapper">
          <table class="ultra-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Task Name</th>
                <th>Duration</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="history-tbody">
            </tbody>
          </table>
        </div>
        <div id="history-pagination"></div>
      </div>
    `;

    renderHistoryTable();
    wireHistoryEvents();
  }

  function renderHistoryTable(searchTerm = '') {
    const tbody = document.getElementById('history-tbody');
    const paginationContainer = document.getElementById('history-pagination');
    if (!tbody || !paginationContainer) return;

    let sessions = retrieve(KEYS.SESSIONS, []) || [];

    if (searchTerm) {
        sessions = sessions.filter(s =>
            (s.taskName || '').toLowerCase().includes(searchTerm) ||
            (s.action || '').toLowerCase().includes(searchTerm)
        );
    }

    const totalItems = sessions.length;
    const startIndex = (historyPage - 1) * HISTORY_ITEMS_PER_PAGE;
    const endIndex = startIndex + HISTORY_ITEMS_PER_PAGE;
    const paginatedSessions = sessions.slice(startIndex, endIndex);

    if (paginatedSessions.length > 0) {
        tbody.innerHTML = paginatedSessions.map(s => `
            <tr>
              <td style="font-size:12px;">${new Date(s.date).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</td>
              <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;font-weight:600;"
                  title="${s.taskName || 'Unknown'}">${s.taskName || 'Unknown'}</td>
              <td style="font-weight:700;font-size:15px;">${fmt(s.duration)}</td>
              <td><span class="badge ${s.action === 'submitted' ? 'badge-success' :
                                      s.action === 'skipped' ? 'badge-warning' : 'badge-danger'}">${s.action}</span></td>
              <td><span class="badge badge-info">Logged</span></td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">
            <div class="empty-state-icon">📜</div>
            <div class="empty-state-title">No history found</div>
            <div class="empty-state-description">Start working to build your history</div>
        </td></tr>`;
    }

    paginationContainer.innerHTML = createPagination(totalItems, historyPage, HISTORY_ITEMS_PER_PAGE);
    wireHistoryPagination();
  }

  function wireHistoryPagination() {
    const paginationContainer = document.getElementById('history-pagination');
    if (!paginationContainer) return;

    paginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
            historyPage = parseInt(e.target.dataset.page);
            renderHistoryTable(document.getElementById('history-search')?.value || '');
        }
    });
  }

  function wireHistoryEvents() {
    const searchBox = document.getElementById('history-search');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            historyPage = 1;
            renderHistoryTable(e.target.value.toLowerCase());
        });
    }
  }

  function renderSettingsPage(container) {
    const aiStatus = AI.getStatus();

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚙️ Settings & Configuration</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:20px;">
          <div style="padding:24px;background:linear-gradient(135deg,#fef3c7,#fef08a);border-radius:16px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:8px;">🔄 Reset Data</div>
            <div style="font-size:13px;color:#92400e;margin-bottom:16px;">Choose to reset timer, counter, or both. This action cannot be undone.</div>
            <button class="header-btn header-btn-primary" id="settings-reset">Open Reset Dialog</button>
          </div>

          <div style="padding:24px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border-radius:16px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:8px;">📥 Import Data</div>
            <div style="font-size:13px;color:#3730a3;margin-bottom:16px;">Import JSON backup file to restore your data</div>
            <button class="header-btn header-btn-ghost" id="settings-import">📥 Import JSON</button>
          </div>

          <div style="padding:24px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:16px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:8px;">💾 Export Data</div>
            <div style="font-size:13px;color:#1e40af;margin-bottom:16px;">Export all your data in JSON or CSV format for backup or analysis</div>
            <div style="display:flex;gap:12px;">
              <button class="header-btn header-btn-ghost" id="settings-export">💾 Export JSON</button>
              <button class="header-btn header-btn-ghost" id="settings-export-csv">📊 Export CSV</button>
            </div>
          </div>

          <div style="padding:24px;background:linear-gradient(135deg,#f3e8ff,#e9d5ff);border-radius:16px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:8px;">🔍 Diagnostics</div>
            <div style="font-size:13px;color:#6b21a8;margin-bottom:16px;">Check system status, storage usage, and troubleshoot issues</div>
            <button class="header-btn header-btn-ghost" id="settings-diagnostics">Run Diagnostics</button>
          </div>

          <div style="padding:24px;background:linear-gradient(135deg,#fce7f3,#fbcfe8);border-radius:16px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:8px;">⌨️ Keyboard Shortcuts</div>
            <div style="font-size:13px;color:#9f1239;margin-bottom:16px;">View all available keyboard shortcuts</div>
            <button class="header-btn header-btn-ghost" id="settings-shortcuts">⌨️ Show Shortcuts</button>
          </div>

          <div style="padding:24px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:16px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:8px;">🤖 AI Engine Status</div>
            <div style="font-size:13px;color:#065f46;margin-bottom:16px;">View AI performance and toggle features</div>
            <button class="header-btn header-btn-ghost" id="settings-ai-insights">View AI Status</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <div class="card-title">ℹ️ System Information</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="padding:16px;background:var(--gray-50);border-radius:12px;">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">Version</div>
            <div style="font-weight:700;font-size:16px;">v3.2.1 Fixed</div>
          </div>
          <div style="padding:16px;background:var(--gray-50);border-radius:12px;">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">Total Sessions</div>
            <div style="font-weight:700;font-size:16px;">${(retrieve(KEYS.SESSIONS, [])||[]).length}</div>
          </div>
          <div style="padding:16px;background:var(--gray-50);border-radius:12px;">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">Storage Used</div>
            <div style="font-weight:700;font-size:16px;">${(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB</div>
          </div>
          <div style="padding:16px;background:var(--gray-50);border-radius:12px;">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">Last Reset</div>
            <div style="font-weight:700;font-size:16px;">${retrieve(KEYS.LAST_RESET) ? new Date(retrieve(KEYS.LAST_RESET)).toLocaleDateString() : 'Never'}</div>
          </div>
          <div style="padding:16px;background:var(--gray-50);border-radius:12px;">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">AI Protections</div>
            <div style="font-weight:700;font-size:16px;">${aiStatus.stats.protections_applied}</div>
          </div>
          <div style="padding:16px;background:var(--gray-50);border-radius:12px;">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">AI Efficiency</div>
            <div style="font-weight:700;font-size:16px;">${aiStatus.performance.efficiency}%</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('settings-reset')?.addEventListener('click', showResetDialog);
    document.getElementById('settings-diagnostics')?.addEventListener('click', runDiagnostics);
    document.getElementById('settings-export')?.addEventListener('click', dashboardExportJSON);
    document.getElementById('settings-import')?.addEventListener('click', dashboardImportJSON);
    document.getElementById('settings-export-csv')?.addEventListener('click', dashboardExportCSV);
    document.getElementById('settings-shortcuts')?.addEventListener('click', showKeyboardShortcuts);
    document.getElementById('settings-ai-insights')?.addEventListener('click', showAIInsightsModal);
  }

  function dashboardExportJSON() {
    const aiStatus = AI.getStatus();

    const payload = {
        version: "3.2.1-fixed-no-toast",
        exported_at: new Date().toISOString(),
        history: retrieve(KEYS.HISTORY, {}),
        sessions: retrieve(KEYS.SESSIONS, []),
        analytics: retrieve(KEYS.ANALYTICS, {}),
        daily_committed: retrieve(KEYS.DAILY_COMMITTED, 0),
        count: retrieve(KEYS.COUNT, 0),
        last_date: retrieve(KEYS.LAST_DATE),
        queue_summary: aggregateTaskData(),
        productivity_score: calculateProductivityScore(),
        ai_profile: aiStatus.profile,
        ai_patterns: retrieve(KEYS.AI_PATTERNS, {}),
        ai_stats: aiStatus.stats
    };

    store(KEYS.LAST_BACKUP, new Date().toISOString());

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sagemaker-ai-enhanced-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log('✅ Data exported successfully!');
  }

  // ============================================================================
  // 🚀 INITIALIZATION
  // ============================================================================
  log("🚀 SageMaker AI-Enhanced Dashboard v3.2.1 initializing...");

  validateAndFixData();
  checkDailyReset();
  scheduleMidnightReset();
  initSubmissionInterceptor();
  setupAutoBackup();

  loadChartJS().then(() => {
    log("✅ Chart.js loaded");
  }).catch(() => {
    log("⚠️ Chart.js failed to load");
  });

  setTimeout(() => {
    attachToFooter();
    updateDisplay();
  }, 1000);

  let trackingIntervalId = null;
  function startTracking() {
    if (trackingIntervalId) clearInterval(trackingIntervalId);

    trackingIntervalId = setInterval(() => {
      trackOnce();
      if (trackingIntervalId) {
        clearInterval(trackingIntervalId);
        startTracking();
      }
    }, currentCheckInterval);
  }

  startTracking();

  log("✅ SageMaker AI-Enhanced Dashboard v3.2.1 Ready!");
  log("🤖 AI Engine: Active");
  log("💎 Features: Protection, Learning, Prediction, Optimization");
  log("🔕 Toast Notifications: Disabled");

})();
