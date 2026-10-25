# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This is the **Free** plugin (`optionbay-product-options-addons-woo`) — a WooCommerce extension that adds configurable product options/add-ons: 13 field types (text, textarea, number, email, select, checkbox, checkboxes, radio, date, time, datetime, color swatch, image swatch, static content), dynamic pricing (flat/percentage), server-verified conditional logic, and a global cross-product inventory system. It ships the actual engine — fields, cart integration, admin React SPA, REST API, DB layer.

A separate **Pro** add-on plugin (`optionbay-product-options-addons-woo-pro`, sibling directory) extends this at defined hook points; it cannot run standalone. Pro never modifies Free files — see its CLAUDE.md for the extension contract from that side. This file documents the Free side of that contract.

## Commands

```bash
# JS build (from package.json, via @wordpress/scripts / webpack)
npm run build            # modern build → build/options.js, build/settings.js
npm run start            # modern watch
npm run build:legacy     # legacy build (BUILD_TARGET=legacy, babel-loader, self-contained) → build/options-legacy.js, build/settings-legacy.js
npm run start:legacy

# PHP lint (WordPress-Extra + WordPress-Docs; config in phpcs.xml.dist)
npm run lint             # phpcs
npm run lint-stat        # phpcs summary
npm run lint-fix         # phpcbf (auto-fix)

# i18n
npm run makepot          # regenerate .pot (excludes node_modules, vendor, src)
npm run make-json        # JS translations

# Composer (PHP deps → vendor/, PSR-4 namespace Opopw\ → app/)
composer install
```

**Release:** `./build.sh [version]` runs both JS builds, renames legacy `.LICENSE.txt` files, and prepends copyright/attribution headers. `./package.sh [version]` runs `build.sh` then produces two zips under `dist/`: `wordpress/` (WordPress.org layout, no wrapper folder, strips `.map`/`-legacy.js`/`.LICENSE.txt`) and `woocommerce/` (wrapped in a folder, keeps full build artifacts — used for QIT managed-test uploads). Both exclude `src/` and `node_modules/`; only compiled `build/` output ships.

There is no PHP/JS unit test suite, and **this repo no longer contains any tests**.

The whole E2E suite lives in the **Pro** repo (`../optionbay-product-options-addons-woo-pro`),
matching the convention already used by notifybaypro, tubebaypro and pointbaypro: Pro is the QIT
SUT and Free is installed alongside it as a sibling, so the free plugin is exercised by
*deactivating Pro at runtime* rather than by a second suite. Maintaining two suites here is what
let them drift apart — Free's had 39 specs / 103 tests, Pro's a 21-spec fork of the same ground.

- **To test the free plugin**, from the Pro repo: `bash tests/run_free_tests.sh`. It brings up the
  environment, deactivates Pro, and runs only the projects that skip every `*.pro.spec.ts`.
  `tests/e2e/tests/00-pro-absence.spec.ts` asserts Pro is genuinely inactive and must **pass**
  there — it is the guard that stops a free release being certified while Pro is live. Don't
  remove or weaken it when touching Free/Pro coupling code.
- **Managed (cloud) QIT tests for the free zip**, also from the Pro repo:
  `bash tests/run_qit_managed_tests.sh --free` — it packages *this* plugin and runs the checks
  against Free's own slug.
- `qit.json` here is retained but unused by the suite; the environment is defined by Pro's.
- `.github/workflows/phpcs.yml` (WPCS + PHPCompatibility for PHP 7.4–8.3) is the only workflow
  left. `tests.yml` was removed with the suite; E2E now runs from the Pro repo's workflow.

## Bootstrap & wiring

`optionbay-product-options-addons-woo.php` defines constants (`OPOPW_PATH`, `OPOPW_URL`, `OPOPW_VERSION`, `OPOPW_TEXT_DOMAIN`, `OPOPW_DEV_MODE` — currently hardcoded `true`), loads the Composer autoloader + `app/functions.php`, registers activation/deactivation (`Core\Activator` / `Core\Deactivator`), and calls `Core\Plugin::get_instance()->run()` on `plugins_loaded`. HPOS compatibility is declared via `FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true)` on `before_woocommerce_init`.

`Core\Plugin::run()` is config-driven, mirroring the Pro plugin's pattern:
- `config/core.php` → list of core classes, each instantiated and `run($plugin)` called; inside, they grab `$plugin->get_loader()` and queue hooks.
- `config/api.php` → list of REST controllers registered on `rest_api_init`.

`Helper\Loader` is the deferred hook queue (`add_action`/`add_filter` collected via component `run()` calls, then `Plugin::run()` calls `$loader->run()` to flush them into WordPress).

## Feature subsystems

- **Fields** (`app/Fields/`): `InterfaceField` (contract: `render()`, `validate()`, `sanitize()`, `get_display_value()`, `get_weight()`) → `BaseField` (abstract; builds the `opopw_addons[{group_id}][{field_id}]` field name, wrapper markup incl. `data-*` attrs for JS conditional-logic/pricing, default validate/sanitize/price-label logic; concrete types implement `render_input()`) → concrete classes (`TextField`, `NumberField`, `SelectField`, `ColorSwatchField`, etc.). **`FieldFactory`** is the registry: a static `$types` map filtered through `apply_filters('opopw_register_field_types', ...)` — this is the primary Pro extension point for adding new field types. The separate server-side allow-list for schema validation lives in `AddonGroupController` via `opopw_allowed_field_types` and can drift from `FieldFactory`'s render-time exclusions — check both when adding a type.
- **Pricing** (`app/Pricing/`): Strategy pattern — `PricingEngine` maps `'flat'`/`'percentage'` to a `*Strategy` class.
- **Conditional logic** (`app/Helper/ConditionEvaluator.php`): server-side re-evaluation of ALL/ANY field-visibility rules against submitted form data, so cart submissions can't bypass hidden-field rules — must mirror what the client-side JS conditional logic shows.
- **Cart integration** (`app/Core/CartManager.php`): validates/sanitizes submitted addon values, computes cart item pricing, handles stock reduction intents, formats cart/order line item display. This is the single biggest concentration of `opopw_*` extension filters (`opopw_cart_validate_field_value`, `opopw_cart_process_field_value`, `opopw_stock_reduction_intent`, `opopw_calculate_reduction`, `opopw_cart_display_field`, `opopw_order_display_field`, `opopw_ajax_calculate_totals`) — the checkout/pricing pipeline Pro hooks into.
- **Rendering** (`app/Core/AddonRenderer.php`): renders field HTML on the product page (`opopw_render_field_html`, `opopw_product_group_ids`).
- **Inventory/DB** (`app/Data/DbManager.php`, `InventoryManager.php`): custom tables `wpab_product_options_addons_inventory` (cross-product global stock pools) and `wpab_product_options_addons_assignments` (fast product→group lookup, avoids postmeta scans), created via `dbDelta`.
- **REST API** (`app/Api/`): all controllers extend `ApiController` (namespace `OPOPW_TEXT_DOMAIN`, version `v1`; permission check via `manage_woocommerce` cap + nonce; `validate()` wraps `rakit/validation`'s `Validator` for Laravel-style rules, returns `WP_Error` 422 on failure). Controllers: `AddonGroupController` (largest — CRUD for groups/fields/assignment rules), `ResourceController` (product/category/tag search for Assignment Rules UI), `InventoryController`, `SettingsController`, `ExportImportController`.
- **Admin bootstrap** (`app/Admin/Admin.php`): registers the "Options" submenu + WC settings tab, `enqueue_resources()` loads `build/{options|settings}.js/.css` (asset-file cache-busting via `build/{context}.asset.php`, filterable per-context via `opopw_admin_script_{$context}`/`opopw_admin_css_{$context}`), localizes `window.opopwPluginLocalize` (filterable via `opopw_admin_localize`).

## Admin React SPA (`src/`)

Two separate webpack entries/bundles, each conditionally enqueued based on the active admin screen:
- `src/options.tsx` → `<OptionsApp/>`, mounted into `#optionbay-product-options-addons-woo`.
- `src/settings.tsx`/`SettingsApp.tsx` → WC settings tab bundle.

**Free/Pro JS coupling**: `options.tsx` exposes `window.opopw = { useAddonContext, ClassicMultiSelect, ClassicSettingsTable, renderProductOption, FormError }` so Pro's JS can reach into Free's runtime/components without a build-time dependency.

- **Routing**: `OptionsApp.tsx` uses `react-router-dom` v7 `HashRouter` (`""`/`option-groups`, `option-groups/new`, `option-groups/:id`), wrapped by `ClassicLayout`; `useMenuSync()` keeps WP admin menu highlighting in sync.
- **State**: React Context, not Redux — `src/store/wpabStore.tsx` (global app state), `src/store/AddonContext.tsx` (option-group/field editing state — also where new-field defaults are built), `src/store/toast/use-toast.tsx`.
- **Key directories**: `src/components/addonBuilder/` (drag-and-drop builder: `OptionEditor`, `FieldRow`, `ConditionEditor`, `AssignmentRules`, `InventoryPicker`, `BuilderHeader`/`BuilderSidebar`), `src/components/classics/` (WP-admin-styled base UI kit), `src/components/common/` (modals, popovers, toasts, WPEditor wrapper), `src/components/addonList/`, `src/components/settings/`. `src/pages/` holds route components (`AddonList.tsx`, `AddonBuilder.tsx`, `Settings.tsx`).
- **Utils**: `src/utils/apiFetch.ts` (wraps `@wordpress/api-fetch`), `src/utils/validation.ts` (Zod schemas).

**`@wordpress/hooks` filters fired on the Free side** (JS-side extension points for Pro — only `applyFilters`, no `doAction`):
- `opopw_field_types` (`src/components/addonBuilder/constants.ts`) — builder's `FIELD_TYPES` array.
- `opopw_field_defaults` (`src/store/AddonContext.tsx`) — default schema for a new field of a given type.
- `opopw_field_settings` (`src/components/addonBuilder/FieldRow.tsx`) — settings-panel field list per field type.
- `opopw_assignment_rules_component` (`src/pages/AddonBuilder.tsx`) — which component renders the Assignment Rules panel.
- `opopw_settings_sections` (`src/pages/Settings.tsx`) — extra nodes injected into the Settings page.

## Styling

Tailwind prefix is **`opopw-`** (`tailwind.config.js`: `prefix: "opopw-"`, `content: ["./src/**/*.{js,jsx,ts,tsx}"]`), with a custom color palette and a plugin adding hand-rolled utility classes (`.p-x-page-default`, `.hide-spin-button`, etc.). Built via `@wordpress/scripts`' PostCSS pipeline (Sass + Tailwind + Autoprefixer); output lands in `build/options.css` / `build/settings.css`, enqueued by `Admin::enqueue_resources()`. Frontend styles are separate and NOT built by webpack — `assets/css/public.css` is a plain static asset enqueued unconditionally on the frontend.

Since Pro ships no CSS of its own and relies on these same `opopw-` Tailwind classes being present in Free's tree-shaken build, any new `opopw-*` utility used only by Pro components must also appear somewhere in Free's `src/` (even Pro-only classes need a Free usage to survive tree-shaking) — see the Pro plugin's CLAUDE.md for the full explanation of this gotcha.

## Notes

- Custom capabilities: `manage_opopw_options_addons`, `manage_woocommerce` (declared in `phpcs.xml.dist` for the `WordPress.WP.Capabilities` sniff).
- Plugin requires WordPress 6.8+, WooCommerce 8.0+, PHP 7.4+ (8.1+ recommended), Node 18+.
- `OPOPW_DEV_MODE` is currently hardcoded `true` in the main plugin file.
- Bundles a vendored `vendor/deactivation-feedback` package (`WPAB\DeactivationFeedback\`) for the deactivation-survey/review-nag feature, wired in the main plugin file on `init`.

## Docs

User-facing documentation lives in a separate VitePress site: `/home/sdd/Documents/campaign-bay-testing/docs/optionbay` (`docs/` — field types, pricing strategies, conditional logic, inventory/stock, admin builder, export/import, etc.). It is not part of this repo and is not built/deployed from here.

When a change to this plugin **or** the Pro plugin (`optionbay-product-options-addons-woo-pro`) is a major one — a new/removed field type, a new pricing strategy, a changed admin UI flow (builder, assignment rules, settings), a changed conditional-logic/validation behavior, or a new/changed REST endpoint that affects documented behavior — call this out explicitly and suggest which doc page(s) under that docs site likely need updating. Minor refactors, bug fixes, or internal-only changes don't need this.

## Known issues

### Preloader duplicates (fixed in 1.0.3; old duplicates remain)

Earlier releases created a second set of the six demo groups on every activation, because
`Activator::activate()` reset all settings to defaults (clearing `global_isPreloaded`) and
`Preloader::run()` guarded only on that flag. Fixed in 1.0.3: activation now only fills in
missing settings keys (saved values are kept), and `Preloader` stamps each demo post with
`_opopw_preloaded_key` (sanitized title) and skips any template whose stamped post already
exists in any status, trash included. Duplicate demo groups created by earlier versions
carry no stamp and are NOT removed automatically (they are user data); delete them manually
from the Option Groups list if unwanted. Note that pre-1.0.3 demo groups also lack the stamp,
so a site that still has them and lost the flag would get one more stamped set.

## Release process

Triggers: "make a zip", "make a release zip", "update the version", "is it ready to release".

- **Version bump:** fetch `https://api.wordpress.org/plugins/info/1.0/optionbay-product-options-addons-woo.json`, take its `"version"`, bump the patch number by 1. Compare to the version already in the plugin header — use whichever is higher, never decrease.
- **Update the version** in: `optionbay-product-options-addons-woo.php` `Version:` header, `define( 'OPOPW_VERSION', ... )`, `package.json` `"version"`, `readme.txt` `Stable tag:`, `languages/product-options-addons-woo.pot` `Project-Id-Version`.
- **Changelog / Upgrade Notice:** draft new `== Changelog ==` and `== Upgrade Notice ==` entries in `readme.txt` from what was built this session, matching the existing `* Fixed: ...` / `* Added: ...` / `* Security: ...` bullet style. Confirm the draft with the user before writing it.
- **Build & zip:** `./build.sh [version]` then `./package.sh [version]` (both already accept a version arg and produce `dist/wordpress/` + `dist/woocommerce/` zips — see Commands above).
- **Ready to release** = version synced everywhere above, changelog/upgrade notice written, both zips build cleanly. Mention the `wp-plugin-review` skill as an optional deeper security/WPCS check — don't run it automatically.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Browser / QA rule: keep the site clean, only WooCommerce active

The resting state of the shared dev site is: ONLY woocommerce is active.
Every other plugin stays deactivated unless a test needs it right now.

Before any browser test:

1. Make sure every plugin except woocommerce is deactivated
   (wp plugin list --status=active --field=name).
2. Activate ONLY the plugins this test needs:
   - the plugin under test (and its Pro add-on, when testing Pro)
   - any other plugin the test truly depends on
3. If any error, warning or notice shows up (on the page, in the
   browser console, or in wp-content/debug.log) while ONLY the needed
   plugins are active, TRACE IT. Find the exact file and line that
   causes it, and say whether it comes from the plugin under test,
   WooCommerce, WordPress or the theme. To check whether the plugin
   under test is the cause, deactivate it and reload: if the error
   stays, it is not the plugin's. Report the finding. Fix it only if
   it is in the plugin under test.
   If you find an error while an unneeded plugin is still active,
   that is your mistake: deactivate it first and re-check before
   tracing anything.
   STOP RULE: while an error is visible on a page you are testing,
   do not carry on testing that page as if all is well. Trace it
   to the exact file and line, report who owns it, and tell the
   user straight away. Only continue after the user has seen the
   finding. A note in your brief saying an error is "known" or
   "already traced" does NOT let you skip this: you must still see
   the error cleared, or the user must say to go on despite it.
   Also stop and report if any error appears in the browser console
   or in debug.log for the plugin under test.
4. Test.
5. When the test is done, deactivate everything you activated, so
   only woocommerce is active again. Do NOT bring back any other
   plugin.
6. Delete all test data you created (prefix it ZZ-QA so it is easy
   to find) and undo any option or setting you changed.
7. In your report, list which plugins you activated for the test and
   confirm only woocommerce is active now.

Never ask the user to check something you can check yourself.
Never edit plugin code during QA.
