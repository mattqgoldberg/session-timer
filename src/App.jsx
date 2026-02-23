import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCategories, setCategories,
  getSessions, setSessions,
  getActiveSession, setActiveSession,
  setOnDataChange,
} from './core.js';
import { signInWithGoogle, firebaseSignOut, onAuthChange, pushToFirestore, pullFromFirestore } from './firebase.js';
import Header from './components/Header';
import CategoryManager from './components/CategoryManager';
import Stopwatch from './components/Stopwatch';
import Statistics from './components/Statistics';
import SessionList from './components/SessionList';

function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const uidRef = useRef(null);
  const syncPausedRef = useRef(false);
  const refresh = useForceUpdate();

  useEffect(() => {
    setOnDataChange(() => {
      if (uidRef.current && !syncPausedRef.current) {
        pushToFirestore(uidRef.current).catch(() => {});
      }
    });

    const active = getActiveSession();
    if (active) setSelectedCategoryId(active.categoryId);

    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        uidRef.current = firebaseUser.uid;
        try {
          const data = await pullFromFirestore(firebaseUser.uid);
          if (data) {
            syncPausedRef.current = true;
            setCategories(data.categories);
            setSessions(data.sessions);
            setActiveSession(data.active);
            syncPausedRef.current = false;
            const a = getActiveSession();
            if (a) setSelectedCategoryId(a.categoryId);
            refresh();
          } else {
            await pushToFirestore(firebaseUser.uid);
          }
        } catch {
          // Firestore unavailable
        }
      } else {
        uidRef.current = null;
      }
    });

    return () => {
      unsub();
      setOnDataChange(null);
    };
  }, [refresh]);

  const handleSignIn = () => signInWithGoogle().catch(() => {});
  const handleSignOut = () => firebaseSignOut().catch(() => {});

  return (
    <div className="app-container">
      <Header user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
      <div className="main-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <CategoryManager
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onDataChange={refresh}
          />
          <Stopwatch
            selectedCategoryId={selectedCategoryId}
            onSessionChange={refresh}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
          <SessionList onDataChange={refresh} style={{ flex: 1 }} />
        </div>
        <Statistics />
      </div>
    </div>
  );
}
