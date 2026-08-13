import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Email field lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('email.spec.ts', 'Admin persistence');
    log.start();
    await log.step(page, 1, 'Open builder, add Email field');
    await openNewGroup(page, `Email ${Date.now()}`);
    await addField(page, FIELD_BUTTON.email);
    await setFieldLabel(page, 'Notify Email');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Reload + verify persistence');
    await page.reload();
    await page.locator('span:has-text("Notify Email")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Notify Email');
    log.end('passed');
  });

  test('Flat-fee pricing with valid email → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('email.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await log.step(page, 1, 'Build Email field with Flat Fee $5');
    await openNewGroup(page, `Email Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.email);
    await setFieldLabel(page, 'Gift Email');
    await setFieldFlatFee(page, '5');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'On Product C, enter valid email → live total 75 + 5 = 80');
    await page.goto('/product/product-c/');
    const field = page.locator('form.cart input[name^="opopw_addons["]').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('gift@example.com');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('80', { timeout: 10000 });

    await log.step(page, 3, 'Add to cart + verify cart shows add-on');
    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Gift Email', value: 'gift@example.com', total: '80' });
    log.end('passed');
  });
});
