import * as admin from 'firebase-admin';

let initialized = false;

export function initAdmin() {
  if (initialized) return admin;

  // Initialize once. In production, set GOOGLE_APPLICATION_CREDENTIALS env var
  // or let Functions runtime provide the credentials.
  try {
    admin.initializeApp();
  } catch (e) {
    // ignore if already initialized
  }
  initialized = true;
  return admin;
}

export function getFirestore() {
  return initAdmin().firestore();
}

export function getMessaging() {
  return initAdmin().messaging();
}
