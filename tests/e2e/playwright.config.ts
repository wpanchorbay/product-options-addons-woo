import { defineConfig } from '@playwright/test';

// QIT assigns a random port per `env:up`, so there is no sane default here.
// Fail fast if WP_URL is unset rather than silently targeting a dead port.
const baseURL = process.env.WP_URL;
if (!baseURL) {
  throw new Error(
    'WP_URL is not set. Source a QIT environment first, e.g.:\n' +
    '  source "$(qit env:source)" && export WP_URL="$QIT_BASE_URL"'
  );
}

export default defineConfig({
  globalSetup: './global-setup.ts',
  reporter: [
    ['list'],
    ['playwright-ctrf-json-reporter', { outputFile: 'ctrf.json', outputDir: './test-results' }]
  ],
  // Serial: theme switching and shared store data make parallelism unsafe.
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
  },
  projects: [
    // Phase 1 — classic theme (shortcode cart/checkout).
    {
      name: 'classic-setup',
      testDir: './setup',
      testMatch: /classic\.setup\.ts/,
    },
    {
      name: 'classic',
      testDir: './tests',
      dependencies: ['classic-setup'],
      use: { renderMode: 'classic' },
    },
    // Phase 2 — block theme (block cart/checkout). Runs after classic completes.
    {
      name: 'block-setup',
      testDir: './setup',
      testMatch: /block\.setup\.ts/,
      dependencies: ['classic'],
    },
    {
      name: 'block',
      testDir: './tests',
      dependencies: ['block-setup'],
      use: { renderMode: 'block' },
    },
  ],
});
