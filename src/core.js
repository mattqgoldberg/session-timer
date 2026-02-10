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

export function getStatsRangeBounds(range) {
  const now = new Date();
  let start;
  if (range === 'week') {
    start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(0);
  }
  return { start, end: now };
}

export function getSessionsInRange(range) {
  const { start, end } = getStatsRangeBounds(range);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return getSessions().filter((s) => {
    if (s.endTime == null) return false;
    const t = new Date(s.endTime).getTime();
    if (Number.isNaN(t)) return false;
    return t >= startMs && t <= endMs;
  });
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
