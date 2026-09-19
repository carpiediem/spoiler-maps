/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/spoiler-maps/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Vendor libraries change far less often than app code, so giving
        // them their own chunks lets returning visitors keep them cached
        // across deploys (GitHub Pages' own cache headers are the only ones
        // available, and they're keyed on the hashed filename).
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
            },
            { name: 'mui', test: /node_modules[\\/](@mui|@emotion)[\\/]/ },
            {
              name: 'leaflet',
              test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/,
            },
            { name: 'sqljs', test: /node_modules[\\/]sql\.js[\\/]/ },
          ],
        },
      },
    },
  },
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
    // Runs afterEach hooks in the order they were registered, instead of
    // reversed. Testing Library's automatic unmount-on-cleanup is registered
    // first (in setupTests.ts), so it now runs before each test file's own
    // afterEach — which awaits deleting the IndexedDB database. Otherwise
    // components stay mounted during that await, and any async work still
    // in flight (a blur-triggered save, a data load) updates state outside
    // act(), logging "not wrapped in act(...)" warnings on slower runners.
    sequence: { hooks: 'list' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/theme.ts', 'src/**/*.test.{ts,tsx}'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
