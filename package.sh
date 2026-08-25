#!/bin/bash

# Run build.sh first
echo "Running build.sh..."
bash build.sh "$@"
if [ $? -ne 0 ]; then
    echo "Error: build.sh failed. Packaging aborted."
    exit 1
fi

# Define the slug and zip filename
PLUGIN_SLUG="optionbay-product-options-addons-woo"
ZIP_NAME="$PLUGIN_SLUG.zip"

# Cleanup previous build if exists
rm -rf dist
rm -f $ZIP_NAME

# Helper function to copy plugin files to a target path
copy_plugin_files() {
    local DEST=$1
    local TRIM=$2
    echo "Copying files to $DEST..."

    # Copy folders
    cp -r app "$DEST/"
    cp -r languages "$DEST/"
    cp -r assets "$DEST/"
    cp -r build "$DEST/"
    cp -r vendor "$DEST/"
    cp -r config "$DEST/"

    # Copy files
    cp index.php "$DEST/"
    cp readme.txt "$DEST/"
    cp uninstall.php "$DEST/"
    cp optionbay-product-options-addons-woo.php "$DEST/"
    cp composer.json "$DEST/"
    [ -f changelog.txt ] && cp changelog.txt "$DEST/"

    # For the WordPress.org build, drop dev/debug artifacts that are never enqueued.
    if [ "$TRIM" = "trim" ]; then
        rm -f "$DEST"/build/*.map "$DEST"/build/*-legacy.js "$DEST"/build/*.LICENSE.txt
    fi
}

# Create WordPress Zip (files at archive root -- no wrapping folder)
echo "Creating WordPress zip..."
mkdir -p "dist/wordpress/staging"
copy_plugin_files "dist/wordpress/staging" "trim"
cd dist/wordpress/staging
zip -r "../$ZIP_NAME" .
cd ../../..
rm -rf "dist/wordpress/staging"

# Create WooCommerce Zip (keeps the wrapping folder)
echo "Creating WooCommerce zip..."
mkdir -p "dist/woocommerce/$PLUGIN_SLUG"
copy_plugin_files "dist/woocommerce/$PLUGIN_SLUG"
cd dist/woocommerce
zip -r "$ZIP_NAME" "$PLUGIN_SLUG"
# Remove the folder after zipping to leave only the zip in the subfolder
rm -rf "$PLUGIN_SLUG"
cd ../..

# dist/svn/trunk mirrors the real WordPress.org SVN layout (trunk/ IS the
# plugin root, no plugin-slug wrapper) -- rsync straight into an svn working
# copy's trunk/ for `svn commit`. Left as a plain folder on purpose (not
# zipped, not removed after) since that's how svn expects it. Trimmed like
# the WordPress zip, since this is the same wp.org-facing file set.
echo "Creating dist/svn/trunk..."
mkdir -p "dist/svn/trunk"
copy_plugin_files "dist/svn/trunk" "trim"

echo "------------------------------------------------"
echo "Done! Packages created successfully:"
echo "- dist/wordpress/$ZIP_NAME"
echo "- dist/woocommerce/$ZIP_NAME"
echo "- dist/svn/trunk/ (uncompressed, ready for \`svn commit\` into a checkout's trunk/)"
echo ""
echo "Note: WordPress zip has files at the archive root (no '$PLUGIN_SLUG/' folder);"
echo "      WooCommerce zip keeps the '$PLUGIN_SLUG/' parent directory."
