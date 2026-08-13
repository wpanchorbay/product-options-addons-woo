import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { wpCli, resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setGlobal, saveGroup, pickClassicSelect, FIELD_BUTTON } from './builder';

/**
 * Conditional-logic CASCADE coverage (M2, 1.0.2).
 *
 * The server re-evaluates visibility with cascading: when a trigger field is
 * itself hidden, its value counts as empty. This blocks a forged submission that
 * sets a hidden trigger directly to unlock a downstream (priced) field.
 *
 * Chain: Field B shows when A == "x"; Field C shows when B == "y" and carries a
 * +50 flat fee. A forged add-to-cart sets A="z" (so B is hidden) but also sends
 * B="y" and a value for C. With the cascade fix, B is treated as empty → C stays
 * hidden → C is neither saved nor charged.
 */

/** Enable "Show this field when <target> equals <value>" on the currently-last field row. */
async function addShowRule(
  page: import('@playwright/test').Page,
  targetLabel: string,
  value: string
) {
  const row = page.locator('div[id^="opopw-field-row-"]').last();
  await row.getByText('Enable Conditional Logic', { exact: true }).click();
  await page.waitForTimeout(600);
  await row.locator('button:has-text("Add Rule")').click();
  await page.waitForTimeout(400);
  const rule = row.locator('.opopw-condition-rules-table tbody tr').first();
  await pickClassicSelect(page, rule.locator('[role="combobox"]').nth(0), targetLabel);
  await pickClassicSelect(page, rule.locator('[role="combobox"]').nth(1), 'equals');
  await rule.locator('input[type="text"]').fill(value);
  const logicControls = row.locator('div:has(> span:has-text("this field if"))');
  await pickClassicSelect(page, logicControls.locator('[role="combobox"]').nth(0), 'Show');
}

async function addTextField(page: import('@playwright/test').Page, label: string) {
  await addField(page, FIELD_BUTTON.text);
  await page.locator('input[placeholder*="field label"]').last().fill(label);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
}

test.describe('Conditional logic cascade (server-side, M2)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000);
    await resetOptionGroups();
    await login(page);
  });

  test('A hidden trigger field cannot unlock (or charge for) a downstream field', async ({ page }) => {
    const log = new TestLogger('conditional-cascade.spec.ts', 'Hidden-trigger cannot unlock');
    log.start();

    await log.step(page, 1, 'Build chain: A → (B shows if A=x) → (C shows if B=y, +50 flat)');
    await openNewGroup(page, `Cascade ${Date.now()}`);
    await addTextField(page, 'Field A');
    await addTextField(page, 'Field B');
    await addShowRule(page, 'Field A', 'x');
    await addTextField(page, 'Field C');
    await addShowRule(page, 'Field B', 'y');

    // C flat fee +50, scoped to C's (last) row.
    const cRow = page.locator('div[id^="opopw-field-row-"]').last();
    await cRow.locator('tr:has-text("Pricing Logic") [role="combobox"]').click();
    await page.locator('ul[role="listbox"] li').filter({ hasText: 'Flat Fee' }).click();
    await cRow.locator('tr:has-text("Price Amount") input').fill('50');

    await setGlobal(page);
    await saveGroup(page);

    await log.step(page, 2, 'Read the rendered field input names from the product page');
    await page.goto('/product/product-a/');
    await page.waitForSelector('form.cart input[name^="opopw_addons["]', { timeout: 20000 });
    const fields = await page.locator('.opopw-field').evaluateAll((els) =>
      els.map((el) => ({
        text: el.textContent || '',
        name: el.querySelector('input,select,textarea')?.getAttribute('name') || '',
      }))
    );
    const nameFor = (label: string) => fields.find((f) => f.text.includes(label))?.name || '';
    const nameA = nameFor('Field A');
    const nameB = nameFor('Field B');
    const nameC = nameFor('Field C');
    log.info(`names A=${nameA} B=${nameB} C=${nameC}`);
    expect(nameA && nameB && nameC).toBeTruthy();

    await log.step(page, 3, 'Forge add-to-cart: A="z" (hides B) but also send B="y" and a value for C');
    const pid = (await wpCli('post list --post_type=product --name=product-a --field=ID --format=ids')).trim();
    const form: Record<string, string> = { 'add-to-cart': pid, quantity: '1' };
    form[nameA] = 'z'; // A != x  → B is hidden
    form[nameB] = 'y'; // the forged hidden-trigger value that must NOT unlock C
    form[nameC] = 'HACK'; // would incur C's +50 fee if C were wrongly treated as visible
    const resp = await page.request.post('/product/product-a/', { form });
    expect(resp.ok()).toBeTruthy();

    await log.step(page, 4, 'Cart: item added, but Field C is neither saved nor charged');
    await page.goto('/cart/');
    await expect(page.locator('body')).toContainText('Product A', { timeout: 20000 });
    // C stayed hidden server-side → it is not part of the line item.
    await expect(page.locator('body')).not.toContainText('Field C');
    // And its +50 surcharge was not applied: the line reflects the base price only.
    await expect(page.locator('body')).not.toContainText('150');
    log.success('Hidden trigger did not unlock or charge the downstream field');
    log.end('passed');
  });
});
