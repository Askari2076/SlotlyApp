/* ==========================================================================
   SLOTLY 20-MINUTE TIME TRACKER — CORE APPLICATION LOGIC
   ========================================================================== */

(function () {
  'use strict';

  // ---------- CONSTANTS & DEFAULTS ----------
  const STORAGE_KEY = 'slotly_time_tracker_v1';
  const TOTAL_SLOTS = 72; // 24 hours * 3 slots/hr

  // Initial expanded default categories as requested
  const DEFAULT_CATEGORIES = [
    { id: 'work', name: 'Office / Work', emoji: '💼', color: '#3b82f6', goalHours: 6 },
    { id: 'coding', name: 'Coding / Dev', emoji: '💻', color: '#06b6d4', goalHours: 3 },
    { id: 'learning', name: 'Study / Course', emoji: '📚', color: '#8b5cf6', goalHours: 2 },
    { id: 'reading', name: 'Reading Books', emoji: '📖', color: '#10b981', goalHours: 1 },
    { id: 'allah', name: 'For Allah (Ibadah)', emoji: '🕌', color: '#059669', goalHours: 1.5 },
    { id: 'quran', name: 'Quran / Recitation', emoji: '🕋', color: '#14b8a6', goalHours: 0.5 },
    { id: 'family', name: 'With Family', emoji: '👨‍👩‍👧', color: '#ec4899', goalHours: 2 },
    { id: 'friends', name: 'With Friends', emoji: '🧑‍🤝‍🧑', color: '#f59e0b', goalHours: 1 },
    { id: 'meals', name: 'Meals / Dining', emoji: '🍽️', color: '#eab308', goalHours: 1.5 },
    { id: 'coffeebreak', name: 'Tea / Coffee Break', emoji: '☕', color: '#d97706', goalHours: 0.5 },
    { id: 'commute', name: 'Commute / Travel', emoji: '🚗', color: '#f97316', goalHours: 1 },
    { id: 'exercise', name: 'Exercise / Gym', emoji: '🏃', color: '#ef4444', goalHours: 1 },
    { id: 'shower', name: 'Shower / Grooming', emoji: '🚿', color: '#0284c7', goalHours: 0.5 },
    { id: 'washroom', name: 'Washroom', emoji: '🚻', color: '#64748b', goalHours: 0 },
    { id: 'rest', name: 'Rest / Sleep / Nap', emoji: '😴', color: '#6366f1', goalHours: 7 },
    { id: 'scrolling', name: 'Social Media / Scrolling', emoji: '📱', color: '#a855f7', goalHours: 0.5 },
    { id: 'errands', name: 'Shopping / Errands', emoji: '🛒', color: '#84cc16', goalHours: 0 },
    { id: 'chores', name: 'House Chores / Cleaning', emoji: '🧹', color: '#e11d48', goalHours: 0 },
    { id: 'planning', name: 'Planning / Journaling', emoji: '🧠', color: '#9333ea', goalHours: 0.5 },
    { id: 'others', name: 'Others', emoji: '➕', color: '#94a3b8', goalHours: 0 }
  ];

  const COLOR_PALETTES = [
    '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b',
    '#06b6d4', '#eab308', '#f97316', '#ef4444', '#6366f1',
    '#a855f7', '#14b8a6', '#84cc16', '#64748b', '#e11d48',
    '#059669', '#d97706', '#0284c7', '#9333ea', '#475569'
  ];

  const QUICK_PRESETS = [
    'Fajr Prayer & Morning Adhkar', 'Dhuhr Prayer', 'Asr Prayer', 'Maghrib Prayer', 'Isha Prayer',
    'Read Quran & Tafseer', 'Deep Work / Coding', 'Fixed Notebook Bug', 'Read Keepa Chart',
    'Team Meeting / Sync Call', 'Answering Emails & Messages', 'Studying Online Course',
    'Reading Non-Fiction Book', 'Family Lunch / Dinner', 'Evening Walk / Workout',
    'Coffee / Tea Break', 'Power Nap / Rest', 'Groceries & Errands'
  ];

  // ---------- APPLICATION STATE ----------
  let state = {
    selectedDate: getFormattedDate(new Date()),
    categories: [...DEFAULT_CATEGORIES],
    logs: {}, // Format: { "YYYY-MM-DD": { slotIndex: { catId, note } } }
    theme: 'dark',
    trendsRange: 7,
    selectedLineCatId: 'learning'
  };

  // Active Editing Modal States
  let activeEditingSlot = null; // slotIndex (0-71)
  let selectedModalCatId = null;
  let selectedQuickFillCatId = null;
  let activeFilter = 'all'; // 'all' | 'filled' | 'empty'

  // Chart instances
  let dailyDonutChartInstance = null;
  let trendsStackedChartInstance = null;
  let trendsLineChartInstance = null;

  // ---------- HELPER FUNCTIONS ----------

  function getFormattedDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getSlotTimeRange(slotIndex) {
    const startMinutes = slotIndex * 20;
    const endMinutes = (slotIndex + 1) * 20;
    return `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`;
  }

  function formatMinutes(totalMins) {
    let hours = Math.floor(totalMins / 60) % 24;
    let mins = totalMins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let dispHours = hours % 12;
    if (dispHours === 0) dispHours = 12;
    const dispMins = String(mins).padStart(2, '0');
    return `${dispHours}:${dispMins} ${ampm}`;
  }

  function getSlotPeriod(slotIndex) {
    const hour = Math.floor((slotIndex * 20) / 60);
    if (hour >= 0 && hour < 6) return 'Night (12:00 AM - 06:00 AM)';
    if (hour >= 6 && hour < 12) return 'Morning (06:00 AM - 12:00 PM)';
    if (hour >= 12 && hour < 18) return 'Afternoon (12:00 PM - 06:00 PM)';
    return 'Evening (06:00 PM - 12:00 AM)';
  }

  function getCategoryById(catId) {
    return state.categories.find(c => c.id === catId) || {
      id: 'unknown',
      name: 'Uncategorized',
      emoji: '❓',
      color: '#64748b'
    };
  }

  // ---------- PERSISTENCE (LOCAL STORAGE) ----------

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.categories && Array.isArray(parsed.categories)) state.categories = parsed.categories;
        if (parsed.logs) state.logs = parsed.logs;
        if (parsed.theme) state.theme = parsed.theme;
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories: state.categories,
        logs: state.logs,
        theme: state.theme
      }));
      updateDataStats();
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
      showToast('Error saving data to browser storage', 'error');
    }
  }

  // ---------- INITIALIZATION ----------

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyTheme(state.theme);
    initLucideIcons();
    initDOMEventListeners();
    initDateControls();
    initQuickFillDropdowns();
    renderAll();
  });

  function initLucideIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      initLucideIcons();
    }
  }

  // ---------- MAIN DOM EVENT LISTENERS ----------

  function initDOMEventListeners() {
    // Nav Tabs switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = tab.getAttribute('data-tab');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        // Re-render components if needed
        if (targetTab === 'tab-trends') renderTrendsView();
        if (targetTab === 'tab-categories') renderCategoriesGrid();
        if (targetTab === 'tab-settings') updateDataStats();
      });
    });

    // Theme toggle
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      saveState();
      // Re-render charts with new theme colors
      renderDailyCharts();
      if (document.getElementById('tab-trends').classList.contains('active')) renderTrendsView();
    });

    // Timeline Filter Pills
    document.querySelectorAll('.filter-pills .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.getAttribute('data-filter');
        renderTimelineSlots();
      });
    });

    // Quick Fill Button
    document.getElementById('openQuickFillBtn').addEventListener('click', openQuickFillModal);

    // Slot Modal Controls
    document.getElementById('closeSlotModalBtn').addEventListener('click', closeSlotModal);
    document.getElementById('saveSlotBtn').addEventListener('click', saveSlotModal);
    document.getElementById('saveAndNextSlotBtn').addEventListener('click', saveAndNextSlotModal);
    document.getElementById('clearSlotBtn').addEventListener('click', clearSlotModal);

    // Quick Fill Modal Controls
    document.getElementById('closeQuickFillModalBtn').addEventListener('click', closeQuickFillModal);
    document.getElementById('cancelQuickFillBtn').addEventListener('click', closeQuickFillModal);
    document.getElementById('applyQuickFillBtn').addEventListener('click', applyQuickFill);

    document.getElementById('quickFillStartSlot').addEventListener('change', updateQuickFillRangeInfo);
    document.getElementById('quickFillEndSlot').addEventListener('change', updateQuickFillRangeInfo);

    // Category Modal Controls
    document.getElementById('openAddCategoryBtn').addEventListener('click', () => openCategoryModal());
    document.getElementById('closeCategoryModalBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('saveCategoryBtn').addEventListener('click', saveCategoryModal);

    // Color Swatches in Category Modal
    const swatchesGrid = document.getElementById('colorSwatchesGrid');
    swatchesGrid.innerHTML = COLOR_PALETTES.map(c => 
      `<div class="color-swatch-circle" style="background:${c};" data-color="${c}"></div>`
    ).join('');

    swatchesGrid.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch-circle');
      if (swatch) {
        const color = swatch.getAttribute('data-color');
        document.getElementById('categoryColorInput').value = color;
        document.getElementById('categoryColorHex').value = color;
      }
    });

    document.getElementById('categoryColorInput').addEventListener('input', (e) => {
      document.getElementById('categoryColorHex').value = e.target.value;
    });
    document.getElementById('categoryColorHex').addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('categoryColorInput').value = e.target.value;
      }
    });

    // Trends Controls
    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.trendsRange = parseInt(btn.getAttribute('data-range'), 10);
        renderTrendsView();
      });
    });

    document.getElementById('lineCategorySelect').addEventListener('change', (e) => {
      state.selectedLineCatId = e.target.value;
      renderTrendsLineChart();
    });

    // Settings / Backup Controls
    document.getElementById('exportJsonBtn').addEventListener('click', exportJsonData);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsvData);
    document.getElementById('importFileInput').addEventListener('change', importJsonData);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing inside an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          closeSlotModal();
          closeQuickFillModal();
          closeCategoryModal();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        changeDate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        changeDate(1);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        jumpToToday();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        openQuickFillModal();
      } else if (e.key === 'Escape') {
        closeSlotModal();
        closeQuickFillModal();
        closeCategoryModal();
      }
    });
  }

  // ---------- DATE NAVIGATION ----------

  function initDateControls() {
    const datePicker = document.getElementById('datePicker');
    datePicker.value = state.selectedDate;

    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedDate = e.target.value;
        renderAll();
      }
    });

    document.getElementById('prevDayBtn').addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDayBtn').addEventListener('click', () => changeDate(1));
    document.getElementById('todayBtn').addEventListener('click', jumpToToday);
  }

  function changeDate(daysOffset) {
    const parts = state.selectedDate.split('-').map(Number);
    const curDate = new Date(parts[0], parts[1] - 1, parts[2]);
    curDate.setDate(curDate.getDate() + daysOffset);
    state.selectedDate = getFormattedDate(curDate);
    document.getElementById('datePicker').value = state.selectedDate;
    renderAll();
  }

  function jumpToToday() {
    state.selectedDate = getFormattedDate(new Date());
    document.getElementById('datePicker').value = state.selectedDate;
    renderAll();
  }

  function updateDateDisplayLabel() {
    const todayStr = getFormattedDate(new Date());
    const label = document.getElementById('dateDisplayLabel');
    const parts = state.selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    
    if (state.selectedDate === todayStr) {
      label.textContent = `Today (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    } else {
      label.textContent = d.toLocaleDateString('en-US', options);
    }
  }

  // ---------- RENDER ALL MAIN VIEWS ----------

  function renderAll() {
    updateDateDisplayLabel();
    renderTimelineSlots();
    renderDailyCharts();
    renderDailySummarySidebar();
    if (document.getElementById('tab-trends').classList.contains('active')) {
      renderTrendsView();
    }
  }

  // ---------- TIMELINE SLOTS (DAILY LOG) ----------

  function renderTimelineSlots() {
    const container = document.getElementById('timelineSlotsContainer');
    container.innerHTML = '';

    const dayLogs = state.logs[state.selectedDate] || {};
    let loggedCount = 0;

    let currentPeriod = '';

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const entry = dayLogs[i];
      const isFilled = Boolean(entry && entry.catId);
      if (isFilled) loggedCount++;

      // Filter check
      if (activeFilter === 'filled' && !isFilled) continue;
      if (activeFilter === 'empty' && isFilled) continue;

      // Period Divider (Night, Morning, Afternoon, Evening)
      const period = getSlotPeriod(i);
      if (period !== currentPeriod && activeFilter === 'all') {
        currentPeriod = period;
        const divider = document.createElement('div');
        divider.className = 'period-divider';
        divider.textContent = currentPeriod;
        container.appendChild(divider);
      }

      const slotCard = document.createElement('div');
      slotCard.className = `slot-card ${isFilled ? 'filled' : ''}`;
      
      const cat = isFilled ? getCategoryById(entry.catId) : null;
      if (isFilled && cat) {
        slotCard.style.borderLeftColor = cat.color;
      }

      const timeStr = getSlotTimeRange(i);

      slotCard.innerHTML = `
        <div class="slot-time">
          <i data-lucide="clock" style="width:14px; height:14px;"></i>
          <span>${timeStr}</span>
        </div>
        ${isFilled && cat ? `
          <div class="slot-badge" style="background:${cat.color}22; color:${cat.color}; border:1px solid ${cat.color}44;">
            <span>${cat.emoji}</span>
            <span>${cat.name}</span>
          </div>
          <div class="slot-activity">${escapeHTML(entry.note || 'No activity note')}</div>
        ` : `
          <div class="slot-empty-placeholder">+ Click to log slot</div>
        `}
        <div class="slot-edit-icon"><i data-lucide="edit-3" style="width:14px; height:14px;"></i></div>
      `;

      slotCard.addEventListener('click', () => openSlotModal(i));
      container.appendChild(slotCard);
    }

    initLucideIcons();

    // Update Day Progress Widget
    const loggedPercent = Math.round((loggedCount / TOTAL_SLOTS) * 100);
    document.getElementById('loggedSlotsCount').textContent = `${loggedCount} / ${TOTAL_SLOTS} slots logged`;
    document.getElementById('loggedPercentage').textContent = `${loggedPercent}%`;
    document.getElementById('loggedProgressBar').style.width = `${loggedPercent}%`;
  }

  // ---------- SLOT EDIT MODAL ----------

  function openSlotModal(slotIndex) {
    activeEditingSlot = slotIndex;
    const dayLogs = state.logs[state.selectedDate] || {};
    const entry = dayLogs[slotIndex] || {};

    document.getElementById('slotModalTitle').textContent = `Edit Slot #${slotIndex + 1}`;
    document.getElementById('slotModalTimeBadge').textContent = getSlotTimeRange(slotIndex);

    // Selected category or default to first
    selectedModalCatId = entry.catId || state.categories[0].id;
    renderSlotCategorySelector();

    const activityInput = document.getElementById('slotActivityInput');
    activityInput.value = entry.note || '';

    renderQuickPresets();

    const backdrop = document.getElementById('slotModalBackdrop');
    backdrop.classList.add('active');
    setTimeout(() => activityInput.focus(), 50);
  }

  function renderSlotCategorySelector() {
    const selector = document.getElementById('slotCategorySelector');
    selector.innerHTML = state.categories.map(cat => {
      const isSel = cat.id === selectedModalCatId;
      return `
        <div class="cat-select-pill ${isSel ? 'selected' : ''}" 
             style="background:${cat.color}18; color:${cat.color}; border-color:${isSel ? cat.color : 'transparent'};"
             data-catid="${cat.id}">
          <span>${cat.emoji}</span>
          <span>${escapeHTML(cat.name)}</span>
        </div>
      `;
    }).join('');

    selector.querySelectorAll('.cat-select-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedModalCatId = pill.getAttribute('data-catid');
        renderSlotCategorySelector();
      });
    });
  }

  function renderQuickPresets() {
    const container = document.getElementById('quickPresetChips');
    container.innerHTML = QUICK_PRESETS.map(text => 
      `<div class="preset-chip" data-text="${text}">${escapeHTML(text)}</div>`
    ).join('');

    container.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('slotActivityInput').value = chip.getAttribute('data-text');
      });
    });
  }

  function saveSlotModal() {
    if (activeEditingSlot === null) return;

    if (!state.logs[state.selectedDate]) {
      state.logs[state.selectedDate] = {};
    }

    const note = document.getElementById('slotActivityInput').value.trim();
    state.logs[state.selectedDate][activeEditingSlot] = {
      catId: selectedModalCatId,
      note: note,
      updatedAt: new Date().toISOString()
    };

    saveState();
    closeSlotModal();
    renderAll();
    showToast(`Slot #${activeEditingSlot + 1} logged successfully!`, 'success');
  }

  function saveAndNextSlotModal() {
    if (activeEditingSlot === null) return;

    if (!state.logs[state.selectedDate]) {
      state.logs[state.selectedDate] = {};
    }

    const note = document.getElementById('slotActivityInput').value.trim();
    state.logs[state.selectedDate][activeEditingSlot] = {
      catId: selectedModalCatId,
      note: note,
      updatedAt: new Date().toISOString()
    };

    saveState();
    
    // Jump to next slot
    const nextSlot = activeEditingSlot + 1;
    if (nextSlot < TOTAL_SLOTS) {
      openSlotModal(nextSlot);
    } else {
      closeSlotModal();
      renderAll();
      showToast('Reached end of day!', 'info');
    }
  }

  function clearSlotModal() {
    if (activeEditingSlot === null) return;
    if (state.logs[state.selectedDate] && state.logs[state.selectedDate][activeEditingSlot]) {
      delete state.logs[state.selectedDate][activeEditingSlot];
      saveState();
    }
    closeSlotModal();
    renderAll();
    showToast(`Slot #${activeEditingSlot + 1} cleared`, 'info');
  }

  function closeSlotModal() {
    const backdrop = document.getElementById('slotModalBackdrop');
    backdrop.classList.remove('active');
    activeEditingSlot = null;
  }

  // ---------- QUICK RANGE FILL (BATCH ENTRY) ----------

  function initQuickFillDropdowns() {
    const startSelect = document.getElementById('quickFillStartSlot');
    const endSelect = document.getElementById('quickFillEndSlot');

    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const startMins = i * 20;
      const endMins = (i + 1) * 20;
      
      const optStart = document.createElement('option');
      optStart.value = i;
      optStart.textContent = `${formatMinutes(startMins)} (Slot ${i + 1})`;
      startSelect.appendChild(optStart);

      const optEnd = document.createElement('option');
      optEnd.value = i;
      optEnd.textContent = `${formatMinutes(endMins)} (Slot ${i + 1})`;
      endSelect.appendChild(optEnd);
    }

    startSelect.value = 0;
    endSelect.value = 2; // Default 1 hour range
  }

  function openQuickFillModal() {
    selectedQuickFillCatId = state.categories[0].id;
    renderQuickFillCategorySelector();
    updateQuickFillRangeInfo();
    
    document.getElementById('quickFillActivityInput').value = '';
    const backdrop = document.getElementById('quickFillModalBackdrop');
    backdrop.classList.add('active');
  }

  function renderQuickFillCategorySelector() {
    const container = document.getElementById('quickFillCategorySelector');
    container.innerHTML = state.categories.map(cat => {
      const isSel = cat.id === selectedQuickFillCatId;
      return `
        <div class="cat-select-pill ${isSel ? 'selected' : ''}" 
             style="background:${cat.color}18; color:${cat.color}; border-color:${isSel ? cat.color : 'transparent'};"
             data-catid="${cat.id}">
          <span>${cat.emoji}</span>
          <span>${escapeHTML(cat.name)}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.cat-select-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedQuickFillCatId = pill.getAttribute('data-catid');
        renderQuickFillCategorySelector();
      });
    });
  }

  function updateQuickFillRangeInfo() {
    let start = parseInt(document.getElementById('quickFillStartSlot').value, 10);
    let end = parseInt(document.getElementById('quickFillEndSlot').value, 10);

    if (end < start) {
      end = start;
      document.getElementById('quickFillEndSlot').value = end;
    }

    const slotCount = (end - start) + 1;
    const totalMins = slotCount * 20;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    let timeStr = `${hrs > 0 ? hrs + ' hr ' : ''}${mins > 0 ? mins + ' mins' : ''}`.trim();

    const info = document.getElementById('quickFillRangeInfo');
    info.querySelector('span').textContent = `Selected Range: ${slotCount} slots (${timeStr})`;
  }

  function applyQuickFill() {
    const start = parseInt(document.getElementById('quickFillStartSlot').value, 10);
    const end = parseInt(document.getElementById('quickFillEndSlot').value, 10);
    const overwrite = document.getElementById('quickFillOverwriteCheckbox').checked;
    const note = document.getElementById('quickFillActivityInput').value.trim();

    if (!state.logs[state.selectedDate]) {
      state.logs[state.selectedDate] = {};
    }

    let appliedCount = 0;
    for (let i = start; i <= end; i++) {
      if (!overwrite && state.logs[state.selectedDate][i] && state.logs[state.selectedDate][i].catId) {
        continue; // Skip filled if overwrite unchecked
      }

      state.logs[state.selectedDate][i] = {
        catId: selectedQuickFillCatId,
        note: note,
        updatedAt: new Date().toISOString()
      };
      appliedCount++;
    }

    saveState();
    closeQuickFillModal();
    renderAll();
    showToast(`Quick Fill applied to ${appliedCount} slots!`, 'success');
  }

  function closeQuickFillModal() {
    document.getElementById('quickFillModalBackdrop').classList.remove('active');
  }

  // ---------- DAILY SUMMARY & CHARTS ----------

  function renderDailySummarySidebar() {
    const dayLogs = state.logs[state.selectedDate] || {};
    const catTotals = {}; // catId -> slotCount

    let totalLoggedSlots = 0;
    Object.values(dayLogs).forEach(entry => {
      if (entry && entry.catId) {
        totalLoggedSlots++;
        catTotals[entry.catId] = (catTotals[entry.catId] || 0) + 1;
      }
    });

    const unloggedSlots = TOTAL_SLOTS - totalLoggedSlots;
    const totalLoggedMins = totalLoggedSlots * 20;
    const unloggedMins = unloggedSlots * 20;

    // Stat Cards Update
    document.getElementById('statTotalLogged').textContent = formatHoursMinutes(totalLoggedMins);
    document.getElementById('statLoggedSlots').textContent = `${totalLoggedSlots} / ${TOTAL_SLOTS} slots`;
    
    document.getElementById('statUnlogged').textContent = formatHoursMinutes(unloggedMins);
    document.getElementById('statUnloggedSlots').textContent = `${unloggedSlots} slots open`;

    // Top Category
    let topCatId = null;
    let maxSlots = 0;
    Object.entries(catTotals).forEach(([catId, slots]) => {
      if (slots > maxSlots) {
        maxSlots = slots;
        topCatId = catId;
      }
    });

    if (topCatId) {
      const topCat = getCategoryById(topCatId);
      document.getElementById('statTopCategory').textContent = `${topCat.emoji} ${topCat.name}`;
      document.getElementById('statTopCategoryTime').textContent = `${formatHoursMinutes(maxSlots * 20)} (${maxSlots} slots)`;
    } else {
      document.getElementById('statTopCategory').textContent = '—';
      document.getElementById('statTopCategoryTime').textContent = '0 slots';
    }

    // Goal Target Calculation
    let goalsMet = 0;
    let totalGoalsSet = 0;

    state.categories.forEach(cat => {
      if (cat.goalHours > 0) {
        totalGoalsSet++;
        const loggedHrs = ((catTotals[cat.id] || 0) * 20) / 60;
        if (loggedHrs >= cat.goalHours) {
          goalsMet++;
        }
      }
    });

    document.getElementById('statGoalsMet').textContent = `${goalsMet} / ${totalGoalsSet}`;

    // Render Category Breakdown List
    renderDailyCategoryBreakdownList(catTotals, totalLoggedSlots);
  }

  function renderDailyCategoryBreakdownList(catTotals, totalLoggedSlots) {
    const container = document.getElementById('dailyCategoryBreakdownList');
    container.innerHTML = '';

    if (totalLoggedSlots === 0) {
      container.innerHTML = `<div class="text-muted-sm text-center py-3">No activity logged for this day yet.</div>`;
      return;
    }

    // Sort categories by logged slots desc
    const sorted = [...state.categories].sort((a, b) => {
      const slotsA = catTotals[a.id] || 0;
      const slotsB = catTotals[b.id] || 0;
      return slotsB - slotsA;
    });

    sorted.forEach(cat => {
      const slots = catTotals[cat.id] || 0;
      if (slots === 0) return;

      const mins = slots * 20;
      const hours = mins / 60;
      const percent = Math.round((slots / TOTAL_SLOTS) * 100);

      const hasGoal = cat.goalHours > 0;
      const goalPercent = hasGoal ? Math.min(100, Math.round((hours / cat.goalHours) * 100)) : 0;

      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <div class="breakdown-row">
          <span class="breakdown-cat-name" style="color:${cat.color};">
            <span>${cat.emoji}</span>
            <span>${escapeHTML(cat.name)}</span>
          </span>
          <span class="breakdown-cat-stats">
            <strong>${formatHoursMinutes(mins)}</strong> (${percent}%)
          </span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width: ${percent}%; background: ${cat.color};"></div>
        </div>
        ${hasGoal ? `
          <div class="breakdown-row goal-target-indicator">
            <span>Goal Target: ${cat.goalHours} hrs</span>
            <span>${goalPercent}% of target</span>
          </div>
        ` : ''}
      `;

      container.appendChild(item);
    });
  }

  function renderDailyCharts() {
    const dayLogs = state.logs[state.selectedDate] || {};
    const catTotals = {};

    Object.values(dayLogs).forEach(entry => {
      if (entry && entry.catId) {
        catTotals[entry.catId] = (catTotals[entry.catId] || 0) + 1;
      }
    });

    const labels = [];
    const data = [];
    const colors = [];

    state.categories.forEach(cat => {
      const slots = catTotals[cat.id] || 0;
      if (slots > 0) {
        labels.push(`${cat.emoji} ${cat.name}`);
        data.push((slots * 20) / 60); // Hours
        colors.push(cat.color);
      }
    });

    // If completely empty, show placeholder
    if (data.length === 0) {
      labels.push('Unlogged Time');
      data.push(24);
      colors.push(state.theme === 'dark' ? '#21262d' : '#e2e8f0');
    }

    const ctx = document.getElementById('dailyDonutChart').getContext('2d');
    if (dailyDonutChartInstance) dailyDonutChartInstance.destroy();

    dailyDonutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: state.theme === 'dark' ? '#161b22' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: state.theme === 'dark' ? '#8b949e' : '#57606a',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const hrs = context.raw;
                return ` ${context.label}: ${hrs.toFixed(1)} hrs`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // ---------- TRENDS & HISTORY VIEW ----------

  function renderTrendsView() {
    renderTrendsStackedChart();
    populateLineCategorySelect();
    renderTrendsLineChart();
    renderTrendsSummaryTable();
  }

  function getDatesInRange(numDays) {
    const dates = [];
    const parts = state.selectedDate.split('-').map(Number);
    const end = new Date(parts[0], parts[1] - 1, parts[2]);

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      dates.push(getFormattedDate(d));
    }
    return dates;
  }

  function renderTrendsStackedChart() {
    const dates = getDatesInRange(state.trendsRange);
    const dateLabels = dates.map(d => {
      const parts = d.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    });

    const datasets = state.categories.map(cat => {
      const dataHours = dates.map(d => {
        const dayLogs = state.logs[d] || {};
        let slots = 0;
        Object.values(dayLogs).forEach(e => {
          if (e && e.catId === cat.id) slots++;
        });
        return (slots * 20) / 60; // Hours
      });

      return {
        label: `${cat.emoji} ${cat.name}`,
        data: dataHours,
        backgroundColor: cat.color
      };
    });

    const ctx = document.getElementById('trendsStackedChart').getContext('2d');
    if (trendsStackedChartInstance) trendsStackedChartInstance.destroy();

    trendsStackedChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dateLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: state.theme === 'dark' ? '#8b949e' : '#57606a' }
          },
          y: {
            stacked: true,
            max: 24,
            grid: { color: state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ticks: { color: state.theme === 'dark' ? '#8b949e' : '#57606a' },
            title: { display: true, text: 'Hours Logged', color: state.theme === 'dark' ? '#8b949e' : '#57606a' }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: state.theme === 'dark' ? '#8b949e' : '#57606a', font: { size: 10 } }
          }
        }
      }
    });
  }

  function populateLineCategorySelect() {
    const select = document.getElementById('lineCategorySelect');
    select.innerHTML = state.categories.map(c => 
      `<option value="${c.id}" ${c.id === state.selectedLineCatId ? 'selected' : ''}>${c.emoji} ${escapeHTML(c.name)}</option>`
    ).join('');
  }

  function renderTrendsLineChart() {
    const dates = getDatesInRange(state.trendsRange);
    const dateLabels = dates.map(d => {
      const parts = d.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    });

    const targetCat = getCategoryById(state.selectedLineCatId);
    const dataHours = dates.map(d => {
      const dayLogs = state.logs[d] || {};
      let slots = 0;
      Object.values(dayLogs).forEach(e => {
        if (e && e.catId === targetCat.id) slots++;
      });
      return (slots * 20) / 60;
    });

    const ctx = document.getElementById('trendsLineChart').getContext('2d');
    if (trendsLineChartInstance) trendsLineChartInstance.destroy();

    trendsLineChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dateLabels,
        datasets: [{
          label: `${targetCat.emoji} ${targetCat.name} (Hours)`,
          data: dataHours,
          borderColor: targetCat.color,
          backgroundColor: `${targetCat.color}22`,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: targetCat.color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: state.theme === 'dark' ? '#8b949e' : '#57606a' }
          },
          y: {
            min: 0,
            grid: { color: state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ticks: { color: state.theme === 'dark' ? '#8b949e' : '#57606a' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function renderTrendsSummaryTable() {
    const dates = getDatesInRange(state.trendsRange);
    const tbody = document.getElementById('trendsSummaryTableBody');
    tbody.innerHTML = '';

    state.categories.forEach(cat => {
      let totalSlots = 0;
      dates.forEach(d => {
        const dayLogs = state.logs[d] || {};
        Object.values(dayLogs).forEach(e => {
          if (e && e.catId === cat.id) totalSlots++;
        });
      });

      const totalMins = totalSlots * 20;
      const totalHrs = totalMins / 60;
      const dailyAvgHrs = totalHrs / dates.length;

      const hasGoal = cat.goalHours > 0;
      const targetPercent = hasGoal ? Math.round((dailyAvgHrs / cat.goalHours) * 100) : null;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: ${cat.color};">
          ${cat.emoji} ${escapeHTML(cat.name)}
        </td>
        <td>${formatHoursMinutes(totalMins)}</td>
        <td>${dailyAvgHrs.toFixed(1)} hrs/day</td>
        <td>${totalSlots} slots</td>
        <td>${hasGoal ? cat.goalHours + ' hrs/day' : '—'}</td>
        <td>
          ${hasGoal ? `
            <span class="${targetPercent >= 100 ? 'success-text' : ''}">
              ${targetPercent}% ${targetPercent >= 100 ? '🎯' : ''}
            </span>
          ` : '—'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------- CATEGORY & GOAL MANAGER ----------

  function renderCategoriesGrid() {
    const container = document.getElementById('categoriesGridContainer');
    container.innerHTML = '';

    state.categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <div class="category-card-header">
          <div class="category-badge-preview" style="background:${cat.color}22; color:${cat.color}; border:1px solid ${cat.color}44;">
            <span>${cat.emoji}</span>
            <span>${escapeHTML(cat.name)}</span>
          </div>
        </div>
        <div class="category-card-body">
          <div><strong>Daily Target Goal:</strong> ${cat.goalHours > 0 ? cat.goalHours + ' hrs/day' : 'No target set'}</div>
        </div>
        <div class="category-card-actions">
          <button class="btn btn-ghost btn-sm btn-edit-cat" data-id="${cat.id}">Edit</button>
          <button class="btn btn-danger btn-sm btn-delete-cat" data-id="${cat.id}">Delete</button>
        </div>
      `;

      card.querySelector('.btn-edit-cat').addEventListener('click', () => openCategoryModal(cat.id));
      card.querySelector('.btn-delete-cat').addEventListener('click', () => deleteCategory(cat.id));

      container.appendChild(card);
    });
  }

  function openCategoryModal(catId = null) {
    const isEdit = Boolean(catId);
    document.getElementById('categoryModalTitle').textContent = isEdit ? 'Edit Category' : 'Add New Category';
    document.getElementById('categoryFormId').value = catId || '';

    if (isEdit) {
      const cat = getCategoryById(catId);
      document.getElementById('categoryNameInput').value = cat.name;
      document.getElementById('categoryEmojiInput').value = cat.emoji;
      document.getElementById('categoryColorInput').value = cat.color;
      document.getElementById('categoryColorHex').value = cat.color;
      document.getElementById('categoryGoalInput').value = cat.goalHours || 0;
    } else {
      document.getElementById('categoryNameInput').value = '';
      document.getElementById('categoryEmojiInput').value = '⚡';
      document.getElementById('categoryColorInput').value = '#6366f1';
      document.getElementById('categoryColorHex').value = '#6366f1';
      document.getElementById('categoryGoalInput').value = 0;
    }

    document.getElementById('categoryModalBackdrop').classList.add('active');
  }

  function saveCategoryModal() {
    const id = document.getElementById('categoryFormId').value;
    const name = document.getElementById('categoryNameInput').value.trim();
    const emoji = document.getElementById('categoryEmojiInput').value.trim() || '⚡';
    const color = document.getElementById('categoryColorInput').value;
    const goalHours = parseFloat(document.getElementById('categoryGoalInput').value) || 0;

    if (!name) {
      showToast('Category name is required', 'error');
      return;
    }

    if (id) {
      // Edit existing
      const catIndex = state.categories.findIndex(c => c.id === id);
      if (catIndex !== -1) {
        state.categories[catIndex] = { id, name, emoji, color, goalHours };
      }
    } else {
      // Create new
      const newId = 'cat_' + Date.now();
      state.categories.push({ id: newId, name, emoji, color, goalHours });
    }

    saveState();
    closeCategoryModal();
    renderCategoriesGrid();
    renderAll();
    showToast('Category saved!', 'success');
  }

  function deleteCategory(catId) {
    if (state.categories.length <= 1) {
      showToast('You must keep at least one category', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this category? Any slots assigned to it will revert to Uncategorized.')) {
      state.categories = state.categories.filter(c => c.id !== catId);
      saveState();
      renderCategoriesGrid();
      renderAll();
      showToast('Category deleted', 'info');
    }
  }

  function closeCategoryModal() {
    document.getElementById('categoryModalBackdrop').classList.remove('active');
  }

  // ---------- DATA BACKUP, EXPORT & IMPORT ----------

  function updateDataStats() {
    const loggedDates = Object.keys(state.logs);
    let totalLoggedSlots = 0;

    loggedDates.forEach(d => {
      const day = state.logs[d];
      if (day) {
        Object.values(day).forEach(entry => {
          if (entry && entry.catId) totalLoggedSlots++;
        });
      }
    });

    const jsonStr = JSON.stringify(state);
    const kb = (jsonStr.length / 1024).toFixed(1);

    document.getElementById('statDaysLogged').textContent = `${loggedDates.length} days`;
    document.getElementById('statTotalSlotsLogged').textContent = `${totalLoggedSlots} slots`;
    document.getElementById('statStorageUsed').textContent = `${kb} KB`;
  }

  function exportJsonData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `slotly_backup_${state.selectedDate}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Backup JSON downloaded!', 'success');
  }

  function exportCsvData() {
    let csv = 'Date,Slot Index,Time Range,Category,Emoji,Activity Note\n';

    Object.keys(state.logs).sort().forEach(dateStr => {
      const dayLogs = state.logs[dateStr];
      for (let i = 0; i < TOTAL_SLOTS; i++) {
        const entry = dayLogs[i];
        if (entry && entry.catId) {
          const cat = getCategoryById(entry.catId);
          const timeRange = getSlotTimeRange(i);
          const safeNote = `"${(entry.note || '').replace(/"/g, '""')}"`;
          const safeCat = `"${cat.name.replace(/"/g, '""')}"`;
          csv += `${dateStr},${i + 1},"${timeRange}",${safeCat},"${cat.emoji}",${safeNote}\n`;
        }
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `slotly_logs_${state.selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('CSV export downloaded!', 'success');
  }

  function importJsonData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.categories && imported.logs) {
          state.categories = imported.categories;
          state.logs = imported.logs;
          if (imported.theme) state.theme = imported.theme;

          saveState();
          applyTheme(state.theme);
          renderAll();
          showToast('Data imported successfully!', 'success');
        } else {
          showToast('Invalid backup file format', 'error');
        }
      } catch (err) {
        showToast('Failed to parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (confirm('DANGER: This will delete ALL logged time entries and reset categories. Are you absolutely sure?')) {
      if (confirm('Second Confirmation: Type OK to proceed. Really delete everything?')) {
        localStorage.removeItem(STORAGE_KEY);
        state.logs = {};
        state.categories = [...DEFAULT_CATEGORIES];
        saveState();
        renderAll();
        showToast('All data has been reset.', 'info');
      }
    }
  }

  // ---------- UTILITY FUNCTIONS ----------

  function formatHoursMinutes(totalMins) {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs} hrs`;
    return `${hrs}h ${mins}m`;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width:16px; height:16px;"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    initLucideIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

})();
