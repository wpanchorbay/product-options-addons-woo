import { test } from '@playwright/test';
import { setupForMode, togglePlugin, PRO_PLUGIN_SLUG } from './store-setup';

// Runs after the free-only `classic` + `block` phases complete: activate the
// Pro add-on, then switch back to the classic theme/pages (the preceding
// `block` phase left block mode active) so `pro-classic` starts from the same
// clean state `classic` did. The subsequent `pro-block-setup` project reuses
// block.setup.ts to switch to block mode again, now with Pro active.
test('pro setup', async () => {
  test.setTimeout(300000);
  await togglePlugin(PRO_PLUGIN_SLUG, true);
  await setupForMode('classic');
});
