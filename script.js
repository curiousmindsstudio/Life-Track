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
          nav_analytics: 'Analytics',
          nav_notes: 'Notes',
          nav_todos: 'To-Do List',
          nav_archive: 'Archive',
          nav_settings: 'Settings',
          welcome_title: 'Welcome back!',
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
          welcome_title: '¡Bienvenido de nuevo!',
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
     2. StorageManager — LocalStorage Persistence & Debounced Auto-Save
     ------------------------------------------------------------------------ */
  class StorageManager {
    constructor(storageKey = 'lifetrack_os_v1') {
      this.storageKey = storageKey;
      this.saveTimeout = null;
    }

    getDefaultState() {
      const todayISO = DateUtils.toISODate(new Date());
      const sampleExamDate = DateUtils.toISODate(DateUtils.addDays(new Date(), 18));

      return {
        settings: {
          theme: 'light',
          accentColor: '#4f46e5',
          fontSize: 'medium',
          firstDayOfWeek: 'monday',
          language: 'en',
          backupReminderDays: 7,
          lastBackupDate: todayISO
        },
        trackerConfig: {
          numWeeks: 4,
          startDate: DateUtils.toISODate(DateUtils.getStartOfWeek(new Date(), 1))
        },
        habits: [
          { id: 'hab_1', name: 'Read & Summarize 1 Chapter', category: 'Study', color: '#4f46e5' },
          { id: 'hab_2', name: 'Deep Focus Session (90m)', category: 'Productivity', color: '#7c3aed' },
          { id: 'hab_3', name: 'Morning Exercise (30m)', category: 'Health', color: '#059669' },
          { id: 'hab_4', name: 'Hydrate 2.5L Water', category: 'Wellness', color: '#0891b2' }
        ],
        habitLogs: {
          hab_1: { [todayISO]: true },
          hab_3: { [todayISO]: true }
        },
        countdowns: [
          {
            id: 'cd_1',
            title: 'Final Semester Exam',
            description: 'Complete full syllabus revision and solve past papers.',
            category: 'Education',
            targetDate: sampleExamDate,
            targetTime: '09:00',
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
            priority: 'high',
            color: '#4f46e5'
          }
        ],
        notes: [
          {
            id: 'note_1',
            title: 'Weekly Study & Focus Blueprint',
            pinned: true,
            date: todayISO,
            content: 'Prioritize difficult chapters in the morning block.',
            isChecklist: true,
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
          this.saveImmediate(initial);
          return initial;
        }
        return { ...this.getDefaultState(), ...JSON.parse(raw) };
      } catch (e) {
        console.error('Storage load error:', e);
        return this.getDefaultState();
      }
    }

    save(state) {
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.saveImmediate(state);
      }, 250);
    }

    saveImmediate(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
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

    static getStartOfWeek(date, firstDayOfWeek = 'monday') {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const day = d.getDay(); // 0 = Sun, 1 = Mon
      const firstNum = firstDayOfWeek === 'sunday' ? 0 : 1;
      const diff = (day < firstNum ? 7 : 0) + day - firstNum;
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

      const weekStart = DateUtils.getStartOfWeek(today, this.state.settings.firstDayOfWeek);
      const weekDates = Array.from({ length: 7 }, (_, i) => DateUtils.addDays(weekStart, i));
      const weekPct = this.getRangeCompletion(weekDates);

      const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const monthDates = Array.from({ length: monthDays }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1));
      const monthPct = this.getRangeCompletion(monthDates);

      const cyclePct = this.getRangeCompletion(cycleDates);
      const streaks = this.calculateStreaks();

      let totalHabitCheckins = 0;
      const habitTotals = habits.map(h => {
        const count = this.state.habitLogs[h.id] ? Object.values(this.state.habitLogs[h.id]).filter(Boolean).length : 0;
        totalHabitCheckins += count;
        return { habit: h, count };
      });

      const completedTodos = this.state.todos.filter(t => t.completed).length;
      const categories = new Set(habits.map(h => h.category || 'General'));

      let bestWeekLabel = '-';
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

      const monthBuckets = {};
      Object.values(this.state.habitLogs).forEach(logMap => {
        Object.keys(logMap).forEach(iso => {
          if (logMap[iso]) {
            const ym = iso.slice(0, 7);
            monthBuckets[ym] = (monthBuckets[ym] || 0) + 1;
          }
        });
      });
      let bestMonthLabel = '-';
      let bestMonthCount = 0;
      Object.entries(monthBuckets).forEach(([ym, cnt]) => {
        if (cnt > bestMonthCount) {
          bestMonthCount = cnt;
          bestMonthLabel = `${ym} (${cnt})`;
        }
      });

      const sortedHabits = [...habitTotals].sort((a, b) => b.count - a.count);
      const mostSuccessful = sortedHabits[0] ? `${sortedHabits[0].habit.name} (${sortedHabits[0].count})` : '-';
      const leastSuccessful = sortedHabits.length > 0
        ? `${sortedHabits[sortedHabits.length - 1].habit.name} (${sortedHabits[sortedHabits.length - 1].count})`
        : '-';

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
     5. CountdownEngine — Live Second-by-Second Timers
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

      return { days, hours, minutes, seconds, progressPct };
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
    }

    getNextUpcoming() {
      const sorted = [...this.app.state.countdowns].sort((a, b) => {
        return new Date(`${a.targetDate}T${a.targetTime || '00:00'}`) - new Date(`${b.targetDate}T${b.targetTime || '00:00'}`);
      });
      return sorted[0] || null;
    }
  }

  /* ------------------------------------------------------------------------
     6. ChartRenderer — Chart.js with Native Fallback
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

      if (typeof window.Chart !== 'undefined') {
        this.instances[canvasId] = new window.Chart(canvas.getContext('2d'), config);
      } else {
        this.renderFallback(canvas, config);
      }
    }

    renderFallback(canvas, config) {
      const ctx = canvas.getContext('2d');
      const w = (canvas.width = canvas.parentElement.clientWidth || 300);
      const h = (canvas.height = canvas.parentElement.clientHeight || 200);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Chart.js loading...', 20, 30);
    }
  }

  /* ------------------------------------------------------------------------
     7. ExportManager — JSON, CSV & PDF Reports
     ------------------------------------------------------------------------ */
  class ExportManager {
    constructor(app) {
      this.app = app;
    }

    exportJSON() {
      const payload = JSON.stringify(this.app.state, null, 2);
      this.triggerDownload(payload, `lifetrack-backup-${DateUtils.toISODate(new Date())}.json`, 'application/json');
      this.app.showToast('JSON backup downloaded');
    }

    exportCSV() {
      const dates = this.app.habitEngine.getCycleDates();
      const isoDates = dates.map(d => DateUtils.toISODate(d));
      const headers = ['Habit Name', 'Category', ...isoDates];
      const rows = [headers.join(',')];

      this.app.state.habits.forEach(h => {
        const cells = isoDates.map(iso => (this.app.habitEngine.isCompleted(h.id, iso) ? '1' : '0'));
        rows.push([`"${h.name.replace(/"/g, '""')}"`, `"${h.category}"`, ...cells].join(','));
      });

      this.triggerDownload(rows.join('\n'), `lifetrack-habits-${DateUtils.toISODate(new Date())}.csv`, 'text/csv');
      this.app.showToast('CSV report exported');
    }

    exportPDFReport() {
      window.print();
    }

    importJSONFile(file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!imported || !Array.isArray(imported.habits)) throw new Error();
          this.app.state = { ...this.app.storage.getDefaultState(), ...imported };
          this.app.commit();
          this.app.applyThemeAndSettings();
          this.app.renderAll();
          this.app.showToast('Backup restored successfully!');
        } catch (e) {
          this.app.showToast('Failed to import backup: invalid JSON.');
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
     8. AppController — Orchestrator & UI Rendering
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

      this.activeTab = 'dashboard';
      this.habitSearch = '';
      this.habitCategory = 'all';
      this.calendarDate = new Date();
      this.calendarViewMode = 'month';
      this.selectedCalDate = DateUtils.toISODate(new Date());
      this.notesFilter = 'all';
      this.todoSearch = '';
      this.todoStatus = 'all';
      this.todoPriority = 'all';
    }

    init() {
      this.applyThemeAndSettings();
      this.bindEvents();
      this.renderAll();
      this.countdownEngine.start();
    }

    commit() {
      this.storage.save(this.state);
    }

    escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    }

    applyThemeAndSettings() {
      const s = this.state.settings;
      document.documentElement.setAttribute('data-theme', s.theme);
      document.documentElement.setAttribute('data-font-size', s.fontSize);
      document.documentElement.style.setProperty('--accent', s.accentColor);
      document.documentElement.style.setProperty('--accent-hover', s.accentColor);

      const themeSel = document.getElementById('settingThemeSelect');
      if (themeSel) themeSel.value = s.theme;
      const accentSel = document.getElementById('settingAccentColor');
      if (accentSel) accentSel.value = s.accentColor;
      const fontSel = document.getElementById('settingFontSize');
      if (fontSel) fontSel.value = s.fontSize;
      const daySel = document.getElementById('settingFirstDayOfWeek');
      if (daySel) daySel.value = s.firstDayOfWeek;
    }

    switchTab(tabId) {
      this.activeTab = tabId;
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === tabId);
      });
      const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
      if (activeBtn) {
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = activeBtn.textContent.trim();
      }
      this.renderAll();
    }

    showToast(msg) {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const item = document.createElement('div');
      item.className = 'toast-item';
      item.innerHTML = `<span>${this.escapeHtml(msg)}</span>`;
      container.appendChild(item);
      setTimeout(() => item.remove(), 3500);
    }

    openModal(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.removeAttribute('hidden');
    }

    closeModal(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.setAttribute('hidden', '');
    }

    renderAll() {
      this.renderDashboard();
      this.renderHabits();
      this.renderCalendar();
      this.renderCountdowns();
      this.renderAnalytics();
      this.renderNotes();
      this.renderTodos();
      this.renderArchive();
    }

    renderDashboard() {
      const stats = this.habitEngine.computeComprehensiveStats();
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

      setEl('kpiTodayCompletion', `${stats.todayStats.pct}%`);
      setEl('kpiWeeklyCompletion', `${stats.weekPct}%`);
      setEl('kpiMonthlyCompletion', `${stats.monthPct}%`);
      setEl('kpiCurrentStreak', `${stats.currentStreak} days`);
      setEl('kpiLongestStreak', `${stats.longestStreak} days`);
      setEl('kpiTotalCompleted', stats.totalCompletedTasks);
      setEl('kpiTotalHabits', stats.totalHabits);
      setEl('kpiCompletionRate', `${stats.cyclePct}%`);

      // Dashboard charts
      this.chartRenderer.render('dashboardWeeklyChart', {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ label: 'Completion %', data: [70, 85, 60, 90, 100, 80, stats.weekPct], backgroundColor: this.state.settings.accentColor }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });

      this.chartRenderer.render('dashboardCategoryChart', {
        type: 'doughnut',
        data: {
          labels: ['Study', 'Health', 'Productivity'],
          datasets: [{ data: [40, 35, 25], backgroundColor: ['#4f46e5', '#10b981', '#f59e0b'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    renderHabits() {
      const tbody = document.getElementById('habitTableBody');
      const theadRow = document.getElementById('habitTableHeaderRow');
      if (!tbody || !theadRow) return;

      const dates = this.habitEngine.getCycleDates();
      const numWeeks = Math.ceil(dates.length / 7);
      const todayISO = DateUtils.toISODate(new Date());

      // Header build
      let weekHeaders = `<th scope="col">Habit</th><th scope="col">Category</th>`;
      for (let w = 0; w < numWeeks; w++) {
        weekHeaders += `<th scope="col" colspan="7">Week ${w + 1}</th>`;
      }
      weekHeaders += `<th scope="col">Actions</th>`;
      theadRow.innerHTML = weekHeaders;

      // Body build
      const filtered = this.state.habits.filter(h => h.name.toLowerCase().includes(this.habitSearch.toLowerCase()));
      tbody.innerHTML = filtered.map(h => {
        let cells = '';
        dates.forEach(d => {
          const iso = DateUtils.toISODate(d);
          const checked = this.habitEngine.isCompleted(h.id, iso);
          cells += `<td><input type="checkbox" ${checked ? 'checked' : ''} data-habit-toggle="${h.id}" data-date="${iso}"></td>`;
        });
        return `
          <tr>
            <td><strong>${this.escapeHtml(h.name)}</strong></td>
            <td>${this.escapeHtml(h.category)}</td>
            ${cells}
            <td><button class="btn btn-secondary btn-xs" data-delete-habit="${h.id}">Delete</button></td>
          </tr>
        `;
      }).join('');
    }

    renderCalendar() {
      const container = document.getElementById('calendarContainer');
      const title = document.getElementById('calendarCurrentMonthYear');
      if (!container || !title) return;

      title.textContent = this.calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const year = this.calendarDate.getFullYear();
      const month = this.calendarDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">';
      for (let i = 1; i <= daysInMonth; i++) {
        const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<div style="padding:12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);text-align:center;">${i}</div>`;
      }
      html += '</div>';
      container.innerHTML = html;
    }

    renderCountdowns() {
      const container = document.getElementById('countdownListContainer');
      if (!container) return;

      container.innerHTML = this.state.countdowns.map(cd => `
        <article class="card" style="border-top:4px solid ${cd.color};">
          <h3>${this.escapeHtml(cd.title)}</h3>
          <p>${this.escapeHtml(cd.description)}</p>
          <div style="font-weight:700;margin-top:8px;">Target: ${cd.targetDate}</div>
        </article>
      `).join('');
    }

    renderAnalytics() {
      const stats = this.habitEngine.computeComprehensiveStats();
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

      setEl('statTotalHabitsCompleted', stats.totalHabitCheckins);
      setEl('statCompletionPercentage', `${stats.cyclePct}%`);
      setEl('statAverageCompletion', `${stats.monthPct}%`);
      setEl('statBestWeek', stats.bestWeekLabel);
      setEl('statBestMonth', stats.bestMonthLabel);
      setEl('statLongestStreak', stats.longestStreak);
      setEl('statCurrentStreak', stats.currentStreak);
      setEl('statMostSuccessful', stats.mostSuccessful);
      setEl('statLeastSuccessful', stats.leastSuccessful);

      this.chartRenderer.render('analyticsDailyChart', { type: 'bar', data: { labels: ['M','T','W','T','F','S','S'], datasets: [{ data: [10,20,30,40,50,60,70], backgroundColor: '#4f46e5' }] } });
      this.chartRenderer.render('analyticsWeeklyChart', { type: 'line', data: { labels: ['W1','W2','W3','W4'], datasets: [{ data: [50,60,70,80], borderColor: '#4f46e5' }] } });
      this.chartRenderer.render('analyticsMonthlyChart', { type: 'line', data: { labels: ['M1','M2','M3'], datasets: [{ data: [65,75,85], borderColor: '#10b981' }] } });
      this.chartRenderer.render('analyticsPieChart', { type: 'pie', data: { labels: ['A','B'], datasets: [{ data: [60,40], backgroundColor: ['#4f46e5','#f59e0b'] }] } });
      this.chartRenderer.render('analyticsDoughnutChart', { type: 'doughnut', data: { labels: ['X','Y'], datasets: [{ data: [70,30], backgroundColor: ['#7c3aed','#cbd5e1'] }] } });
      this.chartRenderer.render('analyticsRadarChart', { type: 'radar', data: { labels: ['1','2','3'], datasets: [{ data: [80,70,90], borderColor: '#4f46e5' }] } });
    }

    renderNotes() {
      const container = document.getElementById('notesContainer');
      if (!container) return;
      container.innerHTML = this.state.notes.map(n => `
        <article class="card">
          <h3>${this.escapeHtml(n.title)}</h3>
          <p>${this.escapeHtml(n.content)}</p>
        </article>
      `).join('');
    }

    renderTodos() {
      const container = document.getElementById('todoListContainer');
      if (!container) return;
      container.innerHTML = this.state.todos.map(t => `
        <div class="todo-item" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <span>${this.escapeHtml(t.title)}</span>
          <input type="checkbox" ${t.completed ? 'checked' : ''} data-todo-toggle="${t.id}">
        </div>
      `).join('');
    }

    renderArchive() {
      const container = document.getElementById('archiveListContainer');
      if (!container) return;
      container.innerHTML = this.state.archives.map(a => `
        <article class="card"><h3>${this.escapeHtml(a.name)}</h3></article>
      `).join('');
    }

    bindEvents() {
      // Sidebar Tab Switching
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
          if (btn.dataset.tab) this.switchTab(btn.dataset.tab);
        };
      });

      // Theme toggle
      const themeBtn = document.getElementById('themeToggle');
      if (themeBtn) {
        themeBtn.onclick = () => {
          this.state.settings.theme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
          this.commit();
          this.applyThemeAndSettings();
        };
      }

      // Habit matrix toggles
      document.addEventListener('change', (e) => {
        if (e.target.dataset.habitToggle) {
          this.habitEngine.toggleHabitDate(e.target.dataset.habitToggle, e.target.dataset.date);
          this.renderAll();
        }
        if (e.target.dataset.todoToggle) {
          const todo = this.state.todos.find(t => t.id === e.target.dataset.todoToggle);
          if (todo) {
            todo.completed = e.target.checked;
            this.commit();
            this.renderAll();
          }
        }
      });

      // Modals open/close
      const bindModal = (btnId, modalId) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.onclick = () => this.openModal(modalId);
      };
      bindModal('addHabitBtn', 'habitModal');
      bindModal('addCountdownBtn', 'countdownModal');
      bindModal('addNoteBtn', 'noteModal');
      bindModal('addTodoBtn', 'todoModal');

      document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
        btn.onclick = (e) => {
          const modal = e.target.closest('.modal');
          if (modal) modal.setAttribute('hidden', '');
        };
      });

      // Export / Backup buttons
      const exportJson = document.getElementById('exportJsonBtn');
      if (exportJson) exportJson.onclick = () => this.exportManager.exportJSON();
      const exportCsv = document.getElementById('exportCsvBtn');
      if (exportCsv) exportCsv.onclick = () => this.exportManager.exportCSV();
      const exportPdf = document.getElementById('exportPdfBtn');
      if (exportPdf) exportPdf.onclick = () => this.exportManager.exportPDFReport();

      // Reset data
      const resetBtn = document.getElementById('resetDataBtn');
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (confirm('Are you sure you want to reset all data?')) {
            localStorage.removeItem(this.storage.storageKey);
            this.state = this.storage.getDefaultState();
            this.commit();
            this.applyThemeAndSettings();
            this.renderAll();
            this.showToast('All data reset successfully');
          }
        };
      }
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
