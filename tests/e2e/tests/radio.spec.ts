import { test, expect, addToCart, expectCartShowsAddon } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import {
  openNewGroup, addField, setFieldLabel, setGlobal, saveGroup,
  setChoiceLabel, addChoice, priceChoiceFlat, FIELD_BUTTON,
} from './builder';

test.describe('Radio Buttons lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence', async ({ page }) => {
    const log = new TestLogger('radio.spec.ts', 'Admin persistence');
    log.start();
    await log.step(page, 1, 'Open builder, add Radio Buttons field + choice, save (global)');
    await openNewGroup(page, `Radio ${Date.now()}`);
    await addField(page, FIELD_BUTTON.radio);
    await setFieldLabel(page, 'Material');
    await setChoiceLabel(page, 1, 'Metal');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Reload + verify persistence');
    await page.reload();
    await page.locator('span:has-text("Material")').click();
    await expect(page.locator('input[placeholder="Choice Label"]').first()).toHaveValue('Metal');
    log.end('passed');
  });

  test('Priced choices → cart', async ({ page, renderMode }) => {
    const log = new TestLogger('radio.spec.ts', `Priced choices [${renderMode}]`);
    log.start();
    await log.step(page, 1, 'Create global group, Radio field, two priced choices ($10/$20)');
    await openNewGroup(page, `Radio Fee ${Date.now()}`);
    await addField(page, FIELD_BUTTON.radio);
    await setFieldLabel(page, 'Material');
    await setChoiceLabel(page, 1, 'Wood');
    await priceChoiceFlat(page, 1, '10');
    await addChoice(page);
    await setChoiceLabel(page, 2, 'Metal');
    await priceChoiceFlat(page, 2, '20');
    await setGlobal(page);
    const groupId = await saveGroup(page);

    await log.step(page, 2, 'On Product A, select each choice → live total updates');
    await page.goto('/product/product-a/');
    const wood = page.locator(`form.cart input[type="radio"][name^="opopw_addons[${groupId}]"][value="wood"]`);
    const metal = page.locator(`form.cart input[type="radio"][name^="opopw_addons[${groupId}]"][value="metal"]`);
    const liveTotal = page.locator('form.cart .opopw-live-total .amount').first();
    await expect(wood).toBeVisible({ timeout: 20000 });
    await wood.check();
    await expect(liveTotal).toContainText('110', { timeout: 10000 });
    await metal.check();
    await expect(liveTotal).toContainText('120', { timeout: 10000 });

    await log.step(page, 3, 'Add to cart + verify cart shows priced choice');
    await addToCart(page);
    await expectCartShowsAddon(page, renderMode, { label: 'Material', value: 'Metal', total: '120' });
    log.end('passed');
  });
});
