import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Date & Time lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('datetime.spec.ts', 'Admin persistence');
    log.start();
    await log.step(page, 1, 'Open builder, add Date & Time field');
    await openNewGroup(page, `DateTime ${Date.now()}`);
    await addField(page, FIELD_BUTTON.datetime);
    await setFieldLabel(page, 'Appointment');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Reload + verify persistence');
    await page.reload();
    await page.locator('span:has-text("Appointment")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Appointment');
    log.end('passed');
  });

  test('Flat-fee with datetime value → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('datetime.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await log.step(page, 1, 'Build Date & Time with Flat Fee $8');
    await openNewGroup(page, `DateTime Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.datetime);
    await setFieldLabel(page, 'Appointment');
    await setFieldFlatFee(page, '8');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'On Product C, pick a datetime → live total 75 + 8 = 83');
    await page.goto('/product/product-c/');
    const field = page.locator('form.cart input.opopw-input--datetime').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('2026-08-15T14:30');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('83', { timeout: 10000 });

    await log.step(page, 3, 'Add to cart + verify cart shows add-on');
    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Appointment', total: '83' });
    log.end('passed');
  });
});
