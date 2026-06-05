import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9801,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:9802',
        changeOrigin: true,
      },
    },
  },
})
