import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy all API requests to the backend
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
        // Remove /api prefix when forwarding to backend if needed
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Also proxy auth routes for GitHub OAuth
      '/auth': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false
      }
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'rabbit-fleet-midge.ngrok-free.app',
      '.ngrok-free.app', // This will allow all ngrok-free.app subdomains
    ]
  }
})