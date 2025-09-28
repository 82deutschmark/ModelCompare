/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28 14:30:00
 * PURPOSE: Vitest configuration for health check test suite with proper ES modules support
 * SRP and DRY check: Pass - Single responsibility for test configuration
 * shadcn/ui: Pass - No UI components needed in test configuration
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    testTimeout: 660000, // 11 minutes to allow for 10-minute model timeouts plus buffer
    hookTimeout: 30000,
    teardownTimeout: 30000,
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './reports/test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@client': path.resolve(__dirname, './client/src')
    }
  },
  esbuild: {
    target: 'node18'
  }
});