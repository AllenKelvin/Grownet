import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function startApiServer() {
  return {
    name: 'start-api-server',
    configureServer(server) {
      // Only start once
      if (globalThis.__API_STARTED) return
      globalThis.__API_STARTED = true
      import('./server/index.js')
        .then(() => console.log('[vite-plugin] API server started'))
        .catch((err) => console.error('[vite-plugin] API failed to start:', err))
    },
  }
}

export default defineConfig({
  plugins: [react(), startApiServer()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
