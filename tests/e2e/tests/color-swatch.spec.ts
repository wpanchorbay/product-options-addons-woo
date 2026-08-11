import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import {
  openNewGroup, addField, setFieldLabel, setGlobal, saveGroup,
  setChoiceLabel, addChoice, priceChoiceFlat, FIELD_BUTTON,
} from './builder';

test.describe('Color Swatch lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('color-swatch.spec.ts', 'Admin persistence');
    log.start();
    await openNewGroup(page, `Color ${Date.now()}`);
    await addField(page, FIELD_BUTTON.color_swatch);
    await setFieldLabel(page, 'Frame Color');
    await setChoiceLabel(page, 1, 'Black');
    await setGlobal(page);
    await saveGroup(page);
    await page.reload();
    await page.locator('span:has-text("Frame Color")').click();
    await expect(page.locator('input[placeholder="Choice Label"]').first()).toHaveValue('Black');
    log.end('passed');
  });

  test('Priced swatch → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('color-swatch.spec.ts', `Priced swatch [${renderMode}]`);
    log.start();
    await openNewGroup(page, `Color Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.color_swatch);
    await setFieldLabel(page, 'Frame Color');
    await setChoiceLabel(page, 1, 'Black');
    await addChoice(page);
    await setChoiceLabel(page, 2, 'Gold');
    await priceChoiceFlat(page, 2, '15');
    await setGlobal(page);
    await saveGroup(page);

    await page.goto('/product/product-a/');
    // Swatch radios are visually hidden — click the swatch label instead.
    const goldOption = page.locator('form.cart .opopw-swatch-option').filter({
      has: page.locator('input.opopw-swatch-input[value="gold"]'),
    });
    const liveTotal = page.locator('form.cart .opopw-live-total .amount').first();
    await expect(goldOption).toBeVisible({ timeout: 20000 });
    await goldOption.locator('label.opopw-swatch-label').click();
    await expect(liveTotal).toContainText('115', { timeout: 10000 });

    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Frame Color', value: 'Gold', total: '115' });
    log.end('passed');
  });
});
