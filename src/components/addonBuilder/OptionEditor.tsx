import React from "react";
import { __ } from "@wordpress/i18n";
import { ClassicInput, ClassicSelect, ClassicButton } from "../classics";
import { useAddonContext, FieldOption } from "../../store/AddonContext";
import { PRICE_TYPES, REDUCTION_MODES } from "./constants";
import { FormError } from "./FormError";
import { InventoryPicker } from "./InventoryPicker";
import { ClassicCheckbox } from "../classics";
import { CirclePlus, Trash2, ImagePlus } from "lucide-react";

interface OptionEditorProps {
  fieldId: string;
  fieldIndex?: number;
  fieldType?: string;
  options: FieldOption[];
  hideLabel?: boolean;
}

export const OptionEditor: React.FC<OptionEditorProps> = ({
  fieldId,
  fieldIndex: propFieldIndex,
  fieldType = "select",
  options,
  hideLabel = false,
}) => {
  const { state, dispatch } = useAddonContext();
  const fieldIndex =
    propFieldIndex !== undefined
      ? propFieldIndex
      : state.schema.findIndex((f) => f.id === fieldId);

  const isColorSwatch = fieldType === "color_swatch";
  const isImageSwatch = fieldType === "image_swatch";
  const isSwatch = isColorSwatch || isImageSwatch;

  // Calculate column count for empty state colSpan
  const colCount = 6 + (isSwatch ? 1 : 0);

  const openMediaLibrary = (idx: number) => {
    if (!(window as any).wp?.media) return;

    const frame = (window as any).wp.media({
      title: __("Select Image", "smart-product-options-addons"),
      button: { text: __("Use this image", "smart-product-options-addons") },
      multiple: false,
      library: { type: "image" },
    });

    frame.on("select", () => {
      const attachment = frame.state().get("selection").first().toJSON();
      const imageUrl = attachment.sizes?.thumbnail?.url || attachment.url || "";
      dispatch({
        type: "UPDATE_OPTION",
        payload: {
          fieldId,
          optionIndex: idx,
          updates: { image_url: imageUrl },
        },
      });
    });

    frame.open();
  };

  const getDefaultOption = (): FieldOption => {
    const base: FieldOption = {
      label: "",
      value: "",
      price_type: "none",
      price: undefined,
      weight: 0,
    };
    if (isColorSwatch) base.color = "#3498db";
    if (isImageSwatch) base.image_url = "";
    return base;
  };

  return (
    <div
      className={`spoa-flex spoa-flex-col spoa-gap-2.5 ${
        !hideLabel ? "spoa-mt-4" : ""
      }`}
    >
      {!hideLabel && (
        <label className="spoa-font-semibold spoa-block">
          {__("Choices", "smart-product-options-addons")}
        </label>
      )}

      <div className="spoa-border spoa-border-[#c3c4c7] spoa-rounded-[12px] spoa-overflow-hidden spoa-bg-white">
        <div
          className="spoa-w-0 spoa-min-w-full spoa-overflow-x-auto"
          style={{ overflowY: "auto" }}
        >
          <table
            className="spoa-w-full spoa-text-left spoa-text-[13px]"
            style={{ minWidth: isSwatch ? "700px" : "600px" }}
          >
            <thead>
              <tr className="spoa-border-b spoa-border-[#c3c4c7]">
                {/* Swatch column header */}
                {isColorSwatch && (
                  <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[70px]">
                    {__("Color", "smart-product-options-addons")}
                  </th>
                )}
                {isImageSwatch && (
                  <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[90px]">
                    {__("Image", "smart-product-options-addons")}
                  </th>
                )}
                <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327]">
                  {__("Label", "smart-product-options-addons")}
                </th>
                <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[100px]">
                  {__("Price", "smart-product-options-addons")}
                </th>
                <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[160px]">
                  {__("Price Type", "smart-product-options-addons")}
                </th>
                <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[80px]">
                  {__("Weight", "smart-product-options-addons")}
                </th>
                <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[180px]">
                  {__("Stock", "smart-product-options-addons")}
                </th>
                <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {options.length > 0 ? (
                options.map((opt, idx) => (
                  <tr
                    key={idx}
                    className="spoa-border-b spoa-border-[#c3c4c7] last:spoa-border-none"
                  >
                    {/* Color swatch picker */}
                    {isColorSwatch && (
                      <td
                        className="spoa-py-2 spoa-px-3"
                        style={{ verticalAlign: "top" }}
                      >
                        <div className="spoa-flex spoa-items-center spoa-gap-2">
                          <label
                            className={`spoa-block spoa-w-7 spoa-h-7 spoa-rounded-[6px] spoa-border ${
                              state.errors?.[
                                `schema.${fieldIndex}.options.${idx}.color`
                              ]
                                ? "spoa-border-red-400"
                                : "spoa-border-[#c3c4c7]"
                            } spoa-cursor-pointer spoa-overflow-hidden spoa-shrink-0 hover:spoa-border-[#2271b1] spoa-transition-colors`}
                            style={{ backgroundColor: opt.color || "#ffffff" }}
                            title={opt.color || "#ffffff"}
                          >
                            <input
                              type="color"
                              value={opt.color || "#ffffff"}
                              onChange={(e) =>
                                dispatch({
                                  type: "UPDATE_OPTION",
                                  payload: {
                                    fieldId,
                                    optionIndex: idx,
                                    updates: { color: e.target.value },
                                  },
                                })
                              }
                              className="spoa-opacity-0 spoa-w-0 spoa-h-0 spoa-absolute"
                            />
                          </label>
                        </div>
                      </td>
                    )}

                    {/* Image swatch picker */}
                    {isImageSwatch && (
                      <td
                        className="spoa-py-2 spoa-px-3"
                        style={{ verticalAlign: "top" }}
                      >
                        <div className="spoa-flex spoa-items-center spoa-gap-2">
                          {opt.image_url ? (
                            <div
                              className={`spoa-relative spoa-group/img spoa-w-10 spoa-h-10 spoa-rounded-[6px] spoa-border ${
                                state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.image_url`
                                ]
                                  ? "spoa-border-red-400"
                                  : "spoa-border-[#c3c4c7]"
                              } spoa-overflow-hidden spoa-shrink-0 spoa-cursor-pointer hover:spoa-border-[#2271b1] spoa-transition-colors`}
                              onClick={() => openMediaLibrary(idx)}
                              title={__("Change image", "smart-product-options-addons")}
                            >
                              <img
                                src={opt.image_url}
                                alt={opt.label || "swatch"}
                                className="spoa-w-full spoa-h-full spoa-object-cover"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openMediaLibrary(idx)}
                              className={`spoa-flex spoa-items-center spoa-justify-center spoa-w-10 spoa-h-10 spoa-rounded-[6px] spoa-border spoa-border-dashed ${
                                state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.image_url`
                                ]
                                  ? "spoa-border-red-400"
                                  : "spoa-border-[#c3c4c7]"
                              } spoa-bg-[#f6f7f7] spoa-text-[#646970] hover:spoa-border-[#2271b1] hover:spoa-text-[#2271b1] spoa-transition-colors spoa-cursor-pointer spoa-shrink-0`}
                              title={__("Upload image", "smart-product-options-addons")}
                            >
                              <ImagePlus size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Label */}
                    <td
                      className="spoa-py-2 spoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <ClassicInput
                        size="regular"
                        placeholder={__("Label", "smart-product-options-addons")}
                        value={opt.label}
                        isError={
                          !!state.errors?.[
                            `schema.${fieldIndex}.options.${idx}.label`
                          ]
                        }
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_OPTION",
                            payload: {
                              fieldId,
                              optionIndex: idx,
                              updates: {
                                label: e.target.value,
                                value: e.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, "_"),
                              },
                            },
                          })
                        }
                      />
                      <FormError
                        message={
                          state.errors?.[
                            `schema.${fieldIndex}.options.${idx}.label`
                          ]
                        }
                      />
                    </td>

                    {/* Price */}
                    <td
                      className="spoa-py-2 spoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      {opt.price_type !== "none" && (
                        <>
                          {opt.price_type === "formula" ? (
                            <ClassicInput
                              size="small"
                              placeholder={__("Formula", "smart-product-options-addons")}
                              value={opt.formula || ""}
                              isError={
                                !!state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.formula`
                                ]
                              }
                              onChange={(e) =>
                                dispatch({
                                  type: "UPDATE_OPTION",
                                  payload: {
                                    fieldId,
                                    optionIndex: idx,
                                    updates: { formula: e.target.value },
                                  },
                                })
                              }
                            />
                          ) : (
                            <ClassicInput
                              type="number"
                              size="small"
                              placeholder={__("Price", "smart-product-options-addons")}
                              value={opt.price ?? ""}
                              isError={
                                !!state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.price`
                                ]
                              }
                              onChange={(e) =>
                                dispatch({
                                  type: "UPDATE_OPTION",
                                  payload: {
                                    fieldId,
                                    optionIndex: idx,
                                    updates: {
                                      price:
                                        e.target.value === ""
                                          ? undefined
                                          : parseFloat(e.target.value),
                                    },
                                  },
                                })
                              }
                            />
                          )}
                          <FormError
                            message={
                              state.errors?.[
                                `schema.${fieldIndex}.options.${idx}.price`
                              ]
                            }
                          />
                        </>
                      )}
                    </td>

                    {/* Price Type */}
                    <td
                      className="spoa-py-2 spoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <ClassicSelect
                        value={opt.price_type}
                        differentDropdownWidth
                        isError={
                          !!state.errors?.[
                            `schema.${fieldIndex}.options.${idx}.price_type`
                          ]
                        }
                        onChange={(val) =>
                          dispatch({
                            type: "UPDATE_OPTION",
                            payload: {
                              fieldId,
                              optionIndex: idx,
                              updates: { price_type: String(val) },
                            },
                          })
                        }
                        options={PRICE_TYPES.filter(
                          (pt) => pt.value !== "character_count",
                        ).map((pt) => ({
                          value: pt.value,
                          label: pt.label,
                        }))}
                        size="short"
                      />
                      <FormError
                        message={
                          state.errors?.[
                            `schema.${fieldIndex}.options.${idx}.price_type`
                          ]
                        }
                      />
                    </td>

                    {/* Weight */}
                    <td
                      className="spoa-py-2 spoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <ClassicInput
                        type="number"
                        size="small"
                        placeholder={__("Weight", "smart-product-options-addons")}
                        value={opt.weight ?? ""}
                        isError={
                          !!state.errors?.[
                            `schema.${fieldIndex}.options.${idx}.weight`
                          ]
                        }
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_OPTION",
                            payload: {
                              fieldId,
                              optionIndex: idx,
                              updates: {
                                weight:
                                  e.target.value === ""
                                    ? undefined
                                    : parseFloat(e.target.value),
                              },
                            },
                          })
                        }
                      />
                    </td>

                    {/* Stock */}
                    <td
                      className="spoa-py-2 spoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <div className="spoa-flex spoa-flex-col spoa-gap-1.5">
                        <ClassicCheckbox
                          label={__("Enable Stock", "smart-product-options-addons")}
                          checked={opt.enable_stock || false}
                          isError={
                            !!state.errors?.[
                              `schema.${fieldIndex}.options.${idx}.enable_stock`
                            ]
                          }
                          onChange={(checked) =>
                            dispatch({
                              type: "UPDATE_OPTION",
                              payload: {
                                fieldId,
                                optionIndex: idx,
                                updates: { enable_stock: checked },
                              },
                            })
                          }
                        />
                        {opt.enable_stock && (
                          <>
                            <InventoryPicker
                              value={opt.inventory_id}
                              isError={
                                !!state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.inventory_id`
                                ]
                              }
                              onChange={(val) =>
                                dispatch({
                                  type: "UPDATE_OPTION",
                                  payload: {
                                    fieldId,
                                    optionIndex: idx,
                                    updates: { inventory_id: val },
                                  },
                                })
                              }
                            />
                            <ClassicSelect
                              size="short"
                              value={opt.reduction_mode || "per_item_qty"}
                              isError={
                                !!state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.reduction_mode`
                                ]
                              }
                              onChange={(val) =>
                                dispatch({
                                  type: "UPDATE_OPTION",
                                  payload: {
                                    fieldId,
                                    optionIndex: idx,
                                    updates: { reduction_mode: String(val) },
                                  },
                                })
                              }
                              options={REDUCTION_MODES}
                            />
                            {opt.reduction_mode === "formula" && (
                              <ClassicInput
                                size="large"
                                value={opt.reduction_formula || ""}
                                isError={
                                  !!state.errors?.[
                                    `schema.${fieldIndex}.options.${idx}.reduction_formula`
                                  ]
                                }
                                onChange={(e) =>
                                  dispatch({
                                    type: "UPDATE_OPTION",
                                    payload: {
                                      fieldId,
                                      optionIndex: idx,
                                      updates: {
                                        reduction_formula: e.target.value,
                                      },
                                    },
                                  })
                                }
                                placeholder="qty * 1"
                              />
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="spoa-py-2">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "REMOVE_OPTION",
                            payload: { fieldId, optionIndex: idx },
                          })
                        }
                        className="spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1 spoa-text-[#d63638] hover:spoa-text-[#b32d2e] spoa-transition-colors"
                        title={__("Remove choice", "smart-product-options-addons")}
                      >
                        <Trash2 className="spoa-size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={colCount}
                    className="spoa-py-6 spoa-text-center spoa-text-[#94a3b8] spoa-italic"
                  >
                    {__("No choices added yet.", "smart-product-options-addons")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="spoa-flex spoa-justify-start">
        <ClassicButton
          variant="secondary"
          onClick={() =>
            dispatch({
              type: "ADD_OPTION",
              payload: {
                fieldId,
                option: getDefaultOption(),
              },
            })
          }
        >
          <CirclePlus className="spoa-size-4" />{" "}
          {__("Add Choice", "smart-product-options-addons")}
        </ClassicButton>
      </div>

      <FormError message={state.errors?.[`schema.${fieldIndex}.options`]} />
    </div>
  );
};
