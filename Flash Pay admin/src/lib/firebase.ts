import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCEffnRzBjjgyOh9IIUqmyqSd5jNJUQM_k",
  authDomain: "flash-pay-937d7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "flash-pay-937d7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "flash-pay-937d7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "4504627700",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:4504627700:web:f1e63d7f9cc59b1b1af1a1",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialisation sécurisée de Firestore (compatible HMR)
// Désactive le cache persistant sur disque pour garantir une synchronisation instantanée.
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
} catch (e) {
  firestore = getFirestore(app);
}

export const db = firestore;
export const storage = getStorage(app);
