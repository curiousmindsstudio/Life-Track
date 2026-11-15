/* ==========================================================================
   LifeTrack — Modular Vanilla JS Productivity & Habit Operating System
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. I18nManager — Multi-language Dictionary Structure
     ------------------------------------------------------------------------ */
  class I18nManager {
    constructor() {
      this.dictionaries = {
        en: {
          nav_dashboard: 'Dashboard',
          nav_habits: 'Habit Tracker',
          nav_calendar: 'Calendar',
          nav_countdowns: 'Goals & Countdown',
          nav_analytics: 'Analytics & Stats',
          nav_notes: 'Notes',
          nav_todos: 'To-Do List',
          nav_archive: 'Archive',
          nav_settings: 'Settings',
          welcome_title: 'Welcome back to LifeTrack!',
          autosave_ok: 'Auto-saved locally'
        },
        es: {
          nav_dashboard: 'Panel Principal',
          nav_habits: 'Hábitos',
          nav_calendar: 'Calendario',
          nav_countdowns: 'Metas y Cuenta Atrás',
          nav_analytics: 'Analíticas',
          nav_notes: 'Notas',
          nav_todos: 'Tareas',
          nav_archive: 'Archivo',
          nav_settings: 'Ajustes',
          welcome_title: '¡Bienvenido de nuevo a LifeTrack!',
          autosave_ok: 'Guardado automáticamente'
        }
      };
    }

    t(lang, key) {
      return (this.dictionaries[lang] && this.dictionaries[lang][key]) || this.dictionaries.en[key] || key;
    }

    apply(lang) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = this.t(lang, key);
      });
    }
  }

  /* ------------------------------------------------------------------------
     2. StorageManager — LocalStorage Persistence & Auto-Save
     ------------------------------------------------------------------------ */
  class StorageManager {
    constructor(storageKey = 'lifetrack_os_v1') {
      this.storageKey = storageKey;
    }

    getDefaultState() {
      const todayISO = DateUtils.toISODate(new Date());
      const startOfWeekISO = DateUtils.toISODate(DateUtils.getStartOfWeek(new Date(), 1));
      const sampleExamDate = DateUtils.toISODate(DateUtils.addDays(new Date(), 18));

      return {
        settings: {
          theme: 'light',
          accentColor: '#2563eb',
          fontSize: 'medium',
          firstDayOfWeek: 1, // 1 = Monday, 0 = Sunday
          language: 'en',
          backupReminderDays: 7,
          lastBackupDate: todayISO
        },
        trackerConfig: {
          numWeeks: 4,
          startDate: startOfWeekISO
        },
        habits: [
          { id: 'hab_1', name: 'Read & Summarize 1 Chapter', category: 'Study', color: '#2563eb' },
          { id: 'hab_2', name: 'Deep Focus Session (90m)', category: 'Productivity', color: '#7c3aed' },
          { id: 'hab_3', name: 'Morning Exercise (30m)', category: 'Health', color: '#059669' },
          { id: 'hab_4', name: 'Hydrate 2.5L Water', category: 'Wellness', color: '#0891b2' }
        ],
        // Map of "habitId": { "YYYY-MM-DD": true }
        habitLogs: {
          hab_1: { [todayISO]: true },
          hab_3: { [todayISO]: true }
        },
        countdowns: [
          {
            id: 'cd_1',
            title: 'Final Semester Exam',
            description: 'Complete full syllabus revision and solve past 5-year papers.',
            category: 'Exam / Test',
            targetDate: sampleExamDate,
            targetTime: '09:00',
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
            priority: 'high',
            color: '#2563eb'
          }
        ],
        notes: [
          {
            id: 'note_1',
            title: 'Weekly Study & Focus Blueprint',
            type: 'weekly',
            pinned: true,
            date: todayISO,
            content: 'Prioritize difficult chapters in the morning block before checking messages.',
            checklist: [
              { text: 'Review weak topics', done: true },
              { text: 'Take timed practice test', done: false }
            ]
          }
        ],
        todos: [
          {
            id: 'todo_1',
            title: 'Organize study schedule for upcoming test',
            priority: 'high',
            dueDate: todayISO,
            completed: false
          },
          {
            id: 'todo_2',
            title: 'Download JSON backup of LifeTrack',
            priority: 'medium',
            dueDate: DateUtils.toISODate(DateUtils.addDays(new Date(), 3)),
            completed: false
          }
        ],
        archives: []
      };
    }

    load() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) {
          const initial = this.getDefaultState();
          this.save(initial);
          return initial;
        }
        const parsed = JSON.parse(raw);
        return { ...this.getDefaultState(), ...parsed };
      } catch (e) {
        console.error('Storage load error:', e);
        return this.getDefaultState();
      }
    }

    save(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
        const statusEl = document.getElementById('autoSaveStatus');
        if (statusEl) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          statusEl.textContent = `Saved ${timeStr}`;
        }
      } catch (e) {
        console.error('Storage save error:', e);
      }
    }
  }

  /* ------------------------------------------------------------------------
     3. DateUtils — Pure Date Manipulation Helpers
     ------------------------------------------------------------------------ */
  class DateUtils {
    static toISODate(date) {
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    static parseISODate(isoStr) {
      const [y, m, d] = isoStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    static addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }

    static getStartOfWeek(date, firstDayOfWeek = 1) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const day = d.getDay();
      const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;
      d.setDate(d.getDate() - diff);
      return d;
    }

    static formatShort(date) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }

  /* ------------------------------------------------------------------------
     4. HabitEngine — Analytics, Streaks, Matrix & Rollover Logic
     ------------------------------------------------------------------------ */
  class HabitEngine {
    constructor(app) {
      this.app = app;
    }

    get state() { return this.app.state; }

    isCompleted(habitId, isoDate) {
      return Boolean(this.state.habitLogs[habitId] && this.state.habitLogs[habitId][isoDate]);
    }

    toggleHabitDate(habitId, isoDate) {
      if (!this.state.habitLogs[habitId]) {
        this.state.habitLogs[habitId] = {};
      }
      if (this.state.habitLogs[habitId][isoDate]) {
        delete this.state.habitLogs[habitId][isoDate];
      } else {
        this.state.habitLogs[habitId][isoDate] = true;
      }
      this.app.commit();
    }

    getCycleDates() {
      const start = DateUtils.parseISODate(this.state.trackerConfig.startDate);
      const totalDays = Math.max(1, Math.min(52, Number(this.state.trackerConfig.numWeeks) || 4)) * 7;
      const dates = [];
      for (let i = 0; i < totalDays; i++) {
        dates.push(DateUtils.addDays(start, i));
      }
      return dates;
    }

    getDayStats(isoDate) {
      const total = this.state.habits.length;
      if (total === 0) return { completed: 0, total: 0, pct: 0 };
      let completed = 0;
      for (const h of this.state.habits) {
        if (this.isCompleted(h.id, isoDate)) completed++;
      }
      return { completed, total, pct: Math.round((completed / total) * 100) };
    }

    getRangeCompletion(dates) {
      const totalHabits = this.state.habits.length;
      if (totalHabits === 0 || dates.length === 0) return 0;
      let done = 0;
      const possible = totalHabits * dates.length;
      for (const d of dates) {
        const iso = DateUtils.toISODate(d);
        for (const h of this.state.habits) {
          if (this.isCompleted(h.id, iso)) done++;
        }
      }
      return Math.round((done / possible) * 100);
    }

    calculateStreaks() {
      if (this.state.habits.length === 0) return { currentStreak: 0, longestStreak: 0 };

      // Collect all dates that had at least 1 habit completed
      const activeDatesSet = new Set();
      Object.values(this.state.habitLogs).forEach(logMap => {
        Object.keys(logMap).forEach(iso => {
          if (logMap[iso]) activeDatesSet.add(iso);
        });
      });

      if (activeDatesSet.size === 0) return { currentStreak: 0, longestStreak: 0 };

      const sortedDates = Array.from(activeDatesSet).sort();
      let longest = 1;
      let run = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prev = DateUtils.parseISODate(sortedDates[i - 1]);
        const curr = DateUtils.parseISODate(sortedDates[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        if (diffDays === 1) {
          run++;
          if (run > longest) longest = run;
        } else if (diffDays > 1) {
          run = 1;
        }
      }

      // Current streak counting backwards from today or yesterday
      const today = new Date();
      const todayISO = DateUtils.toISODate(today);
      const yesterdayISO = DateUtils.toISODate(DateUtils.addDays(today, -1));

      let current = 0;
      let cursor = activeDatesSet.has(todayISO)
        ? today
        : (activeDatesSet.has(yesterdayISO) ? DateUtils.addDays(today, -1) : null);

      while (cursor && activeDatesSet.has(DateUtils.toISODate(cursor))) {
        current++;
        cursor = DateUtils.addDays(cursor, -1);
      }

      return { currentStreak: current, longestStreak: Math.max(longest, current) };
    }

    computeComprehensiveStats() {
      const habits = this.state.habits;
      const cycleDates = this.getCycleDates();
      const today = new Date();
      const todayISO = DateUtils.toISODate(today);

      const todayStats = this.getDayStats(todayISO);

      // Current week dates
      const weekStart = DateUtils.getStartOfWeek(today, this.state.settings.firstDayOfWeek);
      const weekDates = Array.from({ length: 7 }, (_, i) => DateUtils.addDays(weekStart, i));
      const weekPct = this.getRangeCompletion(weekDates);

      // Current month dates
      const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const monthDates = Array.from({ length: monthDays }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1));
      const monthPct = this.getRangeCompletion(monthDates);

      const cyclePct = this.getRangeCompletion(cycleDates);
      const streaks = this.calculateStreaks();

      // Total habit check-ins across all time
      let totalHabitCheckins = 0;
      const habitTotals = habits.map(h => {
        const count = this.state.habitLogs[h.id] ? Object.values(this.state.habitLogs[h.id]).filter(Boolean).length : 0;
        totalHabitCheckins += count;
        const pct = cycleDates.length > 0 ? Math.round((count / cycleDates.length) * 100) : 0;
        return { habit: h, count, pct };
      });

      const completedTodos = this.state.todos.filter(t => t.completed).length;
      const categories = new Set(habits.map(h => h.category || 'General'));

      // Best week in cycle
      let bestWeekLabel = 'N/A';
      let bestWeekPct = -1;
      const numWeeks = Math.ceil(cycleDates.length / 7);
      for (let w = 0; w < numWeeks; w++) {
        const slice = cycleDates.slice(w * 7, (w + 1) * 7);
        const pct = this.getRangeCompletion(slice);
        if (pct > bestWeekPct) {
          bestWeekPct = pct;
          bestWeekLabel = `Week ${w + 1} (${pct}%)`;
        }
      }

      // Best month across all logs
      const monthBuckets = {};
      Object.values(this.state.habitLogs).forEach(logMap => {
        Object.keys(logMap).forEach(iso => {
          if (logMap[iso]) {
            const ym = iso.slice(0, 7);
            monthBuckets[ym] = (monthBuckets[ym] || 0) + 1;
          }
        });
      });
      let bestMonthLabel = 'N/A';
      let bestMonthCount = 0;
      Object.entries(monthBuckets).forEach(([ym, cnt]) => {
        if (cnt > bestMonthCount) {
          bestMonthCount = cnt;
          bestMonthLabel = `${ym} (${cnt} check-ins)`;
        }
      });

      const sortedHabits = [...habitTotals].sort((a, b) => b.count - a.count);
      const mostSuccessful = sortedHabits[0] ? `${sortedHabits[0].habit.name} (${sortedHabits[0].count})` : 'N/A';
      const leastSuccessful = sortedHabits.length > 0
        ? `${sortedHabits[sortedHabits.length - 1].habit.name} (${sortedHabits[sortedHabits.length - 1].count})`
        : 'N/A';

      return {
        todayStats,
        weekPct,
        monthPct,
        cyclePct,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        totalHabitCheckins,
        totalCompletedTasks: totalHabitCheckins + completedTodos,
        totalHabits: habits.length,
        categoriesCount: categories.size,
        bestWeekLabel,
        bestMonthLabel,
        mostSuccessful,
        leastSuccessful
      };
    }
  }

  /* ------------------------------------------------------------------------
     5. CountdownEngine — Live Second-by-Second Timers & Elapsed Pie Charts
     ------------------------------------------------------------------------ */
  class CountdownEngine {
    constructor(app) {
      this.app = app;
      this.intervalId = null;
    }

    start() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.tick(), 1000);
    }

    computeBreakdown(cd) {
      const targetStr = `${cd.targetDate}T${cd.targetTime || '00:00'}:00`;
      const targetMs = new Date(targetStr).getTime();
      const createdMs = cd.createdAt ? new Date(cd.createdAt).getTime() : (targetMs - 14 * 86400000);
      const nowMs = Date.now();

      const totalSpan = Math.max(1000, targetMs - createdMs);
      const remainingMs = Math.max(0, targetMs - nowMs);
      const elapsedMs = Math.min(totalSpan, Math.max(0, nowMs - createdMs));
      const progressPct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalSpan) * 100)));

      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        days,
        hours,
        minutes,
        seconds,
        isComplete: remainingMs === 0,
        progressPct,
        elapsedPct: progressPct,
        remainingPct: 100 - progressPct
      };
    }

    tick() {
      this.app.state.countdowns.forEach(cd => {
        const b = this.computeBreakdown(cd);
        const card = document.querySelector(`[data-cd-id="${cd.id}"]`);
        if (card) {
          const dEl = card.querySelector('.cd-days');
          const hEl = card.querySelector('.cd-hours');
          const mEl = card.querySelector('.cd-minutes');
          const sEl = card.querySelector('.cd-seconds');
          if (dEl) dEl.textContent = String(b.days).padStart(2, '0');
          if (hEl) hEl.textContent = String(b.hours).padStart(2, '0');
          if (mEl) mEl.textContent = String(b.minutes).padStart(2, '0');
          if (sEl) sEl.textContent = String(b.seconds).padStart(2, '0');
        }
      });

      // Also update dashboard featured countdown if present
      const feat = document.getElementById('featuredCdLiveText');
      if (feat && this.app.state.countdowns.length > 0) {
        const nextCd = this.getNextUpcoming();
        if (nextCd) {
          const b = this.computeBreakdown(nextCd);
          feat.textContent = `${b.days}d ${String(b.hours).padStart(2, '0')}h ${String(b.minutes).padStart(2, '0')}m ${String(b.seconds).padStart(2, '0')}s`;
        }
      }
    }

    getNextUpcoming() {
      const sorted = [...this.app.state.countdowns].sort((a, b) => {
        return new Date(`${a.targetDate}T${a.targetTime || '00:00'}`) - new Date(`${b.targetDate}T${b.targetTime || '00:00'}`);
      });
      return sorted[0] || null;
    }
  }

  /* ------------------------------------------------------------------------
     6. ChartRenderer — Chart.js + Offline Native Canvas Fallback
     ------------------------------------------------------------------------ */
  class ChartRenderer {
    constructor() {
      this.instances = {};
    }

    destroy(id) {
      if (this.instances[id]) {
        this.instances[id].destroy();
        delete this.instances[id];
      }
    }

    render(canvasId, config) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      this.destroy(canvasId);

      // Use Chart.js if loaded, otherwise render clean native offline HTML5 Canvas chart
      if (typeof window.Chart !== 'undefined') {
        this.instances[canvasId] = new window.Chart(canvas.getContext('2d'), config);
      } else {
        this.renderOfflineCanvasFallback(canvas, config);
      }
    }

    renderOfflineCanvasFallback(canvas, config) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(260, rect.width || 300);
      canvas.height = Math.max(110, rect.height || 220);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const dataset = config.data.datasets[0] || { data: [] };
      const values = dataset.data || [];
      const labels = config.data.labels || [];
      const colors = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor
        : ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

      if (config.type === 'pie' || config.type === 'doughnut') {
        const total = values.reduce((a, b) => a + b, 0) || 1;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.38;
        let startAngle = -Math.PI / 2;

        values.forEach((val, idx) => {
          const slice = (val / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
          ctx.closePath();
          ctx.fillStyle = colors[idx % colors.length];
          ctx.fill();
          startAngle += slice;
        });

        if (config.type === 'doughnut') {
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-surface') || '#ffffff';
          ctx.fill();
        }
        return;
      }

      // Bar / Line / Radar fallback
      const pad = 28;
      const plotW = w - pad * 2;
      const plotH = h - pad * 2;
      const maxVal = Math.max(100, ...values);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.stroke();

      if (values.length === 0) return;

      const stepX = plotW / Math.max(1, values.length);
      if (config.type === 'bar') {
        values.forEach((val, idx) => {
          const barH = (val / maxVal) * plotH;
          const x = pad + idx * stepX + stepX * 0.15;
          const y = h - pad - barH;
          ctx.fillStyle = colors[0];
          ctx.fillRect(x, y, Math.max(4, stepX * 0.7), barH);
        });
      } else {
        ctx.strokeStyle = colors[0];
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        values.forEach((val, idx) => {
          const x = pad + idx * stepX + stepX / 2;
          const y = h - pad - (val / maxVal) * plotH;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
  }

  /* ------------------------------------------------------------------------
     7. ExportManager — JSON, CSV, and Printable PDF Report Generator
     ------------------------------------------------------------------------ */
  class ExportManager {
    constructor(app) {
      this.app = app;
    }

    exportJSON() {
      const payload = JSON.stringify(this.app.state, null, 2);
      this.triggerDownload(payload, `lifetrack-backup-${DateUtils.toISODate(new Date())}.json`, 'application/json');
      this.app.state.settings.lastBackupDate = DateUtils.toISODate(new Date());
      this.app.commit();
      this.app.showToast('JSON backup downloaded');
    }

    exportCSV() {
      const dates = this.app.habitEngine.getCycleDates();
      const isoDates = dates.map(d => DateUtils.toISODate(d));
      const headers = ['Habit Name', 'Category', ...isoDates, 'Completion %'];
      const rows = [headers.join(',')];

      this.app.state.habits.forEach(h => {
        let done = 0;
        const cells = isoDates.map(iso => {
          const ok = this.app.habitEngine.isCompleted(h.id, iso);
          if (ok) done++;
          return ok ? '1' : '0';
        });
        const pct = isoDates.length ? Math.round((done / isoDates.length) * 100) : 0;
        rows.push([`"${h.name.replace(/"/g, '""')}"`, `"${h.category}"`, ...cells, `${pct}%`].join(','));
      });

      this.triggerDownload(rows.join('\n'), `lifetrack-habits-${DateUtils.toISODate(new Date())}.csv`, 'text/csv;charset=utf-8;');
      this.app.showToast('CSV spreadsheet exported');
    }

    exportPDFReport(archiveSession = null) {
      const sourceState = archiveSession ? archiveSession.snapshot : this.app.state;
      const title = archiveSession ? `Archive Report: ${archiveSession.name}` : 'LifeTrack Progress & Habit Report';
      const stats = this.app.habitEngine.computeComprehensiveStats();

      const habitRowsHtml = sourceState.habits.map(h => {
        const count = sourceState.habitLogs[h.id] ? Object.values(sourceState.habitLogs[h.id]).filter(Boolean).length : 0;
        return `<tr><td style="padding:8px;border:1px solid #ddd;">${this.app.escapeHtml(h.name)}</td><td style="padding:8px;border:1px solid #ddd;">${this.app.escapeHtml(h.category)}</td><td style="padding:8px;border:1px solid #ddd;">${count} days</td></tr>`;
      }).join('');

      const countdownRowsHtml = sourceState.countdowns.map(c => {
        return `<tr><td style="padding:8px;border:1px solid #ddd;">${this.app.escapeHtml(c.title)}</td><td style="padding:8px;border:1px solid #ddd;">${c.targetDate} ${c.targetTime || ''}</td><td style="padding:8px;border:1px solid #ddd;">${c.priority.toUpperCase()}</td></tr>`;
      }).join('');

      const printWin = window.open('', '_blank', 'width=900,height=700');
      if (!printWin) {
        window.print();
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.app.escapeHtml(title)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin-bottom: 4px; color: #1e3a8a; }
            .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
            .box strong { display: block; font-size: 20px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>${this.app.escapeHtml(title)}</h1>
          <div class="meta">Generated on ${new Date().toLocaleString()} • LifeTrack Offline Personal OS</div>
          <div class="grid">
            <div class="box"><span>Overall Rate</span><strong>${stats.cyclePct}%</strong></div>
            <div class="box"><span>Current Streak</span><strong>${stats.currentStreak} days</strong></div>
            <div class="box"><span>Longest Streak</span><strong>${stats.longestStreak} days</strong></div>
            <div class="box"><span>Total Completed</span><strong>${stats.totalCompletedTasks}</strong></div>
          </div>
          <h2>Tracked Habits Summary</h2>
          <table>
            <thead><tr><th>Habit</th><th>Category</th><th>Total Completions</th></tr></thead>
            <tbody>${habitRowsHtml || '<tr><td colspan="3" style="padding:8px;">No habits recorded</td></tr>'}</tbody>
          </table>
          <h2>Goals &amp; Test Countdowns</h2>
          <table>
            <thead><tr><th>Goal / Test</th><th>Target Date</th><th>Priority</th></tr></thead>
            <tbody>${countdownRowsHtml || '<tr><td colspan="3" style="padding:8px;">No countdowns recorded</td></tr>'}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };<\/script>
        </body>
        </html>
      `);
      printWin.document.close();
    }

    importJSONFile(file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!imported || typeof imported !== 'object' || !Array.isArray(imported.habits)) {
            throw new Error('Invalid LifeTrack JSON structure');
          }
          this.app.state = { ...this.app.storage.getDefaultState(), ...imported };
          this.app.commit();
          this.app.applyThemeAndSettings();
          this.app.renderAll();
          this.app.showToast('Backup restored successfully!');
        } catch (err) {
          this.app.showToast('Failed to import backup: invalid JSON file.');
        }
      };
      reader.readAsText(file);
    }

    triggerDownload(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /* ------------------------------------------------------------------------
     8. AppController — Main Orchestrator & UI Rendering Engine
     ------------------------------------------------------------------------ */
  class AppController {
    constructor() {
      this.storage = new StorageManager();
      this.i18n = new I18nManager();
      this.state = this.storage.load();
      this.habitEngine = new HabitEngine(this);
      this.countdownEngine = new CountdownEngine(this);
      this.chartRenderer = new ChartRenderer();
      this.exportManager = new ExportManager(this);

      this.activeView = 'dashboard';
      this.habitSearchQuery = '';
      this.habitCategoryFilter = 'all';
      this.draggedHabitId = null;

      this.calendarCursor = new Date();
      this.calendarMode = 'month';
      this.selectedCalDateISO = DateUtils.toISODate(new Date());

      this.analyticsRange = 'week';
      this.notesFilter = 'all';
      this.todoSearch = '';
      this.todoStatusFilter = 'all';
      this.todoPriorityFilter = 'all';

      this.undoBuffer = null;
      this.undoTimerId = null;

      this.quotes = [
        { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
        { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
        { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
        { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
        { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' }
      ];
    }

    init() {
      this.applyThemeAndSettings();
      this.bindEvents();
      this.checkBackupReminder();
      this.renderQuote();
      this.renderAll();
      this.countdownEngine.start();

      // Smoothly dismiss loader
      requestAnimationFrame(() => {
        const loader = document.getElementById('appLoader');
        if (loader) loader.classList.add('fade-out');
      });
    }

    commit() {
      this.storage.save(this.state);
    }

    escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    }

    /* ---------------- Theme, Accent & Settings ---------------- */
    applyThemeAndSettings() {
      const s = this.state.settings;
      document.documentElement.setAttribute('data-theme', s.theme);
      document.documentElement.setAttribute('data-font-size', s.fontSize);
      document.documentElement.style.setProperty('--accent', s.accentColor);
      document.documentElement.style.setProperty('--accent-hover', s.accentColor);
      document.documentElement.style.setProperty('--accent-soft', this.hexToRgba(s.accentColor, 0.14));

      const themeLabel = document.getElementById('themeToggleLabel');
      if (themeLabel) themeLabel.textContent = s.theme === 'dark' ? 'Light Mode' : 'Dark Mode';

      const dateDisplay = document.getElementById('currentDateDisplay');
      if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString(undefined, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }

      // Sync settings form controls
      const elTheme = document.getElementById('settingThemeSelect');
      const elAccent = document.getElementById('settingAccentColor');
      const elFont = document.getElementById('settingFontSize');
      const elFirstDay = document.getElementById('settingFirstDay');
      const elLang = document.getElementById('settingLanguage');
      const elBackup = document.getElementById('settingBackupDays');

      if (elTheme) elTheme.value = s.theme;
      if (elAccent) elAccent.value = s.accentColor;
      if (elFont) elFont.value = s.fontSize;
      if (elFirstDay) elFirstDay.value = String(s.firstDayOfWeek);
      if (elLang) elLang.value = s.language;
      if (elBackup) elBackup.value = String(s.backupReminderDays);

      this.i18n.apply(s.language);
    }

    hexToRgba(hex, alpha) {
      const clean = hex.replace('#', '');
      const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    checkBackupReminder() {
      const last = this.state.settings.lastBackupDate;
      if (!last) return;
      const diffDays = Math.floor((new Date() - DateUtils.parseISODate(last)) / 86400000);
      if (diffDays >= Number(this.state.settings.backupReminderDays || 7)) {
        document.getElementById('backupReminderBanner').classList.remove('hidden');
      }
    }

    renderQuote() {
      const dayIdx = new Date().getDate() % this.quotes.length;
      const q = this.quotes[dayIdx];
      document.getElementById('motivationalQuote').textContent = `"${q.text}"`;
      document.getElementById('motivationalAuthor').textContent = `— ${q.author}`;
    }

    /* ---------------- Navigation & Modals ---------------- */
    switchView(viewName) {
      this.activeView = viewName;
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
      });
      document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `view-${viewName}`);
      });

      const activeBtn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
      if (activeBtn) {
        document.getElementById('pageHeading').textContent = activeBtn.textContent.trim();
      }

      // Close mobile sidebar if open
      document.getElementById('appSidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.add('hidden');

      this.renderAll();
    }

    openModal({ title, bodyHtml, footerHtml }) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHtml;
      document.getElementById('modalFooter').innerHTML = footerHtml;
      document.getElementById('modalBackdrop').classList.remove('hidden');
    }

    closeModal() {
      document.getElementById('modalBackdrop').classList.add('hidden');
    }

    confirmDialog(title, message, onConfirm, danger = false) {
      this.openModal({
        title,
        bodyHtml: `<p style="color:var(--text-secondary);font-size:0.9rem;">${this.escapeHtml(message)}</p>`,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="modalConfirmCancel">Cancel</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modalConfirmOk">Confirm</button>
        `
      });
      document.getElementById('modalConfirmCancel').onclick = () => this.closeModal();
      document.getElementById('modalConfirmOk').onclick = () => {
        this.closeModal();
        onConfirm();
      };
    }

    showToast(message, undoAction = null) {
      const stack = document.getElementById('toastStack');
      const toast = document.createElement('div');
      toast.className = 'toast-item';

      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      toast.appendChild(textSpan);

      if (undoAction) {
        let secondsLeft = 60;
        const undoBtn = document.createElement('button');
        undoBtn.className = 'btn btn-primary btn-xs';
        undoBtn.textContent = `Undo (${secondsLeft}s)`;
        toast.appendChild(undoBtn);

        const countdown = setInterval(() => {
          secondsLeft--;
          if (secondsLeft <= 0) {
            clearInterval(countdown);
            toast.remove();
          } else {
            undoBtn.textContent = `Undo (${secondsLeft}s)`;
          }
        }, 1000);

        undoBtn.onclick = () => {
          clearInterval(countdown);
          undoAction();
          toast.remove();
        };
      } else {
        setTimeout(() => toast.remove(), 3500);
      }

      stack.appendChild(toast);
    }

    /* ---------------- Master Render Coordinator ---------------- */
    renderAll() {
      this.renderDashboard();
      this.renderHabitTracker();
      this.renderCalendar();
      this.renderCountdowns();
      this.renderAnalytics();
      this.renderNotes();
      this.renderTodos();
      this.renderArchives();
    }

    /* ---------------- 1. Render Dashboard ---------------- */
    renderDashboard() {
      const stats = this.habitEngine.computeComprehensiveStats();

      document.getElementById('kpiTodayPct').textContent = `${stats.todayStats.pct}%`;
      document.getElementById('kpiTodayFraction').textContent = `${stats.todayStats.completed}/${stats.todayStats.total}`;
      document.getElementById('kpiTodayBar').style.width = `${stats.todayStats.pct}%`;

      document.getElementById('kpiWeekPct').textContent = `${stats.weekPct}%`;
      document.getElementById('kpiWeekBar').style.width = `${stats.weekPct}%`;

      document.getElementById('kpiMonthPct').textContent = `${stats.monthPct}%`;
      document.getElementById('kpiMonthBar').style.width = `${stats.monthPct}%`;

      document.getElementById('kpiOverallRate').textContent = `${stats.cyclePct}%`;
      document.getElementById('kpiOverallSub').textContent = `Across ${this.state.trackerConfig.numWeeks} configured week(s)`;

      document.getElementById('kpiCurrentStreak').textContent = `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`;
      document.getElementById('kpiLongestStreak').textContent = `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`;
      document.getElementById('kpiTotalCompleted').textContent = stats.totalCompletedTasks;
      document.getElementById('kpiTotalHabits').textContent = stats.totalHabits;
      document.getElementById('kpiCategoriesCount').textContent = `Across ${stats.categoriesCount} categories`;

      // Today's quick checklist
      const todayList = document.getElementById('dashboardTodayHabits');
      const todayISO = DateUtils.toISODate(new Date());
      if (this.state.habits.length === 0) {
        todayList.innerHTML = `<p class="card-subtitle">No habits added yet. Click "+ Track Today's Habits" to begin.</p>`;
      } else {
        todayList.innerHTML = this.state.habits.map(h => {
          const checked = this.habitEngine.isCompleted(h.id, todayISO);
          return `
            <div class="today-habit-item" data-dash-toggle-habit="${h.id}">
              <div class="today-habit-left">
                <span class="color-dot" style="background:${h.color}"></span>
                <span style="font-weight:600;font-size:0.86rem;${checked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${this.escapeHtml(h.name)}</span>
              </div>
              <input type="checkbox" ${checked ? 'checked' : ''} aria-label="Toggle ${this.escapeHtml(h.name)}" />
            </div>
          `;
        }).join('');
      }

      // Featured Countdown
      const featContainer = document.getElementById('dashboardFeaturedCountdown');
      const nextCd = this.countdownEngine.getNextUpcoming();
      if (!nextCd) {
        featContainer.innerHTML = `<p class="card-subtitle">No upcoming exams or goals. Add one to track live remaining time.</p>`;
      } else {
        const b = this.countdownEngine.computeBreakdown(nextCd);
        featContainer.innerHTML = `
          <div style="background:var(--bg-subtle);padding:1rem;border-radius:var(--radius-md);border-left:4px solid ${nextCd.color};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
              <span class="kpi-badge badge-blue">${this.escapeHtml(nextCd.category)}</span>
              <span style="font-size:0.75rem;color:var(--text-secondary);">${nextCd.targetDate}</span>
            </div>
            <h4 style="font-weight:800;font-size:1rem;margin-bottom:0.35rem;">${this.escapeHtml(nextCd.title)}</h4>
            <div id="featuredCdLiveText" style="font-size:1.35rem;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;">
              ${b.days}d ${String(b.hours).padStart(2, '0')}h ${String(b.minutes).padStart(2, '0')}m ${String(b.seconds).padStart(2, '0')}s
            </div>
            <div class="progress-track" style="margin-top:0.65rem;">
              <div class="progress-fill" style="width:${b.progressPct}%;background:${nextCd.color};"></div>
            </div>
            <div style="font-size:0.74rem;color:var(--text-secondary);margin-top:0.35rem;">${b.progressPct}% of preparation timeline elapsed</div>
          </div>
        `;
      }

      // 7-day pulse chart
      const last7 = Array.from({ length: 7 }, (_, i) => DateUtils.addDays(new Date(), i - 6));
      this.chartRenderer.render('dashboardPulseChart', {
        type: 'line',
        data: {
          labels: last7.map(d => DateUtils.formatShort(d)),
          datasets: [{
            label: 'Completion %',
            data: last7.map(d => this.habitEngine.getDayStats(DateUtils.toISODate(d)).pct),
            borderColor: this.state.settings.accentColor,
            backgroundColor: this.hexToRgba(this.state.settings.accentColor, 0.16),
            fill: true,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }

    /* ---------------- 2. Render Multi-Week Habit Tracker ---------------- */
    renderHabitTracker() {
      const weekInput = document.getElementById('weekCountInput');
      const startInput = document.getElementById('cycleStartDateInput');
      if (weekInput) weekInput.value = this.state.trackerConfig.numWeeks;
      if (startInput) startInput.value = this.state.trackerConfig.startDate;

      // Populate category filter
      const catSelect = document.getElementById('habitCategoryFilter');
      const categories = ['all', ...new Set(this.state.habits.map(h => h.category || 'General'))];
      catSelect.innerHTML = categories.map(c =>
        `<option value="${this.escapeHtml(c)}" ${this.habitCategoryFilter === c ? 'selected' : ''}>${c === 'all' ? 'All Categories' : this.escapeHtml(c)}</option>`
      ).join('');

      const dates = this.habitEngine.getCycleDates();
      const numWeeks = Math.ceil(dates.length / 7);
      const todayISO = DateUtils.toISODate(new Date());

      // Render Weekly Summary Strip
      const strip = document.getElementById('weeklyProgressStrip');
      let stripHtml = '';
      for (let w = 0; w < numWeeks; w++) {
        const wDates = dates.slice(w * 7, (w + 1) * 7);
        const pct = this.habitEngine.getRangeCompletion(wDates);
        const isCurrent = wDates.some(d => DateUtils.toISODate(d) === todayISO);
        stripHtml += `
          <div class="week-pill-card ${isCurrent ? 'current-week' : ''}">
            <div class="week-pill-top">
              <span>Week ${w + 1}</span>
              <span>${pct}%</span>
            </div>
            <div style="font-size:0.68rem;color:var(--text-secondary);margin-bottom:4px;">
              ${DateUtils.formatShort(wDates[0])} – ${DateUtils.formatShort(wDates[wDates.length - 1])}
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
        `;
      }
      strip.innerHTML = stripHtml;

      // Filter habits
      const filteredHabits = this.state.habits.filter(h => {
        const matchesSearch = h.name.toLowerCase().includes(this.habitSearchQuery.toLowerCase());
        const matchesCat = this.habitCategoryFilter === 'all' || h.category === this.habitCategoryFilter;
        return matchesSearch && matchesCat;
      });

      const wrapper = document.getElementById('habitMatrixWrapper');
      const emptyEl = document.getElementById('habitsEmptyState');

      if (filteredHabits.length === 0) {
        wrapper.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        emptyEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <h4>No matching habits found</h4>
          <p>Create a new habit or adjust your search and category filters.</p>
        `;
        return;
      }

      wrapper.classList.remove('hidden');
      emptyEl.classList.add('hidden');

      // Build Table Header
      const thead = document.getElementById('habitMatrixHead');
      let weekHeaders = `<th class="sticky-col" rowspan="2">Habit &amp; Category</th>`;
      for (let w = 0; w < numWeeks; w++) {
        const wStart = dates[w * 7];
        const wEnd = dates[Math.min(dates.length - 1, (w + 1) * 7 - 1)];
        weekHeaders += `<th colspan="7" class="week-group-header">Week ${w + 1} (${DateUtils.formatShort(wStart)} - ${DateUtils.formatShort(wEnd)})</th>`;
      }
      weekHeaders += `<th rowspan="2" style="min-width:110px;">Progress</th>`;

      let dayHeaders = '';
      dates.forEach((d, idx) => {
        const iso = DateUtils.toISODate(d);
        const isWeekEnd = (idx + 1) % 7 === 0;
        const isToday = iso === todayISO;
        const dayLetter = d.toLocaleDateString(undefined, { weekday: 'narrow' });
        dayHeaders += `<th class="${isWeekEnd ? 'week-end-border' : ''} ${isToday ? 'today-col-header' : ''}" title="${iso}">
          <div>${dayLetter}</div>
          <div style="font-size:0.68rem;font-weight:500;">${d.getDate()}</div>
        </th>`;
      });
      thead.innerHTML = `<tr>${weekHeaders}</tr><tr>${dayHeaders}</tr>`;

      // Build Table Body using DocumentFragment for high performance with hundreds of habits
      const tbody = document.getElementById('habitMatrixBody');
      tbody.innerHTML = '';
      const frag = document.createDocumentFragment();

      filteredHabits.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = 'habit-row';
        tr.draggable = true;
        tr.dataset.habitId = h.id;

        let completedCount = 0;
        let cellsHtml = '';
        dates.forEach((d, idx) => {
          const iso = DateUtils.toISODate(d);
          const checked = this.habitEngine.isCompleted(h.id, iso);
          if (checked) completedCount++;
          const isWeekEnd = (idx + 1) % 7 === 0;
          cellsHtml += `
            <td class="${isWeekEnd ? 'week-end-border' : ''}">
              <button type="button"
                class="matrix-check-btn ${checked ? 'checked' : ''}"
                data-toggle-habit="${h.id}"
                data-toggle-date="${iso}"
                style="${checked ? `background:${h.color};` : ''}"
                aria-label="${this.escapeHtml(h.name)} on ${iso}">
                ${checked ? '✓' : ''}
              </button>
            </td>
          `;
        });

        const pct = dates.length > 0 ? Math.round((completedCount / dates.length) * 100) : 0;

        tr.innerHTML = `
          <td class="sticky-col">
            <div class="habit-cell-main">
              <div class="habit-info-wrap">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <span class="color-dot" style="background:${h.color}"></span>
                <span class="habit-title-text" title="${this.escapeHtml(h.name)}">${this.escapeHtml(h.name)}</span>
                <span class="habit-cat-tag">${this.escapeHtml(h.category)}</span>
              </div>
              <div class="habit-row-actions">
                <button type="button" class="mini-action-btn" data-edit-habit="${h.id}" title="Edit Habit">✎</button>
                <button type="button" class="mini-action-btn delete" data-delete-habit="${h.id}" title="Delete Habit">🗑</button>
              </div>
            </div>
          </td>
          ${cellsHtml}
          <td>
            <div style="font-size:0.75rem;font-weight:700;margin-bottom:3px;">${pct}% (${completedCount}/${dates.length})</div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${h.color};"></div></div>
          </td>
        `;
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);

      // Build Footer Daily Completion Row
      const tfoot = document.getElementById('habitMatrixFoot');
      let footCells = `<td class="sticky-col">Daily Completion %</td>`;
      dates.forEach((d, idx) => {
        const iso = DateUtils.toISODate(d);
        const stats = this.habitEngine.getDayStats(iso);
        const isWeekEnd = (idx + 1) % 7 === 0;
        footCells += `<td class="${isWeekEnd ? 'week-end-border' : ''}" style="font-size:0.72rem;font-weight:700;">${stats.pct}%</td>`;
      });
      footCells += `<td style="font-weight:800;">${this.habitEngine.getRangeCompletion(dates)}%</td>`;
      tfoot.innerHTML = `<tr>${footCells}</tr>`;
    }

    openHabitModal(existingHabit = null) {
      const isEdit = Boolean(existingHabit);
      const h = existingHabit || { name: '', category: 'Study', color: this.state.settings.accentColor };

      this.openModal({
        title: isEdit ? 'Edit Habit' : 'Create New Habit',
        bodyHtml: `
          <form id="habitModalForm">
            <div class="form-group">
              <label class="form-label" for="hmName">Habit Name</label>
              <input type="text" id="hmName" class="form-input" required placeholder="e.g., Write full chapter" value="${this.escapeHtml(h.name)}" />
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="hmCategory">Category</label>
                <input type="text" id="hmCategory" class="form-input" list="habitCatSuggestions" required value="${this.escapeHtml(h.category)}" />
                <datalist id="habitCatSuggestions">
                  <option value="Study"><option value="Health"><option value="Productivity"><option value="Wellness"><option value="Finance">
                </datalist>
              </div>
              <div class="form-group">
                <label class="form-label" for="hmColor">Accent Color</label>
                <input type="color" id="hmColor" class="form-input" style="height:40px;padding:4px;" value="${h.color}" />
              </div>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="hmCancel">Cancel</button>
          <button type="submit" form="habitModalForm" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Habit'}</button>
        `
      });

      document.getElementById('hmCancel').onclick = () => this.closeModal();
      document.getElementById('habitModalForm').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('hmName').value.trim();
        const category = document.getElementById('hmCategory').value.trim() || 'General';
        const color = document.getElementById('hmColor').value;
        if (!name) return;

        if (isEdit) {
          existingHabit.name = name;
          existingHabit.category = category;
          existingHabit.color = color;
          this.showToast('Habit updated');
        } else {
          this.state.habits.push({
            id: 'hab_' + Date.now(),
            name,
            category,
            color
          });
          this.showToast(`Added "${name}"`);
        }
        this.commit();
        this.closeModal();
        this.renderAll();
      };
    }

    deleteHabitWithUndo(habitId) {
      const idx = this.state.habits.findIndex(h => h.id === habitId);
      if (idx === -1) return;

      const removedHabit = this.state.habits[idx];
      const removedLogs = this.state.habitLogs[habitId] ? { ...this.state.habitLogs[habitId] } : {};

      this.state.habits.splice(idx, 1);
      delete this.state.habitLogs[habitId];
      this.commit();
      this.renderAll();

      this.showToast(`Deleted "${removedHabit.name}"`, () => {
        this.state.habits.splice(idx, 0, removedHabit);
        this.state.habitLogs[habitId] = removedLogs;
        this.commit();
        this.renderAll();
        this.showToast(`Restored "${removedHabit.name}"`);
      });
    }

    /* ---------------- 3. Render Calendar View ---------------- */
    renderCalendar() {
      const container = document.getElementById('calendarGridContainer');
      const titleEl = document.getElementById('calendarPeriodTitle');
      const firstDay = Number(this.state.settings.firstDayOfWeek);
      const todayISO = DateUtils.toISODate(new Date());

      const baseWeekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const orderedWeekdays = Array.from({ length: 7 }, (_, i) => baseWeekdayNames[(firstDay + i) % 7]);

      let gridDates = [];
      if (this.calendarMode === 'week') {
        const wStart = DateUtils.getStartOfWeek(this.calendarCursor, firstDay);
        gridDates = Array.from({ length: 7 }, (_, i) => DateUtils.addDays(wStart, i));
        titleEl.textContent = `${DateUtils.formatShort(gridDates[0])} – ${DateUtils.formatShort(gridDates[6])}, ${gridDates[6].getFullYear()}`;
      } else {
        const year = this.calendarCursor.getFullYear();
        const month = this.calendarCursor.getMonth();
        titleEl.textContent = this.calendarCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const firstOfMonth = new Date(year, month, 1);
        const startOffset = (firstOfMonth.getDay() - firstDay + 7) % 7;
        const gridStart = DateUtils.addDays(firstOfMonth, -startOffset);
        gridDates = Array.from({ length: 42 }, (_, i) => DateUtils.addDays(gridStart, i));
      }

      const weekdaysHtml = orderedWeekdays.map(d => `<div>${d}</div>`).join('');
      const daysHtml = gridDates.map(d => {
        const iso = DateUtils.toISODate(d);
        const isOtherMonth = this.calendarMode === 'month' && d.getMonth() !== this.calendarCursor.getMonth();
        const isToday = iso === todayISO;
        const isSelected = iso === this.selectedCalDateISO;
        const completedHabits = this.state.habits.filter(h => this.habitEngine.isCompleted(h.id, iso));

        const dots = completedHabits.map(h =>
          `<span class="cal-habit-dot" style="background:${h.color}" title="${this.escapeHtml(h.name)}"></span>`
        ).join('');

        return `
          <div class="cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'selected' : ''}" data-select-cal-date="${iso}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="cal-day-num">${d.getDate()}</span>
              ${completedHabits.length > 0 ? `<span style="font-size:0.68rem;font-weight:700;color:var(--accent);">${completedHabits.length}/${this.state.habits.length}</span>` : ''}
            </div>
            <div class="cal-dots-row">${dots}</div>
          </div>
        `;
      }).join('');

      container.innerHTML = `<div class="cal-weekdays">${weekdaysHtml}</div><div class="cal-days-grid">${daysHtml}</div>`;
      this.renderCalendarInspector();
    }

    renderCalendarInspector() {
      const iso = this.selectedCalDateISO;
      const d = DateUtils.parseISODate(iso);
      document.getElementById('inspectorDateTitle').textContent = d.toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
      });

      const stats = this.habitEngine.getDayStats(iso);
      document.getElementById('inspectorSummary').textContent = `${stats.completed} of ${stats.total} habits completed (${stats.pct}%)`;

      const list = document.getElementById('inspectorHabitsList');
      if (this.state.habits.length === 0) {
        list.innerHTML = `<p class="inspector-sub">No habits configured.</p>`;
        return;
      }

      list.innerHTML = this.state.habits.map(h => {
        const done = this.habitEngine.isCompleted(h.id, iso);
        return `
          <div class="today-habit-item" data-cal-toggle-habit="${h.id}" data-cal-toggle-date="${iso}">
            <div class="today-habit-left">
              <span class="color-dot" style="background:${h.color}"></span>
              <span style="font-size:0.84rem;font-weight:600;">${this.escapeHtml(h.name)}</span>
            </div>
            <input type="checkbox" ${done ? 'checked' : ''} />
          </div>
        `;
      }).join('');
    }

    /* ---------------- 4. Render Goals & Countdowns ---------------- */
    renderCountdowns() {
      const grid = document.getElementById('countdownsGrid');
      const empty = document.getElementById('countdownsEmptyState');

      if (this.state.countdowns.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        empty.innerHTML = `
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h4>No active countdowns or test dates</h4>
          <p>Add an upcoming exam, deadline, or personal goal to track days, hours, minutes, and seconds remaining.</p>
        `;
        return;
      }

      empty.classList.add('hidden');
      grid.innerHTML = this.state.countdowns.map(cd => {
        const b = this.countdownEngine.computeBreakdown(cd);
        const radius = 34;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (b.progressPct / 100) * circumference;

        return `
          <article class="card countdown-card" data-cd-id="${cd.id}" style="border-top-color:${cd.color};">
            <div class="cd-top">
              <div>
                <div class="cd-badges">
                  <span class="kpi-badge badge-blue">${this.escapeHtml(cd.category)}</span>
                  <span class="kpi-badge ${cd.priority === 'high' ? 'badge-amber' : 'badge-green'}">${cd.priority.toUpperCase()} PRIORITY</span>
                </div>
                <h3 class="cd-title">${this.escapeHtml(cd.title)}</h3>
                <p class="cd-desc">${this.escapeHtml(cd.description || '')}</p>
              </div>
              <div style="display:flex;gap:4px;">
                <button type="button" class="icon-btn" data-edit-cd="${cd.id}" title="Edit">✎</button>
                <button type="button" class="icon-btn" data-delete-cd="${cd.id}" title="Delete">🗑</button>
              </div>
            </div>

            <div style="font-size:0.78rem;color:var(--text-secondary);font-weight:600;">
              📅 Target: ${cd.targetDate} at ${cd.targetTime || '00:00'}
            </div>

            <div class="cd-timer-boxes">
              <div class="cd-unit-box"><div class="cd-unit-val cd-days">${String(b.days).padStart(2, '0')}</div><div class="cd-unit-lbl">Days</div></div>
              <div class="cd-unit-box"><div class="cd-unit-val cd-hours">${String(b.hours).padStart(2, '0')}</div><div class="cd-unit-lbl">Hours</div></div>
              <div class="cd-unit-box"><div class="cd-unit-val cd-minutes">${String(b.minutes).padStart(2, '0')}</div><div class="cd-unit-lbl">Mins</div></div>
              <div class="cd-unit-box"><div class="cd-unit-val cd-seconds">${String(b.seconds).padStart(2, '0')}</div><div class="cd-unit-lbl">Secs</div></div>
            </div>

            <div class="cd-visuals-row">
              <div class="cd-ring-wrap">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="${radius}" fill="none" stroke="var(--border-color)" stroke-width="7"></circle>
                  <circle cx="42" cy="42" r="${radius}" fill="none" stroke="${cd.color}" stroke-width="7"
                    stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                    transform="rotate(-90 42 42)"></circle>
                  <text x="42" y="46" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="800">${b.progressPct}%</text>
                </svg>
                <span style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);">Time Elapsed</span>
              </div>
              <div class="cd-pie-wrap">
                <canvas id="cdPie_${cd.id}"></canvas>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // Render elapsed vs remaining Pie Chart for each countdown
      this.state.countdowns.forEach(cd => {
        const b = this.countdownEngine.computeBreakdown(cd);
        this.chartRenderer.render(`cdPie_${cd.id}`, {
          type: 'pie',
          data: {
            labels: ['Elapsed %', 'Remaining %'],
            datasets: [{
              data: [b.elapsedPct, b.remainingPct],
              backgroundColor: [cd.color, '#cbd5e1'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
            }
          }
        });
      });
    }

    openCountdownModal(existingCd = null) {
      const isEdit = Boolean(existingCd);
      const cd = existingCd || {
        title: '',
        description: '',
        category: 'Test / Exam',
        targetDate: DateUtils.toISODate(DateUtils.addDays(new Date(), 14)),
        targetTime: '09:00',
        priority: 'high',
        color: this.state.settings.accentColor
      };

      this.openModal({
        title: isEdit ? 'Edit Countdown / Test' : 'Add Goal or Test Countdown',
        bodyHtml: `
          <form id="cdModalForm">
            <div class="form-group">
              <label class="form-label" for="cdTitle">Title (Test or Goal Name)</label>
              <input type="text" id="cdTitle" class="form-input" required placeholder="e.g., Physics Midterm Exam" value="${this.escapeHtml(cd.title)}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="cdDesc">Description</label>
              <textarea id="cdDesc" class="form-textarea" rows="2" placeholder="Chapters covered or target score...">${this.escapeHtml(cd.description)}</textarea>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="cdDate">Target Date</label>
                <input type="date" id="cdDate" class="form-input" required value="${cd.targetDate}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="cdTime">Target Time</label>
                <input type="time" id="cdTime" class="form-input" required value="${cd.targetTime}" />
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="cdCategory">Category</label>
                <input type="text" id="cdCategory" class="form-input" required value="${this.escapeHtml(cd.category)}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="cdPriority">Priority</label>
                <select id="cdPriority" class="form-select">
                  <option value="high" ${cd.priority === 'high' ? 'selected' : ''}>High</option>
                  <option value="medium" ${cd.priority === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="low" ${cd.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="cdColor">Card Accent Color</label>
              <input type="color" id="cdColor" class="form-input" style="height:38px;padding:4px;" value="${cd.color}" />
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="cdCancel">Cancel</button>
          <button type="submit" form="cdModalForm" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Countdown'}</button>
        `
      });

      document.getElementById('cdCancel').onclick = () => this.closeModal();
      document.getElementById('cdModalForm').onsubmit = (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('cdTitle').value.trim(),
          description: document.getElementById('cdDesc').value.trim(),
          targetDate: document.getElementById('cdDate').value,
          targetTime: document.getElementById('cdTime').value || '00:00',
          category: document.getElementById('cdCategory').value.trim() || 'Goal',
          priority: document.getElementById('cdPriority').value,
          color: document.getElementById('cdColor').value
        };
        if (!payload.title || !payload.targetDate) return;

        if (isEdit) {
          Object.assign(existingCd, payload);
          this.showToast('Countdown updated');
        } else {
          this.state.countdowns.push({
            id: 'cd_' + Date.now(),
            createdAt: new Date().toISOString(),
            ...payload
          });
          this.showToast('Countdown created');
        }
        this.commit();
        this.closeModal();
        this.renderAll();
      };
    }

    /* ---------------- 5. Render Analytics & Statistics ---------------- */
    renderAnalytics() {
      const stats = this.habitEngine.computeComprehensiveStats();
      const accent = this.state.settings.accentColor;

      // 9 Required Statistics Cards
      const statItems = [
        { label: 'Total Habits Completed', val: stats.totalHabitCheckins, hint: 'All recorded check-ins' },
        { label: 'Completion Percentage', val: `${stats.cyclePct}%`, hint: 'Current active cycle' },
        { label: 'Average Completion', val: `${stats.monthPct}%`, hint: 'Monthly daily average' },
        { label: 'Best Week', val: stats.bestWeekLabel, hint: 'Highest weekly score' },
        { label: 'Best Month', val: stats.bestMonthLabel, hint: 'Peak monthly check-ins' },
        { label: 'Longest Streak', val: `${stats.longestStreak} days`, hint: 'All-time consecutive days' },
        { label: 'Current Streak', val: `${stats.currentStreak} days`, hint: 'Active unbroken streak' },
        { label: 'Most Successful Habit', val: stats.mostSuccessful, hint: 'Top completed habit' },
        { label: 'Least Successful Habit', val: stats.leastSuccessful, hint: 'Needs extra focus' }
      ];

      document.getElementById('statisticsCardsGrid').innerHTML = statItems.map(item => `
        <div class="stat-mini-card">
          <div class="stat-mini-lbl">${item.label}</div>
          <div class="stat-mini-val">${this.escapeHtml(String(item.val))}</div>
          <div class="stat-mini-hint">${item.hint}</div>
        </div>
      `).join('');

      // Timeframe window
      const dayCount = this.analyticsRange === 'week' ? 7 : (this.analyticsRange === 'month' ? 30 : 365);
      const rangeDates = Array.from({ length: dayCount }, (_, i) => DateUtils.addDays(new Date(), i - (dayCount - 1)));

      // Contribution Heatmap
      const heatmapEl = document.getElementById('contributionHeatmap');
      const hmDates = this.analyticsRange === 'week'
        ? Array.from({ length: 84 }, (_, i) => DateUtils.addDays(new Date(), i - 83))
        : rangeDates;

      let colsHtml = '';
      for (let i = 0; i < hmDates.length; i += 7) {
        const slice = hmDates.slice(i, i + 7);
        const boxes = slice.map(d => {
          const iso = DateUtils.toISODate(d);
          const pct = this.habitEngine.getDayStats(iso).pct;
          const level = pct === 0 ? 0 : (pct <= 25 ? 1 : (pct <= 50 ? 2 : (pct <= 75 ? 3 : 4)));
          return `<div class="hm-box hm-${level}" title="${iso}: ${pct}%"></div>`;
        }).join('');
        colsHtml += `<div class="hm-week-col">${boxes}</div>`;
      }
      heatmapEl.innerHTML = colsHtml;

      // 1. Daily Bar Chart (last 14 days of selected range)
      const barDates = rangeDates.slice(-14);
      this.chartRenderer.render('chartDailyBar', {
        type: 'bar',
        data: {
          labels: barDates.map(d => DateUtils.formatShort(d)),
          datasets: [{
            label: 'Daily Completion %',
            data: barDates.map(d => this.habitEngine.getDayStats(DateUtils.toISODate(d)).pct),
            backgroundColor: accent,
            borderRadius: 6
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });

      // 2. Weekly Line Graph
      const weeksCount = Math.max(4, Math.ceil(rangeDates.length / 7));
      const weeklyLabels = [];
      const weeklyValues = [];
      for (let w = 0; w < Math.min(12, weeksCount); w++) {
        const wSlice = rangeDates.slice(w * 7, (w + 1) * 7);
        if (wSlice.length > 0) {
          weeklyLabels.push(`W${w + 1}`);
          weeklyValues.push(this.habitEngine.getRangeCompletion(wSlice));
        }
      }
      this.chartRenderer.render('chartWeeklyLine', {
        type: 'line',
        data: {
          labels: weeklyLabels,
          datasets: [{
            label: 'Weekly Avg %',
            data: weeklyValues,
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.15)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });

      // 3. Monthly Line Graph (6 months)
      const monthLabels = [];
      const monthValues = [];
      const now = new Date();
      for (let m = 5; m >= 0; m--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const daysInM = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        const mDates = Array.from({ length: daysInM }, (_, i) => new Date(dt.getFullYear(), dt.getMonth(), i + 1));
        monthLabels.push(dt.toLocaleDateString(undefined, { month: 'short' }));
        monthValues.push(this.habitEngine.getRangeCompletion(mDates));
      }
      this.chartRenderer.render('chartMonthlyLine', {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Monthly %',
            data: monthValues,
            borderColor: '#059669',
            backgroundColor: 'rgba(5,150,105,0.15)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });

      // 4. Category Distribution Pie Chart & 6. Radar Chart
      const catCounts = {};
      this.state.habits.forEach(h => {
        const cat = h.category || 'General';
        const c = this.state.habitLogs[h.id] ? Object.values(this.state.habitLogs[h.id]).filter(Boolean).length : 0;
        catCounts[cat] = (catCounts[cat] || 0) + Math.max(1, c);
      });
      const catLabels = Object.keys(catCounts);
      const catData = Object.values(catCounts);
      const palette = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#e11d48', '#0891b2'];

      this.chartRenderer.render('chartCategoryPie', {
        type: 'pie',
        data: {
          labels: catLabels,
          datasets: [{ data: catData, backgroundColor: palette }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      // 5. Completion vs Missed Doughnut
      const completedPct = stats.cyclePct;
      this.chartRenderer.render('chartCompletionDoughnut', {
        type: 'doughnut',
        data: {
          labels: ['Completed %', 'Remaining / Missed %'],
          datasets: [{ data: [completedPct, 100 - completedPct], backgroundColor: [accent, '#cbd5e1'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      // 6. Radar Chart
      this.chartRenderer.render('chartCategoryRadar', {
        type: 'radar',
        data: {
          labels: catLabels.length >= 3 ? catLabels : ['Study', 'Health', 'Productivity'],
          datasets: [{
            label: 'Category Focus',
            data: catLabels.length >= 3 ? catData : [catData[0] || 5, catData[1] || 4, catData[2] || 3],
            borderColor: accent,
            backgroundColor: this.hexToRgba(accent, 0.2)
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    /* ---------------- 6. Render Notes ---------------- */
    renderNotes() {
      const grid = document.getElementById('notesGrid');
      const empty = document.getElementById('notesEmptyState');

      const filtered = this.state.notes
        .filter(n => this.notesFilter === 'all' || n.type === this.notesFilter)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned));

      if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        empty.innerHTML = `
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h4>No notes in this view</h4>
          <p>Create daily notes, weekly reflections, or interactive checklists.</p>
        `;
        return;
      }

      empty.classList.add('hidden');
      grid.innerHTML = filtered.map(n => {
        const checklistHtml = (n.checklist || []).map((item, idx) => `
          <label class="note-checklist-item ${item.done ? 'done' : ''}">
            <input type="checkbox" ${item.done ? 'checked' : ''} data-toggle-note-check="${n.id}" data-check-idx="${idx}" />
            <span>${this.escapeHtml(item.text)}</span>
          </label>
        `).join('');

        return `
          <article class="card note-card ${n.pinned ? 'pinned' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
              <span class="kpi-badge badge-purple">${n.type.toUpperCase()}</span>
              <div style="display:flex;gap:4px;">
                <button type="button" class="mini-action-btn" data-pin-note="${n.id}" title="${n.pinned ? 'Unpin' : 'Pin Note'}">${n.pinned ? '📌' : '📍'}</button>
                <button type="button" class="mini-action-btn delete" data-delete-note="${n.id}" title="Delete Note">🗑</button>
              </div>
            </div>
            <h3 class="card-title">${this.escapeHtml(n.title)}</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary);white-space:pre-wrap;">${this.escapeHtml(n.content)}</p>
            ${checklistHtml ? `<div>${checklistHtml}</div>` : ''}
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:auto;">${n.date}</div>
          </article>
        `;
      }).join('');
    }

    openNoteModal() {
      this.openModal({
        title: 'Create New Note',
        bodyHtml: `
          <form id="noteModalForm">
            <div class="form-group">
              <label class="form-label" for="noteTitle">Title</label>
              <input type="text" id="noteTitle" class="form-input" required placeholder="e.g., Chapter 4 Revision Notes" />
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="noteType">Note Type</label>
                <select id="noteType" class="form-select">
                  <option value="daily">Daily Note</option>
                  <option value="weekly">Weekly Note</option>
                  <option value="checklist">Checklist Note</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="notePinned">Pin to Top?</label>
                <select id="notePinned" class="form-select">
                  <option value="false">No</option>
                  <option value="true">Yes, Pin Note</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="noteContent">Content</label>
              <textarea id="noteContent" class="form-textarea" rows="3" placeholder="Write your thoughts..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="noteChecklistRaw">Checklist Items (one per line, optional)</label>
              <textarea id="noteChecklistRaw" class="form-textarea" rows="3" placeholder="Read pages 1-20&#10;Solve practice quiz"></textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="noteCancel">Cancel</button>
          <button type="submit" form="noteModalForm" class="btn btn-primary">Save Note</button>
        `
      });

      document.getElementById('noteCancel').onclick = () => this.closeModal();
      document.getElementById('noteModalForm').onsubmit = (e) => {
        e.preventDefault();
        const title = document.getElementById('noteTitle').value.trim();
        if (!title) return;
        const checklistLines = document.getElementById('noteChecklistRaw').value
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(text => ({ text, done: false }));

        this.state.notes.unshift({
          id: 'note_' + Date.now(),
          title,
          type: document.getElementById('noteType').value,
          pinned: document.getElementById('notePinned').value === 'true',
          date: DateUtils.toISODate(new Date()),
          content: document.getElementById('noteContent').value.trim(),
          checklist: checklistLines
        });
        this.commit();
        this.closeModal();
        this.renderNotes();
        this.showToast('Note saved');
      };
    }

    /* ---------------- 7. Render To-Do List ---------------- */
    renderTodos() {
      const container = document.getElementById('todoListContainer');
      const empty = document.getElementById('todosEmptyState');

      const filtered = this.state.todos.filter(t => {
        const matchSearch = t.title.toLowerCase().includes(this.todoSearch.toLowerCase());
        const matchStatus = this.todoStatusFilter === 'all'
          || (this.todoStatusFilter === 'completed' && t.completed)
          || (this.todoStatusFilter === 'active' && !t.completed);
        const matchPrio = this.todoPriorityFilter === 'all' || t.priority === this.todoPriorityFilter;
        return matchSearch && matchStatus && matchPrio;
      });

      if (filtered.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        empty.innerHTML = `
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
          <h4>No tasks match your filters</h4>
          <p>Add a new task or reset your search filters.</p>
        `;
        return;
      }

      empty.classList.add('hidden');
      container.innerHTML = filtered.map(t => `
        <div class="todo-item ${t.completed ? 'completed' : ''}">
          <div class="todo-left">
            <input type="checkbox" ${t.completed ? 'checked' : ''} data-toggle-todo="${t.id}" />
            <div>
              <div class="todo-title">${this.escapeHtml(t.title)}</div>
              <div class="todo-meta">
                <span>Priority: <strong>${t.priority.toUpperCase()}</strong></span>
                ${t.dueDate ? `<span>Due: ${t.dueDate}</span>` : ''}
              </div>
            </div>
          </div>
          <button type="button" class="mini-action-btn delete" data-delete-todo="${t.id}" title="Delete Task">🗑</button>
        </div>
      `).join('');
    }

    openTodoModal() {
      this.openModal({
        title: 'Add New To-Do Task',
        bodyHtml: `
          <form id="todoModalForm">
            <div class="form-group">
              <label class="form-label" for="tdTitle">Task Description</label>
              <input type="text" id="tdTitle" class="form-input" required placeholder="e.g., Complete mock test #2" />
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="tdPriority">Priority</label>
                <select id="tdPriority" class="form-select">
                  <option value="high">High</option>
                  <option value="medium" selected>Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="tdDue">Due Date</label>
                <input type="date" id="tdDue" class="form-input" value="${DateUtils.toISODate(new Date())}" />
              </div>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="tdCancel">Cancel</button>
          <button type="submit" form="todoModalForm" class="btn btn-primary">Add Task</button>
        `
      });

      document.getElementById('tdCancel').onclick = () => this.closeModal();
      document.getElementById('todoModalForm').onsubmit = (e) => {
        e.preventDefault();
        const title = document.getElementById('tdTitle').value.trim();
        if (!title) return;
        this.state.todos.unshift({
          id: 'todo_' + Date.now(),
          title,
          priority: document.getElementById('tdPriority').value,
          dueDate: document.getElementById('tdDue').value,
          completed: false
        });
        this.commit();
        this.closeModal();
        this.renderAll();
        this.showToast('Task added');
      };
    }

    /* ---------------- 8. Render Archives ---------------- */
    renderArchives() {
      const container = document.getElementById('archiveListContainer');
      const empty = document.getElementById('archiveEmptyState');

      if (this.state.archives.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        empty.innerHTML = `
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>
          <h4>No archived sessions yet</h4>
          <p>When you finish a test cycle or month, click "Archive Current Session" to save a snapshot and start fresh.</p>
        `;
        return;
      }

      empty.classList.add('hidden');
      container.innerHTML = this.state.archives.map(arc => `
        <article class="card archive-card">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
              <span class="kpi-badge badge-green">SNAPSHOT</span>
              <span style="font-size:0.74rem;color:var(--text-muted);">${new Date(arc.archivedAt).toLocaleDateString()}</span>
            </div>
            <h3 class="card-title">${this.escapeHtml(arc.name)}</h3>
            <p class="card-subtitle" style="margin-top:0.35rem;">
              ${arc.snapshot.habits.length} habits • ${arc.snapshot.countdowns.length} countdowns • ${arc.summaryRate}% completion
            </p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
            <button type="button" class="btn btn-primary btn-xs" data-restore-archive="${arc.id}">Restore</button>
            <button type="button" class="btn btn-secondary btn-xs" data-pdf-archive="${arc.id}">PDF</button>
            <button type="button" class="btn btn-secondary btn-xs" data-rename-archive="${arc.id}">Rename</button>
            <button type="button" class="btn btn-danger btn-xs" data-delete-archive="${arc.id}">Delete</button>
          </div>
        </article>
      `).join('');
    }

    openArchiveSessionModal() {
      const defaultName = `Cycle — ${new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
      this.openModal({
        title: 'Archive Current Session',
        bodyHtml: `
          <form id="archiveSessionForm">
            <div class="form-group">
              <label class="form-label" for="arcName">Archive Session Name</label>
              <input type="text" id="arcName" class="form-input" required value="${this.escapeHtml(defaultName)}" />
            </div>
            <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
              <input type="checkbox" id="arcClearAfter" checked />
              <span>Clear current check-ins &amp; completed tasks after archiving so I can start a fresh cycle</span>
            </label>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="arcCancel">Cancel</button>
          <button type="submit" form="archiveSessionForm" class="btn btn-primary">Save Archive</button>
        `
      });

      document.getElementById('arcCancel').onclick = () => this.closeModal();
      document.getElementById('archiveSessionForm').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('arcName').value.trim();
        if (!name) return;
        const clearAfter = document.getElementById('arcClearAfter').checked;
        const stats = this.habitEngine.computeComprehensiveStats();

        const snapshot = JSON.parse(JSON.stringify({
          trackerConfig: this.state.trackerConfig,
          habits: this.state.habits,
          habitLogs: this.state.habitLogs,
          countdowns: this.state.countdowns,
          notes: this.state.notes,
          todos: this.state.todos
        }));

        this.state.archives.unshift({
          id: 'arc_' + Date.now(),
          name,
          archivedAt: new Date().toISOString(),
          summaryRate: stats.cyclePct,
          snapshot
        });

        if (clearAfter) {
          this.state.habitLogs = {};
          this.state.todos = this.state.todos.filter(t => !t.completed);
          this.state.trackerConfig.startDate = DateUtils.toISODate(
            DateUtils.getStartOfWeek(new Date(), this.state.settings.firstDayOfWeek)
          );
        }

        this.commit();
        this.closeModal();
        this.renderAll();
        this.showToast(`Session "${name}" archived!`);
      };
    }

    /* ---------------- Event Bindings ---------------- */
    bindEvents() {
      // Sidebar navigation
      document.getElementById('mainNav').addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (btn && btn.dataset.view) this.switchView(btn.dataset.view);
      });

      // Jump view buttons
      document.body.addEventListener('click', (e) => {
        const jumpBtn = e.target.closest('[data-jump-view]');
        if (jumpBtn) this.switchView(jumpBtn.dataset.jumpView);
      });

      // Mobile drawer controls
      document.getElementById('openSidebarBtn').onclick = () => {
        document.getElementById('appSidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.remove('hidden');
      };
      const closeMobileNav = () => {
        document.getElementById('appSidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.add('hidden');
      };
      document.getElementById('closeSidebarBtn').onclick = closeMobileNav;
      document.getElementById('sidebarOverlay').onclick = closeMobileNav;

      // Modal close
      document.getElementById('modalCloseBtn').onclick = () => this.closeModal();
      document.getElementById('modalBackdrop').addEventListener('click', (e) => {
        if (e.target.id === 'modalBackdrop') this.closeModal();
      });

      // Quick Theme Toggle
      document.getElementById('quickThemeToggle').onclick = () => {
        this.state.settings.theme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
        this.commit();
        this.applyThemeAndSettings();
      };

      // Topbar PDF & Archive
      document.getElementById('quickExportPdfBtn').onclick = () => this.exportManager.exportPDFReport();
      document.getElementById('quickArchiveBtn').onclick = () => this.openArchiveSessionModal();
      document.getElementById('archiveNowBtn').onclick = () => this.openArchiveSessionModal();

      // Backup Banner
      document.getElementById('bannerExportJsonBtn').onclick = () => {
        this.exportManager.exportJSON();
        document.getElementById('backupReminderBanner').classList.add('hidden');
      };
      document.getElementById('dismissBackupBannerBtn').onclick = () => {
        document.getElementById('backupReminderBanner').classList.add('hidden');
      };

      // Dashboard quick habit toggle
      document.getElementById('dashboardTodayHabits').addEventListener('click', (e) => {
        const item = e.target.closest('[data-dash-toggle-habit]');
        if (item) {
          this.habitEngine.toggleHabitDate(item.dataset.dashToggleHabit, DateUtils.toISODate(new Date()));
          this.renderAll();
        }
      });

      // Habit Tracker Toolbar
      document.getElementById('openAddHabitModalBtn').onclick = () => this.openHabitModal();
      document.getElementById('habitSearchInput').addEventListener('input', (e) => {
        this.habitSearchQuery = e.target.value;
        this.renderHabitTracker();
      });
      document.getElementById('habitCategoryFilter').addEventListener('change', (e) => {
        this.habitCategoryFilter = e.target.value;
        this.renderHabitTracker();
      });
      document.getElementById('weekCountInput').addEventListener('change', (e) => {
        const val = Math.max(1, Math.min(52, parseInt(e.target.value, 10) || 1));
        this.state.trackerConfig.numWeeks = val;
        this.commit();
        this.renderAll();
      });
      document.getElementById('cycleStartDateInput').addEventListener('change', (e) => {
        if (e.target.value) {
          this.state.trackerConfig.startDate = e.target.value;
          this.commit();
          this.renderAll();
        }
      });
      document.getElementById('rolloverCurrentWeekBtn').onclick = () => {
        const currentWeekStart = DateUtils.getStartOfWeek(new Date(), this.state.settings.firstDayOfWeek);
        this.state.trackerConfig.startDate = DateUtils.toISODate(currentWeekStart);
        this.commit();
        this.renderAll();
        this.showToast('Rolled over to current week');
      };

      // Habit Matrix Delegated Actions & Drag-and-Drop
      const matrixBody = document.getElementById('habitMatrixBody');
      matrixBody.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('[data-toggle-habit]');
        if (toggleBtn) {
          this.habitEngine.toggleHabitDate(toggleBtn.dataset.toggleHabit, toggleBtn.dataset.toggleDate);
          this.renderAll();
          return;
        }
        const editBtn = e.target.closest('[data-edit-habit]');
        if (editBtn) {
          const h = this.state.habits.find(item => item.id === editBtn.dataset.editHabit);
          if (h) this.openHabitModal(h);
          return;
        }
        const delBtn = e.target.closest('[data-delete-habit]');
        if (delBtn) {
          this.deleteHabitWithUndo(delBtn.dataset.deleteHabit);
        }
      });

      matrixBody.addEventListener('dragstart', (e) => {
        const row = e.target.closest('.habit-row');
        if (!row) return;
        this.draggedHabitId = row.dataset.habitId;
        row.classList.add('dragging');
      });
      matrixBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const row = e.target.closest('.habit-row');
        if (row && row.dataset.habitId !== this.draggedHabitId) {
          row.classList.add('drag-over');
        }
      });
      matrixBody.addEventListener('dragleave', (e) => {
        const row = e.target.closest('.habit-row');
        if (row) row.classList.remove('drag-over');
      });
      matrixBody.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetRow = e.target.closest('.habit-row');
        if (!targetRow || !this.draggedHabitId) return;
        targetRow.classList.remove('drag-over');

        const fromIdx = this.state.habits.findIndex(h => h.id === this.draggedHabitId);
        const toIdx = this.state.habits.findIndex(h => h.id === targetRow.dataset.habitId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const [moved] = this.state.habits.splice(fromIdx, 1);
          this.state.habits.splice(toIdx, 0, moved);
          this.commit();
          this.renderAll();
        }
      });
      matrixBody.addEventListener('dragend', () => {
        this.draggedHabitId = null;
        document.querySelectorAll('.habit-row').forEach(r => r.classList.remove('dragging', 'drag-over'));
      });

      // Calendar controls
      document.getElementById('calPrevBtn').onclick = () => {
        if (this.calendarMode === 'week') {
          this.calendarCursor = DateUtils.addDays(this.calendarCursor, -7);
        } else {
          this.calendarCursor = new Date(this.calendarCursor.getFullYear(), this.calendarCursor.getMonth() - 1, 1);
        }
        this.renderCalendar();
      };
      document.getElementById('calNextBtn').onclick = () => {
        if (this.calendarMode === 'week') {
          this.calendarCursor = DateUtils.addDays(this.calendarCursor, 7);
        } else {
          this.calendarCursor = new Date(this.calendarCursor.getFullYear(), this.calendarCursor.getMonth() + 1, 1);
        }
        this.renderCalendar();
      };
      document.getElementById('calTodayBtn').onclick = () => {
        this.calendarCursor = new Date();
        this.selectedCalDateISO = DateUtils.toISODate(new Date());
        this.renderCalendar();
      };
      document.getElementById('calJumpDateInput').addEventListener('change', (e) => {
        if (e.target.value) {
          this.calendarCursor = DateUtils.parseISODate(e.target.value);
          this.selectedCalDateISO = e.target.value;
          this.renderCalendar();
        }
      });
      document.querySelectorAll('[data-cal-mode]').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('[data-cal-mode]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.calendarMode = btn.dataset.calMode;
          this.renderCalendar();
        };
      });
      document.getElementById('calendarGridContainer').addEventListener('click', (e) => {
        const cell = e.target.closest('[data-select-cal-date]');
        if (cell) {
          this.selectedCalDateISO = cell.dataset.selectCalDate;
          this.renderCalendar();
        }
      });
      document.getElementById('inspectorHabitsList').addEventListener('click', (e) => {
        const item = e.target.closest('[data-cal-toggle-habit]');
        if (item) {
          this.habitEngine.toggleHabitDate(item.dataset.calToggleHabit, item.dataset.calToggleDate);
          this.renderAll();
        }
      });

      // Countdowns
      document.getElementById('openAddCountdownBtn').onclick = () => this.openCountdownModal();
      document.getElementById('countdownsGrid').addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-cd]');
        if (editBtn) {
          const cd = this.state.countdowns.find(c => c.id === editBtn.dataset.editCd);
          if (cd) this.openCountdownModal(cd);
          return;
        }
        const delBtn = e.target.closest('[data-delete-cd]');
        if (delBtn) {
          this.confirmDialog('Delete Countdown', 'Remove this goal/test countdown?', () => {
            this.state.countdowns = this.state.countdowns.filter(c => c.id !== delBtn.dataset.deleteCd);
            this.commit();
            this.renderAll();
            this.showToast('Countdown removed');
          }, true);
        }
      });

      // Analytics Filter
      document.getElementById('analyticsTimeFilter').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-range]');
        if (!btn) return;
        document.querySelectorAll('#analyticsTimeFilter .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.analyticsRange = btn.dataset.range;
        this.renderAnalytics();
      });

      // Notes
      document.getElementById('openAddNoteBtn').onclick = () => this.openNoteModal();
      document.getElementById('notesTypeFilter').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-note-filter]');
        if (!btn) return;
        document.querySelectorAll('#notesTypeFilter .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.notesFilter = btn.dataset.noteFilter;
        this.renderNotes();
      });
      document.getElementById('notesGrid').addEventListener('click', (e) => {
        const pinBtn = e.target.closest('[data-pin-note]');
        if (pinBtn) {
          const note = this.state.notes.find(n => n.id === pinBtn.dataset.pinNote);
          if (note) {
            note.pinned = !note.pinned;
            this.commit();
            this.renderNotes();
          }
          return;
        }
        const delBtn = e.target.closest('[data-delete-note]');
        if (delBtn) {
          this.state.notes = this.state.notes.filter(n => n.id !== delBtn.dataset.deleteNote);
          this.commit();
          this.renderNotes();
          this.showToast('Note deleted');
          return;
        }
        const chk = e.target.closest('[data-toggle-note-check]');
        if (chk) {
          const note = this.state.notes.find(n => n.id === chk.dataset.toggleNoteCheck);
          const idx = Number(chk.dataset.checkIdx);
          if (note && note.checklist[idx]) {
            note.checklist[idx].done = !note.checklist[idx].done;
            this.commit();
            this.renderNotes();
          }
        }
      });

      // To-Do List
      document.getElementById('openAddTodoBtn').onclick = () => this.openTodoModal();
      document.getElementById('todoSearchInput').addEventListener('input', (e) => {
        this.todoSearch = e.target.value;
        this.renderTodos();
      });
      document.getElementById('todoStatusFilter').addEventListener('change', (e) => {
        this.todoStatusFilter = e.target.value;
        this.renderTodos();
      });
      document.getElementById('todoPriorityFilter').addEventListener('change', (e) => {
        this.todoPriorityFilter = e.target.value;
        this.renderTodos();
      });
      document.getElementById('todoListContainer').addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-toggle-todo]');
        if (toggle) {
          const td = this.state.todos.find(t => t.id === toggle.dataset.toggleTodo);
          if (td) {
            td.completed = !td.completed;
            this.commit();
            this.renderAll();
          }
          return;
        }
        const del = e.target.closest('[data-delete-todo]');
        if (del) {
          this.state.todos = this.state.todos.filter(t => t.id !== del.dataset.deleteTodo);
          this.commit();
          this.renderAll();
          this.showToast('Task deleted');
        }
      });

      // Archives
      document.getElementById('archiveListContainer').addEventListener('click', (e) => {
        const restoreBtn = e.target.closest('[data-restore-archive]');
        if (restoreBtn) {
          const arc = this.state.archives.find(a => a.id === restoreBtn.dataset.restoreArchive);
          if (!arc) return;
          this.confirmDialog('Restore Archive', `Replace current workspace with "${arc.name}"?`, () => {
            Object.assign(this.state, JSON.parse(JSON.stringify(arc.snapshot)));
            this.commit();
            this.renderAll();
            this.showToast(`Restored "${arc.name}"`);
          });
          return;
        }
        const pdfBtn = e.target.closest('[data-pdf-archive]');
        if (pdfBtn) {
          const arc = this.state.archives.find(a => a.id === pdfBtn.dataset.pdfArchive);
          if (arc) this.exportManager.exportPDFReport(arc);
          return;
        }
        const renameBtn = e.target.closest('[data-rename-archive]');
        if (renameBtn) {
          const arc = this.state.archives.find(a => a.id === renameBtn.dataset.renameArchive);
          if (!arc) return;
          this.openModal({
            title: 'Rename Archive',
            bodyHtml: `<input type="text" id="renameArcInput" class="form-input w-full" value="${this.escapeHtml(arc.name)}" />`,
            footerHtml: `<button type="button" class="btn btn-primary" id="saveArcRename">Save Name</button>`
          });
          document.getElementById('saveArcRename').onclick = () => {
            const val = document.getElementById('renameArcInput').value.trim();
            if (val) {
              arc.name = val;
              this.commit();
              this.renderArchives();
            }
            this.closeModal();
          };
          return;
        }
        const delBtn = e.target.closest('[data-delete-archive]');
        if (delBtn) {
          this.confirmDialog('Delete Archive', 'Permanently delete this archive snapshot?', () => {
            this.state.archives = this.state.archives.filter(a => a.id !== delBtn.dataset.deleteArchive);
            this.commit();
            this.renderArchives();
            this.showToast('Archive deleted');
          }, true);
        }
      });

      // Settings & Import/Export
      document.getElementById('settingThemeSelect').addEventListener('change', (e) => {
        this.state.settings.theme = e.target.value;
        this.commit();
        this.applyThemeAndSettings();
      });
      document.getElementById('settingAccentColor').addEventListener('input', (e) => {
        this.state.settings.accentColor = e.target.value;
        this.commit();
        this.applyThemeAndSettings();
        this.renderAll();
      });
      document.querySelectorAll('.preset-dot').forEach(dot => {
        dot.onclick = () => {
          this.state.settings.accentColor = dot.dataset.color;
          this.commit();
          this.applyThemeAndSettings();
          this.renderAll();
        };
      });
      document.getElementById('settingFontSize').addEventListener('change', (e) => {
        this.state.settings.fontSize = e.target.value;
        this.commit();
        this.applyThemeAndSettings();
      });
      document.getElementById('settingFirstDay').addEventListener('change', (e) => {
        this.state.settings.firstDayOfWeek = Number(e.target.value);
        this.commit();
        this.renderAll();
      });
      document.getElementById('settingLanguage').addEventListener('change', (e) => {
        this.state.settings.language = e.target.value;
        this.commit();
        this.applyThemeAndSettings();
      });
      document.getElementById('settingBackupDays').addEventListener('change', (e) => {
        this.state.settings.backupReminderDays = Number(e.target.value);
        this.commit();
      });

      document.getElementById('exportPdfBtn').onclick = () => this.exportManager.exportPDFReport();
      document.getElementById('exportJsonBtn').onclick = () => this.exportManager.exportJSON();
      document.getElementById('exportCsvBtn').onclick = () => this.exportManager.exportCSV();
      document.getElementById('importJsonInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.exportManager.importJSONFile(e.target.files[0]);
          e.target.value = '';
        }
      });

      document.getElementById('resetAllDataBtn').onclick = () => {
        this.confirmDialog(
          'Reset All Application Data',
          'This will permanently erase all habits, logs, countdowns, notes, to-dos, and archives. Consider exporting a JSON backup first.',
          () => {
            localStorage.removeItem(this.storage.storageKey);
            this.state = this.storage.getDefaultState();
            this.commit();
            this.applyThemeAndSettings();
            this.renderAll();
            this.showToast('All data reset to defaults');
          },
          true
        );
      };
    }
  }

  /* ------------------------------------------------------------------------
     Bootstrap Application on DOM Ready
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    window.lifeTrackApp = new AppController();
    window.lifeTrackApp.init();
  });
})();
