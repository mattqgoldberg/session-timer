import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEYS,
  getCategories,
  setCategories,
  getSessions,
  setSessions,
  getActiveSession,
  setActiveSession,
  formatDuration,
  formatDurationLong,
  getStatsRangeBounds,
  getSessionsInRange,
  aggregateByCategory,
  toDatetimeLocal,
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
    expect(getCategories()).toEqual([{ id: 'c1', name: 'Work' }]);
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
