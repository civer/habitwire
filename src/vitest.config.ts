import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    globals: true,
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@server': resolve(__dirname, './server'),
      '~~': resolve(__dirname, '.')
    }
  }
})
