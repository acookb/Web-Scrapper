import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
    env: { VITE_API_BASE_URL: 'http://api.test' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
      reporter: ['text', 'text-summary', 'lcov'],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
    },
  },
})
