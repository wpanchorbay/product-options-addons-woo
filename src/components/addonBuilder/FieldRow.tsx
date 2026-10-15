import React, { useState } from "react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { __ } from "@wordpress/i18n";
import { applyFilters } from "@wordpress/hooks";
import { Draggable } from "@hello-pangea/dnd";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Minus,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react";
import {
  FIELD_TYPE_ICONS,
  FIELD_TYPES,
  PRICE_TYPES,
  isPresentational,
  REDUCTION_MODES,
} from "./constants";
import {
  ClassicButton,
  ClassicInput,
  ClassicSelect,
  ClassicCheckbox,
} from "../classics";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import {
  useAddonContext,
  getDefaultField,
  FieldDefinition,
} from "../../store/AddonContext";
import { Tooltip } from "../common/ToolTip";
import { FIELD_TOOLTIPS } from "./tooltips";
import { FormError } from "./FormError";
import { OptionEditorAccordion } from "./OptionEditorAccordion";
import { ConditionEditor } from "./ConditionEditor";
import { WPEditor } from "../common/WPEditor";
import { InventoryPicker } from "./InventoryPicker";

interface FieldRowProps {
  field: FieldDefinition;
  index: number;
}

export const FieldRow: React.FC<FieldRowProps> = ({ field, index }) => {
  const { state, dispatch } = useAddonContext();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isExpanded = state.expandedFieldId === field.id;
  const hasError = Object.keys(state.errors || {}).some((key) =>
    key.startsWith(`schema.${index}.`),
  );
  const hasOptions = [
    "select",
    "radio",
    "checkbox",
    "color_swatch",
    "image_swatch",
  ].includes(field.type);
  const anyOptionHasStock =
    hasOptions && (field.options || []).some((opt) => opt.enable_stock);

  const update = (updates: Partial<FieldDefinition>) => {
    dispatch({
      type: "UPDATE_FIELD",
      payload: { id: field.id, updates },
    });
  };

  return (
    <Draggable draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          id={`opopw-field-row-${field.id}`}
          data-expanded={isExpanded}
          className={`opopw-w-full opopw-border-b opopw-border-[#c3c4c7] opopw-transition-all ${
            isExpanded
              ? "opopw-border-l-[1px] opopw-border-l-[#2271b1] opopw-bg-[#f0f6fc]"
              : hasError
              ? "!opopw-border-b-[#d63638]"
              : ""
          }`}
          style={{ ...provided.draggableProps.style }}
        >
          <div
            onClick={() =>
              dispatch({
                type: "TOGGLE_EXPAND_FIELD",
                payload: field.id,
              })
            }
            className={`opopw-flex opopw-items-center opopw-py-3 opopw-px-4 opopw-transition-colors opopw-cursor-pointer opopw-group ${
              snapshot.isDragging ? "opopw-shadow-md" : ""
            } ${
              isExpanded
                ? "opopw-bg-[#f0f6fc]"
                : "opopw-bg-white hover:opopw-bg-[#f9f9f9]"
            }`}
          >
            {/* Col 1: Drag Handle */}
            <div
              className="opopw-w-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                {...provided.dragHandleProps}
                className={`opopw-cursor-grab active:opopw-cursor-grabbing opopw-flex opopw-items-center opopw-justify-center opopw-w-8 opopw-h-8 opopw-rounded-[6px] opopw-border opopw-transition-colors ${
                  hasError && !isExpanded
                    ? "opopw-bg-[#fcf0f1] opopw-border-[#f8c1c2] opopw-text-[#d63638]"
                    : "opopw-bg-[#f6f7f7] opopw-border-[#dcdcde] opopw-text-[#646970] hover:opopw-bg-white hover:opopw-border-[#c3c4c7] hover:opopw-text-[#2271b1]"
                }`}
                title={
                  hasError && !isExpanded
                    ? __("This field has errors", "optionbay-product-options-addons-woo")
                    : __("Drag to reorder", "optionbay-product-options-addons-woo")
                }
              >
                {hasError && !isExpanded ? (
                  <AlertCircle size={16} />
                ) : (
                  (() => {
                    const Icon =
                      FIELD_TYPE_ICONS[field.type] || FIELD_TYPE_ICONS.text;
                    return <Icon size={16} />;
                  })()
                )}
              </span>
            </div>

            {/* Col 2: Name (Label) */}
            <div className="opopw-flex-1">
              <span className="opopw-text-[#2271b1] hover:opopw-text-[#135e96] opopw-font-semibold opopw-text-[14px]">
                {field.label || __("(No name)", "optionbay-product-options-addons-woo")}
                {field.required && (
                  <span className="opopw-text-[#c00] opopw-ml-1">
                    *
                  </span>
                )}
              </span>

              {/* Hover Actions (WordPress style) */}
              <div className="opopw-row-actions opopw-text-[12px] opopw-flex opopw-gap-1 opopw-opacity-0 group-hover:opopw-opacity-100 opopw-transition-opacity">
                <span
                  className="opopw-text-[#2271b1] hover:opopw-underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "TOGGLE_EXPAND_FIELD",
                      payload: field.id,
                    });
                  }}
                >
                  {__("Edit field", "optionbay-product-options-addons-woo")}
                </span>
                <span className="opopw-text-[#ddd]">|</span>
                <span
                  className="opopw-text-[#2271b1] hover:opopw-underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "DUPLICATE_FIELD",
                      payload: field.id,
                    });
                  }}
                >
                  {__("Duplicate", "optionbay-product-options-addons-woo")}
                </span>
                <span className="opopw-text-[#ddd]">|</span>
                <span
                  className="opopw-text-[#d63638] hover:opopw-text-[#b32d2e] hover:opopw-underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                >
                  {__("Delete", "optionbay-product-options-addons-woo")}
                </span>
              </div>
            </div>

            {/* Col 3: Type */}
            <div className="opopw-w-1/3">
              <span className="opopw-text-[#646970] opopw-text-[13px]">
                {FIELD_TYPES.find((t) => t.value === field.type)?.label ||
                  field.type}
              </span>
            </div>

            {/* Col 4: Actions */}
            <div className="opopw-w-32 opopw-flex opopw-justify-end opopw-gap-1 opopw-items-center">
              {/* Move Up */}
              <Tooltip
                content={__("Move up", "optionbay-product-options-addons-woo")}
                disabled={index === 0}
              >
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "MOVE_UP",
                      payload: index,
                    });
                  }}
                  className={`opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-p-1 opopw-flex opopw-items-center opopw-transition-colors ${
                    index === 0
                      ? "opopw-text-[#ccd0d4] opopw-cursor-not-allowed"
                      : "opopw-text-[#646970] hover:opopw-text-[#2271b1]"
                  }`}
                >
                  <ChevronUp size={16} />
                </button>
              </Tooltip>

              {/* Move Down */}
              <Tooltip
                content={__("Move down", "optionbay-product-options-addons-woo")}
                disabled={index === state.schema.length - 1}
              >
                <button
                  type="button"
                  disabled={index === state.schema.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "MOVE_DOWN",
                      payload: index,
                    });
                  }}
                  className={`opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-p-1 opopw-flex opopw-items-center opopw-transition-colors ${
                    index === state.schema.length - 1
                      ? "opopw-text-[#ccd0d4] opopw-cursor-not-allowed"
                      : "opopw-text-[#646970] hover:opopw-text-[#2271b1]"
                  }`}
                >
                  <ChevronDown size={16} />
                </button>
              </Tooltip>

              {/* Delete Field */}
              <Tooltip content={__("Delete field", "optionbay-product-options-addons-woo")}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                  className="opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-p-1 opopw-flex opopw-items-center opopw-text-[#d63638] hover:opopw-text-[#b32d2e] opopw-transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Body */}
          {isExpanded && (
            <div className="opopw-pl-4 opopw-bg-[#f0f0f1] opopw-border-t opopw-border-[#e2e8f0] opopw-pb-2">
              <ClassicSettingsTable
                className=""
                fields={applyFilters('opopw_field_settings', [
                  {
                    label: __("Field Type", "optionbay-product-options-addons-woo"),
                    tooltip: FIELD_TOOLTIPS.type,
                    render: () => (
                      <ClassicSelect
                        differentDropdownWidth
                        value={field.type}
                        isError={!!state.errors?.[`schema.${index}.type`]}
                        classNames={{
                          innerContainer: "!opopw-w-[120px]",
                        }}
                        onChange={(val) => {
                          const newType = String(val);
                          const defaults = getDefaultField(newType);
                          update({
                            type: newType,
                            options: defaults.options,
                            min_length: defaults.min_length,
                            max_length: defaults.max_length,
                            min_value: defaults.min_value,
                            max_value: defaults.max_value,
                            step: defaults.step,
                            min_date: defaults.min_date,
                            max_date: defaults.max_date,
                            min_time: defaults.min_time,
                            max_time: defaults.max_time,
                            display_style: defaults.display_style,
                            content: defaults.content,
                          });
                        }}
                        options={FIELD_TYPES.map((ft) => ({
                          value: ft.value,
                          label: ft.label,
                          variant: ft.variant,
                        }))}
                      />
                    ),
                  },
                  ...(isPresentational(field.type)
                    ? [
                        {
                          label: __("Label", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.label,
                          render: () => (
                            <>
                              <ClassicInput
                                size="regular"
                                value={field.label}
                                description={
                                  field.type === "heading"
                                    ? __(
                                        "The text shown as the heading on the product page.",
                                        "optionbay-product-options-addons-woo"
                                      )
                                    : __(
                                        "The label is for internal admin reference only and will not be displayed on the frontend.",
                                        "optionbay-product-options-addons-woo"
                                      )
                                }
                                isError={
                                  !!state.errors?.[`schema.${index}.label`]
                                }
                                onChange={(e) =>
                                  update({
                                    label: e.target.value,
                                  })
                                }
                                placeholder={__(
                                  "Enter field label",
                                  "optionbay-product-options-addons-woo",
                                )}
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.label`]
                                }
                              />
                            </>
                          ),
                        },
                        ...(field.type === "static_content"
                          ? [
                        {
                          label: __("Content", "optionbay-product-options-addons-woo"),
                          tooltip: __(
                            "The static content to be displayed on the product page.",
                            "optionbay-product-options-addons-woo",
                          ),
                          render: () => (
                            <WPEditor
                              id={`opopw-editor-${field.id}`}
                              description={__(
                                "Enter text, images, or other static content using the visual editor.",
                                "optionbay-product-options-addons-woo",
                              )}
                              value={field.content || ""}
                              onChange={(html: string) =>
                                update({
                                  content: html,
                                })
                              }
                            />
                          ),
                        },
                            ]
                          : []),
                      ]
                    : [
                        {
                          label: __("Label", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.label,
                          render: () => (
                            <>
                              <ClassicInput
                                size="regular"
                                value={field.label}
                                isError={
                                  !!state.errors?.[`schema.${index}.label`]
                                }
                                onChange={(e) =>
                                  update({
                                    label: e.target.value,
                                  })
                                }
                                placeholder={__(
                                  "Enter field label",
                                  "optionbay-product-options-addons-woo",
                                )}
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.label`]
                                }
                              />
                            </>
                          ),
                        },
                        {
                          label: __("Description", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.description,
                          render: () => (
                            <>
                              <textarea
                                className="large-text opopw-p-1.5"
                                rows={2}
                                value={field.description}
                                onChange={(e) =>
                                  update({
                                    description: e.target.value,
                                  })
                                }
                                placeholder={__(
                                  "Help text shown below the field",
                                  "optionbay-product-options-addons-woo",
                                )}
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.description`]
                                }
                              />
                            </>
                          ),
                        },
                      ]),
                  ...(isPresentational(field.type)
                    ? []
                    : [
                        {
                          label: __("Validation", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.required,
                          render: () => (
                            <>
                              <ClassicCheckbox
                                label={__("Field is Required", "optionbay-product-options-addons-woo")}
                                checked={field.required}
                                isError={
                                  !!state.errors?.[`schema.${index}.required`]
                                }
                                onChange={(checked) =>
                                  update({
                                    required: checked,
                                  })
                                }
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.required`]
                                }
                              />
                            </>
                          ),
                        },
                      ]),
                  ...(!hasOptions && !isPresentational(field.type)
                    ? [
                        {
                          label: __("Pricing Logic", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.price_type,
                          render: () => (
                            <>
                              <ClassicSelect
                                differentDropdownWidth
                                value={field.price_type}
                                isError={
                                  !!state.errors?.[`schema.${index}.price_type`]
                                }
                                onChange={(val) =>
                                  update({
                                    price_type: String(val),
                                  })
                                }
                                options={PRICE_TYPES.map((pt) => ({
                                  value: pt.value,
                                  label: pt.label,
                                  variant: pt.variant,
                                }))}
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.price_type`]
                                }
                              />
                            </>
                          ),
                        },
                        ...(field.price_type !== "none"
                          ? [
                                {
                                  label: __("Price Amount", "optionbay-product-options-addons-woo"),
                                  tooltip: FIELD_TOOLTIPS.price,
                                  render: () => (
                                    <>
                                      <ClassicInput
                                        type="number"
                                        size="small"
                                        value={field.price || ""}
                                        isError={
                                          !!state.errors?.[
                                            `schema.${index}.price`
                                          ]
                                        }
                                        onChange={(e) =>
                                          update({
                                            price:
                                              e.target.value === ""
                                                ? undefined
                                                : parseFloat(e.target.value),
                                          })
                                        }
                                        step="0.01"
                                        placeholder="0.00"
                                      />
                                      <FormError
                                        message={
                                          state.errors?.[
                                            `schema.${index}.price`
                                          ]
                                        }
                                      />
                                    </>
                                  ),
                                },
                              ]
                          : []),
                      ]
                    : []),
                  ...(["text", "textarea", "number", "email", "date", "time", "datetime"].includes(field.type)

                    ? [
                        {
                          label: __("Placeholder", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.placeholder,
                          render: () => (
                            <>
                              <ClassicInput
                                size="regular"
                                value={field.placeholder}
                                isError={
                                  !!state.errors?.[
                                    `schema.${index}.placeholder`
                                  ]
                                }
                                onChange={(e) =>
                                  update({
                                    placeholder: e.target.value,
                                  })
                                }
                                placeholder={__(
                                  "Optional placeholder text",
                                  "optionbay-product-options-addons-woo",
                                )}
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.placeholder`]
                                }
                              />
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(["text", "textarea"].includes(field.type)
                    ? [
                        {
                          label: __("Restrictions", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.restrictions,
                          render: () => (
                            <div className="opopw-flex opopw-flex-col opopw-gap-1">
                              <div className="opopw-flex opopw-gap-2.5 opopw-items-center">
                                <label className="opopw-text-xs">
                                  {__("Min Length:", "optionbay-product-options-addons-woo")}{" "}
                                  <ClassicInput
                                    type="number"
                                    size="small"
                                    value={field.min_length || ""}
                                    isError={
                                      !!state.errors?.[
                                        `schema.${index}.min_length`
                                      ]
                                    }
                                    onChange={(e) =>
                                      update({
                                        min_length:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    min={0}
                                  />
                                </label>
                                <label className="opopw-text-xs">
                                  {__("Max Length:", "optionbay-product-options-addons-woo")}{" "}
                                  <ClassicInput
                                    type="number"
                                    size="small"
                                    value={field.max_length || ""}
                                    isError={
                                      !!state.errors?.[
                                        `schema.${index}.max_length`
                                      ]
                                    }
                                    onChange={(e) =>
                                      update({
                                        max_length:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    min={0}
                                  />
                                </label>
                              </div>
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.min_length`]
                                }
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.max_length`]
                                }
                              />
                            </div>
                          ),
                        },
                      ]
                    : []),
                  ...(field.type === "number"
                    ? [
                        {
                          label: __("Restrictions", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.restrictions,
                          render: () => (
                            <div className="opopw-flex opopw-flex-col opopw-gap-1">
                              <div className="opopw-flex opopw-gap-2.5 opopw-items-center opopw-mb-2">
                                <label className="opopw-text-xs">
                                  {__("Min:", "optionbay-product-options-addons-woo")}{" "}
                                  <ClassicInput
                                    type="number"
                                    size="small"
                                    value={field.min_value ?? ""}
                                    isError={
                                      !!state.errors?.[
                                        `schema.${index}.min_value`
                                      ]
                                    }
                                    onChange={(e) =>
                                      update({
                                        min_value:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </label>
                                <label className="opopw-text-xs">
                                  {__("Max:", "optionbay-product-options-addons-woo")}{" "}
                                  <ClassicInput
                                    type="number"
                                    size="small"
                                    value={field.max_value ?? ""}
                                    isError={
                                      !!state.errors?.[
                                        `schema.${index}.max_value`
                                      ]
                                    }
                                    onChange={(e) =>
                                      update({
                                        max_value:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <label className="opopw-text-xs">
                                {__("Step Value:", "optionbay-product-options-addons-woo")}{" "}
                                <ClassicInput
                                  type="number"
                                  size="small"
                                  value={field.step ?? ""}
                                  isError={
                                    !!state.errors?.[`schema.${index}.step`]
                                  }
                                  onChange={(e) =>
                                    update({
                                      step: parseFloat(e.target.value) || 1,
                                    })
                                  }
                                  step="0.01"
                                />
                              </label>
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.min_value`]
                                }
                              />
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.max_value`]
                                }
                              />
                              <FormError
                                message={state.errors?.[`schema.${index}.step`]}
                              />
                            </div>
                          ),
                        },
                      ]
                    : []),
                  ...(["date", "time", "datetime"].includes(field.type)
                    ? [
                        {
                          label: __("Restrictions", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.restrictions,
                          render: () => (
                            <div className="opopw-flex opopw-flex-col opopw-gap-2">
                              <div className="opopw-flex opopw-flex-wrap opopw-gap-3 opopw-items-center">
                                {["date", "datetime"].includes(field.type) && (
                                  <>
                                    <label className="opopw-text-xs opopw-flex opopw-flex-col opopw-gap-1">
                                      {__("Min Date:", "optionbay-product-options-addons-woo")}
                                      <input
                                        type="date"
                                        className="opopw-px-3 opopw-py-1.5 opopw-rounded-[8px] opopw-border opopw-border-[#c3c4c7] opopw-text-[13px] opopw-text-slate-800 focus:opopw-border-[#2271b1] focus:opopw-outline-none"
                                        value={field.min_date || ""}
                                        onChange={(e) =>
                                          update({
                                            min_date: e.target.value || undefined,
                                          })
                                        }
                                      />
                                    </label>
                                    <label className="opopw-text-xs opopw-flex opopw-flex-col opopw-gap-1">
                                      {__("Max Date:", "optionbay-product-options-addons-woo")}
                                      <input
                                        type="date"
                                        className="opopw-px-3 opopw-py-1.5 opopw-rounded-[8px] opopw-border opopw-border-[#c3c4c7] opopw-text-[13px] opopw-text-slate-800 focus:opopw-border-[#2271b1] focus:opopw-outline-none"
                                        value={field.max_date || ""}
                                        onChange={(e) =>
                                          update({
                                            max_date: e.target.value || undefined,
                                          })
                                        }
                                      />
                                    </label>
                                  </>
                                )}
                                {["time", "datetime"].includes(field.type) && (
                                  <>
                                    <label className="opopw-text-xs opopw-flex opopw-flex-col opopw-gap-1">
                                      {__("Min Time:", "optionbay-product-options-addons-woo")}
                                      <input
                                        type="time"
                                        className="opopw-px-3 opopw-py-1.5 opopw-rounded-[8px] opopw-border opopw-border-[#c3c4c7] opopw-text-[13px] opopw-text-slate-800 focus:opopw-border-[#2271b1] focus:opopw-outline-none"
                                        value={field.min_time || ""}
                                        onChange={(e) =>
                                          update({
                                            min_time: e.target.value || undefined,
                                          })
                                        }
                                      />
                                    </label>
                                    <label className="opopw-text-xs opopw-flex opopw-flex-col opopw-gap-1">
                                      {__("Max Time:", "optionbay-product-options-addons-woo")}
                                      <input
                                        type="time"
                                        className="opopw-px-3 opopw-py-1.5 opopw-rounded-[8px] opopw-border opopw-border-[#c3c4c7] opopw-text-[13px] opopw-text-slate-800 focus:opopw-border-[#2271b1] focus:opopw-outline-none"
                                        value={field.max_time || ""}
                                        onChange={(e) =>
                                          update({
                                            max_time: e.target.value || undefined,
                                          })
                                        }
                                      />
                                    </label>
                                  </>
                                )}
                              </div>
                              <FormError
                                message={
                                  state.errors?.[`schema.${index}.min_date`] ||
                                  state.errors?.[`schema.${index}.max_date`] ||
                                  state.errors?.[`schema.${index}.min_time`] ||
                                  state.errors?.[`schema.${index}.max_time`]
                                }
                              />
                            </div>
                          ),
                        },
                      ]
                    : []),
                  ...(field.type === "heading"
                    ? [
                        {
                          label: __("Heading Level", "optionbay-product-options-addons-woo"),
                          tooltip: __(
                            "A product page already has an H1 and H2s. Pick a level that keeps the page outline valid.",
                            "optionbay-product-options-addons-woo",
                          ),
                          render: () => (
                            <ClassicSelect
                              differentDropdownWidth
                              value={field.heading_level || "h3"}
                              isError={
                                !!state.errors?.[
                                  `schema.${index}.heading_level`
                                ]
                              }
                              onChange={(val) =>
                                update({
                                  heading_level: val as
                                    | "h2"
                                    | "h3"
                                    | "h4"
                                    | "h5",
                                })
                              }
                              options={[
                                { value: "h2", label: __("Heading 2", "optionbay-product-options-addons-woo") },
                                { value: "h3", label: __("Heading 3", "optionbay-product-options-addons-woo") },
                                { value: "h4", label: __("Heading 4", "optionbay-product-options-addons-woo") },
                                { value: "h5", label: __("Heading 5", "optionbay-product-options-addons-woo") },
                              ]}
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(hasOptions && field.options
                    ? [
                        ...(["color_swatch", "image_swatch"].includes(
                          field.type,
                        )
                          ? [
                              {
                                label: __("Display Style", "optionbay-product-options-addons-woo"),
                                tooltip: __(
                                  "The visual presentation of swatches on the frontend.",
                                  "optionbay-product-options-addons-woo",
                                ),
                                render: () => (
                                  <ClassicSelect
                                    differentDropdownWidth
                                    value={field.display_style || "swatch_only"}
                                    description={__(
                                      "Choose whether to show just the swatch or the swatch with the label name.",
                                      "optionbay-product-options-addons-woo",
                                    )}
                                    isError={
                                      !!state.errors?.[
                                        `schema.${index}.display_style`
                                      ]
                                    }
                                    onChange={(val) =>
                                      update({
                                        display_style: val as
                                          | "swatch_only"
                                          | "swatch_label",
                                      })
                                    }
                                    options={[
                                      {
                                        value: "swatch_only",
                                        label: __("Swatch Only", "optionbay-product-options-addons-woo"),
                                      },
                                      {
                                        value: "swatch_label",
                                        label: __(
                                          "Swatch + Label",
                                          "optionbay-product-options-addons-woo",
                                        ),
                                      },
                                    ]}
                                  />
                                ),
                              },
                            ]
                          : []),
                        {
                          label: __("Choices", "optionbay-product-options-addons-woo"),
                          tooltip: FIELD_TOOLTIPS.choices,
                          render: () => (
                            <OptionEditorAccordion
                              fieldId={field.id}
                              fieldIndex={index}
                              fieldType={field.type}
                              options={field.options!}
                              hideLabel
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(!anyOptionHasStock && !isPresentational(field.type)
                    ? [
                        {
                          label: __("Inventory Management", "optionbay-product-options-addons-woo"),
                          tooltip: __(
                            "Stock tracking and automatic reduction rules for this field.",
                            "optionbay-product-options-addons-woo",
                          ),
                          render: () => (
                            <div className="opopw-flex opopw-flex-col opopw-gap-3">
                              <ClassicCheckbox
                                label={__("Enable Stock Tracking", "optionbay-product-options-addons-woo")}
                                description={__(
                                  "If enabled, stock is reduced automatically when an order is placed.",
                                  "optionbay-product-options-addons-woo",
                                )}
                                checked={field.enable_stock || false}
                                isError={
                                  !!state.errors?.[
                                    `schema.${index}.enable_stock`
                                  ]
                                }
                                onChange={(checked) =>
                                  update({
                                    enable_stock: checked,
                                  })
                                }
                              />

                              {field.enable_stock && (
                                <div className="opopw-ml-6 opopw-flex opopw-flex-col opopw-gap-3 opopw-p-3 opopw-bg-white opopw-rounded-md opopw-border opopw-border-[#ddd]">
                                  <div>
                                    <label className="opopw-text-xs opopw-font-medium opopw-mb-1 opopw-block">
                                      {__("Select Pool", "optionbay-product-options-addons-woo")}
                                    </label>
                                    <InventoryPicker
                                      value={field.inventory_id}
                                      isError={
                                        !!state.errors?.[
                                          `schema.${index}.inventory_id`
                                        ]
                                      }
                                      onChange={(val) =>
                                        update({
                                          inventory_id: val,
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="opopw-flex opopw-gap-4">
                                    <div className="opopw-flex-1">
                                      <label className="opopw-text-xs opopw-font-medium opopw-mb-1 opopw-block">
                                        {__("Reduction Mode", "optionbay-product-options-addons-woo")}
                                      </label>
                                      <ClassicSelect
                                        differentDropdownWidth
                                        value={
                                          field.reduction_mode || "per_item_qty"
                                        }
                                        isError={
                                          !!state.errors?.[
                                            `schema.${index}.reduction_mode`
                                          ]
                                        }
                                        onChange={(val) =>
                                          update({
                                            reduction_mode: String(val),
                                          })
                                        }
                                        options={REDUCTION_MODES}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: __("Conditional Logic", "optionbay-product-options-addons-woo"),
                    tooltip: FIELD_TOOLTIPS.conditional_logic,
                    render: () => (
                      <div className="">
                        <ConditionEditor
                          field={field}
                          index={index}
                          hideLabel
                        />
                      </div>
                    ),
                  },
                ], field, index, state, update) as any}
              />
            </div>
          )}
          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            title={__("Delete Field", "optionbay-product-options-addons-woo")}
            message={__(
              "Are you sure you want to remove this field?",
              "optionbay-product-options-addons-woo",
            )}
            confirmLabel={__("Delete", "optionbay-product-options-addons-woo")}
            cancelLabel={__("Cancel", "optionbay-product-options-addons-woo")}
            onConfirm={() => {
              dispatch({
                type: "REMOVE_FIELD",
                payload: field.id,
              });
              setIsDeleteModalOpen(false);
            }}
            onCancel={() => setIsDeleteModalOpen(false)}
            classNames={{
              button: {
                confirmColor: "danger",
              },
            }}
          />
        </div>
      )}
    </Draggable>
  );
};
