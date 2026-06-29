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
  if (typeof window.opopwSchema === "undefined") {

    return;
  }

  var OB = window.opopwSchema;
  var schemas = OB.schemas || {};
  var basePrice = parseFloat(OB.basePrice) || 0;
  var originalImageAttr = null;
  var isResettingFromThumbnail = false;
  var lastInteractedOption = null;



  // ─── Conditional Logic Engine ────────────────────────────────────

  /**
   * Get the current value of a field by its field ID.
   */
  function getFieldValue(groupId, fieldId) {
    var $wrapper = $('#opopw-options').find(
      '.opopw-field[data-group-id="' +
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

      var $field = $('#opopw-options').find(
        '.opopw-field[data-group-id="' +
        groupId +
        '"][data-field-id="' +
        field.id +
        '"]'
      );

      if (shouldShow) {
        $field.removeClass("opopw-hidden");
      } else {
        $field.addClass("opopw-hidden");
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
        var $wrapper = $('#opopw-options').find(
          '.opopw-field[data-group-id="' +
          groupId +
          '"][data-field-id="' +
          field.id +
          '"]'
        );

        if ($wrapper.length > 1 && window.OPOPW_DEBUG) {
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
        var $fieldWrapper = $('#opopw-options').find(
          '.opopw-field[data-group-id="' + groupId + '"][data-field-id="' + field.id + '"]'
        );
        if (!$fieldWrapper.length) return;

        // 1. Field-level stock
        if (field.enable_stock && field.inventory_id) {
          var inv = OB.inventory[field.inventory_id];
          if (inv && !inv.allow_backorders) {
            var reductionAmount = calculateReductionAmount(field.reduction_mode, currentQty);
            var remaining = inv.stock - (inv.reserved || 0);

            if (remaining < reductionAmount) {
              $fieldWrapper.find("input, select, textarea").prop("disabled", true).addClass("opopw-out-of-stock");
              if ($fieldWrapper.find(".opopw-stock-badge").length === 0) {
                $fieldWrapper.find(".opopw-field__label").append(' <span class="opopw-stock-badge out-of-stock">' + (__("Out of stock", "optionbay-product-options-addons-woo")) + '</span>');
              }
            } else {
              $fieldWrapper.find("input, select, textarea").prop("disabled", false).removeClass("opopw-out-of-stock");
              $fieldWrapper.find(".opopw-stock-badge").remove();
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
      return $wrapper.find('.opopw-swatch-input[value="' + value + '"]');
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
      $el.prop("disabled", true).addClass("opopw-out-of-stock");
      getOptionLabel($el).addClass('opopw-option-disabled').attr('title', __("Out of stock", "optionbay-product-options-addons-woo"));
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
      $el.prop("disabled", false).removeClass("opopw-out-of-stock");
      getOptionLabel($el).removeClass('opopw-option-disabled').removeAttr('title');
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
    $(document.body).trigger("opopw_totals_updated", [total, basePrice]);
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

    var $totalEl = $(".opopw-live-total");

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

        var $wrapper = $('#opopw-options').find(
          '.opopw-field[data-group-id="' +
          groupId +
          '"][data-field-id="' +
          field.id +
          '"]'
        );

        if ($wrapper.length > 1 && window.OPOPW_DEBUG) {
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
      $btn.prop("disabled", false).removeClass("disabled opopw-btn-disabled");
    } else {
      $btn.prop("disabled", true).addClass("disabled opopw-btn-disabled");
    }
  }

  function captureOriginalImage() {
    var $gallery = $(".woocommerce-product-gallery");
    if (!$gallery.length) return;

    var $img = $gallery.find(".woocommerce-product-gallery__wrapper .woocommerce-product-gallery__image img, .woocommerce-product-gallery__image--placeholder img, .woocommerce-product-gallery img").first();
    var $link = $img.parent("a");
    if (!$link.length) {
      $link = $gallery.find(".woocommerce-product-gallery__image a, .woocommerce-product-gallery__image--placeholder a, .woocommerce-product-gallery__wrapper a").first();
    }

    if ($img.length) {
      originalImageAttr = {
        img: {
          src: $img.attr("src") || "",
          srcset: $img.attr("srcset") || "",
          sizes: $img.attr("sizes") || "",
          "data-src": $img.attr("data-src") || "",
          "data-large_image": $img.attr("data-large_image") || "",
          "data-large_image_width": $img.attr("data-large_image_width") || "",
          "data-large_image_height": $img.attr("data-large_image_height") || ""
        },
        link: $link.length ? {
          href: $link.attr("href") || "",
          title: $link.attr("title") || ""
        } : null
      };
    }
  }

  function getCleanFilename(url) {
    if (!url) return "";
    var parts = url.split('/');
    var filename = parts[parts.length - 1];
    return filename.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');
  }

  function getLinkedImages() {
    var images = [];
    var seen = {};

    $.each(schemas, function (groupId, groupData) {
      if (!groupData.fields) return;
      $.each(groupData.fields, function (_, field) {
        if (field.options) {
          $.each(field.options, function (_, opt) {
            if (opt.linked_image_url) {
              var src = opt.linked_image_single_url || opt.linked_image_url;
              if (!seen[src]) {
                images.push({
                  src: src,
                  srcset: opt.linked_image_srcset || "",
                  large: opt.linked_image_url,
                  width: opt.linked_image_width || "",
                  height: opt.linked_image_height || "",
                  optionValue: opt.value,
                  fieldId: field.id,
                  groupId: groupId
                });
                seen[src] = true;
              }
            }
          });
        }
      });
    });

    return images;
  }

  function appendOptionImagesToGallery() {
    var images = getLinkedImages();
    if (images.length === 0) return;

    var $gallery = $(".woocommerce-product-gallery");
    if (!$gallery.length) return;

    var $wrapper = $gallery.find(".woocommerce-product-gallery__wrapper");
    if (!$wrapper.length) return;

    var $placeholder = $gallery.find(".woocommerce-product-gallery__image--placeholder");
    if ($placeholder.length) {
      $placeholder.remove();
      $gallery.removeClass("woocommerce-product-gallery--without-images");
    }

    var flexslider = $gallery.data("flexslider");

    $.each(images, function(idx, imgData) {
      var cleanSrc = getCleanFilename(imgData.src);
      var exists = false;
      
      $wrapper.find("img").each(function() {
        if (getCleanFilename($(this).attr("src")) === cleanSrc) {
          exists = true;
          return false;
        }
      });
      if (exists) return;

      var $slide = $('<div class="woocommerce-product-gallery__image"></div>');
      $slide.attr({
        "data-thumb": imgData.src,
        "data-option-val": imgData.optionValue,
        "data-field-id": imgData.fieldId,
        "data-group-id": imgData.groupId
      });

      var $a = $("<a></a>").attr("href", imgData.large);
      var $img = $("<img />").attr({
        src: imgData.src,
        srcset: imgData.srcset,
        "data-src": imgData.large,
        "data-large_image": imgData.large,
        "data-large_image_width": imgData.width,
        "data-large_image_height": imgData.height,
        width: imgData.width || 416,
        height: imgData.height || 416
      });

      $a.append($img);
      $slide.append($a);

      if (flexslider && typeof flexslider.addSlide === "function") {
        flexslider.addSlide($slide);
      } else {
        $wrapper.append($slide);
      }
    });

    if (!flexslider && typeof $.fn.wc_product_gallery !== "undefined") {
      $gallery.wc_product_gallery();
    }
  }

  function handleImageSwap() {
    var targetImage = null;

    if (lastInteractedOption) {
      var opt = lastInteractedOption;
      var $fieldWrapper = $('#opopw-options').find(
        '.opopw-field[data-group-id="' + opt.groupId + '"][data-field-id="' + opt.fieldId + '"]'
      );
      var isVisible = $fieldWrapper.length && $fieldWrapper.is(":visible");
      if (isVisible) {
        var $input = $fieldWrapper.find('input[value="' + opt.value + '"], select');
        var isSelected = false;
        if ($input.is("select")) {
          isSelected = ($input.val() === opt.value);
        } else if ($input.is('[type="radio"]') || $input.is('[type="checkbox"]')) {
          isSelected = $input.prop("checked");
        }
        
        if (isSelected) {
          var groupData = schemas[opt.groupId];
          if (groupData && groupData.fields) {
            $.each(groupData.fields, function(_, field) {
              if (String(field.id) === String(opt.fieldId)) {
                var optSchema = findOptionSchema(field, opt.value);
                if (optSchema) {
                  targetImage = optSchema;
                }
                return false;
              }
            });
          }
        }
      }
    }

    if (!targetImage) {

    $.each(schemas, function (groupId, groupData) {
      if (!groupData.fields) return;
      $.each(groupData.fields, function (_, field) {
        var $wrapper = $('#opopw-options').find(
          '.opopw-field[data-group-id="' +
          groupId +
          '"][data-field-id="' +
          field.id +
          '"]'
        );

        var isVisible = $wrapper.length && $wrapper.is(":visible");
        if (!isVisible) return;

        if (field.type === "select") {
          var $selectedOption = $wrapper.find("select option:selected");
          var linkedImg = $selectedOption.attr("data-linked-image");
          if (linkedImg) {
            var val = $selectedOption.val();
            var optSchema = findOptionSchema(field, val);
            if (optSchema) {
              targetImage = optSchema;
            }
          }
        } else if (field.type === "radio" || field.type === "color_swatch" || field.type === "image_swatch") {
          var $checkedInput = $wrapper.find('input[type="radio"]:checked');
          var linkedImg = $checkedInput.attr("data-linked-image");
          if (linkedImg) {
            var val = $checkedInput.val();
            var optSchema = findOptionSchema(field, val);
            if (optSchema) {
              targetImage = optSchema;
            }
          }
        } else if (field.type === "checkbox") {
          if (field.options && field.options.length > 0) {
            var $checkedInputs = $wrapper.find('input[type="checkbox"]:checked');
            $checkedInputs.each(function() {
              var val = $(this).val();
              var optSchema = findOptionSchema(field, val);
              if (optSchema && optSchema.linked_image_url) {
                targetImage = optSchema;
              }
            });
          }
        }
      });
    });
  }

    var $gallery = $(".woocommerce-product-gallery");
    var flexslider = $gallery.data("flexslider");
    var hasFlexsliderLib = (typeof $.fn.flexslider !== "undefined");

    if (hasFlexsliderLib) {
      if (flexslider) {
        if (targetImage) {
          var targetSrc = targetImage.linked_image_single_url || targetImage.linked_image_url;
          var cleanTarget = getCleanFilename(targetSrc);
          var targetIndex = 0;

          $gallery.find(".woocommerce-product-gallery__wrapper > .woocommerce-product-gallery__image").each(function(idx) {
            var $imgEl = $(this).find("img").first();
            if ($imgEl.length && (getCleanFilename($imgEl.attr("src")) === cleanTarget || getCleanFilename($imgEl.attr("data-large_image")) === cleanTarget)) {
              targetIndex = idx;
              return false;
            }
          });

          if (flexslider.currentSlide !== targetIndex) {
            flexslider.flexAnimate(targetIndex);
          }
        } else {
          if (!isResettingFromThumbnail) {
            if (flexslider.currentSlide !== 0) {
              flexslider.flexAnimate(0);
            }
          }
        }
      }
    } else {
      // Fallback: Swap Slide 0 attributes directly for non-slider themes
      var $img = $gallery.find(".woocommerce-product-gallery__wrapper .woocommerce-product-gallery__image img, .woocommerce-product-gallery__image--placeholder img, .woocommerce-product-gallery img").first();
      if (!$img.length) return;

      var $link = $img.parent("a");
      if (!$link.length) {
        $link = $gallery.find(".woocommerce-product-gallery__image a, .woocommerce-product-gallery__image--placeholder a, .woocommerce-product-gallery__wrapper a").first();
      }

      if (targetImage) {
        var newSrc = targetImage.linked_image_single_url || targetImage.linked_image_url;
        var newSrcset = targetImage.linked_image_srcset || "";
        var newLargeSrc = targetImage.linked_image_url;

        $img.addClass("opopw-image-swapping");

        $img.attr("src", newSrc);
        if (newSrcset) {
          $img.attr("srcset", newSrcset);
        } else {
          $img.removeAttr("srcset");
        }
        $img.removeAttr("sizes");
        $img.attr("data-src", newLargeSrc);
        $img.attr("data-large_image", newLargeSrc);
        $img.attr("data-large_image_width", targetImage.linked_image_width || "");
        $img.attr("data-large_image_height", targetImage.linked_image_height || "");

        if ($link.length) {
          $link.attr("href", newLargeSrc);
        }

        setTimeout(function() {
          $img.removeClass("opopw-image-swapping");
        }, 200);
      } else if (originalImageAttr) {
        var orig = originalImageAttr;
        $img.addClass("opopw-image-swapping");

        $img.attr("src", orig.img.src);
        if (orig.img.srcset) {
          $img.attr("srcset", orig.img.srcset);
        } else {
          $img.removeAttr("srcset");
        }
        if (orig.img.sizes) $img.attr("sizes", orig.img.sizes);
        $img.attr("data-src", orig.img["data-src"]);
        $img.attr("data-large_image", orig.img["data-large_image"]);
        $img.attr("data-large_image_width", orig.img["data-large_image_width"]);
        $img.attr("data-large_image_height", orig.img["data-large_image_height"]);

        if ($link.length && orig.link) {
          $link.attr("href", orig.link.href);
          $link.attr("title", orig.link.title);
        }

        setTimeout(function() {
          $img.removeClass("opopw-image-swapping");
        }, 200);
      }
    }
  }

  function bindThumbnailFormSync() {
    var $gallery = $(".woocommerce-product-gallery");
    
    $gallery.on("click.opopw-sync", ".flex-control-thumbs li, .thumbnails .zoom", function() {
      var $li = $(this);
      var idx = $li.index();
      
      var $slides = $gallery.find(".woocommerce-product-gallery__wrapper > .woocommerce-product-gallery__image");
      var $slide = $slides.eq(idx);
      if (!$slide.length) return;

      var optVal = $slide.attr("data-option-val");
      var fieldId = $slide.attr("data-field-id");
      var groupId = $slide.attr("data-group-id");

      var flexslider = $gallery.data("flexslider");
      if (flexslider && typeof flexslider.flexAnimate === "function") {
        if (flexslider.currentSlide !== idx) {
          flexslider.flexAnimate(idx);
        }
      }

      if (optVal && fieldId && groupId) {
        lastInteractedOption = { groupId: groupId, fieldId: fieldId, value: optVal };
        var $fieldWrapper = $('#opopw-options').find(
          '.opopw-field[data-group-id="' + groupId + '"][data-field-id="' + fieldId + '"]'
        );

        if ($fieldWrapper.length) {
          var $fieldInput = $fieldWrapper.find('input[value="' + optVal + '"], select');
          if ($fieldInput.is("select")) {
            if ($fieldInput.val() !== optVal) {
              $fieldInput.val(optVal).trigger("change");
            }
          } else if ($fieldInput.is('[type="radio"]') || $fieldInput.is('[type="checkbox"]')) {
            if (!$fieldInput.prop("checked")) {
              $fieldInput.prop("checked", true).trigger("change");
            }
          }
        }
      }
    });
  }

  function findOptionSchema(field, value) {
    var found = null;
    $.each(field.options || [], function (_, opt) {
      if (String(opt.value) === String(value)) {
        found = opt;
        return false;
      }
    });
    return found;
  }

  // ─── Event Binding (Delegation) ──────────────────────────────────

  $(document).ready(function () {
    var $form = $("form.cart");
    if (!$form.length) return;

    captureOriginalImage();
    appendOptionImagesToGallery();
    bindThumbnailFormSync();

    // Delegated listener for all field changes
    $form.on("change input", ".opopw-field input, .opopw-field select, .opopw-field textarea", function () {
      var $field = $(this).closest(".opopw-field");
      var groupId = $field.attr("data-group-id");
      var fieldId = $field.attr("data-field-id");
      var val = $(this).val();
      if ($(this).is('[type="radio"]') || $(this).is('[type="checkbox"]')) {
        if (!$(this).prop("checked")) {
          val = "";
        } else {
          val = $(this).val();
        }
      }

      var hasImg = false;
      var groupData = schemas[groupId];
      if (groupData && groupData.fields) {
        $.each(groupData.fields, function(_, f) {
          if (String(f.id) === String(fieldId)) {
            var optSchema = findOptionSchema(f, val);
            if (optSchema && optSchema.linked_image_url) {
              hasImg = true;
            }
            return false;
          }
        });
      }

      if (hasImg) {
        lastInteractedOption = { groupId: groupId, fieldId: fieldId, value: val };
      } else if (lastInteractedOption && lastInteractedOption.groupId === groupId && lastInteractedOption.fieldId === fieldId) {
        lastInteractedOption = null;
      }

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

      // 5. Image swap logic
      handleImageSwap();
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
    handleImageSwap();
  });
})(jQuery);
