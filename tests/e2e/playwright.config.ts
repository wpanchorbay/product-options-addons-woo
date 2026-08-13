import { defineConfig } from '@playwright/test';
import type { RenderMode } from './fixtures';

// QIT assigns a random port per `env:up`, so there is no sane default here.
// Fail fast if WP_URL is unset rather than silently targeting a dead port.
const baseURL = process.env.WP_URL;
if (!baseURL) {
  throw new Error(
    'WP_URL is not set. Source a QIT environment first, e.g.:\n' +
    '  source "$(qit env:source)" && export WP_URL="$QIT_BASE_URL"'
  );
}

export default defineConfig<{ renderMode: RenderMode }>({
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
    // Screenshots are captured explicitly per-step by TestLogger.step() (and on
    // failure by the afterEach hook in fixtures.ts) into one flat screenshots/
    // folder — not by Playwright's own per-test-subfolder mechanism.
    screenshot: 'off',
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
    // Phase 2 — block theme (block cart/checkout).
    //
    // Depends on `classic-setup` (needs seeded store data), NOT on `classic`
    // (the 54 free-classic tests). Depending on the full test project would
    // make `--project=block` transitively re-run all of `classic` first —
    // defeating single-phase invocations (used to isolate a phase's ~55 tests
    // into their own process on memory-constrained machines). In a single
    // unfiltered `npx playwright test` run, project declaration order below
    // still keeps phases running classic → block → pro-classic → pro-block.
    {
      name: 'block-setup',
      testDir: './setup',
      testMatch: /block\.setup\.ts/,
      dependencies: ['classic-setup'],
    },
    {
      name: 'block',
      testDir: './tests',
      dependencies: ['block-setup'],
      use: { renderMode: 'block' },
    },
    // Phase 3 — activate Pro, re-run the SAME spec files as a Free+Pro
    // regression pass (classic theme). Same reasoning: depends only on
    // classic-setup's seeded store, not on the block/classic TEST projects.
    {
      name: 'pro-setup',
      testDir: './setup',
      testMatch: /pro\.setup\.ts/,
      dependencies: ['classic-setup'],
    },
    {
      name: 'pro-classic',
      testDir: './tests',
      dependencies: ['pro-setup'],
      use: { renderMode: 'classic' },
    },
    // Phase 4 — same regression pass under the block theme. Depends on
    // `pro-setup` (cheap, 1 test — activates Pro), NOT `pro-classic` (the full
    // 54-test project), for the same isolation reasoning as above; Pro must
    // already be active for this phase to mean anything.
    {
      name: 'pro-block-setup',
      testDir: './setup',
      testMatch: /block\.setup\.ts/,
      dependencies: ['pro-setup'],
    },
    {
      name: 'pro-block',
      testDir: './tests',
      dependencies: ['pro-block-setup'],
      use: { renderMode: 'block' },
    },
  ],
});
