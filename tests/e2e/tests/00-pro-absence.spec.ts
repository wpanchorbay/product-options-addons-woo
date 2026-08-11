import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { wpCli, resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, FIELD_BUTTON } from './builder';

/**
 * Guard suite for the FREE plugin: it must run WITHOUT the Pro plugin, and none
 * of Pro's injected features may appear. If Pro is active, Free results are
 * invalid — fail loudly.
 */
test.describe('Pro absence guard (Free-only)', () => {
  test('Pro plugin is not active', async () => {
    const log = new TestLogger('00-pro-absence.spec.ts', 'Pro not active');
    log.start();
    const list = await wpCli('plugin list --field=name --status=active');
    log.info(`Active plugins: ${list.replace(/\n/g, ', ')}`);
    expect(list).not.toContain('optionbay-product-options-addons-woo-pro');
    log.end('passed');
  });

  test('Builder exposes no Pro field types', async ({ page }) => {
    const log = new TestLogger('00-pro-absence.spec.ts', 'No Pro field types');
    log.start();
    await resetOptionGroups();
    await login(page, log);
    await openNewGroup(page, `Guard ${Date.now()}`);

    // Free-native field buttons are present…
    await expect(page.getByRole('button', { name: FIELD_BUTTON.text, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: FIELD_BUTTON.select, exact: true })).toBeVisible();

    // …but Pro-only field types are not.
    await expect(page.getByRole('button', { name: 'File Upload (Pro)', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Formula/, exact: false })).toHaveCount(0);
    log.end('passed');
  });

  test('Field pricing offers only Free options', async ({ page }) => {
    const log = new TestLogger('00-pro-absence.spec.ts', 'No Pro pricing');
    log.start();
    await resetOptionGroups();
    await login(page, log);
    await openNewGroup(page, `Guard Pricing ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await page.locator('tr:has-text("Pricing Logic") [role="combobox"]').click();
    const listbox = page.locator('ul[role="listbox"]').last();
    await expect(listbox).toBeVisible();
    await expect(listbox).toContainText('Flat Fee');
    await expect(listbox).toContainText('Percentage of Base');
    await expect(listbox).not.toContainText('Formula');
    await expect(listbox).not.toContainText('Character');
    log.end('passed');
  });
});
