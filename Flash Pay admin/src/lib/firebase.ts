import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCEffnRzBjjgyOh9IIUqmyqSd5jNJUQM_k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "flash-pay.site",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "flash-pay-937d7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "flash-pay-937d7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "4504627700",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:4504627700:web:f1e63d7f9cc59b1b1af1a1",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export const storage = getStorage(app);
