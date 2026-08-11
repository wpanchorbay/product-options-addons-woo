import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setChoiceLabel, FIELD_BUTTON } from './builder';

/**
 * Image Swatch requires an uploaded image per choice to save a group, which
 * needs the WP media library (out of scope for a deterministic e2e run). This
 * spec verifies the field type is available and configurable in the builder;
 * the priced-swatch frontend flow is covered by color-swatch (same swatch engine).
 */
test.describe('Image Swatch (builder configurability)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Field type is available and configurable', async ({ page }) => {
    const log = new TestLogger('image-swatch.spec.ts', 'Configurable');
    log.start();
    await openNewGroup(page, `Image ${Date.now()}`);
    await addField(page, FIELD_BUTTON.image_swatch);
    await setFieldLabel(page, 'Pattern');
    await setChoiceLabel(page, 1, 'Stripes');

    await expect(page.locator('input[placeholder*="field label"]').last()).toHaveValue('Pattern');
    await expect(page.locator('input[placeholder="Choice Label"]').first()).toHaveValue('Stripes');
    log.end('passed');
  });
});
