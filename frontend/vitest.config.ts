import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // JSX in .tsx files (tsconfig keeps "jsx": "preserve" for Next, so tell esbuild explicitly)
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // each test file gets fresh module state (SWR cache, api.ts auth timestamp, ...)
    isolate: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
