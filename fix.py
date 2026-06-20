import os

plugin_dir = '/var/www/html/wp-content/plugins/product-options-addons-woo'

# Walk the directory
for root, dirs, files in os.walk(plugin_dir):
    if '.git' in root or 'node_modules' in root or 'vendor' in root:
        continue
    for file in files:
        if file.endswith(('.php', '.txt', '.js', '.json', '.xml', '.md', '.css', '.tsx', '.ts', '.sh', '.pot')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue

            new_content = content
            # Prefix replacements
            new_content = new_content.replace('PRODUCT_OPTIONS_ADDONS_WOO', 'OPOPW')
            new_content = new_content.replace('product_options_addons_woo', 'opopw')
            
            # Slug replacements
            new_content = new_content.replace('product-options-addons-woo', 'optionbay-product-options-addons-woo')
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

# Rename the main plugin file
old_main_file = os.path.join(plugin_dir, 'product-options-addons-woo.php')
new_main_file = os.path.join(plugin_dir, 'optionbay-product-options-addons-woo.php')
if os.path.exists(old_main_file):
    os.rename(old_main_file, new_main_file)

print("Done text replacements and rename.")
