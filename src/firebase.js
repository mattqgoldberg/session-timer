import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getCategories, getSessions, getActiveSession } from './core.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function signInWithGoogle() {
  if (!auth) return Promise.resolve(null);
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function firebaseSignOut() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function pushToFirestore(uid) {
  if (!db || !uid) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    categories: getCategories(),
    sessions: getSessions(),
    active: getActiveSession(),
  });
}

export async function pullFromFirestore(uid) {
  if (!db || !uid) return null;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    active: data.active ?? null,
  };
}
