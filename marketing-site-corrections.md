# Marketing Site Corrections

Page: https://wpanchorbay.com/plugins/smart-product-options-addons/
Verified against: `app/Fields/FieldFactory.php` (Free) and `app/Core/FieldExtension.php` (Pro), 2026-07-29. Re-verified 2026-07-30, including the "OptionBay Free vs Pro" comparison table (`table.wpab-fvp__table`) against `app/Pricing/PricingEngine.php`, `InventoryManager.php`, `ExportImportController.php` — that table is accurate (pricing methods, file uploads, shared inventory, import/export, support tiers all match the code) and needs no changes.

## Field types section ("Thirteen field types, one form builder")

- [ ] **Remove "Button Swatch"** — no such field type exists in Free or Pro (grepped both codebases, no match).
- [ ] **Remove "Quantity Stepper"** — no such field type exists in Free or Pro (grepped both codebases, no match).
- [ ] **Mark "File Upload" as Pro-only** — it's `FileField.php`, registered into Free only via Pro's `FieldExtension`. Currently shown with no Pro badge, alongside Free-only fields, which misrepresents what the free plugin includes.
- [ ] **Add "Email"** — real Free field type (`EmailField`), missing from this showcase grid specifically. (It does get a passing mention elsewhere, in the comparison table's Free-row description: "Use text, choice, number, email, and visual swatch fields" — but that's easy to miss and doesn't substitute for a card in the field-types section.)
- [ ] **Add "Time"** — real Free field type (`TimeField`), currently not mentioned anywhere on the page.
- [ ] **Add "DateTime"** — real Free field type (`DateTimeField`), currently not mentioned anywhere on the page.

Corrected Free field list (13, no Pro):
Text, Textarea (Paragraph), Number, Email, Select (Dropdown), Checkbox (Checkboxes), Radio, Date, Time, DateTime, Color Swatch, Image Swatch, Static Content.
Plus Pro-only: File Upload.

## Other gaps noted (from marketing-page review, not code-verified corrections)

- No testimonials/case studies/customer logos.
- No WordPress.org star rating shown despite linking the profile.
- No demo video/GIF despite a YouTube channel link in the footer.
- No "Tested up to WP/WooCommerce version" or PHP version badge.
- No competitor comparison.
- FAQ has only 5 questions, no license-transfer/multisite/uninstall/WPML answers.
- No email/newsletter capture for undecided visitors.
- No dev/agency-focused messaging despite a 10-site "Agency" pricing tier.
- No changelog excerpt or "last updated" freshness signal.
