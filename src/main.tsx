import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorkerUtils'

// Service Worker for OneSignal is handled automatically by the OneSignal SDK
// No need for manual registration here anymore.



// Redirect legacy /signup URLs (from old referral links) to use HashRouter
if (window.location.pathname === '/signup') {
  window.location.replace(`/#/signup${window.location.search}`);
}

// Automatically unregister all active Service Workers to clear PWA cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('[PWA] Service Worker successfully unregistered.');
    }
  }).catch((err) => {
    console.error('[PWA] Failed to unregister Service Workers:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
