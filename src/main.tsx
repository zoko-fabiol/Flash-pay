import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorkerUtils'

// Service Worker for OneSignal is handled automatically by the OneSignal SDK
// No need for manual registration here anymore.

import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
