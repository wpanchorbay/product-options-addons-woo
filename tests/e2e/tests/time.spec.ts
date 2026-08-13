import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Time Picker lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('time.spec.ts', 'Admin persistence');
    log.start();
    await log.step(page, 1, 'Open builder, add Time Picker field');
    await openNewGroup(page, `Time ${Date.now()}`);
    await addField(page, FIELD_BUTTON.time);
    await setFieldLabel(page, 'Pickup Time');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Reload + verify persistence');
    await page.reload();
    await page.locator('span:has-text("Pickup Time")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Pickup Time');
    log.end('passed');
  });

  test('Flat-fee with time value → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('time.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await log.step(page, 1, 'Create global group, Time Picker with Flat Fee $8');
    await openNewGroup(page, `Time Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.time);
    await setFieldLabel(page, 'Pickup Time');
    await setFieldFlatFee(page, '8');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'On product-c, enter time → live total 83');
    await page.goto('/product/product-c/');
    const field = page.locator('form.cart input.opopw-input--time').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('14:30');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('83', { timeout: 10000 });

    await log.step(page, 3, 'Add to cart + verify cart shows add-on');
    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Pickup Time', total: '83' });
    log.end('passed');
  });
});
