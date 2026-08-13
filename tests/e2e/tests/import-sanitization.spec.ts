import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { BUILDER_URL } from './builder';

/**
 * Import sanitization (M3, 1.0.2).
 *
 * Imported group schemas now run through AddonGroupController::sanitize_schema()
 * and imported settings through Settings::sanitize_settings_object(), so a crafted
 * import file can't persist markup or keys the admin UI would reject. We POST a
 * malicious payload to the import endpoint and read it back via export to prove
 * the unsafe bits were stripped.
 */

const API = '/wp-json/optionbay-product-options-addons-woo/v1';

test.describe('Import sanitization (M3)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('A crafted import cannot persist script markup or disallowed settings keys', async ({ page }) => {
    const log = new TestLogger('import-sanitization.spec.ts', 'Import is sanitized');
    log.start();

    await log.step(page, 1, 'Read the REST nonce from the admin page');
    await page.goto(BUILDER_URL);
    const nonce = await page.evaluate(
      () => (window as any).opopwPluginLocalize?.nonce || (window as any).wpApiSettings?.nonce
    );
    expect(nonce, 'REST nonce must be available on the admin page').toBeTruthy();

    const title = `Malicious Import ${Date.now()}`;
    const payload = {
      groups: [
        {
          title,
          status: 'publish',
          schema: [
            {
              id: 'f_static',
              type: 'static_content',
              label: 'Info',
              // <script> must be stripped by wp_kses_post; the <p> should survive.
              content: '<script>alert(1)</script><p>safe copy</p>',
            },
          ],
          assignments: [{ target_type: 'global', target_id: 0 }],
        },
      ],
      settings: {
        // Not part of the settings schema → must be dropped by the allow-list.
        evil_key: 'boom-should-not-persist',
      },
    };

    await log.step(page, 2, 'POST the crafted payload to the import endpoint');
    const importResp = await page.request.post(`${API}/import`, {
      headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' },
      data: payload,
    });
    expect(importResp.ok(), `import should succeed, got ${importResp.status()}`).toBeTruthy();

    await log.step(page, 3, 'Read the data back via export and assert the unsafe bits are gone');
    const exportResp = await page.request.get(`${API}/export?entities=groups,settings`, {
      headers: { 'X-WP-Nonce': nonce },
    });
    expect(exportResp.ok()).toBeTruthy();
    const data = await exportResp.json();
    const groupsStr = JSON.stringify(data.groups || data.option_groups || []);
    const settingsStr = JSON.stringify(data.settings || {});

    // Schema content was run through wp_kses_post: script removed, safe markup kept.
    expect(groupsStr).toContain(title);
    expect(groupsStr).not.toContain('<script>');
    expect(groupsStr).toContain('safe copy');

    // Disallowed settings key was dropped by the allow-list.
    expect(settingsStr).not.toContain('evil_key');
    expect(settingsStr).not.toContain('boom-should-not-persist');
    log.success('Script markup stripped and disallowed settings key dropped on import');
    log.end('passed');
  });

  test('Import is rejected with an invalid REST nonce (L3)', async ({ page }) => {
    const log = new TestLogger('import-sanitization.spec.ts', 'Nonce required on import');
    log.start();
    // Same authenticated (cookie) context, but a garbage X-WP-Nonce → WordPress's
    // own cookie-auth check ('rest_cookie_invalid_nonce') rejects the write before
    // it ever reaches the endpoint, matching every other write endpoint in the API.
    // (A request with NO nonce at all is deliberately treated as anonymous by core
    // and returns 401 instead — a different, already-covered code path.)
    const resp = await page.request.post(`${API}/import`, {
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': 'not-a-real-nonce' },
      data: { groups: [{ title: 'BadNonce', status: 'publish', schema: [], assignments: [] }] },
    });
    expect(resp.status(), 'import with an invalid nonce must be forbidden').toBe(403);
    log.end('passed');
  });
});
