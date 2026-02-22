const STORAGE_KEYS = {
  categories: 'session_timer_categories',
  sessions: 'session_timer_sessions',
  active: 'session_timer_active',
};

function getStorage() {
  return typeof globalThis !== 'undefined' && globalThis.localStorage;
}

export function getCategories() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEYS.categories);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCategories(categories) {
  const storage = getStorage();
  if (storage) storage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
}

export function getSessions() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEYS.sessions);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setSessions(sessions) {
  const storage = getStorage();
  if (storage) storage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
}

export function getActiveSession() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEYS.active);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(active) {
  const storage = getStorage();
  if (!storage) return;
  if (active) {
    storage.setItem(STORAGE_KEYS.active, JSON.stringify(active));
  } else {
    storage.removeItem(STORAGE_KEYS.active);
  }
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationLong(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  return parts.length ? parts.join(', ') : '0 minutes';
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getStatsRangeBounds(range, offset = 0) {
  const now = new Date();
  let start, end;
  if (range === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    end = new Date(end.getTime() - 1);
  } else if (range === 'week') {
    start = new Date(now);
    const dow = start.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    start.setDate(start.getDate() + diff + offset * 7);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
    end = new Date(end.getTime() - 1);
  } else if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    end = new Date(end.getTime() - 1);
  } else if (range === 'year') {
    start = new Date(now.getFullYear() + offset, 0, 1);
    end = new Date(start.getFullYear() + 1, 0, 1);
    end = new Date(end.getTime() - 1);
  } else {
    start = new Date(0);
    end = now;
  }
  return { start, end };
}

export function getSessionsInRange(rangeOrBounds, offset = 0) {
  let start, end;
  if (typeof rangeOrBounds === 'object' && rangeOrBounds !== null && 'start' in rangeOrBounds) {
    ({ start, end } = rangeOrBounds);
  } else {
    ({ start, end } = getStatsRangeBounds(rangeOrBounds, offset));
  }
  const startMs = start.getTime();
  const endMs = end.getTime();
  return getSessions().filter((s) => {
    if (s.endTime == null) return false;
    const t = new Date(s.endTime).getTime();
    if (Number.isNaN(t)) return false;
    return t >= startMs && t <= endMs;
  });
}

export function formatRangeLabel(range, offset = 0) {
  if (range === 'all') return 'All time';
  const { start, end } = getStatsRangeBounds(range, offset);
  if (range === 'day') {
    return `${WEEKDAYS[start.getDay()]}, ${SHORT_MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
  }
  if (range === 'week') {
    if (start.getFullYear() === end.getFullYear()) {
      return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} \u2013 ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} \u2013 ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (range === 'month') {
    return `${LONG_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (range === 'year') {
    return `${start.getFullYear()}`;
  }
  return '';
}

export function aggregateByCategory(sessions) {
  const byId = new Map();
  for (const s of sessions) {
    const dur = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
    const existing = byId.get(s.categoryId);
    if (existing) existing.ms += dur;
    else byId.set(s.categoryId, { categoryId: s.categoryId, categoryName: s.categoryName, ms: dur });
  }
  return Array.from(byId.values()).sort((a, b) => b.ms - a.ms);
}

export function toDatetimeLocal(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export { STORAGE_KEYS };
