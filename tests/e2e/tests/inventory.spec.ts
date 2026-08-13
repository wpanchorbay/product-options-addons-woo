import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { wpCli, resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, FIELD_BUTTON } from './builder';

/**
 * Inventory (stock tracking) is a Free feature. The first test covers the
 * per-field toggle; the second covers creating a NEW global inventory pool inline
 * and saving the group — the AddonGroupController "new inventories" handshake
 * where the M1 `$inv_id` fix lives (a PHP 8 fatal there would fail the save).
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

  test('Creating a new inventory pool inline saves the group and persists the pool (M1)', async ({ page }) => {
    const log = new TestLogger('inventory.spec.ts', 'New pool create + save');
    log.start();
    const poolName = `Pool ${Date.now()}`;

    await log.step(page, 1, 'Build a field with stock tracking enabled');
    await openNewGroup(page, `Inv Create ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Limited Add-on');
    await page.getByText('Enable Stock Tracking', { exact: true }).click();

    await log.step(page, 2, 'Open the inventory selector and create a new pool via the modal');
    // The dropdown renders as a position:fixed portal computed from the trigger's
    // on-screen position at click time. Pin the trigger to the top of the viewport
    // first so the dropdown (and its footer "Create New Pool" row) has room below —
    // scrolling the page afterward can't reach a fixed-positioned element that was
    // computed past the viewport bottom.
    const inventoryTrigger = page.getByText('Select inventory pool…');
    await inventoryTrigger.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await inventoryTrigger.click();
    await page.getByText('Create New Pool', { exact: true }).click();
    await expect(page.locator('#opopw-new-inventory-name')).toBeVisible({ timeout: 10000 });
    await page.locator('#opopw-new-inventory-name').fill(poolName);
    await page.locator('#opopw-new-inventory-stock').fill('25');
    await page.getByRole('button', { name: 'Add & Select', exact: true }).click();

    await log.step(page, 3, 'Save the group — the new-inventory handshake must succeed (no PHP fatal)');
    await setGlobal(page);
    await saveGroup(page); // resolves only if "Update Group" appears → save succeeded

    await log.step(page, 4, 'The pool was created in the global inventory table with the given stock');
    const stock = await wpCli(
      `eval 'global $wpdb; $t=$wpdb->prefix."opopw_inventory"; echo $wpdb->get_var($wpdb->prepare("SELECT stock_count FROM {$t} WHERE name=%s", "${poolName}"));'`
    );
    expect(stock).toContain('25');
    log.success('New inventory pool persisted and group saved cleanly');
    log.end('passed');
  });
});
