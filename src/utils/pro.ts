/**
 * Pro-detection helpers.
 *
 * The Free plugin's admin bootstrap (Admin.php) localizes `isPro` and
 * `upgradeUrl` onto `window.opopwPluginLocalize`. These helpers read that
 * data so the admin SPA can show Pro-only features as locked upsell teasers
 * when the Pro add-on is not active. UI-only — no backend gating.
 */

const DEFAULT_UPGRADE_URL =
	'https://wpanchorbay.com/plugins/smart-product-options-addons/#pricing';

export const isProActive = (): boolean =>
	!! ( window as any ).opopwPluginLocalize?.isPro;

export const getUpgradeUrl = (): string =>
	( window as any ).opopwPluginLocalize?.upgradeUrl || DEFAULT_UPGRADE_URL;
