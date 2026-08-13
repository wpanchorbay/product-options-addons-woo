import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, FIELD_BUTTON } from './builder';

async function fillEditor(page: Page, html: string) {
  const frame = page.frameLocator('iframe[id$="_ifr"]').first();
  await expect(frame.locator('body')).toBeVisible({ timeout: 15000 });
  await frame.locator('body').click();
  await frame.locator('body').evaluate((node, html) => {
    (node as HTMLElement).innerHTML = html;
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, html);
  // Nudge TinyMCE to sync to the underlying textarea.
  await page.evaluate(() => (window as any).tinyMCE?.triggerSave?.());
}

test.describe('Static Content lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Admin persistence + frontend render', async ({ page }) => {
    const log = new TestLogger('static-content.spec.ts', 'Static content');
    log.start();
    await openNewGroup(page, `Static ${Date.now()}`);
    await addField(page, FIELD_BUTTON.static_content);
    await setFieldLabel(page, 'Care Info');
    await fillEditor(page, '<p>Hand wash only</p>');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 1, 'Frontend renders the static content (no input)');
    await page.goto('/product/product-c/');
    await page.waitForSelector('form.cart', { timeout: 20000 });
    await expect(page.locator('form.cart .opopw-static-content')).toContainText('Hand wash only', { timeout: 15000 });
    log.end('passed');
  });
});
