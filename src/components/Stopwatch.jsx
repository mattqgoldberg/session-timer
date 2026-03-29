import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getVisibleCategories, getSessions, setSessions,
  getActiveSession, setActiveSession, formatDuration,
} from '../core.js';

export default function Stopwatch({ selectedCategoryId, onSessionChange, syncVersion }) {
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(getActiveSession());
  const intervalRef = useRef(null);

  const categories = getVisibleCategories();
  const selectedCat = categories.find((c) => c.id === selectedCategoryId);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const a = getActiveSession();
    setActive(a);
    if (a) {
      const tick = () => {
        const start = new Date(a.startTime).getTime();
        setElapsed(Date.now() - start);
      };
      tick();
      intervalRef.current = setInterval(tick, 100);
    } else {
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedCategoryId, syncVersion]);

  function startSession() {
    if (!selectedCat) return;
    const startTime = new Date().toISOString();
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`;
    const newActive = { categoryId: selectedCat.id, categoryName: selectedCat.name, startTime };
    setActiveSession(newActive);
    const sessions = getSessions();
    sessions.push({ id: sessionId, categoryId: selectedCat.id, categoryName: selectedCat.name, startTime, endTime: null });
    setSessions(sessions);
    setActive(newActive);
    setElapsed(0);

    const tick = () => {
      const start = new Date(startTime).getTime();
      setElapsed(Date.now() - start);
    };
    intervalRef.current = setInterval(tick, 100);
    onSessionChange();
  }

  function stopSession() {
    if (!active) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const endTime = new Date().toISOString();
    const sessions = getSessions();
    const current = sessions.find((s) => s.endTime === null && s.categoryId === active.categoryId);
    if (current) {
      current.endTime = endTime;
      setSessions(sessions);
    }
    setActiveSession(null);
    setActive(null);
    setElapsed(0);
    onSessionChange();
  }

  const isRunning = !!active;
  const canStart = !!selectedCat && !isRunning;

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="card-title">
        <span className="card-title-icon">⏱️</span>
        Timer
      </div>

      <div className="stopwatch-display">
        <div className="stopwatch-category">
          {isRunning ? (
            <>
              <span className="pulse-ring" />
              {active.categoryName}
            </>
          ) : selectedCat ? (
            `Ready: ${selectedCat.name}`
          ) : (
            'Select a category to start'
          )}
        </div>

        <div className={`stopwatch-time${isRunning ? ' running' : ''}`}>
          {formatDuration(elapsed)}
        </div>

        <AnimatePresence mode="wait">
          {isRunning ? (
            <motion.button
              key="stop"
              className="btn btn-stop"
              onClick={stopSession}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              Stop
            </motion.button>
          ) : (
            <motion.button
              key="start"
              className="btn btn-start"
              onClick={startSession}
              disabled={!canStart}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={canStart ? { scale: 1.02 } : {}}
              whileTap={canStart ? { scale: 0.98 } : {}}
              transition={{ duration: 0.2 }}
            >
              Start
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
