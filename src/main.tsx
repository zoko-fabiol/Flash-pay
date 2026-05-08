import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorkerUtils'

// Register Service Worker for push notifications
if ('serviceWorker' in navigator) {
  registerServiceWorker()
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('❌ Service Worker registration failed:', err))
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
