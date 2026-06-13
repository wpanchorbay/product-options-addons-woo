#!/bin/bash

# Run build.sh first
echo "Running build.sh..."
bash build.sh "$@"
if [ $? -ne 0 ]; then
    echo "Error: build.sh failed. Packaging aborted."
    exit 1
fi

# Define the slug and zip filename
PLUGIN_SLUG="smart-product-options-addons"
ZIP_NAME="$PLUGIN_SLUG.zip"

# Cleanup previous build if exists
rm -rf dist
rm -f $ZIP_NAME

# Create staging directories
mkdir -p "dist/wordpress/$PLUGIN_SLUG"
mkdir -p "dist/woocommerce/$PLUGIN_SLUG"

# Helper function to copy plugin files to a target path
copy_plugin_files() {
    local DEST=$1
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
    cp changelog.txt "$DEST/"
    cp uninstall.php "$DEST/"
    cp smart-product-options-addons.php "$DEST/"
    cp composer.json "$DEST/"
}

# Copy files to both staging areas
copy_plugin_files "dist/wordpress/$PLUGIN_SLUG"
copy_plugin_files "dist/woocommerce/$PLUGIN_SLUG"

# Create WordPress Zip
echo "Creating WordPress zip..."
cd dist/wordpress
zip -r "$ZIP_NAME" "$PLUGIN_SLUG"
# Remove the folder after zipping to leave only the zip in the subfolder
rm -rf "$PLUGIN_SLUG"
cd ../..

# Create WooCommerce Zip
echo "Creating WooCommerce zip..."
cd dist/woocommerce
zip -r "$ZIP_NAME" "$PLUGIN_SLUG"
# Remove the folder after zipping to leave only the zip in the subfolder
rm -rf "$PLUGIN_SLUG"
cd ../..

echo "------------------------------------------------"
echo "Done! Packages created successfully:"
echo "- dist/wordpress/$ZIP_NAME"
echo "- dist/woocommerce/$ZIP_NAME"
echo ""
echo "Note: The zip files now contain the required parent directory '$PLUGIN_SLUG'."
