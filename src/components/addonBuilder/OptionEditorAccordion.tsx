import React, { useState, useRef } from "react";
import { __ } from "@wordpress/i18n";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  ClassicInput,
  ClassicSelect,
  ClassicButton,
  ClassicCheckbox,
} from "../classics";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import { useAddonContext, FieldOption } from "../../store/AddonContext";
import { PRICE_TYPES, REDUCTION_MODES } from "./constants";
import { FormError } from "./FormError";
import { InventoryPicker } from "./InventoryPicker";
import {
  CirclePlus,
  Trash2,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  Scale,
  GripVertical,
} from "lucide-react";

interface OptionEditorAccordionProps {
  fieldId: string;
  fieldIndex?: number;
  fieldType?: string;
  options: FieldOption[];
  hideLabel?: boolean;
}

export const OptionEditorAccordion: React.FC<OptionEditorAccordionProps> = ({
  fieldId,
  fieldIndex: propFieldIndex,
  fieldType = "select",
  options,
  hideLabel = false,
}) => {
  const { state, dispatch } = useAddonContext();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Persistent drag ID mapping to avoid input focus loss on keystrokes
  const dragIdsRef = useRef<string[]>([]);

  // Ensure stable mapping of IDs to array indices
  if (dragIdsRef.current.length !== options.length) {
    dragIdsRef.current = options.map(
      (_, i) =>
        dragIdsRef.current[i] ||
        `choice-${Math.random().toString(36).substr(2, 9)}`,
    );
  }

  const fieldIndex =
    propFieldIndex !== undefined
      ? propFieldIndex
      : state.schema.findIndex((f) => f.id === fieldId);

  const isColorSwatch = fieldType === "color_swatch";
  const isImageSwatch = fieldType === "image_swatch";

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    // Reorder options array in lockstep
    const reorderedOptions = Array.from(options);
    const [removedOpt] = reorderedOptions.splice(result.source.index, 1);
    reorderedOptions.splice(result.destination.index, 0, removedOpt);

    // Reorder persistent IDs in lockstep
    const reorderedIds = Array.from(dragIdsRef.current);
    const [removedId] = reorderedIds.splice(result.source.index, 1);
    reorderedIds.splice(result.destination.index, 0, removedId);
    dragIdsRef.current = reorderedIds;

    dispatch({
      type: "REORDER_OPTIONS",
      payload: {
        fieldId,
        options: reorderedOptions,
      },
    });
  };

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
      className={`spoa-flex spoa-flex-col spoa-gap-1 ${
        !hideLabel ? "spoa-mt-4" : ""
      }`}
    >
      {!hideLabel && (
        <label className="spoa-font-semibold spoa-block spoa-text-slate-800 spoa-text-sm">
          {__("Choices", "smart-product-options-addons")}
        </label>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`droppable-options-${fieldId}`}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="spoa-flex spoa-flex-col"
            >
              {options.length > 0 ? (
                options.map((opt, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const dragId = dragIdsRef.current[idx] || `choice-${idx}`;

                  // Define the Settings Fields for ClassicSettingsTable
                  const settingsFields = [
                    {
                      label: (
                        <span className="spoa-flex spoa-items-center spoa-gap-1.5 spoa-text-slate-700 spoa-font-semibold spoa-text-[12px] spoa-uppercase spoa-tracking-wider">
                          <Tag size={13} className="spoa-text-[#2271b1]" />
                          {__("Price Type", "smart-product-options-addons")}
                        </span>
                      ),
                      render: () => (
                        <div className="spoa-max-w-xs">
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
                          />
                        </div>
                      ),
                    },
                    ...(opt.price_type !== "none"
                      ? [
                          {
                            label: (
                              <span className="spoa-flex spoa-items-center spoa-gap-1.5 spoa-text-slate-700 spoa-font-semibold spoa-text-[12px] spoa-uppercase spoa-tracking-wider">
                                <Tag
                                  size={13}
                                  className="spoa-text-[#2271b1]"
                                />
                                {opt.price_type === "formula"
                                  ? __("Formula Expression", "smart-product-options-addons")
                                  : __("Price Amount", "smart-product-options-addons")}
                              </span>
                            ),
                            render: () => (
                              <div className="spoa-flex spoa-flex-col spoa-gap-1.5 spoa-max-w-xs">
                                {opt.price_type === "formula" ? (
                                  <ClassicInput
                                    size="regular"
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
                                    size="regular"
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
                                <FormError
                                  message={
                                    state.errors?.[
                                      `schema.${fieldIndex}.options.${idx}.formula`
                                    ]
                                  }
                                />
                              </div>
                            ),
                          },
                        ]
                      : []),
                    {
                      label: (
                        <span className="spoa-flex spoa-items-center spoa-gap-1.5 spoa-text-slate-700 spoa-font-semibold spoa-text-[12px] spoa-uppercase spoa-tracking-wider">
                          <Scale
                            size={13}
                            className="spoa-text-amber-500"
                          />
                          {__("Weight (kg)", "smart-product-options-addons")}
                        </span>
                      ),
                      render: () => (
                        <div className="spoa-max-w-xs">
                          <ClassicInput
                            type="number"
                            size="regular"
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
                        </div>
                      ),
                    },
                    {
                      label: (
                        <span className="spoa-flex spoa-items-center spoa-gap-1.5 spoa-text-slate-700 spoa-font-semibold spoa-text-[12px] spoa-uppercase spoa-tracking-wider">
                          <Package
                            size={13}
                            className="spoa-text-emerald-500"
                          />
                          {__("Stock Tracking", "smart-product-options-addons")}
                        </span>
                      ),
                      render: () => (
                        <div className="spoa-flex spoa-flex-col spoa-gap-3">
                          <ClassicCheckbox
                            label={__("Enable Stock Tracking", "smart-product-options-addons")}
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
                            <div className="spoa-flex spoa-flex-col spoa-gap-4 spoa-max-w-md">
                              <div className="spoa-flex spoa-flex-col spoa-gap-1">
                                <label className="spoa-text-[11px] spoa-text-gray-500 spoa-font-semibold spoa-uppercase spoa-tracking-wider">
                                  {__("Select Pool", "smart-product-options-addons")}
                                </label>
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
                              </div>

                              <div className="spoa-flex spoa-flex-col spoa-gap-1">
                                <label className="spoa-text-[11px] spoa-text-gray-500 spoa-font-semibold spoa-uppercase spoa-tracking-wider">
                                  {__("Reduction Mode", "smart-product-options-addons")}
                                </label>
                                <ClassicSelect
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
                                        updates: {
                                          reduction_mode: String(val),
                                        },
                                      },
                                    })
                                  }
                                  options={REDUCTION_MODES}
                                />
                              </div>

                              {opt.reduction_mode === "formula" && (
                                <div className="spoa-flex spoa-flex-col spoa-gap-1">
                                  <label className="spoa-text-[11px] spoa-text-gray-500 spoa-font-semibold spoa-uppercase spoa-tracking-wider">
                                    {__("Formula", "smart-product-options-addons")}
                                  </label>
                                  <ClassicInput
                                    size="regular"
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
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ];

                  return (
                    <Draggable key={dragId} draggableId={dragId} index={idx}>
                      {(providedDrag, snapshot) => (
                        <div
                          ref={providedDrag.innerRef}
                          {...providedDrag.draggableProps}
                          className={`spoa-border spoa-border-[#c3c4c7] spoa-rounded-[12px] spoa-bg-white spoa-overflow-hidden spoa-mb-2 spoa-transition-all spoa-duration-200 ${
                            snapshot.isDragging
                              ? "spoa-shadow-2xl spoa-border-[#2271b1] spoa-ring-2 spoa-ring-[#2271b1]/20 spoa-z-50"
                              : isExpanded
                              ? "spoa-shadow-lg spoa-border-[#2271b1] spoa-ring-1 spoa-ring-[#2271b1]/10"
                              : "hover:spoa-border-slate-400 hover:spoa-shadow-md spoa-shadow-[0_2px_5px_rgba(0,0,0,0.03)]"
                          }`}
                        >
                          {/* Header Row */}
                          <div
                            onClick={() =>
                              setExpandedIndex(isExpanded ? null : idx)
                            }
                            className={`spoa-flex spoa-items-center spoa-justify-between spoa-py-3 spoa-px-4 spoa-transition-all spoa-duration-200 spoa-cursor-pointer ${
                              isExpanded
                                ? "spoa-bg-[#f0f6fc] spoa-border-b spoa-border-[#e2e8f0]"
                                : "spoa-bg-[#f6f7f7] hover:spoa-bg-[#f0f6fc]"
                            }`}
                          >
                            <div className="spoa-flex spoa-items-center spoa-gap-4 spoa-flex-1">
                              {/* Drag Handle Indicator */}
                              <div
                                {...providedDrag.dragHandleProps}
                                className="spoa-text-gray-300 spoa-cursor-grab active:spoa-cursor-grabbing hover:spoa-text-gray-400 spoa-shrink-0 spoa-flex spoa-items-center"
                              >
                                <GripVertical size={16} />
                              </div>

                              {/* Choice Index Label */}
                              <span className="spoa-text-[11px] spoa-font-bold spoa-text-slate-400 spoa-w-5 spoa-text-center">
                                #{idx + 1}
                              </span>

                              {/* Color Swatch Picker */}
                              {isColorSwatch && (
                                <div
                                  className="spoa-flex spoa-items-center spoa-gap-2 spoa-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label
                                    className={`spoa-block spoa-w-6 spoa-h-6 spoa-rounded-full spoa-border ${
                                      state.errors?.[
                                        `schema.${fieldIndex}.options.${idx}.color`
                                      ]
                                        ? "spoa-border-red-400"
                                        : "spoa-border-[#c3c4c7]"
                                    } spoa-cursor-pointer spoa-overflow-hidden hover:spoa-border-[#2271b1] spoa-transition-colors`}
                                    style={{
                                      backgroundColor: opt.color || "#ffffff",
                                    }}
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
                                  <span className="spoa-text-[11px] spoa-font-mono spoa-text-slate-400 spoa-hidden md:spoa-inline">
                                    {opt.color || "#ffffff"}
                                  </span>
                                </div>
                              )}

                              {/* Image Swatch Picker */}
                              {isImageSwatch && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMediaLibrary(idx);
                                  }}
                                  className="spoa-shrink-0"
                                >
                                  {opt.image_url ? (
                                    <div
                                      className={`spoa-relative spoa-w-8 spoa-h-8 spoa-rounded-[6px] spoa-border ${
                                        state.errors?.[
                                          `schema.${fieldIndex}.options.${idx}.image_url`
                                        ]
                                          ? "spoa-border-red-400"
                                          : "spoa-border-[#c3c4c7]"
                                      } spoa-overflow-hidden hover:spoa-border-[#2271b1] spoa-transition-colors spoa-cursor-pointer`}
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
                                      className={`spoa-flex spoa-items-center spoa-justify-center spoa-w-8 spoa-h-8 spoa-rounded-[6px] spoa-border spoa-border-dashed ${
                                        state.errors?.[
                                          `schema.${fieldIndex}.options.${idx}.image_url`
                                        ]
                                          ? "spoa-border-red-400"
                                          : "spoa-border-[#c3c4c7]"
                                      } spoa-bg-white spoa-text-[#646970] hover:spoa-border-[#2271b1] hover:spoa-text-[#2271b1] spoa-transition-colors spoa-cursor-pointer`}
                                      title={__("Upload image", "smart-product-options-addons")}
                                    >
                                      <ImagePlus size={13} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Inline Editable Label */}
                              <div
                                className="spoa-w-44 md:spoa-w-64"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ClassicInput
                                  size="regular"
                                  placeholder={__("Choice Label", "smart-product-options-addons")}
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
                              </div>

                              {/* Badges Summary row */}
                              <div className="spoa-flex spoa-items-center spoa-gap-1.5 spoa-flex-wrap">
                                {/* Price Badge */}
                                {(() => {
                                  if (opt.price_type === "none") {
                                    return (
                                      <span className="spoa-inline-flex spoa-items-center spoa-px-2.5 spoa-py-0.5 spoa-rounded-[6px] spoa-text-[11px] spoa-font-semibold spoa-bg-[#f1f5f9] spoa-text-slate-500 spoa-border spoa-border-slate-200/50">
                                        {__("No Price", "smart-product-options-addons")}
                                      </span>
                                    );
                                  }
                                  const priceLabel =
                                    PRICE_TYPES.find(
                                      (pt) => pt.value === opt.price_type,
                                    )?.label || opt.price_type;
                                  const displayPrice =
                                    opt.price_type === "formula"
                                      ? opt.formula || ""
                                      : `$${(opt.price ?? 0).toFixed(2)}`;
                                  return (
                                    <span className="spoa-inline-flex spoa-items-center spoa-px-2.5 spoa-py-0.5 spoa-rounded-[6px] spoa-text-[11px] spoa-font-semibold spoa-bg-indigo-50 spoa-text-indigo-700 spoa-border spoa-border-indigo-100/80">
                                      <Tag className="spoa-w-3 spoa-h-3 spoa-mr-1.5 spoa-shrink-0 spoa-text-indigo-500" />
                                      {displayPrice} ({priceLabel})
                                    </span>
                                  );
                                })()}

                                {/* Stock Badge */}
                                {opt.enable_stock && (
                                  <span className="spoa-inline-flex spoa-items-center spoa-px-2.5 spoa-py-0.5 spoa-rounded-[6px] spoa-text-[11px] spoa-font-semibold spoa-bg-emerald-50 spoa-text-emerald-700 spoa-border spoa-border-emerald-100/80">
                                    <Package className="spoa-w-3 spoa-h-3 spoa-mr-1.5 spoa-shrink-0 spoa-text-emerald-500" />
                                    {__("Stock Enabled", "smart-product-options-addons")}
                                  </span>
                                )}

                                {/* Weight Badge */}
                                {opt.weight && opt.weight > 0 ? (
                                  <span className="spoa-inline-flex spoa-items-center spoa-px-2.5 spoa-py-0.5 spoa-rounded-[6px] spoa-text-[11px] spoa-font-semibold spoa-bg-amber-50 spoa-text-amber-700 spoa-border spoa-border-amber-100/80">
                                    <Scale className="spoa-w-3 spoa-h-3 spoa-mr-1.5 spoa-shrink-0 spoa-text-amber-500" />
                                    {opt.weight} {__("kg", "smart-product-options-addons")}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {/* Right Header Actions */}
                            <div
                              className="spoa-flex spoa-items-center spoa-gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Expand/Collapse Chevron */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIndex(isExpanded ? null : idx)
                                }
                                className="spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1.5 spoa-flex spoa-items-center spoa-justify-center spoa-rounded-[6px] spoa-text-[#646970] hover:spoa-text-[#2271b1] hover:spoa-bg-[#e2e8f0] spoa-transition-colors"
                                title={
                                  isExpanded
                                    ? __("Collapse settings", "smart-product-options-addons")
                                    : __("Expand settings", "smart-product-options-addons")
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </button>

                              {/* Delete Option */}
                              <button
                                type="button"
                                onClick={() => {
                                  dragIdsRef.current.splice(idx, 1);
                                  dispatch({
                                    type: "REMOVE_OPTION",
                                    payload: { fieldId, optionIndex: idx },
                                  });
                                }}
                                className="spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1.5 spoa-flex spoa-items-center spoa-justify-center spoa-rounded-[6px] spoa-text-[#d63638] hover:spoa-text-[#b32d2e] hover:spoa-bg-[#fcf0f1] spoa-transition-colors"
                                title={__("Remove choice", "smart-product-options-addons")}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Details Expanded Panel */}
                          {isExpanded && (
                            <div className="spoa-accordion-choice-details spoa-p-0 spoa-px-4 spoa-bg-[#fdfdfd] spoa-border-t spoa-border-[#e2e8f0]">
                              <ClassicSettingsTable fields={settingsFields} />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              ) : (
                <div className="spoa-border spoa-border-[#c3c4c7] spoa-rounded-[12px] spoa-p-8 spoa-text-center spoa-text-[#94a3b8] spoa-italic spoa-bg-white spoa-mb-2 spoa-shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                  {__("No choices added yet.", "smart-product-options-addons")}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Footer / Add Choice */}
      <div className="spoa-flex spoa-justify-start">
        <ClassicButton
          variant="secondary"
          onClick={() => {
            const nextIdx = options.length;
            dragIdsRef.current.push(
              `choice-${Math.random().toString(36).substr(2, 9)}`,
            );
            dispatch({
              type: "ADD_OPTION",
              payload: {
                fieldId,
                option: getDefaultOption(),
              },
            });
            // Auto-expand the newly created choice
            setExpandedIndex(nextIdx);
          }}
        >
          <CirclePlus className="spoa-size-4" />{" "}
          {__("Add Choice", "smart-product-options-addons")}
        </ClassicButton>
      </div>

      <FormError message={state.errors?.[`schema.${fieldIndex}.options`]} />
    </div>
  );
};
