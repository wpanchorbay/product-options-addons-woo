=== OptionBay - Product Options and Addons ===
Contributors: wpanchorbay, sankarsan
Tags: woocommerce, product options, addons, extra product options, conditional logic
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
WC requires at least: 8.0
WC tested up to: 8.7
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add custom product options, add-ons, and extra fields to WooCommerce products with advanced pricing, inventory, and conditional logic.

== Description ==

**OptionBay - Product Options and Addons** is a production-ready WooCommerce extension designed to handle everything from simple gift wrapping options to complex product configurators. 

Built with a lightning-fast React SPA for the admin builder and a highly optimized PHP architecture for the frontend, OptionBay ensures your store remains fast, no matter how complex your product options become.

= Core Features =
* **11 Custom Field Types**: Add Text, Textarea, Number, Email, Select Dropdowns, Checkboxes, Radio Buttons, Color Swatches, Image Swatches, and Static Content fields to your products.
* **Dynamic Pricing Engine**: Charge for add-ons using Flat Fees or Percentages. Prices update dynamically on the frontend.
* **Conditional Logic**: Build smart forms that show or hide fields based on what the customer has already selected.
* **True Global Inventory**: Unlike standard WooCommerce variations, OptionBay allows you to pool inventory. You can create a stock of 50 "Gift Boxes" and offer them as an add-on across hundreds of different products.
* **Shipping Weight Integration**: Add physical weight to specific options to ensure your shipping carriers calculate accurate rates at checkout.
* **Lightning Fast Frontend**: Option schemas and inventory data are injected directly into the page source (hydration). There are no slow AJAX loading spinners when a customer views a product.
* **High-Performance Database**: Uses custom, indexed database tables (`wpab_product_options_addons_assignments`) instead of slow post-meta queries to determine which options belong to which products.
* **Data Portability**: Instantly import and export complex option groups between your staging and production environments using JSON.
* **HPOS Ready**: Fully compatible with WooCommerce High-Performance Order Storage.

= Built-in Practical Preloads =
Get started instantly with 6 highly practical, pre-built templates covering real-world eCommerce scenarios:
1. Gift Wrapping Service
2. Laptop Configurator
3. Gourmet Pizza Builder
4. Custom Apparel 
5. Floral Arrangement Options
6. Auto Detailing Booking

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/optionbay-product-options-addons-woo` directory, or install the plugin directly through the WordPress plugins screen.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Navigate to **Products > Options** in your WordPress dashboard to start building.

== Frequently Asked Questions ==

= Does this plugin require WooCommerce? =
Yes, OptionBay requires WooCommerce to be active. It integrates deeply with the WooCommerce cart, checkout, order meta, and shipping calculations.

= Can I use this instead of WooCommerce Variations? =
Yes! OptionBay is a great alternative to WooCommerce Variations, especially if you have products with dozens of customizable components (which would result in thousands of messy variations). OptionBay calculates pricing and inventory on the fly.

= Does inventory tracking work across multiple products? =
Yes. This is a standout feature of OptionBay. You can create a single inventory pool (e.g., "Premium Leather Material") and link it to an option field on 50 different products. If someone buys Product A, the material inventory is reduced, and Product B will respect that updated stock level.

= Will this slow down my product pages? =
No. OptionBay is built for scale. We use custom lookup tables for product assignments and "hydrate" the frontend JavaScript with data on initial page load, completely avoiding slow secondary AJAX requests.

== Screenshots ==

1. The React-powered Option Builder featuring drag-and-drop ordering and conditional logic.
2. The Global Inventory Management dashboard.
3. A product page demonstrating Color Swatches and dynamic pricing updates.
4. The Cart and Checkout screens showing itemized add-on details.

== Changelog ==

= 1.1.0 =
* Major Refactor: Transitioned to a decoupled React/TypeScript Admin SPA.
* Introduced 6 new practical preload templates.
* Enforced strict Zod schema validation across the API.
* Replaced legacy options with robust, multi-choice field support.

= 1.0.0 =
* Initial release.
