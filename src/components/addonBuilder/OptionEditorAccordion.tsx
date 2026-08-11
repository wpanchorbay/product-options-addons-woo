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
      className={`opopw-flex opopw-flex-col opopw-gap-1 ${!hideLabel ? "opopw-mt-4" : ""
        }`}
    >
      {!hideLabel && (
        <label className="opopw-font-semibold opopw-block opopw-text-slate-800 opopw-text-sm">
          {__("Choices", "optionbay-product-options-addons-woo")}
        </label>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`droppable-options-${fieldId}`}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="opopw-flex opopw-flex-col"
            >
              {options.length > 0 ? (
                options.map((opt, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const dragId = dragIdsRef.current[idx] || `choice-${idx}`;

                  // Define the Settings Fields for ClassicSettingsTable
                  const settingsFields = [
                    {
                      label: (
                        <span className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-text-slate-700 opopw-font-semibold opopw-text-[12px] opopw-uppercase opopw-tracking-wider">
                          <Tag size={13} className="opopw-text-[#2271b1]" />
                          {__("Price Type", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="opopw-max-w-xs">
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
                            <span className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-text-slate-700 opopw-font-semibold opopw-text-[12px] opopw-uppercase opopw-tracking-wider">
                              <Tag
                                size={13}
                                className="opopw-text-[#2271b1]"
                              />
                              {__("Price Amount", "optionbay-product-options-addons-woo")}
                            </span>
                          ),
                          render: () => (
                            <div className="opopw-flex opopw-flex-col opopw-gap-1.5 opopw-max-w-xs">
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
                        <span className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-text-slate-700 opopw-font-semibold opopw-text-[12px] opopw-uppercase opopw-tracking-wider">
                          <Scale
                            size={13}
                            className="opopw-text-amber-500"
                          />
                          {__("Weight (kg)", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="opopw-max-w-xs">
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
                        <span className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-text-slate-700 opopw-font-semibold opopw-text-[12px] opopw-uppercase opopw-tracking-wider">
                          <Package
                            size={13}
                            className="opopw-text-emerald-500"
                          />
                          {__("Stock Tracking", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="opopw-flex opopw-flex-col opopw-gap-3">
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
                            <div className="opopw-flex opopw-flex-col opopw-gap-4 opopw-max-w-md">
                              <div className="opopw-flex opopw-flex-col opopw-gap-1">
                                <label className="opopw-text-[11px] opopw-text-gray-500 opopw-font-semibold opopw-uppercase opopw-tracking-wider">
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

                              <div className="opopw-flex opopw-flex-col opopw-gap-1">
                                <label className="opopw-text-[11px] opopw-text-gray-500 opopw-font-semibold opopw-uppercase opopw-tracking-wider">
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
                        <span className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-text-slate-700 opopw-font-semibold opopw-text-[12px] opopw-uppercase opopw-tracking-wider">
                          <Image
                            size={13}
                            className="opopw-text-sky-500"
                          />
                          {__("Product Image", "optionbay-product-options-addons-woo")}
                        </span>
                      ),
                      render: () => (
                        <div className="opopw-flex opopw-flex-col opopw-gap-2">
                          <p className="opopw-text-[12px] opopw-text-slate-500 opopw-m-0">
                            {__("Link a product image to this choice. When a customer selects this option, the main product image will swap to this image.", "optionbay-product-options-addons-woo")}
                          </p>
                          {opt.linked_image_url ? (
                            <div className="opopw-flex opopw-items-center opopw-gap-3">
                              <div
                                className="opopw-relative opopw-w-16 opopw-h-16 opopw-rounded-[8px] opopw-border opopw-border-[#c3c4c7] opopw-overflow-hidden opopw-cursor-pointer hover:opopw-border-[#2271b1] opopw-transition-colors opopw-group/linked"
                                onClick={() => openLinkedImageLibrary(idx)}
                                title={__("Change linked image", "optionbay-product-options-addons-woo")}
                              >
                                <img
                                  src={opt.linked_image_url}
                                  alt={opt.label || "linked"}
                                  className="opopw-w-full opopw-h-full opopw-object-cover"
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
                                className="opopw-flex opopw-items-center opopw-gap-1 opopw-text-[12px] opopw-text-[#d63638] hover:opopw-text-[#b32d2e] opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-transition-colors"
                              >
                                <X size={12} />
                                {__("Remove", "optionbay-product-options-addons-woo")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openLinkedImageLibrary(idx)}
                              className="opopw-flex opopw-items-center opopw-gap-2 opopw-px-3 opopw-py-2 opopw-rounded-[8px] opopw-border opopw-border-dashed opopw-border-[#c3c4c7] opopw-bg-[#f6f7f7] opopw-text-[13px] opopw-text-[#646970] hover:opopw-border-[#2271b1] hover:opopw-text-[#2271b1] opopw-transition-colors opopw-cursor-pointer opopw-w-fit"
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
                          className={`opopw-border opopw-border-[#c3c4c7] opopw-rounded-[12px] opopw-bg-white opopw-overflow-hidden opopw-mb-2 opopw-transition-all opopw-duration-200 ${snapshot.isDragging
                            ? "opopw-shadow-2xl opopw-border-[#2271b1] opopw-ring-2 opopw-ring-[#2271b1]/20 opopw-z-50"
                            : isExpanded
                              ? "opopw-shadow-lg opopw-border-[#2271b1] opopw-ring-1 opopw-ring-[#2271b1]/10"
                              : "hover:opopw-border-slate-400 hover:opopw-shadow-md opopw-shadow-[0_2px_5px_rgba(0,0,0,0.03)]"
                            }`}
                        >
                          {/* Header Row */}
                          <div
                            onClick={() =>
                              setExpandedIndex(isExpanded ? null : idx)
                            }
                            className={`opopw-flex opopw-items-center opopw-justify-between opopw-py-3 opopw-px-4 opopw-transition-all opopw-duration-200 opopw-cursor-pointer ${isExpanded
                              ? "opopw-bg-[#f0f6fc] opopw-border-b opopw-border-[#e2e8f0]"
                              : "opopw-bg-[#f6f7f7] hover:opopw-bg-[#f0f6fc]"
                              }`}
                          >
                            <div className="opopw-flex opopw-items-center opopw-gap-4 opopw-flex-1">
                              {/* Drag Handle Indicator */}
                              <div
                                {...providedDrag.dragHandleProps}
                                className="opopw-text-gray-300 opopw-cursor-grab active:opopw-cursor-grabbing hover:opopw-text-gray-400 opopw-shrink-0 opopw-flex opopw-items-center"
                              >
                                <GripVertical size={16} />
                              </div>

                              {/* Choice Index Label */}
                              <span className="opopw-text-[11px] opopw-font-bold opopw-text-slate-400 opopw-w-5 opopw-text-center">
                                #{idx + 1}
                              </span>

                              {/* Color Swatch Picker */}
                              {isColorSwatch && (
                                <div
                                  className="opopw-flex opopw-items-center opopw-gap-2 opopw-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label
                                    className={`opopw-block opopw-w-6 opopw-h-6 opopw-rounded-full opopw-border ${state.errors?.[
                                      `schema.${fieldIndex}.options.${idx}.color`
                                    ]
                                      ? "opopw-border-red-400"
                                      : "opopw-border-[#c3c4c7]"
                                      } opopw-cursor-pointer opopw-overflow-hidden hover:opopw-border-[#2271b1] opopw-transition-colors`}
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
                                      className="opopw-opacity-0 opopw-w-0 opopw-h-0 opopw-absolute"
                                    />
                                  </label>
                                  <span className="opopw-text-[11px] opopw-font-mono opopw-text-slate-400 opopw-hidden md:opopw-inline">
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
                                  className="opopw-shrink-0"
                                >
                                  {opt.image_url ? (
                                    <div
                                      className={`opopw-relative opopw-w-8 opopw-h-8 opopw-rounded-[6px] opopw-border ${state.errors?.[
                                        `schema.${fieldIndex}.options.${idx}.image_url`
                                      ]
                                        ? "opopw-border-red-400"
                                        : "opopw-border-[#c3c4c7]"
                                        } opopw-overflow-hidden hover:opopw-border-[#2271b1] opopw-transition-colors opopw-cursor-pointer`}
                                      title={__("Change image", "optionbay-product-options-addons-woo")}
                                    >
                                      <img
                                        src={opt.image_url}
                                        alt={opt.label || "swatch"}
                                        className="opopw-w-full opopw-h-full opopw-object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className={`opopw-flex opopw-items-center opopw-justify-center opopw-w-8 opopw-h-8 opopw-rounded-[6px] opopw-border opopw-border-dashed ${state.errors?.[
                                        `schema.${fieldIndex}.options.${idx}.image_url`
                                      ]
                                        ? "opopw-border-red-400"
                                        : "opopw-border-[#c3c4c7]"
                                        } opopw-bg-white opopw-text-[#646970] hover:opopw-border-[#2271b1] hover:opopw-text-[#2271b1] opopw-transition-colors opopw-cursor-pointer`}
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
                              <div className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-flex-wrap">
                                {/* Price Badge */}
                                {(() => {
                                  if (opt.price_type === "none") {
                                    return (
                                      <span className="opopw-inline-flex opopw-items-center opopw-px-2.5 opopw-py-0.5 opopw-rounded-[6px] opopw-text-[11px] opopw-font-semibold opopw-bg-[#f1f5f9] opopw-text-slate-500 opopw-border opopw-border-slate-200/50">
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
                                    <span className="opopw-inline-flex opopw-items-center opopw-px-2.5 opopw-py-0.5 opopw-rounded-[6px] opopw-text-[11px] opopw-font-semibold opopw-bg-indigo-50 opopw-text-indigo-700 opopw-border opopw-border-indigo-100/80">
                                      <Tag className="opopw-w-3 opopw-h-3 opopw-mr-1.5 opopw-shrink-0 opopw-text-indigo-500" />
                                      {displayPrice} ({priceLabel})
                                    </span>
                                  );
                                })()}

                                {/* Stock Badge */}
                                {opt.enable_stock && (
                                  <span className="opopw-inline-flex opopw-items-center opopw-px-2.5 opopw-py-0.5 opopw-rounded-[6px] opopw-text-[11px] opopw-font-semibold opopw-bg-emerald-50 opopw-text-emerald-700 opopw-border opopw-border-emerald-100/80">
                                    <Package className="opopw-w-3 opopw-h-3 opopw-mr-1.5 opopw-shrink-0 opopw-text-emerald-500" />
                                    {__("Stock Enabled", "optionbay-product-options-addons-woo")}
                                  </span>
                                )}

                                {/* Weight Badge */}
                                {opt.weight && opt.weight > 0 ? (
                                  <span className="opopw-inline-flex opopw-items-center opopw-px-2.5 opopw-py-0.5 opopw-rounded-[6px] opopw-text-[11px] opopw-font-semibold opopw-bg-amber-50 opopw-text-amber-700 opopw-border opopw-border-amber-100/80">
                                    <Scale className="opopw-w-3 opopw-h-3 opopw-mr-1.5 opopw-shrink-0 opopw-text-amber-500" />
                                    {opt.weight} {__("kg", "optionbay-product-options-addons-woo")}
                                  </span>
                                ) : null}

                                {/* Linked Product Image Badge */}
                                {opt.linked_image_url && (
                                  <span className="opopw-inline-flex opopw-items-center opopw-px-2.5 opopw-py-0.5 opopw-rounded-[6px] opopw-text-[11px] opopw-font-semibold opopw-bg-sky-50 opopw-text-sky-700 opopw-border opopw-border-sky-100/80">
                                    <Image className="opopw-w-3 opopw-h-3 opopw-mr-1.5 opopw-shrink-0 opopw-text-sky-500" />
                                    {__("Image Linked", "optionbay-product-options-addons-woo")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right Header Actions */}
                            <div
                              className="opopw-flex opopw-items-center opopw-gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Expand/Collapse Chevron */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIndex(isExpanded ? null : idx)
                                }
                                className="opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-p-1.5 opopw-flex opopw-items-center opopw-justify-center opopw-rounded-[6px] opopw-text-[#646970] hover:opopw-text-[#2271b1] hover:opopw-bg-[#e2e8f0] opopw-transition-colors"
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
                                className="opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-p-1.5 opopw-flex opopw-items-center opopw-justify-center opopw-rounded-[6px] opopw-text-[#d63638] hover:opopw-text-[#b32d2e] hover:opopw-bg-[#fcf0f1] opopw-transition-colors"
                                title={__("Remove choice", "optionbay-product-options-addons-woo")}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Details Expanded Panel */}
                          {isExpanded && (
                            <div className="opopw-accordion-choice-details opopw-p-0 opopw-px-4 opopw-bg-[#fdfdfd] opopw-border-t opopw-border-[#e2e8f0]">
                              <ClassicSettingsTable fields={settingsFields} />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              ) : (
                <div className="opopw-border opopw-border-[#c3c4c7] opopw-rounded-[12px] opopw-p-8 opopw-text-center opopw-text-[#94a3b8] opopw-italic opopw-bg-white opopw-mb-2 opopw-shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                  {__("No choices added yet.", "optionbay-product-options-addons-woo")}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Footer / Add Choice */}
      <div className="opopw-flex opopw-justify-start">
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
          <CirclePlus className="opopw-size-4" />{" "}
          {__("Add Choice", "optionbay-product-options-addons-woo")}
        </ClassicButton>
      </div>

      <FormError message={state.errors?.[`schema.${fieldIndex}.options`]} />
    </div>
  );
};
