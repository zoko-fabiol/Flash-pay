import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    },
  },
})
