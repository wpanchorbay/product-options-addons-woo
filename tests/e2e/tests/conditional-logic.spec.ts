import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setGlobal, saveGroup, pickClassicSelect, FIELD_BUTTON } from './builder';

test.describe('Conditional logic (visibility)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await resetOptionGroups();
    await login(page);
  });

  test('Show Field B only when Field A equals a trigger', async ({ page }) => {
    const log = new TestLogger('conditional-logic.spec.ts', 'Show rule');
    log.start();

    await openNewGroup(page, `Logic ${Date.now()}`);
    await addField(page, FIELD_BUTTON.text);
    await page.locator('input[placeholder*="field label"]').last().fill('Field A');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    await addField(page, FIELD_BUTTON.text);
    await page.locator('input[placeholder*="field label"]').last().fill('Field B');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(800);

    log.step(1, 'Enable conditional logic on Field B (Show when Field A = Trigger)');
    const fieldBRow = page.locator('div[id^="opopw-field-row-"]').last();
    await fieldBRow.getByText('Enable Conditional Logic', { exact: true }).click();
    await page.waitForTimeout(800);
    await fieldBRow.locator('button:has-text("Add Rule")').click();
    await page.waitForTimeout(500);

    const firstRule = fieldBRow.locator('.opopw-condition-rules-table tbody tr').first();
    await pickClassicSelect(page, firstRule.locator('[role="combobox"]').nth(0), 'Field A');
    await pickClassicSelect(page, firstRule.locator('[role="combobox"]').nth(1), 'equals');
    await firstRule.locator('input[type="text"]').fill('Trigger');

    const logicControls = fieldBRow.locator('div:has(> span:has-text("this field if"))');
    await pickClassicSelect(page, logicControls.locator('[role="combobox"]').nth(0), 'Show');

    await setGlobal(page);
    await saveGroup(page);

    log.step(2, 'Frontend: Field B hidden until Field A = "Trigger"');
    await page.goto('/product/product-a/');
    const fieldA = page.locator('.opopw-field').filter({ hasText: 'Field A' }).last();
    const fieldB = page.locator('.opopw-field').filter({ hasText: 'Field B' }).last();
    await expect(fieldA).toBeVisible({ timeout: 20000 });
    await expect(fieldB).toBeHidden({ timeout: 10000 });

    await fieldA.locator('input').fill('Trigger');
    await expect(fieldB).toBeVisible({ timeout: 10000 });
    log.success('Field B revealed by the trigger value');
    log.end('passed');
  });
});
