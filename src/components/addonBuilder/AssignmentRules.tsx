import React from "react";
import { __ } from "@wordpress/i18n";
import { Lock } from "lucide-react";
import { ClassicMultiSelect } from "../classics";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import { useAddonContext, Assignment } from "../../store/AddonContext";
import { renderProductOption } from "./utils";
import { FormError } from "./FormError";
import { isProActive, getUpgradeUrl } from "../../utils/pro";

/**
 * AssignmentRules — Simplified:
 *
 * 1. **Visibility**: Radio toggle — Global (all products) vs Targeted
 * 2. **Reach**: Inclusion search fields (products) — only when targeted
 */
export const AssignmentRules: React.FC = () => {
  const { state, dispatch } = useAddonContext();

  const isGlobal = state.assignments.some((a) => a.target_type === "global");

  // ─── Helpers to read/write specific slices of the assignments array ───

  /**
   * Get target IDs for a specific type
   * @param targetType
   */
  const getIds = (targetType: string): number[] =>
    state.assignments
      .filter((a) => a.target_type === targetType)
      .map((a) => a.target_id);

  /**
   * Replace all assignments of a given type with new IDs
   * @param targetType
   * @param ids
   */
  const setIds = (
    targetType: Assignment["target_type"],
    ids: number[],
  ) => {
    const other = state.assignments.filter(
      (a) => a.target_type !== targetType,
    );

    const newRows: Assignment[] = ids.map((id) => ({
      target_type: targetType,
      target_id: id,
      is_exclusion: false,
    }));

    dispatch({
      type: "SET_ASSIGNMENTS",
      payload: [...other, ...newRows],
    });
  };

  // ─── Visibility toggling ───

  const setGlobal = () => {
    dispatch({
      type: "SET_ASSIGNMENTS",
      payload: [
        {
          target_type: "global",
          target_id: 0,
          is_exclusion: false,
        },
      ],
    });
  };

  const setTargeted = () => {
    // Remove global rows, keep everything else (exclusions survive)
    dispatch({
      type: "SET_ASSIGNMENTS",
      payload: state.assignments.filter((a) => a.target_type !== "global"),
    });
  };

  // ─── Shared multi-select row renderer ───

  const renderSearchFields = () => (
    <div className="opopw-grid opopw-grid-cols-1 lg:opopw-grid-cols-3 opopw-gap-x-4 opopw-gap-y-3">
      {/* Products */}
      <div>
        <label className="opopw-block opopw-text-[12px] opopw-font-semibold opopw-mb-0.5">
          {__("Products", "optionbay-product-options-addons-woo")}
        </label>
        <ClassicMultiSelect
          value={getIds("product")}
          onChange={(ids) => setIds("product", ids as number[])}
          endpoint="/optionbay-product-options-addons-woo/v1/resources/products"
          placeholder={__("Search products…", "optionbay-product-options-addons-woo")}
          renderOption={renderProductOption}
          size="regular"
        />
      </div>
    </div>
  );

  // ─── Render ───

  return (
    <ClassicSettingsTable
      title={__("Assignment Rules", "optionbay-product-options-addons-woo")}
      description={__(
        "Control where this option group appears on your store.",
        "optionbay-product-options-addons-woo",
      )}
      fields={[
        // ── Section 1: Visibility ──
        {
          label: __("Visibility", "optionbay-product-options-addons-woo"),
          tooltip: __(
            "The broad scope of where this option group is active.",
            "optionbay-product-options-addons-woo",
          ),
          render: () => (
            <div className="opopw-flex opopw-flex-col opopw-gap-1.5">
              <label className="opopw-flex opopw-items-center opopw-gap-2 opopw-cursor-pointer">
                <input
                  type="radio"
                  name="opopw-visibility"
                  checked={isGlobal}
                  onChange={() => setGlobal()}
                />
                <span>{__("Apply to all products", "optionbay-product-options-addons-woo")}</span>
              </label>
              <label className="opopw-flex opopw-items-center opopw-gap-2 opopw-cursor-pointer">
                <input
                  type="radio"
                  name="opopw-visibility"
                  checked={!isGlobal}
                  onChange={() => setTargeted()}
                />
                <span>
                  {__("Apply to specific products", "optionbay-product-options-addons-woo")}
                </span>
              </label>
            </div>
          ),
        },

        // ── Section 2: Reach (inclusions — only when targeted) ──
        ...(!isGlobal
          ? [
              {
                label: __("Reach", "optionbay-product-options-addons-woo"),
                tooltip: __(
                  "Specific targets for displaying this group.",
                  "optionbay-product-options-addons-woo",
                ),
                render: () => (
                  <div>
                    {renderSearchFields()}
                    <FormError message={state.errors?.assignments} />
                    <FormError
                      message={state.errors?.["assignments.0.target_id"]}
                    />
                  </div>
                ),
              },
            ]
          : []),

        // ── Section 3: Category/Tag targeting + Exceptions (Pro) ──
        // Locked upsell teaser — only rendered when Pro is inactive. When Pro
        // is active it swaps this whole component out via the
        // `opopw_assignment_rules_component` filter and provides the real UI.
        ...(!isProActive()
          ? [
              {
                label: (
                  <span className="opopw-flex opopw-items-center opopw-gap-2">
                    {__("Categories, Tags & Exceptions", "optionbay-product-options-addons-woo")}
                    <span className="opopw-flex opopw-text-[#ffb900]">
                      <Lock size={14} />
                    </span>
                  </span>
                ) as React.ReactNode,
                tooltip: __(
                  "Target by category or tag, and set exceptions, with Pro.",
                  "optionbay-product-options-addons-woo",
                ),
                render: () => (
                  <div className="opopw-opacity-70 opopw-border opopw-border-[#dcdcde] opopw-rounded-md opopw-p-3 opopw-bg-[#f6f7f7]">
                    <p className="opopw-text-[13px] opopw-text-[#646970] opopw-m-0 opopw-mb-2">
                      {__(
                        "Target this option group by product category or tag, and exclude specific products.",
                        "optionbay-product-options-addons-woo",
                      )}
                    </p>
                    <a
                      href={getUpgradeUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opopw-text-[#2271b1] opopw-inline-flex opopw-items-center opopw-gap-1 opopw-text-[13px]"
                    >
                      <Lock size={12} className="opopw-text-[#ffb900]" />
                      {__(
                        "Upgrade to target by category/tag and set exceptions",
                        "optionbay-product-options-addons-woo",
                      )}
                    </a>
                  </div>
                ),
              },
            ]
          : []),
      ]}
    />
  );
};
