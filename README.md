# OptionBay - Product Options and Addons

A production-ready WooCommerce extension that empowers store owners to offer advanced product customization, paid add-ons, and personalized services. Built with a lightning-fast React/TypeScript admin interface and a robust, highly optimized PHP backend.

## 🚀 Key Features

### 🛒 Storefront Experience
- **11 Custom Field Types**: Support for Text, Textarea, Number, Email, Select, Checkbox, Radio, Color Swatches, Image Swatches, and Static HTML.
- **Dynamic Pricing Engine**: Charge customers for add-ons using Flat Fees or Percentage-based calculations. Prices update instantly on the product page.
- **Conditional Logic**: Build smart, interactive forms. Show or hide fields dynamically based on the customer's previous selections.
- **Instant Hydration**: Field schemas and inventory data are injected directly into the frontend (no slow AJAX calls on page load), ensuring a lightning-fast user experience powered by vanilla JavaScript.
- **Shipping Weight Integration**: Add physical weight to options, which seamlessly integrates with WooCommerce shipping calculations.

### 🛡️ Admin & Architecture
- **Modern React SPA Builder**: A beautiful, drag-and-drop option builder inside the WordPress admin built with React, TypeScript, and Tailwind CSS.
- **Global Inventory Management**: Unlike standard WooCommerce variations, OptionBay uses a custom database table (`wpab_product_options_addons_inventory`) to track stock across *multiple different products*.
- **High-Performance Assignments**: Uses a dedicated lookup table (`wpab_product_options_addons_assignments`) to instantly determine which option groups belong to which products, eliminating slow post-meta queries.
- **Data Portability**: Built-in Import/Export tools allow you to migrate complex option groups and inventory settings between staging and production sites instantly.
- **HPOS Ready**: Fully compatible with WooCommerce High-Performance Order Storage.

---

## 💡 Practical Use Cases

OptionBay is designed for real-world eCommerce scenarios. The plugin includes built-in preloads for:
1. **Gift Wrapping Services**: Options for paper type, ribbon color, and custom card messages.
2. **Laptop Configurators**: Upgrades for RAM, Storage, and warranty plans.
3. **Gourmet Pizza Builders**: Conditional logic for crusts, half-and-half toppings, and premium add-ons.
4. **Custom Apparel**: Sizing, color swatches, fabric choices, and custom text inputs.
5. **Floral Arrangements**: Bouquet sizing, vase types, and delivery date requests.
6. **Auto Detailing Booking**: Service packages, vehicle size upcharges, and à la carte add-ons.

---

## 📁 Directory Structure

```text
optionbay-product-options-addons-woo/
├── app/                        # PHP Backend Application
│   ├── Admin/                  # Admin menu & React script enqueuing
│   ├── Api/                    # Custom REST API endpoints
│   ├── Core/                   # Plugin initialization, Cart logic, Hook management
│   ├── Data/                   # Database installation (dbDelta) & queries
│   ├── Fields/                 # Object-Oriented Field definitions
│   └── Pricing/                # Pricing Strategy pattern implementations
├── assets/                     # Frontend JS/CSS and Preload JSON data
├── src/                        # React / TypeScript source code for Admin SPA
│   ├── components/             # React components (OptionBuilder, Modals, etc.)
│   ├── store/                  # React Context state management
│   └── utils/                  # Zod validation schemas and API helpers
├── optionbay-product-options-addons-woo.php # Main plugin bootstrap file
└── package.json                # NPM build scripts (@wordpress/scripts)
```

---

## 🛠 Developer Workflow

### 1. Requirements
- WordPress 6.0+
- WooCommerce 8.0+
- PHP 7.4+ (8.1+ recommended)
- Node.js 18+ (for development)

### 2. Installation
Clone the repository into your WordPress plugins folder:
```bash
git clone <repo_url> optionbay-product-options-addons-woo
cd optionbay-product-options-addons-woo
```

### 3. Build Assets
Install dependencies and build the React admin interface:
```bash
npm install
npm run build
```
*(For active development with hot-reloading, use `npm run start`)*

---

## 📄 License
GPLv2 or later.
