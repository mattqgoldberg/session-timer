import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  getCategories, getSessionsInRange, aggregateByCategory,
  formatRangeLabel, formatDurationLong,
} from '../core.js';
import { getCategoryColor } from '../colors.js';

function getAggregatedColor(categoryId) {
  const cats = getCategories();
  const cat = cats.find((c) => c.id === categoryId);
  return getCategoryColor(cat);
}

const RANGES = ['day', 'week', 'month', 'year', 'all', 'custom'];
const RANGE_LABELS = { day: 'Day', week: 'Week', month: 'Month', year: 'Year', all: 'All', custom: 'Custom' };

function PieChart({ aggregated }) {
  const total = aggregated.reduce((sum, a) => sum + a.ms, 0);
  const circumference = 2 * Math.PI * 40;
  const [animate, setAnimate] = useState(false);
  const prevKeyRef = useRef('');

  const key = aggregated.map((a) => `${a.categoryId}:${a.ms}`).join(',');
  useEffect(() => {
    if (key !== prevKeyRef.current) {
      setAnimate(false);
      const raf = requestAnimationFrame(() => setAnimate(true));
      prevKeyRef.current = key;
      return () => cancelAnimationFrame(raf);
    }
  }, [key]);

  if (total === 0) return null;

  let offset = 0;
  const segments = aggregated.map((item, i) => {
    const length = (item.ms / total) * circumference;
    const seg = { length, offset, color: getAggregatedColor(item.categoryId) };
    offset += length;
    return seg;
  });

  return (
    <svg viewBox="-8 -8 116 116">
      <g transform="rotate(-90 50 50)">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={seg.color}
            strokeWidth="28"
            strokeDasharray={animate ? `${seg.length} ${circumference}` : `0 ${circumference}`}
            strokeDashoffset={-seg.offset}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        ))}
      </g>
    </svg>
  );
}

export default function Statistics() {
  const [range, setRange] = useState('week');
  const [offset, setOffset] = useState(0);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  let sessions;
  if (range === 'custom' && customStart && customEnd) {
    const start = new Date(customStart + 'T00:00:00');
    const end = new Date(customEnd + 'T23:59:59.999');
    sessions = getSessionsInRange({ start, end });
  } else if (range === 'custom') {
    sessions = [];
  } else {
    sessions = getSessionsInRange(range, offset);
  }

  const aggregated = aggregateByCategory(sessions);
  const total = aggregated.reduce((sum, a) => sum + a.ms, 0);
  const showNav = range !== 'all' && range !== 'custom';

  return (
    <motion.div
      className="card stats-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <div className="card-title">
        <span className="card-title-icon">📊</span>
        Statistics
      </div>

      <div className="range-toggles">
        {RANGES.map((r) => (
          <motion.button
            key={r}
            className={`range-toggle${range === r ? ' active' : ''}`}
            onClick={() => { setRange(r); setOffset(0); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            layout
          >
            {RANGE_LABELS[r]}
          </motion.button>
        ))}
      </div>

      {showNav && (
        <div className="range-nav">
          <button className="range-nav-btn" onClick={() => setOffset((o) => o - 1)}>‹</button>
          <span className="range-label">{formatRangeLabel(range, offset)}</span>
          <button className="range-nav-btn" onClick={() => setOffset((o) => o + 1)}>›</button>
        </div>
      )}

      {range === 'custom' && (
        <div className="custom-range-row">
          <input
            type="date"
            className="input"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            className="input"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {aggregated.length === 0 ? (
        <p className="empty-state">No sessions recorded in this period.</p>
      ) : (
        <>
          <div className="stats-layout">
            <div className="pie-chart-container">
              <PieChart aggregated={aggregated} />
            </div>
            <div className="stats-breakdown">
              {aggregated.map((item, i) => (
                <motion.div
                  key={item.categoryId}
                  className="stats-breakdown-item"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <div className="stats-swatch" style={{ background: getAggregatedColor(item.categoryId) }} />
                  <span className="stats-cat-name">{item.categoryName}</span>
                  <span className="stats-cat-duration">{formatDurationLong(item.ms)}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="stats-total">
            Total: {formatDurationLong(total)}
          </div>
        </>
      )}
    </motion.div>
  );
}
