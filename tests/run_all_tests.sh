#!/bin/bash
# Spin up a fresh QIT environment and run the full Playwright E2E suite.

# Move to the plugin root regardless of where this is invoked from.
cd "$(dirname "$0")/.."

# 1. Teardown for a clean slate.
# NOTE: --all stops EVERY QIT environment on this machine, not just this
# plugin's. -n keeps it non-interactive so the script never blocks on a prompt.
echo "Tearing down all QIT environments for a clean slate..."
qit env:down --all -n > /dev/null 2>&1

# 2. Spin up fresh environment (reads ./qit.json)
echo "Spinning up new QIT environment..."
qit env:up -n

# 3. Source environment dynamically
echo "Sourcing environment..."
source "$(qit env:source)"
export WP_URL="$QIT_BASE_URL"
echo "Target URL: $WP_URL"

# 4. Run full test suite
echo "Running full test suite..."
cd tests/e2e
npm install
npx playwright install chromium
npx playwright test --workers=1
