import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, setFieldFlatFee, FIELD_BUTTON } from './builder';

test.describe('Textarea lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('textarea.spec.ts', 'Admin persistence');
    log.start();
    await openNewGroup(page, `Textarea ${Date.now()}`);
    await addField(page, FIELD_BUTTON.textarea);
    await setFieldLabel(page, 'Gift Note');
    await setGlobal(page);
    await saveGroup(page);
    await page.reload();
    await page.locator('span:has-text("Gift Note")').click();
    await expect(page.locator('input[placeholder*="field label"]')).toHaveValue('Gift Note');
    log.end('passed');
  });

  test('Flat-fee pricing → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('textarea.spec.ts', `Flat fee [${renderMode}]`);
    log.start();
    await openNewGroup(page, `Textarea Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.textarea);
    await setFieldLabel(page, 'Gift Note');
    await setFieldFlatFee(page, '10');
    await setGlobal(page);
    await saveGroup(page);

    await page.goto('/product/product-c/');
    const field = page.locator('form.cart textarea[name^="opopw_addons["]').first();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.fill('Happy birthday');
    await expect(page.locator('form.cart .opopw-live-total .amount').first()).toContainText('85', { timeout: 10000 });

    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Gift Note', value: 'Happy birthday', total: '85' });
    log.end('passed');
  });
});
