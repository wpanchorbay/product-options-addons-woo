> STATUS (G0 cleanup): Phases 0-3 implemented and verified in tree on branch group-0-cleanup-free; Phase 4 (release) not done. This copy is stale vs the authoritative plan.

# OptionBay Free 1.0.3 + Pro 1.0.2 — fixes and roadmap features

> **This file is authoritative.** The repo copy at
> `optionbay-product-options-addons-woo/FIX-PLAN.md` predates the review pass
> and the roadmap additions, and is now stale throughout.
> **Step 0 on approval: overwrite `FIX-PLAN.md` from this file.**

## Context

Two streams land in one release. First, 21 audit findings
(`BUG-AUDIT-2026-08-25.md`) — three of which silently undercharge customers,
one of which makes a paid field permanently unconfigurable, and one of which
leaks global inventory on every cancel/reinstate cycle. Second, six roadmap
features from `optionbay-product-options-addons-woo-pro/.internal/allocation.md`,
reviewed one at a time; four were accepted, two rejected on technical grounds.

**Single combined release: Free 1.0.3 + Pro 1.0.2.** Pro 1.0.2 hard-requires
Free 1.0.3.

### Separation valve — required, because this release is a one-way door

Bumping `OPOPW_PRO_REQUIRED_FREE_VERSION` to `'1.0.3'` means reverting Free to
1.0.2 trips `opopw_pro_version_free_notice()` and **Pro refuses to boot for
every Pro customer**. There is no rollback. Compounding that: the inventory
subsystem being rewritten has *zero* existing E2E coverage, there is no
migration mechanism in either plugin, and Phase 0 sits underneath both streams.

Two mitigations are therefore mandatory, not optional:

1. **Phase 3 must be independently removable.** Keep the four new field types
   and `word_count` behind their own registration entries so they can be pulled
   in a 1.0.3.x patch without touching the ledger or pricing work. Nothing in
   Phases 0–2 may depend on a Phase 3 type existing.
2. **Write the ledger specs BEFORE the ledger refactor.** They are the first
   tests that subsystem has ever had (see Verification), so they are the only
   thing standing between a ledger defect and an unrollbackable release.

## Decided: NOT bugs

- **Finding 4 — no license gating in Pro.** Intentional. The license gates
  updates/support (standard PUC model); the zip is distribution-controlled.
  Hard-gating would brick paying customers on staging, behind firewalls, or
  when the license server is down. Amend the audit to record this.
- **Negative option prices are a supported feature** ("No gift wrap: −$2.00").
  The server already handles them; only the preview was wrong. Do not clamp.
- **Finding 16 — `opopw_product_group_ids` applied only in
  `maybe_enqueue_assets()`.** Latent; nothing hooks it, and Pro's targeting
  exclusions resolve via the `is_exclusion` column in
  `DbManager::get_groups_for_product()`. Leave as-is.

## Rejected roadmap features

- **`fld-19` Password field.** `get_display_value()` is computed once at
  `CartManager.php:437`, stored in the cart session, and replayed at `:636`
  (cart/checkout) and `:674` (order item meta) — which WooCommerce renders on
  the thank-you page, in admin, in exports, and **in the customer's
  confirmation email**. A password field would email its own value in plaintext
  and persist it unencrypted in `wp_woocommerce_order_itemmeta` forever.
  Masking it everywhere makes it useless to the merchant; splitting
  customer/admin display means restructuring the single stored `display_value`.
  Not worth it for a 3-of-15 parity item.
- **`fld-33` Section / group container.** True nesting would rewrite **10 flat
  `foreach` loops** over `$schema` (`CartManager.php:188, 413, 561, 873`,
  `AddonRenderer.php:176`, `AddonGroupController.php:860, 1065`,
  `ConditionEvaluator.php:194`, `Importer.php:70`,
  `InventoryController.php:317`), mirror **46 rakit rules** a level deeper,
  convert an index-based flat reducer to nested drag-and-drop, and add cascade
  semantics `ConditionEvaluator` doesn't have — all landing on the cart pipeline
  this release is already changing. Separately, `allocation.md:427-437` marks
  the `lay-01 → fld-33` edge as **assumed** with an unresolved Free/Pro tier
  consequence. Settle that first.

---

## Phase 0 — Prerequisite refactors

Do these before anything else; everything downstream is cheaper for it.

### 0.1 Single-source the field-type registry

`app/Api/AddonGroupController.php` duplicates the same 14-element literal at
`:855` (sanitize) and `:1105` (validation). The file **already solves this for
price types** — `get_allowed_price_types()` at `:1192`. Mirror it exactly:

```php
private static function get_allowed_field_types() {
    return apply_filters( 'opopw_allowed_field_types', array( … ) );
}
```

Call it from both sites. Four new field types then cost one line each instead
of two hand-synced literals. This is the drift CLAUDE.md warns about.

### 0.2 `PRESENTATIONAL_TYPES`

`static_content` is special-cased in **seven** scattered places —
`FieldRow.tsx:302, :418, :447, :849`, `constants.ts:65`,
`AddonContext.tsx:217`, and `src/utils/validation.ts:176`
(`if (data.type === "static_content" && !data.content)`, a live Zod branch that
is easy to miss). Each decides whether to show pricing, stock, required or
option settings, or how to validate. Replace all seven with membership tests
against one exported list:

```ts
export const PRESENTATIONAL_TYPES = ['static_content', 'divider', 'heading'];
```

**Phase ordering:** the list is *seeded* here with all three strings and the
six call sites rewired immediately — `'divider'` and `'heading'` are inert
strings until their classes land in §3.3/§3.4, so nothing is out of order.
§3.5 consumes the PHP mirror.

Mirror it in PHP as a filterable helper (`opopw_presentational_field_types`) so
Pro can extend it, used by `ConditionEvaluator` (§3.5) and to force
`required: false` during sanitisation.

---

## Phase 1 — Free 1.0.3: audit fixes

### 1.1 New extension points

- `AddonGroupController.php` — add `opopw_sanitize_option` inside
  `sanitize_schema()`'s per-option loop (`:892-907`), mirroring the per-field
  `opopw_sanitize_field` at `:977`. This gate currently drops every Pro option
  key on save.
- `assets/js/frontend.js` — replace `computePriceByType()`'s
  `default: return amount` (`:427`) with
  `wp.hooks.applyFilters('opopw_frontend_price_delta', null, type, amount, value, ctx)`,
  treating `null` as "unknown → 0". Pass `value`/`ctx` from both call sites
  (`:275`, `:293`). Add `'wp-hooks'` to the deps in `AddonRenderer.php:415-421`.

  **The hook alone is unreachable for the headline Pro case.**
  `calculateFieldPrice()` (`:293-296`) short-circuits first:

  ```js
  if (priceType === "none" || price === 0) return 0;
  ```

  Pro's Formula field defaults set `formula` and `price_type` but **never
  `price`** (`pro-extensions.tsx:118-121`), so `price` is 0 and control never
  reaches `computePriceByType()`. Narrow the guard to `priceType === "none"`,
  and let unknown/extensible types through on a 0 amount — the filter already
  returns 0 for anything it doesn't recognise. (This also corrects audit
  finding 10, which claimed a formula field "shows the configured amount": it
  shows nothing at all.)

### 1.2 Price-type lists — field vs option

`formula` MUST stay in the per-option list (§2.1 builds it); only
`character_count` is dropped. Use an explicit per-entry capability flag:

```ts
export const PRICE_TYPES = applyFilters('opopw_price_types', [
  { value: 'none', …, optionCapable: true },
  { value: 'flat', …, optionCapable: true },
  { value: 'percentage', …, optionCapable: true },
]);
export const OPTION_PRICE_TYPES = PRICE_TYPES.filter(pt => pt.optionCapable);
```

**Default is opt-in, deliberately.** A future Pro strategy that forgets the flag
is *absent* from the per-option dropdown rather than present and charging $0 —
failing toward absence, which is the bug this release exists to fix.

There are **four** consumers, not three. Point `OptionEditor.tsx:358`,
`OptionEditorAccordion.tsx:215` **and `OptionEditorAccordion.tsx:635`** (a
`PRICE_TYPES.find(...)` that renders the collapsed row's price label, and would
otherwise show a stale label for a filtered-out type) at `OPTION_PRICE_TYPES`;
leave `FieldRow.tsx:465` on `PRICE_TYPES`.

Note the declaration sites: `PRICE_TYPES_BASE` is at `constants.ts:80`, the
exported `PRICE_TYPES` at `:94`, locked teasers at `:88-91`.

### 1.3 Price preview fixes

`assets/js/frontend.js` — `:277` `> 0` → `!isNaN(...)`; `:446`
`addonTotal > 0` → `Math.abs(addonTotal) > 0.0001`; `:442` clamp final total at 0.

### 1.4 Inventory ledger — fixes findings 5 and 6 together

`app/Core/CartManager.php`. Delete the `_opopw_stock_restored` boolean (`:751`,
`:779`); replace with a per-intent ledger in order-item meta holding:

- **`consumed` — persisted at reduce time.** `reduce_inventory_stock()` already
  computes `$total_reduction` per intent (`:718`) and discards it; write it into
  the ledger there. **Do not recompute from `$item->get_quantity()`** —
  WooCommerce permits editing line-item quantities after stock reduction, so a
  recomputed figure can disagree with what was actually taken. *This
  prohibition applies only to orders that HAVE a ledger; see the legacy clause
  below.*
- **`released`** — running total already given back. **`reduce_inventory_stock()`
  must reset `released` to 0 at the same time it writes `consumed`.** Without
  that reset, cancel → reinstate → cancel reproduces finding 5 exactly: the
  second reduce overwrites `consumed`, `released` still holds the first cycle's
  value, so `release = consumed − 0 − consumed = 0` and the stock never comes
  back.

**`$remaining` is an INPUT, not derived identically for every hook.** This is
the one thing to get right — deriving it from refunded quantity in all three
paths silently breaks cancellation, because *cancelling creates no refunds*:
`get_qty_refunded_for_item()` returns 0 → `remaining = full qty` →
`should = consumed` → `release = 0`. That would never restore stock on cancel
at all, which is worse than the finding-5 bug it replaces.

```php
// cancelled / pending — the whole line is gone
reconcile( $item, $remaining = 0 );

// refunded — derive from cumulative refunded quantity
$refunded = abs( $order->get_qty_refunded_for_item( $item_id ) );
reconcile( $item, $remaining = max( 0, $item->get_quantity() - $refunded ) );
```

Then, per intent:

```
should  = $remaining > 0
          ? calculate_total_intent_reduction( $intent, $remaining )
          : 0.0
release = max( 0, $ledger['consumed'] - $should - $ledger['released'] )
```

Exact for `per_item_qty`; correct for `per_line_item` (holds `1.0` while
`remaining > 0`, drops to `0` only when the line is fully gone) and for
non-linear `formula` mode across repeated partial refunds.

Worked example — qty 5, `per_item_qty`, `consumed = 5`:

| event | remaining | should | release | ledger |
|---|---|---|---|---|
| refund 2 | 3 | 3 | 5−3−0 = **2** | 2 |
| refund 1 | 2 | 2 | 5−2−2 = **1** | 3 |
| cancel | **0** | 0 | 5−0−3 = **2** | 5 |
| plain cancel, no prior refunds | **0** | 0 | 5−0−0 = **5** | 5 |

**Legacy orders — both cases must be handled.** There is **no migration
mechanism in either plugin** (no `db_version`, no `upgrader_process_complete`;
`register_activation_hook` does not fire on update, and `Plugin.php:162` is a
`// Run migration check` no-op). So the dual-read is permanent, and it must
cover *two* states, not one:

| ledger | legacy flag | meaning | action |
|---|---|---|---|
| absent | `'1'` | already restored pre-upgrade | seed `released = consumed`, release nothing |
| absent | unset | **reduced pre-upgrade, cancelled post-upgrade** | fall back to `consumed = calculate_total_intent_reduction($intent, $item->get_quantity())` |

The second row is the one that matters: without it `consumed` defaults to 0,
`release` is 0, and **every order in flight at upgrade leaks its add-on stock
permanently**. Falling back to `get_quantity()` for legacy orders only accepts
the edited-quantity risk as the lesser evil — new orders always have a real
ledger.

Hooks: `..._status_cancelled` (existing), `..._status_pending` (new — mirrors
core `wc-stock-functions.php:155-156`), `woocommerce_order_refunded` (new).

**Refunds restore only when "Restock refunded items" was ticked — and the
obvious hook for detecting that is dead in the common case.**

`woocommerce_restock_refunded_item` fires *inside* `wc_restock_refunded_items()`'s
loop, past this guard at `wc-order-functions.php:824`:

```php
if ( ! $item_stock_reduced || ! $qty_to_refund || ! $product || ! $product->managing_stock() ) {
    continue;
}
```

OptionBay pools are a **separate cross-product inventory, independent of
whether the WooCommerce product manages stock**. For the ordinary case — a
simple product with "Manage stock?" unchecked, an add-on backed by an OptionBay
pool — that hook never fires even when the admin ticks *Restock refunded
items*. Finding 6 would stay unfixed for exactly the products most likely to
use the feature. (`_restock_refunded_items` item meta is written at `:838`,
past the same `continue`, so it is not an alternative either.)

**Use `woocommerce_can_restock_refunded_items` instead** (`:809`). It fires
**unconditionally**, before the loop, and only when restock was requested at
all (`wc_create_refund()` gates the whole call at `:680`). It receives
`$order` and `$refunded_line_items`, which carry a per-item `qty` **for this
refund**:

```php
add_filter( 'woocommerce_can_restock_refunded_items', function ( $can, $order, $items ) {
    // capture $items[ $item_id ]['qty'] for this refund, then reconcile
    return $can;   // pass through unchanged
}, 10, 3 );
```

**Use that per-refund qty, not cumulative `get_qty_refunded_for_item()`.**
Cumulative counts refunds made with restock *unticked*, so a later ticked
refund would release stock for units never authorised: qty 5, consumed 5,
refund 2 unticked (released stays 0), then refund 1 ticked → cumulative 3 →
`release = 5 − 2 − 0 = 3` when only 1 was authorised. Per-refund qty avoids
this entirely.

### 1.5 Inventory correctness

- `InventoryManager.php:361` — `calculate_intent_reduction()` is a private copy
  of `CartManager::calculate_reduction_amount()` minus the
  `opopw_calculate_reduction` filter, so cart-reserved totals ignore Pro's
  `formula` mode. Extract one shared helper. (7)
- `InventoryManager.php:220` — **audit finding 9 was overstated, and its
  proposed fix was dangerous. Do NOT change the return to `false !== $result`.**

  The `WHERE id = %d AND (stock_count >= %f OR allow_backorders = 1)` clause
  **is** the oversell guard: insufficient stock matches 0 rows, `$wpdb->query()`
  returns int `0`, `(bool) 0` is false, and `reduce_inventory_stock()` throws.
  Changing the cast to `false !== $result` turns `0` into **success** — the
  plugin would silently oversell a global pool and never throw again.
  **Keep the `(bool)` cast.**

  The real defect is narrower than the audit claimed: the UPDATE also sets
  `updated_at = current_time('mysql')`, so a zero-amount update still changes
  the row and returns 1 — *unless* the row was last written in the same second.
  So it is an intermittent same-second race, not a deterministic failure.
  **Fix: early-return `true` when `$amount <= 0`, and nothing else.** Same for
  `increment_stock()`, which logs a false ERROR in that case. (9)
- `CartManager.php:876, 890` — pass the intent array instead of `null`, which
  makes Pro's `calculate_reduction()` dereference `null['formula']`. (8)

### 1.6 Hygiene

- `AddonRenderer.php:411, 419` — `time()` → `OPOPW_VERSION`. (12)
- `CartManager.php:169, 402` unused `$files_data` + stale docblock (13);
  `:519` orphaned `opopw_ajax_calculate_totals` (14); `:455, 889` missing
  `?? array()` guard (15).
- Delete stale `languages/product-options-addons-woo.pot`; drop the unread
  `OPOPW_DEV_MODE`.

---

## Phase 2 — Pro 1.0.2: audit fixes

### 2.1 Option-level formula pricing (finding 1)

`app/Core/FieldExtension.php` — add
`'schema.*.options.*.formula' => 'nullable'` to `add_pro_validation_rules()`,
and a `preserve_pro_option_keys( $clean_option, $option, $field )` hooked to
Free's new `opopw_sanitize_option`, sanitising with `sanitize_text_field()`.
Mirrors `preserve_pro_field_keys()`.

`src/pro-extensions.tsx` — per-option "Math Formula" input, shown when that
option's `price_type === 'formula'`.

### 2.2 `[option_price]` token — context-aware

`app/Pricing/FormulaStrategy.php:44-52`. All existing tokens keep their meaning
— no saved formula changes result, no migration. `[price]` stays a
`[base_price]` alias. Add `[option_price]`, resolved **only in option context**:

Without a guard the field path passes `(array) $field_schema`, whose `price` is
the *field's* amount — creating a second hidden alias, exactly the
`[price]`/`[base_price]` confusion deliberately not inherited.

**Pass an explicit flag; do not duck-type the config shape.** Sniffing
`isset($config['value']) && ! isset($config['id'])` is accurate against
`sanitize_schema()` today, but it encodes a fragile invariant: the day a
field-level "Default value" setting adds `value` to a field config,
`[option_price]` silently starts resolving the *field* price. `CartManager.php:585`
already knows which branch it is in — mark it there:

```php
// CartManager.php:585 (option branch)
PricingEngine::calculate( $p_type, $base_price, $p_amount, $val, $qty,
    array_merge( (array) $opt, array( '_opopw_price_context' => 'option' ) ) );

// FormulaStrategy
$is_option    = 'option' === ( $config['_opopw_price_context'] ?? '' );
$option_price = $is_option ? (float) ( $config['price'] ?? 0 ) : 0.0;
```

### 2.3 Formula pricing on every field type (finding 2)

`pro-extensions.tsx:71` — this is a **widening, not a swap**:

```ts
if (fieldDef.type === 'formula' || fieldDef.price_type === 'formula') {
```

Replacing rather than OR-ing loses the input for any saved Formula-**type**
field whose `price_type` was later changed, stranding its formula with no way
to edit it.

### 2.4 Price-type capability flags (finding 17)

Register `formula` with `optionCapable: true`; **omit** it on
`character_count` (an option valued `red` at $0.50/char silently costs $1.50).
Free's locked-teaser entries at `constants.ts:88-91` need the same flags so the
Pro-inactive dropdown matches the Pro-active one.

### 2.5 File field — canonical key + normaliser (finding 3)

**The trap:** `FileField::validate()` (`:93-108`) builds
`'.' . strtolower(pathinfo(...))` and strict-compares against the raw
comma-split list. It only works today because `allowed_types` is never
populated and it falls back to the dotted default. Pro's defaults write the
**undotted** `'jpg,png,pdf'` — so naively repointing `FileField` at the stored
key makes `.jpg` fail to match `jpg` and **rejects every upload**.

- `allowed_extensions` canonical. Read order:
  `allowed_extensions` → `allowed_types` → `'jpg,png,pdf'`.
  **The `allowed_types` fallback is deliberate caution, not a discovered
  requirement** — nothing has ever written that key. Costs one `??`; drop it
  later if it stays unused.
- One shared normaliser (lowercase, trim, strip leading dot) mirroring
  `CartExtension::build_allowed_mimes()` (`:163-180`), applied to **both sides**
  of every comparison in `render_input()` and `validate()`.
- `render_input()` re-adds dots for the HTML `accept` attribute.

### 2.6 File field settings UI (finding 3, second half)

`opopw_field_settings` injects nothing for `type === 'file'` today. Add
**Allowed Extensions** (comma-separated, dots optional) and **Max File Size
(MB)**, with the real ceiling from `wp_max_upload_size()` as hint text. Pro must
newly hook Free's `opopw_admin_localize` (`Admin.php:246`) to pass it through.
**Show the limit, don't clamp** — a 50 MB setting on an 8 MB host otherwise
passes `FileField::validate()` and then hits an opaque core error from
`wp_handle_upload()`.

### 2.7 Frontend price preview

Revive `assets/js/frontend.js` (currently never enqueued) as an
`opopw_frontend_price_delta` consumer implementing `formula`,
`character_count` and `word_count` (§3.6), using the same token substitution as
`FormulaStrategy` including `[option_price]`. Deps: `wp-hooks` +
`opopw-frontend`.

### 2.8 Admin bundle scoping (finding 11)

`SettingsExtension.php:58` accepts `$hook` and never reads it, so
`build/pro-extensions.js` loads on every wp-admin page. Gate it like Free's
`is_menu_page()` (`Admin.php:215-217`).

### 2.9 Housekeeping (18, 21)

Delete unreferenced forks: `Core/AddonRenderer.php`, `Core/AddonGroup.php`,
`Core/Importer.php`, `Pricing/PricingEngine.php`, `Pricing/FlatFeeStrategy.php`,
`Pricing/PercentageStrategy.php`, `Helper/WooCommerce.php`,
`Helper/ConditionEvaluator.php`.
**Keep** `Pricing/PricingStrategy.php` (the interface Pro's live strategies
implement), `Helper/Loader.php`, `Core/Base.php`.
**`assets/js/frontend.js` is no longer dead** — it becomes §2.7.

Also delete: CampaignBay SVGs, obsolete `errors.md` / `qa_audit.md`, stale
`languages/smart-product-options-addons.pot`, unread `OPOPW_PRO_DEV_MODE`.

### 2.10 Naming (finding 19)

Free keeps `OptionBay - Product Options and Addons` (its published wp.org
identity). Pro's header **and** readme title become
`OptionBay - Product Options and Addons (Pro)`. Leave every
`/smart-product-options-addons/` marketing and docs URL alone.

---

## Phase 3 — Roadmap features (same release)

Each new field type needs: a `Fields/` class, `FieldFactory::$types`, the
single `get_allowed_field_types()` list (§0.1), `FIELD_TYPES_BASE` in
`constants.ts`, and defaults in `AddonContext.tsx`.

### 3.1 `fld-16` URL field — Free

`EmailField.php` (91 lines) is the template. Validate with
`filter_var($v, FILTER_VALIDATE_URL)` **and restrict the scheme to http/https**
— `esc_url_raw()` alone passes `javascript:` through to an admin-viewed order
screen. Plain string field, so cart storage, conditional logic and pricing all
work unchanged.

### 3.2 `fld-17` Telephone field — Free

Same shape. `<input type="tel">` provides a mobile numeric keypad and **no
validation whatsoever** — the HTML spec enforces no format. Validate
permissively: allow `+`, digits, spaces, `-`, `(`, `)`, `.`, cap the length,
reject nothing else. A strict pattern would reject `+44 20 7946 0958` and
`(555) 123-4567`, which is the only failure mode that generates support
tickets.

### 3.3 `fld-23` Separator / divider — Free

`StaticContentField` is the template — it overrides only `render_input()`.
Renders an `<hr>`. Add to `PRESENTATIONAL_TYPES` (§0.2). Override `validate()`
to always return `true` and force `required: false` in defaults, so a stray
flag can never block add-to-cart on a field that cannot have a value. The
pipeline already skips valueless fields — `add_cart_item_data` gates on
`null !== $value && '' !== $value`.

### 3.4 `fld-24` Heading field — Free

As above, plus a **`heading_level` schema key** (`h2`–`h5`, default `h3`).
Hardcoding a level breaks the product page's heading outline (it already has an
`h1` and `h2`s) and is an accessibility regression. The key needs the two-gate
treatment — a validation rule **and** a sanitize passthrough — or it silently
drops on save. Label sanitised with `sanitize_text_field`, not
`wp_kses_post`; `static_content` already exists for rich text.

**Ship scoped CSS** in `assets/css/frontend.css`. Unlike `<hr>`, themes style
headings aggressively (margins, font stacks, uppercase transforms, decorative
pseudo-elements). Reset margins and font-size under `.opopw-field--heading` so
it renders predictably; the 4-project classic/block E2E matrix covers only two
themes.

### 3.5 Presentational fields cannot be conditional-logic triggers

`ConditionEditor.tsx:25` builds targets as
`state.schema.filter(f => f.id !== field.id)` — no type filter, so
`static_content` is already offered today. A rule against a valueless field
resolves to `''`, so `empty` or `== ""` **fires permanently**.

- Exclude `PRESENTATIONAL_TYPES` from `siblingFields`.
- **Server side: DROP the rule, do not return `false`.** Returning `false` is a
  breaking change on upgrade. `is_visible()` combines `ALL` as
  `! in_array( false, $results, true )` (`ConditionEvaluator.php:81`), so an
  existing group with `match: ALL`, `action: show` and a stray `static_content`
  rule would flip from **always-visible to always-hidden** the moment the
  plugin updates — and a hidden required field is skipped by validation, so
  orders would silently lose data. Treating the rule as *not present* (skip it
  before it reaches `$results`) is neutral under both `ALL` and `ANY`.
- **Also fix the frontend runtime.** `assets/js/frontend.js` has its **own**
  `evaluateRule()` (`:74`) and its own ALL/ANY + show/hide logic (`:167-182`),
  and `AddonRenderer` never calls `is_visible()` — rendering is purely
  client-side. Changing only the builder and the server leaves the browser
  showing a field the server considers hidden, whose value is then dropped.
  Apply the same skip rule in the JS, or CLAUDE.md's client/server mirroring
  invariant is broken by the very fix meant to enforce it.

### 3.6 `prc-10` Word-count pricing — **Pro**

`CharacterCountStrategy` (41 lines) is the template. New `WordCountStrategy`
registered through `opopw_pricing_strategies` and `opopw_allowed_price_types`
in `FieldExtension.php`.

- **Not `str_word_count()`** — it is ASCII-oriented and mis-counts or returns 0
  for Bangla, Arabic, CJK and Cyrillic. Use
  `preg_split('/\s+/u', trim($v), -1, PREG_SPLIT_NO_EMPTY)`. CJK has no
  inter-word spaces, so word pricing is meaningless there — document it.
- Register **`optionCapable: false`** (§1.2), like `character_count`, or it
  charges by the word count of an option's value slug.
- **PHP and JS must count identically.** `''.split(/\s+/)` returns `['']`
  (length **1**) while `preg_split(..., PREG_SPLIT_NO_EMPTY)` returns `[]`
  (count **0**). Share one rule with an explicit empty-string test on both
  sides, or an empty field previews a charge the server won't make.

---

## Phase 4 — Release

- Bump `OPOPW_PRO_REQUIRED_FREE_VERSION` `'1.0.2'` → `'1.0.3'`.
- Free → **1.0.3**, Pro → **1.0.2**, across the five places in `CLAUDE.md`'s
  release process. Draft changelog + upgrade notice covering **both** the fixes
  and the new field types; confirm before writing.
- `npm run makepot` **and `npm run make-json`** in both repos. `build.sh` never
  runs either, and `package.sh:5` only calls `build.sh` — so without the second
  command the React builder's new strings ship untranslated. `package.sh:27`
  blind-copies `languages/`, which is why the stale `.pot` files §1.6/§2.9
  delete are currently shipping in every artifact.
- `./build.sh` then `./package.sh` in both.

**Also fold in these small defects found during review:**

- **`uninstall.php` never cleans order or order-item meta.** It deletes CPT
  posts (cascading postmeta only) and drops the two custom tables, but leaves
  `_opopw_stock_intents`, `_opopw_stock_restored`, and per-field label meta
  behind. The new `_opopw_stock_ledger` inherits that hole — add all of them,
  under the existing `advanced_deleteAllOnUninstall` opt-in.
- **`pro-extensions.tsx:92` matches on a translated string** —
  `fields.find(f => f.label === __("Inventory Management", "optionbay-product-options-addons-woo"))`
  uses **Free's** text domain from inside Pro *and* compares against a
  translated label, so it silently fails in every non-English locale. §2.6 adds
  two more settings through this same handler; fix the lookup to a stable key
  first.
- **`phpcs.xml.dist:29`'s `<exclude-pattern>WooCommerce.php</exclude-pattern>`
  goes dangling** once §2.9 deletes Pro's `Helper/WooCommerce.php`, and
  `languages/…-pro.pot:45-98` sources strings from files §2.9 removes — both
  clean up in the same pass.
- **`Core/Base.php` is only kept for tidiness.** Its sole consumers
  (`AddonRenderer.php:35`, `AddonGroup.php:27`) are both on §2.9's deletion
  list, so afterwards it is dead code too — unlike `Loader.php` and
  `PricingStrategy.php`, which are genuinely live. Delete it or keep it
  knowingly; don't file it with the load-bearing ones.

**Update order is safe both ways:** Free-first leaves Pro 1.0.1 running fine
(the new filters simply have no consumer); Pro-first trips the existing
`opopw_pro_version_free_notice()` guard and Pro cleanly refuses to boot.

---

## Verification

QIT as environment provider (`qit env:up` → `env:source` → Playwright against
`$WP_URL`).

**Three corrections to how this project's E2E actually works — CLAUDE.md is
stale and the earlier draft of this plan repeated it.**

1. **`playwright.config.ts` has 8 project entries / 4 phases, not 4 projects.**
   `classic-setup` → `classic` → `block-setup` → `block` → `pro-setup` →
   `pro-classic` → `pro-block-setup` → `pro-block`.
2. **Pro-dependent specs must not sit in the shared directory.** Only
   `pro-classic` (`:97`) and `pro-block` (`:114`) carry `testIgnore`;
   `classic` (`:52`) and `block` (`:77`) carry **none**. So *option formula
   pricing, `[option_price]` scoping, formula on a Text field, file field
   config* and *word-count pricing* would all execute in the Free-only phases
   with Pro absent and fail. Put them in a Pro-only directory, or add the
   inverse `testIgnore` to `classic`/`block`.
3. **Pro has its own separate Playwright suite** —
   `optionbay-product-options-addons-woo-pro/tests/e2e/` is a second
   independent install with its own config (Pro as SUT), its own
   `run_all_tests.sh`, and 21 specs. Decide per spec which repo it lands in;
   the Pro-dependent ones most likely belong there.

`00-pro-absence.spec.ts` must pass untouched. Pro's suite needs **no** license
seeding — finding 4 is closed as intentional. *(Noting the circularity
honestly: it needs no seeding precisely because `Plugin.php:152-166` registers
the extensions with no license check, which is finding 4 itself.)*

**The inventory rewrite has no existing safety net.** `inventory.spec.ts` has
exactly two tests, both admin-builder only (`:20`, `:37`), and grepping the
whole Free suite for `cancel`/`refund`/`Cancelled`/`Refunded` returns **zero
hits**. The specs below are not regression tests for the ledger — they are the
first tests that subsystem has ever had. Write them before the refactor, not
after.

**Full coverage, one spec per new field type, matching the existing
convention** — this project has no PHP or JS unit tests, so E2E is the only
safety net.

| Fix specs (9) | Asserts |
|---|---|
| option formula pricing | option with `price_type: formula` + `[option_price] * 2`; save, reload builder, add to cart, assert line total |
| option dropdown contents | per-option select offers `formula`, not `character_count`/`word_count`; field-level offers all |
| formula on a Text field | Text + Formula shows the Math Formula input and charges correctly |
| `[option_price]` scoping | same formula on a *field* resolves it to 0, not the field price |
| file field config | set Allowed Extensions to `pdf`; `.png` rejected, `.pdf` accepted; ceiling hint renders |
| partial refund ledger | qty 5 → refund 2 → refund 1 → cancel; pool returns to start exactly once |
| **plain cancel, no refunds** | **qty 5 → cancel with zero refunds must restore all 5. This is the case a refunded-qty-derived `remaining` silently zeroes — see §1.4** |
| cancel → reinstate → cancel | no stock leak (finding-5 regression) |
| discount option preview | option at `-2.00`; live total drops, stays ≥ 0 |
| zero-amount reduction | formula reduction yielding 0 must not fail checkout |

| Feature specs (5) | Asserts |
|---|---|
| `url-field.spec.ts` | renders, rejects a bad URL and `javascript:`, saves, reaches cart |
| `telephone.spec.ts` | accepts `+44 20 7946 0958` and `(555) 123-4567`, saves, reaches cart |
| `divider.spec.ts` | renders `<hr>`, no price/stock/required settings in builder, not offered as a condition trigger, contributes nothing to cart |
| `heading.spec.ts` | `heading_level` persists across save/reload (the two-gate check), renders the chosen tag |
| `word-count-pricing.spec.ts` | Pro; charges per word, empty field charges 0 **and previews 0**, multibyte input counts correctly |

**Manual checks:**
1. Confirm the restock-requested flag survives `wc-order-functions.php:680` →
   `:743` in one request (§1.4's flagged risk).
2. `pro-extensions.js` absent on a non-OptionBay admin page.
3. `frontend.js?ver=1.0.3`, not a timestamp.
4. Heading renders sanely on both matrix themes.

**Standards:** `npm run lint` clean in both repos, plus PHPCompatibility
7.4–8.3.

---

## Docs impact

Pages under `/home/sdd/Documents/campaign-bay-testing/docs/optionbay/docs`:

- **Pricing strategies** — per-option formulas, `[option_price]` and its
  option-only scope, formula pricing on any field type, `character_count` and
  `word_count` no longer per-option, **new Word-count pricing (Pro)**.
- **Field types** — File Upload's configurable extensions/size + server
  ceiling; **new URL, Telephone, Separator and Heading fields**; presentational
  fields cannot be conditional-logic triggers.
- **Inventory / stock** — restore now covers cancelled, pending, and opt-in
  refunded including partial refunds.

## Roadmap file

After shipping, update
`optionbay-product-options-addons-woo-pro/.internal/allocation.md`: mark
`fld-16`, `fld-17`, `fld-23`, `fld-24`, `prc-10` as shipped; record `fld-19` as
rejected-with-reason and `fld-33` as blocked on the `lay-01` tier question.
