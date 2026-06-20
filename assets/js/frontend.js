/**
 * Smart Product Options and Addons Frontend Interactivity Engine
 *
 * Handles conditional logic evaluation and live price calculation
 * on WooCommerce product pages.
 *
 * Uses event delegation on form.cart for performance.
 * jQuery is available since WordPress provides it.
 *
 * @since 1.0.0
 */
(function ($) {
  "use strict";
  // Bail if no schema data was hydrated by PHP
  if (typeof window.spoaSchema === "undefined") {

    return;
  }

  var OB = window.spoaSchema;
  var schemas = OB.schemas || {};
  var basePrice = parseFloat(OB.basePrice) || 0;



  // ─── Conditional Logic Engine ────────────────────────────────────

  /**
   * Get the current value of a field by its field ID.
   */
  function getFieldValue(groupId, fieldId) {
    var $wrapper = $('#spoa-options').find(
      '.ob-field[data-group-id="' +
      groupId +
      '"][data-field-id="' +
      fieldId +
      '"]'
    );
    if (!$wrapper.length) return "";

    var $input = $wrapper.find("input, select, textarea").first();
    if (!$input.length) return "";

    var type = $input.attr("type");

    // Checkbox group (multi)
    if (type === "checkbox") {
      var $checkboxes = $wrapper.find('input[type="checkbox"]');
      if ($checkboxes.length > 1) {
        var vals = [];
        $checkboxes.filter(":checked").each(function () {
          vals.push($(this).val());
        });
        return vals;
      }
      // Single toggle
      return $input.is(":checked") ? $input.val() : "";
    }

    // Radio
    if (type === "radio") {
      return $wrapper.find('input[type="radio"]:checked').val() || "";
    }

    return $input.val() || "";
  }

  /**
   * Evaluate a single condition rule.
   */
  function evaluateRule(rule, groupId) {
    var targetValue = getFieldValue(groupId, rule.target_field_id);
    var ruleValue = rule.value;
    var op = rule.operator;


    // Array handling for checkbox multi
    if (Array.isArray(targetValue)) {
      switch (op) {
        case "==":
          return targetValue.indexOf(ruleValue) !== -1;
        case "!=":
          return targetValue.indexOf(ruleValue) === -1;
        case "contains":
          return targetValue.indexOf(ruleValue) !== -1;
        case "not_contains":
          return targetValue.indexOf(ruleValue) === -1;
        case "empty":
          return targetValue.length === 0;
        case "not_empty":
          return targetValue.length > 0;
        default:
          return false;
      }
    }

    // String/number comparison
    switch (op) {
      case "==":
        return String(targetValue) === String(ruleValue);
      case "!=":
        return String(targetValue) !== String(ruleValue);
      case ">":
        return parseFloat(targetValue) > parseFloat(ruleValue);
      case "<":
        return parseFloat(targetValue) < parseFloat(ruleValue);
      case ">=":
        return parseFloat(targetValue) >= parseFloat(ruleValue);
      case "<=":
        return parseFloat(targetValue) <= parseFloat(ruleValue);
      case "contains":
        return String(targetValue).indexOf(String(ruleValue)) !== -1;
      case "not_contains":
        return String(targetValue).indexOf(String(ruleValue)) === -1;
      case "empty":
        return (
          targetValue === "" || targetValue === null || targetValue === undefined
        );
      case "not_empty":
        return (
          targetValue !== "" && targetValue !== null && targetValue !== undefined
        );
      default:
        return false;
    }
  }

  /**
   * Evaluate all conditional logic for a group.
   * Toggles visibility and clears hidden field values.
   */
  function evaluateConditions(groupId) {
    var groupData = schemas[groupId];
    if (!groupData) {
      return;
    }
    if (!groupData.fields) {
      return;
    }

    $.each(groupData.fields, function (_, field) {
      var conditions = field.conditions;

      if (!conditions) {
        return;
      }

      if (conditions.status !== "active") {
        return;
      }

      var rules = conditions.rules || [];
      if (rules.length === 0) {
        return;
      }

      // Evaluate rules
      var results = $.map(rules, function (rule, index) {
        var res = evaluateRule(rule, groupId);
        return res;
      });

      // Apply match strategy
      var match = conditions.match || "ALL";
      var conditionMet;
      if (match === "ALL") {
        conditionMet = results.every(function (r) {
          return r === true;
        });
      } else {
        conditionMet = results.some(function (r) {
          return r === true;
        });
      }

      // Determine visibility based on action
      var action = conditions.action || "show";
      var shouldShow =
        action === "show" ? conditionMet : !conditionMet;

      var $field = $('#spoa-options').find(
        '.ob-field[data-group-id="' +
        groupId +
        '"][data-field-id="' +
        field.id +
        '"]'
      );

      if (shouldShow) {
        $field.removeClass("ob-hidden");
      } else {
        $field.addClass("ob-hidden");
        // Clear values of hidden fields
        $field.find("input, select, textarea").each(function () {
          var $el = $(this);
          if ($el.is(":checkbox") || $el.is(":radio")) {
            $el.prop("checked", false);
          } else {
            $el.val("");
          }
        });
      }
    });
  }

  // ─── Live Pricing Engine ─────────────────────────────────────────

  /**
   * Calculate total addon price for all visible, selected fields.
   */
  /**
   * Calculate total addon price for all visible, selected fields.
   */
  function calculatePricing() {
    var addonTotal = 0;

    $.each(schemas, function (groupId, groupData) {
      if (!groupData.fields) return;

      $.each(groupData.fields, function (_, field) {
        var $wrapper = $('#spoa-options').find(
          '.ob-field[data-group-id="' +
          groupId +
          '"][data-field-id="' +
          field.id +
          '"]'
        );

        if ($wrapper.length > 1 && window.SPOA_DEBUG) {
          console.warn("Pricing Error: Multiple elements found for Field ID:", field.id, "Group ID:", groupId);
        }

        var isVisible = $wrapper.length && $wrapper.is(":visible");

        // Skip fields that are currently hidden by conditional logic
        if (!isVisible) return;

        var value = getFieldValue(groupId, field.id);

        if (isEmptyValue(value)) {
          return;
        }

        var fieldPrice = 0;
        // Check if field has options (select/radio/checkbox)
        if (field.options && field.options.length > 0) {
          fieldPrice = calculateOptionPrice(field, value);
        } else {
          fieldPrice = calculateFieldPrice(field, value);
        }
        addonTotal += fieldPrice;
      });
    });

    // Update live total display
    updatePriceDisplay(addonTotal);
  }

  /**
   * Calculate price for option-based fields (select/radio/checkbox)
   */
  function calculateOptionPrice(field, value) {
    var total = 0;
    var values = Array.isArray(value) ? value : [value];

    $.each(values, function (_, v) {
      $.each(field.options || [], function (_, opt) {
        if (opt.value !== v) {
          return;
        }

        var priceType = opt.price_type || "flat";

        if (parseFloat(opt.price) > 0) {
          total += computePriceByType(
            priceType,
            parseFloat(opt.price)
          );
        }
      });
    });

    return total;
  }

  /**
   * Calculate price for non-option fields (text, number, etc.)
   */
  function calculateFieldPrice(field, value) {
    var priceType = field.price_type || "none";
    var price = parseFloat(field.price) || 0;

    if (priceType === "none" || price === 0) return 0;

    return computePriceByType(priceType, price);
  }

  /**
   * Evaluate stock availability and disable options/fields.
   */
  function evaluateStock() {
    if (!OB.inventory) return;

    var $form = $("form.cart");
    var currentQty = parseInt($form.find("input.qty").val()) || 1;

    $.each(schemas, function (groupId, groupData) {
      if (!groupData.fields) return;

      $.each(groupData.fields, function (_, field) {
        var $fieldWrapper = $('#spoa-options').find(
          '.ob-field[data-group-id="' + groupId + '"][data-field-id="' + field.id + '"]'
        );
        if (!$fieldWrapper.length) return;

        // 1. Field-level stock
        if (field.enable_stock && field.inventory_id) {
          var inv = OB.inventory[field.inventory_id];
          if (inv && !inv.allow_backorders) {
            var reductionAmount = calculateReductionAmount(field.reduction_mode, currentQty);
            var remaining = inv.stock - (inv.reserved || 0);

            if (remaining < reductionAmount) {
              $fieldWrapper.find("input, select, textarea").prop("disabled", true).addClass("ob-out-of-stock");
              if ($fieldWrapper.find(".ob-stock-badge").length === 0) {
                $fieldWrapper.find(".ob-field__label").append(' <span class="ob-stock-badge out-of-stock">' + (__("Out of stock", "optionbay-product-options-addons-woo")) + '</span>');
              }
            } else {
              $fieldWrapper.find("input, select, textarea").prop("disabled", false).removeClass("ob-out-of-stock");
              $fieldWrapper.find(".ob-stock-badge").remove();
            }
          }
        }

        // 2. Option-level stock
        if (field.options && field.options.length > 0) {
          $.each(field.options, function (_, opt) {
            if (opt.enable_stock && opt.inventory_id) {
              var inv = OB.inventory[opt.inventory_id];
              if (inv && !inv.allow_backorders) {
                var reductionAmount = calculateReductionAmount(opt.reduction_mode, currentQty);
                var remaining = inv.stock - (inv.reserved || 0);

                var $optEl = findOptionElement($fieldWrapper, field.type, opt.value);
                if (remaining < reductionAmount) {
                  disableOption($optEl, field.type, opt.value);
                } else {
                  enableOption($optEl, field.type, opt.value);
                }
              }
            }
          });
        }
      });
    });
  }

  function calculateReductionAmount(mode, qty) {
    if (mode === 'per_line_item') return 1;
    if (mode === 'per_item_qty') return qty;
    return qty;
  }

  function findOptionElement($wrapper, type, value) {
    if (type === 'select') {
      return $wrapper.find('option[value="' + value + '"]');
    }
    if (type === 'radio' || type === 'checkbox') {
      return $wrapper.find('input[value="' + value + '"]');
    }
    if (type === 'color_swatch' || type === 'image_swatch') {
      return $wrapper.find('.ob-swatch-input[value="' + value + '"]');
    }
    return null;
  }

  function disableOption($el, type, value) {
    if (!$el || !$el.length) return;
    if (type === 'select') {
      if (!$el.data("originalText")) {
        $el.data("originalText", $el.text());
      }
      $el.prop("disabled", true).text($el.data("originalText") + " (" + __("Out of stock", "optionbay-product-options-addons-woo") + ")");
    } else {
      $el.prop("disabled", true).addClass("ob-out-of-stock");
      getOptionLabel($el).addClass('ob-option-disabled').attr('title', __("Out of stock", "optionbay-product-options-addons-woo"));
    }
  }

  function enableOption($el, type, value) {
    if (!$el || !$el.length) return;
    if (type === 'select') {
      $el.prop("disabled", false);
      if ($el.data("originalText")) {
        $el.text($el.data("originalText"));
      }
    } else {
      $el.prop("disabled", false).removeClass("ob-out-of-stock");
      getOptionLabel($el).removeClass('ob-option-disabled').removeAttr('title');
    }
  }

  function getOptionLabel($el) {
    var id = $el.attr("id");
    var $label = id ? $('label[for="' + id + '"]') : $();
    return $label.length ? $label : $el.parents('label').first();
  }

  function __(text, domain) {
    // Simple mock for __ in frontend if not available
    return (window.wp && window.wp.i18n && window.wp.i18n.__) ? window.wp.i18n.__(text, domain) : text;
  }

  /**
   * Trigger a custom event when totals are updated
   */
  function triggerTotalsUpdated(total) {
    $(document.body).trigger("smart_product_options_addons_totals_updated", [total, basePrice]);
  }

  /**
   * Compute price based on type (flat, percentage, etc.)
   */
  function computePriceByType(type, amount) {
    switch (type) {
      case "flat":
        return amount;
      case "percentage":
        return (basePrice * amount) / 100;
      default:
        return amount;
    }
  }

  /**
   * Update the live total price display on the page.
   */
  function updatePriceDisplay(addonTotal) {
    var finalTotal = basePrice + addonTotal;

    var $totalEl = $(".spoa-live-total");

    if (addonTotal > 0) {
      $totalEl.show();
      var formatted = formatPrice(finalTotal);
      $totalEl.find(".amount").html(formatted);
    } else {
      $totalEl.hide();
    }

    triggerTotalsUpdated(finalTotal);
  }

  /**
   * Format a price using WooCommerce settings from hydration data.
   */
  function formatPrice(price) {
    var decimals = OB.decimals || 2;
    var decSep = OB.decimalSep || ".";
    var thousandSep = OB.thousandSep || ",";
    var format = OB.priceFormat || "%1$s%2$s";
    var currency = OB.currency || "$";

    var fixed = price.toFixed(decimals);
    var parts = fixed.split(".");
    var intPart = parts[0].replace(
      /\B(?=(\d{3})+(?!\d))/g,
      thousandSep
    );
    var formatted = decimals > 0 ? intPart + decSep + parts[1] : intPart;

    return format.replace("%1$s", currency).replace("%2$s", formatted);
  }

  /**
   * Check if a value is empty.
   */
  function isEmptyValue(val) {
    if (val === null || val === undefined || val === "") return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  }

  /**
   * Validate required fields and toggle Add to Cart button state.
   */
  function validateRequiredFields() {
    var $form = $("form.cart");
    var $btn = $form.find(".single_add_to_cart_button");
    if (!$btn.length) return;

    var isValid = true;

    $.each(schemas, function (groupId, groupData) {
      if (!groupData.fields) return;

      $.each(groupData.fields, function (_, field) {
        if (!field.required) return;

        var $wrapper = $('#spoa-options').find(
          '.ob-field[data-group-id="' +
          groupId +
          '"][data-field-id="' +
          field.id +
          '"]'
        );

        if ($wrapper.length > 1 && window.SPOA_DEBUG) {
          console.warn("Validation Error: Multiple elements found for Field ID:", field.id, "Group ID:", groupId);
        }

        var isVisible = $wrapper.length && $wrapper.is(":visible");

        // Only check fields that are currently visible to the user
        if (!isVisible) return;

        var value = getFieldValue(groupId, field.id);
        if (isEmptyValue(value)) {
          isValid = false;
          return false; // Break $.each
        }
      });
      if (!isValid) return false; // Break outer $.each
    });

    if (isValid) {
      $btn.prop("disabled", false).removeClass("disabled ob-btn-disabled");
    } else {
      $btn.prop("disabled", true).addClass("disabled ob-btn-disabled");
    }
  }



  // ─── Event Binding (Delegation) ──────────────────────────────────

  $(document).ready(function () {
    var $form = $("form.cart");
    if (!$form.length) return;

    // Delegated listener for all field changes
    $form.on("change input", ".ob-field input, .ob-field select, .ob-field textarea", function () {
      // 1. Evaluate conditional logic for ALL groups (to catch cross-group dependencies)
      $.each(schemas, function (groupId) {
        evaluateConditions(String(groupId));
      });

      // 2. Recalculate pricing
      calculatePricing();

      // 3. Validate required fields
      validateRequiredFields();

      // 4. Enforce Stock
      evaluateStock();
    });



    // Quantity change re-triggers pricing & stock
    $form.on("change input", "input.qty", function () {
      calculatePricing();
      evaluateStock();
    });

    // Run initial evaluation
    $.each(schemas, function (groupId) {
      evaluateConditions(String(groupId));
    });
    calculatePricing();
    evaluateStock();
    validateRequiredFields();
  });
})(jQuery);
