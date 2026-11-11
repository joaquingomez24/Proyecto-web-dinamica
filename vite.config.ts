import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // En desarrollo, /api y el panel /admin van a la API de Express + MySQL (servidor/, puerto 3005)
  server: {
    proxy: { '/api': 'http://127.0.0.1:3005', '/admin': 'http://127.0.0.1:3005' },
  },
})
