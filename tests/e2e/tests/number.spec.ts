import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Number field lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('number.spec.ts', 'Admin persistence');
    log.start();
    await openNewGroup(page, `Number ${Date.now()}`);
    await addField(page, FIELD_BUTTON.number);
    await setFieldLabel(page, 'Quantity Extra');
    await setGlobal(page);
    await saveGroup(page);
    await page.reload();
    await page.locator('span:has-text("Quantity Extra")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Quantity Extra');
    log.end('passed');
  });

  test('Flat-fee pricing → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('number.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await openNewGroup(page, `Number Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.number);
    await setFieldLabel(page, 'Extra Units');
    await setFieldFlatFee(page, '20');
    await setGlobal(page);
    await saveGroup(page);

    await page.goto('/product/product-c/');
    const field = page.locator('form.cart input[name^="opopw_addons["]').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('3');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('95', { timeout: 10000 });

    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Extra Units', total: '95' });
    log.end('passed');
  });
});
