import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCategories, setCategories,
  getSessions, setSessions,
  getActiveSession, setActiveSession,
  setOnDataChange,
} from './core.js';
import {
  signInWithGoogle, firebaseSignOut, onAuthChange,
  pushToFirestore, pullFromFirestore, subscribeToFirestore,
} from './firebase.js';
import Header from './components/Header';
import CategoryManager from './components/CategoryManager';
import Stopwatch from './components/Stopwatch';
import Statistics from './components/Statistics';
import SessionList from './components/SessionList';

function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}

function localFingerprint() {
  return JSON.stringify({
    c: getCategories(),
    s: getSessions(),
    a: getActiveSession(),
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const uidRef = useRef(null);
  const syncPausedRef = useRef(false);
  const unsubSnapshotRef = useRef(null);
  const fingerprintRef = useRef('');
  const refresh = useForceUpdate();

  function hydrateFromRemote(data) {
    const remoteFingerprint = JSON.stringify({
      c: data.categories,
      s: data.sessions,
      a: data.active,
    });
    if (remoteFingerprint === fingerprintRef.current) return;

    syncPausedRef.current = true;
    setCategories(data.categories);
    setSessions(data.sessions);
    setActiveSession(data.active);
    fingerprintRef.current = localFingerprint();
    syncPausedRef.current = false;

    const a = getActiveSession();
    if (a) setSelectedCategoryId(a.categoryId);
    refresh();
  }

  useEffect(() => {
    setOnDataChange(() => {
      fingerprintRef.current = localFingerprint();
      if (uidRef.current && !syncPausedRef.current) {
        pushToFirestore(uidRef.current).catch(() => {});
      }
    });

    const active = getActiveSession();
    if (active) setSelectedCategoryId(active.categoryId);
    fingerprintRef.current = localFingerprint();

    const unsubAuth = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubSnapshotRef.current) {
        unsubSnapshotRef.current();
        unsubSnapshotRef.current = null;
      }

      if (firebaseUser) {
        uidRef.current = firebaseUser.uid;

        try {
          const data = await pullFromFirestore(firebaseUser.uid);
          if (data) {
            hydrateFromRemote(data);
          } else {
            await pushToFirestore(firebaseUser.uid);
          }
        } catch {
          // Firestore unavailable for initial pull
        }

        unsubSnapshotRef.current = subscribeToFirestore(firebaseUser.uid, (data) => {
          hydrateFromRemote(data);
        });
      } else {
        uidRef.current = null;
      }
    });

    function handleVisibility() {
      if (document.visibilityState === 'visible' && uidRef.current) {
        pullFromFirestore(uidRef.current)
          .then((data) => { if (data) hydrateFromRemote(data); })
          .catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubAuth();
      if (unsubSnapshotRef.current) unsubSnapshotRef.current();
      document.removeEventListener('visibilitychange', handleVisibility);
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
