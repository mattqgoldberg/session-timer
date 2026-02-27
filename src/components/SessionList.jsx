import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCategories, getSessions, setSessions,
  formatDuration, toDatetimeLocal,
} from '../core.js';
import { colorVariants, getCategoryColor } from '../colors.js';

const SESSIONS_PER_PAGE = 5;

function getBadgeColor(categoryId, categories) {
  const cat = categories.find((c) => c.id === categoryId);
  return colorVariants(getCategoryColor(cat));
}

function EditForm({ session, onSave, onCancel }) {
  const categories = getCategories();
  const [catId, setCatId] = useState(session.categoryId);
  const [startVal, setStartVal] = useState(toDatetimeLocal(session.startTime));
  const [endVal, setEndVal] = useState(toDatetimeLocal(session.endTime));

  function handleSubmit(e) {
    e.preventDefault();
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const startIso = new Date(startVal).toISOString();
    const endIso = new Date(endVal).toISOString();
    if (new Date(endIso) <= new Date(startIso)) return;
    onSave(session.id, cat.id, cat.name, startIso, endIso);
  }

  return (
    <form className="session-edit-form" onSubmit={handleSubmit}>
      <div className="session-edit-row">
        <label>Category</label>
        <select value={catId} onChange={(e) => setCatId(e.target.value)}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="session-edit-row">
        <label>Start</label>
        <input type="datetime-local" value={startVal} onChange={(e) => setStartVal(e.target.value)} required />
      </div>
      <div className="session-edit-row">
        <label>End</label>
        <input type="datetime-local" value={endVal} onChange={(e) => setEndVal(e.target.value)} required />
      </div>
      <div className="session-edit-actions">
        <button type="submit" className="btn btn-primary btn-sm">Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default function SessionList({ onDataChange, style }) {
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const categories = getCategories();

  const allSessions = getSessions().filter((s) => s.endTime != null).reverse();
  const totalPages = Math.max(1, Math.ceil(allSessions.length / SESSIONS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * SESSIONS_PER_PAGE;
  const sessions = allSessions.slice(pageStart, pageStart + SESSIONS_PER_PAGE);

  function deleteSession(id) {
    const updated = getSessions().filter((s) => s.id !== id);
    setSessions(updated);
    const newTotal = Math.max(1, Math.ceil((allSessions.length - 1) / SESSIONS_PER_PAGE));
    if (safePage >= newTotal) setPage(newTotal - 1);
    onDataChange();
  }

  function saveEdit(id, catId, catName, startIso, endIso) {
    const sessions = getSessions();
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    session.categoryId = catId;
    session.categoryName = catName;
    session.startTime = startIso;
    session.endTime = endIso;
    setSessions(sessions);
    setEditingId(null);
    onDataChange();
  }

  return (
    <motion.div
      className="card session-list-card"
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="card-title">
        <span className="card-title-icon">📋</span>
        All Sessions
      </div>

      {allSessions.length === 0 ? (
        <p className="empty-state">No sessions recorded yet. Start one!</p>
      ) : (
        <>
          <div className="session-list-items">
            <AnimatePresence mode="popLayout">
              {sessions.map((s, i) => {
                const dur = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
                const badgeColor = getBadgeColor(s.categoryId, categories);

                if (editingId === s.id) {
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                    >
                      <EditForm
                        session={s}
                        onSave={saveEdit}
                        onCancel={() => setEditingId(null)}
                      />
                    </motion.div>
                  );
                }

                const startDate = new Date(s.startTime).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                });

                return (
                  <motion.div
                    key={s.id}
                    className="session-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    layout
                  >
                    <span
                      className="session-badge"
                      style={{ background: badgeColor.bg, color: badgeColor.text }}
                    >
                      {s.categoryName}
                    </span>
                    <span className="session-duration">{formatDuration(dur)}</span>
                    <span className="session-date">{startDate}</span>
                    <span className="session-actions">
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => setEditingId(s.id)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="btn-icon danger"
                        title="Delete"
                        onClick={() => deleteSession(s.id)}
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="session-pagination">
              <button
                className="range-nav-btn"
                disabled={safePage === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="session-page-label">{safePage + 1} / {totalPages}</span>
              <button
                className="range-nav-btn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
