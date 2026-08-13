import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    const log = new TestLogger('smoke.spec.ts', 'beforeEach');
    await login(page, log);
  });

  test('Plugin is active', async ({ page }) => {
    const log = new TestLogger('smoke.spec.ts', 'Plugin is active');
    log.start();

    try {
      await log.step(page, 1, 'Navigate to plugins page');
      await page.goto('/wp-admin/plugins.php');

      await log.step(page, 2, 'Verify plugin row is visible and active');
      const pluginRow = page.locator('tr[data-slug="optionbay-product-options-and-addons"]');
      await expect(pluginRow).toBeVisible();
      await expect(pluginRow).toHaveClass(/active/);
      log.success('Plugin is active');

      log.end('passed');
    } catch (err) {
      await log.snapshot(page, 'failure');
      log.error('Test failed', { message: (err as Error).message });
      log.end('failed');
      throw err;
    }
  });

  test('OptionBay Options menu is visible', async ({ page }) => {
    const log = new TestLogger('smoke.spec.ts', 'Menu is visible');
    log.start();

    try {
      await log.step(page, 1, 'Navigate to admin dashboard');
      await page.goto('/wp-admin/');

      await log.step(page, 2, 'Hover on Products menu and check for Options submenu');
      const menuLink = page.locator('li#menu-posts-product > a.menu-top');
      await menuLink.hover();
      const subMenuLink = page.locator('li#menu-posts-product a:has-text("Options")');
      await expect(subMenuLink).toBeVisible();
      log.success('Options submenu is visible');

      log.end('passed');
    } catch (err) {
      await log.snapshot(page, 'failure');
      log.error('Test failed', { message: (err as Error).message });
      log.end('failed');
      throw err;
    }
  });
});
