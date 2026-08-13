import { test } from '@playwright/test';
import { setupForMode, togglePlugin, PRO_PLUGIN_SLUG } from './store-setup';
import { printEnvironmentDiagnostics } from '../tests/test-logger';

// Runs once before the `classic` project: seed store data, activate Storefront,
// and switch Cart/Checkout to classic shortcode pages.
test('classic setup', async () => {
  test.setTimeout(420000);
  printEnvironmentDiagnostics();
  // qit.json provisions Pro alongside Free so the pro-* phases can activate it
  // later, but QIT may auto-activate every listed plugin at env boot — force
  // it off here so the free-only phase always starts from a clean baseline.
  await togglePlugin(PRO_PLUGIN_SLUG, false);
  await setupForMode('classic');
});
