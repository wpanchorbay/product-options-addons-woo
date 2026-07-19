import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Single Checkbox (toggle) lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('single-checkbox.spec.ts', 'Admin persistence');
    log.start();
    await openNewGroup(page, `Toggle ${Date.now()}`);
    await addField(page, FIELD_BUTTON.single_checkbox);
    await setFieldLabel(page, 'Gift Wrap');
    await setGlobal(page);
    await saveGroup(page);
    await page.reload();
    await page.locator('span:has-text("Gift Wrap")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Gift Wrap');
    log.end('passed');
  });

  test('Flat-fee toggle → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('single-checkbox.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await openNewGroup(page, `Toggle Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.single_checkbox);
    await setFieldLabel(page, 'Gift Wrap');
    await setFieldFlatFee(page, '5');
    await setGlobal(page);
    const groupId = await saveGroup(page);

    await page.goto('/product/product-a/');
    const toggle = page.locator(`form.cart input[type="checkbox"][name^="opopw_addons[${groupId}]"]`).first();
    const liveTotal = page.locator('form.cart .opopw-live-total .amount').first();
    await expect(toggle).toBeVisible({ timeout: 20000 });
    await toggle.check();
    await expect(liveTotal).toContainText('105', { timeout: 10000 });

    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Gift Wrap', total: '105' });
    log.end('passed');
  });
});
