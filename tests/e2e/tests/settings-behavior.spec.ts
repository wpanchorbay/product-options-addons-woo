import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups, wpCli } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, pickClassicSelect, FIELD_BUTTON } from './builder';

/**
 * Free settings — behavioral coverage (added 1.0.2).
 *
 * Each of the 7 UI/style settings feeds directly into AddonRenderer's inline
 * style/attributes on the frontend `#opopw-options` wrapper (app/Core/AddonRenderer.php
 * ~L120-146), so each test changes the setting through the real WC Settings tab,
 * saves, then visits a real product page and asserts the rendered markup reflects
 * the new value — not just that the REST round-trip persisted it. `debug_enableMode`
 * gates opopw_log() DEBUG-level entries (app/functions.php); verified by reading
 * WooCommerce's own log file, not wp-content/debug.log.
 *
 * `advanced_deleteAllOnUninstall` is intentionally NOT covered here — verifying it
 * requires actually uninstalling the Free plugin, which would end the QIT
 * environment for every other spec; that's too destructive for this suite.
 * `global_isPreloaded` is an internal completion flag, not a user-facing setting.
 */

const WC_SETTINGS_URL =
  '/wp-admin/admin.php?page=wc-settings&tab=products&section=optionbay-product-options-addons-woo';

/** Save the settings form via the native WC "Save changes" button and wait for the toast. */
async function saveSettings(page: import('@playwright/test').Page) {
  await page.click('button[name="save"]');
  await expect(page.getByText('Settings saved successfully.', { exact: true })).toBeVisible({ timeout: 15000 });
}

/** A px value that differs from whatever is currently set (avoids a silent no-op on re-run). */
function distinctPx(offset: number): string {
  return `${20 + offset + (Date.now() % 15)}px`;
}

test.describe('Free settings — behavioral effect', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
    // One global text field so #opopw-options renders on every product page.
    await openNewGroup(page, `Settings Behavior ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Note');
    await setGlobal(page);
    await saveGroup(page);
  });

  test('Options Orientation flips the frontend data-orientation attribute', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Options Orientation');
    log.start();

    await log.step(page, 1, 'Read the current orientation on the frontend');
    await page.goto('/product/product-a/');
    const wrapper = page.locator('#opopw-options');
    await expect(wrapper).toBeVisible({ timeout: 20000 });
    const current = await wrapper.getAttribute('data-orientation');
    const target = current === 'horizontal' ? 'vertical' : 'horizontal';

    await log.step(page, 2, `Open Settings and switch orientation to "${target}"`);
    await page.goto(WC_SETTINGS_URL);
    await expect(page.getByText('Options Orientation', { exact: true })).toBeVisible({ timeout: 20000 });
    const trigger = page.locator('tr:has-text("Options Orientation") [role="combobox"]');
    await pickClassicSelect(page, trigger, target);
    await saveSettings(page);

    await log.step(page, 3, `Frontend now renders data-orientation="${target}"`);
    await page.goto('/product/product-a/');
    await expect(page.locator('#opopw-options')).toHaveAttribute('data-orientation', target, { timeout: 20000 });
    log.success(`Orientation changed ${current} → ${target} and reflected on the frontend`);
    log.end('passed');
  });

  test('Label Font Size changes the --opopw-font-size-label CSS variable', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Label Font Size');
    log.start();
    const target = distinctPx(1);

    await log.step(page, 1, 'Open Settings and set a new label font size');
    await page.goto(WC_SETTINGS_URL);
    const input = page.locator('tr:has-text("Label Font Size") input');
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(target);
    await saveSettings(page);

    await log.step(page, 2, `Frontend style reflects --opopw-font-size-label: ${target}`);
    await page.goto('/product/product-a/');
    const style = await page.locator('#opopw-options').getAttribute('style');
    expect(style).toContain(`--opopw-font-size-label: ${target}`);
    log.success(`Label font size ${target} reflected in rendered style`);
    log.end('passed');
  });

  test('Input Font Size changes the --opopw-font-size-input CSS variable', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Input Font Size');
    log.start();
    const target = distinctPx(2);

    await log.step(page, 1, 'Open Settings and set a new input font size');
    await page.goto(WC_SETTINGS_URL);
    const input = page.locator('tr:has-text("Input Font Size") input');
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(target);
    await saveSettings(page);

    await log.step(page, 2, `Frontend style reflects --opopw-font-size-input: ${target}`);
    await page.goto('/product/product-a/');
    const style = await page.locator('#opopw-options').getAttribute('style');
    expect(style).toContain(`--opopw-font-size-input: ${target}`);
    log.success(`Input font size ${target} reflected in rendered style`);
    log.end('passed');
  });

  test('Color Swatch Size changes the --opopw-swatch-size CSS variable', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Color Swatch Size');
    log.start();
    const target = distinctPx(3);

    await log.step(page, 1, 'Open Settings and set a new swatch size');
    await page.goto(WC_SETTINGS_URL);
    const input = page.locator('tr:has-text("Color Swatch Size") input');
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(target);
    await saveSettings(page);

    await log.step(page, 2, `Frontend style reflects --opopw-swatch-size: ${target}`);
    await page.goto('/product/product-a/');
    const style = await page.locator('#opopw-options').getAttribute('style');
    expect(style).toContain(`--opopw-swatch-size: ${target}`);
    log.success(`Swatch size ${target} reflected in rendered style`);
    log.end('passed');
  });

  test('Image Swatch Size changes the --opopw-swatch-image-size CSS variable', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Image Swatch Size');
    log.start();
    const target = distinctPx(4);

    await log.step(page, 1, 'Open Settings and set a new image swatch size');
    await page.goto(WC_SETTINGS_URL);
    const input = page.locator('tr:has-text("Image Swatch Size") input');
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(target);
    await saveSettings(page);

    await log.step(page, 2, `Frontend style reflects --opopw-swatch-image-size: ${target}`);
    await page.goto('/product/product-a/');
    const style = await page.locator('#opopw-options').getAttribute('style');
    expect(style).toContain(`--opopw-swatch-image-size: ${target}`);
    log.success(`Image swatch size ${target} reflected in rendered style`);
    log.end('passed');
  });

  test('Color Swatch Roundness changes the --opopw-swatch-radius CSS variable', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Color Swatch Roundness');
    log.start();
    const target = distinctPx(5);

    await log.step(page, 1, 'Open Settings and set a new swatch radius');
    await page.goto(WC_SETTINGS_URL);
    const input = page.locator('tr:has-text("Color Swatch Roundness") input');
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(target);
    await saveSettings(page);

    await log.step(page, 2, `Frontend style reflects --opopw-swatch-radius: ${target}`);
    await page.goto('/product/product-a/');
    const style = await page.locator('#opopw-options').getAttribute('style');
    expect(style).toContain(`--opopw-swatch-radius: ${target}`);
    log.success(`Swatch radius ${target} reflected in rendered style`);
    log.end('passed');
  });

  test('Image Swatch Roundness changes the --opopw-swatch-image-radius CSS variable', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Image Swatch Roundness');
    log.start();
    const target = distinctPx(6);

    await log.step(page, 1, 'Open Settings and set a new image swatch radius');
    await page.goto(WC_SETTINGS_URL);
    const input = page.locator('tr:has-text("Image Swatch Roundness") input');
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(target);
    await saveSettings(page);

    await log.step(page, 2, `Frontend style reflects --opopw-swatch-image-radius: ${target}`);
    await page.goto('/product/product-a/');
    const style = await page.locator('#opopw-options').getAttribute('style');
    expect(style).toContain(`--opopw-swatch-image-radius: ${target}`);
    log.success(`Image swatch radius ${target} reflected in rendered style`);
    log.end('passed');
  });

  test('Debug Mode gates DEBUG-level log entries in the WooCommerce logger', async ({ page }) => {
    const log = new TestLogger('settings-behavior.spec.ts', 'Debug Mode');
    log.start();

    // Differential, not absolute: the shared wc-logs file can already contain
    // "Rendering options for Product ID" entries from unrelated earlier tests in
    // this same run (e.g. any test that briefly toggled debug mode on). We prove
    // the setting's effect by counting NEW occurrences per action, not by
    // asserting the file is entirely free of the string.
    const countMarker = async (): Promise<number> => {
      const out = await wpCli(
        `eval 'global $wp_filesystem; $dir = WP_CONTENT_DIR . "/uploads/wc-logs"; $files = glob($dir . "/optionbay-product-options-addons-woo-*.log"); $count = 0; foreach ($files as $f) { $count += substr_count(file_get_contents($f), "Rendering options for Product ID"); } echo $count;'`
      );
      return parseInt(out.trim(), 10) || 0;
    };

    await log.step(page, 1, 'Ensure Debug Mode is off, then view a product page (count must NOT increase)');
    await page.goto(WC_SETTINGS_URL);
    const checkbox = page.getByText('Enable developer logging', { exact: true });
    await expect(checkbox).toBeVisible({ timeout: 20000 });
    // Read current checked state via the settings REST endpoint (robust vs. UI-only inspection).
    const nonce = await page.evaluate(() => (window as any).opopwPluginLocalize?.nonce);
    const before = await (
      await page.request.get('/wp-json/optionbay-product-options-addons-woo/v1/settings', {
        headers: { 'X-WP-Nonce': nonce },
      })
    ).json();
    if (before.data?.debug_enableMode) {
      await checkbox.click();
      await saveSettings(page);
    }
    const countBeforeOff = await countMarker();
    await page.goto('/product/product-a/'); // AddonRenderer::render() logs DEBUG unconditionally.
    const countAfterOff = await countMarker();
    expect(countAfterOff, 'no new DEBUG entry while Debug Mode is off').toBe(countBeforeOff);

    await log.step(page, 2, 'Turn Debug Mode on and re-view the product page');
    await page.goto(WC_SETTINGS_URL);
    await expect(page.getByText('Enable developer logging', { exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByText('Enable developer logging', { exact: true }).click();
    await saveSettings(page);
    const countBeforeOn = await countMarker();
    await page.goto('/product/product-a/');

    await log.step(page, 3, 'A new DEBUG-level entry now appears in the WooCommerce log for this plugin');
    const countAfterOn = await countMarker();
    expect(countAfterOn, 'a new DEBUG entry must appear once Debug Mode is on').toBeGreaterThan(countBeforeOn);
    log.success(`DEBUG entries suppressed while off (${countBeforeOff}→${countAfterOff}), gained while on (${countBeforeOn}→${countAfterOn})`);
    log.end('passed');
  });
});
