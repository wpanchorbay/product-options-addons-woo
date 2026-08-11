import { test } from '@playwright/test';
import { setupForMode } from './store-setup';
import { printEnvironmentDiagnostics } from '../tests/test-logger';

// Runs once before the `classic` project: seed store data, activate Storefront,
// and switch Cart/Checkout to classic shortcode pages.
test('classic setup', async () => {
  test.setTimeout(420000);
  printEnvironmentDiagnostics();
  await setupForMode('classic');
});
