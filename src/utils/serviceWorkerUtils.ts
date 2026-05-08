/**
 * Service Worker Utilities
 * Handles registration and management of Service Workers
 */

/**
 * Register Service Worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser');
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      {
        scope: '/',
      }
    );

    console.log('✅ Service Worker registered:', registration);

    // Set up update check
    registration.onupdatefound = () => {
      console.log('🔄 Service Worker update found');
    };

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Unregister all Service Workers
 */
export async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Service Worker unregistered');
    }
  } catch (error) {
    console.error('❌ Error unregistering Service Workers:', error);
  }
}

/**
 * Check if Service Worker is active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active !== undefined;
  } catch (error) {
    console.error('❌ Error checking Service Worker status:', error);
    return false;
  }
}

/**
 * Get Service Worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) {
    return undefined;
  }

  try {
    return await navigator.serviceWorker.getRegistration();
  } catch (error) {
    console.error('❌ Error getting Service Worker registration:', error);
    return undefined;
  }
}

/**
 * Listen for messages from Service Worker
 */
export function onServiceWorkerMessage(
  callback: (event: MessageEvent) => void
): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', callback);
}

/**
 * Send message to Service Worker
 */
export async function sendMessageToServiceWorker(message: any): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage(message);
    }
  } catch (error) {
    console.error('❌ Error sending message to Service Worker:', error);
  }
}

/**
 * Check if Service Workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}
