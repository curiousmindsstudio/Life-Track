/* ==========================================================================
   LifeTrack — Modular Offline-First Productivity & Habit OS
   ========================================================================== */
(() => {
    'use strict';

    /* ----------------------------------------------------------------------
       1. DateUtils — Pure Date Manipulation Helpers
       ---------------------------------------------------------------------- */
    class DateUtils {
        static toISODate(date) {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        static parseISODate(isoStr) {
            const [y, m, d] = isoStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        static addDays(date, days) {
            const res = new Date(date);
            res.setDate(res.getDate() + days);
            return res;
        }

        static getStartOfWeek(date, firstDayOfWeek = 'monday') {
            const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const day = d.getDay();
            const firstNum = firstDayOfWeek === 'sunday' ? 0 : 1;
            const diff = (day < firstNum ? 7 : 0) + day - firstNum;
            d.setDate(d.getDate() - diff);
            return d;
        }

        static formatShort(date) {
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    }

    /* ----------------------------------------------------------------------
       2. StorageManager — LocalStorage Persistence & Debounced Auto-Save
       ---------------------------------------------------------------------- */
    class StorageManager {
        constructor(storageKey = 'lifetrack_os_v1') {
            this.storageKey = storageKey;
            this.saveTimeout = null;
        }

        getDefaultState() {
            const today = new Date();
            const todayISO = DateUtils.toISODate(today);
            const yesterdayISO = DateUtils.toISODate(DateUtils.addDays(today, -1));
            const twoDaysAgoISO = DateUtils.toISODate(DateUtils.addDays(today, -2));
            const examDate = DateUtils.toISODate(DateUtils.addDays(today, 18));
            const sprintDate = DateUtils.toISODate(DateUtils.addDays(today, 7));

            return {
                settings: {
                    theme: 'light',
                    accentColor: '#4f46e5',
                    fontSize: 'medium',
                    firstDayOfWeek: 'monday'
                },
                trackerConfig: {
                    numWeeks: 4,
                    startDate: DateUtils.toISODate(DateUtils.getStartOfWeek(today, 'monday'))
                },
                habits: [
                    { id: 'hab_1', name: 'Read & Summarize 1 Chapter', category: 'Study', color: '#4f46e5' },
                    { id: 'hab_2', name: 'Deep Focus Session (90m)', category: 'Productivity', color: '#7c3aed' },
                    { id: 'hab_3', name: 'Morning Exercise (30m)', category: 'Health', color: '#10b981' },
                    { id: 'hab_4', name: 'Hydrate 2.5L Water', category: 'Wellness', color: '#0891b2' }
                ],
                habitLogs: {
                    hab_1: { [twoDaysAgoISO]: true, [yesterdayISO]: true, [todayISO]: true },
                    hab_2: { [yesterdayISO]: true, [todayISO]: true },
                    hab_3: { [twoDaysAgoISO]: true, [todayISO]: true },
                    hab_4: { [yesterdayISO]: true }
                },
                countdowns: [
                    {
                        id: 'cd_1',
                        title: 'Final Semester Exam',
                        description: 'Complete full syllabus revision and solve past papers.',
                        category: 'Education',
                        targetDate: examDate,
                        targetTime: '09:00',
                        createdAt: DateUtils.addDays(today, -6).toISOString(),
                        priority: 'high',
                        color: '#4f46e5'
                    },
                    {
                        id: 'cd_2',
                        title: '7-Day Productivity Sprint',
                        description: 'Maintain 90%+ daily habit consistency for a full week.',
                        category: 'Productivity',
                        targetDate: sprintDate,
                        targetTime: '20:00',
                        createdAt: DateUtils.addDays(today, -2).toISOString(),
                        priority: 'medium',
                        color: '#10b981'
                    }
                ],
                notes: [
                    {
                        id: 'note_1',
                        title: 'Weekly Study & Focus Blueprint',
                        pinned: true,
                        date: todayISO,
                        content: '',
                        isChecklist: true,
                        checklist: [
                            { text: 'Review weak topics before noon', done: true },
                            { text: 'Complete 90-minute deep work block', done: true },
                            { text: 'Take timed practice assessment', done: false }
                        ]
                    },
                    {
                        id: 'note_2',
                        title: 'Evening Wind-Down Protocol',
                        pinned: false,
                        date: todayISO,
                        content: 'Disconnect from screens 45 minutes prior to sleep. Prepare tomorrow’s top 3 tasks in the To-Do List.',
                        isChecklist: false,
                        checklist: []
                    }
                ],
                todos: [
                    {
                        id: 'todo_1',
                        title: 'Organize study schedule for upcoming exam',
                        priority: 'high',
                        dueDate: todayISO,
                        completed: false
                    },
                    {
                        id: 'todo_2',
                        title: 'Review weekly analytics and adjust habit targets',
                        priority: 'medium',
                        dueDate: DateUtils.toISODate(DateUtils.addDays(today, 2)),
                        completed: false
                    },
                    {
                        id: 'todo_3',
                        title: 'Refill water bottle & prep morning workout gear',
                        priority: 'low',
                        dueDate: todayISO,
                        completed: true
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
                const parsed = JSON.parse(raw);
                return { ...this.getDefaultState(), ...parsed };
            } catch (e) {
                return this.getDefaultState();
            }
        }

        save(state) {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.saveImmediate(state), 200);
        }

        saveImmediate(state) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(state));
            } catch (e) {}
        }
    }

    /* ----------------------------------------------------------------------
       3. HabitEngine — Analytics, Streaks & Matrix Calculations
       ---------------------------------------------------------------------- */
    class HabitEngine {
        constructor(app) {
            this.app = app;
        }

        get state() { return this.app.state; }

        isCompleted(habitId, isoDate) {
            return Boolean(this.state.habitLogs[habitId] && this.state.habitLogs[habitId][isoDate]);
        }

        toggleHabitDate(habitId, isoDate) {
            if (!this.state.habitLogs[habitId]) this.state.habitLogs[habitId] = {};
            if (this.state.habitLogs[habitId][isoDate]) {
                delete this.state.habitLogs[habitId][isoDate];
            } else {
                this.state.habitLogs[habitId][isoDate] = true;
            }
            this.app.commit();
        }

        getCycleDates() {
            const start = DateUtils.parseISODate(this.state.trackerConfig.startDate);
            const weeks = Math.max(1, Math.min(52, Number(this.state.trackerConfig.numWeeks) || 4));
            const totalDays = weeks * 7;
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
            let longest = 1, run = 1;
            for (let i = 1; i < sortedDates.length; i++) {
                const prev = DateUtils.parseISODate(sortedDates[i - 1]);
                const curr = DateUtils.parseISODate(sortedDates[i]);
                const diff = Math.round((curr - prev) / 86400000);
                if (diff === 1) {
                    run++;
                    if (run > longest) longest = run;
                } else if (diff > 1) {
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
                weekDates,
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                totalHabitCheckins,
                totalCompletedTasks: totalHabitCheckins + completedTodos,
                totalHabits: habits.length,
                bestWeekLabel,
                bestMonthLabel,
                mostSuccessful,
                leastSuccessful
            };
        }
    }

    /* ----------------------------------------------------------------------
       4. CountdownEngine — Live Second-by-Second Timers
       ---------------------------------------------------------------------- */
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

            return { days, hours, minutes, seconds, progressPct, isExpired: remainingMs === 0 };
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
    }

    /* ----------------------------------------------------------------------
       5. ChartRenderer — Chart.js with Full Native Canvas Drawing Fallback
       ---------------------------------------------------------------------- */
    class ChartRenderer {
        constructor() {
            this.instances = {};
        }

        destroy(id) {
            if (this.instances[id]) {
                try { this.instances[id].destroy(); } catch (e) {}
                delete this.instances[id];
            }
        }

        render(canvasId, config) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            this.destroy(canvasId);

            if (typeof window.Chart !== 'undefined') {
                try {
                    this.instances[canvasId] = new window.Chart(canvas.getContext('2d'), config);
                    return;
                } catch (e) {}
            }
            this.renderNativeFallback(canvas, config);
        }

        renderNativeFallback(canvas, config) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const parent = canvas.parentElement;
            const w = (canvas.width = parent ? parent.clientWidth || 320 : 320);
            const h = (canvas.height = parent ? parent.clientHeight || 220 : 220);
            ctx.clearRect(0, 0, w, h);

            const dataset = (config.data && config.data.datasets && config.data.datasets[0]) || { data: [] };
            const labels = (config.data && config.data.labels) || [];
            const values = dataset.data || [];
            if (values.length === 0) return;

            if (config.type === 'pie' || config.type === 'doughnut') {
                const total = values.reduce((a, b) => a + b, 0) || 1;
                const cx = w / 2, cy = h / 2, radius = Math.min(w, h) * 0.36;
                const colors = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor : ['#4f46e5', '#10b981', '#f59e0b', '#7c3aed'];
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
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface') || '#fff';
                    ctx.fill();
                }
            } else {
                const maxVal = Math.max(...values, 10);
                const pad = 28;
                const chartW = w - pad * 2;
                const chartH = h - pad * 2;
                const step = chartW / values.length;

                ctx.strokeStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(pad, pad);
                ctx.lineTo(pad, h - pad);
                ctx.lineTo(w - pad, h - pad);
                ctx.stroke();

                values.forEach((val, i) => {
                    const barH = (val / maxVal) * chartH;
                    const x = pad + i * step + step * 0.2;
                    const y = h - pad - barH;
                    const bw = step * 0.6;
                    ctx.fillStyle = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i % dataset.backgroundColor.length] : (dataset.backgroundColor || '#4f46e5');
                    ctx.fillRect(x, y, bw, barH);

                    if (labels[i]) {
                        ctx.fillStyle = '#64748b';
                        ctx.font = '11px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(String(labels[i]).slice(0, 6), x + bw / 2, h - 10);
                    }
                });
            }
        }
    }

    /* ----------------------------------------------------------------------
       6. ExportManager — JSON, CSV & PDF Reports
       ---------------------------------------------------------------------- */
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
                    this.app.showToast('Invalid JSON backup file.');
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

    /* ----------------------------------------------------------------------
       7. AppController — Master Orchestrator & UI Rendering
       ---------------------------------------------------------------------- */
    class AppController {
        constructor() {
            this.storage = new StorageManager();
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
            this.todoPriority = 'all';
            this.todoStatus = 'all';
            this.pendingConfirmAction = null;
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

            const themeLabel = document.getElementById('themeToggleLabel');
            if (themeLabel) themeLabel.textContent = s.theme === 'dark' ? 'Light Mode' : 'Dark Mode';

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
            this.closeMobileSidebar();
            this.renderAll();
        }

        openMobileSidebar() {
            document.getElementById('sidebar')?.classList.add('open');
            document.getElementById('sidebarBackdrop')?.classList.add('active');
        }

        closeMobileSidebar() {
            document.getElementById('sidebar')?.classList.remove('open');
            document.getElementById('sidebarBackdrop')?.classList.remove('active');
        }

        showToast(msg) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const item = document.createElement('div');
            item.className = 'toast-item';
            item.textContent = msg;
            container.appendChild(item);
            setTimeout(() => item.remove(), 3200);
        }

        openModal(modalId) {
            const m = document.getElementById(modalId);
            if (m) m.removeAttribute('hidden');
        }

        closeModal(modalId) {
            const m = document.getElementById(modalId);
            if (m) m.setAttribute('hidden', '');
        }

        requestConfirm(title, message, onProceed) {
            const titleEl = document.getElementById('confirmModalTitle');
            const msgEl = document.getElementById('confirmModalMessage');
            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            this.pendingConfirmAction = onProceed;
            this.openModal('confirmModal');
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

        /* ----------------- 1. Dashboard Renderer ----------------- */
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

            const dayLabels = stats.weekDates.map(d => d.toLocaleDateString(undefined, { weekday: 'short' }));
            const dayValues = stats.weekDates.map(d => this.habitEngine.getDayStats(DateUtils.toISODate(d)).pct);

            this.chartRenderer.render('dashboardWeeklyChart', {
                type: 'bar',
                data: {
                    labels: dayLabels,
                    datasets: [{
                        label: 'Daily Completion %',
                        data: dayValues,
                        backgroundColor: this.state.settings.accentColor,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { min: 0, max: 100 } }
                }
            });

            const catCounts = {};
            this.state.habits.forEach(h => {
                const c = h.category || 'General';
                catCounts[c] = (catCounts[c] || 0) + 1;
            });
            const catLabels = Object.keys(catCounts);
            const catValues = Object.values(catCounts);

            this.chartRenderer.render('dashboardCategoryChart', {
                type: 'doughnut',
                data: {
                    labels: catLabels.length ? catLabels : ['No Habits'],
                    datasets: [{
                        data: catValues.length ? catValues : [1],
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#7c3aed', '#0891b2', '#ef4444']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

        /* ----------------- 2. Habit Tracker Renderer ----------------- */
        renderHabits() {
            const tbody = document.getElementById('habitTableBody');
            const thead = document.getElementById('habitTableHead');
            const weeksInput = document.getElementById('weeksCountInput');
            const catFilter = document.getElementById('habitCategoryFilter');
            if (!tbody || !thead) return;

            if (weeksInput && document.activeElement !== weeksInput) {
                weeksInput.value = this.state.trackerConfig.numWeeks;
            }

            // Populate Category Filter Options
            if (catFilter) {
                const currentVal = this.habitCategory;
                const categories = Array.from(new Set(this.state.habits.map(h => h.category || 'General')));
                catFilter.innerHTML = `<option value="all">All Categories</option>` +
                    categories.map(c => `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c)}</option>`).join('');
                catFilter.value = categories.includes(currentVal) ? currentVal : 'all';
            }

            const dates = this.habitEngine.getCycleDates();
            const numWeeks = Math.ceil(dates.length / 7);
            const todayISO = DateUtils.toISODate(new Date());

            // Build 2-row sticky header (Weeks + Days)
            let row1 = `<th rowspan="2">Habit</th><th rowspan="2">Category</th>`;
            for (let w = 0; w < numWeeks; w++) {
                const wStart = DateUtils.formatShort(dates[w * 7]);
                const wEnd = DateUtils.formatShort(dates[Math.min(dates.length - 1, (w + 1) * 7 - 1)]);
                row1 += `<th colspan="7">Week ${w + 1} (${wStart} – ${wEnd})</th>`;
            }
            row1 += `<th rowspan="2">Actions</th>`;

            let row2 = '';
            dates.forEach(d => {
                const iso = DateUtils.toISODate(d);
                const dayLetter = d.toLocaleDateString(undefined, { weekday: 'narrow' });
                const isToday = iso === todayISO;
                row2 += `<th class="${isToday ? 'today-col' : ''}" title="${iso}">${dayLetter}<br>${d.getDate()}</th>`;
            });
            thead.innerHTML = `<tr>${row1}</tr><tr>${row2}</tr>`;

            const filtered = this.state.habits.filter(h => {
                const matchSearch = h.name.toLowerCase().includes(this.habitSearch.toLowerCase());
                const matchCat = this.habitCategory === 'all' || (h.category || 'General') === this.habitCategory;
                return matchSearch && matchCat;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${dates.length + 3}" class="empty-state">No habits match your filter. Click "+ Add Habit" to create one!</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(h => {
                let cells = '';
                dates.forEach(d => {
                    const iso = DateUtils.toISODate(d);
                    const checked = this.habitEngine.isCompleted(h.id, iso);
                    const isToday = iso === todayISO;
                    cells += `<td class="${isToday ? 'today-col' : ''}"><input type="checkbox" class="habit-checkbox" ${checked ? 'checked' : ''} data-habit-toggle="${h.id}" data-date="${iso}" aria-label="${this.escapeHtml(h.name)} on ${iso}"></td>`;
                });
                return `
                    <tr>
                        <td>
                            <div class="habit-name-cell">
                                <span class="habit-color-dot" style="background:${h.color || '#4f46e5'};"></span>
                                <strong>${this.escapeHtml(h.name)}</strong>
                            </div>
                        </td>
                        <td><span class="badge badge-neutral">${this.escapeHtml(h.category || 'General')}</span></td>
                        ${cells}
                        <td><button class="btn btn-ghost-danger btn-xs" data-delete-habit="${h.id}" type="button">Delete</button></td>
                    </tr>
                `;
            }).join('');
        }

        /* ----------------- 3. Calendar & Day Inspector Renderer ----------------- */
        renderCalendar() {
            const container = document.getElementById('calendarContainer');
            const title = document.getElementById('calendarCurrentMonthYear');
            if (!container || !title) return;

            const todayISO = DateUtils.toISODate(new Date());
            const weekdays = this.state.settings.firstDayOfWeek === 'sunday'
                ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            let html = `<div class="cal-grid-7">`;
            weekdays.forEach(w => { html += `<div class="cal-weekday-header">${w}</div>`; });

            if (this.calendarViewMode === 'week') {
                const weekStart = DateUtils.getStartOfWeek(this.calendarDate, this.state.settings.firstDayOfWeek);
                const weekEnd = DateUtils.addDays(weekStart, 6);
                title.textContent = `${DateUtils.formatShort(weekStart)} – ${DateUtils.formatShort(weekEnd)}, ${weekEnd.getFullYear()}`;

                for (let i = 0; i < 7; i++) {
                    const d = DateUtils.addDays(weekStart, i);
                    html += this.buildCalendarCellHtml(d, todayISO);
                }
            } else {
                title.textContent = this.calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                const year = this.calendarDate.getFullYear();
                const month = this.calendarDate.getMonth();
                const firstDayObj = new Date(year, month, 1);
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                let startOffset = firstDayObj.getDay();
                if (this.state.settings.firstDayOfWeek !== 'sunday') {
                    startOffset = startOffset === 0 ? 6 : startOffset - 1;
                }

                for (let e = 0; e < startOffset; e++) {
                    html += `<div class="cal-day-cell empty"></div>`;
                }
                for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                    html += this.buildCalendarCellHtml(new Date(year, month, dayNum), todayISO);
                }
            }
            html += `</div>`;
            container.innerHTML = html;
            this.renderCalendarInspector();
        }

        buildCalendarCellHtml(dateObj, todayISO) {
            const iso = DateUtils.toISODate(dateObj);
            const stats = this.habitEngine.getDayStats(iso);
            const dueTodos = this.state.todos.filter(t => t.dueDate === iso);
            const dueGoals = this.state.countdowns.filter(c => c.targetDate === iso);

            const isSelected = iso === this.selectedCalDate;
            const isToday = iso === todayISO;

            let dots = '';
            if (dueTodos.length > 0) dots += `<span class="cal-dot" style="background:var(--warning);" title="${dueTodos.length} Task(s) due"></span>`;
            if (dueGoals.length > 0) dots += `<span class="cal-dot" style="background:var(--danger);" title="${dueGoals.length} Goal deadline(s)"></span>`;

            return `
                <div class="cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-cal-date="${iso}">
                    <div class="cal-day-top">
                        <span>${dateObj.getDate()}</span>
                        ${stats.total > 0 ? `<span class="cal-pct-pill">${stats.pct}%</span>` : ''}
                    </div>
                    <div class="cal-indicators">${dots}</div>
                </div>
            `;
        }

        renderCalendarInspector() {
            const dateTitle = document.getElementById('inspectorDateTitle');
            const habitsList = document.getElementById('inspectorHabitsList');
            const todosList = document.getElementById('inspectorTodosList');
            const goalsList = document.getElementById('inspectorGoalsList');
            if (!dateTitle || !habitsList) return;

            const dObj = DateUtils.parseISODate(this.selectedCalDate);
            dateTitle.textContent = dObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

            habitsList.innerHTML = this.state.habits.length === 0
                ? `<p style="font-size:0.8rem; color:var(--text-muted);">No habits configured.</p>`
                : this.state.habits.map(h => {
                    const checked = this.habitEngine.isCompleted(h.id, this.selectedCalDate);
                    return `
                        <label class="inspector-item" style="cursor:pointer;">
                            <span>${this.escapeHtml(h.name)}</span>
                            <input type="checkbox" class="habit-checkbox" ${checked ? 'checked' : ''} data-habit-toggle="${h.id}" data-date="${this.selectedCalDate}">
                        </label>
                    `;
                }).join('');

            const dayTodos = this.state.todos.filter(t => t.dueDate === this.selectedCalDate);
            todosList.innerHTML = dayTodos.length === 0
                ? `<p style="font-size:0.8rem; color:var(--text-muted);">No tasks due on this date.</p>`
                : dayTodos.map(t => `<div class="inspector-item"><span>${this.escapeHtml(t.title)}</span><span class="badge badge-${t.priority}">${t.priority}</span></div>`).join('');

            const dayGoals = this.state.countdowns.filter(c => c.targetDate === this.selectedCalDate);
            goalsList.innerHTML = dayGoals.length === 0
                ? `<p style="font-size:0.8rem; color:var(--text-muted);">No goal deadlines on this date.</p>`
                : dayGoals.map(g => `<div class="inspector-item"><strong>${this.escapeHtml(g.title)}</strong><span>${g.targetTime || ''}</span></div>`).join('');
        }

        /* ----------------- 4. Goals & Countdowns Renderer ----------------- */
        renderCountdowns() {
            const container = document.getElementById('countdownListContainer');
            if (!container) return;

            if (this.state.countdowns.length === 0) {
                container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No active goals or countdowns. Click "+ Add Countdown" to set a target milestone!</div>`;
                return;
            }

            container.innerHTML = this.state.countdowns.map(cd => {
                const b = this.countdownEngine.computeBreakdown(cd);
                return `
                    <article class="cd-card" data-cd-id="${cd.id}" style="border-top: 4px solid ${cd.color || '#4f46e5'};">
                        <div class="cd-header">
                            <div>
                                <span class="badge badge-${cd.priority || 'medium'}" style="margin-bottom:0.35rem;">${this.escapeHtml(cd.priority || 'medium')}</span>
                                <h3 style="font-size:1.08rem; font-weight:800;">${this.escapeHtml(cd.title)}</h3>
                            </div>
                            <button class="btn btn-ghost-danger btn-xs" data-delete-cd="${cd.id}" type="button">Delete</button>
                        </div>
                        ${cd.description ? `<p style="font-size:0.84rem; color:var(--text-secondary);">${this.escapeHtml(cd.description)}</p>` : ''}
                        <div class="cd-timer-boxes">
                            <div class="cd-unit"><span class="cd-days">${String(b.days).padStart(2, '0')}</span><small>Days</small></div>
                            <div class="cd-unit"><span class="cd-hours">${String(b.hours).padStart(2, '0')}</span><small>Hours</small></div>
                            <div class="cd-unit"><span class="cd-minutes">${String(b.minutes).padStart(2, '0')}</span><small>Mins</small></div>
                            <div class="cd-unit"><span class="cd-seconds">${String(b.seconds).padStart(2, '0')}</span><small>Secs</small></div>
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.3rem;">
                                <span>Target: ${cd.targetDate} ${cd.targetTime || ''}</span>
                                <span>${b.progressPct}% elapsed</span>
                            </div>
                            <div class="progress-track">
                                <div class="progress-fill" style="width:${b.progressPct}%; background:${cd.color || '#4f46e5'};"></div>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        }

        /* ----------------- 5. Analytics & Heatmap Renderer ----------------- */
        renderAnalytics() {
            const stats = this.habitEngine.computeComprehensiveStats();
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

            setEl('statTotalHabitsCompleted', stats.totalHabitCheckins);
            setEl('statCompletionPercentage', `${stats.cyclePct}%`);
            setEl('statAverageCompletion', `${stats.monthPct}%`);
            setEl('statBestWeek', stats.bestWeekLabel);
            setEl('statBestMonth', stats.bestMonthLabel);
            setEl('statLongestStreak', `${stats.longestStreak} days`);
            setEl('statCurrentStreak', `${stats.currentStreak} days`);
            setEl('statMostSuccessful', stats.mostSuccessful);
            setEl('statLeastSuccessful', stats.leastSuccessful);

            const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

            // 1. Daily Bar
            const dLabels = stats.weekDates.map(d => d.toLocaleDateString(undefined, { weekday: 'short' }));
            const dValues = stats.weekDates.map(d => this.habitEngine.getDayStats(DateUtils.toISODate(d)).pct);
            this.chartRenderer.render('analyticsDailyChart', {
                type: 'bar',
                data: { labels: dLabels, datasets: [{ data: dValues, backgroundColor: '#4f46e5', borderRadius: 5 }] },
                options: { ...chartOpts, scales: { y: { min: 0, max: 100 } } }
            });

            // 2. Weekly Line
            const cycleDates = this.habitEngine.getCycleDates();
            const numWeeks = Math.min(8, Math.ceil(cycleDates.length / 7));
            const wLabels = [], wValues = [];
            for (let w = 0; w < numWeeks; w++) {
                wLabels.push(`W${w + 1}`);
                wValues.push(this.habitEngine.getRangeCompletion(cycleDates.slice(w * 7, (w + 1) * 7)));
            }
            this.chartRenderer.render('analyticsWeeklyChart', {
                type: 'line',
                data: { labels: wLabels, datasets: [{ data: wValues, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.15)', fill: true, tension: 0.3 }] },
                options: { ...chartOpts, scales: { y: { min: 0, max: 100 } } }
            });

            // 3. Monthly Velocity Line
            this.chartRenderer.render('analyticsMonthlyChart', {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Current'],
                    datasets: [{ data: [Math.max(20, stats.monthPct - 15), Math.max(30, stats.monthPct - 8), Math.max(40, stats.monthPct - 3), stats.monthPct], borderColor: '#10b981', tension: 0.3 }]
                },
                options: { ...chartOpts, scales: { y: { min: 0, max: 100 } } }
            });

            // 4. Habit Share Pie
            const hLabels = this.state.habits.map(h => h.name);
            const hCounts = this.state.habits.map(h => this.state.habitLogs[h.id] ? Object.values(this.state.habitLogs[h.id]).filter(Boolean).length : 0);
            this.chartRenderer.render('analyticsPieChart', {
                type: 'pie',
                data: {
                    labels: hLabels.length ? hLabels : ['None'],
                    datasets: [{ data: hCounts.some(v => v > 0) ? hCounts : [1], backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#7c3aed', '#0891b2'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // 5. Task Ratio Doughnut
            const doneTodos = this.state.todos.filter(t => t.completed).length;
            const activeTodos = this.state.todos.length - doneTodos;
            this.chartRenderer.render('analyticsDoughnutChart', {
                type: 'doughnut',
                data: {
                    labels: ['Completed Tasks', 'Pending Tasks'],
                    datasets: [{ data: [doneTodos, activeTodos || 1], backgroundColor: ['#10b981', '#cbd5e1'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // 6. Category Radar
            const cats = Array.from(new Set(this.state.habits.map(h => h.category || 'General')));
            const radarLabels = cats.length >= 3 ? cats : ['Study', 'Health', 'Productivity'];
            const radarData = radarLabels.map(c => {
                const matching = this.state.habits.filter(h => (h.category || 'General') === c);
                if (!matching.length) return 50;
                let checkins = 0;
                matching.forEach(m => {
                    checkins += this.state.habitLogs[m.id] ? Object.values(this.state.habitLogs[m.id]).filter(Boolean).length : 0;
                });
                return Math.min(100, Math.round((checkins / (matching.length * 7)) * 100));
            });
            this.chartRenderer.render('analyticsRadarChart', {
                type: 'radar',
                data: {
                    labels: radarLabels,
                    datasets: [{ label: 'Consistency %', data: radarData, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.2)' }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100 } } }
            });

            // 7. Contribution Heatmap (Last 90 Days)
            const heatContainer = document.getElementById('heatmapContainer');
            if (heatContainer) {
                const today = new Date();
                let cellsHtml = '';
                for (let i = 89; i >= 0; i--) {
                    const d = DateUtils.addDays(today, -i);
                    const iso = DateUtils.toISODate(d);
                    const pct = this.habitEngine.getDayStats(iso).pct;
                    let lvl = '';
                    if (pct >= 80) lvl = 'heat-lvl-4';
                    else if (pct >= 50) lvl = 'heat-lvl-3';
                    else if (pct >= 25) lvl = 'heat-lvl-2';
                    else if (pct > 0) lvl = 'heat-lvl-1';
                    cellsHtml += `<div class="heat-cell ${lvl}" title="${iso}: ${pct}% completed"></div>`;
                }
                heatContainer.innerHTML = cellsHtml;
            }
        }

        /* ----------------- 6. Notes & Checklists Renderer ----------------- */
        renderNotes() {
            const container = document.getElementById('notesContainer');
            if (!container) return;

            let filtered = [...this.state.notes];
            if (this.notesFilter === 'pinned') filtered = filtered.filter(n => n.pinned);
            if (this.notesFilter === 'checklist') filtered = filtered.filter(n => n.isChecklist);

            filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

            if (filtered.length === 0) {
                container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No notes found in this view. Click "+ Add Note" to jot something down!</div>`;
                return;
            }

            container.innerHTML = filtered.map(n => {
                let bodyHtml = '';
                if (n.isChecklist && Array.isArray(n.checklist)) {
                    bodyHtml = `<div style="display:flex; flex-direction:column; gap:0.4rem;">` +
                        n.checklist.map((item, idx) => `
                            <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.86rem; cursor:pointer; ${item.done ? 'text-decoration:line-through; opacity:0.6;' : ''}">
                                <input type="checkbox" ${item.done ? 'checked' : ''} data-note-check="${n.id}" data-check-idx="${idx}">
                                <span>${this.escapeHtml(item.text)}</span>
                            </label>
                        `).join('') + `</div>`;
                } else {
                    bodyHtml = `<p style="font-size:0.88rem; color:var(--text-secondary); white-space:pre-line;">${this.escapeHtml(n.content)}</p>`;
                }

                return `
                    <article class="note-card ${n.pinned ? 'pinned' : ''}">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.55rem;">
                                <h3 style="font-size:1.02rem; font-weight:800;">${n.pinned ? '📌 ' : ''}${this.escapeHtml(n.title)}</h3>
                                <span style="font-size:0.72rem; color:var(--text-muted);">${n.date || ''}</span>
                            </div>
                            ${bodyHtml}
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:0.4rem; padding-top:0.5rem; border-top:1px solid var(--border-color);">
                            <button class="btn btn-secondary btn-xs" data-pin-note="${n.id}" type="button">${n.pinned ? 'Unpin' : 'Pin'}</button>
                            <button class="btn btn-ghost-danger btn-xs" data-delete-note="${n.id}" type="button">Delete</button>
                        </div>
                    </article>
                `;
            }).join('');
        }

        /* ----------------- 7. To-Do List Renderer ----------------- */
        renderTodos() {
            const container = document.getElementById('todoListContainer');
            if (!container) return;

            const filtered = this.state.todos.filter(t => {
                const matchSearch = t.title.toLowerCase().includes(this.todoSearch.toLowerCase());
                const matchPrio = this.todoPriority === 'all' || t.priority === this.todoPriority;
                const matchStatus = this.todoStatus === 'all'
                    || (this.todoStatus === 'completed' && t.completed)
                    || (this.todoStatus === 'active' && !t.completed);
                return matchSearch && matchPrio && matchStatus;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div class="empty-state">No tasks match your filters. Click "+ Add Task" to create a new task!</div>`;
                return;
            }

            container.innerHTML = filtered.map(t => `
                <div class="todo-item">
                    <div class="todo-left">
                        <input type="checkbox" class="habit-checkbox" ${t.completed ? 'checked' : ''} data-todo-toggle="${t.id}">
                        <div style="min-width:0;">
                            <div style="font-weight:600; font-size:0.92rem; ${t.completed ? 'text-decoration:line-through; opacity:0.55;' : ''}">${this.escapeHtml(t.title)}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Due: ${t.dueDate || 'No date'}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <span class="badge badge-${t.priority || 'medium'}">${t.priority || 'medium'}</span>
                        <button class="btn btn-ghost-danger btn-xs" data-delete-todo="${t.id}" type="button">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        /* ----------------- 8. Archive Renderer ----------------- */
        renderArchive() {
            const container = document.getElementById('archiveListContainer');
            if (!container) return;

            if (this.state.archives.length === 0) {
                container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No archived sessions yet. Click "Archive Session" in the top bar to save a snapshot of your current progress!</div>`;
                return;
            }

            container.innerHTML = this.state.archives.map(arc => `
                <article class="cd-card">
                    <div class="cd-header">
                        <div>
                            <span class="badge badge-neutral">${arc.date}</span>
                            <h3 style="font-size:1.05rem; font-weight:800; margin-top:0.35rem;">${this.escapeHtml(arc.name)}</h3>
                        </div>
                        <button class="btn btn-ghost-danger btn-xs" data-delete-archive="${arc.id}" type="button">Delete</button>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; text-align:center; background:var(--bg-subtle); padding:0.65rem; border-radius:var(--radius-sm);">
                        <div><strong style="display:block; font-size:1.05rem;">${arc.cyclePct}%</strong><small style="color:var(--text-secondary);">Rate</small></div>
                        <div><strong style="display:block; font-size:1.05rem;">${arc.totalCheckins}</strong><small style="color:var(--text-secondary);">Check-ins</small></div>
                        <div><strong style="display:block; font-size:1.05rem;">${arc.habitCount}</strong><small style="color:var(--text-secondary);">Habits</small></div>
                    </div>
                </article>
            `).join('');
        }

        archiveCurrentSession() {
            const stats = this.habitEngine.computeComprehensiveStats();
            const todayISO = DateUtils.toISODate(new Date());
            this.state.archives.unshift({
                id: 'arc_' + Date.now(),
                name: `Session Snapshot (${todayISO})`,
                date: todayISO,
                cyclePct: stats.cyclePct,
                totalCheckins: stats.totalHabitCheckins,
                habitCount: stats.totalHabits
            });
            this.commit();
            this.renderArchive();
            this.showToast('Session snapshot saved to Archive!');
        }

        /* ----------------- 9. Event Wiring ----------------- */
        bindEvents() {
            // Sidebar Navigation
            document.querySelectorAll('.nav-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.tab) this.switchTab(btn.dataset.tab);
                });
            });

            // Quick Nav buttons on Dashboard
            document.querySelectorAll('[data-quick-nav]').forEach(btn => {
                btn.addEventListener('click', () => this.switchTab(btn.dataset.quickNav));
            });

            // Mobile Sidebar Open/Close
            document.getElementById('mobileMenuBtn')?.addEventListener('click', () => this.openMobileSidebar());
            document.getElementById('sidebarCloseMobile')?.addEventListener('click', () => this.closeMobileSidebar());
            document.getElementById('sidebarBackdrop')?.addEventListener('click', () => this.closeMobileSidebar());

            // Theme Toggle
            document.getElementById('themeToggle')?.addEventListener('click', () => {
                this.state.settings.theme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
                this.commit();
                this.applyThemeAndSettings();
                this.renderAll();
            });

            // Archive Session Buttons
            document.getElementById('archiveSessionBtn')?.addEventListener('click', () => this.archiveCurrentSession());
            document.getElementById('archiveSessionSecondaryBtn')?.addEventListener('click', () => this.archiveCurrentSession());

            // Habit Tracker Controls (Weeks Input, Search, Category)
            const weeksInput = document.getElementById('weeksCountInput');
            if (weeksInput) {
                const updateWeeks = (e) => {
                    const val = Math.max(1, Math.min(52, parseInt(e.target.value, 10) || 1));
                    this.state.trackerConfig.numWeeks = val;
                    this.commit();
                    this.renderHabits();
                    this.renderDashboard();
                };
                weeksInput.addEventListener('input', updateWeeks);
                weeksInput.addEventListener('change', updateWeeks);
            }

            document.getElementById('habitSearchInput')?.addEventListener('input', (e) => {
                this.habitSearch = e.target.value;
                this.renderHabits();
            });

            document.getElementById('habitCategoryFilter')?.addEventListener('change', (e) => {
                this.habitCategory = e.target.value;
                this.renderHabits();
            });

            // Calendar Controls
            document.getElementById('prevPeriodBtn')?.addEventListener('click', () => {
                if (this.calendarViewMode === 'week') {
                    this.calendarDate = DateUtils.addDays(this.calendarDate, -7);
                } else {
                    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
                }
                this.renderCalendar();
            });

            document.getElementById('nextPeriodBtn')?.addEventListener('click', () => {
                if (this.calendarViewMode === 'week') {
                    this.calendarDate = DateUtils.addDays(this.calendarDate, 7);
                } else {
                    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
                }
                this.renderCalendar();
            });

            document.querySelectorAll('[data-cal-view]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.calendarViewMode = btn.dataset.calView;
                    document.querySelectorAll('[data-cal-view]').forEach(b => b.classList.toggle('active', b === btn));
                    this.renderCalendar();
                });
            });

            // Notes Filters
            document.querySelectorAll('[data-note-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.notesFilter = btn.dataset.noteFilter;
                    document.querySelectorAll('[data-note-filter]').forEach(b => b.classList.toggle('active', b === btn));
                    this.renderNotes();
                });
            });

            // Todo Filters
            document.getElementById('todoSearchInput')?.addEventListener('input', (e) => {
                this.todoSearch = e.target.value;
                this.renderTodos();
            });
            document.getElementById('todoPriorityFilter')?.addEventListener('change', (e) => {
                this.todoPriority = e.target.value;
                this.renderTodos();
            });
            document.getElementById('todoStatusFilter')?.addEventListener('change', (e) => {
                this.todoStatus = e.target.value;
                this.renderTodos();
            });

            // Analytics Timeframe
            document.getElementById('analyticsTimeframeSelect')?.addEventListener('change', () => this.renderAnalytics());

            // Global Click Delegation (Calendar day select, Delete items, Pin notes)
            document.addEventListener('click', (e) => {
                const calCell = e.target.closest('[data-cal-date]');
                if (calCell) {
                    this.selectedCalDate = calCell.dataset.calDate;
                    this.renderCalendar();
                    return;
                }

                const delHabit = e.target.closest('[data-delete-habit]');
                if (delHabit) {
                    const id = delHabit.dataset.deleteHabit;
                    this.state.habits = this.state.habits.filter(h => h.id !== id);
                    delete this.state.habitLogs[id];
                    this.commit();
                    this.renderAll();
                    this.showToast('Habit deleted');
                    return;
                }

                const delCd = e.target.closest('[data-delete-cd]');
                if (delCd) {
                    this.state.countdowns = this.state.countdowns.filter(c => c.id !== delCd.dataset.deleteCd);
                    this.commit();
                    this.renderCalendar();
                    this.renderCountdowns();
                    this.showToast('Countdown removed');
                    return;
                }

                const pinNote = e.target.closest('[data-pin-note]');
                if (pinNote) {
                    const note = this.state.notes.find(n => n.id === pinNote.dataset.pinNote);
                    if (note) {
                        note.pinned = !note.pinned;
                        this.commit();
                        this.renderNotes();
                    }
                    return;
                }

                const delNote = e.target.closest('[data-delete-note]');
                if (delNote) {
                    this.state.notes = this.state.notes.filter(n => n.id !== delNote.dataset.deleteNote);
                    this.commit();
                    this.renderNotes();
                    this.showToast('Note deleted');
                    return;
                }

                const delTodo = e.target.closest('[data-delete-todo]');
                if (delTodo) {
                    this.state.todos = this.state.todos.filter(t => t.id !== delTodo.dataset.deleteTodo);
                    this.commit();
                    this.renderAll();
                    this.showToast('Task deleted');
                    return;
                }

                const delArchive = e.target.closest('[data-delete-archive]');
                if (delArchive) {
                    this.state.archives = this.state.archives.filter(a => a.id !== delArchive.dataset.deleteArchive);
                    this.commit();
                    this.renderArchive();
                    this.showToast('Archived session deleted');
                }
            });

            // Global Checkbox Change Delegation (Habits, Todos, Note Checklists)
            document.addEventListener('change', (e) => {
                if (e.target.dataset.habitToggle) {
                    this.habitEngine.toggleHabitDate(e.target.dataset.habitToggle, e.target.dataset.date);
                    this.renderAll();
                } else if (e.target.dataset.todoToggle) {
                    const todo = this.state.todos.find(t => t.id === e.target.dataset.todoToggle);
                    if (todo) {
                        todo.completed = e.target.checked;
                        this.commit();
                        this.renderAll();
                    }
                } else if (e.target.dataset.noteCheck) {
                    const note = this.state.notes.find(n => n.id === e.target.dataset.noteCheck);
                    const idx = Number(e.target.dataset.checkIdx);
                    if (note && note.checklist && note.checklist[idx]) {
                        note.checklist[idx].done = e.target.checked;
                        this.commit();
                        this.renderNotes();
                    }
                }
            });

            // Modal Open Triggers
            document.getElementById('addHabitBtn')?.addEventListener('click', () => this.openModal('habitModal'));
            document.getElementById('addCountdownBtn')?.addEventListener('click', () => {
                const dateInp = document.getElementById('countdownDateInput');
                if (dateInp && !dateInp.value) dateInp.value = DateUtils.toISODate(DateUtils.addDays(new Date(), 7));
                this.openModal('countdownModal');
            });
            document.getElementById('addNoteBtn')?.addEventListener('click', () => this.openModal('noteModal'));
            document.getElementById('addTodoBtn')?.addEventListener('click', () => {
                const dueInp = document.getElementById('todoDueDateInput');
                if (dueInp && !dueInp.value) dueInp.value = DateUtils.toISODate(new Date());
                this.openModal('todoModal');
            });

            // Modal Close Triggers
            document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal) modal.setAttribute('hidden', '');
                });
            });

            // Confirm Modal Proceed
            document.getElementById('confirmModalProceedBtn')?.addEventListener('click', () => {
                if (typeof this.pendingConfirmAction === 'function') {
                    this.pendingConfirmAction();
                    this.pendingConfirmAction = null;
                }
                this.closeModal('confirmModal');
            });

            // Form Submissions
            document.getElementById('habitForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('habitNameInput').value.trim();
                if (!name) return;
                this.state.habits.push({
                    id: 'hab_' + Date.now(),
                    name,
                    category: document.getElementById('habitCategoryInput').value.trim() || 'General',
                    color: document.getElementById('habitColorInput').value || '#4f46e5'
                });
                this.commit();
                e.target.reset();
                this.closeModal('habitModal');
                this.renderAll();
                this.showToast('New habit added!');
            });

            document.getElementById('countdownForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('countdownTitleInput').value.trim();
                const targetDate = document.getElementById('countdownDateInput').value;
                if (!title || !targetDate) return;
                this.state.countdowns.push({
                    id: 'cd_' + Date.now(),
                    title,
                    description: document.getElementById('countdownDescInput').value.trim(),
                    category: document.getElementById('countdownCategoryInput').value.trim() || 'Goal',
                    targetDate,
                    targetTime: document.getElementById('countdownTimeInput').value || '09:00',
                    priority: document.getElementById('countdownPriorityInput').value,
                    color: document.getElementById('countdownColorInput').value || '#4f46e5',
                    createdAt: new Date().toISOString()
                });
                this.commit();
                e.target.reset();
                this.closeModal('countdownModal');
                this.renderCalendar();
                this.renderCountdowns();
                this.showToast('Goal countdown created!');
            });

            document.getElementById('noteForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('noteTitleInput').value.trim();
                const content = document.getElementById('noteContentInput').value.trim();
                const pinned = document.getElementById('notePinnedInput').checked;
                const isChecklist = document.getElementById('noteIsChecklistInput').checked;
                if (!title) return;

                const checklist = isChecklist
                    ? content.split('\n').map(line => line.trim()).filter(Boolean).map(text => ({ text, done: false }))
                    : [];

                this.state.notes.unshift({
                    id: 'note_' + Date.now(),
                    title,
                    content: isChecklist ? '' : content,
                    pinned,
                    isChecklist,
                    checklist,
                    date: DateUtils.toISODate(new Date())
                });
                this.commit();
                e.target.reset();
                this.closeModal('noteModal');
                this.renderNotes();
                this.showToast('Note saved!');
            });

            document.getElementById('todoForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('todoTextInput').value.trim();
                if (!title) return;
                this.state.todos.unshift({
                    id: 'todo_' + Date.now(),
                    title,
                    priority: document.getElementById('todoPriorityInput').value,
                    dueDate: document.getElementById('todoDueDateInput').value || DateUtils.toISODate(new Date()),
                    completed: false
                });
                this.commit();
                e.target.reset();
                this.closeModal('todoModal');
                this.renderAll();
                this.showToast('Task added!');
            });

            // Settings Listeners
            document.getElementById('settingThemeSelect')?.addEventListener('change', (e) => {
                this.state.settings.theme = e.target.value;
                this.commit();
                this.applyThemeAndSettings();
                this.renderAll();
            });

            document.getElementById('settingAccentColor')?.addEventListener('input', (e) => {
                this.state.settings.accentColor = e.target.value;
                this.commit();
                this.applyThemeAndSettings();
                this.renderAll();
            });

            document.getElementById('settingFontSize')?.addEventListener('change', (e) => {
                this.state.settings.fontSize = e.target.value;
                this.commit();
                this.applyThemeAndSettings();
            });

            document.getElementById('settingFirstDayOfWeek')?.addEventListener('change', (e) => {
                this.state.settings.firstDayOfWeek = e.target.value;
                this.state.trackerConfig.startDate = DateUtils.toISODate(DateUtils.getStartOfWeek(new Date(), e.target.value));
                this.commit();
                this.renderAll();
            });

            // Export / Import / Reset
            document.getElementById('exportJsonBtn')?.addEventListener('click', () => this.exportManager.exportJSON());
            document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportManager.exportCSV());
            document.getElementById('exportPdfBtn')?.addEventListener('click', () => this.exportManager.exportPDFReport());

            document.getElementById('importJsonInput')?.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.exportManager.importJSONFile(e.target.files[0]);
                    e.target.value = '';
                }
            });

            document.getElementById('resetDataBtn')?.addEventListener('click', () => {
                this.requestConfirm(
                    'Factory Reset LifeTrack?',
                    'This will permanently erase all your habits, logs, tasks, notes, and countdowns and restore default sample data.',
                    () => {
                        localStorage.removeItem(this.storage.storageKey);
                        this.state = this.storage.getDefaultState();
                        this.commit();
                        this.applyThemeAndSettings();
                        this.renderAll();
                        this.showToast('All data reset to defaults.');
                    }
                );
            });
        }
    }

    /* ----------------------------------------------------------------------
       Bootstrap Application
       ---------------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        window.lifeTrackApp = new AppController();
        window.lifeTrackApp.init();
    });
})();
