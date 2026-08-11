#!/bin/bash
# Run specific Playwright spec(s) against the current QIT environment.
# Usage:
#   ./tests/run_single_test.sh [tests/<spec>.spec.ts] [extra playwright args...]
#   ./tests/run_single_test.sh tests/text-input.spec.ts --project=classic
#
# Tests run as a theme matrix (classic + block). Pass --project=classic or
# --project=block to run a single phase.

# Move to the plugin root regardless of where this is invoked from.
cd "$(dirname "$0")/.."

ENV_FILE=$(qit env:source)
source "$ENV_FILE"
export WP_URL="$QIT_BASE_URL"

cd tests/e2e
if [ "$#" -eq 0 ]; then
  set -- tests/smoke.spec.ts
fi
npx playwright test "$@" --workers=1
