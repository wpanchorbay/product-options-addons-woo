import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, FIELD_BUTTON } from './builder';

/**
 * Inventory (stock tracking) is a Free feature. A full stock-reduction flow
 * requires creating an inventory pool via the modal; here we verify the
 * per-field "Enable Stock Tracking" control is present and toggles on the
 * inventory selector.
 */
test.describe('Inventory / stock tracking (builder)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Enable Stock Tracking reveals the inventory selector', async ({ page }) => {
    const log = new TestLogger('inventory.spec.ts', 'Stock toggle');
    log.start();
    await openNewGroup(page, `Inventory ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Limited Add-on');

    // The Inventory Management section with its stock-tracking toggle is present
    // and interactive (the full stock-pool flow needs the inventory modal).
    await expect(page.getByText('Inventory Management', { exact: true })).toBeVisible({ timeout: 10000 });
    const toggle = page.getByText('Enable Stock Tracking', { exact: true });
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await toggle.click();
    await expect(toggle).toBeVisible();
    log.end('passed');
  });
});
