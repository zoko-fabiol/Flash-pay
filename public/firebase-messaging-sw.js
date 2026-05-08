/**
 * Firebase Service Worker
 * Handles push notifications when the app is in the background
 * 
 * File location: public/firebase-messaging-sw.js
 * Must be registered by the app during initialization
 */

// Import Firebase scripts (Compat version is required for importScripts)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyCEffnRzBjjgyOh9IIUqmyqSd5jNJUQM_k",
  authDomain: "flash-pay-937d7.firebaseapp.com",
  projectId: "flash-pay-937d7",
  storageBucket: "flash-pay-937d7.firebasestorage.app",
  messagingSenderId: "4504627700",
  appId: "1:4504627700:web:f1e63d7f9cc59b1b1af1a1",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

/**
 * Handle background messages
 * This runs when the app is closed or in the background
 */
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background message received:', payload);

  const {
    notification,
    data,
  } = payload;

  if (!notification) {
    console.warn('⚠️ Background message has no notification data');
    return;
  }

  // Build notification options
  const notificationOptions = {
    body: notification.body || 'Flash Pay',
    icon: notification.image || '/assets/icon.png',
    badge: '/assets/badge.png',
    tag: data?.notificationId || 'flash-pay-notification',
    
    // Sound notification
    requireInteraction: data?.priority === 'high' ? true : false,
    
    // Data to pass when notification is clicked
    data: {
      ...data,
      dateOfArrival: Date.now(),
      primaryKey: data?.notificationId || 1,
    },
    
    // Action buttons (optional)
    actions: data?.actions ? JSON.parse(data.actions) : [],
    
    // Vibration pattern
    vibrate: [200, 100, 200],
  };

  // Display notification
  self.registration.showNotification(
    notification.title || 'Flash Pay',
    notificationOptions
  );
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.tag);

  const notification = event.notification;
  const data = notification.data;

  // Close notification
  event.notification.close();

  // Get the deep link URL or fallback to home
  const urlToOpen = data?.deeplink || data?.actionUrl || '/';

  // Check if a window with this URL is already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if any window is already open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );

  // Send event to all tabs
  self.clients.matchAll({ type: 'window' }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'NOTIFICATION_CLICKED',
        notification: {
          title: notification.title,
          tag: notification.tag,
          data: data,
        },
      });
    });
  });
});

/**
 * Handle notification close events
 */
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification closed:', event.notification.tag);

  // Send event to all tabs when user dismisses notification
  self.clients.matchAll({ type: 'window' }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'NOTIFICATION_CLOSED',
        notification: {
          tag: event.notification.tag,
        },
      });
    });
  });
});

/**
 * Handle notification action clicks
 */
self.addEventListener('notificationclick', (event) => {
  if (event.action) {
    console.log('🎯 Notification action clicked:', event.action);

    // Handle specific action
    if (event.action === 'close') {
      event.notification.close();
    } else if (event.action === 'open') {
      const urlToOpen = event.notification.data?.actionUrl || '/';
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].url === urlToOpen && 'focus' in clientList[i]) {
              return clientList[i].focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    }
  }
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activated');
  event.waitUntil(clients.claim());
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installed');
  self.skipWaiting();
});

/**
 * Handle messages from clients (web pages)
 */
self.addEventListener('message', (event) => {
  console.log('💬 Message from client:', event.data);

  if (event.data && event.data.type === 'GET_NOTIFICATIONS') {
    // Can be used to get notification history from IndexedDB
    event.ports[0].postMessage({
      type: 'NOTIFICATIONS_LIST',
      data: [], // Implement based on your needs
    });
  }
});
