import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import {
  openNewGroup, addField, setFieldLabel, setGlobal, saveGroup,
  setChoiceLabel, addChoice, priceChoiceFlat, FIELD_BUTTON,
} from './builder';

test.describe('Dropdown (select) lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('select.spec.ts', 'Admin persistence');
    log.start();
    await log.step(page, 1, 'Open builder, add Dropdown field with choice');
    await openNewGroup(page, `Dropdown ${Date.now()}`);
    await addField(page, FIELD_BUTTON.select);
    await setFieldLabel(page, 'Select Size');
    await setChoiceLabel(page, 1, 'Small');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Reload + verify persistence');
    await page.reload();
    await page.locator('span:has-text("Select Size")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Select Size');
    await expect(page.locator('input[placeholder="Choice Label"]').first()).toHaveValue('Small');
    log.end('passed');
  });

  test('Priced choice → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('select.spec.ts', `Priced choice [${renderMode}]`);
    log.start();
    await log.step(page, 1, 'Create global group, Dropdown field with priced choice');
    await openNewGroup(page, `Dropdown Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.select);
    await setFieldLabel(page, 'Size');
    await setChoiceLabel(page, 1, 'Standard');
    await addChoice(page);
    await setChoiceLabel(page, 2, 'Large');
    await priceChoiceFlat(page, 2, '5');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'On product-a, select Large choice → live total 105');
    await page.goto('/product/product-a/');
    const dropdown = page.locator('form.cart select.opopw-input--select').last();
    await expect(dropdown).toBeVisible({ timeout: 20000 });
    await dropdown.selectOption({ label: 'Large (+ $5.00)' });
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('105', { timeout: 10000 });

    await log.step(page, 3, 'Add to cart + verify cart shows add-on');
    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Size', value: 'Large', total: '105' });
    log.end('passed');
  });
});
