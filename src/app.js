import {
  getCategories,
  setCategories,
  getSessions,
  setSessions,
  getActiveSession,
  setActiveSession,
  formatDuration,
  formatDurationLong,
  getSessionsInRange,
  aggregateByCategory,
  toDatetimeLocal,
  formatRangeLabel,
  setOnDataChange,
} from './core.js';
import { signInWithGoogle, firebaseSignOut, onAuthChange, pushToFirestore, pullFromFirestore } from './firebase.js';

const categoryInput = document.getElementById('category-input');
const addCategoryBtn = document.getElementById('add-category-btn');
const categoryList = document.getElementById('category-list');
const noCategoriesMsg = document.getElementById('no-categories-msg');
const selectedCategoryEl = document.getElementById('selected-category');
const stopwatchEl = document.getElementById('stopwatch');
const startSessionBtn = document.getElementById('start-session-btn');
const stopSessionBtn = document.getElementById('stop-session-btn');
const sessionList = document.getElementById('session-list');
const noSessionsMsg = document.getElementById('no-sessions-msg');
const statsPieChart = document.getElementById('stats-pie-chart');
const statsNoData = document.getElementById('stats-no-data');
const statsCategoryList = document.getElementById('stats-category-list');
const statsRangeNav = document.getElementById('stats-range-nav');
const statsPrevBtn = document.getElementById('stats-prev-btn');
const statsNextBtn = document.getElementById('stats-next-btn');
const statsRangeLabel = document.getElementById('stats-range-label');
const statsRangeCustom = document.getElementById('stats-range-custom');
const statsCustomStart = document.getElementById('stats-custom-start');
const statsCustomEnd = document.getElementById('stats-custom-end');
const sessionPagination = document.getElementById('session-pagination');
const sessionPrevPage = document.getElementById('session-prev-page');
const sessionNextPage = document.getElementById('session-next-page');
const sessionPageLabel = document.getElementById('session-page-label');
const authSignInBtn = document.getElementById('auth-sign-in-btn');
const authSignOutBtn = document.getElementById('auth-sign-out-btn');
const authUserInfo = document.getElementById('auth-user-info');
const authUserName = document.getElementById('auth-user-name');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importDataInput = document.getElementById('import-data-input');

const EDIT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const DELETE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

const PIE_CHART_COLORS = ['#4a90d9', '#e07c4c', '#6b9b6b', '#9b6ba8', '#c9a227', '#5cadad', '#c75c5c', '#7a7a7a'];

const SESSIONS_PER_PAGE = 5;

let currentUid = null;
let syncPaused = false;
let selectedCategoryId = null;
let stopwatchInterval = null;
let statsRange = 'all';
let statsOffset = 0;
let customStart = null;
let customEnd = null;
let sessionsPage = 0;

function renderCategories() {
  const categories = getCategories();
  if (noCategoriesMsg) noCategoriesMsg.hidden = categories.length > 0;
  if (!categoryList) return;
  categoryList.innerHTML = '';
  categories.forEach((cat) => {
    const li = document.createElement('li');
    li.textContent = cat.name;
    li.dataset.categoryId = cat.id;
    if (cat.id === selectedCategoryId) li.classList.add('selected');
    li.addEventListener('click', () => selectCategory(cat.id));
    categoryList.appendChild(li);
  });
  updateStartButton();
}

function selectCategory(categoryId) {
  selectedCategoryId = categoryId;
  renderCategories();
  const categories = getCategories();
  const cat = categories.find((c) => c.id === categoryId);
  if (selectedCategoryEl) selectedCategoryEl.textContent = cat ? `Selected: ${cat.name}` : 'No category selected';
}

function updateStartButton() {
  const active = getActiveSession();
  if (startSessionBtn) startSessionBtn.disabled = !selectedCategoryId || !!active;
}

function addCategory() {
  const name = categoryInput?.value?.trim();
  if (!name) return;
  const categories = getCategories();
  const id = crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;
  categories.push({ id, name });
  setCategories(categories);
  if (categoryInput) categoryInput.value = '';
  renderCategories();
  selectCategory(id);
}

function startSession() {
  if (!selectedCategoryId) return;
  const categories = getCategories();
  const cat = categories.find((c) => c.id === selectedCategoryId);
  if (!cat) return;
  const startTime = new Date().toISOString();
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`;
  setActiveSession({ categoryId: cat.id, categoryName: cat.name, startTime });
  const sessions = getSessions();
  sessions.push({ id: sessionId, categoryId: cat.id, categoryName: cat.name, startTime, endTime: null });
  setSessions(sessions);
  if (startSessionBtn) startSessionBtn.disabled = true;
  if (startSessionBtn) startSessionBtn.hidden = true;
  if (stopSessionBtn) stopSessionBtn.hidden = false;
  startStopwatch();
  renderSessionList();
}

function startStopwatch() {
  if (stopwatchInterval) return;
  function tick() {
    const active = getActiveSession();
    if (!active) {
      if (stopwatchEl) stopwatchEl.textContent = '00:00:00';
      return;
    }
    const start = new Date(active.startTime).getTime();
    const elapsed = Date.now() - start;
    if (stopwatchEl) stopwatchEl.textContent = formatDuration(elapsed);
  }
  tick();
  stopwatchInterval = setInterval(tick, 100);
}

function stopStopwatch() {
  if (stopwatchInterval) {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
  }
  if (stopwatchEl) stopwatchEl.textContent = '00:00:00';
}

function stopSession() {
  const active = getActiveSession();
  if (!active) return;
  const endTime = new Date().toISOString();
  const sessions = getSessions();
  const current = sessions.find((s) => s.endTime === null && s.categoryId === active.categoryId);
  if (current) {
    current.endTime = endTime;
    setSessions(sessions);
  }
  setActiveSession(null);
  stopStopwatch();
  if (stopSessionBtn) stopSessionBtn.hidden = true;
  if (startSessionBtn) startSessionBtn.hidden = false;
  updateStartButton();
  renderSessionList();
  renderStats();
}

function deleteSession(sessionId) {
  const sessions = getSessions().filter((s) => s.id !== sessionId);
  setSessions(sessions);
  renderSessionList();
  renderStats();
}

function saveEditedSession(sessionId, categoryId, categoryName, startTimeIso, endTimeIso) {
  const sessions = getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.categoryId = categoryId;
  session.categoryName = categoryName;
  session.startTime = startTimeIso;
  session.endTime = endTimeIso;
  setSessions(sessions);
  renderSessionList();
  renderStats();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderSessionEditForm(sessionId) {
  const sessions = getSessions();
  const s = sessions.find((sess) => sess.id === sessionId);
  if (!s || s.endTime == null) return null;
  const categories = getCategories();
  const startLocal = toDatetimeLocal(s.startTime);
  const endLocal = toDatetimeLocal(s.endTime);
  const form = document.createElement('form');
  form.className = 'session-edit-form';
  form.innerHTML = `
    <div class="session-edit-row">
      <label for="edit-category-${sessionId}">Category</label>
      <select id="edit-category-${sessionId}" required>
        ${categories.map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === s.categoryId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="session-edit-row">
      <label for="edit-start-${sessionId}">Start</label>
      <input type="datetime-local" id="edit-start-${sessionId}" value="${startLocal}" required />
    </div>
    <div class="session-edit-row">
      <label for="edit-end-${sessionId}">End</label>
      <input type="datetime-local" id="edit-end-${sessionId}" value="${endLocal}" required />
    </div>
    <div class="session-edit-actions">
      <button type="submit" class="session-edit-save">Save</button>
      <button type="button" class="session-edit-cancel">Cancel</button>
    </div>
  `;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const categorySelect = form.querySelector(`#edit-category-${sessionId}`);
    const categoriesNow = getCategories();
    const cat = categoriesNow.find((c) => c.id === categorySelect.value);
    if (!cat) return;
    const startInput = form.querySelector(`#edit-start-${sessionId}`);
    const endInput = form.querySelector(`#edit-end-${sessionId}`);
    const startTimeIso = new Date(startInput.value).toISOString();
    const endTimeIso = new Date(endInput.value).toISOString();
    if (new Date(endTimeIso) <= new Date(startTimeIso)) {
      endInput.setCustomValidity('End must be after start');
      endInput.reportValidity();
      return;
    }
    endInput.setCustomValidity('');
    saveEditedSession(sessionId, cat.id, cat.name, startTimeIso, endTimeIso);
    renderStats();
  });
  form.querySelector('.session-edit-cancel').addEventListener('click', () => renderSessionList());
  return form;
}

function renderSessionList() {
  const allSessions = getSessions().filter((s) => s.endTime != null).reverse();
  const totalPages = Math.max(1, Math.ceil(allSessions.length / SESSIONS_PER_PAGE));
  if (sessionsPage >= totalPages) sessionsPage = totalPages - 1;
  if (sessionsPage < 0) sessionsPage = 0;
  const pageStart = sessionsPage * SESSIONS_PER_PAGE;
  const sessions = allSessions.slice(pageStart, pageStart + SESSIONS_PER_PAGE);

  if (noSessionsMsg) noSessionsMsg.hidden = allSessions.length > 0;
  if (sessionPagination) {
    sessionPagination.hidden = totalPages <= 1;
    if (sessionPageLabel) sessionPageLabel.textContent = `${sessionsPage + 1} / ${totalPages}`;
    if (sessionPrevPage) sessionPrevPage.disabled = sessionsPage === 0;
    if (sessionNextPage) sessionNextPage.disabled = sessionsPage >= totalPages - 1;
  }
  if (!sessionList) return;
  sessionList.innerHTML = '';
  sessions.forEach((s) => {
    const start = new Date(s.startTime).getTime();
    const end = new Date(s.endTime).getTime();
    const duration = formatDuration(end - start);
    const li = document.createElement('li');
    li.className = 'session-item';
    li.dataset.sessionId = s.id;
    const view = document.createElement('div');
    view.className = 'session-item-view';
    view.innerHTML = `
      <span class="session-category">${escapeHtml(s.categoryName)}</span>
      <span class="session-duration">${duration}</span>
      <span class="session-actions">
        <button type="button" class="icon-btn session-edit-btn" title="Edit session" aria-label="Edit session">${EDIT_ICON}</button>
        <button type="button" class="icon-btn session-delete-btn" title="Delete session" aria-label="Delete session">${DELETE_ICON}</button>
      </span>
    `;
    view.querySelector('.session-edit-btn').addEventListener('click', () => {
      const form = renderSessionEditForm(s.id);
      if (form) {
        li.innerHTML = '';
        li.classList.add('session-item-editing');
        li.appendChild(form);
      }
    });
    view.querySelector('.session-delete-btn').addEventListener('click', () => deleteSession(s.id));
    li.appendChild(view);
    sessionList.appendChild(li);
  });
}

function renderPieChart(aggregated) {
  if (!statsPieChart || !statsNoData) return;
  const total = aggregated.reduce((sum, a) => sum + a.ms, 0);
  statsPieChart.innerHTML = '';
  if (total === 0) {
    statsNoData.removeAttribute('hidden');
    return;
  }
  statsNoData.setAttribute('hidden', '');
  const circumference = 2 * Math.PI * 40;
  const cx = 50;
  const cy = 50;
  const r = 40;
  statsPieChart.setAttribute('viewBox', '-8 -8 116 116');
  const svgNS = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(svgNS, 'g');
  group.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
  let offset = 0;
  aggregated.forEach((item, i) => {
    const length = (item.ms / total) * circumference;
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]);
    circle.setAttribute('stroke-width', 28);
    circle.setAttribute('stroke-dasharray', `${length} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', -offset);
    group.appendChild(circle);
    offset += length;
  });
  statsPieChart.appendChild(group);
}

function renderStatsCategoryList(aggregated) {
  if (!statsCategoryList) return;
  statsCategoryList.innerHTML = '';
  aggregated.forEach((item, i) => {
    const li = document.createElement('li');
    const color = PIE_CHART_COLORS[i % PIE_CHART_COLORS.length];
    li.innerHTML = `<span class="stats-cat-swatch" style="background:${escapeHtml(color)}" aria-hidden="true"></span><span class="stats-cat-name">${escapeHtml(item.categoryName)}</span><span class="stats-cat-duration">${formatDurationLong(item.ms)}</span>`;
    statsCategoryList.appendChild(li);
  });
}

function updateStatsRangeUI() {
  const isCustom = statsRange === 'custom';
  const isAll = statsRange === 'all';
  if (statsRangeNav) statsRangeNav.hidden = isCustom || isAll;
  if (statsRangeCustom) statsRangeCustom.hidden = !isCustom;
  if (statsRangeLabel && !isCustom && !isAll) {
    statsRangeLabel.textContent = formatRangeLabel(statsRange, statsOffset);
  }
}

function renderStats() {
  let sessions;
  if (statsRange === 'custom' && customStart && customEnd) {
    const start = new Date(customStart + 'T00:00:00');
    const end = new Date(customEnd + 'T23:59:59.999');
    sessions = getSessionsInRange({ start, end });
  } else if (statsRange === 'custom') {
    sessions = [];
  } else {
    sessions = getSessionsInRange(statsRange, statsOffset);
  }
  const aggregated = aggregateByCategory(sessions);
  renderPieChart(aggregated);
  renderStatsCategoryList(aggregated);
  updateStatsRangeUI();
}

function handleExport() {
  const data = {
    categories: getCategories(),
    sessions: getSessions(),
    active: getActiveSession(),
    exportedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'session-timer-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport() {
  const file = importDataInput?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setActiveSession(data.active ?? null);
      selectedCategoryId = null;
      stopStopwatch();
      renderCategories();
      renderSessionList();
      renderStats();
      if (selectedCategoryEl) selectedCategoryEl.textContent = 'No category selected';
      const active = getActiveSession();
      if (active) {
        if (startSessionBtn) startSessionBtn.hidden = true;
        if (stopSessionBtn) stopSessionBtn.hidden = false;
        selectedCategoryId = active.categoryId;
        if (selectedCategoryEl) selectedCategoryEl.textContent = `Selected: ${active.categoryName}`;
        renderCategories();
        startStopwatch();
      } else {
        updateStartButton();
      }
    } catch {
      alert('Invalid file');
    }
    if (importDataInput) importDataInput.value = '';
  };
  reader.readAsText(file);
}

if (addCategoryBtn) addCategoryBtn.addEventListener('click', addCategory);
if (categoryInput) categoryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCategory(); });
if (startSessionBtn) startSessionBtn.addEventListener('click', startSession);
if (stopSessionBtn) stopSessionBtn.addEventListener('click', stopSession);

const statsRangeBtns = document.querySelectorAll('.stats-range-btn');
statsRangeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    statsRange = btn.dataset.range || 'all';
    statsOffset = 0;
    statsRangeBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderStats();
  });
});

if (statsPrevBtn) statsPrevBtn.addEventListener('click', () => { statsOffset--; renderStats(); });
if (statsNextBtn) statsNextBtn.addEventListener('click', () => { statsOffset++; renderStats(); });

if (statsCustomStart) statsCustomStart.addEventListener('change', () => { customStart = statsCustomStart.value || null; renderStats(); });
if (statsCustomEnd) statsCustomEnd.addEventListener('change', () => { customEnd = statsCustomEnd.value || null; renderStats(); });

if (sessionPrevPage) sessionPrevPage.addEventListener('click', () => { sessionsPage--; renderSessionList(); });
if (sessionNextPage) sessionNextPage.addEventListener('click', () => { sessionsPage++; renderSessionList(); });

if (authSignInBtn) authSignInBtn.addEventListener('click', () => signInWithGoogle().catch(() => {}));
if (authSignOutBtn) authSignOutBtn.addEventListener('click', () => firebaseSignOut().catch(() => {}));

if (exportDataBtn) exportDataBtn.addEventListener('click', handleExport);
if (importDataBtn) importDataBtn.addEventListener('click', () => importDataInput?.click());
if (importDataInput) importDataInput.addEventListener('change', handleImport);

function renderAll() {
  renderCategories();
  renderSessionList();
  renderStats();
  const active = getActiveSession();
  if (active) {
    if (startSessionBtn) startSessionBtn.hidden = true;
    if (stopSessionBtn) stopSessionBtn.hidden = false;
    selectedCategoryId = active.categoryId;
    if (selectedCategoryEl) selectedCategoryEl.textContent = `Selected: ${active.categoryName}`;
    renderCategories();
    startStopwatch();
  } else {
    stopStopwatch();
    if (startSessionBtn) startSessionBtn.hidden = false;
    if (stopSessionBtn) stopSessionBtn.hidden = true;
    const cat = selectedCategoryId ? getCategories().find((c) => c.id === selectedCategoryId) : null;
    if (selectedCategoryEl) selectedCategoryEl.textContent = cat ? `Selected: ${cat.name}` : 'No category selected';
    updateStartButton();
  }
}

function updateAuthUI(user) {
  if (user) {
    if (authSignInBtn) authSignInBtn.hidden = true;
    if (authUserInfo) authUserInfo.hidden = false;
    if (authUserName) authUserName.textContent = user.displayName || user.email || 'Signed in';
  } else {
    if (authSignInBtn) authSignInBtn.hidden = false;
    if (authUserInfo) authUserInfo.hidden = true;
  }
}

function init() {
  setOnDataChange(() => {
    if (currentUid && !syncPaused) {
      pushToFirestore(currentUid).catch(() => {});
    }
  });

  renderAll();

  onAuthChange(async (user) => {
    if (user) {
      currentUid = user.uid;
      updateAuthUI(user);
      try {
        const data = await pullFromFirestore(user.uid);
        if (data) {
          syncPaused = true;
          setCategories(data.categories);
          setSessions(data.sessions);
          setActiveSession(data.active);
          syncPaused = false;
          renderAll();
        } else {
          await pushToFirestore(user.uid);
        }
      } catch {
        // Firestore unavailable -- continue with local data
      }
    } else {
      currentUid = null;
      updateAuthUI(null);
    }
  });
}

init();
