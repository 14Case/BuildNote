import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    pool: 'forks',
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
