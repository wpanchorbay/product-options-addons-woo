import { test, expect } from '../fixtures';
import { expectCartShowsAddon, addToCart } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';

test.describe('Text Input End-to-End lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    const log = new TestLogger('text-input.spec.ts', 'beforeEach');
    await resetOptionGroups();
    await login(page, log);
  });

  test('A. Admin: validation & persistence', async ({ page }) => {
    const log = new TestLogger('text-input.spec.ts', 'A. Admin');
    log.start();
    try {
      log.step(1, 'Open builder, add Text Input');
      await page.goto('/wp-admin/edit.php?post_type=product&page=opopw-options');
      await page.click('a.page-title-action:has-text("Add new group")');
      await page.fill('input[placeholder*="Group Title"]', `Validation Group ${Date.now()}`);
      await page.click('button:has-text("Text Input")');
      await page.waitForSelector('.opopw-skeleton-builder', { state: 'detached' });

      const labelInput = page.locator('input[placeholder*="field label"]');
      await expect(labelInput).toBeVisible();

      log.step(2, 'Blank label triggers validation error');
      await labelInput.fill('');
      await page.click('button:has-text("Create Group")');
      await expect(page.locator('body')).toContainText('Field label is required', { timeout: 10000 });

      log.step(3, 'Fill settings + save (global)');
      await labelInput.fill('Personal Message');
      await page.locator('textarea[placeholder*="Help text"]').fill('Maximum 50 characters');
      await page.locator('tr:has-text("Placeholder") input').fill('Type your name...');
      await page.getByText('Apply to all products', { exact: true }).click();
      await page.waitForTimeout(400);
      await page.click('button:has-text("Create Group")');
      await expect(page.locator('button:has-text("Update Group")')).toBeVisible({ timeout: 15000 });

      log.step(4, 'Reload + verify persistence');
      await page.reload();
      await page.locator('span:has-text("Personal Message")').click();
      await expect(labelInput).toHaveValue('Personal Message');
      await expect(page.locator('textarea[placeholder*="Help text"]')).toHaveValue('Maximum 50 characters');
      log.success('Persisted');
      log.end('passed');
    } catch (err) {
      await log.snapshot(page, 'failure');
      log.error('Test failed', { message: (err as Error).message });
      log.end('failed');
      throw err;
    }
  });

  test('B. Flat-fee pricing → frontend + cart', async ({ page, renderMode }) => {
    const log = new TestLogger('text-input.spec.ts', `B. Flat Fee [${renderMode}]`);
    log.start();
    try {
      log.step(1, 'Create global group, Text Input, Flat Fee $15');
      await page.goto('/wp-admin/edit.php?post_type=product&page=opopw-options');
      await page.click('a.page-title-action:has-text("Add new group")');
      await page.fill('input[placeholder*="Group Title"]', `Flat Fee Group ${Date.now()}`);
      await page.click('button:has-text("Text Input")');
      await page.waitForSelector('.opopw-skeleton-builder', { state: 'detached' });
      await page.locator('input[placeholder*="field label"]').fill('Engraving');

      const pricingRow = page.locator('tr:has-text("Pricing Logic")');
      await pricingRow.locator('[role="combobox"]').click();
      await page.locator('ul[role="listbox"] li').filter({ hasText: 'Flat Fee' }).click();
      await page.locator('tr:has-text("Price Amount") input').fill('15.00');

      await page.getByText('Apply to all products', { exact: true }).click();
      await page.waitForTimeout(400);
      await page.click('button:has-text("Create Group")');
      await expect(page.locator('button:has-text("Update Group")')).toBeVisible({ timeout: 15000 });

      log.divider('Frontend');
      log.step(2, 'On Product C, enter text → live total 75 + 15 = 90');
      await page.goto('/product/product-c/');
      const addon = page.locator('form.cart input[name^="opopw_addons["]').first();
      await expect(addon).toBeVisible({ timeout: 20000 });
      const liveTotal = page.locator('form.cart .opopw-live-total .amount').first();
      await addon.fill('Hello');
      await expect(liveTotal).toContainText('90', { timeout: 10000 });

      log.step(3, 'Add to cart + verify cart shows add-on');
      await addToCart(page);
      await expectCartShowsAddon(page, renderMode, { label: 'Engraving', value: 'Hello', total: '90' });
      log.success('Cart shows engraving + total');
      log.end('passed');
    } catch (err) {
      await log.snapshot(page, 'failure');
      log.error('Test failed', { message: (err as Error).message });
      log.end('failed');
      throw err;
    }
  });
});
