import React, { useState } from "react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { __ } from "@wordpress/i18n";
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
          id={`ob-field-row-${field.id}`}
          data-expanded={isExpanded}
          className={`spoa-w-full spoa-border-b spoa-border-[#c3c4c7] spoa-transition-all ${
            isExpanded
              ? "spoa-border-l-[1px] spoa-border-l-[#2271b1] spoa-bg-[#f0f6fc]"
              : hasError
              ? "!spoa-border-b-[#d63638]"
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
            className={`spoa-flex spoa-items-center spoa-py-3 spoa-px-4 spoa-transition-colors spoa-cursor-pointer spoa-group ${
              snapshot.isDragging ? "spoa-shadow-md" : ""
            } ${
              isExpanded
                ? "spoa-bg-[#f0f6fc]"
                : "spoa-bg-white hover:spoa-bg-[#f9f9f9]"
            }`}
          >
            {/* Col 1: Drag Handle */}
            <div
              className="spoa-w-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                {...provided.dragHandleProps}
                className={`spoa-cursor-grab active:spoa-cursor-grabbing spoa-flex spoa-items-center spoa-justify-center spoa-w-8 spoa-h-8 spoa-rounded-[6px] spoa-border spoa-transition-colors ${
                  hasError && !isExpanded
                    ? "spoa-bg-[#fcf0f1] spoa-border-[#f8c1c2] spoa-text-[#d63638]"
                    : "spoa-bg-[#f6f7f7] spoa-border-[#dcdcde] spoa-text-[#646970] hover:spoa-bg-white hover:spoa-border-[#c3c4c7] hover:spoa-text-[#2271b1]"
                }`}
                title={
                  hasError && !isExpanded
                    ? __("This field has errors", "smart-product-options-addons")
                    : __("Drag to reorder", "smart-product-options-addons")
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
            <div className="spoa-flex-1">
              <span className="spoa-text-[#2271b1] hover:spoa-text-[#135e96] spoa-font-semibold spoa-text-[14px]">
                {field.label || __("(No name)", "smart-product-options-addons")}
                {field.required && (
                  <span className="spoa-text-[#c00] spoa-ml-1">
                    *
                  </span>
                )}
              </span>

              {/* Hover Actions (WordPress style) */}
              <div className="spoa-row-actions spoa-text-[12px] spoa-flex spoa-gap-1 spoa-opacity-0 group-hover:spoa-opacity-100 spoa-transition-opacity">
                <span
                  className="spoa-text-[#2271b1] hover:spoa-underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "TOGGLE_EXPAND_FIELD",
                      payload: field.id,
                    });
                  }}
                >
                  {__("Edit field", "smart-product-options-addons")}
                </span>
                <span className="spoa-text-[#ddd]">|</span>
                <span
                  className="spoa-text-[#2271b1] hover:spoa-underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "DUPLICATE_FIELD",
                      payload: field.id,
                    });
                  }}
                >
                  {__("Duplicate", "smart-product-options-addons")}
                </span>
                <span className="spoa-text-[#ddd]">|</span>
                <span
                  className="spoa-text-[#d63638] hover:spoa-text-[#b32d2e] hover:spoa-underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                >
                  {__("Delete", "smart-product-options-addons")}
                </span>
              </div>
            </div>

            {/* Col 3: Type */}
            <div className="spoa-w-1/3">
              <span className="spoa-text-[#646970] spoa-text-[13px]">
                {FIELD_TYPES.find((t) => t.value === field.type)?.label ||
                  field.type}
              </span>
            </div>

            {/* Col 4: Actions */}
            <div className="spoa-w-32 spoa-flex spoa-justify-end spoa-gap-1 spoa-items-center">
              {/* Move Up */}
              <Tooltip
                content={__("Move up", "smart-product-options-addons")}
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
                  className={`spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1 spoa-flex spoa-items-center spoa-transition-colors ${
                    index === 0
                      ? "spoa-text-[#ccd0d4] spoa-cursor-not-allowed"
                      : "spoa-text-[#646970] hover:spoa-text-[#2271b1]"
                  }`}
                >
                  <ChevronUp size={16} />
                </button>
              </Tooltip>

              {/* Move Down */}
              <Tooltip
                content={__("Move down", "smart-product-options-addons")}
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
                  className={`spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1 spoa-flex spoa-items-center spoa-transition-colors ${
                    index === state.schema.length - 1
                      ? "spoa-text-[#ccd0d4] spoa-cursor-not-allowed"
                      : "spoa-text-[#646970] hover:spoa-text-[#2271b1]"
                  }`}
                >
                  <ChevronDown size={16} />
                </button>
              </Tooltip>

              {/* Delete Field */}
              <Tooltip content={__("Delete field", "smart-product-options-addons")}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                  className="spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1 spoa-flex spoa-items-center spoa-text-[#d63638] hover:spoa-text-[#b32d2e] spoa-transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Body */}
          {isExpanded && (
            <div className="spoa-pl-4 spoa-bg-[#f0f0f1] spoa-border-t spoa-border-[#e2e8f0] spoa-pb-2">
              <ClassicSettingsTable
                className=""
                fields={[
                  {
                    label: __("Field Type", "smart-product-options-addons"),
                    tooltip: FIELD_TOOLTIPS.type,
                    render: () => (
                      <ClassicSelect
                        differentDropdownWidth
                        value={field.type}
                        isError={!!state.errors?.[`schema.${index}.type`]}
                        classNames={{
                          innerContainer: "!spoa-w-[120px]",
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
                            allowed_types: defaults.allowed_types,
                            max_file_size: defaults.max_file_size,
                            display_style: defaults.display_style,
                            content: defaults.content,
                          });
                        }}
                        options={FIELD_TYPES.map((ft) => ({
                          value: ft.value,
                          label: ft.label,
                        }))}
                      />
                    ),
                  },
                  ...(field.type === "static_content"
                    ? [
                        {
                          label: __("Label", "smart-product-options-addons"),
                          tooltip: FIELD_TOOLTIPS.label,
                          render: () => (
                            <>
                              <ClassicInput
                                size="regular"
                                value={field.label}
                                description={__(
                                  "The label for static content is for internal admin reference only and will not be displayed on the frontend.",
                                  "smart-product-options-addons"
                                )}
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
                                  "smart-product-options-addons",
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
                          label: __("Content", "smart-product-options-addons"),
                          tooltip: __(
                            "The static content to be displayed on the product page.",
                            "smart-product-options-addons",
                          ),
                          render: () => (
                            <WPEditor
                              id={`ob-editor-${field.id}`}
                              description={__(
                                "Enter text, images, or other static content using the visual editor.",
                                "smart-product-options-addons",
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
                    : [
                        {
                          label: __("Label", "smart-product-options-addons"),
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
                                  "smart-product-options-addons",
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
                          label: __("Description", "smart-product-options-addons"),
                          tooltip: FIELD_TOOLTIPS.description,
                          render: () => (
                            <>
                              <textarea
                                className="large-text spoa-p-1.5"
                                rows={2}
                                value={field.description}
                                onChange={(e) =>
                                  update({
                                    description: e.target.value,
                                  })
                                }
                                placeholder={__(
                                  "Help text shown below the field",
                                  "smart-product-options-addons",
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
                  ...(["static_content"].includes(field.type)
                    ? []
                    : [
                        {
                          label: __("Validation", "smart-product-options-addons"),
                          tooltip: FIELD_TOOLTIPS.required,
                          render: () => (
                            <>
                              <ClassicCheckbox
                                label={__("Field is Required", "smart-product-options-addons")}
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
                  ...(!hasOptions && field.type !== "static_content"
                    ? [
                        {
                          label: __("Pricing Logic", "smart-product-options-addons"),
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
                                options={PRICE_TYPES.filter((pt) => {
                                  if (pt.value === "character_count") {
                                    return (
                                      field.type === "text" ||
                                      field.type === "textarea"
                                    );
                                  }
                                  return true;
                                }).map((pt) => ({
                                  value: pt.value,
                                  label: pt.label,
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
                          ? field.price_type === "formula"
                            ? [
                                {
                                  label: __("Formula Expression", "smart-product-options-addons"),
                                  tooltip: __(
                                    "The mathematical expression used to calculate the price.",
                                    "smart-product-options-addons",
                                  ),
                                  render: () => (
                                    <>
                                      <ClassicInput
                                        size="large"
                                        className="!spoa-w-1/2 !spoa-min-w-48"
                                        value={field.formula || ""}
                                        description={__(
                                          "Use placeholders: [value], [char_count], [base_price]. Example: [char_count] * 2",
                                          "smart-product-options-addons",
                                        )}
                                        isError={
                                          !!state.errors?.[
                                            `schema.${index}.formula`
                                          ]
                                        }
                                        onChange={(e) =>
                                          update({
                                            formula: e.target.value,
                                          })
                                        }
                                        placeholder="[char_count] * 2"
                                      />
                                      <FormError
                                        message={
                                          state.errors?.[
                                            `schema.${index}.formula`
                                          ]
                                        }
                                      />
                                    </>
                                  ),
                                },
                              ]
                            : [
                                {
                                  label: __("Price Amount", "smart-product-options-addons"),
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
                  ...(["text", "textarea", "number", "email"].includes(field.type)

                    ? [
                        {
                          label: __("Placeholder", "smart-product-options-addons"),
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
                                  "smart-product-options-addons",
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
                          label: __("Restrictions", "smart-product-options-addons"),
                          tooltip: FIELD_TOOLTIPS.restrictions,
                          render: () => (
                            <div className="spoa-flex spoa-flex-col spoa-gap-1">
                              <div className="spoa-flex spoa-gap-2.5 spoa-items-center">
                                <label className="spoa-text-xs">
                                  {__("Min Length:", "smart-product-options-addons")}{" "}
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
                                <label className="spoa-text-xs">
                                  {__("Max Length:", "smart-product-options-addons")}{" "}
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
                          label: __("Restrictions", "smart-product-options-addons"),
                          tooltip: FIELD_TOOLTIPS.restrictions,
                          render: () => (
                            <div className="spoa-flex spoa-flex-col spoa-gap-1">
                              <div className="spoa-flex spoa-gap-2.5 spoa-items-center spoa-mb-2">
                                <label className="spoa-text-xs">
                                  {__("Min:", "smart-product-options-addons")}{" "}
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
                                <label className="spoa-text-xs">
                                  {__("Max:", "smart-product-options-addons")}{" "}
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
                              <label className="spoa-text-xs">
                                {__("Step Value:", "smart-product-options-addons")}{" "}
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
                  ...(field.type === "file"
                    ? [
                        {
                          label: __("File Restrictions", "smart-product-options-addons"),
                          tooltip: FIELD_TOOLTIPS.file_restrictions,
                          render: () => (
                            <div className="spoa-flex spoa-flex-col spoa-gap-2">
                              <label className="spoa-block">
                                <span className="spoa-text-xs spoa-block">
                                  {__(
                                    "Allowed Extensions (comma separated):",
                                    "smart-product-options-addons",
                                  )}
                                </span>
                                <ClassicInput
                                  size="regular"
                                  value={field.allowed_types || ""}
                                  isError={
                                    !!state.errors?.[
                                      `schema.${index}.allowed_types`
                                    ]
                                  }
                                  onChange={(e) =>
                                    update({
                                      allowed_types: e.target.value,
                                    })
                                  }
                                  placeholder=".jpg,.png,.pdf"
                                />
                                <FormError
                                  message={
                                    state.errors?.[
                                      `schema.${index}.allowed_types`
                                    ]
                                  }
                                />
                              </label>
                              <label className="spoa-block">
                                <span className="spoa-text-xs spoa-block">
                                  {__("Max File Size (MB):", "smart-product-options-addons")}
                                </span>
                                <ClassicInput
                                  type="number"
                                  size="small"
                                  value={field.max_file_size || ""}
                                  isError={
                                    !!state.errors?.[
                                      `schema.${index}.max_file_size`
                                    ]
                                  }
                                  onChange={(e) =>
                                    update({
                                      max_file_size:
                                        parseInt(e.target.value) || 5,
                                    })
                                  }
                                  min={1}
                                />
                                <FormError
                                  message={
                                    state.errors?.[
                                      `schema.${index}.max_file_size`
                                    ]
                                  }
                                />
                              </label>
                            </div>
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
                                label: __("Display Style", "smart-product-options-addons"),
                                tooltip: __(
                                  "The visual presentation of swatches on the frontend.",
                                  "smart-product-options-addons",
                                ),
                                render: () => (
                                  <ClassicSelect
                                    differentDropdownWidth
                                    value={field.display_style || "swatch_only"}
                                    description={__(
                                      "Choose whether to show just the swatch or the swatch with the label name.",
                                      "smart-product-options-addons",
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
                                        label: __("Swatch Only", "smart-product-options-addons"),
                                      },
                                      {
                                        value: "swatch_label",
                                        label: __(
                                          "Swatch + Label",
                                          "smart-product-options-addons",
                                        ),
                                      },
                                    ]}
                                  />
                                ),
                              },
                            ]
                          : []),
                        {
                          label: __("Choices", "smart-product-options-addons"),
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
                  ...(!anyOptionHasStock && field.type !== "static_content"
                    ? [
                        {
                          label: __("Inventory Management", "smart-product-options-addons"),
                          tooltip: __(
                            "Stock tracking and automatic reduction rules for this field.",
                            "smart-product-options-addons",
                          ),
                          render: () => (
                            <div className="spoa-flex spoa-flex-col spoa-gap-3">
                              <ClassicCheckbox
                                label={__("Enable Stock Tracking", "smart-product-options-addons")}
                                description={__(
                                  "If enabled, stock is reduced automatically when an order is placed.",
                                  "smart-product-options-addons",
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
                                <div className="spoa-ml-6 spoa-flex spoa-flex-col spoa-gap-3 spoa-p-3 spoa-bg-white spoa-rounded-md spoa-border spoa-border-[#ddd]">
                                  <div>
                                    <label className="spoa-text-xs spoa-font-medium spoa-mb-1 spoa-block">
                                      {__("Select Pool", "smart-product-options-addons")}
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

                                  <div className="spoa-flex spoa-gap-4">
                                    <div className="spoa-flex-1">
                                      <label className="spoa-text-xs spoa-font-medium spoa-mb-1 spoa-block">
                                        {__("Reduction Mode", "smart-product-options-addons")}
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
                                    {field.reduction_mode === "formula" && (
                                      <div className="spoa-flex-1">
                                        <label className="spoa-text-xs spoa-font-medium spoa-mb-1 spoa-block">
                                          {__("Formula", "smart-product-options-addons")}
                                        </label>
                                        <ClassicInput
                                          size="large"
                                          value={field.reduction_formula || ""}
                                          isError={
                                            !!state.errors?.[
                                              `schema.${index}.reduction_formula`
                                            ]
                                          }
                                          onChange={(e) =>
                                            update({
                                              reduction_formula: e.target.value,
                                            })
                                          }
                                          placeholder="qty * val"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: __("Conditional Logic", "smart-product-options-addons"),
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
                ]}
              />
            </div>
          )}
          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            title={__("Delete Field", "smart-product-options-addons")}
            message={__(
              "Are you sure you want to remove this field?",
              "smart-product-options-addons",
            )}
            confirmLabel={__("Delete", "smart-product-options-addons")}
            cancelLabel={__("Cancel", "smart-product-options-addons")}
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
