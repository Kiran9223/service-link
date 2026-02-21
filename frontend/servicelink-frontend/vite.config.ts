import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fix for SockJS ESM compatibility issue with Vite
      'global': 'globalThis',
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Spring Boot during development
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Proxy WebSocket connection
      '/ws': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  define: {
    // Required for SockJS to work in Vite's ESM environment
    global: 'globalThis',
  },
})
