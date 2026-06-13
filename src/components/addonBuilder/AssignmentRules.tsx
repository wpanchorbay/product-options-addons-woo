import React from "react";
import { __ } from "@wordpress/i18n";
import { ClassicMultiSelect } from "../classics";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import { useAddonContext, Assignment } from "../../store/AddonContext";
import { renderProductOption } from "./utils";
import { FormError } from "./FormError";

/**
 * AssignmentRules — Redesigned with 3 sections:
 *
 * 1. **Visibility**: Radio toggle — Global (all products) vs Targeted
 * 2. **Reach**: Inclusion search fields (products, categories, tags) — only when targeted
 * 3. **Exceptions**: Exclusion search fields (products, categories, tags) — always visible
 */
export const AssignmentRules: React.FC = () => {
  const { state, dispatch } = useAddonContext();

  const isGlobal = state.assignments.some((a) => a.target_type === "global");

  // ─── Helpers to read/write specific slices of the assignments array ───

  /**
   * Get target IDs for a specific type and inclusion/exclusion status
   * @param targetType
   * @param isExclusion
   */
  const getIds = (targetType: string, isExclusion: boolean): number[] =>
    state.assignments
      .filter(
        (a) => a.target_type === targetType && a.is_exclusion === isExclusion,
      )
      .map((a) => a.target_id);
  /**
   * Replace all assignments of a given type+exclusion status with new IDs
   * @param targetType
   * @param isExclusion
   * @param ids
   */
  const setIds = (
    targetType: Assignment["target_type"],
    isExclusion: boolean,
    ids: number[],
  ) => {
    // Keep everything that doesn't match this type+exclusion combo
    const other = state.assignments.filter(
      (a) => !(a.target_type === targetType && a.is_exclusion === isExclusion),
    );

    // Build new rows for the incoming IDs
    const newRows: Assignment[] = ids.map((id) => ({
      target_type: targetType,
      target_id: id,
      is_exclusion: isExclusion,
    }));

    dispatch({
      type: "SET_ASSIGNMENTS",
      payload: [...other, ...newRows],
    });
  };

  // ─── Visibility toggling ───

  const setGlobal = () => {
    // Keep only exclusion assignments + add the global row
    const exclusions = state.assignments.filter((a) => a.is_exclusion);
    dispatch({
      type: "SET_ASSIGNMENTS",
      payload: [
        {
          target_type: "global",
          target_id: 0,
          is_exclusion: false,
        },
        ...exclusions,
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

  const renderSearchFields = (isExclusion: boolean) => (
    <div className="spoa-grid spoa-grid-cols-1 lg:spoa-grid-cols-3 spoa-gap-x-4 spoa-gap-y-3">
      {/* Products */}
      <div>
        <label className="spoa-block spoa-text-[12px] spoa-font-semibold spoa-mb-0.5">
          {__("Products", "smart-product-options-addons")}
        </label>
        <ClassicMultiSelect
          value={getIds("product", isExclusion)}
          onChange={(ids) => setIds("product", isExclusion, ids as number[])}
          endpoint="/smart-product-options-addons/v1/resources/products"
          placeholder={__("Search products…", "smart-product-options-addons")}
          renderOption={renderProductOption}
          size="regular"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="spoa-block spoa-text-[12px] spoa-font-semibold spoa-mb-0.5">
          {__("Categories", "smart-product-options-addons")}
        </label>
        <ClassicMultiSelect
          value={getIds("category", isExclusion)}
          onChange={(ids) => setIds("category", isExclusion, ids as number[])}
          endpoint="/smart-product-options-addons/v1/resources/categories"
          placeholder={__("Search categories…", "smart-product-options-addons")}
          size="regular"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="spoa-block spoa-text-[12px] spoa-font-semibold spoa-mb-0.5">
          {__("Tags", "smart-product-options-addons")}
        </label>
        <ClassicMultiSelect
          value={getIds("tag", isExclusion)}
          onChange={(ids) => setIds("tag", isExclusion, ids as number[])}
          endpoint="/smart-product-options-addons/v1/resources/tags"
          placeholder={__("Search tags…", "smart-product-options-addons")}
          size="regular"
        />
      </div>
    </div>
  );

  // ─── Render ───

  return (
    <ClassicSettingsTable
      title={__("Assignment Rules", "smart-product-options-addons")}
      description={__(
        "Control where this option group appears on your store.",
        "smart-product-options-addons",
      )}
      fields={[
        // ── Section 1: Visibility ──
        {
          label: __("Visibility", "smart-product-options-addons"),
          tooltip: __(
            "The broad scope of where this option group is active.",
            "smart-product-options-addons",
          ),
          render: () => (
            <div className="spoa-flex spoa-flex-col spoa-gap-1.5">
              <label className="spoa-flex spoa-items-center spoa-gap-2 spoa-cursor-pointer">
                <input
                  type="radio"
                  name="ob-visibility"
                  checked={isGlobal}
                  onChange={() => setGlobal()}
                />
                <span>{__("Apply to all products", "smart-product-options-addons")}</span>
              </label>
              <label className="spoa-flex spoa-items-center spoa-gap-2 spoa-cursor-pointer">
                <input
                  type="radio"
                  name="ob-visibility"
                  checked={!isGlobal}
                  onChange={() => setTargeted()}
                />
                <span>
                  {__(
                    "Apply to specific products, categories, or tags",
                    "smart-product-options-addons",
                  )}
                </span>
              </label>
            </div>
          ),
        },

        // ── Section 2: Reach (inclusions — only when targeted) ──
        ...(!isGlobal
          ? [
              {
                label: __("Reach", "smart-product-options-addons"),
                tooltip: __(
                  "Specific targets for displaying this group.",
                  "smart-product-options-addons",
                ),
                render: () => (
                  <div>
                    {renderSearchFields(false)}
                    <FormError message={state.errors?.assignments} />
                    <FormError
                      message={state.errors?.["assignments.0.target_id"]}
                    />
                  </div>
                ),
              },
            ]
          : []),

        // ── Section 3: Exceptions (exclusions — always visible) ──
        {
          label: __("Exceptions", "smart-product-options-addons"),
          tooltip: __(
            "Specific targets to ignore regardless of other rules.",
            "smart-product-options-addons",
          ),
          render: () => renderSearchFields(true),
        },
      ]}
    />
  );
};
