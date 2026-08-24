/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/spoiler-maps/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    // The default 5s is comfortable locally but flaky in CI — GitHub's
    // shared runners are markedly slower, and coverage instrumentation
    // (npm run test:coverage, what CI actually runs) adds further overhead
    // on top of that. The heavier App-level tests (full render: router,
    // Leaflet map, IndexedDB) are the ones that occasionally trip the
    // default there. This doesn't mask a real hang — a genuinely broken
    // test still fails, just after a longer wait.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/theme.ts', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
