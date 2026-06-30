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
  Image,
  X,
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

  const openLinkedImageLibrary = (idx: number) => {
    if (!(window as any).wp?.media) return;

    const frame = (window as any).wp.media({
      title: __("Select Product Image", "optionbay-product-options-addons-woo"),
      button: { text: __("Link this image", "optionbay-product-options-addons-woo") },
      multiple: false,
      library: { type: "image" },
    });

    frame.on("select", () => {
      const attachment = frame.state().get("selection").first().toJSON();
      dispatch({
        type: "UPDATE_OPTION",
        payload: {
          fieldId,
          optionIndex: idx,
          updates: {
            linked_image_id: attachment.id,
            linked_image_url: attachment.sizes?.full?.url || attachment.url || "",
          },
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
  console.log("correct file");
  return (
    <div
      className={`wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1 ${!hideLabel ? "wpab-wpoa-mt-4" : ""
        }`}
    >
      {!hideLabel && (
        <label className="wpab-wpoa-font-semibold wpab-wpoa-block wpab-wpoa-text-slate-800 wpab-wpoa-text-sm">
          {__("Choices", "optionbay-product-options-addons-woo")}
        </label>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`droppable-options-${fieldId}`}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="wpab-wpoa-flex wpab-wpoa-flex-col"
            >
              {options.length > 0 ? (
                options.map((opt, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const dragId = dragIdsRef.current[idx] || `choice-${idx}`;

                  // Define the Settings Fields for ClassicSettingsTable
                  const settingsFields = [
                    {
                      label: (
                        <span className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-text-slate-700 wpab-wpoa-font-semibold wpab-wpoa-text-[12px] wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                          <Tag size={13} className="wpab-wpoa-text-[#2271b1]" />
                          {__("Price Type", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="wpab-wpoa-max-w-xs">
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
                          />
                        </div>
                      ),
                    },
                    ...(opt.price_type !== "none"
                      ? [
                        {
                          label: (
                            <span className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-text-slate-700 wpab-wpoa-font-semibold wpab-wpoa-text-[12px] wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                              <Tag
                                size={13}
                                className="wpab-wpoa-text-[#2271b1]"
                              />
                              {__("Price Amount", "optionbay-product-options-addons-woo")}
                            </span>
                          ),
                          render: () => (
                            <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1.5 wpab-wpoa-max-w-xs">
                              <ClassicInput
                                type="number"
                                size="regular"
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
                            </div>
                          ),
                        },
                      ]
                      : []),
                    {
                      label: (
                        <span className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-text-slate-700 wpab-wpoa-font-semibold wpab-wpoa-text-[12px] wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                          <Scale
                            size={13}
                            className="wpab-wpoa-text-amber-500"
                          />
                          {__("Weight (kg)", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="wpab-wpoa-max-w-xs">
                          <ClassicInput
                            type="number"
                            size="regular"
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
                        </div>
                      ),
                    },
                    {
                      label: (
                        <span className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-text-slate-700 wpab-wpoa-font-semibold wpab-wpoa-text-[12px] wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                          <Package
                            size={13}
                            className="wpab-wpoa-text-emerald-500"
                          />
                          {__("Stock Tracking", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-3">
                          <ClassicCheckbox
                            label={__("Enable Stock Tracking", "optionbay-product-options-addons-woo")}
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
                            <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-4 wpab-wpoa-max-w-md">
                              <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1">
                                <label className="wpab-wpoa-text-[11px] wpab-wpoa-text-gray-500 wpab-wpoa-font-semibold wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                                  {__("Select Pool", "optionbay-product-options-addons-woo")}
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

                              <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1">
                                <label className="wpab-wpoa-text-[11px] wpab-wpoa-text-gray-500 wpab-wpoa-font-semibold wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                                  {__("Reduction Mode", "optionbay-product-options-addons-woo")}
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


                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      label: (
                        <span className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-text-slate-700 wpab-wpoa-font-semibold wpab-wpoa-text-[12px] wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                          <Image
                            size={13}
                            className="wpab-wpoa-text-sky-500"
                          />
                          {__("Product Image", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-2">
                          <p className="wpab-wpoa-text-[12px] wpab-wpoa-text-slate-500 wpab-wpoa-m-0">
                            {__("Link a product image to this choice. When a customer selects this option, the main product image will swap to this image.", "optionbay-product-options-addons-woo")}
                          </p>
                          {opt.linked_image_url ? (
                            <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-3">
                              <div
                                className="wpab-wpoa-relative wpab-wpoa-w-16 wpab-wpoa-h-16 wpab-wpoa-rounded-[8px] wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] wpab-wpoa-overflow-hidden wpab-wpoa-cursor-pointer hover:wpab-wpoa-border-[#2271b1] wpab-wpoa-transition-colors wpab-wpoa-group/linked"
                                onClick={() => openLinkedImageLibrary(idx)}
                                title={__("Change linked image", "optionbay-product-options-addons-woo")}
                              >
                                <img
                                  src={opt.linked_image_url}
                                  alt={opt.label || "linked"}
                                  className="wpab-wpoa-w-full wpab-wpoa-h-full wpab-wpoa-object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  dispatch({
                                    type: "UPDATE_OPTION",
                                    payload: {
                                      fieldId,
                                      optionIndex: idx,
                                      updates: {
                                        linked_image_id: undefined,
                                        linked_image_url: undefined,
                                      },
                                    },
                                  })
                                }
                                className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1 wpab-wpoa-text-[12px] wpab-wpoa-text-[#d63638] hover:wpab-wpoa-text-[#b32d2e] wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer wpab-wpoa-transition-colors"
                              >
                                <X size={12} />
                                {__("Remove", "optionbay-product-options-addons-woo")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openLinkedImageLibrary(idx)}
                              className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-px-3 wpab-wpoa-py-2 wpab-wpoa-rounded-[8px] wpab-wpoa-border wpab-wpoa-border-dashed wpab-wpoa-border-[#c3c4c7] wpab-wpoa-bg-[#f6f7f7] wpab-wpoa-text-[13px] wpab-wpoa-text-[#646970] hover:wpab-wpoa-border-[#2271b1] hover:wpab-wpoa-text-[#2271b1] wpab-wpoa-transition-colors wpab-wpoa-cursor-pointer wpab-wpoa-w-fit"
                            >
                              <ImagePlus size={14} />
                              {__("Select Product Image", "optionbay-product-options-addons-woo")}
                            </button>
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
                          className={`wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] wpab-wpoa-rounded-[12px] wpab-wpoa-bg-white wpab-wpoa-overflow-hidden wpab-wpoa-mb-2 wpab-wpoa-transition-all wpab-wpoa-duration-200 ${snapshot.isDragging
                            ? "wpab-wpoa-shadow-2xl wpab-wpoa-border-[#2271b1] wpab-wpoa-ring-2 wpab-wpoa-ring-[#2271b1]/20 wpab-wpoa-z-50"
                            : isExpanded
                              ? "wpab-wpoa-shadow-lg wpab-wpoa-border-[#2271b1] wpab-wpoa-ring-1 wpab-wpoa-ring-[#2271b1]/10"
                              : "hover:wpab-wpoa-border-slate-400 hover:wpab-wpoa-shadow-md wpab-wpoa-shadow-[0_2px_5px_rgba(0,0,0,0.03)]"
                            }`}
                        >
                          {/* Header Row */}
                          <div
                            onClick={() =>
                              setExpandedIndex(isExpanded ? null : idx)
                            }
                            className={`wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-between wpab-wpoa-py-3 wpab-wpoa-px-4 wpab-wpoa-transition-all wpab-wpoa-duration-200 wpab-wpoa-cursor-pointer ${isExpanded
                              ? "wpab-wpoa-bg-[#f0f6fc] wpab-wpoa-border-b wpab-wpoa-border-[#e2e8f0]"
                              : "wpab-wpoa-bg-[#f6f7f7] hover:wpab-wpoa-bg-[#f0f6fc]"
                              }`}
                          >
                            <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-4 wpab-wpoa-flex-1">
                              {/* Drag Handle Indicator */}
                              <div
                                {...providedDrag.dragHandleProps}
                                className="wpab-wpoa-text-gray-300 wpab-wpoa-cursor-grab active:wpab-wpoa-cursor-grabbing hover:wpab-wpoa-text-gray-400 wpab-wpoa-shrink-0 wpab-wpoa-flex wpab-wpoa-items-center"
                              >
                                <GripVertical size={16} />
                              </div>

                              {/* Choice Index Label */}
                              <span className="wpab-wpoa-text-[11px] wpab-wpoa-font-bold wpab-wpoa-text-slate-400 wpab-wpoa-w-5 wpab-wpoa-text-center">
                                #{idx + 1}
                              </span>

                              {/* Color Swatch Picker */}
                              {isColorSwatch && (
                                <div
                                  className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label
                                    className={`wpab-wpoa-block wpab-wpoa-w-6 wpab-wpoa-h-6 wpab-wpoa-rounded-full wpab-wpoa-border ${state.errors?.[
                                      `schema.${fieldIndex}.options.${idx}.color`
                                    ]
                                      ? "wpab-wpoa-border-red-400"
                                      : "wpab-wpoa-border-[#c3c4c7]"
                                      } wpab-wpoa-cursor-pointer wpab-wpoa-overflow-hidden hover:wpab-wpoa-border-[#2271b1] wpab-wpoa-transition-colors`}
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
                                      className="wpab-wpoa-opacity-0 wpab-wpoa-w-0 wpab-wpoa-h-0 wpab-wpoa-absolute"
                                    />
                                  </label>
                                  <span className="wpab-wpoa-text-[11px] wpab-wpoa-font-mono wpab-wpoa-text-slate-400 wpab-wpoa-hidden md:wpab-wpoa-inline">
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
                                  className="wpab-wpoa-shrink-0"
                                >
                                  {opt.image_url ? (
                                    <div
                                      className={`wpab-wpoa-relative wpab-wpoa-w-8 wpab-wpoa-h-8 wpab-wpoa-rounded-[6px] wpab-wpoa-border ${state.errors?.[
                                        `schema.${fieldIndex}.options.${idx}.image_url`
                                      ]
                                        ? "wpab-wpoa-border-red-400"
                                        : "wpab-wpoa-border-[#c3c4c7]"
                                        } wpab-wpoa-overflow-hidden hover:wpab-wpoa-border-[#2271b1] wpab-wpoa-transition-colors wpab-wpoa-cursor-pointer`}
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
                                      className={`wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-center wpab-wpoa-w-8 wpab-wpoa-h-8 wpab-wpoa-rounded-[6px] wpab-wpoa-border wpab-wpoa-border-dashed ${state.errors?.[
                                        `schema.${fieldIndex}.options.${idx}.image_url`
                                      ]
                                        ? "wpab-wpoa-border-red-400"
                                        : "wpab-wpoa-border-[#c3c4c7]"
                                        } wpab-wpoa-bg-white wpab-wpoa-text-[#646970] hover:wpab-wpoa-border-[#2271b1] hover:wpab-wpoa-text-[#2271b1] wpab-wpoa-transition-colors wpab-wpoa-cursor-pointer`}
                                      title={__("Upload image", "optionbay-product-options-addons-woo")}
                                    >
                                      <ImagePlus size={13} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Inline Editable Label */}
                              <div
                                className=""
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ClassicInput
                                  size="regular"
                                  placeholder={__("Choice Label", "optionbay-product-options-addons-woo")}
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
                              <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-flex-wrap">
                                {/* Price Badge */}
                                {(() => {
                                  if (opt.price_type === "none") {
                                    return (
                                      <span className="wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-px-2.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-[6px] wpab-wpoa-text-[11px] wpab-wpoa-font-semibold wpab-wpoa-bg-[#f1f5f9] wpab-wpoa-text-slate-500 wpab-wpoa-border wpab-wpoa-border-slate-200/50">
                                        {__("No Price", "optionbay-product-options-addons-woo")}
                                      </span>
                                    );
                                  }
                                  const priceLabel =
                                    PRICE_TYPES.find(
                                      (pt) => pt.value === opt.price_type,
                                    )?.label || opt.price_type;
                                  const displayPrice = `$${(opt.price ?? 0).toFixed(2)}`;
                                  return (
                                    <span className="wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-px-2.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-[6px] wpab-wpoa-text-[11px] wpab-wpoa-font-semibold wpab-wpoa-bg-indigo-50 wpab-wpoa-text-indigo-700 wpab-wpoa-border wpab-wpoa-border-indigo-100/80">
                                      <Tag className="wpab-wpoa-w-3 wpab-wpoa-h-3 wpab-wpoa-mr-1.5 wpab-wpoa-shrink-0 wpab-wpoa-text-indigo-500" />
                                      {displayPrice} ({priceLabel})
                                    </span>
                                  );
                                })()}

                                {/* Stock Badge */}
                                {opt.enable_stock && (
                                  <span className="wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-px-2.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-[6px] wpab-wpoa-text-[11px] wpab-wpoa-font-semibold wpab-wpoa-bg-emerald-50 wpab-wpoa-text-emerald-700 wpab-wpoa-border wpab-wpoa-border-emerald-100/80">
                                    <Package className="wpab-wpoa-w-3 wpab-wpoa-h-3 wpab-wpoa-mr-1.5 wpab-wpoa-shrink-0 wpab-wpoa-text-emerald-500" />
                                    {__("Stock Enabled", "optionbay-product-options-addons-woo")}
                                  </span>
                                )}

                                {/* Weight Badge */}
                                {opt.weight && opt.weight > 0 ? (
                                  <span className="wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-px-2.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-[6px] wpab-wpoa-text-[11px] wpab-wpoa-font-semibold wpab-wpoa-bg-amber-50 wpab-wpoa-text-amber-700 wpab-wpoa-border wpab-wpoa-border-amber-100/80">
                                    <Scale className="wpab-wpoa-w-3 wpab-wpoa-h-3 wpab-wpoa-mr-1.5 wpab-wpoa-shrink-0 wpab-wpoa-text-amber-500" />
                                    {opt.weight} {__("kg", "optionbay-product-options-addons-woo")}
                                  </span>
                                ) : null}

                                {/* Linked Product Image Badge */}
                                {opt.linked_image_url && (
                                  <span className="wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-px-2.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-[6px] wpab-wpoa-text-[11px] wpab-wpoa-font-semibold wpab-wpoa-bg-sky-50 wpab-wpoa-text-sky-700 wpab-wpoa-border wpab-wpoa-border-sky-100/80">
                                    <Image className="wpab-wpoa-w-3 wpab-wpoa-h-3 wpab-wpoa-mr-1.5 wpab-wpoa-shrink-0 wpab-wpoa-text-sky-500" />
                                    {__("Image Linked", "optionbay-product-options-addons-woo")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right Header Actions */}
                            <div
                              className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Expand/Collapse Chevron */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIndex(isExpanded ? null : idx)
                                }
                                className="wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer wpab-wpoa-p-1.5 wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-center wpab-wpoa-rounded-[6px] wpab-wpoa-text-[#646970] hover:wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-bg-[#e2e8f0] wpab-wpoa-transition-colors"
                                title={
                                  isExpanded
                                    ? __("Collapse settings", "optionbay-product-options-addons-woo")
                                    : __("Expand settings", "optionbay-product-options-addons-woo")
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
                                className="wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer wpab-wpoa-p-1.5 wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-center wpab-wpoa-rounded-[6px] wpab-wpoa-text-[#d63638] hover:wpab-wpoa-text-[#b32d2e] hover:wpab-wpoa-bg-[#fcf0f1] wpab-wpoa-transition-colors"
                                title={__("Remove choice", "optionbay-product-options-addons-woo")}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Details Expanded Panel */}
                          {isExpanded && (
                            <div className="wpab-wpoa-accordion-choice-details wpab-wpoa-p-0 wpab-wpoa-px-4 wpab-wpoa-bg-[#fdfdfd] wpab-wpoa-border-t wpab-wpoa-border-[#e2e8f0]">
                              <ClassicSettingsTable fields={settingsFields} />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              ) : (
                <div className="wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] wpab-wpoa-rounded-[12px] wpab-wpoa-p-8 wpab-wpoa-text-center wpab-wpoa-text-[#94a3b8] wpab-wpoa-italic wpab-wpoa-bg-white wpab-wpoa-mb-2 wpab-wpoa-shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                  {__("No choices added yet.", "optionbay-product-options-addons-woo")}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Footer / Add Choice */}
      <div className="wpab-wpoa-flex wpab-wpoa-justify-start">
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
          <CirclePlus className="wpab-wpoa-size-4" />{" "}
          {__("Add Choice", "optionbay-product-options-addons-woo")}
        </ClassicButton>
      </div>

      <FormError message={state.errors?.[`schema.${fieldIndex}.options`]} />
    </div>
  );
};
