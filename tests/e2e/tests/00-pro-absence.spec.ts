import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { wpCli, resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, FIELD_BUTTON } from './builder';

/**
 * Guard suite for the FREE plugin: it must run WITHOUT the Pro plugin.
 *
 * Since 1.0.2 the Free admin no longer *hides* Pro capabilities — it surfaces
 * them as **locked upsell teasers** (a gold lock + an upgrade link) that are not
 * functional. So the guard's contract changed shape but not intent: Pro features
 * must appear ONLY as locked, non-working teasers, never as usable controls.
 * If Pro is active, Free results are invalid — fail loudly.
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

  test('Pro field types appear only as locked teasers, never functional', async ({ page }) => {
    const log = new TestLogger('00-pro-absence.spec.ts', 'Pro field types locked');
    log.start();
    await resetOptionGroups();
    await login(page, log);
    await openNewGroup(page, `Guard ${Date.now()}`);

    await log.step(page, 1, 'Free-native field buttons are present and usable');
    await expect(page.getByRole('button', { name: FIELD_BUTTON.text, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: FIELD_BUTTON.select, exact: true })).toBeVisible();

    await log.step(page, 2, 'Pro field types render as locked upsell buttons (File Upload, Formula)');
    const fileBtn = page.getByRole('button', { name: 'File Upload', exact: true });
    const formulaBtn = page.getByRole('button', { name: 'Formula', exact: true });
    await expect(fileBtn).toBeVisible();
    await expect(formulaBtn).toBeVisible();
    // Each locked button carries the gold lock icon.
    await expect(formulaBtn.locator('svg.lucide-lock')).toBeVisible();

    await log.step(page, 3, 'Clicking a locked Pro field adds NO field — it opens the upgrade page instead');
    const countBefore = await page.locator('div[id^="opopw-field-row-"]').count();
    const [popup] = await Promise.all([
      page.context().waitForEvent('page'),
      formulaBtn.click(),
    ]);
    expect(popup.url()).toContain('wpanchorbay.com');
    await popup.close();
    await page.waitForTimeout(500);
    const countAfter = await page.locator('div[id^="opopw-field-row-"]').count();
    expect(countAfter).toBe(countBefore); // no field was added by the locked control
    log.end('passed');
  });

  test('Field pricing lists Pro strategies only as locked, non-selectable options', async ({ page }) => {
    const log = new TestLogger('00-pro-absence.spec.ts', 'Pro pricing locked');
    log.start();
    await resetOptionGroups();
    await login(page, log);
    await openNewGroup(page, `Guard Pricing ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);

    await log.step(page, 1, 'Open the Pricing Logic dropdown');
    await page.locator('tr:has-text("Pricing Logic") [role="combobox"]').click();
    const listbox = page.locator('ul[role="listbox"]').last();
    await expect(listbox).toBeVisible();

    await log.step(page, 2, 'Free strategies are present');
    await expect(listbox).toContainText('Flat Fee');
    await expect(listbox).toContainText('Percentage of Base');

    await log.step(page, 3, 'Pro strategies are present but locked (cursor-not-allowed + lock icon)');
    const formulaOpt = listbox.locator('li[role="option"]').filter({ hasText: 'Formula-based Pricing' });
    const charOpt = listbox.locator('li[role="option"]').filter({ hasText: 'Price per Character' });
    await expect(formulaOpt).toBeVisible();
    await expect(charOpt).toBeVisible();
    await expect(formulaOpt).toHaveClass(/opopw-cursor-not-allowed/);
    await expect(charOpt).toHaveClass(/opopw-cursor-not-allowed/);
    log.end('passed');
  });
});
