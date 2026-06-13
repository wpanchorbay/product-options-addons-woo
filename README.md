# Smart Product Options and Addons (Classic & Modern)

Production-ready WooCommerce product options and add-ons with a React/TypeScript admin, advanced pricing, inventory tracking, and conditional logic.

## Core Philosophy

This plugin provides a robust, object-oriented PHP backend and a React single-page admin experience for configuring WooCommerce product option groups. It includes **two distinct UI component libraries**: one for modern, custom dashboard interfaces, and another designed specifically to blend seamlessly into native WordPress and WooCommerce settings pages.

---

## 🚀 Key Features

### Robust PHP Backend Architecture

- **OOP Structure & Autoloading**: PSR-4 compliant namespace-to-directory autoloading.
- **Base Singleton Pattern (`Base.php`)**: A reliable singleton abstract class that manages instance creation and automatic hook registration.
- **REST API Infrastructure (`ApiController.php`)**: Secure, extendable base controllers with built-in permission checks and namespace management.
- **Cron Job Manager (`Cron.php`)**: A highly robust API for scheduling, managing, and executing background tasks dynamically.
- **Settings API (`Settings.php`)**: Streamlined abstraction over the WordPress Settings API.
- **Database Orchestration (`DbManager.php`)**: Automated custom table creation and structure updates via `dbDelta()`.
- **Database Logger (`Logger.php`)**: Custom database table logging equipped with JSON context and log-level filtering.
- **White Label Ready**: Fully filterable plugin name, slugs, icons, and URLs via `functions.php`.

### Modern React / TypeScript Frontend

- **SPA Architecture**: Powered by React 18+ and `react-router-dom` for fluid navigation within the WP admin.
- **Dual Component Libraries**:
  - **`common` (Modern UI)**: 30+ reusable Tailwind CSS components (Modals, Toasts, MultiSelects, Steppers, etc.) designed for custom, app-like interfaces.
  - **`classics` (Native UI)**: 10+ components (`ClassicInput`, `ClassicSettingsTable`, `ClassicRepeater`) built to 1:1 match native WooCommerce and WordPress settings aesthetics.
- **Tailwind CSS Integration**: Fully configured Tailwind setup using a custom `spoa-` prefix to prevent style bleed.
- **Preflight Conflict Mitigation**: Custom `spoa-ignore-preflight` guard class integrated into `index.scss` to allow Tailwind usage without destroying native WP/WC typography and input styles.
- **State Management**: React Context stores integrated with `wp_localize_script` data bridges.
- **Production Build System**: Powered by `@wordpress/scripts` (Webpack) for modern and legacy JS builds.

---

## 📁 Directory Structure

```text
spoa-classic/
├── app/                        # PHP Backend Application
│   ├── Admin/
│   │   ├── Admin.php           # Admin menu & localized script enqueuing
│   │   └── index.php
│   ├── Api/                    # REST API Controllers
│   │   ├── ApiController.php   # Base controller with security logic
│   │   ├── LogController.php   # Handles database log retrieval
│   │   ├── SettingsController.php # Manages plugin settings via REST
│   │   └── index.php
│   ├── Core/                   # Core mechanics
│   │   ├── Activator.php       # Plugin activation (tables, defaults)
│   │   ├── Deactivator.php     # Plugin deactivation (cron cleanup)
│   │   ├── Base.php            # Singleton base with auto-hooking
│   │   ├── Plugin.php          # Main coordinator & class loader
│   │   ├── Settings.php        # Settings API abstraction layer
│   │   ├── Cron.php            # Dynamic WP-Cron scheduling engine
│   │   └── index.php
│   ├── Data/
│   │   ├── DbManager.php       # DB schema definitions & dbDelta()
│   │   └── index.php
│   ├── Helper/
│   │   ├── Loader.php          # Action/Filter registration queue
│   │   ├── Logger.php          # Custom DB-based logging system
│   │   └── index.php
│   ├── functions.php           # Global helper functions & white label filters
│   └── index.php
├── config/                     # Configuration registries
│   ├── api.php                 # Registration of REST controllers
│   └── core.php                # Registration of core background classes
├── src/                        # React / TypeScript Frontend (SPA)
│   ├── components/
│   │   ├── classics/           # Native WP/WC style components
│   │   │   ├── ClassicButton.tsx, ClassicCheckbox.tsx, ClassicFormField.tsx
│   │   │   ├── ClassicInput.tsx, ClassicLayout.tsx, ClassicMultiSelect.tsx
│   │   │   ├── ClassicNavbar.tsx, ClassicRepeater.tsx, ClassicSelect.tsx
│   │   │   ├── ClassicSettingsTable.tsx, ClassicTable.tsx, ClassicTooltip.tsx
│   │   │   └── index.ts
│   │   └── common/             # Modern UI library (30+ components)
│   ├── pages/                  # Route views (Dashboard, Logs, Showcase, etc.)
│   ├── store/                  # State management (Context API)
│   ├── styles/                 # SCSS & Tailwind preflight guard system
│   ├── utils/                  # API helpers, types, and hooks
│   ├── App.tsx                 # Router & Layout orchestration
│   └── index.tsx               # Entry point
├── assets/                     # Images, icons, and static media
├── languages/                  # i18n translation files (.pot, .json)
├── vendor/                     # Composer dependencies (PHP)
├── smart-product-options-addons.php        # Plugin bootstrap & autoloader
├── uninstall.php               # Cleanup on plugin deletion
├── rename.sh                   # Script for global find & replace
├── package.json                # NPM configuration
├── composer.json               # Composer configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── webpack.config.js           # Webpack configuration
```

---

## 🛠 Getting Started

### 1. Clone & Rename

Use this repository as a template for your new plugin.

```bash
git clone <repo_url> your-plugin-name
cd your-plugin-name
```

### 2. Global Find & Replace

To white-label the plugin, replace these identifier strings throughout the codebase:

| Find String       | Replace With (Example) | Context                     |
| ----------------- | ---------------------- | --------------------------- |
| `Smart Product Options and Addons`       | `YourNamespace`        | PHP Namespaces              |
| `SMART_PRODUCT_OPTIONS_ADDONS_`      | `YOUR_PLUGIN_`         | PHP Constants               |
| `smart-product-options-addons`       | `your-plugin-slug`     | Text domains, URLs, Classes |
| `smart-product-options-addons`       | `your_plugin_slug`     | PHP Variable/Option names   |
| `spoaPlugin` | `yourPlugin`           | JS Globals                  |
| `Smart Product Options and Addons`       | `Your Plugin Title`    | UI Text                     |
| `spoa-`      | `yourprefix-`          | Tailwind CSS Prefix         |

### 3. Install Dependencies

```bash
npm install
composer install # (If dependencies are added later)
```

### 4. Development Workflow

Launch the Webpack dev server with hot-reload capabilities:

```bash
npm run start
```

_Note: Make sure your local WordPress environment has `SCRIPT_DEBUG` set to `true` to load the development assets._

### 5. Production Build

Compile minified, optimized JS/CSS assets into the `/build` directory:

```bash
npm run build
```

---

## 🎨 Layout & Component Systems

### 1. Dual Layout Support

The admin app includes two layout systems. You can switch between them globally in `src/App.tsx`:

- **`ClassicLayout`**: Default. Provides a native WooCommerce settings experience with `ClassicNavbar` (tabs) and standard WordPress branding.
- **`AppLayout`**: Modern, sidebar-driven dashboard experience designed for custom applications.

### 2. Component Libraries

- **`classics/`**: Use these for native-looking settings pages.
  - `ClassicSettingsTable`: Renders fields in a standard `form-table`.
  - `ClassicNavbar`: Renders native-style tabs with active underline.
  - `ClassicSelect` / `ClassicMultiSelect`: Custom-built to match native styles with search capability.
  - `ClassicTooltip`: 1:1 match of the WooCommerce help tip icon and style.
- **`common/`**: Use these for modern dashboard interfaces where you want full Tailwind control.

### 3. Styling Architecture (Preflight Guard)

Tailwind's preflight resets often break native WordPress styles (like `h2` sizing or input borders). This plugin uses a custom guard:

By adding the **`spoa-ignore-preflight`** class to any element (or its parent), you prevent Tailwind's default reset from affecting it, allowing the native WordPress/WooCommerce CSS to take precedence.

---

## ⚙️ Requirements

- WordPress 5.6+
- PHP 7.0+
- Node.js 18+

## 📄 License

GPLv2 or later.
