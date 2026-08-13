import { test, expect } from '../fixtures';
import { login } from './helpers';
import { TestLogger } from './test-logger';
import { wpCli, resetOptionGroups } from '../setup/store-setup';
import { openNewGroup, addField, setFieldLabel, setGlobal, saveGroup, FIELD_BUTTON } from './builder';

/**
 * Backend assignment-resolver coverage for the FREE plugin (H1/H2, 1.0.2).
 *
 * Category, tag, and exclusion targeting are authored through Pro's Assignment
 * Rules UI, but the RESOLUTION lives in Free's DbManager::get_groups_for_product()
 * and works with or without Pro. So we exercise the resolver directly: build a
 * real group through the builder (correct schema), then seed the exact assignment
 * rows via wp-cli and assert what renders on the storefront.
 *
 * store-setup seeds: Product A & B → category "Accessories"; Product C → tag
 * "Featured"; Product D → neither.
 */

type Row = { type: 'global' | 'product' | 'category' | 'tag'; id: number; exclude?: boolean; priority?: number };

/** Replace a group's assignment rows in the custom table, publish it, bump the resolver cache. */
async function setAssignments(groupId: string, rows: Row[]): Promise<void> {
  const inserts = rows
    .map(
      (r) =>
        `$wpdb->insert($t, array("group_id"=>$gid,"target_type"=>"${r.type}","target_id"=>${r.id},"is_exclusion"=>${
          r.exclude ? 1 : 0
        },"priority"=>${r.priority ?? 10}));`
    )
    .join(' ');
  await wpCli(
    `eval 'global $wpdb; $t=$wpdb->prefix."opopw_assignments"; $gid=${groupId}; ` +
      `$wpdb->query("DELETE FROM {$t} WHERE group_id={$gid}"); ${inserts} ` +
      `wp_cache_set("opopw_assignments_version", time(), "opopw_assignments");'`
  );
  await wpCli(`post update ${groupId} --post_status=publish`).catch(() => '');
  await wpCli('transient delete --all').catch(() => '');
}

async function termId(taxonomy: string, slug: string): Promise<number> {
  return Number((await wpCli(`term list ${taxonomy} --slug=${slug} --field=term_id --format=ids`)).trim());
}
async function productId(slug: string): Promise<number> {
  return Number((await wpCli(`post list --post_type=product --name=${slug} --field=ID --format=ids`)).trim());
}

/** Build a minimal published group with one text field and return its id. */
async function makeGroup(page: import('@playwright/test').Page, title: string): Promise<string> {
  await openNewGroup(page, title);
  await addField(page, FIELD_BUTTON.text);
  await setFieldLabel(page, 'Addon Field');
  await setGlobal(page); // satisfies the builder; we override the rows next.
  return saveGroup(page);
}

/** True if the storefront renders any of this plugin's add-on inputs for the product. */
async function productHasAddons(page: import('@playwright/test').Page, slug: string): Promise<boolean> {
  await page.goto(`/product/${slug}/`);
  await page.waitForSelector('form.cart', { timeout: 20000 });
  return (await page.locator('form.cart input[name^="opopw_addons["]').count()) > 0;
}

test.describe('Assignment targeting resolver (category / tag / exclusion)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(150000);
    await resetOptionGroups();
    await login(page);
  });

  test('Category rule shows the group only on products in that category', async ({ page }) => {
    const log = new TestLogger('assignment-targeting.spec.ts', 'Category targeting');
    log.start();
    const gid = await makeGroup(page, `Cat ${Date.now()}`);
    const cat = await termId('product_cat', 'accessories');
    log.info(`group=${gid} accessories term=${cat}`);
    await setAssignments(gid, [{ type: 'category', id: cat }]);

    await log.step(page, 1, 'Visible on Product A (in Accessories)');
    expect(await productHasAddons(page, 'product-a')).toBe(true);

    await log.step(page, 2, 'Absent on Product D (not in Accessories)');
    expect(await productHasAddons(page, 'product-d')).toBe(false);
    log.end('passed');
  });

  test('Tag rule shows the group only on products with that tag', async ({ page }) => {
    const log = new TestLogger('assignment-targeting.spec.ts', 'Tag targeting');
    log.start();
    const gid = await makeGroup(page, `Tag ${Date.now()}`);
    const tag = await termId('product_tag', 'featured');
    log.info(`group=${gid} featured term=${tag}`);
    await setAssignments(gid, [{ type: 'tag', id: tag }]);

    await log.step(page, 1, 'Visible on Product C (tagged Featured)');
    expect(await productHasAddons(page, 'product-c')).toBe(true);

    await log.step(page, 2, 'Absent on Product A (not tagged Featured)');
    expect(await productHasAddons(page, 'product-a')).toBe(false);
    log.end('passed');
  });

  test('Exclusion rule hides the group on the excluded product (exclusion wins over global)', async ({ page }) => {
    const log = new TestLogger('assignment-targeting.spec.ts', 'Exclusion');
    log.start();
    const gid = await makeGroup(page, `Excl ${Date.now()}`);
    const prodA = await productId('product-a');
    log.info(`group=${gid} excluding product-a=${prodA}`);
    // Global include (priority 10) + product exclusion (priority 5). Exclusion must
    // win regardless of priority.
    await setAssignments(gid, [
      { type: 'global', id: 0, priority: 10 },
      { type: 'product', id: prodA, exclude: true, priority: 5 },
    ]);

    await log.step(page, 1, 'Absent on the excluded Product A');
    expect(await productHasAddons(page, 'product-a')).toBe(false);

    await log.step(page, 2, 'Present on Product D (global include still applies)');
    expect(await productHasAddons(page, 'product-d')).toBe(true);
    log.end('passed');
  });
});
