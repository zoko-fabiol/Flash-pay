import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Flash Pay',
        short_name: 'Flash Pay',
        description: 'Envoi d\'argent rapide et sécurisé vers l\'Afrique',
        theme_color: '#661489',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        id: '/',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/storage-proxy': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage-proxy/, ''),
        secure: true,
      },
      '/__/auth': {
        target: 'https://flash-pay-937d7.firebaseapp.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
