#!/bin/bash
# Package the plugin and run QIT managed (cloud) quality tests against the zip.
# Requires QIT auth (partner token) for the cloud tests to actually execute.

# Move to the plugin root directory where package.sh is located.
cd "$(dirname "$0")/.."

# 1. Package the zip file
echo "Packaging the extension..."
./package.sh

ZIP_PATH="./dist/woocommerce/optionbay-product-options-addons-woo.zip"
SLUG="optionbay-product-options-addons-woo"

if [ ! -f "$ZIP_PATH" ]; then
    echo "Error: Zip file was not generated properly at $ZIP_PATH"
    exit 1
fi

echo "================================================="
echo "Zip package created. Running Managed QIT Tests..."
echo "================================================="

# Define all the tests to run
tests=(
    "run:activation"
    "run:api"
    "run:malware"
    "run:performance"
    "run:phpcompatibility"
    "run:phpstan"
    "run:plugin-check"
    "run:security"
    "run:validation"
    "run:woo-api"
    "run:woo-e2e"
)

for test_cmd in "${tests[@]}"; do
    echo "======================================"
    echo "Running $test_cmd..."
    echo "======================================"
    # Run the test against the generated zip
    qit "$test_cmd" "$SLUG" --zip="$ZIP_PATH"
    echo ""
done

echo "All Managed QIT Tests have been run/enqueued!"
