import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // e2e/ son specs de Playwright (npm run test:e2e), no de Vitest: sin
    // este exclude, Vitest tambien los recoge por el patron *.spec.ts y
    // falla al importar '@playwright/test'.
    exclude: ['**/node_modules/**', '**/dist/**', './e2e/**'],
    env: {
      VITE_API_URL: 'http://localhost:5004',
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
