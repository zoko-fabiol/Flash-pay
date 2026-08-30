import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Service Worker for OneSignal is handled automatically by the OneSignal SDK
// No need for manual registration here anymore.

// Register PWA service worker
registerSW({ immediate: true })

// Redirect legacy /signup URLs (from old referral links) to use HashRouter
if (window.location.pathname === '/signup') {
  window.location.replace(`/#/signup${window.location.search}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
