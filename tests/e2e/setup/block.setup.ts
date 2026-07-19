import { test } from '@playwright/test';
import { setupForMode } from './store-setup';

// Runs after the `classic` project, before the `block` project: switch to a
// block theme and convert Cart/Checkout to WooCommerce blocks.
test('block setup', async () => {
  test.setTimeout(300000);
  await setupForMode('block');
});
