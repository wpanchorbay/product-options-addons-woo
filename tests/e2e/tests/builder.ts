import { Page, expect } from '@playwright/test';

/** Admin option-group builder route. */
export const BUILDER_URL = '/wp-admin/edit.php?post_type=product&page=opopw-options';

/** Field-type picker button labels (Free-native). */
export const FIELD_BUTTON = {
  text: 'Text Input',
  textarea: 'Textarea',
  select: 'Dropdown',
  checkbox: 'Checkboxes',
  radio: 'Radio Buttons',
  single_checkbox: 'Checkbox',
  number: 'Number',
  email: 'Email',
  date: 'Date Picker',
  time: 'Time Picker',
  datetime: 'Date & Time',
  color_swatch: 'Color Swatch',
  image_swatch: 'Image Swatch',
  static_content: 'Static Content',
} as const;

/** Open the builder and start a new group with the given title. */
export async function openNewGroup(page: Page, title: string) {
  await page.goto(BUILDER_URL);
  await page.click('a.page-title-action:has-text("Add new group")');
  await page.fill('input[placeholder*="Group Title"]', title);
}

/** Add a field of the given picker label (exact match avoids Checkbox/Checkboxes clash). */
export async function addField(page: Page, buttonLabel: string) {
  await page.getByRole('button', { name: buttonLabel, exact: true }).click();
  await page.waitForSelector('.opopw-skeleton-builder', { state: 'detached' });
}

/** Fill the (last-added) field's label. */
export async function setFieldLabel(page: Page, label: string) {
  await page.locator('input[placeholder*="field label"]').last().fill(label);
}

/** Choose "Apply to all products" visibility. */
export async function setGlobal(page: Page) {
  await page.getByText('Apply to all products', { exact: true }).click();
  await page.waitForTimeout(300);
}

/** Choose "Apply to specific products" and add one product by name via Reach. */
export async function setTargetedProduct(page: Page, productName: string) {
  await page.getByText('Apply to specific products', { exact: true }).click();
  await page.locator('tr:has-text("Reach") [role="combobox"]').first().click();
  await page.locator('input[placeholder="Search products…"]').fill(productName);
  const opt = page.locator('ul[role="listbox"] li').filter({ hasText: productName }).first();
  await expect(opt).toBeVisible({ timeout: 20000 });
  await opt.click();
  await page.keyboard.press('Escape');
}

/** Save a new group (Create Group → becomes Update Group). Returns the group id. */
export async function saveGroup(page: Page): Promise<string> {
  await page.click('button:has-text("Create Group")');
  await expect(page.locator('button:has-text("Update Group")')).toBeVisible({ timeout: 15000 });
  return (page.url().split('/').pop() || '').trim();
}

/** Set field-level pricing to Flat Fee with the given amount. */
export async function setFieldFlatFee(page: Page, amount: string) {
  await page.locator('tr:has-text("Pricing Logic") [role="combobox"]').click();
  await page.locator('ul[role="listbox"] li').filter({ hasText: 'Flat Fee' }).click();
  await page.locator('tr:has-text("Price Amount") input').fill(amount);
}

/** Set field-level pricing to Percentage of Base with the given percent. */
export async function setFieldPercentage(page: Page, percent: string) {
  await page.locator('tr:has-text("Pricing Logic") [role="combobox"]').click();
  await page.locator('ul[role="listbox"] li').filter({ hasText: 'Percentage of Base' }).click();
  await page.locator('tr:has-text("Price Amount") input').fill(percent);
}

/** Fill the first choice's label (option-based fields). */
export async function setFirstChoiceLabel(page: Page, label: string) {
  await page.locator('input[placeholder="Choice Label"]').first().fill(label);
}

/** Add another choice row. */
export async function addChoice(page: Page) {
  await page.click('button:has-text("Add Choice")');
}

/** Locate the Nth (1-based) choice accordion row. */
function choiceRow(page: Page, n: number) {
  return page
    .locator('span')
    .filter({ hasText: new RegExp(`^#${n}$`) })
    .locator('..')
    .locator('..')
    .locator('..');
}

/** Set the Nth choice's label. */
export async function setChoiceLabel(page: Page, n: number, label: string) {
  await choiceRow(page, n).locator('input[placeholder="Choice Label"]').fill(label);
}

/** Give the Nth choice a Flat Fee price (expanding its accordion first if needed). */
export async function priceChoiceFlat(page: Page, n: number, amount: string) {
  const row = choiceRow(page, n);
  const details = row.locator('.opopw-accordion-choice-details');
  if (!(await details.isVisible().catch(() => false))) {
    // The choice header (#N label) toggles the accordion; only the newest choice auto-expands.
    await page.locator('span').filter({ hasText: new RegExp(`^#${n}$`) }).first().click();
  }
  await expect(details).toBeVisible({ timeout: 10000 });
  await details.locator('tr:has-text("Price Type") [role="combobox"]').click();
  await page.locator('ul[role="listbox"] li').filter({ hasText: 'Flat Fee' }).click();
  await details.locator('tr:has-text("Price Amount") input').fill(amount);
}

/** Open a select-style combobox and pick an option by (case-insensitive exact) label. */
export async function pickClassicSelect(page: Page, trigger: ReturnType<Page['locator']>, optionLabel: string) {
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const listbox = page.locator('ul[role="listbox"]').last();
  await expect(listbox).toBeVisible({ timeout: 5000 });
  const option = listbox.locator('li[role="option"]').filter({ hasText: new RegExp(`^${optionLabel}$`, 'i') }).first();
  await expect(option).toBeVisible({ timeout: 5000 });
  await option.click();
  await expect(listbox).toBeHidden({ timeout: 5000 });
}
