import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merge base Vite config with Vitest-specific configuration
export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
}));