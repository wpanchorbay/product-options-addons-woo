import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, FIELD_BUTTON } from './builder';

/**
 * Behavioral coverage for the Free "locked Pro feature" UI (added 1.0.2).
 *
 * When the Pro add-on is inactive, the Free admin surfaces Pro-only capabilities
 * as locked upsell teasers with a gold lock and an upgrade link to the pricing
 * page — purely visual, no functional gating. These specs assert those teasers
 * render and point at the upgrade URL. Field-type/pricing teasers are covered by
 * 00-pro-absence.spec.ts; this file covers the Settings and Assignment-Rules
 * teasers.
 */

const WC_SETTINGS_URL =
  '/wp-admin/admin.php?page=wc-settings&tab=products&section=optionbay-product-options-addons-woo';
const UPGRADE_HOST = 'wpanchorbay.com';

test.describe('Locked Pro UI (Free-only upsell teasers)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Settings page shows a locked "Pro License" teaser with an upgrade link', async ({ page }) => {
    const log = new TestLogger('locked-pro-ui.spec.ts', 'Settings license teaser');
    log.start();

    await log.step(page, 1, 'Open the plugin settings tab');
    await page.goto(WC_SETTINGS_URL);
    await expect(page.getByText('Pro License', { exact: true })).toBeVisible({ timeout: 20000 });

    await log.step(page, 2, 'The license key input is present but disabled');
    const licenseInput = page.locator('input[placeholder="Enter your license key"]');
    await expect(licenseInput).toBeVisible();
    await expect(licenseInput).toBeDisabled();

    await log.step(page, 3, 'The upgrade link points at the pricing page');
    const upgrade = page.getByRole('link', {
      name: /Upgrade to Pro for license activation/i,
    });
    await expect(upgrade).toBeVisible();
    expect(await upgrade.getAttribute('href')).toContain(UPGRADE_HOST);
    log.end('passed');
  });

  test('Assignment Rules shows a locked Category/Tag/Exceptions teaser', async ({ page }) => {
    const log = new TestLogger('locked-pro-ui.spec.ts', 'Assignment targeting teaser');
    log.start();

    await log.step(page, 1, 'Open a new group so the Assignment Rules panel renders');
    await openNewGroup(page, `Locked Assign ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);

    await log.step(page, 2, 'The Categories/Tags/Exceptions section is present and locked');
    await expect(
      page.getByText('Categories, Tags & Exceptions', { exact: true })
    ).toBeVisible({ timeout: 20000 });

    await log.step(page, 3, 'Its upgrade link targets the pricing page');
    const upgrade = page.getByRole('link', {
      name: /Upgrade to target by category\/tag and set exceptions/i,
    });
    await expect(upgrade).toBeVisible();
    expect(await upgrade.getAttribute('href')).toContain(UPGRADE_HOST);

    await log.step(page, 4, 'Free product/global targeting remains available (not locked)');
    await expect(page.getByText('Apply to all products', { exact: true })).toBeVisible();
    await expect(page.getByText('Apply to specific products', { exact: true })).toBeVisible();
    log.end('passed');
  });
});
