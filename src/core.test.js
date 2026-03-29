import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEYS,
  getCategories,
  getHiddenCategories,
  setCategories,
  getSessions,
  setSessions,
  getActiveSession,
  setActiveSession,
  deleteCategory,
  getVisibleCategories,
  updateCategory,
  formatDuration,
  formatDurationLong,
  getStatsRangeBounds,
  getSessionsInRange,
  aggregateByCategory,
  toDatetimeLocal,
  formatRangeLabel,
} from './core.js';

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEYS.categories);
  localStorage.removeItem(STORAGE_KEYS.sessions);
  localStorage.removeItem(STORAGE_KEYS.active);
});

describe('categories', () => {
  it('returns empty array when no categories stored', () => {
    expect(getCategories()).toEqual([]);
  });

  it('returns what was set via setCategories', () => {
    setCategories([{ id: 'c1', name: 'Work' }]);
    expect(getCategories()).toEqual([{ id: 'c1', name: 'Work', hidden: false }]);
  });

  it('persists to localStorage', () => {
    setCategories([{ id: 'c1', name: 'Work' }]);
    expect(localStorage.getItem(STORAGE_KEYS.categories)).toBe('[{"id":"c1","name":"Work"}]');
  });

  it('returns updated list after second setCategories', () => {
    setCategories([{ id: 'c1', name: 'Work' }]);
    setCategories([{ id: 'c1', name: 'Work' }, { id: 'c2', name: 'Personal' }]);
    expect(getCategories()).toHaveLength(2);
  });

  it('updateCategory updates the category record', () => {
    setCategories([{ id: 'c1', name: 'Work', color: '#000000' }]);
    updateCategory('c1', { name: 'Deep Work', color: '#ffffff' });
    const cats = getCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('Deep Work');
    expect(cats[0].color).toBe('#ffffff');
    expect(cats[0].hidden).toBe(false);
  });

  it('defaults missing hidden flags to false', () => {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify([{ id: 'c1', name: 'Work' }]));
    expect(getCategories()).toEqual([{ id: 'c1', name: 'Work', hidden: false }]);
  });

  it('returns visible and hidden categories separately', () => {
    setCategories([
      { id: 'c1', name: 'Work', hidden: false },
      { id: 'c2', name: 'Archive', hidden: true },
    ]);
    expect(getVisibleCategories().map((cat) => cat.id)).toEqual(['c1']);
    expect(getHiddenCategories().map((cat) => cat.id)).toEqual(['c2']);
  });

  it('updateCategory can hide and unhide a category', () => {
    setCategories([{ id: 'c1', name: 'Work', hidden: false }]);
    updateCategory('c1', { hidden: true });
    expect(getCategories()[0].hidden).toBe(true);
    updateCategory('c1', { hidden: false });
    expect(getCategories()[0].hidden).toBe(false);
  });
});

describe('sessions', () => {
  it('returns empty array when no sessions stored', () => {
    expect(getSessions()).toEqual([]);
  });

  it('returns what was set via setSessions', () => {
    const sess = { id: 's1', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z', endTime: '2025-01-01T11:00:00.000Z' };
    setSessions([sess]);
    expect(getSessions()).toEqual([sess]);
  });

  it('persists to localStorage', () => {
    setSessions([{ id: 's1', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z', endTime: '2025-01-01T11:00:00.000Z' }]);
    expect(localStorage.getItem(STORAGE_KEYS.sessions)).toContain('s1');
  });

  it('updateCategory updates existing sessions categoryName when name changes', () => {
    setCategories([{ id: 'c1', name: 'Work' }]);
    setSessions([
      { id: 's1', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z', endTime: '2025-01-01T11:00:00.000Z' },
      { id: 's2', categoryId: 'c2', categoryName: 'Play', startTime: '2025-01-01T12:00:00.000Z', endTime: '2025-01-01T13:00:00.000Z' },
    ]);
    updateCategory('c1', { name: 'Deep Work' });
    const sessions = getSessions();
    const s1 = sessions.find((s) => s.id === 's1');
    const s2 = sessions.find((s) => s.id === 's2');
    expect(s1.categoryName).toBe('Deep Work');
    expect(s2.categoryName).toBe('Play');
  });
});

describe('active session', () => {
  it('returns null when no active session', () => {
    expect(getActiveSession()).toBeNull();
  });

  it('returns what was set via setActiveSession', () => {
    const active = { categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z' };
    setActiveSession(active);
    expect(getActiveSession()).toEqual(active);
  });

  it('returns null after setActiveSession(null)', () => {
    setActiveSession({ categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z' });
    setActiveSession(null);
    expect(getActiveSession()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.active)).toBeNull();
  });

  it('updateCategory updates the active session categoryName when name changes', () => {
    setCategories([{ id: 'c1', name: 'Work' }]);
    const active = { categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z' };
    setActiveSession(active);
    updateCategory('c1', { name: 'Deep Work' });
    const updated = getActiveSession();
    expect(updated.categoryName).toBe('Deep Work');
  });
});

describe('formatDuration', () => {
  it('formats zero as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats 1h 1m 1s', () => {
    expect(formatDuration(3661000)).toBe('01:01:01');
  });

  it('formats 2h 2m 5s', () => {
    expect(formatDuration(7325000)).toBe('02:02:05');
  });
});

describe('formatDurationLong', () => {
  it('formats zero as 0 minutes', () => {
    expect(formatDurationLong(0)).toBe('0 minutes');
  });

  it('formats 90 seconds as 1 minute', () => {
    expect(formatDurationLong(90000)).toBe('1 minute');
  });

  it('formats 1 hour', () => {
    expect(formatDurationLong(3600000)).toBe('1 hour');
  });

  it('formats 1 day', () => {
    expect(formatDurationLong(86400000)).toBe('1 day');
  });

  it('formats 1 day, 1 hour, 1 minute', () => {
    expect(formatDurationLong(90061000)).toBe('1 day, 1 hour, 1 minute');
  });
});

describe('getStatsRangeBounds', () => {
  it('returns start at epoch for "all"', () => {
    const { start } = getStatsRangeBounds('all');
    expect(start.getTime()).toBe(0);
  });

  it('returns start <= end for "week"', () => {
    const { start, end } = getStatsRangeBounds('week');
    expect(start.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it('returns first of month for "month"', () => {
    const { start } = getStatsRangeBounds('month');
    expect(start.getDate()).toBe(1);
  });

  it('returns January for "year"', () => {
    const { start } = getStatsRangeBounds('year');
    expect(start.getMonth()).toBe(0);
  });

  it('returns today bounds for "day" offset 0', () => {
    const { start, end } = getStatsRangeBounds('day', 0);
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getDate()).toBe(now.getDate());
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(now.getDate());
    expect(end.getHours()).toBe(23);
  });

  it('returns yesterday for "day" offset -1', () => {
    const { start } = getStatsRangeBounds('day', -1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(start.getDate()).toBe(yesterday.getDate());
  });

  it('shifts week by offset', () => {
    const current = getStatsRangeBounds('week', 0);
    const prev = getStatsRangeBounds('week', -1);
    expect(prev.start.getTime()).toBe(current.start.getTime() - 7 * 24 * 60 * 60 * 1000);
  });

  it('shifts month by offset', () => {
    const current = getStatsRangeBounds('month', 0);
    const prev = getStatsRangeBounds('month', -1);
    expect(prev.start.getMonth()).toBe((current.start.getMonth() + 11) % 12);
  });

  it('shifts year by offset', () => {
    const current = getStatsRangeBounds('year', 0);
    const prev = getStatsRangeBounds('year', -1);
    expect(prev.start.getFullYear()).toBe(current.start.getFullYear() - 1);
  });

  it('end covers the full period for week', () => {
    const { start, end } = getStatsRangeBounds('week', 0);
    const diff = end.getTime() - start.getTime();
    expect(diff).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(8 * 24 * 60 * 60 * 1000);
  });
});

describe('getSessionsInRange', () => {
  it('returns all completed sessions for "all"', () => {
    setSessions([
      { id: 's1', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z', endTime: '2025-01-01T11:00:00.000Z' },
      { id: 's2', categoryId: 'c1', categoryName: 'Work', startTime: '2025-06-15T09:00:00.000Z', endTime: '2025-06-15T10:00:00.000Z' },
    ]);
    expect(getSessionsInRange('all')).toHaveLength(2);
  });

  it('returns array for any range', () => {
    expect(getSessionsInRange('week')).toEqual([]);
    expect(Array.isArray(getSessionsInRange('month'))).toBe(true);
  });

  it('accepts explicit { start, end } bounds', () => {
    setSessions([
      { id: 's1', categoryId: 'c1', categoryName: 'Work', startTime: '2025-03-10T10:00:00.000Z', endTime: '2025-03-10T11:00:00.000Z' },
      { id: 's2', categoryId: 'c1', categoryName: 'Work', startTime: '2025-04-15T09:00:00.000Z', endTime: '2025-04-15T10:00:00.000Z' },
    ]);
    const results = getSessionsInRange({ start: new Date('2025-03-01'), end: new Date('2025-03-31T23:59:59.999Z') });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('s1');
  });

  it('respects offset parameter', () => {
    const now = new Date();
    const todaySession = {
      id: 's1', categoryId: 'c1', categoryName: 'Work',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10).toISOString(),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11).toISOString(),
    };
    setSessions([todaySession]);
    expect(getSessionsInRange('day', 0)).toHaveLength(1);
    expect(getSessionsInRange('day', -1)).toHaveLength(0);
  });
});

describe('formatRangeLabel', () => {
  it('returns "All time" for "all"', () => {
    expect(formatRangeLabel('all')).toBe('All time');
  });

  it('returns weekday and date for "day"', () => {
    const label = formatRangeLabel('day', 0);
    const now = new Date();
    expect(label).toContain(String(now.getFullYear()));
    expect(label).toMatch(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), /);
  });

  it('returns date range for "week"', () => {
    const label = formatRangeLabel('week', 0);
    expect(label).toContain('\u2013');
  });

  it('returns month and year for "month"', () => {
    const label = formatRangeLabel('month', 0);
    const now = new Date();
    expect(label).toContain(String(now.getFullYear()));
    expect(label).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) /);
  });

  it('returns year string for "year"', () => {
    const now = new Date();
    expect(formatRangeLabel('year', 0)).toBe(String(now.getFullYear()));
  });

  it('reflects offset for "month"', () => {
    const current = formatRangeLabel('month', 0);
    const prev = formatRangeLabel('month', -1);
    expect(current).not.toBe(prev);
  });
});

describe('aggregateByCategory', () => {
  it('returns one entry per category with correct totals', () => {
    const sessions = [
      { id: 'a', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z', endTime: '2025-01-01T11:00:00.000Z' },
      { id: 'b', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T12:00:00.000Z', endTime: '2025-01-01T13:00:00.000Z' },
      { id: 'c', categoryId: 'c2', categoryName: 'Personal', startTime: '2025-01-01T14:00:00.000Z', endTime: '2025-01-01T15:30:00.000Z' },
    ];
    const agg = aggregateByCategory(sessions);
    expect(agg).toHaveLength(2);
    const work = agg.find((e) => e.categoryId === 'c1');
    const personal = agg.find((e) => e.categoryId === 'c2');
    expect(work.ms).toBe(7200000);
    expect(personal.ms).toBe(5400000);
  });

  it('sorts by ms descending', () => {
    const sessions = [
      { id: 'a', categoryId: 'c1', categoryName: 'Work', startTime: '2025-01-01T10:00:00.000Z', endTime: '2025-01-01T11:00:00.000Z' },
      { id: 'b', categoryId: 'c2', categoryName: 'Personal', startTime: '2025-01-01T12:00:00.000Z', endTime: '2025-01-01T15:00:00.000Z' },
    ];
    const agg = aggregateByCategory(sessions);
    expect(agg[0].categoryId).toBe('c2');
    expect(agg[1].categoryId).toBe('c1');
  });
});

describe('toDatetimeLocal', () => {
  it('returns string in YYYY-MM-DDTHH:mm form', () => {
    const result = toDatetimeLocal('2025-02-10T18:30:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(result).toContain('2025');
  });
});

describe('deleteCategory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the category from the list', () => {
    setCategories([
      { id: 'a', name: 'Work' },
      { id: 'b', name: 'Play' },
    ]);
    deleteCategory('a');
    const cats = getCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0].id).toBe('b');
  });

  it('reassigns orphaned sessions to Uncategorized', () => {
    setCategories([{ id: 'a', name: 'Work' }]);
    setSessions([
      { id: 's1', categoryId: 'a', categoryName: 'Work', duration: 100 },
      { id: 's2', categoryId: 'b', categoryName: 'Play', duration: 200 },
    ]);
    deleteCategory('a');
    const sessions = getSessions();
    expect(sessions[0].categoryId).toBe('__uncategorized__');
    expect(sessions[0].categoryName).toBe('Uncategorized');
    expect(sessions[1].categoryId).toBe('b');
    expect(sessions[1].categoryName).toBe('Play');
  });

  it('reassigns an active session to Uncategorized when its category is deleted', () => {
    setCategories([{ id: 'a', name: 'Work' }]);
    setActiveSession({ categoryId: 'a', categoryName: 'Work', startTime: new Date().toISOString() });
    deleteCategory('a');
    const active = getActiveSession();
    expect(active.categoryId).toBe('__uncategorized__');
    expect(active.categoryName).toBe('Uncategorized');
  });

  it('does not modify sessions when no sessions belong to the deleted category', () => {
    setCategories([
      { id: 'a', name: 'Work' },
      { id: 'b', name: 'Play' },
    ]);
    setSessions([
      { id: 's1', categoryId: 'b', categoryName: 'Play', duration: 100 },
    ]);
    deleteCategory('a');
    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].categoryId).toBe('b');
  });

  it('does not touch the active session when it belongs to a different category', () => {
    setCategories([{ id: 'a', name: 'Work' }, { id: 'b', name: 'Play' }]);
    setActiveSession({ categoryId: 'b', categoryName: 'Play', startTime: new Date().toISOString() });
    deleteCategory('a');
    const active = getActiveSession();
    expect(active.categoryId).toBe('b');
    expect(active.categoryName).toBe('Play');
  });

  it('works when there are no sessions at all', () => {
    setCategories([{ id: 'a', name: 'Work' }]);
    deleteCategory('a');
    expect(getCategories()).toHaveLength(0);
    expect(getSessions()).toHaveLength(0);
    expect(getActiveSession()).toBeNull();
  });
});
