import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use relative paths for Capacitor compatibility
  base: './',
  build: {
    // Sourcemaps disabled in production for security
    sourcemap: false,
  }
})
