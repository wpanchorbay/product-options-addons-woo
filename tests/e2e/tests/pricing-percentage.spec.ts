import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldPercentage, FIELD_BUTTON } from './builder';

test.describe('Percentage-of-base pricing', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('10% of base adds to total → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('pricing-percentage.spec.ts', `Percentage [${renderMode}]`);
    log.start();
    await log.step(page, 1, 'Create global group, Text field, Percentage 10%');
    await openNewGroup(page, `Pct ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Premium Finish');
    await setFieldPercentage(page, '10');
    await setGlobal(page);
    await saveGroup(page);

    // Product C base is 75 → +10% (7.50) = 82.50.
    await log.step(page, 2, 'On Product C, enter text → live total 82.50');
    await page.goto('/product/product-c/');
    const field = page.locator('form.cart input[name^="opopw_addons["]').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('Gloss');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('82.5', { timeout: 10000 });

    await log.step(page, 3, 'Add to cart + verify cart shows add-on');
    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Premium Finish', total: '82.5' });
    log.end('passed');
  });
});
