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
      title: __("Select Image", "optionbay-product-options-addons-woo"),
      button: { text: __("Use this image", "optionbay-product-options-addons-woo") },
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
      className={`wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-2.5 ${
        !hideLabel ? "wpab-wpoa-mt-4" : ""
      }`}
    >
      {!hideLabel && (
        <label className="wpab-wpoa-font-semibold wpab-wpoa-block">
          {__("Choices", "optionbay-product-options-addons-woo")}
        </label>
      )}

      <div className="wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] wpab-wpoa-rounded-[12px] wpab-wpoa-overflow-hidden wpab-wpoa-bg-white">
        <div
          className="wpab-wpoa-w-0 wpab-wpoa-min-w-full wpab-wpoa-overflow-x-auto"
          style={{ overflowY: "auto" }}
        >
          <table
            className="wpab-wpoa-w-full wpab-wpoa-text-left wpab-wpoa-text-[13px]"
            style={{ minWidth: isSwatch ? "700px" : "600px" }}
          >
            <thead>
              <tr className="wpab-wpoa-border-b wpab-wpoa-border-[#c3c4c7]">
                {/* Swatch column header */}
                {isColorSwatch && (
                  <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[70px]">
                    {__("Color", "optionbay-product-options-addons-woo")}
                  </th>
                )}
                {isImageSwatch && (
                  <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[90px]">
                    {__("Image", "optionbay-product-options-addons-woo")}
                  </th>
                )}
                <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327]">
                  {__("Label", "optionbay-product-options-addons-woo")}
                </th>
                <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[100px]">
                  {__("Price", "optionbay-product-options-addons-woo")}
                </th>
                <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[160px]">
                  {__("Price Type", "optionbay-product-options-addons-woo")}
                </th>
                <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[80px]">
                  {__("Weight", "optionbay-product-options-addons-woo")}
                </th>
                <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[180px]">
                  {__("Stock", "optionbay-product-options-addons-woo")}
                </th>
                <th className="!wpab-wpoa-py-[10px] !wpab-wpoa-px-[12px] wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327] wpab-wpoa-w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {options.length > 0 ? (
                options.map((opt, idx) => (
                  <tr
                    key={idx}
                    className="wpab-wpoa-border-b wpab-wpoa-border-[#c3c4c7] last:wpab-wpoa-border-none"
                  >
                    {/* Color swatch picker */}
                    {isColorSwatch && (
                      <td
                        className="wpab-wpoa-py-2 wpab-wpoa-px-3"
                        style={{ verticalAlign: "top" }}
                      >
                        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
                          <label
                            className={`wpab-wpoa-block wpab-wpoa-w-7 wpab-wpoa-h-7 wpab-wpoa-rounded-[6px] wpab-wpoa-border ${
                              state.errors?.[
                                `schema.${fieldIndex}.options.${idx}.color`
                              ]
                                ? "wpab-wpoa-border-red-400"
                                : "wpab-wpoa-border-[#c3c4c7]"
                            } wpab-wpoa-cursor-pointer wpab-wpoa-overflow-hidden wpab-wpoa-shrink-0 hover:wpab-wpoa-border-[#2271b1] wpab-wpoa-transition-colors`}
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
                              className="wpab-wpoa-opacity-0 wpab-wpoa-w-0 wpab-wpoa-h-0 wpab-wpoa-absolute"
                            />
                          </label>
                        </div>
                      </td>
                    )}

                    {/* Image swatch picker */}
                    {isImageSwatch && (
                      <td
                        className="wpab-wpoa-py-2 wpab-wpoa-px-3"
                        style={{ verticalAlign: "top" }}
                      >
                        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
                          {opt.image_url ? (
                            <div
                              className={`wpab-wpoa-relative wpab-wpoa-group/img wpab-wpoa-w-10 wpab-wpoa-h-10 wpab-wpoa-rounded-[6px] wpab-wpoa-border ${
                                state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.image_url`
                                ]
                                  ? "wpab-wpoa-border-red-400"
                                  : "wpab-wpoa-border-[#c3c4c7]"
                              } wpab-wpoa-overflow-hidden wpab-wpoa-shrink-0 wpab-wpoa-cursor-pointer hover:wpab-wpoa-border-[#2271b1] wpab-wpoa-transition-colors`}
                              onClick={() => openMediaLibrary(idx)}
                              title={__("Change image", "optionbay-product-options-addons-woo")}
                            >
                              <img
                                src={opt.image_url}
                                alt={opt.label || "swatch"}
                                className="wpab-wpoa-w-full wpab-wpoa-h-full wpab-wpoa-object-cover"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openMediaLibrary(idx)}
                              className={`wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-center wpab-wpoa-w-10 wpab-wpoa-h-10 wpab-wpoa-rounded-[6px] wpab-wpoa-border wpab-wpoa-border-dashed ${
                                state.errors?.[
                                  `schema.${fieldIndex}.options.${idx}.image_url`
                                ]
                                  ? "wpab-wpoa-border-red-400"
                                  : "wpab-wpoa-border-[#c3c4c7]"
                              } wpab-wpoa-bg-[#f6f7f7] wpab-wpoa-text-[#646970] hover:wpab-wpoa-border-[#2271b1] hover:wpab-wpoa-text-[#2271b1] wpab-wpoa-transition-colors wpab-wpoa-cursor-pointer wpab-wpoa-shrink-0`}
                              title={__("Upload image", "optionbay-product-options-addons-woo")}
                            >
                              <ImagePlus size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Label */}
                    <td
                      className="wpab-wpoa-py-2 wpab-wpoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <ClassicInput
                        size="regular"
                        placeholder={__("Label", "optionbay-product-options-addons-woo")}
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
                      className="wpab-wpoa-py-2 wpab-wpoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      {opt.price_type !== "none" && (
                        <>
                          <ClassicInput
                            type="number"
                            size="small"
                            placeholder={__("Price", "optionbay-product-options-addons-woo")}
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
                      className="wpab-wpoa-py-2 wpab-wpoa-px-3"
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
                        options={PRICE_TYPES.map((pt) => ({
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
                      className="wpab-wpoa-py-2 wpab-wpoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <ClassicInput
                        type="number"
                        size="small"
                        placeholder={__("Weight", "optionbay-product-options-addons-woo")}
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
                      className="wpab-wpoa-py-2 wpab-wpoa-px-3"
                      style={{ verticalAlign: "top" }}
                    >
                      <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1.5">
                        <ClassicCheckbox
                          label={__("Enable Stock", "optionbay-product-options-addons-woo")}
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

                          </>
                        )}
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="wpab-wpoa-py-2">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "REMOVE_OPTION",
                            payload: { fieldId, optionIndex: idx },
                          })
                        }
                        className="wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer wpab-wpoa-p-1 wpab-wpoa-text-[#d63638] hover:wpab-wpoa-text-[#b32d2e] wpab-wpoa-transition-colors"
                        title={__("Remove choice", "optionbay-product-options-addons-woo")}
                      >
                        <Trash2 className="wpab-wpoa-size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={colCount}
                    className="wpab-wpoa-py-6 wpab-wpoa-text-center wpab-wpoa-text-[#94a3b8] wpab-wpoa-italic"
                  >
                    {__("No choices added yet.", "optionbay-product-options-addons-woo")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="wpab-wpoa-flex wpab-wpoa-justify-start">
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
          <CirclePlus className="wpab-wpoa-size-4" />{" "}
          {__("Add Choice", "optionbay-product-options-addons-woo")}
        </ClassicButton>
      </div>

      <FormError message={state.errors?.[`schema.${fieldIndex}.options`]} />
    </div>
  );
};
