# OptionBay - Product Options and Addons (Free) E2E Test Suite

End-to-End tests for the **Free** plugin, powered by [Playwright](https://playwright.dev/)
and integrated with the [WooCommerce Quality Insights Toolkit (QIT)](https://qit.woo.com/).

QIT is used here as an **environment provider**: `qit env:up` spins up an ephemeral
WordPress + WooCommerce site with this plugin installed, and Playwright runs directly
against it. See the runner scripts in `../` (`run_all_tests.sh`, `run_single_test.sh`).

## Running locally

```bash
# From the plugin root:
./tests/run_all_tests.sh            # fresh env + full suite
./tests/run_single_test.sh tests/smoke.spec.ts   # single spec against current env
```

Or manually:

```bash
qit env:up -n
source "$(qit env:source)"
export WP_URL="$QIT_BASE_URL"
cd tests/e2e && npm install && npx playwright install chromium
npx playwright test
```

## Structure

- `qit-test.json` — QIT test-package manifest (also enables native `qit run:e2e`).
- `playwright.config.ts` — reads `WP_URL`, emits a CTRF report to `test-results/`.
- `tests/helpers.ts` — login + WooCommerce wizard bypass.
- `tests/test-logger.ts` — pretty console logging shared across specs.
- `tests/smoke.spec.ts` — plugin-active + admin-menu checks.
