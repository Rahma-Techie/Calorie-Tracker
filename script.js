/* ============================================
   CalorieFlow — Application Logic
   ============================================ */

(function () {
    'use strict';

    // ========== Constants ==========
    const STORAGE_KEYS = {
        ENTRIES: 'calorieflow_entries',
        SETTINGS: 'calorieflow_settings',
    };

    const MEAL_EMOJIS = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍿',
    };

    const DEFAULT_SETTINGS = {
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 250,
        fatGoal: 65,
    };

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // ========== State ==========
    let settings = loadSettings();
    let entries = loadEntries();
    let activeFilter = 'all';

    // ========== DOM Refs ==========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        headerDate: $('#header-date'),
        ringProgress: $('#ring-progress'),
        ringCalories: $('#ring-calories'),
        statRemaining: $('#stat-remaining'),
        statGoal: $('#stat-goal'),
        macroProteinVal: $('#macro-protein-val'),
        macroCarbsVal: $('#macro-carbs-val'),
        macroFatVal: $('#macro-fat-val'),
        macroProteinBar: $('#macro-protein-bar'),
        macroCarbsBar: $('#macro-carbs-bar'),
        macroFatBar: $('#macro-fat-bar'),
        chartContainer: $('#chart-container'),
        chartAvg: $('#chart-avg'),
        foodForm: $('#food-form'),
        foodName: $('#food-name'),
        foodCalories: $('#food-calories'),
        foodMeal: $('#food-meal'),
        foodProtein: $('#food-protein'),
        foodCarbs: $('#food-carbs'),
        foodFat: $('#food-fat'),
        logList: $('#log-list'),
        logEmpty: $('#log-empty'),
        btnClearLog: $('#btn-clear-log'),
        mealFilters: $('#meal-filters'),
        btnSettings: $('#btn-settings'),
        modalOverlay: $('#modal-overlay'),
        btnCloseModal: $('#btn-close-modal'),
        settingGoal: $('#setting-goal'),
        settingProtein: $('#setting-protein'),
        settingCarbs: $('#setting-carbs'),
        settingFat: $('#setting-fat'),
        btnSaveSettings: $('#btn-save-settings'),
        toast: $('#toast'),
        toastMessage: $('#toast-message'),
    };

    // ========== LocalStorage Helpers ==========
    function loadEntries() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveEntries() {
        localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // ========== Date Helpers ==========
    function getTodayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatHeaderDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    }

    function formatTime(isoString) {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    // ========== Entry Helpers ==========
    function getTodayEntries() {
        const todayKey = getTodayKey();
        return entries.filter((e) => e.date === todayKey);
    }

    function getEntriesForDate(dateKey) {
        return entries.filter((e) => e.date === dateKey);
    }

    function calcTotals(entryList) {
        return entryList.reduce(
            (acc, e) => {
                acc.calories += e.calories || 0;
                acc.protein += e.protein || 0;
                acc.carbs += e.carbs || 0;
                acc.fat += e.fat || 0;
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    }

    // ========== Render: Header ==========
    function renderHeader() {
        dom.headerDate.textContent = formatHeaderDate();
    }

    // ========== Render: Calorie Ring ==========
    function renderRing() {
        const totals = calcTotals(getTodayEntries());
        const consumed = totals.calories;
        const goal = settings.calorieGoal;
        const pct = Math.min(consumed / goal, 1);
        const circumference = 2 * Math.PI * 68; // r=68

        // Animate ring
        dom.ringProgress.style.strokeDashoffset = circumference * (1 - pct);

        // Change ring color if over goal
        if (consumed > goal) {
            dom.ringProgress.style.stroke = '#ef4444';
            dom.ringProgress.style.filter = 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))';
        } else {
            dom.ringProgress.style.stroke = '';
            dom.ringProgress.style.filter = '';
        }

        // Animate calorie count
        animateNumber(dom.ringCalories, consumed);
        
        const remaining = Math.max(goal - consumed, 0);
        animateNumber(dom.statRemaining, remaining);
        dom.statGoal.textContent = goal.toLocaleString();
    }

    function animateNumber(el, target) {
        const current = parseInt(el.textContent.replace(/,/g, '')) || 0;
        if (current === target) return;

        const duration = 600;
        const start = performance.now();

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const value = Math.round(current + (target - current) * eased);
            el.textContent = value.toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // ========== Render: Macros ==========
    function renderMacros() {
        const totals = calcTotals(getTodayEntries());

        dom.macroProteinVal.textContent = `${totals.protein}g / ${settings.proteinGoal}g`;
        dom.macroCarbsVal.textContent = `${totals.carbs}g / ${settings.carbsGoal}g`;
        dom.macroFatVal.textContent = `${totals.fat}g / ${settings.fatGoal}g`;

        const proteinPct = Math.min((totals.protein / settings.proteinGoal) * 100, 100);
        const carbsPct = Math.min((totals.carbs / settings.carbsGoal) * 100, 100);
        const fatPct = Math.min((totals.fat / settings.fatGoal) * 100, 100);

        dom.macroProteinBar.style.width = `${proteinPct}%`;
        dom.macroCarbsBar.style.width = `${carbsPct}%`;
        dom.macroFatBar.style.width = `${fatPct}%`;
    }

    // ========== Render: Weekly Chart ==========
    function renderChart() {
        dom.chartContainer.innerHTML = '';

        const today = new Date();
        const days = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push(d);
        }

        const dayCals = days.map((d) => {
            const key = getDateKey(d);
            const dayEntries = getEntriesForDate(key);
            return calcTotals(dayEntries).calories;
        });

        const maxCal = Math.max(...dayCals, settings.calorieGoal, 1);
        const totalNonZero = dayCals.filter((c) => c > 0);
        const avg = totalNonZero.length > 0 ? Math.round(totalNonZero.reduce((a, b) => a + b, 0) / totalNonZero.length) : 0;
        dom.chartAvg.textContent = `Avg: ${avg.toLocaleString()} kcal`;

        const todayKey = getTodayKey();

        days.forEach((d, i) => {
            const key = getDateKey(d);
            const isToday = key === todayKey;
            const cal = dayCals[i];
            const heightPct = maxCal > 0 ? (cal / maxCal) * 100 : 0;

            const wrapper = document.createElement('div');
            wrapper.className = 'chart-bar-wrapper';

            const container = document.createElement('div');
            container.className = 'chart-bar-container';

            const bar = document.createElement('div');
            bar.className = `chart-bar${isToday ? ' today' : ''}`;
            bar.style.height = '0%';

            const tooltip = document.createElement('div');
            tooltip.className = 'chart-bar-tooltip';
            tooltip.textContent = `${cal.toLocaleString()} kcal`;
            bar.appendChild(tooltip);

            container.appendChild(bar);

            const label = document.createElement('span');
            label.className = `chart-day${isToday ? ' today-label' : ''}`;
            label.textContent = DAY_NAMES[d.getDay()];

            wrapper.appendChild(container);
            wrapper.appendChild(label);
            dom.chartContainer.appendChild(wrapper);

            // Animate bar height
            requestAnimationFrame(() => {
                setTimeout(() => {
                    bar.style.height = `${Math.max(heightPct, 3)}%`;
                }, i * 80);
            });
        });
    }

    // ========== Render: Food Log ==========
    function renderLog() {
        const todayEntries = getTodayEntries();
        let filtered = todayEntries;

        if (activeFilter !== 'all') {
            filtered = todayEntries.filter((e) => e.meal === activeFilter);
        }

        // Sort by newest first
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        dom.logList.innerHTML = '';

        if (filtered.length === 0) {
            dom.logEmpty.classList.add('visible');
            dom.logList.style.display = 'none';
        } else {
            dom.logEmpty.classList.remove('visible');
            dom.logList.style.display = 'flex';

            filtered.forEach((entry, i) => {
                const el = createLogEntry(entry);
                el.style.animationDelay = `${i * 0.05}s`;
                dom.logList.appendChild(el);
            });
        }
    }

    function createLogEntry(entry) {
        const el = document.createElement('div');
        el.className = 'log-entry';
        el.dataset.id = entry.id;

        const metaParts = [];
        if (entry.protein) metaParts.push(`<span style="color:var(--protein)">P:${entry.protein}g</span>`);
        if (entry.carbs) metaParts.push(`<span style="color:var(--carbs)">C:${entry.carbs}g</span>`);
        if (entry.fat) metaParts.push(`<span style="color:var(--fat)">F:${entry.fat}g</span>`);

        el.innerHTML = `
            <span class="log-entry-emoji">${MEAL_EMOJIS[entry.meal] || '🍽️'}</span>
            <div class="log-entry-info">
                <div class="log-entry-name">${escapeHtml(entry.name)}</div>
                <div class="log-entry-meta">
                    <span>${formatTime(entry.timestamp)}</span>
                    ${metaParts.join('')}
                </div>
            </div>
            <span class="log-entry-calories">${entry.calories} kcal</span>
            <button class="log-entry-delete" title="Remove entry" aria-label="Remove ${escapeHtml(entry.name)}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
            </button>
        `;

        // Delete handler
        const deleteBtn = el.querySelector('.log-entry-delete');
        deleteBtn.addEventListener('click', () => {
            el.classList.add('removing');
            setTimeout(() => {
                deleteEntry(entry.id);
            }, 300);
        });

        return el;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== Actions ==========
    function addEntry(data) {
        const entry = {
            id: generateId(),
            date: getTodayKey(),
            timestamp: new Date().toISOString(),
            name: data.name.trim(),
            calories: parseInt(data.calories) || 0,
            meal: data.meal,
            protein: parseInt(data.protein) || 0,
            carbs: parseInt(data.carbs) || 0,
            fat: parseInt(data.fat) || 0,
        };

        entries.push(entry);
        saveEntries();
        renderAll();
        showToast(`Added "${entry.name}" — ${entry.calories} kcal`);
    }

    function deleteEntry(id) {
        entries = entries.filter((e) => e.id !== id);
        saveEntries();
        renderAll();
        showToast('Entry removed');
    }

    function clearTodayEntries() {
        const todayKey = getTodayKey();
        const count = entries.filter((e) => e.date === todayKey).length;
        if (count === 0) return;

        if (!confirm(`Remove all ${count} entries for today?`)) return;

        entries = entries.filter((e) => e.date !== todayKey);
        saveEntries();
        renderAll();
        showToast('All entries cleared');
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    // ========== Toast ==========
    let toastTimer;
    function showToast(msg) {
        dom.toastMessage.textContent = msg;
        dom.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 2500);
    }

    // ========== Settings Modal ==========
    function openSettings() {
        dom.settingGoal.value = settings.calorieGoal;
        dom.settingProtein.value = settings.proteinGoal;
        dom.settingCarbs.value = settings.carbsGoal;
        dom.settingFat.value = settings.fatGoal;
        dom.modalOverlay.classList.add('active');
    }

    function closeSettings() {
        dom.modalOverlay.classList.remove('active');
    }

    function handleSaveSettings() {
        settings.calorieGoal = parseInt(dom.settingGoal.value) || DEFAULT_SETTINGS.calorieGoal;
        settings.proteinGoal = parseInt(dom.settingProtein.value) || DEFAULT_SETTINGS.proteinGoal;
        settings.carbsGoal = parseInt(dom.settingCarbs.value) || DEFAULT_SETTINGS.carbsGoal;
        settings.fatGoal = parseInt(dom.settingFat.value) || DEFAULT_SETTINGS.fatGoal;
        saveSettings();
        closeSettings();
        renderAll();
        showToast('Settings saved');
    }

    // ========== Render All ==========
    function renderAll() {
        renderHeader();
        renderRing();
        renderMacros();
        renderChart();
        renderLog();
    }

    // ========== Event Listeners ==========
    function bindEvents() {
        // Food form submit
        dom.foodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addEntry({
                name: dom.foodName.value,
                calories: dom.foodCalories.value,
                meal: dom.foodMeal.value,
                protein: dom.foodProtein.value,
                carbs: dom.foodCarbs.value,
                fat: dom.foodFat.value,
            });
            dom.foodForm.reset();
            dom.foodName.focus();
        });

        // Clear log
        dom.btnClearLog.addEventListener('click', clearTodayEntries);

        // Meal filters
        dom.mealFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            $$('.filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderLog();
        });

        // Settings
        dom.btnSettings.addEventListener('click', openSettings);
        dom.btnCloseModal.addEventListener('click', closeSettings);
        dom.modalOverlay.addEventListener('click', (e) => {
            if (e.target === dom.modalOverlay) closeSettings();
        });
        dom.btnSaveSettings.addEventListener('click', handleSaveSettings);

        // Keyboard: Escape closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSettings();
        });
    }

    // ========== Init ==========
    function init() {
        bindEvents();
        renderAll();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
