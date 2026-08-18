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
# tail -1 strips the "update available" banner qit prints ahead of the actual
# export lines, which otherwise corrupts the sourced file path.
echo "Sourcing environment..."
source "$(qit env:source 2>/dev/null | tail -1)"
export WP_URL="$QIT_BASE_URL"
echo "Target URL: $WP_URL"

# 4. Run the full test suite as 4 SEQUENTIAL Playwright invocations, one per
# phase, instead of a single unfiltered `npx playwright test`.
#
# Why: classic, block-setup, and pro-setup all share classic-setup as their
# only declared dependency. Playwright's scheduler runs all three ready
# sibling projects back-to-back once that shared dependency finishes — it
# does NOT wait for `classic`'s full ~54-test project to drain first, despite
# their declaration order in playwright.config.ts. In a single unfiltered
# run this activates Pro (via pro-setup) *before* classic's own tests run,
# breaking every Free-only assertion (00-pro-absence, locked-pro-ui,
# assignment, conditional-logic, conditional-cascade) in the classic/block
# phases. Invoking each phase as its own process forces the order without
# touching the dependency graph, so single-phase `--project=X` runs (e.g.
# run_single_test.sh) stay exactly as cheap as they are today.
echo "Running full test suite (4 sequential phases)..."
cd tests/e2e
npm install
npx playwright install chromium

overall_status=0

run_phase() {
  echo ""
  echo "=== Phase: $* ==="
  npx playwright test --workers=1 "$@"
  local status=$?
  if [ $status -ne 0 ]; then
    overall_status=1
  fi
  return $status
}

run_phase --project=classic-setup --project=classic
run_phase --project=block-setup --project=block
run_phase --project=pro-setup --project=pro-classic
run_phase --project=pro-block-setup --project=pro-block

echo ""
if [ $overall_status -eq 0 ]; then
  echo "All phases passed."
else
  echo "One or more phases had failures — see output above."
fi
exit $overall_status
