import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Date Picker lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('date.spec.ts', 'Admin persistence');
    log.start();
    await openNewGroup(page, `Date ${Date.now()}`);
    await addField(page, FIELD_BUTTON.date);
    await setFieldLabel(page, 'Delivery Date');
    await setGlobal(page);
    await saveGroup(page);
    await page.reload();
    await page.locator('span:has-text("Delivery Date")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Delivery Date');
    log.end('passed');
  });

  test('Flat-fee with date value → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('date.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await openNewGroup(page, `Date Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.date);
    await setFieldLabel(page, 'Delivery Date');
    await setFieldFlatFee(page, '8');
    await setGlobal(page);
    await saveGroup(page);

    await page.goto('/product/product-c/');
    const field = page.locator('form.cart input.opopw-input--date').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('2026-08-15');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('83', { timeout: 10000 });

    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Delivery Date', total: '83' });
    log.end('passed');
  });
});
