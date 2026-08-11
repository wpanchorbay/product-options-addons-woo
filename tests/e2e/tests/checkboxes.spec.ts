import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import {
  openNewGroup, addField, setFieldLabel, setGlobal, saveGroup,
  setChoiceLabel, addChoice, priceChoiceFlat, FIELD_BUTTON,
} from './builder';

test.describe('Checkboxes (multi) lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('checkboxes.spec.ts', 'Admin persistence');
    log.start();
    await openNewGroup(page, `Checkboxes ${Date.now()}`);
    await addField(page, FIELD_BUTTON.checkbox);
    await setFieldLabel(page, 'Add-ons');
    await setChoiceLabel(page, 1, 'Engrave');
    await setGlobal(page);
    await saveGroup(page);
    await page.reload();
    await page.locator('span:has-text("Add-ons")').click();
    await expect(page.locator('input[placeholder="Choice Label"]').first()).toHaveValue('Engrave');
    log.end('passed');
  });

  test('Multiple priced choices sum → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('checkboxes.spec.ts', `Priced choices [${renderMode}]`);
    log.start();
    await openNewGroup(page, `Checkboxes Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.checkbox);
    await setFieldLabel(page, 'Extras');
    await setChoiceLabel(page, 1, 'Gift Wrap');
    await priceChoiceFlat(page, 1, '5');
    await addChoice(page);
    await setChoiceLabel(page, 2, 'Rush');
    await priceChoiceFlat(page, 2, '10');
    await setGlobal(page);
    const groupId = await saveGroup(page);

    await page.goto('/product/product-a/');
    // Target by visible option label (value slugs are auto-derived; label is stable).
    const c1 = page.locator('form.cart label').filter({ hasText: 'Gift Wrap' }).locator('input[type="checkbox"]');
    const c2 = page.locator('form.cart label').filter({ hasText: 'Rush' }).locator('input[type="checkbox"]');
    const liveTotal = page.locator('form.cart .opopw-live-total .amount').first();
    await expect(c1).toBeVisible({ timeout: 20000 });
    await c1.check();
    await expect(liveTotal).toContainText('105', { timeout: 10000 });
    await c2.check();
    await expect(liveTotal).toContainText('115', { timeout: 10000 });

    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Extras', total: '115' });
    log.end('passed');
  });
});
