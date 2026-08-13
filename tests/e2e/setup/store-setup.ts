/**
 * Shared store setup used by the classic/block setup projects.
 *
 * Runs wp-cli inside the QIT WordPress container via `@woocommerce/qit-runtime`,
 * with a docker-exec fallback (mirrors the pattern in Pro's original 00-setup).
 * Identical copy lives in both plugins (like helpers.ts / test-logger.ts).
 */
import qit from '@woocommerce/qit-runtime';
import type { RenderMode } from '../fixtures';

const { execSync } = require('child_process');

/** Run a `wp <command>` in the container. Returns stdout (trimmed). */
export async function wpCli(command: string): Promise<string> {
  try {
    // qit.wp() runs `docker exec <c> wp <command> --allow-root` via a shell.
    const out = await qit.wp(command);
    return typeof out === 'string' ? out.trim() : '';
  } catch (e) {
    const container = execSync('docker ps --format "{{.Names}}" | grep qit_env_php_')
      .toString()
      .trim()
      .split('\n')[0];
    if (!container) throw e;
    return execSync(`docker exec ${container} wp ${command} --allow-root`).toString().trim();
  }
}

async function getOpt(name: string): Promise<string> {
  return (await wpCli(`option get ${name}`).catch(() => '')).trim();
}
async function setOpt(name: string, value: string): Promise<void> {
  await wpCli(`option update ${name} '${value}'`).catch(() => {});
}

/** Folder slug QIT provisions the Pro add-on under (see qit.json). */
export const PRO_PLUGIN_SLUG = 'optionbay-product-options-addons-woo-pro';

/**
 * Activate or deactivate the Pro add-on by slug, so the same spec files can be
 * run once with Free alone and once with Free+Pro (regression pass). QIT
 * installs (and may auto-activate) every plugin listed in qit.json's
 * environments.default.plugins, so this is also used defensively at the start
 * of the free-only phase to guarantee a clean baseline.
 */
export async function togglePlugin(slug: string, active: boolean): Promise<void> {
  await wpCli(`plugin ${active ? 'activate' : 'deactivate'} ${slug}`).catch(() => '');
}

/** Option-group custom post type slug. */
export const OPTION_GROUP_CPT = 'opopw_option_group';

/**
 * Delete every option group and clear cart sessions/transients. Call in each
 * spec's beforeEach so tests are isolated — otherwise "apply to all products"
 * groups accumulate on every product and pollute selectors/totals.
 */
export async function resetOptionGroups(): Promise<void> {
  const ids = (await wpCli(`post list --post_type=${OPTION_GROUP_CPT} --format=ids`)).trim();
  if (ids) await wpCli(`post delete ${ids} --force`).catch(() => '');
  await wpCli('transient delete --all').catch(() => '');
  await wpCli(
    `eval 'global $wpdb; $wpdb->query("DELETE FROM {$wpdb->prefix}woocommerce_sessions");'`
  ).catch(() => '');
}

/** Products seeded for every run (slug → regular price). */
export const PRODUCTS: Array<{ name: string; slug: string; price: string }> = [
  { name: 'Product A', slug: 'product-a', price: '100' },
  { name: 'Product B', slug: 'product-b', price: '50' },
  { name: 'Product C', slug: 'product-c', price: '75' },
  { name: 'Product D', slug: 'product-d', price: '120' },
  { name: 'Product E', slug: 'product-e', price: '200' },
];

export const CATEGORY = { name: 'Accessories', slug: 'accessories' };
export const TAG = { name: 'Featured', slug: 'featured' };

async function productIdBySlug(slug: string): Promise<string> {
  return (await wpCli(`post list --post_type=product --name=${slug} --field=ID --format=ids`)).trim();
}

/** Seed permalinks, a category + tag, products A–E, COD, and skip onboarding. */
export async function seedStore(): Promise<void> {
  await wpCli(`rewrite structure '/%postname%/' --hard`);
  await wpCli('rewrite flush --hard');

  // Taxonomy terms (idempotent — ignore "already exists").
  await wpCli(`term create product_cat "${CATEGORY.name}" --slug=${CATEGORY.slug}`).catch(() => '');
  await wpCli(`term create product_tag "${TAG.name}" --slug=${TAG.slug}`).catch(() => '');

  for (const p of PRODUCTS) {
    const existing = await productIdBySlug(p.slug);
    if (!existing) {
      await wpCli(
        `wc product create --name="${p.name}" --slug=${p.slug} --regular_price=${p.price} ` +
          `--status=publish --type=simple --virtual=true --user=1`
      );
    }
  }

  // Assign A & B to the category, C to the tag (for assignment tests).
  const a = await productIdBySlug('product-a');
  const b = await productIdBySlug('product-b');
  const c = await productIdBySlug('product-c');
  if (a) await wpCli(`post term add ${a} product_cat ${CATEGORY.slug}`).catch(() => '');
  if (b) await wpCli(`post term add ${b} product_cat ${CATEGORY.slug}`).catch(() => '');
  if (c) await wpCli(`post term add ${c} product_tag ${TAG.slug}`).catch(() => '');

  // Payments + onboarding.
  await wpCli(`option update woocommerce_cod_settings '{"enabled":"yes"}' --format=json`).catch(() => '');
  await wpCli(`option update woocommerce_onboarding_profile '{"completed":true}' --format=json`).catch(() => '');
  // Disable the "Launch Your Store" coming-soon splash, which gates the storefront.
  await wpCli(`option update woocommerce_coming_soon 'no'`).catch(() => '');

  await ensureModePages();
}

/**
 * Prepare cart/checkout pages for both modes without destroying WooCommerce's
 * original block pages: remember the originals (block), and create parallel
 * shortcode pages (classic). setCartCheckoutPages() then just flips the
 * woocommerce_*_page_id options between them.
 */
async function ensureModePages(): Promise<void> {
  if (!(await getOpt('opopw_e2e_block_cart'))) {
    await setOpt('opopw_e2e_block_cart', await getOpt('woocommerce_cart_page_id'));
    await setOpt('opopw_e2e_block_checkout', await getOpt('woocommerce_checkout_page_id'));
  }
  if (!(await getOpt('opopw_e2e_classic_cart'))) {
    const cart = (
      await wpCli(
        `post create --post_type=page --post_status=publish --post_title='Cart (Classic E2E)' --post_content='[woocommerce_cart]' --porcelain`
      )
    ).trim();
    const checkout = (
      await wpCli(
        `post create --post_type=page --post_status=publish --post_title='Checkout (Classic E2E)' --post_content='[woocommerce_checkout]' --porcelain`
      )
    ).trim();
    await setOpt('opopw_e2e_classic_cart', cart);
    await setOpt('opopw_e2e_classic_checkout', checkout);
  }
}

/**
 * Activate the theme appropriate for the render mode.
 * Classic → Storefront (pre-installed & active in the QIT env by default).
 * Block   → Twenty Twenty-Four (installed at runtime; wp.org reachable from wp-cli).
 */
export async function activateTheme(mode: RenderMode): Promise<void> {
  if (mode === 'block') {
    await wpCli('theme install twentytwentyfour').catch(() => '');
    await wpCli('theme activate twentytwentyfour');
  } else {
    await wpCli('theme activate storefront');
  }
}

/** Flip the Cart/Checkout page ids to the classic (shortcode) or block pages. */
export async function setCartCheckoutPages(mode: RenderMode): Promise<void> {
  await ensureModePages();
  const cartId = await getOpt(mode === 'block' ? 'opopw_e2e_block_cart' : 'opopw_e2e_classic_cart');
  const checkoutId = await getOpt(mode === 'block' ? 'opopw_e2e_block_checkout' : 'opopw_e2e_classic_checkout');
  if (cartId) await setOpt('woocommerce_cart_page_id', cartId);
  if (checkoutId) await setOpt('woocommerce_checkout_page_id', checkoutId);
}

/** Full setup for a mode: theme + cart/checkout pages (+ seed on classic). */
export async function setupForMode(mode: RenderMode): Promise<void> {
  if (mode === 'classic') {
    await seedStore();
  }
  await activateTheme(mode);
  await setCartCheckoutPages(mode);
}
