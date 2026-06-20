import React from "react";
import { __ } from "@wordpress/i18n";
import { ClassicMultiSelect } from "../classics";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import { useAddonContext, Assignment } from "../../store/AddonContext";
import { renderProductOption } from "./utils";
import { FormError } from "./FormError";

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
    <div className="wpab-wpoa-grid wpab-wpoa-grid-cols-1 lg:wpab-wpoa-grid-cols-3 wpab-wpoa-gap-x-4 wpab-wpoa-gap-y-3">
      {/* Products */}
      <div>
        <label className="wpab-wpoa-block wpab-wpoa-text-[12px] wpab-wpoa-font-semibold wpab-wpoa-mb-0.5">
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
            <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1.5">
              <label className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-cursor-pointer">
                <input
                  type="radio"
                  name="ob-visibility"
                  checked={isGlobal}
                  onChange={() => setGlobal()}
                />
                <span>{__("Apply to all products", "optionbay-product-options-addons-woo")}</span>
              </label>
              <label className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-cursor-pointer">
                <input
                  type="radio"
                  name="ob-visibility"
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
      ]}
    />
  );
};
