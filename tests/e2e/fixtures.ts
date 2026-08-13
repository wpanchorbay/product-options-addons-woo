import { test as base, expect, Page } from '@playwright/test';
import { captureFailureScreenshot } from './tests/test-logger';

export type RenderMode = 'classic' | 'block';

/**
 * Extends Playwright's base test with a `renderMode` option so the same specs
 * can be executed against both the classic (shortcode) and block cart/checkout.
 * Projects set `use: { renderMode: 'classic' | 'block' }` in playwright.config.ts.
 */
export const test = base.extend<{ renderMode: RenderMode }>({
  renderMode: ['classic', { option: true }],
});

// Every step already gets its own screenshot via TestLogger.step(). This
// backstops the case where a test fails before any step runs (e.g. a login
// failure in beforeEach), so a failure is never left with no visual record.
// Screenshots always land in the shared flat screenshots/ folder — never a
// per-test subfolder.
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await captureFailureScreenshot(page, testInfo);
  }
});

export { expect };

/**
 * Click the single-product add-to-cart button and wait for the submission to
 * settle. Success notices differ by theme (classic `.woocommerce-message` vs
 * block `.wc-block-components-notice-banner`), so we wait best-effort for either
 * and treat the cart contents as the source of truth.
 */
export async function addToCart(page: Page) {
  await page.click('button.single_add_to_cart_button');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page
    .locator('.woocommerce-message, .wc-block-components-notice-banner, .woocommerce-error')
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => {});
}

/**
 * Wait for whichever cart container the current theme renders.
 * Classic → `.woocommerce-cart-form` / `table.shop_table_cart`;
 * Block   → `.wc-block-cart`.
 */
export async function gotoCart(page: Page, mode: RenderMode) {
  await page.goto('/cart/');
  const container =
    mode === 'block'
      ? '.wc-block-cart, .wp-block-woocommerce-cart'
      : '.woocommerce-cart-form, table.shop_table_cart';
  // Fall back to either container so an unexpected theme state still resolves.
  await expect(
    page.locator(`${container}, .woocommerce-cart-form, .wc-block-cart`).first()
  ).toBeVisible({ timeout: 20000 });
}

/**
 * Assert the cart shows an add-on line (label + value) and, optionally, a total.
 * The assertion text is theme-agnostic; block cart currently has no Store API
 * integration, so these may fail under `renderMode: 'block'` — that is a real
 * product gap to triage, not a test defect.
 */
export async function expectCartShowsAddon(
  page: Page,
  mode: RenderMode,
  opts: { label?: string; value?: string; total?: string }
) {
  await gotoCart(page, mode);
  const body = page.locator('body');
  if (opts.label) await expect(body).toContainText(opts.label, { timeout: 15000 });
  if (opts.value) await expect(body).toContainText(opts.value, { timeout: 15000 });
  if (opts.total) await expect(body).toContainText(opts.total, { timeout: 15000 });
}
