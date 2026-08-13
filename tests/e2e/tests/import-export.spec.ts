import { test, expect } from '../fixtures';
import { readFileSync } from 'fs';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { BUILDER_URL, openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, FIELD_BUTTON } from './builder';

test.describe('Export option groups', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Export produces a JSON containing the created group', async ({ page }) => {
    const log = new TestLogger('import-export.spec.ts', 'Export');
    log.start();

    await log.step(page, 1, 'Create a group');
    const title = `Exportable ${Date.now()}`;
    await openNewGroup(page, title);
    await addField(page, FIELD_BUTTON.text);
    await setFieldLabel(page, 'Keepsake');
    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Options page → Export panel → download JSON');
    await page.goto(BUILDER_URL);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Export Option Groups' })).toBeVisible({ timeout: 15000 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download JSON Export' }).click(),
    ]);

    await log.step(page, 3, 'Downloaded JSON includes the group + its field');
    const path = await download.path();
    expect(path).toBeTruthy();
    const data = JSON.parse(readFileSync(path!, 'utf8'));
    const groups = data.groups || data.option_groups || [];
    const titles = JSON.stringify(groups);
    expect(titles).toContain(title);
    expect(titles).toContain('Keepsake');
    log.success('Export JSON contains the group and field');
    log.end('passed');
  });
});
