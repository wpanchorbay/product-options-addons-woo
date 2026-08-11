import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, setTargetedProduct, saveGroup, FIELD_BUTTON } from './builder';

test.describe('Assignment rules (Free: global / specific product)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Targeted group shows only on the chosen product', async ({ page }) => {
    const log = new TestLogger('assignment.spec.ts', 'Targeted product');
    log.start();
    await openNewGroup(page, `Targeted ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Only On A');
    await setTargetedProduct(page, 'Product A');
    await saveGroup(page);

    log.step(1, 'Visible on Product A');
    await page.goto('/product/product-a/');
    await expect(page.locator('form.cart input[name^="opopw_addons["]').first()).toBeVisible({ timeout: 20000 });

    log.step(2, 'Absent on Product B');
    await page.goto('/product/product-b/');
    await page.waitForSelector('form.cart', { timeout: 20000 });
    await expect(page.locator('form.cart input[name^="opopw_addons["]')).toHaveCount(0);
    log.end('passed');
  });

  test('Global group shows on every product', async ({ page }) => {
    const log = new TestLogger('assignment.spec.ts', 'Global');
    log.start();
    await openNewGroup(page, `Global ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Everywhere');
    await setGlobal(page);
    await saveGroup(page);

    for (const slug of ['product-a', 'product-d']) {
      await page.goto(`/product/${slug}/`);
      await expect(page.locator('form.cart input[name^="opopw_addons["]').first()).toBeVisible({ timeout: 20000 });
    }
    log.end('passed');
  });
});
